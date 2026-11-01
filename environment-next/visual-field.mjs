import {createTerrainClassification} from '../terrain-classification.mjs';
const clamp=x=>Math.max(0,Math.min(1,x));
function inside(x,z,polygon){let yes=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)yes=!yes;}return yes;}
const segmentDistance=(x,z,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1));return Math.hypot(x-a.x-t*dx,z-a.z-t*dz);};
// World coordinates (uncentered, game units). Only measured, transformed envelopes
// and entrance/working paths are admitted. No automatic rectangular plot pads.
export function validateVisualInputs(inputs=[]){return inputs.filter(p=>p?.envelope?.length>=3&&p.path?.length>=2&&Number.isFinite(p.radius)&&p.radius>0&&p.radius<=20&&[...p.envelope,...p.path].every(v=>Number.isFinite(v.x)&&Number.isFinite(v.z))).map(p=>({envelope:p.envelope.map(v=>({...v})),path:p.path.map(v=>({...v})),radius:p.radius,strength:clamp(p.strength??.65)}));}
export function createVisualField(world,{low=false,inputs=[]}={}){
 const baseWidth=low?64:96,baseHeight=low?48:72,accepted=validateVisualInputs(inputs),width=accepted.length?(low?192:384):baseWidth,height=accepted.length?(low?144:288):baseHeight,base=createTerrainClassification(world,{width:baseWidth,height:baseHeight}),data=new Uint8Array(width*height*4);
 const seed=Array.from(String(world.options?.seed??'')).reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))|0,0);
 function sample(x,z){
  const q=world.sample(x,z),wet=q.water!==null;let forest=0,wear=0;
  for(const t of world.trees||[])forest=Math.max(forest,clamp(1-Math.hypot(x-t.x,z-t.z)/38));
  if(!wet)for(const p of accepted)if(inside(x,z,p.envelope))for(let i=1;i<p.path.length;i++)wear=Math.max(wear,clamp(1-segmentDistance(x,z,p.path[i-1],p.path[i])/p.radius)*p.strength);
  const meadow=.5+.22*Math.sin(x*.011+seed%83+Math.sin(z*.009))+.18*Math.cos(z*.015+x*.004+seed%57);
  const i=Math.round(clamp(x/world.width)*(baseWidth-1)),j=Math.round(clamp(z/world.depth)*(baseHeight-1)),k=j*baseWidth+i;
  return{wet,forest,wear,meadow,shoreDistance:base.distance[k],shoreDistanceMethod:'wet-mask chamfer; not bathymetry',flow:[base.data[k*4+2]/255*2-1,base.data[k*4+3]/255*2-1]};
 }
 for(let j=0;j<height;j++)for(let i=0;i<width;i++){const p=sample(i*world.width/(width-1),j*world.depth/(height-1)),k=(j*width+i)*4;data[k]=Math.round(p.forest*255);data[k+1]=Math.round(p.wear*255);data[k+2]=Math.round(p.meadow*255);data[k+3]=p.wet?255:0;}
 return{...base,visualData:data,visualWidth:width,visualHeight:height,sample,acceptedInputs:accepted.length};
}
