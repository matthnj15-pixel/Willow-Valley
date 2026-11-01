# WV-ART-006 C: level 1 building baselines

Status: gallery-review; every entry is `runtimeReady:false`. This is the E/F input contract, not a gameplay rollout. Started from fetched develop `5e39c72ff5e205dea166fa18febdfa89aaa5aec8` in isolated worktree `/workspace/wv006-c`, branch `feat/wv-art-006-c-baselines`. No applicable AGENTS.md was found. PR 81 inputs, identity salt/order, gameplay, saves, founding era and shared integration files are unchanged.

## Delivered candidates

The machine-readable authority is [manifest.json](../../../assets/wv/buildings-next/manifest.json). It contains ten existing-identity mappings, separate normal/low measurements, source/output SHA-256 values, triangle/material counts, image bytes and decoded mip estimates, thresholds, corridors, contacts, support points, floor elevations, semantic groups and separate envelopes. Units are visual metres, Y up; place at exactly 2.8 existing game units/metre. The gallery uses a 1.75 m figure and the existing environment fixture. No max-to-fit scaling.

| Existing identity/role | Baseline behavior |
| --- | --- |
| home-low-hip | Same PR 81 shell and low hip proportions; nine overlapping closed reed courses, irregular bundle edges, thick eaves, downslope texture fibers, ridge cap and bindings. Low uses five broader courses. No individual-straw geometry. |
| home-steep-gable, home-long-ridge, home-porch-cabin, home-offset-gables | Normal geometry/material images are preserved from the committed PR 81 derivative. All have lower-detail shell derivatives using the simplifier included in pinned Three.js. |
| home-crooked-wing | Keep the existing architecture-v1 fallback. No sixth MegaKit cottage is proposed or approved. |
| farm | Broad barn cargo doors, tall agricultural enclosure, lower open work/hay bays and field-facing yard. No primary cottage silhouette. |
| smith | Deep open working frontage, masonry hearth and supported tapered hood, one continuous hollow stack, explicit flashed roof aperture, reachable anvil and fixed tool storage. No smoke dependency. |
| granary | 1.35 m enclosed storage floor on individual posts/piers and bracing, closed underside, cargo doors, supported landing and a side stair. No domestic windows or solid undercroft seat. |
| lumber | Long low open frame, longitudinal rack, covered bench and an uncovered cutting apron clear of the approach. |
| market | Three independent awnings and differently sized open/boarded counters around an open circulation court. Loose produce bins are optional. |
| park / plaza | Existing open-ground implementations; no candidates, meshes or BUILDINGS keys added. |

## E: consume measured data

Use `existingIdentity`, `normalNode` and `lowNode`, never entry array position as the stable identity selector. `level:1` is a visual description only; `permittedEras` remains separate. Do not change HOME_IDS, its order, architecture version/hash, foundedEra, capacity, output or any saved coordinates. Preserve accepted source bytes and fall back if a proposed entry cannot fit.

`boundsMin`/`boundsMax` are full normal mesh bounds including stack, trim, stairs, deck and fixed dressing. `low` contains separately measured full bounds and counts. `envelopes.seat`, `.roof`, `.stairs`, `.porch`, and `.yard` are distinct. The four unchanged homes use their accepted full-overhang rectangle as a deliberately conservative roof envelope; its `basis` says that it is not an isolated roof measurement. Porch/deck and stairs have real geometry envelopes in the revised granary. Optional dressing node names are separate from core architecture. `entrances` supply measured threshold datums and authored clear sweep volumes; closed door leaves themselves are intentionally outside the outward approach volume. Yard land reservation is a placement decision for F, not new gameplay metadata.

All five revised workplace full envelopes fit the existing two-unit-inset rectangles at fixed scale, including height. This is an axis-aligned envelope check, not approval of actual rotated parcels, slopes, roads or water exclusions. The granary measures 21.058 × 18.746 game units in plan, within the existing 30 × 26.8 inset. All 1.2/1.35/1.5 m floor studies fit. A compact alternative is not required by this fixture; 1.2 m is recorded as the lower study if visual review favors it, not a silently selected runtime variant.

## F: ground, placement and performance

For granary, `floorElevation:1.35` and `undercroft.underside:1.15` are level structural datums. At the flat foot-contact datum Y=-0.12, the selected floor is 1.47 m above contact. **`undercroft.forbidSolidInfill:true` is mandatory: do not fill the main seat polygon with a continuous foundation.** `structuralSeats` describe the store mass but explicitly say `individual-supports-only`. There are six store supports plus two landing supports. `supportPoints[].point` is a plan/datum marker, `.contact` is the actual individual foot contact at Y=-0.12, and `.top` is the bearing height. `groundContacts` records these contact coordinates. Keep the asset, floor, roof and horizontal beams level; add terrain extensions only beneath individual feet, or reject/fall back on unsuitable terrain. Do not stretch the merged supports category, which also contains braces. The side stair bottom stringers penetrate the local ground slightly to avoid a floating first flight. Stair-foot/head access markers, 1.1 m stair width, 2.24 m run and 1.35 m rise are separate from the 2.1 m clear cargo corridor. Keep the crate outside that corridor; optional groups may be omitted.

The smith's `roofPenetration` records the 1.04 m roof aperture, 0.82 m outer flue, 0.11 m clearance on each side, roof elevation at its center and 5.5 m stack top. The four roof panels stop at the opening; flashing bridges it. Four continuous stack walls run from the hood throat to the open crown, with no overlapping source chimney prop or cap. Full bounds and every gallery camera include the projecting stack. The hearth, hood supports and chimney are integral, not optional dressing.

Build data may be consumed from `assets/wv/buildings-next/`; no browser module depends on `buildings-next/`, because the current Pages workflow does not publish that source directory. The standalone page and its imports are all under already-published ui-kit/assets/root paths. F owns changes to shared loaders/renderers, asset registry, placement, foundations, batching, offline integrity lists and game entry points. Candidate visibility must remain a read-only presentation choice. This gallery does not register a service worker and is not claimed cold-offline installed; existing game offline behavior remains under the unchanged tests.

Retain shared material/geometry/image ownership when instancing. New architecture uses one original 768×384 atlas and one matte material; accepted home materials are preserved. Node extras identify categories and optional dressing. Reuse the exported low roots rather than rebuilding geometry on camera changes. The gallery renders on interaction and stops hidden/idle work.

The synthetic 30/100-home fixtures instance the five supplied home designs plus all five workplaces. They intentionally do not claim the architecture-v1 sixth fallback, real town terrain, roads, landscape or simulation placement. See [measured evidence](../../testing/wv006-c/measurements.json). A passing small fixture is not a combined-scene gate. The 100-home triangle gate remains blocked; home material counts and several normal/low home triangle targets remain exceptions. Keep candidates out of mass adoption until F measures the complete scene, refines LOD/admission policy and repeats these views with final ground cover. Physical-phone FPS and sustained thermal behavior remain unverified.

## Reproduction and inputs

`npm ci`, then `node scripts/build-wv006-baselines.mjs`. The checkout alone supplies every input. `WV006_OUTPUT=/tmp/destination` allows an isolated rebuild; both GLB and manifest must match byte-for-byte. `node scripts/measure-wv006-baselines.mjs` captures the review evidence against the repository preview server; `WV_PREVIEW_ORIGIN` can choose another local origin.

The private MegaKit archive is unavailable and unused in C. Its upstream hash is provenance in PR 81, not a claim that C verified the archive. The committed PR 81 GLB is pinned to `d8926948018bb382ab82d9a437fae0b20e71a60d195c56960652ad0b0aedf5c7`; retained art uses its scoped CC0 notice, copied with its exact bytes. Original workplace geometry, thatch and atlas are Willow Valley CC0 artwork. Foundation's supplied granary image was viewed only as a composition reference: raised mass, independent supports and loading access; no image/geometry/texture was copied into the output. No source ZIP, engine project, remote runtime asset, decoder, API or new package is introduced.

Exact changed-file list: [changed-files.txt](changed-files.txt). Local verification and review paths: [acceptance record](../../testing/wv006-c/README.md). PR, exact head/merge SHAs, CI runs and verified Pages result are reported in the PR delivery comment and task completion response, since a commit cannot contain its own final SHA.
