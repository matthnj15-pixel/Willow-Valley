// Capture the catalog and bounded submission timings; these are not physical-phone FPS.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const origin=process.env.WV_PREVIEW_ORIGIN||'http://127.0.0.1:4173',out='docs/testing/artifacts/wv-art-005';await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--no-sandbox']}),records=[];
try{
 for(const quality of ['normal','low']){
  const page=await browser.newPage({viewport:{width:600,height:850},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  await page.goto(origin+'/ui-kit/building-catalog.html?quality='+quality);await page.waitForSelector('[data-loaded="10"]');
  await page.selectOption('#collection','all');await page.selectOption('#design','overview');
  const result=await page.evaluate(async()=>{const times=[];for(let i=0;i<23;i++){await new Promise(requestAnimationFrame);const start=performance.now();buildingCatalog.render();if(i>=3)times.push(performance.now()-start);}times.sort((a,b)=>a-b);return{...buildingCatalog.stats,closure:buildingCatalog.inspectShells(),medianSubmissionMs:times[10],p95SubmissionMs:times[18],userAgent:navigator.userAgent,phonePerformanceVerified:false};});
  records.push({quality,viewport:{width:600,height:850},dpr:1,...result});
  await page.evaluate(()=>buildingCatalog.select('facility-market'));await page.locator('#stage').screenshot({path:out+'/mobile-market-'+quality+'.jpg',type:'jpeg',quality:85});await page.close();
 }
 const page=await browser.newPage({viewport:{width:1400,height:1050},deviceScaleFactor:1});await page.goto(origin+'/ui-kit/building-catalog.html');await page.waitForSelector('[data-loaded="10"]');
 for(const collection of ['residential','work']){await page.selectOption('#collection',collection);await page.selectOption('#design','overview');await page.locator('#stage').screenshot({path:out+'/'+collection+'.jpg',type:'jpeg',quality:85});}
 const ids=await page.evaluate(()=>buildingCatalog.measurements.map(e=>e.id));
 for(const id of ids){await page.evaluate(id=>buildingCatalog.select(id),id);await page.selectOption('#view','front');await page.locator('#stage').screenshot({path:out+'/'+id+'.jpg',type:'jpeg',quality:85});}
 for(const [id,angle] of [['home-offset-gables','rear'],['home-low-hip','roof'],['facility-lumber','eye'],['facility-granary','side']]){await page.evaluate(id=>buildingCatalog.select(id),id);await page.selectOption('#view',angle);await page.locator('#stage').screenshot({path:out+'/'+id+'-'+angle+'.jpg',type:'jpeg',quality:85});}
 await writeFile(out+'/measurements.json',JSON.stringify(records,null,2)+'\n');console.log(records.map(({closure,...r})=>({...r,shellProbes:closure.length,passedProbes:closure.filter(p=>p.ok).length})));
}finally{await browser.close();}
