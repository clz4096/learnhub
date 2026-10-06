/**
 * calc.improper-integrals: integrals over [a, infinity) as limits of integrals over [a, R];
 * convergence of the integral of x^(-p) exactly when p > 1; the integral of e^(-kx); and
 * x^n e^(-x) to n!. The Cambridge problems are STEP 2 Statistics Q4 (2012 S2 Q13, the
 * distance to the nearest supermarket), whose official answers E(Y) = 1/(2 sqrt k) and
 * Var(Y) = (4 - pi)/(4 pi k) are compared in the content checks, and the NST Mathematics
 * Workbook, I2(i) and IN2. The gate is STEP II 2016 Q8 (the sum of 1/r^2 from the area under
 * 1/x^2), from the STEP Questions Database. The STEP 2 specification: "Evaluate improper integrals where ...
 * the range of integration extends to infinity."
 */
import { auto, cite, supervision } from '../cambridge';
import { add, int, pick, q, str, type Rational } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { apart, close, fn, simpson } from '../prep-c';
import { dmath, math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const S2 = 'step-s2-stats' as const;
const S2S = 'step-s2-stats-solutions' as const;
const NST = 'nst-workbook' as const;
const KDOM = { k: { kind: 'real' as const, min: 0.2, max: 5 } };

// ---------------------------------------------------------------- the tail of a power

interface PowP { c: number; p: number; a: number }
const powVal = ({ c, p, a }: PowP): Rational => q(c, (p - 1) * a ** (p - 1));
const powMis = ({ c, p, a }: PowP): Rational[] => [q(-c, (p - 1) * a ** (p - 1)), q(c, p * a ** p)];
const powerTail = generator<PowP>({
  id: 'power-tail',
  skill: 'Evaluate the integral of c/x^p from a to infinity as a limit: c a^(1-p)/(p - 1) for p > 1.',
  params: (rng) => {
    for (;;) {
      const g: PowP = { c: pick(rng, [1, 2, 3, 6]), p: pick(rng, [2, 3, 4]), a: pick(rng, [1, 2, 3]) };
      if (new Set([str(powVal(g)), ...powMis(g).map(str)]).size === 3) return g;
    }
  },
  sane: ({ p }) => (p > 1 ? null : 'diverges'),
  problem: (g) => ({
    prompt: t`Evaluate ${math`\int_{${g.a}}^{\infty} \frac{${g.c}}{x^{${g.p}}}\,dx`}.`,
    answer: { kind: 'exact', expected: str(powVal(g)) },
    solution: [
      t`For ${math`R > ${g.a}`}: ${math`\int_{${g.a}}^{R} ${g.c}x^{-${g.p}}\,dx = \left[\frac{${g.c}x^{-${g.p - 1}}}{-${g.p - 1}}\right]_{${g.a}}^{R} = \frac{${g.c}}{${g.p - 1}}\left(\frac{${1}}{${g.a}^{${g.p - 1}}} - \frac{${1}}{R^{${g.p - 1}}}\right)`}.`,
      t`As ${math`R \to \infty`}, ${math`\frac{${1}}{R^{${g.p - 1}}} \to ${0}`}, so the integral converges to ${powVal(g)}.`,
    ],
  }),
  // Substitute x = a/u to get a finite range: the integral of c u^(p-2)/a^(p-1) over [0, 1], by Simpson's rule.
  solve: (g) => str(q(Math.round(simpson((u) => (g.c * u ** (g.p - 2)) / g.a ** (g.p - 1), 0, 1, 2) * 648), 648)),
  misconceptions: (g): Misconception[] => {
    const [m1, m2] = powMis(g);
    return [
      { response: str(m1 as Rational), why: t`The integrand is positive, so the answer must be. The antiderivative ${math`\frac{x^{${1} - p}}{${1} - p}`} is negative, and subtracting its value at ${math`a`} makes the result positive.` },
      { response: str(m2 as Rational), why: t`Raise the power by one: ${math`x^{-p}`} integrates to ${math`\frac{x^{-p + ${1}}}{-p + ${1}}`}, not ${math`\frac{x^{-p}}{p}`}.` },
    ];
  },
});

// ---------------------------------------------------------------- the tail of an exponential

interface ExpP { k: number; a: number }
const expText = ({ k, a }: ExpP): string => (a === 0 ? `1/${k}` : `e^(${-k * a})/${k}`);
const expTail = generator<ExpP>({
  id: 'exponential-tail',
  skill: 'Evaluate the integral of e^(-kx) from a to infinity: e^(-ka)/k, because e^(-kR) tends to 0.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const g: ExpP = { k: pick(rng, [1, 2, 3, 4]), a: int(rng, 0, 2) };
      if (!(g.k === 1 && g.a === 0)) return g;
    }
  },
  sane: ({ k }) => (k > 0 ? null : 'diverges'),
  problem: (g) => ({
    prompt: t`Evaluate ${math`\int_{${g.a}}^{\infty} e^{-${g.k === 1 ? '' : g.k}x}\,dx`} exactly.`,
    answer: { kind: 'expression', expected: expText(g), variables: [] },
    solution: [
      t`${math`\int_{${g.a}}^{R} e^{-${g.k}x}\,dx = \left[-\frac{e^{-${g.k}x}}{${g.k}}\right]_{${g.a}}^{R} = \frac{e^{-${g.k * g.a}} - e^{-${g.k}R}}{${g.k}}`}.`,
      t`As ${math`R \to \infty`}, ${math`e^{-${g.k}R} \to ${0}`}, so the integral is ${math`\frac{e^{-${g.k * g.a}}}{${g.k}}`}${g.a === 0 ? t`, that is ${math`\frac{${1}}{${g.k}}`}` : t``}.`,
    ],
  }),
  solve: (g) => String(simpson((x) => Math.exp(-g.k * x), g.a, g.a + 60 / g.k, 20000)),
  misconceptions: (g): Misconception[] => {
    const pool: Misconception[] = [
      { response: `-${expText(g)}`, why: t`A positive integrand gives a positive integral: ${math`\left[-\frac{e^{-kx}}{k}\right]_{a}^{R} = \frac{e^{-ka} - e^{-kR}}{k}`}.` },
      { response: `e^(${-g.k * g.a})`, why: t`The antiderivative of ${math`e^{-kx}`} is ${math`-\frac{e^{-kx}}{k}`}: divide by ${math`k`}.` },
      { response: `${g.k}*e^(${-g.k * g.a})`, why: t`Divide by ${math`k`}, do not multiply.` },
      { response: `1/${g.k}`, why: t`The range starts at ${math`x = ${g.a}`}, not ${0}: the lower limit gives ${math`e^{-${g.k * g.a}}`}, not ${1}.` },
    ];
    const right = fn(expText(g), [])();
    const out: Misconception[] = [];
    for (const m of pool) {
      const v = fn(m.response as string, [])();
      if (apart(v, right) && out.every((o) => apart(fn(o.response as string, [])(), v))) out.push(m);
    }
    return out.slice(0, 2);
  },
});

// ---------------------------------------------------------------- converge or diverge?

type Verdict = 'converges' | 'diverges-small' | 'diverges-big';
interface ConvP { p: Rational }
const OPTS: readonly ChoiceOption[] = [
  { id: 'converges', label: t`It converges.` },
  { id: 'diverges-small', label: t`It diverges, even though the integrand tends to ${0}.` },
  { id: 'diverges-big', label: t`It diverges, and the integrand does not tend to ${0}.` },
];
const verdict = ({ p }: ConvP): Verdict => {
  const v = Number(p.num) / Number(p.den);
  return v < -1 ? 'converges' : v < 0 ? 'diverges-small' : 'diverges-big';
};
const converge = generator<ConvP>({
  id: 'converge-or-diverge',
  skill: 'Decide whether the integral of x^p over [1, infinity) converges: exactly when p < -1.',
  params: (rng) => ({ p: pick(rng, [q(-3), q(-2), q(-3, 2), q(-1), q(-1, 2), q(0), q(1), q(-4)]) }),
  sane: () => null,
  problem: (g) => {
    const v = verdict(g);
    const show: Rich = str(g.p) === '0' ? t`${math`${1}`}` : str(g.p) === '1' ? t`${math`x`}` : t`${math`x^{${g.p}}`}`;
    return {
      prompt: t`Does ${math`\int_{${1}}^{\infty}`} ${show} ${math`\,dx`} converge?`,
      answer: { kind: 'choice', options: OPTS, correct: v },
      solution: v === 'converges'
        ? [t`Write the integrand as ${math`x^{-s}`} with ${math`s = ${q(-g.p.num, g.p.den)} > ${1}`}. Then ${math`\int_{${1}}^{R} x^{-s}\,dx = \frac{${1} - R^{${1} - s}}{s - ${1}} \to \frac{${1}}{s - ${1}}`}: it converges.`]
        : v === 'diverges-small'
          ? [t`The integrand tends to ${0}, but not fast enough: ${str(g.p) === '-1' ? t`${math`\int_{${1}}^{R} \frac{dx}{x} = \ln R \to \infty`}.` : t`${math`\int_{${1}}^{R} x^{${g.p}}\,dx`} grows like a positive power of ${math`R`}.`}`, t`So it diverges. Tending to ${0} is necessary, not sufficient.`]
          : [t`The integrand does not tend to ${0} (it is at least ${1} for ${math`x \ge ${1}`}), so the integral over ${math`[${1}, R]`} is at least ${math`R - ${1}`}, which is unbounded.`],
    };
  },
  // Compare the integral over [1, R] at two large R: a convergent one barely changes.
  solve: (g) => {
    const p = Number(g.p.num) / Number(g.p.den);
    const I = (R: number): number => (p === -1 ? Math.log(R) : (R ** (p + 1) - 1) / (p + 1));
    if (Math.abs(I(1e16) - I(1e12)) < 1e-3) return ['converges'];
    return [p < 0 ? 'diverges-small' : 'diverges-big'];
  },
  misconceptions: (g): Misconception[] => {
    const v = verdict(g);
    const why: Record<Verdict, Rich> = {
      converges: t`The tail ${math`\int_{${1}}^{R}`} has a finite limit, because the power is below ${math`-${1}`}: ${math`\frac{${1} - R^{p + ${1}}}{-(p + ${1})}`} settles down.`,
      'diverges-small': t`The integrand tends to ${0}, but the area keeps growing without bound: only powers below ${math`-${1}`} give a finite area.`,
      'diverges-big': t`The integrand does not even tend to ${0}, so the area grows at least as fast as ${math`R`}.`,
    };
    return (['converges', 'diverges-small', 'diverges-big'] as const).filter((x) => x !== v).map((x) => ({ response: [x], why: why[v] }));
  },
});

// ---------------------------------------------------------------- Cambridge problems

const meanY = auto({
  id: 's2-q4-mean',
  source: cite(S2, 'Q4', true),
  title: t`The mean distance to a supermarket`,
  prompt: t`The distance ${math`Y`} from a random point to the nearest supermarket has density ${math`f(y) = ${2}\pi ky e^{-\pi ky^{${2}}}`} for ${math`y \ge ${0}`}, where ${math`k > ${0}`}. You may assume that ${math`\int_{${0}}^{\infty} e^{-x^{${2}}/${2}}\,dx = \sqrt{\frac{\pi}{${2}}}`}. Find ${math`E(Y) = \int_{${0}}^{\infty} y f(y)\,dy`}.`,
  answer: { kind: 'expression', expected: '1/(2 sqrt(k))', variables: ['k'], domains: KDOM },
  solution: [
    t`By parts on ${math`[${0}, R]`} with ${math`u = y`} and ${math`v' = ${2}\pi kye^{-\pi ky^{${2}}}`}, so ${math`v = -e^{-\pi ky^{${2}}}`}: ${math`\int_{${0}}^{R} ${2}\pi ky^{${2}}e^{-\pi ky^{${2}}}\,dy = -Re^{-\pi kR^{${2}}} + \int_{${0}}^{R} e^{-\pi ky^{${2}}}\,dy`}.`,
    t`As ${math`R \to \infty`}, ${math`Re^{-\pi kR^{${2}}} \to ${0}`}. In the last integral put ${math`y = \frac{x}{\sqrt{${2}\pi k}}`}, so ${math`\pi ky^{${2}} = \frac{x^{${2}}}{${2}}`}: it becomes ${math`\frac{${1}}{\sqrt{${2}\pi k}}\int_{${0}}^{\infty} e^{-x^{${2}}/${2}}\,dx = \frac{${1}}{\sqrt{${2}\pi k}}\sqrt{\frac{\pi}{${2}}} = \frac{${1}}{${2}\sqrt{k}}`}.`,
  ],
  reference: '1/(2 sqrt(k))',
  verify: () => {
    for (const k of [0.5, 1, 3]) {
      const e = close(`E(Y) for k = ${k}`, simpson((y) => y * 2 * Math.PI * k * y * Math.exp(-Math.PI * k * y * y), 0, 12 / Math.sqrt(k), 20000), 1 / (2 * Math.sqrt(k)));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: '1/sqrt(k)', why: t`Keep the constants in the substitution: ${math`\frac{${1}}{\sqrt{${2}\pi k}} \cdot \sqrt{\frac{\pi}{${2}}} = \frac{${1}}{${2}\sqrt{k}}`}.` }],
  official: { source: cite(S2S, 'Q4'), answer: '1/(2 sqrt(k))', agrees: true },
});

const varY = auto({
  id: 's2-q4-variance',
  source: cite(S2, 'Q4'),
  title: t`STEP: the variance of the distance`,
  prompt: t`With ${math`f(y) = ${2}\pi ky e^{-\pi ky^{${2}}}`} for ${math`y \ge ${0}`} and ${math`E(Y) = \frac{${1}}{${2}\sqrt{k}}`}, find ${math`\operatorname{Var}(Y)`}.`,
  answer: { kind: 'expression', expected: '(4 - pi)/(4 pi k)', variables: ['k'], domains: KDOM },
  solution: [
    t`${math`E(Y^{${2}}) = \int_{${0}}^{\infty} ${2}\pi ky^{${3}}e^{-\pi ky^{${2}}}\,dy`}. Substitute ${math`u = \pi ky^{${2}}`}, ${math`du = ${2}\pi ky\,dy`}: it becomes ${math`\frac{${1}}{\pi k}\int_{${0}}^{\infty} ue^{-u}\,du = \frac{${1}}{\pi k}`}, since ${math`\int_{${0}}^{\infty} ue^{-u}\,du = ${1}`}.`,
    t`${math`\operatorname{Var}(Y) = \frac{${1}}{\pi k} - \frac{${1}}{${4}k} = \frac{${4} - \pi}{${4}\pi k}`}.`,
  ],
  reference: '1/(pi k) - 1/(4k)',
  verify: () => {
    for (const k of [0.5, 2]) {
      const top = 12 / Math.sqrt(k);
      const m2 = simpson((y) => y * y * 2 * Math.PI * k * y * Math.exp(-Math.PI * k * y * y), 0, top, 20000);
      const e = close(`Var(Y) for k = ${k}`, m2 - 1 / (4 * k), (4 - Math.PI) / (4 * Math.PI * k));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: '1/(pi k)', why: t`That is ${math`E(Y^{${2}})`}. Subtract ${math`E(Y)^{${2}} = \frac{${1}}{${4}k}`}.` }],
  official: { source: cite(S2S, 'Q4'), answer: '(4 - pi)/(4 pi k)', agrees: true },
});

const nstLimit = auto({
  id: 'nst-i2-i-limit',
  source: cite(NST, 'Integration, I2(i)', true),
  title: t`What happens as L grows`,
  prompt: t`${math`\int_{${0}}^{L} xe^{-x}\,dx = ${1} - (${1} + L)e^{-L}`}. What does it tend to as ${math`L \to \infty`}? That is, evaluate ${math`\int_{${0}}^{\infty} xe^{-x}\,dx`}.`,
  answer: { kind: 'exact', expected: '1' },
  solution: [t`${math`e^{-L} \to ${0}`} and ${math`Le^{-L} \to ${0}`}, because the exponential grows faster than any power: ${math`e^{L} \ge \frac{L^{${2}}}{${2}}`}, so ${math`Le^{-L} \le \frac{${2}}{L}`}.`, t`So the integral tends to ${1}.`],
  reference: '1',
  verify: () => close('Simpson to 60', simpson((x) => x * Math.exp(-x), 0, 60, 20000), 1),
  misconceptions: [{ response: '0', why: t`The integrand is positive, so the integral is positive; only the ${math`(${1} + L)e^{-L}`} part tends to ${0}.` }],
});

const nstIN2 = supervision({
  id: 'nst-in2',
  source: cite(NST, 'Section 2, Mathematical induction, IN2'),
  title: t`n factorial as an integral`,
  prompt: t`Use mathematical induction to prove that, for a non-negative integer ${math`n`}, ${math`\int_{${0}}^{\infty} x^{n}e^{-x}\,dx = n!`}. Justify each limit you take.`,
  writeUp: 'proof',
});

// STEP II 2016 Q8 (STEP Questions Database): the sum of 1/r^2 estimated by the area under 1/x^2.
const DB16 = 'stepdb-16-s2' as const;

/** The approximation (*) to E with the first `k` terms added exactly: sum_{r<=k} 1/r^2 + the integral of x^-2 from k + 1/2 to infinity. */
const approxE = (k: number): Rational => {
  let s = q(2, 2 * k + 1);
  for (let r = 1; r <= k; r++) s = add(s, q(1, r * r));
  return s;
};

const db16q8Approx = auto({
  id: 'step16-q8-i',
  source: cite(DB16, 'Q8(i)', true),
  title: t`The sum of the reciprocal squares, estimated`,
  prompt: t`For ${math`m > \frac{${1}}{${2}}`}, ${math`\int_{m - \frac{${1}}{${2}}}^{\infty} \frac{${1}}{x^{${2}}}\,dx = \frac{${1}}{m - \frac{${1}}{${2}}}`}, and a sketch of ${math`y = \frac{${1}}{x^{${2}}}`} shows ${math`\sum_{r = m}^{n} \frac{${1}}{r^{${2}}} \approx \int_{m - \frac{${1}}{${2}}}^{n + \frac{${1}}{${2}}} \frac{${1}}{x^{${2}}}\,dx \quad (*)`}. The series ${math`\sum_{r = ${1}}^{\infty} \frac{${1}}{r^{${2}}}`} converges to ${math`E`}. Add the terms with ${math`r = ${1}`} and ${math`r = ${2}`} exactly, and use ${math`(*)`} with ${math`n \to \infty`} for the rest. What approximation to ${math`E`} do you get? Give it as a fraction.`,
  answer: { kind: 'exact', expected: str(approxE(2)) },
  solution: [
    t`The first two terms are ${math`${1} + \frac{${1}}{${4}} = \frac{${5}}{${4}}`}.`,
    t`For the rest take ${math`m = ${3}`} in ${math`(*)`} and let ${math`n \to \infty`}: ${math`\sum_{r = ${3}}^{\infty} \frac{${1}}{r^{${2}}} \approx \int_{${q(5, 2)}}^{\infty} \frac{${1}}{x^{${2}}}\,dx = \frac{${1}}{${q(5, 2)}} = ${q(2, 5)}`}.`,
    t`So ${math`E \approx \frac{${5}}{${4}} + ${q(2, 5)} = ${approxE(2)}`}. (With no terms added exactly the same method gives ${approxE(0)}, and with one, ${approxE(1)}; the true value is ${math`\frac{\pi^{${2}}}{${6}} \approx ${1.6449}`}.)`,
  ],
  reference: str(approxE(2)),
  verify: () => {
    // The question prints the three approximations 2, 5/3, 33/20; the third is this one.
    const want = ['2', '5/3', '33/20'];
    for (let k = 0; k <= 2; k++) if (str(approxE(k)) !== want[k]) return `approximation ${k}: ${str(approxE(k))}, printed ${want[k]}`;
    // The tail estimate is close: the sum of 1/r^2 from 3 on (to 10^6, plus the rest, about 10^-6) is within 0.01 of 2/5.
    let tail = 1e-6;
    for (let r = 3; r <= 1e6; r++) tail += 1 / (r * r);
    return Math.abs(tail - 0.4) < 0.01 ? null : `tail ${tail}`;
  },
  misconceptions: [
    { response: '5/3', why: t`That adds only the first term exactly. Add ${math`r = ${1}`} and ${math`r = ${2}`}, then start the integral at ${math`${2} + \frac{${1}}{${2}}`}.` },
    { response: '19/12', why: t`The integral for the tail starts at ${math`m - \frac{${1}}{${2}}`} with ${math`m = ${3}`}, that is at ${q(5, 2)}, not at ${3}.` },
  ],
});

const db16q8 = supervision({
  id: 'step16-q8',
  source: cite(DB16, 'Q8'),
  title: t`Reciprocal squares and fourth powers`,
  prompt: t`Evaluate the integral ${dmath`\int_{m - \frac{${1}}{${2}}}^{\infty} \frac{${1}}{x^{${2}}}\,dx \qquad \left(m > \tfrac{${1}}{${2}}\right).`} Show by means of a sketch that ${dmath`\sum_{r = m}^{n} \frac{${1}}{r^{${2}}} \approx \int_{m - \frac{${1}}{${2}}}^{n + \frac{${1}}{${2}}} \frac{${1}}{x^{${2}}}\,dx, \qquad (*)`} where ${math`m`} and ${math`n`} are positive integers with ${math`m < n`}. (i) You are given that the infinite series ${math`\sum_{r = ${1}}^{\infty} \frac{${1}}{r^{${2}}}`} converges to a value denoted by ${math`E`}. Use ${math`(*)`} to obtain the following approximations for ${math`E`}: ${math`E \approx ${2}`}; ${math`E \approx \frac{${5}}{${3}}`}; ${math`E \approx \frac{${33}}{${20}}`}. (ii) Show that, when ${math`r`} is large, the error in approximating ${math`\frac{${1}}{r^{${2}}}`} by ${math`\int_{r - \frac{${1}}{${2}}}^{r + \frac{${1}}{${2}}} \frac{${1}}{x^{${2}}}\,dx`} is approximately ${math`\frac{${1}}{${4}r^{${4}}}`}. Given that ${math`E \approx ${1.645}`}, show that ${math`\sum_{r = ${1}}^{\infty} \frac{${1}}{r^{${4}}} \approx ${1.08}`}.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const RS = [10, 100, 1000];

export const improperIntegrals: TopicContent = {
  topicId: 'calc.improper-integrals',
  goal: t`Evaluate ${math`\int_{a}^{\infty} f(x)\,dx`} as the limit of ${math`\int_{a}^{R} f(x)\,dx`} as ${math`R \to \infty`}, and decide when it converges.`,
  objective: t`Integrate over an infinite range as a limit, and tell when the answer is finite.`,
  why: t`Means and variances of continuous distributions are integrals to infinity; IA Probability needs them.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`An infinitely long region` },
    { kind: 'hook', text: t`The region under ${math`y = \frac{${1}}{x^{${2}}}`} to the right of ${math`x = ${1}`} goes on forever. Can it have a finite area? It can: exactly ${1}. Yet under ${math`y = \frac{${1}}{x}`}, which also shrinks to ${0}, the area is infinite. What decides it?` },
    { kind: 'narrative', text: t`We cannot add strips all the way to infinity, but we can stop at ${math`R`} and ask what happens as ${math`R`} grows. For ${math`\frac{${1}}{x^{${2}}}`}, ${math`\int_{${1}}^{R} \frac{dx}{x^{${2}}} = ${1} - \frac{${1}}{R}`}:` },
    { kind: 'table', caption: t`Areas up to ${math`R`}`, head: [t`${math`R`}`, t`${math`\int_{${1}}^{R} x^{-${2}}\,dx`}`, t`${math`\int_{${1}}^{R} x^{-${1}}\,dx`}`], rows: RS.map((R) => [t`${R}`, t`${1 - 1 / R}`, t`${Number(Math.log(R).toPrecision(4))}`]) },
    { kind: 'definition', name: t`Improper integral`, formal: t`Let ${math`f`} be continuous on ${math`[a, \infty)`}. The [[improper-integral|improper integral]] ${math`\int_{a}^{\infty} f(x)\,dx`} is ${math`\lim_{R \to \infty} \int_{a}^{R} f(x)\,dx`}. If this limit exists (as a real number) the integral converges; otherwise it diverges.`, plain: t`Integrate to a finite end ${math`R`}, then let ${math`R`} run off to infinity. ${math`\int_{${1}}^{\infty} \frac{dx}{x^{${2}}} = \lim (${1} - \frac{${1}}{R}) = ${1}`}.` },
    { kind: 'theorem', name: t`Powers`, statement: t`${math`\int_{${1}}^{\infty} x^{-p}\,dx`} converges if and only if ${math`p > ${1}`}, and then it equals ${math`\frac{${1}}{p - ${1}}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Integrate to R`, text: t`For ${math`p \ne ${1}`}: ${math`\int_{${1}}^{R} x^{-p}\,dx = \frac{R^{${1} - p} - ${1}}{${1} - p}`}. For ${math`p = ${1}`}: ${math`\ln R`}.` },
        { label: t`${math`p > ${1}`}`, text: t`Then ${math`${1} - p < ${0}`}, so ${math`R^{${1} - p} \to ${0}`} and the integral tends to ${math`\frac{-${1}}{${1} - p} = \frac{${1}}{p - ${1}}`}.` },
        { label: t`${math`p < ${1}`}`, text: t`Then ${math`R^{${1} - p} \to \infty`}, so the integral is unbounded.` },
        { label: t`${math`p = ${1}`}`, text: t`${math`\ln R \to \infty`}. So convergence happens exactly when ${math`p > ${1}`}.` },
      ],
    },
    { kind: 'section', title: t`Exponentials` },
    { kind: 'theorem', name: t`Exponential tails`, statement: t`For ${math`k > ${0}`}, ${math`\int_{${0}}^{\infty} e^{-kx}\,dx = \frac{${1}}{k}`}, and for each whole number ${math`n \ge ${0}`}, ${math`\int_{${0}}^{\infty} x^{n}e^{-x}\,dx = n!`}.` },
    { kind: 'p', text: t`The first: ${math`\int_{${0}}^{R} e^{-kx}\,dx = \frac{${1} - e^{-kR}}{k} \to \frac{${1}}{k}`}. The second by parts: with ${math`I_{n}`} the integral, ${math`I_{n} = \lim_{R \to \infty}\left(\left[-x^{n}e^{-x}\right]_{${0}}^{R} + n\int_{${0}}^{R} x^{n - ${1}}e^{-x}\,dx\right) = nI_{n - ${1}}`}, because ${math`R^{n}e^{-R} \to ${0}`}; with ${math`I_{${0}} = ${1}`}, induction gives ${math`n!`}.`, why: { q: t`Why does ${math`R^{n}e^{-R}`} tend to ${0}?`, a: t`From the exponential series, ${math`e^{R} \ge \frac{R^{n + ${1}}}{(n + ${1})!}`} for ${math`R > ${0}`}, so ${math`R^{n}e^{-R} \le \frac{(n + ${1})!}{R} \to ${0}`}.` } },
    checkFrom(powerTail, { c: 3, p: 2, a: 1 }, t`${math`\int_{${1}}^{R} ${3}x^{-${2}}\,dx = ${3} - \frac{${3}}{R} \to ${3}`}.`),
    { kind: 'pitfall', claim: t`If the integrand tends to ${0}, the integral converges.`, counterexample: t`${math`\frac{${1}}{x} \to ${0}`}, but ${math`\int_{${1}}^{R} \frac{dx}{x} = \ln R`}, which passes ${math`${1000}`} once ${math`R > e^{${1000}}`} and keeps going.` },
    { kind: 'pitfall', claim: t`${math`\int_{-\infty}^{\infty} x\,dx = ${0}`}, because the two halves cancel.`, counterexample: t`Each half, ${math`\int_{${0}}^{\infty} x\,dx`}, diverges, so the whole integral is undefined. Only ${math`\lim_{R \to \infty}\int_{-R}^{R}`} is ${0}, and that is a different (symmetric) limit.` },
    { kind: 'takeaway', text: t`Integrate to a finite ${math`R`}, then let ${math`R \to \infty`}; ${math`x^{-p}`} has a finite tail exactly when ${math`p > ${1}`}, and exponentials always do.` },
  ],
  examples: [
    { ...workedCambridge(meanY), examiner: t`The examiner wants the infinite limit handled as a limit (the boundary term shown to vanish) and the given integral used through a clean substitution.` },
    worked(expTail, { k: 2, a: 1 }, t`An exponential tail`),
    worked(converge, { p: q(-1) }, t`The borderline case`),
  ],
  generators: [powerTail, expTail, converge],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['improper-integral'],
  cambridge: [db16q8, db16q8Approx, varY, nstLimit, nstIN2],
  // STEP II 2016 Q8 is the gate: an improper integral of x^-2 used to estimate a series, which
  // needs only this topic. IN2 (n! as an integral) is worked in the lesson, STEP 2 Q4's variance
  // needs densities and variance, later topics, and the I2(i) limit is one step.
  gate: ['step16-q8', 'step16-q8-i'],
  recall: [
    { front: t`Define ${math`\int_{a}^{\infty} f(x)\,dx`}.`, back: t`${math`\lim_{R \to \infty}\int_{a}^{R} f(x)\,dx`}, when the limit exists.` },
    { front: t`When does ${math`\int_{${1}}^{\infty} x^{-p}\,dx`} converge?`, back: t`Exactly when ${math`p > ${1}`}; then it is ${math`\frac{${1}}{p - ${1}}`}.` },
    { front: t`What is ${math`\int_{${0}}^{\infty} x^{n}e^{-x}\,dx`}?`, back: t`${math`n!`}.` },
  ],
  proofOrder: [{
    title: t`The power tail converges for p above one`,
    steps: [
      t`Integrate to ${math`R`}: ${math`\frac{R^{${1} - p} - ${1}}{${1} - p}`}.`,
      t`For ${math`p > ${1}`}, the power ${math`${1} - p`} is negative.`,
      t`So ${math`R^{${1} - p} \to ${0}`} as ${math`R \to \infty`}.`,
      t`The integral tends to ${math`\frac{${1}}{p - ${1}}`}.`,
    ],
  }],
};

