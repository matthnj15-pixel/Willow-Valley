# P4 validation evidence

Cloud Linux, Node 24.19.0 for baseline commands; focused profiling tests also run with CI's Node 22 (22.23.4). Chromium 141 / Playwright 1.56.1, configured mobile viewport 600×850 and DPR 2. This is browser emulation, not installed Safari/phone evidence.

- Adoption validator: selected C4/A3/A1/B/D inputs pass, runtimeReady remains false.
- Full `npm test`: 233 pass, 1 existing skip, 0 fail (234 tests). Earlier sandbox-only subprocess EPERM failures disappeared when run with process/network access; no tests were relaxed.
- Focused profiling unit suite: 12 checks for sampling math, windows, interruptions, missing/failed/late loads, actual home/visible/material LODs, source/output pins, resource completeness, context loss, repeated updates, disposal, privacy/schema, actual fixtures and month outcomes. Node 22 pass is recorded in the PR validation.
- Focused browser suite: 3 pass, covering real fixture/quality/scenario switching, local JSON download, storage preservation, dependency failure/late completion, RAF/visibility handling and clean disposal.
- `npm run build:assets`, `npm run build:icons`, `CHECK_BUILT_ICONS=1 node --test tests/icon-artifacts.test.mjs`, `npm run build:offline`: passed. Tracked shared assets and asset-cache.js remain unchanged. No new GLB namespace exists in P4.
- Both fixtures rebuild byte-for-byte; `measure-wv007-runtime.mjs` verifies committed fixture/output hashes against the manifest and checks real month outcomes and exact cameras.
- Full browser suite and Three parity are required before merge. Their final counts, current-head required CI URL and merge/deployment SHAs are recorded in the PR, rather than claiming an unfinished run here.

`raw/availability.json` is the reproducible CLI record, explicitly invalid until combined attachment. `raw/browser-unavailable-sample.json` is an actual local Chromium RAF/controller export from the missing-host browser test: deliberately incomplete fixture metadata, unavailable renderer/layers, short duration and a visibility interruption. Its timings only demonstrate sampling/export; they are **not** a combined-scene or phone benchmark. No selected layer is falsely reported ready. Output pins are authoritative in `render-adoption/profiling/manifest.json`.

The device checklist is unexecuted. Cold installed-offline closure, combined rendering, actual effective LODs/resources, sustained >=30 FPS, heat/battery/input pacing, and actual-device acceptance depend on P5 plus the target installed device. No offline/publication success is claimed for the new diagnostic page.
