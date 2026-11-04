const {db,init}=require("../_db");
const {buildPix}=require("../_pix");
const {session,initCustomers,validOrigin,crypto}=require("../_customer");
const validId=id=>typeof id==="string"&&/^NATAL-[A-F0-9]{12}$/.test(id);
module.exports=async function(req,res){
 res.setHeader("Cache-Control","no-store");
 res.setHeader("X-Robots-Tag","noindex,nofollow");
 res.setHeader("X-Content-Type-Options","nosniff");
 if(req.method!=="POST")return res.status(405).json({error:"Método não permitido"});
 if(!validOrigin(req))return res.status(403).json({error:"Origem inválida"});
 const {id,accessKey}=req.body||{};
 if(!validId(id))return res.status(400).json({error:"Número de pedido inválido"});
 try{
  await init();
  const customer=session(req);
  let authorized=false;
  if(customer){
   await initCustomers();
   const linked=await db().query("SELECT 1 FROM natal_customer_orders WHERE customer_id=$1 AND order_id=$2",[customer,id]);
   authorized=linked.rowCount>0;
  }
  const q=await db().query("SELECT status,data,created_at FROM natal_orders WHERE id=$1",[id]);
  if(!q.rowCount)return res.status(404).json({error:"Pedido não encontrado"});
  const record=q.rows[0],order=record.data||{};
  if(!authorized&&typeof accessKey==="string"&&/^[a-f0-9]{64}$/.test(accessKey)){
   const h=crypto.createHash("sha256").update(accessKey).digest("hex");
   const stored=String(order.paymentClaimHash||"");
   authorized=stored.length===h.length&&crypto.timingSafeEqual(Buffer.from(stored),Buffer.from(h));
  }
  if(!authorized)return res.status(403).json({error:"Acesso não autorizado. Entre na sua conta ou utilize a chave privada do pedido."});
  const expiresAt=order.expiresAt||null;
  const expired=!!expiresAt&&Date.parse(expiresAt)<=Date.now();
  if(record.status==="Aguardando pagamento"&&expired){
   await db().query("UPDATE natal_orders SET status='Expirado',updated_at=now() WHERE id=$1 AND status='Aguardando pagamento'",[id]);
  }
  const status=record.status==="Aguardando pagamento"&&expired?"Expirado":record.status;
  if(status!=="Aguardando pagamento")return res.json({id,status,expiresAt,amount:order.total,canPay:false});
  let payload=order.pixPayload;
  let receiverName=order.paymentReceiverName||"";
  if(!payload){
   const cfg=await db().query("SELECT value FROM natal_settings WHERE key='pix'");
   const p=cfg.rows[0]?.value||{};
   if(p.enabled!==true||!p.key||!p.receiverName)return res.status(503).json({error:"Pagamento temporariamente indisponível. Fale com o atendimento."});
   payload=buildPix({key:p.key,receiverName:p.receiverName,city:p.city||"SAO PAULO",amount:Number(order.total),txid:id.replace("-","")});
   receiverName=p.displayName||p.receiverName;
  }
  return res.json({id,status,canPay:true,amount:order.total,expiresAt,receiverName,pixPayload:payload});
 }catch(e){console.error("Payment resume",e.code||e.message);return res.status(503).json({error:"Não conseguimos recuperar este pagamento agora"})}
};
