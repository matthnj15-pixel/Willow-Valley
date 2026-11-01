# WV-ART-004 milestone 1: cottage and common-scale study

**Status: visual UAT requested; gallery only, runtimeReady false.**

Development UAT: https://matthnj15-pixel.github.io/Willow-Valley/dev/ui-kit/scale-study.html

Research PR [#78](https://github.com/matthnj15-pixel/Willow-Valley/pull/78) was updated with develop's road/water surface work, passed refreshed Actions run [41260052521](https://github.com/matthnj15-pixel/Willow-Valley/actions/runs/41260052521), and merged as `ee93fa47e4e91f85747ea701dde069358fd81530`. This slice starts from that combined develop. No simulation, placement, identity selection, save, game renderer or environment shader implementation changed.

## Source and reproducibility

The authorized private source downloaded successfully. The untouched archive remains outside Git: 708,720,797 bytes, SHA-256 `5e60888e2babe418a4618e7815539d9b1b2c3b24c1db2b22cd7a2a7f66140732`. The attached CC0 license matches `7310dfa8512d7ca12b6591329fda4adab7e8b9cdbe04c7d7061c2fe5c7dc38ee`. No private share/download URL is recorded here.

Rebuild with `node scripts/build-megakit.mjs /private/path/source.zip`. The script verifies the archive size/hash, attached license, each selected glTF, and every referenced dependency against the existing inventory before importing. It extracts only selected canonical art into a temporary directory, removes that directory afterwards, and executes no engine/vendor code. A second build in a separate temporary working directory reproduced the GLB and manifest byte-for-byte.

The [measured manifest](../../assets/wv/megakit-v1/manifest.json) records every source model and dependency hash, output hash/bytes, transformations, authored floor/plinth/attic backing, full bounds, structural seat, conservative roof/trim polygon, threshold and direction, era, texture derivatives and memory. `Wall_Plaster_Door_Round` is a verified inventory addition to the initial shortlist: it matches the round door, unlike the shortlisted flat opening. Nothing is inferred from filenames alone.

## Assembly and scale

- Two 2-m wall bays per edge form a 4 × 4 m shell, with plaster/timber walls, round doorway and frame, two seated side windows, four corner posts, tiled roof and two wooden gable closures.
- Source pivots and 2-m wall grid remain intact. One source unit is interpreted as one visual metre; the only gallery conversion is uniform **2.8**. The plinth extends 0.12 m below the structural floor datum and rests on the ground. The closed floor is original Willow Valley geometry.
- Full X/Y/Z bounds, including foundation and roof trim: approximately **5.513 × 6.854 × 5.616 m**. Roof/trim plan at game scale is **15.437 × 15.724 units**, fitting the preliminary 16 × 18 minimum inset envelope. This is an envelope check, not irregular-parcel or gameplay approval.
- The round door including arch is **2.318 m** high; the earlier 2.1-m measurement describes `Door_1_Flat`. The adult fixture is exactly **1.75 m / 4.9 units**; the fence is approximately 0.838 m high, wagon 4.024 m long. Fixtures do not become inhabitants or simulation objects.
- The old cottage uses `homePlacement` for the frozen founding-house fixture (scale 19); the lumber camp uses `facilityPlacement` (scale approximately 19.186), its existing yaw and support rectangle. Neither is recalibrated to conceal existing scale differences.

**Important finding for UAT:** the current camp's 0.8-source-unit posts become approximately 15.35 game units (5.48 visual metres), much higher than upward reach under the proposed metre convention. The scene faithfully exposes this discrepancy. Acceptance must resolve the relationship between the preferred existing shelter, the proposed human convention, and the cottage before playable integration. Do not label the entire settlement scale accepted merely because the cottage looks plausible.

## Interaction and road study

The gallery offers whole-scene comparison, individual subjects, front/rear/side/eye/roof cameras, drag orbit, wheel/pinch zoom, wireframe and monochrome. Subject close-ups hide the other two buildings to prevent side/rear occlusion. The scene uses current ground/road materials on a flat dimensional fixture. This is not a regenerated gameplay world or a terrain-slope placement test.

The representative main road retains **24 units (8.57 visual metres)** plus the existing **34-unit outer shoulder envelope**. A clearly labeled toggle previews narrower worn dirt using a separate material instance in this gallery. It changes no graph, polygon, collision, construction cost, environment source shader, or game surface. Compare [current visible road](artifacts/wv-art-004/comparison.png) with [narrower dirt preview](artifacts/wv-art-004/narrow-visible-dirt.png). Rural-road width remains a visual UAT decision.

## Rendering and limits

The complete cottage is **4,937 triangles / 8 material groups**, fence 40, wagon 1,672, detached round door 470. Source transformations are baked and meshes joined by material within each named assembly. Five base-color textures are shared across the bundle; normal/roughness maps and unused materials are removed. Resized JPEG derivatives and a restrained saturation treatment replace the source-resolution images. Textures use sRGB through GLTFLoader. No decoder, CDN, full texture collection, engine project, collision model or sample village is imported.

The bundle is **537,916 bytes (525 KiB)**; five shared textures require approximately **2.67 MiB RGBA8 including mipmaps**. The manifest carries exact bytes and hashes. Complete gallery draw/triangle counts and 30-sample CPU submission measurements for 600 × 850, DPR 1 normal/low live in [measurements.json](artifacts/wv-art-004/measurements.json). Submission durations measure JavaScript rendering calls, not sustained GPU FPS or phone frame pacing. This cloud Chromium evidence is not physical iPhone/Safari acceptance.

The cottage exceeds the handoff's provisional 2–4k triangles / three-material target. It retains source exterior detail for this art review. Texture atlasing must handle repeating source UVs; simply packing images would break tiling. Further material/geometry optimization and mobile device profiling are required before settlement-wide use. No 30/100-house MegaKit performance or physical-phone FPS is claimed.

## Verification and acceptance

- Unit suite: 166 passed, one skipped. New asset test validates glTF, exact output hash, measured bounds/triangle counts, full roof extent at fixed scale, pinned source hashes and texture memory.
- Asset generation/validation, icons and offline HTML builds pass. Architecture-v1 and vendor outputs remain unchanged.
- Gallery browser tests pass: mobile cameras and controls, all four wall and both gable ray probes, zero external requests/errors, unchanged road width, root and `/dev/` cold offline gallery reload after installing the game **without visiting the gallery first**.
- Final full browser and Three.js parity results are recorded by the implementation PR's Actions run. Early local full-suite attempts overlapped asset regeneration and software rendering captures and are not claimed as passing evidence.
- Exact offline integrity list includes the gallery HTML/CSS/module, manifest, license and bundled GLB. Installed root/development scopes retain existing isolation and rollback behavior.

Review [legacy close-up](artifacts/wv-art-004/legacy-close.png), [new front](artifacts/wv-art-004/cottage-front.png), [rear closure](artifacts/wv-art-004/cottage-rear.png), [eye level](artifacts/wv-art-004/cottage-eye.png), [roof](artifacts/wv-art-004/cottage-roof.png), and [mobile view](artifacts/wv-art-004/mobile-normal.png). Reproduce captures with `node scripts/measure-megakit.mjs` against the preview server; `WV_PREVIEW_ORIGIN` selects an alternate local origin.

Before continuing, visually accept the shell, door/window proportions, gable closure, tile overhang, plinth contact and palette; explicitly review the lumber scale discrepancy and road width on the target phone. The six residential identities, legacy fallback, seven facility types, three save slots and opt-in renderer remain intact. Milestones 2 and 3 have not started. Human approval is required before gameplay rollout.
