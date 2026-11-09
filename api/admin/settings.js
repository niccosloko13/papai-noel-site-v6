const {valid}=require("../_auth");const {db,init,databaseStatus}=require("../_db");
const KEYS=["pix","marketing","seo","products","marketplaces"];
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
 if(!KEYS.includes(key)||!value||typeof value!=="object"||JSON.stringify(value).length>15000)return res.status(400).json({error:"Configuração inválida"});
 const allowed={pix:["enabled","key","displayName","receiverName","city","discount","shippingFlat"],marketing:["metaPixel","ga4","tiktokPixel","googleAds"],seo:["title","description","image"],marketplaces:["mercadolivre","shopee"],products:[]};
 let safe;
 if(key==="products"){
  if(!Array.isArray(value)||value.length!==1||value[0]?.id!=="basic")return res.status(400).json({error:"Catálogo inválido"});
  const validImage=x=>typeof x==="string"&&x.length<500&&(x.startsWith("assets/product/")&&!x.includes("..")||/^https:\/\/[^\s"'<>]+$/i.test(x));
  if(value.some(p=>typeof p.name!=="string"||!p.name.trim()||p.name.length>45||typeof p.prop!=="string"||p.prop.length>350||!Number.isFinite(p.price)||p.price<1||p.price>10000||!validImage(p.image)||!Array.isArray(p.benefits)||p.benefits.length>12||p.benefits.some(b=>typeof b!=="string"||b.length>150)||typeof p.active!=="boolean"))return res.status(400).json({error:"Dados de produto inválidos"});
  safe=value.map(p=>({id:p.id,name:p.name.trim(),price:Math.round(p.price*100)/100,prop:p.prop.trim(),image:p.image,benefits:p.benefits,active:p.active,soloVersion:true}));
 }else safe=Object.fromEntries(Object.entries(value).filter(([k])=>allowed[key].includes(k)));
 if(key==="marketplaces"){
  const hosts={mercadolivre:["mercadolivre.com.br","mercadolivre.com"],shopee:["shopee.com.br","shopee.com"]};
  for(const platform of Object.keys(hosts)){
   const raw=safe[platform];
   if(raw!==undefined&&typeof raw!=="string")return res.status(400).json({error:"O link deve ser um texto."});
   const link=String(raw||"").trim();
   if(link.length>1200)return res.status(400).json({error:"Link muito longo."});
   if(link){
    let u;try{u=new URL(link)}catch{return res.status(400).json({error:"URL inválida."})}
    if(u.protocol!=="https:"||u.username||u.password||!hosts[platform].some(h=>u.hostname===h||u.hostname.endsWith("."+h)))
     return res.status(400).json({error:"Informe somente links HTTPS oficiais do marketplace selecionado."});
   }
   safe[platform]=link;
  }
 }
 if(key==="pix"){
  safe.enabled=safe.enabled===true;
  for(const f of ["key","displayName","receiverName","city"])safe[f]=typeof safe[f]==="string"?safe[f].trim():"";
  safe.discount=Number(safe.discount);
  safe.shippingFlat=Number(safe.shippingFlat);
  const keyOk=!safe.key||(/^[0-9]{11}$/.test(safe.key)||/^[0-9]{14}$/.test(safe.key)||/^\+?[0-9]{10,15}$/.test(safe.key)||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safe.key)||/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(safe.key));
  if(!keyOk||safe.key.length>77||safe.displayName.length>90||safe.receiverName.length>25||safe.city.length>15
   ||!Number.isFinite(safe.discount)||safe.discount<0||safe.discount>50
   ||!Number.isFinite(safe.shippingFlat)||safe.shippingFlat<0||safe.shippingFlat>1000
   ||(safe.enabled&&(!safe.key||!safe.receiverName||!safe.city)))
   return res.status(400).json({error:"Confira a chave Pix, os dados do recebedor, o desconto e o frete."});
 }
 await db().query("INSERT INTO natal_settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()",[key,JSON.stringify(safe)]);
 return res.json({ok:true});
 }catch(e){
  console.error("Admin settings failed",e.code||e.message);
  const status=databaseStatus();
  if(!status.configured||e.code==="DATABASE_NOT_CONFIGURED"){
    return res.status(503).json({
      error:"Banco não conectado na Vercel",
      code:"DATABASE_NOT_CONFIGURED",
      acceptedEnvKeys:status.acceptedEnvKeys
    });
  }
  return res.status(503).json({
    error:"Falha ao conectar ao banco de dados",
    code:e.code||"DATABASE_CONNECTION_FAILED"
  });
 }
};