// Serial matched before/after runs. No phone FPS claim.
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const [url='http://127.0.0.1:4173',output='docs/testing/wv006-a/measurements',sourceRevision='working-tree']=process.argv.slice(2);await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
for(const count of [30,100])for(const quality of ['normal','low'])for(const treatment of ['previous','after']){
 const page=await browser.newPage({viewport:{width:600,height:850},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto(`${url}/ui-kit/wv006-environment.html?count=${count}&quality=${quality}&treatment=${treatment}&motion=off`);
 await page.waitForFunction(()=>{const r=window.environmentHarness?.viewer.assetStatus();return r?.loaded===r?.total&&r?.surfaceTexturesLoaded===(r?.surfaceTexturesExpected||2);});
 const result=await page.evaluate(()=>window.environmentHarness.measure(8,2));
 const resources=await page.evaluate(()=>({userAgent:navigator.userAgent,environmentTextureEncodedBytes:performance.getEntriesByType('resource').filter(r=>(/\/environment-(v1|next)\//.test(r.name))).reduce((n,r)=>n+r.encodedBodySize,0),environmentTextureTransferBytes:performance.getEntriesByType('resource').filter(r=>(/\/environment-(v1|next)\//.test(r.name))).reduce((n,r)=>n+r.transferSize,0)}));
 await writeFile(`${output}/${count}-${quality}-${treatment}.json`,JSON.stringify({...result,...resources,browserVersion:browser.version(),recordedAt:new Date().toISOString(),sourceRevision},null,2)+'\n');
 console.log(count,quality,treatment,result.medianMs,result.p95Ms,result.peakDrawCalls,result.peakTriangles);await page.close();
}await browser.close();
