// A shared, read-only seat for authored footprints. Never moves saved sites or
// changes placement/economy decisions. Placement validation remains in simulation.
export function resolveFoundation(world,center,width,depth,orientation=0){
 const cs=Math.cos(orientation),sn=Math.sin(orientation);
 const corners=[[-width/2,-depth/2],[width/2,-depth/2],[width/2,depth/2],[-width/2,depth/2]]
  .map(([x,y])=>({x:center.x+x*cs-y*sn,y:center.y+x*sn+y*cs}));
 const perimeter=[];
 for(let i=0;i<4;i++){
  const a=corners[i],b=corners[(i+1)%4];
  const count=Math.max(4,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/3));
  const points=world.contactTrace?world.contactTrace(a,b):Array.from({length:count+1},(_,k)=>
   ({x:a.x+(b.x-a.x)*k/count,y:a.y+(b.y-a.y)*k/count}));
  perimeter.push(...points.slice(0,-1));
 }
 const contacts=perimeter.map(p=>({...p,...world.sample(p.x,p.y)}));
 const interior=world.drapePolygon?world.drapePolygon(corners).flat():[center];
 const heights=[...contacts.map(p=>p.height),...interior.map(p=>world.sample(p.x,p.y).height)];
 return{corners,perimeter:contacts,floor:Math.max(...heights)+.8,
  relief:Math.max(...heights)-Math.min(...heights),flooded:contacts.some(p=>p.water!==null)};
}
