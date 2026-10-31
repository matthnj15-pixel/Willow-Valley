import {nodeAt,quadraticPoint} from './road-network.mjs';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
function hull(points){
 const sorted=[...points].sort((a,b)=>a.x-b.x||a.y-b.y),lower=[],upper=[];
 for(const p of sorted){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
 for(const p of sorted.reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
 return [...lower.slice(0,-1),...upper.slice(0,-1)];
}
function trim(points,amount){
 let remaining=amount;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],length=distance(a,b);
  if(length>=remaining){const t=remaining/(length||1);return[
   {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},...points.slice(i)];}
  remaining-=length;
 }
 return points;
}
export function roadJunctionPolygons(graph,liveCurve=null){
 const edges=[],incident=new Map(graph.nodes.map(n=>[n.id,[]]));
 for(const edge of graph.segments){
  const a=nodeAt(graph,edge.a),b=nodeAt(graph,edge.b);if(!a||!b)continue;
  const control=liveCurve?.id===edge.id?liveCurve.control:edge.control;
  const length=control?distance(a,control)+distance(control,b):distance(a,b);
  const steps=Math.max(1,Math.ceil(length/6));
  const points=Array.from({length:steps+1},(_,k)=>control?quadraticPoint(a,control,b,k/steps):
   {x:a.x+(b.x-a.x)*k/steps,y:a.y+(b.y-a.y)*k/steps});
  const run=points.slice(1).reduce((n,p,i)=>n+distance(p,points[i]),0);
  const item={edge,points,run};edges.push(item);incident.get(a.id).push(item);incident.get(b.id).push(item);
 }
 const radius=id=>Math.min(24,...incident.get(id).map(e=>e.run*.3));
 const layers=[];
 for(const width of [34,24]){
  const polygons=[],mouths=new Map(graph.nodes.map(n=>[n.id,[]]));
  for(const {edge,points:original} of edges){
   let points=trim(original,incident.get(edge.a).length>1?radius(edge.a):0);
   points=trim([...points].reverse(),incident.get(edge.b).length>1?radius(edge.b):0).reverse();
   const crossSections=points.map((p,i)=>{
    const before=points[Math.max(0,i-1)],after=points[Math.min(points.length-1,i+1)];
    const dx=after.x-before.x,dy=after.y-before.y,d=Math.hypot(dx,dy)||1;
    return[{x:p.x-dy/d*width/2,y:p.y+dx/d*width/2},{x:p.x+dy/d*width/2,y:p.y-dx/d*width/2}];
   });
   for(let i=1;i<crossSections.length;i++)polygons.push([
    crossSections[i-1][0],crossSections[i][0],crossSections[i][1],crossSections[i-1][1]]);
   for(const [id,index,other] of [[edge.a,0,1],[edge.b,points.length-1,points.length-2]]){
    mouths.get(id).push(...crossSections[index]);
    if(incident.get(id).length!==1)continue;
    const p=points[index],q=points[other],angle=Math.atan2(p.y-q.y,p.x-q.x);
    polygons.push([p,...Array.from({length:13},(_,k)=>({
     x:p.x+Math.cos(angle-Math.PI/2+k/12*Math.PI)*width/2,
     y:p.y+Math.sin(angle-Math.PI/2+k/12*Math.PI)*width/2}))]);
   }
  }
  for(const [id,points] of mouths)if(incident.get(id).length>1){
   const polygon=hull(points);if(polygon.length>=3)polygons.push(polygon);
  }
  layers.push(polygons);
 }
 return{shoulders:layers[0],pavement:layers[1]};
}
