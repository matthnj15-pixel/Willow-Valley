# P3: Plot-aware landscape runtime

Start NOW, concurrently with P1/P2/P4. Branch `feat/wv007-p3-plots`.

## Launch prompt

Execute this handoff from latest develop/WV007. Adapt B's natural collection, plot-aware dressing, shared boundaries and painted fields to actual player settlements. Consume frozen C4 placement/exclusion contracts and P2 grass ownership. Implement reusable runtime code with real-state fixtures, not another fixed hamlet. Verify, merge your passing scoped PR, and deliver to P5.

## Exclusive files

`render-adoption/landscape/**`, `assets/wv/runtime-landscape-v1/**`, `scripts/build-wv007-landscape.mjs`, `tests/wv007-landscape*.test.mjs`, `tests/browser/wv007-landscape*.spec.mjs`, `docs/handoffs/WV-ART-007/delivery-p3/**`, `docs/testing/wv007-p3/**`.

## Required implementation

Read B's PLOT-LANDSCAPE.md, INHABITED-HAMLET.md, placement/plot/painted-fields APIs, and the unit contract. Preserve their specialized planners and stable-key logic; no competing recreation of zoning, boundary ownership or seed generation. Wrap game-to-scene/metre conversion in named tested bridges. Houses without saved parcels receive conservative existing presentation, not fabricated garden ownership.

Use actual parcel polygons/holes, C4 transformed building/roof/yard/stair envelopes, real door/loading approaches, existing roads/lanes, existing tree protection and supplied retained boundaries. Fit gardens/orchards/work-yard details to remaining usable area. Do not scale a full fruit crown to a tiny wedge or fill every leftover pixel. These remain decorative; no food production or capacity changes.

One physical shared boundary can have multiple plot users. Respect existing earlier spans and C4 integral fence fragments, leave gates and corridors clear, reuse partial/near-aligned spans, and report conflicting retained fences rather than silently erasing them. C4's separate market wagon/cargo and civic furniture are occupied integral details. Do not also place B's authored shared well/cart/bench or D duplicates in that location. New freestanding common props use D through P1's preview/generic-prop interface; garden specialist shapes can retain B's recipe.

Derive field polygons and holes from authoritative committed farmland classification, with bounds/resolution/work limits. Include drag/Commit/eraser/reload behavior, disconnected islands and road/water clipping. Feed one resulting plan to field surfaces/crop display/boundaries. Do not change crop yields/field eligibility or persist all derived fences as retained history. Clear old derived outlines when land use changes.

Use B variants for supplied authoritative tree candidates; preserve protection/identity, don't replace forest generation with hamlet reference patches. P2 owns continuous meadow grass. Suppress B grass-tuft in that coverage and defer it conservatively if coverage is unavailable. Foliage should frame doors/editor controls and working areas, not hide them. Use spatial indexes, shared instances, separate view LOD and efficient invalidation.

## Acceptance

Frozen real saved-state tests cover adjacent irregular lots, rotated/concave/tiny plots, holes, added neighbors reusing old fence segments, actual field painting/erase/reload, stairs/loading routes, sloped contacts, protected woodland and no missing legacy parcels. Verify no duplicate boundary keys, well/cart/cargo or double grass coverage. Primary tree positions and full boundary geometry stay stable across camera/quality changes. No per-frame all-props-by-all-roads work; hidden scenes stop drawing, ownership/disposal is idempotent. Emit tree/boundary/field/dressing plans and measured runtime dependency closure for P5. Public furniture/paths come from the admitted C4 layout, not an enclosing generic park slab.

## Execution rules for every task

Repository: https://github.com/matthnj15-pixel/Willow-Valley. Inspected source develop: `55eb7199b663166b3cfb9ad97dbd96a3fc693624`, PR 92 merged. Fetch latest develop; do not reset newer work. Read applicable AGENTS.md and project instructions. Read this package's `00_START_HERE.md`, `01_AUDIT_AND_ADOPTION.md`, `02_LAYER_CONTRACT.md`, and `render-adoption/selection.json`. Run `node scripts/validate-wv007-adoption.mjs` before building. This round supersedes the old A-F launch prompts; historical study evidence remains intact.

Use a separate worktree and feature branch. Implement, run focused meaningful checks and the current full required suites/builds, open a PR into develop, and merge your own PR only after current-head required CI passes. Refresh develop before merge; inspect new upstream changes and rerun affected checks. Resolve textual conflicts with both owners' semantics preserved. Never accept an entire side blindly, force-push develop/main, or merge into main. Verify actual deployment commit, not the publishing workflow's main metadata. Deliver exact source/output hashes, head/merge SHAs, CI URLs, changed files, known limitations, review/game URL, and deployment status. No subagents are required by this handoff.

Keep the authoritative economy, workforce, capacity, needs, terrain generation, road topology/width, zoning/paint gestures, founded-era/identity hashing, all three saves and migration unchanged. Render from immutable state snapshots. Helpers such as zoneAt/world setup can initialize state; compute needed authoritative inputs in the application owner or a safe detached read view. No background economic ticks, telemetry, mandatory account, remote runtime assets, or new paid/API service. Installed offline play remains the primary target.

Preserve C4 normal art as the visual reference. Optimize runtime derivatives, visibility, distance LOD, shared resources, and shader cost without overwriting accepted source bundles or deleting the thatch courses, chimney continuity, granary air gap, or distinct workplace plans. Existing numerical budgets are provisional regression guards. Do not change tests to hide excess or claim a phone hardware ceiling from triangle counts. Measure effective LODs and renderer work; desktop/software timings do not approve actual-device performance. Normal maps omitted from low materials must also be omitted from low runtime dependency/allocation claims, not merely hidden in a loaded all-quality bundle.

P1-P4 are concurrent implementation tasks with exclusive paths below. They build reusable runtime layers against the shared read-view contract and real-state fixtures, not another authored hamlet. They do not edit shared app/renderer/registry/placement/cache/offline/workflow/package files. Propose those edits in their integration reports. P5 is the sole owner of final shared wiring. No session runs another task's asset generator and commits its generated outputs. Source studies remain frozen; derive into your namespace.

Baseline commands: `npm ci`, `npm test`, `npm run build:assets`, `npm run build:icons`, `npm run build:offline`, `npm run test:e2e`, plus the current Three.js parity selection from `.github/workflows/test.yml`. Inspect package.json first. Explicitly validate new GLBs; the existing validator does not automatically discover new namespaces. Check deterministic rebuilds and new output dependency hashes. Existing generated shared outputs must remain unchanged for P1-P4. Do not claim a newly added page or module is installed offline before P5 adds and verifies the closure.

Write your implementation report, exact changed-file list, APIs, ownership/disposal, source pins, measured limits, and handoff requirements inside `docs/handoffs/WV-ART-007/delivery-pN/`; write test evidence in `docs/testing/wv007-pN/`. Quality changes, late loads, repeated updates, hidden tabs, load failure and idempotent disposal require coverage. All layers must leave simulation and saved storage byte-equivalent after rendering and camera movement.
