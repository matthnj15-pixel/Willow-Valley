# WV-ART-003 | Terrain, road, shore and water surface specification

**Status:** implementation-ready research and visual specification, not shipped code.
**Research and repository audit:** 2026-10-31. **Baseline:** `develop` at `f1d5be6cd7590435e03eca4b0abdf6a979ffcca1`.
**Owner:** Codex environment rendering track. Independent of WV-ART-002C building asset licensing and architectural-scale work.
**Review evidence:** user iPhone Safari 3D captures on October 31, 2026; current source code; primary engine documentation and texture publisher/license pages below.

## 1. Problem and desired experience

The current Three.js playable settlement has viable world geometry, roads, buildings and vegetation, yet its ground is visually broad green, roads are uniform tan ribbons, and water is opaque blue polygonal geometry. Close camera angles expose hard color boundaries, repeated triangular patches and a featureless water surface. The objective is an inhabited, cohesive, early-settlement landscape, compatible with the restrained illustrated/low-poly architecture of Foundation / Outlanders 2 rather than attempting photogrammetric realism.

**Target:** a player sees recognizably grassy meadows, darker wooded soil, worn compacted road centers, softened dirt/grass shoulders, stony slopes, and convincing lake and river banks with shallow-to-deep color, subtle flow and highlights. Texture scale must work at a cottage door and at neighborhood zoom. Buildings must remain visually dominant and roads legible.

**Explicitly outside scope:** building model import, human/model scale, new natural river paths, terrain shape generation, new water/bridge mechanics, new road types, pathfinding, simulation state, seasonal cycles, weather system, saving textures into game slots, expensive water reflections, volumetric simulation, night/day loop, or production promotion. Another Codex stream may work on buildings concurrently.

## 2. What the current engine really does

| Area | Actual code | Consequence |
| --- | --- | --- |
| Ground | `world-gen.mjs::createWorldMesh`, positions/normals/colors, nine floats per vertex. The `coherentMeadow` setting replaces cell checkerboard with modest smooth vertex tint. | No tiled albedo, macro variation material or believable ground relief at fine scale. Changing height generation is unnecessary. |
| Water | `world-gen.mjs::waterPolygon` clips cell triangles to water masks; emits vertex color and water-surface height. `world-renderer-three.mjs::material(index)` renders water through the same color-only shader as the terrain. | Flat opaque cyan/blue with hard polygon boundaries and no translucent shallow zone. |
| Roads | `road-junctions.mjs::roadJunctionPolygons` returns trimmed surface and shoulder polygons. `game-3d-mesh.mjs` passes them through `groundPolygon` / `terrainRibbon` with flat tan and olive colors. | Geometrically terrain-following, but not visually integrated with the surrounding ground. |
| Water/world geometry contract | `terrain-surface.mjs::createTerrainSurface` recreates *exact* render mesh diagonals and exposes `sample`, `contactTrace`, `drapePolygon`. | The contact adapter is already correct and must be preserved; do not make an independent textured heightfield. |
| Renderer | `world-renderer-three.mjs` has one generic `ShaderMaterial` factory for buffer indices, receives interleaved position/color/normal via `presentation.upload`. Index 0 = ground, 1 = generated water; 5 = ground-contact roads/paths/plaza, 6 = zone overlay, 7 structures, 8 editor guides. | **Material dispatch by index** is the natural integration seam. Keep the existing `mountWorld3D` controller and raycast terrain mesh. |
| Native fallback and world lab | `ui-kit/render-3d.mjs` uses custom WebGL shader with color-only geometry and optional external Kenney references. The World Builder also mounts that renderer. | Three.js surface upgrade should remain opt-in initially. Legacy WebGL must remain playable and continue meeting save/offline expectations. Clearly distinguish paths in docs/UI. |
| Asset cache | `scripts/build-asset-cache.mjs`, `asset-cache.js`, `sw.js` pinned SHA256/byte-checked installs and versioned cache. | Any approved texture must be local, explicitly bundled, hashed and available for airplane-mode cold launch. |
| Performance | `docs/testing/WV-57-environment-performance.md` records ~98 draw calls / 144k triangles and ~21MB estimated texture bytes in the 100-home normal-quality fixture; desktop SwiftShader already misses target frame pacing. | Favor limited shader samples and shared atlases. Do not assume a desktop screenshot or GPU budget proves iPhone frame rate. |

The screenshot's hard shapes have multiple causes: geometry from `waterPolygon`, solid vertex colors from both terrain/water materials, and the flat colors of `roadJunctionPolygons` contact polygons. Texture sampling alone cannot round shore geometry, but water-edge color/foam/vegetation can visually soften it without changing dry/wet topology.

### Strict separation of truth

- `world.sample(x,z)` is authoritative for terrain height, lake/river water flags, building/road eligibility, and deterministic world-generation values.
- `createTerrainSurface` is authoritative for the **displayed height** of every road, foundation, shoulder and terrain hit test.
- New terrain classification, texture weights, shore-distance fields, flow direction and road wear patterns are **presentation-only derived data**. Never write them into `state`, save slots, road graph, world options or monthly simulation.
- Texture changes may not alter vertex position, world dimensions, terrain triangle diagonal, road footprint, lane path, site suitability, road cost or collider/picking.

## 3. Candidate techniques and selection

| Technique | Visual payoff | Complexity and mobile cost | Decision |
| --- | --- | --- | --- |
| Single repeated grass texture | Removes solid-green appearance; authentic microdetail | Low sampling and pipeline risk; may repeat visibly | **First baseline** on the exact terrain mesh |
| Controlled two/three-way splat using classification, slope and moisture | Grass, dirt, stone blend without square cells | Moderate sample cost, new control attributes/texture | **Preferred normal-quality implementation**; start 2 materials, expand if measured |
| World-space UV projection | Texture scale does not stretch when terrain is tessellated | Cheap on gently sloped surfaces | **Use for meadows and road surface** |
| Triplanar projection for steep cliffs | Avoids obvious stretched texture on vertical faces | 3 projections/texture and more fragment work | **Selective optional cliff-only material**, low quality uses simpler projection |
| Full terrain PBR with multiple 4K color/normal/AO maps | Detailed close-ups | Excessive texture memory and sampling for mobile | **Reject** as baseline |
| MeshStandardMaterial per surface | Familiar PBR behavior, maps and lighting | Material overhead, UV/control preparation, more costly than basic | **Evaluate** for dirt/rock; custom shader likely needed for controlled blending |
| Low-cost custom `ShaderMaterial` | Consistent art-directed blending and water tint | Shader/code complexity; explicit sRGB handling required | **Primary path**, feature-flagged |
| Three.js Water.js / Water2 with real-time reflection/refraction | Shiny photoreal water | Render-target passes and extra samples; mismatch to cartographic style | **Not for mobile baseline**, revisit only with evidence |
| Screen-space postprocessing or baked screenshot textures | Quick apparent richness | Touch/picking/world-scale mismatch and performance risk | **Reject** |

**Recommended rendering path:** separate materials for terrain, roads/shoulders, path/plaza overlays and water using shared local textures. Keep the currently generated vertex colors as broad macro tint, not the entire surface. Use subtle, seeded blending, and quality-specific shader defines. Keep all materials compatible with existing interleaved BufferGeometry, with additive scalar attributes or control textures only when required by a small, tested pipeline change.

### Color management and filtering

- Renderer output is already `THREE.SRGBColorSpace`. Label albedo/diffuse images with `texture.colorSpace = THREE.SRGBColorSpace`; leave normal, roughness, masks and height/control data with `THREE.NoColorSpace`. Current legacy vertex colors and authored GLBs have different origins. Test against actual captures before converting existing palette factors.
- Use repeated seamless images with `RepeatWrapping`, mipmaps, measured world-space texel density and modest anisotropy (1–2 initial, conditionally 4 if useful). Keep texture coordinate resolution in **game world units**, not screen pixels, so zoom/pan/rotation never shifts patterns.
- Use a consistent neutral light and readable roughness, no emissive grass, neon water or mirror-shiny mud. Photograph-based inputs should be art-graded and downsampled to suit the existing stylized building models.

## 4. Surface art system

### 4.1 Palette and physical meaning

| Surface | Intended read | Normal-quality inputs | Location and blending |
| --- | --- | --- | --- |
| Meadow grass | muted green mixed-height grass, fine earth and sparse flowers | seamless albedo + optional restrained normal | default dry, gentle terrain |
| Worn grass and scrub | trampled patch near buildings, road shoulders and common spaces | shared grass/soil atlas + low-frequency mask | seeded, based on distance to legitimate paths/occupied places; no lawn-shaped plots |
| Forest floor | leaves, darker earth, scattered small debris | optional second tile or shared earth with diffuse tint | near actual seeded tree clusters |
| Compacted soil | brown-gray ruts, pebbles and hardpacked tracks | dirt/grass-path albedo | road center, local lanes and worn approaches |
| Exposed earth and farm soil | broken, earthy field patches | dirt albedo reused | actual **committed** farmland only; no invented crops or change to farm yields |
| Rock and cliff | gray brown stone on steep surface | stone albedo; optional normal | slope/normal-driven, no fake rock tiles on meadows |
| Bank and beach | mud, stones, narrow damp edge | reuse dirt and stone tiles plus wet tint | near current water mask, not arbitrary rings |
| Plaza and park | subdued worn public ground with grass at edges | compact gravel/soil and existing paving pattern | actual surfaces, roads remain recognizable |

Use two scales of variation: **micro** (tileable albedo and optional normal for nearby camera), **macro** (smooth deterministic variation across dozens of game units to prevent repeated wallpaper pattern). A few percent variation in albedo and a low-frequency irregular transition mask is enough to start. Do not put random visible checker squares on every mesh cell. Do not let the cosmetic classification change where roads/water/fields actually exist.

### 4.2 Terrain material algorithm, normal quality

Per vertex or a low-resolution world-aligned control map, derive:
- wet/shore proximity from the same analytic water mask, smoothed in visual world units;
- slope using render-space triangle normals or sampled slope, thresholds tuned to actual terrains;
- coarse altitude and exposure;
- forest proximity from already seeded tree locations;
- deterministic world-coordinate noise for organic transitions.

For each fragment, blend e.g. **grass + compact earth**, introducing stone only above a measured slope threshold; retain a low-frequency color variation. Avoid expensive per-fragment world/river searches. Precompute distance/control grids once per world/settings/quality and regenerate after a world change, not on camera motion. Bilinear interpolation must prevent visually visible squares in the classification mask.

Start with 2 albedo samples and one control/macro sample per ground fragment, then profile an optional third rocky layer or normal. Where possible atlas or pack common channels to reduce binding count. **Low quality** uses fewer materials/maps or vertex-only blended colors, never affects terrain geometry positions or simulation state.

### 4.3 Roads, shoulders and desire paths

- Keep **exact existing authored alignment**, curved centerline, junction polygons, shoulder dimensions and analytic water/grade rejection. Preserve `road-junctions.mjs` and `road-surface.mjs` as sources of truth.
- Apply worn compacted dirt with small embedded stones to main road surfaces, subtle ruts only if reliably aligned along the curve and clipped at intersections. Avoid directional tire tracks or modern lane markings in founding era.
- Roads are high enough to remain readable, yet shoulders taper through grass/dirt mixtures with **irregular seeded boundaries**. Soft shoulder edges must not create depth-fighting transparent geometry or visual pavement widths that contradict road ownership/hit testing.
- For first slice, shade the existing draped `surfaces` polygons by road/shoulder/path material semantics. A single all-purpose index-5 shader **cannot distinguish** roads from paths, plazas, and crops using only world positions; introduce a small, renderer-owned surface category/attribute or separate batches while keeping the old interleaved payload/test fixtures compatible.
- Apply less intense dirt to desire paths and house approach trails, preserving their narrower footprint and their existing simulation-driven existence.
- Branches and junction centers must match road texture scale/tone, avoid visible seam lines and center overlays, and keep screen-space edit handles legible.
- Road texturing changes appearance, not road connectivity, length, cost, slope policy, intersection topology or monthly behavior.

### 4.4 Water and shoreline

**Do not substitute a giant flat water plane.** Preserve lake/river polygon coverage, levels and shore geometry generated by `world-gen.mjs::waterPolygon`; treat it as the same authoritative water footprint. If later geometric shoreline improvements are warranted, isolate them into separate regression-tested geometry work.

Proposed fragment inputs: world X/Z, water type/lake-versus-river classification, rendered water height, optional precomputed local shore distance / depth class, deterministic low-frequency flow direction from the nearest existing river-segment tangent, shared normal/noise map and elapsed render time. No change to simulation water level.

Render layers:
1. Deep interior: restrained blue-green opaque-ish surface, no saturated cyan.
2. Shallows/bank: smoothly transition toward muted silt/earth tint within the **wet polygon**. Use depth/shore proximity shading, not a second hard blue outline.
3. Surface movement: two low-strength scrolling normal/noise channels or 1 cheap distortion sample, with much slower lake motion than river motion. A tiny directionally flowing highlight can make water readable at oblique angles. Avoid rapid shimmering, synchronized checker patterns and texture swimming during zoom.
4. Banks: thin wet mud/stone zone on adjacent dry terrain, derived from water-mask distance; add small shoreline pebbles/reeds from seeded positions only when land is dry and navigational clearance allows.
5. Edge: very subtle foam or specular line **inside** water where appropriate, not bright white continuous shoreline or uniform glowing border.

Prioritize stable sampling at multiple camera pitches and at 1x to 3x zoom. Water and banks should share color values to visually conceal jagged underlying triangulation. Rivers should communicate direction with anisotropic/slow flow; lakes should look almost still. Do not enable full Water.js/Water2 reflection/refraction until an actual mobile frame-time budget supports it.

## 5. Concrete integration plan

Keep `ui-kit/render-3d.mjs` as shared input/controller and `world-renderer-three.mjs` as swappable presentation. Do not rewrite both engines or introduce unrelated Three.js physics.

Proposed presentation modules (names may be adapted):
- `environment-materials.mjs`: local texture registry/lifetime, color-space, quality presets, material selection by surface semantic and water type.
- `terrain-classification.mjs`: pure, deterministic world-aligned visual weights from existing world, displayed terrain, analytic wet mask and seeded tree proximity. No writes to input.
- `shoreline-material.mjs` or integrated water shader: shallow/deep, river/lake direction and animation with seeded phase.
- `surface-geometry.mjs` or focused extension to `game-3d-mesh.mjs`: carry road / shoulder / desire path / plaza surface metadata without breaking native WebGL or contact triangulation.
- `environment-asset-manifest.json`: exact local texture URLs, publisher asset URLs, chosen map types, license, source SHA256 and processed SHA256/byte counts. No guessed or unverified download filenames.
- `ui-kit/environment-lab.html`: controlled seeded screenshots at meadow/road/bend/3-way/shore/cliff with normal and low quality controls, not an alternate game mode.

A feasible incremental path:
1. New Three.js ground material with **one locally bundled, verified CC0 grass albedo**, correct UV scale/color space, proven offline and legacy fallback.
2. Classification blending of dirt, ground and cliff materials with no changes to surface heights.
3. Separate textured main road/shoulder/path/public-space semantics and soften boundaries.
4. Water/lake/river material and shoreline transition.
5. Measured mobile optimization, integration tests, and physical UAT.

The screenshot can be used as the B0 review reference, but tests should also inspect procedurally seeded lakes and narrow curved rivers. Do not claim terrain shader completion based on a flat valley screenshot.

### Internal coordinate and layering invariants

- Game coordinate `{x,y}` maps to world-space `{x-world.width/2, displayedHeight, y-world.depth/2}`. Up is +Y, water level stays at original height. Any UV/control lookup must be independent of camera movement.
- Preserve `terrainResolution` normal/low, `createWorldMesh` triangle split and `createTerrainSurface` contact. A new uniform or attribute cannot move any vertices.
- Existing surface layering is ground (0), water (1), all roads/paths/surface decorations (5), zoning overlay (6), buildings (7), editing (8). Change material dispatch by semantic and carry data through geometry batches, do not globally restyle every index-5 triangle as asphalt or dirt.
- Preserve transparent zoning preview and input. If new `ShaderMaterial` is used, explicitly preserve opacity, depthTest, depthWrite, side, renderOrder and color output. Test iOS/WebGL2 (shader compilation, texture formats) and context loss to legacy.
- Preserve `screenToWorld` raycasting against terrain buffer 0 and `getCamera` behavior.
- Avoid per-frame rebuilds of textures or control masks. Update only time uniforms for animation and do not trigger a continuous render loop when water is hidden or the tab is backgrounded. Mobile performance may require a quality-based maximum animation cadence.
- One source texture can be shared by several material instances; the owning asset registry disposes once on scene teardown. Handle async cancellation across save-slot/world changes.

## 6. Texture sources, licensing, and file provenance

**Verified public primary sources, not yet downloaded into Willow Valley:**
- Poly Haven license: https://polyhaven.com/license (CC0 redistribution and commercial use permitted).
- ambientCG license: https://docs.ambientcg.com/license/ (CC0).
- Poly Haven Leafy Grass: https://polyhaven.com/a/leafy_grass (candidate meadow).
- Poly Haven Forest Ground 05: https://polyhaven.com/a/forest_ground_05 (candidate woodland soil).
- Poly Haven Dirt: https://polyhaven.com/a/dirt (candidate road-center earth).
- Poly Haven Grass Path 2: https://polyhaven.com/a/grass_path_2 and Grass Path 3: https://polyhaven.com/a/grass_path_3 (candidate worn footpaths).
- Poly Haven Brown Mud: https://polyhaven.com/a/brown_mud (candidate damp shore).
- Poly Haven Rocky Terrain 02: https://polyhaven.com/a/rocky_terrain_02 and Rock Path: https://polyhaven.com/a/rock_path (candidate slopes/gravel).

These are **candidate material pages** confirmed during research, not claims that their exact pixel assets were acquired, exported, correctly tiling, or performance-tested. Compare them in a material/contact test gallery before selecting a final palette. Full-res 4K/8K/16K source images are not appropriate runtime downloads. Import **small processed local derivatives** and keep exact input hashes/provenance in the manifest. If a texture is a PNG/JPEG source, do not infer a KTX2 compressed variant exists; compression is an optional offline build step with reproducible transcoder tooling and a tested fallback.

Source document references:
- Three.js color pipeline: https://threejs.org/manual/pages/color-management.html
- Texture repetition/mipmaps/anisotropy: https://threejs.org/docs/pages/Texture.html
- Performance costs of multiple texture samples: https://threejs.org/manual/pages/textures.html
- MeshStandardMaterial channels: https://threejs.org/docs/pages/MeshStandardMaterial.html
- ShaderMaterial limitations: https://threejs.org/docs/pages/ShaderMaterial.html
- KTX2Loader (optional optimization): https://threejs.org/docs/pages/KTX2Loader.html
- Three.js Water baseline for comparison: https://threejs.org/docs/pages/Water.html
- GPU Gems 3 on triplanar projection and cliff stretching: https://developer.nvidia.com/gpugems/gpugems3/part-i-geometry/chapter-1-generating-complex-procedural-terrains-using-gpu
- Terrain3D technical discussion of splat-map/index-map sampling tradeoffs: https://terrain3d.readthedocs.io/en/latest/docs/shader_design.html
- Three.js draw-call optimization: https://threejs.org/manual/pages/optimize-lots-of-objects.html

## 7. Performance budget and UAT

**Previous measured baseline** (different source/model version, desktop software renderer): normal 100-home ~98 draw calls, ~144k triangles, ~21MB estimated texture bytes. SwiftShader frame times miss the target; physical-phone FPS is unknown. No new surface textures have been benchmarked.

**Proposed guardrails, subject to profiling rather than promises:**
- No new terrain tessellation solely to improve texture quality.
- Initial atlas/texture set at most 512–1024 pixels on the longest edge per map in normal mode; keep the total **added decoded GPU texture estimate <= 12 MiB**, aiming <= 2 MiB additional transfer for the selected set. Document every counted texture and mip overhead.
- For normal quality, use 2–3 albedo samples per terrain pixel initially; any added normal/shore samples require measured justification. Low quality should have a simpler 1–2-sample path, no expensive reflection passes, and existing DPR cap of 1.
- Normal-quality scene render calls/triangles must remain within existing CI budgets (normal <=150 calls and <=250k triangles; low <=100 and <=150k in 100-house fixture), or document a separate explicitly approved change with comparative device evidence.
- Target **sustained >=30 FPS** in actual iPhone Duo portrait gameplay for 30 and 100-home fixtures; median frame interval <=33.3 ms, review p95/p99 and thermal behavior. This is a **goal, not verified performance**. Record CSS viewport, DPR, device/browser and battery/thermal conditions.
- Normal/low quality must preserve shape, collision/picking and saved outcomes exactly. Graphic downgrade can reduce normal-map samples, water animation, vegetation detail and render DPR but never change water passability or road layout.

**Automated checks:**
- Pure deterministic masks on identical seed and resolution, independent of camera and turns. Different seeds produce different but stable broad material regions. No random `Math.random` in material classification.
- Tiny fixed world fixtures: dry hill, wet shoulder, steep cliff, lake edge, narrow river, T and X road intersections, curved road and desire path, near-shore plaza, and farmland with/without committed field.
- Vertex position and triangle diagonal checks unchanged to <=1e-6 for material-only commits, existing terrain-contact error <=0.02 units, no regression in road/water/placement validators.
- Screenshot comparisons for normal and low, high pitch/low pitch, close-up and full town, with eyes-on review for visible repetition, road halos, shimmer, jagged water and tiling seams.
- Root and `/dev/` pre-cache/offline cold launch with zero third-party requests, hash corruption/incomplete-install rollback and an explicit WebGL fallback. Verify independent `main` vs `develop` caches.
- `npm run build:assets`, `npm test`, `npm run test:e2e`, `WV_RENDERER=three` camera/road/zone/save parity tests, icons/offline packaging and GitHub Actions. Browser screenshots are not equivalent to real phone UAT.
- Verify surface caches/geometry buffers do not leak across 20 world changes and save-slot switches, and that water animation pauses when backgrounded.

**Human acceptance:** At typical close-zoom, show user a grassy meadow, mixed bare-earth trail, smooth road shoulder, sloping cliff with no stretched pattern, river with shaded banks and subtle flow, and a lake with natural shallow-to-deep color. It should look coherent beside **current and future** cottage models. User approves the art direction before any default-renderer rollout.

## 8. Parallel-work boundaries and Git procedure

Architecture/asset worker: owns architecture GLBs, shared human scale, model lighting/materials, `building-visuals.mjs`, `settlement-architecture.mjs`, model GLB authoring/build and related docs.

**This surface worker** owns terrain/water/road presentation shaders, terrain classification, local surface texture import, surface visual-gallery fixtures and corresponding tests. Minimal tightly scoped edits to `world-renderer-three.mjs`, `world-gen.mjs`, `game-3d-mesh.mjs`, `ui-kit/render-3d.mjs` only after rebasing/checking for concurrent changes. Do not modify the architecture import pipeline, `assets/wv/architecture-v1/`, building scale, asset GLB registry, game economy or save formats.

Both branches start at latest `develop`, pull/rebase before each PR, and do **not** edit the same central renderer concurrently without reconciling the latest diff. Prefer additive modules and stable interfaces. Feature flags/normal-low quality preserve native WebGL. PRs to `develop` with CI and evidence; Codex may self-merge passing development PRs. The user alone promotes `develop` to `main`.

## 9. Acceptance criteria and release gates

- [ ] Full terrain looks materially varied at neighborhood and close zoom, with no visible checkerboard seams or diffuse-texture wallpaper repeats.
- [ ] Main roads read as compacted earth and blend into shoulders; crossings, curves and local footpaths retain correct shapes without clipping.
- [ ] Water remains within authoritative wet terrain, with shallow banks, subtle lake/rivers distinction, stable flow, and no bright artificial edge.
- [ ] Cliffs/rocks/forests have restrained context-correct surface cues.
- [ ] Every included image is locally bundled, hash-verified, documented with CC0 provenance; offline cold launch works.
- [ ] Current Three.js buildings/saves and incoming licensed building replacements are unchanged.
- [ ] Low quality degrades gracefully; benchmark and memory budgets recorded, not inferred from screenshots.
- [ ] Real iPhone Duo UAT explicitly accepted before closing the issue or making Three.js default.

No screenshots, tests, asset bytes, hashes, or frame rates in this document claim **WV-ART-003 implementation** has been executed. This is a technical plan and source verification record.
