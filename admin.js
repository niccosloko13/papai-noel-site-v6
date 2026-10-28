(()=>{
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const money=v=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v)||0);
const SESSION_KEY="natal_admin_session";
const LOGIN_USER="admin";
const LOGIN_PASS="123";

const login=$("#adminLogin"),app=$("#adminApp"),form=$("#loginForm"),err=$("#loginError");
function openApp(){login.hidden=true;app.hidden=false;renderAll()}
function logout(){sessionStorage.removeItem(SESSION_KEY);location.reload()}
if(sessionStorage.getItem(SESSION_KEY)==="1")openApp();
form.addEventListener("submit",e=>{
 e.preventDefault();
 if($("#loginUser").value.trim()===LOGIN_USER&&$("#loginPass").value===LOGIN_PASS){
   sessionStorage.setItem(SESSION_KEY,"1");openApp();
 }else err.textContent="Usuário ou senha incorretos.";
});
$("#logoutBtn").onclick=logout;

const titles={dashboard:["PAINEL","Visão geral"],orders:["VENDAS","Pedidos"],pix:["PAGAMENTOS","Pix"],marketing:["AQUISIÇÃO","Anúncios"],seo:["ORGANIC","SEO"]};
function selectTab(id){
 $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.tab===id));
 $$(".admin-panel").forEach(p=>p.classList.toggle("active",p.id===id));
 $("#sectionEyebrow").textContent=titles[id][0];$("#sectionTitle").textContent=titles[id][1];
 if(id==="orders")renderOrders();
}
$$(".nav-item").forEach(b=>b.onclick=()=>selectTab(b.dataset.tab));
$$("[data-open-tab]").forEach(b=>b.onclick=()=>selectTab(b.dataset.openTab));

const getOrders=()=>JSON.parse(localStorage.getItem("natal_orders")||"[]");
const saveOrders=o=>localStorage.setItem("natal_orders",JSON.stringify(o));
const statusClass=s=>s==="Pago"||s==="Produção"||s==="Enviado"?"paid":"";
const todayKey=()=>new Date().toLocaleDateString("pt-BR");

function metrics(){
 const orders=getOrders();
 const paid=orders.filter(o=>["Pago","Produção","Enviado"].includes(o.status));
 const informed=orders.filter(o=>o.status==="Pagamento informado");
 const revenue=paid.reduce((s,o)=>s+Number(o.total||0),0);
 const today=orders.filter(o=>new Date(o.createdAt).toLocaleDateString("pt-BR")===todayKey());
 $("#mRevenue").textContent=money(revenue);$("#mRevenueSub").textContent=paid.length+" pedidos pagos";
 $("#mOrders").textContent=orders.length;$("#mOrdersSub").textContent=today.length+" hoje";
 $("#mTicket").textContent=money(paid.length?revenue/paid.length:0);
 $("#mPending").textContent=orders.filter(o=>!["Pago","Produção","Enviado"].includes(o.status)).length;
 $("#fCreated").textContent=orders.length;$("#fInformed").textContent=informed.length;$("#fPaid").textContent=paid.length;
 $("#fConversion").textContent=(informed.length?Math.round(paid.length/(informed.length+paid.length)*100):0)+"%";
 $("#recentOrders").innerHTML=orders.slice(0,5).map(orderRow).join("")||'<p class="muted">Nenhum pedido ainda.</p>';
}

function kitLabel(o){return (o.items||[]).map(i=>(i.qty||1)+"× "+i.name).join(", ")||o.plan||"Kit"}
function orderRow(o){
 return '<article class="order-row"><div class="order-top"><div><b>'+o.id+'</b><small>'+new Date(o.createdAt).toLocaleString("pt-BR")+'</small></div><span class="status '+statusClass(o.status)+'">'+(o.status||"—")+'</span></div>'+
 '<div class="order-meta"><div><small>CLIENTE</small><strong>'+(o.customerName||"—")+'</strong></div><div><small>KIT</small><strong>'+kitLabel(o)+'</strong></div><div><small>TOTAL</small><strong>'+money(o.total)+'</strong></div></div>'+
 '<div class="order-actions">'+
 (o.status==="Pagamento informado"?'<button class="pay" data-status-id="'+o.id+'" data-status="Pago">Confirmar pagamento</button>':'')+
 (["Pago"].includes(o.status)?'<button data-status-id="'+o.id+'" data-status="Produção">Enviar para produção</button>':'')+
 (o.status==="Produção"?'<button data-status-id="'+o.id+'" data-status="Enviado">Marcar como enviado</button>':'')+
 '<a href="https://wa.me/55'+String(o.phone||"").replace(/\D/g,"")+'" target="_blank">WhatsApp</a></div></article>';
}
function bindStatus(){
 $$("[data-status-id]").forEach(b=>b.onclick=()=>{
  const orders=getOrders(),o=orders.find(x=>x.id===b.dataset.statusId);if(!o)return;
  const next=b.dataset.status;
  if(next==="Pago"&&!confirm("Confirmar que o Pix entrou na conta?"))return;
  o.status=next;o.updatedAt=new Date().toISOString();if(next==="Pago")o.paidAt=new Date().toISOString();
  saveOrders(orders);renderAll();
 });
}
function renderOrders(){
 const q=$("#orderSearch").value.trim().toLowerCase(),filter=$("#orderFilter").value;
 const orders=getOrders().filter(o=>{
  const hay=[o.id,o.customerName,o.phone,o.childName,kitLabel(o)].join(" ").toLowerCase();
  return (!q||hay.includes(q))&&(filter==="all"||o.status===filter);
 });
 $("#ordersList").innerHTML=orders.map(orderRow).join("")||'<p class="muted">Nenhum pedido encontrado.</p>';bindStatus();
}
$("#orderSearch").addEventListener("input",renderOrders);$("#orderFilter").addEventListener("change",renderOrders);

const pixDefaults={key:"",displayName:"",receiverName:"",city:"SAO PAULO",discount:15,shippingFlat:0,...(window.STORE_DATA?.pix||{})};
function loadPix(){
 const c={...pixDefaults,...JSON.parse(localStorage.getItem("natal_pix_config")||"{}")};
 const map={pixKey:"key",displayName:"displayName",receiverName:"receiverName",pixCity:"city",pixDiscount:"discount",shippingFlat:"shippingFlat"};
 Object.entries(map).forEach(([id,k])=>$("#"+id).value=c[k]??"");
}
$("#savePix").onclick=()=>{
 const out={enabled:true,key:$("#pixKey").value.trim(),displayName:$("#displayName").value.trim(),receiverName:$("#receiverName").value.trim(),city:$("#pixCity").value.trim(),discount:Number($("#pixDiscount").value||0),shippingFlat:Number($("#shippingFlat").value||0)};
 localStorage.setItem("natal_pix_config",JSON.stringify(out));$("#pixMsg").innerHTML='<div class="notice">Configuração Pix salva neste navegador.</div>';
};

const marketingDefaults={metaPixel:"",ga4:"",tiktokPixel:"",googleAds:""};
function loadMarketing(){const c={...marketingDefaults,...JSON.parse(localStorage.getItem("natal_marketing_config")||"{}")};Object.keys(c).forEach(k=>{const el=$("#"+k);if(el)el.value=c[k]||""})}
$("#saveMarketing").onclick=()=>{const out={};Object.keys(marketingDefaults).forEach(k=>out[k]=$("#"+k).value.trim());localStorage.setItem("natal_marketing_config",JSON.stringify(out));$("#marketingMsg").innerHTML='<div class="notice">IDs salvos. Integração de eventos preparada para a loja.</div>'};

const seoDefaults={title:"Kit Papai Noel Passou Aqui | Natal 2026",description:"Crie uma surpresa de Natal inesquecível com pegadas do Papai Noel, adesivo de janela e opções personalizadas.",image:"assets/product/kit-personalizado.webp"};
function loadSeo(){const c={...seoDefaults,...JSON.parse(localStorage.getItem("natal_seo_config")||"{}")};$("#seoTitle").value=c.title;$("#seoDescription").value=c.description;$("#seoImage").value=c.image;renderSeoChecks(c)}
function renderSeoChecks(c){
 const checks=[
  ["Título entre 30 e 60 caracteres",c.title.length>=30&&c.title.length<=60],
  ["Descrição entre 120 e 160 caracteres",c.description.length>=120&&c.description.length<=160],
  ["Imagem social definida",!!c.image],
  ["Página em HTTPS",location.protocol==="https:"],
  ["Viewport mobile",true]
 ];
 $("#seoChecks").innerHTML=checks.map(([t,ok])=>'<div class="seo-check"><span>'+t+'</span><b class="'+(ok?"ok":"warn")+'">'+(ok?"OK":"Revisar")+'</b></div>').join("");
}
$("#saveSeo").onclick=()=>{const out={title:$("#seoTitle").value.trim(),description:$("#seoDescription").value.trim(),image:$("#seoImage").value.trim()};localStorage.setItem("natal_seo_config",JSON.stringify(out));renderSeoChecks(out);$("#seoMsg").innerHTML='<div class="notice">Rascunho SEO salvo.</div>'};

function renderAll(){metrics();renderOrders();loadPix();loadMarketing();loadSeo();bindStatus()}
})();