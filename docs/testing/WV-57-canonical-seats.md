# Issue 57 — canonical assembly seats

Follow-up to D1 `1e93d0c`, correcting two measured presentation defects:

- Finished assemblies retained their authoring-grid X/Z pivot. The offset-gable
  home had center X=0.282322 source units and the porch home center Z=0.261157,
  enlarging one side of their conservative plinth. Normalize the **whole**
  completed assembly to floor-center; preserve individual modules and hierarchy.
  Apply the identical translation to door markers and component seat rectangles.
- Non-footing props used an unsupported +0.8 ground offset. Root park plants and
  local nature in the displayed ground, and seat log layers with their authored
  stack offsets. Their lowest surfaces now touch/sink by <=0.02 game units.

Recipe v3 records original bounds and the canonical translation. Architecture-v1
IDs/selection, raw source files, terrain/road authority, simulation and saves
remain unchanged. This is normalization/contact repair, not new acquisition or
an infrastructure rewrite. Registry promotion still awaits human/device UAT.

Validation: all final bounds are X/Z centered and floor Y=0; cardinal entrance
and parcel-fit tests remain; browser measurements cover grounded logs/plants,
all-seven 30-home scenes and 100-home normal/low budgets. Run asset/Khronos and
Node22/24 checks, unit tests, icons, offline build, full browser suite and
Three.js input/save parity. Visual artifacts are retained by CI. D1 timed desktop
records remain historical evidence for their recorded source/hash set, not new
phone-performance claims.

Development UAT: https://matthnj15-pixel.github.io/Willow-Valley/dev/?renderer=three&quality=normal
