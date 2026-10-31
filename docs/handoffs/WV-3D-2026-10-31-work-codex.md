# Willow Valley: 3D World, Architecture and Building Asset Handoff

**Status:** Approved initiative; research + engineering handoff, 2026-10-31  
**Source branch:** `develop` (never `main`)  
**Audience:** ChatGPT Work (research and art catalog), Codex (modular implementation)  
**UAT:** https://matthnj15-pixel.github.io/Willow-Valley/dev/  
**Repository:** https://github.com/matthnj15-pixel/Willow-Valley

## 0. Mission and non-negotiable design intent

Turn Willow Valley's playable but prototype-looking 3D environment into a coherent, inhabited, historically evolving settlement. Buildings must be unmistakable at normal mobile zoom: distinct houses, farmhouses, barns, commercial marketplaces, blacksmith/toolsmith workshops, logging camps, granaries, parks and plazas. Roads must follow topography, turn into clean intersections, and meet building entrance paths. Buildings remain level atop believable foundations adapted to real local terrain.

The design language draws from **Foundation** (organic growth), **Outlanders 2** (readability and crafted low-poly art), **CityRT** (recognizable architectural variety), early medieval/rustic settlement architecture, and organically evolved historic settlements such as Cádiz. These are references, not permission to reuse proprietary game assets. Avoid painted-on generic boxes, mechanically regular house rows, pure-grid streets and excessive clutter.

The user controls main roads and zoning; the simulation autonomously chooses which eligible houses appear on irregular parcels. Do not redesign those mechanics. The existing region, roads, housing, jobs, resource production, monthly economy, camera and offline saves remain authoritative.

## 1. Current verified code and baseline

Inspected directly against `develop` on 2026-10-31:

- `docs/design/WV-ART-001-seamless-3d-world.md`: existing architecture decision and quality gates. **Read this first.**
- `docs/ASSET-SOURCES.md`: existing Kenney asset licenses, remote GLB provenance, incomplete local bundling.
- `simulation.mjs` `BUILDINGS`: **seven currently buildable types**: `lumber` (Lumber camp), `farm` (Farm), `smith` (Toolsmith), `park` (Park), `plaza` (Plaza), `market` (Marketplace), `granary` (Granary). Residential houses exist separately as `state.houses`.
- `settlement-architecture.mjs`: seeded `cottageBlueprint` and `buildingBlueprint`, including sizes, era, orientation, exterior colors.
- `game-3d-mesh.mjs`: custom geometry and prototype building shells; terrain-sampled road ribbons and foundation walls have a first implementation and tests. **Inspect and improve, do not replace without analysis.**
- `ui-kit/render-3d.mjs`: custom WebGL renderer, not yet Three.js.
- `ui-kit/kenney-models.mjs`: flattened custom GLB parser, select Nature/Castle kit assets loaded from a remote host; Fantasy Town and Survival building models not integrated.
- `world-gen.mjs`, `road-network.mjs`, `road-editor.mjs`, `organic-world.mjs`, `save-slots.mjs`: maintain their existing data contracts.
- `tests/terrain-integrated-surfaces.test.mjs`: existing terrain conformity, foundation and road handle regression baseline.

**Do a fresh repository audit before implementation.** This snapshot is a planning reference, not proof of today's deployed behavior.

## 2. Complete building visual catalog

### Required now, matching playable game mechanics

| State kind | Recognizable silhouette | Required attached details |
| --- | --- | --- |
| Residential house | At least 6 seeded, visually distinct hamlet cottage models, with variations in size, roof height and wall/roof materials | Door, believable windows, roof material, chimney subset, short entry path, optional garden/fence/woodpile |
| `farm` | Farmhouse with adjacent barn or open agricultural work shelter | Real painted-field adjacency, crop rows (only on valid farmland), fences, tools or hay |
| `lumber` | Logging hut or timber-framed lean-to and lumber yard | Logs, sawhorse, wood stacks, clearing; working state can alter clutter |
| `smith` | Distinct forge/workshop and chimney, visibly different from cottage | Anvil, fuel/material pile, forge ventilation, safe smoke as optional lightweight effect |
| `market` | Open trading market with booths, awnings, counters | Crates, sacks, cart and pathways; market footprint stays walkable |
| `granary` | Tall timber grain warehouse or raised storage building | Loading platform, grain sacks, carts, secure dry storage silhouette |
| `plaza` | Genuinely open civic square, not a roofed house | Topography-adapted paving, low boundaries, well/fountain/bench options where era-appropriate; people circulation |
| `park` | Landscape commons with trees, grass, meandering paths | Seating/fencing optional, preserve paths and walkable areas |

**Important:** A plaza and park are *spaces* with perimeter objects and paths, not box buildings. Building entrances and asset footprints must be represented in data.

### Future-ready only, not yet gameplay-supported

Church/chapel, civic hall, inn/tavern, mill, quarry/stoneworks, upgraded urban shops. Include candidate models and a typed catalog/interface so they can be supported later, but **do not add new `BUILDINGS` gameplay types, religious mechanics, costs, or unlocks without a separate product decision**. An architectural chapel preview may exist in an isolated asset-gallery/test scene only.

### Evolution and variation

Keep founding architecture irregular and hand-built: wooden cabins, limewash/plaster, timber-frame, modest stone plinths, different roof shapes and muted thatch/clay/slate families. Later phases add masonry, multi-storey houses, commercial frontage and civic monuments **without replacing historically founded homes automatically**. Model selection must be stable across save/load and turn order using IDs/seed/era/capacity/plot footprint, not `Math.random()` in the renderer. Maintain architectural coherence with the nature assets.

## 3. Terrain, infrastructure and foundation contracts

1. **Single height authority:** existing deterministic `world.sample(x,z)` (and any derived terrain-surface adapter). Convert consistently between game-plane coordinates and 3D world space; test precise contact points. No separate renderer-only height function with divergent values.
2. **Ground:** continuous heightfield and smooth bank/water intersections. No exposed squares, repeated tiled look or floating/penetrating props. Keep trees deterministic and respect roads/plots/preserves.
3. **Roads:** sample center and both shoulders along full straight/curved alignment; adaptive tessellation by grade and curvature; consistent normals. Dirt edges should blend visually into meadow. Correct miter/round joins, real junction polygon fill, no visible Z-fighting. Enforce unsafe-grade/water-crossing policy instead of drawing floating roads; bridges only when explicitly allowed in gameplay.
4. **Building seat:** terrain samples at rotated footprint corners *and perimeter*, slope/water/obstacle suitability, horizontal floor/eaves, visible foundation extending down to terrain, bounded cut/fill, retaining/plinth/stilts when justified. Entrance faces the correct actual approach. Do not flatten entire parcel.
5. **Structures, paths and land use:** physical access from entrances to existing lane/road/footpath. Farm crops only on committed associated farmland. Local details must not intersect roads, other buildings, cliffs, water or public walkways.
6. **Editing:** rendering of road nodes and Bézier handles as terrain-hugging low glyphs or screen-space overlays; minimum 44 CSS px tap targets, no tall world-space editor columns, no clipping under terrain.
7. **Renderer-state separation:** a read-only rendering adapter consumes simulation state; no material, model, animation, camera or decorative effect may change labor, housing, economics, accessibility, turn resolution or save semantics.

## 4. Asset pipeline, licensing, and offline architecture

**First choice:** Kenney Fantasy Town Kit, Survival Kit, Nature Kit, Castle Kit, with original CC0 provenance. Investigate exact files, visual fit, GLB/FBX/OBJ formats, dimensions, material consistency, potential architectural assemblies, licensing and performance. Use a locally bundled, versioned asset manifest with source URL, source pack revision, license file, asset hash, canonical scale/pivot/door direction, collision footprint, and LOD/instancing eligibility.

Quaternius Medieval Village assets may expand the catalog only after checking the **actual license attached to the acquired version**, the repo's public distribution model and its standalone redistribution limits. Do not assume all downloads are CC0. Do not use proprietary game assets. Prefer a restrained coherent set rather than a larger inconsistent pack.

The installed PWA must function **fully offline after first installation**. Bundle runtime Three.js and any loaders/decoders/textures/models inside the project or an offline cache policy. No runtime CDN or third-party GLB fetch, account, paid API or telemetry. Optimize asset bytes before adding dozens of new buildings.

## 5. Technical architecture (target interfaces, adapt to current code)

Keep simulation `simulation.mjs`, `settlement-play.mjs`, `organic-world.mjs`, `road-network.mjs` separate from renderer. Suggested modules and responsibilities from WV-ART-001:

- `terrain-surface.mjs`: analytic height and displayed surface reconciliation; slope/normal/contact sampling.
- `road-surface.mjs`: road/shoulder/junction/bridge geometry from graph without mutating it.
- `foundation-system.mjs`: validated rotated footprint, horizontal seating plane, foundation geometry.
- `asset-registry.mjs`: typed asset catalog, manifest, load/dispose/cache management.
- `building-visuals.mjs`: deterministic model choice, placement, scale, entrance and foundation.
- `world-renderer-three.mjs`: feature-flagged Three.js rendering, camera parity, scene lighting, geometry sharing, instancing, culling.
- `editor-overlays.mjs`: editor nodes and handles independent of scenery.

These are interfaces to be refined after reading the repo, not permission for a wholesale rewrite. Protect `mountWorld3D` compatibility. Stable simulation and legacy saves are hard requirements. Separate scene updates on state changes from render frames; use `requestAnimationFrame` responsibly, dirty flags, pooled repetitive props, and explicit GPU cleanup.

## 6. Work research task (perform first or parallel to terrain-only engineering)

Read this handoff and `WV-ART-001`, inspect current `develop` code and relevant docs. Research current Three.js best practices for mobile orthographic town builders, Kenney kit asset filenames and compatible historical models, glTF import/transforms, foundation/road geometry strategies, performance and offline PWA asset bundling.

Deliver **in-repository, evidence-based artifacts**:
1. **Art bible and mood board:** camera-level references, exterior vocabulary, color/material palettes, era change and scale consistency; describe legal visual references rather than copying source art.
2. **Verified asset manifest/crosswalk:** *exact* source filenames/URLs, licenses, formats, approximate asset scale if verified, role mapping for every current structure and six houses, gap-filling plan for missing assets (assemble modular Kenney assets or create original meshes). Distinguish confirmed assets from proposed.
3. **World-engine technical ADR:** current constraints, target architecture and migration trade-offs, terrain/road/building placement data contracts, object picking/editing, offline packaging.
4. **Milestones and acceptance tests:** vertical slices, dependencies, visual reference scenes and mobile performance budget. Surface questions only when gameplay decisions or legally unclear licenses block progress.
5. **Evidence:** citations or official references for asset licenses and Three.js behavior, with known gaps. Never invent model filenames or claim a pack provides a chapel without verifying.

Do **not** deploy/rewrite the game as the research deliverable. Put conclusions in `docs/design/` and `docs/assets/`, with traceability to this handoff and WV-ART-001.

## 7. Codex engineering task (incremental PRs, not a single megacommit)

**Track A (can begin now, independent of art research):** audit terrain conformity and first existing surface tests, repair clipping/junction artifacts, foundations and editor overlays in small geometry-only changes. Establish deterministic screenshot scenes with a mountain switchback, multiway road intersection, cottage on a slope, water crossing and 30-house hamlet. Do not duplicate finished features; inspect latest code/test results.

**Track B (requires Work asset crosswalk):** locally bundle legally verified and optimized models. Implement feature-flagged Three.js renderer adapter, preserve camera, picking and touch parity, data contracts and offline PWA. Add an **asset gallery** to World Lab for each candidate.

**Track C:** implement model-backed *all current types* and 6+ house silhouettes. Include appropriate farm crops, wood stock, smithy, market stalls, granary, open plaza, park. Ensure proper foundation seat, door orientation, road/footpath access and plot constraints.

**Track D:** unify terrain and nature materials, add constrained details tied to actual state, scene batching/instancing, culling and LOD, mobile quality presets. Tune from reproducible benchmarks rather than assumptions.

Every PR: feature branch from latest `develop`, unit/e2e/visual tests, run `npm test` and `npm run test:e2e`, CI verification, no save regressions, no online dependency, and merge successful PRs into `develop`. User UATs the Development build. For release, prepare main PR and **leave it open for the user**. No autonomous production merges.

## 8. Acceptance criteria and definition of done

- Identical world seed produces identical house/prop choice, site elevation, foundation type and road geometry across reloads and save slots.
- Six visibly distinguishable homes in an organically arranged 30-house hamlet; each of the seven current building types has a recognizably appropriate model/composition.
- Mountain straight/curved road scenes show no hidden strips; smooth junctions and readable shoulders, no hovering intersections or pavement through water.
- On hill parcels, roofs and floors remain level, varied plinths visibly touch terrain, doorway/entrance path connects; steep/wet/blocked building attempts provide a clear error.
- Farms visually depend on painted farmland; plaza stays open and traversable; parks look landscaped, smith and lumber are visually different from homes.
- Nature and settlements look like one art world, not unrelated asset kits; attractive at normal mobile game zoom.
- Road handles remain usable and small, two-finger trackball camera and explicit paint/pan/erase remain stable on mobile.
- Capture before/after screen references and tests in **World Lab and Development game**, at low/high camera angles, day/normal lighting and 30/100-building scenes.
- Record FPS and frame pacing on target iPhone Duo, strive for sustained 30 FPS while moving camera; monitor draw calls, triangles, memory and first-load asset bytes. Avoid unverified claims of device performance. Quality reductions affect decoration, not simulation.
- Airplane-mode relaunch after installation loads all models and the complete game, with three save slots and legacy saves intact.
- Show test/CI evidence and exact deployed commit; no claim of completion from a passing unit test alone.

## 9. Operating workflow and handoff rules

1. Chat remains the product decision and UAT venue; user may refine goals here.
2. Work performs catalog/technical research and submits source-grounded architecture and inventory to `docs/`.
3. Codex reads those artifacts before integrating assets; may start independent terrain Track A earlier.
4. GitHub issues/PRs and `develop` act as **shared durable state**. Do not rely on either tool remembering the other tool's private conversation.
5. Only report stages completed with actual GitHub commits and CI/Deployment evidence.
6. The chat assistant can create/read GitHub issues and documents but cannot launch a Work or Codex session from this chat environment; the user starts those sessions with this handoff as the reference.

## 10. Kickoff prompts

### For ChatGPT Work
"Within the Willow Valley project, perform the **Work research task** in `docs/handoffs/WV-3D-2026-10-31-work-codex.md` on the GitHub repo `matthnj15-pixel/Willow-Valley`. Read `docs/design/WV-ART-001-seamless-3d-world.md` and the latest `develop` branch first. Deliver a research-backed art bible, exact legal asset inventory for our seven current structures and six house variants, foundation/road/Three.js implementation ADR, and staged Codex tasks into the repository. Do not rewrite the game or invent model filenames. Continue autonomously with sensible technical decisions."

### For Codex
"Open the Willow Valley GitHub repo, start from latest `develop`, and follow `docs/handoffs/WV-3D-2026-10-31-work-codex.md` plus `WV-ART-001`. Begin **Track A only**: evaluate and fix terrain-following road meshes, junctions, foundations and editor overlays, preserving gameplay and saves. Implement and test vertical slices on feature branches, run unit/e2e CI, merge successful PRs into `develop`, provide the exact UAT URL and commit. Do not start Track B/C asset assumptions until Work's verified asset crosswalk is available."
