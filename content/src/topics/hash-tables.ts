/**
 * fp.hash-tables: Hash tables. The lesson follows CS3110 Sections 9.1 and 9.2 (maps as hash
 * tables with chaining, the bucket representation invariant, load factor and resizing,
 * amortised analysis of resizing) and FoCS Lecture 7's dictionary operations. The problems
 * are CS3110 Chapter 9 exercises: hash insert, relax and strengthen bucket RI, hashtbl
 * usage, stats, and load factor, and linear probing.
 *
 * Checked in OCaml 4.11.1: with hash k = k mod 7, the keys 4, 8, 15, 16, 23, 42 go to
 * buckets 4, 1, 1, 2, 2, 0, leaving 3 of the 7 empty. Hashtbl.create 16 with 31 bindings
 * has 16 buckets (load factor 31/16); the 32nd binding keeps 16 buckets (load factor
 * exactly 2), and the 33rd makes 32 (load factor goes strictly above 2). The generators
 * simulate the same rules.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick, sample } from '../math';
import { codeOf, ml, mlBlock } from '../ocaml-code';
import { generator, type Misconception } from '../problem';
import { math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

// ---------------------------------------------------------------- generators

interface BucketP { m: number; keys: number[]; ask: 'empty' | 'longest' }
const buckets = ({ m, keys }: BucketP): number[] => {
  const b = Array.from({ length: m }, () => 0);
  for (const k of keys) b[k % m] = (b[k % m] as number) + 1;
  return b;
};
const bucketAnswer = (bp: BucketP): number => {
  const b = buckets(bp);
  return bp.ask === 'empty' ? b.filter((x) => x === 0).length : Math.max(...b);
};
const bucketWrong = (bp: BucketP): number[] => {
  const b = buckets(bp);
  return bp.ask === 'empty' ? [bp.m - bp.keys.length, b.filter((x) => x > 0).length] : [1, Math.ceil(bp.keys.length / bp.m)];
};

const bucketsGen = generator<BucketP>({
  id: 'hash-buckets',
  skill: 'Insert keys into a hash table with chaining, hash k mod m, and read off the buckets, as in the CS3110 hash insert exercise.',
  params: (rng) => {
    for (;;) {
      const m = int(rng, 5, 11);
      const keys = sample(rng, Array.from({ length: 60 }, (_, i) => i + 1), int(rng, 5, 8));
      const bp: BucketP = { m, keys, ask: pick(rng, ['empty', 'longest'] as const) };
      const right = bucketAnswer(bp);
      const wrong = bucketWrong(bp);
      if (wrong.every((w) => w !== right) && wrong[0] !== wrong[1] && wrong.every((w) => w >= 0)) return bp;
    }
  },
  sane: ({ m }) => (m >= 5 ? null : 'm'),
  problem: (bp) => {
    const b = buckets(bp);
    const v = bucketAnswer(bp);
    return {
      prompt: t`A hash table has ${bp.m} buckets, chaining, and ${ml`let hash k = k mod ${bp.m}`}. The keys ${ml`${codeOf(bp.keys.join(', '))}`} are inserted. ${bp.ask === 'empty' ? t`How many buckets are empty?` : t`How many keys are in the longest bucket?`}`,
      answer: { kind: 'exact', expected: String(v) },
      solution: [
        t`Each key goes to the bucket numbered by its remainder on division by ${bp.m}: ${bp.keys.map((k, i) => [...(i > 0 ? t`, ` : []), math`${k} \mapsto ${k % bp.m}`]).flat()}.`,
        t`The bucket sizes, from bucket ${0} to bucket ${bp.m - 1}, are ${ml`${codeOf(b.join(', '))}`}.`,
        bp.ask === 'empty' ? t`So ${v} buckets are empty.` : t`So the longest bucket holds ${v} keys.`,
      ],
    };
  },
  solve: (bp) => String(bucketAnswer(bp)),
  misconceptions: (bp): Misconception[] => {
    const [w1, w2] = bucketWrong(bp);
    return bp.ask === 'empty'
      ? [
        { response: String(w1), why: t`That assumes every key lands in a different bucket. Two keys with the same remainder collide and share a bucket.` },
        { response: String(w2), why: t`That counts the buckets in use; the question asks for the empty ones.` },
      ]
      : [
        { response: String(w1), why: t`Collisions happen: keys with the same remainder share a bucket.` },
        { response: String(w2), why: t`That is the average bucket length, rounded up. The longest bucket depends on the actual remainders.` },
      ];
  },
});

interface ResizeP { b: number; n: number }
/** OCaml's Hashtbl rule: double the buckets when the load factor goes strictly above 2. */
function resized({ b, n }: ResizeP, rule: (count: number, buckets: number) => boolean): number {
  let buck = b;
  for (let count = 1; count <= n; count++) if (rule(count, buck)) buck *= 2;
  return buck;
}
const ocamlRule = (c: number, bk: number): boolean => c > 2 * bk;

const resizeGen = generator<ResizeP>({
  id: 'load-factor-resize',
  skill: 'Track the number of buckets as a hash table grows: it doubles whenever an insertion pushes the load factor above its bound.',
  params: (rng) => {
    for (;;) {
      const rp = { b: pick(rng, [2, 4, 8, 16]), n: int(rng, 5, 70) };
      const right = resized(rp, ocamlRule);
      if (right !== rp.b && resized(rp, (c, bk) => c >= 2 * bk) !== right) return rp;
    }
  },
  sane: ({ b }) => (b >= 2 ? null : 'b'),
  problem: (rp) => {
    const v = resized(rp, ocamlRule);
    const steps = [];
    let bk = rp.b;
    for (let c = 1; c <= rp.n; c++) if (ocamlRule(c, bk)) { steps.push([c, bk * 2]); bk *= 2; }
    return {
      prompt: t`A hash table starts with ${rp.b} buckets. Like OCaml's ${ml`Hashtbl`}, it doubles its number of buckets whenever an insertion makes the load factor (bindings divided by buckets) strictly greater than ${2}. After ${rp.n} bindings with distinct keys are added, how many buckets does it have?`,
      answer: { kind: 'exact', expected: String(v) },
      solution: [
        t`The load factor exceeds ${2} when the number of bindings passes twice the number of buckets.`,
        t`${steps.map(([c, nb], i) => [...(i > 0 ? t`; ` : []), ...t`binding ${c as number} makes it double to ${nb as number}`]).flat()}.`,
        t`After ${rp.n} bindings there are ${v} buckets, and the load factor is ${math`${rp.n}/${v}`}, at most ${2}.`,
      ],
    };
  },
  solve: (rp) => String(resized(rp, ocamlRule)),
  misconceptions: (rp): Misconception[] => [
    { response: String(rp.b), why: t`The table resizes as it fills: otherwise the buckets grow long and lookups slow down.` },
    { response: String(resized(rp, (c, bk) => c >= 2 * bk)), why: t`A load factor of exactly ${2} is allowed: the table doubles only when it goes strictly above ${2}.` },
  ],
});

interface MovesP { n: number }
/** Start with 1 bucket; when bindings exceed buckets, double and rehash every binding. */
function moves(n: number): number {
  let b = 1;
  let total = 0;
  for (let c = 1; c <= n; c++) {
    if (c > b) {
      total += c;
      b *= 2;
    }
  }
  return total;
}
const movesGen = generator<MovesP>({
  id: 'rehash-moves',
  skill: 'Count the total rehashing work as a doubling hash table fills, and compare it with the number of insertions (amortised analysis).',
  params: (rng) => ({ n: int(rng, 5, 100) }),
  sane: ({ n }) => (n >= 5 ? null : 'n'),
  problem: ({ n }) => {
    const sizes: number[] = [];
    let b = 1;
    for (let c = 1; c <= n; c++) if (c > b) { sizes.push(c); b *= 2; }
    return {
      prompt: t`A hash table starts with ${1} bucket. Whenever an insertion makes the number of bindings exceed the number of buckets, the buckets double and every binding, the new one included, is moved to the new array. ${n} bindings are inserted. How many moves are made in total?`,
      answer: { kind: 'exact', expected: String(moves(n)) },
      solution: [
        t`The buckets go ${1}, ${2}, ${4}, and so on; a resize happens at the insertion that makes the count one more than a power of two.`,
        t`Up to ${n} insertions, resizes happen at counts ${ml`${codeOf(sizes.join(', '))}`}, each moving that many bindings.`,
        t`Total ${moves(n)}, fewer than ${math`${3} \times ${n} = ${3 * n}`}: a constant amount per insertion on average.`,
      ],
    };
  },
  solve: ({ n }) => String(moves(n)),
  misconceptions: ({ n }): Misconception[] => [
    { response: String(n), why: t`Each binding can be moved several times, once per resize after it arrives; but the resizes get rarer as the table grows.` },
    { response: String((n * (n + 1)) / 2), why: t`Rehashing happens only when the count passes a power of two, not at every insertion.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const HASH_KEYS = [4, 8, 15, 16, 23, 42];
const hashInsert = auto({
  id: 'cs3110-9-hash-insert',
  source: cite('cs3110-ex9', 'Exercise: hash insert', true),
  title: t`Inserting six keys into seven buckets`,
  prompt: t`A hash table on integer keys has ${7} empty buckets and ${ml`let hash k = k mod ${7}`}. Draw the table after inserting the keys ${ml`${codeOf(HASH_KEYS.join(', '))}`}. How many buckets are still empty?`,
  answer: { kind: 'exact', expected: String(buckets({ m: 7, keys: HASH_KEYS, ask: 'empty' }).filter((x) => x === 0).length) },
  solution: [
    t`The remainders on division by ${7}: ${HASH_KEYS.map((k, i) => [...(i > 0 ? t`, ` : []), math`${k} \mapsto ${k % 7}`]).flat()}.`,
    t`So bucket ${0} holds ${42}; bucket ${1} holds ${8} and ${15}; bucket ${2} holds ${16} and ${23}; bucket ${4} holds ${4}. Buckets ${3}, ${5}, and ${6} are empty: ${3} of them.`,
  ],
  reference: '3',
  verify: () => same('empty buckets', buckets({ m: 7, keys: HASH_KEYS, ask: 'empty' }).filter((x) => x === 0).length, 3),
  misconceptions: [{ response: '1', why: t`Six keys in seven buckets would leave one empty only if there were no collisions; ${8} and ${15} collide, and so do ${16} and ${23}.` }],
});
const loadFactor = auto({
  id: 'cs3110-9-load-factor',
  source: cite('cs3110-ex9', 'Exercises: hashtbl usage, hashtbl stats, hashtbl load factor', true),
  title: t`The load factor of ${ml`tab`}`,
  prompt: t`${ml`let tab = Hashtbl.create ${16}`} makes a table with ${16} buckets; then ${31} bindings with distinct keys are added. The load factor is the number of bindings divided by the number of buckets. What is the load factor of ${ml`tab`}, as a fraction?`,
  answer: { kind: 'exact', expected: '31/16' },
  solution: [
    t`${ml`Hashtbl`} resizes only when the load factor goes strictly above ${2}; ${math`${31}/${16} \le ${2}`}, so there are still ${16} buckets.`,
    t`The load factor is ${math`\frac{${31}}{${16}}`}, about ${31 / 16}.`,
  ],
  reference: '31/16',
  verify: () => same('buckets after 31 bindings', resized({ b: 16, n: 31 }, ocamlRule), 16),
  misconceptions: [{ response: '31/32', why: t`No resize has happened yet: ${math`${31}/${16}`} is not above ${2}.` }],
});
const resize33 = auto({
  id: 'cs3110-9-resize',
  source: cite('cs3110-ex9', 'Exercise: hashtbl load factor', true),
  title: t`When ${ml`Hashtbl`} resizes`,
  prompt: t`Continuing: one more binding is added to ${ml`tab`} (${32} in all), then another (${33}). ${ml`Hashtbl`} resizes when the load factor goes strictly above ${2}, doubling its buckets. How many buckets does ${ml`tab`} have after the ${33}rd binding?`,
  answer: { kind: 'exact', expected: String(resized({ b: 16, n: 33 }, ocamlRule)) },
  solution: [
    t`With ${32} bindings the load factor is ${math`${32}/${16} = ${2}`}, not strictly above ${2}: no resize.`,
    t`The ${33}rd makes it ${math`${33}/${16} > ${2}`}, so the buckets double to ${32}, and the load factor drops to ${math`${33}/${32}`}.`,
  ],
  reference: '32',
  verify: () => same('buckets after 32 and 33 bindings', `${resized({ b: 16, n: 32 }, ocamlRule)},${resized({ b: 16, n: 33 }, ocamlRule)}`, '16,32'),
  misconceptions: [{ response: '16', why: t`At ${33} bindings the load factor ${math`${33}/${16}`} is above ${2}, so the table resizes.` }, { response: '64', why: t`Each resize doubles the buckets once: ${16} becomes ${32}.` }],
});
const relaxRi = supervision({
  id: 'cs3110-9-relax-ri',
  source: cite('cs3110-ex9', 'Exercises: relax bucket RI, strengthen bucket RI'),
  title: t`Changing the bucket invariant`,
  prompt: t`Hash table buckets must not contain duplicate keys. What would happen if we relaxed this invariant to allow duplicates? And if we strengthened it to require each bucket to be sorted by key? For each change, would the efficiency of ${ml`insert`}, ${ml`find`}, or ${ml`remove`} change, and how?`,
  writeUp: 'explanation',
});
const probing = supervision({
  id: 'cs3110-9-linear-probing',
  source: cite('cs3110-ex9', 'Exercise: linear probing'),
  title: t`A hash table with linear probing`,
  prompt: t`Implement a hash table that uses linear probing instead of chaining: one binding per bucket, and on a collision search forward, wrapping round. Removal leaves a "deleted" marker. Double the array when (bindings plus deleted) divided by buckets exceeds ${math`\frac{${1}}{${2}}`}, and halve it when bindings divided by buckets falls below ${math`\frac{${1}}{${8}}`}. Explain why a removed binding cannot simply leave its bucket empty.`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

export const hashTables: TopicContent = {
  topicId: 'fp.hash-tables',
  goal: t`Implement a dictionary as an array of buckets, keep the load factor bounded by resizing, and see why that makes operations ${math`O(${1})`} amortised.`,
  objective: t`Store a dictionary in an array of buckets, keep the load factor bounded, and analyse the cost.`,
  why: t`Hash tables are the fastest general dictionaries; their analysis shows why doubling, not adding, wins.`,
  minutes: 35,
  lesson: [
    { kind: 'section', title: t`From keys to array positions` },
    { kind: 'hook', text: t`An array finds element ${937} at once: it jumps straight there. A list must walk past ${936} others first. Could a dictionary keyed by strings, or by any type at all, jump straight to its key the way an array does?` },
    { kind: 'narrative', text: t`It can, nearly. Turn each key into a number, and use the number as an array index. Two keys may get the same number, so each array cell holds a short list of bindings, called a bucket. This is the hash table, and it is how OCaml's ${ml`Hashtbl`} works.` },
    { kind: 'definition', name: t`Hash table with chaining`, formal: t`A [[hash-function|hash function]] maps keys to integers. A [[hash-table|hash table]] with ${math`m`} buckets stores each binding ${ml`(k, v)`} in the association list at index ${math`h(k) \bmod m`} of an array of length ${math`m`}. Representation invariant: each binding is in the bucket its key hashes to, and no bucket holds two bindings with the same key.`, plain: t`With ${math`m = ${7}`} and ${math`h(k) = k`}, the key ${15} goes to bucket ${15 % 7}, as does ${8}: they collide and share bucket ${1}.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Insert`, text: t`Compute the bucket ${math`h(k) \bmod m`}; replace a binding of ${math`k`} there if there is one, else add ${ml`(k, v)`} to the bucket.`, plain: t`The array access is constant time; the bucket scan costs its length.` },
        { label: t`Find`, text: t`Compute the same bucket and search its list for ${math`k`}.`, why: { q: t`Why must equal keys hash equally?`, a: t`Find looks in one bucket only. If two equal keys could hash to different buckets, find would look in the wrong place. OCaml's ${ml`Hashtbl.HashedType`} requires it.` } },
        { label: t`Remove`, text: t`Compute the bucket and delete the binding of ${math`k`} from its list.` },
      ],
    },
    checkFrom(bucketsGen, { m: 7, keys: [4, 8, 15, 16, 23, 42, 30], ask: 'longest' }, t`${30} also goes to bucket ${2}, joining ${16} and ${23}: three keys.`),
    { kind: 'section', title: t`The load factor` },
    { kind: 'narrative', text: t`Every operation costs about the length of one bucket. With a hash function that spreads the keys evenly, that length is about the number of bindings divided by the number of buckets.` },
    { kind: 'definition', name: t`Load factor`, formal: t`The [[load-factor|load factor]] of a hash table with ${math`n`} bindings and ${math`m`} buckets is ${math`\alpha = n/m`}.`, plain: t`The average bucket length. ${31} bindings in ${16} buckets give ${math`\alpha = \frac{${31}}{${16}}`}, a little under ${2}.` },
    { kind: 'p', text: t`If ${math`m`} stays fixed, ${math`\alpha`} grows with ${math`n`} and the table degrades to a few long lists. So the table resizes: when ${math`\alpha`} passes a bound (${2} for ${ml`Hashtbl`}), make a new array with twice as many buckets and rehash every binding into it.` },
    checkFrom(resizeGen, { b: 4, n: 20 }, t`${4} buckets hold ${8} bindings at load factor ${2}; the ${9}th doubles to ${8} buckets, and the ${17}th to ${16}.`),
    { kind: 'section', title: t`Why doubling is cheap` },
    { kind: 'narrative', text: t`Rehashing moves every binding, so one insertion can be slow. But resizes get rarer as the table grows. Add up the work over a whole run, as for the two-list queue.` },
    { kind: 'theorem', name: t`Amortised cost of doubling`, statement: t`Start with ${1} bucket and double whenever the number of bindings exceeds the number of buckets, moving every binding. Inserting ${math`N \ge ${1}`} bindings moves fewer than ${math`${3}N`} bindings in total, so the rehashing costs ${math`O(${1})`} amortised per insertion.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`When resizes happen`, text: t`The buckets go ${math`${1}, ${2}, ${4}, \ldots`}. With ${math`${2}^{j}`} buckets, the resize comes at the insertion that makes the count ${math`${2}^{j} + ${1}`}, and it moves ${math`${2}^{j} + ${1}`} bindings.`, plain: t`From ${4} buckets, the ${5}th binding triggers a resize that moves ${5} bindings.` },
        { label: t`Which resizes occur`, text: t`A resize at count ${math`${2}^{j} + ${1}`} happens within ${math`N`} insertions exactly when ${math`${2}^{j} < N`}. Let ${math`J`} be the largest such ${math`j`}.` },
        { label: t`Sum the powers`, text: t`${math`\sum_{j=${0}}^{J} ${2}^{j} = ${2}^{J + ${1}} - ${1} < ${2}N`}, since ${math`${2}^{J} < N`}.`, why: { q: t`Why is the sum ${math`${2}^{J + ${1}} - ${1}`}?`, a: t`It is a geometric series with ratio ${2}: ${math`${1} + ${2} + ${4} = ${7} = ${2}^{${3}} - ${1}`}.` } },
        { label: t`Sum the extra ones`, text: t`There are ${math`J + ${1}`} resizes, each moving one binding more than ${math`${2}^{j}`}, and ${math`J + ${1} \le N`} because ${math`J < ${2}^{J} < N`}.` },
        { label: t`Conclude`, text: t`Total moves ${math`< ${2}N + N = ${3}N`}: fewer than ${3} per insertion on average.` },
      ],
    },
    checkFrom(movesGen, { n: 10 }, t`Resizes at counts ${2}, ${3}, ${5}, ${9} move ${math`${2} + ${3} + ${5} + ${9} = ${19}`} bindings.`),
    { kind: 'pitfall', claim: t`Growing the table by a fixed number of buckets each time works as well as doubling.`, counterexample: t`Adding ${10} buckets at a time means a resize every ${20} or so insertions, each moving everything: about ${math`\frac{N}{${20}}`} resizes of average size ${math`\frac{N}{${2}}`}, which is quadratic. Doubling makes the resize sizes a geometric series.` },
    { kind: 'pitfall', claim: t`A hash table is ${math`O(${1})`} per operation whatever the hash function.`, counterexample: t`With a constant hash function every key lands in one bucket, and each operation scans a list of all ${math`n`} bindings: ${math`O(n)`}. The bound needs a hash that spreads keys evenly.` },
    { kind: 'takeaway', text: t`Hash each key to a bucket, keep the load factor bounded by doubling the buckets, and the expected cost per operation is constant.` },
  ],
  examples: [
    { ...workedCambridge(hashInsert), examiner: t`The examiner wants each remainder shown, collisions placed in the same bucket, and the empty buckets counted from the drawing.` },
    worked(resizeGen, { b: 2, n: 13 }, t`Following the resizes`),
    worked(movesGen, { n: 20 }, t`The total cost of rehashing`),
  ],
  generators: [bucketsGen, resizeGen, movesGen],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['hash-function', 'hash-table', 'load-factor'],
  cambridge: [loadFactor, resize33, relaxRi, probing],
  gate: ['cs3110-9-relax-ri', 'cs3110-9-resize'],
  recall: [
    { front: t`What is the load factor of a hash table?`, back: t`Bindings divided by buckets, ${math`\alpha = n/m`}: the average bucket length.` },
    { front: t`What must a hash function satisfy for find to work?`, back: t`Equal keys get equal hash values, so find looks in the bucket where insert put the key.` },
    { front: t`Why does doubling make resizing cheap?`, back: t`The resize sizes form a geometric series: fewer than ${math`${3}N`} moves for ${math`N`} insertions.` },
  ],
  proofOrder: [{
    title: t`Doubling costs ${math`O(${1})`} amortised`,
    steps: [
      t`With ${math`${2}^{j}`} buckets, the resize at count ${math`${2}^{j} + ${1}`} moves that many bindings.`,
      t`Such a resize occurs within ${math`N`} insertions exactly when ${math`${2}^{j} < N`}.`,
      t`The powers sum to ${math`${2}^{J + ${1}} - ${1} < ${2}N`}.`,
      t`The extra ones add at most ${math`N`}, so the total is below ${math`${3}N`}.`,
    ],
  }],
};
