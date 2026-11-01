# C2: full-building detail pass

The user accepted the differentiated building styles and requested more depth in roofs, windows, doors, stonework and the whole buildings. This revision keeps the established plans and adds architectural detail to all ten normal/low candidates. It starts from develop `dfce320` (A, B, C and D merged). No shared renderer, gameplay, save, input, package or workflow files change.

The manifest recipe revision is now 2. Normal/low node names, existing identity mappings, 2.8 fixed conversion, 1.75 m reference, level/era separation, seats, granary support/floor contract and the sixth home fallback remain. F must consume the new output hash and remeasure its combined scene before adopting the detail meshes. All entries remain gallery-review/runtimeReady:false.

## Visible changes

- Farm, smith and granary roofs use closed curved clay tiles in overlapping, staggered courses, with deeper bargeboards and ridge caps. A dark closed roof backing remains beneath them. The smith has an added apron that follows the deeper tile surface and tucks into its single stack. Roof tiles stop at its existing aperture.
- Lumber has separate weathered roof boards, exposed rafter tails, joint pegs, iron ties and bench-vise jaws. Its low open plan and long racks are retained.
- Market canvas now curves between its supports, with restrained folds, a hem, rear support and rope ties. The stalls remain independent and their circulation stays open.
- Houses receive window recesses, jambs, projecting sills, drip hoods, mullions, shutters/hinges, entry latch plates and selected stone corner details. The original PR 81 normal cores and their texture bytes are preserved; these details are additive. The existing tiled house roofs already have accepted relief, so they retain their source geometry. The low hipped cottage retains its nine closed reed courses, bindings, ceiling and low roof silhouette.
- Barn/store cargo doors gain separate board faces, visible seams, latches and selected hinge rivets. The barn gets a ventilated loft opening and side windows; the granary gets a narrow rear louvred vent rather than domestic glazing. Wall battens and diagonal framing strengthen the structural reading.
- Forge masonry gains bevelled stone faces over recessed mortar, alternating courses, cladded hearth faces and a dressed stack. Structural iron shoes and selected joints finish the posts. No infill is added to the granary undercroft.

The atlas UV inset is widened to prevent neighbouring material colors bleeding into small roof tiles through mipmaps. Texture variation stays subdued. Real geometry supplies tile curvature, laps, board seams and stone bevels; individual straw fibers remain texture detail. A shared 512×256 linear normal atlas adds fine wood/reed relief, with explicit exported tangents for portable glTF rendering; it does not add material groups.

## Review and measurement

The gallery now compares the exact local C1 asset (`baseline-r1.glb`, SHA-256 `47bb946da13849f77491a08b7f66fa6413e10bb3a26fb5c4351b7d3b8449a520`) against C2. That file is a gallery-only reference, not a runtime candidate dependency. PR 81's accepted inputs are untouched. `comparison` and `inputs` in the new manifest record the reference explicitly.

`detailFeatures` contains measured recipe component counts per entry. All ten designs have six normal cameras, low front/roof views, monochrome, wireframe and before/after evidence under the owned testing directory. The measurement script still records fixed-scale 30/100-home submission fixtures and their failed gates honestly; these synthetic fixtures do not establish actual placement or phone FPS.

New tests check that the tiles are closed volumes, that function-specific details exist, that copied normal home cores remain byte-identical, and that detail stays clear of entry corridors and the forge aperture. Existing closure/contact/support probes and deterministic isolated rebuild validation remain. Several homes still exceed authoring material/triangle targets inherited from their source cores. Workplaces stay within 6k normal triangles and share one new material/atlas. Lower-detail geometry reduces course density and omits small fittings without removing roofs, supports or doors.

See `docs/testing/wv006-c/results.json` for current results and `changed-files.txt` for this detail PR's exact file list. Original C1 evidence and source description in the baseline contract remain historical; this document and the revision-2 manifest supersede their counts and old comparison labels. The granary's no-solid-infill contract and all runtime admission gates remain in force.
