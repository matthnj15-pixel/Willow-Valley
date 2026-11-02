// Reproducible cloud/browser evidence, never a physical-device approval.
// Start scripts/serve-preview.py first. WV007_FULL_MEASURE=1 adds four actual
// 45s warmup + 60s windows; short zoom records remain explicitly duration-invalid.
import {chromium} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
const output='docs/testing/wv007-p5',base=process.env.WV007_BASE_URL||'http://127.0.0.1:4173';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1100,height:950},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const save=async(name,data)=>{const text=JSON.stringify(data,null,2)+'\n',compressed=/-full$|-admission$/.test(name);return writeFile(`${output}/${name}.json${compressed?'.gz':''}`,compressed?gzipSync(text):text);};
try{
 await writeFile(`${output}/reference-measured-admission.json`,await readFile('render-adoption/integration/admission.json'));
 await page.goto(base+'/dev/ui-kit/wv007-integrated.html');
 const summary=[];
 for(const homes of [30,100])for(const quality of ['normal','low']){
  await page.selectOption('#homes',String(homes));await page.selectOption('#quality',quality);await page.selectOption('#scenario','idle');
  await page.evaluate(()=>wv007Integrated.load());await page.waitForFunction(()=>!document.getElementById('start').disabled,{timeout:120000});
  const original=await page.evaluate(()=>JSON.stringify(wv007Integrated.session.snapshot()));
  for(const [name,zoom]of[['near',180],['town',650],['far',1200]]){
   await page.evaluate(async zoom=>{wv007Integrated.viewer.setCamera({zoom});await wv007Integrated.viewer.whenReady();},zoom);
   const record=await page.evaluate(()=>wv007Integrated.run({warmupMs:0,durationMs:1000}));
   await save(`${homes}-${quality}-${name}`,record);
   await page.locator('#integrated').screenshot({path:`${output}/${homes}-${quality}-${name}.png`});
   summary.push({homes,quality,zoom,issues:record.issues,warnings:record.warnings,stats:record.stats,renderer:record.statuses.at(-1).renderer,buildingLods:record.statuses.at(-1).layers.buildings.effectiveHomeLods,visibleHomeLods:record.statuses.at(-1).layers.buildings.visibleHomeLods});
  }
  if(await page.evaluate(()=>JSON.stringify(wv007Integrated.session.snapshot()))!==original)throw Error('Camera measurement mutated fixture');
  await save(`${homes}-${quality}-admission`,await page.evaluate(async()=>{const h=wv007Integrated,r=h.viewer.getAdoptionRuntime(),l=r.getLandscapeView(),digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(l)));return{status:h.viewer.assetStatus(),placements:r.getPlacements().records,landscape:{revision:l.revision,fields:l.fields,vegetationCount:l.vegetation.length,treeFallbacks:l.treeFallbacks,propsCount:l.props.length,bedsCount:l.beds.length,boundaries:l.boundaries,renderBoundaryKeys:l.renderBoundaries.map(b=>b.key),occupancyExclusionCount:l.occupancyExclusions.length,genericPropRequests:l.genericPropRequests,diagnostics:l.diagnostics,completePlanSha256:[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('')}};}));
  if(homes===30&&quality==='normal'){
   const captures=await page.evaluate(()=>{const r=wv007Integrated.viewer.getAdoptionRuntime(),v=r.getReadView(),seen=new Set();return r.getPlacements().records.filter(p=>p.mode!=='legacy'&&p.effectiveLod!=='culled'&&!seen.has(p.assetId)&&seen.add(p.assetId)).map(p=>({key:p.key,id:p.assetId,entity:[...v.houses,...v.facilities].find(h=>h.key===p.key)}));});
   for(const c of captures){await page.evaluate(async c=>{const h=wv007Integrated,r=h.viewer.getAdoptionRuntime(),w=r.getReadView().world;h.viewer.setCamera({focusX:c.entity.savedPosition.x-w.width/2,focusZ:c.entity.savedPosition.y-w.depth/2,zoom:30});await h.viewer.whenReady();},c);await page.locator('#integrated').screenshot({path:`${output}/close-${c.id}.png`});}
   await save('close-captures',captures);
  }
  if(process.env.WV007_FULL_MEASURE==='1'){
   await page.selectOption('#scenario',homes===30?'month':'orbit');await page.evaluate(()=>wv007Integrated.load());await page.waitForFunction(()=>!document.getElementById('start').disabled,{timeout:120000});
   const record=await page.evaluate(()=>wv007Integrated.run());await save(`${homes}-${quality}-full`,record);
   console.log(JSON.stringify({homes,quality,full:true,valid:record.valid,issues:record.issues,stats:record.stats}));
  }
  console.log(JSON.stringify({homes,quality,ready:true}));
 }
 await save('integrated-summary',{environment:'Headless Chromium/software renderer; actual host frame counts; physical device unverified',measurements:summary,errors});
 if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close();}
