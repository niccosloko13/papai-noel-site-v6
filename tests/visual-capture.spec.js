const { test, expect } = require('@playwright/test');
const fs=require('fs');
fs.mkdirSync('qa/screenshots',{recursive:true});

async function seedPix(page){
  await page.goto('/admin.html');
  await page.getByRole('button',{name:'Pix'}).click();
  await page.locator('#pixKey').fill('teste@example.com');
  await page.locator('#displayName').fill('NATAL EXPERIENCIAS');
  await page.locator('#receiverName').fill('NATAL EXPERIENCIAS');
  await page.locator('#pixCity').fill('SAO PAULO');
  await page.locator('#savePix').click();
}
async function mockCep(page){
  await page.route('https://viacep.com.br/ws/09710000/json/',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({logradouro:'Rua Marechal Deodoro',bairro:'Centro',localidade:'São Bernardo do Campo',uf:'SP'})
  }));
}

for(const [name,width,height] of [
  ['home-390.png',390,844],
  ['home-430.png',430,932],
  ['home-1440.png',1440,900]
]){
  test('visual '+name,async({page})=>{
    await page.setViewportSize({width,height});
    await page.goto('/');
    await page.screenshot({path:'qa/screenshots/'+name,fullPage:true});
  });
}

test('checkout completo mobile screenshots',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await mockCep(page); await seedPix(page); await page.goto('/');
  await page.getByRole('button',{name:'Escolher este kit'}).nth(1).click();
  await page.locator('#childName').fill('Miguel');
  await page.locator('#letterText').fill('Você iluminou nosso ano. Continue espalhando alegria e carinho por onde passar.');
  await page.screenshot({path:'qa/screenshots/checkout-step1-390.png'});
  await page.locator('#checkoutNext').click();
  await page.locator('#cep').fill('09710000');
  await page.locator('#findCep').click();
  await page.locator('#number').fill('193');
  await page.locator('#customerName').fill('Nicollas');
  await page.locator('#phone').fill('13974100193');
  await page.screenshot({path:'qa/screenshots/checkout-step2-390.png'});
  await page.locator('#checkoutNext').click();
  await page.screenshot({path:'qa/screenshots/checkout-step3-390.png'});
  await page.locator('#checkoutNext').click();
  await expect(page.locator('#pixDialog')).toBeVisible();
  await page.screenshot({path:'qa/screenshots/pix-payment-390.png'});
});

test('checkout desktop 1440 screenshot',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/');
  await page.getByRole('button',{name:'Escolher este kit'}).nth(1).click();
  await page.locator('#childName').fill('Miguel');
  await page.screenshot({path:'qa/screenshots/checkout-step1-1440.png'});
});
