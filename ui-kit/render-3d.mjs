import {createWorldMesh,clamp} from "../world-gen.mjs";
import {settlementGeometry} from "../game-3d-mesh.mjs";
import {beginCameraGesture,advanceCameraGesture} from "../camera-gestures.mjs";
import {fetchKenneyModel,instantiateKenney,instantiateKenneyTerrain,kenneyLandscapePalette} from "./kenney-models.mjs";

// Native WebGL terrain and actual Kenney CC0 asset meshes.
const VERTEX=[
 "attribute vec3 aPosition; attribute vec3 aColor; attribute vec3 aNormal;",
 "uniform vec3 uFocus; uniform float uYaw; uniform float uPitch;",
 "uniform float uZoom; uniform float uAspect;",
 "varying vec3 vColor; varying float vLight; varying vec3 vWorld;",
 "void main(){",
 " vec3 p=aPosition-uFocus; vWorld=aPosition;",
 " float co=cos(uYaw),si=sin(uYaw);",
 " float xx=co*p.x+si*p.z;",
 " float zz=-si*p.x+co*p.z;",
 " float yy=cos(uPitch)*p.y-sin(uPitch)*zz;",
 " float depth=sin(uPitch)*p.y+cos(uPitch)*zz;",
 " gl_Position=vec4(xx/(uZoom*uAspect),yy/uZoom,-depth/2700.0,1.0);",
 " vec3 sun=normalize(vec3(-0.40,0.86,0.25));",
 " vLight=0.70+0.30*max(0.0,dot(normalize(aNormal),sun));",
 " vColor=aColor;",
 "}"
].join("\n");
const FRAGMENT=[
 "precision mediump float; varying vec3 vColor; varying float vLight;",
 "varying vec3 vWorld; uniform float uWater; uniform float uOpacity;",
 "void main(){",
 " vec3 color=vColor*vLight;",
 " if(uWater>0.5){",
 "   // Subtle sunlight glints across calm water; no saturated cyan or",
 "   // time-dependent noise that would shimmer while the camera moves.",
 "   float wave=sin(vWorld.x*0.105+vWorld.z*0.052)*",
 "              sin(vWorld.z*0.089-vWorld.x*0.036);",
 "   float glint=pow(max(0.0,wave),5.0)*0.085;",
 "   color+=vec3(glint*0.64,glint*0.88,glint);",
 " }",
 " gl_FragColor=vec4(clamp(color,0.0,1.0),uOpacity);",
 "}"
].join("\n");
function makeShader(gl,type,source){
 const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
 if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))
  throw new Error(gl.getShaderInfoLog(s)||"Shader error");
 return s;
}
function makeProgram(gl){
 const p=gl.createProgram();
 gl.attachShader(p,makeShader(gl,gl.VERTEX_SHADER,VERTEX));
 gl.attachShader(p,makeShader(gl,gl.FRAGMENT_SHADER,FRAGMENT));
 gl.linkProgram(p);
 if(!gl.getProgramParameter(p,gl.LINK_STATUS))
  throw new Error(gl.getProgramInfoLog(p)||"3D unavailable");
 return p;
}
export function mountWorld3D(canvas,initialWorld,{
  onAssets=()=>{},onCamera=()=>{},onReady=()=>{},onError=()=>{},
  showReference=false,interactive=true,quality="standard"
 }={}){
 const gl=canvas.getContext("webgl",{antialias:true,alpha:false,depth:true,
  powerPreference:"low-power",preserveDrawingBuffer:false});
 if(!gl)throw new Error("3D preview requires WebGL support in your browser.");
 const program=makeProgram(gl);
 const loc={
  position:gl.getAttribLocation(program,"aPosition"),
  color:gl.getAttribLocation(program,"aColor"),
  normal:gl.getAttribLocation(program,"aNormal"),
  focus:gl.getUniformLocation(program,"uFocus"),
  yaw:gl.getUniformLocation(program,"uYaw"),
  pitch:gl.getUniformLocation(program,"uPitch"),
  zoom:gl.getUniformLocation(program,"uZoom"),
  aspect:gl.getUniformLocation(program,"uAspect"),
  water:gl.getUniformLocation(program,"uWater"),
  opacity:gl.getUniformLocation(program,"uOpacity")
 };
 const buffers=Array.from({length:9},()=>gl.createBuffer());
 const kenney={},kitNames=["oak","pine","birch","rock","tower","ground","waterTile","bank","cliff","beach"];
 let loadedAssets=0,showcase=showReference,disposed=false,firstDraw=false;
 const lite=quality==="lite",gameplay=quality==="game"||lite;
 let counts=[0,0,0,0,0,0,0,0,0],world=initialWorld;
 let settlement=null,settlementDraft=null,settlementZoneStrokes=[],settlementZoneType="residential",settlementRadius=54;
 let settlementEdits=null,settlementMode="explore",settlementLiveCurve=null,settlementLiveGesture=null,settlementPendingControl=null;
 const camera={yaw:.71,pitch:.86,zoom:650,focusX:0,focusZ:0};
 const pointers=new Map();
 let gesture=null,frame=0;
 function resetCamera(){
  camera.yaw=.71;camera.pitch=.86;camera.focusX=0;camera.focusZ=0;
  const aspect=Math.max(.4,canvas.getBoundingClientRect().width/
   Math.max(1,canvas.getBoundingClientRect().height));
  camera.zoom=Math.max(world.width/aspect,world.depth)*.71;
  render();
 }
 function upload(newWorld,reset=true){
  world=newWorld;
  // The buildable terrain grows with the map size; preview geometry grows
  // modestly to retain recognizable rivers and ridges without multiplying
  // mobile GPU work by four.
  const resolution=lite?[48,36]:gameplay?
   ({small:[62,46],medium:[76,56],large:[88,66]}[world.options.size]||[76,56]):
   ({small:[96,72],medium:[112,84],large:[128,96]}[world.options.size]||[112,84]);
  const geometry=createWorldMesh(world,...resolution,{
   trees:!["oak","pine","birch"].some(key=>kenney[key]),
   palette:kenneyLandscapePalette(kenney),
   treeLimit:lite?95:gameplay?300:650
  });
  gl.bindBuffer(gl.ARRAY_BUFFER,buffers[0]);
  gl.bufferData(gl.ARRAY_BUFFER,geometry.ground,gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER,buffers[1]);
  gl.bufferData(gl.ARRAY_BUFFER,geometry.water,gl.STATIC_DRAW);
  counts=[geometry.ground.length/9,geometry.water.length/9,0,0,0,0,0,0,0];
  updateKenney();
  if(settlement)updateSettlement();
  if(reset)resetCamera();else render();
 }
 function updateKenney(){
  if(!loadedAssets||disposed)return;
  const props=instantiateKenney(world,kenney,{
   showReference:showcase,maxTrees:gameplay?260:650
  });
  const terrain=instantiateKenneyTerrain(world,kenney,{
   density:gameplay?.32:1
  });
  for(const [index,data] of [[2,props.vertices],[3,terrain.land],[4,terrain.water]]){
   gl.bindBuffer(gl.ARRAY_BUFFER,buffers[index]);
   gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
   counts[index]=data.length/9;
  }
  render();
 }
 async function loadModels(){
  if(lite)return;
  const results=await Promise.allSettled(kitNames.map(key=>fetchKenneyModel(key)));
  if(disposed)return;
  results.forEach((r,i)=>{if(r.status==="fulfilled"){kenney[kitNames[i]]=r.value;loadedAssets++;}});
  if(loadedAssets)try{upload(world,false);}
  catch(error){onError(error);}
  onAssets({loaded:loadedAssets,total:kitNames.length,
   treeModels:["oak","pine","birch"].filter(k=>kenney[k]).length,
   reference:!!kenney.tower,
   terrain:!!kenney.ground,river:!!kenney.waterTile,bank:!!kenney.bank,
   online:loadedAssets>0});
 }
 function drawBuffer(buffer,count,isWater=false,opacity=1){
  if(!count)return;
  gl.uniform1f(loc.water,isWater?1:0);
  gl.uniform1f(loc.opacity,opacity);
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  for(const [location,offset] of [
   [loc.position,0],[loc.color,3],[loc.normal,6]]){
   gl.enableVertexAttribArray(location);
   gl.vertexAttribPointer(location,3,gl.FLOAT,false,36,offset*4);
  }
  gl.drawArrays(gl.TRIANGLES,0,count);
 }
 function draw(){
  frame=0;
  try{
  const rect=canvas.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  const density=Math.min(window.devicePixelRatio||1,1.75);
  const width=Math.round(rect.width*density),height=Math.round(rect.height*density);
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  gl.viewport(0,0,width,height);
  gl.clearColor(.71,.80,.74,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(program);
  gl.uniform3f(loc.focus,camera.focusX,17,camera.focusZ);
  gl.uniform1f(loc.yaw,camera.yaw);gl.uniform1f(loc.pitch,camera.pitch);
  gl.uniform1f(loc.zoom,camera.zoom);
  gl.uniform1f(loc.aspect,Math.max(.1,width/height));
  drawBuffer(buffers[0],counts[0]);drawBuffer(buffers[3],counts[3]);
  drawBuffer(buffers[1],counts[1],true);drawBuffer(buffers[4],counts[4],true);
  drawBuffer(buffers[2],counts[2]);
  drawBuffer(buffers[5],counts[5]);
  drawBuffer(buffers[6],counts[6],false,.52);
  drawBuffer(buffers[7],counts[7]);
  gl.disable(gl.DEPTH_TEST);
  drawBuffer(buffers[8],counts[8]);
  gl.enable(gl.DEPTH_TEST);
  if(!firstDraw){firstDraw=true;onReady();}
  }catch(error){onError(error);}
 }
 function render(){
  onCamera({...camera});
  if(!frame)frame=requestAnimationFrame(draw);
 }
 function zoomBy(factor){
  camera.zoom=clamp(camera.zoom*factor,Math.max(world.width,world.depth)*.08,
   Math.max(world.width,world.depth)*2.4);
  render();
 }
function updateSettlement(){
 if(!settlement)return;
 const data=settlementGeometry(world,settlement,{draft:settlementDraft,
  zoneStrokes:settlementZoneStrokes,zoneType:settlementZoneType,zoneRadius:settlementRadius,
  zoneEdits:settlementEdits,mode:settlementMode,liveCurve:settlementLiveCurve,
  touchFocus:settlementTouchFocus,
  liveGesture:settlementLiveGesture,pendingControl:settlementPendingControl});
 for(const [index,vertices] of [[5,data.surfaces],[6,data.zones],[7,data.structures],[8,data.guides]]){
  gl.bindBuffer(gl.ARRAY_BUFFER,buffers[index]);
  gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.DYNAMIC_DRAW);
  counts[index]=vertices.length/9;
 }
 // Read-only UAT diagnostics for touch editing. Never persisted to a save.
 canvas.dataset.roadGuideTriangles=String(data.counts.guideTriangles||0);
 canvas.dataset.pendingZoning=String(settlementEdits?.length||0);
 render();
}
function screenToWorld(clientX,clientY){
 const rect=canvas.getBoundingClientRect();
 if(rect.width<1||rect.height<1)return null;
 const sx=(clientX-rect.left)/rect.width*2-1,sy=1-(clientY-rect.top)/rect.height*2;
 const xx=sx*camera.zoom*rect.width/rect.height,yy=sy*camera.zoom;
 const cs=Math.cos(camera.yaw),sn=Math.sin(camera.yaw);
 let depth=(Math.cos(camera.pitch)*(15-17)-yy)/Math.max(.2,Math.sin(camera.pitch));
 let x=camera.focusX+xx*cs-depth*sn,z=camera.focusZ+xx*sn+depth*cs;
 for(let i=0;i<7;i++){
  const ground=world.sample(x+world.width/2,z+world.depth/2).height;
  depth=(Math.cos(camera.pitch)*(ground-17)-yy)/Math.max(.2,Math.sin(camera.pitch));
  x=camera.focusX+xx*cs-depth*sn;
  z=camera.focusZ+xx*sn+depth*cs;
 }
 return{x:x+world.width/2,y:z+world.depth/2};
}
function focusOn(x,z,zoom=null){
 camera.focusX=clamp(x-world.width/2,-world.width/2,world.width/2);
 camera.focusZ=clamp(z-world.depth/2,-world.depth/2,world.depth/2);
 if(zoom!==null)camera.zoom=clamp(zoom,Math.max(world.width,world.depth)*.08,
  Math.max(world.width,world.depth)*2.4);
 render();
}
function panBy(dx,dy){
 // Translate in the camera's projected ground-plane axes. The sign is
 // deliberate: moving fingers right/down moves the world right/down.
 const rect=canvas.getBoundingClientRect();
 const horizontal=-dx/Math.max(1,rect.height)*2*camera.zoom;
 const vertical=-dy/Math.max(1,rect.height)*2*camera.zoom/Math.max(.22,Math.sin(camera.pitch));
 const cs=Math.cos(camera.yaw),sn=Math.sin(camera.yaw);
 camera.focusX=clamp(camera.focusX+horizontal*cs-vertical*sn,-world.width/2,world.width/2);
 camera.focusZ=clamp(camera.focusZ+horizontal*sn+vertical*cs,-world.depth/2,world.depth/2);
 render();
}
function navigateTouches(change){
 if(!change)return;
 // The two fingers act as one virtual sphere: yaw, pitch, twist and pinch
 // combine on every event. There is no tilt-vs-rotate mode to become stuck in.
 camera.yaw+=change.yawDelta;
 camera.pitch=clamp(camera.pitch+change.pitchDelta,.32,1.47);
 camera.zoom=clamp(camera.zoom*change.zoomRatio,
  Math.max(world.width,world.depth)*.035,
  Math.max(world.width,world.depth)*2.4);
 // The camera orbits the current settlement focus. Unlike screen-anchored
 // panning, this lets the landscape roll around a stable imaginary ball.
 render();
}
function homeView(x,z,zoom=null){
 camera.yaw=.71;camera.pitch=.86;
 focusOn(x,z,zoom);
}
function setSettlement(state,{
  draft=null,zoneStrokes=[],zoneType="residential",zoneRadius=54,zoneEdits=null,
  mode="explore",liveCurve=null,liveGesture=null,pendingControl=null,touchFocus=null
 }={}){
 settlement=state;settlementDraft=draft;settlementZoneStrokes=zoneStrokes;
 settlementZoneType=zoneType;settlementRadius=zoneRadius;settlementEdits=zoneEdits;
 settlementMode=mode;settlementLiveCurve=liveCurve;
 settlementLiveGesture=liveGesture;settlementPendingControl=pendingControl;
 updateSettlement();
}
 function onDown(e){
  if(e.pointerType==="mouse"&&e.button!==0)return;
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2)gesture=beginCameraGesture([...pointers.values()],canvas.getBoundingClientRect());
  else if(pointers.size>2)gesture=null;
 }
 function onMove(e){
  const last=pointers.get(e.pointerId);if(!last)return;
  e.preventDefault();
  const dx=e.clientX-last.x,dy=e.clientY-last.y;
  last.x=e.clientX;last.y=e.clientY;
  if(pointers.size===2&&gesture){
   navigateTouches(advanceCameraGesture(gesture,[...pointers.values()]));
  }else if(pointers.size===1){
   const rect=canvas.getBoundingClientRect();
   camera.yaw-=dx/Math.max(120,rect.width)*Math.PI*1.5;
   camera.pitch=clamp(camera.pitch+dy/Math.max(180,rect.height)*1.8,.32,1.47);
   render();
  }
 }
 function onUp(e){
  pointers.delete(e.pointerId);
  if(pointers.size!==2)gesture=null;
 }
 const lost=e=>{e.preventDefault();onError(new Error("3D graphics context was lost. Retry the scene in lighter mode."));};
 canvas.addEventListener("webglcontextlost",lost);
  if(interactive)canvas.addEventListener("pointerdown",onDown);
 if(interactive)canvas.addEventListener("pointermove",onMove);
 if(interactive)canvas.addEventListener("pointerup",onUp);
 if(interactive)canvas.addEventListener("pointercancel",onUp);
 const onWheel=e=>{e.preventDefault();zoomBy(e.deltaY>0?1.12:1/1.12);};
 canvas.addEventListener("wheel",onWheel,{passive:false});
 window.addEventListener("resize",render);
 upload(world);
 void loadModels();
 return{setWorld:upload,resetCamera,zoomBy,panBy,focusOn,homeView,navigateTouches,screenToWorld,setSettlement,render,
  setReference(value){showcase=Boolean(value);updateKenney();},
  assetStatus:()=>({loaded:loadedAssets,total:kitNames.length}),
  getCamera:()=>({...camera}),
  dispose(){
   disposed=true;
   canvas.removeEventListener("webglcontextlost",lost);
   canvas.removeEventListener("wheel",onWheel);
   canvas.removeEventListener("pointerdown",onDown);
   canvas.removeEventListener("pointermove",onMove);
   canvas.removeEventListener("pointerup",onUp);
   canvas.removeEventListener("pointercancel",onUp);
   window.removeEventListener("resize",render);
   if(frame)cancelAnimationFrame(frame);
   for(const b of buffers)gl.deleteBuffer(b);
   gl.deleteProgram(program);
   // Keep this canvas context alive for switching between the three slots.
  }};
}
