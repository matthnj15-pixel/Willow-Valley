import {settlementRenderFixture} from '../../../settlement-render-fixtures.mjs';
import {createTerrainSurface} from '../../../terrain-surface.mjs';
export const rectangle=(x,z,w,d)=>[{x:x-w/2,z:z-d/2},{x:x+w/2,z:z-d/2},{x:x+w/2,z:z+d/2},{x:x-w/2,z:z+d/2}];
export function landscapeFixture(name='forest',count=30){
 if(name==='settlement'){
  const f=settlementRenderFixture(count),{world,state}=f,surface=createTerrainSurface(world,62,46);
  const exclusions=[...state.houses.map(h=>({kind:'structure-yard',polygon:rectangle(h.x,h.y,44,44)})),...state.buildings.map(b=>({kind:'work-yard',polygon:rectangle(b.x,b.y,65,65)})),...state.roads.map(points=>({kind:'road',points:points.map(p=>({x:p.x,z:p.y})),radius:18})),...state.localLanes.map(l=>({kind:'lane',points:l.points.map(p=>({x:p.x,z:p.y})),radius:7})),...state.houses.map(h=>({kind:'approach',points:[{x:h.x,z:h.y},{x:h.entrance.x,z:h.entrance.y}],radius:4})),{kind:'field',polygon:rectangle(70,world.depth-25,180,170)}];
  return{...f,surface,input:{seed:f.seed,width:world.width,depth:world.depth,treeCandidates:world.trees,coverRegions:[{key:'town-margin',kind:'meadow',bounds:{minX:10,minZ:10,maxX:world.width-10,maxZ:world.depth-10}}],exclusions,sample:(x,z)=>({...surface.sample(x,z),slope:.1,moisture:x>world.width*.87?.8:.3})}};
 }
 const width=220,depth=160,bank=name==='bank',world={width,depth,options:{size:'small',seed:'WV006-B-'+name},sample:(x,z)=>({height:bank?Math.max(-1,(x-62)*.018)+Math.sin(z/42)*.16:Math.sin(x/55)*.8+Math.cos(z/48)*.45,water:bank&&x<58?0:null})},surface=createTerrainSurface(world,64,48);
 const treeCandidates=Array.from({length:name==='forest'?54:18},(_,i)=>({key:`${name}-wood-${i}`,x:96+(i*19)%106,z:14+(i*31)%130,h:19+(i%6)*2}));
 const exclusions=name==='yard'||name==='smith'?[{kind:'structure-yard',polygon:rectangle(87,80,name==='smith'?40:27,34)},{kind:'loading-stairs',points:[{x:87,z:80},{x:87,z:130}],radius:8},{kind:'working-ground',polygon:rectangle(70,110,50,23)}]:[];
 const coverRegions=bank?[{key:'moist-bank',kind:'bank',bounds:{minX:61,maxX:80,minZ:5,maxZ:155}},{key:'dry-bank',kind:'meadow',bounds:{minX:88,maxX:210,minZ:4,maxZ:150}}]:[{key:'edge',kind:'woodland',bounds:{minX:112,maxX:211,minZ:5,maxZ:155}},{key:'open-ground',kind:'meadow',bounds:{minX:10,maxX:112,minZ:5,maxZ:155}}];
 const decorativeCandidates=[{key:'edge-log',assetId:'fallen-log',x:140,z:115},{key:'edge-stump',assetId:'stump',x:151,z:111},{key:'edge-boulder',assetId:'boulder-rounded',x:168,z:70},{key:'edge-outcrop',assetId:'outcrop-layered',x:180,z:110},...Array.from({length:4},(_,i)=>({key:'fragment-'+i,assetId:'hedge-fragment',x:42+i*13,z:65+i%2*3}))];
 return{world,surface,input:{seed:world.options.seed,width,depth,treeCandidates,coverRegions,decorativeCandidates,exclusions,sample:(x,z)=>({...surface.sample(x,z),slope:.025,moisture:bank&&x<85?.85:.3})}};
}
