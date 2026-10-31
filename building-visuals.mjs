import {visualIdentity} from './asset-registry.mjs';
import {cottageBlueprint} from './settlement-architecture.mjs';
import {resolveFoundation} from './foundation-system.mjs';
// B3 catalog is deliberately limited to the two verified assemblies. No saved
// identity is written; C1 will use the complete architecture-v1 ordering.
export const B3_HOME_IDS=['home-long-ridge','home-steep-gable'];
export function homePlacement(world,house,entries){
 const style=cottageBlueprint(house),id=B3_HOME_IDS[visualIdentity(world.options?.seed??world.seed??0,house)%2];
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
