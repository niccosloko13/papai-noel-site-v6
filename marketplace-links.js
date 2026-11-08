(()=>{"use strict";
const targets={mercadolivre:document.getElementById("buyMercadoLivre"),shopee:document.getElementById("buyShopee")};
const note=document.getElementById("marketplaceStatus");
const domains={mercadolivre:["mercadolivre.com.br","mercadolivre.com"],shopee:["shopee.com.br","shopee.com"]};
function valid(raw,key){try{const u=new URL(raw);return u.protocol==="https:"&&!u.username&&!u.password&&domains[key].some(d=>u.hostname===d||u.hostname.endsWith("."+d))}catch{return false}}
fetch("/api/marketplace-links",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("indisponível");return r.json()}).then(data=>{
 let count=0;
 for(const [key,anchor] of Object.entries(targets)){
  if(!anchor||!valid(data[key],key))continue;
  anchor.href=data[key];anchor.hidden=false;count++;
 }
 if(note)note.textContent=count===2?"Escolha a plataforma de sua preferência. O pagamento e o frete são concluídos no marketplace.":count===1?"Confira a opção disponível acima. A outra plataforma será habilitada após publicação do anúncio.":"Os links de compra serão disponibilizados quando os anúncios oficiais estiverem publicados. Não faça Pix por fora dos marketplaces.";
}).catch(()=>{if(note)note.textContent="Links dos marketplaces temporariamente indisponíveis. Tente novamente mais tarde ou entre em contato com nosso atendimento para confirmar o anúncio oficial."});
})();