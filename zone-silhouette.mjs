// Merge round brush samples into one cartographic boundary without changing saved data.
export function zoneSilhouette(zones,step=5,include=()=>true){
 const filled=new Set(),key=(x,y)=>x+","+y;
 for(const z of zones){
  const r=z.radius;if(!Number.isFinite(r)||!Array.isArray(z.points))continue;
  for(const p of z.points){
   const x0=Math.max(0,Math.floor((p.x-r)/step)-1),x1=Math.min(Math.ceil(1200/step),Math.ceil((p.x+r)/step));
   const y0=Math.max(0,Math.floor((p.y-r)/step)-1),y1=Math.min(Math.ceil(900/step),Math.ceil((p.y+r)/step));
   for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
    const dx=(x+.5)*step-p.x,dy=(y+.5)*step-p.y;
    if(dx*dx+dy*dy<=r*r)filled.add(key(x,y));
   }
  }
 }
 // Crop the silhouette to authoritative zoning rules, including water,
 // built-road corridors and any precise eraser strokes.
 for(const k of filled){
  const [x,y]=k.split(",").map(Number);
  if(!include({x:(x+.5)*step,y:(y+.5)*step}))filled.delete(k);
 }
 if(!filled.size)return "";
 const edges=[],starts=new Map();
 function add(ax,ay,bx,by){
  const e={a:[ax,ay],b:[bx,by],used:false},k=key(ax,ay);
  edges.push(e);if(!starts.has(k))starts.set(k,[]);starts.get(k).push(e);
 }
 for(const k of filled){
  const [x,y]=k.split(",").map(Number);
  if(!filled.has(key(x,y-1)))add(x,y,x+1,y);
  if(!filled.has(key(x+1,y)))add(x+1,y,x+1,y+1);
  if(!filled.has(key(x,y+1)))add(x+1,y+1,x,y+1);
  if(!filled.has(key(x-1,y)))add(x,y+1,x,y);
 }
 const paths=[];
 for(const first of edges){
  if(first.used)continue;
  const ring=[],origin=key(...first.a);let e=first;
  while(e&&!e.used){
   e.used=true;ring.push(e.a);
   const at=key(...e.b);if(at===origin)break;
   const choices=(starts.get(at)||[]).filter(o=>!o.used);
   if(!choices.length)break;
   const dx=e.b[0]-e.a[0],dy=e.b[1]-e.a[1];
   const priority=o=>{
    const nx=o.b[0]-o.a[0],ny=o.b[1]-o.a[1],cross=dx*ny-dy*nx,dot=dx*nx+dy*ny;
    return cross>0?0:dot>0?1:cross<0?2:3;
   };
   choices.sort((a,b)=>priority(a)-priority(b));e=choices[0];
  }
  const corners=ring.filter((p,i)=>{
   const a=ring[(i+ring.length-1)%ring.length],b=ring[(i+1)%ring.length];
   return (p[0]-a[0])*(b[1]-p[1])!==(p[1]-a[1])*(b[0]-p[0]);
  }).map(p=>[p[0]*step,p[1]*step]);
  if(corners.length<3)continue;
  const midpoint=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
  const start=midpoint(corners.at(-1),corners[0]);let d="M "+start.join(" ");
  for(let i=0;i<corners.length;i++){
   const p=corners[i],m=midpoint(p,corners[(i+1)%corners.length]);
   d+=" Q "+p.join(" ")+" "+m.join(" ");
  }
  paths.push(d+" Z");
 }
 return paths.join(" ");
}
