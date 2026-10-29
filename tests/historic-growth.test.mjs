import test from "node:test";
import assert from "node:assert/strict";
import {terrainContours} from "../terrain-contours.mjs";
import {startGame,advance,validState} from "../simulation.mjs";
import {paintZones,findCottageSite,canWalkAt,zoneAt,routeFootpath} from "../organic-world.mjs";

const zone=[{x:685,y:419},{x:705,y:425},{x:728,y:421}];
test("WORLD-20: deterministic contour lines reveal elevation without changing simulation",()=>{
 const contours=terrainContours(),other=terrainContours();
 assert.deepEqual(contours,other);
 assert.deepEqual(contours.map(c=>c.level),[-20,0,20,40]);
 assert.ok(contours.some(c=>c.segments>25));
 assert.ok(contours.every(c=>typeof c.d==="string"&&!c.d.includes("NaN")));
});
test("WORLD-20: public cottage path starts outside its reserved irregular plot",()=>{
 const s=startGame();
 assert.equal(paintZones(s,"residential",[zone],54).ok,true);
 const site=findCottageSite(s);
 assert.ok(site,"a painted residential area should allow a founding cottage");
 assert.ok(site.house.parcel.vertices.length>=5);
 assert.equal(site.house.foundedTurn,s.turn);
 assert.deepEqual(site.lane.points[0],site.lane.entrance);
 assert.equal(zoneAt(s,site.house),"residential");
 s.houses.push(site.house);
 s.localLanes.push(site.lane);
 assert.equal(canWalkAt(s,site.lane.entrance),true,
  "the public path entrance must remain accessible after construction");
 for(let i=1;i<site.lane.points.length;i++){
  const a=site.lane.points[i-1],b=site.lane.points[i];
  const steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/5);
  for(let j=0;j<=steps;j++){
   const p={x:a.x+(b.x-a.x)*j/steps,y:a.y+(b.y-a.y)*j/steps};
   assert.equal(canWalkAt(s,p),true,"a new public path cannot cut through its own house or parcel");
  }
 }
 assert.equal(validState(s),true);
});
test("WORLD-20: subsequent housing preserves original cottages and their path geometry",()=>{
 const s=startGame();
 assert.equal(paintZones(s,"residential",[zone],54).ok,true);
 advance(s);advance(s);
 assert.ok(s.houses.length>=5,"a first family should generate a new cottage");
 const old=structuredClone(s.houses.at(-1)),lane=structuredClone(s.localLanes.at(-1));
 for(let i=0;i<8;i++)advance(s);
 assert.ok(s.houses.some(h=>JSON.stringify(h)===JSON.stringify(old)),
  "later town growth must never rewrite an earlier cottage parcel");
 assert.ok(s.localLanes.some(l=>JSON.stringify(l)===JSON.stringify(lane)),
  "later growth must preserve the original walkable lane");
 assert.ok(s.houses.every(h=>!h.parcel||h.parcel.vertices.length>=5));
 assert.equal(validState(s),true);
});

test("WORLD-ACCESS-01: cottage lane at parcel edge provides reachable road service",async()=>{
 const {structureAccess,housingAccess}=await import("../simulation.mjs");
 const s=startGame(),house={x:700,y:610};
 s.houses.push(house);s.localLanes.push({houseX:700,houseY:610,
  connectsTo:"road",entrance:{x:675,y:582},points:[{x:675,y:582},{x:460,y:454}]});
 assert.equal(structureAccess(s,house),"road");
 assert.equal(housingAccess(s).at(-1),"road");
 const disconnected={...s,roadGraph:undefined,roads:[[{x:1000,y:70},{x:1100,y:70}]]};
 assert.equal(structureAccess(disconnected,house),"footpath");
});
test("WORLD-ACCESS-02: inherited paths connect homes without inventing road access",async()=>{
 const {structureAccess}=await import("../simulation.mjs");
 const s=startGame(),house={x:720,y:610};s.houses.push(house);
 s.localLanes=[
  {houseX:660,houseY:530,connectsTo:"road",points:[{x:660,y:530},{x:460,y:454}]},
  {houseX:720,houseY:610,connectsTo:"lane",points:[{x:695,y:590},{x:660,y:530}]}
 ];
 assert.equal(structureAccess(s,house),"road");
 s.localLanes[0].connectsTo="lane";
 assert.equal(structureAccess(s,house),"footpath");
});
