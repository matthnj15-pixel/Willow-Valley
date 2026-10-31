// Desktop-only reproducibility harness; physical device UAT uses the same UI.
// Start scripts/serve-preview.py, then node scripts/benchmark-settlement.mjs.
import {chromium} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const base=process.argv[2]||'http://127.0.0.1:4173',out='docs/testing/wv-57-d1';
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const fixtureSha256=createHash('sha256').update(await readFile('settlement-render-fixtures.mjs')).digest('hex');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const [count,quality] of [[30,'normal'],[100,'normal'],[100,'low']]){
  const page=await browser.newPage({viewport:{width:600,height:850},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(new URL(`ui-kit/settlement-benchmark.html?count=${count}&quality=${quality}`,base.endsWith('/')?base:base+'/').href);
  await page.waitForFunction(()=>{const h=window.benchmarkHarness,s=h?.viewer.assetStatus();return s&&s.loaded===s.total;});
  await page.locator('#notes').fill('Automated desktop Chromium; physical phone and thermal conditions not measured');
  const renderer=await page.evaluate(()=>{const gl=document.querySelector('#benchmark').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable';});
  await page.screenshot({path:`${out}/town${count}-${quality}.png`});
  console.log(`Recording ${count} homes / ${quality}: 10 s warm-up + 60 s measurement`);
  const result=await page.evaluate(()=>window.benchmarkHarness.start(60,10));
  if(!result||errors.length)throw Error('Benchmark interrupted or failed: '+errors.join('; '));
  const record={...result,sourceCommit,fixtureSha256,renderer,browserVersion:browser.version(),measurementClass:'desktop-software',physicalDevice:'not measured'};
  await writeFile(`${out}/town${count}-${quality}.json`,JSON.stringify(record,null,2)+'\n');
  console.log(JSON.stringify({count,quality,medianMs:result.medianMs,p95Ms:result.p95Ms,peakDrawCalls:result.peakDrawCalls,peakTriangles:result.peakTriangles}));
  await page.close();
 }
}finally{await browser.close();}
