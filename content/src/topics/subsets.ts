/**
 * sets.subsets: subsets and power sets. The lesson follows Book of Proof, Sections 1.3 and
 * 1.4 (subsets, power sets, |P(A)| = 2^|A|); the problems are the Section 1.3 and 1.4
 * exercises, checked against the book's solutions to the odd ones, and CST Discrete
 * Mathematics supervision exercises 5.1.1 (inclusion is a partial order) and 5.2.2 (prove or
 * disprove five statements about power sets), checked by brute force over small sets. Batch 7 adds
 * exercises 5.2.3 (four ways to say A is inside B) and 5.1.2(b), with the 2023-24 official
 * solutions to sheet 5. Exercise 5.1.2(a), the empty set is a subset of every set, is the lesson's
 * theorem, so it is not set.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick, sample } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { computedTex, dmath, math, t, type Span } from '../rich';
import { quickCheck, worked, workedCambridge, type TopicContent } from '../topic';

// ---------------------------------------------------------------- a small model of finite sets

/** An element: a number, a letter, or a finite set of elements (kept sorted and without repeats). */
type El = number | string | { set: El[] };
const key = (e: El): string => (typeof e === 'number' ? `n${e}` : typeof e === 'string' ? `s${e}` : `{${e.set.map(key).join(',')}}`);
const mk = (xs: readonly El[]): { set: El[] } => {
  const seen = new Map<string, El>();
  for (const x of xs) seen.set(key(x), x);
  return { set: [...seen.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([, v]) => v) };
};
const EMPTY: El = { set: [] };
const isIn = (x: El, s: { set: El[] }): boolean => s.set.some((y) => key(y) === key(x));
const sub = (a: { set: El[] }, b: { set: El[] }): boolean => a.set.every((x) => isIn(x, b));
function tex(e: El): string {
  if (typeof e === 'number') return String(e);
  if (typeof e === 'string') return e;
  return e.set.length === 0 ? '\\varnothing' : `\\{${e.set.map(tex).join(', ')}\\}`;
}
/** A set as LaTeX built from computed parts. */
const setTex = (e: El): Span => computedTex(tex(e));
/** Every subset of a list, as lists. */
const subsetsOf = <T>(xs: readonly T[]): T[][] => xs.reduce<T[][]>((acc, x) => [...acc, ...acc.map((s) => [...s, x])], [[]]);

const [mA, mB, mm, mn] = [math`A`, math`B`, math`m`, math`n`];

// ---------------------------------------------------------------- generators

const POOL: readonly El[] = [1, 2, 3, 4, 5, 'a', 'b', 'c', mk([1, 2]), mk([3]), EMPTY, mk([mk([1])]), mk([2, 4, 5])];

/** Elements a quick reader might count: a set element counted by its size. */
const flatCount = (s: { set: El[] }): number => s.set.reduce<number>((n, x) => n + (typeof x === 'object' ? Math.max(x.set.length, 1) : 1), 0);

interface CountP { els: El[] }

const countGen = generator<CountP>({
  id: 'count-subsets',
  skill: 'Count the subsets of a finite set, whose elements may themselves be sets: 2 to the number of elements.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const els = sample(rng, POOL, int(rng, 2, 5));
      const A = mk(els);
      // At least one element that is a set of size two or more, so counting inside it is a real slip.
      if (A.set.some((x) => typeof x === 'object' && x.set.length >= 2)) return { els: A.set };
    }
  },
  sane: ({ els }) => (els.length >= 2 && els.length <= 5 ? null : 'two to five elements'),
  problem: ({ els }) => {
    const A = mk(els);
    const n = A.set.length;
    return {
      prompt: t`Let ${math`A = ${setTex(A)}`}. How many elements does the power set ${math`\mathcal{P}(A)`} have?`,
      answer: { kind: 'exact', expected: String(2 ** n) },
      solution: [
        t`First count the elements of ${mA}, the things between the outer braces. A set inside ${mA} counts as one element: ${math`|A| = ${n}`}.`,
        t`Each subset is made by deciding, for each of the ${n} elements, whether it is in or out. By the product rule that is ${math`${2}^{${n}} = ${2 ** n}`} choices, and each gives a different subset.`,
      ],
    };
  },
  solve: ({ els }) => String(subsetsOf(mk(els).set).length),
  misconceptions: ({ els }): Misconception[] => {
    const A = mk(els);
    const n = A.set.length;
    return [
      { response: String(2 ** flatCount(A)), why: t`A set that is an element of ${mA} is one element, however many things are inside it. Count only what sits between the outer braces.` },
      { response: String(2 ** n - 1), why: t`That misses one subset: the empty set ${math`\varnothing`} is a subset of every set, so it is in ${math`\mathcal{P}(A)`}.` },
      { response: String(2 * n), why: t`Each element doubles the number of subsets: the count is ${math`${2}^{${n}}`}, not ${math`${2} \times ${n}`}.` },
    ];
  },
});

interface StatP { x: El; A: El[]; B: El[] }

/** Which of six statements hold, judged by `mode`: right, with inclusion read as membership, or with the empty set taken as an element of everything. */
function statTruth(p: StatP, mode: 'right' | 'mix' | 'empty'): boolean[] {
  const A = mk(p.A);
  const B = mk(p.B);
  const sx = mk([p.x]);
  const subOrIn = (a: { set: El[] }, b: { set: El[] }): boolean => (mode === 'mix' ? isIn(a, b) : sub(a, b));
  return [
    isIn(p.x, B),
    subOrIn(sx, B),
    isIn(sx, B),
    subOrIn(A, B),
    mode === 'mix' ? isIn(EMPTY, A) : true,
    mode === 'empty' ? true : isIn(EMPTY, A),
  ];
}

const statGen = generator<StatP>({
  id: 'member-or-subset',
  skill: 'Tell membership from inclusion: x in B, {x} subset of B, {x} in B, A subset of B, and the empty set.',
  params: (rng) => {
    for (;;) {
      const x = pick(rng, [1, 2, 3, 'a', 'b']);
      const others = sample(rng, [4, 5, 'c', mk([6]), mk([1, 2]), mk(['a'])], int(rng, 1, 3));
      const B = mk([...(rng() < 0.75 ? [x] : []), ...(rng() < 0.5 ? [mk([x])] : []), ...others]);
      const A = mk(sample(rng, B.set, int(rng, 1, Math.min(2, B.set.length))).concat(rng() < 0.4 ? [7] : []));
      const p: StatP = { x, A: A.set, B: B.set };
      // The empty set is never an element of A here, so both slips about it show.
      if (!isIn(EMPTY, A) && statTruth(p, 'right').join() !== statTruth(p, 'mix').join()) return p;
    }
  },
  sane: (p) => (!isIn(EMPTY, mk(p.A)) ? null : 'the empty set must not be an element of A'),
  problem: (p) => {
    const [A, B, sx] = [mk(p.A), mk(p.B), mk([p.x])];
    const labels = [
      t`${math`${setTex(p.x)} \in B`}`, t`${math`${setTex(sx)} \subseteq B`}`, t`${math`${setTex(sx)} \in B`}`,
      t`${math`A \subseteq B`}`, t`${math`\varnothing \subseteq A`}`, t`${math`\varnothing \in A`}`,
    ];
    const truth = statTruth(p, 'right');
    const options: ChoiceOption[] = labels.map((label, i) => ({ id: `o${i}`, label }));
    return {
      prompt: t`Let ${math`A = ${setTex(A)}`} and ${math`B = ${setTex(B)}`}. Which statements are true? Choose all that are.`,
      answer: { kind: 'choice', options, correct: truth.flatMap((v, i) => (v ? [`o${i}`] : [])) },
      solution: [
        t`${math`x \in B`} asks whether ${math`x`} is one of the things listed in ${mB}. ${math`X \subseteq B`} asks whether every element of ${math`X`} is listed in ${mB}.`,
        t`So ${math`${setTex(sx)} \subseteq B`} holds exactly when ${math`${setTex(p.x)} \in B`}, while ${math`${setTex(sx)} \in B`} needs the set ${math`${setTex(sx)}`} itself to be listed in ${mB}.`,
        t`${math`\varnothing \subseteq A`} is always true: there is no element of ${math`\varnothing`} that could fail to be in ${mA}. But ${math`\varnothing \in A`} is false here, as ${math`\varnothing`} is not listed in ${mA}.`,
      ],
    };
  },
  solve: (p) => {
    // Recompute each statement from the listed elements, by brute force over the subsets of B for inclusion.
    const [A, B] = [mk(p.A), mk(p.B)];
    const subsB = subsetsOf(B.set).map((s) => key(mk(s)));
    const incl = (X: { set: El[] }): boolean => subsB.includes(key(X));
    const truth = [isIn(p.x, B), incl(mk([p.x])), isIn(mk([p.x]), B), incl(A), true, isIn(EMPTY, A)];
    return truth.flatMap((v, i) => (v ? [`o${i}`] : []));
  },
  misconceptions: (p): Misconception[] => [
    { response: statTruth(p, 'mix').flatMap((v, i) => (v ? [`o${i}`] : [])), why: t`That reads ${math`\subseteq`} as ${math`\in`}. ${math`X \subseteq B`} says every element of ${math`X`} is in ${mB}; it does not need ${math`X`} itself to be listed in ${mB}.` },
    { response: statTruth(p, 'empty').flatMap((v, i) => (v ? [`o${i}`] : [])), why: t`The empty set is a subset of every set, but an element only of the sets that list it. ${math`\varnothing`} is not listed in ${mA}.` },
  ],
});

type CardKind = 'P(A)' | 'P(AxB)' | 'P(A)xP(B)' | 'small' | 'PP(A)' | 'pairs';
interface CardP { kind: CardKind; m: number; n: number }
const choose2 = (m: number): number => (m * (m - 1)) / 2;

function cardValue({ kind, m, n }: CardP): number {
  switch (kind) {
    case 'P(A)': return 2 ** m;
    case 'P(AxB)': return 2 ** (m * n);
    case 'P(A)xP(B)': return 2 ** (m + n);
    case 'small': return m + 1;
    case 'PP(A)': return 2 ** (2 ** m);
    case 'pairs': return choose2(m);
  }
}

function cardTex(kind: CardKind): Span {
  switch (kind) {
    case 'P(A)': return math`|\mathcal{P}(A)|`;
    case 'P(AxB)': return math`|\mathcal{P}(A \times B)|`;
    case 'P(A)xP(B)': return math`|\mathcal{P}(A) \times \mathcal{P}(B)|`;
    case 'small': return math`|\{X \in \mathcal{P}(A) : |X| \le ${1}\}|`;
    case 'PP(A)': return math`|\mathcal{P}(\mathcal{P}(A))|`;
    case 'pairs': return math`|\{X \in \mathcal{P}(A) : |X| = ${2}\}|`;
  }
}

const cardGen = generator<CardP>({
  id: 'cardinality',
  skill: 'Find sizes of sets built from power sets and products, as in Book of Proof 1.4, 13 to 20.',
  params: (rng) => {
    const kind = pick(rng, ['P(A)', 'P(AxB)', 'P(A)xP(B)', 'small', 'PP(A)', 'pairs'] as const);
    return { kind, m: kind === 'PP(A)' ? int(rng, 1, 3) : int(rng, 2, 4), n: int(rng, 1, 3) };
  },
  sane: ({ kind, m, n }) => (m >= 1 && m <= 4 && n >= 1 && n <= 3 && (kind !== 'PP(A)' || m <= 3) && (kind !== 'pairs' || m >= 2) ? null : 'out of range'),
  problem: (p) => {
    const { kind, m, n } = p;
    const v = cardValue(p);
    const sol = {
      'P(A)': t`${mA} has ${m} elements, so ${math`\mathcal{P}(A)`} has ${math`${2}^{${m}} = ${v}`}.`,
      'P(AxB)': t`${math`A \times B`} has ${math`${m} \times ${n} = ${m * n}`} elements, so its power set has ${math`${2}^{${m * n}} = ${v}`}.`,
      'P(A)xP(B)': t`${math`|\mathcal{P}(A)| = ${2 ** m}`} and ${math`|\mathcal{P}(B)| = ${2 ** n}`}; a product has the product of the sizes, ${math`${2 ** m} \times ${2 ** n} = ${v}`}.`,
      small: t`The subsets of size at most ${1} are ${math`\varnothing`} and the ${m} one-element sets ${math`\{a\}`} with ${math`a \in A`}: ${math`${1} + ${m} = ${v}`}.`,
      'PP(A)': t`${math`\mathcal{P}(A)`} has ${math`${2}^{${m}} = ${2 ** m}`} elements, so its power set has ${math`${2}^{${2 ** m}} = ${v}`}.`,
      pairs: t`A two-element subset is a choice of ${2} of the ${m} elements, order ignored: ${math`\binom{${m}}{${2}} = ${v}`}.`,
    }[kind];
    return {
      prompt: t`Suppose ${math`|A| = ${m}`} and ${math`|B| = ${n}`}. Find ${cardTex(kind)}.`,
      answer: { kind: 'exact', expected: String(v) },
      solution: [sol],
    };
  },
  solve: (p) => {
    // Build actual sets A = {1..m}, B = {1..n} and count.
    const A = Array.from({ length: p.m }, (_, i) => i + 1);
    const B = Array.from({ length: p.n }, (_, i) => i + 1);
    const PA = subsetsOf(A);
    switch (p.kind) {
      case 'P(A)': return String(PA.length);
      case 'P(AxB)': return String(subsetsOf(A.flatMap((a) => B.map((b) => [a, b]))).length);
      case 'P(A)xP(B)': return String(PA.length * subsetsOf(B).length);
      case 'small': return String(PA.filter((s) => s.length <= 1).length);
      case 'PP(A)': return String(subsetsOf(PA).length);
      case 'pairs': return String(PA.filter((s) => s.length === 2).length);
    }
  },
  misconceptions: (p): Misconception[] => {
    const { kind, m, n } = p;
    const out: Misconception[] = [];
    if (kind === 'P(AxB)') out.push({ response: String(2 ** (m + n)), why: t`${math`A \times B`} has ${math`mn`} elements, not ${math`m + n`}: a product multiplies sizes.` });
    if (kind === 'P(A)xP(B)') out.push({ response: String(2 ** (m * n)), why: t`That is ${math`|\mathcal{P}(A \times B)|`}. Here the two power sets are formed first, with ${math`${2}^{${m}}`} and ${math`${2}^{${n}}`} elements, and then multiplied.` });
    if (kind === 'small') out.push({ response: String(m), why: t`Count the empty set too: it has size ${0}, which is at most ${1}.` });
    if (kind === 'PP(A)') out.push({ response: String(2 ** (2 * m)), why: t`The power set of ${math`\mathcal{P}(A)`} has ${math`${2}`} to the power ${math`|\mathcal{P}(A)| = ${2}^{${m}}`}, not to the power ${math`${2}m`}.` });
    if (kind === 'pairs') out.push({ response: String(m * (m - 1)), why: t`That counts ordered pairs. A set ${math`\{a, b\}`} is the same as ${math`\{b, a\}`}, so divide by ${2}.` });
    out.push({ response: String(cardValue(p) + 1), why: t`Recount carefully; there is no extra set to add. The empty set is already counted.` });
    out.push({ response: String(Math.max(cardValue(p) - 1, 0)), why: t`That leaves one out: often the empty set ${math`\varnothing`}, which belongs to every power set.` });
    return out;
  },
});

interface WithP { n: number; inside: number; outside: number }

const withGen = generator<WithP>({
  id: 'subsets-with',
  skill: 'Count the subsets of {1, ..., n} that contain some given elements and avoid others.',
  quick: true,
  params: (rng) => {
    const n = int(rng, 4, 8);
    const inside = int(rng, 1, 2);
    return { n, inside, outside: int(rng, 0, Math.min(2, n - inside - 1)) };
  },
  sane: ({ n, inside, outside }) => (inside >= 1 && outside >= 0 && inside + outside < n ? null : 'out of range'),
  problem: ({ n, inside, outside }) => {
    const ins = Array.from({ length: inside }, (_, i) => i + 1);
    const outs = Array.from({ length: outside }, (_, i) => inside + i + 1);
    const free = n - inside - outside;
    const cond = outside === 0
      ? t`contain ${ins.length === 1 ? t`the element ${1}` : t`both ${1} and ${2}`}`
      : t`contain ${ins.length === 1 ? t`${1}` : t`${1} and ${2}`} but not ${outs.length === 1 ? t`${outs[0] as number}` : t`${outs[0] as number} or ${outs[1] as number}`}`;
    return {
      prompt: t`How many subsets of ${math`\{${1}, ${2}, \ldots, ${n}\}`} ${cond}?`,
      answer: { kind: 'exact', expected: String(2 ** free) },
      solution: [
        t`The ${inside + outside} named elements are decided already. Each of the other ${free} elements is free: in or out.`,
        t`By the product rule there are ${math`${2}^{${free}} = ${2 ** free}`} such subsets.`,
      ],
    };
  },
  solve: ({ n, inside, outside }) => {
    const all = subsetsOf(Array.from({ length: n }, (_, i) => i + 1));
    return String(all.filter((s) => Array.from({ length: inside }, (_, i) => i + 1).every((x) => s.includes(x)) && Array.from({ length: outside }, (_, i) => inside + i + 1).every((x) => !s.includes(x))).length);
  },
  misconceptions: ({ n, inside, outside }): Misconception[] => [
    { response: String(2 ** n), why: t`That counts every subset. The named elements are fixed, so only the other ${n - inside - outside} elements give choices.` },
    { response: String(2 ** (n - inside - outside) - 1), why: t`The free elements may all be out: that subset counts too.` },
    { response: String(2 ** (n - inside)), why: outside === 0 ? t`Each fixed element removes a choice, so the power is ${n - inside - outside}.` : t`The excluded elements are fixed as well (they must be out), so they give no choice either.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const BOP_SOL = (at: string) => cite('bop', `Solutions, ${at}`);
type Rich_ = ReturnType<typeof t>;
const card = (id: string, num: number, what: Span, expected: string, mdom: number, official: string | null, steps: Rich_[], wrong: { response: string; why: Rich_ }, formula: (m: number, n: number) => number, count: (A: number[], B: number[]) => number) => auto({
  id,
  source: cite('bop', `Section 1.4, exercise ${num}`),
  title: t`The size of ${what}`,
  prompt: t`Suppose that ${math`|A| = m`} and ${math`|B| = n`}. Find ${what}, as a formula in ${mm} and ${mn}. (Type powers with a caret, as on a calculator.)`,
  answer: { kind: 'expression', expected, variables: ['m', 'n'], domains: { m: { kind: 'integer', min: 0, max: mdom }, n: { kind: 'integer', min: 0, max: 3 } } },
  solution: steps,
  reference: expected,
  verify: () => {
    // The formula against a count of real sets A = {1..m}, B = {1..n}.
    for (let m = 0; m <= Math.min(mdom, 3); m++) for (let n = 0; n <= 2; n++) {
      const A = Array.from({ length: m }, (_, i) => i + 1);
      const B = Array.from({ length: n }, (_, i) => i + 1);
      const e = same(`${id} at m = ${m}, n = ${n}`, formula(m, n), count(A, B));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [wrong],
  ...(official === null ? {} : { official: { source: BOP_SOL(`Section 1.4, exercise ${num}`), answer: official, agrees: true } }),
});

const b1417 = card('b1-4-17', 17, math`|\{X \in \mathcal{P}(A) : |X| \le ${1}\}|`, 'm + 1', 4, 'm + 1', [
  t`An element of ${math`\mathcal{P}(A)`} is a subset ${math`X`} of ${mA}. We want the subsets with at most one element.`,
  t`Size ${0}: only ${math`\varnothing`}, one subset. Size ${1}: one subset ${math`\{a\}`} for each ${math`a \in A`}, so ${mm} of them.`,
  t`These are all different, so the total is ${math`m + ${1}`}. (Check with ${math`A = \{${1}, ${2}\}`}: ${math`\varnothing, \{${1}\}, \{${2}\}`}, three.)`,
], { response: 'm', why: t`The empty set has size ${0}, which is at most ${1}, so it counts too.` }, (m) => m + 1, (A) => subsetsOf(A).filter((s) => s.length <= 1).length);

const b1413 = card('b1-4-13', 13, math`|\mathcal{P}(\mathcal{P}(\mathcal{P}(A)))|`, '2^(2^(2^m))', 2, '2^(2^(2^m))', [
  t`Each power set raises ${2} to the size of the set before: ${math`|\mathcal{P}(A)| = ${2}^{m}`}, then ${math`|\mathcal{P}(\mathcal{P}(A))| = ${2}^{${2}^{m}}`}.`,
  t`Once more: ${math`|\mathcal{P}(\mathcal{P}(\mathcal{P}(A)))| = ${2}^{${2}^{${2}^{m}}}`}.`,
], { response: '2^(3m)', why: t`Each step puts the whole previous size in the exponent: ${math`${2}^{${2}^{${2}^{m}}}`}, a tower, not ${math`${2}^{${3}m}`}.` }, (m) => 2 ** (2 ** (2 ** m)), (A) => (A.length <= 1 ? subsetsOf(subsetsOf(subsetsOf(A))).length : 2 ** subsetsOf(subsetsOf(A)).length));

const b1415 = card('b1-4-15', 15, math`|\mathcal{P}(A \times B)|`, '2^(m n)', 4, '2^(m n)', [
  t`${math`|A \times B| = mn`}, so ${math`|\mathcal{P}(A \times B)| = ${2}^{mn}`}.`,
], { response: '2^(m + n)', why: t`${math`A \times B`} has ${math`mn`} elements.` }, (m, n) => 2 ** (m * n), (A, B) => subsetsOf(A.flatMap((a) => B.map((b) => [a, b]))).length);

const b1416 = card('b1-4-16', 16, math`|\mathcal{P}(A) \times \mathcal{P}(B)|`, '2^(m + n)', 4, null, [
  t`${math`|\mathcal{P}(A)| \cdot |\mathcal{P}(B)| = ${2}^{m} \cdot ${2}^{n} = ${2}^{m + n}`}.`,
], { response: '2^(m n)', why: t`That is ${math`|\mathcal{P}(A \times B)|`}. The product of the two power sets has ${math`${2}^{m} \cdot ${2}^{n}`} elements.` }, (m, n) => 2 ** (m + n), (A, B) => subsetsOf(A).length * subsetsOf(B).length);

const b1418 = card('b1-4-18', 18, math`|\mathcal{P}(A \times \mathcal{P}(B))|`, '2^(m*2^n)', 3, null, [
  t`${math`|\mathcal{P}(B)| = ${2}^{n}`}, so ${math`|A \times \mathcal{P}(B)| = m${2}^{n}`}, and its power set has ${math`${2}^{m${2}^{n}}`} elements.`,
], { response: '2^(m + 2^n)', why: t`A product multiplies sizes: ${math`|A \times \mathcal{P}(B)| = m \cdot ${2}^{n}`}.` }, (m, n) => 2 ** (m * 2 ** n), (A, B) => subsetsOf(A.flatMap((a) => subsetsOf(B).map((X) => [a, X]))).length);

const b1419 = card('b1-4-19', 19, math`|\mathcal{P}(\mathcal{P}(\mathcal{P}(A \times \varnothing)))|`, '4', 3, '4', [
  t`There are no pairs ${math`(a, b)`} with ${math`b \in \varnothing`}, so ${math`A \times \varnothing = \varnothing`}.`,
  t`${math`|\mathcal{P}(\varnothing)| = ${2}^{${0}} = ${1}`} (it is ${math`\{\varnothing\}`}), then ${math`${2}^{${1}} = ${2}`}, then ${math`${2}^{${2}} = ${4}`}.`,
], { response: '1', why: t`${math`\mathcal{P}(\varnothing) = \{\varnothing\}`} has one element, not none; the next power sets have ${2} and then ${4}.` }, () => 4, (A) => subsetsOf(subsetsOf(subsetsOf(A.flatMap(() => [] as number[])))).length);

const b1420 = card('b1-4-20', 20, math`|\{X \subseteq \mathcal{P}(A) : |X| \le ${1}\}|`, '2^m + 1', 4, null, [
  t`Now ${math`X`} is a subset of ${math`\mathcal{P}(A)`}, which has ${math`${2}^{m}`} elements.`,
  t`The subsets of size at most ${1}: ${math`\varnothing`}, and one singleton for each of the ${math`${2}^{m}`} elements. Total ${math`${2}^{m} + ${1}`}.`,
], { response: 'm + 1', why: t`That is exercise ${17}, about subsets of ${mA}. Here ${math`X`} is a subset of ${math`\mathcal{P}(A)`}, which has ${math`${2}^{m}`} elements.` }, (m) => 2 ** m + 1, (A) => subsetsOf(subsetsOf(A)).filter((s) => s.length <= 1).length);

const b1314 = auto({
  id: 'b1-3-14',
  source: cite('bop', 'Section 1.3, exercise 14'),
  title: t`Is the plane inside space?`,
  prompt: t`Decide whether ${math`\mathbb{R}^{${2}} \subseteq \mathbb{R}^{${3}}`}, and choose the reason.`,
  answer: {
    kind: 'choice',
    options: [
      { id: 'f', label: t`False: an element of ${math`\mathbb{R}^{${2}}`} is a pair ${math`(x, y)`}, and no pair is a triple.` },
      { id: 't', label: t`True: ${math`(x, y)`} is the same point as ${math`(x, y, ${0})`}.` },
      { id: 't2', label: t`True: the plane is drawn inside three dimensional space.` },
    ],
    correct: 'f',
  },
  solution: [
    t`${math`A \subseteq B`} means every element of ${mA} is an element of ${mB}. Elements of ${math`\mathbb{R}^{${2}}`} are ordered pairs; elements of ${math`\mathbb{R}^{${3}}`} are ordered triples.`,
    t`${math`(${1}, ${2})`} is a pair, and a pair is not a triple, so ${math`(${1}, ${2}) \notin \mathbb{R}^{${3}}`}. Hence the statement is false. Picturing the plane inside space identifies ${math`(x, y)`} with ${math`(x, y, ${0})`}, but that is a correspondence, not equality of elements.`,
  ],
  reference: 'f',
  verify: () => same('a pair is not a triple', [1, 2].length === [1, 2, 0].length, false),
  misconceptions: [
    { response: 't', why: t`${math`(x, y)`} and ${math`(x, y, ${0})`} are different objects: one has two entries, the other three. Matching them up is a choice, not a fact about the sets.` },
    { response: 't2', why: t`A picture can suggest an inclusion that the definitions do not give. Check the definition: is the pair ${math`(${1}, ${2})`} a triple?` },
  ],
});

const cstPowers = auto({
  id: 'sw-5-2-2',
  source: cite('cst-dm-sw1', 'Exercises 5, 5.2.2'),
  title: t`Power sets and unions`,
  prompt: t`For all sets ${mA} and ${mB}, which of these statements hold? Choose all that hold for every pair of sets.`,
  answer: {
    kind: 'choice',
    options: [
      { id: 'a', label: t`${math`A \subseteq B \implies \mathcal{P}(A) \subseteq \mathcal{P}(B)`}` },
      { id: 'b', label: t`${math`\mathcal{P}(A \cup B) \subseteq \mathcal{P}(A) \cup \mathcal{P}(B)`}` },
      { id: 'c', label: t`${math`\mathcal{P}(A) \cup \mathcal{P}(B) \subseteq \mathcal{P}(A \cup B)`}` },
      { id: 'd', label: t`${math`\mathcal{P}(A \cap B) \subseteq \mathcal{P}(A) \cap \mathcal{P}(B)`}` },
      { id: 'e', label: t`${math`\mathcal{P}(A) \cap \mathcal{P}(B) \subseteq \mathcal{P}(A \cap B)`}` },
    ],
    correct: ['a', 'c', 'd', 'e'],
  },
  solution: [
    t`(a) If ${math`X \subseteq A`} and ${math`A \subseteq B`}, then ${math`X \subseteq B`}, since inclusion chains. True.`,
    t`(b) False: take ${math`A = \{${1}\}`}, ${math`B = \{${2}\}`}. Then ${math`\{${1}, ${2}\} \in \mathcal{P}(A \cup B)`}, but ${math`\{${1}, ${2}\}`} is a subset of neither ${mA} nor ${mB}.`,
    t`(c) A subset of ${mA} or of ${mB} is a subset of ${math`A \cup B`}. True.`,
    t`(d) and (e): ${math`X \subseteq A \cap B`} exactly when ${math`X \subseteq A`} and ${math`X \subseteq B`}, so ${math`\mathcal{P}(A \cap B) = \mathcal{P}(A) \cap \mathcal{P}(B)`}. Both true.`,
  ],
  reference: ['a', 'c', 'd', 'e'],
  verify: () => {
    // Brute force over every pair of subsets of {1, 2, 3}.
    const U = subsetsOf([1, 2, 3]);
    const k = (s: number[]): string => [...s].sort().join(',');
    const P = (s: number[]): Set<string> => new Set(subsetsOf(s).map(k));
    const within = (x: Set<string>, y: Set<string>): boolean => [...x].every((v) => y.has(v));
    const holds = { a: true, b: true, c: true, d: true, e: true };
    for (const A of U) for (const B of U) {
      const union = [...new Set([...A, ...B])];
      const inter = A.filter((x) => B.includes(x));
      const [PA, PB] = [P(A), P(B)];
      if (A.every((x) => B.includes(x)) && !within(PA, PB)) holds.a = false;
      if (!within(P(union), new Set([...PA, ...PB]))) holds.b = false;
      if (!within(new Set([...PA, ...PB]), P(union))) holds.c = false;
      if (!within(P(inter), new Set([...PA].filter((x) => PB.has(x))))) holds.d = false;
      if (!within(new Set([...PA].filter((x) => PB.has(x))), P(inter))) holds.e = false;
    }
    return same('statements that hold', Object.entries(holds).filter(([, v]) => v).map(([id]) => id).join(','), 'a,c,d,e');
  },
  misconceptions: [
    { response: ['a', 'b', 'c', 'd', 'e'], why: t`(b) fails: with ${math`A = \{${1}\}`} and ${math`B = \{${2}\}`}, the set ${math`\{${1}, ${2}\}`} is a subset of ${math`A \cup B`} but of neither ${mA} nor ${mB}.` },
    { response: ['a', 'c', 'd'], why: t`(e) holds too: a set inside both ${mA} and ${mB} is inside ${math`A \cap B`}, by the definition of intersection.` },
  ],
});

const cstPowersProof = supervision({
  id: 'sw-5-2-2-proof',
  source: cite('cst-dm-sw1', 'Exercises 5, 5.2.2'),
  title: t`Prove or disprove the power set statements`,
  prompt: t`Either prove or disprove that, for all sets ${mA} and ${mB}: (a) ${math`A \subseteq B \implies \mathcal{P}(A) \subseteq \mathcal{P}(B)`}; (b) ${math`\mathcal{P}(A \cup B) \subseteq \mathcal{P}(A) \cup \mathcal{P}(B)`}; (c) ${math`\mathcal{P}(A) \cup \mathcal{P}(B) \subseteq \mathcal{P}(A \cup B)`}; (d) ${math`\mathcal{P}(A \cap B) \subseteq \mathcal{P}(A) \cap \mathcal{P}(B)`}; (e) ${math`\mathcal{P}(A) \cap \mathcal{P}(B) \subseteq \mathcal{P}(A \cap B)`}.`,
  writeUp: 'proof',
});

const cstPartialOrder = supervision({
  id: 'sw-5-1-1',
  source: cite('cst-dm-sw1', 'Exercises 5, 5.1.1'),
  title: t`Inclusion is a partial order`,
  prompt: t`Prove that ${math`\subseteq`} is a partial order: reflexive (${math`A \subseteq A`} for every set ${mA}), transitive (${math`A \subseteq B`} and ${math`B \subseteq C`} imply ${math`A \subseteq C`}), and antisymmetric (${math`A \subseteq B`} and ${math`B \subseteq A`} together are equivalent to ${math`A = B`}).`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- Cambridge problems: gates (batch 7)

/*
 * Outline for marking sw-5-2-3 (20 marks): a cycle of implications, each by elements.
 * (a) => (b): A is inside A u B = B (4).
 * (b) => (c): A n B is inside A always; and A inside B gives A inside A n B; equal by two inclusions (4).
 * (c) => (d): if x is not in B, then x is not in A n B = A (4).
 * (d) => (b): x in A and x not in B would put x in the complement of B, so outside A: contradiction (4).
 * (b) => (a): B is inside A u B always; A and B inside B give A u B inside B (4).
 * (Any cycle, or pairs of implications, that links all four earns full credit.)
 */
const sw523 = supervision({
  id: 'sw-5-2-3',
  source: cite('cst-dm-sw1', 'Exercises 5, 5.2.3'),
  title: t`Four ways to say A is inside B`,
  prompt: t`Let ${math`U`} be a set. For all subsets ${math`A, B`} of ${math`U`}, with complements taken in ${math`U`}, prove that the following statements are equivalent: (a) ${math`A \cup B = B`}; (b) ${math`A \subseteq B`}; (c) ${math`A \cap B = A`}; (d) ${math`B^{c} \subseteq A^{c}`}.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-5', '5.2.3'),
});

/*
 * Outline for marking sw-5-1-2-b (20 marks):
 * 1. (=>) Assume no x is in A. Then A is inside the empty set vacuously (no element to check), and the
 *    empty set is inside A (the lesson's theorem); equal by two inclusions (12).
 * 2. (<=) If A is the empty set, it has no elements, so no x is in A (6). Both directions named (2).
 */
const sw512b = supervision({
  id: 'sw-5-1-2-b',
  source: cite('cst-dm-sw1', 'Exercises 5, 5.1.2(b)'),
  title: t`Having no elements is being empty`,
  prompt: t`Prove that for every set ${mA}, ${math`(\forall x.\ x \notin A) \iff A = \varnothing`}.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-5', '5.1.2(b)'),
});

// ---------------------------------------------------------------- lesson

const EX3 = mk([1, 2, 3]);
const EX3subs = subsetsOf(EX3.set).map((s) => mk(s));

export const subsetsTopic: TopicContent = {
  topicId: 'sets.subsets',
  goal: t`Decide whether ${math`A \subseteq B`}, list every subset of a finite set, and count the ${math`${2}^{n}`} subsets in its power set.`,
  objective: t`Tell membership from inclusion, list subsets, and count a power set.`,
  why: t`Subsets are how every later definition says one set sits inside another; power sets count choices.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`In it, or inside it?` },
    { kind: 'hook', text: t`Is ${math`\{${1}\}`} an element of ${math`\{${1}, ${2}\}`}? It looks as if it should be. It is not. And is the empty set inside every set, even one with nothing to do with it? It is. Both answers come from reading one definition carefully.` },
    { kind: 'narrative', text: t`The set ${math`\{${1}, ${2}\}`} has exactly two elements, the numbers ${1} and ${2}. The set ${math`\{${1}\}`} is a different object, a box holding the number ${1}. It is not listed, so it is not an element. What is true is that everything in the box ${math`\{${1}\}`} is also in ${math`\{${1}, ${2}\}`}. That is a second relation between sets, and it needs its own name.` },
    {
      kind: 'definition',
      name: t`Subset`,
      formal: t`A set ${mA} is a [[subset|subset]] of a set ${mB}, written ${math`A \subseteq B`}, if every element of ${mA} is an element of ${mB}: ${dmath`A \subseteq B \iff \forall x\,(x \in A \implies x \in B).`} If ${math`A \subseteq B`} and ${math`A \neq B`}, ${mA} is a proper subset of ${mB}. We write ${math`A \not\subseteq B`} when some element of ${mA} is not in ${mB}.`,
      plain: t`${mA} sits inside ${mB}: nothing in ${mA} is missing from ${mB}. ${math`\{${1}\} \subseteq \{${1}, ${2}\}`}, and ${math`\{${1}, ${3}\} \not\subseteq \{${1}, ${2}\}`} because ${3} is missing.`,
    },
    { kind: 'p', text: t`So there are two questions to ask of a set ${math`X`} and a set ${mB}. Is ${math`X \in B`}: is ${math`X`} itself one of the things listed in ${mB}? Is ${math`X \subseteq B`}: is each thing in ${math`X`} listed in ${mB}? They can have different answers. With ${math`B = \{${1}, \{${1}\}\}`}, both hold for ${math`X = \{${1}\}`}; with ${math`B = \{${1}, ${2}\}`}, only the second does.` },
    { kind: 'theorem', name: t`The empty set`, statement: t`For every set ${mA}, ${math`\varnothing \subseteq A`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Unfold the definition`, text: t`We must show: for every ${math`x`}, if ${math`x \in \varnothing`} then ${math`x \in A`}.` },
        { label: t`The hypothesis never holds`, text: t`No ${math`x`} satisfies ${math`x \in \varnothing`}, since ${math`\varnothing`} has no elements.`, why: { q: t`Why does that make the implication true?`, a: t`An implication "if P then Q" is false only when P is true and Q is false. Here P is false for every ${math`x`}, so the implication is true for every ${math`x`}. Such an implication is called vacuously true.` } },
        { label: t`Conclude`, text: t`So the statement holds for every ${math`x`}, and ${math`\varnothing \subseteq A`}.`, plain: t`To break ${math`\varnothing \subseteq A`} you would need an element of ${math`\varnothing`} outside ${mA}, and there is no element of ${math`\varnothing`} at all.` },
      ],
    },
    { kind: 'theorem', name: t`Equality by two inclusions`, statement: t`For sets ${mA} and ${mB}, ${math`A = B`} if and only if ${math`A \subseteq B`} and ${math`B \subseteq A`}.` },
    { kind: 'p', text: t`This is the definition of set equality in disguise: two sets are equal when they have exactly the same elements, and the two inclusions say "nothing of ${mA} is missing from ${mB}" and "nothing of ${mB} is missing from ${mA}". It is how almost every proof that two sets are equal goes.` },
    { kind: 'section', title: t`All the subsets at once` },
    { kind: 'narrative', text: t`List the subsets of ${math`${setTex(EX3)}`}. Go by size: the empty set; the three one-element sets; the three two-element sets; and the whole set. That is ${EX3subs.length} subsets. Did you remember the first and the last? Both count.` },
    {
      kind: 'definition',
      name: t`Power set`,
      formal: t`The [[power-set|power set]] of a set ${mA} is the set of all subsets of ${mA}: ${math`\mathcal{P}(A) = \{X : X \subseteq A\}`}.`,
      plain: t`Collect every subset into one new set. ${math`\mathcal{P}(\{${1}, ${2}\}) = \{\varnothing, \{${1}\}, \{${2}\}, \{${1}, ${2}\}\}`}, a set with ${4} elements, each of them a set.`,
    },
    { kind: 'theorem', name: t`Size of a power set`, statement: t`If ${mA} is a finite set with ${math`|A| = n`}, then ${math`|\mathcal{P}(A)| = ${2}^{n}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Name the elements`, text: t`Write ${math`A = \{a_{${1}}, a_{${2}}, \ldots, a_{n}\}`} with the ${math`a_{i}`} different.` },
        { label: t`A subset is a list of choices`, text: t`A subset ${math`X \subseteq A`} is determined by answering, for each ${math`i`}, whether ${math`a_{i} \in X`}: in or out.`, plain: t`For ${math`A = ${setTex(EX3)}`}, the answers "in, out, in" give ${math`\{${1}, ${3}\}`}.` },
        { label: t`Different answers, different subsets`, text: t`Two different lists of answers disagree about some ${math`a_{i}`}, so they give different subsets; and every list of answers gives some subset.` },
        { label: t`Count the lists`, text: t`There are ${2} choices for each of ${mn} elements, so by the product rule there are ${math`${2} \times ${2} \times \cdots \times ${2} = ${2}^{n}`} lists, hence ${math`${2}^{n}`} subsets.`, why: { q: t`Does it work for ${math`n = ${0}`}?`, a: t`Yes. ${math`\mathcal{P}(\varnothing) = \{\varnothing\}`} has ${math`${2}^{${0}} = ${1}`} element: the empty set is a subset of itself.` } },
      ],
    },
    quickCheck({ prompt: t`How many elements does ${math`\mathcal{P}(\{a, \{b, c\}\})`} have?`, answer: { kind: 'exact', expected: String(2 ** 2) }, reference: String(2 ** 2), why: t`The set has two elements, ${math`a`} and the set ${math`\{b, c\}`}, so its power set has ${math`${2}^{${2}} = ${4}`}: ${math`\varnothing, \{a\}, \{\{b, c\}\}, \{a, \{b, c\}\}`}.` }),
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${math`\mathbb{R}^{${2}} \subseteq \mathbb{R}^{${3}}`}, because the plane sits inside space.`, counterexample: t`${math`(${1}, ${2})`} is an element of ${math`\mathbb{R}^{${2}}`}, an ordered pair, and no ordered pair is an ordered triple. So ${math`(${1}, ${2}) \notin \mathbb{R}^{${3}}`} and the inclusion fails. The picture matches ${math`(x, y)`} with ${math`(x, y, ${0})`}, but matching is not equality.` },
    { kind: 'pitfall', claim: t`${math`\mathcal{P}(\varnothing) = \varnothing`}, since the empty set has nothing in it.`, counterexample: t`${math`\varnothing \subseteq \varnothing`}, so ${math`\varnothing \in \mathcal{P}(\varnothing)`}. Thus ${math`\mathcal{P}(\varnothing) = \{\varnothing\}`}, which has one element, as ${math`${2}^{${0}} = ${1}`} predicts.` },
    { kind: 'pitfall', claim: t`${math`|\mathcal{P}(\{${1}, \{${2}, ${3}\}\})| = ${2}^{${3}}`}, as the set involves three numbers.`, counterexample: t`The set has two elements: ${1} and the set ${math`\{${2}, ${3}\}`}. So its power set has ${math`${2}^{${2}} = ${4}`} elements. Count what is between the outer braces.` },
    { kind: 'takeaway', text: t`${math`X \in B`} asks whether ${math`X`} is listed in ${mB}; ${math`X \subseteq B`} asks whether everything in ${math`X`} is; and a set with ${mn} elements has ${math`${2}^{n}`} subsets.` },
  ],
  examples: [
    workedCambridge(b1417),
    worked(statGen, { x: 1, A: mk([1, 4]).set, B: mk([1, mk([1]), 4]).set }, t`Membership against inclusion`),
    worked(cardGen, { kind: 'P(A)xP(B)', m: 3, n: 2 }, t`A product of power sets`),
  ],
  generators: [countGen, statGen, cardGen, withGen],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['subset', 'power-set'],
  cambridge: [cstPowers, cstPowersProof, cstPartialOrder, b1314, b1413, b1415, b1416, b1418, b1419, b1420, sw523, sw512b],
  // The CST proofs: power sets, then the four equivalent forms of inclusion. The empty set exercise is
  // two short vacuous arguments, practice rather than a gate.
  gate: ['sw-5-2-2-proof', 'sw-5-2-3'],
  recall: [
    { front: t`Define ${math`A \subseteq B`}.`, back: t`Every element of ${mA} is an element of ${mB}: ${math`\forall x\,(x \in A \implies x \in B)`}.` },
    { front: t`Define the power set ${math`\mathcal{P}(A)`}, and give its size when ${math`|A| = n`}.`, back: t`${math`\mathcal{P}(A) = \{X : X \subseteq A\}`}; it has ${math`${2}^{n}`} elements.` },
    { front: t`Why is ${math`\varnothing \subseteq A`} for every set ${mA}?`, back: t`There is no element of ${math`\varnothing`}, so none can fail to be in ${mA}: the condition holds vacuously.` },
  ],
  proofOrder: [
    {
      title: t`A set of size ${mn} has ${math`${2}^{n}`} subsets`,
      steps: [
        t`List the elements ${math`a_{${1}}, \ldots, a_{n}`} of ${mA}.`,
        t`A subset is fixed by saying, for each ${math`a_{i}`}, in or out.`,
        t`Different in-or-out lists give different subsets.`,
        t`There are ${math`${2}^{n}`} lists, by the product rule.`,
      ],
    },
  ],
};
