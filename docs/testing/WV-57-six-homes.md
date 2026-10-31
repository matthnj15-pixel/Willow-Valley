# Issue 57 — C1 residential catalog integration

Depends on B3, merged as `b3caa7d`. Development remains opt-in at
https://matthnj15-pixel.github.io/Willow-Valley/dev/?renderer=three .

The architecture-v1 six-ID ordering now drives gameplay. The original two
assemblies are joined by low thatched hip, crooked wing, offset cross-gables and
porch cabin. The deterministic recipe preserves source hashes and records which
original primitives supplement each model. Broad original thatch courses,
closed wing roofs, an offset gable and a supported porch add silhouettes without
stretching door/window modules. Bright source roof red is muted to slate in the
recorded derivative palette. All outputs remain CC0; original additions are
released with the same assembly license.

Uniform fitting includes roof overhang bounds and actual parcel vertices.
Footprint-sized foundations stay level with terrain-contact lower faces. Bounded
entrance connectors descend through short stone treads to terrain-following
paths toward existing saved entrances. Wet/out-of-bounds/missing/far entrances
suppress decoration; paths never create lanes or alter simulation access.
Incompatible sites retain shells, and loading fallback never enters a save.

The gallery, required PWA cache and offline tests cover every home. The seeded
`WV-C01-hamlet30` fixture records 30 parcels, irregular frontages and lanes, all
six loaded forms and screenshots; actual Development houses use the same
placement adapter. Cardinal-direction tests cover every model. Registry and
Khronos validation check hashes, embedded textures, bounds and byte/triangle
budgets. The PWA remains local-only; standalone HTML remains legacy.

Required validation: asset build/validation, unit suite, icons, offline build,
full browser suite and existing input/save suites with `WV_RENDERER=three`.
CI retains `three-gameplay-*` and gallery screenshots.

Still open: human monochrome silhouette review, physical phone performance,
all-seven facility compositions, full lane/neighbor approach clearance audit,
instancing/LOD, environmental materials and target-device UAT. These houses are
available in the opt-in renderer; registry promotion to default shipping remains
blocked on those UAT gates. Full #57 remains open.
