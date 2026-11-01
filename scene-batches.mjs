import * as THREE from './assets/vendor/three.module.mjs';
// Static recipes share their loader-owned geometry/materials. Only instance
// buffers belong to these batches; disposing a batch never disposes its source.
export function buildSceneBatches(objects,{chunkSize=1024}={}){
 const groups=new Map();
 for(const {scene,entityKey} of objects){
  scene.updateMatrixWorld(true);
  scene.traverseVisible(node=>{
   if(!node.isMesh)return;
   const materials=Array.isArray(node.material)?node.material:[node.material];
   const p=new THREE.Vector3().setFromMatrixPosition(node.matrixWorld);
   const key=[Math.floor((p.x+chunkSize/2)/chunkSize),Math.floor((p.z+chunkSize/2)/chunkSize),node.geometry.uuid,...materials.map(m=>m.uuid)].join(':');
   if(!groups.has(key))groups.set(key,{geometry:node.geometry,material:node.material,matrices:[],entities:[]});
   const batch=groups.get(key);batch.matrices.push(node.matrixWorld.clone());batch.entities.push(entityKey);
  });
 }
 return [...groups.values()].map(group=>{
  const mesh=new THREE.InstancedMesh(group.geometry,group.material,group.matrices.length);
  group.matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.instanceMatrix.needsUpdate=true;
  mesh.computeBoundingBox();mesh.computeBoundingSphere();mesh.userData.entityKeys=group.entities;mesh.renderOrder=7;
  return mesh;
 });
}
export function estimateSceneBytes(scene){
 const buffers=new Set(),textures=new Set();let geometryBytes=0,textureBytes=0;
 const buffer=array=>{if(array&&!buffers.has(array)){buffers.add(array);geometryBytes+=array.byteLength;}};
 scene.traverse(node=>{
  if(node.geometry){for(const attribute of Object.values(node.geometry.attributes))buffer(attribute.array||attribute.data?.array);buffer(node.geometry.index?.array);}
  buffer(node.instanceMatrix?.array);
  for(const material of node.material?(Array.isArray(node.material)?node.material:[node.material]):[])
   for(const value of [...Object.values(material),...Object.values(material.uniforms||{}).map(u=>u.value)])if(value?.isTexture&&!textures.has(value)){
    textures.add(value);const data=value.source?.data;textureBytes+=(data?.width||0)*(data?.height||0)*4*(value.generateMipmaps?4/3:1);
   }
 });
 return{geometryBytes,textureBytes:Math.ceil(textureBytes)};
}
