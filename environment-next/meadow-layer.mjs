import * as T from '../assets/vendor/three.module.mjs';
import {createHamletUseIndex,displayedHamletHeight,keyedUnit,pointInPolygon,lineDistance,METRES_TO_GAME as U} from '../assets/wv/landscape-next/hamlet-plan.mjs?v=plot-aware-1';
export const MEADOW_PALETTE=Object.freeze({meadow:'#789f40',light:'#adc05c',wood:'#688b37',lane:'#ceb17a',approach:'#ceb17a',path:'#c8ad78',yard:'#b5a075',work:'#b9a074',garden:'#779941',field:'#b9ad68',common:'#91ad47',holding:'#86a243',seat:'#8e9262',root:'#5c7e2d',tip:'#b0c65c'});
const unit=(seed,x,z,suffix='')=>keyedUnit(`${seed}:${x}:${z}:${suffix}`);
function smooth(seed,x,z){const i=Math.floor(x),j=Math.floor(z),a=x-i,b=z-j,u=a*a*(3-2*a),v=b*b*(3-2*b),mix=(a,b,t)=>a+(b-a)*t;return mix(mix(unit(seed,i,j),unit(seed,i+1,j),u),mix(unit(seed,i,j+1),unit(seed,i+1,j+1),u),v);}
// Read-only art-study permissions from B's existing visual plan, in visual metres.
export function meadowRecords(plan,{seed='WV-MEADOW',low=false}={}){
 const index=createHamletUseIndex(plan),paths=[...plan.lanes,...plan.paths],records=[];
 for(let ix=-39;ix<=18;ix++)for(let iz=-18;iz<=38;iz++){
  const x=ix*1.05+(unit(seed,ix,iz,'x')-.5)*.95,z=iz*1.05+(unit(seed,ix,iz,'z')-.5)*.95;
  const p={x,z},kind=index.query(x,z).kind;if(!['meadow','common','holding'].includes(kind))continue;
  const scale=.45+unit(seed,ix,iz,'height')*.70,radius=.68*scale;
  if(paths.some(l=>lineDistance(p,l.points)<l.width/2+radius+.04)||plan.entities.some(e=>pointInPolygon(p,e.footprint)||e.footprint.some((a,i)=>lineDistance(p,[a,e.footprint[(i+1)%e.footprint.length]])<radius+.08)))continue;
  // Patch density and individual gaps are stable world/plan inputs, not camera LOD.
  const patch=smooth(seed,x*.055,z*.055);if(unit(seed,ix,iz,'gap')>.70+patch*.29)continue;
  const heights=[[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]].map(([dx,dz])=>displayedHamletHeight(x+dx,z+dz)*U),spread=Math.max(...heights)-Math.min(...heights);if(spread>.16)continue;
  records.push({key:`meadow:${ix}:${iz}`,x,z,scale:scale*U,yaw:unit(seed,ix,iz,'yaw')*Math.PI*2,y:heights[0],slopeX:(displayedHamletHeight(x+.2,z)-displayedHamletHeight(x-.2,z))/.4,slopeZ:(displayedHamletHeight(x,z+.2)-displayedHamletHeight(x,z-.2))/.4,maxGap:spread,brightness:.88+unit(seed,ix,iz,'shade')*.24,rank:unit(seed,ix,iz,'rank')});
 }
 const normal=records.sort((a,b)=>a.rank-b.rank).slice(0,1900);return low?normal.filter(r=>unit(seed,r.x,r.z,'low')<.33).slice(0,850):normal;
}
function colourField(plan,trees,seed,low){
 const width=low?448:896,height=Math.round(width*plan.depth/plan.width),data=new Uint8Array(width*height*4),index=createHamletUseIndex(plan),colors=Object.fromEntries(Object.entries(MEADOW_PALETTE).map(([k,v])=>[k,new T.Color(v)])),c=new T.Color(),bins=new Map();
 for(const t of trees){const x=t.origin[0]/U,z=t.origin[2]/U,k=Math.floor(x/10)+':'+Math.floor(z/10);if(!bins.has(k))bins.set(k,[]);bins.get(k).push({x,z,r:Math.min(3.2,(t.bounds.max[1]-t.bounds.min[1])/U*.3)});}
 for(let j=0;j<height;j++)for(let i=0;i<width;i++){
  const x=(i/(width-1)-.5)*plan.width*2.1,z=(j/(height-1)-.5)*plan.depth*2.1,land=index.query(x,z),broad=smooth(seed,x*.042,z*.042),grain=unit(seed,Math.floor(x*3),Math.floor(z*3));
  c.copy(colors.meadow).lerp(colors.light,broad);if(land.kind!=='meadow')c.lerp(colors[land.kind]||colors.meadow,land.strength);c.multiplyScalar(.98+(grain-.5)*.10);
  for(let bx=Math.floor(x/10)-1;bx<=Math.floor(x/10)+1;bx++)for(let bz=Math.floor(z/10)-1;bz<=Math.floor(z/10)+1;bz++)for(const t of bins.get(bx+':'+bz)||[]){const d=Math.hypot(x-t.x-.6,z-t.z+.3);if(d<t.r)c.multiplyScalar(1-.15*(1-d/t.r));}
  c.convertLinearToSRGB();const k=(j*width+i)*4;data[k]=Math.round(T.MathUtils.clamp(c.r,0,1)*255);data[k+1]=Math.round(T.MathUtils.clamp(c.g,0,1)*255);data[k+2]=Math.round(T.MathUtils.clamp(c.b,0,1)*255);data[k+3]=255;
 }
 const texture=new T.DataTexture(data,width,height);texture.colorSpace=T.SRGBColorSpace;texture.minFilter=texture.magFilter=T.LinearFilter;texture.flipY=false;texture.needsUpdate=true;return texture;
}
// Original swept ribbon surface detail. Visual metres, Y up; no landscape asset edits.
export function grassSurfaceGeometry(low=false){
 const positions=[],indices=[],blades=low?5:19,levels=low?[0,.65,1]:[0,.45,.78,1];
 for(let b=0;b<blades;b++){
  const angle=unit('blade',b,0)*Math.PI*2,radius=Math.sqrt(unit('blade',b,1))*.30,x=Math.cos(angle)*radius,z=Math.sin(angle)*radius,yaw=unit('blade',b,2)*Math.PI*2,height=.28+unit('blade',b,3)*.20,width=.024+unit('blade',b,4)*.031,bend=.045+unit('blade',b,5)*.09,base=positions.length/3;
  for(let j=0;j<levels.length;j++){const t=levels[j],cx=x+Math.cos(yaw)*bend*t*t,cz=z+Math.sin(yaw)*bend*t*t,w=width*(1-t)*.5;if(t===1)positions.push(cx,height,cz);else for(const side of [-1,1])positions.push(cx+Math.sin(yaw)*w*side,t*height,cz-Math.cos(yaw)*w*side);}
  for(let j=0;j<levels.length-2;j++){const k=base+j*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}const k=base+(levels.length-2)*2;indices.push(k,k+1,k+2);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
function grassMaterial(){return new T.ShaderMaterial({side:T.DoubleSide,fog:true,uniforms:T.UniformsUtils.merge([T.UniformsLib.fog,{root:{value:new T.Color(MEADOW_PALETTE.root)},tip:{value:new T.Color(MEADOW_PALETTE.tip)},sun:{value:new T.Vector3(-.4,.86,.25).normalize()}}]),vertexShader:`varying float vHeight;varying vec3 vNormal;varying vec3 vTint;
 #include <fog_pars_vertex>
 void main(){vHeight=clamp(position.y/.48,0.,1.);vTint=vec3(1.);
 #ifdef USE_INSTANCING_COLOR
 vTint=instanceColor;
 #endif
 vec4 p=vec4(position,1.);vec3 n=normal;
 #ifdef USE_INSTANCING
 p=instanceMatrix*p;n=mat3(instanceMatrix)*n;
 #endif
 vNormal=normalize(mat3(modelMatrix)*n);vec4 mvPosition=modelViewMatrix*p;gl_Position=projectionMatrix*mvPosition;
 #include <fog_vertex>
 }`,fragmentShader:`uniform vec3 root;uniform vec3 tip;uniform vec3 sun;varying float vHeight;varying vec3 vNormal;varying vec3 vTint;
 #include <fog_pars_fragment>
 void main(){float light=.79+.21*abs(dot(normalize(vNormal),sun));gl_FragColor=vec4(mix(root,tip,smoothstep(0.,1.,vHeight))*vTint*light,1.);
 #include <fog_fragment>
 #include <colorspace_fragment>
 }`});}
export function attachMeadowLayer(component,{low=false,seed='WV-MEADOW',look='meadow',grass=true}={}){
 const snapshot=JSON.stringify(component.plan),records=meadowRecords(component.plan,{seed,low}),geometry=grassSurfaceGeometry(low),muted=new T.MeshStandardMaterial({color:'#829452',roughness:1,side:T.DoubleSide});
 const texture=colourField(component.plan,component.nature.filter(r=>r.key.startsWith('tree:')),seed,low),original=component.groundMesh.material,material=new T.MeshStandardMaterial({map:texture,roughness:1,metalness:0}),blades=grassMaterial();
 const mesh=new T.InstancedMesh(geometry,blades,records.length),matrix=new T.Matrix4(),q=new T.Quaternion(),up=new T.Vector3(0,1,0),color=new T.Color();
 records.forEach((r,i)=>{matrix.compose(new T.Vector3(r.x*U,r.y,r.z*U),q.setFromUnitVectors(up,new T.Vector3(-r.slopeX,1,-r.slopeZ).normalize()).multiply(new T.Quaternion().setFromAxisAngle(up,r.yaw)),new T.Vector3().setScalar(r.scale));mesh.setMatrixAt(i,matrix);color.setRGB(r.brightness,r.brightness,r.brightness);mesh.setColorAt(i,color);});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();component.group.add(mesh);
 let disposed=false,current=look;
 const setLook=value=>{if(disposed)return;current=value;component.groundMesh.material=value==='context'?original:material;mesh.material=value==='context'?muted:blades;};setLook(look);mesh.visible=grass;
 return{setLook,setGrass(value){mesh.visible=Boolean(value);},pause(){},advance(){},records,
 status:()=>({meadowBuilds:1,meadowInstances:records.length,meadowTriangles:records.length*(geometry.index?geometry.index.count:geometry.attributes.position.count)/3,meadowTextureBytes:texture.image.data.byteLength,meadowLook:current,meadowGrassVisible:mesh.visible,borrowedGrassGeometry:false,planUnchanged:JSON.stringify(component.plan)===snapshot,disposed,runtimeReady:false}),
 dispose(){if(disposed)return;disposed=true;if(component.groundMesh.material===material)component.groundMesh.material=original;mesh.removeFromParent();mesh.dispose();geometry.dispose();muted.dispose();blades.dispose();material.dispose();texture.dispose();}};
}
