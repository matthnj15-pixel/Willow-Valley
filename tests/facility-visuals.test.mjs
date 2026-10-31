import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {facilityPlacement,farmlandRows,WORKING_FACILITIES} from '../building-visuals.mjs';
const entries=JSON.parse(readFileSync(new URL('../assets/wv/architecture-v1/manifest.json',import.meta.url))).entries;
const world={width:600,depth:400,sample:()=>({height:12,water:null})};
test('working facilities fit uniform envelopes and face committed road approaches without state writes',()=>{
 const state=Object.freeze({roads:Object.freeze([Object.freeze([Object.freeze({x:50,y:190}),Object.freeze({x:550,y:190})])])});
 for(const type of WORKING_FACILITIES){
  const b=Object.freeze({type,x:150,y:130}),before=JSON.stringify(b),p=facilityPlacement(world,b,state,entries);
  assert.ok(p);assert.equal(p.id,'facility-'+type);assert.equal(Math.abs(p.yaw),0);assert.ok(p.entrance.y>b.y);assert.equal(JSON.stringify(b),before);
  assert.equal(facilityPlacement({...world,sample:()=>({height:12,water:13})},b,state,entries),null);
 }
});
test('crop rows require committed farmland, deduplicate nearby farms, and exclude water and roads',()=>{
 const farm={type:'farm',x:120,y:130},state={buildings:[farm],houses:[],roads:[],zones:[{type:'farmland',radius:80,points:[{x:120,y:210}]}]};
 const before=JSON.stringify(state),rows=farmlandRows(world,state);assert.ok(rows.length>0);assert.equal(JSON.stringify(state),before);
 assert.deepEqual(farmlandRows(world,{...state,buildings:[farm,farm]}),rows);
 assert.deepEqual(farmlandRows(world,{...state,zones:[]}),[]);
 assert.deepEqual(farmlandRows({...world,sample:()=>({height:12,water:13})},state),[]);
 const roadRows=farmlandRows(world,{...state,roads:[[{x:120,y:0},{x:120,y:400}]]});assert.ok(roadRows.every(p=>Math.abs(p.x-120)>=18));
});
