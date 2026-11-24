const test=require("node:test");const assert=require("node:assert/strict");
const {buildPix,validatePixPayload,crc16}=require("../api/_pix");
function tlv(id,value){return id+String(value.length).padStart(2,"0")+value}
function dynamicCode(url){
 const merchant=tlv("00","br.gov.bcb.pix")+tlv("25",url);
 const body=tlv("00","01")+tlv("01","12")+tlv("26",merchant)+tlv("52","0000")+tlv("53","986")+tlv("58","BR")+tlv("59","NIVURA PAGOU LTDA")+tlv("60","Sao Paulo")+tlv("62",tlv("05","***"))+"6304";
 return body+crc16(body);
}
test("Pix payload: campos fixos, valor exato e CRC válido",async()=>{
 const code=buildPix({key:"teste@example.com",receiverName:"Papai Noel Passou Aqui",city:"SAO PAULO",amount:124,txid:"NATALTESTE123456"});
 assert.ok(code.startsWith("000201"));assert.ok(code.includes("0014BR.GOV.BCB.PIX"));assert.ok(code.includes("5406124.00"));assert.ok(code.includes("5303986"));assert.ok(code.includes("5802BR"));assert.equal(code.slice(-4),crc16(code.slice(0,-4)));
 const result=await validatePixPayload(code,124);assert.equal(result.amount,124);assert.equal(result.receiverName,"PAPAI NOEL PASSOU AQUI".slice(0,25));assert.equal(result.crcValid,true);assert.equal(result.dynamic,false);
});
test("Pix fixo rejeita valor diferente",async()=>{
 const code=buildPix({key:"teste@example.com",receiverName:"Loja",city:"SAO PAULO",amount:123.99,txid:"NATALTESTE"});
 await assert.rejects(validatePixPayload(code,124),/pedido é/);
});
test("Pix rejeita CRC inválido",async()=>{
 const code=buildPix({key:"teste@example.com",receiverName:"Loja",city:"SAO PAULO",amount:124,txid:"NATALTESTE"});
 const invalid=code.slice(0,-1)+(code.endsWith("0")?"1":"0");
 await assert.rejects(validatePixPayload(invalid,124),/assinatura do Pix não confere/);
});
test("Pix fixo sem valor é rejeitado",async()=>{
 const code=buildPix({key:"teste@example.com",receiverName:"Loja",city:"SAO PAULO",amount:124,txid:"NATALTESTE"});
 const noAmount=code.replace("5406124.00",""),body=noAmount.slice(0,-8)+"6304",withoutAmount=body+crc16(body);
 await assert.rejects(validatePixPayload(withoutAmount,124),/não contém valor fixo/);
});
test("Pix dinâmico consulta cobrança ativa, confere valor e recebedor mesmo com GUI minúscula",async()=>{
 const original=global.fetch;global.fetch=async(url,options)=>new Response(JSON.stringify({status:"ATIVA",valor:{original:"124.00"},recebedor:{nome:"NIVURA PAGOU LTDA"},calendario:{expiracao:300}}),{status:200,headers:{"content-type":"application/json"}});
 try{
  const code=dynamicCode("qrcode.gowd.com/v1/cob/0123456789abcdef0123456789abcdef");
  const result=await validatePixPayload(code,124);
  assert.equal(result.dynamic,true);assert.equal(result.amount,124);assert.equal(result.receiverName,"NIVURA PAGOU LTDA");assert.equal(result.expiresInSeconds,300);
 }finally{global.fetch=original}
});
test("Pix dinâmico bloqueia cobrança 404 sem liberar",async()=>{
 const original=global.fetch;global.fetch=async()=>new Response(JSON.stringify({code:"404",message:"Resource not found"}),{status:404,headers:{"content-type":"application/json"}});
 try{
  const code=dynamicCode("qrcode.gowd.com/v1/cob/01a20e550f6f7635b6f0d2145bd7c386");
  await assert.rejects(validatePixPayload(code,124),/não foi encontrada ou expirou/);
 }finally{global.fetch=original}
});
test("Pix dinâmico rejeita domínio não autorizado antes de consultar",async()=>{
 const code=dynamicCode("attacker.example/v1/cob/0123456789abcdef0123456789abcdef");
 await assert.rejects(validatePixPayload(code,124),/não está autorizado/);
});
test("Pix dinâmico rejeita cobrança ativa com valor divergente",async()=>{
 const original=global.fetch;global.fetch=async()=>new Response(JSON.stringify({status:"ATIVA",valor:{original:"125.00"}}),{status:200,headers:{"content-type":"application/json"}});
 try{await assert.rejects(validatePixPayload(dynamicCode("qrcode.gowd.com/v1/cob/0123456789abcdef0123456789abcdef"),124),/pedido é/)}finally{global.fetch=original}
});
