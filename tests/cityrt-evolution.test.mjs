import test from "node:test";
import assert from "node:assert/strict";
import {startGame,advance,validState} from "../simulation.mjs";
import {paintZones,findCottageSite} from "../organic-world.mjs";
import {cottageBlueprint} from "../settlement-architecture.mjs";
import {beforeMonth,monthHighlights} from "../turn-highlights.mjs";

test("CITYRT-01: historic house appearance is deterministic and road-facing",()=>{
 const house={x:400,y:420,orientation:1.5,foundedTurn:2,foundedEra:0,
  entrance:{x:420,y:420}};
 const a=cottageBlueprint(house);
 assert.deepEqual(a,cottageBlueprint(structuredClone(house)));
 assert.ok(Math.abs(a.orientation+Math.PI/2)<.01);
 assert.ok(a.width>=17&&a.width<=25);
 assert.ok(a.depth>=19&&a.depth<=26);
 assert.notDeepEqual(a,cottageBlueprint({...house,foundedEra:3}));
});
test("CITYRT-02: multiple irregular homes have distinct historical materials and footprints",()=>{
 const styles=Array.from({length:30},(_,i)=>cottageBlueprint({x:250+i*18,y:350+i*7,foundedTurn:i,foundedEra:i%3}));
 assert.ok(new Set(styles.map(s=>s.width+":"+s.depth)).size>10);
 assert.ok(new Set(styles.map(s=>s.roof.join(","))).size>=4);
});
test("CITYRT-03: real demand creates a dwelling with immutable founding-era metadata",()=>{
 const s=startGame();
 assert.equal(paintZones(s,"residential",[[{x:685,y:419},{x:705,y:425},{x:728,y:421}]],54).ok,true);
 const parcel=findCottageSite(s);assert.ok(parcel);
 assert.equal(parcel.house.foundedEra,0);
 assert.ok(parcel.house.entrance);
 advance(s);advance(s);
 assert.ok(s.houses.length>4);
 assert.equal(s.houses.at(-1).foundedEra,0);
 assert.ok(validState(JSON.parse(JSON.stringify(s))));
});
test("CITYRT-04: monthly milestones follow simulated changes, with no render-time changes",()=>{
 const s=startGame(),start=beforeMonth(s);
 assert.deepEqual(monthHighlights(s,start,{}).map(e=>e.kind),["steady"]);
 assert.ok(monthHighlights({...s,houses:[...s.houses,{x:650,y:400}],turn:1},start,{}).some(e=>e.kind==="home"));
 const old=structuredClone(s);
 advance(s);assert.equal(s.turnHighlights[0].turn,s.turn);
 assert.ok(s.turnHighlights.length>0);
 assert.ok(validState(s));
 const s2=structuredClone(old);advance(s2);
 assert.deepEqual(s.turnHighlights,s2.turnHighlights);
});
