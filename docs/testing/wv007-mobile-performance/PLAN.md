# WV007 mobile performance — Kickoff / Planner

Starting revision: `ffba0efc21743123dcf6fbaa140084eb255e6932` (`develop`, PR #98).
No open PRs, existing local work, AGENTS.md or CLAUDE.md at kickoff. Feature
branch: `feature/wv007-mobile-performance`. Acceptance authority: Nate's mobile
performance handoff; Willow Valley's README, WV007 selection/layer contracts and
current workflow. Master Plan repository/provider rules do not apply.

Owner: root is Kickoff, Planner and the sole Builder of shared renderer/cache
changes. A separate read-only Reviewer receives the final substantive diff.

## Outcome and sequence

1. Profile normal Development gameplay first, with isolated copies of the P4
   deterministic fixtures. Compare explicit Three normal/low and native WebGL
   normal in new browser contexts. Record actual renderer, fallback, policy,
   display mode, viewport/DPR, build/cache state and readiness.
2. Use controlled CPU/render probes to rank costs. Select the smallest reversible
   improvement supported by traces, preserving fixed-quality source art and LOD
   policy. Keep simulation, persistence and default renderer rollout unchanged.
3. Compare matched runs on 30 and 100 homes, camera paths and near/town/far views.
   Record raw intervals and observed rendered frames, counters/resources, CPU
   stages, boot, edits and checked month transitions (including stale readiness).
4. Run required unit/assets/icons/offline/browser/Three parity checks and review
   the exact implementation. Open a PR to develop, merge only after exact-head
   CI and review, verify served Development SHA. Stable promotion remains Nate's.

## Acceptance / evidence matrix

| Criterion | Evidence |
| --- | --- |
| Repeatable faster identified path, both fixtures | Raw before/after records, CPU traces, repeats and spread; same browser/GPU, viewport/DPR, fixture, camera and effective policy |
| Normal close/town/far parity | Matched screenshots and LOD/counter records; no missing models, terrain, textures or overlays |
| Input, roads, zoning, months and saves | Actual route checks, current Three parity suite, coherent final revisions; save bytes unchanged by camera movement; all slots/resume/migration |
| Offline install/update/recovery | Existing fresh/update/rollback/context and offline browser tests plus focused affected checks |
| Installed Duo sustained >=30 FPS | **Pending physical phone**: 45s warmup/60s capture, cold airplane-mode launch and 15–20 min replay; cloud evidence cannot pass this row |
| Release | PR/current-head CI/review links, merge SHA, actual served and cached Development SHA separately from Pages trigger SHA; no main promotion |

Existing P5 records remain intact. New performance evidence is in this directory.
The integrated reference page at the baseline uses full requested detail and
water disabled; it is distinct from live gameplay policy. No larger personal
save is available in this clean environment. No player export is required.
