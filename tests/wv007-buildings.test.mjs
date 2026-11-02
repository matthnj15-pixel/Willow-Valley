import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import validator from 'gltf-validator';
import * as T from '../assets/vendor/three.module.mjs';
import {HOME_IDS,visualIdentity} from '../asset-registry.mjs';
import {assetFor,admit,fits,rectangle,transformLocal} from '../render-adoption/buildings/placement.mjs';
import {createBuildingLayer,createPreviewAssetLibrary,entityKeyForIntersection} from '../render-adoption/buildings/index.mjs';
import {snapshotForBuildings,legacyExclusions} from '../render-adoption/buildings/fixtures.mjs';
import {startGame,startWorldGame,generatedWorld,advance} from '../simulation.mjs';
import {paintZones} from '../organic-world.mjs';
import {createTerrainSurface} from '../terrain-surface.mjs';
const manifest=JSON.parse(await readFile(new URL('../assets/wv/runtime-buildings-v1/manifest.json',import.meta.url)));
const world={width:1000,depth:800,seed:'P1',sample:()=>({height:10,water:null}),slope:()=>0};
const surface=createTerrainSurface(world,50,40);
const entry=id=>manifest.entries.find(e=>e.family==='C4'&&e.id===id&&e.quality==='normal');
const house=(identity=0)=>({key:'h',identity,savedPosition:{x:280,y:310},yaw:.61,parcel:{vertices:[{x:220,y:250},{x:340,y:250},{x:340,y:370},{x:220,y:370}],holes:[]},actualEntrance:{x:280,y:340}});
const view=h=>({schemaVersion:1,revision:'1',world:{seed:'P1'},houses:[h],facilities:[],roads:[],localLanes:[]});
const fakeLoader=({delay=false,fail=false}={})=>{const pending=[],calls=[];let releases=0;return{pending,calls,get releases(){return releases;},loadAsync(url){calls.push(url);if(fail)return Promise.reject(Error('fixture unavailable'));const build=()=>{const scene=new T.Group();for(const e of manifest.entries){if(!url.endsWith(e.bundle.split('/').at(-1)))continue;const root=new T.Group();root.name=e.node;root.position.set(1,.2,-.4);const nested=new T.Group();nested.rotation.y=.4;const geometry=new T.BoxGeometry(1,1,1);geometry.addEventListener('dispose',()=>releases++);const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial());mesh.position.set(2,.5,0);nested.add(mesh);root.add(nested);scene.add(root);}return{scene};};return delay?new Promise(resolve=>pending.push(()=>resolve(build()))):Promise.resolve(build());}};};

test('P1 selected IDs retain HOME_IDS/visualIdentity; work roles and civic defaults are explicit',()=>{
 assert.deepEqual(HOME_IDS,['home-long-ridge','home-steep-gable','home-low-hip','home-crooked-wing','home-offset-gables','home-porch-cabin']);
 for(let i=0;i<6;i++)assert.equal(assetFor(house(i),'seed'),HOME_IDS[i]);
 assert.equal(assetFor({type:'park'},0),'park-village-green');assert.equal(assetFor({type:'plaza'},0),'plaza-town-square');
 for(const id of ['farm','smith','granary','lumber','market'])assert.ok(entry(assetFor({type:id},0)));
 for(const e of manifest.entries.filter(e=>e.quality==='normal'&&['park','plaza'].includes(e.metadata.role)))assert.equal(assetFor({type:e.metadata.role,preferredVisualId:e.id},0),e.id);
 const e={id:7,x:242,y:505,foundedEra:1};assert.equal(visualIdentity(123,e),2477121892);
});
test('P1 full rotated parcel, holes, concave notch and entrance/neighbor clearance',()=>{
 const h=house(),e=entry('home-long-ridge');const p=admit(h,e,{world,terrainSurface:surface});assert.equal(p.scale,2.8);assert.equal(p.yaw,h.yaw);assert.equal(p.reason,undefined);
 assert.equal(p.exclusions[0].centeredMetres[0].x,(p.polygon[0].x-world.width/2)/2.8);
 assert.ok(admit({...h,parcel:null},e,{world,terrainSurface:surface}).reason);
 const concave={vertices:[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:6,y:10},{x:6,y:4},{x:4,y:4},{x:4,y:10},{x:0,y:10}]};
 assert.equal(fits([{x:2,y:2},{x:8,y:2},{x:8,y:8},{x:2,y:8}],concave),false);
 assert.equal(fits([{x:2,y:2},{x:8,y:2},{x:8,y:8},{x:2,y:8}],{vertices:rectangle([0,0],[10,10]).map(([x,y])=>({x,y})),holes:[[{x:4,y:4},{x:5,y:4},{x:5,y:5},{x:4,y:5}]]}),false);
 assert.equal(admit(h,e,{world,terrainSurface:surface,blockers:[{key:'neighbor',polygon:p.corridors.at(-1).worldGame}]}).reason,'neighbor-or-corridor-collision');
 assert.equal(admit({...h,parcel:{vertices:[{x:279,y:309},{x:281,y:309},{x:281,y:311},{x:279,y:311}]}},e,{world,terrainSurface:surface}).reason,'full-envelope-outside-parcel');
});
test('P1 samples shoreline corners, whole interior, unsafe grades and tall chimney bounds',()=>{
 const h=house(),e=entry('facility-smith'),p=admit(h,e,{world,terrainSurface:surface});assert.ok(p.exclusions.find(e=>e.kind==='roof'));
 const corner=p.polygon[0],wet={...world,sample:(x,y)=>({height:10,water:Math.hypot(x-corner.x,y-corner.y)<.2?12:null})};
 assert.equal(admit(h,e,{world:wet,terrainSurface:createTerrainSurface(wet,50,40)}).reason,'shoreline-or-invalid-contact');
 assert.equal(admit(h,e,{world:{...world,slope:()=>.5},terrainSurface:surface}).reason,'unsafe-grade');
 assert.equal(admit(h,e,{world,terrainSurface:{...surface,sample:(x,y)=>({height:x*.3,water:null})}}).reason,'unsafe-displayed-grade');
});
test('P1 granary level floor and independent feet on displayed slope retain 1.35m open undercroft',()=>{
 const w={...world,sample:(x,y)=>({height:10+x*.025,water:null})},s=createTerrainSurface(w,50,40),e=entry('facility-granary'),h=house(),p=admit(h,e,{world:w,terrainSurface:s});
 assert.equal(p.reason,undefined);assert.equal(p.levelFloorGameY,p.originY+1.35*2.8);assert.equal(p.supportContacts.length,8);assert.ok(new Set(p.supportContacts.map(c=>c.extensionGameUnits.toFixed(4))).size>1);assert.equal(e.metadata.undercroft.forbidSolidInfill,true);
});
test('P1 selective output hashes, explicit roots, geometric conservation, low image closure and validation',async()=>{
 const io=new NodeIO();
 for(const b of manifest.bundles){const bytes=await readFile(b.url);assert.equal(createHash('sha256').update(bytes).digest('hex'),b.sha256);const validation=await validator.validateBytes(bytes,{uri:b.url});assert.equal(validation.issues.numErrors,0);assert.equal(validation.issues.numWarnings,0);assert.equal(b.validation.errors,0);assert.equal(b.validation.warnings,0);const d=await io.readBinary(bytes);
  const entries=manifest.entries.filter(e=>e.bundle===b.url);assert.equal(d.getRoot().getDefaultScene().listChildren().length,entries.length);
  if(b.family==='C4'){assert.equal(entries.length,18);if(b.quality!=='normal'){assert.ok(d.getRoot().listMaterials().every(m=>!m.getNormalTexture()&&!m.getMetallicRoughnessTexture()));assert.ok(b.textures.every(t=>!/(normals|roughness|_Normal|_Rough)/i.test(t.name)));}
   for(const e of entries){let tris=0;d.getRoot().getDefaultScene().listChildren().find(n=>n.getName()===e.node).traverse(n=>n.getMesh()?.listPrimitives().forEach(p=>tris+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3));assert.equal(tris,e.triangles);if(b.quality==='normal')assert.equal(e.triangles,e.metadata.triangles);assert.equal(e.error.retainedVertexDisplacementMetres,0);}
  }
 }
});
test('P1 actual start/generated/save snapshots remain byte-equivalent with stable fallback identities',async()=>{
 const grown=startGame();paintZones(grown,'residential',[[{x:685,y:419},{x:705,y:425},{x:728,y:421}]],54);advance(grown);advance(grown);assert.ok(grown.houses.some(h=>h.parcel));
 const generated=startWorldGame({seed:'P1-ACTUAL',size:'small',flatness:85,hills:5,cliffs:0,lakes:0,rivers:0}),generatedSave=structuredClone(generated),dx=generatedSave.houses[0].x-242,dy=generatedSave.houses[0].y-505;
 paintZones(generatedSave,'residential',[[{x:685+dx,y:419+dy},{x:705+dx,y:425+dy},{x:728+dx,y:421+dy}]],54);advance(generatedSave);advance(generatedSave);assert.equal(generatedSave.houses.length,5);
 for(const state of [startGame(),generated,JSON.parse(JSON.stringify(grown)),JSON.parse(JSON.stringify(generatedSave))]){
  const before=JSON.stringify(state),w=generatedWorld(state)||world,s=createTerrainSurface(w,50,40),v=snapshotForBuildings(state,w),loader=fakeLoader(),scene=new T.Scene(),layer=await createBuildingLayer({scene,world:w,terrainSurface:s,manifest,loader});
  await layer.update(v,{legacyPlacements:legacyExclusions(state,w,v)});const keys=layer.getPlacements().records.map(p=>p.key);await layer.update(v,{cameraPositionGame:[900,40,900]});assert.deepEqual(layer.getPlacements().records.map(p=>p.key),keys);
  assert.equal(JSON.stringify(state),before);assert.equal(layer.getPlacements().records.length,state.houses.length+state.buildings.length);assert.ok(layer.status().fallback.length>=state.houses.filter(h=>!h.parcel).length);layer.dispose();layer.dispose();assert.equal(scene.children.length,0);
 }
});
test('P1 100-home requested normal stays normal regardless of settlement count',async()=>{
 const loader=fakeLoader(),scene=new T.Scene(),layer=await createBuildingLayer({scene,world,terrainSurface:surface,manifest,loader});
 const houses=Array.from({length:100},(_,i)=>{const x=100+i%10*45,y=100+Math.floor(i/10)*45;return{...house(0),key:'home-'+i,savedPosition:{x,y},yaw:0,actualEntrance:null,parcel:{vertices:rectangle([x-20,y-20],[x+20,y+20]).map(([x,y])=>({x,y}))}};});
 await layer.update({...view(houses[0]),houses});assert.deepEqual(layer.status().effectiveLods,{normal:100});assert.equal(loader.calls.length,1);assert.equal(layer.status().drawBatches,2);
 const skirt=scene.children[0].children.find(b=>b.userData.faceEntityKeys);assert.ok(skirt);const faceIndex=skirt.userData.faceEntityKeys.indexOf('home-90');assert.ok(faceIndex>=0);assert.equal(entityKeyForIntersection({object:skirt,faceIndex,instanceId:0}),'home-90');layer.dispose();
});
test('P1 async load coalescing, transforms/picking, requested normal, explicit distance, hidden and shared disposal',async()=>{
 const scene=new T.Scene(),loader=fakeLoader(),layer=await createBuildingLayer({scene,world,terrainSurface:surface,manifest,loader}),v=view(house());
 await Promise.all([layer.update(v),layer.update(v)]);assert.equal(loader.calls.length,1);assert.equal(layer.status().effectiveLods.normal,1);const batch=scene.children[0].children[0];assert.deepEqual(batch.userData.entityKeys,['h']);let matrix=new T.Matrix4();batch.getMatrixAt(0,matrix);
 const p=layer.getPlacements().records[0],expected=new T.Matrix4().compose(new T.Vector3(...p.transform.positionGame),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),p.yaw),new T.Vector3(2.8,2.8,2.8)).multiply(new T.Matrix4().makeTranslation(1,.2,-.4)).multiply(new T.Matrix4().makeRotationY(.4)).multiply(new T.Matrix4().makeTranslation(2,.5,0));
 matrix.elements.forEach((n,i)=>assert.ok(Math.abs(n-expected.elements[i])<1e-5));assert.equal(entityKeyForIntersection({object:batch,instanceId:0}),'h');
 await layer.update(v,{cameraPositionGame:[300,50,0]});assert.equal(layer.status().effectiveLods.distance,1);assert.equal(loader.releases,18);
 await layer.setQuality('low');await layer.update(v,{cameraPositionGame:[-220,30,-90]});assert.equal(layer.status().effectiveLods.low,1);assert.ok(layer.status().bundles.every(b=>b.quality==='low'));
 await layer.update(v,{visible:false});assert.equal(layer.status().drawBatches,0);assert.equal(layer.status().pendingLoads,0);await layer.update(v);assert.equal(layer.status().effectiveLods.low,1);layer.dispose();const releases=loader.releases;layer.dispose();assert.equal(loader.releases,releases);
});
test('P1 stale quality/disposal callbacks cannot attach resources; load failure reports host legacy fallback',async()=>{
 const scene=new T.Scene(),loader=fakeLoader({delay:true}),layer=await createBuildingLayer({scene,world,terrainSurface:surface,manifest,loader});const first=layer.update(view(house()));await Promise.resolve();await Promise.resolve();const second=layer.setQuality('low');await Promise.resolve();await Promise.resolve();loader.pending[0]();loader.pending[1]();await Promise.all([first,second]);assert.equal(layer.status().quality,'low');assert.equal(layer.status().effectiveLods.low,1);
 const p=layer.setQuality('normal');await Promise.resolve();await Promise.resolve();layer.dispose();loader.pending.at(-1)();await p;assert.equal(scene.children.length,0);assert.ok(loader.releases>=36);
 const failed=await createBuildingLayer({scene:new T.Scene(),world,terrainSurface:surface,manifest,loader:fakeLoader({fail:true})});await failed.update(view(house()));assert.equal(failed.status().fallback[0].reason,'load-error');assert.equal(failed.status().pendingLoads,0);failed.dispose();
});
test('P1 preview is explicitly D and keyed by family/id/quality without economy',async()=>{
 const lib=await createPreviewAssetLibrary({manifest,loader:fakeLoader()});assert.equal(lib.list().length,40);const a=await lib.load({id:'storehouse-l1'}),b=await lib.load({id:'storehouse-l1',quality:'low'});assert.notEqual(a.scene.userData.previewKey,b.scene.userData.previewKey);assert.equal(a.metadata.capacity,undefined);await assert.rejects(()=>lib.load({family:'C4',id:'lumber'}));lib.dispose();lib.dispose();
});
