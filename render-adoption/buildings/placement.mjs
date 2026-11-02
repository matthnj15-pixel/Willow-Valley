// All polygons here use SAVED game X/Y; conversion to centered metres occurs
// only at the output boundary. Yaw follows Three's Y-up positive rotation.
import {HOME_IDS, visualIdentity} from '../../asset-registry.mjs';
import {buildingFootprint} from '../../settlement-architecture.mjs';
export const SCALE=2.8;
export function assetFor(entity,seed){
 if(!entity.type){
  // identity is the existing visualIdentity uint, not a fresh runtime hash.
  const id=HOME_IDS[entity.identity%HOME_IDS.length];
  return id||HOME_IDS[visualIdentity(seed,{id:entity.id,x:entity.savedPosition.x,y:entity.savedPosition.y,foundedEra:entity.foundedEra})%HOME_IDS.length];
 }
 if(['park','plaza'].includes(entity.type))return entity.preferredVisualId?.startsWith(entity.type+'-')?entity.preferredVisualId:entity.type==='park'?'park-village-green':'plaza-town-square';
 return 'facility-'+entity.type;
}
export function transformLocal(p,entity){const c=Math.cos(entity.yaw),s=Math.sin(entity.yaw);return{x:entity.savedPosition.x+SCALE*(p[0]*c+p[1]*s),y:entity.savedPosition.y+SCALE*(-p[0]*s+p[1]*c)};}
export const rectangle=(min,max)=>[[min[0],min.at(-1)],[max[0],min.at(-1)],[max[0],max.at(-1)],[min[0],max.at(-1)]];
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const on=(p,a,b)=>Math.abs(cross(a,b,p))<1e-7&&p.x>=Math.min(a.x,b.x)-1e-7&&p.x<=Math.max(a.x,b.x)+1e-7&&p.y>=Math.min(a.y,b.y)-1e-7&&p.y<=Math.max(a.y,b.y)+1e-7;
export function inside(p,ring){let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if(on(p,a,b))return true;if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes;}return yes;}
const properCross=(a,b,c,d)=>cross(a,b,c)*cross(a,b,d)<-1e-10&&cross(c,d,a)*cross(c,d,b)<-1e-10;
export function overlaps(a,b){return a.some(p=>inside(p,b))||b.some(p=>inside(p,a))||a.some((p,i)=>b.some((q,j)=>properCross(p,a[(i+1)%a.length],q,b[(j+1)%b.length])));}
export function fits(polygon,parcel){
 const outer=parcel.vertices,holes=parcel.holes||[];
 if(!polygon.every(p=>inside(p,outer))||holes.some(h=>overlaps(polygon,h.vertices||h)))return false;
 // Vertices alone fail for concave parcels. Reject crossings and test every
 // interval between parcel-edge contacts, including collinear notch mouths.
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length],times=[0,1];
  for(let j=0;j<outer.length;j++){
   const c=outer[j],d=outer[(j+1)%outer.length];if(properCross(a,b,c,d))return false;
   for(const p of [c,d])if(on(p,a,b)){const dx=b.x-a.x,dy=b.y-a.y;times.push(Math.abs(dx)>Math.abs(dy)?(p.x-a.x)/dx:(p.y-a.y)/dy);}
  }
  times.sort((a,b)=>a-b);for(let j=1;j<times.length;j++){const t=(times[j]+times[j-1])/2;if(!inside({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},outer))return false;}
 }
 return true;
}
export function corridor(a,b,width){const length=Math.hypot(b.x-a.x,b.y-a.y)||1,dx=-(b.y-a.y)/length*width/2,dy=(b.x-a.x)/length*width/2;return[{x:a.x+dx,y:a.y+dy},{x:b.x+dx,y:b.y+dy},{x:b.x-dx,y:b.y-dy},{x:a.x-dx,y:a.y-dy}];}
export function samples(polygon,surface){
 const points=[...polygon];
 for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],n=Math.ceil(Math.hypot(a.x-b.x,a.y-b.y));for(let k=1;k<n;k++)points.push({x:a.x+(b.x-a.x)*k/n,y:a.y+(b.y-a.y)*k/n});}
 if(surface.drapePolygon)points.push(...surface.drapePolygon(polygon).flat());
 const xs=polygon.map(p=>p.x),ys=polygon.map(p=>p.y);
 for(let x=Math.min(...xs);x<=Math.max(...xs);x+=2)for(let y=Math.min(...ys);y<=Math.max(...ys);y+=2)if(inside({x,y},polygon))points.push({x,y});
 return points;
}
export function admit(entity,entry,{world,terrainSurface,blockers=[],roads=[]},compact=false){
 if(!entity.type&&!entity.parcel)return {reason:'legacy-no-parcel'};
 const e=entry.metadata, stats=compact?entry.compact:entry;
 const polygon=rectangle(stats.boundsMin,stats.boundsMax).map(p=>transformLocal(p,entity));
 let parcel=entity.parcel;
 if(!parcel&&entity.type){const f=buildingFootprint(entity.type);parcel={vertices:rectangle([-f.width/SCALE/2,-f.depth/SCALE/2],[f.width/SCALE/2,f.depth/SCALE/2]).map(p=>transformLocal(p,entity))};}
 if(!parcel||!fits(polygon,parcel))return {reason:'full-envelope-outside-parcel'};
 const corridors=[];
 for(const a of [...(e.entrances||[]),...(e.detailAccess||[]),...(e.accessPoints||[]).filter(a=>a.kind==='stair-foot')]){
  const start=transformLocal([a.threshold[0],a.threshold[2]],entity),end=transformLocal([a.threshold[0]+a.forward[0]*(a.clearDepth||1),a.threshold[2]+a.forward[2]*(a.clearDepth||1)],entity);
  corridors.push({kind:a.kind||'door',polygon:corridor(start,end,(a.clearWidth||1)*SCALE)});
 }
 if(entity.actualEntrance){const a=e.accessPoints?.find(a=>a.kind==='stair-foot')||e.entrances?.[0];if(a){const start=transformLocal([a.threshold[0],a.threshold[2]],entity),length=Math.hypot(start.x-entity.actualEntrance.x,start.y-entity.actualEntrance.y);if(length>60)return {reason:'approach-too-long'};
  const seats=(e.structuralSeats||[]).map(s=>s.polygon.map(p=>transformLocal(p,entity)));
  for(let distance=1.2;distance<length;distance+=.5){const t=distance/length,p={x:start.x+(entity.actualEntrance.x-start.x)*t,y:start.y+(entity.actualEntrance.y-start.y)*t};if(seats.some(s=>inside(p,s)))return {reason:'approach-crosses-own-structure'};}
  if(length>.01)corridors.push({kind:'actual-approach',polygon:corridor(start,entity.actualEntrance,1.1*SCALE)});
 }}
 for(const p of [polygon,...corridors.map(c=>c.polygon)]){
  if(blockers.some(b=>b.key!==entity.key&&overlaps(p,b.polygon)))return {reason:'neighbor-or-corridor-collision'};
 }
 for(const road of roads){const pp=Array.isArray(road)?road:road.points||[];const width=road.width;if(!Number.isFinite(width))continue;for(let i=1;i<pp.length;i++)if(overlaps(polygon,corridor(pp[i-1],pp[i],width)))return {reason:'road-clearance'};}
 const points=[polygon,...corridors.map(c=>c.polygon)].flatMap(p=>samples(p,terrainSurface));
 const heights=[];for(const p of points){
  if(p.x<0||p.y<0||p.x>world.width||p.y>world.depth)return {reason:'world-edge'};
  const a=world.sample(p.x,p.y),s=terrainSurface.sample(p.x,p.y);
  if(a.water!=null||s.water!=null||!Number.isFinite(s.height))return {reason:'shoreline-or-invalid-contact'};
  const grade=world.slope?.(p.x,p.y)??0;if(!Number.isFinite(grade)||grade>.30)return {reason:'unsafe-grade'};heights.push(s.height);
 }
 const range=Math.max(...heights)-Math.min(...heights);
 if(range>(e.groundSpace?4.2:2.1))return {reason:'unsafe-displayed-grade'};
 const datum=e.groundDatum??-.12,originY=Math.max(...samples(polygon,terrainSurface).map(p=>terrainSurface.sample(p.x,p.y).height))-datum*SCALE;
 const worldGame=p=>({x:p.x,y:p.y}),centeredMetres=p=>({x:(p.x-world.width/2)/SCALE,z:(p.y-world.depth/2)/SCALE});
 const outputPolygon=p=>({worldGame:p.map(worldGame),centeredMetres:p.map(centeredMetres)});
 const supports=(e.supportPoints||[]).map(s=>{const p=transformLocal([s.contact[0],s.contact[2]],entity),terrainY=terrainSurface.sample(p.x,p.y).height;return {worldGame:{...p,height:terrainY},centeredMetres:{...centeredMetres(p),y:terrainY/SCALE},topGameY:originY+s.contact[1]*SCALE,extensionGameUnits:originY+s.contact[1]*SCALE-terrainY,widthMetres:s.width};});
 const envelope=(kind,p)=>({kind,...outputPolygon(p)});
 const exclusions=[envelope('full',polygon)];
 for(const [kind,env] of Object.entries(e.envelopes||{})){if(kind==='seat')for(const p of env)exclusions.push(envelope('seat',p.map(p=>transformLocal(p,entity))));else if(env?.polygon)exclusions.push(envelope(kind,env.polygon.map(p=>transformLocal(p,entity))));}
 return {key:entity.key,assetId:entry.id,variantId:entry.id,family:'C4',mode:compact?'compact':'full',scale:SCALE,yaw:entity.yaw,transform:{positionGame:[entity.savedPosition.x-world.width/2,originY,entity.savedPosition.y-world.depth/2],yaw:entity.yaw,scale:SCALE},levelFloorGameY:originY+(e.floorElevation||0)*SCALE,exclusions,corridors:corridors.map(c=>({kind:c.kind,...outputPolygon(c.polygon)})),supportContacts:supports,integralExclusions:[],polygon,originY};
}
