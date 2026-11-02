import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';

test('local inspection switches real fixtures, checks month, exports schema and preserves all storage',async({page})=>{
  const external=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).origin!=='http://127.0.0.1:4173')external.push(r.url());});
  await page.goto('/ui-kit/wv007-diagnostics.html');
  await expect(page.locator('#status')).toContainText('Combined renderer unavailable');
  await page.evaluate(()=>{localStorage.setItem('wv007-test-private','PRIVATE SAVE');});
  const before=await page.evaluate(()=>JSON.stringify(localStorage));
  expect(await page.evaluate(()=>window.wv007Diagnostics.record().fixture.expectedHomes)).toBe(30);
  await page.selectOption('#homes','100');await page.selectOption('#quality','low');await page.selectOption('#scenario','month');
  await page.getByRole('button',{name:'Inspect fixture',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.wv007Diagnostics.record()?.fixture.expectedHomes)).toBe(100);
  const result=await page.evaluate(()=>window.wv007Diagnostics.record());
  expect(result.month.checked).toBe(true);expect(result.requestedQuality).toBe('low');expect(result.effectiveLods).toBeNull();
  expect(result.validMeasurement).toBe(false);expect(result.missingLayers).toEqual(['buildings','world','landscape']);
  const pending=page.waitForEvent('download');await page.locator('#export').click();const download=await pending;
  const json=JSON.parse(await readFile(await download.path(),'utf8'));expect(json.schema).toBe('wv007-local-inspection/v1');
  expect(JSON.stringify(json)).not.toContain('PRIVATE SAVE');expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe(before);
  await page.evaluate(()=>{window.wv007Diagnostics.dispose();window.wv007Diagnostics.dispose();});
  expect(await page.evaluate(()=>window.wv007Diagnostics.disposed)).toBe(true);expect(external).toEqual([]);expect(errors).toEqual([]);
});

test('missing dependencies and late completion after disposal stay unavailable',async({page})=>{
  await page.route('**/profiling/fixtures/*.json',r=>r.abort());await page.goto('/ui-kit/wv007-diagnostics.html');
  await expect(page.locator('#status')).toContainText('Unavailable');await expect(page.locator('#export')).toBeDisabled();
  await page.unroute('**/profiling/fixtures/*.json');
  await page.route('**/profiling/fixtures/*.json',async r=>{await new Promise(resolve=>setTimeout(resolve,300));await r.continue();});
  await page.goto('/ui-kit/wv007-diagnostics.html');await page.evaluate(()=>window.wv007Diagnostics.dispose());
  await page.waitForTimeout(500);expect(await page.evaluate(()=>window.wv007Diagnostics.record())).toBeNull();
  await expect(page.locator('#export')).toBeDisabled();
});

test('browser controller samples RAF, pauses hidden tabs and exports an honest incomplete-host record',async({page},info)=>{
  await page.goto('/ui-kit/wv007-diagnostics.html');await expect(page.locator('#status')).toContainText('Combined renderer unavailable');
  await page.evaluate(async()=>{
    const {createDiagnosticsController}=await import('/render-adoption/profiling/index.mjs');
    window.profilePauseCount=0;window.profileResumeCount=0;
    window.profileTest=createDiagnosticsController({getReadView:()=>({revision:'browser-test',quality:'normal',world:{terrainRevision:'unit'},houses:Array(30),facilities:Array(7)}),
      pause:()=>window.profilePauseCount++,resume:()=>window.profileResumeCount++});
    window.profileTest.start({fixture:{id:'browser-unit-only',isolated:true,expectedHomes:30,complete:false},warmupMs:0,durationMs:100000});
  });
  await expect.poll(()=>page.evaluate(()=>window.profileTest.record().frames.length)).toBeGreaterThan(1);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  const active=await page.evaluate(()=>window.profileTest.record().activeMs);await page.waitForTimeout(70);
  expect(await page.evaluate(()=>window.profileTest.record().activeMs)).toBe(active);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});
  await expect.poll(()=>page.evaluate(()=>window.profileTest.record().activeMs)).toBeGreaterThan(active);
  await page.evaluate(()=>window.profileTest.stop());
  const pending=page.waitForEvent('download');await page.evaluate(()=>window.profileTest.download());
  const downloaded=JSON.parse(await readFile(await (await pending).path(),'utf8'));
  expect(downloaded.schema).toBe('wv007-local-diagnostics/v1');expect(downloaded.valid).toBe(false);
  expect(downloaded.issues).toContain('missing-layer:buildings');expect(downloaded.issues).toContain('interrupted-window');
  expect(downloaded.stats.rafFps).toBeGreaterThan(0);expect(downloaded.stats.renderedFrameObservations).toBe(0);
  expect(downloaded.capabilities.physicalDeviceVerified).toBe(false);
  const path=info.outputPath('unavailable-browser-sample.json');await writeFile(path,JSON.stringify(downloaded,null,2)+'\n');
  await info.attach('unavailable-browser-sample',{path,contentType:'application/json'});
  await page.evaluate(()=>{window.profileTest.dispose();window.profileTest.dispose();});
  const final=await page.evaluate(()=>window.profileTest.record().frames.length);await page.waitForTimeout(70);
  expect(await page.evaluate(()=>window.profileTest.record().frames.length)).toBe(final);
  expect(await page.evaluate(()=>[window.profilePauseCount,window.profileResumeCount])).toEqual([1,1]);
});
