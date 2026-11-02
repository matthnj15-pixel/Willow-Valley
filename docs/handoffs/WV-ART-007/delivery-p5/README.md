# P5 playable integration

Base develop: `feb8781ba9fdc347c74b7109fdc70ce078ea72e9`. Branch: `feat/wv007-p5-playable`. See [independent P2–P4 audit](AUDIT_P2_P4.md) for the prerequisite verdict and actual API adaptations. No P1–P4 asset generator or accepted study was rebuilt.

## Playable result and rollout

The existing development Three opt-in mounts C4 buildings, A3 meadow/grass, A1 world treatment and B parcel/field/nature dressing together on the actual generated world. Native WebGL remains the default; main is not promoted or merged. Use `https://matthnj15-pixel.github.io/Willow-Valley/dev/?renderer=three` after publication. The development menu links the isolated integrated diagnostics page at `ui-kit/wv007-integrated.html`.

Old sites remain legal. P1 rejects an unsafe full/compact fixed-scale placement without changing the saved site, identity or economy; the existing legacy model/procedural presentation remains. The 30-home reference initially admits 21 of 37 structures, including all seven facility roles; 16 homes retain deterministic legacy presentation (missing parcel, unsupported original variant, unsafe grade or access). Detailed per-site reasons are exported. C4 stays at 2.8 game units/metre. Original normal thatch courses, chimney joins, nested kit transforms and the granary's 1.35-metre open undercroft are retained. Workplaces and civic roles use their current mappings; there is no new persistent visual picker, warehouse construction, inventory, trade or upgrade system.

## Ownership, revision and APIs

- `render-adoption/integration/read-view.mjs` clones application state, retains the original identity hash inputs and saved positions, and constructs a frozen schema-v1 view. It uses drawn graph curves and actual 34-unit road shoulders, 5-unit local lanes and 4-unit visible desire paths. It does not initialize live simulation authority. The final field-use mask queries the complete committed paint/erase history on detached state. Its conservative 2/4-metre cells are shared by P2 and P3; field yield logic is untouched.
- `presentation.mjs` coordinates P1 placement → complete placement/access bridge → P2 coverage classification → P3 plot-aware plan → final P2 ground/grass update. It includes actual legacy envelopes and source C4 roof/yard blockers, converts units once, and unions duplicate normal/low representations of the same fixed fence. There is one owner of continuous grass and one boundary registry. No invented access, sample people, authoring stock figures or authored hamlet terrain enters play.
- D barrel/lumber decoration is available only for P3's explicit generic-prop requests, with fixed scale, full measured reserved-footprint fit and independent terrain contacts. The existing preview library is borrowed; warehouses remain preview-only. The committed 30-home fixture requests no such generic props; zero is reported rather than inventing cargo.
- `renderer.mjs` supplies the unchanged camera/controller/picking flow with one Three scene, one displayed terrain adapter and one whole-host render call. It binds P2 materials to actual existing terrain/water/road buffers, parks the previous environment ownership by mounting a separate backend, and retains editor/selection overlays and fallbacks. `mountWorld3D(...,{adoption:true})` enables this backend; the old default API remains unchanged. World/quality/save-slot changes remount through the existing application path.
- Returned viewer extensions are `whenReady()` and `getAdoptionRuntime()`. The runtime borrows the renderer/scene/camera, exposes frozen read views, placement/landscape observations and P4-normalized layer status. The development application exposes the same observation as `window.wv007Runtime`. No save API is added.
- Updates depend on geometry/paint/access/terrain revisions. Camera movement does not rebuild field masks/atlases or mutate storage. Live distance policy uses ground focus distance because the orthographic camera itself stays 2700 units away. The diagnostics reference profile explicitly retains the requested building detail; its actual LOD distribution is recorded. B far detail remains explicit at far zoom.
- Surface memoization is bounded and uses exact coordinates, without terrain quantization. The adopted material does not consume the old road-shading offset attribute: disabling its expensive O(vertices × road-segments) calculation preserves every geometry/editor buffer. A CPU profile found about 35.5 seconds in that legacy calculation on the 30-home fixture. The original path/default stays unchanged.

The host owns fallback/generic instance buffers, renderer buffers/materials, controller listeners and the bounded visible normal-water timer. P1 owns source pools/building batches/seated geometry; P2 owns atlas/grass/material/atmosphere resources; P3 owns its source library and procedural plot buffers. Batches are removed before borrowed source pools are disposed. Superseded loads are generation-guarded; disposal is idempotent. Hidden/offscreen/low water stops its cadence. No renderer-owned economic ticks, telemetry or remote runtime assets are introduced.

## Diagnostics and evidence interpretation

The integrated page runs P4 fixtures in its own route/context, never alongside a live player simulation or in a player slot. It drives real camera paths and the checked real month operation. One host RAF feeds P4 using the actual callback delivery time; there is no second diagnostics sampler and no fabricated timing. Default windows remain 45 seconds warmup plus 60 seconds measurement. Local exports use the original privacy allowlist.

Status adapters report actual source/output pins, per-home/effective/visible LODs, unique scene materials, loaded quality images, retained parsed geometry, owned instance/procedural buffers, legacy resources, atlas bytes and whole-scene renderer.info. Visible homes use the exact transformed batch geometry bounds, including nested transforms. These are estimates of explicitly supplied resources, excluding driver copies and general JS heap. Cached GLB bytes are distinct from active decoded images.

Raw near/town/far records, 30/100 normal/low admissions, close art captures and full-duration records are under `docs/testing/wv007-p5/`. `reference-measured-admission.json` identifies the full-detail reference code/profile hashes; `live-measured-admission.json` identifies final live-policy measurements. Short zoom records are deliberately duration-invalid. A month can publish a new read-view revision while asynchronous layer rebuilding finishes; P4 records this stale-layer interval and invalidates that run even if everything recovers. The checked month outcome and raw record remain available. This evidence is not suppressed or presented as a passing uninterrupted performance window.

The full-detail reference run predates the final live-camera fallback/queued-frame readiness corrections. Those corrections rebuild actual legacy batches after a failed distance load, retain latest landscape observations, ignore superseded revision completions, and make the explicit readiness probe await queued controller frames. Reference far-zoom short records retain their original pending-landscape flags. The final live measurements use the corrected readiness and actual gameplay distance/culling policy. No derivative artwork changed between these measured code closures; the earlier timings are not asserted to be a final-code performance baseline.

Combined scenes can exceed P4's provisional triangle/draw warnings. No numeric guards were relaxed and normal source detail was not removed. The existing legacy regression benchmarks remain unchanged; adopted Three remains explicit opt-in. Software/cloud callback pacing is not phone render FPS, input latency, thermal or battery acceptance. Large fixture atlas/read-view construction still has noticeable CPU cost. Physical-device performance and user art approval remain pending.

## Installed and published closure

`build-wv007-integration.mjs` deterministically records the selected families, exact code input hashes, parent pins and eight runtime profiles in `render-adoption/integration/admission.json`. `validate-wv007-runtime.mjs` checks the composed hash closure and independently validates every runtime GLB. The cache builder follows local module imports, includes adopted manifests/GLBs/licenses and both diagnostics pages/fixtures, and excludes authoring kits/checkpoints, photographic environment treatment, comparison GLBs and demo scripts from initial installation.

Both normal and low/distance/far files are stored in the integrity-checked disk cache for offline quality switching. **This is not a low-only transfer claim.** Selective loaders parse only requested active profiles; cold low tests reject normal-quality decoded images. The existing service worker continues atomic installation, integrity rejection and previous-complete-version rollback. Root and `/dev/` fresh installs, cold network-disabled resume and all three slots are exercised. Existing save import/export/corruption/rollback tests remain in the full suite. Boot still updates the existing save timestamp; render/camera/resize leave slot bytes unchanged.

The Pages workflow executed from main already invokes the preview branch's offline packaging tool. That tool now copies only admitted `render-adoption/**` paths into the branch output, so the executable closure publishes without changing main or relying on workflow metadata as proof. Stable is assembled from its own branch/cache. The single-file download retains its existing native renderer; the installed PWA is the adopted Three offline target.

Historical comparison pages remain served, with their accepted sources and pins intact. They warm their dynamic assets after an explicit online visit before offline reuse; they are no longer mandatory game-install dependencies. Three exact shared pre-integration inputs pinned by the old A3 study live in `frozen-inputs/`; historical tests still enforce the original byte lengths and SHA-256 values. All other historical pins are checked at their original paths. This preserves the study instead of repointing its accepted pins to changed runtime code.

## Reproduction and remaining acceptance

```sh
npm ci
node scripts/validate-wv007-adoption.mjs
npm run build:assets
npm test
npm run build:icons
CHECK_BUILT_ICONS=1 node --test tests/icon-artifacts.test.mjs
npm run build:offline
npm run test:e2e
WV_RENDERER=three npx playwright test camera-gestures organic-zoning road-3d-drag-fix save-slots organic-lanes --output=test-results-three-parity
python3 scripts/serve-preview.py
# In another terminal; records remain local:
WV007_FULL_MEASURE=1 node scripts/measure-wv007-integration.mjs
WV007_FULL_LIVE=1 node scripts/measure-wv007-live.mjs
```

Complete the [installed-device checklist](../../../testing/wv007-p4/DEVICE_CHECKLIST.md) using the integrated page and actual served commit. Include fresh airplane-mode cold launch, all slots/import/export, pan/orbit/pinch/road/zoning/erase, background/lock/context restoration, close roofs/chimneys/granary/workplaces/fields/shared gates, matching-quality 60-second scenarios, and 15–20 minutes of sustained play. Preserve interrupted/stale/failed records and rerun a fresh uninterrupted window. Do not infer >=30 FPS or approved art from these automated checks.

See `VALIDATION.md`, `CHANGED_FILES.txt`, the committed admission manifest and the PR/CI/deployment links for final exact delivery evidence.
