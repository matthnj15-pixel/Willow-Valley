import {zoneAt} from './organic-world.mjs';
import {visualIdentity,HOME_IDS} from './asset-registry.mjs';
import {cottageBlueprint,buildingFootprint,buildingBlueprint} from './settlement-architecture.mjs';
import {resolveFoundation} from './foundation-system.mjs';
export function homePlacement(world,house,entries,preferredID=null){
 const style=cottageBlueprint(house),id=preferredID??HOME_IDS[visualIdentity(world.options?.seed??world.seed??0,house)%HOME_IDS.length];
 const entry=entries.find(e=>e.id===id);if(!entry)return null;
 const extent=[0,1,2].map(i=>Math.max(Math.abs(entry.boundsMin[i]),Math.abs(entry.boundsMax[i]))*2);
 const scale=Math.min((style.width-1)/extent[0],(style.depth-1)/extent[2],style.height);
 if(!Number.isFinite(scale)||scale<=0)return null;
 const cs=Math.cos(style.orientation),sn=Math.sin(style.orientation);
 const transform=(x,z)=>({x:house.x+(x*cs-z*sn)*scale,y:house.y+(x*sn+z*cs)*scale});
 const polygon=house.parcel?.vertices;
 const inside=p=>{
  let yes=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
   const a=polygon[i],b=polygon[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes;
  }return yes;
 };
 const footprint=[[-extent[0]/2,-extent[2]/2],[extent[0]/2,-extent[2]/2],[extent[0]/2,extent[2]/2],[-extent[0]/2,extent[2]/2]].map(([x,z])=>transform(x,z));
 if(polygon?.length>2&&!footprint.every(inside))return null;
 const foundation=resolveFoundation(world,house,extent[0]*scale,extent[2]*scale,style.orientation);
 if(foundation.flooded)return null;
 const entrance=transform(entry.entrance.position[0],entry.entrance.position[2]);
 return {id,scale,width:extent[0]*scale,depth:extent[2]*scale,yaw:-style.orientation,origin:[house.x-world.width/2,foundation.floor,house.y-world.depth/2],entrance,footprint};
}

// Cosmetic access only. A connector never creates a lane or modifies routing.
export function homeApproach(world,house,placement){
 const from=placement?.entrance,to=house.entrance;if(!from||!to)return null;
 const distance=Math.hypot(to.x-from.x,to.y-from.y);if(distance<.5||distance>60)return null;
 const dx=(to.x-from.x)/distance,dy=(to.y-from.y)/distance;
 const count=Math.ceil(distance/2)+1;
 const samples=Array.from({length:count},(_,i)=>{
  const t=i/(count-1);return{x:from.x+dx*distance*t,y:from.y+dy*distance*t};
 });
 for(const p of samples)for(const side of [-1,0,1]){
  const x=p.x-dy*side,y=p.y+dx*side;
  if(x<0||y<0||x>world.width||y>world.depth||world.sample(x,y).water!==null)return null;
 }
 return{from,to,distance,dx,dy,floor:placement.origin[1]+(placement.entranceHeight||0),samples};
}

export const WORKING_FACILITIES=['farm','lumber','smith','granary'];
export const PUBLIC_FACILITIES=['market','plaza','park'];
export const FACILITY_TYPES=[...WORKING_FACILITIES,...PUBLIC_FACILITIES];
export function facilityPlacement(world,building,state,entries){
 const entry=entries.find(e=>e.id==='facility-'+building.type);if(!entry)return null;
 const envelope=buildingFootprint(building.type),extent=[0,1,2].map(i=>Math.max(Math.abs(entry.boundsMin[i]),Math.abs(entry.boundsMax[i]))*2);
 let approach=null,nearest=Infinity;
 for(const line of [...(state.roads||[]),...(state.localLanes||[]).map(l=>l.points||[])])for(let i=1;i<line.length;i++){
  const a=line[i-1],b=line[i],dx=b.x-a.x,dy=b.y-a.y;
  const t=Math.max(0,Math.min(1,((building.x-a.x)*dx+(building.y-a.y)*dy)/(dx*dx+dy*dy||1)));
  const p={x:a.x+dx*t,y:a.y+dy*t},distance=Math.hypot(p.x-building.x,p.y-building.y);
  if(distance<nearest){nearest=distance;approach=p;}
 }
 const orientation=approach?Math.atan2(approach.y-building.y,approach.x-building.x)-Math.PI/2:buildingBlueprint(building).orientation;
 const scale=Math.min((envelope.width-2)/extent[0],(envelope.depth-2)/extent[2],48/(entry.boundsMax[1]-entry.boundsMin[1]));
 const width=extent[0]*scale,depth=extent[2]*scale,foundation=resolveFoundation(world,building,width,depth,orientation);
 if(foundation.flooded||!Number.isFinite(scale)||scale<=0)return null;
 const [ex,,ez]=entry.entrance.position,cs=Math.cos(orientation),sn=Math.sin(orientation);
 const foundationRects=entry.foundationRects?.map(([x,z,w,d])=>({x:building.x+(x*cs-z*sn)*scale,y:building.y+(x*sn+z*cs)*scale,width:w*scale,depth:d*scale}));
 return{id:entry.id,type:building.type,groundSpace:entry.groundSpace,scale,width,depth,foundationRects,entranceHeight:entry.entrance.position[1]*scale,yaw:-orientation,origin:[building.x-world.width/2,foundation.floor,building.y-world.depth/2],
  entrance:{x:building.x+(ex*cs-ez*sn)*scale,y:building.y+(ex*sn+ez*cs)*scale},approachTarget:approach};
}

// Derive static display rows from committed farmland only. No owned fields,
// crop growth, resource yield or preview strokes are invented here.
export function farmlandRows(world,state){
 const farms=(state.buildings||[]).filter(b=>b.type==='farm'),seen=new Set(),rows=[];
 for(const farm of farms)for(let x=Math.ceil((farm.x-92)/12)*12;x<=farm.x+92;x+=12)for(let y=Math.ceil((farm.y-92)/12)*12;y<=farm.y+92;y+=12){
  const key=x+','+y;if(seen.has(key))continue;seen.add(key);
  if(Math.hypot(x-farm.x,y-farm.y)>92)continue;
  if((state.houses||[]).some(h=>Math.hypot(h.x-x,h.y-y)<20))continue;
  if((state.buildings||[]).some(b=>Math.hypot(b.x-x,b.y-y)<Math.max(buildingFootprint(b.type).width,buildingFootprint(b.type).depth)*.72))continue;
  const contacts=[{x:x-4,y:y-4},{x:x+4,y:y-4},{x:x+4,y:y+4},{x:x-4,y:y+4},{x,y}];
  if(contacts.some(p=>p.x<0||p.y<0||p.x>world.width||p.y>world.depth||zoneAt(state,p)!=='farmland'||world.sample(p.x,p.y).water!==null))continue;
  const blocked=[...(state.roads||[]).map(points=>({points,radius:18})),...(state.localLanes||[]).map(l=>({points:l.points||[],radius:7}))].some(line=>line.points.slice(1).some((b,i)=>{
   const a=line.points[i],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1)));
   return Math.hypot(x-a.x-dx*t,y-a.y-dy*t)<line.radius;
  }));
  if(!blocked)rows.push({x,y});
 }
 return rows;
}
