/**
 * ineq.linear-quadratic: solve linear inequalities, and quadratic ones from the sign of
 * a(x - α)(x - β), never multiplying by a quantity of unknown sign. Sources: STEP Support
 * Foundation Assignment 1 Q2(iii) and Q3 (2005 STEP I Q3), Assignment 4 Q2(i), Assignment
 * 22 Q3(i), and the NST Maths Workbook A5. Every solution set is found twice: by the
 * factor argument in the worked solution, and by a sign test at and between the critical
 * values (prep-a.ts, setWhere).
 */
import { auto, cite, same, supervision } from '../cambridge';
import { add, int, mul, pick, q, sub, type Rational } from '../math';
import { generator } from '../problem';
import { computedMath, math, t, type Rich } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';
import { poly } from '../poly';
import { closed, evalPoly, open, optionFor, realSetSpan, sameSet, setChoice, setWhere, withExaminer, type RealSet, type WrongSet } from '../prep-a';

type Op = '<' | '>' | '<=' | '>=';
const OPS: readonly Op[] = ['<', '>', '<=', '>='];
const OP_TEX: Readonly<Record<Op, string>> = { '<': '<', '>': '>', '<=': '\\le', '>=': '\\ge' };
const holds = (v: Rational, op: Op): boolean => {
  const s = v.num === 0n ? 0 : v.num > 0n ? 1 : -1;
  return op === '<' ? s < 0 : op === '>' ? s > 0 : op === '<=' ? s <= 0 : s >= 0;
};
const flip = (op: Op): Op => ({ '<': '>', '>': '<', '<=': '>=', '>=': '<=' } as const)[op];
const loosen = (op: Op): Op => ({ '<': '<=', '>': '>=', '<=': '<', '>=': '>' } as const)[op];
/** The set x op k, as intervals. */
const ray = (op: Op, k: Rational): RealSet => (op === '<' ? [open(null, k)] : op === '<=' ? [closed(null, k)] : op === '>' ? [open(k, null)] : [closed(k, null)]);

// ---------------------------------------------------------------- linear

interface LinP { a: number; b: number; c: number; d: number; op: Op }
/** ax + b op cx + d, so (a - c)x op d - b. */
const linK = ({ a, b, c, d }: LinP): Rational => q(d - b, a - c);
const linRight = (p: LinP): RealSet => ray(p.a - p.c > 0 ? p.op : flip(p.op), linK(p));

const linear = generator<LinP>({
  id: 'linear',
  skill: 'Solve a linear inequality, reversing the sign when you divide by a negative number.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const p: LinP = { a: int(rng, -6, 6), b: int(rng, -9, 9), c: int(rng, -6, 6), d: int(rng, -9, 9), op: pick(rng, OPS) };
      if (p.a === p.c || p.a === 0 || p.d === p.b || p.b + p.d === 0) continue;
      // Half of them divide by a negative.
      return p;
    }
  },
  sane: (p) => (p.a !== p.c ? null : 'no x term'),
  problem: (p) => {
    const m = p.a - p.c;
    const k = linK(p);
    const { answer, misconceptions } = setChoice(linRight(p), linWrong(p));
    return {
      prompt: t`Solve ${computedMath(`${poly([p.a, p.b])}`)}${math` ${OP_TEX[p.op]} `}${computedMath(poly([p.c, p.d]))}.`,
      answer,
      solution: [
        t`Subtract ${computedMath(poly([p.c, p.b]))} from both sides: adding or subtracting the same number keeps the inequality, so ${computedMath(poly([m, 0]))}${math` ${OP_TEX[p.op]} ${p.d - p.b}`}.`,
        m > 0
          ? t`Divide by ${m}, which is positive, so the sign stays: ${realSetSpan(linRight(p))}.`
          : t`Divide by ${m}, which is negative, so the sign reverses: ${realSetSpan(linRight(p))}.`,
        t`Check with a number: ${math`x = ${add(k, q(m > 0 ? 1 : -1) )}`} ${holds(sub(evalPoly([p.a - p.c, p.b - p.d], add(k, q(m > 0 ? 1 : -1))), q(0)), p.op) ? 'satisfies' : 'does not satisfy'} the inequality, as the answer says.`,
      ],
    };
  },
  solve: (p) => {
    const { ids } = setChoice(linRight(p), linWrong(p));
    const k = linK(p);
    return [optionFor(ids, setWhere((x) => holds(evalPoly([p.a - p.c, p.b - p.d], x), p.op), [k]))];
  },
  misconceptions: (p) => setChoice(linRight(p), linWrong(p)).misconceptions,
});

function linWrong(p: LinP): WrongSet[] {
  const m = p.a - p.c;
  const k = linK(p);
  const right = m > 0 ? p.op : flip(p.op);
  return [
    { set: ray(flip(right), k), why: m < 0 ? t`Dividing by a negative number reverses the inequality: ${math`-${2} < ${1}`} but ${math`${2} > -${1}`}.` : t`The sign reverses only when you multiply or divide by a negative number. Here you divide by ${m}, which is positive.` },
    { set: ray(right, q(p.d + p.b, m)), why: t`Moving ${math`${p.b}`} across means subtracting it from both sides, so the right side is ${math`${p.d} - (${p.b})`}.` },
    { set: ray(loosen(right), k), why: t`Keep the kind of inequality: a strict one (${math`<`} or ${math`>`}) stays strict, and one with equality allowed stays that way.` },
  ];
}

// ---------------------------------------------------------------- quadratic

interface QuadP { lead: number; r: number; s: number; op: Op }
const qCoeffs = ({ lead, r, s }: QuadP): number[] => [lead, -lead * (r + s), lead * r * s];
const qRight = (p: QuadP): RealSet => setWhere((x) => holds(evalPoly(qCoeffs(p), x), p.op), [q(p.r), q(p.s)]);
const outside = (lo: number, hi: number, inc: boolean): RealSet => (inc ? [closed(null, q(lo)), closed(q(hi), null)] : [open(null, q(lo)), open(q(hi), null)]);
const between = (lo: number, hi: number, inc: boolean): RealSet => [inc ? closed(q(lo), q(hi)) : open(q(lo), q(hi))];

function qWrong(p: QuadP): WrongSet[] {
  const lo = Math.min(p.r, p.s);
  const hi = Math.max(p.r, p.s);
  const inc = p.op === '<=' || p.op === '>=';
  const right = qRight(p);
  const isBetween = right.length === 1;
  return [
    { set: isBetween ? outside(lo, hi, inc) : between(lo, hi, inc), why: p.lead < 0 ? t`The ${math`x^{${2}}`} term is negative, so the parabola opens downwards: it is above the axis between the roots, not outside them.` : t`The parabola opens upwards, so it is below the axis between the roots and above it outside them. Sketch it.` },
    { set: isBetween ? between(-hi, -lo, inc) : outside(-hi, -lo, inc), why: t`The roots have the opposite signs to the numbers in the factors: ${math`x - ${hi}`} is ${0} at ${math`x = ${hi}`}.` },
    { set: isBetween ? between(lo, hi, !inc) : outside(lo, hi, !inc), why: t`The ends are included exactly when the inequality allows equality: at a root the quadratic is ${0}.` },
  ];
}

const quadratic = generator<QuadP>({
  id: 'quadratic',
  skill: 'Solve a quadratic inequality from its factors and a sketch of the parabola.',
  params: (rng) => {
    for (;;) {
      const p: QuadP = { lead: pick(rng, [1, 1, 1, -1, 2]), r: int(rng, -7, 7), s: int(rng, -7, 7), op: pick(rng, OPS) };
      if (p.r === p.s || p.r === -p.s) continue;
      return p;
    }
  },
  sane: (p) => (p.r !== p.s ? null : 'repeated root'),
  problem: (p) => {
    const lo = Math.min(p.r, p.s);
    const hi = Math.max(p.r, p.s);
    const { answer } = setChoice(qRight(p), qWrong(p));
    const fac = `${p.lead === 1 ? '' : p.lead === -1 ? '-' : p.lead}(x ${lo < 0 ? '+' : '-'} ${Math.abs(lo)})(x ${hi < 0 ? '+' : '-'} ${Math.abs(hi)})`;
    const up = p.lead > 0;
    return {
      prompt: t`Solve ${computedMath(poly(qCoeffs(p)))}${math` ${OP_TEX[p.op]} ${0}`}.`,
      answer,
      solution: [
        t`Factorise: ${computedMath(`${poly(qCoeffs(p))} = ${fac.replace(/\(x - 0\)/g, 'x').replace(/\(x \+ 0\)/g, 'x')}`)}, so the roots are ${math`x = ${lo}`} and ${math`x = ${hi}`}.`,
        t`The ${math`x^{${2}}`} coefficient is ${up ? 'positive, so the parabola opens upwards: it is below the axis between the roots and above it outside them' : 'negative, so the parabola opens downwards: it is above the axis between the roots and below it outside them'}.`,
        t`So the solution is ${realSetSpan(qRight(p))}${p.op === '<=' || p.op === '>=' ? t`, the roots included because equality is allowed` : t`, the roots left out because the inequality is strict`}.`,
      ],
    };
  },
  solve: (p) => {
    // A sign test at many sample points, independent of the factor argument.
    const { ids } = setChoice(qRight(p), qWrong(p));
    const roots = [q(p.r), q(p.s)];
    return [optionFor(ids, setWhere((x) => holds(evalPoly(qCoeffs(p), x), p.op), roots))];
  },
  misconceptions: (p) => setChoice(qRight(p), qWrong(p)).misconceptions,
});

// ---------------------------------------------------------------- no real roots

interface NrP { a: number; b: number }
/** a x^2 + b k x + k = 0 has no real roots when b^2 k^2 - 4ak < 0, that is 0 < k < 4a/b^2. */
const nrEnd = ({ a, b }: NrP): Rational => q(4 * a, b * b);
const nrRight = (p: NrP): RealSet => [open(q(0), nrEnd(p))];
const nrWrong = (p: NrP): WrongSet[] => [
  { set: [open(null, q(0)), open(nrEnd(p), null)], why: t`That is where the discriminant is positive: two real roots. No real roots needs the discriminant negative.` },
  { set: [open(null, nrEnd(p))], why: t`Dividing ${math`k(${p.b * p.b}k - ${4 * p.a}) < ${0}`} by ${math`k`} assumes ${math`k > ${0}`}. Never divide by something whose sign you do not know: use the sign of the product instead.` },
  { set: [closed(q(0), nrEnd(p))], why: t`At ${math`k = ${0}`} the equation is ${math`${p.a}x^{${2}} = ${0}`}, which has the root ${0}. The discriminant must be strictly negative.` },
];

const noRealRoots = generator<NrP>({
  id: 'no-real-roots',
  skill: 'Find the parameter values that make a discriminant negative, solving the quadratic inequality in the parameter.',
  params: (rng) => ({ a: int(rng, 1, 9), b: pick(rng, [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6]) }),
  sane: ({ a, b }) => (a >= 1 && b !== 0 ? null : 'out of range'),
  problem: (p) => {
    const { answer } = setChoice(nrRight(p), nrWrong(p), 'k');
    const eqn = computedMath(`${p.a === 1 ? '' : p.a}x^${2} ${p.b < 0 ? '-' : '+'} ${Math.abs(p.b) === 1 ? '' : Math.abs(p.b)}kx + k = ${0}`);
    return {
      prompt: t`For which real ${math`k`} does ${eqn} have no real roots?`,
      answer,
      solution: [
        t`No real roots means the discriminant is negative: ${math`(${p.b}k)^{${2}} - ${4} \times ${p.a} \times k < ${0}`}, that is ${computedMath(`${p.b * p.b}k^${2} - ${4 * p.a}k < ${0}`)}.`,
        t`Factorise: ${math`k(${p.b * p.b}k - ${4 * p.a}) < ${0}`}. The parabola in ${math`k`} opens upwards with roots ${0} and ${nrEnd(p)}, so it is negative strictly between them.`,
        t`So ${realSetSpan(nrRight(p), 'k')}.`,
      ],
    };
  },
  solve: (p) => {
    const { ids } = setChoice(nrRight(p), nrWrong(p), 'k');
    const disc = (k: Rational): Rational => sub(mul(q(p.b * p.b), mul(k, k)), mul(q(4 * p.a), k));
    return [optionFor(ids, setWhere((k) => holds(disc(k), '<'), [q(0), nrEnd(p)]), 'k')];
  },
  misconceptions: (p) => setChoice(nrRight(p), nrWrong(p), 'k').misconceptions,
});

// ---------------------------------------------------------------- Cambridge problems

/** An auto problem whose answer is a solution set, checked by the sign test. */
function setProblem(spec: { id: string; source: ReturnType<typeof cite>; title: Rich; prompt: Rich; right: RealSet; wrong: WrongSet[]; v?: string; solution: Rich[]; test: (x: Rational) => boolean; critical: Rational[] }) {
  const v = spec.v ?? 'x';
  const ch = setChoice(spec.right, spec.wrong, v);
  return auto({
    id: spec.id, source: spec.source, title: spec.title, prompt: spec.prompt, answer: ch.answer, solution: spec.solution, reference: ch.reference,
    verify: () => same('the solution set by the sign test', sameSet(setWhere(spec.test, spec.critical), spec.right), true),
    misconceptions: ch.misconceptions,
  });
}

const C1225 = q(12, 25);
const a1q2iii = setProblem({
  id: 'a1-q2-iii',
  source: cite('step-f01', 'Q2(iii)'),
  title: t`A parameter with no real roots`,
  prompt: t`Find the range of real values of ${math`c`} for which ${math`${3}x^{${2}} + ${5}cx + c = ${0}`} has no real roots.`,
  v: 'c',
  right: [open(q(0), C1225)],
  wrong: [
    { set: [open(null, q(0)), open(C1225, null)], why: t`There the discriminant is positive, giving two real roots.` },
    { set: [open(null, C1225)], why: t`Dividing ${math`c(${25}c - ${12}) < ${0}`} by ${math`c`} assumes ${math`c > ${0}`}. Use the sign of the product.` },
  ],
  solution: [
    t`No real roots: the discriminant ${math`B^{${2}} - ${4}AC`} is negative, with ${math`A = ${3}`}, ${math`B = ${5}c`}, ${math`C = c`}: ${math`${25}c^{${2}} - ${12}c < ${0}`}.`,
    t`${math`c(${25}c - ${12}) < ${0}`}: an upward parabola in ${math`c`} with roots ${0} and ${C1225}, negative between them. So ${math`${0} < c < ${C1225}`}.`,
  ],
  test: (c) => holds(sub(mul(q(25), mul(c, c)), mul(q(12), c)), '<'),
  critical: [q(0), C1225],
});

const a4q2i = setProblem({
  id: 'a4-q2-i',
  source: cite('step-f04', 'Q2(i)'),
  title: t`Where a quadratic is positive`,
  prompt: t`Factorise ${math`x^{${2}} - ${3}x - ${4}`}, sketch ${math`y = x^{${2}} - ${3}x - ${4}`}, and hence find the values of ${math`x`} for which ${math`x^{${2}} - ${3}x - ${4} > ${0}`}.`,
  right: [open(null, q(-1)), open(q(4), null)],
  wrong: [
    { set: [open(q(-1), q(4))], why: t`Between the roots the upward parabola is below the axis: that is where it is negative.` },
    { set: [open(null, q(-4)), open(q(1), null)], why: t`${math`(x + ${1})(x - ${4})`} is ${0} at ${math`x = -${1}`} and ${math`x = ${4}`}: the roots have the opposite signs to the numbers in the brackets.` },
  ],
  solution: [
    t`${math`x^{${2}} - ${3}x - ${4} = (x + ${1})(x - ${4})`}, with roots ${math`-${1}`} and ${4}.`,
    t`The parabola opens upwards, so it is above the axis outside the roots: ${math`x < -${1}`} or ${math`x > ${4}`}.`,
  ],
  test: (x) => holds(evalPoly([1, -3, -4], x), '>'),
  critical: [q(-1), q(4)],
});

const TWO3 = q(2, 3);
const a22q3i = setProblem({
  id: 'a22-q3-i',
  source: cite('step-f22', 'Q3(i)'),
  title: t`A quadratic with a fractional root`,
  prompt: t`Find the range of values of ${math`x`} for which ${math`${3}x^{${2}} + x - ${2} < ${0}`}.`,
  right: [open(q(-1), TWO3)],
  wrong: [
    { set: [open(null, q(-1)), open(TWO3, null)], why: t`Outside the roots the upward parabola is positive. You want where it is negative.` },
    { set: [open(q(-2, 3), q(1))], why: t`${math`(${3}x - ${2})(x + ${1}) = ${0}`} at ${math`x = ${TWO3}`} and ${math`x = -${1}`}.` },
    { set: [closed(q(-1), TWO3)], why: t`The inequality is strict, so the roots, where the quadratic is ${0}, are left out.` },
  ],
  solution: [
    t`${math`${3}x^{${2}} + x - ${2} = (${3}x - ${2})(x + ${1})`}, with roots ${math`-${1}`} and ${TWO3}.`,
    t`The ${math`x^{${2}}`} coefficient is positive, so the quadratic is negative strictly between the roots: ${math`-${1} < x < ${TWO3}`}.`,
  ],
  test: (x) => holds(evalPoly([3, 1, -2], x), '<'),
  critical: [q(-1), TWO3],
});

const nstA5 = setProblem({
  id: 'nst-a5-i',
  source: cite('nst-workbook', 'Algebra, A5(i)'),
  title: t`Move everything to one side first`,
  prompt: t`Find the values of ${math`x`} which satisfy ${math`x^{${2}} - ${3}x < ${4}`}.`,
  right: [open(q(-1), q(4))],
  wrong: [
    { set: [open(null, q(-1)), open(q(4), null)], why: t`After moving the ${4} across, ${math`(x + ${1})(x - ${4}) < ${0}`}: negative between the roots.` },
    { set: [open(q(0), q(3))], why: t`${math`x(x - ${3}) < ${4}`} does not mean each factor is less than ${4} or anything like it. Only a comparison with ${0} can be read off the factors.` },
  ],
  solution: [
    t`Subtract ${4} from both sides: ${math`x^{${2}} - ${3}x - ${4} < ${0}`}, that is ${math`(x + ${1})(x - ${4}) < ${0}`}.`,
    t`The upward parabola is negative between its roots: ${math`-${1} < x < ${4}`}.`,
  ],
  test: (x) => holds(sub(evalPoly([1, -3, 0], x), q(4)), '<'),
  critical: [q(-1), q(4), q(0), q(3)],
});

const step2005 = supervision({
  id: 'a1-q3',
  source: cite('step-f01', 'Q3 (2005 STEP I Q3)'),
  title: t`Two fractions equal to one`,
  prompt: t`In this question ${math`a`} and ${math`b`} are distinct, non-zero real numbers, and ${math`c`} is a real number. (i) Show that, if ${math`a`} and ${math`b`} are either both positive or both negative, then the equation ${math`\frac{x}{x - a} + \frac{x}{x - b} = ${1}`} has two distinct real solutions. (ii) Show that, if ${math`c \ne ${1}`}, the equation ${math`\frac{x}{x - a} + \frac{x}{x - b} = ${1} + c`} has exactly one real solution if ${math`c^{${2}} = -\frac{${4}ab}{(a - b)^{${2}}}`}. Show that this condition can be written ${math`c^{${2}} = ${1} - \left(\frac{a + b}{a - b}\right)^{${2}}`}, and deduce that it can only hold if ${math`${0} < c^{${2}} \le ${1}`}.`,
  writeUp: 'proof',
  official: cite('step-f01-hints', 'Q3'),
});

// ---------------------------------------------------------------- lesson

const LIN_EX: LinP = { a: 2, b: 5, c: 5, d: -1, op: '<' };
const Q_EX: QuadP = { lead: 1, r: -2, s: 5, op: '<=' };

export const linearQuadraticInequalities: TopicContent = {
  topicId: 'ineq.linear-quadratic',
  goal: t`Solve linear and quadratic inequalities, reading a quadratic one from the sketch of ${math`y = a(x - \alpha)(x - \beta)`}, and never multiplying by a quantity whose sign you do not know.`,
  objective: t`Solve linear and quadratic inequalities, and find when a quadratic has no real roots.`,
  why: t`STEP inequalities are where careless sign changes lose marks; this is the safe method.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`The idea` },
    { kind: 'hook', text: t`Solve ${math`x^{${2}} - ${3}x - ${4} = ${0}`} and you get two numbers, ${math`-${1}`} and ${4}. Now solve ${math`x^{${2}} - ${3}x - ${4} > ${0}`}. The answer is not two numbers at all: it is two whole stretches of the number line. Which stretches, and how do you know?` },
    { kind: 'narrative', text: t`An inequality asks a yes or no question about every real number at once. So its answer is a set. The good news: the equation still does most of the work. Its roots are the only places where the answer can switch from yes to no.` },
    { kind: 'section', title: t`The rules for inequalities` },
    {
      kind: 'definition',
      name: t`Inequality and solution set`,
      formal: t`An [[inequality|inequality]] in ${math`x`} is a statement ${math`f(x) < g(x)`}, or the same with ${math`>`}, ${math`\le`}, or ${math`\ge`}. Its solution set is ${math`\{x \in \mathbb{R} : f(x) < g(x)\}`}.`,
      plain: t`The solution set is every real number that makes the statement true. For ${math`${2}x < ${6}`} it is every ${math`x < ${3}`}: ${math`x = ${2}`} works, ${math`x = ${4}`} does not.`,
    },
    { kind: 'theorem', name: t`Operations on inequalities`, statement: t`Let ${math`a < b`}. Then ${math`a + c < b + c`} for every real ${math`c`}; ${math`ca < cb`} if ${math`c > ${0}`}; and ${math`ca > cb`} if ${math`c < ${0}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Restate with a difference`, text: t`${math`a < b`} means ${math`b - a > ${0}`}.`, plain: t`Every comparison is a question about the sign of a difference.` },
        { label: t`Adding`, text: t`${math`(b + c) - (a + c) = b - a > ${0}`}, so ${math`a + c < b + c`}.` },
        { label: t`A positive multiplier`, text: t`If ${math`c > ${0}`}: ${math`cb - ca = c(b - a) > ${0}`}, a product of two positive numbers, so ${math`ca < cb`}.` },
        { label: t`A negative multiplier`, text: t`If ${math`c < ${0}`}: ${math`ca - cb = (-c)(b - a) > ${0}`}, since ${math`-c > ${0}`}, so ${math`ca > cb`}.`, plain: t`Multiplying by a negative swaps which side is bigger: ${math`${2} < ${3}`} but ${math`-${2} > -${3}`}.` },
      ],
    },
    checkFrom(linear, LIN_EX, t`${math`${2}x + ${5} < ${5}x - ${1}`} gives ${math`-${3}x < -${6}`}; dividing by ${math`-${3}`} reverses the sign, so ${math`x > ${2}`}.`),
    { kind: 'pitfall', claim: t`${math`\frac{${1}}{x} < ${1}`} means ${math`x > ${1}`} (multiply both sides by ${math`x`}).`, counterexample: t`${math`x = -${1}`} satisfies ${math`\frac{${1}}{x} = -${1} < ${1}`}, but it is not more than ${1}. Multiplying by ${math`x`} is only safe when you know ${math`x > ${0}`}; here ${math`x`} could be negative.` },
    { kind: 'section', title: t`Quadratic inequalities` },
    { kind: 'narrative', text: t`Picture ${math`y = (x + ${1})(x - ${4})`}. It is a parabola opening upwards, crossing the axis at ${math`-${1}`} and ${4}. Between the crossings it dips below the axis; outside them it is above. That picture is the whole method, and the theorem below says why it is right without the picture.` },
    {
      kind: 'definition',
      name: t`Critical values`,
      formal: t`The [[critical-value|critical values]] of an inequality ${math`f(x) > ${0}`} are the real ${math`x`} where ${math`f(x) = ${0}`} or ${math`f`} is undefined.`,
      plain: t`They are the only places the sign of ${math`f`} can change. For ${math`(x + ${1})(x - ${4})`} they are ${math`-${1}`} and ${4}.`,
    },
    { kind: 'theorem', name: t`Sign of a quadratic`, statement: t`Let ${math`a > ${0}`} and ${math`\alpha < \beta`}. Then ${math`a(x - \alpha)(x - \beta) < ${0}`} exactly when ${math`\alpha < x < \beta`}, and ${math`a(x - \alpha)(x - \beta) > ${0}`} exactly when ${math`x < \alpha`} or ${math`x > \beta`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Left of both roots`, text: t`If ${math`x < \alpha`}, then ${math`x - \alpha < ${0}`} and ${math`x - \beta < ${0}`}, so the product of the two brackets is positive.`, why: { q: t`Why is ${math`x - \beta`} negative too?`, a: t`${math`x < \alpha < \beta`}, so ${math`x`} is less than ${math`\beta`} as well.` } },
        { label: t`Between the roots`, text: t`If ${math`\alpha < x < \beta`}, then ${math`x - \alpha > ${0}`} and ${math`x - \beta < ${0}`}, so the product is negative.` },
        { label: t`Right of both roots`, text: t`If ${math`x > \beta`}, both brackets are positive, so the product is positive.` },
        { label: t`Multiply by a`, text: t`Multiplying by ${math`a > ${0}`} keeps every sign, by the operations theorem. At ${math`x = \alpha`} and ${math`x = \beta`} the value is ${0}, which is neither.`, plain: t`So the three cases cover every ${math`x`}, and each gives the stated sign.` },
      ],
    },
    { kind: 'narrative', text: t`If ${math`a < ${0}`}, multiply the inequality by ${math`-${1}`} first, reversing it, so that the ${math`x^{${2}}`} coefficient is positive. Then use the theorem. With ${math`\le`} or ${math`\ge`}, add the roots themselves, where the value is ${0}.` },
    checkFrom(quadratic, Q_EX, t`${math`(x + ${2})(x - ${5}) \le ${0}`}: the upward parabola is below the axis between the roots, and ${0} at them, so ${math`-${2} \le x \le ${5}`}.`),
    { kind: 'section', title: t`When a quadratic has no real roots` },
    { kind: 'narrative', text: t`A question you will meet constantly: for which values of a parameter does a quadratic have no real roots? The quadratic formula says real roots exist exactly when the discriminant ${math`B^{${2}} - ${4}AC \ge ${0}`}. So "no real roots" is the inequality ${math`B^{${2}} - ${4}AC < ${0}`}, and when the coefficients involve the parameter, that is a quadratic inequality in the parameter.` },
    { kind: 'pitfall', claim: t`From ${math`c(${25}c - ${12}) < ${0}`}, divide by ${math`c`} to get ${math`${25}c - ${12} < ${0}`}, so ${math`c < ${C1225}`}.`, counterexample: t`${math`c = -${1}`} satisfies ${math`c < ${C1225}`}, but ${math`(-${1})(-${37}) = ${37}`}, which is positive. Dividing by ${math`c`} silently assumed ${math`c > ${0}`}. Read the sign of the product instead: ${math`${0} < c < ${C1225}`}.` },
    { kind: 'takeaway', text: t`Move everything to one side, find the critical values, and read the sign of the product from a sketch; only ever multiply or divide by a number whose sign you know.` },
  ],
  examples: [
    withExaminer(workedCambridge(a1q2iii), t`The discriminant written with capital letters so the parameter ${math`c`} is not confused with the constant term, the factorised inequality, and a strict inequality at both ends.`),
    worked(quadratic, { lead: -1, r: 1, s: 6, op: '>' }, t`A parabola that opens downwards`),
    worked(noRealRoots, { a: 2, b: 3 }, t`No real roots, by the discriminant`),
  ],
  generators: [linear, quadratic, noRealRoots],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['inequality', 'critical-value'],
  cambridge: [a4q2i, a22q3i, nstA5, step2005],
  gate: ['a1-q3', 'a22-q3-i', 'a4-q2-i'],
  recall: [
    { front: t`When does multiplying an inequality reverse it?`, back: t`When the multiplier is negative. If you do not know its sign, do not multiply by it.` },
    { front: t`For ${math`a > ${0}`} and roots ${math`\alpha < \beta`}, where is ${math`a(x - \alpha)(x - \beta) < ${0}`}?`, back: t`Strictly between the roots: ${math`\alpha < x < \beta`}.` },
    { front: t`What condition gives a quadratic no real roots?`, back: t`A negative discriminant: ${math`B^{${2}} - ${4}AC < ${0}`}.` },
  ],
  proofOrder: [{
    title: t`Multiplying by a negative reverses an inequality`,
    steps: [
      t`Suppose ${math`a < b`} and ${math`c < ${0}`}.`,
      t`Then ${math`b - a > ${0}`} and ${math`-c > ${0}`}.`,
      t`So ${math`ca - cb = (-c)(b - a) > ${0}`}, a product of positives.`,
      t`Hence ${math`ca > cb`}.`,
    ],
  }],
};
