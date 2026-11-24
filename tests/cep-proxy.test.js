const test=require("node:test");
const assert=require("node:assert/strict");
const handler=require("../api/cep");
function response(){
 return {statusCode:200,headers:{},body:null,setHeader(k,v){this.headers[k]=v},status(n){this.statusCode=n;return this},json(v){this.body=v;return this},end(){return this}};
}
test("CEP proxy validates input and returns normalized address",async()=>{
 const original=global.fetch;
 global.fetch=async url=>({ok:true,status:200,json:async()=>({cep:"01001-000",logradouro:"Praça da Sé",bairro:"Sé",localidade:"São Paulo",uf:"SP"})});
 try{
  const res=response();await handler({method:"GET",query:{cep:"01001-000"}},res);
  assert.equal(res.statusCode,200);assert.equal(res.body.ok,true);
  assert.equal(res.body.address,"Praça da Sé");assert.equal(res.body.city,"São Paulo");assert.equal(res.body.state,"SP");
  assert.match(res.headers["Cache-Control"],/s-maxage=3600/);
 }finally{global.fetch=original}
});
test("CEP proxy rejects malformed CEP without calling upstream",async()=>{
 const original=global.fetch;let called=false;global.fetch=async()=>{called=true};
 try{const res=response();await handler({method:"GET",query:{cep:"123"}},res);assert.equal(res.statusCode,400);assert.equal(called,false)}
 finally{global.fetch=original}
});
test("CEP proxy returns not found for unknown CEP",async()=>{
 const original=global.fetch;global.fetch=async()=>({ok:true,status:200,json:async()=>({erro:true})});
 try{const res=response();await handler({method:"GET",query:{cep:"99999999"}},res);assert.equal(res.statusCode,404);assert.equal(res.body.error,"CEP não encontrado")}
 finally{global.fetch=original}
});
test("CEP proxy reports upstream failure without exposing internals",async()=>{
 const original=global.fetch;global.fetch=async()=>{throw Error("network down")};
 try{const res=response();await handler({method:"GET",query:{cep:"01001000"}},res);assert.equal(res.statusCode,503);assert.match(res.body.error,/consultar o CEP/)}
 finally{global.fetch=original}
});
