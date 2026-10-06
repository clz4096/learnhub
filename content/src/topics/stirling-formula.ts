/**
 * prob.stirling-formula: n! ~ √(2πn) (n/e)^n, used to estimate binomial coefficients and
 * the probabilities built from them. From IA Probability Example Sheet 1: Q3 (halving a
 * deck: the exact probability against Stirling's estimate 2/√(26π)) and Q14 (the local
 * limit of a simple symmetric random walk, P(X_n = 0) ~ h/√(2π) with h = 2/√n). The
 * Faculty schedule proves only the asymptotics of log n!; the full formula is stated and
 * used. The sheet has no official solutions; each estimate is compared with the exact value.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick, q, toFloat } from '../math';
import { chooseBig } from '../numbers';
import { generator, type Misconception } from '../problem';
import { dmath, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const mn = math`n`;
const round = (x: number, d: number): number => Number(x.toFixed(d));
const stirling = (n: number): number => Math.sqrt(2 * Math.PI * n) * (n / Math.E) ** n;
const fact = (n: number): number => { let p = 1; for (let i = 2; i <= n; i++) p *= i; return p; };
const lnFact = (n: number): number => { let s = 0; for (let i = 2; i <= n; i++) s += Math.log(i); return s; };
/** P(exactly m heads in 2m fair tosses), exactly. */
const centralProb = (m: number): number => toFloat(q(chooseBig(2 * m, m), 4n ** BigInt(m)));

// ---------------------------------------------------------------- n! against the formula

interface RatioP { n: number }

const stirlingRatio = generator<RatioP>({
  id: 'stirling-ratio',
  skill: 'Compare n! with Stirling\'s approximation √(2πn) (n/e)^n: their ratio tends to 1, roughly as 1 + 1/(12n).',
  params: (rng) => ({ n: int(rng, 2, 20) }),
  sane: ({ n }) => (n >= 2 && n <= 20 ? null : 'out of range'),
  problem: ({ n }) => {
    const r = fact(n) / stirling(n);
    return {
      prompt: t`Stirling's formula approximates ${math`n!`} by ${math`\sqrt{${2}\pi n}\,(n / e)^{n}`}. For ${math`n = ${n}`}, compute ${math`n!`} divided by this approximation, to four decimal places.`,
      answer: { kind: 'numeric', expected: round(r, 4), absTol: 0.00015, relTol: 0 },
      solution: [
        t`${math`${n}! = ${fact(n)}`}, and ${math`\sqrt{${2}\pi \times ${n}}\,(${n} / e)^{${n}} \approx ${Number(stirling(n).toPrecision(6))}`}.`,
        t`The ratio is about ${round(r, 4)}: Stirling's formula is a few percent low for small ${mn}, and the ratio is close to ${math`${1} + \frac{${1}}{${12}n} = ${round(1 + 1 / (12 * n), 4)}`}.`,
      ],
    };
  },
  solve: ({ n }) => {
    // Through logarithms, as a check on the direct quotient.
    return String(round(Math.exp(lnFact(n) - (0.5 * Math.log(2 * Math.PI * n) + n * Math.log(n) - n)), 4));
  },
  misconceptions: ({ n }): Misconception[] => [
    { response: String(round(fact(n) / (n / Math.E) ** n, 4)), why: t`The factor ${math`\sqrt{${2}\pi n}`} is part of the approximation: divide by it too.` },
    { response: '1', why: t`The formula is asymptotic: the ratio tends to ${1} but is not ${1} for any ${mn}. Compute it.` },
    { response: String(round(fact(n) / (Math.sqrt(Math.PI * n) * (n / Math.E) ** n), 4)), why: t`The root is ${math`\sqrt{${2}\pi n}`}, not ${math`\sqrt{\pi n}`}.` },
  ],
});

// ---------------------------------------------------------------- exactly half heads

interface HalfP { m: number }

const halfHeads = generator<HalfP>({
  id: 'half-heads',
  skill: 'Estimate the chance of exactly m heads in 2m fair tosses by Stirling\'s formula: C(2m, m) / 4^m is about 1/√(πm).',
  params: (rng) => ({ m: pick(rng, [5, 8, 10, 12, 15, 20, 25, 30, 40, 50]) }),
  sane: ({ m }) => (m >= 5 ? null : 'out of range'),
  problem: ({ m }) => {
    const approx = 1 / Math.sqrt(Math.PI * m);
    return {
      prompt: t`A fair coin is tossed ${2 * m} times. Use Stirling's formula to estimate the probability of exactly ${m} heads, ${math`\binom{${2 * m}}{${m}} / ${2}^{${2 * m}}`}, to four significant figures.`,
      answer: { kind: 'numeric', expected: Number(approx.toPrecision(4)), relTol: 0.001 },
      solution: [
        t`${math`\binom{${2}m}{m} = \frac{(${2}m)!}{(m!)^{${2}}} \approx \frac{\sqrt{${4}\pi m}\,(${2}m/e)^{${2}m}}{${2}\pi m\,(m/e)^{${2}m}} = \frac{${4}^{m}}{\sqrt{\pi m}}`}.`,
        t`So the probability is about ${math`\frac{${1}}{\sqrt{\pi \times ${m}}} \approx ${Number(approx.toPrecision(4))}`}. The exact value is ${Number(centralProb(m).toPrecision(4))}: the estimate is high by about ${math`\frac{${1}}{${8}m}`} of itself.`,
      ],
    };
  },
  solve: ({ m }) => {
    // The same estimate through the logarithmic form of Stirling's formula.
    const ln = (k: number): number => 0.5 * Math.log(2 * Math.PI * k) + k * Math.log(k) - k;
    return String(Number(Math.exp(ln(2 * m) - 2 * ln(m) - 2 * m * Math.log(2)).toPrecision(4)));
  },
  misconceptions: ({ m }): Misconception[] => [
    { response: '0.5', why: t`Exactly half heads is the most likely single count, but it is still one of ${2 * m + 1} possible counts. Estimate ${math`\binom{${2 * m}}{${m}}`}.` },
    { response: String(Number((1 / Math.sqrt(2 * Math.PI * m)).toPrecision(4))), why: t`Check the constant: ${math`\sqrt{${4}\pi m} / (${2}\pi m) = ${1} / \sqrt{\pi m}`}.` },
    { response: String(Number((1 / (Math.PI * m)).toPrecision(4))), why: t`The square root stays: the ratio of the roots is ${math`\sqrt{${4}\pi m} / (${2}\pi m)`}, which is ${math`${1}/\sqrt{\pi m}`}.` },
  ],
});

// ---------------------------------------------------------------- log n!

interface LogP { n: number }

const logFactorial = generator<LogP>({
  id: 'log-factorial',
  skill: 'Approximate log n! by n log n - n + (1/2) log(2πn), and see how much the cruder n log n - n misses.',
  params: (rng) => ({ n: pick(rng, [20, 30, 50, 80, 100, 150, 200, 500, 1000]) }),
  sane: ({ n }) => (n >= 20 ? null : 'out of range'),
  problem: ({ n }) => {
    const v = n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n);
    return {
      prompt: t`Using Stirling's formula, estimate the natural logarithm ${math`\ln(${n}!)`}, to two decimal places.`,
      answer: { kind: 'numeric', expected: round(v, 2), absTol: 0.011, relTol: 0 },
      solution: [
        t`${math`\ln n! \approx n \ln n - n + \tfrac{${1}}{${2}}\ln(${2}\pi n)`}. With ${math`n = ${n}`}: ${math`${round(n * Math.log(n), 2)} - ${n} + ${round(0.5 * Math.log(2 * Math.PI * n), 2)} \approx ${round(v, 2)}`}.`,
        t`Adding the logarithms of ${math`${2}, ${3}, \ldots, ${n}`} gives ${round(lnFact(n), 2)}, so the estimate is off only in the third decimal place. The cruder ${math`n \ln n - n`}, which the schedule proves, misses by ${round(lnFact(n) - (n * Math.log(n) - n), 2)}: right in ratio, not in difference.`,
      ],
    };
  },
  solve: ({ n }) => String(round(lnFact(n) - 1 / (12 * n), 2)),
  misconceptions: ({ n }): Misconception[] => [
    { response: String(round(n * Math.log(n) - n, 2)), why: t`${math`n \ln n - n`} is the leading part only. Stirling's formula adds ${math`\tfrac{${1}}{${2}}\ln(${2}\pi n)`}.` },
    { response: String(round(n * Math.log(n), 2)), why: t`${math`\ln (n/e)^{n} = n \ln n - n`}: subtract ${mn}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const deckExact = toFloat(q(chooseBig(26, 13) ** 2n, chooseBig(52, 26)));
const deckStirling = 2 / Math.sqrt(26 * Math.PI);
const q3 = auto({
  id: 'ia-q3-stirling',
  source: cite('ia-prob-sheet-1', 'Q3'),
  title: t`Halving a deck, by Stirling's formula`,
  prompt: t`A full deck of ${52} cards is divided in half at random. The probability that each half has ${13} red and ${13} black cards is ${math`\binom{${26}}{${13}}^{${2}} / \binom{${52}}{${26}}`}. Use Stirling's formula to find an approximation for it, and evaluate the approximation as a decimal, to four places.`,
  answer: { kind: 'numeric', expected: round(deckStirling, 4), absTol: 0.00006, relTol: 0 },
  solution: [
    t`By Stirling, ${math`\binom{${2}m}{m} \approx ${4}^{m} / \sqrt{\pi m}`}. So ${math`\binom{${26}}{${13}}^{${2}} \approx ${4}^{${26}} / (${13}\pi)`} and ${math`\binom{${52}}{${26}} \approx ${4}^{${26}} / \sqrt{${26}\pi}`}.`,
    t`Dividing, the powers of ${4} cancel: ${math`\frac{\sqrt{${26}\pi}}{${13}\pi} = \frac{${2}}{\sqrt{${26}\pi}} \approx ${round(deckStirling, 4)}`}. The exact value is ${round(deckExact, 4)}, so the estimate is about ${Math.round((deckStirling / deckExact - 1) * 1000) / 10}% high.`,
  ],
  reference: String(round(deckStirling, 4)),
  verify: () => {
    // The estimate from the full formula for each factorial, against the closed form.
    const viaFactorials = (stirling(26) ** 4) / (stirling(13) ** 4 * stirling(52));
    return same('Stirling for each factorial, to four places', viaFactorials.toFixed(4), deckStirling.toFixed(4));
  },
  misconceptions: [{ response: String(round(deckExact, 4)), why: t`That is the exact value. The question asks for Stirling's estimate, ${math`${2} / \sqrt{${26}\pi}`}.` }],
});

const N14 = 100;
const q14 = auto({
  id: 'ia-q14-a-numbers',
  source: cite('ia-prob-sheet-1', 'Q14(a)', true),
  title: t`The random walk returns to ${0}`,
  prompt: t`A simple symmetric random walk on ${math`\mathbb{Z}`} starts at ${0}. Question ${14}(a) shows ${math`P(X_{n} = ${0}) \sim \frac{h}{\sqrt{${2}\pi}}`} with ${math`h = ${2} / \sqrt{n}`}, for even ${mn}. Evaluate this approximation for ${math`n = ${N14}`}, to four decimal places.`,
  answer: { kind: 'numeric', expected: round(2 / Math.sqrt(N14) / Math.sqrt(2 * Math.PI), 4), absTol: 0.00006, relTol: 0 },
  solution: [
    t`${math`h = ${2} / \sqrt{${N14}} = ${2 / Math.sqrt(N14)}`}, so ${math`h / \sqrt{${2}\pi} \approx ${round(2 / Math.sqrt(N14) / Math.sqrt(2 * Math.PI), 4)}`}.`,
    t`Exactly, ${math`P(X_{${N14}} = ${0}) = \binom{${N14}}{${N14 / 2}} / ${2}^{${N14}} \approx ${round(centralProb(N14 / 2), 4)}`}: the walk returns to ${0} when exactly half the steps go right. Stirling's formula gives ${math`\sqrt{${2} / (\pi n)}`}, the same as ${math`h / \sqrt{${2}\pi}`}.`,
  ],
  reference: String(round(2 / Math.sqrt(N14) / Math.sqrt(2 * Math.PI), 4)),
  verify: () => same('the two forms of the estimate', (2 / Math.sqrt(N14) / Math.sqrt(2 * Math.PI)).toFixed(6), Math.sqrt(2 / (Math.PI * N14)).toFixed(6)),
  misconceptions: [{ response: String(round(1 / Math.sqrt(2 * Math.PI), 4)), why: t`Multiply by ${math`h = ${2} / \sqrt{n}`}: the chance of being exactly at ${0} shrinks as ${mn} grows.` }],
});

const q3proof = supervision({
  id: 'ia-q3-stirling-derivation',
  source: cite('ia-prob-sheet-1', 'Q3'),
  title: t`Deriving the deck estimate`,
  prompt: t`Show from Stirling's formula that ${math`\binom{${2}m}{m} \sim \frac{${4}^{m}}{\sqrt{\pi m}}`}, and deduce that the probability in Q${3} is approximately ${math`\frac{${2}}{\sqrt{${26}\pi}}`}. Explain what "${math`\sim`}" claims and what it does not claim about the error for ${math`m = ${13}`}.`,
  writeUp: 'proof',
});
const q14a = supervision({
  id: 'ia-q14-a',
  source: cite('ia-prob-sheet-1', 'Q14(a)'),
  title: t`The local limit at ${0}`,
  prompt: t`Let ${math`(X_{n})`} be a simple symmetric random walk on ${math`\mathbb{Z}`} from ${0}. Show that, for ${math`h = ${2}/\sqrt{n}`}, in the limit ${math`n \to \infty`} with ${mn} even, ${math`P(X_{n} = ${0}) \sim \frac{${1}}{\sqrt{${2}\pi}} h`}.`,
  writeUp: 'proof',
});
const q14b = supervision({
  id: 'ia-q14-b',
  source: cite('ia-prob-sheet-1', 'Q14(b)'),
  title: t`The local limit everywhere`,
  prompt: t`Show further that for all ${math`x \in \mathbb{R}`}, ${math`P(X_{n}/\sqrt{n} \in [x, x + h)) \sim \frac{${1}}{\sqrt{${2}\pi}} h e^{-x^{${2}}/${2}}`}. Hints: ${math`X_{n}/\sqrt{n}`} takes exactly one value in ${math`[x, x + h)`}; and ${math`(${1} + ${1}/y)^{y} \to e`} as ${math`y \to \pm\infty`}.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const digitsOf100 = String(Array.from({ length: 100 }, (_, i) => BigInt(i + 1)).reduce((p, x) => p * x, 1n)).length;
const mk = math`k`;
const TRI = { m: 10 };
const triExact = Number(chooseBig(3 * TRI.m, TRI.m));
const triApprox = (Math.sqrt(3) / (2 * Math.sqrt(Math.PI * TRI.m))) * (27 / 4) ** TRI.m;
const DIFF_N = 20;

export const stirlingFormula: TopicContent = {
  topicId: 'prob.stirling-formula',
  goal: t`Use Stirling's formula ${math`n! \sim \sqrt{${2}\pi n}\,(n/e)^{n}`} to estimate factorials, central binomial coefficients, and the probabilities built from them.`,
  objective: t`Estimate factorials and binomial probabilities with Stirling's formula, and say what its "approximately" means.`,
  why: t`Counting probabilities with huge factorials become simple formulas; it is the first glimpse of the normal curve.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`How big is a factorial?` },
    { kind: 'hook', text: t`${math`${100}!`} has ${digitsOf100} digits. Probabilities in counting problems are ratios of numbers like that: the chance that a shuffled deck splits evenly into red and black is ${math`\binom{${26}}{${13}}^{${2}} / \binom{${52}}{${26}}`}. Is there a simple formula that tells you, roughly, how big ${math`n!`} is?` },
    { kind: 'narrative', text: t`There is, and it is one of the most surprising formulas in mathematics: ${math`n!`}, a product of whole numbers, is closely approximated by an expression involving ${math`\pi`} and ${math`e`}. Before stating it we need to say exactly what "closely approximated" will mean, because it is not what you might guess.` },
    { kind: 'section', title: t`Asymptotic equality` },
    {
      kind: 'definition',
      name: t`Asymptotic equality`,
      formal: t`For positive sequences, ${math`a_{n} \sim b_{n}`} means ${math`\frac{a_{n}}{b_{n}} \to ${1}`} as ${math`n \to \infty`}.`,
      plain: t`In plain words: ${math`a_{n}`} and ${math`b_{n}`} are [[asymptotic|asymptotically equal]], equal in ratio in the long run. The percentage error shrinks to ${0}; the difference need not. For example ${math`n^{${2}} + n \sim n^{${2}}`}, though they differ by ${mn}.`,
    },
    {
      kind: 'theorem',
      name: t`Stirling's formula`,
      statement: t`${math`n! \sim \sqrt{${2}\pi n}\,\left(\frac{n}{e}\right)^{n}`} as ${math`n \to \infty`}.`,
    },
    { kind: 'p', text: t`This is [[stirlings-formula|Stirling's formula]]. The Cambridge schedule states it and uses it, and proves the weaker statement below. It is good long before ${mn} is large: ${math`${10}! = ${fact(10)}`}, and the formula gives about ${Math.round(stirling(10))}, a ratio of ${round(fact(10) / stirling(10), 4)}. In fact the ratio behaves like ${math`${1} + \frac{${1}}{${12}n}`}.` },
    checkFrom(stirlingRatio, { n: 5 }, t`${math`${5}! = ${120}`} and ${math`\sqrt{${10}\pi}\,(${5}/e)^{${5}} \approx ${Number(stirling(5).toPrecision(6))}`}, a ratio of about ${round(fact(5) / stirling(5), 4)}.`),
    { kind: 'pitfall', claim: t`Since ${math`n! \sim \sqrt{${2}\pi n}\,(n/e)^{n}`}, the difference between them tends to ${0}.`, counterexample: t`Only the ratio tends to ${1}. At ${math`n = ${DIFF_N}`} the difference is about ${Number((fact(DIFF_N) - stirling(DIFF_N)).toPrecision(3))}, and it grows without bound, even though it is under half a percent of ${math`${DIFF_N}!`}.` },
    { kind: 'section', title: t`What the schedule proves` },
    { kind: 'theorem', statement: t`${math`\ln n! \sim n \ln n`} as ${math`n \to \infty`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Turn the product into a sum`, text: t`${math`\ln n! = \ln ${2} + \ln ${3} + \cdots + \ln n = \sum_{k = ${2}}^{n} \ln k`}.` },
        { label: t`Trap it between integrals`, text: t`${math`\ln x`} is increasing, so on ${math`[k - ${1}, k]`} it is at most ${math`\ln k`}, and on ${math`[k, k + ${1}]`} at least ${math`\ln k`}. Adding these over ${mk}:`, eq: [dmath`\int_{${1}}^{n} \ln x\,dx \le \ln n! \le \int_{${1}}^{n + ${1}} \ln x\,dx.`], why: { q: t`Can you picture that?`, a: t`Draw bars of width ${1} and height ${math`\ln k`}. They stick out above the curve ${math`\ln x`} to their left and sit under it to their right, so their total area lies between the two integrals.` } },
        { label: t`Integrate`, text: t`${math`\int \ln x\,dx = x\ln x - x`}, so ${math`n\ln n - n + ${1} \le \ln n! \le (n + ${1})\ln(n + ${1}) - n`}.` },
        { label: t`Divide by n ln n`, text: t`Both bounds divided by ${math`n \ln n`} tend to ${1}, so ${math`\frac{\ln n!}{n \ln n} \to ${1}`}.`, plain: t`The ${math`-n`} terms are small next to ${math`n \ln n`}, because ${math`\ln n \to \infty`}.` },
      ],
    },
    { kind: 'section', title: t`Ratios of factorials` },
    { kind: 'narrative', text: t`The formula earns its keep in ratios, where the powers of ${math`e`} cancel and the giant numbers vanish. Take ${math`\binom{${3}m}{m} = \frac{(${3}m)!}{m!\,(${2}m)!}`}.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Replace each factorial`, text: t`By Stirling,`, eq: [dmath`\binom{${3}m}{m} \sim \frac{\sqrt{${6}\pi m}\,(${3}m/e)^{${3}m}}{\sqrt{${2}\pi m}\,(m/e)^{m}\,\sqrt{${4}\pi m}\,(${2}m/e)^{${2}m}}.`], why: { q: t`Why may we replace each factorial separately?`, a: t`Ratios of sequences that are asymptotically equal are asymptotically equal: if ${math`a_{n}/b_{n} \to ${1}`} and ${math`c_{n}/d_{n} \to ${1}`} then ${math`\frac{a_{n}/c_{n}}{b_{n}/d_{n}} \to ${1}`}.` } },
        { label: t`Cancel the e's and the m's`, text: t`The powers of ${math`e`} are ${math`e^{-${3}m}`} on top and ${math`e^{-m}e^{-${2}m}`} below: they cancel. So do the powers ${math`m^{${3}m}`}, leaving ${math`\frac{${3}^{${3}m}}{${2}^{${2}m}} = \left(\frac{${27}}{${4}}\right)^{m}`}.` },
        { label: t`Tidy the roots`, text: t`${math`\frac{\sqrt{${6}\pi m}}{\sqrt{${2}\pi m}\sqrt{${4}\pi m}} = \frac{\sqrt{${3}}}{${2}\sqrt{\pi m}}`}, so`, eq: [dmath`\binom{${3}m}{m} \sim \frac{\sqrt{${3}}}{${2}\sqrt{\pi m}}\left(\frac{${27}}{${4}}\right)^{m}.`] },
      ],
    },
    { kind: 'p', text: t`Check with ${math`m = ${TRI.m}`}: exactly ${math`\binom{${3 * TRI.m}}{${TRI.m}} = ${triExact}`}, and the estimate gives about ${Math.round(triApprox)}, a ratio of ${round(triExact / triApprox, 4)}.` },
    { kind: 'p', text: t`The same steps with ${math`\binom{${2}m}{m}`} give an estimate for the chance of exactly ${math`m`} heads in ${math`${2}m`} fair tosses. IA Probability Sheet ${1} uses it twice: question ${3}, halving a deck of cards, and question ${14}, a random walk returning to ${0}, where the normal curve first appears.` },
    checkFrom(halfHeads, { m: 8 }, t`${math`\binom{${16}}{${8}} / ${2}^{${16}} \approx \frac{${1}}{\sqrt{${8}\pi}} \approx ${Number((1 / Math.sqrt(8 * Math.PI)).toPrecision(4))}`}; the exact value is ${Number(centralProb(8).toPrecision(4))}.`),
    { kind: 'pitfall', claim: t`${math`\ln n! \approx n \ln n - n`} is a good estimate of ${math`\ln n!`}.`, counterexample: t`It is good in ratio, but it misses by about ${math`\tfrac{${1}}{${2}}\ln(${2}\pi n)`}, which grows. At ${math`n = ${1000}`} that is ${round(lnFact(1000) - (1000 * Math.log(1000) - 1000), 2)}, so the estimate of ${math`${1000}!`} itself is off by a factor of about ${Math.round(Math.exp(lnFact(1000) - (1000 * Math.log(1000) - 1000)))}.` },
    { kind: 'takeaway', text: t`${math`n! \sim \sqrt{${2}\pi n}\,(n/e)^{n}`}: equal in ratio, not in difference; in ratios of factorials the powers of ${math`e`} cancel and leave a simple formula.` },
  ],
  examples: [
    workedCambridge(q3),
    worked(stirlingRatio, { n: 10 }, t`${math`${10}!`} against Stirling's formula`),
    worked(halfHeads, { m: 10 }, t`Ten heads in twenty tosses`),
  ],
  generators: [stirlingRatio, halfHeads, logFactorial],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['stirlings-formula', 'asymptotic'],
  cambridge: [q14, q3proof, q14a, q14b],
  // Best first: deriving the central binomial estimate and the deck answer, then the random
  // walk's local limit at 0 and everywhere. Putting n = 100 into the given formula is too
  // slight to gate.
  gate: ['ia-q3-stirling-derivation', 'ia-q14-a', 'ia-q14-b'],
  recall: [
    { front: t`State Stirling's formula.`, back: t`${math`n! \sim \sqrt{${2}\pi n}\,(n/e)^{n}`}.` },
    { front: t`What does ${math`a_{n} \sim b_{n}`} mean?`, back: t`${math`a_{n}/b_{n} \to ${1}`}: equal in ratio, not necessarily in difference.` },
    { front: t`Asymptotic form of ${math`\binom{${2}m}{m}`}?`, back: t`${math`\frac{${4}^{m}}{\sqrt{\pi m}}`}.` },
  ],
  proofOrder: [
    {
      title: t`${math`\ln n! \sim n \ln n`}`,
      steps: [
        t`Write ${math`\ln n!`} as ${math`\sum_{k = ${2}}^{n} \ln k`}.`,
        t`Trap the sum between ${math`\int_{${1}}^{n} \ln x\,dx`} and ${math`\int_{${1}}^{n + ${1}} \ln x\,dx`}.`,
        t`Integrate: ${math`n\ln n - n + ${1} \le \ln n! \le (n + ${1})\ln(n + ${1}) - n`}.`,
        t`Divide by ${math`n \ln n`}: both bounds tend to ${1}.`,
      ],
    },
  ],
};
