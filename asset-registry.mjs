// Reviewed source assemblies stay gallery-only until their promotion gates pass.
export const ARCHITECTURE_VERSION='architecture-v1';
export const HOME_IDS=Object.freeze(['home-long-ridge','home-steep-gable','home-low-hip','home-crooked-wing','home-offset-gables','home-porch-cabin']);
const base=new URL('./assets/wv/architecture-v1/',import.meta.url);
export const assetURL=id=>new URL(id+'.glb',base).href;
export const manifestURL=new URL('manifest.json',base).href;
export function visualIdentity(worldSeed,entity){
 const key=JSON.stringify([ARCHITECTURE_VERSION,worldSeed,entity.id??null,entity.x,entity.y,entity.foundedTurn??0,entity.foundedEra??0]);
 let hash=2166136261;for(const c of key){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619);}return hash>>>0;
}
export function selectHomeModel(seed,entity){return HOME_IDS[visualIdentity(seed,entity)%HOME_IDS.length];}
export function createModelRegistry(loader){
 const pending=new Map();let disposed=false;
 return{
  load(id){
   if(disposed)return Promise.reject(Error('Registry disposed'));
   if(!pending.has(id))pending.set(id,loader.loadAsync(assetURL(id)).catch(error=>{pending.delete(id);throw error;}));
   return pending.get(id);
  },
  dispose(){
   disposed=true;
   const geometries=new Set(),materials=new Set(),textures=new Set();
   for(const promise of pending.values())void promise.then(model=>model.scene.traverse(node=>{
    if(node.geometry)geometries.add(node.geometry);
    for(const m of node.material?(Array.isArray(node.material)?node.material:[node.material]):[]){
     materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);
    }
   })).catch(()=>{}).finally(()=>{
    for(const value of geometries)value.dispose();geometries.clear();
    for(const value of materials)value.dispose();materials.clear();
    for(const value of textures){value.dispose();value.source?.data?.close?.();}textures.clear();
   });
   pending.clear();
  }
 };
}
