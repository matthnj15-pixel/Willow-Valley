// WV-WORLD-001 early organic settlement: paint permissions and deterministic site choice.
// World coordinates are renderer-independent. Full terrain mesh is a later slice.
import {createWorld,normalizeWorldSettings} from "./world-gen.mjs";
const worldModels=new Map();
function modelFor(s){
 if(!s?.worldOptions)return null;
 const opts=normalizeWorldSettings(s.worldOptions),key=JSON.stringify(opts);
 if(!worldModels.has(key))worldModels.set(key,createWorld(opts));
 return worldModels.get(key);
}
export const ZONE_TYPES=["residential","commercial","farmland","preserve"];
export const BRUSH_RADIUS=54;
let WIDTH=1200,HEIGHT=900;
export function configureOrganicBounds(w,h){WIDTH=w;HEIGHT=h;}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const rnd=n=>{const v=Math.sin(n*38.217+14.57)*43758.5453;return v-Math.floor(v);};
const pointOK=(p,bounds={w:WIDTH,h:HEIGHT})=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=bounds.w&&p.y>=0&&p.y<=bounds.h;
// Built streets have a 32-unit cartographic right-of-way. The watercourse
// has a 122-unit bank-to-bank band. Paint permissions use these same edges.
export const ROAD_PAINT_HALF_WIDTH=17;
export const RIVER_PAINT_HALF_WIDTH=61;
export function riverX(y){return 875-90*Math.sin((y+80)/145)+35*Math.sin(y/66);}
const paintCross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
function crossesRoad(a,b,roads){
 for(const line of roads||[])for(let i=1;i<line.length;i++){
  const c=line[i-1],d=line[i];
  const ab1=paintCross(a,b,c),ab2=paintCross(a,b,d),cd1=paintCross(c,d,a),cd2=paintCross(c,d,b);
  if(ab1*ab2<0&&cd1*cd2<0)return true;
 }
 return false;
}
function paintOnLand(s,p){
 if(!pointOK(p))return false;
 const model=modelFor(s);
 if(model){if(model.sample(p.x,p.y).water!==null||model.slope(p.x,p.y)>1.1)return false;}
 else if(Math.abs(p.x-riverX(p.y))<RIVER_PAINT_HALF_WIDTH)return false;
 if((s.roads||[]).length){
  const road=distanceToRoad(p,s.roads);
  if(road&&road.distance<ROAD_PAINT_HALF_WIDTH)return false;
 }
 return true;
}
export function paintCellReachable(s,stamp,cell){
 if(!paintOnLand(s,cell)||!paintOnLand(s,stamp))return false;
 // Stop a brush footprint at the water's bank instead of leaking across.
 const model=modelFor(s);
 if(model){
  const steps=Math.ceil(dist(stamp,cell)/10);
  for(let i=1;i<steps;i++){
   const p={x:stamp.x+(cell.x-stamp.x)*i/steps,y:stamp.y+(cell.y-stamp.y)*i/steps};
   if(model.sample(p.x,p.y).water!==null)return false;
  }
 }else if((stamp.x-riverX(stamp.y))*(cell.x-riverX(cell.y))<0)return false;
 // The actual road centerline divides each brush dab into separate sides.
 if(crossesRoad(stamp,cell,s.roads))return false;
 return true;
}
export function validZones(zones,bounds={w:WIDTH,h:HEIGHT}){return zones===undefined||Array.isArray(zones)&&zones.length<=120&&zones.every(z=>
 Number.isSafeInteger(z.id)&&z.id>0&&(ZONE_TYPES.includes(z.type)||z.type==="erase")&&
 Number.isFinite(z.radius)&&z.radius>=24&&z.radius<=90&&
 Array.isArray(z.points)&&z.points.length>=1&&z.points.length<=180&&z.points.every(p=>pointOK(p,bounds))
);}
export function zoneAt(s,p){
 if(!paintOnLand(s,p))return null;
 let latest=null;
 for(const z of s.zones||[])for(const q of z.points){
  if(dist(p,q)>z.radius||!paintCellReachable(s,q,p))continue;
  latest=z.type==="erase"?null:z.type;
  break;
 }
 return latest;
}
export function isInZone(s,p,type){return zoneAt(s,p)===type;}
export function paintZones(s,type,strokes,radius=BRUSH_RADIUS){
 if(type!=="erase"&&!ZONE_TYPES.includes(type))return{ok:false,reason:"Choose a land-use category."};
 if(!Array.isArray(strokes)||!strokes.length||!Number.isFinite(radius)||radius<24||radius>90)
  return{ok:false,reason:"Paint a valid area first."};
 if(strokes.some(line=>!Array.isArray(line)||!line.length||line.length>180||line.some(p=>!pointOK(p))))
  return{ok:false,reason:"Brush path must stay inside the valley."};
 const next=(s.zones||[]).slice();
 if(next.length+strokes.length>120)return{ok:false,reason:"Zoning history is full. Use fewer, longer strokes or export your settlement."};
 if(type!=="erase"){
  // Compare the actual painted land, not circular bounding boxes. Different
  // land uses may meet cleanly on opposite sides of a street or river.
  const fractions=[[0,0],[.5,0],[-.5,0],[0,.5],[0,-.5],
   [.7,.7],[-.7,.7],[.7,-.7],[-.7,-.7]];
  for(const line of strokes)for(const stamp of line)for(const [fx,fy] of fractions){
   const p={x:stamp.x+fx*radius,y:stamp.y+fy*radius};
   if(dist(p,stamp)>radius||!paintCellReachable(s,stamp,p))continue;
   const existing=zoneAt(s,p);
   if(existing&&existing!==type)
    return{ok:false,reason:"This area has a different land use. Erase its edge first."};
  }
 }
 let id=next.reduce((n,z)=>Math.max(n,z.id),0);
 for(const line of strokes)next.push({id:++id,type,radius,points:line.map(p=>({x:Math.round(p.x),y:Math.round(p.y)}))});
 s.zones=next;
 return{ok:true,count:strokes.length};
}
// A zoning session can freely mix brushes, erasers and land-use changes.
// Evaluate operations against a disposable copy, then commit exactly once.
// A failed operation must never partially change an existing save slot.
export function applyZoneEdits(state,edits,{commit=false}={}){
 if(!Array.isArray(edits)||!edits.length)return{ok:false,reason:"Paint or erase an area first."};
 const pending={...state,zones:(state.zones||[]).slice()};
 let count=0;
 for(const edit of edits){
  if(!edit||!Array.isArray(edit.points)||!edit.points.length)
   return{ok:false,reason:"Invalid pending zoning stroke."};
  const result=paintZones(pending,edit.type,[edit.points],edit.radius);
  if(!result.ok)return result;
  count++;
 }
 if(commit)state.zones=pending.zones;
 return{ok:true,count,zones:pending.zones};
}
// Terrain is an analytic heightfield. It drives suitability and will drive 3D vertex elevations.

export function elevationAt(x,y){
 const hills=18*Math.sin(x/165)*Math.cos(y/210)+9*Math.sin((x+y)/93)+7*Math.cos((x-y)/125);
 const ridge= y<235 ? 52*Math.pow((235-y)/235,2)*(.65+.35*Math.sin(x/95)**2):0;
 return hills+ridge;
}
export function slopeAt(x,y){
 const step=9;return Math.hypot((elevationAt(x+step,y)-elevationAt(x-step,y))/(step*2),
  (elevationAt(x,y+step)-elevationAt(x,y-step))/(step*2));
}
export function treeSites(){
 const out=[];
 for(let i=0;i<190;i++){
  const x=18+rnd(i+200)*1160,y=10+rnd(i+510)*875;
  if((x>135&&x<730&&y>275&&y<660)||Math.abs(x-riverX(y))<77)continue;
  out.push({x,y,r:8+rnd(i+840)*12});
 }
 return out;
}
const TREES=treeSites();
export function terrainSuitable(p,buffer=0,s=null){
 if(!pointOK(p)||p.x<25+buffer||p.y<30+buffer||p.x>WIDTH-25-buffer||p.y>HEIGHT-30-buffer)return false;
 const model=modelFor(s);
 if(model){
  const samples=[[0,0],[buffer,0],[-buffer,0],[0,buffer],[0,-buffer]];
  if(samples.some(([dx,dy])=>model.sample(p.x+dx,p.y+dy).water!==null))return false;
  if(model.slope(p.x,p.y)>.55)return false;
  return true;
 }
 if(Math.abs(p.x-riverX(p.y))<76+buffer)return false;
 if(slopeAt(p.x,p.y)>.46)return false;
 if(TREES.some(tree=>dist(p,tree)<tree.r+buffer*.55))return false;
 return true;
}
export function distanceToRoad(p,roads){
 let best=null;
 for(const line of roads||[])for(let i=1;i<line.length;i++){
  const a=line[i-1],b=line[i],v={x:b.x-a.x,y:b.y-a.y},ll=v.x*v.x+v.y*v.y;
  const t=ll?clamp(((p.x-a.x)*v.x+(p.y-a.y)*v.y)/ll,0,1):0;
  const q={x:a.x+v.x*t,y:a.y+v.y*t},d=dist(p,q);
  if(!best||d<best.distance)best={point:q,distance:d,segment:[a,b]};
 }
 return best;
}
export function candidateParcel(center,key,frontageAngle=null){
 // Plots loosely follow nearby streets, with individual offsets and widths.
 const rawOrientation=frontageAngle===null?rnd(key+2)*Math.PI*2:
  frontageAngle+(rnd(key+2)-.5)*.72;
 const orientation=((rawOrientation%(Math.PI*2))+(Math.PI*2))%(Math.PI*2);
 const rx=31+rnd(key+3)*27,ry=30+rnd(key+4)*26;
 const sides=5+Math.floor(rnd(key+9)*4);
 const vertices=Array.from({length:sides},(_,i)=>{
  const a=orientation+i*Math.PI*2/sides;
  const variation=.80+rnd(key+11+i*19)*.42;
  const vx=Math.cos(a)*rx*variation,vy=Math.sin(a)*ry*variation;
  return{x:Math.round(center.x+vx),y:Math.round(center.y+vy)};
 });
 return{vertices,orientation:Number(orientation.toFixed(4)),rx,ry};
}
const cross=(p,a,b)=>((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x));
function insidePoly(p,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
 const a=polygon[i],b=polygon[j];
 if(((a.y>p.y)!==(b.y>p.y))&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
 }return inside;}
function intersects(a,b){
 for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){
  const p=a[i],p2=a[(i+1)%a.length],q=b[j],q2=b[(j+1)%b.length];
  const c1=cross(q,p,p2),c2=cross(q2,p,p2),d1=cross(p,q,q2),d2=cross(p2,q,q2);
  if(c1*c2<0&&d1*d2<0)return true;
 }
 return insidePoly(a[0],b)||insidePoly(b[0],a);
}
export function parcelFits(s,p,parcel){
 if(!isInZone(s,p,"residential")||!terrainSuitable(p,15,s))return false;
 // Check the entire perimeter. Checking vertices alone lets long polygon
 // edges bridge lakes, steep ground or unpainted parcels.
 for(let i=0;i<parcel.vertices.length;i++){
  const a=parcel.vertices[i],b=parcel.vertices[(i+1)%parcel.vertices.length],d=dist(a,b);
  for(let t=0;t<=Math.ceil(d/8);t++){
   const q={x:a.x+(b.x-a.x)*t/Math.max(1,Math.ceil(d/8)),
    y:a.y+(b.y-a.y)*t/Math.max(1,Math.ceil(d/8))};
   if(!isInZone(s,q,"residential")||!terrainSuitable(q,2,s))return false;
  }
 }
 if((s.buildings||[]).some(b=>dist(p,b)<Math.max(parcel.rx,parcel.ry)+39))return false;
 for(const house of s.houses||[]){
  const old=house.parcel?.vertices;
  if(old&&intersects(parcel.vertices,old))return false;
  if(dist(p,house)<Math.max(parcel.rx,parcel.ry)+(old?11:31))return false;
 }
 // A vacant strip is not a lot if its footprint would erase an existing
 // neighborhood lane or overlap a major road's physical corridor.
 const corridors=[...(s.roads||[]).map(points=>({points,buffer:16})),
   ...(s.localLanes||[]).map(lane=>({points:lane.points,buffer:7}))];
 for(const {points,buffer} of corridors)for(const v of parcel.vertices){
  const near=distanceToRoad(v,[points]);
  if(near&&near.distance<buffer)return false;
 }
 for(const {points} of corridors)for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],steps=Math.ceil(dist(a,b)/9);
  for(let j=0;j<=steps;j++){
   const t=j/Math.max(steps,1),q={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
   if(insidePoly(q,parcel.vertices))return false;
  }
 }
 return true;
}
// Pedestrian routes follow a fixed, reproducible terrain grid. The search cost
// affects the chosen path, not turn timing or any renderer frame rate.
const FOOT_STEP=15;
export function canWalkAt(s,p){
 if(!pointOK(p)||p.x<8||p.y<8||p.x>WIDTH-8||p.y>HEIGHT-8)return false;
 const model=modelFor(s);
 if(model){if(model.sample(p.x,p.y).water!==null||model.slope(p.x,p.y)>.75)return false;}
 else if(Math.abs(p.x-riverX(p.y))<72||slopeAt(p.x,p.y)>.55)return false;
 if(zoneAt(s,p)==="preserve")return false;
 if(TREES.some(tree=>dist(p,tree)<tree.r+4))return false;
 if((s.buildings||[]).some(b=>dist(p,b)<28))return false;
 for(const h of s.houses||[]){
  if(dist(p,h)<24)return false;
  if(h.parcel?.vertices&&insidePoly(p,h.parcel.vertices))return false;
 }
 return true;
}
function walkSegment(s,a,b){
 const len=dist(a,b);
 for(let i=0;i<=Math.ceil(len/7);i++){
  const t=i/Math.max(1,Math.ceil(len/7));
  const p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
  if(!canWalkAt(s,p))return false;
 }
 const model=modelFor(s);
 return model?Math.abs(model.sample(a.x,a.y).height-model.sample(b.x,b.y).height)/Math.max(len,1)<=.55:
 Math.abs(elevationAt(a.x,a.y)-elevationAt(b.x,b.y))/Math.max(len,1)<=.55;
}
function smoothWalk(s,points){
 const out=[points[0]];
 for(let i=0;i<points.length-1;){
  let j=points.length-1;
  while(j>i+1&&!walkSegment(s,points[i],points[j]))j--;
  if(!walkSegment(s,points[i],points[j]))return null;
  out.push(points[j]);i=j;
 }
 return out.map(p=>({x:Math.round(p.x),y:Math.round(p.y)}));
}
// The search is bounded near the trip, avoids diagonal corner-cutting and
// never smooths a detour back through an obstacle. Returns null if unsafe.
export function routeFootpath(s,start,end){
 if(!canWalkAt(s,start)||!canWalkAt(s,end))return null;
 if(walkSegment(s,start,end))return smoothWalk(s,[start,end]);
 const buffer=Math.max(110,Math.min(250,dist(start,end)*.55));
 const minX=Math.max(0,Math.min(start.x,end.x)-buffer),maxX=Math.min(WIDTH,Math.max(start.x,end.x)+buffer);
 const minY=Math.max(0,Math.min(start.y,end.y)-buffer),maxY=Math.min(HEIGHT,Math.max(start.y,end.y)+buffer);
 const sx=Math.round(start.x/FOOT_STEP),sy=Math.round(start.y/FOOT_STEP),root=sx+","+sy;
 const open=[root],nodes=new Map([[root,{x:start.x,y:start.y,g:0,
  f:dist(start,end),parent:null,gx:sx,gy:sy}]]),closed=new Set();
 const offsets=[[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[-1,-1],[1,-1]];
 let found=null;
 for(let expanded=0;open.length&&expanded<2600;expanded++){
  let best=0;
  for(let i=1;i<open.length;i++){
   const a=nodes.get(open[i]),b=nodes.get(open[best]);
   if(a.f<b.f-1e-8||Math.abs(a.f-b.f)<1e-8&&open[i]<open[best])best=i;
  }
  const id=open.splice(best,1)[0],current=nodes.get(id);
  if(closed.has(id))continue;
  closed.add(id);
  if(dist(current,end)<=FOOT_STEP*2&&walkSegment(s,current,end)){found=id;break;}
  for(const [dx,dy]of offsets){
   const gx=current.gx+dx,gy=current.gy+dy,key=gx+","+gy;
   if(closed.has(key))continue;
   const next={x:gx*FOOT_STEP,y:gy*FOOT_STEP};
   if(next.x<minX||next.x>maxX||next.y<minY||next.y>maxY)continue;
   if(!walkSegment(s,current,next))continue;
   const g=current.g+dist(current,next)+Math.max(0,elevationAt(next.x,next.y)-elevationAt(current.x,current.y))*.5;
   if(g>=(nodes.get(key)?.g??Infinity))continue;
   nodes.set(key,{...next,g,f:g+dist(next,end),parent:id,gx,gy});
   open.push(key);
  }
 }
 if(!found)return null;
 const path=[end];let key=found;
 while(key!==null){const step=nodes.get(key);path.push({x:step.x,y:step.y});key=step.parent;}
 path.reverse();
 return smoothWalk(s,path);
}
// Existing tracks and footpaths guide new cottages. Settlement growth follows
// where people already walk, but never overwrites the player's main roads.
function neighborhoodDestinations(s,center){
 const targets=[],road=distanceToRoad(center,s.roads);
 if(road&&road.distance<=180)targets.push({...road,kind:"road"});
 for(const lane of s.localLanes||[]){
  // The first point of older saves may be underneath its own house. Choose
  // accessible points on the public walking lane, never a private doorstep.
  if(!Array.isArray(lane.points)||lane.points.length<2)continue;
  const near=distanceToRoad(center,[lane.points]);
  if(near&&near.distance<=145&&canWalkAt(s,near.point))
   targets.push({...near,kind:"lane"});
 }
 return targets.sort((a,b)=>a.distance-b.distance||
  (a.kind==="lane"?-1:1));
}
function parcelEntranceCandidates(center,parcel,target){
 const gates=[];
 for(let i=0;i<parcel.vertices.length;i++){
  const a=parcel.vertices[i],b=parcel.vertices[(i+1)%parcel.vertices.length];
  // Exit at the middle of a real irregular plot edge; not from the house
  // center, since the public path must remain usable AFTER the cottage exists.
  const midpoint={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
  const vx=midpoint.x-center.x,vy=midpoint.y-center.y;
  const d=Math.hypot(vx,vy)||1;
  const point={x:Math.round(midpoint.x+vx/d*9),y:Math.round(midpoint.y+vy/d*9)};
  if(!insidePoly(point,parcel.vertices))gates.push(point);
 }
 return gates.sort((a,b)=>dist(a,target)-dist(b,target));
}
function cottageApproach(s,center,parcel){
 const virtualHome={x:center.x,y:center.y,parcel:{vertices:parcel.vertices}};
 const blocked={...s,houses:[...(s.houses||[]),virtualHome]};
 for(const destination of neighborhoodDestinations(s,center)){
  for(const entrance of parcelEntranceCandidates(center,parcel,destination.point).slice(0,4)){
   if(!canWalkAt(blocked,entrance))continue;
   const route=routeFootpath(blocked,entrance,destination.point);
   if(route&&route.length>=2&&route.length<=24)
    return{lane:{points:route,houseX:center.x,houseY:center.y,
      entrance,connectsTo:destination.kind},entrance,kind:destination.kind};
  }
 }
 return null;
}
function establishedNeighborDistance(s,p){
 let nearest=Infinity;
 for(const h of s.houses||[])nearest=Math.min(nearest,dist(p,h));
 return nearest;
}
export function findCottageSite(s){
 const residential=(s.zones||[]).filter(z=>z.type==="residential");
 const viable=[];let attempt=0;
 for(const zone of residential)for(const point of zone.points){
  for(let i=0;i<72;i++){
   const key=s.turn*991+zone.id*187+attempt++*43;
   const angle=rnd(key+1)*Math.PI*2,spread=zone.radius*.88*Math.sqrt(rnd(key+5));
   const p={x:Math.round(point.x+Math.cos(angle)*spread),y:Math.round(point.y+Math.sin(angle)*spread)};
   const road=distanceToRoad(p,s.roads);
   if(!road||road.distance>180)continue;
   const roadAngle=Math.atan2(road.point.y-p.y,road.point.x-p.x)+Math.PI/2;
   const parcel=candidateParcel(p,key,roadAngle);
   if(!parcelFits(s,p,parcel))continue;
   // Historical accretion: favour sensible loose clusters and established
   // walking corridors, not the first arbitrary legal site or a lot grid.
   const neighbor=establishedNeighborDistance(s,p);
   const lane=distanceToRoad(p,(s.localLanes||[]).map(l=>l.points));
   const pathDistance=Math.min(road.distance,lane?.distance??Infinity);
   const score=Math.abs(Math.min(neighbor,300)-125)*.42+
     pathDistance*.33+(modelFor(s)?.slope(p.x,p.y)??slopeAt(p.x,p.y))*28+rnd(key+18)*18;
   viable.push({p,parcel,key,score});
  }
 }
 viable.sort((a,b)=>a.score-b.score||a.key-b.key);
 // Test several distinct good sites; paths can fail around steep ground,
 // protected features or existing parcel corners.
 for(const {p,parcel} of viable.slice(0,30)){
  const approach=cottageApproach(s,p,parcel);
  if(!approach)continue;
  return{house:{x:p.x,y:p.y,orientation:parcel.orientation,
    foundedTurn:s.turn,foundedEra:s.civic?.chapter||0,entrance:approach.entrance,
    parcel:{vertices:parcel.vertices,orientation:parcel.orientation}},
    lane:{...approach.lane,foundedTurn:s.turn},distanceToRoad:distanceToRoad(p,s.roads)?.distance??Infinity,
    growthReason:approach.kind==="lane"?"Along an established village footpath":"Near a town collector"};
 }
 return null;
}
export function viableLotEstimate(s,limit=12){
 // Conservative estimate: each valid whole parcel consumes land. This is an
 // opportunity indicator, never a guarantee every individual painted pixel is buildable.
 const temp={...s,houses:s.houses.slice()},seen=[];
 for(let i=0;i<limit;i++){
  const site=findCottageSite({...temp,turn:s.turn+i});
  if(!site)break;
  temp.houses.push(site.house);seen.push(site.house);
 }
 return seen.length;
}
