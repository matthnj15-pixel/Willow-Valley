import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

for(const homes of [30,100])test(`WV007 mobile: ${homes}-home camera LOD changes retain host settlement buffers`,async({page})=>{
 test.setTimeout(180000);
 const fixture=JSON.parse(await readFile(`render-adoption/profiling/fixtures/${homes}-homes.json`));
 await page.addInitScript(f=>localStorage.setItem('willow-valley:dev:v1',JSON.stringify(f.state)),fixture);
 await page.goto('/dev/?renderer=three&quality=normal');
 await expect(page.locator('#game3D')).toHaveAttribute('data-wv007-ready','true',{timeout:90000});
 const result=await page.evaluate(async()=>{
  const r=wv007Runtime,frame=()=>new Promise(requestAnimationFrame);
  // Let initial composition and camera policy settle before retaining buffers.
  await frame();await frame();
  const hostMeshes=()=>r.scene.children.filter(n=>n.isMesh&&n.renderOrder>=5&&n.renderOrder<=8);
  const before=hostMeshes().map(n=>n.geometry),fields=r.layers.world.status().fieldBuilds,rendered=r.renderer.info.render.frame;
  const bytes=JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.includes(':slot:'))));
  const fallback=()=>r.getPlacements().records.filter(p=>p.mode==='legacy').map(p=>p.key);
  const originalFallback=fallback(),svg=document.querySelector('#map'),rect=svg.getBoundingClientRect();
  Object.defineProperty(svg,'setPointerCapture',{configurable:true,value:()=>{}});
  const send=(kind,x)=>svg.dispatchEvent(new PointerEvent(kind,{bubbles:true,cancelable:true,pointerId:91,pointerType:'touch',isPrimary:true,clientX:rect.left+rect.width/2+x,clientY:rect.top+rect.height/2,button:0}));
  send('pointerdown',0);
  for(const x of [15,30,45,60]){send('pointermove',x);await frame();await frame();}
  send('pointerup',60);await frame();await frame();
  return {sameBuffers:hostMeshes().every((n,i)=>n.geometry===before[i]),sameFallback:JSON.stringify(originalFallback)===JSON.stringify(fallback()),fieldsUnchanged:fields===r.layers.world.status().fieldBuilds,rendered:r.renderer.info.render.frame>rendered,unchanged:bytes===JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.includes(':slot:')))),ready:r.status().ready};
 });
 expect(result).toEqual({sameBuffers:true,sameFallback:true,fieldsUnchanged:true,rendered:true,unchanged:true,ready:true});
 // Actual edits still refresh guides; month composition still reaches a
 // coherent revision after transient asynchronous readiness flags.
 const old=await page.evaluate(()=>wv007Runtime.getReadView().revision);
 await page.locator('#roadsBtn').click();
 await expect(page.locator('#game3D')).toHaveAttribute('data-road-editor-markers',/^[1-9]/);
 await page.locator('#exploreBtn').click();await page.locator('#nextBtn').click();
 await expect.poll(()=>page.evaluate(()=>{const r=wv007Runtime,v=r.getReadView();return v.revision!==undefined&&r.status().ready&&Object.values(r.layers).every(l=>l.status().ready&&l.status().viewRevision===v.revision)?v.revision:null;}),{timeout:90000}).not.toBe(null);
 const final=await page.evaluate(()=>wv007Runtime.getReadView().revision);expect(final).not.toBe(old);
});

test('WV007 mobile: local diagnostics distinguish reference and live policy',async({page})=>{
 test.setTimeout(120000);await page.goto('/dev/ui-kit/wv007-integrated.html');
 await expect(page.locator('#start')).toBeEnabled({timeout:90000});
 await expect(page.locator('#status')).toContainText('full requested building reference · water off');
 await page.selectOption('#policy','live');await page.locator('#controls button').click();
 await expect(page.locator('#start')).toBeEnabled({timeout:90000});
 await expect(page.locator('#status')).toContainText('gameplay distance/culling policy · live water');
 const record=await page.evaluate(()=>wv007Integrated.run({warmupMs:0,durationMs:200}));
 expect(record.presentationProfile).toBe('live-gameplay-water-on');
 expect(record.issues).toContain('non-device-duration');
});

test('WV007 mobile: camera asset failure refreshes host fallback bindings',async({page})=>{
 test.setTimeout(120000);
 await page.route('**/ui-kit/wv007-integrated.mjs',route=>route.fulfill({body:'',contentType:'text/javascript'}));
 await page.route('**/runtime-buildings-v1/c4-distance.glb',route=>route.abort());
 await page.goto('/dev/ui-kit/wv007-integrated.html');
 const result=await page.evaluate(async()=>{
  const {mountWorld3D}=await import('/dev/world-renderer-three.mjs'),{createFixtureSession}=await import('/dev/render-adoption/profiling/scenarios.mjs');
  const fixture=await(await fetch('/dev/render-adoption/profiling/fixtures/30-homes.json')).json(),session=createFixtureSession(fixture);
  const viewer=mountWorld3D(document.querySelector('#integrated'),session.world,{adoption:true,quality:'game',animateWater:false,interactive:false});
  viewer.setCamera({focusX:1000-session.world.width/2,focusZ:332-session.world.depth/2,zoom:180});viewer.setSettlement(session.snapshot());await viewer.whenReady();
  const r=viewer.getAdoptionRuntime(),before=JSON.stringify(session.snapshot()),record=r.getPlacements().records.find(p=>p.assetId==='home-steep-gable'&&p.mode!=='legacy');
  if(!record)throw Error('Expected close adopted home');
  const geometry=()=>r.scene.children.find(n=>n.isMesh&&n.renderOrder===7).geometry,old=geometry(),entity=r.getReadView().houses.find(h=>h.key===record.key);
  viewer.setCamera({focusX:entity.savedPosition.x-session.world.width/2+500,focusZ:entity.savedPosition.y-session.world.depth/2,zoom:180});await viewer.whenReady();
  const next=r.getPlacements().records.find(p=>p.key===record.key),result={mode:next.mode,reason:next.reason,refreshed:geometry()!==old,unchanged:before===JSON.stringify(session.snapshot())};viewer.dispose();return result;
 });
 expect(result).toEqual({mode:'legacy',reason:'load-error',refreshed:true,unchanged:true});
});
