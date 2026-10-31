// The versioned catalog is available to opt-in gameplay; default rollout awaits UAT.
export const ARCHITECTURE_VERSION='architecture-v1';
export const HOME_IDS=Object.freeze(['home-long-ridge','home-steep-gable','home-low-hip','home-crooked-wing','home-offset-gables','home-porch-cabin']);
const base=new URL('./assets/wv/architecture-v1/',import.meta.url);
export const assetURL=id=>{if(!/^[a-z0-9-]+$/.test(id))throw Error('Invalid asset ID');return new URL(id+'.glb',base).href;};
export const manifestURL=new URL('manifest.json',base).href;
export function visualIdentity(worldSeed,entity){
 const key=JSON.stringify([ARCHITECTURE_VERSION,worldSeed,entity.id??null,entity.x,entity.y,entity.foundedTurn??0,entity.foundedEra??0]);
 let hash=2166136261;for(const c of key){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619);}return hash>>>0;
}
export function selectHomeModel(seed,entity){return HOME_IDS[visualIdentity(seed,entity)%HOME_IDS.length];}
// Shared resources and image bitmaps can appear in multiple models/materials.
export function createResourceDisposer(){
 const geometries=new WeakSet(),materials=new WeakSet(),textures=new WeakSet(),images=new WeakSet();
 const once=(set,value,fn)=>{if(!set.has(value)){set.add(value);fn(value);}};
 return scene=>scene.traverse(node=>{
  if(node.geometry)once(geometries,node.geometry,g=>g.dispose());
  for(const material of node.material?(Array.isArray(node.material)?node.material:[node.material]):[]){
   for(const value of Object.values(material))if(value?.isTexture)once(textures,value,texture=>{
    texture.dispose();const image=texture.source?.data;
    if(image?.close)once(images,image,i=>i.close());
   });
   once(materials,material,m=>m.dispose());
  }
 });
}
export function createModelRegistry(loader){
 const pending=new Map();let disposed=false;
 const disposeResources=createResourceDisposer();let disposal;
 return{
  load(id){
   if(disposed)return Promise.reject(Error('Registry disposed'));
   if(!pending.has(id)){
    const source=Promise.resolve().then(()=>loader.loadAsync(assetURL(id)));
    const promise=source.then(model=>{if(disposed)throw Error('Registry disposed');return model;},error=>{pending.delete(id);throw error;});
    pending.set(id,{source,promise});
   }
   return pending.get(id).promise;
  },
  dispose(){
   if(disposed)return disposal;
   disposed=true;
   // Retain the raw source promises so a stale caller can be rejected while a
   // model that finishes after disposal still gets its GPU resources released.
   disposal=Promise.allSettled([...pending.values()].map(r=>r.source.then(model=>disposeResources(model.scene))));
   pending.clear();
   return disposal;
  }
 };
}
