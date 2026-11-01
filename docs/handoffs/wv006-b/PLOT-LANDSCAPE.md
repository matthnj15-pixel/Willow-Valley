# Plot-aware landscaping and shared field boundaries

Status: gallery-review, `runtimeReady:false`. Implements the user's request for proportional decoration on irregular plots, shared fences instead of colliding duplicates, and compatibility with existing field drag/paint. Baseline develop `bf40203576e8f12478729d7ae7bf967db89849e5`. All authored changes stay in B-owned paths. F owns playable renderer adoption and offline admission. No simulation, ownership, save schema, input gesture, road, registry or shared renderer is edited.

## Behavior

The default 4/12/30-home hamlet now dresses actual six-vertex reference holdings. House positions, measured building scales, doors and early-lane identity are retained. The additional **Irregular plots & painted fields** composition shows two neighbors using one earlier fence, a large orchard, a tight wedge with no room for an orchard, and a connected field derived from a supplied committed-use mask. The field has an erased interior island and an access opening. The example is composed; it is not a new settlement growth algorithm or a painting tool.

Fences follow supplied polygon edges. Reversed rings, different first vertices and input ordering produce the same output. Collinear/near-aligned shared spans are reused even if only part of an edge is shared or the earlier fence is longer. A later owner references the earlier physical fence; its geometry, style and key remain unchanged. New fences are clipped around structures, roads, doors, loading/stair approaches, overlay exclusions and gates. Proper fence crossings leave a small gap in the new span. Existing conflicting fences are retained and reported; the renderer never silently removes an authoritative boundary to make a site look valid.

Decoration uses local metre-space grids keyed by plot and cell, tested against the complete polygon, holes, neighboring plots, fences, measured structures and supplied exclusions. Counts are capped by usable planting area. Full-size fruit crowns, wood stacks and beds are omitted when they cannot fit. No finished model or building is stretched to fill a plot. Low/far keep primary fruit-tree transforms and boundary geometry. Low uses fewer small plants, one rail and a subset of the normal posts; far omits small plants and uses that fence LOD. Fences are two instanced draws using one shared construction geometry and one matte opaque material, independent of fence count. Post feet sample displayed terrain individually; rail ends follow the adjacent post heights.

## Pure APIs and units

New modules are `assets/wv/landscape-next/{plot-geometry,plot-boundaries,plot-dressing,painted-fields,plot-fence-view,plot-study}.mjs`. The pure modules import no simulation, save, organic-world, world initializer, DOM or renderer. `plot-fence-view` alone imports local Three. `plot-dressing` uses pure metre-space helpers from the existing owned hamlet plan.

```js
const input = {
  seed: authoritativeSeed,
  plots: [{
    key: stableHomeKey, establishedAt: foundedTurn,
    kind: 'home', // home | field
    polygon: [{x:0,z:0}, {x:14,z:0}, {x:12,z:19}, {x:0,z:17}],
    holes: [], // optional simple rings, same units
    origin: {x:7,z:6}, yaw: 0,
    use: 'kitchen-garden', // kitchen-garden | orchard | work-yard
    plantingPolygon: suppliedRearGrowingArea,
    gates: [{point: actualGatePoint, width: 1.5}],
    // Optional: fence only chosen real edge fragments, keeping other edges open.
    fenceEdges: [[edgeStart, edgeEnd]], fenceKind: 'fence-wattle'
  }],
  existingFences: [{
    key: 'retained-boundary', ownerKey: stableEarlierOwner,
    a: {x:14,z:0}, b: {x:14,z:12}, kind: 'fence-rail'
  }],
  exclusions: [
    {kind:'structure', polygon: transformedFullRoofAndStairEnvelope},
    {kind:'approach', points: actualDoorOrLoadingPolyline, radius: actualHalfWidth},
    {kind:'preserve', polygon: protectedLand},
    {kind:'retained-tree', points:[trunkPoint], radius: conservativeCrownRadius}
  ],
  sample: (x,z) => ({height: displayedHeightMetres, water: null, slope: grade}),
  quality: 'normal', distance: 'near', omitSmallPlants: false
};
const result = dressPlots(input);
```

Coordinates, height, clearance radii, widths and bounds in these APIs are **visual metres**, X/Z with Y up. Unlike the original `placeLandscape` API, they are not game-unit coordinates. Convert existing world X/Y exactly once using `x=(worldX-world.width/2)/2.8`, `z=(worldY-world.depth/2)/2.8`, and displayed height `/2.8`. The renderer multiplies by 2.8 once. Do not rescale saved parcels. Use saved stable identity, or stable coordinate/founding keys for legacy homes; never use array order, visibility, current turn or camera. `establishedAt` resolves new-boundary priority, with stable key as the tie-breaker. Supplied existing fences always take priority.

Rigid props reject dry-ground probe spread above 0.10 m; wood stacks use 0.06 m. Tree probes cover the trunk seat, while the crown radius controls clearance. Exact water/grade envelopes remain caller inputs. These are visual contact limits and do not change foundations or simulation suitability.

`dressPlots` returns `{revision,runtimeReady,props,beds,boundaries,plotStats,diagnostics}`. Props contain `{key,plotKey,kind,assetId,origin:[x,y,z],scale,yaw,bounds,quality,lod,groundContact:{baseY,maxGap,points}}`; scale is a uniform source-metre multiplier. Beds contain a key, owner and fitted rectangle polygon. `plotStats` reports planting area, use, prop count and bed count per plot. Polygon inputs must be finite, simple, nondegenerate rings, with any holes contained in their outer ring. Supply actual transformed building and access envelopes; omitted exclusions are not inferred from simulation.

`planting:false` retains a boundary with open ground and emits no plants or beds; the review uses this for its paddock. A fenced pasture does not become a grain field because both have a boundary.

`planPlotBoundaries(input)` can be used separately. It returns `{revision,runtimeReady,fences,uses,gaps,conflicts,diagnostics}`. Fence records contain `{key,a,b,ownerKey,users,kind,source}`. `source` is `existing` or `candidate`. `users` lists all plots which reuse some of that physical span. `uses` links plot keys to fence keys; its `range` is on the requesting polygon edge, not an instruction to subdivide the existing fence. Render each returned fence once. Reuse distance defaults to 0.3 m, with at most five degrees of near-alignment; this is cosmetic boundary matching and grants no property rights. Exact crossings clip the new fence by 0.15 m on either side. Analytic capsule/polygon clipping handles narrow access shapes. Supplied dry/grade checks use quarter-metre samples; for discontinuous water/terrain provide explicit polygons as well.

If a field has no explicit gate, the candidate leaves a 2.8 m opening near a supplied route, or flags `caller-access-required` if no route is supplied. This opening creates no road or freight rights. F should supply real field access. A conflicting existing fence is reported as `existing-fence-in-exclusion`; F must retain its authoritative presentation and resolve/reject the conflicting placement through the proper owner, rather than hiding it here.

## Existing field paint adapter

The application stores field permission as committed `farmland` brush records, including erase operations; a brush bounding rectangle is not a field. Existing `zoneAt` also clips roads/water and applies operation order. Consume its already computed authoritative result outside the renderer, not an independent reimplementation of zone rules:

```js
const {fields,diagnostics} = derivePaintedFields({
  bounds: relevantFarmlandBoundsMetres,
  cellSize: 1, // explicit resolution; global grid anchored at metre-space 0,0
  sampleUse: (x,z) => suppliedCommittedLandUse(x,z),
  sampleSurface: suppliedDisplayedTerrainMetres
});
// Or supply a preclassified sparse cell mask with integer grid indices:
const sameContract = derivePaintedFields({
  cellSize: 1, cells: [{ix:20,iz:30}, {ix:21,iz:30}],
  sampleSurface: suppliedDisplayedTerrainMetres
});
```

The default 200,000-cell budget rejects unbounded work. Restrict the bounds to relevant painted land and use an indexed/cached authoritative lookup; do not run every stroke against every prop per frame. Sampler mode keeps only complete dry farmland cells. Mask mode requires preclassified committed cells and also checks supplied terrain at cell centers. Four-connected components combine neighboring dabs; internal cell edges disappear. Separate islands stay separate, holes stay holes, and line simplification is accepted only where the supplied use remains farmland. Outputs are `{key,kind:'field',polygon,holes,area,rasterArea,cellSize,source}` plus diagnostics. This is a conservative outline at the recorded cell resolution, not a claim of exact pixel-area equivalence. The smooth cartographic SVG `zoneSilhouette` remains unchanged.

Pending brush strokes never become input to the committed candidate. After Commit/erase/reload, rebuild the derived field perimeters from the new committed mask. Discard the previous generated field view; do not feed all obsolete derived field perimeters back as authoritative existing fences. `existingFences` is reserved for actual retained boundaries, including earlier household boundaries. No candidate field fence is persisted by this task.

F must feed the same returned polygons/holes to visual crop rows, field surfaces and fences. Existing `farmlandRows` does not automatically consume this candidate. Preserve existing harvest calculations and permission rules while clipping the display to the same field plan; do not overlay new fences around an unrelated rectangular farm illustration.

The new browser check drives the existing application's drag, Commit, Eraser and reload controls, freezes the saved state, derives the candidate through supplied `zoneAt` classification, and compares serialized state and localStorage before/after. Thus the adapter is exercised against real paint behavior even though the playable renderer remains F's responsibility.

## Lifecycle, resources and evidence

The review API remains `loadHamletLibrary().build({stage,quality,distance})`; `{study:true}` selects the new example and returns four homes. `review.plotDressing` exposes the pure plan and `review.fenceContacts` its measured post seats. `review.inspect()` checks full roofs, lanes and complete fence segments against approaches; `review.inspectGround()` raycasts representative actual prop probes and up to 64 post feet against the displayed terrain. Quality/camera changes do not mutate the plan. Focus/orbit/zoom only redraw. Existing source/view disposal ownership is preserved, and the added fence library owns its one geometry/material until library disposal.

Recompute for changed plot geometry, entrances, committed zones, retained boundaries/trees, exclusions, terrain, seed or quality/LOD inputs. Cache by those revisions; ignore economic turns and camera movement. The new planners use spatial bins; they do no all-props/by-all-roads work per frame. They create no world/civic state. Existing geometry, world seed, protected trees, founded era, capacity, all three save slots, save migration and offline-first behavior are unchanged.

All new geometry is original project construction; there are no new GLBs, downloaded textures, remote runtime assets, private archive inputs, dependencies or license prerequisites. Existing C/B GLBs are unchanged and explicitly validated. Source hashes, generated geometry-buffer and instance-matrix hashes, bounds, triangle/material/texture counts, plan and post contacts are captured by:

```sh
python3 scripts/serve-preview.py
node scripts/measure-wv006-landscape.mjs --plots
```

`WV_PREVIEW_ORIGIN` can choose another server. Outputs are under `docs/testing/wv006-b/plots/`; previous inhabited/collection evidence is retained. Read the [measured acceptance](../../testing/wv006-b/plots/ACCEPTANCE.md) and exact `PLOT-CHANGED-FILES.txt`. F must still verify the full adopted scene, actual application terrain/access/protection, the new offline closure and physical phones. Cloud submission timing is not phone FPS. There is no forestry, regrowth, landscaping cost, productive garden mechanic or manual persistent prop-edit tool in this change.
