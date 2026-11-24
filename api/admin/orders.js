const {valid}=require("../_auth");
const {db,init}=require("../_db");
const {buildPix}=require("../_pix");
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
  const {id,status,action}=req.body||{};
  if(typeof id!=="string"||!/^NATAL-[A-F0-9]{12}$/.test(id))return res.status(400).json({error:"Pedido inválido"});
  if(action==="generate-pix"){
   const found=await db().query("SELECT status,data FROM natal_orders WHERE id=$1",[id]);
   if(!found.rowCount)return res.status(404).json({error:"Pedido não encontrado"});
   const order=found.rows[0].data||{};
   if(["Cancelado","Concluído","Expirado"].includes(found.rows[0].status))return res.status(409).json({error:"Este pedido não pode receber uma nova cobrança"});
   const settings=await db().query("SELECT value FROM natal_settings WHERE key='pix'");
   const pix=settings.rows[0]?.value||{};
   if(pix.enabled!==true||!pix.key||!pix.receiverName||!pix.city)return res.status(400).json({error:"Configure e habilite a chave Pix no menu Pagamentos antes de gerar a cobrança"});
   const amount=Number(order.total);
   if(!Number.isFinite(amount)||amount<=0)return res.status(400).json({error:"Valor do pedido inválido"});
   const pixPayload=buildPix({key:pix.key,receiverName:pix.receiverName,city:pix.city,amount,txid:id.replace(/[^A-Z0-9]/g,"")});
   const receiverName=pix.displayName||pix.receiverName;
   const patch={pixPayload,paymentReceiverName:receiverName,paymentReleasedAt:new Date().toISOString(),paymentStatus:"Aguardando pagamento"};
   await db().query("UPDATE natal_orders SET status='Aguardando pagamento',data=data||$2::jsonb,updated_at=now() WHERE id=$1",[id,JSON.stringify(patch)]);
   return res.json({ok:true,id,status:"Aguardando pagamento",amount,receiverName});
  }
  const allowed=["Aguardando QR Code","Aguardando pagamento","Pagamento informado","Pago","Produção","Enviado","Concluído","Cancelado"];
  if(!allowed.includes(status))return res.status(400).json({error:"Status inválido"});
  if(status==="Pago"){
   const current=await db().query("SELECT status FROM natal_orders WHERE id=$1",[id]);
   if(!current.rowCount)return res.status(404).json({error:"Pedido não encontrado"});
   if(current.rows[0].status!=="Pagamento informado")return res.status(409).json({error:"O pedido precisa estar com pagamento informado antes da confirmação"});
  }
  const found=await db().query("UPDATE natal_orders SET status=$2,updated_at=now() WHERE id=$1 RETURNING id",[id,status]);
  if(!found.rowCount)return res.status(404).json({error:"Pedido não encontrado"});
  return res.json({ok:true,id,status});
 }catch(e){console.error("Admin orders failed",e.code||e.message);return res.status(503).json({error:"Banco de dados indisponível"})}
};
