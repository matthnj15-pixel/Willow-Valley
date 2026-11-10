// Actual gameplay distance/culling policy, alongside the separate full-detail
// reference captures. These isolated sessions never access player slots.
import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
const output=process.env.WV007_OUTPUT||'docs/testing/wv007-p5',base=process.env.WV007_BASE_URL||'http://127.0.0.1:4173';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1100,height:950},deviceScaleFactor:1});
const errors=[],measurements=[];page.on('pageerror',e=>errors.push(e.message));
const save=(name,data)=>{const text=JSON.stringify(data,null,2)+'\n',compressed=name.endsWith('-full');return writeFile(`${output}/${name}.json${compressed?'.gz':''}`,compressed?gzipSync(text):text);};
try{
 await writeFile(`${output}/live-measured-admission.json`,await readFile('render-adoption/integration/admission.json'));
 // Borrow only the canvas/layout. This harness supplies the live policy and a
 // single P4 cadence instead of also starting the page's reference controller.
 await page.route('**/ui-kit/wv007-integrated.mjs',route=>route.fulfill({body:'',contentType:'text/javascript'}));
 await page.goto(base+'/dev/ui-kit/wv007-integrated.html');
 for(const homes of [30,100])for(const quality of ['normal','low']){
  await page.evaluate(async({homes,quality})=>{
   window.liveHarness?.dispose();
   const {mountWorld3D}=await import('../world-renderer-three.mjs'),{createFixtureSession,createScenarioDriver}=await import('../render-adoption/profiling/scenarios.mjs'),{createDiagnosticsController}=await import('../render-adoption/profiling/index.mjs');
   const manifest=await(await fetch('../render-adoption/profiling/manifest.json')).json(),fixture=await(await fetch(`../render-adoption/profiling/fixtures/${homes}-homes.json`)).json(),session=createFixtureSession(fixture,{quality}),before=JSON.stringify(session.snapshot());
   const old=document.getElementById('integrated'),canvas=old.cloneNode(false);old.replaceWith(canvas);
   const viewer=mountWorld3D(canvas,session.world,{adoption:true,referenceProfile:false,quality:quality==='low'?'lite':'game',animateWater:false,interactive:false}),first=session.getReadView().houses.find(h=>h.parcel);
   viewer.setCamera({focusX:first.savedPosition.x-session.world.width/2,focusZ:first.savedPosition.y-session.world.depth/2,zoom:650});viewer.setSettlement(session.snapshot());await viewer.whenReady();
   const host=viewer.getAdoptionRuntime(),diagnostics=createDiagnosticsController(host,{requestFrame:()=>null,cancelFrame:()=>{},expectedSourcePins:manifest.expectedSourcePins,presentationProfile:'live-gameplay-water-off'});let frame;
   window.liveHarness={viewer,host,session,async run({zoom=650,scenario='idle',warmupMs=0,durationMs=1000}={}){
    viewer.setCamera({zoom});await viewer.whenReady();
    const driver=scenario==='orbit'?createScenarioDriver(session,scenario,{setCamera:p=>viewer.setCamera(p)}):null;driver?.step(0);await viewer.whenReady();
    const completion=diagnostics.start({fixture:session.metadata(),fixturePins:manifest.fixtures.filter(f=>f.expectedHomes===homes).map(f=>({path:f.path,sha256:f.sha256})),scenario,warmupMs,durationMs});
    function sample(){driver?.step(diagnostics.timing().measurementMs);diagnostics.sample(performance.now());if(diagnostics.status().running)frame=requestAnimationFrame(sample);}frame=requestAnimationFrame(sample);
    const record=await completion;if(before!==JSON.stringify(session.snapshot()))throw Error('Live camera mutated fixture');return record;
   },dispose(){cancelAnimationFrame(frame);diagnostics.dispose();viewer.dispose();}};
   document.getElementById('status').textContent=`${homes} homes · ${quality} · actual gameplay distance/culling policy`;
  },{homes,quality});
  for(const [name,zoom]of[['near',180],['town',650],['far',1200]]){
   const record=await page.evaluate(zoom=>liveHarness.run({zoom}),zoom);await save(`live-${homes}-${quality}-${name}`,record);await page.locator('#integrated').screenshot({path:`${output}/live-${homes}-${quality}-${name}.png`});
   const last=record.statuses.at(-1);measurements.push({homes,quality,zoom,issues:record.issues,warnings:record.warnings,renderer:last.renderer,effectiveHomeLods:last.layers.buildings.effectiveHomeLods,visibleHomeLods:last.layers.buildings.visibleHomeLods,resources:Object.fromEntries(Object.entries(last.layers).map(([key,layer])=>[key,layer.resources]))});
  }
  if(homes===100&&quality==='normal'&&process.env.WV007_FULL_LIVE==='1'){
   const record=await page.evaluate(()=>liveHarness.run({scenario:'orbit',warmupMs:45000,durationMs:60000}));await save('live-100-normal-orbit-full',record);console.log(JSON.stringify({homes,quality,valid:record.valid,issues:record.issues,stats:record.stats}));
  }
  console.log(JSON.stringify({homes,quality,live:true,ready:true}));
 }
 await save('live-summary',{environment:'Headless Chromium/software renderer, actual live distance/culling policy; device acceptance unverified',measurements,errors});
 if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close();}
