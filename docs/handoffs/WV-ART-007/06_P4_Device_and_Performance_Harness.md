# P4: Installed-device and combined-scene measurement harness

Start NOW, concurrently with P1-P3. Branch `feat/wv007-p4-profiling`. Final combined execution waits for their layers/P5, but the controller, real-state scenarios, capability probe and local export can be implemented immediately.

## Launch prompt

Execute this handoff from latest develop/WV007. Build a reusable diagnostics controller and reproducible 30/100-home actual-state scenarios for the installed mobile game, with explicit layer/version/LOD reporting. Do not alter source artwork, shared game files or triangle limits. Missing peers remain visibly unavailable. Verify your scoped implementation, merge its passing PR and hand the controller/scenarios to P5.

## Exclusive files

`render-adoption/profiling/**`, `scripts/measure-wv007-runtime.mjs`, `tests/wv007-profiling*.test.mjs`, `tests/browser/wv007-profiling*.spec.mjs`, `ui-kit/wv007-diagnostics.html`, `ui-kit/wv007-diagnostics.mjs`, `ui-kit/wv007-diagnostics.css`, `docs/handoffs/WV-ART-007/delivery-p4/**`, `docs/testing/wv007-p4/**`.

## Required implementation

Provide a host-attachable local controller per 02_LAYER_CONTRACT. Capture requestAnimationFrame intervals, warmup/duration, median/p95/p99, long frames, requested/effective quality/LOD, viewport/DPR, browser/OS as reported, standalone/display mode, visible/hidden state, camera path and read-view/world revisions. Record renderer.info calls/triangles/resources, source/output pins, loaded quality images and honest decoded-buffer/texture estimates. Do not claim renderer.info is exact GPU/JS memory. Capability detection is observable feature reporting, not guessed device/chip identification.

Scenarios use actual application state/read-view construction, deterministic saved seeds, 30/100 homes, all work roles plus civic spaces, tight plots/slopes/shorelines/fields. Include idle, scripted orbit, zoom transition and a real month advancement with state outcomes checked outside rendering. Never fabricate economic validity for the live save; use isolated test settlements/saves and clear labels. Record actual rendered building LOD distribution. B's authored 30-home normal study selected low architecture: do not use that as a full-detail-normal benchmark.

Use current WebGL/Three.js backend. No new WebGPU/Metal rewrite, chip-specific guarantee, native accelerator access, new telemetry or browser switch. Installed PWA/offline and Safari are the primary test environment. Collect no private save contents/names; local JSON export, no upload. Do not invent physical phone data from Chromium mobile emulation.

Provide a device checklist for fresh install/cold airplane-mode launch, three save slots, interactions, background/restore/context loss, 30-60 second warmup and at least 60 second measurements, then a longer play session for sustained heat/pacing. Target sustained >=30 FPS with p95/p99 and perceived input lag reported. Battery/low-power/thermal observations are manual fields when APIs do not provide them. Red flags are evidence, not automatic destructive detail removal.

Existing draw/triangle limits remain provisional regression warnings until actual-device profiling supports revision. Do not loosen CI assertions silently or make benchmark success synonymous with a triangle threshold. Missing layers, incomplete fixture population, wrong quality or partial texture loads invalidate a measurement; tests must enforce those conditions.

## Acceptance

Unit/browser checks cover sampling-window math, pause/hidden handling, invalid samples, actual requested/effective LOD distinction, missing-layer/failed-load status, clean disposal and downloadable schema. Deliver a repeatable command, exact fixtures/camera path, raw local records and a short interpretation guide. No screenshot-only FPS claims. The diagnostic page may initially report unavailable combined layers; P5 mounts the controller in the actual adopted renderer and wires its cold-offline closure, then reruns the final scenarios.

## Execution rules for every task

Repository: https://github.com/matthnj15-pixel/Willow-Valley. Inspected source develop: `55eb7199b663166b3cfb9ad97dbd96a3fc693624`, PR 92 merged. Fetch latest develop; do not reset newer work. Read applicable AGENTS.md and project instructions. Read this package's `00_START_HERE.md`, `01_AUDIT_AND_ADOPTION.md`, `02_LAYER_CONTRACT.md`, and `render-adoption/selection.json`. Run `node scripts/validate-wv007-adoption.mjs` before building. This round supersedes the old A-F launch prompts; historical study evidence remains intact.

Use a separate worktree and feature branch. Implement, run focused meaningful checks and the current full required suites/builds, open a PR into develop, and merge your own PR only after current-head required CI passes. Refresh develop before merge; inspect new upstream changes and rerun affected checks. Resolve textual conflicts with both owners' semantics preserved. Never accept an entire side blindly, force-push develop/main, or merge into main. Verify actual deployment commit, not the publishing workflow's main metadata. Deliver exact source/output hashes, head/merge SHAs, CI URLs, changed files, known limitations, review/game URL, and deployment status. No subagents are required by this handoff.

Keep the authoritative economy, workforce, capacity, needs, terrain generation, road topology/width, zoning/paint gestures, founded-era/identity hashing, all three saves and migration unchanged. Render from immutable state snapshots. Helpers such as zoneAt/world setup can initialize state; compute needed authoritative inputs in the application owner or a safe detached read view. No background economic ticks, telemetry, mandatory account, remote runtime assets, or new paid/API service. Installed offline play remains the primary target.

Preserve C4 normal art as the visual reference. Optimize runtime derivatives, visibility, distance LOD, shared resources, and shader cost without overwriting accepted source bundles or deleting the thatch courses, chimney continuity, granary air gap, or distinct workplace plans. Existing numerical budgets are provisional regression guards. Do not change tests to hide excess or claim a phone hardware ceiling from triangle counts. Measure effective LODs and renderer work; desktop/software timings do not approve actual-device performance. Normal maps omitted from low materials must also be omitted from low runtime dependency/allocation claims, not merely hidden in a loaded all-quality bundle.

P1-P4 are concurrent implementation tasks with exclusive paths below. They build reusable runtime layers against the shared read-view contract and real-state fixtures, not another authored hamlet. They do not edit shared app/renderer/registry/placement/cache/offline/workflow/package files. Propose those edits in their integration reports. P5 is the sole owner of final shared wiring. No session runs another task's asset generator and commits its generated outputs. Source studies remain frozen; derive into your namespace.

Baseline commands: `npm ci`, `npm test`, `npm run build:assets`, `npm run build:icons`, `npm run build:offline`, `npm run test:e2e`, plus the current Three.js parity selection from `.github/workflows/test.yml`. Inspect package.json first. Explicitly validate new GLBs; the existing validator does not automatically discover new namespaces. Check deterministic rebuilds and new output dependency hashes. Existing generated shared outputs must remain unchanged for P1-P4. Do not claim a newly added page or module is installed offline before P5 adds and verifies the closure.

Write your implementation report, exact changed-file list, APIs, ownership/disposal, source pins, measured limits, and handoff requirements inside `docs/handoffs/WV-ART-007/delivery-pN/`; write test evidence in `docs/testing/wv007-pN/`. Quality changes, late loads, repeated updates, hidden tabs, load failure and idempotent disposal require coverage. All layers must leave simulation and saved storage byte-equivalent after rendering and camera movement.
