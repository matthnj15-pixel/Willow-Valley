# P3 verification evidence

Cloud Chromium/Linux evidence, 2026-11-02. This verifies the scoped layer, not installed-device performance or combined/offline gameplay acceptance.

## Reproduction

- `npm ci --cache /tmp/wv007-npm-cache --no-audit --no-fund`
- `node scripts/validate-wv007-adoption.mjs`
- `node scripts/build-wv007-landscape.mjs`
- `node --test tests/wv007-landscape.test.mjs`
- `npm test`
- `npm run build:assets`, `npm run build:icons`, `CHECK_BUILT_ICONS=1 node --test tests/icon-artifacts.test.mjs`, `npm run build:offline`
- `PLAYWRIGHT_BROWSERS_PATH=/tmp/wv007-playwright npm run test:e2e`
- `PLAYWRIGHT_BROWSERS_PATH=/tmp/wv007-playwright npx playwright test wv007-landscape --output=docs/testing/wv007-p3/browser`
- `PLAYWRIGHT_BROWSERS_PATH=/tmp/wv007-playwright WV_RENDERER=three npx playwright test camera-gestures organic-zoning road-3d-drag-fix save-slots organic-lanes --output=test-results-three-parity`

The browser path/cache variables select writable local tooling only; CI uses its usual installed browser. No repository workflow/package/test budget was changed.

## Unit and asset results

10 focused tests pass. Full unit run: 232 tests, 231 pass, one existing icon-artifact skip before its explicit built-icon check; zero failures. The explicit built-icon check passes. Adoption pins pass. All required existing asset/icon/offline builds complete, and tracked shared assets/cache/offline outputs remain unchanged.

New normal, low and far GLBs each validate with zero errors and zero warnings, have 20 quality-specific mesh roots, zero textures and no other-quality geometry. Exact parent/source/output hashes and closure sizes are in `asset-measurements.json`, `assets/wv/runtime-landscape-v1/manifest.json` and `closure.json`.

| Profile | GLB bytes | Source triangles (one of each form) |
| --- | ---: | ---: |
| normal | 761,888 | 6,939 |
| low | 270,680 | 2,393 |
| far | 228,336 | 2,001 |

These are measured library counts, **not** combined scene totals or phone ceilings. Two successive builds produce byte-identical GLBs, metadata, manifest and dependency closure, verified by SHA-256 over all six output files.

## What is exercised

Frozen actual saves cover a committed demand-grown cottage, a 12-turn seven-house settlement with three real saved parcels, four legacy homes without parcels, and a seeded generated world with 80 retained/protected woodland candidates. Supplemental edge fixtures cover adjacent irregular lots, rotation, concavity, a tiny wedge, holes, stairs/loading/door corridors, C4 full transformed bounds and integral fence equivalents, and earlier shared spans. Real source C4 dimensions are used for the frozen equivalent placement context; final P1 admission is not simulated by this adapter.

Tests compare input save/read-view bytes, stable keys and primary geometry, verify no B common-prop/grass duplication, preserve/report retained conflicts, bound field work, remove old derived field outlines after erasure, and check field holes against crop positions and actual triangulated surface raycasts. Generated/displayed slopes seat independently sampled surface vertices. Source/instance ownership, coalesced revisions, low/far switching, camera-only drawing, hidden updates, stale completion, late disposal, load failure and retry are covered.

Browser evidence exercises local GLTF loading and actual WebGL instance transforms, a cold low-only dependency request, and the existing game's drag/Commit/Eraser/reload controls. Candidate rendering reads committed `zoneAt` classifications from a frozen detached state, and compares all localStorage bytes with three valid save slots present. It creates no saved fences or crop/economic changes. The same returned field shapes feed surfaces, crops and boundaries.

## Acceptance boundary

`ready` is layer-local readiness. `integrationReady:false` and `offlineAdmitted:false` remain explicit. Work-yard generic requests await the P1/D interface; final peer placement/coverage adapters, gameplay crop replacement, protected-tree fallback display, hosting/offline admission and actual target-device acceptance belong to P5/P4. No actual phone session, native engine change, remote service, telemetry or new gameplay is claimed.

## Browser outcomes and scene measurement

The full required browser command collected 140 tests: 138 passed, two unchanged-source startup-readiness waits timed out at five seconds. C2's four-facility model-loading assertion passed on its isolated rerun. A1 normal environment readiness timed out again on isolated reruns; the identical test passed from a clean detached develop worktree at `a18e85d1e419096a71c3475f3c5b1dc2f5b83e14` on a separate local port (10.7 s total). Its source/readiness predicate was not changed. This is recorded as variable cloud startup timing, **not a passing full browser run**. The final scoped P3 selection has three passes, including cold low-only loading; the required Three.js parity selection has 16 passes. Current-head PR CI is the merge gate.

`browser/wv007-landscape-WV007-P3-a-88321-and-owned-resource-disposal/plans-and-resources.json` contains emitted tree/boundary/field/dressing plans, exact source identifiers and renderer observations. `p3-normal.png` is the corresponding P3 fixture capture. The failed existing A1 readiness page snapshot is preserved alongside it. No startup timeout was increased or existing test relaxed.

| Fixture view | P3 triangles | P3 draw calls | Whole-scene renderer calls | Whole-scene renderer triangles |
| --- | ---: | ---: | ---: | ---: |
| normal near | 13,340 | 8 | 15 | 13,342 |
| low near | 4,857 | 8 | 15 | 4,859 |
| normal requested, far effective | 4,264 | 5 | 12 | 4,266 |

The whole scene includes the review's ground and six C4-envelope wireframes. Raw renderer memory includes its own texture count (one); authored P3 source/procedural texture dependencies are zero. Source geometry allocation reports deduplicate shared interleaved attribute arrays. These are fixture measurements with software Chromium, not a combined settlement benchmark, frame-rate claim or device approval. P4/P5 must measure the integrated scene.

PR/head/merge/deployment evidence is supplied with the final delivery metadata; no deployed P3 page or offline closure is claimed.
