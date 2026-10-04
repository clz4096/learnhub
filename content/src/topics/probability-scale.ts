/** pre.probability-scale: Probability of equally likely outcomes. */
import { int, pick, q, str, sub, toFloat, upTo } from '../math';
import { generator, type Misconception } from '../problem';
import { dmath, ident, listOf, math, t, type Rich } from '../rich';
import { worked, type ProbabilityClaim, type TopicContent } from '../topic';
import type { Rng } from '@learnhub/mastery';

/** P(event) with the event in words: P(\text{not red}). */
const P = (event: string) => math`P(\text{${event}})`;
const mA = math`A`;

// ---------------------------------------------------------------- generators

interface BagP { r: number; b: number; g: number; not: boolean }

const bag = generator<BagP>({
  id: 'bag',
  skill: 'Find a probability as favourable outcomes over equally likely outcomes, or its complement.',
  params(rng) {
    for (;;) {
      const p = { r: int(rng, 1, 9), b: int(rng, 1, 9), g: int(rng, 1, 9), not: rng() < 0.5 };
      // Equal counts would make the "colours are equally likely" slip right by accident.
      if (!(p.r === p.b && p.b === p.g)) return p;
    }
  },
  sane: ({ r, b, g }) => ([r, b, g].every((x) => x >= 1 && x <= 9) && !(r === b && b === g) ? null : 'out of range'),
  problem: ({ r, b, g, not }) => {
    const n = r + b + g;
    const pr = q(r, n);
    const ans = not ? sub(q(1), pr) : pr;
    return {
      prompt: t`A bag holds ${r} red, ${b} blue, and ${g} green counters. One counter is taken at random. What is the probability that it is ${not ? 'not red' : 'red'}?`,
      answer: { kind: 'exact', expected: str(ans) },
      solution: [
        t`Each of the ${n} counters is equally likely to be taken, so there are ${n} [[equally-likely|equally likely]] outcomes.`,
        t`${r} of them are red, so ${math`${P('red')} = \frac{${r}}{${n}}`}${str(pr) === `${r}/${n}` ? '' : t`, which is ${pr}`}.`,
        ...(not ? [t`"Not red" is the [[complement-event|complement]] of "red": ${math`${P('not red')} = ${1} - ${pr} = ${ans}`}. Or count directly: ${b + g} of the ${n} counters are not red.`] : []),
      ],
    };
  },
  solve: ({ r, b, g, not }) => {
    const counters = [...Array(r).fill('red'), ...Array(b).fill('blue'), ...Array(g).fill('green')] as string[];
    const good = counters.filter((c) => (c === 'red') !== not).length;
    return str(q(good, counters.length));
  },
  misconceptions: ({ r, b, g, not }): Misconception[] => {
    const n = r + b + g;
    return not
      ? [
        { response: str(q(r, n)), why: t`That is the probability that it is red. "Not red" is everything else: ${1} minus that.` },
        { response: str(q(b + g, r)), why: t`That compares not red with red. A probability compares favourable outcomes with all outcomes, so divide by ${n}.` },
        { response: String(b + g), why: t`That is how many counters are not red. A probability divides it by all ${n} counters.` },
      ]
      : [
        { response: str(q(r, b + g)), why: t`That compares red with the other colours. A probability divides by the total number of counters, ${n}.` },
        { response: str(q(1, 3)), why: t`The ${3} colours are not equally likely, because there are different numbers of each. The counters are equally likely, so count counters.` },
        { response: String(r), why: t`That is how many counters are red. A probability divides it by all ${n} counters.` },
      ];
  },
  trial: ({ r, b, g, not }, rng) => {
    const k = Math.floor(rng() * (r + b + g));
    return (k < r) !== not;
  },
});

type DieEvent = { kind: 'multiple'; k: number } | { kind: 'more-than'; m: number } | { kind: 'prime' };
interface DieP { n: number; e: DieEvent; not: boolean }

const isPrime = (x: number): boolean => x >= 2 && upTo(Math.floor(Math.sqrt(x))).every((d) => d === 1 || x % d !== 0);
const inEvent = (e: DieEvent, x: number): boolean => (e.kind === 'multiple' ? x % e.k === 0 : e.kind === 'more-than' ? x > e.m : isPrime(x));
const eventText = (e: DieEvent): Rich => (e.kind === 'multiple' ? t`a multiple of ${e.k}` : e.kind === 'more-than' ? t`more than ${e.m}` : t`a prime number`);

const die = generator<DieP>({
  id: 'die',
  skill: 'Count favourable faces of a fair die, including a "not" event.',
  params(rng) {
    const n = pick(rng, [6, 8, 10, 12, 20]);
    const e: DieEvent = pick(rng, [
      { kind: 'multiple', k: int(rng, 2, 5) },
      { kind: 'more-than', m: int(rng, 2, n - 2) },
      { kind: 'prime' },
    ] as DieEvent[]);
    return { n, e, not: rng() < 0.3 };
  },
  sane: ({ n, e }) => ([6, 8, 10, 12, 20].includes(n) && (e.kind !== 'more-than' || (e.m >= 2 && e.m <= n - 2)) ? null : 'out of range'),
  problem: ({ n, e, not }) => {
    const faces = upTo(n).filter((x) => inEvent(e, x));
    const p = q(faces.length, n);
    const ans = not ? sub(q(1), p) : p;
    return {
      prompt: t`A fair ${n}-sided die has faces numbered ${1} to ${n}. It is rolled once. What is the probability that the score is ${not ? t`not ${eventText(e)}` : eventText(e)}?`,
      answer: { kind: 'exact', expected: str(ans) },
      solution: [
        t`Fair means all ${n} faces are equally likely.`,
        t`The faces that are ${eventText(e)} are ${listOf(faces)}: ${faces.length} of them, so that probability is ${math`\frac{${faces.length}}{${n}}${str(p) === `${faces.length}/${n}` ? '' : math` = ${p}`}`}.`,
        ...(not ? [t`For "not": ${math`${1} - ${p} = ${ans}`}.`] : []),
      ],
    };
  },
  solve: ({ n, e, not }) => {
    let good = 0;
    for (let x = 1; x <= n; x++) {
      // Primes by trial division written out again, so the solver does not share inEvent.
      let prime = x >= 2;
      for (let d = 2; d < x; d++) if (x % d === 0) prime = false;
      const hit = e.kind === 'multiple' ? x % e.k === 0 : e.kind === 'more-than' ? x >= e.m + 1 : prime;
      if (hit !== not) good++;
    }
    return str(q(good, n));
  },
  misconceptions: ({ n, e, not }): Misconception[] => {
    const count = upTo(n).filter((x) => inEvent(e, x)).length;
    const out: Misconception[] = [
      { response: not ? str(q(count, n)) : str(sub(q(1), q(count, n))), why: not ? t`That is the probability of the event itself. "Not" is ${1} minus it.` : t`That is the probability that the event does not happen. Count the faces where it does.` },
      { response: String(not ? n - count : count), why: t`That is a count of faces. A probability divides it by the ${n} equally likely faces.` },
      { response: not ? str(q(n - count, count)) : str(q(count, n - count)), why: t`That compares the faces that count with the faces that do not. A probability divides by all ${n} faces.` },
    ];
    if (e.kind === 'more-than') {
      const slip = upTo(n).filter((x) => x >= e.m).length;
      out.push({ response: str(not ? q(n - slip, n) : q(slip, n)), why: t`Check ${e.m} itself: "more than ${e.m}" leaves ${e.m} out.` });
    }
    if (e.kind === 'prime') {
      const slip = upTo(n).filter((x) => x === 1 || isPrime(x)).length;
      out.push({ response: str(not ? q(n - slip, n) : q(slip, n)), why: t`${1} is not a prime number: a prime has exactly two factors, and ${1} has one.` });
    }
    return out;
  },
  trial: ({ n, e, not }, rng) => inEvent(e, 1 + Math.floor(rng() * n)) !== not,
});

interface CompP { a: number; b: number }

const complement = generator<CompP>({
  id: 'complement',
  skill: 'Find the probability that an event does not happen from the probability that it does.',
  params(rng) {
    const b = pick(rng, [4, 5, 8, 10, 20, 25, 100]);
    let a = int(rng, 1, b - 1);
    if (2 * a === b) a = a === 1 ? 1 : a - 1;
    return { a, b };
  },
  sane: ({ a, b }) => (a >= 1 && a < b && 2 * a !== b && b <= 100 ? null : 'out of range'),
  problem: ({ a, b }) => {
    const p = q(a, b);
    const ans = sub(q(1), p);
    return {
      prompt: t`The probability that a train is late is ${p}. What is the probability that it is not late?`,
      answer: { kind: 'exact', expected: str(ans) },
      solution: [
        t`The train is either late or not late, never both, so the two probabilities add to ${1}.`,
        t`${math`${P('not late')} = ${1} - ${p} = ${ans}`}.`,
      ],
    };
  },
  solve: ({ a, b }) => {
    // Imagine b equally likely days, a of them late; count the rest.
    const days = upTo(b).map((d) => d <= a);
    return str(q(days.filter((late) => !late).length, b));
  },
  misconceptions: ({ a, b }): Misconception[] => [
    { response: str(q(a, b)), why: t`That is the probability that it is late. Not late is everything else: ${1} minus it.` },
    { response: str(q(b, a)), why: t`A probability is never more than ${1}. Turning the fraction upside down does not give the complement; subtract from ${1}.` },
    { response: str(q(b - a, a)), why: t`That compares not late with late. Subtract from ${1} instead: ${math`${1} - ${q(a, b)}`}.` },
  ],
  trial: ({ a, b }, rng) => !(rng() < toFloat(q(a, b))),
});

// ---------------------------------------------------------------- lesson

const L = { red: 3, blue: 5 };
const nBag = L.red + L.blue;
const pRed = q(L.red, nBag);
const evens = upTo(6).filter((x) => x % 2 === 0);
const pEven = q(evens.length, 6);
const pSix = q(1, 6);

const claims: ProbabilityClaim[] = [
  { what: 'P(red) from the bag in the lesson', exact: pRed, trial: (rng: Rng) => Math.floor(rng() * nBag) < L.red },
  { what: 'P(even) on a fair six-sided die', exact: pEven, trial: (rng: Rng) => (1 + Math.floor(rng() * 6)) % 2 === 0 },
  { what: 'P(not a six) on a fair six-sided die', exact: sub(q(1), pSix), trial: (rng: Rng) => 1 + Math.floor(rng() * 6) !== 6 },
];

export const probabilityScale: TopicContent = {
  topicId: 'pre.probability-scale',
  goal: t`Give a probability on the scale from ${0} to ${1} as favourable outcomes over all outcomes, and use the complement.`,
  lesson: [
    { kind: 'p', text: t`A [[probability|probability]] measures how likely an [[event|event]] is, on a scale from ${0} to ${1}. ${0} means impossible, ${1} means certain, and ${q(1, 2)} means as likely as not. It can be written as a fraction, a decimal, or a percentage: ${q(1, 4)} is ${0.25}, or ${25}%.` },
    { kind: 'rule', text: t`When all outcomes are [[equally-likely|equally likely]], ${dmath`P(A) = \frac{\text{number of outcomes in } A}{\text{total number of outcomes}}.`}` },
    { kind: 'p', text: t`A bag holds ${L.red} red and ${L.blue} blue counters, and one is taken at random. Each of the ${nBag} counters is equally likely, and ${L.red} are red, so ${math`${P('red')} = ${pRed}`}.` },
    { kind: 'p', text: t`A fair die has ${6} equally likely faces. The even faces are ${listOf(evens)}, so ${math`${P('even')} = \frac{${evens.length}}{${6}} = ${pEven}`}.` },
    { kind: 'p', text: t`Counting colours instead of counters is a common slip. There are ${2} colours, but red is not ${q(1, 2)} likely, because there are fewer red counters than blue ones.` },
    { kind: 'rule', text: t`The [[complement-event|complement]] "not ${mA}" happens exactly when ${mA} does not, so ${dmath`P(\text{not } A) = ${1} - P(A).`}` },
    { kind: 'p', text: t`So ${math`${P('not a six')} = ${1} - ${pSix} = ${sub(q(1), pSix)}`}. The complement is often the quicker route: one event to count instead of five.` },
    { kind: 'p', text: t`A check on the rule: when one outcome in ${math`n`} is ${mA}, ${ident('1 - 1/n', '(n - 1)/n', ['n'], { n: { kind: 'integer', min: 1, max: 50 } })}, which is exactly the share of outcomes that are not ${mA}.` },
  ],
  examples: [
    worked(bag, { r: 4, b: 2, g: 6, not: true }, t`A counter that is not red`),
    worked(die, { n: 10, e: { kind: 'more-than', m: 7 }, not: false }, t`A ten-sided die`),
    worked(complement, { a: 3, b: 20 }, t`The complement`),
  ],
  generators: [bag, die, complement],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['probability', 'event', 'equally-likely', 'complement-event'],
  claims,
};
