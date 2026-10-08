/**
 * an.exp-series: e^x defined as the series sum x^k/k!; why it converges for every x (a
 * geometric comparison); why it is its own derivative (termwise differentiation, assumed as
 * STEP Support does); and its uses: e^(kx), e^x e^(-x) = 1, and sums such as the Poisson
 * probabilities. The Cambridge problems are STEP Support Foundation Assignment 22, Q2, with
 * the Assignment 22 hints. The STEP 2 specification: "Recognise and use the series expansion
 * of e^x."
 */
import { auto, cite, supervision, withUses } from '../cambridge';
import { add, div, factorial, int, mul, pick, q, str, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { agreesAt, close, numDeriv } from '../prep-c';
import { math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const F22 = 'step-f22' as const;
const F22H = 'step-f22-hints' as const;
const rpow = (r: Rational, k: number): Rational => Array.from({ length: k }).reduce<Rational>((acc) => mul(acc, r), q(1));
const partial = (x: Rational, n: number, fact = true): Rational => {
  let s = q(0);
  for (let k = 0; k <= n; k++) s = add(s, div(rpow(x, k), q(fact ? factorial(k) : 1)));
  return s;
};

// ---------------------------------------------------------------- partial sums

interface PsP { x: Rational; n: number }
const partialSum = generator<PsP>({
  id: 'partial-sum',
  skill: 'Add the first terms of the exponential series exactly, remembering 0! = 1 and the factorials.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const p: PsP = { x: pick(rng, [q(1, 2), q(1), q(2), q(-1), q(3), q(-2), q(1, 3)]), n: int(rng, 2, 4) };
      const right = str(partial(p.x, p.n));
      if (new Set([right, str(add(partial(p.x, p.n), q(-1))), str(partial(p.x, p.n, false))]).size === 3) return p;
    }
  },
  sane: ({ n }) => (n >= 2 ? null : 'too few terms'),
  problem: ({ x, n }) => ({
    prompt: t`Find ${math`\sum_{k = ${0}}^{${n}} \frac{x^{k}}{k!}`} exactly when ${math`x = ${x}`}: the first ${n + 1} terms of the series for ${math`e^{x}`}.`,
    answer: { kind: 'exact', expected: str(partial(x, n)) },
    solution: [
      t`The terms are ${math`\frac{x^{${0}}}{${0}!} = ${1}`}, then ${math`x = ${x}`}, then ${math`\frac{x^{${2}}}{${2}!} = ${div(rpow(x, 2), q(2))}`}${n >= 3 ? t`, ${math`\frac{x^{${3}}}{${3}!} = ${div(rpow(x, 3), q(6))}`}` : t``}${n >= 4 ? t`, ${math`\frac{x^{${4}}}{${4}!} = ${div(rpow(x, 4), q(24))}`}` : t``}.`,
      t`Their sum is ${partial(x, n)}, close to ${math`e^{${x}} \approx ${Number(Math.exp(Number(x.num) / Number(x.den)).toPrecision(5))}`}${n < 4 ? t`, and closer with more terms` : t``}.`,
    ],
  }),
  // Floating sum of the terms, matched to the nearest fraction with denominator 24 x^n's denominator.
  solve: ({ x, n }) => {
    const xf = Number(x.num) / Number(x.den);
    let s = 0;
    for (let k = 0; k <= n; k++) s += xf ** k / factorial(k);
    const den = 24 * Number(x.den) ** n;
    return str(q(Math.round(s * den), den));
  },
  misconceptions: ({ x, n }): Misconception[] => [
    { response: str(add(partial(x, n), q(-1))), why: t`The first term is ${math`\frac{x^{${0}}}{${0}!} = \frac{${1}}{${1}} = ${1}`}, not ${0}: ${math`${0}! = ${1}`}.` },
    { response: str(partial(x, n, false)), why: t`Each term is divided by ${math`k!`}: ${math`\frac{x^{${2}}}{${2}}`}, ${math`\frac{x^{${3}}}{${6}}`}, and so on.` },
  ],
});

// ---------------------------------------------------------------- a coefficient

interface CoP { a: Rational; n: number }
const coefficient = generator<CoP>({
  id: 'coefficient',
  skill: 'Read off the coefficient of x^n in e^(ax) = sum (ax)^k/k!: it is a^n/n!.',
  quick: true,
  params: (rng) => ({ a: pick(rng, [q(2), q(3), q(-2), q(1, 2), q(-3), q(4)]), n: int(rng, 3, 5) }),
  sane: ({ n }) => (n >= 2 ? null : 'n too small'),
  problem: ({ a, n }) => ({
    prompt: t`Find the coefficient of ${math`x^{${n}}`} in the series for ${math`e^{${a}x}`}.`,
    answer: { kind: 'exact', expected: str(div(rpow(a, n), q(factorial(n)))) },
    solution: [
      t`Put ${math`${a}x`} in place of ${math`x`}: ${math`e^{${a}x} = \sum_{k \ge ${0}} \frac{(${a}x)^{k}}{k!}`}.`,
      t`The ${math`x^{${n}}`} term is ${math`\frac{(${a})^{${n}}x^{${n}}}{${n}!}`}, so the coefficient is ${math`\frac{${rpow(a, n)}}{${factorial(n)}} = ${div(rpow(a, n), q(factorial(n)))}`}.`,
    ],
  }),
  // The n-th derivative at 0 divided by n!, with the derivative a^n e^(ax) found by repeated numerical differencing is too noisy; use the product of n factors a/k instead.
  solve: ({ a, n }) => {
    let c = q(1);
    for (let k = 1; k <= n; k++) c = mul(c, div(a, q(k)));
    return str(c);
  },
  misconceptions: ({ a, n }): Misconception[] => [
    { response: str(div(a, q(factorial(n)))), why: t`The whole of ${math`${a}x`} is raised to the power: ${math`(${a}x)^{${n}} = (${a})^{${n}}x^{${n}}`}.` },
    { response: str(div(rpow(a, n), q(n))), why: t`The denominator is ${math`${n}!`}, not ${n}.` },
  ],
});

// ---------------------------------------------------------------- recognising a sum

type Form = 'all' | 'from-one' | 'times-k' | 'alternating';
interface SumP { form: Form; a: number }
const sumAnswer = ({ form, a }: SumP): string => {
  switch (form) {
    case 'all': return `e^${a}`;
    case 'from-one': return `e^${a} - 1`;
    case 'times-k': return `${a}*e^${a}`;
    case 'alternating': return `e^(-${a})`;
  }
};
const recognise = generator<SumP>({
  id: 'recognise-sum',
  skill: 'Recognise an infinite sum as the exponential series, adjusting for a missing first term, a factor k, or alternating signs.',
  params: (rng) => ({ form: pick(rng, ['all', 'from-one', 'times-k', 'alternating'] as const), a: int(rng, 2, 5) }),
  sane: ({ a }) => (a >= 2 ? null : 'a too small'),
  problem: (p) => {
    const sum = p.form === 'all' ? math`\sum_{k = ${0}}^{\infty} \frac{${p.a}^{k}}{k!}`
      : p.form === 'from-one' ? math`\sum_{k = ${1}}^{\infty} \frac{${p.a}^{k}}{k!}`
        : p.form === 'times-k' ? math`\sum_{k = ${1}}^{\infty} \frac{k \cdot ${p.a}^{k}}{k!}`
          : math`\sum_{k = ${0}}^{\infty} \frac{(-${p.a})^{k}}{k!}`;
    const steps = {
      all: t`This is the series for ${math`e^{x}`} at ${math`x = ${p.a}`}: ${math`e^{${p.a}}`}.`,
      'from-one': t`The full series from ${math`k = ${0}`} is ${math`e^{${p.a}}`}; this one leaves out the ${math`k = ${0}`} term, which is ${1}. So it is ${math`e^{${p.a}} - ${1}`}.`,
      'times-k': t`For ${math`k \ge ${1}`}, ${math`\frac{k}{k!} = \frac{${1}}{(k - ${1})!}`}, so the sum is ${math`\sum_{k \ge ${1}} \frac{${p.a}^{k}}{(k - ${1})!} = ${p.a}\sum_{j \ge ${0}} \frac{${p.a}^{j}}{j!} = ${p.a}e^{${p.a}}`}, with ${math`j = k - ${1}`}.`,
      alternating: t`This is the series for ${math`e^{x}`} at ${math`x = -${p.a}`}: ${math`e^{-${p.a}}`}.`,
    } as const;
    return {
      prompt: t`Find ${sum} exactly.`,
      answer: { kind: 'expression', expected: sumAnswer(p), variables: [] },
      solution: [t`Compare with ${math`e^{x} = \sum_{k \ge ${0}} \frac{x^{k}}{k!}`}.`, steps[p.form]],
    };
  },
  // Add 60 terms in floating point and name the matching closed form from the candidates.
  solve: (p) => {
    let s = 0;
    for (let k = 0; k <= 60; k++) {
      const term = (p.form === 'alternating' ? (-p.a) ** k : p.a ** k) / factorial(k);
      s += p.form === 'from-one' && k === 0 ? 0 : p.form === 'times-k' ? k * term : term;
    }
    const cands = [`e^${p.a}`, `e^${p.a} - 1`, `${p.a}*e^${p.a}`, `e^(-${p.a})`];
    const vals = [Math.exp(p.a), Math.exp(p.a) - 1, p.a * Math.exp(p.a), Math.exp(-p.a)];
    let best = 0;
    vals.forEach((v, i) => { if (Math.abs(v - s) < Math.abs((vals[best] as number) - s)) best = i; });
    return cands[best] as string;
  },
  misconceptions: (p): Misconception[] => {
    switch (p.form) {
      case 'all': return [
        { response: `e^${p.a} - 1`, why: t`The ${math`k = ${0}`} term is ${math`\frac{${p.a}^{${0}}}{${0}!} = ${1}`} and is included here.` },
        { response: `1/(1 - ${p.a})`, why: t`That is the geometric series ${math`\sum x^{k}`}, which has no factorials (and diverges for ${math`x = ${p.a}`}). With ${math`k!`} below, it is the exponential series.` },
      ];
      case 'from-one': return [
        { response: `e^${p.a}`, why: t`The sum starts at ${math`k = ${1}`}, so the term ${math`\frac{${p.a}^{${0}}}{${0}!} = ${1}`} is missing: subtract it.` },
        { response: `e^${p.a - 1}`, why: t`Starting the sum one later removes the first term; it does not change the exponent.` },
      ];
      case 'times-k': return [
        { response: `e^${p.a}`, why: t`After cancelling ${math`\frac{k}{k!} = \frac{${1}}{(k - ${1})!}`}, one factor ${p.a} is left over: ${math`${p.a}^{k} = ${p.a} \cdot ${p.a}^{k - ${1}}`}.` },
        { response: `e^${p.a} - 1`, why: t`Do not drop the factor ${math`k`}: cancel it against ${math`k!`} to get ${math`\frac{${1}}{(k - ${1})!}`}.` },
      ];
      case 'alternating': return [
        { response: `-e^${p.a}`, why: t`The minus sign is inside the power: this is ${math`e^{x}`} at ${math`x = -${p.a}`}, which is positive.` },
        { response: `1/(1 + ${p.a})`, why: t`That is a geometric series. With ${math`k!`} below, this is the exponential series at ${math`-${p.a}`}.` },
      ];
    }
  },
});

// ---------------------------------------------------------------- Cambridge problems

const ekx = auto({
  id: 'a22-q2-ii',
  source: cite(F22, 'Assignment 22, Q2(i), (ii)'),
  title: t`The derivative of e to the kx from its series`,
  prompt: t`Define ${math`e^{x}`} by ${math`e^{x} = ${1} + x + \frac{x^{${2}}}{${2}!} + \frac{x^{${3}}}{${3}!} + \cdots`}. Using only this definition, find ${math`\frac{d}{dx}e^{kx}`}, where ${math`k`} is a constant.`,
  answer: { kind: 'expression', expected: 'k e^(k x)', variables: ['x', 'k'], domains: { x: { kind: 'real', min: -2, max: 2 }, k: { kind: 'real', min: -2, max: 2 } } },
  solution: [
    t`${math`e^{kx} = ${1} + kx + \frac{k^{${2}}x^{${2}}}{${2}!} + \frac{k^{${3}}x^{${3}}}{${3}!} + \cdots`}.`,
    t`Differentiate term by term: ${math`k + \frac{${2}k^{${2}}x}{${2}!} + \frac{${3}k^{${3}}x^{${2}}}{${3}!} + \cdots = k + k^{${2}}x + \frac{k^{${3}}x^{${2}}}{${2}!} + \cdots`}, since ${math`\frac{n}{n!} = \frac{${1}}{(n - ${1})!}`}.`,
    t`Take out the factor ${math`k`}: ${math`k\left(${1} + kx + \frac{(kx)^{${2}}}{${2}!} + \cdots\right) = ke^{kx}`}.`,
  ],
  reference: 'k exp(k x)',
  verify: () => {
    for (const k of [-1.5, 0.5, 2]) {
      const e = close(`derivative at x = 0.7, k = ${k}`, numDeriv((x) => Math.exp(k * x), 0.7), k * Math.exp(k * 0.7));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: 'e^(k x)', why: t`Each term ${math`\frac{(kx)^{n}}{n!}`} differentiates to ${math`\frac{k^{n}x^{n - ${1}}}{(n - ${1})!}`}: one factor ${math`k`} too many to rebuild the series, so it comes out in front.` }],
  official: { source: cite(F22H, 'Assignment 22 hints, Q2(ii)'), answer: 'k e^(k x)', agrees: true },
});

const xexSeries = auto({
  id: 'a22-q2-iii-series',
  source: cite(F22, 'Assignment 22, Q2(iii)'),
  title: t`The derivative of x times e to the x, from the series`,
  prompt: t`Using ${math`e^{x} = \sum_{k \ge ${0}} \frac{x^{k}}{k!}`} and without the product rule, find ${math`\frac{d}{dx}(xe^{x})`}.`,
  answer: { kind: 'expression', expected: '(x + 1) e^x', variables: ['x'] },
  solution: [
    t`${math`xe^{x} = x + x^{${2}} + \frac{x^{${3}}}{${2}!} + \frac{x^{${4}}}{${3}!} + \cdots`}, so its derivative is ${math`${1} + ${2}x + \frac{${3}x^{${2}}}{${2}!} + \frac{${4}x^{${3}}}{${3}!} + \cdots`}.`,
    t`Split each coefficient ${math`n + ${1}`} as ${math`${1} + n`}: ${math`\left(${1} + x + \frac{x^{${2}}}{${2}!} + \cdots\right) + \left(x + \frac{${2}x^{${2}}}{${2}!} + \frac{${3}x^{${3}}}{${3}!} + \cdots\right) = e^{x} + x\left(${1} + x + \frac{x^{${2}}}{${2}!} + \cdots\right)`}.`,
    t`That is ${math`e^{x} + xe^{x} = (x + ${1})e^{x}`}.`,
    t`Split the coefficients to recognise known series.`,
  ],
  nudge: t`Not quite. Write ${math`xe^{x}`} as a series, differentiate term by term, then split each coefficient.`,
  hints: [
    t`What is ${math`xe^{x}`} as a power series in ${math`x`}?`,
    t`Differentiating term by term, what is the coefficient of ${math`x^{n}`}?`,
    t`How can that coefficient be split so that two familiar series appear?`,
  ],
  reference: 'e^x + x e^x',
  verify: () => agreesAt('(xe^x)\'', '(x + 1) e^x', (x) => numDeriv((u) => u * Math.exp(u), x), [-1, 0.5, 2]),
  misconceptions: [{ response: 'x e^x', why: t`Differentiating ${math`x^{n + ${1}}`} brings down ${math`n + ${1}`}, not ${math`n`}: there is an extra ${math`e^{x}`}.` }],
  official: { source: cite(F22H, 'Assignment 22 hints, Q2(iii)'), answer: '(x + 1) e^x', agrees: true },
});

const productQ = supervision({
  id: 'a22-q2-iv',
  source: cite(F22, 'Assignment 22, Q2(iv)'),
  title: t`Index laws from the series`,
  prompt: t`With ${math`e^{x}`} defined by its series, and without using any rules of indices: use the product rule to show that ${math`\frac{d}{dx}(e^{ax}e^{bx}) = (a + b)e^{ax}e^{bx}`}. Starting with this result, show that ${math`e^{x}e^{-x} = ${1}`}, so that ${math`e^{-x} = \frac{${1}}{e^{x}}`}. Use this result and the series to show that ${math`xe^{x} \to ${0}`} as ${math`x \to -\infty`}.`,
  writeUp: 'proof',
  hints: [
    t`Given ${math`\frac{d}{dx}e^{kx} = ke^{kx}`} from the series, what does the product rule give for ${math`\frac{d}{dx}(e^{ax}e^{bx})`}?`,
    t`With ${math`a = ${1}`} and ${math`b = -${1}`}, what is the derivative of ${math`e^{x}e^{-x}`}, and what is its value at ${math`x = ${0}`}?`,
    t`Writing ${math`x = -y`} with ${math`y > ${0}`}, how does ${math`e^{y} > \frac{y^{${2}}}{${2}}`}, from the series, bound ${math`|xe^{x}|`}?`,
  ],
  official: cite(F22H, 'Assignment 22 hints, Q2(iv)'),
});

// ---------------------------------------------------------------- lesson

const TERMS5 = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => 5 ** k / factorial(k));

export const expSeries: TopicContent = {
  topicId: 'an.exp-series',
  goal: t`Use ${math`e^{x} = \sum_{k \ge ${0}} \frac{x^{k}}{k!}`}, for example to sum Poisson probabilities.`,
  objective: t`Define e to the x by its series, see why it is its own derivative, and sum series by spotting it.`,
  why: t`The series turns Poisson sums, generating functions, and limits into algebra, all over the IA courses.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`A function that is its own derivative` },
    { kind: 'hook', text: t`Can you write down a polynomial that differentiates to itself? ${math`${1} + x`} differentiates to ${1}: a term short. Add ${math`\frac{x^{${2}}}{${2}}`} to repair it, and now the ${math`x^{${2}}`} term is unmatched. Keep repairing forever and you build ${math`e^{x}`}.` },
    { kind: 'narrative', text: t`Each repair adds the term whose derivative is the last one: ${math`\frac{x^{${3}}}{${3} \cdot ${2}}`}, then ${math`\frac{x^{${4}}}{${4} \cdot ${3} \cdot ${2}}`}. The denominators are factorials. Differentiating ${math`\frac{x^{k}}{k!}`} gives ${math`\frac{kx^{k - ${1}}}{k!} = \frac{x^{k - ${1}}}{(k - ${1})!}`}, exactly the term before it.` },
    { kind: 'definition', name: t`The exponential series`, formal: t`For real ${math`x`}, ${math`\exp(x) = \sum_{k = ${0}}^{\infty} \frac{x^{k}}{k!} = ${1} + x + \frac{x^{${2}}}{${2}!} + \frac{x^{${3}}}{${3}!} + \cdots`}, with ${math`${0}! = ${1}`}. This is the [[exponential-series|exponential series]], and ${math`e^{x}`} means ${math`\exp(x)`}; ${math`e = \exp(${1})`}.`, plain: t`At ${math`x = ${1}`}: ${math`${1} + ${1} + \frac{${1}}{${2}} + \frac{${1}}{${6}} + \frac{${1}}{${24}} = ${partial(q(1), 4)}`} already, and the full sum is ${math`e \approx ${Number(Math.E.toPrecision(6))}`}.` },
    { kind: 'theorem', name: t`Convergence`, statement: t`For every real ${math`x`}, the series ${math`\sum_{k \ge ${0}} \frac{x^{k}}{k!}`} converges, and so does ${math`\sum_{k \ge ${0}} \frac{|x|^{k}}{k!}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Compare neighbouring terms`, text: t`The ratio of the term for ${math`k + ${1}`} to the term for ${math`k`} has size ${math`\frac{|x|^{k + ${1}}/(k + ${1})!}{|x|^{k}/k!} = \frac{|x|}{k + ${1}}`}.` },
        { label: t`Eventually at most a half`, text: t`Choose a whole number ${math`N \ge ${2}|x|`}. For ${math`k \ge N`}, ${math`\frac{|x|}{k + ${1}} < \frac{${1}}{${2}}`}, so each term is less than half the one before.` },
        { label: t`Compare with a geometric series`, text: t`So from ${math`k = N`} on the terms are at most ${math`T, \frac{T}{${2}}, \frac{T}{${4}}, \ldots`}, where ${math`T = \frac{|x|^{N}}{N!}`}; their sum is at most ${math`${2}T`}.`, why: { q: t`Why is that sum at most ${math`${2}T`}?`, a: t`It is the geometric series ${math`T\sum_{j \ge ${0}} ${2}^{-j} = \frac{T}{${1} - \frac{${1}}{${2}}} = ${2}T`}.` } },
        { label: t`Conclude`, text: t`The partial sums of the positive series ${math`\sum \frac{|x|^{k}}{k!}`} increase and are bounded, so it converges; and a series whose terms' sizes add up to a finite total converges itself (this is called absolute convergence, and the fact is proved in IA Analysis).` },
      ],
    },
    { kind: 'table', caption: t`The terms ${math`\frac{${5}^{k}}{k!}`} grow at first, then the factorial wins`, head: [t`${math`k`}`, ...TERMS5.map((_, k) => t`${k}`)], rows: [[t`term`, ...TERMS5.map((v) => t`${Number(v.toPrecision(4))}`)]] },
    { kind: 'section', title: t`Its own derivative` },
    { kind: 'theorem', name: t`Derivative`, statement: t`${math`\frac{d}{dx}\exp(x) = \exp(x)`} for every real ${math`x`}, and so ${math`\frac{d}{dx}\exp(kx) = k\exp(kx)`}.` },
    { kind: 'p', text: t`Differentiating term by term, as in the narrative above, turns the series into itself. That a convergent power series may be differentiated term by term is a theorem of IA Analysis; here, as in STEP Support Assignment ${22}, we use it.`, why: { q: t`And ${math`e^{kx}`}?`, a: t`Its terms are ${math`\frac{k^{n}x^{n}}{n!}`}, which differentiate to ${math`k \cdot \frac{k^{n - ${1}}x^{n - ${1}}}{(n - ${1})!}`}: ${math`k`} times the series again.` } },
    { kind: 'narrative', text: t`Notice what has not been assumed. With ${math`e^{x}`} defined by its series, laws such as ${math`e^{a}e^{b} = e^{a + b}`} and ${math`e^{-x} = \frac{${1}}{e^{x}}`} are not definitions but theorems, and this one property, together with the product rule, is enough to prove them.` },
    { kind: 'section', title: t`Summing series` },
    { kind: 'narrative', text: t`Many sums are the exponential series in disguise. The Poisson probabilities ${math`e^{-\lambda}\frac{\lambda^{k}}{k!}`} add to ${math`e^{-\lambda}e^{\lambda} = ${1}`}. With a factor ${math`k`}, cancel it against the factorial: ${math`\sum_{k \ge ${1}} k\frac{\lambda^{k}}{k!} = \lambda\sum_{k \ge ${1}} \frac{\lambda^{k - ${1}}}{(k - ${1})!} = \lambda e^{\lambda}`}, which makes the Poisson mean ${math`\lambda`}.` },
    checkFrom(recognise, { form: 'times-k', a: 3 }, t`Cancel ${math`\frac{k}{k!} = \frac{${1}}{(k - ${1})!}`} and take out one factor ${3}: ${math`${3}e^{${3}}`}.`),
    { kind: 'pitfall', claim: t`The terms of the exponential series always get smaller.`, counterexample: t`At ${math`x = ${5}`} the terms are ${1}, ${5}, ${12.5}, about ${Number((125 / 6).toPrecision(4))}, about ${Number((625 / 24).toPrecision(4))}, rising until ${math`k = ${5}`} before the factorials win.` },
    { kind: 'pitfall', claim: t`A few terms give ${math`e^{x}`} well for every ${math`x`}.`, counterexample: t`At ${math`x = ${-10}`}: ${math`${1} + x + \frac{x^{${2}}}{${2}} = ${41}`}, while ${math`e^{${-10}} \approx ${Number(Math.exp(-10).toPrecision(3))}`}. Truncations are good only for small ${math`|x|`}.` },
    { kind: 'takeaway', text: t`${math`e^{x} = \sum \frac{x^{k}}{k!}`} converges for every ${math`x`}, differentiates to itself, and sums anything with ${math`k!`} in the denominator.` },
  ],
  examples: [
    { ...workedCambridge(ekx), examiner: t`The examiner wants the differentiation done on the series, term by term, and the series recognised again after taking out ${math`k`}; quoting the answer earns nothing.` },
    worked(partialSum, { x: q(1, 2), n: 3 }, t`Four terms at a half`),
    worked(coefficient, { a: q(-2), n: 3 }, t`A coefficient of a stretched exponential`),
  ],
  generators: [partialSum, coefficient, recognise],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['exponential-series'],
  cambridge: withUses([xexSeries, productQ], {
    'a22-q2-iv': { sections: ['Its own derivative'], note: t`Index laws from the series, by the product rule` },
    'a22-q2-iii-series': { sections: ['Its own derivative'], note: t`Differentiating a series term by term` },
  }),
  gate: ['a22-q2-iv', 'a22-q2-iii-series'],
  recall: [
    { front: t`Write the exponential series.`, back: t`${math`e^{x} = \sum_{k \ge ${0}} \frac{x^{k}}{k!}`}, convergent for every real ${math`x`}.` },
    { front: t`What is ${math`\sum_{k \ge ${1}} \frac{k\lambda^{k}}{k!}`}?`, back: t`${math`\lambda e^{\lambda}`}: cancel ${math`k`} against ${math`k!`}.` },
  ],
  proofOrder: [{
    title: t`The exponential series converges`,
    steps: [
      t`Neighbouring terms have ratio ${math`\frac{|x|}{k + ${1}}`}.`,
      t`Beyond ${math`N \ge ${2}|x|`} the ratio is below ${math`\frac{${1}}{${2}}`}.`,
      t`So the tail is at most a geometric series with ratio ${math`\frac{${1}}{${2}}`}.`,
      t`The partial sums are bounded and increasing, so the series converges.`,
    ],
  }],
};

