# WV006-C acceptance evidence

Review page: https://matthnj15-pixel.github.io/Willow-Valley/dev/ui-kit/wv006-baselines.html

Review the side-by-side PR 81/candidate gallery at the existing human scale. Hide loose props and labels, then inspect each workplace in monochrome. Hearths, doors, supports, racks, counters and fixed work bays remain visible. Front, rear, left, right, roof and eye views are available for both detail levels, plus wireframe. Human visual acceptance remains a review step; automated geometry checks do not certify art approval. Repeat with F's final ground cover before runtime promotion.

## Visible correction evidence

- Thatch: [normal close view](home-low-hip-normal-front.jpg), [roof](home-low-hip-normal-roof.jpg), [low](home-low-hip-low-front.jpg), [wireframe](home-low-hip-wire.jpg). The normal shell is preserved; the new courses have closed hips, relief and uneven bundle edges rather than per-straw geometry. Fine fibers are in the shared texture and can remain subtle at normal town zoom.
- Smith: the original defect was inspected in [front](old-smith-front.jpg), [rear](old-smith-rear.jpg), [side](old-smith-side.jpg), [roof](old-smith-roof.jpg), [eye](old-smith-eye.jpg), and [wireframe](old-smith-wire.jpg). The sloped source stack bottom meets the separate square flue above a roof crossing; this is an assembly/penetration problem visible with ordinary materials and wireframe, not camera clipping alone. Compare [new eye view](facility-smith-normal-eye.jpg), [roof opening/crown](facility-smith-normal-roof.jpg), and [wireframe](facility-smith-wire.jpg). No smoke supplies identity.
- Granary: [elevated mass and loading access](facility-granary-normal-front.jpg), [open undercroft at eye level](facility-granary-normal-eye.jpg), [side stair](facility-granary-normal-side.jpg), [roof/yard](facility-granary-normal-roof.jpg), [wireframe](facility-granary-wire.jpg). The selected 1.35 m floor is in the 1.2–1.5 m study. The store has air beneath its closed underside; the floor did not remain at 0.7 m beneath a raised deck.
- Work identities with labels and loose props hidden: [barn](facility-farm-identity.jpg), [forge](facility-smith-identity.jpg), [granary](facility-granary-identity.jpg), [timber rack shelter](facility-lumber-identity.jpg), [stall court](facility-market-identity.jpg).

Each `*-pair.jpg` compares the unchanged PR 81 input on the left with C on the right. `*-normal-{front,rear,left,side,roof,eye}.jpg` and `*-low-{front,roof}.jpg` cover revised designs. Mobile captures use a 600×850 CSS viewport at DPR 1; desktop captures use 1400×1050 at DPR 1. All use existing environment materials and the same gallery light. This is cloud Chromium/SwiftShader evidence, not physical-device FPS.

## Verification

The acceptance commands are:

```sh
node scripts/build-wv006-baselines.mjs
node --test tests/wv006-baselines.test.mjs
npm test
npm run build:assets
npm run build:icons
npm run build:offline
npm run test:e2e
WV_RENDERER=three npx playwright test camera-gestures organic-zoning road-3d-drag-fix save-slots organic-lanes --output=test-results-three-parity
node scripts/measure-wv006-baselines.mjs
```

Focused checks explicitly validate the new GLB with gltf-validator, measure every normal/low root, compare accepted normal home attributes/indices/image bytes, verify identities and targets, check the full floor-height study, individual supports and component intersections against entry corridors and the flue opening, and rebuild into an isolated temporary directory. Browser checks probe retained walls, thatch coverage, the open chimney throat/solid face, open undercroft, closed underside and cargo doors. They verify full bounds in all six cameras, both quality levels, monochrome/wireframe/props/label controls, no external requests/page errors and no idle render loop at root and /dev/.

Results and final asset/scene tables are in [results.json](results.json); full geometry, texture, provenance and fit data is in the [candidate manifest](../../../assets/wv/buildings-next/manifest.json). Focused glTF validation reports zero errors and zero warnings. The unit suite reports 171 passed / one skipped. Required asset/icon/offline builds pass with no tracked shared artifact changes. The final browser/parity results and CI/deployment URLs are recorded on the delivery PR.

An earlier full browser pass shared the software renderer with repeated evidence captures and hit timeouts in four existing Three.js scene tests. That run is not counted as passing. Final measurements and browser validation are run sequentially; any unresolved failure remains a blocker to merging. Desktop submission times exclude GPU completion and cannot establish phone FPS. The synthetic scene records explicitly report their triangle gate failures instead of treating PR 81's ten-design gallery as a populated town result.

## Remaining gates

Every entry stays gallery-review and runtimeReady:false. New workplaces have one material and stay well below 6k triangles; accepted home shells retain 7–9 material groups, and several normal/low homes exceed the provisional individual targets. Both 100-home fixtures exceed whole-scene triangle limits. F must test true rotated parcels, roads/water, slope/contact extensions, the sixth identity fallback, final ground cover, full scene performance, dependency closure, installed cold-offline behavior and physical-device UAT before any mass adoption. No simulation, save migration, three-slot behavior, production, employment, capacities, zoning, roads or gestures are changed by this candidate catalog.
