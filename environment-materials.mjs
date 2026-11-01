import {createTerrainClassification} from './terrain-classification.mjs';
import * as THREE from './assets/vendor/three.module.mjs';
// Registry owns textures; mesh materials borrow them. No third-party runtime URLs.
export function createEnvironmentMaterials({low=false,onReady=()=>{}}={}){
 let disposed=false,loaded=0;
 const loader=new THREE.TextureLoader(),textures=new Map();
 const grass=loader.load(new URL('./assets/wv/environment-v1/grass.jpg',import.meta.url).href,texture=>{
  if(disposed){texture.dispose();return;}loaded++;onReady();
 });
 grass.colorSpace=THREE.SRGBColorSpace;grass.wrapS=grass.wrapT=THREE.RepeatWrapping;
 grass.minFilter=THREE.LinearMipmapLinearFilter;grass.magFilter=THREE.LinearFilter;grass.generateMipmaps=true;grass.anisotropy=low?1:2;textures.set('grass',grass);
 const soil=loader.load(new URL('./assets/wv/environment-v1/soil.jpg',import.meta.url).href,texture=>{if(disposed){texture.dispose();return;}loaded++;onReady();});
 soil.colorSpace=THREE.SRGBColorSpace;soil.wrapS=soil.wrapT=THREE.RepeatWrapping;soil.minFilter=THREE.LinearMipmapLinearFilter;soil.anisotropy=low?1:2;textures.set('soil',soil);
 const control=new THREE.DataTexture(new Uint8Array([0,255,128,128]),1,1);control.colorSpace=THREE.NoColorSpace;control.minFilter=control.magFilter=THREE.LinearFilter;control.needsUpdate=true;textures.set('control',control);
 const uniforms={grass:{value:grass},soil:{value:soil},control:{value:control},phase:{value:0},worldSize:{value:new THREE.Vector2(1,1)}};
 const vertexShader=`attribute vec3 color; varying vec3 vColor; varying vec3 vPosition; varying vec3 vNormal;
 void main(){vColor=color;vPosition=position;vNormal=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
 const fragmentShader=`uniform sampler2D grass; uniform sampler2D soil; uniform sampler2D control; uniform vec2 worldSize; varying vec3 vColor; varying vec3 vPosition; varying vec3 vNormal;
 void main(){vec3 detail=texture2D(grass,vPosition.xz/22.).rgb;
 vec4 weights=texture2D(control,(vPosition.xz+worldSize*.5)/worldSize);
 vec3 normal=normalize(vNormal);
 vec2 earthUV=abs(normal.y)<.65?(abs(normal.x)>abs(normal.z)?vPosition.zy:vPosition.xy):vPosition.xz;
 vec3 earth=texture2D(soil,earthUV/19.).rgb;
 float slope=smoothstep(.18,.65,1.-abs(normalize(vNormal).y));
 vec3 stone=vec3(dot(earth,vec3(.3,.5,.2)))*vec3(.88,.89,.83);
 vec3 meadow=mix(detail*vec3(.72,.84,.62),earth*vec3(.82,.76,.65),weights.r);
 meadow=mix(meadow,stone,slope*.86);
 float macro=.96+.04*sin(vPosition.x*.013+sin(vPosition.z*.017));
 float light=.70+.30*max(0.,dot(normalize(vNormal),normalize(vec3(-.40,.86,.25))));
 gl_FragColor=vec4(mix(vColor,meadow,.72)*macro*light,1.);
 #include <colorspace_fragment>
 }`;
 const roadVertex=vertexShader.replace('attribute vec3 color;', 'attribute float surfaceKind; attribute float surfaceOffset; varying float vOffset; varying float vKind; attribute vec3 color;').replace('vColor=color;','vOffset=surfaceOffset;vKind=surfaceKind;vColor=color;');
 const roadFragment=`uniform sampler2D soil;uniform sampler2D grass;uniform float phase;varying float vOffset;varying float vKind;varying vec3 vPosition;varying vec3 vColor;varying vec3 vNormal;
 void main(){float light=.70+.30*max(0.,dot(normalize(vNormal),normalize(vec3(-.40,.86,.25))));
 if(vKind<.5){gl_FragColor=vec4(vColor*light,1.);return;}
 vec3 earth=texture2D(soil,vPosition.xz/19.).rgb;
 vec3 turf=texture2D(grass,vPosition.xz/22.).rgb*vec3(.72,.84,.62);
 float noise=.5+.25*sin(vPosition.x*.25+sin(vPosition.z*.18)+phase)+.25*sin(vPosition.z*.19+vPosition.x*.14);
 vec3 dirt=earth*vec3(.92,.83,.68);
 float wear=vKind<1.5?.92:vKind<2.5?(1.-smoothstep(11.5+noise*.6,17.,abs(vOffset)))*.9:vKind<3.5?.72:vKind<4.5?.58:vKind<5.5?.86:.78;
 vec3 result=mix(turf,dirt,wear);
 if(vKind>4.5&&vKind<5.5)result=mix(result,vColor*.72,.25);
 gl_FragColor=vec4(result*light,1.);
 #include <colorspace_fragment>
 }`;
 return{material(index){if(index!==0&&index!==5)return null;return new THREE.ShaderMaterial({uniforms,vertexShader:index===5?roadVertex:vertexShader,fragmentShader:index===5?roadFragment:fragmentShader,side:THREE.DoubleSide});},
 setWorld(world){uniforms.phase.value=Array.from(String(world.options?.seed||'')).reduce((n,c)=>n+c.charCodeAt(0),0)%97;const grid=createTerrainClassification(world,{width:low?64:96,height:low?48:72});control.image={data:grid.data,width:grid.width,height:grid.height};control.needsUpdate=true;uniforms.worldSize.value.set(world.width,world.depth);},
 status:()=>({surfaceTexturesLoaded:loaded,surfaceTextureBytes:2*512*512*4*4/3+(control.image.data?.byteLength||0)}),
 dispose(){disposed=true;for(const texture of textures.values())texture.dispose();textures.clear();}};
}
