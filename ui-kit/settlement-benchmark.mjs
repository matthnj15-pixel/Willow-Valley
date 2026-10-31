import {mountWorld3D} from '../world-renderer-three.mjs';
import {settlementRenderFixture} from '../settlement-render-fixtures.mjs';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
const count=params.get('count')==='100'?100:30,quality=params.get('quality')==='low'?'low':'normal';
$('count').value=String(count);$('quality').value=quality;
const fixture=settlementRenderFixture(count),canvas=$('benchmark');
const benchmarkCamera={yaw:.71,pitch:.86,zoom:fixture.world.depth*.84,focusX:fixture.world.width*-.03,focusZ:fixture.world.depth*-.02};
let ready=false,viewer=null,frame=0,generation=0,latest=null,finishRun=null;
const buildInfo=Promise.all([fetch(new URL('../sw.js',import.meta.url),{cache:'no-store'}).then(r=>r.text()).then(s=>s.match(/const VERSION="([^"]+)"/)?.[1]||'local-workspace'),fetch(new URL('../assets/wv/architecture-v1/manifest.json',import.meta.url)).then(r=>r.json())]).catch(()=>[null,null]);
viewer=mountWorld3D(canvas,fixture.world,{interactive:true,quality:quality==='low'?'lite':'game',onAssets:info=>{ready=info.loaded===info.total;$('status').textContent=ready?'Ready · '+count+' homes · all seven facilities · '+quality:'Some assets are unavailable; retry before benchmarking.';},onError:error=>{$('status').textContent=error.message;}});
viewer.setSettlement(fixture.state);viewer.setCamera(benchmarkCamera);
for(const id of ['count','quality'])$(id).addEventListener('change',()=>{
 const url=new URL(location.href);url.searchParams.set('count',$('count').value);url.searchParams.set('quality',$('quality').value);location.href=url.href;
});
function recording(active){canvas.closest('.viewport').classList.toggle('is-recording',active);$('stop').hidden=!active;}
async function start(duration=60,warmup=10){
 if(!ready)throw Error('Wait for all local assets to load.');
 const token=++generation;$('run').disabled=true;
 const [deploymentCommit,manifest]=await buildInfo;if(token!==generation)return null;recording(true);
 const initial={...benchmarkCamera},times=[],frames=[];
 let resolveRun;const result=new Promise(resolve=>{resolveRun=resolve;}),begin=performance.now();let previous=null;finishRun=()=>resolveRun(null);
 $('run').disabled=true;$('download').disabled=true;
 function tick(now){
  if(token!==generation){resolveRun(null);return;}
  const seconds=(now-begin)/1000,phase=seconds*.12;
  viewer.setCamera({...initial,yaw:.71+Math.sin(phase)*.6,pitch:.86+Math.sin(phase*.7)*.25,zoom:initial.zoom*(.5+.5*Math.cos(phase)**2),focusX:initial.focusX+Math.sin(phase)*35});
  if(seconds>=warmup&&previous!==null){times.push(now-previous);frames.push(viewer.assetStatus());}
  previous=now;$('status').textContent=seconds<warmup?'Warming up…':'Recording · '+Math.min(duration,Math.floor(seconds-warmup))+' / '+duration+' s';
  if(seconds<warmup+duration){frame=requestAnimationFrame(tick);return;}
  const sorted=times.slice().sort((a,b)=>a-b),percentile=p=>sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))];
  const peak=key=>Math.max(0,...frames.map(f=>f[key]||0));
  const resources=performance.getEntriesByType('resource'),assets=resources.filter(r=>r.name.includes('/assets/'));
  latest={deploymentCommit,catalogHashes:manifest?.entries.map(e=>({id:e.id,sha256:e.sha256})),encodedAssetBytes:assets.reduce((n,r)=>n+r.encodedBodySize,0),transferBytes:resources.reduce((n,r)=>n+r.transferSize,0),scene:fixture.seed,cameraPath:'orbit-v1',initialCamera:benchmarkCamera,count,quality,engine:'Three.js 187',device:navigator.userAgent,deviceNotes:$('notes').value||'not provided',viewport:{width:canvas.clientWidth,height:canvas.clientHeight},devicePixelRatio,renderDPR:Math.min(devicePixelRatio,quality==='low'?1:1.5),warmupSeconds:warmup,durationSeconds:duration,frameCount:times.length,medianMs:percentile(.5),p95Ms:percentile(.95),p99Ms:percentile(.99),peakDrawCalls:peak('drawCalls'),peakTriangles:peak('triangles'),estimatedGeometryBytes:peak('geometryBytes'),estimatedTextureBytes:peak('textureBytes'),shadows:false,phonePerformanceVerified:false,thermalConditions:'not measured',recordedAt:new Date().toISOString()};
  $('results').textContent=JSON.stringify(latest,null,2);$('status').textContent='Complete · results describe this browser only';$('run').disabled=false;$('download').disabled=false;finishRun=null;recording(false);viewer.render();resolveRun(latest);
 }
 frame=requestAnimationFrame(tick);return result;
}
$('run').addEventListener('click',()=>{void start().catch(error=>{$('status').textContent=error.message;});});
$('download').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(latest,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=fixture.seed+'-'+quality+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
const stop=()=>{generation++;finishRun?.();finishRun=null;if(frame)cancelAnimationFrame(frame);$('run').disabled=false;recording(false);viewer.render();};
$('stop').addEventListener('click',()=>{stop();$('status').textContent='Cancelled · start a fresh run for measurements.';});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();$('status').textContent='Test paused because the page was hidden. Start a fresh run for measurements.';}});
window.addEventListener('pagehide',()=>{stop();viewer.dispose();});
window.benchmarkHarness={viewer,fixture,start};
