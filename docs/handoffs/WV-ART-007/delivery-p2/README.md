# P2 delivery: real-world A3/A1 layer

Implementation base: develop `a18e85d1e419096a71c3475f3c5b1dc2f5b83e14` (PR 93).
Branch: `feat/wv007-p2-world`. P2-only paths; P5 owns shared attachment.
No applicable AGENTS.md was found in the checkout or workspace ancestors.

`render-adoption/world/index.mjs` exports the revision-1 `createWorldLayer({scene, terrainSurface, world, invalidate, quality})` factory. `world` is the analytic world; `terrainSurface` is the **same displayed triangle adapter** used to build the borrowed mesh. The factory does not build or replace terrain, water masks, road geometry or gameplay. It writes no state, storage or authoritative objects.

The implementation adapts A3's brighter palette, varied patches and nineteen swept ribbons (95 triangles/tuft), plus A1's sky/daylight/haze, water palette/flow/ripples, unsigned shore distance and forest/mineral families. A2, photographs, authored hamlet plans, stage progression, B grass meshes, architectural recoloring and external assets are absent from the runtime closure. `preset.mjs` retains its historical source revision label; the selected A1 factory also used this exact preset. It is not selection of A2 materials.

## P5 attachment

```js
const layer = createWorldLayer({scene, terrainSurface, world, invalidate, quality});
await layer.update(frozenView); // conservative materials; continuous cover deferred
// Park the previous environment lights/fog, then explicitly attach once:
const detachAtmosphere = layer.attachAtmosphere();
// Bind these to existing identity-transformed centered game-unit meshes:
terrainMesh.material = layer.material(0);
waterMesh.material = layer.material(1);
roadMesh.material = layer.material(5);
const meadowCoverage = layer.getCoverage(); // pass to P3 before final influence update
await layer.update(frozenView, {placementView, landscapeView});
layer.setCamera(camera); // call when camera changes, not from a second RAF loop
layer.setVisible(!hidden && !offscreen);
if (layer.needsAnimation({waterVisible, hidden, offscreen})) {
  layer.advance(performance.now(), {waterVisible, hidden, offscreen});
  // Existing bounded host water cadence requests the next draw (~10 Hz).
} else layer.pause();
// Quality creates new material/field resources; await and rebind material(0/1/5).
await layer.setQuality('low');
// Before dropping scene or displayed geometry:
detachAtmosphere(); layer.dispose();
```

The terrain adapter is borrowed for the factory lifetime. If P5 changes the displayed mesh resolution or replaces the world, recreate the layer against the matching adapter. A stable host adapter is also possible if it changes atomically with a new terrain revision; do not use a stale normal-resolution sampler with a low mesh. No layer calls `setSize`/`setPixelRatio`; P5 resizes only on viewport/DPR change. `material(5)` consumes existing `color`, `normal`, `surfaceKind` attributes without changing semantic geometry/widths. Existing untextured kind-0 crop/other surfaces retain their vertex color.

## Explicit context bridge

The shared contract leaves peer exclusion record shapes open. P5 normalizes their full transformed roof/building/yard/stair/loading/access/furniture envelopes into this named, detached world-game representation (saved Y, **not** centered metres):

```js
placementView = {
  revision: stablePlacementRevision,
  complete: true, // only after every admitted/fallback site has safe full exclusions
  exclusionsWorldGame: [{polygon: [{x, y}, /* ... */]}],
  groundInfluencesWorldGame: [{
    polygon: actualPermittedEnvelope, path: [actualEntrance, actualWorkPoint],
    radius: 3, strength: .65 // radius in game units, (0,20]
  }]
};
landscapeView = {
  revision: stableLandscapeRevision,
  complete: true,
  exclusionsWorldGame: [{polygon: protectedObstacleOrBedPolygon}]
};
```

Do not set `complete:true` for missing/fallback envelopes. False/missing context gives useful base materials and zero blades. Completeness transitions require a new context revision. `view.committedFields` must be either bounded `{kind:'farmland',polygon,holes}` cells or an immutable `{sample(x,y)}` committed-use sampler returning `'farmland'`/null; erase/holes must already be resolved by authority. `view.retainedTrees` uses stable `key`, `savedPosition:{x,y}`, optional `canopyRadiusWorldGame`, `protected`, `protectedRadiusWorldGame`. P3 visual variants never replace seeded authority. Unspecified field/tree authority defers cover.

Roads/lanes/approaches contain actual sampled `{points:[{x,y}], width}` polylines in world game units. Include curved alignments and all arms of T/acute junctions; supply actual full surface/shoulder widths. Missing width is diagnostic and suppresses all cover instead of guessing a narrow path. Rendered roads are the host's unchanged buffers, not reconstructed geometry. Full polygon exclusions include whole-tuft radius; protected trees and committed crops suppress cover. The sampler form needs a conservative footprint predicate `intersectsCircleWorldGame(x,y,radius)` to admit grass; without it base field tones still work but cover remains deferred. Ground influences are clipped to actual supplied permitted polygons; none are inferred from an enclosing yard rectangle or invented access.

`getCoverage()` returns `{schemaVersion,revision,units:'centered-metres',owner,boundsCenteredMetres,containsCenteredMetres(x,z)}`. Convert once with `(savedX-width/2)/2.8`, `(savedY-depth/2)/2.8`. This is **continuous ownership classification**, independent of camera, grass count, quality and peer exclusions. P3 must suppress its grass in owned meadow and conservatively defer it before coverage exists. Do not serialize the callback into saves. P5 must coordinate both layers from the same authoritative view revision, not feed regenerated grass counts back into planning.

## Cost and ownership

World-aligned color/control atlas: 128-game-unit tiles, 16 samples/tile normal, 8 low, extent-scaled dimensions with a shared edge. One color texture (sRGB), one control (linear), no mipmaps, images, GLBs, normals, shadows, render targets or hidden image allocations. The full-world atlas packs tiles contiguously; filtering crosses shared world-grid edges. Ground/water each use one lookup; road/grass zero. A1 shore distance is unsigned wet-mask chamfer, explicitly not bathymetry. World categories and fields rebuild on view/context/terrain revision or quality change, never camera/time updates.

Grass uses a stable 1.05-metre lattice and keyed gaps/yaw/height/brightness; geometry is baked per visible 64-game-unit chunk, retaining exact displayed height at **every blade vertex**, including both root edges across terrain diagonals. Near normal: up to 16 chunks ×128 tufts ×95 triangles. Mid: five ribbons/15 triangles per tuft, 48 tufts/chunk. Maximum 16 chunks total normal. Low: only simplified 15-triangle geometry, up to 12×32 tufts. Offscreen/distant chunks are evicted before replacement allocations. No unbounded camera-travel cache or per-camera world color/control generation. Grass is static. Coverage/authority stays stable as view LOD changes.

Layer owns materials, textures, grass buffers and explicitly attached atmosphere only. It never disposes borrowed scene/world/surface/host geometry/foreign lights or materials. P5 must park old lights before attaching atmosphere. Disposal is idempotent; pending same-turn updates coalesce by generation token, stale completions cannot mount, staging failures release new resources and keep the previous complete revision with explicit error status. There are no network loads: `pendingLoads` counts staged update work, not hidden fetches. Low/hidden/offscreen animation is paused, with time deltas bounded to 100ms and no resume jump.

## Reproduce and limits

Run `node scripts/validate-wv007-adoption.mjs`, `node scripts/build-wv007-world.mjs`, `node --test tests/wv007-world.test.mjs`, `npx playwright test wv007-world`. Normal baseline build/test commands remain unchanged. Exact source parents and runtime byte/SHA256 closure are in `assets/wv/runtime-environment-v1/provenance.json`, separately listing review-only source/output hashes. The review bundle is never in the admitted runtime closure. There are no new GLBs to validate. Two builds must give identical outputs. Build only this task's new outputs; never regenerate/commit source studies.

Published review after Pages deploy: `/dev/assets/wv/runtime-environment-v1/review.html` (query `seed=WILLOW-1048` or `WV007-RIVER-2099`, `quality=normal|low`). The existing Pages workflow publishes assets, but **does not publish render-adoption**. P5 must choose bundling or explicitly publish the admitted module closure; it also owns cache/offline wiring. `/dev/` gameplay remains unchanged by P2. Review shows actual generated `startWorldGame` state using shared legacy settlement geometry, not C4 admission. Review-only 100-unit site blockers conservatively defer grass around houses; they are not real P1 placement records or fabricated property rights.

Combined C4/P3 cottage/forest/field acceptance, installed offline closure, target-device bandwidth/fragment/frame pacing/heat and playable UAT remain P5/P4 integration work. CPU atlas regeneration and synchronous close-chunk bakes need combined device measurement; cloud timing is evidence, not phone approval. No economy, saves/migration, founded identity, roads, zoning, architecture source or shared app/cache/workflow/package file was edited.

Implementation head, passing-head CI URL, merge SHA and served deployment verification are recorded in the associated PR and final delivery message once those immutable results exist. Source audit/runtime readiness is not inferred from CI or a Pages workflow reporting `main` metadata.
