import {test,expect} from '@playwright/test';
for(const base of ['/','/dev/'])test('C candidates: fixed scale, roof/undercroft probes, all cameras, materials and framing '+base,async({page},info)=>{
 test.setTimeout(60000);const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).origin!=='http://127.0.0.1:4173')external.push(r.url());});
 await page.goto(base+'ui-kit/wv006-baselines.html');await expect(page.locator('#catalog')).toHaveAttribute('data-loaded','10');
 const records=await page.evaluate(()=>wv006.manifest);expect(records.gameUnitsPerMetre).toBe(2.8);expect(records.runtimeReady).toBe(false);expect(records.entries).toHaveLength(10);
 for(const quality of ['normal','low']){await page.selectOption('#quality',quality);const probes=await page.evaluate(()=>wv006.inspect());expect(probes.filter(p=>!p.ok)).toEqual([]);}
 await page.selectOption('#compare','new');for(const id of records.entries.map(e=>e.id)){
  await page.selectOption('#design',id);for(const view of ['front','rear','left','side','roof','eye']){await page.selectOption('#view',view);expect(await page.evaluate(()=>wv006.frameCheck()),id+' '+view).toBe(true);}await page.uncheck('#labels-on');await page.uncheck('#props');await page.check('#mono');await page.screenshot({path:info.outputPath(id+'-identity.png')});await page.uncheck('#mono');
 }
 await page.check('#wire');await page.selectOption('#design','facility-smith');await page.screenshot({path:info.outputPath('smith-wire.png')});await page.uncheck('#wire');await page.selectOption('#compare','pair');await page.selectOption('#quality','normal');await page.selectOption('#view','front');
 const stats=await page.evaluate(()=>wv006.stats);expect(stats.drawCalls).toBeLessThan(40);expect(stats.triangles).toBeLessThan(20000);expect(errors).toEqual([]);expect(external).toEqual([]);
 // No idle render loop: submissions must stay still when no interaction occurs.
 const before=stats.submissions;await page.waitForTimeout(100);expect((await page.evaluate(()=>wv006.stats)).submissions).toBe(before);
});
