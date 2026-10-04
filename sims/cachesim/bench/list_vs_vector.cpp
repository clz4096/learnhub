// list_vs_vector: contiguous array vs pointer chasing through a linked list.
//
// Measures: ns per element to sum N ints stored three ways:
//   vector:        std::vector<int>, contiguous.
//   list_ordered:  singly linked list; node k links to node k+1 in memory, so
//                  the chase walks addresses forward.
//   list_shuffled: the same nodes, linked in a random permutation, so each
//                  ->next lands on an unpredictable line (and often page).
//
// Nodes come from one contiguous pool so the layout is set by this program,
// not by the allocator; real std::list nodes freshly allocated in a loop
// usually look like list_ordered, and drift toward list_shuffled as the heap
// fragments.
//
// Expected trend: vector < list_ordered << list_shuffled. The ordered list
// pays for a serial load-to-load dependency and a 4x larger footprint, but
// the prefetcher still sees a forward stream. The shuffled list defeats the
// prefetcher, and every node beyond L3 costs close to a full DRAM latency
// (~80-120 ns), often 100x-500x the vector.
//
// Defaults: N = 64K (1 MiB of nodes, beyond L2), 1M (16 MiB, beyond L3),
// 8M (128 MiB). Override with --n.
#include "harness.hpp"

#include <numeric>
#include <random>
#include <vector>

namespace {

struct Node {
    Node* next;
    int value;
};

long long sum_vector(std::vector<int> const& v) {
    long long s = 0;
    for (int x : v) s += x;
    return s;
}

long long sum_list(Node const* head) {
    long long s = 0;
    for (Node const* p = head; p != nullptr; p = p->next) s += p->value;
    return s;
}

// Links pool nodes in the order given by `order`; returns the head.
Node* link(std::vector<Node>& pool, std::vector<std::size_t> const& order) {
    for (std::size_t k = 0; k + 1 < order.size(); ++k) pool[order[k]].next = &pool[order[k + 1]];
    pool[order.back()].next = nullptr;
    return &pool[order.front()];
}

}  // namespace

int main(int argc, char** argv) {
    bench::Cli cli(argc, argv);
    auto const cfg = bench::Config::from(cli, 5);
    auto const ns = cli.sizes("--n", {std::size_t{1} << 16, std::size_t{1} << 20, std::size_t{1} << 23});
    for (auto n : ns)
        if (n == 0) bench::Cli::die("--n values must be at least 1");

    bench::Reporter rep("list_vs_vector", cfg);
    std::mt19937_64 rng(42);  // fixed seed: identical layout run to run
    for (auto n : ns) {
        std::vector<int> v(n);
        std::iota(v.begin(), v.end(), 0);

        std::vector<Node> pool(n);
        for (std::size_t k = 0; k < n; ++k) pool[k].value = static_cast<int>(k);
        std::vector<std::size_t> order(n);
        std::iota(order.begin(), order.end(), std::size_t{0});

        const auto elems = static_cast<double>(n);
        const std::string param = bench::fmt("N=%zu", n);

        auto vec = rep.run("vector", param, elems,
                           [&] { bench::do_not_optimize(sum_vector(v)); });

        Node* head = link(pool, order);
        auto ord = rep.run("list_ordered", param, elems,
                           [&] { bench::do_not_optimize(sum_list(head)); });

        std::shuffle(order.begin(), order.end(), rng);
        head = link(pool, order);
        auto shuf = rep.run("list_shuffled", param, elems,
                            [&] { bench::do_not_optimize(sum_list(head)); });

        rep.note(bench::fmt("N=%zu (nodes %s): ordered/vector %.1fx, shuffled/vector %.1fx, "
                            "shuffled/ordered %.1fx",
                            n, bench::human_bytes(n * sizeof(Node)).c_str(),
                            ord.median_ns / vec.median_ns, shuf.median_ns / vec.median_ns,
                            shuf.median_ns / ord.median_ns));
    }
    rep.print_table();
    return 0;
}
