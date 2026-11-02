import {createWorld} from '../world-gen.mjs';
import {settlementRenderFixture} from '../settlement-render-fixtures.mjs';
import {mountWorld3D} from './review-renderer.mjs';
import {attachInspectionControls} from './inspection-controls.mjs';
import {createReviewFixture} from './review-fixture.mjs';
import {mountMeadowStudy} from './meadow-study.mjs';
const params=new URLSearchParams(location.search),$=id=>document.getElementById(id),seed=params.get('seed')||'WILLOW-1048',quality=params.get('quality')||'normal',study=params.get('count')==='study',count=Number(params.get('count'))||0,baseline=params.get('treatment')==='before',previous=!params.has('treatment')||params.get('treatment')==='previous';
for(const [id,value] of Object.entries({seed,quality,count:study?'study':String(count),treatment:baseline?'before':previous?'previous':'after'}))$(id).value=value;
if(study){
 $('junction').textContent='Village paths';$('wide').textContent='Village overview';$('near').textContent='Town zoom';$('seed').closest('label').firstChild.textContent='Grass seed';$('treatment').closest('label').hidden=true;$('study-controls').hidden=false;$('study-look').value=params.get('look')||'meadow';$('study-grass').checked=params.get('grass')!=='off';
 document.querySelector('h1').textContent='A sunlit meadow study.';$('intro').textContent='Brighter greens, warm footpaths and individual grass clumps. This small study borrows the existing village context; it does not change the game.';
 const cancellation=new AbortController();window.addEventListener('pagehide',()=>cancellation.abort(),{once:true});
 try{const h=await mountMeadowStudy($('environment'),{low:quality==='low',seed,look:$('study-look').value,grass:$('study-grass').checked,signal:cancellation.signal});window.meadowHarness=h;
  for(const id of ['detail','ground','wide','near','lowpitch','highpitch','forest','junction','cliff','lake','river']){if(h.views[id])$(id).onclick=h.views[id];else $(id).hidden=true;}
  (h.views[params.get('view')]||h.views.detail)();$('study-look').onchange=()=>h.setLook($('study-look').value);$('study-grass').onchange=()=>h.setGrass($('study-grass').checked);
  $('status').textContent='Meadow study ready · four-home visual context · '+quality;$('scope').textContent='The building, planting and layout sources are unchanged committed B/C study assets. Only the meadow surface and additional instanced grass layer are A’s study. There is no new functional building, road, simulation or saved state.';
  $('run').hidden=true;$('record').textContent=JSON.stringify(h.viewer.assetStatus(),null,2);window.addEventListener('pagehide',()=>h.dispose(),{once:true});
 }catch(e){if(!cancellation.signal.aborted)$('status').textContent='Meadow study unavailable: '+e.message;}
 for(const id of ['seed','quality','count'])$(id).onchange=()=>{params.set(id,$(id).value);params.delete('camera');location.search=params;};
}else{
const fixture=count?settlementRenderFixture(count):null,world=fixture?.world||createWorld({seed,size:'small',lakes:2,rivers:1,hills:70,cliffs:65});
const review=fixture?null:createReviewFixture(world),center=review?.center||{x:world.width*.5,y:world.depth*.5},state=fixture?.state||review.state;
const beforeState=JSON.stringify(state),viewer=mountWorld3D($('environment'),world,{baseline,previous,quality:quality==='low'?'lite':'game',animateWater:params.get('motion')!=='off',contextCenter:count?null:center,onAssets:()=>{$('status').textContent='Local models ready · '+(baseline?'existing environment':previous?'published A1 surface':'fine-detail A2 surface');}});
viewer.setSettlement(state);const releaseInspection=attachInspectionControls($('environment'),viewer,world);
function focus(x,y,zoom,pitch=.65){viewer.focusOn(x,y,zoom);viewer.setCamera({...viewer.getCamera(),pitch,yaw:.6,focusY:17});}
const views={ground:()=>{const x=center.x-52,z=center.y-45;viewer.focusOn(x,z);viewer.setCamera({...viewer.getCamera(),zoom:7,pitch:1.1,yaw:.6,focusY:world.sample(x,z).height});},detail:()=>{viewer.focusOn(center.x-52,center.y-52);viewer.setCamera({...viewer.getCamera(),zoom:17,pitch:.58,yaw:.6,focusY:17});},wide:()=>focus(world.width*.5,world.depth*.5,world.depth*.7,.85),near:()=>focus(center.x,center.y,105,.42),junction:()=>{if(review?.junctionState)viewer.setSettlement(review.junctionState);focus(center.x,center.y,110,.78);},forest:()=>{const p=world.trees.find(t=>world.sample(t.x,t.z).water===null)||{x:center.x,z:center.y};focus(p.x,p.z,130,.55);},cliff:()=>{let p=center,slope=0;for(let z=30;z<world.depth;z+=20)for(let x=30;x<world.width;x+=20)if(world.sample(x,z).water===null&&world.slope(x,z)>slope){p={x,y:z};slope=world.slope(x,z);}focus(p.x,p.y,140,.4);},lake:()=>{const p=world.lakes?.find(l=>world.sample(l.x,l.z).kind==='lake');if(p)focus(p.x,p.z,230,.45);},river:()=>{const r=world.rivers?.[0];let p=null,score=Infinity;for(const v of r?.points.slice(6,-6)||[]){const q=world.sample(v.x,v.z);if(q.kind!=='river')continue;const obstruction=[[60,0],[-60,0],[0,60],[0,-60]].reduce((n,[dx,dz])=>n+Math.max(0,world.sample(v.x+dx,v.z+dz).height-q.water),0);if(obstruction<score){p=v;score=obstruction;}}if(p)focus(p.x,p.z,140,.55);},lowpitch:()=>viewer.setCamera({...viewer.getCamera(),pitch:.4}),highpitch:()=>viewer.setCamera({...viewer.getCamera(),pitch:1.35})};
for(const [id,action] of Object.entries(views))$(id).onclick=()=>{if(id!=='junction')viewer.setSettlement(state);action();params.set('view',id);};
const benchmarkCamera={focusY:17,yaw:.71,pitch:.86,zoom:world.depth*.84,focusX:world.width*-.03,focusZ:world.depth*-.02};
if(count)viewer.setCamera(benchmarkCamera);else (views[params.get('view')]||views.detail)();
if(params.has('camera'))try{viewer.setCamera(JSON.parse(params.get('camera')));}catch{}
for(const id of ['seed','quality','count','treatment'])$(id).onchange=()=>{params.set(id,$(id).value);if(id==='treatment')params.set('camera',JSON.stringify(viewer.getCamera()));else params.delete('camera');location.search=params;};
let running=false,cancel=false;
async function measure(duration=8,warmup=2){if(running)throw Error('Already recording');running=true;cancel=false;const times=[],stats=[],initial={...benchmarkCamera};let previous=null,begin=performance.now();$('run').disabled=true;
 await new Promise(resolve=>{function tick(now){if(cancel||document.hidden){resolve();return;}const sec=(now-begin)/1000,phase=sec*.12;viewer.setCamera({...initial,yaw:.71+Math.sin(phase)*.6,pitch:.86+Math.sin(phase*.7)*.25,zoom:initial.zoom*(.5+.5*Math.cos(phase)**2),focusX:initial.focusX+Math.sin(phase)*35});if(sec>=warmup&&previous!==null){times.push(now-previous);stats.push(viewer.assetStatus());}previous=now;if(sec<duration+warmup)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});
 running=false;$('run').disabled=false;const sorted=times.sort((a,b)=>a-b),p=q=>sorted[Math.min(sorted.length-1,Math.floor(sorted.length*q))],peak=k=>Math.max(0,...stats.map(s=>s[k]||0)),gl=$('environment').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');
 const result={seed:fixture?.seed||seed,count,quality,treatment:baseline?'before':previous?'previous':'after',viewport:{width:$('environment').clientWidth,height:$('environment').clientHeight},devicePixelRatio,renderDPR:Math.min(devicePixelRatio,quality==='low'?1:1.5),cameraPath:'orbit-v1',initialCamera:initial,warmupSeconds:warmup,durationSeconds:duration,frameCount:times.length,medianMs:p(.5),p95Ms:p(.95),p99Ms:p(.99),peakDrawCalls:peak('drawCalls'),peakTriangles:peak('triangles'),textureBytes:peak('textureBytes'),surfaceTextureBytes:peak('surfaceTextureBytes'),geometryBytes:peak('geometryBytes'),renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),shadows:false,cancelled:cancel,phonePerformanceVerified:false};$('record').textContent=JSON.stringify(result,null,2);return result;
}
$('run').onclick=()=>void measure(60,10);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel=true;});
window.environmentHarness={viewer,world,state,center,review,measure,serializationUnchanged:()=>beforeState===JSON.stringify(state)};
window.addEventListener('pagehide',()=>{cancel=true;releaseInspection();viewer.dispose();});

}
