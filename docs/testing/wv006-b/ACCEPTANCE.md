# WV-ART-006 B — measured acceptance

Baseline: fetched `develop` at `5e39c72ff5e205dea166fa18febdfa89aaa5aec8`. Work is isolated on `feat/wv-art-006-b-landscape`; main is untouched. Review: https://matthnj15-pixel.github.io/Willow-Valley/dev/ui-kit/wv006-landscape.html

## Reproducibility and asset validation

`node scripts/build-wv006-landscape.mjs` generated 20 original forms, each with normal/low/far geometry. Two consecutive builds produced byte-identical GLB and manifest. Explicit glTF validation in `tests/wv006-landscape.test.mjs` reports zero errors and zero warnings, verifies every exported variant's triangles and bounds, hashes the output/source recipes, and confirms opaque materials and zero textures. The existing asset validator does not discover the new directory; the focused test is required.

GLB: 1,111,848 bytes; SHA-256 `c4f2ae19129e7ad2a065dfc85b577e83676cc8f455ea15a002497bce1614e36b`. Manifest/source hashes are in the committed manifest. Texture download/decoded memory: **0 bytes**. Two shared matte materials at normal; one submitted material at low/far. One mesh/material group per form/LOD; repeated clusters use instancing. No source archive or external artwork input. License/provenance is original project geometry in the hash-pinned recipe, with no third-party license being claimed.

| Form | Normal / low / far triangles | Normal full bounds X × Y × Z (visual m) |
| --- | ---: | --- |
| Spreading oak | 784 / 220 / 140 | 7.868 × 8.017 × 7.952 |
| Upright beech | 784 / 220 / 140 | 5.581 × 9.664 × 5.698 |
| Open birch | 784 / 220 / 140 | 7.273 × 8.496 × 7.363 |
| Tiered pine | 100 / 68 / 44 | 5.862 × 10.505 × 5.773 |
| Young oak | 784 / 220 / 140 | 2.989 × 3.408 × 3.049 |
| Young pine | 100 / 68 / 44 | 1.876 × 3.366 × 1.847 |
| Hazel stool | 432 / 160 / 160 | 2.229 × 1.826 × 2.091 |
| Low thorn | 324 / 120 / 120 | 2.229 × 1.503 × 2.032 |
| Broken hedgerow | 540 / 200 / 200 | 3.927 × 1.826 × 1.359 |
| Fern rosette | 81 / 45 / 45 | 1.433 × 0.503 × 1.450 |
| Fine grass tussocks | 57 / 21 / 21 | 1.206 × 0.333 × 1.112 |
| Sparse cream flowers | 110 / 81 / 81 | 1.181 × 0.530 × 1.086 |
| Sparse mauve flowers | 110 / 81 / 81 | 1.181 × 0.530 × 1.086 |
| Reeds | 109 / 53 / 53 | 1.228 × 1.404 × 1.302 |
| Rushes | 57 / 21 / 21 | 1.206 × 0.832 × 1.170 |
| Small bank stones | 320 / 80 / 80 | 1.029 × 0.334 × 0.499 |
| Rounded boulder | 80 / 20 / 20 | 2.600 × 1.820 × 2.080 |
| Layered outcrop | 240 / 60 / 60 | 3.986 × 1.310 × 2.495 |
| Cut stump | 168 / 120 / 120 | 1.329 × 0.731 × 1.328 |
| Fallen log | 84 / 60 / 60 | 3.624 × 0.860 × 0.606 |

## Placement and lifecycle evidence

Six focused Node checks cover frozen input fixtures and serialized equality; stable seed/order/camera results; changed seed; polygon/corridor/point exclusions; doors, loading, stairs, fields, water, yards and overlays; preserve semantics; spatial-query locality; displayed terrain height, wet/dry banks, moisture and slope rejection; rigid-log contact; normal/low/far primary tree identity; relevant scene/sampler revisions; repeated shared-resource batching and idempotent disposal. The repeated-cluster fixture submits 500 grass clusters through one instance batch. Young forms remain explicit assets, not replacements for mature authoritative tree candidates.

Browser coverage exercises all six review compositions, individual form focus, normal/low and near/far, primary tree identity, actual raycast contact against the displayed triangulated terrain, no camera-triggered rebuild, resource counts after repeated scene changes, missing collection failure, local-only requests, root/development imports and 30/100-home composition budgets. These tests use rolling terrain and a shore boundary, not just a flat plane.

## Performance scope and results

See [measurements.json](measurements.json) and the scene captures in this directory. The instrumented scene includes current architecture-v1 homes, all seven facility contexts, B landscaping, ground and a person. It does **not** include every gameplay road, overlay, foundation or surface-material pass. This is evidence for the candidate's cost in a populated composition, not a claim that F's combined scene passes its budgets. Existing whole-scene tests remain required separately. The candidate fallback list is reported; F must retain existing permitted tree presentation on candidate rejection. The review does not render that fallback set.

Cloud Chromium, 600 × 850 CSS viewport, DPR 1. Capture-host load was uncontrolled and other browser checks overlapped the capture; submission times are indicative only. Draw/triangle/texture counters are the deterministic cost evidence. Desktop/software-renderer submission timings are recorded as such. They cannot establish physical-phone FPS or thermal behavior. Texture bytes in composition measurements belong to existing building context assets; the B collection adds zero.

| Homes | Quality / detail | Instances | Calls | Triangles | B call / triangle delta |
| ---: | --- | ---: | ---: | ---: | ---: |
| 30 | normal / near | 520 | 64 | 109,098 | +7 / +73,010 |
| 30 | normal / far | 88 | 61 | 45,144 | +4 / +9,056 |
| 30 | low / near | 222 | 64 | 54,114 | +7 / +18,026 |
| 30 | low / far | 88 | 61 | 45,144 | +4 / +9,056 |
| 100 | normal / near | 1,447 | 59 | 222,128 | +7 / +125,620 |
| 100 | normal / far | 71 | 56 | 104,336 | +4 / +7,828 |
| 100 | low / near | 525 | 59 | 120,418 | +7 / +23,910 |
| 100 | low / far | 71 | 56 | 104,336 | +4 / +7,828 |

The original 6-unit cover lattice exceeded the normal 100-home triangle budget (375,739). The shipped 10-unit jittered lattice reduces small clusters while retaining the same broad patch/gap pattern. Both quality tiers now pass the scoped <=150/100 call and <=250k/150k triangle thresholds. No tree seed, saved terrain, road, structure or simulation field was changed for this correction.

## Commands and results

- `node scripts/build-wv006-landscape.mjs` twice: reproducible GLB/manifest.
- `node tests/wv006-landscape.test.mjs`: six focused checks pass, including explicit new glTF validation.
- `npm test`: 173 passed, one skipped (174 total). The first sandbox run hit EPERM in an existing child-process packaging check; rerunning with process access passes.
- `npm run build:assets`: passes, all discovered existing GLBs zero errors/warnings; no tracked regenerated changes.
- `npm run build:icons`: passes.
- `npm run build:offline`: passes; existing self-contained game produced. New B page is not asserted installed/offline-ready.
- Focused Chromium review suite: seven checks pass, including representative raycasts for every present form and explicit missing-GLB failure. The first exhaustive diagnostic exceeded its 20-second test allowance; the shipped diagnostic bounds its samples and uses a 60-second allowance for the multi-scene lifecycle check.
- `PLAYWRIGHT_BROWSERS_PATH=/workspace/pw-browsers node scripts/measure-wv006-landscape.mjs`: eight normal/low near/far measurements and six composition captures. Run against `python3 scripts/serve-preview.py`; `WV_PREVIEW_ORIGIN` can select another local origin.
- Full `npm run test:e2e` and `WV_RENDERER=three npx playwright test camera-gestures organic-zoning road-3d-drag-fix save-slots organic-lanes --output=test-results-three-parity`: results appended after completion.

## Remaining integration limits

The page and collection are gallery-review only. No global registration, renderer change, tool, economy or save migration is included. F supplies exact transformed building/access/water/editing exclusions and sampler revisions, retains protected/authoritative woodland and current permitted fallbacks, performs combined-scene/async/context-loss checks, admits the offline dependency closure, and verifies physical devices. Rigid prop probes are a conservative grid with documented gap tolerances, not arbitrary terrain deformation. Geometry is opaque and intentionally restrained; human visual approval remains required.

See [the integration contract](../../handoffs/wv006-b/INTEGRATION.md) for the complete API, dependency list and ownership rules. Exact changed-file list is in `docs/handoffs/wv006-b/CHANGED-FILES.txt`. PR head, merge SHA, CI and Pages evidence are delivered in the PR/final execution record; do not infer deployment from a merge alone.
