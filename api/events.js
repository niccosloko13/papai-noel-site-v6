const {db,init}=require("./_db");
const TYPES=["page_view","view_product","add_to_cart","begin_checkout","shipping_info","order_created","payment_informed"];
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
 product_id text NOT NULL DEFAULT '',
 order_id text NOT NULL DEFAULT ''
 )`);
}
const clean=(v,max=90)=>typeof v==="string"?v.trim().slice(0,max):"";
module.exports=async function(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="POST")return res.status(405).end();
 const origin=req.headers.origin||"";
 if(origin&&origin!=="https://"+req.headers.host&&!/^http:\/\/localhost(:\d+)?$/.test(origin))return res.status(403).end();
 const b=req.body||{},event=clean(b.name,50),sid=clean(b.session_id,64);
 if(!TYPES.includes(event)||!/^[a-zA-Z0-9_-]{16,64}$/.test(sid)||JSON.stringify(b).length>2200)return res.status(400).json({error:"Evento inválido"});
 try{
 await initEvents();
 await db().query("INSERT INTO natal_events(session_id,event_type,page,origin,utm_source,utm_medium,utm_campaign,product_id,order_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",[sid,event,clean(b.page,150),clean(b.origin,150),clean(b.utm_source),clean(b.utm_medium),clean(b.utm_campaign),clean(b.product_id,50),clean(b.order_id,40)]);
 return res.status(202).json({ok:true});
 }catch(e){console.error("analytics collect",e.code||e.message);return res.status(503).json({error:"Telemetria indisponível"})}
};
module.exports.initEvents=initEvents;