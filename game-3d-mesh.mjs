import {visibleDesirePaths} from "./desire-paths.mjs";
import {edgePoints,nodeAt,quadraticPoint} from "./road-network.mjs";
import {flattenRoadDraft,curvedSegments} from "./road-editor.mjs";
// Gameplay geometry shares the exact seeded world elevation and water mask.
// Every vertex is in the same WebGL coordinates as the World Builder.
// The temporary structural shapes will be replaced with Kenney Fantasy Town
// model assets without changing roads, zoning or save data.
const colors={
 road:[.73,.65,.49],roadEdge:[.40,.49,.39],path:[.60,.49,.34],
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
function worldPos(world,p,offset=2){
 const sample=world.sample(p.x,p.y);
 return[p.x-world.width/2,sample.height+offset,p.y-world.depth/2];
}
function ribbon(out,world,points,width,color,offset=2){
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy);
  if(l<.1)continue;
  const px=-dy/l*width/2,py=dx/l*width/2;
  const leftA={x:a.x+px,y:a.y+py},rightA={x:a.x-px,y:a.y-py};
  const leftB={x:b.x+px,y:b.y+py},rightB={x:b.x-px,y:b.y-py};
  const corner=[leftA,leftB,rightB,rightA].map(p=>worldPos(world,p,offset));
  quad(out,...corner,color);
 }
}
function block(out,world,p,width,depth,height,wall,roof,orientation=0){
 const c=worldPos(world,p,0),angle=orientation,cs=Math.cos(angle),sn=Math.sin(angle);
 function vert(dx,y,dz){
  return[c[0]+dx*cs-dz*sn,c[1]+y,c[2]+dx*sn+dz*cs];
 }
 const x=width/2,z=depth/2;
 const a=vert(-x,1,-z),b=vert(x,1,-z),cc=vert(x,1,z),d=vert(-x,1,z);
 const at=vert(-x,height,-z),bt=vert(x,height,-z),ct=vert(x,height,z),dt=vert(-x,height,z);
 quad(out,a,b,bt,at,wall);quad(out,b,cc,ct,bt,wall);
 quad(out,cc,d,dt,ct,wall);quad(out,d,a,at,dt,wall);
 const ridgeLeft=vert(0,height+Math.min(width,depth)*.62,-z);
 const ridgeRight=vert(0,height+Math.min(width,depth)*.62,z);
 quad(out,at,bt,ridgeRight,ridgeLeft,roof);
 quad(out,dt,ct,ridgeRight,ridgeLeft,roof);
 addTri(out,at,ridgeLeft,bt,wall);addTri(out,dt,ct,ridgeRight,wall);
}
// Road edit beacons are genuine 3D prisms above the terrain; the legacy
// SVG nodes cannot be seen on top of the WebGL world.
function beacon(out,world,p,radius,color,outline=[.17,.29,.25],height=11){
 const center=worldPos(world,p,4),N=10;
 function ring(r,y){
  return Array.from({length:N},(_,i)=>{
   const angle=2*Math.PI*i/N;
   return[center[0]+Math.cos(angle)*r,center[1]+y,center[2]+Math.sin(angle)*r];
  });
 }
 const floor=ring(radius*1.18,0),edge=ring(radius,height),
  lip=ring(radius*.73,height+2),top=[center[0],center[1]+height+2,center[2]];
 for(let i=0;i<N;i++){
  const j=(i+1)%N;
  quad(out,floor[i],floor[j],edge[j],edge[i],outline);
  quad(out,edge[i],edge[j],lip[j],lip[i],color);
  addTri(out,lip[i],lip[j],top,color);
 }
}
const curvePoints=(a,c,b,steps=18)=>Array.from({length:steps+1},(_,i)=>quadraticPoint(a,c,b,i/steps));
export function settlementGeometry(world,state,{
 draft=null,zoneStrokes=[],zoneType="residential",zoneRadius=54,
 zoneEdits=null,mode="explore",liveCurve=null,liveGesture=null,pendingControl=null
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
   worldPos(world,{x:xx,y:yy},2.3));
  quad(zones,...corners,zonePalette[p.type]||colors.residential);
 }
 for(const lane of state.localLanes||[])if(lane.points?.length>1)ribbon(surfaces,world,lane.points,5,colors.path,2.2);
 for(const trail of visibleDesirePaths(state)){
  const line=trail.points||[trail.from,trail.to];
  if(line.length>1)ribbon(surfaces,world,line,4,colors.path,1.8);
 }
 const graph=state.roadGraph;
 if(graph?.segments?.length){
  for(const e of graph.segments){
   const a=nodeAt(graph,e.a),b=nodeAt(graph,e.b);
   if(!a||!b)continue;
   const line=liveCurve?.id===e.id?
    curvePoints(a,liveCurve.control,b):edgePoints(graph,e);
   if(line.length<2)continue;
   ribbon(surfaces,world,line,34,colors.roadEdge,2.7);
   ribbon(surfaces,world,line,24,colors.road,3.1);
   if(liveCurve?.id===e.id)ribbon(roadGuides,world,line,13,[.99,.77,.34],4.8);
  }
 }else for(const road of state.roads||[]){
  if(road.length<2)continue;
  ribbon(surfaces,world,road,34,colors.roadEdge,2.7);
  ribbon(surfaces,world,road,24,colors.road,3.1);
 }
 for(const house of state.houses||[])block(markers,world,house,25,27,19,colors.wall,colors.roof,house.orientation||0);
 for(const building of state.buildings||[]){
  const material=colors[building.type]||colors.wall;
  const size=building.type==="farm"?48:building.type==="market"?48:building.type==="granary"?32:35;
  const height=building.type==="granary"?40:building.type==="market"?29:building.type==="lumber"?27:24;
  block(markers,world,building,size,size*.9,height,material,colors.roof);
 }
 if(mode==="road"){
  if(graph){
   for(const n of graph.nodes)beacon(roadGuides,world,n,n.id===graph.hubId?13:11,
    n.id===graph.hubId?[.97,.72,.37]:[.86,.94,.77]);
   for(const e of graph.segments){
    if(!e.control)continue;
    const a=nodeAt(graph,e.a),b=nodeAt(graph,e.b);
    if(a&&b)beacon(roadGuides,world,quadraticPoint(a,liveCurve?.id===e.id?liveCurve.control:e.control,b,.5),
      14,[1,.58,.26],[.38,.24,.16],15);
   }
  }
  const draftLine=draft?.anchors?.length>1?flattenRoadDraft(draft):[];
  if(draftLine.length>1){
   ribbon(roadGuides,world,draftLine,26,[.99,.72,.37],5);
   ribbon(roadGuides,world,draftLine,12,[1,.90,.58],5.7);
  }
  for(const p of draft?.anchors||[])beacon(roadGuides,world,p,12,[1,.91,.60],[.36,.33,.22],13);
  for(const bend of draft?curvedSegments(draft):[])
   beacon(roadGuides,world,bend.anchor,12,[1,.67,.32],[.42,.25,.12],15);
  if(pendingControl&&draft?.anchors?.length){
   const anchor=draft.anchors.at(-1);
   ribbon(roadGuides,world,[anchor,pendingControl],3,[1,.82,.48],10);
   beacon(roadGuides,world,pendingControl,11,[1,.57,.21],[.4,.22,.1],16);
  }
  if(liveGesture){
   const {start,end,control}=liveGesture;
   if(start&&end&&control){
    const shape=curvePoints(start,control,end);
    if(Math.hypot(end.x-start.x,end.y-start.y)>8)
     ribbon(roadGuides,world,shape,14,[.99,.77,.37],6);
    ribbon(roadGuides,world,[end,control],3,[.99,.85,.55],11);
    beacon(roadGuides,world,end,12,[1,.94,.66],[.31,.35,.22],16);
    beacon(roadGuides,world,control,11,[1,.55,.22],[.39,.22,.12],16);
   }
  }
 }
 return{surfaces:new Float32Array(surfaces),zones:new Float32Array(zones),
  structures:new Float32Array(markers),guides:new Float32Array(roadGuides),
  counts:{roads:(state.roads||[]).length,houses:(state.houses||[]).length,
   buildings:(state.buildings||[]).length,zonedCells:drawn,guideTriangles:roadGuides.length/27}};
}
