// Original WV-ART-006 B forms. Dimensions in visual metres; not gameplay metadata.
export const REVISION='wv006-b-1';
export const UNITS_PER_METRE=2.8;
export const FORMS=Object.freeze([
 ['oak-spreading','woodland','Spreading oak'],['beech-upright','woodland','Upright beech'],['birch-open','woodland','Open birch'],['pine-tiered','woodland','Tiered pine'],
 ['oak-young','young-tree','Young oak'],['pine-young','young-tree','Young pine'],
 ['hazel-shrub','shrub','Hazel stool'],['thorn-shrub','shrub','Low thorn'],['hedge-fragment','hedgerow','Broken hedgerow'],
 ['fern-cluster','ground-cover','Fern rosette'],['grass-tuft','ground-cover','Fine grass tussocks'],
 ['flower-cream','wildflower','Sparse cream flowers'],['flower-mauve','wildflower','Sparse mauve flowers'],
 ['reed-cluster','bank-cover','Reeds'],['rush-cluster','bank-cover','Rushes'],['bank-stones','stone','Small bank stones'],
 ['boulder-rounded','outcrop','Rounded boulder'],['outcrop-layered','outcrop','Layered outcrop'],['stump','deadwood','Cut stump'],['fallen-log','deadwood','Fallen log']
].map(([id,category,name])=>Object.freeze({id,category,name,status:'gallery-review',runtimeReady:false})));
export const TREE_IDS=Object.freeze(['oak-spreading','beech-upright','birch-open','pine-tiered']);
