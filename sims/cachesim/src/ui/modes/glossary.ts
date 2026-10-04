/**
 * Glossary entries, one per TermId. Each has a one-line definition, a short example
 * with numbers from this simulator, and a "see it" link to a lesson or a setup.
 *
 * ANALOGY SET. Reuse these, and only these, in lessons, the glossary, and Explain, so a
 * newcomer meets one picture per idea:
 *
 *   memory (DRAM)     the warehouse across town: holds everything, every trip is slow
 *   cache             a bookcase near your desk that keeps copies of boxes you used lately
 *   cache levels      L1 = the bookcase at your desk, L2 = a bigger one in your room,
 *                     L3 = shared bookcases down the hall, DRAM = the warehouse
 *   cache line        a box of neighboring bytes: you always carry the whole box, never one item
 *   address           an item's catalog number: the low digits say where in the box (offset),
 *                     the middle digits say which shelf (set index), the rest labels the box (tag)
 *   set               the one shelf a box is allowed to go on
 *   way               one slot on that shelf; associativity = slots per shelf
 *   hit / miss        the box is already on your shelf / you must fetch it from farther away
 *   eviction          the shelf is full, so a box goes back to make room
 *   replacement (LRU) which box goes back: the one you touched longest ago
 *   prefetcher        an assistant who fetches the next box before you ask
 *   coherence (MESI)  two people each hold a copy of the same box; before one writes in it,
 *                     the other's copy is thrown away
 *   false sharing     two people write different items in the same box, so the box still
 *                     shuttles between them
 */
import type { TermId } from '@/ui/Term';
import type { Setup } from '@/ui/modes/setup';

export type SeeIt = { lesson: string } | { setup: Setup; label: string };

export interface GlossaryEntry {
  id: TermId;
  term: string;
  aliases?: string[];
  definition: string;
  /** The everyday picture from the analogy set above, for core ideas. */
  analogy?: string;
  example: string;
  see: SeeIt;
}

const TB = 'textbook';

export const GLOSSARY: readonly GlossaryEntry[] = [
  /* ───────── the basics ───────── */
  {
    id: 'cache', term: 'Cache', aliases: ['CPU cache'],
    definition: 'A small, fast memory next to the CPU core that keeps copies of recently used data, so most reads and writes skip the slow trip to main memory.',
    analogy: 'A bookcase near your desk that keeps copies of the boxes you used lately.',
    example: 'On the Textbook preset, finding data in L1d costs 4 cycles; going all the way to DRAM costs 200.',
    see: { lesson: 'spatial-locality' },
  },
  {
    id: 'cache-level', term: 'Cache level', aliases: ['L1', 'L1d', 'L2', 'L3', 'hierarchy', 'cache hierarchy'],
    definition: 'One cache in a chain of caches. L1 is smallest and fastest; each level after it is bigger and slower. A request tries L1 first, then L2, then L3, then DRAM.',
    analogy: 'L1 is the bookcase at your desk, L2 a bigger one in your room, L3 the shared bookcases down the hall, DRAM the warehouse.',
    example: 'Textbook preset: 1 KiB L1d and 8 KiB L2 per core, plus a 64 KiB L3 that both cores share.',
    see: { lesson: 'capacity' },
  },
  {
    id: 'dram', term: 'DRAM', aliases: ['main memory', 'RAM', 'memory'],
    definition: 'Main memory: large but far slower than any cache. A request goes here only when every cache level misses.',
    analogy: 'The warehouse across town: it holds everything, but every trip is slow.',
    example: 'On the Textbook preset a DRAM access costs 200 cycles, 50 times an L1d hit.',
    see: { lesson: 'capacity' },
  },
  {
    id: 'latency', term: 'Latency', aliases: ['cycle', 'cycles', 'clock cycle'],
    definition: 'How long one access waits for its data, counted in CPU clock cycles. The simulator charges each access the latency of the level that answered it.',
    example: 'Textbook latencies: L1d 4 cycles, L2 12, L3 40, DRAM 200.',
    see: { lesson: 'capacity' },
  },
  {
    id: 'address', term: 'Address', aliases: ['byte address', 'memory address', 'hex address'],
    definition: 'The number that names one byte of memory. A pointer in C++ holds an address. The simulator shows addresses in hex (base 16), such as 0x10000044.',
    analogy: 'An item\'s catalog number: part of it says which shelf, part says where in the box.',
    example: 'The sequential sum\'s array starts at 0x10000000, so with 4-byte ints a[17] is at 0x10000044.',
    see: { lesson: 'address-breakdown' },
  },
  {
    id: 'core', term: 'Core', aliases: ['CPU core', 'thread'],
    definition: 'One processor on the CPU chip. In this simulator thread t runs on core t. Each core has private caches (L1, often L2), and the cores share the last-level cache.',
    example: 'The Textbook preset has 2 cores. Each has its own L1d and L2, and both share the L3.',
    see: { lesson: 'false-sharing' },
  },
  {
    id: 'cache-line', term: 'Cache line', aliases: ['line', 'block'],
    definition: 'The fixed-size chunk of memory a cache stores and moves as one unit: 64 bytes on most CPUs and 128 bytes on Apple M1.',
    analogy: 'A box of neighboring bytes: you always carry the whole box, never one item.',
    example: 'Reading one 4-byte int at 0x10000000 brings in 0x10000000 to 0x1000003f, so the next 15 ints hit.',
    see: { lesson: 'spatial-locality' },
  },

  /* ───────── where a line goes ───────── */
  {
    id: 'set', term: 'Set',
    definition: 'A group of slots that a line may occupy. The line\'s address picks exactly one set.',
    analogy: 'The one shelf a box is allowed to go on.',
    example: 'The Textbook L1d has 8 sets, so lines 0, 8, 16, and so on all compete for set 0.',
    see: { lesson: 'conflict' },
  },
  {
    id: 'way', term: 'Way',
    definition: 'One slot within a set. A cache with W ways keeps up to W lines that map to the same set.',
    analogy: 'One slot on a shelf.',
    example: 'The Textbook L1d is 2-way: a third line into a full set evicts one of the two.',
    see: { lesson: 'conflict' },
  },
  {
    id: 'associativity', term: 'Associativity', aliases: ['direct-mapped', 'fully associative', 'set-associative'],
    definition: 'How many ways each set has. Direct-mapped means 1 way; fully associative means one set that holds every line.',
    analogy: 'How many slots each shelf has.',
    example: '1 KiB of 64 B lines is 8 sets when 2-way, and 1 set when 16-way.',
    see: { lesson: 'conflict' },
  },
  {
    id: 'tag', term: 'Tag',
    definition: 'The high bits of an address, stored with each line so the cache can tell apart lines that share a set.',
    analogy: 'The label on a box, since many boxes take turns on the same shelf.',
    example: 'In the Textbook L1d, 0x10000000 and 0x10000200 both land in set 0, with tags 524,288 and 524,289.',
    see: { lesson: 'address-breakdown' },
  },
  {
    id: 'offset', term: 'Offset', aliases: ['byte offset'],
    definition: 'The low bits of an address: which byte within the cache line.',
    analogy: 'Where the item sits inside its box.',
    example: 'With 64 B lines the offset is the low 6 bits, so 0x10000044 has offset 4.',
    see: { lesson: 'address-breakdown' },
  },
  {
    id: 'set-index', term: 'Set index', aliases: ['index'],
    definition: 'The address bits between the offset and the tag that choose the set: (address / line size) mod sets.',
    analogy: 'The part of the catalog number that names the shelf.',
    example: 'With 64 B lines and 8 sets, the index is bits 6 to 8, so 0x10000040 goes to set 1.',
    see: { lesson: 'address-breakdown' },
  },

  /* ───────── hits, misses, and room ───────── */
  {
    id: 'hit', term: 'Hit',
    definition: 'The line is already in the cache, so the access costs only that level\'s latency.',
    analogy: 'The box is already on your shelf.',
    example: 'A Textbook L1d hit costs 4 cycles.',
    see: { lesson: 'spatial-locality' },
  },
  {
    id: 'miss', term: 'Miss',
    definition: 'The line is not in the cache, so the request goes to the next level and the line is filled in on the way back.',
    analogy: 'The box is not on your shelf, so you fetch it from farther away and keep a copy.',
    example: 'On the Textbook preset, a miss in every level goes to DRAM and costs 200 cycles.',
    see: { lesson: 'spatial-locality' },
  },
  {
    id: 'hit-rate', term: 'Hit rate', aliases: ['miss rate'],
    definition: 'Hits divided by lookups at one cache level. The miss rate is 1 minus the hit rate.',
    example: 'One pass over 4,096 ints on the Textbook preset: 3,840 L1d hits of 4,096 lookups, a 93.75% hit rate.',
    see: { lesson: 'spatial-locality' },
  },
  {
    id: 'amat', term: 'AMAT', aliases: ['average memory access time'],
    definition: 'Average memory access time: total memory cycles divided by the number of accesses. Lower is better.',
    analogy: 'Your average trip time per item, counting the quick grabs from your desk and the long trips to the warehouse.',
    example: '15 hits at 4 cycles and 1 miss at 200 cycles average to 16.25 cycles per access.',
    see: { lesson: 'spatial-locality' },
  },
  {
    id: 'eviction', term: 'Eviction',
    definition: 'Removing a line to make room for a new one in a full set. The replacement policy picks which line goes.',
    analogy: 'The shelf is full, so a box goes back to make room.',
    example: 'A third line into a full 2-way LRU set evicts the line used longest ago.',
    see: { lesson: 'capacity' },
  },
  {
    id: 'replacement-policy', term: 'Replacement policy', aliases: ['replacement', 'eviction policy'],
    definition: 'The rule a cache uses to pick which line to evict from a full set. This simulator offers LRU, pseudo-LRU, and random.',
    analogy: 'Your rule for which box goes back when the shelf is full.',
    example: 'Every Textbook cache uses LRU. Change it with the Replacement menu under each cache level.',
    see: { lesson: 'capacity' },
  },
  {
    id: 'lru', term: 'LRU', aliases: ['least recently used'],
    definition: 'Least recently used: on a miss into a full set, evict the line used longest ago.',
    analogy: 'Put back the box you have not touched for the longest time.',
    example: 'A loop slightly larger than an LRU cache hits nothing: each line is evicted just before it comes back.',
    see: { lesson: 'capacity' },
  },
  {
    id: 'pseudo-lru', term: 'Pseudo-LRU', aliases: ['PLRU', 'tree PLRU'],
    definition: 'A cheap stand-in for LRU: a tree of (ways - 1) bits per set points toward a way not used recently.',
    example: 'In a 4-way set, using way 0 turns the tree toward ways 2 and 3.',
    see: { setup: { preset: TB, workload: 'matrix-traverse', params: { N: 16, order: 'col' }, policy: 'plru' }, label: 'Textbook with pseudo-LRU, column walk' },
  },
  {
    id: 'random-replacement', term: 'Random replacement', aliases: ['random'],
    definition: 'On a miss into a full set, evict a random way. Simple, and it avoids LRU\'s worst case on loops a bit larger than the cache.',
    example: 'A 4-pass loop over 128 KiB through a 64 KiB random L3 keeps some lines by luck, where LRU keeps none.',
    see: { setup: { preset: TB, workload: 'seq-sum', params: { N: 32768, passes: 4 }, policy: 'random' }, label: 'Textbook with random replacement, 128 KiB loop' },
  },

  /* ───────── why misses happen ───────── */
  {
    id: 'compulsory-miss', term: 'Compulsory miss', aliases: ['cold miss'],
    definition: 'The first access to a line. No cache size or shape avoids it; only prefetching can hide it.',
    analogy: 'The first time you ever need a box: it cannot be on your shelf yet.',
    example: 'One pass over 4,096 ints has 256 compulsory misses: one per 64 B line.',
    see: { lesson: 'spatial-locality' },
  },
  {
    id: 'capacity-miss', term: 'Capacity miss',
    definition: 'A miss that a fully associative cache of the same size would also take: too many distinct lines came since this one\'s last use.',
    analogy: 'You need more boxes than the whole bookcase holds, so the one you want was sent back.',
    example: 'Looping over 128 KiB through a 64 KiB L3 misses every line on every pass.',
    see: { lesson: 'capacity' },
  },
  {
    id: 'conflict-miss', term: 'Conflict miss',
    definition: 'A miss caused by the set mapping: the cache had room, but too many recent lines mapped to this line\'s set.',
    analogy: 'Your boxes all have to go on the same shelf, while other shelves sit empty.',
    example: 'A 16 × 16 matrix of doubles walked by columns takes 224 conflict misses in the 2-way, 1 KiB Textbook L1d.',
    see: { lesson: 'conflict' },
  },
  {
    id: 'coherence-miss', term: 'Coherence miss',
    definition: 'A miss because another core\'s write invalidated this core\'s copy of the line.',
    analogy: 'Your copy of the box was thrown away because someone else wrote in theirs.',
    example: 'Two packed counters on 2 cores, 256 increments each: 510 coherence misses in L1d.',
    see: { lesson: 'false-sharing' },
  },
  {
    id: 'prefetcher', term: 'Prefetcher', aliases: ['prefetch', 'next-line', 'stride prefetcher', 'degree'],
    definition: 'Hardware that guesses which lines come next and fetches them early. Degree is how many lines ahead. The model\'s prefetchers stop at 4 KiB page boundaries.',
    analogy: 'An assistant who fetches the next box before you ask.',
    example: 'Next-line prefetch cuts a 4,096-int sum from 256 L1d misses to 128.',
    see: { lesson: 'spatial-locality' },
  },

  /* ───────── access patterns ───────── */
  {
    id: 'spatial-locality', term: 'Spatial locality',
    definition: 'Using data that sits close to data you just used. A program with good spatial locality uses most of each line it fetches.',
    analogy: 'Using the other items in the box you just carried over.',
    example: 'Summing 4,096 ints in order misses once per 64 B line: 256 misses and 3,840 hits.',
    see: { lesson: 'spatial-locality' },
  },
  {
    id: 'temporal-locality', term: 'Temporal locality', aliases: ['reuse'],
    definition: 'Using the same data again soon. It pays off only if the data is still cached when you come back to it.',
    analogy: 'Reaching for a box again while it is still on your shelf.',
    example: 'A 1 KiB array summed 4 times on the Textbook preset: after the first pass every read hits, so DRAM serves only 16 reads.',
    see: { lesson: 'capacity' },
  },
  {
    id: 'stride', term: 'Stride', aliases: ['step'],
    definition: 'The distance between one access and the next, in elements or bytes. Stride 1 walks every element; stride 4 reads every fourth.',
    example: 'Stride 16 over 4-byte ints is 64 B, so every read lands on a new line and misses.',
    see: { lesson: 'stride' },
  },
  {
    id: 'row-major', term: 'Row-major order', aliases: ['column-major', 'row order', 'column order'],
    definition: 'How C and C++ lay out a 2D array: each row is contiguous in memory, and the next row follows. Walking down a column jumps a whole row each step.',
    example: 'A 64 × 64 matrix of doubles has 512 B rows, so a column walk moves 512 B per read.',
    see: { lesson: 'row-vs-column' },
  },
  {
    id: 'pointer-chasing', term: 'Pointer chasing', aliases: ['linked list'],
    definition: 'Following pointers where each load\'s address comes from the previous load, as in a linked list. The CPU cannot start the next load early.',
    example: 'Textbook preset: a shuffled list of 16,384 nodes takes 16,345 L1d misses; a vector of 16,384 ints takes 1,024.',
    see: { lesson: 'pointer-chasing' },
  },
  {
    id: 'aos-soa', term: 'AoS and SoA', aliases: ['array of structs', 'struct of arrays'],
    definition: 'Array of structs (AoS) keeps each object\'s fields together. Struct of arrays (SoA) keeps each field in its own array, so a loop over one field fetches only that field.',
    example: 'x += vx over 4,096 particles: 2,048 L1d misses with 32 B structs, 512 with separate arrays.',
    see: { lesson: 'aos-soa' },
  },

  /* ───────── several cores ───────── */
  {
    id: 'mesi', term: 'MESI', aliases: ['coherence protocol', 'cache coherence', 'coherence'],
    definition: 'The protocol that keeps private caches consistent: each core holds a line as Modified, Exclusive, Shared, or Invalid.',
    analogy: 'Two people each hold a copy of the same box. Before one writes in it, the other\'s copy is thrown away.',
    example: 'Core 0 reads a line (E) and writes it (M). Core 1 reads it, and both copies become S.',
    see: { lesson: 'false-sharing' },
  },
  {
    id: 'mesi-modified', term: 'Modified (M)', aliases: ['M state', 'dirty'],
    definition: 'This core has the only copy and has written it; memory is stale until a write-back.',
    example: 'After core 0\'s first write to its counter, core 0 holds the line in M.',
    see: { lesson: 'false-sharing' },
  },
  {
    id: 'mesi-exclusive', term: 'Exclusive (E)', aliases: ['E state'],
    definition: 'This core has the only copy and it matches memory. A write upgrades it to M with no traffic.',
    example: 'Core 0\'s first read of a line no other core holds leaves it in E.',
    see: { lesson: 'false-sharing' },
  },
  {
    id: 'mesi-shared', term: 'Shared (S)', aliases: ['S state'],
    definition: 'Other cores may hold copies too. A write must first invalidate every other copy.',
    example: 'When core 1 reads the line core 0 modified, both copies become S.',
    see: { lesson: 'false-sharing' },
  },
  {
    id: 'mesi-invalid', term: 'Invalid (I)', aliases: ['I state', 'invalidation', 'invalidate'],
    definition: 'The core has no usable copy, so its next access to the line misses. An invalidation is the message that puts a copy in this state.',
    example: 'Core 1\'s write leaves core 0\'s copy invalid, so core 0\'s next read is a coherence miss.',
    see: { lesson: 'false-sharing' },
  },
  {
    id: 'peer-transfer', term: 'Peer transfer', aliases: ['cache-to-cache transfer', 'peer'],
    definition: 'One core\'s cache sends a line straight to another core\'s cache, because it holds the newest copy.',
    example: 'On the Textbook preset a peer transfer costs the L3 latency (40) plus 20 transfer cycles: 60 cycles.',
    see: { lesson: 'false-sharing' },
  },
  {
    id: 'false-sharing', term: 'False sharing',
    definition: 'Cores write different data that happens to share one line, so the line bounces between them anyway.',
    analogy: 'Two people write different items in the same box, so the box still shuttles between them.',
    example: 'Two 8 B counters 8 bytes apart, one per thread: about 14x the cycles of padded counters.',
    see: { lesson: 'false-sharing' },
  },
  {
    id: 'true-sharing', term: 'True sharing',
    definition: 'Cores really pass data through the same bytes, so the line must move between them; padding cannot remove it.',
    analogy: 'Two people really do need the same item, so the box has to travel.',
    example: 'A ring consumer reading the tail index the producer just wrote.',
    see: { lesson: 'spsc-ring' },
  },
  {
    id: 'spsc-ring', term: 'SPSC ring', aliases: ['ring buffer', 'single-producer single-consumer queue'],
    definition: 'A fixed-size circular queue with one producer thread and one consumer thread. The producer advances a tail index; the consumer advances a head index.',
    example: 'The ring lesson passes 256 items from core 0 to core 1 through 16 slots.',
    see: { lesson: 'spsc-ring' },
  },
  {
    id: 'hardware-destructive-interference-size', term: 'std::hardware_destructive_interference_size', aliases: ['alignas(64)', 'padding', 'cache line size constant'],
    definition: 'A C++17 constant in <new>: the minimum spacing that keeps two objects from false sharing, usually 64.',
    example: 'struct alignas(std::hardware_destructive_interference_size) Counter { std::atomic<std::uint64_t> value; };',
    see: { lesson: 'false-sharing' },
  },

  /* ───────── how levels relate ───────── */
  {
    id: 'write-back', term: 'Write-back',
    definition: 'Writes update only the cache and mark the line dirty; memory is updated when the line leaves.',
    example: 'When core 1 reads a line core 0 holds in M, the dirty data is written back to the shared L3.',
    see: { lesson: 'false-sharing' },
  },
  {
    id: 'write-allocate', term: 'Write-allocate',
    definition: 'A write miss first brings the whole line into the cache, then writes into it.',
    example: 'The AoS loop writes p[i].x; a miss there fetches all 64 B of the line before the store.',
    see: { lesson: 'aos-soa' },
  },
  {
    id: 'llc', term: 'Last-level cache (LLC)', aliases: ['LLC', 'system-level cache'],
    definition: 'The biggest, slowest cache before DRAM, usually shared by all cores. Profilers report its misses because each one goes to memory.',
    example: 'The Textbook LLC is the 64 KiB shared L3. The Apple M1 preset models its system-level cache as the LLC.',
    see: { lesson: 'capacity' },
  },
  {
    id: 'inclusive', term: 'Inclusive cache', aliases: ['back-invalidation', 'inclusion'],
    definition: 'An outer cache that holds a copy of every line in the caches inside it; evicting a line there removes the inner copies too.',
    example: 'The Textbook and Coffee Lake L3s are inclusive, as Intel client L3s were.',
    see: { lesson: 'capacity' },
  },
  {
    id: 'non-inclusive', term: 'Non-inclusive cache',
    definition: 'An outer cache filled on misses like an inclusive one, but its evictions leave inner copies alone.',
    example: 'The Raptor Lake preset\'s 36 MB L3 is non-inclusive.',
    see: { setup: { preset: 'intel-raptor-cove', workload: 'seq-sum' }, label: 'Raptor Lake, sequential sum' },
  },
  {
    id: 'victim-cache', term: 'Victim cache', aliases: ['victim', 'exclusive cache'],
    definition: 'An outer cache filled only with lines the inner caches evict.',
    example: 'AMD Zen 4\'s L3 holds what falls out of each core\'s L2; the Zen 4 preset models that.',
    see: { setup: { preset: 'amd-zen4', workload: 'seq-sum' }, label: 'Zen 4, sequential sum' },
  },
  {
    id: 'tlb', term: 'TLB', aliases: ['translation lookaside buffer', 'page walk'],
    definition: 'A small cache of virtual-to-physical page translations; a miss adds a page walk. The simulator does not model it.',
    example: 'VERIFY.md blames TLB misses for strides past 64 B costing more on real hardware than in the model.',
    see: { lesson: 'stride' },
  },
];

const BY_ID = new Map(GLOSSARY.map((e) => [e.id, e]));
export function glossaryEntry(id: string): GlossaryEntry | undefined {
  return BY_ID.get(id as TermId);
}

/** Entries matching `q`, best first: term name, then aliases, then definition text. */
export function searchGlossary(q: string): GlossaryEntry[] {
  const s = q.trim().toLowerCase();
  if (!s) return [...GLOSSARY];
  const score = (e: GlossaryEntry): number => {
    const t = e.term.toLowerCase();
    if (t === s) return 0;
    if (t.startsWith(s)) return 1;
    if (t.includes(s)) return 2;
    if (e.aliases?.some((a) => a.toLowerCase().includes(s))) return 3;
    if (e.definition.toLowerCase().includes(s) || e.example.toLowerCase().includes(s)) return 4;
    return -1;
  };
  return GLOSSARY.map((e) => ({ e, k: score(e) })).filter((x) => x.k >= 0).sort((a, b) => a.k - b.k).map((x) => x.e);
}
