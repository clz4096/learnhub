/**
 * prob.inclusion-exclusion-three: Inclusion-exclusion for three events: add the singles,
 * subtract the pairs, add back the triple. From IA Probability Example Sheet 1 Q5: (a) the
 * identity for P(A^c ∩ (B ∪ C)), and (b) how many of 1, ..., 500 are not divisible by 7
 * but are divisible by 3 or 5. The sheet has no official solutions; every count here is
 * checked by brute force.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision } from '../cambridge';
import { add, int, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { dmath, math, t } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';

const [mA, mB, mC] = [math`A`, math`B`, math`C`];
const fl = (n: number, d: number): number => Math.floor(n / d);
const lcm = (a: number, b: number): number => { let x = a; let y = b; while (y !== 0) [x, y] = [y, x % y]; return (a / x) * b; };

// ---------------------------------------------------------------- counting multiples

interface MultP { n: number; a: number; b: number; c: number }

const multiples = generator<MultP>({
  id: 'multiples',
  skill: 'Count the numbers up to N divisible by at least one of three numbers: singles, minus pairs, plus the triple.',
  params: (rng) => {
    const trios = [[2, 3, 5], [2, 3, 7], [2, 5, 7], [3, 5, 7], [3, 4, 5], [2, 5, 9], [4, 5, 7], [3, 5, 11]] as const;
    for (;;) {
      const [a, b, c] = pick(rng, trios);
      const n = pick(rng, [100, 120, 200, 300, 500, 1000]);
      // At least one multiple of all three, so leaving out the triple gives a wrong answer.
      if (n >= lcm(lcm(a, b), c)) return { n, a, b, c };
    }
  },
  sane: ({ n, a, b, c }) => (n >= 100 && a > 1 && b > a && c > b && n >= lcm(lcm(a, b), c) ? null : 'out of range'),
  problem: ({ n, a, b, c }) => {
    const [ab, ac, bc, abc] = [lcm(a, b), lcm(a, c), lcm(b, c), lcm(lcm(a, b), c)];
    const singles = fl(n, a) + fl(n, b) + fl(n, c);
    const pairs = fl(n, ab) + fl(n, ac) + fl(n, bc);
    const ans = singles - pairs + fl(n, abc);
    return {
      prompt: t`How many of the numbers ${1}, ${2}, ..., ${n} are divisible by ${a}, by ${b}, or by ${c} (at least one of them)?`,
      answer: { kind: 'exact', expected: String(ans) },
      solution: [
        t`Singles: ${math`\lfloor ${n}/${a} \rfloor + \lfloor ${n}/${b} \rfloor + \lfloor ${n}/${c} \rfloor = ${fl(n, a)} + ${fl(n, b)} + ${fl(n, c)} = ${singles}`}.`,
        t`Pairs: divisible by both of two means divisible by their least common multiple, ${ab}, ${ac}, ${bc}: ${math`${fl(n, ab)} + ${fl(n, ac)} + ${fl(n, bc)} = ${pairs}`}. Triple: multiples of ${abc}, ${fl(n, abc)}.`,
        t`By [[inclusion-exclusion|inclusion-exclusion]], ${math`${singles} - ${pairs} + ${fl(n, abc)} = ${ans}`}.`,
      ],
    };
  },
  solve: ({ n, a, b, c }) => String([...Array(n).keys()].map((i) => i + 1).filter((x) => x % a === 0 || x % b === 0 || x % c === 0).length),
  misconceptions: ({ n, a, b, c }): Misconception[] => {
    const singles = fl(n, a) + fl(n, b) + fl(n, c);
    const pairs = fl(n, lcm(a, b)) + fl(n, lcm(a, c)) + fl(n, lcm(b, c));
    return [
      { response: String(singles), why: t`Adding the singles counts a number divisible by two of them twice. Subtract the pairs.` },
      { response: String(singles - pairs), why: t`Subtracting the pairs removes a multiple of all three, ${lcm(lcm(a, b), c)}, three times after adding it three times. Add the triple back.` },
      { response: String(singles - pairs - fl(n, lcm(lcm(a, b), c))), why: t`The triple is added back, not subtracted: the signs alternate, plus, minus, plus.` },
    ];
  },
});

// ---------------------------------------------------------------- probabilities

/** Eight region probabilities over a common denominator: only A, only B, only C, AB only, AC only, BC only, ABC, none. */
interface ProbP { d: number; r: readonly number[] }
function totals(p: ProbP): { a: Rational; b: Rational; c: Rational; ab: Rational; ac: Rational; bc: Rational; abc: Rational; union: Rational } {
  const [oa, ob, oc, xab, xac, xbc, xabc] = p.r as [number, number, number, number, number, number, number, number];
  const f = (x: number): Rational => q(x, p.d);
  return {
    a: f(oa + xab + xac + xabc), b: f(ob + xab + xbc + xabc), c: f(oc + xac + xbc + xabc),
    ab: f(xab + xabc), ac: f(xac + xabc), bc: f(xbc + xabc), abc: f(xabc),
    union: f(oa + ob + oc + xab + xac + xbc + xabc),
  };
}

const unionThree = generator<ProbP>({
  id: 'union-three',
  skill: 'Find P(A or B or C) from the probabilities of the events, their pairs, and all three.',
  params: (rng) => {
    for (;;) {
      const d = pick(rng, [20, 25, 30, 40, 50]);
      const r = [int(rng, 1, 6), int(rng, 1, 6), int(rng, 1, 6), int(rng, 1, 4), int(rng, 1, 4), int(rng, 1, 4), int(rng, 1, 3)];
      const used = r.reduce((x, y) => x + y, 0);
      if (used < d) return { d, r: [...r, d - used] };
    }
  },
  sane: ({ d, r }) => (r.length === 8 && r.every((x) => x >= 0) && r.reduce((x, y) => x + y, 0) === d ? null : 'out of range'),
  problem: (p) => {
    const T = totals(p);
    return {
      prompt: t`Events ${mA}, ${mB}, ${mC} have ${math`P(A) = ${T.a}`}, ${math`P(B) = ${T.b}`}, ${math`P(C) = ${T.c}`}, ${math`P(A \cap B) = ${T.ab}`}, ${math`P(A \cap C) = ${T.ac}`}, ${math`P(B \cap C) = ${T.bc}`}, and ${math`P(A \cap B \cap C) = ${T.abc}`}. Find ${math`P(A \cup B \cup C)`}.`,
      answer: { kind: 'exact', expected: str(T.union) },
      solution: [
        t`${math`P(A \cup B \cup C) = P(A) + P(B) + P(C) - P(A \cap B) - P(A \cap C) - P(B \cap C) + P(A \cap B \cap C)`}.`,
        t`${math`= ${T.a} + ${T.b} + ${T.c} - ${T.ab} - ${T.ac} - ${T.bc} + ${T.abc} = ${T.union}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Add the seven regions inside the union directly.
    return str(q(p.r.slice(0, 7).reduce((x, y) => x + y, 0), p.d));
  },
  misconceptions: (p): Misconception[] => {
    const T = totals(p);
    const singles = add(add(T.a, T.b), T.c);
    const pairs = add(add(T.ab, T.ac), T.bc);
    return [
      { response: str(singles), why: t`Adding the three counts each overlap more than once. Subtract the pairs and add back the triple.` },
      { response: str(sub(singles, pairs)), why: t`After subtracting the pairs, the part in all three has been counted three times and removed three times. Add ${math`P(A \cap B \cap C)`} back.` },
      { response: str(sub(sub(singles, pairs), T.abc)), why: t`The triple is added, not subtracted: plus, minus, plus.` },
    ];
  },
  trial: (p, rng) => {
    // Pick a region with the given weights; the union is every region but the last.
    let x = Math.floor(rng() * p.d);
    let k = 0;
    while (x >= (p.r[k] as number)) { x -= p.r[k] as number; k++; }
    return k < 7;
  },
});

// ---------------------------------------------------------------- a survey with three overlapping groups

interface SurveyP { total: number; s: readonly number[]; pr: readonly number[]; all: number }
const LANGS = ['French', 'German', 'Spanish'] as const;

const survey = generator<SurveyP>({
  id: 'survey-none',
  skill: 'Count how many are in none of three groups: the total minus the union, found by inclusion-exclusion.',
  params: (rng) => {
    for (;;) {
      const all = int(rng, 1, 5);
      const pr = [all + int(rng, 1, 6), all + int(rng, 1, 6), all + int(rng, 1, 6)];
      const s = [pr[0]! + pr[1]! - all + int(rng, 2, 12), pr[0]! + pr[2]! - all + int(rng, 2, 12), pr[1]! + pr[2]! - all + int(rng, 2, 12)];
      const union = s[0]! + s[1]! + s[2]! - pr[0]! - pr[1]! - pr[2]! + all;
      const total = union + int(rng, 1, 15);
      return { total, s, pr, all };
    }
  },
  sane: ({ total, s, pr, all }) => (s.length === 3 && pr.length === 3 && all >= 1 && total > s.reduce((x, y) => x + y, 0) - pr.reduce((x, y) => x + y, 0) + all ? null : 'out of range'),
  problem: ({ total, s, pr, all }) => {
    const union = s[0]! + s[1]! + s[2]! - pr[0]! - pr[1]! - pr[2]! + all;
    return {
      prompt: t`In a year group of ${total} students, ${s[0]!} study ${LANGS[0]}, ${s[1]!} ${LANGS[1]}, and ${s[2]!} ${LANGS[2]}. ${pr[0]!} study both ${LANGS[0]} and ${LANGS[1]}, ${pr[1]!} both ${LANGS[0]} and ${LANGS[2]}, ${pr[2]!} both ${LANGS[1]} and ${LANGS[2]}, and ${all} study all three. How many study none of the three?`,
      answer: { kind: 'exact', expected: String(total - union) },
      solution: [
        t`Students studying at least one: ${math`${s[0]!} + ${s[1]!} + ${s[2]!} - ${pr[0]!} - ${pr[1]!} - ${pr[2]!} + ${all} = ${union}`}.`,
        t`So ${math`${total} - ${union} = ${total - union}`} study none.`,
      ],
    };
  },
  solve: ({ total, s, pr, all }) => {
    // Fill the seven regions of the Venn diagram from the inside out, then subtract them all.
    const ab = pr[0]! - all;
    const ac = pr[1]! - all;
    const bc = pr[2]! - all;
    const oa = s[0]! - ab - ac - all;
    const ob = s[1]! - ab - bc - all;
    const oc = s[2]! - ac - bc - all;
    return String(total - (oa + ob + oc + ab + ac + bc + all));
  },
  misconceptions: ({ total, s, pr, all }): Misconception[] => {
    const singles = s[0]! + s[1]! + s[2]!;
    const pairs = pr[0]! + pr[1]! + pr[2]!;
    return [
      { response: String(total - (singles - pairs)), why: t`The ${all} who study all three were added three times and subtracted three times, so add them back once.` },
      { response: String(total - (singles - pairs - all)), why: t`The triple is added back, not subtracted.` },
      { response: String(total - singles), why: t`Students in two languages are counted twice that way. Find the union by inclusion-exclusion first, then subtract it from ${total}.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const N5 = 500;
const q5b = (n: number): number => [...Array(n).keys()].map((i) => i + 1).filter((x) => x % 7 !== 0 && (x % 3 === 0 || x % 5 === 0)).length;
const in35 = fl(N5, 3) + fl(N5, 5) - fl(N5, 15);
const with7 = fl(N5, 21) + fl(N5, 35) - fl(N5, 105);

const iaQ5b = auto({
  id: 'ia-q5-b',
  source: cite('ia-prob-sheet-1', 'Q5(b)'),
  title: t`Not by ${7}, but by ${3} or ${5}`,
  prompt: t`How many of the numbers ${1}, ..., ${N5} are not divisible by ${7} but are divisible by ${3} or ${5}?`,
  answer: { kind: 'exact', expected: String(in35 - with7) },
  solution: [
    t`This is part (a) with counting: ${mA} "divisible by ${7}", ${mB} "by ${3}", ${mC} "by ${5}", and we want ${math`|A^{c} \cap (B \cup C)| = |B| + |C| - |B \cap C| - |C \cap A| - |A \cap B| + |A \cap B \cap C|`}.`,
    t`Divisible by ${3} or ${5}: ${math`${fl(N5, 3)} + ${fl(N5, 5)} - ${fl(N5, 15)} = ${in35}`}.`,
    t`Of those, divisible by ${7} too: by ${21} or by ${35}, ${math`${fl(N5, 21)} + ${fl(N5, 35)} - ${fl(N5, 105)} = ${with7}`}.`,
    t`So ${math`${in35} - ${with7} = ${in35 - with7}`}.`,
  ],
  reference: String(in35 - with7),
  verify: () => same('by checking every number', q5b(N5), in35 - with7),
  misconceptions: [
    { response: String(in35), why: t`That includes the ones divisible by ${7}. Remove the multiples of ${21} and ${35}, adding back ${105}.` },
    { response: String(in35 - fl(N5, 21) - fl(N5, 35)), why: t`Multiples of ${105} were removed twice, as multiples of ${21} and of ${35}: add them back once.` },
  ],
});

const anyOfThree = fl(N5, 3) + fl(N5, 5) + fl(N5, 7) - fl(N5, 15) - fl(N5, 21) - fl(N5, 35) + fl(N5, 105);
const iaQ5bAny = auto({
  id: 'ia-q5-b-any',
  source: cite('ia-prob-sheet-1', 'Q5(b)', true),
  title: t`Divisible by ${3}, ${5}, or ${7}`,
  prompt: t`How many of the numbers ${1}, ..., ${N5} are divisible by at least one of ${3}, ${5}, and ${7}?`,
  answer: { kind: 'exact', expected: String(anyOfThree) },
  solution: [
    t`Singles: ${math`${fl(N5, 3)} + ${fl(N5, 5)} + ${fl(N5, 7)} = ${fl(N5, 3) + fl(N5, 5) + fl(N5, 7)}`}. Pairs: multiples of ${15}, ${21}, ${35}: ${math`${fl(N5, 15)} + ${fl(N5, 21)} + ${fl(N5, 35)} = ${fl(N5, 15) + fl(N5, 21) + fl(N5, 35)}`}. Triple: multiples of ${105}, ${fl(N5, 105)}.`,
    t`${math`${fl(N5, 3) + fl(N5, 5) + fl(N5, 7)} - ${fl(N5, 15) + fl(N5, 21) + fl(N5, 35)} + ${fl(N5, 105)} = ${anyOfThree}`}.`,
  ],
  reference: String(anyOfThree),
  verify: () => same('by checking every number', multiples.at({ n: N5, a: 3, b: 5, c: 7 }).reference, anyOfThree),
  misconceptions: [{ response: String(anyOfThree - fl(N5, 105)), why: t`Add back the multiples of ${105}: they were added three times and removed three times.` }],
});

/** Q5(a)'s identity with numbers: a probability space of eight regions, and the two sides of the identity. */
const REG = [6, 5, 7, 3, 2, 4, 1, 12]; // only A, only B, only C, AB, AC, BC, ABC, none; out of 40
const RT = totals({ d: 40, r: REG });
const lhs = q(REG[1]! + REG[2]! + REG[5]!, 40);
const iaQ5aNum = auto({
  id: 'ia-q5-a-numbers',
  source: cite('ia-prob-sheet-1', 'Q5(a)', true),
  title: t`In ${mB} or ${mC}, but not in ${mA}`,
  prompt: t`Events ${mA}, ${mB}, ${mC} have ${math`P(B) = ${RT.b}`}, ${math`P(C) = ${RT.c}`}, ${math`P(B \cap C) = ${RT.bc}`}, ${math`P(C \cap A) = ${RT.ac}`}, ${math`P(A \cap B) = ${RT.ab}`}, and ${math`P(A \cap B \cap C) = ${RT.abc}`}. Find ${math`P(A^{c} \cap (B \cup C))`}.`,
  answer: { kind: 'exact', expected: str(lhs) },
  solution: [
    t`Question ${5}(a)'s identity: ${math`P(A^{c} \cap (B \cup C)) = P(B) + P(C) - P(B \cap C) - P(C \cap A) - P(A \cap B) + P(A \cap B \cap C)`}.`,
    t`${math`= ${RT.b} + ${RT.c} - ${RT.bc} - ${RT.ac} - ${RT.ab} + ${RT.abc} = ${lhs}`}.`,
  ],
  reference: str(lhs),
  verify: () => {
    const rhs = sub(sub(sub(sub(add(RT.b, RT.c), RT.bc), RT.ac), RT.ab), q(-RT.abc.num, RT.abc.den));
    return same('the identity, against the regions directly', str(rhs), str(lhs));
  },
  misconceptions: [{ response: str(sub(add(RT.b, RT.c), RT.bc)), why: t`That is ${math`P(B \cup C)`}, including the part inside ${mA}. Subtract ${math`P(A \cap (B \cup C))`} too.` }],
});

const iaQ5a = supervision({
  id: 'ia-q5-a',
  source: cite('ia-prob-sheet-1', 'Q5(a)'),
  title: t`The identity for ${math`A^{c} \cap (B \cup C)`}`,
  prompt: t`Show that, for any three events ${mA}, ${mB}, ${mC}, ${math`P(A^{c} \cap (B \cup C)) = P(B) + P(C) - P(B \cap C) - P(C \cap A) - P(A \cap B) + P(A \cap B \cap C)`}. Hint: ${math`B \cup C`} is the disjoint union of ${math`A^{c} \cap (B \cup C)`} and ${math`A \cap (B \cup C)`}.`,
  writeUp: 'proof',
});
const derive = supervision({
  id: 'ia-q5-three',
  source: cite('ia-prob-sheet-1', 'Q5', true),
  title: t`Inclusion-exclusion for three, derived`,
  prompt: t`Derive ${math`P(A \cup B \cup C) = \sum P(A) - \sum P(A \cap B) + P(A \cap B \cap C)`} from the two-event rule ${math`P(X \cup Y) = P(X) + P(Y) - P(X \cap Y)`}, by taking ${math`X = A \cup B`} and ${math`Y = C`}. Then explain with a Venn diagram why a point in all three events is counted exactly once.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const EXN = 100;

export const inclusionExclusionThree: TopicContent = {
  topicId: 'prob.inclusion-exclusion-three',
  goal: t`Find ${math`P(A \cup B \cup C)`}, or the size of a union of three sets, by adding the singles, subtracting the pairs, and adding back the triple.`,
  lesson: [
    { kind: 'p', text: t`For two events, ${math`P(A \cup B) = P(A) + P(B) - P(A \cap B)`}: adding counts the overlap twice, so take it off once. With three events there are more overlaps to correct.` },
    { kind: 'rule', text: t`[[inclusion-exclusion|Inclusion-exclusion]] for three events: ${dmath`P(A \cup B \cup C) = P(A) + P(B) + P(C) - P(A \cap B) - P(A \cap C) - P(B \cap C) + P(A \cap B \cap C).`} The same holds for the sizes of three finite sets.` },
    { kind: 'p', text: t`Why the triple comes back: an outcome in all three events is added three times by the singles and subtracted three times by the pairs, so after two steps it is not counted at all. Adding the triple counts it once. An outcome in exactly two events is added twice and subtracted once; one in exactly one is added once. Every outcome in the union ends up counted exactly once.` },
    { kind: 'p', text: t`Counting example: how many of ${1} to ${EXN} are divisible by ${2}, ${3}, or ${5}? Singles ${math`${fl(EXN, 2)} + ${fl(EXN, 3)} + ${fl(EXN, 5)} = ${fl(EXN, 2) + fl(EXN, 3) + fl(EXN, 5)}`}; pairs (multiples of ${6}, ${10}, ${15}) ${math`${fl(EXN, 6)} + ${fl(EXN, 10)} + ${fl(EXN, 15)} = ${fl(EXN, 6) + fl(EXN, 10) + fl(EXN, 15)}`}; triple (multiples of ${30}) ${fl(EXN, 30)}. So ${math`${fl(EXN, 2) + fl(EXN, 3) + fl(EXN, 5)} - ${fl(EXN, 6) + fl(EXN, 10) + fl(EXN, 15)} + ${fl(EXN, 30)} = ${Number(multiples.at({ n: EXN, a: 2, b: 3, c: 5 }).reference)}`}.` },
    { kind: 'p', text: t`IA Probability Example Sheet ${1}, question ${5}, uses the same idea for a region that is not a union: ${math`P(A^{c} \cap (B \cup C))`}, the part of ${math`B \cup C`} outside ${mA}. It is ${math`P(B \cup C) - P(A \cap (B \cup C))`}, and expanding both by inclusion-exclusion gives its formula, ${math`P(B) + P(C) - P(B \cap C) - P(C \cap A) - P(A \cap B) + P(A \cap B \cap C)`}.` },
  ],
  examples: [
    workedCambridge(iaQ5b),
    worked(unionThree, { d: 20, r: [3, 2, 4, 1, 2, 1, 1, 6] }, t`Three events`),
    worked(survey, { total: 60, s: [25, 20, 18], pr: [8, 6, 5], all: 3 }, t`Students studying none`),
  ],
  generators: [multiples, unionThree, survey],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['inclusion-exclusion'],
  cambridge: [iaQ5bAny, iaQ5aNum, iaQ5a, derive],
};
