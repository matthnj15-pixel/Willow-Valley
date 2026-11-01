import * as T from '../assets/vendor/three.module.mjs';
import {createVisualField} from './visual-field.mjs';
import {attachAtmosphere} from './atmosphere.mjs';
import {ENVIRONMENT_PRESET as P} from './preset.mjs';
const vertex=`attribute vec3 color;varying vec3 vColor;varying vec3 vPosition;varying vec3 vNormal;varying float vDepth;
void main(){vColor=color;vPosition=position;vNormal=normal;vec4 mv=modelViewMatrix*vec4(position,1.);vDepth=-mv.z;gl_Position=projectionMatrix*mv;}`;
const common=`uniform sampler2D grass;uniform sampler2D soil;uniform sampler2D control;uniform sampler2D visual;uniform vec2 worldSize;uniform float time;uniform vec3 sunDirection;uniform vec3 haze;uniform vec2 fogRange;
varying vec3 vColor;varying vec3 vPosition;varying vec3 vNormal;varying float vDepth;
float lum(vec3 c){return dot(c,vec3(.3,.5,.2));}
float grain(vec2 p){return .5+.25*sin(p.x*.73+sin(p.y*.47))+.25*sin(p.y*1.13+p.x*.21);}
vec3 finish(vec3 c){float light=.72+.28*max(0.,dot(normalize(vNormal),sunDirection));return mix(c*light,haze,smoothstep(fogRange.x,fogRange.y,vDepth)*.62);}
vec2 fieldUV(){return (vPosition.xz+worldSize*.5)/worldSize;}
vec3 meadow(vec3 g,float m){return g*mix(vec3(.79,.86,.66),vec3(.84,.85,.68),m)*(.94+.10*m);}
`;
const terrain=`${common}
void main(){vec4 f=texture2D(visual,fieldUV()),shore=texture2D(control,fieldUV());vec3 n=normalize(vNormal);vec2 rockUV=abs(n.x)>abs(n.z)?vPosition.zy:vPosition.xy;
vec3 g=texture2D(grass,vPosition.xz/24.).rgb;
#ifdef LOW_QUALITY
vec3 earth=vec3(lum(g))*vec3(.86,.69,.51);
#else
// A second, coarse rotated grass sample breaks the near tile rhythm.
g=mix(g,texture2D(grass,vec2(-vPosition.z,vPosition.x)/63.).rgb,.22);
vec3 earth=texture2D(soil,vPosition.xz/21.).rgb;
#endif
vec3 c=meadow(g,f.b);float leaf=grain(vPosition.xz*.7);vec3 litter=earth*mix(vec3(.68,.58,.43),vec3(.79,.69,.49),leaf);
c=mix(c,litter,f.r*.75);float bank=1.-smoothstep(.0,.48,shore.g);vec3 damp=earth*vec3(.59,.56,.46);vec3 gravel=vec3(lum(earth)) * vec3(.84,.83,.75);
c=mix(c,mix(gravel,damp,1.-smoothstep(0.,.16,shore.g)),bank*.8);
c=mix(c,earth*vec3(.85,.73,.56),f.g);
// Dedicated neutral rock: no foliage albedo. Vertical axis projection follows face orientation.
float strata=grain(rockUV*vec2(.28,.9));vec3 rock=mix(vec3(.22,.23,.21),vec3(.34,.33,.29),strata);
float slope=smoothstep(.24,.62,1.-abs(n.y));c=mix(c,rock,slope);
gl_FragColor=vec4(finish(c),1.);
#include <colorspace_fragment>
}`;
const road=`${common}varying float vKind;varying float vOffset;
void main(){vec3 c=vColor;if(vKind>.5){vec3 earth=texture2D(soil,vPosition.xz/21.).rgb;
#ifdef LOW_QUALITY
vec3 turf=vec3(.19,.26,.11)*(.85+earth.g*.3);
#else
vec4 f=texture2D(visual,fieldUV());vec3 turf=meadow(texture2D(grass,vPosition.xz/24.).rgb,f.b);
#endif
float wear=vKind<1.5?.92:vKind<2.5?(1.-smoothstep(11.5+grain(vPosition.xz)*.6,17.,abs(vOffset)))*.9:vKind<3.5?.72:vKind<4.5?.58:vKind<5.5?.86:.78;
c=mix(turf,earth*vec3(.92,.83,.68),wear);if(vKind>4.5&&vKind<5.5)c=mix(c,vColor*.72,.25);}
gl_FragColor=vec4(finish(c),1.);
#include <colorspace_fragment>
}`;
const water=`${common}
void main(){vec4 field=texture2D(control,fieldUV());vec2 flow=field.ba*2.-1.;float river=smoothstep(.12,.4,length(flow));
// G is normalized shore distance, never measured depth.
vec3 c=mix(vec3(.135,.19,.16),vec3(.105,.22,.225),smoothstep(0.,.23,field.g));c=mix(c,vec3(.04,.12,.155),smoothstep(.16,.98,field.g));
#ifndef LOW_QUALITY
vec2 p=vPosition.xz/35.-flow*time*.025*river-vec2(time*.001*(1.-river));float ripple=sin(p.x*8.+sin(p.y*6.))*sin(p.y*7.);c+=vec3(.004,.006,.006)*ripple*smoothstep(.03,.30,field.g);
#endif
// Water uses the same haze, but no diffuse terrain-normal darkening.
c=mix(c,haze,smoothstep(fogRange.x,fogRange.y,vDepth)*.62);gl_FragColor=vec4(c,1.);
#include <colorspace_fragment>
}`;
export function createEnvironmentMaterials({low=false,onReady=()=>{},loadTextures=true}={}){
 let disposed=false,loaded=0,failed=0,lastTime=0,controlBuilds=0,world=null,inputs=[],field=null,detach=null;const textures=new Set(),materials=new Set();
 const pixel=rgb=>{const t=new T.DataTexture(new Uint8Array([...rgb,255]),1,1);t.needsUpdate=true;textures.add(t);return t;};
 const uniforms={grass:{value:pixel([106,124,72])},soil:{value:pixel([116,94,66])},control:{value:pixel([0,255,128])},visual:{value:pixel([0,0,128])},worldSize:{value:new T.Vector2(1,1)},time:{value:0},sunDirection:{value:new T.Vector3(...P.sunDirection).normalize()},haze:{value:new T.Color(P.fogColor)},fogRange:{value:new T.Vector2(P.fogNear,P.fogFar)}};
 if(loadTextures)for(const name of ['grass','soil']){
  const t=new T.TextureLoader().load(new URL('../assets/wv/environment-v1/'+name+'.jpg',import.meta.url).href,texture=>{if(disposed){texture.dispose();return;}loaded++;uniforms[name].value.dispose();textures.delete(uniforms[name].value);uniforms[name].value=texture;onReady();},undefined,()=>{if(!disposed){failed++;onReady();}});
  t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.minFilter=T.LinearMipmapLinearFilter;t.anisotropy=low?1:2;textures.add(t);
 }
 function rebuild(){if(!world||disposed)return;field=createVisualField(world,{low,inputs});controlBuilds++;for(const [key,data] of [['control',field.data],['visual',field.visualData]]){const t=uniforms[key].value;t.image={data,width:key==='visual'?field.visualWidth:field.width,height:key==='visual'?field.visualHeight:field.height};t.minFilter=t.magFilter=T.LinearFilter;t.colorSpace=T.NoColorSpace;t.needsUpdate=true;}uniforms.worldSize.value.set(world.width,world.depth);}
 return{material(index){if(disposed||![0,1,5].includes(index))return null;const v=index===5?vertex.replace('attribute vec3 color;','attribute float surfaceKind;attribute float surfaceOffset;varying float vKind;varying float vOffset;attribute vec3 color;').replace('vColor=color;','vKind=surfaceKind;vOffset=surfaceOffset;vColor=color;'):vertex;const m=new T.ShaderMaterial({uniforms,defines:low?{LOW_QUALITY:1}:{},vertexShader:v,fragmentShader:index===0?terrain:index===1?water:road,side:T.DoubleSide});materials.add(m);return m;},
 setWorld(next){if(disposed)return;world=next;rebuild();},setVisualInputs(next=[]){if(disposed)return;inputs=next;rebuild();},
 sample(x,z){return field?.sample(x,z)??null;},
 attachAtmosphere(scene){if(disposed)return()=>{};detach?.();const release=attachAtmosphere(scene,{low,time:uniforms.time});detach=release;return release;},
 advance(now){if(disposed||low)return;if(lastTime)uniforms.time.value+=Math.max(0,Math.min(100,now-lastTime))/1000;lastTime=now;},pause(){lastTime=0;},
 status:()=>({disposed,surfaceControlBuilds:controlBuilds,surfaceTexturesLoaded:loaded,surfaceTexturesFailed:failed,surfaceTextureBytes:disposed?0:Math.ceil(2*512*512*4*4/3)+(field?field.data.byteLength+field.visualData.byteLength:8),surfaceTime:uniforms.time.value,visualInputs:field?.acceptedInputs??0,quality:low?'low':'normal',idleAnimation:!low,shadows:false}),
 dispose(){if(disposed)return;disposed=true;detach?.();for(const m of materials)m.dispose();for(const t of textures)t.dispose();materials.clear();textures.clear();field=null;world=null;inputs=[];}};
}
