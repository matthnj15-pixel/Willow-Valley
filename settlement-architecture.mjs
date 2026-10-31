// Renderer-independent procedural vocabulary. Homes retain the era in which
// they were founded, so a medieval lane never transforms into a planned suburb.
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const noise=n=>{const x=Math.sin(n*12.9898+78.233)*43758.5453;return x-Math.floor(x);};
const WALLS=[[.86,.78,.63],[.77,.70,.56],[.91,.84,.70],[.71,.69,.59],[.82,.73,.62]];
const ROOFS=[[.48,.32,.24],[.36,.30,.26],[.57,.39,.25],[.39,.43,.38],[.53,.29,.23]];
export function cottageBlueprint(house){
 const seed=(Math.round(house.x)*31+Math.round(house.y)*47+(house.foundedTurn||0)*101);
 const era=clamp(Math.trunc(house.foundedEra||0),0,3);
 const variant=Math.floor(noise(seed)*5);
 // Orient the doorway toward the actual plot entrance, not a random grid axis.
 const gate=house.entrance;
 const orientation=gate&&Math.hypot(gate.x-house.x,gate.y-house.y)>1?
  Math.atan2(gate.y-house.y,gate.x-house.x)-Math.PI/2:
  (house.orientation||0);
 const width=17+Math.floor(noise(seed+9)*8)+era*1.5;
 const depth=19+Math.floor(noise(seed+27)*7)+era*1.5;
 const height=15+Math.floor(noise(seed+45)*5)+era*2;
 // Early homes remain timber, limewash and clay; later architecture introduces
 // stone, taller houses and more consistent forms without retroactive change.
 const wall=WALLS[(variant+era)%WALLS.length];
 const roof=ROOFS[(variant+era*2)%ROOFS.length];
 return{era,variant,width,depth,height,orientation,wall,roof,
  chimney:era>=1||noise(seed+6)>.64,porch:era<2&&noise(seed+17)>.40,
  roofRise:era>=2?.48:.68};
}
export function buildingBlueprint(building,chapter=0){
 const seed=Math.round(building.x)*17+Math.round(building.y)*29;
 const variant=Math.floor(noise(seed+23)*4);
 return{variant,era:clamp(building.foundedEra??chapter,0,3),
  orientation:noise(seed+15)*Math.PI*.4,roofRise:.45+noise(seed+2)*.22};
}
