import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleRoadAlignment,validateRoadAlignment} from '../road-surface.mjs';
import {startWorldGame,generatedWorld,reshapeRoadSegment} from '../simulation.mjs';
const world={width:400,depth:300,sample:(x,y)=>({height:0,water:y>150?10:null}),slope:()=>0};
const a={x:40,y:100},b={x:360,y:100};
test('authored curve crossing water is rejected even when its endpoint chord is dry',()=>{
 assert.equal(validateRoadAlignment(world,a,null,b).ok,true);
 const curve=validateRoadAlignment(world,a,{x:200,y:280},b);
 assert.equal(curve.ok,false);assert.match(curve.reason,/water/);
 assert.ok(sampleRoadAlignment(a,{x:200,y:280},b).length>50);
});
test('shoulder water and excessive grades reject safely, including degenerate anchors',()=>{
 assert.equal(validateRoadAlignment(world,{x:40,y:140},null,{x:360,y:140}).ok,false);
 const steep={...world,sample:()=>({height:0,water:null}),slope:()=>2};
 assert.equal(validateRoadAlignment(steep,a,null,b).ok,false);
 assert.equal(validateRoadAlignment({...steep,slope:()=>0,sample:x=>({height:x*2,water:null})},a,null,b).ok,false);
 assert.equal(validateRoadAlignment(world,a,null,a).ok,true);
 assert.equal(validateRoadAlignment(null,a,null,b).ok,true,'legacy maps keep their contract');
});
test('unsafe reshape leaves graph, road lines, treasury, logs and save data untouched',()=>{
 const state=startWorldGame({seed:'SAFETY-56',size:'small',lakes:2,rivers:1});
 const terrain=generatedWorld(state),edge=state.roadGraph.segments[0];
 let wet=null;
 for(let y=30;y<terrain.depth&&!wet;y+=20)for(let x=30;x<terrain.width;x+=20)
  if(terrain.sample(x,y).water!==null){wet={x,y};break;}
 assert.ok(wet,'fixture needs water');
 // The control that puts the curve midpoint at the wet site.
 const a=state.roadGraph.nodes.find(n=>n.id===edge.a),b=state.roadGraph.nodes.find(n=>n.id===edge.b);
 const control={x:2*wet.x-(a.x+b.x)/2,y:2*wet.y-(a.y+b.y)/2};
 const before=structuredClone(state);
 const result=reshapeRoadSegment(state,edge.id,control);
 assert.equal(result.ok,false);assert.deepEqual(state,before);
});
