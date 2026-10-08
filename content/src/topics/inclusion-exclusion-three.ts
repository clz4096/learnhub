/**
 * prob.inclusion-exclusion-three: Inclusion-exclusion for three events: add the singles,
 * subtract the pairs, add back the triple. From IA Probability Example Sheet 1 Q5: (a) the
 * identity for P(A^c ∩ (B ∪ C)), and (b) how many of 1, ..., 500 are not divisible by 7
 * but are divisible by 3 or 5. The sheet has no official solutions; every count here is
 * checked by brute force.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { add, int, pick, q, str, sub, type Rational } from '../math';
import { choose } from '../numbers';
import { generator, type Misconception } from '../problem';
import { dmath, math, t } from '../rich';
import { checkFrom, quickCheck, worked, workedCambridge, type TopicContent } from '../topic';

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
    t`Add the singles, subtract the pairs, add back the triple.`,
  ],
  nudge: t`Not quite. Adding the three counts counts some numbers more than once; correct for the overlaps.`,
  hints: [
    t`How many multiples of ${3}, of ${5}, and of ${7} are there up to ${N5}?`,
    t`Which numbers are counted twice in that total, and what are they multiples of?`,
    t`After the pairs are subtracted, how many times is a multiple of ${105} counted?`,
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
    t`The identity of Q${5}(a): ${math`P(A^{c} \cap (B \cup C)) = P(B) + P(C) - P(B \cap C) - P(C \cap A) - P(A \cap B) + P(A \cap B \cap C)`}.`,
    t`${math`= ${RT.b} + ${RT.c} - ${RT.bc} - ${RT.ac} - ${RT.ab} + ${RT.abc} = ${lhs}`}.`,
    t`Outside ${mA}: take ${math`P(B \cup C)`} and remove the part inside ${mA}.`,
  ],
  nudge: t`Not quite. Split ${math`B \cup C`} into the part outside ${mA} and the part inside ${mA}.`,
  hints: [
    t`What is ${math`P(B \cup C)`} from the given values?`,
    t`Which part of ${math`B \cup C`} lies inside ${mA}, and which of the given probabilities describe it?`,
    t`How does removing the part inside ${mA} from ${math`P(B \cup C)`} give the probability asked for?`,
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
  prompt: t`Show that, for any three events ${mA}, ${mB}, ${mC}, ${math`P(A^{c} \cap (B \cup C)) = P(B) + P(C) - P(B \cap C) - P(C \cap A) - P(A \cap B) + P(A \cap B \cap C)`}.`,
  writeUp: 'proof',
  hints: [
    t`How does ${math`B \cup C`} split into a part outside ${mA} and a part inside ${mA}, and why are the two parts disjoint?`,
    t`What is ${math`A \cap (B \cup C)`} as a union of two events?`,
    t`What does the two-event rule give for ${math`P(B \cup C)`} and for that union?`,
  ],
});
const derive = supervision({
  id: 'ia-q5-three',
  source: cite('ia-prob-sheet-1', 'Q5', true),
  title: t`Inclusion-exclusion for three, derived`,
  prompt: t`Derive ${math`P(A \cup B \cup C) = \sum P(A) - \sum P(A \cap B) + P(A \cap B \cap C)`} from the two-event rule ${math`P(X \cup Y) = P(X) + P(Y) - P(X \cap Y)`}. Then explain with a Venn diagram why a point in all three events is counted exactly once.`,
  writeUp: 'proof',
  hints: [
    t`Which choice of ${math`X`} and ${math`Y`} makes ${math`A \cup B \cup C`} a union of two events?`,
    t`How does the distributive law rewrite ${math`(A \cup B) \cap C`}, and which rule then gives its probability?`,
    t`How many times is a point in all three events counted by the singles, by the pairs, and by the triple?`,
  ],
});

// ---------------------------------------------------------------- lesson

const EXN = 100;
const exSingles = fl(EXN, 2) + fl(EXN, 3) + fl(EXN, 5);
const exPairs = fl(EXN, 6) + fl(EXN, 10) + fl(EXN, 15);
const exAns = Number(multiples.at({ n: EXN, a: 2, b: 3, c: 5 }).reference);
/** How often each sum of the formula counts an outcome that lies in exactly k of the three events. */
const tally = (k: number): [number, number, number, number] => [choose(k, 1), choose(k, 2), choose(k, 3), choose(k, 1) - choose(k, 2) + choose(k, 3)];

export const inclusionExclusionThree: TopicContent = {
  topicId: 'prob.inclusion-exclusion-three',
  goal: t`Find ${math`P(A \cup B \cup C)`}, or the size of a union of three sets, by adding the singles, subtracting the pairs, and adding back the triple.`,
  objective: t`Find the probability of a union of three events: add the singles, subtract the pairs, add back the triple.`,
  why: t`Three overlapping conditions are everywhere in counting; next comes the same formula for any number of events.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`Counting too much` },
    { kind: 'hook', text: t`How many of the numbers from ${1} to ${EXN} are divisible by ${2}, by ${3}, or by ${5}? Add the three counts and you get ${exSingles}, more numbers than there are. But ${30} is divisible by all three, so it was counted three times. How do you count each number exactly once?` },
    { kind: 'narrative', text: t`You already know the fix for two events. Adding ${math`P(A)`} and ${math`P(B)`} counts the overlap ${math`A \cap B`} twice, so you take it off once: ${math`P(A \cup B) = P(A) + P(B) - P(A \cap B)`}. With three events there are three overlaps of two and one overlap of all three, and the bookkeeping is more delicate. Let's do it carefully.` },
    { kind: 'narrative', text: t`A word on notation. ${math`A \cup B`} (read "${mA} union ${mB}") is the event that ${mA} happens or ${mB} happens or both. ${math`A \cap B`} (read "${mA} intersect ${mB}") is the event that both happen. ${math`A^{c}`} is the complement: ${mA} does not happen.` },

    { kind: 'section', title: t`The formula` },
    { kind: 'theorem', name: t`Inclusion-exclusion for three events`, statement: t`For any events ${mA}, ${mB}, ${mC} in a probability space, ${dmath`\mathbb{P}(A \cup B \cup C) = \mathbb{P}(A) + \mathbb{P}(B) + \mathbb{P}(C) - \mathbb{P}(A \cap B) - \mathbb{P}(A \cap C) - \mathbb{P}(B \cap C) + \mathbb{P}(A \cap B \cap C).`} The same holds with sizes ${math`|A|`} in place of probabilities, for any three finite sets.` },
    { kind: 'p', text: t`In plain words: this is [[inclusion-exclusion|inclusion-exclusion]]. Add the three singles, subtract the three pairs, add back the one triple. The signs alternate: plus, minus, plus.` },
    { kind: 'narrative', text: t`The proof needs nothing new. It applies the two-event rule twice, once to glue ${mC} onto ${math`A \cup B`}, and once to deal with the overlap that gluing creates.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Treat ${math`A \cup B`} as one event`, text: t`Let ${math`X = A \cup B`}. Then ${math`A \cup B \cup C = X \cup C`}, and the two-event rule gives`, eq: [dmath`\mathbb{P}(A \cup B \cup C) = \mathbb{P}(X) + \mathbb{P}(C) - \mathbb{P}(X \cap C).`], plain: t`Two events at a time is all we know how to do, so bundle two of them together.` },
        { label: t`Expand ${math`\mathbb{P}(X)`}`, text: t`By the two-event rule again,`, eq: [dmath`\mathbb{P}(X) = \mathbb{P}(A) + \mathbb{P}(B) - \mathbb{P}(A \cap B).`] },
        {
          label: t`Rewrite the overlap`,
          text: t`By the distributive law,`,
          eq: [dmath`X \cap C = (A \cup B) \cap C = (A \cap C) \cup (B \cap C).`],
          plain: t`Being in ${mC} and in ${mA} or ${mB} is the same as being in ${mA} and ${mC}, or in ${mB} and ${mC}.`,
          why: { q: t`Why is that true?`, a: t`An outcome is in ${math`(A \cup B) \cap C`} exactly when it is in ${mC} and in at least one of ${mA}, ${mB}. If it is in ${mA}, it is in ${math`A \cap C`}; if in ${mB}, it is in ${math`B \cap C`}. Conversely, anything in ${math`A \cap C`} or ${math`B \cap C`} is in ${mC} and in ${mA} or ${mB}. Two sets with the same members are equal.` },
        },
        {
          label: t`Use the two-event rule on the overlap`,
          text: t`The two pieces ${math`A \cap C`} and ${math`B \cap C`} overlap in ${math`(A \cap C) \cap (B \cap C) = A \cap B \cap C`}, so`,
          eq: [dmath`\mathbb{P}(X \cap C) = \mathbb{P}(A \cap C) + \mathbb{P}(B \cap C) - \mathbb{P}(A \cap B \cap C).`],
          why: { q: t`Why is ${math`(A \cap C) \cap (B \cap C)`} just ${math`A \cap B \cap C`}?`, a: t`Being in both pieces means being in ${mA}, in ${mC}, in ${mB}, and in ${mC} again. Saying "in ${mC}" twice adds nothing, so it is being in all three.` },
        },
        { label: t`Substitute`, text: t`Put the last two lines into the first. The minus sign in front of ${math`\mathbb{P}(X \cap C)`} flips every sign inside the bracket:`, eq: [dmath`\mathbb{P}(A \cup B \cup C) = \mathbb{P}(A) + \mathbb{P}(B) + \mathbb{P}(C) - \mathbb{P}(A \cap B) - \mathbb{P}(A \cap C) - \mathbb{P}(B \cap C) + \mathbb{P}(A \cap B \cap C).`], plain: t`That is why the triple comes back with a plus: it was subtracted inside a bracket that is itself subtracted.` },
      ],
    },

    { kind: 'section', title: t`Why each outcome counts once` },
    { kind: 'narrative', text: t`The proof is airtight, but it is worth seeing the formula work on a single outcome. Take any outcome in the union and ask how many times each sum counts it. It depends only on how many of the three events contain it: one, two, or all three.` },
    {
      kind: 'table',
      caption: t`How often an outcome is counted, by how many of the events it lies in.`,
      head: [t`In exactly`, t`Singles add`, t`Pairs subtract`, t`Triple adds`, t`Net count`],
      rows: [1, 2, 3].map((k) => { const [s, p, tr, net] = tally(k); return [t`${k} of them`, t`${s}`, t`${p}`, t`${tr}`, t`${net}`]; }),
    },
    { kind: 'p', text: t`Read the last row slowly. An outcome in all three events is added ${tally(3)[0]} times by the singles, then removed ${tally(3)[1]} times by the pairs (it is in ${math`A \cap B`}, ${math`A \cap C`}, and ${math`B \cap C`}). At that point it is not counted at all. The triple puts it back once. Every row nets to ${1}.`, why: { q: t`Where do those numbers come from?`, a: t`An outcome in exactly ${math`k`} of the events is in ${math`\binom{k}{${1}}`} singles, ${math`\binom{k}{${2}}`} pairs, and ${math`\binom{k}{${3}}`} triples, since a pair containing it is a choice of two of its ${math`k`} events. For ${math`k = ${3}`} that is ${tally(3)[0]}, ${tally(3)[1]}, ${tally(3)[2]}.` } },
    quickCheck({
      prompt: t`An outcome lies in ${mA} and ${mB} but not in ${mC}. How many times in total does the right-hand side of the formula count it?`,
      answer: { kind: 'exact', expected: String(tally(2)[3]) },
      reference: String(tally(2)[3]),
      why: t`It is in two singles (added ${tally(2)[0]} times) and one pair, ${math`A \cap B`} (subtracted once), and no triple: ${math`${tally(2)[0]} - ${tally(2)[1]} = ${tally(2)[3]}`}.`,
    }),

    { kind: 'section', title: t`Counting with it` },
    { kind: 'narrative', text: t`Back to the opening puzzle. Let ${mA}, ${mB}, ${mC} be the sets of numbers from ${1} to ${EXN} divisible by ${2}, by ${3}, and by ${5}. The formula for sizes needs seven counts.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Singles`, text: t`The multiples of ${2} up to ${EXN} are ${2}, ${4}, and so on up to ${EXN}: there are ${math`\lfloor ${EXN}/${2} \rfloor = ${fl(EXN, 2)}`} of them. Likewise ${fl(EXN, 3)} multiples of ${3} and ${fl(EXN, 5)} of ${5}.`, eq: [dmath`|A| + |B| + |C| = ${fl(EXN, 2)} + ${fl(EXN, 3)} + ${fl(EXN, 5)} = ${exSingles}.`], why: { q: t`What does ${math`\lfloor x \rfloor`} mean?`, a: t`The floor of ${math`x`}: the largest whole number not above ${math`x`}. For example ${math`\lfloor ${EXN}/${3} \rfloor = ${fl(EXN, 3)}`}, because ${math`${3} \times ${fl(EXN, 3)} = ${3 * fl(EXN, 3)}`} is the last multiple of ${3} not above ${EXN}.` } },
        { label: t`Pairs`, text: t`Divisible by both ${2} and ${3} means divisible by ${6}; likewise ${10} for ${2} and ${5}, and ${15} for ${3} and ${5}.`, eq: [dmath`|A \cap B| + |A \cap C| + |B \cap C| = ${fl(EXN, 6)} + ${fl(EXN, 10)} + ${fl(EXN, 15)} = ${exPairs}.`], why: { q: t`Why does divisible by ${2} and ${3} mean divisible by ${6}?`, a: t`Because ${2} and ${3} share no factor, a number divisible by both is divisible by their product. In general it is divisible by their least common multiple: by ${4} and ${6} means by ${12}, not ${24}.` } },
        { label: t`Triple`, text: t`Divisible by all three means divisible by ${30}: ${math`\lfloor ${EXN}/${30} \rfloor = ${fl(EXN, 30)}`}.` },
        { label: t`Combine`, text: t`Singles minus pairs plus triple:`, eq: [dmath`${exSingles} - ${exPairs} + ${fl(EXN, 30)} = ${exAns}.`], plain: t`So ${exAns} of the first ${EXN} numbers have at least one of ${2}, ${3}, ${5} as a factor.` },
      ],
    },
    checkFrom(multiples, { n: 200, a: 2, b: 3, c: 7 }, t`Singles ${fl(200, 2) + fl(200, 3) + fl(200, 7)}, pairs (multiples of ${6}, ${14}, ${21}) ${fl(200, 6) + fl(200, 14) + fl(200, 21)}, triple (multiples of ${42}) ${fl(200, 42)}.`),

    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`Inclusion-exclusion for three events is singles minus pairs, with nothing more.`, counterexample: t`Take ${math`A = B = C = \Omega`}, the whole sample space. The union has probability ${1}, but singles minus pairs is ${math`${3} - ${3} = ${0}`}. The triple, ${1}, is what restores the right answer.` },
    { kind: 'pitfall', claim: t`The triple is subtracted, since it is an overlap like the pairs.`, counterexample: t`With ${math`A = B = C = \Omega`} again, that gives ${math`${3} - ${3} - ${1} = -${1}`}, a negative probability. The signs alternate: plus for singles, minus for pairs, plus for the triple.` },
    { kind: 'pitfall', claim: t`Divisible by ${4} and by ${6} means divisible by ${24}.`, counterexample: t`${12} is divisible by both and not by ${24}. Use the least common multiple, ${12}, not the product, when the numbers share a factor.` },
    { kind: 'narrative', text: t`The Cambridge question below, from IA Probability Example Sheet ${1}, asks for a region that is not a union at all: numbers divisible by ${3} or ${5} but not by ${7}. The trick is to count the union, then remove the part you do not want, using inclusion-exclusion for each count.` },
    { kind: 'takeaway', text: t`For three events: add the singles, subtract the pairs, add back the triple, so every outcome is counted exactly once.` },
  ],
  examples: [
    { ...workedCambridge(iaQ5b), examiner: t`The examiner looks for named events, the formula stated before the numbers, and multiples of the least common multiple for each overlap.` },
    worked(unionThree, { d: 20, r: [3, 2, 4, 1, 2, 1, 1, 6] }, t`Three events`),
    worked(survey, { total: 60, s: [25, 20, 18], pr: [8, 6, 5], all: 3 }, t`Students studying none`),
  ],
  generators: [multiples, unionThree, survey],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['inclusion-exclusion'],
  cambridge: withUses([iaQ5bAny, iaQ5aNum, iaQ5a, derive], {
    'ia-q5-a': { sections: ['The formula'], note: t`An identity for three events by splitting into disjoint pieces` },
    'ia-q5-three': { sections: ['The formula', 'Why each outcome counts once'], note: t`Deriving the three-event formula from the two-event rule` },
    'ia-q5-b-any': { sections: ['Counting with it'], note: t`Counting multiples by inclusion-exclusion` },
  }),
  // The sheet's two proofs first, then the count to 500; the plug-in with numbers is drill, not a
  // Cambridge-standard test.
  gate: ['ia-q5-a', 'ia-q5-three', 'ia-q5-b-any'],
  recall: [
    { front: t`State inclusion-exclusion for three events.`, back: t`${math`\mathbb{P}(A \cup B \cup C) = \sum \mathbb{P}(A) - \sum \mathbb{P}(A \cap B) + \mathbb{P}(A \cap B \cap C)`}: singles, minus pairs, plus the triple.` },
    { front: t`Why is the triple added back?`, back: t`An outcome in all three is added ${3} times by the singles and removed ${3} times by the pairs; the triple counts it once.` },
  ],
  proofOrder: [{
    title: t`Inclusion-exclusion for three events, from the two-event rule`,
    steps: [
      t`Let ${math`X = A \cup B`}, so ${math`\mathbb{P}(X \cup C) = \mathbb{P}(X) + \mathbb{P}(C) - \mathbb{P}(X \cap C)`}.`,
      t`Expand ${math`\mathbb{P}(X) = \mathbb{P}(A) + \mathbb{P}(B) - \mathbb{P}(A \cap B)`}.`,
      t`Write ${math`X \cap C = (A \cap C) \cup (B \cap C)`}.`,
      t`So ${math`\mathbb{P}(X \cap C) = \mathbb{P}(A \cap C) + \mathbb{P}(B \cap C) - \mathbb{P}(A \cap B \cap C)`}.`,
      t`Substitute: the subtracted bracket turns the triple's sign to plus.`,
    ],
  }],
};
