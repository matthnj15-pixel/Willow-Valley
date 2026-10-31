// A deterministic, UI-independent description of what visibly changed
// during one MONTH. Derived solely from the turn state, never animation time.
const pop=s=>s.housing?.pending?.reduce((n,g)=>n+g.people,0)||0;
export function beforeMonth(s){
 return{houses:s.houses.length,lanes:s.localLanes?.length||0,
  paths:(s.desirePaths||[]).filter(p=>p.progress>=1).length,
  homeless:pop(s),food:s.food,wood:s.wood,gold:s.gold,
  happiness:s.happiness,chapter:s.civic?.chapter||0};
}
export function monthHighlights(s,before,result){
 const found=[];
 const push=(kind,text,where=null)=>found.push({
  kind,text,turn:s.turn,...(where?{x:where.x,y:where.y}:{})});
 for(const home of s.houses.slice(before.houses))
  push("home","A new cottage rose on an irregular parcel.",home);
 const lanes=(s.localLanes||[]).length-before.lanes;
 if(lanes>0)push("lane",lanes+" new neighborhood approach "+(lanes===1?"path":"paths")+" formed.");
 const trails=(s.desirePaths||[]).filter(p=>p.progress>=1).length-before.paths;
 if(trails>0)push("path","Residents established "+trails+" walking shortcut"+(trails===1?"":"s")+".");
 const unhoused=pop(s);
 if(unhoused>before.homeless)push("housing","New families need accessible housing.");
 if(unhoused<before.homeless&&s.houses.length===before.houses)
  push("housing","Vacant homes welcomed waiting households.");
 if(s.civic?.chapter>before.chapter)push("charter","The settlement entered a new civic chapter.");
 if(s.food<8&&before.food>=8)push("food","Food reserves are critically low. Expand farming or trade.");
 if(s.happiness<50&&before.happiness>=50)push("morale","Town morale fell below 50. Review council policies.");
 if(result?.laborMissing>0)push("labor","Some workplaces lack sufficient staff.");
 if(result?.fieldsMissing>0)push("fields","Some farms need more cultivated fields.");
 if(!found.length)push("steady","The settlement completed another month of ordinary activity.");
 return found.slice(0,6);
}
