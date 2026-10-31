# Issue 57 — D2 physical device UAT (pending)

No physical iPhone/foldable device is attached to the engineering environment.
Desktop SwiftShader results are recorded, but sustained 30 FPS, thermal behavior
and physical interaction acceptance have **not** been verified. Keep Three.js
opt-in and #57 open until this record is completed on the target device.

Use Development `?renderer=three&quality=normal`, then repeat low quality with
`?renderer=three&quality=low`. Explicit choices survive normal installed-PWA
launches outside save data. `?renderer=webgl&quality=normal` restores legacy.

Record device model, OS/browser, portrait/folded viewport, actual DPR, deployed
commit, quality, seed, battery/thermal conditions and before/after captures.

1. Run the 30- and 100-home scenes at `dev/ui-kit/settlement-benchmark.html`.
   Enter device/OS notes; capture the full 10-second warm-up + 60-second camera
   run in normal/low quality and download each JSON. Do not background the page.
   Review frame median/p95/p99 and resource budgets against the approved ADR.
2. In the playable Development game, inspect all six homes and seven facility
   roles without labels at neighborhood and close zoom. Inspect downhill plinths,
   doors/steps, curves/junctions, actual farmland, open public spaces and mature
   trees; record any overlap/clipping/clearance failure and the save/seed.
3. Exercise portrait/fold/resize, two-finger orbit/tilt/pinch, single-finger pan,
   paint/pan/erase, road drafting/curve handles and minimum touch targets. Verify
   gestures do not paint or spend resources accidentally.
4. Create/switch all three slots, advance months, reload and import a legacy
   save; confirm stable identities, state and outcomes.
5. On a clean installed PWA, allow the complete required install without visiting
   galleries. Enable airplane mode, cold-launch via its normal start URL, verify
   the opted-in renderer, switch all slots and advance months. Repeat an
   interrupted upgrade/retry and confirm the previous complete cache and saves
   survive. Repeat an explicit WebGL fallback.

Archive results and exact deployment commit in the issue/next UAT PR. No
main/production merge or default-backend promotion is authorized by desktop CI.
