# WV006 A: environment candidate integration contract

Gallery-review, `runtimeReady:false`. A owns this candidate only; F owns shared adoption. No shared renderer, save, simulation, road, zoning, registry, cache manifest, package or workflow edits are included. Baseline: develop `5e39c72ff5e205dea166fa18febdfa89aaa5aec8` (PR 81). No applicable AGENTS.md was present in the checkout or ancestor workspace.

## Exact factory use

```js
import {createEnvironmentMaterials} from './environment-next/materials.mjs';
import {ENVIRONMENT_PRESET} from './environment-next/preset.mjs';
const environment = createEnvironmentMaterials({
  low: quality === 'lite',
  onReady: () => { if (!disposed) controller.render(); }
});
// Remove/park the renderer's old sun/fill BEFORE attaching. Do not stack lights.
const detachAtmosphere = environment.attachAtmosphere(scene);
environment.setWorld(contactWorld); // read-only surface from createTerrainSurface
const groundMaterial = environment.material(0);
const waterMaterial = environment.material(1);
const roadMaterial = environment.material(5);
// F supplies measured/transformed entrance and work-yard envelopes when ready:
environment.setVisualInputs([{
  envelope: transformedPermittedEnvelope.map(([x,z]) => ({x,z})),
  path: [actualEntrance, existingWorkPathEnd], // {x,z}, uncentered game coordinates
  radius: 3, strength: .65
}]);
// Use the existing on-demand drawing/visibility scheduling; no factory timers.
if (!document.hidden && visible && !low) environment.advance(performance.now());
// Call on hidden/offscreen and before changing scenes to avoid time jumps.
environment.pause();
const sampleForB = environment.sample(worldX, worldZ);
const metrics = environment.status();
// Either release atmosphere before replacing it, or let dispose release it.
detachAtmosphere();
environment.dispose();
```

`material()` returns null for all other surface indices and after disposal. Materials share a single registry of uniforms and textures. The factory owns and releases its created materials, texture registry and attached atmosphere; mesh geometry remains caller-owned. Caller disposal of a material is safe, but there is no requirement to duplicate it. Dispose a factory before dropping its meshes. Materials are intended for the existing identity-transformed, centered world-space ground/road/water buffers, with position/color/normal; roads additionally require `surfaceKind` and `surfaceOffset`. They are not general-purpose glTF shaders. Imported architecture keeps its committed Standard materials and receives the candidate sun/fill plus ordinary Three.js fog.

`attachAtmosphere` adds one sun, one hemispheric fill and one screen-filling sky quad. It saves/restores the previous fog if it still owns that setting; it never removes foreign lights or changes camera/controls/background. Only one attachment per factory is active. The returned detach function is idempotent. Host must detach before another atmosphere takes over. Fog is **explicit** in the custom terrain, road and water fragment shaders using view-space distance; their light vector comes from the same preset direction. A rendered pixel test verifies light and fog response. Standard architecture uses the scene Fog, with near/far 3300/4900 camera-space units, beyond close buildings at the established 2700-unit camera distance. Surface haze has a restrained .62 maximum. No shadows or extra shadow passes.

## Read-view and sampling for B

World inputs: `width`, `depth`, `options.seed`, read-only `sample(x,z)` returning `height`, `water` (null for dry), `kind`, optional seeded `trees[{x,z}]`, and `rivers[{points:[{x,z}]}]`. Supply the renderer's terrain-contact read-view, not a new terrain generator. River vectors preserve the existing nearest-polyline point order; there is no claim that this is hydraulic simulation or measured downstream velocity.

`sample(x,z)` returns `{wet,forest,wear,meadow,shoreDistance,shoreDistanceMethod,flow}` or null before world setup/after disposal. Coordinates are **uncentered game units**, Y-up rendering uses Z for plan north/south. `wet` queries authoritative `world.sample` directly; forest is continuous proximity to those seeded trees. `shoreDistance` is an unsigned chamfer estimate from the existing coarse wet mask on either side of the bank. Its method explicitly says **not bathymetry**. Use `wet` and the authoritative existing suitability rules to place reeds/rocks; do not treat distance as water depth, terrain clearance or placement permission. `flow` is a quantized nearest-river tangent, meaningful for river samples; lake zero is encoded with the existing half-byte bias. B may query once per input change, never as a separate vegetation or forest simulation.

Entrance influences require both a finite path and an actual permitted transformed polygon, radius (0,20] and optional strength [0,1]. The CPU clips influence to that polygon and dry land. There is no automatic lot rectangle, road graph access or state write. The GPU interpolates a finite-resolution mask, so edge feathering is approximate. Base shore controls stay 96×72 normal / 64×48 low; visual controls are the same size without entrances, and 384×288 / 192×144 when admitted influences exist. At small-world spacing that is about 4.2 / 8.4 units per visual texel; very narrow door wear needs close review, especially on larger worlds. F may supply wider legitimate working paths or choose an explicitly budgeted finer mask, never invent a yard. Calling setWorld/setVisualInputs rebuilds controls; camera/time updates never do. Call only when world or visual inputs change.

## Quality, resources and reproducibility

Normal ground uses three albedo samples (two scales/orientations of grass, one soil) and two shared control lookups. Low uses one grass sample plus the two controls, deriving earth tint from that sample. Normal roads use soil, grass and visual control; low uses one soil lookup. Water uses one shore/flow lookup; normal adds bounded analytic ripples, low omits them. Normal sky adds quiet analytic cloud bands; low omits cloud shading. No reflection/refraction targets, normal maps, postprocessing, textures per material, external runtime URLs, background ticks or idle requirement in low. The host reuses the existing visibility-aware ~10Hz scheduling for normal; low has none. The gallery's benchmark explicitly drives camera frames for measurement.

Both albedos are the **unchanged** committed 512px Poly Haven CC0 derivatives: `assets/wv/environment-v1/{grass,soil}.jpg`. Their source provenance/license remains in `environment-asset-manifest.json` and the committed environment-v1 LICENSE. Transfer: 144,900 bytes total; decoded RGBA with complete mips: ceil(2×512×512×4×4/3) = 2,796,203 bytes. Base+visual controls without influences add 55,296 normal / 24,576 low bytes; with influences add 470,016 / 122,880 bytes. Controls have no mips. No new rock albedo, mesh asset or private archive is required.

`assets/wv/environment-next/dependencies.json` records exact dependency paths, bytes and SHA256s, including bundled source inputs, shared vendor, all current architecture-v1 model files and unchanged catalog GLB/manifest. Existing catalog geometry/entrance/seat measurements, licenses, source prerequisites and hashes remain authoritative; A does not re-export/recolor/stretch them or claim their runtime approval. Context witnesses are original simple 1.75m boxes, not people/game entities. Private MegaKit source was not accessed; reproducing A needs only this checkout plus pinned npm tools.

Run `node scripts/build-wv006-environment.mjs` from the repository root. It bundles only the standalone page to `ui-kit/wv006-environment.mjs`, externalizing the already-bundled Three engine and rebasing root-relative texture/registry URLs. The current Pages workflow copies ui-kit and assets but not environment-next, so the committed review bundle works without workflow changes. It is not in the offline cache. Do not import the gallery bundle into gameplay.

## Proposed F patch locations (not applied)

- `world-renderer-three.mjs`: switch factory import; park existing lights; attach/release atmosphere; feed read-view and accepted transformed entrance/work envelopes; keep existing geometry/batching/controller; preserve visibility scheduling and material/geometry ownership.
- `building-visuals.mjs` / accepted B–D measurement adapters: supply world-coordinate permitted polygons/entrance paths. Never synthesize wear from arbitrary plot extents or enlarge plans.
- `scripts/build-asset-cache.mjs`, `asset-cache.js`, shared manifest and any Pages source publication: add the candidate module closure and existing dependencies only after F selects the integration form. F verifies root/dev cold-offline installs and combined-scene physical-device performance.
- Shared UAT: compare this preset with B–D at fixed 2.8 game units/metre, no shadows. Keep production main unchanged. Rendered rock/shore facets reflect unchanged terrain geometry; A cannot fix them by creating new cliffs or water polygons.

The gallery renderer is an isolated derivative of the baseline renderer for review, not F's integration patch. Its added catalog context uses the committed common scale and contact surface and excludes intersecting seeded tree instances only inside measured model bounds, identically before/after. The read-only classification still sees the original seeded trees. Context seating is a review aid, not accepted foundation/yard installation; F must review final architecture seating and combined composition when B–D arrive.

## Original witness geometry

The seven gallery material witnesses are identical boxes, not new architecture/props for gameplay: 3×4.9×3 game units = 1.071429×1.75×1.071429 visual metres; Y up, one material group, 12 triangles each (84 total), no UV image bytes, no seats/entrances/roof/yard metadata or gameplay capacity. Their ground contact is the local context origin minus half-height, with no geometry rescaling beyond their authored dimensions. They are original primitive geometry from `scale-context.mjs` (source hash in the dependency record), deterministic recipe `wv006-a-1`, no third-party prerequisite and no emitted GLB/source-archive output. Actual catalog models retain their measured entrance/roof/seat records unchanged.

License evidence is also hash-pinned in the dependency record: the committed catalog's `assets/wv/megakit-catalog-v1/License_Source.txt` (Quaternius scoped CC0 source statement), `assets/wv/environment-v1/LICENSE.txt` and `environment-asset-manifest.json` (Poly Haven source/derivative provenance). No archive/source license was invented or reverified from unavailable private inputs.
