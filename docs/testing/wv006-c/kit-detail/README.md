# C4 kit-detail acceptance evidence

Current candidate: recipe 4, [kit-detail contract](../../../handoffs/wv006-c/KIT-DETAIL-PASS.md). Review after verified deployment: https://matthnj15-pixel.github.io/Willow-Valley/dev/ui-kit/wv006-baselines.html?kit=4 . The page compares the same C3 layouts with the kit-finished candidates. Surface relief switches actual normal maps on/off at the same camera; low uses color-only materials. Choices, saved state, physical scale, identities and gameplay remain unchanged.

## Inspect

- [Market with paid-kit delivery wagon/cargo](facility-market-normal-front.jpg), [market overhead and clear crossing](facility-market-normal-roof.jpg), [before/after](facility-market-pair.jpg).
- [Cottage shutters/materials](home-steep-gable-normal-side.jpg), [cottage rear greenery](home-steep-gable-normal-rear.jpg), [closed layered thatch](home-low-hip-normal-roof.jpg).
- [Barn kit windows/rear bracket](facility-farm-normal-rear.jpg), [clear work frontage](facility-farm-normal-front.jpg), [smith roof/stack](facility-smith-normal-roof.jpg).
- [Granary cargo on supported deck](facility-granary-normal-front.jpg), [open undercroft/stairs](facility-granary-normal-eye.jpg), [lumber yard](facility-lumber-normal-front.jpg).
- [Sitting garden](park-sitting-garden-normal-front.jpg), [fountain court](plaza-fountain-court-normal-front.jpg), [flower court](plaza-flower-court-normal-front.jpg).

Every design has C3/C4 comparison, front/rear/left/right/roof/eye normal, low front/roof, monochrome identity and wireframe images. The same 1.75 m person and existing environment fixture are used; repeat against final ground in F. Desktop captures are 1400×1050 CSS, DPR1; mobile captures 600×850, DPR1. These are actual Three.js renders, not generated images or physical-phone FPS evidence.

## Verification

`results.json` contains exact output/source hashes, measured triangles/materials/texture bytes, commands and scene tables. `measurements.json` records all 64 probe results, 144 camera checks and four synthetic scenes. Required current-head CI, local full-suite completion, exact head/merge SHAs and verified Pages build/served-file hashes are supplied on the delivery PR, avoiding a self-referential commit SHA.

The exact paid Source archive (708,720,797 bytes) and attached CC0 notice match the earlier audit. Every selected source dependency was hash-checked. The optimized nine-module library and surface checkpoints are committed; the private archive/share URL/tokens, raw collection and engine code are not. Checkout-only rebuilding needs no private archive, network, new package or runtime decoder. Reimport additionally requires the hash-pinned Source ZIP. Source and derivative hashes remain separate. The original notice’s CRLF and trailing spaces are intentionally preserved for its exact audit hash.

Thirteen focused tests explicitly validate all four GLBs, remeasure every C4 normal/low root after export optimization, verify normal/roughness checkpoint hashes against audited inputs, preserve accepted core vertex/normal/UV/index/base-image bytes, test actual-triangle routes and real cargo/support contacts, enforce fixed scale/workplace budgets, and compare isolated rebuild outputs byte-for-byte. House approach tests check kit additions; intentional retained closed door leaves remain closed. Workplace/public sweeps include all fixed geometry and real node transforms.

Six focused browser tests pass across root and /dev/. They cover all eighteen designs/cameras, before/after, eight choice cards, props/labels/monochrome/wireframe, no external requests/page errors, no idle rendering and unchanged local storage. Rendered relief changes actual pixels; turning it off removes normal maps, and low assigns neither normal nor roughness maps. Required unit, asset, icon and offline commands run against the current branch. The full local browser suite passed 134 tests and Three.js parity passed all 16 checks before the independent meadow merge. After refreshing to PR #91, unit checks pass 217 tests (plus one existing icon skip verified separately), and all 23 affected C/A browser checks pass. Required CI repeats the complete current-head suite before merge.

## Gates

All five workplaces meet the 6k triangle / three-material targets. Original home cores still exceed provisional individual targets, and three plazas retain four materials. The full C4 normal+low image set estimates roughly 31 MB RGBA8 with mips, before comparison-only C3 references; F must budget the actual runtime dependency set and resource ownership.

The 30-home normal/low fixtures pass numerical guards; both 100-home triangle guards fail. These are shared-resource synthetic submissions with five workplaces, one park and one plaza, not actual town placement, sixth-fallback coverage, GPU completion or phone FPS. The benchmark now honors nested source mesh transforms and includes fixed kit dressing. Do not promote based only on these figures.

F still owns real parcels/slopes/roads/water admission, per-object seating/surface conformance, final-ground art review, shared loader/registry/batching and installed cold-offline integration, game placement choices/persistence, combined performance and physical-device UAT. The game, capacities, staffing, production, unlocks, founded era, saves/slots, roads and gestures are unchanged.
