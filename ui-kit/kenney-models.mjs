// WORLD-3D-002: genuine Kenney CC0 GLB meshes from the Nature and Castle Kits.
// UAT source: https://github.com/Hidencod/tge-assets
// Pack licensing: https://kenney.nl/assets/nature-kit and /castle-kit
// Browser fetches GLBs while online; offline terrain remains available.
const HOST="https://hidencod.github.io/tge-assets/packs/";
export const KENNEY_MODELS=Object.freeze({
 oak:HOST+"nature-kit/tree-oak.glb",
 pine:HOST+"nature-kit/tree-pinedefaulta.glb",
 birch:HOST+"nature-kit/tree-default.glb",
 rock:HOST+"nature-kit/rock-largea.glb",
 shrub:HOST+"nature-kit/plant-bush.glb",
 bridge:HOST+"nature-kit/bridge-wood.glb",
 tower:HOST+"castle-kit/tower-square.glb"
});
const loaded=new Map();
function parseGLB(buffer){
 const v=new DataView(buffer);
 if(v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2)
  throw Error("Invalid glTF binary model");
 const decoder=new TextDecoder();
 let offset=12,document=null,binary=null;
 while(offset+8<=buffer.byteLength){
  const length=v.getUint32(offset,true),type=v.getUint32(offset+4,true);
  if(length<0||offset+8+length>buffer.byteLength)throw Error("Corrupt model chunk");
  if(type===0x4E4F534A)document=JSON.parse(decoder.decode(new Uint8Array(buffer,offset+8,length)));
  if(type===0x004E4942)binary=buffer.slice(offset+8,offset+8+length);
  offset+=8+length;
 }
 if(!document||!binary)throw Error("Incomplete glTF binary");
 const bin=new DataView(binary);
 const accessor=id=>{
  const a=document.accessors[id],b=document.bufferViews[a.bufferView];
  if(!a||!b)throw Error("Missing glTF buffer");
  const width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type]||1;
  const bytes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}[a.componentType];
  if(!bytes)throw Error("Unsupported glTF component type");
  const stride=b.byteStride||width*bytes;
  const begin=(b.byteOffset||0)+(a.byteOffset||0);
  function read(i,k){
   const pos=begin+i*stride+k*bytes;
   switch(a.componentType){
    case 5126:return bin.getFloat32(pos,true);
    case 5125:return bin.getUint32(pos,true);
    case 5123:return bin.getUint16(pos,true);
    case 5122:return bin.getInt16(pos,true);
    case 5121:return bin.getUint8(pos);
    default:return bin.getInt8(pos);
   }
  }
  return{count:a.count,width,read};
 };
 function rotate(v,q){
  const [x,y,z,w]=q,uv=[
   y*v[2]-z*v[1],z*v[0]-x*v[2],x*v[1]-y*v[0]];
  const uuv=[y*uv[2]-z*uv[1],z*uv[0]-x*uv[2],x*uv[1]-y*uv[0]];
  return v.map((n,i)=>n+2*(w*uv[i]+uuv[i]));
 }
 function makeTransform(node,parent){
  const t=node.translation||[0,0,0],s=node.scale||[1,1,1],q=node.rotation||[0,0,0,1];
  const map=point=>{
   const rotated=rotate(point.map((value,i)=>value*s[i]),q);
   return parent(rotated.map((value,i)=>value+t[i]));
  };
  return map;
 }
 const identity=p=>p;
 const output=[],dims={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
 const parents=document.nodes||[];
 const scene=document.scenes?.[document.scene||0];
 function visit(index,transform){
  const node=parents[index];if(!node)return;
  const toWorld=makeTransform(node,transform);
  if(node.mesh!==undefined){
   const mesh=document.meshes[node.mesh];
   for(const primitive of mesh.primitives||[]){
    if(primitive.mode!==undefined&&primitive.mode!==4)continue;
    if(primitive.attributes?.POSITION===undefined)continue;
    const pos=accessor(primitive.attributes.POSITION);
    const normals=primitive.attributes.NORMAL!==undefined?accessor(primitive.attributes.NORMAL):null;
    const colors=primitive.attributes.COLOR_0!==undefined?accessor(primitive.attributes.COLOR_0):null;
    const indices=primitive.indices!==undefined?accessor(primitive.indices):null;
    const material=document.materials?.[primitive.material||0]||{};
    const base=material.pbrMetallicRoughness?.baseColorFactor||[1,1,1,1];
    const getIndex=i=>indices?indices.read(i,0):i;
    for(let i=0;i<(indices?.count||pos.count);i+=3){
     if(i+2>=(indices?.count||pos.count))break;
     const triangle=[getIndex(i),getIndex(i+1),getIndex(i+2)];
     const points=triangle.map(j=>{
      const vtx=toWorld([pos.read(j,0),pos.read(j,1),pos.read(j,2)]);
      for(let a=0;a<3;a++){
       dims.min[a]=Math.min(dims.min[a],vtx[a]);
       dims.max[a]=Math.max(dims.max[a],vtx[a]);
      }
      return vtx;
     });
     // Use geometric normals for transformed pieces, including rotated child nodes.
     const [a,b,c]=points;
     const ab=b.map((x,j)=>x-a[j]),ac=c.map((x,j)=>x-a[j]);
     const n=[ab[1]*ac[2]-ab[2]*ac[1],
      ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
     const length=Math.hypot(...n)||1,normal=n.map(x=>x/length);
     triangle.forEach((j,k)=>{
      const p=points[k],vertexColor=colors?[
       colors.read(j,0),colors.read(j,1),colors.read(j,2)]:[1,1,1];
      const color=base.slice(0,3).map((x,k)=>Math.min(1,Math.max(.02,x*vertexColor[k])));
      output.push(...p,...color,...normal);
     });
    }
   }
  }
  for(const child of node.children||[])visit(child,toWorld);
 }
 for(const root of scene?.nodes||parents.map((_,i)=>i))visit(root,identity);
 if(!output.length)throw Error("Model has no triangles");
 return{vertices:new Float32Array(output),min:dims.min,max:dims.max};
}
export async function fetchKenneyModel(name){
 if(!KENNEY_MODELS[name])throw Error("Unknown Kenney model "+name);
 if(!loaded.has(name)){
  loaded.set(name,(async()=>{
   const response=await fetch(KENNEY_MODELS[name],{mode:"cors"});
   if(!response.ok)throw Error("Kenney model "+name+": HTTP "+response.status);
   return parseGLB(await response.arrayBuffer());
  })().catch(error=>{loaded.delete(name);throw error;}));
 }
 return loaded.get(name);
}
// Creates a single draw batch with the actual loaded asset triangles, never
// a replacement cone or stylized approximation.
export function instantiateKenney(world,models,{showReference=false}={}){
 const output=[];
 function put(name,x,z,height,yaw){
  const model=models[name];if(!model)return;
  const span=Math.max(.001,model.max[1]-model.min[1]);
  const scale=height/span;
  const base=world.sample(x,z).height;
  const cs=Math.cos(yaw),sn=Math.sin(yaw);
  const data=model.vertices;
  for(let i=0;i<data.length;i+=9){
   const px=(data[i]-(model.min[0]+model.max[0])/2)*scale;
   const py=(data[i+1]-model.min[1])*scale;
   const pz=(data[i+2]-(model.min[2]+model.max[2])/2)*scale;
   const nx=data[i+6],ny=data[i+7],nz=data[i+8];
   output.push(x-world.width/2+px*cs-pz*sn,base+py,
    z-world.depth/2+px*sn+pz*cs,
    data[i+3],data[i+4],data[i+5],
    nx*cs-nz*sn,ny,nx*sn+nz*cs);
  }
 }
 const mix=["oak","pine","birch"];
 let treeModels=0;
 for(let i=0;i<world.trees.length;i++){
  const t=world.trees[i],which=mix[i%mix.length];
  if(!models[which])continue;
  put(which,t.x,t.z,t.h,(i*1.61803398875)%6.283);
  treeModels++;
 }
 // A few hand-placed nature props keep the preview independent of the
 // future gameplay simulation and ensure that selected kits can be judged.
 if(models.rock)for(let i=0;i<23;i++){
  const x=(.09+((i*73)%79)/100)*world.width;
  const z=(.13+((i*47)%69)/100)*world.depth;
  const terrain=world.sample(x,z);
  if(terrain.water!==null||world.slope(x,z)>1.2)continue;
  put("rock",x,z,6+i%5*2,i*.47);
 }
 if(showReference&&models.tower){
  // Architectural size reference only, never a spawned settlement.
  const x=world.width*.36,z=world.depth*.58;
  if(world.sample(x,z).water===null)put("tower",x,z,34,.48);
 }
 return{vertices:new Float32Array(output),treeModels};
}
