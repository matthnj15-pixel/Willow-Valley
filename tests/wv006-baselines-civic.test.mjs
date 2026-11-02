import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {NodeIO} from '@gltf-transform/core';
import {getBounds} from '@gltf-transform/functions';
import {validateBytes} from 'gltf-validator';
import {createHash} from 'node:crypto';
import {Box3,Vector3,Triangle,Matrix4} from 'three';
import {CIVIC_VARIANTS,civicArchitecture,civicChoice} from '../buildings-next/civic.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(await readFile('assets/wv/buildings-next/civic-manifest.json','utf8'));
test('eight leisure variants and the market candidate have measured normal/low geometry, existing roles and terrain-following surfaces',async()=>{
 const bytes=await readFile(manifest.output.url),validation=await validateBytes(new Uint8Array(bytes));assert.equal(validation.issues.numErrors,0);assert.equal(validation.issues.numWarnings,0);assert.equal(hash(bytes),manifest.output.sha256);assert.equal(manifest.entries.length,9);assert.equal(manifest.entries.filter(e=>e.role==='park').length,4);assert.equal(manifest.entries.filter(e=>e.role==='plaza').length,4);assert.deepEqual(manifest.selection.newBuildingKeys,[]);assert.equal(manifest.runtimeReady,false);
 const d=await new NodeIO().readBinary(bytes);for(const e of manifest.entries){assert.equal(e.status,'gallery-review');assert.equal(e.runtimeReady,false);assert.equal(e.existingIdentity,'facility-'+e.role);assert.equal(e.noSolidFoundation,true);assert.equal(e.groundSpace,true);assert.ok(e.low.triangles<e.triangles);assert.ok(e.civic.seats.length>=2);assert.ok(e.civic.routes.length>0);assert.ok(e.civic.surfaces.every(s=>s.conformToTerrain&&!s.solidFoundation));
  for(const low of [false,true]){const r=d.getRoot().getDefaultScene().listChildren().find(n=>n.getName()===(low?e.lowNode:e.normalNode)),b=getBounds(r),expected=low?e.low:e;for(let i=0;i<3;i++){assert.ok(Math.abs(b.min[i]-expected.boundsMin[i])<1e-5);assert.ok(Math.abs(b.max[i]-expected.boundsMax[i])<1e-5);}assert.ok((b.max[0]-b.min[0])*2.8<=(e.role==='market'?46:33));assert.ok((b.max[2]-b.min[2])*2.8<=(e.role==='market'?41.2:29.5));}
 }
});
test('market uses twelve varied stands and a stage while fitting the existing reservation at fixed scale',async()=>{
 const m=manifest,e=m.entries.find(e=>e.role==='market');assert.equal(e.civic.stalls.length,12);assert.ok(e.optionalDressingGroups.includes('market-civic-square-goods'));const d=await new NodeIO().readBinary(await readFile(m.output.url));assert.equal(d.getRoot().listNodes().find(n=>n.getName()==='market-civic-square-goods').getExtras().optional,true);assert.ok(new Set(e.civic.stalls.map(s=>s.kind)).size>=8);assert.equal(e.civic.stalls.filter(s=>s.covered).length,10);assert.ok(e.civic.activityZones.some(z=>z.kind==='stage'));assert.deepEqual(e.civic.planningEnvelope,[16,14]);assert.equal(e.civic.planningPlotStudy.columns,2);assert.equal(e.civic.planningPlotStudy.rows,2);assert.ok(e.existingEnvelopeCheck.axisAlignedFit);assert.ok(e.triangles<=6000);assert.ok(e.materialGroups<=3);assert.ok(1-e.civic.coveredArea/(16*14)>.65);
});
test('public walk volumes avoid stalls, seats, trunks, planters, stage steps and other fixed geometry',()=>{
 for(const def of [{id:'facility-market'},...CIVIC_VARIANTS])for(const low of [false,true]){const a=civicArchitecture(def.id,{low});for(const route of a.civic.routes){assert.ok(route.width>=1.1);for(let i=1;i<route.points.length;i++){const p=route.points[i-1],q=route.points[i],dx=q[0]-p[0],dz=q[1]-p[1],L=Math.hypot(dx,dz),rotation=new Matrix4().makeRotationY(-Math.atan2(dx,dz)),center=new Vector3((p[0]+q[0])/2,0,(p[1]+q[1])/2),sweep=new Box3(new Vector3(-route.width/2,-.05,-L/2+.03),new Vector3(route.width/2,2.08,L/2-.03));
   for(const part of a.parts){if(part.category.startsWith('surface-'))continue;const pos=part.g.getAttribute('position'),idx=part.g.index;for(let j=0;j<(idx?idx.count:pos.count);j+=3){const v=[0,1,2].map(k=>{const n=idx?idx.getX(j+k):j+k;return new Vector3(pos.getX(n),pos.getY(n),pos.getZ(n)).sub(center).applyMatrix4(rotation);});assert.ok(!sweep.intersectsTriangle(new Triangle(...v)),def.id+' '+route.name+' blocked by '+part.name);}}
  }}const solid=a.parts.filter(p=>!p.category.startsWith('surface-'));solid.forEach(p=>p.g.computeBoundingBox());for(const [x,y,z] of a.civic.groundContacts)assert.ok(solid.some(p=>p.g.boundingBox.containsPoint(new Vector3(x,y+.005,z))),def.id+' unsupported contact '+[x,y,z]);for(const foot of solid.filter(p=>p.name==='bench stone foot'))assert.ok(solid.some(p=>p.name==='bench seat board'&&p.g.boundingBox.intersectsBox(foot.g.boundingBox)),def.id+' floating bench seat');for(const s of a.civic.seats){assert.equal(s.seatHeight,.45);assert.equal(s.physicalSeats,2);assert.ok(s.approach.depth>=.7);}a.parts.forEach(p=>p.g.dispose());}
});
test('manual and stable civic choices never remap homes or invent functional building keys',()=>{
 for(const e of CIVIC_VARIANTS){assert.equal(civicChoice(e.role,e.id,'same'),e.id);assert.equal(civicChoice(e.role,e.id==='park-promenade'?'plaza-town-square':'invalid','same'),null);}assert.equal(civicChoice('smith',null,0),null);assert.equal(civicChoice('park',null,'same'),civicChoice('park',null,'same'));assert.equal(new Set(Array.from({length:100},(_,i)=>civicChoice('park',null,i))).size,4);
});
