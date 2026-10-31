# Codex Handoff | WV-ART-003 Terrain, Water, Roads and Surface Materials

**Date:** 2026-10-31
**Base:** latest \`develop\`, starting from the merged research document at \`docs/design/WV-ART-003-natural-terrain-water-roads.md\`.
**Workstream:** visual environment surfaces, separate from building kits, licenses and scale normalization.
**Goal:** upgrade the *playable opt-in Three.js* landscape from broad flat-green/tan/blue materials into a cohesive, textured low-poly inhabited valley, while preserving geometry, roads, simulation and saves.

## Required first reads

1. \`docs/design/WV-ART-003-natural-terrain-water-roads.md\` (primary technical research, source citations, choices, risk constraints and UAT).
2. \`docs/design/WV-ART-001-seamless-3d-world.md\`.
3. \`docs/design/WV-ART-002A-three-mobile-adr.md\` and \`docs/testing/WV-57-environment-performance.md\`.
4. \`world-gen.mjs\`, \`terrain-surface.mjs\`, \`road-junctions.mjs\`, \`road-surface.mjs\`, \`game-3d-mesh.mjs\`, \`world-renderer-three.mjs\`, \`ui-kit/render-3d.mjs\`.
5. \`scripts/build-asset-cache.mjs\`, \`sw.js\`, existing browser/offline/terrain contact tests.

**Do not restart the terrain geometry engineering.** We have already fixed exact displayed-triangle road contact, slopes, wet-road rejection, intersection polygons, editor handles and foundations in #56. Reuse them.

## Approved aesthetic direction

Naturalized, warm, matte, earthy landscape. Grass with fine soil and sparse plant detail; soil near worn roads; grassy shoulders that break up the straight tan strips; rock on real steep slopes; a damp bank around existing water; shallow blue-green water, restrained specular detail and subtle river current.

Show every material at the camera scale of the current cottages and the approved lumber camp. The new models being licensed in the **other Codex workstream** may change, but geometry scale and lighting should remain compatible.

## Implement in milestones, not one rewrite

### S1: Surface material infrastructure

- Add local CC0 source asset entries, exact publisher URLs/licenses, SHA256 and derivative hashes. Prefer verified **Poly Haven** and **ambientCG** candidate pages from WV-ART-003. Source pages are researched; **the actual texture files have not yet been acquired or verified**. Download exact files, inspect and optimize; do not invent file URLs or licensing details.
- Create a reusable material/texture registry with correct sRGB albedo versus linear data masks, mipmapping and safe disposal.
- Apply a real tileable grass albedo to the **existing** ground geometry, with deterministic world-space tiling, smooth macro variation, and no checkerboard tile artifacts.
- Keep \`?renderer=three\` opt-in and a working WebGL/native fallback, with no asset request to a third-party server at runtime.
- Demonstrate before/after in controlled screenshots. PR, run tests, self-merge to \`develop\`.

### S2: Terrain classification, slope and soil

- Layer the meadow with soil and stone using terrain slope, height, shore distance and seeded woodland proximity. Start 2 albedos and measure; only add a third/normal layer after validating visual value and mobile cost.
- On steep inclines, prefer triplanar *only as an optional selective cliff treatment*; do not triplanar-sample every pixel of the meadow.
- Use actual committed farmland when displaying cultivated ground, not zoning previews or invented crop ownership.
- No changes to \`world.sample\` suitability, surface height, save slots or road authoring.
- Provide high/low pitch, close/far and two world-seed captures. PR and CI.

### S3: Roads, local lanes and shoulders

- Render dirt with soil/stones on existing contact-following road and junction surfaces.
- Break up the road-to-grass edge with narrow seeded shoulder transitions, while preserving exact pavement polygons and avoiding translucent z-fighting halos.
- Visually distinguish main collectors, narrow internal lanes and desire paths by texture weight and subtle wear, **without adding new road types or altering widths/costs/logic**.
- **Important interface:** index 5 in \`world-renderer-three.mjs\` currently combines roads, paths, plaza grounds and various surface geometry. Do not assign a single dirt texture blindly to all of them. Carry explicit lightweight material semantics via focused new buffers/categories or data attributes. Preserve original interleaved vertex format for callers that depend on it.
- Verify curved roads, short segments, 3- and 4-way intersections, hills, older saves, near-water road alignment and all edit gestures. PR and CI.

### S4: Water and banks

- Use existing water polygons, type and level, not a rectangular replacement plane.
- Differentiate shallow/deep water with a soft visual transition, muted blue-green tone and slightly richer banks. Add subtle, directionally plausible river motion and almost-still lakes with a low-cost locally bundled noise/normal source or equivalent shader.
- Derive bank distance/flow controls **once per world**, never recalculate analytic river distance per fragment; no simulation water changes.
- Do **not** deploy Three.js Water2 reflector/refraction render targets as a baseline. Keep textures bounded and animation stable. Pause while hidden.
- Screenshots of wide lake, narrow stream, jagged edge, near-shore slope; test extreme low pitch and pinch zoom. PR and CI.

### S5: Integration, performance, documentation and real-device UAT gate

- Add comparison scenes/fixtures in a UI Kit environment gallery without replacing the playable game's renderer.
- Maintain 30/100-home normal/low benchmark integrity, compare with the previous development baseline at the **same** viewport/seed; record draw calls, triangles, texture bytes, frame median/p95/p99, and device/render string. Do not claim phone performance from software rendering.
- New texture input/derivative/license manifest included in the PWA's pinned SHA256 package and integrity install; complete clean offline relaunch/root and \`/dev/\` without ever opening a gallery first.
- Run \`npm run build:assets\`, \`npm test\`, \`npm run test:e2e\`, \`WV_RENDERER=three\` gesture/road/zone/save parity, and offline/icon builds.
- Update a dedicated \`docs/testing/WV-ART-003-uat.md\` with screenshots, measurement method, exact commits and unresolved findings. Stop for real iPhone Duo art/performance acceptance. Do not auto-promote Three.js to default.

## Parallel safety contract

The building Codex stream is responsible for **model assets, license acquisition, buildings, human scale, and architectural silhouettes**. This Codex stream is responsible for **terrain textures, road appearance, water shaders, and rendering-only classification**.

The shared \`world-renderer-three.mjs\` should be edited in short, additive integration slices. Rebase/check \`develop\` immediately before touching it or opening a PR, since building work may be landing. Do not edit other workstream's GLBs, authoring scripts or building placement; do not change economics, terrain generation contracts, save format or main.

Codex may self-merge passing dev PRs; the user handles promotion to \`main\`.

## Acceptance examples

1. At low camera angle near the screenshot's broad lake, I can distinguish grassy land, earthy road, damp bank and water without hard blue polygon shapes dominating the scene.
2. Near a curved road junction, dirt/grass transition looks natural and all ribbon vertices still hug the current hill surface.
3. At an irregular cottage parcel, roads and footpaths retain known entrances and do not become artificially straight grids.
4. At a cliff, stone appears aligned to real slope and does not smear into long texture streaks.
5. The same save/world seed looks consistent across restarts and across camera pitch, with no texture swimming or jitter.
6. Normal and low quality work offline and preserve all save slots. Tests and phone measurements are documented separately.

**Proceed through S1-S4 autonomously with small PRs to develop; request human art/performance UAT after S4. Never claim completion based only on unit tests or distant benchmark screenshots.**
