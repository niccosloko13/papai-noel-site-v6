(()=>{"use strict";
const $=s=>document.querySelector(s);
const money=v=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v)||0);
const form=$("#checkoutForm"),qty=$("#quantity");let price=Number(window.STORE_DATA?.products?.find(p=>p.id==="basic")?.price)||148.90;
const digits=v=>String(v||"").replace(/\D/g,"");
function quantity(){const n=Math.max(1,Math.min(10,Math.floor(Number(qty.value)||1)));qty.value=String(n);return n}
function updateTotal(){const total=price*quantity();$("#subtotal").textContent=money(total);$("#total").textContent=money(total)}
$("#qtyMinus").addEventListener("click",()=>{qty.value=String(Math.max(1,quantity()-1));updateTotal()});
$("#qtyPlus").addEventListener("click",()=>{qty.value=String(Math.min(10,quantity()+1));updateTotal()});
qty.addEventListener("change",updateTotal);
$("#phone").addEventListener("input",e=>{const d=digits(e.target.value).slice(0,11);e.target.value=d.length<=10?d.replace(/^(\d{2})(\d)/,"($1) $2").replace(/(\d{4})(\d)/,"$1-$2"):d.replace(/^(\d{2})(\d)/,"($1) $2").replace(/(\d{5})(\d)/,"$1-$2")});
$("#cep").addEventListener("input",e=>{const d=digits(e.target.value).slice(0,8);e.target.value=d.length>5?d.slice(0,5)+"-"+d.slice(5):d});
async function lookupCep(){const cep=digits($("#cep").value);const status=$("#cepStatus");if(cep.length!==8){status.textContent="Digite os 8 números do CEP";return}status.textContent="Buscando endereço...";$("#lookupCep").disabled=true;try{const r=await fetch("https://viacep.com.br/ws/"+cep+"/json/");if(!r.ok)throw Error("CEP indisponível");const d=await r.json();if(d.erro)throw Error("CEP não encontrado");$("#address").value=d.logradouro||"";$("#neighborhood").value=d.bairro||"";$("#city").value=d.localidade||"";$("#state").value=d.uf||"";status.textContent="Endereço encontrado. Confira e complete o número."}catch(e){status.textContent="Não conseguimos localizar esse CEP. Preencha o endereço manualmente."}finally{$("#lookupCep").disabled=false}}
$("#lookupCep").addEventListener("click",lookupCep);$("#cep").addEventListener("blur",()=>{if(digits($("#cep").value).length===8)lookupCep()});
function showMessage(msg){$("#checkoutMessage").textContent=msg}
form.addEventListener("submit",async e=>{e.preventDefault();showMessage("");const data={customerName:$("#customerName").value.trim(),phone:digits($("#phone").value),cep:digits($("#cep").value),address:$("#address").value.trim(),number:$("#number").value.trim(),complement:$("#complement").value.trim(),neighborhood:$("#neighborhood").value.trim(),city:$("#city").value.trim(),state:$("#state").value.trim().toUpperCase(),quantity:quantity(),acceptTerms:$("#acceptTerms").checked};
if(data.customerName.length<3||data.phone.length<10||data.cep.length!==8||data.address.length<3||!data.number||data.neighborhood.length<2||data.city.length<2||!/^[A-Z]{2}$/.test(data.state)||!data.acceptTerms){showMessage("Confira todos os dados obrigatórios e aceite os termos antes de continuar.");return}
const button=$("#submitOrder");button.disabled=true;button.textContent="Registrando seu pedido...";
try{const r=await fetch("/api/checkout",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});const result=await r.json();if(!r.ok)throw Error(result.error||"Não foi possível registrar o pedido");localStorage.setItem("natal_customer_order_access",JSON.stringify({id:result.id,accessKey:result.accessKey}));window.natalAnalytics?.track("order_created",{order_id:result.id,product_id:"basic",value:result.total,currency:"BRL"});location.href="/pagamento-pedido.html?id="+encodeURIComponent(result.id)}catch(err){showMessage(err.message||"Falha ao registrar o pedido. Tente novamente.");button.disabled=false;button.innerHTML='Confirmar pedido <span>→</span>'}
});
updateTotal();
fetch("/api/products",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(data=>{const p=data?.products?.find(x=>x.id==="basic");if(p&&Number(p.price)>0){price=Number(p.price);updateTotal()}}).catch(()=>{});
})();
