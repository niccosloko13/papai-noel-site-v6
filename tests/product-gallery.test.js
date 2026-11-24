const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
test("carrossel exibe 4 fotos e 1 vídeo com botões acessíveis",()=>{
  const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
  assert.equal((html.match(/class="gallery-slide(?: is-current)?"/g)||[]).length,5);
  assert.equal((html.match(/data-gallery-index="/g)||[]).length,5);
  assert.match(html,/id="lareiraProductGallery"/);
  assert.match(html,/muted playsinline loop/);
  assert.match(html,/product-gallery\.js/);
  assert.match(html,/product-gallery\.css/);
});
test("loja mantém checkout, botão comprar e painel administrativo",()=>{
  const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
  assert.match(html,/class="own-buy" href="\/checkout\.html"/);
  assert.match(html,/class="price-action" href="\/checkout\.html"/);
  assert.ok(fs.existsSync(path.join(root,"checkout.html")));
  assert.ok(fs.existsSync(path.join(root,"admin.html")));
});
test("arquivos reais estão completos e vídeo é silencioso no elemento",()=>{
  const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
  for(const file of ["lareira-real-frente.jpeg","lareira-real-lado-a.jpeg","lareira-real-lado-b.jpeg","lareira-real-video-sem-som.mp4"]){
    const full=path.join(root,"assets",file);
    assert.ok(fs.existsSync(full),file);
    assert.ok(fs.statSync(full).size>5000,file);
    assert.match(html,new RegExp(file.replace(/\./g,"\\.")));
  }
  const script=fs.readFileSync(path.join(root,"product-gallery.js"),"utf8");
  assert.match(script,/video\.muted=true/);
  assert.match(script,/video\.volume=0/);
  assert.match(script,/isVideo\?11500:4700/);
});
