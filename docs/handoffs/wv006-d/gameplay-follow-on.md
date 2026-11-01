# D → next gameplay round: storage and trade

Status: proposal only. No capacity, worker, resource, policy, unlock or save rule is implemented by WV-ART-006 D. Final values and behavior wait for the next gameplay round.

## Current authority and compatibility

`simulation.mjs` keeps settlement-wide `food`, `wood` and `tools` totals. `settlement-play.mjs:trade` applies explicit caravan offers to those totals, permits one trade per current turn via `civic.lastTrade`, checks affordability and protects the existing sell-food reserve. `BUILDINGS.granary` is the existing food-reserve building; it is not a general per-building inventory ledger. This art study cannot infer building stocks from any of these totals or from the current turn.

Recommend granaries for food and warehouses for materials/manufactured goods in the future. That split requires an explicit compatibility decision for current granaries, production buffers, reserve displays, caravan offers and legacy totals. It does not authorize reclassifying current goods or adding new resource keys. Existing food stays available under existing rules until that migration is designed and tested.

## Ownership and source of truth

Choose one authoritative ledger before adding policy code. Recommended candidate: settlement resource totals remain authoritative during transition; per-location allocations and in-transit records must reconcile to them. Never add warehouse allocations to the same totals a second time. An alternative location-owned ledger requires every existing production, construction, consumption, petition and trade path to be migrated together. Do not maintain two independently writable sources of truth.

Specify resource identity, owner, source location, destination reservation, transit identity and outstanding commitments. Define whether a reserve is physically local or a settlement-wide commitment. Held, available, reserved, overflow and in-transit quantities need distinct meanings. Presentation derives immutable view data; it must not settle inventory or trade transactions.

## Capacity and producer buffers

Choose units explicitly: weighted cargo volume, slots, mass or abstract points. The study's 100/240 cargo points and two/four workers are illustrative, not measurements or balance decisions. Define stack divisibility, mixed-goods weights, rounding, capacity reservations and whether protected stock consumes capacity (recommended yes). Do not equate visual cubic metres with game capacity.

Define producer output buffers separately from warehouses. If destination capacity is full, pause or retain output in a bounded producer buffer with a visible blocked reason. Do not silently discard output or materials already consumed. Decide whether a job can start without reserving output space. Reassignment, demolition and loss of road access must release reservations or move goods into explicit overflow. Reject destructive operations that cannot account for held stock.

## Workers, transport and road access

Choose staffing assignment, wages/upkeep, dispatch frequency, load size, carry time and route ownership together. A road connection must be validated through the existing road authority and the building's personnel/cargo approach, not visual distance alone. Cargo door clearances are art metadata, not a route graph. Workers and transport should report blocked, waiting and travelling states; decorative people/carts never supply jobs or freight.

No background economic ticks are authorized. Define transport resolution within the game's explicit turn model, including unreachable destinations, route changes and interrupted journeys. A merchant presence is finite and separate from local transport availability. Goods do not teleport merely because a mock target changed.

## Resolution order, reserves and merchant limits

Before implementation, select and test a deterministic order for existing local consumption, construction commitments, producer inputs/outputs, transport arrivals and manual/automatic trade. Candidate order for review: settle prior transit arrivals; protect local consumption/construction reserves; allocate production inputs and reserve output capacity; resolve production; plan transport; consider merchant trades against uncommitted stock and space. This order is a proposal, not a change to current monthly resolution. Preserve current outcomes until a gameplay change is explicitly accepted.

Keep must be the migration and new-building default. It holds for local consumption/construction and initiates no policy trade. Import buys toward a reserve target only with an available merchant, funds, supply and reserved destination capacity. Export sells only uncommitted stock above its protected reserve target. Balance imports below a minimum and exports above a higher maximum; reject equal/reversed bounds to prevent oscillation. Specify settlement-wide versus location-local reserve precedence and allocation fairness. Turning acceptance off prevents new deliveries; it never erases held goods or implicitly switches the trade policy.

Keep caravan supply, buying demand, freight capacity, visit duration and offer prices finite. Policies do not guarantee a merchant, unlimited supply, a price or instant delivery. Explicit manual offers should remain available with their current limits until an intentional replacement is approved. Prevent manual and automated orders from double-spending the same stock, gold or merchant allowance.

## Import/export accounting

Use atomic, uniquely identified transactions with separate quote, reservation, dispatch, delivery and cancellation rules. Debit/credit goods and gold exactly once; specify when each changes ownership. Record gross quantities, unit price, fees, transport cost, refunds and final deltas. Decide affordability before commitments, protect reserves after all commitments, and keep an auditable report. No negative quantities, duplicate deliveries, stock creation on reload, or repeated sale revenue. Failed/partial delivery must reconcile reservations and refunds explicitly.

## Save migration and no-loss rule

Version the later schema; all three slots and offline saves must load deterministically. **Existing goods must never disappear because new capacity is insufficient.** Retain legacy stock in explicit settlement overflow or grandfathered unassigned storage. Overflow remains consumable/allocatable and visible, and does not trigger forced export. Never invent warehouses, resize plots, deduct construction costs, change founded eras or place goods on arbitrary buildings during migration.

New policies default to Keep, with automated orders absent. Preserve existing manual-trade turn flags and balances. Define old-client compatibility or a clear schema-version barrier. Round-trip legacy/current saves, insufficient-capacity saves, zero-warehouse towns, road-disconnected stores, partial transport, full producers, mixed capacity units, repeated load/resolve, demolition and interrupted offline saves. Compare conservation of every existing resource and gold before and after each migration and transaction.

## Integration gate

F may exhibit candidates in a read-only review settlement. F must not register a playable warehouse, infer per-building stock, auto-run trade, introduce construction durations or migrate saves from this art package. Gameplay implementation requires a separate accepted spec and conservation/migration tests.
