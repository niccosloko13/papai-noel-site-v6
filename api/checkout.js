const crypto=require("node:crypto");
const {isIP}=require("node:net");
const {db,init}=require("./_db");
const PRICE_FALLBACK=148.90;
const digits=v=>String(v||"").replace(/\\D/g,"");
function clean(v,max){return typeof v==="string"?v.trim().slice(0,max):""}
function validOrigin(req){const origin=req.headers.origin,host=req.headers.host;return !!origin&&(origin==="https://"+host||(process.env.VERCEL_ENV!=="production"&&/^http:\/\/localhost(?::\\d+)?$/.test(origin)))}
module.exports=async function(req,res){
 res.setHeader("Cache-Control","no-store");
 res.setHeader("X-Robots-Tag","noindex,nofollow");
 res.setHeader("X-Content-Type-Options","nosniff");
 if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).end()}
 if(!validOrigin(req))return res.status(403).json({error:"Origem não autorizada"});
 const body=req.body||{};
 const customerName=clean(body.customerName,100),phone=digits(body.phone),cep=digits(body.cep);
 const address=clean(body.address,120),number=clean(body.number,20),complement=clean(body.complement,100);
 const neighborhood=clean(body.neighborhood,100),city=clean(body.city,100),state=clean(body.state,2).toUpperCase();
 const quantity=Number(body.quantity);
 if(customerName.length<3||phone.length<10||phone.length>13||cep.length!==8||address.length<3||!number||neighborhood.length<2||city.length<2||!/^[A-Z]{2}$/.test(state)||!Number.isInteger(quantity)||quantity<1||quantity>10||body.acceptTerms!==true)
  return res.status(400).json({error:"Confira nome, WhatsApp, CEP, endereço, quantidade e aceite dos termos."});
 try{
  await init();
  const pepper=process.env.CHECKOUT_RATE_LIMIT_SECRET||process.env.ADMIN_SESSION_SECRET||"";
  if(pepper.length<32)return res.status(503).json({error:"Checkout temporariamente indisponível. Fale com nosso atendimento."});
  const forwarded=String(req.headers["x-vercel-forwarded-for"]||"").split(",")[0].trim();
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
   customerName,phone,cep,address,number,complement,neighborhood,city,state,
   items:[{id:"basic",name:"Lareira Feliz",qty:quantity,unitPrice}],
   subtotal:total,shipping:0,shippingLabel:"Frete grátis",total,
   paymentClaimHash,paymentMethod:"Pix",paymentStatus:"Aguardando liberação manual",
   source:"loja_propria",createdAt:new Date().toISOString()
  };
  await db().query("INSERT INTO natal_orders(id,status,data) VALUES($1,'Aguardando QR Code',$2::jsonb)",[id,JSON.stringify(order)]);
  return res.status(201).json({ok:true,id,accessKey,status:"Aguardando QR Code",unitPrice,quantity,shipping:0,total});
 }catch(e){console.error("Checkout order creation",e.code||e.message);return res.status(503).json({error:"Não foi possível registrar o pedido agora. Tente novamente ou fale com nosso atendimento."})}
};
