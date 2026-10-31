# WV-ART-002A: verified source inventory

Research for [issue #55](https://github.com/matthnj15-pixel/Willow-Valley/issues/55), parent #53. Audited 2026-10-31 against `develop` commit `ae364169d7d3d3d30294fd8ce44c4c83dfc2b719`. This directory is evidence for a later implementation PR. No runtime models, rendering behavior, economics, or save fields change here.

## Read in this order

1. [Art bible](../../design/WV-ART-002A-art-bible.md), including the visual study board.
2. [Complete role crosswalk and assembly specifications](../../design/WV-ART-002A-building-catalog.md).
3. [Renderer ADR](../../design/WV-ART-002A-three-mobile-adr.md).
4. [Codex slices and acceptance matrix](../../design/WV-ART-002A-codex-plan.md).
5. [Source manifest](source-manifest.json), [machine-readable role plan](role-plan.json), [all-kit measured inventory](kit-inventory.csv), and [sources and validation](../../design/WV-ART-002A-evidence.md).

## What is verified

Downloaded the **creator Kenney's uploads on OpenGameArt**, after kenney.nl binary downloads returned HTTP 403. Read the archive `License.txt` in each, parsed every GLB's default scene including node transforms, counted indexed triangles, measured transformed vertices, resolved every external image, and hashed source files. These are acquired source archives, not unverified third-party conversion mirrors. Archive SHA-256 is the revision authority; landing-page counts are approximate.

| Archive | Version in included license | Measured GLBs | Archive bytes | Decision |
| --- | --- | ---: | ---: | --- |
| Fantasy Town | 2.0 | 167 | 3,854,691 | Primary modular architecture and market props |
| Survival | 2.0 | 80 | 1,948,174 | Working yards, tools, logs, small shelters |
| Nature | 2.1 | 329 | 10,537,521 | Existing nature vocabulary and wheat rows |
| Castle | 2.0 | 76 | 2,232,589 | Limited steps, later civic studies; avoid fortifications in founding hamlet |

All four **included notices say CC0**. Preserve their exact bytes in [licenses](licenses/). Local Git attributes preserve vendor line endings and exempt only those untouched notices from whitespace cleanup. CC0 terms: https://creativecommons.org/publicdomain/zero/1.0/. Original pack pages: [Fantasy Town](https://kenney.nl/assets/fantasy-town-kit), [Survival](https://kenney.nl/assets/survival-kit), [Nature](https://kenney.nl/assets/nature-kit), [Castle](https://kenney.nl/assets/castle-kit). Acquired URLs, hashes, formats, and license hashes are in `source-manifest.json`. The archive licenses identify versions that some landing pages omit.

The CSV inventories **652 GLBs**, including rejected and future-only candidates. The JSON selects **78 inspected source meshes**, totaling **1,274,936 GLB bytes** before external textures, assembly repetition, or optimization. This is a research shortlist, not an install bundle or a measured final download budget. Future Castle candidates are included in that number.

## Critical import facts

- Fantasy Town, Survival, and Castle GLBs reference **`Textures/colormap.png`** externally. All 323 models across these three kits need that dependency. Each pack's texture has different bytes despite sharing the same filename. Never flatten these folders together.
- The selected source textures are 512 × 512 PNG: Fantasy 11,143 bytes, Survival 7,440, Castle 7,529. RGBA8 storage with a full mip chain is about 1.33 MiB per texture, regardless of PNG download size. Actual browser/GPU formats remain to be measured.
- Nature's 329 inspected GLBs have no external images. Source names retain underscores and case, for example `tree_pineDefaultA.glb`. Existing TGE URLs rename these to `tree-pinedefaulta.glb`; those names are **not original archive names**.
- No selected mesh requires Draco, Meshopt, or KTX2. Source extensions encountered in the full inventory are `KHR_texture_transform` and `KHR_materials_unlit`. Compression is an optional later measured choice.
- A modular wall is offset to a cell boundary: Fantasy `wall.glb` bounds are `[0.4,0,-0.5]` to `[0.5,1,0.5]`. Do not recenter each piece independently. That destroys assembly alignment.
- `wall-door.glb` has a child door; `workbench-anvil.glb` has a child hammer. Default-scene bounds include these transforms. Preserve hierarchy during import; static assemblies may bake their verified rest pose.
- Source origin, floor contact, and a usable doorway are different things. `tree-log.glb` extends below Y=0. Canonical pivots and entrances must be authored for final assemblies, then visually verified. No arbitrary source prop has a claimed doorway.

## Evidence schema

`source-manifest.json` is intentionally **not runtime-ready**. `entranceVerified:false` and promotion gates prevent accidental admission to the shipping registry. Every selected row gives its exact archive path, SHA-256, bytes, default-scene bounds/dimensions, primitive and triangle counts, root node transforms, material count, extensions, external images and their hashes. The same path within different kits is a different asset.

`kit-inventory.csv` records all inspected files. `sceneTriangles` counts primitives traversed in the default scene at the rest pose; it is not an optimized LOD or a GPU draw-call measurement. Dimensions are source coordinate units. glTF specifies metres, but these stylized pieces need an explicit game-scale calibration rather than treating those numbers as historical measurements. No skeleton animation or animated extrema are evaluated.

## Reproduce

Acquire the **exact hashes** in the manifest and extract to `KIT_ROOT/fantasy`, `survival`, `nature`, and `castle` without altering paths. Then:

```sh
python docs/assets/wv-art-002a/audit-kits.py --kits KIT_ROOT --out /tmp/wv-audit
```

The script uses Python 3's standard library, checks GLB headers, traverses default scene transforms, reads POSITION accessors and triangle counts, validates external image presence, and emits `kit-inventory.csv` and `measured-models.json`. Unsupported modes/sparse positions fail explicitly. Compare output CSV bytes with the committed CSV. It is a narrow research inspector, not a replacement for Khronos glTF Validator or Three.js GLTFLoader.

The [study board](study-board.png) uses selected Kenney archive previews under the attached CC0 notices and original diagrammatic shape studies. It is a composition reference, not proof of assembled models or in-game screenshots.
