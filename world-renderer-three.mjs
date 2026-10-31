import * as THREE from './assets/vendor/three.module.mjs';
import {mountWorld3D as mountController} from './ui-kit/render-3d.mjs';
import {createModelRegistry,manifestURL,HOME_IDS} from './asset-registry.mjs';
import {homePlacement} from './building-visuals.mjs';

export function mountWorld3D(canvas,world,options={}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#b5ccbd');
 const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,5400);
 const light=new THREE.DirectionalLight('#fff1db',2);light.position.set(-400,860,250);
 scene.add(light,new THREE.HemisphereLight('#eff5ff','#61734e',2));
 const houses=new THREE.Group();scene.add(houses);
 const buffers=new Map(),registry=createModelRegistry(new THREE.GLTFLoader()),models=new Map();
 let entries=[],disposed=false,contact=world,terrain=null,refresh=()=>{},loaded=0;
 const raycaster=new THREE.Raycaster();
 function updateCamera(view,rect){
  const aspect=rect.width/Math.max(1,rect.height),{yaw,pitch,zoom,focusX,focusZ}=view;
  camera.left=-zoom*aspect;camera.right=zoom*aspect;camera.top=zoom;camera.bottom=-zoom;
  const focus=new THREE.Vector3(focusX,17,focusZ);
  camera.position.copy(focus).add(new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(2700));
  camera.up.set(0,1,0);camera.lookAt(focus);camera.updateProjectionMatrix();camera.updateMatrixWorld();
 }
 // Match legacy vertex lighting exactly for terrain/roads/overlays. Imported
 // glTF materials keep their own sRGB texture and matte lighting pipeline.
 function material(index){return new THREE.ShaderMaterial({
  uniforms:{opacity:{value:index===6?.52:1}},transparent:index===6,depthTest:index!==8,depthWrite:index!==6,side:THREE.DoubleSide,
  vertexShader:'attribute vec3 color; varying vec3 vColor; varying float vLight; void main(){vColor=color;vLight=.70+.30*max(0.,dot(normalize(normal),normalize(vec3(-.40,.86,.25))));gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform float opacity; varying vec3 vColor; varying float vLight; void main(){gl_FragColor=vec4(vColor*vLight,opacity);}'
 });}
 const backend={
  upload(index,data){
   const previous=buffers.get(index);if(previous){scene.remove(previous);previous.geometry.dispose();previous.material.dispose();}
   const geometry=new THREE.BufferGeometry(),array=new THREE.InterleavedBuffer(data,9);
   for(const [name,offset] of [['position',0],['color',3],['normal',6]])geometry.setAttribute(name,new THREE.InterleavedBufferAttribute(array,3,offset));
   const mesh=new THREE.Mesh(geometry,material(index));mesh.renderOrder=index;buffers.set(index,mesh);scene.add(mesh);
   if(index===0)terrain=mesh;
  },
  setTerrain(surface){contact=surface;},
  setSettlement(surface,state,onRefresh){
   refresh=onRefresh;contact=surface;houses.clear();const represented=new Map();
   for(const house of state.houses||[]){
    let p=homePlacement(surface,house,entries);
    // Keep a stable preferred identity. During loading or for an incompatible
    // plot, only use a smaller approved shape; never change saved placement.
    if(!p)for(const id of HOME_IDS){p=homePlacement(surface,house,entries,id);if(p)break;}
    const source=p&&models.get(p.id);if(!source)continue;
    const model=source.clone(true);model.position.set(...p.origin);model.scale.setScalar(p.scale);model.rotation.y=p.yaw;houses.add(model);represented.set(house,p);
   }
   canvas.dataset.modelHouses=String(represented.size);canvas.dataset.loadedModels=String(loaded);canvas.dataset.homeModels=[...new Set([...represented.values()].map(p=>p.id))].sort().join(',');
   return represented;
  },
  draw(view,rect){
   updateCamera(view,rect);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(rect.width,rect.height,false);renderer.render(scene,camera);
   canvas.dataset.drawCalls=String(renderer.info.render.calls);canvas.dataset.triangles=String(renderer.info.render.triangles);
  },
  screenToWorld(x,y,view){
   const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height||!terrain)return null;
   updateCamera(view,rect);raycaster.setFromCamera(new THREE.Vector2((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2),camera);
   const hit=raycaster.intersectObject(terrain,false)[0];return hit?{x:hit.point.x+contact.width/2,y:hit.point.z+contact.depth/2}:null;
  },
  assetStatus:()=>({loaded,total:HOME_IDS.length,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures}),
  dispose(){disposed=true;houses.clear();for(const mesh of buffers.values()){mesh.geometry.dispose();mesh.material.dispose();}buffers.clear();registry.dispose();renderer.dispose();renderer.forceContextLoss();}
 };
 let controller;
 try{controller=mountController(canvas,world,{...options,presentation:backend});}catch(error){backend.dispose();throw error;}
 canvas.dataset.renderer='three';
 void fetch(manifestURL).then(r=>{if(!r.ok)throw Error('Architecture manifest unavailable');return r.json();}).then(async manifest=>{
  if(disposed)return;entries=manifest.entries;
  await Promise.allSettled(HOME_IDS.map(async id=>{const model=await registry.load(id);if(disposed)return;models.set(id,model.scene);loaded++;refresh();}));
  if(!disposed)options.onAssets?.(backend.assetStatus());
 }).catch(()=>{if(!disposed)canvas.dataset.modelFallback='unavailable';});
 return controller;
}
