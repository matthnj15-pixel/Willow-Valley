import test from "node:test";
import assert from "node:assert/strict";
import {createWorld,createWorldMesh,rockExposure} from "../world-gen.mjs";
import {KENNEY_MODELS,instantiateKenneyTerrain,kenneyLandscapePalette,harmonizeKenneyColor,WILLOW_PALETTE} from "../ui-kit/kenney-models.mjs";

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
 assert.ok(palette.land[1]>palette.land[0]&&palette.land[1]>palette.land[2],
  "Meadow greens remain natural after importing Kenney models");
 assert.ok(palette.land[1]-palette.land[2]<.23,"Ground must not become cyan");
 assert.ok(palette.water[2]>palette.water[1]&&palette.water[1]>palette.water[0],
  "Water remains muted blue, not a muddy or turquoise imported material");
 assert.ok(Math.abs(palette.stone[0]-palette.stone[1])<.05,
  "Cliff faces stay neutral grey instead of orange");
 const mesh=createWorldMesh(world,25,18,{trees:false,palette});
 assert.ok(mesh.groundTriangles>0);
 assert.ok(mesh.waterTriangles>0);
});

test("WORLD-ART-05: rock exposure grows with both slope and actual cliff height",()=>{
 const meadow=rockExposure(.14,4);
 const steepSmall=rockExposure(.98,6);
 const tallCliff=rockExposure(.98,44);
 assert.equal(meadow,0);
 assert.ok(steepSmall>meadow);
 assert.ok(tallCliff>steepSmall+.5);
 assert.ok(tallCliff>.8);
});
test("WORLD-ART-06: imported cyan/orange Kenney colors do not recolor the landscape",()=>{
 const neonGrass=harmonizeKenneyColor("ground",[.04,.95,.92]);
 const brightOrangeRock=harmonizeKenneyColor("cliff",[.95,.35,.05]);
 const muddyRiver=harmonizeKenneyColor("waterTile",[.64,.48,.18]);
 assert.ok(neonGrass[1]>neonGrass[2]&&neonGrass[1]>neonGrass[0],
  "Grass remains green instead of turquoise");
 assert.ok(neonGrass[2]<.48,"Grass should remain desaturated");
 assert.ok(Math.abs(brightOrangeRock[0]-brightOrangeRock[1])<.05,
  "Steep rock should be warm neutral grey, not orange");
 assert.ok(muddyRiver[2]>muddyRiver[1]&&muddyRiver[1]>muddyRiver[0],
  "Water remains a calm blue even when the source mesh is brown");
 const raw={vertices:new Float32Array([
  0,0,0,.04,.95,.92,0,1,0,
  1,0,0,.95,.35,.05,0,1,0,
  0,0,1,.64,.48,.18,0,1,0
 ])};
 const actual=kenneyLandscapePalette({ground:raw,waterTile:raw,cliff:raw});
 for(const [name,channels] of Object.entries(actual)){
  assert.equal(channels.length,3);
  assert.ok(channels.every(x=>x>=.2&&x<=.7),name);
 }
 assert.ok(Math.abs(actual.land[0]-WILLOW_PALETTE.land[0])<.03);
 assert.ok(Math.abs(actual.stone[0]-actual.stone[1])<.05);
});
test("WORLD-ART-07: terrain mesh stays finite with painted cliffs and blue shoreline gradients",()=>{
 const map=createWorld({seed:"CLIFF-ART-01",lakes:2,rivers:2,
  hills:95,cliffs:95,rolling:84,flatness:2});
 const model={vertices:new Float32Array([0,0,0,.96,.25,.10,0,1,0])};
 const palette=kenneyLandscapePalette({ground:model,waterTile:model,cliff:model});
 const mesh=createWorldMesh(map,42,33,{trees:false,palette});
 assert.ok(mesh.groundTriangles>2000);
 assert.ok(mesh.waterTriangles>0);
 assert.ok(mesh.ground.every(Number.isFinite)&&mesh.water.every(Number.isFinite));
 const groundColors=[],waterColors=[];
 for(let i=0;i<mesh.ground.length;i+=9)groundColors.push(mesh.ground[i+3],mesh.ground[i+4],mesh.ground[i+5]);
 for(let i=0;i<mesh.water.length;i+=9)waterColors.push(mesh.water[i+3],mesh.water[i+4],mesh.water[i+5]);
 assert.ok(Math.max(...groundColors)<.85,"No neon ground materials");
 assert.ok(waterColors.some((_,i)=>i%3===2&&waterColors[i]>waterColors[i-1]),
  "Blue water should be visible after importing Kenney materials");
});
