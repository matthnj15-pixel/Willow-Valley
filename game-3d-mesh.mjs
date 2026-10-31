import {roadJunctionPolygons} from "./road-junctions.mjs";
import {resolveFoundation} from "./foundation-system.mjs";
import {visibleDesirePaths} from "./desire-paths.mjs";
import {edgePoints,nodeAt,quadraticPoint} from "./road-network.mjs";
import {flattenRoadDraft,curvedSegments} from "./road-editor.mjs";
import {cottageBlueprint,buildingBlueprint} from "./settlement-architecture.mjs";
// Gameplay geometry shares the exact seeded world elevation and water mask.
// Every vertex is in the same WebGL coordinates as the World Builder.
// The temporary structural shapes will be replaced with Kenney Fantasy Town
// model assets without changing roads, zoning or save data.
const colors={
 road:[.73,.65,.49],roadEdge:[.48,.51,.36],path:[.60,.49,.34],
 residential:[.76,.61,.41],commercial:[.48,.64,.69],
 farmland:[.70,.68,.38],preserve:[.40,.59,.39],erase:[.71,.37,.29],
 wall:[.86,.78,.62],roof:[.50,.32,.25],
 farm:[.69,.58,.38],lumber:[.56,.38,.26],smith:[.39,.48,.48],
 park:[.39,.59,.40],plaza:[.70,.65,.51],market:[.78,.57,.35],granary:[.62,.46,.31]
};
const len=v=>Math.hypot(...v)||1;
function addTri(out,a,b,c,color){
 const u=b.map((v,i)=>v-a[i]),v=c.map((x,i)=>x-a[i]);
 const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
 const norm=n.map(x=>x/len(n));
 for(const p of [a,b,c])out.push(...p,...color,...norm);
}
function quad(out,a,b,c,d,color){addTri(out,a,b,c,color);addTri(out,a,c,d,color);}
function groundPolygon(out,world,points,color,offset){
 if(world.drapePolygon){
  for(const tri of world.drapePolygon(points)){
   const vertices=tri.map(p=>worldPos(world,p,offset));
   // All contact surfaces use upward normals, independent of path direction.
   const [a,b,c]=vertices;
   if((b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0])>0)vertices.reverse();
   addTri(out,...vertices,color);
  }
 }else for(let i=1;i+1<points.length;i++)
  addTri(out,worldPos(world,points[0],offset),worldPos(world,points[i],offset),worldPos(world,points[i+1],offset),color);
}
function worldPos(world,p,offset=2){
 const sample=world.sample(p.x,p.y);
 return[p.x-world.width/2,sample.height+offset,p.y-world.depth/2];
}
// Build terrain-following ribbons from a regularly sampled centerline.
// Sampling only the endpoint corners causes long straight roads to tunnel
// beneath hills and warp at changes in the elevation model.
export function terrainRibbon(out,world,points,width,color,offset=1.1,spacing=6){
 if(!Array.isArray(points)||points.length<2)return;
 const samples=[points[0]];
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.y-a.y);
  if(length<.01)continue;
  const count=Math.max(1,Math.ceil(length/spacing));
  for(let k=1;k<=count;k++){
   const t=k/count;
   samples.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
  }
 }
 if(samples.length<2)return;
 const cross=[];
 for(let i=0;i<samples.length;i++){
  const p=samples[i],before=samples[Math.max(0,i-1)],after=samples[Math.min(samples.length-1,i+1)];
  const dx=after.x-before.x,dy=after.y-before.y,length=Math.hypot(dx,dy)||1;
  const nx=-dy/length*width*.5,ny=dx/length*width*.5;
  cross.push([
   worldPos(world,{x:p.x+nx,y:p.y+ny},offset),
   worldPos(world,{x:p.x-nx,y:p.y-ny},offset)
  ]);
 }
 for(let i=1;i<cross.length;i++)
  groundPolygon(out,world,[cross[i-1][0],cross[i][0],cross[i][1],cross[i-1][1]]
   .map(p=>({x:p[0]+world.width/2,y:p[2]+world.depth/2})),color,offset);
}
function ribbon(out,world,points,width,color,offset=1.1){
 terrainRibbon(out,world,points,width,color,offset);
}
function block(out,world,p,width,depth,height,wall,roof,orientation=0,style={}){
 const cs=Math.cos(orientation),sn=Math.sin(orientation),x=width/2,z=depth/2;
 const position=(dx,dz)=>({
  x:p.x+dx*cs-dz*sn,
  y:p.y+dx*sn+dz*cs
 });
 const footprint=[[-x,-z],[x,-z],[x,z],[-x,z]];
 const foundation=resolveFoundation(world,p,width,depth,orientation);
 const floor=foundation.floor;
 const vert=(dx,y,dz)=>{
  const xy=position(dx,dz);
  return[xy.x-world.width/2,floor+y,xy.y-world.depth/2];
 };
 const stone=[.50,.47,.40];
 const contacts=foundation.perimeter;
 for(let i=0;i<contacts.length;i++){
  const a=contacts[i],b=contacts[(i+1)%contacts.length];
  const vertex=(q,y)=>[q.x-world.width/2,y,q.y-world.depth/2];
  quad(out,vertex(a,a.height-.4),vertex(b,b.height-.4),
   vertex(b,floor),vertex(a,floor),stone);
 }
 const a=vert(-x,0,-z),b=vert(x,0,-z),c=vert(x,0,z),d=vert(-x,0,z);
 const at=vert(-x,height,-z),bt=vert(x,height,-z),ct=vert(x,height,z),dt=vert(-x,height,z);
 quad(out,a,b,bt,at,wall);quad(out,b,c,ct,bt,wall);
 quad(out,c,d,dt,ct,wall);quad(out,d,a,at,dt,wall);
 const rise=Math.min(width,depth)*(style.roofRise??.62);
 const ridgeLeft=vert(0,height+rise,-z),ridgeRight=vert(0,height+rise,z);
 quad(out,at,bt,ridgeRight,ridgeLeft,roof);
 quad(out,dt,ct,ridgeRight,ridgeLeft,roof);
 addTri(out,at,ridgeLeft,bt,wall);addTri(out,dt,ct,ridgeRight,wall);
 if(style.chimney){
  const chimneyStone=[.44,.40,.35],h=height+rise+5;
  const c1=vert(width*.16,height+2,-depth*.23),
   c2=vert(width*.32,height+2,-depth*.23),
   c3=vert(width*.32,height+2,-depth*.10),
   c4=vert(width*.16,height+2,-depth*.10),
   u1=vert(width*.16,h,-depth*.23),u2=vert(width*.32,h,-depth*.23),
   u3=vert(width*.32,h,-depth*.10),u4=vert(width*.16,h,-depth*.10);
  quad(out,c1,c2,u2,u1,chimneyStone);quad(out,c2,c3,u3,u2,chimneyStone);
  quad(out,c3,c4,u4,u3,chimneyStone);quad(out,c4,c1,u1,u4,chimneyStone);
  quad(out,u1,u2,u3,u4,[.30,.29,.27]);
 }
 if(style.porch){
  const wood=[.45,.33,.24],w=Math.min(6,width*.30);
  quad(out,vert(-w,height*.47,depth/2),vert(w,height*.47,depth/2),
   vert(w,height*.47,depth/2+6),vert(-w,height*.47,depth/2+6),wood);
 }
}
// Road handles are lightweight ground discs rather than towering 3D prisms.
// They remain transient editor decorations, never persistent infrastructure.
function beacon(out,world,p,radius,color,outline=[.17,.29,.25],height=11){
 const n=16,outer=radius,inner=radius*.72;
 const center=worldPos(world,p,3.2);
 const point=(r,t)=>worldPos(world,{
  x:p.x+Math.cos(t)*r,y:p.y+Math.sin(t)*r
 },3.2);
 for(let i=0;i<n;i++){
  const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2;
  addTri(out,center,point(inner,b),point(inner,a),color);
  quad(out,point(inner,b),point(outer,b),point(outer,a),point(inner,a),outline);
 }
}

const curvePoints=(a,c,b,steps=18)=>Array.from({length:steps+1},(_,i)=>quadraticPoint(a,c,b,i/steps));
export function settlementGeometry(world,state,{
 draft=null,zoneStrokes=[],zoneType="residential",zoneRadius=54,
 zoneEdits=null,mode="explore",liveCurve=null,liveGesture=null,pendingControl=null,touchFocus=null
}={}){
 const surfaces=[],zones=[],markers=[],roadGuides=[];
 const zonePalette={...colors};
 const paint=new Map(),step=20;
 function applyStroke(points,radius,type){
  for(const p of points)for(let dx=-radius;dx<=radius;dx+=step)for(let dy=-radius;dy<=radius;dy+=step){
   if(dx*dx+dy*dy>radius*radius)continue;
   const x=Math.floor((p.x+dx)/step),y=Math.floor((p.y+dy)/step);
   const center={x:(x+.5)*step,y:(y+.5)*step};
   if(center.x<0||center.y<0||center.x>world.width||center.y>world.depth)continue;
   if(world.sample(center.x,center.y).water!==null)continue;
   if((state.roads||[]).some(line=>line.some((point,i)=>{
    if(!i)return false;
    const a=line[i-1],b=point,vx=b.x-a.x,vy=b.y-a.y;
    const t=Math.max(0,Math.min(1,((center.x-a.x)*vx+(center.y-a.y)*vy)/(vx*vx+vy*vy||1)));
    return Math.hypot(center.x-a.x-vx*t,center.y-a.y-vy*t)<17;
   })))continue;
   paint.set(x+","+y,{x,y,type});
  }
 }
 for(const stroke of state.zones||[])applyStroke(stroke.points,stroke.radius,stroke.type);
 const pending=zoneEdits||zoneStrokes.map(points=>({type:zoneType,radius:zoneRadius,points}));
 for(const edit of pending)applyStroke(edit.points,edit.radius,edit.type);
 let drawn=0;
 for(const p of paint.values()){
  if(p.type==="erase"||drawn++>12000)continue;
  const x=p.x*step,y=p.y*step;
  const corners=[[x,y],[x+step,y],[x+step,y+step],[x,y+step]].map(([xx,yy])=>
   worldPos(world,{x:xx,y:yy},.35));
  quad(zones,...corners,zonePalette[p.type]||colors.residential);
 }
 for(const lane of state.localLanes||[])if(lane.points?.length>1){
   ribbon(surfaces,world,lane.points,5,colors.path,.85);
   if(lane.foundedTurn===state.turn)ribbon(roadGuides,world,lane.points,2.5,[.99,.77,.4],4);
  }
 for(const trail of visibleDesirePaths(state)){
  const line=trail.points||[trail.from,trail.to];
  if(line.length>1)ribbon(surfaces,world,line,4,colors.path,.8);
 }
 const graph=state.roadGraph;
 if(graph?.segments?.length){
  const network=roadJunctionPolygons(graph,liveCurve);
  for(const polygon of network.shoulders)groundPolygon(surfaces,world,polygon,colors.roadEdge,.95);
  for(const polygon of network.pavement)groundPolygon(surfaces,world,polygon,colors.road,1.3);
  if(liveCurve){
   const e=graph.segments.find(e=>e.id===liveCurve.id);
   const a=e&&nodeAt(graph,e.a),b=e&&nodeAt(graph,e.b);
   if(a&&b)ribbon(roadGuides,world,curvePoints(a,liveCurve.control,b),13,[.99,.77,.34],4.8);
  }
 }else for(const road of state.roads||[]){
  if(road.length<2)continue;
  ribbon(surfaces,world,road,34,colors.roadEdge,.95);
  ribbon(surfaces,world,road,24,colors.road,1.3);
 }
 for(const house of state.houses||[]){
   const style=cottageBlueprint(house);
   block(markers,world,house,style.width,style.depth,style.height,style.wall,style.roof,style.orientation,style);
   if(house.foundedTurn===state.turn&&house.parcel?.vertices?.length>2)
    ribbon(roadGuides,world,[...house.parcel.vertices,house.parcel.vertices[0]],2.5,[1,.80,.37],4);
  }
 for(const building of state.buildings||[]){
  const material=colors[building.type]||colors.wall;
  const size=building.type==="farm"?48:building.type==="market"?48:building.type==="granary"?32:35;
  const height=building.type==="granary"?40:building.type==="market"?29:building.type==="lumber"?27:24;
  const style=buildingBlueprint(building,state.civic?.chapter||0);
   block(markers,world,building,size,size*.9,height,material,colors.roof,style.orientation,style);
 }
 if(mode==="road"){
  if(touchFocus&&Number.isFinite(touchFocus.x)&&Number.isFinite(touchFocus.y))
   beacon(roadGuides,world,touchFocus,5,[1,.91,.61],[.32,.42,.30],7);
  if(graph){
   for(const n of graph.nodes)beacon(roadGuides,world,n,n.id===graph.hubId?8:6,
    n.id===graph.hubId?[.97,.72,.37]:[.86,.94,.77]);
   for(const e of graph.segments){
    if(!e.control)continue;
    const a=nodeAt(graph,e.a),b=nodeAt(graph,e.b);
    if(a&&b)beacon(roadGuides,world,quadraticPoint(a,liveCurve?.id===e.id?liveCurve.control:e.control,b,.5),
      7,[1,.58,.26],[.38,.24,.16],15);
   }
  }
  const draftLine=draft?.anchors?.length>1?flattenRoadDraft(draft):[];
  if(draftLine.length>1){
   ribbon(roadGuides,world,draftLine,26,[.99,.72,.37],5);
   ribbon(roadGuides,world,draftLine,12,[1,.90,.58],5.7);
  }
  for(const p of draft?.anchors||[])beacon(roadGuides,world,p,7,[1,.91,.60],[.36,.33,.22],13);
  for(const bend of draft?curvedSegments(draft):[])
   beacon(roadGuides,world,bend.anchor,7,[1,.67,.32],[.42,.25,.12],15);
  if(pendingControl&&draft?.anchors?.length){
   const anchor=draft.anchors.at(-1);
   ribbon(roadGuides,world,[anchor,pendingControl],3,[1,.82,.48],10);
   beacon(roadGuides,world,pendingControl,7,[1,.57,.21],[.4,.22,.1],16);
  }
  if(liveGesture){
   const {start,end,control}=liveGesture;
   if(start&&end&&control){
    const shape=curvePoints(start,control,end);
    if(Math.hypot(end.x-start.x,end.y-start.y)>8)
     ribbon(roadGuides,world,shape,14,[.99,.77,.37],6);
    ribbon(roadGuides,world,[end,control],3,[.99,.85,.55],11);
    beacon(roadGuides,world,end,7,[1,.94,.66],[.31,.35,.22],16);
    beacon(roadGuides,world,control,7,[1,.55,.22],[.39,.22,.12],16);
   }
  }
 }
 return{surfaces:new Float32Array(surfaces),zones:new Float32Array(zones),
  structures:new Float32Array(markers),guides:new Float32Array(roadGuides),
  counts:{roads:(state.roads||[]).length,houses:(state.houses||[]).length,
   buildings:(state.buildings||[]).length,zonedCells:drawn,guideTriangles:roadGuides.length/27}};
}
