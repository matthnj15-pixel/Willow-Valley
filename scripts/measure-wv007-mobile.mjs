// Local automation evidence, not a physical-device FPS test. Uses the real game
// route and detached fixture copies. Instrumentation is injected only by routes.
import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const output=process.env.WV007_OUTPUT;
if(!output)throw Error('Set WV007_OUTPUT to a NEW evidence directory');
await mkdir(output,{recursive:true});
const revision=process.env.WV007_REVISION||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const baseline=process.env.WV007_REVISION,base=process.env.WV007_BASE_URL||'http://127.0.0.1:4173';
const onlyEdits=process.env.WV007_EDITS_ONLY==='1';
const onlyCpu=process.env.WV007_CPU_ONLY==='1';
const onlyDetail=process.env.WV007_DETAIL_ONLY==='1';
const sourceCache=new Map();
async function source(path){if(!sourceCache.has(path))sourceCache.set(path,baseline?execFileSync('git',['show',baseline+':'+path],{encoding:'utf8',maxBuffer:16*1024*1024}):await readFile(path,'utf8'));return sourceCache.get(path);}
const summary=[],browser=await chromium.launch({headless:true});
try{for(const homes of (process.env.WV007_HOMES||'30,100').split(',').map(Number))for(const [renderer,quality]of [['three','normal'],['three','low'],['webgl','normal']]){
 if((onlyEdits&&renderer!=='three')||((onlyCpu||onlyDetail)&&(renderer!=='three'||quality!=='normal')))continue;
 const context=await browser.newContext({viewport:{width:669,height:951},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const fixture=JSON.parse(await readFile(`render-adoption/profiling/fixtures/${homes}-homes.json`));
 await context.addInitScript(f=>{
  if(!localStorage.getItem('willow-valley:dev:v1'))localStorage.setItem('willow-valley:dev:v1',JSON.stringify(f.state));
  window.__wvProbe={geometry:[],draw:[],uploads:[],simulation:[],persistence:[],assets:[],native:{frame:0}};
 },fixture);
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(240000);page.on('pageerror',e=>errors.push(e.message));
 await page.route(/\/dev\/.*\.(mjs|js|html)(\?.*)?$/,async route=>{
  const path=new URL(route.request().url()).pathname.slice('/dev/'.length)||'index.html';
  let s;try{s=await source(path);}catch{return route.continue();}
  if(path==='game-3d-mesh.mjs'){
   s=s.replace('export function settlementGeometry(','function originalGeometry(');
   s+='\nexport function settlementGeometry(...args){const t=performance.now();try{return originalGeometry(...args);}finally{window.__wvProbe.geometry.push(performance.now()-t);}}';
  }
  if(path==='ui-kit/render-3d.mjs'){
   s=s.replace('export function mountWorld3D(','function originalMount(')
    .replace('function put(index,data,surfaceKinds=null,surfaceOffsets=null){','function put(index,data,surfaceKinds=null,surfaceOffsets=null){window.__wvProbe.uploads.push({index,bytes:data.byteLength});')
    .replace('function draw(){','function draw(){const probeStart=performance.now();')
    .replace('editorOverlay.draw(contactWorld,camera,editorMarkers);','editorOverlay.draw(contactWorld,camera,editorMarkers);window.__wvProbe.draw.push(performance.now()-probeStart);if(!presentation)window.__wvProbe.native={frame:window.__wvProbe.native.frame+1,calls:counts.filter(c=>c>0).length,triangles:counts.reduce((a,b)=>a+b,0)/3};')
    .replace('if(!firstDraw){firstDraw=true;','if(!firstDraw){window.__wvProbe.firstHostDrawMs=performance.now();firstDraw=true;');
   s+='\nexport function mountWorld3D(...args){const v=originalMount(...args);window.probeViewer=v;return v;}';
  }
  if(path==='world-renderer-three.mjs'){
   s=s.replace('export function mountWorld3D(','function originalMount(');
   s+=`\nexport function mountWorld3D(...args){
    if(!window.__wvParseProbe){window.__wvParseProbe=true;const parse=THREE.GLTFLoader.prototype.parse;
     THREE.GLTFLoader.prototype.parse=function(data,path,onLoad,onError){const t=performance.now();return parse.call(this,data,path,value=>{window.__wvProbe.assets.push({phase:'parse-and-dependent-decode',path,ms:performance.now()-t});onLoad(value);},onError);};}
    const v=originalMount(...args);window.probeViewer=v;return v;}`;
  }
  for(const [module,name,metric]of [['simulation.mjs','advance','simulation'],['save-slots.mjs','saveSlot','persistence']])if(path===module){
   s=s.replace(`export function ${name}(`,`function original${name}(`);
   s+=`\nexport function ${name}(...args){const t=performance.now();try{return original${name}(...args);}finally{window.__wvProbe.${metric}.push(performance.now()-t);}}`;
  }
  await route.fulfill({body:s,contentType:path.endsWith('.html')?'text/html':'text/javascript'});
 });
 const bootStart=Date.now();await page.goto(`${base}/dev/?renderer=${renderer}&quality=${quality}`);
 await page.waitForFunction(()=>!!window.probeViewer);
 if(renderer==='three')await page.waitForFunction(()=>document.querySelector('#game3D').dataset.wv007Ready==='true');
 else await page.waitForFunction(()=>probeViewer.assetStatus().loaded===10);
 const bootMs=Date.now()-bootStart;
 const initial=await page.evaluate(async()=>{
  const v=probeViewer;await v.whenReady?.();const r=v.getAdoptionRuntime?.(),gl=r?.renderer.getContext()||document.querySelector('#game3D').getContext('webgl'),ext=gl.getExtension('WEBGL_debug_renderer_info');
  return {graphics:JSON.parse(localStorage.getItem('willow-valley:dev:v1:graphics')),effective:{...document.querySelector('#game3D').dataset},camera:v.getCamera(),world:r?.getReadView().world,status:v.assetStatus(),userAgent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,displayMode:matchMedia('(display-mode: standalone)').matches?'standalone':'browser',serviceWorker:navigator.serviceWorker.controller?.scriptURL??null,caches:await caches.keys(),probe:__wvProbe};
 });
 const records=[];
 const parcel=fixture.state.houses.find(h=>h.parcel),first=fixture.state.houses[0];
 const plannedCamera={...initial.camera,focusX:initial.camera.focusX-115+parcel.x-first.x,focusZ:initial.camera.focusZ+parcel.y-first.y,yaw:Math.PI/4,pitch:.72};
 if(!onlyEdits&&!onlyCpu&&!onlyDetail&&quality==='normal')for(const [view,zoom]of [['close',180],['town',650],['far',1200]]){
  // Reset from the exact initial camera for matched normal screenshots.
  await page.evaluate(async({zoom,camera})=>{probeViewer.setCamera({...camera,zoom});await probeViewer.whenReady?.();await new Promise(requestAnimationFrame);},{zoom,camera:plannedCamera});
  await page.locator('#game3D').screenshot({path:`${output}/${homes}-${renderer}-${quality}-${view}.png`});
  records.push({view,zoom,status:await page.evaluate(()=>probeViewer.assetStatus()),layers:renderer==='three'?await page.evaluate(()=>Object.fromEntries(Object.entries(probeViewer.getAdoptionRuntime().layers).map(([k,l])=>[k,l.status()]))):null});
 }
 if(onlyDetail)for(const assetId of ['home-steep-gable','home-low-hip','home-long-ridge','facility-smith','facility-granary']){
  const detail=await page.evaluate(async assetId=>{
   const v=probeViewer,r=v.getAdoptionRuntime(),{entityBounds}=await import('/dev/render-adoption/integration/visibility.mjs');
   const p=r.getPlacements().records.find(p=>p.assetId===assetId&&p.mode!=='legacy');if(!p)throw Error('No admitted '+assetId);
   const e=[...r.getReadView().houses,...r.getReadView().facilities].find(e=>e.key===p.key),w=r.getReadView().world;
   v.setCamera({focusX:e.savedPosition.x-w.width/2,focusZ:e.savedPosition.y-w.depth/2,zoom:180});await v.whenReady();
   const box=entityBounds([r.scene]).get(p.key),center=box.getCenter(new (await import('/dev/assets/vendor/three.module.mjs')).Vector3()),yaw=.6,pitch=assetId==='facility-granary'?.5:.72,shift=(center.y-17)/Math.tan(pitch);
   const camera={focusX:center.x+Math.sin(yaw)*shift,focusZ:center.z-Math.cos(yaw)*shift,zoom:45,yaw,pitch};v.setCamera(camera);await v.whenReady();
   const placement=r.getPlacements().records.find(n=>n.key===p.key);if(placement.effectiveLod!=='normal')throw Error('Detail did not use normal C4');
   return {assetId,key:p.key,camera,placement,status:v.assetStatus()};
  },assetId);
  await page.locator('#game3D').screenshot({path:`${output}/${homes}-${assetId}.png`});records.push(detail);
 }
 const runs=[];
 for(let repeat=0;repeat<(onlyEdits||onlyDetail?0:3);repeat++)for(const path of ['idle','orbit','pan','zoom']){
  const run=await page.evaluate(async({path,repeat,camera,onlyCpu})=>{
   const v=probeViewer,r=v.getAdoptionRuntime?.(),frame=()=>new Promise(requestAnimationFrame),stats=()=>r?{...r.renderer.info.render}:__wvProbe.native;
   v.setCamera({...camera,zoom:650});await v.whenReady?.();await frame();
   const render=r?.renderer.render;if(onlyCpu&&r)r.renderer.render=()=>{};
   const before=JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.includes(':slot:'))));
   __wvProbe.geometry=[];__wvProbe.draw=[];__wvProbe.uploads=[];
   const samples=[];let last=performance.now(),lastToken=stats().frame;
   for(let i=0;i<24;i++){
    const u=i/23,at=performance.now();
    if(path!=='idle')v.setCamera({...camera,focusX:camera.focusX+(path==='pan'?u*144:0),zoom:path==='zoom'?180+1020*u:650,yaw:camera.yaw+(path==='orbit'?u*Math.PI*.5:0)});
    else if(i===0)v.render();
    await frame();const now=performance.now(),s=stats();samples.push({intervalMs:now-last,submitResponseMs:now-at,changed:s.frame!==lastToken,...s});last=now;lastToken=s.frame;
   }
   await v.whenReady?.();await frame();
   const status=v.assetStatus(),result={path,repeat,samples,probe:structuredClone(__wvProbe),status,layers:r?Object.fromEntries(Object.entries(r.layers).map(([k,l])=>[k,l.status()])):null,unchanged:before===JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.includes(':slot:'))))};
   if(render)r.renderer.render=render;return result;
  },{path,repeat,camera:plannedCamera,onlyCpu});
  runs.push(run);console.log(JSON.stringify({homes,renderer,quality,path,repeat,geometryCalls:run.probe.geometry.length,geometryMs:run.probe.geometry.reduce((a,b)=>a+b,0)}));
 }
 const edits=onlyEdits?await page.evaluate(async camera=>{
  const v=probeViewer,frame=()=>new Promise(requestAnimationFrame),results=[];
  v.setCamera({...camera,zoom:650});await v.whenReady();
  const svg=document.querySelector('#map'),rect=svg.getBoundingClientRect();
  Object.defineProperty(svg,'setPointerCapture',{configurable:true,value:()=>{}});
  const send=(kind,x,y)=>svg.dispatchEvent(new PointerEvent(kind,{bubbles:true,cancelable:true,pointerId:91,pointerType:'touch',isPrimary:true,clientX:rect.left+rect.width/2+x,clientY:rect.top+rect.height/2+y,button:0}));
  const tap=(x,y)=>{send('pointerdown',x,y);send('pointerup',x,y);};
  async function timed(name,action){
   __wvProbe.geometry=[];__wvProbe.draw=[];__wvProbe.uploads=[];__wvProbe.persistence=[];
   const t=performance.now();action();const synchronousMs=performance.now()-t;
   await frame();await v.whenReady();await frame();
   results.push({name,synchronousMs,updatedSceneMs:performance.now()-t,probe:structuredClone(__wvProbe),pendingZoning:document.querySelector('#game3D').dataset.pendingZoning,roadDraftReady:!document.querySelector('#confirmRoad').disabled});
  }
  await timed('road-mode',()=>document.querySelector('#roadsBtn').click());
  await timed('road-two-anchors',()=>{
   tap(-30,20);
   const extend=[...document.querySelectorAll('button')].find(b=>['Extend road from here','Insert a junction here and extend'].includes(b.textContent.trim()));extend?.click();
   tap(80,50);if(document.querySelector('#confirmRoad').disabled)throw Error('Road probe did not create a buildable two-anchor draft');
  });
  await timed('road-cancel',()=>document.querySelector('#cancelRoad').click());
  await timed('zone-mode',()=>document.querySelector('#zoneBtn').click());
  await timed('zone-paint',()=>{send('pointerdown',20,20);send('pointermove',40,25);send('pointerup',40,25);});
  await timed('zone-erase',()=>{document.querySelector('#zoneEraser').click();send('pointerdown',25,20);send('pointermove',35,25);send('pointerup',35,25);});
  await timed('zone-commit',()=>document.querySelector('#zoneCommit').click());
  document.querySelector('#exploreBtn').click();await v.whenReady();
  return results;
 },plannedCamera):null;
 // Explicitly retain the async month transition, including temporary stale
 // revisions. Readiness is checked again after the final rendered update.
 const month=renderer==='three'&&!onlyCpu&&!onlyDetail?await page.evaluate(async()=>{
  const v=probeViewer,r=v.getAdoptionRuntime(),key='willow-valley:dev:v1:slot:1',before=JSON.parse(localStorage.getItem(key)).state;
  const {advance}=await import('/dev/simulation.mjs'),expected=structuredClone(before);advance(expected,{events:true});
  const snapshots=[],t=performance.now();__wvProbe.geometry=[];__wvProbe.draw=[];__wvProbe.uploads=[];__wvProbe.simulation=[];__wvProbe.persistence=[];
  const snapshot=()=>({ms:performance.now()-t,status:r.status(),revision:r.getReadView()?.revision,layers:Object.fromEntries(Object.entries(r.layers).map(([k,l])=>[k,{ready:l.status().ready,revision:l.status().viewRevision}]))});
  document.querySelector('#nextBtn').click();const synchronousMs=performance.now()-t,after=JSON.parse(localStorage.getItem(key)).state;snapshots.push(snapshot());
  await new Promise(requestAnimationFrame);snapshots.push(snapshot());await v.whenReady();await new Promise(requestAnimationFrame);snapshots.push(snapshot());
  return {synchronousSimulationPersistenceAndRefreshMs:synchronousMs,updatedInteractiveSceneMs:performance.now()-t,checked:JSON.stringify(after)===JSON.stringify(expected),beforeTurn:before.turn,afterTurn:after.turn,snapshots,probe:__wvProbe};
 }):null;
 const sourcePins=[...sourceCache].map(([path,s])=>({path,sha256:createHash('sha256').update(s).digest('hex')}));
 const record={revision,sourcePins,plannedCamera,onlyCpu,instrumentation:'Playwright route wrappers only; fixed 24-pose paths, three repeats; no device duration claim; CPU-only probes suppress renderer.render after full normal boot and retain camera/LOD/geometry work',environment:'Chromium software WebGL; desktop automation, not Duo',homes,renderer,quality,bootMs,initial,views:records,runs,edits,month,errors};
 await writeFile(`${output}/${homes}-${renderer}-${quality}.json.gz`,gzipSync(JSON.stringify(record)+'\n'));
 summary.push({homes,renderer,quality,bootMs,errors,month:month&&{checked:month.checked,ms:month.updatedInteractiveSceneMs}});
 await writeFile(`${output}/summary.json`,JSON.stringify(summary,null,2)+'\n');await context.close();
}}finally{await browser.close();}
