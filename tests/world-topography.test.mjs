import test from "node:test";
import assert from "node:assert/strict";
import {createWorld,createWorldMesh} from "../world-gen.mjs";
import {KENNEY_MODELS,instantiateKenneyTerrain,kenneyLandscapePalette} from "../ui-kit/kenney-models.mjs";

test("WORLD-TOPO-01: seeded lake basins trace winding terrain valleys",()=>{
 const world=createWorld({seed:"FINGER-LAKES",lakes:4,rivers:0});
 assert.equal(world.lakes.length,4);
 for(const lake of world.lakes){
  assert.ok(["ribbon","branched","lowland"].includes(lake.type));
  assert.ok(lake.spine.length>=15);
  const meander=lake.spine.some((point,i)=>i>0&&Math.abs(point.x-lake.spine[i-1].x)>1);
  assert.ok(meander);
  const middle=lake.spine[Math.floor(lake.spine.length/2)];
  assert.equal(world.sample(middle.x,middle.z).kind,"lake");
  assert.ok(Number.isFinite(lake.level));
 }
 const clone=createWorld({seed:"FINGER-LAKES",lakes:4,rivers:0});
 assert.deepEqual(clone.lakes,world.lakes);
 assert.equal(clone.signature,world.signature);
});
test("WORLD-TOPO-02: water geometry follows a river/lake outline at variable resolution",()=>{
 const world=createWorld({seed:"FINGER-LAKES",lakes:3,rivers:1});
 const a=createWorldMesh(world,25,20,{trees:false});
 const b=createWorldMesh(world,44,36,{trees:false});
 assert.ok(a.waterTriangles>0);
 assert.ok(b.waterTriangles>a.waterTriangles);
 assert.equal(b.water.length%9,0);
 assert.ok(b.water.every(Number.isFinite));
});
test("WORLD-ART-03: Kenney kit contains genuine terrain, water and shore models",()=>{
 for(const key of ["ground","waterTile","bank","cliff","beach"]){
  assert.match(KENNEY_MODELS[key],/nature-kit\/.+\.glb$/);
 }
});
test("WORLD-ART-04: authored Kenney ground and water mesh triangles are rendered in the landscape",()=>{
 const world=createWorld({seed:"GROUND-MODELS",lakes:1,rivers:1,flatness:80,forest:0});
 const model={min:[0,0,0],max:[1,1,1],vertices:new Float32Array([
  0,0,0,.2,.5,.25,0,1,0,
  1,0,0,.2,.5,.25,0,1,0,
  0,0,1,.2,.5,.25,0,1,0
 ])};
 const result=instantiateKenneyTerrain(world,{ground:model,waterTile:model,
  bank:model,cliff:model,beach:model});
 assert.ok(result.land.length>0);
 assert.ok(result.water.length>0);
 assert.equal(result.land.length%9,0);
 assert.equal(result.water.length%9,0);
 assert.ok(result.land.every(Number.isFinite));
 const palette=kenneyLandscapePalette({ground:model,waterTile:model,cliff:model});
 assert.ok(palette.land.every((v,i)=>Math.abs(v-[.2,.5,.25][i])<1e-5));
 const mesh=createWorldMesh(world,25,18,{trees:false,palette});
 assert.ok(mesh.groundTriangles>0);
 assert.ok(mesh.waterTriangles>0);
});
