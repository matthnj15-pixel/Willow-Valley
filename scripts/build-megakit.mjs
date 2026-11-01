// Private, hash-pinned source -> gallery-only art. Never downloads or runs vendor code.
import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {Document,NodeIO} from '@gltf-transform/core';
import {copyToDocument,dedup,prune,weld,unpartition,flatten,join as joinMeshes,getBounds} from '@gltf-transform/functions';
import {BoxGeometry,BufferGeometry,Float32BufferAttribute,Color} from 'three';
const archive=process.argv[2];if(!archive)throw Error('Usage: node scripts/build-megakit.mjs /private/source.zip');
const hash=b=>createHash('sha256').update(b).digest('hex');
const archiveHash='5e60888e2babe418a4618e7815539d9b1b2c3b24c1db2b22cd7a2a7f66140732';
const names=['Wall_Plaster_Straight','Wall_Plaster_Door_Round','Wall_Plaster_Window_Thin_Round','Door_1_Round','DoorFrame_Round_WoodDark','Window_Thin_Round1','Roof_RoundTiles_4x4','Roof_Front_Wood4','Corner_Exterior_Wood','Prop_WoodenFence_Single','Prop_Wagon'];
const temp=await mkdtemp(join(tmpdir(),'wv-megakit-'));
const out='assets/wv/megakit-v1';await mkdir(out,{recursive:true});
try{
 execFileSync('python3',['-c',`
import sys,json,csv,zipfile,hashlib,pathlib
a,d,n=sys.argv[1:];names=json.loads(n)
assert pathlib.Path(a).stat().st_size==708720797
assert hashlib.file_digest(open(a,'rb'),'sha256').hexdigest()=='${archiveHash}'
rows={r['path']:r for r in csv.DictReader(open('docs/assets/wv-megakit/all-files.csv')) if r['container']=='outer'}
with zipfile.ZipFile(a) as z:
 assert hashlib.sha256(z.read('License_Source.txt')).hexdigest()=='7310dfa8512d7ca12b6591329fda4adab7e8b9cdbe04c7d7061c2fe5c7dc38ee'
 for name in names:
  p='glTF/'+name+'.gltf';doc=json.loads(z.read(p))
  for p in [p]+['glTF/'+v['uri'] for v in doc.get('buffers',[])+doc.get('images',[])]:
   assert p in rows and '..' not in pathlib.PurePosixPath(p).parts
   b=z.read(p);assert hashlib.sha256(b).hexdigest()==rows[p]['sha256']
   f=pathlib.Path(d)/p;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(b)
`,archive,temp,JSON.stringify(names)]);
 const io=new NodeIO(),doc=new Document(),scene=doc.createScene('scale-study'),sources=new Map(),recipes=[],textures=[];
 doc.getRoot().setDefaultScene(scene);
 const models=JSON.parse(await readFile('docs/assets/wv-megakit/models.json','utf8'));
 async function part(parent,name,position=[0,0,0],yaw=0){
  if(!sources.has(name))sources.set(name,await io.read(join(temp,'glTF',name+'.gltf')));
  const src=sources.get(name),roots=src.getRoot().getDefaultScene().listChildren(),map=copyToDocument(doc,src,roots);
  const group=doc.createNode(name).setTranslation(position).setRotation([0,Math.sin(yaw/2),0,Math.cos(yaw/2)]);
  for(const root of roots)group.addChild(map.get(root));parent.addChild(group);
  recipes.push({assembly:parent.getName(),source:'glTF/'+name+'.gltf',position,yaw});
 }
 const cottage=doc.createNode('home-steep-gable');scene.addChild(cottage);
 // Source fronts face +Z. Interior wall thickness falls behind the facade datum.
 for(const [z,yaw] of [[2,0],[-2,Math.PI]])for(const x of [-1,1]){
  const door=z===2&&x===-1;await part(cottage,door?'Wall_Plaster_Door_Round':'Wall_Plaster_Straight',[x,0,z],yaw);
 }
 for(const [x,yaw] of [[2,Math.PI/2],[-2,-Math.PI/2]])for(const z of [-1,1]){
  const window=z===1;await part(cottage,window?'Wall_Plaster_Window_Thin_Round':'Wall_Plaster_Straight',[x,0,z],yaw);
  if(window)await part(cottage,'Window_Thin_Round1',[x,0,z],yaw);
 }
 await part(cottage,'Door_1_Round',[-1.5,0,2.015]);
 await part(cottage,'DoorFrame_Round_WoodDark',[-1,0,2]);
 await part(cottage,'Roof_RoundTiles_4x4',[0,3,0]);
 for(const [z,yaw] of [[2,0],[-2,Math.PI]])await part(cottage,'Roof_Front_Wood4',[0,3,z],yaw);
 for(const x of [-2,2])for(const z of [-2,2])await part(cottage,'Corner_Exterior_Wood',[x,0,z]);
 const buffer=doc.createBuffer();
 function original(name,geometry,position,color){
  const p=doc.createPrimitive();for(const [key,attr] of [['POSITION','position'],['NORMAL','normal']])p.setAttribute(key,doc.createAccessor().setBuffer(buffer).setType('VEC3').setArray(new Float32Array(geometry.getAttribute(attr).array)));
  if(geometry.index)p.setIndices(doc.createAccessor().setBuffer(buffer).setType('SCALAR').setArray(new Uint16Array(geometry.index.array)));
  p.setMaterial(doc.createMaterial(name).setBaseColorFactor([...new Color(color).toArray(),1]).setRoughnessFactor(1));
  cottage.addChild(doc.createNode(name).setTranslation(position).setMesh(doc.createMesh().addPrimitive(p)));geometry.dispose();
 }
 // A closed ground floor and a low rubble plinth; threshold is 0.12 m above grade.
 original('authored rubble plinth',new BoxGeometry(4,.12,4),[0,-.06,0],'#777063');
 original('authored closed floor',new BoxGeometry(3.8,.04,3.8),[0,.02,0],'#65503d');
 // Continuous attic backing closes gaps behind the source gable trim on both ends.
 const attic=new BufferGeometry(),v=[[-2,0,-1.99],[2,0,-1.99],[0,3.5,-1.99],[-2,0,1.99],[2,0,1.99],[0,3.5,1.99]],faces=[[0,2,1],[3,4,5],[0,3,5],[0,5,2],[1,2,5],[1,5,4],[0,1,4],[0,4,3]];
 attic.setAttribute('position',new Float32BufferAttribute(faces.flatMap(f=>f.flatMap(i=>v[i])),3));attic.computeVertexNormals();
 original('authored closed attic backing',attic,[0,3,0],'#65503d');
 for(const name of ['Prop_WoodenFence_Single','Prop_Wagon','Door_1_Round']){
  const fixture=doc.createNode(name+'-fixture');scene.addChild(fixture);await part(fixture,name);
 }
 // Base color only; discard unneeded source normal/roughness maps before resizing.
 for(const m of doc.getRoot().listMaterials())m.setNormalTexture(null).setMetallicRoughnessTexture(null).setMetallicFactor(0).setRoughnessFactor(.92);
 await doc.transform(prune(),dedup());
 for(const t of doc.getRoot().listTextures()){
  const input=t.getImage(),size=/Roof|WoodTrim/.test(t.getName())?512:256;
  const image=await sharp(input).resize(size,size,{fit:'inside'}).modulate({saturation:.68}).jpeg({quality:85,mozjpeg:true}).toBuffer();
  const info=await sharp(image).metadata();textures.push({sourceSha256:hash(input),outputSha256:hash(image),width:info.width,height:info.height,bytes:image.length,estimatedMipRGBA8Bytes:Math.ceil(info.width*info.height*4*4/3)});
  t.setImage(image).setMimeType('image/jpeg');
 }
 await doc.transform(dedup(),unpartition(),prune());
 // Bake transforms and merge by material separately for each assembly, retaining named roots.
 for(const root of [...scene.listChildren()]){
  const batch=new Document(),bs=batch.createScene(),map=copyToDocument(batch,doc,[root]);bs.addChild(map.get(root));
  await batch.transform(flatten(),joinMeshes(),prune());
  const roots=bs.listChildren(),copied=copyToDocument(doc,batch,roots),wrapper=doc.createNode(root.getName());
  for(const node of roots)wrapper.addChild(copied.get(node));scene.removeChild(root);scene.addChild(wrapper);
 }
 await doc.transform(weld(),dedup(),unpartition(),prune());
 const entries=scene.listChildren().map(root=>{
  let triangles=0;const materials=new Set();root.traverse(n=>{for(const p of n.getMesh()?.listPrimitives()||[]){triangles+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;materials.add(p.getMaterial());}});
  const b=getBounds(root);return{id:root.getName(),boundsMin:b.min,boundsMax:b.max,triangles,materials:materials.size};
 });
 const shell=entries.find(e=>e.id==='home-steep-gable');
 const overhangPolygon=[[shell.boundsMin[0],shell.boundsMin[2]],[shell.boundsMax[0],shell.boundsMin[2]],[shell.boundsMax[0],shell.boundsMax[2]],[shell.boundsMin[0],shell.boundsMax[2]]];
 const bytes=await io.writeBinary(doc);await writeFile(out+'/study.glb',bytes);
 await writeFile(out+'/manifest.json',JSON.stringify({schemaVersion:1,status:'gallery-review',runtimeReady:false,recipeRevision:1,archiveSha256:archiveHash,sourceLicenseSha256:'7310dfa8512d7ca12b6591329fda4adab7e8b9cdbe04c7d7061c2fe5c7dc38ee',units:'visual metres',gameUnitsPerMetre:2.8,output:{url:out+'/study.glb',sha256:hash(bytes),bytes:bytes.length},entries,overhangPolygon,structuralSeat:[[-2,-2],[2,-2],[2,2],[-2,2]],entrance:{threshold:[-1,0,2],forward:[0,0,1],clearWidth:1},foundation:{height:.12,grade:-.12},fitPolicy:'Canonical scale 2.8 only; no parcel enlargement. Gallery only.',permittedEras:[0],removedInteriors:'No interior furnishing imported; complete source exterior modules retained.',authoredAdditions:['closed floor','rubble plinth','closed attic backing'],sources:names.map(name=>models.find(m=>m.name===name)),recipes,textures,externalDependencies:[]},null,2)+'\n');
 console.log(entries,textures,'output bytes',bytes.length);
}finally{await rm(temp,{recursive:true,force:true});}
