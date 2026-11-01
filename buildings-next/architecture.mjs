// Original WV006-C architecture, visual metres, Y up. No simulation imports.
import {BoxGeometry,CylinderGeometry,BufferGeometry,Float32BufferAttribute,Quaternion,Vector3} from 'three';
import {detailPass} from './details.mjs';
export const recipeRevision=2;
export const polygon=(x,z,w,d)=>[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]];
export function architecture(id,{low=false,floor=1.35}={}){
 const parts=[],supports=[],entrances=[],probes=[];const categories={};
 const add=(name,g,pos=[0,0,0],tile=0,category='core',rotation=[0,0,0],tint=1)=>{g.rotateX(rotation[0]);g.rotateY(rotation[1]);g.rotateZ(rotation[2]);g.translate(...pos);parts.push({name,g,tile,category,tint});};
 const box=(name,size,pos,tile=0,category='core',rot,tint)=>add(name,new BoxGeometry(...size),pos,tile,category,rot,tint);
 const beam=(name,a,b,w=.14,tile=0,category='core')=>{const g=new BoxGeometry(w,new Vector3(...a).distanceTo(new Vector3(...b)),w);g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0,1,0),new Vector3(...b).sub(new Vector3(...a)).normalize()));add(name,g,a.map((v,i)=>(v+b[i])/2),tile,category);};
 const support=(x,z,top,w=.22)=>{box('individual stone foot',[w+.16,.22,w+.16],[x,-.01,z],1,'supports');box('bearing post',[w,top-.10,w],[x,(top+.10)/2,z],0,'supports');supports.push({point:[x,0,z],contact:[x,-.12,z],top:top,width:w,terrainExtension:'extend this individual support down to local terrain; keep floor level'});};
 const hardware=(x,y,z,width)=>{for(const h of [-.55,.55])box('forged strap',[width,.065,.035],[x,y+h,z],6,'detail');box('door handle',[.065,.18,.055],[x+.18,y,z+.025],6,'detail');};
 const entrance=(point,w,depth=2)=>entrances.push({threshold:point,forward:[0,0,1],clearWidth:w,clearHeight:2.2,clearDepth:depth,corridor:polygon(point[0],point[2]+depth/2,w,depth)});
 const gable=(x,z,w,d,eave,rise,tile=3)=>{const length=Math.hypot(w/2,rise),angle=Math.atan2(rise,w/2);for(const s of [-1,1])box('closed pitched roof',[length,.14,d],[x+s*w/4,eave+rise/2,z],tile,'roof',[0,0,-s*angle]);if(!low)for(const s of [-1,1])for(let row=0;row<7;row++){const t=(row+.35)/7;box('overlapping broad roof course',[length/7+.07,.065,d-.04],[x+s*w*t/2,eave+rise*(1-t)+.09,z],tile,'roof',[0,0,-s*angle],.98);}
  beam('ridge',[x,eave+rise,z-d/2],[x,eave+rise,z+d/2],.18,0,'roof');for(const zz of [z-d/2,z+d/2])for(const s of [-1,1])beam('verge',[x,eave+rise,zz],[x+s*w/2,eave,zz],.14,0,'roof');};
 const truss=(x,z,w,y,rise)=>{beam('tie',[x-w/2,y,z],[x+w/2,y,z],.19);beam('king post',[x,y,z],[x,y+rise,z],.14);for(const s of [-1,1]){beam('principal rafter',[x+s*w/2,y,z],[x,y+rise,z],.16);beam('knee brace',[x+s*(w/2-.05),y-.65,z],[x+s*(w/2-.7),y,z],.14);}};
 const wall=(name,size,pos,tile=0)=>box(name,size,pos,tile,'walls');
 const cargoDoor=(x,z,y,w=2.4)=>{for(const s of [-1,1]){box('closed cargo leaf',[w/2-.025,2.3,.10],[x+s*w/4,y+1.15,z],0,'doors');beam('door diagonal',[x+s*.1,y+.2,z+.06],[x+s*(w/2-.1),y+2.1,z+.06],.09,0,'doors');if(!low)hardware(x+s*w/4,y+1.15,z+.08,w/2-.15);}box('cargo door seam cover',[.09,2.3,.055],[x,y+1.15,z+.075],0,'doors');for(const s of [-1,1])box('heavy jamb',[.18,2.5,.23],[x+s*(w/2+.08),y+1.25,z],0,'doors');box('lintel',[w+.5,.23,.25],[x,y+2.45,z],0,'doors');};
 const bench=(x,z,w=2)=>{box('work bench',[w,.13,.65],[x,.91,z],0);for(const s of [-1,1])box('bench trestle',[.16,.85,.55],[x+s*(w/2-.2),.435,z],0);beam('bench stretcher',[x-w/2+.2,.3,z],[x+w/2-.2,.3,z],.12);};
 let seat=[],floorElevation=0,description='',roofPenetration=null;
 if(id==='home-low-hip'){
  // Only the roof is replaced; accepted shell is copied by the build script.
  const n=low?5:9,segments=low?4:10;
  const ring=(t,course,bottom=false)=>{const x=2.5-2.25*t,z=2.5-1.9*t,arr=[];const corners=[[-x,-z],[x,-z],[x,z],[-x,z]];for(let side=0;side<4;side++)for(let k=0;k<segments;k++){const f=k/segments,a=corners[side],b=corners[(side+1)%4];const wave=Math.sin((side*segments+k)*2.13+course*1.7)*.030+Math.cos(k*3.1+course)*.012;const start=course/n,end=Math.min(1,(course+1)/n+.045),relief=.08*(1-(t-start)/(end-start));arr.push([a[0]+(b[0]-a[0])*f,2.87+1.65*t+relief+(bottom?-.10:0)+wave,a[1]+(b[1]-a[1])*f]);}return arr;};
  for(let c=0;c<n;c++){
   const a=c/n,b=Math.min(1,(c+1)/n+.045),lo=ring(a,c),hi=ring(b,c),underLo=ring(a,c,true),underHi=ring(b,c,true),v=[],uv=[];
   const quad=(a,b,c,d,u0,u1)=>{for(const [p,u,vv] of [[a,u0,0],[b,u0,1],[c,u1,1],[a,u0,0],[c,u1,1],[d,u1,0]]){v.push(...p);uv.push(u,vv);}};
   for(let i=0;i<lo.length;i++){let j=(i+1)%lo.length;const u0=(i%segments)/segments,u1=(i%segments+1)/segments;quad(lo[i],hi[i],hi[j],lo[j],u0,u1);quad(underLo[j],underHi[j],underHi[i],underLo[i],u0,u1);quad(lo[j],underLo[j],underLo[i],lo[i],u0,u1);quad(hi[i],underHi[i],underHi[j],hi[j],u0,u1);}
   const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(v,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.computeVertexNormals();add('overlapping continuous thatch course '+c,g,[0,.035*c/n,0],4,'roof',[0,0,0],.95+.035*Math.sin(c*1.7));
  }
  add('bound ridge',new CylinderGeometry(.21,.23,1.5,low?6:10),[0,4.50,0],4,'roof',[Math.PI/2,0,0]);
  if(!low)for(let z=-.6;z<=.6;z+=.24)add('ridge binding',new CylinderGeometry(.235,.235,.035,10),[0,4.50,z],0,'roof',[Math.PI/2,0,0]);
  box('closed ridge weather cap',[.56,.12,1.35],[0,4.52,0],4,'roof');
  box('closed ceiling',[4.1,.12,4.1],[0,2.96,0],0,'roof');seat=[polygon(0,0,4,4)];description='Original cottage shell with thick overlapping reed courses, continuous closed hips and a bound ridge.';
 }else if(id==='facility-farm'){
  description='Broad agricultural barn with double cargo doors, open hay/work bays and a field-facing yard.';
  seat=[polygon(-1,0,5,5),polygon(3,0,2.8,4.8)];
  box('barn rubble seat',[5.2,.22,5.2],[-1,-.01,0],1,'supports');box('closed barn floor',[5,.12,5],[-1,.16,0],0,'supports');
  wall('rear barn wall',[5,3.3,.14],[-1,1.85,-2.5]);for(const x of [-3.5,1.5])wall('barn side',[.14,3.3,5],[x,1.85,0]);
  for(const x of [-2.91,.91])wall('broad door side infill',[1.18,3.3,.14],[x,1.85,2.5]);wall('door head infill',[2.65,.85,.14],[-1,3.075,2.5]);cargoDoor(-1,2.57,.22,2.6);entrance([-1,.22,2.68],2.4,3);
  for(const x of [-3.45,1.45])for(const z of [-2.45,0,2.45]){support(x,z,3.5);if(!low)beam('barn side brace',[x,2.65,z],[x,3.45,z+(z>0?-.65:.65)],.14);}
  gable(-1,0,5.8,5.8,3.5,1.8);for(const z of [-2.5,2.5]){truss(-1,z,5,3.5,1.8); // Closed gable triangle.
   const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute([-3.5,3.5,z,1.5,3.5,z,-1,5.3,z,-3.5,3.5,z,-1,5.3,z,1.5,3.5,z],3));g.setAttribute('uv',new Float32BufferAttribute([0,0,1,0,.5,1,0,0,.5,1,1,0],2));g.computeVertexNormals();add('barn gable infill',g,[0,0,0],0,'walls');}
  for(const z of [-2,0,2]){support(4.15,z,2.65);beam('bay cross beam',[1.5,3.2,z],[4.2,2.65,z],.16);beam('bay brace',[4.15,1.9,z],[3.6,2.75,z],.14);}
  box('hay bay roof',[3.25,.15,5.2],[2.96,3,0],3,'roof',[0,0,-.2]);bench(2.8,1.1,1.8);box('integral hay loft',[2.35,.16,2.8],[2.9,1.35,-.7],0);
  for(const z of [-1.45,-.6])box('stored hay mass',[1.9,.8,.75],[2.9,1.83,z],4);if(!low){box('hay fork handle',[.07,1.8,.07],[4,.95,-1.6],0,'optional');for(const x of [3.85,4,4.15])box('fork tine',[.035,.3,.04],[x,.2,-1.6],6,'optional');}
 }else if(id==='facility-smith'){
  description='Deep open masonry forge: continuous hearth, supported hood and hollow stack through a flashed roof opening.';
  seat=[polygon(0,0,5.4,4.6)];box('hearth room seat',[5.4,.20,4.6],[0,0,0],1,'supports');box('closed working floor',[5.3,.08,4.5],[0,.14,0],1,'supports');wall('masonry rear',[5.4,2.65,.35],[0,1.5,-2.15],1);for(const x of [-2.5,2.5])wall('masonry side return',[.35,1.5,3.7],[x,.95,-.2],1);
  for(const x of [-2.5,2.5])for(const z of [-2,2]){support(x,z,3.2-.12*z,.24);beam('forge knee brace',[x,2.3,z],[x,3.2-.12*z,z+(z>0?-.7:.7)],.18);}
  beam('front bressummer',[-2.6,2.95,2],[2.6,2.95,2],.24);const fx=-.9,fz=-.85;
  box('substantial hearth',[1.9,.65,1.45],[fx,.51,fz],1,'forge');box('dark fire bed',[1.45,.07,1.1],[fx,.87,fz],6,'forge');wall('fire back',[1.9,1.3,.3],[fx,1.51,fz-.65],1);
  for(const x of [fx-.82,fx+.82])box('hood masonry pier',[.26,1.44,.95],[x,1.55,fz-.12],1,'forge');
  // Four sloping walls, not a solid capped box. Open underside and open throat.
  const taper=(y0,y1,w0,d0,w1,d1)=>{const lo=[[-w0/2,-d0/2],[w0/2,-d0/2],[w0/2,d0/2],[-w0/2,d0/2]],hi=[[-w1/2,-d1/2],[w1/2,-d1/2],[w1/2,d1/2],[-w1/2,d1/2]];for(let i=0;i<4;i++){let j=(i+1)%4;const a=[fx+lo[i][0],y0,fz+lo[i][1]],b=[fx+lo[j][0],y0,fz+lo[j][1]],c=[fx+hi[j][0],y1,fz+hi[j][1]],d=[fx+hi[i][0],y1,fz+hi[i][1]];const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute([a,b,c,a,c,d,c,b,a,d,c,a].flat(),3));g.setAttribute('uv',new Float32BufferAttribute([0,0,1,0,1,1,0,0,1,1,0,1,1,1,1,0,0,0,0,1,1,1,0,0],2));g.computeVertexNormals();add('tapered open forge hood',g,[0,0,0],1,'forge');}};
  taper(2.18,2.85,2,1.65,.82,.82);
  for(const x of [fx-.32,fx+.32])box('continuous stack side',[.18,2.55,.82],[x,4.125,fz],1,'forge');for(const z of [fz-.32,fz+.32])box('continuous stack face',[.46,2.55,.18],[fx,4.125,z],1,'forge');
  for(const x of [fx-.36,fx+.36])box('open stack crown',[.22,.16,.94],[x,5.42,fz],1,'forge');for(const z of [fz-.36,fz+.36])box('open stack crown',[.50,.16,.22],[fx,5.42,z],1,'forge');
  // A literal rectangular hole in the shed roof, with independent flashing around it.
  const roofRect=(xmin,xmax,zmin,zmax)=>{const dz=zmax-zmin,zc=(zmax+zmin)/2;box('roof around flue',[xmax-xmin,.15,dz*Math.sqrt(1+.12**2)],[(xmin+xmax)/2,3.2-.12*zc,zc],3,'roof',[Math.atan(.12),0,0]);};
  const hole=[fx-.52,fx+.52,fz-.52,fz+.52];roofRect(-2.95,hole[0],-2.65,2.65);roofRect(hole[1],2.95,-2.65,2.65);roofRect(hole[0],hole[1],-2.65,hole[2]);roofRect(hole[0],hole[1],hole[3],2.65);
  for(const x of [fx-.465,fx+.465])box('metal flashing',[.13,.12,1.08],[x,3.2-.12*fz+.08,fz],6,'roof',[Math.atan(.12),0,0]);for(const z of [fz-.465,fz+.465])box('metal flashing',[.82,.12,.13],[fx,3.2-.12*z+.08,z],6,'roof');
  roofPenetration={center:[fx,fz],hole:polygon(fx,fz,1.04,1.04),stackOuter:polygon(fx,fz,.82,.82),clearance:.11,roofYAtCenter:3.2-.12*fz,stackTop:5.5,continuousFrom:2.85,smokeRequired:false};
  for(const z of [-2.4,2.4])beam('shed roof edging',[-2.95,3.2-.12*z,z],[2.95,3.2-.12*z,z],.16,0,'roof');
  box('anvil stump',[.55,.62,.55],[1.05,.49,1.15],0);box('anvil waist',[.24,.18,.25],[1.05,.88,1.15],6);box('anvil face',[.85,.13,.34],[1.05,1.035,1.15],6);add('anvil horn',new CylinderGeometry(0,.14,.36,6),[1.6,1.035,1.15],6,'core',[0,0,-Math.PI/2]);bench(1.35,-1.4,1.6);
  box('tool rack rail',[1.2,.12,.12],[1.55,1.95,-1.94],0);for(const x of (low?[1.5]:[1.15,1.5,1.85])){box('stored tool shaft',[.055,.65,.06],[x,1.65,-1.84],6);box('hammer head',[.25,.12,.12],[x,1.94,-1.84],6);}
  entrance([0,.18,2.3],1.2,2.3);
 }else if(id==='facility-granary'){
  description='Enclosed boarded store raised on braced posts, with a level closed underside, cargo landing and side loading stair.';floorElevation=floor;seat=[polygon(0,0,4.8,4.8)];
  for(const x of [-2.1,0,2.1])for(const z of [-2.1,2.1])support(x,z,floor-.14,.26);
  for(const z of [-2.1,2.1])beam('floor bearer',[-2.4,floor-.15,z],[2.4,floor-.15,z],.28);for(const x of [-2.1,0,2.1])beam('floor joist',[x,floor-.15,-2.4],[x,floor-.15,2.4],.22);
  for(const x of [-2.1,2.1])for(const s of [-1,1])beam('undercroft diagonal',[x,.25,s*2.1],[x,floor-.2,s*.6],.16,0,'supports');
  for(const z of [-2.1,2.1])for(const s of [-1,1])beam('front rear brace',[s*2.1,.22,z],[s*.8,floor-.2,z],.15,0,'supports');
  box('closed floor and underside',[4.8,.20,4.8],[0,floor-.10,0],0,'floor');wall('rear storage wall',[4.8,2.65,.14],[0,floor+1.325,-2.4]);for(const x of [-2.4,2.4])wall('storage side',[.14,2.65,4.8],[x,floor+1.325,0]);for(const x of [-1.8,1.8])wall('door side infill',[1.2,2.65,.14],[x,floor+1.325,2.4]);wall('door head infill',[2.4,.24,.14],[0,floor+2.53,2.4]);cargoDoor(0,2.48,floor,2.4);entrance([0,floor,2.65],2.1,1.0);
  for(const x of [-2.35,2.35])for(const z of [-2.35,2.35]){box('store corner',[.18,2.75,.18],[x,floor+1.375,z]);if(!low)beam('upper corner brace',[x,floor+2,z],[x,floor+2.6,z+(z>0?-.6:.6)],.12);}
  gable(0,0,5.6,5.65,floor+2.7,1.65);for(const z of [-2.4,2.4]){truss(0,z,4.8,floor+2.7,1.65);const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute([-2.4,floor+2.65,z,2.4,floor+2.65,z,0,floor+4.35,z,-2.4,floor+2.65,z,0,floor+4.35,z,2.4,floor+2.65,z],3));g.setAttribute('uv',new Float32BufferAttribute([0,0,1,0,.5,1,0,0,.5,1,1,0],2));g.computeVertexNormals();add('closed storage gable',g,[0,0,0],0,'walls');}
  box('supported loading landing',[4.8,.18,1.35],[0,floor-.09,3.1],0,'deck');for(const x of [-2.1,2.1])support(x,3.6,floor-.18,.24);
  // Side stair runs toward the landing in +X, never through the cargo corridor.
  const n=Math.ceil(floor/.18),run=n*.28,start=-2.4-run;for(let i=0;i<n;i++){const y=floor*(i+1)/n;box('safe stair tread',[.29,.10,1.1],[start+.28*(i+.5),y-.05,3.1],0,'stairs');}
  for(const z of [2.62,3.58]){beam('stair stringer',[start,-.10,z],[-2.4,floor-.12,z],.16,0,'stairs');beam('stair handrail',[start,1,z],[-2.4,floor+1,z],.09,0,'stairs');for(const i of [0,n/2,n]){const x=start+run*i/n,y=floor*i/n;box('rail upright',[.09,.95,.09],[x,y+.48,z],0,'stairs');}}
  for(const x of [-1.65,1.65]){box('landing guard post',[.1,1,.1],[x,floor+.5,3.7],0,'deck');}for(const s of [-1,1])beam('landing front rail',[s*1.2,floor+1,3.7],[s*2.35,floor+1,3.7],.09,0,'deck');for(const z of [2.5,3.65])beam('landing end rail',[2.35,floor+1,z],[2.35,floor+1,z===2.5?3.65:2.5],.09,0,'deck');
  if(!low)box('optional crate',[.65,.65,.65],[1.85,floor+.325,3.05],0,'optional');
  categories.stairEnvelope=polygon((start-2.4)/2,3.1,run+.2,1.3);categories.deckEnvelope=polygon(0,3.1,4.8,1.35);categories.undercroft={floorElevation:floor,underside:floor-.2,forbidSolidInfill:true,openProbe:{origin:[0,.6,4.5],direction:[0,0,-1]}};
 }else if(id==='facility-lumber'){
  description='Low open post frame with long integral timber racks, covered bench and an uncovered cutting apron.';seat=[polygon(0,0,7.5,3.2)];
  for(const x of [-3.5,0,3.5])for(const z of [-1.3,1.3]){support(x,z,2.35);beam('rack shelter brace',[x,1.7,z],[x+(x>0?-.55:.55),2.3,z],.14);}
  for(const s of [-1,1])box('long timber roof',[8.2,.14,Math.hypot(1.9,.85)],[0,2.825,s*.95],0,'roof',[s*Math.atan2(.85,1.9),0,0]);for(const z of [-1.9,1.9])beam('long eave edging',[-4.1,2.4,z],[4.1,2.4,z],.15,0,'roof');beam('long roof ridge',[-4.1,3.25,0],[4.1,3.25,0],.17,0,'roof');for(const x of [-3.5,0,3.5]){ // trusses run across the narrow depth.
   beam('cross tie',[x,2.3,-1.4],[x,2.3,1.4],.18);beam('rafter',[x,2.3,-1.5],[x,3.2,0],.16);beam('rafter',[x,3.2,0],[x,2.3,1.5],.16);}
  // Long racks, structural and retained with optional decoration hidden.
  for(const y of [.45,1.05])for(const z of [-1.18,-.66]){beam('rack rail',[-3.3,y,z],[3.3,y,z],.13);for(const x of [-3,0,3])beam('rack arm',[x,y,-1.4],[x,y,-.4],.13);}
  for(let i=0;i<(low?3:6);i++)box('integral stacked timber',[5.7,.13,.18],[0,.55+i*.13,-.85],0);
  bench(1.7,.55,2.3);for(const x of [-3,-1.5]){beam('cutting trestle',[x-.3,.05,2.45],[x,.8,2.45],.16);beam('cutting trestle',[x+.3,.05,2.45],[x,.8,2.45],.16);}box('cutting timber',[2.2,.25,.25],[-2.25,.9,2.45],0);entrance([0,0,1.5],1.5,2.2);
 }else if(id==='facility-market'){
  description='Three independent trading stalls: muted canvas, varied open counters and a broad unroofed circulation court.';
  const stalls=[[-3.6,-.8,2.5,5],[0,-2.5,2.8,7],[3.6,-.8,2.25,5]];
  for(const [x,z,w,tile] of stalls){seat.push(polygon(x,z,w,1.9));for(const xx of [x-w/2+.12,x+w/2-.12])for(const zz of [z-.65,z+.9])support(xx,zz,zz>z?2.25:2.65,.12);
   box('canvas awning',[w+.35,.055,2.25],[x,2.48,z+.15],tile,'roof',[.23,0,0]);box('canvas valance',[w+.35,.20,.04],[x,2.12,z+1.25],tile,'roof');beam('stall header',[x-w/2,2.25,z+.95],[x+w/2,2.25,z+.95],.12);
   const counterW=w===2.8?1.7:w-.2;box('open counter',[counterW,.13,.65],[x,.93,z+.65],0);for(const xx of [x-counterW/2+.15,x+counterW/2-.15])box('counter leg',[.13,.9,.5],[xx,.45,z+.65]);if(w!==2.8)wall('boarded counter front',[counterW,.7,.08],[x,.53,z+.95]);
   if(!low){for(const off of [-.55,.05,.6])box('optional produce bin',[.42,.16,.38],[x+off,1.08,z+.65],0,'optional');}
  }
  entrance([0,0,2.7],3,2);categories.openCourt={envelope:polygon(0,0,10.2,8),roofArea:stalls.reduce((a,s)=>a+(s[2]+.35)*2.25,0),openFraction:1-stalls.reduce((a,s)=>a+(s[2]+.35)*2.25,0)/(10.2*8)};
 }
 detailPass(id,parts,{low,add,box,beam});
 for(const p of parts){(categories[p.category]??=[]).push(p.name);}return {parts,supports,entrances,seat,floorElevation,description,roofPenetration,categories,probes};
}
