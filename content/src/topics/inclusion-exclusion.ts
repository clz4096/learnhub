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
import { add, factorial, int, mul, pick, q, str, sub, type Rational } from '../math';
import { choose } from '../numbers';
import { generator, type Misconception } from '../problem';
import { computedTex, listOf, math, t } from '../rich';
import { worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

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
];

export const inclusionExclusion: TopicContent = {
  topicId: 'prob.inclusion-exclusion',
  goal: t`State, prove, and apply the inclusion-exclusion formula for ${mn} events, with alternating sums over all intersections.`,
  lesson: [
    { kind: 'rule', text: t`[[inclusion-exclusion-formula|Inclusion-exclusion]] for ${mn} events: ${math`\mathbb{P}\left(\bigcup_{i = ${1}}^{n} A_{i}\right) = \sum_{i} \mathbb{P}(A_{i}) - \sum_{i < j} \mathbb{P}(A_{i} \cap A_{j}) + \sum_{i < j < k} \mathbb{P}(A_{i} \cap A_{j} \cap A_{k}) - \cdots + (-${1})^{n + ${1}}\mathbb{P}(A_{${1}} \cap \cdots \cap A_{n})`}.` },
    { kind: 'p', text: t`It is proved by induction from the two-event rule, applied to ${math`(A_{${1}} \cup \cdots \cup A_{n}) \cup A_{n + ${1}}`}. On a finite equally likely space there is a counting proof: an outcome in exactly ${math`t`} of the events is counted ${math`\binom{t}{${1}} - \binom{t}{${2}} + \cdots = ${1} - (${1} - ${1})^{t} = ${1}`} time, by the binomial theorem.` },
    { kind: 'p', text: t`It is most useful when every intersection of ${math`k`} events has the same probability: then the ${math`k`}th sum is ${math`\binom{n}{k}`} times one term. ${mn} letters in random envelopes with [[derangement|none in its own]]: each set of ${math`k`} letters is all in place with probability ${math`(n - k)!/n!`}, so the answer is ${math`\sum_{k = ${0}}^{n} (-${1})^{k}/k!`}, which for ${4} letters is ${derange(4)} and tends to ${math`e^{-${1}}`}.` },
    { kind: 'p', text: t`Example Sheet ${1} Q${7} computes one probability two ways. The chance that ${math`m`} given people are on a random committee of ${math`r`} from ${mn} is ${math`\binom{n - m}{r - m}/\binom{n}{r}`} directly, and an alternating sum by inclusion-exclusion over "person ${math`i`} is absent"; equating them gives a binomial identity for free.` },
  ],
  examples: [
    workedCambridge(q7b),
    worked(derangements, { n: 4, ctx: 'letters' }, t`Four letters, no match`),
    worked(divisibleByNone, { N: 500, ps: [2, 3, 5] }, t`Numbers up to ${500} coprime to ${30}`),
  ],
  generators: [derangements, divisibleByNone, committee],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['inclusion-exclusion-formula', 'derangement'],
  claims,
  cambridge: [q7id, q7proof, ieProof],
  gate: ['ia-q7-identity', 'ia-q7'],
};
