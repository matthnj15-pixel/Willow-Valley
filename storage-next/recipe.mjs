// Original Willow Valley artwork. Visual metres, Y up; never simulation geometry.
import * as T from 'three';
export const REVISION='wv006-d-original-1';
export const PALETTE={timber:'#594332',board:'#967451',stone:'#81796a',roof:'#81503d',iron:'#414744',sack:'#c3b397',water:'#4a829a',leaf:'#64895b'};
export const IDS=['storehouse-l1','warehouse-l2','lumber','tools','sacks','barrel','cargo','well','bench','noticeboard','trough','wall','fence','gate-open','gate-closed','planted-common','scaffold','storehouse-frame','person','cart'];
export const rect=(x,z,w,d)=>[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]];
export function makeAsset(id,quality='normal'){
 const parts=[],details=[],low=quality==='low';
 const add=(name,g,p,mat='timber',rotation=[0,0,0],seat=null)=>{g.rotateX(rotation[0]);g.rotateY(rotation[1]);g.rotateZ(rotation[2]);g.translate(...p);parts.push({name,g,mat});if(seat)details.push({name,...seat});};
 const box=(name,s,p,m='timber',r,seat)=>add(name,new T.BoxGeometry(...s),p,m,r,seat);
 const cyl=(name,rt,rb,h,p,m='timber',r=[0,0,0],n=low?6:10)=>add(name,new T.CylinderGeometry(rt,rb,h,n),p,m,r);
 const beam=(name,a,b,w=.14,m='timber')=>{const start=new T.Vector3(...a),end=new T.Vector3(...b),g=new T.BoxGeometry(w,start.distanceTo(end),w);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),end.clone().sub(start).normalize()));add(name,g,start.add(end).multiplyScalar(.5).toArray(),m);};
 const contact=(name,x,z,w,d,h=.18,y=0,m='stone')=>box(name,[w,h,d],[x,y+h/2,z],m,undefined,{polygon:rect(x,z,w,d),seatY:y,topY:y+h,kind:y===0?'ground':'supported'});
 const panel=(name,w,h,p,m='board',yaw=0)=>{
  if(low){box(name,[w,h,.10],p,m,[0,yaw,0]);return;}
  const count=Math.ceil(w/.32);for(let i=0;i<count;i++){const offset=(i-(count-1)/2)*w/count;box(name+' board',[w/count-.012,h,.10],[p[0]+Math.cos(yaw)*offset,p[1],p[2]-Math.sin(yaw)*offset],m,[0,yaw,0]);}
 };
 const roof=(w,d,eave,rise)=>{
  const angle=Math.atan2(rise,w/2),len=Math.hypot(w/2,rise);
  for(const s of [-1,1]){box('pitched clay roof',[len,.15,d],[s*w/4,eave+rise/2,0],'roof',[0,0,-s*angle]);if(!low)for(let j=1;j<7;j++)box('broad tile course',[len,.045,.055],[s*w/4,eave+rise/2+.09,-d/2+j*d/7],'roof',[0,0,-s*angle]);}
  box('ridge cap',[.24,.17,d+.04],[0,eave+rise+.04,0],'roof');
 };
 const gable=(w,d,eave,rise)=>{for(const z of [-d/2,d/2]){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([-w/2,eave,z,w/2,eave,z,0,eave+rise,z,0,eave+rise,z,w/2,eave,z,-w/2,eave,z],3));g.computeVertexNormals();add('closed boarded gable',g,[0,0,0],'board');beam('gable tie',[-w/2,eave,z],[w/2,eave,z]);beam('king post',[0,eave,z],[0,eave+rise,z]);}};
 const metadata={id,quality,status:'gallery-review',runtimeReady:false,structuralSeats:[],entrances:[],steps:[],roofEnvelope:[],yardEnvelope:[],supportPoints:[],optionalPropSeats:[],localSeats:details};
 if(id==='storehouse-l1'||id==='warehouse-l2'||id==='storehouse-frame'){
  const big=id==='warehouse-l2',frame=id==='storehouse-frame',w=big?10:6,d=big?7:5,h=big?4.1:3.25,floor=.32,bays=big?[-3.3,0,3.3]:[-1],clear=big?2.4:2.6;
  if(!frame)add('open handling yard',new T.PlaneGeometry(big?16:10,big?15:12),[.3,.002,1.3],'sack',[-Math.PI/2,0,0]);
  metadata.enclosedShell=frame?null:{width:w,depth:d,wallTopY:h,floorY:floor};
  contact('continuous rubble plinth',0,0,w,d,floor);metadata.structuralSeats.push({polygon:rect(0,0,w,d),seatY:0,topY:floor});
  contact('covered loading deck',0,d/2+.65,w,1.3,floor);metadata.structuralSeats.push({polygon:rect(0,d/2+.65,w,1.3),seatY:0,topY:floor});
  // Long structural bays and diagonal braces carry the roof independently of infill.
  const xs=big?[-5,-1.65,1.65,5]:[-3,0,3];
  for(const x of xs)for(const z of [-d/2,d/2]){box('load-bearing post',[.22,h-floor,.24],[x,(h+floor)/2,z]);metadata.supportPoints.push({position:[x,floor,z],seat:'continuous rubble plinth'});beam('knee brace',[x,h-.75,z],[x+(x>0?-.65:.65),h,z]);}
  for(const z of [-d/2,d/2])box('wall plate',[w+.24,.23,.24],[0,h,z]);
  for(const z of [-d/2,0,d/2]){beam('roof truss tie',[-w/2,h,z],[w/2,h,z],.19);beam('truss rafter',[-w/2,h,z],[0,h+(big?1.65:1.15),z],.16);beam('truss rafter',[0,h+(big?1.65:1.15),z],[w/2,h,z],.16);}
  if(!frame){
   panel('rear boarding',w,h-floor,[0,(h+floor)/2,-d/2]);panel('west boarding',d,h-floor,[-w/2,(h+floor)/2,0],'board',Math.PI/2);
   // Personnel opening in east wall; its own landing and stair, separate from cargo.
   const pz=-.8,doorWidth=1;panel('east rear infill',d/2+pz-.5,h-floor,[w/2,(h+floor)/2,(-d/2+pz-.5)/2],'board',Math.PI/2);
   panel('east forward infill',d/2-pz-.5,h-floor,[w/2,(h+floor)/2,(d/2+pz+.5)/2],'board',Math.PI/2);
   box('personnel lintel',[.2,h-floor-2.1,1.1],[w/2,(h+floor+2.1)/2,pz]);panel('personnel door leaf',1,2.05,[w/2+.02,floor+1.025,pz],'timber',Math.PI/2);
   contact('personnel landing',w/2+.45,pz,.9,1.3,floor);
   for(let i=0;i<2;i++){const x=w/2+.9+.2+i*.4,height=floor*(2-i)/3;contact('personnel stair '+i,x,pz,.4,1.3,height);metadata.steps.push({polygon:rect(x,pz,.4,1.3),rise:floor/3,tread:.4,topY:height});}
   metadata.entrances.push({kind:'personnel',threshold:[w/2,floor,pz],forward:[1,0,0],clearWidth:doorWidth,clearHeight:2.1,clearDepth:2.2,clearance:rect(w/2+1.1,pz,2.2,1),closedLeaf:true});
   let cursor=-w/2;
   for(const x of bays){const left=x-clear/2,right=x+clear/2;if(left>cursor)panel('cargo pier infill',left-cursor,h-floor,[(left+cursor)/2,(h+floor)/2,d/2]);
    box('cargo header',[clear+.12,h-floor-2.55,.22],[x,(h+floor+2.55)/2,d/2]);
    for(const s of [-1,1]){box('cargo jamb',[.15,2.65,.24],[x+s*(clear/2+.075),floor+1.325,d/2]);
     // Open paired leaves turn inward along the jamb, leaving a measured opening.
     panel('inward cargo leaf',clear/2-.08,2.5,[x+s*(clear/2+.03),floor+1.25,d/2-clear/4],'timber',Math.PI/2);
     if(!low)beam('door diagonal',[x+s*(clear/2+.09),floor+.2,d/2-.1],[x+s*(clear/2+.09),floor+2.3,d/2-clear/2+.1],.06,'iron');}
    box('recessed interior shadow',[clear-.08,2.5,.06],[x,floor+1.25,d/2-1.5],'timber');
    metadata.entrances.push({kind:'cargo',threshold:[x,floor,d/2],forward:[0,0,1],clearWidth:clear,clearHeight:2.55,clearDepth:4.8,clearance:rect(x,d/2+2.4,clear,4.8),doorLeaf:'open inward',loadingEdgeY:floor});cursor=right;
   }
   if(cursor<w/2)panel('end pier infill',w/2-cursor,h-floor,[(w/2+cursor)/2,(h+floor)/2,d/2]);
   gable(w,d,h, big?1.65:1.15);roof(w+1,d+1,h-(big?.165:1.15/6),big?1.815:1.15*7/6);
   // Separate shallow canopy, below the eaves; supports beyond all cargo corridors.
   box('loading canopy',[w+.7,.12,1.65],[0,h-.55,d/2+.75],'roof',[.10,0,0]);
   for(const x of [-w/2,w/2]){contact('canopy stone foot',x,d/2+1.3,.34,.34,.16);box('canopy post',[.18,h-.7,.18],[x,(h-.7)/2+.16,d/2+1.3]);metadata.supportPoints.push({position:[x,.16,d/2+1.3],seat:'canopy stone foot'});}
   const rb=new T.Box3();for(const part of parts.filter(p=>['pitched clay roof','ridge cap','loading canopy'].includes(p.name))){part.g.computeBoundingBox();rb.union(part.g.boundingBox);}
   metadata.roofEnvelope=[[rb.min.x,rb.min.z],[rb.max.x,rb.min.z],[rb.max.x,rb.max.z],[rb.min.x,rb.max.z]];metadata.roofOverhang={west:-w/2-rb.min.x,east:rb.max.x-w/2,rear:-d/2-rb.min.z,front:rb.max.z-d/2};
  }else{panel('incomplete rear boarding',2.4,1.6,[-1.7,1.12,-d/2]);}
  metadata.yardEnvelope=rect(.3,1.3,big?16:10,big?15:12);metadata.handlingArea={polygon:rect(0,d/2+3.2,w+1,3.8),cartApproachWidth:big?3:2.8,standingGrade:0,loadingEdgeY:floor};
  metadata.optionalPropSeats=[{id:'west-stack',polygon:rect(-w/2-.9,-1,1.4,2.2),seatY:0},{id:'rear-cargo',polygon:rect(0,-d/2-1.1,3,1.4),seatY:0}];
  metadata.fit='Uniform 2.8 conversion only. Test yard, roof, side stairs and cargo clearances at rotated site. No automatic upgrade fit.';
 }else if(id==='lumber'){
  for(const x of [-.65,.65])contact('stack bearer',x,0,.15,1.2,.12,0,'timber');
  for(let y=0;y<(low?3:4);y++)for(let z=0;z<3;z++)box('sawn timber',[2,.15,.27],[0,.2+y*.16,(z-1)*.30],'board');
 }else if(id==='tools'){
  contact('tool crate seat',0,0,1.2,.65,.16,0,'timber');panel('crate front',1.2,.55,[0,.42,.34]);panel('crate rear',1.2,.55,[0,.42,-.34]);
  for(const x of [-.45,0,.45]){beam('tool handle',[x,.25,0],[x,.25+(x===0?1.1:.95),0],.065,'board');box(x===0?'shovel blade':'forged axe head',x===0?[.22,.3,.05]:[.31,.15,.07],[x,x===0?1.25:1.1,0],'iron');}
 }else if(id==='sacks'){
  for(const [x,z] of [[-.25,-.1],[.26,.1]]){cyl('tied sack',.19,.27,.62,[x,.31,z],'sack');cyl('sack neck',.07,.10,.1,[x,.67,z],'sack');}
 }else if(id==='barrel'){
  cyl('coopered barrel',.28,.28,.85,[0,.425,0],'board');cyl('barrel belly',.32,.32,.50,[0,.425,0],'board');for(const y of [.12,.74])cyl('iron hoop',.30,.30,.055,[0,y,0],'iron');
 }else if(id==='cargo'){
  contact('cargo pallet',0,0,1.5,1,.12,0,'timber');for(const x of [-.38,.38]){box('cargo crate',[.67,.65,.8],[x,.445,0],'board');for(const z of [-.43,.43])box('crate strap',[.07,.67,.04],[x,.445,z],'timber');}box('cargo tie',[1.4,.06,.08],[0,.8,0],'sack');
 }else if(id==='well'){
  const n=low?8:12;for(let i=0;i<n;i++){const a=i*Math.PI*2/n;box('well stone curb',[.37,.7,.25],[Math.sin(a)*.6,.35,Math.cos(a)*.6],'stone',[0,a,0]);}cyl('well water',.48,.48,.03,[0,.1,0],'water');for(const x of [-.8,.8])contact('well upright',x,0,.14,.18,2.1,0,'timber');box('well crossbar',[1.8,.15,.18],[0,2,0]);beam('well rope',[0,1.95,0],[0,.6,0],.035,'sack');
 }else if(id==='bench'){
  for(const x of [-.65,.65])contact('bench leg',x,0,.16,.48,.45,0,'timber');box('bench seat',[1.8,.12,.5],[0,.51,0],'board');panel('bench back',1.8,.3,[0,.86,-.22]);
 }else if(id==='noticeboard'){
  for(const x of [-.6,.6])contact('notice post',x,0,.14,.16,1.8,0,'timber');panel('notice backing',1.4,.85,[0,1.35,0]);box('paper notices',[.85,.5,.02],[0,1.35,.07],'sack');box('notice hood',[1.65,.1,.55],[0,1.86,0],'roof');
 }else if(id==='trough'){
  contact('trough base',0,0,1.8,.7,.14);for(const z of [-.32,.32])box('trough rim',[1.8,.40,.12],[0,.3,z],'stone');for(const x of [-.84,.84])box('trough end',[.12,.40,.55],[x,.3,0],'stone');box('trough water',[1.55,.02,.46],[0,.31,0],'water');
 }else if(id==='wall'){
  contact('short rubble wall',0,0,2.2,.38,.65);if(!low)for(const x of [-.8,0,.8])box('wall cap',[.68,.12,.44],[x,.71,0],'stone');
 }else if(['fence','gate-open','gate-closed'].includes(id)){
  for(const x of [-1,1])contact('boundary post',x,0,.13,.15,1.05,0,'timber');
  if(id==='fence')for(const y of [.35,.8])box('fence rail',[2,.11,.1],[0,y,0],'board');
  else {const yaw=id==='gate-open'?Math.PI/2:0,cx=id==='gate-open'?-.96:0,cz=id==='gate-open'?-.96:0;for(const y of [.3,.8])box('gate rail',[1.84,.10,.10],[cx,y,cz],'board',[0,yaw,0]);for(let i=0;i<5;i++){const a=(i-2)*.36;box('gate slat',[.08,.72,.1],[cx+Math.cos(yaw)*a,.55,cz-Math.sin(yaw)*a],'timber');}metadata.opening={clearWidth:1.87,open:id==='gate-open',swingEnvelope:rect(0,-1,2,2)};}
 }else if(id==='planted-common'){
  contact('small planted stone seat',0,0,1.1,.7,.2);box('soil',[.95,.04,.55],[0,.23,0],'timber');for(const x of [-.3,0,.3]){cyl('small common planting',.12,.2,.25,[x,.38,0],'leaf');}metadata.note='Small planted accent only; not a nature asset collection or an enclosed park.';
 }else if(id==='scaffold'){
  for(const x of [-1,1])for(const z of [-.45,.45])contact('scaffold foot',x,z,.13,.13,3.5,0,'timber');for(const y of [1.2,2.5]){box('scaffold working deck',[2.3,.12,1],[0,y,0],'board');box('guardrail',[2.3,.09,.09],[0,y+.8,.45]);}for(const x of [-1,1])beam('scaffold diagonal',[x,.1,-.45],[-x,2.6,-.45],.09);for(let i=0;i<8;i++)box('ladder rung',[.45,.06,.06],[.55,.2+i*.32,.6]);for(const x of [.3,.8])beam('ladder stile',[x,0,.6],[x,2.7,.6],.06);metadata.note='Display construction only; no clock, turn or simulated duration.';
 }else if(id==='person'){
  cyl('reference head',.115,.115,.23,[0,1.635,0],'iron');cyl('reference torso',.18,.14,.54,[0,1.22,0],'iron');for(const x of [-.105,.105])cyl('reference leg',.065,.05,.95,[x,.475,0],'iron');for(const x of [-.24,.24])cyl('reference arm',.05,.045,.60,[x,1.12,0],'iron');
 }else if(id==='cart'){
  for(const x of [-.75,.75])cyl('cart wheel',.45,.45,.12,[x,.45,0],'timber',[0,0,Math.PI/2],low?8:12);
  box('cart bed',[1.4,.15,2],[0,.7,0],'board');for(const x of [-.68,.68])panel('cart side',2,.55,[x,1,0],'board',Math.PI/2);panel('cart rear',1.4,.55,[0,1,-.95]);for(const x of [-.45,.45])beam('cart shaft',[x,.65,.7],[x,.4,2.5],.085);metadata.groundContacts=[[-.75,0,0],[.75,0,0],[-.45,.4,2.5],[.45,.4,2.5]];metadata.note='Parked handcart with raised shafts; not freight automation.';
 }
 if(!parts.length)throw Error('Unknown asset '+id);
 return{parts,metadata};
}
