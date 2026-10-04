// spsc_ring: single-producer single-consumer ring, index placement compared.
//
// Measures: throughput (items/s; RESULT reports ns per item) for one producer
// thread pushing N uint64 items and one consumer thread popping them, with
//   packed: head and tail atomics adjacent, in the same cache line;
//   padded: head and tail each alignas(kDestructiveSize), separate lines.
// The slot array is line-aligned in both layouts, so only the index placement
// differs.
//
// Expected trend: padded has higher throughput (1.4x-2.3x across runs on an
// i7-8750H; this one is the noisiest benchmark, so compare several runs). Each
// side caches the other side's index in a local variable and re-reads the
// shared atomic only when the ring looks full (producer) or empty (consumer).
// With that, the producer's per-item traffic is a write to `tail` and the
// consumer's a write to `head`. Packed, those two writes hit ONE line, so it
// ping-pongs between cores on every item: false sharing. Padded, each line
// stays with its writer until the other side actually needs a fresh value.
//
// The *_nocache rows run the textbook Lamport ring, which re-reads the
// remote index on every operation. That is true sharing of both indices on
// every item, and padding then gives no gain or even a loss (measured ~0.5x):
// two lines bounce per item instead of one. Padding fixes false sharing
// only; it cannot fix a protocol that reads shared state on every operation.
#include "harness.hpp"

#include <atomic>
#include <cstdint>
#include <memory>
#include <thread>

namespace {

// Power of two so `index & kMask` wraps. Deliberately large (512 KiB of
// slots): a small ring spends its life exactly full or exactly empty, where
// producer and consumer move in lockstep and every item forces a refresh of
// the remote index plus a slot-line transfer. That true sharing then swamps
// the false sharing this benchmark is about (measured on an i7-8750H: 1K slots
// gave padded/packed ~0.95-1.2x, 64K slots 1.4x-2.3x). A deep ring lets each side
// run ahead and amortize refreshes, as a real queue under bursty load does.
constexpr std::size_t kCapacity = std::size_t{1} << 16;
constexpr std::size_t kMask = kCapacity - 1;

struct PackedIndices {
    std::atomic<std::size_t> head{0};  // next slot to pop; written by consumer
    std::atomic<std::size_t> tail{0};  // next slot to push; written by producer
};

struct PaddedIndices {
    alignas(bench::kDestructiveSize) std::atomic<std::size_t> head{0};
    alignas(bench::kDestructiveSize) std::atomic<std::size_t> tail{0};
};

template <class Indices>
struct alignas(bench::kDestructiveSize) Ring {
    Indices idx;
    alignas(bench::kDestructiveSize) std::uint64_t slots[kCapacity];
};

// Indices run freely and wrap as unsigned; tail - head is the fill level.
// Each side is the only writer of its own index, so it keeps that index in a
// local and never re-loads it from shared memory.
template <bool kCacheRemote, class R>
void produce(R& ring, std::uint64_t n) {
    std::size_t tail = 0;
    std::size_t head_seen = 0;  // possibly stale copy of ring.idx.head
    for (std::uint64_t v = 1; v <= n; ++v) {
        if constexpr (kCacheRemote) {
            while (tail - head_seen == kCapacity)  // looks full: refresh
                head_seen = ring.idx.head.load(std::memory_order_acquire);
        } else {
            while (tail - ring.idx.head.load(std::memory_order_acquire) == kCapacity) {
            }
        }
        ring.slots[tail & kMask] = v;
        ring.idx.tail.store(++tail, std::memory_order_release);
    }
}

template <bool kCacheRemote, class R>
std::uint64_t consume(R& ring, std::uint64_t n) {
    std::size_t head = 0;
    std::size_t tail_seen = 0;  // possibly stale copy of ring.idx.tail
    std::uint64_t sum = 0;
    for (std::uint64_t i = 0; i < n; ++i) {
        if constexpr (kCacheRemote) {
            while (head == tail_seen)  // looks empty: refresh
                tail_seen = ring.idx.tail.load(std::memory_order_acquire);
        } else {
            while (head == ring.idx.tail.load(std::memory_order_acquire)) {
            }
        }
        sum += ring.slots[head & kMask];
        ring.idx.head.store(++head, std::memory_order_release);
    }
    return sum;
}

// Pushes 1..n through a fresh ring and returns the consumer's sum.
template <class Indices, bool kCacheRemote>
std::uint64_t transfer(std::uint64_t n) {
    auto ring = std::make_unique<Ring<Indices>>();
    std::uint64_t sum = 0;
    std::thread consumer([&] { sum = consume<kCacheRemote>(*ring, n); });
    std::thread producer([&] { produce<kCacheRemote>(*ring, n); });
    producer.join();
    consumer.join();
    return sum;
}

}  // namespace

int main(int argc, char** argv) {
    bench::Cli cli(argc, argv);
    auto const cfg = bench::Config::from(cli, 5);
    const std::uint64_t items = cli.size("--items", 20'000'000);
    // items * (items + 1) / 2 must fit in uint64 for the checksum to be exact.
    if (items >= (std::uint64_t{1} << 32)) bench::Cli::die("--items must be below 2^32");
    const std::uint64_t expected = items * (items + 1) / 2;

    bench::Reporter rep("spsc_ring", cfg);
    std::printf("# destructive interference size: %zu B (%s)\n", bench::kDestructiveSize,
                bench::kDestructiveSource);
    std::printf("# sizeof(PackedIndices)=%zu, sizeof(PaddedIndices)=%zu, capacity=%zu\n",
                sizeof(PackedIndices), sizeof(PaddedIndices), kCapacity);

    auto check = [&](std::uint64_t got) {
        if (got != expected) bench::Cli::die("ring lost or duplicated items");
        bench::do_not_optimize(got);
    };
    const std::string param = bench::fmt("items=%llu", static_cast<unsigned long long>(items));
    const auto n = static_cast<double>(items);
    auto p = rep.run("packed", param, n, [&] { check(transfer<PackedIndices, true>(items)); });
    auto q = rep.run("padded", param, n, [&] { check(transfer<PaddedIndices, true>(items)); });
    auto pl = rep.run("packed_nocache", param, n,
                      [&] { check(transfer<PackedIndices, false>(items)); });
    auto ql = rep.run("padded_nocache", param, n,
                      [&] { check(transfer<PaddedIndices, false>(items)); });

    auto mips = [&](bench::Timing t) { return n / t.median_ns * 1e3; };
    rep.note(bench::fmt("cached indices: packed %.1f Mitems/s, padded %.1f Mitems/s, padded/packed = %.2fx",
                        mips(p), mips(q), p.median_ns / q.median_ns));
    rep.note(bench::fmt("no cache:       packed %.1f Mitems/s, padded %.1f Mitems/s, padded/packed = %.2fx",
                        mips(pl), mips(ql), pl.median_ns / ql.median_ns));
    rep.print_table();
    return 0;
}
