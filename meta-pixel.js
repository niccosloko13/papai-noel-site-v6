(()=>{
 "use strict";
 const consentKey="natal_meta_marketing_consent_v1";
 let id="",loaded=false,bar=null;
 const accepted=()=>{try{return localStorage.getItem(consentKey)==="yes"}catch{return false}};
 function save(value){try{localStorage.setItem(consentKey,value)}catch{}}
 function setupPixel(){
  if(!id||loaded||!accepted())return;
  loaded=true;
  // Meta Pixel carrega somente após consentimento explícito.
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];
  t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");
  window.fbq("init",id);
  window.fbq("track","PageView");
 }
 function send(name,data){
  if(!accepted()||!loaded||typeof window.fbq!=="function")return;
  const product={content_ids:[data?.product_id||"lareira-feliz"],content_type:"product",currency:"BRL",value:148.90};
  if(name==="view_product")window.fbq("track","ViewContent",product);
  if(name==="add_to_cart")window.fbq("track","AddToCart",product);
  if(name==="begin_checkout")window.fbq("track","InitiateCheckout",product);
  // Purchase não é disparado na criação do pedido nem no botão "Já paguei".
 }
 function makeBar(){
  if(bar||!document.body)return;
  bar=document.createElement("aside");
  bar.setAttribute("role","dialog");
  bar.setAttribute("aria-label","Preferências de privacidade");
  bar.className="privacy-consent";
  bar.setAttribute("role","dialog");
  bar.setAttribute("aria-label","Preferências de privacidade");
  const title=document.createElement("strong");
  title.textContent="Podemos medir a eficácia dos anúncios?";
  const message=document.createElement("p");
  message.append("Se você aceitar, usaremos o Pixel da Meta para medir visitas e etapas da compra. Recusar não impede a compra. ");
  const privacy=document.createElement("a");
  privacy.href="/privacidade.html";
  privacy.textContent="Privacidade";
  message.append(privacy,".");
  const actions=document.createElement("div");
  actions.className="privacy-consent-actions";
  const reject=document.createElement("button");
  reject.type="button";
  reject.dataset.consent="no";
  reject.textContent="Recusar";
  const accept=document.createElement("button");
  accept.type="button";
  accept.dataset.consent="yes";
  accept.textContent="Aceitar";
  actions.append(reject,accept);
  bar.append(title,message,actions);
  bar.querySelectorAll("[data-consent]").forEach(b=>b.addEventListener("click",()=>{
    save(b.dataset.consent);
    bar.remove();
    bar=null;
    if(accepted())setupPixel();
  }));
  document.body.appendChild(bar);
 }
 async function init(){
  try{
   const r=await fetch("/api/public-marketing",{cache:"no-store"});
   if(!r.ok)return;
   const v=await r.json();if(!/^\d{7,25}$/.test(String(v.metaPixel||"")))return;
   id=String(v.metaPixel);
   if(accepted())setupPixel();
   else{let prior="";try{prior=localStorage.getItem(consentKey)||""}catch{};if(!prior)makeBar()}
   if(window.natalAnalytics&&typeof window.natalAnalytics.track==="function"){
    const original=window.natalAnalytics.track;
    window.natalAnalytics.track=function(name,data){original(name,data);send(name,data||{})};
   }
  }catch{}
 }
 window.natalMarketingPreferences=()=>{try{localStorage.removeItem(consentKey)}catch{};location.reload()};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();