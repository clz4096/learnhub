# Real-hardware cache benchmarks

These eight programs show, on your own CPU, the cache effects that the
simulator in `src/` models. Each executable times two or more variants of the
same work, so the timing alone shows the trend. Hardware counters are an
optional second opinion collected by the `scripts/verify*` scripts.

The code is portable C++20 with no third-party dependencies and no
OS-specific calls. Timing uses `std::chrono::steady_clock` through the small
harness in [`harness.hpp`](harness.hpp).

## Build and run

You need CMake 3.16 or later and a C++20 compiler. Benchmarks build as
Release (`-O2`, or `/O2` on MSVC) by default.

The quickest path on any OS is the verify script, which configures, builds,
runs every benchmark, and saves the output:

```sh
scripts/verify                 # macOS, Linux, Git Bash
```

```powershell
powershell -ExecutionPolicy Bypass -File scripts\verify.ps1   # Windows
```

Results land in `bench/results/<os>-<arch>-<date>/` (ignored by Git).

If CMake is not installed, put it in a project-local virtual environment
instead of system-wide. The verify scripts look there automatically.

```sh
python3 -m venv .venv
.venv/bin/pip install cmake ninja          # Windows: .venv\Scripts\pip install cmake ninja
```

### macOS (Intel and Apple Silicon)

Install the Command Line Tools (`xcode-select --install`) or Xcode, then:

```sh
cmake -S bench -B bench/build -G Ninja      # or omit -G for Unix Makefiles
cmake --build bench/build
bench/build/seq_sum
```

Apple Silicon has a 128-byte L2 line, 128 KiB+ L1d per performance core, and
a large shared L2 instead of an L3. The default sizes target a typical x86
laptop, so pass larger sizes there, for example
`seq_sum --bytes 64K,4M,32M,512M`.

If CMake prints `libc++ headers not found on the default path`, your Command
Line Tools install has a stale `usr/include/c++/v1` directory that hides the
SDK's C++ headers. The build works around it automatically; reinstalling the
Command Line Tools fixes it properly.

Hardware counters need full Xcode (for `xctrace` and the Instruments
**CPU Counters** template). See the comments in `scripts/verify-macos.sh`.

### Linux

```sh
cmake -S bench -B bench/build -DCMAKE_BUILD_TYPE=Release
cmake --build bench/build -j
```

For counters, install `perf` (usually `linux-tools-$(uname -r)` or `perf`)
and optionally `valgrind`. If `perf stat` reports no events, lower
`kernel.perf_event_paranoid` or run on bare metal; most VMs hide the PMU.

### Linux VM (from a macOS or Linux host)

`scripts/vm-linux` runs the Linux verify in a dedicated Ubuntu 24.04 virtual
machine, so you can get Linux and cachegrind results without a Linux box. It
needs [Multipass](https://multipass.run) and exits with a message if
Multipass is missing.

```sh
scripts/vm-linux                 # create if needed, run every benchmark, copy results back, stop
scripts/vm-linux seq_sum strided # only these benchmarks (BENCH_ARGS passes through too)
scripts/vm-linux status          # state, size, memory use
scripts/vm-linux shell           # shell in the VM; the repo copy is in ~/cachesim
scripts/vm-linux stop
scripts/vm-linux delete          # asks first; --yes skips the question
```

What a run does:

1. Creates a VM named `cachesim-linux` if it does not exist, then installs
   `build-essential`, `cmake`, `ninja-build`, `valgrind`, and `perf` for the
   running kernel (falling back to `linux-tools-generic`). Later runs skip
   this.
2. Copies `bench/` and `scripts/` into the VM as a tar stream through
   `multipass transfer`. Nothing is mounted, so the VM cannot write into your
   checkout, and your host `bench/build/` stays behind.
3. Runs `scripts/verify` in the VM with its own GCC. It lowers
   `kernel.perf_event_paranoid` to 1 inside the VM first (Ubuntu ships 4,
   which blocks `perf` for normal users whether or not counters exist).
4. Runs `perf stat -e cache-misses,L1-dcache-load-misses true` and records
   the outcome in `system.txt`, along with how long each phase took, peak VM
   memory use, and host load.
5. Copies `bench/results/linux-*/` back into `bench/results/` on the host.
6. Stops the VM, also on failure or Ctrl-C. Pass `--keep-running` to leave it up.

| Variable | Default | Meaning |
| --- | --- | --- |
| `CACHESIM_VM_CPUS` | 2 | Virtual CPUs |
| `CACHESIM_VM_MEM` | 3G | Memory |
| `CACHESIM_VM_DISK` | 10G | Disk |

The sizes apply only when the VM is created. To change them, run
`scripts/vm-linux delete` and run again. Use at least 4 CPUs if you want
the 4-thread `false_sharing` row to run one thread per CPU.

Measured on the i7-8750H (macOS host, qemu driver): the first run took 301 s
(76 s to create the VM, 37 s to install tools, 183 s to build and run
everything including cachegrind). Peak guest memory use was 0.67 GiB.

Reading VM results:

- **Timing shares the host's caches; trends only.** The guest runs on the
  host's cores and caches next to every other host process.
- **`perf` hardware cache events are not available** under Multipass on
  macOS: `perf stat` prints `<not supported>` for every cache event, so
  cachegrind is the counter source.
- **The guest sees a made-up cache layout.** qemu reported 32 KiB L1d,
  4 MiB L2 per core, and a 16 MiB L3, not the host's 256 KiB L2 and 9 MiB L3.
  `lscpu` in `system.txt` and cachegrind's simulated LL both use it.
- **Cachegrind counts are for the whole process**, including setup such as
  filling arrays. Compare the difference between two variants, not the
  totals.
- **GCC 13 at `-O2` does not vectorize** the `seq_sum` loop that Apple clang
  does, so that kernel is compute-bound in the VM (see VERIFY.md, V1).

### Windows

From a **Developer PowerShell for VS 2022** (or Developer Command Prompt):

```powershell
cmake -S bench -B bench\build -G "Visual Studio 17 2022" -A x64
cmake --build bench\build --config Release
bench\build\Release\seq_sum.exe
```

Visual Studio is a multi-config generator, so always pass `--config Release`;
binaries go to `bench\build\Release\`. clang-cl (`-T ClangCL`) and MinGW
(`-G "MinGW Makefiles"` or `-G Ninja` from an MSYS2 shell) also work.

For counters, `scripts\verify-windows.ps1` uses Intel VTune if installed,
else AMD uProf, else prints the manual Windows Performance Recorder steps.

## Command-line options

Every benchmark accepts:

| Flag | Meaning | Default |
| --- | --- | --- |
| `--reps N` | Measured samples per variant | 7 (3 to 5 for slow benchmarks) |
| `--warmup N` | Discarded samples before measuring | 1 |
| `--min-ms N` | Minimum length of one sample; short kernels repeat inside it | 50 |
| `--only NAME` | Run only the variant named `NAME` | all |

Sizes accept `K`, `M`, and `G` suffixes (binary). Benchmark-specific flags are
listed below.

## What each benchmark shows

The expected trend is a direction, not a number: absolute times depend on the
CPU, memory, power settings, and background load. The "measured" column is
one run on an Intel Core i7-8750H (Coffee Lake: 32 KiB L1d, 256 KiB L2,
9 MiB L3, 64 B lines), macOS, Apple clang 17, `-O2`.

| Benchmark | Variants | Expected trend | Measured (i7-8750H) | Options |
| --- | --- | --- | --- | --- |
| `seq_sum` | sum over 16K / 128K / 4M / 256M | ns per element steps up past each level | 0.058 / 0.066 / 0.096 / 0.234 ns (4.0x) | `--bytes` |
| `strided` | stride 1 to 64, fixed 1M touches | time grows steeply until stride x elem = 64 B, then more slowly | stride 16 is 13x stride 1; 64 is 31x | `--strides`, `--max-stride`, `--touches`, `--elem 4\|8` |
| `matrix_traverse` | row vs column order, N = 2048, 4096 | column several times slower | 12.8x, 17.2x | `--n` |
| `matmul` | naive i-j-k vs tiled T = 16, 32, 64 | tiled faster, gap grows with N | N=1024: 3.0x (T16), 2.3x (T32), 1.7x (T64) | `--n`, `--tile` |
| `list_vs_vector` | vector, in-order list, shuffled list | vector < ordered list << shuffled list | 8M nodes: 0.29 / 1.8 / 109 ns per element | `--n` |
| `aos_soa` | 64 B struct vs separate arrays, `x += vx` | SoA several times faster | 8.8x (in L3), 12.8x (DRAM) | `--n` |
| `false_sharing` | adjacent vs padded atomic counters | packed much slower | 7.2x (2 threads), 14.8x (4 threads) | `--threads`, `--iters` |
| `spsc_ring` | indices in one line vs separate lines | padded higher throughput (with cached indices) | 1.4x to 2.3x run to run | `--items` |

Notes on reading the results:

- **`seq_sum`.** Sequential reads are the prefetcher's best case, so the
  steps are bandwidth steps, not miss latency. L1 and L2 can come out close:
  L2 bandwidth keeps up with a baseline SSE2 or NEON add loop. For latency per
  level, look at the shuffled list.
- **`strided`.** The time keeps rising past 64 B on x86 because the L2
  adjacent-line prefetcher fetches 128 B pairs and each doubling halves the
  touches per 4 KiB page (more TLB misses, more prefetcher restarts). The knee
  is the change in slope at 64 B.
- **`matmul`.** Both kernels use the same i-j-k order, so the gap is the
  blocking alone. Gains are moderate because a scalar FP-add chain bounds
  both kernels, and power-of-two N maps a tile's column of B onto few cache
  sets, which hurts T = 64 most. Try `--n 1000`.
- **`list_vs_vector`.** All nodes come from one pool, so the layout is fixed by
  the program. A list allocated in order behaves like a slower vector because
  the prefetcher still sees a forward stream; shuffling defeats it.
- **`false_sharing`.** The program prints the padding size and where it came
  from: `std::hardware_destructive_interference_size` when the standard library
  defines it, otherwise 128 on Apple arm64 and 64 elsewhere. If the OS places
  two threads on SMT siblings of one core, the penalty shrinks.
- **`spsc_ring`.** Also runs the textbook ring that re-reads the other side's
  index on every operation (`*_nocache`). There, padding does not help and
  can hurt (0.6x measured): it turns one bouncing line into two. Padding only
  removes false sharing.

## Reading RESULT lines

Each measured variant prints one machine-readable line as soon as it
finishes, then a human-readable table and summary ratios at the end:

```text
RESULT,<bench>,<variant>,<param>,<median_ns>,<ns_per_access>
RESULT,matrix_traverse,col_major,N=2048,59684000,14.2298
```

| Field | Meaning |
| --- | --- |
| `bench` | Executable name (`strided` reports `strided_i32` or `strided_i64`) |
| `variant` | Which implementation ran |
| `param` | Problem size or configuration |
| `median_ns` | Median wall time of **one call** of the kernel, in nanoseconds |
| `ns_per_access` | `median_ns` divided by the logical accesses in one call (elements, touches, multiply-adds, increments per thread, or items) |

The table adds `min_ms`, the fastest sample, which is closest to the
undisturbed hardware cost. A large gap between median and min means the
machine was busy; rerun on an idle machine. `scripts/verify` collects every
RESULT line into `results.csv`.

## How the harness measures

1. **Calibrate.** Time one call and choose a repeat count so one sample lasts
   at least `--min-ms`. This keeps sub-microsecond kernels above timer
   resolution.
2. **Warm up.** Run `--warmup` samples and discard them.
3. **Measure.** Run `--reps` samples; report the median and the minimum.

Results are passed to `bench::do_not_optimize`, an empty `asm volatile` on GCC
and Clang and a volatile store on MSVC, so the optimizer cannot delete the
work. In-place kernels also call `bench::clobber_memory` so their stores stay
observable.
