import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
test('surface derivatives are local, pinned CC0 albedos and integrity-installed',async()=>{
 const manifest=JSON.parse(await readFile('environment-asset-manifest.json')),cache=await readFile('asset-cache.js','utf8');
 for(const e of manifest.entries){const b=await readFile(e.url);assert.equal(b.length,e.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),e.sha256);assert.equal(e.license,'CC0-1.0');assert.match(e.sourceSHA256,/^[a-f0-9]{64}$/);assert.ok(cache.includes(e.url));assert.ok(cache.includes(e.sha256));}
});
