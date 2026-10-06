/**
 * alg.proof-by-induction: Proof by induction: a base case and an inductive step prove a
 * statement for every natural number, or for every one from a basis on. The lesson follows
 * the CST notes on the Principle of Induction (printed pages 265 to 272: the principle,
 * the proof pattern, the template) and induction from a basis (pages 283 to 286), and Book
 * of Proof Chapter 10. The problems are Book of Proof Chapter 10 (exercises 9, 11, 13),
 * supervision exercises 4.1.1, 4.1.2, 4.2.2, and 4.2.3(g) with the 2023-24 official
 * solutions, and IA Probability Example Sheet 1 Q10 (the Polya urn).
 */
import { auto, cite, same, supervision } from '../cambridge';
import { factorial, int, pick, q, str, upTo, add, mul, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computedMath, dmath, math, t, type Rich } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';

const [mn, mk] = [math`n`, math`k`];

// ---------------------------------------------------------------- the inductive step of a sum

/** A sum formula: the term f(i) and the closed form g(n), in the graders' expression language with i and n. */
interface SumItem { f: string; g: string; fTex: Rich; gTex: Rich }
const at = (expr: string, v: string, by: string): string => expr.replace(new RegExp(`(?<![A-Za-z])${v}(?![A-Za-z])`, 'g'), `(${by})`);
const SUMS: readonly SumItem[] = [
  { f: 'i', g: 'n(n + 1)/2', fTex: [math`i`], gTex: [math`\frac{n(n + ${1})}{${2}}`] },
  { f: 'i^2', g: 'n(n + 1)(2n + 1)/6', fTex: [math`i^{${2}}`], gTex: [math`\frac{n(n + ${1})(${2}n + ${1})}{${6}}`] },
  { f: '2i - 1', g: 'n^2', fTex: [math`${2}i - ${1}`], gTex: [math`n^{${2}}`] },
  { f: 'i^3', g: 'n^2(n + 1)^2/4', fTex: [math`i^{${3}}`], gTex: [math`\frac{n^{${2}}(n + ${1})^{${2}}}{${4}}`] },
  { f: '2^i', g: '2^(n + 1) - 2', fTex: [math`${2}^{i}`], gTex: [math`${2}^{n + ${1}} - ${2}`] },
  { f: 'i(i + 1)', g: 'n(n + 1)(n + 2)/3', fTex: [math`i(i + ${1})`], gTex: [math`\frac{n(n + ${1})(n + ${2})}{${3}}`] },
  { f: '8i - 5', g: '4n^2 - n', fTex: [math`${8}i - ${5}`], gTex: [math`${4}n^{${2}} - n`] },
  { f: 'i(i + 2)', g: 'n(n + 1)(2n + 7)/6', fTex: [math`i(i + ${2})`], gTex: [math`\frac{n(n + ${1})(${2}n + ${7})}{${6}}`] },
];
/** Evaluate an expression in one variable at an integer, exactly, by the graders' own reading through a tiny evaluator. */
function evalAt(expr: string, v: string, x: number): Rational {
  // Supported: integers, the variable, + - * / ^ and brackets, implicit multiplication.
  const s = at(expr, v, String(x)).replace(/\s+/g, '').replace(/\)\(/g, ')*(').replace(/(\d)\(/g, '$1*(').replace(/\)(\d)/g, ')*$1');
  let i = 0;
  const peek = (): string => s[i] ?? '';
  const num = (): Rational => {
    if (peek() === '(') { i++; const r = sum(); i++; return r; }
    if (peek() === '-') { i++; const r = pow(); return mul(q(-1), r); }
    let d = '';
    while (/\d/.test(peek())) d += s[i++];
    return q(Number(d));
  };
  const pow = (): Rational => {
    const b = num();
    if (peek() !== '^') return b;
    i++;
    const e = pow();
    let r = q(1);
    for (let k = 0; k < Number(e.num); k++) r = mul(r, b);
    return r;
  };
  const prod = (): Rational => {
    let r = pow();
    while (peek() === '*' || peek() === '/') {
      const op = s[i++];
      const y = pow();
      r = op === '*' ? mul(r, y) : mul(r, q(y.den, y.num));
    }
    return r;
  };
  const sum = (): Rational => {
    let r = prod();
    while (peek() === '+' || peek() === '-') {
      const op = s[i++];
      const y = prod();
      r = op === '+' ? add(r, y) : add(r, mul(q(-1), y));
    }
    return r;
  };
  return sum();
}
const K_DOMAIN = { k: { kind: 'integer' as const, min: 1, max: 12 } };

interface StepP { s: number }

const sumStep = generator<StepP>({
  id: 'sum-step',
  skill: 'Do the algebra of an inductive step for a sum formula: add the next term to the closed form for k and simplify to the closed form for k + 1.',
  params: (rng) => ({ s: int(rng, 0, SUMS.length - 1) }),
  sane: ({ s }) => (s >= 0 && s < SUMS.length ? null : 'out of range'),
  problem: ({ s }) => {
    const it = SUMS[s] as SumItem;
    return {
      prompt: t`To prove ${math`\sum_{i=${1}}^{n} `}${it.fTex}${math` = `}${it.gTex} by induction, the inductive step assumes it for ${math`n = k`} (the [[induction-hypothesis|induction hypothesis]]) and adds the next term, ${math`i = k + ${1}`}. What is ${math`\sum_{i=${1}}^{k + ${1}} `}${it.fTex} in terms of ${mk}? Simplify fully.`,
      answer: { kind: 'expression', expected: at(it.g, 'n', 'k + 1'), variables: ['k'], domains: K_DOMAIN },
      solution: [
        t`Split off the last term: ${math`\sum_{i=${1}}^{k + ${1}}`} is the sum up to ${mk}, which the hypothesis gives in closed form, plus the term for ${math`i = k + ${1}`}: ${computedMath(`${at(it.g, 'n', 'k')} + ${at(it.f, 'i', 'k + 1')}`)}.`,
        t`Simplifying gives ${computedMath(at(it.g, 'n', 'k + 1'))}: the formula with ${mn} replaced by ${math`k + ${1}`}. That is the statement for ${math`k + ${1}`}, which completes the step.`,
      ],
    };
  },
  solve: ({ s }) => {
    // The hypothesis plus the next term, unsimplified: the grader checks it equals the target.
    const it = SUMS[s] as SumItem;
    return `${at(it.g, 'n', 'k')} + ${at(it.f, 'i', 'k + 1')}`;
  },
  misconceptions: ({ s }): Misconception[] => {
    const it = SUMS[s] as SumItem;
    return [
      { response: at(it.g, 'n', 'k'), why: t`That is the sum up to ${mk}, the hypothesis. The step adds one more term, the one for ${math`i = k + ${1}`}.` },
      { response: `${at(it.g, 'n', 'k')} + ${at(it.f, 'i', 'k')}`, why: t`The term added is the next one, for ${math`i = k + ${1}`}, not the term for ${math`i = k`} again.` },
    ];
  },
});

// ---------------------------------------------------------------- induction from a basis

interface Ineq { text: Rich; holds: (n: number) => boolean }
const INEQS: readonly Ineq[] = [
  { text: t`${math`${2}^{n} > n^{${2}}`}`, holds: (n) => 2 ** n > n * n },
  { text: t`${math`n! > ${2}^{n}`}`, holds: (n) => factorial(n) > 2 ** n },
  { text: t`${math`${3}^{n} > n^{${3}}`}`, holds: (n) => 3 ** n > n ** 3 },
  { text: t`${math`${2}^{n} > ${2}n + ${1}`}`, holds: (n) => 2 ** n > 2 * n + 1 },
  { text: t`${math`n! > ${3}^{n}`}`, holds: (n) => factorial(n) > 3 ** n },
  { text: t`${math`${2}^{n} \ge n^{${3}}`}`, holds: (n) => 2 ** n >= n ** 3 },
  { text: t`${math`${4}^{n} > n^{${4}}`}`, holds: (n) => 4 ** n > n ** 4 },
  { text: t`${math`n^{${2}} > ${3}n + ${10}`}`, holds: (n) => n * n > 3 * n + 10 },
];
/** The smallest N such that the inequality holds for every n from N to 60 (checked far beyond where it settles). */
const basisOf = (c: Ineq): number => {
  let N = 60;
  while (N > 1 && c.holds(N - 1)) N--;
  return N;
};

interface BasisP { j: number }

const basis = generator<BasisP>({
  id: 'basis',
  skill: 'Find the basis for an induction from a basis: the smallest N from which an inequality holds for every larger n, as in the CST notes\' induction from basis l.',
  params: (rng) => ({ j: int(rng, 0, INEQS.length - 1) }),
  sane: ({ j }) => (j >= 0 && j < INEQS.length ? null : 'out of range'),
  problem: ({ j }) => {
    const c = INEQS[j] as Ineq;
    const N = basisOf(c);
    const before = upTo(N - 1);
    return {
      prompt: t`The inequality ${c.text} can be proved for every natural number ${mn} from some point on by induction from a basis. What is the smallest ${math`N`} such that it holds for every ${math`n \ge N`}?`,
      answer: { kind: 'exact', expected: String(N) },
      solution: [
        t`Test small values. It fails at ${math`n = ${N - 1}`}, so the basis cannot be below ${N}.${before.some(c.holds) ? t` (It also holds for some smaller ${mn}, such as ${math`n = ${before.find(c.holds) as number}`}, but it fails again after that.)` : t``}`,
        t`It holds at ${math`n = ${N}`}, the base case, and the inductive step from ${mk} to ${math`k + ${1}`} works for every ${math`k \ge ${N}`}. So ${math`N = ${N}`}.`,
      ],
    };
  },
  solve: ({ j }) => {
    const c = INEQS[j] as Ineq;
    // The last failure below 60, plus one.
    const fails = upTo(59).filter((n) => !c.holds(n));
    return String((fails[fails.length - 1] ?? 0) + 1);
  },
  misconceptions: ({ j }): Misconception[] => {
    const c = INEQS[j] as Ineq;
    const N = basisOf(c);
    const out: Misconception[] = [
      { response: String(N - 1), why: t`At ${math`n = ${N - 1}`} the inequality fails, so the basis must be later.` },
      { response: String(N + 1), why: t`It already holds at ${math`n = ${N}`}, and from there on: that is the smallest basis.` },
    ];
    const early = upTo(N - 1).find(c.holds);
    if (early !== undefined) out.push({ response: String(early), why: t`It holds at ${math`n = ${early}`}, but fails again before ${N}: a basis must work for every larger ${mn}.` });
    return out;
  },
});

// ---------------------------------------------------------------- a recurrence, solved by induction

interface RecP { c: number; r: number; s: number }

const recurrence = generator<RecP>({
  id: 'recurrence',
  skill: 'Guess a closed form for a sequence defined by a recurrence, from its first terms, and check it by induction.',
  params: (rng) => {
    for (;;) {
      const r = pick(rng, [2, 3]);
      const s = r === 2 ? pick(rng, [-3, -2, -1, 1, 2, 3]) : pick(rng, [-4, -2, 2, 4]);
      const c = int(rng, 1, 5);
      if (c + s / (r - 1) !== 0) return { c, r, s };
    }
  },
  sane: ({ c, r, s }) => ((r === 2 || r === 3) && s !== 0 && (s / (r - 1)) % 1 === 0 && c + s / (r - 1) !== 0 ? null : 'out of range'),
  problem: ({ c, r, s }) => {
    const h = s / (r - 1);
    const terms = upTo(4).reduce<number[]>((acc, i) => [...acc, i === 1 ? c : r * (acc[acc.length - 1] as number) + s], []);
    return {
      prompt: t`A sequence has ${math`u_{${1}} = ${c}`} and ${math`u_{n + ${1}} = ${r}u_{n} ${s < 0 ? '-' : '+'} ${Math.abs(s)}`}. Find a formula for ${math`u_{n}`} in terms of ${mn}.`,
      answer: { kind: 'expression', expected: `${c + h} * ${r}^(n - 1) ${h < 0 ? '+' : '-'} ${Math.abs(h)}`, variables: ['n'], domains: { n: { kind: 'integer', min: 1, max: 10 } } },
      solution: [
        t`The first terms are ${terms.map((x) => [math`${x}`]).flatMap((x, i) => (i === 0 ? [...x] : [...t`, `, ...x]))}. Adding ${h} to each gives ${terms.map((x) => [math`${x + h}`]).flatMap((x, i) => (i === 0 ? [...x] : [...t`, `, ...x]))}, which multiply by ${r} each time.`,
        t`So guess ${math`u_{n} = ${c + h} \times ${r}^{n - ${1}} ${h < 0 ? '+' : '-'} ${Math.abs(h)}`}. Base case: at ${math`n = ${1}`} it gives ${c}. Inductive step: if it holds for ${mk}, then ${math`u_{k + ${1}} = ${r}u_{k} ${s < 0 ? '-' : '+'} ${Math.abs(s)}`} gives ${math`${c + h} \times ${r}^{k} ${h < 0 ? '+' : '-'} ${Math.abs(h)}`}, the formula for ${math`k + ${1}`}.`,
      ],
    };
  },
  solve: ({ c, r, s }) => {
    // Fit u_n = A r^(n - 1) + B to the first two terms.
    const u1 = c;
    const u2 = r * c + s;
    const A = (u2 - u1) / (r - 1);
    const B = u1 - A;
    return `${A} * ${r}^(n - 1) ${B < 0 ? '-' : '+'} ${Math.abs(B)}`;
  },
  misconceptions: ({ c, r, s }): Misconception[] => {
    const h = s / (r - 1);
    return [
      { response: `${c} * ${r}^(n - 1)`, why: t`That ignores the ${math`${s < 0 ? '-' : '+'} ${Math.abs(s)}`} in the recurrence. Check it against ${math`u_{${2}} = ${r * c + s}`}.` },
      { response: `${c + h} * ${r}^n ${h < 0 ? '+' : '-'} ${Math.abs(h)}`, why: t`Check the base case: at ${math`n = ${1}`} the power must be ${math`${r}^{${0}} = ${1}`}, so the exponent is ${math`n - ${1}`}.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

/** Fibonacci numbers from F0 = 0, F1 = 1, as the exercises define them. */
const F = (n: number): number => { let [a, b] = [0, 1]; for (let i = 0; i < n; i++) [a, b] = [b, a + b]; return a; };
const N_DOMAIN = { n: { kind: 'integer' as const, min: 0, max: 15 } };

const fibSum = (o: { part: string; label: Rich; term: (i: number) => number; index: string; minus: number; official: string; steps: Rich[] }) => auto({
  id: `sw-4-2-3-g-${o.part}`,
  source: cite('cst-dm-sw1', `Exercises 4, 4.2.3(g)(${o.part})`, true),
  title: t`A sum of Fibonacci numbers`,
  prompt: t`The Fibonacci numbers are ${math`F_{${0}} = ${0}`}, ${math`F_{${1}} = ${1}`}, and ${math`F_{n + ${2}} = F_{n} + F_{n + ${1}}`}. Conjecture a formula: ${o.label} equals ${o.minus === 0 ? t`${math`F_{m}`}` : t`${math`F_{m} - ${o.minus}`}`} for every natural number ${mn}. Give ${math`m`} in terms of ${mn}.`,
  answer: { kind: 'expression', expected: o.index, variables: ['n'], domains: N_DOMAIN },
  solution: o.steps,
  reference: o.index,
  verify: () => {
    for (let n = 0; n <= 25; n++) {
      const sum = upTo(n + 1).reduce((acc, i) => acc + o.term(i - 1), 0);
      const m = evalAt(o.index, 'n', n);
      if (sum !== F(Number(m.num)) - o.minus) return `n = ${n}`;
    }
    return null;
  },
  official: { source: cite('cst-dm-sols-2324-4', `4.2.3(g)(${o.part})`), answer: o.official, agrees: true },
});

const fibI = fibSum({
  part: 'i', label: [math`\sum_{i=${0}}^{n} F_{${2}i}`], term: (i) => F(2 * i), index: '2n + 1', minus: 1, official: '2n + 1',
  steps: [
    t`Test cases: ${math`n = ${0}`} gives ${0}, ${math`n = ${1}`} gives ${F(0) + F(2)}, ${math`n = ${2}`} gives ${F(0) + F(2) + F(4)}: each is one less than ${math`F_{${1}}, F_{${3}}, F_{${5}}`}. So conjecture ${math`\sum_{i=${0}}^{n} F_{${2}i} = F_{${2}n + ${1}} - ${1}`}.`,
    t`Base case ${math`n = ${0}`}: ${math`F_{${0}} = ${0} = F_{${1}} - ${1}`}. Inductive step: the sum to ${math`k + ${1}`} is ${math`F_{${2}k + ${2}} + (F_{${2}k + ${1}} - ${1}) = F_{${2}k + ${3}} - ${1}`}, using the hypothesis and then the Fibonacci rule.`,
  ],
});
const fibII = fibSum({
  part: 'ii', label: [math`\sum_{i=${0}}^{n} F_{${2}i + ${1}}`], term: (i) => F(2 * i + 1), index: '2n + 2', minus: 0, official: '2n + 2',
  steps: [
    t`Test cases: ${math`F_{${1}} = ${1} = F_{${2}}`}; ${math`F_{${1}} + F_{${3}} = ${F(1) + F(3)} = F_{${4}}`}. Conjecture ${math`\sum_{i=${0}}^{n} F_{${2}i + ${1}} = F_{${2}n + ${2}}`}.`,
    t`Inductive step: ${math`F_{${2}k + ${3}} + F_{${2}k + ${2}} = F_{${2}k + ${4}} = F_{${2}(k + ${1}) + ${2}}`}.`,
  ],
});
const fibIII = fibSum({
  part: 'iii', label: [math`\sum_{i=${0}}^{n} F_{i}`], term: (i) => F(i), index: 'n + 2', minus: 1, official: 'n + 2',
  steps: [
    t`Test cases: ${math`${0}, ${1}, ${2}, ${4}, ${7}`} for ${math`n = ${0}, \ldots, ${4}`}, each one less than ${math`F_{${2}}, \ldots, F_{${6}}`}. Conjecture ${math`\sum_{i=${0}}^{n} F_{i} = F_{n + ${2}} - ${1}`}.`,
    t`Inductive step: ${math`(F_{k + ${2}} - ${1}) + F_{k + ${1}} = F_{k + ${3}} - ${1}`}. The official solution also derives it from parts (i) and (ii), by cases on whether ${mn} is even or odd.`,
  ],
});

const bop9 = auto({
  id: 'bop-10-9',
  source: cite('bop', 'Chapter 10, exercise 9', true),
  title: t`${24} divides ${math`${5}^{${2}n} - ${1}`}`,
  prompt: t`To prove ${math`${24} \mid (${5}^{${2}n} - ${1})`} for every integer ${math`n \ge ${0}`} by induction: assume ${math`${5}^{${2}k} - ${1} = ${24}a`} for an integer ${math`a`}. Write ${math`${5}^{${2}(k + ${1})} - ${1}`} as ${math`${24}`} times an expression in ${math`a`}: what is that expression?`,
  answer: { kind: 'expression', expected: '25a + 1', variables: ['a'] },
  solution: [
    t`From the hypothesis, ${math`${5}^{${2}k} = ${24}a + ${1}`}. Then ${math`${5}^{${2}(k + ${1})} - ${1} = ${25} \times ${5}^{${2}k} - ${1} = ${25}(${24}a + ${1}) - ${1} = ${24}(${25}a + ${1})`}.`,
    t`So ${24} divides ${math`${5}^{${2}(k + ${1})} - ${1}`}. With the base case ${math`n = ${0}`}, where ${math`${5}^{${0}} - ${1} = ${0}`}, this proves it for every ${math`n \ge ${0}`}.`,
  ],
  reference: '25a + 1',
  verify: () => {
    for (let k = 0; k <= 8; k++) {
      const a = (25 ** k - 1) / 24;
      if (!Number.isInteger(a) || 25 ** (k + 1) - 1 !== 24 * (25 * a + 1)) return `k = ${k}`;
    }
    return null;
  },
  misconceptions: [{ response: '25a', why: t`${math`${25}(${24}a + ${1}) - ${1} = ${24} \times ${25}a + ${24}`}: the ${24} left over is ${math`${24} \times ${1}`}.` }],
  official: { source: cite('bop', 'Solutions, Chapter 10, exercise 9'), answer: '25a + 1', agrees: true },
});

const tromino = auto({
  id: 'sw-4-1-2-count',
  source: cite('cst-dm-sw1', 'Exercises 4, 4.1.2', true),
  title: t`How many L-shaped pieces`,
  prompt: t`A ${math`${2}^{n} \times ${2}^{n}`} square grid with any one square removed can be tiled with L-shaped pieces of ${3} squares (a supervision exercise asks you to prove it). How many pieces does such a tiling use? Give the number in terms of ${mn}.`,
  answer: { kind: 'expression', expected: '(4^n - 1)/3', variables: ['n'], domains: { n: { kind: 'integer', min: 1, max: 8 } } },
  solution: [
    t`The grid has ${math`${4}^{n}`} squares; one is removed, and each piece covers ${3}. So there are ${math`\frac{${4}^{n} - ${1}}{${3}}`} pieces.`,
    t`The induction gives the same: the inductive step uses four tilings of the quarters and one extra piece in the middle, so ${math`T_{k + ${1}} = ${4}T_{k} + ${1}`} with ${math`T_{${1}} = ${1}`}.`,
  ],
  reference: '(4^n - 1)/3',
  verify: () => {
    let T = 1;
    for (let n = 1; n <= 10; n++) {
      if (T !== (4 ** n - 1) / 3) return `n = ${n}`;
      T = 4 * T + 1;
    }
    return null;
  },
  misconceptions: [{ response: '4^n/3', why: t`One square is removed first: ${math`${4}^{n} - ${1}`} squares are covered, three per piece.` }],
});

const polygon = auto({
  id: 'sw-4-1-1-step',
  source: cite('cst-dm-sw1', 'Exercises 4, 4.1.1', true),
  title: t`From ${mk} points to ${math`k + ${1}`}`,
  prompt: t`The supervision exercise: the interior angles of a polygon made by joining ${math`n \ge ${3}`} points on a circle add up to ${math`${180}(n - ${2})`} degrees. In the inductive step, a polygon with ${math`k + ${1}`} vertices is cut into one with ${mk} vertices and a triangle. By how many degrees does the angle sum go up from ${mk} to ${math`k + ${1}`} vertices?`,
  answer: { kind: 'exact', expected: '180' },
  solution: [
    t`The cut adds the triangle's three angles to the ${mk}-gon's: ${180} degrees.`,
    t`So ${math`S_{k + ${1}} = S_{k} + ${180} = ${180}(k - ${2}) + ${180} = ${180}((k + ${1}) - ${2})`}, the formula for ${math`k + ${1}`}. The base case is the triangle, ${math`n = ${3}`}: an induction from basis ${3}.`,
  ],
  reference: '180',
  verify: () => same('180(n - 2) steps by 180', upTo(20).map((n) => 180 * (n + 1 - 2) - 180 * (n - 2)).every((d) => d === 180), true),
  misconceptions: [{ response: '360', why: t`The new piece is a triangle, whose angles add up to ${180} degrees.` }],
  official: { source: cite('cst-dm-sols-2324-4', '4.1.1'), answer: '180', agrees: true },
});

/** The Polya urn: the probability of each number of white balls when there are n balls, exactly. */
function polya(n: number): Rational[] {
  // dist[w] after starting with 1 white and 1 black (2 balls) and adding n - 2 balls.
  let dist: Rational[] = [q(0), q(1)];
  for (let total = 2; total < n; total++) {
    const next: Rational[] = upTo(total + 1).map(() => q(0));
    dist.forEach((p, w) => {
      if (p.num === 0n) return;
      next[w + 1] = add(next[w + 1] as Rational, mul(p, q(w, total)));
      next[w] = add(next[w] as Rational, mul(p, q(total - w, total)));
    });
    dist = next;
  }
  return dist;
}
const polyaQ = auto({
  id: 'ia-q10',
  source: cite('ia-prob-sheet-1', 'Q10'),
  title: t`The Polya urn`,
  prompt: t`The Polya urn model for contagion: an urn starts with one white ball and one black ball. At each second a ball is chosen at random from the urn and replaced together with one more ball of the same colour. When there are ${mn} balls in the urn, what is the probability that ${math`i`} of them are white, for each ${math`i`} from ${1} to ${math`n - ${1}`}? Give it in terms of ${mn}.`,
  answer: { kind: 'expression', expected: '1/(n - 1)', variables: ['n'], domains: { n: { kind: 'integer', min: 2, max: 20 } } },
  solution: [
    t`Work out small cases: with ${3} balls, ${1} or ${2} white, each with probability ${q(1, 2)}; with ${4} balls, each of ${1}, ${2}, ${3} white has probability ${q(1, 3)}. Conjecture: every possible number of white balls is equally likely, ${math`\frac{${1}}{n - ${1}}`}.`,
    t`Induction on ${mn}: if it holds for ${mn} balls, ${math`i`} white balls with ${math`n + ${1}`} in the urn come from ${math`i - ${1}`} white (then a white is drawn) or ${math`i`} white (then a black is drawn): ${math`\frac{${1}}{n - ${1}} \left(\frac{i - ${1}}{n} + \frac{n - i}{n}\right) = \frac{${1}}{n}`}. That is the formula for ${math`n + ${1}`}.`,
  ],
  reference: '1/(n - 1)',
  verify: () => {
    for (let n = 2; n <= 14; n++) {
      const d = polya(n);
      for (let i = 1; i <= n - 1; i++) if (str(d[i] as Rational) !== str(q(1, n - 1))) return `n = ${n}, i = ${i}`;
    }
    return null;
  },
  misconceptions: [{ response: '1/n', why: t`With ${mn} balls the number of white ones runs from ${1} to ${math`n - ${1}`}: there are ${math`n - ${1}`} equally likely values.` }],
});

const bop13 = supervision({
  id: 'bop-10-13',
  source: cite('bop', 'Chapter 10, exercise 13'),
  title: t`${6} divides ${math`n^{${3}} - n`}`,
  prompt: t`Prove by induction that ${math`${6} \mid (n^{${3}} - n)`} for every integer ${math`n \ge ${0}`}. In the inductive step, expand ${math`(k + ${1})^{${3}} - (k + ${1})`} and find ${math`k^{${3}} - k`} inside it; then say why the rest is a multiple of ${6}.`,
  writeUp: 'proof',
});
const sw412 = supervision({
  id: 'sw-4-1-2',
  source: cite('cst-dm-sw1', 'Exercises 4, 4.1.2'),
  title: t`L-shaped tiles`,
  prompt: t`Prove that, for any positive integer ${mn}, a ${math`${2}^{n} \times ${2}^{n}`} square grid with any one square removed can be tiled with L-shaped pieces consisting of ${3} squares. State the induction hypothesis carefully: it must cover every possible missing square.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-4', '4.1.2'),
});
const sw422 = supervision({
  id: 'sw-4-2-2',
  source: cite('cst-dm-sw1', 'Exercises 4, 4.2.2'),
  title: t`Bernoulli's inequality`,
  prompt: t`Prove that for every natural number ${mn} and every real ${math`x \ge -${1}`}, ${math`(${1} + x)^{n} \ge ${1} + nx`}. Where in the inductive step do you use ${math`x \ge -${1}`}?`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-4', '4.2.2'),
});
const sw411 = supervision({
  id: 'sw-4-1-1',
  source: cite('cst-dm-sw1', 'Exercises 4, 4.1.1'),
  title: t`Angles of a polygon`,
  prompt: t`Prove that for all natural numbers ${math`n \ge ${3}`}, if ${mn} distinct points on a circle are joined in consecutive order by straight lines, then the interior angles of the resulting polygon add up to ${math`${180}(n - ${2})`} degrees. Take care in the inductive step: you are given the polygon with ${math`k + ${1}`} vertices, and must cut it, not build it from a smaller one.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-4', '4.1.1'),
});
const polyaProof = supervision({
  id: 'ia-q10-proof',
  source: cite('ia-prob-sheet-1', 'Q10'),
  title: t`The Polya urn, proved`,
  prompt: t`For the Polya urn (one white and one black ball to start; draw a ball at random and return it with one more of the same colour), prove by induction on ${mn} that when there are ${mn} balls, each number of white balls from ${1} to ${math`n - ${1}`} has probability ${math`\frac{${1}}{n - ${1}}`}. Do you think the proportion of white balls might tend to a limit?`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const ODD = 5;

export const proofByInduction: TopicContent = {
  topicId: 'alg.proof-by-induction',
  goal: t`Prove a statement for every natural number by [[induction|induction]]: a base case, then an inductive step from ${mk} to ${math`k + ${1}`}, from basis ${0} or from a later basis.`,
  lesson: [
    { kind: 'p', text: t`The natural numbers are made from ${0} by adding ${1} again and again. So a statement ${math`P(m)`} that holds at ${0}, and that always passes from each number to the next, holds for all of them. That is [[induction|proof by induction]]: like a row of dominoes where the first falls and each knocks over the next.` },
    { kind: 'rule', text: t`The Principle of Induction (CST notes): if ${math`P(${0})`} holds, and ${math`\forall n \in \mathbb{N}.\ P(n) \Rightarrow P(n + ${1})`} holds, then ${math`\forall m \in \mathbb{N}.\ P(m)`} holds.` },
    { kind: 'p', text: t`The notes' template: say that the proof uses induction; define the property ${math`P(m)`}; prove ${math`P(${0})`}, the [[base-case|base case]]; prove ${math`P(n) \Rightarrow P(n + ${1})`} for every ${mn}, the inductive step, assuming ${math`P(n)`} (the [[induction-hypothesis|induction hypothesis]]) and deducing ${math`P(n + ${1})`}; and conclude by the Principle of Induction. Label each part.` },
    { kind: 'p', text: t`Example: ${math`${1} + ${3} + \cdots + (${2}n - ${1}) = n^{${2}}`} for ${math`n \ge ${1}`}. Base case: ${math`${1} = ${1}^{${2}}`}. Step: if the first ${mk} odd numbers add up to ${math`k^{${2}}`}, the first ${math`k + ${1}`} add up to ${math`k^{${2}} + (${2}k + ${1}) = (k + ${1})^{${2}}`}. Check: the first ${ODD} odd numbers add up to ${upTo(ODD).reduce((s, i) => s + 2 * i - 1, 0)}, which is ${math`${ODD}^{${2}}`}.` },
    { kind: 'p', text: t`Both parts are needed. "${math`n^{${2}} + n`} is odd" has a working inductive step, since ${math`(k + ${1})^{${2}} + (k + ${1}) = (k^{${2}} + k) + ${2}(k + ${1})`}, but no base case: it is false for every ${mn}. And a base case alone proves only one value.` },
    { kind: 'p', text: t`Induction from a basis (the notes' Technique ${1}): to prove ${math`P(m)`} for every ${math`m \ge \ell`}, prove ${math`P(\ell)`} and ${math`P(n) \Rightarrow P(n + ${1})`} for every ${math`n \ge \ell`}. For example ${math`${2}^{n} > n^{${2}}`} fails at ${math`n = ${2}, ${3}, ${4}`} but holds for every ${math`n \ge ${5}`}: base case ${math`${2 ** 5} > ${5 ** 2}`}, and the step uses ${math`${2}k^{${2}} > (k + ${1})^{${2}}`} for ${math`k \ge ${5}`}.` },
    { kind: 'rule', text: t`In the inductive step for a sum, split off the last term: ${dmath`\sum_{i=${1}}^{k + ${1}} f(i) = \left(\sum_{i=${1}}^{k} f(i)\right) + f(k + ${1}),`} use the hypothesis on the bracket, and simplify to the formula with ${math`k + ${1}`} in place of ${mn}.` },
  ],
  examples: [
    workedCambridge(fibI),
    worked(sumStep, { s: 1 }, t`The inductive step for ${math`\sum i^{${2}}`}`),
    worked(basis, { j: 1 }, t`A basis for ${math`n! > ${2}^{n}`}`),
  ],
  generators: [sumStep, basis, recurrence],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['induction', 'base-case', 'induction-hypothesis'],
  cambridge: [fibII, fibIII, bop9, tromino, polygon, polyaQ, bop13, sw412, sw422, sw411, polyaProof],
  gate: ['sw-4-2-3-g-ii', 'sw-4-2-3-g-iii', 'sw-4-1-2-count', 'sw-4-1-1-step', 'ia-q10', 'sw-4-1-2', 'sw-4-2-2', 'sw-4-1-1', 'ia-q10-proof'],
};
