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
 const vertexShader=`attribute vec3 color; varying vec3 vColor; varying vec3 vPosition; varying vec3 vNormal;
 void main(){vColor=color;vPosition=position;vNormal=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
 const fragmentShader=`uniform sampler2D grass; varying vec3 vColor; varying vec3 vPosition; varying vec3 vNormal;
 void main(){vec3 detail=texture2D(grass,vPosition.xz/22.).rgb;
 float macro=.96+.04*sin(vPosition.x*.013+sin(vPosition.z*.017));
 float light=.70+.30*max(0.,dot(normalize(vNormal),normalize(vec3(-.40,.86,.25))));
 gl_FragColor=vec4(mix(vColor,detail*vec3(.72,.84,.62),.65)*macro*light,1.);
 #include <colorspace_fragment>
 }`;
 return{material(index){if(index!==0)return null;return new THREE.ShaderMaterial({uniforms:{grass:{value:grass}},vertexShader,fragmentShader,side:THREE.DoubleSide});},
 status:()=>({surfaceTexturesLoaded:loaded,surfaceTextureBytes:512*512*4*4/3}),
 dispose(){disposed=true;for(const texture of textures.values())texture.dispose();textures.clear();}};
}
