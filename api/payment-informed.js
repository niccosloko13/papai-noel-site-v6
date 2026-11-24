const crypto=require("node:crypto");const {db}=require("./_db");const {initEvents}=require("./events");
module.exports=async function(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="POST")return res.status(405).end();
 const {id,claim}=req.body||{};
 if(typeof id!=="string"||!/^NATAL-[A-F0-9]{12}$/.test(id)||typeof claim!=="string"||!/^[a-f0-9]{64}$/.test(claim))return res.status(400).json({error:"Pedido inválido"});
 const origin=req.headers.origin;
 if(origin&&origin!=="https://"+req.headers.host&&!/^http:\/\/localhost(:\d+)?$/.test(origin))return res.status(403).end();
 try{
 const hash=crypto.createHash("sha256").update(claim).digest("hex");
 await db().query("UPDATE natal_orders SET status='Expirado',updated_at=now() WHERE id=$1 AND status='Aguardando pagamento' AND data ? 'expiresAt' AND (data->>'expiresAt')::timestamptz <= now()",[id]);
 const result=await db().query("UPDATE natal_orders SET status='Pagamento informado',updated_at=now() WHERE id=$1 AND data->>'paymentClaimHash'=$2 AND status='Aguardando pagamento' AND (NOT (data ? 'expiresAt') OR (data->>'expiresAt')::timestamptz > now()) RETURNING id",[id,hash]);
 if(result.rowCount){
  try{
   await initEvents();
   await db().query("INSERT INTO natal_events(session_id,event_type,page,origin,order_id) VALUES($1,'payment_informed',$2,$3,$4)",[crypto.randomBytes(12).toString("hex"),"/pagamento-pedido.html",String(origin||""),id]);
  }catch(e){console.error("payment analytics",e.code||e.message)}
  return res.json({ok:true});
 }
 return res.status(409).json({error:"Pedido expirado ou já atualizado. Se você realizou o Pix, entre em contato com o atendimento para conferência."});
 }catch(e){console.error("Payment status",e.code||e.message);return res.status(503).json({error:"Serviço indisponível"})}
};