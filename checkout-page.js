(()=>{
const products=window.STORE_DATA?.products||[];
const money=v=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v)||0);
const cfg=()=>window.NatalPix?.getPixConfig?.()||{discount:15,shippingFlat:0,key:"",receiverName:"",displayName:"",city:"SAO PAULO"};
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
let step=1,currentOrderId=null;
const $=s=>document.querySelector(s);
const steps=[...document.querySelectorAll(".checkout-step")];
const child=$("#childName"),letter=$("#letterText"),previewName=$("#previewName"),previewLetter=$("#previewLetter"),count=$("#letterCount");
const next=$("#checkoutNext"),back=$("#checkoutBack"),progress=$("#checkoutProgress");

function total(){return expanded.reduce((s,i)=>s+discounted(i.product.price)*i.qty,0)+(Number(cfg().shippingFlat)||0)}
function updatePreview(){
 const n=child.value.trim()||"Miguel";
 previewName.textContent="Querido "+n+",";
 previewLetter.textContent=letter.value.trim()||"Você foi muito especial este ano! Continue sendo essa pessoa incrível, cheia de alegria e um grande coração. Nos vemos no próximo Natal!";
 count.textContent=letter.value.length;
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
 next.textContent=step===3?"Gerar meu Pix":"Continuar";
 if(step===3)renderReview();
 window.scrollTo({top:0,behavior:"smooth"});
}
function validate(){
 let ok=true;
 const active=$('.checkout-step[data-step="'+step+'"]');
 active.querySelectorAll("[required]").forEach(el=>{
  if(el.hidden||el.closest("[hidden]"))return;
  if(!el.value.trim()){el.setAttribute("aria-invalid","true");ok=false}else el.removeAttribute("aria-invalid");
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
function createOrder(){
 const c=cfg();
 if(!c.key||!c.receiverName){alert("O Pix ainda não foi configurado.");return null}
 const id="NATAL-"+Date.now().toString().slice(-7),txid=id.replace(/[^A-Za-z0-9]/g,"").slice(0,25);
 const payload=window.NatalPix.buildPixPayload({key:c.key,receiverName:c.receiverName,city:c.city,amount:total(),txid});
 const order={id,txid,pixPayload:payload,createdAt:new Date().toISOString(),status:"Aguardando pagamento",
 items:expanded.map(i=>({id:i.product.id,name:i.product.name,qty:i.qty,unitPrice:i.product.price,pixUnit:discounted(i.product.price)})),
 total:total(),discountPercent:Number(c.discount)||0,shipping:Number(c.shippingFlat)||0,
 childName:personalized?child.value.trim():"",letter:personalized?letter.value.trim():"",
 customerName:$("#customerName").value.trim(),phone:$("#phone").value.trim(),cep:$("#cep").value.trim(),address:$("#address").value.trim(),number:$("#number").value.trim(),complement:$("#complement").value.trim()};
 const all=orders();all.unshift(order);saveOrders(all);
 if(pending.fromCart)localStorage.setItem("natal_cart","[]");
 trackStoreEvent("order_created",{order_id:id,total:order.total,product_id:primaryProduct.id});
 return order;
}
function showPayment(order){
 currentOrderId=order.id;
 document.querySelector(".checkout-page-main").hidden=true;
 $("#paymentScene").hidden=false;
 $("#pixOrderId").textContent=order.id;$("#pixOrderTotal").textContent=money(order.total);
 $("#pixReceiverLabel").textContent=cfg().displayName||cfg().receiverName||"Recebedor Pix";
 $("#pixChildName").textContent=order.childName||order.customerName||"Seu pedido";
 $("#pixMagicMessage").textContent=order.childName?("A surpresa de "+order.childName+" já está quase a caminho."):"Seu pedido já está quase a caminho.";
 $("#pixCopyPaste").value=order.pixPayload;
 const canvas=$("#pixQrCanvas");canvas.innerHTML="";
 if(window.QRCode)new window.QRCode(canvas,{text:order.pixPayload,width:280,height:280,colorDark:"#111111",colorLight:"#ffffff",correctLevel:window.QRCode.CorrectLevel.M});
 window.scrollTo({top:0,behavior:"smooth"});
}
child.addEventListener("input",updatePreview);letter.addEventListener("input",updatePreview);
next.addEventListener("click",()=>{if(!validate())return;if(step<3){step++;renderStep();return}const o=createOrder();if(o)showPayment(o)});
back.addEventListener("click",()=>{if(step>1){step--;renderStep()}});
$("#findCep").addEventListener("click",async()=>{
 const raw=$("#cep").value.replace(/\D/g,"");if(raw.length!==8)return alert("Digite um CEP válido.");
 const b=$("#findCep"),label=b.querySelector("span:last-child");b.disabled=true;if(label)label.textContent="Buscando...";
 try{const r=await fetch("https://viacep.com.br/ws/"+raw+"/json/");const d=await r.json();if(d.erro)throw 0;
 const value=[d.logradouro,d.bairro,d.localidade,d.uf].filter(Boolean).join(" • ");
 $("#address").value=value;$("#addressFoundText").textContent=value;$("#addressResult").hidden=false;
 b.classList.add("is-found");if(label)label.textContent="Endereço encontrado";$("#number").focus()}
 catch{b.classList.remove("is-found");if(label)label.textContent="Buscar endereço";alert("Não foi possível consultar o CEP agora.")}
 finally{b.disabled=false;if(!b.classList.contains("is-found")&&label)label.textContent="Buscar endereço"}
});
$("#copyPix").addEventListener("click",async()=>{try{await navigator.clipboard.writeText($("#pixCopyPaste").value)}catch{$("#pixCopyPaste").select();document.execCommand("copy")}$("#pixCopyFeedback").textContent="Código Pix copiado ✓"});
$("#pixPaidButton").addEventListener("click",()=>{
 const all=orders(),o=all.find(x=>x.id===currentOrderId);if(o){o.status="Pagamento informado";o.paymentInformedAt=new Date().toISOString();saveOrders(all);
 $("#trackOrderLink").href="pedido.html?id="+encodeURIComponent(o.id);$("#trackOrderLink").hidden=false;}
 trackStoreEvent("payment_informed",{order_id:currentOrderId,total:o?.total||0});
 $("#pixPaidButton").disabled=true;$("#pixPaidButton").innerHTML="<span>Pagamento registrado ✓</span>";$("#pixPaidButton").classList.add("is-informed");$("#paymentCelebrationMessage").hidden=false;
});
syncMode();updatePreview();renderStep();
})();