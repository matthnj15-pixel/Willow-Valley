# P2: A3 meadow plus A1 world environment runtime

Start NOW, concurrently with P1/P3/P4. Branch `feat/wv007-p2-world`.

## Launch prompt

Execute this handoff using latest develop/WV007. Adapt A3's selected meadow palette and grass recipe, plus explicitly selected A1 world systems, into one reusable real-world presentation layer. Use the shared read-view contract. Do not install an authored hamlet or blindly import A2's materials.mjs. Verify, merge your scoped passing PR, and deliver to P5.

## Exclusive files

`render-adoption/world/**`, `assets/wv/runtime-environment-v1/**`, `scripts/build-wv007-world.mjs`, `tests/wv007-world*.test.mjs`, `tests/browser/wv007-world*.spec.mjs`, `docs/handoffs/WV-ART-007/delivery-p2/**`, `docs/testing/wv007-p2/**`.

## Required implementation

Read A3 meadow-study.md and A1 integration.md, actual factories and terrain authority. Derive from their pinned sources into your namespace. A3 currently expects B's component/plan and small synthetic terrain: replace that dependency with the actual read view and placement/landscape context. Never import createHamletPlan, synthetic hamletHeight or stage 4/12/30 as gameplay data.

Classify actual meadow, forest edge, work/entrance ground, exposed rock, wet bank, river/lake and roads using existing authoritative semantics. Use A3's brighter varied greens and blade forms for meadow; adapt A1 sky/daylight/haze/water/shore/forest/rock as the wider starting system. Match them in one coherent scene; separate material ownership and do not overlay two terrains or globally tint buildings. A2 remains historical comparison. Any selective rock-detail reuse must be justified and separately pinned without reintroducing the rejected photographic meadow direction.

Retain actual rendered terrain geometry, simulation heights/wet polygons, road graph/widths, curves, junctions, local lanes and desire paths. PR 91 fixed the review fixture only; its narrow local-lane width is not a replacement for player arterials. Use semantic road categories and actual width to keep warm narrow paths and broad infrastructure both credible.

Own continuous meadow grass and expose coverage to P3. No B grass-tuft duplicate layer. Keep grass away from full C4 roof/yard/stair/loading/access envelopes, protected obstacles, cropped fields and water. Tile/chunk the generated color/control fields and blades for the full world; no single stretched small-study texture. Stable keys, camera visibility/culling and distance LOD are distinct from saved world generation. Grass roots and surface patches follow the exact displayed triangles; do not analytically seat them above a different coarse mesh.

Profile bandwidth/fragment shading as well as triangles. Reduce offscreen/distant cover and expensive samples, retain useful close detail, and provide an actual low-quality path. Static blades initially; no new wind/weather/night system. Low and hidden/offscreen scenes perform no idle animation. Normal water uses the host's existing bounded cadence, not an independent always-on RAF. Resize only on actual viewport/DPR change.

## Acceptance

Compare two actual generated seeds at close/wide, both qualities, near cottages, forest edge, steep rock, dry/wet bank, lake, river and real curved/T/acute roads. Validate read-only state, matching displayed contacts, shader compilation, coherent material color space/fog, no missing/external resources, no per-camera field rebuild, resize behavior, partial-load cleanup and repeated disposal. Log effective grass geometry/density/coverage, field resolutions, texture samples/decoded memory and true frame intervals. Preserve source studies and emit exact new closure for P5. No promise of installed offline readiness or actual-device FPS until final integration.

## Execution rules for every task

Repository: https://github.com/matthnj15-pixel/Willow-Valley. Inspected source develop: `55eb7199b663166b3cfb9ad97dbd96a3fc693624`, PR 92 merged. Fetch latest develop; do not reset newer work. Read applicable AGENTS.md and project instructions. Read this package's `00_START_HERE.md`, `01_AUDIT_AND_ADOPTION.md`, `02_LAYER_CONTRACT.md`, and `render-adoption/selection.json`. Run `node scripts/validate-wv007-adoption.mjs` before building. This round supersedes the old A-F launch prompts; historical study evidence remains intact.

Use a separate worktree and feature branch. Implement, run focused meaningful checks and the current full required suites/builds, open a PR into develop, and merge your own PR only after current-head required CI passes. Refresh develop before merge; inspect new upstream changes and rerun affected checks. Resolve textual conflicts with both owners' semantics preserved. Never accept an entire side blindly, force-push develop/main, or merge into main. Verify actual deployment commit, not the publishing workflow's main metadata. Deliver exact source/output hashes, head/merge SHAs, CI URLs, changed files, known limitations, review/game URL, and deployment status. No subagents are required by this handoff.

Keep the authoritative economy, workforce, capacity, needs, terrain generation, road topology/width, zoning/paint gestures, founded-era/identity hashing, all three saves and migration unchanged. Render from immutable state snapshots. Helpers such as zoneAt/world setup can initialize state; compute needed authoritative inputs in the application owner or a safe detached read view. No background economic ticks, telemetry, mandatory account, remote runtime assets, or new paid/API service. Installed offline play remains the primary target.

Preserve C4 normal art as the visual reference. Optimize runtime derivatives, visibility, distance LOD, shared resources, and shader cost without overwriting accepted source bundles or deleting the thatch courses, chimney continuity, granary air gap, or distinct workplace plans. Existing numerical budgets are provisional regression guards. Do not change tests to hide excess or claim a phone hardware ceiling from triangle counts. Measure effective LODs and renderer work; desktop/software timings do not approve actual-device performance. Normal maps omitted from low materials must also be omitted from low runtime dependency/allocation claims, not merely hidden in a loaded all-quality bundle.

P1-P4 are concurrent implementation tasks with exclusive paths below. They build reusable runtime layers against the shared read-view contract and real-state fixtures, not another authored hamlet. They do not edit shared app/renderer/registry/placement/cache/offline/workflow/package files. Propose those edits in their integration reports. P5 is the sole owner of final shared wiring. No session runs another task's asset generator and commits its generated outputs. Source studies remain frozen; derive into your namespace.

Baseline commands: `npm ci`, `npm test`, `npm run build:assets`, `npm run build:icons`, `npm run build:offline`, `npm run test:e2e`, plus the current Three.js parity selection from `.github/workflows/test.yml`. Inspect package.json first. Explicitly validate new GLBs; the existing validator does not automatically discover new namespaces. Check deterministic rebuilds and new output dependency hashes. Existing generated shared outputs must remain unchanged for P1-P4. Do not claim a newly added page or module is installed offline before P5 adds and verifies the closure.

Write your implementation report, exact changed-file list, APIs, ownership/disposal, source pins, measured limits, and handoff requirements inside `docs/handoffs/WV-ART-007/delivery-pN/`; write test evidence in `docs/testing/wv007-pN/`. Quality changes, late loads, repeated updates, hidden tabs, load failure and idempotent disposal require coverage. All layers must leave simulation and saved storage byte-equivalent after rendering and camera movement.
