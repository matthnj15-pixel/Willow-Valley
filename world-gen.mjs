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
 const lakeRadius=(.062+options.waterLevel*.00067)*Math.min(width,depth);
 const lakes=Array.from({length:options.lakes},(_,i)=>{
  const px=.22+rand(i*31+3)*.56,pz=.19+rand(i*31+6)*.62;
  return{x:px*width,z:pz*depth,rx:lakeRadius*(.88+rand(i*31+8)*.42),
   rz:lakeRadius*(.72+rand(i*31+14)*.65),
   level:8+options.waterLevel*.09};
 });
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
 function sample(x,z){
  x=clamp(x,0,width);z=clamp(z,0,depth);
  let height=baseHeight(x,z),water=-Infinity,kind="land";
  for(const lake of lakes){
   const d=Math.hypot((x-lake.x)/lake.rx,(z-lake.z)/lake.rz);
   if(d<1.32){
    // A broad beach above each basin eases into a flat-water lake surface.
    height=Math.min(height,lake.level+(d-1)*42);
    if(d<1){height=Math.min(height,lake.level-5);if(lake.level>water){water=lake.level;kind="lake";}}
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
  ":"+lakes.length+":"+rivers.length+":"+trees.length;
 return{options,width,depth,lakes,rivers,trees,sample,slope,signature};
}
export function createWorldMesh(world,nx=68,nz=52){
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
 for(const t of world.trees){
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
