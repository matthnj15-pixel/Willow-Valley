import test from "node:test";
import assert from "node:assert/strict";
import {DEFAULT_WORLD,WORLD_SIZES,createWorld} from "../world-gen.mjs";
import {startGame,startWorldGame,worldDimensions,configureWorldState,
 generatedWorld,validState,WORLD,placeBuilding,buildRoad,advance} from "../simulation.mjs";
import {paintZones,zoneAt} from "../organic-world.mjs";
import {settlementGeometry} from "../game-3d-mesh.mjs";
import {addRoadAnchor,createRoadDraft} from "../road-editor.mjs";
import {quadraticPoint} from "../road-network.mjs";
import {validDesirePaths,visibleDesirePaths} from "../desire-paths.mjs";

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

test("WORLD-PLAY-05: saves accept long terrain-aware pedestrian routes anywhere on a large world",()=>{
 const state=startWorldGame({...DEFAULT_WORLD,size:"large",
  seed:"EXTENDED-FOOTPATHS",flatness:100,hills:0,rolling:0,cliffs:0,lakes:0,rivers:0,forest:0});
 const via=Array.from({length:56},(_,i)=>({x:1675+i*22,y:1750+Math.sin(i*.11)*30}));
 state.desirePaths=[{nodeId:state.roadGraph.hubId,from:via[0],to:via.at(-1),
  via,length:1300,progress:.56}];
 assert.ok(validDesirePaths(state.desirePaths,worldDimensions(state)));
 assert.ok(validState(state),"Stored route coordinates must validate on reload");
 const visible=visibleDesirePaths(state)[0];
 assert.ok(visible.points.length>=2);
 assert.ok(visible.points.at(-1).x<via.at(-1).x);
 assert.ok(settlementGeometry(generatedWorld(state),state).surfaces.length>0);
 configureWorldState(state);
 const result=advance(state);
 assert.ok(Number.isFinite(result.balance));
 assert.ok(validState(state),"Advancing a world with walking paths remains saveable");
});

test("ROAD-3D-010: 3D editor exposes existing nodes and curve handles",()=>{
 const state=startWorldGame({...DEFAULT_WORLD,size:"small",
  seed:"ROAD-CURVE-VISIBILITY",flatness:100,hills:0,lakes:0,rivers:0});
 const world=generatedWorld(state);
 const bare=settlementGeometry(world,state,{mode:"explore"});
 const edit=settlementGeometry(world,state,{mode:"road"});
 assert.equal(bare.guides.length,0);
 assert.ok(edit.guides.length>0,"Junction beacons must exist in Road mode");
 assert.ok(edit.counts.guideTriangles>0);
 const edge=state.roadGraph.segments[0];
 const a=state.roadGraph.nodes.find(n=>n.id===edge.a);
 const b=state.roadGraph.nodes.find(n=>n.id===edge.b);
 edge.control={x:(a.x+b.x)/2+22,y:(a.y+b.y)/2+32};
 const now=settlementGeometry(world,state,{mode:"road"});
 assert.ok(now.guides.length>edit.guides.length,"Curved built road exposes a handle");
 const live={id:edge.id,control:{x:edge.control.x+30,y:edge.control.y+55}};
 const dragging=settlementGeometry(world,state,{mode:"road",liveCurve:live});
 assert.ok(dragging.guides.length>now.guides.length,"Live curve must render a highlighted 3D preview");
 assert.notDeepEqual(dragging.surfaces,now.surfaces,"Road ribbon follows the dragged handle");
 assert.ok(dragging.guides.every(Number.isFinite));
});
test("ROAD-3D-011: curved draft and radial gesture have raised 3D markers",()=>{
 const state=startWorldGame({...DEFAULT_WORLD,size:"small",
  seed:"ROAD-DRAFT-PREVIEW",flatness:95,lakes:0,rivers:0});
 const world=generatedWorld(state);
 const draft=createRoadDraft(),p=state.roads[0][0];
 addRoadAnchor(draft,p);
 addRoadAnchor(draft,{x:p.x+135,y:p.y+25});
 draft.controls[0]={x:p.x+65,y:p.y+110};
 const base=settlementGeometry(world,state,{mode:"road",draft});
 const preview=settlementGeometry(world,state,{mode:"road",draft,
  liveGesture:{start:draft.anchors[1],end:draft.anchors[1],
   control:{x:p.x+210,y:p.y+120},radius:110},
  pendingControl:{x:p.x+150,y:p.y+70}});
 assert.ok(preview.guides.length>base.guides.length);
 assert.equal(preview.guides.length%9,0);
 assert.ok(preview.guides.every(Number.isFinite));
});
test("ZONE-3D-012: preview obeys the chronological order of mixed zone operations",()=>{
 const state=startWorldGame({...DEFAULT_WORLD,size:"small",
  seed:"ZONE-PREVIEW-ORDER",flatness:95,lakes:0,rivers:0});
 const world=generatedWorld(state),point={x:world.width*.64,y:world.depth*.64};
 const paint={type:"residential",radius:54,points:[point]};
 const erase={type:"erase",radius:54,points:[point]};
 const before=structuredClone(state.zones);
 const painted=settlementGeometry(world,state,{mode:"zone",zoneEdits:[paint]});
 const erased=settlementGeometry(world,state,{mode:"zone",zoneEdits:[paint,erase]});
 assert.ok(painted.zones.length>erased.zones.length,"Erase removes pending paint in 3D");
 assert.deepEqual(state.zones,before,"Editor previews may not alter saved zones");
});
