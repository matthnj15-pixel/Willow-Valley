// WV-WORLD-001 early organic settlement: paint permissions and deterministic site choice.
// World coordinates are renderer-independent. Full terrain mesh is a later slice.
export const ZONE_TYPES=["residential","commercial","farmland","preserve"];
export const BRUSH_RADIUS=54;
const WIDTH=1200,HEIGHT=900;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const rnd=n=>{const v=Math.sin(n*38.217+14.57)*43758.5453;return v-Math.floor(v);};
const pointOK=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=WIDTH&&p.y>=0&&p.y<=HEIGHT;
export function validZones(zones){return zones===undefined||Array.isArray(zones)&&zones.length<=120&&zones.every(z=>
 Number.isSafeInteger(z.id)&&z.id>0&&ZONE_TYPES.includes(z.type)&&Number.isFinite(z.radius)&&z.radius>=24&&z.radius<=90&&
 Array.isArray(z.points)&&z.points.length>=1&&z.points.length<=180&&z.points.every(pointOK)
);}
export function zoneAt(s,p){
 let latest=null;
 for(const z of s.zones||[])if(z.points.some(q=>dist(p,q)<=z.radius))latest=z.type;
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
 if(type==="erase"){
  const before=next.length;
  for(let k=next.length-1;k>=0;k--)if(next[k].points.some(q=>strokes.some(line=>line.some(p=>dist(p,q)<radius+next[k].radius))))next.splice(k,1);
  s.zones=next;return{ok:true,count:before-next.length};
 }
 if(next.length+strokes.length>120)return{ok:false,reason:"Too many zoning strokes. Erase or combine regions."};
 // Nature preserves take precedence; overlapping incompatible zones are not accepted silently.
 for(const line of strokes)for(const p of line)for(const old of next){
  if(old.type===type)continue;
  if(old.points.some(q=>dist(p,q)<radius+old.radius-4))
   return{ok:false,reason:"This stroke overlaps another land use. Erase that zone first."};
 }
 let id=next.reduce((n,z)=>Math.max(n,z.id),0);
 for(const line of strokes)next.push({id:++id,type,radius,points:line.map(p=>({x:Math.round(p.x),y:Math.round(p.y)}))});
 s.zones=next;return{ok:true,count:strokes.length};
}
// Terrain is an analytic heightfield. It drives suitability and will drive 3D vertex elevations.
export function riverX(y){return 875-90*Math.sin((y+80)/145)+35*Math.sin(y/66);}
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
export function terrainSuitable(p,buffer=0){
 if(!pointOK(p)||p.x<25+buffer||p.y<30+buffer||p.x>WIDTH-25-buffer||p.y>HEIGHT-30-buffer)return false;
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
export function candidateParcel(center,key){
 const orientation=rnd(key+2)*Math.PI*2,rx=34+rnd(key+3)*15,ry=35+rnd(key+4)*18;
 const vertices=Array.from({length:7},(_,i)=>{
  const a=orientation+i*Math.PI*2/7;
  const variation=.90+rnd(key+11+i*19)*.20;
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
 if(!isInZone(s,p,"residential")||!terrainSuitable(p,15))return false;
 for(const v of parcel.vertices)if(!isInZone(s,v,"residential")||!terrainSuitable(v,2))return false;
 if((s.buildings||[]).some(b=>dist(p,b)<Math.max(parcel.rx,parcel.ry)+39))return false;
 for(const house of s.houses||[]){
  const old=house.parcel?.vertices;
  if(old&&intersects(parcel.vertices,old))return false;
  if(dist(p,house)<Math.max(parcel.rx,parcel.ry)+(old?11:31))return false;
 }
 return true;
}
function routeSafe(points){
 for(let k=1;k<points.length;k++){
  const a=points[k-1],b=points[k];
  for(let j=1;j<=14;j++){
   const q={x:a.x+(b.x-a.x)*j/14,y:a.y+(b.y-a.y)*j/14};
   if(!pointOK(q)||Math.abs(q.x-riverX(q.y))<68||slopeAt(q.x,q.y)>.55)return false;
  }
 }
 return true;
}
function accessLane(p,nearest,key){
 const end=nearest.point;
 for(let k=0;k<7;k++){
  const t=(k===0?0:(k%2?1:-1)*8*Math.ceil(k/2)),mid={x:(p.x+end.x)/2,y:(p.y+end.y)/2};
  const delta={x:end.x-p.x,y:end.y-p.y},length=Math.hypot(delta.x,delta.y)||1;
  const elbow={x:mid.x-delta.y/length*t,y:mid.y+delta.x/length*t};
  const points=[{x:p.x,y:p.y},elbow,{x:end.x,y:end.y}];
  if(routeSafe(points))return points.map(q=>({x:Math.round(q.x),y:Math.round(q.y)}));
 }
 return null;
}
export function findCottageSite(s){
 const residential=(s.zones||[]).filter(z=>z.type==="residential");
 let attempt=0;
 for(const zone of residential)for(const point of zone.points){
  for(let i=0;i<55;i++){
   const key=s.turn*991+zone.id*187+attempt++*43;
   const angle=rnd(key+1)*Math.PI*2,spread=zone.radius*.23*rnd(key+5);
   const p={x:Math.round(point.x+Math.cos(angle)*spread),y:Math.round(point.y+Math.sin(angle)*spread)};
   const parcel=candidateParcel(p,key);
   if(!parcelFits(s,p,parcel))continue;
   const road=distanceToRoad(p,s.roads);
   if(!road||road.distance>165)continue;
   const lane=accessLane(p,road,key);
   if(!lane)continue;
   return{house:{x:p.x,y:p.y,orientation:parcel.orientation,
    parcel:{vertices:parcel.vertices,orientation:parcel.orientation}},
    lane:{points:lane,houseX:p.x,houseY:p.y},distanceToRoad:road.distance};
  }
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
