import {EPS,lerp,length,segmentKey,normalizeRing,boundsOf,createSpatialIndex,capsuleRanges,polygonRanges,parallelOverlap,segmentIntersection,subtractIntervals} from './plot-geometry.mjs';
// Physical boundaries have one owner and any number of users. Existing records
// are references, never moved, subdivided, resized or written into a save.
export function planPlotBoundaries({plots=[],existingFences=[],exclusions=[],sample=()=>({height:0,water:null,slope:0}),reuseDistance=.3}={}){
 const accepted=[],uses=[],gaps=[],conflicts=[],fenceIndex=createSpatialIndex(),blockIndex=createSpatialIndex(),plotIndex=createSpatialIndex(),requests=[];
 const sorted=plots.map(p=>({...p,polygon:normalizeRing(p.polygon),holes:(p.holes||[]).map(normalizeRing)})).sort((a,b)=>(a.establishedAt||0)-(b.establishedAt||0)||a.key.localeCompare(b.key));
 if(new Set(sorted.map(p=>p.key)).size!==sorted.length)throw Error('Plot keys must be unique');
 for(const p of sorted)plotIndex.add(p,boundsOf(p.polygon));
 for(const e of exclusions){const points=e.polygon||e.points;if(points?.length)blockIndex.add(e,boundsOf(points,e.radius||.15));}
 for(const f of [...existingFences].sort((a,b)=>a.key.localeCompare(b.key))){const ref={...f,a:{...f.a},b:{...f.b},source:'existing',users:new Set(f.users||[f.ownerKey].filter(Boolean))};accepted.push(ref);fenceIndex.add(ref,boundsOf([f.a,f.b],reuseDistance));}
 function excluded(a,b){
  const cuts=[];for(const e of blockIndex.query(boundsOf([a,b],.12))){
   if(e.polygon){cuts.push(...polygonRanges(a,b,e.polygon));for(let i=0;i<e.polygon.length;i++)cuts.push(...capsuleRanges(a,b,e.polygon[i],e.polygon[(i+1)%e.polygon.length],(e.radius||0)+.1));}
   else for(let i=1;i<e.points.length;i++)cuts.push(...capsuleRanges(a,b,e.points[i-1],e.points[i],(e.radius||0)+.1));
  }return cuts;
 }
 for(const f of accepted)if(excluded(f.a,f.b).length)conflicts.push({key:f.key,reason:'existing-fence-in-exclusion'});
 for(const plot of sorted){
  if(plot.kind==='field'&&!plot.gates?.length){
   let best=null;const routes=exclusions.filter(e=>e.points?.length>1&&['lane','road','path','approach'].includes(e.kind));
   for(let i=0;i<plot.polygon.length;i++){const a=plot.polygon[i],b=plot.polygon[(i+1)%plot.polygon.length];for(const route of routes)for(const p of route.points){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz))),q=lerp(a,b,t),d=length(p,q);if(!best||d<best.distance)best={point:q,distance:d};}}
   const point=best?.point||lerp(plot.polygon[0],plot.polygon[1],.5);plot.gates=[{point,width:2.8}];gaps.push({plotKey:plot.key,reason:'field-access',point,width:2.8,source:best?'nearest-supplied-corridor':'caller-access-required'});
  }
  const edges=plot.fenceEdges?.map(([a,b])=>({a,b}))||[plot.polygon,...plot.holes].flatMap(r=>r.map((a,i)=>({a,b:r[(i+1)%r.length]})));
  edges.sort((a,b)=>segmentKey(a.a,a.b).localeCompare(segmentKey(b.a,b.b)));
  for(const {a,b} of edges)if(length(a,b)>.15)requests.push({a,b,plot});
 }
 for(const {a,b,plot} of requests){
  const len=length(a,b),cuts=excluded(a,b),neighbors=fenceIndex.query(boundsOf([a,b],reuseDistance+.12));
  for(const f of neighbors){
   const shared=parallelOverlap(a,b,f.a,f.b,reuseDistance);
   if(shared){cuts.push(shared);f.users.add(plot.key);uses.push({plotKey:plot.key,boundaryKey:f.key,range:shared,source:f.source});continue;}
   const hit=segmentIntersection(a,b,f.a,f.b);if(hit&&hit.t>EPS&&hit.t<1-EPS&&hit.u>EPS&&hit.u<1-EPS){cuts.push([hit.t-.15/len,hit.t+.15/len]);gaps.push({plotKey:plot.key,reason:'fence-crossing',at:lerp(a,b,hit.t)});}
  }
  for(const other of plotIndex.query(boundsOf([a,b]))){if(other.key===plot.key)continue;cuts.push(...polygonRanges(a,b,other.polygon));}
  for(const gate of plot.gates||[]){const w=(gate.width||2.4)/2+.12;cuts.push(...capsuleRanges(a,b,gate.point,gate.point,w));}
  // Supplied wet/grade sampling is intentionally conservative at quarter-metre
  // intervals. Analytic polygon/corridor exclusions handle narrow access shapes.
  const n=Math.max(1,Math.ceil(len/.25));for(let i=0;i<n;i++){const lo=i/n,hi=(i+1)/n;for(const t of [lo,(lo+hi)/2,hi]){const p=lerp(a,b,t),s=sample(p.x,p.z);if(!s||!Number.isFinite(s.height)||s.water!=null||Math.abs(s.slope||0)>.45){cuts.push([lo,hi]);break;}}}
  for(const [lo,hi] of subtractIntervals([[0,1]],cuts)){
   const aa=lerp(a,b,lo),bb=lerp(a,b,hi);if(length(aa,bb)<.35)continue;const key='boundary:'+segmentKey(aa,bb),f={key,a:aa,b:bb,ownerKey:plot.key,users:new Set([plot.key]),kind:plot.fenceKind||'fence-rail',source:'candidate'};
   accepted.push(f);fenceIndex.add(f,boundsOf([aa,bb],reuseDistance));uses.push({plotKey:plot.key,boundaryKey:key,range:[lo,hi],source:f.source});
  }
 }
 const fences=accepted.map(f=>({...f,users:[...f.users].sort()})).sort((a,b)=>a.key.localeCompare(b.key));
 return{revision:'plot-boundaries-1',runtimeReady:false,fences,uses:uses.sort((a,b)=>a.plotKey.localeCompare(b.plotKey)||a.boundaryKey.localeCompare(b.boundaryKey)),gaps,conflicts,diagnostics:{requests:requests.length,fenceQueries:fenceIndex.stats(),exclusionQueries:blockIndex.stats(),plotQueries:plotIndex.stats()}};
}
