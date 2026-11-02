// Standalone real-state review harness; never imported by gameplay or runtime.
import * as T from '../../assets/vendor/three.module.mjs';
import {realWorldFixture} from './fixtures.mjs';
import {createWorldLayer} from './index.mjs';
import {createWorldMesh} from '../../world-gen.mjs';
import {settlementGeometry} from '../../game-3d-mesh.mjs';
const params=new URLSearchParams(location.search),quality=params.get('quality')==='low'?'low':'normal',seed=params.get('seed')||'WILLOW-1048';
const fixture=realWorldFixture(seed,quality),{world,surface,view,state}=fixture;
const canvas=document.querySelector('canvas'),scene=new T.Scene(),renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.outputColorSpace=T.SRGBColorSpace;
const camera=new T.OrthographicCamera(-1,1,1,-1,.1,5400),layer=createWorldLayer({scene,world,terrainSurface:surface,quality});
const dims=view.world.terrainRevision.split(':').map(Number),mesh=createWorldMesh(world,...dims,{trees:false}),settlement=settlementGeometry(surface,state),owned=[];
let draws=0,resizes=0,disposed=false,lastSize='',target=state.houses[0],zoom=90,hidden=false;
function add(data,material,kinds){
 const g=new T.BufferGeometry(),buffer=new T.InterleavedBuffer(data,9);for(const [n,o]of[['position',0],['color',3],['normal',6]])g.setAttribute(n,new T.InterleavedBufferAttribute(buffer,3,o));
 if(kinds)g.setAttribute('surfaceKind',new T.BufferAttribute(kinds,1));const m=new T.Mesh(g,material);scene.add(m);owned.push(m);return m;
}
// Peer fixtures are intentionally absent: safe base materials, no unsafe cover
// around houses. A complete empty context is admitted only for the isolated
// unoccupied terrain close-ups after selecting a point away from all sites.
await layer.update(view);
layer.attachAtmosphere();
const ground=add(mesh.ground,layer.material(0)),water=add(mesh.water,layer.material(1)),road=add(settlement.surfaces,layer.material(5),settlement.surfaceKinds);
if(settlement.structures.length)add(new Float32Array(settlement.structures),new T.MeshStandardMaterial({vertexColors:true,roughness:1}));
function render(){
 if(disposed||hidden||document.hidden)return;
 const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,quality==='low'?1:1.5),size=`${w}:${h}:${dpr}`;
 if(size!==lastSize){renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);lastSize=size;resizes++;}
 camera.left=-zoom*w/h;camera.right=zoom*w/h;camera.top=zoom;camera.bottom=-zoom;
 camera.position.set(target.x-world.width/2,400,target.y-world.depth/2+340);camera.lookAt(target.x-world.width/2,surface.sample(target.x,target.y).height,target.y-world.depth/2);camera.updateProjectionMatrix();layer.setCamera(camera);renderer.render(scene,camera);draws++;
 document.querySelector('output').textContent=JSON.stringify(status(),null,2);
}
function status(){return {...layer.status(),draws,viewportResizes:resizes,renderer:{...renderer.info.render,drawingBufferWidth:canvas.width,drawingBufferHeight:canvas.height,outputColorSpace:renderer.outputColorSpace,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures},stateUnchanged:JSON.stringify(state)===fixture.before};}
function find(kind){
 for(let y=140;y<world.depth-140;y+=15)for(let x=140;x<world.width-140;x+=15){
  if(view.houses.concat(view.facilities).some(h=>Math.hypot(x-h.savedPosition.x,y-h.savedPosition.y)<180))continue;
  const q=layer.sampleWorldGame(x,y);if(q.kind===kind)return{x,y};
 }
 return null;
}
async function setView(name){
 zoom=name==='wide'?700:90;target=name==='homes'||name==='wide'?state.houses[0]:find(name)??state.houses[0];
 // Only admit a complete empty site context where no real site is nearby; the
 // surrounding scene uses bounded exclusion polygons for every actual site.
 // These conservative review blockers are not claimed as P1 C4 placements.
 const exclusionsWorldGame=view.houses.concat(view.facilities).map(h=>{const{x,y}=h.savedPosition,r=100;return {polygon:[{x:x-r,y:y-r},{x:x+r,y:y-r},{x:x+r,y:y+r},{x:x-r,y:y+r}]};});
 await layer.update(view,{placementView:{revision:'review-conservative-1',complete:true,exclusionsWorldGame},landscapeView:{revision:'review-empty-1',complete:true,exclusionsWorldGame:[]}});
 render();return {found:name==='homes'||name==='wide'||layer.sampleWorldGame(target.x,target.y).kind===name,target};
}
for(const name of ['homes','meadow','forest','rock','bank','lake','river','wide']){const b=document.createElement('button');b.textContent=name;b.onclick=()=>setView(name);document.querySelector('nav').append(b);}
window.worldHarness={fixture,layer,camera,renderer,scene,ground,water,road,status,render,setView,setHidden(v){hidden=v;layer.setVisible(!v);render();},
 async quality(next){await layer.setQuality(next);ground.material=layer.material(0);water.material=layer.material(1);road.material=layer.material(5);render();},
 dispose(){if(disposed)return;disposed=true;layer.dispose();for(const m of owned){m.removeFromParent();m.geometry.dispose();if(![ground,water,road].includes(m))m.material.dispose();}renderer.dispose();}};
window.addEventListener('resize',render);window.addEventListener('pagehide',()=>window.worldHarness.dispose());render();
