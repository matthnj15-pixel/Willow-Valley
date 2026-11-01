import {test,expect} from '@playwright/test';
for(const seed of ['WILLOW-1048','WV-SURFACES-2'])for(const quality of ['normal','low'])test(`surface gallery ${seed} ${quality}`,async({page},info)=>{
 const errors=[],external=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).origin!=='http://127.0.0.1:4173')external.push(r.url());});
 await page.goto('/ui-kit/environment-lab.html?seed='+seed+'&quality='+quality+'&motion=off');
 await expect.poll(()=>page.evaluate(()=>window.environmentHarness?.viewer.assetStatus().surfaceTexturesLoaded)).toBe(2);
 for(const view of ['wide','near','shore','lake','river','cliff','junction']){await page.locator('#'+view).click();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.locator('#environment').screenshot({path:info.outputPath(view+'.png')});}
 expect(errors).toEqual([]);expect(external).toEqual([]);
});
for(const quality of ['normal','low'])test(`water animation is bounded, pauses hidden, and never rebuilds controls: ${quality}`,async({page})=>{
 await page.goto('/ui-kit/environment-lab.html?quality='+quality);
 await expect.poll(()=>page.evaluate(()=>window.environmentHarness?.viewer.assetStatus().surfaceTexturesLoaded)).toBe(2);
 await page.waitForTimeout(400);
 const a=await page.evaluate(()=>window.environmentHarness.viewer.assetStatus());
 await page.waitForTimeout(450);const b=await page.evaluate(()=>window.environmentHarness.viewer.assetStatus());
 expect(b.surfaceControlBuilds).toBe(a.surfaceControlBuilds);
 if(quality==='normal')expect(b.waterFrames).toBeGreaterThan(a.waterFrames);else expect(b.waterFrames).toBe(a.waterFrames);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForTimeout(150);const hidden=await page.evaluate(()=>window.environmentHarness.viewer.assetStatus().waterFrames);
 await page.waitForTimeout(350);expect(await page.evaluate(()=>window.environmentHarness.viewer.assetStatus().waterFrames)).toBe(hidden);
 await page.evaluate(()=>window.environmentHarness.viewer.dispose());
});
for(const scope of ['/','/dev/'])test(`surface textures cold-install offline without visiting a gallery: ${scope}`,async({page,context})=>{
 const external=[];page.on('request',r=>{if(new URL(r.url()).origin!=='http://127.0.0.1:4173')external.push(r.url());});
 await page.goto(scope+'?preview=1&renderer=three');
 await page.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;});
 await context.setOffline(true);await page.goto(scope+'?preview=1&renderer=three');
 await expect(page.locator('#game3D')).toHaveAttribute('data-loaded-models','13');
 const images=await page.evaluate(async()=>{const m=await (await fetch('./environment-asset-manifest.json')).json();return Promise.all(m.entries.map(async e=>{const b=await (await fetch('./'+e.url)).arrayBuffer();return b.byteLength===e.bytes;}));});
 expect(images).toEqual([true,true]);expect(external).toEqual([]);
});
