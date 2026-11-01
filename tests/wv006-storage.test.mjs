import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,cp,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {NodeIO} from '@gltf-transform/core';
import {getBounds} from '@gltf-transform/functions';
import {validateBytes} from 'gltf-validator';
import * as T from 'three';
import {exampleView,editExample,GOODS_STATES,goodsPlacements} from '../storage-next/view-data.mjs';
import {makeAsset} from '../storage-next/recipe.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(await readFile('assets/wv/storage-next/manifest.json','utf8'));
test('explicit glTF validation, measured output, source hashes and normal/low budgets',async()=>{
 const bytes=await readFile(manifest.output.url),v=await validateBytes(new Uint8Array(bytes));assert.equal(v.issues.numErrors,0,JSON.stringify(v.issues));assert.equal(v.issues.numWarnings,0,JSON.stringify(v.issues));
 assert.equal(hash(bytes),manifest.output.sha256);assert.equal(bytes.length,manifest.output.bytes);assert.ok(bytes.length<1024*1024);assert.equal(manifest.runtimeReady,false);assert.equal(manifest.gameUnitsPerMetre,2.8);assert.deepEqual(manifest.externalAssetDependencies,[]);
 for(const s of manifest.sources)assert.equal(hash(await readFile(s.path)),s.sha256,s.path);
 const doc=await new NodeIO().readBinary(bytes);assert.equal(doc.getRoot().listTextures().length,0);assert.equal(doc.getRoot().listMaterials().length,8);assert.equal(manifest.entries.length,40);
 for(const e of manifest.entries){const node=doc.getRoot().getDefaultScene().listChildren().find(n=>n.getName()===e.node),b=getBounds(node);let tris=0,groups=0;node.traverse(n=>{for(const p of n.getMesh()?.listPrimitives()||[]){tris+=p.getAttribute('POSITION').getCount()/3;groups++;}});
  for(let i=0;i<3;i++){assert.ok(Math.abs(b.min[i]-e.boundsMin[i])<1e-5);assert.ok(Math.abs(b.max[i]-e.boundsMax[i])<1e-5);}assert.equal(tris,e.triangles);assert.equal(groups,e.materialGroups);assert.equal(e.status,'gallery-review');assert.equal(e.textureBytes,0);assert.equal(e.runtimeReady,false);
 }
 for(const id of ['storehouse-l1','warehouse-l2']){const n=manifest.entries.find(e=>e.id===id&&e.quality==='normal'),l=manifest.entries.find(e=>e.id===id&&e.quality==='low');assert.ok(n.triangles<4000);assert.ok(n.materialGroups<=6);assert.ok(l.triangles<n.triangles*.5);assert.ok(n.entrances.some(e=>e.kind==='personnel'));assert.ok(n.steps.length===2);assert.ok(n.supportPoints.length>=8);}
 const person=manifest.entries.find(e=>e.node==='person-normal');assert.ok(Math.abs(person.boundsMax[1]-1.75)<1e-6);
});
test('warehouse cargo openings are actually free at human height with props removed',()=>{
 for(const id of ['storehouse-l1','warehouse-l2'])for(const quality of ['normal','low']){
  const {parts,metadata}=makeAsset(id,quality),group=new T.Group();for(const {g} of parts)group.add(new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide})));group.updateMatrixWorld(true);
  for(const door of metadata.entrances.filter(e=>e.kind==='cargo'))for(const offset of [-.45,0,.45]){
   const ray=new T.Raycaster(new T.Vector3(door.threshold[0]+offset*door.clearWidth,door.threshold[1]+1.3,door.threshold[2]+.5),new T.Vector3(0,0,-1));const hit=ray.intersectObject(group,true)[0];assert.ok(hit&&hit.distance>1.8,`${id} cargo opening blocked at ${offset}: ${hit?.distance}`);
  }
  for(const p of metadata.supportPoints)assert.ok(metadata.localSeats.some(s=>p.position[0]>=s.polygon[0][0]-.01&&p.position[0]<=s.polygon[1][0]+.01&&p.position[2]>=s.polygon[0][1]-.01&&p.position[2]<=s.polygon[2][1]+.01&&Math.abs(p.position[1]-s.topY)<.01));
  group.traverse(n=>{if(n.isMesh){n.geometry.dispose();n.material.dispose();}});
 }
});
test('policy study is pure, validates threshold gaps, and never accepts authoritative fields',()=>{
 const original=exampleView(),frozen=structuredClone(original);assert.ok(original.goods.every(g=>g.policy==='Keep'));
 for(const policy of ['Keep','Import','Export','Balance']){const r=editExample(original,'wood',{policy});assert.equal(r.ok,true);assert.equal(r.view.illustrative,true);assert.notEqual(r.view,original);}
 assert.equal(editExample(original,'wood',{policy:'Balance',min:30,max:30}).ok,false);assert.equal(editExample(original,'wood',{target:Infinity}).ok,false);assert.equal(editExample(original,'wood',{target:101}).ok,false);assert.equal(editExample(original,'wood',{current:0}).ok,false);assert.equal(editExample(original,'wood',{accepted:false}).view.goods[0].current,36);assert.deepEqual(original,frozen);assert.equal(GOODS_STATES.empty.length,0);assert.ok(GOODS_STATES.full.length>GOODS_STATES.partial.length);
});
test('checkout-only clean rebuild reproduces glb, metadata and bundled UI byte for byte',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'wv006-d-'));
 try{for(const path of ['storage-next','scripts/build-wv006-storage.mjs','assets/wv/storage-next/LICENSE.txt'])await cp(path,join(dir,path),{recursive:true});await symlink(resolve('node_modules'),join(dir,'node_modules'),'dir');execFileSync(process.execPath,['scripts/build-wv006-storage.mjs'],{cwd:dir,stdio:'pipe'});
  for(const path of ['assets/wv/storage-next/storage.glb','assets/wv/storage-next/manifest.json','ui-kit/wv006-storage.mjs'])assert.equal(hash(await readFile(path)),hash(await readFile(join(dir,path))),path);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('full illustrative goods fit each review yard without blocking access or intersecting one another',()=>{
 for(const level of [1,2]){const building=manifest.entries.find(e=>e.id===(level===2?'warehouse-l2':'storehouse-l1')&&e.quality==='normal'),yard=building.yardEnvelope,boxes=[];
  for(const p of goodsPlacements(level,'full')){const e=manifest.entries.find(e=>e.id===p.id&&e.quality==='normal');const b=new T.Box3(new T.Vector3(...e.boundsMin),new T.Vector3(...e.boundsMax));b.applyMatrix4(new T.Matrix4().makeRotationY(p.yaw));b.translate(new T.Vector3(...p.position));assert.ok(b.min.x>=yard[0][0]-1e-5&&b.max.x<=yard[1][0]+1e-5&&b.min.z>=yard[0][1]-1e-5&&b.max.z<=yard[2][1]+1e-5,p.id+' outside yard');
   for(const door of building.entrances){const c=door.clearance;assert.ok(b.max.x<=c[0][0]||b.min.x>=c[1][0]||b.max.z<=c[0][1]||b.min.z>=c[2][1],p.id+' blocks '+door.kind);}
   for(const other of boxes)assert.ok(b.max.x<=other.min.x+1e-5||b.min.x>=other.max.x-1e-5||b.max.z<=other.min.z+1e-5||b.min.z>=other.max.z-1e-5,p.id+' intersects cargo');boxes.push(b);
  }
 }
});
