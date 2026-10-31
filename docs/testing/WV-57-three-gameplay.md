# Issue 57 — B3 playable Three.js adapter

Start from develop `2513a4e`. Opt in at
https://matthnj15-pixel.github.io/Willow-Valley/dev/?renderer=three
(the ordinary Development URL remains native WebGL until UAT).

`world-renderer-three.mjs` uses the existing `mountWorld3D` controller with an
injected presentation backend. Camera, gestures, editor glyphs, and all terrain,
road and foundation triangulation are shared. Three.js uses an orthographic
camera and raycasts the actual displayed terrain. The application still owns
simulation state, saves and input. Presentation receives a disposable state
snapshot; no renderer selection is saved.

The two local GLTFLoader cottages use uniform fitting inside blueprint envelopes
and, when supplied, actual parcel polygons. Stable seeded identities choose the
B3 two-model subset. Models seat on level footprint-sized plinths, with the
canonical doorway rotated toward the saved entrance. Loading, missing, wet or
undersized sites keep their legacy shell. Facilities remain legacy geometry in
this slice. The complete six-ID mapping is reserved for C1; this experimental
subset is not a promised permanent identity mapping.

A new canvas is used on backend changes. WebGL2/import/initialization failure or
context loss falls back to native lightweight WebGL; context loss retains the
camera. Slot/world generation guards prevent stale mounts, and disposed model
loads cannot attach. Shared glTF resources have registry lifetime. World updates
dispose old surface buffers; camera motion only updates projection/draw. Hidden
tabs stop scheduling frames. Local manifest/engine/model dependencies are
included in the integrity-checked PWA cache. Standalone file HTML remains legacy.

## Verification

Required checks: `npm test`, `npm run build:assets` (including Khronos validation),
`npm run build:icons`, `npm run build:offline`, `npm run test:e2e`.
Repeat existing touch/zoning/road/save/lane suites with
`WV_RENDERER=three npx playwright test camera-gestures organic-zoning road-3d-drag-fix save-slots organic-lanes`.
CI runs both backend paths and retains Three.js screenshots with terrain scenes.

New tests cover cardinal doors, deterministic fitting, undersized/wet fallback,
root/dev cold offline game relaunch without gallery visits, month advancement,
missing GLBs, unavailable WebGL2, context loss, frozen state, camera/picking parity
on asymmetric terrain, and geometry/texture counts over 20 world rebuilds.
Screenshots include the playable Development fixture and a hill seat.

## Limitations and subsequent gates

This is opt-in B3, not default-rollout approval. Physical phone UAT, sustained FPS,
30/100-home visual acceptance, all-six silhouettes, all-seven facility models,
full entrance connector/clearance review and environment coherence remain open.
Native fallback retains its pre-existing optional external nature path; the
Three.js path makes no external requests. Three.js uses the existing generated
terrain/nature geometry for now. No claims of phone performance or standalone
model support are made. The source assemblies remain marked gallery-review;
shipping-ready promotion requires human silhouette/entrance review. C1 must also
inspect roof closure at close zoom before promoting these initial assemblies.
