import {writeFile} from 'node:fs/promises';
import {test,expect} from '@playwright/test';
for(const seed of ['WILLOW-1048','WV007-RIVER-2099'])for(const quality of ['normal','low'])test(`P2 real-world materials, close/wide categories and host cadence ${seed} ${quality}`,async({page},info)=>{
 test.setTimeout(120000);const errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('request',r=>{if(new URL(r.url()).origin!=='http://127.0.0.1:4173')external.push(r.url());});
 await page.goto(`/assets/wv/runtime-environment-v1/review.html?seed=${seed}&quality=${quality}`);
 await expect.poll(()=>page.evaluate(()=>!!window.worldHarness),{timeout:30000}).toBe(true);
 const storage=await page.evaluate(()=>JSON.stringify(localStorage)),measurements=[];
 for(const name of ['homes','meadow','forest','rock','bank','lake','river','wide']){
  const point=await page.evaluate(n=>window.worldHarness.setView(n),name);
  expect(point.found,`actual ${name} category`).toBe(true);
  const status=await page.evaluate(()=>window.worldHarness.status());
  expect(status.stateUnchanged).toBe(true);expect(status.pendingLoads).toBe(0);expect(status.ready).toBe(true);expect(status.resources.externalImages).toBe(0);
  if(name==='homes'||name==='meadow'||name==='wide')await page.locator('canvas').screenshot({path:info.outputPath(`${name}.png`)});
  measurements.push({name,point,status});
 }
 const b=await page.evaluate(()=>window.worldHarness.status());
 await page.evaluate(()=>{for(let i=0;i<5;i++){window.worldHarness.camera.position.x+=2;window.worldHarness.layer.setCamera(window.worldHarness.camera);}window.worldHarness.render();});
 const a=await page.evaluate(()=>window.worldHarness.status());expect(a.fieldBuilds).toBe(b.fieldBuilds);expect(a.viewportResizes).toBe(b.viewportResizes);
 await page.waitForTimeout(220);expect((await page.evaluate(()=>window.worldHarness.status())).draws).toBe(a.draws);
 await page.evaluate(()=>window.worldHarness.setHidden(true));expect(await page.evaluate(()=>window.worldHarness.layer.needsAnimation({waterVisible:true}))).toBe(false);
 await page.evaluate(()=>window.worldHarness.setHidden(false));
 const intervals=await page.evaluate(async()=>{const times=[];for(let i=0;i<8;i++){await new Promise(r=>requestAnimationFrame(r));times.push(performance.now());window.worldHarness.render();}return times.slice(1).map((t,i)=>t-times[i]);});
 expect(intervals.every(x=>Number.isFinite(x)&&x>0)).toBe(true);
 expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe(storage);
 const metricPath=info.outputPath('metrics.json');await writeFile(metricPath,JSON.stringify({seed,quality,measurements,trueFrameIntervalsMs:intervals,device:'cloud Chromium software; no phone acceptance'},null,2));await info.attach('world-metrics',{path:metricPath,contentType:'application/json'});
 await page.evaluate(()=>{window.worldHarness.dispose();window.worldHarness.dispose();});
 expect(await page.evaluate(()=>window.worldHarness.status().disposed)).toBe(true);expect(errors).toEqual([]);expect(external).toEqual([]);
});
test('P2 shader compilation after quality switch, viewport resize, early disposal and missing module',async({page})=>{
 test.setTimeout(60000);const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/dev/assets/wv/runtime-environment-v1/review.html?quality=low');await expect.poll(()=>page.evaluate(()=>!!window.worldHarness),{timeout:30000}).toBe(true);
 await page.evaluate(()=>window.worldHarness.quality('normal'));expect(await page.evaluate(()=>window.worldHarness.status().quality)).toBe('normal');
 const before=await page.evaluate(()=>window.worldHarness.status().viewportResizes);await page.setViewportSize({width:700,height:900});await page.waitForTimeout(100);
 expect(await page.evaluate(()=>window.worldHarness.status().viewportResizes)).toBe(before+1);expect(errors).toEqual([]);
 await page.evaluate(async()=>{const {createWorldLayer}=await import('/render-adoption/world/index.mjs');const h=window.worldHarness,f=h.fixture,l=createWorldLayer({scene:h.scene,world:f.world,terrainSurface:f.surface});const p=l.update(f.view);l.dispose();window.earlyResult=await p;});expect(await page.evaluate(()=>window.earlyResult)).toBe(false);
 await page.route('**/runtime-environment-v1/review.mjs',r=>r.abort());await page.reload();expect(await page.evaluate(()=>!!window.worldHarness)).toBe(false);
});
