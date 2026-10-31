# Willow Valley 3D milestones — 2026-10-31

All engineering PRs target **develop**, never main. Existing monthly simulation and three-slot save schema remain intact. New-site safety rejection is explicit authoring policy, independent of renderer quality. Physical-phone FPS and Safari are not established by desktop browser emulation.

| Milestone | PR | Exact merged commit | PR CI evidence |
| --- | --- | --- | --- |
| Displayed-triangle road/foundation contact | [#58](https://github.com/matthnj15-pixel/Willow-Valley/pull/58) | `ab5a1f6a87ee1163492d726271163af2ecd877a6` | [success](https://github.com/matthnj15-pixel/Willow-Valley/actions/runs/41216056484) |
| Authored curve/shoulder water and grade validation | [#59](https://github.com/matthnj15-pixel/Willow-Valley/pull/59) | `8a24e0aae2ffe383066545d5e30d34a629e783ca` | [success](https://github.com/matthnj15-pixel/Willow-Valley/actions/runs/41216448017) |
| Trimmed junction mouths, polygon fills, natural edges | [#60](https://github.com/matthnj15-pixel/Willow-Valley/pull/60) | `ae364169d7d3d3d30294fd8ce44c4c83dfc2b719` | [success](https://github.com/matthnj15-pixel/Willow-Valley/actions/runs/41216827516) |
| Screen-space markers and tilt-aware touch targets | [#61](https://github.com/matthnj15-pixel/Willow-Valley/pull/61) | `402ba198a19076fbdd07504d8197e4cb1ef9510b` | [success](https://github.com/matthnj15-pixel/Willow-Valley/actions/runs/41217045904) |
| Work's verified asset research | [#62](https://github.com/matthnj15-pixel/Willow-Valley/pull/62) | `a5228c83ba4da94ff9bb3d5b0d807efa5e92b08e` | [success](https://github.com/matthnj15-pixel/Willow-Valley/actions/runs/41217300506) |
| Full rotated footprint placement validation | [#63](https://github.com/matthnj15-pixel/Willow-Valley/pull/63) | `0b8f0f7f343ce26f41393a3d3bc1d1c047ec75c4` | [success](https://github.com/matthnj15-pixel/Willow-Valley/actions/runs/41217309896) |
| B1/B2: verified local assets and Three.js gallery | [#64](https://github.com/matthnj15-pixel/Willow-Valley/pull/64) | See PR merge record and deployed service-worker VERSION | CI attached to exact head in PR |

## Asset gallery checks

On the integrated foundation/marker/junction baseline: `npm test` **145 passed, 1 opt-in generated-icon check skipped**; `npm run test:e2e` **70 passed**; icons and standalone offline builds passed. `npm run build:assets` validates three generated GLBs through the Khronos validator: **zero errors and zero warnings**. Model source, output, texture and license hashes are checked. Gallery tests capture four orientations, exercise view/wireframe/grayscale/missing-model controls and assert zero external HTTP requests. A clean PWA install caches every gallery model before offline navigation, selection and reload.

The gallery is a review gate, not gameplay rollout. Two reviewed-source assemblies and an oak exist; the reserved six-entry house identity catalog does not claim the other four models are built. Runtime registry records remain `gallery-review`, `runtimeReady:false`. The six-house/seven-facility catalog, terrain-fitted Three.js gameplay adapter, environmental integration and real-device performance remain following slices under #57/#53. Existing remote Kenney loads in the native gameplay renderer are not claimed eliminated by this isolated gallery milestone. Standalone offline.html retains the existing game presentation.

## UAT and deployment verification

- Development game: https://matthnj15-pixel.github.io/Willow-Valley/dev/
- Architecture study after #64 deployment: https://matthnj15-pixel.github.io/Willow-Valley/dev/ui-kit/asset-gallery.html
- World Builder: https://matthnj15-pixel.github.io/Willow-Valley/dev/ui-kit/world-lab.html
- Exact deployed development commit is emitted as `VERSION` in `/Willow-Valley/dev/sw.js`. Confirm it with a cache-busting query and the successful Publish Willow Valley workflow; workflow head SHA itself refers to the stable workflow file, not necessarily the preview checkout.

Focused design and validation details are in the adjacent `WV-56-*` notes. Screenshots are retained as CI artifacts. Extreme acute/self-intersecting road alignments and on-device touch/FPS remain UAT risks; do not close #56 or claim the entire art overhaul complete solely from this ledger.
