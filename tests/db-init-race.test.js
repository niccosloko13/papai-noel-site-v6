const test=require("node:test");
const assert=require("node:assert/strict");
const Module=require("node:module");
const path=require("node:path");
const modulePath=path.join(__dirname,"..","api","_db.js");

async function withMockedDb(query,run){
 const originalLoad=Module._load;
 const oldUrl=process.env.DATABASE_URL;
 const oldEnv=process.env.VERCEL_ENV;
 process.env.DATABASE_URL="postgres://test.invalid/natal";
 process.env.VERCEL_ENV="production";
 Module._load=function(request,parent,isMain){
  if(request==="@neondatabase/serverless")return {neon:()=>({query})};
  return originalLoad.apply(this,arguments);
 };
 delete require.cache[modulePath];
 try{await run(require(modulePath))}
 finally{
  Module._load=originalLoad;
  delete require.cache[modulePath];
  if(oldUrl===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=oldUrl;
  if(oldEnv===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=oldEnv;
 }
}

test("database initialization is shared by concurrent requests in one instance",async()=>{
 let calls=0;
 await withMockedDb(async sql=>{
  calls++;
  await new Promise(resolve=>setTimeout(resolve,5));
  return [];
 },async({init})=>{
  await Promise.all([init(),init(),init(),init()]);
  assert.equal(calls,4,"only one set of four CREATE TABLE statements should run");
 });
});

test("database initialization recovers from a PostgreSQL DDL race only when all tables exist",async()=>{
 let creates=0,verified=false;
 await withMockedDb(async sql=>{
  if(sql.startsWith("CREATE TABLE")){
   creates++;
   const error=new Error("duplicate catalog key");error.code="23505";throw error;
  }
  if(sql.includes("to_regclass")){
   verified=true;
   return [{orders_ready:true,settings_ready:true,auth_limits_ready:true,checkout_limits_ready:true}];
  }
  throw new Error("Unexpected SQL in test");
 },async({init})=>{
  await init();
  assert.equal(creates,1);
  assert.equal(verified,true);
 });
});

test("database initialization does not hide a DDL conflict when schema is incomplete",async()=>{
 await withMockedDb(async sql=>{
  if(sql.startsWith("CREATE TABLE")){const error=new Error("duplicate catalog key");error.code="23505";throw error}
  if(sql.includes("to_regclass"))return [{orders_ready:true,settings_ready:false,auth_limits_ready:true,checkout_limits_ready:true}];
  throw new Error("Unexpected SQL in test");
 },async({init})=>{
  await assert.rejects(init,error=>error.code==="23505");
 });
});
