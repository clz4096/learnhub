// harness.hpp: a deliberately small timing harness shared by every benchmark.
//
// Why not Google Benchmark: these programs are teaching artifacts. A student
// should be able to read the whole measurement path in one sitting, and the
// build must work on any C++20 toolchain with no third-party download.
//
// Method, per variant:
//   1. Calibrate: time one call (doubling to a batch if one call reads 0 ns),
//      then pick `inner` calls per sample so each sample lasts at least
//      --min-ms. This keeps steady_clock resolution and loop overhead
//      negligible for microsecond-scale kernels (an L1-sized sum).
//   2. Warm up: run --warmup samples and discard them (page faults, cache and
//      TLB warmup, CPU frequency ramp).
//   3. Measure: run --reps samples; report the median (robust to one-off
//      interrupts) and the min (closest to the undisturbed hardware cost).
//
// Output: one machine-readable line per result, printed as soon as it exists,
//   RESULT,<bench>,<variant>,<param>,<median_ns>,<ns_per_access>
// where median_ns is the median time of ONE call of the kernel, followed by a
// human-readable table at the end.
//
// Flags every benchmark accepts: --reps N, --warmup N, --min-ms N, and
// --only <variant> (run one variant, for per-variant hardware counters).
#pragma once

#include <algorithm>
#include <atomic>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <new>
#include <string>
#include <string_view>
#include <type_traits>
#include <utility>
#include <vector>

namespace bench {

// ---------------------------------------------------------------------------
// Defeating dead-code elimination.
//
// The kernels compute a value nobody reads. Without a sink, -O2 is entitled to
// delete the whole loop. GCC and Clang (including clang-cl) accept an empty
// asm statement that claims to read `value`; this costs zero instructions and
// pins the computation. MSVC has no x64 inline asm, so it falls back to a store
// into a volatile object, which the compiler must perform.
// ---------------------------------------------------------------------------
#if defined(__GNUC__) || defined(__clang__)
template <class T>
inline void do_not_optimize(T const& value) {
    asm volatile("" : : "r,m"(value) : "memory");
}
#else
namespace detail {
inline volatile std::uintptr_t g_sink = 0;
}  // namespace detail
template <class T>
inline void do_not_optimize(T const& value) {
    if constexpr (std::is_trivially_copyable_v<T> && sizeof(T) <= sizeof(std::uintptr_t)) {
        std::uintptr_t bits = 0;
        std::memcpy(&bits, &value, sizeof(T));
        detail::g_sink = bits;
    } else {
        detail::g_sink = reinterpret_cast<std::uintptr_t>(&value);
    }
    std::atomic_signal_fence(std::memory_order_seq_cst);
}
#endif

// Forces the compiler to assume all memory may have been read or written.
// Used after in-place kernels (matmul, x += vx) whose output is a buffer:
// once the buffer's address has escaped through do_not_optimize, this makes
// the stores observable, so they cannot be sunk or dropped.
inline void clobber_memory() {
#if defined(__GNUC__) || defined(__clang__)
    asm volatile("" : : : "memory");
#else
    std::atomic_signal_fence(std::memory_order_seq_cst);
#endif
}

// ---------------------------------------------------------------------------
// Cache-line size used for padding.
//
// The standard constant is the right answer when the library provides it. When
// it does not, fall back to known line sizes: 64 B on x86 and most arm64, and
// 128 B on Apple arm64 (M-series L2 lines are 128 B, so 64 B padding can still
// share a line at that level).
// ---------------------------------------------------------------------------
#if defined(__cpp_lib_hardware_interference_size)
inline constexpr std::size_t kDestructiveSize = std::hardware_destructive_interference_size;
inline constexpr const char* kDestructiveSource = "std::hardware_destructive_interference_size";
#elif defined(__aarch64__) && defined(__APPLE__)
inline constexpr std::size_t kDestructiveSize = 128;
inline constexpr const char* kDestructiveSource = "fallback: Apple arm64 (128)";
#else
inline constexpr std::size_t kDestructiveSize = 64;
inline constexpr const char* kDestructiveSource = "fallback: 64";
#endif

// ---------------------------------------------------------------------------
// Command line: --name value or --name=value. Sizes accept K/M/G (binary).
// ---------------------------------------------------------------------------
class Cli {
public:
    Cli(int argc, char** argv) : args_(argv + 1, argv + argc) {}

    bool has(std::string_view name) const {
        for (auto const& a : args_)
            if (a == name) return true;
        return false;
    }

    std::size_t size(std::string_view name, std::size_t fallback) const {
        auto v = raw(name);
        return v.empty() ? fallback : parse_size(v);
    }

    std::vector<std::size_t> sizes(std::string_view name, std::vector<std::size_t> fallback) const {
        auto v = raw(name);
        if (v.empty()) return fallback;
        std::vector<std::size_t> out;
        std::size_t start = 0;
        while (start <= v.size()) {
            auto comma = v.find(',', start);
            if (comma == std::string::npos) comma = v.size();
            if (comma > start) out.push_back(parse_size(v.substr(start, comma - start)));
            start = comma + 1;
        }
        return out;
    }

    std::string str(std::string_view name) const { return raw(name); }

    static std::size_t parse_size(std::string const& s) {
        char* end = nullptr;
        const unsigned long long n = std::strtoull(s.c_str(), &end, 10);
        if (end == s.c_str()) die("bad number: " + s);
        std::size_t mult = 1;
        switch (*end) {
            case '\0': break;
            case 'k': case 'K': mult = std::size_t{1} << 10; break;
            case 'm': case 'M': mult = std::size_t{1} << 20; break;
            case 'g': case 'G': mult = std::size_t{1} << 30; break;
            default: die("bad size suffix: " + s);
        }
        return static_cast<std::size_t>(n) * mult;
    }

    [[noreturn]] static void die(std::string const& msg) {
        std::fprintf(stderr, "error: %s\n", msg.c_str());
        std::exit(2);
    }

private:
    std::string raw(std::string_view name) const {
        for (std::size_t i = 0; i < args_.size(); ++i) {
            std::string_view a = args_[i];
            if (a == name) {
                if (i + 1 >= args_.size()) die("missing value for " + std::string(name));
                return args_[i + 1];
            }
            if (a.size() > name.size() && a.substr(0, name.size()) == name && a[name.size()] == '=')
                return std::string(a.substr(name.size() + 1));
        }
        return {};
    }

    std::vector<std::string> args_;
};

// ---------------------------------------------------------------------------
// Measurement.
// ---------------------------------------------------------------------------
struct Config {
    int warmup = 1;
    int reps = 7;
    double min_sample_ms = 50.0;
    // --only <variant>: run just that variant. Hardware-counter tools
    // (perf stat, xctrace, VTune) count the whole process, so this is how the
    // verify scripts attribute counters to one variant.
    std::string only;

    // Common flags every benchmark accepts. `default_reps` lets slow
    // benchmarks (matmul, false sharing) pick a smaller default.
    static Config from(Cli const& cli, int default_reps = 7, int default_warmup = 1) {
        Config c;
        c.reps = static_cast<int>(cli.size("--reps", static_cast<std::size_t>(default_reps)));
        c.warmup = static_cast<int>(cli.size("--warmup", static_cast<std::size_t>(default_warmup)));
        c.min_sample_ms = static_cast<double>(cli.size("--min-ms", 50));
        c.only = cli.str("--only");
        if (c.reps < 1) c.reps = 1;
        return c;
    }
};

struct Timing {
    double median_ns = 0;  // per call
    double min_ns = 0;     // per call
};

using Clock = std::chrono::steady_clock;

template <class Fn>
double time_calls_ns(Fn& fn, std::size_t calls) {
    const auto t0 = Clock::now();
    for (std::size_t i = 0; i < calls; ++i) fn();
    const auto t1 = Clock::now();
    return std::chrono::duration<double, std::nano>(t1 - t0).count() / static_cast<double>(calls);
}

// Runs `fn` per the method described at the top of the file. `fn` takes no
// arguments; it must feed its result to do_not_optimize itself.
template <class Fn>
Timing measure(Config const& cfg, Fn&& fn) {
    const double target_ns = cfg.min_sample_ms * 1e6;
    double first_ns = time_calls_ns(fn, 1);
    // A call shorter than one clock tick reads 0 ns, which would leave
    // `inner` at 1 and every sample at 0. Double the batch until it takes
    // measurable time; the cap bounds a clock that never advances.
    constexpr std::size_t kMaxProbeCalls = std::size_t{1} << 24;
    std::size_t probe = 1;
    while (first_ns <= 0 && target_ns > 0 && probe < kMaxProbeCalls) {
        probe *= 2;
        first_ns = time_calls_ns(fn, probe);
    }
    std::size_t inner = probe;
    if (first_ns > 0 && first_ns < target_ns)
        inner = std::max(inner, static_cast<std::size_t>(target_ns / first_ns) + 1);

    for (int i = 0; i < cfg.warmup; ++i) time_calls_ns(fn, inner);

    std::vector<double> samples;
    samples.reserve(static_cast<std::size_t>(cfg.reps));
    for (int i = 0; i < cfg.reps; ++i) samples.push_back(time_calls_ns(fn, inner));

    std::sort(samples.begin(), samples.end());
    const std::size_t n = samples.size();
    Timing t;
    t.min_ns = samples.front();
    t.median_ns = (n % 2 == 1) ? samples[n / 2] : 0.5 * (samples[n / 2 - 1] + samples[n / 2]);
    return t;
}

// ---------------------------------------------------------------------------
// Reporting.
// ---------------------------------------------------------------------------
inline std::string human_bytes(std::size_t b) {
    char buf[32];
    if (b >= (std::size_t{1} << 30) && b % (std::size_t{1} << 30) == 0)
        std::snprintf(buf, sizeof buf, "%zuG", b >> 30);
    else if (b >= (std::size_t{1} << 20) && b % (std::size_t{1} << 20) == 0)
        std::snprintf(buf, sizeof buf, "%zuM", b >> 20);
    else if (b >= (std::size_t{1} << 10) && b % (std::size_t{1} << 10) == 0)
        std::snprintf(buf, sizeof buf, "%zuK", b >> 10);
    else
        std::snprintf(buf, sizeof buf, "%zu", b);
    return buf;
}

class Reporter {
public:
    Reporter(std::string bench, Config cfg) : bench_(std::move(bench)), cfg_(std::move(cfg)) {
        std::printf("# bench: %s\n", bench_.c_str());
#if defined(__clang__)
        std::printf("# compiler: clang %s\n", __clang_version__);
#elif defined(__GNUC__)
        std::printf("# compiler: gcc %s\n", __VERSION__);
#elif defined(_MSC_VER)
        std::printf("# compiler: msvc %d\n", _MSC_VER);
#endif
#if defined(NDEBUG)
        std::printf("# build: optimized (NDEBUG)\n");
#else
        std::printf("# build: WARNING: NDEBUG not set; is this a Debug build?\n");
#endif
        std::printf("# reps=%d warmup=%d min_sample_ms=%.0f%s%s\n", cfg_.reps, cfg_.warmup,
                    cfg_.min_sample_ms, cfg_.only.empty() ? "" : " only=", cfg_.only.c_str());
        std::printf("# format: RESULT,bench,variant,param,median_ns,ns_per_access\n");
        std::fflush(stdout);
    }

    // Measures `fn` as `variant` and records it. `accesses` is the number of
    // logical accesses (elements touched, increments, items) in ONE call; it
    // turns call time into ns/access. A variant excluded by --only is not run
    // and returns a zero Timing.
    template <class Fn>
    Timing run(std::string const& variant, std::string const& param, double accesses, Fn&& fn) {
        if (!cfg_.only.empty() && variant != cfg_.only) return {};
        const Timing t = measure(cfg_, std::forward<Fn>(fn));
        const double per = t.median_ns / accesses;
        std::printf("RESULT,%s,%s,%s,%.0f,%.4f\n", bench_.c_str(), variant.c_str(), param.c_str(),
                    t.median_ns, per);
        std::fflush(stdout);
        rows_.push_back({variant, param, t, per});
        return t;
    }

    // Free-form summary line (ratios, speedups) printed after the table.
    // Ratios need every variant, so notes are dropped under --only.
    void note(std::string line) {
        if (cfg_.only.empty()) notes_.push_back(std::move(line));
    }

    void print_table() const {
        std::printf("\n%-22s %-14s %14s %14s %14s\n", "variant", "param", "median_ms", "min_ms",
                    "ns/access");
        for (auto const& r : rows_)
            std::printf("%-22s %-14s %14.3f %14.3f %14.4f\n", r.variant.c_str(), r.param.c_str(),
                        r.t.median_ns / 1e6, r.t.min_ns / 1e6, r.per);
        if (!notes_.empty()) std::printf("\n");
        for (auto const& n : notes_) std::printf("%s\n", n.c_str());
        std::fflush(stdout);
    }

private:
    struct Row {
        std::string variant;
        std::string param;
        Timing t;
        double per;
    };
    std::string bench_;
    Config cfg_;
    std::vector<Row> rows_;
    std::vector<std::string> notes_;
};

template <class... Args>
std::string fmt(char const* f, Args... args) {
    char buf[256];
    std::snprintf(buf, sizeof buf, f, args...);
    return buf;
}

}  // namespace bench
