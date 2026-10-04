// matrix_traverse: row-major vs column-major traversal of an N x N double matrix.
//
// Measures: ns per element for summing a row-major matrix in two loop orders.
//   row:    for i: for j: s += m[i*N + j]   (consecutive addresses)
//   column: for j: for i: s += m[i*N + j]   (stride N*8 bytes)
//
// Expected trend: column order is several times slower (often 5x-20x) once
// the matrix exceeds L2/L3. Each column step lands on a different cache line,
// so a line is fetched for 8 bytes of use, and with N*8 >= 4 KiB every step is
// also a new page (TLB pressure). Power-of-two N additionally maps a column
// onto few cache sets; try --n 2000 to separate that effect from the stride.
//
// Defaults: N = 2048 (32 MiB) and 4096 (128 MiB), both beyond a laptop L3.
#include "harness.hpp"

#include <vector>

namespace {

double sum_row_major(std::vector<double> const& m, std::size_t n) {
    double s = 0;
    for (std::size_t i = 0; i < n; ++i)
        for (std::size_t j = 0; j < n; ++j) s += m[i * n + j];
    return s;
}

double sum_col_major(std::vector<double> const& m, std::size_t n) {
    double s = 0;
    for (std::size_t j = 0; j < n; ++j)
        for (std::size_t i = 0; i < n; ++i) s += m[i * n + j];
    return s;
}

}  // namespace

int main(int argc, char** argv) {
    bench::Cli cli(argc, argv);
    auto const cfg = bench::Config::from(cli, 5);
    auto const ns = cli.sizes("--n", {2048, 4096});

    bench::Reporter rep("matrix_traverse", cfg);
    for (auto n : ns) {
        std::vector<double> m(n * n);
        for (std::size_t k = 0; k < m.size(); ++k) m[k] = static_cast<double>(k & 1023);

        const auto elems = static_cast<double>(n * n);
        const std::string param = bench::fmt("N=%zu", n);
        auto row = rep.run("row_major", param, elems,
                           [&] { bench::do_not_optimize(sum_row_major(m, n)); });
        auto col = rep.run("col_major", param, elems,
                           [&] { bench::do_not_optimize(sum_col_major(m, n)); });
        rep.note(bench::fmt("N=%zu (%s): column/row = %.2fx", n,
                            bench::human_bytes(n * n * sizeof(double)).c_str(),
                            col.median_ns / row.median_ns));
    }
    rep.print_table();
    return 0;
}
