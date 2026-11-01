// Original detail modules. Dimensions remain in visual metres; no parcel or state imports.
import {BufferGeometry,Float32BufferAttribute,Vector3,CylinderGeometry} from 'three';
const V=a=>new Vector3(...a);
export function detailPass(id,parts,{low,add,box,beam}){
 const wave=(i,seed=0)=>Math.sin(i*12.9898+seed*78.233)*.5+.5;
 const mesh=(name,vertices,faces,tile,category='detail',tint=1)=>{const p=[],uv=[];for(const f of faces)for(let i=1;i<f.length-1;i++)for(const j of [f[0],f[i],f[i+1]]){p.push(...vertices[j]);const k=f.indexOf(j);uv.push(k===1||k===2?1:0,k>=2?1:0);}const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(p,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.computeVertexNormals();add(name,g,[0,0,0],tile,category,[0,0,0],tint);};
 // A shallow bevel around each stone face catches light; mortar is the darker wall behind it.
 const stone=(center,w,h,yaw=0,tint=.95,category='detail')=>{const d=.055,b=Math.min(.024,h*.15),v=[[-w/2,-h/2,0],[w/2,-h/2,0],[w/2,h/2,0],[-w/2,h/2,0],[-w/2+b,-h/2+b,d],[w/2-b,-h/2+b,d],[w/2-b,h/2-b,d],[-w/2+b,h/2-b,d]].map(p=>V(p).applyAxisAngle(new Vector3(0,1,0),yaw).add(V(center)).toArray());mesh('bevelled dressed stone',v,[[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]],1,category,tint);};
 const masonry=(origin,width,height,yaw=0,block=.66)=>{const rows=Math.max(1,Math.round(height/.34)),rh=height/rows;for(let r=0;r<rows;r++){const offset=r%2?block*.5:0;for(let c=-1;c<Math.ceil(width/block);c++){const a=Math.max(0,c*block+offset),b=Math.min(width,(c+1)*block+offset);if(b-a<.09)continue;const p=V([((a+b)/2-width/2),rh*(r+.5),0]).applyAxisAngle(new Vector3(0,1,0),yaw).add(V(origin));stone(p.toArray(),b-a-.022,rh-.025,yaw,.82+wave(r*23+c,2)*.18);}}};
 const roofPatch=(origin,u,v,width,length,{tile=3,boards=false}={})=>{const U=V(u),D=V(v),N=U.clone().cross(D).normalize();if(N.y<0)N.negate();const point=(x,y,h)=>V(origin).addScaledVector(U,x).addScaledVector(D,y).addScaledVector(N,h).toArray();
  const tw=boards?(low?.78:.38):(low?1.1:.72),step=boards?length:(low?.9:.60),rows=Math.ceil(length/step);
  for(let r=0;r<rows;r++){const offset=!boards&&r%2?tw/2:0;for(let c=-1;c<Math.ceil(width/tw);c++){const x0=Math.max(0,c*tw+offset),x1=Math.min(width,(c+1)*tw+offset);if(x1-x0<.06)continue;const y0=r*step,y1=Math.min(length,y0+step+(boards?0:.11)),h=.115+(boards?.005:wave(r*31+c,4)*.005),gap=boards?.012:.006;const verts=[];
   for(const underside of [false,true])for(const yy of [y0,y1])for(const xx of [x0+gap,(x0+x1)/2,x1-gap]){const f=(xx-x0)/(x1-x0),camber=boards?0:Math.sin(f*Math.PI)*.05;verts.push(point(xx,yy,h+camber+(boards?0:.08*(yy-y0)/(y1-y0))-(underside?.035:0)));}
   const faces=[[0,1,4,3],[1,2,5,4],[6,9,10,7],[7,10,11,8],[0,6,7,1],[1,7,8,2],[3,4,10,9],[4,5,11,10],[0,3,9,6],[2,8,11,5]];
   // Orient the closed tile outward even on the mirrored roof slope.
   const ab=V(verts[1]).sub(V(verts[0])),ac=V(verts[4]).sub(V(verts[0]));if(ab.cross(ac).dot(N)<0)faces.forEach(f=>f.reverse());
   mesh(boards?'separate weathered roof board':'curved overlapping clay tile',verts,faces,tile,'roof',.86+wave(r*37+c,9)*.14);
  }}
 };
 const gableTiles=(x,z,w,d,eave,rise)=>{const L=Math.hypot(w/2,rise);for(const s of [-1,1])roofPatch([x,eave+rise,z-d/2],[0,0,1],[s*w/2/L,-rise/L,0],d,L);for(let zc=z-d/2+.22;zc<z+d/2;zc+=(low?.8:.48))add('overlapping barrel ridge cap',new CylinderGeometry(.13,.13,low?.85:.54,low?6:8,1,false,Math.PI/2,Math.PI),[x,eave+rise+.10,zc],3,'roof',[Math.PI/2,0,0]);for(const zz of [z-d/2,z+d/2])for(const s of [-1,1])beam('deep bargeboard',[x,eave+rise-.07,zz],[x+s*w/2,eave-.07,zz],.21,0,'roof');};
 const face=(x,y,z,yaw,w,h)=>{const p=(dx,dy,dz)=>V([dx,dy,dz]).applyAxisAngle(new Vector3(0,1,0),yaw).add(V([x,y,z])).toArray();
  box('dark window recess',[w,h,.035],p(0,0,0),6,'detail',[0,yaw,0]);for(const s of [-1,1])box('window jamb',[.085,h+.14,.15],p(s*(w/2+.045),0,.02),0,'detail',[0,yaw,0]);box('projecting window sill',[w+.28,.105,.32],p(0,-h/2-.065,.08),0,'detail',[0,yaw,0]);box('window drip hood',[w+.28,.1,.25],p(0,h/2+.08,.06),0,'detail',[0,yaw,0]);
  for(const s of [-1,1]){box('glazing mullion',[.035,h,.05],p(s*w/6,0,.035),0,'detail',[0,yaw,0]);if(!low){box('open boarded shutter',[w*.43,h+.03,.07],p(s*(w*.76+.08),0,.06),0,'detail',[0,yaw+s*.28,0]);for(const yy of [-h*.29,h*.29])box('shutter hinge',[w*.38,.045,.025],p(s*(w*.76+.08),yy,.11),6,'detail',[0,yaw,0]);}}box('window transom',[w,.045,.05],p(0,.05,.035),0,'detail',[0,yaw,0]);};
 const vents=(x,y,z,w,h,yaw=0)=>{const p=(dx,dy,dz)=>V([dx,dy,dz]).applyAxisAngle(new Vector3(0,1,0),yaw).add(V([x,y,z])).toArray();box('dark ventilation opening',[w,h,.03],p(0,0,0),6,'detail',[0,yaw,0]);for(let yy=-h/2+.06;yy<h/2;yy+=low?.18:.11)box('sloping weather louvre',[w,.075,.11],p(0,yy,.035),0,'detail',[.20,yaw,0]);for(const s of [-1,1])box('vent framing',[.065,h+.1,.16],p(s*(w/2+.025),0,.02),0,'detail',[0,yaw,0]);};
 const cargo=(x,z,y,w)=>{const n=low?4:8;for(const side of [-1,1])for(let i=0;i<n;i++)box('separate cargo door plank',[w/2/n-.012,2.24,.025],[x+side*(i+.5)*w/2/n,y+1.15,z+.063],0,'detail',undefined,.86+wave(i,side+2)*.14);if(!low)for(const side of [-1,1])for(const yy of [.6,1.7])for(const off of [.15,w/2-.17])add('door hinge rivet',new CylinderGeometry(.023,.023,.022,6),[x+side*off,y+yy,z+.114],6,'detail',[Math.PI/2,0,0]);box('forged door latch',[.35,.055,.05],[x,y+1.15,z+.10],6,'detail');};
 for(const p of parts)if(['closed pitched roof','hay bay roof','roof around flue'].includes(p.name))p.tint=.72;
 // Keep original structure and closed roof backing. Replace only the broad placeholder courses.
 for(let i=parts.length-1;i>=0;i--)if(parts[i].name==='overlapping broad roof course'){parts[i].g.dispose();parts.splice(i,1);}
 if(id==='facility-farm'){
  gableTiles(-1,0,5.8,5.8,3.5,1.8);const L=3.25;roofPatch([1.335,3.327,-2.6],[0,0,1],[Math.cos(.2),-Math.sin(.2),0],5.2,L);cargo(-1,2.57,.22,2.6);vents(-1,4.18,2.59,.72,.72);
  for(const yaw of [-Math.PI/2,Math.PI/2])face(yaw<0?-3.59:1.59,2.15,-.8,yaw,.65,.85);
  for(const z of [-2.59,2.59])for(const x of [-3.35,1.35])beam('barn panel diagonal',[x,1,z],[x+(x<0?1:-1),2.6,z],.12);
  if(!low)for(const x of [-3.59,1.59])for(let z=-2.25;z<2.4;z+=.48)box('barn wall board batten',[.045,3.2,.045],[x,1.88,z],0,'detail');
  masonry([-1,-.08,2.615],5.2,.25,0,.62);masonry([-1,-.08,-2.615],5.2,.25,Math.PI,.62);
 }else if(id==='facility-granary'){
  gableTiles(0,0,5.6,5.65,4.05,1.65);cargo(0,2.48,1.35,2.4);vents(0,4.05,-2.49,1.05,.42,Math.PI);
  for(const x of [-2.49,2.49]){for(const z of [-1.8,1.8])beam('store side diagonal',[x,1.6,z],[x,3.75,-z*.3],.13);if(!low)for(let z=-2.25;z<2.4;z+=.48)box('storage board batten',[.045,2.55,.045],[x,2.68,z],0,'detail');}
  for(const y of [1.4,3.95])for(const x of [-2.49,2.49])beam('storage binding rail',[x,y,-2.4],[x,y,2.4],.12);
 }else if(id==='facility-smith'){
  const rects=parts.filter(p=>p.name==='roof around flue');for(const p of rects){p.g.computeBoundingBox();const b=p.g.boundingBox;const len=(b.max.z-b.min.z)*Math.sqrt(1+.12**2);roofPatch([b.min.x,3.2-.12*b.min.z,b.min.z],[1,0,0],[0,-.12/Math.sqrt(1+.12**2),1/Math.sqrt(1+.12**2)],b.max.x-b.min.x,len);}
  {const outer=[[-.65,-.65],[.65,-.65],[.65,.65],[-.65,.65]],inner=[[-.45,-.45],[.45,-.45],[.45,.45],[-.45,.45]];for(let i=0;i<4;i++){const j=(i+1)%4,v=[...outer.map(([x,z])=>[-.9+x,3.2-.12*(-.85+z)+.26,-.85+z]),...inner.map(([x,z])=>[-.9+x,3.2-.12*(-.85+z)+.4,-.85+z])];mesh('stepped chimney apron flashing',v,[[i,j,j+4,i+4],[i+4,j+4,j,i]],6,'roof');}}
  if(!low){for(const p of parts.filter(p=>['masonry rear','masonry side return','substantial hearth','hood masonry pier','continuous stack side','continuous stack face'].includes(p.name)))p.tint=.65;
   masonry([0,.18,-2.34],5.38,2.65,Math.PI);masonry([0,.18,-1.96],5.38,2.65);
   for(const s of [-1,1])masonry([s*2.69,.20,-.2],3.65,1.5,s*Math.PI/2);
   for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){const norm=V([0,0,.416]).applyAxisAngle(new Vector3(0,1,0),yaw);masonry([-.9+norm.x,3.6,-.85+norm.z],.82,1.75,yaw,.44);}
   masonry([-.9,.20,-.08],1.88,.63,0,.48);masonry([-1.87,.20,-.85],1.43,.63,-Math.PI/2,.48);masonry([.07,.20,-.85],1.43,.63,Math.PI/2,.48);
  }else{masonry([0,.2,-1.96],5.3,2.6,0,.95);masonry([-.9,3.65,-.43],.8,1.7,0,.8);}
  vents(1.5,2.3,-1.92,.66,.55);for(const x of [-2.5,2.5])box('post iron collar',[.29,.12,.29],[x,.28,2],6,'detail');
 }else if(id==='facility-lumber'){
  for(const s of [-1,1])roofPatch([-4.1,3.25,0],[1,0,0],[0,-.85/Math.hypot(.85,1.9),s*1.9/Math.hypot(.85,1.9)],8.2,Math.hypot(.85,1.9),{tile:0,boards:true});
  for(const z of [-1.92,1.92])for(const x of [-3.5,0,3.5])beam('exposed rafter tail',[x,2.55,z*.8],[x,2.31,z],.16,0,'roof');for(const x of [-3.5,0,3.5]){box('rack iron tie',[.27,.12,.27],[x,1.03,-1.3],6,'detail');if(!low)for(const z of [-1.3,1.3])add('wooden joint peg',new CylinderGeometry(.035,.035,.28,6),[x,2.15,z],0,'detail',[Math.PI/2,0,0]);}
  for(const x of [1,2.4])box('bench vise jaw',[.2,.25,.25],[x,.93,.91],0,'detail');
 }else if(id==='facility-market'){
  for(let i=parts.length-1;i>=0;i--)if(parts[i].name==='canvas awning'){const p=parts[i];p.g.computeBoundingBox();const b=p.g.boundingBox,c=b.getCenter(new Vector3()),w=b.max.x-b.min.x;const vertices=[],segments=low?4:8,depthSegments=low?3:6;for(let k=0;k<=depthSegments;k++)for(let j=0;j<=segments;j++){const f=j/segments,t=k/depthSegments,x=c.x-w/2+w*f,y=2.69-.47*t-Math.sin(t*Math.PI)*.15+Math.sin(f*6*Math.PI)*Math.sin(t*Math.PI)*.018;vertices.push([x,y,c.z-1.06+2.12*t]);}const faces=[];for(let k=0;k<depthSegments;k++)for(let j=0;j<segments;j++){const a=k*(segments+1)+j,b=a+1,d=a+segments+1,cc=d+1;faces.push([a,b,cc,d],[d,cc,b,a]);}mesh('draped canvas canopy',vertices,faces,p.tile,'roof');p.g.dispose();parts.splice(i,1);beam('canvas folded hem',[c.x-w/2,2.22,c.z+1.06],[c.x+w/2,2.22,c.z+1.06],.04,p.tile,'roof');beam('awning rear support',[c.x-w/2,2.65,c.z-1.06],[c.x+w/2,2.65,c.z-1.06],.12,0,'detail');for(const x of [c.x-w/2,c.x+w/2])beam('awning rope tie',[x,2.22,c.z+1.06],[x,1.9,c.z+.75],.035,0,'detail');}

  for(const p of parts.filter(p=>p.name==='boarded counter front')){p.g.computeBoundingBox();const b=p.g.boundingBox;for(let x=b.min.x+.12;x<b.max.x;x+=low?.5:.28)box('counter face board',[.022,.68,.025],[x,.53,b.max.z+.018],0,'detail');}
 }else if(id.startsWith('home-')){
  const wing=id==='home-offset-gables',d=id==='home-long-ridge'?6:4,xl=wing?-3: -2,xr=wing?3:2,z=d===6?2:1;for(const [x,yaw] of [[xl-.06,-Math.PI/2],[xr+.06,Math.PI/2]])face(x,1.65,z,yaw,.52,.82);
  const ex=wing?-2:-1,front=d/2;box('entry latch plate',[.07,.18,.03],[ex+.30,1.05,front+.14],6,'detail');if(!low)for(const z of [-d/2,d/2])for(const x of [xl,xr]){stone([x,.22,z+.06],.34,.24,0,.92);stone([x,.48,z+.06],.28,.23,0,.85);}
  if(id==='home-low-hip'){
   // The course relief is retained. Fine bundle ends are textured, not modeled as straws.
   for(const z of [-2.12,2.12])beam('thatched cottage eave bearer',[-2.1,2.77,z],[2.1,2.77,z],.14,0,'roof');
  }
 }
 // Selected structural joints rather than unrelated tiny clutter.
 if(!low)for(const p of [...parts].filter(p=>p.name==='bearing post').slice(0,8)){p.g.computeBoundingBox();const b=p.g.boundingBox,c=b.getCenter(new Vector3());box('post base iron shoe',[b.max.x-b.min.x+.035,.12,b.max.z-b.min.z+.035],[c.x,.2,c.z],6,'detail');}
}
