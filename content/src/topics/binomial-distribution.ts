/**
 * prob.binomial-distribution: the number of successes in n independent trials, each a
 * success with probability p, has P(X = k) = C(n, k) p^k (1 - p)^(n - k). From STEP Support
 * Assignment 19 Q4(ii) (the number of sixes in three dice, whose hints write the terms
 * 3 × (1/6)(5/6)^2 and so on) and Assignment 12 Q2(iv) (three children and their goggles,
 * whose hints remark that "any one child forgets" multiplies a single case by 3).
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision } from '../cambridge';
import { add, int, mul, pick, q, str, sub, type Rational } from '../math';
import { choose } from '../numbers';
import { generator, type Misconception } from '../problem';
import { dmath, join, listOf, math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const [mn, mk, mp] = [math`n`, math`k`, math`p`];
const pow = (r: Rational, e: number): Rational => { let out = q(1); for (let i = 0; i < e; i++) out = mul(out, r); return out; };
const pmf = (n: number, k: number, p: Rational): Rational => mul(q(choose(n, k)), mul(pow(p, k), pow(sub(q(1), p), n - k)));
const toF = (r: Rational): number => Number(r.num) / Number(r.den);
/** The distribution by listing every sequence of n trials with its probability. */
function byListing(n: number, p: Rational): Rational[] {
  const out = Array.from({ length: n + 1 }, () => q(0));
  for (let s = 0; s < 2 ** n; s++) {
    let [k, pr] = [0, q(1)];
    for (let i = 0; i < n; i++) if ((s >> i) & 1) { k++; pr = mul(pr, p); } else pr = mul(pr, sub(q(1), p));
    out[k] = add(out[k] as Rational, pr);
  }
  return out;
}
const successes = (n: number, p: Rational, rng: Rng): number => { let k = 0; for (let i = 0; i < n; i++) if (rng() < toF(p)) k++; return k; };

interface Ctx { p: Rational; trial: Rich; success: Rich }
const CONTEXTS: readonly Ctx[] = [
  { p: q(1, 6), trial: t`a fair die is thrown`, success: t`a six` },
  { p: q(1, 2), trial: t`a fair coin is tossed`, success: t`a head` },
  { p: q(1, 4), trial: t`a child remembers goggles with probability ${q(1, 4)}, independently of the others`, success: t`a child with goggles` },
  { p: q(1, 3), trial: t`a spinner lands on red with probability ${q(1, 3)}`, success: t`red` },
  { p: q(2, 5), trial: t`a seed germinates with probability ${q(2, 5)}, independently of the others`, success: t`a seed that germinates` },
  { p: q(3, 4), trial: t`a free throw scores with probability ${q(3, 4)}, independently of the others`, success: t`a score` },
];
const ctxPrompt = (c: Ctx, n: number): Rich => t`There are ${n} independent trials: in each, ${c.trial}. A success is ${c.success}.`;

// ---------------------------------------------------------------- exactly k

interface ExP { c: number; n: number; k: number }

const exactlyK = generator<ExP>({
  id: 'exactly-k',
  skill: 'Compute P(X = k) for X ~ B(n, p): the number of orders, times the probability of one order.',
  params: (rng) => { const n = int(rng, 3, 6); return { c: int(rng, 0, CONTEXTS.length - 1), n, k: int(rng, 1, n - 1) }; },
  sane: ({ c, n, k }) => (c < CONTEXTS.length && k >= 1 && k < n ? null : 'out of range'),
  problem: ({ c, n, k }) => {
    const cx = CONTEXTS[c] as Ctx;
    const p = cx.p;
    const one = mul(pow(p, k), pow(sub(q(1), p), n - k));
    return {
      prompt: t`${ctxPrompt(cx, n)} What is the probability of exactly ${k} successes?`,
      answer: { kind: 'exact', expected: str(pmf(n, k, p)) },
      solution: [
        t`The number of successes is ${math`X \sim B(${n}, ${p})`}. One order with ${k} successes, such as all the successes first, has probability ${math`\left(${p}\right)^{${k}} \times \left(${sub(q(1), p)}\right)^{${n - k}} = ${one}`}, by independence.`,
        t`There are ${math`\binom{${n}}{${k}} = ${choose(n, k)}`} orders, one for each choice of which trials succeed. So ${math`P(X = ${k}) = ${choose(n, k)} \times ${one} = ${pmf(n, k, p)}`}.`,
      ],
    };
  },
  solve: ({ c, n, k }) => str(byListing(n, (CONTEXTS[c] as Ctx).p)[k] as Rational),
  misconceptions: ({ c, n, k }): Misconception[] => {
    const p = (CONTEXTS[c] as Ctx).p;
    return [
      { response: str(mul(pow(p, k), pow(sub(q(1), p), n - k))), why: t`That is one order of successes and failures. The ${k} successes can be any ${k} of the ${n} trials: multiply by ${math`\binom{${n}}{${k}}`}.` },
      { response: str(mul(q(choose(n, k)), pow(p, k))), why: t`The other ${n - k} trials must fail, each with probability ${sub(q(1), p)}: include ${math`\left(${sub(q(1), p)}\right)^{${n - k}}`}.` },
      { response: str(pmf(n, k, sub(q(1), p))), why: t`The powers are the wrong way round: ${mp} goes with the ${k} successes and ${math`${1} - p`} with the ${n - k} failures.` },
    ];
  },
  trial: ({ c, n, k }, rng) => successes(n, (CONTEXTS[c] as Ctx).p, rng) === k,
});

// ---------------------------------------------------------------- at least, at most

interface AtP { c: number; n: number; k: number; dir: 'least' | 'most' }

const atLeast = generator<AtP>({
  id: 'at-least',
  skill: 'Add binomial probabilities for "at least" or "at most", or use the complement when it has fewer terms.',
  params: (rng) => { const n = int(rng, 3, 6); return { c: int(rng, 0, CONTEXTS.length - 1), n, k: int(rng, 1, n - 1), dir: pick(rng, ['least', 'most'] as const) }; },
  sane: ({ c, n, k }) => (c < CONTEXTS.length && k >= 1 && k < n ? null : 'out of range'),
  problem: ({ c, n, k, dir }) => {
    const cx = CONTEXTS[c] as Ctx;
    const ks = Array.from({ length: n + 1 }, (_, j) => j).filter((j) => (dir === 'least' ? j >= k : j <= k));
    const v = ks.reduce((s, j) => add(s, pmf(n, j, cx.p)), q(0));
    return {
      prompt: t`${ctxPrompt(cx, n)} What is the probability of at ${dir} ${k} successes?`,
      answer: { kind: 'exact', expected: str(v) },
      solution: [
        t`${math`X \sim B(${n}, ${cx.p})`}. At ${dir} ${k} successes means ${math`X`} is one of ${listOf(ks)}.`,
        t`Add ${math`P(X = j) = \binom{${n}}{j} \left(${cx.p}\right)^{j} \left(${sub(q(1), cx.p)}\right)^{${n} - j}`} over those values: ${join(ks.map((j) => [math`${pmf(n, j, cx.p)}`]), ', ')}, which add to ${v}.`,
      ],
    };
  },
  solve: ({ c, n, k, dir }) => {
    const d = byListing(n, (CONTEXTS[c] as Ctx).p);
    return str(d.reduce((s, pr, j) => ((dir === 'least' ? j >= k : j <= k) ? add(s, pr) : s), q(0)));
  },
  misconceptions: ({ c, n, k, dir }): Misconception[] => {
    const p = (CONTEXTS[c] as Ctx).p;
    const strict = Array.from({ length: n + 1 }, (_, j) => j).filter((j) => (dir === 'least' ? j > k : j < k)).reduce((s, j) => add(s, pmf(n, j, p)), q(0));
    return [
      { response: str(pmf(n, k, p)), why: t`That is exactly ${k}. At ${dir} ${k} includes every value ${dir === 'least' ? 'above' : 'below'} it too.` },
      { response: str(strict), why: t`That leaves out ${math`X = ${k}`} itself: "at ${dir}" includes it.` },
      { response: str(sub(q(1), strict)), why: t`That is the complement of the strict inequality, which is "at ${dir === 'least' ? 'most' : 'least'} ${k}". Check which side you need.` },
    ];
  },
  trial: ({ c, n, k, dir }, rng) => { const x = successes(n, (CONTEXTS[c] as Ctx).p, rng); return dir === 'least' ? x >= k : x <= k; },
});

// ---------------------------------------------------------------- at least one

interface OneP { c: number; n: number }

const atLeastOne = generator<OneP>({
  id: 'at-least-one',
  skill: 'Find the probability of at least one success as one minus the probability of none.',
  params: (rng) => ({ c: int(rng, 0, CONTEXTS.length - 1), n: int(rng, 2, 6) }),
  sane: ({ c, n }) => (c < CONTEXTS.length && n >= 2 ? null : 'out of range'),
  problem: ({ c, n }) => {
    const cx = CONTEXTS[c] as Ctx;
    const none = pow(sub(q(1), cx.p), n);
    return {
      prompt: t`${ctxPrompt(cx, n)} What is the probability of at least one success?`,
      answer: { kind: 'exact', expected: str(sub(q(1), none)) },
      solution: [
        t`The complement of "at least one" is "none": all ${n} trials fail, with probability ${math`\left(${sub(q(1), cx.p)}\right)^{${n}} = ${none}`} by independence.`,
        t`So ${math`P(X \ge ${1}) = ${1} - ${none} = ${sub(q(1), none)}`}.`,
      ],
    };
  },
  solve: ({ c, n }) => str(sub(q(1), byListing(n, (CONTEXTS[c] as Ctx).p)[0] as Rational)),
  misconceptions: ({ c, n }): Misconception[] => {
    const p = (CONTEXTS[c] as Ctx).p;
    return [
      { response: str(mul(q(n), p)), why: t`Adding ${mp} for each trial counts the outcomes with several successes more than once (and can exceed ${1}). Use ${math`${1} - P(\text{none})`}.` },
      { response: str(sub(q(1), pow(p, n))), why: t`${math`${1} - p^{${n}}`} is the chance that not every trial succeeds. "At least one success" is the complement of "every trial fails".` },
      { response: str(pmf(n, 1, p)), why: t`That is exactly one success. At least one includes two or more.` },
    ];
  },
  trial: ({ c, n }, rng) => successes(n, (CONTEXTS[c] as Ctx).p, rng) >= 1,
});

// ---------------------------------------------------------------- Cambridge problems

const SIX = q(1, 6);
const a19one = auto({
  id: 'a19-q4-ii-binomial-one',
  source: cite('step-f19', 'Q4(ii)', true),
  title: t`One six in three dice, by the binomial formula`,
  prompt: t`Three fair dice are thrown. The number of sixes is ${math`X \sim B(${3}, ${SIX})`}. Use the binomial formula to find ${math`P(X = ${1})`}.`,
  answer: { kind: 'exact', expected: str(pmf(3, 1, SIX)) },
  solution: [
    t`Each die is a trial, independent of the others, with success "a six" of probability ${SIX}.`,
    t`${math`P(X = ${1}) = \binom{${3}}{${1}} \left(${SIX}\right)\left(${q(5, 6)}\right)^{${2}} = ${3} \times \frac{${25}}{${216}} = \frac{${75}}{${216}} = ${pmf(3, 1, SIX)}`}. The hints write the same term, ${math`${3} \times \frac{${1}}{${6}} \times \left(\frac{${5}}{${6}}\right)^{${2}}`}.`,
  ],
  reference: str(pmf(3, 1, SIX)),
  verify: () => same('every outcome of three dice listed', str(byListing(3, SIX)[1] as Rational), str(pmf(3, 1, SIX))),
  misconceptions: [{ response: str(q(25, 216)), why: t`That is one order (six, not six, not six). The six can be on any of the three dice.` }],
  official: { source: cite('step-f19-hints', 'Q4(ii)'), answer: '75/216', agrees: true },
});

const a19two = auto({
  id: 'a19-q4-ii-at-least-two',
  source: cite('step-f19', 'Q4(ii)', true),
  title: t`At least two sixes`,
  prompt: t`Three fair dice are thrown. What is the probability of at least two sixes?`,
  answer: { kind: 'exact', expected: str(add(pmf(3, 2, SIX), pmf(3, 3, SIX))) },
  solution: [
    t`${math`P(X = ${2}) = \binom{${3}}{${2}}\left(${SIX}\right)^{${2}} ${q(5, 6)} = \frac{${15}}{${216}}`} and ${math`P(X = ${3}) = \left(${SIX}\right)^{${3}} = \frac{${1}}{${216}}`}.`,
    t`Together ${math`\frac{${16}}{${216}} = ${add(pmf(3, 2, SIX), pmf(3, 3, SIX))}`}.`,
  ],
  reference: str(add(pmf(3, 2, SIX), pmf(3, 3, SIX))),
  verify: () => same('every outcome of three dice listed', str(add(byListing(3, SIX)[2] as Rational, byListing(3, SIX)[3] as Rational)), '2/27'),
  misconceptions: [{ response: str(q(15, 216)), why: t`That is exactly two sixes. At least two includes three sixes as well.` }],
  // The hints' terms 3 × (1/6)^2 × (5/6) and (1/6)^3, that is 15 and 1 out of 216.
  official: { source: cite('step-f19-hints', 'Q4(ii)'), answer: '16/216', agrees: true },
});

const GOG = q(1, 4);
const a12two = auto({
  id: 'a12-q2-iv-two',
  source: cite('step-f12', 'Q2(iv)', true),
  title: t`Exactly two children with goggles`,
  prompt: t`Three children have a swimming lesson. Each remembers to bring goggles with probability ${GOG}, independently of the other two. What is the probability that exactly two of them have goggles?`,
  answer: { kind: 'exact', expected: str(pmf(3, 2, GOG)) },
  solution: [
    t`Question (iv)(c) found one case: the middle child without goggles and the other two with them, ${math`${GOG} \times ${q(3, 4)} \times ${GOG} = ${q(3, 64)}`}.`,
    t`The child without goggles could be any of the three, so, as the hints remark, multiply by ${3}: ${math`${3} \times ${q(3, 64)} = ${pmf(3, 2, GOG)}`}, which is ${math`\binom{${3}}{${2}} \left(${GOG}\right)^{${2}} ${q(3, 4)}`}.`,
  ],
  reference: str(pmf(3, 2, GOG)),
  verify: () => same('the eight cases listed', str(byListing(3, GOG)[2] as Rational), str(q(9, 64))),
  misconceptions: [{ response: str(q(3, 64)), why: t`That is the single case where the middle child has none. Any one of the three could be the one without.` }],
  // The hints give (iv)(c) as 3/64 and say "any one child" multiplies it by 3: 9/64.
  official: { source: cite('step-f12-hints', 'Q2(iv)(c)'), answer: '9/64', agrees: true },
});

const a12dist = auto({
  id: 'a12-q2-iv-distribution',
  source: cite('step-f12', 'Q2(iv)', true),
  title: t`The whole distribution`,
  prompt: t`For the three children, each with goggles with probability ${GOG} independently, give the probability that ${0}, ${1}, ${2}, and ${3} of them have goggles.`,
  answer: { kind: 'table', cell: 'exact', columns: [t`children with goggles`, t`probability`], rows: [0, 1, 2, 3].map((k) => [t`${k}`, null]), expected: [0, 1, 2, 3].map((k) => str(pmf(3, k, GOG))) },
  solution: [
    t`${math`P(X = k) = \binom{${3}}{k}\left(${GOG}\right)^{k}\left(${q(3, 4)}\right)^{${3} - k}`}: ${math`${pmf(3, 0, GOG)}, ${pmf(3, 1, GOG)}, ${pmf(3, 2, GOG)}, ${pmf(3, 3, GOG)}`}.`,
    t`They add to ${1}. The hints' answer to (iv)(a), at least one, is ${math`${1} - ${pmf(3, 0, GOG)} = ${sub(q(1), pmf(3, 0, GOG))}`}.`,
  ],
  reference: [0, 1, 2, 3].map((k) => str(pmf(3, k, GOG))),
  verify: () => same('the eight cases listed', byListing(3, GOG).map(str).join(' '), [0, 1, 2, 3].map((k) => str(pmf(3, k, GOG))).join(' ')),
  misconceptions: [{ response: ['27/64', '9/64', '3/64', '1/64'], why: t`Those are single orders. For one or two children with goggles, there are three choices of which children.` }],
});

const a19why = supervision({
  id: 'a19-q4-ii-why-binomial',
  source: cite('step-f19', 'Q4(ii)'),
  title: t`Why the number of sixes is binomial`,
  prompt: t`For three dice, explain what the trials, the success, and ${mp} are, and where independence is used, so that the number of sixes is ${math`B(${3}, ${SIX})`}. Then explain why ${math`P(\text{two sixes})`} is ${math`${3} \times \left(${SIX}\right)^{${2}} \times ${q(5, 6)}`}, and give an example of three dice-like trials whose number of successes is not binomial.`,
  writeUp: 'explanation',
  official: cite('step-f19-hints', 'Q4(ii)'),
});

// ---------------------------------------------------------------- lesson

const claims: ProbabilityClaim[] = [
  { what: 'exactly two sixes in four dice', exact: pmf(4, 2, SIX), trial: (rng) => successes(4, SIX, rng) === 2 },
];
const FIVE6 = q(5, 6);
const oneOrder = mul(pow(SIX, 2), pow(FIVE6, 2));

export const binomialDistribution: TopicContent = {
  topicId: 'prob.binomial-distribution',
  goal: t`Recognise ${mn} independent trials with the same chance of success, and compute probabilities for the number of successes with ${math`P(X = k) = \binom{n}{k} p^{k}(${1} - p)^{n - k}`}.`,
  objective: t`Recognise a binomial count and compute its probabilities with ${math`\binom{n}{k}p^{k}(${1} - p)^{n - k}`}.`,
  why: t`The binomial is the first named distribution; the Poisson and normal approximations grow out of it.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`Counting sixes` },
    { kind: 'hook', text: t`Throw four fair dice. What is the chance of exactly two sixes? Two sixes then two non-sixes has probability ${math`(\frac{${1}}{${6}})^{${2}}(\frac{${5}}{${6}})^{${2}} = ${oneOrder}`}. But that is only one way it can happen. How many ways are there, and are they all equally likely?` },
    { kind: 'narrative', text: t`The sixes could be on dice ${1} and ${2}, or ${1} and ${3}, and so on: one way for each choice of which two dice show a six. Each way has the same probability, because only the number of sixes and non-sixes matters, not their order. So the answer is the number of ways times ${oneOrder}. This pattern, the same for coins, seeds, and free throws, is the binomial distribution.` },
    { kind: 'section', title: t`Trials and the binomial` },
    {
      kind: 'definition',
      name: t`Bernoulli trial, binomial distribution`,
      formal: t`A [[bernoulli-trial|Bernoulli trial]] is an experiment with two outcomes, success with probability ${mp} and failure with probability ${math`${1} - p`}. If ${math`X`} counts the successes in ${mn} independent Bernoulli trials, each with the same ${mp}, then ${math`X`} has the [[binomial-distribution|binomial distribution]], written ${math`X \sim B(n, p)`}.`,
      plain: t`Three things must hold: a fixed number of trials ${mn}, trials that do not affect each other, and the same chance ${mp} every time. The number of sixes in four dice is ${math`B(${4}, ${SIX})`}.`,
    },
    { kind: 'theorem', statement: t`If ${math`X \sim B(n, p)`}, then for ${math`k = ${0}, ${1}, \ldots, n`}, ${dmath`P(X = k) = \binom{n}{k} p^{k} (${1} - p)^{n - k}.`}` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`One order`, text: t`Fix a set ${math`S`} of ${mk} trials. The event "exactly the trials in ${math`S`} succeed" has probability ${math`p^{k}(${1} - p)^{n - k}`}.`, plain: t`By independence, multiply: ${mp} for each of the ${mk} successes and ${math`${1} - p`} for each of the ${math`n - k`} failures.` },
        { label: t`Count the orders`, text: t`There are ${math`\binom{n}{k}`} sets ${math`S`} of ${mk} trials out of ${mn}.`, plain: t`Choosing which trials succeed is choosing ${mk} things from ${mn}. For two sixes in four dice, ${math`\binom{${4}}{${2}} = ${choose(4, 2)}`}.` },
        { label: t`The orders are disjoint`, text: t`For different sets ${math`S`} the events are disjoint, and ${math`\{X = k\}`} is their union.`, plain: t`A run of results has exactly one set of successful trials.` },
        { label: t`Add`, text: t`${math`P(X = k) = \binom{n}{k} p^{k}(${1} - p)^{n - k}`}.` },
      ],
    },
    { kind: 'p', text: t`So two sixes in four dice: ${math`${choose(4, 2)} \times ${oneOrder} = ${pmf(4, 2, SIX)}`}. And the probabilities add to ${1}, as they must: by the binomial theorem, ${math`\sum_{k = ${0}}^{n} \binom{n}{k} p^{k}(${1} - p)^{n - k} = (p + (${1} - p))^{n} = ${1}`}.` },
    checkFrom(exactlyK, { c: 3, n: 4, k: 1 }, t`${math`\binom{${4}}{${1}} \times ${q(1, 3)} \times (${q(2, 3)})^{${3}} = ${4} \times ${mul(q(1, 3), pow(q(2, 3), 3))} = ${pmf(4, 1, q(1, 3))}`}.`),
    { kind: 'section', title: t`At least, at most` },
    { kind: 'p', text: t`"At least ${mk}" and "at most ${mk}" are unions of the disjoint events ${math`\{X = j\}`}, so add their probabilities. When the complement has fewer terms, use it instead. The most useful case: ${dmath`P(X \ge ${1}) = ${1} - P(X = ${0}) = ${1} - (${1} - p)^{n}.`} At least one six in four dice: ${math`${1} - (${FIVE6})^{${4}} = ${sub(q(1), pow(FIVE6, 4))}`}, just over a half.` },
    checkFrom(atLeastOne, { c: 4, n: 3 }, t`None germinate with probability ${math`(${q(3, 5)})^{${3}} = ${pow(q(3, 5), 3)}`}, so at least one does with ${math`${1} - ${pow(q(3, 5), 3)} = ${sub(q(1), pow(q(3, 5), 3))}`}.`),
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`The number of red balls in two draws from a bag is binomial.`, counterexample: t`Draw two balls without replacement from a bag of ${2} red and ${2} blue. Both red has probability ${math`\frac{${2}}{${4}} \times \frac{${1}}{${3}} = ${q(1, 6)}`}, but ${math`B(${2}, ${q(1, 2)})`} would give ${q(1, 4)}. The draws are not independent: the first changes the second.` },
    { kind: 'pitfall', claim: t`${math`P(X = k) = p^{k}(${1} - p)^{n - k}`}.`, counterexample: t`That is one order. For two sixes in four dice it gives ${oneOrder}, but there are ${choose(4, 2)} orders, so the answer is ${pmf(4, 2, SIX)}.` },
    { kind: 'takeaway', text: t`Fixed ${mn}, independent trials, the same ${mp}: then ${math`P(X = k)`} is the number of orders, ${math`\binom{n}{k}`}, times the probability of one order.` },
  ],
  examples: [
    { ...workedCambridge(a19one), examiner: t`The examiner looks for the trials, the success, and ${mp} named, and the factor ${3} explained as the choice of which die shows the six.` },
    worked(exactlyK, { c: 1, n: 5, k: 2 }, t`Two heads in five tosses`),
    worked(atLeast, { c: 0, n: 4, k: 2, dir: 'least' }, t`At least two sixes in four throws`),
  ],
  generators: [exactlyK, atLeast, atLeastOne],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['bernoulli-trial', 'binomial-distribution'],
  claims,
  cambridge: [a19two, a12two, a12dist, a19why],
  gate: ['a12-q2-iv-distribution', 'a19-q4-ii-why-binomial', 'a19-q4-ii-at-least-two', 'a12-q2-iv-two'],
  recall: [
    { front: t`When is a count binomial?`, back: t`A fixed number ${mn} of independent trials, each a success with the same probability ${mp}.` },
    { front: t`${math`P(X = k)`} for ${math`X \sim B(n, p)`}.`, back: t`${math`\binom{n}{k} p^{k}(${1} - p)^{n - k}`}.` },
    { front: t`${math`P(X \ge ${1})`} for ${math`X \sim B(n, p)`}.`, back: t`${math`${1} - (${1} - p)^{n}`}.` },
  ],
  proofOrder: [
    {
      title: t`The binomial formula`,
      steps: [
        t`One particular set of ${mk} successful trials has probability ${math`p^{k}(${1} - p)^{n - k}`}, by independence.`,
        t`There are ${math`\binom{n}{k}`} such sets.`,
        t`The events for different sets are disjoint, and their union is ${math`\{X = k\}`}.`,
        t`Adding, ${math`P(X = k) = \binom{n}{k}p^{k}(${1} - p)^{n - k}`}.`,
      ],
    },
  ],
};
