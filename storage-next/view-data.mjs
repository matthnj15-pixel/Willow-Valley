// Pure, detached example view data: never accepts a simulation object or a callback.
export const POLICIES=Object.freeze({Keep:'Hold for local use; no policy-driven trade.',Import:'Buy toward a reserve target when a merchant, funds and capacity permit.',Export:'Sell only above a protected reserve.',Balance:'Import below a minimum; export above a maximum. Keep a valid gap.'});
export function exampleView(level=1){return{illustrative:true,name:level===2?'Three-bay warehouse':'Timber storehouse',capacity:level===2?240:100,capacityUnit:'example cargo points',staff:level===2?4:2,roadAccess:'Example: nearby lane, access not simulated',goods:[{id:'wood',label:'Lumber',accepted:true,current:36,target:55,policy:'Keep',min:20,max:60},{id:'tools',label:'Tools',accepted:true,current:12,target:20,policy:'Keep',min:8,max:25}]};}
export function editExample(view,id,patch){
 const next=structuredClone(view),good=next.goods.find(g=>g.id===id);if(!good)return{ok:false,error:'Unknown example good.'};
 for(const key of Object.keys(patch))if(!['accepted','policy','target','min','max'].includes(key))return{ok:false,error:'Unsupported example field.'};Object.assign(good,patch);
 if(!Object.hasOwn(POLICIES,good.policy))return{ok:false,error:'Choose a proposed policy.'};
 if(typeof good.accepted!=='boolean'||['target','min','max'].some(k=>!Number.isFinite(good[k])||good[k]<0||good[k]>next.capacity))return{ok:false,error:'Enter non-negative example thresholds within capacity.'};
 if(good.policy==='Balance'&&good.min>=good.max)return{ok:false,error:'Balance needs minimum below maximum.'};
 return{ok:true,view:next};
}
export const GOODS_STATES=Object.freeze({empty:Object.freeze([]),partial:Object.freeze(['lumber','tools','barrel']),full:Object.freeze(['lumber','tools','barrel','sacks','cargo','lumber','cargo'])});
// All positions remain outside architecture, cargo routes, side stairs and cart path.
export const GOODS_SEATS=Object.freeze([[-4,-1],[-4,1],[0,-4],[-2,-4],[2,-4],[-4,-3],[4,-4]].map(Object.freeze));
export function goodsPlacements(level,state){if(!Object.hasOwn(GOODS_STATES,state))throw Error('Unknown illustrative stock state');return GOODS_STATES[state].map((id,i)=>{let [x,z]=GOODS_SEATS[i];if(x===-4)x=level===2?-6.1:-4.05;if(z===-4)z=level===2?-4.6:-3.6;return{id,position:[x,0,z],yaw:id==='lumber'?Math.PI/2:0};});}
