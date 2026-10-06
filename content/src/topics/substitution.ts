/**
 * calc.substitution: integration by substitution, proved from the chain rule and the
 * fundamental theorem; changing the limits with the variable; substitutions that simplify
 * (u = px + q, u = x^2 + c) and ones that remove a square root (x = 2 sin theta). The
 * Cambridge problems are STEP Support Foundation Assignment 25, Q1 and Q3 (1994 STEP I Q8),
 * with the Assignment 25 hints, and STEP 3 Statistics Q4 (2005 S3 Q14, the substitution
 * u = k^2/x).
 */
import { auto, cite, supervision } from '../cambridge';
import { int, pick, q, str, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { poly } from '../poly';
import { agreesAt, close, numDeriv, simpson } from '../prep-c';
import { computedMath as cm, dmath, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const F25 = 'step-f25' as const;
const F25H = 'step-f25-hints' as const;
const S3 = 'step-s3-stats' as const;
const S3S = 'step-s3-stats-solutions' as const;

// ---------------------------------------------------------------- u = px + q

interface LinP { p: number; c: number; n: number; b: number }
const powQ = (x: number, n: number): number => x ** n;
const linVal = ({ p, c, n, b }: LinP): Rational => q(powQ(p * b + c, n + 1) - powQ(c, n + 1), p * (n + 1));
const linMis = ({ p, c, n, b }: LinP): string[] => [str(q(powQ(p * b + c, n + 1) - powQ(c, n + 1), n + 1)), str(q(powQ(b, n + 1), p * (n + 1)))];
const linear = generator<LinP>({
  id: 'linear-substitution',
  skill: 'Integrate (px + c)^n with u = px + c: du = p dx, and the limits change to u values.',
  params: (rng) => {
    for (;;) {
      const g: LinP = { p: pick(rng, [2, 3, -2]), c: int(rng, 1, 3), n: pick(rng, [2, 3]), b: int(rng, 1, 2) };
      const right = str(linVal(g));
      const [m1, m2] = linMis(g);
      if (new Set([right, m1, m2]).size === 3) return g;
    }
  },
  sane: ({ p }) => (p !== 0 ? null : 'p must not be 0'),
  problem: (g) => {
    const lo = g.c;
    const hi = g.p * g.b + g.c;
    return {
      prompt: t`Evaluate ${math`\int_{${0}}^{${g.b}} (${cm(poly([g.p, g.c]))})^{${g.n}}\,dx`} with the substitution ${math`u = ${cm(poly([g.p, g.c]))}`}.`,
      answer: { kind: 'exact', expected: str(linVal(g)) },
      solution: [
        t`${math`\frac{du}{dx} = ${g.p}`}, so ${math`dx = \frac{du}{${g.p}}`}. When ${math`x = ${0}`}, ${math`u = ${lo}`}; when ${math`x = ${g.b}`}, ${math`u = ${hi}`}.`,
        t`${math`\int_{${lo}}^{${hi}} \frac{u^{${g.n}}}{${g.p}}\,du = \left[\frac{u^{${g.n + 1}}}{${g.p * (g.n + 1)}}\right]_{${lo}}^{${hi}} = \frac{${powQ(hi, g.n + 1)} - ${powQ(lo, g.n + 1)}}{${g.p * (g.n + 1)}} = ${linVal(g)}`}.`,
      ],
    };
  },
  solve: (g) => str(q(Math.round(simpson((x) => (g.p * x + g.c) ** g.n, 0, g.b, 2) * 12 * Math.abs(g.p)), 12 * Math.abs(g.p))),
  misconceptions: (g): Misconception[] => {
    const [m1, m2] = linMis(g);
    return [
      { response: m1 as string, why: t`${math`dx = \frac{du}{${g.p}}`}: the factor ${math`\frac{${1}}{${g.p}}`} must come with the change of variable.` },
      { response: m2 as string, why: t`Once the integral is in ${math`u`}, the limits must be ${math`u`} values: ${g.c} and ${g.p * g.b + g.c}, not the old ${math`x`} limits.` },
    ];
  },
});

// ---------------------------------------------------------------- x e^(a x^2)

interface GauP { a: number; c: number }
const gau = ({ a, c }: GauP): string => `(e^(${a * c * c}) - 1)/${2 * a}`;
const reverseChain = generator<GauP>({
  id: 'reverse-chain',
  skill: 'Spot x dx as half of d(x^2): substitute u = a x^2 to integrate x e^(a x^2).',
  params: (rng) => ({ a: pick(rng, [1, 2, 3, -1, -2]), c: pick(rng, [1, 2]) }),
  sane: ({ a }) => (a !== 0 ? null : 'a must not be 0'),
  problem: (g) => ({
    prompt: t`Evaluate ${math`\int_{${0}}^{${g.c}} xe^{${g.a === 1 ? '' : g.a === -1 ? '-' : g.a}x^{${2}}}\,dx`} exactly.`,
    answer: { kind: 'expression', expected: gau(g), variables: [] },
    solution: [
      t`Let ${math`u = ${g.a === 1 ? '' : g.a === -1 ? '-' : g.a}x^{${2}}`}: ${math`du = ${2 * g.a}x\,dx`}, so ${math`x\,dx = \frac{du}{${2 * g.a}}`}. The limits become ${math`u = ${0}`} and ${math`u = ${g.a * g.c * g.c}`}.`,
      t`${math`\int_{${0}}^{${g.a * g.c * g.c}} \frac{e^{u}}{${2 * g.a}}\,du = \frac{e^{${g.a * g.c * g.c}} - ${1}}{${2 * g.a}}`}.`,
    ],
  }),
  solve: (g) => String(simpson((x) => x * Math.exp(g.a * x * x), 0, g.c, 4000)),
  misconceptions: (g): Misconception[] => [
    { response: `e^(${g.a * g.c * g.c}) - 1`, why: t`${math`du = ${2 * g.a}x\,dx`}, so ${math`x\,dx`} is only ${math`\frac{${1}}{${2 * g.a}}`} of ${math`du`}.` },
    { response: `e^(${g.a * g.c * g.c})/${2 * g.a}`, why: t`The lower limit ${math`u = ${0}`} gives ${math`e^{${0}} = ${1}`}, which must be subtracted.` },
  ],
});

// ---------------------------------------------------------------- x/sqrt(x^2 + s^2)

const TRIPLES: readonly [number, number, number][] = [[4, 3, 5], [3, 4, 5], [12, 5, 13], [5, 12, 13], [8, 6, 10], [6, 8, 10], [15, 8, 17], [24, 7, 25]];
interface SqP { k: number; t: number }
const sqrtSub = generator<SqP>({
  id: 'root-substitution',
  skill: 'Integrate k x/sqrt(x^2 + s^2) with u = x^2 + s^2, keeping the half from du = 2x dx.',
  quick: true,
  params: (rng) => ({ k: pick(rng, [1, 2, 3]), t: int(rng, 0, TRIPLES.length - 1) }),
  sane: ({ t: i }) => (i >= 0 && i < TRIPLES.length ? null : 'no triple'),
  problem: (g) => {
    const [b, s, h] = TRIPLES[g.t] as [number, number, number];
    const top = g.k === 1 ? math`x` : math`${g.k}x`;
    return {
      prompt: t`Evaluate ${math`\int_{${0}}^{${b}} \frac{${top}}{\sqrt{x^{${2}} + ${s * s}}}\,dx`}.`,
      answer: { kind: 'exact', expected: String(g.k * (h - s)) },
      solution: [
        t`Let ${math`u = x^{${2}} + ${s * s}`}, so ${math`du = ${2}x\,dx`}; the limits become ${s * s} and ${h * h}.`,
        t`${math`\int_{${s * s}}^{${h * h}} \frac{${g.k}}{${2}\sqrt{u}}\,du = ${g.k}\left[\sqrt{u}\right]_{${s * s}}^{${h * h}} = ${g.k}(${h} - ${s}) = ${g.k * (h - s)}`}.`,
      ],
    };
  },
  solve: (g) => {
    const [b, s] = TRIPLES[g.t] as [number, number, number];
    return String(Math.round(simpson((x) => (g.k * x) / Math.sqrt(x * x + s * s), 0, b, 4000)));
  },
  misconceptions: (g): Misconception[] => {
    const [, s, h] = TRIPLES[g.t] as [number, number, number];
    return [
      { response: String(g.k * h), why: t`Subtract the value at the lower limit too: ${math`\sqrt{${s * s}} = ${s}`}.` },
      { response: String(2 * g.k * (h - s)), why: t`${math`x\,dx = \frac{du}{${2}}`}, and ${math`\int \frac{du}{${2}\sqrt{u}} = \sqrt{u}`}: no extra factor ${2}.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const arcsinQ = auto({
  id: 'a25-q1-ii',
  source: cite(F25, 'Assignment 25, Q1(ii)'),
  title: t`A square root removed by a sine`,
  prompt: t`Use the substitution ${math`x = ${2}\sin\theta`} to evaluate ${math`\int_{${0}}^{${1}} \frac{${1}}{\sqrt{${4} - x^{${2}}}}\,dx`}.`,
  answer: { kind: 'expression', expected: 'pi/6', variables: [] },
  solution: [
    t`${math`dx = ${2}\cos\theta\,d\theta`}. When ${math`x = ${0}`}, ${math`\theta = ${0}`}; when ${math`x = ${1}`}, ${math`\sin\theta = \frac{${1}}{${2}}`}, so ${math`\theta = \frac{\pi}{${6}}`} (taking ${math`-\frac{\pi}{${2}} \le \theta \le \frac{\pi}{${2}}`}).`,
    t`${math`\sqrt{${4} - ${4}\sin^{${2}}\theta} = ${2}\cos\theta`}, positive on that range, so the integrand becomes ${math`\frac{${2}\cos\theta}{${2}\cos\theta} = ${1}`}.`,
    t`${math`\int_{${0}}^{\frac{\pi}{${6}}} ${1}\,d\theta = \frac{\pi}{${6}}`}.`,
  ],
  reference: 'pi/6',
  verify: () => close('Simpson', simpson((x) => 1 / Math.sqrt(4 - x * x), 0, 1), Math.PI / 6),
  misconceptions: [{ response: '1/2', why: t`${math`\frac{${1}}{${2}}`} is ${math`\sin\theta`} at the upper limit. Change the limit to the ${math`\theta`} value, ${math`\frac{\pi}{${6}}`}, and integrate ${1} up to it.` }],
  official: { source: cite(F25H, 'Assignment 25 hints, Q1(ii)'), answer: 'pi/6', agrees: true },
});

const fracQ = auto({
  id: 'a25-q1-i-a',
  source: cite(F25, 'Assignment 25, Q1(i)(a)'),
  title: t`Shift the denominator`,
  prompt: t`Using the substitution ${math`x = u + ${2}`}, find ${math`\int \frac{x}{x - ${2}}\,dx`} for ${math`x > ${2}`}. Give the answer in the form ${math`x + A\ln|x - ${2}|`}, with constant ${0}.`,
  answer: { kind: 'expression', expected: 'x + 2 ln(abs(x - 2))', variables: ['x'], domains: { x: { kind: 'real', min: 2.5, max: 8 } } },
  solution: [
    t`${math`dx = du`} and ${math`\frac{x}{x - ${2}} = \frac{u + ${2}}{u} = ${1} + \frac{${2}}{u}`}.`,
    t`${math`\int \left(${1} + \frac{${2}}{u}\right)du = u + ${2}\ln|u| + c = x - ${2} + ${2}\ln|x - ${2}| + c`}, and the ${math`-${2}`} joins the constant.`,
  ],
  reference: 'x + 2 ln(x - 2)',
  verify: () => agreesAt('derivative', 'x/(x - 2)', (x) => numDeriv((u) => u + 2 * Math.log(u - 2), x), [2.5, 4, 7]),
  misconceptions: [{ response: 'x + ln(abs(x - 2))', why: t`${math`\frac{u + ${2}}{u} = ${1} + \frac{${2}}{u}`}: the ${2} stays as a factor of the logarithm.` }],
  official: { source: cite(F25H, 'Assignment 25 hints, Q1(i)(a)'), answer: 'x + 2 ln(abs(x - 2))', agrees: true },
});

const rootQ = auto({
  id: 'a25-q1-i-b',
  source: cite(F25, 'Assignment 25, Q1(i)(b)'),
  title: t`A square root in the denominator`,
  prompt: t`Using the substitution ${math`x = \frac{${1}}{${2}}(u^{${2}} - ${1})`}, find ${math`\int \frac{${6}x}{\sqrt{${2}x + ${1}}}\,dx`} for ${math`x > ${0}`}, with constant ${0}.`,
  answer: { kind: 'expression', expected: '2(x - 1) sqrt(2x + 1)', variables: ['x'], domains: { x: { kind: 'real', min: 0.2, max: 5 } } },
  solution: [
    t`Then ${math`u = \sqrt{${2}x + ${1}}`}, ${math`dx = u\,du`}, and ${math`${6}x = ${3}(u^{${2}} - ${1})`}.`,
    t`${math`\int \frac{${3}(u^{${2}} - ${1})}{u} \cdot u\,du = \int ${3}(u^{${2}} - ${1})\,du = u^{${3}} - ${3}u + c`}.`,
    t`${math`u^{${3}} - ${3}u = u(u^{${2}} - ${3}) = \sqrt{${2}x + ${1}}\,(${2}x - ${2}) = ${2}(x - ${1})\sqrt{${2}x + ${1}}`}.`,
  ],
  reference: '(2x + 1)^(3/2) - 3 sqrt(2x + 1)',
  verify: () => agreesAt('derivative', '6x/sqrt(2x + 1)', (x) => numDeriv((u) => 2 * (u - 1) * Math.sqrt(2 * u + 1), x), [0.5, 1, 3]),
  misconceptions: [{ response: '(2x + 1)^(3/2)', why: t`That is only the ${math`u^{${3}}`} part. The ${math`-${3}u`} term is also needed.` }],
  official: { source: cite(F25H, 'Assignment 25 hints, Q1(i)(b)'), answer: '2(x - 1) sqrt(2x + 1)', agrees: true },
});

const tanSubQ = auto({
  id: 'a25-q3-tan',
  source: cite(F25, 'Assignment 25, Q3'),
  title: t`STEP: a substitution back to a known integral`,
  prompt: t`Given that ${math`\int_{${0}}^{\frac{\pi}{${4}}} \ln(${1} + \tan\theta)\,d\theta = \frac{\pi\ln ${2}}{${8}}`}, evaluate ${math`\int_{${0}}^{${1}} \frac{\ln(${1} + x)}{${1} + x^{${2}}}\,dx`}.`,
  answer: { kind: 'expression', expected: 'pi ln(2)/8', variables: [] },
  solution: [
    t`The limits ${0} and ${1} and the ${math`${1} + x^{${2}}`} suggest ${math`x = \tan\theta`}: then ${math`dx = \sec^{${2}}\theta\,d\theta`} and ${math`${1} + x^{${2}} = \sec^{${2}}\theta`}.`,
    t`The limits become ${math`\theta = ${0}`} and ${math`\theta = \frac{\pi}{${4}}`}, and the integral becomes ${math`\int_{${0}}^{\frac{\pi}{${4}}} \frac{\ln(${1} + \tan\theta)}{\sec^{${2}}\theta}\sec^{${2}}\theta\,d\theta = \frac{\pi\ln ${2}}{${8}}`}.`,
  ],
  reference: 'pi ln(2)/8',
  verify: () => close('Simpson', simpson((x) => Math.log(1 + x) / (1 + x * x), 0, 1), (Math.PI * Math.log(2)) / 8),
  misconceptions: [{ response: 'pi ln(2)/4', why: t`The ${math`\sec^{${2}}\theta`} from ${math`dx`} cancels the one from ${math`${1} + x^{${2}}`} exactly, so the value is the given one, ${math`\frac{\pi\ln ${2}}{${8}}`}.` }],
  official: { source: cite(F25H, 'Assignment 25 hints, Q3(i)'), answer: 'pi ln(2)/8', agrees: true },
});

const statsQ = supervision({
  id: 's3-q4',
  source: cite(S3, 'Q4'),
  title: t`STEP: the substitution u equals k squared over x`,
  prompt: t`For a positive integer ${math`a`} and ${math`k > ${0}`}, show, by means of a suitable substitution, that ${math`\int_{${0}}^{v} \frac{x^{a}}{(x + k)^{${2}a + ${2}}}\,dx = \int_{\frac{k^{${2}}}{v}}^{\infty} \frac{u^{a}}{(u + k)^{${2}a + ${2}}}\,du`}, and deduce that the median of the random variable ${math`V`} with density ${math`f(x) = \frac{Ck^{a + ${1}}x^{a}}{(x + k)^{${2}a + ${2}}}`} on ${math`x \ge ${0}`} is ${math`k`}.`,
  writeUp: 'proof',
  official: cite(S3S, 'Q4'),
});

// ---------------------------------------------------------------- lesson

export const substitution: TopicContent = {
  topicId: 'calc.substitution',
  goal: t`Change the variable of a definite integral, with its limits, to turn it into one you can evaluate.`,
  objective: t`Change the variable in an integral, limits and all, to reach an integral you can do.`,
  why: t`Substitution is the main tool of STEP integration questions, which rarely say which one to use.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`The chain rule, run backwards` },
    { kind: 'hook', text: t`What is ${math`\int_{${0}}^{${1}} \frac{${1}}{\sqrt{${4} - x^{${2}}}}\,dx`}? None of the standard integrals fits. But put ${math`x = ${2}\sin\theta`} and the square root becomes ${math`${2}\cos\theta`}, which cancels completely, leaving ${math`\int ${1}\,d\theta`}. How can renaming the variable be allowed?` },
    { kind: 'narrative', text: t`Recall the chain rule: ${math`\frac{d}{du}F(g(u)) = F'(g(u))g'(u)`}. Read backwards, it says an integrand of the shape ${math`f(g(u))g'(u)`} has antiderivative ${math`F(g(u))`}. That is all substitution is.` },
    { kind: 'theorem', name: t`Integration by substitution`, statement: t`Let ${math`g`} have a continuous derivative on ${math`[\alpha, \beta]`}, and let ${math`f`} be continuous on an interval containing ${math`g(u)`} for all ${math`u \in [\alpha, \beta]`}. Then ${math`\int_{\alpha}^{\beta} f(g(u))g'(u)\,du = \int_{g(\alpha)}^{g(\beta)} f(x)\,dx`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`An antiderivative`, text: t`Let ${math`F`} be an antiderivative of ${math`f`}, which exists because ${math`f`} is continuous (take ${math`F(x) = \int_{c}^{x} f`}).` },
        { label: t`Chain rule`, text: t`${math`\frac{d}{du}F(g(u)) = f(g(u))g'(u)`}, so ${math`F \circ g`} is an antiderivative of the left integrand.` },
        { label: t`Both sides`, text: t`By the fundamental theorem, the left side is ${math`F(g(\beta)) - F(g(\alpha))`}, and so is the right side.`, eq: [dmath`\int_{\alpha}^{\beta} f(g(u))g'(u)\,du = F(g(\beta)) - F(g(\alpha)) = \int_{g(\alpha)}^{g(\beta)} f(x)\,dx`] },
      ],
    },
    { kind: 'p', text: t`In practice: write ${math`x = g(u)`}, replace ${math`dx`} by ${math`g'(u)\,du`} (the shorthand ${math`dx = \frac{dx}{du}du`}), and replace each limit by the matching value of the new variable. That is a [[substitution|substitution]]; done properly, you never need to go back to ${math`x`}.`, why: { q: t`Is ${math`dx = \frac{dx}{du}du`} a real equation?`, a: t`Not on its own; it is a memory aid. What is true is the theorem, and the shorthand produces exactly its two sides.` } },
    { kind: 'section', title: t`Choosing the substitution` },
    {
      kind: 'steps',
      steps: [
        { label: t`Spot the derivative`, text: t`In ${math`\int_{${0}}^{${1}} xe^{x^{${2}}}\,dx`}, the factor ${math`x`} is half the derivative of ${math`x^{${2}}`}. So let ${math`u = x^{${2}}`}: ${math`du = ${2}x\,dx`}.` },
        { label: t`Change the limits`, text: t`${math`x = ${0}`} gives ${math`u = ${0}`}; ${math`x = ${1}`} gives ${math`u = ${1}`}.` },
        { label: t`Integrate in u`, text: t`${math`\int_{${0}}^{${1}} \frac{e^{u}}{${2}}\,du = \frac{e - ${1}}{${2}}`}.` },
      ],
    },
    { kind: 'narrative', text: t`Other substitutions remove an awkward expression: ${math`u = \sqrt{${2}x + ${1}}`} removes a square root; ${math`x = ${2}\sin\theta`} turns ${math`\sqrt{${4} - x^{${2}}}`} into ${math`${2}\cos\theta`}; ${math`x = \tan\theta`} turns ${math`${1} + x^{${2}}`} into ${math`\sec^{${2}}\theta`}. The limits often hint at the right one: ${0} to ${1} for ${math`x`} is ${0} to ${math`\frac{\pi}{${4}}`} for ${math`\theta`} when ${math`x = \tan\theta`}.` },
    checkFrom(linear, { p: 2, c: 1, n: 2, b: 1 }, t`${math`u = ${2}x + ${1}`} runs from ${1} to ${3}, and ${math`\int_{${1}}^{${3}} \frac{u^{${2}}}{${2}}\,du = \frac{${27} - ${1}}{${6}} = ${q(13, 3)}`}.`),
    { kind: 'pitfall', claim: t`After substituting, keep the old limits.`, counterexample: t`${math`\int_{${0}}^{${1}} ${2}x(x^{${2}} + ${1})\,dx`} with ${math`u = x^{${2}} + ${1}`} is ${math`\int_{${1}}^{${2}} u\,du = ${q(3, 2)}`}; keeping the limits ${0} and ${1} would give ${math`\int_{${0}}^{${1}} u\,du = ${q(1, 2)}`}, wrong.` },
    { kind: 'pitfall', claim: t`Replace ${math`x`} by ${math`g(u)`} and leave ${math`dx`} as ${math`du`}.`, counterexample: t`With ${math`x = ${2}u`}, ${math`\int_{${0}}^{${2}} x\,dx = ${2}`}, but ${math`\int_{${0}}^{${1}} ${2}u\,du = ${1}`}. The factor ${math`\frac{dx}{du} = ${2}`} is missing; with it the answer is ${2}.` },
    { kind: 'takeaway', text: t`Substitute ${math`x = g(u)`}: change ${math`dx`} to ${math`g'(u)\,du`} and the limits to ${math`u`} values, then integrate in ${math`u`}.` },
  ],
  examples: [
    { ...workedCambridge(arcsinQ), examiner: t`The examiner wants ${math`dx`} converted, the new limits found from ${math`\sin\theta = \frac{${1}}{${2}}`} with the range of ${math`\theta`} stated, and the square root simplified with its sign justified.` },
    worked(reverseChain, { a: 2, c: 1 }, t`A derivative hiding in the integrand`),
    worked(sqrtSub, { k: 2, t: 0 }, t`Removing a square root`),
  ],
  generators: [linear, reverseChain, sqrtSub],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['substitution'],
  cambridge: [fracQ, rootQ, tanSubQ, statsQ],
  gate: ['a25-q3-tan'],
  recall: [
    { front: t`State integration by substitution.`, back: t`${math`\int_{\alpha}^{\beta} f(g(u))g'(u)\,du = \int_{g(\alpha)}^{g(\beta)} f(x)\,dx`}.` },
    { front: t`What three things change in a substitution?`, back: t`The integrand, ${math`dx`} (to ${math`g'(u)\,du`}), and the limits.` },
  ],
  proofOrder: [{
    title: t`Why substitution works`,
    steps: [
      t`Take an antiderivative ${math`F`} of ${math`f`}.`,
      t`By the chain rule, ${math`F(g(u))`} differentiates to ${math`f(g(u))g'(u)`}.`,
      t`So the ${math`u`} integral is ${math`F(g(\beta)) - F(g(\alpha))`}.`,
      t`That is the ${math`x`} integral from ${math`g(\alpha)`} to ${math`g(\beta)`}.`,
    ],
  }],
};

