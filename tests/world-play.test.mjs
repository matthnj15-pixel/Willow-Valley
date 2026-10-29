import test from "node:test";
import assert from "node:assert/strict";
import {DEFAULT_WORLD,WORLD_SIZES,createWorld} from "../world-gen.mjs";
import {startGame,startWorldGame,worldDimensions,configureWorldState,
 generatedWorld,validState,WORLD,placeBuilding,buildRoad,advance} from "../simulation.mjs";
import {paintZones,zoneAt} from "../organic-world.mjs";
import {settlementGeometry} from "../game-3d-mesh.mjs";

test("WORLD-PLAY-01: new worlds are playable states with real generated size and saved seed",()=>{
 const params={...DEFAULT_WORLD,size:"medium",seed:"PLAYABLE-MEADOW",lakes:1,rivers:1,flatness:80,hills:15,cliffs:5};
 const state=startWorldGame(params);
 assert.ok(validState(state));
 assert.deepEqual(worldDimensions(state),{w:2400,h:1800});
 assert.equal(WORLD.w,2400);assert.equal(WORLD.h,1800);
 assert.equal(state.worldOptions.seed,params.seed);
 const terrain=generatedWorld(state);
 for(const b of state.buildings)assert.equal(terrain.sample(b.x,b.y).water,null);
 const geometry=settlementGeometry(terrain,state);
 assert.ok(geometry.surfaces.length>0);
 assert.ok(geometry.structures.length>0);
 assert.equal(geometry.counts.houses,state.houses.length);
 assert.ok(geometry.structures.every(Number.isFinite));
 assert.ok(validState(structuredClone(state)));
 const copy=startWorldGame(params);
 assert.deepEqual(copy.roads,state.roads);
 assert.deepEqual(copy.buildings,state.buildings);
});
test("WORLD-PLAY-02: road and zoning may use the enlarged map beyond old bounds",()=>{
 const s=startWorldGame({...DEFAULT_WORLD,size:"large",seed:"ROAD-MAP-3D",
  flatness:100,hills:0,rolling:0,cliffs:0,lakes:0,rivers:0,forest:0});
 assert.deepEqual(worldDimensions(s),{w:3600,h:2700});
 const p={x:3000,y:2050};
 assert.equal(generatedWorld(s).sample(p.x,p.y).water,null);
 const zone=paintZones(s,"residential",[[p]],60);
 assert.equal(zone.ok,true,zone.reason);
 assert.equal(zoneAt(s,p),"residential");
 const road=buildRoad(s,[{x:2900,y:1900},{x:3100,y:1900}],[null]);
 assert.equal(road.ok,true,road.reason);
 assert.ok(validState(s));
 const geometry=settlementGeometry(generatedWorld(s),s);
 assert.ok(geometry.zones.length>0,"Zoning must have actual 3D surface geometry");
 assert.ok(geometry.surfaces.length>0,"Committed roads must render on 3D terrain");
});
test("WORLD-PLAY-03: legacy maps remain valid and can be reopened after 3D",()=>{
 const old=startGame();
 const fresh=startWorldGame({...DEFAULT_WORLD,size:"small",seed:"SMALL-3D",flatness:95,lakes:0,rivers:0});
 assert.ok(validState(old));
 assert.ok(validState(fresh));
 configureWorldState(old);
 assert.equal(WORLD.w,1200);
 assert.equal(WORLD.h,900);
 assert.equal(generatedWorld(old),null);
 configureWorldState(fresh);
 assert.equal(WORLD.w,1600);
 assert.ok(validState(old));
});
test("WORLD-PLAY-04: terrain forbids building in actual lake water",()=>{
 const s=startWorldGame({...DEFAULT_WORLD,seed:"LAKE-SITE",lakes:3,rivers:0,
  flatness:85,cliffs:0});
 const terrain=generatedWorld(s);
 let lakePoint=null;
 for(const lake of terrain.lakes){
  const p=lake.spine[Math.floor(lake.spine.length/2)];
  if(terrain.sample(p.x,p.z).water!==null){lakePoint={x:p.x,y:p.z};break;}
 }
 assert.ok(lakePoint,"Expected a generated lake");
 const outcome=placeBuilding(s,"park",lakePoint);
 assert.equal(outcome.ok,false);
 const z=paintZones(s,"residential",[[lakePoint]],45);
 assert.equal(z.ok,true);
 assert.equal(zoneAt(s,lakePoint),null);
});
