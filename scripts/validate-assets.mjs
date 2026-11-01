import validator from 'gltf-validator';
import {readFile} from 'node:fs/promises';
const manifest=JSON.parse(await readFile('assets/wv/architecture-v1/manifest.json','utf8'));
for(const entry of manifest.entries){
 const report=await validator.validateBytes(new Uint8Array(await readFile(entry.url)),{uri:entry.url});
 console.log(entry.id,report.issues.numErrors,'errors',report.issues.numWarnings,'warnings');
 if(report.issues.numErrors)throw Error(JSON.stringify(report.issues.messages));
}
for(const path of ['assets/wv/megakit-v1/manifest.json','assets/wv/megakit-catalog-v1/manifest.json']){
 const catalog=JSON.parse(await readFile(path,'utf8'));
 const report=await validator.validateBytes(new Uint8Array(await readFile(catalog.output.url)),{uri:catalog.output.url});
 console.log(catalog.output.url,report.issues.numErrors,'errors',report.issues.numWarnings,'warnings');
 if(report.issues.numErrors)throw Error(JSON.stringify(report.issues.messages));
}
