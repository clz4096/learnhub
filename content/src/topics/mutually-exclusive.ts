/**
 * pre.mutually-exclusive: events that cannot happen together, whose probabilities add, and
 * exhaustive events, whose probabilities sum to one. From the GCSE content ("probabilities of
 * an exhaustive set of mutually exclusive events sum to one") as STEP Support uses it: the
 * problems are Assignment 6, Q4(i)(b) (non-smokers, two exclusive cases), Assignment 12,
 * Q2(ii) (two sweets of the same flavour) and Assignment 12, Q3 (the raffle queue: the
 * successful queues split into exclusive cases), all checked against the hints and, for the
 * raffle, by listing every queue.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { add, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const [mA, mB, mk] = [math`A`, math`B`, math`k`];
const ways = (total: number): number => (total < 2 || total > 12 ? 0 : 6 - Math.abs(total - 7));

// ---------------------------------------------------------------- generators

const COLOURS = ['red', 'blue', 'green', 'yellow', 'white'];
interface SpinP { probs: number[]; den: number; a: number; b: number }

const spinGen = generator<SpinP>({
  id: 'add-exclusive',
  skill: 'Add the probabilities of mutually exclusive events.',
  quick: true,
  params: (rng) => {
    const den = pick(rng, [10, 12, 20]);
    for (;;) {
      const k = int(rng, 3, 5);
      const cuts = Array.from({ length: k - 1 }, () => int(rng, 1, den - 1)).sort((x, y) => x - y);
      const probs = [...cuts, den].map((c, i) => c - (i === 0 ? 0 : (cuts[i - 1] as number)));
      if (probs.some((p) => p === 0)) continue;
      const a = int(rng, 0, k - 1);
      let b = int(rng, 0, k - 1);
      while (b === a) b = int(rng, 0, k - 1);
      return { probs, den, a, b };
    }
  },
  sane: ({ probs, den, a, b }) => (probs.reduce((x, y) => x + y, 0) === den && a !== b && probs.every((p) => p > 0) ? null : 'probabilities must be positive and sum to one'),
  problem: ({ probs, den, a, b }) => {
    const P = probs.map((p) => q(p, den));
    const ans = add(P[a] as Rational, P[b] as Rational);
    return {
      prompt: t`A spinner lands on one colour each spin, with probabilities ${probs.map((_, i) => t`${COLOURS[i] as string} ${math`${P[i] as Rational}`}`).flatMap((r, i) => (i === 0 ? [...r] : [...t`, `, ...r]))}. Find the probability that it lands on ${COLOURS[a] as string} or ${COLOURS[b] as string}.`,
      answer: { kind: 'exact', expected: str(ans) },
      solution: [
        t`The spinner shows one colour, so "${COLOURS[a] as string}" and "${COLOURS[b] as string}" cannot both happen: the events are mutually exclusive.`,
        t`So their probabilities add: ${math`${P[a] as Rational} + ${P[b] as Rational} = ${ans}`}.`,
      ],
    };
  },
  solve: ({ probs, den, a, b }) => str(q((probs[a] as number) + (probs[b] as number), den)),
  misconceptions: ({ probs, den, a, b }): Misconception[] => {
    const [pa, pb] = [q(probs[a] as number, den), q(probs[b] as number, den)];
    return [
      { response: str(mul(pa, pb)), why: t`Multiplying is for both happening (with independence). "Or" for events that cannot happen together means adding.` },
      { response: str(sub(add(pa, pb), mul(pa, pb))), why: t`There is no overlap to subtract: one spin cannot show both colours, so the overlap has probability ${0}.` },
      { response: str(sub(q(1), add(pa, pb))), why: t`That is the probability of neither colour. You want either one.` },
    ];
  },
});

interface MissP { weights: number[] }

const missGen = generator<MissP>({
  id: 'missing-probability',
  skill: 'Use that an exhaustive set of mutually exclusive outcomes has probabilities summing to one.',
  params: (rng) => {
    for (;;) {
      const weights = Array.from({ length: int(rng, 3, 5) }, () => int(rng, 1, 4));
      // Unequal weights, so "all equally likely" is a real slip.
      if (new Set(weights).size > 1) return { weights };
    }
  },
  sane: ({ weights }) => (weights.length >= 3 && weights.every((w) => w >= 1) && new Set(weights).size > 1 ? null : 'out of range'),
  problem: ({ weights }) => {
    const total = weights.reduce((x, y) => x + y, 0);
    const k = q(1, total);
    return {
      prompt: t`A biased die-like spinner shows exactly one of the numbers ${math`${1}, \ldots, ${weights.length}`}. The probability of showing ${math`i`} is ${math`c_{i}k`}, where ${weights.map((w, i) => t`${math`c_{${i + 1}} = ${w}`}`).flatMap((r, i) => (i === 0 ? [...r] : [...t`, `, ...r]))}. Find ${math`k`}.`,
      answer: { kind: 'exact', expected: str(k) },
      solution: [
        t`The outcomes are mutually exclusive (one number shows) and exhaustive (some number shows), so their probabilities sum to ${1}.`,
        t`So ${math`${total}k = ${1}`}, since ${math`c_{${1}} + \cdots + c_{${weights.length}} = ${total}`}. So ${math`k = ${k}`}.`,
      ],
    };
  },
  solve: ({ weights }) => {
    // Find k by testing unit fractions until the probabilities sum to one.
    for (let d = 1; d < 100; d++) if (weights.reduce((s, w) => add(s, q(w, d)), q(0)).num === 1n && weights.reduce((s, w) => add(s, q(w, d)), q(0)).den === 1n) return str(q(1, d));
    return '0';
  },
  misconceptions: ({ weights }): Misconception[] => {
    const total = weights.reduce((x, y) => x + y, 0);
    return [
      { response: str(q(1, weights.length)), why: t`That would be right if all outcomes were equally likely. Here the outcome ${math`i`} has weight ${math`c_{i}`}: the weights add to ${total}.` },
      { response: String(total), why: t`The probabilities ${math`c_{i}k`} add to ${math`${total}k`}, and that must equal ${1}, so ${math`k`} is ${1} over ${total}.` },
    ];
  },
});

interface NotP { t: number }

const notGen = generator<NotP>({
  id: 'complement',
  skill: 'Find P(not A) as 1 - P(A): A and not A are exclusive and exhaustive.',
  quick: true,
  params: (rng) => ({ t: int(rng, 2, 12) }),
  sane: ({ t: s }) => (s >= 2 && s <= 12 ? null : 'out of range'),
  problem: ({ t: s }) => {
    const pA = q(ways(s), 36);
    return {
      prompt: t`Two fair dice are rolled. Find the probability that the total is not ${s}.`,
      answer: { kind: 'exact', expected: str(sub(q(1), pA)) },
      solution: [
        t`"Total ${s}" and "total not ${s}" cannot both happen, and one of them must: they are exclusive and exhaustive, so ${math`P(\text{not } A) = ${1} - P(A)`}.`,
        t`Of the ${36} equally likely ordered pairs, ${ways(s)} give a total of ${s}, so ${math`P(A) = ${pA}`} and the answer is ${math`${1} - ${pA} = ${sub(q(1), pA)}`}.`,
      ],
    };
  },
  solve: ({ t: s }) => {
    let n = 0;
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b !== s) n++;
    return str(q(n, 36));
  },
  misconceptions: ({ t: s }): Misconception[] => [
    { response: str(q(ways(s), 36)), why: t`That is the probability that the total is ${s}. Subtract it from ${1}.` },
    { response: str(q(10, 11)), why: t`The ${11} possible totals are not equally likely: count the ${36} ordered pairs instead.` },
  ],
});

interface OrP { a: number; b: number }

const orGen = generator<OrP>({
  id: 'either-total',
  skill: 'Add the probabilities of two different totals of two dice: they are mutually exclusive.',
  params: (rng) => {
    const a = int(rng, 2, 12);
    let b = int(rng, 2, 12);
    while (b === a) b = int(rng, 2, 12);
    return { a, b };
  },
  sane: ({ a, b }) => (a !== b ? null : 'two different totals'),
  problem: ({ a, b }) => {
    const ans = q(ways(a) + ways(b), 36);
    return {
      prompt: t`Two fair dice are rolled. Find the probability that the total is ${a} or ${b}.`,
      answer: { kind: 'exact', expected: str(ans) },
      solution: [
        t`A roll has one total, so the two events are mutually exclusive, and their probabilities add.`,
        t`Totals of ${a} come from ${ways(a)} of the ${36} pairs and totals of ${b} from ${ways(b)}: ${math`\frac{${ways(a)}}{${36}} + \frac{${ways(b)}}{${36}} = ${ans}`}.`,
      ],
    };
  },
  solve: ({ a, b }) => {
    let n = 0;
    for (let x = 1; x <= 6; x++) for (let y = 1; y <= 6; y++) if (x + y === a || x + y === b) n++;
    return str(q(n, 36));
  },
  misconceptions: ({ a, b }): Misconception[] => [
    { response: str(mul(q(ways(a), 36), q(ways(b), 36))), why: t`Multiplying gives the chance of both, which here is ${0}. For "or" with exclusive events, add.` },
    { response: str(q(2, 11)), why: t`The totals from ${2} to ${12} are not equally likely. Count ordered pairs out of ${36}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const a6q4b = auto({
  id: 'a6-q4-i-b',
  source: cite('step-f06', 'Assignment 6, Q4(i)(b)'),
  title: t`Non-smokers`,
  prompt: t`A study found that ${40}% of a large population were men and ${60}% women. Of the men, ${50}% were smokers; of the women, ${30}% were smokers. What is the probability that a person picked at random is a non-smoker?`,
  answer: { kind: 'exact', expected: str(q(62, 100)) },
  solution: [
    t`A non-smoker is a male non-smoker or a female non-smoker, and nobody is both: two mutually exclusive cases.`,
    t`Male non-smoker: ${math`${q(40, 100)} \times ${q(50, 100)} = ${q(20, 100)}`}. Female non-smoker: ${math`${q(60, 100)} \times ${q(70, 100)} = ${q(42, 100)}`}.`,
    t`Add the exclusive cases: ${math`${q(20, 100)} + ${q(42, 100)} = ${q(62, 100)}`}. (In a population of ${100}: ${20} men and ${42} women do not smoke.)`,
  ],
  reference: '31/50',
  verify: () => same('non-smokers out of 100', 40 * 0.5 + 60 * 0.7, 62),
  misconceptions: [
    { response: '6/10', why: t`That averages ${math`${50}\%`} and ${math`${70}\%`}. The groups have different sizes: weight each by its share.` },
    { response: '38/100', why: t`That is the probability of a smoker. Non-smokers are the other ${62}%.` },
  ],
  official: { source: cite('step-f06-hints', 'Assignment 6, Q4(i)(b)'), answer: '62/100', agrees: true },
});

const a12q2 = auto({
  id: 'a12-q2-ii',
  source: cite('step-f12', 'Assignment 12, Q2(ii)'),
  title: t`Two sweets of one flavour`,
  prompt: t`A bag contains ${9} mint imperials and ${6} lemon sherbets. I take two sweets out without looking, one after the other, and eat them. What is the probability that I eat two sweets of the same flavour?`,
  answer: { kind: 'exact', expected: str(add(mul(q(9, 15), q(8, 14)), mul(q(6, 15), q(5, 14)))) },
  solution: [
    t`"Same flavour" splits into two mutually exclusive cases: two mints, or two lemons.`,
    t`Two mints: ${math`\frac{${9}}{${15}} \times \frac{${8}}{${14}} = ${q(72, 210)}`}. Two lemons: ${math`\frac{${6}}{${15}} \times \frac{${5}}{${14}} = ${q(30, 210)}`}. The second fraction in each is conditional: one sweet is gone.`,
    t`Add the cases: ${math`${q(72, 210)} + ${q(30, 210)} = ${q(102, 210)}`}. Or by counting pairs: ${math`\frac{\binom{${9}}{${2}} + \binom{${6}}{${2}}}{\binom{${15}}{${2}}} = \frac{${36} + ${15}}{${105}}`}, the same.`,
  ],
  reference: '17/35',
  verify: () => {
    // List all ordered pairs of distinct sweets.
    let same_ = 0;
    let all = 0;
    for (let i = 0; i < 15; i++) for (let j = 0; j < 15; j++) if (i !== j) { all++; if ((i < 9) === (j < 9)) same_++; }
    return same('P(same)', str(q(same_, all)), '17/35');
  },
  misconceptions: [
    { response: str(add(mul(q(9, 15), q(9, 15)), mul(q(6, 15), q(6, 15)))), why: t`The first sweet is eaten, so the second draw is from ${14} sweets, with one fewer of the first flavour.` },
    { response: str(mul(q(9, 15), q(8, 14))), why: t`That is two mints only. Two lemons is also "the same flavour": add that exclusive case.` },
  ],
  official: { source: cite('step-f12-hints', 'Assignment 12, Q2(ii)'), answer: '17/35', agrees: true },
});

/** The probability that every buyer gets change, with m one-pound people and n two-pound people, over all queues. */
function raffle(m: number, n: number): Rational {
  let ok = 0;
  let total = 0;
  const go = (ones: number, twos: number, coins: number): void => {
    if (ones === 0 && twos === 0) { ok++; total++; return; }
    // Count queues by position choices, each equally likely as a sequence of identical coins.
    if (ones > 0) go(ones - 1, twos, coins + 1);
    if (twos > 0) { if (coins > 0) go(ones, twos - 1, coins - 1); else total += binom(ones + twos - 1, twos - 1); }
  };
  go(m, n, 0);
  return q(ok, total);
}
const binom = (n: number, k: number): number => {
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
};

const a12q3i = auto({
  id: 'a12-q3-i',
  source: cite('step-f12', 'Assignment 12, Q3(i)'),
  title: t`The raffle queue`,
  prompt: t`I sell raffle tickets at ${math`\pounds ${1}`} each. In the queue are ${math`m`} people each with a single ${math`\pounds ${1}`} coin and ${math`n`} people each with a single ${math`\pounds ${2}`} coin; every arrangement of the queue is equally likely. I start with no coins, and stop if I cannot give change. In the case ${math`n = ${1}`}, ${math`m \ge ${1}`}, find the probability that I sell a ticket to every person in the queue, as a formula in ${math`m`}.`,
  answer: { kind: 'expression', expected: 'm/(m + 1)', variables: ['m'], domains: { m: { kind: 'integer', min: 1, max: 12 } } },
  solution: [
    t`The only way to fail is to meet the ${math`\pounds ${2}`} person with no coins in hand, which happens exactly when that person is first. If anyone else is first, I hold at least one ${math`\pounds ${1}`} coin from then on.`,
    t`The two events "the ${math`\pounds ${2}`} person is first" and "a ${math`\pounds ${1}`} person is first" are mutually exclusive and exhaustive. The ${math`\pounds ${2}`} person is equally likely to be in any of the ${math`m + ${1}`} places, so the first has probability ${math`\frac{${1}}{m + ${1}}`}.`,
    t`So the probability of success is ${math`${1} - \frac{${1}}{m + ${1}} = \frac{m}{m + ${1}}`}.`,
  ],
  reference: 'm/(m + 1)',
  verify: () => {
    for (let m = 1; m <= 8; m++) { const e = same(`m = ${m}`, str(raffle(m, 1)), str(q(m, m + 1))); if (e !== null) return e; }
    for (let m = 2; m <= 8; m++) { const e = same(`n = 2, m = ${m}`, str(raffle(m, 2)), str(q(m - 1, m + 1))); if (e !== null) return e; }
    return null;
  },
  misconceptions: [
    { response: '1/(m + 1)', why: t`That is the probability of failure: the ${math`\pounds ${2}`} person first. Success is the other, exclusive, case.` },
    { response: '1/2', why: t`The ${math`\pounds ${2}`} person is one of ${math`m + ${1}`}, so being first has probability ${math`\frac{${1}}{m + ${1}}`}, not ${math`\frac{${1}}{${2}}`}.` },
  ],
  official: { source: cite('step-f12-hints', 'Assignment 12, Q3(i)'), answer: 'm/(m + 1)', agrees: true },
});

const a12q3ii = supervision({
  id: 'a12-q3-ii',
  source: cite('step-f12', 'Assignment 12, Q3(ii)'),
  title: t`Two ${math`\pounds ${2}`} coins`,
  prompt: t`In the raffle queue above, show by considering the first three people in the queue that the probability that I am able to sell one ticket to each person in the case ${math`n = ${2}`} and ${math`m \ge ${2}`} is ${math`\frac{m - ${1}}{m + ${1}}`}. Make clear which cases you add, and why they are mutually exclusive and cover every successful queue.`,
  writeUp: 'proof',
  official: cite('step-f12-hints', 'Assignment 12, Q3(ii)'),
});

// ---------------------------------------------------------------- lesson

export const mutuallyExclusive: TopicContent = {
  topicId: 'pre.mutually-exclusive',
  goal: t`Add probabilities of events that cannot happen together; an exhaustive set sums to one.`,
  objective: t`Add probabilities of events that cannot happen together, and use that all cases sum to one.`,
  why: t`Splitting an event into cases that cannot overlap is the first move in most probability problems.`,
  minutes: 15,
  lesson: [
    { kind: 'section', title: t`Either, never both` },
    { kind: 'hook', text: t`Roll two dice. A total of ${7} has probability ${math`\frac{${6}}{${36}}`} and a total of ${11} has ${math`\frac{${2}}{${36}}`}. Is the probability of "${7} or ${11}" just the sum? Here, yes. For "an even total or a total above ${8}", no. What is the difference?` },
    { kind: 'narrative', text: t`A roll has exactly one total, so it cannot be ${7} and ${11} at once. Count the outcomes: the ${6} pairs giving ${7} and the ${2} pairs giving ${11} are different pairs, so together there are ${8}, and the probability is ${math`\frac{${8}}{${36}}`}. Adding is right because nothing is counted twice. But an even total and a total above ${8} can happen together (a total of ${10}), and adding would count those pairs twice.` },
    {
      kind: 'definition',
      name: t`Mutually exclusive, exhaustive`,
      formal: t`Events ${mA} and ${mB} are [[mutually-exclusive|mutually exclusive]] if they cannot both happen: ${math`A \cap B = \varnothing`}. Events ${math`A_{${1}}, \ldots, A_{k}`} are mutually exclusive if every two of them are, and [[exhaustive-events|exhaustive]] if one of them must happen: ${math`A_{${1}} \cup \cdots \cup A_{k}`} is the whole sample space.`,
      plain: t`Exclusive: no outcome is in both. Exhaustive: every outcome is in at least one. "Total ${7}" and "total ${11}" are exclusive but not exhaustive; "odd total" and "even total" are both.`,
    },
    { kind: 'theorem', name: t`Adding exclusive events`, statement: t`If ${mA} and ${mB} are mutually exclusive, then ${math`P(A \text{ or } B) = P(A) + P(B)`}. If ${math`A_{${1}}, \ldots, A_{k}`} are mutually exclusive, ${math`P(A_{${1}} \text{ or } \cdots \text{ or } A_{k}) = P(A_{${1}}) + \cdots + P(A_{k})`}.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Equally likely outcomes`, text: t`Take a sample space of ${math`N`} equally likely outcomes, so ${math`P(E) = \frac{|E|}{N}`} for each event ${math`E`}.` },
        { label: t`No overlap, so counts add`, text: t`Since no outcome is in both ${mA} and ${mB}, the outcomes of "${mA} or ${mB}" are those of ${mA} together with those of ${mB}, none counted twice: ${math`|A \cup B| = |A| + |B|`}.` },
        { label: t`Divide by N`, text: t`${math`P(A \text{ or } B) = \frac{|A| + |B|}{N} = P(A) + P(B)`}. For ${mk} events, repeat: each new event adds outcomes not already counted.` },
      ],
    },
    { kind: 'p', text: t`(In the Tripos this addition rule is not proved but taken as an axiom of probability, for any sample space; the counting argument shows why it is the right axiom.)` },
    { kind: 'theorem', name: t`Exhaustive and exclusive events sum to one`, statement: t`If ${math`A_{${1}}, \ldots, A_{k}`} are mutually exclusive and exhaustive, then ${math`P(A_{${1}}) + \cdots + P(A_{k}) = ${1}`}. In particular ${math`P(\text{not } A) = ${1} - P(A)`}.` },
    { kind: 'p', text: t`Proof: their union is the whole sample space, which has probability ${1}, and by the addition rule its probability is the sum. For the complement, ${mA} and "not ${mA}" are exclusive and exhaustive, so ${math`P(A) + P(\text{not } A) = ${1}`}.` },
    checkFrom(orGen, { a: 7, b: 11 }, t`Exclusive totals add: ${math`\frac{${6}}{${36}} + \frac{${2}}{${36}} = \frac{${8}}{${36}} = \frac{${2}}{${9}}`}.`),
    { kind: 'section', title: t`Splitting into cases` },
    { kind: 'narrative', text: t`The real use is in reverse: break a hard event into exclusive cases you can each find. "Two sweets of the same flavour" from a bag of ${9} mints and ${6} lemons is "two mints" or "two lemons". These cannot both happen, so ${math`P = \frac{${9}}{${15}} \cdot \frac{${8}}{${14}} + \frac{${6}}{${15}} \cdot \frac{${5}}{${14}} = ${q(17, 35)}`}. The skill is choosing cases that do not overlap and miss nothing.` },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`From a pack of ${52} cards, ${math`P(\text{king or heart}) = \frac{${4}}{${52}} + \frac{${13}}{${52}} = \frac{${17}}{${52}}`}.`, counterexample: t`The king of hearts is in both events and was counted twice. There are ${16} cards that are kings or hearts, so the answer is ${math`\frac{${16}}{${52}}`}. Adding needs exclusive events.` },
    { kind: 'pitfall', claim: t`Mutually exclusive events are independent.`, counterexample: t`For one die, "a six" and "a one" are exclusive. If you know a six came up, a one is now impossible: ${math`P(\text{both}) = ${0}`}, not ${math`\frac{${1}}{${6}} \times \frac{${1}}{${6}}`}. Exclusive events with positive probabilities are never independent.` },
    { kind: 'pitfall', claim: t`If ${math`P(A) + P(B) = ${1}`}, then ${mA} and ${mB} are exclusive and exhaustive.`, counterexample: t`One die: ${math`A = \{${1}, ${2}, ${3}\}`} and ${math`B = \{${3}, ${4}, ${5}\}`} have probabilities summing to ${1}, but they overlap at ${3} and miss ${6}.` },
    { kind: 'takeaway', text: t`Add probabilities only for events that cannot happen together; a complete set of such cases has total probability one.` },
  ],
  examples: [
    workedCambridge(a6q4b),
    worked(missGen, { weights: [1, 2, 3, 4] }, t`Finding the unknown constant`),
    worked(notGen, { t: 7 }, t`Any total but seven`),
  ],
  generators: [spinGen, missGen, notGen, orGen],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['mutually-exclusive', 'exhaustive-events'],
  cambridge: [a12q3i, a12q3ii, a12q2],
  gate: ['a12-q3-i', 'a12-q3-ii'],
  recall: [
    { front: t`When is ${math`P(A \text{ or } B) = P(A) + P(B)`}?`, back: t`When ${mA} and ${mB} are mutually exclusive: they cannot both happen.` },
    { front: t`What do the probabilities of an exhaustive set of mutually exclusive events add to?`, back: t`${1}. So ${math`P(\text{not } A) = ${1} - P(A)`}.` },
  ],
  proofOrder: [
    {
      title: t`Why exclusive probabilities add`,
      steps: [
        t`Use ${math`N`} equally likely outcomes, so ${math`P(E) = |E|/N`}.`,
        t`No outcome lies in both ${mA} and ${mB}.`,
        t`So ${math`|A \cup B| = |A| + |B|`}, with nothing counted twice.`,
        t`Dividing by ${math`N`} gives ${math`P(A \text{ or } B) = P(A) + P(B)`}.`,
      ],
    },
  ],
};

