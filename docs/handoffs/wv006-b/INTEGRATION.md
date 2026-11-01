# WV-ART-006 B — landscaping candidate

Status: gallery-review. Every new asset remains `runtimeReady:false`. F owns playable adoption, shared renderer changes, offline admission and final combined-scene checks.

## Delivered collection

Twenty original recognizable forms: spreading oak, upright beech, open birch, tiered pine, young oak/pine, hazel/thorn shrubs, broken hedge, fern, grass, cream/mauve wildflowers, reeds/rushes, bank stones, rounded boulder, layered outcrop, stump and fallen log. No private archive was needed or used. These are original recipe geometry, not claimed MegaKit derivatives. There are no source textures, remote models, transparency, decoders or paid dependencies.

Build from checkout with `node scripts/build-wv006-landscape.mjs`. The manifest records recipe/catalog source hashes, output hash/bytes, measured normal/low/far bounds and triangles, material groups, exact base contact vertices, conservative plan envelopes, units and provenance. Architecture-specific entrances and roof envelopes are empty/null for natural props. Proposed gameplay metadata is explicitly null. Canonical geometry uses visual metres, Y up, measured base Y=0. Gallery placement uses 2.8 game units/m and a 1.75 m person. No max-to-fit transform is used. Authoritative mature-tree height supplies a uniform natural size; it does not rescale the world or saves.

## Exact placement interface

Import `placeLandscape` / `createPlacementCache` from `landscape-next/index.mjs`, or browser-direct from `assets/wv/landscape-next/placement.mjs`. The wrapper has no side effects or registry registration. Pages already copies the asset directory; it does not copy the top-level wrapper.

```js
const input = {
  seed: world.options.seed, // authoritative seed, never regenerated here
  width: world.width, depth: world.depth, // existing game units
  entries: landscapeManifest.entries,
  treeCandidates: suppliedTrees.map(t => ({
    key: t.stableKey, // optional; fallback is exact x:z, never array index
    x: t.x, z: t.z, h: t.h // uncentered world X/Z, height in game units
  })),
  coverRegions: [ // explicit caller permissions; omit for no generated cover
    {key:'stable-region-id', kind:'meadow', // meadow | woodland | bank
     bounds:{minX:0, minZ:0, maxX:100, maxZ:100}}
  ],
  decorativeCandidates: [
    {key:'stable-log-id', assetId:'fallen-log', x:50, z:50,
     scale:1, yaw:0} // optional size multiplier of 2.8, yaw in radians
  ],
  exclusions: [
    {kind:'road', points:[{x:0,z:0},{x:50,z:50}], radius:18},
    {kind:'structure', polygon:[{x:10,z:10},{x:20,z:10},
                               {x:20,z:20},{x:10,z:20}], radius:0}
  ],
  sample: (x,z) => ({ // DISPLAYED terrain contact, not saved analytic Y
    height: displayedSurface.sample(x,z).height,
    water: null, // null only on land; numeric water height means reject
    slope: .1, // grade rise/run, finite, supplied by adapter
    moisture: .8 // 0..1; required >= .65 for reeds and rushes
  }),
  quality:'normal', // normal | low
  distance:'near' // near | far; explicit LOD tier, not camera coordinates
};
const {instances, retainedTrees, diagnostics} = placeLandscape(input);
```

Input coordinates use `z` for the repository's world/settlement `y`. Convert exactly once. The function never imports simulation, `organic-world`, `previewTrees` or the current renderer. It never initializes civic state or edits input data. F supplies the authoritative tree set; use the same set across qualities, rather than invoking `previewTrees(world,95)` for low and 260 for normal. Existing `previewTrees` chooses an array stride, so changing its maximum changes which trees exist. This candidate does not invent a replacement settlement tree seed.

Each instance returns `{assetId,key,origin:[x,y,z],scale,yaw,bounds:{min,max},quality,lod,groundContact:{mode,points,maxGap,baseY},routing:'decoration-only'}`. Origins/bounds are centered render-world game units. Scale is uniform game units per source metre. `groundContact.points` are uncentered sampler coordinates plus measured displayed height/moisture. Bounds conservatively enclose the normal geometry across lower LODs. Tree IDs, uniform size, yaw, positions and primary keys remain stable across qualities, ordering, unrelated state and camera movement.

The separate `retainedTrees` list reports rejected authoritative tree keys. **Keep their existing presentation**; rejection is not an instruction to clear a tree, remove protected woodland or write a save. The `preserve` exclusion kind forbids added decorative cover and permits authoritative trees. Other exclusion kinds block both. These tags have no effect on routing, freight, interaction rights, tree protection or simulation.

## F adapter responsibilities

- Supply actual road/lane widths and approaches; transformed structure/roof/yard polygons; doors, stairs, loading bays, fields, water boundaries and editing/selection handles. A polygon's optional radius expands clearance. A corridor radius is half-width plus any required buffer. Points and polygon edges are tested against a conservative circumscribed asset radius, including dense foliage.
- Until exact transformed building envelopes are available, use expanded parcel/work-yard exclusions. The review fixture deliberately reserves 44×44 game units around homes and 65×65 around workplaces. It is a conservative illustration, not an authoritative fit adapter.
- Clip permission regions with exclusions for all actual farmland, protected land, water and working ground. Region rectangles alone do not grant land or routing rights. Avoid conflicting overlapping region IDs/permissions; unique candidate keys are required.
- Use `createTerrainSurface` at the renderer's actual resolution for displayed height. Supply analytic suitability separately as slope/moisture/water. Match sampler changes to terrain revisions. Trees sample trunk seats; rigid props use a rotated 3×3 footprint probe grid. Reject wet probes, unsuitable grades and contact spread >0.16 game units (logs 0.18; outcrops 0.45). These thresholds are conservative visual tolerances, not foundation deformation or physics. F should add exact contact traces for discontinuous terrain/adapters if needed.
- Unknown moisture suppresses bank vegetation. Land vegetation never accepts a wet contact probe. Large rocks require slope <=0.18, cover <=0.30, trees <=0.8. Reeds and rushes require bank moisture >=0.65. The candidate never modifies terrain to make an asset fit.
- Consider young forms only with an appropriate explicit planting/young-tree candidate; do not replace mature woodland with oversized young geometry. No planting tool, removal price, regrowth, persistent prop edit or save field is implemented.

## Caching and resource ownership

`createPlacementCache().get({...input,terrainRevision,catalogRevision})` memoizes only seed, dimensions, sampler revision, catalog revision, quality/LOD and canonical-sorted placement inputs. `terrainRevision` is mandatory. Change it whenever the displayed sampler changes; use a catalog revision when replacing measured entries. Top-level state, camera, time and unrelated fields are ignored. Returned records are read-only by convention; do not mutate cached results. `clear()` releases the memo.

Placement builds a 32-game-unit spatial grid once per relevant input revision. It does not run in a camera/render loop, and does not scan all props against all roads per frame. Permission patches use stable 36-unit cells with open gaps and a 10-unit jittered candidate lattice. Wildflowers occupy a small minority of meadow clusters. Low keeps a stable subset of small cover and simpler geometry; far removes small decorative cover and retains all accepted tree identities plus outcrops. Changing a tier may rebuild static instance buffers; ordinary camera movement must only redraw. Add adapter hysteresis if switching tiers from zoom.

Load `landscape.glb` with the existing locally bundled `THREE.GLTFLoader`. Pass `gltf.scene` to `createLandscapeLibrary`. `library.build(instances)` returns `{group,dispose}`. It batches all repeated clusters of each asset/LOD into one `InstancedMesh`; individual grass blades never create draw calls. Batches own instance buffers only. Dispose old batches on scene change, then dispose the library once when the loader owner ends. Geometry and two opaque matte material resources are shared. Normal cover uses the second material; low/far uses one. Texture memory is zero. The library contains all LOD source geometry; low reduces submitted geometry/materials, not the initial bundle download.

The gallery renders on demand, pauses draws when hidden, and disposes on page hide. No idle animation, background economy or telemetry exists. F owns async integration/fallback/context-loss handling in the playable renderer. Test missing or corrupt dependencies before promotion.

## Review and dependency closure

Review `/dev/ui-kit/wv006-landscape.html`: all forms or individual form focus, forest edge, riverbank, cottage yard, smith work area and 30/100-home settlement; normal/low, near/far and orbit/zoom. The cottage/smith studies reuse the committed, licensed MegaKit catalog at its 2.8 scale. Wide compositions use the current architecture-v1 six homes and seven facilities at existing `homePlacement`/`facilityPlacement` transforms, preserving current scale conventions. No new building is authored or registered.

New dependency closure: the three `ui-kit/wv006-landscape.*` files; `assets/wv/landscape-next/{catalog,placement,batches,fixtures}.mjs`, manifest and GLB. Existing review imports: local Three bundle/GLTFLoader, terrain-surface, settlement-render-fixtures, scene-batches, asset-registry, building-visuals and their transitive imports; architecture-v1 manifest and thirteen home/facility GLBs; megakit-catalog-v1/catalog.glb (scoped license/provenance remains with that committed catalog). The standalone placement API needs only catalog.mjs and supplied manifest entries; it does not need the review context models.

No shared files, cache manifest, workflows, packages, saves, simulation, renderer or old gallery entry points are edited. Existing cold-offline closure is preserved. **The new page/collection is not installed/offline-ready** until F admits and verifies its dependency closure. F must verify the combined buildings/surfaces/landscape scene, corrected rotated envelopes and physical-phone performance. Gallery submission times cannot establish phone FPS.

## Inhabited-hamlet follow-up

The user-approved composed village review now opens by default on this owned page, with 4/12/30-home growth and close views. The natural collection and original benchmark remain selectable. See [INHABITED-HAMLET.md](INHABITED-HAMLET.md) for the separate authored plan, semantic ground/cover contract, C2 catalog dependencies, quality policy and continued runtime/offline adoption boundary. Original GLB bytes and the pure nature-placement interface above are unchanged.
