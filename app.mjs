import {IS_PREVIEW,FLAGS,SAVE_KEY} from "./config.mjs";
import {WORLD,BUILDINGS,clamp,distance,nearestRoad,roadCost,roadLength,seedValue,monthLabel,startGame,validState,placeBuilding,addRoad,buildRoad,removeRoadNode,removeRoadSegment,reshapeRoadSegment,makeRoadIntersection,accessibleRoads,advance,advice} from "./simulation.mjs";
import {ensureGraph,nearestNode,nearestSegment,nodeAt,segmentAt,quadraticPoint,SNAP_RADIUS} from "./road-network.mjs";
import {gestureSegment} from "./road-gesture.mjs";
import {createRoadDraft,addRoadAnchor,undoRoadAction,beginRoadBend,updateRoadBend,roadDraftPath,flattenRoadDraft,curvedSegments,hitRoadSegment,canBeginCurve,HOLD_MS,MOVE_SLOP_PX,HIT_RADIUS_PX,MAX_ANCHORS} from "./road-editor.mjs";
const $=id=>document.getElementById(id),NS="http://www.w3.org/2000/svg",svg=$("map");
let game=readSave(),mode="explore",draft=createRoadDraft(),selectedBuild=null,liveGesture=null,liveCurve=null;
let camera={cx:525,cy:445,scale:1},pointers=new Map(),gesture=null,toastTimer;
function readSave(){try{const v=JSON.parse(localStorage.getItem(SAVE_KEY));if(validState(v)){ensureGraph(v);return v;}}catch(e){console.warn("Save unavailable",e);}return startGame();}
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(game));}catch(e){notify("Storage unavailable. Use Export Save to preserve progress.");}}
function num(v){return Math.round(v).toLocaleString();}
function notify(message){$("toast").textContent=message;$("toast").hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").hidden=true,3300);}
function setMode(next){mode=next;draft=createRoadDraft();selectedBuild=null;for(const [m,id] of Object.entries({explore:"exploreBtn",road:"roadsBtn",build:"buildBtn"}))$(id).classList.toggle("active",m===next);
 $("roadControls").hidden=next!=="road";$("modeLabel").textContent={explore:"Explore · drag to pan · pinch to zoom",road:"Roads · tap a node or hold and drag to draw",build:"Construction · tap clear ground to place"}[next];
 updateRoadInfo();renderMap();}
function updateRoadInfo(){const cost=roadCost(flattenRoadDraft(draft));
 $("roadInfo").textContent=draft.anchors.length<2?"Tap an existing node to branch, or hold and drag to draw a road.":draft.anchors.length+" nodes · "+num(cost)+" gold · tap for straight, hold and drag for a curve.";
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
 // Committed roads show persistent, editable nodes and curve handles.
 const graph=ensureGraph(game);
 for(const e of graph.segments){
   const a=nodeAt(graph,e.a),b=nodeAt(graph,e.b);
   if(!a||!b)continue;
   const geometry=e.control?"M "+a.x+" "+a.y+" Q "+(liveCurve?.id===e.id?liveCurve.control.x:e.control.x)+" "+(liveCurve?.id===e.id?liveCurve.control.y:e.control.y)+" "+b.x+" "+b.y:
     "M "+a.x+" "+a.y+" L "+b.x+" "+b.y;
   roadGraphic(svg,[a,b],false,geometry);
 }
 const previewPoints=flattenRoadDraft(draft);
 if(previewPoints.length>1)roadGraphic(svg,previewPoints,true,roadDraftPath(draft));
 if(liveGesture&&liveGesture.end)roadGraphic(svg,[liveGesture.start,liveGesture.end],true,liveGesture.control?
   "M "+liveGesture.start.x+" "+liveGesture.start.y+" Q "+liveGesture.control.x+" "+liveGesture.control.y+" "+liveGesture.end.x+" "+liveGesture.end.y:null);
 for(const bend of curvedSegments(draft)){
   svg.append(node("circle",{cx:bend.anchor.x,cy:bend.anchor.y,r:9,fill:"#ffcf7c",stroke:"#445c43","stroke-width":2}));
 }
 if(mode==="road"){
   for(const e of graph.segments){
     if(!e.control)continue;
     const a=nodeAt(graph,e.a),b=nodeAt(graph,e.b);
     const middle=quadraticPoint(a,liveCurve?.id===e.id?liveCurve.control:e.control,b,.5);
     svg.append(node("circle",{cx:middle.x,cy:middle.y,r:12,fill:"#f3b969",stroke:"#364c40","stroke-width":3}));
   }
   for(const n of graph.nodes)svg.append(node("circle",{cx:n.x,cy:n.y,r:11,fill:"#d6e4ce",stroke:n.id===graph.hubId?"#bc783d":"#345840","stroke-width":3}));
 }
 for(const p of draft.anchors)svg.append(node("circle",{cx:p.x,cy:p.y,r:11,fill:"#fff1c2",stroke:"#53664b","stroke-width":3}));
 for(const h of game.houses){svg.append(node("ellipse",{cx:h.x,cy:h.y+11,rx:20,ry:9,fill:"#445e3d",opacity:".25"}));
 svg.append(node("rect",{x:h.x-11,y:h.y-9,width:22,height:22,rx:2,fill:"#f2e2bc",stroke:"#aa9a78","stroke-width":1.3}));
 svg.append(node("path",{d:"M "+(h.x-16)+" "+(h.y-10)+" L "+h.x+" "+(h.y-23)+" L "+(h.x+16)+" "+(h.y-10)+" Z",fill:"#a67353",stroke:"#7e654b","stroke-width":1.4}));
 svg.append(node("rect",{x:h.x+2,y:h.y,width:4,height:13,fill:"#826c52"}));}
 for(const b of game.buildings){const shade={lumber:"#8f623c",farm:"#b98d49",smith:"#677777"}[b.type];const disconnected=nearestRoad(b,accessibleRoads(game))>125;
 svg.append(node("ellipse",{cx:b.x,cy:b.y+18,rx:28,ry:9,fill:"#455f3d",opacity:".33"}));
 svg.append(node("rect",{x:b.x-22,y:b.y-17,width:44,height:36,rx:3,fill:shade,stroke:disconnected?"#cf614c":"#fff1bb","stroke-width":disconnected?5:3}));
 svg.append(node("path",{d:"M "+(b.x-26)+" "+(b.y-17)+" L "+b.x+" "+(b.y-33)+" L "+(b.x+26)+" "+(b.y-17)+" Z",fill:"#6a503c",stroke:"#4e4838","stroke-width":2}));
 appendText(svg,{farm:"F",lumber:"L",smith:"T"}[b.type],b.x,b.y+11,24,"#fff2cb",{"font-family":"Georgia,serif","font-weight":"bold"});if(disconnected)appendText(svg,"!",b.x+26,b.y-28,31,"#c74734",{"font-weight":"bold"});}
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
function inspectPoint(p){const objects=[...game.buildings.map(b=>({...b,kind:"building"})),...game.houses.map(h=>({...h,kind:"house"}))].sort((a,b)=>distance(p,a)-distance(p,b));const item=objects[0];if(item&&distance(p,item)<35){const access=nearestRoad(item,accessibleRoads(game));const detail=item.kind==="house"?"Residents live here and need access to jobs and food.":BUILDINGS[item.type].description+" Road access: "+(access<=125?"Connected to the village, full production.":"DISCONNECTED: no production until you restore a connected road within reach.");openSheet(item.kind==="house"?"Village home":BUILDINGS[item.type].label,"<p>"+detail+"</p>");}}
const roadPixelRadius=()=>{const r=svg.getBoundingClientRect();return HIT_RADIUS_PX*(920/camera.scale)/r.width;};
function nodePanel(n){
 const el=document.createElement("div");
 const attached=game.roadGraph.segments.filter(e=>e.a===n.id||e.b===n.id).length;
 el.append(textNode("p","Existing road junction. "+attached+" connected segment(s). Roads can be extended or removed without refund."));
 sheetButton(el,"Extend road from here",()=>{
  draft=createRoadDraft();addRoadAnchor(draft,{x:n.x,y:n.y});
  closeSheet();updateRoadInfo();renderMap();notify("Tap to create straight segments, or hold and drag for a curve.");
 });
 if(n.id===game.roadGraph.hubId)el.append(textNode("p","The original village gateway is protected as the connection origin.","note"));
 else sheetButton(el,"Destroy this junction and attached segments",()=>{
  if(!confirm("Remove this road node and all "+attached+" attached segments? Industries may lose access. No refund."))return;
  const result=removeRoadNode(game,n.id);closeSheet();
  if(!result.ok){notify(result.reason);return;}
  draft=createRoadDraft();refresh();notify("Road junction removed, with no refund.");
 });
 openSheet("Existing road junction",el);
}
function segmentPanel(hit){
 const el=document.createElement("div");
 el.append(textNode("p","This road is already built. You can add an intersection, extend from it, or remove the segment."));
 sheetButton(el,"Insert a junction here and extend",()=>{
  const result=makeRoadIntersection(game,hit.segment.id,hit.t);if(!result.ok){notify(result.reason);return;}
  draft=createRoadDraft();addRoadAnchor(draft,{x:result.node.x,y:result.node.y});
  closeSheet();refresh();notify("Junction added. Tap or hold and drag to extend this road.");
 });
 sheetButton(el,"Destroy this segment (no refund)",()=>{
  if(!confirm("Destroy this existing road segment? Isolated roads and industries may stop functioning. No refund."))return;
  const outcome=removeRoadSegment(game,hit.segment.id);closeSheet();
  if(!outcome.ok){notify(outcome.reason);return;}
  draft=createRoadDraft();refresh();notify("Road removed. Check industry access.");
 });
 openSheet("Existing road segment",el);
}
function curvePanel(e){
 const el=document.createElement("div");
 el.append(textNode("p","This is an editable curve node. Press, hold, and drag the orange handle to reshape the built road."));
 sheetButton(el,"Straighten this segment",()=>{
  const outcome=reshapeRoadSegment(game,e.id,null);closeSheet();
  if(!outcome.ok){notify(outcome.reason);return;}
  refresh();notify("Curve straightened. No charge or refund.");
 });
 sheetButton(el,"Destroy this segment (no refund)",()=>{
  if(!confirm("Remove this curved road segment? No refund."))return;
  removeRoadSegment(game,e.id);closeSheet();refresh();
 });
 openSheet("Existing curve",el);
}
function hitBuiltCurve(p,radius){
 const g=game.roadGraph;let best=null,minimum=radius;
 for(const e of g.segments){
  if(!e.control)continue;
  const a=nodeAt(g,e.a),b=nodeAt(g,e.b),q=quadraticPoint(a,e.control,b,.5),d=distance(q,p);
  if(d<=minimum){minimum=d;best={segment:e,point:q};}
 }
 return best;
}
function handleTap(p){if(p.x<0||p.y<0||p.x>WORLD.w||p.y>WORLD.h)return;
 if(mode==="road"){
  const radius=roadPixelRadius(),near=nearestNode(game.roadGraph,p,radius);
  if(draft.anchors.length===0){
   if(near){nodePanel(near);return;}
   const curve=hitBuiltCurve(p,radius);
   if(curve){curvePanel(curve.segment);return;}
   const segment=nearestSegment(game.roadGraph,p,radius);
   if(segment){segmentPanel(segment);return;}
  }
  if(draft.anchors.length>=MAX_ANCHORS){notify("Road has reached its node limit.");return;}
  const chosen=near||p;
  if(!addRoadAnchor(draft,{x:Math.round(chosen.x),y:Math.round(chosen.y)})){notify("Tap inside the map.");return;}
  updateRoadInfo();renderMap();return;
 }
 if(mode==="build"){if(!selectedBuild){buildPanel();return;}const r=placeBuilding(game,selectedBuild,p);if(!r.ok){notify(r.reason);return;}refresh();notify(BUILDINGS[selectedBuild].label+" constructed.");selectedBuild=null;setMode("explore");return;}
 inspectPoint(p);
}
function clearHold(p){if(p.holdTimer!==null){clearTimeout(p.holdTimer);p.holdTimer=null;}}
function downPointer(e){
 if(e.pointerType==="mouse"&&e.button!==0)return;
 e.preventDefault();svg.setPointerCapture(e.pointerId);
 const down=mapPoint(e.clientX,e.clientY),radius=roadPixelRadius(),g=game.roadGraph;
 const n=mode==="road"?nearestNode(g,down,radius):null;
 const bend=mode==="road"&&!n&&draft.anchors.length===0?hitBuiltCurve(down,radius):null;
 const draftIndex=mode==="road"&&!n&&!bend?hitRoadSegment(draft,down,radius): -1;
 const hit={node:n,builtCurve:bend,segmentIndex:draftIndex};
 const p={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,down,moved:false,
  holdReady:false,holdTimer:null,curveActive:false,gestureActive:false,initialControl:null,hit,trail:[]};
 pointers.set(e.pointerId,p);
 if(pointers.size===2){
   for(const entry of pointers.values()){clearHold(entry);entry.holdReady=false;entry.moved=true;}
   const [a,b]=[...pointers.values()];gesture={distance:distance(a,b),scale:camera.scale};
 }else if(mode==="road"){
   p.holdTimer=setTimeout(()=>{
    if(pointers.size===1&&pointers.get(e.pointerId)===p&&!p.moved&&mode==="road"){
      p.holdReady=true;$("modeLabel").textContent="Road gesture active · drag to shape";
    }
   },HOLD_MS);
 }
}
function movePointer(e){
 const p=pointers.get(e.pointerId);if(!p)return;e.preventDefault();
 const dx=e.clientX-p.x,dy=e.clientY-p.y,travel=Math.hypot(e.clientX-p.startX,e.clientY-p.startY);
 p.x=e.clientX;p.y=e.clientY;
 if(pointers.size===2){
   const [a,b]=[...pointers.values()];
   if(gesture)camera.scale=clamp(gesture.scale*distance(a,b)/Math.max(gesture.distance,10),.75,3.8);
   renderMap();return;
 }
 if(mode==="road"&&p.holdReady&&travel>=MOVE_SLOP_PX){
   p.moved=true;clearHold(p);
   if(p.hit.segmentIndex>=0){
     if(!p.curveActive){p.initialControl=beginRoadBend(draft,p.hit.segmentIndex);p.curveActive=true;}
     updateRoadBend(draft,p.hit.segmentIndex,p.initialControl,p.down,mapPoint(e.clientX,e.clientY));
   }else if(p.hit.builtCurve){
     const eId=p.hit.builtCurve.segment.id,initial=p.hit.builtCurve.segment.control;
     const current=mapPoint(e.clientX,e.clientY);
     const c={x:clamp(initial.x+2*(current.x-p.down.x),0,WORLD.w),y:clamp(initial.y+2*(current.y-p.down.y),0,WORLD.h)};
     liveCurve={id:eId,control:c};p.curveActive=true;
   }else{
     const origin=draft.anchors.length?draft.anchors.at(-1):(p.hit.node||p.down);
     const current=mapPoint(e.clientX,e.clientY);
     p.trail.push(current);
     liveGesture=gestureSegment(origin,p.down,current,p.trail);
     p.gestureActive=true;
   }
   updateRoadInfo();renderMap();return;
 }
 if(travel>MOVE_SLOP_PX&&!p.holdReady){
   p.moved=true;clearHold(p);
   const rect=svg.getBoundingClientRect(),w=920/camera.scale;
   camera.cx-=dx/rect.width*w;camera.cy-=dy/rect.width*w*(rect.height/rect.width);
   renderMap();
 }
}
function endPointer(e){
 const p=pointers.get(e.pointerId);if(!p)return;
 clearHold(p);const tap=!p.moved&&!p.holdReady&&pointers.size===1;
 pointers.delete(e.pointerId);if(pointers.size<2)gesture=null;
 if(p.curveActive&&p.hit.builtCurve&&liveCurve){
   const outcome=reshapeRoadSegment(game,liveCurve.id,liveCurve.control);
   if(!outcome.ok)notify(outcome.reason);else refresh();
 }else if(p.gestureActive&&liveGesture&&mode==="road"){
   const geometry=liveGesture;
   const startCount=draft.anchors.length;
   if(!startCount)addRoadAnchor(draft,{x:Math.round(geometry.start.x),y:Math.round(geometry.start.y)});
   const near=nearestNode(game.roadGraph,geometry.end,roadPixelRadius()),endpoint=near||geometry.end;
   if(addRoadAnchor(draft,{x:Math.round(endpoint.x),y:Math.round(endpoint.y)})){
     const i=draft.controls.length-1;
     if(geometry.control)draft.controls[i]=geometry.control;
     if(!startCount&&draft.history.length>=2)draft.history.splice(draft.history.length-2,1);
   }
   updateRoadInfo();
 }
 liveGesture=null;liveCurve=null;
 if(mode==="road")$("modeLabel").textContent="Roads · tap a node or hold and drag to draw";
 if(tap)handleTap(mapPoint(e.clientX,e.clientY));
 renderMap();
}
function cancelPointer(e){const p=pointers.get(e.pointerId);if(p)clearHold(p);pointers.delete(e.pointerId);
 if(pointers.size<2)gesture=null;liveGesture=null;liveCurve=null;renderMap();}
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
$("confirmRoad").onclick=()=>{const r=buildRoad(game,draft.anchors,draft.controls);if(!r.ok){notify(r.reason);return;}draft=createRoadDraft();refresh();notify("Road built for "+r.cost+" gold.");};
$("nextBtn").onclick=()=>{const result=advance(game,{events:FLAGS.monthlyEvents});refresh();notify(monthLabel(game.turn)+": "+(result.populationDelta>=0?"+":"")+result.populationDelta+" residents, "+(result.balance>=0?"+":"")+result.balance+" gold.");};
$("importSave").addEventListener("change",async e=>{const f=e.target.files?.[0];if(!f)return;try{const imported=JSON.parse(await f.text());if(!validState(imported))throw Error("Unsupported or invalid save file.");if(!confirm("Replace this environment's current game with the imported save?"))return;game=imported;closeSheet();refresh();notify("Save imported successfully.");}catch(err){notify(err.message||"Could not import save.");}finally{e.target.value="";}});
window.addEventListener("resize",renderMap);
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSheet();});
setStats();save();requestAnimationFrame(renderMap);
