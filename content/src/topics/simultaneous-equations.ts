/**
 * alg.simultaneous-equations: linear systems in two to four unknowns by elimination, one
 * linear with one quadratic equation by substitution, and the values of a parameter for
 * which a system has no solution. Sources: STEP Support Foundation Assignment 6 Q1(ii),
 * Assignment 14 Q2(iii), and Assignment 17 Q2(i). Linear systems are solved again by exact
 * Gaussian elimination on rationals; non-linear ones by checking the solutions.
 */
import { auto, cite, same, withUses } from '../cambridge';
import { div, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { computedMath, math, t } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';
import { poly } from '../poly';
import { distinctFrom, fromRoots, named, namedAnswer, setAnswer, withExaminer } from '../prep-a';

/** Solve A v = b exactly by Gaussian elimination; null when singular. */
function gauss(A: readonly (readonly number[])[], b: readonly number[]): Rational[] | null {
  const n = A.length;
  const M = A.map((row, i) => [...row.map((v) => q(v)), q(b[i] as number)]);
  for (let col = 0; col < n; col++) {
    const piv = M.findIndex((row, r) => r >= col && (row[col] as Rational).num !== 0n);
    if (piv < 0) return null;
    [M[col], M[piv]] = [M[piv] as Rational[], M[col] as Rational[]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = div((M[r] as Rational[])[col] as Rational, (M[col] as Rational[])[col] as Rational);
      M[r] = (M[r] as Rational[]).map((v, j) => sub(v, mul(f, (M[col] as Rational[])[j] as Rational)));
    }
  }
  return M.map((row, i) => div(row[n] as Rational, row[i] as Rational));
}

const lin = (cs: readonly number[], vars: readonly string[]): string => {
  const parts: string[] = [];
  cs.forEach((c, i) => {
    if (c === 0) return;
    const v = vars[i] as string;
    const body = `${Math.abs(c) === 1 ? '' : Math.abs(c)}${v}`;
    parts.push(parts.length === 0 ? (c < 0 ? `-${body}` : body) : `${c < 0 ? '-' : '+'} ${body}`);
  });
  return parts.join(' ');
};

// ---------------------------------------------------------------- two linear equations

interface TwoP { a: number; b: number; c: number; d: number; x: number; y: number }
const XY = ['x', 'y'] as const;

const twoLinear = generator<TwoP>({
  id: 'two-linear',
  skill: 'Solve two linear equations in two unknowns by elimination: scale, then add or subtract to remove one unknown.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const p: TwoP = { a: int(rng, 1, 6), b: pick(rng, [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]), c: int(rng, 1, 6), d: pick(rng, [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]), x: int(rng, -6, 6), y: int(rng, -6, 6) };
      if (p.a * p.d - p.b * p.c === 0 || p.y === 0 || p.x === p.y || p.x === -p.y) continue;
      return p;
    }
  },
  sane: (p) => (p.a * p.d - p.b * p.c !== 0 ? null : 'singular'),
  problem: (p) => {
    const e = p.a * p.x + p.b * p.y;
    const f = p.c * p.x + p.d * p.y;
    // Eliminate x: multiply the first by c and the second by a, then subtract.
    const yCoef = p.c * p.b - p.a * p.d;
    const rhs = p.c * e - p.a * f;
    return {
      prompt: t`Solve the simultaneous equations ${computedMath(`${lin([p.a, p.b], XY)} = ${e}`)} and ${computedMath(`${lin([p.c, p.d], XY)} = ${f}`)}.`,
      answer: namedAnswer(XY, [q(p.x), q(p.y)], 'Check your pair in both equations.'),
      solution: [
        t`Multiply the first equation by ${p.c} and the second by ${p.a}, so both have ${math`${p.a * p.c}x`}: ${computedMath(`${lin([p.a * p.c, p.b * p.c], XY)} = ${p.c * e}`)} and ${computedMath(`${lin([p.a * p.c, p.a * p.d], XY)} = ${p.a * f}`)}.`,
        t`Subtract the second from the first: ${math`${yCoef}y = ${rhs}`}, so ${math`y = ${p.y}`}.`,
        t`Substitute back into the first: ${math`${p.a}x = ${e} - (${p.b * p.y}) = ${p.a * p.x}`}, so ${math`x = ${p.x}`}. Check in the second: ${math`${p.c} \times (${p.x}) + ${p.d} \times (${p.y}) = ${f}`}.`,
      ],
    };
  },
  solve: (p) => {
    const sol = gauss([[p.a, p.b], [p.c, p.d]], [p.a * p.x + p.b * p.y, p.c * p.x + p.d * p.y]) as Rational[];
    return named(XY, sol);
  },
  misconceptions: (p): Misconception[] => [
    { response: named(XY, [q(p.y), q(p.x)]), why: t`The values are the wrong way round. Check: substitute ${math`x = ${p.y}`}, ${math`y = ${p.x}`} into either equation.` },
    { response: named(XY, [div(q(p.a * p.x + 2 * p.b * p.y), q(p.a)), q(-p.y)]), why: t`A sign slipped while eliminating: when you subtract one equation from another, subtract every term, including the constants. Always check both equations at the end.` },
  ],
});

// ---------------------------------------------------------------- three linear equations

interface ThreeP { a: number; b: number; c: number }
const ABC = ['a', 'b', 'c'] as const;
/** a + b - c = p, a - b + c = q, -a + b + c = r. */
const rhs3 = ({ a, b, c }: ThreeP): [number, number, number] => [a + b - c, a - b + c, -a + b + c];

const threeLinear = generator<ThreeP>({
  id: 'three-linear',
  skill: 'Solve three linear equations by adding pairs of them to eliminate two unknowns at once.',
  params: (rng) => {
    for (;;) {
      const p: ThreeP = { a: int(rng, -6, 8), b: int(rng, -6, 8), c: int(rng, -6, 8) };
      if (new Set([p.a, p.b, p.c]).size === 3) return p;
    }
  },
  sane: () => null,
  problem: (p) => {
    const [P, Q, R] = rhs3(p);
    return {
      prompt: t`Solve ${computedMath(`a + b - c = ${P}`)}, ${computedMath(`a - b + c = ${Q}`)}, ${computedMath(`-a + b + c = ${R}`)}.`,
      answer: namedAnswer(ABC, [q(p.a), q(p.b), q(p.c)], 'Add the equations in pairs.'),
      solution: [
        t`Add the first two: ${math`b`} and ${math`c`} cancel, leaving ${math`${2}a = ${P + Q}`}, so ${math`a = ${p.a}`}.`,
        t`Add the second and third: ${math`${2}c = ${Q + R}`}, so ${math`c = ${p.c}`}. Add the first and third: ${math`${2}b = ${P + R}`}, so ${math`b = ${p.b}`}.`,
        t`Check in the first: ${math`${p.a} + (${p.b}) - (${p.c}) = ${P}`}.`,
      ],
    };
  },
  solve: (p) => named(ABC, gauss([[1, 1, -1], [1, -1, 1], [-1, 1, 1]], rhs3(p)) as Rational[]),
  misconceptions: (p): Misconception[] => {
    const [P, Q, R] = rhs3(p);
    return [
      { response: named(ABC, [q(P + Q), q(P + R), q(Q + R)]), why: t`Adding two equations gives ${math`${2}a`}, not ${math`a`}: halve each sum.` },
      { response: named(ABC, [q(p.a), q(p.c), q(p.b)]), why: t`${math`b`} and ${math`c`} are swapped: the second plus the third gives ${math`${2}c`}.` },
    ];
  },
});

// ---------------------------------------------------------------- a line meets a parabola

interface LqP { m: number; k: number; r: number; s: number }
/** y = x^2 + Bx + C and y = mx + k meet where x^2 + (B - m)x + (C - k) = (x - r)(x - s). */
const lqParab = ({ m, k, r, s }: LqP): [number, number, number] => { const [, b1, c1] = fromRoots([r, s]) as [number, number, number]; return [1, b1 + m, c1 + k]; };

const lineQuadratic = generator<LqP>({
  id: 'line-quadratic',
  skill: 'Solve a linear and a quadratic equation together by substituting the linear one into the quadratic.',
  params: (rng) => {
    for (;;) {
      const p: LqP = { m: pick(rng, [-3, -2, -1, 1, 2, 3]), k: int(rng, -5, 5), r: int(rng, -5, 5), s: int(rng, -5, 5) };
      const ys = [p.m * p.r + p.k, p.m * p.s + p.k];
      if (p.r !== p.s && p.r !== -p.s && distinctFrom([p.r, p.s].sort().join(','), [[-p.r, -p.s].sort().join(','), [...ys].sort().join(',')]) >= 2) return p;
    }
  },
  sane: (p) => (p.r !== p.s ? null : 'tangent'),
  problem: (p) => {
    const par = lqParab(p);
    const quad = fromRoots([p.r, p.s]);
    return {
      prompt: t`The line ${computedMath(`y = ${poly([p.m, p.k])}`)} meets the curve ${computedMath(`y = ${poly(par)}`)} at two points. Find their ${math`x`}-coordinates.`,
      answer: setAnswer([q(p.r), q(p.s)], 'Substitute the line into the curve and solve the quadratic.'),
      solution: [
        t`At a meeting point both equations hold, so ${computedMath(`${poly(par)} = ${poly([p.m, p.k])}`)}.`,
        t`Move everything to one side: ${computedMath(`${poly(quad)} = ${0}`)}, which factorises with roots ${math`x = ${p.r}`} and ${math`x = ${p.s}`}.`,
        t`The points are ${math`(${p.r}, ${p.m * p.r + p.k})`} and ${math`(${p.s}, ${p.m * p.s + p.k})`}.`,
      ],
    };
  },
  solve: (p) => {
    const par = lqParab(p);
    const xs: number[] = [];
    for (let x = -20; x <= 20; x++) if (x * x + (par[1] as number) * x + (par[2] as number) === p.m * x + p.k) xs.push(x);
    return xs.join(', ');
  },
  misconceptions: (p): Misconception[] => [
    { response: `${-p.r}, ${-p.s}`, why: t`The signs are flipped: the factor ${math`x - a`} gives ${math`x = a`}.` },
    { response: `${p.m * p.r + p.k}, ${p.m * p.s + p.k}`, why: t`Those are the ${math`y`}-coordinates. The question asks for the ${math`x`}-coordinates.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const a6 = auto({
  id: 'a6-q1-ii',
  source: cite('step-f06', 'Q1(ii)'),
  title: t`Three equations, added in pairs`,
  prompt: t`Solve the simultaneous equations ${math`a + b - c = ${2}`}, ${math`a - b + c = ${0}`}, ${math`-a + b + c = ${8}`}.`,
  answer: namedAnswer(ABC, [q(1), q(5), q(4)], 'Add the equations in pairs.'),
  solution: [
    t`Add the first two: ${math`${2}a = ${2}`}, so ${math`a = ${1}`}. Add the second and third: ${math`${2}c = ${8}`}, so ${math`c = ${4}`}.`,
    t`Add the first and third: ${math`${2}b = ${10}`}, so ${math`b = ${5}`}. Check in all three: ${math`${1} + ${5} - ${4} = ${2}`}, ${math`${1} - ${5} + ${4} = ${0}`}, ${math`-${1} + ${5} + ${4} = ${8}`}.`,
  ],
  reference: 'a = 1, b = 5, c = 4',
  verify: () => same('Gaussian elimination', (gauss([[1, 1, -1], [1, -1, 1], [-1, 1, 1]], [2, 0, 8]) as Rational[]).map(str).join(','), '1,5,4'),
  misconceptions: [{ response: 'a = 2, b = 10, c = 8', why: t`Adding two equations gives twice the unknown: halve.` }],
  official: { source: cite('step-f06-hints', 'Q1(ii)'), answer: 'a = 1, b = 5, c = 4', agrees: true },
});

const a6k = auto({
  id: 'a6-q1-ii-k',
  source: cite('step-f06', 'Q1(ii)'),
  title: t`When a system has no solution`,
  prompt: t`Solve ${math`ka + b - c = ${2}`}, ${math`a - b + c = ${0}`}, ${math`-a + b + c = ${8}`}, where ${math`k`} is a fixed but unknown number. For which value of ${math`k`} do the equations have no solution?`,
  nudge: t`Not quite. Eliminate in pairs as before, and look for a coefficient that can vanish.`,
  hints: [
    t`Adding the second and third equations, what is ${math`c`}?`,
    t`Adding the first two, which equation in ${math`a`} and ${math`k`} results?`,
    t`For which ${math`k`} does that equation have no solution for ${math`a`}?`,
  ],
  answer: { kind: 'exact', expected: '-1' },
  solution: [
    t`Adding the second and third still gives ${math`c = ${4}`}. Adding the first two gives ${math`(k + ${1})a = ${2}`}.`,
    t`If ${math`k \ne -${1}`}, then ${math`a = \frac{${2}}{k + ${1}}`}, and the second equation gives ${math`b = \frac{${2}}{k + ${1}} + ${4}`}: one solution.`,
    t`If ${math`k = -${1}`}, the equation ${math`(k + ${1})a = ${2}`} reads ${math`${0} = ${2}`}, which no ${math`a`} satisfies. So there is no solution exactly when ${math`k = -${1}`}.`,
    t`A system fails when elimination leaves a zero coefficient against a non-zero right side.`,
  ],
  reference: '-1',
  verify: () => {
    // Singular exactly at k = -1 among k from -5 to 5.
    const sing: number[] = [];
    for (let k = -5; k <= 5; k++) if (gauss([[k, 1, -1], [1, -1, 1], [-1, 1, 1]], [2, 0, 8]) === null) sing.push(k);
    return same('singular k', sing.join(','), '-1');
  },
  misconceptions: [{ response: '1', why: t`The coefficient of ${math`a`} after adding is ${math`k + ${1}`}; it is ${0} when ${math`k = -${1}`}.` }],
  official: { source: cite('step-f06-hints', 'Q1(ii)'), answer: '-1', agrees: true },
});

const a17 = auto({
  id: 'a17-q2-i',
  source: cite('step-f17', 'Q2(i)'),
  title: t`Four equations in four unknowns`,
  prompt: t`Solve ${math`w + x + y + z = ${1}`}, ${math`w - x + y - z = ${0}`}, ${math`${4}w + ${3}x + ${2}y + ${3}z = ${3}`}, ${math`${4}w - ${3}x + ${2}y - ${9}z = -${1}`}.`,
  nudge: t`Not quite. Add and subtract the equations in pairs to split the unknowns.`,
  hints: [
    t`What do the sum and the difference of the first two equations give?`,
    t`What do the sum and the difference of the last two give?`,
    t`Which pairs of the new equations can then be solved for one unknown at a time?`,
  ],
  answer: namedAnswer(['w', 'x', 'y', 'z'], [q(1, 4), q(1, 3), q(1, 4), q(1, 6)], 'Add and subtract the first two to split the unknowns into pairs.'),
  solution: [
    t`Add the first two: ${math`${2}(w + y) = ${1}`}, so ${math`w + y = ${q(1, 2)}`}. Subtract: ${math`${2}(x + z) = ${1}`}, so ${math`x + z = ${q(1, 2)}`}.`,
    t`Add the last two: ${math`${8}w + ${4}y - ${6}z = ${2}`}. Subtract them: ${math`${6}x + ${12}z = ${4}`}, so ${math`x + ${2}z = ${q(2, 3)}`}; with ${math`x + z = ${q(1, 2)}`} this gives ${math`z = ${q(1, 6)}`} and ${math`x = ${q(1, 3)}`}.`,
    t`Then ${math`${8}w + ${4}y = ${2} + ${1} = ${3}`}, and ${math`w + y = ${q(1, 2)}`} gives ${math`${4}y = ${4} - ${3} = ${1}`}: ${math`y = ${q(1, 4)}`}, ${math`w = ${q(1, 4)}`}.`,
    t`Add and subtract equations in pairs to uncouple the unknowns.`,
  ],
  reference: 'w = 1/4, x = 1/3, y = 1/4, z = 1/6',
  verify: () => same('Gaussian elimination', (gauss([[1, 1, 1, 1], [1, -1, 1, -1], [4, 3, 2, 3], [4, -3, 2, -9]], [1, 0, 3, -1]) as Rational[]).map(str).join(','), '1/4,1/3,1/4,1/6'),
  misconceptions: [{ response: 'w = 1/4, x = 1/6, y = 1/4, z = 1/3', why: t`${math`x`} and ${math`z`} are swapped: check the fourth equation.` }],
  official: { source: cite('step-f17-hints', 'Q2(i)'), answer: 'w = 1/4, x = 1/3, y = 1/4, z = 1/6', agrees: true },
});

const a14 = auto({
  id: 'a14-q2-iii',
  source: cite('step-f14', 'Q2(iii)', true),
  title: t`Three equations, one of them quadratic`,
  prompt: t`Find the real solutions of ${math`x^{${2}} - y^{${2}} = z`}, ${math`x - y = z`}, ${math`xy = -${2}`}. Give the solution with ${math`x > ${0}`}.`,
  nudge: t`Not quite. Factorise ${math`x^{${2}} - y^{${2}}`}, and check whether ${math`z`} can be ${0} before dividing by it.`,
  hints: [
    t`How does ${math`x^{${2}} - y^{${2}}`} factorise, and what does the first equation become using the second?`,
    t`Which two cases does ${math`z(x + y) = z`} leave?`,
    t`In each case, what quadratic does ${math`xy = -${2}`} give?`,
  ],
  answer: namedAnswer(['x', 'y', 'z'], [q(2), q(-1), q(3)], 'Factorise x^2 - y^2, and treat z = 0 as a separate case.'),
  solution: [
    t`${math`x^{${2}} - y^{${2}} = (x - y)(x + y)`}, so the first equation is ${math`z(x + y) = z`}: either ${math`z = ${0}`} or ${math`x + y = ${1}`}. Do not divide by ${math`z`} without checking it is not ${0}.`,
    t`If ${math`z = ${0}`}: ${math`x = y`} and ${math`x^{${2}} = -${2}`}, with no real solution.`,
    t`If ${math`x + y = ${1}`}: ${math`x(${1} - x) = -${2}`}, so ${math`x^{${2}} - x - ${2} = (x - ${2})(x + ${1}) = ${0}`}. This gives ${math`(x, y, z) = (${2}, -${1}, ${3})`} or ${math`(-${1}, ${2}, -${3})`}. The one with ${math`x > ${0}`} is ${math`(${2}, -${1}, ${3})`}.`,
    t`Factorise before dividing, and treat the zero case separately.`,
  ],
  reference: 'x = 2, y = -1, z = 3',
  verify: () => {
    const sols: string[] = [];
    for (let x = -6; x <= 6; x++) for (let y = -6; y <= 6; y++) { const z = x - y; if (x * x - y * y === z && x * y === -2) sols.push(`${x},${y},${z}`); }
    return same('integer solutions', sols.join(';'), '-1,2,-3;2,-1,3');
  },
  misconceptions: [{ response: 'x = 2, y = -1, z = 1', why: t`${math`z = x - y = ${2} - (-${1}) = ${3}`}.` }],
  official: { source: cite('step-f14-hints', 'Q2(iii)'), answer: 'x = 2, y = -1, z = 3', agrees: true },
});

// ---------------------------------------------------------------- lesson

export const simultaneousEquations: TopicContent = {
  topicId: 'alg.simultaneous-equations',
  goal: t`Solve linear systems in two to four unknowns by elimination, and one linear with one quadratic equation by substitution.`,
  objective: t`Solve simultaneous equations by elimination and substitution, and spot when none exist.`,
  why: t`Systems of equations sit inside STEP questions on every topic; cases matter.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`The idea` },
    { kind: 'hook', text: t`Three equations, three unknowns: ${math`a + b - c = ${2}`}, ${math`a - b + c = ${0}`}, ${math`-a + b + c = ${8}`}. You could grind through substitutions. Or you could add the first two and watch ${math`b`} and ${math`c`} vanish together, leaving ${math`${2}a = ${2}`}. Spotting such moves is the whole art.` },
    { kind: 'narrative', text: t`Simultaneous equations ask for values that make every equation true at once. Each move you make must keep that set of solutions the same: no solution lost, none gained. Two moves do that for linear equations, and one more handles a quadratic.` },
    { kind: 'section', title: t`Elimination` },
    {
      kind: 'definition',
      name: t`Solution of a system`,
      formal: t`A solution of the [[simultaneous-equations|simultaneous equations]] ${math`E_{${1}}, \ldots, E_{m}`} in unknowns ${math`x_{${1}}, \ldots, x_{n}`} is an ${math`n`}-tuple of numbers satisfying every ${math`E_{i}`}. Two systems are equivalent if they have the same solutions.`,
      plain: t`A choice of values that makes all the equations true together. ${math`x = ${1}, y = ${2}`} solves ${math`x + y = ${3}`} and ${math`x - y = -${1}`}.`,
    },
    { kind: 'theorem', name: t`Elimination keeps the solutions`, statement: t`Replacing one equation ${math`E_{i}`} of a linear system by ${math`E_{i} + \lambda E_{j}`} (${math`j \ne i`}), or by ${math`\mu E_{i}`} with ${math`\mu \ne ${0}`}, gives an equivalent system.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Old solutions still work`, text: t`If a tuple satisfies ${math`E_{i}`} and ${math`E_{j}`}, adding ${math`\lambda`} times the true equation ${math`E_{j}`} to the true equation ${math`E_{i}`} gives a true equation.` },
        { label: t`New solutions were old ones`, text: t`Conversely ${math`E_{i} = (E_{i} + \lambda E_{j}) - \lambda E_{j}`}, so a tuple satisfying the new system satisfies ${math`E_{i}`} too.`, plain: t`The step can be undone, so nothing is gained or lost.` },
        { label: t`Scaling`, text: t`${math`\mu E_{i}`} can be undone by multiplying by ${math`\frac{${1}}{\mu}`}, which needs ${math`\mu \ne ${0}`}.`, why: { q: t`What goes wrong with ${math`\mu = ${0}`}?`, a: t`The equation becomes ${math`${0} = ${0}`}, which every tuple satisfies, so the information in ${math`E_{i}`} is lost and false solutions appear.` } },
      ],
    },
    { kind: 'narrative', text: t`The strategy, called [[elimination|elimination]]: use these moves to make the coefficient of one unknown ${0} in all but one equation, solve the smaller system, and substitute back. With the hook's equations, adding in pairs did all of it at once: ${math`a = ${1}`}, ${math`c = ${4}`}, ${math`b = ${5}`}.` },
    checkFrom(twoLinear, { a: 2, b: 3, c: 1, d: -1, x: 4, y: -1 }, t`Double the second: ${math`${2}x - ${2}y = ${10}`}; subtract from the first: ${math`${5}y = -${5}`}, so ${math`y = -${1}`}, then ${math`x = ${4}`}.`),
    { kind: 'section', title: t`When there is no solution` },
    { kind: 'narrative', text: t`Now let a coefficient be a parameter: ${math`x + ky = ${3}`} and ${math`${2}x + ${6}y = ${5}`}. Subtract twice the first equation from the second: the ${math`x`} terms cancel, ${math`${6}y - ${2}ky = (${6} - ${2}k)y`}, and ${math`${5} - ${6} = -${1}`}, so ${math`(${6} - ${2}k)y = -${1}`}. To find ${math`y`} you would divide by ${math`${6} - ${2}k`}, and that is only allowed when ${math`k \ne ${3}`}. At ${math`k = ${3}`} the equation says ${math`${0} = -${1}`}: the system has no solution. Whenever you divide by an expression with a parameter, ask when it could be ${0}.` },
    { kind: 'pitfall', claim: t`Three linear equations in three unknowns always have exactly one solution.`, counterexample: t`${math`x + y - z = ${1}`}, ${math`-x - y + z = ${3}`}: adding gives ${math`${0} = ${4}`}, so with any third equation there is no solution. And ${math`x + y = ${1}`}, ${math`${2}x + ${2}y = ${2}`} has infinitely many.` },
    { kind: 'section', title: t`A line and a curve` },
    { kind: 'narrative', text: t`When one equation is quadratic, elimination by adding does not get rid of the squares. Instead make one unknown the subject of the linear equation and substitute it into the other. You get a quadratic in one unknown, with up to two roots, and each root gives a solution of the system.` },
    checkFrom(lineQuadratic, { m: 1, k: 1, r: -1, s: 3 }, t`Setting the curve equal to the line gives ${math`x^{${2}} - ${2}x - ${3} = (x + ${1})(x - ${3}) = ${0}`}.`),
    { kind: 'pitfall', claim: t`From ${math`y(x - ${2}) = ${3}y`}, divide by ${math`y`} to get ${math`x - ${2} = ${3}`}, so ${math`x = ${5}`}.`, counterexample: t`That loses the case ${math`y = ${0}`}: for example ${math`x = ${7}`}, ${math`y = ${0}`} satisfies ${math`y(x - ${2}) = ${3}y`}, since both sides are ${0}, with ${math`x \ne ${5}`}. Split into cases: ${math`y = ${0}`} or ${math`x = ${5}`}.` },
    { kind: 'takeaway', text: t`Eliminate by adding multiples of equations, substitute when a quadratic is involved, and never divide by an expression that might be ${0} without treating that case.` },
  ],
  examples: [
    withExaminer(workedCambridge(a6), t`A clean choice of pairs to add, each unknown found in one line, and a check of all three equations at the end.`),
    worked(threeLinear, { a: 3, b: -2, c: 5 }, t`Adding equations in pairs`),
    worked(lineQuadratic, { m: -2, k: 3, r: 1, s: -4 }, t`Substituting a line into a parabola`),
  ],
  generators: [twoLinear, threeLinear, lineQuadratic],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['simultaneous-equations', 'elimination'],
  cambridge: withUses([a6k, a17, a14], {
    'a17-q2-i': { sections: ['Elimination'], note: t`Eliminating to solve four equations in four unknowns` },
    'a14-q2-iii': { sections: ['A line and a curve'], note: t`Substituting to solve with one quadratic equation` },
    'a6-q1-ii-k': { sections: ['Elimination', 'When there is no solution'], note: t`Solving with a parameter and finding when there is no solution` },
  }),
  gate: ['a17-q2-i', 'a14-q2-iii', 'a6-q1-ii-k'],
  recall: [
    { front: t`Which moves keep the solutions of a linear system?`, back: t`Adding a multiple of one equation to another, and multiplying an equation by a non-zero number.` },
    { front: t`How do you solve one linear and one quadratic equation?`, back: t`Make an unknown the subject of the linear equation and substitute it into the quadratic.` },
  ],
  proofOrder: [{
    title: t`Adding equations loses no solutions and gains none`,
    steps: [
      t`A tuple satisfying ${math`E_{i}`} and ${math`E_{j}`} satisfies ${math`E_{i} + \lambda E_{j}`}.`,
      t`The new system still contains ${math`E_{j}`}.`,
      t`${math`E_{i}`} is recovered as ${math`(E_{i} + \lambda E_{j}) - \lambda E_{j}`}.`,
      t`So both systems have the same solutions.`,
    ],
  }],
};
