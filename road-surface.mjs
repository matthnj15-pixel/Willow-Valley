// Rendering and authoring share the authored quadratic, never its endpoint chord.
import {quadraticPoint} from './road-network.mjs';
export function sampleRoadAlignment(a,control,b,spacing=6){
 const distance=(p,q)=>Math.hypot(q.x-p.x,q.y-p.y);
 const length=control?distance(a,control)+distance(control,b):distance(a,b);
 const count=Math.max(1,Math.ceil(length/spacing));
 return Array.from({length:count+1},(_,i)=>control?quadraticPoint(a,control,b,i/count):
  {x:a.x+(b.x-a.x)*i/count,y:a.y+(b.y-a.y)*i/count});
}
// Preserve the existing sheer-cliff limit. Reject the full right-of-way,
// including shoulders. No bridge/ford exists in the current gameplay catalog.
export function validateRoadAlignment(world,a,control,b,{halfWidth=17,maxSlope=1.55}={}){
 if(!world)return{ok:true};
 const points=sampleRoadAlignment(a,control,b);
 let previous=null;
 for(let i=0;i<points.length;i++){
  const p=points[i],before=points[Math.max(0,i-1)],after=points[Math.min(points.length-1,i+1)];
  const dx=after.x-before.x,dy=after.y-before.y,length=Math.hypot(dx,dy)||1;
  for(const side of [-1,0,1]){
   const x=p.x-dy/length*halfWidth*side,y=p.y+dx/length*halfWidth*side;
   if(x<0||y<0||x>world.width||y>world.depth)
    return{ok:false,reason:'Keep the entire road and its shoulders inside the map.'};
   if(world.sample(x,y).water!==null)
    return{ok:false,reason:'Roads cannot cross water. Choose a dry alignment; bridges are not available yet.'};
   if(world.slope(x,y)>maxSlope)
    return{ok:false,reason:'This road crosses a sheer slope. Follow the contours or choose another route.'};
  }
  const height=world.sample(p.x,p.y).height;
  if(previous){
   const run=Math.hypot(p.x-previous.x,p.y-previous.y);
   if(run>1e-6&&Math.abs(height-previous.height)/run>maxSlope)
    return{ok:false,reason:'This road climbs too steeply. Follow the contours or choose another route.'};
  }
  previous={...p,height};
 }
 return{ok:true};
}
