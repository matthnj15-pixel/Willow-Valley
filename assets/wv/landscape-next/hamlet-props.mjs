// Original opaque review props. One shared vertex-color material; no textures.
import * as T from '../../vendor/three.module.mjs';
export function createHamletProps({low=false}={}) {
 const material=new T.MeshStandardMaterial({vertexColors:true,roughness:1}),geometries=new Map();
 function make(kind){
  const parts=[];
  const add=(g,color)=>{const c=new T.Color(color),n=g.index?g.toNonIndexed():g;if(n!==g)g.dispose();n.setAttribute('color',new T.Float32BufferAttribute(Array.from({length:n.attributes.position.count},()=>c.toArray()).flat(),3));parts.push(n);};
  const box=(w,h,d,x,y,z,color='#765741',yaw=0)=>add(new T.BoxGeometry(w,h,d).rotateY(yaw).translate(x,y,z),color);
  const blob=(x,y,z,rx,ry,rz,color)=>add(new T.IcosahedronGeometry(1,0).scale(rx,ry,rz).translate(x,y,z),color);
  const pole=(a,b,r=.035,color='#796347',sides=5)=>{const v=new T.Vector3(...a),to=new T.Vector3(...b),delta=to.clone().sub(v),g=new T.CylinderGeometry(r*.82,r,delta.length(),sides);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));g.translate(...v.add(to).multiplyScalar(.5).toArray());add(g,color);};
  if(kind==='fence-rail'||kind==='fence-wattle'){
   for(const x of [-1,1])box(.09,.9,.09,x,.45,0,'#77674e');
   if(kind==='fence-rail'){for(const y of (low?[.62]:[.32,.72]))box(2,.065,.065,0,y,0,'#918266');}
   else{for(let j=0;j<(low?2:5);j++)box(2,.055,.045,0,.17+j*(low?.38:.15),j%2?.025:-.025,'#8d7956');if(!low)for(const x of [-.55,0,.55])pole([x,.05,0],[x,.87,0],.018,'#796347',3);}
  }else if(kind==='garden-greens'){
   for(let i=0;i<(low?1:2);i++){const a=i*2.4;blob(Math.sin(a)*.1,.12+i%2*.025,Math.cos(a)*.1,.18,.14,.17,i%2?'#71844d':'#536f41');}
  }else if(kind==='garden-herbs'){
   for(let i=0;i<(low?2:3);i++){const a=i*2.4,x=Math.sin(a)*.12,z=Math.cos(a)*.12;pole([x,0,z],[x,.32+(i%2)*.1,z],.014,'#657748',3);blob(x,.24,z,.075,.14,.075,i%2?'#87935d':'#5e7749');}
  }else if(kind==='grain-sheaf'){
   for(let i=0;i<(low?2:3);i++){const a=i*2.4;pole([Math.sin(a)*.10,0,Math.cos(a)*.10],[Math.sin(a)*.13,.7+i%2*.09,Math.cos(a)*.13],.021,'#a89f69',3);add(new T.ConeGeometry(.055,.19,3).translate(Math.sin(a)*.13,.73,Math.cos(a)*.13),'#b2aa78');}
  }else if(kind==='fruit-tree'){
   pole([0,0,0],[.05,2.6,0],.10,'#66543e',low?5:7);
   for(let i=0;i<(low?3:5);i++){const a=i*2.4,x=Math.sin(a)*.65,z=Math.cos(a)*.65;pole([0,1.1,0],[x,2.2,z],.055,'#66543e');blob(x,2.65+i%2*.2,z,.92,.8,.85,i%2?'#789257':'#5d824e');if(!low)add(new T.OctahedronGeometry(.08).translate(x+.34,2.4,z+.3),'#b39b61');}
  }else if(kind==='wood-stack'){
   for(let i=0;i<(low?2:5);i++){const y=i<4?.13:.37,z=i<4?(i-1.5)*.24:(i-5)*.24;pole([-1,y,z],[1,y,z],.12,'#7a6249',6);pole([1,y,z],[1.008,y,z],.09,'#ac936d',6);}
  }else if(kind==='bench'){
   box(1.65,.12,.42,0,.48,0,'#938164');for(const x of [-.6,.6]){box(.13,.44,.34,x,.22,0);pole([x,.48,.13],[x,.96,.18],.035);}box(1.65,.25,.07,0,.82,.18,'#8b7758');
  }else if(kind==='well'){
   for(let i=0;i<12;i++){const a=i*Math.PI/6;box(.38,.58,.24,Math.sin(a)*.68,.29,Math.cos(a)*.68,i%2?'#9b9380':'#847c6a',a);}
   for(const x of [-.9,.9])box(.12,1.85,.12,x,.925,0);pole([-.94,1.33,0],[.94,1.33,0],.07);
   for(const s of [-1,1])add(new T.BoxGeometry(1.2,.10,2.1).rotateZ(-s*.48).translate(s*.49,1.92,0),'#887351');box(.10,2,.10,0,1,0,'#6a5943');
  }else if(kind==='cart'){
   box(1.1,.10,1.7,0,.48,0);for(const x of [-.55,.55])box(.07,.4,1.7,x,.72,0,'#8b7659');box(1.1,.4,.07,0,.72,-.85,'#8b7659');for(const x of [-.66,.66])add(new T.TorusGeometry(.37,.045,4,low?8:12).rotateY(Math.PI/2).translate(x,.37,0),'#695845');for(const x of [-.4,.4])pole([x,.45,.4],[x,.5,2.2],.045);
  }else if(kind==='barrel'){
   add(new T.CylinderGeometry(.25,.24,.64,low?6:9).translate(0,.32,0),'#8e7958');for(const y of [.1,.5])add(new T.TorusGeometry(.25,.025,3,low?6:9).rotateX(Math.PI/2).translate(0,y,0),'#665f50');
  }else if(kind==='person'){
   add(new T.SphereGeometry(.115,8,6).translate(0,1.635,0),'#b99e7a');add(new T.CylinderGeometry(.17,.14,.54,6).translate(0,1.22,0),'#718176');
   for(const s of [-1,1]){add(new T.CylinderGeometry(.065,.05,.9,5).translate(s*.10,.45,0),'#665e50');add(new T.CylinderGeometry(.05,.043,.62,5).translate(s*.235,1.12,0),'#718176');}
  }else throw Error('Unknown hamlet prop: '+kind);
  const result=new T.BufferGeometry();for(const name of ['position','normal','color'])result.setAttribute(name,new T.Float32BufferAttribute(parts.flatMap(p=>Array.from(p.attributes[name].array)),3));for(const p of parts)p.dispose();result.computeBoundingBox();return result;
 }
 let disposed=false;
 return{build(records){if(disposed)throw Error('Prop library disposed');const byKind=new Map(),group=new T.Group(),matrix=new T.Matrix4(),q=new T.Quaternion(),up=new T.Vector3(0,1,0);
  for(const r of records){if(!byKind.has(r.kind))byKind.set(r.kind,[]);byKind.get(r.kind).push(r);}
  for(const [kind,rows] of byKind){if(!geometries.has(kind))geometries.set(kind,make(kind));const mesh=new T.InstancedMesh(geometries.get(kind),material,rows.length);rows.forEach((r,i)=>{matrix.compose(new T.Vector3(...r.origin),q.setFromAxisAngle(up,r.yaw||0),new T.Vector3(...(r.scale||[2.8,2.8,2.8])));mesh.setMatrixAt(i,matrix);});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.computeBoundingBox();mesh.userData.keys=rows.map(r=>r.key);group.add(mesh);}
  let released=false;return{group,dispose(){if(released)return;released=true;group.removeFromParent();for(const m of group.children)m.dispose();group.clear();}};
 },measurements(){return [...geometries].map(([kind,g])=>({kind,triangles:g.attributes.position.count/3,boundsMin:g.boundingBox.min.toArray(),boundsMax:g.boundingBox.max.toArray(),materials:1,textureBytes:0,status:'gallery-review',runtimeReady:false}));},dispose(){if(disposed)return;disposed=true;for(const g of geometries.values())g.dispose();geometries.clear();material.dispose();}};
}
