(()=>{
const products=window.STORE_DATA?.products||[];
const money=v=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v)||0);
let publicPixConfig=null;
const cfg=()=>publicPixConfig||{discount:15,shippingFlat:0,enabled:false};
const discounted=v=>Math.round(v*(1-(Number(cfg().discount)||0)/100)*100)/100;
const pending=JSON.parse(localStorage.getItem("natal_checkout_pending")||"null");
if(!pending?.items?.length){location.href="index.html#kits";return}
const expanded=pending.items.map(i=>({product:products.find(p=>p.id===i.id),qty:Math.max(1,Number(i.qty)||1)})).filter(i=>i.product);
if(!expanded.length){location.href="index.html#kits";return}
const personalized=expanded.some(i=>i.product.id==="personal");
const primaryItem=expanded.find(i=>i.product.id==="personal")||expanded[0];
const primaryProduct=primaryItem.product;
const trackStoreEvent=(name,data={})=>{try{const events=JSON.parse(localStorage.getItem("natal_events")||"[]");events.push({name,at:new Date().toISOString(),path:location.pathname,...data});localStorage.setItem("natal_events",JSON.stringify(events.slice(-600)))}catch{}};
trackStoreEvent("checkout_view",{product_id:primaryProduct.id});
let step=1,currentOrderId=null,currentClaim=null,currentReceiver="";
const $=s=>document.querySelector(s);
const steps=[...document.querySelectorAll(".checkout-step")];
const child=$("#childName"),letter=$("#letterText"),previewName=$("#previewName"),previewLetter=$("#previewLetter"),count=$("#letterCount");
const next=$("#checkoutNext"),back=$("#checkoutBack"),progress=$("#checkoutProgress");
const letterExpand=$("#letterExpand");
letterExpand?.addEventListener("click",()=>{const expanded=letterExpand.getAttribute("aria-expanded")==="true";letterExpand.setAttribute("aria-expanded",String(!expanded));$("#letterPreviewWrap").classList.toggle("is-expanded",!expanded);letterExpand.querySelector(".letter-expand-label").textContent=expanded?"Ampliar carta":"Reduzir carta";});
function updatePriceDisplay(){const amount=money(total());$("#stepOneKitPrice").textContent=amount;$("#checkoutFooterTotal").textContent=amount;$("#checkoutFooterPrice").hidden=step===3;}

function total(){return expanded.reduce((s,i)=>s+discounted(i.product.price)*i.qty,0)+(Number(cfg().shippingFlat)||0)}
function updatePreview(){
 const n=child.value.trim()||"Miguel";
 previewName.textContent="Querido "+n+",";
 previewLetter.textContent=letter.value.trim()||"Você foi muito especial este ano! Continue sendo essa pessoa incrível, cheia de alegria e um grande coração. Nos vemos no próximo Natal!";
 count.textContent=letter.value.length;
 if(letterExpand?.getAttribute("aria-expanded")==="true")$("#letterPreviewPaper").scrollIntoView({block:"nearest",behavior:"instant"});
 previewName.classList.remove("is-writing");void previewName.offsetWidth;previewName.classList.add("is-writing");
}
function syncMode(){
 $("#stepOneKitImage").src=primaryProduct.image;
 $("#stepOneKitImage").alt="Kit "+primaryProduct.name+" completo";
 $("#stepOneKitTitle").textContent="Kit "+primaryProduct.name;
 $("#stepOneKitShort").textContent=primaryProduct.prop;
 const personalizationLayout=$("#personalizationLayout");
 const basicSummary=$("#basicCheckoutSummary");
 child.required=personalized;
 if(personalizationLayout)personalizationLayout.hidden=!personalized;
 if(basicSummary)basicSummary.hidden=personalized;

 const kick=$('.checkout-step[data-step="1"] .checkout-step-kicker');
 const h=$('.checkout-step[data-step="1"] h1');
 const p=$('.checkout-step[data-step="1"] .checkout-step-title p');
 const stepOneLabel=document.querySelector('[data-progress-step="1"] b');

 if(personalized){
   if(kick)kick.textContent="PASSO 1 • PERSONALIZAÇÃO";
   if(h)h.textContent="Veja a carta antes de concluir.";
   if(p)p.textContent="Preencha e acompanhe a prévia. Você pode revisar tudo antes de continuar.";
   if(stepOneLabel)stepOneLabel.textContent="Personalizar";
 }else{
   if(kick)kick.textContent="PASSO 1 • SEU KIT";
   if(h)h.textContent="Seu Kit Essencial já vem pronto.";
   if(p)p.textContent="Confira rapidamente o que você vai receber antes de seguir para a entrega.";
   if(stepOneLabel)stepOneLabel.textContent="Conferir kit";
   $("#basicSummaryTitle").textContent="Kit "+primaryProduct.name;
   $("#basicSummaryText").textContent=primaryProduct.prop;
   $("#basicSummaryList").innerHTML=(primaryProduct.benefits||[]).map(x=>'<span><i>✓</i>'+x+'</span>').join("");
 }
}
function renderStep(){
 steps.forEach(el=>el.classList.toggle("active",Number(el.dataset.step)===step));
 document.querySelectorAll("[data-progress-step]").forEach(el=>{
   const n=Number(el.dataset.progressStep);
   el.classList.toggle("is-active",n===step);el.classList.toggle("is-done",n<step);
 });
 progress.style.width=(step/3*100)+"%";
 document.body.dataset.checkoutStep=String(step);
 back.hidden=step===1;
 next.textContent=step===3?"Gerar meu Pix":step===1?"Continuar para entrega":"Conferir minha surpresa";
 const titles=["Vamos preparar a surpresa?","Para onde vai essa magia?","Tudo pronto para emocionar."];
 const descriptions=["Os detalhes que tornam esse Natal único.","O endereço aparece sozinho ao digitar o CEP.","Confira a surpresa antes de finalizar."];
 $("#checkoutMomentTitle").textContent=titles[step-1];
 $("#checkoutMomentText").textContent=descriptions[step-1];
 if(step===3)renderReview();
 updatePriceDisplay();
 window.scrollTo({top:0,behavior:"smooth"});
}
function validate(){
 if(step===2&&(!$("#address").value||$("#addressResult").hidden||confirmedCep!==cepInput.value.replace(/\\D/g,""))){setCepStatus("Informe um CEP válido e aguarde o endereço aparecer.","error");$("#cep").focus();return false}
 let ok=true;
 const active=$('.checkout-step[data-step="'+step+'"]');
 active.querySelectorAll("[required]").forEach(el=>{
  if(el.hidden||el.closest("[hidden]"))return;
  if(!el.value.trim()||!el.checkValidity()){el.setAttribute("aria-invalid","true");if(ok){el.focus();el.reportValidity()}ok=false}else el.removeAttribute("aria-invalid");
 });
 return ok;
}
function renderReview(){
 $("#reviewKitImage").src=primaryProduct.image;
 $("#reviewKitImage").alt="Kit "+primaryProduct.name+" completo";
 $("#reviewKitTitle").textContent="Kit "+primaryProduct.name;
 $("#reviewKitProp").textContent=primaryProduct.prop;
 $("#reviewKitItems").innerHTML=(primaryProduct.benefits||[]).map(x=>'<span><i>✓</i>'+x+'</span>').join("");

 const personLabel=$("#reviewPersonLabel");
 if(personalized){
   personLabel.textContent="A CARTA SERÁ PREPARADA PARA";
   $("#reviewChildName").textContent=child.value.trim()||"—";
   $("#reviewMessage").textContent=letter.value.trim()||"Mensagem padrão do Papai Noel";
 }else{
   personLabel.textContent="SEU PEDIDO";
   $("#reviewChildName").textContent="Kit "+primaryProduct.name;
   $("#reviewMessage").textContent="Kit pronto para montar a surpresa em casa.";
 }

 $("#reviewAddress").textContent=[$("#address").value,$("#number").value,$("#complement").value].filter(Boolean).join(", ")||"—";
 $("#reviewCustomer").textContent=[$("#customerName").value,$("#phone").value].filter(Boolean).join(" • ")||"—";
 $("#reviewTotal").textContent=money(total());
}
function orders(){return JSON.parse(localStorage.getItem("natal_orders")||"[]")}
function saveOrders(v){localStorage.setItem("natal_orders",JSON.stringify(v))}
async function createOrder(){
 const request={
  items:expanded.map(i=>({id:i.product.id,qty:i.qty})),
  childName:personalized?child.value.trim():"",
  letter:personalized?letter.value.trim():"",
  customerName:$("#customerName").value.trim(),phone:$("#phone").value.trim(),
  cep:$("#cep").value.trim(),address:$("#address").value.trim(),
  number:$("#number").value.trim(),complement:$("#complement").value.trim()
 };
 const response=await fetch("/api/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(request)});
 const data=await response.json();
 if(!response.ok)throw Error(data.error||"Não foi possível iniciar o pagamento");
 currentClaim=data.claim;
 currentReceiver=data.receiverName;
 const order={...request,id:data.id,total:data.total,pixPayload:data.pixPayload,discountPercent:data.discountPercent};
 if(pending.fromCart)localStorage.setItem("natal_cart","[]");
 trackStoreEvent("order_created",{order_id:order.id,total:order.total,product_id:primaryProduct.id});
 return order;
}
function showPayment(order){
 currentOrderId=order.id;
 document.querySelector(".checkout-page-main").hidden=true;
 $("#paymentScene").hidden=false;
 $("#pixOrderId").textContent=order.id;$("#pixOrderTotal").textContent=money(order.total);
 $("#pixReceiverLabel").textContent=currentReceiver||"Recebedor Pix";
 $("#pixChildName").textContent=order.childName||order.customerName||"Seu pedido";
 $("#pixMagicMessage").textContent=order.childName?("A surpresa de "+order.childName+" já está quase a caminho."):"Seu pedido já está quase a caminho.";
 $("#pixCopyPaste").value=order.pixPayload;
 const canvas=$("#pixQrCanvas");canvas.innerHTML="";
 if(window.QRCode)new window.QRCode(canvas,{text:order.pixPayload,width:280,height:280,colorDark:"#111111",colorLight:"#ffffff",correctLevel:window.QRCode.CorrectLevel.M});
 window.scrollTo({top:0,behavior:"smooth"});
}
child.addEventListener("input",updatePreview);letter.addEventListener("input",updatePreview);
next.addEventListener("click",async()=>{
 if(!validate())return;
 if(step<3){step++;renderStep();return}
 next.disabled=true;const label=next.textContent;next.textContent="Preparando seu Pix...";
 try{const order=await createOrder();showPayment(order)}
 catch(e){alert(e.message)}
 finally{next.disabled=false;next.textContent=label}
});
back.addEventListener("click",()=>{if(step>1){step--;renderStep()}});
const cepInput=$("#cep"),cepStatus=$("#cepStatus");
let cepTimer=null,cepRequest=null,confirmedCep="";
function setCepStatus(message,state="idle"){
 cepStatus.textContent=message;cepStatus.dataset.state=state;
 cepInput.setAttribute("aria-invalid",state==="error"?"true":"false");
}
function clearCepResult(){
 confirmedCep="";
 $("#address").value="";$("#addressFoundText").textContent="";
 $("#addressResult").hidden=true;
}
async function lookupCep(raw){
 if(cepRequest)cepRequest.abort();
 cepRequest=new AbortController();
 const controller=cepRequest;
 setCepStatus("Localizando o endereço…","loading");
 try{
  const response=await fetch("https://viacep.com.br/ws/"+raw+"/json/",{signal:controller.signal,cache:"no-store"});
  if(!response.ok)throw Error("NETWORK");
  const data=await response.json();
  if(data.erro)throw Error("NOT_FOUND");
  if(raw!==cepInput.value.replace(/\\D/g,""))return;
  const address=[data.logradouro,data.bairro,data.localidade,data.uf].filter(Boolean).join(" • ");
  if(!data.localidade||!data.uf||!address)throw Error("INCOMPLETE");
  $("#address").value=address;$("#addressFoundText").textContent=address;
  $("#addressResult").hidden=false;confirmedCep=raw;
  setCepStatus("Endereço encontrado. Complete apenas o número e o complemento.","success");
 }catch(error){
  if(error.name==="AbortError"||raw!==cepInput.value.replace(/\\D/g,""))return;
  clearCepResult();
  setCepStatus(error.message==="NOT_FOUND"?"CEP não encontrado. Confira os números.":"Não conseguimos consultar esse CEP. Corrija ou tente novamente.","error");
 }finally{if(cepRequest===controller)cepRequest=null}
}
function handleCepInput(){
 const raw=cepInput.value.replace(/\\D/g,"").slice(0,8);
 cepInput.value=raw.length>5?raw.slice(0,5)+"-"+raw.slice(5):raw;
 clearTimeout(cepTimer);
 if(cepRequest){cepRequest.abort();cepRequest=null}
 if(raw!==confirmedCep)clearCepResult();
 if(raw.length===8){
  setCepStatus("Consultando seu CEP automaticamente…","loading");
  cepTimer=setTimeout(()=>lookupCep(raw),280);
 }else setCepStatus(raw.length?"Continue digitando o CEP.":"", "idle");
}
cepInput.addEventListener("input",handleCepInput);
cepInput.addEventListener("change",()=>{
 const raw=cepInput.value.replace(/\\D/g,"");
 if(raw.length===8&&confirmedCep!==raw){clearTimeout(cepTimer);lookupCep(raw)}
});
if(cepInput.value)handleCepInput();
$("#copyPix").addEventListener("click",async()=>{try{await navigator.clipboard.writeText($("#pixCopyPaste").value)}catch{$("#pixCopyPaste").select();document.execCommand("copy")}$("#pixCopyFeedback").textContent="Código Pix copiado ✓"});
$("#pixPaidButton").addEventListener("click",async()=>{
 const b=$("#pixPaidButton");b.disabled=true;
 try{
  const response=await fetch("/api/payment-informed",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:currentOrderId,claim:currentClaim})});
  const data=await response.json();if(!response.ok)throw Error(data.error||"Não foi possível registrar");
  trackStoreEvent("payment_informed",{order_id:currentOrderId});
  b.innerHTML="<span>Pagamento informado ✓</span>";b.classList.add("is-informed");
  $("#paymentCelebrationMessage").hidden=false;
 }catch(e){b.disabled=false;alert(e.message)}
});
fetch("/api/checkout-config",{cache:"no-store"}).then(async r=>{
 const data=await r.json();if(!r.ok)throw Error(data.error||"Configuração indisponível");
 publicPixConfig=data;
 if(step===3)renderReview();updatePriceDisplay();
}).catch(()=>{publicPixConfig={enabled:false,discount:15,shippingFlat:0}});
syncMode();updatePreview();renderStep();updatePriceDisplay();
fetch("/api/products",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(data=>{
 if(!data||!Array.isArray(data.products))return;
 for(const product of products){const latest=data.products.find(p=>p.id===product.id);if(latest)Object.assign(product,latest)}
 if(!primaryProduct.active){alert("Este kit está temporariamente indisponível.");location.href="index.html#kits";return}
 syncMode();updatePriceDisplay();if(step===3)renderReview();
}).catch(()=>{});

})();