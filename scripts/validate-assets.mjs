import validator from 'gltf-validator';
import {readFile} from 'node:fs/promises';
const manifest=JSON.parse(await readFile('assets/wv/architecture-v1/manifest.json','utf8'));
for(const entry of manifest.entries){
 const report=await validator.validateBytes(new Uint8Array(await readFile(entry.url)),{uri:entry.url});
 console.log(entry.id,report.issues.numErrors,'errors',report.issues.numWarnings,'warnings');
 if(report.issues.numErrors)throw Error(JSON.stringify(report.issues.messages));
}
