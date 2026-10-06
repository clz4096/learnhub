/**
 * comb.pigeonhole: The pigeonhole principle. The statement is the CST notes' example of an
 * existential statement (printed page 87); the method and the problems are STEP Support
 * Assignments 5 and 8, Q4 (socks in two and three colours), checked against the hints.
 */
import type { Rational } from '@learnhub/mastery';
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick, upTo } from '../math';
import { generator, type Misconception } from '../problem';
import { dmath, listOf, math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const [mn, mk, mc] = [math`n`, math`k`, math`c`];
const pairsIn = (counts: readonly number[]): number => counts.reduce((a, x) => a + Math.floor(x / 2), 0);

/** Every way to split m socks among c colours. */
function splits(m: number, c: number): number[][] {
  if (c === 1) return [[m]];
  const out: number[][] = [];
  for (let x = 0; x <= m; x++) for (const rest of splits(m - x, c - 1)) out.push([x, ...rest]);
  return out;
}

/**
 * The fewest socks that guarantee `n` pairs from `c` colours. A dynamic program over the
 * colours finds the largest draw with fewer than `n` pairs (each colour may hold any count
 * up to 2n - 1); one more sock is the answer. It never uses the formula.
 */
function socksNeeded(c: number, n: number): number {
  // most[p]: the most socks with exactly p pairs so far, or -1 when impossible.
  let most: number[] = Array.from({ length: n }, (_, p) => (p === 0 ? 0 : -1));
  for (let colour = 0; colour < c; colour++) {
    const next = Array.from({ length: n }, () => -1);
    most.forEach((socksSoFar, p) => {
      if (socksSoFar < 0) return;
      for (let x = 0; x <= 2 * n - 1; x++) {
        const q2 = p + Math.floor(x / 2);
        if (q2 < n) next[q2] = Math.max(next[q2] as number, socksSoFar + x);
      }
    });
    most = next;
  }
  return Math.max(...most) + 1;
}

/** The fewest draws that guarantee `k` of one kind among `c` kinds: the totals reachable with at most k - 1 per kind, then one more. */
function sameNeeded(c: number, k: number): number {
  let reach = new Set<number>([0]);
  for (let kind = 0; kind < c; kind++) {
    const next = new Set<number>();
    for (const r of reach) for (let x = 0; x < k; x++) next.add(r + x);
    reach = next;
  }
  return Math.max(...reach) + 1;
}

const COLOURS = ['red', 'blue', 'green', 'black', 'white'] as const;
const colourList = (c: number): string => {
  const cs = COLOURS.slice(0, c);
  return cs.length === 2 ? `${cs[0]} and ${cs[1]}` : `${cs.slice(0, -1).join(', ')}, and ${cs[cs.length - 1]}`;
};

// ---------------------------------------------------------------- generators

interface SocksP { c: number; n: number }

const socks = generator<SocksP>({
  id: 'socks',
  skill: 'Find how many socks guarantee n pairs from c colours, as in STEP Support Assignments 5 and 8, Q4.',
  params: (rng) => ({ c: int(rng, 2, 5), n: int(rng, 1, 6) }),
  sane: ({ c, n }) => (c >= 2 && c <= 5 && n >= 1 && n <= 6 ? null : 'out of range'),
  problem: ({ c, n }) => ({
    prompt: n === 1
      ? t`A drawer is full of identical socks in ${c} colours: ${colourList(c)}. How many socks must I take, without looking, to be sure of a matching pair?`
      : t`A drawer is full of identical socks in ${c} colours: ${colourList(c)}. How many socks must I take, without looking, to be sure of ${n} matching pairs (not necessarily of different colours)?`,
    answer: { kind: 'exact', expected: String(2 * n + c - 1) },
    solution: [
      t`Find the worst case first. A draw can hold ${n - 1} ${n - 1 === 1 ? 'pair' : 'pairs'} and one odd sock of every colour: ${math`${2} \times ${n - 1} + ${c} = ${2 * (n - 1) + c}`} socks, still short of ${n} ${n === 1 ? 'pair' : 'pairs'}. So ${2 * (n - 1) + c} socks are not enough.`,
      t`One more sock always works. With ${2 * n + c - 1} socks, at most ${c} colours can have an odd count, so at most ${c} socks are left unpaired, and at least ${math`${2 * n + c - 1} - ${c} = ${2 * n - 1}`} are in pairs: that is at least ${n} pairs, because pairs come in twos.`,
      t`So the answer is ${2 * n + c - 1}.`,
    ],
  }),
  solve: ({ c, n }) => String(socksNeeded(c, n)),
  misconceptions: ({ c, n }): Misconception[] => [
    { response: String(2 * n), why: t`${2 * n} socks can split as one odd sock of several colours and too few pairs. Build the worst case: as many odd socks as there are colours.` },
    { response: String(2 * n + c - 2), why: t`That is the worst case itself, which still falls short. You need one sock more than the largest draw that fails.` },
    { response: String(c + 1), why: n === 1 ? t`Right idea for one pair, but recount the colours.` : t`${c + 1} socks guarantee one pair. Each further pair needs two more socks.` },
  ],
});

interface SameP { c: number; k: number; what: 'socks' | 'months' }

const sameKind = generator<SameP>({
  id: 'same-kind',
  skill: 'Use the general pigeonhole principle: how many objects guarantee k in one box.',
  params: (rng) => {
    const what = pick(rng, ['socks', 'months'] as const);
    return { what, c: what === 'months' ? 12 : int(rng, 2, 5), k: int(rng, 2, 6) };
  },
  sane: ({ c, k }) => (c >= 2 && c <= 12 && k >= 2 && k <= 6 ? null : 'out of range'),
  problem: ({ c, k, what }) => ({
    prompt: what === 'socks'
      ? t`A drawer holds socks in ${c} colours: ${colourList(c)}, plenty of each. How many socks must I take to be sure that ${k} of them have the same colour?`
      : t`How many people must be in a room to be sure that at least ${k} of them were born in the same month?`,
    answer: { kind: 'exact', expected: String(c * (k - 1) + 1) },
    solution: [
      t`The boxes are the ${what === 'socks' ? t`${c} colours` : t`${12} months`}. The worst case puts ${k - 1} in every box: ${math`${c} \times ${k - 1} = ${c * (k - 1)}`}, and no box has ${k}.`,
      t`One more must go in a box that already has ${k - 1}. So ${math`${c} \times ${k - 1} + ${1} = ${c * (k - 1) + 1}`}, the pigeonhole principle with more than ${math`${k - 1} \times ${c}`} objects in ${c} boxes.`,
    ],
  }),
  solve: ({ c, k }) => String(sameNeeded(c, k)),
  misconceptions: ({ c, k }): Misconception[] => [
    { response: String(c * k), why: t`That fills every box to ${k}. You only need one box to reach ${k}: fill each to ${k - 1}, then add one.` },
    { response: String(c * (k - 1)), why: t`That many can still have ${k - 1} in every box. One more is needed.` },
    { response: String(c + k), why: t`Count the worst case box by box: ${k - 1} in each of the ${c} boxes.` },
  ],
});

interface WorstP { c: number; n: number }

const worstCase = generator<WorstP>({
  id: 'worst-case',
  skill: 'Show that one fewer sock is not enough by giving a draw that fails: a counterexample.',
  params: (rng) => ({ c: int(rng, 2, 4), n: int(rng, 2, 5) }),
  sane: ({ c, n }) => (c >= 2 && c <= 4 && n >= 2 && n <= 5 ? null : 'out of range'),
  problem: ({ c, n }) => {
    const m = 2 * n + c - 2;
    const example = [2 * n - 1, ...Array.from({ length: c - 1 }, () => 1)];
    return {
      prompt: t`Socks come in ${c} colours: ${colourList(c)}. Show that ${m} socks need not give ${n} pairs: write how many of each colour (in that order, separated by commas) make a draw of ${m} socks with fewer than ${n} pairs.`,
      answer: {
        kind: 'witness', count: c, example: example.join(', '),
        check: (vals: readonly Rational[]) => {
          const xs = vals.map((v) => (v.den === 1n && v.num >= 0n ? Number(v.num) : NaN));
          if (xs.some((x) => Number.isNaN(x))) return 'Each count is a whole number, zero or more.';
          const total = xs.reduce((a, b) => a + b, 0);
          if (total !== m) return `Those add up to ${total} socks, not ${m}.`;
          const p = pairsIn(xs);
          return p < n ? null : `That draw has ${p} pairs, which is enough. Leave an odd sock in every colour.`;
        },
      },
      solution: [
        t`Make every colour odd, so each colour wastes one sock: for example ${listOf(example)}.`,
        t`That is ${m} socks with ${pairsIn(example)} pairs, fewer than ${n}. So ${m} socks are not enough, and the answer to "how many guarantee ${n} pairs" is at least ${m + 1}.`,
      ],
    };
  },
  solve: ({ c, n }) => {
    // Search the draws of the right size for one that fails.
    const m = 2 * n + c - 2;
    const bad = splits(m, c).find((s) => pairsIn(s) < n);
    return bad === undefined ? 'none' : bad.join(', ');
  },
  misconceptions: ({ c, n }): Misconception[] => {
    const m = 2 * n + c - 2;
    return [
      { response: [m, ...Array.from({ length: c - 1 }, () => 0)].join(', '), why: t`All one colour pairs up almost completely. To waste socks, make every colour odd.` },
      { response: [m - 2 * (c - 1), ...Array.from({ length: c - 1 }, () => 2)].join(', '), why: t`Even counts pair up with nothing left over. Use odd counts so each colour leaves one sock unpaired.` },
    ];
  },
});

interface RemP { k: number }

const remainders = generator<RemP>({
  id: 'remainders',
  skill: 'Apply the pigeonhole principle to remainders: the boxes are the possible remainders.',
  params: (rng) => ({ k: int(rng, 3, 12) }),
  sane: ({ k }) => (k >= 3 && k <= 12 ? null : 'out of range'),
  problem: ({ k }) => ({
    prompt: t`How many whole numbers must be chosen to be sure that two of them leave the same remainder on division by ${k}?`,
    answer: { kind: 'exact', expected: String(k + 1) },
    solution: [
      t`The possible remainders are ${math`${0}, ${1}, \ldots, ${k - 1}`}: ${k} boxes.`,
      t`${k} numbers can all differ, such as ${math`${0}, ${1}, \ldots, ${k - 1}`}. With ${k + 1} numbers in ${k} boxes, two share a box. So ${k + 1}.`,
    ],
  }),
  solve: ({ k }) => {
    // The largest set of numbers with distinct remainders, found by greedy search, plus one.
    const seen = new Set<number>();
    for (let x = 0; x < 10 * k; x++) seen.add(x % k);
    return String(seen.size + 1);
  },
  misconceptions: ({ k }): Misconception[] => [
    { response: String(k), why: t`${k} numbers can have ${k} different remainders, ${math`${0}`} to ${math`${k - 1}`}. One more forces a repeat.` },
    { response: String(k - 1), why: t`There are ${k} remainders, not ${k - 1}: ${0} counts as a remainder too.` },
    { response: String(2 * k), why: t`You need only two numbers in one box, not two in every box.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const sockProblem = (o: { id: string; doc: 'step-f05' | 'step-f08'; at: string; c: number; n: number; prompt: Rich; steps: Rich[]; official: string; title: Rich }) => auto({
  id: o.id,
  source: cite(o.doc, o.at),
  title: o.title,
  prompt: o.prompt,
  answer: { kind: 'exact', expected: String(2 * o.n + o.c - 1) },
  solution: o.steps,
  reference: String(socksNeeded(o.c, o.n)),
  // Every draw of the answer's size has the pairs, and some draw of one fewer does not.
  verify: () => {
    const m = 2 * o.n + o.c - 1;
    const ok = splits(m, o.c).every((d) => pairsIn(d) >= o.n) && splits(m - 1, o.c).some((d) => pairsIn(d) < o.n);
    return same(`${o.at} by checking every draw`, ok && socksNeeded(o.c, o.n) === m, true);
  },
  misconceptions: [{ response: String(2 * o.n + o.c - 2), why: t`That many can still fail: ${o.c === 2 ? t`for example` : t`for instance`} ${listOf([2 * o.n - 1, ...Array.from({ length: o.c - 1 }, () => 1)])}. One more sock is needed.` }],
  official: { source: cite(o.doc === 'step-f05' ? 'step-f05-hints' : 'step-f08-hints', o.at), answer: o.official, agrees: true },
});

const twoColours = t`I have a drawer full of identical red socks and identical blue socks.`;
const threeColours = t`I have a drawer full of identical red socks, identical blue socks, and identical green socks.`;

const a5i = sockProblem({
  id: 'a5-q4-i', doc: 'step-f05', at: 'Q4(i)', c: 2, n: 1, official: '3', title: t`One pair, two colours`,
  prompt: t`${twoColours} How many socks must I take from the drawer to be sure that I have a matching pair?`,
  steps: [
    t`${2} socks are not enough: I might take one red and one blue.`,
    t`${3} socks are enough. List the possibilities (order does not matter): RRR, RRB, RBB, BBB. Each has a pair. Or: ${3} socks in ${2} colours, so some colour has more than one, by the [[pigeonhole-principle|pigeonhole principle]].`,
    t`So the answer is ${3}.`,
  ],
});
const a5ii = sockProblem({
  id: 'a5-q4-ii', doc: 'step-f05', at: 'Q4(ii)', c: 2, n: 2, official: '5', title: t`Two pairs, two colours`,
  prompt: t`${twoColours} How many socks must I take to be sure that I have ${2} matching pairs (not necessarily four socks of the same colour)?`,
  steps: [
    t`${4} is not necessarily enough: I might take RRRB, one pair and two odd socks.`,
    t`${5} is always enough. The first ${3} socks give a pair, by part (i), leaving one leftover sock. The next ${2} are either the same colour, a second pair, or one of each, and then one matches the leftover.`,
    t`So the answer is ${5}.`,
  ],
});
const a8i = sockProblem({
  id: 'a8-q4-i', doc: 'step-f08', at: 'Q4(i)', c: 3, n: 1, official: '4', title: t`One pair, three colours`,
  prompt: t`${threeColours} How many socks must I take to be sure that I have a matching pair?`,
  steps: [t`${3} might be one of each colour. The fourth must match one of them, so ${4}.`],
});
const a8ii = sockProblem({
  id: 'a8-q4-ii', doc: 'step-f08', at: 'Q4(ii)', c: 3, n: 2, official: '6', title: t`Two pairs, three colours`,
  prompt: t`${threeColours} How many socks must I take to be sure that I have ${2} pairs?`,
  steps: [
    t`${5} might be one pair and one of each other colour plus a third sock of the paired colour: RRRBG has only one pair.`,
    t`The sixth sock is red, blue, or green, and matches a leftover. So ${6}.`,
  ],
});

const general = (o: { id: string; doc: 'step-f05' | 'step-f08'; c: number; expr: string; official: string; colours: Rich }) => auto({
  id: o.id,
  source: cite(o.doc, 'Q4(iii)'),
  title: t`${mn} pairs, ${o.c} colours`,
  prompt: t`${o.colours} How many socks must I take to be sure that I have ${mn} matching pairs? Give an expression in ${mn}. (The source asks for a full justification as well; that is the next problem, for supervision.)`,
  answer: { kind: 'expression', expected: o.expr, variables: ['n'], domains: { n: { kind: 'integer', min: 1, max: 12 } } },
  solution: [
    t`The worst case: ${math`n - ${1}`} pairs and one odd sock of each of the ${o.c} colours, ${math`${2}(n - ${1}) + ${o.c}`} socks, still short.`,
    t`One more sock completes a pair, so the answer is ${math`${2}n + ${o.c - 1}`}.`,
  ],
  reference: o.expr,
  verify: () => {
    for (const n of upTo(6)) {
      const m = 2 * n + o.c - 1;
      const ok = splits(m, o.c).every((d) => pairsIn(d) >= n) && splits(m - 1, o.c).some((d) => pairsIn(d) < n);
      const e = same(`${o.c} colours, ${n} pairs, by checking every draw`, ok, true);
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: '2n', why: t`${math`${2}n`} socks can leave odd socks over in several colours. Count the worst case.` }],
  official: { source: cite(o.doc === 'step-f05' ? 'step-f05-hints' : 'step-f08-hints', 'Q4(iii)'), answer: o.official, agrees: true },
});

const a5iii = general({ id: 'a5-q4-iii', doc: 'step-f05', c: 2, expr: '2n + 1', official: '2n + 1', colours: twoColours });
const a8iii = general({ id: 'a8-q4-iii', doc: 'step-f08', c: 3, expr: '2n + 2', official: '2n + 2', colours: threeColours });

const a5iiiShow = supervision({
  id: 'a5-q4-iii-show',
  source: cite('step-f05', 'Q4(iii)'),
  title: t`Why ${math`${2}n + ${1}`} socks`,
  prompt: t`${twoColours} Justify fully that ${math`${2}n + ${1}`} socks guarantee ${mn} matching pairs and that ${math`${2}n`} do not. The first two parts can be done by listing; extrapolation is not a proof, so the general case needs an argument (for example, by whether the numbers of red and blue socks are odd or even).`,
  writeUp: 'proof',
  official: cite('step-f05-hints', 'Q4(iii)'),
});
const a8iiiShow = supervision({
  id: 'a8-q4-iii-show',
  source: cite('step-f08', 'Q4(iii)'),
  title: t`Why ${math`${2}n + ${2}`} socks`,
  prompt: t`${threeColours} Explain carefully why you need ${math`${2}n + ${2}`} socks to be sure of ${mn} pairs. One approach: consider ${math`${2}n`} socks with ${math`r`} red, ${math`b`} blue, and ${math`g`} green, and the cases by which of ${math`r`}, ${math`b`}, ${math`g`} are odd. Why can all three not be odd?`,
  writeUp: 'proof',
  official: cite('step-f08-hints', 'Q4(iii)'),
});
const notesProof = supervision({
  id: 'notes-87-proof',
  source: cite('cst-dm-notes', 'printed page 87, Example: The Pigeonhole Principle', true),
  title: t`Prove the pigeonhole principle`,
  prompt: t`Let ${mn} be a positive integer. Prove that if ${math`n + ${1}`} letters are put in ${mn} pigeonholes, then there is a pigeonhole with more than one letter. Which pigeonhole is it? Explain why the proof proves an existential statement without naming the pigeonhole.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const L = { boxes: 4, letters: 5 };
const MONTHS = 12;

export const pigeonhole: TopicContent = {
  topicId: 'comb.pigeonhole',
  goal: t`Use the pigeonhole principle to find how many draws guarantee a match, and show that one fewer is not enough.`,
  objective: t`Use the pigeonhole principle to find how many draws guarantee a match, and show one fewer fails.`,
  why: t`It proves that something exists without finding it, a move that STEP and the Tripos use again and again.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Someone shares your month` },
    { kind: 'hook', text: t`In any room of ${MONTHS + 1} people, two were born in the same month. You can say this with certainty without asking anyone, and without knowing which month it is. There are only ${MONTHS} months to go round, and ${MONTHS + 1} people. That small observation has a name, and it solves problems that look much harder.` },

    { kind: 'section', title: t`The principle` },
    { kind: 'theorem', name: t`The pigeonhole principle`, statement: t`Let ${mn} be a positive integer. If ${math`n + ${1}`} letters are put in ${mn} pigeonholes, then some pigeonhole holds more than one letter.` },
    { kind: 'p', text: t`This is the [[pigeonhole-principle|pigeonhole principle]], as the CST notes state it. With ${L.letters} letters in ${L.boxes} pigeonholes, some pigeonhole has at least two.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Suppose not`, text: t`Suppose every pigeonhole holds at most one letter.` },
        { label: t`Count`, text: t`Then the total number of letters is at most ${math`${1} + ${1} + \cdots + ${1} = n`}, one for each of the ${mn} pigeonholes.` },
        { label: t`Contradiction`, text: t`But there are ${math`n + ${1} > n`} letters. So some pigeonhole holds more than one.` },
      ],
    },
    { kind: 'p', text: t`Notice what the proof does not do: it never says which pigeonhole. The CST notes use it as their example of an existential statement, one that says something exists without naming it.` },
    { kind: 'theorem', name: t`General form`, statement: t`If more than ${math`kn`} objects are put in ${mn} boxes, some box holds more than ${mk} of them.` },
    { kind: 'p', text: t`Same proof: if every box held at most ${mk}, there would be at most ${math`kn`} objects. So to be sure of ${math`k + ${1}`} people sharing a birth month you need ${math`${MONTHS}k + ${1}`} people. For example, ${MONTHS * 2} people could be spread ${2} to a month, so ${MONTHS * 2 + 1} are needed for ${3} to share one.` },
    checkFrom(sameKind, { c: 4, k: 3, what: 'socks' }, t`The worst case puts ${2} of each colour: ${math`${4} \times ${2} = ${8}`} socks with no colour at ${3}. One more forces it.`),

    { kind: 'section', title: t`How many to be sure?` },
    { kind: 'narrative', text: t`"How many must I take to be sure?" questions have two halves, as the STEP Support hints insist. First the [[worst-case|worst case]]: the largest draw that still fails, which shows that number is not enough. Then an argument that one more always works. The answer is one more than the worst case.` },
    {
      kind: 'steps',
      steps: [
        { label: t`The question`, text: t`A drawer has red, blue, and green socks. How many must I take to be sure of a matching pair?` },
        { label: t`The worst case`, text: t`${3} socks might be one of each colour: no pair. So ${3} is not enough.` },
        { label: t`One more always works`, text: t`With ${4} socks in ${3} colours, the colours are pigeonholes and the socks are letters: some colour has two socks.` },
        { label: t`Answer`, text: t`${4}. In general, ${mc} colours need ${math`c + ${1}`} socks for one pair.` },
      ],
    },
    checkFrom(socks, { c: 4, n: 1 }, t`${4} socks might be one of each colour; the fifth must match one of them.`),
    { kind: 'p', text: t`For several pairs the worst case leaves one odd sock in as many colours as possible, and the proof that one more works splits by which colours have an odd number of socks: a [[proof-by-cases|proof by cases]]. That is the Cambridge problem for this lesson. Working out the first few cases suggests a formula; it does not prove it.` },

    { kind: 'section', title: t`Pigeonholes in disguise` },
    { kind: 'narrative', text: t`The skill is spotting the pigeonholes. They need not be boxes: they can be colours, months, or remainders.` },
    { kind: 'p', text: t`Choose any ${8} whole numbers. Two of them differ by a multiple of ${7}. The pigeonholes are the ${7} possible remainders on division by ${7}, ${listOf([0, 1, 2, 3, 4, 5, 6])}; with ${8} numbers, two share a remainder, and then their difference is a multiple of ${7}.`, why: { q: t`Why does a shared remainder give a multiple of ${7}?`, a: t`If ${math`a = ${7}q + r`} and ${math`b = ${7}q' + r`}, then ${math`a - b = ${7}(q - q')`}. For example ${23} and ${9} both leave ${2}, and ${math`${23} - ${9} = ${14}`}.` } },
    checkFrom(remainders, { k: 9 }, t`There are ${9} possible remainders, ${0} to ${8}; ${10} numbers force a repeat.`),

    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${mn} letters in ${mn} pigeonholes force a pigeonhole with two.`, counterexample: t`One letter in each pigeonhole. The principle needs more letters than pigeonholes.` },
    { kind: 'pitfall', claim: t`To be sure of ${3} socks of one colour from ${4} colours, you need ${math`${4} \times ${3} = ${12}`}.`, counterexample: t`That fills every colour to ${3}. Only one colour needs ${3}: the worst case is ${2} of each, ${8} socks, so ${9} suffice.` },
    { kind: 'pitfall', claim: t`If ${5} socks gave a pair every time you tried, ${5} is the answer.`, counterexample: t`Trying is not proving. For ${2} pairs from ${2} colours, the draw RRRB has ${4} socks and only one pair; showing ${5} always works needs an argument for every draw.` },
    { kind: 'takeaway', text: t`More objects than boxes forces a box with two: find the worst case that fails, then show one more always works.` },
  ],
  examples: [
    { ...workedCambridge(a5i), examiner: t`The examiner looks for both halves: a draw of ${2} that fails, and a reason ${3} always works.` },
    workedCambridge(a5ii),
    worked(sameKind, { c: 12, k: 3, what: 'months' }, t`Three people with the same birth month`),
  ],
  generators: [socks, sameKind, worstCase, remainders],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['pigeonhole-principle', 'worst-case', 'proof-by-cases'],
  cambridge: [a8i, a8ii, a5iii, a8iii, a5iiiShow, a8iiiShow, notesProof],
  // The written proofs. The single numbers are dropped: parts (i) and (ii) are one step, and the general formulas appear in the titles of the proof problems.
  gate: ['a8-q4-iii-show', 'a5-q4-iii-show', 'notes-87-proof'],
  recall: [
    { front: t`State the pigeonhole principle.`, back: t`If ${math`n + ${1}`} letters go in ${mn} pigeonholes, some pigeonhole holds more than one.` },
    { front: t`The general pigeonhole principle.`, back: t`More than ${math`kn`} objects in ${mn} boxes force a box with more than ${mk}.` },
    { front: t`The two halves of a "how many to be sure" answer.`, back: t`A worst case that fails with one fewer, and an argument that the answer always works.` },
  ],
  proofOrder: [{
    title: t`The pigeonhole principle`,
    steps: [
      t`Suppose every pigeonhole holds at most one letter.`,
      t`Then there are at most ${mn} letters in all.`,
      t`But there are ${math`n + ${1}`} letters.`,
      t`So some pigeonhole holds more than one.`,
    ],
  }],
};
