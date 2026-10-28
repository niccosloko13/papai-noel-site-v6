const {db,init}=require("./_db");
const defaults=[
 {id:"basic",name:"Essencial",price:39.90,prop:"As pistas essenciais para transformar a casa na noite de Natal.",image:"assets/product/kit1-site.webp",benefits:["6 pares + 1 pegada solta (13 pegadas)","Adesivo para janela","Carta padrão","Certificado padrão","Guia de aplicação"],active:true},
 {id:"personal",name:"Personalizado",price:69.90,prop:"Tudo do Essencial, com mais pegadas e a experiência personalizada com o nome da criança.",image:"assets/product/kit-personalizado.webp",benefits:["10 pares + 1 pegada solta (21 pegadas)","Adesivo para janela","Placa com nome da criança","Certificado personalizado","Carta personalizada","Guia de aplicação"],active:true}
];
async function catalog(){
 try{await init();const r=await db().query("SELECT value FROM natal_settings WHERE key='products'");return {products:r.rows[0]?.value||defaults,source:"database"}}
 catch(e){console.error("Products fallback",e.code||e.message);return {products:defaults,source:"defaults"}}
}
module.exports=async function(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="GET")return res.status(405).end();
 const data=await catalog();res.status(200).json(data);
};
module.exports.catalog=catalog;module.exports.defaults=defaults;
