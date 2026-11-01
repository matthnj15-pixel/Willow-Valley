import * as T from '../assets/vendor/three.module.mjs';
import {createVisualField} from './visual-field.mjs';
import {attachAtmosphere} from './atmosphere.mjs';
import {ENVIRONMENT_PRESET as P} from './preset.mjs';
import {SURFACE_DETAIL as D,DETAIL_TEXTURES,LOW_TEXTURES,mipBytes} from './detail-resources.mjs';
const vertex=`attribute vec3 color;varying vec3 vColor;varying vec3 vPosition;varying vec3 vNormal;varying float vDepth;
void main(){vColor=color;vPosition=position;vNormal=normal;vec4 mv=modelViewMatrix*vec4(position,1.);vDepth=-mv.z;gl_Position=projectionMatrix*mv;}`;
const common=`uniform sampler2D grass;uniform sampler2D soil;uniform sampler2D rock;uniform sampler2D grassNormal;uniform sampler2D soilNormal;uniform sampler2D rockNormal;uniform sampler2D control;uniform sampler2D visual;uniform vec2 worldSize;uniform float time;uniform vec3 sunDirection;uniform vec3 haze;uniform vec2 fogRange;uniform float normalStrength;
varying vec3 vColor;varying vec3 vPosition;varying vec3 vNormal;varying float vDepth;
const float GRASS_PERIOD=${D.grassPeriod.toFixed(2)},SOIL_PERIOD=${D.soilPeriod.toFixed(2)},ROCK_PERIOD=${D.rockPeriod.toFixed(2)};
float grain(vec2 p){return .5+.25*sin(p.x*.73+sin(p.y*.47))+.25*sin(p.y*1.13+p.x*.21);}
vec3 finish(vec3 c,vec3 n){float light=.64+.36*max(0.,dot(normalize(n),sunDirection));return mix(c*light,haze,smoothstep(fogRange.x,fogRange.y,vDepth)*.62);}
vec3 finish(vec3 c){return finish(c,normalize(vNormal));}
vec2 fieldUV(){return (vPosition.xz+worldSize*.5)/worldSize;}
// Macro colour belongs in the control field; it must not blur the albedo.
vec3 meadow(vec3 g,float m){return g*mix(vec3(.87,.96,.81),vec3(.96,.98,.84),m)*(.94+.10*m);}
#ifndef LOW_QUALITY
// Cotangent frame follows the actual rendered face and projection. Geometry is untouched.
vec3 relief(sampler2D detail,vec2 uv,vec3 n){vec3 dp1=dFdx(vPosition),dp2=dFdy(vPosition);vec2 duv1=dFdx(uv),duv2=dFdy(uv);vec3 a=cross(dp2,n),b=cross(n,dp1),t=a*duv1.x+b*duv2.x,bt=a*duv1.y+b*duv2.y;float scale=inversesqrt(max(max(dot(t,t),dot(bt,bt)),1.e-12));vec3 map=texture2D(detail,uv).rgb*2.-1.;map.xy*=normalStrength;return normalize(mat3(t*scale,bt*scale,n)*normalize(map));}
#endif
void stone(vec3 n,out vec3 color,out vec3 litNormal){
 vec2 ux=vec2(vPosition.z*sign(n.x),vPosition.y)/ROCK_PERIOD,uz=vec2(-vPosition.x*sign(n.z),vPosition.y)/ROCK_PERIOD;
 // Continuous world-space warp breaks straight tile columns without geometry displacement.
 ux+=vec2(sin(vPosition.y*.047+sin(vPosition.z*.019)),sin(vPosition.z*.039+sin(vPosition.y*.023)))*.65;
 uz+=vec2(sin(vPosition.y*.043+sin(vPosition.x*.021)),sin(vPosition.x*.037+sin(vPosition.y*.027)))*.65;
 float w=abs(n.x)/(abs(n.x)+abs(n.z)+.00001);
 #ifdef LOW_QUALITY
 vec2 uv=w>.5?ux:uz;color=texture2D(rock,uv).rgb;litNormal=n;
 #else
 color=mix(texture2D(rock,uz).rgb,texture2D(rock,ux).rgb,w);litNormal=normalize(mix(relief(rockNormal,uz,n),relief(rockNormal,ux,n),w));
 #endif
 color=mix(vec3(dot(color,vec3(.3,.5,.2))),color,.65)*vec3(.97,.96,.93);
}
`;
const terrain=`${common}
void main(){vec3 n=normalize(vNormal),lightingNormal=n,c;float slope=smoothstep(.24,.62,1.-abs(n.y));
if(slope>.99){stone(n,c,lightingNormal);}else{
 vec4 f=texture2D(visual,fieldUV()),shore=texture2D(control,fieldUV());
 vec2 guv=vPosition.xz/GRASS_PERIOD,euv=vPosition.xz/SOIL_PERIOD;
 vec3 g=texture2D(grass,guv).rgb,earth=texture2D(soil,euv).rgb;
 c=meadow(g,f.b);float litter=f.r*.42;vec3 floorColor=earth*mix(vec3(.83,.77,.64),vec3(.91,.86,.73),grain(vPosition.xz*.7));c=mix(c,floorColor,litter);
 float bank=1.-smoothstep(0.,.48,shore.g),damp=1.-smoothstep(0.,.16,shore.g);
 vec3 gravel=earth*vec3(.91,.92,.87),wetEarth=earth*vec3(.56,.57,.49);c=mix(c,mix(gravel,wetEarth,damp),bank*.8);
 c=mix(c,earth*vec3(.91,.82,.67),f.g);
 #ifndef LOW_QUALITY
 float earthWeight=max(max(litter,bank*.8),f.g);lightingNormal=normalize(mix(relief(grassNormal,guv,n),relief(soilNormal,euv,n),earthWeight));
 #endif
 if(slope>.001){vec3 rockColor,rockLight;stone(n,rockColor,rockLight);c=mix(c,rockColor,slope);lightingNormal=normalize(mix(lightingNormal,rockLight,slope));}
}
gl_FragColor=vec4(finish(c,lightingNormal),1.);
#include <colorspace_fragment>
}`;
const road=`${common}varying float vKind;varying float vOffset;
void main(){vec3 c=vColor,n=normalize(vNormal);if(vKind>.5){vec2 uv=vPosition.xz/SOIL_PERIOD;vec3 earth=texture2D(soil,uv).rgb;
#ifdef LOW_QUALITY
vec3 turf=vec3(.19,.26,.11)*(.85+earth.g*.3);
#else
vec4 f=texture2D(visual,fieldUV());vec3 turf=meadow(texture2D(grass,vPosition.xz/GRASS_PERIOD).rgb,f.b);n=relief(soilNormal,uv,n);
#endif
float wear=vKind<1.5?.92:vKind<2.5?(1.-smoothstep(11.5+grain(vPosition.xz)*.6,17.,abs(vOffset)))*.9:vKind<3.5?.72:vKind<4.5?.58:vKind<5.5?.86:.78;
c=mix(turf,earth*vec3(.92,.83,.68),wear);if(vKind>4.5&&vKind<5.5)c=mix(c,vColor*.72,.25);}
gl_FragColor=vec4(finish(c,n),1.);
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
 let disposed=false,loaded=0,failed=0,lastTime=0,controlBuilds=0,world=null,inputs=[],field=null,detach=null;const textures=new Set(),materials=new Set(),resources=low?LOW_TEXTURES:DETAIL_TEXTURES;
 const pixel=rgb=>{const t=new T.DataTexture(new Uint8Array([...rgb,255]),1,1);t.needsUpdate=true;textures.add(t);return t;};
 const uniforms={grass:{value:pixel([106,124,72])},soil:{value:pixel([116,94,66])},rock:{value:pixel([126,122,110])},grassNormal:{value:pixel([128,128,255])},soilNormal:{value:pixel([128,128,255])},rockNormal:{value:pixel([128,128,255])},normalStrength:{value:D.normalStrength},control:{value:pixel([0,255,128])},visual:{value:pixel([0,0,128])},worldSize:{value:new T.Vector2(1,1)},time:{value:0},sunDirection:{value:new T.Vector3(...P.sunDirection).normalize()},haze:{value:new T.Color(P.fogColor)},fogRange:{value:new T.Vector2(P.fogNear,P.fogFar)}};
 if(loadTextures)for(const resource of resources){
  const {name,file,color}=resource,t=new T.TextureLoader().load(new URL('../assets/wv/environment-next/'+file,import.meta.url).href,texture=>{if(disposed){texture.dispose();return;}loaded++;uniforms[name].value.dispose();textures.delete(uniforms[name].value);uniforms[name].value=texture;onReady();},undefined,()=>{if(!disposed){failed++;onReady();}});
  t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.anisotropy=low?D.lowAnisotropy:D.normalAnisotropy;textures.add(t);
 }
 for(const name of ['grass','soil','rock'])uniforms[name].value.colorSpace=T.SRGBColorSpace;

 function rebuild(){if(!world||disposed)return;field=createVisualField(world,{low,inputs});controlBuilds++;for(const [key,data] of [['control',field.data],['visual',field.visualData]]){const t=uniforms[key].value;t.image={data,width:key==='visual'?field.visualWidth:field.width,height:key==='visual'?field.visualHeight:field.height};t.minFilter=t.magFilter=T.LinearFilter;t.colorSpace=T.NoColorSpace;t.needsUpdate=true;}uniforms.worldSize.value.set(world.width,world.depth);}
 return{material(index){if(disposed||![0,1,5].includes(index))return null;const v=index===5?vertex.replace('attribute vec3 color;','attribute float surfaceKind;attribute float surfaceOffset;varying float vKind;varying float vOffset;attribute vec3 color;').replace('vColor=color;','vKind=surfaceKind;vOffset=surfaceOffset;vColor=color;'):vertex;const m=new T.ShaderMaterial({uniforms,defines:low?{LOW_QUALITY:1}:{},vertexShader:v,fragmentShader:index===0?terrain:index===1?water:road,side:T.DoubleSide});materials.add(m);m.addEventListener('dispose',()=>materials.delete(m));return m;},
 setWorld(next){if(disposed)return;world=next;rebuild();},setVisualInputs(next=[]){if(disposed)return;inputs=next;rebuild();},
 sample(x,z){return field?.sample(x,z)??null;},
 attachAtmosphere(scene){if(disposed)return()=>{};detach?.();const release=attachAtmosphere(scene,{low,time:uniforms.time});detach=release;return release;},
 advance(now){if(disposed||low)return;if(lastTime)uniforms.time.value+=Math.max(0,Math.min(100,now-lastTime))/1000;lastTime=now;},pause(){lastTime=0;},
 status:()=>({disposed,surfaceControlBuilds:controlBuilds,surfaceTexturesLoaded:loaded,surfaceTexturesExpected:resources.length,surfaceDetailRevision:D.revision,normalMaps:low?0:3,surfaceTexturesFailed:failed,surfaceTextureBytes:disposed?0:resources.reduce((sum,r)=>sum+mipBytes(r),0)+(field?field.data.byteLength+field.visualData.byteLength:8),surfaceTime:uniforms.time.value,visualInputs:field?.acceptedInputs??0,quality:low?'low':'normal',idleAnimation:!low,shadows:false}),
 dispose(){if(disposed)return;disposed=true;detach?.();for(const m of materials)m.dispose();for(const t of textures)t.dispose();materials.clear();textures.clear();field=null;world=null;inputs=[];}};
}
