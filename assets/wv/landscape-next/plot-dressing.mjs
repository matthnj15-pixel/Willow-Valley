import {normalizeRing,boundsOf,createSpatialIndex,pointInRing,pointInShape,edgeDistance,fitsCircle,fitsPolygon,segmentDistance,ringArea} from './plot-geometry.mjs';
import {planPlotBoundaries} from './plot-boundaries.mjs';
import {keyedUnit,rectangle,transformPoint} from './hamlet-plan.mjs';
export function createPlotClearance(exclusions=[]){
 const index=createSpatialIndex();for(const e of exclusions){const points=e.polygon||e.points;if(points?.length)index.add(e,boundsOf(points,e.radius||0));}
 return{blocked(p,r=0){for(const e of index.query(boundsOf([p],r))){const radius=r+(e.radius||0);if(e.polygon){if(pointInRing(p,e.polygon)||edgeDistance(p,e.polygon)<radius)return true;}else if(e.points.length===1){if(Math.hypot(p.x-e.points[0].x,p.z-e.points[0].z)<radius)return true;}else if(e.points.slice(1).some((b,i)=>segmentDistance(p,e.points[i],b)<radius))return true;}return false;},stats:()=>index.stats()};
}
// Read-only, size-aware household/field composition. Buildings and old trees are
// exclusions; no asset is stretched to fit a small holding.
export function dressPlots({seed,plots=[],existingFences=[],exclusions=[],sample=()=>({height:0,water:null,slope:0}),quality='normal',distance='near',omitSmallPlants=false}={}){
 const ordered=plots.map(p=>({...p,polygon:normalizeRing(p.polygon),holes:(p.holes||[]).map(normalizeRing)})).sort((a,b)=>a.key.localeCompare(b.key));
 const boundaries=planPlotBoundaries({plots:ordered,existingFences,exclusions,sample}),clearance=createPlotClearance(exclusions),neighbors=createSpatialIndex(),occupied=createSpatialIndex(),fenceClearance=createPlotClearance(boundaries.fences.map(f=>({points:[f.a,f.b],radius:.1}))),props=[],beds=[],plotStats=[];
 for(const p of ordered)neighbors.add(p,boundsOf(p.polygon));
 function validPoint(p,r,plot,region){
  if(!fitsCircle(p,r+.08,plot)||region&&!fitsCircle(p,r+.04,region)||clearance.blocked(p,r)||fenceClearance.blocked(p,r))return false;
  for(const other of neighbors.query(boundsOf([p],r)))if(other.key!==plot.key&&(pointInShape(p,other)||edgeDistance(p,other.polygon)<r))return false;
  for(const q of occupied.query(boundsOf([p],r)))if(Math.hypot(p.x-q.x,p.z-q.z)<r+q.radius+.08)return false;
  return [[0,0],[r,0],[-r,0],[0,r],[0,-r]].every(([dx,dz])=>{const s=sample(p.x+dx,p.z+dz);return s&&Number.isFinite(s.height)&&s.water==null&&Math.abs(s.slope||0)<=.3;});
 }
 function add(kind,key,p,radius,height,plot,yaw=0,scale=1,footRadius=.12){
  if(!validPoint(p,radius,plot))return false;const center=sample(p.x,p.z),points=[[0,0],[footRadius,0],[-footRadius,0],[0,footRadius],[0,-footRadius]].map(([dx,dz])=>({x:p.x+dx,z:p.z+dz,...sample(p.x+dx,p.z+dz)}));
  if(points.some(s=>s.water!=null||!Number.isFinite(s.height)))return false;
  const baseY=Math.max(...points.map(s=>s.height)),gap=baseY-Math.min(...points.map(s=>s.height));if(gap>(kind==='wood-stack'?.06:.10))return false;
  props.push({key,plotKey:plot.key,kind,assetId:kind,origin:[p.x,baseY,p.z],scale,yaw,bounds:{min:[p.x-radius,baseY,p.z-radius],max:[p.x+radius,baseY+height*scale,p.z+radius]},quality,lod:distance,groundContact:{baseY,maxGap:gap,points:points.map(({x,z,height})=>({x,z,height}))}});occupied.add({x:p.x,z:p.z,radius},boundsOf([p],radius));return true;
 }
 for(const plot of ordered){
  const start=props.length,bedStart=beds.length,region=plot.plantingPolygon?{polygon:normalizeRing(plot.plantingPolygon),holes:plot.holes}:plot,origin=plot.origin||{x:0,z:0},yaw=plot.yaw||0,local=p=>transformPoint(p,origin,yaw),inverse=p=>transformPoint({x:p.x-origin.x,z:p.z-origin.z},{x:0,z:0},-yaw),box=boundsOf(region.polygon.map(inverse)),area=Math.max(0,Math.abs(ringArea(region.polygon))-(region.holes||[]).reduce((n,h)=>n+Math.abs(ringArea(h)),0));
  const use=plot.kind==='field'?'field':plot.use||'kitchen-garden',step=use==='orchard'?3.6:use==='work-yard'?2.8:use==='field'?1.8:1.5,candidates=[];
  if(plot.planting===false){plotStats.push({key:plot.key,kind:plot.kind||'home',use:'open-ground',area,props:0,beds:0});continue;}
  const nx=Math.ceil((box.maxX-box.minX)/step)+2,nz=Math.ceil((box.maxZ-box.minZ)/step)+2;if(nx*nz>50000)throw Error('Plot exceeds decoration candidate budget');
  for(let ix=Math.floor(box.minX/step);ix<=Math.ceil(box.maxX/step);ix++)for(let iz=Math.floor(box.minZ/step);iz<=Math.ceil(box.maxZ/step);iz++){
   const key=plot.key+':'+use+':'+ix+','+iz,p=local({x:ix*step,z:iz*step});if(pointInShape(p,region))candidates.push({key,p,rank:keyedUnit(seed+':'+key),ix,iz});
  }candidates.sort((a,b)=>a.rank-b.rank||a.key.localeCompare(b.key));
  if(use==='orchard'){
   const cap=Math.min(6,Math.floor(area/9));let count=0;for(const c of candidates){if(count>=cap)break;const scale=.87+c.rank*.13,r=1.65*scale;if(validPoint(c.p,r,plot,region)&&add('fruit-tree',c.key,c.p,r,3.75,plot,yaw,scale))count++;}
  }else if(use==='work-yard'){
   let count=0;for(const c of candidates){if(count>=Math.min(2,Math.floor(area/16)))break;if(validPoint(c.p,1.1,plot,region)&&add('wood-stack',c.key,c.p,1.1,.55,plot,yaw,1,.95))count++;}
   for(const c of candidates)if(validPoint(c.p,.3,plot,region)&&add('barrel',c.key+':barrel',c.p,.3,.65,plot,yaw,1,.22))break;
  }else if(use==='field'){
   if(distance!=='far'&&!omitSmallPlants){let count=0;for(const c of candidates){if(count>=150)break;if(quality==='low'&&c.rank>.4)continue;if(validPoint(c.p,.25,plot,region)&&add('grain-sheaf',c.key,c.p,.25,.92,plot,yaw,.83,.12))count++;}}
  }else{
   const cap=Math.min(6,Math.floor(area/4.8));for(const c of candidates){if(beds.length-bedStart>=cap)break;const poly=rectangle(c.p.x,c.p.z,1.05,2.05,yaw);
    if(!fitsPolygon(poly,plot)||!fitsPolygon(poly,region)||poly.some(p=>clearance.blocked(p,.2))||!validPoint(c.p,1.14,plot))continue;
    // Beds reserve their entire footprint before selecting another bed. Plants
    // inside a bed are emitted directly after the bed itself passes clearances.
    beds.push({key:c.key+':bed',plotKey:plot.key,polygon:poly});occupied.add({...c.p,radius:1.14},boundsOf(poly,.1));
    if(distance==='far'||omitSmallPlants)continue;for(const [i,offset] of [[0,{x:0,z:-.58}],[1,{x:0,z:0}],[2,{x:0,z:.58}]]){
     if(quality==='low'&&i!==1)continue;const p=transformPoint(offset,c.p,yaw),height=sample(p.x,p.z).height,kind=c.rank>.66?'garden-herbs':'garden-greens',r=.23;props.push({key:c.key+':plant:'+i,plotKey:plot.key,kind,assetId:kind,origin:[p.x,height,p.z],scale:.85,yaw,bounds:{min:[p.x-r,height,p.z-r],max:[p.x+r,height+.45,p.z+r]},quality,lod:distance,groundContact:{baseY:height,maxGap:0,points:[{...p,height}]}});
    }
   }
  }
  plotStats.push({key:plot.key,kind:plot.kind||'home',use,area,props:props.length-start,beds:beds.length-bedStart});
 }
 return{revision:'plot-dressing-1',runtimeReady:false,props:props.sort((a,b)=>a.key.localeCompare(b.key)),beds: beds.sort((a,b)=>a.key.localeCompare(b.key)),boundaries,plotStats,diagnostics:{clearances:clearance.stats(),neighbors:neighbors.stats(),occupied:occupied.stats()}};
}
