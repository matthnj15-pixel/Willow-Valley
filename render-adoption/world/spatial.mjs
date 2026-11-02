export const U = 2.8;
export const clamp = x => Math.max(0, Math.min(1, x));
export function unit(seed, x, z, suffix = '') {
 let h = 2166136261;
 for (const c of `${seed}:${x}:${z}:${suffix}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
 h ^= h >>> 16; h = Math.imul(h, 2246822507); h ^= h >>> 13;
 return (h >>> 0) / 4294967296;
}
export function smooth(seed, x, z) {
 const i = Math.floor(x), j = Math.floor(z), a = x-i, b = z-j, u = a*a*(3-2*a), v = b*b*(3-2*b);
 const mix = (a,b,t) => a+(b-a)*t;
 return mix(mix(unit(seed,i,j),unit(seed,i+1,j),u),mix(unit(seed,i,j+1),unit(seed,i+1,j+1),u),v);
}
export function distance(p, a, b) {
 const dx=b.x-a.x, dy=b.y-a.y, t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1));
 return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
export function inside(p, poly) {
 let yes=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];
  if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes;
 }
 return yes;
}
export const finitePoint = p => Number.isFinite(p?.x) && Number.isFinite(p?.y);
export const polygonNear = (p, poly, radius=0) => inside(p,poly)||poly.some((a,i)=>distance(p,a,poly[(i+1)%poly.length])<=radius);
// A bounded broad phase shared by fields and cover; no all-roads scan per blade.
export function spatialIndex(size=64) {
 const bins=new Map();
 return {
  add(value, x0,y0,x1,y1) {
   for(let j=Math.floor(y0/size);j<=Math.floor(y1/size);j++)for(let i=Math.floor(x0/size);i<=Math.floor(x1/size);i++){
    const k=`${i}:${j}`; if(!bins.has(k))bins.set(k,[]); bins.get(k).push(value);
   }
  },
  at(x,y) { return bins.get(`${Math.floor(x/size)}:${Math.floor(y/size)}`)||[]; }
 };
}
export function indexPolygon(index, polygon, value, pad=4) {
 if(polygon?.length<3 || !polygon.every(finitePoint))throw Error('Expected world-game polygon {x,y}');
 index.add(value,Math.min(...polygon.map(p=>p.x))-pad,Math.min(...polygon.map(p=>p.y))-pad,Math.max(...polygon.map(p=>p.x))+pad,Math.max(...polygon.map(p=>p.y))+pad);
}
