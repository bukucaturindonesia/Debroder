const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
(async () => {
 const browser = await chromium.launch({headless:true});
 const results=[];
 try {
  for (const width of [390,1440]) {
   const context=await browser.newContext({viewport:{width,height:900},locale:'id-ID'});
   await context.route('**/*', route => new URL(route.request().url()).hostname==='127.0.0.1' ? route.continue() : route.abort());
   const page=await context.newPage(); const errors=[]; page.on('pageerror', e=>errors.push(e.message));
   for (const path of ['/cart','/keranjang','/order']) {
    const response=await page.goto('http://127.0.0.1:3136'+path,{waitUntil:'networkidle',timeout:60000});
    await expect(page).toHaveURL('http://127.0.0.1:3136/cart');
    await expect(page.getByRole('main').getByText('Keranjang masih kosong',{exact:true})).toBeVisible({timeout:15000});
    await page.screenshot({path:`qa-artifacts/agent04-d12-20261025/cart-${width}-${path.slice(1)}.png`,fullPage:true});
    results.push({width,path,status:response.status(),finalPath:new URL(page.url()).pathname,emptyState:true,pageErrors:[...errors]});
    if(errors.length) throw Error('Browser page errors');
   }
   await context.close();
  }
 } finally { await browser.close(); fs.writeFileSync('qa-artifacts/agent04-d12-20261025/cart-browser-results.json',JSON.stringify({checkedAt:new Date().toISOString(),results},null,2)); }
 console.log(JSON.stringify({passed:results.length,results}));
})().catch(e=>{console.error(e);process.exitCode=1});
