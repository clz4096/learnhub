# VERIFY: simulator trends vs. real hardware

Dated 2026-10-03. The model is verified on **trends** (direction and rough size), not absolute time: it charges each access the latency of the level that served it, with no out-of-order overlap or memory-level parallelism (see DESIGN.md, model limitations).

## How each side was produced

| side | source | how to reproduce |
|---|---|---|
| Measured | `bench/results/macos-x86_64-20261003-155612/results.csv` (medians, one full run) | `./scripts/verify` |
| Measured, Linux VM | `bench/results/linux-x86_64-20261003-204750/` (results.csv, cachegrind/, system.txt) | `scripts/vm-linux` |
| Model | `src/verify/trends.test.ts` via `predict()`, Intel Coffee Lake preset unless noted | `npx vitest run src/verify` (prints the table) |

Ratios compare like with like: measured ns per element against model cycles per element. Sizes differ where noted, because the model runs a trace one access at a time and the benchmarks need large inputs to time reliably.

## Coverage by OS

| platform | timing | counters | state |
|---|---|---|---|
| macOS, Intel (i7-8750H, Coffee Lake) | run | skipped: `xctrace` needs full Xcode; only Command Line Tools installed | **measured below** |
| macOS, Apple Silicon | not run | `xctrace` CPU Counters template (scripts/verify-macos.sh) | no machine available |
| Linux, bare metal | not run | `perf stat`, `valgrind --tool=cachegrind` (scripts/verify-linux.sh) | no machine available |
| Linux (VM): Ubuntu 24.04 in Multipass (qemu) on the same i7-8750H; 2 vCPUs, 3 GiB, GCC 13.3 `-O2` | run | `perf`: every hardware cache event `<not supported>`; cachegrind: run | **measured below. VM: timing shares the host's caches; trends only** |
| Windows | not run | VTune, AMD uProf, or WPR (scripts/verify-windows.ps1) | untested: no PowerShell on this Mac |

Run conditions: load average 5 to 8 from a background system process, so absolute numbers move between runs; the ratios held across the agent's reruns.

## Results, macOS on Intel Coffee Lake

| # | workload | measured | model | trend matches? |
|---|---|---|---|---|
| 1 | sequential sum, time per element as the array grows | L2/L1 1.14x; L3/L1 1.66x (4 MiB); DRAM/L1 4.05x (256 MiB) | L2/L1 1.05x; L3/L1 1.23x (1 MiB, 4 passes) | **Yes, direction.** Model step is smaller (see M1). |
| 2 | strided int32, time per touch, stride 1/2/4/8/16/32/64 | 1, 1.33, 2.05, 4.14, 13.3, 27.2, 31.2x | 1, 1.79, 3.37, 6.53, 12.9, 12.9, 12.9x | **Yes up to 64 B.** Past 64 B the model is flat; hardware keeps rising (M2). |
| 3 | matrix traversal, column / row time | 12.8x (N=2048), 17.2x (N=4096) | 15.1x (N=1024, stride prefetch on) | **Yes.** |
| 4 | matmul, naive / tiled time | 3.0x at T=16, 2.3x at T=32, 1.7x at T=64 (N=1024); about 2x at N=256 | 1.9x at T=16 (textbook preset, N=64) | **Yes, direction.** Different preset and size (M3). |
| 5 | linked list vs. vector, time per element | ordered/vector 6.0x; shuffled/vector 372x; shuffled/ordered 62x (8M nodes, 128 MiB) | ordered/vector 2.1x; shuffled/vector 39x; shuffled/ordered 18x (1M nodes, 16 MiB, prefetch on) | **Yes, direction.** Model is 3x to 10x low (M4). |
| 6 | AoS / SoA time | 8.8x (fits L3), 12.8x (DRAM); 64 B struct | 3.2x (N=262144); 32 B struct | **Yes, direction.** Model is low (M4, M7). |
| 7 | false sharing, packed / padded time | 7.2x (2 threads), 14.8x (4 threads) | 15.9x (2 threads) | **Yes.** Model overstates the 2-thread cost (M5). |
| 8 | SPSC ring, plain Lamport ring (each side re-reads the other's index) | padded is **slower**: 1.73x the packed time | padded is **slower**: 1.39x the packed time (2 cores, 16 slots) | **Yes.** Both show padding alone turning one bouncing line into two. Layouts differ (M8). |
| 8b | SPSC ring, cached remote indices, 64K slots | padded is faster: 1.4x to 2.3x, run to run | not modeled | **Gap** (M6). |
| 9 | open addressing vs. `std::map` | no benchmark (spec covers workloads 1 to 8) | `std::map` 4.4x more cycles | Unverified. |

## Results, Linux (VM)

**VM: timing shares the host's caches; trends only.** One run of `scripts/vm-linux` (301 s wall, host load average 3.9 before and 5.4 after). The model column is the same as the macOS table above. In the app, import the run's results.csv in **Try it for real** to get this comparison for the current workload.

| # | workload | measured in the VM | model | trend matches? |
|---|---|---|---|---|
| 1 | sequential sum, time per element | L2/L1 0.91x; L3/L1 1.07x; DRAM/L1 0.99x (flat, about 0.8 ns at every size) | L2/L1 1.05x; L3/L1 1.23x | **No.** Compute-bound scalar loop (V1). |
| 2 | strided int32, stride 1/2/4/8/16/32/64 | 1, 1.25, 1.83, 3.22, 6.33, 8.87, 11.0x | 1, 1.79, 3.37, 6.54, 12.9, 12.9, 12.9x | **Yes up to 64 B.** Still rising past 64 B, less steeply than on macOS (M2). |
| 3 | matrix traversal, column / row | 7.4x (N=2048), 12.3x (N=4096) | 15.1x | **Yes.** |
| 4 | matmul, naive / tiled | N=1024: 2.65x (T=16), 1.95x (T=32), 1.38x (T=64); N=256: 1.90x, 1.77x, 1.74x | 1.92x at T=16 | **Yes, direction** (M3). |
| 5 | linked list vs. vector, 8M nodes | ordered/vector 3.3x; shuffled/vector 176x; shuffled/ordered 54x | 2.1x; 39x; 18x | **Yes, direction.** Model low (M4). |
| 6 | AoS / SoA | 3.1x (N=65536), 6.3x (N=4M) | 3.2x | **Yes, direction.** |
| 7 | false sharing, packed / padded | 6.8x (2 threads), 5.7x (4 threads on 2 vCPUs) | 15.9x (2 threads) | **Yes, direction.** 4-thread row is oversubscribed (V3). |
| 8 | SPSC ring, plain Lamport ring | padded is **slower**: 1.24x | padded is **slower**: 1.39x | **Yes.** |
| 8b | SPSC ring, cached remote indices | padded is faster: 10x (2.5 vs 25.3 ns per item) | not modeled | **Gap** (M6). |

### Cachegrind miss counts (Linux VM)

Cachegrind simulates D1 32 KiB 8-way and LL 16 MiB 16-way, 64 B lines, taken from the CPUID that qemu reports (V2). It runs each variant alone at reduced sizes with `--reps 1 --warmup 0`, so the kernel runs twice (one calibration call, one measured). Counts are for the whole process, setup included, so the **difference** between variants is the signal. Threaded benchmarks are skipped (Valgrind serializes threads).

| benchmark (cachegrind size) | D1 misses | LLd misses | reading |
|---|---|---|---|
| strided, 262,144 touches, stride 1/2/4/8/16/32/64 | 1,097,429; 1,130,197; 1,195,733; 1,326,804; 1,588,950; 1,588,870; 1,588,824 | 1,090,708 to 1,582,406, same steps | Extra misses over stride 1 per touch give D1 miss rates of exactly 1/16, 1/8, 1/4, 1/2, 1, 1, 1: the model's L1 miss rates. Flat past 64 B, so the timing's rise past 64 B is not extra cache misses (supports M2). |
| matrix_traverse, N=2048 | row 2,113,217; col 9,453,249 | row 2,106,629; col 9,446,661 | col minus row is 7,340,032 = 2 calls x 4,194,304 x 7/8: column order misses on every access, row order on 1 in 8. |
| matmul, N=256 | naive 33,964,617; T16 23,278,557; T32 35,287,098; T64 34,543,680 | 41,727 for all | T=16 cuts D1 misses to 0.69x; T=32 and T=64 do not (power-of-two N, set conflicts; M3). Their timing gain comes from L2, which cachegrind does not simulate. |
| list_vs_vector, N=1M (16 MiB) | vector 3,832,352; ordered 4,225,573; shuffled 5,795,276 | 1,412,808; 1,626,682; 1,410,829 | Shuffled adds about one D1 miss per node per call over the vector. LLd is flat because the 16 MiB list fits cachegrind's 16 MiB LL; the real L3 is 9 MiB (V2). |
| aos_soa, N=1M | aos 4,800,379; soa 2,965,374 | 4,780,494; 2,804,490 | AoS has 1.6x the D1 misses of SoA, setup included. |
| seq_sum, 16K/128K/4M/64M | 2,248,703; 2,252,905; 2,379,882; 4,345,916 | 2,106,770; 2,106,755; 2,106,755; 4,204,045 | Setup dominates: the benchmark allocates and fills every size even with `--only`. Not informative below DRAM size. |

### Mismatches, Linux VM

- **V1. Sequential sum is flat in the VM.** GCC 13.3 at `-O2` compiles the uint32 sum to a scalar loop (`add (%rcx,%rax,4),%edx`, no `paddd`; checked with `objdump` in the VM), so it runs at about 0.8 ns per element at every size and never waits on memory. Apple clang vectorizes the same loop on macOS (0.06 ns per element). The model has no ALU cost and still predicts a step. Not a model defect; building the benchmarks with `-O3` or `-ftree-vectorize` on GCC would likely restore the trend (not tried).
- **V2. The guest sees qemu's cache layout, not the host's.** `lscpu` in the VM reports 32 KiB L1d, 4 MiB L2 per core, and a 16 MiB L3; the host has 256 KiB L2 and 9 MiB L3. Cachegrind sizes its LL from this, so it overstates what fits in the last level (the 16 MiB list, matmul). Timings still run on the real host caches.
- **V3. Four threads on two vCPUs.** The 4-thread false-sharing row time-slices threads on 2 vCPUs, so fewer increments contend at once and the ratio drops (5.7x, against 14.8x on macOS with 12 hardware threads). Create the VM with `CACHESIM_VM_CPUS=4` for a fair 4-thread row.
- **V4. Sizes of effects differ from macOS.** Column/row at N=2048 is 7.4x against 12.8x, and AoS/SoA 3.1x to 6.3x against 8.8x to 12.8x. Different compiler and code generation (GCC vs. Apple clang), plus a busy host, both move the size; every direction except V1 matches.
- **perf.** `perf stat -e cache-misses,L1-dcache-load-misses true` exits 0 but prints `<not supported>` for both events, with `perf_event_paranoid` lowered to 1, so this is the virtual CPU, not a permission. Cycles and instructions are also unavailable, so `scripts/verify-linux.sh` skips perf entirely.

## Mismatches

- **M1. Small L1 to L2 to L3 steps for a streaming sum.** On hardware the L2 step is small too (1.14x) because the L2 streamer keeps up with an SSE2 loop; the benchmark switched to a uint32 accumulator to stop the loop being compute-bound. The model run uses prefetch off and only 4 passes, so compulsory misses dominate every size. Not a defect; a DRAM-sized model run would need about 64M accesses.
- **M2. Strides past one line.** The model says every touch past 64 B is one miss, so time is flat. Hardware keeps rising to 31x. Likely causes, both not modeled: the adjacent-line prefetcher fetches the pair line for nothing, and each touch costs more TLB misses as the stride grows. The model has no TLB (DESIGN.md limitation).
- **M3. Matmul compared on different presets.** A Coffee Lake model run at N=1024 is about 2 billion accesses, too slow for a test. The textbook preset at N=64 shows the same mechanism (B's column reuse lost without tiles). Hardware also shows T=64 losing to T=16 at power-of-two N from L1 set conflicts; the model does not test tile size.
- **M4. Pointer-chasing and AoS costs are too small in the model.** The model gives every access the full latency of its level, one at a time. Hardware overlaps independent misses (a vector or SoA sum keeps many loads in flight and uses SIMD, about 0.15 to 0.3 ns per element), while a shuffled list cannot, because each load's address comes from the previous one. The model has neither overlap nor SIMD, so it understates the gap. Direction is right; size is not.
- **M5. False sharing at 2 threads.** The model charges a full transfer on every alternate access in strict lock-step. Real threads run unevenly, so a core often does several increments before losing the line. The measured 4-thread ratio (14.8x) is close to the model's 2-thread ratio.
- **M6. SPSC with cached indices is not a workload.** The fix that makes padding pay off (each side keeps a stale copy of the other's index and re-reads it only when the ring looks full or empty) is in the benchmark but not in `src/workloads/spsc-ring.ts`. Adding it as a third layout would let the simulator show the full lesson.

- **M7. The AoS struct differs.** The benchmark's `Particle` is 64 B (one line per element); the workload's is 32 B (two per line). The loop reads 8 B of each, so the benchmark moves 8 times the bytes of SoA and the model moves 4 times. Part of the larger measured gap is this, not only overlap and SIMD.
- **M8. The SPSC layouts differ.** In the workload's packed layout the slots share the index line (at +16); the benchmark keeps slots on their own lines, with 65,536 uint64 slots against the workload's 16 ints. Both still put head and tail on one line, which is the effect compared.

## Model fixes this comparison caused

- Prefetchers stop at 4 KiB page boundaries. Before, the stride prefetcher hid a page-sized column walk entirely, so column-major predicted 1.05x row-major against 12.8x measured.
- The linked-list size cap was raised to 2^21 nodes, so a shuffled list can outgrow the 9 MiB L3.
