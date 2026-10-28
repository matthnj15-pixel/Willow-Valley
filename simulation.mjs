export const VERSION=1;
export const WORLD={w:1200,h:900};
export const BUILDINGS={
  lumber:{label:"Lumber camp",gold:110,wood:4,tools:1,upkeep:7,description:"Produces 7 wood per month."},
  farm:{label:"Farm",gold:120,wood:5,tools:1,upkeep:8,description:"Produces 12 food per month."},
  smith:{label:"Toolsmith",gold:175,wood:8,tools:3,upkeep:15,description:"Consumes 4 wood to produce 3 tools."}
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
export function startGame(){return {
  version:VERSION,turn:0,people:32,gold:740,food:66,wood:20,tools:9,
  roads:[[{x:172,y:472},{x:330,y:417},{x:460,y:454},{x:656,y:383}]],
  buildings:[{type:"lumber",x:288,y:340},{type:"farm",x:530,y:553}],
  houses:[{x:242,y:505},{x:350,y:374},{x:418,y:497},{x:545,y:400}],
  happiness:76,
  logs:["The first families establish Willow Valley beside an old forest road."],
  report:"Your town has supplies for its first expansion. Design a new road or develop another industry."
};}
export function validState(x){return !!x&&x.version===VERSION&&Number.isInteger(x.turn)&&x.turn>=0&&x.turn<200000&&
 ["people","gold","food","wood","tools","happiness"].every(k=>Number.isFinite(x[k]))&&
 Array.isArray(x.roads)&&x.roads.length<500&&x.roads.every(r=>Array.isArray(r)&&r.length>=2&&r.length<=100&&r.every(validPoint))&&
 Array.isArray(x.buildings)&&x.buildings.length<300&&x.buildings.every(b=>BUILDINGS[b.type]&&validPoint(b))&&
 Array.isArray(x.houses)&&x.houses.length<2000&&x.houses.every(validPoint)&&Array.isArray(x.logs));}
function validPoint(p){return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=WORLD.w&&p.y>=0&&p.y<=WORLD.h;}
function riverX(y){return 875-90*Math.sin((y+80)/145)+35*Math.sin(y/66);}
function onRiver(p){return Math.abs(p.x-riverX(p.y))<69;}
function occupied(s,p){return [...s.buildings,...s.houses].some(b=>distance(b,p)<57);}
export function canPlace(s,p){return validPoint(p)&&!onRiver(p)&&!occupied(s,p)&&p.x>25&&p.y>30&&p.x<WORLD.w-25&&p.y<WORLD.h-30;}
export function placeBuilding(s,type,p){const b=BUILDINGS[type];if(!b)return{ok:false,reason:"Unknown building type."};
 if(!canPlace(s,p))return{ok:false,reason:"Choose clear land away from buildings and the river."};
 if(s.gold<b.gold||s.wood<b.wood||s.tools<b.tools)return{ok:false,reason:"Insufficient treasury, wood, or tools."};
 s.gold-=b.gold;s.wood-=b.wood;s.tools-=b.tools;s.buildings.push({type,x:Math.round(p.x),y:Math.round(p.y)});
 s.report=b.label+" established. Road access affects monthly production.";s.logs.unshift(monthLabel(s.turn)+": "+b.label+" built.");return{ok:true};}
export function addRoad(s,points){if(points.length<2||points.length>60||!points.every(validPoint))return{ok:false,reason:"Choose at least two valid road points."};
 if(roadLength(points)<28)return{ok:false,reason:"Road must be at least 28 map units long."};
 if(nearestRoad(points[0],s.roads)>65&&nearestRoad(points.at(-1),s.roads)>65)return{ok:false,reason:"Connect one end to your existing road network."};
 const price=roadCost(points);if(s.gold<price)return{ok:false,reason:"You need "+price+" gold to build this road."};
 s.gold-=price;s.roads.push(points.map(p=>({x:Math.round(p.x),y:Math.round(p.y)})));s.report="New road completed. It can improve industry access and attract housing.";s.logs.unshift(monthLabel(s.turn)+": New road built for "+price+" gold.");return{ok:true,cost:price};}
function productionAccess(s,b){return nearestRoad(b,s.roads)<=84?1:0.5;}
function housingSite(s){for(let k=0;k<130;k++){const i=(s.turn*13+k*23)%997,r=s.roads[i%s.roads.length],seg=i%(r.length-1),a=r[seg],b=r[seg+1],t=.17+seedValue(i+800)*.66;
 const x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,n=Math.hypot(b.y-a.y,b.x-a.x)||1,sgn=seedValue(i+40)<.5?-1:1;
 const p={x:Math.round(x+(b.y-a.y)/n*sgn*49),y:Math.round(y-(b.x-a.x)/n*sgn*49)};
 if(canPlace(s,p))return p;}return null;}
export function advance(s,{events=true}={}){s.turn++;const notices=[],oldPeople=s.people;
 let foodProduction=0,woodProduction=0,toolProduction=0,upkeep=0,smiths=[];
 for(const b of s.buildings){const access=productionAccess(s,b),v=BUILDINGS[b.type];upkeep+=v.upkeep;
  if(b.type==="farm")foodProduction+=Math.round(12*access);
  if(b.type==="lumber")woodProduction+=Math.round(7*access);
  if(b.type==="smith")smiths.push(access);}
 s.food+=foodProduction;s.wood+=woodProduction;
 for(const access of smiths){if(s.wood>=4){s.wood-=4;const n=Math.max(1,Math.round(3*access));s.tools+=n;toolProduction+=n;}else notices.push("The toolsmith could not obtain enough wood.");}
 const foodRequired=Math.ceil(s.people*.22);s.food-=foodRequired;
 const taxes=Math.round(s.people*1.5),roadUpkeep=Math.ceil(s.roads.reduce((v,r)=>v+roadLength(r),0)*.018);s.gold+=taxes-upkeep-roadUpkeep;
 if(events&&s.turn%6===0){s.food+=8;notices.push("A seasonal harvest added 8 food.");}
 if(s.food<0){s.food=0;s.people=Math.max(8,s.people-3);s.happiness=clamp(s.happiness-8,0,100);notices.push("A food shortage drove three residents away.");}
 else if(s.food>=8&&s.happiness>=42){const site=housingSite(s);if(site){s.houses.push(site);s.people+=3;s.happiness=clamp(s.happiness+1,0,100);notices.push("A new home appeared along your road network.");}}
 if(s.food<12){s.happiness=clamp(s.happiness-3,0,100);notices.push("Food reserves are running low.");}
 if(s.gold<0){s.happiness=clamp(s.happiness-4,0,100);notices.push("The treasury is in deficit.");}
 const net=s.people-oldPeople,balance=taxes-upkeep-roadUpkeep;
 s.report="+"+foodProduction+" food, +"+woodProduction+" wood, +"+toolProduction+" tools. "+(balance>=0?"+":"")+balance+" gold net. "+(net>=0?"+":"")+net+" residents."+ (notices.length?" "+notices[0]:"");
 s.logs.unshift(monthLabel(s.turn)+": "+s.report);
 if(s.logs.length>60)s.logs.length=60;
 return{foodProduction,woodProduction,toolProduction,foodRequired,balance,populationDelta:net,notices};}
export function advice(s){if(s.food<22)return["Food security needs attention.","Your current reserves are low. Add a farm near a road, or slow population growth until production catches up."];
 if(s.wood<10)return["Your wood supply is tight.","Add a lumber camp with access to an existing road. Tool production also consumes wood each month."];
 if(s.tools<3)return["Construction tools are scarce.","A toolsmith can replenish tools, but it consumes wood. Check the entire chain before expanding."];
 if(s.gold<220)return["Protect the treasury.","Building costs and monthly upkeep will restrict your next expansion. Advance cautiously or improve tax revenue through population growth."];
 if(s.buildings.some(b=>nearestRoad(b,s.roads)>84))return["One of your industries lacks road access.","Poor road connectivity halves that industry's output. Draw a road near it to improve production."];
 return["The settlement can expand.","Your reserves are currently reasonable. Consider planning a new road, adding a production building, or advancing a month to observe development."];}
