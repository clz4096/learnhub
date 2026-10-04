#!/bin/sh
# verify-macos.sh: hardware cache counters on macOS through Instruments.
#
# Usage: scripts/verify-macos.sh [build_dir [results_dir [bench ...]]]
#   Normally called by scripts/verify. Standalone, it defaults to bench/build
#   and a fresh bench/results/macos-<arch>-<date>-counters/ directory.
#
# Tool: xctrace, the command-line front end of Instruments. It ships only with
# full Xcode; the Command Line Tools package does not include it. If
# `xcrun --find xctrace` fails, this script prints "skipped" and exits 0.
#
# Per benchmark variant it runs
#   xcrun xctrace record --template 'CPU Counters' --output <x>.trace \
#       --launch -- <bin> --only <variant> --reps 3
#   xcrun xctrace export --input <x>.trace --toc            (table of contents)
#   xcrun xctrace export --input <x>.trace --xpath '...'    (each counter table)
# and leaves the .trace bundles next to the XML so you can open them in
# Instruments.app for the graphical view.
#
# Choosing the counters (do this once, in Instruments.app):
#   The stock "CPU Counters" template does not necessarily record cache events.
#   Open Instruments -> choose the "CPU Counters" template -> select the
#   CPU Counters instrument -> configure (the recording-options / gear panel)
#   -> add events -> File > Save as Template. Then point this script at it:
#     MACOS_COUNTERS_TEMPLATE=/path/to/Cache.tracetemplate scripts/verify
#   Event names differ by chip and macOS version; pick from the list
#   Instruments shows for YOUR machine. Starting points:
#     Apple Silicon (M1 and later):
#       L1D_CACHE_MISS_LD, L1D_CACHE_MISS_ST   L1 data misses (loads, stores)
#       L1D_TLB_MISS                            data TLB misses
#       L2 / system-level-cache (SLC) misses:   names vary by generation;
#                                               verify in Instruments -> CPU
#                                               Counters -> configure
#     Intel Macs (Skylake / Coffee Lake era):
#       L1D.REPLACEMENT                         L1 data lines brought in
#       LONGEST_LAT_CACHE.MISS                  last-level cache misses
#                                               (architectural event)
#       MEM_LOAD_RETIRED.L3_MISS                retired loads that missed L3
#       Spelling in the Instruments picker may differ slightly (for example
#       dots vs underscores); verify in Instruments -> CPU Counters -> configure.
#
# If recording fails with a permission or "cannot access PMU" error, run one
# recording from Instruments.app first so macOS can prompt for access.
set -u

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
BUILD_DIR=${1:-"$ROOT/bench/build"}
RESULTS_ARG=${2:-}
[ $# -ge 2 ] && shift 2 || shift $#
BENCHES=${*:-"seq_sum strided matrix_traverse matmul list_vs_vector aos_soa false_sharing spsc_ring"}
TEMPLATE=${MACOS_COUNTERS_TEMPLATE:-"CPU Counters"}

# Single-config generators put binaries in the build dir; multi-config ones
# (Xcode) in a Release/ subdirectory.
find_bin() {
    for cand in "$BUILD_DIR/$1" "$BUILD_DIR/Release/$1"; do
        [ -x "$cand" ] && { echo "$cand"; return 0; }
    done
    return 1
}

# Under Rosetta 2, uname -m says x86_64 on an Apple Silicon chip. The chip is
# what the counters measure, so report arm64 events; label the results by the
# architecture the binaries were actually built for.
CHIP=$(uname -m)
LABEL=$CHIP
if [ "$(sysctl -n sysctl.proc_translated 2>/dev/null || echo 0)" = 1 ]; then
    CHIP=arm64
    LABEL=x86_64-rosetta
    for b in $BENCHES; do
        bin=$(find_bin "$b") || continue
        case " $(lipo -archs "$bin" 2>/dev/null) " in
            *" arm64 "*) LABEL=arm64 ;;
        esac
        break
    done
    echo "warning: this shell runs under Rosetta 2 on Apple Silicon"
    if [ "$LABEL" = x86_64-rosetta ]; then
        echo "warning: binaries are x86_64 and run translated; counters reflect Rosetta code (rebuild with scripts/verify)"
    fi
fi
RESULTS=${RESULTS_ARG:-"$ROOT/bench/results/macos-$LABEL-$(date +%Y%m%d-%H%M%S)-counters"}

if ! xcrun --find xctrace >/dev/null 2>&1; then
    echo "skipped: xctrace not found (install full Xcode; Command Line Tools alone do not include it)"
    exit 0
fi

case "$CHIP" in
    arm64) echo "chip: Apple Silicon. Suggested events: L1D_CACHE_MISS_LD, L1D_CACHE_MISS_ST, L1D_TLB_MISS (verify names in Instruments)" ;;
    x86_64) echo "chip: Intel. Suggested events: L1D.REPLACEMENT, LONGEST_LAT_CACHE.MISS, MEM_LOAD_RETIRED.L3_MISS (verify names in Instruments)" ;;
esac
echo "template: $TEMPLATE"
if [ "$TEMPLATE" = "CPU Counters" ]; then
    echo "note: using the stock template; set MACOS_COUNTERS_TEMPLATE to a saved template with cache events selected"
fi

# Same unit table as verify-linux.sh: each variant runs alone so the
# process-wide counters belong to one access pattern.
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

OUT="$RESULTS/xctrace"
mkdir -p "$OUT"
for b in $BENCHES; do
    bin=$(find_bin "$b") || { echo "xctrace: $b binary not found, skipping"; continue; }
    units "$b" | while IFS='|' read -r label args; do
        trace="$OUT/$b-$label.trace"
        rm -rf "$trace"
        echo "-- xctrace $b/$label"
        # shellcheck disable=SC2086  # args is intentionally word-split
        if ! xcrun xctrace record --template "$TEMPLATE" --output "$trace" \
            --target-stdout "$OUT/$b-$label.txt" --launch -- "$bin" $args --reps 3 \
            >"$OUT/$b-$label.record.log" 2>&1; then
            echo "xctrace: record failed for $b/$label (see $OUT/$b-$label.record.log)"
            continue
        fi
        xcrun xctrace export --input "$trace" --toc >"$OUT/$b-$label.toc.xml" 2>/dev/null || {
            echo "xctrace: export --toc failed for $b/$label"
            continue
        }
        # Table schema names vary across Xcode versions, so export every
        # table whose schema mentions counters rather than hard-coding one.
        grep -o 'schema="[^"]*"' "$OUT/$b-$label.toc.xml" | sed 's/schema="//; s/"$//' | sort -u |
            grep -i -E 'counter|pmc|pmi' | while read -r schema; do
                xcrun xctrace export --input "$trace" \
                    --xpath "/trace-toc/run[@number=\"1\"]/data/table[@schema=\"$schema\"]" \
                    >"$OUT/$b-$label.$schema.xml" 2>/dev/null &&
                    echo "   exported table $schema"
            done
    done
done
echo "== xctrace outputs saved to $OUT"
exit 0
