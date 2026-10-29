import {createWorldMesh,clamp} from "../world-gen.mjs";
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
 "varying vec3 vWorld; uniform float uWater;",
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
 " gl_FragColor=vec4(clamp(color,0.0,1.0),1.0);",
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
export function mountWorld3D(canvas,initialWorld,{onAssets=()=>{},showReference=false}={}){
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
  water:gl.getUniformLocation(program,"uWater")
 };
 const buffers=Array.from({length:5},()=>gl.createBuffer());
 const kenney={},kitNames=["oak","pine","birch","rock","tower","ground","waterTile","bank","cliff","beach"];
 let loadedAssets=0,showcase=showReference,disposed=false;
 let counts=[0,0,0,0,0],world=initialWorld;
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
  const resolution={small:[96,72],medium:[112,84],large:[128,96]}[world.options.size]||[112,84];
  const geometry=createWorldMesh(world,...resolution,{
   trees:!["oak","pine","birch"].some(key=>kenney[key]),
   palette:kenneyLandscapePalette(kenney)
  });
  gl.bindBuffer(gl.ARRAY_BUFFER,buffers[0]);
  gl.bufferData(gl.ARRAY_BUFFER,geometry.ground,gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER,buffers[1]);
  gl.bufferData(gl.ARRAY_BUFFER,geometry.water,gl.STATIC_DRAW);
  counts=[geometry.ground.length/9,geometry.water.length/9,0,0,0];
  updateKenney();
  if(reset)resetCamera();else render();
 }
 function updateKenney(){
  if(!loadedAssets||disposed)return;
  const props=instantiateKenney(world,kenney,{showReference:showcase});
  const terrain=instantiateKenneyTerrain(world,kenney);
  for(const [index,data] of [[2,props.vertices],[3,terrain.land],[4,terrain.water]]){
   gl.bindBuffer(gl.ARRAY_BUFFER,buffers[index]);
   gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
   counts[index]=data.length/9;
  }
  render();
 }
 async function loadModels(){
  const results=await Promise.allSettled(kitNames.map(key=>fetchKenneyModel(key)));
  if(disposed)return;
  results.forEach((r,i)=>{if(r.status==="fulfilled"){kenney[kitNames[i]]=r.value;loadedAssets++;}});
  if(loadedAssets)upload(world,false);
  onAssets({loaded:loadedAssets,total:kitNames.length,
   treeModels:["oak","pine","birch"].filter(k=>kenney[k]).length,
   reference:!!kenney.tower,
   terrain:!!kenney.ground,river:!!kenney.waterTile,bank:!!kenney.bank,
   online:loadedAssets>0});
 }
 function drawBuffer(buffer,count,isWater=false){
  if(!count)return;
  gl.uniform1f(loc.water,isWater?1:0);
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
  const rect=canvas.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  const density=Math.min(window.devicePixelRatio||1,1.75);
  const width=Math.round(rect.width*density),height=Math.round(rect.height*density);
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  gl.viewport(0,0,width,height);
  gl.clearColor(.71,.80,.74,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  gl.useProgram(program);
  gl.uniform3f(loc.focus,camera.focusX,17,camera.focusZ);
  gl.uniform1f(loc.yaw,camera.yaw);gl.uniform1f(loc.pitch,camera.pitch);
  gl.uniform1f(loc.zoom,camera.zoom);
  gl.uniform1f(loc.aspect,Math.max(.1,width/height));
  drawBuffer(buffers[0],counts[0]);drawBuffer(buffers[3],counts[3]);
  drawBuffer(buffers[1],counts[1],true);drawBuffer(buffers[4],counts[4],true);
  drawBuffer(buffers[2],counts[2]);
 }
 function render(){if(!frame)frame=requestAnimationFrame(draw);}
 function zoomBy(factor){
  camera.zoom=clamp(camera.zoom*factor,Math.max(world.width,world.depth)*.08,
   Math.max(world.width,world.depth)*2.4);
  render();
 }
 function onDown(e){
  if(e.pointerType==="mouse"&&e.button!==0)return;
  e.preventDefault();canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){
   const [a,b]=[...pointers.values()];
   gesture={distance:Math.hypot(a.x-b.x,a.y-b.y),
    midX:(a.x+b.x)/2,midY:(a.y+b.y)/2,zoom:camera.zoom,
    focusX:camera.focusX,focusZ:camera.focusZ};
  }
 }
 function onMove(e){
  const last=pointers.get(e.pointerId);if(!last)return;
  e.preventDefault();
  const dx=e.clientX-last.x,dy=e.clientY-last.y;
  last.x=e.clientX;last.y=e.clientY;
  const rect=canvas.getBoundingClientRect();
  if(pointers.size===2&&gesture){
   const [a,b]=[...pointers.values()];
   camera.zoom=clamp(gesture.zoom*gesture.distance/
    Math.max(18,Math.hypot(a.x-b.x,a.y-b.y)),
    Math.max(world.width,world.depth)*.08,Math.max(world.width,world.depth)*2.4);
   const movedX=(a.x+b.x)/2-gesture.midX,movedY=(a.y+b.y)/2-gesture.midY;
   const wx=movedX/Math.max(1,rect.width)*2*camera.zoom*(rect.width/Math.max(1,rect.height));
   const wz=movedY/Math.max(1,rect.height)*2*camera.zoom/Math.max(.3,Math.sin(camera.pitch));
   camera.focusX=clamp(gesture.focusX-wx*Math.cos(camera.yaw)-wz*Math.sin(camera.yaw),-world.width/2,world.width/2);
   camera.focusZ=clamp(gesture.focusZ-wx*Math.sin(camera.yaw)+wz*Math.cos(camera.yaw),-world.depth/2,world.depth/2);
  }else if(pointers.size===1){
   camera.yaw+=dx/Math.max(120,rect.width)*Math.PI*1.5;
   camera.pitch=clamp(camera.pitch+dy/Math.max(180,rect.height)*1.8,.34,1.42);
  }
  render();
 }
 function onUp(e){pointers.delete(e.pointerId);if(pointers.size<2)gesture=null;}
 canvas.addEventListener("pointerdown",onDown);
 canvas.addEventListener("pointermove",onMove);
 canvas.addEventListener("pointerup",onUp);
 canvas.addEventListener("pointercancel",onUp);
 canvas.addEventListener("wheel",e=>{e.preventDefault();zoomBy(e.deltaY>0?1.12:1/1.12);},{passive:false});
 window.addEventListener("resize",render);
 upload(world);
 void loadModels();
 return{setWorld:upload,resetCamera,zoomBy,
  setReference(value){showcase=Boolean(value);updateKenney();},
  assetStatus:()=>({loaded:loadedAssets,total:kitNames.length}),
  getCamera:()=>({...camera}),
  dispose(){
   disposed=true;
   canvas.removeEventListener("pointerdown",onDown);
   canvas.removeEventListener("pointermove",onMove);
   canvas.removeEventListener("pointerup",onUp);
   canvas.removeEventListener("pointercancel",onUp);
   window.removeEventListener("resize",render);
   if(frame)cancelAnimationFrame(frame);
   for(const b of buffers)gl.deleteBuffer(b);
   gl.deleteProgram(program);
  }};
}
