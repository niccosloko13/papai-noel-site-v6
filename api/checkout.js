const crypto=require("node:crypto");
const {isIP}=require("node:net");
const {db,init}=require("./_db");
const {initEvents}=require("./events");
const PRICE_FALLBACK=132.90;
const digits=v=>String(v||"").replace(/\D/g,"");
function clean(v,max){return typeof v==="string"?v.trim().slice(0,max):""}
function validCpf(value){
 const cpf=digits(value);
 if(!/^\d{11}$/.test(cpf)||/^(\d)\1{10}$/.test(cpf))return false;
 let sum=0;
 for(let i=0;i<9;i++)sum+=Number(cpf[i])*(10-i);
 let check=(sum*10)%11;if(check===10)check=0;
 if(check!==Number(cpf[9]))return false;
 sum=0;
 for(let i=0;i<10;i++)sum+=Number(cpf[i])*(11-i);
 check=(sum*10)%11;if(check===10)check=0;
 return check===Number(cpf[10]);
}
function validOrigin(req){const origin=req.headers.origin,host=req.headers.host;return !!origin&&(origin==="https://"+host||(process.env.VERCEL_ENV!=="production"&&/^http:\/\/localhost(?::\d+)?$/.test(origin)))}
module.exports=async function(req,res){
 res.setHeader("Cache-Control","no-store");
 res.setHeader("X-Robots-Tag","noindex,nofollow");
 res.setHeader("X-Content-Type-Options","nosniff");
 if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).end()}
 if(!validOrigin(req))return res.status(403).json({error:"Origem não autorizada"});
 const body=req.body||{};
 const sessionCandidate=clean(body.sessionId,64);
 const sessionId=/^[a-zA-Z0-9_-]{16,64}$/.test(sessionCandidate)?sessionCandidate:"";
 const attribution=body.attribution&&typeof body.attribution==="object"?body.attribution:{};
 const customerName=clean(body.customerName,100),cpf=digits(body.cpf),phone=digits(body.phone),cep=digits(body.cep);
 const address=clean(body.address,120),number=clean(body.number,20),complement=clean(body.complement,100);
 const neighborhood=clean(body.neighborhood,100),city=clean(body.city,100),state=clean(body.state,2).toUpperCase();
 const quantity=Number(body.quantity);
 if(customerName.length<3||!validCpf(cpf)||phone.length<10||phone.length>13||cep.length!==8||address.length<3||!number||neighborhood.length<2||city.length<2||!/^[A-Z]{2}$/.test(state)||!Number.isInteger(quantity)||quantity<1||quantity>10||body.acceptTerms!==true)
  return res.status(400).json({error:"Confira nome completo, CPF, WhatsApp, CEP, endereço, quantidade e aceite dos termos."});
 try{
  await init();
  const pepper=process.env.CHECKOUT_RATE_LIMIT_SECRET||process.env.ADMIN_SESSION_SECRET||"";
  if(pepper.length<32)return res.status(503).json({error:"Checkout temporariamente indisponível. Fale com nosso atendimento."});
  const forwarded=String(req.headers["x-vercel-forwarded-for"]||req.headers["x-forwarded-for"]||req.headers["x-real-ip"]||"").split(",")[0].trim();
  const ip=isIP(forwarded)?forwarded:(req.socket?.remoteAddress||"unknown");
  const ipHash=crypto.createHmac("sha256",pepper).update("checkout:"+ip).digest("hex");
  const limited=await db().query(`
   INSERT INTO natal_checkout_limits(ip_hash,attempts,window_start) VALUES($1,1,now())
   ON CONFLICT(ip_hash) DO UPDATE SET
    attempts=CASE WHEN natal_checkout_limits.window_start<=now()-interval '1 hour' THEN 1 ELSE natal_checkout_limits.attempts+1 END,
    window_start=CASE WHEN natal_checkout_limits.window_start<=now()-interval '1 hour' THEN now() ELSE natal_checkout_limits.window_start END
   WHERE natal_checkout_limits.attempts<8 OR natal_checkout_limits.window_start<=now()-interval '1 hour'
   RETURNING ip_hash
  `,[ipHash]);
  if(!limited.rowCount){res.setHeader("Retry-After","3600");return res.status(429).json({error:"Muitas tentativas de pedido. Aguarde um pouco e tente novamente."})}
  const configured=await db().query("SELECT value FROM natal_settings WHERE key='products'");
  const product=Array.isArray(configured.rows[0]?.value)?configured.rows[0].value.find(p=>p.id==="basic"):null;
  if(product?.active===false)return res.status(409).json({error:"Produto temporariamente indisponível. Fale com nosso atendimento."});
  const unitPrice=Number(product?.price)>0?Number(product.price):PRICE_FALLBACK;
  const total=Math.round(unitPrice*quantity*100)/100;
  const id="NATAL-"+crypto.randomBytes(6).toString("hex").toUpperCase();
  const accessKey=crypto.randomBytes(32).toString("hex");
  const paymentClaimHash=crypto.createHash("sha256").update(accessKey).digest("hex");
  const order={
   customerName,cpf,phone,cep,address,number,complement,neighborhood,city,state,sessionId,
   items:[{id:"basic",name:"Lareira Feliz",qty:quantity,unitPrice}],
   subtotal:total,shipping:0,shippingLabel:"Frete grátis",total,
   paymentClaimHash,paymentMethod:"Pix",paymentStatus:"Aguardando liberação manual",
   source:"loja_propria",createdAt:new Date().toISOString()
  };
  await db().query("INSERT INTO natal_orders(id,status,data) VALUES($1,'Aguardando QR Code',$2::jsonb)",[id,JSON.stringify(order)]);
  if(sessionId){
   try{
    await initEvents();
    await db().query("INSERT INTO natal_events(session_id,event_type,page,origin,utm_source,utm_medium,utm_campaign,utm_content,product_id,order_id) VALUES($1,'order_created','/checkout.html',$2,$3,$4,$5,$6,'basic',$7)",[sessionId,clean(req.headers.origin,150),clean(attribution.utm_source,90),clean(attribution.utm_medium,90),clean(attribution.utm_campaign,90),clean(attribution.utm_content,90),id]);
   }catch(eventError){console.error("checkout order event",eventError.code||eventError.message)}
  }
  return res.status(201).json({ok:true,id,accessKey,status:"Aguardando QR Code",unitPrice,quantity,shipping:0,total});
 }catch(e){console.error("Checkout order creation",e.code||e.message);return res.status(503).json({error:"Não foi possível registrar o pedido agora. Tente novamente ou fale com nosso atendimento."})}
};
