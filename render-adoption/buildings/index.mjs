import * as T from '../../assets/vendor/three.module.mjs';
import {estimateSceneBytes} from '../../scene-batches.mjs';
import {buildBuildingBatches} from './batches.mjs';
import {assetFor,admit,SCALE,rectangle,transformLocal} from './placement.mjs';
import {createAssetPool,manifestURL} from './resources.mjs';
import {seatModel} from './seating.mjs';
export {createPreviewAssetLibrary} from './resources.mjs';
export {assetFor,SCALE} from './placement.mjs';
export {entityKeyForIntersection} from './batches.mjs';

// Injected manifest/loader are optional test and host preloading hooks. The host
// owns legacy presentation for fallback keys; this layer never draws both.
export async function createBuildingLayer({scene,terrainSurface,world,invalidate=()=>{},quality='normal',manifest,loader}){
 if(!['normal','low'].includes(quality))throw Error('Invalid quality');
 manifest??=await fetch(manifestURL).then(r=>{if(!r.ok)throw Error('P1 manifest '+r.status);return r.json();});
 const pool=createAssetPool({manifest,loader}),group=new T.Group();group.name='WV007 C4 building layer';scene.add(group);
 const footGeometry=new T.BoxGeometry(1,1,1),footMaterial=new T.MeshStandardMaterial({color:0x81796a,roughness:1});
 let disposed=false,generation=0,view=null,context={},placements=[],batches=[],owned=[],plan=[],planRevision=null,placementRevision=null,visible=true,signature=null,lastPromise=Promise.resolve(),effectiveLods={},failures=[],ready=false,resourceStats={geometryBytes:0,textureBytes:0,triangles:0};
 const canonical=id=>manifest.entries.find(e=>e.family==='C4'&&e.id===id&&e.quality==='normal');
 function clear(){for(const b of batches){group.remove(b);b.dispose();}batches=[];for(const g of owned)g.dispose();owned=[];resourceStats={geometryBytes:0,textureBytes:0,triangles:0};}
 function planView(v,ctx){
  const entities=[...(v.houses||[]),...(v.facilities||[])].slice().sort((a,b)=>String(a.key).localeCompare(String(b.key))),blockers=[...(ctx.blockersWorldGame||[])];
  // Every existing site blocks its neighbours, including legacy or failed sites.
  for(const entity of entities){const id=assetFor(entity,v.world.seed),entry=canonical(id),p=ctx.legacyPlacements?.find(p=>p.key===entity.key)?.polygonWorldGame;
   if(p)blockers.push({key:entity.key,polygon:p});else if(entry){const bounds=entry.admission||entry;blockers.push({key:entity.key,polygon:rectangle(bounds.boundsMin,bounds.boundsMax).map(p=>transformLocal(p,entity))});}
  }
  return entities.map(entity=>{
   const id=assetFor(entity,v.world.seed),source=canonical(id);
   if(!source)return {entity,id,placement:{key:entity.key,assetId:id,mode:'legacy',reason:'legacy-or-unsupported-variant'}};
   const entry={...source,...source.admission,compact:source.compactAdmission||source.compact};
   const options={world,terrainSurface,blockers,roads:[...(v.roads||[]),...(v.localLanes||[])]};
   let placement=admit(entity,entry,options);
   if(placement.reason)placement=admit(entity,entry,options,true);
   if(placement.reason)placement={key:entity.key,assetId:id,mode:'legacy',reason:placement.reason};
   if(placement.mode!=='legacy')placement.integralExclusions=manifest.entries.filter(e=>e.family==='C4'&&e.id===id&&e.quality!=='distance').flatMap(e=>e.integral||[]).filter(i=>placement.mode!=='compact'||!i.optional).map(i=>{const polygon=rectangle(i.min,i.max).map(p=>transformLocal(p,entity));return{sourceNode:i.sourceNode,kind:i.kitAsset||i.category||'structure',worldGame:polygon,centeredMetres:polygon.map(p=>({x:(p.x-world.width/2)/SCALE,z:(p.y-world.depth/2)/SCALE})),minGameY:placement.originY+i.min[1]*SCALE,maxGameY:placement.originY+i.max[1]*SCALE};});
   return {entity,id,placement};
  });
 }
 function distanceLod(item,ctx){
  const camera=ctx.cameraPositionGame||ctx.camera?.position;if(!camera)return quality;
  const x=Array.isArray(camera)?camera[0]:camera.x,z=Array.isArray(camera)?camera[2]:camera.z,p=item.entity.savedPosition,d=Math.hypot(p.x-world.width/2-x,p.y-world.depth/2-z),policy=manifest.cameraPolicy;
  if(d>policy.cullGameUnits)return 'culled';
  const old=item.lastLod==='distance',threshold=policy.distanceGameUnits+(old?-policy.hysteresisGameUnits:policy.hysteresisGameUnits);
  return d>threshold?'distance':quality;
 }
 async function update(v,ctx={}){
  if(disposed)return;if(v.schemaVersion!==1)throw Error('Expected read view v1');
  view=v;context=ctx;visible=ctx.visible!==false;group.visible=visible;
  if(planRevision!==v.revision||ctx.placementRevision!==placementRevision){
   // Host must change view revision for terrain/parcel/identity edits.
   plan=planView(v,ctx);planRevision=v.revision;placementRevision=ctx.placementRevision;signature=null;
  }
  const lods=plan.map(item=>{const lod=distanceLod(item,ctx);item.lastLod=lod;return lod;});
  const nextSignature=JSON.stringify([v.revision,quality,lods,visible]);
  if(signature===nextSignature)return lastPromise;
  signature=nextSignature;const token=++generation;ready=false;
  if(!visible){clear();placements=plan.map(i=>structuredClone(i.placement));effectiveLods={hidden:plan.length};pool.retain(new Set());ready=true;invalidate();return;}
  const wanted=new Set(lods.filter((lod,i)=>lod!=='culled'&&plan[i].placement.mode!=='legacy'));
  const work=(async()=>{
   const loaded=new Map();await Promise.all([...wanted].map(async lod=>{try{loaded.set(lod,await pool.load('C4',lod));}catch(error){loaded.set(lod,{error:String(error.message)});}}));
   if(disposed||token!==generation)return;
   clear();const objects=[],next=[],used=new Set();effectiveLods={};failures=[];
   for(let i=0;i<plan.length;i++){
   const item=plan[i],lod=lods[i],placement=structuredClone(item.placement);next.push(placement);
   if(placement.mode==='legacy'){const legacy=ctx.legacyPlacements?.find(p=>p.key===item.entity.key);placement.legacyExclusionWorldGame=structuredClone(legacy?.polygonWorldGame??null);}
    if(placement.mode==='legacy'){effectiveLods.legacy=(effectiveLods.legacy||0)+1;continue;}
    if(lod==='culled'){placement.effectiveLod='culled';effectiveLods.culled=(effectiveLods.culled||0)+1;continue;}
    const model=loaded.get(lod),entry=manifest.entries.find(e=>e.family==='C4'&&e.id===item.id&&e.quality===lod),source=model?.scene?.getObjectByName(entry?.node);
    if(!source){placement.mode='legacy';placement.reason='load-error';failures.push({key:item.entity.key,error:model?.error||'Missing runtime root'});effectiveLods.legacy=(effectiveLods.legacy||0)+1;continue;}
    const instance=new T.Group();instance.position.fromArray(placement.transform.positionGame);instance.rotation.y=placement.yaw;instance.scale.setScalar(SCALE);instance.add(source.clone(true));
    try{owned.push(...seatModel(instance,item.entity,placement,entry,terrainSurface,footMaterial));}catch(error){placement.mode='legacy';placement.reason='seating-error';failures.push({key:item.entity.key,error:String(error.message)});effectiveLods.legacy=(effectiveLods.legacy||0)+1;continue;}
    for(const s of placement.supportContacts){if(s.extensionGameUnits<.001)continue;const foot=new T.Mesh(footGeometry,footMaterial);foot.position.set(s.worldGame.x-world.width/2,s.worldGame.height+s.extensionGameUnits/2,s.worldGame.y-world.depth/2);foot.scale.set((s.widthMetres+.16)*SCALE,s.extensionGameUnits,(s.widthMetres+.16)*SCALE);objects.push({scene:foot,entityKey:item.entity.key});}
    placement.effectiveLod=lod;placement.materialQuality=lod==='normal'?'normal':'low';objects.push({scene:instance,entityKey:item.entity.key});used.add('C4:'+lod);effectiveLods[lod]=(effectiveLods[lod]||0)+1;
   }
   for(const placement of next){
    placement.retainedBoundaryFragments=(placement.integralExclusions||[]).filter(p=>p.kind.includes('Fence')).map(p=>({kind:'C4-integral-fence',decorationOnly:true,sourceNode:p.sourceNode,worldGame:p.worldGame,centeredMetres:p.centeredMetres}));
    if(placement.mode==='legacy'){placement.legacyExclusionWorldGame=structuredClone(ctx.legacyPlacements?.find(p=>p.key===placement.key)?.polygonWorldGame??null);placement.transform=null;placement.levelFloorGameY=null;placement.hostRenderRequired=true;}
   }
   batches=buildBuildingBatches(objects,owned);for(const b of batches)group.add(b);resourceStats={...estimateSceneBytes(group),triangles:batches.reduce((n,b)=>n+(b.geometry.index?.count??b.geometry.attributes.position.count)/3*b.count,0)};placements=next;pool.retain(used);ready=true;invalidate();
  })();lastPromise=work;return work;
 }
 return {
  update,
  setQuality(value){if(!['normal','low'].includes(value))throw Error('Invalid quality');if(disposed||value===quality)return lastPromise;quality=value;signature=null;return view?update(view,context):Promise.resolve();},
  getPlacements:()=>structuredClone({contractRevision:1,viewRevision:view?.revision??null,units:{worldGame:'saved X/Y; heights Y-up',centeredMetres:'centered X/Z divided by 2.8; heights divided by 2.8'},records:placements}),
  status:()=>({contractRevision:1,sourceFamily:'C4',sourceRevision:manifest.revision,sourcePins:structuredClone(manifest.sourcePins),viewRevision:view?.revision??null,quality,effectiveLods:{...effectiveLods},...pool.status(),resourceStats:{...resourceStats},disposed,ready:ready&&!disposed,visible,admitted:placements.filter(p=>p.mode!=='legacy').map(p=>p.key),fallback:placements.filter(p=>p.mode==='legacy').map(p=>({key:p.key,reason:p.reason})),failures:structuredClone(failures),drawBatches:batches.length,deviceAcceptance:'pending-P5',offlineInstalled:false}),
  dispose(){if(disposed)return;disposed=true;++generation;clear();pool.dispose();footGeometry.dispose();footMaterial.dispose();scene.remove(group);placements=[];plan=[];}
 };
}
