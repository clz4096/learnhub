/**
 * prob.total-probability: for a partition B_1, B_2, ... of Ω, P(A) = Σ P(A | B_i) P(B_i).
 * From IA Probability Example Sheet 1 Q8(a) (exam classes and misreading the rubric: the
 * overall class probabilities are a weighted average, solved backwards for the readers)
 * and Q9 (Labour and Conservative members: the chance of voting the same way twice). Q8(b)
 * and the rest of Q9 are Bayes's formula, in prob.bayes-formula. The sheet has no official
 * solutions; the answers are checked by exact arithmetic over the cases.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, toFloat, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { math, t } from '../rich';
import { worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const S1 = 'ia-prob-sheet-1' as const;
const mA = math`A`;
const distinctFrom = (right: string, xs: readonly string[]): number => new Set(xs.filter((x) => x !== right)).size;
const chance = (r: Rational, rng: Rng): boolean => rng() < toFloat(r);

// ---------------------------------------------------------------- two urns

interface UrnP { a: Rational; r1: number; n1: number; r2: number; n2: number }
const urnVal = (p: UrnP): Rational => add(mul(p.a, q(p.r1, p.n1)), mul(sub(q(1), p.a), q(p.r2, p.n2)));
const urnMis = (p: UrnP): string[] => [str(mul(q(1, 2), add(q(p.r1, p.n1), q(p.r2, p.n2)))), str(q(p.r1 + p.r2, p.n1 + p.n2)), str(mul(p.a, q(p.r1, p.n1)))];
const PICK: readonly Rational[] = [q(1, 2), q(1, 6), q(1, 3), q(2, 3)];

const twoUrns = generator<UrnP>({
  id: 'two-urns',
  skill: 'Find the chance of red when the urn is chosen at random: weight each urn\'s chance by the chance of choosing it.',
  params: (rng) => {
    for (;;) {
      const n1 = int(rng, 3, 9);
      const n2 = int(rng, 3, 9);
      const p: UrnP = { a: pick(rng, PICK), n1, n2, r1: int(rng, 1, n1 - 1), r2: int(rng, 1, n2 - 1) };
      if (p.r1 * p.n2 !== p.r2 * p.n1 && distinctFrom(str(urnVal(p)), urnMis(p)) >= 2) return p;
    }
  },
  sane: ({ r1, n1, r2, n2 }) => (r1 < n1 && r2 < n2 ? null : 'out of range'),
  problem: (p) => {
    const how = p.a.den === 2n ? t`a fair coin lands heads` : p.a.den === 6n ? t`a fair die shows a six` : p.a.num === 1n ? t`a fair die shows ${1} or ${2}` : t`a fair die shows more than ${2}`;
    return {
      prompt: t`Urn ${1} holds ${p.r1} red and ${p.n1 - p.r1} blue balls; urn ${2} holds ${p.r2} red and ${p.n2 - p.r2} blue. Urn ${1} is used if ${how}, otherwise urn ${2}, and a ball is drawn from it at random. What is the probability that it is red?`,
      answer: { kind: 'exact', expected: str(urnVal(p)) },
      solution: [
        t`The urn chosen is a partition: urn ${1} with probability ${p.a}, urn ${2} with probability ${sub(q(1), p.a)}.`,
        t`Law of total probability: ${math`\mathbb{P}(R) = \mathbb{P}(R \mid U_{${1}})\mathbb{P}(U_{${1}}) + \mathbb{P}(R \mid U_{${2}})\mathbb{P}(U_{${2}}) = ${q(p.r1, p.n1)} \times ${p.a} + ${q(p.r2, p.n2)} \times ${sub(q(1), p.a)} = ${urnVal(p)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Count over a population: every pairing of a die face (or coin side) with a ball.
    const sides = Number(p.a.den);
    const hits = Number(p.a.num);
    let [good, all] = [0, 0];
    for (let s = 0; s < sides; s++) for (let b = 0; b < p.n1 * p.n2; b++) {
      all++;
      const red = s < hits ? b % p.n1 < p.r1 : b % p.n2 < p.r2;
      if (red) good++;
    }
    return str(q(good, all));
  },
  misconceptions: (p): Misconception[] => {
    const [a, b, c] = urnMis(p);
    return [
      { response: a as string, why: t`The urns are not equally likely to be used: weight each by its probability, ${p.a} and ${sub(q(1), p.a)}.` },
      { response: b as string, why: t`Pooling the balls treats every ball as equally likely, but a ball in the smaller urn is more likely to be drawn. Condition on the urn.` },
      { response: c as string, why: t`That is ${math`\mathbb{P}(R \cap U_{${1}})`}. Add the red draws from urn ${2}.` },
    ];
  },
  trial: (p, rng) => (chance(p.a, rng) ? rng() < p.r1 / p.n1 : rng() < p.r2 / p.n2),
});

// ---------------------------------------------------------------- three machines

interface MachP { s: readonly number[]; d: readonly number[] }
const SHARES: readonly (readonly number[])[] = [[50, 30, 20], [40, 35, 25], [60, 25, 15], [45, 45, 10], [20, 30, 50]];
const machVal = ({ s, d }: MachP): Rational => s.reduce((acc, x, i) => add(acc, mul(q(x, 100), q(d[i] as number, 100))), q(0));
const machMis = (p: MachP): string[] => [str(q(p.d.reduce((a, b) => a + b, 0), 300)), str(q(p.d.reduce((a, b) => a + b, 0), 100)), str(q(Math.max(...p.d), 100))];

const threeMachines = generator<MachP>({
  id: 'three-machines',
  skill: 'Apply the law of total probability over a partition into three parts: machines with different shares of output and defect rates.',
  params: (rng) => {
    for (;;) {
      const p: MachP = { s: pick(rng, SHARES), d: [int(rng, 1, 8), int(rng, 1, 8), int(rng, 1, 8)] };
      if (new Set(p.d).size === 3 && distinctFrom(str(machVal(p)), machMis(p)) >= 2) return p;
    }
  },
  sane: ({ s }) => (s.reduce((a, b) => a + b, 0) === 100 ? null : 'out of range'),
  problem: ({ s, d }) => ({
    prompt: t`Three machines make ${s[0] as number}%, ${s[1] as number}%, and ${s[2] as number}% of a factory's items, and ${d[0] as number}%, ${d[1] as number}%, and ${d[2] as number}% of their items, respectively, are faulty. What is the probability that an item chosen at random is faulty?`,
    answer: { kind: 'exact', expected: str(machVal({ s, d })) },
    solution: [
      t`The machine that made the item is a partition ${math`M_{${1}}, M_{${2}}, M_{${3}}`}. Law of total probability: ${math`\mathbb{P}(F) = \sum_{i} \mathbb{P}(F \mid M_{i})\,\mathbb{P}(M_{i})`}.`,
      t`${math`${q(d[0] as number, 100)} \times ${q(s[0] as number, 100)} + ${q(d[1] as number, 100)} \times ${q(s[1] as number, 100)} + ${q(d[2] as number, 100)} \times ${q(s[2] as number, 100)} = ${machVal({ s, d })}`}.`,
    ],
  }),
  solve: ({ s, d }) => {
    // A batch of 10,000 items split by machine, counting the faulty ones.
    let faulty = 0;
    s.forEach((share, i) => { faulty += (share * 100 * (d[i] as number)) / 100; });
    return str(q(faulty, 10000));
  },
  misconceptions: (p): Misconception[] => {
    const [a, b, c] = machMis(p);
    return [
      { response: a as string, why: t`The machines make different shares of the items: weight each fault rate by its share.` },
      { response: b as string, why: t`Adding the fault rates ignores how many items each machine makes. Multiply each by its share first.` },
      { response: c as string, why: t`That is the worst machine's rate. Average the rates, weighted by the shares.` },
    ];
  },
  trial: ({ s, d }, rng) => { const u = rng() * 100; const i = u < (s[0] as number) ? 0 : u < (s[0] as number) + (s[1] as number) ? 1 : 2; return rng() < (d[i] as number) / 100; },
});

// ---------------------------------------------------------------- solving backwards

interface BackP { x: Rational; b: Rational; y: Rational }
const backVal = ({ x, b, y }: BackP): Rational => div(sub(x, mul(b, y)), sub(q(1), b));
const backMis = (p: BackP): string[] => [str(p.x), str(sub(p.x, mul(p.b, p.y))), str(sub(mul(q(2), p.x), p.y))];

const solveBackwards = generator<BackP>({
  id: 'solve-backwards',
  skill: 'Solve the law of total probability for an unknown conditional probability, as Q8(a) does for the candidates who read the rubric.',
  params: (rng) => {
    for (;;) {
      const b = pick(rng, [q(1, 4), q(1, 3), q(2, 5), q(1, 2), q(2, 3), q(3, 4)]);
      const y = pick(rng, [q(1, 10), q(1, 5), q(3, 10), q(2, 5), q(1, 2), q(3, 5)]);
      const z = pick(rng, [q(1, 10), q(1, 4), q(1, 3), q(2, 5), q(1, 2), q(7, 10)]);
      const x = add(mul(b, y), mul(sub(q(1), b), z));
      const p: BackP = { x, b, y };
      if (str(y) !== str(z) && distinctFrom(str(z), backMis(p)) >= 2) return p;
    }
  },
  sane: ({ x, b, y }) => { const z = backVal({ x, b, y }); return z.num >= 0n && z.num <= z.den ? null : 'out of range'; },
  problem: (p) => ({
    prompt: t`Event ${math`B`} has ${math`\mathbb{P}(B) = ${p.b}`}. Overall ${math`\mathbb{P}(A) = ${p.x}`}, and ${math`\mathbb{P}(A \mid B) = ${p.y}`}. Find ${math`\mathbb{P}(A \mid B^{c})`}.`,
    answer: { kind: 'exact', expected: str(backVal(p)) },
    solution: [
      t`Total probability over ${math`B`}, ${math`B^{c}`}: ${math`\mathbb{P}(A) = \mathbb{P}(A \mid B)\mathbb{P}(B) + \mathbb{P}(A \mid B^{c})\mathbb{P}(B^{c})`}, that is, ${math`${p.x} = ${p.y} \times ${p.b} + z \times ${sub(q(1), p.b)}`}.`,
      t`So ${math`z = \frac{${p.x} - ${mul(p.y, p.b)}}{${sub(q(1), p.b)}} = ${backVal(p)}`}.`,
    ],
  }),
  solve: (p) => {
    // Search fractions z = k/600 for the one that makes the total come out.
    for (let k = 0; k <= 600; k++) { const z = q(k, 600); if (str(add(mul(p.y, p.b), mul(z, sub(q(1), p.b)))) === str(p.x)) return str(z); }
    return 'none';
  },
  misconceptions: (p): Misconception[] => [
    { response: str(p.x), why: t`${math`\mathbb{P}(A)`} is the average over both parts. The part outside ${math`B`} must make up the difference from ${math`\mathbb{P}(A \mid B)`}.` },
    { response: str(sub(p.x, mul(p.b, p.y))), why: t`That is ${math`\mathbb{P}(A \cap B^{c})`}. Divide by ${math`\mathbb{P}(B^{c}) = ${sub(q(1), p.b)}`} to condition on ${math`B^{c}`}.` },
    { response: str(sub(mul(q(2), p.x), p.y)), why: t`That treats ${math`B`} and ${math`B^{c}`} as equally likely. Weight by ${p.b} and ${sub(q(1), p.b)}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const OVERALL = [q(1, 8), q(2, 8), q(3, 8), q(2, 8)];
const MISREAD = [q(1, 10), q(2, 10), q(4, 10), q(3, 10)];
const PMIS = q(2, 3);
const readers = OVERALL.map((o, i) => div(sub(o, mul(PMIS, MISREAD[i] as Rational)), sub(q(1), PMIS)));
const q8a = auto({
  id: 'ia-q8-a',
  source: cite(S1, 'Q8(a)'),
  title: t`Reading the rubric`,
  prompt: t`Examination candidates are graded into four classes, I, II-${1}, II-${2}, and III, with probabilities ${OVERALL[0] as Rational}, ${OVERALL[1] as Rational}, ${OVERALL[2] as Rational}, and ${OVERALL[3] as Rational}. Candidates who misread the rubric, a common event with probability ${PMIS}, generally do worse: their probabilities are ${MISREAD[0] as Rational}, ${MISREAD[1] as Rational}, ${MISREAD[2] as Rational}, and ${MISREAD[3] as Rational}. What is the probability that a candidate who reads the rubric correctly is placed in class II-${1}?`,
  answer: { kind: 'exact', expected: str(readers[1] as Rational) },
  solution: [
    t`The overall probabilities mix the two groups. Total probability for class II-${1}: ${math`\mathbb{P}(\text{II-}${1}) = \mathbb{P}(\text{II-}${1} \mid M)\mathbb{P}(M) + \mathbb{P}(\text{II-}${1} \mid M^{c})\mathbb{P}(M^{c})`}, with ${math`M`} "misreads".`,
    t`${math`${OVERALL[1] as Rational} = ${MISREAD[1] as Rational} \times ${PMIS} + z \times ${q(1, 3)}`}, so ${math`z = \left(${OVERALL[1] as Rational} - ${mul(MISREAD[1] as Rational, PMIS)}\right) \times ${3} = ${readers[1] as Rational}`}.`,
  ],
  reference: str(readers[1] as Rational),
  verify: () => {
    // The readers' four class probabilities, solved the same way, must add to 1 and be at least 0.
    const total = readers.reduce((a, b) => add(a, b), q(0));
    return same('the readers\' distribution adds to 1', `${str(total)},${readers.every((r) => r.num >= 0n)}`, '1,true') ?? same('II-1 for readers', str(readers[1] as Rational), '7/20');
  },
  misconceptions: [{ response: str(OVERALL[1] as Rational), why: t`${OVERALL[1] as Rational} is for all candidates, misreaders included. Readers do better: solve the total probability equation for them.` }],
});

const P_DOM = { p: { kind: 'real' as const, min: 0.05, max: 0.95 }, r: { kind: 'real' as const, min: 0.05, max: 0.95 } };
const q9a = auto({
  id: 'ia-q9-same-twice',
  source: cite(S1, 'Q9', true),
  title: t`Voting the same way twice`,
  prompt: t`Parliament contains a proportion ${math`p`} of Labour members, who never change their minds, and a proportion ${math`${1} - p`} of Conservative members, who change their minds completely at random, with probability ${math`r`}, between successive votes on the same issue. A member is chosen at random. What is the probability that they vote the same way twice in succession? Give an expression in ${math`p`} and ${math`r`}.`,
  answer: { kind: 'expression', expected: 'p + (1 - p)*(1 - r)', variables: ['p', 'r'], domains: P_DOM },
  solution: [
    t`Partition by party: Labour with probability ${math`p`}, Conservative with ${math`${1} - p`}. Given Labour, the two votes agree for certain; given Conservative, they agree when the member does not change, probability ${math`${1} - r`}.`,
    t`Total probability: ${math`p \cdot ${1} + (${1} - p)(${1} - r)`}.`,
  ],
  reference: 'p + (1 - p)(1 - r)',
  verify: () => {
    // Exact check over the cases for a few rational p and r.
    for (const [p, r] of [[q(1, 3), q(1, 4)], [q(1, 2), q(1, 2)], [q(2, 5), q(3, 7)]] as const) {
      const cases = add(mul(p, q(1)), mul(sub(q(1), p), sub(q(1), r)));
      const formula = add(p, mul(sub(q(1), p), sub(q(1), r)));
      const e = same(`p = ${str(p)}, r = ${str(r)}`, str(cases), str(formula));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: '1 - r', why: t`Labour members always vote the same way: include them, with weight ${math`p`}.` }],
});

const q8explain = supervision({
  id: 'ia-q8-reading',
  source: cite(S1, 'Q8'),
  title: t`Which probabilities are which?`,
  prompt: t`In Q${8}, explain why the four probabilities ${OVERALL[0] as Rational}, ${OVERALL[1] as Rational}, ${OVERALL[2] as Rational}, ${OVERALL[3] as Rational} must be for all candidates, not for those who read the rubric correctly, and compute the readers' full distribution over the four classes. Check that it is a probability distribution.`,
  writeUp: 'explanation',
});
const totalProof = supervision({
  id: 'schedule-total-probability',
  source: cite('tripos-schedules', 'IA Probability, Axiomatic approach: "Conditional probability, Bayes\'s formula"', true),
  title: t`The law, for a countable partition`,
  prompt: t`Let ${math`B_{${1}}, B_{${2}}, \ldots`} be a countable partition of ${math`\Omega`} into events with ${math`\mathbb{P}(B_{i}) > ${0}`}. Prove that ${math`\mathbb{P}(A) = \sum_{i} \mathbb{P}(A \mid B_{i})\mathbb{P}(B_{i})`} for every event ${mA}. Which axiom is used, and what changes if some ${math`\mathbb{P}(B_{i}) = ${0}`}?`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const claims: ProbabilityClaim[] = [
  { what: 'Q9 with p = 1/3, r = 1/4: same way twice', exact: add(q(1, 3), mul(q(2, 3), q(3, 4))), trial: (rng) => (rng() < 1 / 3 ? true : rng() >= 1 / 4) },
];

export const totalProbability: TopicContent = {
  topicId: 'prob.total-probability',
  goal: t`Split ${math`\mathbb{P}(A)`} over a partition, ${math`\mathbb{P}(A) = \sum_{i} \mathbb{P}(A \mid B_{i})\mathbb{P}(B_{i})`}, and solve it for an unknown piece.`,
  lesson: [
    { kind: 'p', text: t`When an outcome depends on which of several situations holds, find its probability in each situation and weight by how likely the situation is. The situations must form a partition: exactly one of them happens.` },
    { kind: 'rule', text: t`The [[law-of-total-probability|law of total probability]]: if ${math`B_{${1}}, B_{${2}}, \ldots`} partition ${math`\Omega`} into events of positive probability, then ${math`\mathbb{P}(A) = \sum_{i} \mathbb{P}(A \mid B_{i})\,\mathbb{P}(B_{i})`}.` },
    { kind: 'p', text: t`Proof: ${mA} is the disjoint union of the ${math`A \cap B_{i}`}, so ${math`\mathbb{P}(A) = \sum_{i} \mathbb{P}(A \cap B_{i})`} by countable additivity, and ${math`\mathbb{P}(A \cap B_{i}) = \mathbb{P}(A \mid B_{i})\mathbb{P}(B_{i})`} by the multiplication rule. A tree diagram draws the same sum: one branch per ${math`B_{i}`}.` },
    { kind: 'p', text: t`Q${9}: Labour members (proportion ${math`p`}) never change their minds; Conservatives change with probability ${math`r`}. A random member votes the same way twice with probability ${math`p \cdot ${1} + (${1} - p)(${1} - r)`}.` },
    { kind: 'p', text: t`The law can be run backwards. In Q${8}, the class probabilities for all candidates are a weighted average of those who misread the rubric (weight ${PMIS}) and those who read it (weight ${q(1, 3)}). Knowing the overall value and the misreaders' value leaves one unknown: the readers' chance of class II-${1} is ${readers[1] as Rational}.` },
  ],
  examples: [
    workedCambridge(q8a),
    worked(twoUrns, { a: q(1, 6), r1: 3, n1: 5, r2: 1, n2: 4 }, t`Two urns and a die`),
    worked(threeMachines, { s: [50, 30, 20], d: [2, 3, 5] }, t`Faulty items from three machines`),
  ],
  generators: [twoUrns, threeMachines, solveBackwards],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['law-of-total-probability'],
  claims,
  cambridge: [q9a, q8explain, totalProof],
  gate: ['ia-q9-same-twice', 'ia-q8-reading'],
};
