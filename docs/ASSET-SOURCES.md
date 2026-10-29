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

## WORLD-TOPO-001: Terrain-aware lakes and Kenney landscape rendering

Research references:
- Real glacial valleys: New York State Museum shaded relief of Cayuga, Seneca, Keuka and nearby glacial troughs, https://nysm.nysed.gov/research-collections/geology/quarternary-landscape-materials-qlm/news/science-tuesday-deepest .
- Open-source map generation research: https://www.redblobgames.com/maps/mapgen4/ and https://github.com/redblobgames/mapgen4 . Mapgen4 demonstrates elevation, hydrology and biome generation and editable terrain.
- Open-source drainage reference: https://github.com/mrdunk/flowing-terrain . Contributes design ideas, not copied code.
- For future hydrological validation: priority-flood depression filling and D8 downstream flows, https://docs.rs/terrain-generator/latest/terrain_generator/ .
- Kenney Nature Kit CC0 meshes in the public Tiny Game Engine collection, https://github.com/Hidencod/tge-assets .

Current implementation: deterministic lowland candidate selection; long winding lake centerlines, irregular shoreline perturbation, and branched inlet basins. Water is clipped at the wet/dry triangle boundary rather than drawn as rectangular cells. This is a geometric improvement, **not** a fully physically correct watershed/erosion simulation yet. River sources and true downhill connections are planned for hydrology integration.

Kenney landscape art uses Nature Kit `ground-grass.glb`, `ground-rivertile.glb`, `ground-riverside.glb`, `platform-beach.glb` and `cliff-rock.glb`, in addition to the existing genuine trees and rocks. Select triangle geometry is draped over a continuous editable heightfield and lake/river surfaces; the terrain and water materials inherit actual Kenney mesh colors when available. A continuous mesh remains essential to avoid forcing complex organic shorelines into a visible square grid. Downloaded binary meshes are not yet bundled in the repository, so first load requires internet, and the status strip reports whether ground, water and shoreline assets loaded successfully.
