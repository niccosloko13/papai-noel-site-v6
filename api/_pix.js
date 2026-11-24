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
function validatePixPayload(payload,expectedAmount){
 if(typeof payload!=="string")throw Error("Cole o Pix copia e cola gerado no aplicativo do banco.");
 const code=payload.trim();
 if(code.length<30||code.length>2048||/\s/.test(code))throw Error("O Pix copia e cola está vazio ou tem formato inválido.");
 const crcPosition=code.lastIndexOf("6304");
 if(crcPosition!==code.length-8||!/^[A-Fa-f0-9]{4}$/.test(code.slice(-4)))throw Error("O código Pix não contém uma assinatura CRC válida.");
 if(crc16(code.slice(0,-4))!==code.slice(-4).toUpperCase())throw Error("A assinatura do Pix não confere. Copie novamente do banco.");
 const fields=parseTlv(code);
 if(fields["00"]!=="01"&&fields["00"]!=="02")throw Error("O código não está no formato de pagamento Pix.");
 if(fields["53"]!=="986"||fields["58"]!=="BR"||!code.includes("BR.GOV.BCB.PIX"))throw Error("Este código não parece ser um Pix brasileiro válido.");
 const rawAmount=fields["54"];
 if(!rawAmount||!/^\d{1,13}(?:\.\d{1,2})?$/.test(rawAmount))throw Error("Este Pix não contém valor fixo. Gere no banco uma cobrança com o valor exato do pedido.");
 const amount=Math.round(Number(rawAmount)*100)/100,expected=Math.round(Number(expectedAmount)*100)/100;
 if(!Number.isFinite(amount)||!Number.isFinite(expected)||expected<=0)throw Error("Não foi possível conferir o valor do pedido.");
 if(Math.round(amount*100)!==Math.round(expected*100))throw Error("O Pix informa "+amount.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})+", mas o pedido é "+expected.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})+". Gere o código com o valor correto.");
 return {payload:code,amount,receiverName:fields["59"]||"",city:fields["60"]||"",crcValid:true};
}
function buildPix({key,receiverName,city,amount,txid}){
 if(!key||!receiverName||!(amount>0))throw Error("PIX_UNAVAILABLE");
 const account=tlv("00","BR.GOV.BCB.PIX")+tlv("01",String(key).trim());
 let p=tlv("00","01")+tlv("26",account)+tlv("52","0000")+tlv("53","986")+tlv("54",amount.toFixed(2))+tlv("58","BR")+tlv("59",ascii(receiverName,25))+tlv("60",ascii(city,15)||"SAO PAULO")+tlv("62",tlv("05",ascii(txid,25).replace(/[^A-Z0-9]/g,"")))+"6304";
 return p+crc16(p);
}
module.exports={buildPix,validatePixPayload,crc16};
