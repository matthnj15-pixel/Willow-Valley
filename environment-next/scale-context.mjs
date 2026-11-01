import * as T from '../assets/vendor/three.module.mjs';
import {createResourceDisposer} from '../asset-registry.mjs';
// Unchanged committed catalog, common scale, never a simulation settlement.
export async function loadScaleContext(scene,getSurface,center){
 const results=await Promise.allSettled([new T.GLTFLoader().loadAsync(new URL('../assets/wv/megakit-catalog-v1/catalog.glb',import.meta.url).href),fetch(new URL('../assets/wv/megakit-catalog-v1/manifest.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Context manifest unavailable');return r.json();})]);
 const disposeModel=createResourceDisposer();
 if(results.some(r=>r.status==='rejected')){if(results[0].status==='fulfilled')disposeModel(results[0].value.scene);throw Error('Context resources unavailable');}
 const model=results[0].value,manifest=results[1].value,group=new T.Group(),world=getSurface(),envelopes=[],visualInputs=[];
 const ids=['home-steep-gable','home-long-ridge','home-low-hip','home-porch-cabin','home-offset-gables','market'];
 const positions=[];
 for(let z=center.y-65;z<=center.y+65;z+=26)for(let x=center.x-65;x<=center.x+65;x+=26){const q=world.sample(x,z);if(q.water===null&&world.slope(x,z)<.18)positions.push({x,z,height:q.height});}
 for(const [i,id] of ids.entries()){
  const source=model.scene.getObjectByName(id)||model.scene.getObjectByName('facility-'+id),p=positions[i];if(!source||!p)continue;
  const mesh=source.clone(true);mesh.scale.setScalar(2.8);const box=new T.Box3().setFromObject(mesh);mesh.position.set(p.x-world.width/2,p.height-box.min.y,p.z-world.depth/2);group.add(mesh);mesh.updateMatrixWorld(true);envelopes.push(new T.Box3().setFromObject(mesh));
  const entry=manifest.entries.find(e=>e.id===source.name),door=entry?.entrances?.[0];
  if(door&&entry.overhangPolygon){const point=(a,b)=>({x:p.x+a*2.8,z:p.z+b*2.8}),from=point(door.threshold[0],door.threshold[2]),to=point(door.threshold[0]+door.forward[0]*door.clearDepth,door.threshold[2]+door.forward[2]*door.clearDepth);visualInputs.push({envelope:entry.overhangPolygon.map(v=>point(...v)),path:[from,to],radius:Math.max(2,door.clearWidth*2.8),strength:.7});}
 }
 // Original material witness set includes cloth and water; no global material recoloring.
 const colors=['#d6c5a5','#765741','#81503d','#a58b5b','#81796a','#8c5549','#4a829a'];
 for(const [i,color] of colors.entries()){const p=positions[0]||{x:center.x,z:center.y,height:world.sample(center.x,center.y).height},g=new T.BoxGeometry(3,4.9,3),m=new T.MeshStandardMaterial({color,roughness:1,metalness:0}),mesh=new T.Mesh(g,m);mesh.position.set(p.x-world.width/2+i*5,p.height+2.45,p.z-world.depth/2+17);group.add(mesh);}
 scene.add(group);let disposed=false;return{envelopes,visualInputs,dispose(){if(disposed)return;disposed=true;group.removeFromParent();disposeModel(group);disposeModel(model.scene);}};
}
