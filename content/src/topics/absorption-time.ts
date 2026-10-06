/**
 * rw.absorption-time: the expected duration of a random walk with absorbing barriers, from
 * the first-step equation m_k = 1 + p m_(k+1) + q m_(k-1). From the IA Probability schedule
 * ("Mean time to absorption"), IA Probability Example Sheet 3 Q8(c) (the ±1 walk stopped at
 * |S_n| = a, with E(S_T) = μE(T); T is unbounded, so part (a) needs a truncation step), and
 * STEP 3 Statistics Q1 (2007 S3 Q13: the frog's expected number of jumps to the pond, an
 * absorption time on a line). Every answer is checked by solving the first-step equations
 * exactly or by listing every jump sequence; the STEP answer is compared with the solutions.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { math, t } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';
import { frogMean, meanSteps, rpow } from '../partv-a';

const SH3 = 'ia-prob-sheet-3' as const;
const S3 = 'step-s3-stats' as const;
const S3S = 'step-s3-stats-solutions' as const;
const distinctFrom = (right: string, xs: readonly string[]): number => new Set(xs.filter((x) => x !== right)).size;
const isHalf = (p: Rational): boolean => p.num * 2n === p.den;
/** Expected steps from k to absorption at 0 or N, by the closed form. */
function duration(k: number, N: number, p: Rational): Rational {
  if (isHalf(p)) return q(k * (N - k));
  const qq = sub(q(1), p);
  const rho = div(qq, p);
  const d = sub(qq, p);
  return sub(div(q(k), d), mul(div(q(N), d), div(sub(q(1), rpow(rho, k)), sub(q(1), rpow(rho, N)))));
}
/** E(T) for the walk from 0 stopped at ±a, by the closed form. */
function twoSidedTime(a: number, p: Rational): Rational {
  if (isHalf(p)) return q(a * a);
  const [pa, qa] = [rpow(p, a), rpow(sub(q(1), p), a)];
  return div(mul(q(a), sub(pa, qa)), mul(sub(p, sub(q(1), p)), add(pa, qa)));
}

// ---------------------------------------------------------------- the fair walk

interface FairP { k: number; N: number }
const fairMis = ({ k, N }: FairP): string[] => [String(k * N), String(N), String(Math.min(k, N - k) ** 2)];

const fairDuration = generator<FairP>({
  id: 'fair-duration',
  skill: 'Find the expected length of a fair game of gambler\'s ruin: m_k = k(N - k).',
  params: (rng) => {
    for (;;) {
      const N = int(rng, 3, 12);
      const p: FairP = { k: int(rng, 1, N - 1), N };
      if (distinctFrom(String(p.k * (p.N - p.k)), fairMis(p)) >= 2) return p;
    }
  },
  sane: ({ k, N }) => (k >= 1 && k < N ? null : 'out of range'),
  problem: ({ k, N }) => ({
    prompt: t`A gambler has £${k} and bets £${1} at a time at even chances, stopping when she has £${N} or nothing. What is the expected number of bets?`,
    answer: { kind: 'exact', expected: String(k * (N - k)) },
    solution: [
      t`Let ${math`m_{j}`} be the expected number of bets from £${math`j`}. Condition on the first bet, which counts ${1}: ${math`m_{j} = ${1} + \frac{${1}}{${2}}m_{j + ${1}} + \frac{${1}}{${2}}m_{j - ${1}}`}, with ${math`m_{${0}} = m_{${N}} = ${0}`}.`,
      t`The auxiliary equation has the double root ${1}, so the homogeneous solutions are ${math`A + Bj`}, and the constant needs the particular solution ${math`-j^{${2}}`}. The boundary values give ${math`m_{j} = j(${N} - j)`}, so ${math`m_{${k}} = ${k} \times ${N - k} = ${k * (N - k)}`}.`,
    ],
  }),
  solve: ({ k, N }) => str(meanSteps(0, N, q(1, 2))[k - 1] as Rational),
  misconceptions: (fp): Misconception[] => {
    const [x, y, z] = fairMis(fp);
    return [
      { response: x as string, why: t`The duration is the product of the distances to the two barriers, ${math`k(N - k)`}, not ${math`kN`}.` },
      { response: y as string, why: t`A fair walk does not head straight for a barrier: it wanders, taking ${math`k(N - k)`} steps on average.` },
      { response: z as string, why: t`Both distances matter: the walk can end at either barrier. Use ${math`k(N - k)`}.` },
    ];
  },
});

// ---------------------------------------------------------------- a biased walk

interface BiasP { k: number; N: number; p: Rational }
const BIASED: readonly Rational[] = [q(1, 3), q(2, 3), q(1, 4), q(3, 4), q(2, 5), q(3, 5)];
const biasMis = ({ k, N, p }: BiasP): string[] => {
  const d = sub(sub(q(1), p), p);
  return [String(k * (N - k)), str(div(q(k), d)), str(div(q(N - k), sub(q(0), d)))];
};

const biasedDuration = generator<BiasP>({
  id: 'biased-duration',
  skill: 'Find the expected duration of gambler\'s ruin with p ≠ q: the particular solution k/(q - p) plus A + Bρ^k.',
  params: (rng) => {
    for (;;) {
      const N = int(rng, 3, 6);
      const p: BiasP = { k: int(rng, 1, N - 1), N, p: pick(rng, BIASED) };
      if (distinctFrom(str(duration(p.k, p.N, p.p)), biasMis(p)) >= 2) return p;
    }
  },
  sane: ({ k, N, p }) => (k >= 1 && k < N && !isHalf(p) ? null : 'out of range'),
  problem: ({ k, N, p }) => {
    const qq = sub(q(1), p);
    const rho = div(qq, p);
    const d = sub(qq, p);
    return {
      prompt: t`A walk on ${math`${0}, ${1}, \ldots, ${N}`} starts at ${k} and steps up with probability ${p} or down otherwise, stopping at ${0} or ${N}. Find the expected number of steps until it stops.`,
      answer: { kind: 'exact', expected: str(duration(k, N, p)) },
      solution: [
        t`${math`m_{j} = ${1} + ${p}m_{j + ${1}} + ${qq}m_{j - ${1}}`} with ${math`m_{${0}} = m_{${N}} = ${0}`}. The homogeneous part has roots ${1} and ${math`\rho = \frac{q}{p} = ${rho}`}; since ${1} is a root, try ${math`Cj`}: ${math`Cj = ${1} + pC(j + ${1}) + qC(j - ${1})`} gives ${math`C = \frac{${1}}{q - p} = ${div(q(1), d)}`}.`,
        t`So ${math`m_{j} = \frac{j}{q - p} + A + B\rho^{j}`}, and the boundary values give ${math`m_{j} = \frac{j}{q - p} - \frac{N}{q - p} \cdot \frac{${1} - \rho^{j}}{${1} - \rho^{N}}`}. At ${math`j = ${k}`}: ${math`m_{${k}} = ${duration(k, N, p)}`}.`,
      ],
    };
  },
  solve: ({ k, N, p }) => str(meanSteps(0, N, p)[k - 1] as Rational),
  misconceptions: (bp): Misconception[] => {
    const [x, y, z] = biasMis(bp);
    return [
      { response: x as string, why: t`${math`k(N - k)`} is for a fair walk. With ${math`p = ${bp.p}`}, the drift changes the duration: solve with the particular solution ${math`\frac{k}{q - p}`}.` },
      { response: y as string, why: t`That is the particular solution alone. Add ${math`A + B\rho^{k}`} so that ${math`m_{${0}} = m_{N} = ${0}`}.` },
      { response: z as string, why: t`That is the time to drift the distance to the top at speed ${math`p - q`}, ignoring the chance of hitting ${0} first. Solve the first-step equation with both boundary values.` },
    ];
  },
});

// ---------------------------------------------------------------- from 0 to ±a

interface TwoP { a: number; p: Rational }
const ALL: readonly Rational[] = [q(1, 2), q(1, 2), q(1, 3), q(2, 3), q(1, 4), q(3, 4), q(2, 5), q(3, 5)];
const twoMis = ({ a, p }: TwoP): string[] => (isHalf(p) ? [String(a), String(2 * a), String(2 * a * a)] : [String(a * a), str(div(q(a), sub(q(1), mul(q(2), p)).num < 0n ? sub(mul(q(2), p), q(1)) : sub(q(1), mul(q(2), p)))), String(a)]);

const twoSided = generator<TwoP>({
  id: 'stopped-at-a',
  skill: 'Find E(T) for a walk from 0 stopped at ±a: a^2 when fair, and E(S_T)/E(X) otherwise.',
  params: (rng) => {
    for (;;) {
      const p: TwoP = { a: int(rng, 1, 4), p: pick(rng, ALL) };
      if (distinctFrom(str(twoSidedTime(p.a, p.p)), twoMis(p)) >= 2) return p;
    }
  },
  sane: ({ a }) => (a >= 1 ? null : 'out of range'),
  problem: ({ a, p }) => {
    const qq = sub(q(1), p);
    const h = div(rpow(p, a), add(rpow(p, a), rpow(qq, a)));
    return {
      prompt: t`A walk starts at ${0} and steps up with probability ${p} or down otherwise. It stops at the first time ${math`T`} that ${math`|S_{n}| = ${a}`}. Find ${math`E(T)`}.`,
      answer: { kind: 'exact', expected: str(twoSidedTime(a, p)) },
      solution: isHalf(p)
        ? [
            t`Shift by ${a}: gambler's ruin from ${a} on ${math`${0}, \ldots, ${2 * a}`}, fair, so ${math`m_{${a}} = ${a}(${2 * a} - ${a}) = ${a * a}`}.`,
            t`So ${math`E(T) = ${a * a}`}, the square of the distance, as for any fair walk started midway.`,
          ]
        : [
            t`The walk stops at ${a} with probability ${math`h = \frac{p^{${a}}}{p^{${a}} + q^{${a}}} = ${h}`}, so ${math`E(S_{T}) = ${a}(${2}h - ${1}) = ${mul(q(a), sub(mul(q(2), h), q(1)))}`}.`,
            t`One step has mean ${math`\mu = p - q = ${sub(p, qq)}`}, and ${math`E(S_{T}) = \mu E(T)`} (Example Sheet ${3} Q${8}(c)), so ${math`E(T) = \frac{${mul(q(a), sub(mul(q(2), h), q(1)))}}{${sub(p, qq)}} = ${twoSidedTime(a, p)}`}.`,
          ],
    };
  },
  solve: ({ a, p }) => str(meanSteps(-a, a, p)[a - 1] as Rational),
  misconceptions: (tp): Misconception[] => {
    const [x, y, z] = twoMis(tp);
    return isHalf(tp.p)
      ? [
          { response: x as string, why: t`The walk does not go straight out: a fair walk takes about the square of the distance, ${math`a^{${2}}`} steps.` },
          { response: y as string, why: t`The duration grows like the square of the distance, ${math`a^{${2}}`}, not linearly.` },
          { response: z as string, why: t`Shifted, the walk starts midway between barriers ${math`${2}a`} apart: ${math`k(N - k) = a \times a`}.` },
        ]
      : [
          { response: x as string, why: t`${math`a^{${2}}`} is for a fair walk. With drift, use ${math`E(T) = \frac{E(S_{T})}{\mu}`}.` },
          { response: y as string, why: t`That assumes the walk always exits at the end it drifts towards. It can exit at the other end: ${math`E(S_{T}) = a(${2}h - ${1})`}, not ${math`a`}.` },
          { response: z as string, why: t`At least ${tp.a} steps are needed, and usually more: the walk can step back.` },
        ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const AP_DOM = { a: { kind: 'integer' as const, min: 1, max: 6 }, p: { kind: 'real' as const, min: 0.1, max: 0.9 } };
const q8time = auto({
  id: 'sheet3-q8c-mean-time',
  source: cite(SH3, 'Q8(c)', true),
  title: t`Stopped at ${math`\pm a`}: the mean time`,
  prompt: t`The steps ${math`X_{i}`} are independent, each ${1} with probability ${math`p \ne \frac{${1}}{${2}}`} and ${math`-${1}`} otherwise, so ${math`\mu = E(X_{${1}}) = ${2}p - ${1}`}. With ${math`T = \min\{n \ge ${0} : |S_{n}| = a\}`}, part (c) shows ${math`E(S_{T}) = \mu E(T)`}. Find ${math`E(T)`} in terms of ${math`a`} and ${math`p`}.`,
  answer: { kind: 'expression', expected: 'a(p^a - (1 - p)^a)/((2p - 1)(p^a + (1 - p)^a))', variables: ['a', 'p'], domains: AP_DOM },
  solution: [
    t`By gambler's ruin shifted by ${math`a`}, ${math`P(S_{T} = a) = h = \frac{p^{a}}{p^{a} + q^{a}}`}, so ${math`E(S_{T}) = a(${2}h - ${1}) = \frac{a(p^{a} - q^{a})}{p^{a} + q^{a}}`}.`,
    t`Divide by ${math`\mu = ${2}p - ${1}`}: ${math`E(T) = \frac{a(p^{a} - q^{a})}{(${2}p - ${1})(p^{a} + q^{a})}`}. As ${math`p \to \frac{${1}}{${2}}`} this tends to ${math`a^{${2}}`}, the fair value.`,
  ],
  reference: 'a(p^a - (1 - p)^a)/((2p - 1)(p^a + (1 - p)^a))',
  verify: () => {
    for (const p of [q(1, 3), q(3, 5), q(1, 4), q(4, 5)]) {
      for (let a = 1; a <= 5; a++) {
        const e = same(`p = ${str(p)}, a = ${a}, the first-step equations`, str(meanSteps(-a, a, p)[a - 1] as Rational), str(twoSidedTime(a, p)));
        if (e !== null) return e;
      }
    }
    return null;
  },
  misconceptions: [{ response: 'a/(2p - 1)', why: t`That takes ${math`E(S_{T}) = a`}, as if the walk always left at the top. It can leave at ${math`-a`}.` }],
});

const Q_DOM = { q: { kind: 'real' as const, min: 0.05, max: 0.95 } };
const u2 = auto({
  id: 's3-q1-ii-u2',
  source: cite(S3, 'Q1(ii)'),
  title: t`The frog from one and a half metres`,
  prompt: t`A frog jumps towards a large pond, each jump ${1} m with probability ${math`p`} or ${2} m with probability ${math`q = ${1} - p`}, independently. Find ${math`u_{${2}}`}, the expected number of jumps to land in the pond starting ${math`${1}\frac{${1}}{${2}}`} m from the edge, in terms of ${math`q`}.`,
  answer: { kind: 'expression', expected: '2 - q', variables: ['q'], domains: Q_DOM },
  solution: [
    t`A ${2} m jump lands in the pond at once (probability ${math`q`}); a ${1} m jump leaves the frog half a metre away, and the next jump lands whatever it is (probability ${math`p`}, two jumps).`,
    t`${math`u_{${2}} = q + ${2}p = ${2} - q`}. As a first-step equation: ${math`u_{${2}} = ${1} + p u_{${1}} + q u_{${0}}`} with ${math`u_{${1}} = ${1}`} and ${math`u_{${0}} = ${0}`}: the pond absorbs the frog.`,
  ],
  reference: '2 - q',
  verify: () => {
    for (const qq of [q(1, 3), q(1, 2), q(3, 4)]) {
      const e = same(`q = ${str(qq)}, every jump sequence`, str(frogMean(2, qq)), str(sub(q(2), qq)));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: '1 + q', why: t`The ${2} m jump takes one jump and the ${1} m start takes two: ${math`q \times ${1} + p \times ${2} = ${2} - q`}.` }],
  official: { source: cite(S3S, 'Q1(ii)'), answer: '2 - q', agrees: true },
});

const u4 = auto({
  id: 's3-q1-u4',
  source: cite(S3, 'Q1', true),
  title: t`The frog from three and a half metres`,
  prompt: t`For the frog (jumps of ${1} m with probability ${math`p`}, ${2} m with probability ${math`q = ${1} - p`}), ${math`u_{n}`} is the expected number of jumps to reach the pond from ${math`n - \frac{${1}}{${2}}`} m. Conditioning on the first jump gives ${math`u_{n} = ${1} + pu_{n - ${1}} + qu_{n - ${2}}`}, with ${math`u_{${2}} = ${2} - q`} and ${math`u_{${3}} = ${3} - ${2}q + q^{${2}}`}. Find ${math`u_{${4}}`} as a polynomial in ${math`q`}.`,
  answer: { kind: 'expression', expected: '4 - 3q + 2q^2 - q^3', variables: ['q'], domains: Q_DOM },
  solution: [
    t`${math`u_{${4}} = ${1} + (${1} - q)(${3} - ${2}q + q^{${2}}) + q(${2} - q)`}.`,
    t`${math`= ${1} + ${3} - ${5}q + ${3}q^{${2}} - q^{${3}} + ${2}q - q^{${2}} = ${4} - ${3}q + ${2}q^{${2}} - q^{${3}}`}.`,
  ],
  reference: '4 - 3q + 2q^2 - q^3',
  verify: () => {
    for (const qq of [q(1, 3), q(1, 2), q(3, 4), q(1, 10)]) {
      const poly = add(sub(q(4), mul(q(3), qq)), sub(mul(q(2), rpow(qq, 2)), rpow(qq, 3)));
      const e = same(`q = ${str(qq)}, every jump sequence`, str(frogMean(4, qq)), str(poly));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: '1 + (1 - q)(3 - 2q + q^2)', why: t`A ${2} m first jump leaves ${math`u_{${2}}`} jumps still to go: include ${math`q u_{${2}}`}.` }],
});

const symmetric = auto({
  id: 'sheet3-q8c-symmetric',
  source: cite(SH3, 'Q8(c)', true),
  title: t`The symmetric case`,
  prompt: t`A fair ${math`\pm ${1}`} walk starts at ${0} and stops at the first time ${math`T`} that ${math`|S_{n}| = ${3}`}. Find ${math`E(T)`}.`,
  answer: { kind: 'exact', expected: str(meanSteps(-3, 3, q(1, 2))[2] as Rational) },
  solution: [
    t`Here ${math`\mu = ${0}`}, so ${math`E(S_{T}) = \mu E(T)`} says nothing about ${math`E(T)`}. Shift by ${3}: fair gambler's ruin from ${3} on ${math`${0}, \ldots, ${6}`}, with ${math`m_{k} = k(${6} - k)`}.`,
    t`${math`E(T) = ${3} \times ${3} = ${9}`}. (Equivalently, ${math`S_{n}^{${2}} - n`} has constant mean, so ${math`E(T) = E(S_{T}^{${2}}) = ${9}`}.)`,
  ],
  reference: '9',
  verify: () => same('the first-step equations', str(meanSteps(-3, 3, q(1, 2))[2] as Rational), '9'),
  misconceptions: [{ response: '3', why: t`The walk does not head straight out. A fair walk needs about the square of the distance: ${9} steps on average.` }],
});

const wald = supervision({
  id: 'sheet3-q8c-wald',
  source: cite(SH3, 'Q8(c)'),
  title: t`${math`E(S_{T}) = \mu E(T)`}, with care`,
  prompt: t`Part (a) shows ${math`E(S_{N}) = \mu E(N)`} for a bounded random time ${math`N`} independent of the steps. ${math`T = \min\{n : |S_{n}| = a\}`} is neither bounded nor independent of the steps. Prove ${math`E(S_{T}) = \mu E(T)`} by applying the argument to ${math`T \wedge m = \min(T, m)`}, using that the event ${math`\{T \ge k\}`} depends only on ${math`X_{${1}}, \ldots, X_{k - ${1}}`}, and then letting ${math`m \to \infty`}. Then find ${math`\mathrm{var}(S_{T})`}.`,
  writeUp: 'proof',
});
const schedule = supervision({
  id: 'schedule-mean-absorption',
  source: cite('tripos-schedules', 'IA Probability, Discrete random variables: "Mean time to absorption"', true),
  title: t`Mean time to absorption`,
  prompt: t`For the walk on ${math`${0}, \ldots, N`} stepping up with probability ${math`p`} and down with ${math`q`}, absorbed at both ends, let ${math`m_{k}`} be the expected time to absorption from ${math`k`}. Explain why ${math`m_{k} = ${1} + pm_{k + ${1}} + qm_{k - ${1}}`} (which conditional expectation is used?), and solve it: show ${math`m_{k} = k(N - k)`} when ${math`p = q`}, and find ${math`m_{k}`} when ${math`p \ne q`}. Why is ${math`m_{k}`} finite?`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

export const absorptionTime: TopicContent = {
  topicId: 'rw.absorption-time',
  goal: t`Find the expected duration of a random walk with absorbing barriers from the first-step equation ${math`m_{k} = ${1} + pm_{k + ${1}} + qm_{k - ${1}}`}.`,
  lesson: [
    { kind: 'p', text: t`A walk on ${math`${0}, ${1}, \ldots, N`} stepping up with probability ${math`p`} and down with ${math`q`} is absorbed at ${0} or ${math`N`}. Its [[expected-duration|expected duration]] ${math`m_{k}`} from ${math`k`} is the mean time to absorption.` },
    { kind: 'rule', text: t`Conditioning on the first step, which takes one unit of time: ${math`m_{k} = ${1} + pm_{k + ${1}} + qm_{k - ${1}}`} for ${math`${0} < k < N`}, with ${math`m_{${0}} = m_{N} = ${0}`}.` },
    { kind: 'p', text: t`It is the gambler's ruin equation with a constant term, so it needs a particular solution. For ${math`p = q`}, ${1} is a double root and the particular solution is ${math`-k^{${2}}`}: ${math`m_{k} = k(N - k)`}. A fair gambler with £${5} aiming for £${10} expects ${25} bets.` },
    { kind: 'p', text: t`For ${math`p \ne q`}, ${1} is a simple root and the particular solution is ${math`\frac{k}{q - p}`}: ${math`m_{k} = \frac{k}{q - p} - \frac{N}{q - p} \cdot \frac{${1} - \rho^{k}}{${1} - \rho^{N}}`}, with ${math`\rho = \frac{q}{p}`}. The same method gives the frog's expected jumps in STEP ${3} Statistics Q${1}: ${math`u_{n} = ${1} + pu_{n - ${1}} + qu_{n - ${2}}`}, where the pond absorbs.` },
    { kind: 'p', text: t`Example Sheet ${3} Q${8}(c) gives another route. For the walk from ${0} stopped at ${math`|S_{n}| = a`}, ${math`E(S_{T}) = \mu E(T)`} with ${math`\mu = p - q`}, so ${math`E(T) = \frac{E(S_{T})}{\mu}`} when ${math`\mu \ne ${0}`}. Proving it needs care: ${math`T`} is unbounded, so apply the bounded case to ${math`\min(T, m)`} and let ${math`m \to \infty`}. In the fair case ${math`E(T) = a^{${2}}`}.` },
  ],
  examples: [
    workedCambridge(q8time),
    worked(fairDuration, { k: 3, N: 8 }, t`A fair game from £${3} to £${8}`),
    worked(biasedDuration, { k: 2, N: 4, p: q(2, 3) }, t`A biased walk on ${math`${0}, \ldots, ${4}`}`),
  ],
  generators: [fairDuration, biasedDuration, twoSided],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['expected-duration'],
  cambridge: [u2, u4, symmetric, wald, schedule],
};
