// seq_sum: sequential sum over arrays sized for each level of the hierarchy.
//
// Measures: ns per element for a straight-line sum over a uint32 array whose
// footprint fits L1, L2, L3, or exceeds L3 (DRAM).
//
// Expected trend: ns/element steps UP as the footprint leaves each level.
// Sequential access is the hardware prefetcher's best case, so the steps are
// bandwidth steps (L1 > L2 > L3 > DRAM bandwidth), not full miss latencies;
// expect roughly 2x to 6x between the L1 and DRAM rows, not 100x.
//
// Default sizes target a typical laptop (32-48 KiB L1d, 256 KiB-2 MiB L2,
// 6-36 MiB L3). Override with --bytes 16K,128K,4M,256M to match your chip.
#include "harness.hpp"

#include <cstdint>
#include <numeric>
#include <vector>

namespace {

// The accumulator is uint32 (wraps, well defined) rather than int64 on
// purpose: widening every element to 64 bits costs extra SIMD work, which on
// a baseline SSE2 build made the L1 and L2 rows compute-bound and identical.
// A cheaper add per byte lets the memory level, not the ALU, set the pace.
std::uint32_t sum(std::vector<std::uint32_t> const& a) {
    std::uint32_t s = 0;
    for (std::size_t i = 0; i < a.size(); ++i) s += a[i];
    return s;
}

char const* level_name(std::size_t i, std::size_t n) {
    // Labels match the default --bytes list; with a custom list they are just
    // ordinal tags.
    static char const* const names[] = {"L1", "L2", "L3", "DRAM"};
    return (n == 4 && i < 4) ? names[i] : "size";
}

}  // namespace

int main(int argc, char** argv) {
    bench::Cli cli(argc, argv);
    auto const cfg = bench::Config::from(cli);
    auto const bytes_list = cli.sizes("--bytes", {16u << 10, 128u << 10, 4u << 20, 256u << 20});

    bench::Reporter rep("seq_sum", cfg);
    double first = 0;
    double last = 0;
    for (std::size_t i = 0; i < bytes_list.size(); ++i) {
        const std::size_t n = bytes_list[i] / sizeof(std::uint32_t);
        std::vector<std::uint32_t> a(n);
        std::iota(a.begin(), a.end(), 0u);  // also faults every page in

        const std::string param = bench::human_bytes(bytes_list[i]);
        auto t = rep.run(std::string("sum_") + level_name(i, bytes_list.size()), param,
                         static_cast<double>(n), [&] { bench::do_not_optimize(sum(a)); });
        const double per = t.median_ns / static_cast<double>(n);
        if (i == 0) first = per;
        last = per;
    }
    if (first > 0)
        rep.note(bench::fmt("largest/smallest ns-per-element ratio: %.2fx", last / first));
    rep.print_table();
    return 0;
}
