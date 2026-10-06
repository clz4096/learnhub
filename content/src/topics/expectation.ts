/**
 * rv.expectation: the expectation of a discrete random variable, E(X) = Σ x P(X = x), read
 * as a long-run average. From Mixed STEP 1 Statistics Q1(i) (P(X = x) = kx, where the
 * question gives the definition) and Q4(iii) (the longest run of girls), STEP 2 Statistics
 * Q3(ii), (iii) (a fair stake), STEP 3 Statistics Q1(ii) (the frog's expected number of
 * jumps), the STEP 2 topic notes (pages 2 and 4), and STEP Support Assignment 19 Q4(ii)
 * (the bet on three dice, whose hints give the expected gain 17/216). Every official
 * answer is compared in the content checks.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { add, div, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { dmath, join, listOf, math, t, type Rich } from '../rich';
import { quickCheck, worked, workedCambridge, type TopicContent } from '../topic';
import { average, frogMean, mean, positions, rsum, threePointGame, throwsOf, type Dist } from '../partv-a';

const [mX] = [math`X`];
const MIX = 'step-mixed-stats1' as const;
const MIXS = 'step-mixed-stats1-hints' as const;

/** "P(X = 1) = 1/4, P(X = 2) = 1/2, ..." for a prompt. */
const distText = (d: Dist): Rich => join(d.map(([x, p]) => [math`P(X = ${x}) = ${p}`]), ', ');
const sumTex = (d: Dist): Rich => [math`${join(d.map(([x, p]) => [math`${x} \times ${p}`]), ' + ')}`];
const distinctFrom = (right: string, xs: readonly string[]): number => new Set(xs.filter((x) => x !== right)).size;

// ---------------------------------------------------------------- from a table

interface TableP { xs: readonly number[]; ws: readonly number[] }

const tableDist = ({ xs, ws }: TableP): Dist => {
  const w = ws.reduce((a, b) => a + b, 0);
  return xs.map((x, i) => [q(x), q(ws[i] as number, w)] as const);
};
const tableMis = (p: TableP): string[] => {
  const d = tableDist(p);
  const mode = [...d].sort((a, b) => Number(b[1].num * a[1].den - a[1].num * b[1].den))[0]?.[0] ?? q(0);
  return [str(q(p.xs.reduce((a, b) => a + b, 0), p.xs.length)), str(mode), str(div(mean(d), q(p.xs.length)))];
};

const fromTable = generator<TableP>({
  id: 'from-table',
  skill: 'Compute E(X) = Σ x P(X = x) from a distribution given value by value.',
  params: (rng) => {
    for (;;) {
      const k = int(rng, 3, 4);
      const xs = [...new Set(Array.from({ length: k }, () => int(rng, -3, 9)))].sort((a, b) => a - b);
      if (xs.length !== k) continue;
      const ws = xs.map(() => int(rng, 1, 5));
      const p: TableP = { xs, ws };
      const right = str(mean(tableDist(p)));
      if (new Set(ws).size > 1 && distinctFrom(right, tableMis(p)) >= 2) return p;
    }
  },
  sane: ({ xs, ws }) => (xs.length === ws.length && ws.every((w) => w > 0) ? null : 'out of range'),
  problem: (p) => {
    const d = tableDist(p);
    return {
      prompt: t`The random variable ${mX} has ${distText(d)}, and takes no other values. Find ${math`E(X)`}.`,
      answer: { kind: 'exact', expected: str(mean(d)) },
      solution: [
        t`Multiply each value by its probability and add: ${math`E(X) = \sum_{x} x \, P(X = x)`}.`,
        t`${math`${sumTex(d)} = ${mean(d)}`}.`,
      ],
    };
  },
  solve: ({ xs, ws }) => {
    // A long run in which each value turns up in proportion to its weight: the average of that population.
    const population = xs.flatMap((x, i) => Array.from({ length: ws[i] as number }, () => x));
    return str(q(population.reduce((a, b) => a + b, 0), population.length));
  },
  misconceptions: (p): Misconception[] => {
    const [plainMean, mode, divided] = tableMis(p);
    return [
      { response: plainMean as string, why: t`That is the plain average of the values, as if they were equally likely. Weight each value by its probability.` },
      { response: mode as string, why: t`That is the most likely value, the mode. The expectation weights every value by its probability.` },
      { response: divided as string, why: t`The weights are already probabilities that add to ${1}: do not divide by the number of values.` },
    ];
  },
});

// ---------------------------------------------------------------- find k, then the mean

const SHAPES = ['x', 'x^2', 'rev'] as const;
type Shape = (typeof SHAPES)[number];
interface KP { m: number; shape: Shape }
const weight = (shape: Shape, m: number, x: number): number => (shape === 'x' ? x : shape === 'x^2' ? x * x : m + 1 - x);
const shapeTex = (shape: Shape, m: number): Rich => (shape === 'x' ? [math`kx`] : shape === 'x^2' ? [math`kx^{${2}}`] : [math`k(${m + 1} - x)`]);
const kOf = ({ m, shape }: KP): Rational => q(1, Array.from({ length: m }, (_, i) => weight(shape, m, i + 1)).reduce((a, b) => a + b, 0));
const kDist = (p: KP): Dist => Array.from({ length: p.m }, (_, i) => [q(i + 1), mul(kOf(p), q(weight(p.shape, p.m, i + 1)))] as const);

const findK = generator<KP>({
  id: 'find-k',
  skill: 'Find the constant that makes a distribution add to 1, then compute E(X), as Mixed STEP 1 Statistics Q1(i) does.',
  params: (rng) => ({ m: int(rng, 3, 6), shape: pick(rng, SHAPES) }),
  sane: ({ m }) => (m >= 3 && m <= 6 ? null : 'out of range'),
  problem: (p) => {
    const d = kDist(p);
    const sumW = Array.from({ length: p.m }, (_, i) => weight(p.shape, p.m, i + 1)).reduce((a, b) => a + b, 0);
    return {
      prompt: t`The random variable ${mX} has ${math`P(X = x) = ${shapeTex(p.shape, p.m)}`} for ${math`x = ${1}, ${2}, \ldots, ${p.m}`}, and ${math`P(X = x) = ${0}`} otherwise. Find ${math`E(X)`}.`,
      answer: { kind: 'exact', expected: str(mean(d)) },
      solution: [
        t`The probabilities add to ${1}: ${math`k \times ${sumW} = ${1}`}, so ${math`k = ${kOf(p)}`}.`,
        t`${math`E(X) = \sum_{x} x \, P(X = x) = ${sumTex(d)} = ${mean(d)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // The same weights as counts in a population, averaged.
    const pop = Array.from({ length: p.m }, (_, i) => Array.from({ length: weight(p.shape, p.m, i + 1) }, () => i + 1)).flat();
    return str(q(pop.reduce((a, b) => a + b, 0), pop.length));
  },
  misconceptions: (p): Misconception[] => {
    const raw = Array.from({ length: p.m }, (_, i) => (i + 1) * weight(p.shape, p.m, i + 1)).reduce((a, b) => a + b, 0);
    return [
      { response: String(raw), why: t`That leaves out ${math`k`}. First make the probabilities add to ${1}: ${math`k = ${kOf(p)}`}.` },
      { response: str(q(p.m + 1, 2)), why: t`That is the middle value, the mean if every value were equally likely. Here the probabilities are not equal.` },
      { response: str(kOf(p)), why: t`That is ${math`k`}. Go on to ${math`E(X) = \sum_{x} x \, P(X = x)`}.` },
    ];
  },
});

// ---------------------------------------------------------------- a game: expected gain or fair stake

interface GameP { big: number; small: number; nBig: number; nSmall: number; stake: number; ask: 'gain' | 'fair' }
const gameDist = (p: GameP): Dist => [
  [q(p.big), q(p.nBig, 6)],
  [q(p.small), q(p.nSmall, 6)],
  [q(0), q(6 - p.nBig - p.nSmall, 6)],
];
const gameAnswer = (p: GameP): Rational => (p.ask === 'gain' ? sub(mean(gameDist(p)), q(p.stake)) : mean(gameDist(p)));
const gameMis = (p: GameP): string[] => {
  const prize = mean(gameDist(p));
  return p.ask === 'gain'
    ? [str(prize), str(sub(q(p.big + p.small, 2), q(p.stake))), str(sub(q(p.stake), prize))]
    : [str(q(p.big + p.small, 2)), str(q(p.big + p.small)), str(mul(q(p.big), q(p.nBig, 6)))];
};
const faces = (n: number, from: number): Rich => (n === 1 ? t`a ${from}` : t`a ${from} or ${from - 1}`);

const expectedGain = generator<GameP>({
  id: 'expected-gain',
  skill: 'Find the expected gain of a game with a stake, or the stake that makes it fair (expected gain 0).',
  params: (rng) => {
    for (;;) {
      const p: GameP = { big: int(rng, 6, 12), small: int(rng, 1, 4), nBig: 1, nSmall: int(rng, 1, 2), stake: int(rng, 1, 4), ask: pick(rng, ['gain', 'fair'] as const) };
      if (distinctFrom(str(gameAnswer(p)), gameMis(p)) >= 2) return p;
    }
  },
  sane: ({ nBig, nSmall }) => (nBig + nSmall < 6 ? null : 'out of range'),
  problem: (p) => {
    const d = gameDist(p);
    const prize = mean(d);
    const rules = t`A fair die is thrown. A six wins £${p.big}, ${faces(p.nSmall, 5)} wins £${p.small}, and anything else wins nothing.`;
    return p.ask === 'gain'
      ? {
          prompt: t`${rules} It costs £${p.stake} to play. What is the expected gain per game, in pounds? (A loss is a negative gain.)`,
          answer: { kind: 'exact', expected: str(gameAnswer(p)) },
          solution: [
            t`The prize ${math`W`} has ${join(d.map(([x, pr]) => [math`P(W = ${x}) = ${pr}`]), ', ')}, so ${math`E(W) = ${prize}`}.`,
            t`The gain is ${math`W - ${p.stake}`}, and its expectation is ${math`${prize} - ${p.stake} = ${gameAnswer(p)}`}: the stake is paid every game, whatever the die shows.`,
          ],
        }
      : {
          prompt: t`${rules} What stake, in pounds, makes the game fair, that is, makes the expected gain ${0}?`,
          answer: { kind: 'exact', expected: str(gameAnswer(p)) },
          solution: [
            t`The prize ${math`W`} has ${join(d.map(([x, pr]) => [math`P(W = ${x}) = ${pr}`]), ', ')}, so ${math`E(W) = ${prize}`}.`,
            t`The expected gain is ${math`E(W) - s`}, which is ${0} when the stake is ${math`s = ${prize}`}.`,
          ],
        };
  },
  solve: (p) => {
    // Average the gain over the six equally likely faces.
    const prizeOf = (f: number): number => (f === 6 ? p.big : f >= 6 - p.nSmall ? p.small : 0);
    const faceList = [1, 2, 3, 4, 5, 6];
    const avg = average(faceList, (f) => q(prizeOf(f) - (p.ask === 'gain' ? p.stake : 0)));
    return str(avg);
  },
  misconceptions: (p): Misconception[] => {
    const [a, b, c] = gameMis(p);
    return p.ask === 'gain'
      ? [
          { response: a as string, why: t`That is the expected prize. The gain subtracts the stake of £${p.stake}, paid every game.` },
          { response: b as string, why: t`The two prizes are not equally likely: weight each by its probability, and remember the faces that win nothing.` },
          { response: c as string, why: t`The sign is the wrong way round: gain is what you win minus what you pay.` },
        ]
      : [
          { response: a as string, why: t`The prizes are not equally likely, and some faces win nothing: weight each prize by its probability.` },
          { response: b as string, why: t`That is the total of the prizes. A fair stake is the expected prize, ${math`\sum w \, P(W = w)`}.` },
          { response: c as string, why: t`That counts only the six. The smaller prize contributes to the expected prize too.` },
        ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const q1Dist: Dist = [1, 2, 3, 4].map((x) => [q(x), q(x, 10)] as const);
const q1c = auto({
  id: 'mixed-q1-i-c',
  source: cite(MIX, 'Q1(i)'),
  title: t`${math`P(X = x) = kx`}: the expectation`,
  prompt: t`The expectation of a discrete random variable is ${math`E(X) = \sum_{n} n \times P(X = n)`}, summed over all possible values ${math`n`}. The random variable ${mX} has ${math`P(X = x) = kx`} for ${math`x = ${1}, ${2}, ${3}, ${4}`}, and ${0} otherwise. Find ${math`k`}, and then ${math`E(X)`}.`,
  answer: { kind: 'exact', expected: str(mean(q1Dist)) },
  solution: [
    t`The probabilities add to ${1}: ${math`k + ${2}k + ${3}k + ${4}k = ${10}k = ${1}`}, so ${math`k = ${q(1, 10)}`}.`,
    t`${math`E(X) = ${q(1, 10)}(${1} \times ${1} + ${2} \times ${2} + ${3} \times ${3} + ${4} \times ${4}) = \frac{${30}}{${10}} = ${mean(q1Dist)}`}.`,
  ],
  reference: str(mean(q1Dist)),
  verify: () => same('the probabilities add to 1', str(rsum(q1Dist.map(([, p]) => p))), '1') ?? same('E(X) by a population of 10', str(q(1 * 1 + 2 * 2 + 3 * 3 + 4 * 4, 10)), str(mean(q1Dist))),
  misconceptions: [{ response: str(q(5, 2)), why: t`That is the average of ${listOf([1, 2, 3, 4])}, as if they were equally likely. Larger values are more likely here.` }],
  official: { source: cite(MIXS, 'Q1(i)(c)'), answer: '3', agrees: true },
});

const q1b = auto({
  id: 'mixed-q1-i-b',
  source: cite(MIX, 'Q1(i)(b)'),
  title: t`${math`P(X = x) = kx`}: at least ${3}`,
  prompt: t`The random variable ${mX} has ${math`P(X = x) = kx`} for ${math`x = ${1}, ${2}, ${3}, ${4}`}, and ${0} otherwise. Find ${math`P(X \ge ${3})`}.`,
  answer: { kind: 'exact', expected: str(q(7, 10)) },
  solution: [
    t`As in the worked example, ${math`k = ${q(1, 10)}`}.`,
    t`${math`P(X \ge ${3}) = P(X = ${3}) + P(X = ${4}) = ${q(3, 10)} + ${q(4, 10)} = ${q(7, 10)}`}.`,
  ],
  reference: '7/10',
  verify: () => same('P(X >= 3) from the distribution', str(rsum(q1Dist.filter(([x]) => x.num >= 3n).map(([, p]) => p))), '7/10'),
  misconceptions: [{ response: str(q(3, 10)), why: t`That is ${math`P(X = ${3})`} only. "At least ${3}" includes ${math`X = ${4}`}.` }],
  official: { source: cite(MIXS, 'Q1(i)(b)'), answer: '7/10', agrees: true },
});

// A19 Q4(ii): £1 for no sixes; pay £1, £2, £3 for one, two, three sixes.
const gainOf = (sixes: number): number => (sixes === 0 ? 1 : -sixes);
const a19Gain = average(throwsOf(6, 3), (o) => q(gainOf(o.filter((f) => f === 6).length)));
const a19 = auto({
  id: 'a19-q4-ii-gain',
  source: cite('step-f19', 'Q4(ii)', true),
  title: t`Should I accept the bet?`,
  prompt: t`I am about to throw three fair dice. My friend offers to give me £${1} if I throw no sixes, provided I give her £${1} if I throw one six, £${2} if I throw two sixes, and £${3} if I throw three sixes. What is my expected gain per game, in pounds? Should I accept?`,
  answer: { kind: 'exact', expected: str(a19Gain) },
  solution: [
    t`The number of sixes is ${math`B(${3}, ${q(1, 6)})`}: no sixes ${math`\frac{${125}}{${216}}`}, one ${math`\frac{${75}}{${216}}`}, two ${math`\frac{${15}}{${216}}`}, three ${math`\frac{${1}}{${216}}`}.`,
    t`The gain is ${1}, ${math`-${1}`}, ${math`-${2}`}, ${math`-${3}`} in those cases, so its expectation is ${math`\frac{${125} - ${75} - ${30} - ${3}}{${216}} = ${a19Gain}`}. It is positive, so accept: over ${216} games I expect to be about £${17} ahead.`,
  ],
  reference: str(a19Gain),
  verify: () => same('the hints\' terms', str(q(125 - 75 - 2 * 15 - 3 * 1, 216)), str(a19Gain)),
  misconceptions: [
    { response: str(q(125 - 75 - 15 - 1, 216)), why: t`That counts each losing case as £${1}. Two sixes cost £${2} and three cost £${3}: multiply each probability by its amount.` },
    { response: str(sub(q(0), a19Gain)), why: t`That is my friend's expected gain. Mine has the opposite sign.` },
  ],
  official: { source: cite('step-f19-hints', 'Q4(ii)'), answer: '17/216', agrees: true },
});

const P23 = q(2, 3);
const g23 = threePointGame(P23);
const w23 = div(g23.y, sub(q(1), g23.draw));
const kFair = div(sub(q(1), w23), w23);
const s2q3ii = auto({
  id: 's2-q3-ii-fair-stake',
  source: cite('step-s2-stats', 'Q3(ii)', true),
  title: t`A fair stake for the match`,
  prompt: t`Xavier and Younis play a match of three-point games. In part (i), Younis wins the match with probability ${math`w = \frac{${1} - p^{${2}}}{${2} - p}`}, and for ${math`p > ${0}`} the match ends with probability ${1}. If Xavier wins the match, Younis gives him £${1}; if Younis wins, Xavier gives him £${math`k`}. Find the value of ${math`k`} that makes the match fair when ${math`p = ${P23}`}.`,
  answer: { kind: 'exact', expected: str(kFair) },
  solution: [
    t`With ${math`p = ${P23}`}: ${math`w = \frac{${1} - ${q(4, 9)}}{${2} - ${P23}} = ${w23}`}, and Xavier wins with probability ${math`${1} - w = ${sub(q(1), w23)}`}.`,
    t`Fair means Younis's expected gain is ${0}: ${math`k \times ${w23} - ${1} \times ${sub(q(1), w23)} = ${0}`}, so ${math`k = ${kFair}`}.`,
  ],
  reference: str(kFair),
  verify: () => {
    // The game tree, point by point, against the closed form w = (1 - p^2)/(2 - p).
    const closed = div(sub(q(1), mul(P23, P23)), sub(q(2), P23));
    return same('w from the game tree', str(w23), str(closed)) ?? same('Younis expects 0', str(sub(mul(kFair, w23), sub(q(1), w23))), '0');
  },
  misconceptions: [
    { response: str(div(w23, sub(q(1), w23))), why: t`That is upside down. Younis wins less often, so he must be paid more when he wins: ${math`k \times w = ${1} \times (${1} - w)`}.` },
    { response: '1', why: t`Equal stakes are fair only when both are equally likely to win; here ${math`w = ${w23}`}.` },
  ],
  official: { source: cite('step-s2-stats-solutions', 'Q3(ii)'), answer: '7/5', agrees: true },
});

/** E(K) for n boys and 3 girls in a random line, K the longest run of girls, by listing every set of places for the girls. */
function longestRunMean(n: number): Rational {
  const sets = positions(n + 3, 3);
  return average(sets, (g) => {
    let best = 1;
    let run = 1;
    for (let i = 1; i < 3; i++) { run = (g[i] as number) === (g[i - 1] as number) + 1 ? run + 1 : 1; best = Math.max(best, run); }
    return q(best);
  });
}
const N_DOM = { n: { kind: 'integer' as const, min: 0, max: 20 } };
const q4iii = auto({
  id: 'mixed-q4-iii',
  source: cite(MIX, 'Q4(iii)'),
  title: t`The longest run of girls: its mean`,
  prompt: t`I seat ${math`n`} boys and ${3} girls in a line at random, every order equally likely. ${math`K`} is the largest number of girls sitting next to each other in a row. Given ${math`P(K = ${3}) = \frac{${6}}{(n + ${2})(n + ${3})}`} and ${math`P(K = ${1}) = \frac{n(n - ${1})}{(n + ${2})(n + ${3})}`}, find ${math`E(K)`} as a single fraction in ${math`n`}.`,
  answer: { kind: 'expression', expected: '(n + 9)/(n + 3)', variables: ['n'], domains: N_DOM },
  solution: [
    t`${math`K`} is ${1}, ${2}, or ${3}, so ${math`P(K = ${2}) = ${1} - \frac{n(n - ${1}) + ${6}}{(n + ${2})(n + ${3})} = \frac{${6}n}{(n + ${2})(n + ${3})}`}.`,
    t`${math`E(K) = \frac{n(n - ${1}) + ${12}n + ${18}}{(n + ${2})(n + ${3})} = \frac{(n + ${9})(n + ${2})}{(n + ${2})(n + ${3})} = \frac{n + ${9}}{n + ${3}}`}, between ${1} and ${3} as it must be.`,
  ],
  reference: '(n + 9)/(n + 3)',
  verify: () => {
    for (let n = 0; n <= 8; n++) {
      const e = same(`n = ${n}, every placing of the girls`, str(longestRunMean(n)), str(q(n + 9, n + 3)));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: '2', why: t`${math`K`} is not equally likely to be ${1}, ${2}, or ${3}: weight each value by its probability.` }],
  official: { source: cite(MIXS, 'Q4(iii)'), answer: '(n + 9)/(n + 3)', agrees: true },
});

const Q_DOM = { q: { kind: 'real' as const, min: 0.05, max: 0.95 } };
const s3u3 = auto({
  id: 's3-q1-ii-u3',
  source: cite('step-s3-stats', 'Q1(ii)'),
  title: t`The frog from two and a half metres`,
  prompt: t`A frog jumps towards a large pond, each jump ${1} m with probability ${math`p`} or ${2} m with probability ${math`q`}, independently, where ${math`p + q = ${1}`}. Let ${math`u_{n}`} be the expected number of jumps, starting ${math`n - \frac{${1}}{${2}}`} m from the edge, to land in the pond for the first time. Find ${math`u_{${3}}`} in terms of ${math`q`}.`,
  answer: { kind: 'expression', expected: '3 - 2q + q^2', variables: ['q'], domains: Q_DOM },
  solution: [
    t`From ${math`${2}\frac{${1}}{${2}}`} m the frog needs two or three jumps. Two jumps when the first is ${2} m (probability ${math`q`}), or ${1} m then ${2} m (probability ${math`pq`}): ${math`P(\text{two}) = q + pq`}. Three jumps when the first two are ${1} m: probability ${math`p^{${2}}`}. They add to ${1}.`,
    t`${math`u_{${3}} = ${2}(q + pq) + ${3}p^{${2}}`}, and with ${math`p = ${1} - q`} this is ${math`${2}q + ${2}q - ${2}q^{${2}} + ${3} - ${6}q + ${3}q^{${2}} = ${3} - ${2}q + q^{${2}}`}.`,
  ],
  reference: '3 - 2q + q^2',
  verify: () => {
    for (const qq of [q(1, 3), q(1, 2), q(3, 4), q(1, 10)]) {
      const e = same(`q = ${str(qq)}, every jump sequence`, str(frogMean(3, qq)), str(add(sub(q(3), mul(q(2), qq)), mul(qq, qq))));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: '2q + 3(1 - q)', why: t`From ${math`${2}\frac{${1}}{${2}}`} m, a single ${2} m jump is not enough: it leaves the frog half a metre away. Two jumps can also be ${1} m then ${2} m.` }],
  official: { source: cite('step-s3-stats-solutions', 'Q1(ii)'), answer: '3 - 2q + q^2', agrees: true },
});

const s2q3iii = supervision({
  id: 's2-q3-iii-p-zero',
  source: cite('step-s2-stats', 'Q3(iii)'),
  title: t`The match when ${math`p = ${0}`}`,
  prompt: t`In the match of three-point games, what happens when ${math`p = ${0}`}? Work out who wins each point of a game, explain why the formula ${math`w = \frac{${1} - p^{${2}}}{${2} - p}`} no longer gives the probability that Younis wins, and why no stake can make the match fair or unfair.`,
  writeUp: 'explanation',
  official: cite('step-s2-stats-solutions', 'Q3(iii)'),
});
const poissonMean = supervision({
  id: 's2-notes-poisson-mean',
  source: cite('step-s2-stats-notes', 'page 4'),
  title: t`The mean of a Poisson distribution`,
  prompt: t`The topic notes show that ${math`\sum_{n = ${0}}^{\infty} \frac{e^{-\lambda}\lambda^{n}}{n!} = ${1}`} by the exponential series, and suggest you show that ${math`E(X) = \lambda`}. Prove it: write ${math`E(X)`} as a series, explain why the ${math`n = ${0}`} term vanishes, and use the same series again.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const [mx, mn] = [math`x`, math`n`];
/** A game: win 5 with probability 1/6, win 1 with probability 1/3, lose 2 otherwise. */
const GAME: Dist = [[q(5), q(1, 6)], [q(1), q(1, 3)], [q(-2), q(1, 2)]];
const coin: Dist = [[q(0), q(1, 4)], [q(1), q(1, 2)], [q(2), q(1, 4)]];

export const expectation: TopicContent = {
  topicId: 'rv.expectation',
  goal: t`Compute ${math`E(X) = \sum_{x} x \, P(X = x)`} from a distribution, and read it as the long-run average of ${mX}.`,
  objective: t`Compute ${math`E(X) = \sum_{x} x \, P(X = x)`} and read it as a long-run average.`,
  why: t`Expectation is the single most used number in probability; next come variance and the tail-sum formula.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`The long-run average` },
    { kind: 'hook', text: t`A game costs nothing to play. You win £${5} with probability ${q(1, 6)}, win £${1} with probability ${q(1, 3)}, and lose £${2} otherwise. Should you play? Each single game is a gamble. But play a thousand times, and the average per game settles down to one number. Which number?` },
    { kind: 'narrative', text: t`Imagine ${600} games. About ${100} win £${5}, about ${200} win £${1}, and about ${300} lose £${2}. The total is about ${math`${100} \times ${5} + ${200} \times ${1} - ${300} \times ${2} = ${100 * 5 + 200 - 300 * 2}`} pounds, so ${math`\frac{${100 * 5 + 200 - 300 * 2}}{${600}} = ${q(100 * 5 + 200 - 300 * 2, 600)}`} per game. Notice the ${600} cancels: each value is simply weighted by its probability.` },
    {
      kind: 'definition',
      name: t`Expectation`,
      formal: t`Let ${mX} be a discrete random variable. Its [[expectation|expectation]] or mean is ${dmath`E(X) = \sum_{x} x \, P(X = x),`} the sum over every value ${mx} that ${mX} takes (when the sum has finitely many terms, or converges absolutely).`,
      plain: t`multiply each value by its probability and add. For the game, ${math`E(X) = ${sumTex(GAME)} = ${mean(GAME)}`}.`,
    },
    { kind: 'p', text: t`So on average you gain ${mean(GAME)} of a pound per game: play. A game is a [[fair-game|fair game]] when the expected gain is ${0}, so neither side is favoured in the long run.` },
    {
      kind: 'p',
      text: t`The mean need not be a value ${mX} can take. A fair die has ${math`E(X) = \frac{${1} + ${2} + \cdots + ${6}}{${6}} = ${q(7, 2)}`}, which no roll shows. Nor is it the most likely value. It is a balance point: put weight ${math`P(X = x)`} at each ${mx} on a ruler, and the ruler balances at ${math`E(X)`}.`,
      why: { q: t`Why does the average of many plays approach ${math`E(X)`}?`, a: t`In ${mn} plays, the value ${mx} turns up about ${math`n P(X = x)`} times, so the total is about ${math`\sum_{x} x \, n P(X = x)`} and the average about ${math`E(X)`}. The weak law of large numbers, later in the course, makes "about" precise.` },
    },
    quickCheck({
      prompt: t`${mX} takes the values ${0}, ${1}, ${2} with probabilities ${q(1, 4)}, ${q(1, 2)}, ${q(1, 4)}. What is ${math`E(X)`}?`,
      answer: { kind: 'exact', expected: str(mean(coin)) },
      reference: str(mean(coin)),
      why: t`${math`${sumTex(coin)} = ${mean(coin)}`}. The distribution is symmetric about ${1}, so the balance point is ${1}.`,
    }),
    { kind: 'section', title: t`A formula for a whole family` },
    { kind: 'narrative', text: t`The die's mean, ${q(7, 2)}, is halfway between ${1} and ${6}. Is that a coincidence? Here is the general fact, proved straight from the definition.` },
    { kind: 'theorem', statement: t`Let ${mn} be a positive integer, and let ${mX} be uniform on ${math`\{${1}, ${2}, \ldots, n\}`}: ${math`P(X = k) = \frac{${1}}{n}`} for each ${math`k`}. Then ${math`E(X) = \frac{n + ${1}}{${2}}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Apply the definition`, text: t`${math`E(X) = \sum_{k = ${1}}^{n} k \cdot \frac{${1}}{n}`}.`, plain: t`Each value ${math`k`} has the same probability, ${math`\frac{${1}}{n}`}.` },
        { label: t`Take out the constant`, text: t`${math`E(X) = \frac{${1}}{n} \sum_{k = ${1}}^{n} k`}.`, plain: t`${math`\frac{${1}}{n}`} multiplies every term, so it can be taken outside the sum.` },
        { label: t`Sum the integers`, text: t`${math`\sum_{k = ${1}}^{n} k = \frac{n(n + ${1})}{${2}}`}.`, plain: t`The arithmetic series: pair the first with the last, the second with the second last, and so on, each pair adding to ${math`n + ${1}`}.` },
        { label: t`Simplify`, text: t`${math`E(X) = \frac{${1}}{n} \cdot \frac{n(n + ${1})}{${2}} = \frac{n + ${1}}{${2}}`}.`, plain: t`The ${mn} cancels. With ${math`n = ${6}`}: ${q(7, 2)}, the die.` },
      ],
    },
    {
      kind: 'pitfall',
      claim: t`${math`E(X)`} is the value ${mX} is most likely to take.`,
      counterexample: t`In the hook's game the most likely result is losing £${2}, with probability ${q(1, 2)}, yet ${math`E(X) = ${mean(GAME)}`}. The mean balances all the values; the most likely one is the mode.`,
    },
    { kind: 'section', title: t`Fair stakes` },
    { kind: 'p', text: t`To make a game fair, set the stake equal to the expected prize: then the expected gain, prize minus stake, is ${0}. STEP questions often ask for exactly this stake, or ask whether a bet is worth accepting. Write down every outcome's gain and probability, check the probabilities add to ${1}, and only then multiply and add.` },
    { kind: 'takeaway', text: t`${math`E(X) = \sum_{x} x \, P(X = x)`}: weight each value by its probability; it is the long-run average, not necessarily a possible or likely value.` },
  ],
  examples: [
    { ...workedCambridge(q1c), examiner: t`The condition that the probabilities add to ${1} used to find ${math`k`} before anything else, then the definition of ${math`E(X)`} applied term by term.` },
    worked(fromTable, { xs: [0, 1, 2, 5], ws: [3, 4, 2, 1] }, t`A distribution given value by value`),
    worked(expectedGain, { big: 10, small: 2, nBig: 1, nSmall: 2, stake: 3, ask: 'gain' }, t`A dice game with a stake`),
  ],
  generators: [fromTable, findK, expectedGain],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['expectation', 'fair-game'],
  cambridge: [q1b, a19, s2q3ii, q4iii, s3u3, s2q3iii, poissonMean],
  // STEP questions, best first: the longest run of girls and the frog need a distribution built before the
  // mean; then the fair stake, the Poisson mean, the three-dice bet, and the degenerate match.
  // Mixed Q1(i)(b) is one probability, not an expectation, left out.
  gate: ['mixed-q4-iii', 's3-q1-ii-u3', 's2-q3-ii-fair-stake', 's2-notes-poisson-mean', 'a19-q4-ii-gain', 's2-q3-iii-p-zero'],
  recall: [
    { front: t`Define ${math`E(X)`} for a discrete random variable.`, back: t`${math`\sum_{x} x \, P(X = x)`}, over every value ${mx}.` },
    { front: t`What is a fair game?`, back: t`One whose expected gain is ${0}.` },
    { front: t`Mean of the uniform distribution on ${math`\{${1}, \ldots, n\}`}?`, back: t`${math`\frac{n + ${1}}{${2}}`}.` },
    { front: t`Must ${math`E(X)`} be a value ${mX} can take?`, back: t`No: a fair die has mean ${q(7, 2)}.` },
  ],
  proofOrder: [
    {
      title: t`The mean of the uniform distribution on ${math`\{${1}, \ldots, n\}`}`,
      steps: [
        t`${math`E(X) = \sum_{k = ${1}}^{n} k \cdot \frac{${1}}{n}`}.`,
        t`Take out ${math`\frac{${1}}{n}`}: ${math`E(X) = \frac{${1}}{n} \sum_{k = ${1}}^{n} k`}.`,
        t`${math`\sum_{k = ${1}}^{n} k = \frac{n(n + ${1})}{${2}}`}.`,
        t`So ${math`E(X) = \frac{n + ${1}}{${2}}`}.`,
      ],
    },
  ],
};
