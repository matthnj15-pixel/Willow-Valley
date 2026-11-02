import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
test('WV007 P3 actual selective GLB loading, stable plans across LOD, contacts and owned resource disposal',async({page},info)=>{
 test.setTimeout(60000);await page.setViewportSize({width:1280,height:950});const errors=[],loaded=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().endsWith('.glb')||r.url().includes('.glb?'))loaded.push(r.url());});
 await page.goto('/render-adoption/landscape/review.html');await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 const measurements=[];
 const normal=await page.evaluate(()=>({plan:p3Review.layer.getLandscapeView(),status:p3Review.layer.status(),state:JSON.stringify(p3Review.view)}));
 expect(normal.status.ready).toBe(true);expect(normal.status.effectiveLods.normal).toBeTruthy();expect(normal.plan.fields.length).toBeGreaterThan(0);
 await page.locator('canvas').screenshot({path:info.outputPath('p3-normal.png')});
 for(const [quality,distance] of [['low','near'],['normal','far'],['normal','near']]){
  await page.selectOption('#quality',quality);await page.selectOption('#distance',distance);await expect.poll(()=>page.evaluate(()=>p3Review.layer.status().pendingLoads)).toBe(0);
  const current=await page.evaluate(()=>({plan:p3Review.layer.getLandscapeView(),status:p3Review.layer.status()}));measurements.push(await page.evaluate(()=>({status:p3Review.layer.status(),render:{...p3Review.renderer.info.render},memory:{...p3Review.renderer.info.memory}})));expect(current.status.ready).toBe(true);expect(current.plan).toEqual(normal.plan);expect(current.status.planBuilds).toBe(1);
 }
 const actual=await page.evaluate(()=>{
  const r=p3Review,issues=[];let checked=0;const plan=r.layer.getLandscapeView(),root=r.scene.getObjectByName('wv007-landscape');
  root.updateMatrixWorld(true);for(const row of plan.vegetation){const mesh=root.children[0].children[0].children.find(n=>n.userData.keys?.includes(row.key));if(!mesh){issues.push('missing:'+row.key);continue;}checked++;const i=mesh.userData.keys.indexOf(row.key),a=mesh.instanceMatrix.array.slice(i*16,i*16+16);if(Math.abs(a[12]-row.origin[0])>.001||Math.abs(a[14]-row.origin[2])>.001)issues.push(row.key);}
  const before=r.drawCount;for(let i=0;i<3;i++){r.camera.position.x+=5;r.draw();}return {issues,checked,vegetation:plan.vegetation.length,before,after:r.drawCount,state:JSON.stringify(r.view),resources:r.layer.status().resources};
 });expect(actual.issues).toEqual([]);expect(actual.checked).toBe(actual.vegetation);expect(actual.checked).toBeGreaterThan(0);expect(actual.state).toBe(normal.state);expect(actual.after-actual.before).toBe(3);expect(actual.resources.textureBytes).toBe(0);
 expect(loaded.some(p=>p.includes('/normal.glb?'))).toBe(true);expect(loaded.some(p=>p.includes('/low.glb?'))).toBe(true);expect(loaded.some(p=>p.includes('/far.glb?'))).toBe(true);expect(loaded.every(p=>p.includes('/runtime-landscape-v1/'))).toBe(true);
 await page.evaluate(()=>{p3Review.layer.dispose();p3Review.layer.dispose();});expect(await page.evaluate(()=>p3Review.scene.getObjectByName('wv007-landscape')===undefined)).toBe(true);expect(errors).toEqual([]);
 await writeFile(info.outputPath('plans-and-resources.json'),JSON.stringify({normal,actual,measurements},null,2)+'\n');
 await info.attach('P3 normal plan and renderer resources',{body:JSON.stringify({normal,actual},null,2),contentType:'application/json'});
});
async function screenPoint(page,p){return page.locator('#map').evaluate((el,p)=>{const r=el.getBoundingClientRect(),v=el.viewBox.baseVal;return{x:r.left+(p.x-v.x)*r.width/v.width,y:r.top+(p.y-v.y)*r.height/v.height};},p);}
async function candidate(page){return page.evaluate(async()=>{
 const {planLandscape}=await import('/render-adoption/landscape/plan.mjs'),{savedToMetres,metresToSaved}=await import('/render-adoption/landscape/bridge.mjs'),{zoneAt}=await import('/organic-world.mjs'),metadata=(await import('/assets/wv/runtime-landscape-v1/metadata.mjs')).default;
 const allStorage=()=>JSON.stringify(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]));const storage=allStorage(),state=JSON.parse(localStorage.getItem('willow-valley:main:v1:slot:1')).state,before=JSON.stringify(state),freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};freeze(state);
 const world={seed:'legacy',width:1200,depth:900,terrainRevision:'browser:1'},min=savedToMetres({x:625,y:360},world),max=savedToMetres({x:790,y:480},world);
 const sampleUse=(x,z)=>zoneAt(state,metresToSaved({x,z},world));
 const view=freeze({schemaVersion:1,revision:JSON.stringify(state.zones),world,houses:[],facilities:[],roads:[],localLanes:[],approaches:[],retainedTrees:[],retainedBoundaries:[],committedFields:{cellSize:1,bounds:{minX:min.x,minZ:min.z,maxX:max.x,maxZ:max.z},sampleUse}});
 const plan=planLandscape(view,{}, {world,terrainSurface:{sample:()=>({height:0,water:null,slope:0})},entries:metadata.entries});
 const outside=[];for(const f of plan.boundaries.fences)for(let i=0;i<=10;i++){const x=f.a.x+(f.b.x-f.a.x)*i/10,z=f.a.z+(f.b.z-f.a.z)*i/10;if(sampleUse(x,z)!=='farmland')outside.push(f.key);}
 return {cells:plan.diagnostics.field.cells,fields:plan.fields,fences:plan.boundaries.fences,outside,stateUnchanged:JSON.stringify(state)===before,storageUnchanged:allStorage()===storage};
});}
test('WV007 P3 actual drag, Commit, Eraser and reload feed one committed plan without writing any save slot',async({page})=>{
 test.setTimeout(60000);await page.goto('/?legacy=1');
 await page.evaluate(async()=>{const {newSlot}=await import('/save-slots.mjs'),{startGame,validState}=await import('/simulation.mjs');for(const n of [2,3]){const result=newSlot(localStorage,'willow-valley:main:v1',n,startGame(),validState,'P3 fixture '+n);if(!result.ok)throw Error(result.reason);}});
 await page.locator('#zoneBtn').click();await page.selectOption('#zoneType','farmland');
 const a=await screenPoint(page,{x:680,y:420}),b=await screenPoint(page,{x:728,y:421});await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:15});await page.mouse.up();await expect(page.locator('#map .zone-pending')).toHaveCount(1);expect((await candidate(page)).cells).toBe(0);
 await page.locator('#zoneCommit').click();const committed=await candidate(page);expect(committed.cells).toBeGreaterThan(0);expect(committed.fences.length).toBeGreaterThan(0);expect(committed.outside).toEqual([]);expect(committed.stateUnchanged&&committed.storageUnchanged).toBe(true);
 await page.locator('#zoneBtn').click();await page.locator('#zoneEraser').click();await page.locator('#zoneRadius').evaluate(el=>{el.value='24';el.dispatchEvent(new Event('input',{bubbles:true}));});const erase=await screenPoint(page,{x:700,y:421});await page.mouse.click(erase.x,erase.y);expect((await candidate(page)).cells).toBe(committed.cells);
 await page.locator('#zoneCommit').click();const erased=await candidate(page);expect(erased.cells).toBeLessThan(committed.cells);expect(erased.outside).toEqual([]);expect(erased.stateUnchanged&&erased.storageUnchanged).toBe(true);await page.reload();expect(await candidate(page)).toEqual(erased);
});

test('WV007 P3 cold low profile fetches only low source and seats tree contacts on the displayed surface',async({page})=>{
 const fetched=[];page.on('request',r=>{if(r.url().includes('.glb'))fetched.push(r.url());});
 await page.goto('/render-adoption/landscape/review.html?quality=low');await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 const result=await page.evaluate(()=>{
  const r=p3Review,p=r.layer.getLandscapeView(),issues=[];
  for(const row of p.vegetation.filter(t=>t.key.startsWith('tree:')))for(const point of row.groundContact.points){const height=r.surface.sample(point.x,point.z).height;if(Math.abs(point.height-height)>.00001)issues.push(row.key);}
  return {issues,status:r.layer.status()};
 });expect(result.issues).toEqual([]);expect(result.status.effectiveLods.low).toBeTruthy();expect(result.status.resources.sourceGeometries).toBe(20);expect(result.status.resources.sourceTextureBytes).toBe(0);
 expect(fetched.length).toBe(1);expect(fetched[0]).toContain('/runtime-landscape-v1/low.glb?');
});
