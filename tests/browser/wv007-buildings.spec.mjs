import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
test('P1 real loader: low closure, all civic choices, distance geometry and detached actual-state review',async({page})=>{
 test.setTimeout(120000);const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.goto('/render-adoption/buildings/review.html');await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 let stats=await page.evaluate(()=>p1.stats());expect(stats.layers[0].effectiveLods.normal).toBe(1);expect(stats.layers[1].effectiveLods.distance).toBe(1);expect(stats.render.triangles).toBeGreaterThan(1000);
 await page.screenshot({path:'docs/testing/wv007-p1/normal-distance-homes.png'});
 await page.selectOption('#asset','facility-granary');await expect(page.locator('body')).toHaveAttribute('data-ready','true');await expect.poll(()=>page.evaluate(()=>p1.layers[0].getPlacements().records[0]?.assetId)).toBe('facility-granary');await page.click('#slope');await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 await expect.poll(()=>page.evaluate(()=>p1.layers[0].getPlacements().records[0].supportContacts?.length)).toBe(8);
 const granary=await page.evaluate(()=>p1.layers[0].getPlacements().records[0]);expect(granary.levelFloorGameY-granary.originY).toBeCloseTo(1.35*2.8,8);expect(new Set(granary.supportContacts.map(s=>s.extensionGameUnits.toFixed(3))).size).toBeGreaterThan(1);
 await page.screenshot({path:'docs/testing/wv007-p1/granary-contacts.png'});
 for(const id of ['facility-farm','facility-smith','facility-lumber','facility-market','park-promenade','park-sitting-garden','park-village-green','park-woodland-walk','plaza-town-square','plaza-fountain-court','plaza-flower-court','plaza-festival-court']){
  await page.selectOption('#asset',id);await expect(page.locator('body')).toHaveAttribute('data-ready','true');await expect.poll(()=>page.evaluate(()=>p1.layers[0].getPlacements().records[0]?.assetId)).toBe(id);expect((await page.evaluate(()=>p1.layers[0].status())).failures).toEqual([]);expect((await page.evaluate(()=>p1.layers[0].status())).admitted).toHaveLength(1);
  const furniture=await page.evaluate(()=>p1.layers[0].getPlacements().records[0].renderedIntegralContacts.filter(c=>c.kind==='furniture').map(c=>({base:c.minGameY,terrain:Math.min(...c.worldGame.map(p=>p1.surface.sample(p.x,p.y).height))})));
  for(const seat of furniture)expect(seat.base).toBeGreaterThanOrEqual(seat.terrain-.02);
 }
 await page.screenshot({path:'docs/testing/wv007-p1/civic-normal-distance.png'});
 await page.selectOption('#quality','low');await expect(page.locator('body')).toHaveAttribute('data-ready','true');await expect.poll(()=>page.evaluate(()=>p1.layers[0].status().quality)).toBe('low');stats=await page.evaluate(()=>p1.stats());expect(stats.layers.every(l=>l.bundles.every(b=>b.quality!=='normal'))).toBe(true);
 await page.click('#actual');await expect.poll(()=>page.evaluate(()=>p1.readView.revision)).toMatch(/^actual-/);expect(await page.evaluate(()=>Object.isFrozen(p1.readView))).toBe(true);expect((await page.evaluate(()=>p1.stats())).layers[0].fallback.length).toBeGreaterThan(0);
 expect(requests.filter(r=>/buildings-next|storage-next|civic\.glb|catalog\.glb/.test(r))).toEqual([]);expect(errors).toEqual([]);
});
test('P1 measures 100 C4 homes with explicit requested and effective LODs',async({page})=>{
 test.setTimeout(90000);await page.goto('/render-adoption/buildings/review.html');await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 const report=await page.evaluate(async()=>{
  const T=await import('/assets/vendor/three.module.mjs'),{createBuildingLayer}=await import('/render-adoption/buildings/index.mjs'),{createTerrainSurface}=await import('/terrain-surface.mjs');
  for(const l of p1.layers)l.dispose();
  const world={width:1000,depth:800,seed:'100-C4-regression',sample:()=>({height:0,water:null}),slope:()=>0},surface=createTerrainSurface(world,50,40),scene=new T.Scene();scene.background=new T.Color('#b6c5b3');scene.add(new T.HemisphereLight(0xffffff,0x786e52,2));
  const houses=Array.from({length:100},(_,i)=>{const x=270+i%10*45,y=170+Math.floor(i/10)*45;return{key:'benchmark-'+i,identity:[0,1,2,4,5][i%5],savedPosition:{x,y},yaw:(i%4)*Math.PI/2,parcel:{vertices:[{x:x-20,y:y-20},{x:x+20,y:y-20},{x:x+20,y:y+20},{x:x-20,y:y+20}],holes:[]},actualEntrance:null};});
  const view=Object.freeze({schemaVersion:1,revision:'100-C4-regression',world:{seed:world.seed},houses,facilities:[],roads:[],localLanes:[]}),serialized=JSON.stringify(view),layer=await createBuildingLayer({scene,terrainSurface:surface,world}),camera=new T.OrthographicCamera(-300,300,300,-300,1,2000);camera.position.set(0,700,150);camera.lookAt(0,0,0);const metrics=[];
  for(const quality of ['normal','low','distance']){const start=performance.now();if(quality!=='distance')await layer.setQuality(quality);await layer.update(view,quality==='distance'?{cameraPositionGame:[650,50,0]}:{});p1.renderer.render(scene,camera);metrics.push({requestedQuality:quality==='distance'?'low':quality,policy:quality,updateAndSoftwareDrawMs:performance.now()-start,status:layer.status(),renderer:{...p1.renderer.info.render},memory:{...p1.renderer.info.memory}});}
  const unchanged=JSON.stringify(view)===serialized;layer.dispose();return{fixture:'synthetic isolated regression; actual-state coverage is separate',deviceAcceptance:false,unchanged,metrics};
 });
 expect(report.unchanged).toBe(true);expect(report.metrics[0].status.effectiveLods).toEqual({normal:100});expect(report.metrics[1].status.effectiveLods).toEqual({low:100});expect(report.metrics[2].status.effectiveLods).toEqual({distance:100});expect(report.metrics[2].status.resourceStats.triangles).toBeLessThan(report.metrics[0].status.resourceStats.triangles);
 await writeFile('docs/testing/wv007-p1/benchmark.json',JSON.stringify(report,null,2)+'\n');
});
test('P1 cold low request never fetches a normal bundle and repeated quality updates release resources',async({page})=>{
 test.setTimeout(60000);await page.goto('/render-adoption/buildings/review.html');await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 const result=await page.evaluate(async()=>{const T=await import('/assets/vendor/three.module.mjs'),{createBuildingLayer}=await import('/render-adoption/buildings/index.mjs');const scene=new T.Scene(),layer=await createBuildingLayer({scene,terrainSurface:p1.surface,world:p1.world,quality:'low'});await layer.update(p1.readView);const a=layer.status();const occupied=layer.getPlacements().records[0].integralExclusions;await layer.setQuality('normal');const b=layer.status();await layer.setQuality('low');const c=layer.status();const same=JSON.stringify(occupied)===JSON.stringify(layer.getPlacements().records[0].integralExclusions);layer.dispose();layer.dispose();return{a,b,c,same,children:scene.children.length};});
 expect(result.a.bundles.map(b=>b.quality)).toEqual(['low']);expect(result.b.bundles.map(b=>b.quality)).toEqual(['normal']);expect(result.c.bundles.map(b=>b.quality)).toEqual(['low']);expect(result.same).toBe(true);expect(result.children).toBe(0);
});
