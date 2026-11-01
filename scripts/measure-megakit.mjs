// Run against scripts/serve-preview.py. Software-browser evidence, never phone FPS.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const origin=process.env.WV_PREVIEW_ORIGIN||'http://127.0.0.1:4173';
const out='docs/testing/artifacts/wv-art-004';await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--no-sandbox']}),records=[];
try{
 for(const quality of ['normal','low']){
  const page=await browser.newPage({viewport:{width:600,height:850},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  await page.goto(origin+'/ui-kit/scale-study.html?quality='+quality);await page.waitForSelector('[data-loaded=true]');
  await page.waitForTimeout(500);
  const result=await page.evaluate(async()=>{
   const times=[];for(let i=0;i<33;i++){await new Promise(requestAnimationFrame);const start=performance.now();scaleStudy.render();if(i>=3)times.push(performance.now()-start);}
   times.sort((a,b)=>a-b);return{...scaleStudy.stats,oldScale:scaleStudy.oldScale,lumberScale:scaleStudy.lumberScale,closure:scaleStudy.inspectShell(),renderSubmissionMedianMs:times[15],renderSubmissionP95Ms:times[28],userAgent:navigator.userAgent,phonePerformanceVerified:false};
  });records.push({quality,viewport:{width:600,height:850},dpr:1,...result});
  await page.screenshot({path:out+'/mobile-'+quality+'.png',fullPage:true});await page.close();
 }
 const page=await browser.newPage({viewport:{width:1400,height:1050},deviceScaleFactor:1});await page.goto(origin+'/ui-kit/scale-study.html');await page.waitForSelector('[data-loaded=true]');await page.waitForTimeout(500);
 for(const [focus,angle,name] of [['all','front','comparison'],['old','front','legacy-close'],['new','front','cottage-front'],['new','rear','cottage-rear'],['new','low','cottage-eye'],['new','high','cottage-roof']]){
  await page.selectOption('#focus',focus);await page.selectOption('#angle',angle);await page.screenshot({path:out+'/'+name+'.png'});
 }
 await page.selectOption('#focus','all');await page.selectOption('#angle','front');await page.check('#narrow');await page.screenshot({path:out+'/narrow-visible-dirt.png'});
 await writeFile(out+'/measurements.json',JSON.stringify(records,null,2)+'\n');console.log(records);
}finally{await browser.close();}
