// WV-SAVE-001 — versioned, local, environment-isolated settlement slots.
// The original pre-slot key is retained indefinitely for safe manual recovery.
export const MAX_SLOTS=3, JOURNAL_LIMIT=300, SLOT_FORMAT=1;
export const slotKey=(base,n)=>base+":slot:"+n;
export const activeKey=base=>base+":active-slot";
const slotNumber=n=>Number.isInteger(n)&&n>=1&&n<=MAX_SLOTS;
const slotName=(name,n)=>String(name||("Settlement "+n)).trim().slice(0,48)||("Settlement "+n);
function parsed(value){try{return JSON.parse(value);}catch{return null;}}
function write(storage,key,value){
 try{storage.setItem(key,JSON.stringify(value));return{ok:true};}
 catch(error){return{ok:false,reason:"Local storage is full or unavailable. Export your settlement before continuing."};}
}
export function readSlot(storage,base,n,validState){
 if(!slotNumber(n))return{status:"invalid",reason:"Invalid slot number."};
 const raw=storage.getItem(slotKey(base,n));
 if(raw===null)return{status:"empty",slot:n};
 const data=parsed(raw);
 if(!data||data.format!==SLOT_FORMAT||!validState(data.state)||
    !Array.isArray(data.events)||data.events.length>JOURNAL_LIMIT||
    !data.events.every(e=>e&&typeof e.type==="string"&&Number.isInteger(e.turn)&&e.turn>=0)){
   return{status:"corrupt",slot:n,reason:"This slot could not be validated; its original bytes were preserved."};
 }
 return{status:"ready",slot:n,name:slotName(data.name,n),state:data.state,
  events:data.events,savedAt:data.savedAt||null};
}
export function listSlots(storage,base,validState){
 return Array.from({length:MAX_SLOTS},(_,i)=>readSlot(storage,base,i+1,validState));
}
export function saveSlot(storage,base,n,state,events,validState,name){
 if(!slotNumber(n)||!validState(state))return{ok:false,reason:"Invalid settlement data."};
 const current=readSlot(storage,base,n,validState);
 if(current.status==="corrupt")return{ok:false,reason:current.reason};
 if(!Array.isArray(events))return{ok:false,reason:"Invalid journal."};
 return write(storage,slotKey(base,n),{
  format:SLOT_FORMAT,name:slotName(name||current.name,n),
  savedAt:new Date().toISOString(),state,events:events.slice(-JOURNAL_LIMIT)
 });
}
export function newSlot(storage,base,n,state,validState,name,{overwrite=false}={}){
 if(!slotNumber(n)||!validState(state))return{ok:false,reason:"Invalid settlement data."};
 const old=readSlot(storage,base,n,validState);
 if(old.status!=="empty"&&!overwrite)return{ok:false,reason:"This settlement slot is already occupied."};
 const event={type:"settlement_created",turn:state.turn,detail:"Created settlement in slot "+n};
 return write(storage,slotKey(base,n),{format:SLOT_FORMAT,name:slotName(name,n),
  savedAt:new Date().toISOString(),state,events:[event]});
}
export function renameSlot(storage,base,n,name,validState){
 const existing=readSlot(storage,base,n,validState);
 if(existing.status!=="ready")return{ok:false,reason:"No readable settlement in this slot."};
 return write(storage,slotKey(base,n),{format:SLOT_FORMAT,name:slotName(name,n),
  savedAt:existing.savedAt,state:existing.state,events:existing.events});
}
export function selectSlot(storage,base,n,validState){
 if(readSlot(storage,base,n,validState).status!=="ready")return{ok:false,reason:"This settlement is unavailable."};
 return write(storage,activeKey(base),n);
}
export function appendJournal(events,type,turn,detail){
 if(typeof type!=="string"||!Number.isInteger(turn)||turn<0)throw Error("Invalid journal event");
 const next=Array.isArray(events)?events.slice(-(JOURNAL_LIMIT-1)):[];
 // Keep details compact and serializable. No browser telemetry or personal data.
 next.push({type,turn,detail:String(detail||"").slice(0,280)});
 return next;
}
export function initializeSlots(storage,base,validState,startGame){
 const legacy=storage.getItem(base),slots=listSlots(storage,base,validState);
 let migrated=false,warning=null;
 if(slots[0].status==="empty"&&legacy!==null){
  const state=parsed(legacy);
  if(validState(state)){
   const result=write(storage,slotKey(base,1),{format:SLOT_FORMAT,
    name:"Original settlement",savedAt:new Date().toISOString(),state,
    events:[{type:"save_migration",turn:state.turn,detail:"Copied legacy save; original retained at "+base}]});
   migrated=result.ok;
   if(!result.ok)warning=result.reason;
  }else warning="Original save could not be validated. Its bytes have not been changed.";
 }
 let available=listSlots(storage,base,validState);
 if(available.every(s=>s.status!=="ready")){
  const empty=available.find(s=>s.status==="empty");
  if(!empty)return{ok:false,reason:"All three settlement slots are unreadable. Export storage backups before making changes."};
  const created=newSlot(storage,base,empty.slot,startGame(),validState);
  if(!created.ok)return created;
  available=listSlots(storage,base,validState);
 }
 const selected=Number(parsed(storage.getItem(activeKey(base))));
 const active=available.find(s=>s.slot===selected&&s.status==="ready")||
  available.find(s=>s.status==="ready");
 if(!active)return{ok:false,reason:"No valid settlement could be opened."};
 // A failed preference write must never erase the actual settlement.
 selectSlot(storage,base,active.slot,validState);
 return{ok:true,active,migrated,warning};
}
export function diagnostics(state,events,slot,env){
 return{format:"willow-valley-diagnostics-v1",environment:env,slot,
  engineVersion:state.version,turn:state.turn,events:events.slice(-JOURNAL_LIMIT),
  state:structuredClone(state)};
}
