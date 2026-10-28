(()=>{
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const money=v=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v)||0);
const esc=v=>String(v??"").replace(/[&<>"\x27]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","\x27":"&#39;"}[c]));
let demoMode=false;
const DEMO_EXPIRES=Date.parse("2026-10-29T04:43:07Z");
const demoActive=()=>Date.now()<DEMO_EXPIRES;
const demoLoad=(key,fallback)=>{try{return JSON.parse(localStorage.getItem("natal_demo_"+key))??fallback}catch{return fallback}};
const demoSave=(key,value)=>localStorage.setItem("natal_demo_"+key,JSON.stringify(value));
const login=$("#adminLogin"),app=$("#adminApp"),form=$("#loginForm"),err=$("#loginError");
function openApp(){login.hidden=true;app.hidden=false;if(demoMode){serverOrders=demoLoad("orders",[]);serverSettings=demoLoad("settings",{});$("#sectionEyebrow").textContent="DEMONSTRAÇÃO";$("#adminDemoBanner").hidden=false;renderAll()}else loadServer()}
async function checkSession(){
 try{const r=await fetch("/api/admin/auth",{credentials:"same-origin",cache:"no-store"});const d=await r.json();if(r.ok&&d.authenticated)openApp();else if(!d.configured)err.textContent=demoActive()?"Digite a senha 123 para abrir o painel de testes.":"Configuração de produção pendente."}catch{err.textContent="Não foi possível verificar a sessão."}
}
async function logout(){if(demoMode){location.reload();return}try{await fetch("/api/admin/auth",{method:"DELETE",credentials:"same-origin"})}finally{location.reload()}}
checkSession();
$("#loginPass").addEventListener("input",()=>{if(demoActive())err.textContent=""});
form.addEventListener("submit",async e=>{
 e.preventDefault();
 const username=$("#loginUser").value.trim();
 const password=$("#loginPass").value;
 if(demoActive()&&username==="admin"&&password==="123"){
  demoMode=true;$("#loginPass").value="";err.textContent="";openApp();return;
 }
 err.textContent="Verificando acesso...";
 try{
 const r=await fetch("/api/admin/auth",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password})});
 const data=await r.json();
 if(!r.ok){err.textContent=data.error||"Acesso não autorizado";return}
 $("#loginPass").value="";err.textContent="";openApp();
 }catch{err.textContent="Não foi possível entrar. Tente novamente."}
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

let serverOrders=[];let serverSettings={};
const getOrders=()=>serverOrders;
async function api(path,options={}){
 if(demoMode){
 if(!demoActive()){location.reload();throw Error("Acesso temporário expirado")}
 if(path==="orders"&&options.method==="PATCH"){
 const {id,status}=JSON.parse(options.body);
 const order=serverOrders.find(o=>o.id===id);
 if(!order)throw Error("Pedido de teste não encontrado");
 order.status=status;order.updatedAt=new Date().toISOString();if(status==="Pago")order.paidAt=order.updatedAt;
 demoSave("orders",serverOrders);return {ok:true};
 }
 if(path==="settings"&&options.method==="PUT"){
 const {key,value}=JSON.parse(options.body);serverSettings[key]=value;demoSave("settings",serverSettings);return {ok:true};
 }
 return {orders:serverOrders,settings:serverSettings};
 }
 const response=await fetch("/api/admin/"+path,{credentials:"same-origin",cache:"no-store",...options});
 const data=await response.json();if(!response.ok)throw Error(data.error||"Erro no servidor");return data;
}
async function loadServer(){
 try{
 const [orders,settings]=await Promise.all([api("orders"),api("settings")]);
 serverOrders=orders.orders||[];serverSettings=settings.settings||{};renderAll();
 }catch(e){
 $("#sectionEyebrow").textContent="CONEXÃO INDISPONÍVEL";
 $("#recentOrders").textContent="Não foi possível conectar ao banco: "+e.message;
 $("#ordersList").textContent="Pedidos indisponíveis enquanto o servidor não estiver configurado.";
 }
}
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

function kitLabel(o){return esc((o.items||[]).map(i=>(i.qty||1)+"× "+i.name).join(", ")||o.plan||"Kit")}
function orderRow(o){
 return '<article class="order-row"><div class="order-top"><div><b>'+esc(o.id)+'</b><small>'+new Date(o.createdAt).toLocaleString("pt-BR")+'</small></div><span class="status '+statusClass(o.status)+'">'+esc(o.status||"—")+'</span></div>'+
 '<div class="order-meta"><div><small>CLIENTE</small><strong>'+esc(o.customerName||"—")+'</strong></div><div><small>KIT</small><strong>'+kitLabel(o)+'</strong></div><div><small>TOTAL</small><strong>'+money(o.total)+'</strong></div></div>'+
 '<div class="order-actions">'+
 (o.status==="Pagamento informado"?'<button class="pay" data-status-id="'+o.id+'" data-status="Pago">Confirmar pagamento</button>':'')+
 (["Pago"].includes(o.status)?'<button data-status-id="'+o.id+'" data-status="Produção">Enviar para produção</button>':'')+
 (o.status==="Produção"?'<button data-status-id="'+o.id+'" data-status="Enviado">Marcar como enviado</button>':'')+
 '<a href="https://wa.me/55'+String(o.phone||"").replace(/\D/g,"")+'" target="_blank">WhatsApp</a></div></article>';
}
function bindStatus(){
 $$("[data-status-id]").forEach(b=>b.onclick=async()=>{
  const next=b.dataset.status,id=b.dataset.statusId;
  if(next==="Pago"&&!confirm("Você conferiu o Pix no banco?"))return;
  try{await api("orders",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status:next})});if(demoMode)renderAll();else await loadServer()}
  catch(e){alert("Não foi possível atualizar: "+e.message)}
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
 const c={...pixDefaults,...(serverSettings.pix||{})};
 const map={pixKey:"key",displayName:"displayName",receiverName:"receiverName",pixCity:"city",pixDiscount:"discount",shippingFlat:"shippingFlat"};
 Object.entries(map).forEach(([id,k])=>$("#"+id).value=c[k]??"");$("#pixEnabled").checked=!!c.enabled;
}
$("#savePix").onclick=()=>{
 const out={enabled:$("#pixEnabled").checked,key:$("#pixKey").value.trim(),displayName:$("#displayName").value.trim(),receiverName:$("#receiverName").value.trim(),city:$("#pixCity").value.trim(),discount:Number($("#pixDiscount").value||0),shippingFlat:Number($("#shippingFlat").value||0)};
 api("settings",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({key:"pix",value:out})}).then(()=>{serverSettings.pix=out;$("#pixMsg").textContent=demoMode?"Configuração salva somente no teste.":"Configuração salva no servidor."}).catch(e=>$("#pixMsg").textContent=e.message);
};

const marketingDefaults={metaPixel:"",ga4:"",tiktokPixel:"",googleAds:""};
function loadMarketing(){const c={...marketingDefaults,...(serverSettings.marketing||{})};Object.keys(c).forEach(k=>{const el=$("#"+k);if(el)el.value=c[k]||""})}
$("#saveMarketing").onclick=()=>{const out={};Object.keys(marketingDefaults).forEach(k=>out[k]=$("#"+k).value.trim());api("settings",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({key:"marketing",value:out})}).then(()=>{serverSettings.marketing=out;$("#marketingMsg").textContent=demoMode?"IDs salvos somente no teste.":"IDs salvos no servidor."}).catch(e=>$("#marketingMsg").textContent=e.message);};

const seoDefaults={title:"Kit Papai Noel Passou Aqui | Natal 2026",description:"Crie uma surpresa de Natal inesquecível com pegadas do Papai Noel, adesivo de janela e opções personalizadas.",image:"assets/product/kit-personalizado.webp"};
function loadSeo(){const c={...seoDefaults,...(serverSettings.seo||{})};$("#seoTitle").value=c.title;$("#seoDescription").value=c.description;$("#seoImage").value=c.image;renderSeoChecks(c)}
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
$("#saveSeo").onclick=()=>{const out={title:$("#seoTitle").value.trim(),description:$("#seoDescription").value.trim(),image:$("#seoImage").value.trim()};api("settings",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({key:"seo",value:out})}).then(()=>{serverSettings.seo=out;renderSeoChecks(out);$("#seoMsg").textContent=demoMode?"Rascunho salvo somente no teste.":"Rascunho salvo no servidor."}).catch(e=>$("#seoMsg").textContent=e.message);};

$("#createDemoOrder")?.addEventListener("click",()=>{
 if(!demoMode||!demoActive())return;
 const id="TESTE-"+Date.now().toString(36).toUpperCase();
 const idProduct=$("#demoKit").value;
 const personal=idProduct==="personal";
 serverOrders.unshift({id,createdAt:new Date().toISOString(),status:"Pagamento informado",
 customerName:"Cliente de teste",phone:"",childName:personal?"Criança de teste":"",
 address:"Endereço fictício",number:"0",total:personal?59.42:33.92,
 items:[{id:idProduct,name:personal?"Personalizado":"Essencial",qty:1}]});
 demoSave("orders",serverOrders);renderAll();
});
function renderAll(){metrics();renderOrders();loadPix();loadMarketing();loadSeo();bindStatus()}
})();