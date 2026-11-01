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
 const uniforms={grass:{value:grass},soil:{value:soil},control:{value:control},worldSize:{value:new THREE.Vector2(1,1)}};
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
 return{material(index){if(index!==0)return null;return new THREE.ShaderMaterial({uniforms,vertexShader,fragmentShader,side:THREE.DoubleSide});},
 setWorld(world){const grid=createTerrainClassification(world,{width:low?64:96,height:low?48:72});control.image={data:grid.data,width:grid.width,height:grid.height};control.needsUpdate=true;uniforms.worldSize.value.set(world.width,world.depth);},
 status:()=>({surfaceTexturesLoaded:loaded,surfaceTextureBytes:2*512*512*4*4/3+(control.image.data?.byteLength||0)}),
 dispose(){disposed=true;for(const texture of textures.values())texture.dispose();textures.clear();}};
}
