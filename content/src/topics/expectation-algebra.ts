/**
 * rv.expectation-algebra: E(aX + bY + c) = aE(X) + bE(Y) + c always; Var(aX + b) = a^2 Var(X);
 * and, for independent X and Y, E(XY) = E(X)E(Y) and Var(aX + bY + c) = a^2 Var(X) + b^2 Var(Y).
 * From the STEP 3 Statistics topic notes (page 1, "Algebra of Expectations") and STEP 3
 * Statistics Q3 (2013 S3 Q12: a As and b Bs in a random row), whose E(X1 Xj) shows two
 * dependent indicators with E(XY) ≠ E(X)E(Y), and whose Var(S) uses Var = E(S^2) - E(S)^2.
 * Checked by listing every row for 2 ≤ a, b ≤ 5 and compared with the official solutions. The
 * second gate (batch 9) is 2006 STEP III Q14, first two paragraphs: the perimeter and area of a
 * plate with independent length and breadth, their means and standard deviations from the rules
 * for E alone, and why the perimeter and area are not independent. The later parts need
 * covariance, taught later, so they are not set.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, mul, pick, q, str, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, math, paren, t } from '../rich';
import { quickCheck, worked, workedCambridge, type TopicContent } from '../topic';
import { average, positions, throwsOf, variance, type Dist } from '../partv-a';

const S3 = 'step-s3-stats' as const;
const S3S = 'step-s3-stats-solutions' as const;
const NOTES = 'step-s3-stats-notes' as const;
const distinctFrom = (right: string, xs: readonly string[]): number => new Set(xs.filter((x) => x !== right)).size;
/** "+ 3" or "- 3" after a first term, as LaTeX built from a computed number. */
const sgn = (n: number | Rational): string => {
  const r = typeof n === 'number' ? q(n) : n;
  const neg = r.num < 0n;
  const mag = neg ? { num: -r.num, den: r.den } : r;
  const tex = mag.den === 1n ? `${mag.num}` : `\\frac{${mag.num}}{${mag.den}}`;
  return `${neg ? '-' : '+'} ${tex}`;
};
const coef = (a: number): string => (a === 1 ? '' : a === -1 ? '-' : `${a}`);

// ---------------------------------------------------------------- aX + b

interface LinP { a: number; b: number; mu: number; v: number; ask: 'mean' | 'var' }
const linAnswer = (p: LinP): number => (p.ask === 'mean' ? p.a * p.mu + p.b : p.a * p.a * p.v);
const linMis = (p: LinP): number[] => (p.ask === 'mean' ? [p.a * p.mu, p.mu + p.b, p.a * (p.mu + p.b)] : [p.a * p.v, p.a * p.a * p.v + p.b, p.a * p.a * p.v + p.b * p.b]);

const linear = generator<LinP>({
  id: 'linear-transform',
  skill: 'Use E(aX + b) = aE(X) + b and Var(aX + b) = a^2 Var(X).',
  params: (rng) => {
    for (;;) {
      const p: LinP = { a: pick(rng, [-3, -2, 2, 3, 4, 5]), b: pick(rng, [-7, -4, -1, 1, 3, 6, 10]), mu: int(rng, -3, 8), v: int(rng, 1, 9), ask: pick(rng, ['mean', 'var'] as const) };
      if (distinctFrom(String(linAnswer(p)), linMis(p).map(String)) >= 2) return p;
    }
  },
  sane: ({ v }) => (v >= 1 ? null : 'out of range'),
  problem: (p) => {
    const Y = computedTex(`${coef(p.a)}X ${sgn(p.b)}`);
    return {
      prompt: t`${math`E(X) = ${p.mu}`} and ${math`\mathrm{Var}(X) = ${p.v}`}. Find ${p.ask === 'mean' ? math`E(${Y})` : math`\mathrm{Var}(${Y})`}.`,
      answer: { kind: 'exact', expected: String(linAnswer(p)) },
      solution: p.ask === 'mean'
        ? [t`Expectation is linear: ${math`E(${Y}) = ${p.a}E(X) ${computedTex(sgn(p.b))} = ${p.a} \times ${paren(p.mu)} ${computedTex(sgn(p.b))} = ${linAnswer(p)}`}.`]
        : [t`The constant ${p.b} shifts every value by the same amount and does not change the spread; multiplying by ${p.a} multiplies every distance from the mean by ${p.a}, so squared distances by ${p.a * p.a}.`, t`${math`\mathrm{Var}(${Y}) = (${p.a})^{${2}} \times ${p.v} = ${linAnswer(p)}`}.`],
    };
  },
  solve: (p) => {
    // A two-point X with this mean and variance (μ ± √v, each with probability 1/2), transformed value by value.
    const s = Math.sqrt(p.v);
    const ys = [p.mu - s, p.mu + s].map((x) => p.a * x + p.b);
    const m = (ys[0] as number + (ys[1] as number)) / 2;
    const val = p.ask === 'mean' ? m : ((ys[0] as number - m) ** 2 + (ys[1] as number - m) ** 2) / 2;
    return String(Math.round(val));
  },
  misconceptions: (p): Misconception[] => {
    const [x, y, z] = linMis(p).map(String);
    return p.ask === 'mean'
      ? [
          { response: x as string, why: t`The constant comes through: ${math`E(aX + b) = aE(X) + b`}.` },
          { response: y as string, why: t`Multiply the mean by ${p.a} as well: every value of ${math`X`} is multiplied by it.` },
          { response: z as string, why: t`Only ${math`X`} is multiplied by ${p.a}, not the constant: ${math`aE(X) + b`}.` },
        ]
      : [
          { response: x as string, why: t`Variance scales by the square: ${math`\mathrm{Var}(aX) = a^{${2}}\mathrm{Var}(X)`}.` },
          { response: y as string, why: t`Adding a constant does not change the variance: the spread is the same.` },
          { response: z as string, why: t`A constant has no variance: ${math`\mathrm{Var}(aX + b) = a^{${2}}\mathrm{Var}(X)`}, with no ${math`b`} in it.` },
        ];
  },
});

// ---------------------------------------------------------------- aX + bY + c, independent

interface CombP { a: number; b: number; c: number; mx: number; my: number; vx: number; vy: number; ask: 'mean' | 'var' }
const combAnswer = (p: CombP): number => (p.ask === 'mean' ? p.a * p.mx + p.b * p.my + p.c : p.a * p.a * p.vx + p.b * p.b * p.vy);
const combMis = (p: CombP): number[] => (p.ask === 'mean'
  ? [p.a * p.mx + p.b * p.my, p.mx + p.my + p.c, p.a * p.mx - p.b * p.my + p.c]
  : [p.a * p.a * p.vx - p.b * p.b * p.vy, p.a * p.vx + p.b * p.vy, p.a * p.a * p.vx + p.b * p.b * p.vy + p.c]);

const combination = generator<CombP>({
  id: 'independent-combination',
  skill: 'Find the mean and variance of aX + bY + c for independent X and Y: the variances add with squared coefficients, even for a difference.',
  params: (rng) => {
    for (;;) {
      const p: CombP = {
        a: pick(rng, [1, 2, 3, -2]), b: pick(rng, [-3, -2, -1, 2, 4]), c: pick(rng, [-5, -2, 1, 4, 7]),
        mx: int(rng, -2, 9), my: int(rng, -2, 9), vx: int(rng, 1, 6), vy: int(rng, 1, 6), ask: pick(rng, ['mean', 'var'] as const),
      };
      if (distinctFrom(String(combAnswer(p)), combMis(p).map(String)) >= 2) return p;
    }
  },
  sane: ({ vx, vy }) => (vx >= 1 && vy >= 1 ? null : 'out of range'),
  problem: (p) => {
    const W = computedTex(`${coef(p.a)}X ${p.b < 0 ? '-' : '+'} ${coef(Math.abs(p.b))}Y ${sgn(p.c)}`);
    return {
      prompt: t`${math`X`} and ${math`Y`} are independent, with ${math`E(X) = ${p.mx}`}, ${math`\mathrm{Var}(X) = ${p.vx}`}, ${math`E(Y) = ${p.my}`}, and ${math`\mathrm{Var}(Y) = ${p.vy}`}. Find ${p.ask === 'mean' ? math`E(${W})` : math`\mathrm{Var}(${W})`}.`,
      answer: { kind: 'exact', expected: String(combAnswer(p)) },
      solution: p.ask === 'mean'
        ? [t`${math`E(${W}) = ${p.a}E(X) ${computedTex(sgn(p.b))}E(Y) ${computedTex(sgn(p.c))} = ${combAnswer(p)}`}. Linearity needs no independence.`]
        : [t`For independent ${math`X`} and ${math`Y`}, ${math`\mathrm{Var}(aX + bY + c) = a^{${2}}\mathrm{Var}(X) + b^{${2}}\mathrm{Var}(Y)`}: the coefficients are squared, so a minus sign does not subtract, and the constant drops out.`, t`${math`(${p.a})^{${2}} \times ${p.vx} + (${p.b})^{${2}} \times ${p.vy} = ${combAnswer(p)}`}.`],
    };
  },
  solve: (p) => {
    // Two-point independent X and Y (mean ± sqrt(var), each with probability 1/2): all four pairs.
    const sx = Math.sqrt(p.vx);
    const sy = Math.sqrt(p.vy);
    const ws = [-1, 1].flatMap((i) => [-1, 1].map((j) => p.a * (p.mx + i * sx) + p.b * (p.my + j * sy) + p.c));
    const m = ws.reduce((s, w) => s + w, 0) / 4;
    const v = ws.reduce((s, w) => s + (w - m) ** 2, 0) / 4;
    return String(Math.round(p.ask === 'mean' ? m : v));
  },
  misconceptions: (p): Misconception[] => {
    const [x, y, z] = combMis(p).map(String);
    return p.ask === 'mean'
      ? [
          { response: x as string, why: t`Keep the constant: ${math`E(aX + bY + c) = aE(X) + bE(Y) + c`}.` },
          { response: y as string, why: t`Multiply each mean by its coefficient.` },
          { response: z as string, why: t`Keep the sign of the coefficient of ${math`Y`}: it is ${p.b}, so that term is ${math`${p.b}E(Y)`}.` },
        ]
      : [
          { response: x as string, why: t`Variances of independent variables add even for a difference: ${math`b^{${2}}`} is positive whatever the sign of ${math`b`}.` },
          { response: y as string, why: t`Square the coefficients: ${math`\mathrm{Var}(aX) = a^{${2}}\mathrm{Var}(X)`}.` },
          { response: z as string, why: t`The constant shifts the values and has no variance: leave it out.` },
        ];
  },
});

// ---------------------------------------------------------------- dice: a sum or a difference

interface DiceP { m: number; k: number; kind: 'sum' | 'difference' }
const oneDie = (m: number): Rational => q(m * m - 1, 12);
const diceAnswer = (p: DiceP): Rational => mul(q(p.kind === 'sum' ? p.k : 2), oneDie(p.m));
const diceMis = (p: DiceP): string[] => (p.kind === 'sum'
  ? [str(mul(q(p.k * p.k), oneDie(p.m))), str(oneDie(p.m)), str(mul(q(p.k), q((p.m + 1) * (2 * p.m + 1), 6)))]
  : ['0', str(oneDie(p.m)), str(mul(q(4), oneDie(p.m)))]);

const dice = generator<DiceP>({
  id: 'dice-sum',
  skill: 'Find the variance of a sum or difference of independent dice by adding variances.',
  params: (rng) => {
    for (;;) {
      const kind = pick(rng, ['sum', 'difference'] as const);
      const p: DiceP = { m: pick(rng, [4, 6, 8]), k: kind === 'sum' ? int(rng, 2, 4) : 2, kind };
      if (p.m ** p.k <= 4096 && distinctFrom(str(diceAnswer(p)), diceMis(p)) >= 2) return p;
    }
  },
  sane: ({ m, k }) => (m >= 4 && k >= 2 ? null : 'out of range'),
  problem: (p) => {
    const one = oneDie(p.m);
    const what = p.kind === 'sum' ? t`the total ${math`S`} of ${p.k} fair ${p.m}-sided dice, numbered ${1} to ${p.m}` : t`the difference ${math`D = X_{${1}} - X_{${2}}`} of the scores on two fair ${p.m}-sided dice, numbered ${1} to ${p.m}`;
    return {
      prompt: t`Find the variance of ${what}.`,
      answer: { kind: 'exact', expected: str(diceAnswer(p)) },
      solution: [
        t`One die: ${math`E(X) = ${q(p.m + 1, 2)}`} and ${math`E(X^{${2}}) = \frac{(${p.m} + ${1})(${2} \times ${p.m} + ${1})}{${6}} = ${q((p.m + 1) * (2 * p.m + 1), 6)}`}, so ${math`\mathrm{Var}(X) = ${q((p.m + 1) * (2 * p.m + 1), 6)} - ${mul(q(p.m + 1, 2), q(p.m + 1, 2))} = ${one}`}.`,
        p.kind === 'sum'
          ? t`The dice are independent, so the variances add: ${math`\mathrm{Var}(S) = ${p.k} \times ${one} = ${diceAnswer(p)}`}. Not ${math`${p.k}^{${2}}`} times: ${math`S`} is a sum of ${p.k} different dice, not one die multiplied by ${p.k}.`
          : t`For independent dice, ${math`\mathrm{Var}(X_{${1}} - X_{${2}}) = \mathrm{Var}(X_{${1}}) + (-${1})^{${2}}\mathrm{Var}(X_{${2}}) = ${2} \times ${one} = ${diceAnswer(p)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Every outcome of the dice listed.
    const outs = throwsOf(p.m, p.k);
    const f = (o: readonly number[]): number => (p.kind === 'sum' ? o.reduce((s, x) => s + x, 0) : (o[0] as number) - (o[1] as number));
    const values = new Map<number, number>();
    for (const o of outs) values.set(f(o), (values.get(f(o)) ?? 0) + 1);
    const d: Dist = [...values].map(([v, c]) => [q(v), q(c, outs.length)] as const);
    return str(variance(d));
  },
  misconceptions: (p): Misconception[] => {
    const [x, y, z] = diceMis(p);
    return p.kind === 'sum'
      ? [
          { response: x as string, why: t`That is ${math`\mathrm{Var}(${p.k}X) = ${p.k * p.k}\mathrm{Var}(X)`}, one die counted ${p.k} times. Independent dice add their variances: ${p.k} times, not ${p.k * p.k}.` },
          { response: y as string, why: t`That is one die. Each of the ${p.k} independent dice adds its variance.` },
          { response: z as string, why: t`That adds ${math`E(X^{${2}})`} for each die. Subtract the square of the mean first.` },
        ]
      : [
          { response: x as string, why: t`Variances never cancel: for independent dice, ${math`\mathrm{Var}(X_{${1}} - X_{${2}}) = \mathrm{Var}(X_{${1}}) + \mathrm{Var}(X_{${2}})`}.` },
          { response: y as string, why: t`That is one die. Both dice contribute their spread to the difference.` },
          { response: z as string, why: t`${math`(${2})^{${2}}`} would be for ${math`${2}X`}, one die doubled. Two independent dice give ${math`${2}\mathrm{Var}(X)`}.` },
        ];
  },
});

// ---------------------------------------------------------------- Cambridge problems: a As and b Bs

/** Every row of a As and b Bs, as the set of places of the As (all equally likely). */
const rows = (a: number, b: number): number[][] => positions(a + b, a);
/** X_k for a row given by the places of its As: X_1 = first is A; X_k = (k-1)th is B and kth is A. */
const xk = (as: readonly number[], k: number): number => (k === 1 ? (as.includes(0) ? 1 : 0) : !as.includes(k - 2) && as.includes(k - 1) ? 1 : 0);
const AB_DOM = { a: { kind: 'integer' as const, min: 2, max: 9 }, b: { kind: 'integer' as const, min: 2, max: 9 } };

const q3iia = auto({
  id: 's3-q3-ii-a',
  source: cite(S3, 'Q3(ii)(a)', true),
  title: t`A product of two indicators`,
  prompt: t`A row has ${math`a`} letters A and ${math`b`} letters B, with ${math`a, b \ge ${2}`} and ${math`n = a + b`}, every order equally likely. ${math`X_{${1}} = ${1}`} if the first letter is A, and for ${math`k \ge ${2}`}, ${math`X_{k} = ${1}`} if the ${math`(k - ${1})`}th letter is B and the ${math`k`}th is A; otherwise they are ${0}. For ${math`j \ge ${3}`}, find ${math`E(X_{${1}}X_{j})`} in terms of ${math`a`} and ${math`b`}.`,
  answer: { kind: 'expression', expected: 'a(a - 1)b/((a + b)(a + b - 1)(a + b - 2))', variables: ['a', 'b'], domains: AB_DOM },
  solution: [
    t`${math`X_{${1}}X_{j}`} is ${1} exactly when both are ${1}: the first letter is A, the ${math`(j - ${1})`}th is B, and the ${math`j`}th is A. For ${math`j \ge ${3}`} these are three different places.`,
    t`Fill those places in turn: ${math`\frac{a}{n} \times \frac{b}{n - ${1}} \times \frac{a - ${1}}{n - ${2}}`}. So ${math`E(X_{${1}}X_{j}) = \frac{a(a - ${1})b}{n(n - ${1})(n - ${2})}`}.`,
    t`Compare ${math`E(X_{${1}})E(X_{j}) = \frac{a}{n} \times \frac{ab}{n(n - ${1})}`}: different, because ${math`X_{${1}}`} and ${math`X_{j}`} are not independent (an A at the start leaves fewer As). The product rule for expectations needs independence; linearity does not.`,
  ],
  reference: 'a(a - 1)b/((a + b)(a + b - 1)(a + b - 2))',
  verify: () => {
    for (let a = 2; a <= 5; a++) for (let b = 2; b <= 5; b++) {
      const n = a + b;
      for (let j = 3; j <= n; j++) {
        const e = same(`a = ${a}, b = ${b}, j = ${j}, every row`, str(average(rows(a, b), (as) => q(xk(as, 1) * xk(as, j)))), str(q(a * (a - 1) * b, n * (n - 1) * (n - 2))));
        if (e !== null) return e;
      }
    }
    return null;
  },
  misconceptions: [{ response: 'a^2 b/((a + b)^2 (a + b - 1))', why: t`That is ${math`E(X_{${1}})E(X_{j})`}, which assumes independence. Count the rows with A first and BA at places ${math`j - ${1}`}, ${math`j`}.` }],
  official: { source: cite(S3S, 'Q3(ii)(a)'), answer: 'a(a - 1)b/((a + b)(a + b - 1)(a + b - 2))', agrees: true },
});

// The notes' rule with numbers: X uniform on 1 to 5 (variance 2) and Y equally likely 0 or 6 (variance 9), independent.
const XS = [1, 2, 3, 4, 5];
const YS = [0, 6];
const notesVar = 4 * 2 + 9 * 9;
const notesComb = auto({
  id: 's3-notes-combination',
  source: cite(NOTES, 'page 1', true),
  title: t`Variance of a combination`,
  prompt: t`${math`X`} and ${math`Y`} are independent random variables with ${math`\mathrm{Var}(X) = ${2}`} and ${math`\mathrm{Var}(Y) = ${9}`}. Find ${math`\mathrm{Var}(${2}X - ${3}Y + ${1})`}.`,
  answer: { kind: 'exact', expected: String(notesVar) },
  solution: [
    t`For independent variables, ${math`\mathrm{Var}(aX + bY + c) = a^{${2}}\mathrm{Var}(X) + b^{${2}}\mathrm{Var}(Y)`}: ${math`${4} \times ${2} + ${9} \times ${9} = ${notesVar}`}.`,
    t`Square the coefficients, drop the constant, and add for independent terms.`,
  ],
  nudge: t`Not quite. Recall what happens to a coefficient, and to a constant, inside a variance.`,
  hints: [
    t`What is ${math`\mathrm{Var}(aX)`} in terms of ${math`\mathrm{Var}(X)`}?`,
    t`What does adding a constant do to a variance?`,
    t`For independent ${math`X`} and ${math`Y`}, how do the variances of ${math`${2}X`} and ${math`-${3}Y`} combine?`,
  ],
  reference: String(notesVar),
  verify: () => {
    // A concrete pair with these variances, every one of the 10 equally likely outcomes listed.
    const vx = variance(XS.map((x) => [q(x), q(1, 5)] as const));
    const vy = variance(YS.map((y) => [q(y), q(1, 2)] as const));
    const w = XS.flatMap((x) => YS.map((y) => 2 * x - 3 * y + 1));
    const dw: Dist = w.map((v) => [q(v), q(1, w.length)] as const);
    return same('the variances of X and Y', `${str(vx)},${str(vy)}`, '2,9') ?? same('Var(2X - 3Y + 1) listed', str(variance(dw)), String(notesVar));
  },
  misconceptions: [
    { response: String(4 * 2 - 9 * 9), why: t`Variances add even for a difference: ${math`(-${3})^{${2}} = ${9}`}.` },
    { response: String(2 * 2 - 3 * 9), why: t`Square the coefficients: ${math`\mathrm{Var}(aX) = a^{${2}}\mathrm{Var}(X)`}.` },
  ],
});

const notesProof = supervision({
  id: 's3-notes-proofs',
  source: cite(NOTES, 'page 1'),
  title: t`Why the rules hold`,
  prompt: t`For discrete random variables, prove that ${math`E(aX + bY + c) = aE(X) + bE(Y) + c`} (with no independence assumed), that ${math`\mathrm{Var}(aX + b) = a^{${2}}\mathrm{Var}(X)`}, and that for independent ${math`X`} and ${math`Y`}, ${math`E(XY) = E(X)E(Y)`} and ${math`\mathrm{Var}(aX + bY + c) = a^{${2}}\mathrm{Var}(X) + b^{${2}}\mathrm{Var}(Y)`}. Where exactly is independence used?`,
  writeUp: 'proof',
  hints: [
    t`How is ${math`E(aX + bY + c)`} written as a sum over the joint distribution of ${math`X`} and ${math`Y`}?`,
    t`What is ${math`(aX + b) - E(aX + b)`}, and what happens when it is squared?`,
    t`Which step of ${math`E(XY) = E(X)E(Y)`} splits ${math`P(X = x, Y = y)`} into a product, and which step of the variance rule needs ${math`E(XY) = E(X)E(Y)`}?`,
  ],
});

// 2006 STEP III Q14, first two paragraphs: the plates.
const [X1, X2] = [math`X_{${1}}`, math`X_{${2}}`];
const step06Plates = supervision({
  id: 'step06-q14',
  source: cite('stepdb-06-s3', 'Q14, first two paragraphs'),
  title: t`The perimeter and area of a plate`,
  prompt: t`For any random variables ${X1} and ${X2}, state the relationship between ${math`E(aX_{${1}} + bX_{${2}})`} and ${math`E(X_{${1}})`} and ${math`E(X_{${2}})`}, where ${math`a`} and ${math`b`} are constants. If ${X1} and ${X2} are independent, state the relationship between ${math`E(X_{${1}}X_{${2}})`} and ${math`E(X_{${1}})`} and ${math`E(X_{${2}})`}. An industrial process produces rectangular plates. The length and the breadth of the plates are modelled by independent random variables ${X1} and ${X2} with non-zero means ${math`\mu_{${1}}`} and ${math`\mu_{${2}}`} and non-zero standard deviations ${math`\sigma_{${1}}`} and ${math`\sigma_{${2}}`}, respectively. Using the results in the paragraph above, and without quoting a formula for ${math`\operatorname{Var}(aX_{${1}} + bX_{${2}})`}, find the means and standard deviations of the perimeter ${math`P`} and area ${math`A`} of the plates. Show that ${math`P`} and ${math`A`} are not independent.`,
  writeUp: 'proof',
  hints: [
    t`What are ${math`P`} and ${math`A`} in terms of ${X1} and ${X2}?`,
    t`How is ${math`E(X_{${1}}^{${2}})`} related to ${math`\mu_{${1}}`} and ${math`\sigma_{${1}}`}, and what is ${math`E(A^{${2}})`} for independent ${X1} and ${X2}?`,
    t`If ${math`P`} and ${math`A`} were independent, what would ${math`E(PA)`} equal, and does it?`,
  ],
  official: cite('stepdb-06-ha', 'STEP III, Q14 (page 33 of the PDF)'),
});

// ---------------------------------------------------------------- lesson

const [mX, mY, ma, mb] = [math`X`, math`Y`, math`a`, math`b`];
const DIE = q(35, 12);

export const expectationAlgebra: TopicContent = {
  topicId: 'rv.expectation-algebra',
  goal: t`Use ${math`E(aX + bY + c) = aE(X) + bE(Y) + c`} for any ${math`X`} and ${math`Y`}, and ${math`\mathrm{Var}(aX + bY + c) = a^{${2}}\mathrm{Var}(X) + b^{${2}}\mathrm{Var}(Y)`} when they are independent.`,
  objective: t`Find means and variances of combinations of random variables without finding their distributions.`,
  why: t`These rules turn hard distributions into easy sums; next come indicator variables and the general theory.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Means of combinations` },
    { kind: 'hook', text: t`Roll ${3} dice and add them. Finding the distribution of the total means counting ${6 ** 3} outcomes. Yet its mean is simply ${math`${3} \times ${q(7, 2)}`}, three times one die's, and even its variance can be had in one line. The STEP ${3} topic notes call the tools the algebra of expectations.` },
    {
      kind: 'theorem',
      name: t`Linearity of expectation`,
      statement: t`For any random variables ${mX} and ${mY} with finite means, and constants ${ma}, ${mb}, ${math`c`}: ${math`E(aX + bY + c) = aE(X) + bE(Y) + c`}.`,
    },
    {
      kind: 'p',
      text: t`This is [[linearity-of-expectation|linearity of expectation]]. The striking part is what it does not need: ${mX} and ${mY} may depend on each other in any way at all. The total of three dice has mean ${math`${q(7, 2)} + ${q(7, 2)} + ${q(7, 2)} = ${mul(q(3), q(7, 2))}`}.`,
      why: { q: t`Why does it hold without independence?`, a: t`${math`E(X + Y)`} is a sum over outcomes of ${math`(X + Y)`} times the probability of the outcome. That splits into the same sum for ${mX} plus the same sum for ${mY}: no product of probabilities ever appears, so independence is never needed.` },
    },
    { kind: 'section', title: t`Variance of a linear function` },
    { kind: 'narrative', text: t`Variance measures spread: ${math`\mathrm{Var}(X) = E\big((X - \mu)^{${2}}\big)`}, with ${math`\mu = E(X)`}. Picture the values on a line. Adding ${mb} slides every value, and the mean, along by ${mb}: no distance from the mean changes. Multiplying by ${ma} stretches every distance by ${ma}, so every squared distance by ${math`a^{${2}}`}.` },
    { kind: 'theorem', statement: t`For a random variable ${mX} with finite variance and constants ${ma}, ${mb}: ${math`\mathrm{Var}(aX + b) = a^{${2}}\mathrm{Var}(X)`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`The new mean`, text: t`Let ${math`\mu = E(X)`}. By linearity, ${math`E(aX + b) = a\mu + b`}.`, plain: t`Linearity with one variable.` },
        { label: t`The new distance from the mean`, text: t`${math`(aX + b) - (a\mu + b) = a(X - \mu)`}.`, plain: t`The two ${mb}s cancel, and ${ma} factors out.` },
        { label: t`Square and take the mean`, text: t`${math`\mathrm{Var}(aX + b) = E\big(a^{${2}}(X - \mu)^{${2}}\big) = a^{${2}}E\big((X - \mu)^{${2}}\big)`}.`, plain: t`${math`(a(X - \mu))^{${2}} = a^{${2}}(X - \mu)^{${2}}`}, and linearity takes the constant ${math`a^{${2}}`} outside.` },
        { label: t`Recognise the variance`, text: t`So ${math`\mathrm{Var}(aX + b) = a^{${2}}\mathrm{Var}(X)`}.`, plain: t`The last expectation is the definition of ${math`\mathrm{Var}(X)`}.` },
      ],
    },
    {
      kind: 'pitfall',
      claim: t`${math`\mathrm{Var}(${2}X) = ${2}\mathrm{Var}(X)`}.`,
      counterexample: t`If ${mX} is ${math`\pm ${1}`} with probability ${q(1, 2)} each, ${math`\mathrm{Var}(X) = ${1}`}; but ${math`${2}X`} is ${math`\pm ${2}`}, with variance ${4}. The constant comes out squared.`,
    },
    { kind: 'section', title: t`Independent variables` },
    {
      kind: 'rule',
      text: t`If ${mX} and ${mY} are independent, ${math`E(XY) = E(X)E(Y)`}, and so the [[variance-of-sum|variances add]]: ${dmath`\mathrm{Var}(aX + bY + c) = a^{${2}}\mathrm{Var}(X) + b^{${2}}\mathrm{Var}(Y).`}`,
      why: { q: t`Where does independence come in?`, a: t`Expanding ${math`\mathrm{Var}(aX + bY)`} gives ${math`a^{${2}}\mathrm{Var}(X) + b^{${2}}\mathrm{Var}(Y)`} plus a cross term ${math`${2}ab\big(E(XY) - E(X)E(Y)\big)`}. Independence makes ${math`E(XY) = E(X)E(Y)`}, so the cross term vanishes. Proving the rules in full is a supervision problem below.` },
    },
    { kind: 'p', text: t`Two consequences. A difference adds variances too: ${math`\mathrm{Var}(X - Y) = \mathrm{Var}(X) + \mathrm{Var}(Y)`}, since ${math`(-${1})^{${2}} = ${1}`}. And a die has variance ${DIE}, so ${3} independent dice have total variance ${math`${3} \times ${DIE} = ${mul(q(3), DIE)}`}, while ${3} times one die has variance ${math`${9} \times ${DIE} = ${mul(q(9), DIE)}`}. Independent parts partly cancel each other's spread.` },
    quickCheck({
      prompt: t`${mX} and ${mY} are independent with ${math`\mathrm{Var}(X) = ${4}`} and ${math`\mathrm{Var}(Y) = ${1}`}. Find ${math`\mathrm{Var}(X - ${3}Y + ${7})`}.`,
      answer: { kind: 'exact', expected: String(4 + 9 * 1) },
      reference: String(4 + 9 * 1),
      why: t`${math`${1}^{${2}} \times ${4} + (${-3})^{${2}} \times ${1} = ${4 + 9}`}. The ${7} shifts without spreading, and the minus sign is squared away.`,
    }),
    {
      kind: 'pitfall',
      claim: t`${math`E(XY) = E(X)E(Y)`} for any ${mX} and ${mY}.`,
      counterexample: t`Take ${math`Y = X`} with ${mX} equal to ${0} or ${1}, each with probability ${q(1, 2)}. Then ${math`E(XY) = E(X^{${2}}) = ${q(1, 2)}`}, but ${math`E(X)E(Y) = ${q(1, 4)}`}. In STEP ${3} Statistics Q${3}, two dependent indicators in a random row fail it in the same way.`,
    },
    { kind: 'takeaway', text: t`Means are always linear; ${math`\mathrm{Var}(aX + b) = a^{${2}}\mathrm{Var}(X)`}; and for independent variables the variances add, each with its coefficient squared.` },
  ],
  examples: [
    { ...workedCambridge(q3iia), examiner: t`The product of indicators read as the indicator of both events, and that probability counted directly; no use of ${math`E(X)E(Y)`}, since the indicators are dependent.` },
    worked(combination, { a: 2, b: -3, c: 5, mx: 4, my: 1, vx: 3, vy: 2, ask: 'var' }, t`A difference of independent variables`),
    worked(dice, { m: 6, k: 3, kind: 'sum' }, t`The total of three dice`),
  ],
  generators: [linear, combination, dice],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['linearity-of-expectation', 'variance-of-sum'],
  cambridge: withUses([notesComb, notesProof, step06Plates], {
    'step06-q14': { sections: ['Means of combinations', 'Variance of a linear function', 'Independent variables'], note: t`Means and spreads of a sum and of a product of two independent measurements, from the rules for expectation` },
    's3-notes-proofs': { sections: ['Means of combinations', 'Variance of a linear function', 'Independent variables'], note: t`Proving the rules for means and variances, and where independence is used` },
  }),
  // The proofs from the topic notes. STEP 3 Statistics Q3(ii)(c) needs indicator variables, so it is set in
  // rv.indicators; the notes' numerical combination is one application of the rule, left out. The STEP plates apply the
  // rules to a product as well as a sum.
  gate: ['s3-notes-proofs', 'step06-q14'],
  recall: [
    { front: t`State linearity of expectation.`, back: t`${math`E(aX + bY + c) = aE(X) + bE(Y) + c`}, for any ${mX} and ${mY}.` },
    { front: t`${math`\mathrm{Var}(aX + b)`}?`, back: t`${math`a^{${2}}\mathrm{Var}(X)`}.` },
    { front: t`${math`\mathrm{Var}(aX + bY + c)`} for independent ${mX}, ${mY}?`, back: t`${math`a^{${2}}\mathrm{Var}(X) + b^{${2}}\mathrm{Var}(Y)`}.` },
    { front: t`When is ${math`E(XY) = E(X)E(Y)`} guaranteed?`, back: t`When ${mX} and ${mY} are independent.` },
  ],
  proofOrder: [
    {
      title: t`${math`\mathrm{Var}(aX + b) = a^{${2}}\mathrm{Var}(X)`}`,
      steps: [
        t`${math`E(aX + b) = a\mu + b`}, by linearity.`,
        t`So ${math`(aX + b) - E(aX + b) = a(X - \mu)`}.`,
        t`Square and take the mean: ${math`a^{${2}}E\big((X - \mu)^{${2}}\big)`}.`,
        t`That is ${math`a^{${2}}\mathrm{Var}(X)`}.`,
      ],
    },
  ],
};
