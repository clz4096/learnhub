/**
 * rv.indicators: write a count as a sum of indicator variables and find its mean by
 * linearity, even when the indicators are dependent; its variance from pairs. From STEP 3
 * Statistics Q3 (2013 S3 Q12: the runs of As in a random row of As and Bs, E(S) = a(b + 1)/n
 * and the double sum of E(X_i X_j)) and IA Probability Example Sheet 2 Q9 (independent
 * trials), Q10 (Liam's spaghetti hoops), and Q12 (record years). The STEP answers are
 * compared with the official solutions; the sheet has none, so every answer is checked by
 * listing all cases: every row, every pairing of ends, every permutation.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, mul, pick, q, str, sub, type Rational } from '../math';
import { choose } from '../numbers';
import { generator, type Misconception } from '../problem';
import { computedTex, math, t, texOfRational } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';
import { average, permutations, positions, rpow, rsum, throwsOf, variance, type Dist } from '../partv-a';

const S3 = 'step-s3-stats' as const;
const S3S = 'step-s3-stats-solutions' as const;
const S2 = 'ia-prob-sheet-2' as const;
const distinctFrom = (right: string, xs: readonly string[]): number => new Set(xs.filter((x) => x !== right)).size;
const distOf = (values: readonly number[]): Dist => [...new Set(values)].map((v) => [q(v), q(values.filter((x) => x === v).length, values.length)] as const);

// ---------------------------------------------------------------- neighbouring pairs in a row

interface PairP { a: number; b: number; kind: 'AB' | 'AA' }
const pairVal = ({ a, b, kind }: PairP): Rational => (kind === 'AB' ? q(a * b, a + b) : q(a * (a - 1), a + b));
const pairMis = ({ a, b, kind }: PairP): string[] => {
  const n = a + b;
  return kind === 'AB'
    ? [str(mul(q(n - 1), q(a * b, n * n))), str(q(n * a * b, n * (n - 1))), str(q(2 * a * b, n))]
    : [str(mul(q(n - 1), q(a * a, n * n))), str(q(a * (a - 1), n - 1)), str(q(a - 1))];
};

const neighbours = generator<PairP>({
  id: 'neighbouring-pairs',
  skill: 'Count neighbouring pairs in a random row with one indicator per place, and add the means.',
  params: (rng) => {
    for (;;) {
      const p: PairP = { a: int(rng, 2, 6), b: int(rng, 2, 6), kind: pick(rng, ['AB', 'AA'] as const) };
      if (distinctFrom(str(pairVal(p)), pairMis(p)) >= 2) return p;
    }
  },
  sane: ({ a, b }) => (a >= 2 && b >= 2 ? null : 'out of range'),
  problem: (p) => {
    const n = p.a + p.b;
    const pr = p.kind === 'AB' ? q(p.a * p.b, n * (n - 1)) : q(p.a * (p.a - 1), n * (n - 1));
    return {
      prompt: t`${p.a} letters A and ${p.b} letters B are put in a row in random order, every order equally likely. Find the expected number of places where ${p.kind === 'AB' ? t`an A is immediately followed by a B` : t`two As stand next to each other`}.`,
      answer: { kind: 'exact', expected: str(pairVal(p)) },
      solution: [
        t`For each of the ${n - 1} neighbouring pairs of places, let ${math`I_{k}`} be ${1} if places ${math`k`} and ${math`k + ${1}`} hold ${p.kind === 'AB' ? t`A then B` : t`two As`}. The count is ${math`I_{${1}} + \cdots + I_{${n - 1}}`}.`,
        t`${math`E(I_{k}) = P(\text{${p.kind === 'AB' ? 'A then B' : 'A then A'}}) = ${p.kind === 'AB' ? math`\frac{${p.a}}{${n}} \times \frac{${p.b}}{${n - 1}}` : math`\frac{${p.a}}{${n}} \times \frac{${p.a - 1}}{${n - 1}}`} = ${pr}`}, the same for every ${math`k`}.`,
        t`By linearity, although the indicators are dependent, the mean is ${math`${n - 1} \times ${pr} = ${pairVal(p)}`}.`,
      ],
    };
  },
  solve: (p) => {
    const n = p.a + p.b;
    return str(average(positions(n, p.a), (as) => {
      let c = 0;
      for (let k = 0; k + 1 < n; k++) {
        const [x, y] = [as.includes(k), as.includes(k + 1)];
        if (p.kind === 'AB' ? x && !y : x && y) c++;
      }
      return q(c);
    }));
  },
  misconceptions: (p): Misconception[] => {
    const [x, y, z] = pairMis(p);
    return p.kind === 'AB'
      ? [
          { response: x as string, why: t`Neighbouring letters are drawn without replacement: after an A, the chance of a B is ${math`\frac{${p.b}}{${p.a + p.b - 1}}`}, not ${math`\frac{${p.b}}{${p.a + p.b}}`}.` },
          { response: y as string, why: t`A row of ${p.a + p.b} has ${p.a + p.b - 1} neighbouring pairs, not ${p.a + p.b}.` },
          { response: z as string, why: t`That counts A then B and B then A. The question asks for an A followed by a B.` },
        ]
      : [
          { response: x as string, why: t`The second letter is drawn from what is left: after an A, the chance of another A is ${math`\frac{${p.a - 1}}{${p.a + p.b - 1}}`}.` },
          { response: y as string, why: t`Multiply the chance for one pair by the number of pairs, ${p.a + p.b - 1}, and use ${math`\frac{${p.a}}{${p.a + p.b}} \times \frac{${p.a - 1}}{${p.a + p.b - 1}}`} for the chance.` },
          { response: z as string, why: t`That would be all the As in one block. On average they are spread out.` },
        ];
  },
});

// ---------------------------------------------------------------- faces seen in k throws

interface FaceP { m: number; k: number; ask: 'seen' | 'unseen' }
const unseen = ({ m, k }: FaceP): Rational => mul(q(m), rpow(q(m - 1, m), k));
const faceVal = (p: FaceP): Rational => (p.ask === 'unseen' ? unseen(p) : sub(q(p.m), unseen(p)));
const faceMis = (p: FaceP): string[] => (p.ask === 'seen'
  ? [String(p.k), str(unseen(p)), str(mul(q(p.m), sub(q(1), rpow(q(1, p.m), p.k))))]
  : [str(sub(q(p.m), unseen(p))), String(p.m - p.k), str(mul(q(p.m), rpow(q(1, p.m), p.k)))]);

const faces = generator<FaceP>({
  id: 'faces-seen',
  skill: 'Find the expected number of faces seen (or not seen) in k throws, with one indicator per face.',
  params: (rng) => {
    for (;;) {
      const m = pick(rng, [4, 5, 6]);
      const p: FaceP = { m, k: int(rng, 2, m === 6 ? 4 : 5), ask: pick(rng, ['seen', 'unseen'] as const) };
      if (distinctFrom(str(faceVal(p)), faceMis(p)) >= 2) return p;
    }
  },
  sane: ({ m, k }) => (m ** k <= 4000 ? null : 'out of range'),
  problem: (p) => ({
    prompt: t`A fair ${p.m}-sided die, numbered ${1} to ${p.m}, is thrown ${p.k} times. Find the expected number of faces that ${p.ask === 'seen' ? 'appear at least once' : 'never appear'}.`,
    answer: { kind: 'exact', expected: str(faceVal(p)) },
    solution: [
      t`For each face ${math`f`}, let ${math`I_{f}`} be ${1} if face ${math`f`} never appears. ${math`E(I_{f}) = \left(${q(p.m - 1, p.m)}\right)^{${p.k}}`}, since each throw misses it with probability ${q(p.m - 1, p.m)}.`,
      p.ask === 'unseen'
        ? t`The number of faces never seen is ${math`\sum_{f} I_{f}`}, with mean ${math`${p.m}\left(${q(p.m - 1, p.m)}\right)^{${p.k}} = ${unseen(p)}`}.`
        : t`The number seen is ${math`${p.m} - \sum_{f} I_{f}`}, with mean ${math`${p.m} - ${p.m}\left(${q(p.m - 1, p.m)}\right)^{${p.k}} = ${faceVal(p)}`}.`,
    ],
  }),
  solve: (p) => str(average(throwsOf(p.m, p.k), (o) => { const seen = new Set(o).size; return q(p.ask === 'seen' ? seen : p.m - seen); })),
  misconceptions: (p): Misconception[] => {
    const [x, y, z] = faceMis(p);
    return p.ask === 'seen'
      ? [
          { response: x as string, why: t`That assumes every throw shows a new face. Repeats are likely: use an indicator for each face.` },
          { response: y as string, why: t`That is the expected number of faces never seen. Subtract it from ${p.m}.` },
          { response: z as string, why: t`A face is missed when every throw misses it, probability ${math`\left(${q(p.m - 1, p.m)}\right)^{${p.k}}`}, not ${math`\left(${q(1, p.m)}\right)^{${p.k}}`}.` },
        ]
      : [
          { response: x as string, why: t`That is the expected number of faces seen. The question asks for those never seen.` },
          { response: y as string, why: t`That assumes the throws show different faces. Use an indicator for each face missing.` },
          { response: z as string, why: t`A face is never seen when every throw misses it: ${math`\left(${q(p.m - 1, p.m)}\right)^{${p.k}}`} for each face.` },
        ];
  },
});

// ---------------------------------------------------------------- matching pairs

interface MatchP { n: number; d: number }
const matchVal = ({ n, d }: MatchP): Rational => q(choose(n, 2), d);
const matchMis = ({ n, d }: MatchP): string[] => [str(q(n, d)), str(q(choose(n, 2), d * d)), str(q(n * (n - 1), d))];

const matchingPairs = generator<MatchP>({
  id: 'matching-pairs',
  skill: 'Find the expected number of pairs that match, with one indicator per pair: C(n, 2) times the chance that one pair matches.',
  params: (rng) => {
    for (;;) {
      const p: MatchP = { n: int(rng, 3, 5), d: int(rng, 3, 6) };
      if (p.d ** p.n <= 7776 && distinctFrom(str(matchVal(p)), matchMis(p)) >= 2) return p;
    }
  },
  sane: ({ n, d }) => (n >= 3 && d >= 3 ? null : 'out of range'),
  problem: ({ n, d }) => ({
    prompt: t`${n} people each choose a whole number from ${1} to ${d}, independently and uniformly at random. Find the expected number of pairs of people who choose the same number.`,
    answer: { kind: 'exact', expected: str(matchVal({ n, d })) },
    solution: [
      t`There are ${math`\binom{${n}}{${2}} = ${choose(n, 2)}`} pairs of people. For each pair, let ${math`I`} be ${1} if they match: ${math`E(I) = ${q(1, d)}`}, since the second person matches the first with probability ${q(1, d)}.`,
      t`By linearity, the expected number of matching pairs is ${math`${choose(n, 2)} \times ${q(1, d)} = ${matchVal({ n, d })}`}, even though the pairs share people.`,
    ],
  }),
  solve: ({ n, d }) => str(average(throwsOf(d, n), (o) => { let c = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (o[i] === o[j]) c++; return q(c); })),
  misconceptions: (p): Misconception[] => {
    const [x, y, z] = matchMis(p);
    return [
      { response: x as string, why: t`Count pairs of people, ${math`\binom{${p.n}}{${2}}`}, not people.` },
      { response: y as string, why: t`One pair matches with probability ${q(1, p.d)}: whatever the first chooses, the second matches it with that chance.` },
      { response: z as string, why: t`That counts each pair twice, in both orders. Use ${math`\binom{${p.n}}{${2}}`} unordered pairs.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems: STEP 3 Q3

const rows = (a: number, b: number): number[][] => positions(a + b, a);
const xk = (as: readonly number[], k: number): number => (k === 1 ? (as.includes(0) ? 1 : 0) : !as.includes(k - 2) && as.includes(k - 1) ? 1 : 0);
const AB_DOM = { a: { kind: 'integer' as const, min: 2, max: 9 }, b: { kind: 'integer' as const, min: 2, max: 9 } };
const STEM = t`A row has ${math`a`} letters A and ${math`b`} letters B, with ${math`a, b \ge ${2}`} and ${math`n = a + b`}, every order equally likely. ${math`X_{${1}} = ${1}`} if the first letter is A, and for ${math`${2} \le k \le n`}, ${math`X_{k} = ${1}`} if the ${math`(k - ${1})`}th letter is B and the ${math`k`}th is A; otherwise they are ${0}. ${math`S = X_{${1}} + \cdots + X_{n}`}.`;

const q3i = auto({
  id: 's3-q3-i-mean',
  source: cite(S3, 'Q3(i)', true),
  title: t`The mean number of runs of As`,
  prompt: t`${STEM} Find ${math`E(S)`} in terms of ${math`a`} and ${math`b`}.`,
  answer: { kind: 'expression', expected: 'a(b + 1)/(a + b)', variables: ['a', 'b'], domains: AB_DOM },
  solution: [
    t`Each ${math`X_{k}`} is an indicator, so ${math`E(X_{k})`} is the probability that it is ${1}. ${math`E(X_{${1}}) = \frac{a}{n}`}: the first letter is one of ${math`n`}, ${math`a`} of them As.`,
    t`For ${math`k \ge ${2}`}, the two places hold B then A with probability ${math`\frac{b}{n} \times \frac{a}{n - ${1}}`}, so ${math`E(X_{k}) = \frac{ab}{n(n - ${1})}`}, the same for every ${math`k`}.`,
    t`The ${math`X_{k}`} are not independent, but linearity does not need that: ${math`E(S) = \frac{a}{n} + (n - ${1})\frac{ab}{n(n - ${1})} = \frac{a + ab}{n} = \frac{a(b + ${1})}{n}`}. ${math`S`} counts the runs of As, each of which starts at the front or just after a B.`,
  ],
  reference: 'a(b + 1)/(a + b)',
  verify: () => {
    for (let a = 2; a <= 5; a++) for (let b = 2; b <= 5; b++) {
      const n = a + b;
      const e = same(`a = ${a}, b = ${b}, every row`, str(average(rows(a, b), (as) => q(Array.from({ length: n }, (_, i) => xk(as, i + 1)).reduce((x, y) => x + y, 0)))), str(q(a * (b + 1), n)));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: 'a b/(a + b)', why: t`That leaves out ${math`X_{${1}}`}: a run of As can start at the front of the row, with no B before it.` }],
  official: { source: cite(S3S, 'Q3(i)'), answer: 'a(b + 1)/(a + b)', agrees: true },
});

const q3xk = auto({
  id: 's3-q3-i-xk',
  source: cite(S3, 'Q3(i)', true),
  title: t`One indicator's mean`,
  prompt: t`${STEM} For ${math`${2} \le k \le n`}, find ${math`E(X_{k})`} in terms of ${math`a`} and ${math`b`}.`,
  answer: { kind: 'expression', expected: 'a b/((a + b)(a + b - 1))', variables: ['a', 'b'], domains: AB_DOM },
  solution: [
    t`${math`E(X_{k}) = P(X_{k} = ${1})`}. There are ${math`\frac{n!}{a! \, b!}`} rows; fixing B then A at places ${math`k - ${1}`} and ${math`k`} leaves ${math`\frac{(n - ${2})!}{(a - ${1})! \, (b - ${1})!}`}.`,
    t`The ratio is ${math`\frac{ab}{n(n - ${1})}`}, which does not depend on ${math`k`}.`,
  ],
  reference: 'a b/((a + b)(a + b - 1))',
  verify: () => {
    for (let a = 2; a <= 5; a++) for (let b = 2; b <= 5; b++) {
      const n = a + b;
      for (let k = 2; k <= n; k++) {
        const e = same(`a = ${a}, b = ${b}, k = ${k}`, str(average(rows(a, b), (as) => q(xk(as, k)))), str(q(a * b, n * (n - 1))));
        if (e !== null) return e;
      }
    }
    return null;
  },
  misconceptions: [{ response: 'a b/(a + b)^2', why: t`The second place is filled from the ${math`n - ${1}`} letters left, so the chance is ${math`\frac{b}{n} \times \frac{a}{n - ${1}}`}.` }],
  official: { source: cite(S3S, 'Q3(i)'), answer: 'a b/((a + b)(a + b - 1))', agrees: true },
});

const q3iib = auto({
  id: 's3-q3-ii-b',
  source: cite(S3, 'Q3(ii)(b)', true),
  title: t`A double sum of pairs`,
  prompt: t`${STEM} Find ${math`\sum_{i = ${2}}^{n - ${2}} \sum_{j = i + ${2}}^{n} E(X_{i}X_{j})`} in terms of ${math`a`} and ${math`b`}.`,
  answer: { kind: 'expression', expected: 'a(a - 1)b(b - 1)/(2(a + b)(a + b - 1))', variables: ['a', 'b'], domains: AB_DOM },
  solution: [
    t`For ${math`${2} \le i`} and ${math`j \ge i + ${2}`}, the four places ${math`i - ${1}, i, j - ${1}, j`} are different, and ${math`X_{i}X_{j} = ${1}`} when they hold B, A, B, A: ${math`E(X_{i}X_{j}) = \frac{a(a - ${1})b(b - ${1})}{n(n - ${1})(n - ${2})(n - ${3})}`}, the same for every such pair.`,
    t`For each ${math`i`} there are ${math`n - i - ${1}`} values of ${math`j`}, and ${math`\sum_{i = ${2}}^{n - ${2}} (n - i - ${1}) = \frac{(n - ${2})(n - ${3})}{${2}}`}. So the double sum is ${math`\frac{a(a - ${1})b(b - ${1})}{${2}n(n - ${1})}`}.`,
  ],
  reference: 'a(a - 1)b(b - 1)/(2(a + b)(a + b - 1))',
  verify: () => {
    for (let a = 2; a <= 5; a++) for (let b = 2; b <= 5; b++) {
      const n = a + b;
      const total = average(rows(a, b), (as) => {
        let s = 0;
        for (let i = 2; i <= n - 2; i++) for (let j = i + 2; j <= n; j++) s += xk(as, i) * xk(as, j);
        return q(s);
      });
      const e = same(`a = ${a}, b = ${b}, every row`, str(total), str(q(a * (a - 1) * b * (b - 1), 2 * n * (n - 1))));
      if (e !== null) return e;
    }
    return null;
  },
  misconceptions: [{ response: 'a(a - 1)b(b - 1)/((a + b)(a + b - 1))', why: t`Count the pairs: ${math`\sum_{i = ${2}}^{n - ${2}} (n - i - ${1}) = \frac{(n - ${2})(n - ${3})}{${2}}`}, which brings a factor of ${math`\frac{${1}}{${2}}`}.` }],
  official: { source: cite(S3S, 'Q3(ii)(b)'), answer: 'a(a - 1)b(b - 1)/(2(a + b)(a + b - 1))', agrees: true },
});

// ---------------------------------------------------------------- Cambridge problems: Example Sheet 2

const PIS = [q(1, 2), q(1, 3), q(1, 4), q(1, 5)];
const q9var = rsum(PIS.map((p) => mul(p, sub(q(1), p))));
const sheetQ9 = auto({
  id: 'sheet2-q9-variance',
  source: cite(S2, 'Q9', true),
  title: t`Trials with different chances`,
  prompt: t`In a sequence of ${4} independent trials, the probability of success at the ${math`i`}th trial is ${math`p_{i}`}, with ${math`p_{${1}} = ${PIS[0] as Rational}`}, ${math`p_{${2}} = ${PIS[1] as Rational}`}, ${math`p_{${3}} = ${PIS[2] as Rational}`}, ${math`p_{${4}} = ${PIS[3] as Rational}`}. Let ${math`N`} be the total number of successes. Find ${math`\mathrm{Var}(N)`}.`,
  answer: { kind: 'exact', expected: str(q9var) },
  solution: [
    t`${math`N = I_{${1}} + \cdots + I_{${4}}`}, where ${math`I_{i}`} indicates success at trial ${math`i`}. An indicator with ${math`P(I = ${1}) = p`} has ${math`E(I) = E(I^{${2}}) = p`}, so ${math`\mathrm{Var}(I) = p - p^{${2}} = p(${1} - p)`}.`,
    t`The trials are independent, so the variances add: ${math`\mathrm{Var}(N) = \sum_{i} p_{i}(${1} - p_{i}) = ${computedTex(PIS.map((p) => texOfRational(mul(p, sub(q(1), p)))).join(' + '))} = ${q9var}`}.`,
  ],
  reference: str(q9var),
  verify: () => {
    // All 16 outcomes of the four trials.
    const values: number[] = [];
    const probs: Rational[] = [];
    for (let m = 0; m < 16; m++) {
      let pr = q(1);
      let k = 0;
      PIS.forEach((p, i) => { if ((m >> i) & 1) { pr = mul(pr, p); k++; } else pr = mul(pr, sub(q(1), p)); });
      values.push(k);
      probs.push(pr);
    }
    const d: Dist = values.map((v, i) => [q(v), probs[i] as Rational] as const);
    return same('every outcome of the trials', str(variance(d)), str(q9var));
  },
  misconceptions: [{ response: str(rsum(PIS)), why: t`That is ${math`E(N) = \sum_{i} p_{i}`}. Each trial adds ${math`p_{i}(${1} - p_{i})`} to the variance.` }],
});

/** Expected hoops for n strands: every pairing of the 2n ends, each equally likely, with its number of loops. */
function hoops(n: number): Rational {
  const ends = Array.from({ length: 2 * n }, (_, i) => i);
  const pairings: number[][] = [];
  const rec = (left: number[], acc: number[]): void => {
    if (left.length === 0) { pairings.push([...acc]); return; }
    const [x, ...rest] = left as [number, ...number[]];
    rest.forEach((y, i) => { acc[x] = y; acc[y] = x; rec([...rest.slice(0, i), ...rest.slice(i + 1)], acc); });
  };
  rec(ends, Array.from({ length: 2 * n }, () => -1));
  return average(pairings, (join) => {
    // Strand s has ends 2s and 2s + 1; follow strand, join, strand, ... to count loops.
    const seen = new Set<number>();
    let loops = 0;
    for (let s = 0; s < n; s++) {
      if (seen.has(s)) continue;
      loops++;
      let e = 2 * s;
      for (;;) {
        const strand = Math.floor(e / 2);
        seen.add(strand);
        const other = e % 2 === 0 ? e + 1 : e - 1;
        const next = join[other] as number;
        if (Math.floor(next / 2) === s && next === 2 * s) break;
        e = next;
      }
    }
    return q(loops);
  });
}
const SPAGHETTI = 4;
const hoopMean = rsum(Array.from({ length: SPAGHETTI }, (_, k) => q(1, 2 * (k + 1) - 1)));
const sheetQ10 = auto({
  id: 'sheet2-q10-hoops',
  source: cite(S2, 'Q10', true),
  title: t`Liam's spaghetti`,
  prompt: t`Liam's bowl of spaghetti contains ${SPAGHETTI} strands. He selects two ends at random and joins them together, and repeats this until no ends are left. What is the expected number of spaghetti hoops in the bowl?`,
  answer: { kind: 'exact', expected: str(hoopMean) },
  solution: [
    t`Look at the joins one at a time. When ${math`k`} strands (counting joined pieces as strands) remain, there are ${math`${2}k`} ends; the chosen end is joined to one of the other ${math`${2}k - ${1}`}, and exactly one of them, its own strand's other end, closes a hoop. So the ${math`k`}th-from-last join makes a hoop with probability ${math`\frac{${1}}{${2}k - ${1}}`}.`,
    t`The number of hoops is the sum of the indicators of these events, so its mean is ${math`\sum_{k = ${1}}^{${SPAGHETTI}} \frac{${1}}{${2}k - ${1}} = ${1} + \frac{${1}}{${3}} + \frac{${1}}{${5}} + \frac{${1}}{${7}} = ${hoopMean}`}.`,
  ],
  reference: str(hoopMean),
  verify: () => same('every pairing of the eight ends', str(hoops(SPAGHETTI)), str(hoopMean)) ?? same('two strands', str(hoops(2)), str(q(4, 3))),
  misconceptions: [{ response: str(q(SPAGHETTI, 2 * SPAGHETTI - 1)), why: t`The chance of closing a hoop changes as strands join: ${math`\frac{${1}}{${2}k - ${1}}`} when ${math`k`} strands are left. Use one indicator for each join.` }],
});

const RECORDS = 5;
const recordMean = rsum(Array.from({ length: RECORDS }, (_, i) => q(1, i + 1)));
const recordVar = rsum(Array.from({ length: RECORDS }, (_, i) => sub(q(1, i + 1), q(1, (i + 1) * (i + 1)))));
/** The number of record years for every ranking of n years. */
const recordCounts = (n: number): number[] => permutations(n).map((a) => a.filter((x, k) => a.slice(0, k).every((y) => x < y)).length);
const sheetQ12mean = auto({
  id: 'sheet2-q12-mean',
  source: cite(S2, 'Q12', true),
  title: t`Record years: the mean`,
  prompt: t`The yearly rainfalls in Cambridge over the next ${RECORDS} years are ranked ${math`a_{${1}}, \ldots, a_{${RECORDS}}`}, a random permutation of ${math`${1}, \ldots, ${RECORDS}`}. Year ${math`k`} is a record year if ${math`a_{k} < a_{i}`} for all ${math`i < k`}, so the first year is always one. Find the expected number of record years.`,
  answer: { kind: 'exact', expected: str(recordMean) },
  solution: [
    t`Let ${math`Y_{i} = ${1}`} if year ${math`i`} is a record. Among the first ${math`i`} years, each is equally likely to have the smallest rank, so ${math`P(Y_{i} = ${1}) = \frac{${1}}{i}`}.`,
    t`${math`E(N) = \sum_{i = ${1}}^{${RECORDS}} \frac{${1}}{i} = ${recordMean}`}.`,
  ],
  reference: str(recordMean),
  verify: () => same('every ranking of five years', str(average(recordCounts(RECORDS), (c) => q(c))), str(recordMean)),
  misconceptions: [{ response: str(q(RECORDS + 1, 2)), why: t`Records get rarer: year ${math`i`} is a record with probability ${math`\frac{${1}}{i}`}, not ${q(1, 2)}.` }],
});
const sheetQ12var = auto({
  id: 'sheet2-q12-variance',
  source: cite(S2, 'Q12', true),
  title: t`Record years: the variance`,
  prompt: t`With the record years as above (a random ranking of ${RECORDS} years), the indicators ${math`Y_{${1}}, \ldots, Y_{${RECORDS}}`} of record years are independent. Find the variance of the number of record years.`,
  answer: { kind: 'exact', expected: str(recordVar) },
  solution: [
    t`${math`Y_{i}`} is an indicator with ${math`P(Y_{i} = ${1}) = \frac{${1}}{i}`}, so ${math`\mathrm{Var}(Y_{i}) = \frac{${1}}{i} - \frac{${1}}{i^{${2}}}`}.`,
    t`By independence, ${math`\mathrm{Var}(N) = \sum_{i = ${1}}^{${RECORDS}} \left(\frac{${1}}{i} - \frac{${1}}{i^{${2}}}\right) = ${recordMean} - ${rsum(Array.from({ length: RECORDS }, (_, i) => q(1, (i + 1) * (i + 1))))} = ${recordVar}`}.`,
  ],
  reference: str(recordVar),
  verify: () => same('every ranking of five years', str(variance(distOf(recordCounts(RECORDS)))), str(recordVar)),
  misconceptions: [{ response: str(recordMean), why: t`That is the mean. Each indicator contributes ${math`p(${1} - p)`}, not ${math`p`}.` }],
});

const q9proof = supervision({
  id: 'sheet2-q9',
  source: cite(S2, 'Q9'),
  title: t`Independent trials with different chances`,
  prompt: t`In a sequence of ${math`n`} independent trials the probability of a success at the ${math`i`}th trial is ${math`p_{i}`}. Let ${math`N`} be the total number of successes. Find the mean and variance of ${math`N`}, and say which step needs independence.`,
  writeUp: 'proof',
});
const q10proof = supervision({
  id: 'sheet2-q10',
  source: cite(S2, 'Q10'),
  title: t`Spaghetti hoops in general`,
  prompt: t`Liam's bowl contains ${math`n`} strands. He selects two ends at random and joins them, repeating until no ends are left. Show that the expected number of hoops is ${math`\sum_{k = ${1}}^{n} \frac{${1}}{${2}k - ${1}}`}, and explain why this grows like ${math`\frac{${1}}{${2}}\ln n`}.`,
  writeUp: 'proof',
});
const q12proof = supervision({
  id: 'sheet2-q12',
  source: cite(S2, 'Q12'),
  title: t`Record years are independent`,
  prompt: t`For a random permutation ${math`a_{${1}}, \ldots, a_{n}`} of ${math`${1}, \ldots, n`}, let ${math`Y_{i} = ${1}`} if ${math`a_{i} < a_{j}`} for all ${math`j < i`}. Find the distribution of ${math`Y_{i}`} and show that ${math`Y_{${1}}, \ldots, Y_{n}`} are independent. Then find the mean and variance of the number of record years.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

export const indicators: TopicContent = {
  topicId: 'rv.indicators',
  goal: t`Write a count as a sum of indicator variables and find its mean by linearity, even when the indicators are dependent, and its variance when they are independent.`,
  lesson: [
    { kind: 'rule', text: t`The [[indicator-variable|indicator]] of an event ${math`A`} is ${math`I_{A} = ${1}`} if ${math`A`} happens and ${0} otherwise. Its mean is ${math`E(I_{A}) = ${1} \times P(A) + ${0} \times P(A^{c}) = P(A)`}.` },
    { kind: 'p', text: t`A count is a sum of indicators: the number of events among ${math`A_{${1}}, \ldots, A_{n}`} that happen is ${math`N = I_{A_{${1}}} + \cdots + I_{A_{n}}`}. By linearity, ${math`E(N) = P(A_{${1}}) + \cdots + P(A_{n})`}, with no need for the events to be independent and no need for the distribution of ${math`N`}.` },
    { kind: 'p', text: t`STEP ${3} Statistics Q${3}: in a random row of ${math`a`} As and ${math`b`} Bs, the runs of As start either at the front (probability ${math`\frac{a}{n}`}) or just after a B (probability ${math`\frac{ab}{n(n - ${1})}`} at each of ${math`n - ${1}`} places). So the expected number of runs is ${math`\frac{a(b + ${1})}{n}`}.` },
    { kind: 'p', text: t`Example Sheet ${2} Q${12}: in a random ranking of ${math`n`} years, year ${math`i`} is a [[record|record]] when it is the smallest of the first ${math`i`}, with probability ${math`\frac{${1}}{i}`}. The expected number of records is ${math`${1} + \frac{${1}}{${2}} + \cdots + \frac{${1}}{n}`}: for ${RECORDS} years, ${recordMean}.` },
    { kind: 'p', text: t`For the variance, use ${math`I^{${2}} = I`}: ${math`\mathrm{Var}(I_{A}) = P(A)(${1} - P(A))`}. If the indicators are independent, the variances add, so ${math`\mathrm{Var}(N) = \sum_{i} p_{i}(${1} - p_{i})`}. If not, expand ${math`N^{${2}}`}: ${math`E(N^{${2}}) = \sum_{i} P(A_{i}) + \sum_{i \ne j} P(A_{i} \cap A_{j})`}, which needs the probabilities of pairs.` },
  ],
  examples: [
    workedCambridge(q3i),
    worked(matchingPairs, { n: 4, d: 6 }, t`Matching numbers among four people`),
    worked(faces, { m: 6, k: 3, ask: 'seen' }, t`Faces seen in three throws`),
  ],
  generators: [neighbours, faces, matchingPairs],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['indicator-variable', 'record'],
  cambridge: [q3xk, q3iib, sheetQ9, sheetQ10, sheetQ12mean, sheetQ12var, q9proof, q10proof, q12proof],
};
