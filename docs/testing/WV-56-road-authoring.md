# Issue #56 — authored road safety

The previous road validator checked a straight line between anchors, even for curves, and curve edits did not check terrain at all. `road-surface.mjs` samples the actual quadratic at at most six map-unit intervals, using the control-polygon length to bound spacing. It checks centerline and both 17-unit shoulders against analytic water, map bounds and the existing 1.55 sheer-slope limit, plus longitudinal grade. A zero-length pair remains finite. Bridges are not a gameplay type, so water crossings produce an actionable rejection.

Curve edits are evaluated on a candidate graph before assignment. Failed edits preserve saved geometry, costs and logs. Existing saves are not migrated or retroactively rejected, and legacy-map behavior and economic rules remain unchanged.

Unit coverage includes a dry chord whose curve crosses water, shoulder flooding, slope and grade limits, duplicate anchors, and atomic failed curve edits. Run the full browser/save/touch suite and offline build for every PR. Physical Safari/phone performance acceptance remains outstanding.
