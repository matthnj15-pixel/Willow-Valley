import {cottageBlueprint,buildingFootprint} from './settlement-architecture.mjs';
import {zoneAt} from './organic-world.mjs';
import {previewTrees} from './world-gen.mjs';
export function naturePlacements(world,state,{low=false}={}){
 const result=[];
 for(const tree of previewTrees(world,low?95:260)){
  const p={x:tree.x,y:tree.z},r=tree.r||6;
  if(world.sample(p.x,p.y).water!==null||zoneAt(state,p)==='farmland')continue;
  if((state.houses||[]).some(h=>{const b=cottageBlueprint(h);return Math.hypot(p.x-h.x,p.y-h.y)<Math.max(b.width,b.depth)*.72+r;}))continue;
  if((state.buildings||[]).some(b=>{const f=buildingFootprint(b.type);return Math.hypot(p.x-b.x,p.y-b.y)<Math.max(f.width,f.depth)*.72+r;}))continue;
  const lines=[...(state.roads||[]).map(points=>({points,width:17})),...(state.localLanes||[]).map(l=>({points:l.points||[],width:5})),...(state.houses||[]).filter(h=>h.entrance).map(h=>({points:[h,h.entrance],width:3}))];
  if(lines.some(line=>line.points.slice(1).some((b,i)=>{
   const a=line.points[i],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));
   return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t)<line.width+r;
  })))continue;
  result.push({key:`tree:${tree.x}:${tree.z}`,origin:[p.x-world.width/2,world.sample(p.x,p.y).height-.02,p.y-world.depth/2],scale:Math.min(tree.h/1.22624,r*2/.739648),yaw:(p.x+p.y)*.1});
 }
 return result;
}
