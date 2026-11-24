const {valid}=require("../_auth");
const {db,init}=require("../_db");
const {validatePixPayload}=require("../_pix");
const {initEvents}=require("../events");
module.exports=async function(req,res){
 res.setHeader("Cache-Control","no-store");
 if(!valid(req))return res.status(401).json({error:"Sessão necessária"});
 if(!["GET","PATCH"].includes(req.method))return res.status(405).end();
 try{
  await init();
  if(req.method==="GET"){
   const {rows}=await db().query("SELECT id,status,created_at,updated_at,data FROM natal_orders ORDER BY created_at DESC LIMIT 500");
   return res.json({orders:rows.map(r=>({...r.data,id:r.id,status:r.status,createdAt:r.created_at,updatedAt:r.updated_at}))});
  }
  const {id,status,action,pixPayload}=req.body||{};
  if(typeof id!=="string"||!/^NATAL-[A-F0-9]{12}$/.test(id))return res.status(400).json({error:"Pedido inválido"});
  if(action==="prepare-pix"){
   const found=await db().query("SELECT status,data FROM natal_orders WHERE id=$1",[id]);
   if(!found.rowCount)return res.status(404).json({error:"Pedido não encontrado"});
   if(found.rows[0].status!=="Aguardando QR Code")return res.status(409).json({error:"Este pedido não está aguardando a preparação do Pix."});
   const order=found.rows[0].data||{},checked=validatePixPayload(pixPayload,Number(order.total));
   const patch={pixPayloadDraft:checked.payload,pixDraftReceiverName:checked.receiverName,pixDraftAmount:checked.amount,pixDraftValidatedAt:new Date().toISOString(),paymentStatus:"QR validado · aguardando liberação"};
   const saved=await db().query("UPDATE natal_orders SET data=data||$2::jsonb,updated_at=now() WHERE id=$1 AND status='Aguardando QR Code' RETURNING id",[id,JSON.stringify(patch)]);
   if(!saved.rowCount)return res.status(409).json({error:"O pedido mudou de status. Atualize a lista e tente novamente."});
   return res.json({ok:true,id,status:"Aguardando QR Code",validation:{amount:checked.amount,receiverName:checked.receiverName,crcValid:true}});
  }
  if(action==="release-pix"){
   const found=await db().query("SELECT status,data FROM natal_orders WHERE id=$1",[id]);
   if(!found.rowCount)return res.status(404).json({error:"Pedido não encontrado"});
   if(found.rows[0].status!=="Aguardando QR Code")return res.status(409).json({error:"Este pedido não está aguardando a liberação do Pix."});
   const order=found.rows[0].data||{},checked=validatePixPayload(order.pixPayloadDraft,Number(order.total));
   const now=new Date(),expiresAt=new Date(now.getTime()+4*60*1000).toISOString();
   const patch={pixPayload:checked.payload,paymentReceiverName:checked.receiverName,paymentReleasedAt:now.toISOString(),expiresAt,paymentStatus:"Aguardando pagamento"};
   const saved=await db().query("UPDATE natal_orders SET status='Aguardando pagamento',data=data||$2::jsonb,updated_at=now() WHERE id=$1 AND status='Aguardando QR Code' RETURNING id",[id,JSON.stringify(patch)]);
   if(!saved.rowCount)return res.status(409).json({error:"O pedido já foi liberado ou mudou de status. Atualize a lista."});
   if(typeof order.sessionId==="string"&&order.sessionId){
    try{await initEvents();await db().query("INSERT INTO natal_events(session_id,event_type,page,origin,product_id,order_id) VALUES($1,'pix_released','/pagamento-pedido.html','','basic',$2)",[order.sessionId,id])}
    catch(eventError){console.error("Pix release event",eventError.code||eventError.message)}
   }
   return res.json({ok:true,id,status:"Aguardando pagamento",amount:checked.amount,receiverName:checked.receiverName,expiresAt});
  }
  const allowed=["Aguardando QR Code","Aguardando pagamento","Pagamento informado","Pago","Produção","Enviado","Concluído","Cancelado"];
  if(!allowed.includes(status))return res.status(400).json({error:"Status inválido"});
  let paidSessionId="";
  if(status==="Pago"){
   const current=await db().query("SELECT status,data FROM natal_orders WHERE id=$1",[id]);
   if(!current.rowCount)return res.status(404).json({error:"Pedido não encontrado"});
   if(current.rows[0].status!=="Pagamento informado")return res.status(409).json({error:"O pedido precisa estar com pagamento informado antes da confirmação"});
   paidSessionId=String(current.rows[0].data?.sessionId||"");
  }
  const found=await db().query("UPDATE natal_orders SET status=$2,updated_at=now() WHERE id=$1 RETURNING id",[id,status]);
  if(!found.rowCount)return res.status(404).json({error:"Pedido não encontrado"});
  if(status==="Pago"&&paidSessionId){
   try{await initEvents();await db().query("INSERT INTO natal_events(session_id,event_type,page,origin,product_id,order_id) VALUES($1,'payment_confirmed','/admin.html','','basic',$2)",[paidSessionId,id])}
   catch(eventError){console.error("Payment confirmed event",eventError.code||eventError.message)}
  }
  return res.json({ok:true,id,status});
 }catch(e){
  const message=typeof e?.message==="string"?e.message:"";
  if(message&&(/Pix|código|CRC|valor|formato|assinatura|recebedor/i.test(message)))return res.status(400).json({error:message});
  console.error("Admin orders failed",e.code||e.message);
  return res.status(503).json({error:"Banco de dados indisponível"});
 }
};
