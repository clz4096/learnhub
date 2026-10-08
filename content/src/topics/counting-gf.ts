/**
 * gf.combinatorial: counting with generating functions. A count indexed by a total is the
 * coefficient of x^n in a product of power series, one factor per independent choice:
 * coins, bounded selections, dice, partitions. From the Faculty schedule ("Combinatorial
 * applications of generating functions", which no sheet problem sets), IA Probability
 * Example Sheet 3 Q5 (the negative binomial series inside the pgf of the a-th success),
 * and Example Sheet 2 Q3 (the even number of successes, which the generating function
 * (q + pt)^n gives at t = 1 and t = -1). The sheets have no official solutions; every
 * count is checked by listing every case.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { add, int, mul, pick, q, str, sub, type Rational } from '../math';
import { choose } from '../numbers';
import { powQ } from '../partv-d';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, listOf, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const [mx, mn] = [math`x`, math`n`];
const SCHEDULE = cite('tripos-schedules', 'IA Probability, Discrete random variables: "Combinatorial applications of generating functions"', true);

/** Coefficients of a product of power series, truncated after x^n: integer arrays. */
function seriesMul(a: readonly number[], b: readonly number[], n: number): number[] {
  const out = Array.from({ length: n + 1 }, () => 0);
  for (let i = 0; i <= n; i++) for (let j = 0; i + j <= n; j++) out[i + j] = (out[i + j] as number) + (a[i] ?? 0) * (b[j] ?? 0);
  return out;
}
/** 1/(1 - x^d) = 1 + x^d + x^(2d) + ..., truncated after x^n. */
const geometric = (d: number, n: number): number[] => Array.from({ length: n + 1 }, (_, i) => (i % d === 0 ? 1 : 0));

// ---------------------------------------------------------------- making change

const COINS: readonly (readonly number[])[] = [[1, 2], [1, 2, 5], [1, 3], [2, 3], [1, 2, 3], [1, 5, 10], [2, 5]];
interface CoinP { c: number; n: number }
/** Unordered ways, by brute force: choose how many of each coin, largest first. */
function waysBrute(coins: readonly number[], n: number): number {
  const go = (i: number, left: number): number => (i < 0 ? (left === 0 ? 1 : 0) : Array.from({ length: Math.floor(left / (coins[i] as number)) + 1 }, (_, k) => go(i - 1, left - k * (coins[i] as number))).reduce((s, x) => s + x, 0));
  return go(coins.length - 1, n);
}
const waysGf = (coins: readonly number[], n: number): number => coins.reduce((acc, d) => seriesMul(acc, geometric(d, n), n), [1, ...Array.from({ length: n }, () => 0)])[n] as number;
/** Ordered sequences of coins adding to n. */
function ordered(coins: readonly number[], n: number): number {
  const f = Array.from({ length: n + 1 }, () => 0);
  f[0] = 1;
  for (let s = 1; s <= n; s++) for (const d of coins) if (d <= s) f[s] = (f[s] as number) + (f[s - d] as number);
  return f[n] as number;
}
/** Each coin at most once: the coefficient of x^n in the product of (1 + x^d). */
const distinct = (coins: readonly number[], n: number): number => coins.reduce((acc, d) => seriesMul(acc, Array.from({ length: n + 1 }, (_, i) => (i === 0 || i === d ? 1 : 0)), n), [1, ...Array.from({ length: n }, () => 0)])[n] as number;
const coinMis = ({ c, n }: CoinP): number[] => { const cs = COINS[c] as readonly number[]; return [ordered(cs, n), waysBrute(cs.slice(0, -1), n), distinct(cs, n)]; };

const coins = generator<CoinP>({
  id: 'making-change',
  skill: 'Count the ways to make a total from coins of given values as a coefficient of a product of geometric series.',
  params: (rng) => {
    for (;;) {
      const p: CoinP = { c: int(rng, 0, COINS.length - 1), n: int(rng, 5, 16) };
      const right = waysBrute(COINS[p.c] as readonly number[], p.n);
      if (right > 0 && new Set(coinMis(p).filter((m) => m !== right)).size >= 2) return p;
    }
  },
  sane: ({ c, n }) => (c < COINS.length && n >= 1 ? null : 'out of range'),
  problem: ({ c, n }) => {
    const cs = COINS[c] as readonly number[];
    const factors = computedTex(cs.map((d) => (d === 1 ? `(${1} - x)` : `(${1} - x^{${d}})`)).join(''));
    const gf = cs.reduce((acc, d) => seriesMul(acc, geometric(d, n), n), [1, ...Array.from({ length: n }, () => 0)]);
    return {
      prompt: t`Coins are worth ${listOf([...cs])} pence, with as many of each as you like. In how many ways can you pay exactly ${n} pence? The order of the coins does not matter.`,
      answer: { kind: 'exact', expected: String(waysGf(cs, n)) },
      solution: [
        t`Choosing how many coins of value ${math`d`} to use contributes ${math`${0}, d, ${2}d, \ldots`} pence: the series ${math`${1} + x^{d} + x^{${2}d} + \cdots = \frac{${1}}{${1} - x^{d}}`}. The choices are independent, so the generating function is ${math`\frac{${1}}{${factors}}`}.`,
        t`Multiplying the series out to ${math`x^{${n}}`}, the coefficients from ${math`x^{${0}}`} are ${computedTex(gf.join(', '))}. The coefficient of ${math`x^{${n}}`} is ${gf[n] as number}.`,
      ],
    };
  },
  solve: ({ c, n }) => String(waysBrute(COINS[c] as readonly number[], n)),
  misconceptions: (p): Misconception[] => {
    const [ord, noLargest, once] = coinMis(p) as [number, number, number];
    const cs = COINS[p.c] as readonly number[];
    return [
      { response: String(ord), why: t`That counts orders: paying ${listOf([1, 2])} and ${listOf([2, 1])} as different. Here only how many of each coin matters, which is what the product of series counts.` },
      { response: String(noLargest), why: t`The ${cs[cs.length - 1] as number}p coin is missing: include its factor ${math`\frac{${1}}{${1} - x^{${cs[cs.length - 1] as number}}}`}.` },
      { response: String(once), why: t`That allows each coin at most once, the factor ${math`${1} + x^{d}`}. With as many as you like, each factor is the whole geometric series.` },
    ];
  },
});

// ---------------------------------------------------------------- bounded selections

interface BoundP { k: number; m: number; n: number }
const boundGf = ({ k, m, n }: BoundP): number => {
  let acc = [1];
  for (let i = 0; i < k; i++) acc = seriesMul(acc, Array.from({ length: m + 1 }, () => 1), n);
  return acc[n] ?? 0;
};
function boundBrute({ k, m, n }: BoundP): number {
  let count = 0;
  const go = (i: number, s: number): void => { if (i === k) { if (s === n) count++; return; } for (let v = 0; v <= m; v++) go(i + 1, s + v); };
  go(0, 0);
  return count;
}
const boundMis = ({ k, m, n }: BoundP): number[] => [choose(n + k - 1, k - 1), choose(n + k, k), (m + 1) ** k];

const bounded = generator<BoundP>({
  id: 'bounded',
  skill: 'Count solutions of x1 + ... + xk = n with 0 <= xi <= m as the coefficient of x^n in (1 + x + ... + x^m)^k.',
  params: (rng) => {
    for (;;) {
      const k = int(rng, 2, 4);
      const m = int(rng, 2, 5);
      const p: BoundP = { k, m, n: int(rng, m + 1, k * m - 1) };
      const right = boundBrute(p);
      if (p.n > m && new Set(boundMis(p).filter((x) => x !== right)).size >= 2) return p;
    }
  },
  sane: ({ k, m, n }) => (n > m && n < k * m ? null : 'out of range'),
  problem: (p) => {
    const { k, m, n } = p;
    const one = Array.from({ length: m + 1 }, () => 1);
    const coeffs: number[][] = [];
    let acc = [1];
    for (let i = 0; i < k; i++) { acc = seriesMul(acc, one, k * m); coeffs.push(acc); }
    return {
      prompt: t`In how many ways can ${n} identical sweets be shared among ${k} children so that nobody gets more than ${m}?`,
      answer: { kind: 'exact', expected: String(boundGf(p)) },
      solution: [
        t`Each child gets ${math`${0}, ${1}, \ldots, ${m}`} sweets: the factor ${math`${1} + x + \cdots + x^{${m}}`}. The count is the coefficient of ${math`x^{${n}}`} in ${math`(${1} + x + \cdots + x^{${m}})^{${k}}`}.`,
        t`Multiplying out, the coefficients from ${math`x^{${0}}`} to ${math`x^{${k * m}}`} are ${computedTex((coeffs[k - 1] as number[]).join(', '))}: the coefficient of ${math`x^{${n}}`} is ${boundGf(p)}.`,
      ],
    };
  },
  solve: (p) => String(boundBrute(p)),
  misconceptions: (p): Misconception[] => {
    const [stars, wrongStars, all] = boundMis(p) as [number, number, number];
    return [
      { response: String(stars), why: t`${math`\binom{n + k - ${1}}{k - ${1}}`} is the count with no limit, the coefficient in ${math`(${1} - x)^{-k}`}. The cap of ${p.m} removes some shares: use ${math`(${1} + x + \cdots + x^{${p.m}})^{${p.k}}`}.` },
      { response: String(wrongStars), why: t`Stars and bars for ${p.k} children uses ${p.k - 1} bars: ${math`\binom{n + k - ${1}}{k - ${1}}`}, and even that ignores the cap.` },
      { response: String(all), why: t`That counts every share with nobody over ${p.m}, whatever the total. Only shares adding to ${p.n} count: take the coefficient of ${math`x^{${p.n}}`}.` },
    ];
  },
});

// ---------------------------------------------------------------- dice totals

interface DiceP { d: number; f: number; s: number }
function diceCount({ d, f, s }: DiceP): number {
  let acc = [1];
  for (let i = 0; i < d; i++) acc = seriesMul(acc, [0, ...Array.from({ length: f }, () => 1)], d * f);
  return acc[s] ?? 0;
}
const diceVal = (p: DiceP): Rational => q(diceCount(p), p.f ** p.d);
const diceMis = ({ d, f, s }: DiceP): Rational[] => [q(choose(s - 1, d - 1), f ** d), q(1, d * (f - 1) + 1), q(choose(s - 1, d - 1), choose(d * f, d))];

const dice = generator<DiceP>({
  id: 'dice-total',
  skill: 'Find the chance of a total with several dice as a coefficient of (x + ... + x^f)^d over f^d.',
  params: (rng) => {
    for (;;) {
      const d = int(rng, 2, 4);
      const f = pick(rng, [4, 6]);
      const p: DiceP = { d, f, s: int(rng, d + f, d * f - 1) };
      const right = str(diceVal(p));
      if (diceCount(p) > 0 && new Set(diceMis(p).map(str).filter((x) => x !== right)).size >= 2) return p;
    }
  },
  sane: ({ d, f, s }) => (s > f && s < d * f ? null : 'out of range'),
  problem: (p) => {
    const { d, f, s } = p;
    return {
      prompt: t`${d} fair dice, each with faces ${listOf(Array.from({ length: f }, (_, i) => i + 1))}, are thrown. What is the probability that the total is ${s}?`,
      answer: { kind: 'exact', expected: str(diceVal(p)) },
      solution: [
        t`One die has generating function ${math`x + x^{${2}} + \cdots + x^{${f}}`}: one way to score each face. The ${d} dice are independent, so the number of ways to total ${math`s`} is the coefficient of ${math`x^{s}`} in ${math`(x + \cdots + x^{${f}})^{${d}}`}.`,
        t`That coefficient at ${math`x^{${s}}`} is ${diceCount(p)}, out of ${math`${f}^{${d}} = ${f ** d}`} equally likely throws: ${diceVal(p)}.`,
      ],
    };
  },
  solve: ({ d, f, s }) => {
    // Every throw, listed.
    let hits = 0;
    const go = (i: number, sum: number): void => { if (i === d) { if (sum === s) hits++; return; } for (let v = 1; v <= f; v++) go(i + 1, sum + v); };
    go(0, 0);
    return str(q(hits, f ** d));
  },
  misconceptions: (p): Misconception[] => {
    const [noCap, uniform, wrongSpace] = diceMis(p) as [Rational, Rational, Rational];
    return [
      { response: str(noCap), why: t`${math`\binom{s - ${1}}{d - ${1}}`} counts totals with no face limit, so it includes impossible throws with a face above ${p.f}. The factor ${math`x + \cdots + x^{${p.f}}`} stops at ${p.f}.` },
      { response: str(uniform), why: t`The ${p.d * (p.f - 1) + 1} possible totals are not equally likely: middle totals can be made in more ways.` },
      { response: str(wrongSpace), why: t`The equally likely outcomes are the ${math`${p.f}^{${p.d}}`} ordered throws.` },
    ];
  },
  trial: ({ d, f, s }, rng) => { let sum = 0; for (let i = 0; i < d; i++) sum += 1 + Math.floor(rng() * f); return sum === s; },
});

// ---------------------------------------------------------------- Cambridge problems

const A5 = 3;
const R5 = 8;
const NB_P = q(1, 2);
const nbCoef = choose(R5 - 1, A5 - 1);
const q5coef = auto({
  id: 'ia-s3-q5-series',
  source: cite('ia-prob-sheet-3', 'Q5', true),
  title: t`Reading a probability off the negative binomial series`,
  prompt: t`A fair coin is tossed until the ${A5}rd head. Sheet ${3} Q${5} gives the number of tosses ${math`X`} the pgf ${math`G(t) = \left(\frac{t}{${2}}\right)^{${3}}\left(${1} - \frac{t}{${2}}\right)^{-${3}}`}. Use the series ${math`(${1} - y)^{-${3}} = \sum_{j \ge ${0}} \binom{j + ${2}}{${2}}y^{j}`} to find ${math`P(X = ${R5})`}.`,
  answer: { kind: 'exact', expected: str(mul(q(nbCoef), powQ(NB_P, R5))) },
  solution: [
    t`${math`(${1} - y)^{-${3}}`} is the product of three geometric series ${math`${1} + y + y^{${2}} + \cdots`}, and the coefficient of ${math`y^{j}`} counts the ways to write ${math`j`} as an ordered sum of three non-negative parts: ${math`\binom{j + ${2}}{${2}}`}.`,
    t`${math`P(X = ${R5})`} is the coefficient of ${math`t^{${R5}}`}. The factor ${math`(t/${2})^{${3}}`} supplies ${math`t^{${3}}`}, so take ${math`j = ${R5 - A5}`} from the series with ${math`y = t/${2}`}: ${math`\binom{${R5 - A5 + 2}}{${2}} \times \left(\frac{${1}}{${2}}\right)^{${3}} \times \left(\frac{${1}}{${2}}\right)^{${R5 - A5}} = \frac{${nbCoef}}{${2 ** R5}}`}.`,
    t`It agrees with the sheet's ${math`\binom{r - ${1}}{a - ${1}}p^{a}q^{r - a} = \binom{${R5 - 1}}{${A5 - 1}}\left(\frac{${1}}{${2}}\right)^{${R5}}`}.`,
  ],
  reference: `${nbCoef}/${2 ** R5}`,
  verify: () => {
    // Every sequence of 8 tosses: the 3rd head exactly at toss 8.
    let hits = 0;
    for (let m = 0; m < 2 ** R5; m++) {
      let heads = 0;
      let at = -1;
      for (let i = 0; i < R5; i++) if ((m >> i) & 1) { heads++; if (heads === A5) { at = i + 1; break; } }
      if (at === R5) hits++;
    }
    // And the series coefficient by multiplying three truncated geometric series.
    const g = Array.from({ length: R5 + 1 }, () => 1);
    const cube = seriesMul(seriesMul(g, g, R5), g, R5);
    return same('every sequence of tosses', str(q(hits, 2 ** R5)), str(mul(q(nbCoef), powQ(NB_P, R5)))) ?? same('series coefficient', cube[R5 - A5], nbCoef);
  },
  misconceptions: [
    { response: str(q(choose(R5, A5), 2 ** R5)), why: t`${math`\binom{${R5}}{${A5}}`} counts every placing of ${A5} heads among ${R5} tosses. The last toss must be the ${A5}rd head: choose the other ${A5 - 1} among the first ${R5 - 1}.` },
    { response: str(q(choose(R5 - A5 + 2, 2), 2 ** (R5 - A5))), why: t`Keep the factor ${math`(t/${2})^{${3}}`}: its ${math`(${1}/${2})^{${3}}`} multiplies the coefficient.` },
  ],
});

const SH2 = 'ia-prob-sheet-2' as const;
const NP_DOM = { n: { kind: 'integer' as const, min: 1, max: 12 }, p: { kind: 'real' as const, min: 0, max: 1 } };
const q3even = auto({
  id: 'ia-s2-q3-even',
  source: cite(SH2, 'Q3', true),
  title: t`An even number of successes`,
  prompt: t`Independent trials each succeed with probability ${math`p`}. Using the generating function ${math`(q + pt)^{n}`} of the number of successes, where ${math`q = ${1} - p`}, find the probability ${math`P_{n}`} that ${mn} trials give an even number of successes, as an expression in ${mn} and ${math`p`}.`,
  answer: { kind: 'expression', expected: '(1 + (1 - 2p)^n)/2', variables: ['n', 'p'], domains: NP_DOM },
  hints: [
    t`What does ${math`(q + pt)^{n}`} equal at ${math`t = ${1}`}?`,
    t`What does it give at ${math`t = -${1}`}, in terms of the even and odd probabilities?`,
    t`Which combination of the two values keeps only the even terms?`,
  ],
  nudge: t`Not quite. Evaluate the generating function at ${math`t = ${1}`} and ${math`t = -${1}`}, then combine.`,
  solution: [
    t`${math`(q + pt)^{n} = \sum_{k} P(k \text{ successes})t^{k}`}. At ${math`t = ${1}`} it is ${math`${1}`}; at ${math`t = -${1}`} it is ${math`\sum_{k} (-${1})^{k}P(k)`}, the even terms minus the odd terms.`,
    t`Adding, the odd terms cancel: ${math`${2}P_{n} = ${1} + (q - p)^{n}`}, so ${math`P_{n} = \frac{${1}}{${2}}\left(${1} + (${1} - ${2}p)^{n}\right)`}.`,
    t`Average a generating function at ${1} and ${-1} to keep the even terms.`,
  ],
  reference: '1/2 + (1 - 2p)^n/2',
  verify: () => {
    // Every sequence of n trials, for rational p.
    for (const p of [q(1, 3), q(1, 2), q(3, 4)]) {
      for (let n = 1; n <= 9; n++) {
        let even = q(0);
        for (let m = 0; m < 2 ** n; m++) {
          let k = 0;
          let pr = q(1);
          for (let i = 0; i < n; i++) if ((m >> i) & 1) { k++; pr = mul(pr, p); } else pr = mul(pr, sub(q(1), p));
          if (k % 2 === 0) even = add(even, pr);
        }
        const formula = mul(q(1, 2), add(q(1), powQ(sub(q(1), mul(q(2), p)), n)));
        const e = same(`p = ${str(p)}, n = ${n}`, str(even), str(formula));
        if (e !== null) return e;
      }
    }
    return null;
  },
  misconceptions: [
    { response: '1/2', why: t`Even and odd are equally likely only when ${math`p = \tfrac{${1}}{${2}}`}. With one trial, an even number (none) has probability ${math`${1} - p`}.` },
    { response: '(1 - p)^n + p^n', why: t`That is only "none" and "all". Every even count contributes: average the generating function at ${math`t = ${1}`} and ${math`t = -${1}`}.` },
  ],
  // The sheet states P_n = (1 + (1 - 2p)^n)/2 as the result to be shown.
  official: { source: cite(SH2, 'Q3'), answer: '1/2 (1 + (1 - 2p)^n)', agrees: true },
});

const N_PART = 10;
function partitions(n: number, ok: (parts: number[]) => boolean): number {
  let count = 0;
  const go = (left: number, max: number, parts: number[]): void => {
    if (left === 0) { if (ok(parts)) count++; return; }
    for (let k = Math.min(left, max); k >= 1; k--) go(left - k, k, [...parts, k]);
  };
  go(n, n, []);
  return count;
}
const distinctParts = (n: number): number => partitions(n, (ps) => new Set(ps).size === ps.length);
const oddParts = (n: number): number => partitions(n, (ps) => ps.every((x) => x % 2 === 1));
const euler = auto({
  id: 'schedule-distinct-parts',
  source: SCHEDULE,
  title: t`Partitions into distinct parts`,
  prompt: t`A partition of ${N_PART} into distinct parts writes ${N_PART} as a sum of different positive integers, ignoring order, such as ${math`${7} + ${2} + ${1}`}. The number of them is the coefficient of ${math`x^{${N_PART}}`} in ${math`(${1} + x)(${1} + x^{${2}})(${1} + x^{${3}})\cdots`}. How many are there?`,
  answer: { kind: 'exact', expected: String(distinctParts(N_PART)) },
  hints: [
    t`Which factor of the product records whether the part ${math`k`} is used?`,
    t`Which factors can contribute to ${math`x^{${N_PART}}`}?`,
    t`Listing the partitions into distinct parts by their largest part, how many are there?`,
  ],
  nudge: t`Not quite. Each part appears at most once; list the partitions systematically by largest part.`,
  solution: [
    t`Each part ${math`k`} is used once or not at all: the factor ${math`${1} + x^{k}`}. Only factors up to ${math`k = ${N_PART}`} matter for ${math`x^{${N_PART}}`}.`,
    t`Multiplying out, the coefficient of ${math`x^{${N_PART}}`} is ${distinctParts(N_PART)}. Since ${math`${1} + x^{k} = \frac{${1} - x^{${2}k}}{${1} - x^{k}}`}, the product telescopes to ${math`\prod_{k \text{ odd}} \frac{${1}}{${1} - x^{k}}`}: there are just as many partitions into odd parts, ${oddParts(N_PART)}.`,
    t`List systematically by the largest part, or expand the product.`,
  ],
  reference: String(distinctParts(N_PART)),
  verify: () => {
    let acc = [1];
    for (let k = 1; k <= N_PART; k++) acc = seriesMul(acc, Array.from({ length: N_PART + 1 }, (_, i) => (i === 0 || i === k ? 1 : 0)), N_PART);
    return same('product of (1 + x^k)', acc[N_PART], distinctParts(N_PART)) ?? same('odd parts', oddParts(N_PART), distinctParts(N_PART));
  },
  misconceptions: [{ response: String(partitions(N_PART, () => true)), why: t`That counts every partition, repeated parts allowed. Distinct parts use each ${math`k`} at most once: the factor ${math`${1} + x^{k}`}, not ${math`\frac{${1}}{${1} - x^{k}}`}.` }],
});

const eulerProof = supervision({
  id: 'schedule-euler',
  source: SCHEDULE,
  title: t`Distinct parts and odd parts`,
  prompt: t`Prove with generating functions that, for every ${mn}, the number of partitions of ${mn} into distinct parts equals the number of partitions of ${mn} into odd parts. Explain why the formal manipulation of the infinite products is justified for the coefficient of ${math`x^{n}`}.`,
  hints: [
    t`Which product generates partitions into distinct parts, and which generates partitions into odd parts?`,
    t`How does ${math`${1} + x^{k} = \frac{${1} - x^{${2}k}}{${1} - x^{k}}`} make the first product telescope?`,
    t`Why does only a finite part of each product affect the coefficient of ${math`x^{n}`}?`,
  ],
  writeUp: 'proof',
});

const q3proof = supervision({
  id: 'ia-s2-q3',
  source: cite(SH2, 'Q3'),
  title: t`Even successes, two ways`,
  prompt: t`Independent trials are performed, each with probability ${math`p`} of success. Let ${math`P_{n}`} be the probability that ${mn} trials result in an even number of successes. Show that ${math`P_{n} = \frac{${1}}{${2}}\left(${1} + (${1} - ${2}p)^{n}\right)`}, once with the generating function ${math`(q + pt)^{n}`} and once by a recurrence conditioning on the last trial.`,
  hints: [
    t`What do the values of ${math`(q + pt)^{n}`} at ${math`t = ${1}`} and ${math`t = -${1}`} give?`,
    t`Conditioning on the last trial, how is ${math`P_{n}`} related to ${math`P_{n - ${1}}`}?`,
    t`What is the solution of that recurrence with ${math`P_{${0}} = ${1}`}?`,
  ],
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const HOOK = { coins: [1, 2] as const, n: 6 };
const HOOK_WAYS = waysGf(HOOK.coins, HOOK.n);
const claims: ProbabilityClaim[] = [
  { what: 'three dice total ten', exact: diceVal({ d: 3, f: 6, s: 10 }), trial: (rng) => { let s = 0; for (let i = 0; i < 3; i++) s += 1 + Math.floor(rng() * 6); return s === 10; } },
];

export const countingGf: TopicContent = {
  topicId: 'gf.combinatorial',
  goal: t`Count selections and partitions by reading coefficients of a product of power series.`,
  objective: t`Count selections and partitions by multiplying power series and reading off a coefficient.`,
  why: t`It turns counting into algebra; the same products are the pgfs of sums of independent variables.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`A machine for counting` },
    { kind: 'hook', text: t`In how many ways can you pay ${HOOK.n}p with ${1}p and ${2}p coins? Count the ${2}p coins: ${0}, ${1}, ${2}, or ${3} of them, and ${1}p coins make up the rest: ${HOOK_WAYS} ways. Now add ${5}p coins and pay ${50}p, and listing by hand becomes miserable. Is there a way to let algebra do the bookkeeping?` },
    { kind: 'narrative', text: t`Here is the idea. Write the possible amounts from ${2}p coins as powers of ${mx}: ${math`${1} + x^{${2}} + x^{${4}} + \cdots`}, one term per choice. Do the same for ${1}p coins, and multiply. Every term of the product is one way of choosing both, and its power of ${mx} is the total paid. So the coefficient of ${math`x^{${HOOK.n}}`} counts the ways to pay ${HOOK.n}p.` },
    { kind: 'section', title: t`Generating functions` },
    {
      kind: 'definition',
      name: t`Generating function`,
      formal: t`The (ordinary) [[ordinary-generating-function|generating function]] of a sequence ${math`a_{${0}}, a_{${1}}, a_{${2}}, \ldots`} is the power series ${math`A(x) = \sum_{n \ge ${0}} a_{n}x^{n}`}, treated formally: we only ever read off coefficients.`,
      plain: t`A clothes line on which the sequence is hung: ${math`a_{n}`} is the coefficient of ${math`x^{n}`}. The ways to use ${2}p coins are ${math`${1} + x^{${2}} + x^{${4}} + \cdots`}: one way to make each even amount, none for odd amounts.`,
    },
    { kind: 'theorem', name: t`The product rule`, statement: t`If ${math`a_{k}`} counts the ways to make ${math`k`} with one choice and ${math`b_{j}`} the ways to make ${math`j`} with a second, independent choice, then the number of ways to make a combined total ${math`n`} is the coefficient of ${math`x^{n}`} in ${math`A(x)B(x)`}, namely ${math`\sum_{k = ${0}}^{n} a_{k}b_{n - k}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Split by the first choice`, text: t`A pair of choices with total ${mn} has the first making some ${math`k`} between ${0} and ${mn}, and the second making ${math`n - k`}.` },
        { label: t`Count each case`, text: t`For a given ${math`k`} there are ${math`a_{k}b_{n - k}`} such pairs, so there are ${math`\sum_{k} a_{k}b_{n - k}`} in all.` },
        { label: t`Match the product`, text: t`Multiplying out ${math`\left(\sum_{k} a_{k}x^{k}\right)\left(\sum_{j} b_{j}x^{j}\right)`}, the terms in ${math`x^{n}`} are ${math`a_{k}x^{k} \cdot b_{n - k}x^{n - k}`}, with total coefficient ${math`\sum_{k} a_{k}b_{n - k}`}.` },
      ],
    },
    { kind: 'section', title: t`Coins and shares` },
    { kind: 'p', text: t`Any number of ${math`d`}p coins gives the geometric series ${math`${1} + x^{d} + x^{${2}d} + \cdots = \frac{${1}}{${1} - x^{d}}`}. So the ways to pay with ${1}p, ${2}p, and ${5}p coins are the coefficients of ${math`\frac{${1}}{(${1} - x)(${1} - x^{${2}})(${1} - x^{${5}})}`}. For ${HOOK.n}p with ${1}p and ${2}p alone, the coefficient of ${math`x^{${HOOK.n}}`} in ${math`\frac{${1}}{(${1} - x)(${1} - x^{${2}})}`} is ${HOOK_WAYS}, as counted by hand.` },
    checkFrom(coins, { c: 3, n: 12 }, t`Use ${0}, ${3}, or ${6} of the ${2}p coins, with ${4}, ${2}, or ${0} of the ${3}p coins: ${waysGf([2, 3], 12)} ways, the coefficient of ${math`x^{${12}}`} in ${math`\frac{${1}}{(${1} - x^{${2}})(${1} - x^{${3}})}`}.`),
    { kind: 'p', text: t`Shares with a cap: the ways to give ${mn} sweets to ${math`k`} children, at most ${math`m`} each, are the coefficient of ${math`x^{n}`} in ${math`(${1} + x + \cdots + x^{m})^{k}`}, one factor per child. With no cap each factor is ${math`\frac{${1}}{${1} - x}`}, and ${dmath`(${1} - x)^{-k} = \sum_{n \ge ${0}} \binom{n + k - ${1}}{k - ${1}}x^{n},`} which is stars and bars. Sheet ${3} Q${5}'s negative binomial pgf contains exactly this series.`, why: { q: t`Why is that coefficient ${math`\binom{n + k - ${1}}{k - ${1}}`}?`, a: t`It counts solutions of ${math`n_{${1}} + \cdots + n_{k} = n`} in non-negative integers. Write ${mn} stars in a row and insert ${math`k - ${1}`} bars to cut them into ${math`k`} groups: a solution is a choice of which ${math`k - ${1}`} of the ${math`n + k - ${1}`} positions are bars.` } },
    checkFrom(bounded, { k: 3, m: 2, n: 4 }, t`The coefficient of ${math`x^{${4}}`} in ${math`(${1} + x + x^{${2}})^{${3}}`} is ${boundGf({ k: 3, m: 2, n: 4 })}: the shares ${math`(${2}, ${2}, ${0})`} in ${3} orders and ${math`(${2}, ${1}, ${1})`} in ${3} orders.`),
    { kind: 'section', title: t`Probabilities and parity` },
    { kind: 'p', text: t`Divide counts by the number of outcomes and the generating function becomes a pgf. The total of ${3} fair dice has pgf ${math`\left(\frac{x + \cdots + x^{${6}}}{${6}}\right)^{${3}}`}, and its coefficient of ${math`x^{${10}}`} is ${diceVal({ d: 3, f: 6, s: 10 })}.` },
    { kind: 'p', text: t`Evaluating at ${math`x = -${1}`} separates even from odd: ${math`A(${1})`} adds every coefficient, ${math`A(-${1})`} adds the even ones and subtracts the odd ones, so the even coefficients sum to ${math`\frac{A(${1}) + A(-${1})}{${2}}`}. For subsets of an ${mn}-element set, ${math`A(x) = (${1} + x)^{n}`}: the subsets of even size number ${math`\frac{${2}^{n} + ${0}}{${2}} = ${2}^{n - ${1}}`}, for ${math`n \ge ${1}`}.` },
    { kind: 'section', title: t`Partitions` },
    { kind: 'p', text: t`A partition writes ${mn} as a sum of positive integers, ignoring order. Using each part ${math`k`} at most once gives the factor ${math`${1} + x^{k}`}, so ${math`\prod_{k \ge ${1}}(${1} + x^{k})`} counts partitions into distinct parts. Using only odd parts, as often as you like, gives ${math`\prod_{k \text{ odd}} \frac{${1}}{${1} - x^{k}}`}. Euler noticed these are the same product, so the counts agree for every ${mn}: for ${math`n = ${8}`} there are ${distinctParts(8)} of each.`, why: { q: t`Why are the two products equal?`, a: t`${math`${1} + x^{k} = \frac{${1} - x^{${2}k}}{${1} - x^{k}}`}. In the product over all ${math`k`}, every factor ${math`${1} - x^{${2}k}`} on top cancels the factor with exponent ${math`${2}k`} on the bottom, leaving only the odd exponents below.` } },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`The coefficient of ${math`x^{${4}}`} in ${math`(${1} + x + x^{${2}} + \cdots)^{${2}}`} counts the ways to split ${4} sweets into two piles, ignoring which pile is which.`, counterexample: t`It is ${5}: the ordered shares ${math`(${0}, ${4}), (${1}, ${3}), (${2}, ${2}), (${3}, ${1}), (${4}, ${0})`}. One factor per child means the children are told apart; unordered splits number ${3}.` },
    { kind: 'pitfall', claim: t`For partitions into distinct parts, each part contributes ${math`\frac{${1}}{${1} - x^{k}}`}.`, counterexample: t`That allows a part to be used many times: it would count ${math`${1} + ${1} + ${1}`} as a partition of ${3}. Distinct parts need ${math`${1} + x^{k}`}: use it once or not at all.` },
    { kind: 'takeaway', text: t`One factor per independent choice, one power of ${mx} per amount: the count you want is a coefficient of the product.` },
  ],
  examples: [
    { ...workedCambridge(q5coef), examiner: t`The examiner looks for the series coefficient identified, the factor ${math`(t/${2})^{${3}}`} accounted for, and agreement with the direct formula.` },
    worked(coins, { c: 1, n: 10 }, t`Paying ten pence`),
    worked(bounded, { k: 3, m: 3, n: 5 }, t`Five sweets, three children, at most three each`),
  ],
  generators: [coins, bounded, dice],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['ordinary-generating-function'],
  claims,
  cambridge: withUses([q3even, euler, eulerProof, q3proof], {
    'ia-s2-q3': { sections: ['Probabilities and parity'], note: t`An even count by a generating function, and by a recurrence` },
    'ia-s2-q3-even': { sections: ['Probabilities and parity'], note: t`An even count by a generating function` },
  }),
  gate: ['ia-s2-q3', 'ia-s2-q3-even'],
  recall: [
    { front: t`The product rule for generating functions.`, back: t`Independent choices multiply: the coefficient of ${math`x^{n}`} in ${math`A(x)B(x)`} is ${math`\sum_{k} a_{k}b_{n - k}`}.` },
    { front: t`The generating function for any number of ${math`d`}p coins.`, back: t`${math`\frac{${1}}{${1} - x^{d}}`}.` },
    { front: t`The coefficient of ${math`x^{n}`} in ${math`(${1} - x)^{-k}`}.`, back: t`${math`\binom{n + k - ${1}}{k - ${1}}`}, by stars and bars.` },
  ],
  proofOrder: [
    {
      title: t`The product rule`,
      steps: [
        t`A pair of choices with total ${mn} has the first making ${math`k`} and the second ${math`n - k`}.`,
        t`For each ${math`k`} there are ${math`a_{k}b_{n - k}`} such pairs.`,
        t`So there are ${math`\sum_{k} a_{k}b_{n - k}`} in all.`,
        t`That is the coefficient of ${math`x^{n}`} in ${math`A(x)B(x)`}.`,
      ],
    },
  ],
};
