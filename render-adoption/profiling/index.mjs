export const SCHEMA = 'wv007-local-diagnostics/v1';
const LAYERS=['buildings','world','landscape'];
const number=x=>Number.isFinite(x)&&x>=0?x:null;
const clone=x=>JSON.parse(JSON.stringify(x));
const token=x=>typeof x==='string'&&/^[a-zA-Z0-9_./:@+|,-]{1,200}$/.test(x)?x:null;
const revision=x=>x==null?null:token(String(x));
const counts=x=>Object.fromEntries(Object.entries(x||{}).filter(([k,v])=>token(k)&&number(v)!==null));
const pins=x=>Array.isArray(x)?x.filter(p=>token(p?.path)&&/^[a-f0-9]{64}$/.test(p?.sha256)).map(p=>({path:p.path,sha256:p.sha256})):[];

export function percentiles(values) {
  const a=values.filter(x=>Number.isFinite(x)&&x>0).sort((a,b)=>a-b);
  const at=p=>a.length?a[Math.max(0,Math.ceil(p*a.length)-1)]:null;
  return {count:a.length,medianMs:at(.5),p95Ms:at(.95),p99Ms:at(.99),
    rafFps:a.length?1000*a.length/a.reduce((s,x)=>s+x,0):null,
    longFramesOver33_34Ms:a.filter(x=>x>1000/30).length,longFramesOver50Ms:a.filter(x=>x>50).length};
}

export function probeCapabilities(renderer, env=globalThis) {
  const nav=env.navigator||{},doc=env.document,gl=renderer?.getContext?.();
  let maxTextureSize=null;
  try { maxTextureSize=number(gl?.getParameter(gl.MAX_TEXTURE_SIZE)); } catch { /* unavailable/lost context */ }
  return {userAgent:nav.userAgent??null,platform:nav.platform??null,
    browserOS:'As reported by userAgent/platform; no chip or physical device inference',
    standalone:nav.standalone===true||!!env.matchMedia?.('(display-mode: standalone)').matches,
    displayMode:['standalone','fullscreen','minimal-ui','browser'].find(m=>env.matchMedia?.(`(display-mode: ${m})`).matches)??'unknown',
    visibility:doc?.visibilityState??'unknown',viewport:{width:number(env.innerWidth),height:number(env.innerHeight),dpr:number(env.devicePixelRatio)},
    features:{webgl2:renderer?.capabilities?.isWebGL2??(gl&&env.WebGL2RenderingContext?gl instanceof env.WebGL2RenderingContext:null),maxTextureSize,
      serviceWorker:'serviceWorker' in nav,contextLost:gl?.isContextLost?.()??null},
    backend:renderer?.isWebGLRenderer===true?'three-webgl':'unavailable',
    physicalDeviceVerified:false};
}

function layerSnapshot(layer) {
  if (!layer?.status) return {available:false};
  const s=layer.status(), resources=s.resources||s.resourceStats||{};
  return {available:true,contractRevision:token(s.contractRevision),viewRevision:revision(s.viewRevision),
    sourceFamily:token(s.sourceFamily),quality:['normal','low'].includes(s.quality)?s.quality:null,
    ready:s.ready===true,disposed:s.disposed===true,pendingLoads:number(s.pendingLoads),
    failedLoads:number(s.failedLoads),sourcePins:pins(s.sourcePins),outputPins:pins(s.outputPins),
    effectiveLods:counts(s.effectiveLods),effectiveHomeLods:counts(s.effectiveHomeLods),visibleHomeLods:counts(s.visibleHomeLods),
    effectiveMaterialLods:counts(s.effectiveMaterialLods),renderedHomes:number(s.renderedHomes),
    resources:{bufferBytesEstimate:number(resources.bufferBytesEstimate),textureBytesEstimate:number(resources.textureBytesEstimate),
      loadedQualityImages:Array.isArray(resources.loadedQualityImages)?resources.loadedQualityImages.map(i=>({
        quality:['normal','low','shared'].includes(i.quality)?i.quality:null,loaded:number(i.loaded),expected:number(i.expected),
        decodedBytesEstimate:number(i.decodedBytesEstimate)})):null}};
}

function hostSnapshot(host) {
  const view=host.getReadView?.(),r=host.renderer,info=r?.info;
  const camera=host.getCamera?.();
  return {viewRevision:revision(view?.revision),terrainRevision:revision(view?.world?.terrainRevision),
    camera:camera?Object.fromEntries(['focusX','focusZ','yaw','pitch','zoom'].map(k=>[k,Number.isFinite(camera[k])?camera[k]:null])):null,
    requestedQuality:['normal','low'].includes(view?.quality)?view.quality:null,
    population:{homes:number(view?.houses?.length),facilities:number(view?.facilities?.length),
      facilityTypes:[...new Set((view?.facilities||[]).map(f=>f?.type).filter(t=>['farm','lumber','smith','market','granary','park','plaza'].includes(t)))].sort()},
    layers:Object.fromEntries(LAYERS.map(k=>[k,layerSnapshot(host.layers?.[k])])),
    renderer:{backend:r?.isWebGLRenderer===true?'three-webgl':'unavailable',
      scope:host.rendererInfoScope==='whole-host-frame'?'whole-host-frame':'unconfirmed',
      frame:number(info?.render?.frame),calls:number(info?.render?.calls),triangles:number(info?.render?.triangles),
      points:number(info?.render?.points),lines:number(info?.render?.lines),
      geometries:number(info?.memory?.geometries),textures:number(info?.memory?.textures),programs:number(info?.programs?.length)}};
}

export function measurementIssues(snapshot,fixture) {
  const reasons=[];
  if (snapshot.renderer.backend!=='three-webgl') reasons.push('renderer-unavailable');
  if (snapshot.renderer.scope!=='whole-host-frame') reasons.push('combined-renderer-counting-unconfirmed');
  if (['frame','calls','triangles','geometries','textures','programs'].some(k=>snapshot.renderer[k]===null)) reasons.push('renderer-metrics-unavailable');
  if (!fixture?.complete||fixture.isolated!==true||![30,100].includes(fixture.expectedHomes)||snapshot.population.homes!==fixture.expectedHomes) reasons.push('incomplete-isolated-fixture');
  if (snapshot.population.facilityTypes.length!==7) reasons.push('incomplete-facilities');
  if (!snapshot.viewRevision||!snapshot.terrainRevision||!snapshot.requestedQuality) reasons.push('read-view-unavailable');
  for (const [key,s] of Object.entries(snapshot.layers)) {
    if (!s.available) {reasons.push(`missing-layer:${key}`);continue;}
    if (!s.ready||s.disposed||s.pendingLoads!==0||s.failedLoads!==0) reasons.push(`layer-not-ready:${key}`);
    if (!s.contractRevision||!s.sourcePins.length||!s.outputPins.length) reasons.push(`missing-pins-or-contract:${key}`);
    if (s.viewRevision!==snapshot.viewRevision) reasons.push(`stale-layer:${key}`);
    if (s.quality!==snapshot.requestedQuality) reasons.push(`wrong-quality:${key}`);
    if (!Object.keys(s.effectiveLods).length) reasons.push(`missing-effective-lod:${key}`);
    if (!Object.keys(s.effectiveMaterialLods).length) reasons.push(`missing-material-lod:${key}`);
    const res=s.resources;
    if (res.bufferBytesEstimate===null||res.textureBytesEstimate===null||!res.loadedQualityImages?.length||
      res.loadedQualityImages.some(i=>!i.quality||i.loaded===null||i.expected===null||i.loaded!==i.expected||i.decodedBytesEstimate===null)) reasons.push(`incomplete-resources:${key}`);
    if (key==='buildings' && (s.renderedHomes!==fixture?.expectedHomes||Object.values(s.effectiveLods).reduce((a,b)=>a+b,0)<s.renderedHomes)) reasons.push('incomplete-rendered-homes');
    if (key==='buildings' && (Object.values(s.effectiveHomeLods).reduce((a,b)=>a+b,0)!==s.renderedHomes||
      Object.entries(s.effectiveHomeLods).some(([lod,count])=>count>(s.effectiveLods[lod]??0)))) reasons.push('incomplete-home-lod-distribution');
    if (key==='buildings' && (!Object.keys(s.visibleHomeLods).length||Object.entries(s.visibleHomeLods).some(([lod,count])=>count>(s.effectiveHomeLods[lod]??0)))) reasons.push('visible-home-lods-unavailable');
    if (key==='buildings' && s.sourceFamily!=='C4') reasons.push('wrong-building-family');
  }
  return reasons;
}

// Passive until start(). Borrows the renderer/layers/read view. Owns only its
// temporary RAF, event listeners, records and download URL. Never disposes host resources.
export function createDiagnosticsController(host={}, options={}) {
  const env=options.environment??globalThis,doc=env.document;
  const raf=options.requestFrame??env.requestAnimationFrame?.bind(env);
  const cancel=options.cancelFrame??env.cancelAnimationFrame?.bind(env);
  let disposed=false,run=null,handle=null,resolveRun=null,paused=false,last=null;
  const manual=Object.fromEntries(['battery','lowPowerMode','thermal','inputLag','deviceBrowserOS'].map(k=>
    [k,typeof options.manual?.[k]==='string'?options.manual[k].slice(0,500):null]));
  function pause() {
    if (paused||!run||run.completed) return;
    paused=true;last=null;run.interruptions++;
    run.events.push({atActiveMs:run.activeMs,type:'pause',visibility:doc?.hidden?'hidden':'visible'});
    run.issues.add('interrupted-window');
    if (handle!==null) cancel?.(handle);
    handle=null;host.pause?.();
  }
  function resume() {
    if (!paused||disposed||doc?.hidden||!run||run.completed) return;
    paused=false;last=null;run?.events.push({atActiveMs:run.activeMs,type:'resume',visibility:doc?.hidden?'hidden':'visible'});host.resume?.();schedule();
  }
  const visibility=()=>doc?.hidden?pause():resume();
  const contextLost=()=>{if(run&&!run.completed)run.issues.add('webgl-context-lost');pause();};
  const contextRestored=()=>resume();
  doc?.addEventListener('visibilitychange',visibility);
  host.renderer?.domElement?.addEventListener('webglcontextlost',contextLost);
  host.renderer?.domElement?.addEventListener('webglcontextrestored',contextRestored);
  function schedule() {if (run&&!run.completed&&!disposed&&!paused&&raf) handle=raf(t=>{handle=null;sample(t);schedule();});}
  function snapshot() {
    try {return hostSnapshot(host);} catch {run?.issues.add('host-snapshot-failed');return null;}
  }
  function inspect(s) {
    if (!s) return;
    s.viewport={width:number(env.innerWidth),height:number(env.innerHeight),dpr:number(env.devicePixelRatio)};
    s.visibility=doc?.hidden?'hidden':'visible';
    measurementIssues(s,run.fixture).forEach(x=>run.issues.add(x));
    if (!s.camera||Object.values(s.camera).some(v=>v===null)) run.issues.add('actual-camera-unavailable');
    if (s.requestedQuality!==run.requestedQuality) run.issues.add('quality-changed');
    if (s.terrainRevision!==run.terrainRevision) run.issues.add('world-changed');
    if (s.viewRevision!==run.viewRevision&&!run.allowRevisionChange) run.issues.add('unexpected-view-revision');
    if (run.activeMs>=run.warmupMs&&s.layers.buildings.visibleHomeLods?.normal>0) run.observedNormal=true;
    for (const name of LAYERS) {
      const expected=options.expectedSourcePins?.[name];
      if (!expected?.length) {run.issues.add(`expected-source-pins-unavailable:${name}`);continue;}
      if (!expected.every(p=>s.layers[name].sourcePins?.some(actual=>actual.path===p.path&&actual.sha256===p.sha256))) run.issues.add(`source-pin-mismatch:${name}`);
    }
    const work=s.renderer;
    if (work.frame>0&&work.calls>0&&work.triangles>0) run.sceneRendered=true;
    // Camera poses vary every orbit frame. Keep them in raw samples rather than
    // duplicating all layer/resource metadata or scanning an ever-growing list.
    const key=JSON.stringify({...s,renderer:undefined,camera:undefined});
    let statusIndex=run.statusMap.get(key);
    if (statusIndex===undefined) {statusIndex=run.statuses.length;run.statusMap.set(key,statusIndex);run.statuses.push({atActiveMs:run.activeMs,...s});}
    return {statusIndex,...work,camera:s.camera};
  }
  function sample(timestamp) {
    if (!run||run.completed||disposed||paused) return;
    if (!Number.isFinite(timestamp)||timestamp<0||(last!==null&&timestamp<=last)) {
      run.invalidSamples++;run.issues.add('invalid-timestamp');return;
    }
    const prev=last;last=timestamp;
    const before=run.activeMs;
    if (prev!==null) run.activeMs+=timestamp-prev;
    const s=snapshot(),work=inspect(s);
    const measuring=before>=run.warmupMs&&prev!==null;
    if (measuring) {
      const dt=timestamp-prev;
      run.frames.push({atActiveMs:run.activeMs,intervalMs:dt,...work});
      if (work && work.frame!==run.lastFrame) run.renderedSamples++;
    }
    if (work) run.lastFrame=work.frame;
    if (run.activeMs>=run.warmupMs+run.durationMs) finish();
  }
  function record() {
    if (!run) return null;
    const issues=new Set(run.issues);
    if (!run.completed) issues.add('measurement-incomplete');
    if (run.activeMs<run.warmupMs+run.durationMs) issues.add('measurement-window-too-short');
    if (run.requestedQuality==='normal'&&!run.observedNormal) issues.add('normal-reference-never-rendered');
    if (run.scenario==='month'&&run.monthOutcome?.checked!==true) issues.add('month-outcome-unchecked');
    if (!run.frames.length) issues.add('no-frame-samples');
    if (!run.sceneRendered) issues.add('no-rendered-scene-evidence');
    const frames=run.frames, stats=percentiles(frames.map(f=>f.intervalMs));
    return {schema:SCHEMA,createdAt:run.createdAt,completed:run.completed,valid:issues.size===0,issues:[...issues].sort(),
      scenario:run.scenario,cameraPath:`wv007-${run.scenario}-v1`,fixture:run.fixture,fixturePins:run.fixturePins,
      requestedQuality:run.requestedQuality,warmupMs:run.warmupMs,durationMs:run.durationMs,activeMs:run.activeMs,
      interruptions:run.interruptions,invalidSamples:run.invalidSamples,capabilities:run.capabilities,
      manual:run.manual,monthOutcome:run.monthOutcome,stats:{...stats,renderedFrameObservations:run.renderedSamples,
        peakCalls:frames.length?Math.max(...frames.map(f=>f.calls??0)):null,
        peakTriangles:frames.length?Math.max(...frames.map(f=>f.triangles??0)):null},
      warnings:[...(frames.some(f=>(f.triangles??0)>(run.requestedQuality==='low'?150000:250000))?['provisional-triangle-guard']:[]),
        ...(frames.some(f=>(f.calls??0)>(run.requestedQuality==='low'?100:150))?['provisional-draw-call-guard']:[])],
      interpretation:'RAF intervals measure browser callback pacing, including idle. Renderer frame tokens identify observed renderer work; on-demand idle pacing is not rendered FPS. renderer.info reports counts, not exact GPU/JS memory. Cloud/emulated runs do not approve a physical phone.',
      deviceAcceptance:'unverified — requires installed target device, cold offline checklist and sustained play',
      events:run.events,statuses:run.statuses,frames};
  }
  function finish() {
    if (!run||run.completed) return record();
    run.completed=true;
    if (handle!==null) cancel?.(handle);
    handle=null;
    const result=record();resolveRun?.(result);resolveRun=null;return result;
  }
  return {
    start({fixture,fixturePins=[],scenario='idle',warmupMs=45000,durationMs=60000,allowRevisionChange=false}={}) {
      if (disposed||run&&!run.completed) throw Error('Controller disposed or already measuring');
      if (!['idle','orbit','zoom','month'].includes(scenario)||![warmupMs,durationMs].every(x=>Number.isFinite(x)&&x>=0)||durationMs===0) throw Error('Invalid sampling window/scenario');
      const s=hostSnapshot(host);
      run={createdAt:new Date().toISOString(),completed:false,issues:new Set(),fixture:{id:token(fixture?.id),
        isolated:fixture?.isolated===true,complete:fixture?.complete===true,expectedHomes:number(fixture?.expectedHomes)},
        fixturePins:pins(fixturePins),scenario,warmupMs,durationMs,allowRevisionChange:scenario==='month'&&allowRevisionChange,
        requestedQuality:s.requestedQuality,viewRevision:s.viewRevision,terrainRevision:s.terrainRevision,
        activeMs:0,frames:[],statuses:[],statusMap:new Map(),events:[],interruptions:0,invalidSamples:0,renderedSamples:0,lastFrame:null,sceneRendered:false,
        capabilities:probeCapabilities(host.renderer,env),manual:clone(manual),monthOutcome:null,observedNormal:false};
      if (warmupMs<30000||warmupMs>60000||durationMs<60000) run.issues.add('non-device-duration');
      if (!run.fixturePins.length) run.issues.add('fixture-pins-unavailable');
      last=null;paused=false;inspect(s);
      const completion=new Promise(resolve=>{resolveRun=resolve;});
      if (doc?.hidden) pause();else schedule();
      return completion;
    },
    // Hosts with an existing cadence may inject RAF timestamps instead of supplying requestFrame.
    sample,pause,resume,stop:finish,status:()=>({running:!!run&&!run.completed,paused,disposed}),
    timing:()=>({activeMs:run?.activeMs??0,measurementMs:Math.max(0,(run?.activeMs??0)-(run?.warmupMs??0))}),
    record:()=>clone(record()),
    setMonthOutcome(outcome) {
      if (!run||run.scenario!=='month') throw Error('Not a month scenario');
      // Fixed numeric outcome fields only; never serialize arbitrary application state.
      const values=s=>Object.fromEntries(['turn','people','gold','food','wood','tools','happiness'].map(k=>[k,Number.isFinite(s?.[k])?s[k]:null]));
      const before=values(outcome?.before),after=values(outcome?.after);
      run.monthOutcome={checked:outcome?.checked===true&&[...Object.values(before),...Object.values(after)].every(x=>x!==null)&&after.turn===before.turn+1,
        before,after,events:outcome?.events===true};
    },
    download(filename='wv007-diagnostics.json') {
      const result=record();if (!result) throw Error('No measurement to export');
      const url=env.URL.createObjectURL(new Blob([JSON.stringify(result,null,2)+'\n'],{type:'application/json'}));
      const a=doc.createElement('a');a.href=url;a.download=filename;
      try {doc.body.append(a);a.click();a.remove();} finally {env.URL.revokeObjectURL(url);}
      return result;
    },
    dispose() {
      if (disposed) return;
      if (run&&!run.completed) {run.issues.add('disposed-during-measurement');finish();}
      disposed=true;
      doc?.removeEventListener('visibilitychange',visibility);
      host.renderer?.domElement?.removeEventListener('webglcontextlost',contextLost);
      host.renderer?.domElement?.removeEventListener('webglcontextrestored',contextRestored);
    },
  };
}
