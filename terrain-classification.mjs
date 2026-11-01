// Presentation-only control grid. No writes to world, settlement, or saves.
const clamp=x=>Math.max(0,Math.min(1,x));
export function createTerrainClassification(world,{width=96,height=72}={}){
 const n=width*height,sx=world.width/(width-1),sz=world.depth/(height-1),samples=[],wet=new Uint8Array(n);
 const seed=Array.from(String(world.options?.seed??'')).reduce((h,c)=>(Math.imul(h,31)+c.charCodeAt(0))|0,0);
 for(let j=0;j<height;j++)for(let i=0;i<width;i++){const q=world.sample(i*sx,j*sz);samples.push(q);wet[j*width+i]=q.water!==null?1:0;}
 // Multi-source chamfer distance, in world units, on both sides of the actual wet mask.
 const distance=new Float32Array(n).fill(1e6);
 for(let j=0;j<height;j++)for(let i=0;i<width;i++){
  const k=j*width+i;
  if((i&&wet[k]!==wet[k-1])||(j&&wet[k]!==wet[k-width])){distance[k]=0;if(i&&wet[k]!==wet[k-1])distance[k-1]=0;if(j&&wet[k]!==wet[k-width])distance[k-width]=0;}
 }
 const relax=(k,i,j,di,dj)=>{const x=i+di,z=j+dj;if(x>=0&&x<width&&z>=0&&z<height)distance[k]=Math.min(distance[k],distance[z*width+x]+Math.hypot(di*sx,dj*sz));};
 for(let j=0;j<height;j++)for(let i=0;i<width;i++)for(const [di,dj] of [[-1,0],[0,-1],[-1,-1],[1,-1]])relax(j*width+i,i,j,di,dj);
 for(let j=height-1;j>=0;j--)for(let i=width-1;i>=0;i--)for(const [di,dj] of [[1,0],[0,1],[1,1],[-1,1]])relax(j*width+i,i,j,di,dj);
 const data=new Uint8Array(n*4);
 for(let j=0;j<height;j++)for(let i=0;i<width;i++){
  const k=j*width+i,x=i*sx,z=j*sz,q=samples[k];
  let forest=0;
  for(const t of world.trees||[])forest=Math.max(forest,1-Math.hypot(x-t.x,z-t.z)/42);
  const noise=.5+.25*Math.sin(x*.017+seed%103+Math.sin(z*.011))+.25*Math.cos(z*.023+x*.007+seed%71);
  const bank=1-clamp(distance[k]/32),altitude=clamp((q.height-140)/180);
  data[k*4]=Math.round(clamp(forest*.48+bank*.52+noise*.15+altitude*.12)*255);
  data[k*4+1]=Math.round(clamp(distance[k]/55)*255);
  let dx=0,dz=0,best=Infinity;
  if(q.kind==='river')for(const r of world.rivers||[])for(let a=1;a<r.points.length;a++){
   const p=r.points[a-1],b=r.points[a],vx=b.x-p.x,vz=(b.z??b.y)-(p.z??p.y),len=vx*vx+vz*vz;
   const t=clamp(((x-p.x)*vx+(z-(p.z??p.y))*vz)/(len||1)),d=Math.hypot(x-p.x-vx*t,z-(p.z??p.y)-vz*t);
   if(d<best){best=d;const l=Math.sqrt(len)||1;dx=vx/l;dz=vz/l;}
  }
  data[k*4+2]=Math.round((dx*.5+.5)*255);data[k*4+3]=Math.round((dz*.5+.5)*255);
 }
 return{data,width,height,distance};
}
