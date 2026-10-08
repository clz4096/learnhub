/**
 * alg.telescoping: telescoping sums and products (the method of differences): the middle terms
 * of a sum of f(r) - f(r - 1), or of a product of g(r)/g(r - 1), cancel. From the STEP
 * specification ("the method of differences ... including the use of partial fractions") and
 * STEP Support Assignments 15, Q1(iii) (product notation), 17, Q2(iii) (1/(r(r + 1))) and
 * 24, Q2(iii) and Q3 (1998 STEP II Q4, I_n - I_(n-1)), checked against the hints, by exact
 * arithmetic, and for the integral by numerical integration.
 *
 * The gate is STEP Support Assignment 6 Q1(i), second part: the product of (1 + 1/(2r)) over
 * (1 - 1/(2r)) to n brackets, and why it is 2n + 1. It moved here from pre.fractions
 * (2026-10-06), whose lesson teaches the four-bracket case but not algebra with n; here it
 * is a telescoping product. A24 Q3 integrates by parts, taught later, so it is practice.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const [mn, mr] = [math`n`, math`r`];
const sumQ = (lo: number, hi: number, f: (r: number) => Rational): Rational => {
  let s = q(0);
  for (let r = lo; r <= hi; r++) s = add(s, f(r));
  return s;
};
const prodQ = (lo: number, hi: number, f: (r: number) => Rational): Rational => {
  let p = q(1);
  for (let r = lo; r <= hi; r++) p = mul(p, f(r));
  return p;
};

// ---------------------------------------------------------------- generators

interface PairP { a: number; b: number }

const pairGen = generator<PairP>({
  id: 'partial-fractions',
  skill: 'Sum 1/(r(r + 1)) from r = a to b by writing it as 1/r - 1/(r + 1).',
  quick: true,
  params: (rng) => {
    const a = pick(rng, [1, 1, 2, 3, 5, 10]);
    return { a, b: a + int(rng, 3, 40) };
  },
  sane: ({ a, b }) => (a >= 1 && b > a ? null : 'need a < b'),
  problem: ({ a, b }) => {
    const ans = sub(q(1, a), q(1, b + 1));
    return {
      prompt: t`Find ${math`\sum_{r = ${a}}^{${b}} \frac{${1}}{r(r + ${1})}`} exactly.`,
      answer: { kind: 'exact', expected: str(ans) },
      solution: [
        t`${math`\frac{${1}}{r} - \frac{${1}}{r + ${1}} = \frac{(r + ${1}) - r}{r(r + ${1})} = \frac{${1}}{r(r + ${1})}`}, so each term is a difference.`,
        t`Write the sum out: ${math`\left(\frac{${1}}{${a}} - \frac{${1}}{${a + 1}}\right) + \left(\frac{${1}}{${a + 1}} - \frac{${1}}{${a + 2}}\right) + \cdots + \left(\frac{${1}}{${b}} - \frac{${1}}{${b + 1}}\right)`}. Everything cancels except the first and the last piece.`,
        t`So the sum is ${math`\frac{${1}}{${a}} - \frac{${1}}{${b + 1}} = ${ans}`}.`,
      ],
    };
  },
  solve: ({ a, b }) => str(sumQ(a, b, (r) => q(1, r * (r + 1)))),
  misconceptions: ({ a, b }): Misconception[] => [
    { response: str(sub(q(1, a), q(1, b))), why: t`The last piece is ${math`-\frac{${1}}{${b + 1}}`}: the term with ${math`r = ${b}`} is ${math`\frac{${1}}{${b}} - \frac{${1}}{${b + 1}}`}.` },
    { response: str(sub(q(1), q(1, b + 1))), why: t`The sum starts at ${math`r = ${a}`}, so the first surviving piece is ${math`\frac{${1}}{${a}}`}.` },
    { response: str(sub(q(1, a + 1), q(1, b + 1))), why: t`The first surviving piece is ${math`\frac{${1}}{${a}}`}, from the first term; nothing cancels it.` },
  ],
});

interface GapP { n: number }

const gapGen = generator<GapP>({
  id: 'gap-two',
  skill: 'Sum 1/(r(r + 2)) by partial fractions: with a gap of two, two pieces survive at each end.',
  params: (rng) => ({ n: int(rng, 4, 30) }),
  sane: ({ n }) => (n >= 4 ? null : 'out of range'),
  problem: ({ n }) => {
    const ans = mul(q(1, 2), sub(add(q(1), q(1, 2)), add(q(1, n + 1), q(1, n + 2))));
    return {
      prompt: t`Find ${math`\sum_{r = ${1}}^{${n}} \frac{${1}}{r(r + ${2})}`} exactly.`,
      answer: { kind: 'exact', expected: str(ans) },
      solution: [
        t`Partial fractions: ${math`\frac{${1}}{r(r + ${2})} = \frac{${1}}{${2}}\left(\frac{${1}}{r} - \frac{${1}}{r + ${2}}\right)`}.`,
        t`Each ${math`\frac{${1}}{r}`} cancels the ${math`-\frac{${1}}{r}`} from two terms earlier. What survives: ${math`\frac{${1}}{${1}} + \frac{${1}}{${2}}`} at the start and ${math`-\frac{${1}}{${n + 1}} - \frac{${1}}{${n + 2}}`} at the end.`,
        t`So the sum is ${math`\frac{${1}}{${2}}\left(${1} + \frac{${1}}{${2}} - \frac{${1}}{${n + 1}} - \frac{${1}}{${n + 2}}\right) = ${ans}`}.`,
      ],
    };
  },
  solve: ({ n }) => str(sumQ(1, n, (r) => q(1, r * (r + 2)))),
  misconceptions: ({ n }): Misconception[] => [
    { response: str(sub(add(q(1), q(1, 2)), add(q(1, n + 1), q(1, n + 2)))), why: t`Keep the factor ${math`\frac{${1}}{${2}}`} from the partial fractions: ${math`\frac{${1}}{r} - \frac{${1}}{r + ${2}} = \frac{${2}}{r(r + ${2})}`}.` },
    { response: str(mul(q(1, 2), sub(q(1), q(1, n + 2)))), why: t`With a gap of two, two pieces survive at each end: ${math`\frac{${1}}{${1}}`} and ${math`\frac{${1}}{${2}}`}, and ${math`\frac{${1}}{${n + 1}}`} and ${math`\frac{${1}}{${n + 2}}`}.` },
  ],
});

type ProdKind = 'frac' | 'oneMinus' | 'square';
interface ProdP { kind: ProdKind; n: number }

const prodGen = generator<ProdP>({
  id: 'product',
  skill: 'Evaluate a telescoping product such as the product of r/(r + 1) or of (1 - 1/r^2).',
  params: (rng) => ({ kind: pick(rng, ['frac', 'oneMinus', 'square'] as const), n: int(rng, 4, 40) }),
  sane: ({ n }) => (n >= 4 ? null : 'out of range'),
  problem: ({ kind, n }) => {
    const v = kind === 'frac' ? q(1, n + 1) : kind === 'oneMinus' ? q(1, n) : q(n + 1, 2 * n);
    const what = kind === 'frac' ? math`\prod_{r = ${1}}^{${n}} \frac{r}{r + ${1}}` : kind === 'oneMinus' ? math`\prod_{r = ${2}}^{${n}} \left(${1} - \frac{${1}}{r}\right)` : math`\prod_{r = ${2}}^{${n}} \left(${1} - \frac{${1}}{r^{${2}}}\right)`;
    const sol = kind === 'frac'
      ? [t`${math`\frac{${1}}{${2}} \cdot \frac{${2}}{${3}} \cdot \frac{${3}}{${4}} \cdots \frac{${n}}{${n + 1}}`}: each numerator cancels the previous denominator, leaving ${math`\frac{${1}}{${n + 1}}`}.`]
      : kind === 'oneMinus'
        ? [t`${math`${1} - \frac{${1}}{r} = \frac{r - ${1}}{r}`}, so the product is ${math`\frac{${1}}{${2}} \cdot \frac{${2}}{${3}} \cdots \frac{${n - 1}}{${n}} = \frac{${1}}{${n}}`}.`]
        : [t`${math`${1} - \frac{${1}}{r^{${2}}} = \frac{(r - ${1})(r + ${1})}{r \cdot r} = \frac{r - ${1}}{r} \cdot \frac{r + ${1}}{r}`}. Split the product in two.`, t`${math`\prod_{r = ${2}}^{${n}} \frac{r - ${1}}{r} = \frac{${1}}{${n}}`} and ${math`\prod_{r = ${2}}^{${n}} \frac{r + ${1}}{r} = \frac{${n + 1}}{${2}}`}, so the product is ${math`\frac{${n + 1}}{${2 * n}} = ${v}`}.`];
    return { prompt: t`Evaluate ${what}.`, answer: { kind: 'exact', expected: str(v) }, solution: sol };
  },
  solve: ({ kind, n }) => str(kind === 'frac' ? prodQ(1, n, (r) => q(r, r + 1)) : kind === 'oneMinus' ? prodQ(2, n, (r) => q(r - 1, r)) : prodQ(2, n, (r) => q(r * r - 1, r * r))),
  misconceptions: ({ kind, n }): Misconception[] => kind === 'square'
    ? [{ response: str(q(1, n)), why: t`That is only the ${math`\frac{r - ${1}}{r}`} half. The ${math`\frac{r + ${1}}{r}`} half contributes ${math`\frac{${n + 1}}{${2}}`}.` }, { response: str(q(n + 1, n)), why: t`The second product starts at ${math`r = ${2}`}: ${math`\frac{${3}}{${2}} \cdot \frac{${4}}{${3}} \cdots`}, so it is ${math`\frac{${n + 1}}{${2}}`}, not ${math`\frac{${n + 1}}{${1}}`}.` }]
    : [{ response: str(kind === 'frac' ? q(1, n) : q(1, n + 1)), why: t`Check the last factor: ${kind === 'frac' ? math`\frac{${n}}{${n + 1}}` : math`\frac{${n - 1}}{${n}}`}; its denominator is what survives.` }, { response: str(kind === 'frac' ? q(n, n + 1) : q(n - 1, n)), why: t`That is the last factor alone. Multiply them all: the numerators cancel the denominators before them.` }],
});

interface SqP { a: number; b: number }

const sqGen = generator<SqP>({
  id: 'roots',
  skill: 'Sum sqrt(k) - sqrt(k - 1) between two limits by cancellation.',
  params: (rng) => {
    const s = int(rng, 1, 5);
    return { a: s * s + 1, b: (s + int(rng, 2, 8)) ** 2 };
  },
  sane: ({ a, b }) => (Number.isInteger(Math.sqrt(a - 1)) && Number.isInteger(Math.sqrt(b)) && b > a ? null : 'need square ends'),
  problem: ({ a, b }) => {
    const v = Math.sqrt(b) - Math.sqrt(a - 1);
    return {
      prompt: t`Find ${math`\sum_{k = ${a}}^{${b}} \left(\sqrt{k} - \sqrt{k - ${1}}\right)`}.`,
      answer: { kind: 'exact', expected: String(v) },
      solution: [
        t`The ${math`+\sqrt{k}`} of each term cancels the ${math`-\sqrt{k}`} of the next. Only ${math`\sqrt{${b}}`} from the last term and ${math`-\sqrt{${a - 1}}`} from the first survive.`,
        t`${math`\sqrt{${b}} - \sqrt{${a - 1}} = ${Math.sqrt(b)} - ${Math.sqrt(a - 1)} = ${v}`}.`,
      ],
    };
  },
  solve: ({ a, b }) => {
    let s = 0;
    for (let k = a; k <= b; k++) s += Math.sqrt(k) - Math.sqrt(k - 1);
    return String(Math.round(s));
  },
  misconceptions: ({ a, b }): Misconception[] => [
    { response: String(Math.sqrt(b)), why: t`The first term leaves ${math`-\sqrt{${a - 1}}`} uncancelled; the sum does not start at ${math`k = ${1}`}.` },
    { response: String(Math.sqrt(b) - Math.sqrt(a - 1) - 1), why: t`Only the two end pieces survive: ${math`\sqrt{${b}}`} and ${math`-\sqrt{${a - 1}}`}. Nothing else is left over.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const F17 = 'step-f17';
const F24 = 'step-f24';
const F06 = 'step-f06';

/** The A6 Q1(i) bracket (1 + 1/d) or (1 - 1/d) as LaTeX; `d` is computed or "2n". */
const a6Bracket = (sign: '+' | '-', d: number | string): string => `\\left(${1} ${sign} \\frac{${1}}{${d}}\\right)`;
/** One row of the A6 product: four brackets, dots, then the bracket with 2n. */
const a6Row = (sign: '+' | '-'): string => [...[2, 4, 6, 8].map((d) => a6Bracket(sign, d)), '\\cdots', a6Bracket(sign, `${2}n`)].join('');
const a6Tex = computedTex(`\\frac{${a6Row('+')}}{${a6Row('-')}}`);
/** The A6 product to n brackets, multiplied out exactly. */
const a6Product = (n: number): Rational => prodQ(1, n, (r) => div(add(q(1), q(1, 2 * r)), sub(q(1), q(1, 2 * r))));

const a6General = auto({
  id: 'a6-q1-i-general',
  source: cite(F06, 'Q1(i), second part'),
  title: t`A product that cancels, to ${mn} brackets`,
  prompt: t`Find, in terms of ${mn}, the value of ${a6Tex}.`,
  nudge: t`Not quite. Write each pair of brackets as a single fraction first, then look for cancelling.`,
  hints: [
    t`What is ${math`\frac{${1} + \frac{${1}}{${2}r}}{${1} - \frac{${1}}{${2}r}}`} as a single fraction?`,
    t`Writing out the first few of those fractions, which numerator cancels which denominator?`,
    t`After the cancelling, which numerator and which denominator survive?`,
  ],
  answer: { kind: 'expression', expected: '2n + 1', variables: ['n'], domains: { n: { kind: 'integer', min: 1, max: 30 } } },
  solution: [
    t`Take the ${mr}th bracket on top with the ${mr}th underneath, and multiply top and bottom by ${math`${2}r`}: ${math`\frac{${1} + \frac{${1}}{${2}r}}{${1} - \frac{${1}}{${2}r}} = \frac{${2}r + ${1}}{${2}r - ${1}}`}.`,
    t`With ${math`g(r) = ${2}r + ${1}`}, this is ${math`\frac{g(r)}{g(r - ${1})}`}, because ${math`g(r - ${1}) = ${2}(r - ${1}) + ${1} = ${2}r - ${1}`}. So the whole product is ${math`\prod_{r = ${1}}^{n} \frac{g(r)}{g(r - ${1})}`}, a telescoping product.`,
    t`It telescopes to ${math`\frac{g(n)}{g(${0})} = \frac{${2}n + ${1}}{${1}} = ${2}n + ${1}`}. With ${math`n = ${4}`} that is ${a6Product(4)}, the first part of the question.`,
    t`Simplify each factor, then let the product telescope.`,
  ],
  reference: '2n + 1',
  verify: () => {
    for (let n = 1; n <= 20; n++) {
      const e = same(`A6 Q1(i) at n = ${n}`, str(a6Product(n)), String(2 * n + 1));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [
    { response: '2n - 1', why: t`That drops the last bracket. The last bracket on top is ${math`${1} + \frac{${1}}{${2}n} = \frac{${2}n + ${1}}{${2}n}`}, and its top survives.` },
    { response: '2n', why: t`The denominators ${math`${2}r`} all cancel, so no ${math`${2}n`} is left. What survives is the last numerator, ${math`${2}n + ${1}`}.` },
  ],
  official: { source: cite('step-f06-hints', 'Q1(i)'), answer: '2n + 1', agrees: true },
});

const a6Show = supervision({
  id: 'a6-q1-i-show',
  source: cite(F06, 'Q1(i), second part', true),
  title: t`Why the product is ${math`${2}n + ${1}`}`,
  prompt: t`Show carefully that ${a6Tex} equals ${math`${2}n + ${1}`} for every positive integer ${mn}. Generalising from a few cases is not enough: state exactly which factors cancel and why the cancelling leaves only ${math`${2}n + ${1}`}.`,
  hints: [
    t`What does the ${mr}th bracket on top over the ${mr}th underneath simplify to?`,
    t`With ${math`g(r) = ${2}r + ${1}`}, how is that fraction written using ${math`g(r)`} and ${math`g(r - ${1})`}?`,
    t`In the product of ${math`\frac{g(r)}{g(r - ${1})}`} from ${math`r = ${1}`} to ${mn}, which factors survive, and what is ${math`g(${0})`}?`,
  ],
  writeUp: 'explanation',
  official: cite('step-f06-hints', 'Q1(i)'),
});

const a17big = auto({
  id: 'a17-q2-iii-b',
  source: cite(F17, 'Assignment 17, Q2(iii)'),
  title: t`From ${100} to ${200}`,
  prompt: t`Show that ${math`\frac{${1}}{r(r + ${1})} = \frac{${1}}{r} - \frac{${1}}{r + ${1}}`}, and hence find ${math`\sum_{r = ${100}}^{${200}} \frac{${1}}{r(r + ${1})}`} as a fraction in lowest terms.`,
  answer: { kind: 'exact', expected: str(q(101, 20100)), requireLowestTerms: true },
  solution: [
    t`Combine the right side over a common denominator: ${math`\frac{(r + ${1}) - r}{r(r + ${1})} = \frac{${1}}{r(r + ${1})}`}.`,
    t`Then the sum telescopes from ${math`r = ${100}`} to ${200}: ${math`\frac{${1}}{${100}} - \frac{${1}}{${201}}`}.`,
    t`${math`\frac{${201} - ${100}}{${100} \times ${201}} = \frac{${101}}{${20100}}`}, already in lowest terms.`,
  ],
  reference: '101/20100',
  verify: () => same('sum', str(sumQ(100, 200, (r) => q(1, r * (r + 1)))), '101/20100'),
  misconceptions: [
    { response: str(sub(q(1, 100), q(1, 200))), why: t`The last term, ${math`r = ${200}`}, leaves ${math`-\frac{${1}}{${201}}`}.` },
    { response: str(q(200, 201)), why: t`That is the sum from ${math`r = ${1}`}. Starting at ${100}, the first piece left is ${math`\frac{${1}}{${100}}`}.` },
  ],
  official: { source: cite('step-f17-hints', 'Assignment 17, Q2(iii)'), answer: '101/20100', agrees: true },
});

const a17n = auto({
  id: 'a17-q2-iii-a',
  source: cite(F17, 'Assignment 17, Q2(iii)'),
  title: t`The general sum`,
  prompt: t`Find an expression for ${math`\sum_{r = ${1}}^{n} \frac{${1}}{r(r + ${1})}`} in terms of ${mn}, and check it with ${math`n = ${3}`}.`,
  nudge: t`Not quite. Write each term as a difference and let the middle cancel.`,
  hints: [
    t`How does ${math`\frac{${1}}{r(r + ${1})}`} split as a difference of two fractions?`,
    t`Writing out the first few differences, what cancels?`,
    t`What is left from the first and last terms, and does it agree with ${math`n = ${3}`}?`,
  ],
  answer: { kind: 'expression', expected: 'n/(n + 1)', variables: ['n'], domains: { n: { kind: 'integer', min: 1, max: 30 } } },
  solution: [t`It telescopes to ${math`${1} - \frac{${1}}{n + ${1}} = \frac{n}{n + ${1}}`}. Check: ${math`\frac{${1}}{${2}} + \frac{${1}}{${6}} + \frac{${1}}{${12}} = \frac{${9}}{${12}} = \frac{${3}}{${4}}`}.`, t`Split into differences, cancel the middle, then check a small case.`],
  reference: 'n/(n + 1)',
  verify: () => {
    for (let n = 1; n <= 30; n++) { const e = same(`n = ${n}`, str(sumQ(1, n, (r) => q(1, r * (r + 1)))), str(q(n, n + 1))); if (e !== null) return e; }
    return null;
  },
  misconceptions: [{ response: '1/(n + 1)', why: t`That is the piece that survives at the end, with its sign dropped. The sum is ${math`${1} - \frac{${1}}{n + ${1}}`}.` }],
  official: { source: cite('step-f17-hints', 'Assignment 17, Q2(iii)'), answer: 'n/(n + 1)', agrees: true },
});

const a15prod = auto({
  id: 'a15-q1-iii-b',
  source: cite('step-f15', 'Assignment 15, Q1(iii)(b)'),
  title: t`A product of fractions`,
  prompt: t`The notation ${math`\prod_{r = ${1}}^{n} f(r)`} means ${math`f(${1}) \times f(${2}) \times \cdots \times f(n)`}. Simplify ${math`\prod_{r = ${1}}^{n} \frac{r}{r + ${1}}`}.`,
  nudge: t`Not quite. Write out the first few factors and watch the cancelling.`,
  hints: [
    t`What are the first three factors?`,
    t`Which numerator cancels which denominator?`,
    t`Which numerator and which denominator survive?`,
  ],
  answer: { kind: 'expression', expected: '1/(n + 1)', variables: ['n'], domains: { n: { kind: 'integer', min: 1, max: 30 } } },
  solution: [t`${math`\frac{${1}}{${2}} \times \frac{${2}}{${3}} \times \cdots \times \frac{n - ${1}}{n} \times \frac{n}{n + ${1}}`}: every numerator from ${2} on cancels the denominator before it, leaving ${math`\frac{${1}}{n + ${1}}`}.`, t`In a telescoping product only the ends survive.`],
  reference: '1/(n + 1)',
  verify: () => {
    for (let n = 1; n <= 30; n++) { const e = same(`n = ${n}`, str(prodQ(1, n, (r) => q(r, r + 1))), str(q(1, n + 1))); if (e !== null) return e; }
    return null;
  },
  misconceptions: [{ response: 'n/(n + 1)', why: t`Only the first numerator, ${1}, and the last denominator, ${math`n + ${1}`}, survive.` }],
  official: { source: cite('step-f15-hints', 'Assignment 15, Q1(iii)(b)'), answer: '1/(n + 1)', agrees: true },
});

const a24sq = auto({
  id: 'a24-q2-iii',
  source: cite(F24, 'Assignment 24, Q2(iii)'),
  title: t`A sum of root differences`,
  prompt: t`Simplify ${math`\sum_{k = ${1}}^{n} \left(\sqrt{k} - \sqrt{k - ${1}}\right)`}. Type a square root as sqrt(n).`,
  nudge: t`Not quite. Write out the first few terms and see what cancels.`,
  hints: [
    t`What are the terms for ${math`k = ${1}`}, ${2}, and ${3}?`,
    t`Which parts cancel between neighbouring terms?`,
    t`What survives from the first term and the last?`,
  ],
  answer: { kind: 'expression', expected: 'sqrt(n)', variables: ['n'], domains: { n: { kind: 'integer', min: 1, max: 50 } } },
  solution: [t`The terms are ${math`(\sqrt{${1}} - \sqrt{${0}}) + (\sqrt{${2}} - \sqrt{${1}}) + \cdots + (\sqrt{n} - \sqrt{n - ${1}})`}: all cancel but ${math`\sqrt{n} - \sqrt{${0}} = \sqrt{n}`}.`, t`In a telescoping sum only the ends survive.`],
  reference: 'sqrt(n)',
  verify: () => {
    for (let n = 1; n <= 50; n++) { let s = 0; for (let k = 1; k <= n; k++) s += Math.sqrt(k) - Math.sqrt(k - 1); if (Math.abs(s - Math.sqrt(n)) > 1e-9) return `n = ${n}`; }
    return null;
  },
  misconceptions: [{ response: 'sqrt(n) - 1', why: t`The first term is ${math`\sqrt{${1}} - \sqrt{${0}}`}, so what survives at the start is ${math`-\sqrt{${0}} = ${0}`}.` }],
  official: { source: cite('step-f24-hints', 'Assignment 24, Q2(iii)'), answer: 'sqrt(n)', agrees: true },
});

// ---------------------------------------------------------------- lesson

const EXS = [1, 2, 3, 4].map((n) => sumQ(1, n, (r) => q(1, (3 * r - 2) * (3 * r + 1))));

export const telescoping: TopicContent = {
  topicId: 'alg.telescoping',
  goal: t`Sum ${math`\sum (f(r) - f(r - ${1}))`} or multiply ${math`\prod \frac{g(r)}{g(r - ${1})}`} by letting the middle terms cancel.`,
  objective: t`Sum series and multiply products whose terms are differences or ratios, by cancellation.`,
  why: t`The method of differences is on the STEP specification, and drives many STEP recurrences and integrals.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Everything cancels but the ends` },
    { kind: 'hook', text: t`${math`\frac{${1}}{${1} \times ${4}} + \frac{${1}}{${4} \times ${7}} + \frac{${1}}{${7} \times ${10}} + \frac{${1}}{${10} \times ${13}} + \cdots`}: the running totals are ${math`${EXS[0] as Rational}, ${EXS[1] as Rational}, ${EXS[2] as Rational}, ${EXS[3] as Rational}`}. A pattern this clean usually has a reason. Here the reason is that every term is secretly a difference.` },
    { kind: 'narrative', text: t`${math`\frac{${1}}{${1} \times ${4}} = \frac{${1}}{${3}}\left(${1} - \frac{${1}}{${4}}\right)`}, ${math`\frac{${1}}{${4} \times ${7}} = \frac{${1}}{${3}}\left(\frac{${1}}{${4}} - \frac{${1}}{${7}}\right)`}, ${math`\frac{${1}}{${7} \times ${10}} = \frac{${1}}{${3}}\left(\frac{${1}}{${7}} - \frac{${1}}{${10}}\right)`}. (Check the first: ${math`${1} - \frac{${1}}{${4}} = \frac{${3}}{${4}}`}, and a third of that is ${math`\frac{${1}}{${4}}`}.) Add them and each negative piece is cancelled by the positive piece of the next term, like the sections of a telescope sliding shut. Only the very first and very last pieces are left.` },
    {
      kind: 'definition',
      name: t`Method of differences`,
      formal: t`If the terms of a sum can be written ${math`u_{r} = f(r) - f(r - ${1})`} for some function ${math`f`}, then the sum is found by the [[method-of-differences|method of differences]]: ${dmath`\sum_{r = ${1}}^{n} u_{r} = \sum_{r = ${1}}^{n} \left(f(r) - f(r - ${1})\right) = f(n) - f(${0}).`}`,
      plain: t`When each term is "something minus the same something one step back", the sum is "last minus first". For the hook's terms take ${math`f(r) = -\frac{${1}}{${3}(${3}r + ${1})}`}. Then ${math`f(r - ${1}) = -\frac{${1}}{${3}(${3}r - ${2})}`}, so ${math`f(r) - f(r - ${1}) = \frac{${1}}{${3}}\left(\frac{${1}}{${3}r - ${2}} - \frac{${1}}{${3}r + ${1}}\right) = \frac{${1}}{(${3}r - ${2})(${3}r + ${1})}`}, and the sum to ${mn} is ${math`f(n) - f(${0}) = \frac{${1}}{${3}} - \frac{${1}}{${3}(${3}n + ${1})} = \frac{n}{${3}n + ${1}}`}. (At ${math`n = ${4}`}: ${math`\frac{${4}}{${13}}`}, the hook's fourth total.)`,
    },
    { kind: 'theorem', name: t`Telescoping sum`, statement: t`For any function ${math`f`} defined on ${math`\{${0}, ${1}, \ldots, n\}`}, ${math`\sum_{r = ${1}}^{n} \left(f(r) - f(r - ${1})\right) = f(n) - f(${0})`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Base case`, text: t`For ${math`n = ${1}`} both sides are ${math`f(${1}) - f(${0})`}.` },
        { label: t`Assume for k`, text: t`Suppose ${math`\sum_{r = ${1}}^{k} \left(f(r) - f(r - ${1})\right) = f(k) - f(${0})`}.` },
        { label: t`Add the next term`, text: t`Then ${math`\sum_{r = ${1}}^{k + ${1}} = f(k) - f(${0}) + f(k + ${1}) - f(k) = f(k + ${1}) - f(${0})`}: the new term's ${math`-f(k)`} cancels the old end.`, plain: t`That cancellation, repeated, is the whole method.` },
      ],
    },
    { kind: 'p', text: t`Finding ${math`f`} is the skill. For a fraction, partial fractions usually do it: ${math`\frac{${1}}{(${3}r - ${2})(${3}r + ${1})} = \frac{${1}}{${3}}\left(\frac{${1}}{${3}r - ${2}} - \frac{${1}}{${3}r + ${1}}\right)`}, checked by putting the bracket over ${math`(${3}r - ${2})(${3}r + ${1})`}: its top is ${math`(${3}r + ${1}) - (${3}r - ${2}) = ${3}`}. If the gap is two, ${math`\frac{${1}}{r(r + ${2})} = \frac{${1}}{${2}}\left(\frac{${1}}{r} - \frac{${1}}{r + ${2}}\right)`}, and two pieces survive at each end.` },
    checkFrom(pairGen, { a: 5, b: 9 }, t`The sum telescopes to ${math`\frac{${1}}{${5}} - \frac{${1}}{${10}} = \frac{${1}}{${10}}`}.`),
    { kind: 'section', title: t`Telescoping products` },
    {
      kind: 'definition',
      name: t`Product notation`,
      formal: t`In [[product-notation|product notation]], ${math`\prod_{r = ${1}}^{n} a_{r} = a_{${1}} \times a_{${2}} \times \cdots \times a_{n}`}. If ${math`g(r) \neq ${0}`} for ${math`${0} \le r \le n`}, then ${math`\prod_{r = ${1}}^{n} \frac{g(r)}{g(r - ${1})} = \frac{g(n)}{g(${0})}`}.`,
      plain: t`The multiplying version of a telescope: each numerator cancels the next denominator. ${math`\prod_{r = ${1}}^{${4}} r = ${24}`}, and ${math`\prod_{r = ${1}}^{n} \frac{r^{${2}} + r + ${1}}{r^{${2}} - r + ${1}} = n^{${2}} + n + ${1}`}, because ${math`r^{${2}} - r + ${1}`} is ${math`g(r) = r^{${2}} + r + ${1}`} one step back: ${math`(r - ${1})^{${2}} + (r - ${1}) + ${1} = r^{${2}} - r + ${1}`}, and ${math`g(${0}) = ${1}`}.`,
    },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${math`\sum_{r = ${1}}^{n} \frac{${1}}{r(r + ${2})} = \frac{${1}}{${2}}\left(${1} - \frac{${1}}{n + ${2}}\right)`}: first piece minus last.`, counterexample: t`For ${math`n = ${2}`} the sum is ${math`\frac{${1}}{${3}} + \frac{${1}}{${8}} = ${add(q(1, 3), q(1, 8))}`}, but the claim gives ${math`${q(3, 8)}`}. With a gap of two, the piece ${math`\frac{${1}}{${2}}`} has no earlier term to cancel it, and ${math`-\frac{${1}}{n + ${1}}`} no later one: two pieces survive at each end. Write out the first and last few terms.` },
    { kind: 'pitfall', claim: t`${math`\sum_{r = ${1}}^{n} \left(f(r + ${1}) - f(r)\right) = f(n) - f(${0})`}.`, counterexample: t`Here the shift goes the other way: the sum is ${math`f(n + ${1}) - f(${1})`}. With ${math`f(r) = r^{${2}}`} and ${math`n = ${1}`}: the sum is ${math`${4} - ${1} = ${3}`}, not ${math`${1} - ${0}`}.` },
    { kind: 'takeaway', text: t`Write each term as a difference of consecutive values of one function; then the sum is last minus first.` },
  ],
  examples: [
    workedCambridge(a17big),
    worked(gapGen, { n: 10 }, t`A gap of two`),
    worked(prodGen, { kind: 'square', n: 10 }, t`A product that splits in two`),
  ],
  generators: [pairGen, gapGen, prodGen, sqGen],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['method-of-differences', 'product-notation'],
  cambridge: withUses([a6Show, a6General, a17n, a15prod, a24sq], {
    'a6-q1-i-show': { sections: ['Telescoping products'], note: t`Explaining exactly which factors of a long product cancel` },
    'a6-q1-i-general': { sections: ['Telescoping products'], note: t`Cancelling across a product of any length` },
    'a15-q1-iii-b': { sections: ['Telescoping products'], note: t`A product where each numerator cancels the next denominator` },
    'a17-q2-iii-a': { sections: ['Everything cancels but the ends'], note: t`Writing each term as a difference and summing` },
    'a24-q2-iii': { sections: ['Everything cancels but the ends'], note: t`A sum of differences of square roots` },
  }),
  // Assignment 6 Q1(i), second part, from pre.fractions: the written argument first, then the general value; then
  // Assignments 15, 17, and 24. Assignment 24 Q3 integrates by parts, so it is left to calc.integration-by-parts and calc.standard-integrals.
  gate: ['a6-q1-i-show', 'a6-q1-i-general', 'a15-q1-iii-b', 'a17-q2-iii-a', 'a24-q2-iii'],
  recall: [
    { front: t`What is ${math`\sum_{r = ${1}}^{n} (f(r) - f(r - ${1}))`}?`, back: t`${math`f(n) - f(${0})`}: everything else cancels.` },
    { front: t`What is ${math`\prod_{r = ${1}}^{n} \frac{g(r)}{g(r - ${1})}`}?`, back: t`${math`\frac{g(n)}{g(${0})}`}, when no ${math`g(r)`} is ${0}: each numerator cancels the next denominator.` },
  ],
  proofOrder: [
    {
      title: t`${math`\sum_{r = ${1}}^{n} \frac{${1}}{(${3}r - ${2})(${3}r + ${1})} = \frac{n}{${3}n + ${1}}`}`,
      steps: [
        t`Partial fractions: ${math`\frac{${1}}{(${3}r - ${2})(${3}r + ${1})} = \frac{${1}}{${3}}\left(\frac{${1}}{${3}r - ${2}} - \frac{${1}}{${3}r + ${1}}\right)`}.`,
        t`Write out the sum: ${math`\frac{${1}}{${3}}\left[(${1} - \frac{${1}}{${4}}) + (\frac{${1}}{${4}} - \frac{${1}}{${7}}) + \cdots + (\frac{${1}}{${3}n - ${2}} - \frac{${1}}{${3}n + ${1}})\right]`}.`,
        t`Each negative piece cancels the next positive piece.`,
        t`Only ${math`\frac{${1}}{${3}}\left(${1} - \frac{${1}}{${3}n + ${1}}\right) = \frac{n}{${3}n + ${1}}`} is left.`,
      ],
    },
  ],
};

