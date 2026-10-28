const {test,expect,devices}=require('@playwright/test');
test.describe('Hero product-first mobile',()=>{
 test.use({...devices['iPhone 13'],browserName:'webkit'});
 test('family, footprints, live prices and CTA remain visible and accessible',async({page},testInfo)=>{
  await page.route('**/api/products',r=>r.fulfill({status:503,json:{error:'fallback'}}));
  await page.route('**/api/events',r=>r.fulfill({status:202,json:{ok:true}}));
  await page.goto('/index.html');
  const hero=page.locator('#inicio');
  await expect(hero.locator('.hero-clean-photo img')).toBeVisible();
  await expect(hero.locator('.hero-clean-overlay h1')).toBeVisible();
  await expect(hero.locator('.hero-clean-cta')).toHaveAttribute('href','#kits');
  await expect(hero.locator('#heroStartingPrice')).not.toHaveText('');
  const styles=await hero.locator('.hero-clean-photo').evaluate(el=>getComputedStyle(el));
  const horizontal=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(horizontal).toBeLessThanOrEqual(3);
  const bbox=await hero.boundingBox();expect(bbox.height).toBeLessThan(800);
  await testInfo.attach('hero-iphone-13.png',{body:await hero.screenshot(),contentType:'image/png'});
 });
 test('reduced motion switches off effects',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/index.html');
  const animation=await page.locator('.hero-clean-sparkles i:first-child').evaluate(el=>getComputedStyle(el).animationName);
  expect(animation).toBe('none');
 });
});