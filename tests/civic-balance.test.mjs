import test from "node:test";
import assert from "node:assert/strict";
import {startGame,advance,validState,immigrationInterval,housingOutlook} from "../simulation.mjs";
import {paintZones,zoneAt} from "../organic-world.mjs";
import {objectives,claimCharter,ensureCivic,fieldCoverage} from "../settlement-play.mjs";

test("BAL-001: resident appeal and morale determine arrival rate",()=>{
 const normal=startGame();
 assert.equal(immigrationInterval(normal),2);
 const fast=startGame();fast.housing.attractiveness=83;
 assert.equal(immigrationInterval(fast),1);
 advance(fast,{events:false});advance(normal,{events:false});
 assert.equal(fast.people,35);
 assert.equal(normal.people,32);
 assert.equal(housingOutlook(fast).homeless,3);
 assert.equal(validState(fast),true);
 const weak=startGame();weak.housing.attractiveness=40;
 assert.equal(immigrationInterval(weak),3);
 weak.happiness=40;assert.equal(immigrationInterval(weak),null);
});
test("BAL-002: charter requires useful agricultural fields, not decorative farmland anywhere",()=>{
 const s=startGame();s.people=38;
 assert.equal(paintZones(s,"farmland",[[{x:110,y:125}]],54).ok,true);
 assert.equal(objectives(s).find(([label])=>label.includes("fields"))[1],false);
 const farm=s.buildings.find(b=>b.type==="farm");
 assert.equal(fieldCoverage(s,farm,zoneAt),0);
 assert.equal(paintZones(s,"farmland",[[{x:530,y:615}]],65).ok,true);
 assert.ok(fieldCoverage(s,farm,zoneAt)>=.08);
 assert.equal(objectives(s).every(([,met])=>met),true);
 assert.equal(claimCharter(s,"commons").ok,true);
 assert.equal(immigrationInterval(s),1);
});
test("BAL-003: market charter requires a connected marketplace rather than a distant structure",()=>{
 const s=startGame();
 s.people=38;
 assert.equal(paintZones(s,"farmland",[[{x:530,y:615}]],65).ok,true);
 assert.equal(claimCharter(s,"enterprise").ok,true);
 s.people=54;s.food=75;s.civic.steadyMonths=2;
 s.buildings.push({type:"market",x:1100,y:800});
 assert.equal(objectives(s).find(([label])=>label.includes("marketplace"))[1],false);
 s.buildings.pop();s.buildings.push({type:"market",x:540,y:420});
 assert.equal(objectives(s).find(([label])=>label.includes("marketplace"))[1],true);
 assert.equal(claimCharter(s,"exchange").ok,true);
 assert.equal(ensureCivic(s).chapter,2);
});
test("BAL-004: surviving turns provide numeric food reserve runway",()=>{
 const s=startGame();for(let i=0;i<13;i++)advance(s,{events:false});
 assert.ok(Number.isFinite(s.civic.ledger.foodReserveMonths));
 assert.ok(s.civic.ledger.foodReserveMonths>=0);
 assert.ok(["Spring","Summer","Autumn","Winter"].includes(s.civic.ledger.season));
 assert.equal(validState(s),true);
});

test("BAL-005: all three chapters unlock sequentially and preserve permanent choices",()=>{
 const s=startGame();
 s.people=38;s.food=90;
 assert.equal(paintZones(s,"farmland",[[{x:530,y:615}]],65).ok,true);
 assert.equal(claimCharter(s,"enterprise").ok,true);
 s.people=54;s.civic.steadyMonths=2;s.food=110;
 s.buildings.push({type:"market",x:540,y:420});
 assert.equal(claimCharter(s,"exchange").ok,true);
 s.people=75;s.civic.steadyMonths=3;s.happiness=85;
 s.buildings.push({type:"plaza",x:690,y:515},{type:"granary",x:800,y:580});
 assert.ok(objectives(s).every(([,met])=>met));
 const before=s.housing.attractiveness;
 assert.equal(claimCharter(s,"neighbors").ok,true);
 assert.equal(ensureCivic(s).chapter,3);
 assert.deepEqual(ensureCivic(s).charters,["enterprise","exchange","neighbors"]);
 assert.equal(s.housing.attractiveness,Math.min(100,before+12));
 assert.equal(validState(s),true);
});
