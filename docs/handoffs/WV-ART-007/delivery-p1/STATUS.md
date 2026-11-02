# P1 delivery status

Implementation commit: `18fd6ec381a5509d590e169bad14a1f8d85879db`. The following documentation-only commit adds the final inventory/provenance. The PR targets develop; P5 application/offline integration and actual-device acceptance remain pending.

Local validation on 2026-11-02:

- `npm ci` succeeded with the committed lockfile.
- Full unit suite: 231 passed, one existing skip, zero failures (232 tests).
- All five new GLBs: zero glTF errors and warnings; independent validation is included in the new unit suite.
- Two successive P1 builds: all outputs, manifest and notices byte-identical.
- `npm run build:assets`, `npm run build:icons`, checked icon artifacts, `npm run build:offline` succeeded; existing shared generated outputs have no Git diff.
- Full browser run: 140 passed. After adding the explicit 100-home measurement, the final focused P1 run passed all three browser tests (covering that addition and final P1 changes).
- Source adoption validator passes; no frozen source, source-study consumers or selection pins changed.

- Required Three.js camera/zoning/road/save/lane parity selection: 16 passed.

The isolated 100-home requested-normal scene keeps 100 normal entries: 645,168 estimated active geometry triangles / 48 batches, with actual renderer work 670,688 triangles / 52 calls. Low and distance each keep 100 explicitly reported entries: 398,208 geometry triangles / 39 batches, actual renderer 416,008 triangles / 43 calls. Renderer work includes material-group submissions; geometry totals alone do not equal renderer work. These exceed the provisional 250k/150k triangle guards and require combined device measurement. No test budget was relaxed. C4 normal transfer is 11,024,000 bytes with a 28,639,248-byte decoded mip estimate; low is 3,045,888 / 6,029,318 and distance 2,964,484 / 6,029,318. D previews are separately loaded (352,960 normal / 189,696 low bytes; no textures).

Current-head PR CI, refresh/merge provenance and Pages deployment are recorded in the PR timeline before completion. The current Pages workflow does not copy this runtime module namespace: no newly published P1 review/game attachment or installed offline closure is claimed. P5 must install those changes. Existing preview game: https://matthnj15-pixel.github.io/Willow-Valley/dev/.

Exact source/output hashes and per-entry errors: [artifacts.json](../../../testing/wv007-p1/artifacts.json). API, ownership, module closure and remaining work: [IMPLEMENTATION.md](IMPLEMENTATION.md). Full requested/effective 100-home resource measurements: [benchmark.json](../../../testing/wv007-p1/benchmark.json). Triangle guardrails remain provisional and unchanged; software measurements cannot approve target hardware.
