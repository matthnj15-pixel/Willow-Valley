import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const origin=process.env.WV_PREVIEW_ORIGIN||'http://127.0.0.1:4173',out='docs/testing/wv006-b';await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--no-sandbox']}),measurements=[];
try{
 const page=await browser.newPage({viewport:{width:1200,height:1000},deviceScaleFactor:1});await page.goto(origin+'/ui-kit/wv006-landscape.html');await page.waitForSelector('[data-loaded="20"]');
 for(const name of ['collection','forest','bank','yard','smith']){await page.selectOption('#scene',name);await page.locator('.stage').screenshot({path:`${out}/${name}.jpg`,type:'jpeg',quality:88});}
 for(const form of ['oak-spreading','beech-upright','birch-open','pine-tiered','fern-cluster','grass-tuft','reed-cluster','fallen-log']){await page.selectOption('#form',form);await page.locator('.stage').screenshot({path:`${out}/form-${form}.jpg`,type:'jpeg',quality:88});}
 await page.close();
 for(const count of [30,100])for(const quality of ['normal','low'])for(const distance of ['near','far']){
  const p=await browser.newPage({viewport:{width:600,height:850},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  await p.goto(`${origin}/ui-kit/wv006-landscape.html?scene=settlement&count=${count}&quality=${quality}&distance=${distance}`);await p.waitForSelector('[data-loaded="20"]');
  const result=await p.evaluate(async()=>{const times=[];for(let i=0;i<15;i++){await new Promise(requestAnimationFrame);const t=performance.now();landscapeReview.render();if(i>=3)times.push(performance.now()-t);}times.sort((a,b)=>a-b);return{...landscapeReview.stats,medianSubmissionMs:times[6],p95SubmissionMs:times[11],maxContactGap:Math.max(...landscapeReview.records.map(r=>r.groundContact.maxGap)),userAgent:navigator.userAgent};});
  // Baseline delta uses identical camera/fixture and removes only landscape batches.
  const baseline=await p.evaluate(()=>{const before={...landscapeReview.stats};landscapeReview.setLandscapeVisible(false);const baseline={...landscapeReview.stats};landscapeReview.setLandscapeVisible(true);return{drawCalls:baseline.drawCalls,triangles:baseline.triangles,textureBytes:baseline.textureBytes,landscapeDrawDelta:before.drawCalls-baseline.drawCalls,landscapeTriangleDelta:before.triangles-baseline.triangles};});
  measurements.push({count,quality,distance,viewport:{width:600,height:850},dpr:1,...result,baseline});await p.locator('.stage').screenshot({path:`${out}/town-${count}-${quality}-${distance}.jpg`,type:'jpeg',quality:85});await p.close();
 }
 await writeFile(`${out}/measurements.json`,JSON.stringify({scope:'Static composition: existing architecture-v1 homes and seven facilities, B candidate, ground and reference person. Excludes game road/overlay/foundation render passes. F must verify combined scene.',phonePerformanceVerified:false,measurements},null,2)+'\n');console.log(measurements.map(({userAgent,exclusionQueries,...m})=>m));
}finally{await browser.close();}
