/**
 * alg.surd-equations: solve equations with square roots by substituting for the root or by
 * squaring, then check for the solutions that squaring introduced. Sources: STEP Support
 * Foundation Assignment 11 Q2(ii) and Q3 (2013 STEP I Q1). Every answer is found again by
 * searching for the values that satisfy the original equation, evaluated in floating point.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, mul, pick, q, str, sub, toFloat, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computedTex, math, t } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';
import { distinctFrom, withExaminer } from '../prep-a';

const near = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
const sgn = (n: number): string => (n < 0 ? '-' : '+');

// ---------------------------------------------------------------- root equals linear

interface RlP { r: number; s: number }
/** sqrt(x + p) = x - k, whose squared form has roots r (valid) and s (introduced by squaring). */
const rlK = ({ r, s }: RlP): number => (r + s - 1) / 2;
const rlP = (p: RlP): number => rlK(p) ** 2 - p.r * p.s;

const rootLinear = generator<RlP>({
  id: 'root-linear',
  skill: 'Solve sqrt(x + p) = x - k by squaring, then reject the root that makes the right side negative.',
  params: (rng) => {
    for (;;) {
      const p: RlP = { r: int(rng, 1, 12), s: int(rng, -6, 8) };
      if ((p.r + p.s) % 2 === 0 || p.s >= p.r) continue;
      const k = rlK(p);
      if (p.r - k < 0 || p.s - k >= 0 || rlP(p) === 0) continue;
      if (distinctFrom(String(p.r), [String(p.s), String(k)]) >= 2) return p;
    }
  },
  sane: (p) => (p.r - rlK(p) >= 0 ? null : 'no valid root'),
  problem: (p) => {
    const k = rlK(p);
    const pp = rlP(p);
    return {
      prompt: t`Solve ${math`\sqrt{x ${sgn(pp)} ${Math.abs(pp)}} = x ${sgn(-k)} ${Math.abs(k)}`}.`,
      answer: { kind: 'exact', expected: String(p.r) },
      solution: [
        t`Square both sides: ${math`x ${sgn(pp)} ${Math.abs(pp)} = (x ${sgn(-k)} ${Math.abs(k)})^{${2}}`}, so ${math`x^{${2}} - ${p.r + p.s}x + ${p.r * p.s} = ${0}`}, that is ${math`(x - (${p.r}))(x - (${p.s})) = ${0}`}.`,
        t`Squaring can add solutions: a square root is never negative, so the right side ${math`x ${sgn(-k)} ${Math.abs(k)}`} must be at least ${0}. At ${math`x = ${p.s}`} it is ${p.s - k}, so ${p.s} is not a solution.`,
        t`At ${math`x = ${p.r}`}: ${math`\sqrt{${p.r + pp}} = ${p.r - k}`}, which checks. The only solution is ${math`x = ${p.r}`}.`,
      ],
    };
  },
  solve: (p) => {
    const k = rlK(p);
    const pp = rlP(p);
    const ok: number[] = [];
    for (let x = -30; x <= 60; x++) if (x + pp >= 0 && near(Math.sqrt(x + pp), x - k)) ok.push(x);
    return ok.join(', ');
  },
  misconceptions: (p): Misconception[] => [
    { response: String(p.s), why: t`${p.s} solves the squared equation, but not the original: the right side is ${p.s - rlK(p)} there, and a square root is never negative.` },
    { response: String(rlK(p)), why: t`That makes the right side ${0}, but the left side is then ${math`\sqrt{${rlK(p) + rlP(p)}}`}, not ${0}. Square both sides and solve.` },
  ],
});

// ---------------------------------------------------------------- substitute y = sqrt(x)

interface SubP { y1: number; y2: number }
/** x - a sqrt(x) + b = 0 with y = sqrt(x): (y - y1)(y - y2) = 0, y1 > 0 > y2. */
const subAns = ({ y1 }: SubP): number => y1 * y1;

const substituteRoot = generator<SubP>({
  id: 'substitute-root',
  skill: 'Solve an equation in x and sqrt(x) by substituting y = sqrt(x), keeping only y >= 0.',
  quick: true,
  params: (rng) => {
    for (;;) { const p = { y1: int(rng, 2, 9), y2: -int(rng, 1, 9) }; if (p.y1 !== -p.y2) return p; }
  },
  sane: (p) => (p.y1 > 0 && p.y2 < 0 ? null : 'bad roots'),
  problem: (p) => {
    const a = p.y1 + p.y2;
    const b = p.y1 * p.y2;
    return {
      prompt: t`Solve ${computedTex(`x ${a === 0 ? '' : `${sgn(-a)} ${Math.abs(a) === 1 ? '' : Math.abs(a)}\\sqrt{x}`} ${sgn(b)} ${Math.abs(b)} = ${0}`)}.`,
      answer: { kind: 'exact', expected: String(subAns(p)) },
      solution: [
        t`Put ${math`y = \sqrt{x}`}, so ${math`x = y^{${2}}`} and ${math`y \ge ${0}`}: ${math`(y - ${p.y1})(y + ${-p.y2}) = ${0}`}.`,
        t`${math`y = ${p.y2}`} is impossible, since ${math`\sqrt{x} \ge ${0}`}. So ${math`\sqrt{x} = ${p.y1}`} and ${math`x = ${subAns(p)}`}.`,
      ],
    };
  },
  solve: (p) => {
    const a = p.y1 + p.y2;
    const b = p.y1 * p.y2;
    for (let x = 0; x <= 200; x++) if (near(x - a * Math.sqrt(x) + b, 0)) return String(x);
    return 'none';
  },
  misconceptions: (p): Misconception[] => [
    { response: String(p.y1), why: t`${p.y1} is ${math`\sqrt{x}`}, not ${math`x`}: square it.` },
    { response: String(p.y2 * p.y2), why: t`That comes from ${math`\sqrt{x} = ${p.y2}`}, which is impossible: a square root is never negative.` },
  ],
});

// ---------------------------------------------------------------- a difference of roots

interface DrP { a: number; b: number; c: number }
/** sqrt(x + a) - sqrt(x + b) = c: sqrt(x + b) = (a - b - c^2)/(2c), x = that^2 - b. */
const drRoot = ({ a, b, c }: DrP): Rational => q(a - b - c * c, 2 * c);
const drAns = (p: DrP): Rational => sub(mul(drRoot(p), drRoot(p)), q(p.b));

const differenceOfRoots = generator<DrP>({
  id: 'difference-of-roots',
  skill: 'Solve sqrt(x + a) - sqrt(x + b) = c by isolating one root, squaring, and squaring again.',
  params: (rng) => {
    for (;;) {
      const p: DrP = { a: int(rng, 3, 30), b: int(rng, -6, 6), c: pick(rng, [1, 2, 3]) };
      if (p.b === 0 || p.a - p.b - p.c * p.c <= 0) continue;
      if (distinctFrom(str(drAns(p)), [str(drRoot(p)), str(mul(drRoot(p), drRoot(p)))]) >= 2) return p;
    }
  },
  sane: (p) => (toFloat(drRoot(p)) > 0 ? null : 'no solution'),
  problem: (p) => {
    const r = drRoot(p);
    return {
      prompt: t`Solve ${math`\sqrt{x + ${p.a}} - \sqrt{x ${sgn(p.b)} ${Math.abs(p.b)}} = ${p.c}`}.`,
      answer: { kind: 'exact', expected: str(drAns(p)) },
      solution: [
        t`Isolate one root: ${math`\sqrt{x + ${p.a}} = ${p.c} + \sqrt{x ${sgn(p.b)} ${Math.abs(p.b)}}`}. Both sides are positive, so squaring keeps the solutions: ${math`x + ${p.a} = ${p.c * p.c} + ${2 * p.c}\sqrt{x ${sgn(p.b)} ${Math.abs(p.b)}} + x ${sgn(p.b)} ${Math.abs(p.b)}`}.`,
        t`The ${math`x`} terms cancel: ${math`${2 * p.c}\sqrt{x ${sgn(p.b)} ${Math.abs(p.b)}} = ${p.a - p.b - p.c * p.c}`}, so ${math`\sqrt{x ${sgn(p.b)} ${Math.abs(p.b)}} = ${r}`}, which is positive, as a square root must be.`,
        t`Square: ${math`x ${sgn(p.b)} ${Math.abs(p.b)} = ${mul(r, r)}`}, so ${math`x = ${drAns(p)}`}. No root was negative along the way, so nothing extraneous was added, but checking in the original is still the safe habit.`,
      ],
    };
  },
  solve: (p) => {
    // Bisection on the original equation: the left side decreases in x.
    let lo = -p.b;
    let hi = 2000;
    const f = (x: number): number => Math.sqrt(x + p.a) - Math.sqrt(x + p.b) - p.c;
    for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (f(m) > 0) lo = m; else hi = m; }
    const x = (lo + hi) / 2;
    const d = 4 * p.c * p.c;
    return str(q(Math.round(x * d), d));
  },
  misconceptions: (p): Misconception[] => [
    { response: str(drRoot(p)), why: t`That is ${math`\sqrt{x ${sgn(p.b)} ${Math.abs(p.b)}}`}, not ${math`x`}: square it, then ${p.b > 0 ? 'subtract' : 'add'} ${Math.abs(p.b)}.` },
    { response: str(mul(drRoot(p), drRoot(p))), why: t`That is ${math`x ${sgn(p.b)} ${Math.abs(p.b)}`}; ${p.b > 0 ? 'subtract' : 'add'} ${Math.abs(p.b)} to find ${math`x`}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const a11ii = auto({
  id: 'a11-q2-ii',
  source: cite('step-f11', 'Q2(ii)'),
  title: t`Two roots that differ by one`,
  prompt: t`Find the value of ${math`x`} that satisfies ${math`\sqrt{${3}x - ${5}} - \sqrt{x + ${6}} = ${1}`}. (Recall that ${math`\sqrt{x}`} denotes the non-negative root, so ${math`\sqrt{x} \ge ${0}`}.)`,
  answer: { kind: 'exact', expected: '10' },
  solution: [
    t`Isolate a root: ${math`\sqrt{${3}x - ${5}} = ${1} + \sqrt{x + ${6}}`}. Square: ${math`${3}x - ${5} = ${1} + ${2}\sqrt{x + ${6}} + x + ${6}`}, so ${math`${2}x - ${12} = ${2}\sqrt{x + ${6}}`}, that is ${math`x - ${6} = \sqrt{x + ${6}}`}.`,
    t`Square again: ${math`x^{${2}} - ${12}x + ${36} = x + ${6}`}, so ${math`x^{${2}} - ${13}x + ${30} = (x - ${10})(x - ${3}) = ${0}`}.`,
    t`Check in the original: ${math`x = ${10}`} gives ${math`\sqrt{${25}} - \sqrt{${16}} = ${1}`}; ${math`x = ${3}`} gives ${math`\sqrt{${4}} - \sqrt{${9}} = -${1}`}, which fails (it came from squaring ${math`x - ${6} = \sqrt{x + ${6}}`} when ${math`x - ${6} < ${0}`}). So ${math`x = ${10}`}.`,
  ],
  reference: '10',
  verify: () => {
    const ok: number[] = [];
    for (let x = 2; x <= 100; x++) if (near(Math.sqrt(3 * x - 5) - Math.sqrt(x + 6), 1)) ok.push(x);
    return same('integer solutions', ok.join(','), '10');
  },
  misconceptions: [{ response: '3', why: t`${3} solves the squared equation, but in the original ${math`\sqrt{${4}} - \sqrt{${9}} = -${1}`}, not ${1}.` }],
  official: { source: cite('step-f11-hints', 'Q2(ii)'), answer: '10', agrees: true },
});

const a11q3i = auto({
  id: 'a11-q3-i',
  source: cite('step-f11', 'Q3(i) (2013 STEP I Q1)'),
  title: t`A substitution for the root`,
  prompt: t`Use the substitution ${math`\sqrt{x} = y`}, where ${math`y \ge ${0}`}, to find the real root of ${math`x + ${3}\sqrt{x} - \frac{${1}}{${2}} = ${0}`}. (Type a square root as sqrt.)`,
  answer: { kind: 'expression', expected: '(10 - 3sqrt(11))/2', variables: [] },
  solution: [
    t`${math`y^{${2}} + ${3}y - \frac{${1}}{${2}} = ${0}`}, so ${math`y = \frac{-${3} \pm \sqrt{${9} + ${2}}}{${2}} = \frac{-${3} \pm \sqrt{${11}}}{${2}}`}.`,
    t`${math`y \ge ${0}`}, and ${math`\sqrt{${11}} > ${3}`}, so ${math`y = \frac{\sqrt{${11}} - ${3}}{${2}}`}; the other root is negative.`,
    t`${math`x = y^{${2}} = \frac{${11} - ${6}\sqrt{${11}} + ${9}}{${4}} = \frac{${10} - ${3}\sqrt{${11}}}{${2}}`}.`,
  ],
  reference: '(10 - 3sqrt(11))/2',
  verify: () => { const x = (10 - 3 * Math.sqrt(11)) / 2; return x > 0 && near(x + 3 * Math.sqrt(x), 0.5) ? null : 'does not satisfy the equation'; },
  misconceptions: [{ response: '(sqrt(11) - 3)/2', why: t`That is ${math`y = \sqrt{x}`}. Square it to get ${math`x`}.` }],
  official: { source: cite('step-f11-hints', 'Q3(i)'), answer: '((sqrt(11) - 3)/2)^2', agrees: true },
});

const a11q3iia = auto({
  id: 'a11-q3-ii-a',
  source: cite('step-f11', 'Q3(ii)(a) (2013 STEP I Q1)'),
  title: t`A root of ${math`x + ${2}`}`,
  prompt: t`Find all real roots of ${math`x + ${10}\sqrt{x + ${2}} - ${22} = ${0}`}.`,
  answer: { kind: 'exact', expected: '2' },
  solution: [
    t`Put ${math`y = \sqrt{x + ${2}}`}, so ${math`x = y^{${2}} - ${2}`} and ${math`y \ge ${0}`}: ${math`y^{${2}} + ${10}y - ${24} = (y + ${12})(y - ${2}) = ${0}`}.`,
    t`${math`y = -${12}`} is impossible, so ${math`y = ${2}`} and ${math`x = ${4} - ${2} = ${2}`}. Check: ${math`${2} + ${10} \times ${2} - ${22} = ${0}`}.`,
  ],
  reference: '2',
  verify: () => (near(2 + 10 * Math.sqrt(4) - 22, 0) ? null : 'x = 2 fails'),
  misconceptions: [{ response: '142', why: t`${math`y = -${12}`} would give ${math`x = ${142}`}, but ${math`\sqrt{x + ${2}}`} cannot be negative: check ${math`${142} + ${10} \times ${12} - ${22} \ne ${0}`}.` }],
});

const a11q3iib = auto({
  id: 'a11-q3-ii-b',
  source: cite('step-f11', 'Q3(ii)(b) (2013 STEP I Q1)'),
  title: t`A root of a quadratic expression`,
  prompt: t`Find all real roots of ${math`x^{${2}} - ${4}x + \sqrt{${2}x^{${2}} - ${8}x - ${3}} - ${9} = ${0}`}, and give the larger. (Type a square root as sqrt.)`,
  answer: { kind: 'expression', expected: '2 + sqrt(10)', variables: [] },
  solution: [
    t`Put ${math`y = \sqrt{${2}x^{${2}} - ${8}x - ${3}}`}, so ${math`x^{${2}} - ${4}x = \frac{y^{${2}} + ${3}}{${2}}`}. The equation becomes ${math`\frac{y^{${2}} + ${3}}{${2}} + y - ${9} = ${0}`}, that is ${math`y^{${2}} + ${2}y - ${15} = (y + ${5})(y - ${3}) = ${0}`}.`,
    t`${math`y \ge ${0}`}, so ${math`y = ${3}`}: ${math`${2}x^{${2}} - ${8}x - ${3} = ${9}`}, so ${math`x^{${2}} - ${4}x - ${6} = ${0}`} and ${math`x = ${2} \pm \sqrt{${10}}`}.`,
    t`Both check: there ${math`x^{${2}} - ${4}x = ${6}`} and the root is ${3}, so ${math`${6} + ${3} - ${9} = ${0}`}. The larger is ${math`${2} + \sqrt{${10}}`}.`,
  ],
  reference: '2 + sqrt(10)',
  verify: () => {
    const f = (x: number): number => x * x - 4 * x + Math.sqrt(2 * x * x - 8 * x - 3) - 9;
    return near(f(2 + Math.sqrt(10)), 0) && near(f(2 - Math.sqrt(10)), 0) ? null : 'a root fails';
  },
  misconceptions: [{ response: '2 - sqrt(10)', why: t`That is also a root, but the smaller one.` }],
});

const step2013 = supervision({
  id: 'a11-q3',
  source: cite('step-f11', 'Q3 (2013 STEP I Q1)'),
  title: t`Three equations with square roots`,
  prompt: t`(i) Use the substitution ${math`\sqrt{x} = y`} (where ${math`y \ge ${0}`}) to find the real root of ${math`x + ${3}\sqrt{x} - \frac{${1}}{${2}} = ${0}`}. (ii) Find all real roots of the following equations: (a) ${math`x + ${10}\sqrt{x + ${2}} - ${22} = ${0}`}; (b) ${math`x^{${2}} - ${4}x + \sqrt{${2}x^{${2}} - ${8}x - ${3}} - ${9} = ${0}`}.`,
  writeUp: 'proof',
  official: cite('step-f11-hints', 'Q3'),
});

// ---------------------------------------------------------------- lesson

export const surdEquations: TopicContent = {
  topicId: 'alg.surd-equations',
  goal: t`Solve equations with square roots by substituting for the root or squaring, then check for solutions that squaring introduced.`,
  objective: t`Solve equations with square roots, and reject the false solutions squaring creates.`,
  why: t`STEP marks the check: a false root left in loses marks even when the algebra is right.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`The idea` },
    { kind: 'hook', text: t`Solve ${math`x + ${1} = ${2}`}. Easy: ${math`x = ${1}`}. Now do something silly: square both sides first. You get ${math`(x + ${1})^{${2}} = ${4}`}, with solutions ${math`x = ${1}`} and ${math`x = -${3}`}. Where did ${math`-${3}`} come from?` },
    { kind: 'narrative', text: t`Squaring cannot tell ${2} from ${math`-${2}`}: ${math`x = -${3}`} makes ${math`x + ${1} = -${2}`}, whose square is ${4} too. With square roots you usually must square to make progress, so you must also check every answer in the original equation.` },
    { kind: 'section', title: t`Why squaring adds solutions` },
    { kind: 'theorem', name: t`Squaring an equation`, statement: t`For real ${math`A`} and ${math`B`}: if ${math`A = B`} then ${math`A^{${2}} = B^{${2}}`}. Conversely, ${math`A^{${2}} = B^{${2}}`} implies ${math`A = B`} or ${math`A = -B`}; it implies ${math`A = B`} when ${math`A`} and ${math`B`} are both non-negative.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Forwards`, text: t`Squaring equal numbers gives equal numbers.` },
        { label: t`Backwards`, text: t`${math`A^{${2}} - B^{${2}} = (A - B)(A + B) = ${0}`}, so ${math`A = B`} or ${math`A = -B`}.` },
        { label: t`Both non-negative`, text: t`If also ${math`A, B \ge ${0}`} and ${math`A = -B`}, then ${math`A = B = ${0}`}; so in every case ${math`A = B`}.` },
      ],
    },
    {
      kind: 'definition',
      name: t`Extraneous solution`,
      formal: t`An [[extraneous-solution|extraneous solution]] is a solution of an equation obtained by a non-reversible step, such as squaring, that does not satisfy the original equation.`,
      plain: t`A false answer that the method created. In ${math`\sqrt{x + ${6}} = x`}, squaring gives ${math`x + ${6} = x^{${2}}`}, so ${math`(x - ${3})(x + ${2}) = ${0}`} and ${math`x = ${3}`} or ${math`x = -${2}`}; ${math`-${2}`} is extraneous, because ${math`\sqrt{${4}} = ${2} \ne -${2}`}.`,
    },
    checkFrom(rootLinear, { r: 7, s: 2 }, t`Squaring gives ${math`(x - ${7})(x - ${2}) = ${0}`}; at ${math`x = ${2}`} the right side is negative, so only ${math`x = ${7}`} works.`),
    { kind: 'pitfall', claim: t`${math`(\sqrt{A} - \sqrt{B})^{${2}} = A - B`}.`, counterexample: t`${math`(\sqrt{${9}} - \sqrt{${4}})^{${2}} = ${1}`}, but ${math`${9} - ${4} = ${5}`}. The square has a cross term: ${math`A - ${2}\sqrt{AB} + B`}. Isolate one root before squaring.` },
    { kind: 'section', title: t`Substituting for the root` },
    { kind: 'narrative', text: t`Often a cleaner route is to name the root. In ${math`x + \sqrt{x} - ${6} = ${0}`}, put ${math`y = \sqrt{x}`}: then ${math`x = y^{${2}}`}, and the equation is the quadratic ${math`y^{${2}} + y - ${6} = (y + ${3})(y - ${2}) = ${0}`}. The condition ${math`y \ge ${0}`} throws away ${math`y = -${3}`} at once, leaving ${math`y = ${2}`}, so ${math`x = ${4}`}. The same works for the root of any expression, such as ${math`\sqrt{x + ${5}}`}: substitute for the whole root.` },
    checkFrom(substituteRoot, { y1: 3, y2: -2 }, t`${math`(y - ${3})(y + ${2}) = ${0}`} with ${math`y \ge ${0}`} gives ${math`y = ${3}`}, so ${math`x = ${9}`}.`),
    { kind: 'takeaway', text: t`Substitute for a root, or isolate it and square; a root is never negative, and every answer reached by squaring must be checked in the original equation.` },
  ],
  examples: [
    withExaminer(workedCambridge(a11ii), t`One root isolated before each squaring, both candidates found, and the false one rejected by substituting into the original equation.`),
    worked(differenceOfRoots, { a: 13, b: -2, c: 1 }, t`Squaring twice`),
    worked(rootLinear, { r: 5, s: -2 }, t`A root equal to a linear expression`),
  ],
  generators: [rootLinear, substituteRoot, differenceOfRoots],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['extraneous-solution'],
  cambridge: withUses([a11q3i, a11q3iia, a11q3iib, step2013], {
    'a11-q3': { sections: ['Why squaring adds solutions', 'Substituting for the root'], note: t`Substituting for a root and rejecting false solutions` },
    'a11-q3-ii-b': { sections: ['Substituting for the root'], note: t`Substituting for a root of a quadratic expression` },
    'a11-q3-i': { sections: ['Substituting for the root'], note: t`Substituting for a square root` },
  }),
  gate: ['a11-q3', 'a11-q3-ii-b', 'a11-q3-i'],
  recall: [
    { front: t`Why must you check answers after squaring?`, back: t`${math`A^{${2}} = B^{${2}}`} only gives ${math`A = \pm B`}, so squaring can add solutions of ${math`A = -B`}.` },
    { front: t`What does ${math`\sqrt{x}`} mean, and why does it matter here?`, back: t`The non-negative root; so a substitution ${math`y = \sqrt{x}`} needs ${math`y \ge ${0}`}.` },
  ],
  proofOrder: [{
    title: t`Equal squares and non-negative numbers`,
    steps: [
      t`Suppose ${math`A^{${2}} = B^{${2}}`} with ${math`A, B \ge ${0}`}.`,
      t`Then ${math`(A - B)(A + B) = ${0}`}.`,
      t`If ${math`A + B = ${0}`}, both are ${0}, so ${math`A = B`}.`,
      t`Otherwise ${math`A - B = ${0}`}. Either way ${math`A = B`}.`,
    ],
  }],
};
