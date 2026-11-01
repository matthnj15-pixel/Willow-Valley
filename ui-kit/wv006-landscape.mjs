import {loadHamletLibrary,HAMLET_LIGHT} from '../assets/wv/landscape-next/hamlet-scene.mjs';
import * as T from '../assets/vendor/three.module.mjs';
import {placeLandscape,createPlacementCache} from '../assets/wv/landscape-next/placement.mjs';
import {createLandscapeLibrary} from '../assets/wv/landscape-next/batches.mjs';
import {landscapeFixture} from '../assets/wv/landscape-next/fixtures.mjs';
import {buildSceneBatches,estimateSceneBytes} from '../scene-batches.mjs';
import {createResourceDisposer,createModelRegistry,HOME_IDS,manifestURL} from '../asset-registry.mjs';
import {homePlacement,facilityPlacement,FACILITY_TYPES} from '../building-visuals.mjs';
const $=id=>document.getElementById(id),canvas=$('landscape'),params=new URLSearchParams(location.search);
for(const id of ['scene','quality','distance','count','growth'])if(params.has(id))$(id).value=params.get(id);
const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});renderer.outputColorSpace=T.SRGBColorSpace;
const scene=new T.Scene();scene.background=new T.Color('#c5d1c7');scene.add(new T.HemisphereLight(HAMLET_LIGHT.sky,HAMLET_LIGHT.ground,HAMLET_LIGHT.fill));const sun=new T.DirectionalLight(HAMLET_LIGHT.sun,HAMLET_LIGHT.intensity);sun.position.set(-.40,.86,.25).multiplyScalar(350);scene.add(sun);
const perspective=new T.PerspectiveCamera(40,1,.1,4000),orthographic=new T.OrthographicCamera(-1,1,1,-1,.1,4000),target=new T.Vector3();let camera=perspective;let hamletLibrary,hamlet,pendingLegacy,pendingHamlet;let radius=150,yaw=.45,pitch=.68,disposed=false,library,manifest,fixture,records=[],batch,context=new T.Group(),terrain,person,labels=[],builds=0,draws=0;
scene.add(context);const cache=createPlacementCache(),registry=createModelRegistry(new T.GLTFLoader()),models=new Map(),disposer=createResourceDisposer();
const metrics={};window.landscapeReview={stats:metrics,render:draw,inspectContact:()=>{if(hamlet)return hamlet.inspectGround();scene.updateMatrixWorld(true);const ray=new T.Raycaster(),errors=[];for(const r of new Map(records.map(r=>[r.assetId,r])).values())for(const p of r.groundContact?.points||[]){ray.set(new T.Vector3(p.x-fixture.world.width/2,p.height+100,p.z-fixture.world.depth/2),new T.Vector3(0,-1,0));const hit=ray.intersectObject(terrain,false)[0];if(!hit||Math.abs(hit.point.y+.025-p.height)>.001)errors.push({key:r.key,expected:p.height,actual:hit?.point.y});}return errors;},setLandscapeVisible:visible=>{if(batch)batch.group.visible=visible;draw();},get hamlet(){return hamlet;},get plan(){return hamlet?.plan;},get records(){return records;},get builds(){return builds;},get cacheRebuilds(){return cache.rebuilds;},get draws(){return draws;},dispose};
function draw(){if(disposed||document.hidden)return;draws++;const rect=canvas.getBoundingClientRect();renderer.setPixelRatio(Math.min(devicePixelRatio||1,$('quality').value==='low'?1:1.5));renderer.setSize(rect.width,rect.height,false);camera=hamlet?orthographic:perspective;camera.aspect=rect.width/rect.height;if(hamlet){const size=radius*.40;camera.left=-size*camera.aspect;camera.right=size*camera.aspect;camera.top=size;camera.bottom=-size;}camera.position.set(target.x+Math.sin(yaw)*Math.cos(pitch)*(hamlet?1400:radius),target.y+Math.sin(pitch)*(hamlet?1400:radius),target.z+Math.cos(yaw)*Math.cos(pitch)*(hamlet?1400:radius));camera.lookAt(target);camera.updateProjectionMatrix();renderer.render(scene,camera);
 for(const l of labels){const p=l.point.clone().project(camera);l.el.hidden=p.z>1||p.z< -1||Math.abs(p.x)>1||Math.abs(p.y)>1;l.el.style.left=(p.x*.5+.5)*rect.width+'px';l.el.style.top=(-p.y*.5+.5)*rect.height+'px';}
 if(hamlet)Object.assign(metrics,hamlet.stats());
 Object.assign(metrics,{drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,...estimateSceneBytes(scene),instances:records.length,landscapeBatches:hamlet?hamlet.stats().landscapeBatches:batch?.group.children.length||0,builds,phonePerformanceVerified:false});$('status').textContent=hamlet?`${hamlet.plan.stage} homes · a shared green, household gardens and working yards`:`${records.length} natural instances · ${metrics.drawCalls} calls · ${metrics.triangles.toLocaleString()} triangles`;
}
function reset(){if(hamlet){const v=hamlet.plan.camera[$('hamlet-view').value];target.set(v.x*2.8,5,v.z*2.8);radius=v.zoom*2.8;pitch=.64;yaw=.45;draw();return;}if($('scene').value==='collection'){const r=records.find(r=>r.assetId===$('form').value);if(r){const e=manifest.entries.find(e=>e.id===r.assetId);target.set(r.origin[0],Math.max(1,e.boundsMax[1]*1.4),r.origin[2]);radius=Math.max(13,e.boundsMax[1]*9);pitch=.40;person?.position.set(r.origin[0]+Math.max(3,e.boundsMax[0]*2.8+2),0,r.origin[2]+2);}else{target.set(0,7,12);radius=innerWidth<700?245:180;pitch=.88;}}else {target.set(0,8,0);radius=fixture.world.depth*1.02;pitch=.72;}yaw=.45;draw();}
function humanGeometry(){
 const parts=[new T.SphereGeometry(.115,10,8).translate(0,1.635,0),new T.CylinderGeometry(.17,.14,.54,8).translate(0,1.22,0)];
 for(const side of [-1,1]){parts.push(new T.CylinderGeometry(.068,.055,.9,6).translate(side*.105,.45,0));parts.push(new T.CylinderGeometry(.05,.045,.62,6).translate(side*.235,1.12,0));}
 const result=new T.BufferGeometry();for(const attr of ['position','normal']){const values=[];for(const p of parts){const n=p.index?p.toNonIndexed():p;values.push(...n.attributes[attr].array);if(n!==p)n.dispose();}result.setAttribute(attr,new T.Float32BufferAttribute(values,3));}for(const p of parts)p.dispose();return result;
}
function ground(world){const [nx,nz]=$('scene').value==='settlement'?[62,46]:[64,48],g=new T.PlaneGeometry(world.width,world.depth,nx,nz);g.rotateX(-Math.PI/2);const p=g.attributes.position,c=[];for(let i=0;i<p.count;i++){const v=world.sample(p.getX(i)+world.width/2,p.getZ(i)+world.depth/2);p.setY(i,v.height-.025);c.push(...new T.Color(v.water!==null?'#4a829a':Math.abs(v.height%1)<.1?'#7b8960':'#72865c').toArray());}g.setAttribute('color',new T.Float32BufferAttribute(c,3));g.computeVertexNormals();return new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));}
function clear(){hamlet?.dispose();hamlet=null;batch?.dispose();batch=null;if(terrain){scene.remove(terrain);terrain.geometry.dispose();terrain.material.dispose();terrain=null;}for(const o of [...context.children]){o.removeFromParent();o.traverse(n=>{if(n.isInstancedMesh)n.dispose();});}if(person){scene.remove(person);person.geometry.dispose();person.material.dispose();person=null;}for(const l of labels)l.el.remove();labels=[];}
function addContext(id,p){const source=($('scene').value==='yard'||$('scene').value==='smith'?catalogScene?.getObjectByName(id):null)||models.get(id);if(!source||!p)return;const model=source.clone(true);model.position.set(...p.origin);model.scale.setScalar(p.scale);model.rotation.y=p.yaw;return{scene:model,entityKey:id+':'+p.origin.join(',')};}
function rebuild(){if(disposed||($('scene').value==='hamlet'?!hamletLibrary:!library))return;clear();for(const key of Object.keys(metrics))delete metrics[key];builds++;const name=$('scene').value,quality=$('quality').value,distance=$('distance').value;
 for(const [id,show] of [['growth-control',name==='hamlet'],['view-control',name==='hamlet'],['form-control',name==='collection'],['count-control',name==='settlement']])$(id).hidden=!show;
 if(name==='hamlet'){hamlet=hamletLibrary.build({stage:Number($('growth').value),quality,distance});scene.add(hamlet.group);records=hamlet.nature;canvas.dataset.loaded='20';canvas.dataset.composition=name;canvas.dataset.homes=String(hamlet.plan.stage);$('caption').textContent=hamlet.plan.stage===4?'The first holdings around an old lane.':hamlet.plan.stage===12?'A place to live, grow and work.':'New lanes, with the old hamlet still at their heart.';reset();$('record').textContent=JSON.stringify({revision:hamlet.plan.revision,...hamlet.stats(),propMeasurements:hamlet.sourceMeasurements(),source:hamlet.plan.source},null,2);return;}
 canvas.dataset.composition=name;delete canvas.dataset.homes;
 if(name==='collection'){
  fixture={world:{width:220,depth:160,sample:()=>({height:0,water:null})}};records=manifest.entries.map((e,i)=>{const x=(i%5-2)*37,z=(Math.floor(i/5)-1.5)*35,origin=[x,0,z],r={assetId:e.id,key:'collection:'+e.id,origin,scale:2.8,yaw:.25,quality,lod:distance==='far'?'far':quality==='low'?'low':'normal'};const el=document.createElement('span');el.className='label';el.textContent=e.name;$('labels').append(el);labels.push({el,point:new T.Vector3(x,Math.min(e.boundsMax[1]*2.8+1,29),z)});return r;});
 }else{
  fixture=landscapeFixture(name,Number($('count').value));const result=cache.get({...fixture.input,entries:manifest.entries,quality,distance,terrainRevision:name+'-display-64x48-v1',catalogRevision:manifest.revision});records=result.instances;metrics.retainedTrees=result.retainedTrees.length;metrics.exclusionQueries=result.diagnostics;
  const objects=[];
  if(name==='settlement'){
   for(const h of fixture.state.houses){const p=homePlacement(fixture.surface,h,architecture.entries);const o=p&&addContext(p.id,p);if(o)objects.push(o);}
   for(const b of fixture.state.buildings){const p=facilityPlacement(fixture.surface,b,fixture.state,architecture.entries);const o=p&&addContext(p.id,p);if(o)objects.push(o);}
  }else if(name==='yard'||name==='smith'){
   const id=name==='yard'?'home-steep-gable':'facility-smith';const o=addContext(id,{origin:[87-fixture.world.width/2,fixture.surface.sample(87,80).height,80-fixture.world.depth/2],scale:2.8,yaw:0});if(o)objects.push(o);
  }
  for(const b of buildSceneBatches(objects))context.add(b);
 }
 batch=library.build(records);scene.add(batch.group);terrain=ground(fixture.surface||fixture.world);scene.add(terrain);
 person=new T.Mesh(humanGeometry(),new T.MeshStandardMaterial({color:'#476b7a',roughness:1}));person.scale.setScalar(2.8);const px=name==='collection'?-99:(name==='bank'?85:35)-fixture.world.width/2,pz=name==='collection'?65:105-fixture.world.depth/2;person.position.set(px,fixture.world.sample(px+fixture.world.width/2,pz+fixture.world.depth/2).height,pz);scene.add(person);
 $('caption').textContent={collection:'Twenty recognizable natural forms.',forest:'A layered edge, with open clearings.',bank:'Moisture gathers the bank plants.',yard:'A cottage with room at the door.',smith:'Bare ground for a working yard.',settlement:'Mature woodland frames the settlement.'}[name];canvas.dataset.loaded='20';reset();$('record').textContent=JSON.stringify({revision:manifest.revision,quality,distance,rendering:metrics,retainedTreePolicy:'Keep existing presentation on candidate rejection',dependencies:manifest.dependencies,runtimeReady:false},null,2);
}
let architecture,catalogScene;
async function ensureScene(){
 try{
  if($('scene').value==='hamlet'){
   pendingHamlet??=loadHamletLibrary();hamletLibrary=await pendingHamlet;
   if(disposed){hamletLibrary.dispose();return;}
  }else{
   pendingLegacy??=(async()=>{
 const [m,g,a]=await Promise.all([fetch('../assets/wv/landscape-next/manifest.json').then(r=>{if(!r.ok)throw Error('Manifest unavailable');return r.json();}),new T.GLTFLoader().loadAsync('../assets/wv/landscape-next/landscape.glb'),fetch(manifestURL).then(r=>r.json())]);
 manifest=m;for(const e of manifest.entries)$('form').add(new Option(e.name,e.id));library=createLandscapeLibrary(g.scene);architecture=a;
 catalogScene=(await new T.GLTFLoader().loadAsync('../assets/wv/megakit-catalog-v1/catalog.glb')).scene;
 await Promise.all([...HOME_IDS,...FACILITY_TYPES.map(t=>'facility-'+t)].map(async id=>models.set(id,(await registry.load(id)).scene)));
 if(disposed){library.dispose();if(catalogScene)disposer(catalogScene);await registry.dispose();}

   })();await pendingLegacy;
  }
  if(!disposed)rebuild();
 }catch(e){if(!disposed){canvas.dataset.loaded='error';$('status').textContent='Landscape unavailable: '+e.message;console.error(e);}}
}
void ensureScene();
for(const id of ['scene','quality','distance','count','growth'])$(id).onchange=()=>{void ensureScene();};$('hamlet-view').onchange=reset;$('reset').onclick=reset;$('form').onchange=()=>{$('scene').value='collection';if(!records.some(r=>r.key.startsWith('collection:')))void ensureScene();else reset();};
const pointers=new Map();let pinch=0;canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);};canvas.onpointermove=e=>{const old=pointers.get(e.pointerId);if(!old)return;pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2){const[a,b]=[...pointers.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinch)radius=Math.max(15,Math.min(2000,radius*pinch/d));pinch=d;}else{yaw-=(e.clientX-old[0])*.008;pitch=Math.max(.08,Math.min(1.48,pitch+(e.clientY-old[1])*.006));}draw();};for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{pointers.delete(e.pointerId);pinch=0;});canvas.addEventListener('wheel',e=>{e.preventDefault();radius=Math.max(15,Math.min(2400,radius*Math.exp(e.deltaY*.001)));draw();},{passive:false});
window.addEventListener('resize',draw);document.addEventListener('visibilitychange',draw);window.addEventListener('pagehide',dispose);
function dispose(){if(disposed)return;disposed=true;clear();hamletLibrary?.dispose();library?.dispose();void registry.dispose();disposer(context);if(catalogScene)disposer(catalogScene);renderer.dispose();renderer.forceContextLoss();window.removeEventListener('resize',draw);document.removeEventListener('visibilitychange',draw);}
