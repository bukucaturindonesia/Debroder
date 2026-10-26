const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true}); const results=[];
 try{
  for(const width of [360,390,1440]) for(const fixture of ['normal','empty']){
   const context=await browser.newContext({viewport:{width,height:960},locale:'id-ID'});
   await context.tracing.start({screenshots:true,snapshots:true});
   await context.route('**/*',route=>route.abort());
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setContent(fs.readFileSync(`qa-artifacts/auto-order-20261026/dashboard-${fixture}.html`,'utf8'),{waitUntil:'networkidle'});
   for(const title of ['Siap Dikerjakan','Dalam Proses','Perlu Perhatian'])await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
   const layout=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth,areas:[...document.querySelectorAll('h3[id^="operational-priority-"]')].map(h=>({top:h.getBoundingClientRect().top,left:h.getBoundingClientRect().left,right:h.getBoundingClientRect().right}))}));
   expect(layout.scroll).toBeLessThanOrEqual(width);
   for(const area of layout.areas){expect(area.left).toBeGreaterThanOrEqual(0);expect(area.right).toBeLessThanOrEqual(width);}
   if(width<1024){expect(layout.areas[1].top).toBeGreaterThan(layout.areas[0].top);expect(layout.areas[2].top).toBeGreaterThan(layout.areas[1].top);}
   else{expect(Math.abs(layout.areas[2].top-layout.areas[0].top)).toBeLessThan(2);}
   if(fixture==='normal'){
    await expect(page.getByRole('link',{name:'Buka pemeriksaan kualitas: Pemeriksaan kualitas',exact:true})).toHaveAttribute('href','/admin/quality-control');
    await expect(page.getByText('Tindakan belum tersedia',{exact:true})).toBeVisible();
   }
   expect(errors).toEqual([]);
   const screenshot=`qa-artifacts/auto-order-20261026/dashboard-${fixture}-${width}.png`;
   await page.screenshot({path:screenshot,fullPage:true});
   await context.tracing.stop({path:`qa-artifacts/auto-order-20261026/dashboard-${fixture}-${width}-trace.zip`});
   results.push({width,fixture,layout,pageErrors:errors,screenshot,status:'EXECUTED AND PASSED',scope:'static actual-component/actual-CSS fixture; not authenticated admin UAT'});
   await context.close();
  }
 }finally{await browser.close();fs.writeFileSync('qa-artifacts/auto-order-20261026/dashboard-browser-results.json',JSON.stringify({recordedAt:new Date().toISOString(),results},null,2));}
 console.log(JSON.stringify({passed:results.length,results}));
})().catch(e=>{console.error(e);process.exitCode=1});
