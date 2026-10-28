const {test,expect}=require("@playwright/test");
for(const width of [390,1440]){
 test("new customer account layout "+width,async({page})=>{
  await page.setViewportSize({width,height:844});
  await page.route("**/api/customer/auth",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({authenticated:false})}));
  await page.goto("/minha-conta.html");
  await expect(page.locator("#loginForm")).toBeVisible();
  await expect(page.locator("#registerForm")).toBeHidden();
  await page.locator("#registerTab").click();
  await expect(page.locator("#registerForm")).toBeVisible();
  await expect(page.locator("#loginForm")).toBeHidden();
  await page.locator("#loginTab").click();
  await expect(page.locator("#loginForm")).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);
 });
 test("tracking view and private access "+width,async({page})=>{
  await page.setViewportSize({width,height:844});
  await page.goto("/pedido.html");
  await expect(page.locator("#trackForm")).toBeVisible();
  await expect(page.locator("#trackResult")).toBeHidden();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);
 });
}
