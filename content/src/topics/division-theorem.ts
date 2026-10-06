/**
 * num.division-theorem: for every natural number m and positive n there are unique q and
 * r with m = q n + r and 0 <= r < n. The lesson follows the CST notes (printed pages 176 to
 * 187: Theorem 54, Definition 55 of quo and rem, Lemma 56 for uniqueness, the division
 * algorithm in ML with its invariant, Theorem 57, Proposition 58, and Corollary 59, the
 * least residue [k]_m of a negative k) and Book of Proof Section 1.9 (Fact 1.5, existence
 * from the well-ordering principle, with a = 17 and b = 3). The problems add the 2023-24
 * official solution to supervision exercise 2.1.3 and Book of Proof Chapter 7, exercise 28.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, upTo } from '../math';
import { mod } from '../numbers';
import { generator, type Misconception } from '../problem';
import { listOf, math, paren, t } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';

const [mm, mn, mq, mr] = [math`m`, math`n`, math`q`, math`r`];
const big = (v: { num: bigint; den: bigint } | undefined): number | null => (v === undefined || v.den !== 1n ? null : Number(v.num));

// ---------------------------------------------------------------- quotient and remainder

interface QRP { a: number; b: number }

const quoRem = generator<QRP>({
  id: 'quo-rem',
  skill: 'Divide an integer, positive or negative, by a positive integer: find the unique q and r with a = q b + r and 0 <= r < b.',
  params: (rng) => {
    for (;;) {
      const b = int(rng, 2, 25);
      const a = int(rng, -200, 400);
      if (a % b !== 0) return { a, b };
    }
  },
  sane: ({ a, b }) => (b >= 2 && a % b !== 0 ? null : 'out of range'),
  problem: ({ a, b }) => {
    const qv = Math.floor(a / b);
    const rv = a - qv * b;
    return {
      prompt: t`Divide ${a} by ${b}: find the integers ${mq} and ${mr} with ${math`${paren(a)} = q \times ${b} + r`} and ${math`${0} \le r < ${b}`}.`,
      answer: {
        kind: 'witness', count: 2, names: ['q', 'r'], example: `q = ${qv}, r = ${rv}`,
        check: ([x, y]) => {
          const [qq, rr] = [big(x), big(y)];
          if (qq === null || rr === null) return 'Give two integers.';
          if (qq * b + rr !== a) return `${qq} × ${b} + ${rr} is ${qq * b + rr}, not ${a}.`;
          return rr >= 0 && rr < b ? null : `The remainder must be between 0 and ${b - 1}; ${rr} is not.`;
        },
      },
      solution: a >= 0
        ? [t`${math`${b} \times ${qv} = ${b * qv}`} is the largest multiple of ${b} not above ${a}, so ${math`q = ${qv}`} and ${math`r = ${a} - ${b * qv} = ${rv}`}.`]
        : [
          t`For a negative number, ${mq} is the largest integer with ${math`q \times ${b} \le ${a}`}: ${math`${qv} \times ${b} = ${qv * b}`}, which is below ${a}, while ${math`${qv + 1} \times ${b} = ${(qv + 1) * b}`} is above it.`,
          t`So ${math`q = ${qv}`} and ${math`r = ${paren(a)} - (${qv * b}) = ${rv}`}, which is between ${0} and ${b - 1} as required.`,
        ],
    };
  },
  solve: ({ a, b }) => {
    // Search the remainders 0..b-1 for the one that makes a - r a multiple of b.
    const rv = upTo(b).map((x) => x - 1).find((x) => (a - x) % b === 0) as number;
    return `q = ${(a - rv) / b}, r = ${rv}`;
  },
  misconceptions: ({ a, b }): Misconception[] => {
    const qv = Math.floor(a / b);
    const rv = a - qv * b;
    const out: Misconception[] = [
      { response: `q = ${qv + 1}, r = ${rv - b}`, why: t`That makes ${math`a = qb + r`} true, but ${math`r = ${rv - b}`} is negative. The remainder must satisfy ${math`${0} \le r < ${b}`}.` },
      { response: `q = ${qv - 1}, r = ${rv + b}`, why: t`That makes ${math`a = qb + r`} true, but ${math`r = ${rv + b}`} is not less than ${b}: one more ${b} fits.` },
    ];
    if (a < 0) out.push({ response: `q = ${Math.trunc(a / b)}, r = ${a - Math.trunc(a / b) * b}`, why: t`Rounding the quotient toward zero, as many programming languages do, leaves a negative remainder. The theorem's ${mq} rounds down.` });
    return out;
  },
});

// ---------------------------------------------------------------- the division algorithm, traced

interface TraceP { m: number; n: number }

const divalgTrace = generator<TraceP>({
  id: 'divalg-trace',
  skill: 'Trace the notes\' division algorithm, which subtracts n while r >= n, keeping the invariant m = q n + r: count its calls and read off what it returns.',
  params: (rng) => ({ m: int(rng, 15, 80), n: int(rng, 3, 12) }),
  sane: ({ m, n }) => (m >= n && n >= 3 ? null : 'out of range'),
  problem: ({ m, n }) => {
    const qv = Math.floor(m / n);
    const rv = m % n;
    return {
      prompt: t`The notes' algorithm: ${math`\mathrm{divalg}(m, n)`} calls ${math`\mathrm{diviter}(${0}, m)`}, and ${math`\mathrm{diviter}(q, r)`} returns ${math`(q, r)`} if ${math`r < n`}, otherwise calls ${math`\mathrm{diviter}(q + ${1}, r - n)`}. For ${math`m = ${m}`} and ${math`n = ${n}`}, how many calls of ${math`\mathrm{diviter}`} are made in all, and what pair does it return?`,
      answer: {
        kind: 'table', cell: 'exact',
        columns: [t`quantity`, t`value`],
        rows: [[t`calls of ${math`\mathrm{diviter}`}`, null], [t`${mq} returned`, null], [t`${mr} returned`, null]],
        expected: [String(qv + 1), String(qv), String(rv)],
      },
      solution: [
        t`The calls are ${math`(${0}, ${m})`}, ${math`(${1}, ${m - n})`}, and so on, subtracting ${n} each time. Every call keeps the invariant ${math`${m} = q \times ${n} + r`}.`,
        t`The last call is ${math`(${qv}, ${rv})`}, where ${math`${rv} < ${n}`}: that is the result, after ${qv} subtractions, so ${qv + 1} calls in all counting the first.`,
      ],
    };
  },
  solve: ({ m, n }) => {
    // Run the algorithm.
    let [qq, rr, calls] = [0, m, 1];
    while (rr >= n) { qq++; rr -= n; calls++; }
    return [String(calls), String(qq), String(rr)];
  },
  misconceptions: ({ m, n }): Misconception[] => {
    const qv = Math.floor(m / n);
    const rv = m % n;
    return [
      { response: [String(qv), String(qv), String(rv)], why: t`Count the first call, ${math`\mathrm{diviter}(${0}, ${m})`}, as well: there is one call more than the number of subtractions.` },
      { response: [String(qv + 2), String(qv + 1), String(rv - n)], why: t`The algorithm stops as soon as ${math`r < n`}; it never makes ${mr} negative.` },
      { response: [String(qv + 1), String(rv), String(qv)], why: t`The pair is ${math`(q, r)`}, quotient first.` },
    ];
  },
});

// ---------------------------------------------------------------- the least residue of a negative number

interface ResP { k: number; m: number }

const leastResidue = generator<ResP>({
  id: 'least-residue',
  skill: 'Find [k]_m, the unique integer from 0 to m - 1 congruent to k mod m, for a negative k (Corollary 59 of the notes).',
  params: (rng) => {
    for (;;) {
      const m = int(rng, 3, 13);
      const k = -int(rng, 1, 200);
      if (k % m !== 0) return { k, m };
    }
  },
  sane: ({ k, m }) => (k < 0 && k % m !== 0 ? null : 'out of range'),
  problem: ({ k, m }) => {
    const v = mod(k, m);
    const a = Math.abs(k);
    return {
      prompt: t`Find ${math`[${k}]_{${m}}`}: the integer ${mr} with ${math`${0} \le r < ${m}`} and ${math`${k} \equiv r \pmod{${m}}`}.`,
      answer: { kind: 'exact', expected: String(v) },
      solution: [
        t`The notes add a multiple of ${m} large enough to make it a natural number: ${math`${k} + ${a} \times ${m} = ${k + a * m}`}, which is congruent to ${k}.`,
        t`Its remainder on division by ${m} is ${math`\mathrm{rem}(${k + a * m}, ${m}) = ${v}`}. Check: ${math`${k} - ${v} = ${k - v} = ${(k - v) / m} \times ${m}`}.`,
      ],
    };
  },
  solve: ({ k, m }) => String(upTo(m).map((x) => x - 1).find((r) => (k - r) % m === 0)),
  misconceptions: ({ k, m }): Misconception[] => {
    const a = Math.abs(k);
    return [
      { response: String(a % m), why: t`That is the remainder of ${a}, not of ${k}: ${math`${k} - ${a % m}`} is not a multiple of ${m}.` },
      { response: String(-(a % m)), why: t`${math`[k]_{m}`} is never negative; that is what some programming languages' remainder gives. Add ${m}.` },
      { response: String(m - 1 - (a % m)), why: t`Off by one: check that ${math`${k} - r`} is a multiple of ${m}.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const bop19 = auto({
  id: 'bop-1-9-seventeen',
  source: cite('bop', 'Section 1.9, Fact 1.5 and its proof', true),
  title: t`The smallest element of ${math`A`}`,
  prompt: t`Book of Proof proves the division algorithm from the well-ordering principle: given ${math`a`} and ${math`b > ${0}`}, the set ${math`A = \{a - xb : x \in \mathbb{Z},\ ${0} \le a - xb\}`} has a smallest element ${mr}, and ${math`r = a - qb`}. For ${math`a = ${17}`} and ${math`b = ${3}`}, find ${mr} and ${mq}.`,
  answer: { kind: 'table', cell: 'exact', columns: [t`quantity`, t`value`], rows: [[t`${mr}, the smallest element of ${math`A`}`, null], [t`${mq}`, null]], expected: ['2', '5'] },
  solution: [
    t`Subtracting multiples of ${3} from ${17} and keeping the results that are at least ${0}: ${math`A = \{${listOf([2, 5, 8, 11, 14, 17, 20])}, \ldots\}`}.`,
    t`The smallest is ${math`r = ${2} = ${17} - ${5} \times ${3}`}, so ${math`q = ${5}`}: ${math`${17} = ${5} \times ${3} + ${2}`}.`,
  ],
  reference: ['2', '5'],
  verify: () => {
    const A = upTo(41).map((i) => i - 21).map((x) => 17 - 3 * x).filter((v) => v >= 0);
    const r = Math.min(...A);
    return same('the set A for x from -20 to 20', `${r},${(17 - r) / 3}`, '2,5');
  },
  misconceptions: [{ response: ['17', '0'], why: t`${17} is in ${math`A`} (take ${math`x = ${0}`}), but it is not the smallest: subtract ${3} as long as the result stays at least ${0}.` }],
  official: { source: cite('bop', 'Section 1.9, the example with a = 17 and b = 3'), answer: ['2', '5'], agrees: true },
});

const [K3, M3, L3] = [37, 12, 29];
const sheet213 = auto({
  id: 'sheet-2-1-3-a',
  source: cite('cst-dm-sw1', 'Exercises 2, 2.1.3(a)', true),
  title: t`Cancelling a multiple in a remainder`,
  prompt: t`Exercise ${2}.${1}.${3}(a) states ${math`\mathrm{rem}(k \cdot m + l, m) = \mathrm{rem}(l, m)`}. Use it to find ${math`\mathrm{rem}(${K3} \times ${M3} + ${L3}, ${M3})`} without multiplying out.`,
  answer: { kind: 'exact', expected: String(L3 % M3) },
  solution: [
    t`${math`\mathrm{rem}(${K3} \times ${M3} + ${L3}, ${M3}) = \mathrm{rem}(${L3}, ${M3}) = ${L3 % M3}`}, since ${math`${L3} = ${Math.floor(L3 / M3)} \times ${M3} + ${L3 % M3}`}.`,
    t`The official solution proves the rule by uniqueness: ${math`k m + l = (k + \mathrm{quo}(l, m))\,m + \mathrm{rem}(l, m)`} is a division of ${math`km + l`} by ${mm} with remainder below ${mm}, and there is only one.`,
  ],
  reference: String(L3 % M3),
  verify: () => same('multiplying out and dividing', (K3 * M3 + L3) % M3, L3 % M3),
  misconceptions: [{ response: String(L3), why: t`${L3} is not below ${M3}; the remainder of ${L3} itself on division by ${M3} is what is left.` }],
  // The official solution proves rem(km + l, m) = rem(l, m); at these numbers that is rem(29, 12) = 5.
  official: { source: cite('cst-dm-sols-2324-2', '2.1.3(a)'), answer: String(L3 % M3), agrees: true },
});

const [KN, MN] = [-17, 5];
const cor59 = auto({
  id: 'notes-186-cor-59',
  source: cite('cst-dm-notes', 'printed page 186, Corollary 59', true),
  title: t`The notes' formula for ${math`[k]_{m}`}`,
  prompt: t`Corollary ${59} of the notes defines ${math`[k]_{m} = \mathrm{rem}(k + |k| \cdot m, m)`} for an integer ${math`k`}. Compute ${math`[${KN}]_{${MN}}`} this way.`,
  answer: { kind: 'exact', expected: String(mod(KN, MN)) },
  solution: [
    t`${math`k + |k| \cdot m = ${KN} + ${-KN} \times ${MN} = ${KN - KN * MN}`}, a natural number congruent to ${KN} mod ${MN}.`,
    t`${math`\mathrm{rem}(${KN - KN * MN}, ${MN}) = ${mod(KN, MN)}`}. Check: ${math`${KN} - ${mod(KN, MN)} = ${KN - mod(KN, MN)}`}, a multiple of ${MN}.`,
  ],
  reference: String(mod(KN, MN)),
  verify: () => same('the formula and a search of 0 to 4', (KN - KN * MN) % MN, upTo(MN).map((x) => x - 1).find((r) => (KN - r) % MN === 0)),
  misconceptions: [{ response: String(-KN % MN), why: t`That is the remainder of ${-KN}. ${KN} lies ${(-KN) % MN} below a multiple of ${MN}, so it is ${MN - ((-KN) % MN)} above the next multiple down.` }],
});

const bop728 = supervision({
  id: 'bop-7-28',
  source: cite('bop', 'Chapter 7, exercise 28'),
  title: t`Uniqueness in the division algorithm`,
  prompt: t`Prove the division algorithm: if ${math`a, b \in \mathbb{N}`}, there exist unique integers ${mq}, ${mr} with ${math`a = bq + r`} and ${math`${0} \le r < b`}. Existence is in Book of Proof Section ${1}.${9}; prove uniqueness, either directly or, as the CST notes do (Lemma ${56}), by showing that ${math`q \cdot n + r = ${0}`} with ${math`${0} \le r < n`} forces ${math`q = ${0}`}.`,
  writeUp: 'proof',
});
const theorem57 = supervision({
  id: 'notes-181-theorem-57',
  source: cite('cst-dm-notes', 'printed pages 180 to 183, Theorem 57'),
  title: t`Why the algorithm is right`,
  prompt: t`For the notes' ${math`\mathrm{divalg}`}, explain (i) why ${math`\mathrm{divalg}(m, n)`} terminates for every natural ${mm} and positive ${mn}, and (ii) why every call ${math`\mathrm{diviter}(q, r)`} satisfies ${math`${0} \le q`}, ${math`${0} \le r`}, and ${math`m = q \cdot n + r`}, and how that gives the result. What is the worst-case number of steps?`,
  writeUp: 'explanation',
});
const sheet213all = supervision({
  id: 'sheet-2-1-3',
  source: cite('cst-dm-sw1', 'Exercises 2, 2.1.3'),
  title: t`Three remainder identities`,
  prompt: t`Prove that for all natural numbers ${math`k, l`} and positive integers ${mm}: (a) ${math`\mathrm{rem}(k m + l, m) = \mathrm{rem}(l, m)`}; (b) ${math`\mathrm{rem}(k + l, m) = \mathrm{rem}(\mathrm{rem}(k, m) + l, m)`}; (c) ${math`\mathrm{rem}(k l, m) = \mathrm{rem}(k \cdot \mathrm{rem}(l, m), m)`}. Use the uniqueness in the Division Theorem, not the arithmetic of your favourite programming language.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-2', '2.1.3'),
});

// ---------------------------------------------------------------- lesson

export const divisionTheorem: TopicContent = {
  topicId: 'num.division-theorem',
  goal: t`State and use the division theorem: unique ${mq} and ${mr} with ${math`m = q n + r`} and ${math`${0} \le r < n`}, found by repeated subtraction, with uniqueness as the tool for proving facts about remainders.`,
  lesson: [
    { kind: 'rule', text: t`Division Theorem (Theorem ${54} of the notes): for every natural number ${mm} and positive ${mn} there is a unique pair of integers ${math`q \ge ${0}`} and ${math`${0} \le r < n`} with ${math`m = q \cdot n + r`}. They are the [[quotient-remainder|quotient and remainder]], ${math`\mathrm{quo}(m, n)`} and ${math`\mathrm{rem}(m, n)`}.` },
    { kind: 'p', text: t`Existence is the division algorithm: start from ${math`(q, r) = (${0}, m)`} and, while ${math`r \ge n`}, replace ${math`(q, r)`} by ${math`(q + ${1}, r - n)`}. Every step keeps the [[loop-invariant|invariant]] ${math`m = q \cdot n + r`} with ${math`q, r \ge ${0}`}, and ${mr} falls each time, so it stops, with ${math`r < n`}. For ${math`m = ${17}`}, ${math`n = ${3}`}: ${math`(${0}, ${17}), (${1}, ${14}), \ldots, (${5}, ${2})`}.` },
    { kind: 'p', text: t`Uniqueness (Lemma ${56}): if ${math`q n + r = ${0}`} with ${math`${0} \le r < n`}, then ${math`q n`} is at most ${0} and more than ${math`-n`}, so ${math`q = ${0}`} and ${math`r = ${0}`}. Two divisions of the same number differ by such a pair, so they are equal.` },
    { kind: 'p', text: t`Uniqueness is a proof tool. To show two remainders are equal, show both fit a division of the same number. The official solution to exercise ${2}.${1}.${3}(a): ${math`km + l = (k + \mathrm{quo}(l, m))\,m + \mathrm{rem}(l, m)`}, so ${math`\mathrm{rem}(km + l, m) = \mathrm{rem}(l, m)`}.` },
    { kind: 'p', text: t`Negative numbers divide the same way, with ${mq} rounded down so that ${mr} stays from ${0} to ${math`n - ${1}`}: ${math`-${17} = (-${6}) \times ${3} + ${1}`}, not ${math`(-${5}) \times ${3} - ${2}`}. The notes' ${math`[k]_{m}`} is that remainder: ${math`[-${17}]_{${3}} = ${mod(-17, 3)}`}. Many programming languages round toward zero instead and give ${math`-${2}`}.` },
  ],
  examples: [
    workedCambridge(bop19),
    worked(quoRem, { a: -47, b: 6 }, t`Dividing a negative number`),
    worked(divalgTrace, { m: 23, n: 5 }, t`Tracing the algorithm`),
  ],
  generators: [quoRem, divalgTrace, leastResidue],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['quotient-remainder', 'loop-invariant'],
  cambridge: [sheet213, cor59, bop728, theorem57, sheet213all],
  gate: ['sheet-2-1-3-a', 'notes-186-cor-59', 'notes-181-theorem-57', 'sheet-2-1-3'],
};
