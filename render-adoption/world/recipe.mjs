// Derived from selected A3 meadow-layer.mjs; exact parent in provenance.json.
import * as T from '../../assets/vendor/three.module.mjs';
import {unit} from './spatial.mjs';
export const MEADOW_PALETTE=Object.freeze({meadow:'#789f40',light:'#adc05c',wood:'#688b37',lane:'#ceb17a',approach:'#ceb17a',path:'#c8ad78',yard:'#b5a075',work:'#b9a074',garden:'#779941',field:'#b9ad68',common:'#91ad47',holding:'#86a243',seat:'#8e9262',root:'#5c7e2d',tip:'#b0c65c'});
export function grassSurfaceGeometry(low=false){
 const positions=[],indices=[],blades=low?5:19,levels=low?[0,.65,1]:[0,.45,.78,1];
 for(let b=0;b<blades;b++){
  const angle=unit('blade',b,0)*Math.PI*2,radius=Math.sqrt(unit('blade',b,1))*.30,x=Math.cos(angle)*radius,z=Math.sin(angle)*radius,yaw=unit('blade',b,2)*Math.PI*2,height=.28+unit('blade',b,3)*.20,width=.024+unit('blade',b,4)*.031,bend=.045+unit('blade',b,5)*.09,base=positions.length/3;
  for(let j=0;j<levels.length;j++){const t=levels[j],cx=x+Math.cos(yaw)*bend*t*t,cz=z+Math.sin(yaw)*bend*t*t,w=width*(1-t)*.5;if(t===1)positions.push(cx,height,cz);else for(const side of [-1,1])positions.push(cx+Math.sin(yaw)*w*side,t*height,cz-Math.cos(yaw)*w*side);}
  for(let j=0;j<levels.length-2;j++){const k=base+j*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}const k=base+(levels.length-2)*2;indices.push(k,k+1,k+2);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
