import test from 'node:test';
import assert from 'node:assert/strict';
import {roadJunctionPolygons} from '../road-junctions.mjs';
const graph={nodes:[{id:1,x:200,y:150},{id:2,x:40,y:150},{id:3,x:360,y:150},{id:4,x:200,y:280}],
 segments:[{id:5,a:1,b:2,control:null},{id:6,a:1,b:3,control:null},{id:7,a:1,b:4,control:null}]};
function inside(p,poly){
 const signs=poly.map((a,i)=>{const b=poly[(i+1)%poly.length];return (b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);});
 return signs.every(n=>n>1e-6)||signs.every(n=>n< -1e-6);
}
test('three-way junction has one filled polygon and trimmed, non-overlapping road mouths',()=>{
 const {pavement}=roadJunctionPolygons(graph);
 assert.equal(pavement.filter(poly=>inside({x:200.1,y:150.1},poly)).length,1);
 for(let x=160.3;x<240;x+=1.7)for(let y=115.7;y<190;y+=1.7){
  const coverage=pavement.filter(poly=>inside({x,y},poly)).length;
  assert.ok(coverage<=1,`overlap at ${x},${y}`);
  if(Math.abs(x-200)<10&&y>150)assert.equal(coverage,1,'branch remains continuous');
 }
});
test('curved and short edges produce finite deterministic geometry without mutating saves',()=>{
 const fixture=structuredClone(graph);fixture.segments[2].control={x:280,y:160};
 fixture.nodes[2].x=225;
 const before=structuredClone(fixture),mesh=roadJunctionPolygons(fixture);
 for(const polygon of [...mesh.shoulders,...mesh.pavement])for(const p of polygon)
  assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
 assert.deepEqual(mesh,roadJunctionPolygons(fixture));assert.deepEqual(fixture,before);
});
