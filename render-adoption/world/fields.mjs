import * as T from '../../assets/vendor/three.module.mjs';
import {MEADOW_PALETTE} from './recipe.mjs';
import {clamp,smooth,unit} from './spatial.mjs';
// One atlas of world-aligned 128-game-unit tiles. Resolution scales with world
// extent; unlike the study it never stretches a fixed small-plan colour field.
export function buildFields(world, classification, quality) {
 const tileGame=128, samplesPerTile=quality==='low'?8:16,
  columns=Math.ceil(world.width/tileGame),rows=Math.ceil(world.depth/tileGame),
  width=columns*samplesPerTile+1,height=rows*samplesPerTile+1,n=width*height,
  color=new Uint8Array(n*4),control=new Uint8Array(n*4),wet=new Uint8Array(n),dist=new Float32Array(n).fill(1e6),samples=[];
 const palette=Object.fromEntries(Object.entries(MEADOW_PALETTE).map(([k,v])=>[k,new T.Color(v)])), c=new T.Color(), seed=world.options?.seed;
 const sx=world.width/(width-1),sy=world.depth/(height-1),counts={};
 for(let j=0;j<height;j++)for(let i=0;i<width;i++){
  const x=i*sx,y=j*sy,k=j*width+i,q=classification.query(x,y); samples.push(q);wet[k]=q.wet?1:0;counts[q.kind]=(counts[q.kind]||0)+1;
  c.copy(palette.meadow).lerp(palette.light,smooth(seed,x/2.8*.042,y/2.8*.042));
  c.multiplyScalar(.98+(unit(seed,Math.floor(x),Math.floor(y))-.5)*.1);
  c.lerp(new T.Color('#5f703d'),q.forest*.72);
  if(q.wear)c.lerp(palette.work,q.wear);
  if(q.kind==='road'||q.kind==='lane'||q.kind==='approach')c.copy(palette.lane);
  if(q.kind==='field')c.copy(palette.field);
  if(q.bank)c.lerp(new T.Color('#80775e'),.8);
  // A1 neutral mineral family; no photographic meadow or A2 dependency.
  if(q.grade>.24)c.lerp(new T.Color().setRGB(.16,.16,.14).lerp(new T.Color().setRGB(.235,.225,.20),smooth(seed,x*.07,y*.12)),clamp((q.grade-.24)/.9));
  c.convertLinearToSRGB();color[k*4]=Math.round(clamp(c.r)*255);color[k*4+1]=Math.round(clamp(c.g)*255);color[k*4+2]=Math.round(clamp(c.b)*255);color[k*4+3]=255;
 }
 // A1 unsigned two-pass wet-mask chamfer; explicitly not bathymetry.
 for(let j=0;j<height;j++)for(let i=0;i<width;i++){
  const k=j*width+i;
  if(i&&wet[k]!==wet[k-1])dist[k]=dist[k-1]=0;
  if(j&&wet[k]!==wet[k-width])dist[k]=dist[k-width]=0;
 }
 const relax=(i,j,di,dj)=>{const x=i+di,y=j+dj;if(x>=0&&x<width&&y>=0&&y<height){const k=j*width+i;dist[k]=Math.min(dist[k],dist[y*width+x]+Math.hypot(di*sx,dj*sy));}};
 for(let j=0;j<height;j++)for(let i=0;i<width;i++)for(const [di,dj]of[[-1,0],[0,-1],[-1,-1],[1,-1]])relax(i,j,di,dj);
 for(let j=height-1;j>=0;j--)for(let i=width-1;i>=0;i--)for(const [di,dj]of[[1,0],[0,1],[1,1],[-1,1]])relax(i,j,di,dj);
 for(let j=0;j<height;j++)for(let i=0;i<width;i++){
  const k=j*width+i,x=i*sx,y=j*sy;let dx=0,dy=0,best=Infinity;
  if(samples[k].kind==='river')for(const r of world.rivers||[])for(let a=1;a<r.points.length;a++){
   const p=r.points[a-1],b=r.points[a],vx=b.x-p.x,vy=(b.z??b.y)-(p.z??p.y),len=vx*vx+vy*vy,
    t=clamp(((x-p.x)*vx+(y-(p.z??p.y))*vy)/(len||1)),d=Math.hypot(x-p.x-vx*t,y-(p.z??p.y)-vy*t);
   if(d<best){best=d;const l=Math.sqrt(len)||1;dx=vx/l;dy=vy/l;}
  }
  control[k*4]=wet[k]*255;control[k*4+1]=Math.round(clamp(dist[k]/55)*255);control[k*4+2]=Math.round((dx*.5+.5)*255);control[k*4+3]=Math.round((dy*.5+.5)*255);
 }
 const textures=[];
 try{
  for(const [data,space] of [[color,T.SRGBColorSpace],[control,T.NoColorSpace]]){
   const t=new T.DataTexture(data,width,height);textures.push(t);t.colorSpace=space;
   t.generateMipmaps=false;t.minFilter=t.magFilter=T.LinearFilter;t.needsUpdate=true;
  }
 }catch(e){textures.forEach(t=>t.dispose());throw e;}
 return {color:textures[0],control:textures[1],status:{tileGame,samplesPerTile,columns,rows,width,height,decodedBytes:color.byteLength+control.byteLength,counts,shoreDistanceMethod:'unsigned wet-mask chamfer; not bathymetry'},dispose(){textures.forEach(t=>t.dispose());}};
}
