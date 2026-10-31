import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
for(const quality of ['normal','low'])test(`D1 100-home scene stays within geometry and draw budgets: ${quality}`,async({page},info)=>{
 const external=[];page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!=='http://127.0.0.1:4173')external.push(r.url());});
 await page.goto('/ui-kit/settlement-benchmark.html?count=100&quality='+quality);
 await expect(page.locator('#benchmark')).toHaveAttribute('data-loaded-models','13');
 await expect(page.locator('#benchmark')).toHaveAttribute('data-model-houses','100');
 await expect(page.locator('#benchmark')).toHaveAttribute('data-model-facilities','7');
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const stats=await page.evaluate(()=>window.benchmarkHarness.viewer.assetStatus());
 expect(stats.drawCalls).toBeGreaterThan(10);expect(stats.triangles).toBeGreaterThan(30000);
 expect(stats.drawCalls).toBeLessThanOrEqual(quality==='low'?100:150);expect(stats.triangles).toBeLessThanOrEqual(quality==='low'?150000:250000);
 expect(stats.geometryBytes).toBeLessThanOrEqual(32*1024*1024);expect(stats.textureBytes).toBeLessThanOrEqual(48*1024*1024);expect(external).toEqual([]);
 await page.screenshot({path:info.outputPath('town100-'+quality+'.png')});
 const path=info.outputPath('renderer-budget.json');await writeFile(path,JSON.stringify(stats,null,2));
 await info.attach('renderer-budget',{path,contentType:'application/json'});
 const result=await page.evaluate(()=>window.benchmarkHarness.start(1,0));expect(result.frameCount).toBeGreaterThan(0);expect(result.peakDrawCalls).toBeLessThanOrEqual(quality==='low'?100:150);expect(result.phonePerformanceVerified).toBe(false);
});
test('D1 engine import failure retains local-only playable fallback',async({page})=>{
 const external=[];page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!=='http://127.0.0.1:4173')external.push(r.url());});
 await page.route('**/world-renderer-three.mjs',r=>r.abort());await page.goto('/?preview=1&renderer=three');
 await expect(page.locator('#game3D')).toHaveAttribute('data-renderer','webgl');await page.locator('#nextBtn').click();await expect(page.locator('#calendar')).toContainText('April');expect(external).toEqual([]);
});

test('D1 low quality and renderer opt-in survive the normal PWA start URL and can be reversed',async({page})=>{
 await page.goto('/?preview=1&renderer=three&quality=low');await expect(page.locator('#game3D')).toHaveAttribute('data-quality','low');
 await page.goto('/?preview=1');await expect(page.locator('#game3D')).toHaveAttribute('data-renderer','three');await expect(page.locator('#game3D')).toHaveAttribute('data-quality','low');
 await page.goto('/?preview=1&renderer=webgl&quality=normal');await expect(page.locator('#game3D')).toHaveAttribute('data-renderer','webgl');
});
