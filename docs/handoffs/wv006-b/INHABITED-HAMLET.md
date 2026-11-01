# The village at the bend — inhabited hamlet review

Status: gallery-review, `runtimeReady:false`. Implements the user-approved 12-home review milestone and its 4/30-home growth views. This is an authored reference composition and a read-only semantic land-use candidate. It is not installed into the playable generator and does not create homes, food, jobs, crops, roads, tree clearance, forestry, inhabitants or save fields.

## What is visible

The page opens on a hamlet arranged around an inherited lane, a shared green and a smaller branching lane. Households have measured buildings, visible door approaches, side/rear ground and one of three uses: kitchen garden, orchard or work yard. C's farm, smith, market and granary provide working context; the later 30-home view adds the lumber shelter. There are open working surfaces, fenced field/paddock edges, garden beds and food plants, fruit-tree forms, fuel stacks, a cart, barrels, seating, a shared well and 1.75 m reference figures. None of these creates functional gameplay.

The 4/12/30 views keep earlier holdings, gates and lane geometry. New routes are added at the later stage rather than moving the founders into a new arrangement. Inherited woodland is reserved against the complete authored layout so trees do not silently disappear when the review stage changes. Orchard props are explicitly planted fruit-tree forms, not young oaks relabeled as an orchard. This reference starts in an open agricultural setting; it does not simulate clearing a virgin forest.

The old 30/100-home rendering fixture remains available as a separate, clearly named composition. It is not used as evidence for the new village's spatial character.

## Files and interfaces

- `assets/wv/landscape-next/hamlet-plan.mjs`: pure plan construction, metre-space transforms, polygon/corridor utilities, the semantic spatial index and exact displayed terrain-height function. No DOM, Three.js or simulation imports.
- `assets/wv/landscape-next/hamlet-scene.mjs`: standalone C/B model adapter, static surfaces, foundations, batching, bounded review probes and loader/resource ownership.
- `assets/wv/landscape-next/hamlet-props.mjs`: original closed, opaque, metre-scale prop recipes and shared instance batches; no image assets or runtime decoders.
- `ui-kit/wv006-landscape.*`: existing owned review page with hamlet/stage/focus controls. Published modules remain under already served `assets/` and `ui-kit/` paths.

```js
const plan = createHamletPlan({stage:12, seed:'WV-INHABITED-01'});
// stage is exactly 4, 12 or 30; seed changes stable cosmetic variation.
// This is a composed spatial reference, not a general seeded settlement generator.
const resolved = resolveHamlet(plan, buildingManifest.entries);
const use = createHamletUseIndex(resolved);
use.query(x, z); // {kind, strength}; x/z in centred visual metres
```

The plan returns `{revision,status,runtimeReady,source,seed,stage,width,depth,holdings,buildings,lanes,paths,regions,features,markers,camera}`. Holdings include stable keys, stage, asset ID, origin/yaw, lane/frontage reference, gate, polygon, garden dimensions and declared use. Paths are keyed polylines with explicit widths. Regions are keyed polygons classified as holding, common, field, garden, yard or work. The resolver derives measured model footprints, fixed 2.8 scale, ground seats, real threshold offsets and actual access paths from the C manifest; granary ground access uses its separate stair-foot marker. It adds seat contact tones while keeping C's raised granary open underneath. No source metadata is changed.

`displayedHamletHeight(x,z)` samples the same two triangles per cell as the fixed 40 × 36-cell detached terrain mesh. Ground and contacts remain identical between quality modes. This review terrain is not the application's saved terrain authority. F must adapt the same semantic contract to the live displayed-terrain sampler and real transformed access/ownership data.

```js
const library = await loadHamletLibrary();
const review = library.build({stage:12,quality:'normal',distance:'near'});
scene.add(review.group);
review.plan; review.nature; review.props;
review.stats(); review.sourceMeasurements();
review.inspect();       // complete roof/road fits and fence route clearance
review.inspectGround(); // bounded raycasts of actual contact probes
review.dispose();       // group instance buffers, generated ground/beds/footings
library.dispose();      // shared C/B sources, prop geometry and materials
```

Build methods return new view objects. Inputs are read-only; tests freeze and serialize plans/catalog fixtures. A library owns its shared resources; a view owns instance buffers and its generated surfaces. Disposing a view does not dispose C/B source resources. Release the view before the library. Loader failure cleans siblings which finish later; page teardown also releases a library that finishes after disposal. Camera/focus movement only redraws and never constructs a new plan or prop set.

## Ground, clearances and quality

The same semantic plan drives the spatial ground-classification index and natural-cover exclusions. Main lanes, actual door approaches, field access, working yards and cultivation regions have distinct uses. Small cover stays in quiet margins. Ground is authored through a deterministic, non-repeating control image; planting beds use draped soil geometry. The source image is generated locally, opaque, with no new texture download. Ground contact tones are an illustration treatment, not a claim of simulated sun shadows or footfall wear. Broad hill geometry uses 2,880 triangles in both qualities; increasing terrain subdivisions is not a prerequisite for settlement detail.

Source building meshes remain in visual metres, Y up, with a single uniform 2.8 conversion. No max-to-fit or non-uniform building transform is used. The 1.75 m figure is original merged geometry. C's measured full roofs and preserved door offsets are used for placement; the tests reject complete roof overlaps and lane intersections. Fragmented boundaries skip actual approaches and routes. Ground seat geometry is confined to measured structural seats; the granary receives individual foot extensions, never solid undercroft fill.

Normal near detail uses C's normal roots for 4/12 homes. The 30-home overview uses the supplied low architectural roots in both qualities; far detail also selects those roots. Low additionally simplifies repeated prop geometry, reduces small-cover density and surface image size. The 30-home low view omits tiny bed/field plant meshes, thins optional fence fragments and hides the additive C2 detail/optional nodes while retaining their architectural cores, while keeping beds, holdings, doors, routes, fruit-tree positions, main woodland identity and workplace silhouettes. This is deliberate review LOD, not a saved visual change or promotion of C's whole catalog for mass adoption.

## Provenance, dependencies and reproduction

Original new artwork is reproducible from the three committed `hamlet-*.mjs` recipes. There is no private archive prerequisite, downloaded art, new package, API, decoder or image copied from the research references. The reviewed B natural GLB is unchanged. Refreshed develop includes C detail PR 86 (`ba8cba5`); the barn reference position is adjusted for its measured roof envelope. Building context reuses the committed `assets/wv/buildings-next/{catalog.glb,manifest.json}` and its existing scoped license/source evidence. The shared light vocabulary uses the published WV006-A revision-1 colors/intensities; source values are copied into the review module because Pages does not publish A's source directory. F can consolidate lighting during playable integration.

Dependency closure: the three `ui-kit/wv006-landscape.*` files; `hamlet-{plan,scene,props}.mjs`; B `catalog`, `placement` and `batches` modules, manifest and GLB; C manifest and GLB; existing local Three/GLTFLoader bundle, `scene-batches.mjs` and `asset-registry.mjs`. The legacy compositions retain their existing closure and load their older context lazily. All new modules are copied by the existing Pages packaging. No shared renderer, simulation, registry, workflow, package/lock, cache list, old benchmark fixture or save file is edited. New cold-offline admission remains F's work.

Capture the new review with:

```sh
python3 scripts/serve-preview.py
node scripts/measure-wv006-landscape.mjs --hamlet
```

`WV_PREVIEW_ORIGIN` can choose another preview server. Captures, semantic plan, measured prop bounds/triangles/material counts, dependency source/output hashes and normal/low/far performance records are written under `docs/testing/wv006-b/inhabited/`. `--hamlet` leaves the previous landscape collection evidence alone. The original measurement command still covers the collection and 30/100-home performance fixture.

See the [research brief](HUMAN-SHAPED-SETTLEMENTS.md) for period references and the boundary between visual composition and future simulation changes. Future playable adoption must consume actual committed land, access and tree-protection data; it must not copy this fixture into a save, manufacture production from gardens, or clear protected woodland through a rendering mask.
