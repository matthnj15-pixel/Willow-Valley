import test from 'node:test';import assert from 'node:assert/strict';
import {naturePlacements} from '../nature-visuals.mjs';
import {settlementRenderFixture} from '../settlement-render-fixtures.mjs';
import {createWorldMesh} from '../world-gen.mjs';
test('local nature selection is deterministic, avoids settlement access and never changes state',()=>{
 const {world,state}=settlementRenderFixture(100),before=JSON.stringify(state);
 const normal=naturePlacements(world,state),low=naturePlacements(world,state,{low:true});
 assert.ok(normal.length>0);assert.ok(low.length<=95);assert.deepEqual(naturePlacements(world,state),normal);assert.equal(JSON.stringify(state),before);
 for(const p of normal){const x=p.origin[0]+world.width/2,z=p.origin[2]+world.depth/2;assert.equal(world.sample(x,z).water,null);assert.ok(Math.abs(p.origin[1]-world.sample(x,z).height)<=.020001);assert.ok(state.houses.every(h=>Math.hypot(h.x-x,h.y-z)>18));}
});
test('coherent meadow changes colors while preserving every contact position and normal',()=>{
 const {world}=settlementRenderFixture(30),a=createWorldMesh(world,20,20,{trees:false}),b=createWorldMesh(world,20,20,{trees:false,coherentMeadow:true});
 assert.equal(a.ground.length,b.ground.length);assert.deepEqual(a.water,b.water);
 for(let i=0;i<a.ground.length;i+=9)for(const j of [0,1,2,6,7,8])assert.equal(a.ground[i+j],b.ground[i+j]);
 assert.notDeepEqual(a.ground,b.ground);
});
