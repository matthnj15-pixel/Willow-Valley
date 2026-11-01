import {test,expect} from '@playwright/test';
test('fixed-scale shell, comparison cameras and material-only road study on mobile',async({page},info)=>{
 const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).origin!=='http://127.0.0.1:4173')external.push(r.url());});
 await page.goto('/ui-kit/scale-study.html');await expect(page.locator('#study')).toHaveAttribute('data-loaded','true');
 const state=await page.evaluate(()=>({newScale:scaleStudy.newScale,human:scaleStudy.humanHeight,road:scaleStudy.roadWidth,closure:scaleStudy.inspectShell(),stats:scaleStudy.stats}));
 expect(state.newScale).toBe(2.8);expect(state.human).toBe(4.9);expect(state.road).toBe(24);expect(state.closure.every(r=>r.hits>0&&r.nearestGameUnits<8.4)).toBe(true);
 expect(state.stats.drawCalls).toBeLessThan(100);expect(state.stats.triangles).toBeLessThan(15000);
 await page.screenshot({path:info.outputPath('whole-study.png')});await page.selectOption('#focus','new');
 for(const angle of ['front','rear','side','low','high']){await page.selectOption('#angle',angle);await page.screenshot({path:info.outputPath('cottage-'+angle+'.png')});}
 await page.check('#mono');await page.check('#wire');await page.check('#narrow');await page.selectOption('#focus','road');
 expect(await page.evaluate(()=>scaleStudy.roadWidth)).toBe(24);expect(errors).toEqual([]);expect(external).toEqual([]);
});
for(const base of ['/','/dev/'])test('gallery cold-loads offline after game install, before visiting study '+base,async({page,context})=>{
 test.setTimeout(60000);await page.goto(base+'?preview=1');
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));});
 await context.setOffline(true);await page.goto(base+'ui-kit/scale-study.html');await expect(page.locator('#study')).toHaveAttribute('data-loaded','true');
 await page.reload();await expect(page.locator('#study')).toHaveAttribute('data-loaded','true');
});
