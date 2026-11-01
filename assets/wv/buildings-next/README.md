# WV006-C measured candidates

`catalog.glb` contains ten normal roots and ten `__low` roots, in visual metres, Y up. `manifest.json` is the measured E/F baseline contract. All entries remain `gallery-review`, `runtimeReady:false`. Apply exactly 2.8 game units per visual metre. No model is installed in gameplay by these files.

Rebuild from the checkout with `npm ci && node scripts/build-wv006-baselines.mjs`. No archive, external texture, runtime decoder or network asset is required. The normal homes preserve the committed PR 81 shells and textures; only home-low-hip receives a new roof. Low home shells use the simplifier shipped with pinned Three.js, with unchanged scale. Workplaces, roof and structural additions, and their shared atlas are original Willow Valley artwork, dedicated CC0-1.0. The copied `License_Source.txt` applies to retained Quaternius art only; see the scoped upstream audit. The private source archive was neither available nor verified in C.

The GLB embeds all images. Separate normal/low geometry shares material and texture resources. Node extras identify semantic categories and optional dressing. Removing loose props must preserve hearths, supports, cargo doors, fixed hay storage, racks and counters. Keep the loader's material/geometry ownership shared between instances.
