const {Pool}=require("pg");
let pool;

const ENV_KEYS=[
  "DATABASE_URL",
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
    acceptedEnvKeys:ENV_KEYS
  };
}

function db(){
  const info=connectionInfo();
  if(!info){
    const err=new Error("DATABASE_NOT_CONFIGURED");
    err.code="DATABASE_NOT_CONFIGURED";
    throw err;
  }
  if(!pool){
    const local=/localhost|127\.0\.0\.1/.test(info.value);
    pool=new Pool({
      connectionString:info.value,
      max:4,
      idleTimeoutMillis:10000,
      connectionTimeoutMillis:8000,
      ssl:local?false:{rejectUnauthorized:true}
    });
    pool.on("error",err=>console.error("Postgres pool error",err.code||err.message));
  }
  return pool;
}

async function init(){
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
}

module.exports={db,init,databaseStatus};
