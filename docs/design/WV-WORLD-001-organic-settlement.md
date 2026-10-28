# WV-WORLD-001 — Organic settlement, terrain-aware zoning, farming and paths

**Status:** Product design proposal, for player review. No game behavior implemented by this document.
**Target:** First World vertical slice in `develop`; `main` remains owner-promoted only.
**Companion:** WV-SAVE-001 (three slots and diagnostic journal; specification below until split into its own feature).

## Product intent

Willow Valley is a player-guided, self-organizing settlement, **not a lot-by-lot house placement tool**. The player chooses where development may occur and draws a broad transportation framework. Residents, workplaces, traffic and terrain determine which individual homes, minor neighborhood connections and pedestrian routes emerge. Decisions have understandable, consequential, recoverable outcomes. Rules must run deterministically on the existing offline, turn-based simulation. Visual motion can animate between turns but must never create independent hidden economic ticks.

### Fundamental distinction

- **Player intent:** Paint areas; reserve nature; place primary roads and service buildings; manage policy, spending and staffing priorities.
- **Simulation agency:** Create homes **only when household demand exists**; choose viable plots within permitted zones; trace organic footpaths and neighborhood layout from real travel.
- **Hard limits:** No cliffside houses, development in water/blocked terrain, industry through protected habitat, unauthorized gravel/stone spending, or buildings generated to invent population.
- **Reporting:** Every material simulation choice should have a visible reason in the town journal and be reproducible in a diagnostic log.

## A. Zoning brush: land permission, not instant construction

Four initial zoning categories:
1. **Residential:** Permits organically placed houses/household development. A committed residential area stays empty until there is demand, materials and viable land. Houses have capacity, occupied count and persistent location; households do not appear solely because a house was built.
2. **Commercial:** Reserves eligible ground for shops/markets/services when corresponding mechanics unlock. No unsupported spontaneous commercial production in the first vertical slice.
3. **Agricultural fields:** Paint soil usable by a selected farm building. Fields are a farm's working area, not a proxy for instantly generating workers or food.
4. **Nature preserve:** Protects trees, natural beauty and terrain against procedural buildings and neighborhood road creation. Desire paths may only traverse if an explicit preserve policy permits walking; never clear protected objects silently.

**Interaction contract:** Enter Zone Paint mode, choose a category and brush radius, paint with one finger, use two fingers for map pan/pinch, and expose Undo / Erase / Cancel / Commit controls. Maintain the 44px touch contract and an intelligible, subtle overlay distinct from world model colors. Show live area, slope and obstruction feedback. Commit persists a zone polygon/paint mask; no uncommitted action affects simulation. Undo and zone editing must not break previously occupied sites. Avoid making the brush stroke itself an authored road or house-placement action.

**Geometry:** Persist region IDs, type, polygon/mask, owner/field link when applicable, plus a deterministic tie-break. Prevent incompatible overlapping zones and explain rejected portions. Existing buildings may be grandfathered rather than silently demolished when zones are edited. Distinguish visible permitted area from actually **buildable** area after slope/obstacle/access analysis.

## B. Terrain, beauty and 3D world contract

The terrain and simulation must share **one authoritative elevation/obstacle representation**, sampled in world X/Y coordinates regardless of SVG, Three.js or another renderer.

- Heightfield (deterministic seeded map or saved map), per-cell slope, water body/lake/river boundaries, banks, rock outcrops, cliffs, vegetation and no-build footprints.
- Gentle rolling hills can receive procedural foundation steps/limited cut-and-fill. Steep slopes/cliff edges, unstable ground, shore buffers and impassable obstacles are rejected for housing and field construction with explicit explanations.
- Buildings orient and seat their foundations against the ground; do not float, bury roofs or flatten entire hills indiscriminately. Fields follow terrain where farming is feasible, with slopes decreasing viability.
- Paths conform to grade and avoid unsafe slope, water and immovable trees/structures; use crossings only where a legitimate bridge/ford route exists.
- The first 3D vertical slice should demonstrate terrain contours, preserved trees, a river, one road corridor, painted residential land, a farm with fields, and a few walking residents using actual route geometry. Use Kenney kits with their authored world colors; UI colors remain independent.
- Retain a lightweight no-WebGL/fallback and handle low-end mobile performance. Never tie monthly economy outcomes to frame rate or rendered agent count.

**Suggested modules:** `terrain.mjs`, `zones.mjs`, `land-suitability.mjs`, `route-planner.mjs`, `world-renderer.mjs`; feature flags isolate prototypes while retaining v1 saves. These names are an architecture sketch, not files already implemented.

## C. Organic residential neighborhood generation

1. Compute households, people per household, vacancies and immigration pressure separately.
2. Demand for homes originates from real population pressure / eligible incoming families, not a blind per-turn house generator.
3. The engine searches **inside committed Residential zones** and assesses footprint, slope, rivers, preserve boundaries, access, adjacency, beauty, available logs/tools and town construction policies.
4. The player authors the broad road backbone. The game may organically trace **minor dirt access paths** and lot approaches within Residential zones without spending valuable gravel/stone or bulldozing protected terrain. These are not free full-quality roads; their pedestrian access has real limitations. Expose a settlement policy for how aggressively organic local access may develop.
5. When valid plots and materials exist, houses grow incrementally and are assigned occupants from real households; vacancies may persist but do not themselves generate people.
6. If housing is needed and usable plots/access are insufficient, show an actionable request: draw more Residential land, provide a reachable corridor, or address slope/material constraints.
7. **Three monthly-turn grace period** from first unresolved need: escalating prompt; on expiration, eligible households may seek informal housing/footpaths **only in permitted, suitable ground** or leave. Departures/failed migration reduce immigration attractiveness. Do not place houses on cliffs, water or preserves as a shortcut.
8. Keep the outcome understandable (e.g. "2 families left: no reachable residential land" or "new cottages settled beside a worn trail"). In-migration attractiveness changes future arrivals, not a magic population rollback.

The initial neighborhood generator should optimize for natural variation without endless randomness: reproducible seed, sensible spacing, road proximity and site qualities. Never consume reserves invisibly; residential build costs and allocation policy must be exposed and logged.

## D. Working farms and labor economics

- Building a farm **without assigned farmland** raises an explicit persistent alert: "This farm needs fields." A farm generates no crop harvest merely by existing; the player paints eligible Agricultural area associated with the building.
- Fields have real area, fertility, slope, season/weather factors, distance from farm center, optional type (grain/vegetable/orchard/livestock are future balancing candidates), and accessible walking routes.
- Field area sets **potential** output and staffing capacity. Output uses actual assigned labor, effective reachable area, commute/internal walking distance, season and soil; excess acres with too few hands are underused. Larger fields generally take more workers and increase operating costs.
- **Two small farms should usually be more labor-efficient and responsive than one sprawling farm of the same total acreage and workforce**, because traversal time inside the field is shorter. A large farm still trades that against lower overhead per acre and fewer buildings. Target balance can begin with a measurable 10–20% small-farm yield/worker advantage under equal soil and workforce, then tune using multi-year simulations; this is a **design target, not an implemented formula or guaranteed outcome**.
- Auto-staff by default from the **eligible labor pool**, using skill/priority, travel feasibility, productivity and open positions rather than first-come-first-served arrival. Players can lock manual assignments, set priority and override. Never staff more employees than exist.
- Distinguish labor alerts:
  - **No unemployed workers while openings remain:** labor shortage, warn "Unfilled jobs—attract more workers or reassign staff."
  - **Unemployed workers while job openings are scarce:** job shortage, warn "Residents need more workplaces."
- Families moving in do not automatically jump to the front of the assignment queue. Commuting distance should matter, but not make a remote worker impossible when other constraints allow.
- Track wages and farm upkeep even during underproduction. Do not create a loop where splitting a farm into limitless tiny facilities wins without trade-offs.

## E. Desire paths, traffic, material wear and visual walkers

**Desire paths:** Generated by actual or estimated household-to-job/market/recreation journeys. Aggregate monthly footfall on a topographic routing graph; avoid buildings, protected habitat (unless walking allowed), cliffs and lakes. Prefer near-direct, safely graded routes. Smooth routing points into organic gentle curves without allowing the smooth curve to cut through blocked cells. Persist paths, footfall and cause in the save/journal.

**Visual agents:** Draw a representative subset of sims moving on the same routes during the turn's visual interval. They illustrate monthly traffic; their animation does not change game resources, employment or traffic statistics. Support reduced motion and low-power culling.

**Road material lifecycle:**
- **Dirt:** Nearly free to establish, pedestrian use maintains a recognizable trail. No routine monetary wear/upkeep for ordinary walking. Unused informal trails gradually green over rather than "break". Flooding/major disturbance may create temporary access problems.
- **Gravel:** Faster/more reliable than dirt when maintained; neglect and traffic disperse gravel until the segment **downgrades to dirt**. Condition states and degradation should be visible, not an abrupt invisible change.
- **Stone:** Excellent safety/speed while intact. Deferred maintenance creates cracks, unevenness and slowed traversal; pedestrians may form nearby safer desire paths. Stone **does not simply become dirt**. Repairs need workers and materials.
- **Maintenance:** A road maintenance yard employs residents; work crews automatically prioritize segments based on safety, usage, available budget/materials and player policy. Stone quarry and stone-processing progression should supply upgrades and repairs; no hidden stone costs.
- **Costs & agency:** Never auto-upgrade a public dirt path to gravel or stone and spend resources without an explicit player command/policy. Worn stone must not route through buildings or water when bypassing.

Roads remain persistent editable edges with connectivity; material, condition, traffic and traversability belong to segments. Splitting/removing/reshaping a segment must deterministically split/inherit or invalidate those attributes. Use the existing road graph; do not develop a second competing road topology.

## F. Progression through achievement, not arbitrary turn count

A sample path: **Hamlet** (housing/fields/wood/dirt paths) → **Village** (stable homes, jobs, food surplus, commerce, quarry) → **Market Town** (stone infrastructure, maintenance, specialist services) → **Civic Center** (administration, tax office, manor/castle policy tools). Building unlocks reflect needs and prior achievement and present a tangible problem/solution loop. Natural beauty/preserves and mobility matter to attractiveness; poor planning has recoverable consequences.

## G. Save slots and diagnostics — protective prerequisite

Before schema-heavy world changes:
- Provide up to **three named, independent settlement slots**, each with autosave, export/import, last played/turn metadata and deliberate overwrite confirmation.
- **Non-destructive migration** of the current local `willow-valley:dev:v1` and `willow-valley:main:v1` legacy saves into the corresponding environment's first slot. Do not silently erase a save or cross-import production and preview namespaces. Preserve original data until an upgraded save is verified.
- Store structured, bounded events: `player_action`, `turn_begin/end`, `construction`, `zone_committed`, `housing_demand`, `house_placed/blocked`, `immigration`, `staffing`, `production`, `path_formed`, `road_condition`, `save_migration` and `exception`. Include turn, stable IDs, inputs, reason and resulting state changes where relevant.
- Offer **Town Journal** (understandable game events) and **Export Diagnostics** (machine-readable events + save schema + deterministic seed/engine version) to reproduce bugs. Default to device-local. Export is optional and user initiated; do not introduce network telemetry or expose sensitive browser data.
- Autosave should be transactional enough that failures cannot overwrite all three slots; test interrupted writes and corrupted input.

## H. Testable acceptance criteria

| ID | Required behavior |
| --- | --- |
| WORLD-01 | One-finger strokes edit preview zone geometry; two-finger navigation continues; Cancel makes no persistent changes; Commit persists shape after reload. |
| WORLD-02 | Four zone types have distinguishable overlays, editable boundaries and deterministic overlap rules. |
| WORLD-03 | Committed vacant Residential land does not spontaneously create homes without qualified housing demand. |
| WORLD-04 | A proposed cliff/water/preserve house is rejected; a gentle-hill house gets a seated foundation/grade treatment. |
| WORLD-05 | Families facing shortages receive a 3-turn escalation; additional housing, informal settlement or departure has journaled reasons; immigration attractiveness responds. |
| WORLD-06 | A farm without eligible linked field emits a prominent actionable alert and zero crop production. |
| WORLD-07 | Farm output responds to valid area, staffing and internal traversal; evaluate 2 small vs 1 large at equal total area, workforce and soil. |
| WORLD-08 | Labor shortage and job shortage are distinguished; auto-staff doesn't fabricate employees; pinned manual overrides survive turns/reload. |
| WORLD-09 | Desire paths route around blocked water, cliffs, structures and restricted preserves while respecting grade; optional smoothing never reintroduces collision. |
| WORLD-10 | Representative walking sims use the persisted route without advancing monthly state or changing output at different FPS. |
| WORLD-11 | Dirt walking paths persist under use; gravel can degrade to dirt; neglected stone becomes damaged, incurs reduced travel preference and permits safe bypass. |
| WORLD-12 | Road maintenance consumes real labor, budget/materials, respects priorities, and does not repair disconnected/unauthorized segments for free. |
| WORLD-13 | Three slots are isolated and safely migrate one legacy settlement per environment; no accidental stable-preview cross-save. |
| WORLD-14 | All procedural results are deterministic for a given seed, action stream and turn; event log explains each material effect. |
| WORLD-15 | Complete Node + Playwright suite (mobile portrait, offline startup and reload) remains green; no change is promoted to main without owner PR merge. |

## I. Implementation slices (working order, not feature priority dictated by graphics)

0. **SAVE-001 safety rail:** three slots, event log, import/export and legacy migration; prove reproducibility.
1. **WORLD-001 terrain and painting prototype:** height/slope/obstacle authoritative data, contour + suitability visualization, touch zone brush and commit, safe region storage. Preserve existing SVG gameplay while prototyping.
2. **WORLD-002 organic routes + visual vertical slice:** seeded terrain/river/trees/first GLB scene, grade-aware collision-free desire paths and a few walking sims; use existing road graph and UI Kit.
3. **WORLD-003 household and housing agency:** vacancy/household simulation, zoned development, three-turn pressure and informal paths.
4. **WORLD-004 workforce + farm fields:** plot linking, crop production, smart auto-staff, manual priorities and efficiency/commute trade-offs.
5. **WORLD-005 material infrastructure:** quarry, gravel-to-dirt decay, damaged stone, repair staffing and road upgrades.
6. **WORLD-006 progression + balancing:** clear milestone unlocks, preserve attractiveness, longer-form season/year simulation tests.

**Release discipline:** Each slice gets acceptance tests and a `feature/*` PR into `develop`; user evaluates UAT on preview. The repository owner alone opens the gate by merging a tested production release PR into `main`.

## J. Open tuning decisions (not blockers for terrain/painting prototype)

- Whether informal settler houses can appear outside Residential zones under an explicitly permitted crisis policy. **Default proposal: no**, except unzoned permissive land; never in nature preserves or unsafe terrain.
- Whether organic local roads are drawn by the engine automatically or only formed as pedestrian paths unless the player approves a streets policy. **Default: pedestrian/dirt paths can self-form; durable roads are player-authored.**
- Which early farm specializations are needed for the first economic balance pass. **Default: grain first**, others as progression content.
- Exact seasonal yield, zoning brush radius, grade thresholds, traffic rates and upkeep values are tunable parameters after playtesting, not hard-coded product truths.

## Existing system baseline (verified on develop)

The current `simulation.mjs` has fixed 12-food farms and 7-wood lumber outputs and automatically places a house/+3 people under happiness and food conditions. It has no worker assignment, field area or household occupancy. `desire-paths.mjs` currently connects orphan roads with straight interpolated lines, without terrain or trip-driven movement. `config.mjs` keeps separate `willow-valley:main:v1` and `willow-valley:dev:v1` saves. We should **evolve these modules with migration/tests**, not erase the road-network work or rewrite the entire economy at once.
