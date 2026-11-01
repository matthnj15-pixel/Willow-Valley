import * as T from '../assets/vendor/three.module.mjs';
import {createEnvironmentMaterials} from '../environment-materials.mjs';
import {createResourceDisposer} from '../asset-registry.mjs';

const $=id=>document.getElementById(id),canvas=$('catalog'),scene=new T.Scene();scene.background=new T.Color('#aebb9f');
const renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,new URLSearchParams(location.search).get('quality')==='low'?1:1.5));renderer.outputColorSpace=T.SRGBColorSpace;
const camera=new T.PerspectiveCamera(40,1,.1,1200),sun=new T.DirectionalLight('#fff0db',2.3);sun.position.set(-40,65,50);scene.add(sun,new T.HemisphereLight('#e7eff4','#687253',2));
let disposed=false,ready=false,manifest,loadedScene,target=new T.Vector3(),distance=100,azimuth=.35,elevation=.42;
const subjects=[],appearances=new Map(),owned=new Set(),variants=new Set();
const environment=createEnvironmentMaterials({low:new URLSearchParams(location.search).get('quality')==='low',onReady:()=>draw()});
environment.setWorld({width:300,depth:220,options:{seed:'WV-CATALOG-02'},sample:()=>({height:0,water:null})});
const g=new T.PlaneGeometry(300,220);g.rotateX(-Math.PI/2);g.setAttribute('color',new T.Float32BufferAttribute([.35,.43,.27,.35,.43,.27,.35,.43,.27,.35,.43,.27],3));
const ground=environment.material(0),groundMesh=new T.Mesh(g,ground);groundMesh.position.y=-.015;scene.add(groundMesh);owned.add(g);owned.add(ground);
// One shared human geometry and material for every dimensional reference.
function humanGeometry(){
 const parts=[new T.SphereGeometry(.115,10,8).translate(0,1.635,0),new T.CylinderGeometry(.17,.14,.54,8).translate(0,1.22,0)];
 for(const side of [-1,1]){parts.push(new T.CylinderGeometry(.068,.055,.9,6).translate(side*.105,.45,0));parts.push(new T.CylinderGeometry(.05,.045,.62,6).translate(side*.235,1.12,0));}
 const result=new T.BufferGeometry();for(const attr of ['position','normal']){const array=[];for(const p of parts){const n=p.index?p.toNonIndexed():p;array.push(...n.getAttribute(attr).array);if(n!==p)n.dispose();}result.setAttribute(attr,new T.Float32BufferAttribute(array,3));}for(const p of parts)p.dispose();return result;
}
const humanGeo=humanGeometry(),humanMat=new T.MeshStandardMaterial({color:'#426b83',roughness:1});owned.add(humanGeo);owned.add(humanMat);
function shown(e){return $('collection').value==='all'||($('collection').value==='residential'?e.role==='residential':e.role!=='residential');}
function draw(){
 if(disposed)return;const rect=canvas.getBoundingClientRect();if(!rect.width)return;renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;
 camera.position.set(target.x+Math.sin(azimuth)*Math.cos(elevation)*distance,target.y+Math.sin(elevation)*distance,target.z+Math.cos(azimuth)*Math.cos(elevation)*distance);camera.lookAt(target);camera.updateProjectionMatrix();renderer.render(scene,camera);
 for(const s of subjects){const p=s.labelPoint.clone().project(camera);s.label.hidden=!s.group.visible||p.z>1||p.z< -1||Math.abs(p.x)>1||Math.abs(p.y)>1;s.label.style.left=(p.x*.5+.5)*rect.width+'px';s.label.style.top=(-p.y*.5+.5)*rect.height+'px';}
 if(ready)window.buildingCatalog.stats={drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries};
}
function selectCollection(initial=false){
 if(!ready)return;const select=$('design'),previous=select.value;select.replaceChildren(new Option('Collection overview','overview'));for(const s of subjects.filter(s=>shown(s.entry)))select.add(new Option(s.entry.name,s.entry.id));
 select.value=initial&&innerWidth<700?subjects.find(s=>shown(s.entry)).entry.id:[...select.options].some(o=>o.value===previous)?previous:'overview';view();
}
function view(){
 if(!ready)return;const selected=$('design').value;for(const s of subjects){s.group.visible=shown(s.entry)&&(selected==='overview'||selected===s.entry.id);s.person.visible=$('references').checked;}
 const visible=subjects.filter(s=>s.group.visible),bounds=new T.Box3();for(const s of visible)bounds.expandByObject(s.group);bounds.getCenter(target);
 const size=bounds.getSize(new T.Vector3()),rect=canvas.getBoundingClientRect(),aspect=rect.width/rect.height;
 distance=Math.max(28,Math.max(size.x/aspect,size.z*.75,size.y*1.4)/Math.tan(20*Math.PI/180)*.67);
 const angle=$('view').value;azimuth=angle==='rear'?Math.PI+.35:angle==='side'?Math.PI/2:.35;elevation=angle==='roof'?1.2:angle==='eye'?.015:.40;
 if(angle==='eye'&&selected!=='overview')target.y=4.4;
 const entry=visible.length===1?visible[0].entry:null;
 $('kind').textContent=entry?(entry.role==='residential'?'RESIDENTIAL / SHARED HUMAN SCALE':'WORK & COMMERCE / '+entry.role.toUpperCase()):'THE HAMLET COLLECTION';
 $('name').textContent=entry?entry.name:$('collection').value==='work'?'Places to make, store and trade.':$('collection').value==='all'?'Ten places. One village.':'Five ways to make a home.';
 $('description').textContent=entry?entry.description:'Distinct silhouettes and working yards at the approved scale. Choose a design to inspect its entrances, roof closure and relationship to a person.';
 $('record').textContent=JSON.stringify({selected:entry??manifest.entries,rendering:window.buildingCatalog.stats,gameUnitsPerMetre:2.8,humanHeightMetres:1.75,runtimeReady:false},null,2);draw();
}
function appearance(){
 for(const m of variants)m.dispose();variants.clear();const cloned=new Map();
 for(const [mesh,source] of appearances){if(!$('mono').checked&&!$('wire').checked){mesh.material=source;continue;}if(!cloned.has(source)){const m=source.clone();m.wireframe=$('wire').checked;if($('mono').checked){m.map=null;m.color.set('#b6b5a7');}cloned.set(source,m);variants.add(m);}mesh.material=cloned.get(source);}draw();
}
const pointers=new Map();let pinch=0;
canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);};
canvas.onpointermove=e=>{const previous=pointers.get(e.pointerId);if(!previous)return;pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinch)distance=Math.max(15,Math.min(500,distance*pinch/d));pinch=d;}else{azimuth-=(e.clientX-previous[0])*.008;elevation=Math.max(.015,Math.min(1.45,elevation+(e.clientY-previous[1])*.006));}draw();};
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{pointers.delete(e.pointerId);pinch=0;});
canvas.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(15,Math.min(500,distance*Math.exp(e.deltaY*.001)));draw();},{passive:false});
$('collection').onchange=()=>selectCollection();$('design').onchange=view;$('view').onchange=view;$('mono').onchange=appearance;$('wire').onchange=appearance;$('references').onchange=view;$('reset').onclick=view;window.addEventListener('resize',view);
try{
 const [record,gltf]=await Promise.all([fetch('../assets/wv/megakit-catalog-v1/manifest.json').then(r=>{if(!r.ok)throw Error('Catalog manifest unavailable');return r.json();}),new T.GLTFLoader().loadAsync('../assets/wv/megakit-catalog-v1/catalog.glb')]);manifest=record;loadedScene=gltf.scene;
 for(const [index,entry] of manifest.entries.entries()){
  const model=loadedScene.getObjectByName(entry.id);if(!model)throw Error('Missing design: '+entry.id);model.removeFromParent();const group=new T.Group();group.add(model);model.scale.setScalar(2.8);model.position.y=.336;
  group.position.set((index%5-2)*43,0,index<5?-25:30);scene.add(group);
  const person=new T.Mesh(humanGeo,humanMat);person.scale.setScalar(2.8);const entrance=entry.entrances[0]?.threshold??[0,0,2];person.position.set(entrance[0]*2.8-2.6,0,entrance[2]*2.8+Math.max(3,(entry.boundsMax[2]-entrance[2]+.5)*2.8));group.add(person);
  const label=document.createElement('div');label.className='label';label.textContent=entry.name;$('labels').append(label);
  subjects.push({entry,group,model,person,label,labelPoint:new T.Vector3(group.position.x,entry.boundsMax[1]*2.8+2,group.position.z)});
  model.traverse(n=>{if(n.isMesh)appearances.set(n,n.material);});
 }
 window.buildingCatalog={ready:true,stats:{},render:draw,select:id=>{$('collection').value='all';selectCollection();$('design').value=id;view();},inspectShells:()=>{
  const ray=new T.Raycaster(),results=[];scene.updateMatrixWorld(true);
  for(const s of subjects)for(const probe of s.entry.shellProbes){const origin=new T.Vector3(...probe.origin).multiplyScalar(2.8).add(s.group.position).add(new T.Vector3(0,.336,0));ray.set(origin,new T.Vector3(...probe.direction));const hit=ray.intersectObject(s.model,true)[0];results.push({id:s.entry.id,ok:!!hit&&hit.distance<probe.maxDistance*2.8,distance:hit?.distance??null});}return results;
 },measurements:manifest.entries.map(e=>({id:e.id,role:e.role,scale:2.8,entrances:e.entrances,boundsMin:e.boundsMin,boundsMax:e.boundsMax}))};
 ready=true;canvas.dataset.loaded='10';$('status').textContent='Five homes + five working places · fixed 2.8 units / metre · architecture review';selectCollection(true);
}catch(e){$('status').textContent='Catalog unavailable: '+e.message;canvas.dataset.loaded='error';draw();}
window.addEventListener('pagehide',()=>{disposed=true;for(const [mesh,source] of appearances)mesh.material=source;const dispose=createResourceDisposer();dispose(scene);if(loadedScene)dispose(loadedScene);for(const m of variants)m.dispose();environment.dispose();renderer.dispose();});
