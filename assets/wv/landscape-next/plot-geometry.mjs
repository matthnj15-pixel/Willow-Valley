// Metre-space geometry only. No world, renderer, persistence or input imports.
export const EPS=1e-7;
export const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});
export const length=(a,b)=>Math.hypot(b.x-a.x,b.z-a.z);
export const dot=(a,b)=>a.x*b.x+a.z*b.z;
export const cross=(a,b)=>a.x*b.z-a.z*b.x;
export const sub=(a,b)=>({x:a.x-b.x,z:a.z-b.z});
export const pointKey=p=>Math.round(p.x*10000)+','+Math.round(p.z*10000);
export const segmentKey=(a,b)=>[pointKey(a),pointKey(b)].sort().join(':');
export function ringArea(ring){return ring.reduce((n,p,i)=>n+cross(p,ring[(i+1)%ring.length]),0)/2;}
export function normalizeRing(input){
 const ring=[];for(const p of input||[]){if(!Number.isFinite(p.x)||!Number.isFinite(p.z))throw Error('Polygon coordinates must be finite visual metres');if(!ring.length||length(p,ring.at(-1))>EPS)ring.push({x:p.x,z:p.z});}
 if(ring.length>1&&length(ring[0],ring.at(-1))<EPS)ring.pop();
 if(ring.length<3||Math.abs(ringArea(ring))<EPS)throw Error('A plot needs a nondegenerate polygon');
 if(ringArea(ring)<0)ring.reverse();let first=0;for(let i=1;i<ring.length;i++)if(ring[i].x<ring[first].x||ring[i].x===ring[first].x&&ring[i].z<ring[first].z)first=i;
 return ring.slice(first).concat(ring.slice(0,first));
}
export function boundsOf(points,pad=0){return{minX:Math.min(...points.map(p=>p.x))-pad,maxX:Math.max(...points.map(p=>p.x))+pad,minZ:Math.min(...points.map(p=>p.z))-pad,maxZ:Math.max(...points.map(p=>p.z))+pad};}
export function createSpatialIndex(cell=8){
 const bins=new Map();let tests=0;
 function keys(b){const out=[];for(let x=Math.floor(b.minX/cell);x<=Math.floor(b.maxX/cell);x++)for(let z=Math.floor(b.minZ/cell);z<=Math.floor(b.maxZ/cell);z++)out.push(x+':'+z);return out;}
 return{add(item,b){for(const k of keys(b)){if(!bins.has(k))bins.set(k,[]);bins.get(k).push(item);}},query(b){const found=new Set();for(const k of keys(b))for(const item of bins.get(k)||[])found.add(item);tests+=found.size;return [...found];},stats:()=>({cells:bins.size,tests})};
}
export function pointInRing(p,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)inside=!inside;}return inside;}
export function pointInShape(p,shape){return pointInRing(p,shape.polygon)&&!(shape.holes||[]).some(h=>pointInRing(p,h));}
export function segmentDistance(p,a,b){const d=sub(b,a),t=Math.max(0,Math.min(1,dot(sub(p,a),d)/(dot(d,d)||1)));return length(p,lerp(a,b,t));}
export const edgeDistance=(p,ring)=>Math.min(...ring.map((a,i)=>segmentDistance(p,a,ring[(i+1)%ring.length])));
export function fitsCircle(p,r,shape){return pointInShape(p,shape)&&edgeDistance(p,shape.polygon)>=r&&(shape.holes||[]).every(h=>edgeDistance(p,h)>=r);}
export function segmentIntersection(a,b,c,d){const v=sub(b,a),w=sub(d,c),den=cross(v,w);if(Math.abs(den)<EPS)return null;const t=cross(sub(c,a),w)/den,u=cross(sub(c,a),v)/den;return t>=-EPS&&t<=1+EPS&&u>=-EPS&&u<=1+EPS?{t,u}:null;}
export function fitsPolygon(poly,shape,margin=.08){
 if(!poly.every(p=>fitsCircle(p,margin,shape)))return false;
 // Concave boundaries and holes can cross an otherwise valid rectangle.
 for(const ring of [shape.polygon,...shape.holes||[]])for(let i=0;i<ring.length;i++)for(let j=0;j<poly.length;j++)if(segmentIntersection(ring[i],ring[(i+1)%ring.length],poly[j],poly[(j+1)%poly.length]))return false;
 return !(shape.holes||[]).some(h=>pointInRing(h[0],poly));
}
export function unionIntervals(input){
 const list=input.map(([a,b])=>[Math.max(0,a),Math.min(1,b)]).filter(([a,b])=>b-a>EPS).sort((a,b)=>a[0]-b[0]||a[1]-b[1]),out=[];
 for(const r of list){const prev=out.at(-1);if(prev&&r[0]<=prev[1]+EPS)prev[1]=Math.max(prev[1],r[1]);else out.push([...r]);}return out;
}
export function subtractIntervals(input,cuts){let out=input;for(const [lo,hi] of unionIntervals(cuts)){const next=[];for(const [a,b] of out){if(lo>=b||hi<=a)next.push([a,b]);else{if(lo>a)next.push([a,lo]);if(hi<b)next.push([hi,b]);}}out=next;}return out;}
function circleRange(a,b,p,r){const v=sub(b,a),ll=dot(v,v);if(ll<EPS)return[];const t=dot(sub(p,a),v)/ll,d2=dot(sub(p,a),sub(p,a))-t*t*ll;if(d2>r*r)return[];const dt=Math.sqrt(Math.max(0,r*r-d2)/ll);return[[t-dt,t+dt]];}
export function capsuleRanges(a,b,c,d,r){
 const len=length(c,d);if(len<EPS)return circleRange(a,b,c,r);
 const u={x:(d.x-c.x)/len,z:(d.z-c.z)/len},v={x:-u.z,z:u.x},p=sub(a,c),step=sub(b,a);let lo=0,hi=1;
 for(const [axis,min,max] of [[u,0,len],[v,-r,r]]){const start=dot(p,axis),delta=dot(step,axis);if(Math.abs(delta)<EPS){if(start<min||start>max){hi=-1;break;}}else{let x=(min-start)/delta,y=(max-start)/delta;if(x>y)[x,y]=[y,x];lo=Math.max(lo,x);hi=Math.min(hi,y);}}
 return unionIntervals([...(hi>lo?[[lo,hi]]:[]),...circleRange(a,b,c,r),...circleRange(a,b,d,r)]);
}
export function polygonRanges(a,b,ring){
 const cuts=[0,1];for(let i=0;i<ring.length;i++){const hit=segmentIntersection(a,b,ring[i],ring[(i+1)%ring.length]);if(hit)cuts.push(Math.max(0,Math.min(1,hit.t)));}cuts.sort((a,b)=>a-b);const out=[];
 for(let i=1;i<cuts.length;i++){const lo=cuts[i-1],hi=cuts[i],p=lerp(a,b,(lo+hi)/2);if(hi-lo>EPS&&pointInRing(p,ring)&&edgeDistance(p,ring)>EPS)out.push([lo,hi]);}return out;
}
export function parallelOverlap(a,b,c,d,tolerance=.3){
 const v=sub(b,a),w=sub(d,c),len=length(a,b),other=length(c,d);if(len<EPS||other<EPS||Math.abs(cross(v,w))/(len*other)>.087)return null;
 const t0=dot(sub(c,a),v)/(len*len),t1=dot(sub(d,a),v)/(len*len);let lo=Math.max(0,Math.min(t0,t1)),hi=Math.min(1,Math.max(t0,t1));
 const start=cross(w,sub(a,c))/other,delta=cross(w,v)/other;if(Math.abs(delta)<EPS){if(Math.abs(start)>tolerance)return null;}else{let p=(-tolerance-start)/delta,q=(tolerance-start)/delta;if(p>q)[p,q]=[q,p];lo=Math.max(lo,p);hi=Math.min(hi,q);}return hi-lo>EPS?[lo,hi]:null;
}
