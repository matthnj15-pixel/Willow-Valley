# A3 meadow study acceptance evidence

Source implementation commits: `0f157f11c973a110d01ff884dbec73edf9ab58d1` (art/fixture recipe) and `d0cce2ce682d8e6b21d676f5a3278f468ad0da0e` (study canvas resize scheduling), from current develop `8055d769df3969b7e49c114a45877205be0aacef`. Documentation/evidence commits do not change the measured renderer. This is a review candidate, not an accepted final composition or gameplay installation. See [integration contract](../../../handoffs/wv006-a/meadow-study.md).

The user prefers A1 over A2 and supplied Foundation screenshots as direction. A1 is restored as the valley default; A2 is retained only as an explicitly selected comparison. The new small study uses brighter varied greens, warm path colour and original curved grass ribbons. Source B/C geometry, plan, doors, props, trees, fences and footprints remain unchanged. Palette comparisons keep identical cameras/geometry/quality/seed. Additional-grass off/on is a distinct cost/appearance comparison. The study's two seed choices change grass/macro colour variation, not B's fixed context layout. Valley comparisons retain their two unchanged generated world seeds.

## Verification commands

- `node scripts/build-wv006-environment.mjs`: pass; deterministic standalone bundle and exact dependency hashes.
- `node --test tests/wv006-environment*.test.mjs`: focused contracts pass, including all normal blade roots, path clearances, low subset, disposal and hash pins.
- `npx playwright test tests/browser/wv006-environment-meadow.spec.mjs --reporter=line`: 4 passed before final denser recipe; the final recipe is covered again by the full suite below.
- `npm test`: 213 passed, 1 skipped, 0 failed after granting build-subprocess execution. The first sandbox run failed three existing packaging/catalog tests with `spawnSync … EPERM`, not assertion regressions. The same tests pass with subprocess access.
- `npm run build:assets`: pass; shared generated assets and `asset-cache.js` byte-identical (`git diff --exit-code -- assets/ asset-cache.js`).
- `npm run build:icons`; `CHECK_BUILT_ICONS=1 node --test tests/icon-artifacts.test.mjs`: pass, 1 icon check passed.
- `npm run build:offline`: pass; existing self-contained game generated locally, excluded from commit.
- Explicit `gltf-validator.validateBytes` on borrowed `buildings-next/catalog.glb` and `landscape-next/landscape.glb`: both 0 errors, 0 warnings. No new glTF is emitted.

Full browser, Three gameplay parity, measurements and captures are recorded below. Exact remote CI/deployment and merge evidence belongs to the PR record, because that evidence is created after this source commit.

## Measured recipe and contact

[recipe-measurements.json](recipe-measurements.json) pins original procedural geometry hashes, bounds, byte counts and contact. Normal: 1,900 instances, 95 triangles / 133 vertices per tuft; low: 595 stable-subset instances, 15 triangles / 25 vertices per tuft. Source geometry is shared by instances, 3,762 / 690 bytes respectively before instance buffers. Maximum measured root-contact error: **0.001849 game units normal / 0.001194 low**, approximately **0.66 / 0.43 mm**. All roots are checked against B's exact displayed triangle height; there are no new terrain heights or detached overlay planes.

The same record includes both valley fixture audits on both display resolutions. Corridors are sampled every <=3 game units at centre and both edges, dry and <=.28 grade. WILLOW-1048 selects centre (715,390), half extent65; WV-SURFACES-2 selects (585,1040), half extent32. These are local five-unit footpaths. The 34-unit main-road shoulders remain an explicitly labelled stress case, not the default cottage path fixture.

## Resource accounting and limits

The study transfers no new image/mesh asset. Its generated field is 2,924,544 bytes normal / 731,136 low, without mips. B's comparison field of equal size remains retained for switching. `textureBytes` in the scene estimator counts the **active** field, so add the inactive field above to estimate both resident comparison fields after toggling; this does not double embedded architecture images per material. Resource lists in the measurement JSONs record HTTP encoded/transfer bytes separately, including the unchanged 7,527,564-byte C catalog and 1,260,580-byte B landscape GLBs. Zero third-party runtime URLs are allowed by browser checks. Geometry is instanced with one added draw pass, no shadow passes, no render targets and no animation timers.

This is a small four-home B/C visual study. It does not prove 30/100-home budgets for the eventual combined F scene. Separate 30/100 records exercise the existing authoritative fixture and unchanged environment factories. All timings are headless desktop SwiftShader comparative frame intervals; they are not physical-phone FPS. The normal/low viewport and DPR are recorded, and low also has fewer, simpler blades and a quarter-size generated field. Hidden/idle checks verify that no draws continue, control builds remain at one, and no camera changes rebuild fields. No game/offline dependency closure is changed; the study itself is not claimed installed/cold-offline-ready.

## Browser preparation failure and rerun

The first local `npm run test:e2e` completed with **133 passed / 3 failed** (10.3 minutes). Those three tests ran before ignored `offline.html` and PWA PNGs had been generated in the fresh worktree: file-URL standalone export, served standalone HTML (404), and installed icon response (404). After the required `build:offline` and `build:icons` commands, `npm run test:e2e -- --last-failed` passed **3/3** (2.0s). No source fix or test expectation change was needed. Every one of the 136 browser cases therefore passes across the full run and its targeted preparation rerun; the full fresh CI command must independently pass before merging. The final grass recipe passed both normal/low paired palettes, all saved study views and guardrails, exact B ground contacts, no idle/hidden draws, one field build, no localStorage writes, missing source and late-load disposal. All original A1/A2 seed/quality views and lifecycle/shader tests also passed.

Captures from that final full run: [normal palette](captures/normal-meadow.png), [same-camera muted context](captures/normal-context.png), [normal grass close-up](captures/normal-grass.png), [low palette](captures/low-meadow.png). These are actual 600x850 CSS mobile-portrait browser runs at device scale2, normal render DPR1.5 / low1, unchanged orthographic geometry. Screenshot pixel dimensions include the browser's CSS canvas scaling; the renderer's backing resolution is reported separately in measurement records.

The required Three gameplay parity selection (`WV_RENDERER=three npx playwright test camera-gestures organic-zoning road-3d-drag-fix save-slots organic-lanes --output=test-results-three-parity`) passed **16/16** (41.7s). The subsequent canvas-resize change is restricted to the optional study wrapper; the affected study browser suite and full unit suite are rerun after it.

## Camera-frame scheduling follow-up

A code review of the first measurements found that the optional study wrapper called Three's canvas size setters on every draw (the existing shared renderer also does this). Commit `d0cce2ce682d8e6b21d676f5a3278f468ad0da0e` restricts the **study** resizing to actual viewport/DPR changes and exposes `viewportResizes`. The full unit suite still passes 213/1 skipped; all four affected browser checks pass again (29.7s), including no resize count changes while switching saved cameras. The shared renderer is untouched. Original study timings are retained under `measurements/pre-resize`; final study timings use the corrected wrapper. This avoids redundant work but does not establish a substantial speedup on this software renderer; the added grass still has a measured cost.

## Comparative frame intervals

Serial headless Chromium 141 / SwiftShader runs, CSS viewport 600x850, eight seconds recorded after two seconds warmup, fixed `meadow-orbit-v1` or `orbit-v1` paths. Normal DPR1.5, low1. Small sample counts and software-renderer scheduling limit timing conclusions. Median/p95 are milliseconds between camera-driven frames, not a physical-device FPS claim. Peak calls/triangles are actual renderer counters along the orbit; framerate-dependent sampling can vary which source batches enter the peak. Static paired screenshots keep exact saved camera values.

| Study | Grass | Calls | Triangles | Median ms | p95 ms |
|---|---|---:|---:|---:|---:|
| normal context | off | 35 | 32,301 | 316.7 | 350.1 |
| normal context | on | 35 | 209,593 | 466.6 | 533.3 |
| normal meadow | off | 35 | 32,301 | 316.7 | 350.1 |
| normal meadow | on | 35 | 209,593 | 450.0 | 483.3 |
| low context | off | 34 | 18,786 | 183.3 | 699.9 |
| low context | on | 35 | 27,711 | 183.4 | 216.7 |
| low meadow | off | 34 | 18,786 | 166.7 | 183.4 |
| low meadow | on | 35 | 27,711 | 183.3 | 200.0 |

At the selected sunlit palette the measured median increases from 316.7 to 450.0 ms with normal grass, and 166.7 to 183.3 ms in low. This is an expensive software-renderer prototype; it is **not performance-approved** for adoption. Low substantially reduces added geometry (180,500 to 8,925 triangles), field memory and measured cost. Current static-view browser checks cover all study saved views and remain <=150/100 calls and <=250k/150k triangles; orbit counters above cover a different camera range. Both guardrails pass, but counts alone do not certify responsive rendering.

| Homes | Quality | Factory | Calls | Triangles | Median ms | p95 ms |
|---:|---|---|---:|---:|---:|---:|
| 30 | normal | A1 | 97 | 78,516 | 383.3 | 500.1 |
| 30 | normal | A2 | 97 | 78,516 | 416.6 | 583.2 |
| 30 | low | A1 | 97 | 55,181 | 183.4 | 216.7 |
| 30 | low | A2 | 97 | 55,181 | 200.0 | 250.0 |
| 100 | normal | A1 | 99 | 143,768 | 516.6 | 650.0 |
| 100 | normal | A2 | 99 | 143,768 | 583.3 | 716.5 |
| 100 | low | A1 | 97 | 121,882 | 300.0 | 366.6 |
| 100 | low | A2 | 97 | 121,882 | 316.7 | 399.9 |

The separate unchanged 30/100-home fixtures pass the same normal/low count budgets and preserve A1/A2 silhouettes. They do not contain the meadow study or combined new B-D buildings. Their visibly slow software intervals confirm the historical limitation; no phone performance is inferred.

Final study records pin the actual resize-fix commit; the recording command's manually entered revision label was corrected against `git rev-parse HEAD` before publishing. Geometry/fixture and original timing records pin the original art implementation. No timing values were edited.

The exact changed files are listed in [changed-files.txt](changed-files.txt). Only the exclusive A paths change; shared generated artifacts and all B/C assets remain byte-identical.

Measurement reproduction (serve the checkout on port4173 first):

```sh
node scripts/measure-wv006-environment.mjs http://127.0.0.1:4173 docs/testing/wv006-a/meadow-study/measurements d0cce2ce682d8e6b21d676f5a3278f468ad0da0e --meadow
node scripts/measure-wv006-environment.mjs http://127.0.0.1:4173 docs/testing/wv006-a/meadow-study/measurements 0f157f11c973a110d01ff884dbec73edf9ab58d1
```

Use a clean output directory to retain the committed historical records. The second command exercises unchanged A1/A2 fixtures.
