const fs=require("node:fs");
const path=require("node:path");
const cp=require("node:child_process");

const root=path.resolve(__dirname,"..");
const dist=path.join(root,"dist");

const required=[
  "index.html","checkout.html","admin.html","pedido.html","contato.html","minha-conta.html","entrega-e-prazos.html","trocas-e-devolucoes.html","privacidade.html","termos-de-compra.html",
  "app.js","checkout-page.js","admin.js","store-data.js","pix.js","analytics.js",
  "styles.css","admin.css","checkout-premium.css","customer-experience.css",
  "robots.txt","sitemap.xml",
  "api/_db.js","api/checkout.js","api/admin/auth.js",
  "api/admin/orders.js","api/admin/settings.js",
  "api/order-status.js","api/events.js","api/admin/analytics.js","api/admin/summary.js","api/_customer.js","api/customer/auth.js","api/customer/orders.js"
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

fs.rmSync(dist,{recursive:true,force:true});
fs.mkdirSync(dist,{recursive:true});

const staticFiles=[
  "index.html","checkout.html","admin.html","pedido.html","contato.html","minha-conta.html","entrega-e-prazos.html","trocas-e-devolucoes.html","privacidade.html","termos-de-compra.html",
  "app.js","checkout-page.js","admin.js","store-data.js","pix.js","analytics.js",
  "styles.css","admin.css","checkout-premium.css","customer-experience.css",
  "robots.txt","sitemap.xml"
];
const staticDirs=["assets","vendor"];

for(const rel of staticFiles){
  fs.copyFileSync(path.join(root,rel),path.join(dist,rel));
}
for(const rel of staticDirs){
  fs.cpSync(path.join(root,rel),path.join(dist,rel),{recursive:true});
}

if(!fs.existsSync(path.join(dist,"index.html")))throw new Error("dist/index.html was not generated");

console.log("Build passed.");
console.log("Static output:",dist);
console.log("Files validated:",required.length);
console.log("JavaScript syntax checked:",jsFiles.length);
