// Usage: node scripts/measure-environment.mjs URL OUTPUT_DIRECTORY SOURCE_REVISION
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const [url,output,sourceRevision]=process.argv.slice(2);await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
for(const count of [30,100])for(const quality of ['normal','low']){
 const page=await browser.newPage({viewport:{width:600,height:850},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto(url+'/ui-kit/settlement-benchmark.html?count='+count+'&quality='+quality);
 await page.waitForFunction(()=>{const r=window.benchmarkHarness?.viewer.assetStatus();return r?.loaded===r?.total&&(!('surfaceTexturesLoaded' in r)||r.surfaceTexturesLoaded===2);});
 const device=await page.evaluate(()=>{const gl=document.querySelector('#benchmark').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return {renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR)};});
 const result=await page.evaluate(()=>window.benchmarkHarness.start(8,2));
 await writeFile(output+'/'+count+'-'+quality+'.json',JSON.stringify({...result,sourceRevision,...device},null,2)+'\n');
 await page.evaluate(()=>{const {viewer,fixture}=window.benchmarkHarness;viewer.focusOn(fixture.world.width*.4,fixture.world.depth*.45,210);viewer.setCamera({...viewer.getCamera(),pitch:.45,yaw:.71});});
 await page.locator('#benchmark').screenshot({path:output+'/'+count+'-'+quality+'-near.png'});
 console.log(count,quality,result.medianMs,result.p95Ms,result.peakDrawCalls,result.peakTriangles,result.estimatedTextureBytes);await page.close();
}
await browser.close();
