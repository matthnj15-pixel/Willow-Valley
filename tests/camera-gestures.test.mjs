import test from "node:test";
import assert from "node:assert/strict";
import {beginCameraGesture,advanceCameraGesture} from "../camera-gestures.mjs";
const points=(ax,ay,bx,by)=>[{x:ax,y:ay},{x:bx,y:by}];

test("WORLD-CAMERA-01: a parallel two-finger vertical swipe adjusts pitch, not orbit or zoom",()=>{
 const state=beginCameraGesture(points(100,200,260,200));
 assert.equal(advanceCameraGesture(state,points(100,235,260,200)),null,
  "Wait for the second finger's event before deciding it is a twist");
 const frame=advanceCameraGesture(state,points(100,235,260,235));
 assert.equal(frame.kind,"tilt");
 assert.equal(frame.verticalPixels,35);
 const next=advanceCameraGesture(state,points(100,245,260,245));
 assert.equal(next.kind,"tilt");
 assert.equal(next.verticalPixels,10);
});
test("WORLD-CAMERA-02: synchronized sideways dragging pans without changing pitch",()=>{
 const state=beginCameraGesture(points(100,200,260,200));
 const first=advanceCameraGesture(state,points(130,200,260,200));
 assert.equal(first.kind,"navigate");
 const second=advanceCameraGesture(state,points(130,200,290,200));
 assert.equal(second.kind,"navigate");
 assert.equal(second.current.x-second.previous.x,15);
 assert.ok(second.zoomRatio>0);
});
test("WORLD-CAMERA-03: pinch changes zoom independently of translation",()=>{
 const state=beginCameraGesture(points(100,200,260,200));
 const frame=advanceCameraGesture(state,points(75,200,285,200));
 assert.equal(frame.kind,"navigate");
 assert.ok(frame.zoomRatio<1);
 assert.equal(frame.current.x,frame.previous.x);
});
test("WORLD-CAMERA-04: twisting rotates without false pitch transitions",()=>{
 const state=beginCameraGesture(points(100,200,260,200));
 advanceCameraGesture(state,points(100,235,260,200));
 const frame=advanceCameraGesture(state,points(100,235,260,165));
 assert.equal(frame.kind,"navigate");
 assert.ok(Math.abs(frame.angleRadians)>.2);
 assert.equal(frame.current.y,frame.previous.y);
});
test("WORLD-CAMERA-05: gestures stay locked to their established navigation mode",()=>{
 const state=beginCameraGesture(points(100,200,260,200));
 assert.equal(advanceCameraGesture(state,points(140,200,260,200)).kind,"navigate");
 const later=advanceCameraGesture(state,points(140,245,300,245));
 assert.equal(later.kind,"navigate");
 assert.equal(beginCameraGesture([points(0,0,1,0)[0]]),null);
});
