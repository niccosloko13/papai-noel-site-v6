const {isIP}=require("node:net");
const clean=(v,max=120)=>typeof v==="string"?v.trim().slice(0,max):"";
const digits=v=>String(v||"").replace(/\D/g,"");
let cachedToken="",tokenExpiresAt=0;
function validOrigin(req){
 const origin=req.headers.origin,host=req.headers.host;
 return !!origin&&(origin==="https://"+host||(process.env.VERCEL_ENV!=="production"&&/^http:\/\/localhost(?::\d+)?$/.test(origin)));
}
function listEnv(name){return String(process.env[name]||"").split(",").map(x=>x.trim()).filter(Boolean)}
async function loggiToken(base){
 if(cachedToken&&Date.now()<tokenExpiresAt-60000)return cachedToken;
 const response=await fetch(base+"/v2/oauth2/token",{method:"POST",headers:{"accept":"application/json","content-type":"application/json"},body:JSON.stringify({client_id:process.env.LOGGI_CLIENT_ID,client_secret:process.env.LOGGI_CLIENT_SECRET})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||!data.idToken)throw Error("LOGGI_AUTH_FAILED");
 const expires=Number.parseInt(String(data.expiresIn||"3600").replace(/\D/g,""),10)||3600;
 cachedToken=data.idToken;tokenExpiresAt=Date.now()+expires*1000;return cachedToken;
}
function amountParts(value){
 const cents=Math.round(Number(value)*100);
 return {currencyCode:"BRL",units:Math.floor(cents/100),nanos:(cents%100)*10000000};
}
module.exports=async function(req,res){
 res.setHeader("Cache-Control","no-store");
 res.setHeader("X-Robots-Tag","noindex,nofollow");
 res.setHeader("X-Content-Type-Options","nosniff");
 if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).end()}
 if(!validOrigin(req))return res.status(403).json({error:"Origem não autorizada"});
 const pickupTypes=listEnv("LOGGI_PICKUP_TYPES"),serviceIds=listEnv("LOGGI_EXTERNAL_SERVICE_IDS");
 const origin={logradouro:clean(process.env.LOGGI_ORIGIN_STREET,128),numero:clean(process.env.LOGGI_ORIGIN_NUMBER,8),complemento:clean(process.env.LOGGI_ORIGIN_COMPLEMENT,128),bairro:clean(process.env.LOGGI_ORIGIN_NEIGHBORHOOD,64),cep:digits(process.env.LOGGI_ORIGIN_CEP),cidade:clean(process.env.LOGGI_ORIGIN_CITY,32),uf:clean(process.env.LOGGI_ORIGIN_STATE,2).toUpperCase()};
 const configured=!!(process.env.LOGGI_CLIENT_ID&&process.env.LOGGI_CLIENT_SECRET&&process.env.LOGGI_COMPANY_ID&&origin.logradouro&&origin.cep.length===8&&origin.cidade&&/^[A-Z]{2}$/.test(origin.uf)&&(pickupTypes.length>0)!==(serviceIds.length>0));
 if(!configured)return res.status(200).json({configured:false,available:false});
 const body=req.body||{},cep=digits(body.cep),address=clean(body.address,128),number=clean(body.number,8),complement=clean(body.complement,128),neighborhood=clean(body.neighborhood,64),city=clean(body.city,32),state=clean(body.state,2).toUpperCase(),quantity=Number(body.quantity);
 if(cep.length!==8||address.length<2||!number||neighborhood.length<2||city.length<2||!/^[A-Z]{2}$/.test(state)||!Number.isInteger(quantity)||quantity<1||quantity>10)return res.status(400).json({error:"Endereço incompleto para calcular a previsão."});
 const weightG=Math.max(1,Math.min(30000,Number(process.env.LOGGI_PACKAGE_WEIGHT_G)||1200));
 const lengthCm=Math.max(1,Math.min(300,Number(process.env.LOGGI_PACKAGE_LENGTH_CM)||119));
 const widthCm=Math.max(1,Math.min(300,Number(process.env.LOGGI_PACKAGE_WIDTH_CM)||112));
 const heightCm=Math.max(1,Math.min(300,Number(process.env.LOGGI_PACKAGE_HEIGHT_CM)||1));
 const unitValue=Number(process.env.LOGGI_GOODS_VALUE)||132.90;
 const packages=Array.from({length:quantity},()=>({weightG,lengthCm,widthCm,heightCm,goodsValue:amountParts(unitValue)}));
 const quoteBody={
  shipFrom:{correios:origin},
  shipTo:{correios:{logradouro:address,numero,complemento,bairro:neighborhood,cep,cidade:city,uf:state}},
  packages
 };
 if(pickupTypes.length)quoteBody.pickupTypes=pickupTypes;
 else quoteBody.externalServiceIds=serviceIds;
 const base=(process.env.LOGGI_API_BASE_URL||"https://api.loggi.com").replace(/\/+$/,"");
 try{
  const token=await loggiToken(base);
  const response=await fetch(base+"/v1/companies/"+encodeURIComponent(process.env.LOGGI_COMPANY_ID)+"/quotations",{method:"POST",headers:{"accept":"application/json","content-type":"application/json","authorization":"Bearer "+token},body:JSON.stringify(quoteBody)});
  const result=await response.json().catch(()=>({}));
  if(!response.ok){console.error("Loggi quote failed",response.status);return res.status(502).json({configured:true,available:false,error:"A Loggi não conseguiu calcular este endereço agora."})}
  const groups=Array.isArray(result.packagesQuotations)?result.packagesQuotations:[result.packagesQuotations||{}];
  const map=new Map();
  for(const group of groups)for(const quote of (Array.isArray(group?.quotations)?group.quotations:[])){
   const days=Number(quote.sloInDays),label=clean(quote.freightTypeLabel||quote.freightType||"Loggi",50),key=quote.freightType||label;
   if(Number.isInteger(days)&&days>=0&&!map.has(key))map.set(key,{label,days,freightType:clean(quote.freightType,50)});
  }
  const options=[...map.values()].sort((a,b)=>(a.freightType==="FREIGHT_TYPE_ECONOMIC"?0:1)-(b.freightType==="FREIGHT_TYPE_ECONOMIC"?0:1)||a.days-b.days);
  return res.status(200).json({configured:true,available:options.length>0,options});
 }catch(error){
  console.error("Loggi quotation unavailable",error.message);
  return res.status(503).json({configured:true,available:false,error:"Não foi possível consultar a Loggi neste momento."});
 }
};