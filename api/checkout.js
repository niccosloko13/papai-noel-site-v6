const crypto=require("node:crypto");const {db,init}=require("./_db");const {buildPix}=require("./_pix");
const catalog={basic:{name:"Essencial",price:39.90},personal:{name:"Personalizado",price:69.90}};
function clean(x,max){return typeof x==="string"?x.trim().slice(0,max):""}
function safeOrigin(req){const o=req.headers.origin;return !o||o===("https://"+req.headers.host)||o===("http://localhost:"+String(req.headers.host||"").split(":").pop())}
module.exports=async function(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).end()}
 if(!safeOrigin(req))return res.status(403).json({error:"Origem inválida"});
 try{
 const b=req.body||{};if(JSON.stringify(b).length>8000)return res.status(413).json({error:"Pedido muito grande"});
 const items=Array.isArray(b.items)?b.items:[],ids=items.map(x=>x.id);
 if(!items.length||items.length>2||new Set(ids).size!==ids.length||items.some(i=>!catalog[i.id]||!Number.isInteger(i.qty)||i.qty<1||i.qty>10))return res.status(400).json({error:"Escolha kits e quantidades válidos"});
 const personal=ids.includes("personal");
 const fields={customerName:clean(b.customerName,90),phone:clean(b.phone,22),cep:clean(b.cep,9),address:clean(b.address,250),number:clean(b.number,20),complement:clean(b.complement,90),childName:personal?clean(b.childName,40):"",letter:personal?clean(b.letter,220):""};
 if(!fields.customerName||fields.phone.replace(/\D/g,"").length<10||fields.cep.replace(/\D/g,"").length!==8||!fields.address||!fields.number||(personal&&!fields.childName))return res.status(400).json({error:"Revise os dados do pedido"});
 await init();
 const result=await db().query("SELECT value FROM natal_settings WHERE key='pix'");const config=result.rows[0]?.value||{};
 if(config.enabled!==true||!config.key||!config.receiverName)return res.status(503).json({error:"Pagamento Pix temporariamente indisponível"});
 const disc=Number(config.discount);const shipping=Number(config.shippingFlat||0);
 if(!Number.isFinite(disc)||disc<0||disc>50||!Number.isFinite(shipping)||shipping<0||shipping>1000)return res.status(503).json({error:"Configuração de pagamento inválida"});
 const total=Math.round((items.reduce((sum,i)=>sum+catalog[i.id].price*i.qty,0)*(1-disc/100)+shipping)*100)/100;
 const id="NATAL-"+crypto.randomBytes(6).toString("hex").toUpperCase();
 const claim=crypto.randomBytes(32).toString("hex");
 const payload=buildPix({key:config.key,receiverName:config.receiverName,city:config.city||"SAO PAULO",amount:total,txid:id.replace("-","")});
 const order={id,createdAt:new Date().toISOString(),status:"Aguardando pagamento",items:items.map(i=>({id:i.id,name:catalog[i.id].name,qty:i.qty,unitPrice:catalog[i.id].price})),total,discountPercent:disc,shipping, ...fields,paymentClaimHash:crypto.createHash("sha256").update(claim).digest("hex")};
 await db().query("INSERT INTO natal_orders(id,status,data) VALUES($1,$2,$3)",[id,order.status,JSON.stringify(order)]);
 return res.status(201).json({id,total,pixPayload:payload,discountPercent:disc,receiverName:config.displayName||config.receiverName,claim});
 }catch(e){console.error("checkout submit",e.code||e.message);return res.status(503).json({error:"Não foi possível criar o pedido no momento"})}
};