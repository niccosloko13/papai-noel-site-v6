const { test } = require('@playwright/test');
const fs = require('fs');
fs.mkdirSync('qa/screenshots', { recursive: true });

const shots = [
  ['home-360.png',360,800],
  ['home-390.png',390,844],
  ['home-430.png',430,932],
  ['home-1440.png',1440,900]
];

for (const [name,width,height] of shots) {
  test('screenshot '+name, async ({ page }) => {
    await page.setViewportSize({width,height});
    await page.goto('/');
    await page.screenshot({path:'qa/screenshots/'+name,fullPage:true});
  });
}

test('checkout e pix 390', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/admin.html');
  await page.getByRole('button',{name:'Pix'}).click();
  await page.locator('#pixKey').fill('teste@example.com');
  await page.locator('#displayName').fill('NATAL EXPERIENCIAS');
  await page.locator('#receiverName').fill('NATAL EXPERIENCIAS');
  await page.locator('#pixCity').fill('SAO PAULO');
  await page.locator('#savePix').click();

  await page.goto('/');
  await page.getByRole('button',{name:'Escolher este kit'}).nth(1).click();
  await page.screenshot({path:'qa/screenshots/checkout-step1-390.png',fullPage:true});
  await page.locator('#childName').fill('Miguel');
  await page.locator('#checkoutNext').click();
  await page.locator('#cep').fill('09710000');
  await page.locator('#address').fill('Rua de teste');
  await page.locator('#number').fill('123');
  await page.locator('#customerName').fill('Cliente Teste');
  await page.locator('#phone').fill('13974100193');
  await page.locator('#checkoutNext').click();
  await page.screenshot({path:'qa/screenshots/checkout-step3-390.png',fullPage:true});
  await page.locator('#checkoutNext').click();
  await page.screenshot({path:'qa/screenshots/pix-payment-390.png',fullPage:true});
});