import {visualIdentity} from '../../asset-registry.mjs';
import {cottageBlueprint,buildingFootprint} from '../../settlement-architecture.mjs';
import {zoneAt} from '../../organic-world.mjs';
import {graphLines} from '../../road-network.mjs';
import {visibleDesirePaths} from '../../desire-paths.mjs';
import {naturePlacements} from '../../nature-visuals.mjs';
import {previewTrees} from '../../world-gen.mjs';
import {buildingBlueprint} from '../../settlement-architecture.mjs';
export const U=2.8;
export const freeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
export const toMetres=(p,w)=>({x:(p.x-w.width/2)/U,z:(p.y-w.depth/2)/U});
export const toSaved=(p,w)=>({x:p.x*U+w.width/2,y:p.z*U+w.depth/2});
function facilityYaw(state,b){let nearest=Infinity,target=null;for(const line of [...(state.roads||[]),...(state.localLanes||[]).map(l=>l.points||[])])for(let i=1;i<line.length;i++){const a=line[i-1],c=line[i],dx=c.x-a.x,dy=c.y-a.y,t=Math.max(0,Math.min(1,((b.x-a.x)*dx+(b.y-a.y)*dy)/(dx*dx+dy*dy||1))),p={x:a.x+dx*t,y:a.y+dy*t},d=Math.hypot(p.x-b.x,p.y-b.y);if(d<nearest){nearest=d;target=p;}}return target?-(Math.atan2(target.y-b.y,target.x-b.x)-Math.PI/2):-buildingBlueprint(b).orientation;}
export function geometryKey(state){return JSON.stringify([state.houses,state.buildings,state.roads,state.roadGraph,state.localLanes,state.zones,state.desirePaths,state.retainedBoundaries]);}
export function fieldMask(state,world){
 const stamps=(state.zones||[]).filter(z=>z.type==='farmland').flatMap(z=>z.points.map(p=>({...p,r:z.radius})));
 const xs=stamps.flatMap(p=>[Math.max(0,p.x-p.r),Math.min(world.width,p.x+p.r)]),ys=stamps.flatMap(p=>[Math.max(0,p.y-p.r),Math.min(world.depth,p.y+p.r)]);
 const size=xs.length&&(Math.max(...xs)-Math.min(...xs))*(Math.max(...ys)-Math.min(...ys))>100000?4:2;
 const lo=toMetres({x:xs.length?Math.min(...xs):0,y:ys.length?Math.min(...ys):0},world),hi=toMetres({x:xs.length?Math.max(...xs):0,y:ys.length?Math.max(...ys):0},world),cells=[],mask=new Set();
 const classified=new Map();
 for(let ix=Math.floor(lo.x/size);ix<Math.ceil(hi.x/size);ix++)for(let iz=Math.floor(lo.z/size);iz<Math.ceil(hi.z/size);iz++){
  const center=toSaved({x:(ix+.5)*size,z:(iz+.5)*size},world);if(!stamps.some(p=>Math.hypot(p.x-center.x,p.y-center.y)<p.r+size*U))continue;
  if(![[0,0],[1,0],[1,1],[0,1],[.5,.5]].every(([dx,dz])=>{const key=(ix+dx)+':'+(iz+dz);if(classified.has(key))return classified.get(key);const p=toSaved({x:(ix+dx)*size,z:(iz+dz)*size},world),valid=zoneAt(state,p)==='farmland'&&world.sample(p.x,p.y).water==null;classified.set(key,valid);return valid;}))continue;
  cells.push({ix,iz});mask.add(ix+':'+iz);
 }
 const at=(x,y)=>{const p=toMetres({x,y},world);return mask.has(Math.floor(p.x/size)+':'+Math.floor(p.z/size));};
 return freeze({cellSize:size,cells,sample:(x,y)=>at(x,y)?'farmland':null,intersectsCircleWorldGame(x,y,r){const a=toMetres({x:x-r,y:y-r},world),b=toMetres({x:x+r,y:y+r},world);for(let ix=Math.floor(a.x/size);ix<=Math.floor(b.x/size);ix++)for(let iz=Math.floor(a.z/size);iz<=Math.floor(b.z/size);iz++)if(mask.has(ix+':'+iz))return true;return false;}});
}
export function buildSettlementReadView(input,world,{quality='normal',revision,terrainRevision='displayed-1',fieldCache}={}){
 const state=structuredClone(input),seed=world.options?.seed??world.seed??0;
 const key=(type,e)=>type+':'+(e.id??JSON.stringify([e.x,e.y,e.foundedTurn??0,e.foundedEra??0]));
 const houses=(state.houses||[]).map(h=>({key:key('house',h),identity:visualIdentity(seed,h),savedPosition:{x:h.x,y:h.y},yaw:-cottageBlueprint(h).orientation,foundedEra:h.foundedEra??0,foundedTurn:h.foundedTurn??0,parcel:h.parcel??null,actualEntrance:h.entrance??null}));
 const facilities=(state.buildings||[]).map(b=>({key:key(b.type,b),type:b.type,savedPosition:{x:b.x,y:b.y},yaw:facilityYaw(state,b),preferredVisualId:b.preferredVisualId??null}));
 const originals=new Map(previewTrees(world,260).map(t=>['tree:'+t.x+':'+t.z,t]));
 const retainedTrees=naturePlacements(world,state,{low:false}).map(p=>{const t=originals.get(p.key);return{key:p.key,savedPosition:{x:p.origin[0]+world.width/2,y:p.origin[2]+world.depth/2},heightGame:t?.h??22,clearanceRadiusGame:t?.r??6,canopyRadiusWorldGame:(t?.r??6)*2,protected:!!t?.protected,legacy:p};});
 const roads=(state.roadGraph?.segments?.length?graphLines(state.roadGraph):state.roads||[]).map((points,i)=>({key:'road:'+i,points,width:34}));
 const localLanes=(state.localLanes||[]).map((l,i)=>({key:'lane:'+i,points:l.points,width:5}));
 const approaches=visibleDesirePaths(state).map((p,i)=>({key:'desire:'+i,points:p.points||[p.from,p.to],width:4}));
 const fieldKey=JSON.stringify([state.zones,state.roads,state.roadGraph,terrainRevision]);let fields=fieldCache?.get(fieldKey);if(!fields){fields=fieldMask(state,world);fieldCache?.clear();fieldCache?.set(fieldKey,fields);}
 return freeze({schemaVersion:1,revision,world:{seed,width:world.width,depth:world.depth,terrainRevision},quality,houses,facilities,roads,localLanes,approaches,retainedTrees,retainedBoundaries:state.retainedBoundaries||[],committedFields:fields});
}
export function fallbackFootprints(view,state,world,legacyPlacements=new Map()){
 return [...view.houses,...view.facilities].map((e,i)=>{
  const original=i<view.houses.length?state.houses[i]:state.buildings[i-view.houses.length],p=legacyPlacements.get(e.key),b=e.type?buildingFootprint(e.type):cottageBlueprint(original),w=p?.width??b.width,d=p?.depth??b.depth,yaw=p?.yaw??e.yaw,c=Math.cos(yaw),s=Math.sin(yaw);
  const polygonWorldGame=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([x,z])=>({x:e.savedPosition.x+x*c+z*s,y:e.savedPosition.y-x*s+z*c}));return{key:e.key,polygonWorldGame,approach:p?.approach??null};
 });
}
function boundaryLine(points){
 // Each source fragment is a transformed four-corner rectangle. Retain its
 // longest edge direction, then union both quality envelopes in that frame.
 // An axis-aligned world bounding box loses the actual rotated fence span.
 let direction={x:1,z:0},longest=0;
 for(let start=0;start<points.length;start+=4)for(let i=0;i<4;i++){
  const a=points[start+i],b=points[start+(i+1)%4];if(!a||!b)continue;
  const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
  if(length>longest){longest=length;direction={x:dx/length,z:dz/length};}
 }
 const u=direction,n={x:-u.z,z:u.x},along=points.map(p=>p.x*u.x+p.z*u.z),across=points.map(p=>p.x*n.x+p.z*n.z),middle=(Math.min(...across)+Math.max(...across))/2;
 const at=d=>({x:u.x*d+n.x*middle,z:u.z*d+n.z*middle});
 return{a:at(Math.min(...along)),b:at(Math.max(...along))};
}
export function placementBridge(result,view,fallbacks){
 const rows=result.records,placements=[],exclusionsWorldGame=[];let complete=true;
 for(const r of rows){
  const legacy=fallbacks.find(p=>p.key===r.key),polygons=r.mode==='legacy'?(legacy?[{kind:'legacy',worldGame:legacy.polygonWorldGame,centeredMetres:legacy.polygonWorldGame.map(p=>toMetres(p,view.world))}]:[]):[...r.exclusions,...r.integralExclusions];
  const a=legacy?.approach,legacyCorridor=a?{kind:'legacy-actual-approach',worldGame:[{x:a.from.x-a.dy*1.2,y:a.from.y+a.dx*1.2},{x:a.to.x-a.dy*1.2,y:a.to.y+a.dx*1.2},{x:a.to.x+a.dy*1.2,y:a.to.y-a.dx*1.2},{x:a.from.x+a.dy*1.2,y:a.from.y-a.dx*1.2}]}:null;if(legacyCorridor)legacyCorridor.centeredMetres=legacyCorridor.worldGame.map(p=>toMetres(p,view.world));
  const corridors=r.mode==='legacy'?(legacyCorridor?[legacyCorridor]:[]):r.corridors||[];if(!polygons.length)complete=false;
  const fragments=new Map();for(const f of r.retainedBoundaryFragments||[]){const key=f.sourceNode;if(!fragments.has(key))fragments.set(key,[]);fragments.get(key).push(...f.centeredMetres);}
  const integralBoundariesMetres=[...fragments].map(([key,p])=>({key:r.key+':integral:'+key,ownerKey:r.key,...boundaryLine(p),kind:'fence-rail'}));
  placements.push({key:r.key,exclusionsMetres:polygons.map(p=>({kind:p.kind,polygon:p.centeredMetres})),corridorsMetres:corridors.map(p=>({kind:p.kind,polygon:p.centeredMetres})),integralBoundariesMetres});
  exclusionsWorldGame.push(...[...polygons,...corridors].map(p=>({polygon:p.worldGame})));
 }
 return {revision:view.revision,complete,placements,exclusionsWorldGame,groundInfluencesWorldGame:[]};
}
export function landscapeBridge(plan,view){return{revision:view.revision,complete:!!plan,exclusionsWorldGame:(plan?.occupancyExclusions||[]).flatMap(p=>p.polygon?[{polygon:p.polygon.map(p=>toSaved(p,view.world))}]:[])};}
