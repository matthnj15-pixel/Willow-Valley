# A3 sunlit meadow study and valley fixture repair

The user's Foundation references supersede A2's photographic surface direction. The requested qualities are brighter, richer greens; distinguishable grass blades and varied patches; warm, narrow paths; and fine detail at close range. Those screenshots are visual references only. No proprietary image, mesh, texture, interface or source was copied or committed. A1 is again the valley page's default. A2 remains explicitly selectable for comparison; it is not the recommended adoption direction.

This is a small material/surface-detail study, **gallery-review, runtimeReady:false**, not F's shared renderer or combined final composition. Review `/ui-kit/wv006-environment.html?count=study&look=meadow&revision=a3`. The four-home visual context is the existing B hamlet library loading unchanged C building and B landscape GLBs. Its homes, trees, fences, props, ground triangles, local use masks, paths and thresholds are unchanged. A adds a green colour field and original instanced swept grass ribbons. The **Muted context / Sunlit meadow** switch uses identical geometry, camera, seed, viewport and quality; it changes ground and added-grass materials. The separate grass checkbox removes only A's additional layer. Muted context plus that layer is not labelled historical A1. The separate valley page retains the actual A1/A2/shared comparisons and both original generated world seeds.

## Why the old path fixture failed

The review had used a default main-road graph beside metre-scale cottages on a cliff-heavy generated map. The shared graph's 34-game-unit shoulder is about 12.1 visual metres; its pavement is 24 units (~8.6m). Checking only a centre and endpoints allowed the corridor through steep terrain. This produced the broad brown shapes in the user's screenshot. No simulation road or path graph bug is claimed fixed by this review change.

`review-fixture.mjs` now selects a dry context patch on both exact displayed terrain resolutions. It checks height spread and grade throughout that patch. The normal valley views use the existing five-game-unit local-lane rendering (~1.79m). Every segment is checked at <=3-unit stations across its full width against both meshes, rejecting wet contact or grade >.28. The broad road graph exists only in an explicit junction stress view, with its actual shoulder polygon edges checked. Leaving that view restores narrow local lanes. The shared road modules, world generator, wet masks, geometry builders, state and suitability rules are untouched.

## Exact API and ownership

Existing A1/A2 material/atmosphere lifecycle documentation remains in `integration.md` and `detail-v2.md`. Those factories are unchanged here. For an exact A1 reference, import `{createEnvironmentMaterials}` from `environment-next/previous-materials.mjs` and use the same `setWorld`, `material`, `attachAtmosphere`, `pause`, `advance`, `status`, `dispose` lifecycle; that remains a review reference rather than approval to install it. Do not adopt A2 as the selected art direction merely because its filename is `materials.mjs`. The new study is deliberately a separate optional layer:

```js
import { loadHamletLibrary } from './assets/wv/landscape-next/hamlet-scene.mjs';
import { attachMeadowLayer } from './environment-next/meadow-layer.mjs';
const library = await loadHamletLibrary();
const component = library.build({stage: 4, quality: 'normal', distance: 'near'});
scene.add(component.group);
const layer = attachMeadowLayer(component, {seed: 'WILLOW-1048', low: false});
layer.setLook('meadow'); // 'context' restores the borrowed ground material
layer.setGrass(true);
layer.pause(); layer.advance(0); // static: neither creates a timer nor rebuilds a field
console.log(layer.status());
// On detach, in this order:
layer.dispose(); component.dispose(); library.dispose();
```

Inputs are B's read-only visual `component`: `group`, `groundMesh`, `plan` with transformed footprint envelopes, lanes/entrance paths and use regions, and `nature` canopy records. Coordinates in that plan are visual metres, Y up; instance transforms use 2.8 game units/metre. The example does not create functional homes or save data. It is not a drop-in world-generator adapter. `mountMeadowStudy(canvas,{low,seed,look,grass,signal})` is the standalone controller wrapper, with original orthographic controller/gesture maths, saved views, `measure`, inspection, status and idempotent `dispose`. An abort during pending model loads prevents a late mount and disposes the eventually loaded library. Missing model resources show an explicit unavailable state. Model-loader partial failures use B's existing settled-resource cleanup.

The layer owns its colour DataTexture, two ground/grass materials, instanced buffers and original ribbon geometry. It borrows the original ground material without disposing it, restores it on detach, and never disposes the source ground mesh or other B/C resources. Its one shared field is reused by the ground material; there are no per-instance images. No scene lights, fog, renderer, shadows or camera are silently replaced by `attachMeadowLayer`. The wrapper explicitly owns scene atmosphere. B-D's normalized comparison light is unchanged A1: sun `#fff4e5`, intensity 2.1, position (-40,86,25), hemisphere sky `#eaf0f3`, ground `#76745f`, intensity 1.8; no shadows or post-processing. Use that preset without editing delivered geometry. Grass supports fog explicitly in both vertex and fragment shaders. No new global tint is applied to architecture, plaster, timber, tile, stone, cloth or water.

## Detail, cost and determinism

The original ribbon recipe has nineteen curved blades / 95 triangles per normal tuft and five / 15 triangles per low tuft. It is generated from fixed keyed inputs, not a remote asset. Per-instance position, yaw, height, brightness and patch gaps derive from the seed and visual plan. Normal caps at 1,900 tufts; low is a stable subset capped at 850 with genuinely simpler geometry. Blades are .28-.48m before instance scale (.45-1.15). Roof/envelope and path-width clearance includes the conservative whole-tuft radius, preserving entrances. Roots tilt to the exact unchanged displayed triangle surface; a focused test checks all normal grass roots against it, with <.02 game-unit error (~7mm). No height, displacement, collision, wet polygon or navigation writes occur.

The generated colour field is 896x816 RGBA (2,924,544 bytes) normal or 448x408 (731,136) low, linear-filtered, sRGB, **no mipmaps**. The comparison retains B's original same-size field for toggling. These are CPU-generated textures, zero image transfer bytes; GLB embedded source textures remain unchanged. Patches use existing land-use strength and actual transformed envelopes, varied meadow colour/grain and restrained tree-contact shade. No control or density rebuild occurs during camera movement, mode switches, hiding or idle time. The study resizes the drawing buffer only when the viewport or DPR changes, not every camera frame; `viewportResizes` is diagnostic. There is no water/cloud/wind animation in this small land study; A1's separate full-world water/sky implementation is unchanged. Low is static too. No render targets or shadow passes are added.

All source modules, borrowed GLBs/manifests, existing image derivatives and licenses have exact byte counts/SHA256 in `assets/wv/environment-next/dependencies.json`. The dependency builder now rebases literal module-relative URLs before bundling, preserving B/C paths under root and `/dev/`. The B assets are original project artwork per their manifest; C's scoped licenses remain under `buildings-next`. There are **no new glTF/image outputs**, private archive prerequisites, runtime external requests, paid APIs or npm dependencies. Existing A2 images remain committed for its opt-in comparison.

## Proposed F patch locations and limits

F may evaluate the palette/ribbon recipe against the real settlement read view, then provide an explicit adapter for actual transformed envelopes, lane corridors, seeded woodland and displayed terrain contact. The shared renderer still calls canvas size setters during camera frames; F should evaluate conditional resizing independently (the study records a measured before/after). Proposed future integration locations are `world-renderer-three.mjs` material/scene lifecycle and its visual read-view inputs, with dependency closure in `scripts/build-asset-cache.mjs`, `asset-cache.js` and shared offline manifests. None is edited here. Do not install the study hamlet, synthetic camera read-view, comparison UI or fixed display layout as gameplay world generation. Forest, cliff, shore, water and large-town integration still use A1/A2's existing full-world candidate and require F's combined review with B-D. This small study does not establish 30/100-home performance of the combined B-D geometry.

There are still gaps from the references: this is not a finished dense meadow/woodland composition; the B/C source silhouettes and path-mask resolution remain visible at extreme zoom, and soft lighting without measured shadows lacks their contact depth. No physical-phone FPS claim or cold-offline readiness is made. The new page is intentionally outside the installed game's offline dependency closure. Original game/saves remain untouched. Measured results and exact changed-file list are in `docs/testing/wv006-a/meadow-study/acceptance.md`.
