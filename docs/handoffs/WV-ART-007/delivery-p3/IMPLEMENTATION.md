# P3 landscape runtime delivery

P3 provides `render-adoption/landscape/index.mjs` for P5 attachment. It does not attach itself to gameplay, alter saves/economics, or change the shared renderer, placement, registry, cache, packaging or offline admission. Base: develop `a18e85d1e419096a71c3475f3c5b1dc2f5b83e14` (WV007 adoption PR 93). Branch: `feat/wv007-p3-plots`.

The selected source validator passes. No AGENTS.md was present in the checkout or its workspace ancestors. At launch/refresh only main/develop existed remotely and no open develop PR was present. P1 buildings, P2 world and P4 profiling retain their exclusive paths; P5 owns shared application integration. No other task's generator was run. The required existing shared asset/icon/offline generators were verified without tracked changes.

## API and coordinates

```js
const layer = createLandscapeLayer({scene, terrainSurface, world, invalidate, quality});
await layer.update(view, {placementView, meadowCoverage, distance:'near', visible:true});
await layer.setQuality('low');
layer.getLandscapeView();
layer.status();
layer.dispose();
```

The factory is synchronous; update/setQuality return promises resolving true on successful local completion, false on failure/stale/disposed work. Status distinguishes `ready` (this layer completed), `integrationReady:false`, and `offlineAdmitted:false`. `getLandscapeView()` is a deeply frozen plan, not saved state. It exposes vegetation, tree fallbacks, field polygons/holes, garden specialist props, beds, full boundary ownership/uses/conflicts, P3-rendered boundaries, generic-prop requests, occupancy exclusions and diagnostics. `planLandscape(view, context, {terrainSurface,world,entries})` is separately usable without Three/DOM/storage.

Named bridges in `bridge.mjs` convert saved XY to centered visual metres and back, metres to scene X/Y/Z, displayed sample heights to metres, and metre exclusions back to the original B game-unit API. Saved parcels are never scaled in place. `world.width/depth` must match the view. The displayed terrain supplies `sample(savedX,savedY)` and `drapePolygon(savedXYTriangle)`; analytic world slope is only a grade fallback. Out-of-world plot samples reject placement. Surfaces split on actual displayed triangles, including holes, rather than merely lifting polygon corners.

Read-view version 1 follows `02_LAYER_CONTRACT.md`. The following exact adapter details make peer fields explicit:

- `houses`: stable string `key`, `savedPosition`, `yaw`, `parcel:{vertices,holes}` or null, `foundedEra`, optional original `foundedTurn` for earlier-first boundary priority. Optional `landscapeUse` selects an already supplied decorative use (`kitchen-garden`, `orchard`, `work-yard`); the conservative default is kitchen garden. Optional `actualEntrance.gates` contains `{point:{x,y},width}` in saved game units. Actual access clipping comes from placement corridors; no route is fabricated.
- `roads`, `localLanes`, `approaches`: records with `points:[{x,y}]` and actual full `width` in game units. Flatten actual authoritative curves outside P3; do not replace authoritative widths with the fixture's examples.
- `retainedTrees`: `{key,savedPosition:{x,y},heightGame,clearanceRadiusGame,protected}`. `heightGame` is optional, retaining B's original default scale. Raw original B `{key,x,z,h}` is also accepted; raw world tree `y` is altitude, not saved Y. P5 must supply the actual authoritative/protected candidates; P3 creates no forest patches. Rejected B tree replacements are explicit fallbacks for the existing presentation, never instructions to remove trees.
- `retainedBoundaries`: `{key,ownerKey,a:{x,y},b:{x,y},kind,users?,renderedByHost?}`. Positions are saved game units. Boundaries rendered elsewhere must set `renderedByHost:true`. New derived field fences must not be added to this input. Supplied previous household spans take precedence, allowing added neighbors to reuse earlier physical geometry.
- `committedFields`: null, or `{cellSize,cells:[{ix,iz}]}`, or `{cellSize,bounds:{minX,minZ,maxX,maxZ},sampleUse(xMetres,zMetres)}`. These inputs are **centered visual metres**, global grid anchored at metre zero. `sampleUse` must be a safe detached preclassified committed-use read, already applying authoritative operation order, road/water clipping and erasure. Do not call a world/state-initializing helper from the render layer. Cell masks must already be preclassified. P3 delegates derivation to B unchanged. Pending paint is absent. The returned same `fields` drive surfaces, crop dressing and boundaries; the previous derived view is replaced on revision change, including an empty erase.
- Optional `decorativeCandidates`: explicit authoritative permission records `{key,assetId,savedPosition,scale?,yaw?}` for B shrubs/flowers/reeds/etc. No inferred cover regions are generated. B grass-tuft is always deferred to P2; supplied coverage revision is diagnosed and no competing continuous cover is added, including before coverage arrives.

### Placement context expected from P1 / mapped by P5

```js
placementView = {
  revision: 'coherent placement revision',
  placements: [{
    key: 'same entity key as view',
    exclusionsMetres: [{kind:'structure',polygon:[{x,z}, ...]}, ...],
    corridorsMetres: [{kind:'approach',points:[{x,z}, ...],radius:halfWidthMetres}, ...],
    integralBoundariesMetres: [{key,ownerKey,a:{x,z},b:{x,z},kind}, ...]
  }]
};
```

These arrays must include the **actual transformed full** building, roof, yard, stairs, support/work area, C4 cargo/market wagon, civic furniture and plants, and real door/loading/stair corridors. Map P1's explicitly named centered-metre records here once; do not use the fixture as an admission engine. Missing complete placements/access defer household dressing and reserve its parcel against optional cover. Legacy homes without parcels get no invented garden ownership; P5 retains their existing decoration. Facilities still contribute exclusions. Full C4 integral fence spans participate in B's reuse planner but are not drawn by P3. Duplicate keys with conflicting geometry fail explicitly. Distinct retained overlaps/crossings and retained fences intersecting exclusions remain present and are reported, never silently erased.

### D generic props

P3 only draws B garden specialist recipes (fruit trees, garden greens/herbs and grain). B's fitted work-yard wood-stack/barrel requests are emitted unchanged as `genericPropRequests` in metre coordinates, with bounds/contacts. No B well/cart/bench/barrel/cargo is drawn. P5 should pass the admitted requests through P1's D generic-prop interface once that interface exists, preserving transform and actual occupied envelopes. Until then they are explicitly deferred in diagnostics; P3 does not invent a second common-prop catalog. This dependency is not claimed as integrated.

## Ownership, invalidation and LOD

P3 borrows scene/world/terrainSurface and owns its attached root, selectively loaded B library, instance buffers, procedural specialist/fence libraries, and generated surfaces. Views release instance buffers before source libraries release shared geometry/materials. Dispose is idempotent, removes only its own root, rejects late completions and does not dispose the host. Failed loads are visible in status and can be retried. No animation loop, event listeners on player state, save writes or economic work exists in the layer.

Updates coalesce by settlement revision, displayed-terrain revision, placement revision, coverage revision and effective LOD. The host must bump those revisions when actual geometry/authority changes, including quality-dependent P1 exclusions if any; camera/clock/economic turns alone should not change them. Camera/quality switches only rebuild views: tree identity, primary fruit-tree transforms, field shapes and full boundary geometry remain stable. Normal/low/far use separately pruned GLBs. Far omits small vegetation/props, keeps primary trees and complete fence spans; low/far reduce procedural fence posts/rails and specialist detail without moving the geometry plan. Instancing and spatial indexes avoid all-props-by-all-roads frame work.

`context.visible:false` hides the whole root and suppresses invalidation, including completion after late loading. The layer has no idle work. The host must supply visibility on tab/offscreen/scene transitions and retain host draw scheduling. Status includes source pins, requested quality, effective LOD counts, pending loads, plan rebuild count, actual instance/surface draw counts/triangles and loaded source geometry/material/byte allocation (not just visible geometry). Texture allocation is zero for these derivatives.

## Source/output closure and reproduction

Run `node scripts/build-wv007-landscape.mjs`. It first validates frozen adoption pins, prunes one quality at a time from B's original GLB, explicitly validates every new GLB with zero errors/warnings, and writes outputs only in `assets/wv/runtime-landscape-v1/`. Repeated builds produce identical bytes/hashes, including metadata/closure. No selected source file is rewritten.

`manifest.json` and `metadata.mjs` record parent source/output SHA-256s, exact source pins, entries and each derivative hash. `closure.json` recursively hashes actual imported local ESM dependencies (including frozen B planners and procedural recipes) and records each exclusive profile's bytes. Only one quality GLB is fetched/allocated at a time; the all-quality B source GLB is excluded. There are no image, decoder, remote, paid-service, private-archive or building-bundle dependencies in the landscape runtime.

Review locally at `/render-adoption/landscape/review.html` using `python3 scripts/serve-preview.py`. This owned integration fixture shows actual C4 measured envelope equivalents, edge-case parcels and P3 visuals; it is not a fixed hamlet installed in game. Real saved-state fixtures are under `render-adoption/landscape/fixtures/`; `saves.json` records reproducible simulation provenance. The fixture-only adapter imports no new authoritative generation rules into runtime.

## P5 remaining responsibilities and acceptance limits

P5 must attach this factory, map the final P1 placement fields, supply protected trees/actual roads and safe committed field classification, route D requests, keep existing presentation for legacy/unadmitted sites, ensure the existing crop renderer does not also draw unrelated rectangular fields, apply P2 coverage ordering and host visibility, and admit the measured closure into serving/offline packaging. Shared packaging currently does not publish `render-adoption/**`; the review URL is local until the shared packaging owner changes it. No new page/module is claimed installed offline or deployed by P3.

Field resolution is conservative raster geometry, not exact brush pixels: finite cell size .25–16 m, <=200,000 input/sampled cells, B's <=50,000 candidates per plot and <=150 crop props per field, size-aware household caps unchanged. Source boundary wet/grade sampling remains .25 m; provide explicit narrow blockers for discontinuities. Conflicting earlier spans may physically overlap because retaining authority and reporting it takes precedence over silently removing them. Actual peer layouts, combined 100-home performance, installed target-phone pacing/heat and cold offline acceptance require P5/P4 and are **not approved by these cloud checks**. Current provisional numerical guards remain unchanged.

Validation and measured captures: `docs/testing/wv007-p3/ACCEPTANCE.md`. Exact changed paths: `CHANGED_FILES.txt`. PR/head/merge/CI/deployment outcomes are supplied with the final delivery and PR metadata; no self-referential commit hash is embedded in generated assets.
