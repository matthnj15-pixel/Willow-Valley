import test from "node:test";
import assert from "node:assert/strict";
import {createWorld} from "../world-gen.mjs";
import {KENNEY_MODELS,instantiateKenney} from "../ui-kit/kenney-models.mjs";

test("WORLD-3D-ASSET-01: requested Kenney kit sources reference real GLB filenames",()=>{
 for(const name of ["oak","pine","birch","rock","tower"]){
  assert.match(KENNEY_MODELS[name],/^https:\/\/hidencod\.github\.io\/tge-assets\/packs\/(nature-kit|castle-kit)\/.+\.glb$/);
 }
 assert.ok(KENNEY_MODELS.tower.includes("castle-kit"));
});
test("WORLD-3D-ASSET-02: known GLB triangles become world-space tree instances",()=>{
 const world=createWorld({seed:"KENNEY-TEST",forest:65,lakes:0,rivers:0});
 const fake={vertices:new Float32Array([
  0,0,0,.2,.6,.2,0,1,0,
  1,0,0,.2,.6,.2,0,1,0,
  0,2,0,.2,.6,.2,0,1,0
 ]),min:[0,0,0],max:[1,2,0]};
 const scene=instantiateKenney(world,{oak:fake,pine:fake,birch:fake,rock:fake,tower:fake},{showReference:true});
 assert.ok(scene.treeModels>0);
 assert.ok(scene.vertices.length>27);
 assert.equal(scene.vertices.length%9,0);
 assert.ok(scene.vertices.every(Number.isFinite));
 const empty=instantiateKenney(world,{},{});
 assert.equal(empty.vertices.length,0);
});
