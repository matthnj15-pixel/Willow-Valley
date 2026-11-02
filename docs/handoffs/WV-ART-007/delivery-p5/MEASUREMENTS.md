# P5 integrated measurement evidence

These are actual isolated fixture scenes in the adopted renderer. Headless Chromium uses software WebGL at 1100×950 / DPR 1; neither the timing nor structural admission approves a physical phone. Reference source detail is preserved. No numeric limit was relaxed.

Large full-window records and complete placement admissions are stored as lossless `.json.gz` files. `artifact-encoding.json` records their original byte lengths and SHA-256 hashes; `gunzip -c FILE.json.gz` recovers the exact unfiltered JSON. Smaller summaries and short records remain plain JSON.

## Measured closures

- Full-detail reference admission SHA-256: `2295bc550274dbf097f9de004da7fd57d0baa44f7243996b1427aa18f0fc0483`. Reference runs precede the final live camera fallback/readiness corrections; those timings are not asserted to be a final-code baseline. All eight derivative hashes are identical.
- Final gameplay-policy admission SHA-256: `b880bf0dd81d89db0e3b843633ebfeb9128e1fc06a23debcd910fc824fc6c5e0`, byte-identical to the committed final admission manifest. Raw live files begin `live-`.

## Full-duration windows

Every row uses actual 45-second warmup plus 60-second measurement. Admission means P4 source/readiness/window checks, not device performance. RAF callback pacing is not rendered FPS; the month path is mostly on-demand idle and includes an expensive geometry/atlas update.

| Scene / profile / policy | Path | P4 admission | Peak triangles | Peak calls | Median / p95 callback ms | Observed changed render frames |
| --- | --- | --- | ---: | ---: | --- | ---: |
| 30 / normal / full reference | month | invalid: stale-layer:buildings, stale-layer:landscape, stale-layer:world | 382521 | 269 | 16.7 / 17.1 | 1 |
| 30 / low / full reference | month | invalid: stale-layer:buildings, stale-layer:landscape, stale-layer:world | 177293 | 234 | 16.7 / 17.1 | 1 |
| 100 / normal / full reference | orbit | admitted | 888689 | 411 | 818.1 / 1018.2 | 74 |
| 100 / low / full reference | orbit | admitted | 456463 | 364 | 456.8 / 568.1 | 131 |
| 100 / normal / actual live | orbit | admitted | 623145 | 349 | 633.2 / 780.6 | 93 |

Both month outcomes are checked against actual simulation advancement. Newly committed desire paths trigger a real asynchronous geometry revision; P4 correctly retains stale-layer issues even after recovery. The raw records remain invalid. The normal/low reference 100-home orbit records are structurally admitted but render slowly in software. The final live 100-home normal orbit is also structurally admitted and remains over the provisional combined guards.

## Final actual gameplay policy at near/town/far

All twelve short records have exactly `non-device-duration`, no readiness/source/resource issues, and no page errors. The table shows the final whole-host snapshot, not a gallery subtotal. LOD columns count homes; fallback identities and saved positions remain unchanged. Visible-home distributions, parsed image qualities, and resource estimates are in each raw record.

| Homes | Quality | Zoom | Whole triangles | Calls | Normal / low / distance / legacy / culled homes |
| ---: | --- | ---: | ---: | ---: | --- |
| 30 | normal | 180 | 301052 | 96 | 3 / 0 / 5 / 16 / 6 |
| 30 | normal | 650 | 330308 | 215 | 3 / 0 / 5 / 16 / 6 |
| 30 | normal | 1200 | 176114 | 214 | 3 / 0 / 5 / 16 / 6 |
| 30 | low | 180 | 136615 | 84 | 0 / 2 / 5 / 18 / 5 |
| 30 | low | 650 | 159329 | 203 | 0 / 2 / 5 / 18 / 5 |
| 30 | low | 1200 | 140425 | 214 | 0 / 2 / 5 / 18 / 5 |
| 100 | normal | 180 | 549404 | 140 | 5 / 0 / 23 / 41 / 31 |
| 100 | normal | 650 | 619046 | 328 | 5 / 0 / 23 / 41 / 31 |
| 100 | normal | 1200 | 354969 | 361 | 5 / 0 / 23 / 41 / 31 |
| 100 | low | 180 | 287245 | 134 | 0 / 4 / 24 / 44 / 28 |
| 100 | low | 650 | 341933 | 310 | 0 / 4 / 24 / 44 / 28 |
| 100 | low | 1200 | 317384 | 349 | 0 / 4 / 24 / 44 / 28 |

The live policy is distance-based, never settlement-count based: requested detail near ground focus, C4 distance detail beyond the source threshold, explicit culling, and B far detail at far zoom. Low profiles have no loaded normal-quality C4 images. The disk install contains all profiles for offline switches; it is not a low-only transfer claim. Full-detail reference near/town/far raw files and screenshots remain separately available. Their far short records retain pending-landscape flags from the older queued-frame probe; those flags were not removed.

## Art and CPU observations

`close-*.png` captures actual admitted C4 farm, lumber, smith, market, granary, park/plaza and four distinct supported homes on final terrain. The original normal source bundle, thatch courses/chimney and granary undercroft are unchanged. These screenshots support review; user art approval remains pending.

The unused legacy road offset calculation dominated an initial CPU profile (about 35.5 seconds on the 30-home fixture). P5 omits that attribute calculation only in the adopted path, with a geometry/editor-buffer equality test. Classification, large field atlases, dense plot dressing, fragment work, retained multi-LOD images and draw batching still require target-device investigation. The raw phase timings and actual resource observations remain in admission/diagnostic records. No exact GPU/JS heap, thermal, battery or >=30 FPS claim is made.

Run `scripts/measure-wv007-integration.mjs` for full-detail reference and `scripts/measure-wv007-live.mjs` for final gameplay policy; enable their documented full-window environment flags. Complete the installed-device checklist before broader promotion.
