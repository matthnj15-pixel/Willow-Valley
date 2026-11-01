import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {getBounds} from '@gltf-transform/functions';
import {validateBytes} from 'gltf-validator';
import {Box3,Vector3} from 'three';
import {architecture} from '../buildings-next/architecture.mjs';
import {HOME_IDS} from '../asset-registry.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),path='assets/wv/buildings-next/';
const m=JSON.parse(await readFile(path+'manifest.json','utf8'));
test('C catalog explicitly validates glTF, hashes, measured geometry, mappings and material budgets',async()=>{
 const bytes=await readFile(path+'catalog.glb'),d=await new NodeIO().readBinary(bytes),validation=await validateBytes(new Uint8Array(bytes));assert.equal(validation.issues.numErrors,0);assert.equal(validation.issues.numWarnings,0);
 assert.equal(sha(bytes),m.output.sha256);assert.equal(bytes.length,m.output.bytes);assert.equal(m.gameUnitsPerMetre,2.8);assert.equal(m.runtimeReady,false);assert.deepEqual(m.externalDependencies,[]);
 assert.deepEqual(HOME_IDS,['home-long-ridge','home-steep-gable','home-low-hip','home-crooked-wing','home-offset-gables','home-porch-cabin']);assert.equal(m.entries.length,10);assert.equal(m.fallbacks[0].id,'home-crooked-wing');assert.deepEqual(m.entries.filter(e=>e.role!=='residential').map(e=>e.role).sort(),['farm','granary','lumber','market','smith']);
 for(const e of m.entries){assert.equal(e.status,'gallery-review');assert.equal(e.runtimeReady,false);assert.equal(e.existingIdentity,e.id);for(const low of [false,true]){
  const r=d.getRoot().getDefaultScene().listChildren().find(n=>n.getName()===(low?e.lowNode:e.normalNode)),b=getBounds(r),measurement=low?e.low:e;let tri=0;const mats=new Set();r.traverse(n=>{for(const p of n.getMesh()?.listPrimitives()||[]){tri+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;mats.add(p.getMaterial());}});assert.equal(tri,measurement.triangles);assert.equal(mats.size,measurement.materialGroups);for(let i=0;i<3;i++){assert.ok(Math.abs(b.min[i]-measurement.boundsMin[i])<1e-5);assert.ok(Math.abs(b.max[i]-measurement.boundsMax[i])<1e-5);}
 }assert.ok(e.low.triangles<e.triangles,'actual lower-detail geometry required');if(e.role!=='residential'){assert.ok(e.triangles<=6000);assert.equal(e.materialGroups,1);assert.ok(e.existingEnvelopeCheck.axisAlignedFit);assert.ok(e.low.triangles<e.triangles);}}
 assert.equal(sha(await readFile(path+'License_Source.txt')),m.provenance.sourceLicenseSha256);for(const input of m.inputs)assert.equal(sha(await readFile(input.url)),input.sha256);
 const images=d.getRoot().listTextures();assert.equal(new Set(images.map(t=>sha(t.getImage()))).size,images.length);assert.ok(m.textures.reduce((a,t)=>a+t.estimatedMipRGBA8Bytes,0)<6*1024*1024);
});
test('unchanged home geometry remains identical to the accepted catalog, including material image bytes',async()=>{
 const io=new NodeIO(),d=await io.read(path+'catalog.glb'),old=await io.read('assets/wv/megakit-catalog-v1/catalog.glb');
 const signature=r=>{const records=[];r.traverse(n=>{for(const p of n.getMesh()?.listPrimitives()||[]){records.push({attributes:p.listSemantics().sort().map(k=>[k,Array.from(p.getAttribute(k).getArray())]),indices:Array.from(p.getIndices().getArray()),image:p.getMaterial().getBaseColorTexture()?.getImage()?sha(p.getMaterial().getBaseColorTexture().getImage()):null});}});return sha(JSON.stringify(records));};
 for(const e of m.entries.filter(e=>e.role==='residential'&&e.id!=='home-low-hip'))assert.equal(signature(d.getRoot().getDefaultScene().listChildren().find(n=>n.getName()===e.id)),signature(old.getRoot().getDefaultScene().listChildren().find(n=>n.getName()===e.id)));
});
test('granary supports, full floor-height study and chimney roof opening remain buildable at fixed scale',()=>{
 const e=m.entries.find(e=>e.id==='facility-granary');assert.equal(e.floorElevation,1.35);assert.equal(e.undercroft.forbidSolidInfill,true);assert.equal(e.supportPoints.length,8);assert.ok(e.envelopes.stairs);assert.ok(e.envelopes.porch);assert.deepEqual(m.granaryFloorStudies.map(s=>s.floorElevation),[1.2,1.35,1.5]);
 for(const s of m.granaryFloorStudies){assert.ok(s.fullGameUnits[0]<=30);assert.ok(s.fullGameUnits[2]<=26.8);}
 for(const id of ['facility-farm','facility-smith','facility-granary','facility-lumber','facility-market'])for(const low of [false,true]){
  const a=architecture(id,{low});for(const s of a.supports){assert.equal(s.point[1],0);assert.ok(s.top>0);}
  // Swept entrance volume: exact component bounds exclude the intentional closed door plane.
  for(const e of a.entrances){const p=e.threshold,corridor=new Box3(new Vector3(p[0]-e.clearWidth/2,p[1]+.05,p[2]+.03),new Vector3(p[0]+e.clearWidth/2,p[1]+2.15,p[2]+e.clearDepth));for(const part of a.parts){part.g.computeBoundingBox();assert.ok(!corridor.intersectsBox(part.g.boundingBox),id+' corridor intersects '+part.name);}}
  if(id==='facility-granary'){assert.ok(!a.parts.some(p=>p.name.includes('plinth')));const floor=a.parts.find(p=>p.name==='closed floor and underside');assert.ok(floor);floor.g.computeBoundingBox();assert.ok(Math.abs(floor.g.boundingBox.max.y-1.35)<1e-5);}
  if(id==='facility-smith'){const opening=a.roofPenetration;assert.equal(opening.clearance,.11);assert.equal(opening.stackTop,5.5);const stackAtRoof=new Box3(new Vector3(-1.31,3,-1.26),new Vector3(-.49,3.5,-.44));for(const part of a.parts.filter(p=>p.name==='roof around flue')){part.g.computeBoundingBox();assert.ok(!stackAtRoof.intersectsBox(part.g.boundingBox),'roof crosses stack opening');}}
  for(const p of a.parts)p.g.dispose();
 }
});
test('checkout-only rebuild reproduces both GLB and measured contract byte-for-byte',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'wv006-c-'));try{execFileSync(process.execPath,['scripts/build-wv006-baselines.mjs'],{env:{...process.env,WV006_OUTPUT:temp},stdio:'pipe'});for(const f of ['catalog.glb','manifest.json','License_Source.txt'])assert.equal(sha(await readFile(join(temp,f))),sha(await readFile(path+f)));}finally{await rm(temp,{recursive:true,force:true});}
});
