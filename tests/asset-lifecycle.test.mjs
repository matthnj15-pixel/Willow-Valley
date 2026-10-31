import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {createModelRegistry,createResourceDisposer,assetURL} from '../asset-registry.mjs';

test('ART-INSTALL-01: complete branch-local install graph matches committed lengths and SHA-256',async()=>{
 const self={};runInNewContext(await readFile('asset-cache.js','utf8'),{self});
 const urls=new Set(self.WV_ASSET_CACHE);assert.equal(urls.size,self.WV_ASSET_INTEGRITY.length);
 for(const e of self.WV_ASSET_INTEGRITY){
  const bytes=await readFile(e.url);assert.equal(bytes.length,e.bytes,e.url);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),e.sha256,e.url);
  assert.ok(!e.url.includes('..'));assert.ok(urls.has(e.url));
 }
 for(const file of ['index.html','app.mjs','asset-registry.mjs','ui-kit/asset-gallery.mjs','assets/vendor/three.module.mjs','assets/wv/architecture-v1/manifest.json','assets/wv/architecture-v1/tree-oak.glb'])assert.ok(urls.has('./'+file));
});
test('ART-LIFE-01: registry shares concurrent loads and rejects late attachment after disposal',async()=>{
 let complete,calls=0,freed=0;
 const registry=createModelRegistry({loadAsync:()=>{calls++;return new Promise(resolve=>{complete=resolve;});}});
 const a=registry.load('home-long-ridge'),b=registry.load('home-long-ridge');assert.equal(a,b);
 await new Promise(resolve=>setImmediate(resolve));const disposal=registry.dispose();
 complete({scene:{traverse(fn){fn({geometry:{dispose(){freed++;}}});}}});
 await assert.rejects(a,/disposed/);await disposal;await registry.dispose();
 assert.equal(calls,1);assert.equal(freed,1);await assert.rejects(registry.load('tree-oak'),/disposed/);
});
test('ART-LIFE-02: failed loads can retry without poisoning the cache',async()=>{
 let calls=0;const model={scene:{traverse(){}}};
 const registry=createModelRegistry({loadAsync:async()=>{if(++calls===1)throw Error('Unavailable');return model;}});
 await assert.rejects(registry.load('tree-oak'),/Unavailable/);
 assert.equal(await registry.load('tree-oak'),model);assert.equal(calls,2);await registry.dispose();
 assert.throws(()=>assetURL('../outside'),/Invalid asset/);
});
test('ART-LIFE-03: shared geometry, material, texture and image bitmap dispose once across models',()=>{
 const calls={geometry:0,material:0,texture:0,image:0};
 const geometry={dispose(){calls.geometry++;}},image={close(){calls.image++;}},texture={isTexture:true,source:{data:image},dispose(){calls.texture++;}};
 const material={map:texture,normalMap:texture,dispose(){calls.material++;}};
 const scene={traverse(fn){fn({geometry,material:[material,material]});fn({geometry,material});}};
 const dispose=createResourceDisposer();dispose(scene);dispose(scene);
 assert.deepEqual(calls,{geometry:1,material:1,texture:1,image:1});
});
