import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planPlotBoundaries} from '../assets/wv/landscape-next/plot-boundaries.mjs';
import {dressPlots} from '../assets/wv/landscape-next/plot-dressing.mjs';
import {derivePaintedFields} from '../assets/wv/landscape-next/painted-fields.mjs';
import {createPlotFenceLibrary} from '../assets/wv/landscape-next/plot-fence-view.mjs';
import {pointInShape,fitsCircle,lerp,length,parallelOverlap,segmentIntersection} from '../assets/wv/landscape-next/plot-geometry.mjs';
import {paintZones,applyZoneEdits,zoneAt} from '../organic-world.mjs';
const flat=()=>({height:0,water:null,slope:0}),box=(x,z,w,d)=>[{x,z},{x:x+w,z},{x:x+w,z:z+d},{x,z:z+d}];
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
function noDuplicateSpans(fences){for(let i=0;i<fences.length;i++)for(const b of fences.slice(i+1)){assert.equal(parallelOverlap(fences[i].a,fences[i].b,b.a,b.b,.001),null,'No overlapping physical boundaries');const hit=segmentIntersection(fences[i].a,fences[i].b,b.a,b.b);assert.ok(!hit||hit.t<1e-6||hit.t>1-1e-6||hit.u<1e-6||hit.u>1-1e-6,'No crossing fence interiors');}}
test('plot boundaries reuse exact, partial, reversed and near neighbor edges once',()=>{
 const a={key:'old',establishedAt:1,polygon:box(0,0,10,12)},b={key:'new',establishedAt:2,polygon:box(10,2,8,7)},c={key:'near',establishedAt:3,polygon:box(10.2,9,8,3)};
 const input=freeze({plots:[c,b,a],sample:flat}),before=JSON.stringify(input),one=planPlotBoundaries(input),two=planPlotBoundaries({...input,plots:[a,b,c].map(p=>({...p,polygon:[...p.polygon.slice(2),...p.polygon.slice(0,2)].reverse()}))});
 assert.deepEqual(one,two);assert.equal(JSON.stringify(input),before);noDuplicateSpans(one.fences);
 const shared=one.fences.find(f=>f.ownerKey==='old'&&f.users.includes('new'));assert.ok(shared);assert.ok(shared.users.includes('near'));assert.deepEqual(shared.users,['near','new','old']);
});
test('an existing boundary keeps its complete geometry and key when later plots join',()=>{
 const existing=freeze([{key:'built-fence',ownerKey:'earlier-household',kind:'fence-wattle',a:{x:10,z:0},b:{x:10,z:18}}]),before=JSON.stringify(existing);
 const plan=planPlotBoundaries({existingFences:existing,plots:[{key:'later-household',polygon:box(10.2,3,8,9)}],sample:flat});
 const kept=plan.fences.find(f=>f.key==='built-fence');assert.deepEqual(kept.a,existing[0].a);assert.deepEqual(kept.b,existing[0].b);assert.equal(kept.kind,'fence-wattle');assert.ok(kept.users.includes('later-household'));assert.equal(JSON.stringify(existing),before);noDuplicateSpans(plan.fences);
 const conflict=planPlotBoundaries({existingFences:existing,exclusions:[{kind:'door',points:[{x:8,z:8},{x:12,z:8}],radius:1}],sample:flat});assert.equal(conflict.fences.length,1);assert.equal(conflict.conflicts[0].reason,'existing-fence-in-exclusion');
});
test('fences clip narrow access corridors analytically and preserve explicit gates and dry ground',()=>{
 const road={kind:'loading-stair',points:[{x:-1,z:5.137},{x:11,z:5.137}],radius:.018},input={plots:[{key:'home',polygon:box(0,0,10,10),gates:[{point:{x:5,z:0},width:2.6}]}],exclusions:[road],sample:(x,z)=>({height:z*.02,water:z>8?0:null,slope:.02})},p=planPlotBoundaries(input);
 for(const f of p.fences)for(let t=0;t<=1;t+=.01){const q=lerp(f.a,f.b,t);assert.ok(Math.abs(q.z-5.137)>=.118-1e-7);assert.ok(q.z<=8);if(Math.abs(q.z)<1e-6)assert.ok(Math.abs(q.x-5)>=1.42-1e-6);}
 assert.ok(p.fences.length>4);noDuplicateSpans(p.fences);
});
test('larger and concave holdings receive fitted props; small/narrow plots omit detail without model stretching',()=>{
 const plots=freeze([{key:'small',use:'orchard',polygon:box(0,0,3,3)},{key:'large',use:'orchard',polygon:box(10,0,18,17)},{key:'concave',use:'kitchen-garden',polygon:[{x:40,z:0},{x:57,z:0},{x:57,z:6},{x:47,z:6},{x:47,z:18},{x:40,z:18}],holes:[box(42,8,2,2)]}]),input=freeze({seed:42,plots,sample:flat}),before=JSON.stringify(input),normal=dressPlots(input),low=dressPlots({...input,quality:'low'}),far=dressPlots({...input,distance:'far'});
 assert.equal(JSON.stringify(input),before);assert.equal(normal.props.filter(p=>p.plotKey==='small').length,0);assert.ok(normal.props.filter(p=>p.plotKey==='large').length>=4);assert.ok(normal.beds.length>0);
 assert.deepEqual(normal,dressPlots({...input,plots:[...plots].reverse(),camera:{yaw:3},unrelated:{turn:239}}));
 const trees=p=>p.props.filter(r=>r.kind==='fruit-tree').map(({key,origin,scale,yaw})=>({key,origin,scale,yaw}));assert.deepEqual(trees(normal),trees(low));assert.deepEqual(trees(normal),trees(far));assert.ok(low.props.length<normal.props.length);assert.ok(far.props.length<low.props.length);
 for(const p of normal.props){const plot=plots.find(x=>x.key===p.plotKey);assert.ok(pointInShape({x:p.origin[0],z:p.origin[2]},plot));assert.ok(p.scale>=.83&&p.scale<=1);assert.equal(p.groundContact.baseY,0);}
 for(const b of normal.beds){const plot=plots.find(p=>p.key===b.plotKey);assert.ok(b.polygon.every(p=>pointInShape(p,plot)));}
});
test('neighbor plots, real structure envelopes and old tree canopies constrain decorative placement',()=>{
 const plots=[{key:'a',use:'orchard',polygon:box(0,0,12,18)},{key:'b',use:'orchard',polygon:box(12,0,13,18)}],exclusions=[{kind:'structure',polygon:box(2,2,6,7)},{kind:'retained-tree',points:[{x:18,z:12}],radius:2.6},{kind:'approach',points:[{x:6,z:0},{x:6,z:12}],radius:.8}],p=dressPlots({seed:'neighbors',plots,exclusions,sample:flat});
 assert.ok(p.props.length>0);for(const prop of p.props){const point={x:prop.origin[0],z:prop.origin[2]},radius=(prop.bounds.max[0]-prop.bounds.min[0])/2;assert.ok(fitsCircle(point,radius,plots.find(p=>p.key===prop.plotKey)));assert.ok(Math.hypot(point.x-18,point.z-12)>=radius+2.6);}
 const slope=dressPlots({seed:7,plots:[{key:'yard',use:'work-yard',polygon:box(0,0,20,20)}],sample:(x,z)=>({height:x*.08,water:null,slope:.08})});assert.equal(slope.props.filter(p=>p.kind==='wood-stack').length,0);assert.ok(slope.props.every(p=>p.groundContact.maxGap<=.10));
});
test('painted fields merge overlapping dabs, preserve eraser holes, and never use brush bounding rectangles',()=>{
 const state={zones:[],roads:[],houses:[],buildings:[]};assert.ok(paintZones(state,'farmland',[[{x:200,y:200},{x:235,y:200},{x:270,y:200}]],54).ok);assert.ok(paintZones(state,'erase',[[{x:235,y:200}]],24).ok);freeze(state);const before=JSON.stringify(state),U=2.8,sampleUse=(x,z)=>zoneAt(state,{x:x*U,y:z*U}),result=derivePaintedFields({bounds:{minX:145/U,minZ:145/U,maxX:325/U,maxZ:255/U},cellSize:.75,sampleUse,sampleSurface:flat});
 assert.equal(result.fields.length,1);assert.equal(result.fields[0].holes.length,1);assert.equal(pointInShape({x:235/U,z:200/U},result.fields[0]),false);assert.equal(pointInShape({x:148/U,z:148/U},result.fields[0]),false);assert.equal(JSON.stringify(state),before);
 const boundary=planPlotBoundaries({plots:result.fields,sample:flat});assert.ok(boundary.gaps.some(g=>g.reason==='field-access'));for(const f of boundary.fences)for(let t=0;t<=1;t+=.04){const p=lerp(f.a,f.b,t);assert.equal(sampleUse(p.x,p.z),'farmland');}
});
test('only committed paint is consumed; field erasure and roads change outlines without writing state',()=>{
 const state={zones:[],roads:[[{x:170,y:220},{x:330,y:220}]],houses:[],buildings:[]};assert.ok(paintZones(state,'farmland',[[{x:245,y:180}]],54).ok);const edits=[{type:'erase',radius:24,points:[{x:245,y:178}]}],before=JSON.stringify(state),preview=applyZoneEdits(state,edits);assert.equal(JSON.stringify(state),before);const bounds={minX:180,minZ:120,maxX:310,maxZ:240},read=s=>derivePaintedFields({bounds,cellSize:2,sampleUse:(x,z)=>zoneAt(s,{x,y:z}),sampleSurface:flat});const initial=read(state),pending=read({...state,zones:preview.zones});assert.ok(initial.diagnostics.cells>pending.diagnostics.cells);assert.deepEqual(read(state),initial);
 for(const f of initial.fields)for(const p of f.polygon)assert.ok(p.z<=203);assert.ok(applyZoneEdits(state,edits,{commit:true}).ok);assert.deepEqual(read(state),pending);
});
test('cell masks keep islands separate and holes unplanted, with bounded spatial queries',()=>{
 const cells=[];for(let x=0;x<10;x++)for(let z=0;z<10;z++)if(!(x>=3&&x<7&&z>=3&&z<7))cells.push({ix:x,iz:z});cells.push({ix:12,iz:12});const input=freeze({cellSize:1,cells}),before=JSON.stringify(input),r=derivePaintedFields(input);assert.equal(r.fields.length,2);assert.equal(r.fields.filter(f=>f.holes.length).length,1);assert.equal(JSON.stringify(input),before);
 const p=dressPlots({seed:4,plots:r.fields,sample:flat});assert.ok(p.props.length);assert.ok(p.props.every(prop=>pointInShape({x:prop.origin[0],z:prop.origin[2]},r.fields.find(f=>f.key===prop.plotKey))));
 const pasture=dressPlots({seed:4,plots:r.fields.map(f=>({...f,planting:false})),sample:flat});assert.equal(pasture.props.length,0);assert.ok(pasture.boundaries.fences.length>0);
 const many=planPlotBoundaries({plots:Array.from({length:200},(_,i)=>({key:'plot-'+String(i).padStart(3,'0'),polygon:box(i*80,0,10,12)})),sample:flat});assert.ok(many.diagnostics.fenceQueries.tests<many.diagnostics.requests*8);assert.throws(()=>derivePaintedFields({bounds:{minX:0,minZ:0,maxX:1000,maxZ:1000},sampleUse:()=> 'farmland'}),/budget/);
});
test('fences instance shared construction parts, seat posts independently and dispose only their own buffers',()=>{
 const library=createPlotFenceLibrary(),records=[{key:'rolling',a:{x:0,z:0},b:{x:12,z:4},kind:'fence-rail'}],sample=(x,z)=>({height:Math.sin(x/4)*.2+z*.02}),normal=library.build(records,{sample}),low=library.build(records,{sample,quality:'low'});assert.equal(normal.group.children.length,2);assert.equal(normal.group.children[0].geometry,low.group.children[1].geometry);assert.ok(low.stats.triangles<normal.stats.triangles);assert.equal(normal.stats.textureBytes,0);
 for(const p of normal.contacts)assert.equal(p.height,sample(p.x,p.z).height);assert.ok(low.contacts.every(p=>normal.contacts.some(q=>q.key===p.key)));let disposed=0;normal.group.children[0].geometry.addEventListener('dispose',()=>disposed++);normal.dispose();normal.dispose();assert.equal(disposed,0);low.dispose();library.dispose();library.dispose();assert.equal(disposed,1);assert.throws(()=>library.build(records,{sample}),/disposed/);
});
test('crossing a retained fence leaves a gap; slightly angled neighboring boundaries reuse its physical line',()=>{
 const existing=[{key:'retained',a:{x:-2,z:5},b:{x:12,z:5},ownerKey:'old',kind:'fence-rail'}],p=planPlotBoundaries({plots:[{key:'new',polygon:box(0,0,10,10)}],existingFences:existing,sample:flat});assert.equal(p.gaps.filter(g=>g.reason==='fence-crossing').length,2);noDuplicateSpans(p.fences);
 const near=planPlotBoundaries({plots:[{key:'later',polygon:[{x:0,z:5.1},{x:10,z:5.25},{x:10,z:12},{x:0,z:12}]}],existingFences:existing,sample:flat});assert.ok(near.fences.find(f=>f.key==='retained').users.includes('later'));assert.equal(near.fences.filter(f=>f.ownerKey==='later'&&f.a.z<5.4&&f.b.z<5.4).length,0);
});
