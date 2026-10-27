const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test('landing mobile sem violações serious ou critical', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(v => ['serious','critical'].includes(v.impact));
  expect(blocking, blocking.map(v=>v.id+': '+v.help).join('\n')).toEqual([]);
});

test('checkout etapa 1 sem violações serious ou critical', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await page.getByRole('button',{name:'Escolher este kit'}).first().click();
  const results = await new AxeBuilder({ page }).include('#checkoutDialog').analyze();
  const blocking = results.violations.filter(v => ['serious','critical'].includes(v.impact));
  expect(blocking, blocking.map(v=>v.id+': '+v.help).join('\n')).toEqual([]);
});

test('assets visuais carregam sem quebra', async ({ page }) => {
  const failed=[];
  page.on('response', response => {
    if(response.status()>=400) failed.push({url:response.url(),status:response.status()});
  });
  await page.goto('/');
  const images=page.locator('img');
  for(let i=0;i<await images.count();i++){
    await images.nth(i).scrollIntoViewIfNeeded();
  }
  await page.waitForFunction(() => [...document.images].every(img => img.complete));
  const broken=await page.evaluate(()=>[...document.images].filter(img=>img.naturalWidth===0).map(img=>img.getAttribute('src')));
  expect(broken).toEqual([]);
  expect(failed.filter(x=>/\.(svg|png|webp|avif|jpg|jpeg)(\?|$)/i.test(x.url))).toEqual([]);
});

test('landing mantém a narrativa comercial oficial em oito blocos', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('main > section.section')).toHaveCount(8);
  const ids = await page.locator('main > section.section').evaluateAll(nodes => nodes.map(n => n.id || n.className));
  expect(ids[0]).toBe('inicio');
  expect(ids[1]).toBe('conteudo-kit');
  expect(ids[2]).toBe('kits');
  expect(ids[3]).toBe('como-fica');
  expect(ids[4]).toBe('experiencia');
  expect(ids[5]).toBe('como-funciona');
  expect(ids[6]).toBe('entrega');
});