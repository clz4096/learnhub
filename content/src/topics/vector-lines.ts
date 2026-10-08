/**
 * geom.vector-lines: the vector equation of a line r = a + t d, points on a line, and two
 * lines in space: meeting, parallel, or skew. Problems from the NST Maths Workbook, Section 2
 * VE1 (three points on a straight line, and its equation in the form r = a + lambda b).
 * VE1 is also the worked example, so it does not gate (2026-10-07). The gates (batch 9) are
 * 2007 STEP I Q7: (i) the least distance between two skew lines, by writing the squared
 * distance between a point of each as a sum of squares (checked by expanding it at many
 * parameter values and by setting both partial derivatives to zero, in sympy), and (ii) the
 * least distance between a fixed line and a family of lines, 5 unless the lines are parallel,
 * when it is 5 times root 2.
 */
import { auto, cite, supervision, withUses } from '../cambridge';
import { add3, colTex, cross, dot, listText, ptTex, scale3, sub3 } from '../geometry';
import { int, pick, q, str } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { computedTex, dmath, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const col = (v: readonly number[]) => computedTex(colTex(v));
const [mr, ma, md] = [math`\mathbf{r}`, math`\mathbf{a}`, math`\mathbf{d}`];
const rv = (rng: () => number, lo: number, hi: number): number[] => [int(rng, lo, hi), int(rng, lo, hi), int(rng, lo, hi)];
const nonzero = (v: readonly number[]): boolean => v.some((x) => x !== 0);
const parallel = (u: readonly number[], v: readonly number[]): boolean => !nonzero(cross(u, v));

// ---------------------------------------------------------------- a point on a line

interface OnP { a: readonly number[]; d: readonly number[]; t0: number; hide: 0 | 1 | 2 }

const onLine = generator<OnP>({
  id: 'point-on-line',
  skill: 'Find the missing coordinate of a point on a line r = a + t d: find t from a known coordinate, then the missing one.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const d = rv(rng, -4, 4);
      const hide = pick(rng, [0, 1, 2] as const);
      const known = [0, 1, 2].filter((i) => i !== hide);
      if (known.some((i) => d[i] !== 0) && d[hide] !== 0) return { a: rv(rng, -5, 5), d, t0: pick(rng, [-3, -2, -1, 2, 3, 4]), hide };
    }
  },
  sane: (p) => (nonzero(p.d) ? null : 'zero direction'),
  problem: (p) => {
    const P = add3(p.a, scale3(p.t0, p.d));
    const names = ['x', 'y', 'z'];
    const shown = P.map((x, i) => (i === p.hide ? 'p' : String(x)));
    const j = [0, 1, 2].find((i) => i !== p.hide && p.d[i] !== 0) as number;
    return {
      prompt: t`The point ${computedTex(`(${shown.join(', ')})`)} lies on the line ${math`\mathbf{r} = ${col(p.a)} + t${col(p.d)}`}. Find ${math`p`}.`,
      answer: { kind: 'exact', expected: String(P[p.hide]) },
      solution: [
        t`The point is ${math`\mathbf{a} + t\mathbf{d}`} for one value of ${math`t`}. Its ${computedTex(names[j] as string)}-coordinate gives ${math`${p.a[j] as number} + ${p.d[j] as number}t = ${P[j] as number}`}, so ${math`t = ${p.t0}`}.`,
        t`Then ${math`p = ${p.a[p.hide] as number} + ${p.t0} \times ${p.d[p.hide] as number} = ${P[p.hide] as number}`}. (Check the third coordinate with the same ${math`t`}.)`,
      ],
    };
  },
  solve: (p) => {
    // Search t over integers for the two known coordinates, then read the hidden one.
    const P = add3(p.a, scale3(p.t0, p.d));
    for (let tt = -20; tt <= 20; tt++) {
      const Q = add3(p.a, scale3(tt, p.d));
      if ([0, 1, 2].every((i) => i === p.hide || Q[i] === P[i])) return String(Q[p.hide]);
    }
    return 'none';
  },
  misconceptions: (p): Misconception[] => {
    const P = add3(p.a, scale3(p.t0, p.d));
    return [
      { response: String(p.t0), why: t`That is the parameter ${math`t`}, not the coordinate. Substitute it back into the line.` },
      { response: String((p.a[p.hide] as number) - p.t0 * (p.d[p.hide] as number)), why: t`The line is ${math`\mathbf{a} + t\mathbf{d}`}: add ${math`t`} times the direction, do not subtract.` },
      { response: String((p.a[p.hide] as number) + (p.d[p.hide] as number)), why: t`Use the value of ${math`t`} found from the known coordinate, not ${math`t = ${1}`}.` },
      { response: String(p.a[p.hide] as number), why: t`That is the coordinate of ${math`\mathbf{a}`}, the point at ${math`t = ${0}`}. Find ${math`t`} for this point first.` },
    ].filter((m) => m.response !== String(P[p.hide]));
  },
});

// ---------------------------------------------------------------- where two lines meet

interface MeetP { P: readonly number[]; d1: readonly number[]; d2: readonly number[]; s0: number; t0: number }

const meet = generator<MeetP>({
  id: 'lines-meet',
  skill: 'Find where two lines in space meet: equate components, solve two equations for the parameters, and check the third.',
  params: (rng) => {
    for (;;) {
      const d1 = rv(rng, -3, 3);
      const d2 = rv(rng, -3, 3);
      // Need the first two components to determine the parameters.
      const det = (d1[0] as number) * (d2[1] as number) - (d1[1] as number) * (d2[0] as number);
      const s0 = pick(rng, [-2, -1, 1, 2, 3]);
      const t0 = pick(rng, [-2, -1, 1, 2, 3]);
      if (nonzero(d1) && nonzero(d2) && !parallel(d1, d2) && det !== 0 && s0 !== t0) return { P: rv(rng, -5, 5), d1, d2, s0, t0 };
    }
  },
  sane: (p) => (parallel(p.d1, p.d2) ? 'parallel' : null),
  problem: (p) => {
    const a1 = sub3(p.P, scale3(p.s0, p.d1));
    const a2 = sub3(p.P, scale3(p.t0, p.d2));
    return {
      prompt: t`The lines ${math`\mathbf{r} = ${col(a1)} + s${col(p.d1)}`} and ${math`\mathbf{r} = ${col(a2)} + t${col(p.d2)}`} meet. Find the point where they meet, as ${math`x, y, z`}.`,
      answer: {
        kind: 'witness', count: 3, example: listText(p.P),
        check: (v) => (v.map(str).join(',') === p.P.join(',') ? null : 'Equate the components, solve for s and t, and substitute back.'),
      },
      solution: [
        t`At the meeting point, ${math`${col(a1)} + s${col(p.d1)} = ${col(a2)} + t${col(p.d2)}`}: three equations in ${math`s`} and ${math`t`}.`,
        t`Solve the first two together: ${math`s = ${p.s0}`} and ${math`t = ${p.t0}`}. The third equation also holds with these values, so the lines do meet.`,
        t`Substitute ${math`s = ${p.s0}`} into the first line: the point is ${computedTex(`(${p.P.join(', ')})`)}.`,
      ],
    };
  },
  solve: (p) => {
    // Cramer's rule on the x and y equations: s d1 - t d2 = a2 - a1.
    const a1 = sub3(p.P, scale3(p.s0, p.d1));
    const a2 = sub3(p.P, scale3(p.t0, p.d2));
    const r = sub3(a2, a1);
    const [A, B, C, D] = [p.d1[0] as number, -(p.d2[0] as number), p.d1[1] as number, -(p.d2[1] as number)];
    const det = A * D - B * C;
    const s = ((r[0] as number) * D - B * (r[1] as number)) / det;
    return listText(add3(a1, scale3(s, p.d1)));
  },
  misconceptions: (p): Misconception[] => {
    const a1 = sub3(p.P, scale3(p.s0, p.d1));
    const a2 = sub3(p.P, scale3(p.t0, p.d2));
    return [
      { response: listText(a1), why: t`That is the point ${math`s = ${0}`} on the first line. Solve for the parameter where the lines agree.` },
      { response: listText(add3(a1, scale3(p.t0, p.d1))), why: t`Each line has its own parameter: put ${math`s`} into the first line, or ${math`t`} into the second, not ${math`t`} into the first.` },
      { response: listText(add3(a2, scale3(p.s0, p.d2))), why: t`Each line has its own parameter: ${math`t = ${p.t0}`} goes with the second line.` },
    ];
  },
});

// ---------------------------------------------------------------- meet, parallel, or skew

interface KindP { a1: readonly number[]; d1: readonly number[]; a2: readonly number[]; d2: readonly number[] }
const KINDS: ChoiceOption[] = [
  { id: 'meet', label: t`They meet in one point.` },
  { id: 'parallel', label: t`They are parallel and different.` },
  { id: 'skew', label: t`They are skew: not parallel, and they do not meet.` },
];
/** Two lines meet or are skew according as the triple product (a2 - a1) . (d1 x d2) is zero or not. */
const classify = ({ a1, d1, a2, d2 }: KindP): string => (parallel(d1, d2) ? 'parallel' : dot(sub3(a2, a1), cross(d1, d2)) === 0 ? 'meet' : 'skew');

const lineKind = generator<KindP>({
  id: 'meet-parallel-skew',
  skill: 'Decide whether two lines in space meet, are parallel, or are skew.',
  params: (rng) => {
    for (;;) {
      const d1 = rv(rng, -3, 3);
      const a1 = rv(rng, -4, 4);
      const kind = pick(rng, ['meet', 'parallel', 'skew'] as const);
      if (!nonzero(d1)) continue;
      if (kind === 'parallel') {
        const d2 = scale3(pick(rng, [-2, -1, 2, 3]), d1);
        const a2 = add3(a1, rv(rng, -3, 3));
        if (parallel(sub3(a2, a1), d1)) continue;
        return { a1, d1, a2, d2 };
      }
      const d2 = rv(rng, -3, 3);
      if (!nonzero(d2) || parallel(d1, d2)) continue;
      const P = add3(a1, scale3(int(rng, -2, 2), d1));
      const meetA2 = sub3(P, scale3(int(rng, -2, 2), d2));
      const a2 = kind === 'meet' ? meetA2 : add3(meetA2, rv(rng, -2, 2));
      const p = { a1, d1, a2, d2 };
      if (classify(p) === kind) return p;
    }
  },
  sane: () => null,
  problem: (p) => {
    const k = classify(p);
    const n = cross(p.d1, p.d2);
    return {
      prompt: t`Do the lines ${math`\mathbf{r} = ${col(p.a1)} + s${col(p.d1)}`} and ${math`\mathbf{r} = ${col(p.a2)} + t${col(p.d2)}`} meet, are they parallel, or are they skew?`,
      answer: { kind: 'choice', options: KINDS, correct: k },
      solution: k === 'parallel'
        ? [t`The directions are multiples of each other, so the lines are parallel.`, t`${math`${col(p.a2)}`} is not on the first line (its difference from ${math`${col(p.a1)}`} is not a multiple of the direction), so they are different lines.`]
        : [
          t`The directions are not multiples of each other, so the lines are not parallel. Equate components: ${math`${col(p.a1)} + s${col(p.d1)} = ${col(p.a2)} + t${col(p.d2)}`}.`,
          k === 'meet'
            ? t`Solving two of the equations for ${math`s`} and ${math`t`}, the third also holds: the lines meet.`
            : t`Solving two of the equations for ${math`s`} and ${math`t`}, the third fails: no ${math`s`} and ${math`t`} satisfy all three, so the lines are skew.`,
        ],
    };
  },
  solve: (p) => {
    // Brute force over a grid of rational parameters for a common point.
    if (parallel(p.d1, p.d2)) return ['parallel'];
    for (let i = -48; i <= 48; i++) {
      for (let j = -48; j <= 48; j++) {
        const s = i / 4;
        const tt = j / 4;
        const u = add3(p.a1, scale3(s, p.d1));
        const v = add3(p.a2, scale3(tt, p.d2));
        if (u.every((x, k) => Math.abs(x - (v[k] as number)) < 1e-9)) return ['meet'];
      }
    }
    return ['skew'];
  },
  misconceptions: (p): Misconception[] => {
    const k = classify(p);
    return (['meet', 'parallel', 'skew'] as const).filter((o) => o !== k).map((o) => ({
      response: [o],
      why: o === 'parallel' ? t`Parallel lines have directions that are multiples of each other; these do not.` : o === 'meet' ? t`Two of the three equations can always be solved; the lines meet only if the third equation holds too.` : t`In the plane, lines that are not parallel always meet; in space they may be skew, but check the third equation before deciding.`,
    }));
  },
});

// ---------------------------------------------------------------- Cambridge problems

const P1 = [1, 0, 1];
const P2 = [2, 1, 0];
const P3 = [0, -1, 2];

const ve1 = auto({
  id: 'nst-ve1-lambda',
  source: cite('nst-workbook', 'Section 2, VE1'),
  title: t`Three points on a straight line`,
  prompt: t`The points with position vectors ${math`${col(P1)}`}, ${math`${col(P2)}`}, ${math`${col(P3)}`} lie on a straight line. Writing the line as ${math`\mathbf{r} = \mathbf{a} + \lambda\mathbf{b}`} with ${math`\mathbf{a} = ${col(P1)}`} and ${math`\mathbf{b} = ${col(sub3(P2, P1))}`}, find the value of ${math`\lambda`} at the third point.`,
  answer: { kind: 'exact', expected: '-1' },
  solution: [
    t`The direction from the first point to the second is ${math`\mathbf{b} = ${col(P2)} - ${col(P1)} = ${col(sub3(P2, P1))}`}.`,
    t`From the first point to the third: ${math`${col(P3)} - ${col(P1)} = ${col(sub3(P3, P1))} = -${1} \cdot \mathbf{b}`}. It is a multiple of ${math`\mathbf{b}`}, so the third point is on the line, at ${math`\lambda = -${1}`}.`,
    t`The line is ${math`\mathbf{r} = ${col(P1)} + \lambda${col(sub3(P2, P1))}`}.`,
  ],
  reference: '-1',
  verify: () => (add3(P1, scale3(-1, sub3(P2, P1))).join(',') === P3.join(',') && !nonzero(cross(sub3(P2, P1), sub3(P3, P1))) ? null : 'not collinear'),
  misconceptions: [{ response: '1', why: t`${math`\lambda = ${1}`} gives the second point. The third is on the other side of the first: ${math`\lambda = -${1}`}.` }],
});

const ve1b = auto({
  id: 'nst-ve1-point',
  source: cite('nst-workbook', 'Section 2, VE1', true),
  title: t`A fourth point on the same line`,
  prompt: t`The line through ${math`${col(P1)}`}, ${math`${col(P2)}`}, and ${math`${col(P3)}`} also passes through ${computedTex(`(p, ${3}, ${-2})`)}. Find ${math`p`}.`,
  nudge: t`Not quite. Find ${math`\lambda`} from the coordinate that gives it directly, then check another.`,
  hints: [
    t`What is the equation of the line, with ${math`\mathbf{a}`} the first point and ${math`\mathbf{b}`} the step to the second?`,
    t`Which coordinate of the line equals ${math`\lambda`}, and so what is ${math`\lambda`} at the new point?`,
    t`What is the ${math`x`}-coordinate at that ${math`\lambda`}, and does the ${math`z`}-coordinate agree?`,
  ],
  answer: { kind: 'exact', expected: '4' },
  solution: [
    t`The line is ${math`\mathbf{r} = ${col(P1)} + \lambda${col(sub3(P2, P1))}`}. The ${math`y`}-coordinate is ${math`\lambda`}, so ${math`\lambda = ${3}`}; check the ${math`z`}-coordinate: ${math`${1} - ${3} = -${2}`}.`,
    t`Then ${math`p = ${1} + ${3} = ${4}`}.`,
    t`Fix the parameter from one coordinate, then check the others.`,
  ],
  reference: '4',
  verify: () => (add3(P1, scale3(3, sub3(P2, P1))).join(',') === '4,3,-2' ? null : 'point'),
  misconceptions: [{ response: '3', why: t`${3} is the parameter ${math`\lambda`}. The ${math`x`}-coordinate is ${math`${1} + \lambda`}.` }],
});

const ve1proof = supervision({
  id: 'nst-ve1',
  source: cite('nst-workbook', 'Section 2, VE1'),
  title: t`Collinearity and the equation of the line`,
  prompt: t`Show that the points with position vectors ${math`${col(P1)}`}, ${math`${col(P2)}`}, ${math`${col(P3)}`} lie on a straight line, and give the equation of the line in the form ${math`\mathbf{r} = \mathbf{a} + \lambda\mathbf{b}`}. Explain why the answer is not the only correct one, and how any two correct answers are related.`,
  hints: [
    t`What are the vectors from the first point to the second and from the first point to the third?`,
    t`Is one of those vectors a multiple of the other, and what does that say about the three points?`,
    t`Choosing a different point for ${math`\mathbf{a}`}, or a multiple of ${math`\mathbf{b}`}, does the set of points described change?`,
  ],
  writeUp: 'proof',
});

// 2007 STEP I Q7: least distances between lines.
const L1 = { a: [1, 0, 2], d: [2, 2, -3] } as const;
const L2 = { a: [4, -2, 9], d: [1, 2, -2] } as const;
const pointAt = (L: { a: readonly number[]; d: readonly number[] }, s: number): number[] => add3(L.a, scale3(s, L.d));
/** The squared distance between the point lambda of L1 and the point mu of L2, as the question writes it. */
const d2Formula = (lambda: number, mu: number): number => (3 * mu - 4 * lambda - 5) ** 2 + (lambda - 1) ** 2 + 36;
const [BEST_LAMBDA, BEST_MU] = [1, 3];
const step07Skew = auto({
  id: 'step07-q7-i',
  source: cite('stepdb-07-s1', 'Q7(i)', true),
  title: t`The least distance between two lines`,
  prompt: t`The line ${math`L_{${1}}`} has vector equation ${math`\mathbf{r} = ${col(L1.a)} + \lambda${col(L1.d)}`}. The line ${math`L_{${2}}`} has vector equation ${math`\mathbf{r} = ${col(L2.a)} + \mu${col(L2.d)}`}. Show that the distance ${math`D`} between a point on ${math`L_{${1}}`} and a point on ${math`L_{${2}}`} can be expressed in the form ${dmath`D^{${2}} = (${3}\mu - ${4}\lambda - ${5})^{${2}} + (\lambda - ${1})^{${2}} + ${36}.`} Hence find the minimum distance between these two lines. (The paper also asks for the two points that are the minimum distance apart.)`,
  nudge: t`Not quite. Minimise ${math`D^{${2}}`} by making each square zero, then take the square root.`,
  hints: [
    t`What is the vector from the point ${math`\mu`} of ${math`L_{${2}}`} to the point ${math`\lambda`} of ${math`L_{${1}}`}, and what is ${math`D^{${2}}`} from its components?`,
    t`In the given form, what is the least value each square can take?`,
    t`Can both squares be zero at once, and what is ${math`D`} then?`,
  ],
  answer: { kind: 'exact', expected: String(Math.sqrt(d2Formula(BEST_LAMBDA, BEST_MU))) },
  solution: [
    t`The point ${math`\lambda`} of ${math`L_{${1}}`} minus the point ${math`\mu`} of ${math`L_{${2}}`} is ${math`${col(sub3(L1.a, L2.a))} + \lambda${col(L1.d)} - \mu${col(L2.d)} = \begin{pmatrix} ${2}\lambda - \mu - ${3} \\ ${2}\lambda - ${2}\mu + ${2} \\ -${3}\lambda + ${2}\mu - ${7} \end{pmatrix}`}. ${math`D^{${2}}`} is the sum of the squares of its components, by Pythagoras in three dimensions; expanding both that and the given form gives the same quadratic in ${math`\lambda`} and ${math`\mu`}.`,
    t`A square is never negative, so ${math`D^{${2}} \ge ${36}`}, with equality exactly when both squares are ${0}: ${math`\lambda = ${1}`}, and then ${math`${3}\mu - ${4} - ${5} = ${0}`}, so ${math`\mu = ${3}`}.`,
    t`So the minimum distance is ${math`\sqrt{${36}} = ${6}`}, between the points ${computedTex(ptTex(pointAt(L1, BEST_LAMBDA)))} on ${math`L_{${1}}`} and ${computedTex(ptTex(pointAt(L2, BEST_MU)))} on ${math`L_{${2}}`}.`,
    t`Write a squared distance as a sum of squares; each square is least at zero.`,
  ],
  reference: '6',
  verify: () => {
    for (const [lambda, mu] of [[0, 0], [1, 3], [-2, 5], [3, -1], [0.5, 2.5]] as const) {
      const diff = sub3(pointAt(L1, lambda), pointAt(L2, mu));
      if (Math.abs(dot(diff, diff) - d2Formula(lambda, mu)) > 1e-9) return `D^2 differs from the formula at lambda = ${lambda}, mu = ${mu}`;
    }
    // At the closest points the join is perpendicular to both lines.
    const join = sub3(pointAt(L1, BEST_LAMBDA), pointAt(L2, BEST_MU));
    if (dot(join, L1.d) !== 0 || dot(join, L2.d) !== 0) return 'the join of the closest points is not perpendicular to both lines';
    return Math.sqrt(dot(join, join)) === 6 ? null : `closest distance ${Math.sqrt(dot(join, join))}`;
  },
  misconceptions: [
    { response: '36', why: t`${36} is the least value of ${math`D^{${2}}`}. The distance is its square root.` },
  ],
  official: { source: cite('stepdb-07-sol', 'STEP I, Q7(i) (page 12 of the PDF)'), answer: '6', agrees: true, note: 'The solution says "the minimum value of D^2 is therefore 6", a slip for D: the least value of D^2 is 36, so the least distance is 6, between the points (3, 2, -1) and (7, 4, 3) that the solution also gives.' },
});
const step07Family = supervision({
  id: 'step07-q7-ii',
  source: cite('stepdb-07-s1', 'Q7(ii)'),
  title: t`A line and a family of lines`,
  prompt: t`The line ${math`L_{${3}}`} has vector equation ${math`\mathbf{r} = ${col([2, 3, 5])} + \alpha${col([0, 1, 0])}`}. The line ${math`L_{${4}}`} has vector equation ${math`\mathbf{r} = ${col([3, 3, -2])} + \beta\begin{pmatrix} ${4}k \\ ${1} - k \\ -${3}k \end{pmatrix}`}. Determine the minimum distance between these two lines, explaining geometrically the two different cases that arise according to the value of ${math`k`}.`,
  hints: [
    t`For which value of ${math`k`} are the two lines parallel?`,
    t`For parallel lines, how is the distance found from the vector joining a point of each, with its part along the common direction removed?`,
    t`Otherwise, as in (i), which choice of ${math`\alpha`} and ${math`\beta`} makes the join perpendicular to both lines, and is the distance then the same for every such ${math`k`}?`,
  ],
  writeUp: 'proof',
  official: cite('stepdb-07-sol', 'STEP I, Q7(ii) (page 12 of the PDF)'),
});

// ---------------------------------------------------------------- lesson

const EXA = [2, -1, 3];
const EXD = [1, 2, -1];

export const vectorLines: TopicContent = {
  topicId: 'geom.vector-lines',
  goal: t`Write a line as ${math`\mathbf{r} = \mathbf{a} + t\mathbf{d}`}, and decide whether two lines in space meet, are parallel, or are skew.`,
  objective: t`Write a line in space as a point plus multiples of a direction, and decide how two lines sit.`,
  why: t`In three dimensions ${math`y = mx + c`} no longer works; this form does, and planes and mechanics build on it.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`A line without y equals mx plus c` },
    { kind: 'hook', text: t`In the plane, a line is ${math`y = mx + c`}. In space there is no single gradient: a line can climb in ${math`z`} while it runs in ${math`x`} and ${math`y`}. Yet a line is still the simplest thing there is: start somewhere, and walk in a fixed direction. Can we write exactly that?` },
    { kind: 'definition', name: t`Vector equation of a line`, formal: t`The [[vector-line|line]] through the point with position vector ${ma} in the direction ${md} (with ${math`\mathbf{d} \neq \mathbf{${0}}`}) is the set of points with position vectors ${math`\mathbf{r} = \mathbf{a} + t\mathbf{d}`}, for ${math`t \in \mathbb{R}`}.`, plain: t`Start at ${ma}, walk ${math`t`} steps of ${md}. Each real ${math`t`} gives one point. With ${math`\mathbf{a} = ${col(EXA)}`} and ${math`\mathbf{d} = ${col(EXD)}`}, ${math`t = ${2}`} gives ${math`${col(add3(EXA, scale3(2, EXD)))}`}.` },
    { kind: 'p', text: t`A point lies on the line exactly when one value of ${math`t`} produces all three of its coordinates. Two points ${math`P`} and ${math`Q`} determine a line: take ${math`\mathbf{a} = \mathbf{p}`} and ${math`\mathbf{d} = \mathbf{q} - \mathbf{p}`}, the step from ${math`P`} to ${math`Q`}. With ${math`P = (${1}, ${2}, ${0})`} and ${math`Q = (${4}, ${0}, ${1})`}, that gives ${math`\mathbf{r} = ${col([1, 2, 0])} + t${col([3, -2, 1])}`}: ${math`t = ${0}`} gives ${math`P`} and ${math`t = ${1}`} gives ${math`Q`}.` },
    checkFrom(onLine, { a: EXA, d: EXD, t0: 3, hide: 2 }, t`The ${math`x`}-coordinate gives ${math`t = ${3}`}; then ${math`z = ${3} - ${3}`}.`),
    { kind: 'section', title: t`Two lines in space` },
    { kind: 'theorem', name: t`Three possibilities`, statement: t`Two different lines in space either meet in exactly one point, or are parallel (their directions are multiples of each other), or are skew: not parallel and not meeting.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Parallel?`, text: t`If ${math`\mathbf{d}_{${2}} = k\mathbf{d}_{${1}}`} for some ${math`k`}, the lines are parallel (or the same line, if they share a point).` },
        { label: t`Equate`, text: t`Otherwise set ${math`\mathbf{a}_{${1}} + s\mathbf{d}_{${1}} = \mathbf{a}_{${2}} + t\mathbf{d}_{${2}}`}: three equations, one per component, in two unknowns ${math`s`} and ${math`t`}.` },
        { label: t`Solve two, test the third`, text: t`Solve two of the equations for ${math`s`} and ${math`t`}. If the third also holds, the lines meet, at the point given by either line; if not, they are skew.`, why: { q: t`Why can two of the equations always be solved?`, a: t`When the directions are not parallel, there is a pair of components in which the two directions are not multiples of each other (if every pair were, the whole directions would be). The two equations from that pair are like two non-parallel lines in the plane: they have exactly one solution. Choose that pair. Three equations in two unknowns, though, can be inconsistent: that is the skew case.` } },
      ],
    },
    { kind: 'p', text: t`[[skew-lines|Skew lines]] have no counterpart in the plane, where non-parallel lines always cross. Think of a road on a bridge and a railway passing underneath at an angle: neither parallel nor meeting.` },
    checkFrom(meet, { P: [1, 2, 3], d1: [1, 0, 1], d2: [0, 1, -1], s0: 2, t0: -1 }, t`Solve the first two components for ${math`s`} and ${math`t`}, then substitute.`),
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`If two of the three component equations have a solution, the lines meet.`, counterexample: t`For ${math`\mathbf{r} = s${col([1, 0, 0])}`} and ${math`\mathbf{r} = ${col([0, 0, 1])} + t${col([0, 1, 0])}`}, the ${math`x`} and ${math`y`} equations give ${math`s = ${0}`}, ${math`t = ${0}`}, but the ${math`z`} equation says ${math`${0} = ${1}`}. The lines are skew.` },
    { kind: 'pitfall', claim: t`Two lines with different equations are different lines.`, counterexample: t`${math`\mathbf{r} = ${col([0, 0, 0])} + t${col([1, 1, 1])}`} and ${math`\mathbf{r} = ${col([2, 2, 2])} + t${col([-3, -3, -3])}`} are the same line: the second starts on the first and walks along it backwards in bigger steps.` },
    { kind: 'takeaway', text: t`A line is ${math`\mathbf{r} = \mathbf{a} + t\mathbf{d}`}; two lines in space are parallel, meet, or are skew, and equating components (two to solve, the third to test) tells which.` },
  ],
  examples: [
    workedCambridge(ve1),
    worked(meet, { P: [2, -1, 4], d1: [1, 2, 0], d2: [3, -1, 2], s0: 1, t0: 2 }, t`Where two lines meet`),
    worked(lineKind, { a1: [0, 0, 0], d1: [1, 0, 0], a2: [0, 0, 1], d2: [0, 1, 0] }, t`Skew lines`),
  ],
  generators: [onLine, meet, lineKind],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['vector-line', 'skew-lines'],
  cambridge: withUses([step07Skew, step07Family, ve1proof, ve1b], {
    'step07-q7-i': { sections: ['A line without y equals mx plus c', 'Two lines in space'], note: t`The distance between a point of each line, made least by completing squares` },
    'step07-q7-ii': { sections: ['A line without y equals mx plus c', 'Two lines in space'], note: t`The least distance between a line and a family of lines, and the parallel case` },
    'nst-ve1': { sections: ['A line without y equals mx plus c'], note: t`Collinearity and the equation of a line, and why it is not unique` },
    'nst-ve1-point': { sections: ['A line without y equals mx plus c'], note: t`A point on a line through three given points` },
  }),
  // 2007 STEP I Q7. NST VE1 is the worked example, so its two forms are practice (2026-10-07).
  gate: ['step07-q7-i', 'step07-q7-ii'],
  recall: [
    { front: t`Write the vector equation of the line through ${ma} in direction ${md}.`, back: t`${math`\mathbf{r} = \mathbf{a} + t\mathbf{d}`}, ${math`t \in \mathbb{R}`}.` },
    { front: t`How do you decide whether two lines in space meet?`, back: t`If not parallel, equate components, solve two equations for the parameters, and test the third: it holds if they meet, fails if they are skew.` },
  ],
  proofOrder: [
    {
      title: t`Deciding how two lines sit`,
      steps: [
        t`Check whether the directions are multiples of each other.`,
        t`If not, equate the two position vectors, component by component.`,
        t`Solve two of the three equations for the two parameters.`,
        t`Test the third equation: it holds if they meet, fails if they are skew.`,
      ],
    },
  ],
};
