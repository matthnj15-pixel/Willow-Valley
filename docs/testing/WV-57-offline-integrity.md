# Required asset integrity and model lifetime

Follow-up to merged #64, based on `develop` commit `22bf6e4f969702ba4c15aef0c96a132d1e8afe63`, under #57/#53. Reuses its Three.js 0.187.0 bundle, source assets, three compiled models, gallery, identity mapping, and build recipe. No second engine, registry, or gallery is introduced. The subsequent scope is an offline/lifetime hardening slice, not a gameplay renderer rollout.

## Behavior

The required-install generator now traverses the app and World Builder/gallery module graphs, records branch-relative URLs, byte lengths and SHA-256 hashes, and derives a content version. A service worker verifies every required response before activation. A same-length corrupt GLB served with HTTP 200 fails installation just as a missing model would. It waits for all writes before deleting an incomplete candidate cache, preserves a previously complete same-version cache on retry, and leaves the previous active worker available when a new version fails. Optional requests cannot overwrite already verified entries.

Verified modules, manifest and models are served together from their installed version. Navigating to the branch root uses the corresponding installed index. Cache names contain scope, deployment commit, and the generated content version. Stable and Development remain isolated. Normal game registration uses `updateViaCache:'none'` so imported asset-cache metadata is rechecked rather than inherited from the browser HTTP cache. Installation only activates after the complete verified graph is present; it does not touch settlement storage.

`createModelRegistry` retains the existing `load`/`dispose` API. Concurrent callers share a load promise. After disposal, pending callers reject instead of receiving a model that could attach to a destroyed world. Separate raw source promises ensure a model finishing late still releases resources. Shared geometry, materials, textures, and image bitmaps release once across models. Failed loads remain retryable; invalid path-like IDs are rejected.

## Validation

- Unit tests check committed install hashes/lengths and graph coverage, shared loading, failed-load retry, pending-load disposal, repeated disposal, and shared image/GPU resource cleanup.
- Browser tests install after displaying just one home, disconnect and cold reload, then load all three models under both `/` and `/dev/`. GLTFLoader bounds match the existing manifest; saved browser bytes remain intact; the gallery makes no external HTTP requests.
- An independent upgrade fixture serves a corrupt same-length tree with HTTP 200. The replacement worker becomes redundant, its incomplete cache disappears, the previous installation cold-relaunches offline and opens the tree, and a corrected update activates successfully. The saved sentinel survives both attempts.
- The standalone existing renderer still advances a month from a `file:` URL with networking disabled.
- Existing gameplay, terrain, roads, placements, saves, touch, and original gallery suites remain regression gates. CI rebuilds assets and checks the generated runtime tree/install metadata against the commit.

`scripts/serve-preview.py` mirrors a single checked-out branch at `/` and `/dev/` for browser tests. Production packaging remains the existing independent per-branch Pages workflow.

## Maintenance and boundaries

After changing installed modules or models, regenerate `asset-cache.js` with `node scripts/build-asset-cache.mjs`, or run the full `npm run build:assets`. The unit test deliberately rejects stale hashes, and CI verifies build reproducibility. Include the updated generated file in the same commit as its source changes.

Gallery UAT: https://matthnj15-pixel.github.io/Willow-Valley/dev/ui-kit/asset-gallery.html

No physical-phone performance, full six-home/seven-facility catalog, legacy renderer's external nature removal, or Three.js gameplay parity is claimed. Continue with B3 from the approved handoff after this slice; keep parent #53 open.
