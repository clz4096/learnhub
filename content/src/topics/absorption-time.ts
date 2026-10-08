/**
 * rw.absorption-time: the expected duration of a random walk with absorbing barriers, from
 * the first-step equation m_k = 1 + p m_(k+1) + q m_(k-1). From the IA Probability schedule
 * ("Mean time to absorption"), IA Probability Example Sheet 3 Q8(c) (the ±1 walk stopped at
 * |S_n| = a, with E(S_T) = μE(T); T is unbounded, so part (a) needs a truncation step), and
 * STEP 3 Statistics Q1 (2007 S3 Q13: the frog's expected number of jumps to the pond, an
 * absorption time on a line). Every answer is checked by solving the first-step equations
 * exactly or by listing every jump sequence; the STEP answer is compared with the solutions.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { dmath, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';
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
/** Biased walks only: the fair walk stopped at ±a is a gate problem (sheet3-q8c-symmetric), so practice never states its value. */
const ALL: readonly Rational[] = [q(1, 3), q(2, 3), q(1, 4), q(3, 4), q(2, 5), q(3, 5)];
const twoMis = ({ a, p }: TwoP): string[] => [String(a * a), str(div(q(a), sub(q(1), mul(q(2), p)).num < 0n ? sub(mul(q(2), p), q(1)) : sub(q(1), mul(q(2), p)))), String(a)];

const twoSided = generator<TwoP>({
  id: 'stopped-at-a',
  skill: 'Find E(T) for a biased walk from 0 stopped at ±a, as E(S_T)/E(X).',
  params: (rng) => {
    for (;;) {
      const p: TwoP = { a: int(rng, 1, 4), p: pick(rng, ALL) };
      if (distinctFrom(str(twoSidedTime(p.a, p.p)), twoMis(p)) >= 2) return p;
    }
  },
  sane: ({ a, p }) => (a >= 1 && !isHalf(p) ? null : 'out of range'),
  problem: ({ a, p }) => {
    const qq = sub(q(1), p);
    const h = div(rpow(p, a), add(rpow(p, a), rpow(qq, a)));
    return {
      prompt: t`A walk starts at ${0} and steps up with probability ${p} or down otherwise. It stops at the first time ${math`T`} that ${math`|S_{n}| = ${a}`}. Find ${math`E(T)`}.`,
      answer: { kind: 'exact', expected: str(twoSidedTime(a, p)) },
      solution: [
        t`The walk stops at ${a} with probability ${math`h = \frac{p^{${a}}}{p^{${a}} + q^{${a}}} = ${h}`}, so ${math`E(S_{T}) = ${a}(${2}h - ${1}) = ${mul(q(a), sub(mul(q(2), h), q(1)))}`}.`,
        t`One step has mean ${math`\mu = p - q = ${sub(p, qq)}`}, and ${math`E(S_{T}) = \mu E(T)`} (Example Sheet ${3} Q${8}(c)), so ${math`E(T) = \frac{${mul(q(a), sub(mul(q(2), h), q(1)))}}{${sub(p, qq)}} = ${twoSidedTime(a, p)}`}.`,
      ],
    };
  },
  solve: ({ a, p }) => str(meanSteps(-a, a, p)[a - 1] as Rational),
  misconceptions: (tp): Misconception[] => {
    const [x, y, z] = twoMis(tp);
    return [
      { response: x as string, why: t`That ignores the drift. With drift, find ${math`E(S_{T})`} from the chance of leaving at the top, then ${math`E(T) = \frac{E(S_{T})}{\mu}`}.` },
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
    t`Divide by ${math`\mu = ${2}p - ${1}`}, which is not zero since ${math`p \ne \frac{${1}}{${2}}`}: ${math`E(T) = \frac{a(p^{a} - q^{a})}{(${2}p - ${1})(p^{a} + q^{a})}`}.`,
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
  hints: [
    t`What can the first jump from ${math`${1}\frac{${1}}{${2}}`} m be, and with what probabilities?`,
    t`After each possible first jump, how far is the frog from the pond, and how many more jumps does it need?`,
    t`Conditioning on the first jump, which weighted average of jump counts is ${math`u_{${2}}`}?`,
  ],
  nudge: t`Not quite. Condition on the first jump: each of the two cases is short.`,
  solution: [
    t`Condition on the first jump. A ${2} m jump (probability ${math`q`}) lands in the pond: one jump.`,
    t`A ${1} m jump (probability ${math`p`}) leaves ${math`\frac{${1}}{${2}}`} m, and the next jump lands whatever its length: two jumps.`,
    t`${math`u_{${2}} = q \cdot ${1} + p \cdot ${2} = q + ${2}(${1} - q) = ${2} - q`}.`,
    t`Condition on the first jump; each case is then a short count.`,
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
  hints: [
    t`Which two earlier values does the recurrence need for ${math`u_{${4}}`}?`,
    t`With ${math`p = ${1} - q`}, what is ${math`p\,u_{${3}}`} as a polynomial in ${math`q`}?`,
    t`After adding ${1} and ${math`q\,u_{${2}}`}, which like powers of ${math`q`} combine?`,
  ],
  nudge: t`Not quite. Substitute the two given values, write ${math`p`} as ${math`${1} - q`}, and collect powers of ${math`q`} only at the end.`,
  solution: [
    t`${math`u_{${4}} = ${1} + p\,u_{${3}} + q\,u_{${2}} = ${1} + (${1} - q)(${3} - ${2}q + q^{${2}}) + q(${2} - q)`}.`,
    t`${math`(${1} - q)(${3} - ${2}q + q^{${2}}) = ${3} - ${5}q + ${3}q^{${2}} - q^{${3}}`} and ${math`q(${2} - q) = ${2}q - q^{${2}}`}.`,
    t`${math`u_{${4}} = ${4} - ${3}q + ${2}q^{${2}} - q^{${3}}`}.`,
    t`Substitute, expand each product, then collect powers.`,
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
  hints: [
    t`What is ${math`\mu`} for a fair walk, and what does ${math`E(S_{T}) = \mu E(T)`} then say about ${math`E(T)`}?`,
    t`Shifted up by ${3}, where does the walk start, and where are the two absorbing barriers?`,
    t`What is the expected duration of a fair walk from ${math`k`} on ${math`${0}, \ldots, N`}?`,
  ],
  nudge: t`Not quite. A fair walk wanders rather than heading straight out; treat it as gambler's ruin on a shifted line.`,
  solution: [
    t`${math`\mu = ${0}`}, so ${math`E(S_{T}) = \mu E(T)`} gives no information about ${math`E(T)`}.`,
    t`Shift by ${3}: fair gambler's ruin from ${3} on ${math`${0}, \ldots, ${6}`}, with ${math`m_{k} = k(${6} - k)`}.`,
    t`${math`E(T) = m_{${3}} = ${3} \times ${3} = ${9}`}. (Equivalently, ${math`S_{n}^{${2}} - n`} has constant mean, so ${math`E(T) = E(S_{T}^{${2}}) = ${9}`}.)`,
    t`With no drift, Wald's identity is silent: shift to gambler's ruin.`,
  ],
  reference: '9',
  verify: () => same('the first-step equations', str(meanSteps(-3, 3, q(1, 2))[2] as Rational), '9'),
  misconceptions: [{ response: '3', why: t`The walk does not head straight out: a fair walk wanders back and forth, so it needs far more steps than the distance.` }],
});

const wald = supervision({
  id: 'sheet3-q8c-wald',
  source: cite(SH3, 'Q8(c)'),
  title: t`${math`E(S_{T}) = \mu E(T)`}, with care`,
  prompt: t`Part (a) shows ${math`E(S_{N}) = \mu E(N)`} for a bounded random time ${math`N`} independent of the steps. ${math`T = \min\{n : |S_{n}| = a\}`} is neither bounded nor independent of the steps. Prove ${math`E(S_{T}) = \mu E(T)`} by applying the argument to ${math`T \wedge m = \min(T, m)`}, using that the event ${math`\{T \ge k\}`} depends only on ${math`X_{${1}}, \ldots, X_{k - ${1}}`}, and then letting ${math`m \to \infty`}. Then find ${math`\mathrm{var}(S_{T})`}.`,
  hints: [
    t`For the bounded time ${math`T \wedge m`}, why is the event ${math`\{T \wedge m \ge k\}`} decided by ${math`X_{${1}}, \ldots, X_{k - ${1}}`} alone?`,
    t`Writing ${math`S_{T \wedge m} = \sum_{k = ${1}}^{m} X_{k} \mathbf{${1}}\{T \ge k\}`}, what is the expectation of each term?`,
    t`As ${math`m \to \infty`}, which convergence theorems carry ${math`E(T \wedge m)`} and ${math`E(S_{T \wedge m})`} to their limits, given ${math`|S_{T \wedge m}| \le a`}?`,
  ],
  writeUp: 'proof',
});
const schedule = supervision({
  id: 'schedule-mean-absorption',
  source: cite('tripos-schedules', 'IA Probability, Discrete random variables: "Mean time to absorption"', true),
  title: t`Mean time to absorption`,
  prompt: t`For the walk on ${math`${0}, \ldots, N`} stepping up with probability ${math`p`} and down with ${math`q`}, absorbed at both ends, let ${math`m_{k}`} be the expected time to absorption from ${math`k`}. Explain why ${math`m_{k} = ${1} + pm_{k + ${1}} + qm_{k - ${1}}`} (which conditional expectation is used?), and solve it: show ${math`m_{k} = k(N - k)`} when ${math`p = q`}, and find ${math`m_{k}`} when ${math`p \ne q`}. Why is ${math`m_{k}`} finite?`,
  hints: [
    t`After the first step from ${math`k`}, where is the walk, and how many steps have been used?`,
    t`Which conditional expectation, given the first step, turns that observation into an equation for ${math`m_{k}`}?`,
    t`For ${math`p = q`}, which quadratic in ${math`k`} fits the equation and both boundary values; for ${math`p \ne q`}, which particular solution linear in ${math`k`} can be added to the homogeneous solution?`,
  ],
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

export const absorptionTime: TopicContent = {
  topicId: 'rw.absorption-time',
  goal: t`Find the expected duration of a random walk with absorbing barriers from the first-step equation ${math`m_{k} = ${1} + pm_{k + ${1}} + qm_{k - ${1}}`}.`,
  objective: t`Find how long a random walk with absorbing barriers lasts on average, by a first-step equation.`,
  why: t`Gambler's ruin says who wins; this says how long it takes, and leads to Wald's identity.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`How long does the game last?` },
    { kind: 'hook', text: t`A gambler has £${5}. She bets £${1} at a time on a fair coin, and stops when she has £${10} or nothing. You already know she wins with probability ${q(5, 10)}. But how many bets does the game take, on average? You might guess about ${5}. The answer is ${5 * (10 - 5)}.` },
    { kind: 'narrative', text: t`Why so many? Because a fair walk does not march towards a barrier. It wanders: up, down, down, up, often undoing its own progress. To find the true average we need a way to count all that wandering at once, and the trick is the same one that solved gambler's ruin: look at the first step only.` },
    { kind: 'section', title: t`The first-step equation` },
    { kind: 'narrative', text: t`First, pin down the objects. The walk lives on the whole numbers ${math`${0}, ${1}, \ldots, N`}. Each step is up one with probability ${math`p`} and down one with probability ${math`q = ${1} - p`}, independently of all other steps. When it reaches ${0} or ${math`N`} it stops for good.` },
    {
      kind: 'definition',
      name: t`Absorption time, expected duration`,
      formal: t`Let ${math`${0} < p < ${1}`}, ${math`q = ${1} - p`}, and let ${math`S_{n} = k + X_{${1}} + \cdots + X_{n}`}, where the ${math`X_{i}`} are independent with ${math`P(X_{i} = ${1}) = p`} and ${math`P(X_{i} = -${1}) = q`}, and ${math`${0} \le k \le N`}. The absorption time is ${math`T = \min\{n \ge ${0} : S_{n} \in \{${0}, N\}\}`}, and the [[expected-duration|expected duration]] from ${math`k`} is ${math`m_{k} = E_{k}(T)`}, the mean of ${math`T`} for the walk started at ${math`k`}.`,
      plain: t`${math`T`} counts the steps until the walk first hits a barrier, and ${math`m_{k}`} is the average of that count when you start at ${math`k`}. The states ${0} and ${math`N`} are [[absorbing-barrier|absorbing barriers]]. For the gambler, ${math`k = ${5}`}, ${math`N = ${10}`}, and ${math`m_{${5}}`} is the average number of bets.`,
    },
    {
      kind: 'theorem',
      name: t`First-step equation for the duration`,
      statement: t`Every ${math`m_{k}`} is finite, ${math`m_{${0}} = m_{N} = ${0}`}, and for ${math`${0} < k < N`}, ${dmath`m_{k} = ${1} + p\,m_{k + ${1}} + q\,m_{k - ${1}}.`}`,
    },
    {
      kind: 'steps',
      proof: true,
      steps: [
        {
          label: t`The barriers`,
          text: t`If ${math`k = ${0}`} or ${math`k = N`}, then ${math`S_{${0}}`} is already a barrier, so ${math`T = ${0}`} and ${math`m_{${0}} = m_{N} = ${0}`}.`,
          plain: t`A walk that starts on a barrier takes no steps at all.`,
        },
        {
          label: t`The duration is finite`,
          text: t`In any ${math`N`} consecutive steps, all are up with probability ${math`p^{N} > ${0}`}, and a run of ${math`N`} up steps from anywhere in ${math`${0}, \ldots, N`} hits ${math`N`}. So ${math`P(T > jN) \le (${1} - p^{N})^{j}`}, and ${math`m_{k} = \sum_{n \ge ${0}} P(T > n) \le N \sum_{j \ge ${0}} (${1} - p^{N})^{j} = \frac{N}{p^{N}}`}.`,
          plain: t`The walk gets a fresh chance to escape in every block of ${math`N`} steps, so a very long game is exponentially unlikely.`,
          why: { q: t`Why is ${math`P(T > jN) \le (${1} - p^{N})^{j}`}?`, a: t`To survive ${math`jN`} steps, the walk must fail to make ${math`N`} up steps in a row in each of ${math`j`} separate blocks of ${math`N`} steps. The blocks use different steps, so they are independent, and each fails with probability at most ${math`${1} - p^{N}`}. The sum ${math`E(T) = \sum_{n \ge ${0}} P(T > n)`} is the tail sum formula for a random variable taking values ${math`${0}, ${1}, ${2}, \ldots`}; each block of ${math`N`} terms is at most ${math`N(${1} - p^{N})^{j}`}.` },
        },
        {
          label: t`Condition on the first step`,
          text: t`For ${math`${0} < k < N`}, by the law of total expectation, ${dmath`m_{k} = p\,E_{k}(T \mid X_{${1}} = ${1}) + q\,E_{k}(T \mid X_{${1}} = -${1}).`}`,
          plain: t`Split the average by what the first step does, weighting each case by its probability.`,
        },
        {
          label: t`Restart the walk`,
          text: t`Given ${math`X_{${1}} = ${1}`}, the walk is at ${math`k + ${1}`} after one step, and from there it moves by ${math`X_{${2}}, X_{${3}}, \ldots`}, which are independent of ${math`X_{${1}}`}. So ${math`E_{k}(T \mid X_{${1}} = ${1}) = ${1} + m_{k + ${1}}`}, and likewise ${math`E_{k}(T \mid X_{${1}} = -${1}) = ${1} + m_{k - ${1}}`}.`,
          plain: t`One step is already used, and the rest is a brand new walk from the new position.`,
          why: { q: t`Why can't the walk have stopped already?`, a: t`Because ${math`${0} < k < N`}, the walk is not on a barrier at time ${0}, so ${math`T \ge ${1}`}: the first step is always taken. If ${math`k + ${1} = N`}, the restarted walk is on a barrier and ${math`m_{N} = ${0}`} adds nothing, which is right.` },
        },
        {
          label: t`Substitute`,
          text: t`${math`m_{k} = p(${1} + m_{k + ${1}}) + q(${1} + m_{k - ${1}}) = ${1} + p\,m_{k + ${1}} + q\,m_{k - ${1}}`}, since ${math`p + q = ${1}`}.`,
          plain: t`The two copies of the used step add up to exactly one step.`,
        },
      ],
    },
    { kind: 'p', text: t`Compare it with the gambler's ruin equation ${math`h_{k} = p\,h_{k + ${1}} + q\,h_{k - ${1}}`}. The only new thing is the ${1} in front: each step costs one unit of time. That ${1} makes the equation inhomogeneous, so solving it needs a particular solution as well as the homogeneous ones.` },
    { kind: 'section', title: t`Solving it: the fair walk` },
    { kind: 'narrative', text: t`Take ${math`p = q = \frac{${1}}{${2}}`} first. The plan is the standard one for a linear recurrence: find every solution of the equation without the ${1}, find one solution with it, and add them.` },
    {
      kind: 'theorem',
      name: t`Fair walk`,
      statement: t`If ${math`p = q = \frac{${1}}{${2}}`}, then ${math`m_{k} = k(N - k)`} for ${math`${0} \le k \le N`}.`,
    },
    {
      kind: 'steps',
      proof: true,
      steps: [
        {
          label: t`The homogeneous part`,
          text: t`${math`u_{k} = \frac{${1}}{${2}}u_{k + ${1}} + \frac{${1}}{${2}}u_{k - ${1}}`} has auxiliary equation ${math`\frac{${1}}{${2}}\lambda^{${2}} - \lambda + \frac{${1}}{${2}} = ${0}`}, that is ${math`(\lambda - ${1})^{${2}} = ${0}`}: a double root ${math`\lambda = ${1}`}. So its solutions are ${math`u_{k} = A + Bk`}.`,
          plain: t`Without the ${1}, any straight line in ${math`k`} works.`,
        },
        {
          label: t`A particular solution`,
          text: t`Constants and multiples of ${math`k`} solve the homogeneous equation, so they cannot produce the ${1}. Try ${math`Ck^{${2}}`}: ${math`\frac{${1}}{${2}}C(k + ${1})^{${2}} + \frac{${1}}{${2}}C(k - ${1})^{${2}} = C(k^{${2}} + ${1})`}, so we need ${math`Ck^{${2}} = ${1} + Ck^{${2}} + C`}, that is ${math`C = -${1}`}.`,
          plain: t`Average ${math`(k + ${1})^{${2}}`} and ${math`(k - ${1})^{${2}}`}: the cross terms ${math`\pm ${2}k`} cancel and you get ${math`k^{${2}} + ${1}`}. (At ${math`k = ${3}`}: ${(3 + 1) ** 2} and ${(3 - 1) ** 2} average to ${3 ** 2 + 1}.)`,
        },
        {
          label: t`The general solution`,
          text: t`${math`m_{k} = A + Bk - k^{${2}}`}.`,
          plain: t`A solution of the full equation plus any homogeneous solution is again a solution, and every solution has this form.`,
          why: { q: t`Why does every solution have this form?`, a: t`If ${math`m`} and ${math`m'`} both solve the full equation, their difference solves the homogeneous one, so it is ${math`A + Bk`}. Take ${math`m' = -k^{${2}}`}.` },
        },
        {
          label: t`Use the barriers`,
          text: t`${math`m_{${0}} = ${0}`} gives ${math`A = ${0}`}. ${math`m_{N} = ${0}`} gives ${math`BN - N^{${2}} = ${0}`}, so ${math`B = N`}. Hence ${math`m_{k} = Nk - k^{${2}} = k(N - k)`}.`,
          plain: t`For the gambler, ${math`m_{${5}} = ${5} \times ${10 - 5} = ${5 * (10 - 5)}`} bets.`,
        },
      ],
    },
    { kind: 'p', text: t`Read the answer: the product of the distances to the two barriers, which grows much faster than the distance to the nearer one. That growth is the signature of a fair random walk.` },
    checkFrom(fairDuration, { k: 2, N: 7 }, t`The distances to the barriers are ${2} and ${7 - 2}, and the duration is their product, ${2 * (7 - 2)}.`),
    { kind: 'section', title: t`Solving it: a biased walk` },
    { kind: 'narrative', text: t`Now let ${math`p \ne q`}. The same plan works, but the homogeneous solutions change, and so does the particular solution we must try.` },
    {
      kind: 'theorem',
      name: t`Biased walk`,
      statement: t`If ${math`p \ne q`} and ${math`\rho = \frac{q}{p}`}, then for ${math`${0} \le k \le N`}, ${dmath`m_{k} = \frac{k}{q - p} - \frac{N}{q - p} \cdot \frac{${1} - \rho^{k}}{${1} - \rho^{N}}.`}`,
    },
    {
      kind: 'steps',
      proof: true,
      steps: [
        {
          label: t`The homogeneous part`,
          text: t`The auxiliary equation ${math`p\lambda^{${2}} - \lambda + q = ${0}`} factorises as ${math`(\lambda - ${1})(p\lambda - q) = ${0}`}, with roots ${1} and ${math`\rho = \frac{q}{p} \ne ${1}`}. So the homogeneous solutions are ${math`A + B\rho^{k}`}.`,
          why: { q: t`Why does it factorise like that?`, a: t`Expand: ${math`(\lambda - ${1})(p\lambda - q) = p\lambda^{${2}} - (p + q)\lambda + q`}, and ${math`p + q = ${1}`}.` },
        },
        {
          label: t`A particular solution`,
          text: t`Constants are homogeneous solutions, so try ${math`Ck`}: ${math`Ck = ${1} + pC(k + ${1}) + qC(k - ${1}) = ${1} + Ck + C(p - q)`}. So ${math`C(q - p) = ${1}`} and ${math`C = \frac{${1}}{q - p}`}.`,
          plain: t`A walk drifting towards ${0} at speed ${math`q - p`} per step covers distance ${math`k`} in about ${math`\frac{k}{q - p}`} steps: that is the particular solution.`,
        },
        {
          label: t`The general solution`,
          text: t`${math`m_{k} = \frac{k}{q - p} + A + B\rho^{k}`}.`,
        },
        {
          label: t`Use the barriers`,
          text: t`${math`m_{${0}} = ${0}`} gives ${math`A = -B`}. Then ${math`m_{N} = ${0}`} gives ${math`\frac{N}{q - p} + B(\rho^{N} - ${1}) = ${0}`}, so ${math`B = \frac{N}{(q - p)(${1} - \rho^{N})}`}.`,
          why: { q: t`Why may we divide by ${math`${1} - \rho^{N}`}?`, a: t`Because ${math`\rho \ne ${1}`} and ${math`\rho > ${0}`}, so ${math`\rho^{N} \ne ${1}`}.` },
        },
        {
          label: t`Put it together`,
          text: t`${math`m_{k} = \frac{k}{q - p} + B(\rho^{k} - ${1}) = \frac{k}{q - p} - \frac{N}{q - p} \cdot \frac{${1} - \rho^{k}}{${1} - \rho^{N}}`}.`,
          plain: t`The first term is the drift time; the second corrects for the walks that finish at ${math`N`} instead.`,
        },
      ],
    },
    { kind: 'p', text: t`A small case to trust it by. On ${math`${0}, ${1}, ${2}, ${3}`} with ${math`p = ${q(1, 3)}`}: ${math`\rho = ${2}`} and ${math`q - p = ${q(1, 3)}`}, so ${math`m_{${1}} = ${3} - ${9} \cdot \frac{${1} - ${2}}{${1} - ${8}} = ${duration(1, 3, q(1, 3))}`}. Directly, ${math`m_{${1}} = ${1} + \frac{${1}}{${3}}m_{${2}}`} and ${math`m_{${2}} = ${1} + \frac{${2}}{${3}}m_{${1}}`}; substituting gives ${math`\frac{${7}}{${9}}m_{${1}} = \frac{${4}}{${3}}`}, the same ${math`${duration(1, 3, q(1, 3))}`}.` },
    { kind: 'section', title: t`A walk stopped at plus or minus a` },
    { kind: 'narrative', text: t`Example Sheet ${3} Q${8}(c) starts the walk at ${0} and stops it at the first time ${math`T`} with ${math`|S_{n}| = a`}. Shift everything up by ${math`a`}: this is a walk from ${math`a`} on ${math`${0}, \ldots, ${2}a`}, so the durations found above apply to it. A biased walk also has a second route to ${math`E(T)`}, through the mean position at the moment it stops.` },
    {
      kind: 'theorem',
      name: t`Wald's identity, for this walk`,
      statement: t`Let ${math`S_{${0}} = ${0}`}, let the steps have mean ${math`\mu = p - q`}, and let ${math`T = \min\{n : |S_{n}| = a\}`}. Then ${math`E(S_{T}) = \mu\,E(T)`}.`,
    },
    { kind: 'p', text: t`When ${math`\mu \ne ${0}`} this gives ${math`E(T) = \frac{E(S_{T})}{\mu}`}, and ${math`E(S_{T})`} needs only the chance of leaving at the top, which is gambler's ruin. The idea of the proof: ${math`S_{T} = \sum_{k \ge ${1}} X_{k} \mathbf{${1}}\{T \ge k\}`}, and whether ${math`T \ge k`} is decided by ${math`X_{${1}}, \ldots, X_{k - ${1}}`}, so it is independent of ${math`X_{k}`}. Proving it properly, with ${math`T`} unbounded, is the gate problem for this topic.`, why: { q: t`Why does the sum equal ${math`S_{T}`}?`, a: t`The indicator ${math`\mathbf{${1}}\{T \ge k\}`} is ${1} for ${math`k = ${1}, \ldots, T`} and ${0} after, so the sum keeps exactly the first ${math`T`} steps, which add up to ${math`S_{T}`}.` } },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`A fair walk from ${math`k`} takes about ${math`\min(k, N - k)`} steps, the distance to the nearer barrier.`, counterexample: t`From ${5} on ${math`${0}, \ldots, ${10}`} the nearer barrier is ${5} away, but ${math`m_{${5}} = ${5 * (10 - 5)}`}. The walk wanders, and the duration grows like the square of the distance.` },
    { kind: 'pitfall', claim: t`${math`E(S_{T}) = \mu E(T)`} holds for any random time ${math`T`} at which the walk stops.`, counterexample: t`Start a fair walk at ${0} and stop at the first time ${math`T`} it reaches ${1}. It does reach ${1} with probability ${1}, by gambler's ruin, so ${math`S_{T} = ${1}`} and ${math`E(S_{T}) = ${1}`}, but ${math`\mu = ${0}`}. The identity fails because ${math`E(T) = \infty`}: ${math`T`} is at least the time to leave ${math`(-M, ${1})`}, whose mean is ${math`M \times ${1} = M`} for every ${math`M`}.` },
    { kind: 'pitfall', claim: t`The boundary values are ${math`m_{${0}} = m_{N} = ${1}`}, since reaching a barrier takes a step.`, counterexample: t`${math`m_{k}`} counts steps from ${math`k`}. Starting on a barrier, no step is taken, so ${math`m_{${0}} = ${0}`}. The step that reaches the barrier is already counted by the ${1} in the equation for its neighbour.` },
    { kind: 'takeaway', text: t`Condition on the first step and add ${1} for the time it takes; for a fair walk the answer is ${math`k(N - k)`}, the product of the distances.` },
  ],
  examples: [
    { ...workedCambridge(q8time), examiner: t`The examiner looks for ${math`P(S_{T} = a)`} found by gambler's ruin, ${math`E(S_{T})`} built from it, and the division by ${math`\mu`} justified because ${math`p \ne \frac{${1}}{${2}}`}.` },
    worked(fairDuration, { k: 3, N: 8 }, t`A fair game from £${3} to £${8}`),
    worked(biasedDuration, { k: 2, N: 4, p: q(2, 3) }, t`A biased walk on ${math`${0}, \ldots, ${4}`}`),
  ],
  generators: [fairDuration, biasedDuration, twoSided],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['expected-duration'],
  cambridge: withUses([u2, u4, symmetric, wald, schedule], {
    'sheet3-q8c-wald': { sections: ['A walk stopped at plus or minus a'], note: t`The mean position at a stopping time, with care` },
    's3-q1-u4': { sections: ['The first-step equation'], note: t`An expected number of jumps from a recurrence` },
    'sheet3-q8c-symmetric': { sections: ['Solving it: the fair walk', 'A walk stopped at plus or minus a'], note: t`The mean time for a fair walk to reach a level` },
  }),
  gate: ['sheet3-q8c-wald', 's3-q1-u4', 'sheet3-q8c-symmetric'],
  recall: [
    { front: t`The first-step equation for the expected duration ${math`m_{k}`} on ${math`${0}, \ldots, N`}.`, back: t`${math`m_{k} = ${1} + p\,m_{k + ${1}} + q\,m_{k - ${1}}`} for ${math`${0} < k < N`}, with ${math`m_{${0}} = m_{N} = ${0}`}.` },
    { front: t`The expected duration of a fair walk from ${math`k`} on ${math`${0}, \ldots, N`}.`, back: t`${math`m_{k} = k(N - k)`}, the product of the distances to the barriers.` },
    { front: t`The expected duration of a walk with ${math`p \ne q`}, ${math`\rho = \frac{q}{p}`}.`, back: t`${math`m_{k} = \frac{k}{q - p} - \frac{N}{q - p} \cdot \frac{${1} - \rho^{k}}{${1} - \rho^{N}}`}.` },
    { front: t`Wald's identity for the walk from ${0} stopped at ${math`|S_{n}| = a`}.`, back: t`${math`E(S_{T}) = \mu E(T)`}, with ${math`\mu = p - q`}.` },
  ],
  proofOrder: [
    {
      title: t`A fair walk lasts ${math`k(N - k)`} steps on average`,
      steps: [
        t`Condition on the first step: ${math`m_{k} = ${1} + \frac{${1}}{${2}}m_{k + ${1}} + \frac{${1}}{${2}}m_{k - ${1}}`}, with ${math`m_{${0}} = m_{N} = ${0}`}.`,
        t`The homogeneous equation has a double root ${1}, so its solutions are ${math`A + Bk`}.`,
        t`Try ${math`Ck^{${2}}`}: it gives ${math`C = -${1}`}, so ${math`m_{k} = A + Bk - k^{${2}}`}.`,
        t`${math`m_{${0}} = ${0}`} gives ${math`A = ${0}`}, and ${math`m_{N} = ${0}`} gives ${math`B = N`}.`,
        t`So ${math`m_{k} = k(N - k)`}.`,
      ],
    },
  ],
};
