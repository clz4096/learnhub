/**
 * alg.exp-and-ln (a bridge): e^x and ln x as inverse functions, the laws of logarithms,
 * and logarithms to other bases. Sources: the STEP specification (Exponentials and
 * logarithms), the TMUA specification MM5.1 and MM5.2 and the TMUA Notes on Mathematics,
 * and the NST Maths Workbook FC5. Answers are computed exactly where they are rational, and
 * checked in floating point with Math.exp and Math.log.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { div, int, mul, pick, q, str, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { math, t } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';
import { distinctFrom, setAnswer, withExaminer } from '../prep-a';

const near = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));

// ---------------------------------------------------------------- the laws of logarithms

interface LawP { a: number; b: number; c: number }
const lawAns = ({ a, b, c }: LawP): Rational => q(a * b, c);
const lawMis = ({ a, b, c }: LawP): Rational[] => [q(a + b - c), q(a * b * c), q(a + b, c)];

const logLaws = generator<LawP>({
  id: 'log-laws',
  skill: 'Combine logarithms into one: a sum is the log of a product, a difference the log of a quotient.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const p: LawP = { a: int(rng, 2, 12), b: int(rng, 2, 12), c: int(rng, 2, 9) };
      if (p.a + p.b - p.c > 0 && distinctFrom(str(lawAns(p)), lawMis(p).map(str)) >= 2) return p;
    }
  },
  sane: (p) => (p.a > 0 && p.b > 0 && p.c > 0 ? null : 'log of a non-positive number'),
  problem: (p) => ({
    prompt: t`Write ${math`\ln ${p.a} + \ln ${p.b} - \ln ${p.c}`} as ${math`\ln k`} for a single number ${math`k`}. Find ${math`k`}.`,
    answer: { kind: 'exact', expected: str(lawAns(p)) },
    solution: [
      t`A sum of logarithms is the logarithm of the product: ${math`\ln ${p.a} + \ln ${p.b} = \ln ${p.a * p.b}`}.`,
      t`A difference is the logarithm of the quotient: ${math`\ln ${p.a * p.b} - \ln ${p.c} = \ln ${lawAns(p)}`}. So ${math`k = ${lawAns(p)}`}.`,
    ],
  }),
  solve: (p) => {
    // exp of the combined value, rounded to the fraction with denominator c.
    const v = Math.exp(Math.log(p.a) + Math.log(p.b) - Math.log(p.c));
    return str(q(Math.round(v * p.c), p.c));
  },
  misconceptions: (p): Misconception[] => {
    const [added, multiplied, sumOver] = lawMis(p) as [Rational, Rational, Rational];
    return [
      { response: str(added), why: t`${math`\ln`} does not turn sums into sums: ${math`\ln a + \ln b = \ln(ab)`}, the log of the product.` },
      { response: str(multiplied), why: t`Subtracting a logarithm divides inside it: ${math`\ln a - \ln c = \ln \frac{a}{c}`}.` },
      { response: str(sumOver), why: t`${math`\ln(a + b)`} is not ${math`\ln a + \ln b`}. The sum of the logs is the log of the product ${math`ab`}.` },
    ];
  },
});

// ---------------------------------------------------------------- a^x = b

interface PowP { a: number; b: number }
const powAns = ({ a, b }: PowP): number => Math.log(b) / Math.log(a);

const solvePower = generator<PowP>({
  id: 'solve-power',
  skill: 'Solve a^x = b by taking logarithms: x = ln b / ln a.',
  params: (rng) => {
    for (;;) {
      const p: PowP = { a: pick(rng, [2, 3, 5, 6, 7, 10]), b: int(rng, 3, 90) };
      // b is not a whole power of a, so the answer needs logarithms.
      const x = powAns(p);
      const far = (m: number): boolean => Math.abs(m - x) > 0.01 * Math.abs(x);
      if (!Number.isInteger(Math.round(x * 1e9) / 1e9) && far(Math.log(p.b / p.a)) && far(p.b / p.a) && far(1 / x)) return p;
    }
  },
  sane: ({ a, b }) => (a > 1 && b > 0 ? null : 'out of range'),
  problem: (p) => ({
    prompt: t`Solve ${math`${p.a}^{x} = ${p.b}`}. Give ${math`x`} to ${4} significant figures.`,
    answer: { kind: 'numeric', expected: Number(powAns(p).toPrecision(4)), relTol: 1e-3 },
    solution: [
      t`Take natural logarithms of both sides: ${math`\ln(${p.a}^{x}) = \ln ${p.b}`}, and ${math`\ln(a^{x}) = x\ln a`}, so ${math`x\ln ${p.a} = \ln ${p.b}`}.`,
      t`Divide by ${math`\ln ${p.a}`}, which is positive: ${math`x = \frac{\ln ${p.b}}{\ln ${p.a}} \approx ${Number(powAns(p).toPrecision(4))}`}.`,
    ],
  }),
  solve: (p) => {
    // Bisection on a^x - b, independent of the log formula.
    let lo = -10;
    let hi = 10;
    for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (p.a ** m < p.b) lo = m; else hi = m; }
    return String(Number(lo.toPrecision(6)));
  },
  misconceptions: (p): Misconception[] => [
    { response: String(Number(Math.log(p.b / p.a).toPrecision(4))), why: t`${math`\frac{\ln b}{\ln a}`} is not ${math`\ln \frac{b}{a}`}: a quotient of logs is not the log of a quotient.` },
    { response: String(Number((1 / powAns(p)).toPrecision(4))), why: t`Upside down: from ${math`x\ln ${p.a} = \ln ${p.b}`}, divide by ${math`\ln ${p.a}`}, so ${math`\ln ${p.b}`} is on top.` },
    { response: String(Number((p.b / p.a).toPrecision(4))), why: t`Dividing ${p.b} by ${p.a} solves ${math`${p.a}x = ${p.b}`}, not ${math`${p.a}^{x} = ${p.b}`}. Take logarithms to bring the power down.` },
  ],
});

// ---------------------------------------------------------------- an equation in ln

interface LnP { r: number; d: number }
/** ln x + ln(x + d) = ln c with c = r(r + d): x^2 + dx - c = 0, roots r and -(r + d). */
const lnC = ({ r, d }: LnP): number => r * (r + d);

const lnEquation = generator<LnP>({
  id: 'ln-equation',
  skill: 'Solve an equation in logarithms by combining them, and reject any root where a logarithm is undefined.',
  params: (rng) => {
    for (;;) {
      const p: LnP = { r: int(rng, 1, 9), d: int(rng, 1, 8) };
      const c = lnC(p);
      if ((c - p.d) % 2 === 0 && (c - p.d) / 2 === p.r) continue;
      return p;
    }
  },
  sane: ({ r, d }) => (r > 0 && d > 0 ? null : 'out of range'),
  problem: (p) => {
    const c = lnC(p);
    return {
      prompt: t`Solve ${math`\ln x + \ln(x + ${p.d}) = \ln ${c}`}.`,
      answer: { kind: 'exact', expected: String(p.r) },
      solution: [
        t`Combine the left side: ${math`\ln(x(x + ${p.d})) = \ln ${c}`}. Since ${math`\ln`} is one-to-one, ${math`x(x + ${p.d}) = ${c}`}, that is ${math`x^{${2}} + ${p.d}x - ${c} = ${0}`}.`,
        t`Factorise: ${math`(x - ${p.r})(x + ${p.r + p.d}) = ${0}`}, so ${math`x = ${p.r}`} or ${math`x = -${p.r + p.d}`}.`,
        t`But ${math`\ln x`} is only defined for ${math`x > ${0}`}, so ${math`x = -${p.r + p.d}`} is not a solution of the original equation. The only solution is ${math`x = ${p.r}`}.`,
      ],
    };
  },
  solve: (p) => {
    const c = lnC(p);
    for (let x = 1; x <= 100; x++) if (near(Math.log(x) + Math.log(x + p.d), Math.log(c))) return String(x);
    return 'none';
  },
  misconceptions: (p): Misconception[] => [
    { response: String(-(p.r + p.d)), why: t`At ${math`x = -${p.r + p.d}`}, ${math`\ln x`} is undefined: logarithms need positive inputs. Check every root in the original equation.` },
    { response: str(div(q(lnC(p) - p.d), q(2))), why: t`${math`\ln x + \ln(x + ${p.d})`} is not ${math`\ln(x + x + ${p.d})`}: a sum of logs is the log of the product.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const fc5i = auto({
  id: 'nst-fc5-i',
  source: cite('nst-workbook', 'Functions and curve sketching, FC5(i)'),
  title: t`A power of ${9}`,
  prompt: t`If ${math`${3} = ${9}^{-x}`}, find ${math`x`}.`,
  answer: { kind: 'exact', expected: '-1/2' },
  solution: [
    t`Write both sides as powers of ${3}: ${math`${9}^{-x} = (${3}^{${2}})^{-x} = ${3}^{-${2}x}`}.`,
    t`So ${math`${3}^{${1}} = ${3}^{-${2}x}`}, and since ${math`${3}^{t}`} is one-to-one, ${math`${1} = -${2}x`}: ${math`x = -${q(1, 2)}`}.`,
  ],
  reference: '-1/2',
  verify: () => (near(9 ** 0.5, 3) ? same('check', str(mul(q(-2), q(-1, 2))), '1') : 'sqrt 9 is not 3'),
  misconceptions: [{ response: '1/2', why: t`${math`${9}^{${q(1, 2)}} = ${3}`}, but the equation has ${math`${9}^{-x}`}: so ${math`-x = ${q(1, 2)}`}.` }],
});

const fc5iii = auto({
  id: 'nst-fc5-iii',
  source: cite('nst-workbook', 'Functions and curve sketching, FC5(iii)'),
  title: t`Logs to two bases`,
  prompt: t`Find every ${math`x`} with ${math`${16}\log_{x} ${3} = \log_{${3}} x`}.`,
  answer: setAnswer([q(81), q(1, 81)], 'Write log_x 3 as 1/log_3 x and solve for log_3 x.'),
  solution: [
    t`Change of base: ${math`\log_{x} ${3} = \frac{\ln ${3}}{\ln x} = \frac{${1}}{\log_{${3}} x}`}. Put ${math`u = \log_{${3}} x`}, which is not ${0} since the base ${math`x \ne ${1}`}.`,
    t`The equation is ${math`\frac{${16}}{u} = u`}, so ${math`u^{${2}} = ${16}`} and ${math`u = \pm ${4}`}.`,
    t`${math`\log_{${3}} x = ${4}`} gives ${math`x = ${3}^{${4}} = ${81}`}; ${math`\log_{${3}} x = -${4}`} gives ${math`x = ${3}^{-${4}} = ${q(1, 81)}`}. Both are positive and not ${1}, so both are solutions.`,
  ],
  reference: '81, 1/81',
  verify: () => {
    const bad = [81, 1 / 81].find((x) => !near(16 * Math.log(3) / Math.log(x), Math.log(x) / Math.log(3)));
    return bad === undefined ? null : `x = ${bad} fails`;
  },
  misconceptions: [{ response: '81, -81', why: t`${math`\log_{${3}} x = -${4}`} means ${math`x = ${3}^{-${4}}`}, a small positive number, not ${math`-${81}`}. A log's input is always positive.` }],
});

const fc5ii = supervision({
  id: 'nst-fc5-ii',
  source: cite('nst-workbook', 'Functions and curve sketching, FC5(ii)'),
  title: t`Change of base`,
  prompt: t`If ${math`\log_{a} b = c`}, show that ${math`c = \frac{\log_{\alpha} b}{\log_{\alpha} a}`} for any base ${math`\alpha`}.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

export const expAndLn: TopicContent = {
  topicId: 'alg.exp-and-ln',
  goal: t`Use ${math`e^{x}`} and ${math`\ln x`} as inverse functions and apply the laws of logarithms.`,
  objective: t`Use ${math`e^{x}`} and ${math`\ln x`} as inverses, and apply the laws of logarithms.`,
  why: t`Logarithms solve any equation with the unknown in a power; STEP uses them constantly.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`The idea` },
    { kind: 'hook', text: t`${math`${2}^{x} = ${8}`} is easy: ${math`x = ${3}`}. But ${math`${2}^{x} = ${10}`}? The answer is between ${3} and ${4}, and no fraction will do. You need a function that undoes powers. That function is the logarithm.` },
    { kind: 'narrative', text: t`Among all the exponential functions ${math`a^{x}`}, one is special: the one whose graph has gradient ${1} where it crosses the ${math`y`}-axis. Its base is the number ${math`e \approx ${Number(Math.E.toFixed(4))}`}, and its gradient at every point equals its height. Its inverse is the natural logarithm.` },
    { kind: 'section', title: t`Two inverse functions` },
    {
      kind: 'definition',
      name: t`Exponential and natural logarithm`,
      formal: t`The [[exponential-function|exponential function]] ${math`x \mapsto e^{x}`} is defined for all real ${math`x`} and takes every positive value exactly once. The [[natural-logarithm|natural logarithm]] is its inverse: for ${math`x > ${0}`}, ${math`\ln x`} is the unique real ${math`y`} with ${math`e^{y} = x`}.`,
      plain: t`${math`\ln x`} answers the question "${math`e`} to what power gives ${math`x`}?" ${math`\ln ${1} = ${0}`} because ${math`e^{${0}} = ${1}`}, and ${math`\ln e = ${1}`}. There is no ${math`\ln`} of ${0} or of a negative number, since ${math`e^{y}`} is always positive.`,
    },
    { kind: 'rule', text: t`${math`e^{\ln x} = x`} for ${math`x > ${0}`}, and ${math`\ln(e^{y}) = y`} for every real ${math`y`}.`, why: { q: t`Why do both hold?`, a: t`The first is the definition of ${math`\ln x`}. For the second, ${math`y`} is a number whose exponential is ${math`e^{y}`}, and there is only one such number, so it is ${math`\ln(e^{y})`}.` } },
    { kind: 'section', title: t`The laws of logarithms` },
    { kind: 'theorem', name: t`Laws of logarithms`, statement: t`For ${math`a, b > ${0}`} and real ${math`k`}: ${math`\ln(ab) = \ln a + \ln b`}, ${math`\ln\frac{a}{b} = \ln a - \ln b`}, and ${math`\ln(a^{k}) = k\ln a`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Name the logs`, text: t`Let ${math`u = \ln a`} and ${math`v = \ln b`}, so ${math`a = e^{u}`} and ${math`b = e^{v}`}.` },
        { label: t`Products`, text: t`${math`ab = e^{u}e^{v} = e^{u + v}`} by the index law, so ${math`\ln(ab) = u + v = \ln a + \ln b`}.`, why: { q: t`Why may we take ln of both sides?`, a: t`${math`\ln(e^{u + v}) = u + v`}: ${math`\ln`} undoes ${math`e`}.` } },
        { label: t`Quotients`, text: t`${math`\frac{a}{b} = e^{u - v}`}, so ${math`\ln\frac{a}{b} = u - v`}.` },
        { label: t`Powers`, text: t`${math`a^{k} = (e^{u})^{k} = e^{ku}`}, so ${math`\ln(a^{k}) = ku = k\ln a`}.` },
      ],
    },
    { kind: 'narrative', text: t`The [[laws-of-logarithms|laws of logarithms]] turn multiplication into addition and powers into multiplication. That is exactly what you need to bring an unknown down from a power: ${math`${2}^{x} = ${10}`} becomes ${math`x\ln ${2} = \ln ${10}`}, so ${math`x = \frac{\ln ${10}}{\ln ${2}} \approx ${Number((Math.log(10) / Math.log(2)).toPrecision(4))}`}.` },
    checkFrom(logLaws, { a: 6, b: 4, c: 3 }, t`${math`\ln ${6} + \ln ${4} = \ln ${24}`}, and ${math`\ln ${24} - \ln ${3} = \ln ${8}`}.`),
    { kind: 'pitfall', claim: t`${math`\ln(a + b) = \ln a + \ln b`}.`, counterexample: t`${math`\ln(${1} + ${1}) = \ln ${2} \approx ${Number(Math.log(2).toFixed(3))}`}, but ${math`\ln ${1} + \ln ${1} = ${0}`}. The law is for products: ${math`\ln(ab) = \ln a + \ln b`}.` },
    { kind: 'section', title: t`Other bases` },
    { kind: 'narrative', text: t`${math`\log_{a} x`} is the power of ${math`a`} that gives ${math`x`}: ${math`\log_{${2}} ${8} = ${3}`}. It obeys the same laws, and converts to ${math`\ln`}: if ${math`y = \log_{a} x`} then ${math`a^{y} = x`}, so ${math`y\ln a = \ln x`} and ${math`\log_{a} x = \frac{\ln x}{\ln a}`}. This is the change of base rule.` },
    checkFrom(lnEquation, { r: 2, d: 3 }, t`${math`x(x + ${3}) = ${10}`} gives ${math`x = ${2}`} or ${math`x = -${5}`}, and ${math`\ln(-${5})`} is undefined.`),
    { kind: 'pitfall', claim: t`Every root of the quadratic you reach solves the log equation.`, counterexample: t`${math`\ln x + \ln(x + ${3}) = \ln ${10}`} leads to ${math`x = ${2}`} or ${math`x = -${5}`}, but ${math`\ln(-${5})`} does not exist. Check each root in the original.` },
    { kind: 'takeaway', text: t`${math`\ln`} undoes ${math`e`}; logs turn products into sums and powers into multiples, and only positive numbers have logarithms.` },
  ],
  examples: [
    withExaminer(workedCambridge(fc5i), t`Both sides written as powers of the same base, and the one-to-one step stated before the exponents are equated.`),
    worked(solvePower, { a: 3, b: 20 }, t`Bringing the unknown down`),
    worked(lnEquation, { r: 4, d: 5 }, t`Rejecting a root`),
  ],
  generators: [logLaws, solvePower, lnEquation],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['exponential-function', 'natural-logarithm', 'laws-of-logarithms'],
  cambridge: [fc5iii, fc5ii],
  gate: ['nst-fc5-iii'],
  recall: [
    { front: t`Define ${math`\ln x`}.`, back: t`For ${math`x > ${0}`}, the unique ${math`y`} with ${math`e^{y} = x`}.` },
    { front: t`State the laws of logarithms.`, back: t`${math`\ln(ab) = \ln a + \ln b`}, ${math`\ln\frac{a}{b} = \ln a - \ln b`}, ${math`\ln(a^{k}) = k\ln a`}.` },
    { front: t`Change of base?`, back: t`${math`\log_{a} x = \frac{\ln x}{\ln a}`}.` },
  ],
  proofOrder: [{
    title: t`The log of a product`,
    steps: [
      t`Let ${math`u = \ln a`} and ${math`v = \ln b`}, so ${math`a = e^{u}`} and ${math`b = e^{v}`}.`,
      t`Then ${math`ab = e^{u}e^{v}`}.`,
      t`By the index law, ${math`ab = e^{u + v}`}.`,
      t`Taking ${math`\ln`}, ${math`\ln(ab) = u + v = \ln a + \ln b`}.`,
    ],
  }],
};
