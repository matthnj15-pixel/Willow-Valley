// Bounded Chromium submission timings, not GPU completion or physical-phone FPS.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const origin=process.env.WV_PREVIEW_ORIGIN||'http://127.0.0.1:4173',out='docs/testing/wv006-d';await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--no-sandbox']}),records=[];
try{
 for(const quality of ['normal','low']){
  const page=await browser.newPage({viewport:{width:600,height:850},deviceScaleFactor:1,isMobile:true,hasTouch:true});await page.goto(origin+'/ui-kit/wv006-storage.html');await page.waitForSelector('[data-loaded="true"]');await page.selectOption('#quality',quality);
  for(const stock of ['empty','partial','full']){await page.selectOption('#stock',stock);const result=await page.evaluate(async()=>{const times=[];for(let i=0;i<23;i++){await new Promise(requestAnimationFrame);const start=performance.now();storageStudy.render();if(i>=3)times.push(performance.now()-start);}times.sort((a,b)=>a-b);return{...storageStudy.stats,instances:storageStudy.instanceCounts,medianSubmissionMs:times[10],p95SubmissionMs:times[18]};});records.push({scene:'D warehouse gallery',quality,stock,viewport:{width:600,height:850},dpr:1,...result,physicalPhoneVerified:false});}
  await page.locator('#stage').screenshot({path:out+'/mobile-'+quality+'.jpg',type:'jpeg',quality:86});await page.locator('.ledger').screenshot({path:out+'/ledger-'+quality+'.jpg',type:'jpeg',quality:86});await page.close();
 }
 const page=await browser.newPage({viewport:{width:1440,height:1050},deviceScaleFactor:1});await page.goto(origin+'/ui-kit/wv006-storage.html');await page.waitForSelector('[data-loaded="true"]');
 for(const subject of ['compare','l1','l2','kit','construction']){await page.selectOption('#subject',subject);await page.locator('#stage').screenshot({path:out+'/'+subject+'.jpg',type:'jpeg',quality:88});}
 await page.selectOption('#subject','compare');await page.uncheck('#props');await page.uncheck('#labels-toggle');await page.selectOption('#view','roof');await page.locator('#stage').screenshot({path:out+'/undressed-access.jpg',type:'jpeg',quality:88});
 // Existing town baseline only: these scenes do NOT contain the candidate warehouses.
 for(const count of [30,100])for(const quality of ['normal','low']){await page.goto(origin+`/ui-kit/settlement-benchmark.html?count=${count}&quality=${quality}`);await page.waitForSelector('[data-loaded-models="13"]');await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const stats=await page.evaluate(()=>benchmarkHarness.viewer.assetStatus());records.push({scene:'unchanged existing town baseline; no D candidates',count,quality,viewport:{width:1440,height:1050},dpr:1,...stats,physicalPhoneVerified:false});}
 await writeFile(out+'/measurements.json',JSON.stringify(records,null,2)+'\n');console.log(JSON.stringify(records.map(({scene,quality,count,stock,drawCalls,triangles,medianSubmissionMs})=>({scene,quality,count,stock,drawCalls,triangles,medianSubmissionMs})),null,2));
}finally{await browser.close();}
