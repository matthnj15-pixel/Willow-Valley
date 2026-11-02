import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createFixtureSession,validateFixture,cameraAt,SCENARIOS} from '../render-adoption/profiling/scenarios.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=path=>readFile(resolve(root,path));
export async function inspectFixtures() {
  const selection=JSON.parse(await read('render-adoption/selection.json'));
  const pin=(path,sha256)=>({path,sha256});
  const expectedSourcePins={
    buildings:[pin(selection.sources.buildings.manifest,selection.sources.buildings.manifestSha256),pin(selection.sources.buildings.bundle,selection.sources.buildings.bundleSha256)],
    world:selection.sourcePins.filter(p=>['environment-next/meadow-layer.mjs','environment-next/previous-materials.mjs'].includes(p.path)),
    landscape:[pin(selection.sources.landscape.manifest,selection.sources.landscape.manifestSha256),pin(selection.sources.landscape.bundle,selection.sources.landscape.bundleSha256)],
  };
  for (const pins of Object.values(expectedSourcePins)) for (const p of pins) {
    if (sha(await read(p.path))!==p.sha256) throw Error(`Selected source mismatch: ${p.path}`);
  }
  const fixtures=[];
  for (const count of [30,100]) {
    const path=`render-adoption/profiling/fixtures/${count}-homes.json`,bytes=await read(path),fixture=JSON.parse(bytes);
    const admission=validateFixture(fixture);if (!admission.complete) throw Error(admission.reasons.join(', '));
    const session=createFixtureSession(fixture),view=session.getReadView(),before=JSON.stringify(session.snapshot());
    const cameras=Object.fromEntries(SCENARIOS.map(name=>[name,[0,15,30,45,60].map(t=>({seconds:t,...cameraAt(name,t,view,session.cameraPlan)}))]));
    if (JSON.stringify(session.snapshot())!==before) throw Error('Camera altered application state');
    const month=session.advanceMonth();
    fixtures.push({id:fixture.id,path,sha256:sha(bytes),expectedHomes:count,facilities:view.facilities.length,
      parcels:view.houses.filter(h=>h.parcel).length,committedFieldCells:view.committedFields.length,
      world:view.world,access:session.metadata().accessCounts,cameraPlan:session.cameraPlan,cameras,month});
  }
  const outputs=[];
  for (const path of ['render-adoption/profiling/index.mjs','render-adoption/profiling/resources.mjs','render-adoption/profiling/scenarios.mjs',
    'render-adoption/profiling/generate-fixtures.mjs','ui-kit/wv007-diagnostics.html','ui-kit/wv007-diagnostics.mjs','ui-kit/wv007-diagnostics.css']) {
    outputs.push(pin(path,sha(await read(path))));
  }
  return {schemaVersion:1,selectionRevision:selection.revision,expectedSourcePins,outputs,fixtures,
    combinedLayers:'unavailable until P5 attachment',physicalDeviceVerified:false};
}

if (process.argv[1]===fileURLToPath(import.meta.url)) {
  const manifest=await inspectFixtures();
  if (process.argv.includes('--write-manifest')) {
    await writeFile(resolve(root,'render-adoption/profiling/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  } else {
    const stored=JSON.parse(await read('render-adoption/profiling/manifest.json'));
    if (JSON.stringify(stored)!==JSON.stringify(manifest)) throw Error('Profiling manifest stale; inspect changes, then use --write-manifest');
  }
  const out=process.argv.indexOf('--output');
  if (out>=0) {
    if (!process.argv[out+1]) throw Error('--output needs a local directory');
    const dir=resolve(process.argv[out+1]);await mkdir(dir,{recursive:true});
    // Honest availability record, never substitute cloud timings for a combined run.
    await writeFile(resolve(dir,'availability.json'),JSON.stringify({schema:'wv007-local-availability/v1',
      valid:false,issues:['combined-host-unavailable','physical-device-not-tested'],manifest},null,2)+'\n');
  }
  console.log(JSON.stringify({fixtures:manifest.fixtures.map(f=>({id:f.id,sha256:f.sha256,homes:f.expectedHomes,
    parcels:f.parcels,fields:f.committedFieldCells,monthChecked:f.month.checked})),
    combinedLayers:manifest.combinedLayers,physicalDeviceVerified:false},null,2));
}
