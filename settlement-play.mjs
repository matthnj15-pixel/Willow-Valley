// WV-GAME-001: deterministic settlement gameplay, independent of rendering.
import {zoneAt} from "./organic-world.mjs";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const POLICIES={
 tax:[["gentle","Gentle levy","70% revenue, +1 morale/month"],["balanced","Balanced levy","Normal revenue"],["high","Heavy levy","145% revenue, -3 morale/month"]],
 rations:[["careful","Stretch provisions","20% less food, -2 morale/month"],["normal","Normal meals","Normal food use"],["generous","Community feasts","25% more food, +2 morale/month"]],
 labor:[["food","Prioritize growers","Staff farms first"],["balanced","Balanced workforce","Staff farms, wood, and services"],["materials","Prioritize makers","Staff lumber and toolsmiths first"]]
};
export const CHARTERS=[
 {name:"The Founding Charter",unlock:"Marketplace",choices:[["commons","The Common Good","+6 morale, +8 appeal, stronger public spaces"],["enterprise","The Working Charter","+130 gold, +4 tools, stronger lumber camps"]]},
 {name:"The Market Charter",unlock:"Granary",choices:[["breadbasket","The Breadbasket","+32 food, 20% stronger farms"],["exchange","The Trade Guild","+125 gold, cheaper imports and stronger markets"]]},
 {name:"The Civic Charter",unlock:"Permanent borough",choices:[["neighbors","The Neighbors' Promise","+12 appeal, cheaper cottages"],["craft","The Craft Guild","+100 gold, +5 tools, stronger toolsmiths"]]}
];
export const TRADE=[
 {id:"buyFood",name:"Purchase 32 food",gold:-86,food:32},
 {id:"buyWood",name:"Purchase 18 wood",gold:-82,wood:18},
 {id:"buyTools",name:"Purchase 6 tools",gold:-108,tools:6},
 {id:"sellFood",name:"Sell 24 food",gold:64,food:-24},
 {id:"sellWood",name:"Sell 12 wood",gold:50,wood:-12}
];
export const PETITIONS=[
 {id:"travelers",turn:4,title:"Families on the Road",text:"Travelers seek help on their journey.",options:[["welcome","Offer shelter: -12 food, -25 gold, +3 morale, +5 appeal"],["toll","Ask for a toll: +55 gold, -4 appeal"]]},
 {id:"winter",turn:10,title:"A Hard Winter",text:"Your council debates how to protect the town.",options:[["stores","Release 16 food: +7 morale"],["purchase","Purchase supplies: -65 gold, +22 food"]]},
 {id:"merchants",turn:18,title:"Merchants at the Crossroads",text:"A trader offers the town a commercial privilege.",options:[["license","License trading: +120 gold, -3 morale"],["fair","Hold a public fair: -20 food, -45 gold, +8 morale, +6 appeal"]]},
 {id:"road",turn:28,title:"Roads and Reserves",text:"Residents ask for repairs and shared work.",options:[["repair","Fund upkeep: -85 gold, +8 morale"],["volunteer","Organize work: -10 food, +12 wood, -3 morale"]]}
];
const needs={farm:7,lumber:5,smith:8,park:2,plaza:3,market:4,granary:3};
export function ensureCivic(s){
 const c=s.civic||(s.civic={});
 if(!POLICIES.tax.some(x=>x[0]===c.tax))c.tax="balanced";
 if(!POLICIES.rations.some(x=>x[0]===c.rations))c.rations="normal";
 if(!POLICIES.labor.some(x=>x[0]===c.labor))c.labor="balanced";
 if(!Number.isInteger(c.chapter)||c.chapter<0||c.chapter>3)c.chapter=0;
 if(!Array.isArray(c.charters))c.charters=[];
 if(!Array.isArray(c.petitions))c.petitions=[];
 if(!Number.isInteger(c.lastTrade))c.lastTrade=-1;
 if(!Number.isInteger(c.steadyMonths))c.steadyMonths=0;
 if(!c.changed||typeof c.changed!=="object")c.changed={};
 if(!c.ledger||typeof c.ledger!=="object")c.ledger={};
 return c;
}
export function validCivic(c){return c===undefined||!!c&&
 POLICIES.tax.some(x=>x[0]===c.tax)&&POLICIES.rations.some(x=>x[0]===c.rations)&&POLICIES.labor.some(x=>x[0]===c.labor)&&
 Number.isInteger(c.chapter)&&c.chapter>=0&&c.chapter<=3&&Array.isArray(c.charters)&&c.charters.length<=3&&
 Array.isArray(c.petitions)&&c.petitions.length<=PETITIONS.length&&Number.isInteger(c.lastTrade)&&c.lastTrade>=-1&&
 Number.isInteger(c.steadyMonths)&&c.steadyMonths>=0&&typeof c.changed==="object"&&typeof c.ledger==="object";}
export function unlocked(s,type){return type==="market"?ensureCivic(s).chapter>=1:type==="granary"?ensureCivic(s).chapter>=2:true;}
export function objectives(s){
 const c=ensureCivic(s),chapter=c.chapter;
 if(chapter===0)return[["Reach 38 residents",s.people>=38],["Reserve 25 food",s.food>=25],
  ["Tend fields beside an operating farm",s.buildings.some(b=>b.type==="farm"&&fieldCoverage(s,b,zoneAt)>=.08)],["Keep morale at 55+",s.happiness>=55]];
 if(chapter===1)return[["Reach 54 residents",s.people>=54],
  ["Establish a marketplace",s.buildings.some(b=>b.type==="market")],["Maintain 2 stable months",c.steadyMonths>=2],
  ["Reserve 40 food",s.food>=40]];
 if(chapter===2)return[["Reach 75 residents",s.people>=75],
  ["Build a plaza and granary",["plaza","granary"].every(t=>s.buildings.some(b=>b.type===t))],
  ["Maintain 3 stable months",c.steadyMonths>=3],["Keep morale at 70+",s.happiness>=70]];
 return[];
}
export function claimCharter(s,choice){
 const c=ensureCivic(s),stage=c.chapter;
 if(stage>=3)return{ok:false,reason:"All three settlement charters are already secured."};
 if(objectives(s).some(x=>!x[1]))return{ok:false,reason:"Complete all charter objectives before choosing a direction."};
 const selected=CHARTERS[stage].choices.find(x=>x[0]===choice);
 if(!selected)return{ok:false,reason:"Choose an available charter."};
 c.charters.push(choice);c.chapter++;
 if(choice==="commons"){s.happiness=clamp(s.happiness+6,0,100);s.housing.attractiveness=clamp(s.housing.attractiveness+8,0,100);}
 if(choice==="enterprise"){s.gold+=130;s.tools+=4;}
 if(choice==="breadbasket")s.food+=32;
 if(choice==="exchange")s.gold+=125;
 if(choice==="neighbors")s.housing.attractiveness=clamp(s.housing.attractiveness+12,0,100);
 if(choice==="craft"){s.gold+=100;s.tools+=5;}
 s.report=selected[1]+" adopted. "+CHARTERS[stage].unlock+" unlocked.";
 s.logs.unshift("Charter: "+s.report);return{ok:true};
}
export function setPolicy(s,key,value){
 const c=ensureCivic(s),item=POLICIES[key]?.find(x=>x[0]===value);
 if(!item)return{ok:false,reason:"Unknown council policy."};
 if(c[key]===value)return{ok:false,reason:"That policy is already active."};
 if(c.changed[key]===s.turn)return{ok:false,reason:"This policy has already changed this month."};
 c[key]=value;c.changed[key]=s.turn;
 s.report=item[1]+" enacted. Effects resolve next month.";s.logs.unshift("Council policy: "+key+" = "+value+".");
 return{ok:true};
}
export function trade(s,id){
 const c=ensureCivic(s),item=TRADE.find(x=>x.id===id);
 if(!item)return{ok:false,reason:"Unknown offer."};
 if(c.lastTrade===s.turn)return{ok:false,reason:"The merchant has already traded this month."};
 const gold=Math.round((item.gold||0)*(item.gold<0&&c.charters.includes("exchange")?.8:1));
 if(s.gold+gold<0||s.food+(item.food||0)<0||s.wood+(item.wood||0)<0||s.tools+(item.tools||0)<0)
  return{ok:false,reason:"Insufficient gold or materials for that trade."};
 if(id==="sellFood"&&s.food<36)return{ok:false,reason:"Selling must leave a minimum of 12 food in reserve."};
 s.gold+=gold;s.food+=item.food||0;s.wood+=item.wood||0;s.tools+=item.tools||0;c.lastTrade=s.turn;
 s.report="Trading caravan: "+item.name+".";s.logs.unshift("Trade: "+item.name+" for "+gold+" gold.");
 return{ok:true};
}
export function pendingPetition(s){
 const c=ensureCivic(s);return PETITIONS.find(p=>p.turn<=s.turn&&!c.petitions.includes(p.id))||null;
}
export function answerPetition(s,choice){
 const p=pendingPetition(s),c=ensureCivic(s);if(!p||!p.options.some(x=>x[0]===choice))return{ok:false,reason:"No matching council petition."};
 const expense={welcome:[12,25],stores:[16,0],purchase:[0,65],fair:[20,45],repair:[0,85],volunteer:[10,0]}[choice]||[0,0];
 if(s.food<expense[0]||s.gold<expense[1])return{ok:false,reason:"The town cannot afford that response."};
 s.food-=expense[0];s.gold-=expense[1];
 const appeal=n=>s.housing.attractiveness=clamp(s.housing.attractiveness+n,0,100);
 const morale=n=>s.happiness=clamp(s.happiness+n,0,100);
 if(choice==="welcome"){appeal(5);morale(3);}
 if(choice==="toll"){s.gold+=55;appeal(-4);}
 if(choice==="stores")morale(7);
 if(choice==="purchase")s.food+=22;
 if(choice==="license"){s.gold+=120;morale(-3);}
 if(choice==="fair"){morale(8);appeal(6);}
 if(choice==="repair")morale(8);
 if(choice==="volunteer"){s.wood+=12;morale(-3);}
 c.petitions.push(p.id);s.report=p.title+": "+p.options.find(x=>x[0]===choice)[1];
 s.logs.unshift("Council: "+s.report);return{ok:true};
}
export function fieldCoverage(s,b,zoneAt){
 let n=0;for(const r of [34,62,92])for(let i=0;i<8;i++){
  const a=i*Math.PI/4+.17;if(zoneAt(s,{x:b.x+Math.cos(a)*r,y:b.y+Math.sin(a)*r})==="farmland")n++;
 }return n/24;
}
export function workforce(s,access,zoneAt){
 const c=ensureCivic(s),available=Math.floor(s.people*.5);
 const jobs=s.buildings.map((b,index)=>({index,type:b.type,need:needs[b.type]||3,access:access(b),
  fields:b.type==="farm"?fieldCoverage(s,b,zoneAt):0,staffed:0}));
 const priorities=c.labor==="food"?["farm","lumber","smith","market","granary","park","plaza"]:
  c.labor==="materials"?["lumber","smith","farm","market","granary","park","plaza"]:
  ["farm","lumber","market","smith","granary","park","plaza"];
 let remaining=available;
 for(const type of priorities)for(const job of jobs)if(job.type===type&&job.access>0){
  job.staffed=Math.min(job.need,remaining);remaining-=job.staffed;
 }
 return{available,employed:available-remaining,required:jobs.filter(j=>j.access).reduce((a,j)=>a+j.need,0),jobs};
}
export function livelihood(s,{BUILDINGS,access,homeAccess,roadLength,zoneAt,events=true}){
 const c=ensureCivic(s),plan=workforce(s,access,zoneAt),notices=[];
 let foodProduction=0,woodProduction=0,toolProduction=0,upkeep=0,marketBonus=0;
 const month=s.turn%12,season=month>=9?"Winter":month>=6?"Autumn":month>=3?"Summer":"Spring";
 const harvest=month>=9?.52:month>=6?1.28:month>=3?1.12:.95;
 let fieldsMissing=0,laborMissing=0,activeGranaries=0;
 for(const job of plan.jobs){
  const b=s.buildings[job.index],meta=BUILDINGS[b.type];if(!meta)continue;
  upkeep+=meta.upkeep;
  if(!job.access){notices.push(meta.label+" has no road connection for deliveries.");continue;}
  const portion=job.staffed/job.need;
  if(portion<1)laborMissing++;
  if(b.type==="farm"){
   const first=job.index===s.buildings.findIndex(x=>x.type==="farm");
   const fieldFactor=job.fields>0?.48+1.12*job.fields:first?.72:.32;
   if(job.fields<.25)fieldsMissing++;
   foodProduction+=Math.round(14*harvest*portion*fieldFactor*(c.charters.includes("breadbasket")?1.2:1));
  }
  if(b.type==="lumber")woodProduction+=Math.round(8*portion*(c.charters.includes("enterprise")?1.2:1));
  if(b.type==="granary"&&job.staffed>=2)activeGranaries++;
  if(b.type==="market"&&job.staffed>=2){marketBonus+=c.charters.includes("exchange")?15:8;if(s.food>15)s.happiness=clamp(s.happiness+1,0,100);}
  if(["plaza","park"].includes(b.type)&&job.staffed>=1)s.happiness=clamp(s.happiness+(b.type==="plaza"?2:1)+(c.charters.includes("commons")?1:0),0,100);
 }
 s.food+=foodProduction;s.wood+=woodProduction;
 for(const j of plan.jobs.filter(x=>x.type==="smith"&&x.access&&x.staffed)){
  const portion=j.staffed/j.need,cost=Math.max(1,Math.ceil(portion*4));
  if(s.wood<cost){notices.push("The toolsmith has no wood.");continue;}
  s.wood-=cost;const made=Math.max(1,Math.round((c.charters.includes("craft")?4:3)*portion));s.tools+=made;toolProduction+=made;
 }
 const wasteSavings=activeGranaries?Math.min(.18,activeGranaries*.09):0;
 const foodRequired=Math.ceil(s.people*.22*({careful:.8,normal:1,generous:1.25}[c.rations])*(1-wasteSavings));
 const foodReserveMonths=Math.round(s.food/Math.max(1,foodRequired)*10)/10;s.food-=foodRequired;
 const accessList=homeAccess(s),connected=accessList.filter(x=>x==="road").length,walking=accessList.filter(x=>x==="footpath").length;
 const taxRate=accessList.length?(connected+walking*.4)/accessList.length:0;
 const taxes=Math.round(s.people*1.5*taxRate*({gentle:.7,balanced:1,high:1.45}[c.tax]));
 const roadUpkeep=Math.ceil(s.roads.reduce((a,r)=>a+roadLength(r),0)*.018);
 const balance=taxes+marketBonus-upkeep-roadUpkeep;s.gold+=balance;
 s.happiness=clamp(s.happiness+({gentle:1,balanced:0,high:-3}[c.tax])+({careful:-2,normal:0,generous:2}[c.rations]),0,100);
 if(connected<accessList.length){s.happiness=clamp(s.happiness-2,0,100);notices.push("Homes lack full road access, reducing taxes and morale.");}
 if(events&&s.turn%6===0){s.food+=8;notices.push("Seasonal gathering added 8 food.");}
 if(s.food<0){s.food=0;s.people=Math.max(8,s.people-3);s.happiness=clamp(s.happiness-8,0,100);notices.push("A food shortage drove three residents away.");}
 if(s.food<foodRequired*2)notices.push("Less than two months of food. Paint farm fields, adjust rations, or import provisions.");
 if(fieldsMissing)notices.push(fieldsMissing+" farm(s) need painted farmland to improve output.");
 if(laborMissing)notices.push(laborMissing+" workplace(s) have unfilled jobs. Reassign labor or grow the settlement.");
 if(s.gold<0){s.happiness=clamp(s.happiness-4,0,100);notices.push("Treasury deficit is reducing morale.");}
 c.steadyMonths=s.food>=foodRequired*3&&balance>=0&&s.happiness>=60?c.steadyMonths+1:0;
 c.ledger={foodProduction,woodProduction,toolProduction,foodRequired,balance,taxes,upkeep:upkeep+roadUpkeep,
  marketBonus,granarySavings:wasteSavings,foodReserveMonths,workers:plan.available,employed:plan.employed,required:plan.required,season,fieldsMissing,laborMissing,
  foodForecast:s.food+foodProduction-foodRequired,goldForecast:s.gold+balance,notices:notices.slice(0,12)};
 return{foodProduction,woodProduction,toolProduction,foodRequired,balance,notices};
}
export function advice(s){
 const c=ensureCivic(s),l=c.ledger;
 if(s.housing?.pending?.length)return"Families need homes. Paint accessible residential ground or supply materials.";
 if(s.food<Math.max(16,s.people*.44))return"Food reserves are low. Paint fields near farms or purchase provisions.";
 if(l.fieldsMissing)return"Harvests depend on farmland painted around farms. Extend the fields to improve production.";
 if(l.laborMissing)return"Jobs exceed available labor. Change work priorities or wait for households.";
 if(l.balance<0)return"Your treasury is shrinking. Review taxation, roads, and building upkeep.";
 if(c.chapter<3&&objectives(s).every(x=>x[1]))return"Your next charter is ready. Open the Council to select a lasting development strategy.";
 return"Keep food, materials, and gold in reserve as winter approaches.";
}
