import {U, clamp, distance, inside, polygonNear, spatialIndex, indexPolygon, finitePoint} from './spatial.mjs';
// All authority inputs are detached world-game coordinates. No zoneAt/world mutation.
export function createClassification(world, surface, view, context={}) {
 const obstacles=spatialIndex(), roads=spatialIndex(), trees=spatialIndex(), fields=spatialIndex();
 const placement=context.placementView, landscape=context.landscapeView;
 const safeCover=placement?.complete===true && landscape?.complete===true && (Array.isArray(view.committedFields)||typeof view.committedFields?.intersectsCircleWorldGame==='function') && Array.isArray(view.retainedTrees);
 const exclusions=[...(placement?.exclusionsWorldGame||[]),...(landscape?.exclusionsWorldGame||[])];
 for(const record of exclusions){const polygon=record.polygon;indexPolygon(obstacles,polygon,{polygon},4);}
 // Unknown width means unknown clearance: the host must supply the actual width.
 let unknownRoadWidths=0;
 for(const [family,lines] of [['road',view.roads],['lane',view.localLanes],['approach',view.approaches]])for(const line of lines||[]){
  if(!Number.isFinite(line.width)||line.width<=0){unknownRoadWidths++;continue;}
  if(!Array.isArray(line.points)||!line.points.every(finitePoint))throw Error('Expected actual sampled road polyline');
  for(let i=1;i<line.points.length;i++){
   const a=line.points[i-1], b=line.points[i], pad=line.width/2+4;
   roads.add({a,b,width:line.width,family},Math.min(a.x,b.x)-pad,Math.min(a.y,b.y)-pad,Math.max(a.x,b.x)+pad,Math.max(a.y,b.y)+pad);
  }
 }
 for(const t of view.retainedTrees||[]){
  const p=t.savedPosition;if(!finitePoint(p))continue;
  const radius=t.canopyRadiusWorldGame??12;
  trees.add({p,radius},p.x-radius,p.y-radius,p.x+radius,p.y+radius);
  if(t.protected){const r=t.protectedRadiusWorldGame??radius;const poly=[{x:p.x-r,y:p.y-r},{x:p.x+r,y:p.y-r},{x:p.x+r,y:p.y+r},{x:p.x-r,y:p.y+r}];indexPolygon(obstacles,poly,{polygon:poly});}
 }
 const committed=view.committedFields;
 if(Array.isArray(committed))for(const cell of committed)if(cell.kind==='farmland')indexPolygon(fields,cell.polygon,cell);
 const work=placement?.groundInfluencesWorldGame||[];
 const wear=spatialIndex();
 for(const w of work){
  if(!w.polygon?.every(finitePoint)||!w.path?.every(finitePoint)||!(w.radius>0&&w.radius<=20))throw Error('Invalid measured ground influence');
  indexPolygon(wear,w.polygon,w,0);
 }
 const sampleField=(x,y)=>typeof committed?.sample==='function'?committed.sample(x,y):fields.at(x,y).some(c=>inside({x,y},c.polygon)&&!(c.holes||[]).some(h=>inside({x,y},h)))?'farmland':null;
 function query(x,y,radius=0){
  const p={x,y},a=world.sample(x,y),q=surface.sample(x,y),wet=a.water!==null;
  // Exact displayed normals, deliberately separate from analytic suitability.
  const e=.01,dx=(surface.sample(Math.min(world.width,x+e),y).height-surface.sample(Math.max(0,x-e),y).height)/(x>e&&x<world.width-e?2*e:e),
   dy=(surface.sample(x,Math.min(world.depth,y+e)).height-surface.sample(x,Math.max(0,y-e)).height)/(y>e&&y<world.depth-e?2*e:e);
  const grade=Math.hypot(dx,dy);
  let forest=0,road=null,wearAmount=0;
  for(const t of trees.at(x,y))forest=Math.max(forest,clamp(1-Math.hypot(x-t.p.x,y-t.p.y)/t.radius));
  for(const r of roads.at(x,y))if(distance(p,r.a,r.b)<=r.width/2+radius){road=r;break;}
  for(const w of wear.at(x,y))if(inside(p,w.polygon))for(let i=1;i<w.path.length;i++)wearAmount=Math.max(wearAmount,clamp(1-distance(p,w.path[i-1],w.path[i])/w.radius)*(w.strength??.65));
  let field=sampleField(x,y);
  if(radius>0&&fields.at(x,y).some(c=>polygonNear(p,c.polygon,radius)&&!(c.holes||[]).some(h=>inside(p,h)&&!h.some((a,i)=>distance(p,a,h[(i+1)%h.length])<=radius))))field='farmland';
  if(radius>0&&committed?.intersectsCircleWorldGame?.(x,y,radius))field='farmland';
  const blocked=obstacles.at(x,y).some(o=>polygonNear(p,o.polygon,radius));
  let kind=wet?a.kind==='river'?'river':'lake':road?road.family:field==='farmland'?'field':grade>.65?'rock':forest>.25?'forest':wearAmount>.1?'work':'meadow';
  // Bank classification queries the actual wet mask, not the displayed height.
  let bank=0;
  if(!wet)for(const [ox,oy] of [[-8,0],[8,0],[0,-8],[0,8]])if(world.sample(Math.max(0,Math.min(world.width,x+ox)),Math.max(0,Math.min(world.depth,y+oy))).water!==null){bank=1;break;}
  if(kind==='meadow'&&bank)kind='bank';
  return {kind,height:q.height,wet,forest,wear:wearAmount,grade,bank,blocked,field,
   meadow:!wet&&!bank&&!road&&field!=='farmland'&&grade<=.65&&forest<=.25,
   landMeadow:!wet&&!bank&&!road&&field!=='farmland'&&forest<=.25,
   cover:safeCover&&!unknownRoadWidths&&!blocked&&!wet&&!bank&&!road&&field!=='farmland'&&grade<=.35&&forest<=.25&&wearAmount<=.1};
 }
 return {query,safeCover,unknownRoadWidths,
  coverage(revision){return Object.freeze({schemaVersion:1,revision,units:'centered-metres',owner:'world-layer-A3',
   boundsCenteredMetres:Object.freeze({minX:-world.width/2/U,maxX:world.width/2/U,minZ:-world.depth/2/U,maxZ:world.depth/2/U}),
   // Ownership is authoritative category, independent of camera, density or LOD.
   containsCenteredMetres(x,z){const a=x*U+world.width/2,b=z*U+world.depth/2;if(!(a>=0&&b>=0&&a<=world.width&&b<=world.depth))return false;const q=query(a,b);return q.landMeadow&&(typeof world.slope==='function'?world.slope(a,b):q.grade)<=.65;}});}
 };
}
