/**
 * alg.arithmetico-geometric: sums of (a + nd) r^n, an arithmetic factor times a geometric
 * one, by multiplying by r and subtracting, or by differentiating the geometric series. From
 * STEP 3 Statistics Q2 (2010 S3 Q12: S = 1/(1 - r) + rd/(1 - r)^2, Arthur's expected shots
 * 1/a, and the contest between Arthur and Boadicea) and the STEP 3 topic notes (pages 1 and
 * 2: the geometric distribution's mean 1/p and second moment by differentiating). Every
 * official answer is compared; the infinite sums are checked by summing them numerically.
 */
import { auto, cite, supervision } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, math, t, texOfRational } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';
import { far, rpow, solveLinear } from '../partv-a';

const S3 = 'step-s3-stats' as const;
const S3S = 'step-s3-stats-solutions' as const;
const NOTES = 'step-s3-stats-notes' as const;
const distinctFrom = (right: string, xs: readonly string[]): number => new Set(xs.filter((x) => x !== right)).size;
/** A rational in brackets when negative or a fraction, for powers: \left(\frac{1}{2}\right). */
const br = (r: Rational): string => (r.den === 1n && r.num >= 0n ? `${r.num}` : `\\left(${texOfRational(r)}\\right)`);

// ---------------------------------------------------------------- the infinite sum

interface InfP { c: number; d: number; r: Rational }
const RS: readonly Rational[] = [q(1, 2), q(1, 3), q(2, 3), q(1, 4), q(3, 4), q(-1, 2), q(-1, 3), q(2, 5)];
const infVal = ({ c, d, r }: InfP): Rational => add(div(q(c), sub(q(1), r)), div(mul(q(d), r), mul(sub(q(1), r), sub(q(1), r))));
const infMis = ({ c, d, r }: InfP): string[] => {
  const g = sub(q(1), r);
  return [str(add(div(q(c), g), div(q(d), mul(g, g)))), str(add(div(q(c), g), div(mul(q(d), r), g))), str(div(q(c), g))];
};

const infiniteSum = generator<InfP>({
  id: 'infinite-sum',
  skill: 'Sum (c + nd) r^n over n ≥ 0 for |r| < 1: S - rS leaves c plus a geometric series.',
  params: (rng) => {
    for (;;) {
      const p: InfP = { c: int(rng, 1, 5), d: pick(rng, [2, 3, 4, 5]), r: pick(rng, RS) };
      if (distinctFrom(str(infVal(p)), infMis(p)) >= 2) return p;
    }
  },
  sane: ({ r }) => (r.num * r.num < r.den * r.den ? null : 'out of range'),
  problem: (p) => {
    const terms = [0, 1, 2, 3].map((n) => mul(q(p.c + n * p.d), rpow(p.r, n)));
    const g = sub(q(1), p.r);
    return {
      prompt: t`Find ${math`S = \sum_{n = ${0}}^{\infty} (${p.c} + ${p.d}n)${computedTex(br(p.r))}^{n}`}, whose terms begin ${math`${terms[0] as Rational}, ${terms[1] as Rational}, ${terms[2] as Rational}, ${terms[3] as Rational}, \ldots`}.`,
      answer: { kind: 'exact', expected: str(infVal(p)) },
      solution: [
        t`Write ${math`r = ${p.r}`}. Then ${math`S - rS = ${p.c} + ${p.d}r + ${p.d}r^{${2}} + \cdots`}: each term of ${math`rS`} lines up under the next term of ${math`S`}, and their difference is ${p.d} times a power of ${math`r`}.`,
        t`So ${math`(${1} - r)S = ${p.c} + \frac{${p.d}r}{${1} - r}`}, and ${math`S = \frac{${p.c}}{${1} - r} + \frac{${p.d}r}{(${1} - r)^{${2}}} = \frac{${p.c}}{${g}} + \frac{${mul(q(p.d), p.r)}}{${mul(g, g)}} = ${infVal(p)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // The shift argument as an equation in S: S = c + r(S + d/(1 - r)), solved exactly.
    const [s] = solveLinear([[sub(q(1), p.r)]], [add(q(p.c), div(mul(p.r, q(p.d)), sub(q(1), p.r)))]);
    return str(s as Rational);
  },
  misconceptions: (p): Misconception[] => {
    const [x, y, z] = infMis(p);
    return [
      { response: x as string, why: t`The arithmetic part ${math`\sum n r^{n}`} is ${math`\frac{r}{(${1} - r)^{${2}}}`}, not ${math`\frac{${1}}{(${1} - r)^{${2}}}`}: its first nonzero term is ${math`r`}, at ${math`n = ${1}`}.` },
      { response: y as string, why: t`After subtracting, the geometric series ${math`r + r^{${2}} + \cdots = \frac{r}{${1} - r}`} still has to be divided by ${math`${1} - r`}: the denominator is squared.` },
      { response: z as string, why: t`That sums only the constant part. The ${math`nd`} part adds ${math`\frac{dr}{(${1} - r)^{${2}}}`}.` },
    ];
  },
});

// ---------------------------------------------------------------- the finite sum

interface FinP { r: Rational; n: number }
const finSum = (r: Rational, n: number): Rational => {
  let s = q(0);
  for (let k = 1; k <= n; k++) s = add(s, mul(q(k), rpow(r, k)));
  return s;
};
const finFormula = ({ r, n }: FinP): Rational => div(mul(r, add(sub(q(1), mul(q(n + 1), rpow(r, n))), mul(q(n), rpow(r, n + 1)))), mul(sub(q(1), r), sub(q(1), r)));
const finMis = ({ r, n }: FinP): string[] => [str(finSum(r, n - 1)), str(finSum(r, n + 1)), str(div(sub(r, rpow(r, n + 1)), sub(q(1), r)))];

const finiteSum = generator<FinP>({
  id: 'finite-sum',
  skill: 'Sum k r^k for k = 1 to n in closed form, by S - rS.',
  params: (rng) => {
    for (;;) {
      const p: FinP = { r: pick(rng, [q(2), q(3), q(1, 2), q(-2), q(1, 3)]), n: int(rng, 4, 8) };
      if (distinctFrom(str(finFormula(p)), finMis(p)) >= 2) return p;
    }
  },
  sane: ({ n }) => (n >= 4 ? null : 'out of range'),
  problem: (p) => {
    const R = computedTex(br(p.r));
    return {
      prompt: t`Find ${math`\sum_{k = ${1}}^{${p.n}} k ${R}^{k} = ${R} + ${2} \times ${R}^{${2}} + \cdots + ${p.n} \times ${R}^{${p.n}}`}.`,
      answer: { kind: 'exact', expected: str(finFormula(p)) },
      solution: [
        t`Let ${math`S = \sum_{k = ${1}}^{n} k r^{k}`} with ${math`r = ${p.r}`}, ${math`n = ${p.n}`}. Subtracting ${math`rS`} lines up the powers: ${math`(${1} - r)S = r + r^{${2}} + \cdots + r^{n} - n r^{n + ${1}} = \frac{r(${1} - r^{n})}{${1} - r} - n r^{n + ${1}}`}.`,
        t`So ${math`S = \frac{r\left(${1} - (n + ${1})r^{n} + n r^{n + ${1}}\right)}{(${1} - r)^{${2}}} = ${finFormula(p)}`}.`,
      ],
    };
  },
  solve: (p) => str(finSum(p.r, p.n)),
  misconceptions: (p): Misconception[] => {
    const [x, y, z] = finMis(p);
    return [
      { response: x as string, why: t`That stops one term early: the last term is ${math`${p.n} \times r^{${p.n}}`}.` },
      { response: y as string, why: t`That has one term too many: the sum stops at ${math`k = ${p.n}`}.` },
      { response: z as string, why: t`That is the geometric sum ${math`r + r^{${2}} + \cdots + r^{n}`}, without the factor ${math`k`}. After subtracting ${math`rS`}, the last term ${math`-n r^{n + ${1}}`} stays.` },
    ];
  },
});

// ---------------------------------------------------------------- the length of a contest

interface ConP { a: Rational; b: Rational }
const HITS: readonly Rational[] = [q(1, 2), q(1, 3), q(1, 4), q(2, 3), q(1, 5), q(2, 5), q(3, 4), q(1, 6)];
const conVal = ({ a, b }: ConP): Rational => div(sub(q(2), a), sub(q(1), mul(sub(q(1), a), sub(q(1), b))));
const conMis = ({ a, b }: ConP): string[] => {
  const m = sub(q(1), mul(sub(q(1), a), sub(q(1), b)));
  return [str(add(div(q(1), a), div(q(1), b))), str(div(q(1), m)), str(div(q(2), m))];
};

const contest = generator<ConP>({
  id: 'contest-length',
  skill: 'Find the expected number of shots in a contest of alternate shots, from first-step equations or arithmetico-geometric sums.',
  params: (rng) => {
    for (;;) {
      const p: ConP = { a: pick(rng, HITS), b: pick(rng, HITS) };
      if (distinctFrom(str(conVal(p)), conMis(p)) >= 2) return p;
    }
  },
  sane: ({ a, b }) => (a.num > 0n && b.num > 0n ? null : 'out of range'),
  problem: (p) => {
    const [a1, b1] = [sub(q(1), p.a), sub(q(1), p.b)];
    return {
      prompt: t`Arthur and Boadicea take alternate shots at a target, Arthur first, until one hits. Arthur hits with probability ${p.a} and Boadicea with probability ${p.b}, each shot independent. Find the expected number of shots in the contest.`,
      answer: { kind: 'exact', expected: str(conVal(p)) },
      solution: [
        t`Let ${math`E`} be the expected number of shots from the start, with Arthur to shoot. Condition on the first round: after Arthur's shot (${1} shot), the contest goes on with probability ${a1}; after Boadicea's (one more), with probability ${b1}, and then it starts afresh.`,
        t`${math`E = ${1} + ${a1}(${1} + ${b1}E)`}, so ${math`E = \frac{${1} + ${a1}}{${1} - ${mul(a1, b1)}} = ${conVal(p)}`}. This is ${math`\frac{\alpha}{a} + \frac{\beta}{b}`}, as STEP ${3} Statistics Q${2} shows by summing arithmetico-geometric series.`,
      ],
    };
  },
  solve: (p) => {
    // Two unknowns: the expected remaining shots with Arthur to shoot (x) and with Boadicea to shoot (y).
    const [x] = solveLinear([[q(1), sub(q(0), sub(q(1), p.a))], [sub(q(0), sub(q(1), p.b)), q(1)]], [q(1), q(1)]);
    return str(x as Rational);
  },
  misconceptions: (p): Misconception[] => {
    const [x, y, z] = conMis(p);
    return [
      { response: x as string, why: t`Adding each player's expected wait counts shots that never happen: the contest stops at the first hit by either.` },
      { response: y as string, why: t`That is the expected number of rounds started. Count shots: a round that ends on Arthur's hit has one shot, not two.` },
      { response: z as string, why: t`Not every round has two shots: when Arthur hits, Boadicea does not shoot.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const RD_DOM = { r: { kind: 'real' as const, min: -0.9, max: 0.9 }, d: { kind: 'real' as const, min: -5, max: 5 } };
const A_DOM = { a: { kind: 'real' as const, min: 0.05, max: 0.95 } };
const AB_DOM = { a: { kind: 'real' as const, min: 0.05, max: 0.95 }, b: { kind: 'real' as const, min: 0.05, max: 0.95 } };
const sumTo = (f: (n: number) => number, from = 0, to = 4000): number => { let s = 0; for (let n = from; n <= to; n++) s += f(n); return s; };

const q2s = auto({
  id: 's3-q2-series',
  source: cite(S3, 'Q2'),
  title: t`The series ${math`S`}`,
  prompt: t`The infinite series ${math`S = ${1} + (${1} + d)r + (${1} + ${2}d)r^{${2}} + \cdots + (${1} + nd)r^{n} + \cdots`} has ${math`|r| < ${1}`}. By considering ${math`S - rS`}, find ${math`S`} in terms of ${math`r`} and ${math`d`}.`,
  answer: { kind: 'expression', expected: '1/(1 - r) + r d/(1 - r)^2', variables: ['r', 'd'], domains: RD_DOM },
  solution: [
    t`Write ${math`S`} and ${math`rS`} with the powers lined up: ${math`S - rS = ${1} + (${1} + d - ${1})r + (${1} + ${2}d - ${1} - d)r^{${2}} + \cdots = ${1} + dr + dr^{${2}} + \cdots`}.`,
    t`The tail is geometric: ${math`dr(${1} + r + r^{${2}} + \cdots) = \frac{dr}{${1} - r}`}. So ${math`(${1} - r)S = ${1} + \frac{dr}{${1} - r}`}, and ${math`S = \frac{${1}}{${1} - r} + \frac{rd}{(${1} - r)^{${2}}}`}.`,
  ],
  reference: '1/(1 - r) + r d/(1 - r)^2',
  verify: () => {
    for (const [r, d] of [[0.5, 1], [-0.3, 2], [0.8, -1.5], [0.25, 4]] as const) {
      const s = sumTo((n) => (1 + n * d) * r ** n);
      if (far(s, 1 / (1 - r) + (r * d) / (1 - r) ** 2)) return `r = ${r}, d = ${d}: the series sums to ${s}`;
    }
    return null;
  },
  misconceptions: [{ response: '1/(1 - r) + d/(1 - r)^2', why: t`The ${math`d`} terms start at ${math`dr`}, not ${math`d`}: the factor ${math`r`} stays in the numerator.` }],
  official: { source: cite(S3S, 'Q2'), answer: '1/(1 - r) + r d/(1 - r)^2', agrees: true },
});

const arthur = auto({
  id: 's3-q2-arthur',
  source: cite(S3, 'Q2', true),
  title: t`Arthur's expected number of shots`,
  prompt: t`Arthur's arrows hit the target with probability ${math`a`}, each shot independent. Find the expected number of shots he takes to hit the target, in terms of ${math`a`}.`,
  answer: { kind: 'expression', expected: '1/a', variables: ['a'], domains: A_DOM },
  solution: [
    t`He hits first on shot ${math`n`} with probability ${math`(a')^{n - ${1}}a`}, where ${math`a' = ${1} - a`}. So the expectation is ${math`a\left(${1} + ${2}a' + ${3}(a')^{${2}} + \cdots\right)`}.`,
    t`That is ${math`S`} with ${math`d = ${1}`} and ${math`r = a'`}: ${math`a\left(\frac{${1}}{${1} - a'} + \frac{a'}{(${1} - a')^{${2}}}\right) = a\left(\frac{${1}}{a} + \frac{${1} - a}{a^{${2}}}\right) = \frac{${1}}{a}`}.`,
  ],
  reference: '1/a',
  verify: () => {
    for (const a of [0.5, 0.2, 0.9, 1 / 3]) {
      const s = sumTo((n) => n * a * (1 - a) ** (n - 1), 1);
      if (far(s, 1 / a)) return `a = ${a}: the series sums to ${s}`;
    }
    return null;
  },
  misconceptions: [{ response: '(1 - a)/a', why: t`That counts the misses before the hit. The hit itself is a shot too.` }],
  official: { source: cite(S3S, 'Q2'), answer: '1/a', agrees: true },
});

const beta = auto({
  id: 's3-q2-beta',
  source: cite(S3, 'Q2'),
  title: t`Boadicea's chance of winning`,
  prompt: t`Arthur and Boadicea take alternate shots, Arthur first; the first to hit the target wins. Arthur hits with probability ${math`a`} and Boadicea with probability ${math`b`}, each shot independent. Arthur wins with probability ${math`\alpha = \frac{a}{${1} - (${1} - a)(${1} - b)}`}. Find the probability ${math`\beta`} that Boadicea wins, in terms of ${math`a`} and ${math`b`}.`,
  answer: { kind: 'expression', expected: '(1 - a)b/(1 - (1 - a)(1 - b))', variables: ['a', 'b'], domains: AB_DOM },
  solution: [
    t`Boadicea wins on her ${math`k`}th shot when Arthur misses ${math`k`} times and she misses ${math`k - ${1}`} times first: ${math`\beta = a'b + a'b'a'b + \cdots = a'b\left(${1} + a'b' + (a'b')^{${2}} + \cdots\right)`}, with ${math`a' = ${1} - a`}, ${math`b' = ${1} - b`}.`,
    t`${math`\beta = \frac{a'b}{${1} - a'b'} = \frac{(${1} - a)b}{${1} - (${1} - a)(${1} - b)}`}. Check: ${math`\alpha + \beta = \frac{a + b - ab}{${1} - a'b'} = ${1}`}, so the contest ends with probability ${1}.`,
  ],
  reference: '(1 - a)b/(1 - (1 - a)(1 - b))',
  verify: () => {
    for (const [a, b] of [[0.5, 0.5], [0.2, 0.7], [0.9, 0.1]] as const) {
      const s = sumTo((k) => (1 - a) ** k * (1 - b) ** (k - 1) * b, 1);
      if (far(s, ((1 - a) * b) / (1 - (1 - a) * (1 - b)))) return `a = ${a}, b = ${b}: the series sums to ${s}`;
    }
    return null;
  },
  misconceptions: [{ response: 'b/(1 - (1 - a)(1 - b))', why: t`Boadicea only shoots after Arthur misses: each of her chances carries a factor ${math`${1} - a`}.` }],
  official: { source: cite(S3S, 'Q2'), answer: '(1 - a)b/(1 - (1 - a)(1 - b))', agrees: true },
});

const contestMean = auto({
  id: 's3-q2-contest-shots',
  source: cite(S3, 'Q2', true),
  title: t`The expected length of the contest`,
  prompt: t`In the contest of alternate shots (Arthur first, hitting with probability ${math`a`}; Boadicea hitting with probability ${math`b`}), find the expected number of shots, in terms of ${math`a`} and ${math`b`}. (The question shows it equals ${math`\frac{\alpha}{a} + \frac{\beta}{b}`}.)`,
  answer: { kind: 'expression', expected: '(2 - a)/(1 - (1 - a)(1 - b))', variables: ['a', 'b'], domains: AB_DOM },
  solution: [
    t`The contest ends on shot ${math`${2}k + ${1}`} (Arthur hits) with probability ${math`(a'b')^{k}a`} and on shot ${math`${2}k + ${2}`} (Boadicea hits) with probability ${math`(a'b')^{k}a'b`}. Each half is an arithmetico-geometric series in ${math`a'b'`}.`,
    t`Summing with the result for ${math`S`}, or by first-step analysis, ${math`E = \frac{${1}}{${1} - a'b'} + \frac{a'}{${1} - a'b'} = \frac{${2} - a}{${1} - (${1} - a)(${1} - b)}`}. Indeed ${math`\frac{\alpha}{a} = \frac{${1}}{${1} - a'b'}`} and ${math`\frac{\beta}{b} = \frac{a'}{${1} - a'b'}`}.`,
  ],
  reference: '(2 - a)/(1 - (1 - a)(1 - b))',
  verify: () => {
    for (const [a, b] of [[0.5, 0.5], [0.2, 0.7], [0.9, 0.1], [0.3, 0.3]] as const) {
      const m = (1 - a) * (1 - b);
      const s = sumTo((k) => (2 * k + 1) * m ** k * a + (2 * k + 2) * m ** k * (1 - a) * b);
      if (far(s, (2 - a) / (1 - m))) return `a = ${a}, b = ${b}: the series sums to ${s}`;
    }
    return null;
  },
  misconceptions: [{ response: '1/a + 1/b', why: t`The contest stops at the first hit by either player; their separate waits overlap.` }],
  official: { source: cite(S3S, 'Q2'), answer: '(a/(1 - (1 - a)(1 - b)))/a + ((1 - a)b/(1 - (1 - a)(1 - b)))/b', agrees: true },
});

const P_DOM = { p: { kind: 'real' as const, min: 0.05, max: 0.95 } };
const geomSecond = auto({
  id: 's3-notes-geometric-second-moment',
  source: cite(NOTES, 'page 2'),
  title: t`The geometric distribution: ${math`E(X^{${2}})`}`,
  prompt: t`${math`X`} is the number of trials up to and including the first success, each trial a success with probability ${math`p`} independently, so ${math`P(X = r) = (${1} - p)^{r - ${1}}p`}. Differentiating ${math`${1} + q + q^{${2}} + \cdots = (${1} - q)^{-${1}}`} twice, find ${math`E(X^{${2}})`} in terms of ${math`p`}.`,
  answer: { kind: 'expression', expected: '(2 - p)/p^2', variables: ['p'], domains: P_DOM },
  solution: [
    t`With ${math`q = ${1} - p`}: differentiating once, ${math`${1} + ${2}q + ${3}q^{${2}} + \cdots = (${1} - q)^{-${2}}`} (A); again, ${math`${2} + ${3} \times ${2}q + ${4} \times ${3}q^{${2}} + \cdots = ${2}(${1} - q)^{-${3}}`} (B).`,
    t`(B) minus (A) gives ${math`${1} + ${2}^{${2}}q + ${3}^{${2}}q^{${2}} + \cdots = \frac{${2}}{p^{${3}}} - \frac{${1}}{p^{${2}}}`}. Multiplying by ${math`p`}: ${math`E(X^{${2}}) = \frac{${2}}{p^{${2}}} - \frac{${1}}{p} = \frac{${2} - p}{p^{${2}}}`}. Then ${math`\mathrm{Var}(X) = \frac{${2} - p}{p^{${2}}} - \frac{${1}}{p^{${2}}} = \frac{${1} - p}{p^{${2}}}`}.`,
  ],
  reference: '(2 - p)/p^2',
  verify: () => {
    for (const p of [0.5, 0.2, 0.75, 1 / 6]) {
      const s = sumTo((r) => r * r * (1 - p) ** (r - 1) * p, 1);
      if (far(s, (2 - p) / (p * p))) return `p = ${p}: the series sums to ${s}`;
    }
    return null;
  },
  misconceptions: [{ response: '1/p^2', why: t`That is ${math`E(X)^{${2}}`}. ${math`E(X^{${2}})`} is larger by the variance, ${math`\frac{${1} - p}{p^{${2}}}`}.` }],
  official: { source: cite(NOTES, 'page 2'), answer: '(2 - p)/p^2', agrees: true },
});

const q2proofS = supervision({
  id: 's3-q2-prove-series',
  source: cite(S3, 'Q2'),
  title: t`Prove the formula for ${math`S`}`,
  prompt: t`For ${math`|r| < ${1}`}, prove that ${math`S = \sum_{n \ge ${0}} (${1} + nd)r^{n} = \frac{${1}}{${1} - r} + \frac{rd}{(${1} - r)^{${2}}}`} by considering ${math`S - rS`}. Why is it legitimate to subtract term by term, and what goes wrong for ${math`r = ${1}`}?`,
  writeUp: 'proof',
  official: cite(S3S, 'Q2'),
});
const q2proofE = supervision({
  id: 's3-q2-prove-contest',
  source: cite(S3, 'Q2'),
  title: t`The contest: ${math`\frac{\alpha}{a} + \frac{\beta}{b}`}`,
  prompt: t`Show that the expected number of shots in the contest between Arthur and Boadicea is ${math`\frac{\alpha}{a} + \frac{\beta}{b}`}, by splitting the expectation into the shots that end with Arthur's hit and those that end with Boadicea's, and using the formula for ${math`S`} twice.`,
  writeUp: 'proof',
  official: cite(S3S, 'Q2'),
});

// ---------------------------------------------------------------- lesson

const HALF = q(1, 2);

export const arithmeticoGeometric: TopicContent = {
  topicId: 'alg.arithmetico-geometric',
  goal: t`Sum ${math`\sum n r^{n}`} and ${math`\sum (a + nd) r^{n}`} by multiplying by ${math`r`} and subtracting, or by differentiating the geometric series.`,
  lesson: [
    { kind: 'p', text: t`An [[arithmetico-geometric-series|arithmetico-geometric series]] multiplies an arithmetic sequence by a geometric one: ${math`\sum (a + nd)r^{n}`}. Such sums give expectations, because ${math`E(X) = \sum n \, P(X = n)`} and waiting times have geometric probabilities.` },
    { kind: 'rule', text: t`For ${math`|r| < ${1}`}: ${math`\sum_{n = ${0}}^{\infty} (a + nd)r^{n} = \frac{a}{${1} - r} + \frac{dr}{(${1} - r)^{${2}}}`}. In particular ${math`\sum_{n \ge ${1}} n r^{n - ${1}} = \frac{${1}}{(${1} - r)^{${2}}}`}.` },
    { kind: 'p', text: t`The method, from STEP ${3} Statistics Q${2}: write ${math`S`} and ${math`rS`} with equal powers of ${math`r`} lined up. In ${math`S - rS`} each pair of terms leaves ${math`d r^{n}`}, a geometric series, plus the first term ${math`a`}. So ${math`(${1} - r)S = a + \frac{dr}{${1} - r}`}.` },
    { kind: 'p', text: t`The other route is calculus: differentiate ${math`${1} + r + r^{${2}} + \cdots = \frac{${1}}{${1} - r}`} term by term to get ${math`${1} + ${2}r + ${3}r^{${2}} + \cdots = \frac{${1}}{(${1} - r)^{${2}}}`}. The STEP ${3} notes use it for the geometric distribution: ${math`E(X) = p(${1} + ${2}q + ${3}q^{${2}} + \cdots) = \frac{p}{p^{${2}}} = \frac{${1}}{p}`}. With ${math`p = ${HALF}`}, the expected number of tosses for a head is ${2}.` },
    { kind: 'p', text: t`A finite sum works the same way, with a leftover last term: ${math`\sum_{k = ${1}}^{n} k r^{k} = \frac{r\left(${1} - (n + ${1})r^{n} + nr^{n + ${1}}\right)}{(${1} - r)^{${2}}}`}. For ${math`r = ${2}`}, ${math`n = ${3}`}: ${math`${2} + ${8} + ${24} = ${finSum(q(2), 3)}`}.` },
  ],
  examples: [
    workedCambridge(q2s),
    worked(infiniteSum, { c: 1, d: 2, r: q(1, 2) }, t`An arithmetico-geometric series with ratio ${HALF}`),
    worked(contest, { a: q(1, 2), b: q(1, 3) }, t`The length of a contest`),
  ],
  generators: [infiniteSum, finiteSum, contest],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['arithmetico-geometric-series'],
  cambridge: [arthur, beta, contestMean, geomSecond, q2proofS, q2proofE],
  gate: ['s3-q2-arthur', 's3-q2-beta', 's3-q2-contest-shots', 's3-notes-geometric-second-moment', 's3-q2-prove-series', 's3-q2-prove-contest'],
};
