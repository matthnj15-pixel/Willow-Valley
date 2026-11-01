import {TREE_IDS,UNITS_PER_METRE} from './catalog.mjs';
// Stable key hashing is independent of iteration order, camera and state fields.
export function stableUnit(...parts){let h=2166136261;for(const c of JSON.stringify(parts)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0)/4294967296;}
const distance=(p,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);};
function inside(p,polygon){let yes=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)yes=!yes;}return yes;}
// Built once per placement revision; queries visit only nearby exclusions.
export function createExclusionIndex(exclusions=[],cellSize=32){
 const cells=new Map();let queries=0,tests=0;
 for(const e of exclusions){const points=e.polygon||e.points||[],pad=e.radius||0;if(!points.length)continue;
  const loX=Math.floor((Math.min(...points.map(p=>p.x))-pad)/cellSize),hiX=Math.floor((Math.max(...points.map(p=>p.x))+pad)/cellSize),loZ=Math.floor((Math.min(...points.map(p=>p.z))-pad)/cellSize),hiZ=Math.floor((Math.max(...points.map(p=>p.z))+pad)/cellSize);
  for(let x=loX;x<=hiX;x++)for(let z=loZ;z<=hiZ;z++){const key=x+':'+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(e);}
 }
 return{blocked(p,r,{tree=false}={}){queries++;const nearby=new Set();for(let x=Math.floor((p.x-r)/cellSize);x<=Math.floor((p.x+r)/cellSize);x++)for(let z=Math.floor((p.z-r)/cellSize);z<=Math.floor((p.z+r)/cellSize);z++)for(const e of cells.get(x+':'+z)||[])nearby.add(e);
  for(const e of nearby){tests++;if(tree&&e.kind==='preserve')continue;const poly=e.polygon;if(poly?.length){if(inside(p,poly)||poly.some((a,i)=>distance(p,a,poly[(i+1)%poly.length])<=r+(e.radius||0)))return e.kind||'polygon';}
   else{const pts=e.points||[];if(pts.length===1&&Math.hypot(p.x-pts[0].x,p.z-pts[0].z)<=r+(e.radius||0))return e.kind||'point';for(let i=1;i<pts.length;i++)if(distance(p,pts[i-1],pts[i])<=r+(e.radius||0))return e.kind||'corridor';}
  }return null;},stats:()=>({queries,tests,cells:cells.size})};
}
function footprint(entry,scale,yaw,p){const c=Math.cos(yaw),s=Math.sin(yaw),points=[];for(const x of [entry.boundsMin[0],(entry.boundsMin[0]+entry.boundsMax[0])/2,entry.boundsMax[0]])for(const z of [entry.boundsMin[2],(entry.boundsMin[2]+entry.boundsMax[2])/2,entry.boundsMax[2]])points.push({x:p.x+(x*c+z*s)*scale,z:p.z+(-x*s+z*c)*scale});return points;}
export function placeLandscape({seed,treeCandidates=[],coverRegions=[],decorativeCandidates=[],exclusions=[],sample,width,depth,entries,quality='normal',distance='near'}){
 if(typeof sample!=='function'||!Number.isFinite(width)||!Number.isFinite(depth))throw Error('Displayed terrain sampler and dimensions required');
 const index=createExclusionIndex(exclusions),catalog=new Map(entries.map(e=>[e.id,e])),instances=[],retainedTrees=[];
 function place(id,key,p,scale,yaw,tree=false){
  const e=catalog.get(id);if(!e)throw Error('Unknown landscape asset: '+id);
  const radius=Math.max(...[e.boundsMin[0],e.boundsMax[0],e.boundsMin[2],e.boundsMax[2]].map(Math.abs))*scale*Math.SQRT2;
  if(index.blocked(p,radius,{tree}))return false;
  const points=tree?[p]:footprint(e,scale,yaw,p),contacts=[];
  for(const pt of points){if(pt.x<0||pt.z<0||pt.x>width||pt.z>depth)return false;const v=sample(pt.x,pt.z);
   if(!Number.isFinite(v.height)||v.water!==null||!Number.isFinite(v.slope)||v.slope>(tree?.8:e.category==='outcrop'?.18:.30))return false;
   if(e.category==='bank-cover'&&!(v.moisture>=.65))return false;
   contacts.push({...pt,height:v.height,moisture:v.moisture});
  }
  const heights=contacts.map(p=>p.height),spread=Math.max(...heights)-Math.min(...heights);
  // Rigid props remain level. Reject grades that would float an end or bury cover.
  if(!tree&&spread>(e.id==='fallen-log'?.18:e.category==='outcrop'?.45:.16))return false;
  const ground=tree?heights[0]:Math.max(...heights),origin=[p.x-width/2,ground-e.boundsMin[1]*scale,p.z-depth/2],lod=distance==='far'?'far':quality==='low'?'low':'normal';
  const corners=footprint(e,scale,yaw,p),xs=corners.map(p=>p.x-width/2),zs=corners.map(p=>p.z-depth/2);
  instances.push({assetId:id,key,origin,scale,yaw,bounds:{min:[Math.min(...xs),origin[1]+e.boundsMin[1]*scale,Math.min(...zs)],max:[Math.max(...xs),origin[1]+e.boundsMax[1]*scale,Math.max(...zs)]},quality,lod,groundContact:{mode:e.groundContacts.type,points:contacts,maxGap:spread,baseY:ground},routing:'decoration-only'});return true;
 }
 const seen=new Set();for(const t of [...treeCandidates].sort((a,b)=>String(a.key??`${a.x}:${a.z}`).localeCompare(String(b.key??`${b.x}:${b.z}`)))){
  const key='tree:'+String(t.key??`${t.x}:${t.z}`);if(seen.has(key))throw Error('Duplicate authoritative tree key: '+key);seen.add(key);
  const id=TREE_IDS[Math.floor(stableUnit(seed,key,'species')*TREE_IDS.length)],e=catalog.get(id),scale=Number.isFinite(t.h)?t.h/e.boundsMax[1]:UNITS_PER_METRE;
  if(!place(id,key,t,scale,stableUnit(seed,key,'yaw')*Math.PI*2,true))retainedTrees.push({key,reason:'conservative envelope or contact rejection; retain existing tree presentation'});
 }
 const candidates=[...decorativeCandidates];
 // Regions are explicit caller permissions, never inferred from arbitrary state.
 // A broad 36-unit patch mask leaves open gaps; each cluster reuses one mesh.
 for(const r of coverRegions){const step=10;for(let x=Math.ceil(r.bounds.minX/step)*step;x<=r.bounds.maxX;x+=step)for(let z=Math.ceil(r.bounds.minZ/step)*step;z<=r.bounds.maxZ;z+=step){
  const key=`cover:${r.key}:${x}:${z}`,patch=stableUnit(seed,r.key,Math.floor(x/36),Math.floor(z/36),'patch');if(patch<.56||stableUnit(seed,key,'gap')<.30)continue;
  if(quality==='low'&&stableUnit(seed,key,'low')>.32)continue;if(distance==='far')continue;
  const choice=stableUnit(seed,key,'form'),id=r.kind==='bank'?(choice<.55?'reed-cluster':choice<.8?'rush-cluster':'bank-stones'):r.kind==='woodland'?(choice<.4?'fern-cluster':choice<.8?'grass-tuft':'hazel-shrub'):choice<.90?'grass-tuft':choice<.96?'flower-cream':'flower-mauve';
  candidates.push({key,assetId:id,x:x+(stableUnit(seed,key,'x')-.5)*4,z:z+(stableUnit(seed,key,'z')-.5)*4});
 }}
 for(const p of candidates.sort((a,b)=>a.key.localeCompare(b.key))){if(seen.has(p.key))throw Error('Duplicate landscape key: '+p.key);seen.add(p.key);if(distance==='far'&&!['outcrop'].includes(catalog.get(p.assetId)?.category))continue;place(p.assetId,p.key,p,(p.scale??1)*UNITS_PER_METRE,p.yaw??stableUnit(seed,p.key,'yaw')*Math.PI*2);}
 instances.sort((a,b)=>a.key.localeCompare(b.key));return{instances,retainedTrees,diagnostics:index.stats()};
}
// Optional caller-owned memo. Revision must change with displayed terrain sampling.
// Deliberately no state, camera, frame number or array-order dependency.
export function createPlacementCache(){let previous='',result,rebuilds=0;return{get(input){if(input.terrainRevision==null)throw Error('terrainRevision required for cache');const sort=a=>[...(a||[])].sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y)));const key=JSON.stringify([input.seed,input.width,input.depth,input.terrainRevision,input.catalogRevision,input.quality,input.distance,sort(input.treeCandidates),sort(input.coverRegions),sort(input.decorativeCandidates),sort(input.exclusions)]);if(previous!==key){result=placeLandscape(input);previous=key;rebuilds++;}return result;},get rebuilds(){return rebuilds;},clear(){previous='';result=null;}};}
