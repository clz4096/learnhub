/**
 * alg.binomial-rational: the binomial series (1 + x)^n for rational n, valid for |x| < 1, and
 * its first terms as approximations such as sqrt(1 + t) ~ 1 + t/2. From the STEP
 * specification ("extend the binomial expansion of (a + bx)^n to any rational n, including
 * its use for approximation; be aware that the expansion is valid for |bx/a| < 1"); the
 * problems are the NST Mathematics Workbook, SS5 (checked against its printed answers) and
 * STEP Support Assignment 20, Q1(iii) (checked against the hints). The gate adds STEP Support
 * STEP 2 Miscellaneous Q7 (2007 STEP II Q1, roots by the series, checked against the official
 * solutions) and STEP I 2011 Q6 (STEP Questions Database, series summed through (1 - x)^-3).
 * Every coefficient is computed exactly here.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, math, t, type Span } from '../rich';
import { close } from '../prep-c';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const [mx, mn, mk] = [math`x`, math`n`, math`k`];

/** The generalised binomial coefficient n(n - 1)...(n - k + 1)/k! for rational n. */
function gbinom(n: Rational, k: number): Rational {
  let c = q(1);
  for (let i = 0; i < k; i++) c = div(mul(c, sub(n, q(i))), q(i + 1));
  return c;
}
const pow = (r: Rational, k: number): Rational => Array.from({ length: k }, () => r).reduce((x, y) => mul(x, y), q(1));
const POWERS: readonly Rational[] = [q(1, 2), q(-1, 2), q(-1), q(-2), q(1, 3), q(3, 2), q(-3), q(-1, 3), q(2, 3)];
/** A power as LaTeX: n, or \frac{p}{q}, bracketed in an exponent by the caller. */
const nTex = (n: Rational): Span => math`${n}`;

// ---------------------------------------------------------------- generators

interface CoefP { n: Rational; b: number; k: number }

const coefGen = generator<CoefP>({
  id: 'coefficient',
  skill: 'Find the coefficient of x^k in (1 + bx)^n for rational n: C(n, k) b^k, with C(n, k) = n(n - 1)...(n - k + 1)/k!.',
  params: (rng) => ({ n: pick(rng, POWERS), b: pick(rng, [2, 3, -2, -3, 4]), k: int(rng, 2, 3) }),
  sane: ({ k }) => (k >= 2 && k <= 3 ? null : 'out of range'),
  problem: ({ n, b, k }) => {
    const c = mul(gbinom(n, k), pow(q(b), k));
    const factors = Array.from({ length: k }, (_, i) => sub(n, q(i)));
    return {
      prompt: t`Find the coefficient of ${math`x^{${k}}`} in the expansion of ${math`(${1} ${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}x)^{${nTex(n)}}`} in ascending powers of ${mx}.`,
      answer: { kind: 'exact', expected: str(c) },
      solution: [
        t`The term in ${math`x^{${k}}`} is ${math`\frac{n(n - ${1})\cdots(n - ${k - 1})}{${k}!}(bx)^{${k}}`} with ${math`n = ${n}`} and ${math`b = ${b}`}.`,
        t`${math`\frac{${computedTex(factorsTex(factors))}}{${k === 2 ? 2 : 6}} = ${gbinom(n, k)}`}, and ${math`b^{${k}} = ${pow(q(b), k)}`}, so the coefficient is ${math`${c}`}.`,
      ],
    };
  },
  solve: ({ n, b, k }) => {
    // Differentiate (1 + bx)^n k times at 0 symbolically: n(n-1)...(n-k+1) b^k / k!, computed step by step.
    let c = q(1);
    let m = n;
    for (let i = 1; i <= k; i++) { c = mul(c, mul(m, q(b))); m = sub(m, q(1)); }
    return str(div(c, q(k === 2 ? 2 : 6)));
  },
  misconceptions: ({ n, b, k }): Misconception[] => [
    { response: str(gbinom(n, k)), why: t`The ${math`x`} comes with a ${b}: the term is ${math`\binom{n}{k}(${b}x)^{${k}}`}, so multiply by ${math`${b}^{${k}} = ${pow(q(b), k)}`}.` },
    { response: str(mul(mul(gbinom(n, k), q(k === 2 ? 2 : 6)), pow(q(b), k))), why: t`Divide by ${math`${k}! = ${k === 2 ? 2 : 6}`}.` },
    { response: str(mul(gbinom(n, k), q(b))), why: t`The ${b} is raised to the power ${k} along with ${mx}.` },
  ],
});

/** n(n - 1)... as a product of computed factors, each bracketed. */
function factorsTex(fs: readonly Rational[]): string {
  return fs.map((f) => (f.den === 1n ? `(${f.num})` : `\\left(${f.num < 0n ? '-' : ''}\\frac{${f.num < 0n ? -f.num : f.num}}{${f.den}}\\right)`)).join('');
}

interface ValP { a: number; b: number; n: Rational }

const valGen = generator<ValP>({
  id: 'validity',
  skill: 'Find where the expansion of (a + bx)^n is valid: |bx/a| < 1, that is |x| < |a/b|.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const a = pick(rng, [2, 3, 4, 5, 9, 1]);
      const b = pick(rng, [1, 2, 3, -1, -2, 4]);
      if (Math.abs(a) !== Math.abs(b)) return { a, b, n: pick(rng, POWERS) };
    }
  },
  sane: ({ a, b }) => (Math.abs(a) !== Math.abs(b) ? null : 'need |a| != |b|'),
  problem: ({ a, b, n }) => {
    const R = q(Math.abs(a), Math.abs(b));
    return {
      prompt: t`The expansion of ${math`(${a} ${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}x)^{${nTex(n)}}`} in powers of ${mx} is valid for ${math`|x| < R`}. Find ${math`R`}.`,
      answer: { kind: 'exact', expected: str(R) },
      solution: [
        t`Take out ${math`${a}^{${nTex(n)}}`}: ${math`(${a} ${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}x)^{${nTex(n)}} = ${a}^{${nTex(n)}}\left(${1} + \frac{${b}x}{${a}}\right)^{${nTex(n)}}`}.`,
        t`The series for ${math`(${1} + y)^{n}`} needs ${math`|y| < ${1}`}; here ${math`y = \frac{${b}x}{${a}}`}, so ${math`|x| < ${R}`}.`,
      ],
    };
  },
  solve: ({ a, b }) => str(div(q(1), q(Math.abs(b), Math.abs(a)))),
  misconceptions: ({ a, b }): Misconception[] => [
    { response: str(q(Math.abs(b), Math.abs(a))), why: t`The condition is ${math`\left|\frac{${b}x}{${a}}\right| < ${1}`}: solve for ${mx}, giving ${math`|x| < \left|\frac{${a}}{${b}}\right|`}.` },
    { response: '1', why: t`${math`|x| < ${1}`} is the condition for ${math`(${1} + x)^{n}`}. Here the bracket must first be written as ${math`${a}(${1} + \frac{${b}}{${a}}x)`}.` },
  ],
});

interface ApproxP { m: number; d: number }

const approxGen = generator<ApproxP>({
  id: 'square-root',
  skill: 'Approximate sqrt(1 + t) by 1 + t/2 - t^2/8 for small t.',
  params: (rng) => ({ m: pick(rng, [1, 2, 3, 4, 5, -1, -2, -3]), d: pick(rng, [100, 50]) }),
  sane: ({ m, d }) => (Math.abs(m / d) < 0.2 ? null : 't must be small'),
  problem: ({ m, d }) => {
    const tt = q(m, d);
    const v = sub(add(q(1), div(tt, q(2))), div(mul(tt, tt), q(8)));
    return {
      prompt: t`Use the first three terms of the binomial expansion of ${math`(${1} + t)^{\frac{${1}}{${2}}}`} to approximate ${math`\sqrt{${1} ${m < 0 ? '-' : '+'} ${q(Math.abs(m), d)}}`}. Give the exact value of your approximation as a fraction.`,
      answer: { kind: 'exact', expected: str(v) },
      solution: [
        t`${math`(${1} + t)^{\frac{${1}}{${2}}} = ${1} + \frac{${1}}{${2}}t + \frac{\frac{${1}}{${2}}\left(-\frac{${1}}{${2}}\right)}{${2}}t^{${2}} + \cdots = ${1} + \frac{t}{${2}} - \frac{t^{${2}}}{${8}} + \cdots`}, valid for ${math`|t| < ${1}`}.`,
        t`With ${math`t = ${tt}`}: ${math`${1} + ${div(tt, q(2))} - ${div(mul(tt, tt), q(8))} = ${v}`}.`,
      ],
    };
  },
  solve: ({ m, d }) => {
    // The three-term Taylor polynomial of sqrt at 1, from the derivatives 1/2 and -1/4.
    const tt = q(m, d);
    return str(add(add(q(1), mul(q(1, 2), tt)), mul(q(-1, 8), mul(tt, tt))));
  },
  misconceptions: ({ m, d }): Misconception[] => {
    const tt = q(m, d);
    return [
      { response: str(add(q(1), div(tt, q(2)))), why: t`That is two terms. The question asks for three: include ${math`-\frac{t^{${2}}}{${8}}`}.` },
      { response: str(add(add(q(1), div(tt, q(2))), div(mul(tt, tt), q(8)))), why: t`The third coefficient is ${math`\frac{\frac{${1}}{${2}} \cdot \left(-\frac{${1}}{${2}}\right)}{${2}} = -\frac{${1}}{${8}}`}: negative.` },
    ];
  },
});

interface TermsP { n: Rational; b: number }

const termsGen = generator<TermsP>({
  id: 'first-terms',
  skill: 'Write the first three terms of (1 + bx)^n for rational n.',
  params: (rng) => ({ n: pick(rng, POWERS), b: pick(rng, [2, 3, -2, -3]) }),
  sane: () => null,
  problem: ({ n, b }) => {
    const c1 = mul(n, q(b));
    const c2 = mul(gbinom(n, 2), q(b * b));
    return {
      prompt: t`Expand ${math`(${1} ${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}x)^{${nTex(n)}}`} as far as the term in ${math`x^{${2}}`}.`,
      answer: { kind: 'expression', expected: `1 + (${str(c1)})*x + (${str(c2)})*x^2`, variables: ['x'] },
      solution: [
        t`${math`(${1} + y)^{n} = ${1} + ny + \frac{n(n - ${1})}{${2}}y^{${2}} + \cdots`} with ${math`y = ${b}x`} and ${math`n = ${n}`}.`,
        t`${math`ny = ${c1}x`} and ${math`\frac{n(n - ${1})}{${2}}y^{${2}} = ${gbinom(n, 2)} \times ${b * b}x^{${2}} = ${c2}x^{${2}}`}.`,
      ],
    };
  },
  solve: ({ n, b }) => {
    const c1 = mul(n, q(b));
    const c2 = div(mul(mul(n, sub(n, q(1))), q(b * b)), q(2));
    return `1 + (${str(c1)})*x + (${str(c2)})*x^2`;
  },
  misconceptions: ({ n, b }): Misconception[] => [
    { response: `1 + (${str(mul(n, q(b)))})*x + (${str(mul(gbinom(n, 2), q(b)))})*x^2`, why: t`In the ${math`x^{${2}}`} term, ${math`(${b}x)^{${2}} = ${b * b}x^{${2}}`}: square the ${b} too.` },
    { response: `1 + (${str(mul(n, q(b)))})*x + (${str(mul(mul(n, sub(n, q(1))), q(b * b)))})*x^2`, why: t`The ${math`x^{${2}}`} coefficient has ${math`${2}!`} underneath: ${math`\frac{n(n - ${1})}{${2}}`}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const NST = 'nst-workbook';

const ss5i = auto({
  id: 'nst-ss5-i',
  source: cite(NST, 'Sequences and series, SS5(i)'),
  title: t`Four terms of a square root`,
  prompt: t`Find the first four terms in the expansion in ascending powers of ${mx} of ${math`(${1} + x)^{\frac{${1}}{${2}}}`}. (State to yourself the values of ${mx} for which it is valid.)`,
  answer: { kind: 'expression', expected: '1 + x/2 - x^2/8 + x^3/16', variables: ['x'] },
  solution: [
    t`Coefficients ${math`\binom{\frac{${1}}{${2}}}{k}`}: ${math`${1}`}, ${math`\frac{${1}}{${2}}`}, ${math`\frac{\frac{${1}}{${2}} \cdot (-\frac{${1}}{${2}})}{${2}} = -\frac{${1}}{${8}}`}, ${math`\frac{\frac{${1}}{${2}} \cdot (-\frac{${1}}{${2}}) \cdot (-\frac{${3}}{${2}})}{${6}} = \frac{${1}}{${16}}`}.`,
    t`So ${math`(${1} + x)^{\frac{${1}}{${2}}} = ${1} + \frac{x}{${2}} - \frac{x^{${2}}}{${8}} + \frac{x^{${3}}}{${16}} - \cdots`}, valid for ${math`|x| < ${1}`}.`,
  ],
  reference: '1 + x/2 - x^2/8 + x^3/16',
  verify: () => same('coefficients', [0, 1, 2, 3].map((k) => str(gbinom(q(1, 2), k))).join(','), '1,1/2,-1/8,1/16'),
  misconceptions: [{ response: '1 + x/2 + x^2/8 + x^3/16', why: t`The third coefficient contains ${math`\frac{${1}}{${2}} - ${1} = -\frac{${1}}{${2}}`}, which makes it negative.` }],
  official: { source: cite(NST, 'Answers, SS5(i)'), answer: '1 + x/2 - x^2/8 + x^3/16', agrees: true },
});

const ss5iii = auto({
  id: 'nst-ss5-iii',
  source: cite(NST, 'Sequences and series, SS5(iii)'),
  title: t`A quotient of two expansions`,
  prompt: t`Find the first four terms in the expansion in ascending powers of ${mx} of ${math`\frac{(${1} + ${2}x)^{\frac{${1}}{${2}}}}{(${2} + x)^{\frac{${1}}{${3}}}}`}, writing it as ${math`\frac{${1}}{\sqrt[${3}]{${2}}}`} times a series. Type the cube root as a power, with a caret.`,
  answer: { kind: 'expression', expected: '2^(-1/3)*(1 + 5*x/6 - 11*x^2/18 + 50*x^3/81)', variables: ['x'] },
  solution: [
    t`${math`(${2} + x)^{-\frac{${1}}{${3}}} = ${2}^{-\frac{${1}}{${3}}}\left(${1} + \frac{x}{${2}}\right)^{-\frac{${1}}{${3}}} = ${2}^{-\frac{${1}}{${3}}}\left(${1} - \frac{x}{${6}} + \frac{x^{${2}}}{${18}} - \frac{${7}x^{${3}}}{${324}} + \cdots\right)`}, valid for ${math`|x| < ${2}`}.`,
    t`${math`(${1} + ${2}x)^{\frac{${1}}{${2}}} = ${1} + x - \frac{x^{${2}}}{${2}} + \frac{x^{${3}}}{${2}} - \cdots`}, valid for ${math`|x| < \frac{${1}}{${2}}`}.`,
    t`Multiply and collect up to ${math`x^{${3}}`}: ${math`${1} + \frac{${5}}{${6}}x - \frac{${11}}{${18}}x^{${2}} + \frac{${50}}{${81}}x^{${3}}`}, times ${math`${2}^{-\frac{${1}}{${3}}}`}; valid where both are, ${math`|x| < \frac{${1}}{${2}}`}.`,
  ],
  reference: '2^(-1/3)*(1 + 5x/6 - 11x^2/18 + 50x^3/81)',
  verify: () => {
    // Multiply the two series exactly.
    const A = [0, 1, 2, 3].map((k) => mul(gbinom(q(1, 2), k), pow(q(2), k)));
    const B = [0, 1, 2, 3].map((k) => mul(gbinom(q(-1, 3), k), pow(q(1, 2), k)));
    const C = [0, 1, 2, 3].map((k) => Array.from({ length: k + 1 }, (_, i) => mul(A[i] as Rational, B[k - i] as Rational)).reduce((x, y) => add(x, y), q(0)));
    return same('coefficients', C.map(str).join(','), '1,5/6,-11/18,50/81');
  },
  misconceptions: [{ response: '2^(-1/3)*(1 + 5*x/6 + 11*x^2/18 + 50*x^3/81)', why: t`Recheck the ${math`x^{${2}}`} coefficient: ${math`-\frac{${1}}{${2}} - \frac{${1}}{${6}} + \frac{${1}}{${18}} = -\frac{${11}}{${18}}`}.` }],
  official: { source: cite(NST, 'Answers, SS5(iii)'), answer: '2^(-1/3)*(1 + 5x/6 - 11x^2/18 + 50x^3/81)', agrees: true },
});

const ss5ii = auto({
  id: 'nst-ss5-ii',
  source: cite(NST, 'Sequences and series, SS5(ii)'),
  title: t`A fractional power of ${math`${2} + x`}`,
  prompt: t`Find the first four terms in the expansion of ${math`(${2} + x)^{\frac{${2}}{${5}}}`} in ascending powers of ${mx}, as ${math`${2}^{\frac{${2}}{${5}}}`} times a series. Type the constant as a power, with a caret.`,
  answer: { kind: 'expression', expected: '2^(2/5)*(1 + x/5 - 3*x^2/100 + x^3/125)', variables: ['x'] },
  solution: [
    t`${math`(${2} + x)^{\frac{${2}}{${5}}} = ${2}^{\frac{${2}}{${5}}}\left(${1} + \frac{x}{${2}}\right)^{\frac{${2}}{${5}}}`}, valid for ${math`\left|\frac{x}{${2}}\right| < ${1}`}, that is ${math`|x| < ${2}`}.`,
    t`Coefficients of ${math`y^{k}`} with ${math`n = \frac{${2}}{${5}}`}: ${1}, ${math`\frac{${2}}{${5}}`}, ${math`-\frac{${3}}{${25}}`}, ${math`\frac{${8}}{${125}}`}. With ${math`y = \frac{x}{${2}}`}: ${math`${1} + \frac{x}{${5}} - \frac{${3}x^{${2}}}{${100}} + \frac{x^{${3}}}{${125}}`}.`,
  ],
  reference: '2^(2/5)*(1 + x/5 - 3x^2/100 + x^3/125)',
  verify: () => same('coefficients', [0, 1, 2, 3].map((k) => str(mul(gbinom(q(2, 5), k), pow(q(1, 2), k)))).join(','), '1,1/5,-3/100,1/125'),
  misconceptions: [{ response: '2^(2/5)*(1 + 2*x/5 - 3*x^2/25 + 8*x^3/125)', why: t`Those are the coefficients for ${math`(${1} + y)^{\frac{${2}}{${5}}}`}; substitute ${math`y = \frac{x}{${2}}`}, which divides the ${math`x^{k}`} coefficient by ${math`${2}^{k}`}.` }],
  official: { source: cite(NST, 'Answers, SS5(ii)'), answer: '2^(2/5)*(1 + x/5 - 3x^2/100 + x^3/125)', agrees: true },
});

const a20k = auto({
  id: 'a20-q1-iii',
  source: cite('step-f20', 'Assignment 20, Q1(iii)'),
  title: t`Differentiating ${math`x^{-\frac{${1}}{${2}}}`} from first principles`,
  prompt: t`Find a number ${mk} such that, when ${math`t`} is small, ${math`\sqrt{${1} + t} \approx ${1} + kt`} (ignoring ${math`t^{${2}}`} and smaller terms). Then, using ${math`(${1} + t)^{-\frac{${1}}{${2}}} \approx ${1} - \frac{t}{${2}}`}, find the derivative of ${math`x^{-\frac{${1}}{${2}}}`} from ${math`f'(x) = \lim_{h \to ${0}} \frac{f(x + h) - f(x)}{h}`}. Give the derivative.`,
  answer: { kind: 'expression', expected: '-(1/2)*x^(-3/2)', variables: ['x'], domains: { x: { kind: 'real', min: 0.5, max: 5 } } },
  solution: [
    t`Square ${math`${1} + kt`}: ${math`${1} + ${2}kt + k^{${2}}t^{${2}} \approx ${1} + t`}; ignoring ${math`t^{${2}}`}, ${math`k = \frac{${1}}{${2}}`}.`,
    t`${math`(x + h)^{-\frac{${1}}{${2}}} = x^{-\frac{${1}}{${2}}}\left(${1} + \frac{h}{x}\right)^{-\frac{${1}}{${2}}} \approx x^{-\frac{${1}}{${2}}}\left(${1} - \frac{h}{${2}x}\right)`}, for ${math`\left|\frac{h}{x}\right|`} small.`,
    t`So ${math`\frac{f(x + h) - f(x)}{h} \approx -\frac{x^{-\frac{${1}}{${2}}}}{${2}x} = -\frac{${1}}{${2}}x^{-\frac{${3}}{${2}}}`}, and the neglected terms carry a factor ${math`h`}, which tends to ${0}. The derivative is ${math`-\frac{${1}}{${2}}x^{-\frac{${3}}{${2}}}`}.`,
  ],
  reference: '-(1/2) x^(-3/2)',
  verify: () => {
    for (const x of [0.5, 1, 2, 3.7]) {
      const h = 1e-6;
      const num = ((x + h) ** -0.5 - x ** -0.5) / h;
      if (Math.abs(num - -0.5 * x ** -1.5) > 1e-5) return `x = ${x}: ${num}`;
    }
    return null;
  },
  misconceptions: [
    { response: '-(1/2)*x^(-1/2)', why: t`Dividing by ${math`h`} leaves ${math`\frac{${1}}{x}`} from ${math`\frac{h}{x}`}: the power drops by one, to ${math`-\frac{${3}}{${2}}`}.` },
    { response: '(1/2)*x^(-3/2)', why: t`${math`(${1} + t)^{-\frac{${1}}{${2}}} \approx ${1} - \frac{t}{${2}}`}: the function decreases, so the derivative is negative.` },
  ],
  official: { source: cite('step-f20-hints', 'Assignment 20, Q1(iii)'), answer: '-(1/2) x^(-3/2)', agrees: true },
});

const ss5sup = supervision({
  id: 'nst-ss5-validity',
  source: cite(NST, 'Sequences and series, SS5'),
  title: t`Where each expansion is valid`,
  prompt: t`For each of ${math`(${1} + x)^{\frac{${1}}{${2}}}`}, ${math`(${2} + x)^{\frac{${2}}{${5}}}`} and ${math`\frac{(${1} + ${2}x)^{\frac{${1}}{${2}}}}{(${2} + x)^{\frac{${1}}{${3}}}}`}, state for which values of ${mx} the binomial expansion is valid, and explain why, for the quotient, the range is that of the more restrictive factor.`,
  writeUp: 'explanation',
});

// STEP 2 Miscellaneous Q7 (2007 S2 Q1) and STEP I 2011 Q6 (STEP Questions Database).
const MISC = 'step-s2-misc' as const;
const MISCS = 'step-s2-misc-solutions' as const;
const DB11 = 'stepdb-11-s1' as const;

/** The binomial series of (1 + k/100)^(1/2) to the k^3 term, at k, exactly. */
const root4 = (k: number): Rational => {
  let s = q(0);
  for (let j = 0; j <= 3; j++) s = add(s, mul(gbinom(q(1, 2), j), q(k ** j, 100 ** j)));
  return s;
};
const SQRT3_APPROX = mul(q(10, 6), root4(8));
const SQRT6_APPROX = mul(q(10, 4), root4(-4));
/** To five decimal places, as a string. */
const dp5 = (r: Rational): string => (Number(r.num) / Number(r.den)).toFixed(5);

const misc7 = supervision({
  id: 's2misc-q7',
  source: cite(MISC, 'Q7 (2007 STEP II Q1)'),
  title: t`Square and cube roots by the binomial series`,
  prompt: t`In this question, you are not required to justify the accuracy of the approximations. (i) Write down the binomial expansion of ${math`\left(${1} + \frac{k}{${100}}\right)^{\frac{${1}}{${2}}}`} in ascending powers of ${mk}, up to and including the ${math`k^{${3}}`} term. (a) Use the value ${math`k = ${8}`} to find an approximation to five decimal places for ${math`\sqrt{${3}}`}. (b) By choosing a suitable integer value of ${mk}, find an approximation to five decimal places for ${math`\sqrt{${6}}`}. (ii) By considering the first two terms of the binomial expansion of ${math`\left(${1} + \frac{k}{${1000}}\right)^{\frac{${1}}{${3}}}`}, show that ${math`\frac{${3029}}{${2100}}`} is an approximation to ${math`\sqrt[${3}]{${3}}`}.`,
  writeUp: 'explanation',
  official: cite(MISCS, 'Q7'),
});

const misc7a = auto({
  id: 's2misc-q7-i-a',
  source: cite(MISC, 'Q7(i)(a) (2007 STEP II Q1)'),
  title: t`Root three from the root of ${1.08}`,
  prompt: t`Using the binomial expansion of ${math`\left(${1} + \frac{k}{${100}}\right)^{\frac{${1}}{${2}}}`} up to and including the ${math`k^{${3}}`} term, with ${math`k = ${8}`}, find an approximation to five decimal places for ${math`\sqrt{${3}}`}.`,
  answer: { kind: 'numeric', expected: Number(dp5(SQRT3_APPROX)), absTol: 0.000005 },
  solution: [
    t`${math`\left(${1} + \frac{k}{${100}}\right)^{\frac{${1}}{${2}}} = ${1} + \frac{k}{${200}} - \frac{k^{${2}}}{${80000}} + \frac{k^{${3}}}{${16000000}} + \cdots`}, from the coefficients ${math`\binom{\frac{${1}}{${2}}}{${1}} = \frac{${1}}{${2}}`}, ${math`\binom{\frac{${1}}{${2}}}{${2}} = -\frac{${1}}{${8}}`}, ${math`\binom{\frac{${1}}{${2}}}{${3}} = \frac{${1}}{${16}}`}.`,
    t`With ${math`k = ${8}`}: ${math`\sqrt{${1.08}} = \sqrt{\frac{${36} \times ${3}}{${100}}} = \frac{${6}\sqrt{${3}}}{${10}}`}, and the series gives ${math`${1} + ${0.04} - ${0.0008} + ${0.000032} = ${1.039232}`}.`,
    t`So ${math`\sqrt{${3}} \approx \frac{${10}}{${6}} \times ${1.039232} = ${1.732053}`}, which is ${Number(dp5(SQRT3_APPROX))} to five decimal places.`,
  ],
  reference: dp5(SQRT3_APPROX),
  verify: () => {
    // The series value, exactly, then the rounding; and the expansion's coefficients 1/200, -1/80000, 1/16000000.
    const coeffs = [1, 2, 3].map((j) => str(mul(gbinom(q(1, 2), j), q(1, 100 ** j))));
    const e = same('coefficients', coeffs.join(' '), '1/200 -1/80000 1/16000000');
    if (e !== null) return e;
    return same('sqrt 3', dp5(SQRT3_APPROX), Math.sqrt(3).toFixed(5));
  },
  misconceptions: [
    { response: '1.03923', why: t`That is the series value, which approximates ${math`\sqrt{${1.08}} = \frac{${6}\sqrt{${3}}}{${10}}`}. Multiply by ${math`\frac{${10}}{${6}}`} to get ${math`\sqrt{${3}}`}.` },
  ],
  official: { source: cite(MISCS, 'Q7(i)(a)'), answer: '1.73205', agrees: true },
});

const misc7b = auto({
  id: 's2misc-q7-i-b',
  source: cite(MISC, 'Q7(i)(b) (2007 STEP II Q1)'),
  title: t`Root six, choosing ${mk}`,
  prompt: t`By choosing a suitable integer value of ${mk} in the binomial expansion of ${math`\left(${1} + \frac{k}{${100}}\right)^{\frac{${1}}{${2}}}`} up to and including the ${math`k^{${3}}`} term, find an approximation to five decimal places for ${math`\sqrt{${6}}`}.`,
  answer: { kind: 'numeric', expected: Number(dp5(SQRT6_APPROX)), absTol: 0.000005 },
  solution: [
    t`Look for ${math`${100} + k = ${6}a^{${2}}`} with ${mk} small: ${math`a = ${4}`} gives ${math`${96}`}, so ${math`k = -${4}`} (${math`a = ${3}`} gives ${math`k = -${46}`} and ${math`a = ${5}`} gives ${math`k = ${50}`}, both too large).`,
    t`Then ${math`\sqrt{${0.96}} = \frac{${4}\sqrt{${6}}}{${10}}`}, and the series gives ${math`${1} - ${0.02} - ${0.0002} - ${0.000004} = ${0.979796}`}.`,
    t`So ${math`\sqrt{${6}} \approx \frac{${10}}{${4}} \times ${0.979796} = ${2.44949}`}.`,
  ],
  reference: dp5(SQRT6_APPROX),
  verify: () => same('sqrt 6', dp5(SQRT6_APPROX), Math.sqrt(6).toFixed(5)),
  misconceptions: [
    { response: '0.97980', why: t`That is the series value, which approximates ${math`\sqrt{${0.96}} = \frac{${4}\sqrt{${6}}}{${10}}`}. Multiply by ${math`\frac{${10}}{${4}}`}.` },
  ],
  official: { source: cite(MISCS, 'Q7(i)(b)'), answer: '2.44949', agrees: true },
});

const db11q6 = supervision({
  id: 'step11-q6',
  source: cite(DB11, 'Q6'),
  title: t`Series summed by the binomial expansion`,
  prompt: t`Use the binomial expansion to show that the coefficient of ${math`x^{r}`} in the expansion of ${math`(${1} - x)^{-${3}}`} is ${math`\frac{${1}}{${2}}(r + ${1})(r + ${2})`}. (i) Show that the coefficient of ${math`x^{r}`} in the expansion of ${dmath`\frac{${1} - x + ${2}x^{${2}}}{(${1} - x)^{${3}}}`} is ${math`r^{${2}} + ${1}`} and hence find the sum of the series ${dmath`${1} + \frac{${2}}{${2}} + \frac{${5}}{${4}} + \frac{${10}}{${8}} + \frac{${17}}{${16}} + \frac{${26}}{${32}} + \frac{${37}}{${64}} + \frac{${50}}{${128}} + \cdots.`} (ii) Find the sum of the series ${dmath`${1} + ${2} + \frac{${9}}{${4}} + ${2} + \frac{${25}}{${16}} + \frac{${9}}{${8}} + \frac{${49}}{${64}} + \cdots.`}`,
  writeUp: 'proof',
});

/** Partial sums of sum_r f(r)/2^r, to 200 terms, as a float: the series converge fast. */
const halfSum = (f: (r: number) => number): number => {
  let s = 0;
  for (let r = 0; r < 200; r++) s += f(r) / 2 ** r;
  return s;
};

const db11q6i = auto({
  id: 'step11-q6-i',
  source: cite(DB11, 'Q6(i)'),
  title: t`The sum of ${math`\frac{r^{${2}} + ${1}}{${2}^{r}}`}`,
  prompt: t`Given that the coefficient of ${math`x^{r}`} in the expansion of ${math`\frac{${1} - x + ${2}x^{${2}}}{(${1} - x)^{${3}}}`} is ${math`r^{${2}} + ${1}`}, find the sum of the series ${dmath`${1} + \frac{${2}}{${2}} + \frac{${5}}{${4}} + \frac{${10}}{${8}} + \frac{${17}}{${16}} + \frac{${26}}{${32}} + \frac{${37}}{${64}} + \frac{${50}}{${128}} + \cdots.`}`,
  answer: { kind: 'exact', expected: '8' },
  solution: [
    t`The ${math`r`}th term (from ${math`r = ${0}`}) is ${math`\frac{r^{${2}} + ${1}}{${2}^{r}} = (r^{${2}} + ${1})x^{r}`} at ${math`x = \frac{${1}}{${2}}`}.`,
    t`The expansion of ${math`(${1} - x)^{-${3}}`} is valid for ${math`|x| < ${1}`}, so at ${math`x = \frac{${1}}{${2}}`} the series sums to ${math`\frac{${1} - \frac{${1}}{${2}} + \frac{${2}}{${4}}}{\left(\frac{${1}}{${2}}\right)^{${3}}} = \frac{${1}}{\frac{${1}}{${8}}} = ${8}`}.`,
  ],
  reference: '8',
  verify: () => {
    // The coefficients of (1 - x + 2x^2)(1 - x)^-3 are r^2 + 1, from (r + 1)(r + 2)/2 - r(r + 1)/2 + (r - 1)r.
    for (let r = 0; r <= 30; r++) {
      const c = ((r + 1) * (r + 2)) / 2 - (r * (r + 1)) / 2 + 2 * ((r - 1) * r) / 2;
      if (c !== r * r + 1) return `coefficient of x^${r}: ${c}`;
    }
    return close('sum', halfSum((r) => r * r + 1), 8, 1e-12);
  },
  misconceptions: [
    { response: '4', why: t`Evaluate the whole function at ${math`x = \frac{${1}}{${2}}`}: the numerator is ${math`${1} - \frac{${1}}{${2}} + ${2} \cdot \frac{${1}}{${4}} = ${1}`}, and ${math`(${1} - x)^{${3}} = \frac{${1}}{${8}}`}.` },
  ],
});

const db11q6ii = auto({
  id: 'step11-q6-ii',
  source: cite(DB11, 'Q6(ii)'),
  title: t`The sum of ${math`\frac{(r + ${1})^{${2}}}{${2}^{r}}`}`,
  prompt: t`Find the sum of the series ${dmath`${1} + ${2} + \frac{${9}}{${4}} + ${2} + \frac{${25}}{${16}} + \frac{${9}}{${8}} + \frac{${49}}{${64}} + \cdots.`}`,
  answer: { kind: 'exact', expected: '12' },
  solution: [
    t`The terms are ${math`\frac{${1}}{${1}}, \frac{${4}}{${2}}, \frac{${9}}{${4}}, \frac{${16}}{${8}}, \frac{${25}}{${16}}, \frac{${36}}{${32}}, \frac{${49}}{${64}}`}: the ${math`r`}th (from ${math`r = ${0}`}) is ${math`\frac{(r + ${1})^{${2}}}{${2}^{r}}`}, the coefficient of ${math`x^{r}`} in some function, at ${math`x = \frac{${1}}{${2}}`}.`,
    t`${math`(r + ${1})^{${2}} = ${2} \cdot \frac{(r + ${1})(r + ${2})}{${2}} - (r + ${1})`}. The coefficient of ${math`x^{r}`} in ${math`(${1} - x)^{-${3}}`} is ${math`\frac{(r + ${1})(r + ${2})}{${2}}`} and in ${math`(${1} - x)^{-${2}}`} it is ${math`r + ${1}`}, so the function is ${math`\frac{${2}}{(${1} - x)^{${3}}} - \frac{${1}}{(${1} - x)^{${2}}} = \frac{${1} + x}{(${1} - x)^{${3}}}`}.`,
    t`At ${math`x = \frac{${1}}{${2}}`}: ${math`\frac{${q(3, 2)}}{${q(1, 8)}} = ${12}`}.`,
  ],
  reference: '12',
  verify: () => {
    // The printed terms are (r + 1)^2 / 2^r for r = 0 to 6.
    const printed = ['1', '2', '9/4', '2', '25/16', '9/8', '49/64'];
    for (let r = 0; r < printed.length; r++) if (str(q((r + 1) ** 2, 2 ** r)) !== printed[r]) return `term ${r}`;
    return close('sum', halfSum((r) => (r + 1) ** 2), 12, 1e-12);
  },
  misconceptions: [
    { response: '8', why: t`That is part (i)'s series, with ${math`r^{${2}} + ${1}`} on top. Here the tops are the squares ${math`(r + ${1})^{${2}}`}: ${1}, ${4}, ${9}, ${16}, and so on.` },
  ],
});

// ---------------------------------------------------------------- lesson

export const binomialRational: TopicContent = {
  topicId: 'alg.binomial-rational',
  goal: t`Expand ${math`(${1} + x)^{n}`} for rational ${mn} when ${math`|x| < ${1}`}, and use the first terms as approximations such as ${math`\sqrt{${1} + t} \approx ${1} + \frac{t}{${2}}`}.`,
  objective: t`Expand a binomial to any rational power, know where the series is valid, and approximate with it.`,
  why: t`Its first terms give the approximations behind STEP calculus, small angles, and much of physics.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Beyond whole-number powers` },
    { kind: 'hook', text: t`${math`\frac{${1}}{${1} - x} = ${1} + x + x^{${2}} + x^{${3}} + \cdots`}, the geometric series. That is ${math`(${1} - x)^{-${1}}`} written as an infinite polynomial. Could ${math`\sqrt{${1} + x}`} be written the same way? It can, and its coefficients come from the binomial theorem, with ${mn} no longer a whole number.` },
    { kind: 'narrative', text: t`For whole ${mn}, ${math`(${1} + x)^{n} = \sum_{k} \binom{n}{k}x^{k}`}, and ${math`\binom{n}{k} = \frac{n(n - ${1})\cdots(n - k + ${1})}{k!}`}. That last fraction makes sense for any number ${mn}. For whole ${mn} it becomes ${0} once ${math`k > n`}, so the sum stops; for other ${mn} no factor is ever ${0}, and the sum goes on forever.` },
    {
      kind: 'definition',
      name: t`Binomial series`,
      formal: t`For a rational number ${mn} and an integer ${math`k \ge ${0}`}, let ${math`\binom{n}{k} = \frac{n(n - ${1})\cdots(n - k + ${1})}{k!}`} (and ${math`\binom{n}{${0}} = ${1}`}). The [[binomial-series|binomial series]] is ${dmath`(${1} + x)^{n} = ${1} + nx + \frac{n(n - ${1})}{${2}!}x^{${2}} + \frac{n(n - ${1})(n - ${2})}{${3}!}x^{${3}} + \cdots,`} which is valid (converges to ${math`(${1} + x)^{n}`}) for ${math`|x| < ${1}`}.`,
      plain: t`Same pattern as the binomial theorem, using ${mn}, ${math`n - ${1}`}, ${math`n - ${2}`}, ... on top and ${math`k!`} underneath. With ${math`n = -${1}`} the coefficients are ${math`${1}, -${1}, ${1}, -${1}, \ldots`}: ${math`(${1} + x)^{-${1}} = ${1} - x + x^{${2}} - \cdots`}, the geometric series.`,
    },
    { kind: 'p', text: t`The convergence for ${math`|x| < ${1}`} is proved in analysis; at STEP you may use it, but you must state the range. Check the geometric case: ${math`${1} - x + x^{${2}} - \cdots`} has ratio ${math`-x`}, and the sum to infinity needs ${math`|x| < ${1}`}, exactly the stated range.` },
    { kind: 'theorem', name: t`Expanding ${math`(a + bx)^{n}`}`, statement: t`For ${math`a > ${0}`} and rational ${mn}, ${math`(a + bx)^{n} = a^{n}\left(${1} + \frac{b}{a}x\right)^{n}`}, and the series in brackets is valid for ${math`\left|\frac{bx}{a}\right| < ${1}`}.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Take out the constant`, text: t`${math`a + bx = a\left(${1} + \frac{b}{a}x\right)`}, and ${math`(uv)^{n} = u^{n}v^{n}`} for positive ${math`u`}.` },
        { label: t`Expand the bracket`, text: t`Use the series with ${math`\frac{b}{a}x`} in place of ${mx}. Every power of ${mx} carries the same power of ${math`\frac{b}{a}`}.`, plain: t`For ${math`(${4} + x)^{\frac{${1}}{${2}}} = ${2}\left(${1} + \frac{x}{${4}}\right)^{\frac{${1}}{${2}}} = ${2} + \frac{x}{${4}} - \frac{x^{${2}}}{${64}} + \cdots`}, valid for ${math`|x| < ${4}`}.` },
        { label: t`State the range`, text: t`The series needs ${math`\left|\frac{b}{a}x\right| < ${1}`}, that is ${math`|x| < \frac{a}{|b|}`}.` },
      ],
    },
    { kind: 'section', title: t`Approximations` },
    { kind: 'narrative', text: t`For small ${math`t`} the terms shrink fast, so the first few give a good approximation. ${math`\sqrt{${1} + t} \approx ${1} + \frac{t}{${2}}`}, with an error of about ${math`\frac{t^{${2}}}{${8}}`}: ${math`\sqrt{${1.02}} \approx ${1.01}`}, out by about ${math`${0.00005}`}. STEP uses this to differentiate ${math`\sqrt{x}`} from first principles and to get ${math`\cos\theta \approx ${1} - \frac{\theta^{${2}}}{${2}}`} from ${math`\cos\theta = \sqrt{${1} - \sin^{${2}}\theta}`} with ${math`\sin\theta \approx \theta`}.` },
    checkFrom(valGen, { a: 3, b: 2, n: q(-1, 2) }, t`${math`(${3} + ${2}x)^{-\frac{${1}}{${2}}} = ${3}^{-\frac{${1}}{${2}}}(${1} + \frac{${2}}{${3}}x)^{-\frac{${1}}{${2}}}`}, valid for ${math`\left|\frac{${2}x}{${3}}\right| < ${1}`}, so ${math`R = ${q(3, 2)}`}.`),
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${math`(${1} + x)^{-${1}} = ${1} - x + x^{${2}} - \cdots`} at ${math`x = ${2}`}, so ${math`\frac{${1}}{${3}} = ${1} - ${2} + ${4} - \cdots`}.`, counterexample: t`At ${math`x = ${2}`} the series diverges: its partial sums ${math`${1}, -${1}, ${3}, -${5}, \ldots`} never settle. The expansion is only valid for ${math`|x| < ${1}`}.` },
    { kind: 'pitfall', claim: t`${math`(${2} + x)^{\frac{${1}}{${2}}} = ${1} + \frac{${1}}{${2}}(${1} + x) + \cdots`}, using the series with ${math`${1} + x`} for ${mx}.`, counterexample: t`The series is for ${math`(${1} + y)^{n}`} with ${math`y`} small. Write ${math`${2} + x = ${2}(${1} + \frac{x}{${2}})`}: ${math`(${2} + x)^{\frac{${1}}{${2}}} = \sqrt{${2}}\left(${1} + \frac{x}{${4}} - \cdots\right)`}. At ${math`x = ${0}`} the claim gives ${math`${1.5}`}, not ${math`\sqrt{${2}}`}.` },
    { kind: 'takeaway', text: t`${math`(${1} + x)^{n} = \sum_{k} \binom{n}{k}x^{k}`} for any rational ${mn}, valid for ${math`|x| < ${1}`}; for ${math`(a + bx)^{n}`}, take out ${math`a^{n}`} first.` },
  ],
  examples: [
    workedCambridge(ss5i),
    worked(coefGen, { n: q(-1, 2), b: 2, k: 3 }, t`A coefficient in ${math`(${1} + ${2}x)^{-\frac{${1}}{${2}}}`}`),
    worked(approxGen, { m: 1, d: 50 }, t`Estimating ${math`\sqrt{${1.02}}`}`),
  ],
  generators: [coefGen, valGen, approxGen, termsGen],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['binomial-series'],
  cambridge: [misc7, db11q6, misc7a, misc7b, db11q6i, db11q6ii, a20k, ss5iii, ss5ii, ss5sup],
  // Best first: two STEP questions (2007 II Q1, with official solutions; 2011 I Q6), then their
  // auto-checked parts, then the NST Workbook's SS5(iii).
  gate: ['s2misc-q7', 'step11-q6', 's2misc-q7-i-b', 'step11-q6-ii', 'nst-ss5-iii'],
  recall: [
    { front: t`State the binomial series for rational ${mn}, with its range.`, back: t`${math`(${1} + x)^{n} = ${1} + nx + \frac{n(n - ${1})}{${2}!}x^{${2}} + \cdots`}, valid for ${math`|x| < ${1}`}.` },
    { front: t`Where is the expansion of ${math`(a + bx)^{n}`} valid?`, back: t`For ${math`\left|\frac{bx}{a}\right| < ${1}`}, after writing it as ${math`a^{n}(${1} + \frac{b}{a}x)^{n}`}.` },
  ],
  proofOrder: [
    {
      title: t`Expanding ${math`(${4} + x)^{\frac{${1}}{${2}}}`}`,
      steps: [
        t`Take out ${4}: ${math`(${4} + x)^{\frac{${1}}{${2}}} = ${2}\left(${1} + \frac{x}{${4}}\right)^{\frac{${1}}{${2}}}`}.`,
        t`Expand with ${math`y = \frac{x}{${4}}`}: ${math`${1} + \frac{y}{${2}} - \frac{y^{${2}}}{${8}} + \cdots`}.`,
        t`Substitute back and multiply by ${2}: ${math`${2} + \frac{x}{${4}} - \frac{x^{${2}}}{${64}} + \cdots`}.`,
        t`State the range: ${math`|y| < ${1}`}, so ${math`|x| < ${4}`}.`,
      ],
    },
  ],
};
