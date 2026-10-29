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
 park:[.39,.59,.40],plaza:[.70,.65,.51]
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
export function settlementGeometry(world,state,{draft=null,zoneStrokes=[],zoneType="residential",zoneRadius=54}={}){
 const surfaces=[],zones=[],markers=[];
 const zonePalette={...colors};
 // Draw an effective mask rather than stacked circular discs. This keeps
 // committed edges and erasure legible on sloping terrain.
 const paint=new Map(),step=20;
 function applyStroke(points,radius,type){
  for(const p of points)for(let dx=-radius;dx<=radius;dx+=step)for(let dy=-radius;dy<=radius;dy+=step){
   if(dx*dx+dy*dy>radius*radius)continue;
   const x=Math.floor((p.x+dx)/step),y=Math.floor((p.y+dy)/step);
   const center={x:(x+.5)*step,y:(y+.5)*step};
   if(center.x<0||center.y<0||center.x>world.width||center.y>world.depth)continue;
   if(world.sample(center.x,center.y).water!==null)continue;
   // Brush is clipped by the physical road corridor.
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
 for(const points of zoneStrokes)applyStroke(points,zoneRadius,zoneType);
 let drawn=0;
 for(const p of paint.values()){
  if(p.type==="erase"||drawn++>12000)continue;
  const x=p.x*step,y=p.y*step;
  const corners=[[x,y],[x+step,y],[x+step,y+step],[x,y+step]].map(([xx,yy])=>
   worldPos(world,{x:xx,y:yy},2.3));
  quad(zones,...corners,zonePalette[p.type]||colors.residential);
 }
 for(const lane of state.localLanes||[])if(lane.points?.length>1)ribbon(surfaces,world,lane.points,5,colors.path,2.2);
 for(const road of state.roads||[]){
  if(road.length<2)continue;
  ribbon(surfaces,world,road,34,colors.roadEdge,2.7);
  ribbon(surfaces,world,road,24,colors.road,3.1);
 }
 for(const house of state.houses||[])block(markers,world,house,25,27,19,colors.wall,colors.roof,house.orientation||0);
 for(const building of state.buildings||[]){
  const material=colors[building.type]||colors.wall;
  const size=building.type==="farm"?48:35;
  block(markers,world,building,size,size*.9,building.type==="lumber"?27:24,material,colors.roof);
 }
 if(draft?.anchors?.length>1){
  ribbon(surfaces,world,draft.anchors,30,[.96,.73,.39],4);
 }
 return{surfaces:new Float32Array(surfaces),zones:new Float32Array(zones),
  structures:new Float32Array(markers),
  counts:{roads:(state.roads||[]).length,houses:(state.houses||[]).length,
    buildings:(state.buildings||[]).length,zonedCells:drawn}};
}
