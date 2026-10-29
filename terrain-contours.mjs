// Static height contours for the cartographic map. Rendered paths are computed
// once and do not depend on pointer movement or visual animation frame rate.
import {elevationAt} from "./organic-world.mjs";
export function terrainContours({width=1200,height=900,step=30,levels=[-20,0,20,40]}={}){
 const cols=Math.ceil(width/step),rows=Math.ceil(height/step);
 const point=(x,y)=>({x:Math.min(x*step,width),y:Math.min(y*step,height)});
 const elevations=Array.from({length:rows+1},(_,y)=>Array.from({length:cols+1},(_,x)=>{
  const p=point(x,y);return elevationAt(p.x,p.y);
 }));
 const contours=[];
 for(const level of levels){
  const segments=[];
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
   const ps=[point(x,y),point(x+1,y),point(x+1,y+1),point(x,y+1)];
   const es=[elevations[y][x],elevations[y][x+1],elevations[y+1][x+1],elevations[y+1][x]];
   const hits=[];
   for(let edge=0;edge<4;edge++){
    const next=(edge+1)%4,a=es[edge],b=es[next];
    if((a<level)===(b<level))continue;
    const t=(level-a)/(b-a),from=ps[edge],to=ps[next];
    hits.push({x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t,edge});
   }
   // A cell with four crossings is saddle-shaped. Deterministic edge
   // ordering keeps the two contours separate instead of drawing an X.
   if(hits.length===2)segments.push([hits[0],hits[1]]);
   else if(hits.length===4){
    segments.push([hits[0],hits[1]],[hits[2],hits[3]]);
   }
  }
  const d=segments.map(([a,b])=>`M ${a.x.toFixed(1)} ${a.y.toFixed(1)} L ${b.x.toFixed(1)} ${b.y.toFixed(1)}`).join(" ");
  contours.push({level,d,segments:segments.length});
 }
 return contours;
}
