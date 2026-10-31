// Presentation preferences live outside save slots and never affect simulation.
export function renderPreferences(search,storage,key){
 const params=new URLSearchParams(search),defaults={renderer:'webgl',quality:'normal'};
 let stored={};try{stored=JSON.parse(storage.getItem(key)||'{}')||{};}catch{}
 const prefs={renderer:stored.renderer==='three'?'three':'webgl',quality:stored.quality==='low'?'low':'normal'};
 let explicit=false;
 for(const [name,allowed] of [['renderer',['three','webgl']],['quality',['normal','low']]]){
  const value=params.get(name);if(allowed.includes(value)){prefs[name]=value;explicit=true;}
 }
 if(explicit)try{storage.setItem(key,JSON.stringify(prefs));}catch{}
 return {...defaults,...prefs};
}
