const crypto=require("node:crypto");
const {db,init}=require("./_db");
const COOKIE="natal_customer";
const secret=()=>process.env.CUSTOMER_SESSION_SECRET||process.env.ADMIN_SESSION_SECRET||"";
const validSecret=()=>secret().length>=32;
async function initCustomers(){
 await init();
 await db().query(`CREATE TABLE IF NOT EXISTS natal_customers (
 id text PRIMARY KEY, name text NOT NULL, email text UNIQUE NOT NULL,
 password_hash text NOT NULL, created_at timestamptz DEFAULT now()
 )`);
 await db().query(`CREATE TABLE IF NOT EXISTS natal_customer_orders (
 customer_id text NOT NULL REFERENCES natal_customers(id), order_id text NOT NULL REFERENCES natal_orders(id),
 created_at timestamptz DEFAULT now(), PRIMARY KEY(customer_id,order_id)
 )`);
}
function sign(body){return crypto.createHmac("sha256",secret()).update(body).digest("base64url")}
function cookie(value,age){return `${COOKIE}=${value}; Path=/api/customer; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`}
function session(req){
 if(!validSecret())return null;
 const pair=(req.headers.cookie||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(COOKIE+"="));
 if(!pair)return null;
 const parts=pair.slice(COOKIE.length+1).split(".");
 if(parts.length!==2)return null;
 const expected=sign(parts[0]);
 if(parts[1].length!==expected.length||!crypto.timingSafeEqual(Buffer.from(parts[1]),Buffer.from(expected)))return null;
 try{const data=JSON.parse(Buffer.from(parts[0],"base64url").toString());return typeof data.id==="string"&&data.exp>Date.now()?data.id:null}catch{return null}
}
function issue(id){const body=Buffer.from(JSON.stringify({id,exp:Date.now()+7*86400000})).toString("base64url");return cookie(body+"."+sign(body),7*86400)}
function hashPassword(password,salt=crypto.randomBytes(16).toString("hex")){return salt+":"+crypto.scryptSync(password,salt,64).toString("hex")}
function checkPassword(password,stored){try{const [salt,h]=stored.split(":");const expected=Buffer.from(h,"hex"),actual=crypto.scryptSync(password,salt,64);return expected.length===64&&crypto.timingSafeEqual(expected,actual)}catch{return false}}
function validOrigin(req){const origin=req.headers.origin;return !origin||origin===("https://"+req.headers.host)||/^http:\/\/localhost(:\d+)?$/.test(origin)}
module.exports={initCustomers,session,issue,cookie,hashPassword,checkPassword,validOrigin,validSecret,db,crypto};
