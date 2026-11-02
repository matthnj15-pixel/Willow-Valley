import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from '../assets/vendor/three.module.mjs';
import {createWorldLayer} from '../render-adoption/world/index.mjs';
import {createClassification} from '../render-adoption/world/classification.mjs';
import {grassRecords,buildGrassGeometry} from '../render-adoption/world/grass.mjs';
import {realWorldFixture,freeze} from '../render-adoption/world/fixtures.mjs';
import {paintZones,zoneAt} from '../organic-world.mjs';
import {U} from '../render-adoption/world/spatial.mjs';
const scene=()=>new T.Scene();
for(const seed of ['WILLOW-1048','WV007-RIVER-2099'])for(const quality of ['normal','low'])test(`P2 real frozen ${seed} ${quality}: classification, ownership, contacts, lifecycle`,async()=>{
 const f=realWorldFixture(seed,quality),s=scene(),originalFog=new T.Fog('red',1,2);s.fog=originalFog;
 let invalidates=0;const layer=createWorldLayer({scene:s,world:f.world,terrainSurface:f.surface,quality,invalidate:()=>invalidates++});
 await layer.update(f.view);assert.equal(layer.status().coverDeferred,true);assert.equal(layer.status().grass.tufts,0);
 await layer.update(f.view,f.context);assert.equal(layer.status().coverDeferred,false);
 const coverage=layer.getCoverage(),camera=new T.OrthographicCamera(-90,90,90,-90,.1,5400),h=f.state.houses[0];
 camera.position.set(h.x-f.world.width/2,350,h.y-f.world.depth/2+300);camera.lookAt(h.x-f.world.width/2,30,h.y-f.world.depth/2);camera.updateProjectionMatrix();
 layer.setCamera(camera);const status=layer.status();assert.ok(status.grass.tufts>0);assert.equal(status.fieldBuilds,2);assert.equal(status.resources.externalImages,0);assert.equal(status.contractRevision,'wv007-layer-1');assert.equal(status.failedLoads,0);assert.ok(status.outputPins.length);assert.ok(Object.values(status.effectiveLods).every(Number.isFinite));assert.ok(Object.values(status.effectiveMaterialLods).every(Number.isFinite));assert.equal(status.resources.textureBytesEstimate,status.fields.decodedBytes);assert.deepEqual(status.resources.loadedQualityImages,[{quality,loaded:0,expected:0,decodedBytesEstimate:0}]);
 for(let i=0;i<10;i++){camera.position.x+=3;camera.updateMatrixWorld();layer.setCamera(camera);}
 assert.equal(layer.getCoverage(),coverage);assert.equal(layer.status().fieldBuilds,status.fieldBuilds);
 assert.equal(JSON.stringify(f.state),f.before);assert.equal(layer.needsAnimation({waterVisible:true}),quality==='normal');
 layer.advance(10,{waterVisible:true});layer.advance(1010,{waterVisible:true});assert.equal(layer.status().surfaceTime,quality==='normal'?.1:0);
 layer.setVisible(false);layer.advance(4000,{waterVisible:true});assert.equal(layer.needsAnimation({waterVisible:true}),false);
 layer.setVisible(true);layer.advance(5000,{waterVisible:true});assert.equal(layer.status().surfaceTime,quality==='normal'?.1:0);
 const detach=layer.attachAtmosphere();assert.notEqual(s.fog,originalFog);detach();assert.equal(s.fog,originalFog);
 const borrowed=new T.BoxGeometry(),mat=new T.MeshBasicMaterial();const foreign=new T.Mesh(borrowed,mat);s.add(foreign);let released=0;borrowed.addEventListener('dispose',()=>released++);
 layer.dispose();layer.dispose();assert.equal(s.children.length,1);assert.equal(released,0);assert.equal(layer.status().resources.textures,0);assert.equal(layer.material(0),null);assert.ok(invalidates>0);borrowed.dispose();mat.dispose();
});
test('P2 stale updates, late disposal, quality switches and failed staging preserve resource ownership',async()=>{
 const f=realWorldFixture(),s=scene(),layer=createWorldLayer({scene:s,world:f.world,terrainSurface:f.surface});
 const a=layer.update(f.view,f.context),b=layer.update({...f.view,revision:'new'},f.context);assert.equal(await a,false);assert.equal(await b,true);assert.equal(layer.status().viewRevision,'new');
 const obsolete=layer.update({...f.view,revision:'obsolete'},f.context);assert.equal(await layer.update({...f.view,revision:'new'},f.context),true);assert.equal(await obsolete,false);assert.equal(layer.status().viewRevision,'new');
 const coverage=layer.getCoverage();await layer.setQuality('low');assert.equal(layer.status().quality,'low');assert.equal(layer.getCoverage().containsCenteredMetres(10,10),coverage.containsCenteredMetres(10,10));
 let deadTexture=0;layer.material(0).uniforms.colorField.value.addEventListener('dispose',()=>deadTexture++);
 await assert.rejects(layer.update({...f.view,revision:'bad'},{placementView:{complete:true,exclusionsWorldGame:[{polygon:[{x:1}]}]}}));
 assert.equal(layer.status().viewRevision,'new');assert.ok(layer.status().error);assert.equal(deadTexture,0);
 const pending=layer.update({...f.view,revision:'late'},f.context);layer.dispose();assert.equal(await pending,false);assert.equal(deadTexture,1);assert.equal(layer.status().pendingLoads,0);assert.equal(s.children.length,0);
});
test('P2 exact displayed contacts include both roots across a terrain diagonal',()=>{
 const f=realWorldFixture(),records=[{key:'crease',x:400.01,y:390.02,scale:U,yaw:.67,brightness:1}];
 for(const low of [false,true]){
  const g=buildGrassGeometry(records,f.surface,f.world,low),p=g.attributes.position;let roots=0;
  // Recipe has two base vertices per blade, 7 vertices normal / 5 low.
  for(let i=0;i<p.count;i++)if(i%(low?5:7)<2){const x=p.getX(i)+f.world.width/2,y=p.getZ(i)+f.world.depth/2;assert.ok(Math.abs(p.getY(i)-f.surface.sample(x,y).height)<.001);roots++;}
  assert.equal(roots,low?10:38);assert.equal(g.index.count/3,low?15:95);g.dispose();
 }
});
test('P2 actual widths/curves/T/acute corridors, rotated exclusions, crops/holes, protection and erased fields',()=>{
 const f=realWorldFixture();let p;
 outer:for(let y=150;y<f.world.depth-150;y+=80)for(let x=150;x<f.world.width-150;x+=80){if([-100,-50,0,50,100].every(dx=>[-100,-50,0,50,100].every(dy=>f.world.sample(x+dx,y+dy).water===null))){p={x,y};break outer;}}
 assert.ok(p,'real dry patch for supplemental road/exclusion cases');const{x,y}=p;
 const polygon=[{x:x-20,y:y-12},{x:x+12,y:y-20},{x:x+20,y:y+12},{x:x-12,y:y+20}];
 const field=[{x:x+30,y:y+30},{x:x+100,y:y+30},{x:x+100,y:y+100},{x:x+30,y:y+100}];
 const hole=[{x:x+45,y:y+45},{x:x+85,y:y+45},{x:x+85,y:y+85},{x:x+45,y:y+85}];
 const view=freeze({...f.view,roads:[{points:[{x:x-100,y:y-80},{x,y:y-60},{x:x+100,y:y-80}],width:34}],localLanes:[{points:[{x:x-40,y:y-60},{x:x-40,y:y+60}],width:5},{points:[{x:x-40,y:y-40},{x:x-10,y:y+30}],width:5}],committedFields:[{kind:'farmland',polygon:field,holes:[hole]}],retainedTrees:[]});
 const ctx=freeze({placementView:{revision:1,complete:true,exclusionsWorldGame:[{polygon}]},landscapeView:{revision:1,complete:true,exclusionsWorldGame:[]}});
 const c=createClassification(f.world,f.surface,view,ctx);
 assert.equal(c.query(x,y).blocked,true);assert.equal(c.query(x,y-60).kind,'road');assert.equal(c.query(x-40,y+20).kind,'lane');
 assert.equal(c.query(x+35,y+35).field,'farmland');assert.equal(c.query(x+65,y+65).field,null);
 const erased=createClassification(f.world,f.surface,{...view,committedFields:[]},ctx);assert.equal(erased.query(x+35,y+35).field,null);
 for(let j=Math.floor((y-100)/64);j<=Math.floor((y+100)/64);j++)for(let i=Math.floor((x-100)/64);i<=Math.floor((x+100)/64);i++)for(const r of grassRecords(f.world,c,i,j))assert.equal(c.query(r.x,r.y,.68*r.scale).cover,true);
 const protectedView={...view,retainedTrees:[{savedPosition:{x,y},protected:true,protectedRadiusWorldGame:30,canopyRadiusWorldGame:10}]};assert.equal(createClassification(f.world,f.surface,protectedView,ctx).query(x,y).blocked,true);
 const sampler=createClassification(f.world,f.surface,{...view,committedFields:{sample:()=>null}},ctx);assert.equal(sampler.safeCover,false);assert.equal(c.coverage('bounds').containsCenteredMetres(1e6,1e6),false);
 const unknown=createClassification(f.world,f.surface,{...view,roads:[{points:view.roads[0].points}]},ctx);assert.equal(unknown.unknownRoadWidths,1);assert.equal(unknown.query(x+200,y+200).cover,false);
});
test('P2 consumes actual committed paint, erase and reloaded classifications without live-state writes',()=>{
 const f=realWorldFixture(),detached=structuredClone(f.state);let p;
 outer:for(let y=150;y<f.world.depth-150;y+=60)for(let x=150;x<f.world.width-150;x+=60){if(f.world.sample(x,y).water===null&&f.world.slope(x,y)<.15&&!f.view.roads.some(r=>r.points.some(a=>Math.hypot(a.x-x,a.y-y)<100))){p={x,y};break outer;}}
 assert.ok(p);assert.equal(paintZones(detached,'farmland',[[p]],54).ok,true);assert.equal(zoneAt(detached,p),'farmland');
 const classify=state=>{const copy=freeze(structuredClone(state));return createClassification(f.world,f.surface,{...f.view,committedFields:{sample:(x,y)=>zoneAt(copy,{x,y}),intersectsCircleWorldGame:()=>true}},f.context);};
 assert.equal(classify(detached).query(p.x,p.y).field,'farmland');
 assert.equal(paintZones(detached,'erase',[[p]],24).ok,true);assert.equal(classify(JSON.parse(JSON.stringify(detached))).query(p.x,p.y).field,null);
 assert.equal(JSON.stringify(f.state),f.before);
});
test('P2 full large world scales its atlas rather than stretching the study resolution',async()=>{
 const f=realWorldFixture('WV007-LARGE','low','large'),layer=createWorldLayer({scene:scene(),world:f.world,terrainSurface:f.surface,quality:'low'});
 await layer.update(f.view,f.context);const s=layer.status();assert.equal(s.fields.columns,Math.ceil(f.world.width/128));assert.equal(s.fields.rows,Math.ceil(f.world.depth/128));assert.equal(s.fields.width,s.fields.columns*8+1);assert.equal(s.fields.decodedBytes,s.fields.width*s.fields.height*8);assert.equal(JSON.stringify(f.state),f.before);layer.dispose();
});
test('P2 exact deterministic runtime closure and source pins; no hidden comparison deps',async()=>{
 const p=JSON.parse(await readFile('assets/wv/runtime-environment-v1/provenance.json','utf8'));
 for(const f of [...p.parents,...p.closure,...p.review]){const b=await readFile(f.path);assert.equal(b.length,f.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),f.sha256);}
 assert.deepEqual(p.glbs,[]);assert.deepEqual(p.images,[]);
 for(const f of p.closure.filter(f=>f.path.startsWith('render-adoption/world/')&&!f.path.endsWith('fixtures.mjs'))){const code=await readFile(f.path,'utf8');assert.doesNotMatch(code,/import .*hamlet|import .*environment-next\/materials|requestAnimationFrame\(|setInterval\(/);}
});
