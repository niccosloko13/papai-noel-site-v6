const {test,expect,devices}=require('@playwright/test');
test.describe('Santa letter checkout responsive',()=>{
 test.use({...devices['iPhone 13'],browserName:'webkit'});
 for(const product of ['basic','personal']){
  test(product+' letter preview opens and closes without losing progress',async({page})=>{
   await page.route('**/api/products',r=>r.fulfill({status:503,json:{error:'fallback'}}));
   await page.route('**/api/checkout-config',r=>r.fulfill({json:{enabled:true,discount:15,shippingFlat:0}}));
   await page.route('**/api/events',r=>r.fulfill({status:202,json:{ok:true}}));
   await page.addInitScript(id=>localStorage.setItem('natal_checkout_pending',JSON.stringify({items:[{id,qty:1}]})),product);
   await page.goto('/checkout.html');
   await expect(page.locator('.checkout-experience-banner')).toBeVisible();
   if(product==='personal'){
    await page.locator('#childName').fill('Miguel');
    await page.locator('#letterText').fill('Meu querido Miguel, com muito carinho.');
   }
   const trigger=product==='basic'?'#basicLetterTrigger':'#letterExpand';
   await page.locator(trigger).click();
   await expect(page.locator('#letterDialog')).toBeVisible();
   await expect(page.locator('#letterDialogContent')).toContainText(product==='basic'?'pequena estrela':'Miguel');
   await page.locator('#letterDialogDone').click();
   await expect(page.locator('#letterDialog')).toBeHidden();
   if(product==='personal')await expect(page.locator('#childName')).toHaveValue('Miguel');
   await page.locator('#checkoutNext').click();
   await expect(page.locator('.checkout-step-delivery')).toHaveClass(/active/);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   expect(overflow).toBeLessThanOrEqual(3);
  });
 }
});