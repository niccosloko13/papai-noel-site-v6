const digits=v=>String(v||"").replace(/\D/g,"");
const regions={
 "0":{min:1,max:3,name:"Grande São Paulo"},
 "1":{min:2,max:4,name:"Interior e litoral de São Paulo"},
 "2":{min:3,max:6,name:"Rio de Janeiro e Espírito Santo"},
 "3":{min:3,max:6,name:"Minas Gerais"},
 "4":{min:6,max:10,name:"Bahia e Sergipe"},
 "5":{min:6,max:10,name:"Nordeste"},
 "6":{min:8,max:14,name:"Norte e parte do Nordeste"},
 "7":{min:5,max:9,name:"Centro-Oeste"},
 "8":{min:4,max:7,name:"Paraná e Santa Catarina"},
 "9":{min:5,max:8,name:"Rio Grande do Sul"}
};
module.exports=async function(req,res){
 res.setHeader("Cache-Control","public, s-maxage=1800, stale-while-revalidate=3600");
 res.setHeader("X-Robots-Tag","noindex,nofollow");
 res.setHeader("X-Content-Type-Options","nosniff");
 if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({available:false,error:"Método não permitido"})}
 const cep=digits(req.query?.cep);
 if(!/^\d{8}$/.test(cep))return res.status(400).json({available:false,error:"Informe um CEP válido."});
 const region=regions[cep[0]];
 if(!region)return res.status(200).json({configured:true,available:false,reason:"cep"});
 // Estimativa regional da loja, não é uma cotação em tempo real da transportadora.
 // Referência logística: expedição na região do ABC Paulista, pacote de até 1 kg.
 const packageInfo={weightKg:1,lengthCm:119,widthCm:112,heightCm:0.5};
 return res.status(200).json({
  configured:true,available:true,estimateType:"regional",
  originRegion:"ABC Paulista",destinationRegion:region.name,
  daysMin:region.min,daysMax:region.max,unit:"dias úteis",
  package:packageInfo
 });
};
