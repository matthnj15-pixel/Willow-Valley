# WV-ART-004: MegaKit integration handoff for Codex

**Research baseline:** latest fetched `develop`, `604a2272a38e02c539027d2611d0d059b1370e76`, 2026-10-31. Fetch again before engineering.
**Scope:** presentation-only, optional small-building slice first. No changes to simulation, founding rules, household capacity, buildable types, economics, terrain authority, road connectivity, controls, or save schema. Read [the acquired-kit audit](../design/WV-ART-004-megakit-audit.md), `WV-ART-001`, `WV-ART-002A`, and `WV-ART-003` together with current code. The repository has moved beyond the original handoff's renderer snapshot.

**Delivery refresh:** includes `develop` commit `2920b0fa35c012fe30e3622fcef7b44b0145719b` (WV-ART-003 S2). Preserve the new `terrain-classification.mjs` and meadow/soil/slope material blending as well as the S1 texture registry. The refresh changes environment presentation, not the building placement or save contracts used below.

## 1. Source admission

Use the user's privately acquired `Medieval Village MegaKit[Source].zip`, exactly **708,720,797 bytes**, SHA-256 `5e60888e2babe418a4618e7815539d9b1b2c3b24c1db2b22cd7a2a7f66140732`. The public repository contains the inventory and license evidence, not the archive or source models. Obtain the file through the user's approved private source; do not assume the temporary research workspace persists or publish the share URL.

The exact attached `License_Source.txt` declares CC0; the publisher's pack-specific pages corroborate it. The audit records the conflicting generic QAL and narrowly scopes admission to this archive's art. A new hash requires a fresh license check. The archive's embedded Unity editor tooling has a separate license and is excluded. No vendor engine code or custom shader is needed.

Before exporting any asset, verify the archive hash, source `.gltf`/`.bin`/image hashes in [all-files.csv](../assets/wv-megakit/all-files.csv), and the attached license hash. Use plain `glTF/` without collision meshes. Resolve all dependencies locally. Do not execute packaged engine scripts or import Unity/Unreal project tooling.

Every derived output must record source paths and hashes, source-license hash, archive hash, transform/recipe revision, authored additions, removed interiors, texture source/derivative hashes, triangle/material counts, external dependencies, full bounds, structural seat polygon(s), overhang polygon, door threshold and direction, permitted eras, and fit policy. Mark new outputs `gallery-review`, `runtimeReady:false` until the gates below pass. This metadata must describe measured outputs, not planned file properties.

**Never commit** the original ZIP, nested ZIPs, `.blend`, engine project trees, raw FBX/OBJ source collections, collision meshes, engine scripts/shaders, downloaded package tools, or broad unoptimized texture directories. Stage exact reviewed paths. Git LFS is not an exception. Selected optimized art derivatives can enter a later game-specific asset commit under the scoped CC0 evidence.

## 2. Existing integration surface

| File | Current responsibility and integration constraint |
| --- | --- |
| `asset-registry.mjs` | Fixed `architecture-v1` base URL, six ordered `HOME_IDS`, deterministic `visualIdentity`, shared load/disposal lifetime. Preserve the identity hash salt and ordering |
| `assets/wv/architecture-v1/manifest.json` | Current measured Kenney-derived models, recipe v3, entrance and foundation metadata; source remains marked gallery-review even though the opt-in renderer consumes it |
| `scripts/build-architecture.mjs` | Current source assemblies, palette derivation, normalization and provenance. Add a separate deterministic MegaKit build recipe, do not overwrite unrelated CC0 source recipes |
| `building-visuals.mjs` | `homePlacement`, `facilityPlacement`, cosmetic `homeApproach`, actual farmland rows. These consume existing positions and are the place to add explicit physical-scale fit checks |
| `foundation-system.mjs`, `terrain-surface.mjs` | Level seats and terrain contact. Continue using the existing terrain-surface authority and rotated polygons |
| `world-renderer-three.mjs` | Opt-in presentation adapter, async loading, model fallback, read-only settlement snapshot, camera/picking parity and disposal |
| `environment-materials.mjs`, `environment-asset-manifest.json` | New WV-ART-003 S1 local ground texture/material registry; preserve it and compare building palette against the current terrain |
| `scene-batches.mjs` | Current material/geometry instancing. Any new texture/material layout must preserve effective batching |
| `game-3d-mesh.mjs` | Native procedural fallback, foundation, approach steps, open space and road/zone overlays; retain fallback parity |
| `asset-cache.js`, `sw.js`, `scripts/build-asset-cache.mjs`, `scripts/validate-assets.mjs` | Local dependency hashes and offline readiness. Include every model, shared texture, manifest and decoder required by the selected rendition |
| `save-slots.mjs`, `simulation.mjs`, `settlement-play.mjs`, `organic-world.mjs` | Existing authoritative saves and simulation; no model fields, migrations or gameplay edits in this work |

Do not import this kit through `ui-kit/kenney-models.mjs`'s legacy flattened parser. It would discard the intended material/hierarchy behavior. Use the already bundled Three.js GLTFLoader and build-time glTF tools. Source files are glTF 2.0 with external BIN/PNG dependencies, not self-contained GLBs. No new decoder is necessary unless the output pipeline deliberately introduces a compressed extension; any such decoder must be bundled and cached locally.

## 3. One human scale

The source has **no verified physical-units metadata**. A `Door_1_Flat` measures 1.118 × 2.100 × 0.121 authoring units, and common walls repeat on a 2-unit grid with approximately 3.123-unit height. Adopt **one source unit as one metre for the new visual family**, as an explicit art calibration inferred from those dimensions. Do not represent that inference as a vendor specification or real-world historical survey.

Adopt **2.8 existing game units per visual metre** for MegaKit buildings and their yard props. This is a presentation conversion only. Do not rescale world generation, terrain, roads, lots, saved coordinates, navigation, or existing economic capacities. Existing roads and some legacy models remain abstract; this proposal does not silently redefine their measurements.

| Reference | Proposed real-size convention | Game units at 2.8/m | Basis |
| --- | ---: | ---: | --- |
| Standing adult height | 1.75 m | 4.90 | Proposed gallery reference, not a new simulation character |
| `Door_1_Flat` opening object height | 2.100 m | 5.879 | Measured source geometry, including trim/protrusions only as reported in inventory |
| `Door_1_Flat` width | 1.118 m | 3.130 | Measured door object; actual walkable opening needs a separate marker |
| Common wall bay | 2.0 m wide | 5.60 | Repeated source span |
| Common storey module | about 3.123 m high | about 8.74 | Source wall bounds; align seam datum, not a possibly projecting trim's maximum |
| One 4×4 m structural shell | 4×4 m before trim | 11.2×11.2 | Proposed plan from two wall bays per edge |
| 4×4 flat-tile roof full measured extent | 5.534×5.561 m in plan | 15.50×15.57 | Overhangs are much larger than the nominal roof name |
| 4×6 flat-tile roof full measured extent | 5.703×7.572 m in plan | 15.97×21.20 | Fits only sufficiently deep current house envelopes |
| `Prop_WoodenFence_Single` height | 0.838 m | 2.35 | Measured source prop; retain same scale as doors |
| `Prop_Crate` height | 1.060 m | 2.97 | Measured source prop; a large crate, use sparingly |
| `Prop_Wagon` length | 4.024 m | 11.27 | Measured prop; it consumes meaningful yard space |

Author canonical output in **metres**, Y up, structural base at Y=0, X/Z center of the declared structural seat, primary door outward along +Z. Apply a single uniform 2.8 transform at placement. Freeze all authoring transforms on export. Keep original source pivots while assembling on the source grid; normalize only the finished assembly. Door, window and wagon size must not vary with parcel dimensions.

### Fit policy

Current founding cottage wall envelopes are widths 17–24, depths 19–25, wall heights 15–19 game units, before era additions. Retain the current one-unit home plan margin. The new full model including trim/roof must fit `style.width - 1` by `style.depth - 1`, rotated inside the existing parcel, with legal entry clearance and no road/lane/water intersection. The structural seat can be smaller than the roof envelope and must be supplied separately for credible foundation geometry.

**Do not use max-to-fit scaling to fill each lot.** Test the model at its common 2.8 scale. If it cannot fit, try a compatible compact form using a stable ordering; otherwise keep that house's existing architecture-v1/procedural presentation. No dwelling is removed, moved, enlarged, or assigned extra residents. Avoid selecting six differently stretched copies of one shell as six silhouettes.

At 2.8, the compact 4×4 flat-tile roof's 15.50×15.57 extent fits even the smallest 16×18 inset plan envelope. The 4×6 roof's 21.20 depth does **not** fit an 18-unit inset depth. Test actual output bounds, including chimney, lean-to and trim, rather than this nominal argument. Rotate only when the real entrance/parcel allows it.

The legacy shell total height is `style.height + min(style.width, style.depth) * style.roofRise`, plus optional chimney. `homePlacement` currently uses `style.height` as a **scale cap**, not `allowedHeight / actualModelHeight`. Do not mistake it for a physical-height check. Add a separate explicit total-height gate for this new family, using the existing legacy total envelope, and do not silently rewrite old placements. Facilities currently use a 48-game-unit total height cap; do not turn a 29.853-m source tower into a 48-unit granary by shrinking it.

The new renderer must not auto-scale a house to match eight inhabitants; current eight-person households are a gameplay abstraction. No claim about historic occupancy follows from facade geometry.

## 4. Proposed six-house authoring plan

The names in this table are the **existing stable identity slots**, not new source filenames. MegaKit counterparts are proposed new outputs under `assets/wv/megakit-v1/`, with hashes measured after authoring. No new output GLB is present in this research PR.

All source inputs below are exact `glTF/<name>.gltf` paths listed in [shortlist.json](../assets/wv-megakit/shortlist.json). Build closed exterior shells. Wall modules are 2 units wide; a nominal 4-m edge uses two bays, a 6-m edge uses three. Lay out source nodes and their orientation on the 2-m assembly grid, with continuous floors, correct roof closures, corner posts, and explicitly fitted door/window pieces. Walls with an opening do not themselves supply a closed door. Source pivots vary, so placement must use the measured door/threshold markers and a gallery review, not an assumed centered origin.

| Existing slot | Proposed physical plan | Verified inputs and required authoring | Compatibility |
| --- | --- | --- | --- |
| `home-long-ridge` | 4×6 m single-storey timber cottage | `Wall_WoodWear_*`, `Door_1_Flat`, `Roof_FlatTiles_4x6`, `Roof_Front_Wood4`; close both gables and preserve long ridge | Deeper plots only; compact legacy fallback when the 21.20-unit roof depth cannot fit |
| `home-steep-gable` | 4×4 m plaster cottage | `Wall_Plaster_*`, `Door_1_Round`, matching round frame/window, `Roof_RoundTiles_4x4`; optional chimney within envelope | First slice; compact full-roof dimensions fit the nominal minimum plan. Verify the completed asset |
| `home-low-hip` | 4×4 m low hip, timber shell | MegaKit wall/door vocabulary plus **original authored hip/thatch roof**; no suitable verified hip/thatch source roof in this kit | Keep existing low-hip asset until authored counterpart is ready; gable recoloring is not a substitute |
| `home-crooked-wing` | Three 2×2 m cells in a 4×4 m L envelope | Selected wall/door modules, original closed L roof/valley and inner entry | Compact footprint target; overhang and inner access need explicit polygon review |
| `home-offset-gables` | 4×4 m main body plus a 2×2 m shallow offset wing | `Roof_FlatTiles_4x4`, wall modules, original small cross-gable and valley | Larger parcels only if full eave polygon fits; retain existing form otherwise |
| `home-porch-cabin` | 4×4 m body with 1-m front lean-to | Wood walls, `Roof_Wooden_2x1*`, `Prop_Support`, original front posts/end closure and closed main roof | Whole porch and its footings fit the existing plot. Suppress extra yard props before falling back |

Do not mutate `HOME_IDS`, reorder its entries, or change the `ARCHITECTURE_VERSION` salt used by `visualIdentity`. Changing that constant changes existing home selection. New rendition selection should be a read-only renderer option that maps the same six identity slots to approved new meshes where compatible. Keep that mapping stable under save/load and renderer switching. Do not persist presentation choices in save files in this scope.

The current registry's URL base is fixed to architecture-v1. Extend it through an optional catalog/base argument while preserving existing defaults, or create an explicit parallel loader. Do not overwrite the contents of existing `architecture-v1` filenames with a different scale contract, and do not pretend changing a manifest alone changes `assetURL` behavior.

## 5. Facility compositions

Use existing `BUILDINGS` keys only: `farm`, `lumber`, `smith`, `granary`, `market`, `plaza`, `park`. Their current plan envelopes are farm/market 48×43.2, granary 32×28.8, and the others 35×31.5 game units. `facilityPlacement` presently leaves a two-unit inset. Evaluate exact compositions against that inset at common scale, retaining more open yard than enclosed building where function needs it.

- **Farm:** one compact 4×4 farmhouse, an open wooden work shelter, and the existing field-facing yard. Keep crop rows derived from committed farmland and existing exclusions; no new field ownership or growth simulation.
- **Smith:** compact timber/plaster enclosure, masonry work bay, `Prop_Chimney2`, and existing anvil/hearth. This is the best functional replacement after the first cottage because silhouette and materials improve role recognition.
- **Granary:** author a boarded raised store and loading platform/door. The kit has no complete granary. Preserve the current platform approach and storage behavior. Do not use a residential front door as a large loading-door claim.
- **Lumber:** retain the current low open shelter and log yard. Add selected wooden roof/fence/crate pieces at common scale, keeping stacking and contact props on their own ground seats.
- **Market:** preserve separate Kenney stalls and open crossing; add a single wagon or crates only when clearance and material coherence pass. MegaKit contains no verified market-stall source model.
- **Plaza/park:** retain ground-space implementation and landscape. No roof, townhouse, tower, or full level pad. Optional fences/benches keep walkways open and contact the terrain independently.

Current `facilityPlacement` derives its scale from the **whole composition bounds**, which would shrink doors when a large wagon expands the yard. Add a common-scale path for approved new entries. Include explicit `groundSpace` and `foundationRects` as applicable, plus per-prop ground-contact markers compatible with the current renderer. Do not resize the existing plot to accommodate a cart. Keep cosmetic approach generation read-only; no road or lane graph mutations.

## 6. Materials, export and mobile budgets

Start with wood, plaster, muted terracotta and small gray stone accents. Keep the WV-ART-002A palette direction. Treat base-color textures as sRGB and normal/roughness data as linear. Preserve material separation during the first gallery comparison. The engine projects' custom wear implementation does not automatically exist in generic glTF; broad wear colors need an original material treatment or build-time bake. Inspect ordinary glTF normals before choosing Godot/Unity-specific alternative normal textures.

For the first slice, propose a 2,000–4,000 triangle exterior-only home, at most three material groups, no animated interior, and shared 512–1024 textures. A completed workplace should target at most 6,000 triangles including fixed nearby props. These are admission targets for measurement, not promises of FPS. Remove invisible interior faces, redundant flooring, tiny decorative ironwork and unnecessary tiled-roof depth before reducing silhouette quality. Keep the original source hash distinct from every simplified or recolored derivative.

The source has 51 unique outer PNG hashes and over 127 MiB of compressed image bytes. Do not import that collection wholesale. A repeated 2048 normal/base/roughness set can cost tens of MiB decoded. Build a small shared material library and prove texture/material reuse across houses. The current GLB-per-model loading path may duplicate otherwise identical embedded textures; either canonicalize GPU textures/materials by content hash with correct disposal ownership, or extend the offline pipeline to a shared-image glTF layout. Hash compressed downloads and account separately for decoded memory.

Retain the established instancing and disposal contracts. Do not regenerate or reupload settlement geometry on every camera frame. Any new geometry simplification, atlas, Meshopt, KTX2 or other compression must retain UV/normal correctness, use a pinned build tool, and bundle required runtime decoders inside the offline dependency manifest. No CDN requests. Start without new compression extensions unless measured bytes or memory justify them.

## 7. Incremental delivery and acceptance

1. **Gallery-only compact cottage and scale fixture.** New build script consumes the private hash-pinned archive, emits one measured compact model and provenance, and presents the old cottage, new cottage, 1.75-m reference person, cart, fence and door in one scene. Include front/rear/low/high and monochrome views. The reference is a simple original dimension marker, not a new inhabitant system. Verify base, gable closure, door/window seating, normals and overhangs. Reject visually broken or unclosed assemblies.
2. **Optional playable rendition.** Add compatible placement for that one identity, with stable compact fallback. Gate common scale, total height, roof polygon, structural seat, rotated parcel, doorway clearance, road/water exclusion, foundation contact, load failure and async disposal. Keep native and architecture-v1 fallbacks. Do not promote every source record merely because loading succeeds.
3. **All-six + smith/farm.** Complete the six distinct silhouette plans and functional workshop compositions. Add fixtures explicitly covering every identity, thin and L parcels, hillside seating, crowded lanes, and 30/100-home scenes. New art remains within existing envelopes and state contracts. Keep granary/market/lumber improvements as separate small changes.
4. **Performance/offline promotion.** Reuse geometry/materials and shared textures. Record triangles, draw calls, GPU texture/geometry counts and decoded texture estimates, bytes, load time, FPS and frame pacing. Test on the target phone before claiming 30 FPS. Turn down decorative detail before core structures. Confirm installed airplane-mode relaunch across all three save slots without visiting the gallery first.

For each playable slice, run the current `npm test`, asset validation/build, icon/offline builds, full `npm run test:e2e`, and the Three.js parity suite used by CI. Include existing save-slot, housing, month-resolution, camera, roads, zoning, and offline tests. Compare a frozen legacy state through old/new renderer placement and identical turn outputs; model selection must not alter state. Simulate missing/corrupt GLB, failed texture, delayed load after disposal, renderer switch and context loss. Source audit tests do not replace gameplay checks.

Keep a legacy save fixture without founding-era/house IDs and a current three-slot fixture. Loading and saving them through the new option must not add asset IDs, rewrite coordinates, change occupants/jobs/costs, or remap stable identities. Renderer failure leaves a playable old visual. Old buildings retain their saved founding-era behavior rather than adopting the player's current chapter.

Use feature branches from current `develop`; preserve production `main`. Cite this audit and exact output measurements in PRs. A gallery screenshot or a passing unit suite alone does not approve runtime rollout. Current research contains **no generated game asset, no changed save, and no gameplay implementation**.

## Ready-to-use Codex kickoff

Read `docs/design/WV-ART-004-megakit-audit.md`, this handoff, and `docs/assets/wv-megakit/README.md` on the latest develop branch. Verify the user's private archive against its recorded SHA-256 and use only the selected CC0-evidenced plain-glTF art. Implement milestone 1 only: one compact plaster cottage in the isolated gallery, the shared human-scale fixture, measured export manifest, and reproducible build recipe. Preserve all current asset IDs and defaults. Do not import the original archive, engine projects, tools, scripts, shaders, collisions or texture collection into Git. Do not change simulation, saves, controls or production. Report exact source/output hashes, fit dimensions, triangles, material/texture use, test results and remaining visual gaps before the playable integration milestone.
