const {db,init}=require("./_db");
const crypto=require("node:crypto");
const TYPES=["page_view","view_product","add_to_cart","begin_checkout","shipping_info","order_created","payment_informed","marketplace_click"];
async function initEvents(){
 await init();
 await db().query(`CREATE TABLE IF NOT EXISTS natal_events (
 id bigserial PRIMARY KEY,
 created_at timestamptz NOT NULL DEFAULT now(),
 session_id text NOT NULL,
 event_type text NOT NULL,
 page text NOT NULL DEFAULT '',
 origin text NOT NULL DEFAULT '',
 utm_source text NOT NULL DEFAULT '',
 utm_medium text NOT NULL DEFAULT '',
 utm_campaign text NOT NULL DEFAULT '',
 utm_content text NOT NULL DEFAULT '',
 product_id text NOT NULL DEFAULT '',
 order_id text NOT NULL DEFAULT ''
 )`);
 await db().query("ALTER TABLE natal_events ADD COLUMN IF NOT EXISTS utm_content text NOT NULL DEFAULT ''");
 await db().query("ALTER TABLE natal_events ADD COLUMN IF NOT EXISTS visitor_hash text NOT NULL DEFAULT ''");
}
const clean=(v,max=90)=>typeof v==="string"?v.trim().slice(0,max):"";
function hashedVisitor(req){
 const secret=process.env.VISITOR_HASH_SECRET||process.env.ADMIN_SESSION_SECRET||"";
 if(secret.length<32)return "";
 const f=req.headers["x-vercel-forwarded-for"]||req.headers["x-forwarded-for"]||req.headers["x-real-ip"]||"";
 const ip=String(Array.isArray(f)?f[0]:f).split(",")[0].trim().slice(0,128);
 return ip?crypto.createHmac("sha256",secret).update("natal-ip-v1:"+ip).digest("hex"):"";
}
function human(req){return !/(bot|crawler|spider|headless|lighthouse|facebookexternalhit|googlebot|bingbot|curl|wget|python-requests|preview)/i.test(String(req.headers["user-agent"]||""));}

module.exports=async function(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="POST")return res.status(405).end();
 const origin=req.headers.origin||"";
 if(origin&&origin!=="https://"+req.headers.host&&!/^http:\/\/localhost(:\d+)?$/.test(origin))return res.status(403).end();
 const b=req.body||{},event=clean(b.name,50),sid=clean(b.session_id,64);
 if(!TYPES.includes(event)||!/^[a-zA-Z0-9_-]{16,64}$/.test(sid)||JSON.stringify(b).length>2200)return res.status(400).json({error:"Evento inválido"});
 try{
 await initEvents();
 const page=clean(b.page,150);
 const publicPage=/^\/(?:index\.html|checkout\.html|pedido\.html|pagamento-pedido\.html)?$/.test(page);
 const visitorHash=event==="page_view"&&publicPage&&human(req)?hashedVisitor(req):"";
 await db().query("INSERT INTO natal_events(session_id,event_type,page,origin,utm_source,utm_medium,utm_campaign,utm_content,product_id,order_id,visitor_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",[sid,event,page,clean(b.origin,150),clean(b.utm_source),clean(b.utm_medium),clean(b.utm_campaign),clean(b.utm_content),clean(b.product_id,50),clean(b.order_id,40),visitorHash]);
 return res.status(202).json({ok:true});
 }catch(e){console.error("analytics collect",e.code||e.message);return res.status(503).json({error:"Telemetria indisponível"})}
};
module.exports.initEvents=initEvents;