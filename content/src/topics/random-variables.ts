/**
 * rv.random-variables: a random variable is a function X: Ω → ℝ, and its distribution is
 * P(X = x) = P({ω : X(ω) = x}). From the Faculty schedule ("Discrete random variables")
 * and IA Probability Example Sheet 2 Q5(a), (b): on Ω = {0, 1}^3 with equally likely
 * outcomes there are 70 Bernoulli(1/2) random variables and no Bernoulli(1/3) ones. The
 * sheet has no official solutions; every count is checked by listing all 256 functions
 * from Ω to {0, 1}. Batch 7 adds Grinstead and Snell, Section 4.1, Exercise 38 (heads on three
 * tosses: X, Y, X + Y, X - Y) and Exercise 34, first question (the hat check indicator).
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { add, int, pick, q, str, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { choose } from '../numbers';
import { distinctFrom, draw, type Dist } from '../partv-c';
import { computedTex, dmath, listOf, math, setOf, t, texOfRational, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const S2 = 'ia-prob-sheet-2' as const;

// ---------------------------------------------------------------- a distribution from Ω

interface Experiment { name: Rich; size: number; outcome: (i: number) => readonly number[]; draw: (rng: () => number) => readonly number[] }
interface Fn { name: Rich; f: (w: readonly number[]) => number; exp: number }
const die = (rng: () => number): number => 1 + Math.floor(rng() * 6);
const coin = (rng: () => number): number => (rng() < 0.5 ? 1 : 0);
const EXPERIMENTS: readonly Experiment[] = [
  { name: t`Two fair dice are thrown, so ${math`\Omega`} is the ${36} ordered pairs of faces.`, size: 36, outcome: (i) => [1 + (i % 6), 1 + Math.floor(i / 6)], draw: (rng) => [die(rng), die(rng)] },
  { name: t`Three fair coins are tossed, so ${math`\Omega`} is the ${8} sequences of heads (${1}) and tails (${0}).`, size: 8, outcome: (i) => [i & 1, (i >> 1) & 1, (i >> 2) & 1], draw: (rng) => [coin(rng), coin(rng), coin(rng)] },
  { name: t`Four fair coins are tossed, so ${math`\Omega`} is the ${16} sequences of heads (${1}) and tails (${0}).`, size: 16, outcome: (i) => [i & 1, (i >> 1) & 1, (i >> 2) & 1, (i >> 3) & 1], draw: (rng) => [coin(rng), coin(rng), coin(rng), coin(rng)] },
];
const longestRun = (w: readonly number[]): number => { let best = 0; let run = 0; for (const x of w) { run = x === 1 ? run + 1 : 0; best = Math.max(best, run); } return best; };
const FNS: readonly Fn[] = [
  { name: t`the total of the two faces`, f: (w) => (w[0] as number) + (w[1] as number), exp: 0 },
  { name: t`the larger of the two faces`, f: (w) => Math.max(w[0] as number, w[1] as number), exp: 0 },
  { name: t`the smaller of the two faces`, f: (w) => Math.min(w[0] as number, w[1] as number), exp: 0 },
  { name: t`the absolute difference of the two faces`, f: (w) => Math.abs((w[0] as number) - (w[1] as number)), exp: 0 },
  { name: t`the number of heads`, f: (w) => w.reduce((a, b) => a + b, 0), exp: 1 },
  { name: t`the length of the longest run of heads`, f: longestRun, exp: 1 },
  { name: t`the number of heads minus the number of tails`, f: (w) => 2 * w.reduce((a, b) => a + b, 0) - w.length, exp: 1 },
  { name: t`the number of heads`, f: (w) => w.reduce((a, b) => a + b, 0), exp: 2 },
  { name: t`the length of the longest run of heads`, f: longestRun, exp: 2 },
  { name: t`the number of times a toss differs from the one before`, f: (w) => w.slice(1).filter((x, i) => x !== w[i]).length, exp: 2 },
];
interface DistP { fn: number; k: number }
const omega = (e: Experiment): (readonly number[])[] => Array.from({ length: e.size }, (_, i) => e.outcome(i));
const fnOf = (p: DistP): Fn => FNS[p.fn] as Fn;
const expOf = (p: DistP): Experiment => EXPERIMENTS[fnOf(p).exp] as Experiment;
const valuesOf = (p: DistP): number[] => [...new Set(omega(expOf(p)).map(fnOf(p).f))].sort((a, b) => a - b);
const distVal = (p: DistP): Rational => q(omega(expOf(p)).filter((w) => fnOf(p).f(w) === p.k).length, expOf(p).size);
function distMis(p: DistP): [Rational, Rich][] {
  const e = expOf(p);
  const f = fnOf(p).f;
  const vals = valuesOf(p);
  const atMost = q(omega(e).filter((w) => f(w) <= p.k).length, e.size);
  const out: [Rational, Rich][] = [
    [q(1, vals.length), t`${math`X`} takes ${vals.length} values, but they are not equally likely. Count the outcomes ${math`\omega`} with ${math`X(\omega) = ${p.k}`}.`],
    [atMost, t`That is ${math`\mathbb{P}(X \le ${p.k})`}. The question asks for ${math`X = ${p.k}`} only.`],
  ];
  if (fnOf(p).exp === 0) {
    // Unordered pairs: the 21 multisets of faces, wrongly treated as equally likely.
    let hit = 0;
    let all = 0;
    for (let a = 1; a <= 6; a++) for (let b = a; b <= 6; b++) { all++; if (f([a, b]) === p.k) hit++; }
    out.push([q(hit, all), t`The ${21} unordered pairs are not equally likely: a double such as ${math`(${3}, ${3})`} happens one way, a mixed pair two ways. Count in the ${36} ordered pairs.`]);
  } else {
    const hit = omega(e).filter((w) => f(w) === p.k).length;
    out.push([q(hit, e.size * 2), t`${math`\Omega`} has ${e.size} equally likely outcomes, so divide the count ${hit} by ${e.size}.`]);
  }
  return out;
}

const distributionFromOmega = generator<DistP>({
  id: 'distribution-from-omega',
  skill: 'Find a value of the distribution of a random variable by counting the outcomes that map to it.',
  params: (rng) => {
    for (;;) {
      const fn = int(rng, 0, FNS.length - 1);
      const vals = valuesOf({ fn, k: 0 });
      const p: DistP = { fn, k: pick(rng, vals) };
      if (distVal(p).num > 0n && distinctFrom(str(distVal(p)), distMis(p).map(([x]) => str(x))) >= 2) return p;
    }
  },
  sane: (p) => (valuesOf(p).includes(p.k) ? null : 'not a value of X'),
  problem: (p) => {
    const e = expOf(p);
    const hits = omega(e).filter((w) => fnOf(p).f(w) === p.k).length;
    return {
      prompt: t`${e.name} Let ${math`X`} be ${fnOf(p).name}. Find ${math`\mathbb{P}(X = ${p.k})`}.`,
      answer: { kind: 'exact', expected: str(distVal(p)) },
      solution: [
        t`${math`X`} is a function on ${math`\Omega`}, and ${math`\mathbb{P}(X = ${p.k}) = \mathbb{P}(\{\omega : X(\omega) = ${p.k}\})`}.`,
        hits === 1
          ? t`One of the ${e.size} equally likely outcomes has ${math`X(\omega) = ${p.k}`}, so the probability is ${distVal(p)}.`
          : t`${hits} of the ${e.size} equally likely outcomes have ${math`X(\omega) = ${p.k}`}, so the probability is ${math`\frac{${hits}}{${e.size}} = ${distVal(p)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Build the whole distribution of X outcome by outcome, then read off one value.
    const e = expOf(p);
    const pmf = new Map<number, Rational>();
    for (let i = 0; i < e.size; i++) {
      const x = fnOf(p).f(e.outcome(i));
      pmf.set(x, add(pmf.get(x) ?? q(0), q(1, e.size)));
    }
    return str(pmf.get(p.k) ?? q(0));
  },
  misconceptions: (p): Misconception[] => distMis(p).map(([x, why]) => ({ response: str(x), why })),
  trial: (p, rng) => fnOf(p).f(expOf(p).draw(rng)) === p.k,
});

// ---------------------------------------------------------------- counting Bernoulli variables

interface CountP { n: number; k: number; d: number }
const countVal = ({ n, k, d }: CountP): number => ((k * n) % d === 0 ? choose(n, (k * n) / d) : 0);
function countMis({ n, k, d }: CountP): [number, Rich][] {
  const near = Math.round((k * n) / d);
  return [
    [2 ** n, t`${2 ** n} is the number of all functions from ${math`\Omega`} to ${math`\{${0}, ${1}\}`}. Only those with ${math`\mathbb{P}(X = ${1}) = ${q(k, d)}`} count.`],
    [n, t`A Bernoulli variable is fixed by the event ${math`\{X = ${1}\}`}, a set of outcomes, not a single outcome. Count the subsets of the right size.`],
    [(k * n) % d === 0 ? choose(n, (k * n) / d) * 2 : choose(n, near), (k * n) % d === 0
      ? t`${math`X`} and ${math`${1} - X`} are different random variables, but each is counted once when you count the events ${math`\{X = ${1}\}`}: do not double.`
      : t`Each event has probability a multiple of ${q(1, n)}, and ${q(k, d)} is not one. Rounding is not allowed: there are none.`],
  ];
}

const countBernoulli = generator<CountP>({
  id: 'count-bernoulli',
  skill: 'Count the Bernoulli random variables of a given parameter on a finite space of equally likely outcomes.',
  params: (rng) => {
    for (;;) {
      const n = pick(rng, [4, 5, 6, 8, 9, 10, 12]);
      const [k, d] = rng() < 0.75 ? (() => { const j = int(rng, 1, n - 1); const g = gcdN(j, n); return [j / g, n / g]; })() : pick(rng, [[1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [1, 6]] as const);
      const p: CountP = { n, k, d };
      if (k < d && distinctFrom(String(countVal(p)), countMis(p).map(([x]) => String(x))) >= 2) return p;
    }
  },
  sane: ({ n, k, d }) => (n <= 12 && k > 0 && k < d ? null : 'out of range'),
  problem: (p) => {
    const m = (p.k * p.n) / p.d;
    return {
      prompt: t`${math`\Omega = \{${1}, ${2}, \ldots, ${p.n}\}`} with equally likely outcomes. How many different Bernoulli random variables with parameter ${q(p.k, p.d)} can be defined on ${math`\Omega`}?`,
      answer: { kind: 'exact', expected: String(countVal(p)) },
      solution: Number.isInteger(m)
        ? [
          t`A Bernoulli variable takes values ${0} and ${1}, so it is fixed by the event ${math`\{X = ${1}\}`}, and needs ${math`\mathbb{P}(X = ${1}) = ${q(p.k, p.d)}`}.`,
          t`Each outcome has probability ${q(1, p.n)}, so the event has ${m} outcomes. There are ${math`\binom{${p.n}}{${m}} = ${countVal(p)}`} such events.`,
        ]
        : [
          t`Every event has probability a multiple of ${q(1, p.n)}, and ${q(p.k, p.d)} is not one, so no event has that probability.`,
          t`So there are ${0} such random variables.`,
        ],
    };
  },
  solve: ({ n, k, d }) => {
    // Every function from Ω to {0, 1}, as a bit mask, kept when exactly the right share of outcomes map to 1.
    let c = 0;
    for (let mask = 0; mask < 2 ** n; mask++) {
      let ones = 0;
      for (let i = 0; i < n; i++) if ((mask >> i) & 1) ones++;
      if (ones * d === k * n) c++;
    }
    return String(c);
  },
  misconceptions: (p): Misconception[] => countMis(p).map(([x, why]) => ({ response: String(x), why })),
});
function gcdN(a: number, b: number): number { return b === 0 ? a : gcdN(b, a % b); }

// ---------------------------------------------------------------- a function of a random variable

type G = 'square' | 'abs' | 'shift-square';
interface FunP { d: Dist; g: G; y: number }
const gOf = (g: G) => (x: number): number => (g === 'square' ? x * x : g === 'abs' ? Math.abs(x) : (x - 1) * (x - 1));
const gText = (g: G): Rich => (g === 'square' ? t`${math`Y = X^{${2}}`}` : g === 'abs' ? t`${math`Y = |X|`}` : t`${math`Y = (X - ${1})^{${2}}`}`);
const DISTS: readonly Dist[] = [
  { xs: [-2, -1, 0, 1, 2], ps: [q(1, 10), q(1, 5), q(1, 5), q(3, 10), q(1, 5)] },
  { xs: [-2, -1, 0, 1, 2], ps: [q(1, 8), q(1, 4), q(1, 8), q(1, 8), q(3, 8)] },
  { xs: [-1, 0, 1, 2, 3], ps: [q(1, 6), q(1, 6), q(1, 3), q(1, 4), q(1, 12)] },
  { xs: [-3, -1, 1, 3], ps: [q(1, 5), q(1, 10), q(2, 5), q(3, 10)] },
  { xs: [-2, 0, 1, 2, 4], ps: [q(1, 4), q(1, 8), q(1, 8), q(1, 4), q(1, 4)] },
  { xs: [-1, 0, 1, 2, 3], ps: [q(1, 10), q(3, 10), q(1, 5), q(1, 5), q(1, 5)] },
];
const funVal = ({ d, g, y }: FunP): Rational => d.xs.reduce((acc, x, i) => (gOf(g)(x) === y ? add(acc, d.ps[i] as Rational) : acc), q(0));
function funMis(p: FunP): [Rational, Rich][] {
  const pre = p.d.xs.filter((x) => gOf(p.g)(x) === p.y);
  const one = pre.length > 0 ? (p.d.ps[p.d.xs.indexOf(Math.max(...pre))] as Rational) : q(0);
  const same = p.d.xs.includes(p.y) ? (p.d.ps[p.d.xs.indexOf(p.y)] as Rational) : q(0);
  return [
    [one, t`${math`Y = ${p.y}`} for more than one value of ${math`X`}: add the probabilities of every ${math`x`} with ${math`g(x) = ${p.y}`}.`],
    [same, t`That is ${math`\mathbb{P}(X = ${p.y})`}. Find the values of ${math`X`} that ${gText(p.g)} sends to ${p.y}.`],
  ];
}

const functionOfRv = generator<FunP>({
  id: 'function-of-rv',
  skill: 'Find the distribution of a function of a random variable by adding the probabilities of all the values that map to the same value.',
  params: (rng) => {
    for (;;) {
      const d = pick(rng, DISTS);
      const g = pick(rng, ['square', 'abs', 'shift-square'] as const);
      const ys = [...new Set(d.xs.map(gOf(g)))].filter((y) => d.xs.filter((x) => gOf(g)(x) === y).length >= 2);
      if (ys.length === 0) continue;
      const p: FunP = { d, g, y: pick(rng, ys) };
      if (distinctFrom(str(funVal(p)), funMis(p).map(([x]) => str(x))) >= 2) return p;
    }
  },
  sane: ({ d }) => (d.xs.length === d.ps.length ? null : 'out of range'),
  problem: (p) => {
    const pre = p.d.xs.filter((x) => gOf(p.g)(x) === p.y);
    return {
      prompt: t`${math`X`} takes the values ${listOf(p.d.xs)} with probabilities ${computedTex(p.d.ps.map(texOfRational).join(', '))}, in that order. Let ${gText(p.g)}. Find ${math`\mathbb{P}(Y = ${p.y})`}.`,
      answer: { kind: 'exact', expected: str(funVal(p)) },
      solution: [
        t`${math`Y = ${p.y}`} exactly when ${math`X`} is one of ${listOf(pre)}.`,
        t`So ${math`\mathbb{P}(Y = ${p.y}) = ${computedTex(pre.map((x) => texOfRational(p.d.ps[p.d.xs.indexOf(x)] as Rational)).join(' + '))} = ${funVal(p)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // The distribution of Y, built value by value; then the one asked for.
    const pmf = new Map<number, Rational>();
    p.d.xs.forEach((x, i) => { const y = gOf(p.g)(x); pmf.set(y, add(pmf.get(y) ?? q(0), p.d.ps[i] as Rational)); });
    return str(pmf.get(p.y) ?? q(0));
  },
  misconceptions: (p): Misconception[] => funMis(p).map(([x, why]) => ({ response: str(x), why })),
  trial: (p, rng) => gOf(p.g)(draw(p.d, rng)) === p.y,
});

// ---------------------------------------------------------------- Cambridge problems

/** How many functions from {0, 1}^3 (8 equally likely outcomes) to {0, 1} have P(X = 1) = target. */
function bernoulliOnCube(target: Rational): number {
  let c = 0;
  for (let mask = 0; mask < 256; mask++) {
    let ones = 0;
    for (let i = 0; i < 8; i++) if ((mask >> i) & 1) ones++;
    if (str(q(ones, 8)) === str(target)) c++;
  }
  return c;
}
const q5a = auto({
  id: 'ia-s2-q5-a',
  source: cite(S2, 'Q5(a)'),
  title: t`Bernoulli variables with parameter ${q(1, 2)}`,
  prompt: t`Consider the probability space ${math`\Omega = \{${0}, ${1}\}^{${3}}`} with equally likely outcomes. How many different Bernoulli random variables of parameter ${q(1, 2)} can be defined on ${math`\Omega`}?`,
  answer: { kind: 'exact', expected: String(choose(8, 4)) },
  solution: [
    t`${math`\Omega`} has ${8} outcomes, each with probability ${q(1, 8)}. A Bernoulli variable ${math`X`} is fixed by the event ${math`\{X = ${1}\}`}: ${math`X`} is its indicator.`,
    t`${math`\mathbb{P}(X = ${1}) = ${q(1, 2)}`} exactly when that event has ${4} outcomes, so there are ${math`\binom{${8}}{${4}} = ${choose(8, 4)}`} such variables.`,
  ],
  reference: String(choose(8, 4)),
  verify: () => same('Bernoulli(1/2) functions on {0,1}^3', bernoulliOnCube(q(1, 2)), choose(8, 4)),
  misconceptions: [
    { response: String(2 ** 8), why: t`That counts every function from ${math`\Omega`} to ${math`\{${0}, ${1}\}`}. Only those with ${math`\mathbb{P}(X = ${1}) = ${q(1, 2)}`} count.` },
    { response: String(choose(8, 4) / 2), why: t`${math`X`} and ${math`${1} - X`} are different random variables, even though one determines the other. Count both.` },
  ],
});
const q5b = auto({
  id: 'ia-s2-q5-b',
  source: cite(S2, 'Q5(b)'),
  title: t`Bernoulli variables with parameter ${q(1, 3)}`,
  prompt: t`On ${math`\Omega = \{${0}, ${1}\}^{${3}}`} with equally likely outcomes, how many Bernoulli random variables of parameter ${q(1, 3)} can be defined?`,
  nudge: t`Not quite. Before counting, check which probabilities an event on this space can have at all.`,
  hints: [
    t`What probability does an event made of ${math`k`} outcomes of ${math`\Omega`} have?`,
    t`For which ${math`k`} would that probability equal ${q(1, 3)}?`,
    t`Which values of ${math`k`} from ${0} to ${8} are possible, and does any of them work?`,
  ],
  answer: { kind: 'exact', expected: '0' },
  solution: [
    t`Every event of ${math`\Omega`} has probability a multiple of ${q(1, 8)}: ${math`\frac{k}{${8}}`} for ${math`k`} outcomes.`,
    t`${math`\frac{k}{${8}} = ${q(1, 3)}`} would need ${math`${3}k = ${8}`}, which no whole number ${math`k`} solves. So there are none.`,
    t`Check that a probability can be reached before counting the ways to reach it.`,
  ],
  reference: '0',
  verify: () => same('Bernoulli(1/3) functions on {0,1}^3', bernoulliOnCube(q(1, 3)), 0),
  misconceptions: [
    { response: String(choose(8, 3)), why: t`Events of ${3} outcomes have probability ${q(3, 8)}, not ${q(1, 3)}. No event has probability exactly ${q(1, 3)}.` },
    { response: String(choose(8, 2) + choose(8, 3)), why: t`No event has probability exactly ${q(1, 3)}; approximate values do not count.` },
  ],
});
const quarter = auto({
  id: 'ia-s2-q5-quarter',
  source: cite(S2, 'Q5', true),
  title: t`Bernoulli variables with parameter ${q(1, 4)}`,
  prompt: t`On ${math`\Omega = \{${0}, ${1}\}^{${3}}`} with equally likely outcomes, how many Bernoulli random variables of parameter ${q(1, 4)} can be defined?`,
  nudge: t`Not quite. A Bernoulli variable is fixed by one event, so count events rather than functions.`,
  hints: [
    t`Which event on ${math`\Omega`} determines a Bernoulli random variable completely?`,
    t`How many outcomes must that event contain for its probability to be ${q(1, 4)}?`,
    t`How many subsets of that size does a set of ${8} outcomes have?`,
  ],
  answer: { kind: 'exact', expected: String(choose(8, 2)) },
  solution: [t`The event ${math`\{X = ${1}\}`} needs probability ${math`${q(1, 4)} = \frac{${2}}{${8}}`}, so ${2} of the ${8} outcomes: ${math`\binom{${8}}{${2}} = ${choose(8, 2)}`}.`, t`A Bernoulli variable is the indicator of an event, so counting them is counting events.`],
  reference: String(choose(8, 2)),
  verify: () => same('Bernoulli(1/4) functions on {0,1}^3', bernoulliOnCube(q(1, 4)), choose(8, 2)),
  misconceptions: [{ response: String(choose(8, 4)), why: t`That is the count for parameter ${q(1, 2)}. Parameter ${q(1, 4)} needs events of ${2} outcomes.` }],
});
const scheduleRv = supervision({
  id: 'schedule-random-variables',
  source: cite('tripos-schedules', 'IA Probability, Discrete random variables', true),
  title: t`Functions of random variables`,
  prompt: t`Let ${math`\Omega`} be countable with point masses ${math`p_{\omega}`}, and let ${math`X, Y`} be random variables on it. Show that ${math`X + Y`}, ${math`XY`}, and ${math`g(X)`} for any ${math`g: \mathbb{R} \to \mathbb{R}`} are random variables, and that ${math`\mathbb{P}(g(X) = y) = \sum_{x : g(x) = y} \mathbb{P}(X = x)`}. Give two different random variables on a fair die's ${math`\Omega`} with the same distribution. Does the distribution of ${math`X`} and of ${math`Y`} determine the distribution of ${math`X + Y`}?`,
  hints: [
    t`On a countable ${math`\Omega`} where every subset is an event, which functions ${math`\Omega \to \mathbb{R}`} are random variables?`,
    t`The event ${math`\{g(X) = y\}`} is a union of events ${math`\{X = x\}`}: which ones, and are they disjoint?`,
    t`For the last two parts, which rearrangement of a die's faces keeps the distribution of the score, and does it keep the distribution of a sum?`,
  ],
  writeUp: 'proof',
});

// ---------------------------------------------------------------- Cambridge problems: gates (batch 7)

/** Three tosses as 0/1 lists; X = heads on the first two, Y = heads on the third. */
const TOSSES = [0, 1].flatMap((a) => [0, 1].flatMap((b) => [0, 1].map((c) => [a, b, c] as const)));
const VALUES38 = [-1, 0, 1, 2, 3] as const;
const RV38: readonly { name: Rich; f: (o: readonly [number, number, number]) => number }[] = [
  { name: [math`X`], f: (o) => o[0] + o[1] },
  { name: [math`Y`], f: (o) => o[2] },
  { name: [math`Z = X + Y`], f: (o) => o[0] + o[1] + o[2] },
  { name: [math`W = X - Y`], f: (o) => o[0] + o[1] - o[2] },
];
const dist38 = (f: (o: readonly [number, number, number]) => number): string[] =>
  VALUES38.map((v) => str(q(TOSSES.filter((o) => f(o) === v).length, TOSSES.length)));

const gs4138 = auto({
  id: 'gs-4-1-38',
  source: cite('gs-ch4', 'Section 4.1, Exercise 38 (page 156)'),
  title: t`Heads before and after`,
  prompt: t`A fair coin is tossed three times. Let ${math`X`} be the number of heads that turn up on the first two tosses and ${math`Y`} the number of heads that turn up on the third toss. Give the distribution of ${math`X`}, ${math`Y`}, ${math`Z = X + Y`}, and ${math`W = X - Y`}: write each probability in the table, ${0} where the value cannot happen.`,
  nudge: t`Not quite. List the eight equally likely outcomes once and read every variable off that list.`,
  hints: [
    t`How many equally likely outcomes do three tosses have?`,
    t`For each outcome, what are ${math`X`} and ${math`Y`}, and so ${math`Z`} and ${math`W`}?`,
    t`For each variable, how many outcomes give each value from ${math`${-1}`} to ${3}?`,
  ],
  answer: {
    kind: 'table', columns: [t`variable`, ...VALUES38.map((v) => [math`${v}`])], cell: 'exact',
    rows: RV38.map(({ name }) => [name, ...VALUES38.map(() => null)]),
    expected: RV38.flatMap(({ f }) => dist38(f)),
  },
  solution: [
    t`The ${8} sequences of three tosses are equally likely. ${math`X`} is ${0}, ${1}, ${2} with probabilities ${q(1, 4)}, ${q(1, 2)}, ${q(1, 4)}, and ${math`Y`} is ${0} or ${1}, each ${q(1, 2)}.`,
    t`${math`Z`} counts all the heads: ${0}, ${1}, ${2}, ${3} in ${1}, ${3}, ${3}, ${1} of the ${8} sequences.`,
    t`${math`W = ${-1}`} needs no head first and a head third: ${1} sequence. ${math`W = ${0}`}: both zero, or one head first and one third, ${math`${1} + ${2} = ${3}`} sequences. ${math`W = ${1}`}: one head first and none third, or two first and one third, ${math`${2} + ${1} = ${3}`}. ${math`W = ${2}`}: ${1} sequence.`,
    t`List the outcomes once; every variable on the space is read off the same list.`,
  ],
  reference: RV38.flatMap(({ f }) => dist38(f)),
  verify: () => {
    for (const { f } of RV38) {
      const total = TOSSES.filter((o) => VALUES38.includes(f(o) as (typeof VALUES38)[number])).length;
      const e = same('every outcome has a listed value', total, TOSSES.length);
      if (e !== null) return e;
    }
    return same('W = X - Y', dist38((o) => o[0] + o[1] - o[2]).join(' '), ['1/8', '3/8', '3/8', '1/8', '0'].join(' '));
  },
});

const HATS = 4;
/** Every way to hand back 4 hats, as lists: entry i is the hat woman i receives. */
const hatOrders = (): number[][] => {
  const out: number[][] = [];
  const go = (pre: number[]): void => {
    if (pre.length === HATS) { out.push(pre); return; }
    for (let h = 0; h < HATS; h++) if (!pre.includes(h)) go([...pre, h]);
  };
  go([]);
  return out;
};
const gs4134 = auto({
  id: 'gs-4-1-34',
  source: cite('gs-ch4', 'Section 4.1, Exercise 34, first question (page 155)', true),
  title: t`Her own hat back`,
  prompt: t`Four women, A, B, C, and D, check their hats, and the hats are returned in a random manner. Let ${math`\Omega`} be the set of all possible permutations of A, B, C, D, each equally likely. Let ${math`X_j = ${1}`} if the ${math`j`}th woman gets her own hat back and ${0} otherwise. ${math`X_j`} is a Bernoulli random variable: find ${math`\mathbb{P}(X_j = ${1})`}.`,
  nudge: t`Not quite. Fix woman ${math`j`}'s hat in place and count the ways to hand out the rest.`,
  hints: [
    t`How many equally likely ways are there to return four hats?`,
    t`If woman ${math`j`} gets her own hat, how freely can the other three hats be handed out?`,
    t`What fraction of all the orders is that?`,
  ],
  answer: { kind: 'exact', expected: str(q(1, HATS)) },
  solution: [
    t`There are ${math`${4}! = ${24}`} equally likely ways to return the hats. Woman ${math`j`} gets her own hat when the other three hats go to the other three women in any order: ${math`${3}! = ${6}`} ways.`,
    t`So ${math`\mathbb{P}(X_j = ${1}) = \frac{${6}}{${24}} = ${q(1, HATS)}`} and ${math`\mathbb{P}(X_j = ${0}) = ${q(3, 4)}`}, the same for every ${math`j`}.`,
    t`Fix the one position the event cares about and count the rest freely.`,
  ],
  reference: str(q(1, HATS)),
  verify: () => {
    const all = hatOrders();
    return same('orders giving woman 0 her hat', str(q(all.filter((o) => o[0] === 0).length, all.length)), str(q(1, HATS)));
  },
  misconceptions: [{ response: str(q(1, 24)), why: t`That is the chance that every woman gets her own hat. For one woman, the other three hats may go anywhere: ${math`${3}!`} of the ${math`${4}!`} orders.` }],
});

// ---------------------------------------------------------------- lesson

const SUM_FOUR = q(3, 36);
const claims: ProbabilityClaim[] = [
  { what: 'two dice: the total is 4', exact: SUM_FOUR, trial: (rng) => die(rng) + die(rng) === 4 },
];
const twoDice = Array.from({ length: 36 }, (_, i) => [1 + (i % 6), 1 + Math.floor(i / 6)] as const);
const FACES = Array.from({ length: 6 }, (_, i) => i + 1);
const totalCount = (s: number): number => twoDice.filter(([a, b]) => a + b === s).length;
const [mX, mOmega, mA] = [math`X`, math`\Omega`, math`A`];

export const randomVariables: TopicContent = {
  topicId: 'rv.random-variables',
  goal: t`Treat a random variable as a function on ${math`\Omega`}, and find its distribution by adding the probabilities of the outcomes that give each value.`,
  objective: t`Treat a random variable as a function on the sample space and find its distribution.`,
  why: t`Expectation, variance and every named distribution are statements about random variables; this is the bridge.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Where does the number live?` },
    { kind: 'hook', text: t`Throw two fair dice. All ${36} ordered pairs of faces are equally likely. Yet the total ${7} turns up ${totalCount(7)} times as often as the total ${2}. How can equally likely outcomes produce totals that are not equally likely?` },
    { kind: 'narrative', text: t`The answer is that the total is not an outcome. It is something you compute from an outcome. The outcome is a pair such as ${math`(${3}, ${4})`}; the total is the number ${7} you read off it. Many pairs give the same total: ${totalCount(7)} pairs give ${7}, only ${totalCount(2)} gives ${2}.` },
    { kind: 'narrative', text: t`So keep the probability where it was, on the outcomes, and think of the total as a rule that turns each outcome into a number. That rule is a function, and it has a name.` },
    { kind: 'section', title: t`Random variables and their distributions` },
    {
      kind: 'definition',
      name: t`Random variable`,
      formal: t`Let ${mOmega} be a countable probability space with probability ${math`\mathbb{P}`}. A [[random-variable|random variable]] is a function ${math`X: \Omega \to \mathbb{R}`}.`,
      plain: t`In plain words: a rule that gives a number for every outcome. For two dice, ${math`S(a, b) = a + b`}, so ${math`S(${3}, ${4}) = ${7}`}. Despite the name, it is neither random nor a variable: the randomness is in which ${math`\omega`} occurs.`,
    },
    {
      kind: 'definition',
      name: t`Distribution`,
      formal: t`The [[rv-distribution|distribution]] of ${mX} is the list of probabilities ${dmath`\mathbb{P}(X = x) = \mathbb{P}\big(\{\omega \in \Omega : X(\omega) = x\}\big)`} for each value ${math`x`} that ${mX} takes.`,
      plain: t`In plain words: for each possible value, collect the outcomes that give it, and add up their probabilities. ${math`\{X = x\}`} is shorthand for that set of outcomes.`,
    },
    {
      kind: 'steps',
      steps: [
        { label: t`Find the outcomes`, text: t`${math`\{S = ${4}\} = \{(${1}, ${3}), (${2}, ${2}), (${3}, ${1})\}`}.`, plain: t`Order matters: ${math`(${1}, ${3})`} and ${math`(${3}, ${1})`} are different outcomes.` },
        { label: t`Add their probabilities`, text: t`Each has probability ${q(1, 36)}, so`, eq: [dmath`\mathbb{P}(S = ${4}) = ${3} \times \frac{${1}}{${36}} = ${SUM_FOUR}.`] },
      ],
    },
    { kind: 'theorem', statement: t`If ${mX} takes the values ${math`x_{${1}}, x_{${2}}, \ldots`}, then ${math`\sum_{i} \mathbb{P}(X = x_{i}) = ${1}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`The events split the space`, text: t`Each ${math`\omega \in \Omega`} has exactly one value ${math`X(\omega)`}, so the events ${math`\{X = x_{i}\}`} are pairwise disjoint and their union is ${mOmega}.`, plain: t`A function sends each outcome to one number, never two, so every outcome sits in exactly one of these sets.` },
        { label: t`Add`, text: t`There are countably many values, so by countable additivity,`, eq: [dmath`\sum_{i} \mathbb{P}(X = x_{i}) = \mathbb{P}\Big(\bigcup_{i} \{X = x_{i}\}\Big) = \mathbb{P}(\Omega) = ${1}.`], why: { q: t`Why only countably many values?`, a: t`${mOmega} is countable and each value comes from at least one outcome, so there are at most as many values as outcomes.` } },
      ],
    },
    checkFrom(distributionFromOmega, { fn: 4, k: 2 }, t`Exactly two heads happens at ${3} of the ${8} sequences (the tail can be first, second or third), so the probability is ${q(3, 8)}.`),
    { kind: 'pitfall', claim: t`The outcomes are equally likely, so the values of a random variable are equally likely too.`, counterexample: t`For two dice, ${math`\mathbb{P}(S = ${2}) = ${q(totalCount(2), 36)}`} but ${math`\mathbb{P}(S = ${7}) = ${q(totalCount(7), 36)}`}: different numbers of outcomes give each total.` },
    { kind: 'section', title: t`Indicators and Bernoulli variables` },
    {
      kind: 'definition',
      name: t`Indicator`,
      formal: t`The indicator of an event ${math`A \subseteq \Omega`} is the random variable ${math`\mathbf{${1}}_{A}`} with ${math`\mathbf{${1}}_{A}(\omega) = ${1}`} if ${math`\omega \in A`} and ${0} otherwise.`,
      plain: t`In plain words: a switch that reads ${1} when ${mA} happens. Its distribution is ${math`\mathbb{P}(\mathbf{${1}}_{A} = ${1}) = \mathbb{P}(A)`}, so it is Bernoulli with parameter ${math`\mathbb{P}(A)`}.`,
    },
    { kind: 'p', text: t`The converse holds too: a random variable ${mX} that only takes the values ${0} and ${1} is the indicator of the event ${math`A = \{X = ${1}\}`}. So counting Bernoulli variables on a space is counting events. On ${math`\Omega = ${setOf(FACES)}`}, a fair die, a Bernoulli variable with parameter ${q(1, 3)} is the indicator of an event of ${2} faces: there are ${math`\binom{${6}}{${2}} = ${choose(6, 2)}`} of them.` },
    checkFrom(countBernoulli, { n: 6, k: 1, d: 3 }, t`Parameter ${q(1, 3)} on ${6} equally likely outcomes means an event of ${2} outcomes, and there are ${math`\binom{${6}}{${2}} = ${choose(6, 2)}`} such events.`),
    { kind: 'section', title: t`Functions of a random variable` },
    { kind: 'narrative', text: t`If ${mX} is a random variable, so is ${math`X^{${2}}`}, or ${math`\lvert X \rvert`}: compose the functions. Its distribution comes from that of ${mX} without going back to ${mOmega}.` },
    { kind: 'theorem', statement: t`For any ${math`g: \mathbb{R} \to \mathbb{R}`}, ${math`g(X)`} is a random variable and ${dmath`\mathbb{P}(g(X) = y) = \sum_{x : g(x) = y} \mathbb{P}(X = x).`}` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`It is a function on the space`, text: t`${math`g(X)`} is the composite ${math`\omega \mapsto g(X(\omega))`}, a function ${math`\Omega \to \mathbb{R}`}.` },
        { label: t`Split the event`, text: t`${math`g(X(\omega)) = y`} exactly when ${math`X(\omega)`} is some ${math`x`} with ${math`g(x) = y`}, so ${math`\{g(X) = y\} = \bigcup_{x : g(x) = y} \{X = x\}`}, a disjoint union.` },
        { label: t`Add`, text: t`By countable additivity, ${math`\mathbb{P}(g(X) = y) = \sum_{x : g(x) = y} \mathbb{P}(X = x)`}.` },
      ],
    },
    checkFrom(functionOfRv, { d: DISTS[0] as Dist, g: 'abs', y: 1 }, t`${math`\lvert X \rvert = ${1}`} when ${math`X = -${1}`} or ${math`X = ${1}`}: ${math`${q(1, 5)} + ${q(3, 10)} = ${q(1, 2)}`}.`),
    { kind: 'pitfall', claim: t`Two random variables with the same distribution are the same random variable.`, counterexample: t`On one fair die, the face ${mX} and ${math`${7} - X`} are both uniform on ${math`${1}, \ldots, ${6}`}, yet they differ at every outcome: when ${math`X = ${1}`}, ${math`${7} - X = ${6}`}.` },
    { kind: 'takeaway', text: t`A random variable is a function on outcomes; its distribution adds up the probabilities of the outcomes that give each value.` },
  ],
  examples: [
    workedCambridge(q5a),
    worked(distributionFromOmega, { fn: 1, k: 4 }, t`The larger of two faces`),
    worked(functionOfRv, { d: DISTS[0] as Dist, g: 'square', y: 4 }, t`Squaring a random variable`),
  ],
  generators: [distributionFromOmega, countBernoulli, functionOfRv],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['random-variable', 'rv-distribution'],
  claims,
  cambridge: withUses([q5b, quarter, scheduleRv, gs4138, gs4134], {
    'ia-s2-q5-quarter': { sections: ['Indicators and Bernoulli variables'], note: t`Counting Bernoulli variables on a small space` },
    'gs-4-1-38': { sections: ['Random variables and their distributions', 'Functions of a random variable'], note: t`Distributions of functions of two counts` },
  }),
  // The parameter one quarter needs the count of events of two outcomes. Parameter one third has the
  // answer 0, which can be guessed. The schedule write-up is not from a gate document.
  // Batch 7: four variables built on one space, X, Y, X + Y, X - Y; the hat check indicator is one count.
  gate: ['ia-s2-q5-quarter', 'gs-4-1-38'],
  recall: [
    { front: t`Define a random variable on a countable probability space.`, back: t`A function ${math`X: \Omega \to \mathbb{R}`}.` },
    { front: t`Define the distribution of ${mX}.`, back: t`${math`\mathbb{P}(X = x) = \mathbb{P}(\{\omega : X(\omega) = x\})`} for each value ${math`x`}.` },
    { front: t`Distribution of ${math`g(X)`}?`, back: t`${math`\mathbb{P}(g(X) = y) = \sum_{x : g(x) = y} \mathbb{P}(X = x)`}.` },
    { front: t`Which random variables are Bernoulli?`, back: t`Exactly the indicators ${math`\mathbf{${1}}_{A}`}, with parameter ${math`\mathbb{P}(A)`}.` },
  ],
  proofOrder: [
    {
      title: t`The distribution of ${math`g(X)`}`,
      steps: [
        t`${math`g(X)`} is the composite ${math`\omega \mapsto g(X(\omega))`}.`,
        t`${math`\{g(X) = y\}`} is the disjoint union of ${math`\{X = x\}`} over ${math`x`} with ${math`g(x) = y`}.`,
        t`Countable additivity adds their probabilities.`,
      ],
    },
  ],
};
