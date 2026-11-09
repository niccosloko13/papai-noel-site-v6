(()=>{"use strict";
const $=s=>document.querySelector(s);
const overlay=$("#platformOverlay"), close=$("#closePlatform");
const nav=$("#mainNavigation"),toggle=$("#navToggle");
const marketplaceNodes={
 mercadolivre:{anchor:$("#modalMercadoLivre"),availability:$("#mlAvailability"),name:"Mercado Livre"},
 shopee:{anchor:$("#modalShopee"),availability:$("#shAvailability"),name:"Shopee"}
};
const domains={mercadolivre:["mercadolivre.com.br","mercadolivre.com"],shopee:["shopee.com.br","shopee.com"]};
let links={mercadolivre:"",shopee:""},lastFocus=null;
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
 if(typeof window.fbq==="function"&&window.fbq.loaded){window.fbq("trackCustom","MarketplaceClick",{platform,content_name:"Lareira Feliz",currency:"BRL",value:124.90})}
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
 $("#platformStatus").textContent=active===2?"Ambas as plataformas estão disponíveis. Escolha a de sua preferência.":active===1?"Uma plataforma está disponível. A outra será adicionada quando o anúncio estiver pronto.":"Os anúncios ainda não têm links publicados aqui. Antes de pagar, confirme o anúncio oficial com nosso atendimento.";
}
async function loadLinks(){
 try{
  const r=await fetch("/api/marketplace-links",{cache:"no-store",credentials:"omit"});
  if(!r.ok)throw Error("Links indisponíveis");
  updateCards(await r.json());
 }catch{$("#platformStatus").textContent="Não conseguimos verificar os links agora. Confirme com o atendimento antes de comprar."}
}
$("#privacyChoice")?.addEventListener("click",()=>window.natalMarketingPreferences?.());
loadLinks();
})();