# checkpoint

Spec: the user's build prompt (Cache Hierarchy Simulator). Design: DESIGN.md. Proposed commits: COMMITS.md.
Never git commit or push; stage only.

| step | state |
|---|---|
| 1. Engine + tests | done: src/engine (cache, simulator with MESI/inclusion/prefetch, presets with VERIFIED/APPROXIMATE sources, address breakdown); 32 tests pass |
| 2. Workloads + C++ sources | done: 10 workloads, C++ source with line mapping, custom trace parser; 58 tests pass |
| 3. 2D UI + metrics + worker | done: worker protocol, playback (1x = 20 accesses/s), 2D grids with aggregation, charts, counters, Try it for real; 132 tests; build ok; dev server http://localhost:5180 and http://192.168.1.163:5180 |
| 4. 3D view | done: InstancedMesh per cache, lazy-loaded Three chunk, orbit/zoom/focus, picking sets selection, WebGL 2 fallback to 2D; 236 tests; build ok |
| 5. Modes (Guided, Explain, Glossary) | done: 10 lessons with engine-checked claims, Explain via main-thread replay, 33-term glossary; 236 tests; headless Chrome 25/25. Keyboard grid selection fixed in stage 7. Open: line charts not clickable |
| 6. Benchmarks + verify scripts + VERIFY.md | done on macOS Intel: 8 benches, scripts/verify*, VERIFY.md (8 of 8 trends match in direction; 8 mismatches listed). Linux/Windows/Apple Silicon documented, not run. Open: SPSC cached-index layout (VERIFY M6) |
| 7. Reviewer pass | done: 3 reviews merged to 33 defects, all fixed in 4 batches. 2D false sharing 8 threads 1M on Raptor Cove: 40.9/102.6 ms to 0.3/0.5 ms per frame (median/p95). 272 tests, build ok |
| 8. README | done |

## Notes
- Machine: Intel Core i7-8750H (Coffee Lake), macOS, Apple clang 17. No cmake/brew/Xcode: cmake installed into ./.venv via pip (Kitware wheel). xctrace unavailable here (needs full Xcode), perf/valgrind are Linux-only.
- Deps: Preact 10 and TS 5.9 as in Meridian. Vite 8 and Vitest 5 since 2026-10-03 (learnhub), upgraded to clear npm audit (esbuild dev-server advisory GHSA-67mh-4wv8-2f99, vitest mocker GHSA-82fw-gwwq-j7x9); vitest config moved from environmentMatchGlobs to projects. Embedding in Meridian would need Meridian on Vite 8 too.

## Model fixes found by the trend tests (2026-10-03)
- Prefetchers now stop at 4 KiB page boundaries. Before, the stride prefetcher hid a page-sized column walk completely (col-major AMAT 4.2 vs row 4.0), which no real CPU does.
- list-vs-vector N cap raised to 2^21 so a shuffled list can outgrow the 9 MiB L3 (16 B nodes; the old 2^19 cap fit in L3).
- Shadow LRU for capacity/conflict classification: replaced Map insertion-order eviction (quadratic in V8 at large capacities) with a stamped lazy FIFO. Measured: 2M-access shuffled list 80.8 s to 9.3 s; 1M-access engine test 2.3 s to 0.97 s.
- SPSC: the model predicts that padding head and tail onto separate lines does not help by itself in a lock-step schedule (both sides still read the index the other just wrote). Compare with the measured bench in VERIFY.md.
- Trend tests 3 and 5 run with stride prefetch on (degree 2), since real hardware always prefetches; presets keep prefetch off for teaching.
- Toolchain on this Mac: fixed 2026-10-03 (stale CommandLineTools/usr/include/c++ removed). bench/CMakeLists.txt keeps a probe-gated workaround for other machines.
- Engine fix after stage 3: fills into shared levels now carry their state (dirty lines showed as clean in the 2D mirror), and a victim-L3 line turning dirty emits StateChange. New test replays events and compares with the engine's caches in all three inclusion modes; it fails without the fix.

## Open items (not done)
- Browsers: only Chrome measured. Firefox and Edge not installed; Safari needs Develop > Allow Remote Automation (left unchanged). iPhone Safari and Android not tested on devices.
- Linux, Windows, and Apple Silicon benchmark runs not done; PowerShell scripts never executed; xctrace counters need full Xcode.
- SPSC cached-index layout not modeled (VERIFY.md M6).
- scripts/verify puts .venv/bin ahead of PATH when ninja is missing, which also shadows a system cmake. Works, minor.

## Phase 2 (started 2026-10-03)
| step | state |
|---|---|
| 1. Toolchain | done: owner removed stale CommandLineTools/usr/include/c++. Header probe now passes, workaround branch not taken, all 8 benches build warning-free. Workaround kept (no-op on healthy toolchains, helps other machines with the same broken CLT) |
| 2. Plain-language pass | done: one analogy set (bookcase, box, shelf, slot; glossary.ts top comment), every lesson opens with Why it matters, terms defined and linked at first use, Explain leads with a one-line answer, metrics have What is this? toggles, 17 glossary terms added; 312 tests |
| 3. How-to-use | done: Start here walkthrough (7 steps, first visit, keyboard and phone aware), Help page with Try this actions, GUIDE.md with learning path; 362 tests; checked at 1280, 820, 390, 320 px |
| 4. Linux VM | done: scripts/vm-linux ran for real (301 s, peak 0.67 GiB), VM stopped after. perf hardware events not supported under qemu; cachegrind used. 8 of 9 trends match; seq_sum flat in the VM (GCC -O2 scalar loop, compute-bound). Results import + measured vs model in Try it for real. 312 tests |
