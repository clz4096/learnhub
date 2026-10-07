/**
 * an.sequence-limits: what x_n -> a means (the epsilon-N definition), with the basic limits
 * 1/n -> 0 and r^n -> 0 for |r| < 1, and limits of quotients by dividing through. STEP adds
 * "the limit of a sequence" to the A-level content (STEP specification, in bold italics);
 * the gates are IA Analysis I Example Sheet 1, Q1a (prove from the definition that the limit
 * of a sum is the sum of the limits, which the lesson states and leaves to the analysis course)
 * and IA Numbers and Sets Example Sheet 3, Q14 (a convergent sequence has differences tending to
 * 0, and the converse fails). The NST Mathematics Workbook, SS4 (the powers k^n, case by case,
 * checked by computing far-out terms) asks for the lesson's own theorem on powers, so it is
 * practice (2026-10-07). STEP Support Assignment 15, Q2 (limits of iterated sequences as
 * fixed points) is further practice, checked against the hints and by iterating; its Q3(ii)
 * (2006 STEP II Q1) gates alg.recurrence-sequences, which teaches the fixed-point idea.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick, q, str, type Rational } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { dmath, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const [mn, mN, me] = [math`n`, math`N`, math`\varepsilon`];

// ---------------------------------------------------------------- generators

interface NP { c: number; m: number }

const nGen = generator<NP>({
  id: 'find-N',
  skill: 'For c/n -> 0, find the smallest N with c/n < 1/m for every n >= N.',
  quick: true,
  params: (rng) => ({ c: int(rng, 1, 9), m: pick(rng, [10, 20, 50, 100, 1000]) }),
  sane: ({ c, m }) => (c >= 1 && m >= 10 ? null : 'out of range'),
  problem: ({ c, m }) => ({
    prompt: t`For the sequence ${math`x_{n} = \frac{${c}}{n}`}, find the smallest natural number ${mN} such that ${math`|x_{n} - ${0}| < \frac{${1}}{${m}}`} for every ${math`n \ge N`}.`,
    answer: { kind: 'exact', expected: String(c * m + 1) },
    solution: [
      t`${math`\frac{${c}}{n} < \frac{${1}}{${m}}`} exactly when ${math`n > ${c} \times ${m} = ${c * m}`}.`,
      t`So it holds for every ${math`n \ge ${c * m + 1}`} and fails at ${math`n = ${c * m}`}, where ${math`\frac{${c}}{${c * m}} = \frac{${1}}{${m}}`} exactly. Hence ${math`N = ${c * m + 1}`}.`,
    ],
  }),
  solve: ({ c, m }) => {
    let n = 1;
    while (!(c * m < n)) n++;
    return String(n);
  },
  misconceptions: ({ c, m }): Misconception[] => [
    { response: String(c * m), why: t`At ${math`n = ${c * m}`}, ${math`\frac{${c}}{n}`} equals ${math`\frac{${1}}{${m}}`}; the inequality is strict, so start one later.` },
    { response: String(m), why: t`That ignores the ${c} on top: ${math`\frac{${c}}{n} < \frac{${1}}{${m}}`} needs ${math`n > ${c * m}`}.` },
  ],
});

interface RatP { a: number; b: number; c: number; d: number }

const ratGen = generator<RatP>({
  id: 'quotient',
  skill: 'Find the limit of (an + b)/(cn + d) by dividing top and bottom by n.',
  params: (rng) => {
    for (;;) {
      const p = { a: int(rng, -6, 9), b: int(rng, -9, 9), c: int(rng, 1, 8), d: int(rng, 1, 9) };
      if (p.a !== 0 && p.a * p.d !== p.b * p.c && p.a + p.b !== 0) return p;
    }
  },
  sane: ({ a, b, c, d }) => (c > 0 && d > 0 && a !== 0 && a * d !== b * c ? null : 'need a genuine quotient'),
  problem: ({ a, b, c, d }) => ({
    prompt: t`Find the limit as ${math`n \to \infty`} of ${math`x_{n} = \frac{${a === 1 ? '' : a === -1 ? '-' : a}n ${b < 0 ? '-' : '+'} ${Math.abs(b)}}{${c === 1 ? '' : c}n + ${d}}`}.`,
    answer: { kind: 'exact', expected: str(q(a, c)) },
    solution: [
      t`Divide top and bottom by ${mn}: ${math`x_{n} = \frac{${a} ${b < 0 ? '-' : '+'} ${Math.abs(b)}/n}{${c} + ${d}/n}`}.`,
      t`As ${math`n \to \infty`}, ${math`\frac{${1}}{n} \to ${0}`}, so the top tends to ${a} and the bottom to ${c}, which is not ${0}. By the limit laws, ${math`x_{n} \to ${q(a, c)}`}.`,
    ],
  }),
  solve: ({ a, b, c, d }) => {
    // Evaluate far out and round to the nearest fraction with denominator c.
    const n = 1e9;
    const x = (a * n + b) / (c * n + d);
    return str(q(Math.round(x * c), c));
  },
  misconceptions: ({ a, b, c, d }): Misconception[] => [
    { response: str(q(b, d)), why: t`That is the value at ${math`n = ${0}`}. For large ${mn} the terms in ${mn} dominate.` },
    { response: str(q(a + b, c + d)), why: t`That is ${math`x_{${1}}`}, the first term. A limit is about large ${mn}.` },
  ],
});

interface PowP { r: Rational }
const POWS: readonly Rational[] = [q(1, 2), q(-1, 2), q(2, 3), q(-3, 4), q(1), q(-1), q(3, 2), q(-2), q(2), q(5, 4), q(-5, 4), q(9, 10)];
const OPTS: ChoiceOption[] = [
  { id: 'zero', label: t`It converges to ${0}.` },
  { id: 'one', label: t`It is constant, so it converges to ${1}.` },
  { id: 'inf', label: t`It diverges: its terms grow without bound, all positive.` },
  { id: 'alt', label: t`It diverges: it alternates in sign and never settles.` },
];
const powKind = (r: Rational): string => {
  const x = Number(r.num) / Number(r.den);
  if (Math.abs(x) < 1) return 'zero';
  if (x === 1) return 'one';
  return x > 1 ? 'inf' : 'alt';
};

const powGen = generator<PowP>({
  id: 'powers',
  skill: 'Describe r^n: tends to 0 for |r| < 1, constant for r = 1, diverges otherwise.',
  quick: true,
  params: (rng) => ({ r: pick(rng, POWS) }),
  sane: () => null,
  problem: ({ r }) => ({
    prompt: t`Describe the behaviour of the sequence ${math`x_{n} = \left(${r}\right)^{n}`} as ${math`n \to \infty`}.`,
    answer: { kind: 'choice', options: OPTS, correct: powKind(r) },
    solution: [
      t`For ${math`|r| < ${1}`}, ${math`r^{n} \to ${0}`}. For ${math`r = ${1}`} every term is ${1}. For ${math`r > ${1}`}, ${math`r^{n}`} grows without bound. For ${math`r \le -${1}`} the terms alternate in sign with size at least ${1}, so they cannot settle.`,
      t`Here ${math`r = ${r}`}.`,
    ],
  }),
  solve: ({ r }) => {
    const x = Number(r.num) / Number(r.den);
    const a = x ** 200;
    const b = x ** 201;
    if (Math.abs(a) < 1e-6) return ['zero'];
    if (a === 1 && b === 1) return ['one'];
    return [a > 0 && b > 0 ? 'inf' : 'alt'];
  },
  misconceptions: ({ r }): Misconception[] => {
    const k = powKind(r);
    const wrong: Record<string, [string, string]> = { zero: ['alt', 'inf'], one: ['zero', 'inf'], inf: ['zero', 'alt'], alt: ['zero', 'one'] };
    return (wrong[k] as [string, string]).map((w) => ({
      response: [w],
      why: w === 'zero' ? t`Only ${math`|r| < ${1}`} makes the powers shrink; here ${math`|r| \ge ${1}`}.` : w === 'alt' ? t`A negative ratio with ${math`|r| < ${1}`} still alternates, but the terms shrink to ${0}: alternating is no obstacle to converging.` : w === 'one' ? t`Only ${math`r = ${1}`} gives a constant sequence. Write out a few terms.` : t`Check the sign of ${math`r`}: a negative ${math`r`} makes the signs alternate.`,
    }));
  },
});

interface ExpP { p: number; qq: number; r: number; s: number }

const expGen = generator<ExpP>({
  id: 'dominant-term',
  skill: 'Find limits like (p 3^n + q 2^n)/(r 3^n + s) by dividing by the dominant power.',
  params: (rng) => {
    for (;;) {
      const x = { p: int(rng, 1, 9), qq: int(rng, 1, 9), r: int(rng, 1, 9), s: int(rng, 1, 9) };
      // Not proportional, so the first terms and the limit differ.
      if (x.p * x.s !== x.qq * x.r) return x;
    }
  },
  sane: ({ p, qq, r, s }) => (p >= 1 && r >= 1 && p * s !== qq * r ? null : 'out of range'),
  problem: ({ p, qq, r, s }) => ({
    prompt: t`Find ${math`\lim_{n \to \infty} \frac{${p} \cdot ${3}^{n} + ${qq} \cdot ${2}^{n}}{${r} \cdot ${3}^{n} + ${s}}`}.`,
    answer: { kind: 'exact', expected: str(q(p, r)) },
    solution: [
      t`Divide top and bottom by ${math`${3}^{n}`}: ${math`\frac{${p} + ${qq}\left(\frac{${2}}{${3}}\right)^{n}}{${r} + ${s}\left(\frac{${1}}{${3}}\right)^{n}}`}.`,
      t`Both ${math`\left(\frac{${2}}{${3}}\right)^{n}`} and ${math`\left(\frac{${1}}{${3}}\right)^{n}`} tend to ${0}, as their ratios are smaller than ${1}. So the limit is ${math`${q(p, r)}`}.`,
    ],
  }),
  solve: ({ p, qq, r, s }) => {
    const n = 200;
    const x = (p + qq * (2 / 3) ** n) / (r + s * (1 / 3) ** n);
    return str(q(Math.round(x * r * 1000), r * 1000));
  },
  misconceptions: ({ p, qq, r, s }): Misconception[] => [
    { response: str(q(p + qq, r + s)), why: t`That is the value at ${math`n = ${0}`}. For large ${mn}, ${math`${3}^{n}`} swamps ${math`${2}^{n}`} and the constant.` },
    { response: str(q(qq, s)), why: t`The powers of ${3} dominate, not the smaller terms: divide by ${math`${3}^{n}`}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const F15 = 'step-f15';
const F15H = 'step-f15-hints';
/** Iterate u_(n+1) = f(u_n) from u_1, n times. */
const iterate = (f: (x: number) => number, u1: number, n: number): number => {
  let u = u1;
  for (let i = 0; i < n; i++) u = f(u);
  return u;
};

const a15b = auto({
  id: 'a15-q2-i-b',
  source: cite(F15, 'Assignment 15, Q2(i)(b)'),
  title: t`A limit as a fixed point`,
  prompt: t`The sequence ${math`u_{${1}} = ${1}`}, ${math`u_{n + ${1}} = ${6} - \frac{${4}}{u_{n}}`} begins ${math`${1}, ${2}, ${4}, ${5}, ${q(26, 5)}, ${q(68, 13)}, \ldots`} and converges. Find its limit by setting ${math`u_{n} = u_{n + ${1}} = l`}. Type a square root as sqrt(${5}).`,
  answer: { kind: 'expression', expected: '3 + sqrt(5)', variables: [] },
  solution: [
    t`If ${math`u_{n} \to l`}, then ${math`u_{n + ${1}} \to l`} too, and ${math`${6} - \frac{${4}}{u_{n}} \to ${6} - \frac{${4}}{l}`} (as ${math`l \neq ${0}`}). So ${math`l = ${6} - \frac{${4}}{l}`}.`,
    t`Multiply by ${math`l`}: ${math`l^{${2}} - ${6}l + ${4} = ${0}`}, so ${math`l = ${3} \pm \sqrt{${5}}`}.`,
    t`Which one? From ${math`u_{${3}} = ${4}`} on, every term is at least ${4}: if ${math`u_{n} \ge ${4}`} then ${math`u_{n + ${1}} = ${6} - \frac{${4}}{u_{n}} \ge ${5}`}. So the limit is at least ${4}, which rules out ${math`${3} - \sqrt{${5}} < ${1}`}. The limit is ${math`${3} + \sqrt{${5}}`}.`,
  ],
  reference: '3 + sqrt(5)',
  verify: () => {
    const l = iterate((x) => 6 - 4 / x, 1, 200);
    return Math.abs(l - (3 + Math.sqrt(5))) < 1e-12 ? null : `iterated to ${l}`;
  },
  misconceptions: [
    { response: '3 - sqrt(5)', why: t`That root is about ${math`${0.76}`}, but from ${math`u_{${3}} = ${4}`} on every term is at least ${4}, and a limit of such terms is at least ${4}.` },
    { response: '6', why: t`The fixed point solves ${math`l = ${6} - \frac{${4}}{l}`}; ${6} does not.` },
  ],
  official: { source: cite(F15H, 'Assignment 15, Q2(i)(b)'), answer: '3 + sqrt(5)', agrees: true },
});

const a15c = auto({
  id: 'a15-q2-i-c',
  source: cite(F15, 'Assignment 15, Q2(i)(c)'),
  title: t`A slowly settling sequence`,
  prompt: t`The sequence ${math`u_{${1}} = ${2}`}, ${math`u_{n + ${1}} = \frac{${1}}{${4}}\left(u_{n}^{${2}} + ${2}\right)`} begins ${math`${2}, ${q(3, 2)}, ${q(17, 16)}, \ldots`} and converges. Find its limit. Type a square root as sqrt(${2}).`,
  answer: { kind: 'expression', expected: '2 - sqrt(2)', variables: [] },
  solution: [
    t`The limit ${math`l`} satisfies ${math`l = \frac{l^{${2}} + ${2}}{${4}}`}, that is ${math`l^{${2}} - ${4}l + ${2} = ${0}`}, so ${math`l = ${2} \pm \sqrt{${2}}`}.`,
    t`The terms fall below ${2} after the first: ${math`u_{${2}} = ${q(3, 2)}`}, and if ${math`${0} < u_{n} < ${2}`} then ${math`u_{n + ${1}} < \frac{${4} + ${2}}{${4}} < ${2}`}. So the limit is at most ${2}, and it is ${math`${2} - \sqrt{${2}}`}.`,
  ],
  reference: '2 - sqrt(2)',
  verify: () => {
    const l = iterate((x) => (x * x + 2) / 4, 2, 500);
    return Math.abs(l - (2 - Math.SQRT2)) < 1e-12 ? null : `iterated to ${l}`;
  },
  misconceptions: [{ response: '2 + sqrt(2)', why: t`The terms are below ${2} from ${math`u_{${2}}`} on, so the limit cannot be ${math`${2} + \sqrt{${2}} > ${3}`}.` }],
  official: { source: cite(F15H, 'Assignment 15, Q2(i)(c)'), answer: '2 - sqrt(2)', agrees: true },
});

const a15iv = auto({
  id: 'a15-q2-iv',
  source: cite(F15, 'Assignment 15, Q2(iv)'),
  title: t`A machine for ${math`\sqrt{${2}}`}`,
  prompt: t`The convergent sequence ${math`u_{${1}} = ${1}`}, ${math`u_{n + ${1}} = \frac{${1}}{${2}}\left(\frac{${2}}{u_{n}} + u_{n}\right)`} begins ${math`${1}, ${q(3, 2)}, ${q(17, 12)}, ${q(577, 408)}, \ldots`}. By setting ${math`u_{n} = u_{n + ${1}} = l`}, find the limit.`,
  answer: { kind: 'expression', expected: 'sqrt(2)', variables: [] },
  solution: [
    t`${math`l = \frac{${1}}{${2}}\left(\frac{${2}}{l} + l\right)`} gives ${math`${2}l = \frac{${2}}{l} + l`}, so ${math`l = \frac{${2}}{l}`} and ${math`l^{${2}} = ${2}`}.`,
    t`Every term is positive (a positive ${math`u_{n}`} gives a positive ${math`u_{n + ${1}}`}), so ${math`l \ge ${0}`} and ${math`l = \sqrt{${2}}`}. Already ${math`u_{${5}} = ${q(665857, 470832)}`} agrees with ${math`\sqrt{${2}}`} to about ${11} decimal places.`,
  ],
  reference: 'sqrt(2)',
  verify: () => {
    let u = q(1);
    for (let i = 0; i < 4; i++) u = { num: u.num * u.num + 2n * u.den * u.den, den: 2n * u.num * u.den } as Rational;
    return same('u_5', `${u.num}/${u.den}`, '665857/470832');
  },
  misconceptions: [{ response: '-sqrt(2)', why: t`All the terms are positive, so the limit is not negative.` }],
});

// NST Mathematics Workbook, SS4: the powers of a fixed number, case by case.
const SS4: { id: string; k: Rational; label: string; holds: boolean }[] = [
  { id: 'a', k: q(9, 10), label: 'tends to zero', holds: true },
  { id: 'b', k: q(-9, 10), label: 'alternates in sign, so it has no limit', holds: false },
  { id: 'c', k: q(1), label: 'tends to one', holds: true },
  { id: 'd', k: q(-1), label: 'has no limit', holds: true },
  { id: 'e', k: q(11, 10), label: 'converges, since each term is only a little larger than the one before', holds: false },
  { id: 'f', k: q(-2), label: 'has no limit, and its size grows without bound', holds: true },
];
/** The behaviour of k^n, read from far-out terms: 'zero', 'one', 'none', or 'none-unbounded'. */
const powerFate = (k: Rational): string => {
  const x = Number(k.num) / Number(k.den);
  const [a, b] = [x ** 400, x ** 401];
  if (Math.abs(a) < 1e-12 && Math.abs(b) < 1e-12) return 'zero';
  if (a === 1 && b === 1) return 'one';
  return Math.abs(a) > 1e12 ? 'none-unbounded' : 'none';
};
/** Whether each statement of the SS4 check is true, from the computed fate. */
const ss4Holds = (row: (typeof SS4)[number]): boolean => {
  const f = powerFate(row.k);
  if (row.id === 'a') return f === 'zero';
  if (row.id === 'b') return f === 'none' || f === 'none-unbounded';
  if (row.id === 'c') return f === 'one';
  if (row.id === 'd') return f === 'none';
  if (row.id === 'e') return f === 'zero' || f === 'one';
  return f === 'none-unbounded';
};
const SS4_TRUE = SS4.filter((r) => r.holds).map((r) => r.id);

const nstSs4 = supervision({
  id: 'nst-ss4',
  source: cite('nst-workbook', 'SS4'),
  title: t`Powers of a fixed number`,
  prompt: t`The sequence ${math`u_{n}`} satisfies ${math`u_{n + ${1}} = ku_{n}`}, where ${math`k`} is a fixed number, and ${math`u_{${0}} = ${1}`}. Express ${math`u_{n}`} in terms of ${math`k`}. Describe the behaviour of ${math`u_{n}`} for large ${mn} in the different cases that arise according to the value of ${math`k`}.`,
  writeUp: 'explanation',
  official: cite('nst-workbook', 'Answers, SS4'),
});

const nstSs4Cases = auto({
  id: 'nst-ss4-cases',
  source: cite('nst-workbook', 'SS4', true),
  title: t`Powers of a fixed number, case by case`,
  prompt: t`The sequence ${math`u_{n}`} satisfies ${math`u_{n + ${1}} = ku_{n}`}, where ${math`k`} is a fixed number, and ${math`u_{${0}} = ${1}`}. Which of these statements about ${math`u_{n}`} as ${math`n \to \infty`} are true? Choose all that are.`,
  answer: {
    kind: 'choice',
    options: SS4.map((r) => ({ id: r.id, label: t`If ${math`k = ${r.k}`}, the sequence ${r.label}.` })),
    correct: SS4_TRUE,
  },
  solution: [
    t`Each step multiplies by ${math`k`}, so ${math`u_{${1}} = k`}, ${math`u_{${2}} = k^{${2}}`}, and in general ${math`u_{n} = k^{n}`}: by induction, if ${math`u_{n} = k^{n}`} then ${math`u_{n + ${1}} = k \cdot k^{n} = k^{n + ${1}}`}.`,
    t`So the theorem on powers decides each case. For ${math`|k| < ${1}`}, ${math`k^{n} \to ${0}`}, whether or not the signs alternate. So with ${math`k = ${q(9, 10)}`} the sequence tends to zero, and with ${math`k = ${q(-9, 10)}`} it tends to zero too: the statement that it has no limit is false.`,
    t`For ${math`k = ${1}`} every term is ${1}, so the limit is ${1}. For ${math`k = -${1}`} the terms are ${math`${1}, -${1}, ${1}, \ldots`}, two apart, so no number is within ${1} of both and there is no limit.`,
    t`For ${math`k > ${1}`}, ${math`k^{n}`} grows without bound, however close ${math`k`} is to ${1}: with ${math`k = ${q(11, 10)}`}, already ${math`k^{${100}} > ${10}^{${4}}`}. For ${math`k < -${1}`}, ${math`|k^{n}| = |k|^{n}`} grows without bound and the signs alternate, so there is no limit. The true statements are those for ${math`k = ${q(9, 10)}`}, ${1}, ${math`-${1}`}, and ${math`-${2}`}.`,
  ],
  reference: SS4_TRUE,
  verify: () => {
    const wrong = SS4.filter((r) => ss4Holds(r) !== r.holds).map((r) => r.id);
    if (wrong.length > 0) return `statements ${wrong.join(', ')} misjudged`;
    return (11 / 10) ** 100 > 1e4 ? null : '1.1^100 is not above 10^4';
  },
  misconceptions: [
    { response: ['a', 'c', 'f'], why: t`For ${math`k = -${1}`} the terms are ${math`${1}, -${1}, ${1}, \ldots`}: they never settle, so it is true that there is no limit.` },
    { response: ['a', 'b', 'c', 'd', 'f'], why: t`Alternating signs do not stop a sequence converging: ${math`\left(${q(-9, 10)}\right)^{n}`} shrinks to ${0} as its size ${math`\left(${q(9, 10)}\right)^{n}`} does.` },
    { response: ['a', 'c', 'd', 'e', 'f'], why: t`Any ${math`k > ${1}`} makes ${math`k^{n}`} grow without bound. Small steps up still add up: ${math`\left(${q(11, 10)}\right)^{n} \ge ${1} + \frac{n}{${10}}`}.` },
  ],
});

// IA Analysis I Example Sheet 1, Q1a: the sum law from the definition. The sheet assumes the
// triangle inequality from lectures; the prompt states it, as no earlier lesson proves it.
const an1Sum = supervision({
  id: 'an1-q1a',
  source: cite('dpmms-ia-an1', 'Q1a', true),
  title: t`The limit of a sum, from the definition`,
  prompt: t`Suppose ${math`(a_{n})`} and ${math`(b_{n})`} are two sequences of real numbers. Prove that if ${math`a_{n} \to a`} and ${math`b_{n} \to b`}, then ${math`a_{n} + b_{n} \to a + b`}. Work from the definition of a limit: given ${math`\varepsilon > ${0}`}, produce an ${mN} that works. You may use the triangle inequality, ${math`|x + y| \le |x| + |y|`} for all real ${math`x`} and ${math`y`}.`,
  writeUp: 'proof',
});

// IA Numbers and Sets Example Sheet 3, Q14: differences of a convergent sequence, and the converse.
const ns3Differences = supervision({
  id: 'ns3-q14',
  source: cite('ia-ns-sheet-3', 'Q14', true),
  title: t`Differences that tend to zero`,
  prompt: t`Let ${math`(x_{n})`} be a sequence of real numbers. Show that if ${math`(x_{n})`} is convergent, then ${math`x_{n} - x_{n - ${1}} \to ${0}`}. If ${math`x_{n} - x_{n - ${1}} \to ${0}`}, must ${math`(x_{n})`} be convergent? Prove your answer. You may use the triangle inequality, ${math`|x + y| \le |x| + |y|`} for all real ${math`x`} and ${math`y`}.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

export const sequenceLimits: TopicContent = {
  topicId: 'an.sequence-limits',
  goal: t`Say what ${math`x_{n} \to a`} means and find simple limits such as ${math`\frac{${1}}{n}`} and ${math`r^{n}`}.`,
  objective: t`Say exactly what it means for a sequence to converge, and find limits of simple sequences.`,
  why: t`Limits underlie infinite sums, recurrences, and all of analysis in the first year.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`Getting close and staying close` },
    { kind: 'hook', text: t`The sequence ${math`${1.1}, ${1.01}, ${1.001}, \ldots`} gets closer and closer to ${0}: each term is nearer to ${0} than the one before. Does it converge to ${0}? No: it converges to ${1}. "Closer and closer" is not what a limit means.` },
    { kind: 'narrative', text: t`What we want is: the terms eventually get as close to ${math`a`} as anyone could demand, and stay there. Make it a game. Someone names a tolerance, any positive number ${me}, however small. You must answer with a point ${mN} in the sequence after which every term is within ${me} of ${math`a`}. If you can always answer, the sequence converges to ${math`a`}.` },
    {
      kind: 'definition',
      name: t`Limit of a sequence`,
      formal: t`A sequence ${math`(x_{n})`} converges to ${math`a \in \mathbb{R}`}, written ${math`x_{n} \to a`} or ${math`\lim_{n \to \infty} x_{n} = a`}, if ${dmath`\forall \varepsilon > ${0}\ \exists N \in \mathbb{N}\ \forall n \ge N:\ |x_{n} - a| < \varepsilon.`} Then ${math`a`} is the [[limit-of-sequence|limit]] of the sequence. A sequence that converges to no real number [[divergent-sequence|diverges]].`,
      plain: t`Whatever tolerance ${me} you are given, from some point on all the terms are within ${me} of ${math`a`}. For ${math`x_{n} = \frac{${1}}{n}`} and ${math`\varepsilon = \frac{${1}}{${100}}`}, the point ${math`N = ${101}`} works.`,
    },
    { kind: 'p', text: t`The order of the quantifiers matters: ${mN} is chosen after ${me}, and may depend on it. A smaller tolerance usually needs a later ${mN}. A sequence has at most one limit, since its terms cannot be eventually within ${me} of two numbers more than ${math`${2}\varepsilon`} apart.` },
    { kind: 'section', title: t`The basic limits` },
    { kind: 'theorem', statement: t`${math`\frac{${1}}{n} \to ${0}`} as ${math`n \to \infty`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Take a tolerance`, text: t`Let ${math`\varepsilon > ${0}`}.` },
        { label: t`Choose the point`, text: t`Choose a natural number ${math`N > \frac{${1}}{\varepsilon}`}.`, why: { q: t`How do we know such an ${mN} exists?`, a: t`The natural numbers are not bounded above: past any real number there is a natural number. For ${math`\varepsilon = ${q(3, 1000)}`}, ${math`\frac{${1}}{\varepsilon} = ${333.3}`}..., and ${math`N = ${334}`} works.` } },
        { label: t`Check every later term`, text: t`For ${math`n \ge N`}: ${math`|\tfrac{${1}}{n} - ${0}| = \frac{${1}}{n} \le \frac{${1}}{N} < \varepsilon`}, since ${math`N > \frac{${1}}{\varepsilon}`} gives ${math`\frac{${1}}{N} < \varepsilon`}.` },
      ],
    },
    { kind: 'theorem', name: t`Powers`, statement: t`If ${math`|r| < ${1}`}, then ${math`r^{n} \to ${0}`}. If ${math`r = ${1}`}, ${math`r^{n} \to ${1}`}. If ${math`r > ${1}`} or ${math`r \le -${1}`}, ${math`(r^{n})`} diverges.` },
    { kind: 'p', text: t`The first case is proved in the lesson on sums to infinity: write ${math`\frac{${1}}{|r|} = ${1} + h`}, so that ${math`|r|^{n} \le \frac{${1}}{${1} + nh} < \frac{${1}}{nh}`}. For ${math`r > ${1}`} the same bound turned round shows ${math`r^{n} > ${1} + nh`}, which passes every number. For ${math`r \le -${1}`} consecutive terms differ by at least ${2}, so they cannot both be within ${1} of any limit.` },
    { kind: 'theorem', name: t`Limit laws`, statement: t`If ${math`x_{n} \to a`} and ${math`y_{n} \to b`}, then ${math`x_{n} + y_{n} \to a + b`}, ${math`x_{n}y_{n} \to ab`}, and, if ${math`b \neq ${0}`}, ${math`\frac{x_{n}}{y_{n}} \to \frac{a}{b}`}.` },
    { kind: 'p', text: t`(These are proved in the first-year analysis course from the definition; here we use them.) With them, limits of quotients come from dividing by the largest power: ${math`\frac{${3}n + ${1}}{${2}n + ${5}} = \frac{${3} + ${1}/n}{${2} + ${5}/n} \to \frac{${3}}{${2}}`}.` },
    checkFrom(nGen, { c: 3, m: 100 }, t`${math`\frac{${3}}{n} < \frac{${1}}{${100}}`} exactly when ${math`n > ${300}`}, so ${math`N = ${301}`}.`),
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`If the terms keep getting closer to ${math`a`}, then ${math`x_{n} \to a`}.`, counterexample: t`${math`x_{n} = ${1} + \frac{${1}}{n}`} gets closer to ${0} with every step, but never within ${1} of it. Its limit is ${1}. Being closer than before is not being within every tolerance.` },
    { kind: 'pitfall', claim: t`A bounded sequence converges.`, counterexample: t`${math`(-${1})^{n}`} stays between ${math`-${1}`} and ${1} but alternates forever. Take ${math`\varepsilon = ${1}`}: no number is within ${1} of both ${1} and ${math`-${1}`}.` },
    { kind: 'pitfall', claim: t`The limit of ${math`\frac{${2}n + ${7}}{n + ${100}}`} is ${math`\frac{${7}}{${100}}`}, from the constants.`, counterexample: t`For large ${mn} the terms in ${mn} dominate: dividing by ${mn}, ${math`\frac{${2} + ${7}/n}{${1} + ${100}/n} \to ${2}`}. At ${math`n = ${10}^{${6}}`} the term is already about ${math`${1.9998}`}.` },
    { kind: 'takeaway', text: t`${math`x_{n} \to a`} means: for every ${math`\varepsilon > ${0}`} there is an ${mN} beyond which every term is within ${me} of ${math`a`}.` },
  ],
  examples: [
    workedCambridge(a15b),
    worked(ratGen, { a: 3, b: 1, c: 2, d: 5 }, t`Dividing through by ${mn}`),
    worked(powGen, { r: q(-3, 4) }, t`An alternating sequence that converges`),
  ],
  generators: [nGen, ratGen, powGen, expGen],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['limit-of-sequence', 'divergent-sequence'],
  cambridge: withUses([an1Sum, ns3Differences, nstSs4, nstSs4Cases, a15c, a15iv], {
    'an1-q1a': { sections: ['Getting close and staying close'], note: t`Proving a limit law straight from the definition of a limit` },
    'ns3-q14': { sections: ['Getting close and staying close', 'Where it breaks'], note: t`A proof from the definition of a limit, then a sequence to show the converse fails` },
    'nst-ss4': { sections: ['Getting close and staying close', 'The basic limits'], note: t`The powers of a fixed number, and what they do for large n in every case` },
    'nst-ss4-cases': { sections: ['Getting close and staying close', 'The basic limits'], note: t`Deciding case by case whether the powers of a number converge, and to what` },
  }),
  // Two proofs from the definition. SS4 asks for the lesson's theorem on powers, so it is practice.
  gate: ['an1-q1a', 'ns3-q14'],
  recall: [
    { front: t`Define ${math`x_{n} \to a`}.`, back: t`${math`\forall \varepsilon > ${0}\ \exists N\ \forall n \ge N:\ |x_{n} - a| < \varepsilon`}.` },
    { front: t`For which ${math`r`} does ${math`r^{n}`} converge, and to what?`, back: t`For ${math`|r| < ${1}`}, to ${0}; for ${math`r = ${1}`}, to ${1}; otherwise it diverges.` },
  ],
  proofOrder: [
    {
      title: t`${math`\frac{${1}}{n} \to ${0}`}`,
      steps: [
        t`Let ${math`\varepsilon > ${0}`} be given.`,
        t`Choose a natural number ${math`N > \frac{${1}}{\varepsilon}`}.`,
        t`For ${math`n \ge N`}, ${math`\frac{${1}}{n} \le \frac{${1}}{N} < \varepsilon`}.`,
        t`So every term from the ${mN}th on is within ${me} of ${0}.`,
      ],
    },
  ],
};
