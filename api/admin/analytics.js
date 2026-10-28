const {valid}=require("../_auth");
const {db}=require("../_db");
const {initEvents}=require("../events");
module.exports=async function(req,res){
 res.setHeader("Cache-Control","no-store");
 if(!valid(req))return res.status(401).json({error:"Acesso restrito"});
 if(req.method!=="GET")return res.status(405).end();
 try{
  await initEvents();
  const a=await db().query(`SELECT
    COUNT(DISTINCT session_id) FILTER (WHERE event_type='page_view')::int AS visitors,
    COUNT(DISTINCT session_id) FILTER (WHERE event_type='begin_checkout')::int AS checkouts,
    COUNT(DISTINCT order_id) FILTER (WHERE event_type='order_created' AND order_id<>'')::int AS orders_created,
    COUNT(DISTINCT order_id) FILTER (WHERE event_type='payment_informed' AND order_id<>'')::int AS payment_notices
    FROM natal_events WHERE created_at >= now()-interval '30 days'`);
  const b=await db().query(`SELECT COUNT(*)::int AS paid FROM natal_orders WHERE created_at>=now()-interval '30 days' AND status=ANY($1)`,[["Pago","Produção","Enviado","Concluído"]]);
  const campaigns=await db().query(`SELECT COALESCE(NULLIF(utm_source,''),'Direto / não informado') AS source,COUNT(DISTINCT session_id)::int AS sessions,COUNT(DISTINCT order_id) FILTER(WHERE event_type='order_created' AND order_id<>'')::int AS orders FROM natal_events WHERE created_at>=now()-interval '30 days' GROUP BY 1 ORDER BY sessions DESC LIMIT 8`);
  const x=a.rows[0]||{},visitors=Number(x.visitors)||0,checkouts=Number(x.checkouts)||0,orders=Number(x.orders_created)||0;
  res.json({period:"Últimos 30 dias",visitors,checkouts,ordersCreated:orders,paymentNotices:Number(x.payment_notices)||0,paid:Number(b.rows[0]?.paid)||0,conversionRate:visitors?Math.round(orders/visitors*10000)/100:null,checkoutAbandonment:checkouts?Math.round(Math.max(0,checkouts-orders)/checkouts*10000)/100:null,campaigns:campaigns.rows});
 }catch(e){console.error("analytics dashboard",e.code||e.message);res.status(503).json({error:"Métricas indisponíveis"})}
};