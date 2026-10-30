import {IS_PREVIEW,FLAGS,SAVE_KEY} from "./config.mjs";
import {worldBuilderUrl} from "./world-route.mjs";
import {initializeSlots,listSlots,readSlot,newSlot,saveSlot,selectSlot,renameSlot,appendJournal,diagnostics} from "./save-slots.mjs";
import {mountResourceBar,mountGameDock,createBuildRow,createButton,renderGameToast} from "./ui-components.mjs";
import {WORLD,BUILDINGS,clamp,distance,nearestRoad,roadCost,roadLength,seedValue,monthLabel,startGame,startWorldGame,configureWorldState,generatedWorld,validState,placeBuilding,addRoad,buildRoad,removeRoadNode,removeRoadSegment,reshapeRoadSegment,makeRoadIntersection,accessibleRoads,structureAccess,advance,housingOutlook} from "./simulation.mjs";
import {ensureGraph,nearestNode,nearestSegment,nodeAt,segmentAt,quadraticPoint,SNAP_RADIUS} from "./road-network.mjs";
import {radialCurveGesture} from "./road-gesture.mjs";
import {visibleDesirePaths} from "./desire-paths.mjs";
import {ZONE_TYPES,BRUSH_RADIUS,applyZoneEdits,zoneAt,elevationAt,slopeAt,viableLotEstimate} from "./organic-world.mjs";
import {terrainContours} from "./terrain-contours.mjs";
import {DEFAULT_WORLD} from "./world-gen.mjs";
import {mountWorld3D} from "./ui-kit/render-3d.mjs";
import {beginCameraGesture,advanceCameraGesture} from "./camera-gestures.mjs";
import {zoneSilhouette} from "./zone-silhouette.mjs";
import {createRoadDraft,addRoadAnchor,undoRoadAction,beginRoadBend,updateRoadBend,roadDraftPath,flattenRoadDraft,curvedSegments,hitRoadSegment,canBeginCurve,HOLD_MS,MOVE_SLOP_PX,HIT_RADIUS_PX,MAX_ANCHORS} from "./road-editor.mjs";
import {renderCouncil} from "./council-ui.mjs";
import {ensureCivic,CHARTERS,unlocked,pendingPetition} from "./settlement-play.mjs";
const $=id=>document.getElementById(id),NS="http://www.w3.org/2000/svg",svg=$("map");
mountResourceBar($("resourceBar"),[
 {label:"People",value:"32",iconName:"people",id:"people"},
 {label:"Treasury",value:"740",iconName:"gold",id:"gold"},
 {label:"Food",value:"66",iconName:"food",id:"food"},
 {label:"Wood",value:"20",iconName:"wood",id:"wood"},
 {label:"Tools",value:"9",iconName:"tools",id:"tools"}
],{compact:true});
mountGameDock($("gameDock"));
$("worldBuilderLink").hidden=!IS_PREVIEW;
$("worldBuilderLink").href=worldBuilderUrl(location.href);

const legacyRequested=new URLSearchParams(location.search).get("legacy")==="1";
const freshGame=()=>IS_PREVIEW&&!legacyRequested?startWorldGame(DEFAULT_WORLD):startGame();
const restored=initializeSlots(localStorage,SAVE_KEY,validState,freshGame);
let activeSlot=restored.ok?restored.active.slot:1;
let game=restored.ok?restored.active.state:freshGame();
let slotName=restored.ok?restored.active.name:"Unsaved settlement";
let journal=restored.ok?restored.active.events:[];
configureWorldState(game);
ensureGraph(game);
let mode="explore",draft=createRoadDraft(),selectedBuild=null,liveGesture=null,liveCurve=null,pendingControl=null;
let zoneType="residential",lastZonePaintType="residential",zoneTool="paint",zoneEdits=[],zoneRadius=BRUSH_RADIUS;
let camera={cx:525,cy:445,scale:1},pointers=new Map(),gesture=null,toastTimer;
let active3D=null,last3DKey="",worldLoadGeneration=0;
function showTerrainFailure(error){
 console.warn("3D world render failed; saved game preserved",error);
 $("terrainLoad").hidden=false;
 $("terrainLoadTitle").textContent="This 3D map could not load.";
 $("terrainLoadDetail").textContent=
  "Your settlement and Save Slot "+activeSlot+" are unchanged. Try lighter graphics.";
 $("retry3D").hidden=false;
}
function bootGameWorld({lite=false}={}){
 const sequence=++worldLoadGeneration;
 configureWorldState(game);
 if(active3D){active3D.dispose();active3D=null;}
 last3DKey="";
 $("terrainLoad").hidden=true;
 $("retry3D").hidden=true;
 $("reset3DCamera").hidden=true;
 $("cameraAngle").hidden=true;
 let world=null;
 try{world=generatedWorld(game);}
 catch(error){
  $("stage").classList.toggle("is-3d",!!game.worldOptions);
  $("game3D").hidden=!game.worldOptions;
  showTerrainFailure(error);return;
 }
 $("stage").classList.toggle("is-3d",!!world);
 $("game3D").hidden=!world;
 $("reset3DCamera").hidden=!world;
 $("cameraAngle").hidden=!world;
 if(!world)return;
 $("terrainLoad").hidden=false;
 $("terrainLoadTitle").textContent=lite?"Opening with lightweight graphics…":"Opening your 3D settlement…";
 $("terrainLoadDetail").textContent="Save Slot "+activeSlot+" is preserved.";
 let canvas=$("game3D");
 if(lite){
  // A lost WebGL context cannot be restored by requesting getContext again
  // on the same element; rebuild only the canvas, never the saved state.
  const replacement=canvas.cloneNode(false);
  canvas.replaceWith(replacement);canvas=replacement;
 }
 try{
  active3D=mountWorld3D(canvas,world,{
   interactive:false,quality:lite?"lite":"game",
   onReady:()=>{if(sequence===worldLoadGeneration)$("terrainLoad").hidden=true;},
   onError:error=>{if(sequence===worldLoadGeneration)showTerrainFailure(error);},
   onCamera:view=>{
    if(sequence!==worldLoadGeneration)return;
    $("cameraAngle").textContent=Math.round(view.pitch*180/Math.PI)+"°";
    $("stage").dataset.cameraYaw=String(view.yaw);
    $("stage").dataset.cameraPitch=String(view.pitch);
    $("stage").dataset.cameraZoom=String(view.zoom);
    $("stage").dataset.cameraFocusX=String(view.focusX);
    $("stage").dataset.cameraFocusZ=String(view.focusZ);
   }
  });
  const center=game.houses?.[0]||{x:world.width/2,y:world.depth/2};
  active3D.homeView(center.x+115,center.y,Math.min(500,world.depth*.42));
 }catch(error){
  showTerrainFailure(error);
 }
}
function save(){const result=saveSlot(localStorage,SAVE_KEY,activeSlot,game,journal,validState,slotName);
 if(!result.ok)notify(result.reason);return result.ok;}
function record(type,detail){journal=appendJournal(journal,type,game.turn,detail);save();}
function downloadJSON(data,filename){const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}

function num(v){return Math.round(v).toLocaleString();}
function notify(message){renderGameToast($("toast"),message);clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").hidden=true,3300);}
function setMode(next){mode=next;draft=createRoadDraft();pendingControl=null;selectedBuild=null;
 for(const [m,id] of Object.entries({explore:"exploreBtn",road:"roadsBtn",build:"buildBtn",zone:"zoneBtn"})){
  $(id).classList.toggle("active",m===next);$(id).setAttribute("aria-pressed",String(m===next));}
 $("roadControls").hidden=next!=="road";$("zoneControls").hidden=next!=="zone";
 $("stage").classList.toggle("is-zoning",next==="zone");
 $("modeLabel").textContent={explore:active3D?"3D · One finger pans · Two fingers roll the invisible trackball · Pinch zoom":"Explore · drag to pan · pinch to zoom",
  road:"Roads · tap for straight; hold and drag to shape a fixed node",
  build:"Construction · tap clear ground to place",
  zone:"Zoning · Move / Paint / Erase · Commit saves all changes"}[next];
 updateRoadInfo();updateZoneInfo();renderMap();}
function updateZoneInfo(){
 const label=zoneTool==="move"?"Move · drag with one finger to pan":
  zoneTool==="erase"?"Erase · remove zoning with one finger":
  "Paint "+lastZonePaintType+" · draw with one finger";
 $("zoneInfo").textContent=label+" · "+zoneEdits.length+" pending change(s)";
 $("zoneType").value=zoneTool==="erase"?"erase":lastZonePaintType;
 $("zoneRadius").value=String(zoneRadius);
 $("zoneRadiusValue").textContent=String(zoneRadius);
 $("zoneCommit").disabled=!zoneEdits.length;
 for(const [tool,id] of [["move","zoneMove"],["paint","zonePaint"],["erase","zoneEraser"]]){
  $(id).classList.toggle("active",zoneTool===tool);
  $(id).setAttribute("aria-pressed",String(zoneTool===tool));
 }
}
function setZoneTool(next){
 if(!["move","paint","erase"].includes(next))return;
 zoneTool=next;
 zoneType=next==="erase"?"erase":lastZonePaintType;
 $("modeLabel").textContent=next==="move"?"Zoning · drag to move the map":
  next==="erase"?"Zoning · erase · all changes pending until Commit":
  "Zoning · paint "+lastZonePaintType+" · all changes pending until Commit";
 updateZoneInfo();renderMap();
}
function updateRoadInfo(){const cost=roadCost(flattenRoadDraft(draft));
 $("roadInfo").textContent=draft.anchors.length<2?"Tap an existing node to branch; touch and hold a point to shape its curve.":draft.anchors.length+" nodes · "+num(cost)+" gold · held nodes stay fixed; finger shapes curve.";
 $("confirmRoad").disabled=draft.anchors.length<2;}
function setStats(){for(const id of ["people","gold","food","wood","tools"])$(id).textContent=num(game[id]);$("calendar").textContent=monthLabel(game.turn)+" · Slot "+activeSlot;$("environment").textContent=IS_PREVIEW?"DEVELOPMENT":"STABLE";$("report").textContent=game.report;const housing=housingOutlook(game);
 $("housingSummary").textContent="Homes "+housing.occupied+"/"+housing.capacity+" · Homeless "+housing.homeless+" · Appeal "+Math.round(housing.attractiveness);
 const civic=ensureCivic(game),petition=pendingPetition(game);$("civicStatus").textContent=(civic.chapter<3?CHARTERS[civic.chapter].name:"Chartered Borough")+" · Morale "+Math.round(game.happiness)+(petition?" · Petition waiting":"");}
function node(tag,attrs){const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));return n;}
function appendText(parent,text,x,y,size,fill="#fff",extras={}){const e=node("text",{x,y,"text-anchor":"middle",fill,"font-size":size,...extras});e.textContent=text;parent.append(e);return e;}
// Committed roads are polylines; explicit curves are previewed with SVG Q segments.
function path(points){return points.map((p,i)=>(i===0?"M ":" L ")+p.x+" "+p.y).join("");}
function roadGraphic(parent,pts,preview=false,explicitPath=null){if(pts.length<2)return;const d=explicitPath||path(pts);
 parent.append(node("path",{d,fill:"none",stroke:preview?"#ffe5ae":"#738267","stroke-width":preview?27:32,"stroke-linejoin":"round","stroke-linecap":"round",opacity:preview?.76:1}));
 parent.append(node("path",{d,fill:"none",stroke:preview?"#fbd18d":"#d4c395","stroke-width":preview?15:19,"stroke-linejoin":"round","stroke-linecap":"round","stroke-dasharray":preview?"15 12":"none"}));}
const CONTOURS=terrainContours();
const ZONE_COLORS={residential:"#d7a669",commercial:"#81a7ae",farmland:"#b4a650",preserve:"#6e9a67",erase:"#c85a4b"};
const zoneCache={source:null,roads:null,shapes:[]};
function zoneShape(d,type,preview=false){
 if(!d)return;
 svg.append(node("path",{d,fill:ZONE_COLORS[type]||ZONE_COLORS.residential,
  "fill-rule":"evenodd","fill-opacity":preview?".36":".24",
  stroke:preview?"#fff4d3":"#587354","stroke-opacity":preview?".98":".75",
  "stroke-width":preview?2.2:1.7,"stroke-dasharray":"7 6",
  "stroke-linecap":"round","stroke-linejoin":"round",
  "class":preview?"zone-pending":"zone-committed"}));
}
function drawZones(){
 if(zoneCache.source!==game.zones||zoneCache.roads!==game.roads){
  const groups=new Map();
  for(const z of game.zones||[]){
   if(z.type==="erase")continue;
   if(!groups.has(z.type))groups.set(z.type,[]);
   groups.get(z.type).push(z);
  }
  zoneCache.shapes=[...groups].map(([type,zones])=>({
   type,d:zoneSilhouette(zones,5,p=>zoneAt(game,p)===type)
  }));
  zoneCache.source=game.zones;zoneCache.roads=game.roads;
 }
 for(const shape of zoneCache.shapes)zoneShape(shape.d,shape.type);
 if(mode!=="zone"||!zoneEdits.length)return;
 // Preview the entire transaction in draw order. The committed state remains
 // unchanged while the user switches between Paint, Move and Erase.
 for(let i=0;i<zoneEdits.length;i++){
  const edit=zoneEdits[i],before=applyZoneEdits(game,zoneEdits.slice(0,i));
  const current=before.ok?{...game,zones:before.zones}:game;
  const after=applyZoneEdits(game,zoneEdits.slice(0,i+1));
  const proposed=after.ok?{...game,zones:after.zones}:current;
  const match=edit.type==="erase"?p=>zoneAt(current,p)!==null:
   p=>zoneAt(proposed,p)===edit.type;
  zoneShape(zoneSilhouette([edit],5,match),edit.type,true);
 }
}
function riverX(y){return 875-90*Math.sin((y+80)/145)+35*Math.sin(y/66);}
function renderMap(){
 if(active3D){
  const key=JSON.stringify([game.turn,game.roads,game.houses,game.buildings,game.zones,
   game.localLanes,draft.anchors,draft.controls,zoneEdits,zoneType,zoneRadius,
   mode,liveCurve,liveGesture,pendingControl]);
  if(last3DKey!==key){
   last3DKey=key;active3D.setSettlement(game,{
    draft,zoneEdits,zoneType,zoneRadius,mode,liveCurve,liveGesture,pendingControl
   });
  }else active3D.render();
  svg.setAttribute("viewBox",[0,0,WORLD.w,WORLD.h].join(" "));svg.replaceChildren();
  return;
 }
 const rect=svg.getBoundingClientRect();if(!rect.width||!rect.height)return;
 const w=920/camera.scale,h=w*(rect.height/rect.width);
 camera.cx=w>=WORLD.w?WORLD.w/2:clamp(camera.cx,w/2,WORLD.w-w/2);
 camera.cy=h>=WORLD.h?WORLD.h/2:clamp(camera.cy,h/2,WORLD.h-h/2);
 svg.setAttribute("viewBox",[camera.cx-w/2,camera.cy-h/2,w,h].join(" "));svg.replaceChildren();
 const defs=node("defs",{}),g=node("linearGradient",{id:"ground",x1:"0",y1:"0",x2:"1",y2:"1"});
 g.append(node("stop",{offset:"0%","stop-color":"#c7d5a5"}),node("stop",{offset:"100%","stop-color":"#96b27b"}));defs.append(g);svg.append(defs);
 svg.append(node("rect",{x:0,y:0,width:WORLD.w,height:WORLD.h,fill:"url(#ground)"}));
 for(let i=0;i<22;i++){const x=seedValue(i+5)*WORLD.w,y=seedValue(i+107)*WORLD.h;
 svg.append(node("ellipse",{cx:x,cy:y,rx:60+seedValue(i+30)*95,ry:35+seedValue(i+44)*65,fill:i%2?"#a1bb85":"#b7c996",opacity:".48",transform:"rotate("+Math.round(seededAngle(i))+" "+x+" "+y+")"}));}
 // Contours make terrain slopes legible before the full 3D renderer ships.
 // Cached paths are intentionally subtle and never regenerated while panning.
 for(const contour of CONTOURS)svg.append(node("path",{
  d:contour.d,fill:"none",stroke:"#5a7457","stroke-width":contour.level===0?1.9:1.2,
  opacity:contour.level===0?".24":".15","pointer-events":"none"}));
 // Shaded meadows and forest boundary.
 svg.append(node("path",{d:"M 0 0 L 710 0 Q 640 170 730 240 Q 690 300 800 310 L 670 300 Q 400 210 60 315 L 0 410 Z",fill:"#759e70",opacity:".21"}));
 let river="";for(let y=-30;y<=950;y+=15)river+=(y===-30?"M ":" L ")+riverX(y)+" "+y;
 svg.append(node("path",{d:river,fill:"none",stroke:"#6a9b95","stroke-width":122,"stroke-linejoin":"round","stroke-linecap":"round",opacity:".45"}));
 svg.append(node("path",{d:river,fill:"none",stroke:"#88bec4","stroke-width":91,"stroke-linejoin":"round","stroke-linecap":"round"}));
 svg.append(node("path",{d:river,fill:"none",stroke:"#c0dfd5","stroke-width":4,"stroke-linejoin":"round",opacity:".65","stroke-dasharray":"18 29"}));
 drawZones();
 for(let i=0;i<190;i++){const x=18+seedValue(i+200)*1160,y=10+seedValue(i+510)*875;
 if((x>135&&x<730&&y>275&&y<660)||Math.abs(x-riverX(y))<77)continue;
 const r=8+seedValue(i+840)*12;
 svg.append(node("circle",{cx:x,cy:y,r:r,fill:i%4?"#527c55":"#456b4c",opacity:".88"}));
 svg.append(node("circle",{cx:x-r*.27,cy:y-r*.28,r:r*.72,fill:"#759869",opacity:".86"}));}
 for(const b of game.buildings)if(b.type==="farm"){svg.append(node("rect",{x:b.x-63,y:b.y-50,width:126,height:100,rx:5,fill:"#d9c58b",stroke:"#bea770","stroke-width":3,opacity:".81"}));for(let i=0;i<7;i++)svg.append(node("path",{d:"M "+(b.x-55)+" "+(b.y-38+i*12)+" l 110 0",stroke:"#a79d66","stroke-width":5,opacity:".65"}));}
 // Existing footpaths are historic artifacts: new cottages join their
 // public ends rather than drawing an impassable shortcut through a house.
 for(const lane of game.localLanes||[]){
  if(!Array.isArray(lane.points)||lane.points.length<2)continue;
  svg.append(node("path",{d:path(lane.points),fill:"none",stroke:"#735a3b",
   "stroke-width":11,"stroke-linejoin":"round","stroke-linecap":"round",opacity:".20"}));
  svg.append(node("path",{d:path(lane.points),fill:"none",stroke:"#ab8a58",
   "stroke-width":5,"stroke-linejoin":"round","stroke-linecap":"round",
   "stroke-dasharray":"12 5",opacity:".90"}));
  if(lane.entrance)svg.append(node("path",{
   d:path([{x:lane.houseX,y:lane.houseY},lane.entrance]),
   fill:"none",stroke:"#c7a878","stroke-width":4,"stroke-linecap":"round",
   "stroke-dasharray":"3 4",opacity:".9"}));
 }
 // Committed roads show persistent, editable nodes and curve handles.
 const graph=ensureGraph(game);
 // Pedestrian shortcuts grow after the month advances. They are not roads.
 for(const trail of visibleDesirePaths(game)){
   svg.append(node("path",{d:"M "+trail.from.x+" "+trail.from.y+" L "+trail.to.x+" "+trail.to.y,
    fill:"none",stroke:"#9f8256","stroke-width":6,"stroke-dasharray":"7 9","stroke-linecap":"round",opacity:".9"}));
 }
 for(const e of graph.segments){
   const a=nodeAt(graph,e.a),b=nodeAt(graph,e.b);
   if(!a||!b)continue;
   const geometry=e.control?"M "+a.x+" "+a.y+" Q "+(liveCurve?.id===e.id?liveCurve.control.x:e.control.x)+" "+(liveCurve?.id===e.id?liveCurve.control.y:e.control.y)+" "+b.x+" "+b.y:
     "M "+a.x+" "+a.y+" L "+b.x+" "+b.y;
   roadGraphic(svg,[a,b],false,geometry);
 }
 const previewPoints=flattenRoadDraft(draft);
 if(previewPoints.length>1)roadGraphic(svg,previewPoints,true,roadDraftPath(draft));
 if(liveGesture&&liveGesture.end){
   if(distance(liveGesture.start,liveGesture.end)>8)roadGraphic(svg,[liveGesture.start,liveGesture.end],true,
    "M "+liveGesture.start.x+" "+liveGesture.start.y+" Q "+liveGesture.control.x+" "+liveGesture.control.y+" "+liveGesture.end.x+" "+liveGesture.end.y);
   svg.append(node("path",{d:"M "+liveGesture.end.x+" "+liveGesture.end.y+" L "+liveGesture.control.x+" "+liveGesture.control.y,
      stroke:"#ffdf95","stroke-width":3,"stroke-dasharray":"4 6"}));
   svg.append(node("circle",{cx:liveGesture.end.x,cy:liveGesture.end.y,r:12,fill:"#fff0bd",stroke:"#3e6047","stroke-width":3}));
   svg.append(node("circle",{cx:liveGesture.control.x,cy:liveGesture.control.y,r:9,fill:"#ffae61",stroke:"#543e32","stroke-width":2}));
 }
 if(pendingControl&&draft.anchors.length){
   const anchor=draft.anchors.at(-1);
   svg.append(node("path",{d:"M "+anchor.x+" "+anchor.y+" L "+pendingControl.x+" "+pendingControl.y,
    stroke:"#ffdf95","stroke-width":3,"stroke-dasharray":"4 6"}));
   svg.append(node("circle",{cx:pendingControl.x,cy:pendingControl.y,r:9,fill:"#ffae61",stroke:"#543e32","stroke-width":2}));
 }
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
 for(const h of game.houses){const access=structureAccess(game,h);
 if(h.parcel){
  svg.append(node("polygon",{points:h.parcel.vertices.map(p=>p.x+","+p.y).join(" "),
   fill:"#bfd49c","fill-opacity":mode==="zone"?".10":".16",
   stroke:mode==="zone"?"#607d5b":"none","stroke-width":1.5,
   "stroke-dasharray":"7 5"}));
 }
svg.append(node("ellipse",{cx:h.x,cy:h.y+11,rx:20,ry:9,fill:"#445e3d",opacity:".25"}));
 // Keep 2D cottage roofs upright while retaining true lot orientation for 3D.
 const tilt=clamp(Math.atan(Math.tan(h.orientation||0)),-Math.PI/8,Math.PI/8);
 const homeLayer=node("g",{transform:"rotate("+Math.round(tilt*180/Math.PI)+" "+h.x+" "+h.y+")"});svg.append(homeLayer);
 homeLayer.append(node("rect",{x:h.x-11,y:h.y-9,width:22,height:22,rx:2,fill:"#f2e2bc",stroke:access==="road"?"#aa9a78":access==="footpath"?"#e6a34d":"#c54f43","stroke-width":access==="road"?1.3:4}));
 homeLayer.append(node("path",{d:"M "+(h.x-16)+" "+(h.y-10)+" L "+h.x+" "+(h.y-23)+" L "+(h.x+16)+" "+(h.y-10)+" Z",fill:"#a67353",stroke:"#7e654b","stroke-width":1.4}));
 homeLayer.append(node("rect",{x:h.x+2,y:h.y,width:4,height:13,fill:"#826c52"}));
 if(access!=="road")appendText(svg,access==="footpath"?"~":"!",h.x+18,h.y-21,27,access==="footpath"?"#e4a34e":"#b93434",{"font-weight":"bold"});}
 for(const b of game.buildings){const shade={lumber:"#8f623c",farm:"#b98d49",smith:"#677777",park:"#658c57",plaza:"#b6a77d"}[b.type]||"#a18b68";const access=structureAccess(game,b),disconnected=access!=="road";
 svg.append(node("ellipse",{cx:b.x,cy:b.y+18,rx:28,ry:9,fill:"#455f3d",opacity:".33"}));
 svg.append(node("rect",{x:b.x-22,y:b.y-17,width:44,height:36,rx:3,fill:shade,stroke:access==="road"?"#fff1bb":access==="footpath"?"#e5a14b":"#cf614c","stroke-width":disconnected?5:3}));
 svg.append(node("path",{d:"M "+(b.x-26)+" "+(b.y-17)+" L "+b.x+" "+(b.y-33)+" L "+(b.x+26)+" "+(b.y-17)+" Z",fill:"#6a503c",stroke:"#4e4838","stroke-width":2}));
 appendText(svg,{farm:"F",lumber:"L",smith:"T",park:"P",plaza:"S"}[b.type],b.x,b.y+11,24,"#fff2cb",{"font-family":"Georgia,serif","font-weight":"bold"});if(disconnected)appendText(svg,access==="footpath"?"~":"!",b.x+26,b.y-28,31,access==="footpath"?"#e5a14b":"#c74734",{"font-weight":"bold"});}
 appendText(svg,"WILLOW VALLEY",475,265,25,"#416347",{"font-family":"Georgia,serif","letter-spacing":"3",opacity:".68"});
 const marker=node("circle",{cx:475,cy:286,r:3,fill:"#416347",opacity:".7"});svg.append(marker);
}
function seededAngle(i){return seedValue(i+60)*160;}
function zoom(factor){if(active3D){active3D.zoomBy(1/factor);return;}
 camera.scale=clamp(camera.scale*factor,.75,3.8);renderMap();}
function mapPoint(clientX,clientY){
 if(active3D)return active3D.screenToWorld(clientX,clientY)||{x:-1,y:-1};
 const r=svg.getBoundingClientRect(),w=920/camera.scale,h=w*(r.height/r.width);
 return{x:camera.cx-w/2+(clientX-r.left)/r.width*w,y:camera.cy-h/2+(clientY-r.top)/r.height*h};
}
function chooseZoneType(type){
 if(type!=="erase"&&!ZONE_TYPES.includes(type))return;
 if(type!=="erase")lastZonePaintType=type;
 if(mode!=="zone")setMode("zone");
 setZoneTool(type==="erase"?"erase":"paint");
}
function refresh(){setStats();renderMap();updateRoadInfo();save();}
function openSheet(title,content){$("sheetTitle").textContent=title;const body=$("sheetBody");body.replaceChildren();if(typeof content==="string")body.innerHTML=content;else body.append(content);$("sheet").hidden=false;$("backdrop").hidden=false;}
function closeSheet(){$("sheet").hidden=true;$("backdrop").hidden=true;}
function sheetButton(parent,label,callback,cls="wide"){const b=createButton({label,variant:cls==="danger"?"danger":"secondary",onClick:callback});b.classList.add(cls);parent.append(b);return b;}
function textNode(tag,content,cls){const e=document.createElement(tag);e.textContent=content;if(cls)e.className=cls;return e;}
function buildPanel(){setMode("build");const el=document.createElement("div");el.append(textNode("p","Choose an industry, then tap clear land on the map. Buildings near roads produce more efficiently."));
 for(const [key,b]of Object.entries(BUILDINGS)){
 const locked=!unlocked(game,key);
 const button=createBuildRow({title:b.label+(locked?" · Locked":""),description:b.description,
 cost:b.gold+" gold · "+b.wood+" wood · "+b.tools+" tools",
 iconName:key==="lumber"?"wood":key==="farm"?"food":key==="park"?"tree":key==="plaza"?"people":key==="smith"?"tools":"house",
 onClick:()=>{selectedBuild=key;closeSheet();$("modeLabel").textContent="Place "+b.label+" · tap clear land";notify("Tap the map to place "+b.label+".");}});
 button.disabled=locked;el.append(button);}
 openSheet("Construction",el);}
function zoningPanel(){const el=document.createElement("div");
 el.append(textNode("p","Use Move to drag the map, Paint to fill land, and Erase to remove zoning. Switch freely; Commit saves the entire batch."));
 for(const type of [...ZONE_TYPES,"erase"]){
  sheetButton(el,(type==="erase"?"Erase zoning":"Paint "+type.charAt(0).toUpperCase()+type.slice(1)),()=>{
   chooseZoneType(type);closeSheet();
   notify("Zoning "+type+": edit the map, then Commit all changes.");
  });
 }
 el.append(textNode("p","Paint fields near farms to improve harvests. Marketplaces require Commercial zoning and your first charter. Preserves protect organic village space.","note"));
 openSheet("Paint the landscape",el);}
function housingPanel(){const el=document.createElement("div"),h=housingOutlook(game);
 el.append(textNode("p","Homes grow inside committed Residential land only when a family needs one. Homeless households leave after two additional monthly turns."));
 for(const [label,value] of [
  ["Residents housed",h.occupied],["Existing dwelling capacity",h.capacity],
  ["Vacant housing spaces",h.vacancies],["Viable new cottage sites (estimate)",viableLotEstimate(game,8)],
  ["Homeless residents",h.homeless],["Households waiting",h.homelessHouseholds],
  ["Immigration attractiveness",Math.round(h.attractiveness)+" / 100"],
  ["Expected next household",h.nextArrival===null?"Immigration paused":monthLabel(h.nextArrival)+" (if supplied)"],
  ["Arrival cadence",h.arrivalInterval?h.arrivalInterval+" month(s)":"Paused until appeal and morale recover"]]){
  const row=document.createElement("div");row.className="housing-metric";row.append(textNode("span",label),textNode("strong",String(value)));el.append(row);
 }
 if(h.homelessHouseholds)el.append(textNode("p",game.housing.pending.map(g=>"Family "+g.id+": "+(2-g.wait)+" turn(s) before departure").join(" · "),"note"));
 sheetButton(el,"Paint residential zoning",()=>{chooseZoneType("residential");closeSheet();});
 openSheet("Housing demand",el);}
function councilPanel(tab="progress"){
 openSheet("Settlement Council",renderCouncil(game,tab,t=>councilPanel(t),(result,type,detail,returnTab)=>{
  if(!result?.ok){notify(result?.reason||"The council could not complete that action.");return;}
  record(type,detail);refresh();councilPanel(returnTab);
  notify("Council decision saved.");
 }));
}
function slotPanel(){const el=document.createElement("div");
 el.append(textNode("p","Three independent local settlements. Each slot saves automatically. Your original pre-slot save remains untouched as a backup."));
 for(const entry of listSlots(localStorage,SAVE_KEY,validState)){
  if(entry.status==="corrupt"){el.append(textNode("p","Slot "+entry.slot+": unreadable. Original data preserved; export browser storage before repair.","note"));continue;}
  const label=entry.status==="ready"?
   "Slot "+entry.slot+" · "+entry.name+" · Year "+(1+Math.floor(entry.state.turn/12))+" · "+entry.state.people+" residents"+(entry.slot===activeSlot?" (current)":""):
   "Slot "+entry.slot+" · Empty — start a settlement";
  sheetButton(el,label,()=>{
   if(entry.slot===activeSlot&&entry.status==="ready"){closeSheet();return;}
   if(!save())return;
   if(entry.status==="empty"){
    const created=newSlot(localStorage,SAVE_KEY,entry.slot,freshGame(),validState);
    if(!created.ok){notify(created.reason);return;}
   }
   const chosen=readSlot(localStorage,SAVE_KEY,entry.slot,validState);
   if(chosen.status!=="ready"){notify("Could not open this settlement.");return;}
   const selected=selectSlot(localStorage,SAVE_KEY,entry.slot,validState);
   if(!selected.ok){notify(selected.reason);return;}
   activeSlot=entry.slot;game=chosen.state;slotName=chosen.name;journal=chosen.events;
    bootGameWorld();
   ensureGraph(game);setMode("explore");closeSheet();refresh();notify("Opened "+slotName+".");
  });
 }
 sheetButton(el,"Rename active settlement",()=>{
  const requested=prompt("Settlement name",slotName);
  if(requested===null||!requested.trim())return;
  const result=renameSlot(localStorage,SAVE_KEY,activeSlot,requested,validState);
  if(!result.ok){notify(result.reason);return;}
  slotName=requested.trim().slice(0,48);record("settlement_renamed","Changed name to "+slotName);slotPanel();
 });
 sheetButton(el,"Export diagnostic journal",()=>{
  downloadJSON(diagnostics(game,journal,activeSlot,IS_PREVIEW?"development":"stable"),
  "willow-valley-"+(IS_PREVIEW?"dev":"stable")+"-slot-"+activeSlot+"-diagnostics.json");
  notify("Diagnostic export started. Your data stays local unless you share it.");
 });
 openSheet("Settlement slots",el);
}
function menuPanel(){const el=document.createElement("div");
 el.append(textNode("p",IS_PREVIEW?"Development environment. Your saves are isolated from the stable game.":"Stable environment. Your settlements are stored locally on this device and browser."));
 sheetButton(el,"Manage 3 settlement slots",()=>slotPanel());
 if(IS_PREVIEW)sheetButton(el,"New World · 3D terrain generator",()=>{location.assign(worldBuilderUrl(location.href));});
 sheetButton(el,"Paint zoning · residential, commercial, farming, preserves",()=>zoningPanel());
 sheetButton(el,"Housing demand · vacancies and homelessness",()=>housingPanel());
 sheetButton(el,"Settlement Council · progression, economy, decisions",()=>councilPanel());
 sheetButton(el,"Export current slot as JSON",()=>{
  downloadJSON(game,"willow-valley-"+(IS_PREVIEW?"dev":"stable")+"-slot-"+activeSlot+"-turn-"+game.turn+".json");
  notify("Save export started.");
 });
 sheetButton(el,"Import a saved game",()=>{$("importSave").click();});
 if(IS_PREVIEW&&location.protocol!=="file:"){
   const kit=document.createElement("a");kit.href="./ui-kit/";kit.className="download-link";
   kit.textContent="View the living UI kit";kit.setAttribute("aria-label","Open the interactive Willow Valley design system");el.append(kit);
 }
 if(location.protocol!=="file:"){
   const link=document.createElement("a");link.href="./offline.html";link.download="Willow-Valley-Offline.html";
   link.className="download-link";link.textContent="Download offline HTML edition";
   link.setAttribute("aria-label","Download the standalone HTML game for offline use");el.append(link);
 }
 sheetButton(el,"Restart current settlement",()=>{
  if(!confirm("Replace only Slot "+activeSlot+"? Its current progress will be lost unless you export it first. Other slots are safe."))return;
  const fresh=freshGame(),created=newSlot(localStorage,SAVE_KEY,activeSlot,fresh,validState,slotName,{overwrite:true});
  if(!created.ok){notify(created.reason);return;}
  game=fresh;journal=readSlot(localStorage,SAVE_KEY,activeSlot,validState).events;
   bootGameWorld();
  closeSheet();setMode("explore");refresh();notify("A new Willow Valley begins in Slot "+activeSlot+".");
 });
 el.append(textNode("p","All settlements and diagnostics remain offline on this device. Export files for backups or when reporting bugs.","note"));
 openSheet("Your settlement",el);}
function historyPanel(){const el=document.createElement("div");el.append(textNode("p","Significant milestones and monthly decisions in the life of Willow Valley."));const list=document.createElement("ol");for(const message of game.logs.slice(0,25))list.append(textNode("li",message));el.append(list);openSheet("Valley history",el);}
function inspectPoint(p){const objects=[...game.buildings.map(b=>({...b,kind:"building"})),...game.houses.map(h=>({...h,kind:"house"}))].sort((a,b)=>distance(p,a)-distance(p,b));const item=objects[0];if(item&&distance(p,item)<35){const access=structureAccess(game,item);const detail=item.kind==="house"?"Household access: "+(access==="road"?"Connected to the town road network.":access==="footpath"?"Only a walking desire path connects this home; services and tax revenue are limited.":"DISCONNECTED. The household cannot receive normal services or contribute full taxes."):"Structure access: "+(access==="road"?"Connected to the road network.":access==="footpath"?"Footpath access only. This does not support full service or deliveries.":"DISCONNECTED: no road service or industrial deliveries.");openSheet(item.kind==="house"?"Village home":BUILDINGS[item.type].label,"<p>"+detail+"</p>");}}
const roadPixelRadius=()=>{
 if(active3D){const r=svg.getBoundingClientRect(),center=mapPoint(r.left+r.width/2,r.top+r.height/2);
  const other=mapPoint(r.left+r.width/2+HIT_RADIUS_PX,r.top+r.height/2);
  return distance(center,other);}
 const r=svg.getBoundingClientRect();return HIT_RADIUS_PX*(920/camera.scale)/r.width;
};
function nodePanel(n){
 const el=document.createElement("div");
 const attached=game.roadGraph.segments.filter(e=>e.a===n.id||e.b===n.id).length;
 el.append(textNode("p","Existing road junction. "+attached+" connected segment(s). Roads can be extended or removed without refund."));
 sheetButton(el,"Extend road from here",()=>{
  draft=createRoadDraft();pendingControl=null;addRoadAnchor(draft,{x:n.x,y:n.y});
  closeSheet();updateRoadInfo();renderMap();notify("Tap to create straight segments, or hold and drag for a curve.");
 });
 if(n.id===game.roadGraph.hubId)el.append(textNode("p","The original village gateway is protected as the connection origin.","note"));
 else sheetButton(el,"Destroy this junction and attached segments",()=>{
  if(!confirm("Remove this road node and all "+attached+" attached segments? Industries may lose access. No refund."))return;
  const result=removeRoadNode(game,n.id);closeSheet();
  if(!result.ok){notify(result.reason);return;}
  draft=createRoadDraft();pendingControl=null;refresh();notify("Road junction removed, with no refund.");
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
 if(mode==="zone")return;
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
  if(draft.anchors.length&&distance(draft.anchors.at(-1),chosen)<8){notify("Choose a new location for the next road node.");return;}
  if(!addRoadAnchor(draft,{x:Math.round(chosen.x),y:Math.round(chosen.y)})){notify("Tap inside the map.");return;}
  if(pendingControl&&draft.controls.length)draft.controls[draft.controls.length-1]=pendingControl;
  pendingControl=null;
  updateRoadInfo();renderMap();return;
 }
 if(mode==="build"){if(!selectedBuild){buildPanel();return;}const r=placeBuilding(game,selectedBuild,p);if(!r.ok){notify(r.reason);return;}record("building_constructed",selectedBuild+" at "+Math.round(p.x)+","+Math.round(p.y));refresh();notify(BUILDINGS[selectedBuild].label+" constructed.");selectedBuild=null;setMode("explore");return;}
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
 const p={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,down,moved:false,zoneBlocked:false,
  holdReady:false,holdTimer:null,curveActive:false,gestureActive:false,initialControl:null,hit,trail:[],zoneStroke:null};
 pointers.set(e.pointerId,p);
 if(pointers.size===2){
  for(const entry of pointers.values()){
   clearHold(entry);entry.holdReady=false;entry.moved=true;entry.zoneBlocked=true;
  }
  // A second finger cancels only the unfinished editing stroke. Earlier
  // staged Paint and Erase operations stay pending until Commit.
  if(mode==="zone"){
   for(const entry of pointers.values()){
    const index=zoneEdits.indexOf(entry.zoneStroke);
    if(index>=0)zoneEdits.splice(index,1);
    entry.zoneStroke=null;
   }
   updateZoneInfo();renderMap();
  }
  const [a,b]=[...pointers.values()],midX=(a.x+b.x)/2,midY=(a.y+b.y)/2;
  gesture=active3D?beginCameraGesture([a,b],svg.getBoundingClientRect()):
   {distance:distance(a,b),scale:camera.scale,anchor:mapPoint(midX,midY),midX,midY};
 }else if(pointers.size>2){
   gesture=null;
   for(const entry of pointers.values()){
    clearHold(entry);entry.holdReady=false;entry.moved=true;entry.zoneBlocked=true;
   }
 }else if(mode==="zone"&&zoneTool!=="move"){
   p.zoneStroke={type:zoneTool==="erase"?"erase":lastZonePaintType,radius:zoneRadius,
    points:[{x:Math.round(down.x),y:Math.round(down.y)}]};
   zoneEdits.push(p.zoneStroke);
   updateZoneInfo();renderMap();
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
  if(gesture){
   if(active3D){
    active3D.navigateTouches(advanceCameraGesture(gesture,[a,b]));
    renderMap();return;
   }
    camera.scale=clamp(gesture.scale*distance(a,b)/Math.max(gesture.distance,10),.75,3.8);
   const rect=svg.getBoundingClientRect(),w=920/camera.scale,h=w*rect.height/rect.width;
   const midX=(a.x+b.x)/2,midY=(a.y+b.y)/2;
   // Anchor the same world coordinate to the moving pinch centroid. This
   // supports two-finger translation and zoom in one uninterrupted gesture.
   camera.cx=gesture.anchor.x+(0.5-(midX-rect.left)/rect.width)*w;
   camera.cy=gesture.anchor.y+(0.5-(midY-rect.top)/rect.height)*h;
  }
  renderMap();return;
 }
 if(mode==="zone"&&pointers.size===1){
  if(p.zoneBlocked)return;
  if(zoneTool==="move"){
   p.moved=true;
   if(active3D)active3D.panBy(dx,dy);
   else{
    const rect=svg.getBoundingClientRect(),w=920/camera.scale;
    camera.cx-=dx/rect.width*w;
    camera.cy-=dy/rect.width*w*(rect.height/rect.width);
   }
   renderMap();return;
  }
  const at=mapPoint(e.clientX,e.clientY);
  const edit=p.zoneStroke,last=edit?.points.at(-1);
  if(edit&&last&&distance(at,last)>9&&edit.points.length<180&&
   at.x>=0&&at.y>=0&&at.x<=WORLD.w&&at.y<=WORLD.h)
   edit.points.push({x:Math.round(at.x),y:Math.round(at.y)});
  p.moved=true;renderMap();return;
 }
 if(mode==="road"&&(p.holdReady||(active3D&&(p.hit.builtCurve||p.hit.segmentIndex>=0)))&&travel>=MOVE_SLOP_PX){
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
     // The node is fixed at touch-down. Finger motion only sets its opposite
     // radial curve control, never the endpoint position.
     const anchor=p.hit.node||p.down;
     const radial=radialCurveGesture(anchor,mapPoint(e.clientX,e.clientY));
     const previous=draft.anchors.at(-1)||anchor;
     liveGesture={start:previous,end:anchor,control:radial.control,radius:radial.radius};
     p.gestureActive=true;
   }
   updateRoadInfo();renderMap();return;
 }
 if(travel>MOVE_SLOP_PX&&!p.holdReady){
   p.moved=true;clearHold(p);
   const rect=svg.getBoundingClientRect(),w=920/camera.scale;
   if(active3D)active3D.panBy(dx,dy);
    else {camera.cx-=dx/rect.width*w;camera.cy-=dy/rect.width*w*(rect.height/rect.width);}
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
   const anchor=geometry.end;
   if(!draft.anchors.length){
     // First held point becomes the starting node. Its radial handle shapes
     // the NEXT road segment when a second node is subsequently tapped.
     addRoadAnchor(draft,{x:Math.round(anchor.x),y:Math.round(anchor.y)});
     pendingControl=geometry.radius>8?geometry.control:null;
   }else if(distance(draft.anchors.at(-1),anchor)>8){
     if(addRoadAnchor(draft,{x:Math.round(anchor.x),y:Math.round(anchor.y)})){
       draft.controls[draft.controls.length-1]=geometry.radius>8?geometry.control:null;
       pendingControl=null;
     }
   }else{
     // Holding the latest node is an outgoing curve-handle edit.
     pendingControl=geometry.radius>8?geometry.control:null;
   }
   updateRoadInfo();
 }
 liveGesture=null;liveCurve=null;
 if(mode==="road")$("modeLabel").textContent="Roads · tap for straight; hold and drag to shape a fixed node";
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
$("retry3D").onclick=()=>{bootGameWorld({lite:true});setMode("explore");};
$("reset3DCamera").onclick=()=>{
 if(!active3D)return;
 const center=game.houses?.[0]||{x:WORLD.w/2,y:WORLD.h/2};
 active3D.homeView(center.x+115,center.y,Math.min(500,WORLD.h*.42));
};
$("exploreBtn").onclick=()=>setMode("explore");
$("roadsBtn").onclick=()=>setMode("road");
$("zoneBtn").onclick=()=>{if(mode!=="zone")zoneEdits=[];setMode("zone");setZoneTool("paint");};
$("zoneType").onchange=e=>chooseZoneType(e.target.value);
$("zoneMove").onclick=()=>setZoneTool("move");
$("zonePaint").onclick=()=>setZoneTool("paint");
$("zoneEraser").onclick=()=>setZoneTool(zoneTool==="erase"?"paint":"erase");
$("zoneRadius").oninput=e=>{zoneRadius=Number(e.target.value);updateZoneInfo();renderMap();};
$("buildBtn").onclick=()=>buildPanel();
$("menuBtn").onclick=()=>menuPanel();
$("historyBtn").onclick=()=>historyPanel();
$("councilBtn").onclick=()=>councilPanel();
$("closeSheet").onclick=closeSheet;$("backdrop").onclick=closeSheet;
$("undoRoad").onclick=()=>{pendingControl=null;undoRoadAction(draft);updateRoadInfo();renderMap();};
$("cancelRoad").onclick=()=>{draft=createRoadDraft();pendingControl=null;updateRoadInfo();renderMap();};
$("confirmRoad").onclick=()=>{const r=buildRoad(game,draft.anchors,draft.controls);if(!r.ok){notify(r.reason);return;}record("road_constructed","Cost "+r.cost+" gold; isolated="+r.isolated+"; intersections="+r.intersections);draft=createRoadDraft();pendingControl=null;refresh();notify(r.isolated?"Isolated street built. Sims will begin forming walking desire paths next month.":"Road built for "+r.cost+" gold"+(r.intersections?". "+r.intersections+" new intersection(s).":"."));};
$("zoneUndo").onclick=()=>{zoneEdits.pop();updateZoneInfo();renderMap();};
$("zoneCancel").onclick=()=>{zoneEdits=[];updateZoneInfo();renderMap();};
$("zoneCommit").onclick=()=>{
 const result=applyZoneEdits(game,zoneEdits,{commit:true});
 if(!result.ok){notify(result.reason);return;}
 record("zone_committed",result.count+" mixed zoning operation(s)");
 zoneEdits=[];setMode("explore");refresh();
 notify("Zoning changes committed. The town will respond to demand.");
};
$("nextBtn").onclick=()=>{const result=advance(game,{events:FLAGS.monthlyEvents});record("turn_resolved","Residents "+result.populationDelta+"; food "+result.foodProduction+"; wood "+result.woodProduction+"; tools "+result.toolProduction+"; treasury "+result.balance);refresh();notify(monthLabel(game.turn)+": "+(result.populationDelta>=0?"+":"")+result.populationDelta+" residents, "+(result.balance>=0?"+":"")+result.balance+" gold.");};
$("importSave").addEventListener("change",async e=>{const f=e.target.files?.[0];if(!f)return;try{const imported=JSON.parse(await f.text());if(!validState(imported))throw Error("Unsupported or invalid save file.");if(!confirm("Replace this environment's current game with the imported save?"))return;game=imported;bootGameWorld();ensureGraph(game);record("save_imported","Imported user-provided save into slot "+activeSlot);closeSheet();refresh();notify("Save imported into Slot "+activeSlot+".");}catch(err){notify(err.message||"Could not import save.");}finally{e.target.value="";}});
window.addEventListener("resize",renderMap);
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSheet();});
bootGameWorld();setStats();setMode("explore");if(restored.warning)notify(restored.warning);if(!restored.ok)notify(restored.reason);else if(restored.migrated)notify("Your original settlement was safely copied into Slot 1.");save();requestAnimationFrame(renderMap);

// Cache the complete game shell while connected, then play offline in flight mode.
// A standalone downloaded HTML file skips the worker and uses its embedded assets.
if(location.protocol==="file:"){
 $("offlineStatus").textContent="LOCAL OFFLINE EDITION";
}else if("serviceWorker" in navigator &&
 (location.protocol==="https:"||["localhost","127.0.0.1"].includes(location.hostname))){
 $("offlineStatus").textContent="PREPARING OFFLINE MODE";
 navigator.serviceWorker.register("./sw.js",{scope:"./"})
  .then(()=>navigator.serviceWorker.ready)
  .then(()=>{$("offlineStatus").textContent="OFFLINE READY";})
  .catch(error=>{$("offlineStatus").textContent="OFFLINE UNAVAILABLE";console.warn("Offline setup failed",error);});
}else{
 $("offlineStatus").textContent="LOCAL GAME";
}
