import {test,expect} from '@playwright/test';
test('inhabited hamlet: inherited holdings, exact contacts, clear routes and normal/low budgets',async({page},info)=>{
 test.setTimeout(90000);const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).origin!=='http://127.0.0.1:4173')external.push(r.url());});
 await page.goto('/ui-kit/wv006-landscape.html');await expect(page.locator('#landscape')).toHaveAttribute('data-homes','12');
 await page.evaluate(()=>{localStorage.setItem('willow-valley:hamlet-review-sentinel',JSON.stringify({slots:[1,2,3],seed:'do-not-touch'}));window.beforeHamletStorage=JSON.stringify(localStorage);});
 let founders,woodland;
 for(const stage of ['4','12','30'])for(const quality of ['normal','low']){
  await page.selectOption('#quality',quality);await page.selectOption('#growth',stage);await expect(page.locator('#landscape')).toHaveAttribute('data-homes',stage);
  const result=await page.evaluate(()=>({stats:{...landscapeReview.stats},plan:landscapeReview.plan,issues:landscapeReview.hamlet.inspect(),contact:landscapeReview.inspectContact(),trees:landscapeReview.records.filter(r=>r.key.startsWith('tree:')).map(({key,assetId,origin,yaw,scale})=>({key,assetId,origin,yaw,scale}))}));
  if(!woodland)woodland=result.trees;expect(result.trees).toEqual(woodland);expect(result.issues).toEqual([]);expect(result.contact).toEqual([]);expect(result.plan.holdings).toHaveLength(Number(stage));expect(result.stats.drawCalls).toBeLessThanOrEqual(quality==='low'?100:150);expect(result.stats.triangles).toBeLessThanOrEqual(quality==='low'?150000:250000);
  const identity=result.plan.holdings.slice(0,4).map(({key,origin,yaw,assetId,gate,polygon})=>({key,origin,yaw,assetId,gate,polygon}));if(!founders)founders=identity;expect(identity).toEqual(founders);
  await page.locator('.stage').screenshot({path:info.outputPath(`hamlet-${stage}-${quality}.png`)});
 }
 await page.selectOption('#growth','12');await page.selectOption('#quality','normal');const builds=await page.evaluate(()=>landscapeReview.builds),draws=await page.evaluate(()=>landscapeReview.draws);
 for(const view of ['green','gardens','farm','overview'])await page.selectOption('#hamlet-view',view);await page.locator('#landscape').dispatchEvent('wheel',{deltaY:50});expect(await page.evaluate(()=>landscapeReview.builds)).toBe(builds);
 const idle=await page.evaluate(()=>landscapeReview.draws);await page.waitForTimeout(150);expect(await page.evaluate(()=>landscapeReview.draws)).toBe(idle);expect(idle).toBeGreaterThan(draws);
 expect(await page.evaluate(()=>JSON.stringify(localStorage)===window.beforeHamletStorage)).toBe(true);
 const geometries=await page.evaluate(()=>landscapeReview.stats.geometries);for(let i=0;i<2;i++){await page.selectOption('#growth','30');await page.selectOption('#growth','12');}expect(await page.evaluate(()=>landscapeReview.stats.geometries)).toBe(geometries);expect(errors).toEqual([]);expect(external).toEqual([]);
});
test('inhabited hamlet: development scope and failed architecture remain explicit',async({page})=>{
 await page.goto('/dev/ui-kit/wv006-landscape.html?growth=4');await expect(page.locator('#landscape')).toHaveAttribute('data-homes','4');
 await page.route('**/buildings-next/catalog.glb',r=>r.abort());await page.reload();await expect(page.locator('#landscape')).toHaveAttribute('data-loaded','error');await expect(page.locator('#status')).toContainText('Landscape unavailable');
});
