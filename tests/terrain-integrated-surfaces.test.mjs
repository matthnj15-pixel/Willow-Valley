import test from "node:test";
import assert from "node:assert/strict";
import {terrainRibbon,settlementGeometry} from "../game-3d-mesh.mjs";
import {cottageBlueprint} from "../settlement-architecture.mjs";

const world={
 width:400,depth:300,
 sample(x,y){
  const ridge=16*Math.exp(-Math.pow((x-205)/29,2));
  return{height:9+ridge+.022*y,water:null};
 }
};
const vertices=a=>Array.from({length:a.length/9},(_,i)=>({
 x:a[i*9],y:a[i*9+1],z:a[i*9+2],
 r:a[i*9+3],g:a[i*9+4],b:a[i*9+5]
}));
const siteHeight=p=>world.sample(p.x+world.width/2,p.z+world.depth/2).height;

test("WORLD-SURFACE-01: long road samples intermediate hills rather than tunneling through them",()=>{
 const out=[];
 terrainRibbon(out,world,[{x:40,y:140},{x:355,y:140}],24,[.7,.6,.4],1.3);
 const v=vertices(out);
 assert.ok(v.length>180,"Long segments need multiple terrain samples");
 for(const p of v){
  assert.ok(Math.abs(p.y-siteHeight(p)-1.3)<1e-4,
   "A road vertex must match the authoritative local elevation plus clearance");
 }
 const roadPeak=Math.max(...v.map(p=>p.y));
 assert.ok(roadPeak>24,"The ribbon must climb the ridge between its endpoints");
});

test("WORLD-SURFACE-02: cottages remain level and stone foundations meet the slope",()=>{
 const house={x:202,y:135,foundedTurn:0,foundedEra:0,orientation:.3};
 const state={houses:[house],buildings:[],roads:[],zones:[],desirePaths:[]};
 const mesh=settlementGeometry(world,state);
 const v=vertices(mesh.structures);
 const roof=cottageBlueprint(house).roof;
 const roofVertices=v.filter(p=>Math.abs(p.r-roof[0])<1e-5&&
  Math.abs(p.g-roof[1])<1e-5&&Math.abs(p.b-roof[2])<1e-5);
 const heights=[...new Set(roofVertices.map(p=>p.y.toFixed(3)))];
 assert.ok(roofVertices.length>=12);
 assert.equal(heights.length,2,"Eaves and ridge must each have one consistent elevation");
 const foundation=v.filter(p=>Math.abs(p.r-.5)<1e-5&&
  Math.abs(p.g-.47)<1e-5&&Math.abs(p.b-.4)<1e-5);
 assert.ok(foundation.length>=72,"Foundations are subdivided along terrain edges");
 assert.ok(foundation.some(p=>p.y<siteHeight(p)));
 assert.ok(foundation.some(p=>p.y>siteHeight(p)));
});

test("WORLD-SURFACE-03: road handles are low discs and junctions close the pavement",()=>{
 const graph={hubId:1,nodes:[{id:1,x:90,y:130},{id:2,x:205,y:130},
  {id:3,x:250,y:210}],segments:[{id:4,a:1,b:2,control:null},
  {id:5,a:2,b:3,control:null}]};
 const state={roadGraph:graph,houses:[],buildings:[],roads:[],zones:[]};
 const mesh=settlementGeometry(world,state,{mode:"road"});
 assert.ok(mesh.surfaces.length>1000,"Roads should have sampled ribbons and junction fans");
 assert.ok(mesh.guides.length>0);
 for(const p of vertices(mesh.guides)){
  assert.ok(p.y-siteHeight(p)<3.25,"Editor markers should hug the terrain");
  assert.ok(p.y-siteHeight(p)>3.0);
 }
});
