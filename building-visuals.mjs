import {visualIdentity,HOME_IDS} from './asset-registry.mjs';
import {cottageBlueprint} from './settlement-architecture.mjs';
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
 return{from,to,distance,dx,dy,floor:placement.origin[1],samples};
}
