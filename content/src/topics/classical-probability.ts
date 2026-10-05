/**
 * prob.classical-probability: Classical probability on a finite sample space: equally
 * likely outcomes, events as subsets, P(A) = |A|/|Ω|. From IA Probability Example Sheet 1:
 * Q2 (the knock-out tournament, whose hint says one probability space serves all three
 * parts), Q3 (halving a deck), and Q11 (Mary's and John's coins). Q1 is set in
 * comb.combinations. The sheet has no official solutions; every answer here is checked by
 * exact enumeration.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision } from '../cambridge';
import { add, int, mul, pick, q, str, sub, toFloat, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { dmath, math, t } from '../rich';
import { worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const [mn, mOmega] = [math`n`, math`\Omega`];
const fl = (n: number, d: number): number => Math.floor(n / d);
const gcdOf = (a: number, b: number): number => { let x = a; let y = b; while (y !== 0) [x, y] = [y, x % y]; return x; };
/** P(exactly k heads in n fair coins), exactly. */
const chooseBig = (n: number, k: number): bigint => { let v = 1n; for (let i = 1; i <= k; i++) v = (v * BigInt(n - k + i)) / BigInt(i); return v; };
const headsDist = (n: number): Rational[] => Array.from({ length: n + 1 }, (_, k) => q(chooseBig(n, k), 2n ** BigInt(n)));

// ---------------------------------------------------------------- events as subsets of {1, ..., N}

interface SubP { n: number; a: number; b: number }

const butNot = generator<SubP>({
  id: 'divisible-but-not',
  skill: 'Find the probability of an event in a finite sample space by counting its outcomes: divisible by a but not by b.',
  params: (rng) => {
    for (;;) {
      const n = pick(rng, [50, 60, 100, 120, 200]);
      const a = pick(rng, [2, 3, 4, 5, 6]);
      const b = pick(rng, [3, 4, 5, 7, 10]);
      if (a !== b && b % a !== 0 && a % b !== 0) return { n, a, b };
    }
  },
  sane: ({ n, a, b }) => (a !== b && b % a !== 0 && a % b !== 0 && n >= 50 ? null : 'out of range'),
  problem: ({ n, a, b }) => {
    const l = (a * b) / gcdOf(a, b);
    const cnt = fl(n, a) - fl(n, l);
    return {
      prompt: t`A number is chosen at random from ${math`\{${1}, ${2}, \ldots, ${n}\}`}, each equally likely. What is the probability that it is divisible by ${a} but not by ${b}?`,
      answer: { kind: 'exact', expected: str(q(cnt, n)) },
      solution: [
        t`The [[sample-space-classical|sample space]] ${math`\Omega = \{${1}, \ldots, ${n}\}`} has ${n} equally likely outcomes. The event is the subset of multiples of ${a} that are not multiples of ${b}.`,
        t`Multiples of ${a}: ${fl(n, a)}. Of those, the ones divisible by ${b} too are the multiples of ${l}: ${fl(n, l)}. So the event has ${math`${fl(n, a)} - ${fl(n, l)} = ${cnt}`} outcomes.`,
        t`${math`P = \frac{${cnt}}{${n}} = ${q(cnt, n)}`}.`,
      ],
    };
  },
  solve: ({ n, a, b }) => str(q([...Array(n).keys()].map((i) => i + 1).filter((x) => x % a === 0 && x % b !== 0).length, n)),
  misconceptions: ({ n, a, b }): Misconception[] => [
    { response: str(q(fl(n, a), n)), why: t`That counts every multiple of ${a}, including those divisible by ${b}. Remove the multiples of both.` },
    { response: str(q(fl(n, a) - fl(n, b), n)), why: t`Not every multiple of ${b} is a multiple of ${a}: remove only the numbers divisible by both, the multiples of ${(a * b) / gcdOf(a, b)}.` },
    { response: str(q(fl(n, a) - fl(n, a * b), n)), why: t`Divisible by both ${a} and ${b} means divisible by their least common multiple, ${(a * b) / gcdOf(a, b)}, not always their product.` },
  ],
  trial: ({ n, a, b }, rng) => { const x = 1 + Math.floor(rng() * n); return x % a === 0 && x % b !== 0; },
});

// ---------------------------------------------------------------- more heads

interface HeadsP { m: number; j: number }

const moreHeads = generator<HeadsP>({
  id: 'more-heads',
  skill: 'Compare two players\' coin tosses by listing the joint outcomes, as in IA Probability Example Sheet 1 Q11.',
  params: (rng) => {
    for (;;) {
      const m = int(rng, 1, 5);
      const j = int(rng, 1, 4);
      if (m !== j + 1) return { m, j };
    }
  },
  sane: ({ m, j }) => (m >= 1 && j >= 1 && m <= 5 && j <= 4 && m !== j + 1 ? null : 'out of range'),
  problem: ({ m, j }) => {
    const M = headsDist(m);
    const J = headsDist(j);
    let more = q(0);
    let tie = q(0);
    M.forEach((pm, a) => J.forEach((pj, b) => { if (a > b) more = add(more, mul(pm, pj)); if (a === b) tie = add(tie, mul(pm, pj)); }));
    return {
      prompt: t`Mary tosses ${m} fair coin${m === 1 ? '' : 's'} and John tosses ${j}. What is the probability that Mary gets more heads than John?`,
      answer: { kind: 'exact', expected: str(more) },
      solution: [
        t`The sample space is every sequence of ${m + j} tosses: ${math`${2}^{${m + j}} = ${2 ** (m + j)}`} equally likely outcomes. Group them by the numbers of heads: Mary gets ${math`a`} heads in ${math`\binom{${m}}{a}`} ways, John ${math`b`} in ${math`\binom{${j}}{b}`}.`,
        t`Add the outcomes with ${math`a > b`}: the probability is ${more}. (Ties have probability ${tie}.)`,
      ],
    };
  },
  solve: ({ m, j }) => {
    // List every outcome as a bit string.
    let good = 0;
    for (let s = 0; s < 2 ** (m + j); s++) {
      let a = 0;
      let b = 0;
      for (let i = 0; i < m + j; i++) if ((s >> i) & 1) { if (i < m) a++; else b++; }
      if (a > b) good++;
    }
    return str(q(good, 2 ** (m + j)));
  },
  misconceptions: ({ m, j }): Misconception[] => {
    const M = headsDist(m);
    const J = headsDist(j);
    let atLeast = q(0);
    let tie = q(0);
    M.forEach((pm, a) => J.forEach((pj, b) => { if (a >= b) atLeast = add(atLeast, mul(pm, pj)); if (a === b) tie = add(tie, mul(pm, pj)); }));
    return [
      { response: str(atLeast), why: t`That includes the ties, where they get the same number of heads. "More" leaves those out.` },
      { response: '1/2', why: t`Symmetry gives ${q(1, 2)} only in special cases, such as one extra coin for Mary. Count the outcomes.` },
      { response: str(tie), why: t`That is the chance of a tie. Count the outcomes where Mary has strictly more.` },
    ];
  },
  trial: ({ m, j }, rng) => {
    let a = 0;
    let b = 0;
    for (let i = 0; i < m; i++) if (rng() < 0.5) a++;
    for (let i = 0; i < j; i++) if (rng() < 0.5) b++;
    return a > b;
  },
});

// ---------------------------------------------------------------- the larger of two dice

interface MaxP { k: number; kind: 'max' | 'min' }

const largerDie = generator<MaxP>({
  id: 'larger-die',
  skill: 'Count outcomes in the sample space of two dice, 36 equally likely ordered pairs: the larger, or the smaller, of the two scores.',
  params: (rng) => ({ k: int(rng, 1, 6), kind: pick(rng, ['max', 'min'] as const) }),
  sane: ({ k }) => (k >= 1 && k <= 6 ? null : 'out of range'),
  problem: ({ k, kind }) => {
    const cnt = kind === 'max' ? 2 * k - 1 : 2 * (7 - k) - 1;
    return {
      prompt: t`Two fair dice are thrown. What is the probability that the ${kind === 'max' ? 'larger' : 'smaller'} of the two scores is ${k}? (If they are equal, that number counts.)`,
      answer: { kind: 'exact', expected: str(q(cnt, 36)) },
      solution: [
        t`${mOmega} is the ${36} ordered pairs, equally likely. ${kind === 'max' ? t`The larger is at most ${k} in ${math`${k} \times ${k} = ${k * k}`} pairs, and at most ${k - 1} in ${math`${(k - 1) ** 2}`}.` : t`The smaller is at least ${k} in ${math`${7 - k} \times ${7 - k} = ${(7 - k) ** 2}`} pairs, and at least ${k + 1} in ${math`${(6 - k) ** 2}`}.`}`,
        t`So exactly ${k} in ${math`${kind === 'max' ? k * k : (7 - k) ** 2} - ${kind === 'max' ? (k - 1) ** 2 : (6 - k) ** 2} = ${cnt}`} pairs: probability ${math`\frac{${cnt}}{${36}} = ${q(cnt, 36)}`}.`,
      ],
    };
  },
  solve: ({ k, kind }) => {
    let good = 0;
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if ((kind === 'max' ? Math.max(a, b) : Math.min(a, b)) === k) good++;
    return str(q(good, 36));
  },
  misconceptions: ({ k, kind }): Misconception[] => {
    const cnt = kind === 'max' ? 2 * k - 1 : 2 * (7 - k) - 1;
    return [
      { response: str(q(1, 6)), why: t`The six values are not equally likely to be the ${kind === 'max' ? 'larger' : 'smaller'} score. Count the ordered pairs.` },
      { response: str(q(cnt + 1, 36)), why: t`The pair with both dice showing ${k} is one outcome, not two: (${k}, ${k}) is counted once.` },
      { response: str(q(kind === 'max' ? k * k : (7 - k) ** 2, 36)), why: t`That is ${kind === 'max' ? 'at most' : 'at least'} ${k}. Subtract the pairs where it is ${kind === 'max' ? t`at most ${k - 1}` : t`at least ${k + 1}`}.` },
    ];
  },
  trial: ({ k, kind }, rng) => { const a = 1 + Math.floor(rng() * 6); const b = 1 + Math.floor(rng() * 6); return (kind === 'max' ? Math.max(a, b) : Math.min(a, b)) === k; },
});

// ---------------------------------------------------------------- Cambridge problems

/** The tournament with 2^n players in random places and fair matches: P(two chosen players meet in round r), exactly, by pairs of places. */
function meet(n: number): Rational[] {
  const N = 2 ** n;
  const byRound: Rational[] = Array.from({ length: n + 1 }, () => q(0));
  let pairs = 0;
  for (let x = 0; x < N; x++) for (let y = x + 1; y < N; y++) {
    pairs++;
    // They can meet only in the round where they first share a block of the bracket, each having won every earlier match.
    let r = 1;
    while ((x >> r) !== (y >> r)) r++;
    byRound[r] = add(byRound[r] as Rational, q(1n, 4n ** BigInt(r - 1)));
  }
  return byRound.map((v) => q(v.num, v.den * BigInt(pairs)));
}
const N_DOMAIN = { n: { kind: 'integer' as const, min: 1, max: 8 } };
const tourIntro = t`A table-tennis championship for ${math`${2}^{n}`} players is organized as a knock-out tournament with ${mn} rounds, the last round being the final. Two players are chosen at random; every player is equally good, so each match is won by either player with probability ${q(1, 2)}.`;

const q2a = auto({
  id: 'ia-q2-a',
  source: cite('ia-prob-sheet-1', 'Q2(a)'),
  title: t`Meeting in the first round`,
  prompt: t`${tourIntro} Calculate the probability that they meet in the first round.`,
  answer: { kind: 'expression', expected: '1/(2^n - 1)', variables: ['n'], domains: N_DOMAIN },
  solution: [
    t`The hint: one probability space serves all three parts. Take the two chosen players' places in the draw: all pairs of places are equally likely.`,
    t`Fix the first player's place. The second is equally likely to be in any of the other ${math`${2}^{n} - ${1}`} places, and exactly one of them is the first player's first-round opponent: ${math`\frac{${1}}{${2}^{n} - ${1}}`}.`,
  ],
  reference: '1/(2^n - 1)',
  verify: () => {
    for (let n = 1; n <= 5; n++) {
      const e = same(`n = ${n}`, str(meet(n)[1] as Rational), str(q(1, 2 ** n - 1)));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: '1/2^n', why: t`The second player is one of the other ${math`${2}^{n} - ${1}`} players, not ${math`${2}^{n}`}.` }],
});

const q2b = auto({
  id: 'ia-q2-b',
  source: cite('ia-prob-sheet-1', 'Q2(b)'),
  title: t`Meeting in the final`,
  prompt: t`${tourIntro} Calculate the probability that they meet in the final.`,
  answer: { kind: 'expression', expected: '1/(2^(n - 1) * (2^n - 1))', variables: ['n'], domains: N_DOMAIN },
  solution: [
    t`They must be in opposite halves of the draw: the second player is in the other half with probability ${math`\frac{${2}^{n - ${1}}}{${2}^{n} - ${1}}`}.`,
    t`Then each must win ${math`n - ${1}`} matches, probability ${math`\left(\frac{${1}}{${2}}\right)^{n - ${1}}`} each: ${math`\frac{${2}^{n - ${1}}}{${2}^{n} - ${1}} \times \frac{${1}}{${4}^{n - ${1}}} = \frac{${1}}{${2}^{n - ${1}}(${2}^{n} - ${1})}`}.`,
  ],
  reference: '1/(2^(n - 1) * (2^n - 1))',
  verify: () => {
    for (let n = 1; n <= 5; n++) {
      const e = same(`n = ${n}`, str(meet(n)[n] as Rational), str(q(1, 2 ** (n - 1) * (2 ** n - 1))));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: '2^(n - 1)/(2^n - 1)', why: t`That is the chance they are in opposite halves. Each must also win every match before the final.` }],
});

const q2c = auto({
  id: 'ia-q2-c',
  source: cite('ia-prob-sheet-1', 'Q2(c)'),
  title: t`Meeting in any round`,
  prompt: t`${tourIntro} Calculate the probability that they meet in some round.`,
  answer: { kind: 'expression', expected: '1/2^(n - 1)', variables: ['n'], domains: N_DOMAIN },
  solution: [
    t`Count matches: every match knocks one player out, and all but one go out, so there are ${math`${2}^{n} - ${1}`} matches, each between a different pair.`,
    t`The chosen pair is equally likely to be any of ${math`\binom{${2}^{n}}{${2}} = ${2}^{n - ${1}}(${2}^{n} - ${1})`} pairs, and by symmetry each pair is equally likely to play, so the probability is ${math`\frac{${2}^{n} - ${1}}{${2}^{n - ${1}}(${2}^{n} - ${1})} = \frac{${1}}{${2}^{n - ${1}}}`}.`,
  ],
  reference: '1/2^(n - 1)',
  verify: () => {
    for (let n = 1; n <= 5; n++) {
      const total = meet(n).reduce((a, b) => add(a, b), q(0));
      const e = same(`n = ${n}`, str(total), str(q(1, 2 ** (n - 1))));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: 'n/(2^n - 1)', why: t`The rounds are not equally likely to be the one where they meet: later rounds need both to keep winning. Count the matches instead.` }],
});

/** Q3: C(26, 13)^2 / C(52, 26), exactly, and as a decimal. */
const deck = q(chooseBig(26, 13) ** 2n, chooseBig(52, 26));
const q3 = auto({
  id: 'ia-q3',
  source: cite('ia-prob-sheet-1', 'Q3'),
  title: t`Halving a deck`,
  prompt: t`A full deck of ${52} cards is divided in half at random. Find the probability that each half contains the same number of red and black cards, as a decimal to four places.`,
  answer: { kind: 'numeric', expected: Number(toFloat(deck).toFixed(4)), absTol: 0.00005 },
  solution: [
    t`The sample space: the ${math`\binom{${52}}{${26}}`} equally likely choices of the first half. Each half has ${13} red and ${13} black exactly when the first half does: ${math`\binom{${26}}{${13}}`} ways to choose its red cards and ${math`\binom{${26}}{${13}}`} its black.`,
    t`${dmath`\frac{\binom{${26}}{${13}}^{${2}}}{\binom{${52}}{${26}}} = \frac{${Number(chooseBig(26, 13))}^{${2}}}{${Number(chooseBig(52, 26))}} \approx ${Number(toFloat(deck).toFixed(4))}.`}`,
  ],
  reference: String(Number(toFloat(deck).toFixed(4))),
  verify: () => {
    // A second method: deal the first half one card at a time, tracking the chance of each number of red cards so far.
    let dist: Rational[] = [q(1)];
    for (let d = 0; d < 26; d++) {
      const next: Rational[] = Array.from({ length: d + 2 }, () => q(0));
      dist.forEach((p, r) => {
        const left = 52 - d;
        next[r + 1] = add(next[r + 1] as Rational, mul(p, q(26 - r, left)));
        next[r] = add(next[r] as Rational, mul(p, q(26 - (d - r), left)));
      });
      dist = next;
    }
    const e = same('dealing card by card', str(dist[13] as Rational), str(deck));
    return e ?? same('four places', toFloat(deck).toFixed(4), '0.2181');
  },
  misconceptions: [{ response: String(Number((1 / 2).toFixed(4))), why: t`Splitting the colours evenly is the most likely result, but it is far from certain or even half: count the choices with ${13} red cards.` }],
});

const coins = (m: number, j: number): Rational => {
  const M = headsDist(m);
  const J = headsDist(j);
  let more = q(0);
  M.forEach((pm, a) => J.forEach((pj, b) => { if (a > b) more = add(more, mul(pm, pj)); }));
  return more;
};
const q11 = auto({
  id: 'ia-q11',
  source: cite('ia-prob-sheet-1', 'Q11'),
  title: t`Mary and John`,
  prompt: t`Mary tosses two coins and John tosses one coin. What is the probability that Mary gets more heads than John? Answer the same question if Mary tosses three coins and John tosses two.`,
  answer: { kind: 'table', cell: 'exact', columns: [t`Mary, John`, t`probability`], rows: [[t`${2} coins, ${1} coin`, null], [t`${3} coins, ${2} coins`, null]], expected: [str(coins(2, 1)), str(coins(3, 2))] },
  solution: [
    t`Two against one: ${8} equally likely outcomes. Mary wins with ${1} head against ${0}, or ${2} heads against at most ${1}: ${math`\frac{${2}}{${4}} \times \frac{${1}}{${2}} + \frac{${1}}{${4}} = ${coins(2, 1)}`}.`,
    t`Three against two: ${32} outcomes; counting them gives ${coins(3, 2)} again. The conjecture: with ${math`n + ${1}`} coins against ${mn}, the answer is always ${q(1, 2)}.`,
  ],
  reference: [str(coins(2, 1)), str(coins(3, 2))],
  verify: () => {
    for (let n = 1; n <= 8; n++) if (str(coins(n + 1, n)) !== '1/2') return `n = ${n}`;
    return same('two cases by listing', [moreHeads.at({ m: 2, j: 1 }).reference, moreHeads.at({ m: 3, j: 2 }).reference].join(), '1/2,1/2');
  },
  misconceptions: [{ response: ['3/4', '3/4'], why: t`Mary has more coins, but she must get strictly more heads: ties go against her. Count the outcomes.` }],
});

const q11proof = supervision({
  id: 'ia-q11-proof',
  source: cite('ia-prob-sheet-1', 'Q11'),
  title: t`Prove the conjecture`,
  prompt: t`Mary tosses ${math`n + ${1}`} coins and John tosses ${mn}. Prove that the probability that Mary gets more heads than John is ${q(1, 2)}. Hint: consider Mary's first ${mn} coins against John's, and her last coin; or the symmetry between heads and tails.`,
  writeUp: 'proof',
});
const q2space = supervision({
  id: 'ia-q2-space',
  source: cite('ia-prob-sheet-1', 'Q2, the hint'),
  title: t`One probability space`,
  prompt: t`For the knock-out tournament, describe one probability space that serves all three parts: what are the outcomes, why are they equally likely (or what are their probabilities), and which subset of outcomes is each event? Explain where the assumption that every match is won with probability ${q(1, 2)} enters.`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

const claims: ProbabilityClaim[] = [
  {
    what: 'two players of eight meet in the tournament', exact: q(1, 4),
    trial: (rng: Rng) => {
      // Random places for players 0 and 1 among 8, fair matches; do they meet?
      const places = [0, 1, 2, 3, 4, 5, 6, 7];
      for (let i = 7; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [places[i], places[j]] = [places[j] as number, places[i] as number]; }
      const [x, y] = [places.indexOf(0), places.indexOf(1)];
      for (let r = 1; r <= 3; r++) {
        if ((x >> r) === (y >> r)) return true;
        if (rng() < 0.5) return false;
        if (rng() < 0.5) return false;
      }
      return false;
    },
  },
];

export const classicalProbability: TopicContent = {
  topicId: 'prob.classical-probability',
  goal: t`Model an experiment as a finite set of equally likely outcomes, with events as subsets, and compute ${math`P(A) = |A| / |\Omega|`} by counting.`,
  lesson: [
    { kind: 'p', text: t`IA Probability starts with classical probability. An experiment has a finite [[sample-space-classical|sample space]] ${mOmega}, the set of its possible outcomes, all equally likely. An event is a subset ${math`A \subseteq \Omega`}, and its probability is the share of the outcomes it contains.` },
    { kind: 'rule', text: t`${dmath`P(A) = \frac{|A|}{|\Omega|}.`} Then ${math`P(\Omega) = ${1}`}, ${math`P(A^{c}) = ${1} - P(A)`}, and if ${math`A`} and ${math`B`} are disjoint, ${math`P(A \cup B) = P(A) + P(B)`}: they come from counting.` },
    { kind: 'p', text: t`The work is in choosing ${mOmega} so that its outcomes really are equally likely. Two dice: the ${36} ordered pairs are; the ${11} totals are not. Halving a deck: the ${math`\binom{${52}}{${26}}`} choices of the first half are equally likely, so the chance of ${13} red cards in each half is ${math`\binom{${26}}{${13}}^{${2}} / \binom{${52}}{${26}} \approx ${Number(toFloat(deck).toFixed(4))}`}, much less than one half.` },
    { kind: 'p', text: t`One space can serve several questions. The tournament question's hint: for two players chosen at random among ${math`${2}^{n}`}, take their places in the draw. They meet in the first round with probability ${math`\frac{${1}}{${2}^{n} - ${1}}`}, and in some round with probability ${math`\frac{${1}}{${2}^{n - ${1}}}`}, by counting the ${math`${2}^{n} - ${1}`} matches among all ${math`\binom{${2}^{n}}{${2}}`} pairs.` },
    { kind: 'p', text: t`Mary tosses ${2} coins and John ${1}: of the ${8} equally likely outcomes, Mary has more heads in ${4}, so the probability is ${coins(2, 1)}. With ${3} coins against ${2} it is ${coins(3, 2)} again, which suggests a conjecture worth proving.` },
  ],
  examples: [
    workedCambridge(q2a),
    worked(butNot, { n: 100, a: 4, b: 6 }, t`Divisible by ${4} but not by ${6}`),
    worked(largerDie, { k: 4, kind: 'max' }, t`The larger of two dice`),
  ],
  generators: [butNot, moreHeads, largerDie],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['sample-space-classical'],
  claims,
  cambridge: [q2b, q2c, q3, q11, q11proof, q2space],
};
