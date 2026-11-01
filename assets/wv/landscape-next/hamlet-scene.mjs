import * as T from '../../vendor/three.module.mjs';
import {buildSceneBatches,estimateSceneBytes} from '../../../scene-batches.mjs';
import {createResourceDisposer} from '../../../asset-registry.mjs';
import {createLandscapeLibrary} from './batches.mjs';
import {placeLandscape} from './placement.mjs';
import {createHamletProps} from './hamlet-props.mjs';
import {createHamletPlan,createHamletUseIndex,hamletHeight,displayedHamletHeight,polygonsOverlap,laneCorridors,rectangle,transformPoint,keyedUnit,pointInPolygon,lineDistance,METRES_TO_GAME as U} from './hamlet-plan.mjs';
const base=new URL('./',import.meta.url),CBASE=new URL('../buildings-next/',import.meta.url);
function grainAt(x,z){let h=Math.imul(x|0,374761393)^Math.imul(z|0,668265263);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;}
function smoothNoise(x,z){const ix=Math.floor(x),iz=Math.floor(z),a=x-ix,b=z-iz,u=a*a*(3-2*a),v=b*b*(3-2*b);return T.MathUtils.lerp(T.MathUtils.lerp(grainAt(ix,iz),grainAt(ix+1,iz),u),T.MathUtils.lerp(grainAt(ix,iz+1),grainAt(ix+1,iz+1),u),v);}
const color=hex=>new T.Color(hex),COLORS={meadow:color('#829166'),wood:color('#61774f'),lane:color('#ad9c7d'),approach:color('#ab9b7d'),path:color('#a59574'),yard:color('#8c8168'),work:color('#97866a'),garden:color('#869567'),field:color('#a39e66'),common:color('#91a16a'),holding:color('#8a986a'),seat:color('#677054')};
// Copies the published WV006-A preset values; no dependency on an unpublished source directory.
export const HAMLET_LIGHT={revision:'wv006-a-1',sun:'#fff4e5',intensity:2.1,sky:'#eaf0f3',ground:'#76745f',fill:1.8};
const coord=(x,z)=>[(x)*U,displayedHamletHeight(x,z)*U,z*U];
const gamePoint=(p,plan)=>({x:(p.x+plan.width/2)*U,z:(p.z+plan.depth/2)*U});
export function resolveHamlet(plan,entries){
 const catalog=new Map(entries.map(e=>[e.id,e]));
 const entities=[...plan.holdings,...plan.buildings].map(h=>{
  const e=catalog.get(h.assetId);if(!e)throw Error('Missing hamlet model '+h.assetId);
  const footprint=rectangle((e.boundsMin[0]+e.boundsMax[0])/2,(e.boundsMin[2]+e.boundsMax[2])/2,e.boundsMax[0]-e.boundsMin[0],e.boundsMax[2]-e.boundsMin[2]).map(p=>transformPoint(p,h.origin,h.yaw));
  const floor=Math.max(...footprint.map(p=>displayedHamletHeight(p.x,p.z))),threshold=transformPoint({x:e.entrances[0].threshold[0],z:e.entrances[0].threshold[2]},h.origin,h.yaw);
  const entranceExit=transformPoint({x:e.entrances[0].threshold[0],z:e.entrances[0].threshold[2]+(h.assetId==='home-porch-cabin'?1.6:.55)},h.origin,h.yaw);
  return{...h,entry:e,footprint,floor,threshold,entranceExit,modelOrigin:[h.origin.x*U,(floor+.12)*U,h.origin.z*U],scale:U};
 });
 const paths=plan.paths.filter(p=>!p.key.endsWith(':door')&&!p.key.endsWith(':access'));
 for(const b of entities.filter(e=>!e.key.startsWith('holding-')&&e.key!=='market')){const marker=b.entry.accessPoints?.find(a=>a.kind==='stair-foot'),start=marker?transformPoint({x:marker.threshold[0]-.4,z:marker.threshold[2]},b.origin,b.yaw):b.entranceExit;let best=null;for(const lane of plan.lanes)for(let i=1;i<lane.points.length;i++){const a=lane.points[i-1],c=lane.points[i],dx=c.x-a.x,dz=c.z-a.z,t=Math.max(0,Math.min(1,((start.x-a.x)*dx+(start.z-a.z)*dz)/(dx*dx+dz*dz)));const p={x:a.x+dx*t,z:a.z+dz*t},d=Math.hypot(p.x-start.x,p.z-start.z);if(!best||d<best.d)best={p,d};}paths.push({key:b.key+':access',kind:'approach',width:marker?1.3:2.4,points:[start,best.p]});}
 for(const h of entities.filter(e=>e.key.startsWith('holding-')))paths.push({key:h.key+':door',kind:'approach',width:1.15,points:[h.threshold,h.entranceExit,h.gate]});
 return{...plan,paths,entities,regions:[...plan.regions,...entities.map(e=>({key:e.key+':seat-tone',kind:'seat',polygon:e.footprint}))]};
}
function naturalTrees(plan){
 const candidates=[{key:'green-shade',x:(0+plan.width/2)*U,z:(26+plan.depth/2)*U,h:7.8*U},{key:'croft-shade',x:(-24+plan.width/2)*U,z:(-18+plan.depth/2)*U,h:7*U}];
 const patches=[{x:70,z:-28,n:18,rx:15,rz:32},{x:-73,z:-54,n:10,rx:13,rz:18},{x:63,z:65,n:11,rx:22,rz:12},{x:-66,z:53,n:9,rx:19,rz:13}];
 for(const [k,p] of patches.entries())for(let i=0;i<p.n;i++){const a=i*2.399,r=Math.sqrt((i+.5)/p.n),x=p.x+Math.cos(a)*p.rx*r,z=p.z+Math.sin(a)*p.rz*r;candidates.push({key:`retained-edge:${k}:${i}`,x:(x+plan.width/2)*U,z:(z+plan.depth/2)*U,h:(7+keyedUnit('edge-height'+i+k)*4)*U});}
 return candidates;
}
function landscapeRecords(plan,entries,quality,distance,treeCandidates=naturalTrees(plan)){
 const exclusions=[...plan.entities.map(e=>({kind:'structure',polygon:e.footprint.map(p=>gamePoint(p,plan)),radius:1.1*U})),...plan.regions.filter(r=>r.kind!=='meadow').map(r=>({kind:r.kind,polygon:r.polygon.map(p=>gamePoint(p,plan))})),...[...plan.lanes,...plan.paths].map(l=>({kind:l.kind,points:l.points.map(p=>gamePoint(p,plan)),radius:(l.width/2+.5)*U}))];
 const result=placeLandscape({seed:plan.seed,width:plan.width*U,depth:plan.depth*U,entries,quality,distance,treeCandidates,exclusions,
  sample:(x,z)=>{const xx=x/U-plan.width/2,zz=z/U-plan.depth/2;return{height:displayedHamletHeight(xx,zz)*U,water:null,slope:.04,moisture:zz>55?.75:.3};},
  coverRegions:[{key:'west-margins',kind:'woodland',bounds:{minX:5*U,minZ:10*U,maxX:29*U,maxZ:(plan.depth-12)*U}},{key:'east-margins',kind:'meadow',bounds:{minX:151*U,minZ:10*U,maxX:176*U,maxZ:(plan.depth-12)*U}}]});
 // Background woodland is a fixed source-distance tier, never a visibility filter.
 for(const r of result.instances)if(r.key.startsWith('tree:')&&(plan.stage===30||Math.hypot(r.origin[0],r.origin[2])>72*U))r.lod='far';
 return result;
}
function createGround(plan,index,trees,low){
 const width=low?448:896,height=Math.round(width*plan.depth/plan.width),data=new Uint8Array(width*height*4),c=new T.Color();
 // Contact tones are a static illustration treatment, independent of animated shadows.
 const bins=new Map();for(const t of trees){const x=t.origin[0]/U,z=t.origin[2]/U,key=Math.floor(x/10)+':'+Math.floor(z/10);if(!bins.has(key))bins.set(key,[]);bins.get(key).push({x,z,r:Math.min(3.2,(t.bounds.max[1]-t.bounds.min[1])/U*.3)});}
 for(let j=0;j<height;j++)for(let i=0;i<width;i++){
  const x=(i/(width-1)-.5)*plan.width*2.1,z=(j/(height-1)-.5)*plan.depth*2.1,land=index.query(x,z),noise=grainAt(Math.floor(x*5),Math.floor(z*5))*2-1,broad=smoothNoise(x*.08,z*.08)*2-1;
  c.copy(COLORS.meadow).lerp(COLORS.wood,Math.max(0,Math.min(.32,(Math.hypot(x,z)-47)/90)));
  if(land.kind!=='meadow')c.lerp(COLORS[land.kind]||COLORS.meadow,land.strength);
  const grain=land.kind==='garden'?.08:.035;c.multiplyScalar(.97+broad*.035+noise*grain);
  for(let bx=Math.floor(x/10)-1;bx<=Math.floor(x/10)+1;bx++)for(let bz=Math.floor(z/10)-1;bz<=Math.floor(z/10)+1;bz++)for(const t of bins.get(bx+':'+bz)||[]){const d=Math.hypot(x-t.x-.6,z-t.z+.3);if(d<t.r)c.multiplyScalar(1-.17*(1-d/t.r));}
  // Texture bytes are sRGB; Three converts once in the standard material.
  c.convertLinearToSRGB();const k=(j*width+i)*4;data[k]=Math.round(T.MathUtils.clamp(c.r,0,1)*255);data[k+1]=Math.round(T.MathUtils.clamp(c.g,0,1)*255);data[k+2]=Math.round(T.MathUtils.clamp(c.b,0,1)*255);data[k+3]=255;
 }
 const texture=new T.DataTexture(data,width,height,T.RGBAFormat);texture.colorSpace=T.SRGBColorSpace;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearFilter;texture.needsUpdate=true;texture.flipY=false;
 const nx=62,nz=56,g=new T.PlaneGeometry(plan.width*U*2.1,plan.depth*U*2.1,nx,nz);g.rotateX(-Math.PI/2);const p=g.attributes.position,uv=g.attributes.uv;
 for(let i=0;i<p.count;i++){const x=p.getX(i)/U,z=p.getZ(i)/U;p.setY(i,(hamletHeight(x,z)-.012)*U);uv.setXY(i,x/(plan.width*2.1)+.5,z/(plan.depth*2.1)+.5);}g.computeVertexNormals();
 const material=new T.MeshStandardMaterial({map:texture,roughness:1}),mesh=new T.Mesh(g,material);
 return{mesh,texture,geometry:g,material,dispose(){texture.dispose();g.dispose();material.dispose();}};
}
function decorativeProps(plan,quality,distance){
 const low=quality==='low',rows=[],fences=[],beds=[],add=(kind,key,p,yaw=0,scale=1)=>rows.push({kind,key,origin:coord(p.x,p.z),yaw,scale:[U*scale,U*scale,U*scale]});
 const blocked=(p,r=.4)=>[...plan.lanes,...plan.paths].some(l=>lineDistance(p,l.points)<l.width/2+r)||plan.entities.some(e=>pointInPolygon(p,e.footprint));
 function boundary(a,b,key,kind){const d=Math.hypot(b.x-a.x,b.z-a.z),n=Math.floor(d/2);for(let i=0;i<n;i++){if(low&&plan.stage===30&&i>0&&i<n-1)continue;const t=(i+.5)/n,p={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};if(blocked(p,1))continue;const yaw=Math.atan2(-(b.z-a.z),b.x-a.x);add(kind,key+':'+i,p,yaw);fences.push({key:key+':'+i,a:{x:p.x-Math.cos(yaw),z:p.z+Math.sin(yaw)},b:{x:p.x+Math.cos(yaw),z:p.z-Math.sin(yaw)}});}}
 for(const h of plan.holdings){
  // Rear and side fragments with actual approach gaps; not a fence on every edge.
  const poly=h.polygon;if(Number(h.key.slice(-2))%3!==0){boundary(poly[2],poly[3],h.key+':back',h.use==='orchard'?'fence-rail':'fence-wattle');boundary(poly[1],poly[2],h.key+':side','fence-rail');}
  const g=h.garden,local=q=>transformPoint(q,g.center,g.yaw);
  if(h.use==='orchard'){
   for(const [i,p] of [[-1.7,-1],[1.6,-1.2],[0,1.5]].entries()){const q=local({x:p[0],z:p[1]});if(!blocked(q,1.4))add('fruit-tree',h.key+':fruit:'+i,q,h.yaw,.85+keyedUnit(h.key+i)*.18);}
  }else if(h.use==='work-yard'){
   const q=local({x:-1.5,z:0});if(!blocked(q,.8))add('wood-stack',h.key+':fuel',q,h.yaw);add('barrel',h.key+':water',local({x:1.4,z:.4}));
  }else{
   for(let b=0;b<3;b++){
    const center=local({x:(b-1)*1.5,z:0}),poly=rectangle(center.x,center.z,1.05,g.depth-.4,g.yaw);beds.push({key:h.key+':bed:'+b,polygon:poly});
    if(distance==='far'||low&&plan.stage===30)continue;const step=low?(plan.stage===30?1.35:.95):.72;
    for(let z=-g.depth/2+.6;z<g.depth/2-.35;z+=step)for(const x of low?[0]:[-.22,.22]){const q=local({x:(b-1)*1.5+x,z});if(!blocked(q,.35))add(b===2?'garden-herbs':'garden-greens',h.key+':plant:'+b+':'+x+':'+z,q,h.yaw,.8+keyedUnit(h.key+z)*.25);}
   }
  }
 }
 for(const r of plan.regions.filter(r=>r.key==='paddock'||r.kind==='field')){for(let i=0;i<r.polygon.length;i++){if(i===0)continue;boundary(r.polygon[i],r.polygon[(i+1)%r.polygon.length],r.key+':boundary:'+i,'fence-rail');}}
 for(const f of plan.features)add(f.kind,f.key,f.origin,f.yaw);
 const people=[{x:-8,z:1},{x:1,z:5},{x:14,z:4},{x:-36,z:9},{x:24,z:18},{x:-52,z:-16}];for(const [i,p] of people.slice(0,plan.stage===4||low&&plan.stage===30?3:6).entries())add('person','reference-person:'+i,p,i*.9);
 if(plan.stage>=12){add('cart','smith-cart',{x:-47,z:30},.5);add('wood-stack','smith-fuel',{x:-51,z:24},1.1);add('barrel','market-barrel',{x:5,z:11},.2);}
 for(const [i,p] of [{x:-53,z:-25},{x:-43,z:-26}].entries())add('grain-sheaf','barn-sheaf:'+i,p,i);
 // Plant only the declared detached field. This has no crop output or ownership.
 if(distance!=='far'&&!(low&&plan.stage===30))for(let x=-75;x<-62;x+=low?2.9:1.8)for(let z=-39;z<-17;z+=low?2.8:1.6){const q={x:x+Math.sin(z)*.25,z};if(blocked(q,.4))continue;add('grain-sheaf','field:'+x+':'+z,q,0,.83);}
 return{records:rows,fences,beds};
}
function groundBedMesh(beds){
 const positions=[],colors=[],n=color('#726043');
 for(const bed of beds)for(let i=1;i<bed.polygon.length-1;i++)for(const p of [bed.polygon[0],bed.polygon[i],bed.polygon[i+1]]){positions.push(p.x*U,(displayedHamletHeight(p.x,p.z)+.025)*U,p.z*U);colors.push(...n.toArray());}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide}));
}
function footings(plan){
 const group=new T.Group(),material=new T.MeshStandardMaterial({color:'#8b8470',roughness:1}),parts=[];
 for(const e of plan.entities){
  if(e.entry.supportPoints?.length){for(const support of e.entry.supportPoints){const pt=support.contact||support.point,p=transformPoint({x:pt[0],z:pt[2]},e.origin,e.yaw),bottom=displayedHamletHeight(p.x,p.z)-.03,top=e.floor+.05,h=top-bottom;if(h<=0)continue;const geo=new T.CylinderGeometry(.15*U,.18*U,h*U,5).translate(p.x*U,(top+bottom)/2*U,p.z*U);parts.push(geo);}}
  else for(const s of e.entry.structuralSeats||[]){const xs=s.polygon.map(p=>p[0]),zs=s.polygon.map(p=>p[1]),cx=(Math.min(...xs)+Math.max(...xs))/2,cz=(Math.min(...zs)+Math.max(...zs))/2,p=transformPoint({x:cx,z:cz},e.origin,e.yaw),bottom=Math.min(...e.footprint.map(q=>displayedHamletHeight(q.x,q.z)))-.04,top=e.floor+.08;const geo=new T.BoxGeometry((Math.max(...xs)-Math.min(...xs))*U,(top-bottom)*U,(Math.max(...zs)-Math.min(...zs))*U).rotateY(e.yaw).translate(p.x*U,(top+bottom)/2*U,p.z*U);parts.push(geo);}
 }
 const g=new T.BufferGeometry();for(const name of ['position','normal']){const array=[];for(const part of parts){const p=part.index?part.toNonIndexed():part;array.push(...p.attributes[name].array);if(p!==part)p.dispose();}g.setAttribute(name,new T.Float32BufferAttribute(array,3));}for(const p of parts)p.dispose();group.add(new T.Mesh(g,material));return{group,dispose(){g.dispose();material.dispose();}};
}
export async function loadHamletLibrary(){
 const loader=new T.GLTFLoader(),disposeResources=createResourceDisposer();
 const loading=[fetch(new URL('manifest.json',CBASE)).then(r=>{if(!r.ok)throw Error('Building catalog unavailable');return r.json();}),fetch(new URL('manifest.json',base)).then(r=>{if(!r.ok)throw Error('Landscape manifest unavailable');return r.json();}),loader.loadAsync(new URL('catalog.glb',CBASE).href),loader.loadAsync(new URL('landscape.glb',base).href)];let loaded;try{loaded=await Promise.all(loading);}catch(error){void Promise.allSettled(loading).then(results=>{for(const r of results)if(r.status==='fulfilled'&&r.value?.scene)disposeResources(r.value.scene);});throw error;}const [architecture,landscape,buildingGLTF,natureGLTF]=loaded;
 const finalPlan=resolveHamlet(createHamletPlan({stage:30}),architecture.entries),reservedKeys=new Set(landscapeRecords(finalPlan,landscape.entries,'normal','far').instances.map(r=>r.key)),inheritedTrees=naturalTrees(finalPlan).filter(t=>reservedKeys.has('tree:'+t.key));
 const landscapeLibrary=createLandscapeLibrary(natureGLTF.scene),propsNormal=createHamletProps(),propsLow=createHamletProps({low:true});let disposed=false;
 return{architecture,build({stage=12,quality='normal',distance='near'}={}){
  if(disposed)throw Error('Hamlet library disposed');
  const plan=resolveHamlet(createHamletPlan({stage}),architecture.entries),index=createHamletUseIndex(plan),group=new T.Group(),objects=[];
  for(const e of plan.entities){const source=buildingGLTF.scene.getObjectByName(quality==='low'||distance==='far'||stage===30?e.entry.lowNode:e.entry.normalNode);if(!source)throw Error('Missing model '+e.assetId);const model=source.clone(true);model.position.set(...e.modelOrigin);model.rotation.y=e.yaw;model.scale.setScalar(U);objects.push({scene:model,entityKey:e.key});}
  const buildingBatches=buildSceneBatches(objects);for(const b of buildingBatches)group.add(b);
  const nature=landscapeRecords(plan,landscape.entries,quality,distance,inheritedTrees),natureBatches=landscapeLibrary.build(nature.instances);group.add(natureBatches.group);
  const dressing=decorativeProps(plan,quality,distance),propLibrary=quality==='low'?propsLow:propsNormal,propBatches=propLibrary.build(dressing.records);group.add(propBatches.group);
  const beds=groundBedMesh(dressing.beds);group.add(beds);const feet=footings(plan);group.add(feet.group);
  const ground=createGround(plan,index,nature.instances.filter(r=>r.key.startsWith('tree:')),quality==='low');group.add(ground.mesh);
  let released=false;
  return{group,plan,nature:nature.instances,groundMesh:ground.mesh,props:dressing.records,sourceMeasurements:()=>propLibrary.measurements(),
   stats:()=>({stage,homes:plan.holdings.length,workplaces:plan.buildings.length,lanes:plan.lanes.length,landUseRegions:plan.regions.length,plantAndPropInstances:dressing.records.length,landscapeInstances:nature.instances.length,landscapeBatches:natureBatches.group.children.length,propBatches:propBatches.group.children.length,surfaceTextureBytes:ground.texture.image.data.byteLength,architectureLOD:quality==='low'||distance==='far'||stage===30?'low':'normal',runtimeReady:false,...estimateSceneBytes(group)}),
   inspectGround(){group.updateMatrixWorld(true);const ray=new T.Raycaster(),issues=[];for(const r of new Map(nature.instances.map(r=>[r.assetId,r])).values())for(const p of r.groundContact.points){ray.set(new T.Vector3(p.x-plan.width*U/2,p.height+150,p.z-plan.depth*U/2),new T.Vector3(0,-1,0));const hit=ray.intersectObject(ground.mesh,false)[0];if(!hit||Math.abs(hit.point.y-p.height)>.002)issues.push({key:r.key,error:hit?hit.point.y-p.height:null});}for(const r of new Map(dressing.records.map(r=>[r.kind,r])).values()){ray.set(new T.Vector3(r.origin[0],r.origin[1]+150,r.origin[2]),new T.Vector3(0,-1,0));const hit=ray.intersectObject(ground.mesh,false)[0];if(!hit||Math.abs(hit.point.y-r.origin[1])>.002)issues.push({key:r.key,error:hit?hit.point.y-r.origin[1]:null});}return issues;},
   inspect(){const issues=[];for(let i=0;i<plan.entities.length;i++){const e=plan.entities[i];for(const b of plan.entities.slice(i+1))if(polygonsOverlap(e.footprint,b.footprint,.01))issues.push({key:e.key,type:'roof-overlap',other:b.key});for(const l of plan.lanes)if(laneCorridors(l).some(poly=>polygonsOverlap(e.footprint,poly,.01)))issues.push({key:e.key,type:'lane-overlap',lane:l.key});}for(const f of dressing.fences){for(const l of [...plan.lanes,...plan.paths])if([f.a,f.b].some(p=>lineDistance(p,l.points)<l.width/2))issues.push({key:f.key,type:'blocked-route',route:l.key});}return issues;},
   dispose(){if(released)return;released=true;group.removeFromParent();for(const b of buildingBatches)b.dispose();natureBatches.dispose();propBatches.dispose();beds.geometry.dispose();beds.material.dispose();feet.dispose();ground.dispose();group.clear();}}
 },dispose(){if(disposed)return;disposed=true;landscapeLibrary.dispose();propsNormal.dispose();propsLow.dispose();disposeResources(buildingGLTF.scene);}};
}
