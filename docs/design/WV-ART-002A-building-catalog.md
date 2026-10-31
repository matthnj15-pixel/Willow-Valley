# WV-ART-002A: complete building visual catalog

**Scope:** every current state role, six house silhouettes, and future candidates only. The [source manifest](../assets/wv-art-002a/source-manifest.json) is authoritative for filenames and measured properties. All names below are verified **source pieces** or clearly labeled **proposed original work**. There are no preassembled cottage, farmhouse, barn, smithy, or granary files in the acquired Fantasy Town v2.0 kit.

## Source identifiers and admission

Use identifiers `fantasy/name`, `survival/name`, `nature/name`, or `castle/name` to resolve a manifest row. Exact source path is `Models/GLB format/<name>.glb` for Fantasy/Survival/Castle and `Models/GLTF format/<name>.glb` for Nature. Case and underscores matter. These are acquisition paths inside archives, not HTTP URLs to nonexistent loose source models. Download the archive URL and verify the per-file hash after extraction.

Source verification includes hashes, formats, default-scene dimensions, transforms, materials, and dependencies. **Assembly verification is still a Codex task:** do not set `ready:true` until a composed model passes the gallery, entrance, footprint, and offline gates. New derivative output names below are specifications, not claims that those files already exist.

## Six founding residential assemblies

Every row represents `state.houses`, never a new `BUILDINGS` key. Use the stable catalog IDs shown; proposed export location is `assets/wv/architecture-v1/<id>.glb`. All use Fantasy `wall-door` or `wall-wood-door` and at least one matching `wall-window-small` or `wall-wood-window-small`. Props do not determine eligibility, household size, or capacity.

`U` is one Fantasy modular grid cell. Assemble source modules on their original cell grid, then normalize the **whole assembly**. Dimensions below describe maximum relative assembly plans. Fill panels that do not match module dimensions with original simple geometry in the same material vocabulary; do not stretch individual door or window modules.

| Stable ID | Distinct form and envelope | Verified pieces | Required original/assembly work |
| --- | --- | --- | --- |
| `home-long-ridge` | 1U × 2U rectangular body; one storey, long uninterrupted ridge, side entry | `fantasy/wall-wood`, `wall-wood-door`, `wall-wood-window-small`, `roof-gable`, `roof-gable-end`, `roof-gable-top` | Two-bay closed timber shell; align repeating roof pieces with end caps, clay finish; no chimney required |
| `home-steep-gable` | 1U × 1U compact body; steep gable and front entry | `fantasy/wall`, `wall-door`, `wall-window-small`, `roof-high-gable`, `roof-high-gable-end`, `roof-high`, `chimney` | Closed infill/timber shell; cap/trim seams; slate derivative roof; chimney optional from stable seed |
| `home-low-hip` | 1U × 1U square body; four-sided low roof and off-center entry | `fantasy/wall-wood`, `wall-wood-door`, `wall-wood-window-small`, `roof-point` | Fit the verified pyramidal roof to the cell; add original soft thatch eave/course treatment, not a tint-only thatch claim |
| `home-crooked-wing` | L plan made from three 1U cells in a 2U × 2U envelope; one low wing | `fantasy/wall`, `wall-door`, `wall-window-small`, `roof`, `roof-corner`, `roof-corner-inner`, `roof-left`, `roof-right` | Trim internal walls and roof overlap; original valley flashing/end infill as needed; one unobstructed inner-front entry, clay roof |
| `home-offset-gables` | 1U × 2U long body plus a 0.5U projection within a 1.5U × 2U envelope; intersecting unequal gables | `fantasy/wall`, `wall-door`, `wall-window-small`, `roof-gable`, `roof-gable-end`, `overhang`, `chimney-base`, `chimney-top` | Original 0.5U wing shell and roof valley where kit does not close; dominant long ridge, smaller transverse gable; plaster/slate |
| `home-porch-cabin` | 1U × 1U cabin plus 0.5U deep front lean-to within 1U × 1.5U | `fantasy/wall-wood`, `wall-wood-door`, `wall-wood-window-small`, `roof-gable`, `roof-gable-end`, `overhang`, `pillar-wood`, `planks` | Original shallow lean-to closure and restrained straw roofing; clear porch entry, posts grounded on same level seat |

These assembly plans deliberately specify work rather than inventing export filenames in a vendor pack. In gallery, verify that the long ridge and steep gable remain distinguishable at 100% game zoom and in monochrome. L/wing homes can have a smaller body within their envelope; never enlarge an eligible parcel. A 30-home fixture must deliberately exercise each ID, while ordinary selection remains seed-driven and footprint-filtered.

### Deterministic selection and fit

1. Read `cottageBlueprint(house)` and its era, dimensions, and orientation without modifying it. Its current `variant` range is **0–4**, insufficient to identify six silhouettes; do not implement `variant % 6` and claim six.
2. Use an explicit versioned, ordered catalog. Hash existing stable house ID if present; for legacy homes derive a visual identity from world seed, exact saved coordinates, `foundedTurn ?? 0`, and `foundedEra ?? 0`. Do not use array index, current chapter, camera, or `Math.random()`.
3. Choose among compatible shapes using the stable hash. For missing `foundedEra`, mirror current cottage behavior (0). Preserve identity mapping in `architecture-v1`; do not silently reorder/remap it in a later PR. No save schema addition is required for this slice.
4. Evaluate the normalized plan and overhang polygon against the rotated blueprint envelope, actual parcel, road/lane exclusion, and entrance clearance. Use uniform scale `s = min(width / sourcePlanWidth, depth / sourcePlanDepth, height / sourceWallHeight)`, with a small border reserved for overhang. Never scale axes separately. Body height may finish below the old shell's envelope.
5. If a shape cannot fit, try the next compatible ID in the same stable ordering. Always retain one compact model or the existing procedural shell as a visual fallback. Renderer failures do not remove homes, relocate residents, or change simulation eligibility.
6. Era-specific finish variants remain within the same founding identity; no automatic re-founding or mass rebuilding. Current houses are eight-person abstractions regardless of shape.

## All seven current facility types

Use existing positions, staffing/unlocks, fields, accessibility, and blueprints. Sizes below are **current shell envelopes**, recorded from `game-3d-mesh.mjs`, not new collision rules: farm/market 48 × 43.2, granary 32 × 28.8, other facilities 35 × 31.5. Space compositions still use their existing placement records.

| State key | Composition and verified pieces | Gaps to author or assemble | State contract and entrance |
| --- | --- | --- | --- |
| `lumber` | Low open timber shelter, log yard: `survival/structure`, `structure-roof`, `resource-wood`, `resource-planks`, `tree-log`, `tree-log-small`, `workbench`, `tool-axe` | Assemble/trim shelter, original sawhorse and neatly bounded stack anchors; no sawmill model claimed | One broad yard approach to existing accessible road; keep logs outside corridor. Show static minimum stock unless a read-only existing activity input is available |
| `farm` | Small farmhouse in back corner, adjacent open barn/shelter and field-facing yard: shared home components, `survival/structure`, `structure-roof`, `fence`, `tool-hoe`; `nature/crops_wheatStageA`, `crops_wheatStageB`, `crops_dirtRow`, `crops_dirtRowEnd` | Original long barn shell/roof closure and hay bale; associated fields are clipped terrain geometry, not extra farm tiles | Keep farmhouse/barn within existing shell envelope. Crops only where committed `zoneAt` is `farmland`, dry, clear, and within current farm field sampling neighborhood. `fieldCoverage` supplies coverage, not owned polygons or crop-growth stages |
| `smith` | Open work bay, distinct masonry hearth and tall chimney: Fantasy walls/roof/chimney, `survival/workbench-anvil`, `workbench-grind`, `tool-hammer`, `resource-wood` | Original forge/hearth, dark fuel pile and safe vent; do not pretend anvil alone supplies an entire forge | One work-bay approach. No fire collider, fuel economy, labor change, or emitted-light requirement. Optional capped smoke is decoration only and off at low quality |
| `market` | Three separated stall groups around open crossing: `fantasy/stall`, `stall-green`, `stall-red`, `stall-bench`, `stall-stool`, `cart`, `cart-high`; `survival/box`, `barrel` | Layout/anchors, original sacks and counter goods; muted cloth palette | Founding Charter unlock remains `chapter >= 1`; preserve four-worker target. One primary entry and optional secondary visual portals, all within existing accessible space. No roof enclosing the whole footprint |
| `granary` | Tall boarded store with raised base and loading platform: Fantasy timber walls/roof, `fantasy/planks`, `pillar-wood`, `cart-high`; `survival/barrel`, `box` | Original boarded storage body, loading door, raised dry platform, grain sacks; source domestic door is not a barn loading door | Market Charter unlock remains `chapter >= 2`. Platform approach must connect; steps outside a plot are forbidden. No new storage capacity or stocks invented |
| `plaza` | Open irregular terrain-conforming stone square, optional perimeter `fantasy/stall-bench`; later optional `fountain-round` | Original clipped paving and low edge stones; optional original well, if used instead of fountain | No roof, floor slab floating above hillside, or automatic fountain. Keep access routes open; terrain-following plaza surface is not a single leveled building pad |
| `park` | Landscaped commons, curved paths and perimeter shade: `nature/tree_oak`, `tree_default`, `plant_bush`, `rock_largeA`, `fence_simple`, `fence_gate`; `fantasy/stall-bench` | Original short walking paths and terrain-conforming seat pads; sparse planting anchors | No cottage. Keep lanes clear and preserve tree rules. No new visitor or recreation simulation |

**Farm detail:** `fieldCoverage` currently samples radii 34, 62, and 92 at eight angles. It does not provide an exclusive farm ownership map. Build a read-only display mask from actual farmland and terrain; deduplicate shared rows between nearby farms. Do not invent crop stages from the turn count or paint crops on uncommitted zone previews. Wheat A/B can be static visual variants until a real growth state exists. Exclude source corn, bamboo, and metal survival shelters from the founding historical vocabulary.

**Facility orientation:** existing `buildingBlueprint` is seeded but not door-aware. Prefer an existing permitted road/lane approach found through the current access geometry, keeping the origin fixed. If a direct path crosses an obstacle, suppress that decorative connector and preserve legacy presentation while exposing the gallery failure. No renderer may call a function that adds a lane or changes road connectivity. A gameplay rejection or new pathfinding policy requires a separate engineering/product change.

## Future candidates, catalog-only

| Candidate | Verified pieces or source status | Safe future treatment |
| --- | --- | --- |
| Chapel/church | No chapel file in the inspected shortlist. Fantasy wall/roof/arched pieces exist in full inventory | Original nave, apse/steeple assembly only in an isolated gallery; no religious mechanic or `BUILDINGS` entry |
| Civic hall | Fantasy timber/infill modules; Castle `stairs-stone` | Original larger hall, historically restrained, gallery-only |
| Inn/tavern | Same Fantasy domestic modules | Original multi-bay frontage; no accommodation or trade behavior |
| Windmill/watermill | Exact verified source pieces `Models/GLB format/windmill.glb`, `watermill.glb`, `watermill-wide.glb`, `wheel.glb`, `blade.glb` in full CSV | These are components, not a verified complete operating mill; assembly and hydrology placement need later scope |
| Quarry/stoneworks | `survival/resource-stone`, `resource-stone-large` exist in full CSV | Original rock face/work-yard composition; no extraction type or economy |
| Upgraded shops | Fantasy `overhang`, wall/roof pieces, stalls | Finish/frontage studies tied to existing era, not new commerce rules |
| Civic estate | Castle `tower-square-base`, `tower-square-mid-door`, `tower-square-roof`, `wall-doorway` | Proportion study, never spawn castles into the founding settlement |

## Explicit authoring backlog

Original thatch eaves/courses, clay course treatment, barn and granary closures, loading platform/door, forge/hearth, hay bales, grain sacks, sawhorse, well if chosen, and terrain-clipped plaza/park/path geometry have **no verified finished vendor model** in this research. Codex should author simple original meshes or compose the listed modules. Export each final assembly with its own provenance list, recipe version, texture hash, bounds, entrance markers, and LOD metrics. Original output files remain absent in this research PR by design.

Quaternius is deferred. Its current license and old CC0 pack label conflict for a newly acquired revision; see [evidence](WV-ART-002A-evidence.md). No required current role depends on resolving that source.
