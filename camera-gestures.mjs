// Shared two-finger gesture recognizer for the playable 3D world and World Builder.
// A coordinated vertical swipe tilts; any horizontal swipe, pinch, or twist
// navigates with a world-anchored pan / zoom / rotation.
const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const pair=points=>{
 const [a,b]=points,dx=b.x-a.x,dy=b.y-a.y;
 return{a:{...a},b:{...b},x:(a.x+b.x)/2,y:(a.y+b.y)/2,
  distance:Math.hypot(dx,dy),angle:Math.atan2(dy,dx)};
};
export function beginCameraGesture(points){
 if(!Array.isArray(points)||points.length!==2)return null;
 const start=pair(points);
 return{start,last:start,mode:"undecided"};
}
export function advanceCameraGesture(gesture,points){
 if(!gesture||!Array.isArray(points)||points.length!==2)return null;
 const now=pair(points),start=gesture.start,previous=gesture.last;
 const totalDX=now.x-start.x,totalDY=now.y-start.y;
 const ax=now.a.x-start.a.x,bx=now.b.x-start.b.x;
 const ay=now.a.y-start.a.y,by=now.b.y-start.b.y;
 const pinch=Math.abs(now.distance/start.distance-1);
 const twist=Math.abs(angleDelta(now.angle,start.angle));
 if(gesture.mode==="undecided"){
  const bothVertical=Math.sign(ay)===Math.sign(by)&&Math.abs(ay)>12&&Math.abs(by)>12&&
   Math.abs(ax)<Math.abs(ay)*.52&&Math.abs(bx)<Math.abs(by)*.52;
  const clearlyVertical=Math.abs(totalDY)>Math.abs(totalDX)*1.6;
  const awaitingOtherFinger=Math.abs(totalDY)>8&&Math.abs(totalDX)<Math.abs(totalDY)*.7&&
   ((Math.abs(ay)>9&&Math.abs(by)<6)||(Math.abs(by)>9&&Math.abs(ay)<6))&&
   Math.abs(totalDY)<55;
  // Pointer events arrive one finger at a time. Don't misclassify a
  // coordinated two-finger tilt as rotation on the first finger's move.
  if(awaitingOtherFinger)return null;
  if(bothVertical&&clearlyVertical&&pinch<.075&&twist<.10)
   gesture.mode="tilt";
  else if(Math.hypot(totalDX,totalDY)>10||pinch>.045||twist>.055)
   gesture.mode="navigate";
  else return null;
 }
 const change=gesture.mode==="tilt"?
  {kind:"tilt",verticalPixels:now.y-previous.y,previous,current:now}:
  {kind:"navigate",zoomRatio:previous.distance/Math.max(16,now.distance),
   angleRadians:angleDelta(now.angle,previous.angle),
   previous,current:now};
 gesture.last=now;
 return change;
}
