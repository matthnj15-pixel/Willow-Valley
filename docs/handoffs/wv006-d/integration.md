# D → F: warehouses, goods and common-space details

Status: working gallery-review candidates, `runtimeReady:false`. No new `BUILDINGS` entry, functional warehouse, automated trade, save schema or runtime registration. Built from `develop` baseline `5e39c72ff5e205dea166fa18febdfa89aaa5aec8` in feature worktree `/workspace/wv006-d`, branch `feat/wv-art-006-d-storage`.

## Exact assets and dependencies

Review route: `ui-kit/wv006-storage.html`, including `/dev/ui-kit/wv006-storage.html`. Its complete local runtime dependency set is:

- `ui-kit/wv006-storage.html`, `ui-kit/wv006-storage.css`, `ui-kit/wv006-storage.mjs`;
- existing `styles.css` and `assets/vendor/three.module.mjs` (bundles the existing GLTFLoader);
- `assets/wv/storage-next/manifest.json`, `assets/wv/storage-next/storage.glb`;
- `assets/wv/storage-next/LICENSE.txt` for license evidence, not a fetch needed by rendering.

No remote runtime assets, textures, decoder, fonts, telemetry, new paid/API dependency or private archive. The current Pages workflow copies `ui-kit` and `assets`; it does not copy `storage-next`. Therefore the runtime is deliberately bundled into `ui-kit/wv006-storage.mjs`. Do not add runtime imports of unpublished source modules. This task does not change the offline cache or claim the new route installs offline. F must add and verify its complete closure, with hashes, at root and `/dev/` before making that claim.

The self-contained GLB has named normal/low pairs for: `storehouse-l1`, `warehouse-l2`, `lumber`, `tools`, `sacks`, `barrel`, `cargo`, `well`, `bench`, `noticeboard`, `trough`, `wall`, `fence`, `gate-open`, `gate-closed`, `planted-common`, `scaffold`, `storehouse-frame`, `person`, `cart`. Node names append `-normal` or `-low`. Every entry has exact measured bounds, triangle/material/texture counts and metadata. Eight original matte palette materials are shared across the bundle; no authored textures (Chromium reports one renderer-internal texture in this scene). Model subsets reuse the same resource owner.

Reproduce from checkout:

```sh
npm ci
node scripts/build-wv006-storage.mjs
node --test tests/wv006-storage.test.mjs
npx playwright test wv006-storage
# With the repository preview server running:
node scripts/measure-wv006-storage.mjs
```

Use the pinned existing tools in package.json. The manifest records source hashes, license hash through its source list, output bytes/hash and deterministic recipe revision. Original geometry is CC0 under the new local license notice. No MegaKit input or private archive was accessed; no unavailable input hash is asserted. The clean-build test copies only the recipe, view/gallery sources, script and license into a temporary checkout-shaped directory and compares GLB, manifest and UI bytes.

## Geometry, scale and fit

Apply one uniform 2.8 game-unit/metre conversion. Do not scale to fit a parcel. All candidates are Y up, authored in visual metres with ground datum Y=0; the 1.75 m person and handcart use exactly the same conversion. No saved coordinate is rescaled.

Level I has a 6 × 5 m enclosed shell, one 2.6 m-wide cargo opening and a separate 1 m east personnel entry. The level platform is 0.32 m above grade, with a ground-contacting continuous plinth and supported canopy. Level II has a 10 × 7 m shell and three 2.4 m cargo openings. Both have 2.55 m clear cargo height. Cargo leaves swing inward along jambs, not across the approach. Doors remain distinct with labels/loose goods hidden. Personnel leaves are shown closed, and their metadata says so; this art is not an executable door-opening system.

Cargo clearances, local seats, foundation/support points, personnel stair rises/treads, actual roof bounds/overhangs, handling surface and optional prop seats are in the manifest. The pale review site edges are 10 × 12 m for level I and 16 × 15 m for level II, centered at X=0.3/Z=1.3. They are open ground surfaces and authored site envelopes, not fences or existing game plots. Roof envelopes are measured directly from roof/canopy geometry. `ground-envelope` seats on small props bound their lowest seat plane; they do not claim full rectangular contact. Curved feet/wheels remain curved. Contact seats on posts, decks, plinths and scaffold legs name actual supports.

The larger shell, roof, east stairs, yard and turning approach need a larger verified site. Improved doors, repair/reinforcement and storage fittings are plausible on an existing store footprint; they cannot make a 10 × 7 shell fit a 6 × 5 shell's occupied site. F must evaluate rotated roof/yard/stair polygons against the existing parcel/road/water/terrain authority. Suppress optional goods before rejecting a fit. Never enlarge a live plot or change the road graph to make this artwork fit.

The goods state selector uses shared lumber/tool/barrel/sack/cargo assets and 0/3/7 instances per building. It is not stock accounting. Goods sit on ground seats west/rear of the shells; no stock prop sits in cargo or personnel corridors. The reference handcart is parked in the delivery approach, with loading doors reachable beyond it. The public-space fixtures are individually reusable; the gallery does not enclose a park. Planted accents are deliberately small and do not duplicate B's nature library. Construction scaffold and incomplete matching level-I frame are demonstrations with no turn, schedule or duration.

## Pure view-data interface

`storage-next/view-data.mjs` exports `exampleView(level)`, `editExample(view, goodId, patch)`, `POLICIES`, `GOODS_STATES`, `GOODS_SEATS`, `goodsPlacements(level, state)`. The placement helper returns detached asset IDs, metre positions and yaw values with tested yard/access clearance. `exampleView` returns a fresh detached object. `editExample` clones its input and returns `{ok:true, view}` or `{ok:false,error}`. Accepted patch fields are only `accepted`, `policy`, `target`, `min`, `max`; current stock cannot be edited through it. Balance requires a positive threshold gap; numeric thresholds must be finite, nonnegative and within the illustrative capacity. The page rejects blank numeric edits. No interface accepts a simulation callback or writes state/storage/logs. All examples default to Keep.

The view shape is `{illustrative:true,name,capacity,capacityUnit,staff,roadAccess,goods:[{id,label,accepted,current,target,policy,min,max}]}`. Current example IDs reuse wood/tools vocabulary for explanation only; there is no new resource registration. Capacity and staffing live only in this view-data study and documentation, outside measured geometry fields. Food granaries/material warehouses are a recommended future split, not current behavior.

F can extract this pure adapter for a review panel or supply a separate immutable review snapshot with its own provenance label. Keep acceptance separate from trade policy. Do not derive building inventory by dividing settlement totals or by reading the current turn. Do not remove illustrative labels until a real authoritative stock system exists.

## Resource lifetime and performance

The gallery loads one GLB, instances its shared geometry/materials, changes instance transforms/counts only on explicit composition changes and redraws on interaction/resize. Camera movements never rebuild composition. There is no idle animation loop; hidden pages skip drawing. Low presentation removes board segmentation, door iron detail and roof courses while retaining cargo openings, stairs, contacts, volume and shared-scale references. It does not reduce the selected example stock count.

One owner disposes unique geometry/material objects and instance buffers; no clone owns shared assets independently. Mode changes retain the pool. Page disposal is idempotent, including loads that finish after pagehide. F should reuse this ownership pattern when including candidates in a read-only settlement. Existing 30/100-home baselines and isolated gallery results are separate in the testing record. They are not combined-scene admission or phone FPS. F owns combined renderer performance, physical-device UAT and offline promotion.

## Shared-file changes proposed for F only

This task edits no shared renderer, registry, cache, manifest, simulation, save, workflow, package or existing gallery. F may add a gallery navigation link and offline closure, adapt the review-only loader, and place candidate instances in a read-only review settlement at common scale. F must retain existing loaded saves, founded eras, roads, controls and all current functional identities. **Do not add a playable warehouse, stock ownership, construction duration or policy-driven trade here.** See `gameplay-follow-on.md` before the later gameplay handoff; `production-concepts.md` contains only future intent sheets.
