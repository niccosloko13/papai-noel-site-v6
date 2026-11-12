(()=>{"use strict";
const $=s=>document.querySelector(s);
const overlay=$("#platformOverlay"), close=$("#closePlatform");
const nav=$("#mainNavigation"),toggle=$("#navToggle");
const marketplaceNodes={
 mercadolivre:{anchor:$("#modalMercadoLivre"),availability:$("#mlAvailability"),name:"Mercado Livre"},

};
const domains={mercadolivre:["mercadolivre.com.br","mercadolivre.com"]};
const verifiedOwnerUrl="https://www.mercadolivre.com.br/lareira-feliz-edicao-natalina-120cm/up/MLBU5809699305";
let links={mercadolivre:verifiedOwnerUrl},lastFocus=null;
function validLink(raw,platform){
 try{
  const u=new URL(String(raw||""));
  return u.protocol==="https:"&&!u.username&&!u.password&&domains[platform].some(d=>u.hostname===d||u.hostname.endsWith("."+d));
 }catch{return false}
}
function showModal(){
 lastFocus=document.activeElement;
 overlay.hidden=false;
 document.body.classList.add("modal-open");
 close.focus();
 window.natalAnalytics?.track("view_product",{product_id:"lareira-feliz"});
}
function hideModal(){
 overlay.hidden=true;
 document.body.classList.remove("modal-open");
 if(lastFocus?.focus)lastFocus.focus();
}
document.querySelectorAll("[data-choose-platform]").forEach(el=>el.addEventListener("click",showModal));
close.addEventListener("click",hideModal);
overlay.addEventListener("click",e=>{if(e.target===overlay)hideModal()});
document.addEventListener("keydown",e=>{
 if(overlay.hidden)return;
 if(e.key==="Escape"){e.preventDefault();hideModal();return}
 if(e.key==="Tab"){
  const focusable=[...overlay.querySelectorAll('button:not([disabled]),a[href]:not([aria-disabled="true"])')];
  if(!focusable.length)return;
  const first=focusable[0],last=focusable[focusable.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 }
});
toggle?.addEventListener("click",()=>{const open=nav.classList.toggle("open");toggle.setAttribute("aria-expanded",String(open))});
nav?.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{nav.classList.remove("open");toggle?.setAttribute("aria-expanded","false")}));
function recordClick(platform){
 // Eventos próprios com UTM no servidor; não registram venda não confirmada.
 window.natalAnalytics?.track("marketplace_click",{product_id:platform});
 if(window.natalMarketingConsentGranted===true&&typeof window.fbq==="function"&&window.fbq.loaded){window.fbq("trackCustom","MarketplaceClick",{platform,content_name:"Lareira Feliz",currency:"BRL",value:124.90})}
}
for(const [key,node] of Object.entries(marketplaceNodes)){
 node.anchor.addEventListener("click",e=>{
  if(!links[key]){e.preventDefault();return}
  recordClick(key);
 });
}
function updateCards(data){
 let active=0;
 for(const [key,node] of Object.entries(marketplaceNodes)){
  const value=data[key];
  if(validLink(value,key)){
   links[key]=value;active++;
   node.anchor.href=value;
   node.anchor.target="_blank";node.anchor.rel="noopener noreferrer";
   node.anchor.removeAttribute("aria-disabled");
   node.availability.textContent="Abrir anúncio oficial ↗";
  }else{
   node.anchor.removeAttribute("href");
   node.anchor.setAttribute("aria-disabled","true");
   node.availability.textContent="Anúncio ainda não disponível";
  }
 }
 $("#platformStatus").textContent=active===1?"Anúncio oficial disponível. Abra diretamente no Mercado Livre para conferir preço e condições.":"O anúncio oficial ainda não está vinculado ao site. Confirme com o atendimento antes de pagar.";
}
async function loadLinks(){
 try{
  const r=await fetch("/api/marketplace-links",{cache:"no-store",credentials:"omit"});
  if(!r.ok)throw Error("Links indisponíveis");
  updateCards({mercadolivre:verifiedOwnerUrl});
 }catch{updateCards({mercadolivre:verifiedOwnerUrl})}
}
$("#privacyChoice")?.addEventListener("click",()=>window.natalMarketingPreferences?.());

// Carrossel de duas imagens com controles e gesto de deslizar
const carousel=$("#fireplaceCarousel"),dots=[...document.querySelectorAll(".carousel-dots button")];
if(carousel){
 let activeSlide=0,downX=null;
 const slides=[...carousel.children];
 function setSlide(n){
  activeSlide=(n+slides.length)%slides.length;
  carousel.style.transform="translateX(-"+(activeSlide*100)+"%)";
  dots.forEach((b,i)=>{b.classList.toggle("is-active",i===activeSlide);b.setAttribute("aria-current",String(i===activeSlide))});
  slides.forEach((slide,i)=>slide.setAttribute("aria-hidden",String(i!==activeSlide)));
 }
 $(".carousel-prev")?.addEventListener("click",()=>setSlide(activeSlide-1));
 $(".carousel-next")?.addEventListener("click",()=>setSlide(activeSlide+1));
 dots.forEach((btn,i)=>btn.addEventListener("click",()=>setSlide(i)));
 carousel.addEventListener("touchstart",e=>{downX=e.changedTouches[0]?.clientX??null},{passive:true});
 carousel.addEventListener("touchend",e=>{if(downX===null)return;const delta=(e.changedTouches[0]?.clientX??downX)-downX;if(Math.abs(delta)>40)setSlide(activeSlide+(delta<0?1:-1));downX=null},{passive:true});
 setSlide(0);
}


document.querySelectorAll("[data-ml-click]").forEach(anchor=>anchor.addEventListener("click",()=>{
 window.natalAnalytics?.track("marketplace_click",{product_id:"mercadolivre"});
 if(window.natalMarketingConsentGranted===true&&typeof window.fbq==="function")window.fbq("trackCustom","MarketplaceClick",{platform:"mercadolivre",content_name:"Lareira Feliz",currency:"BRL",value:124.90});
}));
loadLinks();
})();