# WV-ART-002A: sequenced Codex implementation and acceptance

Read the [handoff](../handoffs/WV-3D-2026-10-31-work-codex.md), [art bible](WV-ART-002A-art-bible.md), [role catalog](WV-ART-002A-building-catalog.md), [ADR](WV-ART-002A-three-mobile-adr.md), and [source evidence](../assets/wv-art-002a/README.md) first. Source assets are verified; assembled models, calibrated entrances, and phone performance remain implementation work. This research PR does not claim Tracks B/C/D are implemented.

## Slice plan and dependencies

Each row is a separately reviewable feature-branch PR from the latest `develop`. Refresh the audit before editing. Do not rewrite the application, simulation, save system, or completed terrain work. Existing #56/Track A can proceed independently, with shared geometry contracts.

| Slice | Deliverable and touch points | Dependency and exit gate |
| --- | --- | --- |
| B1: acquire and normalize | Reacquire exact archive hashes; preserve licenses; create local `asset-registry.mjs` and deterministic import/build recipe; export two homes and one tree; generate required dependency list | This research; all hashes/paths validated, complete-scene transforms, canonical +Z doorway/floor pivot, glTF validation, no external texture surprise |
| B2: gallery and package | Add isolated asset gallery to canonical `ui-kit/world-lab.html` / `.mjs`; metadata panel, scale grid, door arrows, footprint/overhang overlays, source/output hashes, wireframe and missing-asset case | B1; local Three.js/loader and example assets copied into Pages `/dev/`, registry-driven offline install and root/dev URL tests; current game stays legacy by default |
| B3: adapter parity | Feature-flagged `world-renderer-three.mjs`, stable `mountWorld3D` API, existing gesture helpers, terrain/foundation reuse, independent overlays, safe backend/canvas switching | B2 and latest Track A contact surface; camera/picking/touch/save/state parity, context-loss and offline model-complete PWA tests |
| C1: full residential set | Assemble all six distinct house forms; deterministic v1 mapping, uniform fitting, era finishes, bounded door paths, model gallery and 30-home fixture | B3; six grayscale-distinct silhouettes, four cardinal entry tests, fit and legacy fallback tests, no simulation changes |
| C2: working facilities | Farm + barn, lumber, smith, granary; original gap meshes, restrained activity dressing | C1; authentic role silhouettes, fields mask/deduplication and clearance, existing staffing/unlocks unchanged |
| C3: public spaces | Open marketplace, plaza, park; clipped paving, sparse perimeter details and readable circulation | C2; no roofed plaza/park, no blocked public access, all seven categories identifiable in Development and World Lab |
| D1: coherence and optimization | Shared material palette, local nature replacements, instancing/chunks, LOD, culling, bounded shadow and quality presets | All catalog roles; meet recorded transfer/draw/triangle budgets, release all resources after repeated slot/world switches |
| D2: device UAT | Physical iPhone portrait testing, 30/100-building benchmark, offline installation/upgrade, before/after captures, current deployed commit | D1; record actual device/OS/viewport and evidence; do not claim 30 FPS from desktop Playwright |

**Parallel Track A remainder:** reuse `terrain-surface.mjs`/`foundation-system.mjs` from #58; improve junction unions/shoulders, authoring validation, and screen-space editor controls. Do not add duplicate samplers or a second road graph. New-site rejection policies belong in explicit authoring/simulation changes with tests. Existing saves retain a renderer fallback where a new visual cannot seat safely.

## Gallery specification

Show each asset/assembly at four orientations, plus normal, low, and high camera pitch. Display a 1-source-unit calibration cube and one current blueprint envelope side by side. Show actual bounds, primitive/triangle counts, local bytes, source license/hash, canonical transform, entrance normal, foundation footprint, overhang polygon, and corridor. Allow low/normal quality and shadows-off comparisons. Use local content only.

The gallery is a **render-only fixture**, not a new settlement mode. It may select six home forms directly to verify coverage. Future chapel or mill studies require a visible `gallery-only` role and cannot appear in game build menus, regular model selection, saves, labor planning, or unlock tables. Mark missing/invalid imports clearly and retain fallback geometry.

## Deterministic scenes

Commit fixture seeds and state JSON with the implementation PR, not randomly assembled screenshots. Keep camera, renderer version, source hashes, CSS viewport, DPR, light, and quality with each reference capture. Existing `tests/browser/terrain-contact.spec.mjs` supplies the ridge/curve/junction/cottage foundation baseline; extend it rather than replace it.

| Fixture | Required content | Capture views |
| --- | --- | --- |
| `WV-A01-ridge` | Straight and curved dirt alignment across ridge, two road directions, thin shoulders | Pitch 0.40/0.86/1.35; opposite yaw; no hidden strips |
| `WV-A02-junctions` | T, four-way, acute Y, curved meeting, unequal widths, disconnected visual crossing | Same three pitches; wireframe and lit; boundaries/junction topology visible |
| `WV-A03-seats` | Six house forms on rotated flat/gentle/convex sites, porch and granary platform | Front and downhill; floor/entrance/perimeter diagnostics, shadows off |
| `WV-A04-water` | Road approaching lake/river edge; wet new-site attempt; old difficult save site | Low/high view; no auto-bridge; clear existing-rule error or safe legacy fallback |
| `WV-C01-hamlet30` | 30 irregular existing parcels, forced gallery coverage of six homes, all seven facilities, real farmland and open civic spaces | Normal neighborhood zoom and closer entry check; labels off and role overlay |
| `WV-D01-town100` | 100 homes plus the same facilities and representative nature/roads | One repeatable 60-second camera path; 10-second warm-up; log median/p95/p99 frames |

Use viewport 600 × 850 CSS px and DPR2 for parity with existing browser tests, plus a narrow portrait viewport and the actual target phone viewport for later UAT. Keep folds/aspect changes as resize scenarios; do not invent physical display specifications. Before/after captures must include both Development game and canonical World Lab, with the same state and camera.

## Acceptance matrix

IDs below are **new planned tests/reviews**, not existing passing tests. Existing suites are named separately in the final column.

| ID | Requirement | Test or review and pass condition | Existing baseline to protect |
| --- | --- | --- | --- |
| ART-SRC-01 | Exact, legal, local assets | Verify every acquired/output/dependency SHA; glTF Validator; no unknown license or unresolved URI; final runtime registry contains only `ready:true` approved roles | `tests/kenney-models.test.mjs` and committed source inventory |
| ART-HOME-01 | Six forms | Gallery forces each ID and 30-home scene includes all six; monochrome human review confirms silhouette differences, not just colors | `tests/historic-growth.test.mjs`, `tests/zone-silhouette.test.mjs` |
| ART-ID-01 | Stable visuals | Reload, reordered arrays, turn advancement, renderer toggle, and three slot switches produce same asset/era/props for unchanged entity; equal world quality yields same geometry | `tests/save-slots.test.mjs`, browser `save-slots.spec.mjs` |
| ART-STATE-01 | Read-only adapter | Deep-frozen input succeeds; serialized state identical before/after view construction, loads, draw, selection, failure, and disposal; identical monthly outcomes with flag on/off | `tests/simulation.test.mjs`, civic/living-settlement tests |
| ART-FIT-01 | Footprint and scale | Uniform scale only; footprint/overhang/props inside legal envelope; no door/window distortion; fallback when fit fails | `tests/organic-world.test.mjs`, historic-growth tests |
| ART-DOOR-01 | Physical frontage | Cardinal and diagonal facing fixtures; canonical +Z entrance rotates toward real approach; continuous bounded path with no water/road/neighbor obstruction | Organic lane/zoning browser suites |
| ART-SEAT-01 | Terrain seat | Floors/eaves level <=0.001 unit variation; contact error <=0.02 unit; all perimeter and interior ridges supported; no parcel-wide flattening | `terrain-contact.test.mjs`, `terrain-integrated-surfaces.test.mjs` |
| ART-ROAD-01 | Clean roads and joins | Compare sampled triangle interiors to displayed terrain; filled trimmed junctions without gaps/flicker; existing topology unmodified | Terrain contact tests, road network/editor and 3D drag suites |
| ART-FIELD-01 | True farmland | No crops on previews, dry grass, water, roads, preserve, or uncommitted zones; shared fields rendered once; no fake seasonal growth or changed yields | Civic/living-settlement and organic-zoning tests |
| ART-ROLE-01 | All seven facilities | Labels-off review identifies every role; no residential box substitute for plaza/park; existing costs/staff/unlocks unchanged | `BUILDINGS`, `unlocked`, `workforce`, browser living-settlement tests |
| ART-INPUT-01 | Touch and picking | Current two-finger push/tilt/pinch behavior and paint/pan/erase pass; projected road handle hit areas >=44 CSS px; no input leakage after toggle/resize | Camera-gestures, road-editor, road-3d-drag-fix, organic-zoning browser suites |
| ART-OFFLINE-01 | Complete installed PWA | Start clean, install **without visiting gallery/all variants**, await required-cache readiness, disable network, cold relaunch and open all six homes/seven roles plus all three slots; zero external requests | Offline and terrain-contact browser suites; these alone do not yet guarantee models |
| ART-UPGRADE-01 | Safe install updates | Interrupt one texture/engine fetch, retain prior complete version and saves, retry successfully; test root and `/dev/` scope with matching published registry | Startup resilience, offline source/cache tests |
| ART-EXPORT-01 | Standalone remains usable | `offline.html` loads via file URL disconnected and advances months; if claiming model support, instantiate all catalog roles without fetches | `tests/browser/offline.spec.mjs` packaged-file baseline |
| ART-LIFE-01 | GPU/lifetime | 20 alternating slot/world/backend changes; no duplicate listeners, stale async attachment, monotonic geometry/texture growth, or invalid shared disposal; context-loss recovery | Save/startup suites plus new renderer diagnostics |
| ART-PERF-01 | Mobile budget | 60-second physical-phone run at 30 and 100 homes logs all ADR metrics; normal/low presets meet targets or documented exceptions remain blocked from default rollout | No physical-phone performance proof currently exists |

## Required checks and evidence per implementation PR

Run `npm test`, `npm run build:icons`, `npm run build:offline`, and `npm run test:e2e` after dependency/browser setup. Add focused tests for the changed contract and preserve existing baseline suites. Attach deterministic visual references and logs, record the exact pushed SHA, verify CI and Development deployment if the PR is merged. These future changes need visual checks as well as unit tests.

For this **research-only PR**, run the existing suite as regression evidence, validate research JSON/CSV/licenses/links and reproducibility, and review the study board. Do not claim that a documentation PR proves the future rendered assets, physical phone FPS, or current deployment.

## Copy-ready next Codex task

> Start a feature branch from latest develop. Read the WV-3D handoff and WV-ART-002A documents. Implement B1 and B2 only: acquire the exact Kenney hashes, normalize two house assemblies and one Nature tree using full scene transforms, retain all licenses, generate a typed local registry and dependency install list, and add an isolated World Lab gallery with bounds, entrances, footprint, and byte/triangle diagnostics. Pin and locally bundle a single Three.js version and matching GLTFLoader. Extend branch-local Pages/offline packaging for the gallery slice. Keep the game renderer and all simulation/save contracts intact. Use no remote runtime URLs, unverified Quaternius assets, chapel build type, or invented prebuilt cottage filenames. Add and run the specified tests, open a PR to develop, and report exact commit and CI evidence. Stop before enabling Three.js gameplay by default.
