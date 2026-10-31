# Issue 57 — C3 public spaces and complete current catalog

Depends on C2 `63a409f`. Opt-in Development UAT:
https://matthnj15-pixel.github.io/Willow-Valley/dev/?renderer=three .

All six houses and all seven current facilities now have local compositions in
the playable Three.js adapter. Marketplace stalls surround a clear crossing;
plaza paving follows displayed terrain with perimeter benches; park paths wind
between trees, shrubs and seating. None is replaced by a roofed residential box.

Public-space ground is draped over the existing contact triangles. Wet paving
triangles are suppressed. Small independent stall/bench footings follow local
contacts; trees root directly in displayed ground. Flat gallery-only ground
swatches are explicitly hidden in gameplay, and there is no whole-site level
slab. Existing roads remain higher than paving to avoid flicker. Decorative
connectors use existing road approaches without changing routing or access.

The assembly recipe records source parts, original additions, transforms and
output hashes. The gallery and required PWA cache cover the whole catalog,
including root/dev cold offline relaunch. Standalone HTML remains legacy.

Checks include asset/Khronos validation, Node 22/24 reproducibility, unit tests
that open spaces have terrain-contact ground and no procedural shell, icons,
offline build, full Playwright suite and Three.js input/save parity. Captures
include a sloping public-space scene and a 30-home fixture with all seven types
at normal and low camera pitch.

Remaining gates: environmental palette/nature integration, batching/culling and
mobile quality/benchmark work (D1), physical phone UAT (D2), human labels-off
silhouette review and legacy approach-clearance audit. Native WebGL remains the
default and fallback until UAT. No production/main merge. Issue 57 remains open.
