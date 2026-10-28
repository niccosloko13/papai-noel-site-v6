const fs=require("node:fs");
const path=require("node:path");
const cp=require("node:child_process");

const root=path.resolve(__dirname,"..");
const required=[
  "index.html","checkout.html","admin.html",
  "app.js","checkout-page.js","admin.js","store-data.js",
  "api/_db.js","api/checkout.js","api/admin/auth.js",
  "api/admin/orders.js","api/admin/settings.js"
];

for(const rel of required){
  const full=path.join(root,rel);
  if(!fs.existsSync(full))throw new Error("Missing required file: "+rel);
}

const jsFiles=required.filter(x=>x.endsWith(".js"));
for(const rel of jsFiles){
  cp.execFileSync(process.execPath,["--check",path.join(root,rel)],{stdio:"inherit"});
}

const pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
if(!pkg.dependencies?.["@neondatabase/serverless"])throw new Error("Missing @neondatabase/serverless dependency");
if(!pkg.dependencies?.["@neondatabase/config"])throw new Error("Missing @neondatabase/config dependency");

console.log("Build check passed:",required.length,"required files,",jsFiles.length,"JavaScript files syntax-checked.");
