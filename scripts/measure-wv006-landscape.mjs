import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const origin=process.env.WV_PREVIEW_ORIGIN||'http://127.0.0.1:4173',out='docs/testing/wv006-b';await mkdir(out,{recursive:true});
if(process.argv.includes('--hamlet')||process.argv.includes('--plots')){await measureHamlet();}else{
const browser=await chromium.launch({args:['--no-sandbox']}),measurements=[];
try{
 const page=await browser.newPage({viewport:{width:1200,height:1000},deviceScaleFactor:1});await page.goto(origin+'/ui-kit/wv006-landscape.html?scene=collection');await page.waitForSelector('[data-loaded="20"]');
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

}

async function measureHamlet(){
 const plotReview=process.argv.includes('--plots'),folder=out+(plotReview?'/plots':'/inhabited');await mkdir(folder,{recursive:true});
 const browser=await chromium.launch({args:['--no-sandbox']}),records=[];
 try{
  const page=await browser.newPage({viewport:{width:1400,height:1100},deviceScaleFactor:1});
  await page.goto(origin+'/ui-kit/wv006-landscape.html');await page.waitForSelector('[data-homes="12"]');
  for(const stage of ['4','12','30'])for(const quality of ['normal','low']){
   await page.selectOption('#quality',quality);await page.selectOption('#growth',stage);await page.selectOption('#hamlet-view','overview');
   const stats=await page.evaluate(async()=>{const times=[];for(let i=0;i<12;i++){await new Promise(requestAnimationFrame);const start=performance.now();landscapeReview.render();if(i>=3)times.push(performance.now()-start);}times.sort((a,b)=>a-b);return{...landscapeReview.stats,contact:landscapeReview.inspectContact(),access:landscapeReview.hamlet.inspect(),medianSubmissionMs:times[4],p95SubmissionMs:times[8]};});
   records.push({composition:'hamlet',geometryOutputs:plotReview?await captureGeometryOutputs(page):undefined,viewport:{width:1400,height:1100},dpr:1,quality,distance:'near',propMeasurements:await page.evaluate(()=>landscapeReview.hamlet.sourceMeasurements()),...stats});await page.locator('.stage').screenshot({path:`${folder}/hamlet-${stage}-${quality}.jpg`,type:'jpeg',quality:90});
  }
  await page.selectOption('#growth','12');await page.selectOption('#quality','normal');
  for(const view of ['green','gardens','farm']){await page.selectOption('#hamlet-view',view);await page.locator('.stage').screenshot({path:`${folder}/${view}.jpg`,type:'jpeg',quality:90});}
  await page.selectOption('#hamlet-view','overview');for(const quality of ['normal','low']){await page.selectOption('#quality',quality);await page.selectOption('#distance','far');records.push({quality,distance:'far',...await page.evaluate(()=>landscapeReview.stats)});await page.locator('.stage').screenshot({path:`${folder}/hamlet-12-${quality}-far.jpg`,type:'jpeg',quality:88});}
  const plan=await page.evaluate(()=>landscapeReview.plan),propMeasurements=await page.evaluate(()=>landscapeReview.hamlet.sourceMeasurements());
  await writeFile(folder+'/holding-plan.json',JSON.stringify({revision:plan.revision,stage:plan.stage,units:'visual metres',holdings:plan.holdings,lanes:plan.lanes,paths:plan.paths,regions:plan.regions},null,2)+'\n');
  for(const quality of ['normal','low']){await page.setViewportSize({width:600,height:850});await page.selectOption('#distance','near');await page.selectOption('#quality',quality);await page.selectOption('#hamlet-view','green');records.push({viewport:{width:600,height:850},dpr:1,quality,distance:'near',view:'green',...await page.evaluate(()=>landscapeReview.stats)});await page.locator('.stage').screenshot({path:`${folder}/mobile-green-${quality}.jpg`,type:'jpeg',quality:88});}
  if(plotReview){
   await page.setViewportSize({width:1400,height:1100});await page.selectOption('#scene','plots');await page.selectOption('#hamlet-view','overview');
   for(const quality of ['normal','low'])for(const distance of ['near','far']){
    await page.selectOption('#quality',quality);await page.selectOption('#distance',distance);await page.selectOption('#hamlet-view','overview');
    records.push({composition:'plots',quality,distance,viewport:{width:1400,height:1100},dpr:1,...await page.evaluate(()=>({...landscapeReview.stats,contact:landscapeReview.inspectContact(),access:landscapeReview.hamlet.inspect()})),geometryOutputs:await captureGeometryOutputs(page)});
    await page.locator('.stage').screenshot({path:`${folder}/plots-${quality}-${distance}.jpg`,type:'jpeg',quality:90});
   }
   await page.selectOption('#quality','normal');await page.selectOption('#distance','near');
   for(const [view,name] of [['green','shared-boundary'],['gardens','scaled-gardens'],['farm','painted-field']]){await page.selectOption('#hamlet-view',view);await page.locator('.stage').screenshot({path:`${folder}/${name}.jpg`,type:'jpeg',quality:90});}
   const plotPlan=await page.evaluate(()=>({revision:landscapeReview.hamlet.plotDressing.revision,holdings:landscapeReview.plan.holdings,fields:landscapeReview.plan.regions.filter(r=>r.kind==='field'),boundaries:landscapeReview.hamlet.plotDressing.boundaries,plotStats:landscapeReview.hamlet.plotDressing.plotStats,props:landscapeReview.hamlet.plotDressing.props.map(({key,plotKey,kind,origin,scale,yaw})=>({key,plotKey,kind,origin,scale,yaw})),fenceContacts:landscapeReview.hamlet.fenceContacts}));
   const text=JSON.stringify(plotPlan,null,2)+'\n';await writeFile(folder+'/plot-plan.json',text);records.push({composition:'plot-plan',sha256:createHash('sha256').update(text).digest('hex'),bytes:Buffer.byteLength(text)});
   await page.setViewportSize({width:600,height:850});await page.selectOption('#hamlet-view','gardens');await page.locator('.stage').screenshot({path:`${folder}/mobile-plot-gardens.jpg`,type:'jpeg',quality:88});
  }
  const files=['assets/wv/landscape-next/hamlet-plan.mjs','assets/wv/landscape-next/hamlet-props.mjs','assets/wv/landscape-next/hamlet-scene.mjs','assets/wv/landscape-next/landscape.glb','assets/wv/buildings-next/catalog.glb','ui-kit/wv006-landscape.mjs','ui-kit/wv006-landscape.html','ui-kit/wv006-landscape.css',...(plotReview?['assets/wv/landscape-next/painted-fields.mjs','assets/wv/landscape-next/plot-geometry.mjs','assets/wv/landscape-next/plot-boundaries.mjs','assets/wv/landscape-next/plot-dressing.mjs','assets/wv/landscape-next/plot-fence-view.mjs','assets/wv/landscape-next/plot-study.mjs','assets/wv/landscape-next/manifest.json','assets/wv/buildings-next/manifest.json','scripts/measure-wv006-landscape.mjs']:[])];
  const dependencies=await Promise.all(files.map(async path=>{const bytes=await readFile(path);return{path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};}));
  const report={revision:plan.revision,status:'gallery-review',runtimeReady:false,phonePerformanceVerified:false,scope:(plotReview?'Plot-aware review with shared physical boundaries and a committed painted-field fixture. ':'')+'Detached authored hamlet; includes C buildings at fixed 2.8, B natural collection, original procedural props, semantic ground and foundations. Not the playable generator or a simulation.',sourceArt:'Committed licensed C/B derivatives; new prop geometry and ground artwork are original project recipes. No private archive input.',timingConditions:'Cloud Chromium software rendering, no overlapping local browser suite; submission timings are not physical-phone FPS.',dependencies,propMeasurements,records};
  await writeFile(folder+'/measurements.json',JSON.stringify(report,null,2)+'\n');console.log(records.map(({access,contact,...r})=>({...r,accessErrors:access?.length,contactErrors:contact?.length})));
 }finally{await browser.close();}
}

async function captureGeometryOutputs(page){
 return page.evaluate(async()=>{
  const h=landscapeReview.hamlet,kinds=new Map(h.props.map(p=>[p.key,p.kind])),meshes=[];
  h.group.traverse(n=>{if(!n.isInstancedMesh)return;const kind=n.userData.kind||kinds.get(n.userData.keys?.[0]);if(kind)meshes.push({n,kind});});
  async function hash(arrays){const bytes=arrays.reduce((n,a)=>n+a.byteLength,0),all=new Uint8Array(bytes);let offset=0;for(const a of arrays){all.set(new Uint8Array(a.buffer,a.byteOffset,a.byteLength),offset);offset+=a.byteLength;}return [...new Uint8Array(await crypto.subtle.digest('SHA-256',all))].map(n=>n.toString(16).padStart(2,'0')).join('');}
  const out=[];for(const {n,kind} of meshes){const g=n.geometry,attributes=Object.entries(g.attributes).sort(([a],[b])=>a.localeCompare(b)),header=new TextEncoder().encode(JSON.stringify(attributes.map(([name,a])=>({name,itemSize:a.itemSize,type:a.array.constructor.name,length:a.array.length})))),arrays=[header,...attributes.map(([,a])=>a.array),...(g.index?[g.index.array]:[])];g.computeBoundingBox();
   out.push({kind,sourceGeometrySHA256:await hash(arrays),instanceMatricesSHA256:await hash([n.instanceMatrix.array]),instances:n.count,trianglesPerInstance:(g.index?.count||g.attributes.position.count)/3,boundsMin:g.boundingBox.min.toArray(),boundsMax:g.boundingBox.max.toArray(),geometryBytes:arrays.slice(1).reduce((n,a)=>n+a.byteLength,0),instanceBytes:n.instanceMatrix.array.byteLength,materials:1,textureBytes:0,status:'gallery-review',runtimeReady:false});
  }return out.sort((a,b)=>a.kind.localeCompare(b.kind));
 });
}
