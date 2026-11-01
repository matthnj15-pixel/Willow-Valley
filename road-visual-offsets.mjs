import {sampleRoadAlignment} from './road-surface.mjs';
// Signed cross-road coordinate for shading only. Existing polygons own coverage.
export function roadVisualOffsets(world,state,vertices,kinds,liveCurve=null){
 const lines=[];
 if(state.roadGraph?.segments?.length){
  const nodes=new Map(state.roadGraph.nodes.map(n=>[n.id,n]));
  for(const e of state.roadGraph.segments){const a=nodes.get(e.a),b=nodes.get(e.b);if(a&&b)lines.push(sampleRoadAlignment(a,liveCurve?.id===e.id?liveCurve.control:e.control,b));}
 }else lines.push(...(state.roads||[]));
 const segments=lines.flatMap(points=>points.slice(1).map((b,i)=>[points[i],b]));
 const offsets=new Float32Array(kinds.length);
 for(let k=0;k<kinds.length;k++)if(kinds[k]===2){
  const x=vertices[k*9]+world.width/2,y=vertices[k*9+2]+world.depth/2;let best=Infinity,signed=0;
  for(const [a,b] of segments){
   const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);if(len<1e-8)continue;
   const t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(len*len)));
   const distance=Math.hypot(x-a.x-dx*t,y-a.y-dy*t);
   if(distance<best){best=distance;signed=distance*Math.sign(dx*(y-a.y)-dy*(x-a.x));}
  }
  offsets[k]=signed;
 }
 return offsets;
}
