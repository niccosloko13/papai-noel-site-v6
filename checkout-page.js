(()=>{"use strict";
const $=s=>document.querySelector(s);
const money=v=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v)||0);
const form=$("#checkoutForm"),qty=$("#quantity");
let price=Number(window.STORE_DATA?.products?.find(p=>p.id==="basic")?.price)||132.90;
let lastCepLookup="",cepController=null;
const digits=v=>String(v||"").replace(/\D/g,"");
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
$("#qtyMinus").addEventListener("click",()=>{qty.value=String(Math.max(1,quantity()-1));updateTotal()});
$("#qtyPlus").addEventListener("click",()=>{qty.value=String(Math.min(10,quantity()+1));updateTotal()});
qty.addEventListener("change",updateTotal);
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
  const response=await fetch("https://viacep.com.br/ws/"+cep+"/json/",{signal:controller.signal,cache:"no-store"});
  if(!response.ok)throw Error("CEP indisponível");
  const data=await response.json();
  if(data.erro)throw Error("CEP não encontrado");
  $("#address").value=data.logradouro||"";
  $("#neighborhood").value=data.bairro||"";
  $("#city").value=data.localidade||"";
  $("#state").value=data.uf||"";
  $("#address").readOnly=!!data.logradouro;
  $("#neighborhood").readOnly=!!data.bairro;
  $("#city").readOnly=!!data.localidade;
  $("#state").readOnly=!!data.uf;
  $("#addressAutofill").hidden=false;
  status.textContent=(data.logradouro&&data.bairro)?"Endereço localizado! Agora informe somente o número e o complemento.":"CEP localizado. Complete os campos de endereço que vieram em branco e informe o número.";
  status.dataset.state="success";
  if(!data.logradouro)$("#address").focus();
  else $("#number").focus();
 }catch(error){
  if(error.name==="AbortError")return;
  lastCepLookup="";
  status.textContent="Não encontramos esse CEP. Confira os números e tente novamente.";
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
 const button=$("#submitOrder");button.disabled=true;button.textContent="Registrando seu pedido...";
 try{
  const response=await fetch("/api/checkout",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
  const result=await response.json();
  if(!response.ok)throw Error(result.error||"Não foi possível registrar o pedido");
  localStorage.setItem("natal_customer_order_access",JSON.stringify({id:result.id,accessKey:result.accessKey}));
  window.natalAnalytics?.track("order_created",{order_id:result.id,product_id:"basic",value:result.total,currency:"BRL"});
  location.href="/pagamento-pedido.html?id="+encodeURIComponent(result.id);
 }catch(error){showMessage(error.message||"Falha ao registrar o pedido. Tente novamente.");button.disabled=false;button.innerHTML='Confirmar pedido <span>→</span>'}
});
updateTotal();
fetch("/api/products",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(data=>{
 const product=data?.products?.find(x=>x.id==="basic");
 if(product&&Number(product.price)>0){price=Number(product.price);updateTotal()}
}).catch(()=>{});
})();