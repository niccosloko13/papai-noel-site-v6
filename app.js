const DEFAULT_PRODUCTS=(window.STORE_DATA?.products||[
  {id:"basic",name:"Essencial",price:39.90,prop:"As pistas essenciais para transformar a casa na noite de Natal.",benefits:["6 pares + 1 pegada solta (13 pegadas)","Adesivo para janela","Carta padrão","Certificado padrão","Guia de aplicação"],image:"assets/product/kit1-site.webp",active:true},
  {id:"personal",name:"Personalizado",price:69.90,prop:"Tudo do Essencial, com mais pegadas e a experiência personalizada com o nome da criança.",benefits:["10 pares + 1 pegada solta (21 pegadas)","Adesivo para janela","Placa com nome da criança","Certificado personalizado","Carta personalizada","Guia de aplicação"],image:"assets/product/kit-personalizado.webp",active:true}
]);
const getProducts=()=>{const stored=JSON.parse(localStorage.getItem("natal_products")||"null");const currentImages={basic:"assets/product/kit1-site.webp",personal:"assets/product/kit-personalizado.webp"};return Array.isArray(stored)&&stored.length===2&&stored.every(p=>["basic","personal"].includes(p.id)&&p.image===currentImages[p.id])?stored:DEFAULT_PRODUCTS};
let PRODUCTS=getProducts().filter(p=>p.active!==false).map(p=>({...p,badge:""}));

const money=v=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v)||0);
const pixConfig=()=>window.NatalPix?.getPixConfig?.()||{discount:15,shippingFlat:0,key:"",receiverName:"",displayName:"",city:"SAO PAULO"};
const discounted=value=>Math.round(value*(1-(Number(pixConfig().discount)||0)/100)*100)/100;
const productById=id=>PRODUCTS.find(p=>p.id===id)||DEFAULT_PRODUCTS.find(p=>p.id===id);

const trackStoreEvent=(name,data={})=>{
  try{
    const events=JSON.parse(localStorage.getItem("natal_events")||"[]");
    const params=new URLSearchParams(location.search);
    events.push({name,at:new Date().toISOString(),path:location.pathname,utm_source:params.get("utm_source")||"",utm_medium:params.get("utm_medium")||"",utm_campaign:params.get("utm_campaign")||"",utm_content:params.get("utm_content")||"",...data});
    localStorage.setItem("natal_events",JSON.stringify(events.slice(-600)));
  }catch{}
};
const applySeoDraft=()=>{
  try{
    const c=JSON.parse(localStorage.getItem("natal_seo_config")||"null");if(!c)return;
    if(c.title)document.title=c.title;
    if(c.description){let m=document.querySelector('meta[name="description"]');if(m)m.setAttribute("content",c.description)}
    if(c.image){let og=document.querySelector('meta[property="og:image"]');if(!og){og=document.createElement("meta");og.setAttribute("property","og:image");document.head.appendChild(og)}og.setAttribute("content",c.image)}
  }catch{}
};
applySeoDraft();
trackStoreEvent("page_view",{page:"landing"});

const grid=document.querySelector("#productGrid");
const cartDialog=document.querySelector("#cartDialog");
const cartItemsEl=document.querySelector("#cartItems");
const cartEmpty=document.querySelector("#cartEmpty");
const cartFooter=document.querySelector("#cartFooter");
const cartCount=document.querySelector("#cartCount");
const cartTotal=document.querySelector("#cartTotal");
const cartSavings=document.querySelector("#cartSavings");

const getCart=()=>JSON.parse(localStorage.getItem("natal_cart")||"[]");
const saveCart=cart=>{localStorage.setItem("natal_cart",JSON.stringify(cart));renderCart()};
const cartExpanded=cart=>cart.map(i=>({product:productById(i.id),qty:Math.max(1,Number(i.qty)||1)})).filter(i=>i.product);

function renderProducts(){
  const discount=Number(pixConfig().discount)||0;
  grid.innerHTML=PRODUCTS.map(p=>{
    const count=p.id==="basic"?"13 pegadas":"21 pegadas";
    const extras=p.benefits.filter((_,i)=>i>0);
    return `
  <article class="product-card product-card--${p.id} ${p.badge?"recommended":""}">
    <figure class="product-card-media">
      <img src="${p.image}" alt="Itens do Kit ${p.name} Papai Noel Passou Aqui" loading="lazy" width="660" height="540">
      <div class="product-media-badges">
        <span>KIT ${p.id==="personal"?"2":"1"}</span>
        ${p.badge?`<b>${p.badge}</b>`:""}
      </div>
    </figure>

    <div class="product-card-body">
      <div class="product-heading">
        <div>
          <small>KIT ${p.id==="personal"?"2":"1"} • ${p.id==="personal"?"PERSONALIZADO":"ESSENCIAL"}</small>
          <h3>Kit ${p.name}</h3>
        </div>
        ${p.id==="personal"?'<span class="product-star" aria-hidden="true">✦</span>':""}
      </div>

      <p class="product-prop">${p.prop}</p>

      <div class="product-count">
        <span aria-hidden="true">✓</span>
        <div><small>PEGADAS PARA CRIAR O CAMINHO</small><strong>${count}</strong></div>
      </div>

      <div class="product-includes">
        <small>O KIT TAMBÉM INCLUI</small>
        <div class="product-includes-grid">
          ${extras.map(x=>`<span><i aria-hidden="true">✓</i>${x}</span>`).join("")}
        </div>
      </div>

      <details class="product-specs">
        <summary>Medidas, material e cuidados <span>+</span></summary>
        <div>${p.id==="basic"
          ?`<p><b>Pegadas:</b> 6 pares + 1 solta (13 unidades), 22 × 8 cm.</p><p><b>Material:</b> vinil fosco removível.</p><p><b>Inclui:</b> adesivo de janela, carta padrão, certificado padrão e guia de aplicação.</p><p><b>Onde aplicar:</b> piso liso, seco e limpo. Evite superfícies porosas, molhadas ou recém-pintadas.</p>`
          :`<p><b>Pegadas:</b> 10 pares + 1 solta (21 unidades), 22 × 8 cm.</p><p><b>Material:</b> vinil fosco removível.</p><p><b>Personalização:</b> placa, carta e certificado com o nome informado no pedido.</p><p><b>Onde aplicar:</b> piso liso, seco e limpo. Evite superfícies porosas, molhadas ou recém-pintadas.</p>`}</div>
      </details>

      <div class="product-buy-block">
        <div class="price-row">
          <div class="regular-price"><small>Preço</small><strong>${money(p.price)}</strong></div>
          <div class="pix-price"><small>PIX • ${discount}% OFF</small><strong>${money(discounted(p.price))}</strong></div>
        </div>

        <div class="product-actions product-actions-conversion">
          <button class="btn btn-primary btn-holiday" data-buy="${p.name}">Quero o Kit ${p.name}</button>
          <button class="product-cart-link" data-add-cart="${p.id}" type="button">+ Adicionar ao carrinho</button>
        </div>
      </div>
    </div>
  </article>`;
  }).join("");
}
renderProducts();

function renderCart(){
  const cart=getCart();
  const items=cartExpanded(cart);
  const qty=items.reduce((n,i)=>n+i.qty,0);
  cartCount.textContent=qty;
  cartCount.hidden=qty===0;
  cartItemsEl.innerHTML=items.map(({product:p,qty})=>`
    <article class="cart-item">
      <img src="${p.image}" alt="" aria-hidden="true">
      <div class="cart-item-copy">
        <div class="cart-item-top"><div><small>Kit</small><strong>${p.name}</strong></div><button class="cart-remove" data-cart-remove="${p.id}" type="button" aria-label="Remover Kit ${p.name}">Remover</button></div>
        <div class="cart-item-bottom">
          <div class="qty-control" aria-label="Quantidade">
            <button type="button" data-cart-minus="${p.id}" aria-label="Diminuir quantidade">−</button>
            <span>${qty}</span>
            <button type="button" data-cart-plus="${p.id}" aria-label="Aumentar quantidade">+</button>
          </div>
          <div class="cart-item-price"><small>Pix</small><b>${money(discounted(p.price)*qty)}</b></div>
        </div>
      </div>
    </article>`).join("");
  cartEmpty.hidden=items.length>0;
  cartFooter.hidden=items.length===0;
  const regular=items.reduce((s,i)=>s+i.product.price*i.qty,0);
  const pix=items.reduce((s,i)=>s+discounted(i.product.price)*i.qty,0);
  cartSavings.textContent=money(regular-pix);
  cartTotal.textContent=money(pix);
}
renderCart();

function addToCart(id){
  const cart=getCart();
  const found=cart.find(i=>i.id===id);
  if(found)found.qty=Math.min(9,(Number(found.qty)||1)+1);
  else cart.push({id,qty:1});
  saveCart(cart);
  trackStoreEvent("add_to_cart",{product_id:id});
  cartDialog.showModal();
}
function changeCartQty(id,delta){
  const cart=getCart();
  const item=cart.find(i=>i.id===id);
  if(!item)return;
  item.qty=Math.max(0,Math.min(9,(Number(item.qty)||1)+delta));
  saveCart(cart.filter(i=>i.qty>0));
}
function removeFromCart(id){saveCart(getCart().filter(i=>i.id!==id))}

const dialog=document.querySelector("#checkoutDialog");
const pixDialog=document.querySelector("#pixDialog");
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
const checkoutCartMini=document.querySelector("#checkoutCartMini");
const addressResult=document.querySelector("#addressResult");
const addressFoundText=document.querySelector("#addressFoundText");
const pixCanvas=document.querySelector("#pixQrCanvas");
const pixCode=document.querySelector("#pixCopyPaste");
const pixFeedback=document.querySelector("#pixCopyFeedback");
const pixPaidButton=document.querySelector("#pixPaidButton");
const sendPaymentWhatsApp=document.querySelector("#sendPaymentWhatsApp");
const trackOrderLink=document.querySelector("#trackOrderLink");
let step=1;
let currentProduct=PRODUCTS.find(p=>p.id==="personal")||PRODUCTS[0]||DEFAULT_PRODUCTS[1];
let checkoutItems=[{id:currentProduct.id,qty:1}];
let checkoutFromCart=false;
let currentOrderId=null;

function checkoutHasPersonalized(){
  return checkoutExpanded().some(i=>i.product.id==="personal");
}
function syncPersonalizationMode(){
  const personalized=checkoutHasPersonalized();
  const section=document.querySelector('.checkout-step[data-step="1"]');
  const heading=section?.querySelector("h2");
  const kicker=section?.querySelector(".checkout-step-kicker");
  const nameLabel=child?.closest("label");
  const letterLabel=letter?.closest("label");
  const preview=document.querySelector("#letterPreviewWrap");
  if(heading)heading.textContent=personalized?"Veja sua carta antes de concluir.":"Seu Kit Essencial já vem pronto.";
  if(kicker)kicker.textContent=personalized?"PASSO 1 • PERSONALIZAÇÃO":"PASSO 1 • CONFERÊNCIA";
  if(nameLabel)nameLabel.hidden=!personalized;
  if(letterLabel)letterLabel.hidden=!personalized;
  if(preview)preview.hidden=!personalized;
  child.required=personalized;
  if(!personalized){
    child.removeAttribute("aria-invalid");
    child.value="";
    letter.value="";
    count.textContent="0";
  }
}
function pulseLetterName(){
  previewName.classList.remove("is-writing");
  void previewName.offsetWidth;
  previewName.classList.add("is-writing");
}
function updateLetterPreview(){
  const n=child.value.trim()||"Miguel";
  const custom=letter.value.trim();
  previewName.textContent="Querido "+n+",";
  previewLetter.textContent=custom||"Você foi muito especial este ano! Continue sendo essa criança incrível, cheia de alegria e um grande coração. Nos vemos no próximo Natal!";
  count.textContent=letter.value.length;
  pulseLetterName();
}

function checkoutExpanded(){return cartExpanded(checkoutItems)}
function checkoutRegularSubtotal(){return checkoutExpanded().reduce((s,i)=>s+i.product.price*i.qty,0)}
function checkoutPixSubtotal(){return checkoutExpanded().reduce((s,i)=>s+discounted(i.product.price)*i.qty,0)}
function checkoutTotal(){
  const shipping=Number(pixConfig().shippingFlat)||0;
  return Math.round((checkoutPixSubtotal()+shipping)*100)/100;
}
function renderCheckoutMini(){
  const items=checkoutExpanded();
  if(!checkoutCartMini)return;
  checkoutCartMini.innerHTML=items.map(i=>`
    <div class="checkout-mini-item">
      <img src="${i.product.image}" alt="">
      <div><small>${i.qty}× Kit</small><strong>${i.product.name}</strong></div>
      <b>${money(discounted(i.product.price)*i.qty)}</b>
    </div>`).join("");
}
function openCheckoutWithItems(items,{fromCart=false}={}){
  const normalized=(items&&items.length?items:[{id:currentProduct.id,qty:1}]).map(i=>({id:i.id,qty:Math.max(1,Number(i.qty)||1)}));
  localStorage.setItem("natal_checkout_pending",JSON.stringify({items:normalized,fromCart,createdAt:Date.now()}));
  trackStoreEvent("begin_checkout",{items:normalized});
  window.location.href="checkout.html";
}
function openCheckout(name){
  const p=PRODUCTS.find(p=>p.name===name)||currentProduct;
  openCheckoutWithItems([{id:p.id,qty:1}],{fromCart:false});
}
let lastRenderedStep=1;
function renderStep(){
  const goingBack=step<lastRenderedStep;
  document.querySelectorAll(".checkout-step").forEach(el=>{
    const active=Number(el.dataset.step)===step;
    el.classList.toggle("active",active);
    el.classList.toggle("is-backward",active&&goingBack);
  });
  document.querySelectorAll("[data-progress-step]").forEach(el=>{
    const n=Number(el.dataset.progressStep);
    el.classList.toggle("is-active",n===step);
    el.classList.toggle("is-done",n<step);
  });
  stepLabel.textContent=`Etapa ${step} de 3`;
  progress.style.width=`${step/3*100}%`;
  back.hidden=step===1;
  next.textContent=step===3?"Gerar meu Pix":"Continuar";
  document.querySelector("#mobileBuyBar").hidden=true;
  if(step===3){
    renderSummary();
    renderReview();
  }
  lastRenderedStep=step;
}
function renderSummary(){
  const cfg=pixConfig();
  const regular=checkoutRegularSubtotal();
  const productPix=checkoutPixSubtotal();
  const shipping=Number(cfg.shippingFlat)||0;
  const total=checkoutTotal();
  const names=checkoutExpanded().map(i=>i.qty>1?`${i.qty}× ${i.product.name}`:i.product.name).join(", ");
  summary.innerHTML=`
    <div class="summary-row"><span>Kits</span><b>${money(regular)}</b></div>
    <div class="summary-products">${checkoutExpanded().map(i=>`<span>${i.qty}× Kit ${i.product.name}</span>`).join("")}</div>
    <div class="summary-row discount"><span>Desconto Pix ${Number(cfg.discount)||0}%</span><b>− ${money(regular-productPix)}</b></div>
    <div class="summary-row"><span>Frete</span><b>${shipping===0?"Grátis":money(shipping)}</b></div>
    <div class="summary-row total"><span>Total no Pix</span><b>${money(total)}</b></div>`;
  const sidePlan=document.querySelector("#sidePlan");
  const sidePrice=document.querySelector("#sidePrice");
  const sidePix=document.querySelector("#sidePix");
  const sideShipping=document.querySelector("#sideShipping");
  const sideTotal=document.querySelector("#sideTotal");
  if(sidePlan)sidePlan.textContent=names||"Seu pedido";
  if(sidePrice)sidePrice.textContent=money(regular);
  if(sidePix)sidePix.textContent=(Number(cfg.discount)||0)+"% OFF";
  if(sideShipping)sideShipping.textContent=shipping===0?"Grátis":money(shipping);
  if(sideTotal)sideTotal.textContent=money(total);
}
function renderReview(){
  const personalized=checkoutHasPersonalized();
  const person=personalized?(child.value.trim()||"—"):"Kit Essencial";
  const msg=personalized?(letter.value.trim()||"Mensagem padrão do Papai Noel"):"Sem personalização";
  const addr=[document.querySelector("#address").value.trim(),document.querySelector("#number").value.trim(),document.querySelector("#complement").value.trim()].filter(Boolean).join(", ");
  const customer=document.querySelector("#customerName").value.trim();
  const phone=document.querySelector("#phone").value.trim();
  const n=document.querySelector("#reviewChildName");
  const m=document.querySelector("#reviewMessage");
  const a=document.querySelector("#reviewAddress");
  const c=document.querySelector("#reviewCustomer");
  const t=document.querySelector("#reviewTotal");
  if(n)n.textContent=person;
  if(m)m.textContent=msg;
  if(a)a.textContent=addr||"—";
  if(c)c.textContent=[customer,phone].filter(Boolean).join(" • ")||"—";
  if(t)t.textContent=money(checkoutTotal());
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
  const total=checkoutTotal();
  const payload=window.NatalPix.buildPixPayload({key:cfg.key,receiverName:cfg.receiverName,city:cfg.city,amount:total,txid});
  const items=checkoutExpanded().map(i=>({id:i.product.id,name:i.product.name,qty:i.qty,unitPrice:i.product.price,pixUnit:discounted(i.product.price)}));
  const order={
    id,txid,pixPayload:payload,createdAt:new Date().toISOString(),status:"Aguardando pagamento",
    items,plan:items.map(i=>i.qty>1?`${i.qty}x ${i.name}`:i.name).join(", "),
    productPrice:checkoutRegularSubtotal(),discountPercent:Number(cfg.discount)||0,
    shipping:Number(cfg.shippingFlat)||0,total,
    childName:checkoutHasPersonalized()?child.value.trim():"",letter:checkoutHasPersonalized()?letter.value.trim():"",
    customerName:document.querySelector("#customerName").value.trim(),
    phone:document.querySelector("#phone").value.trim(),
    cep:document.querySelector("#cep").value.trim(),address:document.querySelector("#address").value.trim(),
    number:document.querySelector("#number").value.trim(),complement:document.querySelector("#complement").value.trim()
  };
  const orders=getOrders();orders.unshift(order);saveOrders(orders);
  if(checkoutFromCart)saveCart([]);
  return order;
}
async function showPixPayment(order){
  currentOrderId=order.id;
  const cfg=pixConfig();
  document.querySelector("#pixOrderId").textContent=order.id;
  document.querySelector("#pixOrderTotal").textContent=money(order.total);
  document.querySelector("#pixReceiverLabel").textContent=cfg.displayName||cfg.receiverName||"Recebedor Pix";
  const pixName=document.querySelector("#pixChildName");
  const pixMsg=document.querySelector("#pixMagicMessage");
  if(pixName)pixName.textContent=order.childName||order.customerName||"Seu pedido";
  if(pixMsg)pixMsg.textContent=order.childName?`A surpresa de ${order.childName} já está quase a caminho.`:"Seu pedido já está quase a caminho.";
  pixCode.value=order.pixPayload;
  pixFeedback.textContent="";
  pixPaidButton.disabled=false;
  pixPaidButton.innerHTML='<span>Já fiz o Pix</span><i aria-hidden="true">✦</i>';
  pixPaidButton.classList.remove("is-informed");
  const celebration=document.querySelector("#paymentCelebrationMessage");
  if(celebration)celebration.hidden=true;
  sendPaymentWhatsApp.hidden=true;sendPaymentWhatsApp.href="#";
  trackOrderLink.hidden=true;trackOrderLink.href="#";
  if(window.QRCode){
    pixCanvas.innerHTML="";
    new window.QRCode(pixCanvas,{text:order.pixPayload,width:280,height:280,colorDark:"#111111",colorLight:"#ffffff",correctLevel:window.QRCode.CorrectLevel.M});
  }else pixCanvas.textContent="QR Code indisponível. Use o Pix copia e cola.";
  pixDialog.showModal();
  requestAnimationFrame(()=>pixDialog.classList.add("is-magical"));
}
function markPaymentInformed(){
  if(!currentOrderId)return;
  updateOrder(currentOrderId,{status:"Pagamento informado",paymentInformedAt:new Date().toISOString()});
  pixPaidButton.disabled=true;
  pixPaidButton.innerHTML='<span>Pagamento informado ✓</span>';
  pixPaidButton.classList.add("is-informed");
  const celebration=document.querySelector("#paymentCelebrationMessage");
  if(celebration)celebration.hidden=false;
  pixFeedback.textContent="Recebemos sua informação. Para nossa equipe localizar o pagamento sem atraso, envie a confirmação pelo WhatsApp.";
  const order=getOrders().find(o=>o.id===currentOrderId);
  if(order){
    const msg=`Olá! Já fiz o Pix do pedido ${order.id} no valor de ${money(order.total)}. Nome: ${order.customerName||""}. Vou aguardar a conferência.`;
    sendPaymentWhatsApp.href="https://wa.me/5513974100193?text="+encodeURIComponent(msg);
    sendPaymentWhatsApp.hidden=false;
    trackOrderLink.href="pedido.html?id="+encodeURIComponent(order.id);
    trackOrderLink.hidden=false;
  }
}

document.addEventListener("click",e=>{
  const add=e.target.closest("[data-add-cart]");
  if(add){addToCart(add.dataset.addCart);return}
  const buy=e.target.closest("[data-buy]");
  if(buy){openCheckout(buy.dataset.buy);return}
  const plus=e.target.closest("[data-cart-plus]");
  if(plus){changeCartQty(plus.dataset.cartPlus,1);return}
  const minus=e.target.closest("[data-cart-minus]");
  if(minus){changeCartQty(minus.dataset.cartMinus,-1);return}
  const remove=e.target.closest("[data-cart-remove]");
  if(remove){removeFromCart(remove.dataset.cartRemove)}
});
document.querySelector("#openCart").addEventListener("click",()=>{renderCart();cartDialog.showModal()});
document.querySelector("#closeCart").addEventListener("click",()=>cartDialog.close());
document.querySelector("#cartShop").addEventListener("click",()=>{cartDialog.close();document.querySelector("#kits").scrollIntoView({behavior:"smooth"})});
document.querySelector("#cartCheckout").addEventListener("click",()=>openCheckoutWithItems(getCart(),{fromCart:true}));

document.querySelectorAll(".mobile-menu nav a").forEach(a=>a.addEventListener("click",()=>{const m=a.closest("details");if(m)m.open=false;}));

child.addEventListener("input",updateLetterPreview);
letter.addEventListener("input",updateLetterPreview);
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
document.querySelector("#closePix").addEventListener("click",()=>{pixDialog.classList.remove("is-magical");pixDialog.close()});
pixPaidButton.addEventListener("click",markPaymentInformed);
document.querySelector("#copyPix").addEventListener("click",async()=>{
  try{await navigator.clipboard.writeText(pixCode.value);pixFeedback.textContent="Código Pix copiado ✓"}
  catch{pixCode.focus();pixCode.select();document.execCommand("copy");pixFeedback.textContent="Código Pix copiado ✓"}
});
document.querySelector("#findCep").addEventListener("click",async()=>{
  const cepInput=document.querySelector("#cep");
  const raw=cepInput.value.replace(/\D/g,"");
  if(raw.length!==8)return alert("Digite um CEP válido.");
  const button=document.querySelector("#findCep");
  const original=button.textContent;
  button.disabled=true;button.textContent="Buscando...";
  try{
    const r=await fetch(`https://viacep.com.br/ws/${raw}/json/`);
    const d=await r.json();
    if(d.erro)throw new Error();
    const value=[d.logradouro,d.bairro,d.localidade,d.uf].filter(Boolean).join(" • ");
    document.querySelector("#address").value=value;
    if(addressFoundText)addressFoundText.textContent=value;
    if(addressResult)addressResult.hidden=false;
    document.querySelector("#number")?.focus();
  }catch{
    if(addressResult)addressResult.hidden=true;
    alert("Não foi possível consultar o CEP agora.");
  }finally{
    button.disabled=false;button.textContent=original;
  }
});

const bar=document.querySelector("#mobileBuyBar");
const barStrong=bar?.querySelector("strong");
if(barStrong)barStrong.textContent=`${money(discounted(currentProduct.price))} no Pix`;
function isInViewport(el){if(!el)return false;const r=el.getBoundingClientRect();return r.bottom>0&&r.top<window.innerHeight}
let stickyTick=false;
function refreshStickyBuyBar(){
  if(!bar)return;
  const blocked=isInViewport(document.querySelector("#inicio"))||isInViewport(document.querySelector("#kits"))||dialog.open||pixDialog.open||cartDialog.open;
  bar.hidden=blocked;
}
function scheduleStickyRefresh(){if(stickyTick)return;stickyTick=true;requestAnimationFrame(()=>{stickyTick=false;refreshStickyBuyBar()})}
window.addEventListener("scroll",scheduleStickyRefresh,{passive:true});
window.addEventListener("resize",scheduleStickyRefresh);
refreshStickyBuyBar();

/* Product changes are loaded from the same server catalog used to price orders. */
fetch("/api/products",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(data=>{
 if(!data||!Array.isArray(data.products)||data.products.length!==2)return;
 PRODUCTS=data.products.filter(p=>p.active!==false).map(p=>({...p,badge:""}));
 currentProduct=PRODUCTS.find(p=>p.id===currentProduct.id)||PRODUCTS[0]||currentProduct;
 renderProducts();renderCart();refreshStickyBuyBar();
}).catch(()=>{});
