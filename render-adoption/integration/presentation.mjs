import * as T from '../../assets/vendor/three.module.mjs';
import {createBuildingLayer,createPreviewAssetLibrary} from '../buildings/index.mjs';
import {createWorldLayer} from '../world/index.mjs';
import {createClassification} from '../world/classification.mjs';
import {estimateResources} from '../profiling/resources.mjs';
import {createLandscapeLayer} from '../landscape/index.mjs';
import {createModelRegistry,manifestURL,HOME_IDS} from '../../asset-registry.mjs';
import {homePlacement,homeApproach,facilityPlacement,FACILITY_TYPES} from '../../building-visuals.mjs';
import {buildSceneBatches,estimateSceneBytes} from '../../scene-batches.mjs';
import {cottageBlueprint,buildingFootprint} from '../../settlement-architecture.mjs';
import {buildSettlementReadView,geometryKey,fallbackFootprints,placementBridge,landscapeBridge,toSaved,U} from './read-view.mjs';
import landscapeMetadata from '../../assets/wv/runtime-landscape-v1/metadata.mjs';
import {memoizeSurface} from './sampling.mjs';
import {entityBounds} from './visibility.mjs';
import {assetFor,rectangle,transformLocal} from '../buildings/placement.mjs';

// Host-owned composition. Sources stay frozen; adapters make every unit/resource
// and fallback decision explicit instead of changing producer contracts in place.
export function createSettlementPresentation({scene,world,invalidate,quality='normal',canvas,referenceProfile=false,onAssets=()=>{}}){
 world=memoizeSurface(world);const fieldCache=new Map(),phaseMs={};
 const fallbackRoot=new T.Group(),genericRoot=new T.Group();scene.add(fallbackRoot,genericRoot);
 const registry=createModelRegistry(new T.GLTFLoader()),models=new Map(),ids=[...HOME_IDS,...FACILITY_TYPES.map(t=>'facility-'+t)];
 let entries=[],disposed=false,surface=null,layers={},state=null,view=null,key=null,revision=0,terrainRevision=0,token=0,ready=false,error=null,inFlight=Promise.resolve(),records=[],legacyByKey=new Map(),fallbacks=[],blockers=[],placement=null,landscape=null,visible=true,camera=null,viewCamera=null,lastLodKey=null,preview=null,genericBatches=[],fallbackBatches=[],outputPins=[];
 // Layer readiness, grass and LOD changes request a draw. Rebuilding the host's
 // roads/zones/editor buffers is only necessary when its model binding changes.
 const notify=(refreshSettlement=false)=>{if(!disposed){invalidate({refreshSettlement});onAssets(status());}};
 const buildingManifest=fetch(new URL('../../assets/wv/runtime-buildings-v1/manifest.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('C4 runtime manifest unavailable');return r.json();});
 const sourceLoad=fetch(manifestURL).then(r=>{if(!r.ok)throw Error('Legacy manifest unavailable');return r.json();}).then(async m=>{entries=m.entries;await Promise.allSettled([...ids,'tree-oak'].map(async id=>{const r=await registry.load(id);if(!disposed)models.set(id,r.scene);}));notify();}).catch(e=>{error=String(e.message);});
 function clear(group,list){for(const b of list){group.remove(b);b.dispose();if(b.userData.ownedTree){b.userData.ownedTree.geometry.dispose();b.userData.ownedTree.material.dispose();}}list.length=0;}
 function legacyPlans(s,v){const map=new Map();for(const [i,h] of (s.houses||[]).entries()){let p=homePlacement(surface,h,entries);if(!p)for(const id of HOME_IDS){p=homePlacement(surface,h,entries,id);if(p)break;}if(p){p.approach=homeApproach(surface,h,p);map.set(v.houses[i].key,p);}}
  for(const [i,b] of (s.buildings||[]).entries()){const p=facilityPlacement(surface,b,s,entries);if(p){p.approach=homeApproach(surface,{...b,entrance:p.approachTarget},p);map.set(v.facilities[i].key,p);}}return map;}
 function rebuildFallback(){clear(fallbackRoot,fallbackBatches);const objects=[];for(const r of records){if(r.mode!=='legacy')continue;const p=legacyByKey.get(r.key),source=p&&models.get(p.id);if(!source)continue;const model=source.clone(true);model.position.fromArray(p.origin);model.rotation.y=p.yaw;model.scale.setScalar(p.scale);objects.push({scene:model,entityKey:r.key});}
  // Rejected B replacements retain their original seeded position and legacy
  // tree visual. They are never removed merely because optional cover rejected.
  const rejected=layers.landscape.status().ready?new Set((landscape?.treeFallbacks||[]).map(t=>t.key)):new Set(view.retainedTrees.map(t=>'tree:'+t.key));
  const treeSource=models.get('tree-oak');if(treeSource)for(const t of view.retainedTrees)if(rejected.has('tree:'+t.key)){const model=treeSource.clone(true);model.position.fromArray(t.legacy.origin);model.position.y=surface.sample(t.savedPosition.x,t.savedPosition.y).height-.02;model.scale.setScalar(t.legacy.scale);model.rotation.y=t.legacy.yaw;objects.push({scene:model,entityKey:t.key});}
  for(const batch of buildSceneBatches(objects)){fallbackRoot.add(batch);fallbackBatches.push(batch);}
 }
 async function genericProps(generation){clear(genericRoot,genericBatches);const requests=landscape?.genericPropRequests||[];if(!requests.length)return;preview??=await createPreviewAssetLibrary();const objects=[];
  for(const p of requests){const id=p.kind==='wood-stack'?'lumber':p.kind==='barrel'?'barrel':null;if(!id)continue;const {scene:model,metadata}=await preview.load({family:'D',id,quality});if(disposed||generation!==token)return;model.position.fromArray(p.origin.map(v=>v*U));model.rotation.y=p.yaw||0;model.scale.setScalar(U*(p.scale||1));model.updateMatrixWorld(true);const box=new T.Box3().setFromObject(model);if(!p.bounds||[0,2].some(i=>box.min.getComponent(i)/U<p.bounds.min[i]-.01||box.max.getComponent(i)/U>p.bounds.max[i]+.01))continue;
   const contacts=[box.min.x,box.max.x].flatMap(x=>[box.min.z,box.max.z].map(z=>surface.sample(x+world.width/2,z+world.depth/2).height));if(Math.max(...contacts)-Math.min(...contacts)>.10*U)continue;model.position.y=Math.max(...contacts)-metadata.boundsMin[1]*model.scale.y;objects.push({scene:model,entityKey:p.key});}
  for(const b of buildSceneBatches(objects)){genericRoot.add(b);genericBatches.push(b);}
 }
 async function compose(s,currentView){
  const generation=++token;ready=false;error=null;await sourceLoad;if(disposed||generation!==token)return;let stamp=performance.now();
  try{
   legacyByKey=legacyPlans(s,currentView);fallbacks=fallbackFootprints(currentView,s,world,legacyByKey);const manifest=await buildingManifest;blockers=[...currentView.houses,...currentView.facilities].flatMap(entity=>{const entry=manifest.entries.find(e=>e.family==='C4'&&e.quality==='normal'&&e.id===assetFor(entity,currentView.world.seed));return entry?[{key:entity.key,polygon:rectangle(entry.admission.boundsMin,entry.admission.boundsMax).map(p=>transformLocal(p,entity))}]:[];});
   await layers.buildings.update(currentView,{legacyPlacements:fallbacks,blockersWorldGame:blockers,cameraPositionGame:!referenceProfile&&viewCamera?[viewCamera.focusX,0,viewCamera.focusZ]:undefined,visible});if(disposed||generation!==token)return;
   phaseMs.buildings=performance.now()-stamp;stamp=performance.now();
   records=layers.buildings.getPlacements().records;placement=placementBridge({records},currentView,fallbacks);
   // Coverage classification can exist before P3. This is deliberately base-only
   // until complete placements and P3 occupancy share this same revision.
   const coverage=createClassification(world,surface,currentView,{placementView:placement}).coverage(currentView.revision);
   await layers.landscape.update(currentView,{placementView:placement,meadowCoverage:coverage,visible,distance:viewCamera?.zoom>1000?'far':'near'});if(disposed||generation!==token)return;
   phaseMs.landscape=performance.now()-stamp;stamp=performance.now();
   landscape=layers.landscape.getLandscapeView();rebuildFallback();await genericProps(generation);if(disposed||generation!==token)return;
   await layers.world.update(currentView,{placementView:placement,landscapeView:landscapeBridge(landscape,currentView)});if(disposed||generation!==token)return;
   phaseMs.world=performance.now()-stamp;
   if(camera)layers.world.setCamera(camera);ready=layers.buildings.status().ready&&layers.landscape.status().ready&&layers.world.status().ready;notify(true);
  }catch(e){if(!disposed&&generation===token){error=String(e.message);ready=false;notify(true);}}
 }
 function bind(s){const homes=new Map(),buildings=new Map(),adoptedHouses=new Set(),adoptedBuildings=new Set(),byKey=new Map(records.map(r=>[r.key,r]));
  for(const [i,h] of (s.houses||[]).entries()){const r=byKey.get(view?.houses[i]?.key),p=legacyByKey.get(r?.key);if(r&&r.mode!=='legacy')adoptedHouses.add(h);else if(p&&models.has(p.id))homes.set(h,p);}
  for(const [i,b] of (s.buildings||[]).entries()){const r=byKey.get(view?.facilities[i]?.key),p=legacyByKey.get(r?.key);if(r&&r.mode!=='legacy')adoptedBuildings.add(b);else if(p&&models.has(p.id))buildings.set(b,p);}
  return {houses:homes,buildings,adoptedHouses,adoptedBuildings,computeSurfaceOffsets:false,cropRows:[],landscapeOwned:true};
 }
 function setSettlement(s){state=s;const next=geometryKey(s);if(surface&&layers.buildings&&key!==next){key=next;const stamp=performance.now();view=buildSettlementReadView(s,world,{quality,revision:'settlement-'+(++revision),terrainRevision:'terrain-'+terrainRevision,fieldCache});phaseMs.readView=performance.now()-stamp;inFlight=compose(s,view);}return bind(s);}
 function material(i){return layers.world?.material(i);}
 function setTerrain(next){surface=memoizeSurface(next);fieldCache.clear();terrainRevision++;key=null;ready=false;++token;for(const l of Object.values(layers))l.dispose();layers={};const generation=token;
  layers.world=createWorldLayer({scene,world,terrainSurface:surface,invalidate:notify,quality});layers.world.attachAtmosphere();
  layers.landscape=createLandscapeLayer({scene,world,terrainSurface:surface,invalidate:notify,quality});
  inFlight=buildingManifest.then(manifest=>createBuildingLayer({scene,world,terrainSurface:surface,invalidate:notify,quality,manifest})).then(layer=>{if(disposed||generation!==token){layer.dispose();return;}layers.buildings=layer;void buildingManifest.then(m=>{outputPins=m.bundles.map(b=>({path:b.url,sha256:b.sha256}));});key=null;if(state)setSettlement(state);}).catch(e=>{error=String(e.message);notify();});
 }
 function frame(cameraObject,pose){camera=cameraObject;viewCamera=pose;layers.world?.setVisible(visible);layers.world?.setCamera(camera);const lodKey=pose&&JSON.stringify([Math.round(pose.focusX/24),Math.round(pose.focusZ/24),pose.zoom>1000]);
  if(view&&layers.buildings&&ready&&lodKey!==lastLodKey){lastLodKey=lodKey;inFlight=(async()=>{const generation=token,fallbackKey=()=>JSON.stringify(records.filter(r=>r.mode==='legacy').map(r=>r.key)),treeKey=()=>JSON.stringify(landscape?.treeFallbacks.map(t=>t.key)),beforeFallback=fallbackKey(),beforeTrees=treeKey();await layers.buildings.update(view,{legacyPlacements:fallbacks,blockersWorldGame:blockers,cameraPositionGame:referenceProfile?undefined:[pose.focusX,0,pose.focusZ],visible});if(disposed||generation!==token)return;records=layers.buildings.getPlacements().records;await layers.landscape.update(view,{placementView:placement,meadowCoverage:layers.world.getCoverage(),distance:pose.zoom>1000?'far':'near',visible});if(disposed||generation!==token)return;landscape=layers.landscape.getLandscapeView();const bindingChanged=beforeFallback!==fallbackKey();if(bindingChanged||beforeTrees!==treeKey())rebuildFallback();notify(bindingChanged);})();}
 }
 function status(){const b=layers.buildings?.status(),l=layers.landscape?.status(),w=layers.world?.status();return{ready,error,loaded:ids.filter(id=>models.has(id)).length,total:ids.length,sourceFamilies:{buildings:'C4',world:'A3+A1',landscape:'B',storage:'D-preview'},quality,phaseMs:{...phaseMs},readViewRevision:view?.revision,admitted:records.filter(r=>r.mode!=='legacy').length,fallback:records.filter(r=>r.mode==='legacy').length,layers:{buildings:b,world:w,landscape:l},...estimateSceneBytes(fallbackRoot)};}
 function diagnosticLayers(){
  let boundsRecords=null,homeBounds=new Map();
  function materialLods(){const byKey=new Map(records.map(r=>[r.key,r])),materials=new Map();for(const [root,shared]of [[scene.getObjectByName('WV007 C4 building layer'),false],[fallbackRoot,true],[genericRoot,false]])root?.traverse(n=>{if(!n.isMesh)return;const lods=shared?['shared']:[...new Set((n.userData.entityKeys||[]).map(k=>byKey.get(k)?.materialQuality||quality))];for(const m of [n.material].flat()){if(!materials.has(m))materials.set(m,new Set());for(const lod of lods)materials.get(m).add(lod);}});const counts={};for(const lods of materials.values()){const lod=lods.size===1?[...lods][0]:'shared';counts[lod]=(counts[lod]||0)+1;}return counts;}
  function landscapeOwnedBytes(){const root=scene.getObjectByName('wv007-landscape'),vegetation=new Set((landscape?.vegetation||[]).map(r=>r.key)),buffers=new Set();root?.traverse(n=>{if(!n.isMesh)return;if(!n.userData.keys?.every(k=>vegetation.has(k)))for(const a of [...Object.values(n.geometry.attributes),n.geometry.index].filter(Boolean)){const b=(a.array||a.data?.array)?.buffer;if(b)buffers.add(b);}if(n.instanceMatrix)buffers.add(n.instanceMatrix.array.buffer);});return[...buffers].reduce((n,b)=>n+b.byteLength,0);}
  const common=(s,family,outputs,effectiveLods,materials,resources)=>({...s,contractRevision:'wv007-layer-1',sourceFamily:family,failedLoads:s?.error||s?.failures?.length?1:0,outputPins:outputs,effectiveLods,effectiveMaterialLods:materials,resources});
  return {
   buildings:{status(){const s=layers.buildings?.status();if(!s)return{ready:false};if(boundsRecords!==records){homeBounds=entityBounds([scene.getObjectByName('WV007 C4 building layer'),fallbackRoot]);boundsRecords=records;}const byKey=new Map(records.map(r=>[r.key,r])),home={normal:0,low:0,distance:0,legacy:0,culled:0},vis={normal:0,low:0,distance:0,legacy:0,culled:0},frustum=camera?new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse)):null;for(const h of view?.houses||[]){const r=byKey.get(h.key),lod=r?.mode==='legacy'||!r?'legacy':r.effectiveLod||quality;home[lod]=(home[lod]||0)+1;const box=homeBounds.get(h.key);if(lod!=='culled'&&box&&(!frustum||frustum.intersectsBox(box)))vis[lod]=(vis[lod]||0)+1;}
    const retained=estimateResources({roots:[...models.values()]}),generic=preview?.status();return{...common(s,'C4',outputPins,s.effectiveLods,materialLods(),{bufferBytesEstimate:s.parsedGeometryBytes+(s.resourceStats.ownedBufferBytes||0)+retained.bufferBytesEstimate+(generic?.parsedGeometryBytes||0)+[...genericBatches,...fallbackBatches].reduce((n,b)=>n+b.instanceMatrix.array.byteLength,0),textureBytesEstimate:s.estimatedDecodedMipBytes+(retained.textureBytesEstimate||0)+(generic?.estimatedDecodedMipBytes||0),loadedQualityImages:[...[...(s.bundles||[]),...(generic?.bundles||[])].map(b=>({quality:b.quality==='normal'?'normal':'low',loaded:b.state==='ready'?b.images:0,expected:b.images,decodedBytesEstimate:b.estimatedDecodedMipBytes})),{quality:'shared',loaded:retained.textures,expected:retained.textures,decodedBytesEstimate:retained.textureBytesEstimate||0}]}),renderedHomes:models.size===ids.length+1?view?.houses.length??0:null,effectiveHomeLods:home,visibleHomeLods:vis};}},
   world:{status:()=>layers.world?.status()??{ready:false}},
   landscape:{status(){const s=layers.landscape?.status();if(!s)return{ready:false};return common(s,'B',Object.values(landscapeMetadata.outputs).map(o=>({path:o.path,sha256:o.sha256})),s.ready?{[s.resources.sourceLod]:s.resources.vegetation+s.resources.props+s.diagnostics?.plotStats?.length||1}:{},{[s.resources.sourceLod==='normal'?'normal':'low']:s.resources.materials||0},{bufferBytesEstimate:(s.resources.sourceGeometryBytes||0)+landscapeOwnedBytes(),textureBytesEstimate:0,loadedQualityImages:[{quality:'shared',loaded:0,expected:0,decodedBytesEstimate:0}]});}}
  };
 }
 return {setTerrain,setSettlement,bind,material,frame,status,diagnosticLayers,getReadView:()=>view,getPlacements:()=>({records,placement}),getLandscapeView:()=>landscape,async whenReady(){let previous;do{previous=inFlight;await previous;}while(previous!==inFlight&&!disposed);return status();},setVisible(value){if(visible===value)return;visible=value;fallbackRoot.visible=genericRoot.visible=value;layers.world?.setVisible(value);if(!value)layers.world?.pause();},worldLayer:()=>layers.world,
  dispose(){if(disposed)return;disposed=true;++token;clear(fallbackRoot,fallbackBatches);clear(genericRoot,genericBatches);registry.dispose();preview?.dispose();for(const l of Object.values(layers))l.dispose();fallbackRoot.removeFromParent();genericRoot.removeFromParent();}}
}
