import * as T from '../../vendor/three.module.mjs';
import {lerp,length,pointKey} from './plot-geometry.mjs';
// Unit construction parts, sized parametrically in visual metres. These are
// individual rails/posts, never a finished model stretched to fit a parcel.
export function createPlotFenceLibrary(){
 const geometry=new T.BoxGeometry(1,1,1),material=new T.MeshStandardMaterial({roughness:1});let disposed=false;
 return{build(fences,{sample,units=2.8,quality='normal'}={}){
  if(disposed)throw Error('Fence library disposed');const posts=new Map(),rails=[],contacts=[];
  for(const f of fences){const n=Math.max(1,Math.ceil(length(f.a,f.b)/2.4)),points=[],indices=[];for(let i=0;i<n;i+=quality==='low'?2:1)indices.push(i);indices.push(n);
   for(const i of indices){const p=lerp(f.a,f.b,i/n),y=sample(p.x,p.z).height,k=pointKey(p);points.push({...p,y});if(!posts.has(k)){posts.set(k,{...p,y,key:k});contacts.push({key:k,x:p.x,z:p.z,height:y});}}
   for(let i=1;i<points.length;i++)for(const height of quality==='low'?[.62]:f.kind==='fence-wattle'?[.22,.47,.72]:[.32,.72])rails.push({a:points[i-1],b:points[i],height});
  }
  const group=new T.Group(),pmesh=new T.InstancedMesh(geometry,material,posts.size),rmesh=new T.InstancedMesh(geometry,material,rails.length),matrix=new T.Matrix4(),q=new T.Quaternion(),up=new T.Vector3(1,0,0),wood=new T.Color('#867253');group.userData.kind='plot-fences';pmesh.userData.kind='fence-post';rmesh.userData.kind='fence-rail';
  [...posts.values()].forEach((p,i)=>{matrix.compose(new T.Vector3(p.x*units,(p.y+.45)*units,p.z*units),new T.Quaternion(),new T.Vector3(.09*units,.9*units,.09*units));pmesh.setMatrixAt(i,matrix);pmesh.setColorAt(i,wood);});
  rails.forEach((r,i)=>{const a=new T.Vector3(r.a.x,r.a.y+r.height,r.a.z),b=new T.Vector3(r.b.x,r.b.y+r.height,r.b.z),delta=b.clone().sub(a);q.setFromUnitVectors(up,delta.clone().normalize());matrix.compose(a.add(b).multiplyScalar(units/2),q,new T.Vector3(delta.length()*units,.06*units,.055*units));rmesh.setMatrixAt(i,matrix);rmesh.setColorAt(i,wood);});
  for(const mesh of [pmesh,rmesh]){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();group.add(mesh);}
  const bounds=new T.Box3().setFromObject(group);let released=false;return{group,contacts,stats:{boundaries:fences.length,posts:posts.size,rails:rails.length,triangles:(posts.size+rails.length)*12,drawCalls:2,materials:1,textureBytes:0,boundsMin:bounds.isEmpty()?null:bounds.min.toArray(),boundsMax:bounds.isEmpty()?null:bounds.max.toArray(),boundsUnits:'game units; source construction in metres'},dispose(){if(released)return;released=true;group.removeFromParent();pmesh.dispose();rmesh.dispose();group.clear();}};
 },dispose(){if(disposed)return;disposed=true;geometry.dispose();material.dispose();}};
}
