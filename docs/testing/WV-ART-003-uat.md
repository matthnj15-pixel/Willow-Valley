# WV-ART-003 development UAT

Development implementation of issue #73. Physical-device art and performance acceptance is **pending**. Three.js remains opt-in; main and the default renderer are unchanged.

## Review links

- [Playable development](https://matthnj15-pixel.github.io/Willow-Valley/dev/?renderer=three)
- [Surface gallery](https://matthnj15-pixel.github.io/Willow-Valley/dev/ui-kit/environment-lab.html): two seeds, normal/low, near/far, slope, junction, river and lake views. Add `&motion=off` to a query for static comparisons.
- [30/100-home benchmark](https://matthnj15-pixel.github.io/Willow-Valley/dev/ui-kit/settlement-benchmark.html)

## Scope and sources

Baseline: `e865de1c3bce50279d0e4c15751afb61a630e953`. S1 [#75](https://github.com/matthnj15-pixel/Willow-Valley/pull/75), S2 [#76](https://github.com/matthnj15-pixel/Willow-Valley/pull/76). Later integration revisions and measurements are recorded below.

Poly Haven Leafy Grass and Dirt are locally bundled 512px JPEG albedos. Publisher metadata supplied the exact 1K download URLs, byte counts and MD5s; downloaded bytes were checked against both before conversion. The [manifest](../../environment-asset-manifest.json) records acquired source SHA256 and derivative SHA256, sizes, source/license URLs and conversion settings. [License statement](../../assets/wv/environment-v1/LICENSE.txt). No third-party texture requests occur at runtime.

Reproduce derivatives by downloading `https://api.polyhaven.com/files/leafy_grass` to `/tmp/grass-files.json` and `https://api.polyhaven.com/files/dirt` to `/tmp/dirt-files.json`; download each response's `Diffuse["1k"].jpg.url` to `/tmp/grass-source.jpg` and `/tmp/dirt-source.jpg`, respectively, then run `node scripts/import-environment.mjs`. Importing is an explicit authoring step; normal asset builds never download textures.

Normal quality uses two albedo samples plus one bilinear control lookup for ground; low quality uses one grass sample and derives a muted earth/stone grade from it. Low-quality roads retain one soil sample with a simplified grass tint. Steep faces select a dominant-axis soil projection and stone grade, without a third rock texture. Normal/low use 96×72 / 64×48 linear-data controls. Ground weights derive from existing water masks, height and seeded trees; fragment normals supply actual rendered slope. Actual committed crop rows retain the original untextured semantic.

Road sidecars carry explicit main-road, shoulder, lane, desire/approach, plaza and work-ground categories. Signed offsets shade narrow opaque shoulders. They do not change pavement coverage or contact height. A regression hash proves the entire reference surface payload (positions, colors and normals) is identical to its pre-S3 bytes. No changes to terrain generation, road geometry/validation, architecture assets, model scale, simulation, input or save format.

Water keeps the existing wet polygons and levels. The once-per-world control grid carries shore distance and nearest-river tangent. Lakes move very slowly; rivers follow those tangents. Normal idle animation is capped near 10Hz when the water bounds intersect the view; hidden tabs and offscreen canvases stop it. Low quality has no idle animation timer. There are no reflection/refraction targets, additional water textures or per-fragment analytic river queries. Each renderer owns and disposes its shared texture registry; late image completion cannot resurrect a disposed scene.

## Automated verification

The final record below distinguishes completed checks from the remaining physical-device work. The browser gallery covers both seeds and both qualities at near/far zoom, low/high pitch, shore, lake, stream, cliff and curved/acute four-way junctions. Existing contact and road tests retain T intersections, curves, short roads and authoring constraints. Cold root and `/dev/` installs test locally bundled textures without first opening a gallery. Existing corruption rollback, all save slots, fallback and gesture tests remain required.

Lifecycle tests wait for the complete model catalog before comparing 20 world changes; the former fixed 400ms warmup raced asynchronous model loads and was replaced by readiness polling. Animation tests check no control-grid rebuild on idle frames, no hidden-tab draws and static low quality.

## Performance method

`node scripts/measure-environment.mjs URL OUTPUT_DIRECTORY SOURCE_REVISION` runs each unchanged 30/100-home normal/low fixture. Each uses a 600×850 CSS viewport, device DPR 2, render DPR 1.5 normal / 1 low, orbit-v1 camera path, two-second warmup and eight-second sample. Before and after use the same machine and ANGLE SwiftShader renderer. These short **software-renderer smoke measurements cannot establish mobile FPS** or thermal behavior; results include median/p95/p99, draw calls, triangles, decoded texture estimate and renderer string. Raw baseline data and near views are under [artifacts/wv-art-003/baseline](artifacts/wv-art-003/baseline).

The two added mipmapped 512px RGBA texture estimates total 2,796,203 bytes; controls add 27,648 normal / 12,288 low. Derivative transfer is 144,900 bytes. Shared shader-uniform textures now participate in the existing scene memory estimate, so this comparison includes them. No geometry or draw-call additions are required by surface shaders. Visibility changes along the orbit can change measured peak calls/triangles slightly; use raw results and the fixed viewport together.

## Remaining physical-device acceptance

1. On actual iPhone Duo Safari, review both seeds and qualities at close cottage scale and wide settlement scale: meadow tiling, forest soil, cliff projection, shoulders, T/acute/curved junctions, jagged banks, broad lake and narrow river. Reject visible seams, road halos, unstable shimmer or over-bright water. Gallery roads are presentation fixtures, not proof of authored route suitability.
2. Run the benchmark's full ten-second warmup and 60-second recording for 30 and 100 homes, normal and low. Record device/OS, CSS viewport, DPR, renderer string, battery, low-power state and thermal conditions; download each JSON. Target sustained ≥30 FPS, median ≤33.3ms, with p95/p99 and thermal behavior reviewed. Desktop SwiftShader misses this target and does not predict phone results.
3. Test actual pinch, rotation, low pitch, road tap/hold/curve edits, zoning and all three save slots. Install `/dev/`, close Safari/PWA, enable airplane mode and cold-relaunch; verify every surface and save survives. Check switching away/backgrounding and restoring the app, including memory pressure/context loss.
4. User explicitly accepts art and device performance before issue #73 is closed or Three.js is promoted. No merge to main is authorized by this UAT document.

## Integration verification record

The final rendering implementation measured here is `92f2077deba85a7062acc094770baef31138014f`. S3 is [#77](https://github.com/matthnj15-pixel/Willow-Valley/pull/77). Before opening each shared-renderer slice, develop was fetched and checked for concurrent changes; no open parallel building PR was present during this run. No architecture asset, building-scale or placement implementation was edited.

Completed locally: `npm run build:assets`, `npm run build:icons`, `npm run build:offline`, `CHECK_BUILT_ICONS=1 npm test` (**166 passed**), `npm run test:e2e` (**94 passed**), and the required `WV_RENDERER=three` camera/road/zoning/save/lane selection (**16 passed**). The normal/low 100-home scenes pass the existing ≤150/100 draw-call and ≤250k/150k triangle guardrails. Root/dev offline cold launches and corruption rollback pass. Real WebKit/iPhone shader compilation, visual review and thermal performance remain untested.

Selected final captures:

- [Whole valley](artifacts/wv-art-003/final-surfaces/WILLOW-1048-normal-wide.png), [near meadow](artifacts/wv-art-003/final-surfaces/WILLOW-1048-normal-near.png), [junction shoulders](artifacts/wv-art-003/final-surfaces/WILLOW-1048-normal-junction.png), [cliff](artifacts/wv-art-003/final-surfaces/WILLOW-1048-normal-cliff.png).
- [Wide lake](artifacts/wv-art-003/final-surfaces/WILLOW-1048-normal-lake.png), [river inspection](artifacts/wv-art-003/final-surfaces/WILLOW-1048-normal-river.png).
- Second seed: [shore](artifacts/wv-art-003/final-surfaces/WV-SURFACES-2-normal-shore.png), [junction](artifacts/wv-art-003/final-surfaces/WV-SURFACES-2-normal-junction.png), [low-quality wide](artifacts/wv-art-003/final-surfaces/WV-SURFACES-2-low-wide.png), [low-quality river](artifacts/wv-art-003/final-surfaces/WV-SURFACES-2-low-river.png).

Final gallery-only verification: **8 passed**, including the added T/acute controls and updated river inspection view. [T junction](artifacts/wv-art-003/final-surfaces/WILLOW-1048-normal-tjunction.png), [acute junction](artifacts/wv-art-003/final-surfaces/WILLOW-1048-normal-acute.png).

All 36 gallery views are also captured by CI as `terrain-contact-scenes`; committed selections above are human review evidence, not a claim of accepted art direction. Existing polygon silhouettes and low-resolution terrain facets remain visible at extreme close pitch. No reeds, extra shoreline props, normal maps or third rock albedo were added; these remain optional future art refinements requiring measurement.


## Before/after measurements

Measured shader source: `92f2077deba85a7062acc094770baef31138014f`. The integration rebase produced `9c0cad4b63565ab9a131d1b0148017f787cb238b` with the **identical Git tree** `c48f78a6b70628859aaca7417c2bba3dd04952d7`. Subsequent gallery/documentation changes do not change the measured material, classification or renderer code.

Each timing cell is baseline → final, in milliseconds. Calls and triangles were unchanged in every paired fixture. Raw [final JSON and near screenshots](artifacts/wv-art-003/final) contain complete method, device/render string and provenance; raw [baseline data](artifacts/wv-art-003/baseline) uses the same settings. Runs were serial, without another local browser test running.

| Homes / quality | Median ms | p95 ms | p99 ms | Peak calls | Peak triangles | Final texture MiB |
| --- | --- | --- | --- | --- | --- | --- |
| 30 / normal | 183.4 → 300.0 | 216.8 → 366.7 | 249.9 → 383.3 | 96 | 78,514 | 22.69 |
| 30 / low | 116.7 → 166.6 | 166.7 → 183.4 | 183.3 → 200.0 | 96 | 55,179 | 22.68 |
| 100 / normal | 299.9 → 416.7 | 349.9 → 516.6 | 350.0 → 516.6 | 92 | 143,244 | 22.69 |
| 100 / low | 216.7 → 283.3 | 266.7 → 300.0 | 283.4 → 300.0 | 90 | 121,358 | 22.68 |

Texture memory rose from 20.00 MiB to 22.69 MiB normal / 22.68 MiB low, within the added ≤12 MiB budget. Geometry and draw-call limits pass. Texture sampling adds measurable SwiftShader frame cost: these results **do not meet 30 FPS**, and no phone performance acceptance is claimed. Low quality reduces fragment albedo sampling from two to one and disables idle water animation, but still needs the physical-device benchmark. This measured regression is a material limitation to review at UAT, not a reason to change simulation geometry or promote the renderer.
