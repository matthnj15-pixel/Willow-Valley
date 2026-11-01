import {test,expect} from '@playwright/test';
test('ten fixed-scale designs, shell closure, mobile cameras and material controls',async({page},info)=>{
 const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).origin!=='http://127.0.0.1:4173')external.push(r.url());});
 await page.goto('/ui-kit/building-catalog.html');await expect(page.locator('#catalog')).toHaveAttribute('data-loaded','10');
 const records=await page.evaluate(()=>buildingCatalog.measurements);expect(records).toHaveLength(10);expect(records.every(r=>r.scale===2.8)).toBe(true);
 expect((await page.evaluate(()=>buildingCatalog.inspectShells())).every(p=>p.ok)).toBe(true);
 for(const role of ['residential','work']){
  await page.selectOption('#collection',role);await page.selectOption('#design','overview');await page.screenshot({path:info.outputPath(role+'-overview.png')});
  await expect(page.locator('#design option')).toHaveCount(6);
 }
 await page.selectOption('#collection','all');await page.selectOption('#design','overview');const stats=await page.evaluate(()=>buildingCatalog.stats);expect(stats.drawCalls).toBeLessThan(130);expect(stats.triangles).toBeLessThan(100000);
 await page.selectOption('#design','home-low-hip');for(const angle of ['rear','side','eye','roof'])await page.selectOption('#view',angle);
 await page.check('#mono');await page.check('#wire');await page.uncheck('#references');await page.selectOption('#design','facility-lumber');await page.screenshot({path:info.outputPath('lumber-wire.png')});expect(errors).toEqual([]);expect(external).toEqual([]);
});
for(const base of ['/','/dev/'])test('catalog cold-loads offline from game install without prior gallery visit '+base,async({page,context})=>{
 test.setTimeout(60000);await page.goto(base+'?preview=1');await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));});
 await context.setOffline(true);await page.goto(base+'ui-kit/building-catalog.html');await expect(page.locator('#catalog')).toHaveAttribute('data-loaded','10');await page.selectOption('#collection','work');await page.selectOption('#design','facility-market');await page.reload();await expect(page.locator('#catalog')).toHaveAttribute('data-loaded','10');
});
