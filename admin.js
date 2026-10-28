(()=>{
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const money=v=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v)||0);
const esc=v=>String(v??"").replace(/[&<>"\x27]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","\x27":"&#39;"}[c]));
const login=$("#adminLogin"),app=$("#adminApp"),form=$("#loginForm"),err=$("#loginError");
function openApp(){login.hidden=true;app.hidden=false;loadServer()}
async function checkSession(){
 try{
  const r=await fetch("/api/admin/auth",{credentials:"same-origin",cache:"no-store"});
  const data=await r.json();
  if(r.ok&&data.authenticated)openApp();
  else if(!data.configured)err.textContent="Configuração pendente na Vercel: "+[...(data.missing||[]),...(data.invalid||[]).map(x=>x+" (inválida)")].join(", ");
 }catch{err.textContent="Não foi possível verificar o acesso."}
}
async function logout(){
 try{await fetch("/api/admin/auth",{method:"DELETE",credentials:"same-origin"})}
 finally{location.reload()}
}
checkSession();
form.addEventListener("submit",async e=>{
 e.preventDefault();err.textContent="Verificando acesso...";
 const button=form.querySelector('button[type="submit"]');button.disabled=true;
 try{
  const r=await fetch("/api/admin/auth",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:$("#loginUser").value.trim(),password:$("#loginPass").value})});
  const data=await r.json();
  if(!r.ok){err.textContent=r.status===503?("Verifique na Vercel: "+[...(data.missing||[]),...(data.invalid||[]).map(x=>x+" (inválida)")].join(", ")):data.error||"Acesso não autorizado";return}
  $("#loginPass").value="";err.textContent="";openApp();
 }catch{err.textContent="Falha de conexão. Tente novamente."}
 finally{button.disabled=false}
});
$("#logoutBtn").onclick=logout;

const titles={dashboard:["PAINEL","Visão geral"],orders:["VENDAS","Pedidos"],products:["CATÁLOGO","Produtos"],pix:["PAGAMENTOS","Pix"],marketing:["AQUISIÇÃO","Anúncios"],seo:["ORGANIC","SEO"]};
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
 const response=await fetch("/api/admin/"+path,{credentials:"same-origin",cache:"no-store",...options});
 const data=await response.json();if(!response.ok)throw Error(data.error||"Erro no servidor");return data;
}
async function loadServer(){
 try{
 const [orders,settings]=await Promise.all([api("orders"),api("settings")]);
 serverOrders=orders.orders||[];serverSettings=settings.settings||{};renderAll();loadAnalytics();loadSummary();
 }catch(e){
 $("#sectionEyebrow").textContent="CONEXÃO INDISPONÍVEL";
 $("#recentOrders").textContent="Não foi possível conectar ao banco: "+e.message;
 $("#ordersList").textContent="Pedidos indisponíveis enquanto o banco não estiver conectado.";
  loadProducts();
  $("#productsMsg").textContent="Banco de dados indisponível: é possível visualizar os campos, mas não salvar até configurar DATABASE_URL.";;
 }
}
async function loadSummary(){
 try{
  const x=await api("summary");
  $("#mRevenue").textContent=money(x.revenue);
  $("#mRevenueSub").textContent=x.paid+" pedidos pagos";
  $("#mOrders").textContent=x.orders.toLocaleString("pt-BR");
  $("#mOrdersSub").textContent=x.today+" hoje";
  $("#mTicket").textContent=money(x.ticketAverage);
  $("#mPending").textContent=x.awaiting.toLocaleString("pt-BR");
  $("#mMonth").textContent=x.month.toLocaleString("pt-BR");
  $("#mBasic").textContent=x.basic.toLocaleString("pt-BR");
  $("#mPersonal").textContent=x.personal.toLocaleString("pt-BR");
 }catch(e){$("#mRevenueSub").textContent="Falha ao carregar resumo: "+e.message}
}
async function loadAnalytics(){
 try{
  const data=await api("analytics");
  $("#realVisitors").textContent=data.visitors.toLocaleString("pt-BR");
  $("#realCheckouts").textContent=data.checkouts.toLocaleString("pt-BR");
  $("#realConversion").textContent=data.conversionRate===null?"—":data.conversionRate.toLocaleString("pt-BR")+"%";
  $("#realAbandonment").textContent=data.checkoutAbandonment===null?"—":data.checkoutAbandonment.toLocaleString("pt-BR")+"%";
  $("#realAnalyticsNote").textContent="Eventos reais coletados desde a ativação. Métricas sujeitas a bloqueadores e visitantes que não permitem o registro.";
  $("#realCampaigns").innerHTML=(data.campaigns||[]).map(c=>'<div class="seo-check"><span>'+esc(c.source)+'</span><b>'+c.sessions+' sessões • '+c.orders+' pedidos</b></div>').join("")||'<p class="muted">Nenhum evento registrado.</p>';
 }catch(e){$("#realAnalyticsNote").textContent="Não foi possível carregar métricas: "+e.message}
}
const statusClass=s=>s==="Pago"||s==="Produção"||s==="Enviado"?"paid":"";
const todayKey=()=>new Date().toLocaleDateString("pt-BR");

function metrics(){
 const orders=getOrders();
 const paid=orders.filter(o=>["Pago","Produção","Enviado","Concluído"].includes(o.status));
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
 const id=esc(o.id),status=esc(o.status||"—"),contact=String(o.phone||"").replace(/\D/g,"");
 const details='<details class="order-detail"><summary>Ver dados completos do pedido</summary>'+
 '<div class="order-detail-grid">'+
 '<div><small>CLIENTE</small><strong>'+esc(o.customerName||"—")+'</strong></div>'+
 '<div><small>WHATSAPP</small><strong>'+esc(o.phone||"—")+'</strong></div>'+
 '<div><small>PERSONALIZAÇÃO</small><strong>'+esc(o.childName||"Sem personalização")+'</strong></div>'+
 '<div><small>MENSAGEM</small><p>'+esc(o.letter||"Mensagem padrão")+'</p></div>'+
 '<div><small>ENDEREÇO</small><p>'+esc([o.address,o.number,o.complement].filter(Boolean).join(", "))+'</p></div>'+
 '<div><small>CEP</small><strong>'+esc(o.cep||"—")+'</strong></div>'+
 '<div><small>ITENS</small><p>'+esc((o.items||[]).map(i=>i.qty+"× "+i.name+" — "+money(i.unitPrice)).join(" • "))+'</p></div>'+
 '<div><small>VALOR FINAL</small><strong>'+money(o.total)+'</strong></div>'+
 '</div></details>';
 return '<article class="order-row"><div class="order-top"><div><b>'+id+'</b><small>'+new Date(o.createdAt).toLocaleString("pt-BR")+'</small></div><span class="status '+statusClass(o.status)+'">'+status+'</span></div>'+
 '<div class="order-meta"><div><small>CLIENTE</small><strong>'+esc(o.customerName||"—")+'</strong></div><div><small>KIT</small><strong>'+kitLabel(o)+'</strong></div><div><small>TOTAL</small><strong>'+money(o.total)+'</strong></div></div>'+
 details+'<div class="order-actions">'+
 (o.status==="Pagamento informado"?'<button class="pay" data-status-id="'+id+'" data-status="Pago">Confirmar pagamento</button>':'')+
 (o.status==="Pago"?'<button data-status-id="'+id+'" data-status="Produção">Iniciar produção</button>':'')+
 (o.status==="Produção"?'<button data-status-id="'+id+'" data-status="Enviado">Marcar como enviado</button>':'')+
 (o.status==="Enviado"?'<button data-status-id="'+id+'" data-status="Concluído">Concluir pedido</button>':'')+
 (!["Concluído","Cancelado"].includes(o.status)?'<button data-status-id="'+id+'" data-status="Cancelado">Cancelar pedido</button>':'')+
 (contact?'<a href="https://wa.me/55'+contact+'" target="_blank" rel="noopener">WhatsApp</a>':'')+'</div></article>';
}
function bindStatus(){
 $$("[data-status-id]").forEach(b=>b.onclick=async()=>{
  const next=b.dataset.status,id=b.dataset.statusId;
  if(next==="Pago"&&!confirm("Você conferiu o Pix no banco?"))return;
  try{await api("orders",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status:next})});await loadServer()}
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

const productDefaults=(window.STORE_DATA?.products||[]).map(p=>({...p,benefits:[...p.benefits]}));
function loadProducts(){
 const products=Array.isArray(serverSettings.products)&&serverSettings.products.length===2?serverSettings.products:productDefaults;
 $("#productEditors").innerHTML=products.map(p=>`
 <div class="product-editor" data-product-id="${esc(p.id)}">
  <div class="product-editor-photo"><img src="${esc(p.image)}" alt="Foto do Kit ${esc(p.name)}" loading="lazy"></div>
  <div class="product-editor-fields">
    <h3>Kit ${esc(p.id==="basic"?"Essencial":"Personalizado")}</h3>
    <label>Nome<input data-field="name" maxlength="45" value="${esc(p.name)}"></label>
    <label>Descrição<textarea data-field="prop" maxlength="350" rows="3">${esc(p.prop)}</textarea></label>
    <label>Preço (R$)<input data-field="price" type="number" min="1" max="10000" step=".01" value="${Number(p.price)}"></label>
    <label>Endereço da foto<input data-field="image" value="${esc(p.image)}" placeholder="assets/product/foto.webp ou https://..."></label>
    <label>Itens incluídos (um por linha)<textarea data-field="benefits" rows="6">${esc(p.benefits.join("\n"))}</textarea></label>
    <label class="toggle-product"><input type="checkbox" data-field="active" ${p.active!==false?"checked":""}> Kit disponível para compra</label>
  </div>
 </div>`).join("");
 $$("#productEditors [data-field='image']").forEach(input=>input.addEventListener("change",()=>{
   const image=input.closest(".product-editor").querySelector("img");
   const url=input.value.trim();if(url.startsWith("assets/product/")||url.startsWith("https://"))image.src=url;
 }));
}
$("#saveProducts").addEventListener("click",async()=>{
 const products=$$("#productEditors .product-editor").map(el=>{
  const get=field=>el.querySelector('[data-field="'+field+'"]');
  return {id:el.dataset.productId,name:get("name").value.trim(),
    prop:get("prop").value.trim(),price:Number(get("price").value),
    image:get("image").value.trim(),benefits:get("benefits").value.split("\n").map(x=>x.trim()).filter(Boolean),
    active:get("active").checked};
 });
 const button=$("#saveProducts");button.disabled=true;$("#productsMsg").textContent="Salvando...";
 try{await api("settings",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({key:"products",value:products})});
   serverSettings.products=products;$("#productsMsg").textContent="Kits salvos no banco. A loja atualiza ao recarregar."}
 catch(e){$("#productsMsg").textContent="Não foi possível salvar: "+e.message}
 finally{button.disabled=false}
});
const pixDefaults={key:"",displayName:"",receiverName:"",city:"SAO PAULO",discount:15,shippingFlat:0,...(window.STORE_DATA?.pix||{})};
function loadPix(){
 const c={...pixDefaults,...(serverSettings.pix||{})};
 const map={pixKey:"key",displayName:"displayName",receiverName:"receiverName",pixCity:"city",pixDiscount:"discount",shippingFlat:"shippingFlat"};
 Object.entries(map).forEach(([id,k])=>$("#"+id).value=c[k]??"");$("#pixEnabled").checked=!!c.enabled;
}
$("#savePix").onclick=()=>{
 const out={enabled:$("#pixEnabled").checked,key:$("#pixKey").value.trim(),displayName:$("#displayName").value.trim(),receiverName:$("#receiverName").value.trim(),city:$("#pixCity").value.trim(),discount:Number($("#pixDiscount").value||0),shippingFlat:Number($("#shippingFlat").value||0)};
 api("settings",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({key:"pix",value:out})}).then(()=>{serverSettings.pix=out;$("#pixMsg").textContent="Configuração salva no servidor."}).catch(e=>$("#pixMsg").textContent=e.message);
};

const marketingDefaults={metaPixel:"",ga4:"",tiktokPixel:"",googleAds:""};
function loadMarketing(){const c={...marketingDefaults,...(serverSettings.marketing||{})};Object.keys(c).forEach(k=>{const el=$("#"+k);if(el)el.value=c[k]||""})}
$("#saveMarketing").onclick=()=>{const out={};Object.keys(marketingDefaults).forEach(k=>out[k]=$("#"+k).value.trim());api("settings",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({key:"marketing",value:out})}).then(()=>{serverSettings.marketing=out;$("#marketingMsg").textContent="IDs salvos no servidor."}).catch(e=>$("#marketingMsg").textContent=e.message);};

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
$("#saveSeo").onclick=()=>{const out={title:$("#seoTitle").value.trim(),description:$("#seoDescription").value.trim(),image:$("#seoImage").value.trim()};api("settings",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({key:"seo",value:out})}).then(()=>{serverSettings.seo=out;renderSeoChecks(out);$("#seoMsg").textContent="Rascunho salvo no servidor."}).catch(e=>$("#seoMsg").textContent=e.message);};

function renderAll(){metrics();renderOrders();loadPix();loadMarketing();loadSeo();loadProducts();bindStatus()}
})();