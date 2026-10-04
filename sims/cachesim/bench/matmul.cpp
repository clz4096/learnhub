// matmul: naive i-j-k vs tiled (blocked) i-j-k matrix multiply, C = A * B.
//
// Measures: ns per multiply-add (N^3 per call) for N in {256, 512, 1024} and
// tile sizes {16, 32, 64}; prints tiled speedup over naive per N.
//
// Both variants use the SAME i-j-k order and the same scalar inner product,
// so the only difference is the loop blocking. That isolates the cache effect:
//   naive: the inner k loop walks a column of B with stride N*8 bytes. One
//          row of C needs all N lines of a B column; once B (N*N*8 bytes)
//          outgrows the caches, every B access misses.
//   tiled: work on T x T blocks. The B block (T*T*8 = 8 KiB at T=32, 32 KiB at
//          T=64) stays cache-resident while it is reused T times.
//
// Expected trend: tiled beats naive, and naive's ns per multiply-add grows
// with N as B falls out of L2 and then L3 (N=1024: 8 MiB per matrix).
// Measured speedups are moderate (about 1.5x-3x), for two reasons worth
// knowing:
//   * Both kernels reduce into one scalar `s`, a serial chain of FP adds
//     (about 4 cycles each). That latency floor bounds how fast ANY i-j-k
//     kernel can go, and out-of-order execution overlaps much of naive's B
//     miss latency with it (the B loads are independent of each other).
//   * N and T are powers of two. A T-row column slice of B has stride N*8
//     bytes, which maps all T lines onto very few L1/L2 sets; at T=64 they
//     conflict-miss and much of the tiling benefit disappears. Smaller tiles
//     (16, 32) or a non-power-of-two N (--n 1000) show the cleaner win.
//
// A loop interchange (i-k-j) would also fix the B access and enable SIMD; it
// is deliberately left out so the comparison stays "same work, blocked".
#include "harness.hpp"

#include <cmath>
#include <vector>

namespace {

using Matrix = std::vector<double>;  // row-major, N x N

void matmul_naive(Matrix const& a, Matrix const& b, Matrix& c, std::size_t n) {
    for (std::size_t i = 0; i < n; ++i)
        for (std::size_t j = 0; j < n; ++j) {
            double s = 0;
            for (std::size_t k = 0; k < n; ++k) s += a[i * n + k] * b[k * n + j];
            c[i * n + j] = s;
        }
}

void matmul_tiled(Matrix const& a, Matrix const& b, Matrix& c, std::size_t n, std::size_t t) {
    std::fill(c.begin(), c.end(), 0.0);
    for (std::size_t ii = 0; ii < n; ii += t)
        for (std::size_t jj = 0; jj < n; jj += t)
            for (std::size_t kk = 0; kk < n; kk += t) {
                const std::size_t i_end = std::min(ii + t, n);
                const std::size_t j_end = std::min(jj + t, n);
                const std::size_t k_end = std::min(kk + t, n);
                for (std::size_t i = ii; i < i_end; ++i)
                    for (std::size_t j = jj; j < j_end; ++j) {
                        double s = c[i * n + j];
                        for (std::size_t k = kk; k < k_end; ++k) s += a[i * n + k] * b[k * n + j];
                        c[i * n + j] = s;
                    }
            }
}

// This tiling happens to keep each C element's k order, so results usually
// match exactly; a relative check still tolerates reordered variants (other
// loop orders, compilers that contract to FMA) while catching a wrong index.
double max_rel_diff(Matrix const& x, Matrix const& y) {
    double worst = 0;
    for (std::size_t i = 0; i < x.size(); ++i) {
        const double denom = std::max(std::abs(x[i]), 1e-12);
        worst = std::max(worst, std::abs(x[i] - y[i]) / denom);
    }
    return worst;
}

}  // namespace

int main(int argc, char** argv) {
    bench::Cli cli(argc, argv);
    // One naive N=1024 call takes seconds; few reps keep the run short and
    // the calibrated inner count is 1 anyway at that size.
    auto const cfg = bench::Config::from(cli, 3);
    auto const ns = cli.sizes("--n", {256, 512, 1024});
    auto const tiles = cli.sizes("--tile", {16, 32, 64});
    for (auto t : tiles)
        if (t == 0) bench::Cli::die("--tile values must be at least 1");

    bench::Reporter rep("matmul", cfg);
    for (auto n : ns) {
        Matrix a(n * n), b(n * n), c_naive(n * n), c_tiled(n * n);
        for (std::size_t k = 0; k < n * n; ++k) {
            a[k] = static_cast<double>((k * 7) % 13) - 6.0;
            b[k] = static_cast<double>((k * 5) % 11) - 5.0;
        }
        const auto fmas = static_cast<double>(n) * static_cast<double>(n) * static_cast<double>(n);
        const std::string param = bench::fmt("N=%zu", n);

        auto naive = rep.run("naive_ijk", param, fmas, [&] {
            matmul_naive(a, b, c_naive, n);
            bench::do_not_optimize(c_naive.data());
            bench::clobber_memory();
        });
        for (auto t : tiles) {
            auto tiled = rep.run(bench::fmt("tiled_T%zu", t), param, fmas, [&] {
                matmul_tiled(a, b, c_tiled, n, t);
                bench::do_not_optimize(c_tiled.data());
                bench::clobber_memory();
            });
            const double err = max_rel_diff(c_naive, c_tiled);
            rep.note(bench::fmt("N=%4zu T=%2zu: tiled speedup %.2fx (max rel diff %.1e)%s", n, t,
                                naive.median_ns / tiled.median_ns, err,
                                err > 1e-9 ? "  MISMATCH" : ""));
        }
    }
    rep.print_table();
    return 0;
}
