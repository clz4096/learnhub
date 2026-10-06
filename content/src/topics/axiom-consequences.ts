/**
 * prob.axiom-consequences: from the axioms alone, P(A^c) = 1 - P(A), A ⊆ B implies
 * P(A) <= P(B), and P(A ∪ B) = P(A) + P(B) - P(A ∩ B). From IA Probability Example Sheet 1
 * Q4(b) to (e), proved "starting from the definitions". The sheet has no official
 * solutions; the numerical answers are checked on explicit finite probability spaces.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { add, int, mul, pick, q, sample, str, sub, type Rational } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { join, math, t, type Rich, type Span } from '../rich';
import { worked, workedProof, type TopicContent } from '../topic';

const S1 = 'ia-prob-sheet-1' as const;
const [mA, mB, mO] = [math`A`, math`B`, math`\Omega`];
const DEN = 12;
const lt = (a: Rational, b: Rational): boolean => a.num * b.den < b.num * a.den;
const maxR = (a: Rational, b: Rational): Rational => (lt(a, b) ? b : a);
const minR = (a: Rational, b: Rational): Rational => (lt(a, b) ? a : b);
const distinctFrom = (right: string, xs: readonly string[]): number => new Set(xs.filter((x) => x !== right)).size;

/** A finite model: a space of 12 equally likely points with A and B as sets of points, to check a formula by counting. */
function model(a: number, b: number, ab: number): { A: Set<number>; B: Set<number> } {
  const A = new Set<number>(Array.from({ length: a }, (_, i) => i));
  const B = new Set<number>([...Array.from({ length: ab }, (_, i) => i), ...Array.from({ length: b - ab }, (_, i) => a + i)]);
  return { A, B };
}

// ---------------------------------------------------------------- from three numbers

type Target = 'union' | 'onlyB' | 'neither' | 'onlyA' | 'exactlyOne';
interface ThreeP { a: number; b: number; ab: number; target: Target }
const TARGET_TEX: Readonly<Record<Target, Span>> = {
  union: math`\mathbb{P}(A \cup B)`,
  onlyB: math`\mathbb{P}(A^{c} \cap B)`,
  neither: math`\mathbb{P}(A^{c} \cap B^{c})`,
  onlyA: math`\mathbb{P}(A \cap B^{c})`,
  exactlyOne: math`\mathbb{P}((A \cap B^{c}) \cup (A^{c} \cap B))`,
};
const val = ({ a, b, ab, target }: ThreeP): Rational => {
  const [pa, pb, pab] = [q(a, DEN), q(b, DEN), q(ab, DEN)];
  const u = sub(add(pa, pb), pab);
  return target === 'union' ? u : target === 'onlyB' ? sub(pb, pab) : target === 'neither' ? sub(q(1), u) : target === 'onlyA' ? sub(pa, pab) : sub(u, pab);
};
const threeMis = (p: ThreeP): string[] => {
  const [pa, pb, pab] = [q(p.a, DEN), q(p.b, DEN), q(p.ab, DEN)];
  return [str(add(pa, pb)), str(sub(q(1), add(pa, pb))), str(sub(pb, pa)), str(sub(add(pa, pb), mul(q(2), pab))), str(sub(q(1), pb))];
};

const fromThree = generator<ThreeP>({
  id: 'from-three',
  skill: 'From P(A), P(B), and P(A ∩ B), find the probability of any event built from A and B, by the complement rule and the addition rule.',
  params: (rng) => {
    for (;;) {
      const a = int(rng, 2, 9);
      const b = int(rng, 2, 9);
      const ab = int(rng, 1, Math.min(a, b) - 1);
      const p: ThreeP = { a, b, ab, target: pick(rng, ['union', 'onlyB', 'neither', 'onlyA', 'exactlyOne'] as const) };
      if (a + b - ab <= DEN - 1 && a !== b && distinctFrom(str(val(p)), threeMis(p)) >= 2) return p;
    }
  },
  sane: ({ a, b, ab }) => (ab < Math.min(a, b) && a + b - ab < DEN ? null : 'out of range'),
  problem: (p) => {
    const [pa, pb, pab] = [q(p.a, DEN), q(p.b, DEN), q(p.ab, DEN)];
    const u = sub(add(pa, pb), pab);
    const steps: Record<Target, Rich> = {
      union: t`The addition rule: ${math`\mathbb{P}(A \cup B) = ${pa} + ${pb} - ${pab} = ${u}`}.`,
      onlyB: t`${mB} is the disjoint union of ${math`A \cap B`} and ${math`A^{c} \cap B`}, so ${math`\mathbb{P}(A^{c} \cap B) = \mathbb{P}(B) - \mathbb{P}(A \cap B) = ${pb} - ${pab} = ${val(p)}`}.`,
      neither: t`${math`A^{c} \cap B^{c} = (A \cup B)^{c}`}, so it is ${math`${1} - \mathbb{P}(A \cup B) = ${1} - (${pa} + ${pb} - ${pab}) = ${val(p)}`}.`,
      onlyA: t`${mA} is the disjoint union of ${math`A \cap B`} and ${math`A \cap B^{c}`}, so ${math`\mathbb{P}(A \cap B^{c}) = ${pa} - ${pab} = ${val(p)}`}.`,
      exactlyOne: t`Exactly one of ${mA}, ${mB} is the union minus the intersection: ${math`${u} - ${pab} = ${val(p)}`}.`,
    };
    return {
      prompt: t`Events ${mA} and ${mB} have ${math`\mathbb{P}(A) = ${pa}`}, ${math`\mathbb{P}(B) = ${pb}`}, and ${math`\mathbb{P}(A \cap B) = ${pab}`}. Find ${TARGET_TEX[p.target]}.`,
      answer: { kind: 'exact', expected: str(val(p)) },
      solution: [steps[p.target]],
    };
  },
  solve: (p) => {
    // Count points in a 12-point model with these probabilities.
    const { A, B } = model(p.a, p.b, p.ab);
    const pts = Array.from({ length: DEN }, (_, i) => i);
    const f: Record<Target, (x: number) => boolean> = {
      union: (x) => A.has(x) || B.has(x),
      onlyB: (x) => !A.has(x) && B.has(x),
      neither: (x) => !A.has(x) && !B.has(x),
      onlyA: (x) => A.has(x) && !B.has(x),
      exactlyOne: (x) => A.has(x) !== B.has(x),
    };
    return str(q(pts.filter(f[p.target]).length, DEN));
  },
  misconceptions: (p): Misconception[] => {
    const [pa, pb, pab] = [q(p.a, DEN), q(p.b, DEN), q(p.ab, DEN)];
    return [
      { response: str(add(pa, pb)), why: t`Adding ${math`\mathbb{P}(A)`} and ${math`\mathbb{P}(B)`} counts ${math`A \cap B`} twice; it is not a probability of anything here.` },
      { response: str(sub(q(1), add(pa, pb))), why: t`${math`${1} - \mathbb{P}(A) - \mathbb{P}(B)`} takes ${math`A \cap B`} away twice. Use ${math`${1} - \mathbb{P}(A \cup B)`}.` },
      { response: str(sub(pb, pa)), why: t`Subtracting ${math`\mathbb{P}(A)`} removes all of ${mA}, but only ${math`A \cap B`} lies inside ${mB}.` },
      { response: str(sub(add(pa, pb), mul(q(2), pab))), why: t`That is the probability of exactly one of the two events.` },
      { response: str(sub(q(1), pb)), why: t`That is ${math`\mathbb{P}(B^{c})`}, which includes ${math`A \cap B^{c}`} as well.` },
    ];
  },
});

// ---------------------------------------------------------------- bounds

type BKind = 'cap-max' | 'cap-min' | 'cup-max' | 'cup-min';
interface BoundP { a: number; b: number; kind: BKind }
const bVal = ({ a, b, kind }: BoundP): Rational => {
  const [pa, pb] = [q(a, DEN), q(b, DEN)];
  if (kind === 'cap-max') return minR(pa, pb);
  if (kind === 'cap-min') return maxR(q(0), sub(add(pa, pb), q(1)));
  if (kind === 'cup-max') return minR(q(1), add(pa, pb));
  return maxR(pa, pb);
};
const bMis = ({ a, b, kind }: BoundP): string[] => {
  const [pa, pb] = [q(a, DEN), q(b, DEN)];
  return [str(mul(pa, pb)), str(bVal({ a, b, kind: kind === 'cap-max' ? 'cap-min' : kind === 'cap-min' ? 'cap-max' : kind === 'cup-max' ? 'cup-min' : 'cup-max' })), str(add(pa, pb)), '0'];
};

const bounds = generator<BoundP>({
  id: 'bounds',
  skill: 'Find the largest or smallest possible P(A ∩ B) or P(A ∪ B) from P(A) and P(B), using monotonicity and P(A ∪ B) <= 1.',
  params: (rng) => {
    for (;;) {
      const p: BoundP = { a: int(rng, 2, 10), b: int(rng, 2, 10), kind: pick(rng, ['cap-max', 'cap-min', 'cup-max', 'cup-min'] as const) };
      if (p.a !== p.b && distinctFrom(str(bVal(p)), bMis(p)) >= 2) return p;
    }
  },
  sane: ({ a, b }) => (a !== b && a < DEN && b < DEN ? null : 'out of range'),
  problem: (p) => {
    const [pa, pb] = [q(p.a, DEN), q(p.b, DEN)];
    const what = p.kind.startsWith('cap') ? math`\mathbb{P}(A \cap B)` : math`\mathbb{P}(A \cup B)`;
    const which = p.kind.endsWith('max') ? 'largest' : 'smallest';
    const why: Record<BKind, Rich> = {
      'cap-max': t`${math`A \cap B \subseteq A`} and ${math`A \cap B \subseteq B`}, so by monotonicity ${math`\mathbb{P}(A \cap B) \le \min(${pa}, ${pb}) = ${bVal(p)}`}; equality when one event lies inside the other.`,
      'cap-min': t`${math`\mathbb{P}(A \cap B) = \mathbb{P}(A) + \mathbb{P}(B) - \mathbb{P}(A \cup B) \ge ${pa} + ${pb} - ${1}`}, since ${math`\mathbb{P}(A \cup B) \le ${1}`}; and it is at least ${0}. So the least value is ${bVal(p)}, when the events overlap as little as possible.`,
      'cup-max': t`${math`\mathbb{P}(A \cup B) = \mathbb{P}(A) + \mathbb{P}(B) - \mathbb{P}(A \cap B) \le ${pa} + ${pb}`}, and it is at most ${1}. So the largest value is ${bVal(p)}, when the overlap is as small as possible.`,
      'cup-min': t`${math`A \subseteq A \cup B`} and ${math`B \subseteq A \cup B`}, so by monotonicity ${math`\mathbb{P}(A \cup B) \ge \max(${pa}, ${pb}) = ${bVal(p)}`}; equality when one event lies inside the other.`,
    };
    return {
      prompt: t`Events ${mA} and ${mB} have ${math`\mathbb{P}(A) = ${pa}`} and ${math`\mathbb{P}(B) = ${pb}`}. What is the ${which} possible value of ${what}?`,
      answer: { kind: 'exact', expected: str(bVal(p)) },
      solution: [why[p.kind]],
    };
  },
  solve: ({ a, b, kind }) => {
    // Try every overlap in a 12-point model and take the extreme.
    const vals = Array.from({ length: Math.min(a, b) + 1 }, (_, ab) => ab).filter((ab) => a + b - ab <= DEN).map((ab) => (kind.startsWith('cap') ? ab : a + b - ab));
    return str(q(kind.endsWith('max') ? Math.max(...vals) : Math.min(...vals), DEN));
  },
  misconceptions: (p): Misconception[] => {
    const [pa, pb] = [q(p.a, DEN), q(p.b, DEN)];
    const other: BKind = p.kind === 'cap-max' ? 'cap-min' : p.kind === 'cap-min' ? 'cap-max' : p.kind === 'cup-max' ? 'cup-min' : 'cup-max';
    return [
      { response: str(mul(pa, pb)), why: t`${math`\mathbb{P}(A)\mathbb{P}(B)`} is ${math`\mathbb{P}(A \cap B)`} only for independent events. Nothing here says they are independent.` },
      { response: str(bVal({ ...p, kind: other })), why: t`That is the ${p.kind.endsWith('max') ? 'smallest' : 'largest'} possible value.` },
      { response: str(add(pa, pb)), why: t`${math`\mathbb{P}(A) + \mathbb{P}(B)`} can exceed every probability: a probability is at most ${1}, and the overlap is counted twice.` },
      { response: '0', why: t`${p.kind.startsWith('cap') ? t`The events must overlap when ${math`\mathbb{P}(A) + \mathbb{P}(B) > ${1}`}, and they can overlap a lot.` : t`A union is at least as likely as each event in it.`}` },
    ];
  },
});

// ---------------------------------------------------------------- consistent assignments

interface Triple { a: Rational; b: Rational; ab: Rational }
interface ConsP { ts: readonly Triple[] }
const okCap = (x: Triple): boolean => !lt(minR(x.a, x.b), x.ab);
const okUnion = (x: Triple): boolean => !lt(q(1), sub(add(x.a, x.b), x.ab));

const consistent = generator<ConsP>({
  id: 'consistent',
  skill: 'Decide whether given values of P(A), P(B), and P(A ∩ B) are possible: the intersection is at most each event, and the union, P(A) + P(B) - P(A ∩ B), is at most 1.',
  params: (rng) => {
    const mk = (kind: 'ok' | 'cap' | 'union'): Triple => {
      for (;;) {
        const [a, b, ab] = [int(rng, 1, 11), int(rng, 1, 11), int(rng, 0, 11)];
        const x: Triple = { a: q(a, DEN), b: q(b, DEN), ab: q(ab, DEN) };
        if (kind === 'ok' && okCap(x) && okUnion(x)) return x;
        if (kind === 'cap' && !okCap(x) && okUnion(x)) return x;
        if (kind === 'union' && okCap(x) && !okUnion(x)) return x;
      }
    };
    return { ts: sample(rng, [mk('ok'), mk(pick(rng, ['ok', 'cap', 'union'] as const)), mk('cap'), mk('union')], 4) };
  },
  sane: ({ ts }) => (ts.length === 4 ? null : 'out of range'),
  problem: ({ ts }) => {
    const lab = (x: Triple): Rich => t`${math`\mathbb{P}(A) = ${x.a}`}, ${math`\mathbb{P}(B) = ${x.b}`}, ${math`\mathbb{P}(A \cap B) = ${x.ab}`}`;
    const options: ChoiceOption[] = ts.map((x, i) => ({ id: `t${i}`, label: lab(x) }));
    return {
      prompt: t`Which of these sets of values are possible for two events ${mA} and ${mB}? ${join(ts.map(lab), '; ')}. Choose all that are.`,
      answer: { kind: 'choice', options, correct: ts.flatMap((x, i) => (okCap(x) && okUnion(x) ? [`t${i}`] : [])) },
      solution: [
        t`Two conditions are needed, and enough: ${math`\mathbb{P}(A \cap B) \le \min(\mathbb{P}(A), \mathbb{P}(B))`} (monotonicity), and ${math`\mathbb{P}(A \cup B) = \mathbb{P}(A) + \mathbb{P}(B) - \mathbb{P}(A \cap B) \le ${1}`}. When both hold, a space of ${DEN} equally likely points realises the values.`,
        join(ts.map((x) => [...lab(x), ...t`: ${okCap(x) ? (okUnion(x) ? t`possible` : t`impossible, the union would have probability ${sub(add(x.a, x.b), x.ab)}`) : t`impossible, the intersection exceeds an event`}`]), '; '),
      ],
    };
  },
  solve: ({ ts }) => ts.flatMap((x, i) => {
    // Build the four atoms of the partition by A and B; each must be at least 0.
    const atoms = [x.ab, sub(x.a, x.ab), sub(x.b, x.ab), sub(sub(q(1), add(x.a, x.b)), mul(q(-1), x.ab))];
    return atoms.every((r) => r.num >= 0n) ? [`t${i}`] : [];
  }),
  misconceptions: ({ ts }): Misconception[] => [
    { response: ts.flatMap((x, i) => (okCap(x) ? [`t${i}`] : [])), why: t`The union must have probability at most ${1}: check ${math`\mathbb{P}(A) + \mathbb{P}(B) - \mathbb{P}(A \cap B) \le ${1}`}.` },
    { response: ts.flatMap((x, i) => (okUnion(x) ? [`t${i}`] : [])), why: t`${math`A \cap B`} lies inside ${mA} and inside ${mB}, so its probability can be no larger than either.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const q4d = workedProof({
  title: t`Monotonicity from the axioms`,
  prompt: t`Example Sheet ${1}, Q${4}(d): show, starting from the definitions, that if ${math`A_{${1}} \subseteq A_{${2}}`} then ${math`\mathbb{P}(A_{${1}}) \le \mathbb{P}(A_{${2}})`}.`,
  steps: [
    t`Write ${math`A_{${2}}`} as a disjoint union: ${math`A_{${2}} = A_{${1}} \cup (A_{${2}} \setminus A_{${1}})`}, where ${math`A_{${2}} \setminus A_{${1}} = A_{${2}} \cap A_{${1}}^{c}`} is an event because events are closed under complements and intersections.`,
    t`By additivity for two disjoint events (part (c)), ${math`\mathbb{P}(A_{${2}}) = \mathbb{P}(A_{${1}}) + \mathbb{P}(A_{${2}} \setminus A_{${1}})`}.`,
    t`The second term is at least ${0} by the first axiom, so ${math`\mathbb{P}(A_{${2}}) \ge \mathbb{P}(A_{${1}})`}.`,
  ],
  answer: t`${math`A_{${1}} \subseteq A_{${2}} \implies \mathbb{P}(A_{${1}}) \le \mathbb{P}(A_{${2}})`}.`,
  source: cite(S1, 'Q4(d)'),
});

const [Q4A, Q4B, Q4U] = [q(1, 2), q(1, 3), q(3, 4)];
const q4e = auto({
  id: 'ia-q4-e-numbers',
  source: cite(S1, 'Q4(e)', true),
  title: t`The addition rule with numbers`,
  prompt: t`Q${4}(e) proves ${math`\mathbb{P}(A_{${1}} \cup A_{${2}}) = \mathbb{P}(A_{${1}}) + \mathbb{P}(A_{${2}}) - \mathbb{P}(A_{${1}} \cap A_{${2}})`}. If ${math`\mathbb{P}(A_{${1}}) = ${Q4A}`}, ${math`\mathbb{P}(A_{${2}}) = ${Q4B}`}, and ${math`\mathbb{P}(A_{${1}} \cup A_{${2}}) = ${Q4U}`}, what is ${math`\mathbb{P}(A_{${1}} \cap A_{${2}})`}?`,
  answer: { kind: 'exact', expected: str(sub(add(Q4A, Q4B), Q4U)) },
  solution: [t`Rearrange: ${math`\mathbb{P}(A_{${1}} \cap A_{${2}}) = ${Q4A} + ${Q4B} - ${Q4U} = ${sub(add(Q4A, Q4B), Q4U)}`}.`],
  reference: str(sub(add(Q4A, Q4B), Q4U)),
  verify: () => {
    // A twelve-point model: A1 = {0, ..., 5}, A2 = {5, 6, 7, 8}; the union has 9 of 12 points.
    const A1 = new Set([0, 1, 2, 3, 4, 5]);
    const A2 = new Set([5, 6, 7, 8]);
    const pts = Array.from({ length: 12 }, (_, i) => i);
    return same('a twelve-point model', [pts.filter((x) => A1.has(x)).length, pts.filter((x) => A2.has(x)).length, pts.filter((x) => A1.has(x) || A2.has(x)).length, pts.filter((x) => A1.has(x) && A2.has(x)).length].join(), '6,4,9,1');
  },
  misconceptions: [{ response: str(mul(Q4A, Q4B)), why: t`That would be the answer for independent events. Use the addition rule, which holds for any two events.` }],
});

const q4b = supervision({
  id: 'ia-q4-b',
  source: cite(S1, 'Q4(b)'),
  title: t`The complement rule`,
  prompt: t`Show, starting from the definitions, that ${math`\mathbb{P}(\varnothing) = ${0}`} and ${math`\mathbb{P}(A_{${1}}^{c}) = ${1} - \mathbb{P}(A_{${1}})`}. Which axioms does each part use?`,
  writeUp: 'proof',
});
const q4eproof = supervision({
  id: 'ia-q4-e',
  source: cite(S1, 'Q4(e)'),
  title: t`The addition rule for two events`,
  prompt: t`Show, starting from the definitions, that ${math`\mathbb{P}(A_{${1}} \cup A_{${2}}) = \mathbb{P}(A_{${1}}) + \mathbb{P}(A_{${2}}) - \mathbb{P}(A_{${1}} \cap A_{${2}})`}. Hint: split ${math`A_{${1}} \cup A_{${2}}`} and ${math`A_{${2}}`} into disjoint pieces.`,
  writeUp: 'proof',
});
const boundsProof = supervision({
  id: 'ia-q4-bounds',
  source: cite(S1, 'Q4(d), (e)', true),
  title: t`The Bonferroni bounds for two events`,
  prompt: t`Using only parts (b) to (e), prove that ${math`\max(${0}, \mathbb{P}(A) + \mathbb{P}(B) - ${1}) \le \mathbb{P}(A \cap B) \le \min(\mathbb{P}(A), \mathbb{P}(B))`}, and show by examples on a finite space that both bounds can be attained.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

export const axiomConsequences: TopicContent = {
  topicId: 'prob.axiom-consequences',
  goal: t`Prove the complement rule, monotonicity, and the addition rule for two events from the axioms, and use them to find and bound probabilities.`,
  lesson: [
    { kind: 'p', text: t`The axioms say little: probabilities are at least ${0}, ${math`\mathbb{P}(\Omega) = ${1}`}, and probabilities of disjoint events add. Everything familiar follows, by splitting events into disjoint pieces. Example Sheet ${1} Q${4} asks for these proofs "starting from the definitions".` },
    { kind: 'rule', text: t`For events ${mA} and ${mB}: ${math`\mathbb{P}(A^{c}) = ${1} - \mathbb{P}(A)`}; if ${math`A \subseteq B`} then ${math`\mathbb{P}(A) \le \mathbb{P}(B)`} ([[monotonicity|monotonicity]]); and ${math`\mathbb{P}(A \cup B) = \mathbb{P}(A) + \mathbb{P}(B) - \mathbb{P}(A \cap B)`}.` },
    { kind: 'p', text: t`Each is one split. ${mO} is the disjoint union of ${mA} and ${math`A^{c}`}, so the complement rule. ${mB} is the disjoint union of ${mA} and ${math`B \setminus A`} when ${math`A \subseteq B`}, and the second piece has probability at least ${0}. ${math`A \cup B`} is the disjoint union of ${mA} and ${math`B \setminus A`}, and ${math`\mathbb{P}(B \setminus A) = \mathbb{P}(B) - \mathbb{P}(A \cap B)`}.` },
    { kind: 'p', text: t`From ${math`\mathbb{P}(A)`}, ${math`\mathbb{P}(B)`}, and ${math`\mathbb{P}(A \cap B)`}, every event built from ${mA} and ${mB} follows. With ${math`\mathbb{P}(A) = ${q(1, 2)}`}, ${math`\mathbb{P}(B) = ${q(1, 3)}`}, ${math`\mathbb{P}(A \cap B) = ${q(1, 4)}`}: ${math`\mathbb{P}(A \cup B) = ${sub(add(q(1, 2), q(1, 3)), q(1, 4))}`}, neither has probability ${sub(q(1), sub(add(q(1, 2), q(1, 3)), q(1, 4)))}, and ${mB} without ${mA} has ${sub(q(1, 3), q(1, 4))}.` },
    { kind: 'p', text: t`Without ${math`\mathbb{P}(A \cap B)`}, the rules still bound it: ${math`\max(${0}, \mathbb{P}(A) + \mathbb{P}(B) - ${1}) \le \mathbb{P}(A \cap B) \le \min(\mathbb{P}(A), \mathbb{P}(B))`}. With ${math`\mathbb{P}(A) = ${q(3, 4)}`} and ${math`\mathbb{P}(B) = ${q(2, 3)}`}, the overlap is between ${sub(add(q(3, 4), q(2, 3)), q(1))} and ${minR(q(3, 4), q(2, 3))}: two likely events must overlap.` },
  ],
  examples: [
    q4d,
    worked(fromThree, { a: 6, b: 4, ab: 3, target: 'neither' }, t`Neither event`),
    worked(bounds, { a: 9, b: 8, kind: 'cap-min' }, t`The least possible overlap`),
  ],
  generators: [fromThree, bounds, consistent],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['monotonicity'],
  cambridge: [q4e, q4b, q4eproof, boundsProof],
  gate: ['ia-q4-e-numbers', 'ia-q4-b', 'ia-q4-e', 'ia-q4-bounds'],
};
