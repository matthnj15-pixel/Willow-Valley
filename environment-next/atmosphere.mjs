import * as T from '../assets/vendor/three.module.mjs';
import {ENVIRONMENT_PRESET as P} from './preset.mjs';
// The caller removes/parks its old lights. We only own nodes added here.
export function attachAtmosphere(scene,{low=false,time={value:0}}={}){
 const previousFog=scene.fog,previousBackground=scene.background;
 const sun=new T.DirectionalLight(P.sunColor,P.sunIntensity);sun.position.set(...P.sunDirection);
 const fill=new T.HemisphereLight(P.skyColor,P.groundColor,P.fillIntensity);
 const geometry=new T.PlaneGeometry(2,2),material=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{time,zenith:{value:new T.Color(P.zenith)},horizon:{value:new T.Color(P.horizon)}},defines:low?{LOW_QUALITY:1}:{},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,.99999,1.);}',fragmentShader:`varying vec2 vUv;uniform float time;uniform vec3 zenith;uniform vec3 horizon;
 void main(){vec3 c=mix(horizon,zenith,smoothstep(.15,1.,vUv.y));
 #ifndef LOW_QUALITY
 float bands=sin(vUv.x*12.+time*.007+sin(vUv.y*18.))*sin(vUv.x*5.-vUv.y*29.+time*.003);float clouds=smoothstep(.48,.90,bands)*smoothstep(.4,.7,vUv.y);c=mix(c,vec3(.79,.82,.80),clouds*.20);
 #endif
 gl_FragColor=vec4(c,1.);
 #include <colorspace_fragment>
 }`});
 const sky=new T.Mesh(geometry,material);sky.frustumCulled=false;sky.renderOrder=-10000;
 const fog=new T.Fog(P.fogColor,P.fogNear,P.fogFar);scene.fog=fog;scene.add(sun,fill,sky);
 let detached=false;return()=>{if(detached)return;detached=true;scene.remove(sun,fill,sky);if(scene.fog===fog)scene.fog=previousFog;if(scene.background===previousBackground)scene.background=previousBackground;geometry.dispose();material.dispose();sun.dispose();};
}
