import * as T from '../assets/vendor/three.module.mjs';
import {homePlacement,facilityPlacement} from '../building-visuals.mjs';
import {createEnvironmentMaterials} from '../environment-materials.mjs';
const $=id=>document.getElementById(id),canvas=$('study'),scene=new T.Scene();scene.background=new T.Color('#aebb9f');
const renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;
const camera=new T.PerspectiveCamera(40,1,.1,800),sun=new T.DirectionalLight('#fff0db',2.3);sun.position.set(-30,65,40);scene.add(sun,new T.HemisphereLight('#e7eff4','#687253',2));
const environment=createEnvironmentMaterials({low:new URLSearchParams(location.search).get('quality')==='low',onReady:()=>draw()});
const world={width:220,depth:180,options:{seed:'WV-SCALE-01'},sample:()=>({height:0,water:null}),slope:()=>0};environment.setWorld(world);
let disposed=false,ready=false,azimuth=.35,elevation=.42,distance=137,target=new T.Vector3(0,6,5),roadMaterial;
const subjects=new Map();
const labels=[],originalMaterials=new Map(),owned=new Set(),clones=[];
function label(text,position,subject='all'){const el=document.createElement('div');el.className='label';el.textContent=text;$('labels').append(el);labels.push({el,point:new T.Vector3(...position),subject});}
function mesh(g,m,position){const o=new T.Mesh(g,m);o.position.set(...position);scene.add(o);owned.add(g);return o;}
function matte(color){const m=new T.MeshStandardMaterial({color,roughness:1});owned.add(m);return m;}
const blue=matte('#426b83');
function human(x,z){
 const group=new T.Group(),s=2.8;group.position.set(x,0,z);group.scale.setScalar(s);scene.add(group);
 const add=(g,p)=>{const o=new T.Mesh(g,blue);o.position.set(...p);group.add(o);owned.add(g);};
 add(new T.SphereGeometry(.115,10,8),[0,1.635,0]);add(new T.CylinderGeometry(.17,.14,.54,8),[0,1.22,0]);
 for(const side of [-1,1]){add(new T.CylinderGeometry(.068,.055,.9,6),[side*.105,.45,0]);add(new T.CylinderGeometry(.05,.045,.62,6),[side*.235,1.12,0]);}
 return group;
}
// Unchanged environment material on a flat dimensional fixture, in game coordinates.
function plane(width,depth,y,material,z=0){const g=new T.PlaneGeometry(width,depth,2,34);g.rotateX(-Math.PI/2);g.translate(0,0,z);const count=g.attributes.position.count;
 g.setAttribute('color',new T.Float32BufferAttribute(Array.from({length:count},()=>[.35,.43,.27]).flat(),3));return mesh(g,material,[0,y,0]);}
const ground=environment.material(0);owned.add(ground);plane(180,150,-.03,ground);
function road(narrow=false){
 if(roadMaterial){owned.delete(roadMaterial);roadMaterial.dispose();}roadMaterial=environment.material(5);owned.add(roadMaterial);
 if(narrow)roadMaterial.fragmentShader=roadMaterial.fragmentShader.replace('vKind<1.5?.92:','vKind<1.5?(1.-smoothstep(4.5,8.5,abs(vOffset)))*.92:');
 for(const o of [...scene.children])if(o.userData.road){owned.delete(o.geometry);o.geometry.dispose();scene.remove(o);}
 const o=plane(154,34,.015,roadMaterial,37),g=o.geometry,count=g.attributes.position.count;
 const offsets=[],kinds=[];for(let i=0;i<count;i++){const offset=g.attributes.position.getZ(i)-37;offsets.push(offset);kinds.push(Math.abs(offset)<=12?1:2);}
 g.setAttribute('surfaceOffset',new T.Float32BufferAttribute(offsets,1));g.setAttribute('surfaceKind',new T.Float32BufferAttribute(kinds,1));o.userData.road=true;
}
road();
function draw(){if(disposed)return;const r=canvas.getBoundingClientRect();if(!r.width)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.position.set(target.x+Math.sin(azimuth)*Math.cos(elevation)*distance,target.y+Math.sin(elevation)*distance,target.z+Math.cos(azimuth)*Math.cos(elevation)*distance);camera.lookAt(target);camera.updateProjectionMatrix();renderer.render(scene,camera);
 for(const {el,point,subject} of labels){const p=point.clone().project(camera);el.style.left=(p.x*.5+.5)*r.width+'px';el.style.top=(-p.y*.5+.5)*r.height+'px';el.hidden=($('focus').value!=='all'&&subject!=='all'&&subject!==$('focus').value)||p.z>1||p.z< -1||Math.abs(p.x)>1||Math.abs(p.y)>1;}
 if(ready)window.scaleStudy.stats={drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries};
}
const views={all:[[0,6,6],137],new:[[0,8,0],43],old:[[-36,12,0],67],lumber:[[40,10,0],73],door:[[9,3,13],32],road:[[0,2,37],85]};
function view(){for(const [id,nodes] of subjects)for(const node of nodes)node.visible=$('focus').value==='all'||!['new','old','lumber'].includes($('focus').value)||$('focus').value===id;const [point,d]=views[$('focus').value];target.fromArray(point);distance=d;const angle=$('angle').value;azimuth=angle==='rear'?Math.PI+.35:angle==='side'?Math.PI/2:.35;elevation=angle==='high'?1.2:angle==='low'?.015:.42;if(angle==='low')target.y=4.9;draw();}
function appearance(){scene.traverse(n=>{if(!n.isMesh||n.userData.road||n.material.isShaderMaterial)return;if(!originalMaterials.has(n))originalMaterials.set(n,n.material);const source=originalMaterials.get(n);if(n.material!==source)n.material.dispose();const m=source.clone();m.wireframe=$('wire').checked;if($('mono').checked){m.map=null;m.color.set('#b6b5a7');}n.material=m;});draw();}
for(const id of ['focus','angle'])$(id).addEventListener('change',view);for(const id of ['mono','wire'])$(id).addEventListener('change',appearance);$('narrow').addEventListener('change',()=>{road($('narrow').checked);draw();});$('reset').onclick=()=>{$('focus').value='all';$('angle').value='front';view();};
const pointers=new Map();let pinch=0;canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);};canvas.onpointermove=e=>{const old=pointers.get(e.pointerId);if(!old)return;pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinch)distance=Math.max(12,Math.min(220,distance*pinch/d));pinch=d;}else{azimuth-=(e.clientX-old[0])*.008;elevation=Math.max(.015,Math.min(1.45,elevation+(e.clientY-old[1])*.006));}draw();};for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{pointers.delete(e.pointerId);pinch=0;});canvas.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(12,Math.min(220,distance*Math.exp(e.deltaY*.001)));draw();},{passive:false});window.addEventListener('resize',draw);
try{
 const loader=new T.GLTFLoader(),[study,legacy,manifest]=await Promise.all([loader.loadAsync('../assets/wv/megakit-v1/study.glb'),loader.loadAsync('../assets/wv/architecture-v1/home-steep-gable.glb'),fetch('../assets/wv/architecture-v1/manifest.json').then(r=>r.json())]);
 const lumber=await loader.loadAsync('../assets/wv/architecture-v1/facility-lumber.glb');clones.push(study.scene,legacy.scene,lumber.scene);
 const newRoot=study.scene.getObjectByName('home-steep-gable');if(!newRoot)throw Error('Missing cottage assembly');newRoot.removeFromParent();newRoot.scale.setScalar(2.8);newRoot.position.y=.336;scene.add(newRoot);
 const house={x:74,y:90,foundedTurn:0,foundedEra:0,orientation:0};const old=homePlacement(world,house,manifest.entries,'home-steep-gable');legacy.scene.scale.setScalar(old.scale);legacy.scene.position.set(-36,.8,0);scene.add(legacy.scene);
 const camp=facilityPlacement(world,{type:'lumber',x:150,y:90},{roads:[],localLanes:[]},manifest.entries);lumber.scene.scale.setScalar(camp.scale);lumber.scene.position.set(40,.8,0);lumber.scene.rotation.y=camp.yaw;scene.add(lumber.scene);subjects.set('new',[newRoot]);subjects.set('old',[legacy.scene]);subjects.set('lumber',[lumber.scene]);
 for(const [name,pos] of [['Prop_Wagon',[14,0,13]],['Prop_WoodenFence_Single',[5,0,14]],['Door_1_Round',[-5,0,14]]]){const n=study.scene.getObjectByName(name+'-fixture');n.removeFromParent();const b=new T.Box3().setFromObject(n);n.position.set(pos[0]-(b.min.x+b.max.x)/2*2.8,-b.min.y*2.8,pos[2]-(b.min.z+b.max.z)/2*2.8);n.scale.setScalar(2.8);scene.add(n);}
 human(-3,8);human(-27,8);human(32,6);human(-8,14);
 // Bases use actual legacy placements, with their floor held at its existing +0.8.
 const stone=matte('#777063');subjects.get('old').push(mesh(new T.BoxGeometry(old.width,.8,old.depth),stone,[-36,.4,0]));
 for(const rect of manifest.entries.find(e=>e.id==='facility-lumber').foundationRects||[]){const [x,z,w,d]=rect,s=camp.scale,c=Math.cos(camp.yaw),n=Math.sin(camp.yaw);const pad=mesh(new T.BoxGeometry(w*s,.8,d*s),stone,[40+(x*c+z*n)*s,.4,(-x*n+z*c)*s]);pad.rotation.y=camp.yaw;subjects.get('lumber').push(pad);}
 label('01 / EXISTING COTTAGE',[-36,old.scale*2.4+2,0],'old');label('02 / MEGAKIT · 4 × 4 m',[0,21,0],'new');label('03 / EXISTING LUMBER CAMP',[40,25,0],'lumber');label('1.75 m',[-3,5.5,8]);label('Door · fence · wagon',[7,6,16]);label('24-unit road + shoulders',[0,.5,48]);
 window.scaleStudy={render:draw,inspectShell:()=>{const ray=new T.Raycaster(),results=[];newRoot.updateMatrixWorld(true);for(const y of [1.5,4])for(const [x,z,dx,dz] of [[-4,0,1,0],[4,0,-1,0],[0,-4,0,1],[0,4,0,-1]]){if(y===4&&x!==0)continue;ray.set(new T.Vector3(x*2.8,y*2.8+.336,z*2.8),new T.Vector3(dx,0,dz));const hits=ray.intersectObject(newRoot,true);results.push({y,x,z,hits:hits.length,nearestGameUnits:hits[0]?.distance??null});}return results;},ready:true,stats:{},oldScale:old.scale,lumberScale:camp.scale,newScale:2.8,humanHeight:4.9,roadWidth:24,shoulderEnvelope:34};ready=true;canvas.dataset.loaded='true';
 const record=await fetch('../assets/wv/megakit-v1/manifest.json').then(r=>r.json());$('status').textContent='Verified CC0 source · fixed 2.8 game units / metre · gallery only';view();$('record').textContent=JSON.stringify({measurements:record,placement:window.scaleStudy},null,2);
}catch(e){$('status').textContent='Study unavailable: '+e.message;canvas.dataset.loaded='error';draw();}
window.addEventListener('pagehide',()=>{disposed=true;const geometries=new Set(),materials=new Set(),textures=new Set();for(const root of [scene,...clones])root.traverse(n=>{if(n.geometry)geometries.add(n.geometry);if(n.material)materials.add(n.material);});for(const m of [...materials,...originalMaterials.values()]){for(const v of Object.values(m))if(v?.isTexture)textures.add(v);m.dispose();}for(const g of geometries)g.dispose();for(const t of textures)t.dispose();for(const resource of owned)resource.dispose();environment.dispose();renderer.dispose();});
