import {test} from 'node:test';import assert from 'node:assert/strict';
import {createTerrainClassification} from '../terrain-classification.mjs';
const world=seed=>({width:240,depth:160,options:{seed},trees:[{x:60,z:60}],rivers:[{points:[{x:190,z:0},{x:190,z:160}]}],sample:(x,z)=>({height:10+x*.05,water:x>180?20:null,kind:x>180?'river':'land'})});
test('derived masks deterministic, nonmutating, seed-dependent and shore continuous',()=>{
 const w=world('one');Object.freeze(w);const before=JSON.stringify(w),a=createTerrainClassification(w,{width:49,height:33}),b=createTerrainClassification(w,{width:49,height:33});
 assert.deepEqual(a.data,b.data);assert.equal(JSON.stringify(w),before);assert.notDeepEqual(a.data,createTerrainClassification(world('two'),{width:49,height:33}).data);
 assert.ok(a.distance[20]>a.distance[36]);assert.ok(a.data[(10*49+40)*4+3]>250);
 assert.ok(a.data.every(Number.isFinite));
});
