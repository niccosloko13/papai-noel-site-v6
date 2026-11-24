const crypto = require("node:crypto");
const COOKIE="natal_admin";
function configurationStatus(){
 const missing=[];
 if(!(process.env.ADMIN_USERNAME||"").trim())missing.push("ADMIN_USERNAME");
 if(!process.env.ADMIN_PASSWORD&&!process.env.ADMIN_PASSWORD_SCRYPT)missing.push("ADMIN_PASSWORD");
 if(!(process.env.ADMIN_SESSION_SECRET||""))missing.push("ADMIN_SESSION_SECRET");
 const invalid=[];
 const temporaryExpiresAt=process.env.ADMIN_TEMP_EXPIRES_AT||"";
 if(temporaryExpiresAt){
  const expiry=Date.parse(temporaryExpiresAt);
  if(process.env.VERCEL_ENV!=="preview"||!Number.isFinite(expiry))invalid.push("ADMIN_TEMP_EXPIRES_AT");
  else if(expiry<=Date.now())invalid.push("ADMIN_TEMP_EXPIRED");
 }
 if(process.env.ADMIN_PASSWORD&&process.env.ADMIN_PASSWORD.length<7)invalid.push("ADMIN_PASSWORD");
 if(process.env.ADMIN_SESSION_SECRET&&process.env.ADMIN_SESSION_SECRET.length<32)invalid.push("ADMIN_SESSION_SECRET");
 if(!process.env.ADMIN_PASSWORD&&process.env.ADMIN_PASSWORD_SCRYPT&&!/^[0-9a-f]+:[0-9a-f]{128}$/i.test(process.env.ADMIN_PASSWORD_SCRYPT))invalid.push("ADMIN_PASSWORD_SCRYPT");
 return {configured:missing.length===0&&invalid.length===0,missing,invalid,temporary:!!temporaryExpiresAt,expiresAt:temporaryExpiresAt||null};
}
function settings(){
 const secret=process.env.ADMIN_SESSION_SECRET||"";
 const hash=process.env.ADMIN_PASSWORD_SCRYPT||"";
 const password=process.env.ADMIN_PASSWORD||"";
 const user=process.env.ADMIN_USERNAME||"";
 if(!configurationStatus().configured)return null;
 return {secret,hash,password,user,temporaryExpiresAt:process.env.ADMIN_TEMP_EXPIRES_AT||null};
}
function sign(value,secret){return crypto.createHmac("sha256",secret).update(value).digest("base64url")}
function parse(req){const raw=(req.headers.cookie||"").split(";").map(s=>s.trim()).find(s=>s.startsWith(COOKIE+"="));return raw?raw.slice(COOKIE.length+1):""}
function trustedOrigin(req){
 const {origin,host}=req.headers;
 return req.headers["sec-fetch-site"]!=="cross-site" &&
  (!origin||origin==="https://"+host||
   (process.env.VERCEL_ENV!=="production"&&/^http:\/\/localhost(?::\d+)?$/.test(origin)));
}
function valid(req){
 if(req.method!=="GET"&&!trustedOrigin(req))return false;
 const cfg=settings();if(!cfg)return false;
 const parts=parse(req).split(".");if(parts.length!==2)return false;
 const [body,sig]=parts;const expected=sign(body,cfg.secret);
 if(!/^[A-Za-z0-9_-]{43}$/.test(sig)||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return false;
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
module.exports={settings,configurationStatus,valid,cookie,sign,authenticate,trustedOrigin};
