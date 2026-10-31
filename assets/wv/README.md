# Willow Valley local architecture study

Sources are the exact CC0 shortlist in `docs/assets/wv-art-002a/source-manifest.json`. Each kit retains its own `License.txt` and texture directory. `scripts/import-kenney.py` reacquires and verifies archive, model, dependency and license hashes. Runtime never downloads vendor archives.

`npm run build:assets` bundles the pinned Three.js/GLTFLoader, assembles two houses and an oak with full glTF scene transforms, embeds each texture, normalizes whole-assembly floor pivots, deduplicates geometry/materials, records source/output/derivative hashes and runs Khronos validation. The palette derivative maps source turquoise to subdued clay and blue infill to warm plaster without altering source bytes. Modular door/window units are never independently stretched. Canonical doors face +Z.

These outputs are **gallery-review**, `runtimeReady:false`. Their presence does not claim six shipping houses, completed facilities, gameplay renderer parity or physical-phone FPS. Six catalog IDs are reserved in immutable v1 order so future promotion does not silently reshuffle saved visual identities. The current two house recipes and tree are exposed only through World Builder's Architecture study.

The required install list includes all compiled gallery models, the engine and gallery shell before a clean offline relaunch. A failed required fetch rejects the new service-worker installation; prior caches and saves remain intact. Pages copies branch-local assets recursively. The standalone `offline.html` deliberately retains its existing game renderer and does not claim these study models.
