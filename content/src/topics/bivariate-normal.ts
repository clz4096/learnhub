/**
 * rv.bivariate-normal: the correlation coefficient and the bivariate normal, built from two
 * independent standard normals; jointly normal variables are independent exactly when
 * uncorrelated. From the Faculty schedule ("Correlation coefficient, bivariate normal
 * random variables") and IA Probability Example Sheet 4 Q7 (rotating two independent
 * N(0, 1) variables gives two independent N(0, 1) variables) and Q12(b) (linear
 * combinations of independent normals are independent if and only if their covariance is
 * 0). The sheet has no official solutions; covariances are checked by exact sums over
 * symmetric discrete variables with the same means and variances, which give the same
 * covariances as normals, and the orthant probability by simulation.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { add, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { distinctFrom, normal } from '../partv-c';
import { computedTex, math, t, type Rich } from '../rich';
import { worked, workedProof, type ProbabilityClaim, type TopicContent } from '../topic';

const S4 = 'ia-prob-sheet-4' as const;
const signed = (n: number, v: string, first: boolean): string => {
  if (n === 0) return '';
  const sign = n < 0 ? '-' : first ? '' : '+';
  const mag = Math.abs(n) === 1 ? '' : String(Math.abs(n));
  return `${first ? sign : ` ${sign} `}${mag}${v}`;
};
const combo = (a: number, b: number, x: string, y: string): string => (a === 0 ? signed(b, y, true) : `${signed(a, x, true)}${signed(b, y, false)}`);

// ---------------------------------------------------------------- covariance of two combinations

interface CovP { a: number; b: number; c: number; d: number; vx: number; vy: number }
const covVal = ({ a, b, c, d, vx, vy }: CovP): Rational => q(a * c * vx + b * d * vy);
function covMis(p: CovP): [Rational, Rich][] {
  return [
    [q(p.a * p.c + p.b * p.d), t`${math`\operatorname{cov}(X, X) = \operatorname{var}(X) = ${p.vx}`} and ${math`\operatorname{cov}(Y, Y) = ${p.vy}`}: multiply each product of coefficients by the variance.`],
    [q((p.a + p.b) * (p.c + p.d)), t`The cross terms ${math`\operatorname{cov}(X, Y)`} are ${0}, because ${math`X`} and ${math`Y`} are independent. Only ${math`ac\operatorname{var}(X) + bd\operatorname{var}(Y)`} is left.`],
    [q(p.a * p.c * p.vx - p.b * p.d * p.vy), t`Both terms come in with a plus sign: ${math`\operatorname{cov}(aX + bY, cX + dY) = ac\operatorname{var}(X) + bd\operatorname{var}(Y)`}, with the signs of the coefficients as given.`],
  ];
}
const C = [-3, -2, -1, 1, 2, 3];

const covCombos = generator<CovP>({
  id: 'cov-combinations',
  skill: 'Compute the covariance of two linear combinations of independent normals by bilinearity.',
  params: (rng) => {
    for (;;) {
      const p: CovP = { a: pick(rng, C), b: pick(rng, C), c: pick(rng, C), d: pick(rng, C), vx: int(rng, 1, 4), vy: int(rng, 1, 4) };
      if (distinctFrom(str(covVal(p)), covMis(p).map(([v]) => str(v))) >= 2) return p;
    }
  },
  sane: ({ vx, vy }) => (vx > 0 && vy > 0 ? null : 'out of range'),
  problem: (p) => ({
    prompt: t`${math`X \sim N(${0}, ${p.vx})`} and ${math`Y \sim N(${0}, ${p.vy})`} are independent. Let ${computedTex(`U = ${combo(p.a, p.b, 'X', 'Y')}`)} and ${computedTex(`V = ${combo(p.c, p.d, 'X', 'Y')}`)}. Find ${math`\operatorname{cov}(U, V)`}.`,
    answer: { kind: 'exact', expected: str(covVal(p)) },
    solution: [
      t`Covariance is bilinear: ${math`\operatorname{cov}(aX + bY, cX + dY) = ac\operatorname{var}(X) + (ad + bc)\operatorname{cov}(X, Y) + bd\operatorname{var}(Y)`}, and ${math`\operatorname{cov}(X, Y) = ${0}`} by independence.`,
      t`${computedTex(`(${p.a})(${p.c}) \\cdot ${p.vx} + (${p.b})(${p.d}) \\cdot ${p.vy}`)} ${math`= ${covVal(p)}`}. ${covVal(p).num === 0n ? t`So ${math`U`} and ${math`V`}, being jointly normal, are independent.` : t`Since it is not ${0}, ${math`U`} and ${math`V`} are not independent.`}`,
    ],
  }),
  solve: (p) => {
    // Stand-ins with the same means and variances: X in {-2, 0, 2} with P(X = ±2) = vx/8 each (variance vx), Y alike, independent.
    const atoms = (v: number): [number, Rational][] => [[-2, q(v, 8)], [0, sub(q(1), q(v, 4))], [2, q(v, 8)]];
    let [eu, ev, euv] = [q(0), q(0), q(0)];
    for (const [x, px] of atoms(p.vx)) for (const [y, py] of atoms(p.vy)) {
      const w = mul(px, py);
      const u = p.a * x + p.b * y;
      const v = p.c * x + p.d * y;
      eu = add(eu, mul(w, q(u)));
      ev = add(ev, mul(w, q(v)));
      euv = add(euv, mul(w, q(u * v)));
    }
    return str(sub(euv, mul(eu, ev)));
  },
  misconceptions: (p): Misconception[] => covMis(p).map(([v, why]) => ({ response: str(v), why })),
});

// ---------------------------------------------------------------- correlation of a construction

const TRIPLES: readonly [number, number, number][] = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [6, 8, 10], [8, 15, 17], [15, 8, 17], [7, 24, 25]];
interface CorrP { s: number; b: number; c: number; h: number; neg: boolean }
const corrVal = (p: CorrP): Rational => q((p.neg ? -1 : 1) * p.b, p.h);
function corrMis(p: CorrP): [Rational, Rich][] {
  const sb = (p.neg ? -1 : 1) * p.b;
  return [
    [q(sb * p.s), t`That is the covariance, ${math`\operatorname{cov}(X, Y) = ${sb * p.s}`}. Divide by both standard deviations, ${p.s} and ${math`\sqrt{${p.b}^{${2}} + ${p.c}^{${2}}} = ${p.h}`}.`],
    [q(sb, p.b + p.c), t`Standard deviations of independent parts do not add; variances do. ${math`\operatorname{var}(Y) = ${p.b}^{${2}} + ${p.c}^{${2}}`}, so ${math`\sigma_{Y} = ${p.h}`}.`],
    [q((p.neg ? -1 : 1) * p.b * p.b, p.h * p.h), t`That is ${math`\rho^{${2}}`} with the sign of ${math`\rho`}. Take the square root: ${math`\rho = \operatorname{cov}(X, Y)/(\sigma_{X}\sigma_{Y})`}.`],
  ];
}

const correlationOfConstruction = generator<CorrP>({
  id: 'correlation-construction',
  skill: 'Find the correlation coefficient of a pair built from independent standard normals, as in the construction of the bivariate normal.',
  params: (rng) => {
    for (;;) {
      const [b, c, h] = pick(rng, TRIPLES);
      const p: CorrP = { s: int(rng, 1, 4), b, c, h, neg: rng() < 0.4 };
      if (distinctFrom(str(corrVal(p)), corrMis(p).map(([v]) => str(v))) >= 2) return p;
    }
  },
  sane: ({ b, c, h }) => (b * b + c * c === h * h ? null : 'not a Pythagorean triple'),
  problem: (p) => ({
    prompt: t`${math`Z_{${1}}`} and ${math`Z_{${2}}`} are independent ${math`N(${0}, ${1})`} random variables. Let ${computedTex(`X = ${p.s === 1 ? '' : p.s}Z_{${1}}`)} and ${computedTex(`Y = ${p.neg ? '-' : ''}${p.b}Z_{${1}} + ${p.c}Z_{${2}}`)}. Find the correlation coefficient ${math`\rho(X, Y)`}.`,
    answer: { kind: 'exact', expected: str(corrVal(p)) },
    solution: [
      t`${math`\operatorname{cov}(X, Y) = ${p.s} \cdot ${(p.neg ? -1 : 1) * p.b}\operatorname{var}(Z_{${1}}) = ${(p.neg ? -1 : 1) * p.b * p.s}`}, since ${math`Z_{${1}}`} and ${math`Z_{${2}}`} are independent.`,
      t`${math`\operatorname{var}(X) = ${p.s * p.s}`} and ${math`\operatorname{var}(Y) = ${p.b * p.b} + ${p.c * p.c} = ${p.h * p.h}`}, so ${math`\rho = \frac{${(p.neg ? -1 : 1) * p.b * p.s}}{${p.s} \cdot ${p.h}} = ${corrVal(p)}`}.`,
    ],
  }),
  solve: (p) => {
    // Exact moments over the four sign patterns of two symmetric ±1 variables standing in for Z1, Z2 (same means, variances, covariances).
    let [exy, ex2, ey2] = [q(0), q(0), q(0)];
    for (const z1 of [-1, 1]) for (const z2 of [-1, 1]) {
      const x = p.s * z1;
      const y = (p.neg ? -1 : 1) * p.b * z1 + p.c * z2;
      exy = add(exy, q(x * y, 4));
      ex2 = add(ex2, q(x * x, 4));
      ey2 = add(ey2, q(y * y, 4));
    }
    // ρ = E(XY)/√(E X² E Y²); the square root is exact here because E X² E Y² is a square.
    const prod = Number(mul(ex2, ey2).num) / Number(mul(ex2, ey2).den);
    const root = Math.round(Math.sqrt(prod));
    return str(mul(exy, q(1, root)));
  },
  misconceptions: (p): Misconception[] => corrMis(p).map(([v, why]) => ({ response: str(v), why })),
});

// ---------------------------------------------------------------- the conditional mean

interface CmP { mx: number; my: number; sx: number; sy: number; rho: Rational; x: number }
const cmVal = (p: CmP): Rational => add(q(p.my), mul(mul(p.rho, q(p.sy, p.sx)), q(p.x - p.mx)));
function cmMis(p: CmP): [Rational, Rich][] {
  return [
    [add(q(p.my), mul(p.rho, q(p.x - p.mx))), t`Scale by the standard deviations: a change of one ${math`\sigma_{X}`} in ${math`x`} moves the mean of ${math`Y`} by ${math`\rho\,\sigma_{Y}`}, so the slope is ${math`\rho\,\sigma_{Y}/\sigma_{X}`}.`],
    [add(q(p.my), mul(mul(p.rho, q(p.sx, p.sy)), q(p.x - p.mx))), t`The ratio is upside down: the slope is ${math`\rho\,\sigma_{Y}/\sigma_{X}`}.`],
    [add(q(p.my), mul(q(p.sy, p.sx), q(p.x - p.mx))), t`That leaves out ${math`\rho`}: only a perfect correlation moves ${math`Y`} a full ${math`\sigma_{Y}`} for each ${math`\sigma_{X}`}. Weaker correlation pulls the prediction back toward ${math`\mu_{Y}`}.`],
  ];
}

const conditionalMean = generator<CmP>({
  id: 'conditional-mean',
  skill: 'Find E(Y | X = x) for a bivariate normal pair: the mean of Y moves by ρ σ_Y / σ_X per unit of x.',
  params: (rng) => {
    for (;;) {
      const p: CmP = { mx: int(rng, -5, 10), my: int(rng, -5, 10), sx: int(rng, 1, 5), sy: int(rng, 1, 5), rho: pick(rng, [q(1, 2), q(-1, 2), q(1, 4), q(3, 4), q(-3, 4), q(2, 5), q(-1, 3)]), x: 0 };
      p.x = p.mx + int(rng, -6, 6);
      if (p.x !== p.mx && p.sx !== p.sy && distinctFrom(str(cmVal(p)), cmMis(p).map(([v]) => str(v))) >= 2) return p;
    }
  },
  sane: ({ sx, sy }) => (sx > 0 && sy > 0 ? null : 'out of range'),
  problem: (p) => ({
    prompt: t`${math`(X, Y)`} is bivariate normal with ${math`\mu_{X} = ${p.mx}`}, ${math`\mu_{Y} = ${p.my}`}, ${math`\sigma_{X} = ${p.sx}`}, ${math`\sigma_{Y} = ${p.sy}`}, and correlation ${math`\rho = ${p.rho}`}. Find ${math`\mathbb{E}(Y \mid X = ${p.x})`}.`,
    answer: { kind: 'exact', expected: str(cmVal(p)) },
    solution: [
      t`Write ${math`X = \mu_{X} + \sigma_{X}Z_{${1}}`} and ${math`Y = \mu_{Y} + \sigma_{Y}\left(\rho Z_{${1}} + \sqrt{${1} - \rho^{${2}}}\,Z_{${2}}\right)`} with ${math`Z_{${1}}, Z_{${2}}`} independent standard normals. Knowing ${math`X = x`} fixes ${math`Z_{${1}} = (x - \mu_{X})/\sigma_{X}`} and says nothing about ${math`Z_{${2}}`}, whose mean is ${0}.`,
      t`So ${math`\mathbb{E}(Y \mid X = x) = \mu_{Y} + \rho\frac{\sigma_{Y}}{\sigma_{X}}(x - \mu_{X}) = ${p.my} + ${p.rho.num < 0n ? math`\left(${p.rho}\right)` : p.rho} \cdot ${q(p.sy, p.sx)} \cdot ${p.x - p.mx < 0 ? math`(${p.x - p.mx})` : p.x - p.mx} = ${cmVal(p)}`}.`,
    ],
  }),
  solve: (p) => {
    // Least squares: the best linear predictor a + b x has b = cov/var X = ρσxσy/σx², a = μy - b μx.
    const slope = mul(mul(p.rho, q(p.sx * p.sy)), q(1, p.sx * p.sx));
    return str(add(sub(q(p.my), mul(slope, q(p.mx))), mul(slope, q(p.x))));
  },
  misconceptions: (p): Misconception[] => cmMis(p).map(([v, why]) => ({ response: str(v), why })),
});

// ---------------------------------------------------------------- Cambridge problems

/** Symmetric stand-in for each X_i: values μ_i - 1, μ_i + 1, equally likely, variance 1; covariances of linear combinations are exactly those of normals with variance 1. */
function covByEnumeration(a: readonly Rational[], b: readonly Rational[]): Rational {
  const n = a.length;
  let [e1, e2, e12] = [q(0), q(0), q(0)];
  for (let mask = 0; mask < 1 << n; mask++) {
    const x = Array.from({ length: n }, (_, i) => q(((mask >> i) & 1) === 1 ? 1 : -1));
    const y1 = x.reduce((s, v, i) => add(s, mul(v, a[i] as Rational)), q(0));
    const y2 = x.reduce((s, v, i) => add(s, mul(v, b[i] as Rational)), q(0));
    const w = q(1, 2 ** n);
    e1 = add(e1, mul(w, y1));
    e2 = add(e2, mul(w, y2));
    e12 = add(e12, mul(w, mul(y1, y2)));
  }
  return sub(e12, mul(e1, e2));
}
const A = [q(1), q(2), q(-1)];
const B_KNOWN = [q(2), null, q(1)] as const;
const C_ANS = mul(add(mul(A[0] as Rational, B_KNOWN[0]), mul(A[2] as Rational, B_KNOWN[2])), q(-1, 2));
const q12b = auto({
  id: 'ia-s4-q12-b-coefficient',
  source: cite(S4, 'Q12(b)', true),
  title: t`Choosing a coefficient to make two normals independent`,
  prompt: t`${math`X_{${1}}, X_{${2}}, X_{${3}}`} are independent normal random variables, each with variance ${math`\sigma^{${2}}`}. Let ${math`Y_{${1}} = X_{${1}} + ${2}X_{${2}} - X_{${3}}`} and ${math`Y_{${2}} = ${2}X_{${1}} + cX_{${2}} + X_{${3}}`}. For which value of ${math`c`} are ${math`Y_{${1}}`} and ${math`Y_{${2}}`} independent?`,
  answer: { kind: 'exact', expected: str(C_ANS) },
  solution: [
    t`${math`Y_{${1}}`} and ${math`Y_{${2}}`} are linear combinations of the same independent normals, so they are jointly normal, and jointly normal variables are independent exactly when their covariance is ${0}.`,
    t`${math`\operatorname{cov}(Y_{${1}}, Y_{${2}}) = \sigma^{${2}}\left(${1} \cdot ${2} + ${2}c + (-${1}) \cdot ${1}\right) = \sigma^{${2}}(${1} + ${2}c)`}, which is ${0} when ${math`c = ${C_ANS}`}.`,
  ],
  reference: str(C_ANS),
  verify: () => {
    const zero = covByEnumeration(A, [q(2), C_ANS, q(1)]);
    if (zero.num !== 0n) return `cov at c = ${str(C_ANS)} is ${str(zero)}`;
    // Any other c gives a nonzero covariance.
    for (const c of [q(0), q(1), q(-1), q(1, 2)]) if (covByEnumeration(A, [q(2), c, q(1)]).num === 0n) return `cov also vanishes at c = ${str(c)}`;
    return null;
  },
  misconceptions: [
    { response: str(q(1, 2)), why: t`Check the sign: ${math`\sigma^{${2}}(${1} + ${2}c) = ${0}`} needs ${math`c`} negative.` },
    { response: '0', why: t`With ${math`c = ${0}`} the covariance is ${math`\sigma^{${2}}(${2} - ${1}) \ne ${0}`}: the first and third terms do not cancel on their own.` },
  ],
});

const [COS, SIN] = [q(3, 5), q(4, 5)];
const q7 = auto({
  id: 'ia-s4-q7-correlation',
  source: cite(S4, 'Q7', true),
  title: t`Correlation after a rotation`,
  prompt: t`${math`X`} and ${math`Y`} are independent ${math`N(${0}, ${1})`} random variables, and ${math`\theta`} has ${math`\cos\theta = ${COS}`}, ${math`\sin\theta = ${SIN}`}. Let ${math`U = X\cos\theta + Y\sin\theta`}. Find the correlation coefficient ${math`\rho(U, X)`}.`,
  answer: { kind: 'exact', expected: str(COS) },
  solution: [
    t`${math`\operatorname{var}(U) = \cos^{${2}}\theta + \sin^{${2}}\theta = ${1}`}, and ${math`\operatorname{cov}(U, X) = \cos\theta\operatorname{var}(X) = ${COS}`}.`,
    t`So ${math`\rho(U, X) = \frac{${COS}}{\sqrt{${1} \cdot ${1}}} = ${COS}`}. In fact ${math`U \sim N(${0}, ${1})`}: rotating a pair of independent standard normals gives another such pair.`,
  ],
  reference: str(COS),
  verify: () => {
    const cov = covByEnumeration([COS, SIN], [q(1), q(0)]);
    const varU = covByEnumeration([COS, SIN], [COS, SIN]);
    return same('cov(U, X), var(U)', `${str(cov)},${str(varU)}`, `${str(COS)},1`);
  },
  misconceptions: [
    { response: str(SIN), why: t`${math`U`} gets ${math`X`} with weight ${math`\cos\theta`}; ${math`\sin\theta`} is the weight of ${math`Y`}.` },
    { response: str(mul(COS, COS)), why: t`That is ${math`\rho^{${2}}`}, the share of the variance of ${math`U`} that comes from ${math`X`}.` },
  ],
});

const q12bWorked = workedProof({
  title: t`Normal combinations: independent exactly when uncorrelated`,
  prompt: t`Let ${math`X_{${1}}, \ldots, X_{n}`} be independent normal random variables, ${math`X_{i} \sim N(\mu_{i}, \sigma^{${2}})`}, and ${math`Y_{${1}} = \sum_{i} a_{i}X_{i}`}, ${math`Y_{${2}} = \sum_{i} b_{i}X_{i}`}. Prove that ${math`Y_{${1}}`} and ${math`Y_{${2}}`} are independent if and only if ${math`\operatorname{cov}(Y_{${1}}, Y_{${2}}) = ${0}`}.`,
  steps: [
    t`Independent variables with finite variances always have covariance ${0}, since ${math`\mathbb{E}(Y_{${1}}Y_{${2}}) = \mathbb{E}(Y_{${1}})\mathbb{E}(Y_{${2}})`}. That is the easy direction.`,
    t`For the converse, standardise: ${math`X_{i} = \mu_{i} + \sigma Z_{i}`} with ${math`Z_{${1}}, \ldots, Z_{n}`} independent ${math`N(${0}, ${1})`}. Then ${math`Y_{${1}} - \mathbb{E}Y_{${1}} = \sigma\,a \cdot Z`} and ${math`Y_{${2}} - \mathbb{E}Y_{${2}} = \sigma\,b \cdot Z`}, where ${math`Z = (Z_{${1}}, \ldots, Z_{n})`} and ${math`a, b`} are the coefficient vectors; ${math`\operatorname{cov}(Y_{${1}}, Y_{${2}}) = \sigma^{${2}}\,a \cdot b`}.`,
    t`The density of ${math`Z`}, ${math`(${2}\pi)^{-n/${2}}e^{-|z|^{${2}}/${2}}`}, depends only on ${math`|z|`}, so it is unchanged by any rotation of ${math`\mathbb{R}^{n}`} (the Jacobian of a rotation is ${1}). If ${math`a \cdot b = ${0}`}, choose an orthonormal basis whose first two vectors are ${math`a/|a|`} and ${math`b/|b|`}; the coordinates of ${math`Z`} in it are again independent ${math`N(${0}, ${1})`}.`,
    t`${math`Y_{${1}}`} is a function of the first coordinate and ${math`Y_{${2}}`} of the second, so they are independent. (If ${math`a`} or ${math`b`} is ${0}, that variable is constant and independent of everything.)`,
  ],
  answer: t`${math`Y_{${1}}`} and ${math`Y_{${2}}`} are independent if and only if ${math`\sum_{i} a_{i}b_{i} = ${0}`}, that is, ${math`\operatorname{cov}(Y_{${1}}, Y_{${2}}) = ${0}`}.`,
  source: cite(S4, 'Q12(b)'),
});

const q7proof = supervision({
  id: 'ia-s4-q7',
  source: cite(S4, 'Q7'),
  title: t`Rotating two standard normals`,
  prompt: t`Suppose that ${math`X`} and ${math`Y`} are independent ${math`N(${0}, ${1})`} random variables. Show that, for any fixed ${math`\theta`}, the random variables ${math`U = X\cos\theta + Y\sin\theta`} and ${math`V = -X\sin\theta + Y\cos\theta`} are independent, and find their distributions. Use the joint density and the Jacobian of the map ${math`(x, y) \mapsto (u, v)`}.`,
  writeUp: 'proof',
});
const scheduleBivariate = supervision({
  id: 'schedule-bivariate-normal',
  source: cite('tripos-schedules', 'IA Probability, Continuous random variables: "bivariate normal random variables"', true),
  title: t`Normal margins are not enough`,
  prompt: t`Let ${math`X \sim N(${0}, ${1})`} and let ${math`S`} be ${1} or ${math`-${1}`} with probability ${q(1, 2)} each, independent of ${math`X`}. Show that ${math`Y = SX`} is ${math`N(${0}, ${1})`} and that ${math`\operatorname{cov}(X, Y) = ${0}`}, but that ${math`X`} and ${math`Y`} are not independent. Why does this not contradict the theorem that jointly normal variables with covariance ${0} are independent?`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

const HALF = q(1, 2);
const ORTHANT = q(1, 3);
const claims: ProbabilityClaim[] = [
  {
    what: 'standard bivariate normal with rho = 1/2: P(X > 0, Y > 0)',
    exact: ORTHANT,
    trial: (rng) => {
      const z1 = normal(rng);
      const z2 = normal(rng);
      return z1 > 0 && 0.5 * z1 + Math.sqrt(0.75) * z2 > 0;
    },
  },
];

export const bivariateNormal: TopicContent = {
  topicId: 'rv.bivariate-normal',
  goal: t`Build the bivariate normal from independent standard normals, read off its correlation, and use the fact that jointly normal variables are independent exactly when uncorrelated.`,
  lesson: [
    { kind: 'p', text: t`The correlation coefficient measures how nearly linear the relation between two variables is. For one family, the bivariate normal, it says everything about their dependence: zero correlation means independence.` },
    { kind: 'rule', text: t`A pair ${math`(X, Y)`} is [[bivariate-normal|bivariate normal]] if ${math`X = \mu_{X} + \sigma_{X}Z_{${1}}`} and ${math`Y = \mu_{Y} + \sigma_{Y}\left(\rho Z_{${1}} + \sqrt{${1} - \rho^{${2}}}\,Z_{${2}}\right)`} for independent ${math`Z_{${1}}, Z_{${2}} \sim N(${0}, ${1})`} and ${math`-${1} < \rho < ${1}`}. Then ${math`X \sim N(\mu_{X}, \sigma_{X}^{${2}})`}, ${math`Y \sim N(\mu_{Y}, \sigma_{Y}^{${2}})`}, and ${math`\operatorname{cov}(X, Y) = \rho\,\sigma_{X}\sigma_{Y}`}, so ${math`\rho`} is the correlation coefficient.` },
    { kind: 'p', text: t`By the Jacobian of the map from ${math`(Z_{${1}}, Z_{${2}})`}, the joint density is ${math`f(x, y) = \frac{${1}}{${2}\pi\sigma_{X}\sigma_{Y}\sqrt{${1} - \rho^{${2}}}}\exp\left(-\frac{u^{${2}} - ${2}\rho uv + v^{${2}}}{${2}(${1} - \rho^{${2}})}\right)`}, with ${math`u = (x - \mu_{X})/\sigma_{X}`} and ${math`v = (y - \mu_{Y})/\sigma_{Y}`}. It is fixed by the two means, the two variances, and the covariance.` },
    { kind: 'rule', text: t`For jointly normal variables, [[normal-independence|independent if and only if uncorrelated]]: at ${math`\rho = ${0}`} the density splits into a function of ${math`x`} times a function of ${math`y`}. More generally, linear combinations of independent normals are jointly normal, and two of them are independent exactly when their covariance is ${0} (Sheet ${4} Q${12}(b)).` },
    { kind: 'p', text: t`Rotations preserve a pair of independent standard normals: ${math`U = X\cos\theta + Y\sin\theta`} and ${math`V = -X\sin\theta + Y\cos\theta`} are again independent ${math`N(${0}, ${1})`} (Q${7}), because the density ${math`\frac{${1}}{${2}\pi}e^{-(x^{${2}} + y^{${2}})/${2}}`} depends only on the distance from the origin. The same symmetry gives ${math`\mathbb{P}(X > ${0}, Y > ${0}) = \frac{${1}}{${4}} + \frac{\arcsin\rho}{${2}\pi}`} for a standard bivariate normal; at ${math`\rho = ${HALF}`} that is ${ORTHANT}.` },
    { kind: 'p', text: t`Knowing ${math`X = x`} fixes ${math`Z_{${1}}`} and leaves ${math`Z_{${2}}`} alone, so ${math`\mathbb{E}(Y \mid X = x) = \mu_{Y} + \rho\frac{\sigma_{Y}}{\sigma_{X}}(x - \mu_{X})`}: a straight line, pulled toward ${math`\mu_{Y}`} when ${math`|\rho| < ${1}`}. Beware: two normal variables need not be jointly normal, and then zero correlation does not give independence.` },
  ],
  examples: [
    q12bWorked,
    worked(correlationOfConstruction, { s: 2, b: 3, c: 4, h: 5, neg: false }, t`Reading the correlation off the construction`),
    worked(conditionalMean, { mx: 170, my: 70, sx: 10, sy: 8, rho: q(1, 2), x: 180 }, t`Predicting ${math`Y`} from ${math`X`}`),
  ],
  generators: [covCombos, correlationOfConstruction, conditionalMean],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['bivariate-normal', 'normal-independence'],
  claims,
  cambridge: [q12b, q7, q7proof, scheduleBivariate],
  gate: ['ia-s4-q12-b-coefficient', 'ia-s4-q7-correlation', 'ia-s4-q7'],
};
