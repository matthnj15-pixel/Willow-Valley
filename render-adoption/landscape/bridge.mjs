// Saved XY -> centered game XZ -> B plot metres. Never use this for original B placement.
export const UNITS = 2.8;
export function savedToMetres(p, world) {
  return {x:(p.x-world.width/2)/UNITS,z:(p.y-world.depth/2)/UNITS};
}
export function metresToSaved(p, world) {
  return {x:p.x*UNITS+world.width/2,y:p.z*UNITS+world.depth/2};
}
export function metresToScene(p, height=0) { return [p.x*UNITS,height*UNITS,p.z*UNITS]; }
export function displayedMetreSampler(terrainSurface, world) {
  if(typeof terrainSurface?.sample!=='function') throw Error('Displayed terrainSurface.sample required');
  return (x,z)=>{
    const p=metresToSaved({x,z},world);
    if(p.x<0||p.y<0||p.x>world.width||p.y>world.depth)return {height:NaN,water:null,slope:Infinity};
    const s=terrainSurface.sample(p.x,p.y);
    return {...s,height:s.height/UNITS,slope:s.slope??world.slope?.(p.x,p.y)??0,water:s.water??null};
  };
}
// Original placeLandscape wants uncentered saved/game-unit X/Z, height and clearance.
export function originalBTree(t) {
  const p=t.savedPosition??{x:t.x,y:t.z??t.y};
  if(t.key==null||![p.x,p.y].every(Number.isFinite))throw Error('Authoritative tree key/position required');
  return {key:String(t.key),x:p.x,z:p.y,...(Number.isFinite(t.heightGame??t.h)?{h:t.heightGame??t.h}:{})};
}
export function metreExclusionToOriginalB(e,world) {
  const point=p=>{const s=metresToSaved(p,world);return {x:s.x,z:s.y};};
  return {...e,...(e.polygon?{polygon:e.polygon.map(point)}:{points:e.points.map(point)}),radius:(e.radius??0)*UNITS};
}
