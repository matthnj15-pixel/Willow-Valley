# WV006-C acceptance evidence

Current revision: **C3 market, parks and plazas**, preserving C2's full-building detail pass. [Civic contract](../../handoffs/wv006-c/CIVIC-SPACES.md) and the revision-3 manifests supersede earlier counts. The market now has twelve stands and a stage; eight new leisure layouts map to the existing park/plaza types. The main ten-building C2 GLB remains byte-identical for existing consumers; the gallery explicitly overlays the new market candidate from civic.glb. Accepted home cores remain unchanged.

Review page: https://matthnj15-pixel.github.io/Willow-Valley/dev/ui-kit/wv006-baselines.html?civic=3

Choose a design or one of the eight park/plaza cards. Review normal/low, front/rear/left/right/roof/eye, monochrome, wireframe and labels/props hidden at the common 1.75 m reference. Main-building pairs compare the exact C1 baseline with C3; new public layouts have proposed-only views. This selector is a review tool; game placement choice/persistence belongs to F's integration. Human art approval and repeat acceptance with F's final ground cover remain required.

## Civic evidence

- [Market front](facility-market-normal-front.jpg), [roof/circulation](facility-market-normal-roof.jpg), [eye level](facility-market-normal-eye.jpg), [low](facility-market-low-front.jpg), [before/after](facility-market-pair.jpg).
- Parks: [promenade](park-promenade-normal-front.jpg), [sitting garden](park-sitting-garden-normal-front.jpg), [village green](park-village-green-normal-front.jpg), [woodland walk](park-woodland-walk-normal-front.jpg).
- Plazas: [town square](plaza-town-square-normal-front.jpg), [fountain court](plaza-fountain-court-normal-front.jpg), [flower court](plaza-flower-court-normal-front.jpg), [festival court](plaza-festival-court-normal-front.jpg).

Every public design has six normal views, low front/roof, identity/monochrome and wireframe images. Mobile normal/low captures include market, promenade and fountain. Parks use the surrounding ground, with terrain-following gravel ribbons; paving is a flat surface patch, never a raised whole-plot slab. New geometry tests sweep route volumes through actual normal/low triangles, validate contact points and bench support/seat overlap, and measure the full crowns/awnings/stage/stair bounds at fixed scale.

## Retained building corrections

Thatch: [close](home-low-hip-normal-front.jpg), [roof](home-low-hip-normal-roof.jpg), [wireframe](home-low-hip-wire.jpg). Smith defect: original [front](old-smith-front.jpg), [rear](old-smith-rear.jpg), [side](old-smith-side.jpg), [roof](old-smith-roof.jpg), [eye](old-smith-eye.jpg), [wireframe](old-smith-wire.jpg). The separate square flue/source stack and roof penetration were an assembly problem across ordinary/wire views. The [revised forge](facility-smith-normal-eye.jpg) has one open continuous stack and flashed aperture. Granary: [raised mass](facility-granary-normal-front.jpg), [open undercroft](facility-granary-normal-eye.jpg), [side stair](facility-granary-normal-side.jpg). Its selected 1.35 m closed floor/underside remains on individual posts/piers, with no solid infill. [C2 detail notes](../../handoffs/wv006-c/DETAIL-PASS.md) describe retained roofs, windows, doors, masonry and structural fittings.

## Reproduce and verify

```sh
node scripts/build-wv006-baselines.mjs
node --test tests/wv006-baselines*.test.mjs
npm test
npm run build:assets
npm run build:icons
CHECK_BUILT_ICONS=1 node --test tests/icon-artifacts.test.mjs
npm run build:offline
npx playwright test tests/browser/wv006-baselines*.spec.mjs
node scripts/measure-wv006-baselines.mjs
npm run test:e2e
WV_RENDERER=three npx playwright test camera-gestures organic-zoning road-3d-drag-fix save-slots organic-lanes --output=test-results-three-parity
```

Both new GLBs are explicitly validated with zero glTF errors/warnings. Normal/low bounds and triangle/material counts are remeasured from exported roots. Isolated checkout-only rebuilding compares both GLBs, manifests and license notices byte-for-byte. Core home attributes/indices/material image bytes, roof closure, chimney aperture, entry/loading corridors, individual granary supports and floor studies remain covered. Browser checks exercise all eighteen designs, eight civic choice cards, state isolation, fixed-scale framing, no external requests/page errors and no idle render loop at root and /dev/. The initial choice test used Playwright's option isDisabled helper, which did not reflect the disabled option property; the final test checks the actual DOM property and verifies switching back to market re-enables comparison. The initial full run also caught a real B hamlet regression: directly replacing its market suppressed its well. The larger market is now a separate opt-in candidate; the main C2 GLB is byte-identical, and B-owned files remain untouched. Final targeted and complete browser runs must verify this correction before merge.

The unit suite passes 206 tests with one existing icon skip; the icon check passes separately after generation. All 64 probes and 144 full-bounds camera checks pass. The 30-home fixtures pass numerical guards, while both 100-home fixtures fail triangle limits (87 normal / 86 low calls). The complete local browser rerun passes 127 tests and parity passes 16; four affected B hamlet/plot checks and four final C gallery checks also pass. A's subsequently merged material-gallery tests are repeated separately; the delivery PR records their result and current combined CI. Current command results, asset hashes and scene tables are in [results.json](results.json); complete camera/probe/stat records are in [measurements.json](measurements.json). The final PR delivery record supplies exact head/merge SHAs, CI run URLs and verified Pages deployment. Asset/icon/offline builds must leave shared tracked outputs unchanged; only C-owned files appear in [changed-files.txt](../../handoffs/wv006-c/changed-files.txt).

## Limits and F gates

All entries stay gallery-review/runtimeReady:false. Three public plazas use four materials, a recorded exception for separate foliage/structure/gravel/paving. Accepted home cores retain their existing material/triangle exceptions. The synthetic 30/100-home fixtures instance shared resources with five workplaces, one park and one plaza; they omit the sixth fallback, actual landscape/roads/parcel placement and simulation. Draw-call compliance alone cannot approve the 100-home triangle failures. Desktop timings are submissions from cloud Chromium/SwiftShader, not GPU completion or physical-phone FPS. Captures and the full browser suite run sequentially to avoid renderer contention.

F must verify actual rotated parcels, slopes, contact extensions, roads/water, full-scene budgets, final ground cover, placement selection/persistence, dependency closure, installed cold-offline behavior and physical-device UAT before adoption. No production, employment, housing capacity, unlocks, founded era, save migration/slots, zoning, roads or gestures change here. The existing game's offline behavior remains covered by unchanged baseline tests; this standalone gallery has no installation/offline-readiness claim.
