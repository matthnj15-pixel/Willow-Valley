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
  writeFileSync(join(source,'asset-cache.js'),'self.WV_ASSET_CACHE=[];');writeFileSync(join(source,'assets/models/home.glb'),'verified model fixture');
  const build=new URL('../scripts/build-offline.mjs',import.meta.url);
  execFileSync(process.execPath,[build.pathname,source,join(destination,'offline.html')]);
  assert.equal(readFileSync(join(destination,'assets/models/home.glb'),'utf8'),'verified model fixture');
  assert.equal(readFileSync(join(destination,'asset-cache.js'),'utf8'),'self.WV_ASSET_CACHE=[];');
  const stable=join(temp,'_site/stable');mkdirSync(stable,{recursive:true});rmSync(join(source,'asset-cache.js'));
  execFileSync(process.execPath,[build.pathname,source,join(stable,'offline.html')]);
  assert.equal(existsSync(join(stable,'assets')),false,'a branch without a catalog stays independent');
 }finally{rmSync(temp,{recursive:true,force:true});}
});
