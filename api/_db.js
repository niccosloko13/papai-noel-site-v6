const {Pool}=require("pg");
let pool;
function db(){
 const url=process.env.DATABASE_URL||process.env.POSTGRES_URL;
 if(!url)throw Error("DATABASE_NOT_CONFIGURED");
 if(!pool)pool=new Pool({connectionString:url,max:4,ssl:url.includes("localhost")?false:{rejectUnauthorized:true}});
 return pool;
}
async function init(){
 await db().query(`CREATE TABLE IF NOT EXISTS natal_orders (
 id text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(), status text NOT NULL,
 data jsonb NOT NULL
 )`);
 await db().query(`CREATE TABLE IF NOT EXISTS natal_settings (
 key text PRIMARY KEY, value jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
 )`);
}
module.exports={db,init};
