# Inhabited hamlet — measured acceptance

Scope: the user-approved composed 12-home reference and 4/30-home growth views. The review is `gallery-review`, `runtimeReady:false`. It does not change playable world generation, simulation, trees/world seed, saves, roads, permissions or input. F owns application adaptation. The historical and Foundation references, and the limits of those references, are in [the research brief](../../../handoffs/wv006-b/HUMAN-SHAPED-SETTLEMENTS.md).

Started from develop `dfce32070078ffed319edb859c320e9a568ec7d4`; incorporated C detail PR 86 at `ba8cba587c0fb0516367c362b20869493df0d599` without conflicts. C-owned files are consumed as committed; no changes to their geometry or metadata are proposed here. The follow-up's exact authored file list is [INHABITED-CHANGED-FILES.txt](../../../handoffs/wv006-b/INHABITED-CHANGED-FILES.txt).

## Composition and measured contacts

The default 12-home view has a shared green, a well, connected doors/gates, three household uses, farm and smith work areas, granary loading access, field/paddock edges and retained woodland. Later holdings extend the original lane system. Founders, gates, early lanes and mature tree instance identities are unchanged across 4/12/30 stages and normal/low quality. The layout is authored; a different seed supplies stable cosmetic variation, not a new historical layout. The older 30/100-home performance fixture remains separately selectable and is unchanged.

The scene resolver checks C's complete measured roof/stair bounds at uniform 2.8 scale, keeps every house inside its holding, derives actual entrance approaches and uses the granary stair-foot marker. Props avoid full structure bounds and route clearances. All stage/quality captures report zero roof/lane intersections, zero blocked fence routes and zero ground-contact probe errors. Browser checks raycast representative actual landscape contact probes and each present prop kind against the displayed rolling terrain with 0.002 game-unit tolerance. This bounded diagnostic does not claim that every point of every rigid object conforms to arbitrary terrain. C's raised granary remains open beneath, with individual support extensions.

## Performance evidence

The table below is generated from [measurements.json](measurements.json). Desktop viewport 1400 × 1100, DPR 1, near overview. These counts include C buildings, B vegetation, original instanced props, semantic ground and review foundations. They exclude gameplay overlays and other application passes. New prop bounds, triangles, material counts, zero texture bytes, source hashes and original B/C output hashes are included in the JSON. The procedural ground adds 2,924,544 decoded bytes at normal and 731,136 at low; remaining texture memory belongs to reused building context. No new texture is downloaded.

| Homes | Quality | Draw calls | Visible triangles | Texture bytes |
| ---: | --- | ---: | ---: | ---: |
| 4 | normal | 62 | 65,497 | 8,691,712 |
| 4 | low | 60 | 34,570 | 6,498,304 |
| 12 | normal | 97 | 149,197 | 8,691,712 |
| 12 | low | 93 | 82,336 | 6,498,304 |
| 30 | normal | 95 | 224,226 | 8,691,712 |
| 30 | low | 82 | 147,927 | 6,498,304 |

The 30-home normal view and all far views use C's supplied low roots. The 30-home low view also omits additive detail/optional nodes, tiny bed/field plants and some fence panels. All structural roofs, doors, stairs, routes, beds, fruit-tree positions and primary woodland records remain. Twelve homes at normal near retain C's detailed normal roots. The review does not promote C's catalog for wholesale gameplay adoption.

The C2 refresh initially raised 30-home low to 151,649 triangles at this desktop viewport. A narrower mobile viewport had culled enough detail to hide this excess. The focused browser gate now exercises the desktop viewport. Reducing broad terrain tessellation from 62 × 56 to 40 × 36 cells removes 4,064 triangles from every mode while preserving one exact terrain/contact sampler in both qualities. No simulation or tree identity changes were used to obtain the reduction.

Cloud Chromium uses software rendering. Submission timings in the JSON are observations of this host, not physical-phone FPS. There is no claim of device thermal performance. F must measure the complete adopted town and verify physical devices. The original 30/100-home B benchmark evidence remains in the parent directory and its focused browser budget checks still run.

## Local verification

- `node --test tests/wv006-landscape*.test.mjs`: ten pass, including explicit B glTF validation, frozen/serialized plan and catalog checks, stable growth, complete measured envelopes, semantic queries, shared resources and idempotent disposal.
- `npm test` after incorporating C2: 191 pass, one skipped, no failures (192 total).
- `npm run build:assets`, `npm run build:icons`, `npm run build:offline`: pass after incorporating C2; no unrelated regenerated tracked artifacts. Existing cold-offline output builds; this review's new dependency closure is not admitted into the game's offline cache.
- `PLAYWRIGHT_BROWSERS_PATH=/workspace/pw-browsers npx playwright test wv006-landscape --reporter=line`: nine focused checks, including original collection/30/100 fixtures and the new growth, LOD, contact, immutable storage, lifecycle and failed-load checks.
- `WV_PREVIEW_ORIGIN=http://127.0.0.1:4174 PLAYWRIGHT_BROWSERS_PATH=/workspace/pw-browsers node scripts/measure-wv006-landscape.mjs --hamlet`: six near stage/quality captures, two far captures, three close views, two mobile views, semantic plan and hash-pinned measurements. Captures run without an overlapping browser suite.
- Full local `npm run test:e2e -- --timeout=60000`: 124 pass and one failure in the existing A `WV006 idle and hidden lifecycle normal` five-second loading expectation. Isolated rerun of that exact unchanged check passes in 9.7 seconds. No A/shared test or configuration was edited. The final focused B run follows the terrain budget correction; CI runs the unmodified full commands on the PR head.
- `WV_RENDERER=three npx playwright test camera-gestures organic-zoning road-3d-drag-fix save-slots organic-lanes --output=test-results-three-parity --timeout=60000`: all 16 pass.

Camera/focus changes cause no plan rebuild; idle and hidden views stop drawing. Repeated 30/12 view changes return to the warmed geometry count. Browser storage is compared against an unchanged three-slot sentinel. Asset loading uses committed manifest hashes in GLB request URLs; a failed architecture load remains explicit and does not leave the gallery pretending to be complete.

## Integration and remaining limits

See [INHABITED-HAMLET.md](../../../handoffs/wv006-b/INHABITED-HAMLET.md) for exact APIs, resource ownership, dependency closure and F's responsibilities. The authored reference is a visual target for a future authorized growth-system change. Rendered gardens yield no food, orchard props create no planted-tree saves, and visual people create no households. The detached analytic terrain does not replace displayed saved terrain. No authoritative tree is removed, and no mask grants land rights or clears Nature Preserve land. The source recipes require no private archive, new dependencies or remote runtime art.

Head/merge SHAs, required CI URLs, Pages result and live-source verification are recorded in the PR execution record after deployment; deployment is verified separately from merge success.
