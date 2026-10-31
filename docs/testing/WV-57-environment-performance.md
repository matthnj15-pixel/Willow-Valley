# Issue 57 — D1 environment and performance vertical slice

Depends on complete catalog C3 `6b7fbd0`. Development game:
https://matthnj15-pixel.github.io/Willow-Valley/dev/?renderer=three .
Low preset adds `&quality=low`. Explicit choices persist outside save slots so a
normal PWA start URL retains the opted-in backend/preset. `?renderer=webgl&quality=normal`
reverses them. First visits and standalone HTML remain native WebGL.

## What changed

Static glTF recipes now share spatial `InstancedMesh` batches with stable
instance-to-entity tables, computed bounds and automatic frustum culling.
Preview-only edits reuse placements; world/slot/committed-state changes rebuild
instance buffers and dispose their predecessors. Loader resources remain registry
owned. Camera movement does not rebuild terrain, buildings, crops or nature.

Seeded local oaks replace the Three.js path's generated conifers. Tree placement
uses displayed terrain and excludes water, committed farmland, houses, facility
footprints, roads, lanes and entrance corridors. Low quality reduces nature and
DPR (1 versus normal <=1.5). Low also reuses the existing lite terrain
resolution, rebuilding the displayed adapter and all contact surfaces together; it changes no simulation values or model identities.
No runtime third-party asset fetch is added. Import failure also takes the
local-only lightweight fallback.

Approved leaf/bark swatches replace raw cyan/orange Nature factors, with original
and derivative material values recorded. Survival texture accents are muted to
timber tones; source and derivative texture hashes are recorded per kit. Palette
recipe v2 does not remap architecture-v1 identities. Smooth meadow vertex colors
remove per-cell color jumps on gentle ground without changing any terrain
position, normal, contact triangle, road or foundation contract. The legacy
renderer retains its original terrain colors.

## Reproducible browser evidence

Open [30/100-home benchmark](https://matthnj15-pixel.github.io/Willow-Valley/dev/ui-kit/settlement-benchmark.html?count=100).
Each reference has all seven facilities, real committed farmland, local nature
and seeded house parcels. The camera test uses the full CSS viewport, warms for
10 seconds, then records 60 seconds. Record device/OS notes; download the local
JSON. Hidden-page or explicit cancellation aborts the measurement. No results
leave the device. Results include hashes, deployment marker, encoded/transfer
bytes, viewport/DPR, frame percentiles, draw/triangle peaks, estimated buffer and
texture bytes, and explicit missing thermal/physical-phone verification.

At 600x850 CSS px, DPR2 (render DPR1.5), the pre-D1 code at `6b7fbd0` with the
same D1 fixture used **1,146 calls / 118,326 triangles**. Instancing uses **98 calls /
143,746 triangles** at normal quality and **96 calls / 121,818 triangles** at low.
The extra normal triangles are richer local oak geometry; both stay within the
approved budgets. Normal estimates are 2,735,188 geometry bytes and 20,971,520
texture bytes. These are buffer/image estimates, not driver-reported VRAM.

The required install list is 60 files / 1,875,762 bytes; engine + model assets are
1,542,739 bytes before HTTP compression. Counts/hashes can be reproduced with
`npm run build:assets`. Node 22/24 produce identical outputs. Budget tests wait
for all 100 homes and seven facilities to render, then enforce normal/low draw,
triangle and memory ceilings. CI preserves budget JSON and before/after scene
captures. [Pre-D1 baseline](wv-57-d1/baseline-town100.json) and
[image](wv-57-d1/baseline-town100.png) use Chromium SwiftShader, not a phone.
The baseline fixture is the identical D1 fixture supplied to the pre-D1 renderer.

Required checks: asset/Khronos validation, unit suite, icons, offline build,
full browser suite and the separate Three.js input/save suites. The latter uses
a distinct output directory to preserve full-suite visual artifacts. Existing
20-world-rebuild tests protect resource lifetime; new tests protect pure nature
selection, unchanged terrain contacts, strict 100-home budgets and engine-failure
fallback.

## Timed desktop recordings

The committed JSON/image pairs under `wv-57-d1/` record source commit `ef29df8`,
fixture hash, all model hashes and the actual SwiftShader renderer string. Run
`node scripts/benchmark-settlement.mjs` against the local preview server to repeat
three full-viewport runs (10-second warm-up + 60 seconds each).

| Scene / preset | Median / p95 frame ms | Peak calls / triangles |
| --- | --- | --- |
| 30 / normal | 200 / 216.7 | 96 / 78,493 |
| 100 / normal | 316.6 / 366.7 | 93 / 143,404 |
| 100 / low | 216.7 / 250.1 | 91 / 121,476 |

These software-renderer timings **miss the frame-pacing target**. They do not
establish hardware-GPU phone behavior, and no 30 FPS phone claim is made. Static
budgets and software correctness pass; physical frame pacing remains unverified.
[Normal 100-home result](wv-57-d1/town100-normal.json) and
[optimized scene](wv-57-d1/town100-normal.png) are retained with the baseline.

## Remaining release gates

D1 is a measured optimization slice, not physical mobile acceptance. Physical
portrait/fold/resize UAT, airplane-mode installation/upgrade, sustained phone FPS,
thermal behavior and human labels-off reviews remain D2. Dedicated far-distance
LOD assets and optional contact shadows remain deferred: source meshes already
fit the current draw/triangle budgets, and physical profiling should justify
additional complexity. Full legacy approach/neighbor clearance review remains
open. Do not promote Three.js to default or close #57 from desktop evidence.
