const {db,init}=require("./_db");
const domains={mercadolivre:["mercadolivre.com.br","mercadolivre.com"],shopee:["shopee.com.br","shopee.com"]};
function safeUrl(raw,key){
 try{const url=new URL(String(raw||""));if(url.protocol!=="https:"||url.username||url.password||!domains[key].some(d=>url.hostname===d||url.hostname.endsWith("."+d)))return "";return url.href}
 catch{return ""}
}
module.exports=async(req,res)=>{
 res.setHeader("Cache-Control","public, max-age=30, stale-while-revalidate=30");
 if(req.method!=="GET")return res.status(405).end();
 try{await init();const r=await db().query("SELECT value FROM natal_settings WHERE key='marketplaces'");
  const v=r.rows[0]?.value||{};
  return res.json({mercadolivre:safeUrl(v.mercadolivre,"mercadolivre"),shopee:safeUrl(v.shopee,"shopee")});
 }catch{return res.json({mercadolivre:"",shopee:""})}
};
