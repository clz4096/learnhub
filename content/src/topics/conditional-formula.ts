/**
 * prob.conditional-formula: P(A | B) = P(A ∩ B) / P(B), and the same rearranged as the
 * multiplication rule P(A ∩ B) = P(A | B) P(B), applied along a sequence of draws. From
 * STEP Support Assignment 6 Q4(i) (the smokers, by the formula rather than a table),
 * Assignment 19 Q4(i) (three coins in a bag), and Assignment 12 Q3 (the raffle queue,
 * whose hints multiply conditional probabilities along each queue that works).
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { dmath, math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const [mA, mB] = [math`A`, math`B`];
const die = (rng: Rng): number => 1 + Math.floor(rng() * 6);

// ---------------------------------------------------------------- two dice, given an event

interface Ev { text: Rich; f: (a: number, b: number) => boolean }
const CONDITIONS: readonly Ev[] = [
  { text: t`at least one die shows a six`, f: (a, b) => a === 6 || b === 6 },
  { text: t`the total is at least ${8}`, f: (a, b) => a + b >= 8 },
  { text: t`the first die is even`, f: (a) => a % 2 === 0 },
  { text: t`the two dice show different numbers`, f: (a, b) => a !== b },
  { text: t`the total is odd`, f: (a, b) => (a + b) % 2 === 1 },
  { text: t`at least one die shows a one`, f: (a, b) => a === 1 || b === 1 },
];
const EVENTS: readonly Ev[] = [
  { text: t`the total is ${7}`, f: (a, b) => a + b === 7 },
  { text: t`the total is ${9}`, f: (a, b) => a + b === 9 },
  { text: t`both dice are even`, f: (a, b) => a % 2 === 0 && b % 2 === 0 },
  { text: t`the larger score is ${5}`, f: (a, b) => Math.max(a, b) === 5 },
  { text: t`a six is thrown`, f: (a, b) => a === 6 || b === 6 },
  { text: t`the total is ${4}`, f: (a, b) => a + b === 4 },
  { text: t`the second die shows more than the first`, f: (a, b) => b > a },
];
function diceCounts(A: Ev, B: Ev): { ab: number; b: number; a: number } {
  let [ab, b, a] = [0, 0, 0];
  for (let x = 1; x <= 6; x++) for (let y = 1; y <= 6; y++) {
    if (B.f(x, y)) b++;
    if (A.f(x, y)) a++;
    if (A.f(x, y) && B.f(x, y)) ab++;
  }
  return { ab, b, a };
}
const diceMis = (ab: number, a: number, b: number): string[] => [str(q(ab, 36)), str(q(a, 36)), str(q(ab, a))];

interface DiceP { i: number; j: number }

const diceGiven = generator<DiceP>({
  id: 'dice-given',
  skill: 'Compute P(A | B) for two dice as P(A ∩ B) over P(B): count the outcomes in both events and in the condition.',
  params: (rng) => {
    for (;;) {
      const p = { i: int(rng, 0, EVENTS.length - 1), j: int(rng, 0, CONDITIONS.length - 1) };
      const { ab, a, b } = diceCounts(EVENTS[p.i] as Ev, CONDITIONS[p.j] as Ev);
      // Something to condition on, an answer strictly between 0 and 1, and at least two distinct slips.
      if (ab > 0 && ab < b && b < 36 && diceMis(ab, a, b).filter((m) => m !== str(q(ab, b))).length >= 2) return p;
    }
  },
  sane: ({ i, j }) => (i < EVENTS.length && j < CONDITIONS.length ? null : 'out of range'),
  problem: ({ i, j }) => {
    const A = EVENTS[i] as Ev;
    const B = CONDITIONS[j] as Ev;
    const { ab, b } = diceCounts(A, B);
    return {
      prompt: t`Two fair dice are thrown. Given that ${B.text}, what is the probability that ${A.text}?`,
      answer: { kind: 'exact', expected: str(q(ab, b)) },
      solution: [
        t`Let ${mB} be "${B.text}" and ${mA} be "${A.text}". Of the ${36} equally likely ordered pairs, ${b} are in ${mB} and ${ab} are in both, so ${math`P(B) = \frac{${b}}{${36}}`} and ${math`P(A \cap B) = \frac{${ab}}{${36}}`}.`,
        t`${math`P(A \mid B) = \frac{P(A \cap B)}{P(B)} = \frac{${ab}/${36}}{${b}/${36}} = ${q(ab, b)}`}.`,
      ],
    };
  },
  solve: ({ i, j }) => {
    const A = EVENTS[i] as Ev;
    const B = CONDITIONS[j] as Ev;
    const inB = [];
    for (let x = 1; x <= 6; x++) for (let y = 1; y <= 6; y++) if (B.f(x, y)) inB.push([x, y] as const);
    return str(q(inB.filter(([x, y]) => A.f(x, y)).length, inB.length));
  },
  misconceptions: ({ i, j }): Misconception[] => {
    const { ab, a, b } = diceCounts(EVENTS[i] as Ev, CONDITIONS[j] as Ev);
    return [
      { response: str(q(ab, 36)), why: t`That is ${math`P(A \cap B)`}, the chance of both. Given ${mB}, divide by ${math`P(B)`}: only the ${b} outcomes in ${mB} remain possible.` },
      { response: str(q(a, 36)), why: t`That is ${math`P(A)`}, ignoring the information that ${mB} happened. Restrict to the outcomes in ${mB}.` },
      { response: str(q(ab, a)), why: t`That is ${math`P(B \mid A)`}, the reverse conditional. Divide by ${math`P(B)`}, the event you are given.` },
    ];
  },
  trial: ({ i, j }, rng) => {
    // Throw until the condition holds, then look at the event.
    for (;;) {
      const [x, y] = [die(rng), die(rng)];
      if ((CONDITIONS[j] as Ev).f(x, y)) return (EVENTS[i] as Ev).f(x, y);
    }
  },
});

// ---------------------------------------------------------------- the formula, rearranged

type Unknown = 'conditional' | 'joint' | 'given';
interface FormP { unknown: Unknown; pb: Rational; pab: Rational }
const PB = [q(1, 2), q(2, 5), q(3, 5), q(3, 4), q(1, 3), q(2, 3), q(4, 5), q(5, 8)];

const formulaAlgebra = generator<FormP>({
  id: 'formula-algebra',
  skill: 'Use P(A | B) = P(A ∩ B) / P(B) in any direction: find the conditional, the joint probability (the multiplication rule), or P(B).',
  params: (rng) => {
    const pb = pick(rng, PB);
    // P(A | B) as a fraction with a small denominator, strictly between 0 and 1.
    const c = pick(rng, [q(1, 4), q(1, 3), q(2, 5), q(3, 5), q(2, 3), q(3, 4), q(1, 5), q(5, 6)]);
    return { unknown: pick(rng, ['conditional', 'joint', 'given'] as const), pb, pab: mul(pb, c) };
  },
  sane: ({ pb, pab }) => (pab.num > 0n && pab.num * pb.den < pb.num * pab.den ? null : 'out of range'),
  problem: ({ unknown, pb, pab }) => {
    const c = div(pab, pb);
    const given = unknown === 'conditional' ? t`${math`P(A \cap B) = ${pab}`} and ${math`P(B) = ${pb}`}` : unknown === 'joint' ? t`${math`P(A \mid B) = ${c}`} and ${math`P(B) = ${pb}`}` : t`${math`P(A \cap B) = ${pab}`} and ${math`P(A \mid B) = ${c}`}`;
    const want = unknown === 'conditional' ? math`P(A \mid B)` : unknown === 'joint' ? math`P(A \cap B)` : math`P(B)`;
    const value = unknown === 'conditional' ? c : unknown === 'joint' ? pab : pb;
    return {
      prompt: t`Events ${mA} and ${mB} have ${given}. Find ${want}.`,
      answer: { kind: 'exact', expected: str(value) },
      solution: [
        unknown === 'conditional'
          ? t`${math`P(A \mid B) = \frac{P(A \cap B)}{P(B)} = ${pab} \div ${pb} = ${c}`}.`
          : unknown === 'joint'
            ? t`The [[multiplication-rule|multiplication rule]]: ${math`P(A \cap B) = P(A \mid B)\,P(B) = ${c} \times ${pb} = ${pab}`}.`
            : t`From ${math`P(A \cap B) = P(A \mid B)\,P(B)`}: ${math`P(B) = \frac{P(A \cap B)}{P(A \mid B)} = ${pab} \div ${c} = ${pb}`}.`,
      ],
    };
  },
  solve: ({ unknown, pb, pab }) => {
    // A population: N people with N P(B) in B and N P(A ∩ B) in both; count instead of dividing fractions.
    const N = pb.den * pab.den;
    const [nB, nAB] = [(pb.num * N) / pb.den, (pab.num * N) / pab.den];
    return str(unknown === 'conditional' ? q(nAB, nB) : unknown === 'joint' ? q(nAB, N) : q(nB, N));
  },
  misconceptions: ({ unknown, pb, pab }): Misconception[] => {
    const c = div(pab, pb);
    if (unknown === 'conditional') return [
      { response: str(mul(pab, pb)), why: t`Divide by ${math`P(B)`}, do not multiply: ${math`P(A \mid B) = P(A \cap B) / P(B)`}.` },
      { response: str(div(pb, pab)), why: t`The fraction is upside down: the joint probability goes on top.` },
    ];
    if (unknown === 'joint') return [
      { response: str(div(c, pb)), why: t`The multiplication rule multiplies: ${math`P(A \cap B) = P(A \mid B)\,P(B)`}.` },
      { response: str(add(c, pb)), why: t`Probabilities of "and" come from multiplying a conditional by the probability of its condition, not from adding.` },
    ];
    return [
      { response: str(mul(pab, c)), why: t`Divide: ${math`P(B) = P(A \cap B) / P(A \mid B)`}.` },
      { response: str(div(c, pab)), why: t`The fraction is upside down: ${math`P(B) = P(A \cap B) / P(A \mid B)`}, which is at least ${math`P(A \cap B)`}.` },
      { response: str(sub(q(1), c)), why: t`That is ${math`P(A^{c} \mid B)`}. Use the formula linking the three given probabilities.` },
    ];
  },
});

// ---------------------------------------------------------------- draws without replacement

type DrawKind = 'second-given-first' | 'both' | 'first-given-second';
interface DrawP { r: number; b: number; kind: DrawKind }

const draws = generator<DrawP>({
  id: 'draws',
  skill: 'Draw twice without replacement: the second draw given the first, both by the multiplication rule, and the first given the second.',
  params: (rng) => ({ r: int(rng, 2, 7), b: int(rng, 2, 7), kind: pick(rng, ['second-given-first', 'both', 'first-given-second'] as const) }),
  sane: ({ r, b }) => (r >= 2 && b >= 2 ? null : 'out of range'),
  problem: ({ r, b, kind }) => {
    const n = r + b;
    const both = mul(q(r, n), q(r - 1, n - 1));
    const prompt = kind === 'second-given-first'
      ? t`A bag holds ${r} red and ${b} blue counters. Two are drawn at random without replacement. Given that the first is red, what is the probability that the second is red?`
      : kind === 'both'
        ? t`A bag holds ${r} red and ${b} blue counters. Two are drawn at random without replacement. What is the probability that both are red?`
        : t`A bag holds ${r} red and ${b} blue counters. Two are drawn at random without replacement. Given that the second is red, what is the probability that the first was red?`;
    const value = kind === 'both' ? both : q(r - 1, n - 1);
    return {
      prompt,
      answer: { kind: 'exact', expected: str(value) },
      solution: kind === 'second-given-first'
        ? [t`After a red is drawn, the bag holds ${r - 1} red among ${n - 1} counters, all equally likely: ${q(r - 1, n - 1)}.`]
        : kind === 'both'
          ? [t`Multiplication rule: ${math`P(R_{${1}} \cap R_{${2}}) = P(R_{${1}})\,P(R_{${2}} \mid R_{${1}}) = \frac{${r}}{${n}} \times \frac{${r - 1}}{${n - 1}} = ${both}`}.`]
          : [
            t`${math`P(R_{${2}}) = \frac{${r}}{${n}}`}: by symmetry the second counter is as likely to be red as the first. And ${math`P(R_{${1}} \cap R_{${2}}) = ${both}`} by the multiplication rule.`,
            t`So ${math`P(R_{${1}} \mid R_{${2}}) = ${both} \div \frac{${r}}{${n}} = ${q(r - 1, n - 1)}`}, the same as the other way round.`,
          ],
    };
  },
  solve: ({ r, b, kind }) => {
    // List every ordered pair of distinct counters.
    const bag = [...Array(r).fill('R'), ...Array(b).fill('B')] as string[];
    let [num, den] = [0, 0];
    bag.forEach((x, i) => bag.forEach((y, j) => {
      if (i === j) return;
      if (kind === 'both') { den++; if (x === 'R' && y === 'R') num++; }
      else if (kind === 'second-given-first') { if (x === 'R') { den++; if (y === 'R') num++; } }
      else if (y === 'R') { den++; if (x === 'R') num++; }
    }));
    return str(q(num, den));
  },
  misconceptions: ({ r, b, kind }): Misconception[] => {
    const n = r + b;
    if (kind === 'both') return [
      { response: str(mul(q(r, n), q(r, n))), why: t`Without replacement the second draw is from ${n - 1} counters, of which ${r - 1} are red.` },
      { response: str(q(r - 1, n - 1)), why: t`That is the chance of the second red given the first. Multiply by the chance the first is red.` },
    ];
    return [
      { response: str(q(r, n)), why: t`That ignores the given draw: one red counter is already accounted for, so ${r - 1} red remain among ${n - 1}.` },
      { response: str(mul(q(r, n), q(r - 1, n - 1))), why: t`That is the chance both are red. Given one red, divide by its probability.` },
    ];
  },
  trial: ({ r, b, kind }, rng) => {
    for (;;) {
      const n = r + b;
      const i = Math.floor(rng() * n);
      let j = Math.floor(rng() * (n - 1));
      if (j >= i) j++;
      const [x, y] = [i < r, j < r];
      if (kind === 'both') return x && y;
      if (kind === 'second-given-first') { if (x) return y; } else if (y) return x;
    }
  },
});

// ---------------------------------------------------------------- Cambridge problems

const a6c = auto({
  id: 'a6-q4-i-c-formula',
  source: cite('step-f06', 'Q4(i)(c)', true),
  title: t`A smoker, given a woman, by the formula`,
  prompt: t`A study of a large population found that ${40}% were men and ${60}% were women. Of the men ${50}% were smokers, and of the women ${30}% were smokers. A person is picked at random. Using ${math`P(S \cap W) = ${q(18, 100)}`} for a female smoker, find the probability that the person is a smoker, given that she is a woman, by the formula ${math`P(S \mid W) = P(S \cap W) / P(W)`}.`,
  answer: { kind: 'exact', expected: str(q(3, 10)) },
  solution: [
    t`${math`P(S \cap W) = ${q(60, 100)} \times ${q(30, 100)} = ${q(18, 100)}`} and ${math`P(W) = ${q(60, 100)}`}.`,
    t`${math`P(S \mid W) = \frac{${q(18, 100)}}{${q(60, 100)}} = ${q(3, 10)}`}: the ${30}% the question started from, recovered by the formula.`,
  ],
  reference: str(q(3, 10)),
  verify: () => same('a population of 100: 18 female smokers among 60 women', str(q(18, 60)), str(div(q(18, 100), q(60, 100)))),
  misconceptions: [{ response: str(q(18, 100)), why: t`That is ${math`P(S \cap W)`}. Given a woman, divide by ${math`P(W) = ${q(60, 100)}`}.` }],
  official: { source: cite('step-f06-hints', 'Q4(i)(c)'), answer: '3/10', agrees: true },
});

const a19i = auto({
  id: 'a19-q4-i-formula',
  source: cite('step-f19', 'Q4(i)', true),
  title: t`Three coins, by the formula`,
  prompt: t`A bag holds three coins: a normal one, one with heads on both sides, and one with tails on both sides. I pick a coin at random and look at a random side of it: a head. Let ${math`D`} be "I picked the double-headed coin" and ${math`H`} be "I see a head". Find ${math`P(D \mid H)`} from ${math`P(D \cap H)`} and ${math`P(H)`}.`,
  answer: { kind: 'exact', expected: str(q(2, 3)) },
  solution: [
    t`${math`P(D \cap H) = P(D) = ${q(1, 3)}`}: the double-headed coin always shows a head. ${math`P(H) = ${q(1, 2)}`}: three of the six sides are heads, each side equally likely to be seen.`,
    t`${math`P(D \mid H) = \frac{${q(1, 3)}}{${q(1, 2)}} = ${q(2, 3)}`}, the hints' answer for "the other side is a head".`,
  ],
  reference: str(q(2, 3)),
  verify: () => {
    // The six sides, each seen with probability 1/6: (coin, side).
    const sides = [['N', 'H'], ['N', 'T'], ['D', 'H'], ['D', 'H'], ['T', 'T'], ['T', 'T']];
    const h = sides.filter(([, s]) => s === 'H');
    return same('the six sides listed', str(q(h.filter(([c]) => c === 'D').length, h.length)), '2/3');
  },
  misconceptions: [{ response: str(q(1, 3)), why: t`That is ${math`P(D \cap H)`}, not yet divided by ${math`P(H) = ${q(1, 2)}`}.` }, { response: str(q(1, 2)), why: t`"Two coins have a head" counts coins; the double-headed coin shows a head twice as often as the normal one.` }],
  official: { source: cite('step-f19-hints', 'Q4(i)'), answer: '2/3', agrees: true },
});

const M_DOMAIN = { m: { kind: 'integer' as const, min: 2, max: 30 } };
/** The raffle queue: the probability that a queue of m £1 people and 2 £2 people starts with the given coins, by listing every arrangement. */
function queueStartProb(m: number, start: readonly number[]): Rational {
  // Arrangements of m ones and two twos are the positions of the twos.
  const n = m + 2;
  let [good, all] = [0, 0];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    all++;
    const qn = Array.from({ length: n }, (_, k) => (k === i || k === j ? 2 : 1));
    if (start.every((c, k) => qn[k] === c)) good++;
  }
  return q(good, all);
}
const raffle121 = auto({
  id: 'a12-q3-ii-121',
  source: cite('step-f12', 'Q3(ii) (2011 STEP I Q12)', true),
  title: t`The raffle queue starts ${1}, ${2}, ${1}`,
  prompt: t`I sell raffle tickets for £${1}. The queue has ${math`m`} people with a £${1} coin and ${2} people with a £${2} coin, every arrangement equally likely. One queue that lets me sell to everyone starts with a £${1}, then a £${2}, then a £${1}. Find the probability that the queue starts this way, as an expression in ${math`m`}, by multiplying conditional probabilities.`,
  answer: { kind: 'expression', expected: 'm/(m + 2) * 2/(m + 1) * (m - 1)/m', variables: ['m'], domains: M_DOMAIN },
  solution: [
    t`The first person has a £${1} coin with probability ${math`\frac{m}{m + ${2}}`}. Given that, the second has a £${2} coin with probability ${math`\frac{${2}}{m + ${1}}`}: ${math`m + ${1}`} people remain, ${2} of them with £${2}.`,
    t`Given both, the third has a £${1} coin with probability ${math`\frac{m - ${1}}{m}`}. Multiplying: ${math`\frac{m}{m + ${2}} \times \frac{${2}}{m + ${1}} \times \frac{m - ${1}}{m} = \frac{${2}(m - ${1})}{(m + ${2})(m + ${1})}`}.`,
  ],
  reference: '2(m - 1)/((m + 2)(m + 1))',
  verify: () => {
    for (let m = 2; m <= 9; m++) {
      const e = same(`m = ${m}`, str(queueStartProb(m, [1, 2, 1])), str(q(2 * (m - 1), (m + 2) * (m + 1))));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: 'm/(m + 2) * 2/(m + 2) * (m - 1)/(m + 2)', why: t`Each draw from the queue is without replacement: after each person, one fewer remains, so the denominators fall.` }],
  // The hints write this case as m/(m + 2) × 2/(m + 1) × (m − 1)/m.
  official: { source: cite('step-f12-hints', 'Q3(ii)'), answer: 'm/(m + 2) * 2/(m + 1) * (m - 1)/m', agrees: true },
});

const raffle11 = auto({
  id: 'a12-q3-ii-11',
  source: cite('step-f12', 'Q3(ii) (2011 STEP I Q12)', true),
  title: t`The raffle queue starts ${1}, ${1}`,
  prompt: t`In the same queue (${math`m`} people with £${1}, ${2} with £${2}, every arrangement equally likely), find the probability that the first two people both have £${1} coins, as an expression in ${math`m`}.`,
  answer: { kind: 'expression', expected: 'm/(m + 2) * (m - 1)/(m + 1)', variables: ['m'], domains: M_DOMAIN },
  solution: [t`The first person has a £${1} coin with probability ${math`\frac{m}{m + ${2}}`}; given that, ${math`m - ${1}`} of the remaining ${math`m + ${1}`} have one. So the probability is ${math`\frac{m}{m + ${2}} \times \frac{m - ${1}}{m + ${1}}`}.`],
  reference: 'm(m - 1)/((m + 2)(m + 1))',
  verify: () => {
    for (let m = 2; m <= 9; m++) {
      const e = same(`m = ${m}`, str(queueStartProb(m, [1, 1])), str(q(m * (m - 1), (m + 2) * (m + 1))));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: '(m/(m + 2))^2', why: t`Without replacement: after one person with £${1}, there are ${math`m - ${1}`} such people among ${math`m + ${1}`}.` }],
  official: { source: cite('step-f12-hints', 'Q3(ii)'), answer: 'm/(m + 2) * (m - 1)/(m + 1)', agrees: true },
});

const raffle3 = supervision({
  id: 'a12-q3-iii',
  source: cite('step-f12', 'Q3(iii) (2011 STEP I Q12)'),
  title: t`Three people with £${2} coins`,
  prompt: t`With ${math`m`} people holding £${1} coins and ${3} holding £${2} coins (${math`m \ge ${3}`}), show that the probability I can sell a ticket to everyone is ${math`\frac{m - ${2}}{m + ${1}}`}. List the starts of the queues that work in a logical order, find each probability by multiplying conditional probabilities, and explain why your list is complete.`,
  writeUp: 'proof',
  official: cite('step-f12-hints', 'Q3(iii)'),
});
const smokersReverse = supervision({
  id: 'a6-q4-i-formula',
  source: cite('step-f06', 'Q4(i)(d), (e)'),
  title: t`Both directions by the formula`,
  prompt: t`In the smokers question, write ${math`P(W \mid S)`} and ${math`P(M \mid S^{c})`} as quotients ${math`P(\cdot \cap \cdot) / P(\cdot)`}, and evaluate them. Then explain, using the formula, why ${math`P(W \mid S)`} and ${math`P(S \mid W)`} have the same numerator but different denominators.`,
  writeUp: 'explanation',
  official: cite('step-f06-hints', 'Q4(i)'),
});

// ---------------------------------------------------------------- lesson

const claims: ProbabilityClaim[] = [
  {
    what: 'two dice: a total of 7 given at least one six', exact: q(2, 11),
    trial: (rng) => { for (;;) { const [x, y] = [die(rng), die(rng)]; if (x === 6 || y === 6) return x + y === 7; } },
  },
  { what: 'two children, given at least one girl: both girls', exact: q(1, 3), trial: (rng) => { for (;;) { const [a, b] = [rng() < 0.5, rng() < 0.5]; if (a || b) return a && b; } } },
  { what: 'two dice: a total of 8 given the first is even', exact: q(1, 6), trial: (rng) => { for (;;) { const [x, y] = [die(rng), die(rng)]; if (x % 2 === 0) return x + y === 8; } } },
  { what: 'three cards from a deck are all hearts', exact: q(11, 850), trial: (rng) => { const s = new Set<number>(); while (s.size < 3) s.add(Math.floor(rng() * 52)); return [...s].every((c) => c < 13); } },
];
const hearts = mul(mul(q(13, 52), q(12, 51)), q(11, 50));

export const conditionalFormula: TopicContent = {
  topicId: 'prob.conditional-formula',
  goal: t`Compute a conditional probability as ${math`P(A \mid B) = P(A \cap B) / P(B)`}, and rearrange it as the multiplication rule to find the probability of a sequence of events.`,
  objective: t`Compute ${math`P(A \mid B)`} from the formula, and use the multiplication rule along a sequence of events.`,
  why: t`Conditioning is how new information enters a calculation; Bayes and independence are built on this formula.`,
  minutes: 15,
  lesson: [
    { kind: 'section', title: t`New information changes the odds` },
    { kind: 'hook', text: t`A family has two children, and you learn that at least one is a girl. What is the chance that both are? It is tempting to say ${q(1, 2)}, since the other child is a girl or a boy. The answer is ${q(1, 3)}. (Assume each child is a girl or a boy with equal chances, independently.)` },
    { kind: 'narrative', text: t`List the equally likely families, older child first: GG, GB, BG, BB. "At least one girl" rules out BB and leaves three families, still equally likely. Only one of those three is GG. Learning something shrinks the sample space; the conditional probability is the share of what is left. Written with probabilities instead of counts, that becomes a formula.` },
    { kind: 'section', title: t`The formula` },
    {
      kind: 'definition',
      name: t`Conditional probability`,
      formal: t`For events ${mA} and ${mB} with ${math`P(B) > ${0}`}, the conditional probability of ${mA} given ${mB} is ${dmath`P(A \mid B) = \frac{P(A \cap B)}{P(B)}.`}`,
      plain: t`Restrict to the outcomes where ${mB} happens, and ask what share of that probability also has ${mA}. For the children: ${math`P(\text{GG} \mid \text{a girl}) = \frac{${q(1, 4)}}{${q(3, 4)}} = ${q(1, 3)}`}.`,
    },
    { kind: 'p', text: t`Two dice, given that the first is even: that leaves ${18} of the ${36} pairs. Of those, a total of ${8} needs ${math`(${2}, ${6})`}, ${math`(${4}, ${4})`}, or ${math`(${6}, ${2})`}, so ${math`P(\text{total } ${8} \mid \text{first even}) = \frac{${3}/${36}}{${18}/${36}} = ${q(3, 18)}`}. Without the information it was ${q(5, 36)}.` },
    checkFrom(formulaAlgebra, { unknown: 'conditional', pb: q(2, 5), pab: q(1, 10) }, t`${math`P(A \mid B) = \frac{${q(1, 10)}}{${q(2, 5)}} = ${div(q(1, 10), q(2, 5))}`}.`),
    { kind: 'section', title: t`The multiplication rule` },
    { kind: 'narrative', text: t`Turn the formula round and it computes the probability that several things all happen, one after another.` },
    { kind: 'theorem', name: t`Multiplication rule`, statement: t`If ${math`P(B) > ${0}`}, then ${math`P(A \cap B) = P(A \mid B)\,P(B)`}. More generally, if ${math`P(A_{${1}} \cap \cdots \cap A_{n - ${1}}) > ${0}`}, then ${dmath`P(A_{${1}} \cap \cdots \cap A_{n}) = P(A_{${1}})\,P(A_{${2}} \mid A_{${1}}) \cdots P(A_{n} \mid A_{${1}} \cap \cdots \cap A_{n - ${1}}).`}` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Two events`, text: t`Multiply both sides of the definition by ${math`P(B)`}.` },
        { label: t`Write each factor as a quotient`, text: t`The right side of the general rule is ${math`P(A_{${1}}) \cdot \frac{P(A_{${1}} \cap A_{${2}})}{P(A_{${1}})} \cdot \frac{P(A_{${1}} \cap A_{${2}} \cap A_{${3}})}{P(A_{${1}} \cap A_{${2}})} \cdots \frac{P(A_{${1}} \cap \cdots \cap A_{n})}{P(A_{${1}} \cap \cdots \cap A_{n - ${1}})}`}.`, why: { q: t`Why is every denominator positive?`, a: t`Each is the probability of an intersection containing ${math`A_{${1}} \cap \cdots \cap A_{n - ${1}}`}, which has positive probability, and a bigger event is at least as likely.` } },
        { label: t`Cancel`, text: t`Each numerator cancels the next denominator, leaving ${math`P(A_{${1}} \cap \cdots \cap A_{n})`}.` },
      ],
    },
    { kind: 'p', text: t`This is the [[multiplication-rule|multiplication rule]]. Each factor is conditional on everything before it. Deal three cards from a shuffled deck: all three are hearts with probability ${math`\frac{${13}}{${52}} \times \frac{${12}}{${51}} \times \frac{${11}}{${50}} = ${hearts}`}. The numerators and denominators fall because each card dealt leaves the deck. STEP Support Assignment ${12}'s raffle queue is solved the same way, one person at a time.` },
    checkFrom(draws, { r: 5, b: 3, kind: 'both' }, t`${math`\frac{${5}}{${8}} \times \frac{${4}}{${7}} = ${mul(q(5, 8), q(4, 7))}`}: after one red, ${4} of the ${7} left are red.`),
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${math`P(A \mid B) = P(A \cap B)`}.`, counterexample: t`For the children, ${math`P(\text{GG} \cap \text{a girl}) = ${q(1, 4)}`}, but ${math`P(\text{GG} \mid \text{a girl}) = ${q(1, 3)}`}. Dividing by ${math`P(B)`} rescales to the new, smaller sample space.` },
    { kind: 'pitfall', claim: t`"At least one is a girl" and "the older is a girl" are the same information.`, counterexample: t`Given the older is a girl, the families left are GG and GB, so both are girls with probability ${q(1, 2)}, not ${q(1, 3)}. Different conditions keep different outcomes.` },
    { kind: 'takeaway', text: t`To condition on ${mB}, restrict to ${mB} and divide by ${math`P(B)`}; to find "this and then that", multiply each probability given what came before.` },
  ],
  examples: [
    { ...workedCambridge(a6c), examiner: t`The examiner looks for the joint probability from the multiplication rule and the division by ${math`P(W)`}, not ${math`P(S)`}.` },
    worked(diceGiven, { i: 0, j: 0 }, t`A total of ${7} given a six`),
    worked(draws, { r: 4, b: 3, kind: 'first-given-second' }, t`The first draw given the second`),
  ],
  generators: [diceGiven, formulaAlgebra, draws],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['multiplication-rule'],
  claims,
  cambridge: withUses([a19i, raffle121, raffle11, raffle3, smokersReverse], {
    'a12-q3-iii': { sections: ['The multiplication rule'], note: t`Listing the successful queues and multiplying conditional probabilities` },
    'a6-q4-i-formula': { sections: ['The formula'], note: t`Writing two conditional probabilities as quotients and comparing them` },
    'a19-q4-i-formula': { sections: ['The formula'], note: t`A conditional probability from a joint and a total probability` },
    'a12-q3-ii-121': { sections: ['The multiplication rule'], note: t`Multiplying conditional probabilities along a queue` },
  }),
  gate: ['a12-q3-iii', 'a6-q4-i-formula', 'a19-q4-i-formula', 'a12-q3-ii-121'],
  recall: [
    { front: t`Conditional probability.`, back: t`${math`P(A \mid B) = \frac{P(A \cap B)}{P(B)}`}, for ${math`P(B) > ${0}`}.` },
    { front: t`The multiplication rule for three events.`, back: t`${math`P(A \cap B \cap C) = P(A)\,P(B \mid A)\,P(C \mid A \cap B)`}.` },
  ],
  proofOrder: [
    {
      title: t`The multiplication rule for three events`,
      steps: [
        t`Write ${math`P(A)P(B \mid A)P(C \mid A \cap B)`} with each conditional as a quotient.`,
        t`It is ${math`P(A) \cdot \frac{P(A \cap B)}{P(A)} \cdot \frac{P(A \cap B \cap C)}{P(A \cap B)}`}.`,
        t`Cancel ${math`P(A)`} and ${math`P(A \cap B)`}, both positive.`,
        t`What is left is ${math`P(A \cap B \cap C)`}.`,
      ],
    },
  ],
};
