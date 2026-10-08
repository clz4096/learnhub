/**
 * prob.normal-approximation: B(n, p) is close to N(np, np(1 - p)) for large n, and Po(λ) to
 * N(λ, λ) for large λ, with a continuity correction because the discrete variable takes
 * whole values. From the STEP 2 Statistics topic notes (page 3) and STEP 2 Statistics Q1
 * (2003 S2 Q13: the zero-truncated Poisson distribution, whose last part approximates
 * P(X = 100) when λ = 100). The mean and variance parts of Q1 belong to the random variable
 * topics; only its approximation is set here. Answers are compared with the STEP 2
 * solutions and with the exact probabilities, computed in logarithms.
 */
import { auto, cite, supervision, withUses } from '../cambridge';
import { add, int, pick, q, str, type Rational } from '../math';
import { near, Phi, PhiSeries, round } from '../partv-b';
import { generator, type Misconception } from '../problem';
import { dmath, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const mX = math`X`;
const S2 = 'step-s2-stats' as const;
const HALF = q(1, 2);
const r4 = (x: number): number => round(x, 4);

/** ln n!, exactly enough for n up to a few thousand. */
const lnFact = (n: number): number => { let s = 0; for (let i = 2; i <= n; i++) s += Math.log(i); return s; };
const binomPmf = (n: number, p: number, k: number): number => Math.exp(lnFact(n) - lnFact(k) - lnFact(n - k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
const poissonPmf = (lam: number, k: number): number => Math.exp(-lam + k * Math.log(lam) - lnFact(k));

// ---------------------------------------------------------------- the continuity correction

type Rel = 'ge' | 'gt' | 'le' | 'lt';
interface CcP { rel: Rel; k: number; dist: number }
const DISTS: readonly { tex: () => ReturnType<typeof math>; mean: number }[] = [
  { tex: () => math`B(${100}, ${q(1, 2)})`, mean: 50 },
  { tex: () => math`B(${80}, ${q(1, 4)})`, mean: 20 },
  { tex: () => math`\mathrm{Po}(${36})`, mean: 36 },
  { tex: () => math`\mathrm{Po}(${100})`, mean: 100 },
  { tex: () => math`B(${200}, ${q(3, 10)})`, mean: 60 },
];
const ccCut = ({ rel, k }: CcP): Rational => (rel === 'ge' || rel === 'lt' ? add(q(k), q(-1, 2)) : add(q(k), HALF));
const relTex = (rel: Rel): string => ({ ge: '\\ge', gt: '>', le: '\\le', lt: '<' })[rel];

const continuityCorrection = generator<CcP>({
  id: 'continuity-correction',
  skill: 'Turn an event about a whole-number variable into one about the approximating normal Y, moving the cut-off half a unit so that every whole value it includes is covered.',
  params: (rng) => {
    const dist = int(rng, 0, DISTS.length - 1);
    const mean = (DISTS[dist] as { mean: number }).mean;
    return { rel: pick(rng, ['ge', 'gt', 'le', 'lt'] as const), k: mean + int(rng, -8, 8), dist };
  },
  sane: ({ k }) => (k > 0 ? null : 'out of range'),
  problem: (p) => {
    const d = DISTS[p.dist] as (typeof DISTS)[number];
    const c = ccCut(p);
    const up = p.rel === 'ge' || p.rel === 'gt';
    const values = p.rel === 'ge' ? t`${p.k}, ${p.k + 1}, and so on` : p.rel === 'gt' ? t`${p.k + 1}, ${p.k + 2}, and so on` : p.rel === 'le' ? t`${p.k}, ${p.k - 1}, and down` : t`${p.k - 1}, ${p.k - 2}, and down`;
    const edge = p.rel === 'ge' || p.rel === 'le' ? p.k : p.rel === 'gt' ? p.k + 1 : p.k - 1;
    return {
      prompt: t`${math`X \sim ${d.tex()}`} is approximated by a normal variable ${math`Y`} with the same mean and variance. With a continuity correction, ${math`P(X ${relTex(p.rel)} ${p.k})`} is approximated by ${math`P(Y ${up ? '>' : '<'} c)`}. Find ${math`c`}.`,
      answer: { kind: 'exact', expected: str(c) },
      solution: [
        t`${math`X ${relTex(p.rel)} ${p.k}`} means ${mX} is ${values}. Each whole value ${math`j`} stands for the interval from ${math`j - \tfrac{${1}}{${2}}`} to ${math`j + \tfrac{${1}}{${2}}`} under the normal curve.`,
        t`The last value included is ${edge}, so the cut-off is the ${up ? t`lower` : t`upper`} edge of its interval: ${math`c = ${edge} ${up ? '-' : '+'} \tfrac{${1}}{${2}} = ${c}`}.`,
      ],
    };
  },
  solve: (p) => {
    // The half-way point between the last whole value in the event and the first one outside it.
    const inside = (j: number): boolean => (p.rel === 'ge' ? j >= p.k : p.rel === 'gt' ? j > p.k : p.rel === 'le' ? j <= p.k : j < p.k);
    for (let j = p.k - 3; j <= p.k + 3; j++) if (inside(j) !== inside(j + 1)) return str(q(2 * j + 1, 2));
    return 'none';
  },
  misconceptions: (p): Misconception[] => {
    const c = ccCut(p);
    const other = Number(c.num) / Number(c.den) > p.k ? add(q(p.k), q(-1, 2)) : add(q(p.k), HALF);
    return [
      { response: String(p.k), why: t`Without the correction, the cut-off sits on a whole value, which covers only half of its interval. Move it half a unit.` },
      { response: str(other), why: t`Move the cut-off the other way: ${math`X ${relTex(p.rel)} ${p.k}`} ${p.rel === 'ge' || p.rel === 'le' ? t`includes` : t`excludes`} ${p.k}, so ${p.rel === 'ge' || p.rel === 'le' ? t`its whole interval belongs in the event` : t`none of its interval does`}.` },
    ];
  },
});
// ---------------------------------------------------------------- binomial by normal

interface BinP { n: number; p: Rational; k: number; up: boolean }
const BN: readonly { n: number; p: Rational }[] = [
  { n: 100, p: q(1, 2) }, { n: 50, p: q(1, 2) }, { n: 400, p: q(1, 2) }, { n: 100, p: q(1, 5) }, { n: 75, p: q(1, 3) }, { n: 150, p: q(2, 5) }, { n: 200, p: q(1, 4) }, { n: 60, p: q(3, 10) },
];
const binApprox = (b: BinP, shift = 0.5, sdOf: (m: number, v: number) => number = (_m, v) => Math.sqrt(v)): number => {
  const p = Number(b.p.num) / Number(b.p.den);
  const mean = b.n * p;
  const sd = sdOf(mean, mean * (1 - p));
  return b.up ? 1 - Phi((b.k - shift - mean) / sd) : Phi((b.k + shift - mean) / sd);
};

const binomialNormal = generator<BinP>({
  id: 'binomial-normal',
  skill: 'Approximate a binomial probability by N(np, np(1 - p)) with a continuity correction.',
  params: (rng) => {
    const b = pick(rng, BN);
    const p = Number(b.p.num) / Number(b.p.den);
    const sd = Math.sqrt(b.n * p * (1 - p));
    const k = Math.round(b.n * p + sd * (int(rng, -15, 15) / 10));
    return { n: b.n, p: b.p, k, up: rng() < 0.5 };
  },
  sane: (b) => (b.k > 0 && b.k < b.n ? null : 'out of range'),
  problem: (b) => {
    const p = Number(b.p.num) / Number(b.p.den);
    const mean = b.n * p;
    const v = mean * (1 - p);
    const cut = b.up ? b.k - 0.5 : b.k + 0.5;
    const z = (cut - mean) / Math.sqrt(v);
    const approx = binApprox(b);
    let exact = 0;
    for (let j = 0; j <= b.n; j++) if (b.up ? j >= b.k : j <= b.k) exact += binomPmf(b.n, p, j);
    return {
      prompt: t`${math`X \sim B(${b.n}, ${b.p})`}. Use a normal approximation with a continuity correction to estimate ${math`P(X ${b.up ? '\\ge' : '\\le'} ${b.k})`}, to four decimal places.`,
      answer: { kind: 'numeric', expected: r4(approx), absTol: 0.002, relTol: 0 },
      solution: [
        t`${math`np = ${mean}`} and ${math`np(${1} - p) = ${v}`}, so ${math`X`} is approximately ${math`Y \sim N(${mean}, ${v})`}, standard deviation ${math`\sqrt{${v}} \approx ${r4(Math.sqrt(v))}`}.`,
        t`With the correction, ${math`P(X ${b.up ? '\\ge' : '\\le'} ${b.k}) \approx P(Y ${b.up ? '>' : '<'} ${cut})`}. Standardise: ${math`z = \frac{${cut} - ${mean}}{${r4(Math.sqrt(v))}} \approx ${r4(z)}`}, and the probability is about ${r4(approx)}.`,
        t`The exact binomial value is ${r4(exact)}.`,
      ],
    };
  },
  solve: (b) => {
    const p = Number(b.p.num) / Number(b.p.den);
    const mean = b.n * p;
    const z = ((b.up ? b.k - 0.5 : b.k + 0.5) - mean) / Math.sqrt(mean * (1 - p));
    return String(r4(b.up ? 1 - PhiSeries(z) : PhiSeries(z)));
  },
  misconceptions: (b): Misconception[] => [
    { response: String(r4(binApprox(b, 0))), why: t`That leaves out the continuity correction: ${b.k} itself stands for an interval of width ${1}, so move the cut-off half a unit to include all of it.` },
    { response: String(r4(binApprox(b, -0.5))), why: t`The correction goes the other way: ${math`X ${b.up ? '\\ge' : '\\le'} ${b.k}`} includes ${b.k}, so the cut-off is ${b.up ? t`below` : t`above`} it.` },
    { response: String(r4(binApprox(b, 0.5, (m) => Math.sqrt(m)))), why: t`The variance of ${math`B(n, p)`} is ${math`np(${1} - p)`}, not ${math`np`}.` },
    { response: String(r4(1 - binApprox(b))), why: t`That is the complementary event. Check which side of the cut-off ${mX} has to be.` },
  ],
});

// ---------------------------------------------------------------- Poisson by normal

interface PoiP { lam: number; k: number; exactly: boolean }
const LAMS: readonly number[] = [25, 36, 49, 64, 81, 100, 144];
const poiApprox = (p: PoiP, sd = Math.sqrt(p.lam), cc = 0.5): number =>
  (p.exactly ? Phi((p.k + cc - p.lam) / sd) - Phi((p.k - cc - p.lam) / sd) : Phi((p.k + cc - p.lam) / sd));

const poissonNormal = generator<PoiP>({
  id: 'poisson-normal',
  skill: 'Approximate a Poisson probability by N(λ, λ), with a continuity correction; for one value, use the interval of width 1 around it.',
  params: (rng) => {
    const lam = pick(rng, LAMS);
    const sd = Math.sqrt(lam);
    return { lam, k: lam + Math.round(sd * (int(rng, -12, 12) / 10)), exactly: rng() < 0.5 };
  },
  sane: (p) => (p.k > 0 ? null : 'out of range'),
  problem: (p) => {
    const sd = Math.sqrt(p.lam);
    const v = poiApprox(p);
    const exact = p.exactly ? poissonPmf(p.lam, p.k) : Array.from({ length: p.k + 1 }, (_, j) => poissonPmf(p.lam, j)).reduce((a, b) => a + b, 0);
    const lo = p.k - 0.5;
    const hi = p.k + 0.5;
    return {
      prompt: t`${math`X \sim \mathrm{Po}(${p.lam})`}. Use a normal approximation with a continuity correction to estimate ${p.exactly ? math`P(X = ${p.k})` : math`P(X \le ${p.k})`}, to four decimal places.`,
      answer: { kind: 'numeric', expected: r4(v), absTol: p.exactly ? 0.0006 : 0.002, relTol: 0 },
      solution: [
        t`A Poisson variable has mean and variance ${math`\lambda = ${p.lam}`}, so ${mX} is approximately ${math`Y \sim N(${p.lam}, ${p.lam})`}, standard deviation ${sd}.`,
        p.exactly
          ? t`${math`P(X = ${p.k}) \approx P(${lo} < Y < ${hi}) = \Phi\left(\frac{${hi} - ${p.lam}}{${sd}}\right) - \Phi\left(\frac{${lo} - ${p.lam}}{${sd}}\right) \approx ${r4(v)}`}.`
          : t`${math`P(X \le ${p.k}) \approx P(Y < ${hi}) = \Phi\left(\frac{${hi} - ${p.lam}}{${sd}}\right) \approx ${r4(v)}`}.`,
        t`The exact Poisson value is ${r4(exact)}.`,
      ],
    };
  },
  solve: (p) => {
    const sd = Math.sqrt(p.lam);
    const v = p.exactly ? PhiSeries((p.k + 0.5 - p.lam) / sd) - PhiSeries((p.k - 0.5 - p.lam) / sd) : PhiSeries((p.k + 0.5 - p.lam) / sd);
    return String(r4(v));
  },
  misconceptions: (p): Misconception[] => {
    const out: Misconception[] = [
      { response: String(r4(poiApprox(p, p.lam))), why: t`The variance of ${math`\mathrm{Po}(\lambda)`} is ${math`\lambda`}, so the standard deviation is ${math`\sqrt{${p.lam}} = ${Math.sqrt(p.lam)}`}, not ${p.lam}.` },
    ];
    if (p.exactly) {
      out.push({ response: '0', why: t`A normal variable takes any single value with probability ${0}. The continuity correction gives ${p.k} the interval from ${p.k - 0.5} to ${p.k + 0.5}.` });
      out.push({ response: String(r4(Phi((p.k + 0.5 - p.lam) / Math.sqrt(p.lam)))), why: t`That is ${math`P(X \le ${p.k})`}. For exactly ${p.k}, subtract the area below ${p.k - 0.5}.` });
    } else {
      out.push({ response: String(r4(poiApprox(p, Math.sqrt(p.lam), 0))), why: t`That leaves out the continuity correction: include the whole interval for ${p.k}, up to ${p.k + 0.5}.` });
      out.push({ response: String(r4(1 - poiApprox(p))), why: t`That is ${math`P(X > ${p.k})`}. The event is the values up to ${p.k}.` });
    }
    return out;
  },
});

// ---------------------------------------------------------------- Cambridge problems

// STEP 2 Q1: the zero-truncated Poisson with λ = 100: P(X = 100) ≈ 2Φ(0.05) - 1.
const truncatedPmf = (lam: number, k: number): number => poissonPmf(lam, k) / (1 - Math.exp(-lam));
const q1 = auto({
  id: 's2-q1-normal',
  source: cite(S2, 'Q1'),
  title: t`A truncated Poisson probability, by a normal approximation`,
  prompt: t`${mX} takes the values ${math`k = ${1}, ${2}, ${3}, \ldots`} with ${math`P(X = k) = A\frac{\lambda^{k}e^{-\lambda}}{k!}`}, where ${math`A = (${1} - e^{-\lambda})^{-${1}}`}. Use a normal approximation to find ${math`P(X = \lambda)`} when ${math`\lambda = ${100}`}, to two decimal places.`,
  answer: { kind: 'numeric', expected: 0.04, absTol: 0.0051, relTol: 0 },
  solution: [
    t`With ${math`\lambda = ${100}`}, ${math`e^{-${100}}`} is negligible, so ${math`A \approx ${1}`} and ${mX} is, for all practical purposes, ${math`\mathrm{Po}(${100})`}: mean ${100}, variance ${100}.`,
    t`Approximate by ${math`Y \sim N(${100}, ${100})`}, standard deviation ${10}. With a continuity correction, ${math`P(X = ${100}) \approx P(${99.5} < Y < ${100.5}) = P(-${0.05} < Z < ${0.05}) = ${2}\Phi(${0.05}) - ${1} \approx ${r4(2 * Phi(0.05) - 1)}`}.`,
    t`So ${math`P(X = ${100}) \approx ${0.04}`} to two decimal places. The exact value is ${r4(truncatedPmf(100, 100))}.`,
  ],
  reference: '0.04',
  verify: () => near('the normal approximation, to 2 dp', round(2 * PhiSeries(0.05) - 1, 2), 0.04, 1e-12)
    ?? near('the exact truncated Poisson value, to 2 dp', round(truncatedPmf(100, 100), 2), 0.04, 1e-12),
  misconceptions: [
    { response: '0', why: t`Without the continuity correction, a single value of a normal variable has probability ${0}. The value ${100} stands for the interval from ${99.5} to ${100.5}.` },
    { response: String(round(2 * Phi(0.005) - 1, 3)), why: t`The variance is ${100}, so the standard deviation is ${10}, not ${100}.` },
  ],
  official: { source: cite('step-s2-stats-solutions', 'Q1'), answer: '0.04', agrees: true },
});

const q1adapted = auto({
  id: 's2-q1-normal-25',
  source: cite(S2, 'Q1', true),
  title: t`The same approximation with ${math`\lambda = ${25}`}`,
  prompt: t`For the same truncated Poisson variable with ${math`\lambda = ${25}`}, use a normal approximation with a continuity correction to estimate ${math`P(X = ${25})`}, to three decimal places.`,
  answer: { kind: 'numeric', expected: round(2 * Phi(0.1) - 1, 3), absTol: 0.0011, relTol: 0 },
  solution: [
    t`${math`e^{-${25}}`} is still negligible, so ${math`A \approx ${1}`} and ${mX} is approximately ${math`N(${25}, ${25})`}, standard deviation ${5}.`,
    t`${math`P(X = ${25}) \approx P(${24.5} < Y < ${25.5}) = P(-${0.1} < Z < ${0.1}) = ${2}\Phi(${0.1}) - ${1} \approx ${round(2 * Phi(0.1) - 1, 4)}`}. The exact value is ${r4(truncatedPmf(25, 25))}: the approximation is good to about ${1}%.`,
    t`For one value of a discrete variable, take the normal area from half below it to half above.`,
  ],
  reference: String(round(2 * PhiSeries(0.1) - 1, 3)),
  verify: () => near('normal approximation against the exact truncated Poisson value', 2 * PhiSeries(0.1) - 1, truncatedPmf(25, 25), 0.002),
  misconceptions: [
    { response: String(round(2 * Phi(0.02) - 1, 3)), why: t`The standard deviation is ${math`\sqrt{${25}} = ${5}`}, not ${25}.` },
    { response: String(round(Phi(0.1), 3)), why: t`That is ${math`P(Y < ${25.5})`}. For one value, subtract the area below ${24.5}.` },
  ],
  nudge: t`Not quite. A single value of a discrete variable becomes an interval of width ${1} under the continuity correction.`,
  hints: [
    t`What are the mean and the standard deviation of the approximating normal distribution?`,
    t`With the continuity correction, which interval of the normal variable stands for ${math`X = ${25}`}?`,
    t`What are the ends of that interval in standard units, and what is the probability between them?`,
  ],
});

const q1why = supervision({
  id: 's2-q1-why',
  source: cite(S2, 'Q1'),
  title: t`Why the approximation is allowed`,
  prompt: t`In Q${1} with ${math`\lambda = ${100}`}, explain why ${mX} may be treated as ${math`\mathrm{Po}(${100})`}, why that is close to ${math`N(${100}, ${100})`}, and why the continuity correction is needed to get a nonzero answer for ${math`P(X = ${100})`}.`,
  writeUp: 'explanation',
  official: cite('step-s2-stats-solutions', 'Q1'),
  hints: [
    t`How large is ${math`e^{-${100}}`}, and what does that say about the effect of the truncation?`,
    t`Which theorem makes ${math`\mathrm{Po}(${100})`}, a sum of many independent Poisson variables, close to normal?`,
    t`What is ${math`P(Y = ${100})`} for a continuous ${math`Y`}, and which interval replaces it?`,
  ],
});

// ---------------------------------------------------------------- lesson

const EXB: BinP = { n: 100, p: q(1, 2), k: 55, up: false };
const exApprox = binApprox(EXB);
const exExact = Array.from({ length: 56 }, (_, j) => binomPmf(100, 0.5, j)).reduce((a, b) => a + b, 0);
const exNoCc = binApprox(EXB, 0);
const one50 = binomPmf(100, 0.5, 50);
const one50Approx = 2 * Phi(0.1) - 1;

export const normalApproximation: TopicContent = {
  topicId: 'prob.normal-approximation',
  goal: t`Approximate binomial and Poisson probabilities by a normal distribution with the same mean and variance, with a continuity correction.`,
  objective: t`Approximate binomial and Poisson probabilities by a normal curve, with a continuity correction.`,
  why: t`Exact sums of hundreds of terms become one table lookup; it is the first glimpse of the central limit theorem.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`A bell from coin tosses` },
    { kind: 'hook', text: t`Toss a fair coin ${100} times. The chance of at most ${55} heads is a sum of ${56} binomial terms, each with factorials of numbers near ${100}. Yet a bar chart of the binomial probabilities looks almost exactly like a bell curve. If you can read the area under the bell, you can skip the sum, and be right to two decimal places.` },
    { kind: 'narrative', text: t`The idea is to replace a discrete distribution by the normal distribution with the same mean and variance. Two things need care: when the replacement is good, and how to turn "at most ${55}", a statement about whole numbers, into a statement about a continuous variable.` },

    { kind: 'section', title: t`Match the mean and variance` },
    { kind: 'theorem', name: t`Normal approximations`, statement: t`If ${math`X \sim B(n, p)`} with ${math`p`} fixed, then for every real ${math`z`}, ${math`P\left(\frac{X - np}{\sqrt{np(${1} - p)}} \le z\right) \to \Phi(z)`} as ${math`n \to \infty`}. Likewise if ${math`X \sim \mathrm{Po}(\lambda)`}, ${math`P\left(\frac{X - \lambda}{\sqrt{\lambda}} \le z\right) \to \Phi(z)`} as ${math`\lambda \to \infty`}.` },
    { kind: 'p', text: t`In plain words: for large ${math`n`}, ${math`B(n, p)`} behaves like ${math`N(np,\ np(${1} - p))`}, and for large ${math`\lambda`}, ${math`\mathrm{Po}(\lambda)`} behaves like ${math`N(\lambda, \lambda)`}. Both match the mean and the variance. The proof is the central limit theorem, later in the course: a binomial count is a sum of ${math`n`} independent trials.`, why: { q: t`How large is large?`, a: t`The STEP ${2} notes' rule of thumb: the binomial needs ${math`n`} large, and works best with ${math`p`} near ${q(1, 2)}, where the distribution is symmetric; the Poisson needs ${math`\lambda`} large. A common working rule is ${math`np`} and ${math`n(${1} - p)`} both above about ${5}.` } },

    { kind: 'section', title: t`The continuity correction` },
    { kind: 'narrative', text: t`A binomial variable takes only whole values. On a bar chart, the bar for the value ${math`j`} has width ${1} and stands over the interval from ${math`j - \tfrac{${1}}{${2}}`} to ${math`j + \tfrac{${1}}{${2}}`}. The normal curve should match the area of those bars, so each whole value ${math`j`} becomes that interval.` },
    { kind: 'definition', name: t`Continuity correction`, formal: t`When a whole-number variable ${mX} is approximated by a continuous ${math`Y`}, the event ${math`X = j`} is replaced by ${math`j - \tfrac{${1}}{${2}} < Y < j + \tfrac{${1}}{${2}}`}, and so ${math`X \le k`} by ${math`Y < k + \tfrac{${1}}{${2}}`} and ${math`X \ge k`} by ${math`Y > k - \tfrac{${1}}{${2}}`}.`, plain: t`This is the [[continuity-correction|continuity correction]]: move each cut-off half a unit outwards, so that every whole value the event includes is covered completely.` },
    {
      kind: 'table', caption: t`Continuity corrections, with ${math`Y`} the approximating normal`, head: [t`Event about ${mX}`, t`Event about ${math`Y`}`],
      rows: [
        [t`${math`X = k`}`, t`${math`k - \tfrac{${1}}{${2}} < Y < k + \tfrac{${1}}{${2}}`}`],
        [t`${math`X \le k`}`, t`${math`Y < k + \tfrac{${1}}{${2}}`}`],
        [t`${math`X < k`}`, t`${math`Y < k - \tfrac{${1}}{${2}}`}`],
        [t`${math`X \ge k`}`, t`${math`Y > k - \tfrac{${1}}{${2}}`}`],
        [t`${math`X > k`}`, t`${math`Y > k + \tfrac{${1}}{${2}}`}`],
      ],
    },
    { kind: 'p', text: t`Strict inequalities first become non-strict ones: ${math`X < k`} is the same event as ${math`X \le k - ${1}`}, so its cut-off is ${math`k - ${1} + \tfrac{${1}}{${2}} = k - \tfrac{${1}}{${2}}`}.` },
    checkFrom(continuityCorrection, { rel: 'gt', k: 40, dist: 2 }, t`${math`X > ${40}`} starts at ${41}, whose bar starts at ${40.5}.`),

    { kind: 'section', title: t`Working it through` },
    {
      kind: 'steps',
      steps: [
        { label: t`The approximating normal`, text: t`${math`X \sim B(${100}, ${q(1, 2)})`} has mean ${math`${100} \times ${q(1, 2)} = ${50}`} and variance ${math`${100} \times ${q(1, 2)} \times ${q(1, 2)} = ${25}`}. So use ${math`Y \sim N(${50}, ${25})`}, standard deviation ${5}.` },
        { label: t`Correct for continuity`, text: t`${math`P(X \le ${55}) \approx P(Y < ${55.5})`}.` },
        { label: t`Standardise`, text: t`${math`Z = \frac{Y - ${50}}{${5}}`} is standard normal, and ${math`Y < ${55.5}`} exactly when ${math`Z < \frac{${5.5}}{${5}} = ${1.1}`}.`, eq: [dmath`P(X \le ${55}) \approx \Phi(${1.1}) \approx ${r4(exApprox)}.`] },
        { label: t`Compare`, text: t`The exact binomial sum is ${r4(exExact)}. Without the correction, ${math`\Phi(${1})`} gives ${r4(exNoCc)}, much further off.` },
      ],
    },
    { kind: 'p', text: t`A single value needs the correction most: a continuous ${math`Y`} gives any single point probability ${0}. For ${math`P(X = ${50})`}: ${math`P(${49.5} < Y < ${50.5}) = ${2}\Phi(${0.1}) - ${1} \approx ${r4(one50Approx)}`}, against the exact ${r4(one50)}.` },
    checkFrom(poissonNormal, { lam: 36, k: 42, exactly: false }, t`${math`Y \sim N(${36}, ${36})`}, standard deviation ${6}: ${math`P(Y < ${42.5}) = \Phi\left(\frac{${6.5}}{${6}}\right)`}.`),

    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${math`P(X = k)`} for a binomial can be read from a normal approximation without a correction.`, counterexample: t`Without the half-unit interval, ${math`P(Y = ${50}) = ${0}`}, but ${math`P(X = ${50}) \approx ${r4(one50)}`} for ${math`B(${100}, ${q(1, 2)})`}.` },
    { kind: 'pitfall', claim: t`${math`N(np,\ np(${1} - p))`} has standard deviation ${math`np(${1} - p)`}.`, counterexample: t`For ${math`B(${100}, ${q(1, 2)})`}, the variance is ${25} and the standard deviation is ${5}. Standardising with ${25} would give ${math`\Phi(${0.22})`} for ${math`P(X \le ${55})`}, far from ${r4(exExact)}.` },
    { kind: 'pitfall', claim: t`The approximation is good for any ${math`n`} that looks large.`, counterexample: t`${math`B(${100}, ${q(1, 100)})`} has mean ${1}, so ${math`P(X = ${0}) = \left(\tfrac{${99}}{${100}}\right)^{${100}} \approx ${r4(binomPmf(100, 0.01, 0))}`}, while the normal approximation gives ${math`\Phi\left(\tfrac{${0.5} - ${1}}{\sqrt{${0.99}}}\right) \approx ${r4(Phi(-0.5 / Math.sqrt(0.99)))}`}. A skewed binomial needs a Poisson approximation instead.` },
    { kind: 'takeaway', text: t`Replace the count by a normal with the same mean and variance, and widen every whole value to an interval of width ${1} before reading the area.` },
  ],
  examples: [
    { ...workedCambridge(q1), examiner: t`The examiner looks for the reason ${math`A \approx ${1}`}, the variance ${100} with standard deviation ${10}, and the interval from ${99.5} to ${100.5}.` },
    worked(continuityCorrection, { rel: 'lt', k: 30, dist: 2 }, t`A strict inequality`),
    worked(binomialNormal, { n: 100, p: q(1, 2), k: 55, up: false }, t`At most ${55} heads in ${100} tosses`),
  ],
  generators: [continuityCorrection, binomialNormal, poissonNormal],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['continuity-correction'],
  cambridge: withUses([q1adapted, q1why], {
    's2-q1-why': { sections: ['Match the mean and variance', 'The continuity correction'], note: t`Why the normal approximation and its correction apply` },
    's2-q1-normal-25': { sections: ['The continuity correction', 'Working it through'], note: t`A point probability by a normal approximation with correction` },
  }),
  // The explanation the STEP solution asks for, then the computation with a new lambda.
  gate: ['s2-q1-why', 's2-q1-normal-25'],
  recall: [
    { front: t`The normal approximation to ${math`B(n, p)`} and to ${math`\mathrm{Po}(\lambda)`}.`, back: t`${math`N(np,\ np(${1} - p))`} and ${math`N(\lambda, \lambda)`}: same mean, same variance.` },
    { front: t`The continuity correction for ${math`X \le k`} and for ${math`X = k`}.`, back: t`${math`Y < k + \tfrac{${1}}{${2}}`}; and ${math`k - \tfrac{${1}}{${2}} < Y < k + \tfrac{${1}}{${2}}`}.` },
  ],
};
