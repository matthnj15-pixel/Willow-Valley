import * as THREE from '../assets/vendor/three.module.mjs';
import {createModelRegistry,manifestURL} from '../asset-registry.mjs';
const $=id=>document.getElementById(id),canvas=$('gallery'),status=$('status');
const scene=new THREE.Scene();scene.background=new THREE.Color('#b9c8ad');
const camera=new THREE.OrthographicCamera(-7,7,4,-4,.1,100);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.outputColorSpace=THREE.SRGBColorSpace;
const light=new THREE.DirectionalLight('#fff1db',2);light.position.set(-3,8,5);scene.add(light,new THREE.HemisphereLight('#eff5ff','#61734e',2));
const grid=new THREE.GridHelper(16,16,'#708366','#95a185');grid.position.y=-.01;scene.add(grid);
const content=new THREE.Group();scene.add(content);
const registry=createModelRegistry(new THREE.GLTFLoader());
const manifest=await fetch(manifestURL).then(r=>{if(!r.ok)throw Error('Manifest unavailable');return r.json();});
let generation=0,disposed=false;
function draw(){
 const rect=canvas.getBoundingClientRect();renderer.setSize(rect.width,rect.height,false);
 const aspect=rect.width/rect.height;camera.left=-5.5*aspect;camera.right=5.5*aspect;camera.top=5.5;camera.bottom=-5.5;
 const low=$('view').value==='low',high=$('view').value==='high';
 camera.position.set(3,low?2:high?14:7,12);camera.lookAt(0,.6,0);camera.updateProjectionMatrix();renderer.render(scene,camera);
}
function clear(){
 content.traverse(node=>{if(node.userData.galleryMaterial)node.material.dispose();if(node.userData.ownGeometry)node.geometry.dispose();});
 content.clear();
}
async function update(){
 const token=++generation;clear();status.textContent='Loading local architecture…';
 const entry=manifest.entries.find(e=>e.id===$('asset').value);
 try{
  if(!entry)throw Error('This model is unavailable. Existing settlement visuals remain usable.');
  const gltf=await registry.load(entry.id);if(disposed||token!==generation)return;
  for(let i=0;i<4;i++){
   const group=new THREE.Group(),model=gltf.scene.clone(true);
   model.traverse(node=>{if(node.isMesh){node.material=node.material.clone();node.userData.galleryMaterial=true;
    node.material.wireframe=$('wireframe').checked;
    if($('monochrome').checked){node.material.map=null;node.material.color.set('#b8b5aa');}
   }});
   group.add(model);group.position.x=(i-1.5)*2.5;group.rotation.y=i*Math.PI/2;
   if(entry.entrance){
    const arrow=new THREE.ArrowHelper(new THREE.Vector3(0,0,1),new THREE.Vector3(...entry.entrance.position).add(new THREE.Vector3(0,.08,0)),.65,'#b7752f',.16,.10);group.add(arrow);
    arrow.line.userData.ownGeometry=true;arrow.cone.userData.ownGeometry=true;
   }
   content.add(group);
  }
  const bounds=new THREE.Box3().setFromObject(gltf.scene),size=bounds.getSize(new THREE.Vector3());
  $('record').textContent=JSON.stringify({...entry,measuredSize:size.toArray(),engine:'Three.js '+THREE.REVISION,orientations:[0,90,180,270]},null,2);
  canvas.dataset.loaded=entry.id;canvas.dataset.triangles=String(entry.triangles);status.textContent='Local assembly · '+entry.triangles+' triangles · '+(entry.bytes/1024).toFixed(1)+' KiB · '+entry.status;draw();
 }catch(error){if(token!==generation)return;status.textContent=error.message;canvas.dataset.loaded='missing';$('record').textContent='No model was substituted.';draw();}
}
for(const id of ['asset','wireframe','monochrome'])$(id).addEventListener('change',update);
$('view').addEventListener('change',draw);window.addEventListener('resize',draw);
window.addEventListener('pagehide',()=>{disposed=true;++generation;clear();registry.dispose();grid.geometry.dispose();grid.material.dispose();renderer.dispose();});
await update();
