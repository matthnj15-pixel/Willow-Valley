import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {settlementGeometry} from '../game-3d-mesh.mjs';import {settlementRenderFixture} from '../settlement-render-fixtures.mjs';import {createTerrainSurface} from '../terrain-surface.mjs';
test('semantic sidecar preserves the complete pre-S3 vertex payload',()=>{
 const f=settlementRenderFixture(30),before=JSON.stringify(f.state),a=settlementGeometry(createTerrainSurface(f.world,62,46),f.state);
 assert.equal(createHash('sha256').update(new Uint8Array(a.surfaces.buffer)).digest('hex'),'7125399bca89a780c0595ff44b3af90d9ab38539ba3d90b7da17c2a3500a8de0');
 assert.equal(a.surfaceKinds.length,a.surfaces.length/9);assert.equal(JSON.stringify(f.state),before);
 for(const kind of [1,2,3])assert.ok(a.surfaceKinds.includes(kind));
 for(let i=0;i<a.surfaceKinds.length;i+=3)assert.deepEqual([...a.surfaceKinds.slice(i,i+3)],[a.surfaceKinds[i],a.surfaceKinds[i],a.surfaceKinds[i]]);
});
test('committed crop rows keep the untextured semantic',()=>{
 const f=settlementRenderFixture(30),surface=createTerrainSurface(f.world,62,46),state={turn:2,houses:[],buildings:[],roads:[],zones:[]};
 const a=settlementGeometry(surface,state,{cropRows:[{x:100,y:100}]});assert.ok(a.surfaceKinds.length>0);assert.ok(a.surfaceKinds.every(kind=>kind===0));assert.equal(a.surfaceOffsets.length,a.surfaceKinds.length);
});
