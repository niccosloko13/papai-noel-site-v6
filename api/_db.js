const { neon } = require("@neondatabase/serverless");

let client = null;
let clientSource = null;
const ENV_KEYS = ["DATABASE_URL_POOLED","DATABASE_URL","DATABASE_URL_UNPOOLED","POSTGRES_URL","POSTGRES_URL_NON_POOLING","NEON_DATABASE_URL"];
function connectionInfo(){for(const key of ENV_KEYS){const value=(process.env[key]||"").trim();if(value)return {key,value}}return null}
function databaseStatus(){const info=connectionInfo();return {configured:!!info,source:info?.key||null,acceptedEnvKeys:ENV_KEYS,driver:"@neondatabase/serverless"}}
function getClient(){const info=connectionInfo();if(!info){const err=new Error("DATABASE_NOT_CONFIGURED");err.code="DATABASE_NOT_CONFIGURED";throw err}if(!client||clientSource!==info.value){client=neon(info.value);clientSource=info.value}return client}
function db(){return {async query(text,params=[]){const result=await getClient().query(text,params);const rows=Array.isArray(result)?result:(result?.rows||[]);return {rows,rowCount:Number.isInteger(result?.rowCount)?result.rowCount:rows.length}}}}
let initialized=false;
let initialization=null;
const schemaStatusSql=[
 "SELECT",
 "to_regclass('public.natal_orders') IS NOT NULL AS orders_ready,",
 "to_regclass('public.natal_settings') IS NOT NULL AS settings_ready,",
 "to_regclass('public.natal_admin_auth_limits') IS NOT NULL AS auth_limits_ready,",
 "to_regclass('public.natal_checkout_limits') IS NOT NULL AS checkout_limits_ready"
].join(" ");
function schemaReady(row){return !!(row?.orders_ready&&row?.settings_ready&&row?.auth_limits_ready&&row?.checkout_limits_ready)}
async function init(){
 if(initialized)return;
 if(initialization)return initialization;
 initialization=(async()=>{
  if(process.env.VERCEL_ENV==="preview"){
   const {rows}=await db().query(schemaStatusSql);
   if(!schemaReady(rows[0])){const err=new Error("DATABASE_SCHEMA_NOT_READY");err.code="DATABASE_SCHEMA_NOT_READY";throw err}
  }else{
   try{
    await db().query("CREATE TABLE IF NOT EXISTS natal_orders(id text PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),status text NOT NULL,data jsonb NOT NULL)");
    await db().query("CREATE TABLE IF NOT EXISTS natal_settings(key text PRIMARY KEY,value jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now())");
    await db().query("CREATE TABLE IF NOT EXISTS natal_admin_auth_limits(ip_hash text PRIMARY KEY,attempts integer NOT NULL,window_start timestamptz NOT NULL)");
    await db().query("CREATE TABLE IF NOT EXISTS natal_checkout_limits(ip_hash text PRIMARY KEY,attempts integer NOT NULL,window_start timestamptz NOT NULL)");
   }catch(error){
    // Concurrent serverless instances can race while creating the same
    // PostgreSQL catalog entries. Recover only if the complete schema exists.
    if(!["23505","42P07"].includes(error?.code))throw error;
    const {rows}=await db().query(schemaStatusSql);
    if(!schemaReady(rows[0]))throw error;
    console.warn("Database schema initialization race recovered",error.code);
   }
  }
  initialized=true;
 })();
 try{return await initialization}
 catch(error){initialization=null;throw error}
}
async function ping(){const {rows}=await db().query("SELECT now() AS now,current_database() AS database");return rows[0]||null}
module.exports={db,init,ping,databaseStatus};
