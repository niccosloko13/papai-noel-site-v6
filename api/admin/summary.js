const {valid}=require("../_auth");const {db,init}=require("../_db");
const paid=["Pago","Produção","Enviado","Concluído"];
module.exports=async function(req,res){
 res.setHeader("Cache-Control","no-store");
 if(!valid(req))return res.status(401).json({error:"Acesso restrito"});
 if(req.method!=="GET")return res.status(405).end();
 try{
 await init();
 const a=await db().query(`SELECT
 COUNT(*)::int AS orders,
 COUNT(*) FILTER(WHERE (created_at AT TIME ZONE 'America/Sao_Paulo')::date=(now() AT TIME ZONE 'America/Sao_Paulo')::date)::int AS today,
 COUNT(*) FILTER(WHERE date_trunc('month',created_at AT TIME ZONE 'America/Sao_Paulo')=date_trunc('month',now() AT TIME ZONE 'America/Sao_Paulo'))::int AS month,
 COUNT(*) FILTER(WHERE status='Aguardando pagamento')::int AS awaiting,
 COUNT(*) FILTER(WHERE status=ANY($1))::int AS paid,
 COALESCE(SUM(CASE WHEN status=ANY($1) THEN (data->>'total')::numeric ELSE 0 END),0)::float AS revenue
 FROM natal_orders`,[paid]);
 const b=await db().query(`SELECT
 COALESCE(SUM(CASE WHEN item->>'id'='basic' THEN (item->>'qty')::int ELSE 0 END),0)::int AS basic,
 COALESCE(SUM(CASE WHEN item->>'id'='personal' THEN (item->>'qty')::int ELSE 0 END),0)::int AS personal
 FROM natal_orders o CROSS JOIN LATERAL jsonb_array_elements(o.data->'items') AS item
 WHERE o.status=ANY($1)`,[paid]);
 const x=a.rows[0]||{},q=b.rows[0]||{},revenue=Number(x.revenue)||0,paidCount=Number(x.paid)||0;
 return res.json({orders:Number(x.orders)||0,today:Number(x.today)||0,month:Number(x.month)||0,awaiting:Number(x.awaiting)||0,paid:paidCount,revenue,ticketAverage:paidCount?revenue/paidCount:0,basic:Number(q.basic)||0,personal:Number(q.personal)||0});
 }catch(e){console.error("Admin summary",e.code||e.message);return res.status(503).json({error:"Resumo indisponível"})}
};