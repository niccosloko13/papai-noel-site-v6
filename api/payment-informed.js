const crypto=require("node:crypto");const {db}=require("./_db");
module.exports=async function(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="POST")return res.status(405).end();
 const {id,claim}=req.body||{};
 if(typeof id!=="string"||!/^NATAL-[A-F0-9]{12}$/.test(id)||typeof claim!=="string"||!/^[a-f0-9]{64}$/.test(claim))return res.status(400).json({error:"Pedido inválido"});
 const origin=req.headers.origin;
 if(origin&&origin!=="https://"+req.headers.host&&!/^http:\/\/localhost(:\d+)?$/.test(origin))return res.status(403).end();
 try{
 const hash=crypto.createHash("sha256").update(claim).digest("hex");
 const result=await db().query("UPDATE natal_orders SET status='Pagamento informado',updated_at=now() WHERE id=$1 AND data->>'paymentClaimHash'=$2 AND status='Aguardando pagamento' RETURNING id",[id,hash]);
 if(result.rowCount)return res.json({ok:true});
 return res.status(409).json({error:"Não foi possível registrar essa informação"});
 }catch(e){console.error("Payment status",e.code||e.message);return res.status(503).json({error:"Serviço indisponível"})}
};