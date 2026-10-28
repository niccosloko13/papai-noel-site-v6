const { test, expect } = require('@playwright/test');

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
  await page.route('https://viacep.com.br/ws/09710000/json/', async route=>{
    await route.fulfill({
      status:200,
      contentType:'application/json',
      body:JSON.stringify({
        cep:'09710-000',
        logradouro:'Rua Marechal Deodoro',
        bairro:'Centro',
        localidade:'São Bernardo do Campo',
        uf:'SP'
      })
    });
  });
}

test('landing atual tem dois kits, navegação enxuta e sem overflow mobile', async ({ page }) => {
  await page.setViewportSize({ width:390, height:844 });
  await page.goto('/');
  await expect(page.locator('#productGrid .product-card')).toHaveCount(2);
  await expect(page.locator('.desktop-nav')).toContainText('Kits');
  await expect(page.locator('.desktop-nav')).toContainText('Como fica');
  const dims=await page.evaluate(()=>({
    doc:document.documentElement.scrollWidth,
    body:document.body.scrollWidth,
    inner:innerWidth
  }));
  expect(dims.doc).toBeLessThanOrEqual(dims.inner);
  expect(dims.body).toBeLessThanOrEqual(dims.inner);
});

test('cards dos dois kits ficam proporcionais e com mesma altura no desktop', async ({ page }) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/');
  const cards=page.locator('#productGrid .product-card');
  await expect(cards).toHaveCount(2);
  const boxes=await cards.evaluateAll(nodes=>nodes.map(n=>{
    const r=n.getBoundingClientRect();
    const img=n.querySelector('.product-card-media')?.getBoundingClientRect();
    return {h:r.height,w:r.width,imgW:img?.width||0,imgH:img?.height||0};
  }));
  expect(Math.abs(boxes[0].h-boxes[1].h)).toBeLessThanOrEqual(4);
  for(const b of boxes){
    expect(b.imgW/b.imgH).toBeGreaterThan(1.45);
    expect(b.imgW/b.imgH).toBeLessThan(1.55);
  }
});

test('compra completa do Kit Personalizado: carta, CEP, revisão e Pix', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await mockCep(page);
  await seedPix(page);
  await page.goto('/');

  await page.getByRole('button',{name:'Escolher este kit'}).nth(1).click();
  await expect(page.locator('#checkoutDialog')).toBeVisible();
  await expect(page.locator('#checkoutCartMini')).toHaveCount(0);
  await expect(page.locator('#letterPreviewWrap')).toBeVisible();

  await page.locator('#childName').fill('Miguel');
  await page.locator('#letterText').fill('Você iluminou nosso ano. Continue espalhando alegria e carinho por onde passar.');
  await expect(page.locator('#previewName')).toHaveText('Querido Miguel,');
  await expect(page.locator('#previewLetter')).toContainText('Você iluminou nosso ano');

  await page.locator('#checkoutNext').click();
  await expect(page.locator('.checkout-step[data-step="2"]')).toBeVisible();
  await expect(page.locator('#addressResult')).toBeHidden();

  await page.locator('#cep').fill('09710000');
  await page.locator('#findCep').click();
  await expect(page.locator('#addressResult')).toBeVisible();
  await expect(page.locator('#addressFoundText')).toContainText('Rua Marechal Deodoro');
  await page.locator('#number').fill('193');
  await page.locator('#complement').fill('Apto 12');
  await page.locator('#customerName').fill('Nicollas');
  await page.locator('#phone').fill('13974100193');

  await page.locator('#checkoutNext').click();
  await expect(page.locator('.checkout-step[data-step="3"]')).toBeVisible();
  await expect(page.locator('#reviewChildName')).toHaveText('Miguel');
  await expect(page.locator('#reviewAddress')).toContainText('Rua Marechal Deodoro');
  await expect(page.locator('#reviewCustomer')).toContainText('Nicollas');
  await expect(page.locator('#reviewTotal')).toContainText('59,42');

  await page.locator('#checkoutNext').click();
  await expect(page.locator('#pixDialog')).toBeVisible();
  await expect(page.locator('#pixChildName')).toHaveText('Miguel');
  await expect(page.locator('#pixQrCanvas > *').first()).toBeVisible();
  await expect(page.locator('#pixCopyPaste')).not.toHaveValue('');
});

test('checkout desktop mostra formulário e prévia juntos numa única tela', async ({ page }) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/');
  await page.getByRole('button',{name:'Escolher este kit'}).nth(1).click();
  const metrics=await page.evaluate(()=>{
    const shell=document.querySelector('.checkout-shell').getBoundingClientRect();
    const fields=document.querySelector('.personalization-fields').getBoundingClientRect();
    const preview=document.querySelector('.letter-preview-wrap').getBoundingClientRect();
    return {shellH:shell.height,viewport:innerHeight,fieldsTop:fields.top,previewTop:preview.top,fieldsRight:fields.right,previewLeft:preview.left};
  });
  expect(metrics.shellH).toBeLessThanOrEqual(metrics.viewport-20);
  expect(Math.abs(metrics.fieldsTop-metrics.previewTop)).toBeLessThan(30);
  expect(metrics.fieldsRight).toBeLessThan(metrics.previewLeft);
});

test('Kit Essencial não pede personalização inexistente', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await page.getByRole('button',{name:'Escolher este kit'}).first().click();
  await expect(page.locator('#childName')).toBeHidden();
  await expect(page.locator('#letterText')).toBeHidden();
  await expect(page.locator('#letterPreviewWrap')).toBeHidden();
  await expect(page.locator('.checkout-step-kicker')).toContainText('CONFERÊNCIA');
});

test('CTA fixo não cobre kits nem checkout', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await page.locator('#kits').scrollIntoViewIfNeeded();
  await expect(page.locator('#mobileBuyBar')).toBeHidden();
  await page.locator('#como-fica').scrollIntoViewIfNeeded();
  await expect(page.locator('#mobileBuyBar')).toBeVisible();
  await page.getByRole('button',{name:'Comprar'}).click();
  await expect(page.locator('#mobileBuyBar')).toBeHidden();
});

test('alvos de toque principais têm pelo menos 44px', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  const sizes=await page.evaluate(()=>[...document.querySelectorAll('.btn,.cart-trigger,.icon-btn')]
    .filter(el=>{
      const r=el.getBoundingClientRect();
      return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden';
    })
    .map(el=>({text:el.textContent.trim(),h:el.getBoundingClientRect().height})));
  for(const item of sizes) expect(item.h,item.text).toBeGreaterThanOrEqual(44);
});
