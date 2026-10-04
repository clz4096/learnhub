// false_sharing: per-thread counters packed into one line vs padded apart.
//
// Measures: wall time per increment (wall time / increments done by EACH
// thread) for 2 and 4 threads, each doing relaxed fetch_add on ITS OWN
// std::atomic<uint64_t>. No counter is logically shared.
//   packed: counters are adjacent, 8 B apart, so they share one cache line.
//   padded: each counter is alignas(kDestructiveSize), one line per counter.
//
// Expected trend: packed is several times slower (commonly 3x-20x). Every
// increment needs the line in Modified state in the writer's L1, so the line
// ping-pongs between cores even though no data is shared. Padded counters
// stay in each core's L1 and run at the cost of an uncontended atomic add.
//
// Caveat: thread placement is up to the OS. If two threads land on SMT
// siblings of one core they share an L1 and the packed penalty shrinks.
#include "harness.hpp"

#include <atomic>
#include <cstdint>
#include <memory>
#include <thread>
#include <vector>

namespace {

constexpr std::size_t kMaxThreads = 4;

// The block itself is line-aligned so all counters sit in ONE line; without
// that, a 16 B-aligned heap block could straddle two lines and dilute the effect.
struct alignas(bench::kDestructiveSize) PackedCounters {
    std::atomic<std::uint64_t> c[kMaxThreads];
};

struct alignas(bench::kDestructiveSize) PaddedCounter {
    std::atomic<std::uint64_t> v;
};
struct PaddedCounters {
    PaddedCounter c[kMaxThreads];
};

// Returns a reference to thread t's counter for either layout.
inline std::atomic<std::uint64_t>& counter(PackedCounters& s, std::size_t t) { return s.c[t]; }
inline std::atomic<std::uint64_t>& counter(PaddedCounters& s, std::size_t t) { return s.c[t].v; }

template <class Counters>
void run_threads(Counters& counters, std::size_t threads, std::uint64_t iters) {
    std::atomic<bool> go{false};
    std::vector<std::thread> pool;
    pool.reserve(threads);
    for (std::size_t t = 0; t < threads; ++t) {
        pool.emplace_back([&, t] {
            // Spin until released so all threads start hammering together
            // instead of the first one finishing before the last one starts.
            while (!go.load(std::memory_order_acquire)) {
            }
            auto& mine = counter(counters, t);
            for (std::uint64_t i = 0; i < iters; ++i) mine.fetch_add(1, std::memory_order_relaxed);
        });
    }
    go.store(true, std::memory_order_release);
    for (auto& th : pool) th.join();
}

}  // namespace

int main(int argc, char** argv) {
    bench::Cli cli(argc, argv);
    // Each sample spawns threads and runs for tens to hundreds of ms; a few
    // reps are enough and keep the run short.
    auto const cfg = bench::Config::from(cli, 5);
    const std::uint64_t iters = cli.size("--iters", 20'000'000);
    auto const thread_counts = cli.sizes("--threads", {2, 4});

    bench::Reporter rep("false_sharing", cfg);
    std::printf("# destructive interference size: %zu B (%s)\n", bench::kDestructiveSize,
                bench::kDestructiveSource);
    std::printf("# sizeof(PackedCounters)=%zu, sizeof(PaddedCounters)=%zu, hw threads=%u\n",
                sizeof(PackedCounters), sizeof(PaddedCounters), std::thread::hardware_concurrency());

    for (auto threads : thread_counts) {
        if (threads < 1 || threads > kMaxThreads) bench::Cli::die("--threads values must be 1..4");
        const std::string param = bench::fmt("threads=%zu", threads);
        // Heap-allocated: C++17 aligned new honors the alignas on both types.
        auto packed = std::make_unique<PackedCounters>();
        auto padded = std::make_unique<PaddedCounters>();

        auto p = rep.run("packed", param, static_cast<double>(iters), [&] {
            run_threads(*packed, threads, iters);
            bench::do_not_optimize(packed->c[0].load(std::memory_order_relaxed));
        });
        auto q = rep.run("padded", param, static_cast<double>(iters), [&] {
            run_threads(*padded, threads, iters);
            bench::do_not_optimize(padded->c[0].v.load(std::memory_order_relaxed));
        });
        rep.note(bench::fmt("threads=%zu: packed/padded = %.2fx", threads, p.median_ns / q.median_ns));
    }
    rep.print_table();
    return 0;
}
