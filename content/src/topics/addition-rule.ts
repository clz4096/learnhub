/**
 * prob.addition-rule: P(A or B) = P(A) + P(B) - P(A and B) for any two events. From the STEP
 * specification's probability section; the problems are IA Probability Example Sheet 1,
 * Q4(e) (prove the rule from the axioms, for supervision) and Q5(b) (how many of 1 to 500
 * are not divisible by 7 but divisible by 3 or 5, counted here by brute force), and an
 * addition-rule question on the data of STEP Support Assignment 6, Q4(i). The second gate
 * (batch 9) is 1994 STEP I Q12(iii): the chance of picking at least one of two single-sex
 * colleges among three, by the addition rule, checked by listing every ordered pick.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { add, int, mul, pick, q, str, sub } from '../math';
import { generator, type Misconception } from '../problem';
import { dmath, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const [mA, mB] = [math`A`, math`B`];
const gcdN = (a: number, b: number): number => (b === 0 ? a : gcdN(b, a % b));
const lcm = (a: number, b: number): number => (a * b) / gcdN(a, b);

// ---------------------------------------------------------------- generators

interface UnionP { a: number; b: number; ab: number; den: number }

const unionParams = (rng: () => number): UnionP => {
  const den = pick(rng, [10, 20, 12, 100]);
  for (;;) {
    const a = int(rng, 1, den - 1);
    const b = int(rng, 1, den - 1);
    const lo = Math.max(1, a + b - den);
    const hi = Math.min(a, b) - 1;
    if (lo > hi) continue;
    return { a, b, ab: int(rng, lo, hi), den };
  }
};
const unionSane = ({ a, b, ab, den }: UnionP): string | null => (ab >= 1 && ab < Math.min(a, b) && a + b - ab <= den ? null : 'inconsistent probabilities');

const unionGen = generator<UnionP>({
  id: 'union',
  skill: 'Find P(A or B) from P(A), P(B) and P(A and B).',
  quick: true,
  params: unionParams,
  sane: unionSane,
  problem: ({ a, b, ab, den }) => {
    const [pa, pb, pab] = [q(a, den), q(b, den), q(ab, den)];
    const ans = sub(add(pa, pb), pab);
    return {
      prompt: t`${math`P(A) = ${pa}`}, ${math`P(B) = ${pb}`} and ${math`P(A \cap B) = ${pab}`}. Find ${math`P(A \cup B)`}.`,
      answer: { kind: 'exact', expected: str(ans) },
      solution: [
        t`Adding ${math`P(A)`} and ${math`P(B)`} counts the overlap ${math`A \cap B`} twice, so take it off once.`,
        t`${math`P(A \cup B) = ${pa} + ${pb} - ${pab} = ${ans}`}.`,
      ],
    };
  },
  solve: ({ a, b, ab, den }) => {
    // Build a sample space of den equally likely points: A = first a points, B overlapping A in ab points.
    const A = new Set(Array.from({ length: a }, (_, i) => i));
    const B = new Set(Array.from({ length: b }, (_, i) => i + a - ab));
    return str(q(new Set([...A, ...B]).size, den));
  },
  misconceptions: ({ a, b, ab, den }): Misconception[] => [
    { response: str(q(a + b, den)), why: t`That counts the outcomes in both events twice. Subtract ${math`P(A \cap B)`} once.` },
    { response: str(q(a + b - 2 * ab, den)), why: t`That subtracts the overlap twice, giving "exactly one of ${mA}, ${mB}". The union includes the outcomes in both.` },
    { response: str(mul(q(a, den), q(b, den))), why: t`Multiplying is for "and" under independence. For "or", add and subtract the overlap.` },
  ],
});

const interGen = generator<UnionP>({
  id: 'overlap',
  skill: 'Rearrange the addition rule to find P(A and B) from P(A), P(B) and P(A or B).',
  params: unionParams,
  sane: unionSane,
  problem: ({ a, b, ab, den }) => {
    const [pa, pb, pu] = [q(a, den), q(b, den), q(a + b - ab, den)];
    return {
      prompt: t`${math`P(A) = ${pa}`}, ${math`P(B) = ${pb}`} and ${math`P(A \cup B) = ${pu}`}. Find ${math`P(A \cap B)`}.`,
      answer: { kind: 'exact', expected: str(q(ab, den)) },
      solution: [
        t`Rearrange ${math`P(A \cup B) = P(A) + P(B) - P(A \cap B)`}: ${math`P(A \cap B) = P(A) + P(B) - P(A \cup B)`}.`,
        t`${math`${pa} + ${pb} - ${pu} = ${q(ab, den)}`}.`,
      ],
    };
  },
  solve: ({ a, b, ab, den }) => str(sub(add(q(a, den), q(b, den)), q(a + b - ab, den))),
  misconceptions: ({ a, b, ab, den }): Misconception[] => [
    { response: str(mul(q(a, den), q(b, den))), why: t`${math`P(A)P(B)`} is the overlap only if the events are independent, which you were not told. Use the addition rule.` },
    { response: str(q(a + b - ab, den)), why: t`That is ${math`P(A \cup B)`}, which you were given. The overlap is what is left after taking it from ${math`P(A) + P(B)`}.` },
    { response: str(sub(q(a + b - ab, den), add(q(a, den), q(b, den)))), why: t`The sign is reversed: ${math`P(A \cap B) = P(A) + P(B) - P(A \cup B)`}, which is never negative.` },
  ],
});

interface CountP { n: number; a: number; b: number }

const countGen = generator<CountP>({
  id: 'divisible-by-either',
  skill: 'Count the numbers from 1 to N divisible by a or by b: N/a + N/b - N/lcm(a, b), rounded down.',
  params: (rng) => {
    for (;;) {
      const a = int(rng, 2, 9);
      const b = int(rng, 2, 12);
      const n = pick(rng, [60, 100, 120, 200, 300, 500, 1000]);
      // The two sets must overlap within the range, or there is nothing to subtract.
      if (a === b || b % a === 0 || a % b === 0 || 2 * lcm(a, b) > n) continue;
      return { n, a, b };
    }
  },
  sane: ({ n, a, b }) => (a !== b && b % a !== 0 && a % b !== 0 && 2 * lcm(a, b) <= n ? null : 'neither may divide the other, and they must share multiples'),
  problem: ({ n, a, b }) => {
    const [na, nb, l] = [Math.floor(n / a), Math.floor(n / b), lcm(a, b)];
    const nl = Math.floor(n / l);
    return {
      prompt: t`How many of the numbers ${math`${1}, ${2}, \ldots, ${n}`} are divisible by ${a} or by ${b}?`,
      answer: { kind: 'exact', expected: String(na + nb - nl) },
      solution: [
        t`Let ${mA} be the multiples of ${a} and ${mB} the multiples of ${b}. Then ${math`|A| = \lfloor ${n}/${a} \rfloor = ${na}`} and ${math`|B| = \lfloor ${n}/${b} \rfloor = ${nb}`}.`,
        t`A number is in both exactly when it is a multiple of ${math`\operatorname{lcm}(${a}, ${b}) = ${l}`}: ${math`|A \cap B| = \lfloor ${n}/${l} \rfloor = ${nl}`}.`,
        t`So ${math`|A \cup B| = ${na} + ${nb} - ${nl} = ${na + nb - nl}`}.`,
      ],
    };
  },
  solve: ({ n, a, b }) => String(Array.from({ length: n }, (_, i) => i + 1).filter((x) => x % a === 0 || x % b === 0).length),
  misconceptions: ({ n, a, b }): Misconception[] => {
    const out: Misconception[] = [{ response: String(Math.floor(n / a) + Math.floor(n / b)), why: t`The common multiples of ${a} and ${b} are counted twice. Subtract them once.` }];
    if (lcm(a, b) !== a * b) out.push({ response: String(Math.floor(n / a) + Math.floor(n / b) - Math.floor(n / (a * b))), why: t`The numbers in both are the multiples of ${math`\operatorname{lcm}(${a}, ${b}) = ${lcm(a, b)}`}, not of ${math`${a} \times ${b} = ${a * b}`}: ${a} and ${b} share a factor.` });
    out.push({ response: String(Math.floor(n / a) + Math.floor(n / b) - 2 * Math.floor(n / lcm(a, b))), why: t`That subtracts the common multiples twice, leaving the numbers divisible by exactly one of them.` });
    return out;
  },
});

type Card = { rank: number; suit: number };
const DECK: Card[] = Array.from({ length: 52 }, (_, i) => ({ rank: (i % 13) + 1, suit: Math.floor(i / 13) }));
const SUITS = ['spade', 'heart', 'diamond', 'club'];
const RANKS: Record<number, string> = { 1: 'ace', 11: 'jack', 12: 'queen', 13: 'king' };
interface CardP { rankKind: 'one' | 'face'; rank: number; suit: number }
const inRank = (c: Card, p: CardP): boolean => (p.rankKind === 'face' ? c.rank >= 11 : c.rank === p.rank);

const cardGen = generator<CardP>({
  id: 'cards',
  skill: 'Use the addition rule for overlapping events with a pack of cards.',
  params: (rng) => ({ rankKind: pick(rng, ['one', 'face'] as const), rank: pick(rng, [1, 11, 12, 13]), suit: int(rng, 0, 3) }),
  sane: ({ rank, suit }) => (rank >= 1 && rank <= 13 && suit >= 0 && suit < 4 ? null : 'out of range'),
  problem: (p) => {
    const rankWord = p.rankKind === 'face' ? t`a picture card (jack, queen or king)` : t`a ${RANKS[p.rank] as string}`;
    const nr = p.rankKind === 'face' ? 12 : 4;
    const both = p.rankKind === 'face' ? 3 : 1;
    const ans = q(nr + 13 - both, 52);
    return {
      prompt: t`One card is drawn at random from a standard pack of ${52}. Find the probability that it is ${rankWord} or a ${SUITS[p.suit] as string}.`,
      answer: { kind: 'exact', expected: str(ans) },
      solution: [
        t`${math`P(\text{rank}) = \frac{${nr}}{${52}}`} and ${math`P(\text{suit}) = \frac{${13}}{${52}}`}. These overlap: ${both} card${both === 1 ? '' : 's'} of that suit ${both === 1 ? 'has' : 'have'} that rank, so ${math`P(\text{both}) = \frac{${both}}{${52}}`}.`,
        t`${math`P = \frac{${nr}}{${52}} + \frac{${13}}{${52}} - \frac{${both}}{${52}} = \frac{${nr + 13 - both}}{${52}} = ${ans}`}.`,
      ],
    };
  },
  solve: (p) => str(q(DECK.filter((c) => inRank(c, p) || c.suit === p.suit).length, 52)),
  misconceptions: (p): Misconception[] => {
    const nr = p.rankKind === 'face' ? 12 : 4;
    const both = p.rankKind === 'face' ? 3 : 1;
    return [
      { response: str(q(nr + 13, 52)), why: t`The ${both === 1 ? 'card' : 'cards'} with both properties ${both === 1 ? 'is' : 'are'} counted twice. Subtract ${math`\frac{${both}}{${52}}`}.` },
      { response: str(q(both, 52)), why: t`That is the probability of both. "Or" includes cards with either property.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const ia5b = auto({
  id: 'ia1-q5-b',
  source: cite('ia-prob-sheet-1', 'Q5(b)'),
  title: t`Divisible by ${3} or ${5}, but not by ${7}`,
  prompt: t`How many of the numbers ${math`${1}, \ldots, ${500}`} are not divisible by ${7} but are divisible by ${3} or ${5}?`,
  answer: { kind: 'exact', expected: '200' },
  solution: [
    t`Let ${math`T`}, ${math`F`}, ${math`S`} be the multiples of ${3}, ${5}, ${7} in the range. First count ${math`T \cup F`}: ${math`\lfloor ${500}/${3} \rfloor + \lfloor ${500}/${5} \rfloor - \lfloor ${500}/${15} \rfloor = ${166} + ${100} - ${33} = ${233}`}.`,
    t`Now remove those divisible by ${7}. A number in ${math`(T \cup F) \cap S`} is a multiple of ${21} or of ${35}: by the same rule, ${math`\lfloor ${500}/${21} \rfloor + \lfloor ${500}/${35} \rfloor - \lfloor ${500}/${105} \rfloor = ${23} + ${14} - ${4} = ${33}`}.`,
    t`So the answer is ${math`${233} - ${33} = ${200}`}.`,
  ],
  reference: '200',
  verify: () => same('count', Array.from({ length: 500 }, (_, i) => i + 1).filter((n) => n % 7 !== 0 && (n % 3 === 0 || n % 5 === 0)).length, 200),
  misconceptions: [
    { response: '233', why: t`That counts all multiples of ${3} or ${5}; those also divisible by ${7} must come out.` },
    { response: '266', why: t`The multiples of ${15} were counted twice: once as multiples of ${3}, once as multiples of ${5}.` },
  ],
});

const ia4e = supervision({
  id: 'ia1-q4-e',
  source: cite('ia-prob-sheet-1', 'Q4(e)'),
  title: t`The addition rule from the axioms`,
  prompt: t`Let ${math`(\Omega, \mathcal{F}, \mathbb{P})`} be a probability space and ${math`A_{${1}}, A_{${2}}`} events. Starting from the definitions (in particular, that ${math`\mathbb{P}`} adds over disjoint events), show that ${math`\mathbb{P}(A_{${1}} \cup A_{${2}}) = \mathbb{P}(A_{${1}}) + \mathbb{P}(A_{${2}}) - \mathbb{P}(A_{${1}} \cap A_{${2}})`}.`,
  writeUp: 'proof',
});

const ia5a = supervision({
  id: 'ia1-q5-a',
  source: cite('ia-prob-sheet-1', 'Q5(a)'),
  title: t`Not ${mA}, but ${mB} or ${math`C`}`,
  prompt: t`Show that, for any three events ${mA}, ${mB}, ${math`C`}, ${math`\mathbb{P}(A^{c} \cap (B \cup C)) = \mathbb{P}(B) + \mathbb{P}(C) - \mathbb{P}(B \cap C) - \mathbb{P}(C \cap A) - \mathbb{P}(A \cap B) + \mathbb{P}(A \cap B \cap C)`}.`,
  writeUp: 'proof',
});

const a6or = auto({
  id: 'a6-q4-i-or',
  source: cite('step-f06', 'Assignment 6, Q4(i)', true),
  title: t`A woman or a smoker`,
  prompt: t`In the population of STEP Support Assignment ${6}, ${40}% are men and ${60}% women; ${50}% of the men and ${30}% of the women smoke. Find the probability that a person picked at random is a woman or a smoker.`,
  answer: { kind: 'exact', expected: str(q(80, 100)) },
  solution: [
    t`${math`P(W) = ${q(60, 100)}`}. ${math`P(S) = ${q(40, 100)} \times ${q(50, 100)} + ${q(60, 100)} \times ${q(30, 100)} = ${q(38, 100)}`}. ${math`P(W \cap S) = ${q(60, 100)} \times ${q(30, 100)} = ${q(18, 100)}`}.`,
    t`${math`P(W \cup S) = ${q(60, 100)} + ${q(38, 100)} - ${q(18, 100)} = ${q(80, 100)}`}. Check: the only people left out are the male non-smokers, ${math`${q(40, 100)} \times ${q(50, 100)} = ${q(20, 100)}`}.`,
  ],
  reference: '4/5',
  verify: () => same('per 100 people', 60 + 38 - 18, 100 - 20),
  misconceptions: [
    { response: str(q(98, 100)), why: t`The ${18}% who are women and smoke were counted twice. Subtract them once.` },
    { response: str(mul(q(60, 100), q(38, 100))), why: t`Multiplying gives neither "and" nor "or" here: the events are not independent, and "or" is found by adding.` },
  ],
});

// 1994 STEP I Q12(iii): at least one of the two single-sex colleges among three picked at random.
const N_COLLEGES = 28;
const N_PICKS = 3;
const P_ONE = q(N_PICKS, N_COLLEGES);
const P_BOTH = q(N_PICKS * (N_PICKS - 1) * (N_COLLEGES - 2), N_COLLEGES * (N_COLLEGES - 1) * (N_COLLEGES - 2));
const P_EITHER = sub(add(P_ONE, P_ONE), P_BOTH);
const step94Either = auto({
  id: 'step94-q12-iii',
  source: cite('stepdb-94-s1', 'Q12(iii)', true),
  title: t`At least one single-sex college`,
  prompt: t`There are ${N_COLLEGES} colleges in Cambridge, of which two (New Hall and Newnham) are for women only. Celia has picked ${N_PICKS} different colleges at random, in order of preference, to enter on her application form. What is the probability that Celia has picked at least one single-sex college? Give a fraction in lowest terms.`,
  answer: { kind: 'exact', expected: str(P_EITHER) },
  solution: [
    t`Let ${mA} be "she has picked Newnham" and ${mB} "she has picked New Hall". The question asks for ${math`P(A \cup B)`}, and the two events can happen together, so use the addition rule: ${math`P(A \cup B) = P(A) + P(B) - P(A \cap B)`}.`,
    t`No college is special, so each appears on the same share of her possible forms, and the shares add to ${N_PICKS}, the number of colleges on a form: ${math`P(A) = P(B) = ${P_ONE}`}.`,
    t`For ${math`A \cap B`}, count ordered picks. There are ${math`${N_COLLEGES} \times ${N_COLLEGES - 1} \times ${N_COLLEGES - 2}`} equally likely ones. Those with both colleges: a place for Newnham (${N_PICKS} ways), a place for New Hall (${N_PICKS - 1} ways), and any of the other ${N_COLLEGES - 2} colleges in the last place. So ${math`P(A \cap B) = \frac{${N_PICKS} \times ${N_PICKS - 1} \times ${N_COLLEGES - 2}}{${N_COLLEGES} \times ${N_COLLEGES - 1} \times ${N_COLLEGES - 2}} = ${P_BOTH}`}.`,
    t`So ${math`P(A \cup B) = ${P_ONE} + ${P_ONE} - ${P_BOTH} = ${P_EITHER}`}. Check by the complement: she picks no single-sex college with probability ${math`\frac{${N_COLLEGES - 2} \times ${N_COLLEGES - 3} \times ${N_COLLEGES - 4}}{${N_COLLEGES} \times ${N_COLLEGES - 1} \times ${N_COLLEGES - 2}} = ${sub(q(1), P_EITHER)}`}, and ${math`${1} - ${sub(q(1), P_EITHER)} = ${P_EITHER}`}.`,
  ],
  reference: str(P_EITHER),
  verify: () => {
    let hit = 0;
    let all = 0;
    for (let a = 0; a < N_COLLEGES; a++) for (let b = 0; b < N_COLLEGES; b++) for (let c = 0; c < N_COLLEGES; c++) {
      if (a === b || b === c || a === c) continue;
      all++;
      if ([a, b, c].some((x) => x < 2)) hit++;
    }
    return same('at least one single-sex college, by listing ordered picks', str(q(hit, all)), str(P_EITHER));
  },
  misconceptions: [
    { response: str(add(P_ONE, P_ONE)), why: t`That counts the forms with both colleges twice. Take off ${math`P(A \cap B) = ${P_BOTH}`} once.` },
    { response: str(q(2, N_COLLEGES)), why: t`That is the chance her first choice is single-sex. She picks ${N_PICKS} colleges, and any of them could be single-sex.` },
  ],
});

// ---------------------------------------------------------------- lesson

const EXN = { a: 12, b: 13, both: 3 };

export const additionRule: TopicContent = {
  topicId: 'prob.addition-rule',
  goal: t`Use ${math`P(A \cup B) = P(A) + P(B) - P(A \cap B)`} for any two events.`,
  objective: t`Find the probability of "A or B" for any two events, overlapping or not.`,
  why: t`The general "or" rule; it grows into inclusion-exclusion for any number of events.`,
  minutes: 15,
  lesson: [
    { kind: 'section', title: t`Counting the overlap once` },
    { kind: 'hook', text: t`Draw a card. ${12} of the ${52} cards are picture cards and ${13} are hearts. So ${25} cards are "a picture card or a heart"? Count them in a pack and you find ${22}. Where did three cards go?` },
    { kind: 'narrative', text: t`The jack, queen and king of hearts are picture cards and hearts. Adding ${12} and ${13} counted each of them twice. Removing them once fixes it: ${math`${12} + ${13} - ${3} = ${22}`}. The same repair works for any two events, and it is called the [[addition-rule|addition rule]].` },
    { kind: 'venn', caption: t`Picture cards and hearts in a pack of ${52}.`, a: 'Picture', b: 'Heart', onlyA: t`${EXN.a - EXN.both} cards`, both: t`${EXN.both} cards`, onlyB: t`${EXN.b - EXN.both} cards`, neither: t`${52 - EXN.a - EXN.b + EXN.both} cards` },
    { kind: 'theorem', name: t`Addition rule`, statement: t`For any two events ${mA} and ${mB}, ${dmath`P(A \cup B) = P(A) + P(B) - P(A \cap B).`}` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Split the union`, text: t`${math`A \cup B`} is ${mA} together with the part of ${mB} outside ${mA}, and these do not overlap: ${math`A \cup B = A \cup (B \setminus A)`} with ${math`A \cap (B \setminus A) = \varnothing`}.`, plain: t`Everything in the union is either in ${mA}, or in ${mB} but not ${mA}, never both. Here ${math`B \setminus A`} (read "${math`B`} minus ${math`A`}") is the set of outcomes in ${math`B`} but not in ${math`A`}.` },
        { label: t`Add the exclusive pieces`, text: t`By the rule for mutually exclusive events, ${math`P(A \cup B) = P(A) + P(B \setminus A)`}.` },
        { label: t`Split B the same way`, text: t`${math`B = (B \setminus A) \cup (A \cap B)`}, again with no overlap, so ${math`P(B) = P(B \setminus A) + P(A \cap B)`}, that is ${math`P(B \setminus A) = P(B) - P(A \cap B)`}.` },
        { label: t`Substitute`, text: t`${math`P(A \cup B) = P(A) + P(B) - P(A \cap B)`}.` },
      ],
    },
    { kind: 'p', text: t`When ${mA} and ${mB} are mutually exclusive, ${math`A \cap B = \varnothing`} has probability ${0}, and the rule becomes plain addition. So this rule includes the earlier one. It also shows ${math`P(A \cup B) \le P(A) + P(B)`} always, since the subtracted term is never negative.` },
    checkFrom(unionGen, { a: 5, b: 4, ab: 2, den: 10 }, t`${math`\frac{${5}}{${10}} + \frac{${4}}{${10}} - \frac{${2}}{${10}} = \frac{${7}}{${10}}`}: the overlap is taken off once.`),
    { kind: 'section', title: t`Using it both ways` },
    { kind: 'narrative', text: t`The rule links four numbers, so any three give the fourth. Rearranged, ${math`P(A \cap B) = P(A) + P(B) - P(A \cup B)`}. And since ${math`P(A \cup B) \le ${1}`}, ${math`P(A \cap B) \ge P(A) + P(B) - ${1}`}: if ${math`P(A) = ${q(7, 10)}`} and ${math`P(B) = ${q(6, 10)}`}, the events must overlap with probability at least ${math`${q(3, 10)}`}, whatever else is true. With counts instead of probabilities the same rule counts the numbers up to ${100} divisible by ${2} or ${3}: ${math`${50} + ${33} - ${16} = ${67}`}.` },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${math`P(A \cap B) = P(A)P(B)`}, so ${math`P(A \cup B) = P(A) + P(B) - P(A)P(B)`} for any events.`, counterexample: t`That needs independence. One die, ${math`A = \{${1}, ${2}\}`}, ${math`B = \{${2}, ${3}\}`}: ${math`P(A \cap B) = \frac{${1}}{${6}}`}, not ${math`\frac{${1}}{${9}}`}, and ${math`P(A \cup B) = \frac{${3}}{${6}}`}. Use the actual overlap.` },
    { kind: 'pitfall', claim: t`${math`P(A \cup B) = P(A) + P(B) - ${2}P(A \cap B)`}, because the overlap is in both.`, counterexample: t`The overlap was counted twice and must be counted once, so subtract it once. Subtracting twice gives the probability of exactly one of the events: for picture cards or hearts, ${math`\frac{${12} + ${13} - ${6}}{${52}} = \frac{${19}}{${52}}`}, which misses the three picture hearts.` },
    { kind: 'takeaway', text: t`For "or", add the two probabilities and subtract the overlap once.` },
  ],
  examples: [
    workedCambridge(ia5b),
    worked(cardGen, { rankKind: 'face', rank: 11, suit: 1 }, t`Picture cards or hearts`),
    worked(interGen, { a: 7, b: 6, ab: 4, den: 10 }, t`Finding the overlap`),
  ],
  generators: [unionGen, interGen, countGen, cardGen],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['addition-rule'],
  claims: [{ what: 'a picture card or a heart', exact: q(22, 52), trial: (rng) => { const c = DECK[Math.floor(rng() * 52)] as Card; return c.rank >= 11 || c.suit === 1; } }],
  cambridge: withUses([ia4e, ia5a, a6or, step94Either], {
    'ia1-q5-a': { sections: ['Using it both ways'], note: t`Applying the addition rule twice to three events` },
    'step94-q12-iii': { sections: ['Counting the overlap once'], note: t`Adding two chances that overlap, and finding the overlap by counting` },
  }),
  gate: ['ia1-q5-a', 'step94-q12-iii'],
  recall: [
    { front: t`State the addition rule for two events.`, back: t`${math`P(A \cup B) = P(A) + P(B) - P(A \cap B)`}.` },
    { front: t`How is the addition rule proved from the rule for exclusive events?`, back: t`Split ${math`A \cup B = A \cup (B \setminus A)`} and ${math`B = (B \setminus A) \cup (A \cap B)`}, both disjoint, and add.` },
  ],
  proofOrder: [
    {
      title: t`The addition rule`,
      steps: [
        t`Write ${math`A \cup B`} as ${mA} and ${math`B \setminus A`}, which do not overlap.`,
        t`So ${math`P(A \cup B) = P(A) + P(B \setminus A)`}.`,
        t`Write ${mB} as ${math`B \setminus A`} and ${math`A \cap B`}, which do not overlap.`,
        t`So ${math`P(B \setminus A) = P(B) - P(A \cap B)`}; substitute.`,
      ],
    },
  ],
};

