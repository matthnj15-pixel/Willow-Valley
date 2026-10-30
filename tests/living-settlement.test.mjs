import test from "node:test";
import assert from "node:assert/strict";
import {startGame,advance,placeBuilding,validState} from "../simulation.mjs";
import {paintZones} from "../organic-world.mjs";
import {ensureCivic,objectives,claimCharter,setPolicy,trade,pendingPetition,answerPetition,fieldCoverage} from "../settlement-play.mjs";

test("GAME-001: legacy save migrates without resetting houses or roads",()=>{
 const game=startGame(),original=structuredClone(game.houses);delete game.civic;
 assert.equal(validState(game),true);
 advance(game);
 assert.deepEqual(game.houses.slice(0,original.length),original);
 assert.equal(validState(game),true);
 assert.equal(ensureCivic(game).chapter,0);
});
test("GAME-002: farmland improves yield of a nearby farm",()=>{
 const s=startGame(),farm=s.buildings.find(b=>b.type==="farm");
 const old=fieldCoverage(s,farm,()=>null);
 assert.equal(old,0);
 assert.equal(paintZones(s,"farmland",[[{x:530,y:620},{x:580,y:610}]],65).ok,true);
 const {zoneAt}=await import("../organic-world.mjs");
 assert.ok(fieldCoverage(s,farm,zoneAt)>old);
 const copy=startGame();const farmed=advance(s,{events:false}),unpainted=advance(copy,{events:false});
 assert.ok(farmed.foodProduction>unpainted.foodProduction);
});
test("GAME-003: taxes, rations and labor choices persist and are rate-limited",()=>{
 const s=startGame();
 assert.equal(setPolicy(s,"rations","careful").ok,true);
 assert.equal(setPolicy(s,"rations","generous").ok,false);
 assert.equal(setPolicy(s,"tax","high").ok,true);
 assert.equal(setPolicy(s,"labor","food").ok,true);
 const first=advance(s),second=advance(startGame());
 assert.ok(first.foodRequired<second.foodRequired);
 assert.ok(first.balance>second.balance);
 assert.ok(s.happiness<76);
 assert.equal(validState(s),true);
});
test("GAME-004: trading is limited to one deal per month and cannot overdraw",()=>{
 const s=startGame(),gold=s.gold;
 assert.equal(trade(s,"buyFood").ok,true);
 assert.equal(s.food,98);assert.equal(s.gold,gold-86);
 assert.equal(trade(s,"buyWood").ok,false);
 advance(s);assert.equal(trade(s,"buyWood").ok,true);
 assert.equal(validState(s),true);
});
test("GAME-005: charter requires goals and yields an exclusive permanent specialization",()=>{
 const s=startGame();
 assert.equal(claimCharter(s,"enterprise").ok,false);
 s.people=38;s.food=65;
 assert.equal(paintZones(s,"farmland",[[{x:530,y:615}]],54).ok,true);
 assert.ok(objectives(s).every(x=>x[1]));
 assert.equal(claimCharter(s,"enterprise").ok,true);
 assert.equal(ensureCivic(s).chapter,1);
 assert.equal(ensureCivic(s).charters.length,1);
 assert.equal(claimCharter(s,"commons").ok,false);
 assert.equal(ensureCivic(s).charters.includes("enterprise"),true);
 assert.equal(validState(s),true);
});
test("GAME-006: marketplace needs a charter and commercial zoning",()=>{
 const s=startGame(),p={x:700,y:620};
 assert.match(placeBuilding(s,"market",p).reason,/charter/);
 s.civic.chapter=1;
 assert.match(placeBuilding(s,"market",p).reason,/Commercial/);
 assert.equal(paintZones(s,"commercial",[[p]],55).ok,true);
 assert.equal(placeBuilding(s,"market",p).ok,true);
 assert.equal(validState(s),true);
});
test("GAME-007: petitions wait for a decision, apply costs, and cannot repeat",()=>{
 const s=startGame();s.turn=4;
 assert.equal(pendingPetition(s)?.id,"travelers");
 const before=s.gold;
 assert.equal(answerPetition(s,"welcome").ok,true);
 assert.equal(s.gold,before-25);
 assert.equal(pendingPetition(s),null);
 assert.equal(answerPetition(s,"toll").ok,false);
});
test("GAME-008: 36 deterministic turns retain saves and reveal seasonal shortages",()=>{
 const a=startGame(),b=startGame();
 for(const state of [a,b]){assert.equal(paintZones(state,"farmland",[[{x:530,y:620}]],65).ok,true);}
 let winter=null;for(let i=0;i<36;i++){
  const ra=advance(a),rb=advance(b);
  assert.deepEqual(ra,rb);
  if(a.civic.ledger.season==="Winter")winter=a.civic.ledger.foodProduction;
 }
 assert.ok(Number.isFinite(winter));
 assert.deepEqual(a,b);
 assert.equal(validState(a),true);
 assert.equal(a.turn,36);
});
