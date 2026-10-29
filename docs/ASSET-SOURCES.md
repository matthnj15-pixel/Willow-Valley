# Kenney assets used by Willow Valley World Builder

## UAT model selection

The game's art direction uses these creator-released CC0 packs:

- **Nature Kit**: trees, rock formations, later ground detail and bridges. https://kenney.nl/assets/nature-kit
- **Fantasy Town Kit**: organic cottages and early urban buildings. https://kenney.nl/assets/fantasy-town-kit
- **Survival Kit**: starting huts, logging, fishing and simple storage. https://kenney.nl/assets/survival-kit
- **Castle Kit**: the modular civic estate and ceremonial buildings. https://kenney.nl/assets/castle-kit

### Current implementation (WORLD-3D-002)

The terrain preview loads genuine low-poly GLBs from Kenney's Nature Kit and Castle Kit, redistributed in the public CC0 [Tiny Game Engine asset library](https://github.com/Hidencod/tge-assets), using its GitHub Pages URLs.

Imported assets: `tree-oak.glb`, `tree-pinedefaulta.glb`, `tree-default.glb`, `rock-largea.glb`, and optional `tower-square.glb`.

Models are parsed as native glTF 2.0 meshes. Woodland tree positions remain deterministic from the world seed. Terrain elevation is generated independently of mesh display. Kenney Nature Kit models have a different nominal authoring scale from world units, so models are normalized by their actual GLB bounding boxes and assigned an explicit in-world height. This keeps their relative visual character rather than replacing them with cones.

**UAT constraint:** Model loading requires a network connection on first visit. The terrain canvas and simplified vegetation remain operational when the external GLB host is unreachable. Full self-contained, version-pinned local bundles are scheduled for the asset-pipeline integration.

Fantasy Town and Survival Kit models have **not** been imported yet. The optional tower is a **scale reference**, not an automatically founded town.

License: CC0-1.0, commercial use and redistribution allowed. Attribution optional. Credit: Art assets by [Kenney](https://kenney.nl).
