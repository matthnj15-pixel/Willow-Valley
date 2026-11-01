import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {getBounds} from '@gltf-transform/functions';
import validator from 'gltf-validator';
test('gallery bundle matches measured provenance, fixed scale, complete footprint and glTF validation',async()=>{
 const m=JSON.parse(await readFile('assets/wv/megakit-v1/manifest.json','utf8')),b=await readFile(m.output.url);
 assert.equal(createHash('sha256').update(b).digest('hex'),m.output.sha256);assert.equal(b.length,m.output.bytes);
 assert.equal(m.runtimeReady,false);assert.equal(m.gameUnitsPerMetre,2.8);assert.deepEqual(m.externalDependencies,[]);
 const report=await validator.validateBytes(new Uint8Array(b));assert.equal(report.issues.numErrors,0,JSON.stringify(report.issues.messages));
 const d=await new NodeIO().readBinary(b),roots=d.getRoot().getDefaultScene().listChildren();
 for(const entry of m.entries){const root=roots.find(r=>r.getName()===entry.id);assert.ok(root);const bounds=getBounds(root);
  for(let i=0;i<3;i++){assert.ok(Math.abs(bounds.min[i]-entry.boundsMin[i])<1e-5);assert.ok(Math.abs(bounds.max[i]-entry.boundsMax[i])<1e-5);}
  let count=0;root.traverse(n=>{for(const p of n.getMesh()?.listPrimitives()||[])count+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;});assert.equal(count,entry.triangles);
 }
 const cottage=m.entries.find(e=>e.id==='home-steep-gable');assert.ok((cottage.boundsMax[0]-cottage.boundsMin[0])*2.8<16);assert.ok((cottage.boundsMax[2]-cottage.boundsMin[2])*2.8<18);
 assert.ok(m.textures.reduce((n,t)=>n+t.estimatedMipRGBA8Bytes,0)<12*1024*1024);
 const research=JSON.parse(await readFile('docs/assets/wv-megakit/models.json','utf8'));
 for(const source of m.sources)assert.equal(source.sha256,research.find(r=>r.path===source.path).sha256);
});
