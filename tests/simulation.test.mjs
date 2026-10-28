import test from "node:test";
import assert from "node:assert/strict";
import {startGame,validState,addRoad,placeBuilding,advance,roadCost,advice} from "../simulation.mjs";
test("starter settlement is a valid save",()=>assert.equal(validState(startGame()),true));
test("a road costs money and joins existing infrastructure",()=>{const s=startGame(),before=s.gold,pts=[{x:460,y:454},{x:580,y:475},{x:690,y:520}],cost=roadCost(pts);assert.equal(addRoad(s,pts).ok,true);assert.equal(s.gold,before-cost);});
test("isolated roads are rejected",()=>{const s=startGame();assert.equal(addRoad(s,[{x:30,y:30},{x:80,y:50}]).ok,false);});
test("placing a building consumes materials",()=>{const s=startGame();const old=s.gold;assert.equal(placeBuilding(s,"farm",{x:700,y:610}).ok,true);assert.equal(s.gold,old-120);});
test("turns resolve deterministically",()=>{const a=startGame(),b=startGame();for(let i=0;i<12;i++){assert.deepEqual(advance(a),advance(b));}assert.deepEqual(a,b);assert.equal(validState(a),true);});
test("advisor returns actionable guidance",()=>{const s=startGame();s.food=2;assert.match(advice(s)[0],/Food/);});
