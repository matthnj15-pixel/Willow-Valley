# Plot-aware landscaping — acceptance evidence

Baseline: develop `bf40203576e8f12478729d7ae7bf967db89849e5`. Scope is B's detached landscape review and pure adapter candidate. No shared renderer, input, simulation, saves, registry, cache/workflow or package file is authored here. Main is preserved. New candidates remain `gallery-review`, `runtimeReady:false`; F owns playable/offline adoption.

## What changed

The existing hamlet now uses irregular six-vertex holdings and fits backyard features to their actual available area. Buildings keep fixed 2.8 scale, measured envelopes and entrance positions. Trees use full crown clearances; constrained plots omit them instead of stretching models. Gates, roads, loading/stairs, structures, neighbors, retained-tree envelopes and other supplied exclusions are respected. The paddock remains open ground within its fence.

Select **Irregular plots & painted fields** in the review. Two neighbors share the complete earlier 21 m fence, with one physical record and both household keys in its user list. Large and small orchard plots receive different counts, with zero trees on the constrained wedge. The connected field is derived from a supplied committed brush footprint, includes an erased island, and leaves a field access gap. The original collection and 30/100-home benchmark remain selectable.

## Performance, geometry and contacts

Desktop near overview, 1400 × 1100 CSS pixels, DPR 1. Measurements include C buildings, original B vegetation, proportional props, two instanced fence draws, semantic ground and review foundations. Gameplay overlays and other application passes are excluded. Counts therefore do not approve F's complete combined scene.

| Composition | Quality | Calls | Triangles | Fence triangles |
| --- | --- | ---: | ---: | ---: |
| 4 homes | normal | 62 | 61,175 | 5,304 |
| 4 homes | low | 60 | 31,904 | 1,824 |
| 12 homes | normal | 97 | 141,861 | 11,100 |
| 12 homes | low | 93 | 76,714 | 3,780 |
| 30 homes | normal | 95 | 194,676 | 19,848 |
| 30 homes | low | 82 | 148,783 | 6,684 |
| Shared plots / painted field | normal | 45 | 59,101 | 7,368 |
| Shared plots / painted field | low | 41 | 26,565 | 2,640 |

See [measurements.json](measurements.json) for every normal/low/far case, decoded geometry/texture bytes, fence bounds, construction counts, source-file hashes and generated geometry/instance-buffer hashes. [plot-plan.json](plot-plan.json) records physical fence ownership/reuse, field holes, household prop transforms and post contact points. The geometry output hash includes sorted attribute headers/bytes and indices; the instance hash includes the actual Float32 matrices. Random Three.js object UUIDs are excluded. All new construction is original project geometry and can be reproduced from the checkout, with no archive or private input. Existing B/C GLB hashes and bytes are unchanged.

Fences use one shared box construction primitive and one matte opaque material. There are two fence draws for posts/rails irrespective of the number of fences. Normal post intervals are at most 2.4 m. Low/far retain endpoints and every second normal post, using a single rail, so their contact positions form a subset of normal positions. Whole boundaries, old-fence keys, primary fruit-tree transforms and plot geometry are unchanged across quality/detail tiers. There are no alpha cards or new textures; decoded texture changes are the existing normal/low ground image sizes. Source geometry counts, bounds, material/texture counts and recipe hashes are recorded explicitly.

All recorded contact/access diagnostics pass. Browser probes compare actual rigid-prop terrain sample points and up to 64 post feet against the displayed rolling triangle mesh at 0.002 game-unit tolerance. Unit checks verify every post's generated seat and reduced-LOD subset. Analytic full-segment corridor tests cover narrow loading stairs; actual door/road/stair envelopes and field gates have clear gaps. Quarter-metre wet/grade probes are conservative, not arbitrary terrain deformation or a replacement for exact supplied water exclusions. Existing conflicting fences are reported instead of silently removed.

Cloud Chromium/software rendering is used; submission timings are not physical-phone FPS or thermal evidence. F must verify the adopted complete scene and physical devices. Previous 30/100-home benchmark evidence remains in the parent directory, and its existing browser performance checks continue to run.

## Verification

- `node --test tests/wv006-landscape*.test.mjs`: twenty focused checks pass. They cover explicit B GLB validation, existing placement/resource behavior, frozen/serialized inputs, full measured C envelopes, partial/near shared edges, retained fence identity, crossing prevention, exact narrow-corridor clipping, concave/holed plots, proportional density, unchanged trees across quality, actual paint/erase classification, spatial-query locality and idempotent shared-resource disposal.
- `npm test`: 201 pass, one skip (202 total), no failures. The final pasture guard is also covered by the focused rerun.
- `npm run build:assets`, `npm run build:icons`, `npm run build:offline`: pass, with no unrelated regenerated tracked artifacts. New B/C GLBs are not introduced; existing B is explicitly validated and C is checked by its current tests. Existing offline output builds; new candidate offline admission remains F's work.
- `PLAYWRIGHT_BROWSERS_PATH=/workspace/pw-browsers npx playwright test wv006-landscape --reporter=line`: eleven scenarios pass. After the final pasture correction, the four hamlet/plot scenarios are rerun with `npx playwright test wv006-landscape-hamlet wv006-landscape-plots --reporter=line`. Coverage includes all earlier collection/benchmark cases and the new shared boundary, hole, quality, camera and resource behavior.
- The new field test drives the **existing application's** drag brush, Commit, Eraser and reload. Pending strokes leave the committed candidate unchanged; committed erase reduces the field cells; outlines and fences stay on authoritative farmland. Saved state is deeply frozen and compared before/after planning, and localStorage bytes remain unchanged. Three-slot behavior and input code are unmodified.
- `WV_PREVIEW_ORIGIN=http://127.0.0.1:4180 PLAYWRIGHT_BROWSERS_PATH=/workspace/pw-browsers node scripts/measure-wv006-landscape.mjs --plots`: final captures, field/plot plan, geometry outputs and source hashes, without an overlapping local browser suite. Earlier inhabited evidence is retained.
- Full local `npm run test:e2e -- --timeout=60000`, the 16-check `WV_RENDERER=three` parity command used by CI, and the exact required CI/deployment run URLs/results are recorded in the PR execution record. CI runs the unmodified full repository commands on the pushed head and again on merged develop.

Camera/focus changes redraw without reconstructing the plan. Repeated hamlet/study changes return to the warmed geometry count. Idle/hidden behavior remains covered by the existing hamlet tests; added fence views release instance buffers on scene changes, while shared geometry/materials are released only with the library.

## Integration limits

Read [PLOT-LANDSCAPE.md](../../../handoffs/wv006-b/PLOT-LANDSCAPE.md) for exact APIs, units, land-use-mask semantics, update revisions, conflict handling and ownership. Field output is a conservative outline at the recorded cell resolution. F must supply the actual committed land-use/terrain read view and use the same field plan for surfaces, crop rows and boundaries. Candidate gate gaps create no path/freight rights. Old authoritative boundaries and trees cannot be removed through a presentation decision. Productive planting, forestry, manual persistent landscaping and ownership/removal costs need their separate gameplay handoff.

Exact authored files: [PLOT-CHANGED-FILES.txt](../../../handoffs/wv006-b/PLOT-CHANGED-FILES.txt). Head/merge SHAs and independently verified live build/source hashes are reported in the PR execution record; merge success alone is not deployment evidence.
