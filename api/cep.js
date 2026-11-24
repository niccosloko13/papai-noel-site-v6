const digits=value=>String(value||"").replace(/\D/g,"");
module.exports=async function(req,res){
 res.setHeader("Cache-Control","public, s-maxage=3600, stale-while-revalidate=86400");
 res.setHeader("X-Content-Type-Options","nosniff");
 res.setHeader("X-Robots-Tag","noindex,nofollow");
 if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({ok:false,error:"Método não permitido"})}
 const cep=digits(req.query?.cep);
 if(!/^\d{8}$/.test(cep))return res.status(400).json({ok:false,error:"Informe um CEP válido com 8 números."});
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),5000);
 try{
  const response=await fetch("https://viacep.com.br/ws/"+cep+"/json/",{headers:{"Accept":"application/json"},signal:controller.signal});
  if(!response.ok)throw new Error("UPSTREAM");
  const data=await response.json();
  if(data.erro)return res.status(404).json({ok:false,error:"CEP não encontrado"});
  const result={
   ok:true,cep,
   address:String(data.logradouro||"").slice(0,120),
   neighborhood:String(data.bairro||"").slice(0,100),
   city:String(data.localidade||"").slice(0,100),
   state:String(data.uf||"").toUpperCase().slice(0,2)
  };
  if(!result.city||!/^[A-Z]{2}$/.test(result.state))throw new Error("INVALID_RESPONSE");
  return res.status(200).json(result);
 }catch(error){
  console.error("CEP lookup",error.name||error.message);
  return res.status(503).json({ok:false,error:"Não foi possível consultar o CEP agora. Tente novamente em instantes."});
 }finally{clearTimeout(timeout)}
};
