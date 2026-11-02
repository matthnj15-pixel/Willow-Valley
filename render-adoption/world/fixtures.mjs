// Test/review adapter only. P5 supplies the production immutable read view.
// Invokes actual startWorldGame, never an art-study stage or authored plan.
import {startWorldGame,generatedWorld} from '../../simulation.mjs';
import {visibleDesirePaths} from '../../desire-paths.mjs';
import {terrainResolution,createTerrainSurface} from '../../terrain-surface.mjs';
export function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export function realWorldFixture(seed='WILLOW-1048',quality='normal',size='small'){
 const state=startWorldGame({seed,size,flatness:80,hills:20,cliffs:15,lakes:2,rivers:1}),before=JSON.stringify(state),world=generatedWorld(state),detached=structuredClone(state);
 // Resolve authority on a detached state; zoneAt is not called against live data.
 if(detached.zones.length)throw Error('Fixture expects actual initial empty committed zones');
 const [nx,nz]=terrainResolution(world,{lite:quality==='low',gameplay:true});
 const surface=createTerrainSurface(world,nx,nz);
 const view=freeze({schemaVersion:1,revision:`${seed}:initial`,quality,
  world:{seed:state.worldOptions.seed,width:world.width,depth:world.depth,terrainRevision:`${nx}:${nz}`},
  houses:state.houses.map(h=>({key:`home:${h.x}:${h.y}`,savedPosition:{x:h.x,y:h.y},parcel:h.parcel??null,yaw:0})),
  facilities:state.buildings.map(b=>({key:`${b.type}:${b.x}:${b.y}`,type:b.type,savedPosition:{x:b.x,y:b.y},yaw:0})),
  roads:state.roads.map((points,i)=>({key:`road:${i}`,points:structuredClone(points),width:34})),
  localLanes:state.localLanes.map((l,i)=>({key:`lane:${i}`,points:structuredClone(l.points),width:5})),
  approaches:visibleDesirePaths(state).map((l,i)=>({key:`path:${i}`,points:structuredClone(l.points),width:l.width??3})),
  committedFields:[],retainedTrees:world.trees.map((t,i)=>({key:`tree:${i}`,savedPosition:{x:t.x,y:t.z},canopyRadiusWorldGame:38})),retainedBoundaries:[]});
 // Peers unfinished: no guessed building/yard envelopes. Review cover uses an
 // explicitly isolated, unoccupied terrain area via complete test context only.
 const context=freeze({placementView:{revision:'peer-fixture-1',complete:true,exclusionsWorldGame:[],groundInfluencesWorldGame:[]},landscapeView:{revision:'peer-fixture-1',complete:true,exclusionsWorldGame:[]}});
 return {state,before,world,surface,view,context};
}
