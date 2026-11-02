# Shared runtime layer contract, WV007 revision 1

This contract unblocks concurrent P1-P4 implementation without shared renderer edits. It defines input/output responsibilities, not a new saved schema. Final P5 owns the application-side bridge and actual attachment. Implement runtime modules against the shape below and test them using immutable snapshots from actual startGame/startWorldGame/exported save state. Synthetic edge-case fixtures supplement those states; authored hamlet plans never substitute for actual settlements.

## Coordinates and authority

Saved `{x,y}` remains unchanged. Scene coordinates are `[x-world.width/2, displayedY, y-world.depth/2]` in existing game units, Y up. New asset geometry remains metre-local with a fixed 2.8 scale. B plot planner inputs are centered metres: divide centered scene X/Z, displayed heights and clearance widths by 2.8 once. Original B placeLandscape uses its existing world/game-unit API; use a named adapter rather than feeding centered metres into it. Legacy architecture-v1 uses the old placement path.

Provide world analytic suitability and the shared displayed-terrain adapter separately to layers. Analytic world.sample/world.slope controls simulation decisions; visual seats, contacts, picking, grass roots and paths use the same displayed triangles as the renderer. New visual rejection chooses a legacy presentation, never changes a saved site's economic validity.

## Read view

`view` is a deep-frozen detached object, version 1, with:

```
schemaVersion: 1
revision: stable settlement/geometry revision, not camera frame or clock
world: { seed, width, depth, terrainRevision }
quality: normal | low
houses: [{ key, identity, savedPosition:{x,y}, yaw, foundedEra,
           parcel:{vertices:[{x,y}], holes:[]}|null, actualEntrance }]
facilities: [{ key, type, savedPosition:{x,y}, yaw, preferredVisualId|null }]
roads, localLanes, approaches: actual polylines/widths in saved game units
committedFields: bounded preclassified cells or immutable committed-use sampler
retainedTrees: authoritative current tree candidates and protection information
retainedBoundaries: actual retained spans when present, otherwise []
```

Use stable keys from existing entity IDs, or deterministic existing seed/coordinate/founding identities. Never key by visible array order, current turn, stage count or camera. Fields without source authority stay absent/null; no invented yard parcel, free access route, stock allocation, resident or tree removal. Legacy houses without parcels get conservative decoration/fallback, not newly persisted land ownership. `preferredVisualId` is read-only optional input; this round does not invent save persistence for a new choice picker.

## Layer APIs and ownership

Factories live in exclusive namespaces and export the following names:

- P1 `render-adoption/buildings/index.mjs`: `createBuildingLayer({scene, terrainSurface, world, invalidate, quality})`.
- P2 `render-adoption/world/index.mjs`: `createWorldLayer({scene, terrainSurface, world, invalidate, quality})`.
- P3 `render-adoption/landscape/index.mjs`: `createLandscapeLayer({scene, terrainSurface, world, invalidate, quality})`.

Each returns `{update(view, context), setQuality(quality), status(), dispose()}`. Factories may be async for initial loads; updates coalesce by revision and use generation tokens to reject stale completion. Layers borrow scene/world/surface and never dispose them. Own resources have one idempotent owner. `invalidate` requests a draw through the host; layers do not start competing RAF loops or write saves. Existing active-water animation supplies `advance/pause/needsAnimation` as explicit optional methods on P2, integrated through the host cadence. No continuous idle work for low quality or hidden/offscreen scenes.

P1 `status()` exposes source family/revision, effective LOD counts, admitted/fallback entity keys/reasons, resource stats and readiness. `update` supplies a detached `placementView` through a getter `getPlacements()` after completion: records include entity key, asset/variant ID, actual transform, level floor, world-game and centered-metre full exclusion polygons, door/loading/stair corridors, support contacts, and integral furniture/fence/prop exclusions. Units must be explicit in field names. Source-root poses and mesh hierarchy are preserved. No fabricated parcel rights.

P2 context accepts `{placementView, landscapeView}` to produce work/entrance tones, tree-edge influences and exclusions for A3 continuous grass. Missing context produces conservative base world materials and no unsafe cover, not a guessed hamlet. Expose `getCoverage()` with explicit centered-metre meadow coverage and revision for P3 grass suppression. Land categories decide A3 meadow versus A1 forest/shore/cliff/water, with one material per surface and a coherent light preset. Do not attach both full terrain treatments over each other.

P3 context accepts `{placementView, meadowCoverage}`. It returns `getLandscapeView()` with stable vegetation/boundaries/field plans, occupancy exclusions and diagnostics. Full building/roof/yard/stair envelopes and C4 integral objects are blockers. It suppresses its grass-tuft candidates where P2 owns grass. It must work before P2 coverage is available by deferring continuous grass instead of adding a competing cover layer.

Avoid update cycles: P5 builds authoritative read view, updates P1 and obtains placements, derives P3 with P2's coverage classification, then updates P2 visual influence/grass from the same revision. Coverage classification must depend on authoritative land categories, not regenerated grass count. Cache a single coherent revision; camera LOD changes do not regenerate authoritative parcels/boundaries or economics. P1/P2/P3 can work with frozen equivalent context fixtures while peers are unfinished.

## Diagnostics and admission

Every status carries `contractRevision`, `sourcePins`, `viewRevision`, `quality`, `effectiveLods`, `pendingLoads`, `disposed`, and diagnostic counts where applicable. Distinguish requested quality from effective geometry/material/texture LOD. Do not report final readiness while peers/actual fits/device checks are unavailable. P4 reads these fields; it owns no source art or game data.

P4's public diagnostic controller accepts a host-supplied `{renderer, layers, getReadView, pause, resume}` context. P5 attaches it explicitly to development diagnostics. Capture no player names or private exports; diagnostics remain local/downloadable with no telemetry. Sources are pinned by hash; runtime derivatives additionally record their own hashes. Missing layers/metrics are explicit, never success placeholders.
