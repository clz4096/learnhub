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
 */
import { gradeExpression, type Rational } from '@learnhub/mastery';
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { factorial, int, pick, upTo } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { exprTex, math, t, type Rich } from '../rich';
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

function bopDivides(o: { n: number; title: Rich; prompt: Rich; expected: string; vars: string[]; steps: Rich[]; check: () => string | null; official: boolean; wrong: Misconception[] }) {
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
  steps: [t`${math`b = ac`}; squaring both sides gives ${math`b^{${2}} = a^{${2}}c^{${2}}`}. So ${math`b^{${2}} = a^{${2}}d`} with ${math`d = c^{${2}} \in \mathbb{Z}`}, and ${math`a^{${2}} \mid b^{${2}}`}.`],
  check: () => {
    for (let a = -5; a <= 5; a++) for (let c = -5; c <= 5; c++) if ((a * c) ** 2 !== a * a * c * c) return 'b² = a²c² fails';
    return null;
  },
  wrong: [{ response: 'c', why: t`${math`b^{${2}} = (ac)^{${2}} = a^{${2}}c^{${2}}`}: the ${mc} is squared too.` }],
});
const bop419 = bopDivides({
  n: 19, official: true, vars: ['x', 'y'], expected: 'x^3 y',
  title: t`${math`a^{${6}}`} divides ${mc}`,
  prompt: t`Suppose ${math`a, b, c`} are integers. Prove: if ${math`a^{${2}} \mid b`} and ${math`b^{${3}} \mid c`}, then ${math`a^{${6}} \mid c`}. With ${math`b = a^{${2}}x`} and ${math`c = b^{${3}}y`}, ${math`c = a^{${6}} \cdot (\ldots)`}: what is in the brackets?`,
  steps: [t`Substitute: ${math`c = b^{${3}}y = (a^{${2}}x)^{${3}}y = a^{${6}}x^{${3}}y`}. So ${math`c = a^{${6}} \cdot x^{${3}}y`} with ${math`x^{${3}}y`} an integer, and ${math`a^{${6}} \mid c`}.`],
  check: () => {
    for (let a = -3; a <= 3; a++) for (let x = -3; x <= 3; x++) for (let y = -3; y <= 3; y++) if (((a * a * x) ** 3) * y !== a ** 6 * (x ** 3 * y)) return 'c = a⁶x³y fails';
    return null;
  },
  wrong: [{ response: 'xy', why: t`${math`(a^{${2}}x)^{${3}} = a^{${6}}x^{${3}}`}: the ${math`x`} is cubed too.` }],
});
const bop46 = bopDivides({
  n: 6, official: false, vars: ['x', 'y'], expected: 'x + y',
  title: t`${ma} divides ${math`b + c`}`,
  prompt: t`Suppose ${math`a, b, c \in \mathbb{Z}`}. Prove: if ${math`a \mid b`} and ${math`a \mid c`}, then ${math`a \mid (b + c)`}. With ${math`b = ax`} and ${math`c = ay`}, ${math`b + c = a \cdot (\ldots)`}: what is in the brackets?`,
  steps: [t`${math`b + c = ax + ay = a(x + y)`}, and ${math`x + y`} is an integer, so ${math`a \mid (b + c)`}.`],
  check: identityCheck((a, x, y) => a * x + a * y, (_a, x, y) => x + y),
  wrong: [{ response: 'xy', why: t`${math`ax + ay = a(x + y)`}: a sum, not a product.` }],
});
const bop410 = bopDivides({
  n: 10, official: false, vars: ['a', 'c'], expected: '3a^2 c^3 - a c^2 + 5c',
  title: t`${ma} divides ${math`${3}b^{${3}} - b^{${2}} + ${5}b`}`,
  prompt: t`Suppose ${ma} and ${mb} are integers. Prove: if ${math`a \mid b`}, then ${math`a \mid (${3}b^{${3}} - b^{${2}} + ${5}b)`}. With ${math`b = ac`}, write ${math`${3}b^{${3}} - b^{${2}} + ${5}b = a \cdot (\ldots)`}: what is in the brackets, in terms of ${ma} and ${mc}?`,
  steps: [
    t`Substitute ${math`b = ac`}: ${math`${3}a^{${3}}c^{${3}} - a^{${2}}c^{${2}} + ${5}ac`}.`,
    t`Every term has a factor ${ma}: ${math`a(${3}a^{${2}}c^{${3}} - ac^{${2}} + ${5}c)`}, an integer times ${ma}.`,
  ],
  check: () => {
    for (let a = -4; a <= 4; a++) for (let c = -4; c <= 4; c++) { const b = a * c; if (3 * b ** 3 - b * b + 5 * b !== a * (3 * a * a * c ** 3 - a * c * c + 5 * c)) return 'the factorisation fails'; }
    return null;
  },
  wrong: [{ response: '3c^3 - c^2 + 5c', why: t`${math`b^{${3}} = a^{${3}}c^{${3}}`} and ${math`b^{${2}} = a^{${2}}c^{${2}}`}: after taking out one ${ma}, powers of ${ma} remain.` }],
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
  solution: [
    t`Multiplying both sides by ${math`${2}x + ${7}`} keeps the inequality only if ${math`${2}x + ${7} > ${0}`}. If it is negative, the inequality reverses.`,
    t`At ${math`x = ${-4}`}: ${math`\frac{${-2}}{${-1}} = ${2} < ${5}`}, but ${math`x + ${2} = ${-2}`} and ${math`${5}(${2}x + ${7}) = ${-5}`}, and ${math`${-2} < ${-5}`} is false. So the deduction is invalid.`,
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
  solution: [
    t`${math`x^{${2}} + ${2}x - ${15} = (x + ${5})(x - ${3})`}, so ${math`x = ${-5}`} or ${math`x = ${3}`}.`,
    t`In the original equation, ${math`${3} + ${1} = ${4}`}, but ${math`${-5} + ${1} = ${-4}`}. Squaring generated the extra solution ${math`${-5}`}.`,
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
  writeUp: 'proof',
  official: cite('bop', 'Solutions, Chapter 4, exercise 9'),
});
const bop413 = supervision({
  id: 'bop-4-13',
  source: cite('bop', 'Chapter 4, exercise 13'),
  title: t`Two cases from a factorisation`,
  prompt: t`Suppose ${math`x, y \in \mathbb{R}`}. Prove: if ${math`x^{${2}} + ${5}y = y^{${2}} + ${5}x`}, then ${math`x = y`} or ${math`x + y = ${5}`}. Watch for division by something that might be zero.`,
  writeUp: 'proof',
  official: cite('bop', 'Solutions, Chapter 4, exercise 13'),
});
const bop424 = supervision({
  id: 'bop-4-24',
  source: cite('bop', 'Chapter 4, exercise 24'),
  title: t`Long runs of composite numbers`,
  prompt: t`Prove: if ${math`n \in \mathbb{N}`} and ${math`n \ge ${2}`}, then the numbers ${math`n! + ${2}, n! + ${3}, \ldots, n! + n`} are all composite. Explain why this means there are arbitrarily long gaps between primes.`,
  writeUp: 'proof',
});
const scratch = supervision({
  id: 'notes-35-scratch',
  source: cite('cst-dm-notes', 'printed pages 31 to 35, Definition 7 and Proposition 8', true),
  title: t`From scratch work to a proof`,
  prompt: t`The notes show scratch work for "the product of two odd integers is odd" (${math`m = ${2}i + ${1}`}, ${math`n = ${2}j + ${1}`}, ${math`m \cdot n = ${2}(${2}ij + i + j) + ${1}`}) and say it will not be accepted as a proof. Write the proof in sentences, then explain what the scratch work leaves out.`,
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
const ns2q15 = supervision({
  id: 'ns2-q15',
  source: cite('ia-ns-sheet-2', 'Q15, first part'),
  title: t`Products in a block of consecutive numbers`,
  prompt: t`Let ${math`a < b`} be distinct natural numbers. Prove that every block of ${math`b`} consecutive natural numbers contains two distinct numbers whose product is a multiple of ${math`ab`}.`,
  writeUp: 'proof',
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
  cambridge: withUses([bop47, bop419, bop46, bop410, tmuaR3, tmua72, bop49, bop413, bop424, scratch, ns2q15], {
    'ns2-q15': { sections: ['The method'], note: t`Finding multiples inside a block of consecutive numbers`, needs: ['pre.remainders'] },
    'notes-35-scratch': { sections: ['What a proof is', 'The method'], note: t`Turning scratch work into a proof in sentences` },
  }),
  // The IA block question first: a direct proof with a case the first idea misses. Then the CST
  // notes' scratch work turned into a written proof. The Book of Proof exercises are good practice but easier.
  gate: ['ns2-q15', 'notes-35-scratch'],
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
