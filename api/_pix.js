function ascii(value,max){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z0-9 $%*+\-./:]/g,"").trim().slice(0,max)}
function tlv(id,value){return id+String(value.length).padStart(2,"0")+value}
function crc16(payload){let crc=65535;for(let i=0;i<payload.length;i++){crc^=payload.charCodeAt(i)<<8;for(let j=0;j<8;j++)crc=(crc&32768)?((crc<<1)^4129)&65535:(crc<<1)&65535}return crc.toString(16).toUpperCase().padStart(4,"0")}
function buildPix({key,receiverName,city,amount,txid}){
 if(!key||!receiverName||!(amount>0))throw Error("PIX_UNAVAILABLE");
 const account=tlv("00","BR.GOV.BCB.PIX")+tlv("01",String(key).trim());
 let p=tlv("00","01")+tlv("26",account)+tlv("52","0000")+tlv("53","986")+tlv("54",amount.toFixed(2))+tlv("58","BR")+tlv("59",ascii(receiverName,25))+tlv("60",ascii(city,15)||"SAO PAULO")+tlv("62",tlv("05",ascii(txid,25).replace(/[^A-Z0-9]/g,"")))+"6304";
 return p+crc16(p);
}
module.exports={buildPix};
