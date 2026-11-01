// A truly self-contained HTML snapshot: no external CSS, JS or API requests.
// Run from repo root: node scripts/build-offline.mjs . offline.html
// Or specify a separate branch checkout as input to the release workflow.
import {build} from "esbuild";
import {readFile,writeFile,cp,access} from "node:fs/promises";
import {resolve,join,dirname} from "node:path";
const root=resolve(process.argv[2]||".");
const destination=resolve(process.argv[3]||"offline.html");
const html=await readFile(join(root,"index.html"),"utf8");
const css=await readFile(join(root,"styles.css"),"utf8");
const result=await build({
 entryPoints:[join(root,"app.mjs")],
 bundle:true,format:"iife",platform:"browser",write:false,
 target:["safari17","chrome110"],legalComments:"none",logLevel:"silent"
});
const js=result.outputFiles[0].text.replace(/<\/script/gi,"<\\/script");
let bundled=html.replace(/<link rel="manifest"[^>]*>\s*/g,"")
 .replace(/<link rel="icon"[^>]*>\s*/g,"")
 .replace(/<link rel="apple-touch-icon"[^>]*>\s*/g,"")
 .replace(/<link rel="stylesheet" href="\.\/styles\.css">/,
  "<style>\n"+css.replace(/<\/style/gi,"<\\/style")+"\n</style>")
 .replace(/<script type="module" src="\.\/app\.mjs"><\/script>/,
  "<script>\n"+js+"\n</script>");
if(bundled===html||bundled.includes('src="./app.mjs"')||bundled.includes('href="./styles.css"'))
 throw Error("Could not construct a standalone file without external dependencies");
await writeFile(destination,bundled);
console.log("Wrote self-contained offline game:",destination,"("+bundled.length+" characters)");

// The workflow_run definition executes from main, but deliberately calls this
// branch's build tool. Package branch-local runtime assets here as well so
// development dependencies ship before workflow changes reach production.
const outputRoot=dirname(destination);
if(outputRoot!==root){
 let hasAssetCache=true;
 try{await access(join(root,"asset-cache.js"));}catch{hasAssetCache=false;}
 if(hasAssetCache){
  await cp(join(root,"asset-cache.js"),join(outputRoot,"asset-cache.js"));
  let hasEnvironment=false;try{await access(join(root,"environment-asset-manifest.json"));hasEnvironment=true;}catch{}
  if(hasEnvironment)await cp(join(root,"environment-asset-manifest.json"),join(outputRoot,"environment-asset-manifest.json"));
  await cp(join(root,"assets"),join(outputRoot,"assets"),{recursive:true});
 }
}
