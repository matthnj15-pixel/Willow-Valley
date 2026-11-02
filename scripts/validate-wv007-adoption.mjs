import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve, relative, isAbsolute} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const rootDefault=fileURLToPath(new URL('../',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const requireValue=(ok,message)=>{if(!ok)throw Error(message);};

// Build/admission tooling only. This does not promote a source asset at runtime.
export function validateAdoption({root=rootDefault,selection}={}){
 const read=path=>{
  const target=resolve(root,path),rel=relative(resolve(root),target);
  requireValue(!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('../'),'Path outside checkout: '+path);
  return readFileSync(target);
 };
 const plan=selection??JSON.parse(read('render-adoption/selection.json'));
 requireValue(plan.schemaVersion===1&&plan.runtimeReady===false,'Selection is not runtime acceptance');
 requireValue(plan.architecture.family==='C4','C4 is the selected architecture family');
 requireValue(plan.environment.meadow==='A3'&&plan.environment.worldSystems==='A1','Wrong selected world direction');
 requireValue(plan.environment.worldFactory==='environment-next/previous-materials.mjs'&&plan.environment.a2Policy==='comparison-only','A2 cannot become the selected default');
 requireValue(plan.landscape.required===true&&plan.landscape.plots==='latest-plot-aware','Plot awareness is required');
 requireValue(plan.units.newAssetGameScale===2.8,'New visual family must retain common scale');
 requireValue(plan.ownership.continuousGrass==='world-layer-A3'&&plan.ownership.plotAndFieldBoundaries==='landscape-layer-B','Grass/boundary ownership is ambiguous');
 const manifests=new Map();
 for(const [key,source] of Object.entries(plan.sources)){
  const bytes=read(source.manifest),bundle=read(source.bundle);
  requireValue(hash(bytes)===source.manifestSha256,'Selected manifest changed: '+source.manifest);
  requireValue(hash(bundle)===source.bundleSha256&&bundle.length===source.bytes,'Selected bundle changed: '+source.bundle);
  const m=JSON.parse(bytes);requireValue(m.gameUnitsPerMetre===2.8,'Source scale mismatch: '+key);
  requireValue(m.output.sha256===source.bundleSha256&&m.output.bytes===source.bytes,'Source output record mismatch: '+key);
  manifests.set(key,m);
 }
 for(const pin of plan.sourcePins)requireValue(hash(read(pin.path))===pin.sha256,'Pinned input changed: '+pin.path);
 const buildings=manifests.get(plan.architecture.manifestKey);
 requireValue(buildings?.recipeRevision===4,'Expected C4 recipe revision');
 const selected=plan.architecture.entryIds,unique=new Set(selected);
 requireValue(selected.length===18&&unique.size===18,'Architecture selection has duplicate/missing entries');
 requireValue(selected.length===buildings.entries.length&&buildings.entries.every(e=>unique.has(e.id)),'Architecture entry mapping differs from C4');
 const roles=new Set(buildings.entries.map(e=>e.role));
 requireValue(['residential','farm','smith','granary','lumber','market','park','plaza'].every(r=>roles.has(r)),'Missing current building role');
 for(const entry of buildings.entries){
  requireValue(entry.normalNode&&entry.lowNode&&entry.normalNode!==entry.lowNode,'Missing quality root: '+entry.id);
  requireValue(entry.runtimeReady===false,'Source candidate readiness changed: '+entry.id);
 }
 requireValue(buildings.entries.filter(e=>e.role==='market').length===1,'Competing market overrides');
 const legacy=JSON.parse(read('assets/wv/architecture-v1/manifest.json'));
 requireValue(legacy.entries.some(e=>e.id===plan.architecture.legacyFallback.id)&&plan.architecture.legacyFallback.mode==='existing-architecture-v1-placement','Missing correctly scaled legacy fallback');
 const storage=manifests.get('storage'),tuples=new Set();
 for(const e of storage.entries){const key=e.id+':'+e.quality;requireValue(!tuples.has(key),'Duplicate storage identity/quality: '+key);tuples.add(key);}
 for(const id of plan.storage.warehouseIds)for(const quality of ['normal','low'])requireValue(tuples.has(id+':'+quality),'Missing warehouse quality: '+id+':'+quality);
 requireValue(plan.storage.adoption==='preview-only-until-gameplay','Storage art must not enable gameplay');
 return{revision:plan.revision,sourceDevelop:plan.sourceDevelop,architectureFamily:'C4',architectureEntries:selected.length,landscapeForms:manifests.get('landscape').entries.length,storageQualityEntries:storage.entries.length,pinnedInputs:plan.sourcePins.length,runtimeReady:false};
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{console.log(JSON.stringify(validateAdoption(),null,2));}catch(error){console.error(error.message);process.exitCode=1;}
}
