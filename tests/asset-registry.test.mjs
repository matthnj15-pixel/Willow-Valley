import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {visualIdentity,selectHomeModel} from '../asset-registry.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
const manifest=JSON.parse(read('assets/wv/architecture-v1/manifest.json'));
test('local assemblies match recorded output hashes and have no unresolved image dependency',()=>{
 for(const entry of manifest.entries){
  const data=read(entry.url.slice(2));assert.equal(createHash('sha256').update(data).digest('hex'),entry.sha256);
  assert.ok(entry.triangles<2000);assert.ok(entry.bytes<200*1024);
  const json=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString());
  assert.ok((json.images||[]).every(image=>image.bufferView!==undefined||image.uri?.startsWith('data:')));
  assert.equal(entry.license,'CC0-1.0');assert.equal(entry.runtimeReady,false,'gallery review must precede gameplay promotion');
 }
});
test('source shortlist retains exact hashes and all attached texture dependencies',()=>{
 const source=JSON.parse(read('docs/assets/wv-art-002a/source-manifest.json'));
 for(const row of source.assets)for(const item of [row,...row.externalImages]){
  const bytes=read(`assets/wv/sources/${row.kit}/${item.path}`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256);
 }
});
test('visual identity ignores turn order/current chapter and does not mutate legacy entity state',()=>{
 const house=Object.freeze({x:40,y:50,foundedTurn:2,foundedEra:0});
 const chosen=selectHomeModel('SEED',house);
 assert.equal(selectHomeModel('SEED',{...house,chapter:3}),chosen);
 assert.equal(visualIdentity('SEED',house),visualIdentity('SEED',{...house}));
 assert.ok(new Set(Array.from({length:30},(_,i)=>selectHomeModel('SEED',{x:i*31,y:i*17}))).size===6);
});
