/**
 * fp.functional-queues: Functional queues. The lesson follows FoCS Lecture 10 (the queue
 * abstract type; queues as a pair of lists in normal form, norm, enq, deq, qhd; the
 * amortised analysis: n enq and n deq cost 2n conses) and CS3110 Section 5.6 (ListQueue
 * against BatchedQueue). The problems are CS3110 Chapter 5 exercises (queue option, queue
 * efficiency) and FoCS Exercise 10.1.
 *
 * The cons counts are computed by running the FoCS code's operations in TypeScript,
 * counting one for the cons in enq and one per element reversed by norm.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick, sample } from '../math';
import { codeOf, ml, mlBlock, mlList } from '../ocaml-code';
import { generator, type Misconception } from '../problem';
import { math, t } from '../rich';
import { checkFrom, worked, workedProof, type TopicContent } from '../topic';

// ---------------------------------------------------------------- the FoCS queue, simulated

type QOp = { enq: number } | 'deq';
interface Q { front: number[]; rear: number[]; conses: number }

/** FoCS norm, enq, deq: rear stored reversed; a reversal costs one cons per element. */
function run(ops: readonly QOp[]): Q {
  let q: Q = { front: [], rear: [], conses: 0 };
  const norm = (x: Q): Q => (x.front.length === 0 && x.rear.length > 0 ? { front: [...x.rear].reverse(), rear: [], conses: x.conses + x.rear.length } : x);
  for (const o of ops) {
    if (o === 'deq') {
      if (q.front.length === 0) throw new Error('deq of an empty queue');
      q = norm({ ...q, front: q.front.slice(1) });
    } else q = norm({ front: q.front, rear: [o.enq, ...q.rear], conses: q.conses + 1 });
  }
  return q;
}
const opsCode = (ops: readonly QOp[]): string => ops.map((o) => (o === 'deq' ? '|> deq' : `|> enq' ${o.enq}`)).join(' ');
const contents = (q: Q): number[] => [...q.front, ...[...q.rear].reverse()];

interface TraceP { ops: QOp[]; ask: 'head' | 'front' }

function randomOps(rng: () => number, n: number): QOp[] {
  const vals = sample(rng, [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14], n);
  const ops: QOp[] = [];
  let size = 0;
  let i = 0;
  while (i < vals.length) {
    if (size > 1 && rng() < 0.4) {
      ops.push('deq');
      size--;
    } else {
      ops.push({ enq: vals[i] as number });
      i++;
      size++;
    }
  }
  return ops;
}

const queueTrace = generator<TraceP>({
  id: 'queue-trace',
  skill: 'Trace the two-list queue of FoCS Lecture 10: enq conses onto the rear list, deq takes from the front list, and norm reverses the rear when the front runs out.',
  params: (rng) => {
    for (;;) {
      const ops = randomOps(rng, int(rng, 4, 6));
      const q = run(ops);
      const ask = pick(rng, ['head', 'front'] as const);
      const enqs = ops.filter((o): o is { enq: number } => o !== 'deq');
      const right = ask === 'head' ? q.front[0] : q.front.length;
      const wrong = ask === 'head' ? [contents(q)[contents(q).length - 1], enqs[0]?.enq] : [contents(q).length, q.rear.length];
      if (ops.includes('deq') && q.front.length > 0 && new Set([right, ...wrong]).size === 3) return { ops, ask };
    }
  },
  sane: ({ ops }) => (run(ops).front.length > 0 ? null : 'empty'),
  problem: ({ ops, ask }) => {
    const q = run(ops);
    return {
      prompt: t`A queue is ${ml`Q (front, rear)`}, representing ${ml`front @ List.rev rear`}, and kept in normal form: the front is empty only if the whole queue is. With ${ml`let enq' x q = enq q x`}, evaluate ${ml`qempty ${codeOf(opsCode(ops))}`}. ${ask === 'head' ? t`What does ${ml`qhd`} return?` : t`How many elements are in the front list?`}`.concat([mlBlock`
        let norm = function
          | Q ([], tls) -> Q (List.rev tls, [])
          | q -> q
        let enq (Q (hds, tls)) x = norm (Q (hds, x :: tls))
        let deq = function
          | Q (x :: hds, tls) -> norm (Q (hds, tls))
          | _ -> raise Empty
      `]),
      answer: { kind: 'exact', expected: String(ask === 'head' ? q.front[0] : q.front.length) },
      solution: [
        t`Each ${ml`enq`} conses onto the rear list; when ${ml`deq`} empties the front, ${ml`norm`} reverses the rear into the front.`,
        t`At the end the queue is ${ml`Q (${mlList(q.front)}, ${mlList(q.rear)})`}, which represents ${ml`${mlList(contents(q))}`} in order from the head.`,
        ask === 'head' ? t`So ${ml`qhd`} is ${q.front[0] as number}: the oldest element still waiting.` : t`So the front list has ${q.front.length} ${q.front.length === 1 ? 'element' : 'elements'}.`,
      ],
    };
  },
  solve: ({ ops, ask }) => {
    const q = run(ops);
    return String(ask === 'head' ? contents(q)[0] : q.front.length);
  },
  misconceptions: ({ ops, ask }): Misconception[] => {
    const q = run(ops);
    const c = contents(q);
    const enqs = ops.filter((o): o is { enq: number } => o !== 'deq');
    return ask === 'head'
      ? [
        { response: String(c[c.length - 1]), why: t`That is the newest element, the tail of the queue. A queue serves the oldest first: first in, first out.` },
        { response: String(enqs[0]?.enq), why: t`That was the first element in, but a ${ml`deq`} has already removed it.` },
      ]
      : [
        { response: String(c.length), why: t`That counts the whole queue. The rear list holds the newest elements, in reverse.` },
        { response: String(q.rear.length), why: t`That is the rear list. The front list holds the elements that come off first.` },
      ];
  },
});

interface NaiveP { n: number }
const naiveCost = generator<NaiveP>({
  id: 'append-queue-cost',
  skill: 'Count the cost of building a queue of n elements with q @ [x], the naive list queue, and see that it is quadratic.',
  quick: true,
  params: (rng) => ({ n: int(rng, 5, 60) }),
  sane: ({ n }) => (n >= 5 ? null : 'small'),
  problem: ({ n }) => ({
    prompt: t`A queue is a single list with the head at the front, and ${ml`enqueue x q = q @ [x]`}. Starting from the empty queue, ${n} elements are enqueued one at a time. Each ${ml`@`} copies every cell of its first argument. How many cells are copied in total?`,
    answer: { kind: 'exact', expected: String((n * (n - 1)) / 2) },
    solution: [
      t`The ${math`k`}-th enqueue appends to a queue of length ${math`k - ${1}`}, so it copies ${math`k - ${1}`} cells.`,
      t`In total ${math`${0} + ${1} + \cdots + ${n - 1} = \frac{${n - 1} \times ${n}}{${2}} = ${(n * (n - 1)) / 2}`}: quadratic in ${math`n`}.`,
    ],
  }),
  solve: ({ n }) => {
    let s = 0;
    for (let k = 1; k <= n; k++) s += k - 1;
    return String(s);
  },
  misconceptions: ({ n }): Misconception[] => [
    { response: String((n * (n + 1)) / 2), why: t`The first enqueue copies nothing: the queue is empty. The sum runs from ${0} to ${n - 1}.` },
    { response: String(n), why: t`Each ${ml`@`} copies the whole queue so far, not one cell: the cost grows with the queue.` },
    { response: String(n * n), why: t`Add up the actual lengths, ${0} to ${n - 1}: about half of ${math`n^{${2}}`}.` },
  ],
});

interface BatchP { ops: QOp[] }
const batchCost = generator<BatchP>({
  id: 'batched-cost',
  skill: 'Count the conses a sequence of operations costs on the two-list queue, and compare with the bound of two per element enqueued.',
  params: (rng) => {
    for (;;) {
      const ops = randomOps(rng, int(rng, 4, 7));
      const extra = int(rng, 0, 2);
      for (let i = 0; i < extra; i++) ops.push('deq');
      try {
        const q = run(ops);
        const enqs = ops.filter((o) => o !== 'deq').length;
        if (q.conses !== enqs && q.conses !== 2 * ops.length) return { ops };
      } catch {
        // a deq of an empty queue: draw again
      }
    }
  },
  sane: ({ ops }) => (ops.length >= 4 ? null : 'short'),
  problem: ({ ops }) => {
    const q = run(ops);
    const enqs = ops.filter((o) => o !== 'deq').length;
    return {
      prompt: t`On the two-list queue of FoCS Lecture ${10}, count one for the cons in each ${ml`enq`}, and one for each element ${ml`List.rev`} moves when ${ml`norm`} reverses the rear. What is the total for ${ml`qempty ${codeOf(opsCode(ops))}`}, where ${ml`enq' x q = enq q x`}?`,
      answer: { kind: 'exact', expected: String(q.conses) },
      solution: [
        t`There are ${enqs} enqueues, costing ${enqs}.`,
        t`Each reversal happens when the front list empties, and moves the whole rear list. Tracing the operations, the reversals move ${q.conses - enqs} elements in all.`,
        t`Total ${math`${enqs} + ${q.conses - enqs} = ${q.conses}`}, at most ${math`${2} \times ${enqs}`}: every element is consed once on arrival and moved at most once.`,
      ],
    };
  },
  solve: ({ ops }) => String(run(ops).conses),
  misconceptions: ({ ops }): Misconception[] => {
    const enqs = ops.filter((o) => o !== 'deq').length;
    return [
      { response: String(enqs), why: t`That counts the enqueues only. The reversals in ${ml`norm`} cons too, one per element moved.` },
      { response: String(2 * ops.length), why: t`Two per element enqueued is an upper bound, not the count: trace when the reversals happen and what they move.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const efficiency = workedProof({
  title: t`Queue efficiency`,
  source: cite('cs3110-ex5', 'Exercise: queue efficiency'),
  prompt: t`Explain why ${ml`ListQueue.enqueue`}, which is ${ml`q @ [x]`}, takes linear time in the length of the queue, and why adding ${math`n`} elements takes time quadratic in ${math`n`}. Then explain why ${ml`BatchedQueue.enqueue`} is constant time when nothing has been dequeued, and why adding ${math`n`} elements takes linear time.`,
  steps: [
    t`${ml`xs @ ys`} must copy every cell of ${ml`xs`}, because lists are immutable and the last cell of ${ml`xs`} would have to change to point at ${ml`ys`}. So ${ml`q @ [x]`} costs time proportional to the length of ${ml`q`}.`,
    t`Adding ${math`n`} elements from empty copies ${math`${0} + ${1} + \cdots + (n - ${1}) = n(n - ${1})/${2}`} cells: quadratic.`,
    t`${ml`BatchedQueue`} keeps the newest elements in a list ${ml`i`} in reverse order, so ${ml`enqueue`} is one cons onto the front of ${ml`i`} (or onto the empty outbox when the queue is empty): constant time.`,
    t`Adding ${math`n`} elements is ${math`n`} constant-time conses: linear. The cost of reversing ${ml`i`} into the outbox is paid later, by ${ml`dequeue`}, and is at most one move per element.`,
  ],
  answer: t`Append copies its first argument, so the list queue costs ${math`O(n)`} per enqueue and ${math`O(n^{${2}})`} for ${math`n`}; the batched queue conses, so ${math`O(${1})`} per enqueue and ${math`O(n)`} for ${math`n`}.`,
});

const focsTwoN = auto({
  id: 'focs-10-analysis',
  source: cite('focs-notes', 'Lecture 10, Section 10.5', true),
  title: t`The amortised count for a full run`,
  prompt: t`Starting from the empty two-list queue, ${1000} ${ml`enq`} operations are followed by ${1000} ${ml`deq`} operations. Counting one per cons in ${ml`enq`} and one per element moved by a reversal, what is the total cost?`,
  answer: { kind: 'exact', expected: String(run([...Array.from({ length: 1000 }, (_, i): QOp => ({ enq: i })), ...Array.from({ length: 1000 }, (): QOp => 'deq')]).conses) },
  solution: [
    t`Each element is consed onto the rear once (${1000} in all) and moved to the front by a reversal once, before it can be dequeued (${1000} more).`,
    t`Total ${2000}, an average of ${2} per operation: ${math`O(${1})`} amortised. But the single ${ml`deq`} that triggers the big reversal costs ${999} on its own.`,
  ],
  reference: '2000',
  verify: () => same('2n conses for n = 1000', run([...Array.from({ length: 1000 }, (_, i): QOp => ({ enq: i })), ...Array.from({ length: 1000 }, (): QOp => 'deq')]).conses, 2000),
  misconceptions: [{ response: '1000', why: t`The reversals cons too: each element is moved once from the rear to the front.` }, { response: '1000000', why: t`That is the naive append queue's order of cost. Here each element is handled a constant number of times.` }],
});

const queueOption = supervision({
  id: 'cs3110-5-queue-option',
  source: cite('cs3110-ex5', 'Exercise: queue option'),
  title: t`A queue with options`,
  prompt: t`Write a module ${ml`Queue`} with ${ml`type 'a t = 'a list`}, the next item to be removed at the head, and ${ml`empty`}, ${ml`is_empty`}, ${ml`enqueue`}, ${ml`peek`}, and ${ml`dequeue`}, the last two returning options. State the cost of each operation and say which one makes the representation slow.`,
  writeUp: 'explanation',
});
const focs101 = supervision({
  id: 'focs-10-1',
  source: cite('focs-notes', 'Lecture 10, Exercise 10.1'),
  title: t`Queues from balanced trees`,
  prompt: t`Suppose we have an implementation of queues, based on binary trees, such that each operation takes logarithmic time in the worst case. Outline the advantages and drawbacks of such an implementation compared with the two-list queue of the lecture.`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

export const functionalQueues: TopicContent = {
  topicId: 'fp.functional-queues',
  goal: t`Implement a queue as a pair of lists so that each operation costs ${math`O(${1})`} amortised, and see why the naive list queue costs ${math`O(n)`}.`,
  objective: t`Build a purely functional queue from two lists and prove each operation costs constant time amortised.`,
  why: t`Breadth-first search needs a fast queue, and amortised analysis returns for hash tables.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`The obvious queue is slow` },
    { kind: 'hook', text: t`A queue serves people in the order they arrived: join at the back, leave from the front. A list gives you the front for free. But joining at the back of an immutable list means copying the whole list every time. Can a purely functional queue be fast at both ends?` },
    { kind: 'definition', name: t`Queue`, formal: t`A [[queue|queue]] is a sequence with operations ${ml`qempty`}, ${ml`qnull`} (is it empty?), ${ml`enq`} (add at the end), ${ml`qhd`} (the element at the head), and ${ml`deq`} (remove the head): first in, first out.`, plain: t`Enqueue ${3}, then ${5}, then ${8}: the head is ${3}, and after one ${ml`deq`} it is ${5}.` },
    { kind: 'narrative', text: t`With a single list, head first, ${ml`deq`} is just the tail. But ${ml`enq q x = q @ [x]`} copies every cell of ${ml`q`}, and enqueueing ${math`n`} elements copies ${math`${0} + ${1} + \cdots + (n - ${1})`} cells: quadratic.` },
    checkFrom(naiveCost, { n: 10 }, t`The appends copy ${math`${0} + ${1} + \cdots + ${9} = ${45}`} cells.`),
    { kind: 'section', title: t`Two lists, one reversed` },
    { kind: 'narrative', text: t`The trick, from FoCS Lecture ${10} and CS${3110} Section ${5}.${6}: keep the front of the queue in one list, in order, and the back in another, reversed. Then both ends are list heads.` },
    { kind: 'definition', name: t`The two-list queue`, formal: t`${ml`Q ([x${1}; ...; xm], [y${1}; ...; yn])`} represents the queue ${ml`x${1} ... xm yn ... y${1}`}, that is ${ml`front @ List.rev rear`}. It is in normal form when the front list is empty only if the rear list is too.`, plain: t`${ml`Q (${mlList([1, 2])}, ${mlList([5, 4, 3])})`} is the queue ${1}, ${2}, ${3}, ${4}, ${5}: the rear list holds the newest elements, newest first.` },
    { kind: 'rule', text: [mlBlock`
      type 'a queue = Q of 'a list * 'a list
      let norm = function
        | Q ([], tls) -> Q (List.rev tls, [])
        | q -> q
      let enq (Q (hds, tls)) x = norm (Q (hds, x :: tls))
      let deq = function
        | Q (x :: hds, tls) -> norm (Q (hds, tls))
        | _ -> raise Empty
      let qhd = function
        | Q (x :: _, _) -> x
        | _ -> raise Empty
    `] },
    {
      kind: 'steps',
      steps: [
        { label: t`Enqueue`, text: t`${ml`enq`} conses onto the rear: one step.`, plain: t`The rear is stored reversed, so its head is the newest element.` },
        { label: t`Look at the head`, text: t`Normal form keeps the head of the queue at the head of the front list, so ${ml`qhd`} is one pattern match.`, why: { q: t`Why must the head be in the front list?`, a: t`If the front list were empty while the rear was not, the head would be at the far end of the rear list. ${ml`norm`} never allows that.` } },
        { label: t`Dequeue`, text: t`${ml`deq`} drops the head of the front list. If that empties it, ${ml`norm`} reverses the rear list into the front: as many steps as the rear is long.`, plain: t`This is the one expensive moment, and it is rare.` },
      ],
    },
    checkFrom(queueTrace, { ops: [{ enq: 4 }, { enq: 9 }, 'deq', { enq: 7 }, { enq: 2 }], ask: 'head' }, t`${4} came first and was dequeued, so ${9} is now the oldest element.`),
    { kind: 'section', title: t`Why it is fast: amortised cost` },
    { kind: 'narrative', text: t`One ${ml`deq`} can cost as much as the whole queue. So in what sense is this queue fast? In the long run: average the cost over any complete sequence of operations.` },
    { kind: 'definition', name: t`Amortised cost`, formal: t`Operations have [[amortised-cost|amortised cost]] ${math`O(f(n))`} when every sequence of ${math`m`} operations from the empty structure costs ${math`O(m \, f(n))`} in total.`, plain: t`Individual operations may be slow, but the average over any whole run is small.` },
    { kind: 'theorem', name: t`FoCS Lecture ${10}`, statement: t`Starting from the empty two-list queue, any sequence of operations that includes ${math`e`} calls of ${ml`enq`} performs at most ${math`${2}e`} conses. So each operation costs ${math`O(${1})`} amortised.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Charge each element`, text: t`Each ${ml`enq`} conses its element onto the rear list once: ${math`e`} conses in all.` },
        { label: t`Each element moves forward once`, text: t`A reversal moves elements from the rear list to the front list. Elements never move back, so each element is moved at most once: at most ${math`e`} conses for all reversals together.`, why: { q: t`Why one cons per element moved?`, a: t`${ml`List.rev`} builds the reversed list by consing each element once.` } },
        { label: t`Nothing else conses`, text: t`${ml`deq`} and ${ml`qhd`} only take lists apart.` },
        { label: t`Add up`, text: t`At most ${math`e + e = ${2}e`} conses. A sequence of ${math`m`} operations has ${math`e \le m`}, so it costs ${math`O(m)`}: ${math`O(${1})`} per operation, amortised.` },
      ],
    },
    { kind: 'pitfall', claim: t`Amortised ${math`O(${1})`} means every operation is fast.`, counterexample: t`After ${1000} enqueues, the first ${ml`deq`} reverses ${999} elements in one go. FoCS warns that such unpredictable delays make the queue unsuitable for real-time programs with deadlines.` },
    { kind: 'takeaway', text: t`Keep the back of the queue in a reversed list and reverse it only when the front runs out: each element is handled twice, so each operation is ${math`O(${1})`} amortised.` },
  ],
  examples: [
    { ...efficiency, examiner: t`The examiner wants the reason append is linear (it copies its first argument), the sum giving the quadratic total, and the per-element view for the batched queue.` },
    worked(queueTrace, { ops: [{ enq: 3 }, { enq: 6 }, { enq: 8 }, 'deq', { enq: 5 }], ask: 'front' }, t`Where the elements live after a reversal`),
    worked(batchCost, { ops: [{ enq: 2 }, { enq: 4 }, { enq: 7 }, 'deq', { enq: 9 }, 'deq', 'deq'] }, t`Counting the conses of a run`),
  ],
  generators: [queueTrace, naiveCost, batchCost],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['queue', 'amortised-cost'],
  cambridge: [focsTwoN, queueOption, focs101],
  gate: ['focs-10-1'],
  recall: [
    { front: t`What queue does ${ml`Q (front, rear)`} represent?`, back: t`${ml`front @ List.rev rear`}: the rear list holds the newest elements, newest first.` },
    { front: t`What is normal form for the two-list queue?`, back: t`The front list is empty only if the whole queue is; ${ml`norm`} reverses the rear into the front when the front runs out.` },
    { front: t`Why is the two-list queue ${math`O(${1})`} amortised?`, back: t`Each element is consed once on entry and moved once by a reversal: at most ${math`${2}e`} conses for ${math`e`} enqueues.` },
  ],
  proofOrder: [{
    title: t`The two-list queue is ${math`O(${1})`} amortised`,
    steps: [
      t`Each ${ml`enq`} conses its element once: ${math`e`} conses.`,
      t`Reversals move each element from rear to front at most once: at most ${math`e`} more.`,
      t`${ml`deq`} and ${ml`qhd`} cons nothing.`,
      t`So ${math`m`} operations cost at most ${math`${2}m`}: constant per operation on average.`,
    ],
  }],
};
