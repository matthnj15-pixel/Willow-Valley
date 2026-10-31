import sharp from "sharp";
import {BoxGeometry,CylinderGeometry,ConeGeometry,BufferGeometry,Float32BufferAttribute,Color} from "three";
import {Document,NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {copyToDocument,dedup,prune,weld,unpartition,getBounds} from '@gltf-transform/functions';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(await readFile('docs/assets/wv-art-002a/source-manifest.json','utf8'));
const originalPalette=await readFile('assets/wv/sources/fantasy/Models/GLB format/Textures/colormap.png');
const {data:palette,info}=await sharp(originalPalette).ensureAlpha().raw().toBuffer({resolveWithObject:true});
for(let i=0;i<palette.length;i+=4){
 const [r,g,b]=palette.slice(i,i+3);
 if(g>r*1.18&&b>r*1.1){const shade=(r+g+b)/3/160;palette[i]=Math.min(255,129*shade);palette[i+1]=Math.min(255,80*shade);palette[i+2]=Math.min(255,61*shade);}
 else if(r>140&&r>g*1.5&&r>b*1.4){const shade=(r+g+b)/3/140;palette[i]=Math.min(255,98*shade);palette[i+1]=Math.min(255,107*shade);palette[i+2]=Math.min(255,103*shade);}
 else if(b>r*1.12&&b>g*1.03){const shade=(r+g+b)/3/150;palette[i]=Math.min(255,195*shade);palette[i+1]=Math.min(255,179*shade);palette[i+2]=Math.min(255,151*shade);}
}
const derivativePalette=await sharp(palette,{raw:info}).png().toBuffer();
const survivalOriginal=await readFile('assets/wv/sources/survival/Models/GLB format/Textures/colormap.png');
const {data:survivalPixels,info:survivalInfo}=await sharp(survivalOriginal).ensureAlpha().raw().toBuffer({resolveWithObject:true});
for(let i=0;i<survivalPixels.length;i+=4){
 const [r,g,b]=survivalPixels.slice(i,i+3);
 if(r>140&&r>g*1.25&&r>b*1.35){const shade=(r+g+b)/3/140;survivalPixels[i]=Math.min(255,118*shade);survivalPixels[i+1]=Math.min(255,87*shade);survivalPixels[i+2]=Math.min(255,65*shade);}
}
const survivalPalette=await sharp(survivalPixels,{raw:survivalInfo}).png().toBuffer();
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),sourceCache=new Map();
const out='assets/wv/architecture-v1';await mkdir(out,{recursive:true});
const records=[];
const groundSpaceIDs=new Set(['facility-market','facility-plaza','facility-park']);
async function source(id){
 if(!sourceCache.has(id)){
  const row=manifest.assets.find(a=>a.id===id);if(!row)throw Error('Unverified source '+id);
  sourceCache.set(id,await io.read(`assets/wv/sources/${row.kit}/${row.path}`));
 }
 return sourceCache.get(id);
}
async function build(id,role,recipe,entrance=null){
 const doc=new Document(),scene=doc.createScene(id),sources=new Set(),materialOverrides=[];
 async function part(sourceID,position=[0,0,0],yaw=0){
  const src=await source(sourceID),roots=src.getRoot().getDefaultScene().listChildren();
  const map=copyToDocument(doc,src,roots);
  if(sourceID.startsWith('fantasy/'))for(const material of src.getRoot().listMaterials()){
   const texture=map.get(material)?.getBaseColorTexture();if(texture)texture.setImage(derivativePalette);
  }
  if(sourceID.startsWith('survival/'))for(const material of src.getRoot().listMaterials()){
   const texture=map.get(material)?.getBaseColorTexture();if(texture)texture.setImage(survivalPalette);
  }
  if(sourceID.startsWith('nature/'))for(const material of src.getRoot().listMaterials()){
   const name=material.getName(),swatch=/leaf|grass/i.test(name)?'#4d7c58':/wood|bark/i.test(name)?'#765741':null;
   if(!swatch)continue;const factor=[...new Color(swatch).toArray().map(v=>Number(v.toFixed(6))),1];
   map.get(material).setBaseColorFactor(factor);materialOverrides.push({sourceID,material:name,source:material.getBaseColorFactor(),swatch,factor});
  }
  const group=doc.createNode(sourceID).setTranslation(position).setRotation([0,Math.sin(yaw/2),0,Math.cos(yaw/2)]);
  if(sourceID==='survival/tool-axe'||groundSpaceIDs.has(id))group.setExtras({terrainGrounded:true,footing:groundSpaceIDs.has(id)&&!sourceID.startsWith('nature/')});
  for(const root of roots)group.addChild(map.get(root));scene.addChild(group);sources.add(sourceID);
 }
 const originalMeshes=[];
 function original(shape,size,position,color,yaw=0,tilt=0,extras={}){
  let g;
  if(shape==='box')g=new BoxGeometry(...size);
  else if(shape==='log')g=new CylinderGeometry(size[0]/2,size[0]/2,size[1],8);
  else if(shape==='hip'){
   g=new ConeGeometry(1,.999,4,1,false);g.rotateY(Math.PI/4);g.scale(size[0]/Math.SQRT2,size[1],size[2]/Math.SQRT2);
  }else if(shape==='gable'){
   // Triangular prism, centered at its eave/ridge midpoint.
   g=new BufferGeometry();
   const [w,h,d]=size.map(v=>v/2),v=[[-w,-h,-d],[w,-h,-d],[0,h,-d],[-w,-h,d],[w,-h,d],[0,h,d]];
   const faces=[[0,2,1],[3,4,5],[0,3,5],[0,5,2],[1,2,5],[1,5,4],[0,1,4],[0,4,3]];
   g.setAttribute('position',new Float32BufferAttribute(faces.flatMap(f=>f.flatMap(i=>v[i])),3));g.computeVertexNormals();
  }
  g.rotateX(tilt);g.rotateY(yaw);
  const p=doc.createPrimitive();
  for(const [key,name] of [['POSITION','position'],['NORMAL','normal']]){
   const a=g.getAttribute(name);p.setAttribute(key,doc.createAccessor().setType('VEC3').setArray(new Float32Array(Array.from(a.array,v=>Number(v.toFixed(6))))));
  }
  if(g.index)p.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(g.index.array)));
  const c=new Color(color);p.setMaterial(doc.createMaterial('Original '+color).setBaseColorFactor([...c.toArray().map(v=>Number(v.toFixed(6))),1]).setMetallicFactor(0).setRoughnessFactor(.95));
  const node=doc.createNode('Original '+shape).setTranslation(position).setMesh(doc.createMesh().addPrimitive(p));
  if(shape==='log'||Object.keys(extras).length)node.setExtras({...extras,...(shape==='log'?{terrainGrounded:true}:{})});scene.addChild(node);
  originalMeshes.push(shape);g.dispose();
 }

 await recipe(part,original);
 await doc.transform(unpartition(),weld(),dedup(),prune());
 const bounds=getBounds(scene);
 // Normalize floor only; retain full assembly grid alignment and hierarchy.
 const base=bounds.min[1];
 const wrapper=doc.createNode('floor-center +Z entrance').setTranslation([0,-base,0]);
 const children=scene.listChildren();for(const node of children){scene.removeChild(node);wrapper.addChild(node);}scene.addChild(wrapper);
 const bytes=await io.writeBinary(doc);await writeFile(`${out}/${id}.glb`,bytes);
 const final=getBounds(scene);
 let triangles=0;for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives())triangles+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;
 const textureDerivatives=[];
 if([...sources].some(id=>id.startsWith('fantasy/')))textureDerivatives.push({kit:'fantasy',sourceSha256:hash(originalPalette),outputSha256:hash(derivativePalette)});
 if([...sources].some(id=>id.startsWith('survival/')))textureDerivatives.push({kit:'survival',sourceSha256:hash(survivalOriginal),outputSha256:hash(survivalPalette)});
 records.push({id,role,url:`./${out}/${id}.glb`,bytes:bytes.byteLength,sha256:createHash('sha256').update(bytes).digest('hex'),
  boundsMin:final.min,boundsMax:final.max,triangles,entrance,sourceIds:[...sources],license:'CC0-1.0',recipeVersion:2,derivativePaletteSha256:textureDerivatives[0]?.outputSha256??null,textureDerivatives,materialOverrides,
  groundSpace:groundSpaceIDs.has(id),foundationRects:id==='facility-farm'?[[-.65,-.25,1.1,1.1],[.5,-.1,1.1,1.7]]:id==='facility-lumber'?[[-.3,-.3,1.05,1.1]]:null,originalMeshes,status:'gallery-review',runtimeReady:false});
}
async function shell(part,wood=false,length=1){
 const base='fantasy/'+(wood?'wall-wood':'wall');
 for(let i=0;i<length;i++){
  const z=i-(length-1)/2;
  await part(base+'-window-small',[0,0,z]);
  await part(base,[0,0,z],Math.PI);
 }
 await part(base,[0,0,-(length-1)/2],Math.PI/2);
 await part(base+'-door',[0,0,(length-1)/2],-Math.PI/2);
}
await build('home-long-ridge','house',async part=>{
 await shell(part,true,2);
 for(const z of [-.5,.5])await part('fantasy/roof-gable',[0,1,z],Math.PI/2);
},{position:[0,0,1],forward:[0,0,1]});
await build('home-steep-gable','house',async part=>{
 await shell(part,false,1);
 await part('fantasy/roof-high-gable',[0,1,0]);
 await part('fantasy/chimney',[-.18,1.1,-.20]);
},{position:[0,0,.5],forward:[0,0,1]});
// C1 draft: original roof courses and porch geometry supplement verified walls.
function shifted(part,offset){return (id,p=[0,0,0],yaw=0)=>part(id,p.map((v,i)=>v+offset[i]),yaw);}
await build('home-low-hip','house',async(part,original)=>{
 await shell(part,true,1);
 // Three broad nested courses communicate straw without per-strand geometry.
 for(let i=0;i<3;i++)original('hip',[1.12-i*.27,.42-i*.09,1.12-i*.27],[0,1.19+i*.09,0],'#a58b5b');
},{position:[0,0,.5],forward:[0,0,1]});
await build('home-crooked-wing','house',async(part,original)=>{
 for(const [x,z,h] of [[-.5,-.5,1],[.5,-.5,1],[-.5,.5,1]]){
  await shell(shifted(part,[x,0,z]),false,1);
  original('hip',[1.1,.5,1.1],[x,h+.22,z],'#81503d');
 }
},{position:[-.5,0,1],forward:[0,0,1]});
await build('home-offset-gables','house',async(part,original)=>{
 await shell(part,false,2);
 for(const z of [-.5,.5])await part('fantasy/roof-gable',[0,1,z],Math.PI/2);
 original('box',[.5,.78,.8],[.65,.39,0],'#c3b397');
 original('gable',[.6,.4,.9],[.65,.98,0],'#626b67',Math.PI/2);
 await part('fantasy/chimney',[-.18,1.1,-.5]);
},{position:[0,0,1],forward:[0,0,1]});
await build('home-porch-cabin','house',async(part,original)=>{
 await shell(part,true,1);await part('fantasy/roof-gable',[0,1,0],Math.PI/2);
 original('box',[1.1,.08,.6],[0,.7,.77],'#a58b5b',0,-.18);
 for(const x of [-.43,.43])original('box',[.055,.68,.055],[x,.34,1],'#594332');
 original('box',[1.02,.045,.55],[0,.022,.76],'#765741');
},{position:[0,0,1.05],forward:[0,0,1]});

await build('facility-farm','farm',async(part,original)=>{
 await shell(shifted(part,[-.65,0,-.25]),true,1);
 await part('fantasy/roof-gable',[-.65,1,-.25],Math.PI/2);
 original('box',[1,.8,1.6],[.5,.4,-.1],'#765741');
 original('gable',[1.1,.5,1.7],[.5,1.05,-.1],'#81503d');
 original('box',[.55,.62,.03],[.5,.31,.71],'#594332');
 original('box',[.34,.23,.3],[-.6,.115,.6],'#a58b5b');
},{position:[0,0,.9],forward:[0,0,1]});
await build('facility-lumber','lumber',async(part,original)=>{
 for(const x of [-.7,.1])for(const z of [-.7,.1])original('box',[.07,.8,.07],[x,.4,z],'#594332');
 original('gable',[1.05,.35,1.1],[-.3,.95,-.3],'#765741');
 await part('survival/workbench',[-.3,0,-.3]);
 for(let row=0;row<3;row++)for(let i=0;i<3-row;i++)original('log',[.15,.75,.15],[.5+i*.16,.08+row*.13,-.3],'#765741',0,Math.PI/2);
 await part('survival/tool-axe',[.1,0,.5]);
},{position:[-.3,0,.4],forward:[0,0,1]});
await build('facility-smith','smith',async(part,original)=>{
 await shell(shifted(part,[-.35,0,-.3]),false,1);await part('fantasy/roof-gable',[-.35,1,-.3],Math.PI/2);
 original('box',[.4,1.9,.4],[.45,.95,-.55],'#81796a');
 original('box',[.6,.4,.65],[.45,.2,-.25],'#81796a');
 original('box',[.35,.15,.08],[.45,.24,.09],'#594332');
 await part('survival/workbench-anvil',[.25,0,.5]);await part('survival/workbench-grind',[-.4,0,.6]);
 original('box',[.3,.16,.3],[.8,.08,.5],'#594332');
},{position:[0,0,.9],forward:[0,0,1]});
await build('facility-granary','granary',async(part,original)=>{
 for(const x of [-.4,.4])for(const z of [-.5,.4])original('box',[.13,.4,.13],[x,.2,z],'#81796a');
 original('box',[1,1.5,1.2],[0,1.05,-.1],'#765741');
 for(const x of [-.4,-.2,0,.2,.4])original('box',[.025,1.5,1.22],[x,1.05,-.1],'#594332');
 original('gable',[1.15,.55,1.35],[0,2.075,-.1],'#626b67');
 original('box',[1.1,.12,.55],[0,.3,.75],'#765741');
 original('box',[.5,.75,.035],[0,.74,.52],'#594332');
 await part('survival/barrel',[-.3,.36,.7]);
},{position:[0,.36,1],forward:[0,0,1]});

await build('facility-market','market',async(part,original)=>{
 await part('fantasy/stall',[-.7,0,-.6]);
 await part('fantasy/stall-green',[.7,0,-.6],Math.PI);
 await part('fantasy/stall-red',[-.7,0,.65]);
 await part('fantasy/cart',[.8,0,.7],Math.PI/2);
 await part('survival/box',[-.95,0,.2]);
 original('box',[2.6,.01,2.6],[0,.005,0],'#a58b5b',0,0,{galleryOnly:true});
},{position:[0,0,1.3],forward:[0,0,1]});
await build('facility-plaza','plaza',async(part,original)=>{
 await part('fantasy/stall-bench',[-.7,0,-.7],Math.PI/2);
 await part('fantasy/stall-bench',[.7,0,-.7],Math.PI/2);
 await part('fantasy/stall-bench',[-.7,0,.7],Math.PI/2);
 original('box',[2.2,.01,2.2],[0,.005,0],'#81796a',0,0,{galleryOnly:true});
},{position:[0,0,1.1],forward:[0,0,1]});
await build('facility-park','park',async(part,original)=>{
 await part('nature/tree_oak',[-.65,0,-.65]);
 await part('nature/tree_default',[.65,0,-.65]);
 await part('nature/plant_bush',[-.65,0,.65]);
 await part('fantasy/stall-bench',[.65,0,.65]);
 original('box',[2.3,.01,2.3],[0,.005,0],'#64895b',0,0,{galleryOnly:true});
},{position:[0,0,1.15],forward:[0,0,1]});

await build('tree-oak','vegetation',async part=>{await part('nature/tree_oak');});
await writeFile(`${out}/manifest.json`,JSON.stringify({catalogVersion:'architecture-v1',recipeVersion:2,entries:records},null,2)+'\n');
console.log(records.map(r=>({id:r.id,triangles:r.triangles,bytes:r.bytes})));
