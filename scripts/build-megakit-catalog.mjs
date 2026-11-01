// Expanded art catalog; consumes only the licensed, hash-pinned private archive.
import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {Document,NodeIO} from '@gltf-transform/core';
import {copyToDocument,dedup,prune,weld,unpartition,flatten,join as joinMeshes,getBounds} from '@gltf-transform/functions';
import {BoxGeometry,CylinderGeometry,BufferGeometry,Float32BufferAttribute,Color,Quaternion,Vector3} from 'three';

const archive=process.argv[2];if(!archive)throw Error('Usage: node scripts/build-megakit-catalog.mjs /private/source.zip');
const hash=b=>createHash('sha256').update(b).digest('hex');
const approved=JSON.parse(await readFile('assets/wv/megakit-v1/manifest.json','utf8'));
const approvedBytes=await readFile(approved.output.url);if(hash(approvedBytes)!==approved.output.sha256)throw Error('Approved study changed');
const names=[
 'Wall_Plaster_Straight','Wall_Plaster_Door_Round','Wall_Plaster_Window_Thin_Round',
 'Wall_WoodWear_Straight','Wall_WoodWear_Door_Flat','Wall_WoodWear_Window_Thin_Round',
 'Wall_UnevenBrick_Straight','Wall_UnevenBrick_Door_Flat','Wall_UnevenBrick_Window_Thin_Round',
 'Door_1_Round','Door_1_Flat','DoorFrame_Round_WoodDark','DoorFrame_Flat_WoodLight','Window_Thin_Round1',
 'Roof_RoundTiles_4x4','Roof_FlatTiles_4x4','Roof_FlatTiles_4x6','Roof_2x4_FlatTile',
 'Roof_Front_Wood4','Roof_Front_Wood2','Roof_Wooden_2x1','Roof_Wooden_2x1_L','Roof_Wooden_2x1_R',
 'Corner_Exterior_Wood','Prop_WoodenFence_Single','Prop_Wagon','Prop_Crate','Prop_Chimney2'];
const temp=await mkdtemp(join(tmpdir(),'wv-catalog-')),out='assets/wv/megakit-catalog-v1';await mkdir(out,{recursive:true});
try{
 execFileSync('python3',['-c',`
import sys,json,csv,zipfile,hashlib,pathlib
a,d,n=sys.argv[1:];names=json.loads(n)
assert pathlib.Path(a).stat().st_size==708720797
assert hashlib.file_digest(open(a,'rb'),'sha256').hexdigest()=='${approved.archiveSha256}'
rows={r['path']:r for r in csv.DictReader(open('docs/assets/wv-megakit/all-files.csv')) if r['container']=='outer'}
with zipfile.ZipFile(a) as z:
 assert hashlib.sha256(z.read('License_Source.txt')).hexdigest()=='${approved.sourceLicenseSha256}'
 for name in names:
  p='glTF/'+name+'.gltf';doc=json.loads(z.read(p))
  for p in [p]+['glTF/'+v['uri'] for v in doc.get('buffers',[])+doc.get('images',[])]:
   assert p in rows and '..' not in pathlib.PurePosixPath(p).parts
   b=z.read(p);assert hashlib.sha256(b).hexdigest()==rows[p]['sha256']
   f=pathlib.Path(d)/p;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(b)
`,archive,temp,JSON.stringify(names)]);
 const io=new NodeIO(),doc=new Document(),scene=doc.createScene('hamlet-catalog'),buffer=doc.createBuffer();doc.getRoot().setDefaultScene(scene);
 const models=JSON.parse(await readFile('docs/assets/wv-megakit/models.json','utf8'));
 const cache=new Map(),recipes=[],entries=[],authored=[],textureRecords=new Map(),materials=new Map();
 // Original seamless reed-fibre artwork, generated here rather than attributed to the pack.
 let seed=719;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const fibers=Array.from({length:700},()=>{const x=random()*256,y=random()*256,w=.4+random()*1.1,len=8+random()*34;return `<path d="M${x.toFixed(2)} ${y.toFixed(2)}l${(random()*2-1).toFixed(2)} ${len.toFixed(2)}" stroke="${random()>.5?'#776343':'#b29b6c'}" stroke-width="${w.toFixed(2)}" opacity=".5"/>`;}).join('');
 const reedImage=await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#9c885f"/>${fibers}</svg>`)).png().toBuffer();
 const reedTexture=doc.createTexture('Willow Valley original reed fibres').setImage(reedImage).setMimeType('image/png');
 const reedMaterial=doc.createMaterial('Original layered thatch').setBaseColorTexture(reedTexture).setMetallicFactor(0).setRoughnessFactor(.92);
 const authoredTextures=[{id:'original-reed-fibres',sourceSha256:hash(reedImage),generator:'seeded SVG reed-fibre strokes, recipe revision 1',license:'original Willow Valley artwork'}];
 let grainSeed=314;const grainRandom=()=>{grainSeed=(Math.imul(grainSeed,1664525)+1013904223)>>>0;return grainSeed/4294967296;};
 const grain=Array.from({length:240},()=>{const x=grainRandom()*256,y=grainRandom()*256;return `<path d="M${x.toFixed(2)} ${y.toFixed(2)}q${(grainRandom()*6-3).toFixed(2)} 16 0 42" stroke="${grainRandom()>.5?'#56422f':'#92744f'}" stroke-width=".8" opacity=".55"/>`;}).join('');
 const grainImage=await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#796044"/>${grain}<path d="M0 0v256M64 0v256M128 0v256M192 0v256M256 0v256" stroke="#4b3c2b" stroke-width="2"/></svg>`)).png().toBuffer();
 const grainTexture=doc.createTexture('Willow Valley original boarded timber').setImage(grainImage).setMimeType('image/png');
 const grainMaterial=doc.createMaterial('Original boarded timber').setBaseColorTexture(grainTexture).setMetallicFactor(0).setRoughnessFactor(.92);
 authoredTextures.push({id:'original-boarded-timber',sourceSha256:hash(grainImage),generator:'seeded SVG board joints and grain strokes, recipe revision 1',license:'original Willow Valley artwork'});

 const approvedDoc=await io.readBinary(approvedBytes),approvedRoot=approvedDoc.getRoot().getDefaultScene().listChildren().find(n=>n.getName()==='home-steep-gable');
 const knownTextures=new Map(approved.textures.map(t=>[t.outputSha256,t]));
 async function source(name){if(!cache.has(name))cache.set(name,await io.read(join(temp,'glTF',name+'.gltf')));return cache.get(name);}
 function root(id,name,role,description){const node=doc.createNode(id);scene.addChild(node);entries.push({id,name,role,description,structuralSeats:[],entrances:[],shellProbes:[],authoredAdditions:[],permittedEras:[0],status:id==='home-steep-gable'?'visual-approved':'gallery-review',runtimeReady:false});return node;}
 const record=p=>entries.find(e=>e.id===p.getName());
 async function part(parent,name,position=[0,0,0],yaw=0){
  const src=await source(name),roots=src.getRoot().getDefaultScene().listChildren(),map=copyToDocument(doc,src,roots);
  const group=doc.createNode(name).setTranslation(position).setRotation([0,Math.sin(yaw/2),0,Math.cos(yaw/2)]);
  for(const r of roots)group.addChild(map.get(r));parent.addChild(group);recipes.push({assembly:parent.getName(),source:'glTF/'+name+'.gltf',position,yaw});return group;
 }
 function original(parent,name,geometry,position,color,rotation=[0,0,0]){
  geometry.rotateX(rotation[0]);geometry.rotateY(rotation[1]);geometry.rotateZ(rotation[2]);const p=doc.createPrimitive();
  for(const [key,attr] of [['POSITION','position'],['NORMAL','normal']])p.setAttribute(key,doc.createAccessor().setBuffer(buffer).setType('VEC3').setArray(new Float32Array(geometry.getAttribute(attr).array)));
  if(geometry.getAttribute('uv'))p.setAttribute('TEXCOORD_0',doc.createAccessor().setBuffer(buffer).setType('VEC2').setArray(new Float32Array(geometry.getAttribute('uv').array)));
  if(geometry.index)p.setIndices(doc.createAccessor().setBuffer(buffer).setType('SCALAR').setArray(new Uint16Array(geometry.index.array)));
  if(typeof color==='string'&&!materials.has(color))materials.set(color,doc.createMaterial('Willow Valley '+color).setBaseColorFactor([...new Color(color).toArray(),1]).setMetallicFactor(0).setRoughnessFactor(.92));
  p.setMaterial(typeof color==='string'?materials.get(color):color);parent.addChild(doc.createNode(name).setTranslation(position).setMesh(doc.createMesh().addPrimitive(p)));geometry.dispose();
  authored.push({assembly:parent.getName(),name,position,color:typeof color==='string'?color:color.getName(),rotation});const e=record(parent);if(!e.authoredAdditions.includes(name))e.authoredAdditions.push(name);
 }
 const box=(p,name,size,pos,color='#65503d',rotation)=>original(p,name,new BoxGeometry(...size),pos,color,rotation);
 const timber='#65503d',stone='#777063',straw='#938059';
 function polygon(cx,cz,w,d){return[[cx-w/2,cz-d/2],[cx+w/2,cz-d/2],[cx+w/2,cz+d/2],[cx-w/2,cz+d/2]];}
 function attic(p,w,d,h,pos,yaw=0){const [x,y,z]=pos,g=new BufferGeometry(),v=[[-w/2,0,-d/2],[w/2,0,-d/2],[0,h,-d/2],[-w/2,0,d/2],[w/2,0,d/2],[0,h,d/2]],f=[[0,2,1],[3,4,5],[0,3,5],[0,5,2],[1,2,5],[1,5,4],[0,1,4],[0,4,3]];g.setAttribute('position',new Float32BufferAttribute(f.flatMap(t=>t.flatMap(i=>v[i])),3));g.computeVertexNormals();original(p,'closed attic backing',g,[x,y,z],timber,[0,yaw,0]);}
 function seat(p,cx,cz,w,d,y=0){record(p).structuralSeats.push({polygon:polygon(cx,cz,w,d),floor:y,grade:-.12});box(p,'rubble foundation',[w,y+.12,d],[cx,(y-.12)/2,cz],stone);box(p,'closed floor',[w-.15,.04,d-.15],[cx,y+.02,cz]);}
 function steps(p,x,z,height,width=1.3){const n=Math.ceil(height/.23);for(let i=0;i<n;i++){const h=height*(n-i)/n;box(p,'entrance step',[width,h+.12,.35],[x,(h-.12)/2,z+i*.35],stone);}}
 function beam(p,name,a,b,width=.12,color=timber){const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],length=Math.hypot(dx,dy,dz);const g=new CylinderGeometry(width/2,width/2,length,6);g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0,1,0),new Vector3(dx,dy,dz).normalize()));original(p,name,g,a.map((v,i)=>(v+b[i])/2),color);}
 async function shell(p,{cx=0,cz=0,w=4,d=4,y=0,family='Plaster',door='Round',roof='round',porch=false,loading=false,openSides=[]}={}){
  seat(p,cx,cz,w,d,y);const ex=loading?cx:cx-w/2+1,front=cz+d/2;
  for(const [z,yaw] of [[front,0],[cz-d/2,Math.PI]])for(let i=0;i<w/2;i++){
   if(loading&&z===front)continue;
   const x=cx-w/2+1+i*2,isDoor=z===front&&i===0;await part(p,`Wall_${family}_${isDoor?'Door_'+door:'Straight'}`,[x,y,z],yaw);
  }
  for(const [x,yaw] of [[cx+w/2,Math.PI/2],[cx-w/2,-Math.PI/2]])for(let i=0;i<d/2;i++){
   if(openSides.includes(x>cx?'right':'left'))continue;
   const z=cz-d/2+1+i*2,window=i===Math.floor(d/2)-1;await part(p,`Wall_${family}_${window?'Window_Thin_Round':'Straight'}`,[x,y,z],yaw);if(window)await part(p,'Window_Thin_Round1',[x,y,z],yaw);
  }
  if(loading){
   const wood=grainMaterial;
   for(const side of [-1,1]){box(p,'loading bay infill',[.9,3,.18],[cx+side*1.55,y+1.5,front],wood);box(p,'double loading door',[1.1,2.4,.13],[cx+side*.55,y+1.2,front+.07],wood);box(p,'loading jamb',[.14,2.5,.22],[cx+side*1.15,y+1.25,front+.06]);for(const h of [.45,1.9])box(p,'forged door strap',[.9,.065,.035],[cx+side*.55,y+h,front+.15],'#414744');}
   box(p,'loading bay header',[2.25,.6,.2],[cx,y+2.7,front],wood);
  }else{await part(p,'Door_1_'+door,[ex-.5,y,front+.015]);await part(p,door==='Round'?'DoorFrame_Round_WoodDark':'DoorFrame_Flat_WoodLight',[ex,y,front]);}
  for(const x of [cx-w/2,cx+w/2])for(const z of [cz-d/2,cz+d/2])await part(p,'Corner_Exterior_Wood',[x,y,z]);
  record(p).entrances.push({threshold:[ex,y,front],forward:[0,0,1],clearWidth:loading?2.0:1,clearDepth:loading?2.4:1.3});
  for(const [x,z,dx,dz] of [[cx-w/2-1,cz,1,0],[cx+w/2+1,cz,-1,0],[cx,cz-d/2-1,0,1],[cx,front+1,0,-1]]){if((dx===1&&openSides.includes('left'))||(dx===-1&&openSides.includes('right')))continue;record(p).shellProbes.push({origin:[x,y+1.5,z],direction:[dx,0,dz],maxDistance:1.7});}
  if(roof==='hip'){hip(p,cx,cz,y+3);return;}
  const small=w===2,roofName=small?'Roof_2x4_FlatTile':roof==='round'?'Roof_RoundTiles_4x4':d===6?'Roof_FlatTiles_4x6':'Roof_FlatTiles_4x4';
  await part(p,roofName,[cx,y+3,cz]);attic(p,w,d-.02,small?1.25:2.6,[cx,y+3,cz]);
  for(const [z,yaw] of [[front,0],[cz-d/2,Math.PI]])await part(p,small?'Roof_Front_Wood2':'Roof_Front_Wood4',[cx,y+3,z],yaw);
  if(porch)await leanTo(p,cx,front,2.55);
 }
 function hip(p,cx,cz,y){
  // Original low hipped thatch construction, not a nonexistent vendor roof.
  const ring=t=>[[-2.5+2.25*t,-2.5+1.9*t],[2.5-2.25*t,-2.5+1.9*t],[2.5-2.25*t,2.5-1.9*t],[-2.5+2.25*t,2.5-1.9*t]];
  for(let course=0;course<9;course++){
   const a=course/9,b=(course+1)/9,low=ring(a),high=ring(b),positions=[],uv=[];
   for(let i=0;i<4;i++){const j=(i+1)%4,A=[...low[i]],B=[...low[j]],C=[...high[j]],D=[...high[i]];for(const [point,t,u] of [[A,a,0],[C,b,8],[B,a,8],[A,a,0],[D,b,0],[C,b,8]]){positions.push(point[0],t*1.65,point[1]);uv.push(u,t*4);}}
   const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.computeVertexNormals();original(p,'authored layered hipped thatch',g,[cx,y-.13+(1-course/9)*.009,cz],reedMaterial);
  }
  original(p,'bound thatch ridge',new CylinderGeometry(.20,.20,1.45,8),[cx,y+1.50,cz],reedMaterial,[Math.PI/2,0,0]);
  // Lower edges of the thick thatch hide the wall top; closed ceiling blocks light gaps.
  box(p,'hip ceiling',[4,.08,4],[cx,y-.02,cz]);
  for(const z of [-2.46,2.46])box(p,'thick bound reed eave',[5,.16,.12],[cx,y-.21,cz+z],reedMaterial);for(const x of [-2.46,2.46])box(p,'thick bound reed eave',[.12,.16,5],[cx+x,y-.21,cz],reedMaterial);
 }
 async function leanTo(p,cx,cz,y,detached=false){
  await part(p,'Roof_Wooden_2x1_L',[cx-1,y,cz]);await part(p,'Roof_Wooden_2x1_R',[cx+1,y,cz]);
  for(const x of [cx-1.8,cx+1.8]){box(p,'porch post',[.16,y-.02,.16],[x,(y-.02)/2,cz+1.3]);box(p,'post stone',[.3,.12,.3],[x,-.06,cz+1.3],stone);}
  beam(p,'porch eave tie',[cx-1.9,y-.06,cz+1.3],[cx+1.9,y-.06,cz+1.3]);
  if(detached)for(const x of [cx-1.8,cx+1.8]){box(p,'rear workshop post',[.16,y+1,.16],[x,(y+.88)/2,cz]);box(p,'post stone',[.3,.12,.3],[x,-.06,cz],stone);}
  record(p).structuralSeats.push({polygon:polygon(cx,cz+.65,4,1.3),floor:0,grade:-.12,open:true});
 }
 async function fence(p,x,z,yaw=0){await part(p,'Prop_WoodenFence_Single',[x,-.09,z],yaw);}
 async function wagon(p,x,z,yaw=0){await part(p,'Prop_Wagon',[x,-.123,z],yaw);}
 async function crate(p,x,z,y=-.12){await part(p,'Prop_Crate',[x,y,z]);}
 function anvil(p,x,z){box(p,'anvil oak stump',[.5,.58,.5],[x,.17,z]);box(p,'anvil waist',[.28,.22,.28],[x,.57,z],'#414744');box(p,'anvil face',[.8,.12,.32],[x,.74,z],'#414744');original(p,'anvil horn',new CylinderGeometry(0,.12,.38,6),[x+.55,.72,z],'#414744',[0,0,-Math.PI/2]);}
 async function openShelter(p,cx,cz,{stock=false,workbench=true}={}){
  for(const x of [cx-1.8,cx+1.8])for(const z of [cz-1.25,cz+1.25]){box(p,'shelter post',[.18,2.44,.18],[x,1.10,z]);box(p,'post stone',[.32,.12,.32],[x,-.06,z],stone);}
  for(const yaw of [0,Math.PI])for(const [x,name] of [[-1,'Roof_Wooden_2x1_L'],[1,'Roof_Wooden_2x1_R']])await part(p,name,[cx+x,2.42,cz],yaw);
  for(const x of [cx-1.8,cx+1.8])beam(p,'shelter cross tie',[x,2.31,cz-1.3],[x,2.31,cz+1.3],.18);
  if(workbench){box(p,'workbench top',[1.7,.12,.65],[cx,.88,cz]);for(const x of [cx-.65,cx+.65])box(p,'workbench legs',[.14,.94,.5],[x,.35,cz]);}
  record(p).structuralSeats.push({polygon:polygon(cx,cz,4,2.7),floor:-.12,grade:-.12,open:true});
  if(stock)for(let row=0;row<3;row++)for(let i=0;i<3-row;i++)original(p,'stacked cut log',new CylinderGeometry(.18,.18,2.8,10),[cx+3+i*.38+row*.19,.06+row*.32,cz],timber,[Math.PI/2,0,0]);
 }

 let p=root('home-steep-gable','Gabled plaster cottage','residential','Approved compact plaster cottage; steep tiled roof and arched entry.');
 {const map=copyToDocument(doc,approvedDoc,[approvedRoot]);const n=map.get(approvedRoot);n.setName('approved cottage geometry');p.addChild(n);record(p).structuralSeats=[{polygon:approved.structuralSeat,floor:0,grade:-.12}];record(p).entrances=[{...approved.entrance,clearDepth:1.3}];record(p).approvedGeometryInputSha256=approved.output.sha256;record(p).authoredAdditions=approved.authoredAdditions;for(const [x,z,dx,dz] of [[-3,0,1,0],[3,0,-1,0],[0,-3,0,1],[0,3,0,-1]])record(p).shellProbes.push({origin:[x,1.5,z],direction:[dx,0,dz],maxDistance:1.7});}
 p=root('home-long-ridge','Long-ridge timber house','residential','Four-by-six metre timber house with a long clay-tile ridge.');await shell(p,{family:'WoodWear',door:'Flat',d:6,roof:'flat'});await part(p,'Prop_Chimney2',[1.2,3.5,-1.4]);
 p=root('home-low-hip','Thatched crofter’s cottage','residential','Low hipped thatch, limewashed walls and an off-centre arched doorway.');await shell(p,{roof:'hip'});
 p=root('home-porch-cabin','Porch-front timber cottage','residential','Compact boarded cottage with a usable shaded timber porch.');await shell(p,{family:'WoodWear',door:'Flat',roof:'flat',porch:true});
 p=root('home-offset-gables','Paired-gable house','residential','Plaster main room with a lower narrow timber wing and unequal gables.');await shell(p,{cx:-1,roof:'round',openSides:['right']});await shell(p,{cx:2,w:2,family:'WoodWear',door:'Flat',roof:'flat',openSides:['left']});record(p).removedInteriorModules='Shared wall bays and window assemblies at the main-room/service-wing join are omitted';

 p=root('facility-farm','Farmhouse & hay yard','farm','Plaster farmhouse, open hay shelter, wagon and rear yard fencing.');await shell(p,{cx:-3,cz:-1});await openShelter(p,3,-1,{workbench:false});for(const z of [-1.1,-.35])box(p,'bound straw bale',[1.25,.75,.65],[3,.255,z],straw);await wagon(p,3.8,4.5,Math.PI/2);await fence(p,-4,-4);await fence(p,3,-3.7);
 p=root('facility-smith','Masonry forge & smithy','smith','Brick workshop, vented hearth, open working bay, anvil and loading space.');await shell(p,{cx:-2,family:'UnevenBrick',door:'Flat',roof:'flat'});await leanTo(p,2,0,2.65,true);box(p,'forge masonry base',[1.4,.7,1.0],[2,.23,.45],stone);box(p,'forge black hearth',[1.1,.1,.8],[2,.63,.45],'#302f2a');box(p,'banked forge coals',[.45,.035,.34],[2,.70,.45],'#994c2e');box(p,'forge hood',[1.5,.35,1.1],[2,2.1,.45],stone);box(p,'masonry flue',[.6,1.6,.6],[2,3.0,.4],stone);await part(p,'Prop_Chimney2',[2,3.55,.4]);anvil(p,2.5,2.7);await crate(p,-4.8,1.4);
 p=root('facility-granary','Raised granary & loading deck','granary','Dry timber store, raised loading platform, entrance steps and a delivery wagon.');await shell(p,{family:'WoodWear',door:'Flat',d:6,y:.7,roof:'flat',loading:true});box(p,'loading deck',[4.8,.18,1.3],[0,.61,3.6]);for(const x of [-2,2])box(p,'deck stone pier',[.45,.73,.45],[x,.245,3.8],stone);steps(p,0,4.35,.7,1.6);record(p).structuralSeats.push({polygon:polygon(0,3.6,4.8,1.3),floor:.7,grade:-.12,open:true,supportPoints:[[-2,3.8],[2,3.8]]});await wagon(p,4.1,1.6);await crate(p,1.75,3.65,.7);
 p=root('facility-lumber','Open logging shelter','lumber','Low open shelter with reachable eaves, workbench and stacked cut timber.');await openShelter(p,0,0,{stock:true});await wagon(p,-4.0,1.8);await fence(p,3.5,-2.4);record(p).entrances.push({threshold:[0,-.12,1.5],forward:[0,0,1],clearWidth:2.4,clearDepth:2});
 p=root('facility-market','Three-stall market court','market','Separate timber stalls with muted cloth awnings and an open central approach.');
 for(const [x,z,color] of [[-3.5,-.8,'#6c7952'],[0,-2.5,'#a18458'],[3.5,-.8,'#8a5950']]){
  await part(p,'Roof_Wooden_2x1',[x,2.22,z]);
  for(const side of [-1,1])for(const front of [0,1.3]){const h=3.2-front*.72;box(p,'stall post',[.12,h+.12,.12],[x+side*.94,(h-.12)/2,z+front]);}
  box(p,'stall counter',[1.75,.15,.7],[x,.9,z+1.1]);box(p,'stall counter boards',[1.75,.88,.07],[x,.32,z+1.4]);
  box(p,'cloth awning',[2.2,.045,.65],[x,2.12,z+1.68],color,[.08,0,0]);box(p,'cloth valance',[2.2,.22,.035],[x,1.99,z+1.99],color);
  for(const offset of [-.52,0,.52]){box(p,'counter goods bin',[.42,.16,.35],[x+offset,1.05,z+1.1],straw);for(let j=0;j<3;j++)box(p,'produce',[.08,.09,.08],[x+offset+(j-1)*.1,1.17,z+1.1],'#73744b');}
  record(p).structuralSeats.push({polygon:polygon(x,z+.7,2,1.6),floor:-.12,grade:-.12,open:true});
 }
 await wagon(p,5.8,3.3);await crate(p,-5.6,-.5);await fence(p,-5.9,-3.0);record(p).entrances.push({threshold:[0,-.12,3.0],forward:[0,0,1],clearWidth:3,clearDepth:2});

 // Preserve accepted texture bytes; new source derivatives use the identical palette recipe.
 for(const m of doc.getRoot().listMaterials())m.setNormalTexture(null).setMetallicRoughnessTexture(null).setMetallicFactor(0).setRoughnessFactor(.92);
 await doc.transform(prune(),dedup());
 for(const t of doc.getRoot().listTextures()){
  const input=t.getImage(),known=knownTextures.get(hash(input));if(known){textureRecords.set(known.outputSha256,known);continue;}
  const size=/Roof|WoodTrim/.test(t.getName())?512:256,image=await sharp(input).resize(size,size,{fit:'inside'}).modulate({saturation:.68}).jpeg({quality:85,mozjpeg:true}).toBuffer(),info=await sharp(image).metadata();
  const r={sourceSha256:hash(input),outputSha256:hash(image),width:info.width,height:info.height,bytes:image.length,estimatedMipRGBA8Bytes:Math.ceil(info.width*info.height*4*4/3)};textureRecords.set(r.outputSha256,r);t.setImage(image).setMimeType('image/jpeg');
 }
 await doc.transform(dedup(),unpartition(),prune());
 for(const r of [...scene.listChildren()]){const batch=new Document(),bs=batch.createScene(),map=copyToDocument(batch,doc,[r]);bs.addChild(map.get(r));await batch.transform(flatten(),joinMeshes(),prune());const roots=bs.listChildren(),copied=copyToDocument(doc,batch,roots),wrapper=doc.createNode(r.getName());for(const n of roots)wrapper.addChild(copied.get(n));scene.removeChild(r);scene.addChild(wrapper);}
 await doc.transform(weld(),dedup(),unpartition(),prune());
 for(const r of scene.listChildren()){
  const e=record(r),b=getBounds(r),mats=new Set();let triangles=0;r.traverse(n=>{for(const prim of n.getMesh()?.listPrimitives()||[]){triangles+=(prim.getIndices()?.getCount()??prim.getAttribute('POSITION').getCount())/3;mats.add(prim.getMaterial());}});
  Object.assign(e,{boundsMin:b.min,boundsMax:b.max,dimensions:b.min.map((v,i)=>b.max[i]-v),triangles,materials:mats.size,overhangPolygon:[[b.min[0],b.min[2]],[b.max[0],b.min[2]],[b.max[0],b.max[2]],[b.min[0],b.max[2]]],fitPolicy:'Uniform 2.8 only; validate entire roof/yard and entrance against actual parcel before runtime use. Fallback on failure.'});
 }
 const bytes=await io.writeBinary(doc);await writeFile(out+'/catalog.glb',bytes);await writeFile(out+'/License_Source.txt',await readFile('docs/assets/wv-megakit/License_Source.txt'));
 await writeFile(out+'/manifest.json',JSON.stringify({schemaVersion:1,recipeRevision:1,status:'gallery-review',runtimeReady:false,units:'visual metres',gameUnitsPerMetre:2.8,archiveSha256:approved.archiveSha256,sourceLicenseSha256:approved.sourceLicenseSha256,approvedStudySha256:approved.output.sha256,output:{url:out+'/catalog.glb',bytes:bytes.length,sha256:hash(bytes)},entries,sources:names.map(n=>models.find(m=>m.name===n)),recipes,authoredGeometry:authored,authoredTextures,textures:[...textureRecords.values()],externalDependencies:[],preservedLegacyIdentity:'home-crooked-wing remains architecture-v1; no HOME_IDS or identity salt changes.'},null,2)+'\n');
 console.log(entries.map(({id,triangles,materials,dimensions})=>({id,triangles,materials,dimensions})),{bytes:bytes.length,textures:textureRecords.size,textureMemory:[...textureRecords.values()].reduce((n,t)=>n+t.estimatedMipRGBA8Bytes,0)});
}finally{await rm(temp,{recursive:true,force:true});}
