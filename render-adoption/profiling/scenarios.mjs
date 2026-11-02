import {configureWorldState, generatedWorld, validState, advance, structureAccess} from '../../simulation.mjs';
import {zoneAt} from '../../organic-world.mjs';
import {cottageBlueprint, buildingBlueprint} from '../../settlement-architecture.mjs';
import {visualIdentity} from '../../asset-registry.mjs';
import {naturePlacements} from '../../nature-visuals.mjs';

export const SCENARIOS = Object.freeze(['idle','orbit','zoom','month']);
export function deepFreeze(value) {
  if (value && typeof value==='object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze); Object.freeze(value);
  }
  return value;
}

// Match the application's facilityPlacement doorway-facing rule, including
// lane approaches. Blueprint orientation is only its no-road fallback.
function facilityYaw(state,building) {
  let approach=null,nearest=Infinity;
  for(const line of [...state.roads,...(state.localLanes||[]).map(l=>l.points||[])])for(let i=1;i<line.length;i++) {
    const a=line[i-1],b=line[i],dx=b.x-a.x,dy=b.y-a.y;
    const t=Math.max(0,Math.min(1,((building.x-a.x)*dx+(building.y-a.y)*dy)/(dx*dx+dy*dy||1)));
    const p={x:a.x+dx*t,y:a.y+dy*t},distance=Math.hypot(p.x-building.x,p.y-building.y);
    if(distance<nearest){nearest=distance;approach=p;}
  }
  return approach?-(Math.atan2(approach.y-building.y,approach.x-building.x)-Math.PI/2):-buildingBlueprint(building).orientation;
}

// Call only in an isolated fixture session or application-owned detached bridge.
// No saved names, logs, reports, inventories or player data enter this read view.
export function buildReadView(state, {revision, quality='normal'}={}) {
  const world=generatedWorld(state);
  if (!world || revision==null) throw Error('Generated world and stable revision required');
  const committedFields=[], seen=new Set(), cellSize=24;
  // Final farmland can only exist within a committed farmland stamp. Still
  // query against the full history so later erasures/other uses win.
  for (const zone of (state.zones||[]).filter(z=>z.type==='farmland')) for (const p of zone.points) {
    for (let x=Math.ceil((p.x-zone.radius)/cellSize)*cellSize; x<=p.x+zone.radius; x+=cellSize) {
      for (let y=Math.ceil((p.y-zone.radius)/cellSize)*cellSize; y<=p.y+zone.radius; y+=cellSize) {
        const key=`${x}:${y}`;
        if (seen.has(key)) continue;
        seen.add(key);
        // Classify after all committed operations, including erase, have been applied.
        if (zoneAt(state,{x,y})==='farmland') committedFields.push({x,y,use:'farmland',cellSize});
      }
    }
  }
  const key=(type,e)=>`${type}:${e.id??`${e.x}:${e.y}:${e.foundedTurn??0}`}`;
  const houses=state.houses.map(h=>({key:key('house',h), identity:visualIdentity(world.options.seed,h),
    savedPosition:{x:h.x,y:h.y}, yaw:-cottageBlueprint(h).orientation, foundedEra:h.foundedEra??0,
    parcel:h.parcel?{vertices:h.parcel.vertices,holes:h.parcel.holes||[]}:null, actualEntrance:h.entrance??null}));
  const facilities=state.buildings.map(b=>({key:key(b.type,b),type:b.type,savedPosition:{x:b.x,y:b.y},
    yaw:facilityYaw(state,b),preferredVisualId:null}));
  return deepFreeze(structuredClone({schemaVersion:1,revision,world:{seed:world.options.seed,width:world.width,
    depth:world.depth,terrainRevision:world.signature},quality,houses,facilities,
    roads:state.roads.map(points=>({points,width:34})),
    localLanes:(state.localLanes||[]).map(l=>({points:l.points,width:10})),
    approaches:state.houses.filter(h=>h.entrance).map(h=>({points:[{x:h.x,y:h.y},h.entrance],width:6})),
    committedFields,retainedTrees:naturePlacements(world,state).map(t=>({key:t.key,
      savedPosition:{x:t.origin[0]+world.width/2,y:t.origin[2]+world.depth/2},protection:null})),retainedBoundaries:[]}));
}

export function validateFixture(fixture) {
  const reasons=[];
  if (fixture?.isolated!==true || ![30,100].includes(fixture?.expectedHomes)) reasons.push('not-isolated-fixture');
  const s=fixture?.state;
  if (!validState(s)) reasons.push('invalid-application-state');
  if (s?.houses?.length!==fixture?.expectedHomes) reasons.push('incomplete-homes');
  for (const type of ['farm','lumber','smith','market','granary','park','plaza']) {
    if (!s?.buildings?.some(b=>b.type===type)) reasons.push(`missing-facility:${type}`);
  }
  if (!s?.houses?.some(h=>h.parcel?.vertices?.length)) reasons.push('missing-real-parcels');
  if (!s?.zones?.some(z=>z.type==='farmland') || !s.zones.some(z=>z.type==='erase')) reasons.push('missing-painted-field-or-hole');
  return {complete:reasons.length===0,reasons};
}

export function createFixtureSession(fixture,{quality='normal'}={}) {
  const admission=validateFixture(fixture);
  if (!admission.complete) throw Error(admission.reasons.join(', '));
  // Explicit detached state; no save-slot API or storage access in this module.
  let state=structuredClone(fixture.state),revision=0;
  configureWorldState(state);
  const world=generatedWorld(state);
  let view=buildReadView(state,{quality,revision:`${fixture.id}:${revision}`});
  const cameraPlan=createCameraPlan(view,world);
  const summary=()=>Object.fromEntries(['turn','people','gold','food','wood','tools','happiness'].map(k=>[k,state[k]]));
  return {
    world,cameraPlan, getReadView:()=>view, snapshot:()=>structuredClone(state),
    metadata:()=>({id:fixture.id,isolated:true,expectedHomes:fixture.expectedHomes,complete:true,
      requiredFacilities:fixture.requiredFacilities,quality,
      accessCounts:state.houses.reduce((a,h)=>{const k=structureAccess(state,h);a[k]=(a[k]||0)+1;return a;},{})}),
    advanceMonth() {
      const before=summary();
      configureWorldState(state);
      const result=advance(state,{events:false});
      const after=summary();
      const checked=validState(state)&&after.turn===before.turn+1&&
        after.gold-before.gold===result.balance&&after.tools-before.tools===result.toolProduction&&
        [result.foodProduction,result.woodProduction,result.toolProduction,result.foodRequired].every(Number.isFinite);
      if (!checked) throw Error('Month outcome failed outside-render simulation checks');
      revision++;
      view=buildReadView(state,{quality,revision:`${fixture.id}:${revision}`});
      return {checked:true,events:false,before,after,production:{food:result.foodProduction,
        wood:result.woodProduction,tools:result.toolProduction,consumption:result.foodRequired,balance:result.balance}};
    },
  };
}

// Saved coordinates converted once to the existing host camera's centered game units.
export function createCameraPlan(view,world) {
  const house=view.houses.find(h=>h.parcel),field=view.committedFields[0];
  let shore=null,slope=null,maxSlope=-1;
  for(let y=96;y<world.depth-96;y+=96)for(let x=96;x<world.width-96;x+=96) {
    if(world.sample(x,y).water!==null)continue;
    const grade=world.slope(x,y);
    if(grade>maxSlope){maxSlope=grade;slope={x,y,grade};}
    if(!shore&&[[48,0],[-48,0],[0,48],[0,-48]].some(([dx,dy])=>world.sample(x+dx,y+dy).water!==null))shore={x,y};
  }
  return deepFreeze({revision:'wv007-camera-v1',landmarks:[
    {kind:'parcel',...house.savedPosition},{kind:'field',x:field?.x??house.savedPosition.x,y:field?.y??house.savedPosition.y},
    {kind:'slope',...slope},{kind:'shore',...shore}],shoreAvailable:!!shore,maxSlope});
}

export function cameraAt(scenario,t,view,cameraPlan=null) {
  if (!SCENARIOS.includes(scenario)||!Number.isFinite(t)) throw Error('Invalid camera path');
  const houses=view.houses, center=houses.reduce((a,h)=>({x:a.x+h.savedPosition.x/houses.length,
    y:a.y+h.savedPosition.y/houses.length}),{x:0,y:0});
  const u=((t%60)+60)%60/60;
  let focus=center;
  if (cameraPlan) {
    const points=cameraPlan.landmarks.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
    if(scenario==='zoom') {
      const leg=u*points.length,i=Math.floor(leg),blend=(1-Math.cos((leg-i)*Math.PI))/2,a=points[i],b=points[(i+1)%points.length];
      focus={x:a.x+(b.x-a.x)*blend,y:a.y+(b.y-a.y)*blend};
    } else focus=points[0];
  }
  return {path:`wv007-${scenario}-v1`,focusX:focus.x-view.world.width/2,focusZ:focus.y-view.world.depth/2,
    yaw:scenario==='orbit'?Math.PI*.25+u*Math.PI*2:Math.PI*.25,pitch:.72,
    zoom:scenario==='zoom'?180+720*(1-Math.cos(u*Math.PI*2))/2:650};
}

// Host calls step after updating application state and before its normal render.
export function createScenarioDriver(session,scenario,{setCamera,updateView}={}) {
  if (!SCENARIOS.includes(scenario)) throw Error('Unknown scenario');
  let outcome=null,lastCamera=null;
  return {step(elapsedMs) {
    if (scenario==='month' && elapsedMs>=30000 && !outcome) {
      outcome=session.advanceMonth(); updateView?.(session.getReadView());
    }
    const camera=cameraAt(scenario,elapsedMs/1000,session.getReadView(),session.cameraPlan);
    const key=JSON.stringify(camera);
    if (key!==lastCamera) {setCamera?.(camera);lastCamera=key;}
    return {camera,monthOutcome:outcome};
  }, outcome:()=>outcome};
}
