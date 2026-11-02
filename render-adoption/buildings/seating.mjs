import * as T from '../../assets/vendor/three.module.mjs';
import {SCALE,transformLocal,rectangle} from './placement.mjs';

// Terrain surfaces are clipped against displayed triangles. All vertex channels
// are interpolated within their ORIGINAL source triangle, preserving atlas UVs.
export function drapeMesh(mesh,entity,placement,surface){
 mesh.updateWorldMatrix(true,false);const inverse=mesh.matrixWorld.clone().invert(),g=mesh.geometry,position=g.attributes.position,ix=g.index,arrays={};
 for(const name of Object.keys(g.attributes))arrays[name]=[];
 for(let i=0;i<(ix?.count??position.count);i+=3){
  const ids=[0,1,2].map(j=>ix?ix.getX(i+j):i+j),world=ids.map(j=>new T.Vector3().fromBufferAttribute(position,j).applyMatrix4(mesh.matrixWorld)),p=world.map(v=>({x:v.x+surface.width/2,y:v.z+surface.depth/2}));
  const den=(p[1].y-p[2].y)*(p[0].x-p[2].x)+(p[2].x-p[1].x)*(p[0].y-p[2].y);if(Math.abs(den)<1e-9)continue;
  const triangles=surface.drapePolygon(p);
  for(const tri of triangles)for(const q of tri){
   const a=((p[1].y-p[2].y)*(q.x-p[2].x)+(p[2].x-p[1].x)*(q.y-p[2].y))/den,b=((p[2].y-p[0].y)*(q.x-p[2].x)+(p[0].x-p[2].x)*(q.y-p[2].y))/den,weights=[a,b,1-a-b];
   for(const [name,attribute] of Object.entries(g.attributes)){
    if(name==='position'){const offset=world.reduce((n,v,j)=>n+v.y*weights[j],0)-(placement.originY-.12*SCALE);const local=new T.Vector3(q.x-surface.width/2,surface.sample(q.x,q.y).height+offset,q.y-surface.depth/2).applyMatrix4(inverse);arrays[name].push(...local.toArray());}
    else for(let k=0;k<attribute.itemSize;k++)arrays[name].push(ids.reduce((n,id,j)=>n+attribute.getComponent(id,k)*weights[j],0));
   }
  }
 }
 const next=new T.BufferGeometry();for(const [name,a] of Object.entries(arrays))next.setAttribute(name,new T.Float32BufferAttribute(a,g.attributes[name].itemSize));next.computeVertexNormals();mesh.geometry=next;return next;
}
export function seatModel(root,entity,placement,entry,surface,foundationMaterial){
 const owned=[],integral=[],rigidSeats=new Map();root.updateMatrixWorld(true);
 const sourceRoot=root.children[0];
 sourceRoot.traverse(n=>{
  if(!n.isMesh)return;
  if(placement.mode==='compact'&&n.userData.optional){n.visible=false;return;}
  const seat=n.userData.runtimeSeat;
  if(seat?.kind==='surface'){
   if(!surface.drapePolygon)throw Error('Displayed terrain drapePolygon required for civic surfaces');
   owned.push(drapeMesh(n,entity,placement,surface));
  }else if(seat?.kind==='rigid'){
   const key=JSON.stringify(seat.anchor),p=transformLocal([seat.anchor[0],seat.anchor[2]],entity);
   // All categories at the same semantic anchor (trunk/crown, stall/canopy)
   // share one rigid datum. Feet alone extend to their individual contacts.
   const contacts=(entry.metadata.civic?.groundContacts||[]).filter(c=>Math.hypot(c[0]-seat.anchor[0],c[2]-seat.anchor[2])<2.2).map(c=>({local:c,p:transformLocal([c[0],c[2]],entity)}));
   const height=Math.max(surface.sample(p.x,p.y).height,...contacts.map(c=>surface.sample(c.p.x,c.p.y).height)),delta=height-(placement.originY+seat.anchor[1]*SCALE);
   if(!rigidSeats.has(key))rigidSeats.set(key,{contacts,height});
   n.parent.updateWorldMatrix(true,false);const inv=n.parent.matrixWorld.clone().invert(),a=new T.Vector3(0,delta,0).applyMatrix4(inv),b=new T.Vector3().applyMatrix4(inv);n.position.add(a.sub(b));
  }
 });
 for(const {contacts,height} of rigidSeats.values())for(const c of contacts){
  const terrainY=surface.sample(c.p.x,c.p.y).height;
  if(!placement.supportContacts.some(s=>Math.hypot(s.worldGame.x-c.p.x,s.worldGame.y-c.p.y)<.01))placement.supportContacts.push({worldGame:{...c.p,height:terrainY},centeredMetres:{x:(c.p.x-surface.width/2)/SCALE,z:(c.p.y-surface.depth/2)/SCALE,y:terrainY/SCALE},topGameY:height,extensionGameUnits:height-terrainY,widthMetres:.16,kind:'civic-independent-foot'});
 }
 // Continuous foundations are confined to structural seats. Never fill the
 // granary undercroft or turn a park planning envelope into a solid platform.
 if(!entry.metadata.groundSpace&&!entry.metadata.undercroft){
  const positions=[],inverse=root.matrixWorld.clone().invert(),top=placement.originY+(entry.metadata.groundDatum??-.12)*SCALE;
  for(const seat of entry.metadata.structuralSeats||[]){const polygon=seat.polygon.map(p=>transformLocal(p,entity));for(let i=0;i<polygon.length;i++){
   const a=polygon[i],b=polygon[(i+1)%polygon.length],trace=surface.contactTrace?.(a,b)||[a,b];
   for(let j=1;j<trace.length;j++){const p=trace[j-1],q=trace[j],vertices=[[p.x,top,p.y],[q.x,top,q.y],[q.x,surface.sample(q.x,q.y).height-.02,q.y],[p.x,surface.sample(p.x,p.y).height-.02,p.y]];
    for(const k of [0,1,2,0,2,3])positions.push(...new T.Vector3(vertices[k][0]-surface.width/2,vertices[k][1],vertices[k][2]-surface.depth/2).applyMatrix4(inverse).toArray());
   }
  }}
  if(positions.length){const geometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.userData.p1Foundation=true;geometry.computeVertexNormals();const mesh=new T.Mesh(geometry,foundationMaterial);root.add(mesh);owned.push(geometry);}
 }
 root.updateMatrixWorld(true);
 // All embedded objects (including shutters, planting, fences and wagon cargo)
 // are explicit P3 blockers, in addition to the full site envelope.
 sourceRoot.traverseVisible(n=>{if(!n.isMesh)return;const box=new T.Box3().setFromObject(n),polygon=rectangle([box.min.x,box.min.z],[box.max.x,box.max.z]);integral.push({sourceNode:n.name,kind:n.userData.kitAsset||n.userData.runtimeSeat?.category||n.userData.category||'structure',worldGame:polygon.map(([x,z])=>({x:x+surface.width/2,y:z+surface.depth/2})),centeredMetres:polygon.map(([x,z])=>({x:x/SCALE,z:z/SCALE})),minGameY:box.min.y,maxGameY:box.max.y});});
 // Stable occupancy comes from the canonical all-LOD union. Rendered contacts
 // are separate diagnostics; a distant omission never frees land for P3 props.
 placement.renderedIntegralContacts=integral;
 return owned;
}
