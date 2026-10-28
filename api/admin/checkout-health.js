const {valid}=require("../_auth");
const {db,init,ping,databaseStatus}=require("../_db");
const {buildPix}=require("../_pix");
module.exports=async function(req,res){
 res.setHeader("Cache-Control","no-store");
 if(!valid(req))return res.status(401).json({error:"Acesso restrito"});
 if(req.method!=="GET")return res.status(405).end();
 const result={neon:{ok:false},pix:{configured:false,brCodeValid:false},checkout:{ready:false},note:"Este diagnóstico não confirma transferência bancária"};
 try{
  await ping();result.neon.ok=true;
  await init();
  const q=await db().query("SELECT value FROM natal_settings WHERE key='pix'");
  const c=q.rows[0]?.value||{};
  result.pix.configured=c.enabled===true&&!!c.key&&!!c.receiverName;
  result.pix.discount=Number(c.discount??0);
  result.pix.shipping=Number(c.shippingFlat??0);
  if(result.pix.configured){
   try{
    const code=buildPix({key:c.key,receiverName:c.receiverName,city:c.city||"SAO PAULO",amount:1.23,txid:"CHECKOUTDIAG"});
    result.pix.brCodeValid=code.startsWith("000201")&&code.includes("BR.GOV.BCB.PIX")&&code.includes("54041.23")&&/6304[A-F0-9]{4}$/.test(code);
   }catch{}
  }
  result.checkout.ready=result.neon.ok&&result.pix.configured&&result.pix.brCodeValid;
  return res.status(200).json(result);
 }catch(e){console.error("checkout diagnostic",e.code||e.message);return res.status(200).json(result)}
};