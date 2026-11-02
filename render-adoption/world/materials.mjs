import * as T from '../../assets/vendor/three.module.mjs';
import {ENVIRONMENT_PRESET as P} from './preset.mjs';
// A1 water, sky and haze starting system, A3 meadow field. All shader colours
// are linear; fields are explicitly sRGB/linear and output encoding occurs once.
export function createMaterials(quality) {
 const uniforms={colorField:{value:null},control:{value:null},worldSize:{value:new T.Vector2(1,1)},fieldSize:{value:new T.Vector2(1,1)},time:{value:0},
  sunDirection:{value:new T.Vector3(...P.sunDirection).normalize()},haze:{value:new T.Color(P.fogColor)},fogRange:{value:new T.Vector2(P.fogNear,P.fogFar)}};
 const vertex=`attribute vec3 color;varying vec3 vColor;varying vec3 vPosition;varying vec3 vNormal;varying float vDepth;
 void main(){vColor=color;vPosition=position;vNormal=normal;vec4 mv=modelViewMatrix*vec4(position,1.);vDepth=-mv.z;gl_Position=projectionMatrix*mv;}`;
 const common=`uniform sampler2D colorField;uniform sampler2D control;uniform vec2 worldSize;uniform vec2 fieldSize;uniform float time;uniform vec3 sunDirection;uniform vec3 haze;uniform vec2 fogRange;
 varying vec3 vColor;varying vec3 vPosition;varying vec3 vNormal;varying float vDepth;
 vec2 fieldUV(){return ((vPosition.xz/worldSize+.5)*(fieldSize-1.)+.5)/fieldSize;}
 vec3 finish(vec3 c){float light=.72+.28*max(0.,dot(normalize(vNormal),sunDirection));return mix(c*light,haze,smoothstep(fogRange.x,fogRange.y,vDepth)*.62);}`;
 const terrain=`${common}
 void main(){vec3 c=texture2D(colorField,fieldUV()).rgb;
 #ifndef LOW_QUALITY
 float grain=.5+.25*sin(vPosition.x*.73+sin(vPosition.z*.47))+.25*sin(vPosition.z*1.13+vPosition.x*.21);c*=.96+.08*grain;
 #endif
 gl_FragColor=vec4(finish(c),1.);
 #include <colorspace_fragment>
 }`;
 const water=`${common}
 void main(){vec4 field=texture2D(control,fieldUV());vec2 flow=field.ba*2.-1.;float river=smoothstep(.12,.4,length(flow));
 vec3 c=mix(vec3(.135,.19,.16),vec3(.105,.22,.225),smoothstep(0.,.23,field.g));c=mix(c,vec3(.04,.12,.155),smoothstep(.16,.98,field.g));
 #ifndef LOW_QUALITY
 vec2 p=vPosition.xz/35.-flow*time*.025*river-vec2(time*.001*(1.-river));float ripple=sin(p.x*8.+sin(p.y*6.))*sin(p.y*7.);c+=vec3(.004,.006,.006)*ripple*smoothstep(.03,.30,field.g);
 #endif
 c=mix(c,haze,smoothstep(fogRange.x,fogRange.y,vDepth)*.62);gl_FragColor=vec4(c,1.);
 #include <colorspace_fragment>
 }`;
 const road=`${common}varying float vKind;
 void main(){vec3 c=vColor;
 // Surface kinds preserve actual geometry, curves, junctions and widths. No
 // main-road width constant is imposed on local lanes or desire paths.
 if(vKind>.5){float grain=.96+.04*sin(vPosition.x*.7+sin(vPosition.z));vec3 earth=vec3(.61,.46,.255)*grain;
 c=mix(vColor,earth,vKind<1.5?.80:vKind<2.5?.62:vKind<3.5?.74:vKind<4.5?.60:.78);}
 gl_FragColor=vec4(finish(c),1.);
 #include <colorspace_fragment>
 }`;
 const materials=new Map();
 for(const index of [0,1,5]){
  const v=index===5?vertex.replace('attribute vec3 color;','attribute float surfaceKind;varying float vKind;attribute vec3 color;').replace('vColor=color;','vKind=surfaceKind;vColor=color;'):vertex;
  materials.set(index,new T.ShaderMaterial({uniforms,defines:quality==='low'?{LOW_QUALITY:1}:{},vertexShader:v,fragmentShader:index===0?terrain:index===1?water:road,side:T.DoubleSide}));
 }
 const grass=new T.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,side:T.DoubleSide});
 return {uniforms,material:index=>materials.get(index)??null,grass,
  bind(fields,world){uniforms.colorField.value=fields.color;uniforms.control.value=fields.control;uniforms.worldSize.value.set(world.width,world.depth);uniforms.fieldSize.value.set(fields.status.width,fields.status.height);},
  dispose(){for(const m of materials.values())m.dispose();grass.dispose();}};
}
