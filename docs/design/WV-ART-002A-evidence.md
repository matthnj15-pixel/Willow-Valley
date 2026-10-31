# WV-ART-002A: evidence, source decisions, and validation

**Research date:** 2026-10-31. **Final audited develop baseline:** `ae364169d7d3d3d30294fd8ce44c4c83dfc2b719`. Initial audit was `9b074fcd96015fe5f3896f9fad9f671159448b24`; #58, #59, and #60 merged during research. The branch rebased again and the specifications reuse completed contact/foundation work, authored-road safety, and trimmed junctions with natural shoulders.

## Evidence levels

- **Measured:** acquired archives/files, included licenses, hashes, scene transforms, rest-pose dimensions, triangle/primitive counts, image dependencies, and current repository code.
- **Publisher statement:** public pack/license pages and official technical documentation. Landing-page counts do not override the inspected archive contents.
- **Proposed:** material palette, six original house plans, final output paths, assembly/authoring work, budgets, canonical pivots/entrances, target interfaces, and new acceptance tests. These have not been shipped or measured on a physical phone.

The [source manifest](../assets/wv-art-002a/source-manifest.json) and [full CSV](../assets/wv-art-002a/kit-inventory.csv) hold file-level evidence. The [role plan](../assets/wv-art-002a/role-plan.json) links six house assemblies and seven facility compositions to exact verified source IDs. `runtimeReady:false` is deliberate. No proposed output filename is represented as a vendor download.

## Primary asset and license sources

| Source | Evidence and decision |
| --- | --- |
| [Fantasy Town official page](https://kenney.nl/assets/fantasy-town-kit), [creator's OpenGameArt upload](https://opengameart.org/content/fantasy-town-kit) | Official page labels v2 remake, approximately 160 files, CC0. Acquired Kenney upload includes version 2.0 license and **167 GLBs**. Choose as primary modular building source |
| [Survival official page](https://kenney.nl/assets/survival-kit), [creator upload](https://opengameart.org/content/survival-kit) | Acquired 2.0 notice, **80 GLBs**. Choose wood structures/tools/resources; omit metal-sheet shelters and unrelated survival items |
| [Nature official page](https://kenney.nl/assets/nature-kit), [creator upload](https://opengameart.org/content/nature-kit) | Included notice says **2.1**; official landing page's history is less specific. **329 GLBs** inspected. Retain original filename case and underscores; replace TGE-renamed copies through a deliberate local mapping |
| [Castle official page](https://kenney.nl/assets/castle-kit), [creator upload](https://opengameart.org/content/castle-kit) | Acquired 2.0 notice, **76 GLBs**. Use restrained masonry/steps and future gallery candidates, not a castle theme across the founding hamlet |
| [CC0 dedication](https://creativecommons.org/publicdomain/zero/1.0/) | Included Kenney notices dedicate these contents under CC0. Preserve provenance and optional Kenney credit; no paid purchase or remote runtime access needed |
| [Existing TGE redistribution](https://github.com/Hidencod/tge-assets) | Existing game depends on renamed remotely hosted assets. Useful mapping evidence, but not the chosen original-source import. New runtime must use local, pinned originals or recorded derivatives |

Acquired ZIP URLs and SHA-256 values are in the manifest. All four archives were downloaded successfully from Kenney's creator uploads on OpenGameArt; direct kenney.nl binary fetches returned HTTP 403 in this environment. No claim is made that a failed primary-host request verified a binary. The saved included notices and actual measured bytes are the verification record.

### Quaternius decision

The [current QAL v1.0 page](https://quaternius.com/license.html), dated August 28, 2026, permits products incorporating assets but restricts standalone asset redistribution; it also states that changes do not apply retroactively to earlier acquired releases. Meanwhile the [Medieval Village pack page](https://quaternius.com/packs/medievalvillage.html) still labels its pack CC0 and lists FBX/OBJ/Blend. These public pages do not establish which license accompanies a newly acquired exact archive or that it can be checked into this public source repository.

**Decision:** do not acquire/commit Quaternius models for the initial bundle. Record it as deferred rather than declaring all its content unusable or assuming CC0 from an older third-party listing. Reconsider only with exact version, included license, acquisition date, and explicit public-source distribution review. Kenney plus original assemblies covers every required current role, so this uncertainty does not block the requested research or initial implementation.

## Historical references and art inference

| Primary reference | Supported observation | Our art interpretation |
| --- | --- | --- |
| [English Heritage, Medieval Architecture](https://www.english-heritage.org.uk/learn/story-of-england/medieval/architecture/) | Timber construction appears in domestic and agricultural buildings | Use readable timber framing and varied infill; not a claim that every proposed roof plan comes from a single medieval locality |
| [English Heritage, Leigh Court Barn history](https://www.english-heritage.org.uk/visit/places/leigh-court-barn/History/) | Timber frame on a sandstone plinth | Express a level structural seat meeting terrain, without copying the barn |
| [Historic England, Spellbrook granary listing](https://historicengland.org.uk/listing/the-list/list-entry/1347830) | A seventeenth-century timber-framed granary with boarding and upper doors | Storage/loading silhouette reference, explicitly later than the founding hamlet inspiration |

Foundation, Outlanders 2, CityRT, and Cádiz remain approved **experience/composition references** in the handoff. This research does not infer their engine architecture or reuse their proprietary art. Historical descriptions inform our own fictional vocabulary; specific plans, era assignments, and proportions are design proposals.

## Technical sources consulted

| Official reference | Use in specification |
| --- | --- |
| [Khronos glTF 2.0 specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html) | Scene transforms, coordinate conventions, binary structure, image dependency handling |
| [Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html) | Standard import, texture-transform support, optional decoder configuration |
| [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html) | WebGL2 requirement, renderer statistics, sizing/material pipeline |
| [Three.js OrthographicCamera](https://threejs.org/docs/pages/OrthographicCamera.html) | Projection parity, camera bounds and resize updates |
| [Three.js Raycaster](https://threejs.org/docs/pages/Raycaster.html) | Layered picking and stable instance-to-entity mapping |
| [Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) | Reuse geometry/materials, matrix dirtiness and bounds management |
| [Three.js color management](https://threejs.org/manual/pages/color-management.html) | Linear lighting and sRGB input/output interpretation |
| [Three.js disposal](https://threejs.org/manual/pages/how-to-dispose-of-objects.html) | Resource lifetime and shared image bitmap ownership |
| [MDN Cache.addAll](https://developer.mozilla.org/en-US/docs/Web/API/Cache/addAll) | Complete required-cache installation and failed-fetch handling |

These references support API behavior. The proposed module boundaries, budgets, batching layout, and performance targets are project-specific engineering decisions, not claims of guaranteed performance from library documentation. Choose and pin the actual engine/tool versions during implementation.

## Local validation of this research PR

After rebasing onto `ae36416`:

| Check | Result |
| --- | --- |
| `python .../audit-kits.py --kits /tmp/wv-kits --out /tmp/wv-audit` | Inspected 652 GLBs with default-scene transforms; emitted inventory and measurements; all external image dependencies resolved |
| Research integrity audit | 78 selected source files re-hashed; all 652 CSV rows matched measured data; archive/license hashes, all 13 role plans, and local Markdown links checked |
| Study-board review | PNG visually inspected; source previews labeled separately from proposed diagrams; palette and text fit |
| `npm test` | **138 passed, 1 skipped, 0 failed**; generated-icon opt-in test is the skip |
| `npm run build:icons` and `CHECK_BUILT_ICONS=1 node --test tests/icon-artifacts.test.mjs` | Generated PWA icons; opt-in icon test **1 passed** |
| `npm run build:offline` | Completed; produced existing self-contained game export. This does not prove future model-backed export |
| `npm run test:e2e` | **68 passed** after installing repository-pinned Playwright Chromium; current mobile-emulated browser baseline |
| Diff scope | New research files only under `docs/design/` and `docs/assets/`; no gameplay, runtime, dependency, workflow, or save changes |

An initial browser attempt ran before Chromium installation completed and failed to launch the browser. The reported 68-pass result is the complete rerun after setup, on the final rebased source. Generated local build/test artifacts and downloaded vendor binaries are excluded from this PR. No tests of hypothetical future models are claimed.

GitHub CI status and run URL belong to the PR record after push. This branch is intentionally left as a PR targeting `develop`; no main merge or deployment is part of issue #55's research deliverable.

## Remaining implementation gates

Final assemblies and LODs do not exist yet. Final scale/pivot/door coordinates, material derivatives, output hashes, offline registry installation, glTF validation, and physical-device FPS require B/C/D implementation and evidence. The source formats and authoring units are measured; historical physical dimensions are not asserted. New water/grade/footprint authoring policies must preserve existing decisions and legacy saves. The catalog resolves required art sourcing without quietly approving new gameplay.
