const {initCustomers,session,validOrigin,db,crypto}=require("../_customer");
module.exports=async function(req,res){
 res.setHeader("Cache-Control","no-store");res.setHeader("X-Robots-Tag","noindex");
 const customerId=session(req);if(!customerId)return res.status(401).json({error:"Entre na sua conta"});
 if(req.method!=="GET"&&!validOrigin(req))return res.status(403).end();
 if(!["GET","POST"].includes(req.method))return res.status(405).end();
 try{
  await initCustomers();
  if(req.method==="POST"){
   const {id,accessKey}=req.body||{};
   if(typeof id!=="string"||!/^NATAL-[A-F0-9]{12}$/.test(id)||typeof accessKey!=="string"||!/^[a-f0-9]{64}$/.test(accessKey))return res.status(400).json({error:"Número do pedido ou chave inválidos"});
   const hash=crypto.createHash("sha256").update(accessKey).digest("hex");
   const result=await db().query("SELECT id FROM natal_orders WHERE id=$1 AND data->>'paymentClaimHash'=$2",[id,hash]);
   if(!result.rowCount)return res.status(403).json({error:"Não foi possível vincular o pedido. Confira seu código privado"});
   await db().query("INSERT INTO natal_customer_orders(customer_id,order_id) VALUES($1,$2) ON CONFLICT DO NOTHING",[customerId,id]);
   return res.json({ok:true});
  }
  const {rows}=await db().query(`SELECT o.id,o.status,o.created_at,o.updated_at,o.data FROM natal_customer_orders c JOIN natal_orders o ON o.id=c.order_id WHERE c.customer_id=$1 ORDER BY o.created_at DESC LIMIT 100`,[customerId]);
  return res.json({orders:rows.map(r=>({id:r.id,status:r.status,createdAt:r.created_at,updatedAt:r.updated_at,items:r.data.items||[],total:r.data.total,childName:r.data.childName||"",address:r.data.address||"",number:r.data.number||"",complement:r.data.complement||""}))});
 }catch(e){console.error("Customer orders",e.code||e.message);return res.status(503).json({error:"Não foi possível carregar seus pedidos"})}
};