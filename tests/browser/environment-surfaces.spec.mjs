import {test,expect} from '@playwright/test';
for(const seed of ['WILLOW-1048','WV-SURFACES-2'])for(const quality of ['normal','low'])test(`surface gallery ${seed} ${quality}`,async({page},info)=>{
 const errors=[],external=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).origin!=='http://127.0.0.1:4173')external.push(r.url());});
 await page.goto('/ui-kit/environment-lab.html?seed='+seed+'&quality='+quality);
 await expect.poll(()=>page.evaluate(()=>window.environmentHarness?.viewer.assetStatus().surfaceTexturesLoaded)).toBe(2);
 for(const view of ['wide','near','shore','cliff','junction']){await page.locator('#'+view).click();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.locator('#environment').screenshot({path:info.outputPath(view+'.png')});}
 expect(errors).toEqual([]);expect(external).toEqual([]);
});
