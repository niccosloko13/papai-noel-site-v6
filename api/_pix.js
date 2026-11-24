function ascii(value,max){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z0-9 $%*+\-./:]/g,"").trim().slice(0,max)}
function tlv(id,value){return id+String(value.length).padStart(2,"0")+value}
function crc16(payload){let crc=65535;for(let i=0;i<payload.length;i++){crc^=payload.charCodeAt(i)<<8;for(let j=0;j<8;j++)crc=(crc&32768)?((crc<<1)^4129)&65535:(crc<<1)&65535}return crc.toString(16).toUpperCase().padStart(4,"0")}
function parseTlv(payload){
 const fields={};let offset=0;
 while(offset<payload.length){
  if(offset+4>payload.length)throw Error("O Pix copia e cola está incompleto.");
  const id=payload.slice(offset,offset+2),lengthText=payload.slice(offset+2,offset+4);
  if(!/^\d{2}$/.test(lengthText))throw Error("O Pix copia e cola tem formato inválido.");
  const length=Number(lengthText),start=offset+4,end=start+length;
  if(end>payload.length)throw Error("O Pix copia e cola está incompleto.");
  fields[id]=payload.slice(start,end);offset=end;
 }
 return fields;
}
function normalizedName(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z0-9]+/g," ").trim().replace(/\s+/g," ")}
function dynamicLocation(fields){
 for(let n=26;n<=51;n++){
  const value=fields[String(n).padStart(2,"0")];if(!value)continue;
  let account;try{account=parseTlv(value)}catch{continue}
  if(String(account["00"]||"").toUpperCase()!=="BR.GOV.BCB.PIX")continue;
  if(account["25"])return account["25"];
 }
 return "";
}
function normalizeDynamicUrl(raw){
 const value=String(raw||"").trim();
 const address=/^https:\/\//i.test(value)?value:"https://"+value;
 let url;try{url=new URL(address)}catch{throw Error("A localização da cobrança Pix dinâmica é inválida.")}
 if(url.protocol!=="https:"||url.hostname.toLowerCase()!=="qrcode.gowd.com"||(url.port&&url.port!=="443")||url.username||url.password||url.search||url.hash||!/^\/v1\/cob\/[a-f0-9]{32}$/i.test(url.pathname)){
  throw Error("Este provedor de Pix dinâmico ainda não está autorizado para consulta segura. Não libere esta cobrança.");
 }
 return url.toString();
}
async function resolveDynamicPix(location,expectedAmount,emvReceiver){
 const url=normalizeDynamicUrl(location);
 let response;
 try{
  response=await fetch(url,{method:"GET",headers:{Accept:"application/json"},redirect:"manual",signal:AbortSignal.timeout(8000)});
 }catch(error){
  if(error?.name==="TimeoutError"||error?.name==="AbortError")throw Error("A consulta da cobrança Pix demorou demais. Tente novamente.");
  throw Error("Não foi possível consultar a cobrança Pix no provedor. Tente novamente.");
 }
 if(response.status===404)throw Error("A cobrança Pix dinâmica não foi encontrada ou expirou no provedor. Gere um novo Pix no banco.");
 if(response.status>=300&&response.status<400)throw Error("O provedor redirecionou a cobrança Pix. Por segurança, este QR Code não pode ser liberado.");
 if(!response.ok)throw Error("O provedor Pix não confirmou a cobrança (HTTP "+response.status+"). Tente novamente.");
 let data;
 try{
  const body=await response.text();
  if(body.length>65536)throw Error("Resposta muito grande");
  data=JSON.parse(body);
 }catch{throw Error("O provedor Pix não retornou os dados esperados da cobrança.")}
 if(!data||typeof data!=="object"||Array.isArray(data))throw Error("Resposta inválida do provedor Pix.");
 if(String(data.code||data.codigo||"")==="404")throw Error("A cobrança Pix dinâmica não foi encontrada ou expirou no provedor. Gere um novo Pix no banco.");
 const cob=data.cob&&typeof data.cob==="object"?data.cob:data;
 const status=String(cob.status||cob.situacao||"").toUpperCase();
 if(!["ATIVA","ACTIVE"].includes(status))throw Error("O provedor não confirmou que a cobrança Pix está ativa. Status: "+(status||"não informado")+". Não libere este QR Code.");
 const rawAmount=cob.valor?.original??cob.valor?.final??cob.amount??cob.value??cob.valorOriginal;
 const amountText=typeof rawAmount==="object"&&rawAmount!==null?(rawAmount.original??rawAmount.final):rawAmount;
 const amount=Number(String(amountText??"").replace(",","."));
 const expected=Math.round(Number(expectedAmount)*100)/100;
 if(!Number.isFinite(amount)||amount<=0)throw Error("O provedor não informou um valor válido para esta cobrança Pix.");
 if(Math.round(amount*100)!==Math.round(expected*100))throw Error("O Pix informa "+amount.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})+", mas o pedido é "+expected.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})+". Gere uma cobrança com o valor correto.");
 const providerReceiver=String(cob.recebedor?.nome||cob.receiver?.name||cob.receiverName||cob.nomeRecebedor||"").trim();
 if(providerReceiver&&emvReceiver&&normalizedName(providerReceiver)!==normalizedName(emvReceiver))throw Error("O nome do recebedor no provedor não confere com o Pix copia e cola. Não libere esta cobrança.");
 const expiry=Number(cob.calendario?.expiracao??cob.expiresInSeconds??0);
 return {amount,receiverName:providerReceiver||emvReceiver||"",dynamic:true,expiresInSeconds:Number.isFinite(expiry)&&expiry>0?Math.floor(expiry):null};
}
async function validatePixPayload(payload,expectedAmount){
 if(typeof payload!=="string")throw Error("Cole o Pix copia e cola gerado no aplicativo do banco.");
 const code=payload.trim();
 if(code.length<30||code.length>2048||/[\r\n\t]/.test(code))throw Error("O Pix copia e cola está vazio ou tem formato inválido.");
 const crcPosition=code.lastIndexOf("6304");
 if(crcPosition!==code.length-8||!/^[A-Fa-f0-9]{4}$/.test(code.slice(-4)))throw Error("O código Pix não contém uma assinatura CRC válida.");
 if(crc16(code.slice(0,-4))!==code.slice(-4).toUpperCase())throw Error("A assinatura do Pix não confere. Copie novamente do banco.");
 const fields=parseTlv(code);
 if(fields["00"]!=="01"&&fields["00"]!=="02")throw Error("O código não está no formato de pagamento Pix.");
 if(fields["53"]!=="986"||fields["58"]!=="BR")throw Error("Este código não parece ser um Pix brasileiro válido.");
 const location=dynamicLocation(fields);
 const emvReceiver=fields["59"]||"";
 if(location){
  const dynamic=await resolveDynamicPix(location,expectedAmount,emvReceiver);
  return {payload:code,amount:dynamic.amount,receiverName:dynamic.receiverName,city:fields["60"]||"",crcValid:true,dynamic:true,expiresInSeconds:dynamic.expiresInSeconds};
 }
 const rawAmount=fields["54"];
 if(!rawAmount||!/^\d{1,13}(?:\.\d{1,2})?$/.test(rawAmount))throw Error("Este Pix não contém valor fixo nem uma localização de cobrança dinâmica reconhecida. Gere um Pix com valor exato no banco.");
 const amount=Math.round(Number(rawAmount)*100)/100,expected=Math.round(Number(expectedAmount)*100)/100;
 if(!Number.isFinite(amount)||!Number.isFinite(expected)||expected<=0)throw Error("Não foi possível conferir o valor do pedido.");
 if(Math.round(amount*100)!==Math.round(expected*100))throw Error("O Pix informa "+amount.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})+", mas o pedido é "+expected.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})+". Gere o código com o valor correto.");
 if(!code.toUpperCase().includes("BR.GOV.BCB.PIX"))throw Error("Este código não parece ser um Pix brasileiro válido.");
 return {payload:code,amount,receiverName:emvReceiver,city:fields["60"]||"",crcValid:true,dynamic:false,expiresInSeconds:null};
}
function buildPix({key,receiverName,city,amount,txid}){
 if(!key||!receiverName||!(amount>0))throw Error("PIX_UNAVAILABLE");
 const account=tlv("00","BR.GOV.BCB.PIX")+tlv("01",String(key).trim());
 let p=tlv("00","01")+tlv("26",account)+tlv("52","0000")+tlv("53","986")+tlv("54",amount.toFixed(2))+tlv("58","BR")+tlv("59",ascii(receiverName,25))+tlv("60",ascii(city,15)||"SAO PAULO")+tlv("62",tlv("05",ascii(txid,25).replace(/[^A-Z0-9]/g,"")))+"6304";
 return p+crc16(p);
}
module.exports={buildPix,validatePixPayload,crc16,parseTlv};