const {test,expect}=require("@playwright/test");
const PENDING={items:[{id:"personal",qty:1}],fromCart:false,createdAt:Date.now()};
function mockCatalog(){return [
 {id:"basic",name:"Essencial",price:39.90,prop:"Pegadas e carta para a surpresa.",image:"assets/product/kit1-site.webp",benefits:["13 pegadas","Adesivo de janela","Carta padrão","Certificado padrão","Guia"],active:true},
 {id:"personal",name:"Personalizado",price:69.90,prop:"Uma surpresa personalizada.",image:"assets/product/kit-personalizado.webp",benefits:["21 pegadas","Adesivo de janela","Carta personalizada","Certificado personalizado","Placa personalizada","Guia"],active:true}
]}
async function mockBackend(page){
 await page.route("**/api/products",r=>r.fulfill({json:{products:mockCatalog()}}));
 await page.route("**/api/checkout-config",r=>r.fulfill({json:{enabled:true,discount:15,shippingFlat:0,displayName:"Papai Noel Passou Aqui"}}));
 await page.route("**/api/events",r=>r.fulfill({status:202,json:{ok:true}}));
 await page.route("**/viacep.com.br/ws/**",r=>r.fulfill({json:{cep:"09750-000",logradouro:"Rua Marechal Deodoro",bairro:"Centro",localidade:"São Bernardo do Campo",uf:"SP"}}));
 await page.route("**/api/checkout",r=>r.fulfill({status:201,json:{id:"NATAL-ABCDEF012345",total:59.42,pixPayload:"000201010211520400005303986540559.425802BR5913PAPAI NOEL6009SAO PAULO6304BEEF",discountPercent:15,receiverName:"Papai Noel Passou Aqui",claim:"a".repeat(64)}}));
 await page.route("**/api/payment-informed",r=>r.fulfill({json:{ok:true}}));
}
for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
 test("checkout personalized responsive "+viewport.width,async({page},testInfo)=>{
  await page.setViewportSize(viewport);
  await page.addInitScript(pending=>localStorage.setItem("natal_checkout_pending",JSON.stringify(pending)),PENDING);
  await mockBackend(page);
  await page.goto("/checkout.html");
  await expect(page.locator("#stepOneKitTitle")).toContainText("Personalizado");
  await expect(page.locator("#findCep")).toHaveCount(0);
  await page.locator("#childName").fill("Miguel");
  await page.locator("#letterText").fill("Uma noite cheia de magia");
  await expect(page.locator("#previewName")).toContainText("Miguel");
  await page.locator("#checkoutNext").click();
  await page.locator("#cep").fill("09750000");
  await expect(page.locator("#addressResult")).toBeVisible({timeout:10000});
  await expect(page.locator("#deliveryEstimate")).toContainText("2 a 4 dias");
  await page.locator("#number").fill("123");
  await page.locator("#customerName").fill("Cliente de teste");
  await page.locator("#phone").fill("(11) 99999-9999");
  await page.locator("#checkoutNext").click();
  await expect(page.locator("#reviewKitTitle")).toContainText("Personalizado");
  await expect(page.locator("#reviewTotal")).toContainText("59,42");
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(overflow,"No horizontal overflow at "+viewport.width).toBeLessThanOrEqual(2);
  await testInfo.attach("review-"+viewport.width,{body:await page.screenshot({fullPage:true}),contentType:"image/png"});
  await page.locator("#checkoutNext").click();
  await expect(page.locator("#paymentScene")).toBeVisible();
  await expect(page.locator("#trackOrderLink")).toBeVisible();
  await page.locator("#pixPaidButton").click();
  await expect(page.locator("#paymentCelebrationMessage")).toBeVisible();
 });
}
test("Essential kit skips personalization",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>localStorage.setItem("natal_checkout_pending",JSON.stringify({items:[{id:"basic",qty:1}]})));
 await mockBackend(page);
 await page.goto("/checkout.html");
 await expect(page.locator("#basicCheckoutSummary")).toBeVisible();
 await expect(page.locator("#personalizationLayout")).toBeHidden();
 await page.locator("#checkoutNext").click();
 await expect(page.locator('[data-step="2"]')).toHaveClass(/active/);
});
