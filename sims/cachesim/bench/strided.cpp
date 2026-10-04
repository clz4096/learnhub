// strided: sum touching every stride-th element, for a FIXED number of touches.
//
// Measures: for stride in {1,2,4,8,16,32,64}, the time to perform T touches
// (default T = 1M) of an int32 (or int64 with --elem 8) array, and the same
// number divided by T (ns per element touched).
//
// Expected trend: while stride * sizeof(elem) < 64 B, several touches share
// one cache line, so each doubling of the stride roughly doubles the lines
// fetched and the time. Once stride * sizeof(elem) >= 64 B (stride 16 for
// int32, 8 for int64), every touch costs a whole line, so in the ideal model
// the time flattens: further doubling fetches no more lines per touch. The
// knee at 64 B is the line size made visible.
//
// On real x86 parts the curve bends at 64 B but does not go flat. Past 64 B,
// the L2 adjacent-line prefetcher still pulls the buddy of each 128 B pair
// (wasted bandwidth), and each doubling halves the touches per 4 KiB page, so
// TLB misses and streamer restarts at page boundaries grow per touch. Read the
// result as "steepest growth up to 64 B, then a clearly shallower slope".
// Stride 1 can also look cheaper than the model because it is partly
// compute-bound (one scalar add per element) rather than purely memory-bound.
//
// Why the footprint rotates: T touches at stride 1 span only T*4 B = 4 MiB,
// which would sit in L3 after the first call and measure the wrong level. Each
// call therefore walks a different T*stride window of one large buffer
// (T * 64 * sizeof(elem) bytes), so every stride is measured cold from DRAM.
// The buffer is sized from --max-stride (default 64), not from the strides
// actually run, so a single-stride run (the counter scripts pass one
// --strides value each) rotates through the same footprint as the full sweep.
#include "harness.hpp"

#include <cstdint>
#include <vector>

namespace {

template <class Elem>
std::int64_t strided_sum(Elem const* a, std::size_t touches, std::size_t stride) {
    std::int64_t s = 0;
    for (std::size_t i = 0; i < touches * stride; i += stride) s += a[i];
    return s;
}

template <class Elem>
void run(bench::Cli const& cli, bench::Config const& cfg) {
    const std::size_t touches = cli.size("--touches", std::size_t{1} << 20);
    auto const strides = cli.sizes("--strides", {1, 2, 4, 8, 16, 32, 64});
    std::size_t max_stride = cli.size("--max-stride", 64);
    if (max_stride == 0) bench::Cli::die("--max-stride must be at least 1");
    for (auto s : strides) max_stride = std::max(max_stride, s);

    const std::size_t buf_elems = touches * max_stride;
    std::vector<Elem> buf(buf_elems, Elem{1});

    bench::Reporter rep(sizeof(Elem) == 4 ? "strided_i32" : "strided_i64", cfg);
    std::printf("# touches per call: %zu, buffer: %s\n", touches,
                bench::human_bytes(buf_elems * sizeof(Elem)).c_str());

    double base = 0;
    std::size_t base_stride = 0;
    for (auto stride : strides) {
        const std::size_t window = touches * stride;
        std::size_t offset = 0;
        const std::size_t step_bytes = stride * sizeof(Elem);
        auto t = rep.run("stride", bench::fmt("%zu(%zuB)", stride, step_bytes),
                         static_cast<double>(touches), [&] {
            bench::do_not_optimize(strided_sum(buf.data() + offset, touches, stride));
            offset += window;
            if (offset + window > buf_elems) offset = 0;
        });
        if (base == 0) {
            base = t.median_ns;
            base_stride = stride;
        }
        rep.note(bench::fmt("stride %2zu (%3zu B step): %8.3f ms for %zu touches, %5.2fx stride %zu%s",
                            stride, step_bytes, t.median_ns / 1e6, touches, t.median_ns / base,
                            base_stride, step_bytes >= 64 ? "  <- one line per touch" : ""));
    }
    rep.print_table();
}

}  // namespace

int main(int argc, char** argv) {
    bench::Cli cli(argc, argv);
    auto const cfg = bench::Config::from(cli);
    const std::size_t elem = cli.size("--elem", 4);
    if (elem == 8)
        run<std::int64_t>(cli, cfg);
    else if (elem == 4)
        run<std::int32_t>(cli, cfg);
    else
        bench::Cli::die("--elem must be 4 or 8");
    return 0;
}
