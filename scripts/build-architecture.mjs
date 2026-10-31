import sharp from "sharp";
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
 else if(b>r*1.12&&b>g*1.03){const shade=(r+g+b)/3/150;palette[i]=Math.min(255,195*shade);palette[i+1]=Math.min(255,179*shade);palette[i+2]=Math.min(255,151*shade);}
}
const derivativePalette=await sharp(palette,{raw:info}).png().toBuffer();
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),sourceCache=new Map();
const out='assets/wv/architecture-v1';await mkdir(out,{recursive:true});
const records=[];
async function source(id){
 if(!sourceCache.has(id)){
  const row=manifest.assets.find(a=>a.id===id);if(!row)throw Error('Unverified source '+id);
  sourceCache.set(id,await io.read(`assets/wv/sources/${row.kit}/${row.path}`));
 }
 return sourceCache.get(id);
}
async function build(id,role,recipe,entrance=null){
 const doc=new Document(),scene=doc.createScene(id),sources=new Set();
 async function part(sourceID,position=[0,0,0],yaw=0){
  const src=await source(sourceID),roots=src.getRoot().getDefaultScene().listChildren();
  const map=copyToDocument(doc,src,roots);
  if(sourceID.startsWith('fantasy/'))for(const material of src.getRoot().listMaterials()){
   const texture=map.get(material)?.getBaseColorTexture();if(texture)texture.setImage(derivativePalette);
  }
  const group=doc.createNode(sourceID).setTranslation(position).setRotation([0,Math.sin(yaw/2),0,Math.cos(yaw/2)]);
  for(const root of roots)group.addChild(map.get(root));scene.addChild(group);sources.add(sourceID);
 }
 await recipe(part);
 await doc.transform(unpartition(),weld(),dedup(),prune());
 const bounds=getBounds(scene);
 // Normalize floor only; retain full assembly grid alignment and hierarchy.
 const base=bounds.min[1];
 const wrapper=doc.createNode('floor-center +Z entrance').setTranslation([0,-base,0]);
 const children=scene.listChildren();for(const node of children){scene.removeChild(node);wrapper.addChild(node);}scene.addChild(wrapper);
 const bytes=await io.writeBinary(doc);await writeFile(`${out}/${id}.glb`,bytes);
 const final=getBounds(scene);
 let triangles=0;for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives())triangles+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;
 records.push({id,role,url:`./${out}/${id}.glb`,bytes:bytes.byteLength,sha256:createHash('sha256').update(bytes).digest('hex'),
  boundsMin:final.min,boundsMax:final.max,triangles,entrance,sourceIds:[...sources],license:'CC0-1.0',recipeVersion:1,derivativePaletteSha256:createHash('sha256').update(derivativePalette).digest('hex'),
  status:'gallery-review',runtimeReady:false});
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
await build('tree-oak','vegetation',async part=>{await part('nature/tree_oak');});
await writeFile(`${out}/manifest.json`,JSON.stringify({catalogVersion:'architecture-v1',recipeVersion:1,entries:records},null,2)+'\n');
console.log(records.map(r=>({id:r.id,triangles:r.triangles,bytes:r.bytes})));
