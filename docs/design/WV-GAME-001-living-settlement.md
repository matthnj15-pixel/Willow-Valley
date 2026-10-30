# WV-GAME-001 | The Living Settlement

**Status:** Implemented on feature branch, pending automated and device UAT.
**Scope:** First long-form gameplay slice, intended for roughly 15–30 carefully played monthly turns; duration depends on player pace.

## Iteration and selection

1. **Production machine** (Anno-like). Strong economic causal chains; rejected as a standalone approach because assigning every worker and tracking dozens of commodities would detract from organic planning.
2. **Council dilemmas** (Against the Storm-like). Strong decisions and shorter-term pressure; rejected alone because Willow Valley should retain a persistent evolving landscape rather than discard settlements after short missions.
3. **Living Settlement** (selected): Foundation-style organic parcels, Manor Lords-style real household and field needs, Anno-style interdependent output, and meaningful council decisions, with milestone-led progression.

## Play loop

**Inspect** the Council's forecasts and status. **Plan** zoning, roads, a strategic building, and one of three workforce priorities. **Commit** land works and policy changes. **Advance one month**. **Review** labor usage, food produced/consumed, winter pressure, road access, taxes and upkeep, housing growth, and events. **Adapt** to shortages, opportunities, and advancing charters.

The world remains persistent and gridless. Households occupy vacant housing first, then develop irregular parcels inside residential permission zones, and otherwise become homeless. An unresolved homeless family departs after two further monthly turns. The living economy must never create houses outside permitted residential land.

## Concrete mechanics

- **Food:** Farm production depends on season, road deliveries, staffed workers, and nearby painted farmland. A charter only counts farmland that contributes to an actual farm. The Council displays stored food in months of consumption without new harvests. The founding farm can still forage before fields exist at a low yield, protecting existing save games. Subsequent farms produce poorly without zoned fields.
- **Labor:** Each month 50% of residents are available workers; workplaces staff automatically according to Food, Balanced, or Materials priority. Extra buildings create real vacancy and upkeep risk.
- **Taxation:** Gentle (0.70x and +1 morale), Balanced (1.0x), or Heavy (1.45x and -3 morale).
- **Rations:** Careful (0.8x consumption and -2 morale), Normal, or Generous (1.25x consumption and +2 morale).
- **Roads:** Industries require connected deliveries, housing uses road/footpath service tiers, and road length creates upkeep. Disconnected industry still incurs upkeep.
- **Trade:** One buy/sell caravan transaction per month with fixed, shown resource costs. The Trade Guild permanently discounts imports.
- **Milestones:** At ~38 residents and secure provisions/fields, choose the Founding Charter to unlock Commercial marketplaces. At ~54 residents and sustained stability, claim a Market Charter to unlock granaries. At ~75 residents and civic investment, secure a borough charter. Each time, choose an exclusive permanent specialization.
- **Granary:** A staffed granary reduces food consumption/waste by 9%, up to an 18% cap, and requires workers and upkeep.
- **Events:** Persistent petitions begin at month 4, 10, 18, and 28. Decisions visibly trade treasury and resources for morale, appeal, or future development.
- **Housing:** Resident appeal and morale affect family arrival frequency: 1 family/month for high appeal and morale, 1 every 2 months for a healthy village, or 1 every 3 months for a struggling village. Immigration pauses below minimum thresholds. Arrival acceleration makes attractive towns harder to house and feed. Existing demand-first organic cottage and desire-path behavior stays intact. The Neighbors' Promise charter reduces future cottage costs from 45 to 35 gold.
- **Saves:** Original version 1 remains; missing civic state gets deterministic defaults. Existing three slots, snapshots, import/export, and journal remain intact. All outcomes resolve per month, not per 3D animation frame.

## First-session playtest guide

1. Study food and workers in Council Economy, paint a generous Farmland zone beside the founding farm, then advance two months.
2. Paint a suitable Residential region near the road, observe households use existing vacancies first, then form a new irregular cottage with a footpath.
3. Observe what happens if you expand workplaces faster than available labor; change the labor priority to counter the bottleneck.
4. Reach the Founding Charter, select either Commons or Working, paint a Commercial zone, and place a marketplace.
5. Approach winter with inadequate food, use rationing, winter purchases, fields, or public provisions; monitor morale and appeal.
6. Resolve Council petitions and use trades to recover from a shortage.
7. Grow toward the Market Charter and build a granary; verify that it consumes workforce but decreases food use.
8. Save, reload, and verify the same state, policies, buildings, roads, fields, and seasonal report survive.

**Later milestones:** modular landmark monuments, upgraded road surfaces, detailed travel-time economy, progressive neighborhood densification, richer commercial activity and goods tiers, dynamically generated petitions, and event variation tied to seed. These are intentionally outside this vertical slice.
