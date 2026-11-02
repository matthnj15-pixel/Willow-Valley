import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import validator from 'gltf-validator';
export async function validateRuntime(){
 const manifests=['assets/wv/runtime-buildings-v1/manifest.json','assets/wv/runtime-environment-v1/provenance.json','assets/wv/runtime-landscape-v1/manifest.json','assets/wv/runtime-landscape-v1/closure.json','render-adoption/profiling/manifest.json','render-adoption/integration/admission.json'];
 const pins=new Map(),glbs=[];
 function walk(value){if(!value||typeof value!=='object')return;if(value.path&&value.sha256){if(pins.has(value.path)&&pins.get(value.path)!==value.sha256)throw Error('Conflicting runtime pin '+value.path);pins.set(value.path,value.sha256);}for(const v of Object.values(value))walk(v);}
 const documents=[];for(const file of manifests){const m=JSON.parse(await readFile(file));documents.push(m);walk(m);}
 for(const b of documents[0].bundles)pins.set(b.url,b.sha256);
 for(const [path,sha256] of pins){const bytes=await readFile(path),actual=createHash('sha256').update(bytes).digest('hex');if(actual!==sha256)throw Error('Runtime dependency changed: '+path);if(path.endsWith('.glb')&&path.includes('/runtime-')){const r=await validator.validateBytes(bytes,{uri:path});if(r.issues.numErrors)throw Error('Invalid runtime GLB '+path);glbs.push({path,errors:r.issues.numErrors,warnings:r.issues.numWarnings});}}
 return {sourceFamilies:{buildings:'C4',world:'A3+A1',landscape:'B',storage:'D-preview'},verifiedPins:pins.size,glbs,physicalDeviceVerified:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(await validateRuntime(),null,2));
