const {test,expect,devices}=require("@playwright/test");
test.describe("compact home product comparison",()=>{
 test.use({...devices["iPhone 13"],browserName:"webkit"});
 test("two kits side-by-side and 3 swipable gallery photos",async({page},testInfo)=>{
  await page.route("**/api/products",r=>r.fulfill({status:503,json:{error:"using default products"}}));
  await page.route("**/api/events",r=>r.fulfill({status:202,json:{ok:true}}));
  await page.goto("/index.html");
  const products=page.locator("#kits .product-card");
  await expect(products).toHaveCount(2);
  const positions=await products.evaluateAll(els=>els.map(e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width}}));
  expect(Math.abs(positions[0].y-positions[1].y)).toBeLessThan(3);
  expect(positions[1].x).toBeGreaterThan(positions[0].x+positions[0].w-3);
  await expect(products.nth(0).locator(".product-specs")).toBeVisible();
  await expect(products.nth(1).locator("[data-buy]")).toBeVisible();
  const scene=page.locator("#sceneGallery");
  await expect(scene.locator(".scene-card")).toHaveCount(3);
  const layout=await scene.evaluate(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth}));
  expect(layout.scrollWidth).toBeGreaterThan(layout.width);
  await page.locator("#sceneNext").click();
  await expect(page.locator(".scene-carousel-dots span").nth(1)).toHaveClass(/is-active/);
  await testInfo.attach("kits-duas-colunas.png",{body:await page.locator("#kits").screenshot(),contentType:"image/png"});
  await testInfo.attach("galeria-carrossel.png",{body:await page.locator("#como-fica").screenshot(),contentType:"image/png"});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(3);
 });
});