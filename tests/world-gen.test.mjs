import test from "node:test";
import assert from "node:assert/strict";
import {DEFAULT_WORLD,WORLD_SIZES,normalizeWorldSettings,validWorldSettings,
 createWorld,createWorldMesh} from "../world-gen.mjs";

test("WORLD-3D-01: a seed and parameters reproduce exactly the same landscape",()=>{
 const first=createWorld(DEFAULT_WORLD),second=createWorld(DEFAULT_WORLD);
 assert.equal(first.signature,second.signature);
 assert.deepEqual(first.lakes,second.lakes);
 assert.deepEqual(first.rivers,second.rivers);
 assert.deepEqual(first.trees,second.trees);
 const different=createWorld({...DEFAULT_WORLD,seed:"DIFFERENT-VALLEY"});
 assert.notEqual(different.signature,first.signature);
});
test("WORLD-3D-02: map size changes actual terrain extents, not a cosmetic label",()=>{
 for(const size of Object.keys(WORLD_SIZES)){
  const map=createWorld({...DEFAULT_WORLD,size});
  assert.equal(map.width,WORLD_SIZES[size].width);
  assert.equal(map.depth,WORLD_SIZES[size].depth);
 }
 const small=createWorld({...DEFAULT_WORLD,size:"small"});
 const large=createWorld({...DEFAULT_WORLD,size:"large"});
 assert.ok(large.width*large.depth>small.width*small.depth);
});
test("WORLD-3D-03: water, forest, and cliff controls drive deterministic geometry",()=>{
 const dry=createWorld({...DEFAULT_WORLD,lakes:0,rivers:0,forest:0});
 assert.equal(dry.lakes.length,0);
 assert.equal(dry.rivers.length,0);
 assert.equal(dry.trees.length,0);
 const wet=createWorld({...DEFAULT_WORLD,lakes:4,rivers:3,waterLevel:90,forest:100});
 assert.equal(wet.lakes.length,4);
 assert.equal(wet.rivers.length,3);
 assert.ok(wet.trees.length>0);
 const mesh=createWorldMesh(wet,28,22);
 assert.ok(mesh.groundTriangles>28*22*2);
 assert.ok(mesh.waterTriangles>0);
 assert.equal(mesh.ground.length%9,0);
 assert.equal(mesh.water.length%9,0);
 assert.ok(mesh.ground.every(Number.isFinite));
 assert.ok(mesh.water.every(Number.isFinite));
});
test("WORLD-3D-04: generated terrain responds to landscape style and seed bounds",()=>{
 const gentle=createWorld({...DEFAULT_WORLD,rolling:0,hills:0,cliffs:0,flatness:100});
 const rugged=createWorld({...DEFAULT_WORLD,rolling:95,hills:95,cliffs:95,flatness:0});
 function relief(world){
  const heights=[];
  for(let z=0;z<20;z++)for(let x=0;x<20;x++)
   heights.push(world.sample(x/19*world.width,z/19*world.depth).height);
  return Math.max(...heights)-Math.min(...heights);
 }
 assert.ok(relief(rugged)>relief(gentle)+35);
 const invalid=normalizeWorldSettings({seed:"  ",size:"gigantic",rivers:99,forest:-50});
 assert.equal(invalid.seed,DEFAULT_WORLD.seed);
 assert.equal(invalid.size,"medium");
 assert.equal(invalid.rivers,3);
 assert.equal(invalid.forest,0);
 assert.equal(validWorldSettings(DEFAULT_WORLD),true);
 assert.equal(validWorldSettings({...DEFAULT_WORLD,rivers:99}),false);
});
