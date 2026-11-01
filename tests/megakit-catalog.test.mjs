import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {getBounds} from '@gltf-transform/functions';
import {HOME_IDS} from '../asset-registry.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
test('ten catalog designs retain measured scale, source provenance, shared textures and stable residential slots',async()=>{
 const m=JSON.parse(await readFile('assets/wv/megakit-catalog-v1/manifest.json','utf8')),bytes=await readFile(m.output.url),doc=await new NodeIO().readBinary(bytes);
 assert.equal(hash(bytes),m.output.sha256);assert.equal(bytes.length,m.output.bytes);assert.ok(bytes.length<4*1024*1024);
 assert.equal(m.gameUnitsPerMetre,2.8);assert.equal(m.runtimeReady,false);assert.deepEqual(m.externalDependencies,[]);
 const homes=m.entries.filter(e=>e.role==='residential'),work=m.entries.filter(e=>e.role!=='residential');assert.equal(homes.length,5);assert.equal(work.length,5);assert.equal(new Set(m.entries.map(e=>e.id)).size,10);
 assert.deepEqual(work.map(e=>e.role).sort(),['farm','granary','lumber','market','smith']);assert.ok(homes.every(e=>HOME_IDS.includes(e.id)));
 const fingerprints=[];
 for(const entry of m.entries){const root=doc.getRoot().getDefaultScene().listChildren().find(n=>n.getName()===entry.id);assert.ok(root);const b=getBounds(root);let triangles=0;const positions=[];
  for(let i=0;i<3;i++){assert.ok(Math.abs(b.min[i]-entry.boundsMin[i])<1e-5);assert.ok(Math.abs(b.max[i]-entry.boundsMax[i])<1e-5);}
  root.traverse(n=>{for(const p of n.getMesh()?.listPrimitives()||[]){triangles+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;const a=p.getAttribute('POSITION').getArray();positions.push(Buffer.from(a.buffer,a.byteOffset,a.byteLength));}});assert.equal(triangles,entry.triangles);
  if(entry.role==='residential')fingerprints.push(hash(Buffer.concat(positions)));assert.ok(entry.entrances.length>0);assert.ok(entry.structuralSeats.length>0);assert.equal(entry.runtimeReady,false);
 }
 assert.equal(new Set(fingerprints).size,5,'residential variety must include actual geometry differences');
 const original=JSON.parse(await readFile('assets/wv/megakit-v1/manifest.json','utf8')),accepted=original.entries.find(e=>e.id==='home-steep-gable'),copy=homes.find(e=>e.id==='home-steep-gable');
 assert.equal(copy.approvedGeometryInputSha256,original.output.sha256);assert.equal(copy.triangles,accepted.triangles);for(let i=0;i<3;i++){assert.ok(Math.abs(copy.boundsMin[i]-accepted.boundsMin[i])<1e-5);assert.ok(Math.abs(copy.boundsMax[i]-accepted.boundsMax[i])<1e-5);}
 assert.equal(hash(await readFile('assets/wv/megakit-catalog-v1/License_Source.txt')),m.sourceLicenseSha256);
 const textures=doc.getRoot().listTextures();assert.equal(new Set(textures.map(t=>hash(t.getImage()))).size,textures.length,'texture objects must share content');assert.ok(m.textures.reduce((n,t)=>n+t.estimatedMipRGBA8Bytes,0)<6*1024*1024);
 const research=JSON.parse(await readFile('docs/assets/wv-megakit/models.json','utf8'));for(const source of m.sources)assert.equal(source.sha256,research.find(r=>r.path===source.path).sha256);
});
