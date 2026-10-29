import {DEFAULT_WORLD,WORLD_PRESET_VERSION,WORLD_SIZES,
 normalizeWorldSettings,validWorldSettings,createWorld} from "../world-gen.mjs";
import {mountWorld3D} from "./render-3d.mjs";
const $=id=>document.getElementById(id);
const KEY="willow-valley:dev:world-blueprint-v1";
const profiles={
 balanced:{...DEFAULT_WORLD},
 pastoral:{...DEFAULT_WORLD,lakes:1,rivers:2,flatness:85,rolling:35,hills:12,cliffs:0,forest:35,waterLevel:42},
 alpine:{...DEFAULT_WORLD,lakes:2,rivers:2,flatness:12,rolling:72,hills:95,cliffs:85,forest:55,waterLevel:50},
 lake:{...DEFAULT_WORLD,lakes:4,rivers:1,flatness:65,rolling:43,hills:25,cliffs:18,forest:75,waterLevel:85}
};
const settings=Object.keys(DEFAULT_WORLD);
function readControls(){
 const values={};
 for(const k of settings){
  const input=$(k);
  values[k]=input?.type==="range"?Number(input.value):input?.value;
 }
 return normalizeWorldSettings(values);
}
function applyControls(source){
 const opts=normalizeWorldSettings(source);
 for(const k of settings){$(k).value=String(opts[k]);updateOutput(k);}
}
function updateOutput(field){
 const target=$(field+"Value");if(target)target.textContent=$(field).value;
}
function setStatus(message){$("worldStatus").textContent=message;}
function stat(label,value){
 const item=document.createElement("div"),name=document.createElement("small"),number=document.createElement("b");
 item.className="stat";name.textContent=label;number.textContent=String(value);
 item.append(name,number);return item;
}
let current,renderer=null,renderError=false;
function drawStats(world){
 let low=Infinity,high=-Infinity,wet=0;
 for(let z=0;z<=20;z++)for(let x=0;x<=25;x++){
  const s=world.sample(x/25*world.width,z/20*world.depth);
  low=Math.min(low,s.height);high=Math.max(high,s.height);
  if(s.water!==null)wet++;
 }
 $("worldStats").replaceChildren(
  stat("Map",world.width+" × "+world.depth),
  stat("Relief",Math.round(high-low)+" m"),
  stat("Water",Math.round(wet/(21*26)*100)+"%"),
  stat("Lakes",world.lakes.length),
  stat("Rivers",world.rivers.length),
  stat("Trees",world.trees.length)
 );
}
function generate(){
 try{
  const options=readControls();
  current=createWorld(options);
  if(renderer)renderer.setWorld(current);
  else if(!renderError){
   try{renderer=mountWorld3D($("worldCanvas"),current);}
   catch(err){renderError=true;$("rendererError").hidden=false;$("rendererError").textContent=err.message;}
  }
  drawStats(current);
  setStatus("Generated "+WORLD_SIZES[current.options.size].label+
   " · seed "+current.options.seed+". Review the terrain, then save its blueprint.");
 }catch(err){setStatus("World generation failed: "+err.message);}
}
function randomSeed(){
 if(typeof crypto!=="undefined"&&crypto.getRandomValues){
  const values=new Uint32Array(2);crypto.getRandomValues(values);
  return "WILLOW-"+values[0].toString(36).toUpperCase()+"-"+values[1].toString(36).toUpperCase();
 }
 return "WILLOW-"+Math.floor(Math.random()*1e9).toString(36).toUpperCase();
}
function save(){
 if(!current)return;
 const record={version:WORLD_PRESET_VERSION,options:current.options,
  signature:current.signature,savedAt:new Date().toISOString()};
 try{
  localStorage.setItem(KEY,JSON.stringify(record));
  setStatus("World blueprint saved on this device. Your existing settlement slots were not changed.");
 }catch{
  setStatus("Browser storage is unavailable or full. Your current world is still visible.");
 }
}
function restore(){
 try{
  const saved=JSON.parse(localStorage.getItem(KEY)||"null");
  if(saved?.version===WORLD_PRESET_VERSION&&validWorldSettings(saved.options)){
   applyControls(saved.options);
   $("profile").value="custom";
   return true;
  }
 }catch{/* Preserve corrupt/unreadable bytes for manual recovery. */}
 return false;
}
for(const key of settings){
 const field=$(key);
 field.addEventListener("input",()=>{
  updateOutput(key);
  if(key!=="seed"&&key!=="size")$("profile").value="custom";
 });
 field.addEventListener("change",()=>{
  if(key==="size")$("profile").value="custom";
 });
}
$("profile").addEventListener("change",event=>{
 if(event.target.value!=="custom")applyControls({...profiles[event.target.value],
  size:$("size").value,seed:$("seed").value});
});
$("newSeed").addEventListener("click",()=>{$("seed").value=randomSeed();generate();});
$("generate").addEventListener("click",generate);
$("saveBlueprint").addEventListener("click",save);
$("zoomIn").addEventListener("click",()=>renderer?.zoomBy(.8));
$("zoomOut").addEventListener("click",()=>renderer?.zoomBy(1.25));
$("resetCamera").addEventListener("click",()=>renderer?.resetCamera());
const recovered=restore();
generate();
if(recovered)setStatus("Restored your saved world blueprint. You can edit it and regenerate.");
