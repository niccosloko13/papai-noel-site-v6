(()=>{
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const money=v=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v)||0);
const esc=v=>String(v??"").replace(/[&<>"\x27]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","\x27":"&#39;"}[c]));
const login=$("#adminLogin"),app=$("#adminApp"),form=$("#loginForm"),err=$("#loginError");
function openApp(){login.hidden=true;app.hidden=false;selectTab("dashboard");loadServer()}
async function checkSession(){
 try{
  const r=await fetch("/api/admin/auth",{credentials:"same-origin",cache:"no-store"});
  const data=await r.json();
  if(r.ok&&data.authenticated)openApp();
  else if(!data.configured)err.textContent="Acesso administrativo indisponível. Confira a configuração na Vercel.";
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
  if(!r.ok){err.textContent=data.error||"Acesso não autorizado";return}
  $("#loginPass").value="";err.textContent="";openApp();
 }catch{err.textContent="Falha de conexão. Tente novamente."}
 finally{button.disabled=false}
});
$("#logoutBtn").onclick=logout;

const titles={
 dashboard:["LOJA","Visão geral"],orders:["LOJA","Pedidos"],products:["LOJA","Produto"],
 logistics:["OPERAÇÃO","Logística"],inventory:["OPERAÇÃO","Estoque"],
 finance:["GESTÃO","Financeiro"],checkout:["LOJA","Checkout próprio"]
};
function selectTab(id){
 const target=document.getElementById(id);
 if(!target||!target.classList.contains("admin-panel"))return;
 $$(".nav-item").forEach(button=>{
  const active=button.dataset.tab===id;
  button.classList.toggle("active",active);
  if(active)button.setAttribute("aria-current","page");
  else button.removeAttribute("aria-current");
 });
 $$(".admin-panel").forEach(panel=>{
  const active=panel===target;
  panel.classList.toggle("active",active);
  panel.hidden=!active;
 });
 const title=titles[id]||["LOJA","Painel"];
 $("#sectionEyebrow").textContent=title[0];
 $("#sectionTitle").textContent=title[1];
 if(id==="orders")renderOrders();
 if(id==="logistics")renderLogistics();
 if(id==="inventory")loadInventory();
 if(id==="finance")renderFinance();
 window.scrollTo({top:0,behavior:"auto"});
}
document.addEventListener("click",event=>{
 const button=event.target.closest(".nav-item[data-tab], [data-open-tab]");
 if(!button)return;
 const id=button.dataset.tab||button.dataset.openTab;
 if(!id)return;
 event.preventDefault();
 selectTab(id);
},true);

let serverOrders=[];let serverSettings={};
const getOrders=()=>serverOrders;

const notificationStorageKey="natal_admin_order_notifications_v1:"+location.hostname;
const lastOrderCheckKey="natal_admin_order_check_v1:"+location.hostname;
const orderSoundKey="natal_admin_order_sound_v1:"+location.hostname;
let orderNotificationItems=[];
let knownOrderIds=new Set();
let orderSnapshotInitialized=false;
let orderPollTimer=null;
let orderPollBusy=false;
let orderAudioContext=null;
let orderSoundEnabled=false;
try{
 orderNotificationItems=JSON.parse(localStorage.getItem(notificationStorageKey)||"[]");
 if(!Array.isArray(orderNotificationItems))orderNotificationItems=[];
 orderSoundEnabled=localStorage.getItem(orderSoundKey)==="1";
}catch{}

function saveOrderNotifications(){
 try{localStorage.setItem(notificationStorageKey,JSON.stringify(orderNotificationItems.slice(0,30)))}catch{}
}
function renderOrderNotifications(){
 const unread=orderNotificationItems.filter(item=>!item.seen).length;
 const count=$("#notificationCount");
 if(count){count.textContent=unread>99?"99+":String(unread);count.hidden=unread===0}
 const status=$("#notificationStatus");
 if(status)status.textContent=unread?unread+" pedido(s) não visualizado(s)":"Tudo em dia";
 const list=$("#notificationList");
 if(!list)return;
 list.innerHTML=orderNotificationItems.length?orderNotificationItems.slice(0,12).map(item=>{
  const when=item.createdAt?new Date(item.createdAt).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):"Agora";
  return '<button type="button" class="notification-item '+(item.seen?"seen":"unread")+'" data-open-order="'+esc(item.id)+'"><span class="notification-item-dot"></span><span class="notification-item-copy"><strong>Novo pedido · '+esc(item.id)+'</strong><small>'+esc(when)+' · '+money(item.total)+'</small></span><span class="notification-item-arrow">›</span></button>';
 }).join(""):'<p class="muted notification-empty">Nenhum pedido novo por enquanto.</p>';
 list.querySelectorAll("[data-open-order]").forEach(button=>button.addEventListener("click",()=>{
  const id=button.dataset.openOrder;
  orderNotificationItems=orderNotificationItems.map(item=>item.id===id?{...item,seen:true}:item);
  saveOrderNotifications();renderOrderNotifications();
  $("#notificationPopover").hidden=true;$("#notificationBell").setAttribute("aria-expanded","false");
  selectTab("orders");$("#orderSearch").value=id;renderOrders();
 }));
}
function openOrderFromNotification(id){
 const item=orderNotificationItems.find(x=>x.id===id);
 if(item){orderNotificationItems=orderNotificationItems.map(x=>x.id===id?{...x,seen:true}:x);saveOrderNotifications();renderOrderNotifications()}
 selectTab("orders");
 if($("#orderSearch")){$("#orderSearch").value=id;renderOrders()}
}
function playOrderNotificationSound(){
 if(!orderSoundEnabled||!orderAudioContext)return;
 try{
  if(orderAudioContext.state==="suspended")orderAudioContext.resume();
  const start=orderAudioContext.currentTime;
  [880,1175,880].forEach((frequency,index)=>{
   const oscillator=orderAudioContext.createOscillator(),gain=orderAudioContext.createGain();
   oscillator.type="sine";oscillator.frequency.value=frequency;
   gain.gain.setValueAtTime(.0001,start+index*.16);
   gain.gain.exponentialRampToValueAtTime(.16,start+index*.16+.025);
   gain.gain.exponentialRampToValueAtTime(.0001,start+index*.16+.13);
   oscillator.connect(gain);gain.connect(orderAudioContext.destination);
   oscillator.start(start+index*.16);oscillator.stop(start+index*.16+.14);
  });
 }catch{}
}
function showOrderToast(order){
 const container=$("#orderToastContainer");if(!container)return;
 const toast=document.createElement("article");toast.className="order-toast";
 const copy=document.createElement("div");copy.className="order-toast-copy";
 const title=document.createElement("strong");title.textContent="Novo pedido recebido!";
 const detail=document.createElement("span");detail.textContent=order.id+" · "+money(order.total);
 copy.append(title,detail);
 const view=document.createElement("button");view.type="button";view.className="order-toast-view";view.textContent="Ver pedido";
 view.addEventListener("click",()=>{openOrderFromNotification(order.id);toast.remove()});
 const dismiss=document.createElement("button");dismiss.type="button";dismiss.className="order-toast-dismiss";dismiss.setAttribute("aria-label","Fechar notificação");dismiss.textContent="×";dismiss.addEventListener("click",()=>toast.remove());
 toast.append(copy,view,dismiss);container.prepend(toast);
 while(container.children.length>4)container.lastElementChild.remove();
 setTimeout(()=>toast.remove(),14000);
}
function notifyNewOrder(order){
 if(orderNotificationItems.some(item=>item.id===order.id))return;
 orderNotificationItems.unshift({id:order.id,total:Number(order.total)||0,createdAt:order.createdAt||new Date().toISOString(),seen:false});
 orderNotificationItems=orderNotificationItems.slice(0,30);
 saveOrderNotifications();renderOrderNotifications();showOrderToast(order);playOrderNotificationSound();
 if("Notification" in window&&Notification.permission==="granted"){
  try{
   const notification=new Notification("Novo pedido — Lareira Feliz",{body:order.id+" · "+money(order.total),tag:"lareira-"+order.id});
   notification.onclick=()=>{window.focus();openOrderFromNotification(order.id);notification.close()};
  }catch{}
 }
}
function processOrderSnapshot(orders){
 const now=Date.now();
 let incoming=[];
 if(!orderSnapshotInitialized){
  let lastCheck=0;
  try{lastCheck=Number(localStorage.getItem(lastOrderCheckKey))||0}catch{}
  if(lastCheck>0)incoming=orders.filter(order=>new Date(order.createdAt).getTime()>lastCheck);
  orderSnapshotInitialized=true;
 }else{
  incoming=orders.filter(order=>!knownOrderIds.has(order.id));
 }
 incoming.sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)).forEach(notifyNewOrder);
 knownOrderIds=new Set(orders.map(order=>order.id));
 try{localStorage.setItem(lastOrderCheckKey,String(now))}catch{}
}
async function pollForNewOrders(){
 if(orderPollBusy)return;
 orderPollBusy=true;
 try{
  const data=await api("orders"),fresh=data.orders||[];
  const previous=new Map(serverOrders.map(order=>[order.id,order.status]));
  const changed=fresh.length!==serverOrders.length||fresh.some(order=>previous.get(order.id)!==order.status);
  processOrderSnapshot(fresh);
  if(changed){
   serverOrders=fresh;metrics();renderOrders();renderLogistics();renderFinance();
  }
 }catch(error){
  const status=$("#notificationStatus");
  if(status&&$("#notificationPopover")&&!$("#notificationPopover").hidden)status.textContent="Reconectando ao servidor...";
 }finally{orderPollBusy=false}
}
function startOrderPolling(){
 if(orderPollTimer)return;
 orderPollTimer=setInterval(pollForNewOrders,15000);
}
const notificationBell=$("#notificationBell");
notificationBell?.addEventListener("click",()=>{
 const popover=$("#notificationPopover"),open=popover.hidden;
 popover.hidden=!open;notificationBell.setAttribute("aria-expanded",String(open));
 if(open)renderOrderNotifications();
});
$("#clearNotifications")?.addEventListener("click",()=>{
 orderNotificationItems=orderNotificationItems.map(item=>({...item,seen:true}));
 saveOrderNotifications();renderOrderNotifications();
});
document.addEventListener("click",event=>{
 if(!event.target.closest(".notification-center")){
  const popover=$("#notificationPopover");
  if(popover){popover.hidden=true;notificationBell?.setAttribute("aria-expanded","false")}
 }
});
$("#enableOrderAlerts")?.addEventListener("click",async()=>{
 const button=$("#enableOrderAlerts");
 orderSoundEnabled=true;
 try{localStorage.setItem(orderSoundKey,"1")}catch{}
 try{
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  if(AudioContextClass){orderAudioContext=orderAudioContext||new AudioContextClass();await orderAudioContext.resume()}
 }catch{}
 let permission="unsupported";
 if("Notification" in window){
  try{permission=Notification.permission==="default"?await Notification.requestPermission():Notification.permission}catch{permission="denied"}
 }
 if(permission==="granted")button.textContent="Alertas ativados ✓";
 else if(permission==="denied")button.textContent="Som ativado · navegador bloqueado";
 else button.textContent="Som ativado";
 button.classList.add("alerts-enabled");
});
renderOrderNotifications();
async function api(path,options={}){
 const response=await fetch("/api/admin/"+path,{credentials:"same-origin",cache:"no-store",...options});
 const data=await response.json();if(!response.ok)throw Error(data.error||"Erro no servidor");return data;
}
async function loadServer(){
 try{
 const [orders,settings]=await Promise.all([api("orders"),api("settings")]);
 const freshOrders=orders.orders||[];
 processOrderSnapshot(freshOrders);
 serverOrders=freshOrders;serverSettings=settings.settings||{};renderAll();loadAnalytics();loadSummary();startOrderPolling();
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
  $("#mBasic").textContent=x.paid.toLocaleString("pt-BR");
 }catch(e){$("#mRevenueSub").textContent="Falha ao carregar resumo: "+e.message}
}
async function loadAnalytics(){
 try{
  const data=await api("analytics");
  $("#realVisitors").textContent=Number(data.visitors||0).toLocaleString("pt-BR");
  if($("#realSessions"))$("#realSessions").textContent=Number(data.sessions||0).toLocaleString("pt-BR");
  $("#realCheckouts").textContent=data.checkouts.toLocaleString("pt-BR");
  $("#realMlClicks").textContent=Number(data.ordersCreated||0).toLocaleString("pt-BR");
  $("#realShopeeClicks").textContent=Number(data.paymentNotices||0).toLocaleString("pt-BR");
  $("#realConversion").textContent=data.conversionRate===null?"—":data.conversionRate.toLocaleString("pt-BR")+"%";
  $("#realAbandonment").textContent=data.checkoutAbandonment===null?"—":data.checkoutAbandonment.toLocaleString("pt-BR")+"%";
  $("#realAnalyticsNote").textContent="Visitantes únicos por IP anonimizado (HMAC), últimos 30 dias. Uma rede compartilhada pode contar como uma pessoa; IP dinâmico pode contar outra vez. Contagem disponível apenas após esta atualização. Nenhum IP em claro é armazenado.";
  $("#realCampaigns").innerHTML=(data.campaigns||[]).map(c=>'<div class="seo-check"><span>'+esc(c.source)+'</span><b>'+c.sessions+' sessões • '+c.orders+' pedidos</b></div>').join("")||'<p class="muted">Nenhum evento registrado.</p>';
  const stages=data.checkoutStages||{};
  const stageItems=[
   ["Iniciaram",stages.started],["CEP localizado",stages.cep],["Endereço completo",stages.address],
   ["Dados pessoais",stages.customer],["Termos aceitos",stages.terms],["Confirmaram pedido",stages.orders],
   ["Pix liberado",stages.pixReleased],["Avisaram pagamento",stages.paymentInformed],["Pagos",stages.paymentConfirmed],
   ["Não concluíram",stages.abandoned]
  ];
  $("#checkoutStageGrid").innerHTML=stageItems.map(([label,value])=>'<div class="checkout-stage-card"><small>'+esc(label)+'</small><strong>'+Number(value||0).toLocaleString("pt-BR")+'</strong></div>').join("");
  const stepNames={cep:"CEP",endereco:"Endereço",dados:"Dados pessoais",termos:"Termos",confirmacao:"Confirmação"};
  const recent=data.recentSessions||[];
  $("#checkoutSessionsList").innerHTML=recent.map(s=>{
   const age=s.lastActivity?Date.now()-new Date(s.lastActivity).getTime():Infinity;
   const state=s.paid?"Pago":s.paymentInformed?"Pagamento informado":s.pixReleased?"Pix liberado":s.completed?"Pedido criado":age<30*60*1000?"Em andamento":"Não concluiu";
   const steps=["cep","endereco","dados","termos","confirmacao"].filter(x=>(s.steps||[]).includes(x)).map(x=>stepNames[x]).join(" · ")||"Nenhuma etapa além do início";
   const when=s.lastActivity?new Date(s.lastActivity).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):"";
   return '<div class="checkout-session-row"><div><strong>Sessão #'+esc(s.sessionId)+'</strong><small>'+esc(when)+' · '+esc(s.source||"Direto")+'</small></div><div><b>'+esc(state)+'</b><small>Etapas: '+esc(steps)+'</small></div></div>';
  }).join("")||'<p class="muted">Ainda não há sessões de checkout registradas.</p>';
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
 $("#mPending").textContent=orders.filter(o=>["Aguardando QR Code","Aguardando pagamento"].includes(o.status)).length;
 $("#mBasic").textContent=paid.length;
 $("#fCreated").textContent=orders.length;$("#fInformed").textContent=informed.length;$("#fPaid").textContent=paid.length;
 $("#fConversion").textContent=(informed.length?Math.round(paid.length/(informed.length+paid.length)*100):0)+"%";
 $("#recentOrders").innerHTML=orders.slice(0,5).map(order=>orderRow(order)).join("")||'<p class="muted">Nenhum pedido ainda.</p>';
}

function kitLabel(o){return esc((o.items||[]).map(i=>(i.qty||1)+"× "+i.name).join(", ")||o.plan||"Kit")}
function orderPaymentTools(o){
 const pending=o.status==="Aguardando QR Code",released=o.status==="Aguardando pagamento";
 if(!pending&&!released)return "";
 const id=esc(o.id),payload=pending?String(o.pixPayloadDraft||""):String(o.pixPayload||"");
 const receiver=pending?String(o.pixDraftReceiverName||""):String(o.paymentReceiverName||"");
 const expiry=o.expiresAt?new Date(o.expiresAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):"";
 const input=pending
  ?'<label class="pix-paste-label">Pix copia e cola<textarea data-pix-input="'+id+'" rows="3" maxlength="2048" placeholder="Cole aqui o Pix copia e cola gerado no aplicativo do seu banco">'+esc(payload)+'</textarea></label>'
  :'<label class="pix-paste-label">Pix copia e cola<textarea readonly rows="3">'+esc(payload)+'</textarea></label>';
 const statusText=pending?(payload?"Código validado. Confira o QR Code e o valor antes de liberar.":"Cole o código do banco. Vamos validar o CRC e o valor do pedido."):"Cobrança liberada para o cliente"+(expiry?" · expira às "+expiry:"");
 const actions=pending
  ?'<div class="pix-admin-actions"><button type="button" class="pay" data-prepare-pix-id="'+id+'">Validar e gerar QR Code</button>'+(payload?'<button type="button" data-copy-pix-id="'+id+'">Copiar Pix</button><button type="button" class="pay" data-release-pix-id="'+id+'">Confirmar e liberar para o cliente</button>':'')+'</div>'
  :'<div class="pix-admin-actions"><button type="button" data-copy-pix-id="'+id+'">Copiar Pix</button></div>';
 return '<section class="order-payment-tools" data-payment-order="'+id+'">'+
  '<div class="order-payment-head"><div><small>PAGAMENTO MANUAL</small><strong>'+(pending?"Preparar Pix deste pedido":"Pix liberado para o cliente")+'</strong></div><span>'+money(o.total)+'</span></div>'+
  input+
  '<p class="pix-admin-feedback" data-pix-message="'+id+'" role="status">'+esc(statusText)+(receiver?" · Recebedor: "+esc(receiver):"")+'</p>'+
  '<div class="pix-admin-preview"><div class="pix-admin-qr" data-pix-qr="'+id+'">'+(payload?"":"O QR Code aparecerá aqui após a validação")+'</div><small>Confira o QR Code, o recebedor e o valor antes de liberar</small></div>'+
  actions+
 '</section>';
}
function orderRow(o,withPaymentTools=false){
 const id=esc(o.id),status=esc(o.status||"—"),contact=String(o.phone||"").replace(/\D/g,"");
 const address=[o.address,o.number,o.complement,o.neighborhood,o.city,o.state].filter(Boolean).join(", ");
 const details='<details class="order-detail"><summary>Ver dados completos do pedido</summary>'+
 '<div class="order-detail-grid">'+
 '<div><small>CLIENTE</small><strong>'+esc(o.customerName||"—")+'</strong></div>'+
 '<div><small>WHATSAPP</small><strong>'+esc(o.phone||"—")+'</strong></div>'+
 '<div><small>CPF</small><strong>'+esc(o.cpf||"—")+'</strong></div>'+
 '<div><small>ENDEREÇO DE ENTREGA</small><p>'+esc(address||"—")+'</p></div>'+
 '<div><small>CEP</small><strong>'+esc(o.cep||"—")+'</strong></div>'+
 '<div><small>ITENS</small><p>'+esc((o.items||[]).map(i=>(i.qty||1)+"× "+i.name+" — "+money(i.unitPrice)).join(" • "))+'</p></div>'+
 '<div><small>PRODUTOS</small><strong>'+money(o.subtotal??o.total)+'</strong></div>'+
 '<div><small>FRETE</small><strong>GRÁTIS</strong></div>'+
 '<div><small>VALOR TOTAL</small><strong>'+money(o.total)+'</strong></div>'+
 '<div><small>PIX</small><strong>'+esc(o.pixPayload?"QR Pix liberado":o.pixPayloadDraft?"QR Pix validado · aguardando liberação":"Aguardando Pix manual")+'</strong></div>'+
 '</div></details>';
 const payment=withPaymentTools?orderPaymentTools(o):"";
 return '<article class="order-row"><div class="order-top"><div><b>'+id+'</b><small>'+new Date(o.createdAt).toLocaleString("pt-BR")+'</small></div><span class="status '+statusClass(o.status)+'">'+status+'</span></div>'+
 '<div class="order-meta"><div><small>CLIENTE</small><strong>'+esc(o.customerName||"—")+'</strong></div><div><small>PRODUTO</small><strong>'+kitLabel(o)+'</strong></div><div><small>TOTAL · FRETE GRÁTIS</small><strong>'+money(o.total)+'</strong></div></div>'+
 details+payment+'<div class="order-actions">'+
 (o.status==="Pagamento informado"?'<button type="button" class="pay" data-status-id="'+id+'" data-status="Pago">Confirmar pagamento</button>':'')+
 (o.status==="Pago"?'<button type="button" data-status-id="'+id+'" data-status="Produção">Iniciar produção</button>':'')+
 (o.status==="Produção"?'<button type="button" data-status-id="'+id+'" data-status="Enviado">Marcar como enviado</button>':'')+
 (o.status==="Enviado"?'<button type="button" data-status-id="'+id+'" data-status="Concluído">Concluir pedido</button>':'')+
 (!["Concluído","Cancelado"].includes(o.status)?'<button type="button" data-status-id="'+id+'" data-status="Cancelado">Cancelar pedido</button>':'')+
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
function renderOrderPixPreviews(){
 $$("[data-pix-qr]").forEach(box=>{
  const id=box.dataset.pixQr,order=getOrders().find(item=>item.id===id);
  const payload=order?.status==="Aguardando pagamento"?order.pixPayload:order?.pixPayloadDraft;
  box.replaceChildren();
  if(!payload){box.textContent="O QR Code aparecerá aqui após a validação";return}
  try{
   if(typeof QRCode==="undefined")throw Error("QR indisponível");
   new QRCode(box,{text:payload,width:160,height:160,colorDark:"#173b2d",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.M});
  }catch{box.textContent="Não foi possível desenhar o QR Code neste navegador. Confira o Pix copia e cola."}
 });
}
function bindOrderPixTools(){
 renderOrderPixPreviews();
 $$("[data-pix-input]").forEach(input=>input.addEventListener("input",()=>{
  const id=input.dataset.pixInput,order=getOrders().find(item=>item.id===id);
  const release=document.querySelector('[data-release-pix-id="'+id+'"]'),message=document.querySelector('[data-pix-message="'+id+'"]');
  const unchanged=!!order?.pixPayloadDraft&&input.value.trim()===String(order.pixPayloadDraft);
  if(release)release.disabled=!unchanged;
  if(message)message.textContent=unchanged?"Código validado. Confira o QR Code e o valor antes de liberar.":"Código alterado. Clique em Validar e gerar QR Code novamente.";
 }));
 $$("[data-prepare-pix-id]").forEach(button=>button.addEventListener("click",async()=>{
  const id=button.dataset.preparePixId,input=document.querySelector('[data-pix-input="'+button.dataset.preparePixId+'"]'),message=document.querySelector('[data-pix-message="'+button.dataset.preparePixId+'"]');
  const pixPayload=input?.value.trim()||"";
  if(!pixPayload){if(message)message.textContent="Cole o Pix copia e cola antes de continuar.";return}
  button.disabled=true;button.textContent="Validando código...";
  try{
   const result=await api("orders",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,action:"prepare-pix",pixPayload})});
   await loadServer();
   const feedback=document.querySelector('[data-pix-message="'+id+'"]');
   if(feedback)feedback.textContent="Pix validado"+(result.validation.dynamic?" · cobrança dinâmica ativa":"")+" · "+money(result.validation.amount)+(result.validation.receiverName?" · Recebedor: "+result.validation.receiverName:"")+". Confira o QR antes de liberar.";
  }catch(error){
   if(message)message.textContent=error.message;
   button.disabled=false;button.textContent="Validar e gerar QR Code";
  }
 }));
 $$("[data-release-pix-id]").forEach(button=>button.addEventListener("click",async()=>{
  const id=button.dataset.releasePixId,order=getOrders().find(item=>item.id===id);
  if(!order?.pixPayloadDraft){alert("Valide e gere o QR Code antes de liberar.");return}
  if(!confirm("Você conferiu o QR Code e o valor de "+money(order.total)+"? Confirmar e liberar para o cliente por 4 minutos?"))return;
  button.disabled=true;button.textContent="Liberando para o cliente...";
  try{
   await api("orders",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,action:"release-pix"})});
   await loadServer();
   const feedback=document.querySelector('[data-pix-message="'+id+'"]');
   if(feedback)feedback.textContent="Pix liberado para o cliente. O prazo de pagamento é de 4 minutos.";
  }catch(error){button.disabled=false;button.textContent="Confirmar e liberar para o cliente";alert("Não foi possível liberar o Pix: "+error.message)}
 }));
 $$("[data-copy-pix-id]").forEach(button=>button.addEventListener("click",async()=>{
  const id=button.dataset.copyPixId,order=getOrders().find(item=>item.id===id);
  const payload=order?.status==="Aguardando pagamento"?order.pixPayload:order?.pixPayloadDraft;
  const message=document.querySelector('[data-pix-message="'+id+'"]');
  if(!payload)return;
  try{await navigator.clipboard.writeText(payload);if(message)message.textContent="Pix copia e cola copiado."}
  catch{const input=document.querySelector('[data-pix-input="'+id+'"]');if(input){input.focus();input.select();if(message)message.textContent="Selecione e copie o código manualmente."}}
 }));
}

function renderOrders(){
 const q=$("#orderSearch").value.trim().toLowerCase(),filter=$("#orderFilter").value;
 const orders=getOrders().filter(o=>{
  const hay=[o.id,o.customerName,o.phone,o.childName,kitLabel(o)].join(" ").toLowerCase();
  return (!q||hay.includes(q))&&(filter==="all"||o.status===filter);
 });
 $("#ordersList").innerHTML=orders.map(order=>orderRow(order,true)).join("")||'<p class="muted">Nenhum pedido encontrado.</p>';bindStatus();bindOrderPixTools();
}
$("#orderSearch").addEventListener("input",renderOrders);$("#orderFilter").addEventListener("change",renderOrders);

const productDefaults=(window.STORE_DATA?.products||[]).map(p=>({...p,benefits:[...p.benefits]}));
function loadProducts(){
 const products=productDefaults.map(d=>({...d,price:Number(serverSettings.products?.find(p=>p.id===d.id)?.price)||d.price,image:serverSettings.products?.find(p=>p.id===d.id)?.image||d.image}));
 $("#productEditors").innerHTML=products.map(p=>`
 <div class="product-editor" data-product-id="${esc(p.id)}">
  <div class="product-editor-photo"><img src="${esc(p.image)}" alt="Imagem da Lareira Feliz" loading="lazy"></div>
  <div class="product-editor-fields">
    <h3>Lareira Feliz · produto único</h3>
    <label>Nome<input data-field="name" maxlength="45" value="${esc(p.name)}"></label>
    <label>Descrição<textarea data-field="prop" maxlength="350" rows="3">${esc(p.prop)}</textarea></label>
    <label>Preço (R$)<input data-field="price" type="number" min="1" max="10000" step=".01" value="${Number(p.price)}"></label>
    <label>Endereço da foto<input data-field="image" value="${esc(p.image)}" placeholder="assets/product/foto.webp ou https://..."></label>
    <label>Itens incluídos (um por linha)<textarea data-field="benefits" rows="6">${esc(p.benefits.join("\n"))}</textarea></label>
    <label class="toggle-product"><input type="checkbox" data-field="active" ${p.active!==false?"checked":""}> Lareira Feliz disponível para compra</label>
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
   serverSettings.products=products;$("#productsMsg").textContent="Produto salvo no banco. Os detalhes serão utilizados no catálogo da Lareira Feliz."}
 catch(e){$("#productsMsg").textContent="Não foi possível salvar: "+e.message}
 finally{button.disabled=false}
});
const marketingDefaults={metaPixel:"",ga4:"",tiktokPixel:"",googleAds:""};
function loadMarketing(){
 const c={...marketingDefaults,...(serverSettings.marketing||{})};
 Object.keys(marketingDefaults).forEach(k=>{const el=$("#"+k);if(el)el.value=c[k]||""});
 updateUtm();
}
function marketingValidation(x){
 if(x.metaPixel&&!/^\d{7,25}$/.test(x.metaPixel))return "Meta Pixel: informe apenas o ID numérico.";
 if(x.ga4&&!/^G-[A-Z0-9]{5,20}$/i.test(x.ga4))return "GA4: use o formato G-XXXXXXXX.";
 if(x.googleAds&&!/^AW-\d{7,20}$/i.test(x.googleAds))return "Google Ads: use o formato AW-123456789.";
 if(x.tiktokPixel&&!/^[A-Za-z0-9]{8,45}$/.test(x.tiktokPixel))return "TikTok: confira o ID do pixel.";
 return "";
}
$("#saveMarketing").onclick=async()=>{
 const out={};Object.keys(marketingDefaults).forEach(k=>out[k]=$("#"+k).value.trim());
 const msg=$("#marketingMsg"),error=marketingValidation(out),button=$("#saveMarketing");
 if(error){msg.textContent=error;msg.dataset.state="error";return}
 button.disabled=true;button.textContent="Salvando...";
 try{
  await api("settings",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({key:"marketing",value:out})});
  const fresh=await api("settings");const saved=fresh.settings?.marketing;
  if(!saved||Object.keys(out).some(k=>(saved[k]||"")!==out[k]))throw Error("A gravação ainda não foi confirmada.");
  serverSettings.marketing=saved;msg.dataset.state="success";msg.textContent="IDs salvos e conferidos. Conexões externas ainda dependem de validação técnica.";
 }catch(e){msg.dataset.state="error";msg.textContent=e.message}
 finally{button.disabled=false;button.textContent="Salvar IDs de integração"}
};
function updateUtm(){
 const base=location.origin+"/";
 const dest=$("#utmDestination")?.value||"basic";
 const url=new URL(dest==="home"?"":("checkout.html?kit="+encodeURIComponent(dest)),base);
 for(const [k,id] of [["utm_source","utmSource"],["utm_medium","utmMedium"],["utm_campaign","utmCampaign"],["utm_content","utmContent"]]){
  const value=($("#"+id)?.value||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9_-]+/g,"_").slice(0,65);
  if(value)url.searchParams.set(k,value);
 }
 if($("#utmOutput"))$("#utmOutput").value=url.toString();
}
["utmDestination","utmSource","utmMedium","utmCampaign","utmContent"].forEach(id=>$("#"+id)?.addEventListener("input",updateUtm));
$("#copyUtm")?.addEventListener("click",async()=>{
 updateUtm();const value=$("#utmOutput").value;
 try{await navigator.clipboard.writeText(value);$("#utmMsg").textContent="Link copiado para o anúncio."}
 catch{$("#utmOutput").focus();$("#utmOutput").select();$("#utmMsg").textContent="Selecione e copie o link acima."}
});
async function loadAdsAnalytics(){
 const note=$("#adsAnalyticsNote");if(!note)return;
 note.textContent="Consultando eventos registrados nos últimos 30 dias...";
 try{
  const x=await api("analytics");
  $("#adsVisits").textContent=Number(x.visitors||0).toLocaleString("pt-BR");
  $("#adsCheckouts").textContent=Number(x.checkouts||0).toLocaleString("pt-BR");
  $("#adsOrders").textContent=Number(x.ordersCreated||0).toLocaleString("pt-BR");
  $("#adsNotices").textContent=Number(x.paymentNotices||0).toLocaleString("pt-BR");
  const rows=x.campaigns||[];
  $("#adsSourceRows").innerHTML=rows.length?rows.map(y=>"<tr><td>"+esc(y.source)+"</td><td>"+esc(y.campaign||"—")+"</td><td>"+esc(y.creative||"—")+"</td><td>"+Number(y.sessions||0).toLocaleString("pt-BR")+"</td><td>"+Number(y.orders||0).toLocaleString("pt-BR")+"</td></tr>").join(""):'<tr><td colspan="5">Sem dados registrados ainda.</td></tr>';
  note.textContent="Eventos internos observados nos últimos 30 dias. Não representam gastos, cliques ou conversões oficiais das plataformas.";
 }catch(e){note.textContent="Métricas indisponíveis: "+e.message}
}
$("#refreshMarketingAnalytics")?.addEventListener("click",loadAdsAnalytics);
const seoDefaults={title:"Lareira Feliz | Lareira Decorativa de Natal",description:"Conheça a Lareira Feliz, peça decorativa cenográfica em papelão kraft premium. 120 cm de altura, 80 cm de largura e 22 cm de profundidade.",image:"assets/lareira-feliz-real.webp"};
function loadSeo(){
 const c={...seoDefaults,...(serverSettings.seo||{})};
 $("#seoTitle").value=c.title;$("#seoDescription").value=c.description;$("#seoImage").value=c.image;
 renderSeoChecks(c);
}
function seoCurrent(){return {title:$("#seoTitle").value.trim(),description:$("#seoDescription").value.trim(),image:$("#seoImage").value.trim()}}
function renderSeoChecks(c){
 const titleLength=c.title.length,descLength=c.description.length;
 $("#seoTitleCount").textContent=titleLength+"/60";
 $("#seoDescriptionCount").textContent=descLength+"/160";
 $("#seoPreviewTitle").textContent=c.title||"Título da página";
 $("#seoPreviewDescription").textContent=c.description||"Descrição da loja";
 const validImage=/^(assets\/[a-z0-9/_-]+\.(?:webp|png|jpg|jpeg|avif)|https:\/\/[^\s"'<>]+)$/i.test(c.image)&&!c.image.includes("..");
 const checks=[
  ["Título entre 30 e 60 caracteres",titleLength>=30&&titleLength<=60],
  ["Descrição entre 120 e 160 caracteres",descLength>=120&&descLength<=160],
  ["Caminho da imagem válido",validImage],
  ["Página em HTTPS",location.protocol==="https:"],
  ["Prévia mobile configurada",!!document.querySelector('meta[name="viewport"]')]
 ];
 $("#seoChecks").innerHTML=checks.map(([t,ok])=>'<div class="seo-check"><span>'+t+'</span><b class="'+(ok?"ok":"warn")+'">'+(ok?"OK":"Revisar")+"</b></div>").join("");
}
["seoTitle","seoDescription","seoImage"].forEach(id=>$("#"+id)?.addEventListener("input",()=>renderSeoChecks(seoCurrent())));
$("#saveSeo").onclick=async()=>{
 const out=seoCurrent(),button=$("#saveSeo"),message=$("#seoMsg");
 if(out.title.length<30||out.description.length<120||out.image.includes("..")){message.textContent="Revise título, descrição e caminho da imagem antes de salvar.";return}
 button.disabled=true;button.textContent="Salvando...";
 try{
  await api("settings",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({key:"seo",value:out})});
  const fresh=await api("settings");const saved=fresh.settings?.seo;
  if(!saved||saved.title!==out.title||saved.description!==out.description||saved.image!==out.image)throw Error("Não foi possível confirmar a gravação.");
  serverSettings.seo=saved;renderSeoChecks(saved);message.textContent="Rascunho confirmado no servidor. Publicação no HTML continua separada.";
 }catch(e){message.textContent="Falha ao salvar: "+e.message}
 finally{button.disabled=false;button.textContent="Salvar rascunho de SEO"}
};

function loadCheckoutInfo(){
 const el=$("#checkoutFlowStatus");if(!el)return;
 el.textContent="Frete grátis ativo · Pix copia e cola conferido por pedido · liberação manual após sua aprovação.";
}

function renderAll(){metrics();renderOrders();renderLogistics();renderFinance();loadInventory();loadCheckoutInfo();loadProducts();bindStatus()}

function renderLogistics(){
 const orders=getOrders();
 const paid=orders.filter(o=>o.status==="Pago");
 const production=orders.filter(o=>o.status==="Produção");
 const shipped=orders.filter(o=>o.status==="Enviado");
 $("#logPaid").textContent=paid.length.toLocaleString("pt-BR");
 $("#logProduction").textContent=production.length.toLocaleString("pt-BR");
 $("#logShipped").textContent=shipped.length.toLocaleString("pt-BR");
 const active=orders.filter(o=>["Pago","Produção","Enviado"].includes(o.status));
 $("#logisticsList").innerHTML=active.map(order=>orderRow(order)).join("")||'<p class="muted">Nenhum pedido está aguardando produção ou envio.</p>';
 bindStatus();
}
function renderFinance(){
 const orders=getOrders();
 const paidStatuses=["Pago","Produção","Enviado","Concluído"];
 const paid=orders.filter(o=>paidStatuses.includes(o.status));
 const pending=orders.filter(o=>["Aguardando QR Code","Aguardando pagamento","Pagamento informado"].includes(o.status));
 const cancelled=orders.filter(o=>o.status==="Cancelado");
 const total=items=>items.reduce((sum,o)=>sum+(Number(o.total)||0),0);
 $("#financePaid").textContent=money(total(paid));
 $("#financePending").textContent=money(total(pending));
 $("#financeCancelled").textContent=money(total(cancelled));
 $("#financeCancelledCount").textContent=cancelled.length+" pedidos";
 const rows=[...orders].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
 $("#financeRows").innerHTML=rows.map(o=>'<tr><td>'+esc(o.id)+'</td><td>'+esc(new Date(o.createdAt).toLocaleDateString("pt-BR"))+'</td><td><span class="status '+statusClass(o.status)+'">'+esc(o.status)+'</span></td><td>'+money(o.total)+'</td></tr>').join("")||'<tr><td colspan="4">Nenhum pedido registrado.</td></tr>';
}
function loadInventory(){
 const value=serverSettings.inventory||{};
 $("#inventoryStock").value=value.stock===null||value.stock===undefined?"":String(value.stock);
 $("#inventoryMinimum").value=value.reorderPoint===null||value.reorderPoint===undefined?"":String(value.reorderPoint);
 $("#inventoryNotes").value=value.notes||"";
 const status=$("#inventoryStatus");
 if(value.stock===null||value.stock===undefined){
  status.textContent="Estoque não informado";status.dataset.state="neutral";
 }else if(Number(value.stock)===0){
  status.textContent="Sem estoque";status.dataset.state="danger";
 }else if(Number.isInteger(value.reorderPoint)&&Number(value.stock)<=Number(value.reorderPoint)){
  status.textContent="Abaixo do mínimo";status.dataset.state="warning";
 }else{
  status.textContent="Estoque atualizado";status.dataset.state="success";
 }
}
$("#saveInventory")?.addEventListener("click",async()=>{
 const stockRaw=$("#inventoryStock").value.trim();
 const minimumRaw=$("#inventoryMinimum").value.trim();
 const value={
  stock:stockRaw===""?null:Number(stockRaw),
  reorderPoint:minimumRaw===""?null:Number(minimumRaw),
  notes:$("#inventoryNotes").value.trim()
 };
 const validCount=n=>n===null||(Number.isInteger(n)&&n>=0&&n<=100000);
 const message=$("#inventoryMsg"),button=$("#saveInventory");
 if(!validCount(value.stock)||!validCount(value.reorderPoint)||value.notes.length>500){
  message.dataset.state="error";message.textContent="Informe quantidades inteiras entre 0 e 100.000.";return;
 }
 button.disabled=true;message.textContent="Salvando...";
 try{
  await api("settings",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({key:"inventory",value})});
  const fresh=await api("settings");
  if(!fresh.settings?.inventory)throw Error("Não foi possível confirmar o estoque.");
  serverSettings.inventory=fresh.settings.inventory;loadInventory();
  message.dataset.state="success";message.textContent="Estoque interno salvo e conferido.";
 }catch(e){message.dataset.state="error";message.textContent="Falha ao salvar: "+e.message}
 finally{button.disabled=false}
});
async function loadSystemStatus(){
 const db=$("#systemDb"),auth=$("#systemAuth"),pix=$("#systemPix"),note=$("#systemNote");
 if(!db||!auth||!pix||!note)return;
 note.textContent="Verificando banco, sessão e configuração Pix...";
 $("#systemHost").textContent=location.host;
 try{
  const [health,session]=await Promise.all([api("checkout-health"),api("auth")]);
  db.textContent=health.neon?.ok?"Conectado":"Indisponível";
  auth.textContent=session.authenticated?"Validado":"Protegido";
  pix.textContent=health.pix?.configured?(health.pix?.brCodeValid?"Validado":"Revisar"):"Pendente";
  $("#systemLastCheck").textContent=new Date().toLocaleString("pt-BR");
  note.textContent=health.neon?.ok?"Conexão com o Neon respondendo. O diagnóstico Pix não realiza pagamento.": "Banco indisponível no ambiente atual.";
 }catch(e){
  db.textContent="Indisponível";auth.textContent="Protegido";pix.textContent="Não verificado";
  $("#systemLastCheck").textContent=new Date().toLocaleString("pt-BR");
  note.textContent="Não foi possível concluir o diagnóstico: "+e.message;
 }
}
$("#refreshSystem")?.addEventListener("click",loadSystemStatus);
const dashboardDate=$("#dashboardDate");
if(dashboardDate)dashboardDate.textContent=new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"2-digit",month:"long"}).format(new Date());
const environmentBadge=$("#environmentBadge");
if(environmentBadge){
 const host=location.hostname;
 environmentBadge.textContent=host.endsWith("papainoelpassouaqui.com.br")||host==="papai-noel-site-v6.vercel.app"?"PRODUÇÃO":host.startsWith("papai-noel-site-v6-")&&host.endsWith(".vercel.app")?"PRÉVIA ISOLADA":"AMBIENTE PROTEGIDO";
}

})();