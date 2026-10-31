import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';

async function install(page){
 await page.evaluate(async()=>{
  const root=new URL('../',location.href);
  await navigator.serviceWorker.register(new URL('sw.js',root),{scope:root.pathname,updateViaCache:'none'});
  await navigator.serviceWorker.ready;
 });
}
for(const scope of ['/','/dev/'])test(`ART-OFFLINE-01: clean install at ${scope} loads all models and preserves browser saves`,async({page,context})=>{
 const external=[];page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!=='http://127.0.0.1:4173')external.push(r.url());});
 await page.goto(scope+'ui-kit/asset-gallery.html');
 await expect(page.locator('#gallery')).toHaveAttribute('data-loaded','home-long-ridge');
 await page.evaluate(()=>localStorage.setItem('willow-valley:integrity-sentinel','preserved'));
 await install(page);await context.setOffline(true);await page.reload();
 for(const id of ['home-long-ridge','home-steep-gable','home-low-hip','home-crooked-wing','home-offset-gables','home-porch-cabin','facility-farm','facility-lumber','facility-smith','facility-granary','facility-market','facility-plaza','facility-park','tree-oak']){
  await page.locator('#asset').selectOption(id);await expect(page.locator('#gallery')).toHaveAttribute('data-loaded',id);
 }
 const measurements=await page.evaluate(async()=>{
  const root=new URL('../',location.href),THREE=await import(new URL('assets/vendor/three.module.mjs',root));
  const {createResourceDisposer}=await import(new URL('asset-registry.mjs',root));
  const manifest=await (await fetch(new URL('assets/wv/architecture-v1/manifest.json',root))).json();
  const loader=new THREE.GLTFLoader(),dispose=createResourceDisposer(),output=[];
  for(const e of manifest.entries){
   const model=await loader.loadAsync(new URL(e.url,root).href),box=new THREE.Box3().setFromObject(model.scene,true);
   output.push({min:box.min.toArray(),max:box.max.toArray(),expectedMin:e.boundsMin,expectedMax:e.boundsMax});dispose(model.scene);
  }
  return output;
 });
 for(const e of measurements)for(let i=0;i<3;i++){expect(e.min[i]).toBeCloseTo(e.expectedMin[i],4);expect(e.max[i]).toBeCloseTo(e.expectedMax[i],4);}
 expect(await page.evaluate(()=>localStorage.getItem('willow-valley:integrity-sentinel'))).toBe('preserved');expect(external).toEqual([]);
});

test('ART-EXPORT-01: standalone legacy game advances from a file URL while disconnected',async({page,context})=>{
 await context.setOffline(true);await page.goto(pathToFileURL(resolve('offline.html')).href);
 await expect(page.locator('#nextBtn')).toBeVisible();await page.locator('#nextBtn').click();
 await expect(page.locator('#calendar')).toContainText('April');
});

test('ART-UPGRADE-01: corrupt required model preserves the old complete install, cold relaunch and retry',async({page,context})=>{
 let version='upgrade-1',corrupt=false;
 const server=createServer(async(req,res)=>{
  try{
   let path=new URL(req.url,'http://localhost').pathname;if(path.endsWith('/'))path+='index.html';
   const file=resolve('.'+decodeURIComponent(path));if(!file.startsWith(resolve('.')+'/'))throw Error('Invalid path');
   let bytes=await readFile(file);
   if(path==='/sw.js')bytes=Buffer.from(bytes.toString().replaceAll('__BUILD_VERSION__',version));
   if(corrupt&&path.endsWith('/tree-oak.glb')){bytes=Buffer.from(bytes);bytes[bytes.length-1]^=1;}
   const type={'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png'}[extname(file)]||'application/octet-stream';
   res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache'});res.end(bytes);
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  await page.goto(`http://127.0.0.1:${server.address().port}/ui-kit/asset-gallery.html`);await install(page);
  await page.evaluate(()=>localStorage.setItem('willow-valley:upgrade-test','preserved'));
  version='upgrade-2';corrupt=true;
  const failed=await page.evaluate(async()=>{
   const reg=await navigator.serviceWorker.getRegistration();await reg.update();const worker=reg.installing;if(!worker)throw Error('No upgrade');
   await new Promise(resolve=>{const change=()=>{if(['redundant','activated'].includes(worker.state))resolve();};worker.addEventListener('statechange',change);change();});
   return {state:worker.state,keys:await caches.keys()};
  });
  expect(failed.state).toBe('redundant');expect(failed.keys.some(k=>k.includes('upgrade-1'))).toBe(true);
  expect(failed.keys.some(k=>k.includes('upgrade-2'))).toBe(false);
  await context.setOffline(true);await page.reload();
  await page.locator('#asset').selectOption('tree-oak');await expect(page.locator('#gallery')).toHaveAttribute('data-loaded','tree-oak');
  await context.setOffline(false);version='upgrade-3';corrupt=false;
  await page.evaluate(async()=>{
   const reg=await navigator.serviceWorker.getRegistration();await reg.update();const worker=reg.installing;
   await new Promise((resolve,reject)=>{const change=()=>{if(worker.state==='activated')resolve();if(worker.state==='redundant')reject(Error('Retry failed'));};worker.addEventListener('statechange',change);change();});
  });
  await expect.poll(()=>page.evaluate(async()=>(await caches.keys()).some(k=>k.includes('upgrade-1')))).toBe(false);
  expect(await page.evaluate(()=>localStorage.getItem('willow-valley:upgrade-test'))).toBe('preserved');
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
