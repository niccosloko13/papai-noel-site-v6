const {test,expect,devices}=require('@playwright/test');
test.describe('Hero Natal 2026 — arte aprovada',()=>{
 test.use({...devices['iPhone 13'],browserName:'webkit'});
 test('cartaz completo visível, clicável e sem corte no iPhone',async({page},testInfo)=>{
  await page.route('**/api/events',r=>r.fulfill({status:202,json:{ok:true}}));
  await page.goto('/index.html');
  const hero=page.locator('#inicio');
  const img=hero.locator('.hero-poster-2026-art');
  await expect(img).toBeVisible();
  await expect(hero.locator('.hero-poster-2026-link')).toHaveAttribute('href','#kits');
  const dimensions=await img.evaluate(el=>({naturalWidth:el.naturalWidth,naturalHeight:el.naturalHeight,displayWidth:el.getBoundingClientRect().width,displayHeight:el.getBoundingClientRect().height}));
  expect(dimensions.naturalWidth).toBeGreaterThan(900);
  expect(dimensions.naturalHeight).toBeGreaterThan(1400);
  expect(Math.abs(dimensions.displayWidth/dimensions.displayHeight-2/3)).toBeLessThan(.025);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(3);
  await testInfo.attach('hero-aprovado-iphone.png',{body:await hero.screenshot(),contentType:'image/png'});
  await hero.locator('.hero-poster-2026-link').click();
  await expect(page).toHaveURL(/#kits$/);
 });
 test('cartaz adaptado no desktop sem distorcer proporção',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/index.html');
  const img=page.locator('#inicio .hero-poster-2026-art');
  await expect(img).toBeVisible();
  const b=await img.boundingBox();
  expect(b.width).toBeGreaterThan(400);
  expect(Math.abs(b.width/b.height-2/3)).toBeLessThan(.025);
 });
});