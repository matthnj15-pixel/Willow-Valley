// Reproducible original geometry, no private source, image files or decoder.
import * as T from 'three';
import {Document,NodeIO} from '@gltf-transform/core';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {FORMS,REVISION} from '../assets/wv/landscape-next/catalog.mjs';
const out=new URL('../assets/wv/landscape-next/',import.meta.url),doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene();
const hash=data=>createHash('sha256').update(data).digest('hex');
const materials=[doc.createMaterial('matte woodland').setBaseColorFactor([1,1,1,1]).setMetallicFactor(0).setRoughnessFactor(1),doc.createMaterial('matte small cover').setBaseColorFactor([1,1,1,1]).setMetallicFactor(0).setRoughnessFactor(.94)];
const palette={bark:'#594332',leaf:'#4d7c58',light:'#64895b',pine:'#406d53',stone:'#81796a',cut:'#a18b62',cream:'#c8c0a0',mauve:'#947c90',grass:'#687b4a'};
function geometry(id,lod){
 const low=lod!=='normal',far=lod==='far',parts=[];
 function add(g,color){g.setAttribute('color',new T.Float32BufferAttribute(Array.from({length:g.attributes.position.count},()=>new T.Color(palette[color]||color).toArray()).flat(),3));parts.push(g.index?g.toNonIndexed():g);if(g.index)g.dispose();}
 const blob=(x,y,z,rx,ry,rz,color='leaf',detail=low?0:1,twist=.2)=>{const g=new T.IcosahedronGeometry(1,detail);const p=g.attributes.position;for(let i=0;i<p.count;i++){const a=p.getX(i),b=p.getY(i),c=p.getZ(i),n=1+.085*Math.sin(a*9+b*6+c*11+twist);p.setXYZ(i,a*n,b*n,c*n);}g.scale(rx,ry,rz).rotateY(twist).translate(x,y,z);g.computeVertexNormals();add(g,color);};
 function pole(a,b,r1=.12,r2=.08,color='bark',segments=low?5:7){const av=new T.Vector3(...a),bv=new T.Vector3(...b),delta=bv.clone().sub(av),g=new T.CylinderGeometry(r2,r1,delta.length(),segments);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));g.translate(...av.add(bv).multiplyScalar(.5).toArray());add(g,color);}
 function blade(x,z,h,yaw,color='grass',width=.055){const c=Math.cos(yaw),s=Math.sin(yaw),g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([x-c*width,0,z-s*width,x+c*width,0,z+s*width,x+s*h*.25,h,z-c*h*.25,x,0,z+width],3));g.setIndex([0,1,2,1,3,2,3,0,2]);g.computeVertexNormals();add(g,color);}
 const young=id.endsWith('young');
 if(id.includes('oak')||id.includes('beech')||id.includes('birch')||id.includes('pine')){
  const pine=id.includes('pine'),h=young?3.2:pine?10:id.includes('beech')?9.5:id.includes('birch')?8.8:8.2;
  pole([0,0,0],[.12,h*.8,.08],young?.11:.28,young?.04:.10,id.includes('birch')?'#a5a18a':'bark');
  if(pine&&far){const g=new T.ConeGeometry(h*.2976,h*.86,6,1);g.translate(.08,h*.62,0);add(g,'pine');}
  else if(pine){for(let i=0;i<4;i++){const y=h*(.38+i*.16),r=(h-y)*.48,g=new T.ConeGeometry(r,h*.38,low?6:9,1);g.translate(.08,y,0);add(g,'pine');}}
  else {const n=far?3:low?5:7;for(let i=0;i<n;i++){const a=i*2.399,r=young?.7:id.includes('beech')?1.25:id.includes('birch')?1.8:2.1,y=h*(.60+(i%3)*.10),x=Math.cos(a)*r,z=Math.sin(a)*r;pole([.05,h*.38,0],[x,y,z],young?.05:.10,.025);blob(x,y,z,young?.8:id.includes('beech')?1.55:1.85,young?.9:id.includes('beech')?2.2:1.55,young?.8:1.55,i%2?'leaf':'light',low?0:1,a);}}
 }else if(id.includes('shrub')||id==='hedge-fragment'){
  const hedge=id==='hedge-fragment',n=hedge?5:id==='hazel-shrub'?4:3;
  for(let i=0;i<n;i++){const x=hedge?(i-2)*.7:Math.cos(i*2.4)*.55,z=hedge?Math.sin(i*3)*.18:Math.sin(i*2.4)*.5;pole([x,0,z],[x+.1,1,z],.07,.02);blob(x,.8+(i%2)*.2,z,hedge?.58:.66,id==='thorn-shrub'?.5:.8,.6,i%2?'leaf':'light');}
 }else if(id==='stump'){
  pole([0,0,0],[.08,.65,0],.4,.28);pole([.08,.65,0],[.08,.67,0],.25,.25,'cut');for(let i=0;i<4;i++)pole([0,.2,0],[Math.cos(i*1.57)*.65,.02,Math.sin(i*1.57)*.65],.18,.055);
 }else if(id==='fallen-log'){
  pole([-1.8,.28,0],[1.8,.28,.12],.28,.23);pole([1.8,.28,.12],[1.815,.28,.12],.20,.20,'cut');pole([-.6,.33,0],[-.2,.85,.22],.11,.03);
 }else if(id.includes('boulder')||id.includes('outcrop')||id==='bank-stones'){
  const n=id==='bank-stones'?4:id==='outcrop-layered'?3:1;
  for(let i=0;i<n;i++){const small=id==='bank-stones',r=small?.22:id==='outcrop-layered'?1.1:1.3;blob((i-(n-1)/2)*r*.9,r*.35,Math.sin(i*2)*r*.25,r,r*(id==='outcrop-layered'?.55:.7),r*.8,'stone',low?0:1,i);}
 }else {
  const reed=id==='reed-cluster',rush=id==='rush-cluster',fern=id==='fern-cluster',flower=id.startsWith('flower');
  const n=low?fern?5:7:fern?9:flower?10:reed?15:19;
  for(let i=0;i<n;i++){const a=i*2.399,r=Math.sqrt(i/n)*(reed?.65:fern?.15:.65),x=Math.cos(a)*r,z=Math.sin(a)*r,h=(reed?1.35:rush?.8:fern?.55:flower?.48:.32)*( .65+(i%4)*.13);
   if(fern){
    const point=t=>[Math.cos(a)*t*.92,.035+Math.sin(t*Math.PI)*.38,Math.sin(a)*t*.92];
    const steps=low?2:4;let previous=point(0);
    for(let j=1;j<=steps;j++){const t=j/(steps+1),base=point(t);pole(previous,base,.009,.006,'leaf',3);previous=base;
     for(const side of [-1,1]){const tip=[base[0]+Math.cos(a)*.13-Math.sin(a)*side*(.25-t*.16),base[1]+.035,base[2]+Math.sin(a)*.13+Math.cos(a)*side*(.25-t*.16)],dx=tip[0]-base[0],dz=tip[2]-base[2],length=Math.hypot(dx,dz),w=.05*(1-t*.45),mid=base.map((v,k)=>(v+tip[k])*.5),g=new T.BufferGeometry();
      g.setAttribute('position',new T.Float32BufferAttribute([...base,...tip,mid[0]-dz/length*w,mid[1],mid[2]+dx/length*w,mid[0]+dz/length*w,mid[1],mid[2]-dx/length*w,mid[0],mid[1]+.018,mid[2]],3));g.setIndex([0,2,4,2,1,4,1,3,4,3,0,4,0,1,2,0,3,1]);g.computeVertexNormals();add(g,j%2?'leaf':'light');
     }
    }
    pole(previous,point(1),.006,.002,'leaf',3);
   }
   else {blade(x,z,h,a,reed?'#7c8052':'grass',reed?.025:.035);if(flower&&i%3===0)blob(x+Math.sin(a)*h*.25,h,z-Math.cos(a)*h*.25,.07,.035,.07,id==='flower-cream'?'cream':'mauve',0);if(reed&&i%4===0)pole([x,h*.75,z],[x,h,z],.025,.024,'bark',4);}
  }
 }
 const g=new T.BufferGeometry();for(const attr of ['position','normal','color'])g.setAttribute(attr,new T.Float32BufferAttribute(parts.flatMap(p=>Array.from(p.attributes[attr].array)),3));for(const p of parts)p.dispose();
 // All natural bases seat at Y=0, with no crown pivot normalization.
 g.computeBoundingBox();g.translate(0,-g.boundingBox.min.y,0);g.computeBoundingBox();return g;
}
const entries=[];
for(const form of FORMS){const variants=[];for(const lod of ['normal','low','far']){
 const g=geometry(form.id,lod),name=form.id+'__'+lod,primitive=doc.createPrimitive();for(const [attr,semantic] of [['position','POSITION'],['normal','NORMAL'],['color','COLOR_0']])primitive.setAttribute(semantic,doc.createAccessor().setType('VEC3').setArray(g.attributes[attr].array).setBuffer(buffer));
 primitive.setMaterial(materials[lod==='normal'&&['ground-cover','wildflower','bank-cover'].includes(form.category)?1:0]);scene.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(primitive)));
 const positions=g.attributes.position;const contactVertices=[];for(let i=0;i<positions.count;i++)if(positions.getY(i)<.015)contactVertices.push([positions.getX(i),positions.getY(i),positions.getZ(i)]);
 variants.push({lod,node:name,baseContactVertices:[...new Map(contactVertices.map(p=>[p.join(','),p])).values()],boundsMin:g.boundingBox.min.toArray(),boundsMax:g.boundingBox.max.toArray(),triangles:g.attributes.position.count/3,materialGroups:1});g.dispose();
 }const b=variants[0];entries.push({...form,boundsMin:b.boundsMin,boundsMax:b.boundsMax,variants,groundContacts:{type:form.id==='fallen-log'?'rigid-length':form.category==='woodland'||form.category==='young-tree'?'trunk-seat':'footprint',baseY:0},conservativePlanEnvelope:[[b.boundsMin[0],b.boundsMin[2]],[b.boundsMax[0],b.boundsMin[2]],[b.boundsMax[0],b.boundsMax[2]],[b.boundsMin[0],b.boundsMax[2]]],entrances:[],roofEnvelope:null,proposedGameplayMetadata:null});}
await mkdir(out,{recursive:true});const bytes=await new NodeIO().writeBinary(doc);await writeFile(new URL('landscape.glb',out),bytes);
const sourceFiles=['scripts/build-wv006-landscape.mjs','assets/wv/landscape-next/catalog.mjs'];
const sources=await Promise.all(sourceFiles.map(async path=>({path,sha256:hash(await readFile(new URL('../'+path,import.meta.url)))})));
const manifest={revision:REVISION,status:'gallery-review',runtimeReady:false,units:'visual metres',up:'+Y',gameUnitsPerMetre:2.8,referencePersonMetres:1.75,license:'Original Willow Valley project artwork, authored by the committed recipe. No third-party art inputs or private archive used.',privateSourcePrerequisites:[],sources,output:{path:'landscape.glb',sha256:hash(bytes),bytes:bytes.length},textures:[],textureBytes:0,materials:2,dependencies:['landscape.glb'],entries};
await writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2)+'\n');console.log(`${entries.length} forms / ${bytes.length} bytes / no textures`);
