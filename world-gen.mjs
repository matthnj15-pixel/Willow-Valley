// WORLD-3D-001. Deterministic terrain generation, independent of the legacy 2D simulation.
// A saved world stores the seed and settings, never a heavyweight mesh or a random stream.
export const WORLD_SIZES=Object.freeze({
 small:{width:800,depth:600,label:"Small valley"},
 medium:{width:1200,depth:900,label:"Medium landscape"},
 large:{width:1800,depth:1350,label:"Large region"}
});
export const DEFAULT_WORLD=Object.freeze({
 seed:"WILLOW-1048",size:"medium",lakes:2,rivers:1,waterLevel:45,
 rolling:58,hills:48,cliffs:25,flatness:40,forest:65
});
export const WORLD_PRESET_VERSION=1;
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=t=>t*t*(3-2*t);
function mix(a,b,t){return a+(b-a)*t;}
export function hashSeed(input){
 let h=2166136261;
 for(const letter of String(input)){h^=letter.charCodeAt(0);h=Math.imul(h,16777619);}
 return h>>>0;
}
function hash2(x,z,seed){
 let h=seed^Math.imul(x,374761393)^Math.imul(z,668265263);
 h=Math.imul(h^(h>>>13),1274126177);
 return ((h^(h>>>16))>>>0)/4294967295;
}
function valueNoise(x,z,seed){
 const ix=Math.floor(x),iz=Math.floor(z),tx=smooth(x-ix),tz=smooth(z-iz);
 return mix(mix(hash2(ix,iz,seed),hash2(ix+1,iz,seed),tx),
  mix(hash2(ix,iz+1,seed),hash2(ix+1,iz+1,seed),tx),tz);
}
function fbm(x,z,seed){
 return valueNoise(x,z,seed)*.56+valueNoise(x*2.07+12,z*2.07-7,seed+11)*.28+
  valueNoise(x*4.11-23,z*4.11+33,seed+29)*.16;
}
export function normalizeWorldSettings(raw={}){
 const source={...DEFAULT_WORLD,...raw},out={};
 out.seed=String(source.seed??DEFAULT_WORLD.seed).trim().slice(0,40)||DEFAULT_WORLD.seed;
 out.size=WORLD_SIZES[source.size]?source.size:"medium";
 for(const [key,low,high] of [
  ["lakes",0,4],["rivers",0,3],["waterLevel",0,100],
  ["rolling",0,100],["hills",0,100],["cliffs",0,100],
  ["flatness",0,100],["forest",0,100]]){
  const n=Number(source[key]);
  out[key]=Number.isFinite(n)?clamp(Math.round(n),low,high):DEFAULT_WORLD[key];
 }
 return out;
}
export function validWorldSettings(value){
 if(!value||typeof value!=="object")return false;
 const normalized=normalizeWorldSettings(value);
 return Object.keys(DEFAULT_WORLD).every(k=>value[k]===normalized[k]);
}
export function createWorld(raw={}){
 const options=normalizeWorldSettings(raw),size=WORLD_SIZES[options.size];
 const width=size.width,depth=size.depth,seed=hashSeed(options.seed);
 const rand=i=>hash2(i,17,seed);
 // Choose low-lying natural valley sites instead of throwing elliptical lakes
 // onto arbitrary hills. A fixed seed produces the same valleys every time.
 const lakes=[];
 const lakeMin=Math.min(width,depth);
 const lakeTypes=["ribbon","branched","lowland"];
 for(let i=0;i<options.lakes;i++){
  let best=null;
  for(let j=0;j<22;j++){
   const x=(.12+.76*rand(900+i*97+j*3))*width;
   const z=(.12+.76*rand(901+i*97+j*3))*depth;
   const h=baseHeight(x,z);
   const dx=(baseHeight(x+12,z)-baseHeight(x-12,z))/24;
   const dz=(baseHeight(x,z+12)-baseHeight(x,z-12))/24;
   const closest=lakes.length?Math.min(...lakes.map(l=>Math.hypot(x-l.x,z-l.z))):Infinity;
   const score=h+Math.hypot(dx,dz)*12+Math.max(0,240-closest)*.3+rand(902+i*97+j*3)*4;
   if(!best||score<best.score)best={x,z,score,h,dx,dz};
  }
  const type=lakeTypes[(i+Math.floor(rand(700+i)*3))%lakeTypes.length];
  const length=lakeMin*(type==="ribbon"?.35:type==="branched"?.24:.18)*
   (.84+rand(530+i*37)*.4)*(0.7+options.waterLevel*.005);
  const halfWidth=lakeMin*(type==="ribbon"?.028:type==="branched"?.041:.072)*
   (.8+rand(531+i*37)*.48)*(0.6+options.waterLevel*.008);
  // Valley shape supplies orientation; glacial channels follow the lower
  // gradient or its longitudinal contour when the valley is nearly flat.
  const direction=Math.atan2(best.dz,best.dx)+
   (type==="ribbon"?.12:1.08)+rand(535+i*37)*.42;
  const ux=Math.cos(direction),uz=Math.sin(direction);
  const vx=-uz,vz=ux;
  const wobble=rand(533+i*37)*Math.PI*2;
  const spine=Array.from({length:17},(_,j)=>{
   const t=j/16,u=(t-.5)*length;
   const side=(Math.sin(t*Math.PI*2.4+wobble)-Math.sin(wobble))*
     halfWidth*(type==="ribbon"?.65:.8);
   const x=clamp(best.x+ux*u+vx*side,5,width-5);
   const z=clamp(best.z+uz*u+vz*side,5,depth-5);
   return{x,z,r:halfWidth*(.52+.48*Math.pow(Math.max(0,1-Math.abs(t-.5)*1.8),.7))*
      (.85+.18*Math.sin(t*23+wobble))};
  });
  const arms=[];
  if(type==="branched"||type==="lowland"){
   const count=type==="branched"?3:2;
   for(let j=0;j<count;j++){
    const idx=3+Math.floor(rand(610+i*37+j)*11),origin=spine[idx];
    const side=j%2?1:-1;
    const span=length*(.28+rand(630+i*37+j)*.27);
    const shift=side*span;
    arms.push(Array.from({length:7},(_,k)=>{
     const t=k/6;
     return{x:clamp(origin.x+vx*shift*t+ux*span*t*.23*Math.sin(t*2+floatHash(i,j)),5,width-5),
      z:clamp(origin.z+vz*shift*t+uz*span*t*.23*Math.sin(t*2+floatHash(i,j)),5,depth-5),
      r:halfWidth*(.63-.54*t)};
    }));
   }
  }
  const level=Math.max(6,best.h+2.5+rand(511+i*37)*2);
  lakes.push({x:best.x,z:best.z,rx:length/2,rz:halfWidth,
   level,type,spine,arms});
 }
 function floatHash(a,b){return rand(776+a*31+b);}
 const rivers=Array.from({length:options.rivers},(_,i)=>{
  const phase=rand(70+i*23)*Math.PI*2,offset=(i+1)/(options.rivers+1);
  const points=Array.from({length:61},(_,j)=>{
   const t=j/60;
   return{x:t*width,z:depth*(offset+
    (.065+options.waterLevel*.00017)*Math.sin(t*Math.PI*2.2+phase)+
    .027*Math.sin(t*Math.PI*5.4+phase*2))};
  });
  return{width:(7+options.waterLevel*.19)*(width/1200)**.38,
   level:7+options.waterLevel*.085,points};
 });
 function lineDistance(x,z,points){
  let best=Infinity;
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z;
   const t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);
   best=Math.min(best,Math.hypot(x-(a.x+t*dx),z-(a.z+t*dz)));
  }
  return best;
 }
 function baseHeight(x,z){
  const nx=x/width,nz=z/depth,rolling=options.rolling/100,hills=options.hills/100;
  const broad=fbm(nx*4.3,nz*4.3,seed+200)-.5;
  const detail=fbm(nx*13,nz*13,seed+201)-.5;
  const ridge=Math.pow(1-Math.abs(2*fbm(nx*3.5+.5,nz*3.5+.3,seed+240)-1),3.1);
  const cliffNoise=fbm(nx*5.9+.3,nz*5.9+.7,seed+270);
  const cliff= smooth(clamp((cliffNoise-.475)*23,0,1))*options.cliffs*.65;
  const open=1-smooth(clamp((fbm(nx*2.8,nz*2.8,seed+330)-.34)*3,0,1));
  const flatFactor=1-options.flatness/100*.83*open;
  return Math.max(1,11+(broad*85*rolling+detail*23*rolling+
   ridge*90*hills+cliff)*flatFactor);
 }
 function lakeDistance(lake,x,z){
  // Domain-warp sampling adds organic embayments, while the long axis and
  // branches come from the terrain-oriented valley centreline.
  const warp=lake.rz*.34;
  const xx=x+(fbm(x/width*23,z/depth*23,seed+lake.x%100+451)-.5)*warp;
  const zz=z+(fbm(x/width*21+9,z/depth*21-7,seed+lake.z%100+452)-.5)*warp;
  let best=Infinity;
  for(const path of [lake.spine,...lake.arms])for(let i=1;i<path.length;i++){
   const a=path[i-1],b=path[i],dx=b.x-a.x,dz=b.z-a.z;
   const t=clamp(((xx-a.x)*dx+(zz-a.z)*dz)/(dx*dx+dz*dz||1),0,1);
   const r=Math.max(1,mix(a.r,b.r,t));
   const d=Math.hypot(xx-(a.x+t*dx),zz-(a.z+t*dz))/r;
   best=Math.min(best,d);
  }
  return best;
 }
 function sample(x,z){
  x=clamp(x,0,width);z=clamp(z,0,depth);
  let height=baseHeight(x,z),water=-Infinity,kind="land";
  for(const lake of lakes){
   // Only sample basins in a generously clipped bounding area.
   const far=Math.hypot(x-lake.x,z-lake.z);
   if(far>lake.rx+lake.rz*6)continue;
   const d=lakeDistance(lake,x,z);
   if(d<1.5){
    const rim=clamp((d-.78)/.72,0,1);
    const basin=lake.level-8+Math.pow(Math.min(d,1),1.7)*7;
    // The shore blends back into the terrain without an artificial raised
    // oval berm; cliffs and rolling hills remain as the parent topography.
    height=mix(Math.min(height,basin),height,smooth(rim));
    if(d<1){
     height=Math.min(height,lake.level-1.5);
     if(lake.level>water){water=lake.level;kind="lake";}
    }
   }
  }
  for(const river of rivers){
   const d=lineDistance(x,z,river.points),bank=river.width;
   if(d<bank*1.75){
    height=Math.min(height,river.level+(d-bank)*2.2);
    if(d<bank){height=Math.min(height,river.level-3);if(river.level>water){water=river.level;kind="river";}}
   }
  }
  return{height,water:Number.isFinite(water)?water:null,kind};
 }
 function slope(x,z){
  const d=Math.min(width,depth)/260;
  return Math.hypot((sample(x+d,z).height-sample(x-d,z).height)/(2*d),
   (sample(x,z+d).height-sample(x,z-d).height)/(2*d));
 }
 // Seeded forests avoid steep cliffs and floodplains; no frame-time random calls.
 const treeCount=Math.round((width*depth)/(1200*900)*(35+options.forest*2.8)*options.forest/100);
 const trees=[];
 for(let i=0;i<treeCount*5&&trees.length<treeCount;i++){
  const x=22+rand(1000+i*5)*(width-44),z=22+rand(1002+i*5)*(depth-44);
  const land=sample(x,z);
  const patch=fbm(x/width*10,z/depth*10,seed+443);
  if(land.water!==null||slope(x,z)>1.05||patch<.37||rand(1004+i*5)>options.forest/100*.82+.12)continue;
  trees.push({x,z,y:land.height,r:4.3+rand(1010+i*5)*3.5,h:19+rand(1012+i*5)*22});
 }
 // Signature permits deterministic regression tests and keeps the renderer
 // independent of camera, device pixel ratio, and simulation turn timing.
 const anchors=[[.1,.1],[.25,.8],[.5,.5],[.8,.25],[.9,.9]];
 const signature=anchors.map(([x,z])=>sample(x*width,z*depth).height.toFixed(3)).join("|")+
  ":"+lakes.map(l=>l.type).join(",")+":"+rivers.length+":"+trees.length;
 return{options,width,depth,lakes,rivers,trees,sample,slope,signature};
}
export function createWorldMesh(world,nx=68,nz=52,{trees=true}={}){
 const {width,depth}=world,ground=[],water=[];
 const rand=(i,j)=>hash2(i,j,hashSeed(world.options.seed)+901);
 function triangle(to,a,b,c,color){
  const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2];
  const vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
  let normal=[uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx];
  const len=Math.hypot(...normal)||1;normal=normal.map(v=>v/len);
  for(const p of [a,b,c])to.push(...p,...color,...normal);
 }
 for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){
  const x0=x/nx*width,x1=(x+1)/nx*width,z0=z/nz*depth,z1=(z+1)/nz*depth;
  const a=world.sample(x0,z0),b=world.sample(x1,z0),c=world.sample(x1,z1),d=world.sample(x0,z1);
  const cells=[[x0,z0,a],[x1,z0,b],[x1,z1,c],[x0,z1,d]];
  const mid=world.sample((x0+x1)/2,(z0+z1)/2),rock=world.slope((x0+x1)/2,(z0+z1)/2);
  const variation=rand(x,z),rocky=clamp(rock*.55+(mid.height>75?.27:0),0,1);
  const green=[.36+variation*.09,.54+variation*.11,.31+variation*.08];
  const stone=[.51+variation*.05,.50+variation*.06,.43+variation*.05];
  const color=green.map((v,i)=>mix(v,stone[i],rocky));
  const verts=cells.map(q=>[q[0]-width/2,q[2].height,q[1]-depth/2]);
  triangle(ground,verts[0],verts[3],verts[1],color);
  triangle(ground,verts[1],verts[3],verts[2],color);
  if(mid.water!==null){
   const surface=mid.water+.5;
   const wverts=cells.map(q=>[q[0]-width/2,surface,q[1]-depth/2]);
   const blue=mid.kind==="river"?[.25,.57,.67]:[.29,.61,.72];
   triangle(water,wverts[0],wverts[3],wverts[1],blue);
   triangle(water,wverts[1],wverts[3],wverts[2],blue);
  }
 }
 // Low-poly conifers remain inexpensive enough for a mobile browser.
 for(const t of trees?world.trees:[]){
  const x=t.x-width/2,z=t.z-depth/2,n=5,base=t.y+1;
  const pine=[.16+rand(Math.round(t.x),Math.round(t.z))*.09,.36+rand(Math.round(t.z),Math.round(t.x))*.1,.22];
  for(let i=0;i<n;i++){
   const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2;
   triangle(ground,[x,base+t.h,z],
    [x+Math.cos(a)*t.r,base+t.h*.21,z+Math.sin(a)*t.r],
    [x+Math.cos(b)*t.r,base+t.h*.21,z+Math.sin(b)*t.r],pine);
   triangle(ground,[x,base+t.h*.63,z],
    [x+Math.cos(a)*t.r*.85,base+t.h*.12,z+Math.sin(a)*t.r*.85],
    [x+Math.cos(b)*t.r*.85,base+t.h*.12,z+Math.sin(b)*t.r*.85],
    pine.map(v=>v*.89));
  }
 }
 return{ground:new Float32Array(ground),water:new Float32Array(water),
  groundTriangles:ground.length/27,waterTriangles:water.length/27};
}
