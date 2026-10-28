const {settings,configurationStatus,valid,cookie,sign,authenticate}=require("../_auth");
module.exports=async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 res.setHeader("X-Content-Type-Options","nosniff");
 if(req.method==="GET")return res.status(200).json({authenticated:valid(req),...configurationStatus()});
 if(req.method==="DELETE"){res.setHeader("Set-Cookie",cookie("",0));return res.status(200).json({ok:true})}
 if(req.method!=="POST"){res.setHeader("Allow","GET,POST,DELETE");return res.status(405).json({error:"Method not allowed"})}
 const cfg=settings();if(!cfg)return res.status(503).json({error:"Configuração do acesso administrativo incompleta.",...configurationStatus()});
 const {username,password}=req.body||{};
 if(typeof username!=="string"||typeof password!=="string"||password.length>200)return res.status(400).json({error:"Credenciais inválidas"});
 const goodName=Buffer.from(username);const expected=Buffer.from(cfg.user);
 const sameName=goodName.length===expected.length&&require("node:crypto").timingSafeEqual(goodName,expected);
 if(!sameName||!authenticate(password,cfg.hash,cfg.password))return res.status(401).json({error:"Usuário ou senha incorretos"});
 const body=Buffer.from(JSON.stringify({sub:cfg.user,exp:Date.now()+8*60*60*1000})).toString("base64url");
 res.setHeader("Set-Cookie",cookie(body+"."+sign(body,cfg.secret),28800));
 return res.status(200).json({authenticated:true});
};