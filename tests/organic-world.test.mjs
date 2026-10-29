import test from "node:test";
import assert from "node:assert/strict";
import {startGame,advance,validState,housingOutlook} from "../simulation.mjs";
import {paintZones,validZones,zoneAt,terrainSuitable,elevationAt,slopeAt,candidateParcel,
 findCottageSite,viableLotEstimate} from "../organic-world.mjs";

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
 assert.equal(site.house.parcel.vertices.length,7);
 assert.ok(site.house.orientation>=0);
 assert.equal(site.lane.points.length,3);
 const point={x:site.house.x,y:site.house.y};
 assert.equal(zoneAt(s,point),"residential");
 assert.equal(terrainSuitable(point,15),true);
 const parcel=candidateParcel(point,49);
 assert.equal(new Set(parcel.vertices.map(p=>p.x+":"+p.y)).size,7);
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
