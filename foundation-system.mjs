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

// Placement policy is explicit and analytic. This is called by placement,
// never by a renderer, so visual quality cannot alter simulation outcomes.
export function validateFoundationSite(world,center,width,depth,orientation=0,{maxSlope=.6,blocked=()=>false}={}){
 if(!world)return{ok:true};
 const cs=Math.cos(orientation),sn=Math.sin(orientation),heights=[];
 const nx=Math.max(1,Math.ceil(width/3)),ny=Math.max(1,Math.ceil(depth/3));
 for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
  const dx=(i/nx-.5)*width,dy=(j/ny-.5)*depth;
  const x=center.x+dx*cs-dy*sn,y=center.y+dx*sn+dy*cs;
  if(x<0||y<0||x>world.width||y>world.depth)
   return{ok:false,reason:'Keep the entire building footprint inside the map.'};
  if(blocked({x,y}))return{ok:false,reason:"This footprint obstructs an existing road or access path. Leave the route clear."};
  const contact=world.sample(x,y);
  if(contact.water!==null)return{ok:false,reason:'Part of this building site is flooded. Choose dry land for the whole footprint.'};
  if(world.slope(x,y)>maxSlope)return{ok:false,reason:'Part of this building site is too steep for a safe foundation.'};
  heights.push(contact.height);
 }
 if(Math.max(...heights)-Math.min(...heights)>Math.min(width,depth)*maxSlope)
  return{ok:false,reason:'This site needs an excessive foundation. Choose a more level location.'};
 return{ok:true};
}
