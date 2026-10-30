import {createButton} from "./ui-components.mjs";
import {fieldCoverage} from "./settlement-play.mjs";
import {zoneAt} from "./organic-world.mjs";
import {ensureCivic,POLICIES,CHARTERS,TRADE,objectives,claimCharter,setPolicy,trade,pendingPetition,answerPetition,advice} from "./settlement-play.mjs";
// Mobile council. Uses the existing sheet rather than a new modal/navigation system.
export function renderCouncil(game,tab,navigate,decide){
 const c=ensureCivic(game),ledger=c.ledger||{},root=document.createElement("div");
 const el=(tag,text,cls)=>{const n=document.createElement(tag);n.textContent=String(text);if(cls)n.className=cls;return n;};
 const buttons=el("div","","council-tabs");
 for(const [id,label] of [["progress","Progress"],["economy","Economy"],["decisions","Decisions"]]){
  const b=createButton({label,variant:id===tab?"primary":"secondary",onClick:()=>navigate(id)});
  b.classList.add("council-tab");buttons.append(b);
 }root.append(buttons);
 const section=(title,body)=>{root.append(el("h3",title,"council-heading"));if(body)root.append(el("p",body,"council-copy"));};
 const metric=(title,value)=>{const r=el("div","","housing-metric");r.append(el("span",title),el("strong",value));root.append(r);};
 const act=(label,fn,type,detail,disabled=false)=>{
  const b=createButton({label,variant:"secondary",disabled,onClick:()=>decide(fn(),type,detail,tab)});
  b.classList.add("wide");root.append(b);
 };
 if(tab==="progress"){
  const milestone=CHARTERS[c.chapter];
  section(milestone?milestone.name:"A Chartered Borough",milestone?
   "Meet the settlement goals, then adopt ONE permanent charter. Each choice unlocks "+milestone.unlock+".":
   "You have secured all three charters. Continue guiding the town's development.");
  metric("Population",game.people);metric("Morale",Math.round(game.happiness)+"/100");
  metric("Appeal",Math.round(game.housing.attractiveness));metric("Steady months",c.steadyMonths);
  metric("Vacant dwelling spaces",Math.max(0,game.houses.length*8-game.housing.housed));
  metric("Homeless households",game.housing.pending.length);
  for(const [description,met] of objectives(game))root.append(el("p",(met?"✓  ":"○  ")+description,met?"council-goal met":"council-goal"));
  if(milestone&&objectives(game).every(x=>x[1])){
   section("Choose your charter","This choice permanently shapes future production, housing, or public life.");
   for(const [id,name,detail] of milestone.choices)act(name+" · "+detail,()=>claimCharter(game,id),"charter",name);
  }
  if(c.charters.length)root.append(el("p","Charters adopted: "+c.charters.join(", "),"note"));
  section("Steward's advice",advice(game));
 }
 if(tab==="economy"){
  section("Work and provisions","Seasonal harvests, accessible workplaces, field zones, and worker availability determine production.");
  metric("Season",ledger.season||"Spring");
  metric("Workers assigned",(ledger.employed??0)+" / "+(ledger.workers??Math.floor(game.people*.5)));
  metric("Jobs needed",ledger.required??0);
  metric("Food produced last turn",ledger.foodProduction??"Not yet");
  metric("Food consumed last turn",ledger.foodRequired??"Not yet");
  metric("Food reserves without harvest",(ledger.foodReserveMonths??"Not yet")+" months");
  metric("Gold per month",ledger.balance??"Not yet");
  metric("Tax revenue",ledger.taxes??"Not yet");
  metric("Building + road upkeep",ledger.upkeep??"Not yet");
  metric("Next similar-month food estimate",ledger.foodForecast??"Not yet");
  const farms=game.buildings.filter(b=>b.type==="farm");
  if(farms.length)metric("Working farmland coverage",Math.round(farms.reduce((n,b)=>n+fieldCoverage(game,b,zoneAt),0)/farms.length*100)+"% of sample land");
  for(const note of (ledger.notices||[]).slice(0,5))root.append(el("p","• "+note,"council-goal"));
  for(const [key,title] of [["labor","Labor priority"],["tax","Taxation"],["rations","Food policy"]]){
   section(title,"You may change this policy once per month. The choice takes effect next turn.");
   for(const [id,label,detail] of POLICIES[key]){
    act((c[key]===id?"✓ ":"")+label+" · "+detail,()=>setPolicy(game,key,id),
     "policy",key+" = "+id,c[key]===id||c.changed[key]===game.turn);
   }
  }
 }
 if(tab==="decisions"){
  const petition=pendingPetition(game);
  if(petition){
   section(petition.title,petition.text);
   for(const [id,description] of petition.options)act(description,()=>answerPetition(game,id),"petition",petition.id+"="+id);
  }else section("No unanswered petitions","New dilemmas arise as the settlement grows. They remain available until you decide.");
  section("The trading caravan","One exchange each month. Solve emergencies, sell excess production, or prepare for winter.");
  metric("Merchant",c.lastTrade===game.turn?"Already traded this month":"Available");
  for(const item of TRADE)act(item.name+" · "+(item.gold>=0?"+":"")+item.gold+" gold",
   ()=>trade(game,item.id),"trade",item.id,c.lastTrade===game.turn);
 }
 return root;
}
