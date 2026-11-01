import * as T from '../../vendor/three.module.mjs';
// Library owns sources; batches own only instance buffers. Dispose in that order.
export function createLandscapeLibrary(scene){
 const sources=new Map(),geometries=new Set(),materials=new Set();let disposed=false;
 scene.traverse(n=>{if(n.isMesh){sources.set(n.name,n);geometries.add(n.geometry);for(const m of Array.isArray(n.material)?n.material:[n.material])materials.add(m);}});
 return{build(records){if(disposed)throw Error('Landscape library disposed');const group=new T.Group(),byNode=new Map(),matrix=new T.Matrix4(),q=new T.Quaternion(),up=new T.Vector3(0,1,0);
  for(const r of records){const key=r.assetId+'__'+r.lod;if(!sources.has(key))throw Error('Missing landscape node '+key);if(!byNode.has(key))byNode.set(key,[]);byNode.get(key).push(r);}
  for(const [key,rows] of byNode){const source=sources.get(key),batch=new T.InstancedMesh(source.geometry,source.material,rows.length);rows.forEach((r,i)=>{matrix.compose(new T.Vector3(...r.origin),q.setFromAxisAngle(up,r.yaw),new T.Vector3().setScalar(r.scale));batch.setMatrixAt(i,matrix);});batch.instanceMatrix.needsUpdate=true;batch.computeBoundingBox();batch.computeBoundingSphere();batch.userData.keys=rows.map(r=>r.key);group.add(batch);}
  let released=false;return{group,dispose(){if(released)return;released=true;group.removeFromParent();for(const b of group.children)b.dispose();group.clear();}};
 },dispose(){if(disposed)return;disposed=true;for(const g of geometries)g.dispose();for(const m of materials)m.dispose();sources.clear();},get disposed(){return disposed;}};
}
