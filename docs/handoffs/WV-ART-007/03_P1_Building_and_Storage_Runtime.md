# P1: C4 building and storage runtime library

Start NOW, concurrently with P2-P4. Branch `feat/wv007-p1-buildings`.

## Launch prompt

Execute this handoff from latest develop containing WV007. Implement the selected C4 runtime building layer and selective offline-ready derivatives, plus D preview library, in your exclusive namespace. Consume the adoption/read-view contracts. Do not repoint old studies or attach to shared game files. Verify, merge your passing PR into develop, and deliver the API/output contract for P5. This task must produce working runtime code against actual-state fixtures, not another standalone art study.

## Exclusive files

`render-adoption/buildings/**`, `assets/wv/runtime-buildings-v1/**`, `scripts/build-wv007-buildings.mjs`, `tests/wv007-buildings*.test.mjs`, `tests/browser/wv007-buildings*.spec.mjs`, `docs/handoffs/WV-ART-007/delivery-p1/**`, `docs/testing/wv007-p1/**`.

## Required implementation

- Select C4's eighteen normal/low roots explicitly; map five homes and current work roles, all four parks/four plazas. Keep HOME_IDS/hash unchanged and sixth home/failed-site legacy fallback. Legacy defaults are park-village-green and plaza-town-square; support supplied explicit compatible visual IDs without adding a save field.
- Emit selective normal/low and practical distance derivatives from the frozen C4 checkpoint. Low delivery must not pull normal/roughness images into its active resource closure. Preserve close-view C4 reference geometry/material language and provenance. Do not ship C1/C2/C3 comparison bundles, private kit source or authoring checkpoints in the runtime closure. Map new source nodes, IDs and outputs explicitly; same IDs in other families do not authorize overlay rendering.
- Fixed 2.8 scale for C4, separate seats/roof/yard/stairs, complete rotated site admission and entrance corridors. Test concave/tight parcels, shoreline corners, neighboring roofs, tall chimney bounds, unsafe grades and legacy sites without parcels. Omit optional dressing before stable compact/legacy fallback; no scale-to-fit, new ownership or moved entity.
- Granary's 1.35 m storage floor stays level with an open undercroft; extend individual support feet. Public paths/paving conform to displayed terrain; furniture/stage/piers need independent contacts. Partition source semantic/kit components into seatable groups; do not drape merged trees/furniture or create whole-plot park foundations.
- Preserve nested mesh transforms and source-root poses in batching, draw/picking identity, sharing and disposal. Reduce material splits and distant geometry through separate derivatives with measured error and side-by-side captures. Do not remove layered thatch or coherent flue as a shortcut to a provisional triangle cap.
- Return the placement/exclusion view specified in 02_LAYER_CONTRACT. Include C4 fixed kit fence fragments, shutters/planting, cargo/wagon and civic furniture so P3 never generates overlapping replacements.
- Expose D storehouse-l1/warehouse-l2 and generic props through an explicit preview asset API; no warehouse BUILDINGS entry or game economy. Keep proposed capacity/staffing outside measured geometry. D source IDs are repeated across normal/low qualities, so key by `(family,id,quality)`, not id alone.

## Acceptance

Actual start/save fixtures retain serialized state, stable identities, correct admitted/fallback counts, rotations and scale; all five work roles plus park/plaza work without source comparisons. Tests verify hierarchy transforms, whole-parcel/approach clearance, slope seating/undercroft, exact quality texture requests, load-error fallback, stale callback cleanup and shared disposal. Deterministic runtime outputs explicitly validate with zero glTF errors and documented warnings, if any. Export transfer/decoded-mip estimates by quality, full source hashes, per-entry effective LOD and camera-distance policies. Benchmark requested normal without silently switching all homes to low based on settlement count. P5 owns final renderer/loader/placement/offline edits and device acceptance.

## Execution rules for every task

Repository: https://github.com/matthnj15-pixel/Willow-Valley. Inspected source develop: `55eb7199b663166b3cfb9ad97dbd96a3fc693624`, PR 92 merged. Fetch latest develop; do not reset newer work. Read applicable AGENTS.md and project instructions. Read this package's `00_START_HERE.md`, `01_AUDIT_AND_ADOPTION.md`, `02_LAYER_CONTRACT.md`, and `render-adoption/selection.json`. Run `node scripts/validate-wv007-adoption.mjs` before building. This round supersedes the old A-F launch prompts; historical study evidence remains intact.

Use a separate worktree and feature branch. Implement, run focused meaningful checks and the current full required suites/builds, open a PR into develop, and merge your own PR only after current-head required CI passes. Refresh develop before merge; inspect new upstream changes and rerun affected checks. Resolve textual conflicts with both owners' semantics preserved. Never accept an entire side blindly, force-push develop/main, or merge into main. Verify actual deployment commit, not the publishing workflow's main metadata. Deliver exact source/output hashes, head/merge SHAs, CI URLs, changed files, known limitations, review/game URL, and deployment status. No subagents are required by this handoff.

Keep the authoritative economy, workforce, capacity, needs, terrain generation, road topology/width, zoning/paint gestures, founded-era/identity hashing, all three saves and migration unchanged. Render from immutable state snapshots. Helpers such as zoneAt/world setup can initialize state; compute needed authoritative inputs in the application owner or a safe detached read view. No background economic ticks, telemetry, mandatory account, remote runtime assets, or new paid/API service. Installed offline play remains the primary target.

Preserve C4 normal art as the visual reference. Optimize runtime derivatives, visibility, distance LOD, shared resources, and shader cost without overwriting accepted source bundles or deleting the thatch courses, chimney continuity, granary air gap, or distinct workplace plans. Existing numerical budgets are provisional regression guards. Do not change tests to hide excess or claim a phone hardware ceiling from triangle counts. Measure effective LODs and renderer work; desktop/software timings do not approve actual-device performance. Normal maps omitted from low materials must also be omitted from low runtime dependency/allocation claims, not merely hidden in a loaded all-quality bundle.

P1-P4 are concurrent implementation tasks with exclusive paths below. They build reusable runtime layers against the shared read-view contract and real-state fixtures, not another authored hamlet. They do not edit shared app/renderer/registry/placement/cache/offline/workflow/package files. Propose those edits in their integration reports. P5 is the sole owner of final shared wiring. No session runs another task's asset generator and commits its generated outputs. Source studies remain frozen; derive into your namespace.

Baseline commands: `npm ci`, `npm test`, `npm run build:assets`, `npm run build:icons`, `npm run build:offline`, `npm run test:e2e`, plus the current Three.js parity selection from `.github/workflows/test.yml`. Inspect package.json first. Explicitly validate new GLBs; the existing validator does not automatically discover new namespaces. Check deterministic rebuilds and new output dependency hashes. Existing generated shared outputs must remain unchanged for P1-P4. Do not claim a newly added page or module is installed offline before P5 adds and verifies the closure.

Write your implementation report, exact changed-file list, APIs, ownership/disposal, source pins, measured limits, and handoff requirements inside `docs/handoffs/WV-ART-007/delivery-pN/`; write test evidence in `docs/testing/wv007-pN/`. Quality changes, late loads, repeated updates, hidden tabs, load failure and idempotent disposal require coverage. All layers must leave simulation and saved storage byte-equivalent after rendering and camera movement.
