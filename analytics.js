(function(){
 const storageKey="natal_analytics_session";
 let session="";
 try{session=sessionStorage.getItem(storageKey)||"";if(!session){session=(crypto.randomUUID?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(24))).map(x=>x.toString(16).padStart(2,"0")).join(""));sessionStorage.setItem(storageKey,session)}}catch{return}
 const p=new URLSearchParams(location.search);
 const fields=["utm_source","utm_medium","utm_campaign"];
 let stored={};try{stored=JSON.parse(sessionStorage.getItem("natal_attribution")||"{}")}catch{}
 const utm=Object.fromEntries(fields.map(k=>[k,p.get(k)||stored[k]||""]));
 try{sessionStorage.setItem("natal_attribution",JSON.stringify(utm))}catch{}
 const origin=document.referrer?(()=>{try{return new URL(document.referrer).hostname}catch{return ""}})():"";
 function track(name,data={}){
  const payload={name,session_id:session,page:location.pathname,origin,...utm,product_id:data.product_id||"",order_id:data.order_id||""};
  try{fetch("/api/events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),keepalive:true,credentials:"omit"}).catch(()=>{})}catch{}
 }
 window.natalAnalytics={track,sessionId:session,attribution:utm};
})();