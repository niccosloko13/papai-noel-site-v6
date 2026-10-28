const {db,init}=require("./_db");
module.exports=async function(req,res){
 res.setHeader("Cache-Control","no-store");if(req.method!=="GET")return res.status(405).end();
 try{await init();const {rows}=await db().query("SELECT value FROM natal_settings WHERE key='pix'");const c=rows[0]?.value||{};
 return res.json({enabled:!!c.enabled,discount:Number(c.discount??15),shippingFlat:Number(c.shippingFlat??0),displayName:c.displayName||""});
 }catch{return res.status(503).json({enabled:false,error:"Configuração de pagamento indisponível"})}
};