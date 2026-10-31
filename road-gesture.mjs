// Converts a long-press drag into a segment with a deliberate, editable curve.
// The hold location acts as a shaping point when extending from an existing node.
import {segmentDistance,distance} from "./simulation.mjs";
import {quadraticPoint} from "./road-network.mjs";
export const MIN_GESTURE_DISTANCE=25;
function p(x){return{x:x.x,y:x.y};}
export function gestureSegment(start,down,end,trace=[]){
 if(!start||!end||distance(start,end)<MIN_GESTURE_DISTANCE)return null;
 const trail=[down,...trace,end];
 let control=down;
 // When dragging directly from the starting point, estimate the actual
 // finger trajectory's midpoint rather than forcing a distorted curve.
 if(distance(start,down)<12){
  let total=0,segments=[];
  for(let i=1;i<trail.length;i++){const d=distance(trail[i-1],trail[i]);segments.push(d);total+=d;}
  let travelled=0,mid=trail[Math.floor(trail.length/2)];
  for(let i=1;i<trail.length;i++){
   if(travelled+segments[i-1]>=total/2){const t=segments[i-1]?(total/2-travelled)/segments[i-1]:0;mid={x:trail[i-1].x+(trail[i].x-trail[i-1].x)*t,y:trail[i-1].y+(trail[i].y-trail[i-1].y)*t};break;}
   travelled+=segments[i-1];
  }
  control={x:2*mid.x-(start.x+end.x)/2,y:2*mid.y-(start.y+end.y)/2};
 }
 const bowed=segmentDistance(control,start,end)>7;
 const curve=bowed?{x:Math.max(0,Math.min(1200,control.x)),y:Math.max(0,Math.min(900,control.y))}:null;
 return{start:p(start),end:p(end),control:curve};
}

// Anchored radial editor: touch-down is ALWAYS the node. The finger manipulates
// the curve control on the opposite side of that fixed anchor.
// Moving the finger farther increases radius without moving the endpoint.
export function radialCurveGesture(anchor,finger,{strength=1}={}){
 if(!anchor||!finger)return null;
 const dx=finger.x-anchor.x,dy=finger.y-anchor.y;
 const handle={x:Math.max(0,Math.min(1200,anchor.x-strength*dx)),
               y:Math.max(0,Math.min(900,anchor.y-strength*dy))};
 return{anchor:p(anchor),control:handle,radius:Math.hypot(handle.x-anchor.x,handle.y-anchor.y)};
}
// Starting a road with hold-drag sets the outgoing handle for its NEXT edge;
// holding at a later node shapes the incoming edge, without moving that node.
export function anchoredSegment(start,anchor,finger){
 const gesture=radialCurveGesture(anchor,finger);
 if(!gesture)return null;
 if(!start||distance(start,anchor)<12)return{anchor:gesture.anchor,control:gesture.control,pending:true};
 return{start:p(start),end:gesture.anchor,control:gesture.radius>8?gesture.control:null,pending:false};
}

// 3D editing must never use the moving finger's terrain ray as a curve
// control. A projected ground ray moves several world units per screen pixel
// and jumps at slopes, especially with low camera pitches. Convert the screen
// delta at a stable camera scale instead and limit its world-space magnitude.
export function stableRoadDrag(screenDelta,camera,viewportHeight,{sensitivity=.32,maxWorld=75}={}){
 if(!screenDelta||!camera||!Number.isFinite(screenDelta.x)||!Number.isFinite(screenDelta.y))
  return{x:0,y:0};
 const height=Math.max(1,viewportHeight||1);
 const unitsPerPx=Math.min(8,2*Math.max(1,camera.zoom||1)/height);
 const depth=screenDelta.y*unitsPerPx/Math.max(.52,Math.sin(camera.pitch??.86));
 const side=screenDelta.x*unitsPerPx;
 const yaw=camera.yaw??0,cs=Math.cos(yaw),sn=Math.sin(yaw);
 const dx=(side*cs-depth*sn)*sensitivity,dy=(side*sn+depth*cs)*sensitivity;
 const length=Math.hypot(dx,dy),limit=Math.max(0,maxWorld);
 const factor=length>limit&&length>0?limit/length:1;
 return{x:dx*factor,y:dy*factor};
}
// Bend around the chord MIDPOINT, not the endpoint. Removing the drag's
// tangent component avoids a sharp hook or a road that doubles back on itself.
export function roadControlFromDrag(start,end,delta,{width=1200,height=900}={}){
 if(!start||!end||!delta)return null;
 const dx=end.x-start.x,dy=end.y-start.y,length=Math.hypot(dx,dy);
 if(length<8)return null;
 const nx=-dy/length,ny=dx/length;
 const bend=delta.x*nx+delta.y*ny;
 const limit=Math.min(90,length*.65);
 const amount=Math.max(-limit,Math.min(limit,bend));
 if(Math.abs(amount)<4)return null;
 return{x:Math.max(0,Math.min(width,(start.x+end.x)/2+nx*amount)),
  y:Math.max(0,Math.min(height,(start.y+end.y)/2+ny*amount))};
}
