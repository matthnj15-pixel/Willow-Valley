import {createEnvironmentMaterials as createPrevious} from './previous-materials.mjs';
import {createEnvironmentMaterials as createCandidate} from './materials.mjs';
import {createEnvironmentMaterials as createBaseline} from '../environment-materials.mjs';
import {loadScaleContext} from './scale-context.mjs';
import {buildSceneBatches,estimateSceneBytes} from '../scene-batches.mjs';
import {naturePlacements} from '../nature-visuals.mjs';
import * as THREE from '../assets/vendor/three.module.mjs';
import {mountWorld3D as mountController} from '../ui-kit/render-3d.mjs';
import {createModelRegistry,manifestURL,HOME_IDS} from '../asset-registry.mjs';
import {resolveFoundation} from '../foundation-system.mjs';
import {homePlacement,homeApproach,facilityPlacement,FACILITY_TYPES,farmlandRows} from '../building-visuals.mjs';

export function mountWorld3D(canvas,world,options={}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#b5ccbd');
 const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,5400);
 const light=new THREE.DirectionalLight('#fff1db',2);light.position.set(-400,860,250);
 if(options.baseline)scene.add(light,new THREE.HemisphereLight('#eff5ff','#61734e',2));
 const houses=new THREE.Group();scene.add(houses);
 const requiredIDs=[...HOME_IDS,...FACILITY_TYPES.map(type=>'facility-'+type),'tree-oak'];
 const low=options.quality==='lite';
 const environment=(options.baseline?createBaseline:options.previous?createPrevious:createCandidate)({low,onReady:()=>controller?.render()});
 if(!options.baseline)environment.attachAtmosphere(scene);
 let contextRelease=()=>{},contextLoaded=false,contextEnvelopes=[];
 if(options.contextCenter)void loadScaleContext(scene,()=>contact,options.contextCenter).then(result=>{if(disposed){result.dispose();return;}contextRelease=result.dispose;contextEnvelopes=result.envelopes;environment.setVisualInputs?.(result.visualInputs);contextLoaded=true;lastPlacementKey="";refresh();controller?.render();}).catch(()=>{canvas.dataset.contextFallback='unavailable';});
 let waterTimer=0,waterFrames=0;
 const waterFrustum=new THREE.Frustum(),waterMatrix=new THREE.Matrix4();
 const pauseWater=()=>{clearTimeout(waterTimer);waterTimer=0;environment.pause();};
 document.addEventListener('visibilitychange',pauseWater);
 let surfaceVersion=0,lastPlacementKey='',cached=null;
 const clearBatches=()=>{for(const mesh of houses.children)mesh.dispose();houses.clear();};
 const bind=(state,c)=>({houses:new Map((state.houses||[]).flatMap((h,i)=>c.homes[i]?[[h,c.homes[i]]]:[])),buildings:new Map((state.buildings||[]).flatMap((b,i)=>c.facilities[i]?[[b,c.facilities[i]]]:[])),cropRows:c.cropRows});
 const buffers=new Map(),registry=createModelRegistry(new THREE.GLTFLoader()),models=new Map();
 let entries=[],disposed=false,contact=world,terrain=null,refresh=()=>{},loaded=0;
 const raycaster=new THREE.Raycaster();
 function updateCamera(view,rect){
  const aspect=rect.width/Math.max(1,rect.height),{yaw,pitch,zoom,focusX,focusZ}=view;
  camera.left=-zoom*aspect;camera.right=zoom*aspect;camera.top=zoom;camera.bottom=-zoom;
  const focus=new THREE.Vector3(focusX,view.focusY??17,focusZ);
  camera.position.copy(focus).add(new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(2700));
  camera.up.set(0,1,0);camera.lookAt(focus);camera.updateProjectionMatrix();camera.updateMatrixWorld();
 }
 // Match legacy vertex lighting exactly for terrain/roads/overlays. Imported
 // glTF materials keep their own sRGB texture and matte lighting pipeline.
 function material(index){const surface=environment.material(index);if(surface)return surface;return new THREE.ShaderMaterial({
  uniforms:{opacity:{value:index===6?.52:1}},transparent:index===6,depthTest:index!==8,depthWrite:index!==6,side:THREE.DoubleSide,
  vertexShader:'attribute vec3 color; varying vec3 vColor; varying float vLight; void main(){vColor=color;vLight=.70+.30*max(0.,dot(normalize(normal),normalize(vec3(-.40,.86,.25))));gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform float opacity; varying vec3 vColor; varying float vLight; void main(){gl_FragColor=vec4(vColor*vLight,opacity);}'
 });}
 const backend={
  upload(index,data,surfaceKinds=null,surfaceOffsets=null){
   const previous=buffers.get(index);if(previous){scene.remove(previous);previous.geometry.dispose();previous.material.dispose();}
   const geometry=new THREE.BufferGeometry(),array=new THREE.InterleavedBuffer(data,9);
   for(const [name,offset] of [['position',0],['color',3],['normal',6]])geometry.setAttribute(name,new THREE.InterleavedBufferAttribute(array,3,offset));
   if(index===5){geometry.setAttribute('surfaceKind',new THREE.BufferAttribute(surfaceKinds||new Float32Array(data.length/9),1));geometry.setAttribute('surfaceOffset',new THREE.BufferAttribute(surfaceOffsets||new Float32Array(data.length/9),1));}
   const mesh=new THREE.Mesh(geometry,material(index));mesh.renderOrder=index;buffers.set(index,mesh);scene.add(mesh);
   if(index===0)terrain=mesh;
  },
  setTerrain(surface){environment.setWorld(surface);contact=surface;surfaceVersion++;lastPlacementKey="";},
  setSettlement(surface,state,onRefresh){
   refresh=onRefresh;contact=surface;
   const key=JSON.stringify([surfaceVersion,models.size,state.houses,state.buildings,state.roads,state.localLanes,state.zones]);
   if(key===lastPlacementKey&&cached)return bind(state,cached);
   clearBatches();let groundContactError=0;const objects=[],represented=new Map();
   for(const house of state.houses||[]){
    let p=homePlacement(surface,house,entries);
    // Keep a stable preferred identity. During loading or for an incompatible
    // plot, only use a smaller approved shape; never change saved placement.
    if(!p)for(const id of HOME_IDS){p=homePlacement(surface,house,entries,id);if(p)break;}
    const source=p&&models.get(p.id);if(!source)continue;
    p.approach=homeApproach(surface,house,p);
    const model=source.clone(true);model.position.set(...p.origin);model.scale.setScalar(p.scale);model.rotation.y=p.yaw;objects.push({scene:model,entityKey:'house:'+(house.id??JSON.stringify([house.x,house.y]))});represented.set(house,p);
   }
   const representedFacilities=new Map();
   for(const building of state.buildings||[]){
    const p=facilityPlacement(surface,building,state,entries),source=p&&models.get(p.id);if(!source)continue;
    p.approach=homeApproach(surface,{...building,entrance:p.approachTarget},p);
    const model=source.clone(true);model.position.set(...p.origin);model.scale.setScalar(p.scale);model.rotation.y=p.yaw;
    if(building.type==='lumber'||p.groundSpace){
     p.propFoundations=[];
     model.updateMatrixWorld(true);model.traverse(node=>{if(node.userData.terrainGrounded){
      const point=new THREE.Vector3();node.getWorldPosition(point);
      if(node.userData.footing){
       const box=new THREE.Box3().setFromObject(node),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
       const rect={x:center.x+surface.width/2,y:center.z+surface.depth/2,width:size.x,depth:size.z};
       const seat=resolveFoundation(surface,rect,rect.width,rect.depth,0);
       if(seat.flooded){node.visible=false;return;}
       node.position.y+=(seat.floor-box.min.y)/p.scale;p.propFoundations.push({...rect,floor:seat.floor});
      }else{
       const box=new THREE.Box3().setFromObject(node),ground=surface.sample(point.x+surface.width/2,point.z+surface.depth/2).height;
       const stack=(node.userData.groundOffset||0)*p.scale;
       node.position.y+=(ground+stack-.02-box.min.y)/p.scale;
       const seated=new THREE.Box3().setFromObject(node);
       groundContactError=Math.max(groundContactError,Math.abs(seated.min.y-ground-stack));
      }

     }});
    }
    model.traverse(node=>{if(node.userData.galleryOnly)node.visible=false;});
    objects.push({scene:model,entityKey:'facility:'+(building.id??JSON.stringify([building.type,building.x,building.y]))});representedFacilities.set(building,p);
   }
   const nature=models.get('tree-oak');let natureCount=0;
   if(nature)for(const p of naturePlacements(surface,state,{low})){
    if(contextEnvelopes.some(e=>p.origin[0]>e.min.x-4&&p.origin[0]<e.max.x+4&&p.origin[2]>e.min.z-4&&p.origin[2]<e.max.z+4))continue;
    const model=nature.clone(true);model.position.set(...p.origin);model.scale.setScalar(p.scale);model.rotation.y=p.yaw;
    objects.push({scene:model,entityKey:p.key});natureCount++;
   }
   for(const batch of buildSceneBatches(objects))houses.add(batch);
   canvas.dataset.groundContactError=String(groundContactError);canvas.dataset.natureInstances=String(natureCount);canvas.dataset.quality=low?'low':'normal';
   canvas.dataset.modelFacilities=String(representedFacilities.size);
   canvas.dataset.modelHouses=String(represented.size);canvas.dataset.loadedModels=String(models.size-(models.has('tree-oak')?1:0));canvas.dataset.homeModels=[...new Set([...represented.values()].map(p=>p.id))].sort().join(',');
   const cropRows=farmlandRows(surface,state);canvas.dataset.cropRows=String(cropRows.length);
   cached={homes:(state.houses||[]).map(h=>represented.get(h)||null),facilities:(state.buildings||[]).map(b=>representedFacilities.get(b)||null),cropRows};
   lastPlacementKey=key;return bind(state,cached);
  },
  draw(view,rect){
   clearTimeout(waterTimer);waterTimer=0;if(options.animateWater!==false)environment.advance(performance.now());
   updateCamera(view,rect);renderer.setPixelRatio(Math.min(devicePixelRatio||1,low?1:1.5));renderer.setSize(rect.width,rect.height,false);renderer.render(scene,camera);
   waterFrames++;
   const water=buffers.get(1);
   waterFrustum.setFromProjectionMatrix(waterMatrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
   if(options.animateWater!==false&&!low&&!document.hidden&&rect.bottom>0&&rect.top<innerHeight&&rect.right>0&&rect.left<innerWidth&&water?.geometry.getAttribute('position').count&&waterFrustum.intersectsObject(water))waterTimer=setTimeout(()=>{waterTimer=0;if(!disposed&&!document.hidden)controller?.render();},100);
   canvas.dataset.drawCalls=String(renderer.info.render.calls);canvas.dataset.triangles=String(renderer.info.render.triangles);
  },
  screenToWorld(x,y,view){
   const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height||!terrain)return null;
   updateCamera(view,rect);raycaster.setFromCamera(new THREE.Vector2((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2),camera);
   const hit=raycaster.intersectObject(terrain,false)[0];return hit?{x:hit.point.x+contact.width/2,y:hit.point.z+contact.depth/2}:null;
  },
  assetStatus:()=>({contextLoaded,waterFrames,loaded,total:requiredIDs.length,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,...estimateSceneBytes(scene),...environment.status()}),
  dispose(){disposed=true;contextRelease();pauseWater();document.removeEventListener('visibilitychange',pauseWater);clearBatches();for(const mesh of buffers.values()){mesh.geometry.dispose();mesh.material.dispose();}buffers.clear();registry.dispose();environment.dispose();renderer.dispose();renderer.forceContextLoss();}
 };
 let controller;
 try{controller=mountController(canvas,world,{...options,presentation:backend});}catch(error){backend.dispose();throw error;}
 canvas.dataset.renderer='three';
 void fetch(manifestURL).then(r=>{if(!r.ok)throw Error('Architecture manifest unavailable');return r.json();}).then(async manifest=>{
  if(disposed)return;entries=manifest.entries;
  await Promise.allSettled(requiredIDs.map(async id=>{const model=await registry.load(id);if(disposed)return;models.set(id,model.scene);loaded++;}));
  if(!disposed){refresh();options.onAssets?.(backend.assetStatus());}
 }).catch(()=>{if(!disposed)canvas.dataset.modelFallback='unavailable';});
 return {...controller,environmentSample:(x,z)=>environment.sample?.(x,z),setVisualInputs:inputs=>{environment.setVisualInputs?.(inputs);controller.render();}};
}
