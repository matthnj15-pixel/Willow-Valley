// Offline fixture authoring only. Never import this module into the live game.
import {startWorldGame, generatedWorld, addRoad, placeBuilding, validState, configureWorldState, structureAccess} from '../../simulation.mjs';
import {paintZones, findCottageSite} from '../../organic-world.mjs';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

export function generateFixture(count) {
  if (![30, 100].includes(count)) throw Error('Expected 30 or 100 homes');
  const state = startWorldGame({seed:'WV007-P4-SETTLEMENT-1', size:'large',
    flatness:80, rolling:35, hills:25, cliffs:20, lakes:1, rivers:1, forest:45, waterLevel:45});
  // Explicit test provisioning, not an assertion of earned population/resources.
  Object.assign(state, {gold:1000000, food:100000, wood:100000, tools:10000});
  state.civic.chapter = 2;
  const foundingRoad=structuredClone(state.roads[0]);
  const world = generatedWorld(state), rejected = {roads:0, homes:0};
  for (let y=280; y<world.depth-200; y+=240) {
    for (let x=160; x<world.width-200; x+=240) {
      if (!addRoad(state, [{x,y},{x:x+240,y}]).ok) rejected.roads++;
    }
  }
  // Join rows where actual terrain permits it, retaining real graph connectivity.
  for (let y=280; y<world.depth-440; y+=240) {
    if (!addRoad(state, [{x:160,y},{x:160,y:y+240}]).ok) rejected.roads++;
  }
  let joined=false;
  for(const p of foundingRoad) {
    const y=280+Math.round((p.y-280)/240)*240;
    if(addRoad(state,[p,{x:p.x,y}]).ok){joined=true;break;}
  }
  if(!joined)throw Error('Fixture grid could not join the founding collector');
  const types = ['smith','market','granary','park','plaza'];
  for (const type of types) {
    let placed = false;
    for (let y=340; y<world.depth-200&&!placed; y+=240) for (let x=250; x<world.width-200&&!placed; x+=180) {
      if(structureAccess(state,{x,y})!=='road')continue;
      if (type==='market') paintZones(state, 'commercial', [[{x,y}]], 54);
      placed = placeBuilding(state, type, {x,y}).ok;
    }
    if (!placed) throw Error(`Could not place ${type}`);
  }
  const farm = state.buildings.find(b=>b.type==='farm');
  for (const dx of [-65,0,65]) paintZones(state, 'farmland', [[{x:farm.x+dx,y:farm.y+60}]], 54);
  // An actual erased hole must survive classification; don't paint a fake rectangle.
  paintZones(state, 'erase', [[{x:farm.x,y:farm.y+65}]], 24);
  for (let y=205; y<world.depth-150&&state.houses.length<count; y+=120) {
    for (let x=240; x<world.width-200&&state.houses.length<count; x+=150) {
      const before = state.zones;
      if (!paintZones(state, 'residential', [[{x,y}]], 90).ok) continue;
      const stamp = state.zones.at(-1);
      // Search just the new patch, while retaining all actual buildings/parcels/lanes.
      const site = findCottageSite({...state, zones:[stamp]});
      if (site) { state.houses.push(site.house); state.localLanes.push(site.lane); }
      else { state.zones = before; rejected.homes++; }
    }
  }
  state.people = count*8;
  state.housing.housed = state.people;
  state.housing.pending = [];
  configureWorldState(state);
  if (state.houses.length!==count || !validState(state)) throw Error(`Incomplete fixture: ${state.houses.length}/${count}`);
  return {schemaVersion:1, id:`wv007-${count}-homes-v1`, isolated:true,
    label:'ISOLATED TEST SETTLEMENT — provisioned population, treasury and supplies; not a player save or economic sustainability claim',
    construction:'startWorldGame + terrain-validated addRoad/placeBuilding + paintZones/findCottageSite',
    expectedHomes:count, requiredFacilities:['farm','lumber','smith','market','granary','park','plaza'], rejected, state};
}

if (process.argv[1]===fileURLToPath(import.meta.url)) {
  for (const count of [30,100]) {
    const fixture = generateFixture(count);
    await writeFile(new URL(`./fixtures/${count}-homes.json`,import.meta.url), JSON.stringify(fixture,null,2)+'\n');
    console.log(`${fixture.id}: ${fixture.state.houses.length} homes, ${fixture.state.zones.length} committed zone operations`);
  }
}
