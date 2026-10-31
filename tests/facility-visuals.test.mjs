import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {facilityPlacement,farmlandRows,FACILITY_TYPES,PUBLIC_FACILITIES} from '../building-visuals.mjs';
const entries=JSON.parse(readFileSync(new URL('../assets/wv/architecture-v1/manifest.json',import.meta.url))).entries;
const world={width:600,depth:400,sample:()=>({height:12,water:null})};
test('working facilities fit uniform envelopes and face committed road approaches without state writes',()=>{
 const state=Object.freeze({roads:Object.freeze([Object.freeze([Object.freeze({x:50,y:190}),Object.freeze({x:550,y:190})])])});
 for(const type of FACILITY_TYPES){
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

test('public spaces have terrain-following walkable ground and no procedural building shell',async()=>{
 const {settlementGeometry}=await import('../game-3d-mesh.mjs');
 const {createTerrainSurface}=await import('../terrain-surface.mjs');
 const terrain=createTerrainSurface({...world,sample:(x,y)=>({height:10+x*.03+y*.02,water:null})},20,20);
 const buildings=PUBLIC_FACILITIES.map((type,i)=>({id:i,type,x:100+i*130,y:200}));
 const state={buildings,houses:[],roads:[],zones:[],desirePaths:[]};
 const modelBuildings=new Map(buildings.map(b=>[b,{...facilityPlacement(terrain,b,state,entries),propFoundations:[]}]));
 assert.ok([...modelBuildings.values()].every(p=>p.groundSpace));
 const data=settlementGeometry(terrain,state,{modelBuildings});assert.equal(data.structures.length,0);assert.ok(data.surfaces.length>0);
 for(let i=0;i<data.surfaces.length;i+=9){
  const x=data.surfaces[i]+terrain.width/2,z=data.surfaces[i+2]+terrain.depth/2;
  assert.ok(Math.abs(data.surfaces[i+1]-terrain.sample(x,z).height-.65)<.0001);
 }
});
