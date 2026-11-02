import * as T from '../../assets/vendor/three.module.mjs';

// Call after a batch rebuild, never on every camera frame. Bounds include the
// exact nested source transforms already baked into each instance matrix.
export function entityBounds(roots){
 const bounds=new Map(),instance=new T.Matrix4(),matrix=new T.Matrix4();
 for(const root of roots.filter(Boolean)){
  root.updateMatrixWorld(true);
  root.traverse(node=>{
   if(!node.isInstancedMesh||!node.userData.entityKeys)return;
   node.geometry.computeBoundingBox();
   node.userData.entityKeys.forEach((key,i)=>{
    node.getMatrixAt(i,instance);matrix.multiplyMatrices(node.matrixWorld,instance);
    const box=node.geometry.boundingBox.clone().applyMatrix4(matrix);
    if(bounds.has(key))bounds.get(key).union(box);else bounds.set(key,box);
   });
  });
 }
 return bounds;
}
