// Detached read-view example for P5 and tests. No simulation imports or ticks.
import {visualIdentity} from '../../asset-registry.mjs';
import {cottageBlueprint,buildingBlueprint,buildingFootprint} from '../../settlement-architecture.mjs';
const freeze=o=>{if(o&&typeof o==='object'){for(const v of Object.values(o))freeze(v);Object.freeze(o);}return o;};
export function facilityYaw(state,building){
 let approach=null,nearest=Infinity;
 for(const points of [...(state.roads||[]),...(state.localLanes||[]).map(l=>l.points||[])])for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((building.x-a.x)*dx+(building.y-a.y)*dy)/(dx*dx+dy*dy||1))),p={x:a.x+dx*t,y:a.y+dy*t},distance=Math.hypot(p.x-building.x,p.y-building.y);
  if(distance<nearest){nearest=distance;approach=p;}
 }
 return -(approach?Math.atan2(approach.y-building.y,approach.x-building.x)-Math.PI/2:buildingBlueprint(building).orientation);
}
export function snapshotForBuildings(state,world,revision='fixture-1',quality='normal'){
 const seed=world.options?.seed??world.seed??0;
 const houses=(state.houses||[]).map(h=>({key:'home:'+visualIdentity(seed,h),identity:visualIdentity(seed,h),savedPosition:{x:h.x,y:h.y},yaw:-cottageBlueprint(h).orientation,foundedEra:h.foundedEra??0,parcel:structuredClone(h.parcel??null),actualEntrance:structuredClone(h.entrance??null)}));
 const facilities=(state.buildings||[]).map(b=>({key:'facility:'+(b.id??`${b.type}:${b.x}:${b.y}`),type:b.type,savedPosition:{x:b.x,y:b.y},yaw:facilityYaw(state,b),preferredVisualId:null}));
 return freeze({schemaVersion:1,revision,world:{seed,width:world.width,depth:world.depth,terrainRevision:'displayed-fixture'},quality,houses,facilities,roads:(state.roads||[]).map(points=>({points:structuredClone(points),width:34})),localLanes:(state.localLanes||[]).map(l=>({...structuredClone(l),width:5})),approaches:[],committedFields:null,retainedTrees:[],retainedBoundaries:[]});
}
export function legacyExclusions(state,world,view){
 const rect=(p,w,d,yaw)=>{const c=Math.cos(yaw),s=Math.sin(yaw);return[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([x,z])=>({x:p.x+x*c+z*s,y:p.y-x*s+z*c}));};
 return [...view.houses.map((h,i)=>{const b=cottageBlueprint(state.houses[i]);return{key:h.key,polygonWorldGame:rect(h.savedPosition,b.width,b.depth,h.yaw)};}),...view.facilities.map(f=>{const b=buildingFootprint(f.type);return{key:f.key,polygonWorldGame:rect(f.savedPosition,b.width,b.depth,f.yaw)};})];
}
