const {db,init}=require("./_db");
const fireplace={"id":"basic","name":"Lareira Especial de Natal","price":59.9,"discountIncluded":true,"prop":"Lareira decorativa + 7 pegadas adesivas, carta padrão e adesivo de janela. Tudo para montar a surpresa em casa.","benefits":["1 lareira decorativa de papelão para montar (fogo ilustrativo, sem aquecimento)","7 pegadas adesivas (3 pares + 1 solta), 22 × 8 cm cada","1 carta padrão do Papai Noel","1 adesivo de janela Papai Noel Passou Aqui"],"image":"assets/hero-lareira-familia-natal-2026.avif","active":true};
const personalized={"id":"personal","name":"Personalizado","price":69.9,"prop":"Também inclui a lareira! São 21 pegadas adesivas, carta e certificado personalizados, placa com nome e adesivo de janela.","benefits":["1 lareira decorativa de papelão para montar (fogo ilustrativo, sem aquecimento)","21 pegadas adesivas (10 pares + 1 solta), 22 × 8 cm cada","1 adesivo de janela Papai Noel Passou Aqui","1 carta personalizada com nome da criança","1 certificado personalizado","1 placa personalizada com nome da criança","1 guia de aplicação"],"image":"assets/product/kit-personalizado.webp","active":true};
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
