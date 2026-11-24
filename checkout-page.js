(()=>{"use strict";
const $=s=>document.querySelector(s);
const money=v=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v)||0);
const form=$("#checkoutForm"),qty=$("#quantity");
const productVideo=$("#checkoutProductVideo");
if(productVideo){
 productVideo.muted=true;
 productVideo.defaultMuted=true;
 productVideo.playsInline=true;
 const playProductVideo=()=>{
  if(document.hidden)return;
  const playback=productVideo.play();
  if(playback&&playback.catch)playback.catch(()=>{});
 };
 productVideo.addEventListener("loadeddata",playProductVideo,{once:true});
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)playProductVideo()});
 playProductVideo();
}
window.natalAnalytics?.track("begin_checkout",{product_id:"basic"});
let price=Number(window.STORE_DATA?.products?.find(p=>p.id==="basic")?.price)||124.00;
let lastCepLookup="",cepController=null;
const digits=v=>String(v||"").replace(/\D/g,"");
const sentSteps=new Set();
function trackStep(step){if(sentSteps.has(step))return;sentSteps.add(step);window.natalAnalytics?.track("checkout_step",{product_id:step})}
let loggiQuoteController=null,lastLoggiSignature="",loggiQuoteTimer=null;
function quantity(){const n=Math.max(1,Math.min(10,Math.floor(Number(qty.value)||1)));qty.value=String(n);return n}
function updateTotal(){const total=price*quantity();$("#subtotal").textContent=money(total);$("#total").textContent=money(total)}
function validCpf(value){
 const cpf=digits(value);
 if(cpf.length!==11||/^(\d)\1{10}$/.test(cpf))return false;
 let sum=0;
 for(let i=0;i<9;i++)sum+=Number(cpf[i])*(10-i);
 let check=(sum*10)%11;if(check===10)check=0;
 if(check!==Number(cpf[9]))return false;
 sum=0;
 for(let i=0;i<10;i++)sum+=Number(cpf[i])*(11-i);
 check=(sum*10)%11;if(check===10)check=0;
 return check===Number(cpf[10]);
}
function formatCpf(value){
 const d=digits(value).slice(0,11);
 return d.replace(/^(\d{3})(\d)/,"$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/,"$1.$2.$3").replace(/\.(\d{3})(\d)/,".$1-$2");
}
$("#qtyMinus").addEventListener("click",()=>{qty.value=String(Math.max(1,quantity()-1));updateTotal();lastLoggiSignature="";calculateLoggiQuote()});
$("#qtyPlus").addEventListener("click",()=>{qty.value=String(Math.min(10,quantity()+1));updateTotal();lastLoggiSignature="";calculateLoggiQuote()});
qty.addEventListener("change",()=>{updateTotal();lastLoggiSignature="";calculateLoggiQuote()});
$("#phone").addEventListener("input",e=>{const d=digits(e.target.value).slice(0,11);e.target.value=d.length<=10?d.replace(/^(\d{2})(\d)/,"($1) $2").replace(/(\d{4})(\d)/,"$1-$2"):d.replace(/^(\d{2})(\d)/,"($1) $2").replace(/(\d{5})(\d)/,"$1-$2")});
$("#cpf").addEventListener("input",e=>{e.target.value=formatCpf(e.target.value)});
function clearAddress(){
 ["address","neighborhood","city","state"].forEach(id=>{$("#"+id).value="";$("#"+id).readOnly=true});
 $("#addressAutofill").hidden=true;
}
async function lookupCep(cep){
 if(cep.length!==8||cep===lastCepLookup)return;
 lastCepLookup=cep;
 if(cepController)cepController.abort();
 const controller=new AbortController();cepController=controller;
 const status=$("#cepStatus");
 status.textContent="Localizando seu endereço...";
 status.dataset.state="loading";
 clearAddress();
 try{
  const response=await fetch("/api/cep?cep="+encodeURIComponent(cep),{signal:controller.signal,cache:"no-store",credentials:"same-origin"});
  const data=await response.json();
  if(!response.ok||!data.ok)throw Error(data.error||"CEP indisponível");
  $("#address").value=data.address||"";
  $("#neighborhood").value=data.neighborhood||"";
  $("#city").value=data.city||"";
  $("#state").value=data.state||"";
  $("#address").readOnly=!!data.address;
  $("#neighborhood").readOnly=!!data.neighborhood;
  $("#city").readOnly=!!data.city;
  $("#state").readOnly=!!data.state;
  $("#addressAutofill").hidden=false;
  status.textContent=(data.logradouro&&data.bairro)?"Endereço localizado! Agora informe somente o número e o complemento.":"CEP localizado. Complete os campos de endereço que vieram em branco e informe o número.";
  status.dataset.state="success";
  trackStep("cep");
  if(!data.logradouro)$("#address").focus();
  else $("#number").focus();
 }catch(error){
  if(error.name==="AbortError")return;
  lastCepLookup="";
  status.textContent=error.message==="CEP não encontrado"?"Não encontramos esse CEP. Confira os números e tente novamente.":"Não foi possível consultar o CEP agora. Tente novamente em instantes.";
  status.dataset.state="error";
  clearAddress();
 }finally{if(cepController===controller)cepController=null}
}
$("#cep").addEventListener("input",e=>{
 const d=digits(e.target.value).slice(0,8);
 e.target.value=d.length>5?d.slice(0,5)+"-"+d.slice(5):d;
 if(d.length<8){
  lastCepLookup="";
  if(cepController)cepController.abort();
  clearAddress();
  $("#cepStatus").textContent="Ao completar o CEP, seu endereço será preenchido automaticamente";
  $("#cepStatus").dataset.state="";
 }
 if(d.length===8)lookupCep(d);
});
$("#cep").addEventListener("blur",()=>{const d=digits($("#cep").value);if(d.length===8&&lastCepLookup!==d)lookupCep(d)});

async function calculateLoggiQuote(){
 const card=$("#loggiEstimateCard"),status=$("#loggiEstimateStatus"),options=$("#loggiEstimateOptions");
 const data={cep:digits($("#cep").value),address:$("#address").value.trim(),number:$("#number").value.trim(),complement:$("#complement").value.trim(),neighborhood:$("#neighborhood").value.trim(),city:$("#city").value.trim(),state:$("#state").value.trim(),quantity:quantity()};
 if(data.cep.length!==8||!data.address||!data.number||!data.neighborhood||!data.city||!data.state){card.hidden=true;lastLoggiSignature="";return}
 const signature=JSON.stringify(data);if(signature===lastLoggiSignature)return;lastLoggiSignature=signature;
 if(loggiQuoteController)loggiQuoteController.abort();
 const controller=new AbortController();loggiQuoteController=controller;
 card.hidden=false;status.textContent="Consultando o prazo estimado da Loggi...";options.replaceChildren();
 try{
  const response=await fetch("/api/loggi-quote?cep="+encodeURIComponent(data.cep),{method:"GET",signal:controller.signal,credentials:"same-origin",cache:"no-store"});
  const result=await response.json();
  if(result.configured===false){card.hidden=false;status.textContent="Estamos ativando a consulta de prazo da Loggi para este endereço.";options.replaceChildren();return}
  if(!response.ok)throw Error(result.error||"Consulta indisponível");
  if(!result.available||!Number.isFinite(Number(result.daysMin))||!Number.isFinite(Number(result.daysMax))){status.textContent="Não conseguimos estimar o prazo para este CEP. Confira o número informado.";return}
  status.textContent="Previsão aproximada para "+(result.destinationRegion||"a sua região");
  const line=document.createElement("div");line.className="loggi-estimate-option";
  const label=document.createElement("strong");label.textContent="Entrega estimada";
  const days=document.createElement("span");days.textContent=Number(result.daysMin)+" a "+Number(result.daysMax)+" dias úteis";
  line.append(label,days);options.append(line);
 }catch(error){
  if(error.name==="AbortError")return;
  status.textContent="Não foi possível consultar a previsão da Loggi agora.";
 }finally{if(loggiQuoteController===controller)loggiQuoteController=null}
}
function trackAddressAndQuote(){
 if(!$("#addressAutofill").hidden&&$("#number").value.trim()&&$("#address").value.trim()&&$("#neighborhood").value.trim()&&$("#city").value.trim()&&$("#state").value.trim()){
  trackStep("endereco");calculateLoggiQuote();
 }
}
function trackCustomerData(){
 if($("#customerName").value.trim().length>=3&&validCpf($("#cpf").value)&&digits($("#phone").value).length>=10)trackStep("dados");
}
function scheduleLoggiQuote(){
 clearTimeout(loggiQuoteTimer);
 loggiQuoteTimer=setTimeout(()=>{trackAddressAndQuote()},700);
}
["number","complement"].forEach(id=>{
 const field=$("#"+id);
 field.addEventListener("input",scheduleLoggiQuote);
 field.addEventListener("blur",()=>{clearTimeout(loggiQuoteTimer);trackAddressAndQuote()});
});
["customerName","cpf","phone"].forEach(id=>$("#"+id).addEventListener("blur",trackCustomerData));
$("#acceptTerms").addEventListener("change",()=>{if($("#acceptTerms").checked)trackStep("termos")});

function showMessage(msg){$("#checkoutMessage").textContent=msg}
form.addEventListener("submit",async e=>{
 e.preventDefault();showMessage("");
 const data={
  customerName:$("#customerName").value.trim(),
  cpf:digits($("#cpf").value),
  phone:digits($("#phone").value),
  cep:digits($("#cep").value),
  address:$("#address").value.trim(),
  number:$("#number").value.trim(),
  complement:$("#complement").value.trim(),
  neighborhood:$("#neighborhood").value.trim(),
  city:$("#city").value.trim(),
  state:$("#state").value.trim().toUpperCase(),
  quantity:quantity(),
  acceptTerms:$("#acceptTerms").checked
 };
 if(data.cep.length!==8||$("#addressAutofill").hidden){showMessage("Digite um CEP válido para localizar seu endereço.");$("#cep").focus();return}
 if(data.customerName.length<3){showMessage("Informe seu nome completo.");$("#customerName").focus();return}
 if(!validCpf(data.cpf)){showMessage("Confira o CPF informado.");$("#cpf").focus();return}
 if(data.phone.length<10){showMessage("Informe um WhatsApp válido.");$("#phone").focus();return}
 if(data.address.length<3||!data.number||data.neighborhood.length<2||data.city.length<2||!/^[A-Z]{2}$/.test(data.state)){showMessage("Confira o endereço e informe o número da residência.");$("#number").focus();return}
 if(!data.acceptTerms){showMessage("É necessário aceitar os termos para continuar.");$("#acceptTerms").focus();return}
 trackAddressAndQuote();trackCustomerData();trackStep("confirmacao");
 const button=$("#submitOrder");button.disabled=true;button.textContent="Registrando seu pedido...";
 try{
  const response=await fetch("/api/checkout",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({...data,sessionId:window.natalAnalytics?.sessionId||"",attribution:window.natalAnalytics?.attribution||{}})});
  const result=await response.json();
  if(!response.ok)throw Error(result.error||"Não foi possível registrar o pedido");
  localStorage.setItem("natal_customer_order_access",JSON.stringify({id:result.id,accessKey:result.accessKey}));
  window.natalAnalytics?.track("order_created",{order_id:result.id,product_id:"basic",value:result.total,currency:"BRL"});
  location.href="/pedido-processando.html?id="+encodeURIComponent(result.id);
 }catch(error){showMessage(error.message||"Falha ao registrar o pedido. Tente novamente.");button.disabled=false;button.innerHTML='Confirmar pedido <span>→</span>'}
});
updateTotal();
fetch("/api/products",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(data=>{
 const product=data?.products?.find(x=>x.id==="basic");
 if(product&&Number(product.price)>0){price=Number(product.price);updateTotal()}
}).catch(()=>{});
})();