const {db,init}=require("./_db");
const fireplace={"id":"basic","name":"Lareira Especial de Natal","price":53.9,"discountIncluded":true,"prop":"Uma lareira decorativa de papelão para criar o cenário do Papai Noel em casa, com pegadas, carta e adesivo de janela.","benefits":["Lareira decorativa de papelão (montagem simples; fogo ilustrativo)","13 pegadas adesivas (6 pares + 1 solta), 22 × 8 cm cada","Carta padrão do Papai Noel","Adesivo de janela Papai Noel Passou Aqui"],"image":"assets/product/kit1-site.webp","active":true};
const defaults=[
 fireplace,
 {id:"personal",name:"Personalizado",price:69.90,prop:"Tudo do Essencial, com mais pegadas e a experiência personalizada com o nome da criança.",image:"assets/product/kit-personalizado.webp",benefits:["10 pares + 1 pegada solta (21 pegadas)","Adesivo para janela","Placa com nome da criança","Certificado personalizado","Carta personalizada","Guia de aplicação"],active:true}
];
async function catalog(){
 try{await init();const r=await db().query("SELECT value FROM natal_settings WHERE key='products'");return {products:(r.rows[0]?.value||defaults).map(p=>p.id==="basic"?fireplace:p),source:"database"}}
 catch(e){console.error("Products fallback",e.code||e.message);return {products:defaults,source:"defaults"}}
}
module.exports=async function(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="GET")return res.status(405).end();
 const data=await catalog();res.status(200).json(data);
};
module.exports.catalog=catalog;module.exports.defaults=defaults;
module.exports.fireplace=fireplace;
