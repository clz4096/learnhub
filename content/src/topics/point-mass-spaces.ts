/**
 * prob.point-mass-spaces: on a countable Ω a probability measure is the same thing as a
 * family of point masses p_ω ≥ 0 that add to 1, with P(A) the sum of the masses in A. From
 * the Faculty schedule ("Probability spaces") and IA Probability Example Sheet 2 Q13 (the
 * zeta distribution P(X = n) = n^(-s)/ζ(s): the events "p divides X" have probability
 * p^(-s) and are independent, which gives Euler's product). The sheet has no official
 * solutions; the answers are checked by summing the series in floating point with the
 * tails bounded.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, supervision, withUses } from '../cambridge';
import { int, mul, pick, q, str, sub, toFloat, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { distinctFrom, nearestFraction, pow } from '../partv-c';
import { dmath, math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

const S2 = 'ia-prob-sheet-2' as const;
const RATIOS: readonly Rational[] = [q(1, 2), q(1, 3), q(2, 3), q(1, 4), q(3, 4), q(2, 5), q(3, 5)];
const inv = (r: Rational): Rational => q(r.den, r.num);
/** The number of failures before the first success when each trial fails with probability r: masses (1 - r) r^k on k = 0, 1, 2, .... */
const geomDraw = (r: Rational, rng: Rng): number => { let k = 0; while (rng() < toFloat(r)) k++; return k; };

// ---------------------------------------------------------------- the normalising constant

interface NormP { r: Rational; m: number }
const normVal = ({ r, m }: NormP): Rational => mul(sub(q(1), r), inv(pow(r, m)));
const normMis = ({ r, m }: NormP): string[] => [str(mul(pow(r, m), inv(sub(q(1), r)))), str(sub(q(1), r)), str(mul(sub(q(1), r), pow(r, m))), str(r)];

const normalise = generator<NormP>({
  id: 'normalise',
  skill: 'Find the constant that makes geometric point masses on a countable set add to one.',
  params: (rng) => {
    for (;;) {
      const p: NormP = { r: pick(rng, RATIOS), m: int(rng, 0, 3) };
      if (distinctFrom(str(normVal(p)), normMis(p)) >= 2) return p;
    }
  },
  sane: ({ r, m }) => (r.num > 0n && r.num < r.den && m >= 0 ? null : 'out of range'),
  problem: (p) => {
    const total = mul(pow(p.r, p.m), inv(sub(q(1), p.r)));
    return {
      prompt: t`A probability space has ${math`\Omega = \{${p.m}, ${p.m + 1}, ${p.m + 2}, \ldots\}`} and point masses ${math`p_{k} = c \left(${p.r}\right)^{k}`} for ${math`k \ge ${p.m}`}. What must the constant ${math`c`} be?`,
      answer: { kind: 'exact', expected: str(normVal(p)) },
      solution: [
        t`The masses must add to ${1}. They form a geometric series with first term ${math`c \left(${p.r}\right)^{${p.m}}`} and ratio ${p.r}, so ${math`\sum_{k \ge ${p.m}} p_{k} = c \cdot \frac{${pow(p.r, p.m)}}{${1} - ${p.r}} = c \cdot ${total}`}.`,
        t`So ${math`c = ${normVal(p)}`}.`,
      ],
    };
  },
  solve: ({ r, m }) => {
    // Add the masses in floating point until the tail is negligible, then name the fraction.
    let total = 0;
    for (let k = m; k < m + 400; k++) total += toFloat(r) ** k;
    return str(nearestFraction(1 / total, 1000));
  },
  misconceptions: (p): Misconception[] => {
    const [a, b, c, d] = normMis(p);
    return [
      { response: a as string, why: t`That is the sum of the masses without ${math`c`}. The constant is its reciprocal, so that the total becomes ${1}.` },
      { response: b as string, why: t`That would be right if the masses started at ${math`k = ${0}`}. Here the first mass is ${math`c \left(${p.r}\right)^{${p.m}}`}: divide by ${pow(p.r, p.m)} too.` },
      { response: c as string, why: t`The first term of the series is ${math`c \left(${p.r}\right)^{${p.m}}`}, so ${math`c`} must be divided by ${pow(p.r, p.m)}, not multiplied.` },
      { response: d as string, why: t`The ratio of the series is not the constant. Add the masses and set the total to ${1}.` },
    ];
  },
});

// ---------------------------------------------------------------- the probability of an event

type EvKind = 'at-least' | 'even' | 'at-most' | 'multiple-three';
interface EvP { r: Rational; kind: EvKind; m: number }
function evVal({ r, kind, m }: EvP): Rational {
  switch (kind) {
    case 'at-least': return pow(r, m);
    case 'even': return inv(mul(q(1), q(r.num + r.den, r.den)));
    case 'at-most': return sub(q(1), pow(r, m + 1));
    case 'multiple-three': return inv(q(r.den * r.den + r.num * r.den + r.num * r.num, r.den * r.den));
  }
}
function evMis({ r, kind, m }: EvP): [Rational, Rich][] {
  const one = sub(q(1), r);
  switch (kind) {
    case 'at-least': return [
      [pow(r, m + 1), t`${math`X \ge ${m}`} includes ${math`X = ${m}`}: add the masses from ${math`k = ${m}`} on, a geometric series whose first term is ${math`p_{${m}}`}.`],
      [sub(q(1), pow(r, m)), t`That is ${math`\mathbb{P}(X < ${m})`}, the complement.`],
      [mul(one, pow(r, m)), t`That is the single mass ${math`p_{${m}}`}. Add the masses for every ${math`k \ge ${m}`}.`],
    ];
    case 'even': return [
      [q(1, 2), t`The masses are not equal, so even and odd values are not equally likely: ${math`p_{${0}}`} is the largest mass, and ${0} is even.`],
      [mul(r, evVal({ r, kind, m })), t`That is the chance of an odd value. The even values ${math`${0}, ${2}, ${4}, \ldots`} start with the largest mass.`],
      [one, t`That is only ${math`p_{${0}}`}. Add ${math`p_{${0}} + p_{${2}} + p_{${4}} + \cdots`}, a geometric series with ratio ${pow(r, 2)}.`],
    ];
    case 'at-most': return [
      [sub(q(1), pow(r, m)), t`${math`X \le ${m}`} includes ${math`X = ${m}`}: the complement is ${math`X \ge ${m + 1}`}, with probability ${math`r^{${m + 1}}`}.`],
      [pow(r, m + 1), t`That is the chance of the complement, ${math`X \ge ${m + 1}`}. Subtract it from ${1}.`],
      [mul(one, pow(r, m)), t`That is the single mass ${math`p_{${m}}`}. Add the masses for ${math`k = ${0}, \ldots, ${m}`}.`],
    ];
    case 'multiple-three': return [
      [q(1, 3), t`The masses are not equal, so the multiples of ${3} do not get a third: ${math`p_{${0}}`} is the largest mass.`],
      [inv(q(r.num + r.den, r.den)), t`That is the chance of an even value. The masses of the multiples of ${3} form a geometric series with ratio ${pow(r, 3)}, not ${pow(r, 2)}.`],
      [one, t`That is only ${math`p_{${0}}`}. Add ${math`p_{${0}} + p_{${3}} + p_{${6}} + \cdots`}.`],
    ];
  }
}
const evText = (kind: EvKind, m: number): Rich =>
  kind === 'at-least' ? t`${math`X \ge ${m}`}` : kind === 'even' ? t`${math`X`} is even` : kind === 'at-most' ? t`${math`X \le ${m}`}` : t`${math`X`} is a multiple of ${3}`;
const evHolds = (kind: EvKind, m: number, k: number): boolean =>
  kind === 'at-least' ? k >= m : kind === 'even' ? k % 2 === 0 : kind === 'at-most' ? k <= m : k % 3 === 0;

const eventProbability = generator<EvP>({
  id: 'event-probability',
  skill: 'Find the probability of an event on a countable space by adding the point masses in it.',
  params: (rng) => {
    for (;;) {
      const p: EvP = { r: pick(rng, RATIOS), kind: pick(rng, ['at-least', 'even', 'at-most', 'multiple-three'] as const), m: int(rng, 1, 4) };
      if (distinctFrom(str(evVal(p)), evMis(p).map(([x]) => str(x))) >= 2) return p;
    }
  },
  sane: ({ r, m }) => (r.num > 0n && r.num < r.den && m >= 1 ? null : 'out of range'),
  problem: (p) => {
    const one = sub(q(1), p.r);
    const steps: Rich[] = [t`${math`\mathbb{P}(A) = \sum_{k \in A} p_{k}`}, and here the masses are ${math`p_{k} = ${one} \left(${p.r}\right)^{k}`}.`];
    if (p.kind === 'at-least') steps.push(t`${math`\sum_{k \ge ${p.m}} ${one} \left(${p.r}\right)^{k} = ${one} \cdot \frac{${pow(p.r, p.m)}}{${one}} = ${evVal(p)}`}.`);
    else if (p.kind === 'at-most') steps.push(t`The complement is ${math`X \ge ${p.m + 1}`}, with probability ${math`\left(${p.r}\right)^{${p.m + 1}} = ${pow(p.r, p.m + 1)}`}; so the answer is ${math`${1} - ${pow(p.r, p.m + 1)} = ${evVal(p)}`}.`);
    else if (p.kind === 'even') steps.push(t`${math`\sum_{j \ge ${0}} ${one} \left(${p.r}\right)^{${2}j} = \frac{${one}}{${1} - ${pow(p.r, 2)}} = ${evVal(p)}`}.`);
    else steps.push(t`${math`\sum_{j \ge ${0}} ${one} \left(${p.r}\right)^{${3}j} = \frac{${one}}{${1} - ${pow(p.r, 3)}} = ${evVal(p)}`}.`);
    return {
      prompt: t`A random variable ${math`X`} takes the values ${math`${0}, ${1}, ${2}, \ldots`} with ${math`\mathbb{P}(X = k) = ${one} \left(${p.r}\right)^{k}`}. Find the probability that ${evText(p.kind, p.m)}.`,
      answer: { kind: 'exact', expected: str(evVal(p)) },
      solution: steps,
    };
  },
  solve: ({ r, kind, m }) => {
    // Add the masses of the event term by term in floating point; the tail after 600 terms is below 1e-70.
    let total = 0;
    const one = 1 - toFloat(r);
    for (let k = 0; k < 600; k++) if (evHolds(kind, m, k)) total += one * toFloat(r) ** k;
    return str(nearestFraction(total, 100_000));
  },
  misconceptions: (p): Misconception[] => evMis(p).map(([x, why]) => ({ response: str(x), why })),
  trial: (p, rng) => evHolds(p.kind, p.m, geomDraw(p.r, rng)),
});

// ---------------------------------------------------------------- the zeta distribution

interface ZetaP { s: number; a: number; b: number | null }
const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));
const lcmOf = (a: number, b: number | null): number => (b === null ? a : (a * b) / gcd(a, b));
const zetaVal = ({ s, a, b }: ZetaP): Rational => q(1, lcmOf(a, b) ** s);
function zetaMis({ s, a, b }: ZetaP): [Rational, Rich][] {
  if (b === null) {
    return [
      [q(1, a), t`On a finite set of equally likely numbers about one in ${a} is a multiple of ${a}, but here small numbers are far more likely. Sum the masses of the multiples: ${math`\sum_{m} (${a}m)^{-s}`}.`],
      [sub(q(1), q(1, a ** s)), t`That is the chance that ${a} does not divide ${math`X`}.`],
    ];
  }
  return [
    [q(1, (a * b) ** s), t`Divisible by ${a} and by ${b} means divisible by their least common multiple, ${lcmOf(a, b)}, not by ${a * b}.`],
    [q(a ** s + b ** s, (a * b) ** s), t`Adding the two probabilities counts "divisible by ${a} or by ${b}", and even that needs inclusion-exclusion. "And" is divisibility by the least common multiple.`],
    [q(1, lcmOf(a, b)), t`Small numbers are far more likely than large ones here. The multiples of ${lcmOf(a, b)} have total mass ${math`${lcmOf(a, b)}^{-s}`}, with ${math`s = ${s}`}.`],
  ];
}
/** P(X divisible by L) for the zeta distribution, by brute force over n up to N with the tails estimated by integrals. */
function zetaBrute(s: number, divides: (n: number) => boolean, L: number): number {
  const N = 20_000;
  let all = 0;
  let hit = 0;
  for (let n = 1; n <= N; n++) {
    const x = n ** -s;
    all += x;
    if (divides(n)) hit += x;
  }
  // Euler-Maclaurin tails: sum over n > N of n^-s, and over the multiples Lm > N of (Lm)^-s.
  const M = Math.floor(N / L);
  all += N ** (1 - s) / (s - 1) - N ** -s / 2;
  hit += L ** -s * (M ** (1 - s) / (s - 1) - M ** -s / 2);
  return hit / all;
}

const zetaDivisible = generator<ZetaP>({
  id: 'zeta-divisible',
  skill: 'Find the probability that a zeta-distributed number is divisible by a given number, as in Sheet 2 Q13.',
  params: (rng) => {
    const s = pick(rng, [2, 3]);
    if (rng() < 0.4) return { s, a: int(rng, 2, 9), b: null };
    for (;;) {
      const a = int(rng, 2, 6);
      const b = int(rng, 2, 6);
      if (a < b && lcmOf(a, b) ** s <= 30_000) return { s, a, b };
    }
  },
  sane: ({ s, a, b }) => (s >= 2 && a >= 2 && (b === null || b > a) ? null : 'out of range'),
  problem: (p) => {
    const L = lcmOf(p.a, p.b);
    const what = p.b === null ? t`divisible by ${p.a}` : t`divisible by both ${p.a} and ${p.b}`;
    return {
      prompt: t`${math`X`} takes values in ${math`\{${1}, ${2}, \ldots\}`} with ${math`\mathbb{P}(X = n) = n^{-${p.s}}/\zeta(${p.s})`}, where ${math`\zeta(${p.s}) = \sum_{n \ge ${1}} n^{-${p.s}}`}. What is the probability that ${math`X`} is ${what}?`,
      answer: { kind: 'exact', expected: str(zetaVal(p)) },
      solution: [
        ...(p.b === null ? [] : [t`${math`X`} is divisible by both ${p.a} and ${p.b} exactly when it is divisible by their least common multiple, ${L}.`]),
        t`The multiples of ${L} are ${math`${L}m`} for ${math`m = ${1}, ${2}, \ldots`}, so ${math`\mathbb{P} = \sum_{m \ge ${1}} \frac{(${L}m)^{-${p.s}}}{\zeta(${p.s})} = ${L}^{-${p.s}} \cdot \frac{\sum_{m} m^{-${p.s}}}{\zeta(${p.s})} = ${zetaVal(p)}`}.`,
      ],
    };
  },
  solve: (p) => {
    const L = lcmOf(p.a, p.b);
    const v = zetaBrute(p.s, (n) => n % p.a === 0 && (p.b === null || n % p.b === 0), L);
    return str(nearestFraction(v, 30_000));
  },
  misconceptions: (p): Misconception[] => zetaMis(p).map(([x, why]) => ({ response: str(x), why })),
});

// ---------------------------------------------------------------- Cambridge problems

const S_DOM = { p: { kind: 'integer' as const, min: 2, max: 13 }, s: { kind: 'real' as const, min: 1.2, max: 4 } };
const q13a = auto({
  id: 'ia-s2-q13-ap',
  source: cite(S2, 'Q13'),
  title: t`The zeta distribution: divisible by a prime`,
  prompt: t`Let ${math`s > ${1}`} and let ${math`X`} take values in ${math`\{${1}, ${2}, \ldots\}`} with ${math`\mathbb{P}(X = n) = n^{-s}/\zeta(s)`}, where ${math`\zeta(s)`} is the normalising constant. For a prime ${math`p`}, let ${math`A_{p}`} be the event that ${math`X`} is divisible by ${math`p`}. Find ${math`\mathbb{P}(A_{p})`} as an expression in ${math`p`} and ${math`s`}.`,
  answer: { kind: 'expression', expected: 'p^(-s)', variables: ['p', 's'], domains: S_DOM },
  solution: [
    t`The masses add to ${1} when ${math`\zeta(s) = \sum_{n \ge ${1}} n^{-s}`}, which is finite because ${math`s > ${1}`}.`,
    t`${math`A_{p}`} is the set of multiples ${math`pm`}, ${math`m \ge ${1}`}. Adding their masses: ${math`\mathbb{P}(A_{p}) = \sum_{m \ge ${1}} \frac{(pm)^{-s}}{\zeta(s)} = p^{-s} \cdot \frac{\sum_{m} m^{-s}}{\zeta(s)} = p^{-s}`}.`,
  ],
  reference: '1/p^s',
  verify: () => {
    for (const s of [2, 3, 2.5]) for (const p of [2, 3, 5, 7]) {
      const v = zetaBrute(s, (n) => n % p === 0, p);
      if (Math.abs(v - p ** -s) > 1e-7) return `s = ${s}, p = ${p}: summed ${v}, formula ${p ** -s}`;
    }
    return null;
  },
  misconceptions: [
    { response: '1/p', why: t`Small numbers carry most of the mass here, so the multiples of ${math`p`} do not get a share of ${math`${1}/p`}. Add their masses.` },
    { response: '1 - p^(-s)', why: t`That is the chance that ${math`p`} does not divide ${math`X`}.` },
  ],
});

const NOT23 = mul(sub(q(1), q(1, 4)), sub(q(1), q(1, 9)));
const q13b = auto({
  id: 'ia-s2-q13-coprime-six',
  source: cite(S2, 'Q13', true),
  title: t`Divisible by neither ${2} nor ${3}`,
  prompt: t`In Q${13} take ${math`s = ${2}`}, so ${math`\mathbb{P}(X = n) = n^{-${2}}/\zeta(${2})`}. What is the probability that ${math`X`} is divisible by neither ${2} nor ${3}?`,
  answer: { kind: 'exact', expected: str(NOT23) },
  solution: [
    t`${math`\mathbb{P}(A_{${2}}) = ${q(1, 4)}`}, ${math`\mathbb{P}(A_{${3}}) = ${q(1, 9)}`}, and ${math`A_{${2}} \cap A_{${3}} = A_{${6}}`} has probability ${q(1, 36)}: the product, so the two events are independent.`,
    t`Complements of independent events are independent, so ${math`\mathbb{P}(A_{${2}}^{c} \cap A_{${3}}^{c}) = \left(${1} - ${q(1, 4)}\right)\left(${1} - ${q(1, 9)}\right) = ${NOT23}`}.`,
    t`Check independence by the product rule; then the complements multiply as well.`,
  ],
  reference: str(NOT23),
  verify: () => {
    // A direct partial sum over the numbers prime to 6; zetaBrute's tail estimate for L = 1 adds the whole tail, under 1e-4 here.
    const v = zetaBrute(2, (n) => n % 2 !== 0 && n % 3 !== 0, 1);
    // And by inclusion-exclusion over the multiples, whose tails zetaBrute estimates closely.
    const viaComplement = 1 - zetaBrute(2, (n) => n % 2 === 0, 2) - zetaBrute(2, (n) => n % 3 === 0, 3) + zetaBrute(2, (n) => n % 6 === 0, 6);
    if (Math.abs(viaComplement - toFloat(NOT23)) > 1e-7) return `inclusion-exclusion over the series gives ${viaComplement}`;
    return Math.abs(v - toFloat(NOT23)) < 1e-3 ? null : `direct sum gives ${v}`;
  },
  misconceptions: [
    { response: str(q(1, 3)), why: t`Among equally likely numbers a third avoid ${2} and ${3}, but here ${1} alone has more than half the mass. Use ${math`\mathbb{P}(A_{${2}}) = ${q(1, 4)}`} and ${math`\mathbb{P}(A_{${3}}) = ${q(1, 9)}`}.` },
    { response: str(sub(q(1), q(13, 36))), why: t`${math`A_{${2}}`} and ${math`A_{${3}}`} overlap in ${math`A_{${6}}`}: add back its probability ${q(1, 36)}.` },
  ],
  nudge: t`Not quite. "Divisible by ${2}" and "divisible by ${3}" turn out to be independent here, and complements of independent events multiply too.`,
  hints: [
    t`What is ${math`\mathbb{P}(A_{${2}})`}, the probability that ${math`X`} is a multiple of ${2}, when ${math`\mathbb{P}(X = n)`} is proportional to ${math`n^{-${2}}`}?`,
    t`What are ${math`\mathbb{P}(A_{${3}})`} and ${math`\mathbb{P}(A_{${2}} \cap A_{${3}})`}, and are the two events independent?`,
    t`How does independence give the probability that neither event happens?`,
  ],
});

const q13proof = supervision({
  id: 'ia-s2-q13-euler',
  source: cite(S2, 'Q13'),
  title: t`Independence and Euler's product`,
  prompt: t`In Q${13}, show that the events ${math`(A_{p} : p \text{ prime})`} are independent: for distinct primes ${math`p_{${1}}, \ldots, p_{k}`}, ${math`\mathbb{P}(A_{p_{${1}}} \cap \cdots \cap A_{p_{k}}) = \prod_{i} \mathbb{P}(A_{p_{i}})`}. Deduce that ${math`\prod_{p} \left(${1} - p^{-s}\right) = ${1}/\zeta(s)`}. State where unique factorisation is used, and where the continuity of probability.`,
  writeUp: 'proof',
  hints: [
    t`What is ${math`\mathbb{P}(A_{m})`}, the probability that ${math`m`} divides ${math`X`}, by putting ${math`n = mk`} in the sum?`,
    t`For distinct primes, why is ${math`A_{p_{${1}}} \cap \cdots \cap A_{p_{k}}`} the event that ${math`p_{${1}} \cdots p_{k}`} divides ${math`X`}?`,
    t`Which event is the intersection of all the ${math`A_{p}^{c}`}, and how do continuity and unique factorisation give its probability?`,
  ],
});
const scheduleProof = supervision({
  id: 'schedule-point-masses',
  source: cite('tripos-schedules', 'IA Probability, Axiomatic approach: "Probability spaces."', true),
  title: t`Point masses give a probability measure`,
  prompt: t`Let ${math`\Omega`} be countable and ${math`p_{\omega} \ge ${0}`} with ${math`\sum_{\omega} p_{\omega} = ${1}`}. Prove that ${math`\mathbb{P}(A) = \sum_{\omega \in A} p_{\omega}`} defines a probability measure on all subsets of ${math`\Omega`}: say why the sum does not depend on the order of ${math`A`}'s elements, and prove countable additivity. Conversely, show that every probability measure on all subsets of ${math`\Omega`} has this form. Why is there no such measure giving every point of ${math`\mathbb{N}`} the same mass?`,
  writeUp: 'proof',
  hints: [
    t`For nonnegative terms, why does the sum not depend on the order, and how does that give countable additivity?`,
    t`Given a probability measure, what are the masses ${math`p_{\omega} = \mathbb{P}(\{\omega\})`}, and how does countable additivity recover ${math`\mathbb{P}(A)`}?`,
    t`If every point of ${math`\mathbb{N}`} had the same mass ${math`c`}, what would the total be for ${math`c = ${0}`} and for ${math`c > ${0}`}?`,
  ],
});

// ---------------------------------------------------------------- lesson

const HALF_EVEN = q(1, 3);
const claims: ProbabilityClaim[] = [
  { what: 'masses 2^-k on k >= 1: P(even)', exact: HALF_EVEN, trial: (rng) => { let k = 1; while (rng() < 0.5) k++; return k % 2 === 0; } },
];
const [mO, mX] = [math`\Omega`, math`X`];

export const pointMassSpaces: TopicContent = {
  topicId: 'prob.point-mass-spaces',
  goal: t`Build a probability space on a countable set from point masses, and find ${math`\mathbb{P}(A)`} by adding the masses in ${math`A`}.`,
  objective: t`Build a probability on a countable set from point masses, and find any event's probability by adding.`,
  why: t`Every discrete random variable lives on such a space; and no uniform distribution on the integers can exist.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Infinitely many outcomes` },
    { kind: 'hook', text: t`Toss a fair coin until the first head. The number of tosses could be ${1}, ${2}, ${3}, and so on forever, with chances ${q(1, 2)}, ${q(1, 4)}, ${q(1, 8)}, and so on. What is the chance that it takes an even number of tosses? There are infinitely many outcomes to add, and yet the answer is a simple fraction.` },
    { kind: 'narrative', text: t`A set is countable if it is finite or its elements can be listed as ${math`\omega_{${1}}, \omega_{${2}}, \omega_{${3}}, \ldots`}, like the natural numbers. On such a set, a probability is completely fixed by how much it gives to each single outcome. That is the whole idea of this lesson.` },

    { kind: 'section', title: t`Point masses` },
    { kind: 'definition', name: t`Point masses`, formal: t`Let ${mO} be countable. A family of [[point-mass|point masses]] is a choice of numbers ${math`p_{\omega} \ge ${0}`}, one for each ${math`\omega \in \Omega`}, with ${math`\sum_{\omega \in \Omega} p_{\omega} = ${1}`}. It defines ${dmath`\mathbb{P}(A) = \sum_{\omega \in A} p_{\omega}, \qquad A \subseteq \Omega.`}`, plain: t`Give each outcome a weight, the weights adding to ${1}; the probability of an event is the total weight of its outcomes. For the coin, ${math`p_{k} = (\tfrac{${1}}{${2}})^{k}`} on ${math`\{${1}, ${2}, \ldots\}`}.` },
    { kind: 'theorem', statement: t`On a countable ${mO}, point masses define a probability measure on all subsets of ${mO}. Conversely, every probability measure on all subsets of ${mO} comes from point masses, namely ${math`p_{\omega} = \mathbb{P}(\{\omega\})`}.` },
    { kind: 'p', text: t`This makes the space a [[countable-probability-space|probability space on a countable set]]: every subset is an event, and nothing else needs to be specified.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`The sum is well defined`, text: t`A series of nonnegative terms has the same sum, finite or infinite, in every order, so ${math`\sum_{\omega \in A} p_{\omega}`} does not depend on how ${math`A`} is listed. It lies between ${0} and ${1}, since it is part of a series with total ${1}.`, why: { q: t`Why does the order not matter?`, a: t`For nonnegative terms, the sum is the least upper bound of the sums over finite subsets, and that does not mention any order. (Order matters only for series with terms of both signs.)` } },
        { label: t`The total is ${1}`, text: t`${math`\mathbb{P}(\Omega) = \sum_{\omega} p_{\omega} = ${1}`}, by assumption.` },
        { label: t`Countable additivity`, text: t`If ${math`A_{${1}}, A_{${2}}, \ldots`} are disjoint, the masses in their union can be summed set by set, because nonnegative series may be grouped freely: ${math`\mathbb{P}(\bigcup_{i} A_{i}) = \sum_{i} \sum_{\omega \in A_{i}} p_{\omega} = \sum_{i} \mathbb{P}(A_{i})`}.` },
        { label: t`The converse`, text: t`Given a probability measure, set ${math`p_{\omega} = \mathbb{P}(\{\omega\})`}. Any ${math`A`} is the countable disjoint union of its single points, so countable additivity gives ${math`\mathbb{P}(A) = \sum_{\omega \in A} p_{\omega}`}.` },
      ],
    },

    { kind: 'section', title: t`Adding masses` },
    {
      kind: 'steps',
      steps: [
        { label: t`The event`, text: t`For the coin, "an even number of tosses" is ${math`\{${2}, ${4}, ${6}, \ldots\}`}.` },
        { label: t`Add its masses`, text: t`${math`\sum_{j \ge ${1}} (\tfrac{${1}}{${2}})^{${2}j} = \sum_{j \ge ${1}} (\tfrac{${1}}{${4}})^{j}`}, a geometric series with first term ${q(1, 4)} and ratio ${q(1, 4)}.` },
        { label: t`Sum it`, text: t`${math`\frac{${1}/${4}}{${1} - ${1}/${4}} = ${HALF_EVEN}`}.`, why: { q: t`Which formula is that?`, a: t`A geometric series ${math`a + ar + ar^{${2}} + \cdots`} with ${math`|r| < ${1}`} sums to ${math`\frac{a}{${1} - r}`}.` } },
      ],
    },
    { kind: 'p', text: t`Masses are often given only up to a constant, such as ${math`c\,r^{k}`}. Choose ${math`c`} so that the total is ${1}: for ${math`k \ge ${0}`}, ${math`\sum c\,r^{k} = \frac{c}{${1} - r}`}, so ${math`c = ${1} - r`}.` },
    checkFrom(normalise, { r: q(1, 2), m: 0 }, t`${math`\sum_{k \ge ${0}} c(\tfrac{${1}}{${2}})^{k} = ${2}c`}, which must be ${1}.`),
    checkFrom(eventProbability, { r: q(1, 2), kind: 'multiple-three', m: 1 }, t`Add ${math`p_{${0}} + p_{${3}} + \cdots`}: ${math`\frac{${1}}{${2}} \cdot \frac{${1}}{${1} - (${1}/${2})^{${3}}} = ${q(4, 7)}`}.`),

    { kind: 'section', title: t`No uniform distribution on the integers` },
    { kind: 'theorem', statement: t`There is no probability measure on ${math`\mathbb{N}`} that gives every point the same mass.` },
    { kind: 'p', text: t`Proof: if every ${math`p_{n} = c`}, then ${math`\sum_{n} p_{n}`} is ${0} when ${math`c = ${0}`} and infinite when ${math`c > ${0}`}; never ${1}. ∎ So "a random whole number, all equally likely" has no meaning. Probabilities on an infinite countable set must thin out.` },
    { kind: 'p', text: t`Example Sheet ${2} question ${13} uses a thinning choice: for ${math`s > ${1}`}, ${math`\mathbb{P}(X = n) = n^{-s}/\zeta(s)`}, where ${math`\zeta(s) = \sum_{n} n^{-s}`} makes the masses add to ${1}. The worked Cambridge problem finds the chance that a prime divides ${mX}.` },
    checkFrom(zetaDivisible, { s: 2, a: 3, b: null }, t`The multiples ${math`${3}m`} carry ${math`\sum_{m} (${3}m)^{-${2}}/\zeta(${2}) = ${3}^{-${2}}`}.`),

    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`Half the values of a random positive integer are even, so ${math`\mathbb{P}(\text{even}) = \tfrac{${1}}{${2}}`}.`, counterexample: t`It depends on the masses. With ${math`p_{k} = (\tfrac{${1}}{${2}})^{k}`}, ${math`\mathbb{P}(\text{even}) = ${HALF_EVEN}`}. There is no "fair" distribution on the integers to make it ${q(1, 2)}.` },
    { kind: 'pitfall', claim: t`Any nonnegative numbers ${math`p_{\omega}`} define a probability.`, counterexample: t`${math`p_{k} = ${q(1, 2)}`} for every ${math`k \ge ${1}`} adds to infinity. The masses must add to exactly ${1}.` },
    { kind: 'pitfall', claim: t`A probability on an uncountable set, such as ${math`[${0}, ${1}]`}, is also fixed by point masses.`, counterexample: t`For a uniform point of ${math`[${0}, ${1}]`}, every single point has probability ${0}, but the whole interval has probability ${1}. Point masses only work on countable sets.` },
    { kind: 'takeaway', text: t`On a countable set, a probability is a list of nonnegative masses adding to ${1}, and the probability of any event is the sum of its masses.` },
  ],
  examples: [
    { ...workedCambridge(q13a), examiner: t`The examiner looks for the event written as the set of multiples ${math`pm`}, and ${math`p^{-s}`} factored out of the sum.` },
    worked(eventProbability, { r: q(1, 3), kind: 'even', m: 1 }, t`An even number of failures`),
    worked(normalise, { r: q(2, 3), m: 1 }, t`Normalising masses that start at ${1}`),
  ],
  generators: [normalise, eventProbability, zetaDivisible],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['point-mass', 'countable-probability-space'],
  claims,
  cambridge: withUses([q13b, q13proof, scheduleProof], {
    'ia-s2-q13-euler': { sections: ['Point masses', 'Adding masses'], note: t`Independent divisibility events and Euler's product` },
    'ia-s2-q13-coprime-six': { sections: ['Adding masses'], note: t`Adding point masses over multiples` },
  }),
  // The sheet's proof first, then its numbers with s = 2, which still need independence and complements.
  gate: ['ia-s2-q13-euler', 'ia-s2-q13-coprime-six'],
  recall: [
    { front: t`How is a probability on a countable set specified?`, back: t`By point masses ${math`p_{\omega} \ge ${0}`} adding to ${1}, with ${math`\mathbb{P}(A) = \sum_{\omega \in A} p_{\omega}`}.` },
    { front: t`Why is there no uniform distribution on ${math`\mathbb{N}`}?`, back: t`Equal masses add to ${0} or to infinity, never ${1}.` },
    { front: t`For ${math`\mathbb{P}(X = n) = n^{-s}/\zeta(s)`}, the chance a prime ${math`p`} divides ${mX}.`, back: t`${math`p^{-s}`}.` },
  ],
  proofOrder: [{
    title: t`Point masses give countable additivity`,
    steps: [
      t`Take disjoint events ${math`A_{${1}}, A_{${2}}, \ldots`}.`,
      t`The masses in the union form a nonnegative series.`,
      t`A nonnegative series may be grouped set by set without changing its sum.`,
      t`So ${math`\mathbb{P}(\bigcup A_{i}) = \sum_{i} \mathbb{P}(A_{i})`}.`,
    ],
  }],
};
