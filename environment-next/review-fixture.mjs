import {createTerrainSurface,terrainResolution} from '../terrain-surface.mjs';
import {roadJunctionPolygons} from '../road-junctions.mjs';
// Presentation fixtures only. Do not change roads, suitability or saved state.
export function createReviewSurfaces(world){return [createTerrainSurface(world,...terrainResolution(world,{gameplay:true})),createTerrainSurface(world,...terrainResolution(world,{lite:true}))];}
export function auditCorridor(surfaces,points,width=5){
 let maxGrade=0,samples=0;
 for(let k=1;k<points.length;k++){const a=points[k-1],b=points[k],dx=b.x-a.x,dz=b.y-a.y,length=Math.hypot(dx,dz),steps=Math.max(1,Math.ceil(length/3)),nx=-dz/(length||1),nz=dx/(length||1);
  for(let i=0;i<=steps;i++)for(const offset of [-width/2,0,width/2]){const x=a.x+dx*i/steps+nx*offset,z=a.y+dz*i/steps+nz*offset;
   for(const surface of surfaces){samples++;const p=surface.sample(x,z);if(p.water!==null)return{ok:false,reason:'wet corridor',maxGrade,samples};
    const gx=(surface.sample(x+2,z).height-surface.sample(x-2,z).height)/4,gz=(surface.sample(x,z+2).height-surface.sample(x,z-2).height)/4,grade=Math.hypot(gx,gz);maxGrade=Math.max(maxGrade,grade);if(grade>.28)return{ok:false,reason:'steep displayed surface',maxGrade,samples};
   }
  }
 }return{ok:true,maxGrade,samples};
}
export function createReviewFixture(world){
 const surfaces=createReviewSurfaces(world);let best=null;
 // Check the entire context patch, not just the centre and road endpoints.
 for(const half of [90,65,45,32]){
 for(let z=130;z<world.depth-130;z+=65)for(let x=130;x<world.width-130;x+=65){let lo=Infinity,hi=-Infinity,maxGrade=0,ok=true;
  outer:for(let dz=-half;dz<=half;dz+=Math.max(6,half/5))for(let dx=-half;dx<=half;dx+=Math.max(6,half/5))for(const s of surfaces){const q=s.sample(x+dx,z+dz);if(q.water!==null){ok=false;break outer;}lo=Math.min(lo,q.height);hi=Math.max(hi,q.height);if(hi-lo>half*.3){ok=false;break outer;}const grade=Math.hypot((s.sample(x+dx+3,z+dz).height-s.sample(x+dx-3,z+dz).height)/6,(s.sample(x+dx,z+dz+3).height-s.sample(x+dx,z+dz-3).height)/6);maxGrade=Math.max(maxGrade,grade);if(grade>.28){ok=false;break outer;}}
  if(ok){const score=(hi-lo)+maxGrade*12+Math.hypot(x-world.width/2,z-world.depth/2)*.0005;if(!best||score<best.score)best={x,y:z,half,score,heightSpread:hi-lo,maxGrade};}
 }
 if(best)break;
 }
 if(!best)throw Error('No safe dry review corridor in this seed; do not render a road across a cliff.');
 const {x,y,half}=best,r=half*.70,paths=[[{x:x-r,y:y-r*.35},{x:x-r*.25,y:y-r*.31},{x:x+r*.42,y:y-r*.28},{x:x+r,y:y-r*.18}],[{x:x-r*.25,y:y-r*.31},{x:x-r*.18,y:y+r*.08},{x:x-r*.09,y:y+r*.70}]];
 const audits=paths.map(p=>auditCorridor(surfaces,p,5));if(audits.some(a=>!a.ok))throw Error('Review footpath failed full-width contact validation.');
 const reach=Math.max(8,half-22),nodes=[{id:1,x,y},{id:2,x:x-reach,y},{id:3,x:x+reach,y},{id:4,x,y:y-reach},{id:5,x:x+reach*.6,y:y+reach}],graph={hubId:1,nodes,segments:[{id:1,a:1,b:2},{id:2,a:1,b:3},{id:3,a:1,b:4},{id:4,a:1,b:5}]};
 // Validate the actual broad shoulder polygons for the explicit main-road stress view.
 const polygons=roadJunctionPolygons(graph).shoulders;
 const junctionOK=polygons.every(poly=>auditCorridor(surfaces,[...poly,poly[0]],0).ok);
 const empty={turn:2,houses:[],buildings:[],roads:[],zones:[],desirePaths:[]};
 return{center:best,paths,audits,state:{...empty,localLanes:paths.map(points=>({points}))},junctionState:junctionOK?{...empty,localLanes:[],roadGraph:graph}:null};
}
