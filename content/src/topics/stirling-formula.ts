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
import { math, t } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';

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

export const stirlingFormula: TopicContent = {
  topicId: 'prob.stirling-formula',
  goal: t`Use Stirling's formula ${math`n! \sim \sqrt{${2}\pi n}\,(n/e)^{n}`} to estimate factorials, central binomial coefficients, and the probabilities built from them.`,
  lesson: [
    { kind: 'rule', text: t`[[stirlings-formula|Stirling's formula]]: ${math`n! \sim \sqrt{${2}\pi n}\,\left(\frac{n}{e}\right)^{n}`}, where ${math`a_{n} \sim b_{n}`} means ${math`a_{n} / b_{n} \to ${1}`} as ${math`n \to \infty`} ([[asymptotic|asymptotically equal]]).` },
    { kind: 'p', text: t`It is good long before ${mn} is large: for ${math`n = ${10}`}, ${math`${10}! = ${fact(10)}`} and the formula gives about ${Math.round(stirling(10))}, a ratio of ${round(fact(10) / stirling(10), 4)}. The ratio behaves like ${math`${1} + \frac{${1}}{${12}n}`}. The Faculty schedule proves the cruder ${math`\ln n! \sim n \ln n`}; the full formula is stated and used.` },
    { kind: 'p', text: t`Its main use is in ratios of factorials, where the powers of ${math`e`} cancel. The central binomial coefficient: ${math`\binom{${2}m}{m} = \frac{(${2}m)!}{(m!)^{${2}}} \sim \frac{${4}^{m}}{\sqrt{\pi m}}`}. So in ${2 * 50} fair tosses, exactly ${50} heads has probability about ${math`${1} / \sqrt{${50}\pi} \approx ${Number((1 / Math.sqrt(50 * Math.PI)).toPrecision(4))}`}, against the exact ${Number(centralProb(50).toPrecision(4))}.` },
    { kind: 'p', text: t`Sheet ${1} Q${3}: halving a deck, each half has ${13} red cards with probability ${math`\binom{${26}}{${13}}^{${2}} / \binom{${52}}{${26}} \approx ${round(deckExact, 4)}`}. Stirling's formula turns the expression into ${math`${2} / \sqrt{${26}\pi} \approx ${round(deckStirling, 4)}`}: within ${Math.round((deckStirling / deckExact - 1) * 1000) / 10}%, with no large numbers at all.` },
    { kind: 'p', text: t`The same estimate is the local limit of a random walk (Q${14}): after an even number ${mn} of fair ${math`\pm ${1}`} steps, ${math`P(X_{n} = ${0}) = \binom{n}{n/${2}} ${2}^{-n} \sim \sqrt{${2} / (\pi n)}`}, the first glimpse of the normal curve.` },
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
};
