import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
test('the branch build tool packages gallery assets even under the older main Pages workflow',()=>{
 const temp=mkdtempSync(join(tmpdir(),'wv-packaging-'));
 try{
  const source=join(temp,'preview'),destination=join(temp,'_site/dev');
  mkdirSync(join(source,'assets/models'),{recursive:true});mkdirSync(destination,{recursive:true});
  writeFileSync(join(source,'index.html'),'<link rel="stylesheet" href="./styles.css"><script type="module" src="./app.mjs"></script>');
  writeFileSync(join(source,'styles.css'),'body{color:green}');writeFileSync(join(source,'app.mjs'),'console.log("fixture")');
  const admitted='self.WV_ASSET_CACHE=["./render-adoption/integration/renderer.mjs"];';
  mkdirSync(join(source,'render-adoption/integration'),{recursive:true});
  writeFileSync(join(source,'render-adoption/integration/renderer.mjs'),'verified adopted runtime fixture');
  writeFileSync(join(source,'render-adoption/integration/authoring-only.mjs'),'excluded authoring fixture');
  writeFileSync(join(source,'asset-cache.js'),admitted);writeFileSync(join(source,'assets/models/home.glb'),'verified model fixture');
  writeFileSync(join(source,'environment-asset-manifest.json'),'verified surface provenance fixture');
  const build=new URL('../scripts/build-offline.mjs',import.meta.url);
  execFileSync(process.execPath,[build.pathname,source,join(destination,'offline.html')]);
  assert.equal(readFileSync(join(destination,'assets/models/home.glb'),'utf8'),'verified model fixture');
  assert.equal(readFileSync(join(destination,'asset-cache.js'),'utf8'),admitted);
  assert.equal(readFileSync(join(destination,'render-adoption/integration/renderer.mjs'),'utf8'),'verified adopted runtime fixture');
  assert.equal(existsSync(join(destination,'render-adoption/integration/authoring-only.mjs')),false,'only admitted executable modules are published');
  assert.equal(readFileSync(join(destination,'environment-asset-manifest.json'),'utf8'),'verified surface provenance fixture');
  const stable=join(temp,'_site/stable');mkdirSync(stable,{recursive:true});rmSync(join(source,'asset-cache.js'));
  execFileSync(process.execPath,[build.pathname,source,join(stable,'offline.html')]);
  assert.equal(existsSync(join(stable,'assets')),false,'a branch without a catalog stays independent');
 }finally{rmSync(temp,{recursive:true,force:true});}
});
