import {savedToMetres,metresToSaved} from '../bridge.mjs';
import {transformPoint} from '../../../assets/wv/landscape-next/hamlet-plan.mjs';
export const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
export function fixtureView(state,world,{trees=[],revision='saved:1'}={}) {
 return freeze({schemaVersion:1,revision,world:{seed:state.worldOptions?.seed??'legacy',width:world.width,depth:world.depth,terrainRevision:'displayed:1'},quality:'normal',
   houses:state.houses.map(h=>({key:`home:${h.x}:${h.y}:${h.foundedTurn??0}`,identity:`${h.x}:${h.y}`,savedPosition:{x:h.x,y:h.y},yaw:h.orientation??0,foundedEra:h.foundedEra??0,foundedTurn:h.foundedTurn??0,parcel:h.parcel??null,actualEntrance:h.entrance??null})),
   facilities:[],roads:state.roads.map((points,i)=>({key:'road:'+i,points,width:14})),localLanes:(state.localLanes??[]).map((r,i)=>({key:'lane:'+i,points:r.points,width:r.width??4})),approaches:[],
   retainedTrees:trees.map(t=>({key:`woodland:${t.x}:${t.z}`,savedPosition:{x:t.x,y:t.z},heightGame:t.h,protected:true,clearanceRadiusGame:t.r*2.8})),retainedBoundaries:[],committedFields:null});
}
// Frozen equivalent P1 context, not a competing runtime placement/admission engine.
export function fixturePlacements(view,entry){
 return freeze({revision:'C4-fixture:1',placements:view.houses.map(h=>{
   const origin=savedToMetres(h.savedPosition,view.world),yaw=h.yaw;
   const polygon=[[entry.boundsMin[0],entry.boundsMin[2]],[entry.boundsMax[0],entry.boundsMin[2]],[entry.boundsMax[0],entry.boundsMax[2]],[entry.boundsMin[0],entry.boundsMax[2]]].map(([x,z])=>transformPoint({x,z},origin,yaw));
   const markers=entry.entrances[0].threshold,threshold=transformPoint({x:markers[0],z:markers[2]},origin,yaw),end=transformPoint({x:markers[0],z:markers[2]+3},origin,yaw);
   return {key:h.key,assetId:entry.id,yaw,originMetres:origin,exclusionsMetres:[{kind:'full-C4-roof-yard-stair',polygon}],corridorsMetres:[{kind:'approach',points:[threshold,end],radius:.8}],integralBoundariesMetres:[]};
 })});
}
export function edgeCaseView(){
 const world={width:1200,depth:900,seed:'WV007-P3-edge',terrainRevision:'flat:1'},saved=p=>metresToSaved(p,world),ring=points=>points.map(([x,z])=>saved({x,z}));
 const shapes=[['early',[[-25,-15],[-4,-15],[-4,14],[-13,18],[-25,10]],'orchard'],['neighbor',[[-4,-13],[14,-13],[14,15],[-4,14]],'kitchen-garden'],['concave',[[18,-10],[38,-10],[38,10],[29,10],[29,0],[18,0]],'work-yard'],['wedge',[[16,19],[17,19],[16.2,20]],'orchard'],['rotated',[[35,20],[52,30],[42,46],[25,36]],'orchard']];
 const houses=shapes.map(([key,polygon,landscapeUse],i)=>({key,savedPosition:saved({x:polygon[0][0]+3,z:polygon[0][1]+4}),yaw:i*.4,foundedEra:i,landscapeUse,parcel:{vertices:ring(polygon),holes:key==='early'?[ring([[-21,-7],[-17,-7],[-17,-3],[-21,-3]])]:[]}}));
 houses.push({key:'legacy',savedPosition:saved({x:-40,z:0}),yaw:0,parcel:null});
 return freeze({schemaVersion:1,revision:'edge:1',world,quality:'normal',houses,facilities:[],roads:[{key:'road',points:ring([[-50,-20],[55,-20]]),width:5.6}],localLanes:[],approaches:[],retainedTrees:[{key:'protected',savedPosition:saved({x:65,z:0}),heightGame:22,protected:true}],retainedBoundaries:[{key:'earlier-span',ownerKey:'early',a:saved({x:-4,z:-15}),b:saved({x:-4,z:16}),kind:'fence-wattle'}],committedFields:{cellSize:1,cells:Array.from({length:120},(_,i)=>({ix:-60+i%12,iz:30+Math.floor(i/12)})).filter(c=>c.ix!==-54||c.iz<33||c.iz>36)},decorativeCandidates:[{key:'grass',assetId:'grass-tuft',savedPosition:saved({x:60,z:20})},{key:'flower',assetId:'flower-cream',savedPosition:saved({x:58,z:16})}]});
}
