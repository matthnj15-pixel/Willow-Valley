import {derivePaintedFields} from './painted-fields.mjs';
import {rectangle,lineDistance} from './hamlet-plan.mjs';
// Deliberately includes an old shared fence, unequal irregular holdings, a
// constrained orchard and a connected painted field with an erased island.
export function createPlotStudyPlan(){
 const lane={key:'study-lane',stage:4,width:2.6,kind:'lane',points:[{x:-42,z:15},{x:45,z:15}]},fieldPath={key:'field-access',kind:'path',width:1.8,points:[{x:-26,z:15},{x:-26,z:-23}]};
 const holdings=[
  {key:'holding-01',assetId:'home-steep-gable',origin:{x:-14,z:4},yaw:0,use:'kitchen-garden',polygon:[{x:-21,z:12},{x:-8,z:12},{x:-8,z:-9},{x:-16,z:-12},{x:-22,z:-5}],garden:{center:{x:-14,z:-5},width:8,depth:6,yaw:0},gate:{x:-14,z:13.6}},
  {key:'holding-02',assetId:'home-low-hip',origin:{x:-2,z:4},yaw:0,use:'work-yard',polygon:[{x:-8,z:12},{x:4,z:12},{x:4,z:-6},{x:0,z:-11},{x:-8,z:-9}],garden:{center:{x:-2,z:-5},width:7,depth:6,yaw:0},gate:{x:-2,z:13.6}},
  {key:'holding-03',assetId:'home-porch-cabin',origin:{x:15,z:3},yaw:0,use:'orchard',polygon:[{x:8,z:12},{x:24,z:12},{x:26,z:-8},{x:20,z:-16},{x:9,z:-14},{x:7,z:-4}],garden:{center:{x:16,z:-9},width:13,depth:8,yaw:0},gate:{x:15,z:13.6}},
  {key:'holding-04',assetId:'home-low-hip',origin:{x:32,z:4},yaw:0,use:'orchard',polygon:[{x:29,z:11},{x:37,z:10},{x:35,z:-1},{x:28,z:-1},{x:27,z:8}],garden:{center:{x:31.6,z:.25},width:5,depth:1.5,yaw:0},gate:{x:32,z:13.6}}
 ].map((p,i)=>({...p,stage:4,establishedAt:i,source:'detached-plot-study'}));
 const dabs=[{x:-28,z:-33},{x:-15,z:-31},{x:-2,z:-33},{x:11,z:-31}];
 const sampleUse=(x,z)=>dabs.some(p=>Math.hypot(x-p.x,z-p.z)<=10.5)&&Math.hypot(x+6,z+32)>2.7&&lineDistance({x,z},fieldPath.points)>fieldPath.width/2?'farmland':null;
 const fieldMask=derivePaintedFields({bounds:{minX:-40,minZ:-45,maxX:23,maxZ:-19},cellSize:.75,sampleUse});
 const regions=[...fieldMask.fields,...holdings.map(h=>({key:h.key+':holding',kind:'holding',polygon:h.polygon})),...holdings.map(h=>({key:h.key+':use',kind:h.use==='work-yard'?'yard':'garden',polygon:rectangle(h.garden.center.x,h.garden.center.z,h.garden.width,h.garden.depth),holdingKey:h.key}))];
 return{revision:'irregular-plot-study-1',status:'gallery-review',runtimeReady:false,isPlotStudy:true,source:'authored irregular holdings and supplied committed-use fixture; no simulation mutation',seed:'WV-SHARED-PLOTS-1',stage:4,width:180,depth:164,holdings,buildings:[],lanes:[lane],paths:[fieldPath],regions,features:[],fieldMask:fieldMask.diagnostics,
  existingFences:[{key:'earlier-household-fence',ownerKey:'holding-01',kind:'fence-wattle',a:{x:-8,z:-9},b:{x:-8,z:12}}],
  camera:{overview:{x:-2,z:-8,zoom:102},green:{x:-8,z:3,zoom:57},gardens:{x:12,z:-3,zoom:62},farm:{x:-8,z:-31,zoom:73}}};
}
