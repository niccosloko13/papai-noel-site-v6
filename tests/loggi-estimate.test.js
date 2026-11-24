const test=require("node:test");
const assert=require("node:assert/strict");
const handler=require("../api/loggi-quote");
function response(){return {statusCode:200,headers:{},body:null,setHeader(k,v){this.headers[k]=v},status(n){this.statusCode=n;return this},json(v){this.body=v;return this},end(){return this}}}
test("Loggi regional estimate returns working days for São Paulo CEP",async()=>{
 const res=response();await handler({method:"GET",query:{cep:"01001000"}},res);
 assert.equal(res.statusCode,200);assert.equal(res.body.available,true);
 assert.equal(res.body.daysMin,1);assert.equal(res.body.daysMax,3);
 assert.equal(res.body.unit,"dias úteis");assert.equal(res.body.package.weightKg,1);
});
test("Loggi regional estimate handles invalid CEP",async()=>{
 const res=response();await handler({method:"GET",query:{cep:"123"}},res);
 assert.equal(res.statusCode,400);assert.equal(res.body.available,false);
});
test("Loggi regional estimate returns region band for other Brazilian destinations",async()=>{
 const res=response();await handler({method:"GET",query:{cep:"30140071"}},res);
 assert.equal(res.statusCode,200);assert.equal(res.body.available,true);
 assert.equal(res.body.destinationRegion,"Minas Gerais");assert.equal(res.body.daysMin,3);assert.equal(res.body.daysMax,6);
});
