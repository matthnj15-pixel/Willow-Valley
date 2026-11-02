import * as T from '../../assets/vendor/three.module.mjs';
import metadata from '../../assets/wv/runtime-landscape-v1/metadata.mjs';
import {createLandscapeLibrary} from '../../assets/wv/landscape-next/batches.mjs';
import {createHamletProps} from '../../assets/wv/landscape-next/hamlet-props.mjs';
import {createPlotFenceLibrary} from '../../assets/wv/landscape-next/plot-fence-view.mjs';
import {stableUnit} from '../../assets/wv/landscape-next/placement.mjs';
import {planLandscape} from './plan.mjs';
import {displayedMetreSampler,UNITS} from './bridge.mjs';
import {createLandscapeSurfaces} from './surfaces.mjs';
export {planLandscape} from './plan.mjs';
export * from './bridge.mjs';
const checkQuality=q=>{if(!['normal','low'].includes(q))throw Error('Quality must be normal or low');return q;};
async function defaultLoad(lod){
  const url=new URL('../../'+metadata.outputs[lod].path,import.meta.url);
  url.searchParams.set('sha256',metadata.outputs[lod].sha256);
  return (await new T.GLTFLoader().loadAsync(url.href)).scene;
}
// No RAF, simulation imports or saves. Host owns visibility and draw cadence.
// loadSource is an optional test/host I/O adapter returning an exclusively-owned Group.
export function createLandscapeLayer({scene,terrainSurface,world,invalidate=()=>{},quality='normal',loadSource=defaultLoad}) {
  if(!scene?.add||typeof terrainSurface?.drapePolygon!=='function')throw Error('Borrowed scene and displayed terrain draper required');
  checkQuality(quality);
  const root=new T.Group();root.name='wv007-landscape';scene.add(root);
  let disposed=false,generation=0,pendingLoads=0,lastView,lastContext={},plan=null,planKey='',renderKey='',active=null,library=null,libraryLod=null,error=null,ready=false,updates=0,planBuilds=0,drawStats={},visible=true;
  let inFlight=null,sourceResources={};
  const sample=displayedMetreSampler(terrainSurface,world);
  function clearActive(){active?.dispose();active=null;root.clear();drawStats={};}
  function buildVisual(lod){
    const parts=[],group=new T.Group(),low=lod!=='normal';
    try{
      const vegetation=plan.vegetation.filter(r=>lod!=='far'||r.key.startsWith('tree:')||['boulder-rounded','outcrop-layered'].includes(r.assetId)).map(r=>({...r,lod}));
      parts.push(library.build(vegetation));
      const props=createHamletProps({low}),fences=createPlotFenceLibrary();
      // Library owners go before their views; reverse disposal releases views first.
      parts.push(props,fences);
      const rows=plan.props.filter(r=>r.kind==='fruit-tree'||(lod!=='far'&&(!low||stableUnit(r.key,'view-low')<.4))).map(r=>({...r,origin:r.origin.map(v=>v*UNITS),scale:[r.scale*UNITS,r.scale*UNITS,r.scale*UNITS]}));
      parts.push(props.build(rows),fences.build(plan.renderBoundaries,{sample,quality:low?'low':'normal'}));
      parts.push(createLandscapeSurfaces(plan,{terrainSurface,world}));
      for(const p of parts)if(p.group)group.add(p.group);
      let triangles=0,drawCalls=0,instanceBytes=0;const geometries=new Set(),materials=new Set();
      group.traverse(n=>{if(n.isMesh){drawCalls++;triangles+=(n.geometry.index?.count??n.geometry.attributes.position.count)/3*(n.isInstancedMesh?n.count:1);geometries.add(n.geometry);for(const m of Array.isArray(n.material)?n.material:[n.material])materials.add(m);instanceBytes+=n.instanceMatrix?.array.byteLength??0;}});
      drawStats={triangles,drawCalls,geometries:geometries.size,materials:materials.size,instanceBytes,textureBytes:0,vegetation:vegetation.length,props:rows.length,sourceBytes:metadata.outputs[lod].bytes};
      let released=false;return {group,dispose(){if(released)return;released=true;group.removeFromParent();for(const p of parts.reverse())p.dispose();group.clear();}};
    }catch(e){for(const p of parts.reverse())p.dispose();throw e;}
  }
  function update(view,context={}) {
    if(disposed)return Promise.resolve(false);
    const lod=context.distance==='far'?'far':quality;
    const geometryKey=JSON.stringify([view.revision,view.world.terrainRevision,context.placementView?.revision??null,context.meadowCoverage?.revision??null]);
    const key=geometryKey+':'+lod;
    const wasVisible=visible;visible=context.visible!==false;root.visible=visible;
    if(visible&&!wasVisible&&ready)invalidate();
    lastView=view;lastContext=context;
    if(renderKey===key&&ready)return Promise.resolve(true);
    if(inFlight?.key===key)return inFlight.promise;
    const token=++generation;ready=false;error=null;clearActive();updates++;
    const work=async()=>{
      if(disposed||token!==generation)return false;
      try{
        if(planKey!==geometryKey){const next=planLandscape(view,context,{terrainSurface,world,entries:metadata.entries});plan=next;planKey=geometryKey;planBuilds++;}
        if(libraryLod!==lod){
          pendingLoads++;let source;
          try{source=await loadSource(lod);}finally{pendingLoads--;}
          const loaded=createLandscapeLibrary(source),sourceGeometry=new Set(),sourceMaterials=new Set();let geometryBytes=0;
          source.traverse(n=>{if(n.isMesh){sourceGeometry.add(n.geometry);for(const m of Array.isArray(n.material)?n.material:[n.material])sourceMaterials.add(m);}});
          const arrays=new Set();for(const g of sourceGeometry){if(g.index)arrays.add(g.index.array);for(const a of Object.values(g.attributes))arrays.add(a.array);}
          for(const a of arrays)geometryBytes+=a.byteLength;
          const measuredSource={sourcePath:metadata.outputs[lod].path,sourceSha256:metadata.outputs[lod].sha256,sourceLod:lod,sourceBytes:metadata.outputs[lod].bytes,sourceGeometries:sourceGeometry.size,sourceMaterials:sourceMaterials.size,sourceGeometryBytes:geometryBytes,sourceTextureBytes:0};
          if(disposed||token!==generation){loaded.dispose();return false;}
          library?.dispose();library=loaded;libraryLod=lod;sourceResources=measuredSource;
        }
        if(disposed||token!==generation)return false;
        active=buildVisual(lod);root.add(active.group);root.visible=visible;renderKey=key;ready=true;
        if(visible)invalidate();return true;
      }catch(e){if(!disposed&&token===generation){error=String(e.message??e);ready=false;}return false;}
      finally{if(inFlight?.token===token)inFlight=null;}
    };
    // Scheduling on a microtask also coalesces synchronous repeated updates.
    const promise=Promise.resolve().then(work);inFlight={key,token,promise};return promise;
  }
  return {update,setQuality(q){checkQuality(q);if(disposed)return Promise.resolve(false);quality=q;return lastView?update(lastView,lastContext):Promise.resolve(true);},
    getLandscapeView:()=>plan,
    status:()=>({contractRevision:1,sourceFamily:'B',sourceRevision:metadata.revision,sourcePins:metadata.sourcePins,viewRevision:plan?.revision??null,quality,
      effectiveLods:ready?{[libraryLod]:{vegetation:drawStats.vegetation,props:drawStats.props,boundaries:plan.renderBoundaries.length}}:{},
      pendingLoads,disposed,ready,integrationReady:false,visible,error,updates,planBuilds,resources:{...sourceResources,...drawStats},diagnostics:plan?.diagnostics??null,offlineAdmitted:false}),
    dispose(){if(disposed)return;disposed=true;ready=false;generation++;clearActive();library?.dispose();library=null;sourceResources={};root.removeFromParent();plan=null;}}
}
