# Issue #56 — full-footprint placement validation

Facilities use one shared footprint definition in `settlement-architecture.mjs` for rendering and placement. `validateFoundationSite` samples the whole rotated footprint at no more than three-unit spacing, including all perimeter edges, and rejects water, unsafe slopes, map boundaries and excessive relief. Facility placement also tests existing road rights-of-way and local access paths. Cottage growth checks its actual seeded dimensions and entrance-facing orientation before accepting a candidate.

The analytic world remains authoritative for placement; the rendered terrain adapter remains presentation-only. Existing sites and older saves are never moved or invalidated. Legacy-map placement retains its old policy. Rejections occur before resource deductions and have actionable reasons. Safe buildings retain the existing costs and monthly outcomes.

Tests include safe slope seats, a dry center with a flooded edge, rotated footprints, interior slope hazards, excessive relief, boundaries, blocked access, and legacy fallback. Full unit/browser, icons and offline-build checks are required. Real-device Safari and FPS acceptance remain outstanding. Three.js/model delivery remains gated on #55.
