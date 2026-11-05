const {db,init}=require("./_db");
const fireplace={"id":"basic","name":"Lareira Especial de Natal","price":84.65,"discountIncluded":true,"prop":"Lareira cenográfica de 120 × 80 × 22 cm para montar + 7 pegadas adesivas e 1 adesivo de vidro. Um cenário de Natal para sua casa.","benefits":["1 lareira cenográfica de papelão para montar, 120 × 80 × 22 cm (altura × largura × profundidade; fogo ilustrativo, não aquece)","7 pegadas adesivas (3 pares + 1 solta), 22 × 8 cm cada","1 adesivo de vidro/janela Papai Noel Passou Aqui"],"image":"assets/product/natal-2026-hero-lareira-120cm.webp","active":true};
const defaults=[fireplace];
function canonicalProduct(p){
 if(!p||typeof p!=="object")return null;
 if(p.id==="basic")return {...p,...fireplace,active:p.active!==false};
 
 return null;
}
function canonicalCatalog(input){const saved=Array.isArray(input)?input:[];return defaults.map(d=>canonicalProduct(saved.find(p=>p?.id===d.id)||d))}
async function catalog(){
 try{await init();const r=await db().query("SELECT value FROM natal_settings WHERE key='products'");return {products:canonicalCatalog(r.rows[0]?.value||defaults),source:"database"}}
 catch(e){console.error("Products fallback",e.code||e.message);return {products:defaults,source:"defaults"}}
}
module.exports=async function(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="GET")return res.status(405).end();
 const data=await catalog();res.status(200).json(data);
};
module.exports.catalog=catalog;module.exports.defaults=defaults;
module.exports.fireplace=fireplace;

module.exports.canonicalCatalog=canonicalCatalog;
