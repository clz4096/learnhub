/**
 * prob.inclusion-exclusion: the inclusion-exclusion formula for n events, proved by
 * induction (or by counting each outcome once with the binomial theorem) and applied to
 * matching and counting problems. From IA Probability Example Sheet 1 Q7 (a committee of r
 * from n: the probability that m given people are all on it, directly and by
 * inclusion-exclusion, and the identity that follows) and the Faculty schedule's
 * "Inclusion-exclusion formula". The sheet has no official solutions.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision } from '../cambridge';
import { add, factorial, int, mul, pick, q, str, sub, toFloat, type Rational } from '../math';
import { choose } from '../numbers';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, listOf, math, t } from '../rich';
import { checkFrom, quickCheck, worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const S1 = 'ia-prob-sheet-1' as const;
const mn = math`n`;
const distinctFrom = (right: string, xs: readonly string[]): number => new Set(xs.filter((x) => x !== right)).size;
const shuffle = (n: number, rng: Rng): number[] => { const a = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j] as number, a[i] as number]; } return a; };
const pow = (r: Rational, e: number): Rational => { let out = q(1); for (let i = 0; i < e; i++) out = mul(out, r); return out; };

// ---------------------------------------------------------------- no letter in its own envelope

type DerCtx = 'letters' | 'hats' | 'tests';
interface DerP { n: number; ctx: DerCtx }
const derange = (n: number): Rational => Array.from({ length: n + 1 }, (_, k) => q((-1) ** k, factorial(k))).reduce(add, q(0));
const derMis = (n: number): string[] => [str(pow(q(n - 1, n), n)), '0', str(q(1, n))];

const derangements = generator<DerP>({
  id: 'derangements',
  skill: 'Find the probability that a random arrangement leaves nothing in its own place, by inclusion-exclusion over the events "item i is in place i".',
  params: (rng) => ({ n: int(rng, 3, 7), ctx: pick(rng, ['letters', 'hats', 'tests'] as const) }),
  sane: ({ n }) => (n >= 3 ? null : 'out of range'),
  problem: ({ n, ctx }) => {
    const terms = Array.from({ length: n + 1 }, (_, k) => k);
    return {
      prompt: ctx === 'letters'
        ? t`${n} letters are put at random into their ${n} addressed envelopes, one each. What is the probability that no letter is in its own envelope?`
        : ctx === 'hats'
          ? t`${n} people leave their hats at a cloakroom, and the hats are handed back at random, one each. What is the probability that nobody gets their own hat back?`
          : t`A teacher hands ${n} tests back at random for marking, one to each of the ${n} students who wrote them. What is the probability that no student marks their own test?`,
      answer: { kind: 'exact', expected: str(derange(n)) },
      solution: [
        t`Let ${math`A_{i}`} be "letter ${math`i`} is in its envelope". For any ${math`k`} given letters, all are in place with probability ${math`\frac{(n - k)!}{n!}`}, and there are ${math`\binom{n}{k}`} such sets, so the ${math`k`}th sum of inclusion-exclusion is ${math`\binom{n}{k}\frac{(n - k)!}{n!} = \frac{${1}}{k!}`}.`,
        t`${math`\mathbb{P}(\text{some letter in place}) = \sum_{k = ${1}}^{${n}} (-${1})^{k + ${1}} \frac{${1}}{k!}`}, so ${math`\mathbb{P}(\text{none}) = \sum_{k = ${0}}^{${n}} \frac{(-${1})^{k}}{k!} = ${computedTex(terms.map((k) => (k === 0 ? String(factorial(0)) : `${k % 2 === 1 ? '-' : '+'} \\frac{${1}}{${factorial(k)}}`)).join(' '))} = ${derange(n)}`}.`,
      ],
    };
  },
  solve: ({ n }) => {
    // Count the permutations with no fixed point by listing them.
    const perms = (xs: number[]): number[][] => (xs.length === 0 ? [[]] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])));
    const all = perms(Array.from({ length: n }, (_, i) => i));
    return str(q(all.filter((p) => p.every((v, i) => v !== i)).length, all.length));
  },
  misconceptions: ({ n }): Misconception[] => [
    { response: str(pow(q(n - 1, n), n)), why: t`The events "letter ${math`i`} misses" are not independent: once some letters are placed, the others' chances change. Use inclusion-exclusion.` },
    { response: '0', why: t`${math`${1} - \sum \mathbb{P}(A_{i}) = ${1} - n \cdot \frac{${1}}{n} = ${0}`} forgets the overlaps: add back the pairs, subtract the triples, and so on.` },
    { response: str(q(1, n)), why: t`That is the chance that one given letter is in place. The question is about all ${n} letters at once.` },
  ],
  trial: ({ n }, rng) => shuffle(n, rng).every((v, i) => v !== i),
});

// ---------------------------------------------------------------- counting by inclusion-exclusion

interface CopP { N: number; ps: readonly number[] }
const count = ({ N, ps }: CopP): number => {
  let total = 0;
  for (let mask = 0; mask < 1 << ps.length; mask++) {
    const sel = ps.filter((_, i) => (mask >> i) & 1);
    const prod = sel.reduce((a, b) => a * b, 1);
    total += (sel.length % 2 === 0 ? 1 : -1) * Math.floor(N / prod);
  }
  return total;
};
const copMis = ({ N, ps }: CopP): string[] => {
  const singles = ps.reduce((a, p) => a + Math.floor(N / p), 0);
  let pairs = 0;
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) pairs += Math.floor(N / ((ps[i] as number) * (ps[j] as number)));
  return [String(N - singles), String(N - singles + pairs), String(Math.round(ps.reduce((a, p) => a * (1 - 1 / p), N)))];
};

const divisibleByNone = generator<CopP>({
  id: 'divisible-by-none',
  skill: 'Count the numbers up to N divisible by none of several primes: subtract the multiples of each, add back multiples of each pair, subtract each triple.',
  params: (rng) => {
    for (;;) {
      const p: CopP = { N: int(rng, 100, 1000), ps: pick(rng, [[2, 3, 5], [2, 3, 7], [3, 5, 7], [2, 5, 7], [2, 3, 5, 7], [2, 3, 11]]) };
      if (distinctFrom(String(count(p)), copMis(p)) >= 2) return p;
    }
  },
  sane: ({ N }) => (N >= 100 ? null : 'out of range'),
  problem: (p) => {
    const { N, ps } = p;
    const singles = ps.map((x) => Math.floor(N / x));
    return {
      prompt: t`How many of the numbers ${math`${1}, ${2}, \ldots, ${N}`} are divisible by none of ${listOf([...ps])}?`,
      answer: { kind: 'exact', expected: String(count(p)) },
      solution: [
        t`Let ${math`A_{d}`} be the multiples of ${math`d`} up to ${N}; it has ${math`\lfloor ${N}/d \rfloor`} elements, and the intersection of the ${math`A_{p}`} over a set of primes is the multiples of their product.`,
        t`Inclusion-exclusion over the ${ps.length} primes: ${math`${N} - (${computedTex(singles.join(' + '))}) + \cdots = ${count(p)}`}, alternating over pairs, triples${ps.length > 3 ? t`, and the quadruple` : t``}.`,
      ],
    };
  },
  solve: ({ N, ps }) => String(Array.from({ length: N }, (_, i) => i + 1).filter((x) => ps.every((p) => x % p !== 0)).length),
  misconceptions: (p): Misconception[] => {
    const [a, b, c] = copMis(p);
    return [
      { response: a as string, why: t`Subtracting the multiples of each prime removes numbers divisible by two of them twice. Add the pairs back.` },
      { response: b as string, why: t`Adding back the pairs counts the multiples of all three again: subtract the triple intersections too.` },
      { response: c as string, why: t`${math`N\prod(${1} - ${1}/p)`} is only approximately right, because ${math`\lfloor N/d \rfloor`} is not exactly ${math`N/d`}. Count exactly.` },
    ];
  },
});

// ---------------------------------------------------------------- the committee

interface ComP { n: number; r: number; m: number }
const comVal = ({ n, r, m }: ComP): Rational => q(choose(n - m, r - m), choose(n, r));
const comMis = ({ n, r, m }: ComP): string[] => [str(pow(q(r, n), m)), str(q(r, n)), str(q(choose(n - m, r), choose(n, r)))];

const committee = generator<ComP>({
  id: 'committee',
  skill: 'Find the probability that m given people are all on a random committee of r from n, as in Example Sheet 1 Q7.',
  params: (rng) => {
    for (;;) {
      const n = int(rng, 6, 12);
      const r = int(rng, 3, n - 2);
      const P: ComP = { n, r, m: int(rng, 2, Math.min(3, r)) };
      if (distinctFrom(str(comVal(P)), comMis(P)) >= 2) return P;
    }
  },
  sane: ({ n, r, m }) => (m <= r && r < n ? null : 'out of range'),
  problem: (p) => {
    const { n, r, m } = p;
    const ie = Array.from({ length: m + 1 }, (_, j) => (-1) ** j * choose(m, j) * choose(n - j, r));
    return {
      prompt: t`A committee of ${r} is chosen at random from ${n} people. What is the probability that ${m} given people are all on it?`,
      answer: { kind: 'exact', expected: str(comVal(p)) },
      solution: [
        t`Directly: the committees containing all ${m} choose their other ${r - m} members from the other ${n - m} people: ${math`\frac{\binom{${n - m}}{${r - m}}}{\binom{${n}}{${r}}} = \frac{${choose(n - m, r - m)}}{${choose(n, r)}} = ${comVal(p)}`}.`,
        t`By inclusion-exclusion over "person ${math`i`} is absent": ${math`\frac{${1}}{${choose(n, r)}}\sum_{j = ${0}}^{${m}} (-${1})^{j}\binom{${m}}{j}\binom{${n} - j}{${r}} = \frac{${computedTex(ie.map((v, j) => (j === 0 ? String(v) : `${v < 0 ? '-' : '+'} ${Math.abs(v)}`)).join(' '))}}{${choose(n, r)}}`}, the same.`,
      ],
    };
  },
  solve: ({ n, r, m }) => {
    // List every committee as a bit mask.
    let [good, all] = [0, 0];
    for (let s = 0; s < 1 << n; s++) {
      let bits = 0;
      for (let i = 0; i < n; i++) if ((s >> i) & 1) bits++;
      if (bits !== r) continue;
      all++;
      if (Array.from({ length: m }, (_, i) => (s >> i) & 1).every((b) => b === 1)) good++;
    }
    return str(q(good, all));
  },
  misconceptions: (p): Misconception[] => [
    { response: str(pow(q(p.r, p.n), p.m)), why: t`The ${p.m} people are not on the committee independently: once one is on, there are fewer places left.` },
    { response: str(q(p.r, p.n)), why: t`That is the chance for one given person. All ${p.m} must be on it.` },
    { response: str(q(choose(p.n - p.m, p.r), choose(p.n, p.r))), why: t`That is the chance that none of them is on it.` },
  ],
  trial: ({ n, r, m }, rng) => shuffle(n, rng).slice(0, r).filter((x) => x < m).length === m,
});

// ---------------------------------------------------------------- Cambridge problems

const [N7, R7, M7] = [6, 3, 2];
const ie7 = Array.from({ length: M7 + 1 }, (_, j) => (-1) ** j * choose(M7, j) * choose(N7 - j, R7));
const q7b = auto({
  id: 'ia-q7-b-numbers',
  source: cite(S1, 'Q7(b)', true),
  title: t`The committee by inclusion-exclusion`,
  prompt: t`A committee of ${R7} is chosen at random from ${N7} people. Using inclusion-exclusion over the events "person ${math`i`} is not on the committee", find the probability that ${M7} given people are both on it.`,
  answer: { kind: 'exact', expected: str(comVal({ n: N7, r: R7, m: M7 })) },
  solution: [
    t`Let ${math`B_{i}`} be "given person ${math`i`} is absent", ${math`i = ${1}, ${2}`}. ${math`\mathbb{P}(B_{i}) = \binom{${N7 - 1}}{${R7}} / \binom{${N7}}{${R7}} = ${q(choose(N7 - 1, R7), choose(N7, R7))}`} and ${math`\mathbb{P}(B_{${1}} \cap B_{${2}}) = \binom{${N7 - 2}}{${R7}} / \binom{${N7}}{${R7}} = ${q(choose(N7 - 2, R7), choose(N7, R7))}`}.`,
    t`${math`\mathbb{P}(\text{both on}) = ${1} - \mathbb{P}(B_{${1}} \cup B_{${2}}) = ${1} - ${2} \times ${q(choose(N7 - 1, R7), choose(N7, R7))} + ${q(choose(N7 - 2, R7), choose(N7, R7))} = ${comVal({ n: N7, r: R7, m: M7 })}`}, as directly: ${math`\binom{${N7 - M7}}{${R7 - M7}} / \binom{${N7}}{${R7}} = ${comVal({ n: N7, r: R7, m: M7 })}`}.`,
  ],
  reference: str(comVal({ n: N7, r: R7, m: M7 })),
  verify: () => same('the inclusion-exclusion sum and the direct count', str(q(ie7.reduce((a, b) => a + b, 0), choose(N7, R7))), str(comVal({ n: N7, r: R7, m: M7 }))),
  misconceptions: [{ response: str(sub(q(1), mul(q(2), q(choose(N7 - 1, R7), choose(N7, R7))))), why: t`Subtracting both ${math`\mathbb{P}(B_{i})`} removes the committees missing both people twice: add ${math`\mathbb{P}(B_{${1}} \cap B_{${2}})`} back.` }],
});

const [NI, RI, MI] = [10, 6, 3];
const identityRhs = Array.from({ length: MI + 1 }, (_, j) => (-1) ** j * choose(MI, j) * choose(NI - j, RI));
const q7id = auto({
  id: 'ia-q7-identity',
  source: cite(S1, 'Q7, the identity', true),
  title: t`The identity with numbers`,
  prompt: t`Q${7} deduces ${math`\binom{n - m}{r - m} = \sum_{j = ${0}}^{m} (-${1})^{j}\binom{m}{j}\binom{n - j}{r}`}. For ${math`n = ${NI}`}, ${math`r = ${RI}`}, ${math`m = ${MI}`}, evaluate the right-hand side.`,
  answer: { kind: 'exact', expected: String(identityRhs.reduce((a, b) => a + b, 0)) },
  solution: [
    t`The terms are ${math`${computedTex(identityRhs.map((v, j) => (j === 0 ? String(v) : `${v < 0 ? '-' : '+'} ${Math.abs(v)}`)).join(' '))}`}, which add to ${identityRhs.reduce((a, b) => a + b, 0)}.`,
    t`The left side is ${math`\binom{${NI - MI}}{${RI - MI}} = ${choose(NI - MI, RI - MI)}`}: the two counts of committees containing the ${MI} given people agree.`,
  ],
  reference: String(identityRhs.reduce((a, b) => a + b, 0)),
  verify: () => same('the left side', identityRhs.reduce((a, b) => a + b, 0), choose(NI - MI, RI - MI)),
  misconceptions: [{ response: String(choose(NI, RI)), why: t`That is only the ${math`j = ${0}`} term. Include the alternating terms.` }],
});

const q7proof = supervision({
  id: 'ia-q7',
  source: cite(S1, 'Q7'),
  title: t`Two counts of one event`,
  prompt: t`A committee of size ${math`r`} is chosen at random from ${mn} people. Calculate the probability that ${math`m`} given people will all be on the committee (a) directly, (b) using the inclusion-exclusion formula. Deduce that ${math`\binom{n - m}{r - m} = \sum_{j = ${0}}^{m} (-${1})^{j}\binom{m}{j}\binom{n - j}{r}`}.`,
  writeUp: 'proof',
});
const ieProof = supervision({
  id: 'schedule-inclusion-exclusion',
  source: cite('tripos-schedules', 'IA Probability, Axiomatic approach: "Inclusion-exclusion formula"', true),
  title: t`Proving the formula`,
  prompt: t`Prove the inclusion-exclusion formula ${math`\mathbb{P}\left(\bigcup_{i = ${1}}^{n} A_{i}\right) = \sum_{k = ${1}}^{n} (-${1})^{k + ${1}} \sum_{i_{${1}} < \cdots < i_{k}} \mathbb{P}(A_{i_{${1}}} \cap \cdots \cap A_{i_{k}})`} by induction on ${mn}, from the two-event addition rule. Then give a second proof for a finite equally likely space: an outcome in exactly ${math`t \ge ${1}`} of the events is counted ${math`\sum_{k \ge ${1}} (-${1})^{k + ${1}}\binom{t}{k}`} times; use the binomial theorem to show this is ${1}.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const claims: ProbabilityClaim[] = [
  { what: 'four letters, none in its own envelope', exact: derange(4), trial: (rng) => shuffle(4, rng).every((v, i) => v !== i) },
  { what: 'two letters, none in its own envelope', exact: derange(2), trial: (rng) => shuffle(2, rng).every((v, i) => v !== i) },
];

const D4 = Array.from({ length: 5 }, (_, k) => k);
const bonf4 = add(sub(q(1), q(1)), q(1, 2));

export const inclusionExclusion: TopicContent = {
  topicId: 'prob.inclusion-exclusion',
  goal: t`State, prove, and apply the inclusion-exclusion formula for ${mn} events, with alternating sums over all intersections.`,
  objective: t`State and prove inclusion-exclusion for ${mn} events, and use it when all overlaps of a size look alike.`,
  why: t`It turns any "at least one" question into sums over overlaps: the key to matching and derangement problems.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Letters in the wrong envelopes` },
    { kind: 'hook', text: t`A secretary puts ${mn} letters into their ${mn} addressed envelopes completely at random. What is the chance that not one letter reaches the right person? With ${4} letters it is ${derange(4)}; with ${10} letters it is about ${Number(toFloat(derange(10)).toFixed(4))}; with a thousand letters it is still about ${Number(Math.exp(-1).toFixed(4))}. Why does the answer settle down instead of going to ${0} or ${1}?` },
    { kind: 'narrative', text: t`The natural events here overlap in complicated ways. Let ${math`A_{i}`} be the event "letter ${math`i`} is in its own envelope". We want the chance that none of them happens, which is ${math`${1} - \mathbb{P}(A_{${1}} \cup \cdots \cup A_{n})`}. For two or three events you already know how to handle a union: add the singles, subtract the pairs, add back the triple. We need the same idea for any number of events.` },

    { kind: 'section', title: t`The formula` },
    { kind: 'narrative', text: t`First, a compact way to write "add up over all groups of ${math`k`} events". Write ${math`i_{${1}} < i_{${2}} < \cdots < i_{k}`} for a choice of ${math`k`} different indices listed in increasing order, so each group is counted once. (With ${math`n = ${4}`} and ${math`k = ${2}`}, the choices are ${math`\{${1},${2}\}, \{${1},${3}\}, \{${1},${4}\}, \{${2},${3}\}, \{${2},${4}\}, \{${3},${4}\}`}: ${choose(4, 2)} of them.)` },
    { kind: 'definition', name: t`The ${math`k`}th intersection sum`, formal: t`For events ${math`A_{${1}}, \ldots, A_{n}`} and ${math`${1} \le k \le n`}, let ${dmath`S_{k} = \sum_{i_{${1}} < \cdots < i_{k}} \mathbb{P}(A_{i_{${1}}} \cap \cdots \cap A_{i_{k}}),`} the sum over all ${math`\binom{n}{k}`} choices of ${math`k`} of the events.`, plain: t`${math`S_{${1}}`} adds the probabilities of the single events, ${math`S_{${2}}`} adds the probabilities of every pair happening together, and so on, up to ${math`S_{n}`}, the chance that all of them happen.` },
    { kind: 'theorem', name: t`Inclusion-exclusion`, statement: t`For any events ${math`A_{${1}}, \ldots, A_{n}`} in a probability space, ${dmath`\mathbb{P}\left(\bigcup_{i = ${1}}^{n} A_{i}\right) = \sum_{k = ${1}}^{n} (-${1})^{k + ${1}} S_{k} = S_{${1}} - S_{${2}} + S_{${3}} - \cdots + (-${1})^{n + ${1}} S_{n}.`}` },
    { kind: 'p', text: t`In plain words: this is the [[inclusion-exclusion-formula|inclusion-exclusion formula]]. Add the singles, subtract the pairs, add the triples, subtract the quadruples, and keep alternating. The factor ${math`(-${1})^{k + ${1}}`} is just a compact way to say "plus when ${math`k`} is odd, minus when ${math`k`} is even".` },

    { kind: 'section', title: t`Why it is true` },
    { kind: 'narrative', text: t`Here is the idea in one line: every outcome in the union gets counted exactly once, and the binomial theorem is what makes the count come to ${1}. We prove it when the sample space ${math`\Omega`} is finite or countable, so that the probability of an event is the sum of the probabilities of the outcomes in it: ${math`\mathbb{P}(E) = \sum_{\omega \in E} \mathbb{P}(\{\omega\})`}. (A proof by induction on ${mn}, from the two-event rule, covers every probability space; it is set as a problem below.)` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Pick one outcome`, text: t`Fix an outcome ${math`\omega`} that lies in exactly ${math`t`} of the events, where ${math`${1} \le t \le n`}.`, plain: t`Say ${math`\omega`} is in ${math`A_{${2}}`}, ${math`A_{${5}}`}, and ${math`A_{${7}}`} and no others: then ${math`t = ${3}`}.` },
        { label: t`Count its appearances in ${math`S_{k}`}`, text: t`${math`\omega`} lies in ${math`A_{i_{${1}}} \cap \cdots \cap A_{i_{k}}`} exactly when all ${math`k`} chosen events are among its ${math`t`} events. There are ${math`\binom{t}{k}`} such choices, so ${math`\omega`} contributes ${math`\binom{t}{k}\mathbb{P}(\{\omega\})`} to ${math`S_{k}`}.`, plain: t`In the example, ${math`\omega`} appears in ${choose(3, 2)} of the pair intersections and in ${choose(3, 3)} triple. For ${math`k > t`} there are no such choices, and ${math`\binom{t}{k} = ${0}`}.` },
        { label: t`Add up the signs`, text: t`So the right-hand side counts ${math`\omega`} with total weight`, eq: [dmath`\mathbb{P}(\{\omega\}) \sum_{k = ${1}}^{t} (-${1})^{k + ${1}} \binom{t}{k}.`] },
        {
          label: t`Use the binomial theorem`,
          text: t`Expand ${math`(${1} - ${1})^{t}`}:`,
          eq: [dmath`${0} = (${1} - ${1})^{t} = \sum_{k = ${0}}^{t} \binom{t}{k} (-${1})^{k} = ${1} - \sum_{k = ${1}}^{t} (-${1})^{k + ${1}} \binom{t}{k}.`],
          plain: t`So the alternating sum is exactly ${1}, and ${math`\omega`} is counted with weight ${math`\mathbb{P}(\{\omega\})`}, once.`,
          why: { q: t`Why does ${math`t \ge ${1}`} matter here?`, a: t`For ${math`t = ${0}`}, ${math`(${1} - ${1})^{${0}}`} is ${1}, not ${0}. That case is an outcome in none of the events, handled in the next step. The middle step pulls out the ${math`k = ${0}`} term, which is ${math`\binom{t}{${0}} = ${1}`}, and writes ${math`(-${1})^{k} = -(-${1})^{k + ${1}}`}.` },
        },
        { label: t`Add over all outcomes`, text: t`An outcome in none of the events appears in no ${math`S_{k}`}, and is not in the union. Summing over all ${math`\omega`}, the right-hand side is ${math`\sum_{\omega \in \bigcup A_{i}} \mathbb{P}(\{\omega\}) = \mathbb{P}(\bigcup A_{i})`}.`, plain: t`Every outcome in the union is counted once, every other outcome not at all: that is exactly the probability of the union.` },
      ],
    },
    quickCheck({
      prompt: t`An outcome lies in exactly ${4} of the events. How many times is it added in ${math`S_{${1}}`} and ${math`S_{${3}}`} together, and how many times subtracted in ${math`S_{${2}}`} and ${math`S_{${4}}`} together? Give the net count.`,
      answer: { kind: 'exact', expected: String(choose(4, 1) - choose(4, 2) + choose(4, 3) - choose(4, 4)) },
      reference: String(choose(4, 1) - choose(4, 2) + choose(4, 3) - choose(4, 4)),
      why: t`Added ${math`\binom{${4}}{${1}} + \binom{${4}}{${3}} = ${choose(4, 1) + choose(4, 3)}`} times, subtracted ${math`\binom{${4}}{${2}} + \binom{${4}}{${4}} = ${choose(4, 2) + choose(4, 4)}`} times: net ${choose(4, 1) - choose(4, 2) + choose(4, 3) - choose(4, 4)}.`,
    }),

    { kind: 'section', title: t`When every overlap looks alike` },
    { kind: 'narrative', text: t`The formula has ${math`${2}^{n} - ${1}`} terms, which sounds hopeless. It becomes easy when every intersection of ${math`k`} events has the same probability, say ${math`p_{k}`}. Then ${math`S_{k}`} is ${math`\binom{n}{k}`} copies of one number: ${math`S_{k} = \binom{n}{k} p_{k}`}. The letters are exactly like this.` },
    {
      kind: 'steps',
      steps: [
        { label: t`One group of ${math`k`} letters`, text: t`Letters ${math`i_{${1}}, \ldots, i_{k}`} all go to their own envelopes when the other ${math`n - k`} letters fill the other ${math`n - k`} envelopes in any order. Of the ${math`n!`} equally likely arrangements, ${math`(n - k)!`} do this, so`, eq: [dmath`\mathbb{P}(A_{i_{${1}}} \cap \cdots \cap A_{i_{k}}) = \frac{(n - k)!}{n!}.`], why: { q: t`What is ${math`n!`}?`, a: t`${mn} factorial, ${math`n \times (n - ${1}) \times \cdots \times ${1}`}: the number of ways to put ${mn} letters into ${mn} envelopes, one each. With ${4} letters it is ${factorial(4)}.` } },
        { label: t`The ${math`k`}th sum`, text: t`There are ${math`\binom{n}{k} = \frac{n!}{k!\,(n - k)!}`} groups, so`, eq: [dmath`S_{k} = \frac{n!}{k!\,(n - k)!} \cdot \frac{(n - k)!}{n!} = \frac{${1}}{k!}.`], plain: t`The ${math`n!`} cancels and the ${math`(n - k)!`} cancels, leaving ${math`${1}/k!`}.` },
        { label: t`Inclusion-exclusion`, text: t`${math`\mathbb{P}(\text{some letter in place}) = \sum_{k = ${1}}^{n} (-${1})^{k + ${1}}/k!`}, so`, eq: [dmath`\mathbb{P}(\text{no letter in place}) = ${1} - \sum_{k = ${1}}^{n} \frac{(-${1})^{k + ${1}}}{k!} = \sum_{k = ${0}}^{n} \frac{(-${1})^{k}}{k!}.`], why: { q: t`Where did the ${1} go?`, a: t`It became the ${math`k = ${0}`} term of the last sum: ${math`(-${1})^{${0}}/${0}! = ${1}`}, since ${math`${0}! = ${1}`}. Moving the minus sign inside turns ${math`(-${1})^{k + ${1}}`} into ${math`(-${1})^{k}`}.` } },
        { label: t`Four letters`, text: t`With ${math`n = ${4}`}:`, eq: [computedTex(`${D4.map((k) => (k === 0 ? String(factorial(0)) : `${k % 2 === 1 ? '-' : '+'} \\frac{${1}}{${factorial(k)}}`)).join(' ')} = \\frac{${derange(4).num}}{${derange(4).den}}`)] },
      ],
    },
    { kind: 'p', text: t`Such an arrangement, with nothing in its own place, is called a [[derangement|derangement]]. The sum ${math`\sum_{k = ${0}}^{n} (-${1})^{k}/k!`} is the start of the series ${math`e^{-${1}} = \sum_{k = ${0}}^{\infty} (-${1})^{k}/k!`}, so the chance tends to ${math`e^{-${1}}`}, about ${Number(Math.exp(-1).toFixed(4))}. That answers the opening puzzle. Once ${mn} is ${10} or more, the terms still to come change the sum by less than ${math`${1}/${11}!`}, far too little to see.` },
    checkFrom(derangements, { n: 5, ctx: 'hats' }, t`${math`${1} - ${1} + \frac{${1}}{${2}} - \frac{${1}}{${6}} + \frac{${1}}{${24}} - \frac{${1}}{${120}} = ${derange(5)}`}.`),

    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`Each letter misses its envelope with probability ${math`(n - ${1})/n`}, so the chance that all miss is ${math`((n - ${1})/n)^{n}`}.`, counterexample: t`That treats the events as independent, and they are not. With ${2} letters, either both are right or both are wrong, each with chance ${q(1, 2)}; the formula would give ${math`(${1}/${2})^{${2}} = ${q(1, 4)}`}.` },
    { kind: 'pitfall', claim: t`Stopping after the pairs is close enough to be the answer.`, counterexample: t`For ${4} letters, ${math`${1} - S_{${1}} + S_{${2}} = ${1} - ${1} + \frac{${1}}{${2}} = ${bonf4}`}, but the true chance is ${derange(4)}. A truncated sum is only a bound: in the sum for the chance of none, stopping after an added term gives too much, and stopping after a subtracted term too little.` },
    { kind: 'narrative', text: t`The Cambridge question below, Example Sheet ${1} question ${7}, finds one probability in two ways: once by a direct count, once by inclusion-exclusion over "person ${math`i`} is not on the committee". Setting the two answers equal proves a binomial identity for free.` },
    { kind: 'takeaway', text: t`Inclusion-exclusion alternates over overlaps of every size, and when all ${math`k`}-fold overlaps look alike, the ${math`k`}th sum is ${math`\binom{n}{k}`} times one of them.` },
  ],
  examples: [
    { ...workedCambridge(q7b), examiner: t`The examiner looks for the events defined, both intersection probabilities computed, and the result checked against the direct count.` },
    worked(derangements, { n: 4, ctx: 'letters' }, t`Four letters, no match`),
    worked(divisibleByNone, { N: 500, ps: [2, 3, 5] }, t`Numbers up to ${500} coprime to ${30}`),
  ],
  generators: [derangements, divisibleByNone, committee],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['inclusion-exclusion-formula', 'derangement'],
  claims,
  cambridge: [q7id, q7proof, ieProof],
  // The sheet's question itself; evaluating the identity with numbers is arithmetic, not a test of the method.
  gate: ['ia-q7'],
  recall: [
    { front: t`State inclusion-exclusion for ${mn} events.`, back: t`${math`\mathbb{P}(\bigcup_{i} A_{i}) = \sum_{k = ${1}}^{n} (-${1})^{k + ${1}} S_{k}`}, where ${math`S_{k}`} sums ${math`\mathbb{P}`} of every intersection of ${math`k`} of the events.` },
    { front: t`Why is an outcome in exactly ${math`t \ge ${1}`} of the events counted once?`, back: t`It is counted ${math`\sum_{k \ge ${1}} (-${1})^{k + ${1}}\binom{t}{k}`} times, and ${math`(${1} - ${1})^{t} = ${0}`} makes that ${1}.` },
    { front: t`The chance that a random arrangement of ${mn} items is a derangement.`, back: t`${math`\sum_{k = ${0}}^{n} (-${1})^{k}/k!`}, which tends to ${math`e^{-${1}}`}.` },
  ],
  proofOrder: [{
    title: t`Inclusion-exclusion by counting each outcome`,
    steps: [
      t`Fix an outcome in exactly ${math`t \ge ${1}`} of the events.`,
      t`It lies in ${math`\binom{t}{k}`} of the ${math`k`}-fold intersections.`,
      t`So the right-hand side counts it ${math`\sum_{k = ${1}}^{t} (-${1})^{k + ${1}} \binom{t}{k}`} times.`,
      t`By the binomial theorem, ${math`(${1} - ${1})^{t} = ${0}`} makes that count ${1}.`,
      t`Outcomes in no event count ${0} times, so the sum is the probability of the union.`,
    ],
  }],
};
