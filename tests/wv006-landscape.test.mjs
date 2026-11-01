import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateBytes} from 'gltf-validator';
import {NodeIO} from '@gltf-transform/core';
import {placeLandscape,createPlacementCache,createExclusionIndex} from '../assets/wv/landscape-next/placement.mjs';
import {landscapeFixture} from '../assets/wv/landscape-next/fixtures.mjs';
import {createLandscapeLibrary} from '../assets/wv/landscape-next/batches.mjs';
import * as T from '../assets/vendor/three.module.mjs';
const manifest=JSON.parse(await readFile(new URL('../assets/wv/landscape-next/manifest.json',import.meta.url))),entries=manifest.entries;
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
const base=()=>({seed:'stable',width:500,depth:500,entries,sample:(x,z)=>({height:2+x*.001+z*.001,water:null,slope:.01,moisture:.8}),treeCandidates:[{key:'oak-a',x:80,z:80,h:25},{key:'pine-b',x:220,z:210,h:31}],decorativeCandidates:[{key:'log',assetId:'fallen-log',x:120,z:130}],coverRegions:[{key:'meadow',kind:'meadow',bounds:{minX:10,minZ:10,maxX:480,maxZ:480}}]});
test('B collection is measured, hash-pinned valid glTF with no texture dependencies',async()=>{
 const bytes=await readFile(new URL('../assets/wv/landscape-next/landscape.glb',import.meta.url)),v=await validateBytes(bytes);assert.equal(v.issues.numErrors,0);assert.equal(v.issues.numWarnings,0);assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.output.sha256);assert.equal(manifest.output.bytes,bytes.length);
 const doc=await new NodeIO().readBinary(bytes);assert.equal(doc.getRoot().listTextures().length,0);assert.equal(entries.length,20);
 for(const source of manifest.sources)assert.equal(createHash('sha256').update(await readFile(source.path)).digest('hex'),source.sha256);
 for(const e of entries){assert.equal(e.runtimeReady,false);if(e.id.includes('pine'))assert.ok(Math.abs(e.variants[0].boundsMax[1]-e.variants[2].boundsMax[1])<.001,'far conifer retains crown height within one millimetre');for(const v of e.variants){const p=doc.getRoot().listMeshes().find(m=>m.getName()===v.node).listPrimitives()[0],a=p.getAttribute('POSITION').getArray();assert.equal(a.length/9,v.triangles);for(let axis=0;axis<3;axis++){let min=Infinity,max=-Infinity;for(let i=axis;i<a.length;i+=3){min=Math.min(min,a[i]);max=Math.max(max,a[i]);}assert.ok(Math.abs(min-v.boundsMin[axis])<1e-5);assert.ok(Math.abs(max-v.boundsMax[axis])<1e-5);}assert.equal(p.getMaterial().getAlphaMode(),'OPAQUE');}assert.ok(e.variants[1].triangles<e.variants[0].triangles||e.variants[0].triangles<80);}
});
test('B deterministic immutable fixtures, stable keys, unrelated state and camera independence',()=>{
 const input=freeze(base()),before=JSON.stringify(input),a=placeLandscape(input),b=placeLandscape({...input,treeCandidates:[...input.treeCandidates].reverse(),camera:{yaw:3},state:{turn:989}});assert.deepEqual(a.instances,b.instances);assert.equal(JSON.stringify(input),before);assert.equal(a.instances.filter(r=>r.key.startsWith('tree:')).length,2);assert.ok(a.instances.length>100);
 const changed=placeLandscape({...input,seed:'other'});assert.notDeepEqual(a.instances.map(r=>r.assetId),changed.instances.map(r=>r.assetId));
});
test('B exclusion envelopes cover roads, doors, stairs, loading, fields, overlays and preserve',()=>{
 const i=base();i.coverRegions=[];i.decorativeCandidates=[];for(const kind of ['road','lane','door','stairs','loading','field','structure','yard','water','overlay']){
 const result=placeLandscape({...i,exclusions:[{kind,points:[{x:30,z:80},{x:120,z:80}],radius:4}]});assert.ok(!result.instances.some(r=>r.key==='tree:oak-a'));assert.equal(result.retainedTrees[0].key,'tree:oak-a');}
 const result=placeLandscape({...i,exclusions:[{kind:'preserve',polygon:[{x:0,z:0},{x:500,z:0},{x:500,z:500},{x:0,z:500}]}],decorativeCandidates:[{key:'protected-cover',assetId:'grass-tuft',x:90,z:80}]});assert.equal(result.instances.length,2);assert.ok(result.instances.every(r=>r.key.startsWith('tree:')));
 const reedBlocked=placeLandscape({...i,treeCandidates:[],decorativeCandidates:[{key:'loading-reed',assetId:'reed-cluster',x:200,z:200}],exclusions:[{kind:'loading-stairs',points:[{x:200,z:180},{x:200,z:220}],radius:5}]});assert.equal(reedBlocked.instances.length,0);
 const idx=createExclusionIndex(Array.from({length:500},(_,i)=>({polygon:[{x:i*100,z:0},{x:i*100+20,z:0},{x:i*100+20,z:20},{x:i*100,z:20}]})));idx.blocked({x:5,z:5},2);assert.ok(idx.stats().tests<5);
});
test('B displayed rolling terrain, shoreline moisture, rigid log contact and unsuitable slopes',()=>{
 const input=base();input.coverRegions=[];const result=placeLandscape(input);for(const r of result.instances){assert.ok(r.groundContact.maxGap<.18);assert.equal(r.bounds.min[1],r.groundContact.baseY);for(const p of r.groundContact.points)assert.equal(p.height,input.sample(p.x,p.z).height);}
 const reed={key:'reed',assetId:'reed-cluster',x:200,z:200};for(const sample of [()=>({height:0,water:0,slope:0,moisture:1}),()=>({height:0,water:null,slope:0,moisture:.1}),()=>({height:0,water:null,slope:.8,moisture:1})])assert.equal(placeLandscape({...input,treeCandidates:[],decorativeCandidates:[reed],sample}).instances.length,0);
 assert.equal(placeLandscape({...input,treeCandidates:[],sample:(x,z)=>({height:x*.4,water:null,slope:.1,moisture:.8})}).instances.length,0);
 const edge=placeLandscape({...input,treeCandidates:[],decorativeCandidates:[reed],sample:(x,z)=>({height:0,water:x>201?0:null,slope:0,moisture:1})});assert.equal(edge.instances.length,0);
 const f=landscapeFixture('bank'),frozen=freeze(f.input),snapshot=JSON.stringify(frozen);const bank=placeLandscape({...frozen,entries});assert.ok(bank.instances.some(r=>r.assetId==='reed-cluster'));assert.ok(bank.instances.every(r=>r.groundContact.points.every(p=>f.input.sample(p.x,p.z).water===null)));assert.equal(JSON.stringify(frozen),snapshot);
});
test('B low/far retain tree identity; explicit revisions cache relevant changes only',()=>{
 const input=base(),normal=placeLandscape(input),low=placeLandscape({...input,quality:'low'}),far=placeLandscape({...input,distance:'far'}),trees=r=>r.instances.filter(r=>r.key.startsWith('tree:')).map(({key,assetId,origin,scale,yaw})=>({key,assetId,origin,scale,yaw}));assert.deepEqual(trees(normal),trees(low));assert.deepEqual(trees(normal),trees(far));assert.ok(low.instances.length<normal.instances.length*.6);assert.ok(far.instances.length<low.instances.length);
 const cache=createPlacementCache(),c={...input,terrainRevision:'one',catalogRevision:manifest.revision};assert.equal(cache.get(c),cache.get({...c,camera:{yaw:1},unrelated:'test'}));assert.equal(cache.rebuilds,1);cache.get({...c,terrainRevision:'two'});assert.equal(cache.rebuilds,2);cache.get({...c,exclusions:[{points:[{x:70,z:70},{x:90,z:90}],radius:20}]});assert.equal(cache.rebuilds,3);assert.throws(()=>cache.get(input),/terrainRevision/);
});
test('B batches share sources; rebuilding/disposal releases instance buffers without source deletion',()=>{
 const scene=new T.Group(),geo=new T.BoxGeometry(),mat=new T.MeshStandardMaterial(),mesh=new T.Mesh(geo,mat);mesh.name='grass-tuft__normal';scene.add(mesh);let gs=0,ms=0;geo.addEventListener('dispose',()=>gs++);mat.addEventListener('dispose',()=>ms++);const library=createLandscapeLibrary(scene),records=Array.from({length:500},(_,i)=>({assetId:'grass-tuft',lod:'normal',origin:[i,0,0],yaw:0,scale:1,key:String(i)}));const a=library.build(records);assert.equal(a.group.children.length,1);assert.equal(a.group.children[0].count,500);assert.equal(a.group.children[0].geometry,geo);let released=0;a.group.children[0].addEventListener('dispose',()=>released++);a.dispose();a.dispose();assert.equal(released,1);assert.equal(gs,0);const b=library.build(records);b.dispose();library.dispose();library.dispose();assert.equal(gs,1);assert.equal(ms,1);assert.throws(()=>library.build(records),/disposed/);
});
