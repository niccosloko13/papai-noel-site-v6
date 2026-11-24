const test=require("node:test");const assert=require("node:assert/strict");const fs=require("node:fs");const path=require("node:path");
test("prévia do pagamento mostra a experiência do cliente sem criar cobrança",()=>{
 const html=fs.readFileSync(path.join(__dirname,"..","pagamento-pedido.html"),"utf8");
 assert.match(html,/get\("simulacao"\)==="1"/);assert.match(html,/SIMULAÇÃO VISUAL/);assert.match(html,/SIMULAÇÃO — NÃO PAGAR/);assert.match(html,/SIMULACAO_NAO_PAGAR_LAREIRA_FELIZ/);
 assert.match(html,/if\(simulationMode\)renderSimulation\(\);else init\(\)/);
});
