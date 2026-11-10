# Nate's installed Development test — pending

Physical iPhone Duo / installed iOS Home Screen acceptance has **not** been run
in this environment. Chromium/SwiftShader evidence is kept separately.

1. Back up any personal settlement with Export JSON. Open Development online
   with `?renderer=three&quality=normal`, wait for **OFFLINE READY**, then close
   the app completely. Record the served service-worker SHA and asset version,
   iOS/browser, viewport/DPR, requested/effective renderer/quality, battery and
   Low Power Mode. A selected Three preference persists at the normal PWA start
   URL. Native control: `?renderer=webgl&quality=normal`; low comparison:
   `?renderer=three&quality=low`. Keep comparison saves/camera/device conditions
   identical. An unexpected fallback invalidates a Three comparison.
2. Enable airplane mode and cold-open the Development Home Screen icon. Confirm
   the intended graphics loaded, the right settlement/slot resumed, and the
   scene becomes interactive. Test all three slots without overwriting them.
3. Pan at close/town/far distances. Pinch and roll/orbit the two-finger trackball.
   Check that the normal close-up roofs, chimney joins, granary undercroft,
   workplaces, plot ground cover and access edges remain intact. Record touch
   lag manually; callback pacing does not measure finger-to-screen latency.
4. Enter Roads; select a node, hold/drag a curve handle, create a draft and Cancel
   or commit an intended road. In Zoning, Paint, Erase and Commit. Advance Month
   once and wait for the updated scene, checking resources/calendar and layers.
5. Open Menu → Local renderer diagnostics. This uses **isolated** 30/100-home
   fixtures and never player slots. Select **Gameplay distance/culling · live
   water**, normal quality, then Load isolated scene. The reference default is a
   separate full-detail/water-off profile, not live gameplay. Run idle, orbit,
   zoom and month with the standard **45s warmup + 60s capture**, Download local
   record for each. Repeat on both fixture sizes. Record rendered observations,
   median/p95/p99 and >33.33/>50ms intervals, actual LODs, readiness flags and
   perceived lag. The diagnostics canvas layout differs from the full game;
   also test gestures on the normal game route. Target sustained 30 FPS during
   active camera motion on both normal-quality fixtures; do not use idle RAF
   pacing as rendered FPS.
6. Background/restore, lock/unlock and cold offline reopen. Play 15–20 minutes,
   then repeat the same captures and save-slot checks. Record warmth, battery,
   Low Power Mode, interruptions and long frames; keep interrupted records and
   rerun fresh windows. Repeat after an online Development update to check the
   complete-cache update and offline reopen.

Use the full fields in `docs/testing/wv007-p4/DEVICE_CHECKLIST.md`. Keep raw
records local until you choose to share them. Stable promotion stays with Nate
after this UAT; this performance pass does not approve it.
