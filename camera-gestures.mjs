// Virtual trackball shared by the playable 3D settlement and World Builder.
// Both fingers hold one invisible sphere. Their midpoint rolls the sphere
// freely in yaw and pitch; twisting adds yaw and pinching zooms concurrently.
// There are deliberately no rotate/tilt modes, classifiers or gesture locks.
const wrapAngle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const pair=points=>{
 const [a,b]=points,dx=b.x-a.x,dy=b.y-a.y;
 return{x:(a.x+b.x)/2,y:(a.y+b.y)/2,
  distance:Math.max(1,Math.hypot(dx,dy)),angle:Math.atan2(dy,dx)};
};
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

// Shoemake-style arcball projection: on the sphere near its center, smoothly
// transitions to a hyperbolic sheet near edges. Dragging never hits a wall.
export function trackballVector(x,y,viewport){
 const w=Math.max(1,viewport.width),h=Math.max(1,viewport.height);
 const size=Math.max(80,Math.min(w,h)*1.20);
 const nx=(x-(viewport.left+w/2))*2/size;
 const ny=((viewport.top+h/2)-y)*2/size;
 const d=nx*nx+ny*ny;
 const z=d<=.5?Math.sqrt(Math.max(0,1-d)):.5/Math.sqrt(d);
 const norm=Math.hypot(nx,ny,z)||1;
 return[nx/norm,ny/norm,z/norm];
}
export function beginCameraGesture(points,viewport={left:0,top:0,width:400,height:400}){
 if(!Array.isArray(points)||points.length!==2)return null;
 const initial=pair(points);
 return{last:initial,viewport:{
  left:viewport.left||0,top:viewport.top||0,
  width:Math.max(1,viewport.width||400),height:Math.max(1,viewport.height||400)}};
}
export function advanceCameraGesture(gesture,points){
 if(!gesture||!Array.isArray(points)||points.length!==2)return null;
 const previous=gesture.last,current=pair(points);
 gesture.last=current;
 const v=trackballVector(previous.x,previous.y,gesture.viewport);
 const w=trackballVector(current.x,current.y,gesture.viewport);
 const cross=[v[1]*w[2]-v[2]*w[1],v[2]*w[0]-v[0]*w[2],
  v[0]*w[1]-v[1]*w[0]];
 const magnitude=Math.hypot(...cross);
 const angle=Math.atan2(magnitude,
  Math.max(-1,Math.min(1,v[0]*w[0]+v[1]*w[1]+v[2]*w[2])));
 const scale=magnitude>1e-9?angle/magnitude:0;
 const twist=wrapAngle(current.angle,previous.angle);
 return{kind:"trackball",
  // "Push" direction: the map moves with the hands, not as if the user
  // were dragging the camera rig in the opposite direction.
  yawDelta:-cross[1]*scale-twist*.78,
  pitchDelta:cross[0]*scale,
  zoomRatio:previous.distance/current.distance,
  previous,current};
}
