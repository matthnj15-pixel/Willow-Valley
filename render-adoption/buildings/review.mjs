import * as T from '../../assets/vendor/three.module.mjs';
import {createBuildingLayer} from './index.mjs';
import {createTerrainSurface} from '../../terrain-surface.mjs';
import {startWorldGame,generatedWorld} from '../../simulation.mjs';
import {snapshotForBuildings,legacyExclusions} from './fixtures.mjs';
const manifest=await fetch(new URL('../../assets/wv/runtime-buildings-v1/manifest.json',import.meta.url)).then(r=>r.json()),canvas=document.querySelector('canvas'),scene=new T.Scene(),renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(1);scene.background=new T.Color('#b6c5b3');scene.add(new T.HemisphereLight('#e9f0e5','#796d50',2));const sun=new T.DirectionalLight('#fff2dc',2.5);sun.position.set(-50,80,50);scene.add(sun);
const camera=new T.PerspectiveCamera(38,1,.1,4000);camera.position.set(70,65,110);camera.lookAt(0,8,0);
const entries=manifest.entries.filter(e=>e.family==='C4'&&e.quality==='normal'),select=document.querySelector('#asset');for(const e of entries){const o=document.createElement('option');o.value=e.id;o.textContent=e.id;select.append(o);}
let slope=false,layers=[],revision=0,world,surface,state,readView,ground;
function draw(){const r=canvas.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();renderer.render(scene,camera);}
async function run(actual=false){document.body.dataset.ready='false';for(const l of layers)l.dispose();layers=[];if(ground){scene.remove(ground);ground.geometry.dispose();ground.material.dispose();ground=null;}
 if(actual){state=startWorldGame({seed:'WV007-P1-ACTUAL',size:'small',lakes:0,rivers:0,hills:5,cliffs:0,flatness:85});world=generatedWorld(state);surface=createTerrainSurface(world,62,46);readView=snapshotForBuildings(state,world,'actual-'+(++revision));const layer=await createBuildingLayer({scene,world,terrainSurface:surface,manifest,invalidate:draw});layers=[layer];await layer.update(readView,{legacyPlacements:legacyExclusions(state,world,readView)});camera.position.set(60,160,220);camera.lookAt(0,0,0);
 }else{
  state=null;world={width:1000,depth:800,seed:'review',sample:(x,y)=>({height:slope?(x-500)*.035+(y-400)*.012:0,water:null}),slope:()=>slope?.04:0};surface=createTerrainSurface(world,50,40);
  const id=select.value,e=entries.find(e=>e.id===id);for(const [index,x] of [[0,465],[1,535]]){
   const entity={key:'review-'+index,savedPosition:{x,y:400},yaw:.12,identity:0,parcel:{vertices:[{x:x-30,y:370},{x:x+30,y:370},{x:x+30,y:430},{x:x-30,y:430}],holes:[]}};
   if(e.metadata.role==='residential')entity.identity=['home-long-ridge','home-steep-gable','home-low-hip','home-crooked-wing','home-offset-gables','home-porch-cabin'].indexOf(id);else{entity.type=e.metadata.role;entity.preferredVisualId=id;}
   const layer=await createBuildingLayer({scene,world,terrainSurface:surface,manifest,quality:document.querySelector('#quality').value,invalidate:draw});layers.push(layer);
   readView={schemaVersion:1,revision:++revision,world:{seed:'review'},houses:entity.type?[]:[entity],facilities:entity.type?[entity]:[],roads:[],localLanes:[]};await layer.update(readView,index?{cameraPositionGame:[400,30,0]}:{});
  }camera.position.set(70,65,110);camera.lookAt(0,8,0);
 }
 const positions=[];for(const tri of surface.drapePolygon([{x:world.width/2-120,y:world.depth/2-80},{x:world.width/2+120,y:world.depth/2-80},{x:world.width/2+120,y:world.depth/2+80},{x:world.width/2-120,y:world.depth/2+80}]))for(const p of [tri[0],tri[2],tri[1]])positions.push(p.x-world.width/2,surface.sample(p.x,p.y).height-.01,p.y-world.depth/2);
 const geometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();ground=new T.Mesh(geometry,new T.MeshStandardMaterial({color:'#859475',roughness:1,side:T.DoubleSide}));scene.add(ground);
 draw();const status=layers.map(l=>l.status()),before=JSON.stringify(state);document.querySelector('#status').textContent=JSON.stringify(status,null,2);window.p1={layers,scene,renderer,world,surface,readView,state,stats:()=>({layers:layers.map(l=>l.status()),render:renderer.info.render,memory:renderer.info.memory}),unchanged:()=>JSON.stringify(state)===before};document.body.dataset.ready='true';
}
select.onchange=()=>run();document.querySelector('#quality').onchange=()=>run();document.querySelector('#slope').onclick=()=>{slope=!slope;return run();};document.querySelector('#actual').onclick=()=>run(true);window.addEventListener('resize',draw);window.addEventListener('pagehide',()=>{for(const l of layers)l.dispose();renderer.dispose();});await run();
