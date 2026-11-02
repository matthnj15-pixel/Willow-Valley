# Audit and explicit adoption decisions

## Verified source state

The audit starts from develop `55eb7199b663166b3cfb9ad97dbd96a3fc693624`, PR 92. PR head `1827e4e3da0db39f54e57d619a39d786e03eaf13` and merge have the identical Git tree `6e83e841985702d41680be1025f9d7f073aefb75`. Required PR CI 41376823383 and post-merge develop CI 41377592721 are successful; PR CI reports 217 unit passes/one skip, 138 browser passes, and 16 Three.js parity passes. Pages run 41377585441 succeeded. Its workflow metadata is main; PR 92 records an explicit develop checkout and served-marker/hash verification. Those served checks are producer evidence, not a new independent phone session by this audit.

All eleven PRs 82-92 are merged. At audit start only main and develop branches exist and no PR is open. There is no unresolved branch merge to perform. No merge-conflict markers were found in the inspected text source. A git diff against PR 81 confirms no change to simulation, settlement-play, organic-world, save-slots, app, registry, shared Three renderer, building/nature placements, shared environment materials or generated offline cache. Studies remain detached and runtimeReady:false.

## Current selections

| Feature | Selected implementation source | Older/reference behavior |
| --- | --- | --- |
| Building and civic detail | C4 `kit-detail-manifest.json` plus `kit-detail.glb`, 18 normal/low entries | C1/C2/C3 remain comparison inputs; never instantiate both families for one entity. |
| Meadow look and blades | A3 meadow palette/recipe in `environment-next/meadow-layer.mjs` | A2 photographic treatment is comparison-only, even though named `materials.mjs`. |
| Sky/daylight/water/shore/forest/rock starting systems | Explicit A1 factory `environment-next/previous-materials.mjs`, adapted to actual world, combined with A3 meadow | A3 is a small land study, not a complete world shader. Keep explicit region/material composition; no global tint. |
| Nature and plot awareness | B collection plus latest plot-dressing, shared boundaries and painted-fields APIs | Do not install B's authored hamlet, synthetic terrain, stage progression or reference people as simulation. |
| Warehouses | D storehouse-l1 and warehouse-l2 plus generic detail assets | Preview only until real storage gameplay; example ledger stock is not game state. |
| Housing upgrade assets | Not delivered as E in this source revision | Do not invent level changes from C4 detail, founded era or turn count. |

C4 is the latest building target, superseding the prior conversational recommendation of C2/C3 as final artwork. It preserves their exact source bundles so A/B's pinned historical comparisons continue rebuilding. Their old pins are deliberate, not a merge conflict. P1 explicitly selects C4; do not globally repoint B/A's studies or overwrite their manifests. No new source-kit import is needed: C4 rebuilds from the committed optimized checkpoints.

## Resolved integration conflicts and duplicate ownership

1. **Three competing building generations:** select C4 explicitly. Its facility-market entry already represents the large civic market with kit wagon/cargo. Do not apply C3's separate market override on top or reload all reference bundles in the runtime. Retain the sixth home and old-site legacy fallback through the existing legacy transform.
2. **A2 filename versus A3 direction:** select the palette/blade recipe from A3 and explicit A1 world factory. Do not select a default simply by importing `environment-next/materials.mjs`. P2 owns blending A3 land with A1 cliff/shore/water semantics against actual terrain.
3. **B grass and A3 grass:** P2 owns continuous meadow grass; suppress B grass-tuft generation within that coverage. P3 owns trees, shrubs, flowers, reeds, beds and plot boundaries. No two full-density grass layers.
4. **C4 garden fences versus B shared boundaries:** C4 integral fragments render once and enter P3's occupied/retained-boundary input. P3 clips/reuses its generated boundary spans around them. A decorative fragment grants no new property rights. Do not erase a pre-existing authoritative boundary to hide an overlap.
5. **C4 cargo/furniture versus B/D props:** C4 integral props/furniture retain site ownership. D supplies new freestanding common props; do not also generate B's authored hamlet well/cart/bench at that same site. B gardens/orchards retain their specialist recipe. Classify actual envelopes before generating optional props.
6. **Unit systems:** saved X/Y, scene X/Y/Z, B original game-unit API, and B plot/metre API are different. Normalize in a single bridge, use explicit field names, and test round trips at nonzero world offsets and rotated sites. Legacy models keep their old scale contract.
7. **Derived fields:** consume committed zone classification including erase/holes, then share one derived field plan for visual crops/surfaces/fences. Delete obsolete derived outlines after changes; do not save them as retained fences or alter yields.
8. **Nested source transforms:** C4's benchmark fixed its own root-relative transform handling. Runtime P1/P5 must preserve hierarchy transforms and picking identity too. A flat source-node assumption will misplace new details.
9. **Performance comparison mismatch:** B's hamlet uses low architecture when stage===30 even at normal quality. Preserve the historical study, but report effective LOD and prohibit this shortcut in a full-detail 100-home normal benchmark. Current C4 synthetic 100-home counts are 697,211 normal / 427,452 low triangles, outside provisional 250k/150k guards. These are warnings requiring measurement/LOD work, not evidence the phone cannot run them.
10. **Offline and decoded images:** C4's 14,560,556-byte bundle contains all quality roots with roughly 31 MB mipmapped image estimate. Selecting a low root alone does not prove high-detail images were never parsed/allocated. P1 must produce selective runtime derivatives, and P5 installs only the admitted closure, excluding comparison and source checkpoints.

The machine-readable decisions are `render-adoption/selection.json`. `scripts/validate-wv007-adoption.mjs` verifies selected input hashes, source output hashes, IDs, units and mutually exclusive family rules. This is source-selection verification, not runtime acceptance. Historical sources remain frozen; new runtime derivatives declare parent/source hashes and do not rewrite the source contract to make a mismatch pass.

## Repository correction in this audit

The acquired C notices retain source CRLF/trailing spaces to match their audit hashes. They previously lacked the scoped Git whitespace/text attributes already used by other acquired notices, causing `git diff --check` failures. `assets/wv/buildings-next/.gitattributes` now applies `-text -whitespace` to only License_Source.txt and License_Kit_Source.txt. Both notice contents and hashes stay unchanged; other files still receive normal whitespace checks.

## What remains to implement

Fixed-scale C4 loading and real rotated-parcel admission, actual-world A3/A1 composition, plot-aware landscaping on player settlements, independent support seating/public-surface conformance, effective LOD/culling and resource ownership, cold-offline closure, and actual installed-device profiling. A3's corrected narrow review paths do not fix or replace live road topology/widths. Warehouse inventories/trade automation and housing/workplace upgrade mechanics remain a later gameplay round.

Use the latest source pins, not only PR descriptions. Receiving tasks must re-fetch develop and check for new work before modifying anything. No study is promoted to runtimeReady by this audit. Measurements on the actual target browser/PWA determine the sustainable quality profile; do not promise A20/Metal-specific acceleration or a new engine backend in this integration round.
