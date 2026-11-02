# P4 implementation and P5 attachment

P4 provides a local diagnostics controller, deterministic actual-state fixtures, scripted camera/month drivers, resource estimation, an inspection page and tests. It changes no shared renderer, application, simulation, save, artwork, offline cache, workflow, package or regression limit. Base: develop `a18e85d`, selection `wv007-adoption-1`. P1/P2/P3 own buildings/world/landscape; P5 alone attaches them and this controller.

## Repeatable local commands

```sh
npm ci
node scripts/validate-wv007-adoption.mjs
node scripts/measure-wv007-runtime.mjs --output /tmp/wv007-records
node --test tests/wv007-profiling.test.mjs
npx playwright test wv007-profiling
python3 scripts/serve-preview.py
# Open http://127.0.0.1:4173/ui-kit/wv007-diagnostics.html
```

`measure-wv007-runtime` checks source hashes, output/fixture hashes, real state validity, exact cameras and month outcomes. The default command fails on manifest drift. `--write-manifest` deliberately records reviewed changes. `node render-adoption/profiling/generate-fixtures.mjs` rebuilds the two fixtures; running the measurement command afterwards checks byte-for-byte determinism. There are no new GLBs to validate.

The CLI's availability JSON and page's downloadable inspection are explicitly **invalid measurements** with missing combined layers. No cloud/phone FPS has been invented. The source/output hashes and camera keyframes live in `render-adoption/profiling/manifest.json`; the exact saved fixtures are adjacent. The source pins include C4 manifest/bundle, A3/A1 modules and B manifest/bundle. All other source pins remain enforced by the adoption validator.

## Controller API

`createDiagnosticsController({renderer,layers,getReadView,pause,resume,getCamera,rendererInfoScope}, {expectedSourcePins,manual,environment?,requestFrame?,cancelFrame?})` is exported from `render-adoption/profiling/index.mjs`. The first five host fields implement contract revision 1; camera and count scope are explicit diagnostic extensions. Supply actual Three WebGL renderer.info, not viewer budget summaries. `getCamera()` returns `{focusX,focusZ,yaw,pitch,zoom}` in the existing host camera units. `rendererInfoScope:'whole-host-frame'` confirms the host counts all adopted layers and render passes. For multiple render calls, the host must reset/aggregate renderer.info around its whole frame; the controller does not change renderer.info.autoReset. Missing confirmation invalidates combined claims.

Methods:

- `start({fixture,fixturePins,scenario,warmupMs=45000,durationMs=60000,allowRevisionChange=false})` returns a completion Promise. Fixture metadata is `{id,isolated:true,complete:true,expectedHomes:30|100}`. Fixture pins come from the manifest. Only month scenarios may opt into view-revision changes. World/quality changes still invalidate the run.
- `timing()` returns active and measurement milliseconds without copying records. `record()` returns a detached JSON-safe snapshot. `stop()` resolves an early record, with an insufficient-window issue. Repeated starts are allowed after completion, not during a run.
- `pause()/resume()` omit the cross-pause interval and cancel/restart the temporary RAF; any interruption invalidates that uninterrupted measurement. Automatic document visibility/context-loss listeners use the same behavior. Inspect the record and rerun after restoration.
- `sample(timestamp)` supports a host-owned cadence. Pass `requestFrame:()=>null` to suppress automatic sampling, then call `sample` **after** the host's full rendered frame. Never feed both cadences. Idle still needs host RAF ticks to sample browser pacing; it does not need forced rendering.
- `setMonthOutcome(outcome)` accepts only numeric allowlisted state summaries from the scenario's checked month outcome. `download()` exports JSON locally and revokes its temporary URL. `dispose()` idempotently stops sampling and removes owned listeners. It never disposes host/layer resources or starts simulation ticks.

The controller starts no RAF until `start()`. It records visible/hidden events, viewport/DPR, observable browser/OS/display mode, per-frame RAF intervals and renderer counters, actual camera poses, revisions, status changes, pins, requested quality, geometry/home/material LOD distributions, loaded image qualities, and decoded-resource estimates. Arbitrary read-view fields, entity keys, player names, logs, reports and save contents are excluded from exports. Manual fields are battery, low-power mode, heat, perceived input lag and device/browser/OS; keep them free of personal information.

## Required status adapter

P5 should adapt peer status **from actual loader/render observations**. Never fill absent data with zero, fabricate effective LODs or mark unavailable peers ready. Every layer needs:

```js
{
  contractRevision: 'wv007-1', viewRevision: view.revision,
  quality: view.quality, sourceFamily: 'C4', // C4 required for buildings
  ready: true, disposed: false, pendingLoads: 0, failedLoads: 0,
  sourcePins: [{path, sha256}], outputPins: [{path, sha256}],
  effectiveLods: {normal: normalEntityCount, low: lowEntityCount, legacy: fallbackCount},
  effectiveMaterialLods: {normal: normalMaterialCount, low: lowMaterialCount},
  // Buildings only: separately count HOMES; normal civic meshes cannot hide all-low homes.
  renderedHomes: fixture.expectedHomes,
  effectiveHomeLods: {normal: normalHomes, low: lowHomes, legacy: fallbackHomes},
  visibleHomeLods: {normal: visibleNormalHomes, low: visibleLowHomes, legacy: visibleFallbackHomes},
  resources: {
    bufferBytesEstimate, textureBytesEstimate,
    loadedQualityImages: [{quality:'normal', loaded, expected, decodedBytesEstimate}]
  }
}
```

The example is a schema, not measured values. `renderedHomes` and `effectiveHomeLods` count actually instantiated admitted/fallback homes, including culled instances. `visibleHomeLods` separately counts actual visible/drawn homes by LOD, with explicit zeros when none are visible. At least one visible normal home must occur during the measured part of a normal run. A historical B thirty-home all-low arrangement cannot pass by calling its requested quality normal, by counting normal civic meshes, or by briefly using normal homes only during warmup. Distance LOD changes are recorded, not treated as quality changes. All seven facility types must exist in the read view. Missing/stale layers, wrong quality/source hashes, failed/pending loads, incomplete images or populations invalidate the entire run, including if they recover later.

`estimateResources({roots,loadedTextures,retainedBuffers})` in `resources.mjs` deduplicates backing buffers and referenced textures, includes explicitly supplied loader-retained allocations and estimates full mip chains. Supply **all parsed textures**, including unused roots, to avoid asserting that low quality avoided normal image allocation. A scene-only estimate cannot establish that. Unknown image sizes return unknown texture bytes. RGBA8/mipmap estimates exclude driver copies, render targets and unprovided/JS allocations; renderer.info supplies counts, not exact memory.

## Actual-state scenarios

Use a dedicated isolated fixture game/context; do not swap fixtures into any of the three player slots. `createFixtureSession(fixture,{quality})` clones committed application state and returns `{world,cameraPlan,getReadView,snapshot,metadata,advanceMonth}`. Creation and explicit month advancement configure the existing simulation's module-level world bounds. **Do not run a fixture session alongside an active live simulation**: P5 must isolate the diagnostics route/context or serialize application ownership. Merely calling the controller or camera does not configure world bounds or mutate state.

Fixtures start with `startWorldGame`, use terrain-validated `addRoad`/`placeBuilding`, connected collector extensions, `paintZones` and `findCottageSite`. Four original legacy homes retain null parcels; 26/96 generated homes retain actual irregular parcels/entrances/lanes. All seven facilities exist. Farmland is committed and includes an erased hole; the detached read view classifies that final land use rather than exporting paint previews. Retained trees use the current nature placement exclusion rules; unavailable protection/retained-boundary authority stays null/empty. Treasury, people and supplies are explicitly provisioned test data, not proof of economic sustainability or a transformation of a player's save.

The fixed seed/settings, admitted saved positions, rejected-site counts, complete saved states, access counts, world signatures, shoreline and slope landmarks, and exact 0/15/30/45/60-second camera keyframes are hashed in the manifest. Coordinates bridge saved XY to centered game XZ once; new asset scale remains 2.8 and is not applied by this controller. The zoom path visits a real parcel, painted field, generated slope and shoreline. Idle has one camera placement; orbit completes one yaw cycle/minute; zoom repeats a cosine 180–900 zoom/minute while smoothly visiting four terrain landmarks. No road width or saved parcel is changed for the benchmark.

`createScenarioDriver(session,scenario,{setCamera,updateView})` returns `step(measurementElapsedMs)` and `outcome()`. Call from the application owner before rendering, using `controller.timing().measurementMs`; apply the initial pose once, warm up, then run the measurement. Month advances exactly once at measurement +30 seconds using the real `advance({events:false})`, checks valid save, turn, resource/balance outcomes outside rendering, and publishes a new immutable view. Forward `driver.outcome()` through `setMonthOutcome`. Await/coalesce peer updates through the normal P5 bridge; don't suppress incomplete-load evidence. P5 must attach the actual renderer and verify requested/effective quality before collecting records.

## Integration/deployment limitations

The page is an inspection tool, not playable combined UAT or an installed-offline page. Current Pages copies ui-kit but does not copy `render-adoption/**`; **P5 must add the publication closure and diagnostic offline closure**. Until then the public diagnostic URL is not functional. P4 makes no shared workflow/cache edits. Main gameplay remains unchanged; dev gameplay URL: https://matthnj15-pixel.github.io/Willow-Valley/dev/ . Local diagnostic URL is above. The device checklist and evidence are under `docs/testing/wv007-p4/`.

No numeric limits were relaxed and no art was removed. Triangle/draw warnings do not decide record validity or device acceptance. A structurally valid record still needs actual installed Safari/PWA measurements and sustained-play evidence to support >=30 FPS; RAF callback pacing alone cannot certify rendering or input lag.
