// aos_soa: array of structs vs struct of arrays, updating one field pair.
//
// Measures: ns per element for `x += vx` over N particles stored as
//   aos: std::vector<Particle>, Particle is 64 bytes (one cache line);
//   soa: separate arrays per field; the kernel reads x and vx only.
//
// Expected trend: AoS drags a whole 64 B line through the hierarchy to use
// 8 B of it; SoA uses every byte it fetches (and vectorizes cleanly). Beyond
// L3 the AoS loop moves ~8x the bytes, so expect SoA to be several times
// faster (often 5x-15x: the byte ratio, plus SoA's SIMD loop issues fewer
// instructions per element). When both fit in L1/L2 the gap shrinks toward
// the SIMD advantage alone.
//
// Defaults: N = 64K (AoS 4 MiB, in L3) and 4M (AoS 256 MiB, DRAM). --n overrides.
#include "harness.hpp"

#include <vector>

namespace {

struct Particle {
    float x, y, z;
    float vx, vy, vz;
    int id;
    char pad[36];  // rounds the struct to 64 B, a typical "fat" game/physics record
};
static_assert(sizeof(Particle) == 64, "Particle should fill exactly one 64 B line");

struct Particles {
    std::vector<float> x, y, z, vx, vy, vz;
    std::vector<int> id;
    explicit Particles(std::size_t n) : x(n), y(n), z(n), vx(n), vy(n), vz(n), id(n) {}
};

void update_aos(std::vector<Particle>& ps) {
    for (auto& p : ps) p.x += p.vx;
}

void update_soa(Particles& ps) {
    const std::size_t n = ps.x.size();
    float* x = ps.x.data();
    float const* vx = ps.vx.data();
    for (std::size_t i = 0; i < n; ++i) x[i] += vx[i];
}

}  // namespace

int main(int argc, char** argv) {
    bench::Cli cli(argc, argv);
    auto const cfg = bench::Config::from(cli);
    auto const ns = cli.sizes("--n", {std::size_t{1} << 16, std::size_t{1} << 22});

    bench::Reporter rep("aos_soa", cfg);
    for (auto n : ns) {
        std::vector<Particle> aos(n);
        Particles soa(n);
        for (std::size_t i = 0; i < n; ++i) {
            // vx is tiny so repeated calls never overflow x into inf.
            aos[i] = Particle{0, 0, 0, 1e-7f, 0, 0, static_cast<int>(i), {}};
            soa.vx[i] = 1e-7f;
            soa.id[i] = static_cast<int>(i);
        }

        const auto elems = static_cast<double>(n);
        const std::string param = bench::fmt("N=%zu", n);
        auto a = rep.run("aos", param, elems, [&] {
            update_aos(aos);
            bench::do_not_optimize(aos.data());
            bench::clobber_memory();
        });
        auto s = rep.run("soa", param, elems, [&] {
            update_soa(soa);
            bench::do_not_optimize(soa.x.data());
            bench::clobber_memory();
        });
        rep.note(bench::fmt("N=%zu (AoS %s, SoA x+vx %s): aos/soa = %.2fx", n,
                            bench::human_bytes(n * sizeof(Particle)).c_str(),
                            bench::human_bytes(n * 2 * sizeof(float)).c_str(),
                            a.median_ns / s.median_ns));
    }
    rep.print_table();
    return 0;
}
