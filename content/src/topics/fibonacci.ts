/**
 * alg.fibonacci: the Fibonacci numbers, identities proved by induction (Cassini's identity,
 * F_(n+k) = F_k F_(n+1) + F_(k-1) F_n), and the closed form F_n = (phi^n - psi^n)/sqrt 5 from
 * the roots of x^2 = x + 1. From STEP Support Assignment 14, Q3 (2010 STEP II Q3) and
 * Assignment 20, Q3 (1996 STEP II Q3), checked against their hints and by computing the
 * sequence. The gate adds STEP Support STEP 2 Miscellaneous Q5 (2009 STEP II Q6) and STEP II
 * 2013 Q6(i), (ii) (STEP Questions Database).
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { int, pick } from '../math';
import { generator, type Misconception } from '../problem';
import { dmath, listOf, math, t } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const [mn, mk] = [math`n`, math`k`];
/** F_0, F_1, ..., F_n by the recurrence. */
const fibs = (n: number): number[] => {
  const f = [0, 1];
  while (f.length <= n) f.push((f[f.length - 1] as number) + (f[f.length - 2] as number));
  return f;
};
const F = (n: number): number => fibs(n)[n] as number;
const PHI = (1 + Math.sqrt(5)) / 2;
const PSI = (1 - Math.sqrt(5)) / 2;

// ---------------------------------------------------------------- generators

interface TermP { n: number }

const termGen = generator<TermP>({
  id: 'term',
  skill: 'Compute a Fibonacci number from F_0 = 0, F_1 = 1, F_(n+1) = F_n + F_(n-1).',
  quick: true,
  params: (rng) => ({ n: int(rng, 8, 24) }),
  sane: ({ n }) => (n >= 8 && n <= 24 ? null : 'out of range'),
  problem: ({ n }) => ({
    prompt: t`With ${math`F_{${0}} = ${0}`}, ${math`F_{${1}} = ${1}`} and ${math`F_{n + ${1}} = F_{n} + F_{n - ${1}}`}, find ${math`F_{${n}}`}.`,
    answer: { kind: 'exact', expected: String(F(n)) },
    solution: [
      t`Each term is the sum of the two before: ${math`${listOf(fibs(n).slice(0, 8))}, \ldots`}.`,
      t`Continuing, ${math`F_{${n - 2}} = ${F(n - 2)}`} and ${math`F_{${n - 1}} = ${F(n - 1)}`}, so ${math`F_{${n}} = ${F(n - 2)} + ${F(n - 1)} = ${F(n)}`}.`,
    ],
  }),
  solve: ({ n }) => String(Math.round((PHI ** n - PSI ** n) / Math.sqrt(5))),
  misconceptions: ({ n }): Misconception[] => [
    { response: String(F(n - 1)), why: t`That is ${math`F_{${n - 1}}`}: the count starts at ${math`F_{${0}} = ${0}`}, so check the index of each term you write.` },
    { response: String(F(n + 1)), why: t`That is ${math`F_{${n + 1}}`}, one term too far. ${math`F_{${1}}`} and ${math`F_{${2}}`} are both ${1}.` },
  ],
});

interface CassP { n: number }

const cassGen = generator<CassP>({
  id: 'cassini',
  skill: "Evaluate F_(n+1) F_(n-1) - F_n^2 = (-1)^n (Cassini's identity) and check it on a case.",
  params: (rng) => ({ n: int(rng, 3, 18) }),
  sane: ({ n }) => (n >= 3 && n <= 18 ? null : 'out of range'),
  problem: ({ n }) => {
    const v = F(n + 1) * F(n - 1) - F(n) ** 2;
    return {
      prompt: t`Find ${math`F_{${n + 1}}F_{${n - 1}} - F_{${n}}^{${2}}`}, where ${math`F_{${0}} = ${0}, F_{${1}} = ${1}`} are the Fibonacci numbers.`,
      answer: { kind: 'exact', expected: String(v) },
      solution: [
        t`${math`F_{${n - 1}} = ${F(n - 1)}`}, ${math`F_{${n}} = ${F(n)}`}, ${math`F_{${n + 1}} = ${F(n + 1)}`}. So ${math`${F(n + 1)} \times ${F(n - 1)} - ${F(n)}^{${2}} = ${F(n + 1) * F(n - 1)} - ${F(n) ** 2} = ${v}`}.`,
        t`This agrees with Cassini's identity, ${math`F_{n + ${1}}F_{n - ${1}} - F_{n}^{${2}} = (-${1})^{n}`}: ${mn} is ${n % 2 === 0 ? 'even' : 'odd'}.`,
      ],
    };
  },
  solve: ({ n }) => String((-1) ** n),
  misconceptions: ({ n }): Misconception[] => [
    { response: String(-((-1) ** n)), why: t`The sign is ${math`(-${1})^{n}`}: positive for even ${mn}, negative for odd. Recompute the two products carefully.` },
    { response: '0', why: t`The products differ by exactly one: neighbouring Fibonacci numbers never give ${math`F_{n + ${1}}F_{n - ${1}} = F_{n}^{${2}}`}.` },
  ],
});

interface SumP { n: number }

const sumGen = generator<SumP>({
  id: 'sum',
  skill: 'Sum the first n Fibonacci numbers: F_1 + ... + F_n = F_(n+2) - 1.',
  params: (rng) => ({ n: int(rng, 5, 20) }),
  sane: ({ n }) => (n >= 5 && n <= 20 ? null : 'out of range'),
  problem: ({ n }) => ({
    prompt: t`Find ${math`F_{${1}} + F_{${2}} + \cdots + F_{${n}}`}, where ${math`F_{${1}} = F_{${2}} = ${1}`} and each term is the sum of the two before.`,
    answer: { kind: 'exact', expected: String(F(n + 2) - 1) },
    solution: [
      t`Write each term as a difference: ${math`F_{i} = F_{i + ${2}} - F_{i + ${1}}`}. Adding for ${math`i = ${1}`} to ${n}, the sum telescopes to ${math`F_{${n + 2}} - F_{${2}} = F_{${n + 2}} - ${1}`}.`,
      t`${math`F_{${n + 2}} = ${F(n + 2)}`}, so the sum is ${F(n + 2) - 1}.`,
    ],
  }),
  solve: ({ n }) => String(fibs(n).slice(1).reduce((x, y) => x + y, 0)),
  misconceptions: ({ n }): Misconception[] => [
    { response: String(F(n + 2)), why: t`The telescoped sum is ${math`F_{${n + 2}} - F_{${2}}`}, and ${math`F_{${2}} = ${1}`}: subtract ${1}.` },
    { response: String(F(n + 1) - 1), why: t`The identity is ${math`F_{i} = F_{i + ${2}} - F_{i + ${1}}`}, so the last surviving term is ${math`F_{${n + 2}}`}.` },
  ],
});

interface LinP { r: number; s: number; a: number; b: number }
const ROOTS: readonly [number, number][] = [[2, 3], [2, -1], [3, -1], [1, 2], [3, 1], [-2, 1], [4, 1], [2, -3], [-1, 3]];

const linGen = generator<LinP>({
  id: 'closed-form',
  skill: 'Solve u_(n+2) = p u_(n+1) + q u_n by trying u_n = x^n: x^2 = px + q, then fit the first two terms.',
  params: (rng) => {
    const [r, s] = pick(rng, ROOTS);
    let a = int(rng, -3, 3);
    let b = int(rng, -3, 3);
    if (a === 0) a = 1;
    if (b === 0 || b === a) b = a + 1 === 0 ? 2 : a + 1;
    return { r, s, a, b };
  },
  sane: ({ r, s, a, b }) => (r !== s && a !== 0 && b !== 0 && a !== b ? null : 'distinct roots and coefficients'),
  problem: ({ r, s, a, b }) => {
    const [p, qq] = [r + s, -r * s];
    const u0 = a + b;
    const u1 = a * r + b * s;
    return {
      prompt: t`A sequence has ${math`u_{${0}} = ${u0}`}, ${math`u_{${1}} = ${u1}`} and ${math`u_{n + ${2}} = ${p === 1 ? '' : p === -1 ? '-' : p}u_{n + ${1}} ${qq < 0 ? '-' : '+'} ${Math.abs(qq) === 1 ? '' : Math.abs(qq)}u_{n}`}. Find a formula for ${math`u_{n}`}. (Type powers with a caret.)`,
      answer: { kind: 'expression', expected: `${a}*(${r})^n ${b < 0 ? '-' : '+'} ${Math.abs(b)}*(${s})^n`, variables: ['n'], domains: { n: { kind: 'integer', min: 0, max: 9 } } },
      solution: [
        t`Try ${math`u_{n} = x^{n}`}: ${math`x^{n + ${2}} = ${p}x^{n + ${1}} ${qq < 0 ? '-' : '+'} ${Math.abs(qq)}x^{n}`}, so ${math`x^{${2}} = ${p}x ${qq < 0 ? '-' : '+'} ${Math.abs(qq)}`}, with roots ${math`x = ${r}`} and ${math`x = ${s}`}.`,
        t`Any ${math`u_{n} = A(${r})^{n} + B(${s})^{n}`} satisfies the recurrence, because each power does and the recurrence is linear. Fit the first terms: ${math`A + B = ${u0}`} and ${math`${r}A ${s < 0 ? '-' : '+'} ${Math.abs(s)}B = ${u1}`}, giving ${math`A = ${a}`}, ${math`B = ${b}`}.`,
        t`So ${math`u_{n} = ${a}(${r})^{n} ${b < 0 ? '-' : '+'} ${Math.abs(b)}(${s})^{n}`}; the two sequences agree at ${math`n = ${0}, ${1}`} and obey the same recurrence, so they agree for every ${mn}.`,
      ],
    };
  },
  solve: ({ r, s, a, b }) => {
    // Fit A, B from u_0, u_1 by solving the 2 x 2 system.
    const u0 = a + b;
    const u1 = a * r + b * s;
    const B = (u1 - r * u0) / (s - r);
    const A = u0 - B;
    return `${A}*(${r})^n + ${B}*(${s})^n`;
  },
  misconceptions: ({ r, s, a, b }): Misconception[] => [
    { response: `${b}*(${r})^n + ${a}*(${s})^n`, why: t`The coefficients are attached to the wrong roots. Check ${math`u_{${1}}`}: ${math`A`} goes with ${math`(${r})^{n}`}.` },
    { response: `${a}*(${-r})^n + ${b}*(${-s})^n`, why: t`The characteristic equation is ${math`x^{${2}} - px - q = ${0}`}; its roots here are ${r} and ${s}, not their negatives.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const F14 = 'step-f14';
const F20 = 'step-f20';

const a20cass = auto({
  id: 'a20-q3-cassini',
  source: cite(F20, 'Assignment 20, Q3'),
  title: t`Guess and prove a Fibonacci identity`,
  prompt: t`The Fibonacci numbers satisfy ${math`F_{${0}} = ${0}`}, ${math`F_{${1}} = ${1}`} and ${math`F_{n + ${1}} = F_{n} + F_{n - ${1}}`} for ${math`n \ge ${1}`}. Compute ${math`F_{n + ${1}}F_{n - ${1}} - F_{n}^{${2}}`} for a few values of ${mn}, and find the general formula, in terms of ${mn}, that the values suggest.`,
  answer: { kind: 'expression', expected: '(-1)^n', variables: ['n'], domains: { n: { kind: 'integer', min: 1, max: 20 } } },
  solution: [
    t`Tabulate: ${math`n = ${1}`}: ${math`F_{${2}}F_{${0}} - F_{${1}}^{${2}} = ${0} - ${1} = -${1}`}. ${math`n = ${2}`}: ${math`${2} \times ${1} - ${1} = ${1}`}. ${math`n = ${3}`}: ${math`${3} \times ${1} - ${4} = -${1}`}. ${math`n = ${4}`}: ${math`${5} \times ${2} - ${9} = ${1}`}. Guess: ${math`(-${1})^{n}`}.`,
    t`Proof by induction. True for ${math`n = ${1}`}. Assume ${math`F_{k + ${1}}F_{k - ${1}} - F_{k}^{${2}} = (-${1})^{k}`}. Using the recurrence twice, ${math`F_{k + ${2}}F_{k} - F_{k + ${1}}^{${2}} = (F_{k + ${1}} + F_{k})F_{k} - F_{k + ${1}}(F_{k} + F_{k - ${1}}) = F_{k}^{${2}} - F_{k + ${1}}F_{k - ${1}}`}.`,
    t`That is ${math`-\left(F_{k + ${1}}F_{k - ${1}} - F_{k}^{${2}}\right) = -(-${1})^{k} = (-${1})^{k + ${1}}`}, the case ${math`k + ${1}`}. So the formula holds for every ${math`n \ge ${1}`}.`,
    t`Tabulate small cases, guess, then prove by induction.`,
  ],
  nudge: t`Not quite. Compute the expression for ${math`n = ${1}, ${2}, ${3}, ${4}`} and watch the sign.`,
  hints: [
    t`What is ${math`F_{${2}}F_{${0}} - F_{${1}}^{${2}}`}?`,
    t`What are the values for ${math`n = ${2}`}, ${3}, and ${4}?`,
    t`Which simple expression in ${mn} produces that pattern of values?`,
  ],
  reference: '(-1)^n',
  verify: () => {
    for (let n = 1; n <= 30; n++) { const e = same(`n = ${n}`, F(n + 1) * F(n - 1) - F(n) ** 2, (-1) ** n); if (e !== null) return e; }
    return null;
  },
  misconceptions: [
    { response: '(-1)^(n + 1)', why: t`Check ${math`n = ${1}`}: ${math`F_{${2}}F_{${0}} - F_{${1}}^{${2}} = -${1}`}, which is ${math`(-${1})^{${1}}`}.` },
    { response: '1', why: t`The value alternates: ${math`-${1}`} at ${math`n = ${1}`}, ${1} at ${math`n = ${2}`}.` },
  ],
  official: { source: cite('step-f20-hints', 'Assignment 20, Q3'), answer: '(-1)^n', agrees: true },
});

const a20f7 = auto({
  id: 'a20-q3-f7',
  source: cite(F20, 'Assignment 20, Q3'),
  title: t`The first Fibonacci numbers`,
  prompt: t`With ${math`F_{${0}} = ${0}`}, ${math`F_{${1}} = ${1}`} and ${math`F_{n + ${1}} = F_{n} + F_{n - ${1}}`}, compute ${math`F_{${7}}`}.`,
  answer: { kind: 'exact', expected: String(F(7)) },
  solution: [
    t`${math`F_{${2}} = F_{${1}} + F_{${0}} = ${1}`}, ${math`F_{${3}} = ${2}`}, ${math`F_{${4}} = ${3}`}, ${math`F_{${5}} = ${5}`}, ${math`F_{${6}} = ${8}`}, ${math`F_{${7}} = ${5} + ${8} = ${13}`}.`,
    t`Index carefully: the count starts at ${math`F_{${0}}`}.`,
  ],
  nudge: t`Not quite. Write the terms out one by one, starting from ${math`F_{${0}} = ${0}`}.`,
  hints: [
    t`What are ${math`F_{${2}}`}, ${math`F_{${3}}`}, and ${math`F_{${4}}`}?`,
    t`What are ${math`F_{${5}}`} and ${math`F_{${6}}`}?`,
    t`Which two terms add to give ${math`F_{${7}}`}?`,
  ],
  reference: '13',
  verify: () => same('F_7', F(7), 13),
  misconceptions: [{ response: '8', why: t`That is ${math`F_{${6}}`}. Count from ${math`F_{${0}} = ${0}`}.` }],
  official: { source: cite('step-f20-hints', 'Assignment 20, Q3'), answer: '13', agrees: true },
});

const a20sup = supervision({
  id: 'a20-q3-addition',
  source: cite(F20, 'Assignment 20, Q3'),
  title: t`The addition formula`,
  prompt: t`(${1996} STEP II, Question ${3}, last part.) By induction on ${mk}, or otherwise, show that ${math`F_{n + k} = F_{k}F_{n + ${1}} + F_{k - ${1}}F_{n}`} for all positive integers ${mn} and ${mk}. State which base cases the induction needs, and why.`,
  writeUp: 'proof',
  hints: [
    t`What does the formula say when ${math`k = ${1}`}, and when ${math`k = ${2}`}?`,
    t`If the formula holds for ${mk} and ${math`k - ${1}`}, how does adding the two cases give it for ${math`k + ${1}`}?`,
    t`Since the step uses two earlier cases, how many base cases must be checked directly?`,
  ],
  official: cite('step-f20-hints', 'Assignment 20, Q3'),
});

const a14i = auto({
  id: 'a14-q3-i',
  source: cite(F14, 'Assignment 14, Q3(i)'),
  title: t`The two roots`,
  prompt: t`The sequence ${math`F_{${0}} = ${0}, F_{${1}} = ${1}, F_{${2}} = ${1}, F_{${3}} = ${2}`} has general term ${math`F_{n} = a\lambda^{n} + b\mu^{n}`}, where ${math`a, b, \lambda, \mu`} do not depend on ${mn} and ${math`a > ${0}`}. One can show ${math`\lambda + \mu = ${1}`} and ${math`\lambda^{${2}} + \lambda\mu + \mu^{${2}} = ${2}`}. Find ${math`\lambda`}. (Type a square root as sqrt(${5}).)`,
  answer: { kind: 'expression', expected: '(1 + sqrt(5))/2', variables: [] },
  solution: [
    t`${math`F_{${0}} = ${0}`} gives ${math`a + b = ${0}`}, so ${math`F_{n} = a(\lambda^{n} - \mu^{n})`}. Then ${math`a(\lambda - \mu) = ${1}`}, and since ${math`a > ${0}`}, ${math`\lambda > \mu`}.`,
    t`Substitute ${math`\mu = ${1} - \lambda`} into ${math`\lambda^{${2}} + \lambda\mu + \mu^{${2}} = ${2}`}: ${math`\lambda^{${2}} + \lambda - \lambda^{${2}} + ${1} - ${2}\lambda + \lambda^{${2}} = ${2}`}, that is ${math`\lambda^{${2}} - \lambda - ${1} = ${0}`}.`,
    t`So ${math`\lambda = \frac{${1} \pm \sqrt{${5}}}{${2}}`}, and as ${math`\lambda > \mu`} take the larger: ${math`\lambda = \frac{${1} + \sqrt{${5}}}{${2}}`}, ${math`\mu = \frac{${1} - \sqrt{${5}}}{${2}}`}, ${math`a = \frac{${1}}{\sqrt{${5}}}`}, ${math`b = -\frac{${1}}{\sqrt{${5}}}`}.`,
    t`Eliminate one unknown, solve the quadratic, then use the given sign to pick the root.`,
  ],
  nudge: t`Not quite. Eliminate ${math`\mu`} first, then use ${math`a > ${0}`} to choose the root.`,
  hints: [
    t`Substituting ${math`\mu = ${1} - \lambda`}, which quadratic does ${math`\lambda`} satisfy?`,
    t`What are the two roots of that quadratic?`,
    t`From ${math`F_{${0}} = ${0}`} and ${math`F_{${1}} = ${1}`}, what is ${math`a(\lambda - \mu)`}, and so which root is ${math`\lambda`}?`,
  ],
  reference: '(1 + sqrt(5))/2',
  verify: () => {
    for (let n = 0; n <= 30; n++) if (Math.abs((PHI ** n - PSI ** n) / Math.sqrt(5) - F(n)) > 1e-6) return `n = ${n}`;
    return null;
  },
  misconceptions: [
    { response: '(1 - sqrt(5))/2', why: t`That is ${math`\mu`}. Since ${math`a > ${0}`} and ${math`a(\lambda - \mu) = F_{${1}} = ${1}`}, ${math`\lambda`} is the larger root.` },
    { response: '(-1 + sqrt(5))/2', why: t`The roots of ${math`\lambda^{${2}} - \lambda - ${1} = ${0}`} are ${math`\frac{${1} \pm \sqrt{${5}}}{${2}}`}; check the sign of the middle term.` },
  ],
  official: { source: cite('step-f14-hints', 'Assignment 14, Q3(i)'), answer: '(1 + sqrt(5))/2', agrees: true },
});

const a14ii = auto({
  id: 'a14-q3-ii',
  source: cite(F14, 'Assignment 14, Q3(ii)'),
  title: t`${math`F_{${6}}`} from the formula`,
  prompt: t`Use ${math`F_{n} = \frac{${1}}{\sqrt{${5}}}\left(\lambda^{n} - \mu^{n}\right)`}, with ${math`\lambda, \mu = \frac{${1} \pm \sqrt{${5}}}{${2}}`}, to evaluate ${math`F_{${6}}`}, using the formula rather than the recurrence.`,
  answer: { kind: 'exact', expected: '8' },
  solution: [
    t`${math`F_{${6}} = \frac{${1}}{\sqrt{${5}} \cdot ${2}^{${6}}}\left((${1} + \sqrt{${5}})^{${6}} - (${1} - \sqrt{${5}})^{${6}}\right)`}.`,
    t`By the binomial theorem the even powers of ${math`\sqrt{${5}}`} cancel and the odd ones double: ${math`${2}\left(\binom{${6}}{${1}}\sqrt{${5}} + \binom{${6}}{${3}}${5}\sqrt{${5}} + \binom{${6}}{${5}}${25}\sqrt{${5}}\right) = ${2}\sqrt{${5}}(${6} + ${100} + ${150}) = ${512}\sqrt{${5}}`}.`,
    t`So ${math`F_{${6}} = \frac{${512}\sqrt{${5}}}{${64}\sqrt{${5}}} = ${8}`}, as the recurrence also gives.`,
    t`In a binomial expansion of conjugates, the even powers of the surd cancel.`,
  ],
  nudge: t`Not quite. Expand both sixth powers with the binomial theorem; most terms cancel.`,
  hints: [
    t`With ${math`\lambda = \frac{${1} + \sqrt{${5}}}{${2}}`}, how does ${math`\lambda^{${6}} - \mu^{${6}}`} look with the ${math`${2}^{${6}}`} taken out?`,
    t`In ${math`(${1} + \sqrt{${5}})^{${6}} - (${1} - \sqrt{${5}})^{${6}}`}, which binomial terms cancel and which double?`,
    t`What do the surviving terms add to, and what is left after dividing by ${math`\sqrt{${5}}`} and ${math`${2}^{${6}}`}?`,
  ],
  reference: '8',
  verify: () => same('F_6 by the formula', Math.round((PHI ** 6 - PSI ** 6) / Math.sqrt(5)), 8),
  misconceptions: [{ response: '13', why: t`That is ${math`F_{${7}}`}. With ${math`F_{${0}} = ${0}`}, the sixth term after it is ${8}.` }],
  official: { source: cite('step-f14-hints', 'Assignment 14, Q3(ii)'), answer: '8', agrees: true },
});

// STEP 2 Miscellaneous Q5 (2009 S2 Q6) and STEP II 2013 Q6(i), (ii) (STEP Questions Database).
const MISC = 'step-s2-misc' as const;
const MISCS = 'step-s2-misc-solutions' as const;
const DB13 = 'stepdb-13-s2' as const;

const misc5 = supervision({
  id: 's2misc-q5',
  source: cite(MISC, 'Q5 (2009 STEP II Q6)'),
  title: t`The sum of the reciprocal Fibonacci numbers`,
  prompt: t`The Fibonacci sequence ${math`F_{${1}}, F_{${2}}, F_{${3}}, \ldots`} is defined by ${math`F_{${1}} = ${1}`}, ${math`F_{${2}} = ${1}`} and ${math`F_{n + ${1}} = F_{n} + F_{n - ${1}}`} ${math`(n \ge ${2})`}. Write down the values of ${math`F_{${3}}, F_{${4}}, \ldots, F_{${10}}`}. Let ${math`S = \sum_{i = ${1}}^{\infty} \frac{${1}}{F_{i}}`}. (i) Show that ${math`\frac{${1}}{F_{i}} > \frac{${1}}{${2}F_{i - ${1}}}`} for ${math`i \ge ${4}`} and deduce that ${math`S > ${3}`}. Show also that ${math`S < ${3}\tfrac{${2}}{${3}}`}. (ii) Show further that ${math`${3.2} < S < ${3.5}`}.`,
  writeUp: 'proof',
  hints: [
    t`For ${math`i \ge ${4}`}, why is ${math`F_{i} < ${2}F_{i - ${1}}`}, and what lower bound does comparison with a geometric series then give for ${math`S`}?`,
    t`For an upper bound, how does ${math`F_{i}`} compare with ${math`F_{i - ${1}}`} plus a fraction of it, giving a geometric series that is larger?`,
    t`For (ii), which first few terms should be added exactly before the geometric bounds are applied to the rest?`,
  ],
  official: cite(MISCS, 'Q5'),
});

const db13q6 = supervision({
  id: 'step13-q6',
  source: cite(DB13, 'Q6(i), (ii)'),
  title: t`The ratios of neighbours stay between one and two`,
  prompt: t`The sequence ${math`u_{${1}}, u_{${2}}, \ldots`} is defined by ${math`u_{${1}} = ${1}`} and ${dmath`u_{n + ${1}} = ${1} + \frac{${1}}{u_{n}} \qquad (n \ge ${1}). \qquad (*)`} (i) Show that, for ${math`n \ge ${3}`}, ${dmath`u_{n + ${2}} - u_{n} = \frac{u_{n} - u_{n - ${2}}}{(${1} + u_{n})(${1} + u_{n - ${2}})}.`} (ii) Prove, by induction or otherwise, that ${math`${1} \le u_{n} \le ${2}`} for all ${math`n`}.`,
  writeUp: 'proof',
  hints: [
    t`Applying ${math`(*)`} twice, what is ${math`u_{n + ${2}}`} in terms of ${math`u_{n}`}?`,
    t`With that expression, how does ${math`u_{n + ${2}} - u_{n}`} combine over a common denominator?`,
    t`For (ii), if ${math`${1} \le u_{n} \le ${2}`}, what bounds does ${math`(*)`} give on ${math`u_{n + ${1}}`}?`,
  ],
});

// ---------------------------------------------------------------- lesson

const FIRST = fibs(5);

export const fibonacci: TopicContent = {
  topicId: 'alg.fibonacci',
  goal: t`Prove identities about ${math`F_{n}`} by induction, and derive ${math`F_{n} = \frac{\varphi^{n} - \psi^{n}}{\sqrt{${5}}}`} from the roots of ${math`x^{${2}} = x + ${1}`}.`,
  objective: t`Prove Fibonacci identities by induction and derive the closed form for the nth term.`,
  why: t`Fibonacci questions are a STEP staple, and the method solves every linear recurrence.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`Each term from the two before` },
    { kind: 'hook', text: t`Start with ${0} and ${1}, and keep adding the last two numbers: ${math`${listOf(FIRST)}, \ldots`}. Every term is a whole number. Yet the formula for the ${mn}th term involves ${math`\sqrt{${5}}`}, an irrational number. How can that be?` },
    {
      kind: 'definition',
      name: t`Fibonacci numbers`,
      formal: t`The [[fibonacci-numbers|Fibonacci numbers]] are defined by ${math`F_{${0}} = ${0}`}, ${math`F_{${1}} = ${1}`}, and ${math`F_{n + ${1}} = F_{n} + F_{n - ${1}}`} for ${math`n \ge ${1}`}.`,
      plain: t`Two starting values, then each term is the sum of the previous two: ${math`F_{${2}} = ${1}`}, ${math`F_{${3}} = ${2}`}, ${math`F_{${5}} = ${5}`}, ${math`F_{${10}} = ${55}`}. Because each term needs two before it, induction proofs about ${math`F_{n}`} often need two base cases.`,
    },
    { kind: 'section', title: t`An identity by induction` },
    { kind: 'narrative', text: t`Multiply neighbours on either side of a term and compare with its square: ${math`F_{${3}}F_{${1}} - F_{${2}}^{${2}} = ${2} - ${1} = ${1}`}, ${math`F_{${4}}F_{${2}} - F_{${3}}^{${2}} = ${3} - ${4} = -${1}`}, ${math`F_{${5}}F_{${3}} - F_{${4}}^{${2}} = ${10} - ${9} = ${1}`}. Always ${math`\pm ${1}`}, alternating.` },
    { kind: 'theorem', name: t`Cassini's identity`, statement: t`For every integer ${math`n \ge ${1}`}, ${math`F_{n + ${1}}F_{n - ${1}} - F_{n}^{${2}} = (-${1})^{n}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Base case`, text: t`${math`n = ${1}`}: ${math`F_{${2}}F_{${0}} - F_{${1}}^{${2}} = ${1} \times ${0} - ${1} = -${1} = (-${1})^{${1}}`}.` },
        { label: t`Assume for k`, text: t`Suppose ${math`F_{k + ${1}}F_{k - ${1}} - F_{k}^{${2}} = (-${1})^{k}`} for some ${math`k \ge ${1}`}.` },
        { label: t`Expand with the recurrence`, text: t`Replace ${math`F_{k + ${2}}`} by ${math`F_{k + ${1}} + F_{k}`} and one factor ${math`F_{k + ${1}}`} by ${math`F_{k} + F_{k - ${1}}`}:`, eq: [dmath`F_{k + ${2}}F_{k} - F_{k + ${1}}^{${2}} = (F_{k + ${1}} + F_{k})F_{k} - F_{k + ${1}}(F_{k} + F_{k - ${1}}) = F_{k}^{${2}} - F_{k + ${1}}F_{k - ${1}}.`] },
        { label: t`Use the assumption`, text: t`The right side is ${math`-\left(F_{k + ${1}}F_{k - ${1}} - F_{k}^{${2}}\right) = -(-${1})^{k} = (-${1})^{k + ${1}}`}: the case ${math`k + ${1}`}. By induction the identity holds for all ${math`n \ge ${1}`}.` },
      ],
    },
    checkFrom(cassGen, { n: 9 }, t`${math`F_{${10}}F_{${8}} - F_{${9}}^{${2}} = ${55} \times ${21} - ${1156} = -${1} = (-${1})^{${9}}`}.`),
    { kind: 'section', title: t`The closed form` },
    { kind: 'narrative', text: t`Geometric sequences ${math`x^{n}`} are easy; does any of them obey the Fibonacci rule? We need ${math`x^{n + ${1}} = x^{n} + x^{n - ${1}}`}, and dividing by ${math`x^{n - ${1}}`} gives ${math`x^{${2}} = x + ${1}`}. Two numbers work: the roots of that quadratic. Then mix them to match the starting values.` },
    {
      kind: 'definition',
      name: t`Golden ratio`,
      formal: t`The roots of ${math`x^{${2}} = x + ${1}`} are ${math`\varphi = \frac{${1} + \sqrt{${5}}}{${2}}`}, the [[golden-ratio|golden ratio]], and ${math`\psi = \frac{${1} - \sqrt{${5}}}{${2}}`}. They satisfy ${math`\varphi + \psi = ${1}`}, ${math`\varphi\psi = -${1}`}, ${math`\varphi - \psi = \sqrt{${5}}`}.`,
      plain: t`${math`\varphi`} is about ${math`${1}.${618}`} and ${math`\psi`} about ${math`-${0}.${618}`}. The sum and product come from the quadratic ${math`x^{${2}} - x - ${1}`}: the roots add to ${1} and multiply to ${math`-${1}`}.`,
    },
    { kind: 'theorem', name: t`Binet's formula`, statement: t`For every integer ${math`n \ge ${0}`}, ${math`F_{n} = \frac{\varphi^{n} - \psi^{n}}{\sqrt{${5}}}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Each power obeys the rule`, text: t`Since ${math`\varphi^{${2}} = \varphi + ${1}`}, multiplying by ${math`\varphi^{n - ${1}}`} gives ${math`\varphi^{n + ${1}} = \varphi^{n} + \varphi^{n - ${1}}`}; the same for ${math`\psi`}.` },
        { label: t`So does any mixture`, text: t`For constants ${math`a, b`}, ${math`G_{n} = a\varphi^{n} + b\psi^{n}`} satisfies ${math`G_{n + ${1}} = G_{n} + G_{n - ${1}}`}: multiply the rule for ${math`\varphi`} by ${math`a`}, the rule for ${math`\psi`} by ${math`b`}, and add.` },
        { label: t`Match the start`, text: t`${math`G_{${0}} = a + b = ${0}`} and ${math`G_{${1}} = a\varphi + b\psi = ${1}`}. So ${math`b = -a`} and ${math`a(\varphi - \psi) = ${1}`}, giving ${math`a = \frac{${1}}{\sqrt{${5}}}`}, ${math`b = -\frac{${1}}{\sqrt{${5}}}`}.` },
        { label: t`Same start, same rule, same sequence`, text: t`${math`G_{n}`} and ${math`F_{n}`} agree at ${math`n = ${0}`} and ${math`n = ${1}`}, and each later term of both is the sum of the two before. By strong induction they agree for every ${math`n \ge ${0}`}.`, why: { q: t`Why two base cases?`, a: t`The step from ${math`n - ${1}`} and ${mn} to ${math`n + ${1}`} uses two earlier terms, so the induction must start with two known terms.` } },
      ],
    },
    { kind: 'p', text: t`The surds always cancel, which answers the hook. And since ${math`|\psi| < ${1}`}, the correction ${math`\frac{\psi^{n}}{\sqrt{${5}}}`} is at most ${math`\frac{${1}}{\sqrt{${5}}}`} in size, which is less than ${math`\frac{${1}}{${2}}`} because ${math`\sqrt{${5}} > ${2}`}. So ${math`F_{n}`} is the whole number nearest to ${math`\frac{\varphi^{n}}{\sqrt{${5}}}`}. And as ${math`\psi^{n} \to ${0}`}, ${math`\frac{F_{n + ${1}}}{F_{n}} \to \varphi`}.` },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`To prove ${math`F_{n} < ${2}^{n - ${1}}`} for ${math`n \ge ${2}`} by induction, one base case, ${math`n = ${2}`}, is enough.`, counterexample: t`The step ${math`F_{k + ${1}} = F_{k} + F_{k - ${1}} < ${2}^{k - ${1}} + ${2}^{k - ${2}}`} uses the claim at ${mk} and at ${math`k - ${1}`}. From ${math`n = ${2}`} alone the step to ${math`n = ${3}`} needs ${math`n = ${1}`}, where ${math`F_{${1}} = ${1}`} is not less than ${math`${2}^{${0}} = ${1}`}. Check ${math`n = ${2}`} and ${math`n = ${3}`}, then step.` },
    { kind: 'pitfall', claim: t`The solution of ${math`u_{n + ${1}} = u_{n} + u_{n - ${1}}`} is ${math`u_{n} = \frac{\varphi^{n} - \psi^{n}}{\sqrt{${5}}}`}.`, counterexample: t`Only with ${math`u_{${0}} = ${0}`}, ${math`u_{${1}} = ${1}`}. With ${math`u_{${0}} = ${2}`}, ${math`u_{${1}} = ${1}`} (the Lucas numbers) the solution is ${math`\varphi^{n} + \psi^{n}`}. The recurrence fixes the roots; the starting values fix the constants.` },
    { kind: 'takeaway', text: t`For Fibonacci-type sequences, prove identities by induction with the recurrence, and find closed forms from the roots of ${math`x^{${2}} = x + ${1}`} fitted to the first two terms.` },
  ],
  examples: [
    workedCambridge(a20cass),
    worked(linGen, { r: 2, s: 3, a: 1, b: 2 }, t`A recurrence with roots ${2} and ${3}`),
    worked(sumGen, { n: 10 }, t`Summing by telescoping`),
  ],
  generators: [termGen, cassGen, sumGen, linGen],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['fibonacci-numbers', 'golden-ratio'],
  cambridge: withUses([misc5, db13q6, a14i, a20sup, a14ii, a20f7], {
    's2misc-q5': { sections: ['Each term from the two before', 'The closed form'], note: t`Bounding a series of reciprocals by geometric series` },
    'step13-q6': { sections: ['An identity by induction'], note: t`An identity for a recurrence, then bounds by induction` },
    'a20-q3-addition': { sections: ['An identity by induction'], note: t`The addition formula by induction, with the base cases it needs` },
  }),
  // Best first: 2009 STEP II Q6 (the reciprocal sum, with official solutions), 2013 STEP II
  // Q6(i), (ii) (part (iii) needs limits of sequences, not a prerequisite), then Assignment 20 Q3.
  gate: ['s2misc-q5', 'step13-q6', 'a20-q3-addition'],
  recall: [
    { front: t`State Cassini's identity.`, back: t`${math`F_{n + ${1}}F_{n - ${1}} - F_{n}^{${2}} = (-${1})^{n}`} for ${math`n \ge ${1}`}.` },
    { front: t`State Binet's formula, and where ${math`\varphi`}, ${math`\psi`} come from.`, back: t`${math`F_{n} = \frac{\varphi^{n} - \psi^{n}}{\sqrt{${5}}}`}, with ${math`\varphi, \psi = \frac{${1} \pm \sqrt{${5}}}{${2}}`} the roots of ${math`x^{${2}} = x + ${1}`}.` },
  ],
  proofOrder: [
    {
      title: t`Cassini's identity by induction`,
      steps: [
        t`Check ${math`n = ${1}`}: ${math`F_{${2}}F_{${0}} - F_{${1}}^{${2}} = -${1}`}.`,
        t`Assume ${math`F_{k + ${1}}F_{k - ${1}} - F_{k}^{${2}} = (-${1})^{k}`}.`,
        t`Expand ${math`F_{k + ${2}}F_{k} - F_{k + ${1}}^{${2}}`} with the recurrence to get ${math`F_{k}^{${2}} - F_{k + ${1}}F_{k - ${1}}`}.`,
        t`That is ${math`-(-${1})^{k} = (-${1})^{k + ${1}}`}, so the identity passes to ${math`k + ${1}`}.`,
      ],
    },
  ],
};
