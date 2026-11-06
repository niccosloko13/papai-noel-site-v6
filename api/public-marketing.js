const {db,init}=require("./_db");
module.exports=async function(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="GET")return res.status(405).end();
 try{
  await init();
  const result=await db().query("SELECT value FROM natal_settings WHERE key='marketing'");
  const id=String(result.rows[0]?.value?.metaPixel||"").trim();
  return res.json({metaPixel:/^\d{7,25}$/.test(id)?id:""});
 }catch(e){return res.json({metaPixel:""});}
};