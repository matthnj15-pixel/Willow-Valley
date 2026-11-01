import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHamletPlan,createHamletUseIndex,displayedHamletHeight,pointInPolygon,polygonsOverlap,laneCorridors} from '../assets/wv/landscape-next/hamlet-plan.mjs';
import {resolveHamlet} from '../assets/wv/landscape-next/hamlet-scene.mjs';
import {createHamletProps} from '../assets/wv/landscape-next/hamlet-props.mjs';
const entries=JSON.parse(await readFile('assets/wv/buildings-next/manifest.json')).entries;
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
test('inhabited plan: stable 4/12/30 holdings and inherited lanes without state or ordering mutation',()=>{
 const options=freeze({stage:4,seed:'same',unrelated:{turn:100}}),before=JSON.stringify(options),four=createHamletPlan(options),twelve=createHamletPlan({...options,stage:12}),thirty=createHamletPlan({...options,stage:30});
 assert.equal(JSON.stringify(options),before);assert.deepEqual(createHamletPlan(options),four);
 for(const plan of [four,twelve,thirty]){assert.equal(plan.holdings.length,plan.stage);assert.equal(new Set(plan.holdings.map(h=>h.key)).size,plan.stage);assert.equal(plan.runtimeReady,false);assert.ok(plan.regions.some(r=>r.kind==='field'));assert.ok(plan.regions.some(r=>r.key==='common'));}
 for(const h of four.holdings){assert.deepEqual(twelve.holdings.find(r=>r.key===h.key),h);assert.deepEqual(thirty.holdings.find(r=>r.key===h.key),h);}
 for(const lane of four.lanes)assert.deepEqual(thirty.lanes.find(r=>r.key===lane.key),lane);
 assert.ok(new Set(twelve.holdings.map(h=>h.use)).size===3);assert.ok(thirty.lanes.length>four.lanes.length);assert.throws(()=>createHamletPlan({stage:100}),/4, 12 or 30/);
});
test('inhabited holdings fit measured C envelopes and connect real thresholds without roof/lane collisions',()=>{
 for(const stage of [4,12,30]){const input=freeze(createHamletPlan({stage})),catalog=freeze(entries),before=JSON.stringify([input,catalog]),plan=resolveHamlet(input,catalog);assert.equal(JSON.stringify([input,catalog]),before);
  for(let i=0;i<plan.entities.length;i++){const e=plan.entities[i];assert.equal(e.scale,2.8);assert.ok(e.footprint.every(p=>p.x>-90&&p.x<90&&p.z>-82&&p.z<82));
   for(const b of plan.entities.slice(i+1))assert.equal(polygonsOverlap(e.footprint,b.footprint,.01),false,e.key+' and '+b.key+' roofs');
   for(const l of plan.lanes)assert.ok(!laneCorridors(l).some(poly=>polygonsOverlap(e.footprint,poly,.01)),e.key+' and '+l.key);
   if(e.key.startsWith('holding-')){const door=plan.paths.find(p=>p.key===e.key+':door');assert.deepEqual(door.points[0],e.threshold);assert.deepEqual(door.points.at(-1),e.gate);assert.ok(e.footprint.every(p=>pointInPolygon(p,e.polygon)),e.key+' roof fits holding');}
  }
 }
});
test('inhabited semantic ground uses the same paths, working yards and garden bounds as cover',()=>{
 const plan=resolveHamlet(freeze(createHamletPlan()),freeze(entries)),before=JSON.stringify(plan),index=createHamletUseIndex(plan);
 assert.equal(index.query(-6,5).kind,'common');assert.equal(index.query(-46,-25).kind,'seat');assert.equal(index.query(-9,0).kind,'lane');
 for(const h of plan.holdings){const shape=plan.regions.find(r=>r.holdingKey===h.key);assert.ok(shape);assert.ok(pointInPolygon(h.garden.center,shape.polygon));}
 assert.ok(index.cells<500);assert.equal(JSON.stringify(plan),before);
 for(const [x,z] of [[0,0],[-60,-30],[73,68],[-88,76]])assert.ok(Number.isFinite(displayedHamletHeight(x,z)));
});
test('original hamlet props are shared opaque metre-scale geometry with idempotent ownership',()=>{
 const lib=createHamletProps(),r=[{kind:'person',key:'adult',origin:[0,0,0]},{kind:'fence-rail',key:'rail',origin:[4,0,0]},{kind:'garden-greens',key:'greens',origin:[8,0,0]}],a=lib.build(r),b=lib.build(r);
 assert.equal(a.group.children[0].geometry,b.group.children[0].geometry);for(const m of a.group.children){assert.equal(m.material.transparent,false);assert.equal(m.material.map,null);}
 const person=lib.measurements().find(m=>m.kind==='person');assert.ok(Math.abs(person.boundsMax[1]-1.75)<1e-6);assert.ok(Math.abs(person.boundsMin[1])<1e-6);
 let disposed=0;a.group.children[0].geometry.addEventListener('dispose',()=>disposed++);a.dispose();a.dispose();assert.equal(disposed,0);b.dispose();lib.dispose();lib.dispose();assert.equal(disposed,1);assert.throws(()=>lib.build(r),/disposed/);
});
