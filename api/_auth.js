const crypto = require("node:crypto");
const COOKIE="natal_admin";
function settings(){
 const secret=process.env.ADMIN_SESSION_SECRET||"";
 const hash=process.env.ADMIN_PASSWORD_SCRYPT||"";
 if(secret.length<32||!hash.includes(":"))return null;
 return {secret,hash,user:process.env.ADMIN_USERNAME||"admin"};
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
function authenticate(password,hash){
 try{const [salt,digest]=hash.split(":");const expected=Buffer.from(digest,"hex");if(expected.length!==64)return false;const actual=crypto.scryptSync(String(password),salt,64);return crypto.timingSafeEqual(actual,expected)}catch{return false}
}
module.exports={settings,valid,cookie,sign,authenticate};
