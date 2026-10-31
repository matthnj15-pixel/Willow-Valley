import {build} from 'esbuild';
import {copyFile,mkdir} from 'node:fs/promises';
await mkdir('assets/vendor',{recursive:true});
await build({stdin:{contents:'export * from "three"; export {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";',resolveDir:process.cwd(),loader:'js'},
 bundle:true,format:'esm',minify:true,legalComments:'eof',outfile:'assets/vendor/three.module.mjs',target:['safari17','chrome110']});
await copyFile('node_modules/three/LICENSE','assets/vendor/three-LICENSE.txt');
