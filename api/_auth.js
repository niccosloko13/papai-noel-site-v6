const crypto = require("node:crypto");
const COOKIE="natal_admin";
function configurationStatus(){
 const missing=[];
 if(!(process.env.ADMIN_USERNAME||"").trim())missing.push("ADMIN_USERNAME");
 if(!process.env.ADMIN_PASSWORD&&!process.env.ADMIN_PASSWORD_SCRYPT)missing.push("ADMIN_PASSWORD");
 if(!(process.env.ADMIN_SESSION_SECRET||""))missing.push("ADMIN_SESSION_SECRET");
 const invalid=[];
 if(process.env.ADMIN_PASSWORD&&process.env.ADMIN_PASSWORD.length<8)invalid.push("ADMIN_PASSWORD");
 if(process.env.ADMIN_SESSION_SECRET&&process.env.ADMIN_SESSION_SECRET.length<32)invalid.push("ADMIN_SESSION_SECRET");
 if(!process.env.ADMIN_PASSWORD&&process.env.ADMIN_PASSWORD_SCRYPT&&!/^[0-9a-f]+:[0-9a-f]{128}$/i.test(process.env.ADMIN_PASSWORD_SCRYPT))invalid.push("ADMIN_PASSWORD_SCRYPT");
 return {configured:missing.length===0&&invalid.length===0,missing,invalid};
}
function settings(){
 const secret=process.env.ADMIN_SESSION_SECRET||"";
 const hash=process.env.ADMIN_PASSWORD_SCRYPT||"";
 const password=process.env.ADMIN_PASSWORD||"";
 const user=process.env.ADMIN_USERNAME||"";
 if(!configurationStatus().configured)return null;
 return {secret,hash,password,user};
}
function sign(value,secret){return crypto.createHmac("sha256",secret).update(value).digest("base64url")}
function parse(req){const raw=(req.headers.cookie||"").split(";").map(s=>s.trim()).find(s=>s.startsWith(COOKIE+"="));return raw?raw.slice(COOKIE.length+1):""}
function valid(req){
 const cfg=settings();if(!cfg)return false;
 const parts=parse(req).split(".");if(parts.length!==2)return false;
 const [body,sig]=parts;const expected=sign(body,cfg.secret);
 if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return false;
 try{const token=JSON.parse(Buffer.from(body,"base64url").toString());return token.sub===cfg.user&&token.exp>Date.now()}catch{return false}
}
function cookie(value,maxAge){return `${COOKIE}=${value}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`}
function authenticate(password,hash,privatePassword){
 if(privatePassword){
  try{
   const salt="natal-admin-server-only-v1";
   const actual=crypto.scryptSync(String(password),salt,64);
   const expected=crypto.scryptSync(privatePassword,salt,64);
   return crypto.timingSafeEqual(actual,expected);
  }catch{return false}
 }

 try{const [salt,digest]=hash.split(":");const expected=Buffer.from(digest,"hex");if(expected.length!==64)return false;const actual=crypto.scryptSync(String(password),salt,64);return crypto.timingSafeEqual(actual,expected)}catch{return false}
}
module.exports={settings,configurationStatus,valid,cookie,sign,authenticate};
