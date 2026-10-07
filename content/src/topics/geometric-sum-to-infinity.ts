/**
 * alg.geometric-sum-to-infinity: the sum to infinity of a geometric series, a/(1 - r) when
 * |r| < 1, and why the series has no sum otherwise. From STEP Support Assignment 3, Q1(ii)
 * and (iii) (the rS_n - S_n derivation, then the limit), with the STEP Support series
 * problems that use it: Assignment 14, Q2(ii) (ratio (1 + sqrt 3)/3) and Q3(iii) (2010 STEP
 * II Q3, the sum of F_n/2^(n+1)), Assignment 18, Q4 (the area of the Koch snowflake), and
 * Assignment 24, Q4 (the Basel sum from the odd squares). Every answer is computed here and
 * compared with the hints.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { add, div, int, mul, pick, q, sample, str, sub, toFloat, type Rational } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { dmath, join, math, t, type Span } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const [mr, mn, ma, mS] = [math`r`, math`n`, math`a`, math`S`];
const pow = (r: Rational, k: number): Rational => Array.from({ length: k }, () => r).reduce((x, y) => mul(x, y), q(1));
/** A ratio as LaTeX, bracketed when it is negative or a fraction, so a power of it reads right. */
const br = (r: Rational): Span => (r.den === 1n && r.num >= 0n ? math`${r}` : math`\left(${r}\right)`);
const abs = (r: Rational): Rational => (r.num < 0n ? q(-r.num, r.den) : r);
const lt1 = (r: Rational): boolean => abs(r).num < abs(r).den;

// ---------------------------------------------------------------- generators

interface SumP { a: number; r: Rational }
const RATIOS: readonly Rational[] = [q(1, 2), q(1, 3), q(2, 3), q(1, 4), q(3, 4), q(-1, 2), q(-1, 3), q(-2, 3), q(1, 5), q(2, 5), q(-1, 4), q(-3, 4)];

const sumGen = generator<SumP>({
  id: 'sum-to-infinity',
  skill: 'Sum a geometric series to infinity with a/(1 - r), after checking |r| < 1.',
  quick: true,
  params: (rng) => ({ a: pick(rng, [1, 2, 3, 4, 5, 6, 8, 9, 10, 12, -2, -3]), r: pick(rng, RATIOS) }),
  sane: ({ r }) => (lt1(r) && r.num !== 0n ? null : 'the ratio must satisfy 0 < |r| < 1'),
  problem: ({ a, r }) => {
    const A = q(a);
    const [t0, t1, t2] = [0, 1, 2].map((k) => mul(A, pow(r, k))) as [Rational, Rational, Rational];
    const S = div(A, sub(q(1), r));
    return {
      prompt: t`Find the sum to infinity of the geometric series ${math`${t0} + ${br(t1)} + ${br(t2)} + \cdots`}.`,
      answer: { kind: 'exact', expected: str(S) },
      solution: [
        t`The first term is ${math`a = ${a}`}. Each term is the one before times ${math`r = ${r}`}: divide the second term by the first, ${math`${t1} \div ${br(t0)} = ${r}`}.`,
        t`Since ${math`|r| = ${abs(r)} < ${1}`}, the series converges, and its sum is ${math`\frac{a}{${1} - r}`}.`,
        t`${math`\frac{${a}}{${1} - ${br(r)}} = \frac{${a}}{${sub(q(1), r)}} = ${S}`}.`,
      ],
    };
  },
  solve: ({ a, r }) => {
    // From the first two terms alone: S = a + rS, so S(1 - r) = a, and with r = t1/t0, S = t0^2/(t0 - t1).
    const t0 = q(a);
    const t1 = mul(q(a), r);
    return str(div(mul(t0, t0), sub(t0, t1)));
  },
  misconceptions: ({ a, r }): Misconception[] => [
    { response: str(div(q(a), add(q(1), r))), why: t`That divides by ${math`${1} + r`}. The sum is ${math`\frac{a}{${1} - r}`}: from ${math`S - rS = a`}. With a negative ratio, ${math`${1} - r`} is bigger than ${1}.` },
    { response: str(div(mul(q(a), r), sub(q(1), r))), why: t`That leaves out the first term: ${math`\frac{ar}{${1} - r}`} is the sum from the second term on. The series starts at ${math`a = ${a}`}.` },
    { response: str(div(q(1), sub(q(1), r))), why: t`That is ${math`\frac{${1}}{${1} - r}`}, the sum when the first term is ${1}. Multiply by the first term, ${a}.` },
  ],
});

interface DecP { block: number; k: number }

const decimalGen = generator<DecP>({
  id: 'recurring-decimal',
  skill: 'Write a recurring decimal as a fraction by summing a geometric series.',
  params: (rng) => {
    const k = pick(rng, [1, 2, 2, 3]);
    for (;;) {
      const block = k === 1 ? int(rng, 1, 8) : k === 2 ? int(rng, 10, 98) : int(rng, 100, 998);
      // A block that is itself a repeat (33, 252 is fine, 333 is not) has a shorter period.
      const s = String(block);
      if (k > 1 && s.split('').every((c) => c === s[0])) continue;
      return { block, k };
    }
  },
  sane: ({ block, k }) => (block >= 1 && block < 10 ** k && String(block).length === k ? null : 'the block must have exactly k digits'),
  problem: ({ block, k }) => {
    const p = 10 ** k;
    const ans = q(block, p - 1);
    return {
      prompt: t`Write the recurring decimal ${math`${0}.\overline{${block}}`} as a fraction in lowest terms. (The bar means the digits under it repeat forever.)`,
      answer: { kind: 'exact', expected: str(ans), requireLowestTerms: true },
      solution: [
        t`Split it into blocks: ${math`${0}.\overline{${block}} = \frac{${block}}{${p}} + \frac{${block}}{${p * p}} + \frac{${block}}{${p * p * p}} + \cdots`}.`,
        t`That is a geometric series with first term ${math`a = \frac{${block}}{${p}}`} and ratio ${math`r = \frac{${1}}{${p}}`}, and ${math`|r| < ${1}`}.`,
        t`Its sum is ${math`\frac{a}{${1} - r} = \frac{${block}/${p}}{${p - 1}/${p}} = \frac{${block}}{${p - 1}}`}${ans.den === BigInt(p - 1) ? t`, already in lowest terms.` : t`, which is ${math`${ans}`} in lowest terms.`}`,
      ],
    };
  },
  solve: ({ block, k }) => {
    // The standard trick, done in integers: x = 0.(block)..., so 10^k x - x = block.
    const p = 10 ** k;
    return str(q(block, p - 1));
  },
  misconceptions: ({ block, k }): Misconception[] => [
    { response: str(q(block, 10 ** k)), why: t`That is ${math`${0}.${block}`}, the decimal that stops after one block. The repeats add ${math`\frac{${block}}{${10 ** (2 * k)}} + \cdots`} as well.` },
    { response: `${block}/${10 ** k - 1}`, why: t`That is the right value, but not in lowest terms. Cancel the common factor.` },
    { response: str(q(block, 10 ** k + 1)), why: t`The ratio is ${math`\frac{${1}}{${10 ** k}}`}, so divide by ${math`${1} - r`}, giving a denominator of ${10 ** k - 1}, not ${10 ** k + 1}.` },
  ],
});

interface RatioP { a: number; r: Rational }

const ratioGen = generator<RatioP>({
  id: 'find-ratio',
  skill: 'Find the common ratio from the first term and the sum to infinity.',
  params: (rng) => ({ a: pick(rng, [2, 3, 4, 5, 6, 8, 10, 12]), r: pick(rng, RATIOS) }),
  sane: ({ r }) => (lt1(r) && r.num !== 0n ? null : 'the ratio must satisfy 0 < |r| < 1'),
  problem: ({ a, r }) => {
    const S = div(q(a), sub(q(1), r));
    return {
      prompt: t`A geometric series has first term ${a} and sum to infinity ${math`${S}`}. Find its common ratio ${mr}.`,
      answer: { kind: 'exact', expected: str(r) },
      solution: [
        t`The sum to infinity is ${math`S = \frac{a}{${1} - r}`}, so ${math`${1} - r = \frac{a}{S}`}.`,
        t`Here ${math`\frac{a}{S} = ${a} \div ${S} = ${div(q(a), S)}`}, so ${math`r = ${1} - ${div(q(a), S)} = ${r}`}.`,
        t`Check: ${math`|r| < ${1}`}, so the series does converge, as the question says.`,
      ],
    };
  },
  solve: ({ a, r }) => {
    // Solve a/(1 - x) = S by testing the candidates; the ratio is one of them.
    const S = div(q(a), sub(q(1), r));
    const hit = RATIOS.find((x) => str(div(q(a), sub(q(1), x))) === str(S));
    return str(hit ?? q(0));
  },
  misconceptions: ({ a, r }): Misconception[] => {
    const S = div(q(a), sub(q(1), r));
    return [
      { response: str(div(q(a), S)), why: t`That is ${math`\frac{a}{S}`}, which equals ${math`${1} - r`}. Take it away from ${1} to get ${mr}.` },
      { response: str(sub(div(q(a), S), q(1))), why: t`The sign is reversed: ${math`${1} - r = \frac{a}{S}`} gives ${math`r = ${1} - \frac{a}{S}`}.` },
      { response: str(div(sub(S, q(a)), q(a))), why: t`That divides by the first term. From ${math`S = \frac{a}{${1} - r}`}, ${math`r = ${1} - \frac{a}{S}`}.` },
    ];
  },
});

interface ConvP { rs: Rational[] }
const IN_POS = [q(1, 2), q(2, 3), q(3, 4), q(4, 5), q(1, 3)];
const IN_NEG = [q(-1, 2), q(-2, 3), q(-3, 4), q(-1, 3), q(-4, 5)];
const OUT_NEG = [q(-1), q(-3, 2), q(-5, 4), q(-2), q(-4, 3)];
const OUT_POS = [q(1), q(3, 2), q(5, 4), q(2), q(4, 3)];

const convGen = generator<ConvP>({
  id: 'which-converge',
  skill: 'Decide which geometric series converge: exactly those with |r| < 1.',
  quick: true,
  params: (rng) => {
    const extra = pick(rng, [...IN_POS, ...IN_NEG, ...OUT_NEG, ...OUT_POS]);
    const rs = [pick(rng, IN_POS), pick(rng, IN_NEG), pick(rng, OUT_NEG), pick(rng, OUT_POS)];
    if (!rs.some((x) => str(x) === str(extra))) rs.push(extra);
    return { rs: sample(rng, rs, rs.length) };
  },
  sane: ({ rs }) => (rs.length >= 4 && new Set(rs.map(str)).size === rs.length ? null : 'need four or five different ratios'),
  problem: ({ rs }) => {
    const series = rs.map((r) => t`${math`${1} + ${br(r)} + ${br(r)}^{${2}} + ${br(r)}^{${3}} + \cdots`}`);
    const options: ChoiceOption[] = series.map((label, i) => ({ id: `s${i}`, label }));
    return {
      prompt: t`Which of these ${rs.length} geometric series converge? Choose all that do. ${join(series, '; ')}.`,
      answer: { kind: 'choice', options, correct: rs.flatMap((r, i) => (lt1(r) ? [`s${i}`] : [])) },
      solution: [
        t`A geometric series converges exactly when its ratio satisfies ${math`|r| < ${1}`}, that is ${math`-${1} < r < ${1}`}.`,
        t`Ratio ${math`${1}`} gives partial sums ${math`${1}, ${2}, ${3}, \ldots`}; ratio ${math`-${1}`} gives ${math`${1}, ${0}, ${1}, ${0}, \ldots`}. Neither settles. A ratio bigger than ${1} in size makes the terms grow.`,
      ],
    };
  },
  solve: ({ rs }) => rs.flatMap((r, i) => (toFloat(r) > -1 && toFloat(r) < 1 ? [`s${i}`] : [])),
  misconceptions: ({ rs }): Misconception[] => [
    { response: rs.flatMap((r, i) => (toFloat(r) < 1 ? [`s${i}`] : [])), why: t`The condition is ${math`|r| < ${1}`}, not ${math`r < ${1}`}. A ratio of ${math`-${1}`} or below makes the terms swing in sign without shrinking.` },
    { response: rs.flatMap((r, i) => (toFloat(r) > 0 && toFloat(r) < 1 ? [`s${i}`] : [])), why: t`A negative ratio is fine as long as ${math`|r| < ${1}`}: the terms alternate in sign and still shrink.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const F14 = 'step-f14';
const F14H = 'step-f14-hints';

const a14q2ii = auto({
  id: 'a14-q2-ii',
  source: cite(F14, 'Assignment 14, Q2(ii)'),
  title: t`A series with ratio ${math`\frac{${1} + \sqrt{${3}}}{${3}}`}`,
  prompt: t`Explain why ${math`\frac{${1} + \sqrt{${3}}}{${3}} < ${1}`}, and hence find the sum of the infinite geometric progression ${dmath`${1} + \frac{${1} + \sqrt{${3}}}{${3}} + \left(\frac{${1} + \sqrt{${3}}}{${3}}\right)^{${2}} + \cdots`} Give it exactly; type a square root as sqrt(${3}).`,
  answer: { kind: 'expression', expected: '6 + 3*sqrt(3)', variables: [] },
  solution: [
    t`The ratio is ${math`r = \frac{${1} + \sqrt{${3}}}{${3}}`}, and it is positive. Since ${math`${1} < ${3} < ${4}`}, taking square roots gives ${math`\sqrt{${3}} < ${2}`}, so ${math`${1} + \sqrt{${3}} < ${3}`} and ${math`r < ${1}`}. So ${math`|r| < ${1}`} and the series converges.`,
    t`The first term is ${1}, so the sum is ${math`\frac{${1}}{${1} - r}`}. Put ${math`${1} - r`} over ${3}: ${math`${1} - \frac{${1} + \sqrt{${3}}}{${3}} = \frac{${3} - ${1} - \sqrt{${3}}}{${3}} = \frac{${2} - \sqrt{${3}}}{${3}}`}.`,
    t`So the sum is ${math`\frac{${3}}{${2} - \sqrt{${3}}}`}. Rationalise: multiply top and bottom by ${math`${2} + \sqrt{${3}}`}. The bottom becomes ${math`(${2} - \sqrt{${3}})(${2} + \sqrt{${3}}) = ${4} - ${3} = ${1}`}.`,
    t`The sum is ${math`${3}(${2} + \sqrt{${3}}) = ${6} + ${3}\sqrt{${3}}`}.`,
  ],
  reference: '6 + 3 sqrt(3)',
  verify: () => {
    const r = (1 + Math.sqrt(3)) / 3;
    let s = 0;
    let term = 1;
    for (let i = 0; i < 400; i++) { s += term; term *= r; }
    return Math.abs(s - (6 + 3 * Math.sqrt(3))) < 1e-9 ? null : `partial sum ${s}, expected ${6 + 3 * Math.sqrt(3)}`;
  },
  misconceptions: [
    { response: '3/(2 + sqrt(3))', why: t`Check ${math`${1} - r`}: it is ${math`\frac{${2} - \sqrt{${3}}}{${3}}`}, with a minus sign, so the sum is ${math`\frac{${3}}{${2} - \sqrt{${3}}}`}.` },
    { response: '3/(1 + sqrt(3))', why: t`That is ${math`\frac{${1}}{r}`}. The sum to infinity is ${math`\frac{a}{${1} - r}`} with ${math`a = ${1}`}.` },
  ],
  official: { source: cite(F14H, 'Assignment 14, Q2(ii)'), answer: '3(2 + sqrt(3))', agrees: true },
});

const a14q2iiConj = auto({
  id: 'a14-q2-ii-b',
  source: cite(F14, 'Assignment 14, Q2(ii)'),
  title: t`The conjugate series`,
  prompt: t`Hence write down the sum of the geometric progression ${dmath`${1} + \frac{${1} - \sqrt{${3}}}{${3}} + \left(\frac{${1} - \sqrt{${3}}}{${3}}\right)^{${2}} + \cdots`} Type a square root as sqrt(${3}).`,
  answer: { kind: 'expression', expected: '6 - 3*sqrt(3)', variables: [] },
  solution: [
    t`Here ${math`r = \frac{${1} - \sqrt{${3}}}{${3}}`} is negative and ${math`|r| = \frac{\sqrt{${3}} - ${1}}{${3}} < ${1}`}, so the series converges.`,
    t`Every step of the previous part goes through with ${math`\sqrt{${3}}`} replaced by ${math`-\sqrt{${3}}`}: the sum is ${math`${3}(${2} - \sqrt{${3}}) = ${6} - ${3}\sqrt{${3}}`}.`,
  ],
  reference: '6 - 3 sqrt(3)',
  verify: () => {
    const r = (1 - Math.sqrt(3)) / 3;
    const s = 1 / (1 - r);
    return Math.abs(s - (6 - 3 * Math.sqrt(3))) < 1e-12 ? null : `sum ${s}`;
  },
  misconceptions: [{ response: '6 + 3*sqrt(3)', why: t`That is the sum of the first series. Here the ratio has ${math`-\sqrt{${3}}`}, so the sign of the surd flips.` }],
  official: { source: cite(F14H, 'Assignment 14, Q2(ii)'), answer: '3(2 - sqrt(3))', agrees: true },
});

const a03q1iii = auto({
  id: 'a3-q1-iii',
  source: cite('step-f03', 'Assignment 3, Q1(iii)'),
  title: t`Ten terms of a halving series`,
  prompt: t`Evaluate ${math`\sum_{i = ${0}}^{${9}} ${3}\left(\frac{${1}}{${2}}\right)^{i}`} exactly, as a fraction.`,
  answer: { kind: 'exact', expected: str(mul(q(6), sub(q(1), q(1, 1024)))) },
  solution: [
    t`It is a finite geometric series: first term ${math`a = ${3}`}, ratio ${math`r = \frac{${1}}{${2}}`}, and ${10} terms (${math`i = ${0}`} to ${9}).`,
    t`${math`\frac{a(${1} - r^{${10}})}{${1} - r} = \frac{${3}\left(${1} - \frac{${1}}{${1024}}\right)}{\frac{${1}}{${2}}} = ${6} \times \frac{${1023}}{${1024}} = ${q(3069, 512)}`}.`,
    t`Compare it with the sum to infinity, ${math`\frac{${3}}{${1} - \frac{${1}}{${2}}} = ${6}`}: ten terms already come within ${math`${sub(q(6), q(3069, 512))}`} of it.`,
  ],
  reference: '3069/512',
  verify: () => same('sum', str(Array.from({ length: 10 }, (_, i) => mul(q(3), pow(q(1, 2), i))).reduce((x, y) => add(x, y), q(0))), '3069/512'),
  misconceptions: [
    { response: '6', why: t`That is the sum to infinity. The sum stops at ${math`i = ${9}`}, ten terms.` },
    { response: str(mul(q(6), sub(q(1), q(1, 512)))), why: t`That is nine terms. From ${math`i = ${0}`} to ${9} is ten terms, so the power is ${math`r^{${10}}`}.` },
  ],
  official: { source: cite('step-f03-hints', 'Assignment 3, Q1(iii)'), answer: '3069/512', agrees: true },
});

const a18q4 = auto({
  id: 'a18-q4-iv',
  source: cite('step-f18', 'Assignment 18, Q4(iv)'),
  title: t`The area of the Koch snowflake`,
  prompt: t`Start with an equilateral triangle of area ${math`A`}. At each step, divide every edge into three equal parts and replace the middle part by two sides of an outward equilateral triangle. After ${mn} steps the shape has area ${dmath`A_{n} = A + \frac{A}{${3}}\left(${1} + r + r^{${2}} + \cdots + r^{n - ${1}}\right).`} Find ${mr} (it comes from the counts: the edges multiply by ${4} at each step, and each new triangle has ${math`\frac{${1}}{${9}}`} the area of the triangles of the step before), and hence find the limit of ${math`A_{n}`} as ${math`n \to \infty`}, in terms of ${math`A`}.`,
  answer: { kind: 'expression', expected: '8*A/5', variables: ['A'] },
  solution: [
    t`At step ${math`k`} there are ${math`${3} \times ${4}^{k - ${1}}`} edges before the step, each gaining a triangle of area ${math`\frac{A}{${9}^{k}}`}. So step ${math`k`} adds ${math`${3} \times ${4}^{k - ${1}} \times \frac{A}{${9}^{k}} = \frac{A}{${3}}\left(\frac{${4}}{${9}}\right)^{k - ${1}}`}.`,
    t`So ${math`r = \frac{${4}}{${9}}`}, and ${math`|r| < ${1}`}, so the bracket converges to ${math`\frac{${1}}{${1} - \frac{${4}}{${9}}} = \frac{${9}}{${5}}`}.`,
    t`The area tends to ${math`A + \frac{A}{${3}} \times \frac{${9}}{${5}} = A + \frac{${3}A}{${5}} = \frac{${8}A}{${5}}`}, finite, even though the perimeter ${math`${3}\left(\frac{${4}}{${3}}\right)^{n}`} grows without bound.`,
  ],
  reference: '8A/5',
  verify: () => {
    // Add the triangles step by step with A = 1: 3 * 4^(k-1) new triangles of area 1/9^k.
    let s = 1;
    for (let k = 1; k <= 200; k++) s += (3 * 4 ** (k - 1)) / 9 ** k;
    return Math.abs(s - 8 / 5) < 1e-12 ? null : `area ${s}, expected 1.6`;
  },
  misconceptions: [
    { response: '4*A/3', why: t`Add the original triangle: the limit is ${math`A + \frac{A}{${3}} \times \frac{${9}}{${5}}`}, and ${math`\frac{A}{${3}} \times \frac{${9}}{${5}} = \frac{${3}A}{${5}}`}.` },
    { response: '3*A/5', why: t`That is only the added area. The snowflake also contains the first triangle, area ${math`A`}.` },
  ],
  official: { source: cite('step-f18-hints', 'Assignment 18, Q4(iv)'), answer: '8A/5', agrees: true },
});

const a24q4i = auto({
  id: 'a24-q4-i',
  source: cite('step-f24', 'Assignment 24, Q4(i)'),
  title: t`The Basel sum from the odd squares`,
  prompt: t`Euler showed that ${math`\sum_{n = ${1}}^{\infty} \frac{${1}}{(${2}n - ${1})^{${2}}} = \frac{\pi^{${2}}}{${8}}`}. Let ${math`S = \sum_{n = ${1}}^{\infty} \frac{${1}}{n^{${2}}}`} and ${math`S_{\text{even}} = \sum_{n = ${1}}^{\infty} \frac{${1}}{(${2}n)^{${2}}}`}. Write ${math`S_{\text{even}}`} in terms of ${mS}, and hence find ${mS}. Type pi for ${math`\pi`}.`,
  answer: { kind: 'expression', expected: 'pi^2/6', variables: [] },
  solution: [
    t`Each term of ${math`S_{\text{even}}`} is ${math`\frac{${1}}{${4}n^{${2}}}`}, so ${math`S_{\text{even}} = \frac{${1}}{${4}}S`}. (Both series converge, as their terms are positive and ${mS} converges, so the terms may be scaled and split this way.)`,
    t`Every whole number is odd or even, so ${math`S = S_{\text{even}} + \frac{\pi^{${2}}}{${8}} = \frac{${1}}{${4}}S + \frac{\pi^{${2}}}{${8}}`}.`,
    t`Then ${math`\frac{${3}}{${4}}S = \frac{\pi^{${2}}}{${8}}`}, so ${math`S = \frac{${4}}{${3}} \times \frac{\pi^{${2}}}{${8}} = \frac{\pi^{${2}}}{${6}}`}.`,
  ],
  reference: 'pi^2/6',
  verify: () => {
    let s = 0;
    for (let n = 1; n <= 2_000_000; n++) s += 1 / (n * n);
    // The tail after N terms is about 1/N.
    return Math.abs(s - Math.PI ** 2 / 6) < 1e-6 ? null : `partial sum ${s}`;
  },
  misconceptions: [
    { response: 'pi^2/8', why: t`That is the sum over the odd numbers only. The even terms add ${math`\frac{${1}}{${4}}S`} more.` },
    { response: 'pi^2/6 * 4/3', why: t`Solve ${math`S - \frac{${1}}{${4}}S = \frac{\pi^{${2}}}{${8}}`}: the left side is ${math`\frac{${3}}{${4}}S`}, so multiply by ${math`\frac{${4}}{${3}}`} once.` },
  ],
  official: { source: cite('step-f24-hints', 'Assignment 24, Q4(i)'), answer: 'pi^2/6', agrees: true },
});

const LAMBDA = (1 + Math.sqrt(5)) / 2;
const MU = (1 - Math.sqrt(5)) / 2;

const a14q3iii = auto({
  id: 'a14-q3-iii',
  source: cite(F14, 'Assignment 14, Q3(iii)'),
  title: t`The sum of ${math`F_{n}/${2}^{n + ${1}}`}`,
  prompt: t`(${2010} STEP II, Question ${3}.) The sequence ${math`F_{${0}} = ${0}, F_{${1}} = ${1}, F_{${2}} = ${1}, F_{${3}} = ${2}, \ldots`} has general term ${math`F_{n} = a\lambda^{n} + b\mu^{n}`}, where (from part (i)) ${math`\lambda = \frac{${1} + \sqrt{${5}}}{${2}}`}, ${math`\mu = \frac{${1} - \sqrt{${5}}}{${2}}`}, ${math`a = \frac{${1}}{\sqrt{${5}}}`} and ${math`b = -\frac{${1}}{\sqrt{${5}}}`}. Evaluate ${dmath`\sum_{n = ${0}}^{\infty} \frac{F_{n}}{${2}^{n + ${1}}}.`}`,
  answer: { kind: 'exact', expected: '1' },
  solution: [
    t`Split the sum into two geometric series: ${math`\sum \frac{F_{n}}{${2}^{n + ${1}}} = \frac{a}{${2}}\sum_{n \ge ${0}} \left(\frac{\lambda}{${2}}\right)^{n} + \frac{b}{${2}}\sum_{n \ge ${0}} \left(\frac{\mu}{${2}}\right)^{n}`}. This is allowed because each of the two series converges.`,
    t`They do converge: ${math`\sqrt{${5}} < ${3}`}, so ${math`\frac{\lambda}{${2}} = \frac{${1} + \sqrt{${5}}}{${4}} < ${1}`}, and ${math`\left|\frac{\mu}{${2}}\right| = \frac{\sqrt{${5}} - ${1}}{${4}} < ${1}`}.`,
    t`Sum each: ${math`\frac{a}{${2}} \cdot \frac{${1}}{${1} - \lambda/${2}} = \frac{a}{${2} - \lambda}`} and likewise ${math`\frac{b}{${2} - \mu}`}. With ${math`b = -a`}: ${math`a\left(\frac{${1}}{${2} - \lambda} - \frac{${1}}{${2} - \mu}\right) = a \cdot \frac{\lambda - \mu}{(${2} - \lambda)(${2} - \mu)}`}.`,
    t`Now ${math`\lambda - \mu = \sqrt{${5}}`}, and ${math`(${2} - \lambda)(${2} - \mu) = ${4} - ${2}(\lambda + \mu) + \lambda\mu = ${4} - ${2} - ${1} = ${1}`}, using ${math`\lambda + \mu = ${1}`} and ${math`\lambda\mu = -${1}`}.`,
    t`So the sum is ${math`\frac{${1}}{\sqrt{${5}}} \times \sqrt{${5}} = ${1}`}.`,
  ],
  reference: '1',
  verify: () => {
    let s = 0;
    let [f0, f1] = [0, 1];
    for (let n = 0; n < 200; n++) { s += f0 / 2 ** (n + 1); [f0, f1] = [f1, f0 + f1]; }
    const closed = (1 / Math.sqrt(5)) * (1 / (2 - LAMBDA) - 1 / (2 - MU));
    return Math.abs(s - 1) < 1e-12 && Math.abs(closed - 1) < 1e-12 ? null : `sum ${s}, closed form ${closed}`;
  },
  misconceptions: [
    { response: '2', why: t`The denominator is ${math`${2}^{n + ${1}}`}, not ${math`${2}^{n}`}: that halves every term, and the sum is half of ${2}.` },
    { response: '1/2', why: t`Check ${math`(${2} - \lambda)(${2} - \mu)`}: it is ${math`${4} - ${2}(\lambda + \mu) + \lambda\mu = ${1}`}.` },
  ],
  official: { source: cite(F14H, 'Assignment 14, Q3(iii)'), answer: '1', agrees: true },
});

const a03q1ii = supervision({
  id: 'a3-q1-ii',
  source: cite('step-f03', 'Assignment 3, Q1(ii)'),
  title: t`Derive the sum to infinity`,
  prompt: t`Let ${math`S_{n} = \sum_{i = ${0}}^{n - ${1}} r^{i}`}. Simplify ${math`rS_{n} - S_{n}`} and hence find a formula for ${math`S_{n}`} when ${math`r \neq ${1}`}; give ${math`S_{n}`} when ${math`r = ${1}`}. Deduce ${math`\sum_{i = ${0}}^{n - ${1}} ar^{i}`}. If ${math`-${1} < r < ${1}`}, what happens to ${math`r^{n}`} as ${mn} grows? Deduce ${math`\sum_{i = ${0}}^{\infty} ar^{i}`}.`,
  writeUp: 'proof',
  official: cite('step-f03-hints', 'Assignment 3, Q1(ii)'),
});

// ---------------------------------------------------------------- lesson

const HALF = [1, 2, 3, 4].map((n) => sub(q(1), pow(q(1, 2), n)));
const EXR = q(1, 3);
const EXS = div(q(3), sub(q(1), EXR));

export const geometricSumToInfinity: TopicContent = {
  topicId: 'alg.geometric-sum-to-infinity',
  goal: t`Sum a geometric series to infinity with ${math`\frac{a}{${1} - r}`} when ${math`|r| < ${1}`}, and say why there is no sum otherwise.`,
  objective: t`Sum a geometric series to infinity, and know exactly when it has a sum.`,
  why: t`Infinite sums appear all through STEP and analysis; this is the one you can always do exactly.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Adding forever` },
    { kind: 'hook', text: t`Walk halfway to a wall. Then walk half the distance that is left, then half of what is left after that, and keep going. You take infinitely many steps. Do you ever pass the wall?` },
    { kind: 'narrative', text: t`Say the wall is ${1} metre away. Your steps are ${math`\frac{${1}}{${2}}, \frac{${1}}{${4}}, \frac{${1}}{${8}}, \ldots`} metres. After one step you have covered ${math`${HALF[0] as Rational}`}; after two, ${math`${HALF[1] as Rational}`}; after three, ${math`${HALF[2] as Rational}`}; after four, ${math`${HALF[3] as Rational}`}. You creep towards ${1} and never pass it.` },
    { kind: 'narrative', text: t`So it is tempting to write ${math`\frac{${1}}{${2}} + \frac{${1}}{${4}} + \frac{${1}}{${8}} + \cdots = ${1}`}. But pause. Addition is defined for two numbers, and so for any finite list. Nobody has told us what it means to add infinitely many. We have to decide, and the walk tells us how: look at the totals after each step, and ask where they are heading.` },
    { kind: 'section', title: t`Partial sums` },
    {
      kind: 'definition',
      name: t`Partial sum, sum to infinity`,
      formal: t`Let ${math`u_{${0}}, u_{${1}}, u_{${2}}, \ldots`} be real numbers. The ${mn}th [[partial-sum|partial sum]] is ${math`S_{n} = \sum_{k = ${0}}^{n - ${1}} u_{k}`}, the sum of the first ${mn} terms. The series ${math`\sum_{k = ${0}}^{\infty} u_{k}`} converges if there is a real number ${mS} with ${math`S_{n} \to S`} as ${math`n \to \infty`}; then ${mS} is its [[sum-to-infinity|sum to infinity]], and we write ${math`\sum_{k = ${0}}^{\infty} u_{k} = S`}. Otherwise the series diverges.`,
      plain: t`Add the terms one at a time and watch the running totals. If the totals settle down on one number, that number is the sum. For the walk, ${math`S_{n} = ${1} - \left(\frac{${1}}{${2}}\right)^{n}`}, and these totals settle on ${1}.`,
    },
    { kind: 'p', text: t`What "${math`S_{n} \to S`}" means: ${math`S_{n}`} gets as close to ${mS} as you like, and stays that close, once ${mn} is large enough. The lesson on limits of sequences makes this precise; here we only need one fact about powers, proved below.` },
    { kind: 'narrative', text: t`For a geometric series we already have a formula for the partial sums. With first term ${ma} and common ratio ${mr}, and ${math`r \neq ${1}`}, ${dmath`S_{n} = a + ar + \cdots + ar^{n - ${1}} = \frac{a(${1} - r^{n})}{${1} - r}.`} The only part that changes with ${mn} is ${math`r^{n}`}. So everything turns on one question: what does ${math`r^{n}`} do as ${mn} grows?` },
    { kind: 'section', title: t`What happens to powers` },
    { kind: 'theorem', name: t`Powers of a number smaller than one`, statement: t`If ${math`|r| < ${1}`}, then ${math`r^{n} \to ${0}`} as ${math`n \to \infty`}.` },
    { kind: 'narrative', text: t`The idea: if ${math`|r| < ${1}`}, then ${math`\frac{${1}}{|r|}`} is bigger than ${1}, so it is ${math`${1} + h`} for some positive ${math`h`}. Powers of ${math`${1} + h`} grow at least as fast as ${math`${1} + nh`}, which is as large as we like, so their reciprocals are as small as we like.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Dispose of zero`, text: t`If ${math`r = ${0}`}, then ${math`r^{n} = ${0}`} for every ${math`n \ge ${1}`}. So suppose ${math`${0} < |r| < ${1}`}.` },
        { label: t`Name the gap`, text: t`Then ${math`\frac{${1}}{|r|} > ${1}`}; write ${math`\frac{${1}}{|r|} = ${1} + h`} with ${math`h > ${0}`}.`, plain: t`For ${math`r = \frac{${1}}{${2}}`}, ${math`\frac{${1}}{|r|} = ${2}`}, so ${math`h = ${1}`}. For ${math`r = -\frac{${3}}{${4}}`}, ${math`h = \frac{${1}}{${3}}`}.` },
        {
          label: t`Bound the power below`,
          text: t`For every ${math`n \ge ${1}`},`,
          eq: [dmath`(${1} + h)^{n} \ge ${1} + nh.`],
          why: { q: t`Why is ${math`(${1} + h)^{n} \ge ${1} + nh`}?`, a: t`Expand by the binomial theorem: ${math`(${1} + h)^{n} = ${1} + nh + \binom{n}{${2}}h^{${2}} + \cdots + h^{n}`}. Every term after the first two is positive, since ${math`h > ${0}`}, so dropping them makes the right side smaller.` },
        },
        { label: t`Turn it upside down`, text: t`Taking reciprocals of positive numbers reverses the inequality: ${math`|r|^{n} = \frac{${1}}{(${1} + h)^{n}} \le \frac{${1}}{${1} + nh} < \frac{${1}}{nh}`}.` },
        { label: t`Make it small`, text: t`Given any ${math`\varepsilon > ${0}`}, every ${math`n > \frac{${1}}{h\varepsilon}`} has ${math`\frac{${1}}{nh} < \varepsilon`}, so ${math`|r^{n} - ${0}| = |r|^{n} < \varepsilon`}. Hence ${math`r^{n} \to ${0}`}.`, plain: t`However small a target you name, the powers get inside it and stay there. That is what tending to ${0} means.` },
      ],
    },
    { kind: 'section', title: t`The sum to infinity` },
    { kind: 'theorem', name: t`Sum of a geometric series`, statement: t`Let ${math`a \neq ${0}`}. The series ${math`\sum_{k = ${0}}^{\infty} ar^{k}`} converges if and only if ${math`|r| < ${1}`}, and then ${dmath`\sum_{k = ${0}}^{\infty} ar^{k} = \frac{a}{${1} - r}.`}` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Write the partial sum`, text: t`For ${math`r \neq ${1}`}, split the formula for ${math`S_{n}`} into a fixed part and a moving part:`, eq: [dmath`S_{n} = \frac{a(${1} - r^{n})}{${1} - r} = \frac{a}{${1} - r} - \frac{a}{${1} - r}\,r^{n}.`] },
        { label: t`Let the power vanish`, text: t`If ${math`|r| < ${1}`}, then ${math`r^{n} \to ${0}`} by the theorem above, so the moving part tends to ${0} and ${math`S_{n} \to \frac{a}{${1} - r}`}.`, plain: t`The fixed number ${math`\frac{a}{${1} - r}`} is where the totals are heading; the error is a constant times ${math`r^{n}`}, which dies away.` },
        {
          label: t`Terms must shrink`,
          text: t`If instead ${math`S_{n} \to S`}, then ${math`S_{n + ${1}} - S_{n} \to S - S = ${0}`}. But ${math`S_{n + ${1}} - S_{n} = ar^{n}`}.`,
          why: { q: t`Why does ${math`S_{n + ${1}} - S_{n}`} tend to ${0}?`, a: t`Both ${math`S_{n + ${1}}`} and ${math`S_{n}`} get within any ${math`\varepsilon`} of ${mS} for large ${mn}, so their difference is within ${math`${2}\varepsilon`} of ${0}.` },
        },
        { label: t`So the ratio is small`, text: t`If ${math`|r| \ge ${1}`}, then ${math`|ar^{n}| = |a||r|^{n} \ge |a| > ${0}`} for every ${mn}, so ${math`ar^{n}`} does not tend to ${0}. Hence the series diverges.`, plain: t`With ${math`|r| \ge ${1}`}, every term is at least as big as the first in size, so each step moves the total by a fixed amount and it can never settle.` },
      ],
    },
    { kind: 'p', text: t`Example: ${math`${3} + ${1} + \frac{${1}}{${3}} + \cdots`} has ${math`a = ${3}`} and ${math`r = ${EXR}`}, so its sum is ${math`\frac{${3}}{${1} - ${EXR}} = ${EXS}`}. Take a moment to check the first few partial sums, ${math`${3}, ${4}, ${q(13, 3)}`}: they are closing in on ${math`${EXS}`}.` },
    checkFrom(sumGen, { a: 6, r: q(-1, 2) }, t`Here ${math`a = ${6}`} and ${math`r = -\frac{${1}}{${2}}`}, so ${math`${1} - r = \frac{${3}}{${2}}`} and the sum is ${math`${6} \div \frac{${3}}{${2}} = ${4}`}.`),
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${math`${1} - ${1} + ${1} - ${1} + \cdots = \frac{${1}}{${2}}`}, because ${math`\frac{a}{${1} - r}`} with ${math`a = ${1}`} and ${math`r = -${1}`} gives ${math`\frac{${1}}{${2}}`}.`, counterexample: t`The partial sums are ${math`${1}, ${0}, ${1}, ${0}, \ldots`}, which never settle, so the series has no sum. The formula was only proved for ${math`|r| < ${1}`}.` },
    { kind: 'pitfall', claim: t`If the terms of a series tend to ${0}, the series converges.`, counterexample: t`${math`${1} + \frac{${1}}{${2}} + \frac{${1}}{${3}} + \frac{${1}}{${4}} + \cdots`} diverges, though its terms tend to ${0}. Group it as ${math`${1} + \frac{${1}}{${2}} + \left(\frac{${1}}{${3}} + \frac{${1}}{${4}}\right) + \left(\frac{${1}}{${5}} + \cdots + \frac{${1}}{${8}}\right) + \cdots`}: each bracket is at least ${math`\frac{${1}}{${2}}`}, so the totals pass every number. Shrinking terms are necessary, not enough.` },
    { kind: 'pitfall', claim: t`${math`\sum_{k = ${1}}^{\infty} r^{k} = \frac{${1}}{${1} - r}`}.`, counterexample: t`This sum starts at ${math`k = ${1}`}, so its first term is ${math`r`}, and the sum is ${math`\frac{r}{${1} - r}`}. For ${math`r = \frac{${1}}{${2}}`} that is ${1}, not ${2}. Always read off the first term.` },
    { kind: 'narrative', text: t`One more use: a recurring decimal is a geometric series in disguise. ${math`${0}.\overline{${9}} = \frac{${9}}{${10}} + \frac{${9}}{${100}} + \cdots`} has ${math`a = \frac{${9}}{${10}}`} and ${math`r = \frac{${1}}{${10}}`}, so it equals ${math`\frac{${9}/${10}}{${9}/${10}} = ${1}`}. Not "just below" ${1}: exactly ${1}, because the sum is defined as the limit of the totals.` },
    { kind: 'takeaway', text: t`A geometric series has a sum exactly when ${math`|r| < ${1}`}, and then it is the first term over ${math`${1} - r`}.` },
  ],
  examples: [
    workedCambridge(a14q2ii),
    worked(sumGen, { a: 5, r: q(-2, 3) }, t`A negative ratio`),
    worked(decimalGen, { block: 27, k: 2 }, t`A recurring decimal`),
  ],
  generators: [sumGen, decimalGen, ratioGen, convGen],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['partial-sum', 'sum-to-infinity'],
  cambridge: withUses([a14q3iii, a18q4, a14q2iiConj, a03q1iii, a24q4i, a03q1ii], {
    'a18-q4-iv': { sections: ['Partial sums', 'The sum to infinity'], note: t`Finding the ratio from a geometric picture, then the limit of the area` },
    'a14-q3-iii': { sections: ['The sum to infinity'], note: t`Splitting into two geometric series and simplifying surds`, needs: ['alg.surds'] },
  }),
  gate: ['a18-q4-iv', 'a14-q3-iii'],
  recall: [
    { front: t`When does ${math`\sum_{k \ge ${0}} ar^{k}`} converge, and to what (with ${math`a \neq ${0}`})?`, back: t`Exactly when ${math`|r| < ${1}`}; its sum is ${math`\frac{a}{${1} - r}`}.` },
    { front: t`What does it mean for ${math`\sum u_{k}`} to converge to ${mS}?`, back: t`The partial sums ${math`S_{n} = u_{${0}} + \cdots + u_{n - ${1}}`} tend to ${mS} as ${math`n \to \infty`}.` },
    { front: t`Why does ${math`r^{n} \to ${0}`} when ${math`${0} < |r| < ${1}`}?`, back: t`Write ${math`\frac{${1}}{|r|} = ${1} + h`}; then ${math`(${1} + h)^{n} \ge ${1} + nh`}, so ${math`|r|^{n} < \frac{${1}}{nh}`}.` },
  ],
  proofOrder: [
    {
      title: t`The sum to infinity of a geometric series`,
      steps: [
        t`For ${math`r \neq ${1}`}, ${math`S_{n} = \frac{a(${1} - r^{n})}{${1} - r}`}.`,
        t`Split it: ${math`S_{n} = \frac{a}{${1} - r} - \frac{a}{${1} - r}r^{n}`}.`,
        t`If ${math`|r| < ${1}`}, then ${math`r^{n} \to ${0}`}.`,
        t`So ${math`S_{n} \to \frac{a}{${1} - r}`}, and that is the sum.`,
      ],
    },
  ],
};
