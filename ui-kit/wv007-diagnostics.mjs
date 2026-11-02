import {createFixtureSession, cameraAt} from '../render-adoption/profiling/scenarios.mjs';
import {probeCapabilities} from '../render-adoption/profiling/index.mjs';

let generation=0,disposed=false,current=null,manifest;
const status=document.querySelector('#status'),report=document.querySelector('#inspection'),button=document.querySelector('#export');
async function getJSON(path) {
  const response=await fetch(new URL(path,import.meta.url));
  if (!response.ok) throw Error(`Local dependency unavailable (${response.status})`);
  return response.json();
}
async function inspect(event) {
  event?.preventDefault();const token=++generation;button.disabled=true;
  try {
    manifest??=await getJSON('../render-adoption/profiling/manifest.json');
    const count=Number(document.querySelector('#homes').value),quality=document.querySelector('#quality').value;
    const scenario=document.querySelector('#scenario').value;
    const fixture=await getJSON(`../render-adoption/profiling/fixtures/${count}-homes.json`);
    if (disposed||token!==generation) return;
    const session=createFixtureSession(fixture,{quality}),view=session.getReadView();
    const before=JSON.stringify(session.snapshot());
    const cameras=[0,15,30,45,60].map(t=>({seconds:t,...cameraAt(scenario,t,view,session.cameraPlan)}));
    const month=scenario==='month'?session.advanceMonth():null;
    current={schema:'wv007-local-inspection/v1',validMeasurement:false,issues:['combined-host-unavailable'],
      fixture:session.metadata(),pins:manifest.fixtures.filter(f=>f.expectedHomes===count).map(({path,sha256})=>({path,sha256})),
      requestedQuality:quality,capabilities:probeCapabilities(),missingLayers:['buildings','world','landscape'],
      effectiveLods:null,rendererMetrics:null,cameras,month,
      unchangedByCamera:month?null:before===JSON.stringify(session.snapshot()),
      physicalDeviceVerified:false};
    document.querySelector('#fixture-label').textContent=fixture.label;
    report.textContent=JSON.stringify(current,null,2);status.textContent='Combined renderer unavailable · fixture inspection only · no FPS measurement';button.disabled=false;
  } catch(error) {
    if (disposed||token!==generation) return;
    current=null;status.textContent=`Unavailable: ${error.message}`;report.textContent='No valid measurement. Restore local dependencies and retry.';
  }
}
function download() {
  if (!current||disposed) return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(current,null,2)+'\n'],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='wv007-fixture-inspection.json';
  try {document.body.append(a);a.click();a.remove();} finally {URL.revokeObjectURL(url);}
}
function dispose() {if(disposed)return;disposed=true;generation++;document.querySelector('#controls').removeEventListener('submit',inspect);button.removeEventListener('click',download);window.removeEventListener('pagehide',dispose);}
document.querySelector('#controls').addEventListener('submit',inspect);button.addEventListener('click',download);
window.addEventListener('pagehide',dispose,{once:true});
window.wv007Diagnostics={inspect,dispose,record:()=>structuredClone(current),get disposed(){return disposed;}};
inspect();
