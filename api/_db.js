const { neon } = require("@neondatabase/serverless");

let client = null;
let clientSource = null;

const ENV_KEYS = [
  "DATABASE_URL",
  "DATABASE_URL_POOLED",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "NEON_DATABASE_URL"
];

function connectionInfo(){
  for(const key of ENV_KEYS){
    const value=(process.env[key]||"").trim();
    if(value)return {key,value};
  }
  return null;
}

function databaseStatus(){
  const info=connectionInfo();
  return {
    configured:!!info,
    source:info?.key||null,
    acceptedEnvKeys:ENV_KEYS,
    driver:"@neondatabase/serverless"
  };
}

function getClient(){
  const info=connectionInfo();
  if(!info){
    const err=new Error("DATABASE_NOT_CONFIGURED");
    err.code="DATABASE_NOT_CONFIGURED";
    throw err;
  }
  if(!client||clientSource!==info.value){
    client=neon(info.value);
    clientSource=info.value;
  }
  return client;
}

function db(){
  return {
    async query(text,params=[]){
      const sql=getClient();
      const result=await sql.query(text,params);
      const rows=Array.isArray(result)?result:(result?.rows||[]);
      return {
        rows,
        rowCount:Number.isInteger(result?.rowCount)?result.rowCount:rows.length
      };
    }
  };
}

let initialized=false;
async function init(){
  if(initialized)return;
  await db().query(`CREATE TABLE IF NOT EXISTS natal_orders (
    id text PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    status text NOT NULL,
    data jsonb NOT NULL
  )`);
  await db().query(`CREATE TABLE IF NOT EXISTS natal_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);
  initialized=true;
}

async function ping(){
  const {rows}=await db().query("SELECT now() AS now, current_database() AS database");
  return rows[0]||null;
}

module.exports={db,init,ping,databaseStatus};
