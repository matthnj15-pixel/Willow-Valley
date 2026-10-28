import {IS_PREVIEW,FLAGS,SAVE_KEY} from "./config.mjs";
import {WORLD,BUILDINGS,clamp,distance,nearestRoad,roadCost,roadLength,seedValue,monthLabel,startGame,validState,placeBuilding,addRoad,advance,advice} from "./simulation.mjs";
import {createRoadDraft,addRoadAnchor,undoRoadAction,beginRoadBend,updateRoadBend,roadDraftPath,flattenRoadDraft,curvedSegments,hitRoadSegment,canBeginCurve,HOLD_MS,MOVE_SLOP_PX,HIT_RADIUS_PX,MAX_ANCHORS} from "./road-editor.mjs";
const $=id=>document.getElementById(id),NS="http://www.w3.org/2000/svg",svg=$("map");
let game=readSave(),mode="explore",draft=createRoadDraft(),selectedBuild=null;
let camera={cx:525,cy:445,scale:1},pointers=new Map(),gesture=null,toastTimer;
function readSave(){try{const v=JSON.parse(localStorage.getItem(SAVE_KEY));if(validState(v))return v;}catch(e){console.warn("Save unavailable",e);}return startGame();}
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(game));}catch(e){notify("Storage unavailable. Use Export Save to preserve progress.");}}
function num(v){return Math.round(v).toLocaleString();}
function notify(message){$("toast").textContent=message;$("toast").hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").hidden=true,3300);}
function setMode(next){mode=next;draft=createRoadDraft();selectedBuild=null;for(const [m,id] of Object.entries({explore:"exploreBtn",road:"roadsBtn",build:"buildBtn"}))$(id).classList.toggle("active",m===next);
 $("roadControls").hidden=next!=="road";$("modeLabel").textContent={explore:"Explore · drag to pan · pinch to zoom",road:"Roads · tap corners, hold a road and drag to bend",build:"Construction · tap clear ground to place"}[next];
 updateRoadInfo();renderMap();}
function updateRoadInfo(){const cost=roadCost(flattenRoadDraft(draft));
 $("roadInfo").textContent=draft.anchors.length<2?"Tap two points for a straight road. Hold and drag a segment to bend it.":draft.anchors.length+" nodes · "+num(cost)+" gold · hold and drag any segment to curve.";
 $("confirmRoad").disabled=draft.anchors.length<2;}
function setStats(){for(const id of ["people","gold","food","wood","tools"])$(id).textContent=num(game[id]);$("calendar").textContent=monthLabel(game.turn);$("environment").textContent=IS_PREVIEW?"DEVELOPMENT":"STABLE";$("report").textContent=game.report;}
function node(tag,attrs){const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));return n;}
function appendText(parent,text,x,y,size,fill="#fff",extras={}){const e=node("text",{x,y,"text-anchor":"middle",fill,"font-size":size,...extras});e.textContent=text;parent.append(e);return e;}
// Committed roads are polylines; explicit curves are previewed with SVG Q segments.
function path(points){return points.map((p,i)=>(i===0?"M ":" L ")+p.x+" "+p.y).join("");}
function roadGraphic(parent,pts,preview=false,explicitPath=null){if(pts.length<2)return;const d=explicitPath||path(pts);
 parent.append(node("path",{d,fill:"none",stroke:preview?"#ffe5ae":"#738267","stroke-width":preview?27:32,"stroke-linejoin":"round","stroke-linecap":"round",opacity:preview?.76:1}));
 parent.append(node("path",{d,fill:"none",stroke:preview?"#fbd18d":"#d4c395","stroke-width":preview?15:19,"stroke-linejoin":"round","stroke-linecap":"round","stroke-dasharray":preview?"15 12":"none"}));}
function riverX(y){return 875-90*Math.sin((y+80)/145)+35*Math.sin(y/66);}
function renderMap(){const rect=svg.getBoundingClientRect();if(!rect.width||!rect.height)return;
 const w=920/camera.scale,h=w*(rect.height/rect.width);
 camera.cx=w>=WORLD.w?WORLD.w/2:clamp(camera.cx,w/2,WORLD.w-w/2);
 camera.cy=h>=WORLD.h?WORLD.h/2:clamp(camera.cy,h/2,WORLD.h-h/2);
 svg.setAttribute("viewBox",[camera.cx-w/2,camera.cy-h/2,w,h].join(" "));svg.replaceChildren();
 const defs=node("defs",{}),g=node("linearGradient",{id:"ground",x1:"0",y1:"0",x2:"1",y2:"1"});
 g.append(node("stop",{offset:"0%","stop-color":"#c7d5a5"}),node("stop",{offset:"100%","stop-color":"#96b27b"}));defs.append(g);svg.append(defs);
 svg.append(node("rect",{x:0,y:0,width:WORLD.w,height:WORLD.h,fill:"url(#ground)"}));
 for(let i=0;i<22;i++){const x=seedValue(i+5)*WORLD.w,y=seedValue(i+107)*WORLD.h;
 svg.append(node("ellipse",{cx:x,cy:y,rx:60+seedValue(i+30)*95,ry:35+seedValue(i+44)*65,fill:i%2?"#a1bb85":"#b7c996",opacity:".48",transform:"rotate("+Math.round(seededAngle(i))+" "+x+" "+y+")"}));}
 // Shaded meadows and forest boundary.
 svg.append(node("path",{d:"M 0 0 L 710 0 Q 640 170 730 240 Q 690 300 800 310 L 670 300 Q 400 210 60 315 L 0 410 Z",fill:"#759e70",opacity:".21"}));
 let river="";for(let y=-30;y<=950;y+=15)river+=(y===-30?"M ":" L ")+riverX(y)+" "+y;
 svg.append(node("path",{d:river,fill:"none",stroke:"#6a9b95","stroke-width":122,"stroke-linejoin":"round","stroke-linecap":"round",opacity:".45"}));
 svg.append(node("path",{d:river,fill:"none",stroke:"#88bec4","stroke-width":91,"stroke-linejoin":"round","stroke-linecap":"round"}));
 svg.append(node("path",{d:river,fill:"none",stroke:"#c0dfd5","stroke-width":4,"stroke-linejoin":"round",opacity:".65","stroke-dasharray":"18 29"}));
 for(let i=0;i<190;i++){const x=18+seedValue(i+200)*1160,y=10+seedValue(i+510)*875;
 if((x>135&&x<730&&y>275&&y<660)||Math.abs(x-riverX(y))<77)continue;
 const r=8+seedValue(i+840)*12;
 svg.append(node("circle",{cx:x,cy:y,r:r,fill:i%4?"#527c55":"#456b4c",opacity:".88"}));
 svg.append(node("circle",{cx:x-r*.27,cy:y-r*.28,r:r*.72,fill:"#759869",opacity:".86"}));}
 for(const b of game.buildings)if(b.type==="farm"){svg.append(node("rect",{x:b.x-63,y:b.y-50,width:126,height:100,rx:5,fill:"#d9c58b",stroke:"#bea770","stroke-width":3,opacity:".81"}));for(let i=0;i<7;i++)svg.append(node("path",{d:"M "+(b.x-55)+" "+(b.y-38+i*12)+" l 110 0",stroke:"#a79d66","stroke-width":5,opacity:".65"}));}
 for(const r of game.roads)roadGraphic(svg,r);
 const previewPoints=flattenRoadDraft(draft);
 if(previewPoints.length>1)roadGraphic(svg,previewPoints,true,roadDraftPath(draft));
 // Each control handle indicates a user-authored, adjustable curve.
 for(const bend of curvedSegments(draft)){
   svg.append(node("path",{d:"M "+bend.anchor.x+" "+bend.anchor.y+" L "+bend.control.x+" "+bend.control.y,stroke:"#f7e3a3","stroke-width":2,"stroke-dasharray":"5 5",opacity:".8"}));
   svg.append(node("circle",{cx:bend.anchor.x,cy:bend.anchor.y,r:7,fill:"#ffe4a5",stroke:"#445c43","stroke-width":2}));
 }
 for(const p of draft.anchors)svg.append(node("circle",{cx:p.x,cy:p.y,r:11,fill:"#fff1c2",stroke:"#53664b","stroke-width":3}));
 for(const h of game.houses){svg.append(node("ellipse",{cx:h.x,cy:h.y+11,rx:20,ry:9,fill:"#445e3d",opacity:".25"}));
 svg.append(node("rect",{x:h.x-11,y:h.y-9,width:22,height:22,rx:2,fill:"#f2e2bc",stroke:"#aa9a78","stroke-width":1.3}));
 svg.append(node("path",{d:"M "+(h.x-16)+" "+(h.y-10)+" L "+h.x+" "+(h.y-23)+" L "+(h.x+16)+" "+(h.y-10)+" Z",fill:"#a67353",stroke:"#7e654b","stroke-width":1.4}));
 svg.append(node("rect",{x:h.x+2,y:h.y,width:4,height:13,fill:"#826c52"}));}
 for(const b of game.buildings){const shade={lumber:"#8f623c",farm:"#b98d49",smith:"#677777"}[b.type];
 svg.append(node("ellipse",{cx:b.x,cy:b.y+18,rx:28,ry:9,fill:"#455f3d",opacity:".33"}));
 svg.append(node("rect",{x:b.x-22,y:b.y-17,width:44,height:36,rx:3,fill:shade,stroke:"#fff1bb","stroke-width":3}));
 svg.append(node("path",{d:"M "+(b.x-26)+" "+(b.y-17)+" L "+b.x+" "+(b.y-33)+" L "+(b.x+26)+" "+(b.y-17)+" Z",fill:"#6a503c",stroke:"#4e4838","stroke-width":2}));
 appendText(svg,{farm:"F",lumber:"L",smith:"T"}[b.type],b.x,b.y+11,24,"#fff2cb",{"font-family":"Georgia,serif","font-weight":"bold"});}
 appendText(svg,"WILLOW VALLEY",475,265,25,"#416347",{"font-family":"Georgia,serif","letter-spacing":"3",opacity:".68"});
 const marker=node("circle",{cx:475,cy:286,r:3,fill:"#416347",opacity:".7"});svg.append(marker);
}
function seededAngle(i){return seedValue(i+60)*160;}
function zoom(factor){camera.scale=clamp(camera.scale*factor,.75,3.8);renderMap();}
function mapPoint(clientX,clientY){const r=svg.getBoundingClientRect(),w=920/camera.scale,h=w*(r.height/r.width);return{x:camera.cx-w/2+(clientX-r.left)/r.width*w,y:camera.cy-h/2+(clientY-r.top)/r.height*h};}
function refresh(){setStats();renderMap();updateRoadInfo();save();}
function openSheet(title,content){$("sheetTitle").textContent=title;const body=$("sheetBody");body.replaceChildren();if(typeof content==="string")body.innerHTML=content;else body.append(content);$("sheet").hidden=false;$("backdrop").hidden=false;}
function closeSheet(){$("sheet").hidden=true;$("backdrop").hidden=true;}
function sheetButton(parent,label,callback,cls="wide"){const b=document.createElement("button");b.className=cls;b.textContent=label;b.onclick=callback;parent.append(b);return b;}
function textNode(tag,content,cls){const e=document.createElement(tag);e.textContent=content;if(cls)e.className=cls;return e;}
function buildPanel(){setMode("build");const el=document.createElement("div");el.append(textNode("p","Choose an industry, then tap clear land on the map. Buildings near roads produce more efficiently."));
 for(const [key,b]of Object.entries(BUILDINGS)){
 const button=document.createElement("button");button.className="item";
 const info=document.createElement("span");info.append(textNode("b",b.label),textNode("small",b.description));
 button.append(info,textNode("span",b.gold+" gold\n"+b.wood+" wood · "+b.tools+" tools","price"));
 button.onclick=()=>{selectedBuild=key;closeSheet();$("modeLabel").textContent="Place "+b.label+" · tap clear land";notify("Tap the map to place "+b.label+".");};el.append(button);}
 openSheet("Construction",el);}
function menuPanel(){const el=document.createElement("div");el.append(textNode("p",IS_PREVIEW?"Development environment. Your save is isolated from the stable game.":"Stable environment. Your progress is stored locally on this device and browser."));
 sheetButton(el,"Export save as JSON",()=>{const blob=new Blob([JSON.stringify(game,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="willow-valley-"+(IS_PREVIEW?"dev":"stable")+"-turn-"+game.turn+".json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);notify("Save export started.");});
 sheetButton(el,"Import a saved game",()=>{$("importSave").click();});
 sheetButton(el,"Restart settlement",()=>{if(confirm("Start a new settlement in this environment? Export your save first if you want to keep it.")){game=startGame();refresh();closeSheet();notify("A new Willow Valley begins.");}});
 el.append(textNode("p","Feature flags: local advisor ON, remote AI OFF. No API credentials are stored in this page.","note"));
 openSheet("Your settlement",el);}
function advisorPanel(){const [headline,detail]=advice(game),el=document.createElement("div");el.append(textNode("p","Your council reviews the settlement's actual resource balances and infrastructure."));
 el.append(textNode("h3",headline),textNode("p",detail));
 el.append(textNode("p","This is a rule-based advisor. Live AI conversation is planned for a secure, authenticated backend. There is no OpenAI API key in the game.","note"));
 openSheet("The council advisor",el);}
function historyPanel(){const el=document.createElement("div");el.append(textNode("p","Significant milestones and monthly decisions in the life of Willow Valley."));const list=document.createElement("ol");for(const message of game.logs.slice(0,25))list.append(textNode("li",message));el.append(list);openSheet("Valley history",el);}
function inspectPoint(p){const objects=[...game.buildings.map(b=>({...b,kind:"building"})),...game.houses.map(h=>({...h,kind:"house"}))].sort((a,b)=>distance(p,a)-distance(p,b));const item=objects[0];if(item&&distance(p,item)<35){const access=nearestRoad(item,game.roads);const detail=item.kind==="house"?"Residents live here and need access to jobs and food.":BUILDINGS[item.type].description+" Road access: "+(access<=84?"Connected, full production.":"Too far from the road, half production.");openSheet(item.kind==="house"?"Village home":BUILDINGS[item.type].label,"<p>"+detail+"</p>");}}
function handleTap(p){if(p.x<0||p.y<0||p.x>WORLD.w||p.y>WORLD.h)return;
 if(mode==="road"){if(draft.anchors.length>=MAX_ANCHORS){notify("Road has reached its node limit.");return;}
 if(!addRoadAnchor(draft,{x:Math.round(p.x),y:Math.round(p.y)})){notify("Tap inside the map.");return;}
 updateRoadInfo();renderMap();return;}
 if(mode==="build"){if(!selectedBuild){buildPanel();return;}const r=placeBuilding(game,selectedBuild,p);if(!r.ok){notify(r.reason);return;}refresh();notify(BUILDINGS[selectedBuild].label+" constructed.");selectedBuild=null;setMode("explore");return;}
 inspectPoint(p);}
function clearHold(p){if(p.holdTimer!==null){clearTimeout(p.holdTimer);p.holdTimer=null;}}
function downPointer(e){
 if(e.pointerType==="mouse"&&e.button!==0)return;
 e.preventDefault();svg.setPointerCapture(e.pointerId);
 const rect=svg.getBoundingClientRect(),radius=HIT_RADIUS_PX*(920/camera.scale)/rect.width;
 const down=mapPoint(e.clientX,e.clientY);
 const index=mode==="road"?hitRoadSegment(draft,down,radius):-1;
 const p={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,down,moved:false,holdReady:false,holdTimer:null,curveActive:false,curveIndex:index,initialControl:null};
 pointers.set(e.pointerId,p);
 if(pointers.size===2){
   for(const entry of pointers.values()){clearHold(entry);entry.holdReady=false;entry.moved=true;}
   const [a,b]=[...pointers.values()];gesture={distance:distance(a,b),scale:camera.scale};
 }else if(index>=0&&e.pointerType!=="mouse"){
   // A quick swipe keeps panning the map. Only an intentional hold enables bending.
   p.holdTimer=setTimeout(()=>{
     if(pointers.size===1&&pointers.get(e.pointerId)===p&&!p.moved&&mode==="road"){
       p.holdReady=true;$("modeLabel").textContent="Curve selected · drag to bend this road";
     }
   },HOLD_MS);
 }else if(index>=0&&e.pointerType==="mouse"){
   // Desktop testing uses the same long-press behavior.
   p.holdTimer=setTimeout(()=>{
     if(pointers.size===1&&pointers.get(e.pointerId)===p&&!p.moved&&mode==="road"){
       p.holdReady=true;$("modeLabel").textContent="Curve selected · drag to bend this road";
     }
   },HOLD_MS);
 }
}
function movePointer(e){
 const p=pointers.get(e.pointerId);if(!p)return;e.preventDefault();
 const dx=e.clientX-p.x,dy=e.clientY-p.y;
 const travel=Math.hypot(e.clientX-p.startX,e.clientY-p.startY);
 p.x=e.clientX;p.y=e.clientY;
 if(pointers.size===2){
   const [a,b]=[...pointers.values()];
   if(gesture)camera.scale=clamp(gesture.scale*(distance(a,b)/Math.max(gesture.distance,10)),.75,3.8);
   renderMap();return;
 }
 if(canBeginCurve({mode,pointerCount:pointers.size,holdMs:p.holdReady?HOLD_MS:0,movementPx:travel,segmentIndex:p.curveIndex})){
   if(!p.curveActive){p.initialControl=beginRoadBend(draft,p.curveIndex);p.curveActive=true;}
   p.moved=true;clearHold(p);
   updateRoadBend(draft,p.curveIndex,p.initialControl,p.down,mapPoint(e.clientX,e.clientY));
   updateRoadInfo();renderMap();return;
 }
 if(travel>MOVE_SLOP_PX){
   p.moved=true;clearHold(p);
   const rect=svg.getBoundingClientRect(),w=920/camera.scale;
   camera.cx-=dx/rect.width*w;
   camera.cy-=dy/rect.width*w*(rect.height/rect.width);
   renderMap();
 }
}
function endPointer(e){
 const p=pointers.get(e.pointerId);if(!p)return;
 clearHold(p);
 const tap=!p.moved&&!p.holdReady&&pointers.size===1;
 const at=mapPoint(e.clientX,e.clientY);
 pointers.delete(e.pointerId);if(pointers.size<2)gesture=null;
 if(mode==="road"&&p.holdReady)$("modeLabel").textContent="Roads · tap corners, hold a road and drag to bend";
 if(tap)handleTap(at);
}
function cancelPointer(e){const p=pointers.get(e.pointerId);if(p)clearHold(p);pointers.delete(e.pointerId);if(pointers.size<2)gesture=null;}
svg.addEventListener("pointerdown",downPointer);
svg.addEventListener("pointermove",movePointer);
svg.addEventListener("pointerup",endPointer);
svg.addEventListener("pointercancel",cancelPointer);
$("zoomIn").onclick=()=>zoom(1.32);$("zoomOut").onclick=()=>zoom(1/1.32);
$("exploreBtn").onclick=()=>setMode("explore");
$("roadsBtn").onclick=()=>setMode("road");
$("buildBtn").onclick=()=>buildPanel();
$("advisorBtn").onclick=()=>advisorPanel();
$("menuBtn").onclick=()=>menuPanel();
$("historyBtn").onclick=()=>historyPanel();
$("closeSheet").onclick=closeSheet;$("backdrop").onclick=closeSheet;
$("undoRoad").onclick=()=>{undoRoadAction(draft);updateRoadInfo();renderMap();};
$("cancelRoad").onclick=()=>{draft=createRoadDraft();updateRoadInfo();renderMap();};
$("confirmRoad").onclick=()=>{const r=addRoad(game,flattenRoadDraft(draft));if(!r.ok){notify(r.reason);return;}draft=createRoadDraft();refresh();notify("Road built for "+r.cost+" gold.");};
$("nextBtn").onclick=()=>{const result=advance(game,{events:FLAGS.monthlyEvents});refresh();notify(monthLabel(game.turn)+": "+(result.populationDelta>=0?"+":"")+result.populationDelta+" residents, "+(result.balance>=0?"+":"")+result.balance+" gold.");};
$("importSave").addEventListener("change",async e=>{const f=e.target.files?.[0];if(!f)return;try{const imported=JSON.parse(await f.text());if(!validState(imported))throw Error("Unsupported or invalid save file.");if(!confirm("Replace this environment's current game with the imported save?"))return;game=imported;closeSheet();refresh();notify("Save imported successfully.");}catch(err){notify(err.message||"Could not import save.");}finally{e.target.value="";}});
window.addEventListener("resize",renderMap);
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSheet();});
setStats();requestAnimationFrame(renderMap);
