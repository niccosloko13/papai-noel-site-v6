const test=require("node:test");const assert=require("node:assert/strict");
const {buildPix,validatePixPayload,crc16}=require("../api/_pix");
test("Pix payload: standard fields, exact amount and valid CRC",()=>{
 const code=buildPix({key:"teste@example.com",receiverName:"Papai Noel Passou Aqui",city:"SAO PAULO",amount:124,txid:"NATALTESTE123456"});
 assert.ok(code.startsWith("000201"));
 assert.ok(code.includes("0014BR.GOV.BCB.PIX"));
 assert.ok(code.includes("5406124.00"));
 assert.ok(code.includes("5303986"));
 assert.ok(code.includes("5802BR"));
 assert.equal(code.slice(-4),crc16(code.slice(0,-4)));
 const result=validatePixPayload(code,124);
 assert.equal(result.amount,124);
 assert.equal(result.receiverName,"PAPAI NOEL PASSOU AQUI".slice(0,25));
 assert.equal(result.crcValid,true);
});
test("Pix rejects a different amount",()=>{
 const code=buildPix({key:"teste@example.com",receiverName:"Loja",city:"SAO PAULO",amount:123.99,txid:"NATALTESTE"});
 assert.throws(()=>validatePixPayload(code,124),/pedido é/);
});
test("Pix rejects an invalid CRC",()=>{
 const code=buildPix({key:"teste@example.com",receiverName:"Loja",city:"SAO PAULO",amount:124,txid:"NATALTESTE"});
 const invalid=code.slice(0,-1)+(code.endsWith("0")?"1":"0");
 assert.throws(()=>validatePixPayload(invalid,124),/assinatura do Pix não confere/);
});
test("Pix rejects missing or non-fixed amount",()=>{
 assert.throws(()=>validatePixPayload("",124),/vazio/);
 const code=buildPix({key:"teste@example.com",receiverName:"Loja",city:"SAO PAULO",amount:124,txid:"NATALTESTE"});
 const noAmount=code.replace("5406124.00","");
 const body=noAmount.slice(0,-8)+"6304";
 const withoutAmount=body+crc16(body);
 assert.throws(()=>validatePixPayload(withoutAmount,124),/não contém valor fixo/);
});
