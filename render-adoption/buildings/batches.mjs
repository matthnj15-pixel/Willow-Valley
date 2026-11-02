import * as T from '../../assets/vendor/three.module.mjs';
import {buildSceneBatches} from '../../scene-batches.mjs';
// Shared imported geometry retains the existing full matrix/hierarchy batching.
// Terrain-specific foundation skirts use one merged draw per material/chunk,
// while face-level keys preserve identity for host picking.
export function buildBuildingBatches(objects,owned){
 const batches=buildSceneBatches(objects),output=[],groups=new Map(),matrix=new T.Matrix4();
 for(const batch of batches){
  if(!batch.geometry.userData.p1Foundation){output.push(batch);continue;}
  for(let i=0;i<batch.count;i++){
   batch.getMatrixAt(i,matrix);const p=new T.Vector3().setFromMatrixPosition(matrix),key=[Math.floor((p.x+512)/1024),Math.floor((p.z+512)/1024),batch.material.uuid].join(':');
   if(!groups.has(key))groups.set(key,{positions:[],normals:[],keys:[],material:batch.material});
   const group=groups.get(key),g=batch.geometry,norm=new T.Matrix3().getNormalMatrix(matrix),position=g.attributes.position,normal=g.attributes.normal;
   for(let k=0;k<position.count;k++){group.positions.push(...new T.Vector3().fromBufferAttribute(position,k).applyMatrix4(matrix).toArray());group.normals.push(...new T.Vector3().fromBufferAttribute(normal,k).applyNormalMatrix(norm).toArray());if(k%3===0)group.keys.push(batch.userData.entityKeys[i]);}
  }
  batch.dispose();
 }
 for(const group of groups.values()){
  const geometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(group.positions,3)).setAttribute('normal',new T.Float32BufferAttribute(group.normals,3));owned.push(geometry);
  const batch=new T.InstancedMesh(geometry,group.material,1);batch.setMatrixAt(0,new T.Matrix4());batch.computeBoundingBox();batch.computeBoundingSphere();batch.userData.faceEntityKeys=group.keys;output.push(batch);
 }
 return output;
}
export function entityKeyForIntersection(hit){return hit.object.userData.faceEntityKeys?.[hit.faceIndex]??hit.object.userData.entityKeys?.[hit.instanceId??0]??null;}
