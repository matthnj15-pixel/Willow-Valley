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
 tower:HOST+"castle-kit/tower-square.glb",
 ground:HOST+"nature-kit/ground-grass.glb",
 waterTile:HOST+"nature-kit/ground-rivertile.glb",
 bank:HOST+"nature-kit/ground-riverside.glb",
 cliff:HOST+"nature-kit/cliff-rock.glb",
 beach:HOST+"nature-kit/platform-beach.glb"
});
// Shared Willow Valley art direction: natural grass, cool slate-blue water
// and warm-grey rock. Kenney geometry and material detail are preserved, but
// saturated demo-kit hues must never recolor the entire terrain.
export const WILLOW_PALETTE=Object.freeze({
 land:[.393,.535,.358],water:[.290,.510,.604],stone:[.493,.483,.443],
 cliff:[.493,.483,.443],rock:[.510,.490,.446],
 ground:[.410,.548,.372],bank:[.55,.553,.471],
 beach:[.675,.645,.526],waterTile:[.31,.527,.615],
 oak:[.30,.485,.345],pine:[.25,.426,.325],birch:[.345,.520,.385],
 shrub:[.39,.53,.34],tower:[.58,.56,.49]
});
// Retain light/dark authored detail while correcting the raw color cast.
export function harmonizeKenneyColor(type,source){
 const raw=source.map(v=>Math.max(0,Math.min(1,Number(v)||0)));
 const tree=["oak","pine","birch","shrub"].includes(type);
 const bark=tree&&raw[0]>raw[1]*1.065&&raw[0]>raw[2]*1.18;
 const target=bark?[.48,.365,.265]:(WILLOW_PALETTE[type]||WILLOW_PALETTE.rock);
 const luminance=.25*raw[0]+.62*raw[1]+.13*raw[2];
 const detail=Math.max(.78,Math.min(1.13,.79+luminance*.48));
 return target.map(v=>Math.min(.91,Math.max(.03,v*detail)));
}
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
    ...harmonizeKenneyColor(name,[data[i+3],data[i+4],data[i+5]]),
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

// Real Kenney Nature Kit terrain tiles blended onto a continuous topographic
// heightfield. A fully tiled grid would destroy organic lake edges; these
// material/mesh patches follow the generated elevation and water mask instead.
export function instantiateKenneyTerrain(world,models){
 const land=[],water=[];
 const size=Math.min(world.width,world.depth);
 const hash=i=>{let v=(i*1664525+1013904223+world.options.seed.length*374761393)>>>0;
  v=Math.imul(v^(v>>>13),1274126177);return ((v^(v>>>16))>>>0)/4294967295;};
 function instance(key,x,z,footprint,rotation,category="land"){
  const model=models[key];if(!model)return;
  const destination=category==="water"?water:land;
  const span=Math.max(.0001,model.max[0]-model.min[0],model.max[2]-model.min[2]);
  const scale=footprint/span,cs=Math.cos(rotation),sn=Math.sin(rotation);
  const centerX=(model.min[0]+model.max[0])/2,centerZ=(model.min[2]+model.max[2])/2;
  const reference=world.sample(x,z),level=reference.water;
  if(category==="water"&&level===null)return;
  const input=model.vertices;
  for(let i=0;i<input.length;i+=9){
   const dx=(input[i]-centerX)*scale,dz=(input[i+2]-centerZ)*scale;
   const X=x+dx*cs-dz*sn,Z=z+dx*sn+dz*cs;
   // Never drop a single vertex: WebGL triangles require complete triplets.
   // A little spill beyond the world edge is safer than malformed geometry.
   const surface=world.sample(X,Z);
   // Terrain blocks are flattened vertically and draped over local topology;
   // water pieces stay at lake/river level to avoid hill-shaped water.
   const y=category==="water"?(level+.65):
    surface.height+.22+Math.max(0,input[i+1]-model.min[1])*Math.min(1.5,scale*.13);
   const nx=input[i+6],ny=input[i+7],nz=input[i+8];
   destination.push(X-world.width/2,y,Z-world.depth/2,
    input[i+3],input[i+4],input[i+5],
    nx*cs-nz*sn,ny,nx*sn+nz*cs);
  }
 }
 // Deterministic clumps of actual grass-tile mesh, never a uniform quilt.
 if(models.ground)for(let i=0;i<210;i++){
  const x=(.025+.95*hash(i*19+3))*world.width;
  const z=(.025+.95*hash(i*19+7))*world.depth;
  const sample=world.sample(x,z);
  if(sample.water!==null||world.slope(x,z)>.55)continue;
  instance("ground",x,z,17+hash(i*19+11)*size*.037,hash(i*19+17)*Math.PI*2);
 }
 // River sections and banks use Kenney's authored land/water geometry.
 if(models.waterTile)for(const stream of world.rivers)for(let i=2;i<stream.points.length-2;i+=3){
  const point=stream.points[i],a=stream.points[i-1],b=stream.points[i+1];
  if(world.sample(point.x,point.z).kind!=="river")continue;
  instance("waterTile",point.x,point.z,stream.width*1.45,
   Math.atan2(b.z-a.z,b.x-a.x),"water");
 }
 if(models.bank||models.beach)for(const lake of world.lakes)for(let i=0;i<lake.spine.length;i+=2){
  const p=lake.spine[i],angle=(i+lake.x)*2.4;
  const x=p.x+Math.cos(angle)*p.r*1.12,z=p.z+Math.sin(angle)*p.r*1.12;
  if(world.sample(x,z).water!==null)continue;
  instance(i%3===0&&models.beach?"beach":"bank",x,z,10+hash(i*17+Math.round(lake.x))*8,angle);
 }
 if(models.cliff)for(let i=0;i<80;i++){
  const x=(.055+.89*hash(1400+i*23))*world.width;
  const z=(.055+.89*hash(1401+i*23))*world.depth;
  const sample=world.sample(x,z);
  if(sample.water!==null||world.slope(x,z)<.5)continue;
  instance("cliff",x,z,12+hash(1402+i*23)*20,hash(1403+i*23)*Math.PI*2);
 }
 return{land:new Float32Array(land),water:new Float32Array(water)};
}

export function kenneyLandscapePalette(models){
 // The old averaging algorithm turned the entire world cyan/orange. Keep
 // ground and water hues locked, but use the kits' average luminance to make
 // a subtle lightness adjustment when each mesh is available.
 const brightness=model=>{
  if(!model)return 1;
  const data=model.vertices,stride=Math.max(9,Math.floor(data.length/5000)*9);
  let total=0,count=0;
  for(let i=0;i<data.length;i+=stride){
   total+=.25*data[i+3]+.62*data[i+4]+.13*data[i+5];
   count++;
  }
  const mean=count?total/count:.5;
  return Math.max(.965,Math.min(1.035,1+(mean-.5)*.085));
 };
 return{
  land:WILLOW_PALETTE.land.map(v=>v*brightness(models.ground)),
  water:WILLOW_PALETTE.water.map(v=>v*brightness(models.waterTile)),
  stone:WILLOW_PALETTE.stone.map(v=>v*brightness(models.cliff))
 };
}
