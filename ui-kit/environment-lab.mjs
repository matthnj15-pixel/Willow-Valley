import {createWorld} from '../world-gen.mjs';
import {mountWorld3D} from '../world-renderer-three.mjs';
const params=new URLSearchParams(location.search),$=id=>document.getElementById(id);
const seed=params.get('seed')||'WILLOW-1048',low=params.get('quality')==='low';$('seed').value=seed;$('quality').value=low?'low':'normal';
const world=createWorld({seed,size:'small',lakes:2,rivers:1,hills:70,cliffs:65});
const viewer=mountWorld3D($('environment'),world,{quality:low?'lite':'game',animateWater:params.get('motion')!=='off'});
// Find dry land for a geometry-only road fixture; uses existing road/junction authoring.
let center={x:world.width*.5,y:world.depth*.5},best=Infinity;
for(let z=100;z<world.depth-100;z+=30)for(let x=100;x<world.width-100;x+=30){
 const points=[{x:x-75,y:z},{x:x+75,y:z},{x,y:z-65},{x:x+45,y:z+65},{x,y:z}];
 if(points.every(p=>world.sample(p.x,p.y).water===null)&&world.slope(x,z)<best){best=world.slope(x,z);center={x,y:z};}
}
const {x,y}=center,nodes=[{id:1,x,y},{id:2,x:x-75,y},{id:3,x:x+75,y},{id:4,x,y:y-65},{id:5,x:x+45,y:y+65}];
const state={turn:2,houses:[],buildings:[],roads:[],roadGraph:{hubId:1,nodes,segments:[{id:1,a:1,b:2},{id:2,a:1,b:3,control:{x:x+50,y:y-20}},{id:3,a:1,b:4},{id:4,a:1,b:5}]},localLanes:[{points:[{x:x-75,y:y+30},{x:x-20,y:y+40}]}],zones:[],desirePaths:[]};viewer.setSettlement(state);
function focus(x,y,zoom,pitch=.65){viewer.focusOn(x,y,zoom);viewer.setCamera({...viewer.getCamera(),pitch,yaw:.6});}
$('wide').onclick=()=>focus(world.width*.5,world.depth*.5,world.depth*.7,.85);
$('near').onclick=()=>focus(center.x,center.y,150,.42);
$('junction').onclick=()=>focus(center.x,center.y,110,.78);
$('shore').onclick=()=>{let p=null;for(let z=30;z<world.depth&&!p;z+=8)for(let x=30;x<world.width;x+=8)if(world.sample(x,z).water!==null){p={x,y:z};break;}if(p)focus(p.x,p.y,180,.38);};
$('river').onclick=()=>{const r=world.rivers[0];if(r){const p=r.points[Math.floor(r.points.length*.55)];focus(p.x,p.z,120,.30);}};
$('lake').onclick=()=>{const lake=world.lakes.find(l=>world.sample(l.x,l.z).kind==='lake');if(lake)focus(lake.x,lake.z,230,.45);};
$('cliff').onclick=()=>{let p=center,slope=0;for(let z=30;z<world.depth;z+=20)for(let x=30;x<world.width;x+=20)if(world.sample(x,z).water===null&&world.slope(x,z)>slope){p={x,y:z};slope=world.slope(x,z);}focus(p.x,p.y,140,.4);};
for(const id of ['seed','quality'])$(id).onchange=()=>{params.set(id,$(id).value);location.search=params;};
$('wide').click();window.environmentHarness={viewer,world,state,center};window.addEventListener('pagehide',()=>viewer.dispose());
