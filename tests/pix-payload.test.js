const test=require("node:test");const assert=require("node:assert/strict");
const {buildPix,validatePixPayload,crc16}=require("../api/_pix");
function tlv(id,value){return id+String(value.length).padStart(2,"0")+value}
function dynamicCode(url,amount=""){
 const merchant=tlv("00","br.gov.bcb.pix")+tlv("25",url);
 const body=tlv("00","01")+tlv("01","12")+tlv("26",merchant)+tlv("52","0000")+tlv("53","986")+(amount?tlv("54",amount):"")+tlv("58","BR")+tlv("59","NIVURA PAGOU LTDA")+tlv("60","Sao Paulo")+tlv("62",tlv("05","***"))+"6304";
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
test("Pix dinâmico de qualquer provedor HTTPS é aceito sem chamada externa",async()=>{
 const original=global.fetch;let fetched=false;global.fetch=async()=>{fetched=true;throw Error("Não deve consultar o provedor")};
 try{
  for(const url of ["qrcode.hyperwalletip.com.br/dynamic/f7354598-6614-4f9d-b08d-68edf98a3637","pix.novobanco.com.br/cob/0123456789abcdef0123456789abcdef?ref=loja","https://pagamentos.outro-provedor.com.br/pix/abc123"]){
   const result=await validatePixPayload(dynamicCode(url),124);
   assert.equal(result.dynamic,true);assert.equal(result.amount,null);assert.equal(result.receiverName,"NIVURA PAGOU LTDA");assert.equal(result.crcValid,true);
  }
  assert.equal(fetched,false,"validação não deve acessar URLs externas");
 }finally{global.fetch=original}
});
test("Pix dinâmico exato da SINPAY é aceito com CRC 79F0",async()=>{
 const code="00020101021226940014br.gov.bcb.pix2572qrcode.hyperwalletip.com.br/dynamic/f7354598-6614-4f9d-b08d-68edf98a36375204000053039865802BR5911SINPAY LTDA6008Brasilia62070503***630479F0";
 const result=await validatePixPayload(code,124);
 assert.equal(result.dynamic,true);assert.equal(result.amount,null);assert.equal(result.receiverName,"SINPAY LTDA");assert.equal(result.city,"Brasilia");assert.equal(result.crcValid,true);
});
test("Pix dinâmico com valor embutido confere o total do pedido",async()=>{
 const result=await validatePixPayload(dynamicCode("pix.banco.com.br/cob/abc123","124.00"),124);
 assert.equal(result.dynamic,true);assert.equal(result.amount,124);
 await assert.rejects(validatePixPayload(dynamicCode("pix.banco.com.br/cob/abc123","125.00"),124),/pedido é/);
});
test("Pix dinâmico rejeita URL não HTTPS ou malformada",async()=>{
 for(const url of ["javascript:alert(1)","http://localhost/pix","not a url with spaces"]){
  await assert.rejects(validatePixPayload(dynamicCode(url),124),/URL deste Pix dinâmico/);
 }
});
