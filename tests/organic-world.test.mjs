import test from "node:test";
import assert from "node:assert/strict";
import {startGame,advance,validState,housingOutlook} from "../simulation.mjs";
import {paintZones,validZones,zoneAt,terrainSuitable,elevationAt,slopeAt,candidateParcel,
 findCottageSite,viableLotEstimate,routeFootpath,canWalkAt} from "../organic-world.mjs";

const zone=[{x:685,y:419},{x:705,y:425},{x:728,y:421}];
test("WORLD-01: distinct paint categories commit, persist and erase as explicit actions",()=>{
 const s=startGame();
 assert.equal(paintZones(s,"residential",[zone],54).ok,true);
 assert.equal(validZones(s.zones),true);
 assert.equal(zoneAt(s,{x:705,y:425}),"residential");
 const other=paintZones(s,"preserve",[[{x:705,y:425}]],54);
 assert.equal(other.ok,false);
 const json=JSON.parse(JSON.stringify(s));assert.equal(validState(json),true);
 assert.equal(paintZones(s,"erase",[[{x:705,y:425}]],54).ok,true);
 assert.equal(s.zones.length,0);
});
test("WORLD-02: topography rejects river banks and unsuitable land, but permits some rolling land",()=>{
 assert.equal(terrainSuitable({x:880,y:450}),false);
 assert.equal(terrainSuitable({x:705,y:425}),true);
 assert.ok(Number.isFinite(elevationAt(705,425)));
 assert.ok(Number.isFinite(slopeAt(705,425)));
});
test("WORLD-03: cottage generator gives complete irregular polygons only in painted residential zones",()=>{
 const s=startGame();assert.equal(findCottageSite(s),null);
 paintZones(s,"residential",[zone],54);
 const site=findCottageSite(s);assert.ok(site,"expected a feasible painted site");
 assert.ok(site.house.parcel.vertices.length>=5&&site.house.parcel.vertices.length<=8);
 assert.ok(site.house.orientation>=0);
 assert.ok(site.lane.points.length>=2);
 const point={x:site.house.x,y:site.house.y};
 assert.equal(zoneAt(s,point),"residential");
 assert.equal(terrainSuitable(point,15),true);
 const parcel=candidateParcel(point,49);
 assert.equal(new Set(parcel.vertices.map(p=>p.x+":"+p.y)).size,parcel.vertices.length);
});
test("WORLD-04: homes do not appear without demand or painted plots",()=>{
 const s=startGame();advance(s);assert.equal(s.houses.length,4);
 advance(s);assert.equal(s.houses.length,4);
 assert.equal(housingOutlook(s).homeless,3);
 assert.equal(housingOutlook(s).homelessHouseholds,1);
});
test("WORLD-05: a homeless family leaves after two FURTHER monthly turns",()=>{
 const s=startGame();
 advance(s);advance(s); // turn 2: arrival, unsheltered age 0
 assert.equal(s.housing.pending[0].wait,0);
 advance(s);assert.equal(s.housing.pending[0].wait,1);
 const previous=s.housing.attractiveness;
 const notice=advance(s); // turn 4: first group exits; another may arrive
 assert.ok(notice.notices.some(n=>n.includes("left after two further months")));
 assert.equal(s.housing.attractiveness,previous-6);
 assert.equal(s.housing.pending.filter(g=>g.wait>0).length,0);
});
test("WORLD-06: painted suitable residential land permits demand-led cottage growth",()=>{
 const s=startGame();paintZones(s,"residential",[zone],54);
 advance(s);assert.equal(s.houses.length,4);
 advance(s);
 assert.ok(s.houses.length>4,"expected a cottage on zoned land");
 assert.equal(housingOutlook(s).homeless,0);
 assert.ok(s.houses.at(-1).parcel.vertices.length>=5);
 assert.ok(s.localLanes.length>=1);
 assert.ok(viableLotEstimate(s,2)>=0);
 assert.equal(validState(s),true);
});
test("WORLD-07: same zone and action stream are deterministic, old unzoned saves remain valid",()=>{
 const a=startGame(),b=startGame();
 paintZones(a,"residential",[zone],54);paintZones(b,"residential",[zone],54);
 for(let t=0;t<5;t++){assert.deepEqual(advance(a),advance(b));assert.deepEqual(a,b);}
 const old=startGame();delete old.zones;delete old.localLanes;delete old.housing;
 assert.equal(validState(old),true);advance(old);assert.equal(validState(old),true);
});

test("WORLD-19: founding hamlet candidates do not repeat a uniform lot template",()=>{
 const plots=Array.from({length:35},(_,i)=>candidateParcel({x:400,y:430},i+100));
 const sizes=new Set(plots.map(p=>Math.round(p.rx)+":"+Math.round(p.ry)));
 const orientations=new Set(plots.map(p=>Math.round(p.orientation*10)));
 const polygons=new Set(plots.map(p=>p.vertices.length));
 assert.ok(sizes.size>=15,"cottages should have visibly varied parcel dimensions");
 assert.ok(orientations.size>=12,"cottages should face different directions");
 assert.ok(polygons.size>=3,"organic parcels should not all share the same polygon template");
});
test("WORLD-09: resident footpath detours around a built workshop and its clearance",()=>{
 const s=startGame();
 s.houses=[];s.buildings=[{type:"smith",x:420,y:425}];
 const from={x:330,y:425},to={x:530,y:425};
 assert.equal(canWalkAt(s,from),true);assert.equal(canWalkAt(s,to),true);
 assert.equal(canWalkAt(s,{x:420,y:425}),false);
 const route=routeFootpath(s,from,to);
 assert.ok(route&&route.length>=3,"route should curve around the occupied workshop");
 assert.ok(route.some(q=>Math.abs(q.y-425)>25),"route should bypass the building, not clip it");
 for(let i=1;i<route.length;i++){
  const a=route[i-1],b=route[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/5);
  for(let j=0;j<=steps;j++){
   const p={x:a.x+(b.x-a.x)*j/steps,y:a.y+(b.y-a.y)*j/steps};
   assert.equal(canWalkAt(s,p),true,"the whole lane must be traversable");
  }
 }
});
test("WORLD-09: nature preserve is not silently cut through by a desire route",()=>{
 const s=startGame();s.houses=[];s.buildings=[];
 assert.equal(paintZones(s,"preserve",[[{x:420,y:425}]],25).ok,true);
 const start={x:350,y:425},end={x:510,y:425};
 const route=routeFootpath(s,start,end);
 assert.ok(route&&route.length>=3,"route should find an alternate safe path");
 for(let i=1;i<route.length;i++){
  const a=route[i-1],b=route[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/5);
  for(let j=0;j<=steps;j++){
   const p={x:a.x+(b.x-a.x)*j/steps,y:a.y+(b.y-a.y)*j/steps};
   assert.notEqual(zoneAt(s,p),"preserve");
  }
 }
});
