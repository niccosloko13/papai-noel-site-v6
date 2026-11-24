const test=require("node:test");
const assert=require("node:assert/strict");
const crypto=require("node:crypto");
const {buildPix,validatePixPayload}=require("../api/_pix");

test("fluxo completo simulado: pedido -> Pix validado -> aprovação -> cliente vê código",async()=>{
 const orderId="NATAL-A1B2C3D4E5F6";
 const secret="a".repeat(64);
 const record={id:orderId,status:"Aguardando QR Code",data:{
  customerName:"CLIENTE TESTE",total:124,quantity:1,
  paymentClaimHash:crypto.createHash("sha256").update(secret).digest("hex")
 }};
 const saved=[];
 const fakeDb={
  async query(sql,params=[]){
   saved.push(sql);
   if(sql.startsWith("SELECT status,data,created_at FROM natal_orders")||sql.startsWith("SELECT status,data FROM natal_orders")){
    return {rows:[{status:record.status,data:structuredClone(record.data),created_at:new Date()}],rowCount:1};
   }
   if(sql.startsWith("UPDATE natal_orders SET data=data||")){
    if(record.status!=="Aguardando QR Code")return {rows:[],rowCount:0};
    Object.assign(record.data,JSON.parse(params[1]));return {rows:[{id:orderId}],rowCount:1};
   }
   if(sql.startsWith("UPDATE natal_orders SET status='Aguardando pagamento'")){
    if(record.status!=="Aguardando QR Code")return {rows:[],rowCount:0};
    record.status="Aguardando pagamento";Object.assign(record.data,JSON.parse(params[1]));
    return {rows:[{id:orderId}],rowCount:1};
   }
   if(sql.startsWith("UPDATE natal_orders SET status='Expirado'")){record.status="Expirado";return {rows:[],rowCount:1}}
   throw Error("SQL não simulado: "+sql.slice(0,120));
  }
 };
 const dbPath=require.resolve("../api/_db"),authPath=require.resolve("../api/_auth");
 const customerPath=require.resolve("../api/_customer"),eventsPath=require.resolve("../api/events");
 const originals=[dbPath,authPath,customerPath,eventsPath].map(k=>[k,require.cache[k]]);
 const put=(file,exports)=>{require.cache[file]={id:file,filename:file,loaded:true,exports}};
 put(dbPath,{db:()=>fakeDb,init:async()=>{}});
 put(authPath,{valid:()=>true});
 put(customerPath,{session:()=>null,initCustomers:async()=>{},validOrigin:()=>true,crypto});
 put(eventsPath,{initEvents:async()=>{}});
 const ordersPath=require.resolve("../api/admin/orders");
 const paymentPath=require.resolve("../api/customer/payment");
 delete require.cache[ordersPath];delete require.cache[paymentPath];
 try{
  const admin=require(ordersPath),customer=require(paymentPath);
  async function call(handler,method,body){
   const req={method,body,headers:{origin:"https://preview.local",host:"preview.local"}};
   const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.statusCode=n;return this},json(v){this.body=v;return this},end(){return this}};
   await handler(req,res);return res;
  }
  const read=()=>call(customer,"POST",{id:orderId,accessKey:secret});
  let before=await read();
  assert.equal(before.statusCode,200);
  assert.equal(before.body.waitingForPix,true);
  assert.equal(before.body.canPay,false);
  assert.equal(before.body.pixPayload,undefined,"cliente não vê Pix antes da autorização");
  const fakeCode=buildPix({key:"teste@example.com",receiverName:"RECEBEDOR TESTE",city:"SAO PAULO",amount:124,txid:"NATALTESTE"});
  assert.equal(validatePixPayload(fakeCode,124).crcValid,true);
  const wrongCode=buildPix({key:"teste@example.com",receiverName:"RECEBEDOR TESTE",city:"SAO PAULO",amount:125,txid:"NATALTESTE"});
  let response=await call(admin,"PATCH",{id:orderId,action:"prepare-pix",pixPayload:wrongCode});
  assert.equal(response.statusCode,400,"Pix de valor incorreto deve ser rejeitado");
  assert.equal(record.data.pixPayloadDraft,undefined);
  response=await call(admin,"PATCH",{id:orderId,action:"release-pix"});
  assert.equal(response.statusCode,400,"não pode liberar sem validar o Pix");
  response=await call(admin,"PATCH",{id:orderId,action:"prepare-pix",pixPayload:fakeCode});
  assert.equal(response.statusCode,200,response.body?.error);
  assert.equal(response.body.validation.amount,124);
  assert.equal(response.body.validation.receiverName,"RECEBEDOR TESTE");
  assert.equal(record.status,"Aguardando QR Code","validação não libera o pedido");
  before=await read();
  assert.equal(before.body.canPay,false,"cliente continua aguardando aprovação");
  assert.equal(before.body.pixPayload,undefined);
  const releasedBefore=Date.now();
  response=await call(admin,"PATCH",{id:orderId,action:"release-pix"});
  assert.equal(response.statusCode,200,response.body?.error);
  assert.equal(record.status,"Aguardando pagamento");
  const until=Date.parse(response.body.expiresAt);
  assert.ok(until-releasedBefore>=239000 && until-releasedBefore<=242000,"prazo de Pix deve ser ~4 minutos");
  const after=await read();
  assert.equal(after.statusCode,200);
  assert.equal(after.body.canPay,true);
  assert.equal(after.body.pixPayload,fakeCode,"cliente recebe exatamente o código validado");
  assert.equal(after.body.amount,124);
  assert.equal(after.body.receiverName,"RECEBEDOR TESTE");
  assert.equal(validatePixPayload(after.body.pixPayload,124).crcValid,true);
  assert.equal(saved.filter(q=>q.startsWith("UPDATE natal_orders SET status='Aguardando pagamento'")).length,1);
 }finally{
  delete require.cache[ordersPath];delete require.cache[paymentPath];
  for(const [path,entry] of originals){if(entry)require.cache[path]=entry;else delete require.cache[path]}
 }
});
