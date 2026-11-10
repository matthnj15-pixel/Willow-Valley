# WV007 mobile performance pass

Development's opt-in Three renderer now retains the host settlement buffers during
camera-only LOD/redraw updates. This removes repeatable pan hitches while retaining
normal artwork, quality policy and renderer rollout. It does **not** establish
30 FPS on Nate's iPhone Duo. Installed-device acceptance remains pending.

## Baseline, ownership and provenance

- Starting develop: `ffba0efc21743123dcf6fbaa140084eb255e6932`, PR #98. No open PRs or local work at kickoff. Feature branch: `feature/wv007-mobile-performance`.
- Runtime implementation: `fd0cd109cf9122fd4520a856491624398ad3b999`. Candidate motion records identify `bb6562efd988d0e94f05919fb12c9590fee531ad`; it has the identical runtime plus measurement tooling. Later changes only extend evidence/tooling. Raw records pin the actual served module bytes, fixture/camera, prefs, GPU and viewport. Final PR head, exact-head CI, merge and actual deployment verification are recorded on [PR #99](https://github.com/matthnj15-pixel/Willow-Valley/pull/99).
- Root performed Kickoff → Planner → Builder and exclusively owned renderer/cache changes. A separate read-only Reviewer independently inspected code, raw data and images. Willow Valley's acceptance/release rules apply; Master Plan repository/provider rules do not.
- Native WebGL remains the default and fallback. All real-route contexts explicitly selected their renderer/quality in new isolated contexts. Preferences remain outside saves. Actual renderer/quality and no-fallback state are in `initial.effective` in each raw record.
- The publicly served baseline service worker was separately verified as `ffba0efc…`, asset version `95b5b50f7296bdf0`: [served-before.json](served-before.json). Candidate asset version is `34b141729f6c6acc`. Timing contexts blocked SWs and had empty caches; they cannot be mistaken for installed/cache measurements. Nate's current installed renderer, quality and cached version are unknown until Duo UAT.
- Selected source art and all eight runtime derivative profiles are unchanged. [P4 measured admission](p4-live/live-measured-admission.json) contains exact source/output/code hashes. `assets/` rebuild deterministically; old P5 records are unchanged.

## Measured cause and smallest fix

In the baseline, every presentation invalidation called the controller's settlement
refresh. Crossing the 24-game-unit camera update bins could therefore rebuild and
upload roads, zones, structures and editor guides without a settlement change.
The discovery CPU traces put the added work in `settlementGeometry`, terrain
sampling/draping and allocations. Water/render-only orbit did not have these host
rebuilds.

The fix makes invalidations draw-only by default. Completed settlement composition
(including its error path) and a changed legacy-fallback membership still refresh
host bindings. Buildings/landscape retain their existing LOD/culling decisions;
field atlases/read views do not rebuild for camera movement. No render scale,
material/effect quality, detail distance or source asset was reduced. Simulation,
persistence, camera/input math and save schemas are unchanged.

## Controlled repeated comparison

Environment: headless Chromium 141 / Playwright 1.56.1, ANGLE Vulkan SwiftShader,
mobile viewport 669×951, DPR 1, actual game canvas 669×683, browser display mode.
Same detached P4 fixtures, source hashes, camera path/poses and effective policy
per pair. Live gameplay water is enabled. The first parcel is the fixed focus;
24 poses cover a 144-unit pan, quarter orbit, or near/town/far zoom. Each path is
repeated three times, serially with no other browser/test workload. These are
short automation probes, not device-duration acceptance captures.

Rows below are medians of the three per-run callback-interval statistics. Raw
records include median/p95/p99, >33.33/>50ms counts, observed changed renderer
frame tokens, host calls/triangles, effective LODs/resources, draw/geometry CPU,
upload counts/bytes and untouched slot bytes. Callback/submission pacing is not
finger-to-screen latency or physical-device rendered FPS.

| Homes | Path | Renderer | Quality | Median ms before → after | p95 ms before → after |
| ---: | --- | --- | --- | ---: | ---: |
| 30 | pan | three | normal | 254.0 → 234.1 | 931.5 → 325.3 |
| 30 | pan | three | low | 157.9 → 137.1 | 627.3 → 213.5 |
| 30 | pan | webgl | normal | 46.2 → 59.2 | 73.0 → 81.8 |
| 100 | pan | three | normal | 517.3 → 511.7 | 1479.0 → 627.4 |
| 100 | pan | three | low | 316.7 → 327.0 | 1080.9 → 414.2 |
| 100 | pan | webgl | normal | 82.5 → 66.6 | 90.7 → 84.8 |

| Homes / normal Three pan | p95 spread before (ms) | p95 spread after (ms) | Host rebuilds per path | Geometry CPU per path before → after |
| --- | ---: | ---: | ---: | ---: |
| 30 | 849.8–942.5 | 320.9–326.6 | 10 → 0 | 3198.6 ms → 0 |
| 100 | 1423.6–1542.8 | 516.7–640.1 | 11 → 0 | 4761.6 ms → 0 |

Normal pan p95 improves about 65% (30 homes) and 58% (100 homes), beyond observed
spread. Low pan also has non-overlapping before/after p95 ranges. Orbit, zoom and
native-control variations overlap observed spread; no broad FPS or native speed
claim is supported. The native 30-home control's p95 was slower in this pair;
its code/workload is unchanged and this does not establish a causal regression.

A/B CPU probes boot the full normal scene, then suppress only `renderer.render`
during the same camera work. Pan p95 drops 672.4→80.5ms (30) and 959.3→86.9ms (100),
with about 3.04s/4.75s redundant geometry CPU removed per path. Asset parse plus
dependent image-decode elapsed times and startup phase timings are recorded;
parallel parse elapsed times must not be summed as main-thread CPU. This separates
the removed JavaScript hitch from the substantial remaining software rendering
cost. No exact GPU time or GPU/JS heap measurement is claimed.

## Boot, editing and Advance Month

These are single observations per configuration, **not** repeated performance
claims. First host-draw timestamps, full-scene boot, read-view/buildings/landscape/
world phases, simulation, individual persistence calls and final interactive scene
times are in [comparison.json](comparison.json) and the raw records.

| Homes / normal Three | Full-scene boot before → after (ms) | Checked month: updated interactive scene before → after (ms) |
| --- | ---: | ---: |
| 30 | 8473 → 6991 | 5775.7 → 4919.2 |
| 100 | 10700 → 8336 | 7351.1 → 6758.0 |

All normal/low month outcomes match an independent detached simulation advance.
Camera-only bytes remain identical. Month records explicitly retain the temporary
stale previous-layer revisions: old `settlement-1` layers after the read view has
advanced, then every layer ready at `settlement-2`. Verified edit+month sequences
reach coherent `settlement-4`. No transient flags were deleted or treated as final
readiness. Simulation and persistence timings are separate from scene refresh.

Corrected `before-edits/` and `after-edits/` records create a real two-anchor draft
(`roadDraftReady:true`), exercise paint (1 pending), erase (2), commit (0), then a
checked month. Draft refreshes fall 6→3; zone-commit refreshes fall 5→2. Editor
latencies are mixed single samples: 30-normal erase updated-scene time increased
1240.2→1720.6ms (synchronous CPU 930.8→950.8ms), and paint 1061.3→1166.6ms. These
observations cannot establish either a repeatable regression or “no regressions”.
Per-stroke geometry/picking and the expensive committed-world field/landscape
refresh remain costs for future device-guided work. Earlier `editor-picking-*`
records are retained as exploratory picking attempts, not successful draft timing.

## Visual and structural parity

Matched normal close/town/far screenshots and raw layer records are under
`before/` and `after/` for both fixtures. LOD distributions, calls and triangles
match exactly at each matched view; no intended distance changes exist. Broad
view pixel differences are at most one RGB channel level, consistent with the
live animated water phase; geometry/material composition is unchanged.

All five admitted-normal C4 detail pairs are pixel-identical, with equal cameras
and placements: [layered thatch](after-c4-detail/30-home-low-hip.png),
[chimney](after-c4-detail/30-home-long-ridge.png),
[smith roof/stack join](after-c4-detail/30-facility-smith.png),
[granary undercroft/supports](after-c4-detail/30-facility-granary.png), and
[steep-gable](after-c4-detail/30-home-steep-gable.png). Matching originals are in
`before-c4-detail/`. Ground cover, plot/access edges, terrain, textures and editor
overlays remain present. [visual-comparison.json](visual-comparison.json) records
pixel differences. The broad close view centers a legacy house; the extra detail
captures deliberately verify actual admitted normal C4, not that fallback.

The reused P4 live script writes to `p4-live/` without touching historical P5.
Its 100-home normal orbit has a full 45s warmup + 60s measurement, no admission
issues, 109 observed changed render frames, p95 700.1ms/p99 756.8ms, peak 623145
triangles / 349 calls — the same P5 workload counts. Triangle/call warnings remain.
This is gameplay distance/culling policy **with water off**, at 1100×950/DPR1 in
the diagnostics layout, and is labelled separately from real-route captures and
the full-detail reference. It demonstrates structural admission, not phone speed.

Local diagnostics now expose the gameplay policy with live water, while keeping
the full-detail/water-off reference default. Exported records label the profile.

## Verification and review

| Acceptance | Evidence / status |
| --- | --- |
| AC-01 faster identified path | Pass in controlled automation: both fixtures/qualities, three repeats, CPU A/B and source-pinned raw data; device FPS pending |
| AC-02 normal visual parity | Pass in automation: matched broad views/LODs/counters; five pixel-identical admitted C4 detail pairs |
| AC-03 gameplay/saves | Pass in automation: actual Development route, four focused regressions, checked months, untouched camera save bytes, full gameplay/save parity suite |
| AC-04 offline/recovery | Pass in Chromium: clean / and /dev caches, all slots/cold offline reopen, corrupt update rollback/retry, engine import/context failure, background/restore and late loads; real iOS pending |
| AC-05 installed Duo >=30 FPS and 15–20 minutes | **Pending**, phone unavailable; follow [DEVICE_UAT.md](DEVICE_UAT.md) and P4 device checklist |
| AC-06 exact-head integration/deployment | Required before merge; final PR/CI/Reviewer/served SHA recorded on PR #99; Stable stays with Nate |

Initial runtime CI [42742264136](https://github.com/matthnj15-pixel/Willow-Valley/actions/runs/42742264136)
passed on `fd0cd10`: 274 unit passes / one skip, syntax, deterministic assets,
icon build/validation, offline build, 163 browser passes and 16 Three parity passes.
Local full unit/assets/icons/offline checks and four focused browser tests pass;
logs are beside this report. No numerical test guard was relaxed. The final PR
head must independently pass the full required workflow before merging.

Separate Reviewer findings are in [REVIEW.md](REVIEW.md). This is ready for
Development device play-testing after the integration gates pass; it is not
Stable release or installed-device performance approval.

## Reproduce / raw evidence

Run with dependencies/icons/offline built and `python3 scripts/serve-preview.py`.
Use new output directories and run serially:

```sh
WV007_REVISION=ffba0efc21743123dcf6fbaa140084eb255e6932 WV007_OUTPUT=/tmp/wv-before node scripts/measure-wv007-mobile.mjs
WV007_OUTPUT=/tmp/wv-after node scripts/measure-wv007-mobile.mjs
# Add WV007_CPU_ONLY=1, WV007_EDITS_ONLY=1 or WV007_DETAIL_ONLY=1 for the other probes.
WV007_OUTPUT=/tmp/wv-p4-live WV007_FULL_LIVE=1 node scripts/measure-wv007-live.mjs
```

`WV007_REVISION` serves that revision's modules through isolated Playwright routes;
normal runs read current source. Instrumentation wraps host geometry/draw/upload,
simulation, persistence and asset parse only inside the test browser. It is not
shipped in gameplay. `.json.gz` is lossless gzip (`gzip -dc FILE.json.gz`); previous
P5 records remain byte-equivalent. [comparison.json](comparison.json) includes all
run medians/spreads, p99/long-frame counts, boot/editor/month observations and
fixture hashes. CPU traces and their discovery summary are at this directory's
root. `ARTIFACTS.json` pins evidence bytes. No larger representative/player save
was available; no personal export or device data was accessed.
