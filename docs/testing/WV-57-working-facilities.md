# Issue 57 — C2 working facilities

Depends on C1 `7d83789`. Opt-in UAT:
https://matthnj15-pixel.github.io/Willow-Valley/dev/?renderer=three .

Four locally bundled compositions replace procedural facility shells in the
Three.js adapter: farmhouse plus barn, logging shelter and log yard, forge with
masonry chimney/anvil, and raised boarded granary with loading platform. Original
closure/roof/yard meshes supplement the exact verified source shortlist; the
recipe records source IDs, authored primitives, hashes, bounds and entrances.
No building types, costs, capacities, staffing, unlocks or yields change.

Facilities face the nearest committed road/lane approach through read-only
geometry. Uniform scale stays in the existing facility envelope. Farmhouse/barn
have separate terrain-contact plinths at their level composition seat; logging
shelter support is separated from terrain-grounded log stacks. The granary's
entrance steps reach its raised loading platform. Unsafe/missing imports keep
legacy geometry; long or wet decorative connectors are suppressed.

Farm rows use only actual committed `farmland` within the existing 92-unit field
neighborhood. Shared rows are deduplicated by a stable lattice. Water, map edges,
roads, lanes, houses and facility clearances suppress rows; previews and turn
count never create crops. Static wheat marks communicate farmland, not a new
seasonal growth or ownership simulation. Terrain uses the existing contact mesh.

Validation: asset/Khronos build, unit tests for all four placements and crop mask,
icons, standalone offline build, full browser suite, and input/save parity under
Three.js. Gallery and root/dev cold-offline tests exercise every output; browser
captures include all four working facilities and committed fields. Reproduce
asset hashes under both Node 22 and 24 using the quantized authoring pipeline.

Remaining: marketplace/plaza/park (C3), environment palette and batching/LOD
(D1), physical phone UAT (D2), human labels-off review and full legacy approach
clearance review. Default renderer remains native WebGL. Issue 57 stays open.
