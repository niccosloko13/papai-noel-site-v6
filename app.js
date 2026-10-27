const DEFAULT_PRODUCTS=[
  {id:"basic",name:"Básico",price:39.90,prop:"Para criar a surpresa essencial.",benefits:["10 pegadas adesivas","Adesivo para janela","Guia rápido de aplicação"],image:"assets/visuals/kit-basico.svg",active:true},
  {id:"personal",name:"Personalizado",price:69.90,prop:"A experiência que faz a visita parecer real.",benefits:["20 pegadas adesivas","Adesivo para janela","Placa com nome da criança","Certificado personalizado"],image:"assets/visuals/kit-personalizado.svg",badge:"Mais escolhido",active:true},
  {id:"premium",name:"Premium",price:99.90,prop:"A experiência completa para presentear.",benefits:["30 pegadas adesivas","Adesivo para janela","Placa personalizada","Certificado oficial","Guia mágico","Embalagem especial"],image:"assets/visuals/kit-premium.svg",active:true}
];
const getProducts=()=>JSON.parse(localStorage.getItem("natal_products")||"null")||DEFAULT_PRODUCTS;
let PRODUCTS=getProducts().filter(p=>p.active!==false);

const money=v=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v)||0);
const pixConfig=()=>window.NatalPix?.getPixConfig?.()||{discount:15,shippingFlat:0,key:"",receiverName:"",displayName:"",city:"SAO PAULO"};
const discounted=(value)=>Math.round(value*(1-(Number(pixConfig().discount)||0)/100)*100)/100;
const orderTotal=(product)=>Math.round((discounted(product.price)+(Number(pixConfig().shippingFlat)||0))*100)/100;

const grid=document.querySelector("#productGrid");
const renderProducts=()=>{
  const discount=Number(pixConfig().discount)||0;
  grid.innerHTML=PRODUCTS.map(p=>`
  <article class="product-card ${p.badge?"recommended":""}">
    <figure><img src="${p.image}" alt="Kit ${p.name} Papai Noel Passou Aqui" loading="lazy"></figure>
    <div class="product-card-body">
      <div class="product-top"><h3>${p.name}</h3>${p.badge?`<span class="badge">${p.badge}</span>`:""}</div>
      <p class="product-prop">${p.prop}</p>
      <div class="benefits">${p.benefits.map(x=>`<span>${x}</span>`).join("")}</div>
      <div class="price-row">
        <div><small>Preço</small><strong>${money(p.price)}</strong></div>
        <div class="pix-price"><small>Pix −${discount}%</small>${money(discounted(p.price))}</div>
      </div>
      <button class="btn btn-primary" data-buy="${p.name}">Escolher este kit</button>
    </div>
  </article>`).join("");
};
renderProducts();

const dialog=document.querySelector("#checkoutDialog");
const pixDialog=document.querySelector("#pixDialog");
const plan=document.querySelector("#checkoutPlan");
const next=document.querySelector("#checkoutNext");
const back=document.querySelector("#checkoutBack");
const close=document.querySelector("#closeCheckout");
const child=document.querySelector("#childName");
const letter=document.querySelector("#letterText");
const count=document.querySelector("#letterCount");
const previewName=document.querySelector("#previewName");
const previewLetter=document.querySelector("#previewLetter");
const progress=document.querySelector("#checkoutProgress");
const stepLabel=document.querySelector("#checkoutStepLabel");
const summary=document.querySelector("#orderSummary");
const pixCanvas=document.querySelector("#pixQrCanvas");
const pixCode=document.querySelector("#pixCopyPaste");
const pixFeedback=document.querySelector("#pixCopyFeedback");
const pixPaidButton=document.querySelector("#pixPaidButton");
const sendPaymentWhatsApp=document.querySelector("#sendPaymentWhatsApp");
let step=1;
let currentProduct=PRODUCTS.find(p=>p.id==="personal")||PRODUCTS[0]||DEFAULT_PRODUCTS[1];
let currentOrderId=null;

plan.innerHTML=PRODUCTS.map(p=>`<option value="${p.name}">${p.name} — ${money(p.price)}</option>`).join("");
plan.value=currentProduct.name;

function setProduct(name){
  currentProduct=PRODUCTS.find(p=>p.name===name)||PRODUCTS.find(p=>p.id==="personal")||PRODUCTS[0]||DEFAULT_PRODUCTS[1];
  plan.value=currentProduct.name;
  renderSummary();
}
function openCheckout(name){
  setProduct(name||currentProduct?.name||"Personalizado");
  step=1;
  renderStep();
  dialog.showModal();
}
function renderStep(){
  document.querySelectorAll(".checkout-step").forEach(el=>el.classList.toggle("active",Number(el.dataset.step)===step));
  stepLabel.textContent=`Etapa ${step} de 3`;
  progress.style.width=`${step/3*100}%`;
  back.hidden=step===1;
  next.textContent=step===3?"Gerar Pix":"Continuar";
  document.querySelector("#mobileBuyBar").hidden=true;
  if(step===3)renderSummary();
}
function renderSummary(){
  const cfg=pixConfig();
  const productPix=discounted(currentProduct.price);
  const shipping=Number(cfg.shippingFlat)||0;
  const total=orderTotal(currentProduct);
  summary.innerHTML=`
    <div class="summary-row"><span>Kit ${currentProduct.name}</span><b>${money(currentProduct.price)}</b></div>
    <div class="summary-row"><span>Desconto Pix ${Number(cfg.discount)||0}%</span><b>− ${money(currentProduct.price-productPix)}</b></div>
    <div class="summary-row"><span>Frete</span><b>${shipping===0?"Grátis":money(shipping)}</b></div>
    <div class="summary-row total"><span>Total no Pix</span><b>${money(total)}</b></div>`;
}
function validateStep(){
  const active=document.querySelector(`.checkout-step[data-step="${step}"]`);
  let ok=true;
  [...active.querySelectorAll("[required]")].forEach(el=>{
    if(!el.value.trim()){el.setAttribute("aria-invalid","true");ok=false}else el.removeAttribute("aria-invalid");
  });
  return ok;
}
function getOrders(){return JSON.parse(localStorage.getItem("natal_orders")||"[]")}
function saveOrders(orders){localStorage.setItem("natal_orders",JSON.stringify(orders))}
function updateOrder(id,patch){
  const orders=getOrders();
  const order=orders.find(o=>o.id===id);
  if(!order)return null;
  Object.assign(order,patch,{updatedAt:new Date().toISOString()});
  saveOrders(orders);
  return order;
}
function createOrder(){
  const cfg=pixConfig();
  if(!cfg.key||!cfg.receiverName){
    alert("O Pix ainda não foi configurado. Abra admin.html e preencha a chave e o nome do recebedor.");
    return null;
  }
  const id=`NATAL-${Date.now().toString().slice(-7)}`;
  const txid=id.replace(/[^A-Za-z0-9]/g,"").slice(0,25);
  const total=orderTotal(currentProduct);
  const payload=window.NatalPix.buildPixPayload({
    key:cfg.key,
    receiverName:cfg.receiverName,
    city:cfg.city,
    amount:total,
    txid
  });
  const order={
    id,txid,pixPayload:payload,createdAt:new Date().toISOString(),status:"Aguardando pagamento",
    plan:currentProduct.name,productPrice:currentProduct.price,discountPercent:Number(cfg.discount)||0,
    shipping:Number(cfg.shippingFlat)||0,total,
    childName:child.value.trim()||"Miguel",letter:letter.value.trim(),
    customerName:document.querySelector("#customerName").value.trim(),
    phone:document.querySelector("#phone").value.trim(),
    cep:document.querySelector("#cep").value.trim(),address:document.querySelector("#address").value.trim(),
    number:document.querySelector("#number").value.trim(),complement:document.querySelector("#complement").value.trim()
  };
  const orders=getOrders();orders.unshift(order);saveOrders(orders);
  return order;
}
async function showPixPayment(order){
  currentOrderId=order.id;
  const cfg=pixConfig();
  document.querySelector("#pixOrderId").textContent=order.id;
  document.querySelector("#pixOrderTotal").textContent=money(order.total);
  document.querySelector("#pixReceiverLabel").textContent=cfg.displayName||cfg.receiverName||"Recebedor Pix";
  pixCode.value=order.pixPayload;
  pixFeedback.textContent="";
  pixPaidButton.disabled=false;
  pixPaidButton.textContent="Já fiz o Pix";
  pixPaidButton.classList.remove("is-informed");
  sendPaymentWhatsApp.hidden=true;
  sendPaymentWhatsApp.href="#";
  if(window.QRCode){
    pixCanvas.innerHTML="";
    new window.QRCode(pixCanvas,{
      text:order.pixPayload,
      width:280,
      height:280,
      colorDark:"#111111",
      colorLight:"#ffffff",
      correctLevel:window.QRCode.CorrectLevel.M
    });
  } else {
    pixCanvas.textContent="QR Code indisponível. Use o Pix copia e cola.";
  }
  pixDialog.showModal();
}
function markPaymentInformed(){
  if(!currentOrderId)return;
  updateOrder(currentOrderId,{status:"Pagamento informado",paymentInformedAt:new Date().toISOString()});
  pixPaidButton.disabled=true;
  pixPaidButton.textContent="Pagamento informado ✓";
  pixPaidButton.classList.add("is-informed");
  pixFeedback.textContent="Recebemos sua informação. Para nossa equipe localizar o pagamento sem atraso, envie a confirmação pelo WhatsApp.";
  const order=getOrders().find(o=>o.id===currentOrderId);
  if(order){
    const msg=`Olá! Já fiz o Pix do pedido ${order.id} no valor de ${money(order.total)}. Nome: ${order.customerName||""}. Vou aguardar a conferência.`;
    sendPaymentWhatsApp.href="https://wa.me/5513974100193?text="+encodeURIComponent(msg);
    sendPaymentWhatsApp.hidden=false;
  }
}

document.addEventListener("click",e=>{
  const b=e.target.closest("[data-buy]");
  if(b)openCheckout(b.dataset.buy);
});
plan.addEventListener("change",()=>setProduct(plan.value));
child.addEventListener("input",()=>{
  const n=child.value.trim()||"Miguel";
  previewName.textContent=`Na casa do ${n}`;
  if(!letter.value.trim())previewLetter.textContent=`Querido ${n}, continue sendo essa criança incrível. Com carinho, Papai Noel.`;
});
letter.addEventListener("input",()=>{
  count.textContent=letter.value.length;
  const n=child.value.trim()||"Miguel";
  previewLetter.textContent=letter.value.trim()||`Querido ${n}, continue sendo essa criança incrível. Com carinho, Papai Noel.`;
});
next.addEventListener("click",async()=>{
  if(!validateStep())return;
  if(step<3){step++;renderStep();return}
  const order=createOrder();
  if(!order)return;
  dialog.close();
  await showPixPayment(order);
});
back.addEventListener("click",()=>{if(step>1){step--;renderStep()}});
close.addEventListener("click",()=>dialog.close());
document.querySelector("#closePix").addEventListener("click",()=>pixDialog.close());
pixPaidButton.addEventListener("click",markPaymentInformed);
document.querySelector("#copyPix").addEventListener("click",async()=>{
  try{
    await navigator.clipboard.writeText(pixCode.value);
    pixFeedback.textContent="Código Pix copiado ✓";
  }catch{
    pixCode.focus();pixCode.select();document.execCommand("copy");
    pixFeedback.textContent="Código Pix copiado ✓";
  }
});
document.querySelector("#findCep").addEventListener("click",async()=>{
  const raw=document.querySelector("#cep").value.replace(/\D/g,"");
  if(raw.length!==8)return alert("Digite um CEP válido.");
  try{
    const r=await fetch(`https://viacep.com.br/ws/${raw}/json/`);
    const d=await r.json();
    if(d.erro)throw new Error();
    document.querySelector("#address").value=[d.logradouro,d.bairro,d.localidade,d.uf].filter(Boolean).join(" • ");
  }catch{alert("Não foi possível consultar o CEP agora.")}
});

const bar=document.querySelector("#mobileBuyBar");
const barStrong=bar?.querySelector("strong");
if(barStrong)barStrong.textContent=`${money(discounted(currentProduct.price))} no Pix`;
const observer=new IntersectionObserver(([entry])=>{if(!dialog.open&&!pixDialog.open)bar.hidden=entry.isIntersecting},{threshold:.15});
observer.observe(document.querySelector(".hero"));
