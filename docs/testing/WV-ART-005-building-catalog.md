# WV-ART-005: five homes and five working places

Development review: https://matthnj15-pixel.github.io/Willow-Valley/dev/ui-kit/building-catalog.html

The user accepted the first MegaKit cottage, wagon and fence and requested residential and commercial variety, starting with five of each. This slice delivers **five residential designs total, including the approved cottage, and five compositions representing existing farm, smith, granary, lumber and market roles**. It introduces no new commercial gameplay categories. The expanded gallery uses the accepted material language and one shared human scale. These new designs remain gallery-review assets pending visual acceptance and placement/performance gates.

## Residential collection

| Existing identity slot | Architecture | Full X × Y × Z bounds (m), including trim | Triangles / material groups |
| --- | --- | --- | --- |
| `home-steep-gable` | Approved 4 × 4 m plaster cottage, round entry, steep tiled gable | 5.513 × 6.854 × 5.616 | 4,937 / 8 |
| `home-long-ridge` | 4 × 6 m weathered timber house, long flat-tile ridge and chimney | 5.703 × 6.646 × 7.588 | 6,340 / 8 |
| `home-low-hip` | 4 × 4 m limewashed crofter’s cottage, original layered hipped thatch | 5.040 × 4.820 × 5.040 | 2,761 / 8 |
| `home-porch-cabin` | 4 × 4 m timber shell with a usable front porch and boarded lean-to | 5.534 × 6.648 × 6.313 | 5,790 / 7 |
| `home-offset-gables` | Plaster main room plus a narrow timber service wing with a lower parallel gable | 7.300 × 6.854 × 5.616 | 7,189 / 9 |

The approved cottage geometry is copied from the exact existing study bundle; its dimensions, triangle count and accepted texture bytes are retained. The paired-gable house omits shared interior wall/window bays between rooms rather than burying two complete walls at the join. Roof backing in new assemblies sits below the tile surface. The original cottage’s input remains untouched.

`HOME_IDS`, its ordering, the identity hash salt and runtime selection are unchanged. The sixth identity, `home-crooked-wing`, retains its existing architecture-v1 rendition. The five new residential outputs are actual footprint, roof and entry variations, not differently stretched copies.

## Working and commercial collection

| Existing role | Recognizable composition | Full X × Y × Z yard bounds (m) | Triangles / material groups |
| --- | --- | --- | --- |
| Farm | Plaster farmhouse, open hay shelter, bound straw bales, wagon and rear fences | 10.885 × 6.854 × 9.539 | 7,489 / 9 |
| Smith | Masonry workshop, open forge bay, supported vent/hood, chimney and anvil | 9.471 × 6.670 × 5.744 | 5,100 / 11 |
| Granary | Raised boarded store, original double loading doors, deck, entrance steps and delivery wagon | 7.923 × 7.346 × 9.369 | 7,570 / 9 |
| Lumber | Low open timber shelter, workbench, cut-log stack, wagon and short fence | 9.512 × 3.627 × 5.133 | 2,764 / 3 |
| Market | Three separated timber stalls, muted cloth awnings, goods bins, open approach and wagon | 13.703 × 3.427 × 7.233 | 3,334 / 7 |

The granary has a 2.2 m-wide double loading door, not a domestic door relabeled as cargo access. Its recorded clear width is 2.0 m. The crate sits on the loading deck clear of the door corridor. The new logging shelter keeps the preferred open silhouette with source-roof eaves near 2.3 m above grade, appropriate beside the 1.75 m adult. This does not rescale or replace the existing camp in saved settlements. Parks and plazas remain open ground spaces; all seven functional gameplay types are preserved.

## Scale, contacts and provenance

Every design is authored in visual metres and placed in the gallery at uniform **2.8 game units per metre**. No model fills a parcel by scaling. Source door/window/fence/wagon dimensions are consistent across designs. A shared, original 1.75 m reference figure supplies dimensional context without creating inhabitants. Grounds are a flat gallery fixture with the existing environment material, not a new terrain authority.

The private archive is still kept outside the repository: 708,720,797 bytes, SHA-256 `5e60888e2babe418a4618e7815539d9b1b2c3b24c1db2b22cd7a2a7f66140732`. The attached source CC0 notice matches `7310dfa8512d7ca12b6591329fda4adab7e8b9cdbe04c7d7061c2fe5c7dc38ee`.

Rebuild with:

```sh
node scripts/build-megakit-catalog.mjs /private/path/source.zip
```

The script verifies the archive, pack-specific license and every imported canonical glTF/BIN/texture against the research inventory before extraction. It uses no engine tooling, collision exports, vendor shaders or sample projects. The temporary extraction is removed afterwards. A second build in an isolated working directory reproduces both GLB and manifest byte-for-byte.

The [catalog manifest](../../assets/wv/megakit-catalog-v1/manifest.json) records exact source and dependency hashes, approved-study input hash, output hash/bytes, source transforms, authored geometry, original texture generation, structural seats, foundation grades, door thresholds/directions/clearances, full roof-and-yard envelopes, era and fit policy. New original elements include thatch surfaces and seeded reed-fibre and boarded-timber artwork, floor/attic closures, posts, loading doors/deck/steps, forge/anvil fittings, logs, bales and market counters/canvas. They are explicitly identified as Willow Valley artwork rather than invented MegaKit filenames. Both original textures’ input/derivative hashes and deterministic generator revision are recorded alongside the source texture derivatives.

## Mobile rendering and offline use

The single locally bundled GLB is **3,135,732 bytes**, SHA-256 `d8926948018bb382ab82d9a437fae0b20e71a60d195c56960652ad0b0aedf5c7`. Nine texture images are shared across all ten designs; their estimated RGBA8 memory including mipmaps is **4,194,310 bytes (4.00 MiB)**. Source normal/roughness maps and unused materials are discarded, base-color images are 256–512 px, and transforms are baked with meshes joined by material inside each named design. The dimension figures share one merged geometry and one material.

The gallery renders on demand. Collections can be compared together or inspected individually from front, rear, side, eye and roof views, with drag/pinch/wheel controls, monochrome and wireframe. On narrow screens it opens one home close-up rather than squeezing five facades into the viewport. Models and resource ownership stay shared when switching views.

All gallery code, CSS (including its base stylesheet), manifest, license and the GLB are pinned in the offline integrity list. Browser tests install the game first, disable networking, and load/reload the catalog at both root and `/dev/` without a previous gallery visit. No external model, texture or decoder requests are required. The existing scale study remains linked for comparison and has no changed model output.

Actual normal/low mobile-viewport submission timings, draw calls, triangle/texture counts and shell probes are recorded in [measurements.json](artifacts/wv-art-005/measurements.json). These are cloud Chromium measurements at 600 × 850, DPR 1. They are **not physical-phone FPS**, GPU completion times or sustained thermal measurements.

Several designs exceed the provisional 2–4k/three-material cottage and 6k workplace targets. This is a visually varied catalog for review, not permission to deploy hundreds of these meshes unmodified. Future playable adoption still needs material reduction, scene batching/instancing, complete rotated parcel/roof/yard fits, entrance access, terrain seating and target-device performance. Larger forms must fall back on insufficient parcels; no parcel or saved coordinate may be enlarged.

## Validation and review evidence

- Unit suite: 167 passed, one skipped. Catalog checks verify five residential slots and exactly five existing work roles, distinct residential geometry, measured bounds/triangle counts, accepted-cottage input integrity, shared texture content, memory budget, source hashes and license bytes.
- All existing, approved-study and catalog glTF outputs validate with zero errors and zero warnings. Asset, icon and self-contained offline builds pass.
- Dedicated mobile catalog tests pass: collection counts, fixed scale, nearest-surface wall probes, camera/material controls, draw/triangle bounds, zero page errors/external requests and cold offline root/development reloads.
- The implementation PR records the final full browser suite and Three.js gameplay/input/save parity results. Gameplay source, save slots, economics, housing/functional identities, road graph, terrain contacts and environment shaders are unchanged.

Review the [residential collection](artifacts/wv-art-005/residential.jpg) and [working collection](artifacts/wv-art-005/work.jpg), then use the individual close-ups in the same artifact directory. The [crofter roof](artifacts/wv-art-005/home-low-hip-roof.jpg), [paired-gable rear](artifacts/wv-art-005/home-offset-gables-rear.jpg), [logging shelter at eye level](artifacts/wv-art-005/facility-lumber-eye.jpg), and [granary side/loading access](artifacts/wv-art-005/facility-granary-side.jpg) cover the main construction differences. [Mobile market](artifacts/wv-art-005/mobile-market-normal.jpg) shows the cloth/counter/human relationship.

Reproduce these captures with `node scripts/measure-building-catalog.mjs` against the preview server. `WV_PREVIEW_ORIGIN` selects another local origin. New-model visual acceptance and physical-phone rendering remain human review items before playable replacement.
