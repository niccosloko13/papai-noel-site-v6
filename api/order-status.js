const crypto=require("node:crypto");
const {db,init}=require("./_db");
module.exports=async function(req,res){
 res.setHeader("Cache-Control","no-store");
 res.setHeader("X-Robots-Tag","noindex,nofollow");
 if(req.method!=="POST")return res.status(405).end();
 const {id,accessKey}=req.body||{};
 if(typeof id!=="string"||!/^NATAL-[A-F0-9]{12}$/.test(id)||typeof accessKey!=="string"||!/^[a-f0-9]{64}$/.test(accessKey))return res.status(400).json({error:"Acesso inválido"});
 try{
  await init();
  const result=await db().query("SELECT status,created_at,updated_at,data FROM natal_orders WHERE id=$1",[id]);
  if(!result.rowCount)return res.status(404).json({error:"Pedido não encontrado"});
  const r=result.rows[0],stored=String(r.data.paymentClaimHash||"");
  const computed=crypto.createHash("sha256").update(accessKey).digest("hex");
  if(stored.length!==computed.length||!crypto.timingSafeEqual(Buffer.from(stored),Buffer.from(computed)))return res.status(403).json({error:"Acesso não autorizado"});
  const o=r.data;
  return res.status(200).json({order:{id,status:r.status,createdAt:r.created_at,updatedAt:r.updated_at,items:o.items||[],customerName:o.customerName||"",childName:o.childName||"",address:o.address||"",number:o.number||"",complement:o.complement||"",cep:o.cep||"",phone:o.phone||"",total:o.total,discountPercent:o.discountPercent,shipping:o.shipping}});
 }catch(e){console.error("order tracking error",e.code||e.message);return res.status(503).json({error:"Acompanhamento temporariamente indisponível"})}
};