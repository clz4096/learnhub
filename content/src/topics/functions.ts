/**
 * fn.functions: a function as a rule with a domain and a range; composite and inverse
 * functions; functions defined piecewise, periodically, or by an equation such as
 * f(x + y) = f(x)f(y). Sources: STEP Support Foundation Assignment 11 Q1(ii), Assignment 16
 * Q1, and Assignment 21 Q1 (C(x) and S(x)), and the NST Maths Workbook FC6. Values are
 * computed exactly; functional equations are checked at many points in floating point.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, exprTex, math, t } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';
import { poly } from '../poly';
import { distinctFrom, namedAnswer, withExaminer } from '../prep-a';

const near = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));

// ---------------------------------------------------------------- composites

interface CompP { a: number; b: number; c: number; d: number; k: number; order: 'fg' | 'gf' }
/** f(x) = ax + b, g(x) = cx^2 + d. */
const f = (p: CompP, x: number): number => p.a * x + p.b;
const g = (p: CompP, x: number): number => p.c * x * x + p.d;
const compAns = (p: CompP): number => (p.order === 'fg' ? f(p, g(p, p.k)) : g(p, f(p, p.k)));
const compMis = (p: CompP): number[] => [p.order === 'fg' ? g(p, f(p, p.k)) : f(p, g(p, p.k)), f(p, p.k) * g(p, p.k)];

const composite = generator<CompP>({
  id: 'composite',
  skill: 'Evaluate a composite function: fg(x) means apply g first, then f.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const p: CompP = { a: pick(rng, [-3, -2, 2, 3, 4]), b: int(rng, -5, 5), c: pick(rng, [1, 2, -1]), d: int(rng, -4, 4), k: int(rng, -3, 3), order: rng() < 0.5 ? 'fg' : 'gf' };
      if (distinctFrom(String(compAns(p)), compMis(p).map(String)) >= 2) return p;
    }
  },
  sane: (p) => (p.a !== 0 && p.c !== 0 ? null : 'degenerate'),
  problem: (p) => {
    const inner = p.order === 'fg' ? g(p, p.k) : f(p, p.k);
    return {
      prompt: t`${computedTex(`f(x) = ${exprTex(poly([p.a, p.b]))}`)} and ${computedTex(`g(x) = ${exprTex(poly([p.c, 0, p.d]))}`)}. Find ${math`${p.order}(${p.k})`}.`,
      answer: { kind: 'exact', expected: String(compAns(p)) },
      solution: [
        t`${math`${p.order}(${p.k})`} means ${p.order === 'fg' ? t`${math`f(g(${p.k}))`}: apply ${math`g`} first` : t`${math`g(f(${p.k}))`}: apply ${math`f`} first`}, the function nearer to ${math`x`}.`,
        t`${p.order === 'fg' ? t`${math`g(${p.k}) = ${inner}`}, then ${math`f(${inner}) = ${compAns(p)}`}` : t`${math`f(${p.k}) = ${inner}`}, then ${math`g(${inner}) = ${compAns(p)}`}`}.`,
      ],
    };
  },
  solve: (p) => {
    const F = (x: number): number => p.a * x + p.b;
    const G = (x: number): number => p.c * x ** 2 + p.d;
    return String(p.order === 'fg' ? F(G(p.k)) : G(F(p.k)));
  },
  misconceptions: (p): Misconception[] => {
    const [wrongOrder, prod] = compMis(p) as [number, number];
    return [
      { response: String(wrongOrder), why: t`The order is reversed. In ${math`${p.order}(x)`} the function written next to ${math`x`} acts first.` },
      { response: String(prod), why: t`A composite is not a product: ${math`fg(x)`} means ${math`f(g(x))`}, feeding one output into the other.` },
    ];
  },
});

// ---------------------------------------------------------------- inverses

interface InvP { a: number; b: number; c: number; k: number }
/** f(x) = (ax + b)/c; the inverse at k is (ck - b)/a. */
const invAns = ({ a, b, c, k }: InvP): Rational => q(c * k - b, a);
const invMis = ({ a, b, c, k }: InvP): Rational[] => [q(c, a * k + b), q(a * k + b, c), q(c * k + b, a)];

const inverse = generator<InvP>({
  id: 'inverse',
  skill: 'Evaluate an inverse function by solving f(x) = k for x.',
  params: (rng) => {
    for (;;) {
      const p: InvP = { a: pick(rng, [-3, -2, 2, 3, 4, 5]), b: int(rng, -7, 7), c: pick(rng, [1, 2, 3]), k: int(rng, -5, 6) };
      if (p.a * p.k + p.b === 0) continue;
      if (distinctFrom(str(invAns(p)), invMis(p).map(str)) >= 2) return p;
    }
  },
  sane: (p) => (p.a !== 0 ? null : 'not one-to-one'),
  problem: (p) => {
    const fx = computedTex(`f(x) = ${exprTex(p.c === 1 ? poly([p.a, p.b]) : `(${poly([p.a, p.b])})/${p.c}`)}`);
    return {
      prompt: t`${fx} for all real ${math`x`}. Find ${math`f^{-${1}}(${p.k})`}.`,
      answer: { kind: 'exact', expected: str(invAns(p)) },
      solution: [
        t`${math`f^{-${1}}(${p.k})`} is the ${math`x`} with ${math`f(x) = ${p.k}`}: it undoes ${math`f`}.`,
        t`Solve: ${math`${p.a}x + (${p.b}) = ${p.c * p.k}`}, so ${math`x = \frac{${p.c * p.k} - (${p.b})}{${p.a}} = ${invAns(p)}`}. Check: ${math`f(${invAns(p)}) = ${div(add(mul(q(p.a), invAns(p)), q(p.b)), q(p.c))}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Bisection-free: search x = j/a for f(x) = k exactly.
    for (let j = -400; j <= 400; j++) { const x = q(j, Math.abs(p.a)); if (str(div(add(mul(q(p.a), x), q(p.b)), q(p.c))) === String(p.k)) return str(x); }
    return 'none';
  },
  misconceptions: (p): Misconception[] => {
    const [recip, value, sign] = invMis(p) as [Rational, Rational, Rational];
    return [
      { response: str(recip), why: t`${math`f^{-${1}}`} is the inverse function, not the reciprocal ${math`\frac{${1}}{f}`}: solve ${math`f(x) = ${p.k}`}.` },
      { response: str(value), why: t`That is ${math`f(${p.k})`}. The inverse goes the other way: which input gives the output ${p.k}?` },
      { response: str(sign), why: t`To undo "add ${p.b}", subtract ${p.b}: ${math`${p.a}x = ${p.c * p.k} - (${p.b})`}.` },
    ];
  },
});

// ---------------------------------------------------------------- periodic functions

interface PerP { P: number; n: number; s: Rational }
/** f(x) = x^2 on 0 <= x < P, and f(x + P) = f(x). */
const sq = (r: Rational): Rational => mul(r, r);
const perT = ({ P, n, s }: PerP): Rational => add(q(n * P), s);

const periodic = generator<PerP>({
  id: 'periodic',
  skill: 'Evaluate a periodic function by subtracting whole periods until the input is in the interval where the rule is given.',
  params: (rng) => {
    for (;;) {
      const P = pick(rng, [2, 3, 4]);
      const p: PerP = { P, n: pick(rng, [2, 3, -2, -3]), s: q(int(rng, 1, 2 * P - 1), 2) };
      const tv = perT(p);
      const once = sub(tv, q(Math.sign(p.n) * P));
      if (distinctFrom(str(sq(p.s)), [str(sq(tv)), str(sq(once))]) >= 2) return p;
    }
  },
  sane: (p) => (p.s.num >= 0n && Number(p.s.num) < p.P * Number(p.s.den) ? null : 'out of range'),
  problem: (p) => {
    const tv = perT(p);
    return {
      prompt: t`${math`f(x) = x^{${2}}`} for ${math`${0} \le x < ${p.P}`}, and ${math`f(x + ${p.P}) = f(x)`} for all ${math`x`}. Find ${math`f(${tv})`}.`,
      answer: { kind: 'exact', expected: str(sq(p.s)) },
      solution: [
        t`${math`f`} repeats every ${p.P}, so ${math`f(x) = f(x - ${p.P}k)`} for any integer ${math`k`}. Choose ${math`k`} to land in ${math`${0} \le x < ${p.P}`}: ${math`${tv} - (${p.n * p.P}) = ${p.s}`}.`,
        t`So ${math`f(${tv}) = f(${p.s}) = ${sq(p.s)}`}.`,
      ],
    };
  },
  solve: (p) => {
    let x = perT(p);
    while (x.num < 0n) x = add(x, q(p.P));
    while (Number(x.num) >= p.P * Number(x.den)) x = sub(x, q(p.P));
    return str(mul(x, x));
  },
  misconceptions: (p): Misconception[] => {
    const tv = perT(p);
    return [
      { response: str(sq(tv)), why: t`The rule ${math`x^{${2}}`} only holds for ${math`${0} \le x < ${p.P}`}. Use the period to move ${tv} into that interval first.` },
      { response: str(sq(sub(tv, q(Math.sign(p.n) * p.P)))), why: t`One period is not enough: keep ${p.n > 0 ? 'subtracting' : 'adding'} ${p.P} until the input is between ${0} and ${p.P}.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

/** A11's f: x on [0, 1], (2 - x)^2 on (1, 2], period 2. */
const f11 = (x: number): number => { const r = ((x % 2) + 2) % 2; return r <= 1 ? r : (2 - r) ** 2; };

const a11 = auto({
  id: 'a11-q1-ii',
  source: cite('step-f11', 'Q1(ii)'),
  title: t`A function defined in pieces, repeated`,
  prompt: t`The function ${math`f`} is defined for ${math`${0} \le x \le ${2}`} by ${math`f(x) = x`} for ${math`${0} \le x \le ${1}`} and ${math`f(x) = (${2} - x)^{${2}}`} for ${math`${1} < x \le ${2}`}. You are also given that ${math`f(x + ${2}) = f(x)`} for all ${math`x`}. Find ${math`a = f(${2.5})`}, ${math`b = f(${3})`}, ${math`c = f(${3.5})`}, and ${math`d = f(${4})`}.`,
  answer: namedAnswer(['a', 'b', 'c', 'd'], [q(1, 2), q(1), q(1, 4), q(0)], 'Subtract 2 to bring each input into the interval from 0 to 2.'),
  solution: [
    t`Subtract the period ${2}: ${math`f(${2.5}) = f(${0.5}) = ${0.5}`} and ${math`f(${3}) = f(${1}) = ${1}`}, both from the first piece.`,
    t`${math`f(${3.5}) = f(${1.5}) = (${2} - ${1.5})^{${2}} = ${0.25}`}, from the second piece; ${math`f(${4}) = f(${2}) = ${0}`}.`,
  ],
  reference: 'a = 1/2, b = 1, c = 1/4, d = 0',
  verify: () => same('values', [2.5, 3, 3.5, 4].map(f11).join(','), '0.5,1,0.25,0'),
  misconceptions: [{ response: 'a = 5/2, b = 3, c = 7/2, d = 4', why: t`The rule ${math`f(x) = x`} holds only on ${math`${0} \le x \le ${1}`}; use the period to move each input there first.` }],
});

const a16ii = auto({
  id: 'a16-q1-ii',
  source: cite('step-f16', 'Q1(ii)'),
  title: t`Recovering ${math`f`} from ${math`f(x^{${2}})`}`,
  prompt: t`The function ${math`f`} satisfies ${math`f(x^{${2}}) = \sqrt{${1} + x^{${4}}}`} for all real ${math`x`}. Write down an expression for ${math`f(y)`}, valid for ${math`y \ge ${0}`}. (Type a square root as sqrt.)`,
  answer: { kind: 'expression', expected: 'sqrt(1 + y^2)', variables: ['y'], domains: { y: { kind: 'real', min: 0, max: 5 } } },
  solution: [
    t`Put ${math`y = x^{${2}}`}. Then ${math`x^{${4}} = y^{${2}}`}, so ${math`f(y) = \sqrt{${1} + y^{${2}}}`}.`,
    t`This holds only for ${math`y \ge ${0}`}, since ${math`y = x^{${2}}`} is never negative: the equation tells us nothing about ${math`f`} at negative inputs.`,
  ],
  reference: 'sqrt(1 + y^2)',
  verify: () => { for (const x of [-2, -0.5, 0, 1.3, 3]) if (!near(Math.sqrt(1 + (x * x) ** 2), Math.sqrt(1 + x ** 4))) return `x = ${x}`; return null; },
  misconceptions: [{ response: 'sqrt(1 + y^4)', why: t`With ${math`y = x^{${2}}`}, ${math`x^{${4}} = (x^{${2}})^{${2}} = y^{${2}}`}, not ${math`y^{${4}}`}.` }],
});

const a16v = auto({
  id: 'a16-q1-v',
  source: cite('step-f16', 'Q1(iv), (v)'),
  title: t`A function from an equation`,
  prompt: t`Check that ${math`f(x) = a^{x}`} satisfies ${math`f(x + y) = f(x)f(y)`}, with ${math`a = ${2}`} when ${math`f(${1}) = ${2}`}. Then write down a function with ${math`f(xy) = f(x) + f(y)`} for ${math`x, y > ${0}`} and ${math`f(${2}) = ${1}`}. (Type ${math`\log_{${2}} x`} using natural logarithms: ln(x) divided by the ln of ${2}.)`,
  answer: { kind: 'expression', expected: 'ln(x)/ln(2)', variables: ['x'], domains: { x: { kind: 'real', min: 0.1, max: 20 } } },
  solution: [
    t`${math`a^{x + y} = a^{x}a^{y}`} by the index law, and ${math`f(${1}) = a = ${2}`}: ${math`f(x) = ${2}^{x}`}.`,
    t`The inverse of ${math`${2}^{x}`} turns products into sums: ${math`\log_{${2}}(xy) = \log_{${2}} x + \log_{${2}} y`}, and ${math`\log_{${2}} ${2} = ${1}`}. So ${math`f(x) = \log_{${2}} x = \frac{\ln x}{\ln ${2}}`} works.`,
  ],
  reference: 'ln(x)/ln(2)',
  verify: () => {
    const L = (x: number): number => Math.log(x) / Math.log(2);
    for (const [x, y] of [[3, 5], [0.5, 7], [2, 2]] as const) if (!near(L(x * y), L(x) + L(y))) return `fails at ${x}, ${y}`;
    return near(L(2), 1) ? null : 'f(2) is not 1';
  },
  misconceptions: [{ response: '2^x', why: t`${math`${2}^{x}`} turns sums into products, the opposite of what is asked: ${math`f(xy) = f(x) + f(y)`} needs a logarithm.` }],
  official: { source: cite('step-f16-hints', 'Q1(v)'), answer: 'ln(x)/ln(2)', agrees: true },
});

const a21 = supervision({
  id: 'a21-q1',
  source: cite('step-f21', 'Q1(i)'),
  title: t`Two new functions and their identities`,
  prompt: t`Define ${math`C(x) = \frac{${1}}{${2}}(a^{x} + a^{-x})`} and ${math`S(x) = \frac{${1}}{${2}}(a^{x} - a^{-x})`}, where ${math`a`} is a fixed positive real number. Show, using these definitions, that (a) ${math`C(x)^{${2}} - S(x)^{${2}} = ${1}`}; (b) ${math`C(x)C(y) + S(x)S(y) = C(x + y)`}; (c) ${math`C(x)S(y) + S(x)C(y) = S(x + y)`}. Deduce an expression for ${math`C(${2}x)`} in terms of ${math`C(x)`}.`,
  writeUp: 'proof',
  official: cite('step-f21-hints', 'Q1(i)'),
});

// ---------------------------------------------------------------- lesson

export const functionsTopic: TopicContent = {
  topicId: 'fn.functions',
  goal: t`Treat a function as a rule with a domain and a range, compose and invert functions, and work with functions defined piecewise, periodically, or by an equation such as ${math`f(x + y) = f(x)f(y)`}.`,
  objective: t`Work with domains, ranges, composites, inverses, and functions defined in unusual ways.`,
  why: t`STEP often defines a new function and asks you to reason with only its definition.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`The idea` },
    { kind: 'hook', text: t`A function satisfies ${math`f(x + y) = f(x) + f(y)`} and ${math`f(${1}) = ${3}`}. That is all you are told. What is ${math`f(${3})`}? Try it: ${math`f(${2}) = f(${1}) + f(${1}) = ${6}`}, and ${math`f(${3}) = f(${2}) + f(${1}) = ${9}`}. The equation alone pins the function down to ${math`${3}x`} at whole numbers.` },
    { kind: 'narrative', text: t`STEP loves this: a function given by a property instead of a formula. To handle such questions you need a precise idea of what a function is, and three operations: restricting the inputs, composing, and inverting.` },
    { kind: 'section', title: t`Domain and range` },
    {
      kind: 'definition',
      name: t`Function, domain, range`,
      formal: t`A [[function-domain-range|function]] ${math`f : A \to B`} assigns to each element ${math`x`} of the set ${math`A`}, its domain, exactly one element ${math`f(x)`} of ${math`B`}. Its range is ${math`\{f(x) : x \in A\}`}.`,
      plain: t`A rule with a stated set of allowed inputs. ${math`f(y) = y^{${2}} - ${2}`} on all reals has range ${math`f \ge -${2}`}: every output is at least ${math`-${2}`}, since ${math`y^{${2}} \ge ${0}`}, and every value from ${math`-${2}`} up is reached.`,
    },
    { kind: 'narrative', text: t`The domain matters. If ${math`f(x^{${2}} + ${1}) = x^{${2}} + ${3}`} for all ${math`x`}, then putting ${math`y = x^{${2}} + ${1}`} gives ${math`x^{${2}} = y - ${1}`}, so ${math`f(y) = (y - ${1}) + ${3} = y + ${2}`}. But only for ${math`y \ge ${1}`}: ${math`x^{${2}} + ${1}`} is never less than ${1}, so the information never reaches smaller inputs.` },
    { kind: 'section', title: t`Composites and inverses` },
    {
      kind: 'definition',
      name: t`Composite and inverse`,
      formal: t`For ${math`g : A \to B`} and ${math`f : B \to C`}, the [[composite-function|composite]] ${math`fg : A \to C`} is ${math`fg(x) = f(g(x))`}. A function ${math`f : A \to B`} that is one-to-one and has range ${math`B`} has an [[inverse-function|inverse]] ${math`f^{-${1}} : B \to A`}, with ${math`f^{-${1}}(y) = x`} exactly when ${math`f(x) = y`}.`,
      plain: t`${math`fg`} means "do ${math`g`}, then ${math`f`}". The inverse runs a function backwards: if ${math`f(x) = ${2}x + ${1}`}, then ${math`f(${3}) = ${7}`} and ${math`f^{-${1}}(${7}) = ${3}`}.`,
    },
    { kind: 'theorem', name: t`Undoing a function`, statement: t`If ${math`f : A \to B`} has an inverse, then ${math`f^{-${1}}(f(x)) = x`} for every ${math`x \in A`} and ${math`f(f^{-${1}}(y)) = y`} for every ${math`y \in B`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`First identity`, text: t`Let ${math`y = f(x)`}. By definition ${math`f^{-${1}}(y)`} is the input that ${math`f`} sends to ${math`y`}, and ${math`x`} is such an input.`, why: { q: t`Why is it exactly ${math`x`} and not another input?`, a: t`${math`f`} is one-to-one, so only one input is sent to ${math`y`}.` } },
        { label: t`So`, text: t`${math`f^{-${1}}(f(x)) = x`}.` },
        { label: t`Second identity`, text: t`For ${math`y \in B`}, let ${math`x = f^{-${1}}(y)`}; by definition ${math`f(x) = y`}, that is ${math`f(f^{-${1}}(y)) = y`}.` },
      ],
    },
    checkFrom(composite, { a: 2, b: 1, c: 1, d: -3, k: 2, order: 'fg' }, t`${math`g(${2}) = ${4} - ${3} = ${1}`}, then ${math`f(${1}) = ${3}`}.`),
    { kind: 'pitfall', claim: t`${math`f^{-${1}}(x) = \frac{${1}}{f(x)}`}.`, counterexample: t`For ${math`f(x) = ${2}x + ${1}`}: ${math`f^{-${1}}(${7}) = ${3}`}, but ${math`\frac{${1}}{f(${7})} = ${q(1, 15)}`}. The inverse undoes ${math`f`}; it is not a reciprocal.` },
    checkFrom(inverse, { a: 2, b: 1, c: 1, k: 7 }, t`Solve ${math`${2}x + ${1} = ${7}`}: ${math`x = ${3}`}.`),
    { kind: 'section', title: t`Functions defined in other ways` },
    {
      kind: 'definition',
      name: t`Periodic function`,
      formal: t`${math`f`} is [[periodic-function|periodic]] with period ${math`T > ${0}`} if ${math`f(x + T) = f(x)`} for every ${math`x`} in its domain.`,
      plain: t`Its graph repeats every ${math`T`}. If ${math`f`} has period ${2}, then ${math`f(${3.5}) = f(${1.5})`}.`,
    },
    { kind: 'narrative', text: t`To evaluate a periodic function, shift the input by whole periods into the interval where the rule is given. For a function defined by an equation, substitute cleverly chosen values, as in the hook, or guess a familiar function and check it satisfies the equation.` },
    checkFrom(periodic, { P: 2, n: 2, s: q(1, 2) }, t`${math`${q(9, 2)} - ${4} = ${q(1, 2)}`}, so ${math`f(${q(9, 2)}) = ${q(1, 4)}`}.`),
    { kind: 'takeaway', text: t`A function is a rule together with its domain; ${math`fg`} applies ${math`g`} first; ${math`f^{-${1}}`} undoes ${math`f`}; and a periodic function repeats, so shift into the interval where it is defined.` },
  ],
  examples: [
    withExaminer(workedCambridge(a11), t`Each value reduced by the period to an input in the defining interval, and the right piece of the definition named.`),
    worked(composite, { a: 3, b: -1, c: 2, d: 1, k: -1, order: 'gf' }, t`The other order`),
    worked(inverse, { a: 3, b: -2, c: 2, k: 5 }, t`Evaluating an inverse`),
  ],
  generators: [composite, inverse, periodic],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['function-domain-range', 'composite-function', 'inverse-function', 'periodic-function'],
  cambridge: withUses([a16ii, a16v, a21], {
    'a21-q1': { sections: ['Functions defined in other ways'], note: t`Proving identities for two functions from their definitions` },
    'a16-q1-v': { sections: ['Functions defined in other ways'], note: t`Finding functions that satisfy an equation, one of them a logarithm` },
    'a16-q1-ii': { sections: ['Composites and inverses', 'Functions defined in other ways'], note: t`Recovering a function from its value at a square` },
  }),
  gate: ['a21-q1', 'a16-q1-v', 'a16-q1-ii'],
  recall: [
    { front: t`What does ${math`fg(x)`} mean?`, back: t`${math`f(g(x))`}: apply ${math`g`} first, then ${math`f`}.` },
    { front: t`When does ${math`f`} have an inverse?`, back: t`When it is one-to-one onto its range; then ${math`f^{-${1}}(y) = x`} exactly when ${math`f(x) = y`}.` },
    { front: t`Define a periodic function.`, back: t`${math`f(x + T) = f(x)`} for all ${math`x`}, for some period ${math`T > ${0}`}.` },
  ],
  proofOrder: [{
    title: t`The inverse undoes the function`,
    steps: [
      t`Let ${math`y = f(x)`}.`,
      t`${math`f^{-${1}}(y)`} is the input that ${math`f`} sends to ${math`y`}.`,
      t`${math`f`} is one-to-one, so that input is ${math`x`}.`,
      t`Hence ${math`f^{-${1}}(f(x)) = x`}.`,
    ],
  }],
};
