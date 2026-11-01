# WV-ART-006 D — acceptance evidence

Scope: original storehouse/warehouse candidates, shared goods and common-space fixtures, display construction, detached storage/trade UI study. No shared-file, runtime economy, simulation, save, road, zoning, household, founded-era or gameplay building-type change. All candidates remain `gallery-review`, `runtimeReady:false`.

## Local checks

Environment: Linux, Node 22-compatible pinned checkout dependencies, Chromium 141 / Playwright 1.56.1. Commands requiring child processes, browsers or localhost sockets ran in the approved executor outside the restricted process sandbox. No dependency/lockfile changes.

| Command | Result |
| --- | --- |
| `node scripts/build-wv006-storage.mjs` | 40 normal/low named asset entries; 20 reusable designs; checkout-only reproduction |
| `node --test tests/wv006-storage.test.mjs` | 5 passed; explicit glTF validator zero errors and warnings; source/output hashes, geometry, real cargo openings, support seats, full goods yard fits/nonintersection/access, policy purity, clean deterministic rebuild |
| `npm test` | 171 passed, 1 skipped, 0 failed |
| `npm run build:assets` | Passed existing validation; no tracked shared artifact changes |
| `npm run build:icons` | Passed; generated icons ignored, not committed |
| `npm run build:offline` | Passed existing self-contained game build; output ignored, not committed; new gallery deliberately not added to offline closure |
| `npm run test:e2e` | 103 passed before the additional late-disposal check; current affected browser suite rerun separately below |
| `WV_RENDERER=three npx playwright test camera-gestures organic-zoning road-3d-drag-fix save-slots organic-lanes --output=test-results-three-parity` | 16 passed |
| `npx playwright test wv006-storage` | 4 passed after the lifecycle addition: root/dev controls, instance counts, policy bounds/gaps, no local-storage writes or remote/POST requests, load failure, sharing, idempotent disposal, no pool growth, delayed load cannot reactivate disposed gallery |
| `node scripts/measure-wv006-storage.mjs` | Completed; captures and machine-readable record in this directory |
| `git diff --exit-code -- assets/ asset-cache.js` before staging task assets | Passed; existing assets/cache unchanged |
| `git diff --check` | Passed |

The PR's current required CI is the final full-suite gate. Its exact head, CI URLs, merge and deployment evidence are recorded in the PR completion record. A passing PR does not itself establish deployment.

## Measured assets

| Candidate | Enclosed shell (m) | Review site (m) | Normal triangles / groups | Low triangles / groups |
| --- | --- | --- | --- | --- |
| Timber storehouse I | 6 × 5 | 10 × 12 | 1,578 / 6 | 654 / 5 |
| Three-bay warehouse II | 10 × 7 | 16 × 15 | 2,238 / 6 | 870 / 5 |

Structural shells and roof/yard/step extents are separate fields. The full entry bounds include the open handling surface, not just enclosed storage. Cargo doors are 2.6 m and 2.4 m respectively with 2.55 m clear height; personnel entry is 1 m wide, 2.1 m high. Supports are checked against actual named local seats. The reference person measures 1.75 m. All placements use uniform 2.8 game units/metre. Output GLB bytes and SHA-256, exact per-entry bounds, roof polygons/overhangs, stair treads/rises, source/license hashes and recipe revision are in `assets/wv/storage-next/manifest.json`.

All 20 designs have normal/low outputs. The textureless bundle uses eight shared palette materials; each asset uses a subset. Original artwork and CC0 evidence are local and require no private source. Geometry is reproducible from committed source and pinned dependencies. Broad historic material treatment is intentionally restrained; there are no baked photographic textures or source archive assets.

## Gallery and unchanged town measurements

Actual records: [measurements.json](measurements.json). Gallery: 600 × 850 CSS viewport, DPR 1. Town baseline: 1440 × 1050, DPR 1. Camera and viewport differ, so these are separate samples.

| Scene | Normal calls / triangles | Low calls / triangles |
| --- | --- | --- |
| Two candidates, empty dressing, people/carts/access guides | 24 / 5,018 | 22 / 2,086 |
| Two candidates, partial dressing, people/carts/access guides | 31 / 6,034 | 29 / 2,758 |
| Two candidates, full dressing, people/carts/access guides | 35 / 7,074 | 33 / 3,598 |
| Existing 30-home baseline, **no D candidates** | 96 / 78,514 | 96 / 55,179 |
| Existing 100-home baseline, **no D candidates** | 98 / 143,766 | 96 / 121,880 |

The existing town baselines satisfy the current <=150/100 draw-call and <=250k/150k triangle guardrails. They are not a combined warehouse/town result. F must measure that composition with its real batching, placement and offline changes. Gallery CPU submission timings are bounded warm Chromium samples, not GPU completion, frame rate, sustained phone performance or thermal evidence. Software-renderer timings cannot establish phone FPS. A single renderer-internal texture is reported despite zero authored asset textures. Low quality removes structural subdivision/detail without shrinking people/doors or silently changing example stock counts.

## Review captures and limitations

- [Both levels](compare.jpg), [level I](l1.jpg), [level II](l2.jpg), [labels and loose goods hidden / roof access](undressed-access.jpg).
- [Detail kit](kit.jpg), [construction demonstration](construction.jpg).
- [Mobile normal](mobile-normal.jpg), [mobile low](mobile-low.jpg), [interactive ledger example](ledger-normal.jpg).

Visual review checked roof/gable closure, bay rhythm, separate personnel approach, frame consistency, real canopy supports, foot contact and reachable cargo edges. Runtime ray probes check the model itself across each loading opening with dressing absent; a metadata-only assertion would not establish an opening. Cargo interiors are shallow recessed presentation volumes, not navigable rooms or per-building inventory spaces. The facade's open leaves are static art. No freight or worker simulation is implied by references.

Public fixtures are individually reusable in open common ground. Their gallery arrangement is a specimen display, not a proposed enclosed plaza. No nature collection or granary redesign is included. The concept sheets for quarry, mill, bakery and trading post contain proposed footprints and input/output intent only.

State safety has two independent forms: the study imports no simulation/save module and its view reducer clones/validates inputs; browser sentinels preserve all local keys and instrument every Storage write while editing all four policies. Existing full game/offline/three-slot tests also passed. The study does not register a service worker or become part of the existing install closure. F must add cold-offline dependency coverage before promoting it.

Future integration remains gated on rotated full-site fit, terrain seats, real cargo routes, capacity/stock source of truth, conservation, save migration, combined-scene performance and physical-device UAT. Existing goods must survive insufficient new capacity. See the D handoff directory for the proposed gameplay contract.
