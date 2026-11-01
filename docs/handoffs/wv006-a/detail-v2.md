# A2: fine surface detail revision

A1's broad-scale blend softened the grass and soil, and its procedural cliff grade lacked mineral structure. The user rejected the coarse, blurry result. A2 keeps the same terrain/road/water geometry, camera type, simulation, saves, source models and atmosphere while correcting surface scale and relief. It remains gallery-review, runtimeReady:false; F owns shared adoption. The review still contains unchanged legacy tree proxies and angular terrain silhouettes. These require their owners' geometry/adoption work; texture changes do not repair silhouettes or the existing architecture's UVs.

## Factory and quality changes

The existing `createEnvironmentMaterials` factory/API is retained. `setWorld`, `setVisualInputs`, `sample`, `advance`, `pause`, `attachAtmosphere`, `status` and `dispose` keep their A1 responsibilities. `surfaceTexturesExpected` now states the readiness target: **6 normal / 3 low**. Callers must compare loaded with expected (and handle failed) instead of hard-coding two textures. `normalMaps` reports configured slots, not successful loads. One registry/uniform set is shared across all materials; none of the full images are duplicated per material.

`environment-next/detail-resources.mjs` exports the authored material-scale preset: grass 8.4 game units (3 visual metres) per repeat, soil 7 units (2.5m), rock 5.6 units (2m). These are art choices, not measured source-scan extents. A1 repeated grass over 24 units (~8.6m), soil over 21 (~7.5m) and blended grass with a second 63-unit photograph, washing out detail. A2 uses macro colour from the read-only control field and retains the fine albedo. Roads and terrain use the same repeat periods.

Normal uses 1024px grass/soil albedos, a 512px rock albedo, linear 512px grass/soil OpenGL normals and a linear 256px rock normal. Relief uses a cotangent frame following the rendered face/projection, with no geometry displacement, new heights or collision changes. Steep rock blends the two vertical projections; a continuous world-space UV warp reduces repeated tile columns. It has no foliage albedo. Normal anisotropy is 8, clamped by Three.js to device capability. Low uses the original 512px grass/soil albedos and a 256px rock image, the same physical repeat periods and anisotropy 4; it omits normal-map fetches/shading, uses a single dominant rock projection, retains smaller controls and has no idle water/cloud requirement.

Normal terrain generally uses two albedos, two controls and two normal samples. Fully steep faces take the rock path with two albedo/two normal samples, skipping ground/control fetches. Transition faces blend both treatments and cost more. Normal roads add the soil normal; water is unchanged. Low terrain uses two albedos/two controls, with no normal samples; low rock uses one albedo. This is a higher-detail candidate with measured extra memory/transfer/shader cost, not a claim of phone FPS.

Decoded RGBA/mip estimates (exact finite mip sum): **15,728,632 bytes normal**, **3,145,724 low**, plus the unchanged control grids. Normal encoded image bodies total **2,306,085 bytes**. Low borrows the two original JPEGs (144,900 bytes) plus rock-low (18,629), total **163,529 bytes**. The new rock albedo+normal total 232,534 encoded bytes / 1,747,624 decoded mip bytes; low rock is 18,629 / 349,524. Normal-map PNGs are lossless derivatives to avoid additional block artifacts in the directional data. Shared resource accounting includes the textures in uniforms.

## Reproducible source and output provenance

All three materials are CC0 Poly Haven sources. `assets/wv/environment-next/detail-manifest.json` records publisher URLs, metadata hashes, expected publisher MD5/byte counts, actual acquired source SHA256 and derivative SHA256/bytes. `LICENSE.txt` records the scope and license URLs. Source images are not committed. Normal colour maps are sRGB; normals are data with NoColorSpace. Existing environment-v1 derivatives are unchanged.

For each manifest source, download its `sourceURL` to `SOURCE_DIRECTORY/{grass,dirt,rock}-{color.jpg,normal.png}` and the asset `/files/` metadata to `{grass,dirt,rock}-files.json`, then run:

```sh
node scripts/build-wv006-environment.mjs --import-textures SOURCE_DIRECTORY
```

The import verifies publisher MD5/bytes before producing the pinned-sharp derivatives. Regular `node scripts/build-wv006-environment.mjs` rebuilds the review bundle/dependency hash record from committed derivatives **without downloading**. No texture is fetched from a third party at runtime. No private archive, new npm dependency or paid API is needed. The exact source acquisition in this revision used `/tmp/wv006-detail-source`.

## Comparison and adoption

The treatment selector now includes **Published A1**, **Fine-detail A2**, and the unchanged **Shared game surface**. The frozen A1 shader is `previous-materials.mjs`. These choices keep geometry, models, viewport, quality, sky/light setup and saved camera identical for the A1/A2 comparison. The new close-building and ground-inspection presets use `setCamera` for a genuine close orthographic view; the old close button had been clamped to the game's town-wide minimum. Ground inspection may set a local camera focus height; normal saved views reset it to 17. The game's renderer and gesture controller are unchanged. The gallery-only inspection adapter reuses the existing trackball helper and single-drag directions, extending its close zoom floor to six game units so wheel/pinch do not snap back to town scale. Town-scale gestures continue through the existing controller. This is not a shared gesture patch. The page starts with the close comparison instead of the wide low-detail panorama.

F's import is unchanged (`environment-next/materials.mjs`). F adds the **selected quality's** local image/module closure to shared hosting/offline manifests, updates readiness to `surfaceTexturesExpected`, disposes the shared registry and attaches/detaches atmosphere as in A1. Do not install the frozen comparison shader or review bundle in gameplay. The review is not claimed cold-offline-ready. B/C's revised assets are not adopted into the shared game by this revision, and their geometry/UV files are not edited.
