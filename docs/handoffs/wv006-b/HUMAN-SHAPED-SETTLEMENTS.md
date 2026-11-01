# Human-shaped settlements — period and Foundation research

Research date: 2026-11-01. Code baseline: develop `dfce32070078ffed319edb859c320e9a568ec7d4`. This is a research and design brief; no generator, simulation, renderer or save behavior is changed.

User direction: the individual parts are promising, but the wide composition needs the detail and coherence of a village whose inhabitants have shaped its immediate surroundings. Foundation is the gameplay/composition reference. Early Renaissance rural life is the historical research direction.

## Recommended frame

For Willow Valley's established timber/plaster vocabulary, use **a fictional northern European valley around 1450–1550**, with regional references identified rather than blended into a supposedly universal Renaissance village. This is a proposed art window. The National Gallery of Art places the Northern Renaissance across a broader 1450–early-1600s span in parts of continental northern Europe [1]. English late-medieval/early-Tudor farmsteads are useful material and land-use references, not evidence that all northern European settlements shared one plan. Foundation explicitly describes itself as a medieval game [2].

The central change is to generate a connected inhabited landscape: approach, threshold, yard, garden, field access, boundaries, useful open spaces and a managed settlement edge. The house mesh occupies one part of that holding.

## Research findings and their limits

**Household land is a useful composition unit.** Historic England describes house/outbuilding plots (tofts), with cultivation and other work in associated rear ground (crofts). It records both compact villages and dispersed farms/hamlets, with substantial regional variation [3]. Design inference: give land around a dwelling a purpose and a relationship to its public entrance before selecting decorative clusters.

**Domestic growing areas belong close to dwellings.** Bayleaf's early-15th-century house is interpreted by the museum around 1540. Its reconstructed setting includes household growing ground, fruit trees and managed wooded boundaries [4]. These surroundings are researched interpretations; the museum acknowledges sparse evidence for rural farmhouse gardens. Use this as a grounded reference, not a template for identical fenced gardens at every cottage. The pictured hall-house also represents a particular household's means, not a universal starter home.

**Working yards have distinct functions.** Cowfold's barn, dated around 1536, is presented beside cattle and stack yards [5]. Design inference: farm, smith and lumber compositions should have different ground use, circulation and storage spaces. A useful empty loading area is detail. Prop quantity alone does not establish activity.

**Historic settlement form can include order.** Wharram Percy has planned rows and less regular holdings [6]. Its early layout predates the proposed art window. It demonstrates inherited structure and variation, not a new Renaissance layout recipe. Historically convincing growth can follow a straight existing route; random bends and rotations are not evidence of settlement history.

**Foundation ties growth to player intent and inhabitants' needs.** The publisher emphasizes gridless development, painted land permissions and free-form building [2]. Its official housing documentation links new homes to residential permission and work proximity [7]; its zone documentation distinguishes housing, fields, woodland extraction and restricted ground [8]. Borrow those relationships and the visual readability of their consequences. Exact distances, capacities, costs, progression, art and proprietary generation algorithms are not Willow Valley specifications.

## Visual reference observations

Inspected the official Foundation screenshot [9] and the museum's Bayleaf garden photograph [10]. Images remain reference links; no third-party image is added to the game or repository.

In Foundation's screenshot, paths connect visible destinations and widen at activity points; buildings define openings and corners; green areas are bounded by roads, walls or gardens; trees give shade and enclosure at particular places. This is an observation of one staged game image, not proof of its generator implementation or an archaeological survey.

The Bayleaf photograph shows growing beds, access openings, boundary planting and a worn approach within the same immediate house setting. Its value is the relationship among these elements. The photograph records a modern museum reconstruction.

## What the current code actually does

- `settlement-render-fixtures.mjs:2–12` supplies the landscape gallery's wide scene: a fixed column/row layout with positional jitter, square parcels, a lane per row and workplaces in a separate row. This is a rendering benchmark, never a save or an example of the actual growth algorithm. Keep it for repeatable cost comparisons; stop using it as the village-composition acceptance image.
- `organic-world.mjs:165` already creates varied polygonal parcels aligned loosely to roads. `findCottageSite` at line 356 checks residential permission, safe parcels, access and foundations. This is useful existing machinery to evolve.
- Its score at line 374 prefers a common nearest-house distance of 125 game units, alongside path distance, slope and a random term. This is a possible contributor to even spacing; measure it with real growth snapshots before changing it. There is no single historically correct replacement distance.
- `terrain-classification.mjs` classifies natural ground from woodland, water, altitude and noise. It has no household garden, working-yard or settlement-use input. A human land-use layer would complement that existing natural ground classification.
- B's `assets/wv/landscape-next/fixtures.mjs` conservatively excludes 44×44 units around homes and 65×65 around workplaces in the benchmark, then supplies a broad meadow permission region. This is a clearance demonstration. It does not compose household yards/gardens or describe exact transformed building envelopes.
- `desire-paths.mjs` already contains deterministic connectivity work. It does not establish a complete household trip/footfall simulation. Do not claim traffic wear is simulated merely because a path has been drawn.

The old organic-world design document contains historical implementation-status paragraphs. Current source is authoritative; this brief does not repeat those older paragraphs as current facts.

## Settlement rules to take into the next implementation

| Scale | Required relationship | Visible result |
| --- | --- | --- |
| Valley | Existing terrain, water, resources and protected land constrain founding. | A plausible place to settle, with useful dry access. |
| Village | Existing routes and a shared destination organize the first cluster. | A legible center and meaningful approach, with different density at the edge. |
| Holding | Frontage, door, yard, growing/work ground and service access form a usable parcel. | Buildings belong to distinct inhabited places. |
| Work area | Loading, outdoor work and storage follow each existing workplace's function. | Smith, farm and lumber read differently even without labels. |
| Ground | Permitted paths, thresholds and activity areas supply continuous use shapes. | Worn approaches and working surfaces with soft, uneven transitions. |
| Vegetation | Declared land use determines placement and omission. | Small cover at quiet edges; tended plots; open working ground; retained woodland beyond. |
| Time | New development responds to existing plots/routes and actual committed changes. | Early lanes, gates and important trees remain recognizable as the village grows. |

These are Willow Valley design recommendations, not measured universal historical rules. A small holding can have an open yard while another has a garden; a farmstead can have several distinct yards. Domestic plots, fields and woodland edges should not all receive the same hedge, grass ring or scattered ornament.

## Implementation boundary and order

1. **A composed reference hamlet.** Build a detached 12-home review with an approach, small public space, two uneven clusters, an edge workplace, working/growing ground and transition to fields/woodland. Use current functional roles. Produce 4/12/30-home snapshots of the same intended settlement history. Counts are review targets, not history or gameplay rules. Review normal mobile town zoom and close views before treating the grammar as approved.
2. **A read-only settlement land-use plan.** F can adapt real committed parcels, entrances, roads, fields, water and protected land into semantic regions for approach, active yard, quiet margin and existing cultivation. Feed the same regions to surfaces and landscape placement so bare ground and vegetation agree. Recompute on relevant state revisions, not camera motion. A conservative whole-yard exclusion is a fallback until access/envelopes are known.
3. **An authorized growth-system change.** A separate simulation/input handoff should evolve candidate selection into frontage/holding relationships, access networks and incremental infill. It must retain existing land-use permissions, safe foundations, deterministic results and saved plot identity. Renderer composition must never call state-initializing helpers to manufacture that history.
4. **Actual landscape management.** Tree clearance, productive household gardens, planted orchards, persistent boundaries, drainage/earthworks and traffic-driven change require explicit gameplay/persistence design where they affect rights, resources, routes or saves. A presentation mask cannot erase an authoritative tree or confer a crop yield. Keep Nature Preserve restrictions and the existing three-slot migration guarantees.

The first visual work can use existing permitted open ground. Real clearing cannot be approximated by hiding protected trees or reseeding the forest. Reference fruit trees and garden plants may require additional scoped assets; the current young oak is not an apple orchard.

## Acceptance for the next village review

- With labels hidden, the approach, public center, residential holdings, working yards, cultivated land and woodland edge are readable at normal mobile zoom.
- Every dwelling has a connected, unobstructed entrance and a usable relationship to its surrounding ground. Access gaps correspond to actual gates/routes.
- A retained open space has a purpose: circulation, common use, garden, field, work or habitat. The generator does not fill every gap with foliage.
- Grass and shrubs respond to land use; there are no universal ornamental rings or all-meadow flower scatter. Bare ground follows permitted activity shapes rather than uniform circles.
- Roof orientation, spacing and parcel form respond to frontage and terrain. Do not meet “organic” acceptance by applying noise to rows.
- Compare 4/12/30-home growth snapshots and actual saved generator output separately from the existing 30/100-home performance fixture. Preserve older geometry and identities; evaluate alternative settlement patterns across seeds.
- Keep the existing complete gameplay/save/offline and 30/100-home performance gates. New detail must remain useful at low quality and must not require high camera visibility to keep the village coherent.

## Sources

1. [National Gallery of Art — The Renaissance in the North](https://www.nga.gov/exhibitions/renaissance-north-new-prints-and-perspectives): period and regional framing, not a settlement plan.
2. [Foundation — publisher's current game description](https://store.steampowered.com/app/690830/Foundation/): gridless development, painted permissions and player agency.
3. [Historic England — Medieval Settlements](https://historicengland.org.uk/images-books/publications/iha-medieval-settlements/heag210-medieval-settlements/), especially PDF pages 3–6: regional form, tofts/crofts and settlement history.
4. [Weald & Downland Living Museum — Bayleaf Farmstead](https://www.wealddown.co.uk/buildings/bayleaf-farmstead-chiddingstone/): building dates, interpretation around 1540, garden/orchard/shaw context and reconstruction limitations.
5. [Weald & Downland Living Museum — Barn from Cowfold](https://www.wealddown.co.uk/buildings/barn-from-cowfold/): c.1536 barn and distinct farmyard functions.
6. [English Heritage — Wharram Percy description](https://www.english-heritage.org.uk/visit/places/wharram-percy-deserted-medieval-village/history/description/): planned and less regular holdings, with separate chronological phases.
7. [Official Foundation Wiki — Housing](https://wiki.polymorph.games/foundation/House): relationships between residential permission, work proximity and housing. Version-sensitive game rules are not copied into Willow Valley.
8. [Official Foundation Wiki — Zones](https://wiki.polymorph.games/foundation/Zones): distinct land uses and boundaries.
9. [Polymorph Games — official Foundation screenshot](https://www.polymorph.games/foundation/img/screenshot/03.jpg): visual reference only; not claimed as historical evidence.
10. [Weald & Downland — Bayleaf garden photograph](https://www.wealddown.co.uk/wp-content/uploads/2020/12/Bayleaf-garden.jpg): modern reconstructed setting, not a surviving 1540 garden.

No gameplay changes or new asset-adoption claim are made by this research brief.
