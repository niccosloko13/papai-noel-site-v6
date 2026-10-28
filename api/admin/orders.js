const {valid}=require("../_auth");const {db,init}=require("../_db");
module.exports=async function(req,res){
 res.setHeader("Cache-Control","no-store");
 if(!valid(req))return res.status(401).json({error:"Sessão necessária"});
 if(!["GET","PATCH"].includes(req.method))return res.status(405).end();
 try{
 await init();
 if(req.method==="GET"){
 const {rows}=await db().query("SELECT id, status, created_at, updated_at, data FROM natal_orders ORDER BY created_at DESC LIMIT 500");
 return res.json({orders:rows.map(r=>({...r.data,id:r.id,status:r.status,createdAt:r.created_at,updatedAt:r.updated_at}))});
 }
 const {id,status}=req.body||{};
 const allowed=["Aguardando pagamento","Pagamento informado","Pago","Produção","Enviado","Concluído","Cancelado"];
 if(typeof id!=="string"||!allowed.includes(status))return res.status(400).json({error:"Dados inválidos"});
 const found=await db().query("UPDATE natal_orders SET status=$2, updated_at=now() WHERE id=$1 RETURNING id",[id,status]);
 if(!found.rowCount)return res.status(404).json({error:"Pedido não encontrado"});
 return res.json({ok:true,id,status});
 }catch(e){console.error("Admin orders failed",e.code||e.message);return res.status(503).json({error:"Banco de dados indisponível"})}
};