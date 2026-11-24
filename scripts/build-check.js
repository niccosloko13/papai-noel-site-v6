const fs=require("node:fs");
const path=require("node:path");
const cp=require("node:child_process");

const root=path.resolve(__dirname,"..");
const dist=path.join(root,"dist");

const required=[
  "index.html","checkout.html","admin.html","pedido.html","pedido-processando.html","pagamento-pedido.html","contato.html","minha-conta.html","entrega-e-prazos.html","trocas-e-devolucoes.html","privacidade.html","termos-de-compra.html",
  "app.js","checkout-page.js","admin.js","store-data.js","pix.js","analytics.js","meta-pixel.js","lareira-feliz.js","product-gallery.js","marketplace-links.js",
  "styles.css","lareira-feliz.css","product-gallery.css","checkout-own.css","admin.css","checkout-premium.css","customer-experience.css","conversion-refresh.css","hero-rebuild.css","premium-experience.css","hero-clean.css","hero-poster-2026.css","holiday-sections.css","postal-christmas.css","mobile-shopping.css",
  "robots.txt","sitemap.xml",
  "api/_db.js","api/_pix.js","api/cep.js","api/loggi-quote.js","api/checkout.js","api/admin/auth.js",
  "api/admin/orders.js","api/admin/settings.js",
  "api/order-status.js","api/events.js","api/admin/analytics.js","api/admin/summary.js","api/admin/checkout-health.js","api/_customer.js","api/customer/auth.js","api/customer/orders.js"
];

for(const rel of required){
  const full=path.join(root,rel);
  if(!fs.existsSync(full))throw new Error("Missing required file: "+rel);
}

const jsFiles=required.filter(x=>x.endsWith(".js"));
for(const rel of jsFiles){
  cp.execFileSync(process.execPath,["--check",path.join(root,rel)],{stdio:"inherit"});
}

cp.execFileSync(process.execPath,["--test",path.join(root,"tests/pix-payload.test.js"),path.join(root,"tests/admin-navigation.test.js"),path.join(root,"tests/manual-pix-flow.test.js"),path.join(root,"tests/cep-proxy.test.js"),path.join(root,"tests/checkout-flow-ui.test.js"),path.join(root,"tests/loggi-estimate.test.js"),path.join(root,"tests/db-init-race.test.js"),path.join(root,"tests/product-gallery.test.js")],{stdio:"inherit"});

const pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
if(!pkg.dependencies?.["@neondatabase/serverless"])throw new Error("Missing @neondatabase/serverless dependency");
if(!pkg.dependencies?.["@neondatabase/config"])throw new Error("Missing @neondatabase/config dependency");

fs.rmSync(dist,{recursive:true,force:true});
fs.mkdirSync(dist,{recursive:true});

const staticFiles=[
  "index.html","checkout.html","admin.html","pedido.html","pedido-processando.html","pagamento-pedido.html","contato.html","minha-conta.html","entrega-e-prazos.html","trocas-e-devolucoes.html","privacidade.html","termos-de-compra.html",
  "app.js","checkout-page.js","admin.js","store-data.js","pix.js","analytics.js","meta-pixel.js","lareira-feliz.js","product-gallery.js","marketplace-links.js",
  "styles.css","lareira-feliz.css","product-gallery.css","checkout-own.css","admin.css","checkout-premium.css","customer-experience.css","conversion-refresh.css",
  "hero-rebuild.css","premium-experience.css","hero-clean.css","hero-poster-2026.css","holiday-sections.css","postal-christmas.css","mobile-shopping.css",
  "robots.txt","sitemap.xml"
];
const staticDirs=["assets","vendor"];

for(const rel of staticFiles){
  fs.copyFileSync(path.join(root,rel),path.join(dist,rel));
}
for(const rel of staticDirs){
  fs.cpSync(path.join(root,rel),path.join(dist,rel),{recursive:true});
}

for(const rel of staticFiles){if(!fs.existsSync(path.join(dist,rel)))throw new Error("Build output missing "+rel);}
for(const rel of ["hero-poster-2026.css","premium-experience.css","checkout-premium.css"]){if(!fs.statSync(path.join(dist,rel)).size)throw new Error("Empty stylesheet "+rel);}
// Fail deployment if any local stylesheet requested by an HTML page is absent from dist.
for(const rel of staticFiles.filter(x=>x.endsWith(".html"))){
 const html=fs.readFileSync(path.join(dist,rel),"utf8");
 for(const match of html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)){
  const url=match[1].split("?")[0];
  if(/^(?:https?:)?\/\//.test(url)||url.startsWith("data:"))continue;
  const local=url.replace(/^\//,"");
  if(!fs.existsSync(path.join(dist,local)))throw new Error(rel+" references missing stylesheet "+local);
 }
}
for(const rel of ["assets/lareira-real-frente.jpeg","assets/lareira-real-lado-a.jpeg","assets/lareira-real-lado-b.jpeg","assets/lareira-real-video-sem-som.mp4"]){
 if(!fs.existsSync(path.join(dist,rel))||fs.statSync(path.join(dist,rel)).size<5000)throw new Error("Galeria: arquivo ausente ou vazio: "+rel);
}
if(!fs.existsSync(path.join(dist,"index.html")))throw new Error("dist/index.html was not generated");

console.log("Build passed.");
console.log("Static output:",dist);
console.log("Files validated:",required.length);
console.log("JavaScript syntax checked:",jsFiles.length);
