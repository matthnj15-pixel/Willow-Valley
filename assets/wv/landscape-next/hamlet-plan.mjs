// Detached art study, in visual metres. Never passed to simulation or saves.
// A holding grows from a frontage; the inherited lane and earlier homes persist.
export const HAMLET_REVISION = 'inhabited-hamlet-1';
export const METRES_TO_GAME = 2.8;
export const HAMLET_STAGES = Object.freeze([4, 12, 30]);
const HOME_IDS = ['home-steep-gable','home-low-hip','home-porch-cabin','home-long-ridge','home-offset-gables'];
export function keyedUnit(key) {
 let h=2166136261; for(const c of String(key)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);} return(h>>>0)/4294967296;
}
export const transformPoint = (p, origin, yaw=0) => {
 const c=Math.cos(yaw),s=Math.sin(yaw);
 return {x:origin.x+p.x*c+p.z*s,z:origin.z-p.x*s+p.z*c};
};
export const rectangle = (x,z,w,d,yaw=0) => [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([a,b])=>transformPoint({x:a,z:b},{x,z},yaw));
export function pointInPolygon(p, poly) {
 let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j]; if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)yes=!yes;
 }return yes;
}
export function segmentDistance(p,a,b) {
 const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));
 return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);
}
export const lineDistance=(p,points)=>Math.min(...points.slice(1).map((b,i)=>segmentDistance(p,points[i],b)));
export function atStation(points,station) {
 let left=station;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],d=Math.hypot(b.x-a.x,b.z-a.z);
  if(left<=d||i===points.length-1){const t=Math.min(1,left/d);return{x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,dx:(b.x-a.x)/d,dz:(b.z-a.z)/d};}left-=d;
 }
 throw Error('A lane needs two points');
}
const lane=(key,stage,width,xy)=>({key,stage,width,points:xy.map(([x,z])=>({x,z})),kind:'lane'});
const LANES=[
 lane('old-bend',4,2.65,[[-73,27],[-64,20],[-45,12],[-27,5],[-10,0],[8,0],[26,-4],[46,-12],[65,-27]]),
 lane('brook-lane',4,1.9,[[12,-1],[18,12],[34,23],[51,24],[67,34]]),
 lane('farm-track',4,2.1,[[-45,12],[-54,-9],[-52,-24],[-49,-41],[-61,-58]]),
 lane('north-croft',30,1.8,[[-42,10],[-48,-12],[-32,-32],[-5,-39],[22,-37],[43,-42],[59,-51]]),
 lane('south-croft',30,1.7,[[-35,8],[-42,32],[-18,48],[5,51],[27,50],[50,49],[76,54],[77,31]])
];
// Frontage stations are composed, not a jittered row/column lattice.
// Side, setback and width vary with the road, green and adjoining holdings.
const HOLDINGS=[
 ['old-bend',72,-1,8.3,9.2,4],['old-bend',89,-1,8.8,10.2,4],
 ['old-bend',59,1,8.7,8.8,4],['brook-lane',17,1,8.4,9.2,4],
 ['old-bend',50,-1,8.6,9.8,12],['old-bend',48,1,9,9.1,12],
 ['old-bend',102,-1,8.9,10.1,12],['old-bend',115,-1,8.6,9.6,12],
 ['old-bend',118,1,9.3,10.2,12],['brook-lane',34,1,8.9,10,12],
 ['brook-lane',34,-1,8.4,8.6,12],['brook-lane',55,1,9,9.6,12],
 ['old-bend',146,-1,8.9,9.4,30],['old-bend',145,1,9.5,9.8,30],
 ['old-bend',23,-1,8.7,9.3,30],['old-bend',9,-1,9.5,9.5,30],
 ['brook-lane',68,-1,8.8,9.5,30],['brook-lane',68,1,8.9,9.8,30],
 ['north-croft',34,1,8.1,8.9,30],['north-croft',49,1,8,9.6,30],
 ['north-croft',65,1,8.4,9.4,30],['north-croft',82,1,8.8,9.8,30],
 ['north-croft',98,1,8.6,9.4,30],['north-croft',116,1,8.4,9.6,30],
 ['south-croft',33,1,8.6,9,30],['south-croft',48,1,8.7,9.4,30],
 ['south-croft',64,1,8.8,9.3,30],['south-croft',81,1,8.9,9.5,30],
 ['south-croft',99,1,8.7,9.3,30],['south-croft',118,1,8.8,9.5,30]
];
function holding(row,index,seed){
 const [laneKey,station,side,setback,width,stage]=row,route=LANES.find(l=>l.key===laneKey),p=atStation(route.points,station);
 const origin={x:p.x-p.dz*side*setback,z:p.z+p.dx*side*setback};
 const yaw=Math.atan2(p.x-origin.x,p.z-origin.z),key='holding-'+String(index+1).padStart(2,'0');
 const assetId=HOME_IDS[index%HOME_IDS.length];
 const use=index%5===0?'orchard':index%4===0?'work-yard':'kitchen-garden';
 const rear=use==='orchard'?11:use==='work-yard'?7.5:9.2;
 const local=q=>transformPoint(q,origin,yaw),gate={x:p.x-p.dz*side*(route.width/2+.10),z:p.z+p.dx*side*(route.width/2+.10)};
 return{key,stage,assetId,origin,yaw,laneKey,station,side,width,use,roofFootprint:rectangle(origin.x,origin.z,7.8,8.3,yaw),
  polygon:[[-width/2,5.8],[width/2,5.8],[width/2,-rear-1.4],[-width/2,-rear-1.4]].map(([x,z])=>local({x,z})),
  garden:{center:local({x:0,z:-rear*.72}),width:width-1.8,depth:use==='work-yard'?3.2:4.8,yaw},
  gate,entrance:local({x:0,z:3.3}),approach:[local({x:0,z:3.3}),local({x:0,z:5.2}),gate],
  stableVariant:keyedUnit(seed+':'+key),source:'detached-reference-holding'};
}
export function createHamletPlan({stage=12,seed='WV-INHABITED-01'}={}){
 if(!HAMLET_STAGES.includes(Number(stage)))throw Error('Hamlet stage must be 4, 12 or 30');
 stage=Number(stage);
 const all=HOLDINGS.map((r,i)=>holding(r,i,seed)),holdings=all.filter(h=>h.stage<=stage);
 const lanes=LANES.filter(l=>l.stage<=stage).map(l=>({...l,points:l.points.map(p=>({...p}))}));
 const buildings=[
  {key:'barn',assetId:'facility-farm',origin:{x:-45.7,z:-25},yaw:.1,stage:4,kind:'farm',yard:rectangle(-47,-17,13,12,.1)},
  {key:'smith',assetId:'facility-smith',origin:{x:-49,z:28},yaw:-2.0,stage:12,kind:'smith',yard:rectangle(-49,24,13,13,-.3)},
  {key:'market',assetId:'facility-market',origin:{x:0,z:12.5},yaw:Math.PI,stage:12,kind:'market',yard:rectangle(0,10,11,5)},
  {key:'grain-store',assetId:'facility-granary',origin:{x:-42,z:-43},yaw:.15,stage:12,kind:'granary',yard:rectangle(-43,-37,12,8)},
  {key:'wood-yard',assetId:'facility-lumber',origin:{x:63,z:-58},yaw:-.5,stage:30,kind:'lumber',yard:rectangle(61,-52,14,12,-.5)}
 ].filter(b=>b.stage<=stage);
 const paths=[...holdings.map(h=>({key:h.key+':door',kind:'approach',width:1.1,points:h.approach})),
  {key:'green-access',kind:'path',width:1.5,points:[{x:-9,z:0},{x:-8.5,z:4.5},{x:-7,z:7.5},{x:0,z:8},{x:12,z:1}]},
  ...buildings.filter(b=>b.kind==='smith').map(b=>({key:b.key+':access',kind:'approach',width:2.4,points:[{x:-45,z:22},{x:-45,z:15}]})),
  ...buildings.filter(b=>b.kind==='farm').map(b=>({key:b.key+':access',kind:'approach',width:2.4,points:[{x:-49,z:-20},{x:-52,z:-17}]})),
  ...buildings.filter(b=>b.kind==='granary').map(b=>({key:b.key+':access',kind:'approach',width:2.4,points:[{x:-52,z:-37},{x:-50,z:-35}]})),
  ...buildings.filter(b=>b.kind==='lumber').map(b=>({key:b.key+':access',kind:'approach',width:2.4,points:[{x:56,z:-46},{x:56,z:-48}]}))];
 paths.push({key:'field-gate',kind:'path',width:1.6,points:[{x:-52,z:-24},{x:-61,z:-26}]});
 const regions=[{key:'paddock',kind:'common',polygon:[{x:-41,z:-14},{x:-24,z:-22},{x:-17,z:-34},{x:-38,z:-39}]},{key:'common',kind:'common',polygon:rectangle(-1,6.5,13,10.5,-.08)},
  {key:'barn-field',kind:'field',polygon:[{x:-78,z:-13},{x:-60,z:-15},{x:-59,z:-43},{x:-77,z:-49}]},
  {key:'north-field',kind:stage>=12?'field':'meadow',polygon:[{x:-39,z:-50},{x:-18,z:-57},{x:-8,z:-68},{x:-38,z:-65}]}];
 for(const h of holdings){regions.push({key:h.key+':holding',kind:'holding',polygon:h.polygon});regions.push({key:h.key+':yard',kind:'yard',polygon:[[-2,1.5],[1.7,1.4],[2,4.2],[-1.5,5.1],[-2.4,3.5]].map(([x,z])=>transformPoint({x,z},h.origin,h.yaw))});regions.push({key:h.key+':'+h.use,kind:h.use==='work-yard'?'yard':'garden',polygon:rectangle(h.garden.center.x,h.garden.center.z,h.garden.width,h.garden.depth,h.yaw),holdingKey:h.key});}
 for(const b of buildings)regions.push({key:b.key+':yard',kind:'work',polygon:b.yard});
 return{revision:HAMLET_REVISION,status:'gallery-review',runtimeReady:false,source:'authored reference composition; no simulation state',seed,stage,width:180,depth:164,holdings,buildings,lanes,paths,regions,
  features:[{key:'shared-well',kind:'well',origin:{x:-6,z:5},yaw:.2},{key:'green-bench',kind:'bench',origin:{x:4,z:8},yaw:-.2}],
  markers:[{key:'green',label:'The shared green',x:-2,z:7},{key:'gardens',label:'Household gardens',x:6,z:-18},{key:'farm',label:'Fields & farmyard',x:-54,z:-32},{key:'edge',label:'The woodland edge',x:52,z:-33}],
  camera:{overview:{x:0,z:0,zoom:stage===30?160:stage===4?102:124},green:{x:0,z:8,zoom:58},gardens:{x:8,z:-11,zoom:75},farm:{x:-48,z:-31,zoom:82}}};
}
export function hamletHeight(x,z){
 const outer=Math.min(36,Math.max(0,Math.hypot(x*.8,z)-54));
 return .32*Math.sin(x/33)*Math.cos(z/31)+.12*Math.cos(z/19)+outer*outer*.0035;
}
// Spatial control regions belong to this review. They confer no routing rights.
export function createHamletUseIndex(plan,{cellSize=8}={}){
 const cells=new Map(),shapes=[];
 function add(shape,points,pad=0){
  const bounds={minX:Math.min(...points.map(p=>p.x))-pad,maxX:Math.max(...points.map(p=>p.x))+pad,minZ:Math.min(...points.map(p=>p.z))-pad,maxZ:Math.max(...points.map(p=>p.z))+pad};
  const item={...shape,bounds};shapes.push(item);
  for(let x=Math.floor(bounds.minX/cellSize);x<=Math.floor(bounds.maxX/cellSize);x++)for(let z=Math.floor(bounds.minZ/cellSize);z<=Math.floor(bounds.maxZ/cellSize);z++){const key=x+':'+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(item);}
 }
 for(const r of plan.regions)add(r,r.polygon,.65);
 for(const l of [...plan.lanes,...plan.paths])add(l,l.points,l.width/2+.8);
 const rank={seat:9,holding:1,common:1,meadow:1,field:2,garden:3,yard:4,work:5,path:6,approach:7,lane:8};
 return{query(x,z){const p={x,z};let kind='meadow',strength=0,priority=0;
  for(const s of cells.get(Math.floor(x/cellSize)+':'+Math.floor(z/cellSize))||[]){let amount=0;
   if(s.polygon)amount=pointInPolygon(p,s.polygon)?1:Math.max(0,1-Math.min(...s.polygon.map((a,i)=>segmentDistance(p,a,s.polygon[(i+1)%s.polygon.length])))/.38);else{const d=lineDistance(p,s.points);amount=Math.max(0,Math.min(1,(s.width/2+.45-d)/.65));}
   if(amount>0&&(rank[s.kind]>priority||rank[s.kind]===priority&&amount>strength)){kind=s.kind;strength=amount;priority=rank[s.kind]||0;}
  }return{kind,strength};},shapes,cells:cells.size};
}
// Exact b--d terrain triangle contact for this detached review's fixed mesh.
// Quality changes materials/props/LODs, so the displayed ground and contacts stay stable.
export function displayedHamletHeight(x,z){
 const w=180*2.1,d=164*2.1,nx=40,nz=36,sx=w/nx,sz=d/nz;
 const gx=Math.max(0,Math.min(nx,(x+w/2)/sx)),gz=Math.max(0,Math.min(nz,(z+d/2)/sz));
 const i=Math.min(nx-1,Math.floor(gx)),j=Math.min(nz-1,Math.floor(gz)),u=gx-i,v=gz-j;
 const a=hamletHeight(i*sx-w/2,j*sz-d/2),b=hamletHeight((i+1)*sx-w/2,j*sz-d/2),c=hamletHeight((i+1)*sx-w/2,(j+1)*sz-d/2),e=hamletHeight(i*sx-w/2,(j+1)*sz-d/2);
 return(u+v<=1?a+(b-a)*u+(e-a)*v:c+(e-c)*(1-u)+(b-c)*(1-v))-.012;
}
export function polygonsOverlap(a,b,margin=0){
 for(const p of [a,b])for(let i=0;i<p.length;i++){
  const u=p[i],v=p[(i+1)%p.length],nx=v.z-u.z,nz=u.x-v.x,pa=a.map(q=>q.x*nx+q.z*nz),pb=b.map(q=>q.x*nx+q.z*nz),pad=margin*Math.hypot(nx,nz);
  if(Math.max(...pa)<Math.min(...pb)+pad||Math.max(...pb)<Math.min(...pa)+pad)return false;
 }return true;
}
export function laneCorridors(line){return line.points.slice(1).map((b,i)=>{const a=line.points[i],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz),nx=-dz/d*line.width/2,nz=dx/d*line.width/2;return[{x:a.x+nx,z:a.z+nz},{x:b.x+nx,z:b.z+nz},{x:b.x-nx,z:b.z-nz},{x:a.x-nx,z:a.z-nz}];});}
