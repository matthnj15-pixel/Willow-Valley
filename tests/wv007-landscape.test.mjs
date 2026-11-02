import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateBytes} from 'gltf-validator';
import {NodeIO} from '@gltf-transform/core';
import * as T from '../assets/vendor/three.module.mjs';
import metadata from '../assets/wv/runtime-landscape-v1/metadata.mjs';
import {planLandscape,createLandscapeLayer,savedToMetres,metresToSaved,metresToScene,originalBTree,metreExclusionToOriginalB,displayedMetreSampler} from '../render-adoption/landscape/index.mjs';
import {fixtureView,fixturePlacements,edgeCaseView,freeze} from '../render-adoption/landscape/fixtures/read-view.mjs';
import {generatedWorld,validState,configureWorldState} from '../simulation.mjs';
import {createTerrainSurface} from '../terrain-surface.mjs';
import {parallelOverlap,fitsCircle,pointInShape} from '../assets/wv/landscape-next/plot-geometry.mjs';
const kit=JSON.parse(await readFile(new URL('../assets/wv/buildings-next/kit-detail-manifest.json',import.meta.url))),entry=kit.entries.find(e=>e.id==='home-steep-gable');
const saves=JSON.parse(await readFile(new URL('../render-adoption/landscape/fixtures/saves.json',import.meta.url)));
const flat={sample:(x,y)=>({height:2+x*.0002+y*.0001,water:null,slope:.001,moisture:.8}),drapePolygon:p=>[p]};
const options=(view,terrainSurface=flat)=>({world:view.world,terrainSurface,entries:metadata.entries});
const context=view=>({placementView:fixturePlacements(view,entry)});
const hash=b=>createHash('sha256').update(b).digest('hex');
function source(lod){const group=new T.Group();for(const e of metadata.entries){const mesh=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial());mesh.name=e.id+'__'+lod;group.add(mesh);}return group;}

test('WV007 P3 coordinate bridges round trip at offsets; original B stays in game units',()=>{
 const world={width:2400,depth:1800},p={x:1703,y:1234},m=savedToMetres(p,world);assert.deepEqual(metresToSaved(m,world),p);metresToScene(m,5).forEach((n,i)=>assert.ok(Math.abs(n-[503,14,334][i])<1e-10));
 assert.deepEqual(originalBTree({key:'t',savedPosition:p,heightGame:30}),{key:'t',x:1703,z:1234,h:30});
 const e=metreExclusionToOriginalB({points:[m],radius:2},world);assert.deepEqual(e,{points:[{x:1703,z:1234}],radius:5.6});
 const sample=displayedMetreSampler({sample:(x,y)=>({height:(x+y)*.1,water:null})},world);assert.equal(sample(m.x,m.z).height,(1703+1234)*.1/2.8);
});

test('WV007 P3 saved-state snapshots include actual growth parcel and generated woodland, untouched after planning',()=>{
 for(const [name,state] of Object.entries(saves).filter(([k])=>k!=='provenance')){
   configureWorldState(state);assert.equal(validState(state),true);const before=JSON.stringify(state),world=generatedWorld(state),surface=world?createTerrainSurface(world,62,46):flat;
   const dimensions=world??{width:1200,depth:900},view=fixtureView(state,dimensions,{trees:world?.trees.slice(0,80)??[]}),input=JSON.stringify(view);
   const plan=planLandscape(view,context(view),{world:dimensions,terrainSurface:surface,entries:metadata.entries});
   assert.equal(JSON.stringify(view),input);assert.equal(JSON.stringify(state),before);assert.equal(plan.diagnostics.deferred.filter(d=>d.reason.startsWith('legacy-no-parcel')).length,4);
   if(name!=='generated'){assert.equal(view.houses.filter(h=>h.parcel).length,name==='legacy'?1:3);assert.ok(plan.diagnostics.plotStats.length>0);}
   else {assert.equal(plan.vegetation.length+plan.treeFallbacks.length,80);assert.ok(plan.vegetation.every(t=>t.protected));}
 }
});

test('WV007 P3 adjacent irregular/rotated/concave/tiny parcels, holes and retained C4 spans use B fit and ownership',()=>{
 const view=edgeCaseView(),ctx=context(view),before=JSON.stringify([view,ctx]);
 const integral={key:'C4-integral-fence',a:{x:-25,z:-15},b:{x:-10,z:-15},kind:'fence-rail',ownerKey:'early'};
 const placements={...ctx.placementView,placements:ctx.placementView.placements.map(p=>p.key==='early'?{...p,integralBoundariesMetres:[integral],corridorsMetres:[{kind:'approach',points:[{x:-30,z:0},{x:0,z:0}],radius:.6}]}:p)};
 const plan=planLandscape(view,{placementView:placements},options(view));
 assert.equal(JSON.stringify([view,ctx]),before);assert.ok(Object.isFrozen(plan.props));
 assert.ok(plan.boundaries.fences.find(f=>f.key==='earlier-span').users.includes('neighbor'));
 assert.ok(plan.boundaries.fences.some(f=>f.key===integral.key));assert.ok(!plan.renderBoundaries.some(f=>f.key===integral.key));
 assert.ok(plan.diagnostics.conflicts.some(c=>c.key==='earlier-span'));
 assert.equal(plan.diagnostics.plotStats.find(p=>p.key==='wedge').props,0);
 for(const p of plan.props){const h=view.houses.find(h=>h.key===p.plotKey);if(h){const shape={polygon:h.parcel.vertices.map(v=>savedToMetres(v,view.world)),holes:h.parcel.holes.map(r=>r.map(v=>savedToMetres(v,view.world)))};assert.ok(pointInShape({x:p.origin[0],z:p.origin[2]},shape));if(p.kind==='fruit-tree')assert.ok(fitsCircle({x:p.origin[0],z:p.origin[2]},1.65*p.scale,shape));}}
 assert.ok(!plan.props.some(p=>['cart','well','bench','barrel','wood-stack'].includes(p.kind)));assert.ok(!plan.vegetation.some(p=>p.assetId==='grass-tuft'));assert.equal(plan.diagnostics.grassDeferred,1);assert.ok(plan.occupancyExclusions.some(e=>e.kind==='household-parcel'));assert.ok(plan.occupancyExclusions.some(e=>e.kind==='field'));
 const keys=plan.boundaries.fences.map(f=>f.key);assert.equal(new Set(keys).size,keys.length);
 const old=plan.boundaries.fences.find(f=>f.key==='earlier-span');assert.deepEqual(old.a,savedToMetres(view.retainedBoundaries[0].a,view.world));assert.deepEqual(old.b,savedToMetres(view.retainedBoundaries[0].b,view.world));
 const reordered=planLandscape({...view,houses:[...view.houses].reverse()}, {placementView:placements},options(view));assert.deepEqual(reordered.boundaries,plan.boundaries);assert.deepEqual(reordered.props,plan.props);
});

test('WV007 P3 missing envelopes/access defer parcels and never fabricate legacy gardens',()=>{
 const view=edgeCaseView(),plan=planLandscape(view,{},options(view));assert.equal(plan.diagnostics.plotStats.filter(p=>p.kind==='home').length,0);assert.equal(plan.diagnostics.deferred.length,view.houses.length);
 assert.throws(()=>planLandscape({...view,committedFields:{cellSize:Infinity,cells:[]}},context(view),options(view)),/finite/);
 assert.throws(()=>planLandscape({...view,committedFields:{cellSize:1,bounds:{minX:0,maxX:Infinity,minZ:0,maxZ:10},sampleUse:()=>null}},context(view),options(view)),/Finite/);
 assert.throws(()=>planLandscape({...view,committedFields:{cellSize:1,bounds:{minX:0,maxX:500,minZ:0,maxZ:500},sampleUse:()=>null}},context(view),options(view)),/budget/);
});

test('WV007 P3 committed field holes/islands, erasure and empty reload replace all derived outlines',()=>{
 const v=edgeCaseView(),cells=Array.from({length:225},(_,i)=>({ix:70+i%15,iz:30+Math.floor(i/15)})).filter(c=>!(c.ix>=75&&c.ix<=78&&c.iz>=35&&c.iz<=38));cells.push({ix:100,iz:30});
 const a=planLandscape({...v,committedFields:{cellSize:1,cells}},context(v),options(v));assert.equal(a.fields.length,2);assert.equal(a.fields.flatMap(f=>f.holes).length,1);
 const empty=planLandscape({...v,revision:'erase',committedFields:{cellSize:1,cells:[]}},context(v),options(v));assert.equal(empty.fields.length,0);assert.ok(!empty.boundaries.fences.some(f=>f.ownerKey.startsWith('painted-field:')));
 const reload=planLandscape(JSON.parse(JSON.stringify({...v,committedFields:{cellSize:1,cells}})),context(v),options(v));assert.deepEqual(reload.fields,a.fields);assert.deepEqual(reload.boundaries,a.boundaries);
 const wet={...flat,sample:(x,y)=>({...flat.sample(x,y),water:x>820?1:null})};const clipped=planLandscape({...v,committedFields:{cellSize:1,cells}},context(v),options(v,wet));assert.ok(clipped.diagnostics.field.cells<a.diagnostics.field.cells);
});

test('WV007 P3 layer coalesces revisions, keeps tree/boundary geometry across LOD and camera; hidden updates never invalidate',async()=>{
 const v=edgeCaseView(),ctx=context(v),scene=new T.Scene();let loads=0,draws=0;
 const layer=createLandscapeLayer({scene,world:v.world,terrainSurface:flat,invalidate:()=>draws++,loadSource:async lod=>{loads++;return source(lod);}});
 const a=layer.update(v,ctx),b=layer.update(v,ctx);assert.equal(a,b);assert.equal(await a,true);assert.equal(loads,1);const plan=layer.getLandscapeView(),before=JSON.stringify(v);
 assert.ok(layer.status().ready);assert.ok(layer.status().resources.drawCalls>0);assert.equal(plan.diagnostics.grassDeferred,1);
 await layer.update(v,{...ctx,camera:{yaw:3}});assert.equal(layer.status().planBuilds,1);await layer.setQuality('low');assert.equal(layer.getLandscapeView(),plan);await layer.update(v,{...ctx,distance:'far'});assert.equal(layer.getLandscapeView(),plan);assert.ok(layer.status().effectiveLods.far);
 const lastDraws=draws;await layer.update({...v,revision:'hidden'},{...ctx,visible:false});assert.equal(draws,lastDraws);assert.equal(scene.children[0].visible,false);assert.equal(JSON.stringify(v),before);
 layer.dispose();layer.dispose();assert.equal(scene.children.length,0);assert.equal(layer.status().disposed,true);assert.equal(await layer.update(v,ctx),false);
});

test('WV007 P3 stale completion, late disposal, failure/retry release sources exactly once',async()=>{
 const v=edgeCaseView(),ctx=context(v),scene=new T.Scene(),resolvers=[];let freed=0;
 const loader=lod=>new Promise(resolve=>resolvers.push(()=>{const s=source(lod);s.traverse(n=>n.geometry?.addEventListener('dispose',()=>freed++));resolve(s);}));
 const l=createLandscapeLayer({scene,world:v.world,terrainSurface:flat,loadSource:loader});const a=l.update(v,ctx);await Promise.resolve();const b=l.setQuality('low');await Promise.resolve();resolvers[1]();assert.equal(await b,true);resolvers[0]();assert.equal(await a,false);assert.equal(freed,20);l.dispose();assert.equal(freed,40);
 const late=createLandscapeLayer({scene,world:v.world,terrainSurface:flat,loadSource:loader});const pending=late.update(v,ctx);await Promise.resolve();late.dispose();resolvers[2]();assert.equal(await pending,false);assert.equal(freed,60);assert.equal(scene.children.length,0);
 let fail=true;const retry=createLandscapeLayer({scene,world:v.world,terrainSurface:flat,loadSource:async lod=>{if(fail)throw Error('fixture load failure');return source(lod);}});assert.equal(await retry.update(v,ctx),false);assert.match(retry.status().error,/load failure/);assert.equal(retry.status().pendingLoads,0);fail=false;assert.equal(await retry.update(v,ctx),true);retry.dispose();
});

test('WV007 P3 selective GLBs validate and exact runtime closure excludes study and other-quality assets',async()=>{
 for(const [lod,out] of Object.entries(metadata.outputs)){
  const bytes=await readFile(out.path),v=await validateBytes(bytes);assert.equal(v.issues.numErrors,0);assert.equal(v.issues.numWarnings,0);assert.equal(hash(bytes),out.sha256);
  const doc=await new NodeIO().readBinary(bytes);assert.ok(doc.getRoot().listNodes().every(n=>n.getName().endsWith('__'+lod)));assert.equal(doc.getRoot().listTextures().length,0);assert.equal(doc.getRoot().listMeshes().length,20);
 }
 for(const p of metadata.sourcePins)assert.equal(hash(await readFile(p.path)),p.sha256,p.path);
 const closure=JSON.parse(await readFile('assets/wv/runtime-landscape-v1/closure.json','utf8'));
 for(const p of [...closure.code,...closure.metadata])assert.equal(hash(await readFile(p.path)),p.sha256,p.path);
 assert.ok(!closure.code.some(p=>p.path.includes('hamlet-scene')||p.path.includes('plot-study')));assert.equal(closure.profiles.low.assets.length,1);assert.equal(closure.offlineAdmitted,false);
});

test('WV007 P3 retains and reports conflicting earlier spans rather than silently deleting one',()=>{
 const v=edgeCaseView(),extra={key:'conflicting-retained',ownerKey:'other',kind:'fence-rail',a:v.retainedBoundaries[0].a,b:v.retainedBoundaries[0].b};
 const plan=planLandscape({...v,retainedBoundaries:[...v.retainedBoundaries,extra]},context(v),options(v));
 assert.ok(plan.boundaries.fences.some(f=>f.key===extra.key));assert.ok(plan.boundaries.fences.some(f=>f.key==='earlier-span'));assert.ok(plan.diagnostics.conflicts.some(c=>c.reason==='retained-spans-overlap'));
});

test('WV007 P3 surfaces and crop display share field holes and displayed triangle contacts',async()=>{
 const {createLandscapeSurfaces}=await import('../render-adoption/landscape/surfaces.mjs');
 const world={width:1200,depth:900,options:{size:'small'},sample:(x,z)=>({height:Math.sin(x/10)*2+Math.cos(z/15)*3,water:null,slope:.01})};
 const surface=createTerrainSurface(world,62,46),v=edgeCaseView(),plan=planLandscape(v,context(v),{world,terrainSurface:surface,entries:metadata.entries});
 const visual=createLandscapeSurfaces(plan,{world,terrainSurface:surface}),mesh=visual.group.children[0],p=mesh.geometry.attributes.position;
 assert.ok(p.count>0);for(let i=0;i<p.count;i++)assert.ok(Math.abs(p.getY(i)-surface.sample(p.getX(i)+600,p.getZ(i)+450).height-.018)<1e-4);
 const field=plan.fields[0];assert.ok(field.holes.length>0);const hole=field.holes[0],center={x:hole.reduce((n,p)=>n+p.x,0)/hole.length,z:hole.reduce((n,p)=>n+p.z,0)/hole.length};
 const ray=new T.Raycaster(new T.Vector3(center.x*2.8,200,center.z*2.8),new T.Vector3(0,-1,0));mesh.updateMatrixWorld(true);assert.equal(ray.intersectObject(mesh).length,0);
 const crops=plan.props.filter(p=>p.plotKey===field.key);for(const p of crops)assert.ok(pointInShape({x:p.origin[0],z:p.origin[2]},field));
 visual.dispose();visual.dispose();
});
