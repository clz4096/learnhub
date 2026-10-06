/**
 * prob.bayes-formula: for a partition B_1, B_2, ... and an observed event A,
 * P(B_i | A) = P(A | B_i) P(B_i) / Σ_j P(A | B_j) P(B_j). From IA Probability Example
 * Sheet 1 Q8(b) (a candidate in class II-1: did they read the rubric?) and Q9 (a member who
 * voted the same way twice: will they do so again?), and the Faculty schedule's "Bayes's
 * formula". STEP Support Assignment 6's two-event version is prob.bayes-two-events. The
 * sheet has no official solutions; the answers are checked by exact sums over the cases.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, toFloat, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { math, t, type Rich } from '../rich';
import { worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const S1 = 'ia-prob-sheet-1' as const;
const distinctFrom = (right: string, xs: readonly string[]): number => new Set(xs.filter((x) => x !== right)).size;
const chance = (r: Rational, rng: Rng): boolean => rng() < toFloat(r);
const sumR = (xs: readonly Rational[]): Rational => xs.reduce((a, b) => add(a, b), q(0));
/** Draw an index from a list of probabilities adding to 1. */
const drawIndex = (ps: readonly Rational[], rng: Rng): number => { let u = rng(); for (let i = 0; i < ps.length; i++) { u -= toFloat(ps[i] as Rational); if (u < 0) return i; } return ps.length - 1; };

// ---------------------------------------------------------------- three causes

interface CauseP { prior: readonly Rational[]; like: readonly Rational[]; i: number }
const posterior = ({ prior, like, i }: CauseP): Rational => div(mul(prior[i] as Rational, like[i] as Rational), sumR(prior.map((p, j) => mul(p, like[j] as Rational))));
const causeMis = (p: CauseP): string[] => [str(p.like[p.i] as Rational), str(p.prior[p.i] as Rational), str(mul(p.prior[p.i] as Rational, p.like[p.i] as Rational))];
const PRIORS: readonly (readonly Rational[])[] = [[q(1, 2), q(1, 3), q(1, 6)], [q(1, 4), q(1, 4), q(1, 2)], [q(3, 5), q(1, 5), q(1, 5)], [q(1, 10), q(3, 10), q(3, 5)], [q(1, 3), q(1, 3), q(1, 3)]];
const LIKES = [q(1, 10), q(1, 5), q(1, 4), q(1, 2), q(3, 5), q(3, 4), q(9, 10)];

const threeCauses = generator<CauseP>({
  id: 'three-causes',
  skill: 'Reverse a conditional probability over a partition into three causes with Bayes\'s formula: prior times likelihood, divided by the total.',
  params: (rng) => {
    for (;;) {
      const p: CauseP = { prior: pick(rng, PRIORS), like: [pick(rng, LIKES), pick(rng, LIKES), pick(rng, LIKES)], i: int(rng, 0, 2) };
      if (new Set(p.like.map(str)).size === 3 && distinctFrom(str(posterior(p)), causeMis(p)) >= 2) return p;
    }
  },
  sane: ({ prior }) => (str(sumR(prior)) === '1' ? null : 'out of range'),
  problem: (p) => {
    const joint = p.prior.map((x, j) => mul(x, p.like[j] as Rational));
    return {
      prompt: t`A fault comes from one of three components, ${math`C_{${1}}`}, ${math`C_{${2}}`}, ${math`C_{${3}}`}, with probabilities ${p.prior[0] as Rational}, ${p.prior[1] as Rational}, ${p.prior[2] as Rational}. A test raises an alarm with probability ${p.like[0] as Rational}, ${p.like[1] as Rational}, or ${p.like[2] as Rational}, depending on which component is at fault. The alarm sounds. What is the probability that ${math`C_{${p.i + 1}}`} is at fault?`,
      answer: { kind: 'exact', expected: str(posterior(p)) },
      solution: [
        t`Total probability: ${math`\mathbb{P}(\text{alarm}) = ${joint[0] as Rational} + ${joint[1] as Rational} + ${joint[2] as Rational} = ${sumR(joint)}`}, each term ${math`\mathbb{P}(\text{alarm} \mid C_{j})\mathbb{P}(C_{j})`}.`,
        t`Bayes's formula: ${math`\mathbb{P}(C_{${p.i + 1}} \mid \text{alarm}) = \frac{${joint[p.i] as Rational}}{${sumR(joint)}} = ${posterior(p)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // A population of 1,200,000 faults split by component and by alarm (every count is whole).
    const N = 1200000n;
    const counts = p.prior.map((x, j) => (N * x.num * (p.like[j] as Rational).num) / (x.den * (p.like[j] as Rational).den));
    return str(q(counts[p.i] as bigint, counts.reduce((a, b) => a + b, 0n)));
  },
  misconceptions: (p): Misconception[] => [
    { response: str(p.like[p.i] as Rational), why: t`That is ${math`\mathbb{P}(\text{alarm} \mid C_{${p.i + 1}})`}, the reverse conditional. Bayes's formula turns it around.` },
    { response: str(p.prior[p.i] as Rational), why: t`That is the chance before the alarm. The alarm is evidence: update by how likely it is under each cause.` },
    { response: str(mul(p.prior[p.i] as Rational, p.like[p.i] as Rational)), why: t`That is ${math`\mathbb{P}(C_{${p.i + 1}} \cap \text{alarm})`}. Divide by ${math`\mathbb{P}(\text{alarm})`}.` },
  ],
  trial: (p, rng) => { for (;;) { const j = drawIndex(p.prior, rng); if (chance(p.like[j] as Rational, rng)) return j === p.i; } },
});

// ---------------------------------------------------------------- which urn

interface UrnP { a: Rational; r1: number; n1: number; r2: number; n2: number; red: boolean }
const urnPost = (p: UrnP): Rational => {
  const l1 = p.red ? q(p.r1, p.n1) : q(p.n1 - p.r1, p.n1);
  const l2 = p.red ? q(p.r2, p.n2) : q(p.n2 - p.r2, p.n2);
  return div(mul(p.a, l1), add(mul(p.a, l1), mul(sub(q(1), p.a), l2)));
};
const urnMis = (p: UrnP): string[] => [str(p.red ? q(p.r1, p.n1) : q(p.n1 - p.r1, p.n1)), str(p.a), str(p.red ? q(p.r1, p.r1 + p.r2) : q(p.n1 - p.r1, p.n1 - p.r1 + p.n2 - p.r2))];

const whichUrn = generator<UrnP>({
  id: 'which-urn',
  skill: 'Infer which urn a ball came from, given its colour, with Bayes\'s formula over the two urns.',
  params: (rng) => {
    for (;;) {
      const n1 = int(rng, 3, 9);
      const n2 = int(rng, 3, 9);
      const p: UrnP = { a: pick(rng, [q(1, 2), q(1, 3), q(2, 3), q(1, 4)]), n1, n2, r1: int(rng, 1, n1 - 1), r2: int(rng, 1, n2 - 1), red: pick(rng, [true, false]) };
      if (p.r1 * p.n2 !== p.r2 * p.n1 && distinctFrom(str(urnPost(p)), urnMis(p)) >= 2) return p;
    }
  },
  sane: ({ r1, n1, r2, n2 }) => (r1 < n1 && r2 < n2 ? null : 'out of range'),
  problem: (p) => {
    const colour = p.red ? 'red' : 'blue';
    const l1 = p.red ? q(p.r1, p.n1) : q(p.n1 - p.r1, p.n1);
    const l2 = p.red ? q(p.r2, p.n2) : q(p.n2 - p.r2, p.n2);
    return {
      prompt: t`Urn ${1} holds ${p.r1} red and ${p.n1 - p.r1} blue balls; urn ${2} holds ${p.r2} red and ${p.n2 - p.r2} blue. Urn ${1} is chosen with probability ${p.a}, otherwise urn ${2}, and a ball is drawn from it: it is ${colour}. What is the probability that it came from urn ${1}?`,
      answer: { kind: 'exact', expected: str(urnPost(p)) },
      solution: [
        t`${math`\mathbb{P}(\text{${colour}}) = ${l1} \times ${p.a} + ${l2} \times ${sub(q(1), p.a)} = ${add(mul(p.a, l1), mul(sub(q(1), p.a), l2))}`}, by total probability.`,
        t`Bayes: ${math`\mathbb{P}(U_{${1}} \mid \text{${colour}}) = \frac{${mul(p.a, l1)}}{${add(mul(p.a, l1), mul(sub(q(1), p.a), l2))}} = ${urnPost(p)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Count over a population of choices and balls, as in the law of total probability.
    const D = Number(p.a.den);
    const A = Number(p.a.num);
    let [from1, all] = [0, 0];
    for (let s = 0; s < D; s++) for (let b = 0; b < p.n1 * p.n2; b++) {
      const one = s < A;
      const red = one ? b % p.n1 < p.r1 : b % p.n2 < p.r2;
      if (red !== p.red) continue;
      all++;
      if (one) from1++;
    }
    return str(q(from1, all));
  },
  misconceptions: (p): Misconception[] => {
    const [a, b, c] = urnMis(p);
    const colour = p.red ? 'red' : 'blue';
    return [
      { response: a as string, why: t`That is the chance of ${colour} from urn ${1}, the reverse conditional. Bayes's formula turns it around.` },
      { response: b as string, why: t`That is the chance of urn ${1} before seeing the ball. The colour is evidence about the urn.` },
      { response: c as string, why: t`Pooling the ${colour} balls treats each as equally likely, but the urns are chosen with different probabilities and hold different numbers of balls.` },
    ];
  },
  trial: (p, rng) => {
    for (;;) {
      const one = chance(p.a, rng);
      const red = one ? rng() < p.r1 / p.n1 : rng() < p.r2 / p.n2;
      if (red === p.red) return one;
    }
  },
});

// ---------------------------------------------------------------- two observations

interface CoinP { prior: Rational; bias: Rational; k: number }
const coinPost = ({ prior, bias, k }: CoinP): Rational => {
  const lb = Array.from({ length: k }, () => bias).reduce((a, b) => mul(a, b), q(1));
  const lf = q(1, 2 ** k);
  return div(mul(prior, lb), add(mul(prior, lb), mul(sub(q(1), prior), lf)));
};
const coinMis = (p: CoinP): string[] => [str(p.prior), str(div(mul(p.prior, p.bias), add(mul(p.prior, p.bias), mul(sub(q(1), p.prior), q(1, 2))))), str(Array.from({ length: p.k }, () => p.bias).reduce((a, b) => mul(a, b), q(1)))];

const twoObservations = generator<CoinP>({
  id: 'repeated-evidence',
  skill: 'Update on several independent observations at once: the likelihood of the whole run under each hypothesis goes into Bayes\'s formula.',
  params: (rng) => {
    for (;;) {
      const p: CoinP = { prior: pick(rng, [q(1, 2), q(1, 3), q(1, 4), q(1, 10)]), bias: pick(rng, [q(2, 3), q(3, 4), q(4, 5), q(9, 10)]), k: int(rng, 2, 4) };
      if (distinctFrom(str(coinPost(p)), coinMis(p)) >= 2) return p;
    }
  },
  sane: ({ k }) => (k >= 2 ? null : 'out of range'),
  problem: (p) => {
    const lb = Array.from({ length: p.k }, () => p.bias).reduce((a, b) => mul(a, b), q(1));
    return {
      prompt: t`A coin is either fair or biased, showing heads with probability ${p.bias}; it is biased with probability ${p.prior}. It is tossed ${p.k} times and shows ${p.k} heads. What is the probability that it is biased?`,
      answer: { kind: 'exact', expected: str(coinPost(p)) },
      solution: [
        t`Given the coin, the tosses are independent: ${math`\mathbb{P}(\text{${p.k} heads} \mid \text{biased}) = \left(${p.bias}\right)^{${p.k}} = ${lb}`} and ${math`\mathbb{P}(\text{${p.k} heads} \mid \text{fair}) = ${q(1, 2 ** p.k)}`}.`,
        t`Bayes: ${math`\frac{${lb} \times ${p.prior}}{${lb} \times ${p.prior} + ${q(1, 2 ** p.k)} \times ${sub(q(1), p.prior)}} = ${coinPost(p)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Update one toss at a time: each posterior becomes the next prior.
    let pr = p.prior;
    for (let i = 0; i < p.k; i++) pr = div(mul(pr, p.bias), add(mul(pr, p.bias), mul(sub(q(1), pr), q(1, 2))));
    return str(pr);
  },
  misconceptions: (p): Misconception[] => {
    const [a, b, c] = coinMis(p);
    return [
      { response: a as string, why: t`Heads are more likely from the biased coin, so seeing them should raise its probability above ${p.prior}.` },
      { response: b as string, why: t`That updates on one head only. All ${p.k} tosses are evidence: use the likelihood of the whole run.` },
      { response: c as string, why: t`That is the chance of ${p.k} heads from the biased coin, the reverse conditional.` },
    ];
  },
  trial: (p, rng) => {
    for (;;) {
      const biased = chance(p.prior, rng);
      let all = true;
      for (let i = 0; i < p.k; i++) if (!(biased ? chance(p.bias, rng) : rng() < 0.5)) all = false;
      if (all) return biased;
    }
  },
});

// ---------------------------------------------------------------- Cambridge problems

const OVERALL = [q(1, 8), q(2, 8), q(3, 8), q(2, 8)];
const MISREAD = [q(1, 10), q(2, 10), q(4, 10), q(3, 10)];
const PMIS = q(2, 3);
const readII1 = div(sub(OVERALL[1] as Rational, mul(PMIS, MISREAD[1] as Rational)), sub(q(1), PMIS));
const q8b = auto({
  id: 'ia-q8-b',
  source: cite(S1, 'Q8(b)'),
  title: t`Did they read the rubric?`,
  prompt: t`Examination candidates are placed in class II-${1} with probability ${OVERALL[1] as Rational}. Candidates who misread the rubric, with probability ${PMIS}, are placed in II-${1} with probability ${MISREAD[1] as Rational}. What is the probability that a candidate who is placed in class II-${1} has read the rubric correctly?`,
  answer: { kind: 'exact', expected: str(div(mul(sub(q(1), PMIS), readII1), OVERALL[1] as Rational)) },
  solution: [
    t`Part (a) found ${math`\mathbb{P}(\text{II-}${1} \mid \text{read}) = ${readII1}`} by total probability: ${math`${OVERALL[1] as Rational} = ${MISREAD[1] as Rational} \times ${PMIS} + z \times ${q(1, 3)}`}.`,
    t`Bayes: ${math`\mathbb{P}(\text{read} \mid \text{II-}${1}) = \frac{\mathbb{P}(\text{II-}${1} \mid \text{read})\,\mathbb{P}(\text{read})}{\mathbb{P}(\text{II-}${1})} = \frac{${readII1} \times ${q(1, 3)}}{${OVERALL[1] as Rational}} = ${div(mul(sub(q(1), PMIS), readII1), OVERALL[1] as Rational)}`}.`,
  ],
  reference: str(div(mul(sub(q(1), PMIS), readII1), OVERALL[1] as Rational)),
  verify: () => {
    // A population of 120 candidates: 80 misread (16 in II-1), 40 read; II-1 holds 30 in all.
    const [mis, read] = [80, 40];
    const misII1 = mis * 2 / 10;
    const allII1 = 120 * 2 / 8;
    return same('a population of 120', str(q(allII1 - misII1, allII1)), '7/15') ?? same('readers in II-1', allII1 - misII1, (read * 7) / 20);
  },
  misconceptions: [{ response: str(readII1), why: t`That is ${math`\mathbb{P}(\text{II-}${1} \mid \text{read})`}, part (a). Part (b) asks the reverse.` }],
});

const P_DOM = { p: { kind: 'real' as const, min: 0.05, max: 0.95 }, r: { kind: 'real' as const, min: 0.05, max: 0.95 } };
const q9 = auto({
  id: 'ia-q9',
  source: cite(S1, 'Q9'),
  title: t`Voting the same way again`,
  prompt: t`Parliament contains a proportion ${math`p`} of Labour members, who are incapable of changing their minds about anything, and a proportion ${math`${1} - p`} of Conservative members, who change their minds completely at random, with probability ${math`r`}, between successive votes on the same issue. A randomly chosen member is noticed to have voted twice in succession in the same way. What is the probability that this member will vote in the same way next time? Give an expression in ${math`p`} and ${math`r`}.`,
  answer: { kind: 'expression', expected: '(p + (1 - p)*(1 - r)^2)/(p + (1 - p)*(1 - r))', variables: ['p', 'r'], domains: P_DOM },
  solution: [
    t`Let ${math`S_{${2}}`} be "the same way twice" and ${math`S_{${3}}`} "the same way three times". By total probability over the party, ${math`\mathbb{P}(S_{${2}}) = p + (${1} - p)(${1} - r)`} and ${math`\mathbb{P}(S_{${3}}) = p + (${1} - p)(${1} - r)^{${2}}`}.`,
    t`We want ${math`\mathbb{P}(S_{${3}} \mid S_{${2}}) = \mathbb{P}(S_{${3}}) / \mathbb{P}(S_{${2}})`}, since ${math`S_{${3}} \subseteq S_{${2}}`}: ${math`\frac{p + (${1} - p)(${1} - r)^{${2}}}{p + (${1} - p)(${1} - r)}`}. Equivalently, Bayes's formula gives the member's party given ${math`S_{${2}}`}, and the next vote is averaged over it.`,
  ],
  reference: '(p + (1 - p)(1 - r)^2)/(p + (1 - p)(1 - r))',
  verify: () => {
    // Exact check over the cases for a few rational p and r: party, then two changes or not.
    for (const [p, r] of [[q(1, 3), q(1, 4)], [q(1, 2), q(1, 5)], [q(2, 5), q(3, 7)]] as const) {
      const s2 = add(p, mul(sub(q(1), p), sub(q(1), r)));
      const s3 = add(p, mul(sub(q(1), p), mul(sub(q(1), r), sub(q(1), r))));
      // Via Bayes: posterior of Labour given S2, then the next vote.
      const lab = div(p, s2);
      const viaBayes = add(lab, mul(sub(q(1), lab), sub(q(1), r)));
      const e = same(`p = ${str(p)}, r = ${str(r)}`, str(div(s3, s2)), str(viaBayes));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: 'p + (1 - p)*(1 - r)', why: t`That is the chance for a random member before anything is noticed. Two votes the same way make a Labour member more likely: condition on it.` }],
});

const q9why = supervision({
  id: 'ia-q9-explain',
  source: cite(S1, 'Q9'),
  title: t`What the observation tells you`,
  prompt: t`In Q${9}, explain in words why the answer is larger than ${math`p + (${1} - p)(${1} - r)`}, the chance that a random member votes the same way twice. Compute the posterior probability that the member is Labour, given two votes the same way, and show that averaging the next vote over the two parties with these weights gives the same answer as ${math`\mathbb{P}(S_{${3}})/\mathbb{P}(S_{${2}})`}.`,
  writeUp: 'explanation',
});
const bayesProof = supervision({
  id: 'schedule-bayes',
  source: cite('tripos-schedules', 'IA Probability, Axiomatic approach: "Conditional probability, Bayes\'s formula"', true),
  title: t`Bayes's formula for a partition`,
  prompt: t`Let ${math`B_{${1}}, B_{${2}}, \ldots`} be a countable partition into events of positive probability, and ${math`A`} an event with ${math`\mathbb{P}(A) > ${0}`}. Prove ${math`\mathbb{P}(B_{i} \mid A) = \frac{\mathbb{P}(A \mid B_{i})\mathbb{P}(B_{i})}{\sum_{j} \mathbb{P}(A \mid B_{j})\mathbb{P}(B_{j})}`}. Then explain how STEP Support Assignment ${6}'s two-event version, with ${math`B`} and ${math`B^{c}`}, is the special case.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const claims: ProbabilityClaim[] = [
  { what: 'Q8(b): read the rubric, given class II-1', exact: q(7, 15), trial: (rng) => { for (;;) { const misread = rng() < 2 / 3; const ii1 = misread ? rng() < 0.2 : rng() < 0.35; if (ii1) return !misread; } } },
];

export const bayesFormula: TopicContent = {
  topicId: 'prob.bayes-formula',
  goal: t`Reverse conditional probabilities over a partition with Bayes's formula, ${math`\mathbb{P}(B_{i} \mid A) = \mathbb{P}(A \mid B_{i})\mathbb{P}(B_{i}) / \sum_{j} \mathbb{P}(A \mid B_{j})\mathbb{P}(B_{j})`}.`,
  lesson: [
    { kind: 'p', text: t`The law of total probability runs from causes to evidence: knowing how likely the evidence is under each cause, it gives the chance of the evidence. Bayes's formula runs the other way: having seen the evidence, how likely is each cause?` },
    { kind: 'rule', text: t`[[bayes-formula|Bayes's formula]]: for a partition ${math`B_{${1}}, B_{${2}}, \ldots`} with positive probabilities and an event ${math`A`} with ${math`\mathbb{P}(A) > ${0}`}, ${math`\mathbb{P}(B_{i} \mid A) = \frac{\mathbb{P}(A \mid B_{i})\,\mathbb{P}(B_{i})}{\sum_{j} \mathbb{P}(A \mid B_{j})\,\mathbb{P}(B_{j})}`}.` },
    { kind: 'p', text: t`It is the definition of conditional probability, ${math`\mathbb{P}(B_{i} \cap A)/\mathbb{P}(A)`}, with the multiplication rule on top and total probability underneath. The ${math`\mathbb{P}(B_{i})`} are the [[prior-posterior|prior]] probabilities, before the evidence; the ${math`\mathbb{P}(B_{i} \mid A)`} are the posterior ones, after it.` },
    { kind: 'p', text: t`Example Sheet ${1} Q${8}: ${q(2, 3)} of candidates misread the rubric, and class II-${1} holds ${q(1, 4)} of all candidates but only ${q(1, 5)} of misreaders, so ${readII1} of readers. A candidate in II-${1} read the rubric with probability ${math`\frac{${readII1} \times ${q(1, 3)}}{${q(1, 4)}} = ${q(7, 15)}`}: up from the prior ${q(1, 3)}, because readers do better.` },
    { kind: 'p', text: t`Evidence accumulates: two votes the same way (Q${9}) make a never-changing member more likely than one vote would. With independent observations given each cause, the likelihood of the whole record goes into the formula, or equivalently each posterior becomes the prior for the next observation.` },
  ],
  examples: [
    workedCambridge(q8b),
    worked(threeCauses, { prior: [q(1, 2), q(1, 3), q(1, 6)], like: [q(1, 10), q(1, 2), q(9, 10)], i: 2 }, t`Three causes of an alarm`),
    worked(twoObservations, { prior: q(1, 2), bias: q(3, 4), k: 3 }, t`Three heads from a possibly biased coin`),
  ],
  generators: [threeCauses, whichUrn, twoObservations],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['bayes-formula', 'prior-posterior'],
  claims,
  cambridge: [q9, q9why, bayesProof],
  gate: ['ia-q9', 'ia-q9-explain'],
};
