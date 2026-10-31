import test from "node:test";
import assert from "node:assert/strict";
import {stableRoadDrag,roadControlFromDrag} from "../road-gesture.mjs";

const screen=(x,y)=>({x,y}),camera={zoom:520,pitch:.86,yaw:.71};
const magnitude=p=>Math.hypot(p.x,p.y);

test("ROAD-3D-FIX-01: touch displacement scales smoothly and remains bounded",()=>{
 const small=stableRoadDrag(screen(20,16),camera,440);
 const medium=stableRoadDrag(screen(95,75),camera,440);
 const far=stableRoadDrag(screen(480,380),camera,440);
 assert.ok(magnitude(small)>0);
 assert.ok(magnitude(small)<magnitude(medium));
 assert.ok(magnitude(medium)<=75.00001);
 assert.ok(magnitude(far)<=75.00001);
 assert.deepEqual(medium,stableRoadDrag(screen(95,75),camera,440));
});
test("ROAD-3D-FIX-02: aggressive zoom, shallow pitch and large drag cannot launch a handle",()=>{
 for(const zoom of [200,500,1600,4000])
  for(const pitch of [.32,.86,1.45]){
   const drag=stableRoadDrag(screen(220,180),{zoom,pitch,yaw:1.1},350);
   assert.ok(Number.isFinite(drag.x)&&Number.isFinite(drag.y));
   assert.ok(magnitude(drag)<=75.00001);
  }
});
test("ROAD-3D-FIX-03: a curve control stays near the chord midpoint and endpoints never move",()=>{
 const start=screen(400,425),end=screen(640,425),before=[{...start},{...end}];
 const control=roadControlFromDrag(start,end,screen(250,400));
 assert.deepEqual([start,end],before);
 assert.ok(control.x>=400&&control.x<=640);
 assert.ok(control.y>425&&control.y<=515);
 assert.deepEqual(roadControlFromDrag(start,end,screen(1000,0)),null,
  "drag parallel to the road must not create a U-turn");
});
test("ROAD-3D-FIX-04: short roads cannot develop extreme backwards hooks",()=>{
 const start=screen(400,400),end=screen(430,400);
 const control=roadControlFromDrag(start,end,screen(0,-2000));
 assert.ok(Math.abs(control.y-400)<=30*.65+.001);
 assert.ok(control.x>=start.x&&control.x<=end.x);
 assert.deepEqual(roadControlFromDrag(start,end,screen(0,0)),null);
});
