/**
 * ineq.am-gm: the AM-GM inequality, (a + b)/2 >= sqrt(ab), from (sqrt a - sqrt b)^2 >= 0,
 * extended to four and then three numbers by Cauchy's backward step, with equality exactly
 * when the numbers are equal. Follows STEP Support Assignment 8, Q1 and its hints; the
 * general n-number case is proved in IA Probability from Jensen's inequality (ineq.jensen).
 * The gate problems are STEP I 2014 Q5, STEP II 2008 Q3, and STEP I 2012 Q1 (STEP Questions
 * Database), each settled by AM-GM where the paper suggests calculus or a sketch.
 */
import { auto, cite, supervision } from '../cambridge';
import { int, pick, q, str } from '../math';
import { generator, type Misconception } from '../problem';
import { dmath, math, t } from '../rich';
import { checkFrom, worked, workedProof, type TopicContent } from '../topic';

const [ma, mb, mx] = [math`a`, math`b`, math`x`];

// ---------------------------------------------------------------- generators

interface MinP { a: number; m: number }

const minGen = generator<MinP>({
  id: 'minimum',
  skill: 'Minimise ax + b/x over x > 0 by AM-GM: the minimum is 2 sqrt(ab), at ax = b/x.',
  quick: true,
  params: (rng) => {
    const a = pick(rng, [1, 1, 2, 3, 4, 5]);
    // b = a m^2, so ab = (am)^2 is a square and the minimum is a whole number.
    return { a, m: int(rng, 2, 7) };
  },
  sane: ({ a, m }) => (a >= 1 && m >= 2 ? null : 'out of range'),
  problem: ({ a, m }) => {
    const b = a * m * m;
    const ax = a === 1 ? mx : math`${a}x`;
    return {
      prompt: t`Find the minimum value of ${math`${ax} + \frac{${b}}{x}`} for ${math`x > ${0}`}.`,
      answer: { kind: 'exact', expected: String(2 * a * m) },
      solution: [
        t`For ${math`x > ${0}`} both terms are positive, so AM-GM applies: ${math`\frac{${ax} + \frac{${b}}{x}}{${2}} \ge \sqrt{${ax} \cdot \frac{${b}}{x}} = \sqrt{${a * b}} = ${a * m}`}.`,
        t`So ${math`${ax} + \frac{${b}}{x} \ge ${2 * a * m}`}, with equality when the two terms are equal: ${math`${ax} = \frac{${b}}{x}`}, that is ${math`x^{${2}} = ${m * m}`}, ${math`x = ${m}`}. The bound is reached, so the minimum is ${2 * a * m}.`,
      ],
    };
  },
  solve: ({ a, m }) => {
    // Scan x over a fine grid of rationals and take the smallest value found.
    const b = a * m * m;
    let best = Infinity;
    for (let i = 1; i <= 4000; i++) { const x = i / 100; best = Math.min(best, a * x + b / x); }
    return String(Math.round(best * 1e6) / 1e6);
  },
  misconceptions: ({ a, m }): Misconception[] => [
    { response: String(a + a * m * m), why: t`That is the value at ${math`x = ${1}`}, not the smallest. AM-GM gives a bound that holds for every ${mx}; then check where equality happens.` },
    { response: String(a * m), why: t`That is the geometric mean ${math`\sqrt{${a * a * m * m}}`}, a bound on the average of the two terms. Their sum is twice the average.` },
    { response: String(m), why: t`${m} is where the minimum happens, the value of ${mx}. The question asks for the smallest value of the expression.` },
  ],
});

interface ProdP { s: number; kind: 'product' | 'rectangle' }

const prodGen = generator<ProdP>({
  id: 'largest-product',
  skill: 'Maximise a product with a fixed sum: by AM-GM, xy <= ((x + y)/2)^2, with equality when x = y.',
  params: (rng) => ({ s: 2 * int(rng, 3, 15), kind: pick(rng, ['product', 'rectangle'] as const) }),
  sane: ({ s }) => (s % 2 === 0 && s >= 6 ? null : 'even total'),
  problem: ({ s, kind }) => {
    const best = (s / 2) ** 2;
    return kind === 'product'
      ? {
          prompt: t`Non-negative numbers ${mx} and ${math`y`} satisfy ${math`x + y = ${s}`}. What is the largest possible value of ${math`xy`}?`,
          answer: { kind: 'exact', expected: String(best) },
          solution: [
            t`AM-GM: ${math`\sqrt{xy} \le \frac{x + y}{${2}} = ${s / 2}`}, so ${math`xy \le ${s / 2}^{${2}} = ${best}`}.`,
            t`Equality needs ${math`x = y = ${s / 2}`}, which is allowed, so the largest value is ${best}.`,
          ],
        }
      : {
          prompt: t`A rectangle has perimeter ${math`${2 * s}`}. What is the largest possible area?`,
          answer: { kind: 'exact', expected: String(best) },
          solution: [
            t`With sides ${mx} and ${math`y`}, ${math`${2}x + ${2}y = ${2 * s}`}, so ${math`x + y = ${s}`}. AM-GM gives ${math`xy \le \left(\frac{x + y}{${2}}\right)^{${2}} = ${best}`}.`,
            t`Equality when ${math`x = y = ${s / 2}`}: the square. So the largest area is ${best}.`,
          ],
        };
  },
  solve: ({ s }) => {
    let best = 0;
    for (let i = 0; i <= s * 100; i++) { const x = i / 100; best = Math.max(best, x * (s - x)); }
    return String(Math.round(best * 1e6) / 1e6);
  },
  misconceptions: ({ s }): Misconception[] => [
    { response: String((s * s) / 2), why: t`Half the sum is ${s / 2}, and the product is at most its square, ${math`\left(\frac{${s}}{${2}}\right)^{${2}}`}, not ${math`\frac{${s}^{${2}}}{${2}}`}.` },
    { response: String(s / 2), why: t`${s / 2} is the best value of each number, not of the product. Square it.` },
    { response: String(s - 1), why: t`${math`x = ${1}`}, ${math`y = ${s - 1}`} is one choice, not the best. Products are largest when the numbers are equal.` },
  ],
});

interface GapP { p: number; r: number }

const gapGen = generator<GapP>({
  id: 'gap',
  skill: 'Compute AM - GM for two squares: (a + b)/2 - sqrt(ab) = (sqrt a - sqrt b)^2 / 2.',
  params: (rng) => {
    const p = int(rng, 1, 9);
    let r = int(rng, 1, 9);
    while (r === p) r = int(rng, 1, 9);
    return { p, r };
  },
  sane: ({ p, r }) => (p !== r ? null : 'the numbers must differ'),
  problem: ({ p, r }) => {
    const [a, b] = [p * p, r * r];
    const gap = q((p - r) ** 2, 2);
    return {
      prompt: t`Let ${math`a = ${a}`} and ${math`b = ${b}`}. Find ${math`\frac{a + b}{${2}} - \sqrt{ab}`}, the amount by which the arithmetic mean exceeds the geometric mean.`,
      answer: { kind: 'exact', expected: str(gap) },
      solution: [
        t`${math`\frac{a + b}{${2}} = ${q(a + b, 2)}`} and ${math`\sqrt{ab} = \sqrt{${a * b}} = ${p * r}`}, so the difference is ${math`${q(a + b, 2)} - ${p * r} = ${gap}`}.`,
        t`Check with the identity ${math`\frac{a + b}{${2}} - \sqrt{ab} = \frac{(\sqrt{a} - \sqrt{b})^{${2}}}{${2}} = \frac{(${p} - ${r})^{${2}}}{${2}} = ${gap}`}.`,
      ],
    };
  },
  solve: ({ p, r }) => str(q(p * p + r * r - 2 * p * r, 2)),
  misconceptions: ({ p, r }): Misconception[] => [
    { response: str(q(p * p + r * r, 2)), why: t`That is the arithmetic mean alone. Subtract ${math`\sqrt{ab} = ${p * r}`}.` },
    { response: String((p - r) ** 2), why: t`The gap is half of ${math`(\sqrt{a} - \sqrt{b})^{${2}}`}: the arithmetic mean has a ${2} underneath.` },
  ],
});

interface WhichP { a: number; b: number }

const signGen = generator<WhichP>({
  id: 'when-it-holds',
  skill: 'Know the hypotheses: AM-GM needs non-negative numbers, and equality needs them equal.',
  quick: true,
  params: (rng) => ({ a: pick(rng, [-9, -4, -1, 1, 4, 9, 16, 25]), b: pick(rng, [-4, -1, 1, 4, 9, 25, 36]) }),
  sane: () => null,
  problem: ({ a, b }) => {
    const verdict = a < 0 || b < 0 ? (a < 0 && b < 0 ? 'neg' : 'undef') : a === b ? 'eq' : 'strict';
    return {
      prompt: t`What does AM-GM say about ${math`a = ${a}`} and ${math`b = ${b}`}?`,
      answer: {
        kind: 'choice',
        options: [
          { id: 'strict', label: t`${math`\frac{a + b}{${2}} > \sqrt{ab}`}: strict, since ${math`a \neq b`}.` },
          { id: 'eq', label: t`${math`\frac{a + b}{${2}} = \sqrt{ab}`}, since ${math`a = b`}.` },
          { id: 'neg', label: t`Nothing: the numbers are negative, so AM-GM does not apply (here ${math`\frac{a + b}{${2}} < \sqrt{ab}`}).` },
          { id: 'undef', label: t`Nothing: one number is negative, so ${math`\sqrt{ab}`} is not a real number.` },
        ],
        correct: verdict,
      },
      solution: [
        t`AM-GM is a statement about non-negative numbers ${ma}, ${mb}: ${math`\frac{a + b}{${2}} \ge \sqrt{ab}`}, with equality exactly when ${math`a = b`}.`,
        verdict === 'neg' ? t`Both are negative: ${math`ab = ${a * b}`} is positive, but ${math`\frac{a + b}{${2}} = ${q(a + b, 2)}`} is negative, below ${math`\sqrt{ab}`}.` : verdict === 'undef' ? t`${math`ab = ${a * b} < ${0}`}, so ${math`\sqrt{ab}`} is not real.` : t`Both are non-negative, and ${verdict === 'eq' ? t`they are equal, so equality holds` : t`they differ, so the inequality is strict`}.`,
      ],
    };
  },
  solve: ({ a, b }) => {
    if (a * b < 0) return ['undef'];
    if (a < 0 && b < 0) return ['neg'];
    const am = (a + b) / 2;
    const gm = Math.sqrt(a * b);
    return [Math.abs(am - gm) < 1e-12 ? 'eq' : 'strict'];
  },
  misconceptions: ({ a, b }): Misconception[] => {
    const right = a < 0 || b < 0 ? (a < 0 && b < 0 ? 'neg' : 'undef') : a === b ? 'eq' : 'strict';
    const wrong = right === 'strict' ? ['eq', 'neg'] : right === 'eq' ? ['strict', 'neg'] : right === 'neg' ? ['strict', 'undef'] : ['strict', 'neg'];
    return wrong.map((w) => ({ response: [w], why: w === 'strict' || w === 'eq' ? t`Check the hypotheses first: AM-GM is only for non-negative numbers${right === 'eq' || right === 'strict' ? t`, and equality is exactly when the two are equal` : t``}.` : t`Look at the signs: ${math`a = ${a}`}, ${math`b = ${b}`}.` }));
  },
});

// ---------------------------------------------------------------- Cambridge problems

const F8 = 'step-f08';
const F8H = 'step-f08-hints';

const a8q1i = workedProof({
  title: t`${math`x^{${2}} + y^{${2}} + z^{${2}} \ge xy + yz + zx`}`,
  prompt: t`STEP Support Assignment ${8}, Q${1}(i): prove that ${math`x^{${2}} + y^{${2}} + z^{${2}} \ge xy + yz + zx`} for real ${mx}, ${math`y`}, ${math`z`}. What can you say about ${mx}, ${math`y`}, ${math`z`} when equality holds?`,
  steps: [
    t`Do not start from what you want to prove. Start from something certainly true: a sum of squares is non-negative, ${math`(x - y)^{${2}} + (y - z)^{${2}} + (z - x)^{${2}} \ge ${0}`}.`,
    t`Expand each square: ${math`x^{${2}} - ${2}xy + y^{${2}} + y^{${2}} - ${2}yz + z^{${2}} + z^{${2}} - ${2}zx + x^{${2}} \ge ${0}`}.`,
    t`Collect terms: ${math`${2}x^{${2}} + ${2}y^{${2}} + ${2}z^{${2}} \ge ${2}xy + ${2}yz + ${2}zx`}, and divide by ${2}: ${math`x^{${2}} + y^{${2}} + z^{${2}} \ge xy + yz + zx`}.`,
    t`Equality holds exactly when the sum of squares is ${0}, that is when every square is ${0}: ${math`x = y`}, ${math`y = z`} and ${math`z = x`}. So equality holds if and only if ${math`x = y = z`}.`,
  ],
  answer: t`Proved; equality exactly when ${math`x = y = z`}.`,
  source: cite(F8, 'Assignment 8, Q1(i)'),
});

const a8eq = auto({
  id: 'a8-q1-equality',
  source: cite(F8, 'Assignment 8, Q1'),
  title: t`When the means agree`,
  prompt: t`By considering ${math`(x - y)^{${2}}`}, one proves ${math`x^{${2}} + y^{${2}} \ge ${2}xy`} and hence, for non-negative ${ma} and ${mb}, ${math`\frac{a + b}{${2}} \ge \sqrt{ab}`}. What can you say about ${ma} and ${mb} if ${math`\frac{a + b}{${2}} = \sqrt{ab}`}?`,
  answer: {
    kind: 'choice',
    options: [
      { id: 'eq', label: t`${math`a = b`}` },
      { id: 'zero', label: t`${math`a = ${0}`} or ${math`b = ${0}`}` },
      { id: 'any', label: t`Nothing: equality can happen for many unequal pairs.` },
    ],
    correct: 'eq',
  },
  solution: [
    t`Put ${math`a = x^{${2}}`}, ${math`b = y^{${2}}`} with ${math`x = \sqrt{a}`}, ${math`y = \sqrt{b}`}. Then ${math`\frac{a + b}{${2}} - \sqrt{ab} = \frac{(x - y)^{${2}}}{${2}}`}.`,
    t`This is ${0} exactly when ${math`x = y`}, that is ${math`\sqrt{a} = \sqrt{b}`}, that is ${math`a = b`}.`,
  ],
  reference: 'eq',
  verify: () => {
    // Over a grid of non-negative pairs, equality holds exactly on the diagonal.
    for (let a = 0; a <= 20; a++) for (let b = 0; b <= 20; b++) if ((Math.abs((a + b) / 2 - Math.sqrt(a * b)) < 1e-12) !== (a === b)) return `a = ${a}, b = ${b}`;
    return null;
  },
  misconceptions: [
    { response: 'zero', why: t`With ${math`a = ${0}`}, ${math`b = ${4}`}: the arithmetic mean is ${2} and the geometric mean ${0}. Not equal.` },
    { response: 'any', why: t`The gap is ${math`\frac{(\sqrt{a} - \sqrt{b})^{${2}}}{${2}}`}, which is zero only when ${math`\sqrt{a} = \sqrt{b}`}.` },
  ],
  official: { source: cite(F8H, 'Assignment 8, Q1'), answer: 'eq', agrees: true },
});

const a8q1 = supervision({
  id: 'a8-q1',
  source: cite(F8, 'Assignment 8, Q1'),
  title: t`AM-GM for two numbers`,
  prompt: t`By considering ${math`(x - y)^{${2}}`}, prove that ${math`x^{${2}} + y^{${2}} \ge ${2}xy`}, and hence show that, if ${ma} and ${mb} are non-negative numbers, then ${math`\frac{a + b}{${2}} \ge \sqrt{ab}`}. What can you say about ${ma} and ${mb} if ${math`\frac{${1}}{${2}}(a + b) = \sqrt{ab}`}?`,
  writeUp: 'proof',
  official: cite(F8H, 'Assignment 8, Q1'),
});

const a8q1ii = supervision({
  id: 'a8-q1-ii',
  source: cite(F8, 'Assignment 8, Q1(ii)'),
  title: t`AM-GM for four numbers`,
  prompt: t`For non-negative ${math`p, q, r, s`}, write out ${dmath`\frac{p + q + r + s}{${4}} \ge \frac{\sqrt{pq} + \sqrt{rs}}{${2}} \ge \sqrt[${4}]{pqrs},`} giving a careful explanation of each step (for example "using the two-number case with ${math`a = p`} and ${math`b = q`}"). Lay the work out with a new line for each step.`,
  writeUp: 'proof',
  official: cite(F8H, 'Assignment 8, Q1(ii)'),
});

const a8q1iii = supervision({
  id: 'a8-q1-iii',
  source: cite(F8, 'Assignment 8, Q1(iii)'),
  title: t`AM-GM for three numbers`,
  prompt: t`For non-negative ${math`p, q, r`}, use the four-number case with ${math`s = \frac{p + q + r}{${3}}`} to show ${dmath`\frac{p + q + r}{${3}} = \frac{p + q + r + \frac{p + q + r}{${3}}}{${4}} \ge \sqrt[${4}]{pqr \cdot \frac{p + q + r}{${3}}},`} explaining each step, and deduce that ${math`\frac{p + q + r}{${3}} \ge \sqrt[${3}]{pqr}`}.`,
  writeUp: 'proof',
  official: cite(F8H, 'Assignment 8, Q1(iii)'),
});

// STEP I 2014 Q5, STEP I 2012 Q1, and STEP II 2008 Q3 (STEP Questions Database): AM-GM at work.
const DB14 = 'stepdb-14-s1' as const;
const DB12 = 'stepdb-12-s1' as const;
const DB08 = 'stepdb-08-s2' as const;

const db14q5 = supervision({
  id: 'step14-q5',
  source: cite(DB14, 'Q5(i), (ii)', true),
  title: t`A cubic that never goes negative, and the largest ${math`xy^{${2}}`}`,
  prompt: t`(i) Let ${math`f(x) = (x + ${2}a)^{${3}} - ${27}a^{${2}}x`}, where ${math`a \ge ${0}`}. Show that ${math`f(x) \ge ${0}`} for ${math`x \ge ${0}`}. (The question asks for a sketch of ${math`f`}; an argument by AM-GM is as good.) (ii) Use part (i) to find the greatest value of ${math`xy^{${2}}`} in the region of the ${math`(x, y)`} plane given by ${math`x \ge ${0}`}, ${math`y \ge ${0}`} and ${math`x + ${2}y \le ${3}`}. For what values of ${math`x`} and ${math`y`} is this greatest value achieved?`,
  writeUp: 'proof',
});

const db14q5ii = auto({
  id: 'step14-q5-ii',
  source: cite(DB14, 'Q5(ii)'),
  title: t`The largest ${math`xy^{${2}}`} under a line`,
  prompt: t`Given that ${math`(x + ${2}a)^{${3}} \ge ${27}a^{${2}}x`} for all ${math`x \ge ${0}`} and ${math`a \ge ${0}`}, find the greatest value of ${math`xy^{${2}}`} in the region of the ${math`(x, y)`} plane given by ${math`x \ge ${0}`}, ${math`y \ge ${0}`} and ${math`x + ${2}y \le ${3}`}.`,
  answer: { kind: 'exact', expected: '1' },
  solution: [
    t`Take ${math`a = y`}: ${math`(x + ${2}y)^{${3}} \ge ${27}y^{${2}}x`}, so ${math`xy^{${2}} \le \frac{(x + ${2}y)^{${3}}}{${27}}`}.`,
    t`In the region ${math`${0} \le x + ${2}y \le ${3}`}, so ${math`xy^{${2}} \le \frac{${3}^{${3}}}{${27}} = ${1}`}.`,
    t`The bound is reached: equality in ${math`(x + ${2}a)^{${3}} \ge ${27}a^{${2}}x`} needs ${math`x = a`}, so ${math`x = y`}, and ${math`x + ${2}y = ${3}`} gives ${math`x = y = ${1}`}, where ${math`xy^{${2}} = ${1}`}. So the greatest value is ${1}.`,
  ],
  reference: '1',
  verify: () => {
    // Brute force over a fine grid of the triangle: the maximum is 1, at (1, 1).
    let best = 0;
    let at = [0, 0];
    for (let i = 0; i <= 600; i++) for (let j = 0; j <= 300; j++) {
      const x = i / 200;
      const y = j / 200;
      if (x + 2 * y <= 3 + 1e-12 && x * y * y > best) { best = x * y * y; at = [x, y]; }
    }
    return Math.abs(best - 1) < 1e-12 && at[0] === 1 && at[1] === 1 ? null : `max ${best} at ${at}`;
  },
  misconceptions: [
    { response: '27/32', why: t`That is ${math`x = ${q(3, 2)}`}, ${math`y = ${q(3, 4)}`}, splitting the ${3} evenly between ${mx} and ${math`${2}y`}. AM-GM balances the three numbers ${mx}, ${math`y`}, ${math`y`}, so the best point has ${math`x = y`}.` },
  ],
});

const db12q1 = supervision({
  id: 'step12-q1',
  source: cite(DB12, 'Q1, first part'),
  title: t`The shortest way round a fixed point`,
  prompt: t`The line ${math`L`} has equation ${math`y = c - mx`}, with ${math`m > ${0}`} and ${math`c > ${0}`}. It passes through the point ${math`R(a, b)`} and cuts the axes at the points ${math`P(p, ${0})`} and ${math`Q(${0}, q)`}, where ${math`a`}, ${math`b`}, ${math`p`} and ${math`q`} are all positive. Find ${math`p`} and ${math`q`} in terms of ${math`a`}, ${math`b`} and ${math`m`}. As ${math`L`} varies with ${math`R`} remaining fixed, show that the minimum value of the sum of the distances of ${math`P`} and ${math`Q`} from the origin is ${math`(a^{\frac{${1}}{${2}}} + b^{\frac{${1}}{${2}}})^{${2}}`}.`,
  writeUp: 'proof',
});

const ABDOM = { a: { kind: 'real' as const, min: 0.5, max: 5 }, b: { kind: 'real' as const, min: 0.5, max: 5 } };
const db12q1m = auto({
  id: 'step12-q1-gradient',
  source: cite(DB12, 'Q1', true),
  title: t`Which line is shortest round the point`,
  prompt: t`A line through the fixed point ${math`R(a, b)`}, with ${math`a, b > ${0}`}, has gradient ${math`-m`} with ${math`m > ${0}`}, and cuts the axes at ${math`P(p, ${0})`} and ${math`Q(${0}, q)`}. Then ${math`p = a + \frac{b}{m}`} and ${math`q = b + am`}. For which ${math`m`} is ${math`OP + OQ`} least? Give ${math`m`} in terms of ${math`a`} and ${math`b`}.`,
  answer: { kind: 'expression', expected: 'sqrt(b/a)', variables: ['a', 'b'], domains: ABDOM },
  solution: [
    t`${math`OP + OQ = p + q = a + b + \frac{b}{m} + am`}.`,
    t`AM-GM on the two positive numbers ${math`am`} and ${math`\frac{b}{m}`}: ${math`am + \frac{b}{m} \ge ${2}\sqrt{am \cdot \frac{b}{m}} = ${2}\sqrt{ab}`}, so ${math`OP + OQ \ge a + b + ${2}\sqrt{ab} = (\sqrt{a} + \sqrt{b})^{${2}}`}.`,
    t`Equality holds exactly when ${math`am = \frac{b}{m}`}, that is ${math`m^{${2}} = \frac{b}{a}`}, so ${math`m = \sqrt{\frac{b}{a}}`} (positive, as ${math`m > ${0}`}).`,
  ],
  reference: 'sqrt(b/a)',
  verify: () => {
    // For several points, a search over m finds the least p + q at sqrt(b/a), with value (sqrt a + sqrt b)^2.
    for (const [a, b] of [[1, 4], [2, 9], [3, 1], [0.5, 5]] as const) {
      let best = Infinity;
      let bestM = 0;
      for (let i = 1; i <= 200000; i++) {
        const m = i / 20000;
        const v = a + b / m + b + a * m;
        if (v < best) { best = v; bestM = m; }
      }
      if (Math.abs(bestM - Math.sqrt(b / a)) > 1e-3) return `a = ${a}, b = ${b}: least at m = ${bestM}`;
      if (Math.abs(best - (Math.sqrt(a) + Math.sqrt(b)) ** 2) > 1e-6) return `a = ${a}, b = ${b}: least ${best}`;
    }
    return null;
  },
  misconceptions: [
    { response: 'b/a', why: t`Equality in AM-GM needs ${math`am = \frac{b}{m}`}, so ${math`m^{${2}} = \frac{b}{a}`}: take the square root.` },
    { response: 'sqrt(a/b)', why: t`Solve ${math`am = \frac{b}{m}`} for ${math`m`}: ${math`m^{${2}} = \frac{b}{a}`}, with ${math`b`} on top.` },
  ],
});

const db08q3 = supervision({
  id: 'step08-q3',
  source: cite(DB08, 'Q3', true),
  title: t`One of them is small`,
  prompt: t`(i) Show that ${math`x^{${2}}(${1} - x) \le \frac{${4}}{${27}}`} for all ${math`x \ge ${0}`}. (The question finds the turning points of ${math`y = ${27}x^{${3}} - ${27}x^{${2}} + ${4}`}; an argument by AM-GM is as good.) Given that each of the numbers ${math`a`}, ${math`b`} and ${math`c`} lies between ${0} and ${1}, prove by contradiction that at least one of the numbers ${math`bc(${1} - a)`}, ${math`ca(${1} - b)`} and ${math`ab(${1} - c)`} is less than or equal to ${math`\frac{${4}}{${27}}`}. (ii) Given that each of the numbers ${math`p`} and ${math`q`} lies between ${0} and ${1}, prove that at least one of the numbers ${math`p(${1} - q)`} and ${math`q(${1} - p)`} is less than or equal to ${math`\frac{${1}}{${4}}`}.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

export const amGm: TopicContent = {
  topicId: 'ineq.am-gm',
  goal: t`Prove ${math`\frac{a + b}{${2}} \ge \sqrt{ab}`} from ${math`(\sqrt{a} - \sqrt{b})^{${2}} \ge ${0}`}, extend it to four and then three numbers, and say when equality holds.`,
  objective: t`Prove the AM-GM inequality, use it to find maxima and minima, and know when equality holds.`,
  why: t`AM-GM settles many STEP inequalities in one line, and leads to Jensen's inequality in the Tripos.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`Two kinds of average` },
    { kind: 'hook', text: t`A field has ${40} metres of fence around it, in a rectangle. A ${12} by ${8} field has area ${96}; an ${11} by ${9} field has area ${99}. Can you beat a ${10} by ${10} square, with area ${100}? You cannot, and the reason is an inequality between two averages.` },
    {
      kind: 'definition',
      name: t`Arithmetic and geometric means`,
      formal: t`For non-negative real numbers ${ma} and ${mb}, the [[arithmetic-mean|arithmetic mean]] is ${math`\frac{a + b}{${2}}`} and the [[geometric-mean|geometric mean]] is ${math`\sqrt{ab}`}. For ${math`a_{${1}}, \ldots, a_{n} \ge ${0}`} they are ${math`\frac{a_{${1}} + \cdots + a_{n}}{n}`} and ${math`\sqrt[n]{a_{${1}} \cdots a_{n}}`}.`,
      plain: t`The usual average, and the side of the square with the same area as an ${ma} by ${mb} rectangle. For ${2} and ${8}: the arithmetic mean is ${5}, the geometric mean ${math`\sqrt{${16}} = ${4}`}.`,
    },
    { kind: 'theorem', name: t`AM-GM for two numbers`, statement: t`If ${math`a, b \ge ${0}`}, then ${math`\frac{a + b}{${2}} \ge \sqrt{ab}`}, with equality if and only if ${math`a = b`}.` },
    { kind: 'narrative', text: t`The idea: write the difference of the two sides as a square. Squares are never negative, so the difference is never negative, and it is zero only when the thing squared is zero.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Start from a square`, text: t`Since ${math`a, b \ge ${0}`}, the real numbers ${math`\sqrt{a}`} and ${math`\sqrt{b}`} exist, and ${math`(\sqrt{a} - \sqrt{b})^{${2}} \ge ${0}`}.`, why: { q: t`Why start here, and not from the inequality we want?`, a: t`A proof must move from things known to be true to the conclusion. Starting from the conclusion and reaching a true statement proves nothing unless every step reverses.` } },
        { label: t`Expand`, text: t`${math`(\sqrt{a})^{${2}} - ${2}\sqrt{a}\sqrt{b} + (\sqrt{b})^{${2}} = a - ${2}\sqrt{ab} + b`}, so ${math`a + b - ${2}\sqrt{ab} \ge ${0}`}.`, why: { q: t`Why is ${math`\sqrt{a}\sqrt{b} = \sqrt{ab}`}?`, a: t`Both are non-negative and both square to ${math`ab`}, and a non-negative number is determined by its square.` } },
        { label: t`Rearrange`, text: t`Add ${math`${2}\sqrt{ab}`} and divide by ${2}: ${math`\frac{a + b}{${2}} \ge \sqrt{ab}`}.` },
        { label: t`Equality`, text: t`Equality holds exactly when ${math`(\sqrt{a} - \sqrt{b})^{${2}} = ${0}`}, that is ${math`\sqrt{a} = \sqrt{b}`}, that is ${math`a = b`}.` },
      ],
    },
    { kind: 'p', text: t`Back to the field: sides ${mx} and ${math`y`} with ${math`x + y = ${20}`}. AM-GM says ${math`\sqrt{xy} \le \frac{x + y}{${2}} = ${10}`}, so the area ${math`xy`} is at most ${100}, with equality only when ${math`x = y = ${10}`}.` },
    checkFrom(minGen, { a: 1, m: 3 }, t`${math`x + \frac{${9}}{x} \ge ${2}\sqrt{${9}} = ${6}`}, with equality when ${math`x = \frac{${9}}{x}`}, so at ${math`x = ${3}`}.`),
    { kind: 'section', title: t`Four numbers, then three` },
    { kind: 'narrative', text: t`Does the same hold for more numbers? For four, apply the two-number case twice. For three, Cauchy found a beautiful trick: pad three numbers to four by adding their own average, which changes nothing, then use the four-number case.` },
    { kind: 'theorem', name: t`AM-GM for four and three numbers`, statement: t`For ${math`p, q, r, s \ge ${0}`}: ${math`\frac{p + q + r + s}{${4}} \ge \sqrt[${4}]{pqrs}`} and ${math`\frac{p + q + r}{${3}} \ge \sqrt[${3}]{pqr}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Pair them up`, text: t`By the two-number case with ${math`a = p, b = q`}, and with ${math`a = r, b = s`}: ${math`\frac{p + q}{${2}} \ge \sqrt{pq}`} and ${math`\frac{r + s}{${2}} \ge \sqrt{rs}`}. Average these: ${math`\frac{p + q + r + s}{${4}} \ge \frac{\sqrt{pq} + \sqrt{rs}}{${2}}`}.`, why: { q: t`Why may we add two inequalities?`, a: t`If ${math`A \ge C`} and ${math`B \ge D`}, then ${math`A + B \ge C + D`}; then divide both sides by ${2}.` } },
        { label: t`Apply it once more`, text: t`By the two-number case with ${math`a = \sqrt{pq}`}, ${math`b = \sqrt{rs}`}: ${math`\frac{\sqrt{pq} + \sqrt{rs}}{${2}} \ge \sqrt{\sqrt{pq}\sqrt{rs}} = \sqrt[${4}]{pqrs}`}. Chain the two: the four-number case.` },
        { label: t`Pad three to four`, text: t`Let ${math`z = \frac{p + q + r}{${3}}`}. Then ${math`p + q + r = ${3}z`}, so ${math`\frac{p + q + r + z}{${4}} = \frac{${4}z}{${4}} = z`}. The four-number case with ${math`s = z`} gives ${math`z \ge \sqrt[${4}]{pqrz}`}.` },
        { label: t`Undo the root`, text: t`Both sides are non-negative, so raise to the fourth power: ${math`z^{${4}} \ge pqrz`}. If ${math`z > ${0}`}, divide by ${math`z`}: ${math`z^{${3}} \ge pqr`}, so ${math`z \ge \sqrt[${3}]{pqr}`}. If ${math`z = ${0}`}, then ${math`p = q = r = ${0}`} and both sides are ${0}.` },
      ],
    },
    { kind: 'p', text: t`A related inequality from the same STEP assignment, proved the same way from a sum of squares: ${math`x^{${2}} + y^{${2}} + z^{${2}} \ge xy + yz + zx`} for all real ${mx}, ${math`y`}, ${math`z`}, with equality if and only if ${math`x = y = z`}. It is worked in full below.` },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${math`\frac{a + b}{${2}} \ge \sqrt{ab}`} for all real ${ma}, ${mb} with ${math`ab \ge ${0}`}.`, counterexample: t`${math`a = b = -${4}`}: ${math`ab = ${16}`}, so ${math`\sqrt{ab} = ${4}`}, but ${math`\frac{a + b}{${2}} = -${4}`}. The first step needs ${math`\sqrt{a}`}, so ${ma} and ${mb} must be non-negative.` },
    { kind: 'pitfall', claim: t`The minimum of ${math`x + \frac{${1}}{x}`} is ${2}.`, counterexample: t`Only for ${math`x > ${0}`}. At ${math`x = -${1}`} the value is ${math`-${2}`}, and it is as negative as you like near ${0} from below.` },
    { kind: 'pitfall', claim: t`${math`x^{${2}} + \frac{${1}}{x} \ge ${2}\sqrt{x}`}, so the minimum of ${math`x^{${2}} + \frac{${1}}{x}`} for ${math`x > ${0}`} is reached when ${math`x^{${2}} = \frac{${1}}{x}`}, at ${math`x = ${1}`}, and is ${2}.`, counterexample: t`The bound ${math`${2}\sqrt{x}`} is not a constant, so it is not a minimum. At ${math`x = \frac{${4}}{${5}}`} the value is ${math`${q(16, 25)} + ${q(5, 4)} = ${q(189, 100)}`}, below ${2}. AM-GM gives a minimum only when the product of the terms is constant.` },
    { kind: 'takeaway', text: t`For non-negative numbers the arithmetic mean is at least the geometric mean, with equality exactly when all the numbers are equal.` },
  ],
  examples: [
    a8q1i,
    worked(minGen, { a: 2, m: 3 }, t`A minimum by AM-GM`),
    worked(prodGen, { s: 20, kind: 'rectangle' }, t`The best field`),
  ],
  generators: [minGen, prodGen, gapGen, signGen],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['arithmetic-mean', 'geometric-mean'],
  cambridge: [db14q5, db08q3, db12q1, db14q5ii, db12q1m, a8q1ii, a8q1iii, a8q1, a8eq],
  // The gate is three STEP questions the lesson does not touch, best first: 2014 I Q5 (a cubic
  // bound that is AM-GM in disguise, then a maximum), 2008 II Q3 (bounds on products), 2012 I Q1
  // (a minimum distance), then 2014 I Q5(ii) auto-checked. Assignment 8 Q1 is proved in the lesson.
  gate: ['step14-q5', 'step08-q3', 'step12-q1', 'step14-q5-ii'],
  recall: [
    { front: t`State AM-GM for two numbers, with its hypotheses and equality case.`, back: t`For ${math`a, b \ge ${0}`}: ${math`\frac{a + b}{${2}} \ge \sqrt{ab}`}, with equality if and only if ${math`a = b`}.` },
    { front: t`What square proves AM-GM for two numbers?`, back: t`${math`(\sqrt{a} - \sqrt{b})^{${2}} \ge ${0}`}, which expands to ${math`a + b \ge ${2}\sqrt{ab}`}.` },
    { front: t`How does the three-number case follow from the four-number case?`, back: t`Take ${math`s = \frac{p + q + r}{${3}}`} as the fourth number; then ${math`z \ge \sqrt[${4}]{pqrz}`} gives ${math`z^{${3}} \ge pqr`}.` },
  ],
  proofOrder: [
    {
      title: t`AM-GM for two numbers`,
      steps: [
        t`For ${math`a, b \ge ${0}`}, ${math`(\sqrt{a} - \sqrt{b})^{${2}} \ge ${0}`}.`,
        t`Expanding, ${math`a - ${2}\sqrt{ab} + b \ge ${0}`}.`,
        t`So ${math`\frac{a + b}{${2}} \ge \sqrt{ab}`}.`,
        t`Equality exactly when ${math`\sqrt{a} = \sqrt{b}`}, that is ${math`a = b`}.`,
      ],
    },
  ],
};

