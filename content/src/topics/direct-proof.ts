/**
 * proof.direct: Direct proof: from the assumptions to the conclusion by a chain of
 * deductions, found first in scratch work. The lesson follows the CST notes' "Proofs in
 * practice" (printed pages 18 to 56: jargon, Definition 7 and Proposition 8, why scratch
 * work is not a proof, writing good proofs, assumptions and goals), Book of Proof Sections
 * 4.1 to 4.3 (Definition 4.4 of divides), and the TMUA notes on proof and on common errors
 * (pages 64 and 72 to 73). The problems are Book of Proof Chapter 4, exercises 6, 7, 9 to
 * 13, 19, and 24 (solutions to odd ones), and TMUA Exercise R and the page 72 example. Batch 7
 * adds IA Numbers and Sets Example Sheet 2, Q15 (first part). That sheet's Q14 (a hundred
 * consecutive composites) is Book of Proof's exercise 24 here, so it is not set twice.
 *
 * Rule 1 (2026-10-08): twenty-five written proofs moved here from topics before this one, which
 * set them before proof writing was taught: from Fractions, Indices, Algebraic manipulation, Surds,
 * Linear and quadratic inequalities, Straight lines, Arithmetic and geometric series, Remainders,
 * Algebraic argument, the floor function, Implication, the product rule, Number systems, and
 * Negating quantifiers. Sequences set exercise 1.3.1(d) too, the same exercise as Algebraic
 * argument's, so it is set once, here. A problem that also leans on an earlier lesson outside
 * this topic's prerequisites names it in `needs` and is practice, not a gate.
 */
import { gradeExpression, type Rational } from '@learnhub/mastery';
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { factorial, int, pick, upTo } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { dmath, exprTex, math, t, type Rich } from '../rich';
import { quickCheck, worked, workedCambridge, type TopicContent } from '../topic';

const [ma, mb, mc] = [math`a`, math`b`, math`c`];
const INT = { kind: 'integer' as const, min: -12, max: 12 };

// ---------------------------------------------------------------- generators

type Combo = 'sum' | 'linear' | 'square' | 'product' | 'chain' | 'cube-mix';
interface ComboP { form: Combo; p: number; q: number }

/** Each form: the expression in b and c, and what multiplies a once b = ax and c = ay are substituted. */
function combo({ form, p, q }: ComboP): { show: Rich; answer: string; given: Rich; slips: [string, Rich][] } {
  const twoGiven = t`Suppose ${math`a \mid b`} and ${math`a \mid c`}, so ${math`b = ax`} and ${math`c = ay`} for integers ${math`x`} and ${math`y`}.`;
  switch (form) {
    case 'sum': return {
      show: [math`b + c`], answer: 'x + y', given: twoGiven,
      slips: [['xy', t`${math`ax + ay = a(x + y)`}: the factor is a sum, not a product.`], ['a(x + y)', t`That is ${math`b + c`} itself. Take the factor ${ma} out.`]],
    };
    case 'linear': return {
      show: [math`${p}b ${q < 0 ? '-' : '+'} ${Math.abs(q)}c`], answer: `${p}x ${q < 0 ? '-' : '+'} ${Math.abs(q)}y`, given: twoGiven,
      slips: [[`x ${q < 0 ? '-' : '+'} y`, t`The coefficients ${p} and ${q} stay: ${math`${p}ax ${q < 0 ? '-' : '+'} ${Math.abs(q)}ay = a(${p}x ${q < 0 ? '-' : '+'} ${Math.abs(q)}y)`}.`], [`${p * q}xy`, t`${math`b`} and ${math`c`} are added, not multiplied.`]],
    };
    case 'square': return {
      show: [math`b^{${2}}`], answer: 'a x^2', given: t`Suppose ${math`a \mid b`}, so ${math`b = ax`} for an integer ${math`x`}.`,
      slips: [['x^2', t`${math`b^{${2}} = a^{${2}}x^{${2}}`}, so taking out one ${ma} leaves ${math`ax^{${2}}`}.`], ['a^2 x^2', t`That is ${math`b^{${2}}`} itself. Take out one factor ${ma}.`]],
    };
    case 'product': return {
      show: [math`bc`], answer: 'a x y', given: twoGiven,
      slips: [['xy', t`${math`bc = (ax)(ay) = a^{${2}}xy`}: one ${ma} is left after taking one out.`], ['x + y', t`${math`b`} and ${math`c`} are multiplied, so the factors multiply too.`]],
    };
    case 'chain': return {
      show: [math`c`], answer: 'xy', given: t`Suppose ${math`a \mid b`} and ${math`b \mid c`}, so ${math`b = ax`} and ${math`c = by`} for integers ${math`x`} and ${math`y`}.`,
      slips: [['y', t`${math`c = by`}, and ${math`b = ax`}, so ${math`c = (ax)y = a(xy)`}.`], ['x + y', t`Substitute ${math`b = ax`} into ${math`c = by`}: the factors multiply.`]],
    };
    case 'cube-mix': return {
      show: [math`b^{${3}} + ${p}b`], answer: `a^2 x^3 + ${p}x`, given: t`Suppose ${math`a \mid b`}, so ${math`b = ax`} for an integer ${math`x`}.`,
      slips: [[`x^3 + ${p}x`, t`${math`b^{${3}} = a^{${3}}x^{${3}}`}: after taking out one ${ma}, ${math`a^{${2}}x^{${3}}`} is left.`], [`a^3 x^3 + ${p}a x`, t`That is the whole expression. Take one factor ${ma} out of both terms.`]],
    };
  }
}
// a is always a variable, so an answer that keeps the factor a is read and marked, not rejected as unreadable.
const comboVars = (form: Combo): string[] => (form === 'square' || form === 'cube-mix' ? ['a', 'x'] : ['a', 'x', 'y']);

const divides = generator<ComboP>({
  id: 'divides-combo',
  skill: 'Prove a divisibility by direct proof: unpack the definition of divides, substitute, and take the factor out, as in Book of Proof Chapter 4.',
  params: (rng) => ({ form: pick(rng, ['sum', 'linear', 'square', 'product', 'chain', 'cube-mix'] as const), p: int(rng, 2, 7), q: pick(rng, [-5, -3, -2, 2, 3, 4]) }),
  sane: ({ p }) => (p >= 2 && p <= 7 ? null : 'out of range'),
  problem: (cp) => {
    const c = combo(cp);
    const vars = comboVars(cp.form);
    return {
      prompt: t`${c.given} To show that ${ma} divides ${c.show}, write it as ${math`a \cdot (\ldots)`}: what goes in the brackets, in terms of ${math`${vars.join(', ')}`}?`,
      answer: { kind: 'expression', expected: c.answer, variables: vars, domains: Object.fromEntries(vars.map((v) => [v, INT])) },
      solution: [
        t`By the definition, ${math`d \mid n`} means ${math`n = d \cdot k`} for some integer ${math`k`}. So unpack the assumptions and substitute into ${c.show}.`,
        t`The result is ${ma} times an integer, ${math`a \cdot (${cmText(c.answer)})`}, so ${ma} divides ${c.show}.`,
      ],
    };
  },
  solve: (cp) => {
    // The bracket must equal the substituted expression divided by a: checked by the grader's identity test, a in 1..12.
    const c = combo(cp);
    const vars = ['a', 'x', 'y'];
    const ok = gradeExpression(c.answer, `(${substituted(cp)})/a`, { variables: vars, domains: { a: { kind: 'integer', min: 1, max: 12 }, x: INT, y: INT } }).correct;
    return ok ? c.answer : 'none';
  },
  misconceptions: (cp): Misconception[] => combo(cp).slips.map(([response, why]) => ({ response, why })),
});

/** The bracket as LaTeX, read through the expression parser so its numbers are computed. */
function cmText(expr: string): Rich {
  return [{ kind: 'math', text: exprTex(expr), typed: [] }];
}

/** The expression in b and c with b = ax and c = ay (or c = by) substituted, in the grader's syntax. */
function substituted({ form, p, q }: ComboP): string {
  const b = '(a*x)';
  const c = form === 'chain' ? `(${b}*y)` : '(a*y)';
  switch (form) {
    case 'sum': return `${b} + ${c}`;
    case 'linear': return `${p}*${b} + (${q})*${c}`;
    case 'square': return `${b}^2`;
    case 'product': return `${b}*${c}`;
    case 'chain': return c;
    case 'cube-mix': return `${b}^3 + ${p}*${b}`;
  }
}

interface FacP { n: number; k: number }

const factorialDivisor = generator<FacP>({
  id: 'factorial-divisor',
  skill: 'Show a number is composite by giving a divisor, as in Book of Proof Chapter 4, exercise 24: k divides n! + k.',
  params: (rng) => {
    const n = int(rng, 4, 8);
    return { n, k: int(rng, 2, n) };
  },
  sane: ({ n, k }) => (n >= 4 && n <= 8 && k >= 2 && k <= n ? null : 'out of range'),
  problem: ({ n, k }) => {
    const N = factorial(n) + k;
    return {
      prompt: t`Show that ${math`${n}! + ${k} = ${N}`} is composite: give a divisor ${math`d`} of it with ${math`${1} < d < ${N}`}.`,
      answer: {
        kind: 'witness', count: 1, names: ['d'], example: `d = ${k}`,
        check: ([v]) => {
          const d = v !== undefined && v.den === 1n ? Number(v.num) : NaN;
          if (Number.isNaN(d)) return 'Give a whole number.';
          if (d <= 1 || d >= N) return `A divisor that shows ${N} is composite is strictly between 1 and ${N}.`;
          return N % d === 0 ? null : `${d} does not divide ${N}: the remainder is ${N % d}.`;
        },
      },
      solution: [
        t`${math`${n}! = ${1} \times ${2} \times \cdots \times ${n}`} has ${k} as a factor, so ${math`${n}! = ${k}m`} for an integer ${math`m`}.`,
        t`Then ${math`${n}! + ${k} = ${k}m + ${k} = ${k}(m + ${1})`}: ${k} divides it, and ${math`${1} < ${k} < ${N}`}. So ${N} is composite.`,
      ],
    };
  },
  solve: ({ n, k }) => {
    // The smallest divisor above 1, by trial division.
    const N = factorial(n) + k;
    return `d = ${upTo(N).find((d) => d > 1 && N % d === 0) as number}`;
  },
  misconceptions: ({ n, k }): Misconception[] => {
    const N = factorial(n) + k;
    return [
      { response: 'd = 1', why: t`Every number has the divisors ${1} and itself. Composite means it has another one.` },
      { response: `d = ${N}`, why: t`Every number divides itself. Look for a divisor strictly between ${1} and ${N}: try ${k}.` },
    ];
  },
});

/** A flawed argument, step by step: the text of each step and whether it is true at the instance's numbers. */
interface Flaw { steps: { text: Rich; ok: boolean }[]; why: Rich }
type FlawKind = 'divide-zero' | 'negative' | 'square-ineq' | 'cancel' | 'extra-root';
interface FlawP { kind: FlawKind; u: number; v: number }

function flaw({ kind, u, v }: FlawP): Flaw {
  switch (kind) {
    case 'divide-zero': return {
      steps: [
        { text: t`Let ${math`a = b = ${u}`}. Then ${math`a^{${2}} = ab`}.`, ok: u * u === u * u },
        { text: t`So ${math`a^{${2}} - b^{${2}} = ab - b^{${2}}`}.`, ok: true },
        { text: t`So ${math`(a + b)(a - b) = b(a - b)`}.`, ok: true },
        { text: t`Dividing by ${math`a - b`}: ${math`a + b = b`}.`, ok: u + u === u },
        { text: t`So ${math`${2}b = b`}, and ${math`${2} = ${1}`}.`, ok: false },
      ],
      why: t`${math`a - b = ${0}`}, and dividing both sides by zero is not allowed: ${math`x \cdot ${0} = y \cdot ${0}`} holds for every ${math`x`} and ${math`y`}.`,
    };
    case 'negative': return {
      steps: [
        { text: t`${math`${u} < ${v}`}.`, ok: u < v },
        { text: t`Multiplying both sides by ${math`${-2}`}: ${math`${-2 * u} < ${-2 * v}`}.`, ok: -2 * u < -2 * v },
        { text: t`So ${math`${-2 * u} + ${2 * v} < ${0}`}.`, ok: -2 * u + 2 * v < 0 },
      ],
      why: t`Multiplying both sides of an inequality by a negative number reverses it: ${math`${-2 * u} > ${-2 * v}`}.`,
    };
    case 'square-ineq': return {
      steps: [
        { text: t`${math`${-u} < ${v}`}.`, ok: -u < v },
        { text: t`Squaring both sides: ${math`${u * u} < ${v * v}`}.`, ok: u * u < v * v },
        { text: t`So ${math`${u * u - v * v} < ${0}`}.`, ok: u * u - v * v < 0 },
      ],
      why: t`Squaring keeps an inequality only when both sides are nonnegative. Here the left side is negative: ${math`${-u} < ${v}`} but ${math`${u * u} > ${v * v}`}.`,
    };
    case 'cancel': return {
      steps: [
        { text: t`Let ${math`a = ${0}`}, ${math`b = ${u}`}, ${math`c = ${v}`}. Then ${math`ab = ${0}`} and ${math`ac = ${0}`}.`, ok: true },
        { text: t`So ${math`ab = ac`}.`, ok: true },
        { text: t`Cancelling ${ma}: ${math`b = c`}, that is ${math`${u} = ${v}`}.`, ok: u === v },
      ],
      why: t`Cancelling ${ma} from ${math`ab = ac`} needs ${math`a \ne ${0}`}; the TMUA notes list "if ${math`ab = ac`} then ${math`b = c`}" as a classic invalid deduction.`,
    };
    case 'extra-root': return {
      steps: [
        { text: t`Solve ${math`x + ${u} = ${v}`}. Squaring both sides: ${math`(x + ${u})^{${2}} = ${v * v}`}.`, ok: true },
        { text: t`So ${math`x + ${u} = ${v}`} or ${math`x + ${u} = ${-v}`}, giving ${math`x = ${v - u}`} or ${math`x = ${-v - u}`}.`, ok: true },
        { text: t`Both solve ${math`x + ${u} = ${v}`}.`, ok: (-v - u) + u === v },
      ],
      why: t`Squaring can create solutions that the original equation does not have, as in the TMUA notes' Example ${2}: ${math`x = ${-v - u}`} gives ${math`x + ${u} = ${-v}`}, not ${v}. Check solutions in the original equation.`,
    };
  }
}
const firstBad = (f: Flaw): number => f.steps.findIndex((s) => !s.ok);

const errorStep = generator<FlawP>({
  id: 'error-step',
  skill: 'Find the first invalid step in a purported proof: dividing by zero, a negative multiplier, squaring an inequality, cancelling zero, or an extra root.',
  params: (rng) => {
    const kind = pick(rng, ['divide-zero', 'negative', 'square-ineq', 'cancel', 'extra-root'] as const);
    switch (kind) {
      case 'divide-zero': return { kind, u: int(rng, 2, 9), v: 0 };
      case 'negative': return { kind, u: int(rng, 1, 6), v: int(rng, 7, 12) };
      case 'square-ineq': { const v = int(rng, 2, 6); return { kind, u: v + int(rng, 1, 4), v }; }
      case 'cancel': { const u = int(rng, 1, 6); return { kind, u, v: u + int(rng, 1, 5) }; }
      case 'extra-root': return { kind, u: int(rng, 1, 6), v: int(rng, 2, 9) };
    }
  },
  sane: (p) => (firstBad(flaw(p)) > 0 ? null : 'no invalid step after the first'),
  problem: (p) => {
    const f = flaw(p);
    const bad = firstBad(f);
    const options: ChoiceOption[] = f.steps.map((_, i) => ({ id: `s${i + 1}`, label: t`Step ${i + 1}` }));
    return {
      prompt: t`This argument reaches a false conclusion. Which is the first invalid step? ${f.steps.map((s, i) => [...t`(${i + 1}) `, ...s.text]).reduce<Rich>((acc, r) => [...acc, ...t` `, ...r], [])}`,
      answer: { kind: 'choice', options, correct: `s${bad + 1}` },
      solution: [
        ...f.steps.slice(0, bad).map((_, i) => t`Step ${i + 1} is valid.`),
        t`Step ${bad + 1} is not. ${f.why}`,
      ],
    };
  },
  solve: (p) => {
    // Evaluate each step at the instance's numbers; the first false one is the error.
    const f = flaw(p);
    return [`s${f.steps.findIndex((s) => !s.ok) + 1}`];
  },
  misconceptions: (p): Misconception[] => {
    const f = flaw(p);
    const bad = firstBad(f);
    const last = f.steps.length - 1;
    const out: Misconception[] = [];
    if (last !== bad) out.push({ response: [`s${last + 1}`], why: t`That step follows from the one before it: the mistake is earlier, where something false first appears.` });
    out.push({ response: [`s${bad}`], why: t`That step is valid. Check the next one carefully.` });
    if (out.length < 2) out.push({ response: [`s${1}`], why: t`The first step is a true starting point. Check each later step.` });
    return out.filter((m, i, a) => a.findIndex((x) => (x.response as string[])[0] === (m.response as string[])[0]) === i);
  },
});

// ---------------------------------------------------------------- Cambridge problems

function bopDivides(o: { n: number; title: Rich; prompt: Rich; expected: string; vars: string[]; steps: Rich[]; check: () => string | null; official: boolean; wrong: Misconception[]; hints?: Rich[]; nudge?: Rich }) {
  const at = `Chapter 4, exercise ${o.n}`;
  const spec: Parameters<typeof auto>[0] = {
    id: `bop-4-${o.n}`,
    source: cite('bop', at, true),
    title: o.title,
    prompt: o.prompt,
    answer: { kind: 'expression', expected: o.expected, variables: o.vars, domains: Object.fromEntries(o.vars.map((v) => [v, INT])) },
    solution: o.steps,
    reference: o.expected,
    verify: o.check,
    misconceptions: o.wrong,
  };
  if (o.official) spec.official = { source: cite('bop', `Solutions, ${at}`), answer: o.expected, agrees: true };
  if (o.hints !== undefined) spec.hints = o.hints;
  if (o.nudge !== undefined) spec.nudge = o.nudge;
  return auto(spec);
}
/** Checks n = a · bracket at every integer point of a small grid. */
function identityCheck(lhs: (a: number, x: number, y: number) => number, bracket: (a: number, x: number, y: number) => number): () => string | null {
  return () => {
    for (let a = -4; a <= 4; a++) for (let x = -4; x <= 4; x++) for (let y = -4; y <= 4; y++) {
      if (lhs(a, x, y) !== a * bracket(a, x, y)) return `fails at a = ${a}, x = ${x}, y = ${y}`;
    }
    return null;
  };
}

const bop411 = bopDivides({
  n: 11, official: true, vars: ['x', 'y'], expected: 'xy',
  title: t`${math`ac`} divides ${math`bd`}`,
  prompt: t`Suppose ${math`a, b, c, d \in \mathbb{Z}`}. Prove: if ${math`a \mid b`} and ${math`c \mid d`}, then ${math`ac \mid bd`}. With ${math`b = ax`} and ${math`d = cy`}, ${math`bd = (ac) \cdot (\ldots)`}: what is in the brackets, in terms of ${math`x`} and ${math`y`}?`,
  steps: [
    t`Suppose ${math`a \mid b`} and ${math`c \mid d`}. By the definition of divisibility, ${math`b = ax`} and ${math`d = cy`} for some integers ${math`x`} and ${math`y`}.`,
    t`Multiply: ${math`bd = (ax)(cy) = (ac)(xy)`}. Since ${math`xy \in \mathbb{Z}`}, the definition gives ${math`ac \mid bd`}.`,
  ],
  check: () => {
    for (let a = -3; a <= 3; a++) for (let c = -3; c <= 3; c++) for (let x = -3; x <= 3; x++) for (let y = -3; y <= 3; y++) if ((a * x) * (c * y) !== a * c * (x * y)) return 'bd = ac xy fails';
    return null;
  },
  wrong: [{ response: 'x + y', why: t`${math`b`} and ${math`d`} are multiplied, so ${math`x`} and ${math`y`} multiply too.` }],
});
const bop47 = bopDivides({
  n: 7, official: true, vars: ['c'], expected: 'c^2',
  title: t`${math`a^{${2}}`} divides ${math`b^{${2}}`}`,
  prompt: t`Suppose ${math`a, b \in \mathbb{Z}`}. Prove: if ${math`a \mid b`}, then ${math`a^{${2}} \mid b^{${2}}`}. With ${math`b = ac`}, ${math`b^{${2}} = a^{${2}} \cdot (\ldots)`}: what is in the brackets?`,
  steps: [
    t`${math`b = ac`}; squaring both sides gives ${math`b^{${2}} = a^{${2}}c^{${2}}`}. So ${math`b^{${2}} = a^{${2}}d`} with ${math`d = c^{${2}} \in \mathbb{Z}`}, and ${math`a^{${2}} \mid b^{${2}}`}.`,
    t`Unpack the definition, compute, then pack it back.`,
  ],
  check: () => {
    for (let a = -5; a <= 5; a++) for (let c = -5; c <= 5; c++) if ((a * c) ** 2 !== a * a * c * c) return 'b² = a²c² fails';
    return null;
  },
  wrong: [{ response: 'c', why: t`${math`b^{${2}} = (ac)^{${2}} = a^{${2}}c^{${2}}`}: the ${mc} is squared too.` }],
  hints: [
    t`What does ${math`a \mid b`} give as an equation with an integer?`,
    t`What is ${math`b^{${2}}`} when ${math`b = ac`}?`,
    t`Which factor of ${math`b^{${2}}`} is ${math`a^{${2}}`}, and is the rest an integer?`,
  ],
  nudge: t`Not quite. Square ${math`b = ac`} completely: both factors are squared.`,
});
const bop419 = bopDivides({
  n: 19, official: true, vars: ['x', 'y'], expected: 'x^3 y',
  title: t`${math`a^{${6}}`} divides ${mc}`,
  prompt: t`Suppose ${math`a, b, c`} are integers. Prove: if ${math`a^{${2}} \mid b`} and ${math`b^{${3}} \mid c`}, then ${math`a^{${6}} \mid c`}. With ${math`b = a^{${2}}x`} and ${math`c = b^{${3}}y`}, ${math`c = a^{${6}} \cdot (\ldots)`}: what is in the brackets?`,
  steps: [
    t`Substitute: ${math`c = b^{${3}}y = (a^{${2}}x)^{${3}}y = a^{${6}}x^{${3}}y`}. So ${math`c = a^{${6}} \cdot x^{${3}}y`} with ${math`x^{${3}}y`} an integer, and ${math`a^{${6}} \mid c`}.`,
    t`Substitute one definition into the other, then factor.`,
  ],
  check: () => {
    for (let a = -3; a <= 3; a++) for (let x = -3; x <= 3; x++) for (let y = -3; y <= 3; y++) if (((a * a * x) ** 3) * y !== a ** 6 * (x ** 3 * y)) return 'c = a⁶x³y fails';
    return null;
  },
  wrong: [{ response: 'xy', why: t`${math`(a^{${2}}x)^{${3}} = a^{${6}}x^{${3}}`}: the ${math`x`} is cubed too.` }],
  hints: [
    t`With ${math`b = a^{${2}}x`}, what is ${math`b^{${3}}`}?`,
    t`Substituting into ${math`c = b^{${3}}y`}, what is ${mc}?`,
    t`After ${math`a^{${6}}`} is taken out, what remains?`,
  ],
  nudge: t`Not quite. Cube ${math`a^{${2}}x`} completely before substituting.`,
});
const bop46 = bopDivides({
  n: 6, official: false, vars: ['x', 'y'], expected: 'x + y',
  title: t`${ma} divides ${math`b + c`}`,
  prompt: t`Suppose ${math`a, b, c \in \mathbb{Z}`}. Prove: if ${math`a \mid b`} and ${math`a \mid c`}, then ${math`a \mid (b + c)`}. With ${math`b = ax`} and ${math`c = ay`}, ${math`b + c = a \cdot (\ldots)`}: what is in the brackets?`,
  steps: [
    t`${math`b + c = ax + ay = a(x + y)`}, and ${math`x + y`} is an integer, so ${math`a \mid (b + c)`}.`,
    t`Unpack both hypotheses with different letters, then combine.`,
  ],
  check: identityCheck((a, x, y) => a * x + a * y, (_a, x, y) => x + y),
  wrong: [{ response: 'xy', why: t`${math`ax + ay = a(x + y)`}: a sum, not a product.` }],
  hints: [
    t`With ${math`b = ax`} and ${math`c = ay`}, what is ${math`b + c`}?`,
    t`Which common factor can be taken out?`,
    t`What remains in the bracket?`,
  ],
  nudge: t`Not quite. Add the two equations and take out the common factor ${ma}.`,
});
const bop410 = bopDivides({
  n: 10, official: false, vars: ['a', 'c'], expected: '3a^2 c^3 - a c^2 + 5c',
  title: t`${ma} divides ${math`${3}b^{${3}} - b^{${2}} + ${5}b`}`,
  prompt: t`Suppose ${ma} and ${mb} are integers. Prove: if ${math`a \mid b`}, then ${math`a \mid (${3}b^{${3}} - b^{${2}} + ${5}b)`}. With ${math`b = ac`}, write ${math`${3}b^{${3}} - b^{${2}} + ${5}b = a \cdot (\ldots)`}: what is in the brackets, in terms of ${ma} and ${mc}?`,
  steps: [
    t`Substitute ${math`b = ac`}: ${math`${3}a^{${3}}c^{${3}} - a^{${2}}c^{${2}} + ${5}ac`}.`,
    t`Every term has a factor ${ma}: ${math`a(${3}a^{${2}}c^{${3}} - ac^{${2}} + ${5}c)`}, an integer times ${ma}.`,
    t`Substitute, then take out the factor the conclusion needs.`,
  ],
  check: () => {
    for (let a = -4; a <= 4; a++) for (let c = -4; c <= 4; c++) { const b = a * c; if (3 * b ** 3 - b * b + 5 * b !== a * (3 * a * a * c ** 3 - a * c * c + 5 * c)) return 'the factorisation fails'; }
    return null;
  },
  wrong: [{ response: '3c^3 - c^2 + 5c', why: t`${math`b^{${3}} = a^{${3}}c^{${3}}`} and ${math`b^{${2}} = a^{${2}}c^{${2}}`}: after taking out one ${ma}, powers of ${ma} remain.` }],
  hints: [
    t`With ${math`b = ac`}, what are ${math`b^{${2}}`} and ${math`b^{${3}}`}?`,
    t`Substituting, what is ${math`${3}b^{${3}} - b^{${2}} + ${5}b`} in terms of ${ma} and ${mc}?`,
    t`After exactly one factor ${ma} is taken out, what remains?`,
  ],
  nudge: t`Not quite. Substitute ${math`b = ac`} into every term and take out exactly one factor ${ma}.`,
});

const tmuaR3 = auto({
  id: 'tmua-r-3',
  source: cite('tmua-logic-proof', 'Exercise R, question 3', true),
  title: t`Clearing a fraction from an inequality`,
  prompt: t`Starting with ${math`\frac{x + ${2}}{${2}x + ${7}} < ${5}`}, is it valid to deduce ${math`x + ${2} < ${5}(${2}x + ${7})`}? Show it is not: give a real ${math`x`} for which the first holds and the second does not.`,
  answer: {
    kind: 'witness', count: 1, names: ['x'], example: 'x = -4',
    check: ([v]) => {
      if (v === undefined) return 'Give a value of x.';
      const den = 2n * v.num + 7n * v.den;
      if (den === 0n) return 'At that x the fraction is undefined.';
      // (x + 2)/(2x + 7) < 5, and not x + 2 < 5(2x + 7), in exact arithmetic.
      const first = less({ num: (v.num + 2n * v.den) * v.den, den: den * v.den }, { num: 5n, den: 1n });
      const second = less({ num: v.num + 2n * v.den, den: v.den }, { num: 5n * den, den: v.den });
      if (!first) return 'At that x the first inequality is false.';
      return second ? 'At that x both inequalities hold. Try a value with 2x + 7 negative.' : null;
    },
  },
  hints: [
    t`When does multiplying both sides of an inequality by a number keep its direction?`,
    t`For which ${math`x`} is ${math`${2}x + ${7}`} negative?`,
    t`For such an ${math`x`}, does the first inequality hold while the second fails?`,
  ],
  nudge: t`Not quite. Ask when multiplying both sides by ${math`${2}x + ${7}`} keeps the direction of the inequality.`,
  solution: [
    t`Multiplying both sides by ${math`${2}x + ${7}`} keeps the inequality only if ${math`${2}x + ${7} > ${0}`}. If it is negative, the inequality reverses.`,
    t`At ${math`x = ${-4}`}: ${math`\frac{${-2}}{${-1}} = ${2} < ${5}`}, but ${math`x + ${2} = ${-2}`} and ${math`${5}(${2}x + ${7}) = ${-5}`}, and ${math`${-2} < ${-5}`} is false. So the deduction is invalid.`,
    t`Multiply an inequality only by something known to be positive.`,
  ],
  reference: 'x = -4',
  verify: () => {
    // Search the integers from -20 to 20: the failures are exactly the x with 2x + 7 < 0 where the first holds.
    const fails = upTo(41).map((k) => k - 21).filter((x) => 2 * x + 7 !== 0 && (x + 2) / (2 * x + 7) < 5 && !(x + 2 < 5 * (2 * x + 7)));
    return fails.length > 0 && fails.every((x) => 2 * x + 7 < 0) ? null : 'search';
  },
  misconceptions: [{ response: 'x = 0', why: t`At ${math`x = ${0}`} both inequalities hold: ${math`${2}x + ${7}`} is positive there. Try a value making it negative.` }],
});
function less(a: Rational, b: Rational): boolean {
  const s = (r: Rational): Rational => (r.den < 0n ? { num: -r.num, den: -r.den } : r);
  const x = s(a);
  const y = s(b);
  return x.num * y.den < y.num * x.den;
}

const tmua72 = auto({
  id: 'tmua-p72-extra-root',
  source: cite('tmua-logic-proof', 'Common errors in proofs, page 72, Example 2', true),
  title: t`The extra solution`,
  prompt: t`Find ${math`x`} given ${math`x + ${1} = ${4}`}. Squaring both sides gives ${math`(x + ${1})^{${2}} = ${16}`}, that is ${math`x^{${2}} + ${2}x - ${15} = ${0}`}, with two solutions. Which of them is not a solution of the original equation?`,
  answer: { kind: 'exact', expected: '-5' },
  hints: [
    t`What are the two solutions of ${math`x^{${2}} + ${2}x - ${15} = ${0}`}?`,
    t`Does each satisfy ${math`x + ${1} = ${4}`}?`,
    t`Which step created the extra solution?`,
  ],
  nudge: t`Not quite. Put each solution back into the original equation.`,
  solution: [
    t`${math`x^{${2}} + ${2}x - ${15} = (x + ${5})(x - ${3})`}, so ${math`x = ${-5}`} or ${math`x = ${3}`}.`,
    t`In the original equation, ${math`${3} + ${1} = ${4}`}, but ${math`${-5} + ${1} = ${-4}`}. Squaring generated the extra solution ${math`${-5}`}.`,
    t`After squaring, check every solution in the original equation.`,
  ],
  reference: '-5',
  verify: () => {
    const roots = upTo(41).map((k) => k - 21).filter((x) => x * x + 2 * x - 15 === 0);
    const extra = roots.filter((x) => x + 1 !== 4);
    return same('roots of the squared equation that fail the original', extra.join(','), '-5');
  },
  misconceptions: [{ response: '3', why: t`${math`${3} + ${1} = ${4}`}: ${3} does solve the original. The other root does not.` }],
});

const bop49 = supervision({
  id: 'bop-4-9',
  source: cite('bop', 'Chapter 4, exercise 9'),
  title: t`${7} divides ${4}a`,
  prompt: t`Suppose ${ma} is an integer. Use direct proof to prove: if ${math`${7} \mid ${4}a`}, then ${math`${7} \mid a`}.`,
  hints: [
    t`What does ${math`${7} \mid ${4}a`} give as an equation with an integer?`,
    t`How can ${ma} be written as a combination of ${math`${4}a`} and ${math`${7}a`}?`,
    t`Why does ${7} divide each part of that combination?`,
  ],
  writeUp: 'proof',
  official: cite('bop', 'Solutions, Chapter 4, exercise 9'),
});
const bop413 = supervision({
  id: 'bop-4-13',
  source: cite('bop', 'Chapter 4, exercise 13'),
  title: t`Two cases from a factorisation`,
  prompt: t`Suppose ${math`x, y \in \mathbb{R}`}. Prove: if ${math`x^{${2}} + ${5}y = y^{${2}} + ${5}x`}, then ${math`x = y`} or ${math`x + y = ${5}`}. Watch for division by something that might be zero.`,
  hints: [
    t`With every term on one side, which factorisation appears?`,
    t`What does a product equal to ${0} say about its factors?`,
    t`Why must dividing by ${math`x - y`} be avoided?`,
  ],
  writeUp: 'proof',
  official: cite('bop', 'Solutions, Chapter 4, exercise 13'),
});
const bop424 = supervision({
  id: 'bop-4-24',
  source: cite('bop', 'Chapter 4, exercise 24'),
  title: t`Long runs of composite numbers`,
  prompt: t`Prove: if ${math`n \in \mathbb{N}`} and ${math`n \ge ${2}`}, then the numbers ${math`n! + ${2}, n! + ${3}, \ldots, n! + n`} are all composite. Explain why this means there are arbitrarily long gaps between primes.`,
  hints: [
    t`For ${math`${2} \le k \le n`}, which number divides both ${math`n!`} and ${math`k`}?`,
    t`Why is ${math`n! + k`} then composite, and not merely divisible by something?`,
    t`How long is the run, and why can it be made as long as wanted?`,
  ],
  writeUp: 'proof',
});
const scratch = supervision({
  id: 'notes-35-scratch',
  source: cite('cst-dm-notes', 'printed pages 31 to 35, Definition 7 and Proposition 8', true),
  title: t`From scratch work to a proof`,
  prompt: t`The notes show scratch work for "the product of two odd integers is odd" (${math`m = ${2}i + ${1}`}, ${math`n = ${2}j + ${1}`}, ${math`m \cdot n = ${2}(${2}ij + i + j) + ${1}`}) and say it will not be accepted as a proof. Write the proof in sentences, then explain what the scratch work leaves out.`,
  hints: [
    t`What are the assumptions, written with letters from the definition of odd?`,
    t`Which sentence links each line of the scratch work to the next?`,
    t`What does the scratch work never state: where it starts, why each step holds, or what was proved?`,
  ],
  writeUp: 'explanation',
  official: cite('cst-dm-notes', 'printed page 34, the notes\' proof'),
});

// ---------------------------------------------------------------- Cambridge problems: gates (batch 7)

/*
 * Outline for marking ns2-q15 (20 marks):
 * 1. Among b consecutive numbers one, x, is a multiple of b (3).
 * 2. If the block holds a multiple y of a with y != x, then ab | xy and we are done (4). This is
 *    so when b >= 2a (the block holds at least two multiples of a) or when x is not a multiple of a.
 * 3. Otherwise x is the only multiple of a in the block, so x is a multiple of a and of b, hence of
 *    their LCM ab/g, where g = HCF(a, b) (4).
 * 4. g divides b and g <= a < b, so g <= b/2 and the block holds b/g >= 2 multiples of g; take one,
 *    y, other than x (5).
 * 5. Then xy is a multiple of (ab/g) g = ab (4).
 */

// ---------------------------------------------------------------- Cambridge problems moved here (Rule 1, 2026-10-08)

/*
 * Written proofs that sat in topics before this one (Rule 1 in how-a-topic-works): each needs
 * this lesson, so it sits here, the earliest topic where everything it needs has been taught.
 * Their ids are unchanged; MOVED_PROBLEMS (moved.ts) reads learner history under the old keys.
 */
// 2000 STEP II Q1, first paragraph: two unit fractions for every unit fraction.
const unitPair = supervision({
  id: 'step00-q1-unit',
  source: cite('stepdb-00-s2', 'Q1, first paragraph'),
  title: t`A unit fraction as two unit fractions`,
  prompt: t`A number of the form ${math`\frac{${1}}{N}`}, where ${math`N`} is an integer greater than ${1}, is called a unit fraction. Noting that ${dmath`\frac{${1}}{${2}} = \frac{${1}}{${3}} + \frac{${1}}{${6}} \quad\text{and}\quad \frac{${1}}{${3}} = \frac{${1}}{${4}} + \frac{${1}}{${12}},`} guess a general result of the form ${math`\frac{${1}}{N} = \frac{${1}}{a} + \frac{${1}}{b}`}, and hence prove that any unit fraction can be expressed as the sum of two distinct unit fractions.`,
  hints: [
    t`In the two examples, how are ${ma} and ${math`b`} related to ${math`N`}?`,
    t`Which general identity for ${math`\frac{${1}}{N}`} does that suggest?`,
    t`How is it checked by adding fractions, and why are the two unit fractions distinct?`,
  ],
  writeUp: 'proof',
});

const bananasShow = supervision({
  id: 'a3-q4-i',
  source: cite('step-f03', 'Q4(i)'),
  title: t`The bananas: the equation`,
  prompt: t`Arthur, Brenda, and Chandrima gather ${math`N`} bananas. In the night each in turn divides the pile into three equal piles with one left over, gives that one to the orangutan, hides one pile, and heaps the rest together. In the morning the remaining bananas divide into three equal shares of ${math`m`}, with one left over. Show that ${math`${8}N = ${81}m + ${65}`}. (It helps to note that the number left after Chandrima has taken her share is ${math`${3}m + ${1}`}.)`,
  hints: [
    t`If a pile of ${math`P`} bananas splits into three equal piles with one over, how many remain after the turn, in terms of ${math`P`}?`,
    t`Working back from ${math`${3}m + ${1}`} after Chandrima's turn, what was the pile before each turn?`,
    t`With ${math`N`} written in terms of ${math`m`}, which equation results once fractions are cleared?`,
  ],
  writeUp: 'proof',
  official: cite('step-f03-hints', 'Q4'),
});

/*
 * Outline for marking ns2-q13 (20 marks):
 * 1. Writes n with digits d_k ... d_1 d_0: n = d_0 + 10 d_1 + 100 d_2 + ... + 10^k d_k, and s for the
 *    digit sum (3).
 * 2. n - s = 9 d_1 + 99 d_2 + ... + (10^k - 1) d_k, and each 10^i - 1 = 99...9 is a multiple of 9 (7).
 * 3. So n and s leave the same remainder on division by 9 (4); in particular n is a multiple of 9
 *    exactly when s is, both directions stated (3).
 * 4. Clear "if and only if": both directions, or one argument that is reversible (3).
 */
const ns2q13 = supervision({
  id: 'ns2-q13',
  source: cite('ia-ns-sheet-2', 'Q13, first part'),
  title: t`Nines and digit sums`,
  prompt: t`Show that a positive integer ${math`n`} is a multiple of ${9} if and only if the sum of its digits is a multiple of ${9}.`,
  hints: [
    t`Writing ${math`n`} with its digits, what is ${math`n`} minus its digit sum?`,
    t`Why is each ${math`${10}^{i} - ${1}`} a multiple of ${9}?`,
    t`Why does that give both directions of the "if and only if"?`,
  ],
  writeUp: 'proof',
});

/*
 * Outline for marking ns2-q12-i (20 marks):
 * 1. Looks for a small divisor and tries 3 (2).
 * 2. 4 leaves remainder 1 on division by 3, so 4^9 does, and 2^19 = 2 x 4^9 leaves remainder 2 (6).
 * 3. 25 leaves remainder 1, so 5^40 = 25^20 leaves remainder 1 (6).
 * 4. The sum leaves remainder 2 + 1 = 3, that is 0: 3 divides 2^19 + 5^40 (4).
 * 5. The number is larger than 3, so 3 is a proper factor and it is not prime (2).
 */
const ns2q12i = supervision({
  id: 'ns2-q12-i',
  source: cite('ia-ns-sheet-2', 'Q12, first part'),
  title: t`A sum of powers that is not prime`,
  prompt: t`Show that ${math`${2}^{${19}} + ${5}^{${40}}`} is not prime.`,
  hints: [
    t`Which small primes are worth testing as divisors?`,
    t`What remainders do ${math`${2}^{${19}}`} and ${math`${5}^{${40}}`} leave on division by ${3}?`,
    t`Why does a factor of ${3} show that the number is not prime?`,
  ],
  writeUp: 'proof',
});

const a12ii = supervision({
  id: 'a12-q1-ii-six',
  source: cite('step-f12', 'Q1(ii)'),
  title: t`${math`n^{${3}} - n`} and ${6}`,
  prompt: t`Factorise ${math`n^{${3}} - n`} completely, and deduce that it is divisible by ${6} for every positive integer ${math`n`}.`,
  hints: [
    t`Which factor can be taken out first, and what is left?`,
    t`What does the factorised form say about three consecutive integers?`,
    t`Why is a product of three consecutive integers divisible by ${2} and by ${3}, and why does that give ${6}?`,
  ],
  writeUp: 'proof',
  official: cite('step-f12-hints', 'Q1(ii)'),
});

/*
 * Outline for marking ns1-q4-proof (20 marks):
 * 1. A best choice exists: finitely many ways to write 100 as a sum of positive integers (2).
 * 2. No part of 5 or more: 2(k - 2) > k for k >= 5; a 4 may be replaced by 2 + 2 (5).
 * 3. No part 1: merge it with another part (3).
 * 4. At most two 2s: 2 + 2 + 2 becomes 3 + 3, product 8 to 9 (4).
 * 5. So all 3s and at most two 2s; 100 = 3 x 32 + 4 forces thirty-two 3s and two 2s (one 2 would
 *    need 98 to be a multiple of 3; none would need 100 to be) (4).
 * 6. Answer 4 x 3^32 stated (2).
 */
const ns1q4Proof = supervision({
  id: 'ns1-q4-proof',
  source: cite('ia-ns-sheet-1', 'Q4'),
  title: t`Why that product is the largest`,
  prompt: t`Suppose that we have some positive integers (not necessarily distinct) whose sum is ${100}. How large can their product be? Prove that no choice of integers does better than that.`,
  hints: [
    t`Why does a best choice exist at all?`,
    t`Which parts can be split or merged to raise the product: parts of ${5} or more, parts equal to ${1}, three ${2}s?`,
    t`Once only ${3}s and at most two ${2}s remain, how is ${100} forced to split?`,
  ],
  writeUp: 'proof',
});

/*
 * Outline for marking sw-1-3-1-d (20 marks):
 * 1. Names two consecutive triangular numbers t_k and t_(k+1) for a natural number k (4).
 * 2. t_k + t_(k+1) = k(k + 1)/2 + (k + 1)(k + 2)/2 = (k + 1)(2k + 2)/2 (8).
 * 3. = (k + 1)^2, a square of a natural number (6). Each step shown, no division left unexplained (2).
 */
const sw131d = supervision({
  id: 'sw-1-3-1-d',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.3.1(d)', true),
  title: t`Two triangular numbers make a square`,
  prompt: t`A natural number is triangular if it is ${math`t_k = ${0} + ${1} + \cdots + k`} for some natural number ${math`k`}; for example ${math`t_{${0}} = ${0}`}, ${math`t_{${1}} = ${1}`}, ${math`t_{${2}} = ${3}`}. Using ${math`t_k = \frac{k(k + ${1})}{${2}}`}, show that the sum of every two consecutive triangular numbers is a square. (Nicomachus, around ${100} BC.)`,
  hints: [
    t`What are ${math`t_k`} and ${math`t_{k + ${1}}`} by the formula?`,
    t`Adding them, which common factor appears?`,
    t`Which square does the sum simplify to?`,
  ],
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-1', '1.3.1(d)'),
});

const a7Show = supervision({
  id: 'a7-q2-i-ii',
  source: cite('step-f07', 'Q2(i) and (ii)'),
  title: t`Roots and coefficients without the formula`,
  prompt: t`Forget the quadratic formula. Show that if ${math`\alpha \ne \beta`} both satisfy ${math`x^{${2}} + bx + c = ${0}`}, then ${math`b = -(\alpha + \beta)`}, find ${math`c`} in terms of ${math`\alpha`} and ${math`\beta`}, and hence show that ${math`(x - \alpha)(x - \beta) \equiv x^{${2}} + bx + c`}. Then, starting from the identity instead, substitute ${math`x = ${0}`} and ${math`x = ${1}`} to find ${math`\alpha\beta`} and ${math`\alpha + \beta`}.`,
  hints: [
    t`Subtracting ${math`\beta^{${2}} + b\beta + c = ${0}`} from ${math`\alpha^{${2}} + b\alpha + c = ${0}`}, which factor appears?`,
    t`Why may that factor be divided out?`,
    t`With ${math`b`} known, what is ${mc}, and how does ${math`(x - \alpha)(x - \beta)`} expand?`,
  ],
  writeUp: 'proof',
  official: cite('step-f07-hints', 'Q2(i), (ii)'),
});

const a7ShowCubic = supervision({
  id: 'a7-q2-iv',
  source: cite('step-f07', 'Q2(iv)'),
  title: t`Three substitutions`,
  prompt: t`It is given that ${math`x^{${3}} + bx^{${2}} + cx + d \equiv (x - \alpha)(x - \beta)(x - \gamma)`}. By substituting three different values of ${math`x`}, show that ${math`\alpha\beta\gamma = -d`}, ${math`(${1} - \alpha)(${1} - \beta)(${1} - \gamma) = ${1} + b + c + d`}, and ${math`(${1} + \alpha)(${1} + \beta)(${1} + \gamma) = ${1} - b + c - d`}.`,
  hints: [
    t`Which value of ${math`x`} gives ${math`\alpha\beta\gamma`}?`,
    t`Which values give the other two products?`,
    t`What does each side of the identity become at those values?`,
  ],
  writeUp: 'proof',
  official: cite('step-f07-hints', 'Q2(iv)'),
});

const thm11 = supervision({
  id: 'notes-54-thm11',
  source: cite('cst-dm-notes', 'printed pages 54 and 55, Theorem 11'),
  title: t`Implication is transitive`,
  prompt: t`Let ${math`P_{${1}}`}, ${math`P_{${2}}`}, and ${math`P_{${3}}`} be statements. Prove that if ${math`P_{${1}} \Rightarrow P_{${2}}`} and ${math`P_{${2}} \Rightarrow P_{${3}}`}, then ${math`P_{${1}} \Rightarrow P_{${3}}`}. Name each use of modus ponens.`,
  hints: [
    t`Assuming ${math`P_{${1}}`}, which given implication applies first?`,
    t`What does modus ponens give next?`,
    t`What has then been shown, and under which assumption?`,
  ],
  writeUp: 'proof',
  official: cite('cst-dm-notes', 'printed pages 54 and 55, the scratch work'),
});

const a7Unique = supervision({
  id: 'a7-q4-i-a',
  source: cite('step-f07', 'Q4(i)(a)'),
  title: t`Three weights, and only one choice`,
  prompt: t`If I can only put the weights in one of the scale pans, show that I can choose just three weights to measure every whole number of ounces from ${1} to ${7}, and that there is only one such choice.`,
  hints: [
    t`With three weights in one pan, how many different non-empty loads are possible?`,
    t`Which weights must be included to make ${1} and ${2}?`,
    t`With those two fixed, which third weight is forced if ${7} is to be reached?`,
  ],
  writeUp: 'proof',
  official: cite('step-f07-hints', 'Q4(i)(a)'),
});

const a7Bound = supervision({
  id: 'a7-q4-i-c-show',
  source: cite('step-f07', 'Q4(i)(c)'),
  title: t`At most ${math`${2}^n`} loads`,
  prompt: t`Show that if I have only ${math`n`} weights and one pan, I cannot weigh more than ${math`${2}^n`} different weights, including zero ounces. How can I choose the weights to measure every whole number from ${1} to ${math`${2}^n - ${1}`}?`,
  hints: [
    t`For each weight, how many choices are there: in the pan or not?`,
    t`How many combinations does that give for ${math`n`} weights?`,
    t`Which number system writes every whole number using each power of one base at most once?`,
  ],
  writeUp: 'proof',
  official: cite('step-f07-hints', 'Q4(i)(c)'),
});

const a7Bound3 = supervision({
  id: 'a7-q4-ii-b-show',
  source: cite('step-f07', 'Q4(ii)(b)'),
  title: t`At most ${math`${3}^n`} loads`,
  prompt: t`Show that if I have only ${math`n`} weights and may use either pan, I cannot weigh more than ${math`${3}^n`} different weights, including zero ounces.`,
  hints: [
    t`With either pan allowed, how many choices does each weight have?`,
    t`How many combinations does that give for ${math`n`} weights?`,
    t`Why can the different combinations not give more loads than that?`,
  ],
  writeUp: 'proof',
  official: cite('step-f07-hints', 'Q4(ii)(b)'),
});

const ns2q12ii = supervision({
  id: 'ns2-q12-ii',
  source: cite('ia-ns-sheet-2', 'Q12, second part'),
  title: t`A large number that is not prime`,
  prompt: t`Show that ${math`${2}^{${91}} - ${1}`} is not prime.`,
  hints: [
    t`How does ${91} factorise?`,
    t`Writing ${math`${2}^{${91}} - ${1}`} as ${math`(${2}^{${7}})^{${13}} - ${1}`}, which factor does ${math`x^{${13}} - ${1}`} have?`,
    t`Why is that factor neither ${1} nor the whole number?`,
  ],
  writeUp: 'proof',
});

const sw116 = supervision({
  id: 'sw-1-1-6',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.1.6'),
  title: t`The sum of two rationals`,
  prompt: t`Prove or disprove: the addition of two rational numbers is a rational number. Start from the definition: a real number is rational if it is ${math`\frac{m}{n}`} for integers ${math`m`} and ${math`n`} with ${math`n \ne ${0}`}.`,
  hints: [
    t`How are the two rationals written, using the definition?`,
    t`What is their sum over a common denominator?`,
    t`Why is the new denominator non-zero, and the new numerator an integer?`,
  ],
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-1', '1.1.6'),
});

const eProof = supervision({
  id: 'sw-1-3-1-e',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.3.1(e)'),
  title: t`Euler's four maps`,
  prompt: t`Show that, for all natural numbers ${math`n`}, if ${math`n`} is triangular, then so are ${math`${9}n + ${1}`}, ${math`${25}n + ${3}`}, ${math`${49}n + ${6}`}, and ${math`${81}n + ${10}`}. (Euler, ${1775}.)`,
  hints: [
    t`With ${math`n = t_k`}, what is each map in terms of ${math`k`}?`,
    t`For each, which square completes the numerator into the form ${math`Q(Q + ${1})`}?`,
    t`How is each witness checked to be a natural number?`,
  ],
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-1', '1.3.1(e)'),
});

const fProof = supervision({
  id: 'sw-1-3-1-f-proof',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.3.1(f)'),
  title: t`Prove Jordan's generalisation`,
  prompt: t`Prove: for all natural numbers ${math`n`} and ${math`k`}, there exists a natural number ${math`q`} such that ${math`(${2}n + ${1})^{${2}} \cdot t_k + t_n = t_q`}. Name the witness ${math`q`} and check it by algebra.`,
  hints: [
    t`What is ${math`(${2}n + ${1})^{${2}} t_k + t_n`} written out with the formula?`,
    t`Which ${math`q`}, linear in ${math`k`}, has ${math`q^{${2}}`} matching the terms in ${math`k^{${2}}`}?`,
    t`How is the guess checked by expanding ${math`\frac{q(q + ${1})}{${2}}`}?`,
  ],
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-1', '1.3.1(f)'),
});

const sw421aProof = supervision({
  id: 'sw-4-2-1-a-proof',
  source: cite('cst-dm-sw1', 'Exercises 4, 4.2.1(a)'),
  title: t`Establish the identity`,
  prompt: t`Establish: for all positive integers ${math`m`} and ${math`n`}, ${math`(${2}^{n} - ${1}) \cdot \sum_{i = ${0}}^{m - ${1}} ${2}^{i \cdot n} = ${2}^{m \cdot n} - ${1}`}. Give a direct proof by telescoping, and, once induction is taught, an inductive one.`,
  hints: [
    t`Multiplying ${math`${2}^{n} - ${1}`} by the sum term by term, which two sums appear?`,
    t`Which terms cancel when one sum is subtracted from the other?`,
    t`Which two terms remain?`,
  ],
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-4', '4.2.1(a)'),
});

const sw421bProof = supervision({
  id: 'sw-4-2-1-b-proof',
  source: cite('cst-dm-sw1', 'Exercises 4, 4.2.1(b)'),
  title: t`Composite exponents`,
  prompt: t`Suppose ${math`k`} is a positive integer that is not prime. Prove that ${math`${2}^{k} - ${1}`} is not prime. Take care with ${math`k = ${1}`}, which is not prime either.`,
  hints: [
    t`If ${math`k`} is not prime and ${math`k > ${1}`}, how can ${math`k`} be written as a product?`,
    t`Using part (a) with that product, which factor does ${math`${2}^{k} - ${1}`} have?`,
    t`Why is that factor strictly between ${1} and ${math`${2}^{k} - ${1}`}, and what happens when ${math`k = ${1}`}?`,
  ],
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-4', '4.2.1(b)'),
});

/*
 * Outline for marking lp-ex-16 (20 marks):
 * 1. Push the negation in: not forall y [..] is exists y not[(Q(a) or Q(b)) and not Q(y)] (4).
 * 2. De Morgan and double negation: exists y [(not Q(a) and not Q(b)) or Q(y)] (4).
 * 3. Pull the quantifier past the part without y (y is not free there):
 *    (not Q(a) and not Q(b)) or exists y Q(y) (4).
 * 4. Q(a) implies exists y Q(y), and so does Q(b); so exists y Q(y) is equivalent to
 *    exists y Q(y) or Q(a) or Q(b) (4).
 * 5. Then the formula contains (not Q(a) and not Q(b)) or (Q(a) or Q(b)), which is true by De
 *    Morgan and excluded middle; so the whole formula is valid (4).
 */
const lp16 = supervision({
  id: 'lp-ex-16',
  source: cite('cst-lp-notes', 'Section 5, Exercise 16, the proof by equivalences (page 14)', true),
  title: t`A valid negated "for all"`,
  prompt: t`Let ${math`Q`} be a one-place predicate and ${math`a`}, ${math`b`} constants, in a non-empty domain. Prove ${math`\lnot \forall y\, [(Q(a) \lor Q(b)) \land \lnot Q(y)]`} using equivalences: rewrite it step by step, naming the law used at each step, until it is plainly true whatever the domain, the predicate ${math`Q`}, and the constants are.`,
  hints: [
    t`What does moving the negation through ${math`\forall`} give?`,
    t`Applying De Morgan's law and double negation inside, what is left?`,
    t`Which part does not mention ${math`y`}, and why does the formula then reduce to something true?`,
  ],
  writeUp: 'proof',
});

const largeX = supervision({
  id: 'a2-q1-iii',
  source: cite('step-f02', 'Q1(iii)'),
  title: t`A difference of roots for large ${math`x`}`,
  prompt: t`Show that ${math`\sqrt{${1} + x^{${2}}} - x = \frac{${1}}{\sqrt{${1} + x^{${2}}} + x}`}. Deduce that if ${math`x`} is very large, then ${math`\sqrt{${1} + x^{${2}}} - x`} is approximately equal to ${math`\frac{${1}}{${2}x}`}.`,
  hints: [
    t`Multiplying ${math`\sqrt{${1} + x^{${2}}} - x`} by its conjugate over itself, what is the numerator?`,
    t`For very large ${math`x`}, what is ${math`\sqrt{${1} + x^{${2}}}`} close to?`,
    t`What does the denominator then become?`,
  ],
  writeUp: 'proof',
  official: cite('step-f02-hints', 'Q1(iii)'),
});

const step2005 = supervision({
  id: 'a1-q3',
  source: cite('step-f01', 'Q3 (2005 STEP I Q3)'),
  title: t`Two fractions equal to one`,
  prompt: t`In this question ${math`a`} and ${math`b`} are distinct, non-zero real numbers, and ${math`c`} is a real number. (i) Show that, if ${math`a`} and ${math`b`} are either both positive or both negative, then the equation ${math`\frac{x}{x - a} + \frac{x}{x - b} = ${1}`} has two distinct real solutions. (ii) Show that, if ${math`c \ne ${1}`}, the equation ${math`\frac{x}{x - a} + \frac{x}{x - b} = ${1} + c`} has exactly one real solution if ${math`c^{${2}} = -\frac{${4}ab}{(a - b)^{${2}}}`}. Show that this condition can be written ${math`c^{${2}} = ${1} - \left(\frac{a + b}{a - b}\right)^{${2}}`}, and deduce that it can only hold if ${math`${0} < c^{${2}} \le ${1}`}.`,
  hints: [
    t`Clearing fractions, which quadratic in ${math`x`} results?`,
    t`What is its discriminant, and why is it positive when ${math`ab > ${0}`}?`,
    t`For (ii), which condition on ${mc} makes the discriminant ${0}, and how does it rearrange?`,
  ],
  writeUp: 'proof',
  official: cite('step-f01-hints', 'Q3'),
});

const specQ1 = supervision({
  id: 'stepspec-q1-i',
  source: cite('stepdb-spec-s1', 'Q1(i)'),
  title: t`Where a conic can be`,
  prompt: t`The real numbers ${math`x`} and ${math`y`} satisfy the equation ${math`${4}x^{${2}} + ${16}xy + y^{${2}} + ${24}x = ${0}`}. Prove that either ${math`x \le ${0}`} or ${math`x \ge \frac{${2}}{${5}}`}, and, similarly, find restrictions on the values of ${math`y`}.`,
  hints: [
    t`Treating the equation as a quadratic in ${math`y`}, what is its discriminant?`,
    t`For real ${math`y`}, which inequality in ${math`x`} must hold?`,
    t`Treating it as a quadratic in ${math`x`}, what does the same argument give for ${math`y`}?`,
  ],
  writeUp: 'proof',
});

// 2004 STEP I Q6: medians and the orthocentre, with letters for the coordinates.
const vertex = (i: number) => math`(p_{${i}}, q_{${i}})`;
const step04Lines = supervision({
  id: 'step04-q6',
  source: cite('stepdb-04-s1', 'Q6'),
  title: t`Lines through a triangle, in letters`,
  prompt: t`The three points ${math`A`}, ${math`B`}, and ${math`C`} have coordinates ${vertex(1)}, ${vertex(2)}, and ${vertex(3)}, respectively. Find the point of intersection of the line joining ${math`A`} to the midpoint of ${math`BC`}, and the line joining ${math`B`} to the midpoint of ${math`AC`}. Verify that this point lies on the line joining ${math`C`} to the midpoint of ${math`AB`}. The point ${math`H`} has coordinates ${math`(p_{${1}} + p_{${2}} + p_{${3}}, q_{${1}} + q_{${2}} + q_{${3}})`}. Show that if the line ${math`AH`} intersects the line ${math`BC`} at right angles, then ${math`p_{${2}}^{${2}} + q_{${2}}^{${2}} = p_{${3}}^{${2}} + q_{${3}}^{${2}}`}, and write down a similar result if the line ${math`BH`} intersects the line ${math`AC`} at right angles. Deduce that if ${math`AH`} is perpendicular to ${math`BC`} and also ${math`BH`} is perpendicular to ${math`AC`}, then ${math`CH`} is perpendicular to ${math`AB`}.`,
  hints: [
    t`What are the equations of the two lines through ${math`A`} and ${math`B`}?`,
    t`Where do they meet, and does the line from ${math`C`} pass through that point?`,
    t`What does ${math`AH`} perpendicular to ${math`BC`} give, as a product of gradients or a scalar product?`,
  ],
  writeUp: 'proof',
  official: cite('stepdb-04-ha', 'STEP I, Q6 (page 7 of the STEP I hints)'),
});

const step2004 = supervision({
  id: 'a3-q3',
  source: cite('step-f03', 'Q3 (2004 STEP I Q2)'),
  title: t`Integrals of the floor function`,
  prompt: t`The notation ${math`[x]`} means the greatest integer less than or equal to ${math`x`}. (i) Sketch the graph of ${math`y = \sqrt{[x]}`} and show that ${math`\int_{${0}}^{a} \sqrt{[x]}\,dx = \sum_{r = ${0}}^{a - ${1}} \sqrt{r}`} when ${math`a`} is a positive integer. (ii) Show that ${math`\int_{${0}}^{a} ${2}^{[x]}\,dx = ${2}^{a} - ${1}`} when ${math`a`} is a positive integer. (iii) Determine an expression for ${math`\int_{${0}}^{a} ${2}^{[x]}\,dx`} when ${math`a`} is positive but not an integer.`,
  hints: [
    t`On which intervals is ${math`[x]`} constant, and what is the integrand there?`,
    t`Adding the areas of the rectangles, which sum results?`,
    t`For ${ma} not an integer, which extra piece lies beyond ${math`[a]`}?`,
  ],
  writeUp: 'proof',
  official: cite('step-f03-hints', 'Q3'),
});

// Rule 1 (2026-10-08): set here from logic.implication, the earliest topic that teaches everything it needs.
const prop10 = supervision({
  id: 'notes-50-prop10',
  source: cite('cst-dm-notes', 'printed page 50, Proposition 10'),
  title: t`If ${math`\sqrt{x}`} is rational, so is ${math`x`}`,
  prompt: t`Let ${math`x`} be a positive real number. Prove that if ${math`\sqrt{x}`} is rational, then so is ${math`x`}. State the assumption and the conclusion.`,
  writeUp: 'proof',
  hints: [
    t`What does it mean for ${math`\sqrt{x}`} to be rational, written with integers?`,
    t`How is ${math`x`} related to ${math`\sqrt{x}`}, and what does that give for ${math`x`} in terms of those integers?`,
    t`Why is the result a ratio of integers with a non-zero denominator?`,
  ],
  official: cite('cst-dm-notes', 'printed page 51, the notes\' proof'),
});

// ---------------------------------------------------------------- lesson

const [mn, mk, mm] = [math`n`, math`k`, math`m`];
const sqMinus1 = (x: number): number => x * x - 1;
const nextTo = (k: number): number => k * (k + 1);

export const directProof: TopicContent = {
  topicId: 'proof.direct',
  goal: t`Prove a statement by a chain of deductions from the assumptions to the conclusion, found first in scratch work and then written as sentences.`,
  objective: t`Find a proof in scratch work, then write it as a chain of justified deductions.`,
  why: t`Every other proof method is built on this one; next come proof by cases, contradiction, and the contrapositive.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`What a proof is` },
    { kind: 'hook', text: t`Square an odd number and subtract ${1}: ${math`${3}^{${2}} - ${1} = ${sqMinus1(3)}`}, ${math`${5}^{${2}} - ${1} = ${sqMinus1(5)}`}, ${math`${7}^{${2}} - ${1} = ${sqMinus1(7)}`}. Every one is a multiple of ${8}. Does that go on forever? Checking a million cases would not settle it. A proof settles it in five lines.` },
    { kind: 'narrative', text: t`The CST notes define a proof as a sequence of logical deductions, from axioms and statements already proved, that ends with the statement in question. Each line must follow from the ones before it. Nothing may be assumed just because it looks true.` },
    {
      kind: 'p',
      text: t`Some vocabulary from the notes. A theorem is an important true statement. A [[lemma|lemma]] is a true statement used mainly to prove others. A corollary is a statement that follows quickly from a theorem.`,
    },
    { kind: 'narrative', text: t`Everything rests on definitions, recalled exactly. Here are the two this lesson uses.` },
    {
      kind: 'definition',
      name: t`Even, odd`,
      formal: t`An integer ${mn} is even if ${math`n = ${2}k`} for some integer ${mk}, and odd if ${math`n = ${2}k + ${1}`} for some integer ${mk}.`,
      plain: t`even is twice a whole number; odd is one more than that. ${math`${7} = ${2} \times ${3} + ${1}`}, so ${7} is odd with ${math`k = ${3}`}.`,
    },
    {
      kind: 'definition',
      name: t`Divides`,
      formal: t`For integers ${math`d`} and ${mn}, ${math`d`} divides ${mn}, written ${math`d \mid n`}, if ${math`n = d \cdot k`} for some integer ${mk}.`,
      plain: t`${mn} is a whole-number multiple of ${math`d`}. ${math`${3} \mid ${12}`} because ${math`${12} = ${3} \times ${4}`}. Note that ${math`d \mid n`} is a statement, true or false, not a number: ${math`${2} \mid ${4}`} is true and ${math`${4} \mid ${2}`} is false.`,
    },
    { kind: 'section', title: t`The method` },
    {
      kind: 'rule',
      text: t`A [[direct-proof|direct proof]] of "if ${math`P`} then ${math`Q`}": assume ${math`P`}; unpack it with the definitions; deduce, one justified step at a time; and arrive at ${math`Q`}, packed back into its definition.`,
      why: { q: t`Why "unpack" and "pack"?`, a: t`Words like "odd" and "divides" cannot be calculated with. Their definitions turn them into equations, such as ${math`n = ${2}k + ${1}`}, which can. At the end, the definition turns an equation back into the word you were asked to prove.` },
    },
    { kind: 'narrative', text: t`Before writing, you find the proof. The CST notes call this [[scratch-work|scratch work]]: try small cases, do algebra, work backwards from the goal. It is allowed to be messy. But it is not the proof, and the notes say plainly that scratch work will not be accepted as one.` },
    { kind: 'narrative', text: t`Scratch work for the hook. Write the odd number as ${math`n = ${2}k + ${1}`}. Then ${math`n^{${2}} - ${1} = ${4}k^{${2}} + ${4}k = ${4}k(k + ${1})`}. That gives a factor ${4}, but we want ${8}. Try numbers: ${math`k(k + ${1})`} is ${nextTo(1)}, ${nextTo(2)}, ${nextTo(3)}, ${nextTo(4)} for ${math`k = ${1}, ${2}, ${3}, ${4}`}. Always even. That is the missing factor ${2}.` },
    { kind: 'theorem', statement: t`For every odd integer ${mn}, ${math`${8} \mid (n^{${2}} - ${1})`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Assume and unpack`, text: t`Let ${mn} be odd. Then ${math`n = ${2}k + ${1}`} for some integer ${mk}.`, plain: t`The definition of odd. If ${mn} were ${7}, ${mk} would be ${3}.` },
        { label: t`Compute`, text: t`Expanding,`, eq: [math`n^{${2}} - ${1} = (${2}k + ${1})^{${2}} - ${1} = ${4}k^{${2}} + ${4}k + ${1} - ${1} = ${4}k(k + ${1})`], plain: t`Square the bracket: ${math`(${2}k)^{${2}} = ${4}k^{${2}}`}, twice the cross term gives ${math`${4}k`}, and ${math`${1}^{${2}} = ${1}`}. The ${1}s cancel, and ${math`${4}k`} is a common factor.` },
        {
          label: t`One of two neighbours is even`, text: t`${math`k(k + ${1})`} is even: if ${mk} is even, ${mk} is a factor; if ${mk} is odd, ${math`k + ${1}`} is even and is a factor. So ${math`k(k + ${1}) = ${2}m`} for some integer ${mm}.`,
          plain: t`Of any two whole numbers in a row, one is even, and a product with an even factor is even. ${math`${3} \times ${4} = ${12}`}.`,
          why: { q: t`Why is a product with an even factor even?`, a: t`If ${math`a = ${2}j`}, then ${math`ab = ${2}(jb)`}, and ${math`jb`} is an integer. So ${math`ab`} is ${2} times an integer.` },
        },
        { label: t`Put it together`, text: t`So ${math`n^{${2}} - ${1} = ${4} \cdot ${2}m = ${8}m`}.`, plain: t`Replace ${math`k(k + ${1})`} by ${math`${2}m`} in the line ${math`n^{${2}} - ${1} = ${4}k(k + ${1})`}.` },
        { label: t`Pack into the definition`, text: t`${mm} is an integer, so ${math`${8} \mid (n^{${2}} - ${1})`}.`, plain: t`${math`n^{${2}} - ${1}`} is ${8} times a whole number: that is what ${8} divides it means.` },
      ],
    },
    {
      kind: 'p',
      text: t`Notice what the proof adds to the scratch work: it says what is assumed, names every letter when it first appears, gives a reason for every step, and ends by stating what was shown. The notes describe a proof as an essay, and this is why.`,
    },
    quickCheck({
      prompt: t`To prove "if ${math`a \mid b`}, then ${math`a \mid (b^{${2}} + ${5}b)`}", write ${math`b = ax`}. Then ${math`b^{${2}} + ${5}b = a \cdot (\ldots)`}. What goes in the brackets, in terms of ${ma} and ${math`x`}?`,
      answer: { kind: 'expression', expected: 'a x^2 + 5x', variables: ['a', 'x'] },
      reference: 'a x^2 + 5x',
      why: t`${math`b^{${2}} + ${5}b = a^{${2}}x^{${2}} + ${5}ax = a(ax^{${2}} + ${5}x)`}, and ${math`ax^{${2}} + ${5}x`} is an integer, so ${math`a \mid (b^{${2}} + ${5}b)`}.`,
    }),
    { kind: 'section', title: t`Where proofs go wrong` },
    { kind: 'narrative', text: t`The TMUA notes list the steps that most often break a proof. Each is a move that is fine with most numbers and wrong with a few. A proof must work for every number its letters can stand for.` },
    {
      kind: 'pitfall',
      claim: t`From ${math`ab = ac`}, cancel ${ma} to get ${math`b = c`}.`,
      counterexample: t`With ${math`a = ${0}`}: ${math`${0} \times ${2} = ${0} \times ${5}`}, but ${math`${2} \neq ${5}`}. Cancelling is dividing by ${ma}, which is only allowed when ${math`a \neq ${0}`}.`,
    },
    {
      kind: 'pitfall',
      claim: t`If ${math`x < y`}, then ${math`x^{${2}} < y^{${2}}`}.`,
      counterexample: t`${math`${-5} < ${4}`}, but ${math`(${-5})^{${2}} = ${25}`} is bigger than ${math`${4}^{${2}} = ${16}`}. Squaring keeps an inequality only when both sides are at least ${0}. Likewise, multiplying an inequality by a negative number reverses it.`,
    },
    { kind: 'p', text: t`One more: squaring both sides of an equation can create solutions. ${math`x = ${3}`} has one solution, but ${math`x^{${2}} = ${9}`} has two. After squaring, check every answer in the original equation.` },
    { kind: 'takeaway', text: t`Find the proof in scratch work, then write it as an essay: assume, unpack the definitions, justify every step, and pack the conclusion back into its definition.` },
  ],
  examples: [
    { ...workedCambridge(bop411), examiner: t`Both hypotheses unpacked with different letters, ${math`x`} and ${math`y`}, the product regrouped as ${math`ac`} times an integer, and a closing sentence that says ${math`ac \mid bd`}.` },
    worked(divides, { form: 'chain', p: 2, q: 2 }, t`Divisibility is transitive`),
    worked(errorStep, { kind: 'divide-zero', u: 3, v: 0 }, t`A proof that ${math`${2} = ${1}`}`),
  ],
  generators: [divides, factorialDivisor, errorStep],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['direct-proof', 'scratch-work', 'lemma'],
  cambridge: withUses([
    bop47, bop419, bop46, bop410, tmuaR3, tmua72, bop49, bop413, bop424, scratch, 
    // Moved here (2026-10-08): first those that need only this lesson and what it builds on, then those that also lean on an earlier lesson outside it.
    unitPair, ns2q12i, a12ii, a7Show, bananasShow, ns1q4Proof, sw131d, a7ShowCubic, thm11,
    ns2q13, a7Unique, a7Bound, a7Bound3, ns2q12ii, sw116, eProof, fProof, sw421aProof, sw421bProof, lp16, largeX, step2005, specQ1, step04Lines, step2004,
    prop10,
  ], {
    'notes-50-prop10': { sections: ['The method'], note: t`Proving an implication about rational numbers`, needs: ['num.number-systems'] },
    'notes-35-scratch': { sections: ['What a proof is', 'The method'], note: t`Turning scratch work into a proof in sentences` },
    'step00-q1-unit': { sections: ['What a proof is', 'The method'], note: t`Spotting a pattern in two examples, then proving it for every unit fraction by adding fractions with letters` },
    'ns2-q12-i': { sections: ['The method'], note: t`Finding the remainders of large powers to show a sum has a factor` },
    'a12-q1-ii-six': { sections: ['The method'], note: t`Factorising into three consecutive integers, then finding the factors ${2} and ${3}` },
    'a7-q2-i-ii': { sections: ['The method', 'Where proofs go wrong'], note: t`Subtracting two equations and dividing by ${math`\alpha - \beta`}, which is not zero, then substituting into an identity` },
    'a3-q4-i': { sections: ['The method'], note: t`Writing each division with remainder as an equation and chaining them` },
    'ns1-q4-proof': { sections: ['The method'], note: t`Improving any choice step by step until only twos and threes remain` },
    'sw-1-3-1-d': { sections: ['The method'], note: t`Adding two consecutive triangular numbers by algebra` },
    'a7-q2-iv': { sections: ['The method'], note: t`Substituting chosen values into an identity` },
    'notes-54-thm11': { sections: ['The method'], note: t`Proving an implication by chaining modus ponens` },
    'ns2-q13': { sections: ['The method'], note: t`Comparing a number and its digit sum by their remainders on division by nine, in both directions`, needs: ['logic.iff'] },
    'a7-q4-i-a': { sections: ['The method'], note: t`Showing a choice of weights works and is the only one`, needs: ['pre.product-rule'] },
    'a7-q4-i-c-show': { sections: ['The method'], note: t`Two choices for each weight, so at most a power of two loads`, needs: ['pre.product-rule'] },
    'a7-q4-ii-b-show': { sections: ['The method'], note: t`Three choices for each weight, so at most a power of three loads`, needs: ['pre.product-rule'] },
    'ns2-q12-ii': { sections: ['The method'], note: t`Writing a power as a power of a power, then factorising a power minus one`, needs: ['pre.indices'] },
    'sw-1-1-6': { sections: ['What a proof is', 'The method'], note: t`Proving the rationals closed under addition from the definition`, needs: ['num.number-systems'] },
    'sw-1-3-1-e': { sections: ['The method'], note: t`Turning each map into a triangular number by algebra`, needs: ['alg.arithmetic-series'] },
    'sw-1-3-1-f-proof': { sections: ['The method'], note: t`Naming a witness and checking it with the triangular-number formula`, needs: ['alg.arithmetic-series'] },
    'sw-4-2-1-a-proof': { sections: ['The method'], note: t`Proving the series identity by multiplying and cancelling`, needs: ['alg.geometric-series'] },
    'sw-4-2-1-b-proof': { sections: ['The method', 'Where proofs go wrong'], note: t`Reading the series formula backwards as a factorisation, with care at ${math`k = ${1}`}`, needs: ['alg.geometric-series'] },
    'lp-ex-16': { sections: ['The method'], note: t`Rewriting a negated "for all" by named equivalences`, needs: ['logic.negating-quantifiers'] },
    'a2-q1-iii': { sections: ['The method'], note: t`Rationalising with a conjugate, then reading off the size for large values`, needs: ['alg.surds'] },
    'a1-q3': { sections: ['The method', 'Where proofs go wrong'], note: t`Clearing fractions to reach a quadratic and using the discriminant`, needs: ['ineq.linear-quadratic'] },
    'stepspec-q1-i': { sections: ['The method'], note: t`Treating an equation as a quadratic in one letter and using the discriminant`, needs: ['ineq.linear-quadratic'] },
    'step04-q6': { sections: ['The method'], note: t`Equations of lines through points given in letters, where they meet, and the rule for perpendicular gradients`, needs: ['geom.straight-lines'] },
    'a3-q3': { sections: ['The method'], note: t`Areas under step graphs as sums, including a geometric sum`, needs: ['fn.floor-function'] },
  }),
  // The CST notes' scratch work turned into a written proof. The IA block question needs HCF and LCM, so it is
  // set in pre.hcf-lcm (Rule 1, 2026-10-08). The Book of Proof exercises are good practice but easier.
  // Then four proofs moved here from earlier topics (2026-10-08) that ask only for this lesson and what it
  // builds on: the unit fractions guessed in scratch work, the factor of a sum of powers, n^3 - n and 6, and
  // the roots of a quadratic, where dividing by alpha - beta needs it to be non-zero. The other moved
  // proofs are practice: shorter, a step from an exercise, or leaning on an earlier lesson outside this one.
  gate: ['notes-35-scratch', 'step00-q1-unit', 'ns2-q12-i', 'a12-q1-ii-six', 'a7-q2-i-ii'],
  recall: [
    { front: t`What is a direct proof of "if ${math`P`} then ${math`Q`}"?`, back: t`Assume ${math`P`}, unpack the definitions, deduce step by step, and arrive at ${math`Q`}.` },
    { front: t`Define ${math`d \mid n`}.`, back: t`${math`n = d \cdot k`} for some integer ${mk}.` },
    { front: t`Define odd.`, back: t`${mn} is odd if ${math`n = ${2}k + ${1}`} for some integer ${mk}.` },
    { front: t`Is scratch work a proof?`, back: t`No. It finds the argument; the proof states the assumptions, justifies each step in order, and states the conclusion.` },
    { front: t`When may you cancel ${ma} from ${math`ab = ac`}?`, back: t`Only when ${math`a \neq ${0}`}.` },
  ],
  proofOrder: [
    {
      title: t`${8} divides ${math`n^{${2}} - ${1}`} for odd ${mn}`,
      steps: [
        t`Let ${mn} be odd, so ${math`n = ${2}k + ${1}`} for an integer ${mk}.`,
        t`Then ${math`n^{${2}} - ${1} = ${4}k(k + ${1})`}.`,
        t`One of ${mk} and ${math`k + ${1}`} is even, so ${math`k(k + ${1}) = ${2}m`} for an integer ${mm}.`,
        t`So ${math`n^{${2}} - ${1} = ${8}m`}, and ${math`${8} \mid (n^{${2}} - ${1})`}.`,
      ],
    },
    {
      title: t`If ${math`a \mid b`} and ${math`a \mid c`}, then ${math`a \mid (b + c)`}`,
      steps: [
        t`Assume ${math`a \mid b`} and ${math`a \mid c`}.`,
        t`Then ${math`b = ax`} and ${math`c = ay`} for integers ${math`x`} and ${math`y`}.`,
        t`So ${math`b + c = a(x + y)`}.`,
        t`${math`x + y`} is an integer, so ${math`a \mid (b + c)`}.`,
      ],
    },
  ],
};
