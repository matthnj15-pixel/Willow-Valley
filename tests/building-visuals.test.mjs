import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {homePlacement} from '../building-visuals.mjs';
import {cottageBlueprint} from '../settlement-architecture.mjs';
const entries=JSON.parse(readFileSync(new URL('../assets/wv/architecture-v1/manifest.json',import.meta.url))).entries;
const world={width:400,depth:300,options:{seed:17},sample:(x,y)=>({height:10+x*.02+y*.01,water:null})};
test('B3 homes fit uniformly, seat level and face actual approaches in four directions',()=>{
 for(const [dx,dy] of [[0,40],[40,0],[0,-40],[-40,0]]){
  const house=Object.freeze({id:1,x:200,y:150,entrance:Object.freeze({x:200+dx,y:150+dy})});
  const before=JSON.stringify(house),p=homePlacement(world,house,entries),style=cottageBlueprint(house);
  assert.ok(p);assert.equal(p.yaw,-style.orientation);
  assert.ok(Math.abs(Math.sin(-p.yaw)*-1-dx/40)<1e-8);
  assert.ok(Math.abs(Math.cos(-p.yaw)-dy/40)<1e-8);
  const entry=entries.find(e=>e.id===p.id);
  assert.ok((entry.boundsMax[0]-entry.boundsMin[0])*p.scale<=style.width);
  assert.ok((entry.boundsMax[2]-entry.boundsMin[2])*p.scale<=style.depth);
  assert.equal(JSON.stringify(house),before);assert.deepEqual(homePlacement(world,house,entries),p);
 }
});
test('B3 selection ignores current turn and keeps shells for absent, wet or undersized sites',()=>{
 const house={id:4,x:200,y:150};const p=homePlacement(world,house,entries);
 assert.deepEqual(homePlacement(world,{...house,turn:99},entries),p);
 assert.equal(homePlacement(world,house,[]),null);
 assert.equal(homePlacement({...world,sample:()=>({height:1,water:10})},house,entries),null);
 assert.equal(homePlacement(world,{...house,parcel:{vertices:[{x:199,y:149},{x:201,y:149},{x:201,y:151},{x:199,y:151}]}},entries),null);
});
