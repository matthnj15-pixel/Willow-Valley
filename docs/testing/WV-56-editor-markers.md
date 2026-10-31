# Issue #56 — screen-space road editor glyphs

Road nodes, draft anchors and curve handles emit descriptors rather than world-space triangles. `editor-overlays.mjs` projects them with the same orthographic camera as WebGL and draws a 4 CSS-pixel center with a 7-pixel outer halo, independent of zoom or terrain slope. The transparent layer has no pointer events and is removed with the renderer. Existing 24-pixel-radius hit testing (48-pixel diameter), hold/curve gestures and two-finger camera ownership stay in the editor. Markers remain transient and never enter saves.

Tests now inspect marker descriptors/counts for node visibility, retaining triangle assertions for draft/curve preview surfaces. Projection tests cover focus, zoom and rotation. Browser suites still exercise existing curve edits and second-finger cancellation. Safari and physical-phone touch UAT remain necessary.
