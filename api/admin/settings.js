const {valid}=require("../_auth");const {db,init}=require("../_db");
const KEYS=["pix","marketing","seo"];
module.exports=async function(req,res){
 res.setHeader("Cache-Control","no-store");
 if(!valid(req))return res.status(401).json({error:"Sessão necessária"});
 if(!["GET","PUT"].includes(req.method))return res.status(405).end();
 try{
 await init();
 if(req.method==="GET"){
 const {rows}=await db().query("SELECT key,value FROM natal_settings WHERE key=ANY($1)",[KEYS]);
 return res.json({settings:Object.fromEntries(rows.map(r=>[r.key,r.value]))});
 }
 const {key,value}=req.body||{};
 if(!KEYS.includes(key)||!value||typeof value!=="object"||Array.isArray(value)||JSON.stringify(value).length>10000)return res.status(400).json({error:"Configuração inválida"});
 const allowed={pix:["enabled","key","displayName","receiverName","city","discount","shippingFlat"],marketing:["metaPixel","ga4","tiktokPixel","googleAds"],seo:["title","description","image"]};
 const safe=Object.fromEntries(Object.entries(value).filter(([k])=>allowed[key].includes(k)));
 if(key==="pix"&&(Number(safe.discount)<0||Number(safe.discount)>50||Number(safe.shippingFlat)<0))return res.status(400).json({error:"Valores inválidos"});
 await db().query("INSERT INTO natal_settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()",[key,JSON.stringify(safe)]);
 return res.json({ok:true});
 }catch(e){console.error("Admin settings failed",e.code||e.message);return res.status(503).json({error:"Banco de dados indisponível"})}
};