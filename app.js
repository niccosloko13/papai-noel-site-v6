const PRODUCTS=[
  {name:"Básico",price:39.90,prop:"Para criar a surpresa essencial.",benefits:["10 pegadas adesivas","Adesivo para janela","Guia rápido de aplicação"],image:"assets/art/web/03-kit-basico.avif"},
  {name:"Personalizado",price:69.90,prop:"A experiência que faz a visita parecer real.",benefits:["20 pegadas adesivas","Adesivo para janela","Placa com nome da criança","Certificado personalizado"],image:"assets/art/web/04-kit-personalizado.avif",badge:"Mais escolhido"},
  {name:"Premium",price:99.90,prop:"A experiência completa para presentear.",benefits:["30 pegadas adesivas","Adesivo para janela","Placa personalizada","Certificado oficial","Guia mágico","Embalagem especial"],image:"assets/art/web/05-kit-premium.avif"}
];
const money=v=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v);
const pix=v=>Math.round(v*0.85*100)/100;
const grid=document.querySelector("#productGrid");
grid.innerHTML=PRODUCTS.map(p=>`
<article class="product-card ${p.badge?"recommended":""}">
  <figure><img src="${p.image}" alt="Kit ${p.name} Papai Noel Passou Aqui" loading="lazy"></figure>
  <div class="product-card-body">
    <div class="product-top"><h3>${p.name}</h3>${p.badge?`<span class="badge">${p.badge}</span>`:""}</div>
    <p class="product-prop">${p.prop}</p>
    <div class="benefits">${p.benefits.map(x=>`<span>${x}</span>`).join("")}</div>
    <div class="price-row"><div><small>A partir de</small><strong>${money(p.price)}</strong></div><div class="pix-price"><small>no Pix</small>${money(pix(p.price))}</div></div>
    <button class="btn btn-primary" data-buy="${p.name}">Escolher este kit</button>
  </div>
</article>`).join("");

const dialog=document.querySelector("#checkoutDialog");
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
let step=1;
let currentProduct=PRODUCTS[1];

plan.innerHTML=PRODUCTS.map(p=>`<option value="${p.name}">${p.name} — ${money(p.price)}</option>`).join("");
plan.value=currentProduct.name;

function setProduct(name){
  currentProduct=PRODUCTS.find(p=>p.name===name)||PRODUCTS[1];
  plan.value=currentProduct.name;
  renderSummary();
}
function openCheckout(name){
  setProduct(name||"Personalizado"); step=1; renderStep(); dialog.showModal();
}
function renderStep(){
  document.querySelectorAll(".checkout-step").forEach(el=>el.classList.toggle("active",Number(el.dataset.step)===step));
  stepLabel.textContent=`Etapa ${step} de 3`;
  progress.style.width=`${step/3*100}%`;
  back.hidden=step===1;
  next.textContent=step===3?"Criar pedido no Pix":"Continuar";
  document.querySelector("#mobileBuyBar").hidden=true;
  if(step===3) renderSummary();
}
function renderSummary(){
  const total=pix(currentProduct.price);
  summary.innerHTML=`
    <div class="summary-row"><span>Kit ${currentProduct.name}</span><b>${money(currentProduct.price)}</b></div>
    <div class="summary-row"><span>Desconto Pix 15%</span><b>− ${money(currentProduct.price-total)}</b></div>
    <div class="summary-row"><span>Frete</span><b>A calcular</b></div>
    <div class="summary-row total"><span>Total no Pix</span><b>${money(total)}</b></div>`;
}
function validateStep(){
  const active=document.querySelector(`.checkout-step[data-step="${step}"]`);
  const required=[...active.querySelectorAll("[required]")];
  let ok=true;
  for(const el of required){
    if(!el.value.trim()){el.setAttribute("aria-invalid","true");ok=false}else el.removeAttribute("aria-invalid");
  }
  return ok;
}
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-buy]"); if(b) openCheckout(b.dataset.buy);
});
plan.addEventListener("change",()=>setProduct(plan.value));
child.addEventListener("input",()=>{
  const n=child.value.trim()||"Miguel";
  previewName.textContent=`Na casa do ${n}`;
  if(!letter.value.trim()) previewLetter.textContent=`Querido ${n}, continue sendo essa criança incrível. Com carinho, Papai Noel.`;
});
letter.addEventListener("input",()=>{
  count.textContent=letter.value.length;
  const n=child.value.trim()||"Miguel";
  previewLetter.textContent=letter.value.trim()||`Querido ${n}, continue sendo essa criança incrível. Com carinho, Papai Noel.`;
});
next.addEventListener("click",()=>{
  if(!validateStep()) return;
  if(step<3){step++;renderStep();return}
  const orders=JSON.parse(localStorage.getItem("natal_orders")||"[]");
  const id=`NATAL-${Date.now().toString().slice(-7)}`;
  orders.unshift({id,createdAt:new Date().toISOString(),status:"Aguardando pagamento",plan:currentProduct.name,total:pix(currentProduct.price),childName:child.value.trim()||"Miguel",letter:letter.value.trim(),customerName:document.querySelector("#customerName").value,phone:document.querySelector("#phone").value,cep:document.querySelector("#cep").value,address:document.querySelector("#address").value,number:document.querySelector("#number").value,complement:document.querySelector("#complement").value});
  localStorage.setItem("natal_orders",JSON.stringify(orders));
  dialog.close();
  alert(`Pedido ${id} criado. O próximo passo será exibir o Pix manual profissional.`);
});
back.addEventListener("click",()=>{if(step>1){step--;renderStep()}});
close.addEventListener("click",()=>dialog.close());
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
const observer=new IntersectionObserver(([entry])=>{if(!dialog.open)bar.hidden=entry.isIntersecting},{threshold:.15});
observer.observe(document.querySelector(".hero"));
