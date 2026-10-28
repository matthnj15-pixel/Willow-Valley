# WV-WORLD-001 — Organic settlement, terrain-aware zoning, farming and paths

**Status:** Product design proposal, for player review. No game behavior implemented by this document.
**Target:** First World vertical slice in `develop`; `main` remains owner-promoted only.
**Companion:** WV-SAVE-001 (three slots and diagnostic journal; specification below until split into its own feature).

## Product intent

Willow Valley is a player-guided, self-organizing settlement, **not a lot-by-lot house placement tool**. The player chooses where development may occur and draws a broad transportation framework. Residents, workplaces, traffic and terrain determine which individual homes, minor neighborhood connections and pedestrian routes emerge. Decisions have understandable, consequential, recoverable outcomes. Rules must run deterministically on the existing offline, turn-based simulation. Visual motion can animate between turns but must never create independent hidden economic ticks.

### Fundamental distinction

- **Player intent:** Paint broad areas; reserve nature; place primary roads and service buildings; manage policy, spending and staffing priorities. **Uniform subdivisions are an optional later unlock**, not a founding-village requirement.
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

## C. Residential demand, homelessness, parcels and organic neighborhoods

### Housing demand decision — vacancies, viable land and two-turn departure

Households have stable IDs, member counts, housing status and arrival/need dates. Existing residents whose house is lost and eligible incoming households use the same occupancy rules. At each monthly turn, resolve in this order:

1. **Available existing housing:** Match households seeking a home with an existing **vacant dwelling that has enough capacity**. Assign occupancy without generating a new house.
2. **Unoccupied valid land within a committed Residential zone:** If no suitable home exists, determine whether a **complete, viable parcel** can be generated inside an eligible zone. If it can, the town may construct on that plot, using material/build-time/road access requirements. Only a real completed dwelling can house the household. A reserved or under-construction plot is not a vacant home.
3. **Unsheltered demand:** If no adequate home is ready—and no viable parcel can be developed, or construction is delayed—the household becomes **homeless**. The game clearly explains the cause (no free homes, no usable residential lots, blocked access, materials, or construction delay); it does **not** automatically demand that the player build arterial roads.
4. **Exactly two further monthly turns:** The first turn where housing need becomes unresolved records homeless age **0**. At the first subsequent turn, if still homeless, age becomes **1**. At the second subsequent turn, if still homeless, the household **leaves the town**; all its residents are removed and immigration attractiveness decreases. Resolving their housing at either opportunity cancels the countdown. Each homeless household tracks its own age; new arrivals do not reset anyone else's clock.
5. **No uncontrolled sprawl outside painted Residential land:** Homelessness does **not** authorize the engine to squat on unzoned land or create emergency homes along desire paths. Players choose permitted development areas; the engine chooses locations *within* them. A preserve, cliff, river, inaccessible steep slope or protected obstacle is never overridden.

**Housing demand dashboard** distinguishes: (a) residents/households requiring housing, (b) vacant existing dwelling capacity, (c) **viable buildable vacant parcels** within committed Residential zones, (d) residential area that is zoned but unsuitable/unserviced, (e) homes planned/under construction, (f) homeless households and countdown, and (g) immigration attractiveness and why it changed. Display actionable shortages based on *what is really missing*; a large green zone with no suitable land must not count as housing capacity.

The town journal and diagnostic log record household-created, vacancy-filled, parcel-reserved, construction-started/completed/blocked, homelessness-started, homelessness-resolved, and homelessness-expired events with reasons, cost and age. Do not spawn people merely because a home is constructed.

### Organic early-settlement parcels, spacing and later formal planning

**Design decision: early-game Willow Valley must NOT generate a uniform subdivision.** The first hamlets grow unevenly and opportunistically, as settlements evolve over time: cottages gather around a useful track, near farms, woodland edges, community wells or a junction; another home may stand farther back across a meadow. Frontage, shape, size and orientation vary because residents respond to topography, available routes and neighbors. The player paints the broad Residential permission boundary and builds the main routes, not repetitive rectangular property lines.

**Procedural residential development operates on irregular, complete land parcels**, not a fixed lot grid or leftover pixels. Boundaries can be trapezoidal, wedge-shaped, curved, multi-sided or asymmetrical. Some houses have generous gardens; others sit in a modest cluster. Their doorways can face a local footpath, a shared yard or an angled approach rather than all aligning square to the main road. Organic does **not** mean overcrowded, random spinning, obstructed access or implausible building collisions.

Initial **world-unit safety envelopes**, based on the current `WORLD={w:1200,h:900}`, and drawn houses of roughly 22×22 units (not real meters):

| Constraint | Initial tuning target | Enforcement |
| --- | --- | --- |
| Cottage physical footprint | Approx. **20–26 × 20–28 world units**, replaced by true 3D model bounds later | Full footprint must fit safe ground and avoid other structures |
| House-to-house breathing room | **At least ~12 world units** clear between occupied building footprints | Apply across neighboring parcels and all orientations |
| Safe pedestrian approach | Continuous, traversable entrance connection to an existing road or emerging local lane/footpath | Cannot cross cliffs, unsafe grades, water or a neighbor's building/yard exclusion |
| Usable living space | House footprint + entrance approach + reasonable clear outdoor space | Reserve the *whole irregular parcel*, not only a building's center |
| Typical early cottage land allocation | **Varied, not a fixed dimension**; begin experimenting around 2,500–5,000 world-unit² where terrain allows | Broader, narrower, deeper or angled sites permitted when safely usable; no universal rectangular width/depth |
| Free natural land | Retain meaningful scattered trees, meadow gaps and communal breathing space | Target roughly 15–25% of suitable gross zone area initially, subject to visual/terrain tuning |
| Gentle slope and preserved features | Suitability checked across foundation and approach, not only center point | Seat foundations on hills; reject cliff edges, water and protected natural obstacles |

Numbers are prototype parameters, **not mandatory repeated frontage or identical 48×60 rectangles**. Minimum fit/safety constraints are hard; lot size distributions, gardening/woodland space and candidate scoring are tunable. Display failed candidate parcels as unsuitable in the zoning view, not as a promise that every pixel will be occupied.

**Early-hamlet procedural layout, in this order:**

1. Find reasonable settlement anchors: accessible existing road/junctions, emerging local tracks, nearby employment, resources and community sites, along with suitable ground. Do not infer formal city blocks from the painted zone boundary.
2. Find a small number of **individually viable sites**, constrained by local slope and landscape. Favor natural bends and low-disturbance ground rather than optimally packing the most buildings.
3. Generate an irregular parcel around each candidate site's real foundation and outdoor use. Site shape follows contours, neighboring routes, trees and other occupied parcels; **reserve the entire parcel and setbacks**.
4. Orient each cottage with a plausible entrance, grade/terrace and relation to its nearest path, while allowing different angles, spacing and variable garden directions. A path can curve organically **toward** houses as destinations emerge; no prerequisite rectangular service grid.
5. Permit homes to arrive **incrementally** as real households need them. Keep open land between clusters and don't "backfill" leftover slivers with miniature cottages.
6. Use reproducible seed and stable IDs for material costs, site scoring, cluster location and walking-access generation. Vary outcomes through environment and household needs, not frame-rate randomness.

**Development phases and settlement character**

| Settlement phase | Built form | Player control |
| --- | --- | --- |
| **Hamlet / early village (default)** | Loose, irregular, different-sized plots, angled cottages, opportunistic clusters, dirt tracks and shared open land | Paint residential intent; provide major connectors and protect scenery |
| **Maturing village** | Some infill and neighborhood strengthening along heavily used paths; paths may be formalized into lanes | Optional policy for street improvement and densification |
| **Planned town (future progression unlock)** | Formal **subdivisions**, repeatable measured lots, straighter rows, regular blocks and higher-density neighborhoods where desired | Player deliberately chooses/plans a subdivision and density policy rather than the game imposing it |
| **Civic town** | Mixed organic historic core plus planned newer districts, with stone streets and municipal oversight | Preserve old character while building formal civic neighborhoods |

**Key visual goal:** A founding village should look like people found good places to live, rather than a property developer divided a polygon into equally spaced lots. New planned districts can appear later, visibly marking the settlement's civic and historical evolution.

**Collision and anti-packing contract:** Validate polygon overlaps (including existing road/path corridors), full parcel reservation, building/model footprint, slope, entrance accessibility and obstacle clearances. The current `occupied()` test using house-center distance alone is inadequate. No site is legal just because there are spare pixels between existing objects. The layout must remain reproducible, while taking advantage of contours and landscape diversity.

### Main roads vs emergent residential paths

**Player-controlled road hierarchy:** Players draw the **arterials and collectors** that form the overall town framework. The settlement should *not* require the player to hand-place every subdivision street or short path.

**Engine-generated neighborhood hierarchy:** Committed Residential land creates demand for **local access** as actual houses and travel destinations develop. The engine can trace narrow **walkable dirt local lanes/footpaths** inside the zone from a collector/arterial, weave around existing plots and terrain, and progressively organize small neighborhood clusters. Desire paths record where actual household trips cut between homes, roads, markets, jobs and parks. A local lane consumes land, affects access and can later be formalized or upgraded by player policy—it is not a free gravel/stone road. Developers must not build a model house without a feasible approach to its entrance.

**Disconnected player road grids:** The same pathfinder may grow route desire lines between isolated grid components and the wider settlement when real pedestrian trips justify them, using safe terrain and permitted crossings. A footpath does not magically make disconnected industry freight routes fully connected. Logs distinguish "neighborhood lane needed", "pedestrian shortcut to disconnected road" and "road network disconnected".

**Important separation:** Desire paths exist because of **movement and road topology**, **not** because the housing shortage timer expired. Homelessness never triggers automatic off-zone sprawl or arbitrary shortcuts. A shortage can increase travel demand indirectly, but the path system is its own subsystem.

Deterministic seed, stable parcel IDs, plausible parcel subdivision, safe grade, landscaping and road proximity all matter. Residential material costs, build delays and allocation policies must be visible in the journal; never consume resources invisibly.

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

**Desire paths:** Generated by actual or estimated household-to-job/market/recreation journeys. Aggregate monthly footfall on a topographic routing graph; avoid buildings, protected habitat (unless walking allowed), cliffs and lakes. Prefer near-direct, safely graded routes within and between emergent residential neighborhoods, across player-authored collectors/arterials and, when real trips justify it, between otherwise disconnected grids. Smooth routing points into organic gentle curves without allowing the smooth curve to cut through blocked cells. Paths are **not** created as a penalty for housing shortages. Persist paths, footfall and cause in the save/journal.

**Visual agents:** Draw a representative subset of sims moving on the same routes during the turn's visual interval. They illustrate monthly traffic; their animation does not change game resources, employment or traffic statistics. Support reduced motion and low-power culling.

**Road material lifecycle:**
- **Dirt:** Nearly free to establish, pedestrian use maintains a recognizable trail. No routine monetary wear/upkeep for ordinary walking. Unused informal trails gradually green over rather than "break". Flooding/major disturbance may create temporary access problems.
- **Gravel:** Faster/more reliable than dirt when maintained; neglect and traffic disperse gravel until the segment **downgrades to dirt**. Condition states and degradation should be visible, not an abrupt invisible change.
- **Stone:** Excellent safety/speed while intact. Deferred maintenance creates cracks, unevenness and slowed traversal; pedestrians may form nearby safer desire paths. Stone **does not simply become dirt**. Repairs need workers and materials.
- **Maintenance:** A road maintenance yard employs residents; work crews automatically prioritize segments based on safety, usage, available budget/materials and player policy. Stone quarry and stone-processing progression should supply upgrades and repairs; no hidden stone costs.
- **Costs & agency:** Never auto-upgrade a public dirt path to gravel or stone and spend resources without an explicit player command/policy. Worn stone must not route through buildings or water when bypassing.

Roads remain persistent editable edges with connectivity; material, condition, traffic and traversability belong to segments. Splitting/removing/reshaping a segment must deterministically split/inherit or invalidate those attributes. Use the existing road graph; do not develop a second competing road topology.

## F. Progression through achievement, not arbitrary turn count

A sample path: **Hamlet** (irregular cottages, shared green space, housing/fields/wood/dirt paths) → **Village** (stable homes, jobs, food surplus, commerce, quarry) → **Market Town** (formal subdivision and denser-district planning **option**, stone infrastructure, maintenance, specialist services) → **Civic Center** (administration, tax office, manor/castle policy tools). Formal street/lot regularity must be an explicit later progression choice, never imposed on the original organic village. Building unlocks reflect needs and prior achievement and present a tangible problem/solution loop. Natural beauty/preserves and mobility matter to attractiveness; poor planning has recoverable consequences.

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
| WORLD-03 | Committed vacant Residential land does not spontaneously create homes without qualified housing demand; the housing dashboard distinguishes vacant dwellings from viable undeveloped lots. |
| WORLD-04 | A proposed cliff/water/preserve house is rejected; a gentle-hill house gets a seated foundation/grade treatment. |
| WORLD-05 | Households first use vacant existing homes, then viable zoned parcels; when unsheltered, they get exactly **two further monthly turns** to find housing, otherwise leave and reduce immigration attractiveness. No off-zone informal housing. |
| WORLD-06 | A farm without eligible linked field emits a prominent actionable alert and zero crop production. |
| WORLD-07 | Farm output responds to valid area, staffing and internal traversal; evaluate 2 small vs 1 large at equal total area, workforce and soil. |
| WORLD-08 | Labor shortage and job shortage are distinguished; auto-staff doesn't fabricate employees; pinned manual overrides survive turns/reload. |
| WORLD-09 | Desire paths connect household destinations, emergent local lanes off player-drawn collectors/arterials, and justified isolated-grid crossings; route around blocked water, cliffs, structures and restricted preserves, respecting grade. Shortage timers never create paths by themselves. |
| WORLD-10 | Representative walking sims use the persisted route without advancing monthly state or changing output at different FPS. |
| WORLD-11 | Dirt walking paths persist under use; gravel can degrade to dirt; neglected stone becomes damaged, incurs reduced travel preference and permits safe bypass. |
| WORLD-12 | Road maintenance consumes real labor, budget/materials, respects priorities, and does not repair disconnected/unauthorized segments for free. |
| WORLD-13 | Three slots are isolated and safely migrate one legacy settlement per environment; no accidental stable-preview cross-save. |
| WORLD-14 | All procedural results are deterministic for a given seed, action stream and turn; event log explains each material effect. |
| WORLD-15 | Complete Node + Playwright suite (mobile portrait, offline startup and reload) remains green; no change is promoted to main without owner PR merge. |
| WORLD-16 | Procedural cottage construction reserves non-overlapping **full irregular parcel polygons** with realistic variable area/shape/angle, safe path access, physical footprint spacing and valid grade; rejected leftover slivers stay unbuildable. No equal rectangular-grid subdivision in the founding hamlet. |
| WORLD-17 | The housing chart reports vacancies, viable vacant lots, zoned-but-unbuildable area and homeless households with independent countdowns; a family housed before its second additional turn does not leave. |
| WORLD-18 | Local residential dirt lanes can self-form from main roads based on travel/terrain, connect naturally grouped irregular cottage sites and consume corridor space; player's arterial/collector hierarchy remains unchanged without their command. |

| WORLD-19 | On a deterministic test terrain with enough demand for multiple homes, a new hamlet generates demonstrably different parcel sizes/shapes/orientations and breathing spaces; regular, repeatable blocks appear only after explicitly unlocked planned-neighborhood policy. |

## I. Implementation slices (working order, not feature priority dictated by graphics)

0. **SAVE-001 safety rail:** three slots, event log, import/export and legacy migration; prove reproducibility.
1. **WORLD-001 terrain and painting prototype:** height/slope/obstacle authoritative data, contour + suitability visualization, touch zone brush and commit, safe region storage. Preserve existing SVG gameplay while prototyping.
2. **WORLD-002 organic routes + visual vertical slice:** seeded terrain/river/trees/first GLB scene, grade-aware collision-free desire paths and a few walking sims; use existing road graph and UI Kit.
3. **WORLD-003 household and housing agency:** real vacancies vs zoned buildable parcels, irregular site-based cottage generation (not grid subdivision), two-additional-turn homelessness expiry and residential development constrained to player-painted zones. Formal subdivision tools are later progression mechanics.
4. **WORLD-004 workforce + farm fields:** plot linking, crop production, smart auto-staff, manual priorities and efficiency/commute trade-offs.
5. **WORLD-005 material infrastructure:** quarry, gravel-to-dirt decay, damaged stone, repair staffing and road upgrades.
6. **WORLD-006 progression + balancing:** clear milestone unlocks, preserve attractiveness, longer-form season/year simulation tests.

**Release discipline:** Each slice gets acceptance tests and a `feature/*` PR into `develop`; user evaluates UAT on preview. The repository owner alone opens the gate by merging a tested production release PR into `main`.

## J. Open tuning decisions (not blockers for terrain/painting prototype)

- Whether housing may appear outside Residential zones during a shortage: **Decided: no.** Residential houses belong in painted Residential zones only; homelessness does not override player land-use intent.
- Whether organic local roads are drawn by the engine automatically or only formed as pedestrian paths unless the player approves a streets policy. **Decision:** local residential dirt access lanes and pedestrian paths can self-form along actual travel demand, while arterials/collectors and durable gravel/stone roads are player-authored or explicitly authorized by policy.
- Which early farm specializations are needed for the first economic balance pass. **Default: grain first**, others as progression content.
- Exact seasonal yield, zoning brush radius, grade thresholds, traffic rates and upkeep values are tunable parameters after playtesting, not hard-coded product truths.

## Existing system baseline (verified on develop)

The current `simulation.mjs` has fixed 12-food farms and 7-wood lumber outputs and automatically places a house/+3 people under happiness and food conditions. Its `housingSite()` samples road-adjacent points and `occupied()` only enforces an approximately 57-unit center-distance exclusion; this is **not a valid parcel-size or frontage model**. It has no worker assignment, field area or household occupancy. `desire-paths.mjs` currently connects orphan roads with straight interpolated lines, without terrain or trip-driven movement. `config.mjs` keeps separate `willow-valley:main:v1` and `willow-valley:dev:v1` saves. We should **evolve these modules with migration/tests**, not erase the road-network work or rewrite the entire economy at once.
