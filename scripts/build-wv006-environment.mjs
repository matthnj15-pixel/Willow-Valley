import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=process.cwd();
const result=await build({metafile:true,entryPoints:['environment-next/review-page.mjs'],outfile:'ui-kit/wv006-environment.mjs',bundle:true,format:'esm',target:['safari17','chrome110'],legalComments:'eof',plugins:[{name:'local-review-paths',setup(b){
 b.onResolve({filter:/three\.module\.mjs$/},()=>({path:'../assets/vendor/three.module.mjs',external:true}));
 b.onLoad({filter:/\.mjs$/},async a=>{if(a.path.includes('node_modules'))return;let contents=await readFile(a.path,'utf8');if(path.dirname(a.path)===root)contents=contents.replaceAll("new URL('./assets/","new URL('../assets/");return{contents,loader:'js'};});
}}]});
const dependencies=[...Object.keys(result.metafile.inputs),'environment-materials.mjs','terrain-classification.mjs','terrain-surface.mjs','world-renderer-three.mjs','world-gen.mjs','ui-kit/render-3d.mjs','asset-registry.mjs','building-visuals.mjs','scene-batches.mjs','assets/vendor/three.module.mjs','assets/wv/environment-v1/grass.jpg','assets/wv/environment-v1/soil.jpg','assets/wv/environment-v1/LICENSE.txt','assets/wv/megakit-catalog-v1/catalog.glb','assets/wv/megakit-catalog-v1/manifest.json','assets/wv/megakit-catalog-v1/License_Source.txt','environment-asset-manifest.json'];
const manifest=JSON.parse(await readFile('assets/wv/architecture-v1/manifest.json','utf8'));dependencies.push('assets/wv/architecture-v1/manifest.json',...manifest.entries.map(e=>'assets/wv/architecture-v1/'+e.id+'.glb'));
const records=[];for(const file of [...new Set(dependencies)].sort()){const bytes=await readFile(file);records.push({path:file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
await writeFile('assets/wv/environment-next/dependencies.json',JSON.stringify({recipe:'wv006-a-1',runtimeReady:false,newTextures:0,newMeshAssets:0,dependencies:records},null,2)+'\n');
console.log('Built gallery-only environment review; shared game/cache/workflow unchanged.');
