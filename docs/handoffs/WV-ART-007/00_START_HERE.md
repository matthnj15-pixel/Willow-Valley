# WV007: implement the selected studies

This package replaces the previous A-F launch instructions for the next implementation round. Start from latest develop containing the WV007 audit/adoption PR, whose parent is PR 92 merge `55eb7199b663166b3cfb9ad97dbd96a3fc693624`.

## Run these four concurrently now

| Task | Document | Deliverable |
| --- | --- | --- |
| P1 buildings/storage | [P1](03_P1_Building_and_Storage_Runtime.md) | C4 loader, selective runtime LOD/resources, real-site placement/exclusions; D preview assets |
| P2 world | [P2](04_P2_World_Runtime.md) | A3 meadow + explicit A1 world systems adapted to actual terrain |
| P3 plot awareness | [P3](05_P3_Plot_Aware_Landscape_Runtime.md) | B nature, usable-parcel dressing, shared boundaries and actual painted fields |
| P4 profiling | [P4](06_P4_Device_and_Performance_Harness.md) | Real-state scenarios and installed-device diagnostics with explicit LOD/source reporting |

These are implementation layers, not more art studies. Each owns a separate render-adoption subdirectory, output assets, scripts/tests/evidence. Give each Codex its task document plus `01_AUDIT_AND_ADOPTION.md`, `02_LAYER_CONTRACT.md`, repository access, and the instruction to read `render-adoption/selection.json`. All these files live in the repo. Use separate worktrees/branches; no shared working checkout. Old A/B/C/D producer branches are merged and closed. Do not restart the old E prompt against C2 or launch the old F prompt using outdated selections.

**P5 waits for all four to merge.** [P5 integration](07_P5_Playable_Integration_and_Offline.md) is the only owner of shared renderer/app/registry/placement/cache changes. It attaches the finished layers, resolves combined issues, installs the correct offline closure and delivers playable UAT. P1-P4 independently merge after CI; final shared wiring is serialized through P5. P4 can build its controller/scenarios now, while final combined measurement is explicitly dependent on P5.

## Selection summary

C4 from PR 92 is the building/civic visual reference. A3 supplies meadow look/grass; A1 is the starting sky/water/shore/cliff system. A2 remains comparison-only. B's latest plot-aware work is mandatory. D warehouses/details are available, but physical storage/trade behavior waits for gameplay design. Source studies keep their original pins and continue serving historical comparisons. No source family is silently replaced in place.

## Before each launch and merge

Fetch develop, inspect current work/AGENTS instructions, run `node scripts/validate-wv007-adoption.mjs`, and confirm peers' ownership. Read the [audit](01_AUDIT_AND_ADOPTION.md) and [unit/API contract](02_LAYER_CONTRACT.md). The selected source files are hash-pinned; runtime derivatives go to task-owned new output folders and record their parents. If upstream changes a pinned source, review the change and update the selection deliberately in the coordinating integration task, not just to silence validation.

No current unresolved Git conflicts were found. The audit resolves semantic duplication through one owner per family/region/site and correct unit bridges. All tasks preserve existing gameplay, saves, input and offline behavior. Numeric triangle limits remain provisional regression checks, not a proven maximum of the user's phone. Do not relax current tests without evidence or erase accepted visual details simply to meet a speculative hardware ceiling.

## Completion

One real playable settlement uses selected source families, fits actual parcels, keeps plot-aware details/access/boundaries, and cold-launches offline with its saves. The diagnostics report actual sources/LODs and combined renderer work. Warehouse economies, home/workplace upgrades, new goods needs, production chains, a persistent park/plaza picker and native/WebGPU engine changes remain later work. Actual-device art/performance acceptance is clearly recorded rather than inferred from cloud tests.
