import {test,expect} from '@playwright/test';
test('plot landscape: irregular size fits, one old shared fence, painted hole and stable normal/low boundaries',async({page},info)=>{
 test.setTimeout(90000);await page.setViewportSize({width:1400,height:1100});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/ui-kit/wv006-landscape.html?scene=plots');await expect(page.locator('#landscape')).toHaveAttribute('data-composition','plots',{timeout:30000});
 let boundaries,trees;
 for(const quality of ['normal','low'])for(const distance of ['near','far']){
  await page.selectOption('#quality',quality);await page.selectOption('#distance',distance);
  const r=await page.evaluate(()=>{const h=landscapeReview.hamlet;return{stats:landscapeReview.stats,issues:h.inspect(),contacts:h.inspectGround(),plots:h.plan.holdings.map(p=>({key:p.key,vertices:p.polygon.length})),boundaries:h.plotDressing.boundaries.fences,props:h.props.filter(p=>p.kind==='fruit-tree').map(({key,origin,scale,yaw})=>({key,origin,scale,yaw})),holes:h.plan.regions.filter(p=>p.kind==='field').flatMap(f=>f.holes||[]).length};});
  expect(r.stats.stage).toBe(4);expect(r.stats.sharedBoundaries).toBe(1);expect(r.stats.reusedBoundaries).toBe(1);expect(r.holes).toBe(1);expect(r.plots.every(p=>p.vertices>=5)).toBe(true);expect(r.stats.plotStatistics.find(p=>p.key==='holding-04').props).toBe(0);expect(r.stats.plotStatistics.find(p=>p.key==='holding-03').props).toBeGreaterThan(1);expect(r.stats.plotStatistics.find(p=>p.key==='holding-01').beds).toBeGreaterThan(0);
  expect(r.issues).toEqual([]);expect(r.contacts).toEqual([]);expect(r.stats.drawCalls).toBeLessThanOrEqual(quality==='low'?100:150);expect(r.stats.triangles).toBeLessThanOrEqual(quality==='low'?150000:250000);expect(r.stats.fenceStats.drawCalls).toBe(2);
  const old=r.boundaries.find(f=>f.key==='earlier-household-fence');expect(old.a).toEqual({x:-8,z:-9});expect(old.b).toEqual({x:-8,z:12});expect(old.users).toEqual(['holding-01','holding-02']);
  if(!boundaries)boundaries=r.boundaries;if(!trees)trees=r.props;expect(r.boundaries).toEqual(boundaries);expect(r.props).toEqual(trees);
  await page.locator('.stage').screenshot({path:info.outputPath(`plots-${quality}-${distance}.png`)});
 }
 await page.selectOption('#quality','normal');await page.selectOption('#distance','near');const builds=await page.evaluate(()=>landscapeReview.builds);for(const focus of ['green','gardens','farm','overview'])await page.selectOption('#hamlet-view',focus);expect(await page.evaluate(()=>landscapeReview.builds)).toBe(builds);
 await page.selectOption('#scene','hamlet');await page.selectOption('#scene','plots');const geometries=await page.evaluate(()=>landscapeReview.stats.geometries);for(let i=0;i<2;i++){await page.selectOption('#scene','hamlet');await page.selectOption('#scene','plots');}expect(await page.evaluate(()=>landscapeReview.stats.geometries)).toBe(geometries);expect(errors).toEqual([]);
});
async function screenPoint(page,p){return page.locator('#map').evaluate((el,p)=>{const r=el.getBoundingClientRect(),v=el.viewBox.baseVal;return{x:r.left+(p.x-v.x)*r.width/v.width,y:r.top+(p.y-v.y)*r.height/v.height};},p);}
async function readFieldCandidate(page){return page.evaluate(async()=>{
 const {derivePaintedFields}=await import('/assets/wv/landscape-next/painted-fields.mjs');const {planPlotBoundaries}=await import('/assets/wv/landscape-next/plot-boundaries.mjs');const {zoneAt}=await import('/organic-world.mjs');const raw=localStorage.getItem('willow-valley:main:v1:slot:1'),state=JSON.parse(raw).state,before=JSON.stringify(state),U=2.8;
 const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};freeze(state);
 const sampleUse=(x,z)=>zoneAt(state,{x:x*U,y:z*U}),sampleSurface=()=>({height:0,water:null,slope:0});const fields=derivePaintedFields({bounds:{minX:625/U,minZ:360/U,maxX:790/U,maxZ:480/U},cellSize:1,sampleUse,sampleSurface});const boundary=planPlotBoundaries({plots:fields.fields,sample:sampleSurface});
 const outside=[];for(const f of boundary.fences)for(let i=0;i<=10;i++){const x=f.a.x+(f.b.x-f.a.x)*i/10,z=f.a.z+(f.b.z-f.a.z)*i/10;if(sampleUse(x,z)!=='farmland')outside.push(f.key);}
 return{cells:fields.diagnostics.cells,fields:fields.fields.length,fences:boundary.fences.length,outside,stateUnchanged:before===JSON.stringify(state),storageUnchanged:raw===localStorage.getItem('willow-valley:main:v1:slot:1')};
});}
test('plot landscape adapter reads actual drag-painted committed farmland, erasures and reload without changing state',async({page})=>{
 test.setTimeout(60000);await page.goto('/?legacy=1');await page.locator('#zoneBtn').click();await page.selectOption('#zoneType','farmland');
 const start=await screenPoint(page,{x:680,y:420}),end=await screenPoint(page,{x:728,y:421});await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:15});await page.mouse.up();await expect(page.locator('#map .zone-pending')).toHaveCount(1);
 expect((await readFieldCandidate(page)).cells).toBe(0);await page.locator('#zoneCommit').click();const committed=await readFieldCandidate(page);expect(committed.cells).toBeGreaterThan(0);expect(committed.fences).toBeGreaterThan(0);expect(committed.outside).toEqual([]);expect(committed.stateUnchanged&&committed.storageUnchanged).toBe(true);
 await page.locator('#zoneBtn').click();await page.locator('#zoneEraser').click();await page.locator('#zoneRadius').evaluate(el=>{el.value='24';el.dispatchEvent(new Event('input',{bubbles:true}));});const erase=await screenPoint(page,{x:700,y:421});await page.mouse.click(erase.x,erase.y);expect((await readFieldCandidate(page)).cells).toBe(committed.cells);await page.locator('#zoneCommit').click();const erased=await readFieldCandidate(page);expect(erased.cells).toBeLessThan(committed.cells);expect(erased.outside).toEqual([]);expect(erased.stateUnchanged&&erased.storageUnchanged).toBe(true);await page.reload();expect(await readFieldCandidate(page)).toEqual(erased);
});
