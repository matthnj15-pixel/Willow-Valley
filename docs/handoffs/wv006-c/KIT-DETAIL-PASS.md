# C4: purchased MegaKit finishing pass

The user authorized implementation of the purchased kit's architectural and work-yard details. This pass adds original kit shutters/windows, selected structural brackets, crates, a delivery wagon, wooden garden fences and sparse climbing vines. It restores the kit's normal/roughness maps and derives a shared structural atlas from its wood, plaster, stone and clay surfaces. Plans, silhouettes, fixed scale, five home identities plus the existing sixth fallback, stage/circulation and gameplay remain unchanged.

Started from fetched develop `8055d769df3969b7e49c114a45877205be0aacef` in isolated worktree `/workspace/wv006-c-kit`, branch `feat/wv-art-006-c-kit-details`. Refreshed to develop `7f4b638165d3c89c935188dc70c4f768f4917335` after A’s meadow PR #91. No applicable AGENTS.md was found. All implementation and evidence stays in C's exclusive paths. The main C2/C3 GLBs, manifests and accepted recipe stay byte-identical, preserving B's hamlet, A's exact dependency pins and existing consumers. C4 uses a separate build entry point and explicit manifest. There is no automatic runtime adoption. The refreshed unit checks caught A’s byte-pinned baseline manifest dependency; the C4 launcher was separated so the original recipe/manifests also remain unchanged.

## Actual purchased inputs and reproduction

The user supplied the private Source share during this task. The downloaded ZIP was verified before derivation: **708,720,797 bytes**, SHA-256 **`5e60888e2babe418a4618e7815539d9b1b2c3b24c1db2b22cd7a2a7f66140732`**. Its attached CC0 Source notice matches **`7310dfa8512d7ca12b6591329fda4adab7e8b9cdbe04c7d7061c2fe5c7dc38ee`**. The notice is copied byte-for-byte as `assets/wv/buildings-next/License_Kit_Source.txt`. Every selected glTF, BIN and image is checked against the existing audited per-file SHA-256 inventory. The private share URL, download tokens and archive are not committed.

Before the Source link arrived, the publisher's public Standard subset was checked and matching modules were found. The delivered checkpoints were subsequently regenerated from the **verified purchased Source ZIP**, including the original FlatTiles maps absent from that public subset. The delivered `kit-library-manifest.json` records Source tier and the actual archive hash; no unavailable input is claimed.

Source modules:

- `Window_Thin_Flat1`, `WindowShutters_Thin_Round_Open`, `WindowShutters_Thin_Flat_Open`.
- `Prop_Support`, `Prop_Crate`, `Prop_Wagon`, `Prop_WoodenFence_Single`.
- `Prop_Vine1`, `Prop_Vine4`.

The small optimized nine-module library is a build checkpoint, not a dump of the 304-module pack. Materials are shared and source images reduced; geometry stays at original physical scale. The flat shutter variant is retained as a small curated library alternative, while current cottage placements use the matching round shutters. No engine projects, scripts, shaders, collisions, Blender/FBX/OBJ collection or source ZIP is committed or executed.

Normal rebuild from a clean checkout:

```sh
npm ci
node scripts/build-wv006-baselines.mjs
node buildings-next/kit-details.mjs
```

This uses committed optimized checkpoints only, without the private archive or network. Reimporting the licensed source checkpoint additionally requires the hash-pinned archive:

```sh
node buildings-next/kit-details.mjs --import-kit /private/path/Source.zip
```

The archive is a prerequisite for **source reimport**, not ordinary checkout rebuilding. Apply `WV006_OUTPUT=/tmp/output` to both commands to rebuild the baseline/C3/C4 outputs in isolation. The deterministic check compares both unchanged baseline GLBs, their manifests/licenses, and the new C4 GLB/manifest byte-for-byte. The source importer verifies the archive/notice and all selected dependencies before temporary extraction, then removes raw extracted inputs.

## Where detail changes

| Candidate | Finish |
| --- | --- |
| Five homes | Preserve every accepted PR 81 core position/normal/UV/index/base-color image. Remove the generic C2 window overlays so the original kit windows show, add matching kit shutters, restore original source normal/roughness maps, and place a single sparse vine on a closed rear wall. Thatch remains the authored closed layered roof. |
| Farm | Replace generic side-window overlays with kit windows; one kit bracket reinforces the rear hay bay. Keep the front work approach clear and place a crate under the rear loft. Wide cargo doors, barn roof and hay/work bays remain. |
| Smith | Retain the one continuous hearth/hood/flue/stack and roof aperture; finish masonry/timber using kit-derived surface relief. No source chimney prop is added. |
| Granary | Replace the generic loading crate with the kit crate, seated on the 1.35 m deck beyond the cargo corridor. Keep the store floor, individual supports, stairs and open undercroft unchanged. |
| Lumber | Kit crate at the bench end and a small rear vine; racks, cutting apron and low shelter stay open. |
| Market | Replace the small authored barrow stand with the kit wagon and one cargo crate. The crate rotates rigidly to a plane sampled from the actual sloping wagon bed; its underside is checked against supporting geometry. Twelve stands and the two broad crossing routes remain. |
| Parks/plazas | Short kit fences frame selected sitting/flower gardens and the fountain's outer corners. Fence placement avoids the actual promenade routes; parks remain open terrain with no whole-plot slab. |

Core architecture precedes clutter. Loose crates, delivery wagon and vines hide with the existing props control; windows, shutters, brackets and boundary fragments remain structural. Low omits vines, shutters and small cargo, reduces the wagon with pinned Three.js SimplifyModifier, retains boundary silhouettes and uses color-only materials with **no normal or roughness maps**. The low wagon is reseated after simplification. No completed asset is stretched to fit a parcel.

The C4 structural atlas preserves the original thatch/canvas/iron regions and combines selected kit wood/stone/plaster/clay patches. A separate full-wood tile retains original UV orientation for imported kit geometry. Original home core UVs/base colors are untouched; their restored maps use the canonical plain-glTF texture coordinates. Normal data is resized in linear space and renormalized; roughness uses the source green channel with nonmetallic blue. No Unity/Godot wear shader is copied. The original FlatTiles maps are restored from the paid Source archive, not substituted with an unrelated roof texture.

## E/F contract

`assets/wv/buildings-next/kit-detail-manifest.json` (recipe revision 4) is the current detail candidate contract. Its eighteen entries map to existing identities. `kit-detail.glb` has eighteen normal roots and eighteen `__low` roots; all remain `gallery-review`, `runtimeReady:false`. Units are visual metres, Y up, placed uniformly at **2.8 game units/m**, with the same **1.75 m** reference. The `home-crooked-wing` fallback and identity hash/order are unchanged. Level/era, occupants/jobs, production/output, costs, unlocks, zoning, roads, gestures and all three save slots remain authoritative and untouched.

`sourceCandidate` identifies each retained C2/C3 reference. Full normal/low bounds/counts are remeasured **after** deduplication/pruning. Existing seat/roof/stair/deck envelopes and the granary's no-solid-infill rule remain. Yard bounds include the final detail geometry; normal/low full dimensions are measured separately. `kitInstances` records each namespaced component node, source asset, rigid pose, scale=1, actual world-space bounds and actual bottom contact vertices. Contacts are geometry measurements, not object pivots. A pitched cargo instance additionally records its supporting plane. Normal terrain contacts are merged with retained contacts; obsolete barrow contacts are removed. The barn's separate `detailAccess` sweep records its clear front work approach.

Kit component transforms are baked into their mesh vertices for the current export; their named nodes remain independently adjustable for terrain seating. Do not scale a whole merged category, create a solid park foundation or fill the granary undercroft. F must conform ground patches and seat objects/supports independently, keep structural floors/roofs level, or reject unsuitable slopes. Existing inherited source-home closed door leaves are intentional closures: regressions check new kit attachments against their approaches, while the unchanged core is verified byte-for-byte. Full civic/workplace sweeps use actual exported triangles and node transforms.

The review page compares **C3 layout / kit detail**, including public spaces, at normal and low. The Surface relief control allows a same-camera rendered check of actual normal-map response. All maps/images are embedded in C4's GLB. Runtime candidate dependencies are that GLB and its manifest only; `kit-library.glb`, library metadata, optimized `kit-surfaces/*` and source notice are authoring/provenance checkpoints. C2/C3 reference bundles are gallery comparison dependencies. Pages already publishes the assets/ui-kit paths; no shared workflow or loader is modified. This page is not claimed installed/cold-offline ready.

The synthetic benchmark now respects retained nested mesh transforms using a root-relative matrix; earlier assumptions that every inherited mesh was baked were too broad. It also includes fixed kit dressing in the budget. This fixes the review fixture, not shared scene batching. F must select C4 explicitly, prove combined material/geometry ownership and offline closure, repeat all views on final ground, and perform actual rotated-parcel/slope/road/water and physical-device acceptance. Default game rendering and prior consumers keep their existing assets.

## Evidence and remaining gates

Source/library/C4 glTF, contact/route, accepted-core and rebuild tests are in `tests/wv006-baselines*.test.mjs`. Browser checks cover all eighteen designs, six cameras, both detail levels, C3/C4 comparisons, choices/state isolation, no external requests/errors, hidden/idle behavior and actual rendered relief. Both root and /dev/ are tested. The restored maps produce measurable same-camera pixel changes; low assigns none of those maps.

Measurements/captures: [kit-detail evidence](../../testing/wv006-c/kit-detail/README.md). Exact files: [kit-detail changed files](KIT-CHANGED-FILES.txt). Required npm unit/browser/parity and asset/icon/offline results, exact output hashes, PR/head/merge SHAs, required CI and verified Pages URLs are recorded there and on the delivery PR. Capture/benchmark GPU work and the full browser suite run sequentially.

All five workplaces stay below 6k normal triangles and at most three material groups. Homes retain source material/triangle exceptions; three plazas retain their four-material exception. The full normal+low candidate texture set has about 31 MB estimated RGBA8 mip storage. The separate comparison scene adds review overhead. Whole-scene triangle failures at 100 homes and physical-phone performance remain admission blockers. Do not promote these meshes merely because the gallery or CI passes.
