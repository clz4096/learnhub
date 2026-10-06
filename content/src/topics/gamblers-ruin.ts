/**
 * rw.gamblers-ruin: the probability that a simple random walk hits one barrier before
 * another, by conditioning on the first step and solving the difference equation. From the
 * IA Probability schedule ("Random walks: gambler's ruin, recurrence relations") and IA
 * Probability Example Sheet 3 Q8(c) (a ±1 walk stopped when |S_n| = a, and var(S_T)). The
 * sheet has no official solutions; every answer is checked by solving the first-step
 * equations exactly on the states of the walk, and the probabilities by simulation.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { dmath, math, t } from '../rich';
import { quickCheck, worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';
import { hitTop, rpow, walkHitsTop } from '../partv-a';

const SH3 = 'ia-prob-sheet-3' as const;
const distinctFrom = (right: string, xs: readonly string[]): number => new Set(xs.filter((x) => x !== right)).size;
/** P(reach N before 0 from k) for a walk stepping up with probability p, by the closed form. */
const ruinTop = (k: number, N: number, p: Rational): Rational => {
  if (p.num * 2n === p.den) return q(k, N);
  const rho = div(sub(q(1), p), p);
  return div(sub(q(1), rpow(rho, k)), sub(q(1), rpow(rho, N)));
};

// ---------------------------------------------------------------- the gambler's fortune

interface GamP { k: number; N: number; p: Rational }
const BIASED: readonly Rational[] = [q(1, 3), q(2, 5), q(3, 5), q(2, 3), q(1, 4), q(3, 4)];
const gamMis = ({ k, N, p }: GamP): string[] => [str(q(k, N)), str(ruinTop(k, N, sub(q(1), p))), str(sub(q(1), ruinTop(k, N, p)))];

const ruin = generator<GamP>({
  id: 'ruin-probability',
  skill: 'Find the chance that a gambler reaches a target before ruin: h_k = (1 - ρ^k)/(1 - ρ^N) with ρ = q/p.',
  params: (rng) => {
    for (;;) {
      const N = int(rng, 3, 7);
      const p: GamP = { k: int(rng, 1, N - 1), N, p: pick(rng, BIASED) };
      if (distinctFrom(str(ruinTop(p.k, p.N, p.p)), gamMis(p)) >= 2) return p;
    }
  },
  sane: ({ k, N }) => (k >= 1 && k < N ? null : 'out of range'),
  problem: ({ k, N, p }) => {
    const qq = sub(q(1), p);
    const rho = div(qq, p);
    return {
      prompt: t`A gambler has £${k}. She bets £${1} at a time, winning each bet with probability ${p} independently, and stops when she has £${N} or nothing. What is the probability that she reaches £${N}?`,
      answer: { kind: 'exact', expected: str(ruinTop(k, N, p)) },
      solution: [
        t`Let ${math`h_{j}`} be the chance of reaching £${N} from £${math`j`}. Conditioning on the first bet, ${math`h_{j} = ${p}h_{j + ${1}} + ${qq}h_{j - ${1}}`}, with ${math`h_{${0}} = ${0}`} and ${math`h_{${N}} = ${1}`}.`,
        t`The auxiliary equation ${math`${p}\lambda^{${2}} - \lambda + ${qq} = ${0}`} has roots ${1} and ${math`\rho = \frac{q}{p} = ${rho}`}, so ${math`h_{j} = A + B\rho^{j}`}; the boundary values give ${math`h_{j} = \frac{${1} - \rho^{j}}{${1} - \rho^{${N}}}`}.`,
        t`${math`h_{${k}} = \frac{${1} - \left(${rho}\right)^{${k}}}{${1} - \left(${rho}\right)^{${N}}} = ${ruinTop(k, N, p)}`}.`,
      ],
    };
  },
  solve: ({ k, N, p }) => str(hitTop(0, N, p)[k - 1] as Rational),
  misconceptions: (gp): Misconception[] => {
    const [x, y, z] = gamMis(gp);
    return [
      { response: x as string, why: t`${math`\frac{k}{N}`} is the answer for a fair game only. With ${math`p = ${gp.p}`}, solve ${math`h_{j} = ph_{j + ${1}} + qh_{j - ${1}}`}.` },
      { response: y as string, why: t`The ratio is upside down: the root of the auxiliary equation is ${math`\rho = \frac{q}{p}`}, not ${math`\frac{p}{q}`}.` },
      { response: z as string, why: t`That is the chance of ruin. The question asks for reaching £${gp.N}.` },
    ];
  },
  trial: ({ k, N, p }, rng) => walkHitsTop(k, 0, N, p, rng),
});

// ---------------------------------------------------------------- a walk from 0 between two barriers

interface TwoP { a: number; b: number; p: Rational }
const ALL: readonly Rational[] = [q(1, 2), q(1, 2), q(1, 3), q(2, 3), q(2, 5), q(3, 5), q(1, 4), q(3, 4)];
const twoVal = ({ a, b, p }: TwoP): Rational => ruinTop(b, a + b, p);
const twoMis = ({ a, b, p }: TwoP): string[] => [str(q(a, a + b)), str(q(b, a + b)), str(ruinTop(a, a + b, p))];

const twoSided = generator<TwoP>({
  id: 'two-barriers',
  skill: 'Find the chance that a walk from 0 hits +a before -b: shift it to start at b on 0 to a + b.',
  params: (rng) => {
    for (;;) {
      const p: TwoP = { a: int(rng, 1, 4), b: int(rng, 1, 4), p: pick(rng, ALL) };
      if (p.a + p.b >= 3 && distinctFrom(str(twoVal(p)), twoMis(p)) >= 2) return p;
    }
  },
  sane: ({ a, b }) => (a >= 1 && b >= 1 ? null : 'out of range'),
  problem: (tp) => {
    const fair = tp.p.num * 2n === tp.p.den;
    return {
      prompt: t`A particle starts at ${0} and moves ${1} up with probability ${tp.p} or ${1} down otherwise, each step independent. What is the probability that it reaches ${tp.a} before ${math`-${tp.b}`}?`,
      answer: { kind: 'exact', expected: str(twoVal(tp)) },
      solution: [
        t`Add ${tp.b} to every position: the walk starts at ${tp.b} and stops at ${0} or ${tp.a + tp.b}. This is gambler's ruin with ${math`k = ${tp.b}`} and ${math`N = ${tp.a + tp.b}`}.`,
        fair
          ? t`With ${math`p = q`}, ${math`h_{k} = \frac{k}{N} = \frac{${tp.b}}{${tp.a + tp.b}} = ${twoVal(tp)}`}: the walk is more likely to reach the nearer barrier.`
          : t`With ${math`\rho = \frac{q}{p} = ${div(sub(q(1), tp.p), tp.p)}`}, ${math`h_{${tp.b}} = \frac{${1} - \rho^{${tp.b}}}{${1} - \rho^{${tp.a + tp.b}}} = ${twoVal(tp)}`}.`,
      ],
    };
  },
  solve: ({ a, b, p }) => str(hitTop(-b, a, p)[b - 1] as Rational),
  misconceptions: (tp): Misconception[] => {
    const [x, y, z] = twoMis(tp);
    return [
      { response: x as string, why: t`The nearer barrier is the likelier one: from ${0}, the distance to ${math`-${tp.b}`} is what helps reach ${tp.a}. Shifted, the start is ${tp.b}, so the fair answer would be ${math`\frac{${tp.b}}{${tp.a + tp.b}}`}.` },
      { response: y as string, why: t`${math`\frac{k}{N}`} holds only for a fair walk. With ${math`p = ${tp.p}`}, use ${math`\frac{${1} - \rho^{k}}{${1} - \rho^{N}}`}.` },
      { response: z as string, why: t`After shifting by ${tp.b}, the start is ${tp.b}, not ${tp.a}.` },
    ];
  },
  trial: ({ a, b, p }, rng) => walkHitsTop(0, -b, a, p, rng),
});

// ---------------------------------------------------------------- no upper limit

interface InfP { k: number; p: Rational }
const UP: readonly Rational[] = [q(3, 5), q(2, 3), q(3, 4), q(4, 5), q(5, 8)];
const infVal = ({ k, p }: InfP): Rational => rpow(div(sub(q(1), p), p), k);
const infMis = ({ k, p }: InfP): string[] => [str(rpow(sub(q(1), p), k)), '1', str(div(q(1), q(k + 1)))];

const neverRuined = generator<InfP>({
  id: 'ever-ruined',
  skill: 'Let the target go to infinity: a gambler with an edge (p > q) is ruined with probability (q/p)^k.',
  params: (rng) => {
    for (;;) {
      const p: InfP = { k: int(rng, 1, 4), p: pick(rng, UP) };
      if (distinctFrom(str(infVal(p)), infMis(p)) >= 2) return p;
    }
  },
  sane: ({ p }) => (p.num * 2n > p.den ? null : 'out of range'),
  problem: ({ k, p }) => {
    const rho = div(sub(q(1), p), p);
    return {
      prompt: t`A gambler with £${k} plays against a casino with unlimited money, betting £${1} at a time and winning each bet with probability ${p}. She plays until she has nothing, or for ever. What is the probability that she is ever ruined?`,
      answer: { kind: 'exact', expected: str(infVal({ k, p })) },
      solution: [
        t`Ruin before reaching £${math`N`} has probability ${math`${1} - \frac{${1} - \rho^{${k}}}{${1} - \rho^{N}}`}, with ${math`\rho = \frac{q}{p} = ${rho}`}. Ever being ruined is the limit as ${math`N \to \infty`}, by continuity of probability.`,
        t`Since ${math`\rho < ${1}`}, ${math`\rho^{N} \to ${0}`}, and the limit is ${math`${1} - (${1} - \rho^{${k}}) = \rho^{${k}} = ${infVal({ k, p })}`}. With an edge, she survives for ever with positive probability.`,
      ],
    };
  },
  solve: ({ k, p }) => {
    // Going down k levels means going down one level k times, independently: r^k, where r (ruin from 1) is the
    // smallest root in [0, 1] of r = q + p r^2. The discriminant 1 - 4pq is (p - q)^2, so the roots are exact.
    const qq = sub(q(1), p);
    const d = p.num * qq.den > qq.num * p.den ? sub(p, qq) : sub(qq, p);
    const roots = [div(add(q(1), d), mul(q(2), p)), div(sub(q(1), d), mul(q(2), p))];
    const r = roots.reduce((x, y) => (x.num * y.den < y.num * x.den ? x : y));
    return str(rpow(r, k));
  },
  misconceptions: (ip): Misconception[] => {
    const [x, y, z] = infMis(ip);
    return [
      { response: x as string, why: t`That is losing the first ${ip.k} bets in a row. She can also be ruined later, after wins: use ${math`\left(\frac{q}{p}\right)^{k}`}.` },
      { response: y as string, why: t`A fair or unfavourable walk is ruined with probability ${1}, but with ${math`p > q`} the walk drifts upwards and escapes with positive probability.` },
      { response: z as string, why: t`${math`\frac{k}{N}`} is for a fair game with a finite target. Here the game favours her and has no top.` },
    ];
  },
  trial: ({ k, p }, rng) => !walkHitsTop(k, 0, k + 60, p, rng),
});

// ---------------------------------------------------------------- Cambridge problems

/** P(S_T = a) for the walk from 0 stopped at ±a, from the first-step equations on -a..a. */
const topAt = (a: number, p: Rational): Rational => hitTop(-a, a, p)[a - 1] as Rational;
const AP_DOM = { a: { kind: 'integer' as const, min: 1, max: 6 }, p: { kind: 'real' as const, min: 0.1, max: 0.9 } };
const varFormula = (a: number, p: Rational): Rational => {
  const [pa, qa] = [rpow(p, a), rpow(sub(q(1), p), a)];
  return div(mul(q(4 * a * a), mul(pa, qa)), mul(add(pa, qa), add(pa, qa)));
};

const q8var = auto({
  id: 'sheet3-q8c-variance',
  source: cite(SH3, 'Q8(c)', true),
  title: t`Stopped at ${math`\pm a`}: the variance`,
  prompt: t`The steps ${math`X_{${1}}, X_{${2}}, \ldots`} are independent, each ${1} with probability ${math`p`} and ${math`-${1}`} with probability ${math`${1} - p`}. ${math`S_{n} = X_{${1}} + \cdots + X_{n}`}, and for a fixed whole number ${math`a \ge ${1}`}, ${math`T = \min\{n \ge ${0} : |S_{n}| = a\}`}. Find ${math`\mathrm{var}(S_{T})`} in terms of ${math`a`} and ${math`p`}.`,
  answer: { kind: 'expression', expected: '4a^2 p^a (1 - p)^a/(p^a + (1 - p)^a)^2', variables: ['a', 'p'], domains: AP_DOM },
  solution: [
    t`${math`S_{T}`} is ${math`a`} or ${math`-a`}. Shift by ${math`a`}: the walk starts at ${math`a`} on ${math`${0}, \ldots, ${2}a`}, so by gambler's ruin with ${math`\rho = \frac{${1} - p}{p}`}, ${math`h = P(S_{T} = a) = \frac{${1} - \rho^{a}}{${1} - \rho^{${2}a}} = \frac{${1}}{${1} + \rho^{a}} = \frac{p^{a}}{p^{a} + (${1} - p)^{a}}`}.`,
    t`${math`E(S_{T}^{${2}}) = a^{${2}}`} and ${math`E(S_{T}) = a(${2}h - ${1})`}, so ${math`\mathrm{var}(S_{T}) = a^{${2}}\left(${1} - (${2}h - ${1})^{${2}}\right) = ${4}a^{${2}}h(${1} - h) = \frac{${4}a^{${2}}p^{a}(${1} - p)^{a}}{\left(p^{a} + (${1} - p)^{a}\right)^{${2}}}`}. For ${math`p = \frac{${1}}{${2}}`} it is ${math`a^{${2}}`}.`,
  ],
  reference: '4a^2 p^a (1 - p)^a/(p^a + (1 - p)^a)^2',
  verify: () => {
    for (const p of [q(1, 2), q(1, 3), q(3, 5), q(1, 4)]) {
      for (let a = 1; a <= 5; a++) {
        const h = topAt(a, p);
        const v = mul(q(4 * a * a), mul(h, sub(q(1), h)));
        const e = same(`p = ${str(p)}, a = ${a}, the first-step equations`, str(v), str(varFormula(a, p)));
        if (e !== null) return e;
      }
    }
    return null;
  },
  misconceptions: [{ response: 'a^2', why: t`${math`a^{${2}}`} is ${math`E(S_{T}^{${2}})`}, and the variance only when ${math`p = \frac{${1}}{${2}}`}, where ${math`E(S_{T}) = ${0}`}. Subtract ${math`E(S_{T})^{${2}}`}.` }],
});

const A2 = 2;
const P23 = q(2, 3);
const q8top = auto({
  id: 'sheet3-q8c-top',
  source: cite(SH3, 'Q8(c)', true),
  title: t`Stopped at ${math`\pm ${A2}`}: which end?`,
  prompt: t`A walk starts at ${0} and steps ${1} up with probability ${P23} or ${1} down otherwise, independently. It stops at the first time ${math`|S_{n}| = ${A2}`}. What is the probability that it stops at ${A2}?`,
  answer: { kind: 'exact', expected: str(topAt(A2, P23)) },
  solution: [
    t`Shifted by ${A2}, it is gambler's ruin from ${A2} on ${math`${0}, \ldots, ${2 * A2}`} with ${math`\rho = \frac{q}{p} = ${q(1, 2)}`}.`,
    t`${math`h = \frac{${1} - \rho^{${A2}}}{${1} - \rho^{${2 * A2}}} = \frac{${1}}{${1} + \rho^{${A2}}} = \frac{${1}}{${1} + ${rpow(q(1, 2), A2)}} = ${topAt(A2, P23)}`}. Or directly: the first two steps decide it unless they cancel, so ${math`h = \frac{p^{${2}}}{p^{${2}} + q^{${2}}} = \frac{${q(4, 9)}}{${q(5, 9)}}`}.`,
  ],
  reference: str(topAt(A2, P23)),
  verify: () => same('the closed form', str(topAt(A2, P23)), str(ruinTop(A2, 2 * A2, P23))) ?? same('the two-step argument', str(topAt(A2, P23)), '4/5'),
  misconceptions: [{ response: str(P23), why: t`The first step does not decide it: after up then down the walk is back at ${0}. Condition on pairs of steps, or use gambler's ruin.` }],
});

const schedule = supervision({
  id: 'schedule-gamblers-ruin',
  source: cite('tripos-schedules', 'IA Probability, Discrete random variables: "Random walks: gambler\'s ruin, recurrence relations"', true),
  title: t`Gambler's ruin, proved`,
  prompt: t`A walk on ${math`${0}, ${1}, \ldots, N`} steps up with probability ${math`p`} and down with probability ${math`q = ${1} - p`}, stopping at ${0} or ${math`N`}. Let ${math`h_{k}`} be the probability of reaching ${math`N`} first from ${math`k`}. Derive ${math`h_{k} = ph_{k + ${1}} + qh_{k - ${1}}`} and solve it, separately for ${math`p \ne q`} and ${math`p = q`}. Why is the solution of the difference equation with these boundary values unique?`,
  writeUp: 'proof',
});
const finiteT = supervision({
  id: 'sheet3-q8c-finite',
  source: cite(SH3, 'Q8(c)'),
  title: t`The walk stops`,
  prompt: t`For the ${math`\pm ${1}`} walk and ${math`T = \min\{n \ge ${0} : |S_{n}| = a\}`}, explain why ${math`P(T < \infty) = ${1}`}, whatever ${math`p`} is: consider the blocks of ${math`${2}a`} consecutive steps, and the event that every step in a block is the same.`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

const claims: ProbabilityClaim[] = [
  { what: 'gambler from 2 with target 4 and p = 2/3 reaches the target', exact: ruinTop(2, 4, q(2, 3)), trial: (rng) => walkHitsTop(2, 0, 4, q(2, 3), rng) },
];

const [mp, mq, mk, mN, mrho] = [math`p`, math`q`, math`k`, math`N`, math`\rho`];
const [EK, EN, EP] = [2, 4, q(2, 3)];
const casino = (k: number, N: number, p: number): number => { const r = (1 - p) / p; return (1 - r ** k) / (1 - r ** N); };
const CASINO = Number(casino(50, 100, 0.49).toFixed(3));

export const gamblersRuin: TopicContent = {
  topicId: 'rw.gamblers-ruin',
  goal: t`Find the probability that a simple random walk hits one level before another, by conditioning on the first step and solving the difference equation.`,
  objective: t`Find the chance a random walk hits one barrier before another, by solving a difference equation.`,
  why: t`It is the model of every fair or unfair bet, and the start of random walks; next, the expected time to ruin.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Ruin` },
    { kind: 'hook', text: t`You walk into a casino with £${50} and bet £${1} at a time on a game you win with probability ${0.49} each time. You will stop when you reach £${100} or go broke. The game is only slightly unfair. What is your chance of doubling your money? It is about ${CASINO}. A tiny edge, repeated, is crushing.` },
    {
      kind: 'definition',
      name: t`Simple random walk`,
      formal: t`A [[simple-random-walk|simple random walk]] has independent steps ${math`X_{${1}}, X_{${2}}, \ldots`}, each ${math`+${1}`} with probability ${mp} and ${math`-${1}`} with probability ${math`q = ${1} - p`}; its position after ${math`n`} steps is ${math`S_{n} = S_{${0}} + X_{${1}} + \cdots + X_{n}`}.`,
      plain: t`a gambler's fortune when betting £${1} at a time: up one with probability ${mp}, down one otherwise.`,
    },
    {
      kind: 'p',
      text: t`In [[gamblers-ruin|gambler's ruin]] the walk starts at ${mk} and stops on reaching ${0} (ruin) or ${mN} (the target). Both ends are [[absorbing-barrier|absorbing barriers]]: once there, the walk stays. Let ${math`h_{k}`} be the probability of reaching ${mN} before ${0}, starting from ${mk}.`,
    },
    { kind: 'narrative', text: t`First-step analysis gives an equation for each ${mk}. From ${mk}, the first step goes up with probability ${mp}, to ${math`k + ${1}`}, or down with probability ${mq}, to ${math`k - ${1}`}; from there the walk starts afresh. So ${math`h_{k} = p\,h_{k + ${1}} + q\,h_{k - ${1}}`} for ${math`${0} < k < N`}, with ${math`h_{${0}} = ${0}`} and ${math`h_{N} = ${1}`}.` },
    { kind: 'section', title: t`Solving the equation` },
    { kind: 'theorem', statement: t`If ${math`p \neq q`}, write ${math`\rho = \frac{q}{p}`}. Then for ${math`${0} \le k \le N`}, ${dmath`h_{k} = \frac{${1} - \rho^{k}}{${1} - \rho^{N}}.`} If ${math`p = q = \frac{${1}}{${2}}`}, then ${math`h_{k} = \frac{k}{N}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Rewrite with differences`, text: t`Since ${math`p + q = ${1}`}, ${math`h_{k} = p\,h_{k} + q\,h_{k}`}, so the equation becomes ${math`p(h_{k + ${1}} - h_{k}) = q(h_{k} - h_{k - ${1}})`}.`, plain: t`Split ${math`h_{k}`} into ${math`p\,h_{k} + q\,h_{k}`} and move terms across.` },
        { label: t`The differences are geometric`, text: t`Let ${math`d_{k} = h_{k} - h_{k - ${1}}`}. Then ${math`d_{k + ${1}} = \rho\,d_{k}`}, so ${math`d_{k} = \rho^{k - ${1}} d_{${1}}`}.`, plain: t`Each difference is ${mrho} times the one before. With ${math`p = ${EP}`}, ${math`\rho = ${div(sub(q(1), EP), EP)}`}: each step's gain in probability is half the last.` },
        { label: t`Add them up`, text: t`${math`h_{k} = h_{${0}} + d_{${1}} + \cdots + d_{k} = d_{${1}}(${1} + \rho + \cdots + \rho^{k - ${1}}) = d_{${1}}\frac{${1} - \rho^{k}}{${1} - \rho}`}.`, plain: t`The sum telescopes, ${math`h_{${0}} = ${0}`}, and the bracket is a geometric series with ratio ${math`\rho \neq ${1}`}.` },
        { label: t`Use the top barrier`, text: t`${math`h_{N} = ${1}`} gives ${math`d_{${1}} = \frac{${1} - \rho}{${1} - \rho^{N}}`}, so ${math`h_{k} = \frac{${1} - \rho^{k}}{${1} - \rho^{N}}`}.`, plain: t`One condition fixes the one unknown ${math`d_{${1}}`}.` },
        { label: t`The fair case`, text: t`If ${math`p = q`}, then ${math`\rho = ${1}`}, all differences equal ${math`d_{${1}}`}, so ${math`h_{k} = k\,d_{${1}}`}, and ${math`h_{N} = ${1}`} gives ${math`h_{k} = \frac{k}{N}`}.`, plain: t`A fair walk climbs in equal steps of probability.` },
      ],
    },
    {
      kind: 'p',
      text: t`Example: start at ${EK}, target ${EN}, ${math`p = ${EP}`}. Then ${math`\rho = ${div(sub(q(1), EP), EP)}`} and ${math`h_{${EK}} = \frac{${1} - (${div(sub(q(1), EP), EP)})^{${EK}}}{${1} - (${div(sub(q(1), EP), EP)})^{${EN}}} = ${ruinTop(EK, EN, EP)}`}.`,
      why: { q: t`Why does the proof show the answer is the only one?`, a: t`Every step was forced: the equation fixed each difference in terms of ${math`d_{${1}}`}, and ${math`h_{N} = ${1}`} fixed ${math`d_{${1}}`}. So no other sequence satisfies the equation and both boundary values.` },
    },
    quickCheck({
      prompt: t`A fair walk (${math`p = \frac{${1}}{${2}}`}) starts at ${3} and stops at ${0} or ${10}. What is the probability it reaches ${10} first?`,
      answer: { kind: 'exact', expected: str(q(3, 10)) },
      reference: str(q(3, 10)),
      why: t`For a fair walk ${math`h_{k} = \frac{k}{N} = ${q(3, 10)}`}.`,
    }),
    { kind: 'section', title: t`No upper limit` },
    {
      kind: 'p',
      text: t`With no target, let ${math`N \to \infty`}. If ${math`p > q`}, then ${math`\rho < ${1}`}, ${math`\rho^{N} \to ${0}`}, and the chance of ever being ruined from ${mk} is ${math`${1} - h_{k} \to \rho^{k}`}. If ${math`p \le q`}, ruin is certain.`,
      why: { q: t`Why is ruin certain even for a fair game?`, a: t`For ${math`p = q`}, the chance of ruin before ${mN} is ${math`${1} - \frac{k}{N}`}, which tends to ${1} as ${math`N \to \infty`}. A fair game against an opponent with unlimited money ruins you with probability ${1}.` },
    },
    {
      kind: 'pitfall',
      claim: t`A game that is only slightly unfair, ${math`p = ${0.49}`}, gives about the same chance as a fair one: about ${q(1, 2)} of doubling £${50}.`,
      counterexample: t`With ${math`k = ${50}`}, ${math`N = ${100}`}, ${math`\rho = \frac{${51}}{${49}}`}: ${math`h_{${50}} = \frac{${1} - \rho^{${50}}}{${1} - \rho^{${100}}} = \frac{${1}}{${1} + \rho^{${50}}}`}, about ${CASINO}. The bias compounds over the many bets a long game needs.`,
    },
    { kind: 'takeaway', text: t`Condition on the first step to get ${math`h_{k} = p\,h_{k + ${1}} + q\,h_{k - ${1}}`}; its solution is ${math`\frac{${1} - \rho^{k}}{${1} - \rho^{N}}`} with ${math`\rho = \frac{q}{p}`}, or ${math`\frac{k}{N}`} when fair.` },
  ],
  examples: [
    { ...workedCambridge(q8var), examiner: t`The stopped walk recognised as gambler's ruin shifted by ${math`a`}, the two end probabilities found, and the variance computed as ${math`E(S_{T}^{${2}}) - E(S_{T})^{${2}}`} with ${math`S_{T} = \pm a`}.` },
    worked(ruin, { k: 2, N: 5, p: q(2, 5) }, t`A gambler at a disadvantage`),
    worked(twoSided, { a: 3, b: 1, p: q(1, 2) }, t`A fair walk between two barriers`),
  ],
  generators: [ruin, twoSided, neverRuined],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['simple-random-walk', 'gamblers-ruin', 'absorbing-barrier'],
  claims,
  cambridge: [q8top, schedule, finiteT],
  // Sheet 3 Q8(c): the proof that the walk stops, then which end it stops at. The schedule problem is not
  // from a sheet, and its derivation is the lesson's own proof.
  gate: ['sheet3-q8c-finite', 'sheet3-q8c-top'],
  recall: [
    { front: t`The first-step equation for gambler's ruin?`, back: t`${math`h_{k} = p\,h_{k + ${1}} + q\,h_{k - ${1}}`}, with ${math`h_{${0}} = ${0}`}, ${math`h_{N} = ${1}`}.` },
    { front: t`${math`h_{k}`} for ${math`p \neq q`}?`, back: t`${math`\frac{${1} - \rho^{k}}{${1} - \rho^{N}}`} with ${math`\rho = \frac{q}{p}`}.` },
    { front: t`${math`h_{k}`} for a fair walk?`, back: t`${math`\frac{k}{N}`}.` },
    { front: t`Chance of ever being ruined from ${mk} with no target, ${math`p > q`}?`, back: t`${math`\rho^{k}`}; if ${math`p \le q`}, ruin is certain.` },
  ],
  proofOrder: [
    {
      title: t`Solving the gambler's ruin equation`,
      steps: [
        t`Rewrite as ${math`p(h_{k + ${1}} - h_{k}) = q(h_{k} - h_{k - ${1}})`}.`,
        t`So the differences satisfy ${math`d_{k} = \rho^{k - ${1}} d_{${1}}`}.`,
        t`Summing, ${math`h_{k} = d_{${1}}\frac{${1} - \rho^{k}}{${1} - \rho}`}.`,
        t`${math`h_{N} = ${1}`} fixes ${math`d_{${1}}`}, giving ${math`h_{k} = \frac{${1} - \rho^{k}}{${1} - \rho^{N}}`}.`,
      ],
    },
  ],
};
