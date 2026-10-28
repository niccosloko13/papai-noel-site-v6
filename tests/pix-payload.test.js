const test=require("node:test");const assert=require("node:assert/strict");
const {buildPix}=require("../api/_pix");
function crc16(payload){let crc=65535;for(const c of payload){crc^=c.charCodeAt(0)<<8;for(let j=0;j<8;j++)crc=(crc&32768)?((crc<<1)^4129)&65535:(crc<<1)&65535}return crc.toString(16).toUpperCase().padStart(4,"0")}
test("Pix payload: standard fields, correct amount and CRC",()=>{
const code=buildPix({key:"teste@example.com",receiverName:"Papai Noel Passou Aqui",city:"SAO PAULO",amount:59.42,txid:"NATALTESTE123456"});
assert.ok(code.startsWith("000201"));
assert.ok(code.includes("0014BR.GOV.BCB.PIX"));
assert.ok(code.includes("540559.42"));
assert.ok(code.includes("5303986"));
assert.ok(code.includes("5802BR"));
assert.equal(code.slice(-4),crc16(code.slice(0,-4)));
assert.ok(code.length<400);
});
test("Pix rejects zero or missing payment info",()=>{
assert.throws(()=>buildPix({key:"",receiverName:"Loja",amount:10,txid:"AAA"}));
assert.throws(()=>buildPix({key:"pix@example.com",receiverName:"Loja",amount:0,txid:"AAA"}));
});
