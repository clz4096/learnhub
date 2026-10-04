# Cache Hierarchy Simulator

An interactive simulator that teaches how a CPU cache hierarchy behaves. Pick hardware and a C++ access pattern, then watch each access move through L1, L2, L3, and DRAM, with hits, misses, evictions, and coherence traffic between cores shown as they happen. Real C++ benchmarks in `bench/` check that each trend holds on actual hardware.

New here? Read [GUIDE.md](GUIDE.md): how to use each part of the app, a learning path, and experiments to try.

- **Free mode:** any preset, any workload, any parameter.
- **Guided mode:** 10 lessons, each with a goal, steps, what to notice, and a check question. Every number a lesson quotes is checked against the engine by a test.
- **Explain mode:** click a cache, set, slot, access, or metric to get a plain-English reason for what you see.
- **Glossary:** searchable terms, each linked to a lesson or setup.

## Run it

Requires Node.js 20 or later (developed on 22) and npm. The steps are the same on macOS, Linux, and Windows.

```sh
npm install
npm run dev        # http://localhost:5180, also served on your LAN (bound to 0.0.0.0)
```

Open the LAN address on a phone on the same network to use the phone layout. Other scripts:

| command | does |
|---|---|
| `npm test` | runs every unit test (Vitest) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | type-checks, then builds static files into `dist/` |
| `npm run preview` | serves `dist/` locally |
| `npm run verify` | typecheck, tests, and build in one step (the C++ benchmarks are `scripts/verify`, below) |

`dist/` is static and uses relative paths, so any static host or a subfolder works.

**Windows note:** if PowerShell blocks `npm` with an execution-policy error, run the commands from `cmd.exe` or Git Bash, or use `npm.cmd`.

**Browsers:** current Chrome, Edge, Firefox, and Safari, including iPhone Safari and Android Chrome. The 3D view needs WebGL 2; without it the app shows the 2D grids and says why. Phones always use the 2D grids, with panels as tabs.

## Verify against real hardware

`bench/` holds C++20 benchmarks for workloads 1 to 8. Timing alone (median of several runs with `std::chrono::steady_clock`) shows each trend; hardware counters are an optional second opinion.

You need CMake 3.16 or later and a C++20 compiler. Without a system CMake, install one into the project:

```sh
python3 -m venv .venv
.venv/bin/pip install cmake ninja          # Windows: .venv\Scripts\pip install cmake ninja
```

| OS | run | counters, when installed |
|---|---|---|
| macOS (Intel or Apple Silicon) | `scripts/verify` | `xctrace` with the CPU Counters template (needs full Xcode) |
| Linux | `scripts/verify` | `perf stat`, then `valgrind --tool=cachegrind` |
| Windows | `powershell -ExecutionPolicy Bypass -File scripts\verify.ps1` from a Developer PowerShell for VS 2022 | Intel VTune, AMD uProf, or WPR |

`scripts/verify` detects the OS, builds in Release, runs every benchmark, writes `bench/results/<os>-<arch>-<date>/`, and skips the counter step with a message when its tool is missing. `bench/README.md` covers per-OS details, flags, and Apple Silicon sizes. **VERIFY.md** compares the simulator with measured results, workload by workload, and lists every mismatch.

In the app, the **Try it for real** panel shows the matching benchmark source and build commands for your OS.

## Add a workload

A workload is a TypeScript module that emits a trace and shows the C++ it models.

1. Create `src/workloads/<id>.ts` exporting a `Workload` (see `src/workloads/types.ts`):
   - `id`, `number`, `title`, `summary`
   - `params`: a `ParamSpec[]` (int, choice, or bool, with defaults and bounds) that the UI turns into controls
   - `source(params)`: the C++ code and notes. Build the code with `code([...lines])`.
   - `trace(params, ctx)`: a generator of `{ addr, kind: 'R' | 'W' | 'I', core, src }`. `src` is the 1-based source line the access comes from; get it with `lineOf(sourceText, 'a unique snippet of that line')`, so line numbers survive edits to the source.
   - `estimateLength(params, ctx)`: the trace length, within 1 percent (the UI uses it for progress and limits).
2. Allocate addresses with `BumpAllocator` from `alloc.ts` so data is aligned as a real allocator would align it, and use `ctx.lineBytes` instead of assuming 64 B (Apple presets use 128 B lines).
3. Add it to `WORKLOADS` in `src/workloads/index.ts`, and raise the count in the registry test in `workloads.test.ts`.
4. Run `npm test`. The shared tests check determinism, the length estimate, valid addresses and cores, and that every `src` line names the variable being accessed.
5. Optional: add `bench/<name>.cpp` (use `harness.hpp`, print `RESULT,...` lines), list it in `bench/CMakeLists.txt` in `ALL_BENCHES` in `scripts/verify` and the `$Benches` default in `scripts/verify.ps1`, and map the workload id to it in `BENCH_NAMES` in `src/ui/bench.ts`. Then add its trend to `src/verify/trends.test.ts` and a row to VERIFY.md.

For a quick experiment without code, use workload 10 (**Custom trace**): one access per line, `<hex address> <R|W|I> <core>`, with `#` comments.

## Layout

| path | contents |
|---|---|
| `src/engine/` | the simulator: caches, MESI, inclusion, prefetchers, presets. Pure TypeScript, deterministic, no UI imports. |
| `src/workloads/` | the 10 workloads and the custom trace parser |
| `src/worker/` | the Web Worker that runs the engine and streams events |
| `src/ui/` | Preact app: panels, 2D grids, 3D view (`center/view3d/`), modes |
| `src/verify/` | model predictions and trend tests that feed VERIFY.md |
| `bench/`, `scripts/` | C++20 benchmarks and per-OS verify scripts |

DESIGN.md has the architecture and contracts; checkpoint.md has build status.

## Model limitations

The simulator is built to teach trends, not to predict run time. VERIFY.md shows where the sizes of effects differ from hardware.

- **Serial timing.** Each access costs the full latency of the level that served it, one at a time. Real cores overlap independent misses and use SIMD, so the model understates how much faster a vector or SoA loop is than a pointer chase.
- **No TLB and no virtual memory.** Addresses are treated as physical. Large strides cost more on hardware than the model shows.
- **Prefetchers are simple:** next-line, or a single-stream stride detector per core. Both stop at 4 KiB page boundaries, as real ones do; real CPUs run several prefetchers with many streams. Presets ship with prefetch off so the base behavior is visible.
- **Coherence:** MESI with a directory at the shared level and one state per core across its private caches. Private L2 is inclusive of L1. Threads alternate in strict lock-step, which overstates false-sharing cost at 2 threads.
- **One monolithic L3** indexed by modulo; real Intel L3s hash addresses across slices. Apple's system-level cache is modeled as an L3.
- **No DRAM detail:** no banks, row buffers, or bandwidth limits.
- **Instruction fetches** appear only in traces that include `I` accesses.
- **Preset numbers** are labeled VERIFIED (with a source link) or APPROXIMATE in the app and in `src/engine/presets.ts`. The 20-cycle cache-to-cache penalty is a teaching value, not a measurement.
- **Miss kinds** are the classic three (compulsory, capacity, conflict) plus coherence, so false sharing shows as its own category.
