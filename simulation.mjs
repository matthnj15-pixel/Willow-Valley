import {validateRoadAlignment} from "./road-surface.mjs";
import {setRoadBounds,ensureGraph,nodeAt,segmentAt,validGraph,graphLines,addGeometry,deleteNode,deleteSegment,setSegmentCurve,saveGraphRoads,splitSegment} from "./road-network.mjs";
import {advanceDesirePaths,visibleDesirePaths,validDesirePaths} from "./desire-paths.mjs";
import {validZones,findCottageSite,configureOrganicBounds,zoneAt} from "./organic-world.mjs";
import {ensureCivic,validCivic,unlocked,livelihood,pendingPetition} from "./settlement-play.mjs";
import {createWorld,normalizeWorldSettings,validWorldSettings,WORLD_SIZES,DEFAULT_WORLD} from "./world-gen.mjs";
import {beforeMonth,monthHighlights} from "./turn-highlights.mjs";
export const VERSION=1;
export const WORLD={w:1200,h:900};
const modelCache=new Map();
export function worldDimensions(state){
 const size=state?.worldOptions?.size;
 const preset=WORLD_SIZES[size];
 return preset?{w:preset.width,h:preset.depth}:{w:1200,h:900};
}
export function configureWorldState(state){
 const bounds=worldDimensions(state);
 WORLD.w=bounds.w;WORLD.h=bounds.h;
 setRoadBounds(bounds.w,bounds.h);
 configureOrganicBounds(bounds.w,bounds.h);
 return bounds;
}
export function generatedWorld(state){
 if(!state?.worldOptions)return null;
 const options=normalizeWorldSettings(state.worldOptions);
 const key=JSON.stringify(options);
 if(!modelCache.has(key))modelCache.set(key,createWorld(options));
 return modelCache.get(key);
}
function drySite(world,x,z){
 for(const [dx,dz] of [[0,0],[-180,0],[180,0],[0,-180],[0,180],[-115,-85],[90,95]]){
  const p={x:x+dx,z:z+dz};
  if(p.x<35||p.z<35||p.x>world.width-35||p.z>world.depth-35)return false;
  if(world.sample(p.x,p.z).water!==null||world.slope(p.x,p.z)>.42)return false;
 }
 return true;
}
export function startWorldGame(raw=DEFAULT_WORLD){
 const options=normalizeWorldSettings(raw),world=createWorld(options);
 let center={x:world.width/2,z:world.depth/2},best=Infinity;
 // Found the village on a broad, gentle meadow instead of in a lake or
 // on a mountain ridge. The selection is deterministic for a saved seed.
 for(let z=240;z<world.depth-240;z+=65)
  for(let x=240;x<world.width-240;x+=65){
   if(!drySite(world,x,z))continue;
   const score=Math.hypot((x-world.width*.47)/world.width,(z-world.depth*.49)/world.depth)+world.slope(x,z)*.3;
   if(score<best){best=score;center={x,z};}
  }
 if(!Number.isFinite(best))throw Error("No suitable founding meadow. Choose flatter terrain or another seed.");
 const state=startGame(),shiftX=center.x-440,shiftY=center.z-450;
 const shift=p=>({x:Math.round(p.x+shiftX),y:Math.round(p.y+shiftY)});
 state.worldOptions=options;
 state.roads=state.roads.map(line=>line.map(shift));
 state.houses=state.houses.map(shift);
 state.buildings=state.buildings.map(b=>({...b,...shift(b)}));
 delete state.roadGraph;
 state.logs=["The founding families arrived in "+options.size+" landscape, seed "+options.seed+"."];
 state.report="The first village has been established on a natural meadow. Expand roads and paint residential land.";
 configureWorldState(state);
 ensureGraph(state);
 return state;
}
export const BUILDINGS={
  lumber:{label:"Lumber camp",gold:110,wood:4,tools:1,upkeep:7,description:"Produces 7 wood per month."},
  farm:{label:"Farm",gold:120,wood:5,tools:1,upkeep:8,description:"Produces 12 food per month."},
  smith:{label:"Toolsmith",gold:175,wood:8,tools:3,upkeep:15,description:"Consumes 4 wood to produce 3 tools."},
  park:{label:"Park",gold:85,wood:3,tools:0,upkeep:5,description:"Improves happiness when connected to a road."},
  plaza:{label:"Plaza",gold:135,wood:6,tools:1,upkeep:9,description:"A gathering place that improves happiness when accessible."},
  market:{label:"Marketplace",gold:160,wood:9,tools:2,upkeep:11,description:"Founding Charter unlock. Staff 4 workers to earn market income."},
  granary:{label:"Granary",gold:190,wood:12,tools:3,upkeep:7,description:"Market Charter unlock. Organizes food reserves."}
};
export const MONTHS=["March","April","May","June","July","August","September","October","November","December","January","February"];
export function monthLabel(turn){return MONTHS[turn%12]+" · Year "+(1+Math.floor(turn/12));}
export function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
export function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
export function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy,t=d?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/d,0,1):0;return distance(p,{x:a.x+dx*t,y:a.y+dy*t});}
export function nearestRoad(p,roads){let best=Infinity;for(const r of roads)for(let i=1;i<r.length;i++)best=Math.min(best,segmentDistance(p,r[i-1],r[i]));return best;}
export function roadLength(points){let sum=0;for(let i=1;i<points.length;i++)sum+=distance(points[i-1],points[i]);return sum;}
export function roadCost(points){return Math.ceil(roadLength(points)*0.18);}
export function seedValue(n){const x=Math.sin(n*38.217+14.57)*43758.5453;return x-Math.floor(x);}
export function startGame(){const state={
  version:VERSION,turn:0,people:32,gold:740,food:66,wood:20,tools:9,
  roads:[[{x:172,y:472},{x:330,y:417},{x:460,y:454},{x:656,y:383}]],
  buildings:[{type:"lumber",x:288,y:340},{type:"farm",x:530,y:553}],
  houses:[{x:242,y:505},{x:350,y:374},{x:418,y:497},{x:545,y:400}],
  happiness:76,desirePaths:[],zones:[],localLanes:[],housing:{housed:32,pending:[],attractiveness:75,nextId:1},
  logs:["The first families establish Willow Valley beside an old forest road."],
  report:"Your town has supplies for its first expansion. Design a new road or develop another industry."
};ensureGraph(state);ensureCivic(state);return state;}
export function validState(x){const bounds=worldDimensions(x);return !!x&&
 (x.worldOptions===undefined||validWorldSettings(x.worldOptions))&&x.version===VERSION&&Number.isInteger(x.turn)&&x.turn>=0&&x.turn<200000&&
 ["people","gold","food","wood","tools","happiness"].every(k=>Number.isFinite(x[k]))&&
 Array.isArray(x.roads)&&x.roads.length<500&&x.roads.every(r=>Array.isArray(r)&&r.length>=2&&r.length<=512&&r.every(p=>validPoint(p,bounds)))&&
 Array.isArray(x.buildings)&&x.buildings.length<300&&x.buildings.every(b=>BUILDINGS[b.type]&&validPoint(b,bounds))&&
 Array.isArray(x.houses)&&x.houses.length<2000&&x.houses.every(h=>validPoint(h,bounds)&&
 (!h.parcel||Array.isArray(h.parcel.vertices)&&h.parcel.vertices.length>=5&&h.parcel.vertices.length<=10&&h.parcel.vertices.every(p=>validPoint(p,bounds))))&&
 Array.isArray(x.logs)&&(!x.turnHighlights||Array.isArray(x.turnHighlights)&&x.turnHighlights.length<=6&&x.turnHighlights.every(e=>
  ["home","lane","path","housing","charter","food","morale","labor","fields","steady"].includes(e.kind)&&
  typeof e.text==="string"&&e.text.length<=180&&e.turn===x.turn&&
  (e.x===undefined||validPoint(e,bounds))))&&(!x.roadGraph||validGraph(x.roadGraph,bounds))&&
 validDesirePaths(x.desirePaths,bounds)&&validZones(x.zones,bounds)&&validHousing(x.housing)&&validCivic(x.civic)&&
 (x.localLanes===undefined||Array.isArray(x.localLanes)&&x.localLanes.length<=2000&&x.localLanes.every(l=>
 Array.isArray(l.points)&&l.points.length>=2&&l.points.length<=12&&l.points.every(p=>validPoint(p,bounds))));}
function validPoint(p,bounds=WORLD){return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=bounds.w&&p.y>=0&&p.y<=bounds.h;}
function validHousing(h){return h===undefined||!!h&&Number.isInteger(h.housed)&&h.housed>=0&&
 Number.isFinite(h.attractiveness)&&h.attractiveness>=0&&h.attractiveness<=100&&
 Number.isSafeInteger(h.nextId)&&h.nextId>=1&&Array.isArray(h.pending)&&h.pending.length<=300&&
 h.pending.every(g=>Number.isSafeInteger(g.id)&&g.id>0&&Number.isInteger(g.people)&&g.people>0&&g.people<=200000&&
 Number.isInteger(g.wait)&&g.wait>=0&&g.wait<=2);}
export function ensureHousing(s){
 if(!s.housing){
  const housed=Math.min(s.people,s.houses.length*8),extra=s.people-housed;
  s.housing={housed,pending:extra?[{id:1,people:extra,wait:0}]:[],attractiveness:75,nextId:extra?2:1};
 }
 return s.housing;
}
export function immigrationInterval(s){
 const h=ensureHousing(s);
 if(h.attractiveness<35||s.happiness<42)return null;
 if(h.attractiveness>=82&&s.happiness>=72)return 1;
 if(h.attractiveness>=65&&s.happiness>=55)return 2;
 return 3;
}
export function housingOutlook(s){const h=ensureHousing(s),interval=immigrationInterval(s);
 return{capacity:s.houses.length*8,occupied:h.housed,vacancies:Math.max(0,s.houses.length*8-h.housed),
 homeless:h.pending.reduce((n,g)=>n+g.people,0),homelessHouseholds:h.pending.length,
 attractiveness:h.attractiveness,arrivalInterval:interval,nextArrival:interval?s.turn+interval-s.turn%interval:null,availableZones:(s.zones||[]).filter(z=>z.type==="residential").length};
}
function riverX(y){return 875-90*Math.sin((y+80)/145)+35*Math.sin(y/66);}
function onRiver(p){return Math.abs(p.x-riverX(p.y))<69;}
function occupied(s,p){return [...s.buildings,...s.houses].some(b=>distance(b,p)<57);}
export function canPlace(s,p){
 const map=generatedWorld(s),dims=worldDimensions(s);
 if(!validPoint(p,dims)||occupied(s,p))return false;
 if(p.x<=25||p.y<=30||p.x>=dims.w-25||p.y>=dims.h-30)return false;
 if(!map)return !onRiver(p);
 return map.sample(p.x,p.y).water===null&&map.slope(p.x,p.y)<.6;
}
export function placeBuilding(s,type,p){const b=BUILDINGS[type];if(!b)return{ok:false,reason:"Unknown building type."};
  if(!unlocked(s,type))return{ok:false,reason:"Earn the next charter to unlock "+b.label+"."};
  if(type==="market"&&zoneAt(s,p)!=="commercial")return{ok:false,reason:"Paint Commercial zoning here before placing a marketplace."};
 if(!canPlace(s,p))return{ok:false,reason:"Choose clear land away from buildings and the river."};
 if(s.gold<b.gold||s.wood<b.wood||s.tools<b.tools)return{ok:false,reason:"Insufficient treasury, wood, or tools."};
 s.gold-=b.gold;s.wood-=b.wood;s.tools-=b.tools;s.buildings.push({type,x:Math.round(p.x),y:Math.round(p.y),foundedEra:ensureCivic(s).chapter});
 s.report=b.label+" established. Road access affects monthly production.";s.logs.unshift(monthLabel(s.turn)+": "+b.label+" built.");return{ok:true};}
// Legacy polyline entry point and new authored-geometry entry point.
export function addRoad(s,points){return buildRoad(s,points,points.slice(1).map(()=>null));}
export function buildRoad(s,anchors,controls){
 if(!Array.isArray(anchors)||anchors.length<2||anchors.length>512||!Array.isArray(controls)||controls.length!==anchors.length-1||!anchors.every(p=>validPoint(p,worldDimensions(s)))||controls.some(c=>c!==null&&!validPoint(c,worldDimensions(s))))return{ok:false,reason:"Choose valid road nodes."};
 const terrain=generatedWorld(s);
 if(terrain)for(let i=1;i<anchors.length;i++){
  const validation=validateRoadAlignment(terrain,anchors[i-1],controls[i-1],anchors[i]);
  if(!validation.ok)return validation;
 }
 const graph=structuredClone(ensureGraph(s));const result=addGeometry(graph,anchors,controls);
 if(!result.ok)return result;
 const newLines=graphLines(graph);
 const oldLength=s.roads.reduce((n,r)=>n+roadLength(r),0),newLength=newLines.reduce((n,r)=>n+roadLength(r),0)-oldLength;
 if(newLength<28)return{ok:false,reason:"Road must be at least 28 map units long."};
 const cost=Math.ceil(newLength*.18);
 if(s.gold<cost)return{ok:false,reason:"You need "+cost+" gold to build this road."};
 s.gold-=cost;s.roadGraph=graph;saveGraphRoads(s);
 s.report=result.isolated?"Isolated road built. No sims can reach it directly yet. Desire paths will form as people walk toward it.":"Road completed. Crossings become real intersections and improve connected access.";
 s.logs.unshift(monthLabel(s.turn)+": Road built for "+cost+" gold.");
 return{ok:true,cost,isolated:result.isolated,intersections:result.intersections};
}
export function removeRoadNode(s,id){
 const outcome=deleteNode(ensureGraph(s),id);if(!outcome.ok)return outcome;
 saveGraphRoads(s);s.report="Road junction removed. Industries without a connected road cannot produce.";
 s.logs.unshift(monthLabel(s.turn)+": Road node removed with "+outcome.removed+" segments. No refund.");return outcome;
}
export function removeRoadSegment(s,id){
 const outcome=deleteSegment(ensureGraph(s),id);if(!outcome.ok)return outcome;
 saveGraphRoads(s);s.report="Road segment removed. Check whether your industries remain connected.";
 s.logs.unshift(monthLabel(s.turn)+": Road segment removed. No refund.");return outcome;
}
export function reshapeRoadSegment(s,id,control){
 const graph=structuredClone(ensureGraph(s));
 if(!setSegmentCurve(graph,id,control))return{ok:false,reason:"Could not reshape the road."};
 const edge=segmentAt(graph,id);
 const validation=validateRoadAlignment(generatedWorld(s),nodeAt(graph,edge.a),edge.control,nodeAt(graph,edge.b));
 if(!validation.ok)return validation;
 s.roadGraph=graph;
 saveGraphRoads(s);s.report="Road shape updated without direct charge or refund.";
 s.logs.unshift(monthLabel(s.turn)+": Road curve adjusted.");return{ok:true};
}
export function makeRoadIntersection(s,id,t){
 const node=splitSegment(ensureGraph(s),id,t);
 if(!node)return{ok:false,reason:"Choose a location away from the road's ends."};
 saveGraphRoads(s);return{ok:true,node};
}
export function accessibleRoads(s){return s.roadGraph?graphLines(s.roadGraph,true):s.roads;}
// Every structure requires access. Footpaths support some pedestrians but
// do not substitute for built roads needed by industry.
// Follow a new cottage's lane from its exterior parcel entrance to the actual
// connected collector, including established intermediate lanes.
function laneReachesRoad(s,lane,connected,visited=new Set()){
 if(visited.has(lane)||!Array.isArray(lane.points)||lane.points.length<2)return false;
 visited.add(lane);
 const end=lane.points.at(-1);
 if(lane.connectsTo==="road")return nearestRoad(end,connected)<=24;
 if(lane.connectsTo!=="lane")return false;
 return (s.localLanes||[]).some(other=>other!==lane&&Array.isArray(other.points)&&
  nearestRoad(end,[other.points])<=16&&laneReachesRoad(s,other,connected,visited));
}
export function structureAccess(s,p){
 const connected=accessibleRoads(s);
 if(nearestRoad(p,connected)<=125)return"road";
 const trails=visibleDesirePaths(s).filter(t=>t.complete);
 const ownLane=(s.localLanes||[]).find(l=>Number.isFinite(l.houseX)&&Number.isFinite(l.houseY)&&
  distance(p,{x:l.houseX,y:l.houseY})<=3);
 if(ownLane)return laneReachesRoad(s,ownLane,connected)?"road":"footpath";
 // Preserve legacy saves with proximity-only pedestrian tracks.
 if((s.localLanes||[]).some(l=>nearestRoad(p,[l.points])<=22))return"footpath";
 if(!trails.length)return"none";
 const nearTrail=nearestRoad(p,trails.map(t=>[t.from,t.to]))<=66;
 const isolatedRoads=s.roadGraph?graphLines(s.roadGraph).filter(line=>!connected.includes(line)&&nearestRoad(line[0],connected)>125):[];
 const nearIsolated=nearestRoad(p,isolatedRoads)<=110;
 return nearTrail||nearIsolated?"footpath":"none";
}
function productionAccess(s,b){return structureAccess(s,b)==="road"?1:0;}
export function housingAccess(s){return s.houses.map(h=>structureAccess(s,h));}
// Existing homes have eight-person capacity. Houses only appear when households
// require accommodation AND a complete, suitable parcel exists inside painted land.
function reconcileHousing(s){const h=ensureHousing(s);
 const pending=h.pending.reduce((n,g)=>n+g.people,0),tracked=h.housed+pending;
 if(tracked<s.people)h.pending.push({id:h.nextId++,people:s.people-tracked,wait:0});
 else if(tracked>s.people){
  let excess=tracked-s.people;
  for(let i=h.pending.length-1;i>=0&&excess>0;i--){
   const n=Math.min(excess,h.pending[i].people);h.pending[i].people-=n;excess-=n;
   if(!h.pending[i].people)h.pending.splice(i,1);
  }
  if(excess)h.housed=Math.max(0,h.housed-excess);
 }
}
export function resolveHousing(s,notices,allowArrivals=true){
 reconcileHousing(s);const h=s.housing,arriving=[];
 const interval=immigrationInterval(s);
  if(allowArrivals&&interval&&s.turn%interval===0&&s.food>=8){
  const family={id:h.nextId++,people:3,wait:0};s.people+=3;h.pending.push(family);arriving.push(family.id);
 }
 const still=[];
 for(const family of h.pending){
  const free=s.houses.length*8-h.housed;
  if(free>=family.people){h.housed+=family.people;notices.push("A household settled into an existing vacant home.");continue;}
  const site=findCottageSite(s);
  const cottageGold=ensureCivic(s).charters.includes("neighbors")?35:45;
   if(site&&s.gold>=cottageGold&&s.wood>=4){
   s.gold-=cottageGold;s.wood-=4;s.houses.push(site.house);
   if(!s.localLanes)s.localLanes=[];
   s.localLanes.push(site.lane);h.housed+=family.people;
   notices.push("A cottage grew on an irregular residential parcel; a dirt approach formed.");
   s.logs.unshift(monthLabel(s.turn)+": A new cottage was built for a household, using 4 wood and "+cottageGold+" gold.");
   continue;
  }
  if(!arriving.includes(family.id))family.wait++;
  if(family.wait>=2){
   s.people=Math.max(0,s.people-family.people);
   h.attractiveness=clamp(h.attractiveness-6,0,100);
   notices.push("A homeless household left after two further months; immigration attractiveness fell.");
  }else{
   still.push(family);
   notices.push("Housing needed: "+(site?"Construction materials are insufficient.":"No suitable vacant residential parcel. Paint an accessible area.")+
     " Household may leave in "+(2-family.wait)+" month(s).");
  }
 }
 h.pending=still;
 return{homeless:still.length,attractiveness:h.attractiveness};
}
export function advance(s,{events=true}={}){
 const before=beforeMonth(s);
 s.turn++;advanceDesirePaths(s);
 const oldPeople=s.people;
 const result=livelihood(s,{BUILDINGS,access:b=>productionAccess(s,b),homeAccess:housingAccess,roadLength,zoneAt,events});
 resolveHousing(s,result.notices,s.food>=8);
 const net=s.people-oldPeople;
 if(s.desirePaths.some(p=>p.progress>=1))result.notices.push("Residents established walking desire paths.");
 const petition=pendingPetition(s);
 if(petition)result.notices.unshift("Council petition: "+petition.title+". Open the Council to respond.");
 s.report="["+ensureCivic(s).ledger.season+"] +"+result.foodProduction+" food, +"+result.woodProduction+
  " wood, +"+result.toolProduction+" tools. "+(result.balance>=0?"+":"")+result.balance+
  " gold net. "+(net>=0?"+":"")+net+" residents."+(result.notices.length?" "+result.notices[0]:"");
 s.logs.unshift(monthLabel(s.turn)+": "+s.report);
 if(s.logs.length>60)s.logs.length=60;
 s.turnHighlights=monthHighlights(s,before,{...result,...ensureCivic(s).ledger});
 return{...result,populationDelta:net,highlights:s.turnHighlights};
}
