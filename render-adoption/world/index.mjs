import * as T from '../../assets/vendor/three.module.mjs';
import {createClassification} from './classification.mjs';
import {buildFields} from './fields.mjs';
import {createMaterials} from './materials.mjs';
import {createGrassManager} from './grass.mjs';
import {attachAtmosphere} from './atmosphere.mjs';
import {SOURCE_PINS} from './source-pins.mjs';
const qualityName=q=>{if(!['normal','low'].includes(q))throw Error('quality must be normal or low');return q;};
export function createWorldLayer({scene,terrainSurface,world,invalidate=()=>{},quality='normal'}){
 if(!scene?.add||!terrainSurface?.sample||!world?.sample)throw Error('scene, displayed terrainSurface and analytic world required');
 quality=qualityName(quality);
 let disposed=false,token=0,pending=0,current=null,lastView=null,lastContext=null,key=null,viewRevision=null,error=null,builds=0,camera=null,visible=true,lastTime=null,detach=null;
 const group=new T.Group();group.name='wv007-world-grass';scene.add(group);
 // Materials attach through the host to its existing terrain/water/road meshes.
 // Atmosphere attachment is explicit: the host first parks its previous lights.
 let materials=createMaterials(quality);
 const notify=()=>{if(!disposed)invalidate();};
 function releaseCurrent(){current?.grass.dispose();current?.fields.dispose();current=null;}
 const api={
  async update(view,context={}){
   if(disposed)return false;
   if(view.schemaVersion!==1||view.world.width!==world.width||view.world.depth!==world.depth||String(view.world.seed)!==String(world.options?.seed??world.seed))throw Error('Mismatched world/read-view contract');
   const nextKey=JSON.stringify([view.revision,view.world.terrainRevision,context.placementView?.revision??null,context.landscapeView?.revision??null,quality]);
   if(key===nextKey){if(pending){++token;lastView=view;lastContext=context;}return true;}
   const generation=++token;pending++;lastView=view;lastContext=context;error=null;
   // Coalesce same-turn updates and reject completions after quality/disposal.
   await Promise.resolve();
   let fields=null,grass=null;
   try{
    if(disposed||generation!==token)return false;
    const classification=createClassification(world,terrainSurface,view,context);
    fields=buildFields(world,classification,quality);
    grass=createGrassManager(group,world,terrainSurface,classification,materials.grass,quality);
    grass.setVisible(visible);if(camera)grass.setCamera(camera);
    if(disposed||generation!==token){grass.dispose();fields.dispose();return false;}
    releaseCurrent();current={fields,grass,classification,coverage:classification.coverage(view.revision)};
    materials.bind(fields,world);key=nextKey;viewRevision=view.revision;builds++;notify();return true;
   }catch(e){grass?.dispose();fields?.dispose();error=String(e.message);notify();throw e;}
   finally{pending--;}
  },
  async setQuality(next){
   if(disposed)return false;next=qualityName(next);if(next===quality)return true;
   ++token;quality=next;key=null;lastTime=null;
   const atmosphereWasAttached=!!detach;detach?.();detach=null;
   releaseCurrent();materials.dispose();materials=createMaterials(quality);
   if(atmosphereWasAttached)detach=attachAtmosphere(scene,{low:quality==='low',time:materials.uniforms.time});
   notify();return lastView?api.update(lastView,lastContext):true;
  },
  material(index){return disposed?null:materials.material(index);},
  attachAtmosphere(){if(disposed)return()=>{};detach?.();const release=attachAtmosphere(scene,{low:quality==='low',time:materials.uniforms.time});detach=release;return()=>{release();if(detach===release)detach=null;};},
  getCoverage(){return disposed?null:current?.coverage??null;},
  sampleWorldGame(x,y){return disposed?null:current?.classification.query(x,y)??null;},
  setCamera(next){if(disposed)return;camera=next;current?.grass.setCamera(next);},
  setVisible(next){if(disposed)return;visible=!!next;current?.grass.setVisible(visible);if(!visible)api.pause();else if(camera)current?.grass.setCamera(camera);},
  needsAnimation({waterVisible=false,hidden=false,offscreen=false}={}){return !disposed&&!!current&&visible&&quality==='normal'&&waterVisible&&!hidden&&!offscreen;},
  advance(now,visibility={}){
   if(!api.needsAnimation(visibility)||!Number.isFinite(now)){api.pause();return false;}
   if(lastTime!==null)materials.uniforms.time.value+=Math.max(0,Math.min(100,now-lastTime))/1000;
   lastTime=now;return true;
  },
  pause(){lastTime=null;},
  status(){const grass=current?.grass.status()??null;return {
   contractRevision:1,sourcePins:SOURCE_PINS,viewRevision,quality,
   effectiveLods:{terrain:quality==='low'?'A3-field-low':'A3-field-normal',water:quality==='low'?'A1-static':'A1-bounded-ripple',grass:grass?.lods??{near:0,mid:0,low:0}},
   pendingLoads:pending,disposed,ready:!!current&&!pending&&!error,runtimeReady:false,error,
   fields:current?.fields.status??null,fieldBuilds:builds,grass,coverDeferred:!current?.classification.safeCover,
   unknownRoadWidths:current?.classification.unknownRoadWidths??0,
   resources:{textures:current?2:0,decodedTextureBytes:current?.fields.status.decodedBytes??0,externalImages:0,transferImageBytes:0,normalMaps:0,renderTargets:0},
   textureSamplesPerFragment:{terrain:1,road:0,water:1,grass:0},surfaceTime:materials.uniforms.time.value,
   scheduling:{ownsRAF:false,ownsTimers:false,viewportResizes:0,visible},acceptance:'P5 attachment, combined offline and target-device checks pending'
  };},
  dispose(){if(disposed)return;disposed=true;++token;detach?.();detach=null;releaseCurrent();materials.dispose();group.removeFromParent();lastView=lastContext=camera=null;key=null;}
 };
 return api;
}
