(()=>{"use strict";
const money=v=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v)||0);
document.querySelectorAll("[data-checkout-click]").forEach(link=>link.addEventListener("click",()=>{try{window.natalAnalytics?.track("begin_checkout",{product_id:"basic",value:Number(document.querySelector("#landingProductPrice")?.textContent.replace(/[^0-9,]/g,"").replace(",","."))||132.90,currency:"BRL",page:location.pathname})}catch{}}));
fetch("/api/products",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(data=>{const product=data?.products?.find(p=>p.id==="basic");if(!product||!Number.isFinite(Number(product.price)))return;const price=money(product.price);const target=document.querySelector("#landingProductPrice");if(target)target.textContent=price;const meta=document.querySelector('meta[property="product:price:amount"]');if(meta)meta.content=Number(product.price).toFixed(2)}).catch(()=>{});
})();
