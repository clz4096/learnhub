/**
 * pre.probability-scale: Probability of equally likely outcomes. No Cambridge source
 * teaches it from the start (decision 11); STEP Support Assignment 6 Q4 defines "at
 * random" (any person as likely to be picked as any other), and Assignment 12 Q2 supplies
 * the sweets problems.
 */
import { auto, cite, same } from '../cambridge';
import { int, pick, q, str, sub, toFloat, upTo } from '../math';
import { generator, type Misconception } from '../problem';
import { dmath, ident, listOf, math, setOf, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';
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

// ---------------------------------------------------------------- with letters

const POSITIVE = { a: { kind: 'integer', min: 1, max: 30 }, b: { kind: 'integer', min: 1, max: 30 }, c: { kind: 'integer', min: 1, max: 30 } } as const;

type Ask = 'one' | 'not' | 'two';
interface LettersP { ask: Ask; flavours: readonly [string, string, string] }

const FLAVOURS: readonly (readonly [string, string, string])[] = [
  ['apple sours', 'blackcurrant chews', 'cola cubes'],
  ['mint imperials', 'lemon sherbets', 'toffees'],
  ['red counters', 'blue counters', 'green counters'],
];

const letters = generator<LettersP>({
  id: 'letters',
  skill: 'Give a probability in letters as favourable over total, as in STEP Support Assignment 12 Q2(iii)(a).',
  params: (rng) => ({ ask: pick(rng, ['one', 'not', 'two'] as const), flavours: pick(rng, FLAVOURS) }),
  sane: () => null,
  problem: ({ ask, flavours: [x, y, z] }) => {
    const intro = t`A bag holds ${math`a`} ${x}, ${math`b`} ${y}, and ${math`c`} ${z}. One is taken at random.`;
    const want = ask === 'one' ? 'b/(a + b + c)' : ask === 'not' ? '(a + b)/(a + b + c)' : '(a + c)/(a + b + c)';
    return {
      prompt: ask === 'one'
        ? t`${intro} What is the probability that it is one of the ${y}? Give an expression in ${math`a`}, ${math`b`}, and ${math`c`}.`
        : ask === 'not'
          ? t`${intro} What is the probability that it is not one of the ${z}? Give an expression in ${math`a`}, ${math`b`}, and ${math`c`}.`
          : t`${intro} What is the probability that it is one of the ${x} or one of the ${z}? Give an expression in ${math`a`}, ${math`b`}, and ${math`c`}.`,
      answer: { kind: 'expression', expected: want, variables: ['a', 'b', 'c'], domains: POSITIVE },
      solution: [
        t`"At random" means each of the ${math`a + b + c`} items is equally likely, so the probability is the number of favourable items over ${math`a + b + c`}.`,
        ask === 'one' ? t`There are ${math`b`} ${y}, so the answer is ${math`\frac{b}{a + b + c}`}.`
          : ask === 'not' ? t`The items that are not ${z} number ${math`a + b`}, so the answer is ${math`\frac{a + b}{a + b + c}`}, which is also ${math`${1} - \frac{c}{a + b + c}`}.`
            : t`There are ${math`a + c`} such items, so the answer is ${math`\frac{a + c}{a + b + c}`}.`,
      ],
    };
  },
  solve: ({ ask }) => (ask === 'one' ? 'b/(b + a + c)' : ask === 'not' ? '1 - c/(a + b + c)' : '(c + a)/(c + b + a)'),
  misconceptions: ({ ask }): Misconception[] => ask === 'one'
    ? [
      { response: 'b/(a + c)', why: t`The bottom is every item in the bag, including the ${math`b`} you are counting: ${math`a + b + c`}.` },
      { response: '1/3', why: t`There are three kinds, but they need not be equally likely: count items, not kinds.` },
    ]
    : ask === 'not'
      ? [
        { response: 'c/(a + b + c)', why: t`That is the probability that it is one of them. "Not" is the complement: ${math`${1}`} minus that.` },
        { response: '(a + b)/c', why: t`The bottom of a probability is the total number of items, ${math`a + b + c`}.` },
      ]
      : [
        { response: '(a * c)/(a + b + c)', why: t`"Or" for items that cannot both happen adds the counts: ${math`a + c`}, not ${math`ac`}.` },
        { response: 'b/(a + b + c)', why: t`That is the probability of the third kind, the complement of what is asked.` },
      ],
});

// ---------------------------------------------------------------- Cambridge problems

const a12Apple = auto({
  id: 'a12-q2-iii-a',
  source: cite('step-f12', 'Q2(iii)(a)'),
  title: t`A bag of sweets, in letters`,
  prompt: t`I have a bag of sweets with ${math`a`} apple sours and ${math`b`} blackcurrant chews. If I take one sweet at random, what is the probability that it is an apple sour?`,
  answer: { kind: 'expression', expected: 'a/(a + b)', variables: ['a', 'b'], domains: { a: POSITIVE.a, b: POSITIVE.b } },
  solution: [
    t`"At random" means every sweet is equally likely to be taken: there are ${math`a + b`} equally likely outcomes.`,
    t`${math`a`} of them are apple sours, so the probability is ${math`\frac{a}{a + b}`}.`,
  ],
  reference: 'a/(b + a)',
  verify: () => {
    // Count sweets in actual bags.
    for (const [a, b] of [[1, 1], [3, 5], [9, 6], [12, 1]] as const) {
      const bag = [...Array.from({ length: a }, () => 'apple'), ...Array.from({ length: b }, () => 'blackcurrant')];
      const e = same(`a = ${a}, b = ${b}`, str(q(bag.filter((x) => x === 'apple').length, bag.length)), str(q(a, a + b)));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: 'a/b', why: t`The bottom counts every sweet, apple sours included: ${math`a + b`}.` }],
  official: { source: cite('step-f12-hints', 'Q2(iii)(a)'), answer: 'a/(a + b)', agrees: true },
});

const a12Mint = auto({
  id: 'a12-q2-ii-first',
  source: cite('step-f12', 'Q2(ii)', true),
  title: t`The first sweet`,
  prompt: t`A bag contains ${9} mint imperials and ${6} lemon sherbets. I take one sweet out without looking. What is the probability that it is a mint imperial? Give it in lowest terms.`,
  answer: { kind: 'exact', expected: str(q(9, 15)) },
  solution: [t`Each of the ${15} sweets is equally likely, and ${9} are mints: ${math`\frac{${9}}{${15}} = ${q(9, 15)}`}.`],
  reference: '0.6',
  verify: () => same('9 of 15', str(q(9, 9 + 6)), '3/5'),
  misconceptions: [{ response: str(q(9, 6)), why: t`That compares mints with lemons. A probability compares mints with all ${15} sweets.` }],
});

const a12Goggles = auto({
  id: 'a12-q2-iv-b',
  source: cite('step-f12', 'Q2(iv)(b)'),
  title: t`The first child in the queue`,
  prompt: t`Three children have a swimming lesson. Each child, independently of the other two, remembers to bring goggles with probability ${q(1, 4)}. What is the probability that the first child in the queue has goggles?`,
  answer: { kind: 'exact', expected: str(q(1, 4)) },
  solution: [
    t`The question is about one child only. Whatever the other two do, the first child has goggles with probability ${q(1, 4)}.`,
    t`(Listing all ${8} cases for the three children gives the same: the cases where the first child has goggles add up to ${q(1, 4)}.)`,
  ],
  reference: '1/4',
  verify: () => {
    // Add the probabilities of the eight cases in which child 1 has goggles or not.
    let total = q(0);
    for (let m = 0; m < 8; m++) {
      const has = [0, 1, 2].map((i) => ((m >> i) & 1) === 1);
      if (!has[0]) continue;
      const p = has.map((h) => (h ? q(1, 4) : q(3, 4))).reduce((x, y) => q(x.num * y.num, x.den * y.den));
      total = q(total.num * p.den + p.num * total.den, total.den * p.den);
    }
    return same('A12 Q2(iv)(b) over all eight cases', str(total), '1/4');
  },
  misconceptions: [{ response: str(q(1, 64)), why: t`That is the chance that all three have goggles. The question asks about the first child only.` }],
  official: { source: cite('step-f12-hints', 'Q2(iv)(b)'), answer: '1/4', agrees: true },
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

const [mOmega, mAc] = [math`\Omega`, math`A^{c}`];

export const probabilityScale: TopicContent = {
  topicId: 'pre.probability-scale',
  goal: t`Give a probability on the scale from ${0} to ${1} as favourable outcomes over all outcomes, and use the complement.`,
  objective: t`Find a probability by counting equally likely outcomes, and use the complement when it is quicker.`,
  why: t`Every probability in the course starts here; next come sample spaces, trees and conditional probability.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`Two colours, but not a fair coin` },
    { kind: 'hook', text: t`A bag holds ${L.red} red counters and ${L.blue} blue ones. You reach in without looking and take one. There are two colours, so is red a fifty-fifty chance? Something feels off, and the aim of this lesson is to say exactly what.` },
    { kind: 'narrative', text: t`Picture the ${nBag} counters laid out on a table. Your hand is equally likely to close on any one of them: no counter is special. So the fair thing to count is counters, not colours. ${L.red} of the ${nBag} counters are red, so red should come up ${L.red} times in every ${nBag}, in the long run.` },
    { kind: 'narrative', text: t`That number, a share between ${0} and ${1}, is what we call a [[probability|probability]]. ${0} means it never happens, ${1} means it always does, and ${q(1, 2)} means as likely as not. The same number can be written as a fraction, a decimal or a percentage: ${q(1, 4)} is ${0.25}, which is ${25} percent.` },
    { kind: 'section', title: t`The definition` },
    { kind: 'narrative', text: t`To say this precisely, we need names for the things we are counting. Call the set of all possible outcomes ${mOmega} (the Greek capital omega). For one roll of a die, ${math`\Omega = ${setOf(upTo(6))}`}.` },
    {
      kind: 'definition',
      name: t`Probability with equally likely outcomes`,
      formal: t`Let ${mOmega} be a finite non-empty set of outcomes, each [[equally-likely|equally likely]]. An [[event|event]] is a subset ${math`A \subseteq \Omega`}. The probability of ${mA} is ${dmath`P(A) = \frac{\lvert A \rvert}{\lvert \Omega \rvert},`} where ${math`\lvert A \rvert`} is the number of outcomes in ${mA}.`,
      plain: t`In plain words: count the outcomes you want, and divide by the number of outcomes there are. For a die and ${math`A = ${setOf(evens)}`} (an even score), ${math`P(A) = \frac{${evens.length}}{${6}} = ${pEven}`}.`,
    },
    {
      kind: 'p',
      text: t`The words "at random" are what make the outcomes equally likely. STEP Support Assignment ${6} says it in a footnote: random means that any person has the same probability of being picked as any other person. So "a counter is taken at random" means every counter, not every colour, has the same chance.`,
      why: { q: t`Why can't I count colours?`, a: t`Because the colours are not equally likely: there are more blue counters than red. The definition only works when every outcome you count has the same chance, and the counters do.` },
    },
    {
      kind: 'steps',
      steps: [
        { label: t`Name the outcomes`, text: t`The outcomes are the ${nBag} counters, each equally likely, so ${math`\lvert \Omega \rvert = ${nBag}`}.` },
        { label: t`Count the event`, text: t`Let ${mA} be "the counter is red". ${L.red} counters are red, so ${math`\lvert A \rvert = ${L.red}`}.` },
        { label: t`Divide`, text: t`By the definition,`, eq: [dmath`P(\text{red}) = \frac{${L.red}}{${nBag}}.`], plain: t`Less than a half, as it should be: there are fewer red counters than blue ones.` },
      ],
    },
    checkFrom(bag, { r: 2, b: 3, g: 5, not: false }, t`Each of the ${10} counters is equally likely, and ${2} of them are red: ${math`\frac{${2}}{${10}} = ${q(2, 10)}`}.`),
    { kind: 'pitfall', claim: t`There are two colours, so the probability of red is ${q(1, 2)}.`, counterexample: t`With ${L.red} red and ${L.blue} blue counters, red comes up ${pRed} of the time, not ${q(1, 2)}. Two colours are two kinds of outcome, but they are not equally likely.` },
    { kind: 'section', title: t`Why the scale runs from nought to one` },
    { kind: 'narrative', text: t`You may have been told that every probability lies between ${0} and ${1}. With the definition in hand, you can prove it rather than take it on trust.` },
    { kind: 'theorem', statement: t`For every event ${math`A \subseteq \Omega`}, ${math`${0} \le P(A) \le ${1}`}. Moreover ${math`P(\varnothing) = ${0}`} and ${math`P(\Omega) = ${1}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Compare the counts`, text: t`Since ${math`A \subseteq \Omega`}, every outcome in ${mA} is in ${mOmega}, so ${math`${0} \le \lvert A \rvert \le \lvert \Omega \rvert`}.`, plain: t`You cannot have fewer than no outcomes, or more outcomes in ${mA} than there are altogether.` },
        { label: t`Divide by the total`, text: t`${mOmega} is non-empty, so ${math`\lvert \Omega \rvert > ${0}`}, and dividing an inequality by a positive number keeps its direction:`, eq: [dmath`${0} \le \frac{\lvert A \rvert}{\lvert \Omega \rvert} \le ${1}.`], why: { q: t`Why does dividing keep the direction?`, a: t`Dividing by a positive number scales every term by the same positive amount, so their order is unchanged. For example ${math`${2} < ${6}`} and ${math`\frac{${2}}{${2}} < \frac{${6}}{${2}}`}.` } },
        { label: t`The two ends`, text: t`The empty event has ${math`\lvert \varnothing \rvert = ${0}`}, so ${math`P(\varnothing) = ${0}`}; and ${math`P(\Omega) = \frac{\lvert \Omega \rvert}{\lvert \Omega \rvert} = ${1}`}.`, plain: t`Something impossible has probability ${0}; something certain, ${1}.` },
      ],
    },
    { kind: 'section', title: t`The complement` },
    { kind: 'narrative', text: t`What is the chance that a die does not show a six? You could count five faces. But there is a quicker way to see it: every roll is either a six or not a six, never both, so the two probabilities must share the whole ${1} between them.` },
    {
      kind: 'definition',
      name: t`Complement`,
      formal: t`The [[complement-event|complement]] of an event ${mA} is ${math`A^{c} = \Omega \setminus A`}, the set of outcomes not in ${mA}.`,
      plain: t`In plain words: "not ${mA}". For a die and ${math`A = ${setOf([6])}`}, the complement is ${math`${setOf([1, 2, 3, 4, 5])}`}.`,
    },
    { kind: 'theorem', name: t`Complement rule`, statement: t`For every event ${mA}, ${math`P(A^{c}) = ${1} - P(A)`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Split the outcomes`, text: t`Every outcome is in exactly one of ${mA} and ${mAc}, so ${math`\lvert A \rvert + \lvert A^{c} \rvert = \lvert \Omega \rvert`}.`, plain: t`Each outcome is counted once: in ${mA} or outside it.` },
        { label: t`Divide by the total`, text: t`Divide both sides by ${math`\lvert \Omega \rvert`}:`, eq: [dmath`\frac{\lvert A \rvert}{\lvert \Omega \rvert} + \frac{\lvert A^{c} \rvert}{\lvert \Omega \rvert} = ${1}, \quad\text{that is}\quad P(A) + P(A^{c}) = ${1}.`] },
        { label: t`Rearrange`, text: t`Subtract ${math`P(A)`} from both sides: ${math`P(A^{c}) = ${1} - P(A)`}.` },
      ],
    },
    { kind: 'p', text: t`So ${math`P(\text{not a six}) = ${1} - ${pSix} = ${sub(q(1), pSix)}`}: one face to count instead of five. A quick sanity check with letters: if one outcome in ${math`n`} is in ${mA}, then ${ident('1 - 1/n', '(n - 1)/n', ['n'], { n: { kind: 'integer', min: 1, max: 50 } })}, exactly the share of outcomes that are not.` },
    checkFrom(complement, { a: 3, b: 10 }, t`Late and not late share the whole ${1}: ${math`${1} - ${q(3, 10)} = ${q(7, 10)}`}.`),
    { kind: 'pitfall', claim: t`The complement of ${q(3, 10)} is ${q(10, 3)}: turn the fraction over.`, counterexample: t`${q(10, 3)} is more than ${1}, and no probability is more than ${1}, by the theorem above. The complement is ${math`${1} - ${q(3, 10)} = ${q(7, 10)}`}.` },
    { kind: 'takeaway', text: t`With equally likely outcomes, a probability is favourable over total, and "not ${mA}" is ${1} minus ${math`P(A)`}.` },
  ],
  examples: [
    worked(bag, { r: 4, b: 2, g: 6, not: true }, t`A counter that is not red`),
    worked(die, { n: 10, e: { kind: 'more-than', m: 7 }, not: false }, t`A ten-sided die`),
    workedCambridge(a12Apple),
  ],
  generators: [bag, die, complement, letters],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['probability', 'event', 'equally-likely', 'complement-event'],
  cambridge: [a12Mint, a12Goggles],
  // The goggles question is the better test: it asks about one child among three and the
  // learner must see the other two do not matter. The mints are a direct count.
  gate: ['a12-q2-iv-b', 'a12-q2-ii-first'],
  recall: [
    { front: t`With equally likely outcomes, what is ${math`P(A)`}?`, back: t`${math`P(A) = \frac{\lvert A \rvert}{\lvert \Omega \rvert}`}: the number of outcomes in ${mA} over the number of outcomes there are.` },
    { front: t`What does "at random" mean?`, back: t`Every item has the same probability of being picked as any other.` },
    { front: t`State the complement rule.`, back: t`${math`P(A^{c}) = ${1} - P(A)`}.` },
    { front: t`Between what values does every probability lie, and why?`, back: t`${math`${0} \le P(A) \le ${1}`}, because ${math`${0} \le \lvert A \rvert \le \lvert \Omega \rvert`}.` },
  ],
  proofOrder: [
    {
      title: t`The complement rule`,
      steps: [
        t`Every outcome is in exactly one of ${mA} and ${mAc}.`,
        t`So ${math`\lvert A \rvert + \lvert A^{c} \rvert = \lvert \Omega \rvert`}.`,
        t`Divide by ${math`\lvert \Omega \rvert`}: ${math`P(A) + P(A^{c}) = ${1}`}.`,
        t`Rearrange: ${math`P(A^{c}) = ${1} - P(A)`}.`,
      ],
    },
  ],
  claims,
};
