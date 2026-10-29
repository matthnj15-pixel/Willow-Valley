import test from "node:test";
import assert from "node:assert/strict";
import {beginCameraGesture,advanceCameraGesture,trackballVector} from "../camera-gestures.mjs";
const viewport={left:0,top:0,width:400,height:400};
const points=(ax,ay,bx,by)=>[{x:ax,y:ay},{x:bx,y:by}];
const start=()=>beginCameraGesture(points(125,200,275,200),viewport);
const roughly=(a,b,tolerance=.035)=>assert.ok(Math.abs(a-b)<tolerance,`Expected ${a} ≈ ${b}`);

test("WORLD-CAMERA-01: invisible sphere projection stays normalized even near the screen edge",()=>{
 for(const [x,y] of [[200,200],[0,0],[500,500],[80,200],[300,260]]){
  const v=trackballVector(x,y,viewport);
  roughly(Math.hypot(...v),1,1e-9);
 }
});

test("WORLD-CAMERA-02: a diagonal two-finger swipe rolls yaw and pitch in the same gesture",()=>{
 const g=start();
 const change=advanceCameraGesture(g,points(160,237,310,237));
 assert.equal(change.kind,"trackball");
 assert.ok(change.yawDelta<-.08,"Horizontal push turns the world");
 assert.ok(change.pitchDelta>.08,"Vertical push tilts at the same instant");
 roughly(change.zoomRatio,1,1e-9);
 const next=advanceCameraGesture(g,points(185,257,335,257));
 assert.ok(next.yawDelta<0&&next.pitchDelta>0);
});

test("WORLD-CAMERA-03: no tilt-vs-rotate mode lock across changing diagonal motions",()=>{
 const g=start();
 const vertical=advanceCameraGesture(g,points(125,240,275,240));
 assert.ok(vertical.pitchDelta>.05);
 const horizontal=advanceCameraGesture(g,points(165,240,315,240));
 assert.ok(horizontal.yawDelta<-.05);
 const diagonal=advanceCameraGesture(g,points(180,255,330,255));
 assert.ok(diagonal.yawDelta<0&&diagonal.pitchDelta>0);
 assert.equal(g.mode,undefined,"The gesture has no classifier mode");
});

test("WORLD-CAMERA-04: a symmetric pinch zooms without a deliberate camera turn",()=>{
 const g=start();
 const first=advanceCameraGesture(g,points(95,200,305,200));
 assert.equal(first.kind,"trackball");
 assert.ok(first.zoomRatio<1);
 roughly(first.yawDelta,0,.01);
 roughly(first.pitchDelta,0,.01);
 const second=advanceCameraGesture(g,points(115,200,285,200));
 assert.ok(second.zoomRatio>1);
});

test("WORLD-CAMERA-05: twisting the two fingers rotates with push-style direction",()=>{
 const g=start();
 const change=advanceCameraGesture(g,points(125,232,275,168));
 assert.ok(change.yawDelta>0);
 roughly(change.pitchDelta,0,.02);
 roughly(change.zoomRatio,1,.09);
});

test("WORLD-CAMERA-06: shifting one finger then the other never locks or jumps",()=>{
 const g=start();
 const first=advanceCameraGesture(g,points(125,223,275,200));
 assert.ok(first&&Number.isFinite(first.pitchDelta));
 const second=advanceCameraGesture(g,points(125,223,275,223));
 assert.ok(second&&Number.isFinite(second.pitchDelta));
 assert.equal(second.kind,"trackball");
 const previous=second.current;
 const idle=advanceCameraGesture(g,points(125,223,275,223));
 assert.deepEqual(idle.current,previous);
 roughly(idle.pitchDelta,0,1e-9);
 roughly(idle.yawDelta,0,1e-9);
 assert.equal(beginCameraGesture([points(0,0,1,0)[0]],viewport),null);
});
