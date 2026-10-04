/**
 * Guided lessons. Each lesson drives the app through setups and playback actions, and
 * every number in its "What you should notice" list comes from a Claim below, so
 * lessons.test.ts can run the claim through the engine. Text and model cannot drift.
 *
 * Writing rules: a newcomer reads each lesson on its own, so every technical term is
 * marked [[id|text]] (a glossary link, see Term.tsx) and glossed in plain words the
 * first time it appears in that lesson. Steps name the button and panel labels the
 * user sees. Analogies come from the set listed at the top of glossary.ts.
 */
import { hex } from '@/engine';
import type { TermId } from '@/ui/Term';
import { fmt, type AccessClaim, type Claim, type Metric, type Setup, type StatClaim } from '@/ui/modes/setup';

export type Action =
  | { kind: 'setup'; setup: Setup }
  | { kind: 'step'; n: number }
  | { kind: 'play' }
  | { kind: 'runToEnd' };

export interface LessonStep {
  text: string;
  /** Run in order by the step's button. Steps without actions are read-only. */
  actions?: Action[];
  /** Button label; defaults from the actions. */
  label?: string;
  /** Phone layout: which tab to show after the actions run. */
  show?: 'view' | 'metrics';
}

export interface Choice {
  text: string;
  correct?: boolean;
  /** Why this answer is right or wrong. */
  why: string;
}

export interface Lesson {
  id: string;
  title: string;
  /** One sentence: why this matters to a C++ programmer. */
  why: string;
  goal: string;
  steps: LessonStep[];
  notice: string[];
  claims: Claim[];
  question: { prompt: string; choices: Choice[] };
  terms: TermId[];
}

const stat = (setup: Setup, metric: Metric, value: number, digits?: number): StatClaim =>
  ({ kind: 'stat', setup, metric, value, ...(digits !== undefined ? { digits } : {}) });
const access = (setup: Setup, index: number, expect: AccessClaim['expect']): AccessClaim =>
  ({ kind: 'access', setup, index, expect });
const n = (v: number) => v.toLocaleString('en-US');

const TB = 'textbook';
const load = (setup: Setup, then?: Action): Action[] => (then ? [{ kind: 'setup', setup }, then] : [{ kind: 'setup', setup }]);
const RUN: Action = { kind: 'runToEnd' };
const step = (k: number): Action => ({ kind: 'step', n: k });

/* ───────────────────────── 1. address breakdown ───────────────────────── */

const s1: Setup = { preset: TB, workload: 'seq-sum', params: { N: 256, passes: 1 }, breakdown: true };
const a1 = {
  first: access(s1, 0, { addr: 0x10000000, set: 0, tag: 524288, offset: 0, servedBy: 'DRAM', cycles: 200, l1d: 'compulsory' }),
  last: access(s1, 15, { addr: 0x1000003c, set: 0, offset: 60, servedBy: 'L1', cycles: 4, l1d: 'hit' }),
  next: access(s1, 16, { addr: 0x10000040, set: 1, tag: 524288, offset: 0, servedBy: 'DRAM', l1d: 'compulsory' }),
  after: access(s1, 17, { addr: 0x10000044, set: 1, tag: 524288, offset: 4, servedBy: 'L1', l1d: 'hit' }),
  misses: stat(s1, 'L1d.misses', 16),
};

const addressBreakdown: Lesson = {
  id: 'address-breakdown',
  title: 'Tag, set, and offset',
  why: 'Every C++ pointer holds an [[address|address]], the number of a byte in memory, and the [[cache|cache]] (a small, fast copy of recently used memory) decides where your data goes from that number alone.',
  goal: 'Split an address the way the cache does, and see which part picks the spot your data must go in.',
  steps: [
    { text: 'Press Load. It picks the Textbook small cache preset and the Sequential array sum workload with Elements (N) = 256 and Passes = 1, and turns on Address breakdown. The program sums 256 ints (4 bytes each) from front to back.', actions: load(s1) },
    { text: 'Press Step to run the first access: one memory read or write by the program. Accesses are numbered from #0. The Current access panel shows that #0 reads address 0x10000000.', actions: [step(1)] },
    { text: 'Look at the L1d row in the Address breakdown panel. [[cache-level|L1d]] is the first and smallest data cache. Its [[cache-line|cache line]], the block of bytes it always moves whole, is 64 B. The low 6 bits are the [[offset|offset]]: which byte inside the line. The next 3 bits are the [[set-index|set index]]: which of L1d\'s 8 [[set|sets]] (groups of slots) the line must go in. Everything above them is the [[tag|tag]]: a label stored with the line, so the cache can tell apart lines that share a set.' },
    { text: 'Press Step 15 to run 15 more reads. In the L1d row, watch the offset climb by 4 each time: one int at a time.', actions: [step(15)] },
    { text: 'Press Step once more and compare the L1d row with the one before.', actions: [step(1)] },
    { text: 'Press Run to end, then find the L1d row under Miss breakdown.', actions: [RUN], show: 'metrics' },
  ],
  notice: [
    `The first read finds nothing and goes all the way to memory. Access #0 reads ${hex(a1.first.expect.addr!)}: L1d set ${a1.first.expect.set}, tag ${n(a1.first.expect.tag!)}, offset ${a1.first.expect.offset}. It is a [[miss|miss]] (the data is not in the cache) in every cache level, L1d and then the bigger L2 and L3, so [[dram|DRAM]], the main memory, answers in ${a1.first.expect.cycles} [[latency|cycles]] (CPU clock ticks).`,
    `Reads inside the same line are cheap. Accesses #1 to #15 stay in that line, so only the offset changes (${a1.last.expect.offset} at #15). Each one is a [[hit|hit]] in L1d (the data is already there) and costs ${a1.last.expect.cycles} cycles.`,
    `The next 64 bytes are a new line. Access #16 reads ${hex(a1.next.expect.addr!)}: offset ${a1.next.expect.offset}, set ${a1.next.expect.set}, same tag. The line is new, so it misses.`,
    `The cache misses once per line, not once per int. After the run, L1d shows ${fmt(a1.misses)} misses of 256 lookups (times L1d was checked): one per 64 B line.`,
  ],
  claims: Object.values(a1),
  question: {
    prompt: `Access #17 reads ${hex(a1.after.expect.addr!)}. Which L1d fields differ from access #16?`,
    choices: [
      { text: 'Only the offset.', correct: true, why: `Right. 0x44 is 4 bytes past 0x40, inside the same 64 B line, so the set (${a1.after.expect.set}) and the tag stay the same, and it hits.` },
      { text: 'The set and the offset.', why: 'The set changes only when the address crosses into the next 64 B line. 0x40 and 0x44 share a line.' },
      { text: 'The tag.', why: 'In this L1d the tag changes only every 512 B (8 sets of 64 B lines). These addresses are 4 bytes apart.' },
      { text: 'None of them.', why: 'The offset is the low 6 bits of the address, and the two addresses differ there by 4.' },
    ],
  },
  terms: ['address', 'cache-line', 'offset', 'set-index', 'tag', 'set'],
};

/* ───────────────────────── 2. spatial locality ───────────────────────── */

const s2: Setup = { preset: TB, workload: 'seq-sum', params: { N: 4096, passes: 1 } };
const s2p: Setup = { ...s2, prefetch: { enabled: true, kind: 'next-line', degree: 1 } };
const c2 = {
  misses: stat(s2, 'L1d.misses', 256),
  hits: stat(s2, 'L1d.hits', 3840),
  compulsory: stat(s2, 'L1d.compulsory', 256),
  amat: stat(s2, 'amat', 16.25, 2),
  pfMisses: stat(s2p, 'L1d.misses', 128),
  pfAmat: stat(s2p, 'amat', 10.13, 2),
};

const spatialLocality: Lesson = {
  id: 'spatial-locality',
  title: 'Hits and spatial locality',
  why: 'A loop that walks memory in order, like a range-for over a std::vector, is fast because of [[spatial-locality|spatial locality]]: it uses the data next to what it just used, and the [[cache|cache]] (a small, fast copy of recent memory) has already brought that data in.',
  goal: 'See why reading an array front to back finds its data in the cache 15 times out of 16, and what a [[prefetcher|prefetcher]] (hardware that fetches data before you ask) adds.',
  steps: [
    { text: 'Press Load. It picks the Textbook small cache preset and the Sequential array sum workload: 4,096 ints, 1 pass, prefetch off.', actions: load(s2) },
    { text: 'Press Play and watch the L1d · core 0 grid in the center. A [[core|core]] is one processor on the chip; core 0 runs this loop. [[cache-level|L1d]] is its first and smallest cache; L2 and L3 are bigger, slower caches behind it. Each row is a [[set|set]] (a group of slots a line may use) and each cell holds one [[cache-line|cache line]]: a 64-byte block that always moves whole, like carrying a whole box instead of one item. You will see one red ✕, a [[miss|miss]] (the data was not there), then green ✓ marks, [[hit|hits]] (it was), on the same cell. Press Pause in the bottom bar when you have seen it.', actions: [{ kind: 'play' }], label: 'Play' },
    { text: 'Press Run to end. Then look at the L1d row under Miss breakdown, and at [[amat|AMAT]] (average memory access time: the average cost of one access) under Totals.', actions: [RUN], show: 'metrics' },
    { text: 'Press Load and run. It turns on the next-line prefetcher with Degree 1 (one line ahead) and runs again.', actions: load(s2p, RUN), show: 'metrics' },
  ],
  notice: [
    `Reading in order means most reads hit. Without prefetch, L1d shows ${fmt(c2.misses)} misses of 4,096 lookups, so ${fmt(c2.hits)} hits. All ${fmt(c2.compulsory)} misses are [[compulsory-miss|compulsory]], the first touch of each line: one per 64 B line, since 16 ints share a line.`,
    `AMAT is ${fmt(c2.amat)} [[latency|cycles]] (CPU clock ticks): 15 hits at 4 cycles plus one 200-cycle trip to [[dram|DRAM]], the main memory, averaged over 16 reads.`,
    `A prefetcher hides half of the misses that are left. With next-line prefetch, L1d misses drop to ${fmt(c2.pfMisses)} and AMAT to ${fmt(c2.pfAmat)} cycles.`,
  ],
  claims: Object.values(c2),
  question: {
    prompt: 'Why does the next-line prefetcher remove only half of the misses here?',
    choices: [
      { text: 'It fetches line + 1 only on an L1d miss. That line then hits and triggers nothing, so line + 2 misses again.', correct: true, why: 'Right. Misses alternate with prefetched lines, so half the lines still miss. A higher degree, or a stride prefetcher (one that follows a fixed step), reaches further ahead.' },
      { text: 'L2 is too small to hold the prefetched lines.', why: 'Prefetches fill L1d directly, and the whole array is only 16 KiB. Size is not the limit.' },
      { text: 'Prefetches stop at every 4 KiB page boundary.', why: 'They do stop there (memory is managed in 4 KiB pages), but that costs one extra miss per 64 lines, not half of them.' },
      { text: 'Prefetching only helps writes.', why: 'This loop only reads. A prefetch helps any access that would otherwise miss.' },
    ],
  },
  terms: ['spatial-locality', 'cache-line', 'hit', 'miss', 'compulsory-miss', 'prefetcher', 'amat'],
};

/* ───────────────────────── 3. stride ───────────────────────── */

const s3 = (stride: number): Setup => ({ preset: TB, workload: 'strided', params: { N: 16384, elem: 'int32', stride } });
const c3 = {
  m1: stat(s3(1), 'L1d.misses', 1024),
  a1: stat(s3(1), 'accesses', 16384),
  amat1: stat(s3(1), 'amat', 16.25, 2),
  cyc1: stat(s3(1), 'cycles', 266240),
  m4: stat(s3(4), 'L1d.misses', 1024),
  a4: stat(s3(4), 'accesses', 4096),
  amat4: stat(s3(4), 'amat', 53, 2),
  cyc4: stat(s3(4), 'cycles', 217088),
  m16: stat(s3(16), 'L1d.misses', 1024),
  a16: stat(s3(16), 'accesses', 1024),
  amat16: stat(s3(16), 'amat', 200, 2),
  m64: stat(s3(64), 'L1d.misses', 256),
  a64: stat(s3(64), 'accesses', 256),
};

const stride: Lesson = {
  id: 'stride',
  title: 'Stride and the 64 B line',
  why: 'Making a loop skip elements does not make it proportionally faster, because memory arrives in the [[cache|cache]] (a small, fast copy of recent memory) in whole [[cache-line|cache lines]], 64-byte blocks; this tells you when touching less data really saves time.',
  goal: 'See that the cache moves whole lines, so skipping elements inside a line saves almost nothing.',
  steps: [
    { text: 'Press Load and run. It picks the Textbook small cache preset and the Strided access workload: 16,384 int32 elements (4 bytes each) with [[stride|Stride]] 1, which reads every element. After the run, note the access count in the bottom bar. Then, under Totals, note L1D misses (reads that [[cache-level|L1d]], the first and smallest cache, could not answer), [[amat|AMAT]] (the average cost of one access), and cycles (CPU clock ticks).', actions: load(s3(1), RUN), show: 'metrics' },
    { text: 'Press Load and run for Stride 4: read every fourth element.', actions: load(s3(4), RUN), show: 'metrics' },
    { text: 'Press Load and run for Stride 16. 16 × 4 B = 64 B, one full line, so each read lands on a new line.', actions: load(s3(16), RUN), show: 'metrics' },
    { text: 'Press Load and run for Stride 64: read one line, then skip three.', actions: load(s3(64), RUN), show: 'metrics' },
  ],
  notice: [
    `Reading every element: stride 1 makes ${fmt(c3.a1)} reads and takes ${fmt(c3.m1)} [[miss|misses]] in [[cache-level|L1d]], the first and smallest cache. A miss means the data was not there; every other read is a [[hit|hit]]. [[amat|AMAT]], the average cost of one access, is ${fmt(c3.amat1)} [[latency|cycles]] (CPU clock ticks).`,
    `A quarter of the reads costs almost as much. Stride 4 makes ${fmt(c3.a4)} reads but still takes ${fmt(c3.m4)} misses, and AMAT rises to ${fmt(c3.amat4)}. Total cycles barely move: ${fmt(c3.cyc1)} to ${fmt(c3.cyc4)}.`,
    `Once the stride reaches a full line, every read misses. Stride 16 makes ${fmt(c3.a16)} reads and takes ${fmt(c3.m16)} misses, so AMAT is ${fmt(c3.amat16)}: the cost of a trip to [[dram|DRAM]], the main memory.`,
    `Only skipping whole lines saves work. Stride 64 still misses on every read, but it skips 3 lines in 4, so it makes only ${fmt(c3.a64)} reads and takes ${fmt(c3.m64)} misses.`,
  ],
  claims: Object.values(c3),
  question: {
    prompt: 'Stride 4 does a quarter of the reads of stride 1. Why are total cycles only about 18% lower?',
    choices: [
      { text: `Each line is still fetched once, so the ${n(c3.m1.value)} DRAM misses, which dominate the cost, do not change.`, correct: true, why: 'Right. Misses cost 200 cycles and hits 4. Skipping hits inside a line saves little; only skipping whole lines (stride 16 and up) cuts misses.' },
      { text: 'Strided loads are slower instructions.', why: 'The model charges a load by the level that serves it, not by its stride. A hit costs 4 cycles at any stride.' },
      { text: 'The prefetcher (hardware that fetches ahead) is off at stride 4.', why: 'It is off in every run of this lesson, so it cannot explain the difference.' },
      { text: 'The array is larger at stride 4.', why: 'N stays at 16,384 ints; only the loop step changes.' },
    ],
  },
  terms: ['stride', 'cache-line', 'compulsory-miss', 'amat'],
};

/* ───────────────────────── 4. row vs column ───────────────────────── */

const s4 = (order: 'row' | 'col'): Setup => ({ preset: TB, workload: 'matrix-traverse', params: { N: 64, order } });
const c4 = {
  rowMisses: stat(s4('row'), 'L1d.misses', 512),
  rowAmat: stat(s4('row'), 'amat', 28.5, 2),
  rowCycles: stat(s4('row'), 'cycles', 116736),
  col1: access(s4('col'), 1, { set: 0, l1d: 'compulsory' }),
  colMisses: stat(s4('col'), 'L1d.misses', 4096),
  colCapacity: stat(s4('col'), 'L1d.capacity', 3584),
  colL3: stat(s4('col'), 'servedBy.L3', 3584),
  colL2Conflict: stat(s4('col'), 'L2.conflict', 3584),
  colAmat: stat(s4('col'), 'amat', 60, 2),
  colCycles: stat(s4('col'), 'cycles', 245760),
};

const rowVsColumn: Lesson = {
  id: 'row-vs-column',
  title: 'Row order vs column order',
  why: 'C++ stores a 2D array one row after another, so just swapping your two nested loops can change the run time several times over with the same arithmetic, because of what the [[cache|cache]] (a small, fast copy of recent memory) can hold.',
  goal: 'See why walking a [[row-major|row-major]] matrix (rows stored back to back) down its columns uses only one double from each [[cache-line|cache line]] (64-byte block) it fetches.',
  steps: [
    { text: 'Press Load and run. It picks the Textbook small cache preset and the Row-major vs column-major traversal workload: a 64 × 64 matrix of doubles (8 bytes each), Loop order Row-major. Then it runs to the end.', actions: load(s4('row'), RUN), show: 'metrics' },
    { text: 'Press Load and step 8. It switches Loop order to Column-major and runs 8 reads. Watch the L1d · core 0 grid ([[cache-level|L1d]] is core 0\'s first and smallest cache): each read lands on a new line in [[set|set]] 0 (the top row, the only place those lines may go). One matrix row is 512 B, exactly 8 sets × 64 B, so going down a column keeps landing on the same set.', actions: load(s4('col'), step(8)), show: 'view' },
    { text: 'Press Run to end. Then compare Miss breakdown with the first run, and check the L3 column of the Per core table. L2 and L3 are the bigger, slower caches behind L1d.', actions: [RUN], show: 'metrics' },
  ],
  notice: [
    `Row order uses every double in a line before moving on. It takes ${fmt(c4.rowMisses)} [[miss|misses]] in [[cache-level|L1d]], the first and smallest cache, for 4,096 reads: one per 8 doubles. [[amat|AMAT]], the average cost of one access, is ${fmt(c4.rowAmat)} [[latency|cycles]].`,
    `Column order misses on every read. It takes ${fmt(c4.colMisses)} L1d misses, and AMAT is ${fmt(c4.colAmat)}: ${fmt(c4.colCycles)} cycles against ${fmt(c4.rowCycles)}, about 2.1x.`,
    `L1d is simply too small for a column. It labels ${fmt(c4.colCapacity)} of the misses [[capacity-miss|capacity misses]] (more data than the whole cache holds): one column touches 64 lines (4 KiB), and L1d holds 1 KiB. L3 answers those ${fmt(c4.colL3)} reads.`,
    `L2 has room but crowds a few sets. L2 calls the same ${fmt(c4.colL2Conflict)} misses [[conflict-miss|conflict misses]] (too many lines for one set while other sets sit empty): 4 KiB fits its 8 KiB, but the lines map to only 4 of its 32 sets. The next lesson is about that.`,
  ],
  claims: Object.values(c4),
  question: {
    prompt: 'Why does column order miss in L1d even on the second column, which reuses the very same lines?',
    choices: [
      { text: 'Between two uses of a line, the walk touches 63 other lines, and L1d holds only 16.', correct: true, why: 'Right. By the time column 1 comes back to a line, LRU (evict the line used longest ago) has already thrown it out. Row order uses all 8 doubles of a line while it is still cached.' },
      { text: 'Column order writes the matrix, so the lines are dirty (changed and not yet saved).', why: 'The loop only reads. No line is ever dirty here.' },
      { text: 'Each double straddles two lines.', why: 'Doubles are 8 B and aligned, so each sits inside one line.' },
      { text: 'L1d evicts lines at random.', why: 'The Textbook L1d uses LRU. Random replacement would keep a few lines alive by luck, not fewer.' },
    ],
  },
  terms: ['row-major', 'capacity-miss', 'conflict-miss', 'lru'],
};

/* ───────────────────────── 5. conflict misses ───────────────────────── */

const s5: Setup = { preset: TB, workload: 'matrix-traverse', params: { N: 16, order: 'col' } };
const s5full: Setup = { ...s5, l1dWays: 16 };
const s5four: Setup = { ...s5, l1dWays: 4 };
const c5 = {
  misses: stat(s5, 'L1d.misses', 256),
  conflict: stat(s5, 'L1d.conflict', 224),
  amat: stat(s5, 'amat', 35.5, 2),
  fullMisses: stat(s5full, 'L1d.misses', 32),
  fullConflict: stat(s5full, 'L1d.conflict', 0),
  fullAmat: stat(s5full, 'amat', 28.5, 2),
  fourConflict: stat(s5four, 'L1d.conflict', 224),
};

const conflict: Lesson = {
  id: 'conflict',
  title: 'Conflict misses and associativity',
  why: 'Data laid out at power-of-two spacing, such as rows of 1,024 or 4,096 elements, can pile into a few spots in the [[cache|cache]] (a small, fast copy of recent memory) and run slowly even when it is small; padding each row a little is the usual fix.',
  goal: 'See a power-of-two [[stride|stride]] (the step between reads) pile into a few [[set|sets]] while the rest of the cache sits empty. A set is the group of slots a [[cache-line|line]] (a 64-byte block of memory) is allowed to use, like the one shelf a box must go on.',
  steps: [
    { text: 'Press Load and run. It loads a 16 × 16 matrix of doubles on the Textbook small cache preset with Loop order Column-major, and runs to the end.', actions: load(s5, RUN), show: 'metrics' },
    { text: 'Click Explain at the top of the page. Then click the number 0 at the left edge of the top row of the L1d · core 0 grid ([[cache-level|L1d]] is core 0\'s first and smallest cache). That is set 0, and the Explain panel lists the lines that compete for it. Each set here has 2 [[way|ways]] (slots). While the walk is in columns 0 to 7, sets 1, 3, 5, and 7 sit idle.' },
    { text: 'Press Load and run. It makes L1d [[associativity|fully associative]]: 16 ways in 1 set, so any line can use any slot, with the same 1 KiB. Then it runs again.', actions: load(s5full, RUN), show: 'metrics' },
  ],
  notice: [
    'A column walk uses only half of L1d. The matrix is 2 KiB. A row is 128 B, or two lines, so one column touches 16 lines. Columns 0 to 7 use only L1d sets 0, 2, 4, and 6. Columns 8 to 15 use only the odd sets.',
    `The cache has room, just not in the right sets. The 2-way L1d takes ${fmt(c5.misses)} [[miss|misses]] in 256 reads, and ${fmt(c5.conflict)} are [[conflict-miss|conflict misses]]. 16 lines would fit in its 16 slots, but the column can reach only 8 (4 sets × 2 ways). [[amat|AMAT]], the average cost of one access, is ${fmt(c5.amat)} cycles.`,
    `Letting any line use any slot removes them. A 16-way L1d of the same size takes ${fmt(c5.fullMisses)} misses, ${fmt(c5.fullConflict)} of them conflict, and AMAT drops to ${fmt(c5.fullAmat)}.`,
  ],
  claims: Object.values(c5),
  question: {
    prompt: 'You set L1d to 4 ways, still 1 KiB. What happens to the conflict misses?',
    choices: [
      { text: `Still ${n(c5.fourConflict.value)}. There are now 4 sets and the column uses sets 0 and 2: still 8 slots for 16 lines.`, correct: true, why: 'Right. The ways per set doubled but the number of sets halved, and a stride of 2 lines still reaches only half the sets.' },
      { text: 'They all disappear, because associativity doubled.', why: 'Only full associativity (or a stride that spreads over all sets) removes them here. Each set holds 4 lines now, but only 2 sets are used.' },
      { text: 'They become capacity misses.', why: 'A capacity miss is one that a fully associative cache of the same size would also take. 16 lines fit in 1 KiB, so these stay conflict misses.' },
      { text: 'They double, because there are half as many sets.', why: 'Half the sets, but each holds twice the lines; the reachable slots stay at 8.' },
    ],
  },
  terms: ['set', 'way', 'associativity', 'conflict-miss', 'stride'],
};

/* ───────────────────────── 6. capacity and the hierarchy ───────────────────────── */

const s6 = (N: number): Setup => ({ preset: TB, workload: 'seq-sum', params: { N, passes: 4 } });
const c6 = {
  dram1: stat(s6(256), 'servedBy.DRAM', 16),
  amat1: stat(s6(256), 'amat', 7.06, 2),
  cap4: stat(s6(1024), 'L1d.capacity', 192),
  l2: stat(s6(1024), 'servedBy.L2', 192),
  amat4: stat(s6(1024), 'amat', 7.44, 2),
  l3: stat(s6(8192), 'servedBy.L3', 1536),
  amat32: stat(s6(8192), 'amat', 8.75, 2),
  dram128: stat(s6(32768), 'servedBy.DRAM', 8192),
  amat128: stat(s6(32768), 'amat', 16.25, 2),
};

const capacity: Lesson = {
  id: 'capacity',
  title: 'Capacity and the hierarchy',
  why: 'How much data a loop touches, and which [[cache-level|cache level]] (one of the chain of ever larger, slower [[cache|caches]]) it fits in, often sets its speed more than the code inside the loop.',
  goal: 'Grow an array past each cache level (L1d, then L2, then L3, each bigger and slower than the last) and watch which level answers the reads.',
  steps: [
    { text: 'Press Load and run. It picks the Textbook small cache preset and the Sequential array sum workload with 4 passes (it sums the array 4 times) and N = 256 ints (1 KiB, the size of L1d).', actions: load(s6(256), RUN), show: 'metrics' },
    { text: 'Press Load and run for N = 1,024 (4 KiB, fits L2). Then check the Per core table: its L1, L2, L3, and DRAM columns count which level answered each access.', actions: load(s6(1024), RUN), show: 'metrics' },
    { text: 'Press Load and run for N = 8,192 (32 KiB, fits L3).', actions: load(s6(8192), RUN), show: 'metrics' },
    { text: 'Press Load and run for N = 32,768 (128 KiB, fits nothing).', actions: load(s6(32768), RUN), show: 'metrics' },
  ],
  notice: [
    `If the array fits in L1d, only the first pass is slow. 1 KiB fits L1d, so after the first pass every read is a [[hit|hit]] (the data is already cached). [[dram|DRAM]], the main memory, serves ${fmt(c6.dram1)} reads, one per [[cache-line|cache line]] (64-byte block). [[amat|AMAT]], the average cost of one access, is ${fmt(c6.amat1)} [[latency|cycles]].`,
    `A bigger array falls back to the next, slower level. 4 KiB fits L2: L1d has ${fmt(c6.cap4)} [[capacity-miss|capacity misses]] (the data no longer fits in L1d), and L2 serves ${fmt(c6.l2)}. AMAT is ${fmt(c6.amat4)}.`,
    `32 KiB fits L3: L3 serves ${fmt(c6.l3)}. AMAT is ${fmt(c6.amat32)}.`,
    `Too big for every cache, every pass is as slow as the first. 128 KiB fits nothing: DRAM serves all ${fmt(c6.dram128)} line [[miss|misses]], every pass. AMAT is ${fmt(c6.amat128)}, no better than reading the array once.`,
  ],
  claims: Object.values(c6),
  question: {
    prompt: 'At N = 32,768, why does every pass miss in L3, even though the array was read moments ago?',
    choices: [
      { text: 'L3 uses LRU (evict the line used longest ago), so a loop over 128 KiB pushes each line out of the 64 KiB L3 before it comes around again.', correct: true, why: 'Right. A loop slightly larger than the cache is the worst case for LRU: it hits nothing. The miss breakdown calls these capacity misses.' },
      { text: 'The lines conflict in L3.', why: 'L3 counts them as capacity misses: a 64 KiB cache that let any line go in any slot would miss as well.' },
      { text: 'Each pass reads new addresses.', why: 'Every pass reads the same array. Check the C++ source.' },
      { text: 'L3 is inclusive, and its evictions also remove lines from L1d and L2.', why: 'That is true, but it removes lines from L1d and L2 after L3 evicts them. It does not cause the L3 misses.' },
    ],
  },
  terms: ['cache-level', 'capacity-miss', 'temporal-locality', 'lru', 'amat', 'inclusive'],
};

/* ───────────────────────── 7. pointer chasing ───────────────────────── */

const s7 = (variant: string): Setup => ({ preset: TB, workload: 'list-vs-vector', params: { N: 16384, variant } });
const c7 = {
  vMisses: stat(s7('vector'), 'L1d.misses', 1024),
  vAmat: stat(s7('vector'), 'amat', 16.25, 2),
  oMisses: stat(s7('list-in-order'), 'L1d.misses', 4096),
  oAmat: stat(s7('list-in-order'), 'amat', 28.5, 2),
  sMisses: stat(s7('list-shuffled'), 'L1d.misses', 16345),
  sDram: stat(s7('list-shuffled'), 'servedBy.DRAM', 13382),
  sAmat: stat(s7('list-shuffled'), 'amat', 87.03, 2),
};

const pointerChasing: Lesson = {
  id: 'pointer-chasing',
  title: 'Pointer chasing: list vs vector',
  why: 'A std::list or any other node-based container can be far slower than a std::vector for the same loop, and the cause is where the nodes sit in memory and how the [[cache|cache]] (a small, fast copy of recent memory) fetches them.',
  goal: 'Compare a vector with a linked list whose nodes sit in address order, and then with one whose nodes are shuffled.',
  steps: [
    { text: 'Press Load and run. It picks the Textbook small cache preset and the Pointer chasing: list vs vector workload with Container = std::vector<int> and N = 16,384, then runs to the end.', actions: load(s7('vector'), RUN), show: 'metrics' },
    { text: 'Press Load and run for Container = List, nodes in order: the nodes sit back to back in memory.', actions: load(s7('list-in-order'), RUN), show: 'metrics' },
    { text: 'Press Load and step 8 for Container = List, shuffled nodes, and watch the L1d · core 0 grid (core 0\'s first and smallest cache). Each node takes two reads (its value, then its next pointer), and each new node lands on an unrelated [[cache-line|cache line]] (the 64-byte block the cache moves as one unit).', actions: load(s7('list-shuffled'), step(8)), show: 'view' },
    { text: 'Press Run to end.', actions: [RUN], show: 'metrics' },
  ],
  notice: [
    `A vector uses every byte of each line. It takes ${fmt(c7.vMisses)} [[miss|misses]] in [[cache-level|L1d]], the first and smallest cache, for 16,384 reads. [[amat|AMAT]], the average cost of one access, is ${fmt(c7.vAmat)} [[latency|cycles]].`,
    `A list in order still reads memory front to back, just with bigger elements. It makes 32,768 reads (value and next for each node) and takes ${fmt(c7.oMisses)} misses, since 4 nodes share a line. AMAT is ${fmt(c7.oAmat)}.`,
    `A shuffled list misses on almost every node. It takes ${fmt(c7.sMisses)} misses, about one per node, and [[dram|DRAM]], the main memory, serves ${fmt(c7.sDram)} of them. AMAT is ${fmt(c7.sAmat)}.`,
    'Real hardware makes the gap far bigger. VERIFY.md measured a shuffled list at 372x the vector\'s time per element. A vector keeps many misses in flight at once, but each list load must wait for the one before it, because it needs that node\'s next pointer: this is [[pointer-chasing|pointer chasing]]. The model charges accesses one at a time, so it understates the gap.',
  ],
  claims: Object.values(c7),
  question: {
    prompt: 'Both lists visit the same nodes. Why does the shuffled one miss about once per node?',
    choices: [
      { text: 'Its next node sits on an unrelated line, so each line serves one node and is evicted (pushed out to make room) before its other 3 nodes come up.', correct: true, why: 'Right. The in-order list uses all 4 nodes of a line back to back. The shuffled list wastes the other 48 bytes of every line it fetches.' },
      { text: 'Shuffled nodes are bigger.', why: 'Every Node is 16 B in both lists; only the link order differs.' },
      { text: 'The shuffled list has more nodes.', why: 'Both have N = 16,384.' },
      { text: 'Pointer loads always miss.', why: 'In the in-order list the same loads hit 7 times out of 8. What matters is where next points.' },
    ],
  },
  terms: ['pointer-chasing', 'cache-line', 'capacity-miss', 'amat'],
};

/* ───────────────────────── 8. AoS vs SoA ───────────────────────── */

const s8 = (layout: 'aos' | 'soa'): Setup => ({ preset: TB, workload: 'aos-soa', params: { N: 4096, layout } });
const c8 = {
  aMisses: stat(s8('aos'), 'L1d.misses', 2048),
  aAmat: stat(s8('aos'), 'amat', 36.67, 2),
  aCycles: stat(s8('aos'), 'cycles', 450560),
  sMisses: stat(s8('soa'), 'L1d.misses', 512),
  sAmat: stat(s8('soa'), 'amat', 12.17, 2),
  sCycles: stat(s8('soa'), 'cycles', 149504),
};

const aosSoa: Lesson = {
  id: 'aos-soa',
  title: 'Array of structs vs struct of arrays',
  why: 'How you group fields into structs decides how much memory a loop drags through the [[cache|cache]] (a small, fast copy of recent memory), even for fields the loop never reads.',
  goal: 'See how unused struct fields waste the [[cache-line|cache lines]] (64-byte blocks that always move whole) your loop fetches.',
  steps: [
    { text: 'Press Load and run. It picks the Textbook small cache preset and the Array of structs vs struct of arrays workload with N = 4,096 particles and Layout = Array of structs. Each particle is a 32 B struct, and the loop does x += vx.', actions: load(s8('aos'), RUN), show: 'metrics' },
    { text: 'Press Load and run for Layout = Struct of arrays: each field lives in its own array.', actions: load(s8('soa'), RUN), show: 'metrics' },
  ],
  notice: [
    `[[aos-soa|Array of structs]] (AoS) fetches fields the loop never uses. AoS takes ${fmt(c8.aMisses)} [[miss|misses]] in [[cache-level|L1d]], the first and smallest cache: one line per 2 particles. [[amat|AMAT]], the average cost of one access, is ${fmt(c8.aAmat)}, and the run takes ${fmt(c8.aCycles)} [[latency|cycles]].`,
    `Struct of arrays (SoA) fetches only what the loop uses. SoA takes ${fmt(c8.sMisses)} misses, since the x and vx arrays each pack 16 floats per line. AMAT is ${fmt(c8.sAmat)}, and the run takes ${fmt(c8.sCycles)} cycles: 3.0x fewer.`,
    'Real hardware shows a larger gap (8.8x to 12.8x in VERIFY.md), because the SoA loop also vectorizes: one instruction works on several floats. The benchmark struct is also 64 B, one line per particle, against 32 B here, so it wastes twice the bytes per line.',
  ],
  claims: Object.values(c8),
  question: {
    prompt: 'In AoS, what fraction of each 64 B line does the loop use?',
    choices: [
      { text: '1/4', correct: true, why: 'Right. A line holds 2 particles, and the loop reads x and vx (8 B) of each: 16 of 64 bytes.' },
      { text: '1/8', why: 'Each particle uses 8 bytes, but a line holds two particles, so 16 of 64.' },
      { text: '1/2', why: 'x and vx are 8 of the 32 bytes in a particle: a quarter, not a half.' },
      { text: 'All of it', why: 'That is SoA. In AoS, y, z, vy, vz, id, and mass ride along unused.' },
    ],
  },
  terms: ['aos-soa', 'cache-line', 'compulsory-miss', 'write-allocate'],
};

/* ───────────────────────── 9. MESI and false sharing ───────────────────────── */

const s9 = (layout: 'packed' | 'padded'): Setup =>
  ({ preset: TB, workload: 'false-sharing', params: { threads: 2, iterations: 256, layout }, arrows: true });
const c9 = {
  a0: access(s9('packed'), 0, { servedBy: 'DRAM', cycles: 200, l1d: 'compulsory' }),
  a1: access(s9('packed'), 1, { servedBy: 'L1', cycles: 4, l1d: 'hit' }),
  a2: access(s9('packed'), 2, { servedBy: 'peer', cycles: 60, l1d: 'compulsory' }),
  a3: access(s9('packed'), 3, { servedBy: 'L1', cycles: 64, l1d: 'hit' }),
  a4: access(s9('packed'), 4, { servedBy: 'peer', cycles: 60, l1d: 'coherence' }),
  coh: stat(s9('packed'), 'L1d.coherence', 510),
  inv: stat(s9('packed'), 'invalidationsSent', 511),
  amat: stat(s9('packed'), 'amat', 62.08, 2),
  cycles: stat(s9('packed'), 'cycles', 63568),
  padCoh: stat(s9('padded'), 'L1d.coherence', 0),
  padAmat: stat(s9('padded'), 'amat', 4.38, 2),
  padCycles: stat(s9('padded'), 'cycles', 4488),
};

const falseSharing: Lesson = {
  id: 'false-sharing',
  title: 'MESI and false sharing',
  why: 'Two threads that each update their own variable can still slow each other down badly when those variables share a [[cache-line|cache line]] (the 64-byte block the [[cache|cache]] moves as one unit), which is why C++17 added [[hardware-destructive-interference-size|std::hardware_destructive_interference_size]], the spacing that keeps two objects apart.',
  goal: 'Follow one cache line through the [[mesi|MESI]] states, the rules that keep each [[core|core\'s]] copy correct, as two cores write neighboring counters.',
  steps: [
    { text: 'Press Load. It picks the Textbook small cache preset and the False sharing workload with Threads = 2, Iterations per thread = 256, and Layout = Packed (8 B apart), and turns on Coherence arrows (arrows drawn when cores pass a line or throw away a copy). Watch the two core columns in the center and the Current access panel below them.', actions: load(s9('packed')), show: 'view' },
    { text: 'Press Step. Core 0 reads its counter.', actions: [step(1)] },
    { text: 'Press Step. Core 0 writes its counter.', actions: [step(1)] },
    { text: 'Press Step. Core 1 reads its own counter, 8 bytes away, in the same line.', actions: [step(1)] },
    { text: 'Press Step. Core 1 writes its counter.', actions: [step(1)] },
    { text: 'Press Step. Core 0 reads its counter again.', actions: [step(1)] },
    { text: 'Press Run to end. Then look at the L1d row under Miss breakdown ([[cache-level|L1d]] is each core\'s first, smallest cache) and at Totals.', actions: [RUN], show: 'metrics' },
    { text: 'Press Load and run for Layout = Padded (one line each).', actions: load(s9('padded'), RUN), show: 'metrics' },
  ],
  notice: [
    `Alone, a core reads and writes its line freely. #0 goes to [[dram|DRAM]], the main memory, in ${c9.a0.expect.cycles} [[latency|cycles]], and core 0 holds the line in E, [[mesi-exclusive|Exclusive]]: the only copy, unchanged. #1 is a write [[hit|hit]] (the line is already cached) in ${c9.a1.expect.cycles} cycles; E becomes M, [[mesi-modified|Modified]], with no message to the other core.`,
    `A second core reading the line forces both to share it. At #2 core 1 [[miss|misses]], and core 0 sends the line over (a [[peer-transfer|peer transfer]], ${c9.a2.expect.cycles} cycles). Both copies become S, [[mesi-shared|Shared]].`,
    `A write takes the line away from the other core. At #3 core 1's write hits, but first it must [[mesi-invalid|invalidate]] (throw away) core 0's copy: ${c9.a3.expect.cycles} cycles. At #4, core 0's read is a [[coherence-miss|coherence miss]] (${c9.a4.expect.cycles} cycles): its copy was thrown away.`,
    `Packed counters keep stealing the line from each other. After the run L1d shows ${fmt(c9.coh)} coherence misses, Totals shows ${fmt(c9.inv)} invalidations, and [[amat|AMAT]], the average cost of one access, is ${fmt(c9.amat)}. This is [[false-sharing|false sharing]].`,
    `Padding each counter to its own line ends the fight. Padded: ${fmt(c9.padCoh)} coherence misses, AMAT ${fmt(c9.padAmat)}. ${fmt(c9.cycles)} cycles against ${fmt(c9.padCycles)}: about 14x.`,
  ],
  claims: Object.values(c9),
  question: {
    prompt: 'Each thread touches only its own counter. Why does the packed layout invalidate at all?',
    choices: [
      { text: 'Coherence tracks whole 64 B lines, and both 8 B counters live in one line.', correct: true, why: 'Right. MESI cannot tell which bytes a core wrote, so a write anywhere in the line takes the whole line away from the other core.' },
      { text: 'The threads share one counter.', why: 'That would be true sharing, where threads really use the same bytes. Here counters[0] and counters[1] are separate objects that happen to share a line.' },
      { text: 'fetch_add always invalidates other cores.', why: 'The padded run does the same fetch_add with no invalidations at all.' },
      { text: 'The L3 is inclusive (it keeps a copy of every line the cores hold).', why: 'Inclusion matters when L3 evicts a line. This run never evicts one.' },
    ],
  },
  terms: ['mesi', 'false-sharing', 'coherence-miss', 'peer-transfer', 'hardware-destructive-interference-size'],
};

/* ───────────────────────── 10. SPSC ring ───────────────────────── */

const s10 = (layout: 'same-line' | 'separate-lines'): Setup =>
  ({ preset: TB, workload: 'spsc-ring', params: { items: 256, capacity: 16, layout }, arrows: true });
const c10 = {
  cycles: stat(s10('same-line'), 'cycles', 68812),
  amat: stat(s10('same-line'), 'amat', 44.74, 2),
  coh: stat(s10('same-line'), 'L1d.coherence', 766),
  sepCycles: stat(s10('separate-lines'), 'cycles', 95588),
  sepAmat: stat(s10('separate-lines'), 'amat', 62.15, 2),
  sepCoh: stat(s10('separate-lines'), 'L1d.coherence', 765),
};

const spscRing: Lesson = {
  id: 'spsc-ring',
  title: 'SPSC ring: when padding is not enough',
  why: 'Lock-free queues between two threads are common in low-latency C++, and padding their indices onto separate [[cache-line|cache lines]] (the 64-byte blocks the [[cache|cache]], a small, fast copy of recent memory, moves whole) is a popular fix that does not always help.',
  goal: 'See why padding the ring\'s two indices (head and tail) apart does not speed up a plain [[spsc-ring|single-producer, single-consumer ring]], a queue where one thread writes and one thread reads.',
  steps: [
    { text: 'Press Load and run. It picks the Textbook small cache preset and the SPSC ring buffer workload with Items = 256, Capacity (slots) = 16, and Index layout = head and tail on one line. The producer advances tail after it writes a slot; the consumer advances head after it reads one.', actions: load(s10('same-line'), RUN), show: 'metrics' },
    { text: 'Press Load and run for Index layout = Each on its own line.', actions: load(s10('separate-lines'), RUN), show: 'metrics' },
    { text: 'Press Load and step 12, and watch the coherence arrows (drawn when a line moves between cores or a copy is thrown away) between the two core columns: both index lines still bounce between the [[core|cores]] (the two processors running the threads).', actions: [{ kind: 'setup', setup: s10('separate-lines') }, step(12)], show: 'view' },
  ],
  notice: [
    `With head and tail on one line, that line moves between the cores on every handoff. The run takes ${fmt(c10.cycles)} [[latency|cycles]], and [[amat|AMAT]], the average cost of one access, is ${fmt(c10.amat)}. [[cache-level|L1d]], each core\'s first cache, takes ${fmt(c10.coh)} [[coherence-miss|coherence misses]]: misses because the other core's write threw away this core's copy.`,
    `Padding made it slower, not faster. On separate lines the run takes ${fmt(c10.sepCycles)} cycles, AMAT is ${fmt(c10.sepAmat)}, and L1d takes ${fmt(c10.sepCoh)} coherence misses: about 1.39x slower.`,
    'Real hardware agrees: VERIFY.md measured the padded plain ring 1.73x slower. Each side still reads the index the other just wrote. That is [[true-sharing|true sharing]], where the data really must travel, not [[false-sharing|false sharing]], so padding only splits one bouncing line into two.',
    'What pays off is caching. Each side keeps a stale copy of the other\'s index and rereads it only when the ring looks full or empty. The simulator does not model that ring yet (VERIFY.md, M6).',
  ],
  claims: Object.values(c10),
  question: {
    prompt: 'Why does moving head and tail onto separate lines not help this ring?',
    choices: [
      { text: 'Each side still reads the index the other side just wrote, so every handoff still moves a line between cores.', correct: true, why: 'Right. Padding removes false sharing, but this traffic is true sharing: the data really does pass between cores.' },
      { text: 'head and tail never shared a line.', why: 'In the one-line layout they sit 8 bytes apart in the same 64 B line.' },
      { text: 'Padding wastes L1d capacity.', why: 'The ring uses 3 lines; there are no capacity misses (misses from running out of room) in either layout.' },
      { text: 'The ring slots cause all of the traffic.', why: 'The slots move between cores in both layouts. What changed between the runs is the index lines.' },
    ],
  },
  terms: ['spsc-ring', 'true-sharing', 'false-sharing', 'coherence-miss', 'mesi'],
};

export const LESSONS: readonly Lesson[] = [
  addressBreakdown, spatialLocality, stride, rowVsColumn, conflict, capacity, pointerChasing, aosSoa, falseSharing, spscRing,
];

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

/** Default button label for a step's actions. */
export function actionLabel(s: LessonStep): string {
  if (s.label) return s.label;
  const a = s.actions ?? [];
  const last = a[a.length - 1];
  if (!last) return '';
  if (last.kind === 'runToEnd') return a.length > 1 ? 'Load and run' : 'Run to end';
  if (last.kind === 'step') return a.length > 1 ? `Load and step ${last.n}` : last.n === 1 ? 'Step' : `Step ${last.n}`;
  if (last.kind === 'play') return 'Play';
  return 'Load';
}
