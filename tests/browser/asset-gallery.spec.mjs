import {test,expect} from '@playwright/test';
test('local architecture gallery loads both complete houses and tree with no external requests',async({page},testInfo)=>{
 const requests=[],errors=[];page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/ui-kit/asset-gallery.html');
 for(const id of ['home-long-ridge','home-steep-gable','tree-oak']){
  await page.locator('#asset').selectOption(id);
  await expect(page.locator('#gallery')).toHaveAttribute('data-loaded',id);
  await expect(page.locator('#record')).toContainText('CC0-1.0');
  if(id!=='tree-oak'){
   const path=testInfo.outputPath(id+'.png');await page.screenshot({path});await testInfo.attach(id,{path,contentType:'image/png'});
  }
 }
 await page.locator('#monochrome').check();await page.locator('#view').selectOption('low');
 await page.locator('#asset').selectOption('missing-model');
 await expect(page.locator('#status')).toContainText('unavailable');
 expect(requests.filter(url=>/^https?:/.test(url)&&new URL(url).origin!=='http://127.0.0.1:4173')).toEqual([]);expect(errors).toEqual([]);
});

test('clean PWA install caches every gallery model before an offline cold relaunch',async({page,context})=>{
 await page.goto('/?legacy=1');
 await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;});
 await expect.poll(()=>page.evaluate(async()=>{
  const cache=await caches.open((await caches.keys()).find(k=>k.startsWith('willow-valley:')));
  return !!await cache.match('/assets/wv/architecture-v1/tree-oak.glb');
 })).toBe(true);
 await context.setOffline(true);
 await page.goto('/ui-kit/asset-gallery.html');
 for(const id of ['home-long-ridge','home-steep-gable','tree-oak']){
  await page.locator('#asset').selectOption(id);
  await expect(page.locator('#gallery')).toHaveAttribute('data-loaded',id);
 }
 await page.reload();await expect(page.locator('#gallery')).toHaveAttribute('data-loaded','home-long-ridge');
});
