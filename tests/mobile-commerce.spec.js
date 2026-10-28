const { test, expect } = require('@playwright/test');

const viewports = [
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 430, height: 932 }
];

for (const viewport of viewports) {
  test(`landing sem overflow em ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const dims = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
      inner: window.innerWidth
    }));
    expect(dims.doc).toBeLessThanOrEqual(dims.inner);
    expect(dims.body).toBeLessThanOrEqual(dims.inner);
    await expect(page.locator('#productGrid .product-card')).toHaveCount(3);
    await expect(page.locator('#experiencia .experience-card')).toHaveCount(3);
  });
}

test('checkout completa fluxo e abre Pix manual', async ({ page }) => {
  page.on('pageerror', err => console.log('[pageerror]', err.message));
  page.on('console', msg => console.log('[browser]', msg.type(), msg.text()));
  await page.setViewportSize({ width: 390, height: 844 });
  console.log('[qa] admin');
  await page.goto('/admin.html');
  await page.getByRole('button',{name:'Pix'}).click();
  await page.locator('#pixKey').fill('teste@example.com');
  await page.locator('#displayName').fill('NATAL EXPERIENCIAS');
  await page.locator('#receiverName').fill('NATAL EXPERIENCIAS');
  await page.locator('#pixCity').fill('SAO PAULO');
  await page.locator('#savePix').click();

  console.log('[qa] loja');
  await page.goto('/');
  console.log('[qa] abrir checkout');
  await page.getByRole('button', { name: 'Escolher este kit' }).nth(1).click();
  console.log('[qa] checkout aberto');
  await page.locator('#childName').fill('Miguel');
  await page.locator('#checkoutNext').click();
  console.log('[qa] etapa 2');
  await page.locator('#cep').fill('09710000');
  await page.locator('#address').fill('Rua de teste');
  await page.locator('#number').fill('123');
  await page.locator('#customerName').fill('Cliente Teste');
  await page.locator('#phone').fill('13974100193');
  await page.locator('#checkoutNext').click();
  console.log('[qa] etapa 3');
  await expect(page.locator('#orderSummary')).toContainText('Total no Pix');
  console.log('[qa] gerar pix');
  await page.locator('#checkoutNext').click();
  console.log('[qa] clique gerar pix retornou');
  await expect(page.locator('#pixDialog')).toBeVisible();
  console.log('[qa] pix visível');
  await expect(page.locator('#pixCopyPaste')).not.toHaveValue('');
  await expect(page.locator('#pixQrCanvas > *').first()).toBeVisible();
  await page.locator('#pixPaidButton').click();
  await expect(page.locator('#pixPaidButton')).toContainText('Pagamento informado');
});

test('admin lista e confirma pedido informado', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin.html');
  const fakeOrder = [{
    id:'NATAL-TESTE',
    createdAt:new Date().toISOString(),
    status:'Pagamento informado',
    plan:'Personalizado',
    childName:'Miguel',
    customerName:'Cliente',
    phone:'13974100193',
    total:59.42,
    txid:'NATALTESTE'
  }];
  await page.evaluate((orders)=>localStorage.setItem('natal_orders', JSON.stringify(orders)), fakeOrder);
  await page.reload();
  await page.getByRole('button', { name: 'Pedidos' }).click();
  await expect(page.locator('#orders')).toContainText('NATAL-TESTE');
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Confirmar pagamento' }).click();
  await expect(page.locator('#orders')).toContainText('Pago');
});

test('payload Pix contém valor, TXID e CRC consistente', async ({ page }) => {
  await page.goto('/');
  const data = await page.evaluate(() => {
    const input = {
      key:'teste@example.com',
      receiverName:'NATAL EXPERIENCIAS',
      city:'SAO PAULO',
      amount:59.42,
      txid:'NATAL123456'
    };
    const payload = window.NatalPix.buildPixPayload(input);
    const body = payload.slice(0,-4);
    return {
      payload,
      crc: payload.slice(-4),
      expected: window.NatalPix.crc16(body),
      hasAmount: payload.includes('540559.42'),
      hasTxid: payload.includes('NATAL123456')
    };
  });
  expect(data.crc).toBe(data.expected);
  expect(data.hasAmount).toBeTruthy();
  expect(data.hasTxid).toBeTruthy();
  expect(data.payload.startsWith('000201')).toBeTruthy();
});

test('catálogo continua funcional com apenas um produto ativo', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('natal_products', JSON.stringify([
      {id:'only',name:'Único',price:49.9,prop:'Teste',benefits:['Item'],image:'assets/visuals/kit-basico.svg',active:true}
    ]));
  });
  await page.reload();
  await expect(page.locator('#productGrid .product-card')).toHaveCount(1);
  await page.getByRole('button',{name:'Escolher este kit'}).click();
  await expect(page.locator('#checkoutDialog')).toBeVisible();
});

test('barra fixa não cobre CTAs enquanto os kits estão visíveis', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('#kits').scrollIntoViewIfNeeded();
  await expect(page.locator('#mobileBuyBar')).toBeHidden();
  await page.locator('#como-funciona').scrollIntoViewIfNeeded();
  await expect(page.locator('#mobileBuyBar')).toBeVisible();
});

test('cliente recebe link de acompanhamento após informar Pix', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin.html');
  await page.getByRole('button',{name:'Pix'}).click();
  await page.locator('#pixKey').fill('teste@example.com');
  await page.locator('#displayName').fill('NATAL EXPERIENCIAS');
  await page.locator('#receiverName').fill('NATAL EXPERIENCIAS');
  await page.locator('#savePix').click();

  await page.goto('/');
  await page.getByRole('button',{name:'Escolher este kit'}).first().click();
  await page.locator('#childName').fill('Ana');
  await page.locator('#checkoutNext').click();
  await page.locator('#cep').fill('09710000');
  await page.locator('#address').fill('Rua Teste');
  await page.locator('#number').fill('10');
  await page.locator('#customerName').fill('Cliente');
  await page.locator('#phone').fill('13974100193');
  await page.locator('#checkoutNext').click();
  await page.locator('#checkoutNext').click();
  await page.locator('#pixPaidButton').click();
  const link=page.locator('#trackOrderLink');
  await expect(link).toBeVisible();
  const href=await link.getAttribute('href');
  expect(href).toContain('pedido.html?id=NATAL-');
});

test('hero mobile mantém CTA e início do produto no primeiro viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const metrics = await page.evaluate(() => {
    const cta=document.querySelector('.hero-copy .btn');
    const media=document.querySelector('.hero-media');
    const c=cta.getBoundingClientRect();
    const m=media.getBoundingClientRect();
    return {ctaTop:c.top,ctaBottom:c.bottom,mediaTop:m.top,viewport:innerHeight};
  });
  expect(metrics.ctaBottom).toBeLessThanOrEqual(metrics.viewport);
  expect(metrics.mediaTop).toBeLessThan(metrics.viewport);
});

test('alvos de toque principais têm pelo menos 44px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const sizes=await page.evaluate(() => [...document.querySelectorAll('.btn,.header-cta')]
    .filter(el => {
      const r=el.getBoundingClientRect();
      return r.width>0 && r.height>0 && getComputedStyle(el).visibility!=='hidden';
    })
    .map(el=>{
      const r=el.getBoundingClientRect();
      return {text:el.textContent.trim(),w:r.width,h:r.height};
    }));
  for(const item of sizes){
    expect(item.h, item.text).toBeGreaterThanOrEqual(44);
  }
});

test('checkout mobile ocupa a largura sem overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await page.getByRole('button',{name:'Escolher este kit'}).first().click();
  const dims=await page.evaluate(()=>({
    doc:document.documentElement.scrollWidth,
    body:document.body.scrollWidth,
    inner:window.innerWidth,
    dialog:document.querySelector('#checkoutDialog').getBoundingClientRect().width
  }));
  expect(dims.doc).toBeLessThanOrEqual(dims.inner);
  expect(dims.body).toBeLessThanOrEqual(dims.inner);
  expect(dims.dialog).toBeLessThanOrEqual(dims.inner);
});

test('resumo lateral existe só no desktop e acompanha produto', async ({ page }) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/');
  await page.getByRole('button',{name:'Escolher este kit'}).nth(2).click();
  await expect(page.locator('.checkout-side')).toBeVisible();
  await expect(page.locator('#sidePlan')).toHaveText('Premium');
  await expect(page.locator('#sidePrice')).toContainText('99,90');

  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('.checkout-side')).toBeHidden();
});

test('carrinho soma itens, altera quantidade e leva ao checkout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button',{name:'Adicionar ao carrinho'}).nth(1).click();
  await expect(page.locator('#cartDialog')).toBeVisible();
  await expect(page.locator('#cartCount')).toHaveText('1');
  await page.locator('[data-cart-plus="personal"]').click();
  await expect(page.locator('#cartCount')).toHaveText('2');
  await expect(page.locator('#cartItems')).toContainText('Personalizado');
  await page.locator('#cartCheckout').click();
  await expect(page.locator('#checkoutDialog')).toBeVisible();
  await expect(page.locator('#checkoutCartMini')).toContainText('2× Kit');
  await expect(page.locator('#checkoutCartMini')).toContainText('Personalizado');
});

test('carrinho não cria overflow no mobile', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await page.getByRole('button',{name:'Adicionar ao carrinho'}).first().click();
  const dims=await page.evaluate(()=>({
    doc:document.documentElement.scrollWidth,
    body:document.body.scrollWidth,
    inner:window.innerWidth,
    cart:document.querySelector('#cartDialog').getBoundingClientRect().width
  }));
  expect(dims.doc).toBeLessThanOrEqual(dims.inner);
  expect(dims.body).toBeLessThanOrEqual(dims.inner);
  expect(dims.cart).toBeLessThanOrEqual(dims.inner);
});