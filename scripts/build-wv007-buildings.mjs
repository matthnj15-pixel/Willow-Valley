// Derive only from the frozen checkpoints. Never run another producer's generator.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Document, NodeIO} from '@gltf-transform/core';
import {copyToDocument, dedup, prune, weld, unpartition, getBounds} from '@gltf-transform/functions';
import {Matrix4, Vector3} from 'three';
import validator from 'gltf-validator';

const dir='assets/wv/runtime-buildings-v1', io=new NodeIO();
const hash=b=>createHash('sha256').update(b).digest('hex');
const selection=JSON.parse(await readFile('render-adoption/selection.json'));
await mkdir(dir,{recursive:true});
const pins=[];
for(const path of ['scripts/build-wv007-buildings.mjs','package-lock.json'])pins.push({path,sha256:hash(await readFile(path))});
for(const key of ['buildings','storage']) for(const field of ['manifest','bundle']) {
 const s=selection.sources[key], bytes=await readFile(s[field]);
 if(hash(bytes)!==s[field+'Sha256']) throw Error('Frozen source changed: '+s[field]);
 pins.push({path:s[field],sha256:hash(bytes)});
}

// Assign entire connected pieces, rather than individual vertices, to semantic
// anchors. This keeps each tree crown/bench/stall rigid on undulating terrain.
function partition(d,root,e){
 const kit=e.kitInstances||[],wagon=kit.find(i=>i.assetId==='Prop_Wagon');
 for(const instance of kit){
  const ground=instance.groundContacts?.some(p=>Math.abs(p[1]+.12)<.02);
  if(!ground&&!instance.supportPlane)continue;
  const seat=instance.supportPlane&&wagon?wagon:instance;
  const anchor=[(seat.boundsMin[0]+seat.boundsMax[0])/2,-.12,(seat.boundsMin[2]+seat.boundsMax[2])/2];
  root.traverse(n=>{if(n.getMesh()&&n.getName().startsWith(instance.node+'-'))n.setExtras({...n.getExtras(),runtimeSeat:{kind:'rigid',anchor,category:instance.assetId,group:seat.node}});});
 }
 const c=e.civic;if(!c)return;
 const anchors={
  furniture:(c.seats||[]).map(s=>[s.center[0],-.12,s.center[2]]),
  planting:(c.landscapeInstances||[]).map(s=>s.position),
  foliage:(c.landscapeInstances||[]).map(s=>s.position),
  garden:(c.groundContacts||[]),
  stage:(c.activityZones||[]).filter(s=>s.kind==='stage').map(s=>{const p=s.polygon;return [(p[0][0]+p[2][0])/2,-.12,(p[0][1]+p[2][1])/2];}),
  fountain:[[0,-.12,0]],
  stalls:(c.stalls||[]).filter(s=>s.kind!=='delivery-wagon').map(s=>s.center),
  roof:(c.stalls||[]).filter(s=>s.covered).map(s=>s.center),
  goods:(c.stalls||[]).filter(s=>s.kind!=='delivery-wagon').map(s=>s.center)
 };
 const nodes=[];root.traverse(n=>{if(n.getMesh())nodes.push(n);});
 for(const node of nodes){
  const category=node.getExtras().category, aa=anchors[category];
  if(category?.startsWith('surface-')){node.setExtras({...node.getExtras(),runtimeSeat:{kind:'surface'}});continue;}
  if(!aa?.length)continue;
  const mesh=node.getMesh(),groups=new Map(),matrix=new Matrix4().fromArray(node.getWorldMatrix());
  for(const p of mesh.listPrimitives()){
   const pos=p.getAttribute('POSITION'),ix=p.getIndices(),count=ix?.getCount()??pos.getCount(),parent=new Map();
   const key=i=>pos.getElement(i,[]).map(v=>v.toFixed(5)).join(',');
   const find=k=>{if(!parent.has(k))parent.set(k,k);if(parent.get(k)!==k)parent.set(k,find(parent.get(k)));return parent.get(k);};
   const triangles=[];
   for(let i=0;i<count;i+=3){const ids=[0,1,2].map(j=>ix?ix.getScalar(i+j):i+j),kk=ids.map(key);parent.set(find(kk[1]),find(kk[0]));parent.set(find(kk[2]),find(kk[0]));triangles.push(ids);}
   const pieces=new Map();for(const tri of triangles){const k=find(key(tri[0]));if(!pieces.has(k))pieces.set(k,[]);pieces.get(k).push(tri);}
   const indices=new Map();for(const tris of pieces.values()){
    const points=tris.flat().map(i=>new Vector3(...pos.getElement(i,[])).applyMatrix4(matrix));
    const center=points.reduce((v,p)=>v.add(p),new Vector3()).divideScalar(points.length);
    let anchor=0,best=Infinity;aa.forEach((a,i)=>{const distance=(center.x-a[0])**2+(center.z-a[2])**2;if(distance<best){best=distance;anchor=i;}});
    if(!indices.has(anchor))indices.set(anchor,[]);indices.get(anchor).push(...tris.flat());
   }
   for(const [i,list] of indices){
    if(!groups.has(i))groups.set(i,d.createMesh());
    const primitive=p.clone().setIndices(d.createAccessor().setType('SCALAR').setBuffer(d.getRoot().listBuffers()[0]).setArray(new Uint32Array(list)));
    groups.get(i).addPrimitive(primitive);
   }
  }
  const parentNode=node.getParentNode()||root;
  for(const [i,mesh] of groups){const n=d.createNode(node.getName()+'-seat-'+i).setMesh(mesh).setTranslation(node.getTranslation()).setRotation(node.getRotation()).setScale(node.getScale());
   n.setExtras({...node.getExtras(),runtimeSeat:{kind:'rigid',anchor:aa[i],category,group:category+'-'+i}});parentNode.addChild(n);
  }
  node.setMesh(null);
 }
}
function measure(root){const b=getBounds(root);let triangles=0,primitives=0;root.traverse(n=>{for(const p of n.getMesh()?.listPrimitives()||[]){triangles+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;primitives++;}});return {boundsMin:b.min,boundsMax:b.max,triangles,primitives};}
function structuralVertices(root){const points=[];root.traverse(n=>{if(n.getExtras().optional)return;const matrix=new Matrix4().fromArray(n.getWorldMatrix());for(const p of n.getMesh()?.listPrimitives()||[]){const a=p.getAttribute('POSITION'),ix=p.getIndices(),indices=ix?new Set(ix.getArray()):Array.from({length:a.getCount()},(_,i)=>i);for(const i of indices)points.push(new Vector3(...a.getElement(i,[])).applyMatrix4(matrix).toArray());}});return points;}
function sampledError(from,to){let sum=0,max=0,count=0;const stride=Math.max(1,Math.ceil(from.length/512));for(let i=0;i<from.length;i+=stride){const p=from[i];let best=Infinity;for(const q of to){const distance=(p[0]-q[0])**2+(p[1]-q[1])**2+(p[2]-q[2])**2;if(distance<best)best=distance;if(best<1e-14)break;}sum+=best;max=Math.max(max,best);count++;}return {samples:count,maxMetres:Math.sqrt(max),rmsMetres:Math.sqrt(sum/count)};}
const manifest={schemaVersion:1,revision:'wv007-p1-1',contractRevision:1,gameUnitsPerMetre:2.8,sourcePins:pins,externalDependencies:[],cameraPolicy:{distanceGameUnits:280,cullGameUnits:1000,hysteresisGameUnits:24,rule:'requested quality near; distance uses C4 low with optional goods/dressing removed; never settlement count'},bundles:[],entries:[]};
for(const family of ['C4','D']){
 const pin=selection.sources[family==='C4'?'buildings':'storage'],sourceManifest=JSON.parse(await readFile(pin.manifest)),source=await io.read(pin.bundle);
 for(const quality of family==='C4'?['normal','low','distance']:['normal','low']){
  const d=new Document(),scene=d.createScene(family+'-'+quality);d.getRoot().setDefaultScene(scene);
  const sourceQuality=quality==='normal'?'normal':'low', records=[];
  for(const e of sourceManifest.entries){
   if(family==='C4'&&!selection.architecture.entryIds.includes(e.id)||family==='D'&&e.quality!==quality)continue;
   const sourceNode=family==='C4'?e[sourceQuality+'Node']:e.node;
   const node=source.getRoot().getDefaultScene().listChildren().find(n=>n.getName()===sourceNode);if(!node)throw Error('Missing explicit root '+sourceNode);
   const copy=copyToDocument(d,source,[node]),root=copy.get(node);scene.addChild(root);
   const before=measure(root);let omittedTriangles=0;
   if(quality==='distance')root.traverse(n=>{if(n.getExtras().optional&&n.getMesh()){omittedTriangles+=measure(n).triangles;n.setMesh(null);}});
   if(family==='C4')partition(d,root,e);
   const stats=measure(root),optional=[];root.traverse(n=>{if(n.getExtras().optional&&n.getMesh()){optional.push([n,n.getMesh()]);n.setMesh(null);}});
   const compact=measure(root);for(const [n,m] of optional)n.setMesh(m);
   const integral=[];root.traverse(n=>{if(n.getMesh())integral.push({sourceNode:n.getName(),...getBounds(n),...n.getExtras()});});
   const normal=family==='C4'?source.getRoot().getDefaultScene().listChildren().find(n=>n.getName()===e.normalNode):node,normalVertices=structuralVertices(normal),derivativeVertices=structuralVertices(root);
   records.push({family,id:e.id,quality,sourceQuality,sourceNode,node:root.getName(),...stats,compact,integral,error:{retainedVertexDisplacementMetres:0,relativeTo:sourceNode,normalReference:{method:'deterministic sampled nearest structural vertex; not surface Hausdorff or pixel error',normalToDerivative:sampledError(normalVertices,derivativeVertices),derivativeToNormal:sampledError(derivativeVertices,normalVertices)},omittedOptionalTriangles:omittedTriangles,boundsDeltaMetres:Math.max(...before.boundsMin.map((v,i)=>Math.abs(v-stats.boundsMin[i])),...before.boundsMax.map((v,i)=>Math.abs(v-stats.boundsMax[i])))},metadata:e});
  }
  if(sourceQuality==='low')for(const material of d.getRoot().listMaterials()) material.setNormalTexture(null).setMetallicRoughnessTexture(null).setOcclusionTexture(null);
  await d.transform(weld(),dedup(),unpartition(),prune());
  const bytes=await io.writeBinary(d),file=family.toLowerCase()+'-'+quality+'.glb',result=await validator.validateBytes(bytes,{uri:file});
  if(result.issues.numErrors)throw Error(JSON.stringify(result.issues));
  const textures=d.getRoot().listTextures().map(t=>({name:t.getName(),sha256:hash(t.getImage()),bytes:t.getImage().length,dimensions:t.getSize(),estimatedDecodedMipBytes:Math.ceil(t.getSize()[0]*t.getSize()[1]*16/3)}));
  await writeFile(dir+'/'+file,bytes);
  const bundle={family,quality,url:dir+'/'+file,sha256:hash(bytes),bytes:bytes.length,textures,estimatedDecodedMipBytes:textures.reduce((n,t)=>n+t.estimatedDecodedMipBytes,0),validation:{errors:result.issues.numErrors,warnings:result.issues.numWarnings,messages:result.issues.messages}};
  manifest.bundles.push(bundle);manifest.entries.push(...records.map(r=>({...r,bundle:bundle.url})));
 }
}
// A camera-only LOD switch must not change site admission or P3 occupancy.
for(const e of manifest.entries.filter(e=>e.family==='C4')){
 const variants=manifest.entries.filter(v=>v.family==='C4'&&v.id===e.id);
 for(const [field,source] of [['admission',null],['compactAdmission','compact']])e[field]={boundsMin:[0,1,2].map(i=>Math.min(...variants.map(v=>(source?v[source]:v).boundsMin[i]))),boundsMax:[0,1,2].map(i=>Math.max(...variants.map(v=>(source?v[source]:v).boundsMax[i])))};
}
for(const path of ['assets/wv/buildings-next/License_Source.txt','assets/wv/buildings-next/License_Kit_Source.txt','assets/wv/storage-next/LICENSE.txt']){
 const bytes=await readFile(path),name=path.split('/').slice(-2).join('-');await writeFile(dir+'/'+name,bytes);pins.push({path,sha256:hash(bytes)});
}
await writeFile(dir+'/.gitattributes','*-License*.txt -text -whitespace\n');
await writeFile(dir+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest.bundles.map(({family,quality,bytes,estimatedDecodedMipBytes,validation})=>({family,quality,bytes,estimatedDecodedMipBytes,errors:validation.errors,warnings:validation.warnings})),null,2));
