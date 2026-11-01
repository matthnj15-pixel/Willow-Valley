import {normalizeRing,ringArea,pointInRing,segmentDistance,lerp,length} from './plot-geometry.mjs';
const key=(x,z)=>x+','+z,steps=[[1,0],[0,1],[-1,0],[0,-1]];
// Consume an authoritative committed-use sampler OR an already classified cell
// mask. Never reconstruct zone precedence, roads, water or eraser semantics here.
export function derivePaintedFields({cellSize=1,bounds,cells,sampleUse,sampleSurface=()=>({height:0,water:null,slope:0}),maxCells=200000}={}){
 if(!(cellSize>0))throw Error('Field cellSize must be positive');
 const filled=new Set();let queries=0;
 function dry(x,z){const s=sampleSurface(x,z);return s&&Number.isFinite(s.height)&&s.water==null&&Math.abs(s.slope||0)<=.45;}
 if(cells){if(cells.length>maxCells)throw Error('Field mask exceeds cell budget');for(const c of cells){if(!Number.isInteger(c.ix)||!Number.isInteger(c.iz))throw Error('Field mask uses integer ix/iz cells');const x=(c.ix+.5)*cellSize,z=(c.iz+.5)*cellSize;if(dry(x,z))filled.add(key(c.ix,c.iz));}}
 else{
  if(!bounds||typeof sampleUse!=='function')throw Error('Supply committed field cells, or bounds and sampleUse');
  const x0=Math.floor(bounds.minX/cellSize),x1=Math.ceil(bounds.maxX/cellSize),z0=Math.floor(bounds.minZ/cellSize),z1=Math.ceil(bounds.maxZ/cellSize);
  if((x1-x0)*(z1-z0)>maxCells)throw Error('Field bounds exceed cell budget');
  for(let x=x0;x<x1;x++)for(let z=z0;z<z1;z++){
   // A complete cell must be committed dry farmland. This deliberately leaves
   // a conservative sub-cell margin rather than fencing brush bounding boxes.
   let valid=true;for(const [u,v] of [[.5,.5],[0,0],[1,0],[1,1],[0,1]]){const px=(x+u)*cellSize,pz=(z+v)*cellSize;queries++;if(sampleUse(px,pz)!=='farmland'||!dry(px,pz)){valid=false;break;}}
   if(valid)filled.add(key(x,z));
  }
 }
 const sorted=[...filled].map(k=>k.split(',').map(Number)).sort((a,b)=>a[0]-b[0]||a[1]-b[1]),visited=new Set(),fields=[];
 const allowed=sampleUse?(x,z)=>sampleUse(x,z)==='farmland'&&dry(x,z):(x,z)=>[-1,1].some(a=>[-1,1].some(b=>filled.has(key(Math.floor((x+a*1e-6)/cellSize),Math.floor((z+b*1e-6)/cellSize)))));
 function simplify(ring){
  let out=ring;for(let pass=0;pass<4;pass++){let changed=false;for(let i=0;i<out.length&&out.length>4;i++){
   const a=out[(i+out.length-1)%out.length],b=out[i],c=out[(i+1)%out.length];if(segmentDistance(b,a,c)>cellSize*.8)continue;
   const n=Math.max(1,Math.ceil(length(a,c)/.2));let ok=true;for(let j=0;j<=n;j++){const p=lerp(a,c,j/n);if(!allowed(p.x,p.z)){ok=false;break;}}if(!ok)continue;
   out=out.filter((_,j)=>j!==i);i--;changed=true;
  }if(!changed)break;}return out;
 }
 for(const [sx,sz] of sorted){if(visited.has(key(sx,sz)))continue;const queue=[[sx,sz]],component=new Set([key(sx,sz)]);visited.add(key(sx,sz));
  for(let at=0;at<queue.length;at++){const [x,z]=queue[at];for(const [dx,dz] of steps){const k=key(x+dx,z+dz);if(filled.has(k)&&!visited.has(k)){visited.add(k);component.add(k);queue.push([x+dx,z+dz]);}}}
  const edges=[],starts=new Map();function add(ax,az,bx,bz){const edge={a:{x:ax*cellSize,z:az*cellSize},b:{x:bx*cellSize,z:bz*cellSize},used:false},k=key(ax,az);edges.push(edge);if(!starts.has(k))starts.set(k,[]);starts.get(k).push(edge);}
  for(const [x,z] of queue){if(!component.has(key(x,z-1)))add(x,z,x+1,z);if(!component.has(key(x+1,z)))add(x+1,z,x+1,z+1);if(!component.has(key(x,z+1)))add(x+1,z+1,x,z+1);if(!component.has(key(x-1,z)))add(x,z+1,x,z);}
  const rings=[];for(const first of edges){if(first.used)continue;const ring=[];let e=first;
   while(e&&!e.used){e.used=true;ring.push(e.a);if(length(e.b,first.a)<1e-7)break;const candidates=(starts.get(key(Math.round(e.b.x/cellSize),Math.round(e.b.z/cellSize)))||[]).filter(n=>!n.used),dx=e.b.x-e.a.x,dz=e.b.z-e.a.z;
    const rank=n=>{const xx=n.b.x-n.a.x,zz=n.b.z-n.a.z,c=dx*zz-dz*xx,d=dx*xx+dz*zz;return c>0?0:d>0?1:c<0?2:3;};candidates.sort((a,b)=>rank(a)-rank(b));e=candidates[0];
   }
   if(ring.length>=4){const area=ringArea(ring);rings.push({area,polygon:normalizeRing(simplify(ring))});}
  }
  const outer=rings.filter(r=>r.area>0),holes=rings.filter(r=>r.area<0);for(const [i,r] of outer.entries()){const ownHoles=holes.filter(h=>pointInRing(h.polygon[0],r.polygon));fields.push({key:`painted-field:${sx},${sz}:${i}`,kind:'field',polygon:r.polygon,holes:ownHoles.map(h=>h.polygon),area:Math.abs(ringArea(r.polygon))-ownHoles.reduce((n,h)=>n+Math.abs(ringArea(h.polygon)),0),rasterArea:Math.abs(r.area)-ownHoles.reduce((n,h)=>n+Math.abs(h.area),0),cellSize,source:'committed-land-use-mask'});}
 }
 return{revision:'painted-fields-1',runtimeReady:false,fields,diagnostics:{cells:filled.size,queries,components:fields.length,cellSize}};
}
