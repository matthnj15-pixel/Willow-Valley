# WV006 A: measured review evidence

Candidate only; final composition and physical-device acceptance await B–D and F. Review URL after deployment: https://matthnj15-pixel.github.io/Willow-Valley/dev/ui-kit/wv006-environment.html

## Implemented and constrained

Quiet broad meadow color/density variation, rotated/coarse grass sampling in normal, seeded-tree leaf/soil influence, dedicated foliage-free projected procedural rock, damp/sediment/gravel bank transitions, clipped entrance/work visual influence API, detachable daylight/sky/haze, and shore-distance/river-tangent water polish. No height, collision, polygon, suitability, gesture or authoritative state changes. Low omits two ground albedo samples, clouds, water ripples and idle animation; it also uses smaller control fields. No new albedo, render target, shadow pass, remote runtime asset or paid dependency. The two textures are shared across terrain/roads/water.

The standalone review has two seeds, normal/low, matching before/after treatment, close/wide, .40/1.35 pitch, forest edge, cliff, junction, lake and river. Changing only treatment preserves the current camera in the URL. `motion=off` freezes comparison animation. Context uses unchanged committed catalog geometry at common scale and seven material witnesses (plaster, timber, clay, straw, stone, cloth, water); it makes no functional-building or trade claims. The gallery renderer excludes tree intersections within loaded context bounds equally before/after. The shared playable renderer remains unchanged.

## Local verification

- `node scripts/build-wv006-environment.mjs`: passed. Deterministic scoped bundle and exact SHA256 dependency record. No shared cache/workflow edits.
- Focused `npx playwright test wv006-environment`: initial nine checks passed (1.6m), including both seeds × both qualities, all paired views/camera equality, unchanged state serialization, missing-resource fallback, disposal before late image loads, six repeated world changes/resource stability, hidden/low idle behavior and 100-home budgets. Final full-suite rerun includes gallery seating/exclusion improvements and a tenth rendered-pixel test proving custom terrain responds to light and explicit haze.
- `npm test`: 170 passed / one icon check skipped before icon build; no failures. Final `CHECK_BUILT_ICONS=1 npm test` result recorded below.
- `npm run build:assets`: passed all current validators, including explicit existing MegaKit study and catalog GLBs (0 errors / 0 warnings). **No new glTF is emitted**, so there is no unvalidated new mesh output.
- `npm run build:icons`: passed, three PNGs generated; `npm run build:offline`: passed, self-contained shared game generated (1,227,427 characters). Generated unrelated output is not committed.
- An initial sandbox-only unit invocation could not execute offline-packaging subprocess checks; rerunning with process access passed. This was an execution restriction, not an application regression.
- Full e2e, Three.js parity, PR CI and deployment evidence are recorded in the final delivery record below when complete.

## Matched frame measurements

Run `node scripts/measure-wv006-environment.mjs http://127.0.0.1:4173 docs/testing/wv006-a/measurements REVISION` with the preview server. Eight runs are serial, without another browser suite running. Each pair uses the exact same unchanged 30/100 fixture, orbit-v1 path, camera, browser viewport (600×850 CSS), canvas (574×580 CSS), DPR 2, render DPR 1.5 normal / 1 low, two-second warmup and eight-second sample. Both before/after use `motion=off`, so these measure camera-driven frames, not idle animation. Raw [JSON](measurements/) records renderer, all view settings, intervals and peak resource counts. Renderer: Chromium ANGLE Vulkan SwiftShader (Subzero). Different fixture visibility/time sampling can change peak calls/triangles slightly; the candidate adds exactly one sky draw and two triangles. No shadow draws.

These are **software-renderer smoke measurements**, not mobile FPS acceptance. Candidate normal is slower than the existing material, and neither meets a 33.3ms frame target here. This regression is a material limitation for F/UAT. No thermal, WebKit or physical-phone result is claimed.

| Homes / quality | Median ms | p95 ms | p99 ms | Calls | Triangles | Candidate total texture bytes |
| --- | --- | --- | --- | --- | --- | --- |
| 30 / normal | 283.4 → 366.6 | 366.7 → 450.0 | 383.4 → 483.2 | 96 → 97 | 78,514 → 78,516 | 23,823,019 |
| 30 / low | 150.0 → 183.3 | 183.4 → 200.1 | 200.1 → 216.6 | 96 → 97 | 55,179 → 55,181 | 23,792,299 |
| 100 / normal | 416.7 → 516.6 | 516.7 → 616.6 | 516.7 → 616.6 | 98 → 99 | 143,766 → 143,768 | 23,823,019 |
| 100 / low | 283.3 → 299.9 | 316.7 → 350.0 | 333.3 → 350.0 | 96 → 97 | 121,880 → 121,882 | 23,792,299 |

Whole-scene existing guardrails: normal ≤150 calls / 250k triangles, low ≤100 / 150k. All four candidate fixtures pass. Their architecture-v1 models remain the benchmark's unchanged models; this is not proof that B–D's forthcoming combined assets fit. The accepted ten-design catalog is scale context in the separate valley view, not substituted into these performance fixtures.

Surface transfer: existing 144,900 JPEG bytes; no new images. Decoded albedo mip estimate 2,796,203 bytes. Controls total 55,296 normal / 24,576 low without entrance inputs; with actual measured envelope inputs 470,016 / 122,880. All scene texture estimates include shared shader textures. The normal/low candidate benchmark texture deltas vs before are 27,648 / 12,288 bytes, matching its additional visual field. Source dependency paths/bytes/hashes: [dependencies.json](../../../assets/wv/environment-next/dependencies.json).

## Remaining review and limitations

Physical phone Safari/Chrome compilation, sustained 60s frame pacing/thermals, sky/horizon at all gesture extremes and final B–D architecture/landscape composition remain pending. Review near and far meadow repetition, neutral rock, wet polygon edges, low-quality entrance wear, bright shoulder seams/halos, water shimmer and haze against all seven witness families. Rendered terrain and bank faceting remain unchanged; no new cliffs or bathymetry were invented. Coarse shore distance and interpolated wear are visual estimates, never placement authority. On larger maps, very narrow wear can blur or be missed at current control resolution. Context models are review aids, not final transformed foundation integration.

Root/dev cold-offline game behavior is checked by the existing full suite. This gallery and candidate closure are deliberately **not installed/offline-ready**; F adds and verifies that closure if adopted. Existing saves, three slots, migrations, simulation production/employment/housing/founded-era behavior and the default environment retain their original code. A merge into develop approves delivery for review, not final art, physical-device performance or production rollout.
