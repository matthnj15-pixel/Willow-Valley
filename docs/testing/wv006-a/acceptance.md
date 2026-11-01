# WV006 A: measured review evidence

Candidate only; final composition and physical-device acceptance await B–D and F. Review URL after deployment: https://matthnj15-pixel.github.io/Willow-Valley/dev/ui-kit/wv006-environment.html

## Implemented and constrained

Quiet broad meadow color/density variation, rotated/coarse grass sampling in normal, seeded-tree leaf/soil influence, dedicated foliage-free projected procedural rock, damp/sediment/gravel bank transitions, clipped entrance/work visual influence API, detachable daylight/sky/haze, and shore-distance/river-tangent water polish. No height, collision, polygon, suitability, gesture or authoritative state changes. Low omits two ground albedo samples, clouds, water ripples and idle animation; it also uses smaller control fields. No new albedo, render target, shadow pass, remote runtime asset or paid dependency. The two textures are shared across terrain/roads/water.

The standalone review has two seeds, normal/low, matching before/after treatment, close/wide, .40/1.35 pitch, forest edge, cliff, junction, lake and river. Changing only treatment preserves the current camera in the URL. `motion=off` freezes comparison animation. Context uses unchanged committed catalog geometry at common scale and seven material witnesses (plaster, timber, clay, straw, stone, cloth, water); it makes no functional-building or trade claims. The gallery renderer excludes tree intersections within loaded context bounds equally before/after. The shared playable renderer remains unchanged.

## Final local verification

Rendering source: `fbb5598d4921805c14101f57b8d9d8fe60ea3c50`. Later changes only finalize evidence, dependency/license records and measurement metadata.

| Command | Result |
| --- | --- |
| `node scripts/build-wv006-environment.mjs` | Passed; deterministic review bundle and exact dependency hash record, reproducible without private inputs |
| `CHECK_BUILT_ICONS=1 npm test` | **172 passed**, zero failed/skipped |
| `npm run test:e2e` | **110 passed (6.1m)**, including all ten candidate checks and the existing root/dev cold-offline/save/fallback suites |
| `WV_RENDERER=three npx playwright test camera-gestures organic-zoning road-3d-drag-fix save-slots organic-lanes --output=test-results-three-parity` | **16 passed (39.3s)** |
| `npm run build:assets` | Passed current validators, including explicit existing study/catalog GLBs: zero errors/warnings; no new glTF is emitted |
| `npm run build:icons` | Passed; three generated PNGs, not committed |
| `npm run build:offline` | Passed; shared self-contained game, 1,227,427 characters, not committed |
| `git diff --check` and exclusive-path audit | Passed; no shared game, registry, workflow, manifest, package, simulation or save edits |

Candidate browser coverage includes both seeds × both qualities, nine paired views with exact camera equality, unchanged state serialization, missing-texture fallback, disposal before late completion, repeated world/resource stability, hidden/low idle behavior, 100-home budgets and rendered-pixel proof of explicit light/haze support. Both terrain shader variants compiled; console errors/external runtime requests were absent during the paired gallery tests. The final rock shader has irregular low-contrast mineral variation after wide-view inspection found excessive repeated strata in the first candidate.

One initial full local run had 109 passes and one low-idle test failure: counting began before the asynchronously loaded context's final draw. The corrected test waits for model/texture/context readiness and two queued animation frames; the full rerun passes. An initial sandbox-restricted unit run could not execute offline packaging subprocesses; running with process access passed. These failures were investigated and are not omitted from the record.

Final PR checks and merge/deployment evidence are linked from the PR and delivery report; they must be checked on the final head before merging. A passing PR alone does not establish Pages deployment.

## Matched frame measurements

Run `node scripts/measure-wv006-environment.mjs http://127.0.0.1:4173 docs/testing/wv006-a/measurements REVISION` with the preview server. Eight runs are serial, without another browser suite running. Each pair uses the exact same unchanged 30/100 fixture, orbit-v1 path, camera, browser viewport (600×850 CSS), canvas (574×580 CSS), DPR 2, render DPR 1.5 normal / 1 low, two-second warmup and eight-second sample. Both before/after use `motion=off`, so these measure camera-driven frames, not idle animation. Raw [JSON](measurements/) records renderer, all view settings, intervals and peak resource counts. Renderer: Chromium ANGLE Vulkan SwiftShader (Subzero). Different fixture visibility/time sampling can change peak calls/triangles slightly; the candidate adds exactly one sky draw and two triangles. No shadow draws.

These are **software-renderer smoke measurements**, not mobile FPS acceptance. Candidate normal is slower than the existing material, and neither meets a 33.3ms frame target here. This regression is a material limitation for F/UAT. No thermal, WebKit or physical-phone result is claimed.

| Homes / quality | Median ms | p95 ms | p99 ms | Calls | Triangles | Candidate total texture bytes |
| --- | --- | --- | --- | --- | --- | --- |
| 30 / normal | 300.0 → 383.3 | 383.3 → 483.3 | 383.3 → 483.4 | 96 → 97 | 78,514 → 78,516 | 23,823,019 |
| 30 / low | 166.6 → 183.3 | 183.4 → 200.1 | 183.4 → 250.1 | 96 → 97 | 55,179 → 55,181 | 23,792,299 |
| 100 / normal | 416.7 → 516.7 | 533.3 → 633.3 | 533.3 → 633.3 | 98 → 99 | 143,766 → 143,768 | 23,823,019 |
| 100 / low | 283.3 → 300.0 | 300.0 → 350.0 | 300.1 → 366.7 | 96 → 97 | 121,880 → 121,882 | 23,792,299 |

Whole-scene existing guardrails: normal ≤150 calls / 250k triangles, low ≤100 / 150k. All four candidate fixtures pass. Their architecture-v1 models remain the benchmark's unchanged models; this is not proof that B–D's forthcoming combined assets fit. The accepted ten-design catalog is scale context in the separate valley view, not substituted into these performance fixtures.

Surface transfer: existing 144,900 JPEG bytes; no new images. Decoded albedo mip estimate 2,796,203 bytes. Controls total 55,296 normal / 24,576 low without entrance inputs; with actual measured envelope inputs 470,016 / 122,880. All scene texture estimates include shared shader textures. The normal/low candidate benchmark texture deltas vs before are 27,648 / 12,288 bytes, matching its additional visual field. Source dependency paths/bytes/hashes: [dependencies.json](../../../assets/wv/environment-next/dependencies.json).

## Remaining review and limitations

Physical phone Safari/Chrome compilation, sustained 60s frame pacing/thermals, sky/horizon at all gesture extremes and final B–D architecture/landscape composition remain pending. Review near and far meadow repetition, neutral rock, wet polygon edges, low-quality entrance wear, bright shoulder seams/halos, water shimmer and haze against all seven witness families. Rendered terrain and bank faceting remain unchanged; no new cliffs or bathymetry were invented. Coarse shore distance and interpolated wear are visual estimates, never placement authority. On larger maps, very narrow wear can blur or be missed at current control resolution. Context models are review aids, not final transformed foundation integration.

Root/dev cold-offline game behavior is checked by the existing full suite. This gallery and candidate closure are deliberately **not installed/offline-ready**; F adds and verifies that closure if adopted. Existing saves, three slots, migrations, simulation production/employment/housing/founded-era behavior and the default environment retain their original code. A merge into develop approves delivery for review, not final art, physical-device performance or production rollout.


Final timing source is the rendering SHA above. All eight JSONs record the exact revision, Chromium 141.0.7390.37, user agent, timestamp, driver and measured environment-image encoded/transfer bytes. Encoded JPEG body bytes are **144,900**; observed network transfer including response overhead is **145,500** per cold page. Earlier smoke runs were superseded after the rock appearance correction. Sampling variance and software-renderer cost remain explicit limitations. No simultaneous local browser or unit workload ran during these serial measurements.

Selected matched captures: [close before](captures/WILLOW-1048-normal-before-near.png), [close candidate](captures/WILLOW-1048-normal-after-near.png), [cliff before](captures/WILLOW-1048-normal-before-cliff.png), [cliff candidate](captures/WILLOW-1048-normal-after-cliff.png), [lake before](captures/WILLOW-1048-normal-before-lake.png), [lake candidate](captures/WILLOW-1048-normal-after-lake.png), [wide before](captures/WILLOW-1048-normal-before-wide.png), [wide candidate](captures/WILLOW-1048-normal-after-wide.png), [second-seed low river before](captures/WV-SURFACES-2-low-before-river.png), [candidate](captures/WV-SURFACES-2-low-after-river.png). These are review evidence, not human acceptance of the art direction.
