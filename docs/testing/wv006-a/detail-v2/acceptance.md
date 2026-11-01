# A2: fine surface detail acceptance evidence

The user rejected A1's coarse, blurry surface treatment. A2 changes the material scale, source resolution and normal-based relief. It does not claim to fix legacy tree proxies, coarse terrain silhouettes or another owner's architecture UVs. All candidates remain gallery-review, runtimeReady:false; F owns shared adoption and final composition/device/offline gates.

Review: https://matthnj15-pixel.github.io/Willow-Valley/dev/ui-kit/wv006-environment.html?view=ground&motion=off . Select **Published A1** / **Fine-detail A2** to keep the current camera identical. The game surface is also available. Close-building and ground-inspection presets now show genuine close orthographic views; the old close preset had been clamped to a town view. The close inspection adapter reuses existing trackball math and directions with a smaller gallery-only zoom floor. Shared game gestures remain untouched.

## Visual evidence

- Ground, same camera/viewport/quality: [published](captures/published-ground.png) / [detailed](captures/detailed-ground.png). A1's enlarged, blurred leafy patches become smaller, resolved grass/soil texture.
- Rock, same camera/viewport/quality: [published](captures/published-rock.png) / [detailed](captures/detailed-rock.png). The flat procedural grade becomes chipped mineral structure with face-appropriate projection and normal relief.

These are unretouched Chromium screenshots, not generated concept art or human acceptance. Ground captures use 1000×850 CSS / DPR 1; rock 1100×1000 / DPR 1. Both use the unchanged source models, terrain, road coverage and daytime preset. Source pixels remain original, locally licensed derivatives. Two real rendered-pixel tests prove light/haze response and normal-map contribution. Low omits all normal-map requests/shading, with smaller colour maps at the same physical repeat scale.

## Verification

- `node scripts/build-wv006-environment.mjs --import-textures /tmp/wv006-detail-source`: passed publisher MD5/byte verification, derived seven local images and recorded actual source/output SHA256s. No raw source images or archive were committed.
- `node scripts/build-wv006-environment.mjs`: passed; regular build downloads nothing. Dependency record includes all derived images, source modules and borrowed assets/license evidence.
- `npm run build:assets`, `npm run build:icons`, `npm run build:offline`: passed. No new glTF is emitted. Existing explicit study/catalog validators report zero errors/warnings. Shared game offline HTML remains 1,227,427 characters; generated output is not committed.
- `CHECK_BUILT_ICONS=1 npm test`: **193 passed**, zero failed/skipped. Includes derivative hashes, actual image dimensions/format, reduced low resource path, read-only inputs and lifecycle ownership.
- Scoped browser pass: initial ten gallery/lifecycle/budget tests passed; additional rendered normal-data/fallback checks passed; the close wheel/touch test passed. The full current suite and parity are repeated before merge; completed final results/CI are recorded on the delivery PR.
- The first icon-aware invocation in the new worktree ran before generating its icons and failed only the missing-icon prerequisite. The build-first rerun above passed. No unrelated generated asset was committed.

Full gallery checks cover two seeds, normal/low, identical A1/A2 cameras, ground/building close-ups, wide/low/high pitch, forest/cliff/junction/lake/river, unchanged state serialization, hidden/low idle pause, missing colour and normal resources, late loads after disposal, repeated worlds/resource stability, texture-memory and 100-home draw/triangle budgets. Paired views require no shader errors or external runtime requests. New control grids still build only on world/visual-input changes. Shared modules, simulation, all three slots, migration and game input remain unchanged.

## Measured cost

Rendering/material source: `547638dc3b1383e15c8ba82fa5a1de62dee97ea2`. Subsequent changes add inspection input handling, tests, UI copy and evidence; the measured material shaders, assets, camera path and world/settlement fixtures are identical. Each raw JSON records that reproducible source revision. No other local browser/unit workload ran during the serial measurements.

Command: `node scripts/measure-wv006-environment.mjs http://127.0.0.1:4173 docs/testing/wv006-a/detail-v2/measurements 547638dc3b1383e15c8ba82fa5a1de62dee97ea2`. Pairs use the same viewport 600×850 CSS, canvas 574×580, DPR 2, render DPR 1.5 normal / 1 low, orbit-v1 path, two-second warmup/eight-second sample and motion off. Raw JSON includes the renderer, user agent, browser version, timestamps, transfer and decoded estimates. This is **SwiftShader smoke evidence, not phone FPS or thermal acceptance**. A2 is slower here; no 30 FPS claim is made.

| Homes / quality | Median ms, A1→A2 | p95 | p99 | Calls A1/A2 | Triangles A1/A2 | A2 total texture bytes |
| --- | --- | --- | --- | --- | --- | --- |
| 30 / normal | 366.7 → 416.7 | 483.2 → 583.3 | 483.4 → 583.3 | 97 / 97 | 78,516 / 78,516 | 36,755,456 |
| 30 / low | 183.2 → 199.9 | 200.1 → 250.0 | 216.7 → 266.6 | 97 / 97 | 55,181 / 55,181 | 24,141,836 |
| 100 / normal | 516.6 → 583.3 | 633.4 → 699.9 | 633.4 → 699.9 | 99 / 99 | 143,768 / 143,768 | 36,755,456 |
| 100 / low | 300.0 → 316.6 | 366.7 → 366.7 | 366.7 → 366.7 | 97 / 97 | 121,882 / 121,882 | 24,141,836 |

Calls and triangles are identical across every pair. Normal ≤150 calls/250k triangles and low ≤100/150k pass. Total textures stay under the existing 48 MiB scene guardrail. These fixtures use existing architecture-v1; they are not a combined B/C/D scene or an installation claim.

Normal encoded image bodies: **2,306,085 bytes** (six images); low: **163,529** (three). Decoded RGBA/finite-mip sum: **15,728,632 normal / 3,145,724 low**, plus the same control grids. Source hashes and derivative dimensions/format are in [detail-manifest.json](../../../../assets/wv/environment-next/detail-manifest.json); [quality, reproduction, license and factory contract](../../../handoffs/wv006-a/detail-v2.md). The larger normal textures are a deliberate fine-detail tradeoff. The small rock pair costs 232,534 encoded / 1,747,624 mip bytes, with a separate 18,629-byte low albedo. All are shared per factory, not duplicated per mesh/material. Normal maps are linear data; albedos are sRGB.

Physical-phone/WebKit compilation, sustained device timings, extreme oblique shimmer review and final visual acceptance remain pending. The playable renderer, shared offline manifest and source architecture/landscape geometry are unchanged. New texture/detail content is not claimed installed or cold-offline-ready; F must select and verify the dependency closure and combined scene.
