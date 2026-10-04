#!/bin/sh
# verify-linux.sh: hardware cache counters for each benchmark on Linux.
#
# Usage: scripts/verify-linux.sh [build_dir [results_dir [bench ...]]]
#   Normally called by scripts/verify. Standalone, it defaults to bench/build
#   and a fresh bench/results/linux-<arch>-<date>-counters/ directory.
#
# Two tools, each optional:
#   perf stat   Real PMU counters. Each variant runs alone (--only, or one
#               --strides value) because perf counts the whole process; mixing
#               variants would average away the very difference we want.
#   cachegrind  A cache SIMULATOR, not the hardware. It models I1, D1, and LL
#               (last level) from CPUID by default and ignores prefetchers,
#               other cores, and coherence, so its miss counts show what the
#               access pattern implies, not what this CPU's prefetchers turn
#               it into. The simulated configuration is printed below.
#               Threaded benchmarks (false_sharing, spsc_ring) are skipped:
#               Valgrind serializes threads, so there is no cache-line
#               ping-pong to observe.
#
# Missing tools or blocked permissions print "skipped: ..." and exit 0.
set -u

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
BUILD_DIR=${1:-"$ROOT/bench/build"}
RESULTS=${2:-"$ROOT/bench/results/linux-$(uname -m)-$(date +%Y%m%d-%H%M%S)-counters"}
[ $# -ge 2 ] && shift 2 || shift $#
BENCHES=${*:-"seq_sum strided matrix_traverse matmul list_vs_vector aos_soa false_sharing spsc_ring"}
mkdir -p "$RESULTS"

# One line per measurable unit: "<label>|<args that select it>".
units() {
    case "$1" in
        seq_sum) for v in sum_L1 sum_L2 sum_L3 sum_DRAM; do echo "$v|--only $v"; done ;;
        strided) for s in 1 2 4 8 16 32 64; do echo "stride$s|--strides $s --max-stride 64"; done ;;
        matrix_traverse) for v in row_major col_major; do echo "$v|--only $v"; done ;;
        matmul) for v in naive_ijk tiled_T16 tiled_T32 tiled_T64; do echo "$v|--only $v"; done ;;
        list_vs_vector) for v in vector list_ordered list_shuffled; do echo "$v|--only $v"; done ;;
        aos_soa) for v in aos soa; do echo "$v|--only $v"; done ;;
        false_sharing) for v in packed padded; do echo "$v|--only $v"; done ;;
        spsc_ring) for v in packed padded packed_nocache padded_nocache; do echo "$v|--only $v"; done ;;
    esac
}

# Smaller problem sizes for cachegrind, which runs 20x-100x slower than native.
cachegrind_args() {
    case "$1" in
        seq_sum) echo "--bytes 16K,128K,4M,64M" ;;
        strided) echo "--touches 262144" ;;
        matrix_traverse) echo "--n 2048" ;;
        matmul) echo "--n 256" ;;
        list_vs_vector) echo "--n 1048576" ;;
        aos_soa) echo "--n 1048576" ;;
        *) echo "" ;;
    esac
}

find_bin() {
    for cand in "$BUILD_DIR/$1" "$BUILD_DIR/Release/$1"; do
        [ -x "$cand" ] && { echo "$cand"; return 0; }
    done
    return 1
}

# ---------------------------------------------------------------------------
# perf stat
# ---------------------------------------------------------------------------
run_perf() {
    if ! command -v perf >/dev/null 2>&1; then
        echo "skipped: perf not found (install linux-tools-\$(uname -r) or your distro's perf package)"
        return 0
    fi

    # Keep only events this CPU and kernel expose. Generic names such as
    # LLC-loads are missing on many AMD parts and inside most VMs.
    events=""
    for ev in cycles instructions L1-dcache-loads L1-dcache-load-misses LLC-loads LLC-load-misses; do
        out=$(perf stat -x, -e "$ev" -- true 2>&1) || out="<not supported>"
        case "$out" in
            *"not supported"* | *"not counted"* | *"event syntax error"* | *"Error"*)
                echo "perf: event $ev not available here, skipping it" ;;
            *) events="${events:+$events,}$ev" ;;
        esac
    done
    if [ -z "$events" ]; then
        paranoid=$(cat /proc/sys/kernel/perf_event_paranoid 2>/dev/null || echo "?")
        echo "skipped: perf found but no usable events (perf_event_paranoid=$paranoid)"
        case $paranoid in
            2 | 3 | 4) echo "  try: sudo sysctl kernel.perf_event_paranoid=1" ;;
            *) echo "  the CPU does not expose hardware counters here (common in VMs); cachegrind still runs" ;;
        esac
        return 0
    fi
    echo "== perf stat events: $events"

    mkdir -p "$RESULTS/perf"
    for b in $BENCHES; do
        bin=$(find_bin "$b") || { echo "perf: $b binary not found, skipping"; continue; }
        units "$b" | while IFS='|' read -r label args; do
            echo "-- perf $b/$label"
            # shellcheck disable=SC2086  # args is intentionally word-split
            perf stat -x, -o "$RESULTS/perf/$b-$label.csv" -e "$events" -- \
                "$bin" $args --reps 3 >"$RESULTS/perf/$b-$label.out" 2>&1 ||
                echo "perf: $b/$label failed (see $RESULTS/perf/$b-$label.out)"
            # Print counter value and name; perf's CSV is value,unit,event,...
            grep -v '^#' "$RESULTS/perf/$b-$label.csv" 2>/dev/null |
                awk -F, 'NF >= 3 && $1 != "" { printf "   %-24s %s\n", $3, $1 }'
        done
    done
}

# ---------------------------------------------------------------------------
# cachegrind
# ---------------------------------------------------------------------------
run_cachegrind() {
    if ! command -v valgrind >/dev/null 2>&1; then
        echo "skipped: valgrind not found (cachegrind simulation not run)"
        return 0
    fi
    mkdir -p "$RESULTS/cachegrind"
    # The per-unit loop runs in a pipeline subshell, so a marker file (not a
    # shell variable) records that the simulated config was already printed.
    config_marker="$RESULTS/cachegrind/.config_printed"
    rm -f "$config_marker"
    for b in $BENCHES; do
        case "$b" in
            false_sharing | spsc_ring)
                echo "cachegrind: skipping $b (Valgrind serializes threads; no coherence traffic to simulate)"
                continue ;;
        esac
        bin=$(find_bin "$b") || { echo "cachegrind: $b binary not found, skipping"; continue; }
        small=$(cachegrind_args "$b")
        units "$b" | while IFS='|' read -r label args; do
            log="$RESULTS/cachegrind/$b-$label.log"
            echo "-- cachegrind $b/$label"
            # -v makes cachegrind report the cache geometry it simulates.
            # shellcheck disable=SC2086
            valgrind -v --tool=cachegrind --cache-sim=yes \
                --cachegrind-out-file="$RESULTS/cachegrind/$b-$label.out" \
                "$bin" $small $args --reps 1 --warmup 0 --min-ms 0 \
                >"$RESULTS/cachegrind/$b-$label.txt" 2>"$log" ||
                echo "cachegrind: $b/$label failed (see $log)"
            if [ ! -f "$config_marker" ]; then
                # Lines such as "Cache configuration used: ... D1: 32768 B, 8-way, 64 B lines".
                echo "   simulated cache config (not your real CPU unless it matches):"
                grep -i -E 'cache configuration|^==[0-9]+== *(I1|D1|LL|L2|L3)|warning: .*cache' "$log" |
                    sed 's/^/   /' || echo "   (not reported; cachegrind auto-detects via CPUID; override with --D1=size,assoc,line --LL=...)"
                : >"$config_marker"
            fi
            grep -E 'D1  *misses|LLd misses|D1  miss rate|LLd miss rate|D   refs' "$log" | sed 's/^/   /'
        done
    done
}

run_perf
run_cachegrind
echo "== counter outputs saved to $RESULTS"
exit 0
