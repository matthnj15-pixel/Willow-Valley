import {beginCameraGesture,advanceCameraGesture} from '../camera-gestures.mjs';
// Gallery-only close inspection. Reuse the game's trackball/directions with a
// smaller zoom floor; ordinary town-scale controls remain with the controller.
export function attachInspectionControls(canvas,viewer,world){
 const points=new Map(),limit=Math.max(world.width,world.depth),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));let gesture=null;
 const close=()=>viewer.getCamera().zoom<limit*.08,stop=e=>{e.preventDefault();e.stopImmediatePropagation();};
 const down=e=>{if(!close()&&!points.size)return;stop(e);points.set(e.pointerId,{x:e.clientX,y:e.clientY});try{canvas.setPointerCapture(e.pointerId);}catch{}if(points.size===2)gesture=beginCameraGesture([...points.values()],canvas.getBoundingClientRect());};
 const move=e=>{const last=points.get(e.pointerId);if(!last)return;stop(e);points.set(e.pointerId,{x:e.clientX,y:e.clientY});const v=viewer.getCamera(),rect=canvas.getBoundingClientRect();
  if(points.size===2&&gesture){const change=advanceCameraGesture(gesture,[...points.values()]);viewer.setCamera({...v,yaw:v.yaw+change.yawDelta,pitch:clamp(v.pitch+change.pitchDelta,.32,1.47),zoom:clamp(v.zoom*change.zoomRatio,6,limit*2.4)});}
  else if(points.size===1)viewer.setCamera({...v,yaw:v.yaw-(e.clientX-last.x)/Math.max(120,rect.width)*Math.PI*1.5,pitch:clamp(v.pitch+(e.clientY-last.y)/Math.max(180,rect.height)*1.8,.32,1.47)});
 };
 const up=e=>{if(!points.has(e.pointerId))return;stop(e);points.delete(e.pointerId);if(points.size!==2)gesture=null;};
 const wheel=e=>{stop(e);const v=viewer.getCamera();viewer.setCamera({...v,zoom:clamp(v.zoom*(e.deltaY>0?1.12:1/1.12),6,limit*2.4)});};
 const handlers={pointerdown:down,pointermove:move,pointerup:up,pointercancel:up,lostpointercapture:up,wheel};
 for(const [type,fn] of Object.entries(handlers))canvas.addEventListener(type,fn,{capture:true,passive:false});
 return()=>{for(const [type,fn] of Object.entries(handlers))canvas.removeEventListener(type,fn,true);points.clear();gesture=null;};
}
