/**
 * prob.independent-events: Independent events: P(A and B) = P(A) P(B), as a test and as a
 * tool. From STEP Support Assignment 12 Q2(iv) (three children, each remembering goggles
 * with probability 1/4, independently of the other two) and Assignment 19 Q4(ii) (three
 * fair dice; the hints' expected gain, whose terms are the probabilities of no, one, two,
 * and three sixes), checked against the hints.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision } from '../cambridge';
import { add, int, mul, pick, q, str, sub, toFloat, type Rational } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { dmath, math, setOf, t } from '../rich';
import { worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const [mA, mB] = [math`A`, math`B`];
const pow = (r: Rational, n: number): Rational => Array.from({ length: n }, () => r).reduce((a, b) => mul(a, b), q(1));
const roll = (rng: Rng): number => 1 + Math.floor(rng() * 6);

// ---------------------------------------------------------------- testing independence on two dice

/** An event on two dice, as a predicate and its description. */
interface DiceEvent { text: string; holds: (a: number, b: number) => boolean }
const EVENTS: readonly DiceEvent[] = [
  { text: 'the first die shows an even number', holds: (a) => a % 2 === 0 },
  { text: 'the second die shows a six', holds: (_a, b) => b === 6 },
  { text: 'the total is seven', holds: (a, b) => a + b === 7 },
  { text: 'the total is eight', holds: (a, b) => a + b === 8 },
  { text: 'the total is even', holds: (a, b) => (a + b) % 2 === 0 },
  { text: 'the two dice show the same number', holds: (a, b) => a === b },
  { text: 'the first die shows more than four', holds: (a) => a > 4 },
  { text: 'at least one die shows a six', holds: (a, b) => a === 6 || b === 6 },
  { text: 'the first die shows a one', holds: (a) => a === 1 },
];
const PAIRS = [1, 2, 3, 4, 5, 6].flatMap((a) => [1, 2, 3, 4, 5, 6].map((b) => [a, b] as const));
const probOf = (f: (a: number, b: number) => boolean): Rational => q(PAIRS.filter(([a, b]) => f(a, b)).length, 36);

type Verdict = 'independent' | 'more' | 'less';
const VERDICTS: readonly ChoiceOption[] = [
  { id: 'independent', label: t`Independent` },
  { id: 'more', label: t`Not independent: they happen together more often than if independent` },
  { id: 'less', label: t`Not independent: they happen together less often than if independent` },
];

interface TestP { i: number; j: number }

const testIndependence = generator<TestP>({
  id: 'test-independence',
  skill: 'Test two events on two dice for independence: compare P(A and B) with P(A) P(B).',
  params: (rng) => {
    const i = int(rng, 0, EVENTS.length - 1);
    let j = int(rng, 0, EVENTS.length - 2);
    if (j >= i) j++;
    return { i, j };
  },
  sane: ({ i, j }) => (i !== j && i >= 0 && j >= 0 && i < EVENTS.length && j < EVENTS.length ? null : 'out of range'),
  problem: ({ i, j }) => {
    const A = EVENTS[i] as DiceEvent;
    const B = EVENTS[j] as DiceEvent;
    const pa = probOf(A.holds);
    const pb = probOf(B.holds);
    const pab = probOf((a, b) => A.holds(a, b) && B.holds(a, b));
    const prod = mul(pa, pb);
    const v: Verdict = str(pab) === str(prod) ? 'independent' : toFloat(pab) > toFloat(prod) ? 'more' : 'less';
    return {
      prompt: t`Two fair dice are thrown. ${mA} is the event that ${A.text}; ${mB} is the event that ${B.text}. Are ${mA} and ${mB} independent?`,
      answer: { kind: 'choice', options: VERDICTS, correct: v },
      solution: [
        t`Count among the ${36} equally likely pairs: ${math`P(A) = ${pa}`}, ${math`P(B) = ${pb}`}, and ${math`P(A \cap B) = ${pab}`}.`,
        t`${math`P(A)P(B) = ${pa} \times ${pb} = ${prod}`}. ${v === 'independent' ? t`It equals ${math`P(A \cap B)`}, so they are [[independent-events|independent]].` : t`It is not ${math`P(A \cap B) = ${pab}`}, so they are not independent: together they happen ${v === 'more' ? 'more' : 'less'} often than independence would give.`}`,
      ],
    };
  },
  solve: ({ i, j }) => {
    // Independence as "knowing B does not change the chance of A": P(A | B) against P(A), when P(B) > 0.
    const A = EVENTS[i] as DiceEvent;
    const B = EVENTS[j] as DiceEvent;
    const inB = PAIRS.filter(([a, b]) => B.holds(a, b));
    const condA = q(inB.filter(([a, b]) => A.holds(a, b)).length, inB.length);
    const pa = probOf(A.holds);
    return [str(condA) === str(pa) ? 'independent' : toFloat(condA) > toFloat(pa) ? 'more' : 'less'];
  },
  misconceptions: ({ i, j }): Misconception[] => {
    const A = EVENTS[i] as DiceEvent;
    const B = EVENTS[j] as DiceEvent;
    const pab = probOf((a, b) => A.holds(a, b) && B.holds(a, b));
    const prod = mul(probOf(A.holds), probOf(B.holds));
    const v: Verdict = str(pab) === str(prod) ? 'independent' : toFloat(pab) > toFloat(prod) ? 'more' : 'less';
    return (['independent', 'more', 'less'] as const).filter((x) => x !== v).map((x) => ({
      response: [x],
      why: x === 'independent'
        ? t`Independence needs ${math`P(A \cap B) = P(A)P(B)`} exactly. Here ${math`P(A \cap B) = ${pab}`} but ${math`P(A)P(B) = ${prod}`}.`
        : v === 'independent'
          ? t`Compare ${math`P(A \cap B) = ${pab}`} with ${math`P(A)P(B) = ${prod}`}: they are equal, so the events are independent.`
          : t`Compare the two numbers again: ${math`P(A \cap B) = ${pab}`} and ${math`P(A)P(B) = ${prod}`}.`,
    }));
  },
});

// ---------------------------------------------------------------- using independence

interface UseP { a: number; ad: number; b: number; bd: number; ask: 'both' | 'either' | 'neither' }

const useIndependence = generator<UseP>({
  id: 'use-independence',
  skill: 'Use independence: multiply for "both", and find "either" and "neither" from the product.',
  params: (rng) => {
    for (;;) {
      const ad = pick(rng, [3, 4, 5, 6]);
      const bd = pick(rng, [3, 4, 5, 7]);
      const p: UseP = { a: int(rng, 1, ad - 1), ad, b: int(rng, 1, bd - 1), bd, ask: pick(rng, ['both', 'either', 'neither'] as const) };
      if (p.a * p.bd !== p.b * p.ad) return p;
    }
  },
  sane: ({ a, ad, b, bd }) => (a >= 1 && a < ad && b >= 1 && b < bd && a * bd !== b * ad ? null : 'out of range'),
  problem: ({ a, ad, b, bd, ask }) => {
    const pa = q(a, ad);
    const pb = q(b, bd);
    const both = mul(pa, pb);
    const either = sub(add(pa, pb), both);
    const neither = mul(sub(q(1), pa), sub(q(1), pb));
    const ans = ask === 'both' ? both : ask === 'either' ? either : neither;
    const what = ask === 'both' ? t`both happen` : ask === 'either' ? t`at least one of them happens` : t`neither happens`;
    return {
      prompt: t`Events ${mA} and ${mB} are independent, with ${math`P(A) = ${pa}`} and ${math`P(B) = ${pb}`}. What is the probability that ${what}?`,
      answer: { kind: 'exact', expected: str(ans) },
      solution: ask === 'both'
        ? [t`Independent, so multiply: ${math`P(A \cap B) = P(A)P(B) = ${pa} \times ${pb} = ${both}`}.`]
        : ask === 'either'
          ? [t`${math`P(A \cup B) = P(A) + P(B) - P(A \cap B)`}, and independence gives ${math`P(A \cap B) = ${both}`}.`, t`So ${math`P(A \cup B) = ${pa} + ${pb} - ${both} = ${either}`}.`]
          : [t`If ${mA} and ${mB} are independent, so are "not ${mA}" and "not ${mB}": ${math`(${1} - ${pa})(${1} - ${pb}) = ${sub(q(1), pa)} \times ${sub(q(1), pb)} = ${neither}`}.`],
    };
  },
  solve: ({ a, ad, b, bd, ask }) => {
    // Count over an ad × bd grid of equally likely pairs: A when the first index is below a, B when the second is below b.
    let good = 0;
    for (let x = 0; x < ad; x++) for (let y = 0; y < bd; y++) {
      const inA = x < a;
      const inB = y < b;
      if (ask === 'both' ? inA && inB : ask === 'either' ? inA || inB : !inA && !inB) good++;
    }
    return str(q(good, ad * bd));
  },
  misconceptions: ({ a, ad, b, bd, ask }): Misconception[] => {
    const pa = q(a, ad);
    const pb = q(b, bd);
    const both = mul(pa, pb);
    if (ask === 'both') return [
      { response: str(add(pa, pb)), why: t`Adding is for "or" with events that cannot happen together. For "both" with independent events, multiply.` },
      { response: str(sub(add(pa, pb), both)), why: t`That is the chance of at least one. "Both" is the product.` },
    ];
    if (ask === 'either') return [
      { response: str(add(pa, pb)), why: t`Adding counts the chance of both twice. Subtract ${math`P(A \cap B) = ${both}`}.` },
      { response: str(both), why: t`That is the chance of both. At least one is more likely than both.` },
    ];
    return [
      { response: str(sub(q(1), both)), why: t`That is one minus the chance of both: "not both". Neither means both fail: multiply the chances of failing.` },
      { response: str(sub(q(1), add(pa, pb))), why: t`One minus the sum takes off the chance of both twice. Multiply ${math`${1} - P(A)`} by ${math`${1} - P(B)`}.` },
    ];
  },
  trial: ({ a, ad, b, bd, ask }, rng) => {
    const inA = rng() < a / ad;
    const inB = rng() < b / bd;
    return ask === 'both' ? inA && inB : ask === 'either' ? inA || inB : !inA && !inB;
  },
});

// ---------------------------------------------------------------- repeated independent trials

interface TrialsP { s: number; d: number; n: number; k: number }

const repeated = generator<TrialsP>({
  id: 'repeated-trials',
  skill: 'Find the probability of a given pattern of successes in independent trials: multiply along it, then count the patterns, as the hints to Assignment 12 Q2(iv)(c) suggest.',
  params: (rng) => {
    const d = pick(rng, [3, 4, 5, 6]);
    const n = int(rng, 3, 4);
    return { s: int(rng, 1, d - 1), d, n, k: int(rng, 1, n - 1) };
  },
  sane: ({ s, d, n, k }) => (s >= 1 && s < d && k >= 1 && k < n ? null : 'out of range'),
  problem: ({ s, d, n, k }) => {
    const p = q(s, d);
    const one = mul(pow(p, k), pow(sub(q(1), p), n - k));
    const ways = choose(n, k);
    const ans = mul(q(ways), one);
    return {
      prompt: t`Each of ${n} children, independently of the others, remembers their goggles with probability ${p}. What is the probability that exactly ${k} of them have goggles?`,
      answer: { kind: 'exact', expected: str(ans) },
      solution: [
        t`One particular pattern, say the first ${k} remember and the rest forget, has probability ${math`\left(${p}\right)^{${k}} \left(${sub(q(1), p)}\right)^{${n - k}} = ${one}`}, multiplying because the children are independent.`,
        t`Every pattern with exactly ${k} remembering has the same probability, and there are ${math`\binom{${n}}{${k}} = ${ways}`} of them: ${math`${ways} \times ${one} = ${ans}`}.`,
      ],
    };
  },
  solve: ({ s, d, n, k }) => {
    // Add the probability of every pattern of n trials with exactly k successes.
    const p = q(s, d);
    let total = q(0);
    for (let m = 0; m < 2 ** n; m++) {
      const bits = [...Array(n).keys()].map((i) => (m >> i) & 1);
      if (bits.reduce((x, y) => x + y, 0) !== k) continue;
      total = add(total, bits.map((bit) => (bit === 1 ? p : sub(q(1), p))).reduce((x, y) => mul(x, y), q(1)));
    }
    return str(total);
  },
  misconceptions: ({ s, d, n, k }): Misconception[] => {
    const p = q(s, d);
    const one = mul(pow(p, k), pow(sub(q(1), p), n - k));
    return [
      { response: str(one), why: t`That is one pattern only. The ${k} who remember could be any ${k} of the ${n}: multiply by ${math`\binom{${n}}{${k}}`}.` },
      { response: str(pow(p, k)), why: t`The other ${n - k} must forget, each with probability ${sub(q(1), p)}: include those factors too.` },
      { response: str(mul(q(choose(n, k)), pow(p, k))), why: t`The count of patterns is right, but each pattern also needs the other ${n - k} to forget: multiply by ${math`\left(${sub(q(1), p)}\right)^{${n - k}}`}.` },
    ];
  },
  trial: ({ s, d, n, k }, rng) => Array.from({ length: n }, () => rng() < s / d).filter(Boolean).length === k,
});

function choose(n: number, k: number): number {
  let v = 1;
  for (let i = 1; i <= k; i++) v = (v * (n - k + i)) / i;
  return Math.round(v);
}

// ---------------------------------------------------------------- Cambridge problems

const SIX = q(1, 6);
const NOT = q(5, 6);
const a19none = auto({
  id: 'a19-q4-ii-none',
  source: cite('step-f19', 'Q4(ii)', true),
  title: t`Three dice, no sixes`,
  prompt: t`I am about to throw three fair dice. What is the probability that I throw no sixes?`,
  answer: { kind: 'exact', expected: str(pow(NOT, 3)) },
  solution: [
    t`The dice are independent, so multiply: each shows a non-six with probability ${NOT}, giving ${math`\left(${NOT}\right)^{${3}} = ${pow(NOT, 3)}`}.`,
    t`This is the first term of the hints' expected gain, ${math`${1} \times P(\text{no sixes})`}.`,
  ],
  reference: str(pow(NOT, 3)),
  verify: () => {
    let n = 0;
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) if (a !== 6 && b !== 6 && c !== 6) n++;
    return same('by listing the 216 throws', str(q(n, 216)), str(pow(NOT, 3)));
  },
  misconceptions: [{ response: str(q(3, 6)), why: t`Adding is not right here. Each die must avoid a six, independently: multiply ${NOT} three times.` }],
  // The hints write P(no sixes) as (5/6)^3 inside the expected gain (125 - 75 - 30 - 3)/216.
  official: { source: cite('step-f19-hints', 'Q4(ii)'), answer: '125/216', agrees: true },
});

const twoSixes = mul(q(3), mul(pow(SIX, 2), NOT));
const a19two = auto({
  id: 'a19-q4-ii-two',
  source: cite('step-f19', 'Q4(ii)', true),
  title: t`Three dice, two sixes`,
  prompt: t`I throw three fair dice. What is the probability of exactly two sixes?`,
  answer: { kind: 'exact', expected: str(twoSixes) },
  solution: [
    t`One pattern, say six, six, not six, has probability ${math`${SIX} \times ${SIX} \times ${NOT} = ${mul(pow(SIX, 2), NOT)}`} by independence.`,
    t`The non-six can be any of the ${3} dice, so ${math`${3} \times ${mul(pow(SIX, 2), NOT)} = ${twoSixes}`}. The hints' expected gain has this term as ${math`${3} \times \left(\frac{${1}}{${6}}\right)^{${2}} \frac{${5}}{${6}}`}, that is ${math`\frac{${30}}{${216}}`} once multiplied by the ${2} pounds at stake.`,
  ],
  reference: str(twoSixes),
  verify: () => {
    let n = 0;
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) if ([a, b, c].filter((x) => x === 6).length === 2) n++;
    return same('by listing the 216 throws', str(q(n, 216)), str(twoSixes));
  },
  misconceptions: [{ response: str(mul(pow(SIX, 2), NOT)), why: t`That is one order only. The die without a six could be the first, second, or third.` }],
  official: { source: cite('step-f19-hints', 'Q4(ii)'), answer: '15/216', agrees: true },
});

const GOG = q(1, 4);
const exactlyOne = mul(q(3), mul(GOG, pow(sub(q(1), GOG), 2)));
const a12one = auto({
  id: 'a12-q2-iv-one',
  source: cite('step-f12', 'Q2(iv)', true),
  title: t`Exactly one child has goggles`,
  prompt: t`Three children have a swimming lesson. Each child has probability ${GOG}, independently of the other two, of remembering goggles. What is the probability that exactly one child has goggles?`,
  answer: { kind: 'exact', expected: str(exactlyOne) },
  solution: [
    t`The first child only: ${math`${GOG} \times ${sub(q(1), GOG)} \times ${sub(q(1), GOG)} = ${mul(GOG, pow(sub(q(1), GOG), 2))}`}, multiplying by independence.`,
    t`As the hints say of part (c), what matters is which child: any of the three could be the one, so ${math`${3} \times ${mul(GOG, pow(sub(q(1), GOG), 2))} = ${exactlyOne}`}.`,
  ],
  reference: str(exactlyOne),
  verify: () => same('the three-child pattern count', repeated.at({ s: 1, d: 4, n: 3, k: 1 }).reference as string, str(exactlyOne)),
  misconceptions: [{ response: str(mul(GOG, pow(sub(q(1), GOG), 2))), why: t`That is one particular child having goggles. Exactly one could be any of the three.` }],
});

const pFirst = GOG;
const pAtLeast = sub(q(1), pow(sub(q(1), GOG), 3));
const a12dep = auto({
  id: 'a12-q2-iv-dependent',
  source: cite('step-f12', 'Q2(iv)(a), (b)', true),
  title: t`Independent children, dependent events`,
  prompt: t`The same three children, each remembering goggles with probability ${GOG}, independently. Let ${mA} be "the first child in the queue has goggles" and ${mB} be "at least one child has goggles". Are ${mA} and ${mB} independent?`,
  answer: { kind: 'choice', options: VERDICTS, correct: 'more' },
  solution: [
    t`${math`P(A) = ${pFirst}`} (part (b)) and ${math`P(B) = ${pAtLeast}`} (part (a)). If the first child has goggles, at least one does, so ${math`P(A \cap B) = P(A) = ${pFirst}`}.`,
    t`${math`P(A)P(B) = ${mul(pFirst, pAtLeast)}`}, smaller than ${pFirst}: not independent. The children are independent of each other, but these two events about them are not.`,
  ],
  reference: 'more',
  verify: () => {
    // Over the eight equally weighted branches.
    let pa = q(0);
    let pb = q(0);
    let pab = q(0);
    for (let m = 0; m < 8; m++) {
      const has = [0, 1, 2].map((i) => ((m >> i) & 1) === 1);
      const w = has.map((h) => (h ? GOG : sub(q(1), GOG))).reduce((x, y) => mul(x, y), q(1));
      const A = has[0] === true;
      const B = has.some(Boolean);
      if (A) pa = add(pa, w);
      if (B) pb = add(pb, w);
      if (A && B) pab = add(pab, w);
    }
    return same('P(A and B) against P(A)P(B)', [str(pab), str(mul(pa, pb)), toFloat(pab) > toFloat(mul(pa, pb))].join(), `${str(pFirst)},${str(mul(pFirst, pAtLeast))},true`);
  },
  misconceptions: [{ response: 'independent', why: t`Knowing the first child has goggles makes "at least one" certain, which changes its probability from ${pAtLeast} to ${1}.` }],
});

const a19bet = supervision({
  id: 'a19-q4-ii-independence',
  source: cite('step-f19', 'Q4(ii)', true),
  title: t`Where independence was used`,
  prompt: t`For three fair dice, work out the probabilities of no, one, two, and three sixes. Say exactly where you use independence of the dice, and check that the four probabilities add up to ${1}. Then explain why the event "two sixes" needs a factor ${3} but "three sixes" does not.`,
  writeUp: 'explanation',
  official: cite('step-f19-hints', 'Q4(ii)'),
});
const disjointNotIndependent = supervision({
  id: 'a12-q2-iv-disjoint',
  source: cite('step-f12', 'Q2(iv)', true),
  title: t`Disjoint is not independent`,
  prompt: t`For the three children, let ${mA} be "nobody has goggles" and ${mB} be "everybody has goggles". Are ${mA} and ${mB} independent? Explain, and explain in general why two events that cannot happen together, each with positive probability, are never independent.`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

const EVEN = EVENTS[0] as DiceEvent;
const SEVEN = EVENTS[2] as DiceEvent;
const pEven = probOf(EVEN.holds);
const pSeven = probOf(SEVEN.holds);
const pBoth = probOf((a, b) => EVEN.holds(a, b) && SEVEN.holds(a, b));

const claims: ProbabilityClaim[] = [
  { what: 'exactly one of three children has goggles', exact: exactlyOne, trial: (rng) => [0, 1, 2].filter(() => rng() < 0.25).length === 1 },
  { what: 'first die even and total seven', exact: pBoth, trial: (rng) => { const a = roll(rng); const b = roll(rng); return a % 2 === 0 && a + b === 7; } },
];

export const independentEvents: TopicContent = {
  topicId: 'prob.independent-events',
  goal: t`Test whether two events are independent with ${math`P(A \cap B) = P(A)P(B)`}, and use independence to multiply probabilities.`,
  lesson: [
    { kind: 'p', text: t`STEP Support Assignment ${12} says each child remembers goggles "independently of the other two": whether one child remembers tells you nothing about the others. That is what lets the hints multiply along the branches of the tree.` },
    { kind: 'rule', text: t`Events ${mA} and ${mB} are [[independent-events|independent]] when ${dmath`P(A \cap B) = P(A)\,P(B).`} Equivalently, when ${math`P(B) > ${0}`}, ${math`P(A \mid B) = P(A)`}: knowing ${mB} happened does not change the chance of ${mA}.` },
    { kind: 'p', text: t`Test it by computing both sides. Throw two dice: "the first die is even" has probability ${pEven}, "the total is seven" has ${pSeven}, and both together have ${pBoth}, the pairs ${setOf([2, 4, 6])} with ${setOf([5, 3, 1])}. Since ${math`${pEven} \times ${pSeven} = ${mul(pEven, pSeven)}`}, they are independent, even though both depend on the first die.` },
    { kind: 'p', text: t`Use it to multiply. Three dice, each a six with probability ${SIX}: three sixes has probability ${math`\left(${SIX}\right)^{${3}} = ${pow(SIX, 3)}`}, and no sixes ${math`\left(${NOT}\right)^{${3}} = ${pow(NOT, 3)}`}. For exactly two sixes, one pattern has probability ${math`\left(${SIX}\right)^{${2}} \times ${NOT}`}, and there are ${3} patterns.` },
    { kind: 'p', text: t`If ${mA} and ${mB} are independent, so are their complements, so "neither" has probability ${math`(${1} - P(A))(${1} - P(B))`}, and "at least one" is one minus that. The goggles: at least one of three has goggles with probability ${math`${1} - \left(${sub(q(1), GOG)}\right)^{${3}} = ${pAtLeast}`}.` },
    { kind: 'p', text: t`Independent is not the same as mutually exclusive, which means the events cannot happen together. If ${mA} and ${mB} cannot both happen and each has positive probability, then ${math`P(A \cap B) = ${0} \ne P(A)P(B)`}, so they are dependent, strongly so. And events built from independent trials can be dependent: "the first child has goggles" and "at least one child has goggles" are not independent.` },
  ],
  examples: [
    workedCambridge(a19none),
    worked(testIndependence, { i: 0, j: 2 }, t`Even first die, total seven`),
    worked(repeated, { s: 1, d: 6, n: 4, k: 2 }, t`Exactly two of four`),
  ],
  generators: [testIndependence, useIndependence, repeated],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['independent-events'],
  claims,
  cambridge: [a19two, a12one, a12dep, a19bet, disjointNotIndependent],
  gate: ['a19-q4-ii-two', 'a12-q2-iv-one', 'a12-q2-iv-dependent', 'a19-q4-ii-independence', 'a12-q2-iv-disjoint'],
};
