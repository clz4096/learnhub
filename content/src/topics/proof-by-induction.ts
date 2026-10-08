/**
 * alg.proof-by-induction: Proof by induction: a base case and an inductive step prove a
 * statement for every natural number, or for every one from a basis on. The lesson follows
 * the CST notes on the Principle of Induction (printed pages 265 to 272: the principle,
 * the proof pattern, the template) and induction from a basis (pages 283 to 286), and Book
 * of Proof Chapter 10. The problems are Book of Proof Chapter 10 (exercises 9, 11, 13),
 * supervision exercises 4.1.1, 4.1.2, 4.2.2, and 4.2.3(g) with the 2023-24 official
 * solutions, and IA Probability Example Sheet 1 Q10 (the Polya urn).
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { factorial, int, pick, q, str, upTo, add, mul, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computedMath, dmath, listOf, math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

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

const fibSum = (o: { part: string; label: Rich; term: (i: number) => number; index: string; minus: number; official: string; steps: Rich[]; hints?: readonly Rich[]; nudge?: Rich }) => auto({
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
  ...(o.hints === undefined ? {} : { hints: o.hints }),
  ...(o.nudge === undefined ? {} : { nudge: o.nudge }),
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
    t`Conjecture from small cases, then prove the pattern by induction.`,
  ],
  nudge: t`Not quite. Compute the sum for ${math`n = ${0}, ${1}, ${2}`} and compare each value with the list of Fibonacci numbers.`,
  hints: [
    t`What are the sums for ${math`n = ${0}, ${1}, ${2}`}?`,
    t`Which Fibonacci numbers equal those sums, and what are their indices?`,
    t`How does the index grow as ${mn} goes up by ${1}?`,
  ],
});
const fibIII = fibSum({
  part: 'iii', label: [math`\sum_{i=${0}}^{n} F_{i}`], term: (i) => F(i), index: 'n + 2', minus: 1, official: 'n + 2',
  steps: [
    t`Test cases: ${math`${0}, ${1}, ${2}, ${4}, ${7}`} for ${math`n = ${0}, \ldots, ${4}`}, each one less than ${math`F_{${2}}, \ldots, F_{${6}}`}. Conjecture ${math`\sum_{i=${0}}^{n} F_{i} = F_{n + ${2}} - ${1}`}.`,
    t`Inductive step: ${math`(F_{k + ${2}} - ${1}) + F_{k + ${1}} = F_{k + ${3}} - ${1}`}. The official solution also derives it from parts (i) and (ii), by cases on whether ${mn} is even or odd.`,
    t`Conjecture from small cases, then prove the pattern by induction.`,
  ],
  nudge: t`Not quite. Compute the sum for small ${mn} and compare each value with the Fibonacci numbers; every sum is off by the same amount.`,
  hints: [
    t`What are the sums for ${math`n = ${0}, \ldots, ${4}`}?`,
    t`How does each sum compare with a nearby Fibonacci number?`,
    t`How does that Fibonacci number's index depend on ${mn}?`,
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
    t`In an inductive step, write the next case in terms of the last, then use the hypothesis.`,
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
  nudge: t`Not quite. Write ${math`${5}^{${2}(k + ${1})}`} as ${math`${25} \times ${5}^{${2}k}`}, then use the hypothesis to replace ${math`${5}^{${2}k}`}.`,
  hints: [
    t`How is ${math`${5}^{${2}(k + ${1})}`} related to ${math`${5}^{${2}k}`}?`,
    t`From the hypothesis, what is ${math`${5}^{${2}k}`} in terms of ${math`a`}?`,
    t`After substituting, which common factor can be taken out?`,
  ],
});

const tromino = auto({
  id: 'sw-4-1-2-count',
  source: cite('cst-dm-sw1', 'Exercises 4, 4.1.2', true),
  title: t`How many L-shaped pieces`,
  prompt: t`A ${math`${2}^{n} \times ${2}^{n}`} square grid with any one square removed can be tiled with L-shaped pieces of ${3} squares (a supervision exercise asks for a proof). How many pieces does such a tiling use? Give the number in terms of ${mn}.`,
  answer: { kind: 'expression', expected: '(4^n - 1)/3', variables: ['n'], domains: { n: { kind: 'integer', min: 1, max: 8 } } },
  solution: [
    t`The grid has ${math`${4}^{n}`} squares; one is removed, and each piece covers ${3}. So there are ${math`\frac{${4}^{n} - ${1}}{${3}}`} pieces.`,
    t`The induction gives the same: the inductive step uses four tilings of the quarters and one extra piece in the middle, so ${math`T_{k + ${1}} = ${4}T_{k} + ${1}`} with ${math`T_{${1}} = ${1}`}.`,
    t`Counting area gives the number of pieces without building the tiling.`,
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
  nudge: t`Not quite. Count squares: how many are covered, and how many does each piece cover?`,
  hints: [
    t`How many squares does a ${math`${2}^{n} \times ${2}^{n}`} grid have?`,
    t`How many are left once one is removed?`,
    t`How many squares does each piece cover?`,
  ],
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
    t`An inductive step adds exactly what the cut takes away.`,
  ],
  reference: '180',
  verify: () => same('180(n - 2) steps by 180', upTo(20).map((n) => 180 * (n + 1 - 2) - 180 * (n - 2)).every((d) => d === 180), true),
  misconceptions: [{ response: '360', why: t`The new piece is a triangle, whose angles add up to ${180} degrees.` }],
  official: { source: cite('cst-dm-sols-2324-4', '4.1.1'), answer: '180', agrees: true },
  nudge: t`Not quite. The piece cut off is a triangle; what do its angles add up to?`,
  hints: [
    t`When the polygon with ${math`k + ${1}`} vertices is cut along a chord, what are the two pieces?`,
    t`How do the angles of the two pieces make up the angles of the larger polygon?`,
    t`What is the angle sum of the piece that is not the ${mk}-gon?`,
  ],
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
    t`Compute small cases, conjecture, then check that the step keeps the pattern.`,
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
  nudge: t`Not quite. Work out the distribution for ${3} and ${4} balls by hand; a simple pattern appears.`,
  hints: [
    t`With ${3} balls in the urn, what are the possible numbers of white balls, and their probabilities?`,
    t`With ${4} balls, what are they?`,
    t`Which pattern do the small cases suggest, and does a step from ${mn} to ${math`n + ${1}`} balls keep it?`,
  ],
});

const bop13 = supervision({
  id: 'bop-10-13',
  source: cite('bop', 'Chapter 10, exercise 13'),
  title: t`${6} divides ${math`n^{${3}} - n`}`,
  prompt: t`Prove by induction that ${math`${6} \mid (n^{${3}} - n)`} for every integer ${math`n \ge ${0}`}. In the inductive step, expand ${math`(k + ${1})^{${3}} - (k + ${1})`} and find ${math`k^{${3}} - k`} inside it; then say why the rest is a multiple of ${6}.`,
  writeUp: 'proof',
  hints: [
    t`What is the base case ${math`n = ${0}`}?`,
    t`Expanding ${math`(k + ${1})^{${3}} - (k + ${1})`}, where does ${math`k^{${3}} - k`} appear inside it?`,
    t`Why is ${math`${3}k^{${2}} + ${3}k = ${3}k(k + ${1})`} a multiple of ${6}?`,
  ],
});
const sw412 = supervision({
  id: 'sw-4-1-2',
  source: cite('cst-dm-sw1', 'Exercises 4, 4.1.2'),
  title: t`L-shaped tiles`,
  prompt: t`Prove that, for any positive integer ${mn}, a ${math`${2}^{n} \times ${2}^{n}`} square grid with any one square removed can be tiled with L-shaped pieces consisting of ${3} squares. State the induction hypothesis carefully: it must cover every possible missing square.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-4', '4.1.2'),
  hints: [
    t`What must the induction hypothesis say about every possible missing square in a ${math`${2}^{k} \times ${2}^{k}`} grid?`,
    t`How does a ${math`${2}^{k + ${1}} \times ${2}^{k + ${1}}`} grid split into four quarters, and which quarter holds the missing square?`,
    t`Where can one L-shaped piece go so that each of the other three quarters has exactly one square covered?`,
  ],
});
const sw422 = supervision({
  id: 'sw-4-2-2',
  source: cite('cst-dm-sw1', 'Exercises 4, 4.2.2'),
  title: t`Bernoulli's inequality`,
  prompt: t`Prove that for every natural number ${mn} and every real ${math`x \ge -${1}`}, ${math`(${1} + x)^{n} \ge ${1} + nx`}. Where in the inductive step is ${math`x \ge -${1}`} used?`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-4', '4.2.2'),
  hints: [
    t`What is the base case ${math`n = ${0}`}?`,
    t`From ${math`(${1} + x)^{k} \ge ${1} + kx`}, what does multiplying both sides by ${math`${1} + x`} give, and why does the inequality survive?`,
    t`Why is ${math`(${1} + kx)(${1} + x)`} at least ${math`${1} + (k + ${1})x`}?`,
  ],
});
const sw411 = supervision({
  id: 'sw-4-1-1',
  source: cite('cst-dm-sw1', 'Exercises 4, 4.1.1'),
  title: t`Angles of a polygon`,
  prompt: t`Prove that for all natural numbers ${math`n \ge ${3}`}, if ${mn} distinct points on a circle are joined in consecutive order by straight lines, then the interior angles of the resulting polygon add up to ${math`${180}(n - ${2})`} degrees. Take care in the inductive step: the polygon with ${math`k + ${1}`} vertices is given, and must be cut, not built from a smaller one.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-4', '4.1.1'),
  hints: [
    t`What is the base case, and why is it a triangle?`,
    t`Given ${math`k + ${1}`} points on a circle, which chord cuts the polygon into a ${mk}-gon and a triangle, and why is the ${mk}-gon again of the right kind?`,
    t`How do the angles of the ${mk}-gon and the triangle add up to those of the larger polygon?`,
  ],
});

// Rule 1 (2026-10-08): set here from proof.infinitely-many-primes, the earliest topic that teaches everything it needs.
const ns2q6 = supervision({
  id: 'ns2-q6',
  source: cite('ia-ns-sheet-2', 'Q6'),
  title: t`Distinct prime factors of a tower`,
  prompt: t`Prove that ${math`${2}^{${2}^{n}} - ${1}`} has at least ${math`n`} distinct prime factors.`,
  writeUp: 'proof',
  hints: [
    t`How does ${math`${2}^{${2}^{n}} - ${1}`} factorise as a difference of two squares?`,
    t`Applying that factorisation repeatedly, which factors of the form ${math`${2}^{${2}^{k}} + ${1}`} appear?`,
    t`Why do two different numbers of the form ${math`${2}^{${2}^{k}} + ${1}`} have no common factor greater than ${1}?`,
  ],
});

// ---------------------------------------------------------------- lesson

const ODD = 5;
const oddSums = upTo(ODD).map((n) => upTo(n).reduce((s, i) => s + 2 * i - 1, 0));
const EULER = 41;
const [mPk, mPk1] = [math`P(k)`, math`P(k + ${1})`];

export const proofByInduction: TopicContent = {
  topicId: 'alg.proof-by-induction',
  goal: t`Prove a statement for every natural number by [[induction|induction]]: a base case, then an inductive step from ${mk} to ${math`k + ${1}`}, from basis ${0} or from a later basis.`,
  objective: t`Prove a statement for every natural number with a base case and an inductive step.`,
  why: t`Induction proves sums, divisibility and inequalities for all n at once; strong induction and recursion build on it.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`A pattern that will not stop` },
    { kind: 'hook', text: t`Add up odd numbers, starting from ${1}: ${listOf(oddSums)}. Those are the squares ${math`${1}^{${2}}, ${2}^{${2}}, ${3}^{${2}}, ${4}^{${2}}, ${5}^{${2}}`}. Does the pattern go on for ever? You could check a million cases and still not know about the next one.` },
    { kind: 'narrative', text: t`Here is a different idea. Instead of checking cases one at a time, check a link between cases: show that whenever the pattern holds for some number ${mk}, it is forced to hold for ${math`k + ${1}`} as well.` },
    { kind: 'narrative', text: t`Suppose the first ${mk} odd numbers add up to ${math`k^{${2}}`}. The next odd number is ${math`${2}k + ${1}`}. Adding it gives ${math`k^{${2}} + ${2}k + ${1}`}, and that is exactly ${math`(k + ${1})^{${2}}`}. So the pattern can never be the first to fail: each case hands the truth on to the next.` },
    { kind: 'narrative', text: t`Now picture a row of dominoes. The link says each domino, if it falls, knocks over the next. Knock over the first, and every one falls. That is the whole idea of proof by [[induction|induction]].` },
    { kind: 'section', title: t`The principle` },
    {
      kind: 'definition',
      name: t`Natural numbers`,
      formal: t`The natural numbers are ${math`\mathbb{N} = \{${0}, ${1}, ${2}, \ldots\}`}. A property ${math`P(n)`} of natural numbers is a statement about ${mn} that is true or false for each ${math`n \in \mathbb{N}`}.`,
      plain: t`In plain words: the counting numbers, starting at ${0} as in the Cambridge Discrete Mathematics notes. "${math`n^{${2}} \ge n`}" is a property: ${math`P(${3})`} says ${math`${9} \ge ${3}`}.`,
    },
    {
      kind: 'theorem',
      name: t`Principle of Induction`,
      statement: t`Let ${math`P(n)`} be a property of natural numbers. If ${math`P(${0})`} holds, and for every ${math`k \in \mathbb{N}`}, ${mPk} implies ${mPk1}, then ${math`P(n)`} holds for every ${math`n \in \mathbb{N}`}.`,
    },
    {
      kind: 'p',
      text: t`The two hypotheses have names. Proving ${math`P(${0})`} is the [[base-case|base case]]. Proving "${mPk} implies ${mPk1}" is the inductive step, and inside it the assumption ${mPk} is the [[induction-hypothesis|induction hypothesis]].`,
      why: { q: t`Why is the principle true?`, a: t`Every natural number is reached from ${0} by adding ${1} some number of times. ${math`P(${0})`} holds; the step turns it into ${math`P(${1})`}, then ${math`P(${2})`}, and so on, reaching any ${mn} after ${mn} uses. In a formal treatment this is taken as a basic property (an axiom) of ${math`\mathbb{N}`}.` },
    },
    { kind: 'narrative', text: t`The inductive step proves an implication. You do not know ${mPk} is true; you assume it, for an arbitrary ${mk}, and show ${mPk1} would follow. That is why it is called a hypothesis.` },
    {
      kind: 'list',
      items: [
        t`Say that the proof is by induction, and state the property ${math`P(n)`} exactly.`,
        t`Base case: prove ${math`P(${0})`}, or ${math`P(${1})`} if the claim starts there.`,
        t`Inductive step: let ${mk} be arbitrary, assume ${mPk}, and deduce ${mPk1}. Point out where the hypothesis is used.`,
        t`Conclude: by the Principle of Induction, ${math`P(n)`} holds for every ${mn}.`,
      ],
    },
    { kind: 'section', title: t`A first proof` },
    { kind: 'theorem', statement: t`For every integer ${math`n \ge ${1}`}, ${math`${1} + ${3} + \cdots + (${2}n - ${1}) = n^{${2}}`}, that is, ${math`\sum_{i=${1}}^{n} (${2}i - ${1}) = n^{${2}}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`The property`, text: t`Let ${math`P(n)`} be the statement ${math`\sum_{i=${1}}^{n} (${2}i - ${1}) = n^{${2}}`}. We prove it for all ${math`n \ge ${1}`} by induction on ${mn}.` },
        { label: t`Base case`, text: t`For ${math`n = ${1}`} the sum has one term, ${math`${2} \times ${1} - ${1} = ${1}`}, and ${math`${1}^{${2}} = ${1}`}. So ${math`P(${1})`} holds.` },
        { label: t`Induction hypothesis`, text: t`Let ${math`k \ge ${1}`} and assume ${mPk}: ${math`\sum_{i=${1}}^{k} (${2}i - ${1}) = k^{${2}}`}.`, plain: t`Assume the first ${mk} odd numbers add up to ${math`k^{${2}}`}. (If ${mk} were ${4}, that says ${math`${1} + ${3} + ${5} + ${7} = ${16}`}.)` },
        { label: t`Split off the last term`, text: t`The sum to ${math`k + ${1}`} is the sum to ${mk} plus the term with ${math`i = k + ${1}`}:`, eq: [dmath`\sum_{i=${1}}^{k + ${1}} (${2}i - ${1}) = \sum_{i=${1}}^{k} (${2}i - ${1}) + (${2}(k + ${1}) - ${1}).`] },
        { label: t`Use the hypothesis`, text: t`Replace the first sum by ${math`k^{${2}}`}, and simplify ${math`${2}(k + ${1}) - ${1} = ${2}k + ${1}`}:`, eq: [dmath`\sum_{i=${1}}^{k + ${1}} (${2}i - ${1}) = k^{${2}} + ${2}k + ${1}.`] },
        { label: t`Recognise the square`, text: t`${math`k^{${2}} + ${2}k + ${1} = (k + ${1})^{${2}}`}, so ${mPk1} holds.`, why: { q: t`Why is that a square?`, a: t`Expand ${math`(k + ${1})^{${2}} = (k + ${1})(k + ${1}) = k^{${2}} + k + k + ${1}`}, which is ${math`k^{${2}} + ${2}k + ${1}`}.` } },
        { label: t`Conclude`, text: t`${math`P(${1})`} holds, and ${mPk} implies ${mPk1} for every ${math`k \ge ${1}`}, so by induction ${math`P(n)`} holds for every ${math`n \ge ${1}`}.` },
      ],
    },
    {
      kind: 'rule',
      text: t`The move in the middle works for every sum: split off the last term, ${dmath`\sum_{i=${1}}^{k + ${1}} f(i) = \left(\sum_{i=${1}}^{k} f(i)\right) + f(k + ${1}),`} use the hypothesis on the bracket, and simplify until you reach the formula with ${math`k + ${1}`} in place of ${mn}.`,
    },
    checkFrom(sumStep, { s: 0 }, t`The hypothesis gives ${math`\frac{k(k + ${1})}{${2}}`} for the sum to ${mk}; adding ${math`k + ${1}`} gives ${math`\frac{(k + ${1})(k + ${2})}{${2}}`}.`),
    { kind: 'section', title: t`Both halves are needed` },
    { kind: 'narrative', text: t`It is tempting to think the inductive step is the real proof and the base case a formality. It is not, and neither is the other way round.` },
    { kind: 'pitfall', claim: t`${math`n^{${2}} + n`} is odd for every ${mn}: if ${math`k^{${2}} + k`} is odd, then so is ${math`(k + ${1})^{${2}} + (k + ${1}) = (k^{${2}} + k) + ${2}(k + ${1})`}.`, counterexample: t`The step is valid, since odd plus even is odd, but there is no base case: ${math`${0}^{${2}} + ${0} = ${0}`} is even. In fact ${math`n^{${2}} + n = n(n + ${1})`} is always even. Without a first domino, nothing falls.` },
    { kind: 'pitfall', claim: t`${math`n^{${2}} - n + ${EULER}`} is prime for every ${mn}: it is prime for every ${mn} from ${0} to ${EULER - 1}.`, counterexample: t`At ${math`n = ${EULER}`} it equals ${math`${EULER}^{${2}} = ${EULER * EULER}`}, which is not prime. Checking many cases, with no inductive step, proves nothing about the next one.` },
    { kind: 'section', title: t`Starting later` },
    { kind: 'narrative', text: t`Some statements are false for small numbers and true from some point on. Take ${math`${2}^{n} > n^{${2}}`}: it fails at ${math`n = ${2}, ${3}, ${4}`} (for instance ${math`${2}^{${3}} = ${8}`} and ${math`${3}^{${2}} = ${9}`}), then holds from ${5} on. The dominoes can start anywhere.` },
    {
      kind: 'theorem',
      name: t`Induction from a basis`,
      statement: t`Let ${math`\ell \in \mathbb{N}`}. If ${math`P(\ell)`} holds, and for every ${math`k \ge \ell`}, ${mPk} implies ${mPk1}, then ${math`P(n)`} holds for every ${math`n \ge \ell`}.`,
    },
    { kind: 'p', text: t`It follows from the Principle of Induction applied to ${math`Q(m) = P(\ell + m)`}: then ${math`Q(${0})`} is ${math`P(\ell)`}, and ${math`Q(m) \Rightarrow Q(m + ${1})`} is the step for ${math`k = \ell + m`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Base case`, text: t`At ${math`n = ${5}`}: ${math`${2}^{${5}} = ${2 ** 5} > ${25} = ${5}^{${2}}`}.` },
        { label: t`Hypothesis`, text: t`Let ${math`k \ge ${5}`} and assume ${math`${2}^{k} > k^{${2}}`}.` },
        { label: t`Double both sides`, text: t`Multiply by ${2}:`, eq: [dmath`${2}^{k + ${1}} = ${2} \times ${2}^{k} > ${2}k^{${2}}.`] },
        { label: t`Compare with the target`, text: t`It remains to show ${math`${2}k^{${2}} \ge (k + ${1})^{${2}}`}. Their difference is ${math`${2}k^{${2}} - (k^{${2}} + ${2}k + ${1}) = (k - ${1})^{${2}} - ${2}`}, and ${math`k \ge ${5}`} gives ${math`(k - ${1})^{${2}} \ge ${16} > ${2}`}.`, why: { q: t`Where does ${math`(k - ${1})^{${2}} - ${2}`} come from?`, a: t`${math`${2}k^{${2}} - k^{${2}} - ${2}k - ${1} = k^{${2}} - ${2}k - ${1}`}, and ${math`k^{${2}} - ${2}k + ${1} = (k - ${1})^{${2}}`}, so ${math`k^{${2}} - ${2}k - ${1} = (k - ${1})^{${2}} - ${2}`}.` } },
        { label: t`Conclude`, text: t`So ${math`${2}^{k + ${1}} > ${2}k^{${2}} \ge (k + ${1})^{${2}}`}, which is the statement for ${math`k + ${1}`}. By induction from basis ${5}, ${math`${2}^{n} > n^{${2}}`} for every ${math`n \ge ${5}`}.` },
      ],
    },
    checkFrom(basis, { j: 3 }, t`It fails at ${math`n = ${2}`}, since ${math`${2}^{${2}} = ${4}`} is not more than ${5}, and holds from ${3} on.`),
    { kind: 'takeaway', text: t`Prove the first case, prove that each case forces the next, and the statement holds for every number from the first case on.` },
  ],
  examples: [
    workedCambridge(fibI),
    worked(sumStep, { s: 1 }, t`The inductive step for ${math`\sum i^{${2}}`}`),
    worked(basis, { j: 1 }, t`A basis for ${math`n! > ${2}^{n}`}`),
  ],
  generators: [sumStep, basis, recurrence],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['induction', 'base-case', 'induction-hypothesis'],
  cambridge: withUses([fibII, fibIII, bop9, tromino, polygon, polyaQ, bop13, sw412, sw422, sw411, ns2q6], {
    'ns2-q6': { sections: ['The principle', 'A first proof'], note: t`Factorising a tower of powers and showing the factors share no prime`, needs: ['proof.infinitely-many-primes'] },
    'sw-4-1-2': { sections: ['The principle', 'A first proof'], note: t`An induction whose hypothesis must cover every missing square` },
    'sw-4-2-2': { sections: ['The principle', 'Both halves are needed'], note: t`An induction for an inequality, using the condition on x in the step` },
    'sw-4-1-1': { sections: ['The principle', 'Starting later'], note: t`An induction from a later base case that cuts the polygon` },
  }),
  // The full induction proofs: tiling, Bernoulli, polygons. The Polya urn proof is set in pre.tree-diagrams,
  // where its probabilities are taught (Rule 1, 2026-10-08). The Polya answer and the Fibonacci conjectures can be found from small
  // cases without induction, and the tile count and the polygon's 180 degrees are arithmetic, so they do not gate.
  gate: ['sw-4-1-2', 'sw-4-2-2', 'sw-4-1-1'],
  recall: [
    { front: t`State the Principle of Induction.`, back: t`If ${math`P(${0})`} holds and ${mPk} implies ${mPk1} for every ${math`k \in \mathbb{N}`}, then ${math`P(n)`} holds for every ${math`n \in \mathbb{N}`}.` },
    { front: t`What are the base case, the inductive step and the induction hypothesis?`, back: t`Base case: prove ${math`P(${0})`}. Step: for arbitrary ${mk}, assume ${mPk} (the hypothesis) and deduce ${mPk1}.` },
    { front: t`State induction from a basis ${math`\ell`}.`, back: t`If ${math`P(\ell)`} holds and ${mPk} implies ${mPk1} for every ${math`k \ge \ell`}, then ${math`P(n)`} holds for every ${math`n \ge \ell`}.` },
    { front: t`In the step for a sum formula, what is the first move?`, back: t`Split off the last term: the sum to ${math`k + ${1}`} is the sum to ${mk} plus ${math`f(k + ${1})`}.` },
  ],
  proofOrder: [
    {
      title: t`The sum of the first ${mn} odd numbers is ${math`n^{${2}}`}`,
      steps: [
        t`Base case: ${math`${1} = ${1}^{${2}}`}.`,
        t`Assume the first ${mk} odd numbers add up to ${math`k^{${2}}`}.`,
        t`The sum of the first ${math`k + ${1}`} is ${math`k^{${2}} + (${2}k + ${1})`}.`,
        t`That equals ${math`(k + ${1})^{${2}}`}, the statement for ${math`k + ${1}`}.`,
        t`By induction it holds for every ${math`n \ge ${1}`}.`,
      ],
    },
  ],
};
