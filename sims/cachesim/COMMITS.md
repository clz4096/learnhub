# Proposed commits

The owner commits; these are suggestions, in order. Everything is staged. Each block commits only its listed paths (`git commit -- <paths>`), so running them in order splits the work into seven commits. For one commit instead, use the last message.

The branch `main` has no commits yet.

## 1. Project scaffold and design

```sh
git commit -F- -- .gitignore package.json package-lock.json tsconfig.json vite.config.ts vitest.config.ts DESIGN.md checkpoint.md <<'EOF'
scaffold: Vite + Preact + signals project, design doc

Preact 10 and TypeScript 5.9 as in Meridian; Vite 8 and Vitest 5 to
clear npm audit advisories. DESIGN.md freezes the
engine and workload contracts and the worker protocol.
EOF
```

## 2. Engine

```sh
git commit -F- -- src/engine <<'EOF'
engine: deterministic cache hierarchy simulator with MESI

Per-core L1d (optional L1i) and L2, shared L3, DRAM. LRU, tree
pseudo-LRU, and seeded random replacement; write-back, write-allocate.
MESI through a directory; inclusive, non-inclusive, and victim shared
levels. Next-line and stride prefetchers that stop at 4 KiB pages.
Miss kinds: compulsory, capacity, conflict (shadow fully associative
LRU), and coherence. Per-level and per-core stats, including cycles
served. Presets for a textbook cache, Intel Coffee Lake and Raptor
Cove, AMD Zen 4, and Apple M1, each number labeled VERIFIED with a
source or APPROXIMATE. Config limits keep edited caches in memory.
EOF
```

## 3. Workloads

```sh
git commit -F- -- src/workloads <<'EOF'
workloads: ten access patterns with C++ source and line mapping

Sequential sum, strided, row vs column, naive vs tiled matmul, list vs
vector, AoS vs SoA, false sharing, SPSC ring, hash table vs std::map,
and a custom trace parser. Each access points at the C++ line that
makes it, found by a marker so line numbers survive edits.
EOF
```

## 4. Real-hardware benchmarks and verify scripts

```sh
git commit -F- -- bench scripts <<'EOF'
bench: C++20 benchmarks and per-OS verify scripts

Eight benchmarks (workloads 1 to 8) whose timing alone shows each
trend. scripts/verify detects the OS and Rosetta, builds Release, runs
everything, and collects counters with perf and cachegrind, xctrace,
or VTune, uProf, or WPR when installed, skipping cleanly otherwise.
EOF
```

## 5. Model predictions and VERIFY.md

```sh
git commit -F- -- src/verify VERIFY.md <<'EOF'
verify: trend tests and simulator vs hardware comparison

Trend tests assert the direction of each workload's effect in the
model. VERIFY.md compares them with measured results on an i7-8750H
and lists eight mismatches with causes.
EOF
```

## 6. App: worker, 2D and 3D views, metrics, modes

```sh
git commit -F- -- index.html src/main.tsx src/worker src/ui src/styles <<'EOF'
ui: interactive simulator with 2D and 3D views and guided modes

The engine runs in a Web Worker; the main thread mirrors cache
contents from events. 2D canvas grids repaint only changed cells (60
fps with 8 cores at 1M accesses); a lazy-loaded Three.js die view uses
one InstancedMesh per cache. Metrics per level and per core, address
breakdown, coherence arrows, counter tools per OS, and a Try it for
real panel. Guided lessons whose numbers are checked against the
engine, Explain mode, and a glossary. Phone layout with tabs, keyboard
selection of grid cells, light theme at WCAG AA contrast.
EOF
```

## 7. README and this file

```sh
git commit -m "docs: README with per-OS setup, adding a workload, and limitations" -- README.md COMMITS.md
```

## Phase 2 (after the commits above)

Nothing is committed yet, and the index holds the current files, so commits 1 to 7 above already include this phase's changes. Use these messages only if you would rather fold the phase 2 wording into commit 6 and the VM work into commit 4, or amend after committing. The single-commit alternative also covers everything.

```sh
git commit -F- -- src/ui src/workloads <<'EOF'
ui: plain language for newcomers, Start here tour, and Help page

One analogy set across lessons, glossary, and Explain (bookcases and
boxes). Every term defined and linked at first use; lessons open with
why it matters; Explain leads with a one-line answer; metrics explain
themselves. A skippable first-visit tour and a Help page with a working
"try this" for each way to use the tool. Results import in Try it for
real compares measured ratios with the model.
EOF
```

```sh
git commit -F- -- scripts bench VERIFY.md <<'EOF'
verify: Linux VM runs through Multipass

scripts/vm-linux creates a capped VM (2 CPUs, 3 GiB, 10 GiB disk), runs
the benchmarks and cachegrind inside it, copies results back, and stops
the VM. VERIFY.md adds the VM results and four VM mismatches.
EOF
```

```sh
git commit -m "docs: GUIDE.md learning path and checkpoint update" -- GUIDE.md README.md checkpoint.md COMMITS.md
```

## Single-commit alternative

```
cachesim: cache hierarchy simulator with real-hardware verification

Deterministic TypeScript engine (MESI, inclusion policies, prefetchers,
3C plus coherence miss kinds) in a Web Worker; ten workloads with C++
source; 2D and 3D views; Guided, Explain, and Glossary modes; C++20
benchmarks and per-OS verify scripts; VERIFY.md comparing model trends
with measurements.
```
