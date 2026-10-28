const {initCustomers,session,issue,cookie,hashPassword,checkPassword,validOrigin,validSecret,db,crypto}=require("../_customer");
module.exports=async function(req,res){
 res.setHeader("Cache-Control","no-store");res.setHeader("X-Robots-Tag","noindex");
 if(!validSecret())return res.status(503).json({error:"Acesso de clientes ainda não configurado"});
 if(req.method!=="GET"&&!validOrigin(req))return res.status(403).json({error:"Origem não autorizada"});
 try{
  if(req.method==="DELETE"){res.setHeader("Set-Cookie",cookie("",0));return res.json({ok:true})}
  if(req.method==="GET"){
   const id=session(req);if(!id)return res.status(200).json({authenticated:false});
   await initCustomers();const q=await db().query("SELECT id,name,email FROM natal_customers WHERE id=$1",[id]);return res.json({authenticated:!!q.rowCount,customer:q.rows[0]||null});
  }
  if(req.method!=="POST")return res.status(405).end();
  const {action,name,email,password}=req.body||{};
  const normalized=typeof email==="string"?email.trim().toLowerCase():"";
  if(normalized.length>150||!/^\S+@\S+\.\S+$/.test(normalized)||typeof password!=="string"||password.length<10||password.length>200)return res.status(400).json({error:"Informe um e-mail válido e uma senha de pelo menos 10 caracteres"});
  await initCustomers();
  let customer;
  if(action==="register"){
   if(typeof name!=="string"||name.trim().length<2||name.length>90)return res.status(400).json({error:"Informe seu nome"});
   const id=crypto.randomUUID();
   const stored=hashPassword(password);
   try{await db().query("INSERT INTO natal_customers(id,name,email,password_hash) VALUES($1,$2,$3,$4)",[id,name.trim(),normalized,stored])}catch(e){if(e.code==="23505")return res.status(409).json({error:"Este e-mail já está cadastrado"});throw e}
   customer={id,name:name.trim(),email:normalized};
  }else if(action==="login"){
   const key=crypto.createHash("sha256").update(normalized).digest("hex");
   const attempts=await db().query("SELECT failures,window_start FROM natal_customer_auth_limits WHERE key=$1",[key]);
   if(attempts.rowCount&&Number(attempts.rows[0].failures)>=8&&new Date(attempts.rows[0].window_start).getTime()>Date.now()-15*60000)return res.status(429).json({error:"Muitas tentativas. Aguarde 15 minutos para tentar novamente."});
   const q=await db().query("SELECT id,name,email,password_hash FROM natal_customers WHERE email=$1",[normalized]);
   if(!q.rowCount||!checkPassword(password,q.rows[0].password_hash)){
    await db().query("INSERT INTO natal_customer_auth_limits(key,failures,window_start) VALUES($1,1,now()) ON CONFLICT(key) DO UPDATE SET failures=CASE WHEN natal_customer_auth_limits.window_start < now()-interval '15 minutes' THEN 1 ELSE natal_customer_auth_limits.failures+1 END,window_start=CASE WHEN natal_customer_auth_limits.window_start < now()-interval '15 minutes' THEN now() ELSE natal_customer_auth_limits.window_start END",[key]);
    return res.status(401).json({error:"E-mail ou senha incorretos"});
   }
   await db().query("DELETE FROM natal_customer_auth_limits WHERE key=$1",[key]);
   customer={id:q.rows[0].id,name:q.rows[0].name,email:q.rows[0].email};
  }else return res.status(400).json({error:"Operação inválida"});
  res.setHeader("Set-Cookie",issue(customer.id));
  return res.status(200).json({authenticated:true,customer});
 }catch(e){console.error("Customer auth",e.code||e.message);return res.status(503).json({error:"Serviço de contas indisponível"})}
};