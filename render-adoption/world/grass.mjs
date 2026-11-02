import * as T from '../../assets/vendor/three.module.mjs';
import {grassSurfaceGeometry, MEADOW_PALETTE} from './recipe.mjs';
import {U,unit,smooth} from './spatial.mjs';
export const GRASS_CHUNK_GAME=64;
// Stable candidates belong to world lattice cells, never to camera or array order.
export function grassRecords(world,classification,ix,iz){
 const records=[],step=1.05*U,seed=world.options?.seed;
 const loX=ix*GRASS_CHUNK_GAME,loY=iz*GRASS_CHUNK_GAME;
 for(let j=Math.ceil(loY/step);j<Math.ceil(Math.min(world.depth,loY+GRASS_CHUNK_GAME)/step);j++)
 for(let i=Math.ceil(loX/step);i<Math.ceil(Math.min(world.width,loX+GRASS_CHUNK_GAME)/step);i++){
  const x=(i+.1+unit(seed,i,j,'x')*.8)*step,y=(j+.1+unit(seed,i,j,'y')*.8)*step;
  if(x>=world.width||y>=world.depth)continue;
  const scale=.45+unit(seed,i,j,'height')*.70,radius=.68*scale*U;
  if(x<radius||y<radius||x>world.width-radius||y>world.depth-radius)continue;
  const q=classification.query(x,y,radius);if(!q.cover)continue;
  if([[radius,0],[-radius,0],[0,radius],[0,-radius]].some(([dx,dy])=>!classification.query(x+dx,y+dy).cover))continue;
  if(unit(seed,i,j,'gap')>.70+smooth(seed,x/U*.055,y/U*.055)*.29)continue;
  records.push({key:`meadow:${i}:${j}`,x,y,scale:scale*U,yaw:unit(seed,i,j,'yaw')*Math.PI*2,brightness:.88+unit(seed,i,j,'shade')*.24,rank:unit(seed,i,j,'rank')});
 }
 return records.sort((a,b)=>a.rank-b.rank);
}
// Bake the exact displayed height at every ribbon vertex, including both sides
// of every blade root. A fitted tangent alone would bridge terrain diagonals.
export function buildGrassGeometry(records, surface, world, low=false){
 const recipe=grassSurfaceGeometry(low),p=recipe.attributes.position,idx=recipe.index;
 const positions=[],colors=[],indices=[],root=new T.Color(MEADOW_PALETTE.root),tip=new T.Color(MEADOW_PALETTE.tip),c=new T.Color();
 for(const r of records){
  const base=positions.length/3,cs=Math.cos(r.yaw),sn=Math.sin(r.yaw);
  for(let i=0;i<p.count;i++){
   const px=p.getX(i)*r.scale,pz=p.getZ(i)*r.scale,x=r.x+px*cs+pz*sn,y=r.y-px*sn+pz*cs,
    lift=p.getY(i)*r.scale;
   positions.push(x-world.width/2,surface.sample(x,y).height+lift,y-world.depth/2);
   c.copy(root).lerp(tip,p.getY(i)/.48).multiplyScalar(r.brightness);colors.push(c.r,c.g,c.b);
  }
  for(let i=0;i<idx.count;i++)indices.push(base+idx.array[i]);
 }
 recipe.dispose();
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);
 geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
 return geometry;
}
export function createGrassManager(group,world,surface,classification,material,quality){
 const chunks=new Map(),frustum=new T.Frustum(),matrix=new T.Matrix4(),tiles=[];let visible=true,disposed=false,builds=0;
 if(classification.safeCover)for(let iz=0;iz<Math.ceil(world.depth/GRASS_CHUNK_GAME);iz++)for(let ix=0;ix<Math.ceil(world.width/GRASS_CHUNK_GAME);ix++){
  const x=Math.min(world.width,(ix+.5)*GRASS_CHUNK_GAME),y=Math.min(world.depth,(iz+.5)*GRASS_CHUNK_GAME),h=surface.sample(x,y).height;
  const center=new T.Vector3(x-world.width/2,h,y-world.depth/2);tiles.push({ix,iz,center,sphere:new T.Sphere(center,GRASS_CHUNK_GAME*2)});
 }
 function clear(){for(const c of chunks.values()){c.mesh.removeFromParent();c.mesh.geometry.dispose();}chunks.clear();}
 function setCamera(camera){
  if(disposed||!visible||!classification.safeCover)return;
  camera.updateMatrixWorld();frustum.setFromProjectionMatrix(matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  const candidates=[];
  for(const {ix,iz,center,sphere} of tiles){
   if(!frustum.intersectsSphere(sphere))continue;
   // Ground footprint screen size works for both the host orthographic camera
   // and perspective views, where camera height alone is not useful distance.
   const projected=GRASS_CHUNK_GAME*(camera.isOrthographicCamera?camera.zoom/(camera.top-camera.bottom):1/(Math.max(1,camera.position.distanceTo(center))*Math.tan(T.MathUtils.degToRad(camera.fov/2))*2));
   if(projected<.045)continue;
   const ndc=center.clone().project(camera),score=ndc.x*ndc.x+ndc.y*ndc.y;
   candidates.push({ix,iz,key:`${ix}:${iz}`,score,near:quality==='normal'&&projected>.22});
  }
  candidates.sort((a,b)=>a.score-b.score||a.key.localeCompare(b.key));
  const selected=candidates.slice(0,quality==='low'?12:16);
  const desired=new Map(selected.map(c=>{c.lod=c.near?'near':quality==='low'?'low':'mid';return[c.key,c];}));
  // Evict before allocating replacements. No unbounded camera-travel cache.
  for(const [key,c]of chunks)if(!desired.has(key)||desired.get(key).lod!==c.lod){c.mesh.removeFromParent();c.mesh.geometry.dispose();chunks.delete(key);}
  for(const c of desired.values())if(!chunks.has(c.key)){
   const records=grassRecords(world,classification,c.ix,c.iz).slice(0,c.lod==='near'?128:c.lod==='mid'?48:32);
   if(!records.length)continue;
   const geometry=buildGrassGeometry(records,surface,world,c.lod!=='near');
   const mesh=new T.Mesh(geometry,material);mesh.name=`wv007-grass:${c.key}:${c.lod}`;group.add(mesh);chunks.set(c.key,{mesh,lod:c.lod,count:records.length});builds++;
  }
 }
 return {setCamera,setVisible(next){visible=!!next;group.visible=visible;},
  status(){let triangles=0,vertices=0,bytes=0,tufts=0;const lods={near:0,mid:0,low:0};
   for(const c of chunks.values()){const g=c.mesh.geometry;triangles+=g.index.count/3;vertices+=g.attributes.position.count;bytes+=g.index.array.byteLength+Object.values(g.attributes).reduce((n,a)=>n+a.array.byteLength,0);tufts+=c.count;lods[c.lod]++;}
   return {chunks:chunks.size,visibleChunks:visible?chunks.size:0,tufts,triangles,vertices,geometryBytes:bytes,geometryBuilds:builds,lods,chunkGame:GRASS_CHUNK_GAME,nearTrianglesPerTuft:95,otherTrianglesPerTuft:15,wind:false};},
  dispose(){if(disposed)return;disposed=true;clear();}};
}
