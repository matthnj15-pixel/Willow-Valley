import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createDiagnosticsController,percentiles,probeCapabilities,SCHEMA} from '../render-adoption/profiling/index.mjs';
import {createFixtureSession,validateFixture,cameraAt,createScenarioDriver} from '../render-adoption/profiling/scenarios.mjs';
import {inspectFixtures} from '../scripts/measure-wv007-runtime.mjs';
import {estimateResources} from '../render-adoption/profiling/resources.mjs';
import {facilityPlacement} from '../building-visuals.mjs';

const pin={path:'test/unit-only',sha256:'a'.repeat(64)};
const expectedSourcePins={buildings:[pin],world:[pin],landscape:[pin]};
function setup() {
  const doc=new EventTarget();doc.hidden=false;doc.visibilityState='visible';
  let n=0,callback=null,pauses=0,resumes=0;
  const view={revision:'fixture:0',world:{terrainRevision:'terrain:0'},quality:'normal',houses:Array(30).fill({}),facilities:['farm','lumber','smith','market','granary','park','plaza'].map(type=>({type}))};
  const states=Object.fromEntries(['buildings','world','landscape'].map(name=>[name,{
    contractRevision:'wv007-1',sourceFamily:name==='buildings'?'C4':'selected',viewRevision:view.revision,quality:'normal',
    ready:true,disposed:false,pendingLoads:0,failedLoads:0,sourcePins:[pin],outputPins:[pin],effectiveLods:{normal:37,low:0},effectiveHomeLods:{normal:30,low:0},visibleHomeLods:{normal:30,low:0},effectiveMaterialLods:{normal:1},renderedHomes:30,
    resources:{bufferBytesEstimate:100,textureBytesEstimate:100,loadedQualityImages:[{quality:'normal',loaded:1,expected:1,decodedBytesEstimate:100}]}}]));
  const renderer={isWebGLRenderer:true,capabilities:{isWebGL2:true},domElement:new EventTarget(),
    info:{render:{frame:0,calls:160,triangles:300000,lines:0,points:0},memory:{geometries:3,textures:1},programs:[{}]}};
  const host={renderer,rendererInfoScope:'whole-host-frame',layers:Object.fromEntries(Object.entries(states).map(([k,s])=>[k,{status:()=>s}])),
    getReadView:()=>view,getCamera:()=>({focusX:0,focusZ:0,yaw:0,pitch:.7,zoom:650}),pause:()=>pauses++,resume:()=>resumes++};
  const controller=createDiagnosticsController(host,{expectedSourcePins,environment:{document:doc,navigator:{userAgent:'Unit test'},
    requestAnimationFrame:fn=>{callback=fn;return ++n;},cancelAnimationFrame:()=>{callback=null;}}});
  const start=(options={})=>controller.start({fixture:{id:'unit-only',isolated:true,complete:true,expectedHomes:30},
    fixturePins:[pin],warmupMs:30000,durationMs:60000,...options});
  const frame=t=>{renderer.info.render.frame++;controller.sample(t);};
  const complete=()=>{for(let t=0;t<=90000;t+=1000)frame(t);return controller.record();};
  return {controller,host,renderer,states,view,doc,start,frame,complete,get callback(){return callback;},get pauses(){return pauses;},get resumes(){return resumes;}};
}

test('sampling math uses nearest-rank percentiles, excludes warmup and reports render work separately',async()=>{
  assert.deepEqual(percentiles([NaN,0,-1,10,20,30,40,100]).p95Ms,100);
  const h=setup(),promise=h.start();const r=h.complete();
  assert.equal(r.valid,true);assert.equal(r.stats.count,60);assert.equal(r.stats.medianMs,1000);
  assert.equal(r.stats.renderedFrameObservations,60);assert.equal(r.activeMs,90000);
  assert.equal(r.stats.longFramesOver50Ms,60);assert.ok(r.warnings.includes('provisional-triangle-guard'));
  assert.ok(r.warnings.includes('provisional-draw-call-guard'));assert.equal((await promise).schema,SCHEMA);
  assert.equal(h.callback,null);h.controller.dispose();
});

test('hidden/manual pauses drop cross-gap intervals, invalidate interrupted windows and clean up',()=>{
  const h=setup();h.start();h.frame(0);h.frame(30000);h.doc.hidden=true;h.doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(h.pauses,1);assert.equal(h.callback,null);h.frame(100000);
  assert.equal(h.controller.record().activeMs,30000);
  h.doc.hidden=false;h.doc.dispatchEvent(new Event('visibilitychange'));assert.equal(h.resumes,1);
  h.frame(200000);h.frame(200016);
  assert.deepEqual(h.controller.record().frames.map(f=>f.intervalMs),[16]);
  assert.ok(h.controller.record().issues.includes('interrupted-window'));
  h.controller.dispose();h.controller.dispose();assert.equal(h.callback,null);
  h.doc.dispatchEvent(new Event('visibilitychange'));assert.equal(h.resumes,1);
  assert.equal(h.states.buildings.disposed,false);assert.throws(()=>h.start(),/disposed/);
});

test('invalid timestamps, early stop and short windows cannot produce valid records',()=>{
  const h=setup();h.start({warmupMs:0,durationMs:100});h.frame(0);h.frame(NaN);h.frame(-5);h.frame(16);
  const r=h.controller.stop();assert.equal(r.valid,false);assert.equal(r.invalidSamples,2);
  assert.ok(r.issues.includes('non-device-duration'));assert.ok(r.issues.includes('measurement-window-too-short'));
  assert.equal(r.stats.count,1);h.controller.dispose();
});

test('readiness enforces missing peers, loads, actual population, quality, LOD, pins and resource completeness',()=>{
  const cases=[
    [h=>delete h.host.layers.world,'missing-layer:world'],
    [h=>h.states.landscape.pendingLoads=1,'layer-not-ready:landscape'],
    [h=>h.states.landscape.failedLoads=1,'layer-not-ready:landscape'],
    [h=>h.states.buildings.renderedHomes=29,'incomplete-rendered-homes'],
    [h=>h.states.buildings.quality='low','wrong-quality:buildings'],
    [h=>{h.states.buildings.effectiveLods={normal:7,low:30};h.states.buildings.effectiveHomeLods={low:30};h.states.buildings.visibleHomeLods={low:30};},'normal-reference-never-rendered'],
    [h=>h.states.buildings.effectiveHomeLods={normal:29},'incomplete-home-lod-distribution'],
    [h=>h.states.buildings.effectiveLods={low:0},'incomplete-rendered-homes'],
    [h=>h.states.world.sourcePins=[{...pin,sha256:'b'.repeat(64)}],'source-pin-mismatch:world'],
    [h=>h.states.world.outputPins=[],'missing-pins-or-contract:world'],
    [h=>h.states.world.resources.loadedQualityImages[0].loaded=0,'incomplete-resources:world'],
    [h=>h.states.landscape.resources.bufferBytesEstimate=undefined,'incomplete-resources:landscape'],
    [h=>h.view.houses.pop(),'incomplete-isolated-fixture'],
    [h=>h.view.facilities.pop(),'incomplete-facilities'],
    [h=>delete h.host.getCamera,'actual-camera-unavailable'],
    [h=>h.states.world.viewRevision='stale','stale-layer:world'],
    [h=>h.renderer.isWebGLRenderer=false,'renderer-unavailable'],
  ];
  for (const [mutate,reason] of cases) {
    const h=setup();mutate(h);h.start();const r=h.complete();assert.equal(r.valid,false,reason);assert.ok(r.issues.includes(reason),reason);h.controller.dispose();
  }
});

test('late loads, repeated updates and quality changes remain evidence even after ready again',()=>{
  const h=setup();h.start();h.frame(0);h.states.buildings.pendingLoads=1;h.frame(16000);
  h.states.buildings.pendingLoads=0;h.view.quality='low';h.frame(30000);h.view.quality='normal';
  for(let t=31000;t<=90000;t+=1000)h.frame(t);
  const r=h.controller.record();assert.equal(r.valid,false);assert.ok(r.issues.includes('layer-not-ready:buildings'));
  assert.ok(r.issues.includes('quality-changed'));assert.equal(r.statuses.length,3);h.controller.dispose();
});

test('context loss is recorded, disposal stops sampling and never disposes the host',()=>{
  const h=setup();h.start();h.frame(0);h.renderer.domElement.dispatchEvent(new Event('webglcontextlost'));
  assert.equal(h.controller.status().paused,true);assert.ok(h.controller.record().issues.includes('webgl-context-lost'));
  h.renderer.domElement.dispatchEvent(new Event('webglcontextrestored'));assert.equal(h.resumes,1);
  h.controller.dispose();const r=h.controller.record();h.frame(999999);assert.deepEqual(h.controller.record(),r);
  assert.equal(h.states.buildings.disposed,false);
});

test('privacy/schema: no arbitrary state, layer extras, renderer internals or private fields in exports',()=>{
  const h=setup();h.view.saveName='PRIVATE';h.states.buildings.privateSave={name:'PRIVATE'};h.renderer.privateName='PRIVATE';
  h.start();h.complete();const json=JSON.stringify(h.controller.record());assert.ok(!json.includes('PRIVATE'));
  assert.equal(JSON.parse(json).schema,SCHEMA);assert.equal(JSON.parse(json).capabilities.physicalDeviceVerified,false);h.controller.dispose();
  assert.equal(probeCapabilities(null,{}).backend,'unavailable');
});

test('idle does not invent rendered FPS; month outcomes and view revisions require explicit admission',()=>{
  const idle=setup();idle.renderer.info.render.frame=1;idle.start();
  for(let t=0;t<=90000;t+=1000)idle.controller.sample(t);
  assert.equal(idle.controller.record().valid,true);assert.equal(idle.controller.record().stats.renderedFrameObservations,0);idle.controller.dispose();
  const h=setup();h.start({scenario:'month',allowRevisionChange:true});h.frame(0);
  h.view.revision='fixture:1';Object.values(h.states).forEach(s=>s.viewRevision='fixture:1');
  const before={turn:0,people:240,gold:100,food:100,wood:20,tools:10,happiness:76};
  h.controller.setMonthOutcome({checked:true,events:false,before,after:{...before,turn:1}});
  for(let t=1000;t<=90000;t+=1000)h.frame(t);
  assert.equal(h.controller.record().valid,true);assert.equal(h.controller.record().monthOutcome.checked,true);h.controller.dispose();
  const unchecked=setup();unchecked.start({scenario:'month'});assert.ok(unchecked.complete().issues.includes('month-outcome-unchecked'));unchecked.controller.dispose();
});

for (const count of [30,100]) test(`actual ${count}-home fixture: immutable view, deterministic camera, real month and isolated save`,async()=>{
  const fixture=JSON.parse(await readFile(new URL(`../render-adoption/profiling/fixtures/${count}-homes.json`,import.meta.url)));
  const serialized=JSON.stringify(fixture),session=createFixtureSession(fixture),before=JSON.stringify(session.snapshot()),view=session.getReadView();
  assert.equal(validateFixture(fixture).complete,true);assert.equal(view.houses.length,count);assert.equal(view.facilities.length,7);
  assert.ok(view.committedFields.length>0);assert.ok(Object.isFrozen(view.houses[4].parcel.vertices));
  for(const [i,b] of fixture.state.buildings.entries()) {
    const placement=facilityPlacement(session.world,b,fixture.state,[{id:`facility-${b.type}`,boundsMin:[-1,0,-1],boundsMax:[1,2,1],entrance:{position:[0,0,1]}}]);
    assert.ok(placement);assert.equal(view.facilities[i].yaw,placement.yaw,'fixture doorway facing matches application placement');
  }
  assert.throws(()=>view.houses.push({}),TypeError);
  for (const path of ['idle','orbit','zoom','month']) for (const t of [0,15,30,45,60]) {
    assert.deepEqual(cameraAt(path,t,view),cameraAt(path,t,view));
  }
  assert.equal(JSON.stringify(session.snapshot()),before);
  assert.ok(session.cameraPlan.shoreAvailable);assert.ok(session.cameraPlan.maxSlope>0);
  const updated=[],driver=createScenarioDriver(session,'month',{updateView:v=>updated.push(v)});
  driver.step(29999);assert.equal(driver.outcome(),null);driver.step(30000);driver.step(60000);
  assert.equal(updated.length,1);assert.equal(driver.outcome().checked,true);
  assert.equal(session.getReadView().revision,`${fixture.id}:1`);assert.equal(JSON.stringify(fixture),serialized);
  assert.equal(session.snapshot().turn,fixture.state.turn+1);
  const incomplete=structuredClone(fixture);incomplete.state.houses.pop();assert.equal(validateFixture(incomplete).complete,false);
});

test('manifest pins actual fixtures, selected sources, controller outputs and exact camera/month outcomes',async()=>{
  const actual=await inspectFixtures(),stored=JSON.parse(await readFile(new URL('../render-adoption/profiling/manifest.json',import.meta.url)));
  assert.deepEqual(actual,stored);
  for (const f of actual.fixtures) {
    const bytes=await readFile(new URL(`../${f.path}`,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256);
  }
});

test('resource estimates deduplicate shared buffers/textures and include loader-retained unused images',()=>{
  const array=new Float32Array(30),image={width:4,height:4},normal={isTexture:true,image,generateMipmaps:true};
  const unusedLow={isTexture:true,image:{width:2,height:2},generateMipmaps:false};
  const geometry={attributes:{position:{array},normal:{array}},index:{array:new Uint16Array(array.buffer)}};
  const mesh={geometry,material:{map:normal}},root={traverse:fn=>[mesh,mesh].forEach(fn)};
  const r=estimateResources({roots:[root],loadedTextures:[normal,unusedLow],retainedBuffers:[array.buffer]});
  assert.equal(r.bufferBytesEstimate,120);assert.equal(r.textures,2);assert.equal(r.geometries,1);
  assert.equal(r.textureBytesEstimate,Math.ceil(64*4/3)+16);
  assert.equal(estimateResources({loadedTextures:[{}]}).textureBytesEstimate,null);
});
