const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
test("checkout uses same-origin CEP proxy and triggers estimate after address number/complement",()=>{
 const source=fs.readFileSync(path.join(root,"checkout-page.js"),"utf8");
 const html=fs.readFileSync(path.join(root,"checkout.html"),"utf8");
 assert.match(source,/fetch\("\/api\/cep\?cep="/);
 assert.doesNotMatch(source,/https:\/\/viacep\.com\.br\/ws/);
 assert.match(source,/field\.addEventListener\("input",scheduleLoggiQuote\)/);
 assert.match(source,/fetch\("\/api\/loggi-quote\?cep="/);
 assert.match(source,/card\.hidden=false;status\.textContent="Consultando o prazo estimado da Loggi/);
 assert.match(html,/id="loggiEstimateCard"[^>]*hidden/);
 assert.match(html,/não é cotação em tempo real da transportadora/);
});
test("processing page has a clean invalid-link state",()=>{
 const source=fs.readFileSync(path.join(root,"pedido-processando.html"),"utf8");
 assert.match(source,/Não encontramos seu pedido/);
 assert.match(source,/document\.querySelector\("\.steps"\)\.style\.display="none"/);
 assert.match(source,/Confira o link recebido após a confirmação da compra/);
});

test("checkout mantém estimativa Loggi e frete grátis com vídeo em coluna e suporte WhatsApp",()=>{
 const html=fs.readFileSync(path.join(root,"checkout.html"),"utf8");
 const css=fs.readFileSync(path.join(root,"checkout-own.css"),"utf8");
 const js=fs.readFileSync(path.join(root,"checkout-page.js"),"utf8");
 assert.match(html,/id="checkoutProductVideo" autoplay muted playsinline webkit-playsinline loop preload="auto"/);
 assert.match(html,/lareira-real-video-sem-som\.mp4/);
 assert.match(html,/id="loggiEstimateCard"/);
 assert.match(html,/class="loggi-wordmark">loggi</);
 assert.match(html,/class="price-line free-shipping"/);
 assert.match(html,/class="checkout-whatsapp"/);
 assert.match(html,/wa\.me\/551152970363/);
 assert.match(css,/@media\(min-width:961px\)/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
 assert.match(css,/@media\(max-width:960px\)/);
 assert.match(css,/\.aside-photo video/);
 assert.match(js,/productVideo\.play\(\)/);
});

test("landing mobile keeps the video and purchase path while hiding repeated trust blocks",()=>{
 const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
 const css=fs.readFileSync(path.join(root,"lareira-feliz.css"),"utf8");
 assert.match(html,/lareira-real-video-sem-som\.mp4/);
 assert.match(html,/href="\/checkout\.html"/);
 assert.match(html,/FRETE GRÁTIS PARA TODO O BRASIL/);
 assert.match(css,/Mobile clean-up — keep the product/);
 assert.match(css,/\.trust-row,\.security-note\{display:none!important\}/);
 assert.match(css,/\.own-buy\{display:none!important\}/);
 assert.match(css,/\.product-price-card/);
});
test("mobile checkout keeps Loggi, free shipping, Pix and WhatsApp while compacting product copy",()=>{
 const html=fs.readFileSync(path.join(root,"checkout.html"),"utf8");
 const css=fs.readFileSync(path.join(root,"checkout-own.css"),"utf8");
 assert.match(html,/id="loggiEstimateCard"/);
 assert.match(html,/class="loggi-wordmark">loggi/);
 assert.match(html,/class="price-line free-shipping"/);
 assert.match(html,/class="payment-note"/);
 assert.match(html,/class="checkout-whatsapp"/);
 assert.match(css,/Mobile checkout — one clear task/);
 assert.match(css,/\.aside-copy,\.aside-security\{display:none!important\}/);
 assert.match(css,/\.checkout-footer\{display:none\}/);
});

test("landing mobile orders brand before video and keeps price and purchase CTA prominent",()=>{
 const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
 const css=fs.readFileSync(path.join(root,"lareira-feliz.css"),"utf8");
 assert.match(html,/class="hero-copy"/);
 assert.match(html,/class="product-price-card"/);
 assert.match(css,/Refinamento mobile v3 — hierarquia clara/);
 assert.match(css,/\.hero-copy\{display:contents\}/);
 assert.match(css,/\.hero-copy h1\{order:0/);
 assert.match(css,/\.hero-product\{order:2/);
 assert.match(css,/\.hero-copy \.product-price-card\{order:3/);
});
test("checkout mobile groups customer fields and keeps the WhatsApp action below the form",()=>{
 const html=fs.readFileSync(path.join(root,"checkout.html"),"utf8");
 const css=fs.readFileSync(path.join(root,"checkout-own.css"),"utf8");
 assert.match(html,/class="field-grid customer-grid"/);
 assert.match(html,/id="cpf"/);
 assert.match(html,/id="phone"/);
 assert.match(html,/id="loggiEstimateCard"/);
 assert.match(html,/class="price-line free-shipping"/);
 assert.match(html,/class="checkout-whatsapp"/);
 assert.match(css,/Refinamento mobile v3 — formulário leve/);
 assert.match(css,/\.checkout-whatsapp\{position:static/);
});
