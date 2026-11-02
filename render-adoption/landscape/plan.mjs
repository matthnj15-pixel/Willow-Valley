import {dressPlots} from '../../assets/wv/landscape-next/plot-dressing.mjs';
import {derivePaintedFields} from '../../assets/wv/landscape-next/painted-fields.mjs';
import {createSpatialIndex,boundsOf,parallelOverlap,segmentIntersection} from '../../assets/wv/landscape-next/plot-geometry.mjs';
import {placeLandscape} from '../../assets/wv/landscape-next/placement.mjs';
import {UNITS,savedToMetres,displayedMetreSampler,originalBTree,metreExclusionToOriginalB} from './bridge.mjs';
const freeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
const unique=(rows,label)=>{if(new Set(rows.map(r=>r.key)).size!==rows.length)throw Error('Duplicate '+label+' key');};
function fieldsFrom(input,sample){
  if(!input)return {fields:[],diagnostics:{cells:0,queries:0,components:0,absent:true}};
  const {cellSize,bounds,cells,sampleUse}=input;
  if(!Number.isFinite(cellSize)||cellSize<.25||cellSize>16)throw Error('Field cellSizeMetres must be finite, .25..16');
  if(!cells&&(!bounds||!['minX','minZ','maxX','maxZ'].every(k=>Number.isFinite(bounds[k]))||bounds.minX>bounds.maxX||bounds.minZ>bounds.maxZ))throw Error('Finite ordered committed field bounds required');
  if(cells&&cells.some(c=>!Number.isSafeInteger(c.ix)||!Number.isSafeInteger(c.iz)))throw Error('Safe integer field cells required');
  return derivePaintedFields({cellSize,bounds,cells,sampleUse,sampleSurface:sample,maxCells:200000});
}
// Pure detached read view. Context arrays are transformed, centered visual metres.
export function planLandscape(view,context,{terrainSurface,world,entries}) {
  if(view.schemaVersion!==1||view.revision==null)throw Error('WV007 version 1 revision required');
  if(view.world.width!==world.width||view.world.depth!==world.depth)throw Error('Read-view world dimensions mismatch');
  const sample=displayedMetreSampler(terrainSurface,world),placements=context.placementView?.placements??[],byKey=new Map(placements.map(p=>[p.key,p]));
  unique(placements,'placement');unique(view.houses??[],'house');
  const exclusions=[],existingFences=[],externalKeys=new Set(),deferred=[];
  for(const p of placements){
    exclusions.push(...(p.exclusionsMetres??[]),...(p.corridorsMetres??[]));
    for(const f of p.integralBoundariesMetres??[]){existingFences.push({...f,ownerKey:f.ownerKey??p.key});externalKeys.add(f.key);}
  }
  for(const [kind,rows] of [['road',view.roads],['lane',view.localLanes],['approach',view.approaches]])for(const r of rows??[]){
    if(!Number.isFinite(r.width)||r.width<=0)throw Error('Actual route width required');
    exclusions.push({kind,points:r.points.map(p=>savedToMetres(p,world)),radius:r.width/UNITS/2});
  }
  for(const f of view.retainedBoundaries??[]) {
    existingFences.push({...f,a:savedToMetres(f.a,world),b:savedToMetres(f.b,world)});
    if(f.renderedByHost)externalKeys.add(f.key);
  }
  // Duplicate references to the same physical integral span are admitted only if identical.
  const spans=new Map();for(const f of existingFences){const old=spans.get(f.key);if(old&&JSON.stringify(old)!==JSON.stringify(f))throw Error('Conflicting retained boundary key '+f.key);spans.set(f.key,f);}
  const retainedConflicts=[],retainedIndex=createSpatialIndex();
  for(const f of spans.values()){
    for(const other of retainedIndex.query(boundsOf([f.a,f.b],.3))){
      const overlap=parallelOverlap(f.a,f.b,other.a,other.b,.3),hit=segmentIntersection(f.a,f.b,other.a,other.b);
      if(overlap||hit&&hit.t>1e-6&&hit.t<1-1e-6&&hit.u>1e-6&&hit.u<1-1e-6)retainedConflicts.push({key:f.key,otherKey:other.key,reason:overlap?'retained-spans-overlap':'retained-spans-cross'});
    }
    retainedIndex.add(f,boundsOf([f.a,f.b],.3));
  }
  const plots=[];
  for(const h of view.houses??[]) {
    if(!h.parcel){deferred.push({key:h.key,reason:'legacy-no-parcel; retain existing presentation'});continue;}
    const polygon=h.parcel.vertices.map(p=>savedToMetres(p,world)),p=byKey.get(h.key);
    if(!p?.exclusionsMetres?.length){
      deferred.push({key:h.key,reason:'missing-full-placement; defer parcel dressing'});
      exclusions.push({kind:'unresolved-parcel',polygon});continue;
    }
    if(!p.corridorsMetres?.length){deferred.push({key:h.key,reason:'missing-actual-access; defer parcel dressing'});exclusions.push({kind:'unresolved-parcel',polygon});continue;}
    plots.push({key:h.key,kind:'home',establishedAt:h.foundedTurn??h.foundedEra,origin:savedToMetres(h.savedPosition,world),yaw:h.yaw??0,
      polygon,holes:(h.parcel.holes??[]).map(r=>r.map(p=>savedToMetres(p,world))),use:h.landscapeUse??'kitchen-garden',
      gates:(h.actualEntrance?.gates??[]).map(g=>({point:savedToMetres(g.point,world),width:g.width/UNITS}))});
  }
  const trees=(view.retainedTrees??[]).map(originalBTree);
  // Preserve existing tree clearance even when its B replacement falls back.
  for(const t of view.retainedTrees??[]) {
    const b=originalBTree(t),point=savedToMetres({x:b.x,y:b.z},world);
    const radius=(t.clearanceRadiusGame??Math.max(4,(b.h??22)*.6))/UNITS;
    // B boundary clipping expects segments: a zero-length capsule represents a tree.
    exclusions.push({kind:'retained-tree',points:[point,point],radius});
  }
  const fieldPlan=fieldsFrom(view.committedFields,sample);
  const dressed=dressPlots({seed:view.world.seed,plots:[...plots,...fieldPlan.fields],existingFences:[...spans.values()],exclusions,sample,quality:'normal',distance:'near'});
  // New generic common props belong to P1/D. No B well, wagon, cargo, bench or barrel.
  const generic=dressed.props.filter(p=>['barrel','wood-stack'].includes(p.kind));
  const props=dressed.props.filter(p=>!['barrel','wood-stack'].includes(p.kind));
  const treeResult=placeLandscape({seed:view.world.seed,width:world.width,depth:world.depth,entries,
    sample:(x,z)=>{const s=terrainSurface.sample(x,z);return {...s,water:s.water??null,slope:s.slope??world.slope?.(x,z)??0};},
    treeCandidates:trees,exclusions:exclusions.filter(e=>e.kind!=='retained-tree').map(e=>metreExclusionToOriginalB(e,world))});
  const protection=new Map((view.retainedTrees??[]).map(t=>['tree:'+t.key,t]));
  for(const r of treeResult.instances){r.protected=!!protection.get(r.key)?.protected;r.authoritativeKey=protection.get(r.key).key;}
  const cover=(view.decorativeCandidates??[]).filter(p=>p.assetId!=='grass-tuft');
  // Explicit candidates only. Never use reference hamlet forest/cover patches.
  const coverResult=placeLandscape({seed:view.world.seed,width:world.width,depth:world.depth,entries,
    sample:(x,z)=>{const s=terrainSurface.sample(x,z);return {...s,water:s.water??null,slope:s.slope??world.slope?.(x,z)??0};},
    decorativeCandidates:cover.map(p=>({...p,x:p.savedPosition.x,z:p.savedPosition.y})),
    exclusions:[...exclusions,...plots.map(p=>({kind:'parcel',polygon:p.polygon})),...fieldPlan.fields.map(p=>({kind:'field',polygon:p.polygon}))].map(e=>metreExclusionToOriginalB(e,world))});
  const vegetation=[...treeResult.instances,...coverResult.instances];unique(vegetation,'vegetation');
  const boundaries=dressed.boundaries;
  return freeze({revision:view.revision,terrainRevision:view.world.terrainRevision,units:'centered visual metres; vegetation centered game units',
    vegetation,treeFallbacks:treeResult.retainedTrees,fields:fieldPlan.fields,props,beds:dressed.beds,boundaries,genericPropRequests:generic,
    renderBoundaries:boundaries.fences.filter(f=>!externalKeys.has(f.key)),occupancyExclusions:[...exclusions,...plots.map(p=>({key:p.key,kind:'household-parcel',polygon:p.polygon,holes:p.holes})),...fieldPlan.fields.map(f=>({key:f.key,kind:'field',polygon:f.polygon,holes:f.holes})),...dressed.beds.map(b=>({key:b.key,kind:'garden-bed',polygon:b.polygon}))],
    diagnostics:{deferred,plotStats:dressed.plotStats,field:fieldPlan.diagnostics,spatial:dressed.diagnostics,
      conflicts:[...boundaries.conflicts,...retainedConflicts],genericPropsDeferred:generic.map(p=>({key:p.key,kind:p.kind,reason:'P1 D generic-prop interface required'})),
      grassDeferred:(view.decorativeCandidates??[]).filter(p=>p.assetId==='grass-tuft').length,
      meadowCoverageRevision:context.meadowCoverage?.revision??null,grassPolicy:'P2 continuous cover; B grass deferred',
      treeIndex:treeResult.diagnostics,coverIndex:coverResult.diagnostics}});
}
