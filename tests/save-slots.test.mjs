import test from "node:test";
import assert from "node:assert/strict";
import {startGame,validState} from "../simulation.mjs";
import {MAX_SLOTS,slotKey,activeKey,initializeSlots,readSlot,listSlots,saveSlot,newSlot,renameSlot,selectSlot,appendJournal,diagnostics,JOURNAL_LIMIT} from "../save-slots.mjs";
class LocalStore{
 constructor(){this.data=new Map();this.fail=false;}
 getItem(k){return this.data.has(k)?this.data.get(k):null;}
 setItem(k,v){if(this.fail)throw Error("Quota exceeded");this.data.set(k,String(v));}
 removeItem(k){this.data.delete(k);}
}
const base="willow-valley:dev:v1";
test("WV-SAVE-001: three distinct slots; active selection cannot affect stable namespace",()=>{
 const s=new LocalStore();
 const started=initializeSlots(s,base,validState,startGame);
 assert.equal(started.ok,true);assert.equal(started.active.slot,1);assert.equal(MAX_SLOTS,3);
 const other=startGame();other.turn=12;other.people=52;
 assert.equal(newSlot(s,base,2,other,validState,"Meadow").ok,true);
 assert.equal(selectSlot(s,base,2,validState).ok,true);
 assert.equal(readSlot(s,base,1,validState).state.turn,0);
 assert.equal(readSlot(s,base,2,validState).state.turn,12);
 assert.equal(initializeSlots(s,base,validState,startGame).active.slot,2);
 assert.equal(listSlots(s,base,validState)[2].status,"empty");
 assert.equal(s.getItem(slotKey("willow-valley:main:v1",1)),null);
});
test("WV-SAVE-002: legacy save copied to slot 1 without deleting old key",()=>{
 const s=new LocalStore(),original=startGame();original.turn=43;original.people=64;
 s.setItem(base,JSON.stringify(original));
 const load=initializeSlots(s,base,validState,startGame);
 assert.equal(load.ok,true);assert.equal(load.migrated,true);
 assert.equal(load.active.state.turn,43);
 assert.deepEqual(JSON.parse(s.getItem(base)),original);
 assert.equal(load.active.events[0].type,"save_migration");
 assert.equal(initializeSlots(s,base,validState,startGame).migrated,false);
});
test("WV-SAVE-003: corrupt occupied slot is preserved, never overwritten by autosave",()=>{
 const s=new LocalStore();s.setItem(slotKey(base,1),"{broken");
 const init=initializeSlots(s,base,validState,startGame);
 assert.equal(init.ok,true);assert.equal(init.active.slot,2);
 assert.equal(readSlot(s,base,1,validState).status,"corrupt");
 assert.equal(newSlot(s,base,1,startGame(),validState).ok,false);
 assert.equal(saveSlot(s,base,1,startGame(),[],validState).ok,false);
 assert.equal(s.getItem(slotKey(base,1)),"{broken");
});
test("WV-SAVE-004: failure to persist a save does not alter saved data",()=>{
 const s=new LocalStore();initializeSlots(s,base,validState,startGame);
 const before=s.getItem(slotKey(base,1)),next=startGame();next.turn=98;
 s.fail=true;const result=saveSlot(s,base,1,next,[],validState);
 assert.equal(result.ok,false);assert.equal(s.getItem(slotKey(base,1)),before);
});
test("WV-SAVE-005: bounded, serializable journal and explicit diagnostic export",()=>{
 let events=[];for(let i=0;i<JOURNAL_LIMIT+100;i++)events=appendJournal(events,"turn_end",i,"Completed month "+i);
 assert.equal(events.length,JOURNAL_LIMIT);assert.equal(events[0].turn,100);
 const s=new LocalStore();const game=startGame();
 assert.equal(newSlot(s,base,2,game,validState).ok,true);
 assert.equal(saveSlot(s,base,2,game,events,validState,"Old Orchard").ok,true);
 assert.equal(renameSlot(s,base,2,"Orchard Settlement",validState).ok,true);
 const re=readSlot(s,base,2,validState);
 assert.equal(re.events.length,JOURNAL_LIMIT);assert.equal(re.name,"Orchard Settlement");
 const file=diagnostics(game,events,2,"development");
 assert.equal(file.slot,2);assert.equal(file.events.length,JOURNAL_LIMIT);
 assert.ok(validState(file.state));
});
test("WV-SAVE-006: invalid legacy data stays untouched while a fresh slot is created",()=>{
 const s=new LocalStore();s.setItem(base,"{bad legacy bytes");
 const load=initializeSlots(s,base,validState,startGame);
 assert.equal(load.ok,true);assert.equal(load.migrated,false);assert.ok(load.warning);
 assert.equal(s.getItem(base),"{bad legacy bytes");
 assert.equal(load.active.slot,1);
});
