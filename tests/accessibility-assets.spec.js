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
  const broken=await page.evaluate(()=>[...document.images].filter(img=>!img.complete||img.naturalWidth===0).map(img=>img.getAttribute('src')));
  expect(broken).toEqual([]);
  expect(failed.filter(x=>/\.(svg|png|webp|avif|jpg|jpeg)(\?|$)/i.test(x.url))).toEqual([]);
});

test('landing mantém exatamente seis blocos comerciais', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('main > section.section')).toHaveCount(6);
});