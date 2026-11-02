import {GLTFLoader} from '../../assets/vendor/three.module.mjs';
import {createResourceDisposer} from '../../asset-registry.mjs';
export const manifestURL=new URL('../../assets/wv/runtime-buildings-v1/manifest.json',import.meta.url);
const rootURL=new URL('../../',import.meta.url);
export function createAssetPool({manifest,loader=new GLTFLoader(),onChange=()=>{}}){
 const records=new Map(),release=createResourceDisposer();let disposed=false;
 return {
  load(family,quality){
   const key=family+':'+quality;if(disposed)return Promise.reject(Error('Asset pool disposed'));
   if(!records.has(key)){
    const bundle=manifest.bundles.find(b=>b.family===family&&b.quality===quality);if(!bundle)return Promise.reject(Error('Unknown asset quality '+key));
    const record={bundle,state:'pending'};records.set(key,record);
    record.promise=Promise.resolve().then(()=>loader.loadAsync(new URL(bundle.url,rootURL).href)).then(model=>{
     if(disposed||records.get(key)!==record){release(model.scene);throw Error('Stale asset load');}
     record.model=model;record.state='ready';onChange();return model;
    },error=>{if(records.get(key)===record)records.delete(key);onChange();throw error;});
   }
   return records.get(key).promise;
  },
  retain(keys){for(const [key,r] of records)if(!keys.has(key)){records.delete(key);if(r.model)release(r.model.scene);}},
  status(){const values=[...records.values()];return {pendingLoads:values.filter(r=>r.state==='pending').length,bundles:values.map(r=>({family:r.bundle.family,quality:r.bundle.quality,state:r.state,transferBytes:r.bundle.bytes,estimatedDecodedMipBytes:r.bundle.estimatedDecodedMipBytes})),transferBytes:values.reduce((n,r)=>n+r.bundle.bytes,0),estimatedDecodedMipBytes:values.reduce((n,r)=>n+(r.state==='ready'?r.bundle.estimatedDecodedMipBytes:0),0)};},
  dispose(){if(disposed)return;disposed=true;for(const r of records.values())if(r.model)release(r.model.scene);records.clear();}
 };
}

// D stays preview-only. Key includes family AND quality because IDs repeat.
export async function createPreviewAssetLibrary({manifest,loader}={}){
 manifest??=await fetch(manifestURL).then(r=>{if(!r.ok)throw Error('P1 manifest '+r.status);return r.json();});
 const pool=createAssetPool({manifest,loader});let disposed=false;
 return {
  list:()=>manifest.entries.filter(e=>e.family==='D').map(e=>({family:e.family,id:e.id,quality:e.quality,triangles:e.triangles,previewOnly:true})),
  async load({family='D',id,quality='normal'}){
   if(disposed||family!=='D')throw Error('Preview family must be D');
   const entry=manifest.entries.find(e=>e.family===family&&e.id===id&&e.quality===quality);if(!entry)throw Error('Unknown preview asset');
   const model=await pool.load(family,quality);if(disposed)throw Error('Preview library disposed');
   const source=model.scene.getObjectByName(entry.node);if(!source)throw Error('Missing preview root');
   const scene=source.clone(true);scene.userData.previewKey=[family,id,quality].join(':');
   // Geometry metadata contains no stock/capacity/staffing claims.
   return {scene,metadata:structuredClone(entry),previewOnly:true,ownership:'borrowed; remove clones before library.dispose()'};
  },
  status:()=>({...pool.status(),disposed,previewOnly:true}),
  dispose(){if(disposed)return;disposed=true;pool.dispose();}
 };
}
