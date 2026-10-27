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
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin.html');
  await page.locator('#pixKey').fill('teste@example.com');
  await page.locator('#displayName').fill('NATAL EXPERIENCIAS');
  await page.locator('#receiverName').fill('NATAL EXPERIENCIAS');
  await page.locator('#pixCity').fill('SAO PAULO');
  await page.locator('#savePix').click();

  await page.goto('/');
  await page.getByRole('button', { name: 'Escolher este kit' }).nth(1).click();
  await page.locator('#childName').fill('Miguel');
  await page.locator('#checkoutNext').click();
  await page.locator('#cep').fill('09710000');
  await page.locator('#address').fill('Rua de teste');
  await page.locator('#number').fill('123');
  await page.locator('#customerName').fill('Cliente Teste');
  await page.locator('#phone').fill('13974100193');
  await page.locator('#checkoutNext').click();
  await expect(page.locator('#orderSummary')).toContainText('Total no Pix');
  await page.locator('#checkoutNext').click();
  await expect(page.locator('#pixDialog')).toBeVisible();
  await expect(page.locator('#pixCopyPaste')).not.toHaveValue('');
  await expect(page.locator('#pixQrCanvas canvas, #pixQrCanvas img')).toHaveCount(1);
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