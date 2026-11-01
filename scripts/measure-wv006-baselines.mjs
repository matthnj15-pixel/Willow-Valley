// Local browser evidence only: submission time is not physical phone FPS.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const origin=process.env.WV_PREVIEW_ORIGIN||'http://127.0.0.1:4173',out='docs/testing/wv006-c';await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--no-sandbox']}),records={viewport:{width:1400,height:1050},dpr:1,ground:'existing environment-materials fixture, seed WV-CATALOG-02; repeat final ground in F',cameraChecks:[],probes:[],scenes:[],phonePerformanceVerified:false};
try{
 const page=await browser.newPage({viewport:records.viewport,deviceScaleFactor:1});page.on('pageerror',e=>{throw e;});await page.goto(origin+'/ui-kit/wv006-baselines.html');await page.waitForSelector('[data-loaded="10"]');
 const ids=await page.evaluate(()=>wv006.manifest.entries.map(e=>e.id));records.output=await page.evaluate(()=>wv006.manifest.output);
 for(const id of ids){await page.selectOption('#design',id);await page.locator('#stage').screenshot({path:out+'/'+id+'-pair.jpg',type:'jpeg',quality:85});}
 await page.selectOption('#compare','new');
 for(const quality of ['normal','low']){await page.selectOption('#quality',quality);records.probes.push({quality,results:await page.evaluate(()=>wv006.inspect())});
  for(const id of ids){await page.selectOption('#design',id);
   for(const angle of quality==='normal'?['front','rear','left','side','roof','eye']:['front','roof']){await page.selectOption('#view',angle);records.cameraChecks.push({id,quality,angle,fullBoundsInFrame:await page.evaluate(()=>wv006.frameCheck()),stats:await page.evaluate(()=>wv006.stats)});await page.locator('#stage').screenshot({path:out+'/'+id+'-'+quality+'-'+angle+'.jpg',type:'jpeg',quality:85});}
   if(quality==='normal'){await page.selectOption('#view','front');await page.uncheck('#props');await page.uncheck('#labels-on');await page.check('#mono');await page.locator('#stage').screenshot({path:out+'/'+id+'-identity.jpg',type:'jpeg',quality:85});await page.uncheck('#mono');await page.check('#wire');await page.selectOption('#view','roof');await page.locator('#stage').screenshot({path:out+'/'+id+'-wire.jpg',type:'jpeg',quality:85});await page.uncheck('#wire');await page.check('#labels-on');await page.check('#props');}
  }
 }
 await page.setViewportSize({width:600,height:850});records.mobileViewport={width:600,height:850};
 for(const quality of ['normal','low']){await page.selectOption('#quality',quality);await page.selectOption('#view','front');for(const id of ['home-low-hip','facility-smith','facility-granary']){await page.selectOption('#design',id);await page.locator('#stage').screenshot({path:out+'/'+id+'-mobile-'+quality+'.jpg',type:'jpeg',quality:85});}for(const count of [30,100])records.scenes.push(await page.evaluate(async({count,quality})=>wv006.benchmark(count,quality),{count,quality}));}
 await writeFile(out+'/measurements.json',JSON.stringify(records,null,2)+'\n');console.log(JSON.stringify({output:records.output,probes:records.probes.map(p=>({quality:p.quality,total:p.results.length,failed:p.results.filter(p=>!p.ok)})),cameraFailures:records.cameraChecks.filter(p=>!p.fullBoundsInFrame),scenes:records.scenes},null,2));
}finally{await browser.close();}
