import test from 'node:test';
import assert from 'node:assert/strict';
import {createTerrainSurface} from '../terrain-surface.mjs';
import {createWorldMesh} from '../world-gen.mjs';
import {terrainRibbon} from '../game-3d-mesh.mjs';
import {resolveFoundation} from '../foundation-system.mjs';
const world={width:240,depth:180,options:{size:'small'},slope:()=>0,
 sample:(x,y)=>({height:14*Math.sin(x/21)*Math.cos(y/18)+x*.02,water:null})};
const surface=createTerrainSurface(world,12,9);
const close=(a,b)=>assert.ok(Math.abs(a-b)<2e-4,`${a} != ${b}`);

test('contact agrees with the actual rendered terrain triangles, including diagonal halves',()=>{
 const mesh=createWorldMesh(world,12,9,{trees:false}).ground;
 for(let i=0;i<mesh.length;i+=27){
  for(const weights of [[.2,.3,.5],[.6,.3,.1]]){
   const p=[0,0,0];
   weights.forEach((w,k)=>{for(let axis=0;axis<3;axis++)p[axis]+=mesh[i+k*9+axis]*w;});
   close(surface.sample(p[0]+120,p[2]+90).height,p[1]);
  }
 }
 assert.ok(Math.abs(surface.sample(33,22).height-world.sample(33,22).height)>.1,
  'fixture must expose analytic/rendered disagreement');
});

test('straight and curved ribbons conform at triangle interiors, not only sampled corners',()=>{
 for(const points of [[{x:12,y:85},{x:225,y:85}],
  [{x:10,y:20},{x:80,y:40},{x:145,y:120},{x:225,y:145}]]){
  const mesh=[];
  terrainRibbon(mesh,surface,points,24,[.7,.6,.4],.4);
  for(let i=0;i<mesh.length;i+=27){
   for(const weights of [[1/3,1/3,1/3],[.1,.7,.2]]){
    const p=[0,0,0];
    weights.forEach((w,k)=>{for(let axis=0;axis<3;axis++)p[axis]+=mesh[i+k*9+axis]*w;});
    close(p[1],surface.sample(p[0]+120,p[2]+90).height+.4);
   }
   assert.ok(mesh[i+7]>0,'surface normal points up in either road direction');
  }
 }
});

test('perimeter and interior ridges raise the whole floor and walls follow each terrain crease',()=>{
 const ridge={width:100,depth:100,sample:(x,y)=>({height:20*Math.max(0,1-Math.abs(x-50)/10),water:null})};
 const contact=createTerrainSurface(ridge,10,10);
 const seat=resolveFoundation(contact,{x:50,y:50},40,40);
 close(seat.floor,20.8);
 assert.ok(seat.perimeter.length>8);
 for(let i=0;i<seat.perimeter.length;i++){
  const a=seat.perimeter[i],b=seat.perimeter[(i+1)%seat.perimeter.length];
  close((a.height+b.height)/2,contact.sample((a.x+b.x)/2,(a.y+b.y)/2).height);
  assert.ok(seat.floor>a.height);
 }
 const flooded=resolveFoundation({...contact,sample:(x,y)=>({...contact.sample(x,y),water:30})},{x:50,y:50},40,40);
 assert.equal(flooded.flooded,true);
});

test('surface adapter is deterministic and leaves the analytic world untouched',()=>{
 const before=world.sample(22,31);
 const footprint=[{x:10,y:10},{x:90,y:10},{x:90,y:90},{x:10,y:90}];
 assert.deepEqual(surface.drapePolygon(footprint),createTerrainSurface(world,12,9).drapePolygon(footprint));
 assert.deepEqual(world.sample(22,31),before);
 assert.equal(world.drapePolygon,undefined);
});
