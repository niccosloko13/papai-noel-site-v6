const {test,expect,devices}=require('@playwright/test');
test.describe('iPhone 13 — experiência completa',()=>{
 test.use({...devices['iPhone 13'],browserName:'webkit'});
 test('home, navegação, kits, demonstração, segurança e rodapé',async({page},testInfo)=>{
  const failures=[];
  page.on('pageerror',e=>failures.push(e.message));
  await page.route('**/api/events',route=>route.fulfill({status:202,json:{ok:true}}));
  await page.route('**/api/products',route=>route.fulfill({status:200,json:{products:[]}}));
  await page.goto('/index.html');
  await expect(page.locator('#inicio')).toBeVisible();
  await expect(page.locator('.confidence-strip')).toBeVisible();
  for(const selector of ['#inicio','.confidence-strip','#kits','#como-funciona','#como-fica','#entrega','#duvidas','.final-cta-story','.site-footer']){
   const el=page.locator(selector);
   await expect(el).toHaveCount(1);
   await el.scrollIntoViewIfNeeded();
   await page.waitForTimeout(100);
   const info=await page.evaluate(()=>{
    const w=document.documentElement.clientWidth;
    const offending=[...document.querySelectorAll('body *')].filter(e=>{
      if(getComputedStyle(e).position==='fixed')return false;
      const r=e.getBoundingClientRect();return r.width>0&&r.right>w+3&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none';
    }).slice(0,8).map(e=>({tag:e.tagName,cls:e.className,scroll:e.scrollWidth}));
    return {overflow:document.documentElement.scrollWidth-w,offending};
   });
   expect(info.overflow,selector+' horizontal overflow: '+JSON.stringify(info.offending)).toBeLessThanOrEqual(3);
   await testInfo.attach('iphone-'+selector.replace(/[.#]/g,'')+'.png',{body:await el.screenshot({timeout:12000}),contentType:'image/png'});
  }
  await expect(page.getByRole('link',{name:/Área do cliente/i}).first()).toHaveAttribute('href','minha-conta.html');
  expect(failures).toEqual([]);
 });
 test('conta e páginas de segurança',async({page},testInfo)=>{
  await page.route('**/api/customer/auth',route=>route.fulfill({json:{authenticated:false}}));
  for(const [path,selector] of [['/minha-conta.html','#loginForm'],['/entrega-e-prazos.html','main'],['/contato.html','main'],['/privacidade.html','main'],['/trocas-e-devolucoes.html','main'],['/termos-de-compra.html','main']]){
   await page.goto(path);
   await expect(page.locator(selector)).toBeVisible();
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   expect(overflow,path+' overflow').toBeLessThanOrEqual(3);
   await testInfo.attach('iphone-'+path.slice(1).replace('.html','')+'.png',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
  }
 });
});
test.describe('Desktop — consistência de seções',()=>{
 test.use({viewport:{width:1440,height:900},browserName:'chromium'});
 test('home sem overflow',async({page})=>{
  await page.route('**/api/events',route=>route.fulfill({status:202,json:{ok:true}}));
  await page.goto('/index.html');
  const sections=['#inicio','#kits','#como-funciona','#como-fica','#entrega','#duvidas','.final-cta-story','.site-footer'];
  for(const selector of sections)await expect(page.locator(selector)).toHaveCount(1);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(3);
 });
});