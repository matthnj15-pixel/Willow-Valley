# WV-ART-001: Seamless, inhabited 3D settlement

**Status:** Architecture and art-direction decision, 2026-10-31
**Target:** develop, incremental vertical slices. Preserve main and all prior saves.
**Context:** The settlement simulation must remain deterministic, turn-based, offline-first and independent of rendering.

## Product experience

The game should look like an inhabited early settlement, not a polygon visualization. The founding scene features mixed wooden cottages, natural dirt tracks, a continuous meadow, gardens, paths, stream banks, trees, stone foundations and working farms. The player still lays the major roads and zones land; the population still decides where individual houses and paths develop. Historic angled parcels and uneven town fabric must persist into later phases.

**Visual reference:** Foundation's organically occupied building footprints; the readability of Outlanders 2; CityRT's visually varied building catalog; restrained warmth and legibility from illustrated cartography. Do not copy art assets from those games.

## Current implementation audit, develop branch, 2026-10-31

- `world-gen.mjs`: one seeded analytic elevation, river and lake sampler; the displayed terrain is a lower-resolution tessellation of that elevation.
- `game-3d-mesh.mjs`: custom triangles for roads, home shells, zones and editor handles. Road strips previously sampled only their four corners; roofs sampled terrain again at each corner.
- `ui-kit/render-3d.mjs`: custom WebGL shaders and orthographic projection, not Three.js. Single directional Lambert-like lighting; no physically based assets, contact shadows or model hierarchy.
- `ui-kit/kenney-models.mjs`: custom subset-of-glTF GLB reader, flattened vertex colors, normalization of selected external Nature/Castle models. Runtime requests to a third-party host. Fantasy Town and Survival houses are not bundled.
- The built-in screenshot shows long road strips intersecting terrain, oversized prism edit handles, and buildings without realistic seats.

## Architecture decision

**Migrate the presentation layer to locally bundled Three.js in an isolated feature flag.** Avoid attempting a wholesale application or simulation rewrite. Keep the existing `world.sample()`, `roadGraph`, residential parcels, household occupancy, save format and turn resolution. A renderer adapter consumes read-only views of the state.

Modules to introduce over successive PRs:

| Contract | Responsibility |
|---|---|
| `terrain-surface.mjs` | Authoritative analytic height query and consistent conversion to displayed terrain surface; expose slope, normals, water, and buildable contacts |
| `road-surface.mjs` | Sample road graph splines and widths, grade-check alignment, form topography-conforming shoulders, real intersection polygons, and bridge approaches |
| `foundation-system.mjs` | Resolve level platform and perimeter elevations for rotated building footprints, selected foundation type, cut/fill and retaining geometry |
| `asset-registry.mjs` | Exact versioned local GLB catalog, model dimensions, attachment points, license and era metadata |
| `building-visuals.mjs` | Choose deterministic model variants from existing `cottageBlueprint`, independently of household and economy logic |
| `world-renderer-three.mjs` | Rendering-only Three.js scene, camera, materials, instancing, culling, lighting, local asset loading, disposal and dirty region updates |
| `editor-overlays.mjs` | Screen-space 2D nodes and curve controls projected from world positions with accessible touch targets |

Keep `mountWorld3D` stable as an adapter until UAT confirms equivalent camera, pick, zoning and play modes. Use an offline feature flag to switch back to native WebGL if needed.

## Seamless terrain and infrastructure

1. **Ground:** Draw a continuous heightfield, not individual squares. Use a coherent meadow palette and very subtle material variation. Terrain collision and rendered height must agree to tolerance. Preserve bank/water/rock shapes and zone boundaries.
2. **Road:** Represent a road as `centerline, width, class, control points, material, grade policy`. Tessellate each curved or straight segment adaptively by arc length and curvature. Sample BOTH shoulders and centerline at each station. Determine surface Y from the actual rendered heightfield, rather than assuming a straight chord between endpoint heights.
3. **Topology:** Build intersection junction geometry at shared graph nodes, use triangulated junction polygons rather than intersecting rectangles. Sufficiently low-angle bends need joins; sharp turns need a bounded miter or round join. The result contains no gaps or visible overlap flicker.
4. **Roadbed:** Dirt/footpaths contour the ground with subtle ruts and side vegetation. Gravel and stone have widths, edge treatments and wear consistent with the existing progression rules. Uneven terrain can produce small cuts, banks and retaining walls. Severe grades prompt the player for alternate alignment or bridges, rather than allowing a road to fly across an open ravine.
5. **Water:** A road crossing water is blocked unless an appropriate ford or bridge model is placed. No dirt-road surface is drawn beneath water as if traversable.
6. **Editor:** Show flat screen-space nodes with legible center and outer hit rings. Avoid rendering 3D towers as handles. Hit targets stay 44 CSS px or larger while markers remain visually small. A selected node stays readable despite terrain or zone transparency.

## Terrain-aware building seats

- Compute terrain samples for the rotated footprint corners **and along perimeter edges**, before placement. Validate max slope, flood level, footprint clearance and legal access. Existing suitability logic remains authoritative; visual presentation must never silently override it.
- Choose a single floor plane, normally just above the footprint's high point, with allowable cut/fill. Do not independently terrain-sample roof, porch or wall tops. Eaves, ridges and door thresholds must remain level.
- Fill from that plane to the terrain with a stone rubble foundation, timber stilt structure or masonry plinth. At larger grade differences, use stepped foundation courses, retaining walls and an entrance stair. If the site exceeds placement constraints, reject rather than create implausible towers.
- Attach model footpoint to that support plane. Apply uniform model scale only, from an import-time canonical scale; orient doorway towards the known `house.entrance` and existing approach path. Keep a readable small path to the entrance.
- Terrain near the building can have a *local* landscaped pad or stone doorstep, without flattening the whole parcel or modifying the saved settlement seed.

## Real model selection and neighborhood variation

The simulation chooses *when and where* a building appears. The visual registry chooses *which approved model* represents that structure, using stable house ID, era, purpose, parcel dimensions, capacity and seeded variation. Persist or deterministically derive the model ID so loading a save never randomizes the street.

| Asset source | Planned purpose | Licensing and adoption |
|---|---|---|
| Kenney Fantasy Town Kit v2 | Primary cottages, larger masonry/timber buildings, modular variations | 160 CC0 pieces; first-priority local import. https://kenney.nl/assets/fantasy-town-kit |
| Kenney Survival Kit | Primitive storage, logging/fishing, early homestead detailing | 70+ CC0 pieces. https://kenney.nl/assets/survival-kit |
| Kenney Nature Kit | Trees, shrubs, boulders, ground embellishments, bridges | Existing partial import, expand local set. https://kenney.nl/assets/nature-kit |
| Kenney Castle Kit | Later civic/stone buildings, walls and manor structures | CC0, deploy only when historically appropriate. https://kenney.nl/assets/castle-kit |
| Quaternius Medieval Village Pack | Optional catalog of preassembled houses, sawmill, blacksmith, market props | 39 CC0-labeled models on the original Poly Pizza 2022 listing; reconcile with current Quaternius Asset License before checking raw files into a public repository. https://poly.pizza/bundle/Medieval-Village-Pack-NsHhjhlrfY |
| Quaternius Medieval Village MegaKit | Optional later modular roof, wall and trim construction | 300+ models; current 2026 Quaternius general license restricts standalone asset redistribution. Do not indiscriminately commit vendor source models. https://quaternius.com/packs/medievalvillagemegakit.html |

**License gate:** Quaternius's website currently posts QAL v1.0 (August 28, 2026), even though older pack pages say CC0. The QAL allows incorporation into games but restricts redistributing assets as standalone files or packs. Confirm the license attached to the exact downloaded revision before public-source distribution. Kenney's explicit CC0 packs avoid this concern for the initial self-hosted bundle.

Suggested art language: hand-built plaster and timber walls, varied clay/slate/thatch roofs, muted sandstone bases, wood doors, small windows, chimneys, garden patches and scattered fences. Reserve most saturated colors for UI and selected market awnings. Avoid mixing high-poly realistic houses with extremely simplified polygon trees.

Start with at least **six** distinct hamlet house silhouettes, **three** roof materials, **three** exterior wall families, and functional models for **farm, lumber, granary, smith, market**. These are art-catalog goals, not claims about existing assets. Later eras expand this catalog without turning old cottages into modern houses.

## Small details driven by real state

- Home frontage: stepping stones or narrow garden path to closest permitted local lane, not an arbitrary straight line.
- Occupied sites: limited laundry line, woodpile, garden or fence chosen from a stable seed; never place decorations where access paths, cliffs or another parcel exist.
- Production: stacked logs near an operating lumber yard, grain sacks at granary, farm field rows tied to actual painted fields, carts at market, chimney smoke where appropriate.
- Wear: gravel dispersion and stone-road cracks show existing maintenance level. The visuals communicate real management consequences, not a separate simulated economy.
- Vegetation: maintain genuine seed-determined mature trees and protect preserves; reduce clutter near entrances, paths and road edges.
- Lighting: a soft directional sun, hemispherical ambient fill and selective contact shadows, with one consistent material/color-space pipeline. No high-cost global postprocessing required on mobile.

## Asset import and offline requirements

1. Download vetted source assets; preserve provenance, version, license and SHA-256 hash in a manifest.
2. Use Blender or a glTF transform pipeline to normalize units, up axis, pivot and outward-facing door direction. Retain coherent authored base colors and textures.
3. Bundle an optimized `.glb` library locally, not external runtime URLs. Avoid CDN dependencies for Three.js, GLB decoders and textures. Include required assets in the PWA's offline cache strategy.
4. Use Three.js `GLTFLoader`, with Meshopt or Draco decoders only for models that use those extensions. Compress heavy textures where worthwhile. Avoid custom parsers that discard model materials or hierarchy.
5. Reuse material and geometry references, instance repeated identical models and trees, cull unseen detail, clean up resources when rebuilding scenes. Render dirty changes rather than rebatching every building every frame.
6. Test offline with network disabled after initial install, across reload and all three save slots.

## Quality gates and UAT acceptance

- In a seeded mountainous map, a long straight and curved dirt road have no visible terrain penetration when camera tilts and rotates. Capture downhill and ridgeline screenshots; bridges are distinct and only allowed where permitted.
- Every road crossing shares a coherent filled intersection; there are no edge cracks, gaps or Z-fighting. Changing a node regenerates affected surfaces.
- A cottage on a gentle hill has a horizontal eave and foundation walls contacting the ground around its perimeter. A cliffside or flooded cottage is rejected with an actionable cause.
- At least six visibly recognizable hamlet silhouettes appear over 30 houses, with stable variation across reload. Exterior props are attached to actual plots and facilities.
- 2D edit handles never become scenery. Touch gestures and zoom work without accidental road placement. Node tap targets remain large enough on mobile.
- Visual model identity and terrain geometry do not change population, employment, food, trade or monthly outcomes. Save migration remains deterministic.
- Baseline FPS, frame-time spikes, draw calls, triangles, JS heap and GPU memory must be recorded on the target foldable phone. Target sustained interactive 30 FPS on the target mobile device, with quality fallbacks that lower model density, shadows or foliage before touching gameplay.
- All models, engine modules and their decoders load during an offline relaunch; no traffic to external asset hosts.
- Automated unit tests, Playwright mobile integration and visual regression screenshots must pass before merging.

## Delivery sequence

1. **Terrain-integrated surfaces:** adaptive road strip, junction fill, level building plane, foundation plinth and reduced geometric handles. Focused tests; prototype visuals can remain.
2. **Renderer adapter:** feature-flagged local Three.js, identical camera projection, picking and save semantics, two stable map scenes, no mandatory network.
3. **House asset vertical slice:** locally bundled Fantasy Town cottages, correct foundations and entrances, deterministic catalogs, meaningful farm/market/lumber buildings.
4. **Environmental composition:** road edge blending, grass, shadows, mature trees, bushes, rivers, bridges and context-aware details.
5. **Progressive town art:** era-specific architecture, road wear, occupation, market activity, and optimization validated on actual mobile hardware.

### External technical references

- Three.js GLTFLoader: https://threejs.org/docs/pages/GLTFLoader.html
- Three.js InstancedMesh: https://threejs.org/docs/pages/InstancedMesh.html
- Three.js material polygon offsets: https://threejs.org/docs/pages/Material.html
- Three.js WebGLRenderer: https://threejs.org/docs/pages/WebGLRenderer.html
- Three.js resource disposal: https://threejs.org/manual/pages/how-to-dispose-of-objects.html
- Kenney explicit CC0 catalog pages: https://kenney.nl/assets/fantasy-town-kit
- Quaternius current license: https://quaternius.com/license.html
- CityRT public catalog claim: https://cityrt.com/en/ (its rendering internals are not public evidence)
