const {test,expect,devices}=require("@playwright/test");
const products=[
{id:"basic",name:"Essencial",price:39.9,prop:"Pegadas e carta",image:"assets/product/kit1-site.webp",benefits:["13 pegadas","Carta padrão"],active:true},
{id:"personal",name:"Personalizado",price:69.9,prop:"Carta personalizada",image:"assets/product/kit-personalizado.webp",benefits:["21 pegadas","Carta personalizada"],active:true}
];
test.describe("Campanha -> checkout -> Pix sem transferência financeira",()=>{
 test.use({...devices["iPhone 13"],browserName:"webkit",reducedMotion:"reduce"});
 for(const kit of ["basic","personal"]){
  test("link de anúncio direto "+kit,async({page},testInfo)=>{
   await page.route("**/api/products",r=>r.fulfill({json:{products}}));
   await page.route("**/api/checkout-config",r=>r.fulfill({json:{enabled:true,discount:15,shippingFlat:0,displayName:"Loja"}}));
   await page.route("**/api/events",r=>r.fulfill({status:202,json:{ok:true}}));
   await page.route("https://viacep.com.br/ws/*/json/",r=>r.fulfill({json:{cep:"09750-000",logradouro:"Rua Marechal Deodoro",bairro:"Centro",localidade:"São Bernardo do Campo",uf:"SP"}}));
   let created=0;
   await page.route("**/api/checkout",r=>{created++;return r.fulfill({status:201,json:{
     id:"NATAL-ABCDEF123456",total:kit==="basic"?33.92:59.42,pixPayload:"000201010211520400005303986540559.425802BR5913PAPAI NOEL6009SAO PAULO6304BEEF",discountPercent:15,receiverName:"Loja",claim:"a".repeat(64)
   }})});
   await page.route("**/api/customer/auth",r=>r.fulfill({json:{authenticated:false}}));
   await page.route("**/api/payment-informed",r=>r.fulfill({json:{ok:true}}));
   await page.goto("/checkout.html?kit="+kit+"&utm_source=meta&utm_campaign=natal");
   await expect(page.locator("#stepOneKitTitle")).toContainText(kit==="basic"?"Essencial":"Personalizado");
   await expect(page.locator("#openSantaLetter")).toBeVisible();
   await page.locator("#openSantaLetter").click();
   await expect(page.locator("#letterDialog")).toBeVisible();
   if(kit==="basic")await expect(page.locator("#letterDialogContent")).toContainText("pequena estrela");
   await page.locator("#letterDialogDone").click();
   if(kit==="personal"){
      await page.locator("#childName").fill("Luiza");
      await page.locator("#letterText").fill("Você deixou esta noite ainda mais especial!");
      await page.locator("#openSantaLetter").click();
      await expect(page.locator("#letterDialogContent")).toContainText("Luiza");
      await page.locator("#letterDialogDone").click();
   }
   await page.locator("#checkoutNext").click();
   await page.locator("#cep").fill("09750000");
   await expect(page.locator("#addressResult")).toBeVisible();
   await expect(page.locator("#deliveryEstimate")).toContainText("2 a 4 dias");
   await page.locator("#number").fill("123");
   await page.locator("#customerName").fill("Cliente QA");
   await page.locator("#phone").fill("11999999999");
   await page.locator("#checkoutNext").click();
   await expect(page.locator("#reviewTotal")).toContainText(kit==="basic"?"33,92":"59,42");
   await page.locator("#reviewLetterTrigger").click();
   await expect(page.locator("#letterDialog")).toBeVisible();
   await page.locator("#closeLetterDialog").click();
   await testInfo.attach("review-"+kit+".png",{body:await page.screenshot({fullPage:true}),contentType:"image/png"});
   await page.locator("#checkoutNext").click();
   await expect(page.locator("#paymentScene")).toBeVisible();
   await expect(page.locator("#pixOrderId")).toContainText("NATAL-");
   expect(created).toBe(1);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   expect(overflow).toBeLessThanOrEqual(3);
  });
 }
});