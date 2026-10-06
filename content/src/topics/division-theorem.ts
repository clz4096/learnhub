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
import { computedTex, listOf, math, paren, t } from '../rich';
import { quickCheck, worked, workedCambridge, type TopicContent } from '../topic';

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

/** The division algorithm's states (q, r) for m and n, from (0, m) until r < n. */
function trace(m: number, n: number): [number, number][] {
  const out: [number, number][] = [[0, m]];
  while ((out[out.length - 1] as [number, number])[1] >= n) {
    const [q, r] = out[out.length - 1] as [number, number];
    out.push([q + 1, r - n]);
  }
  return out;
}
const [TM, TN] = [20, 6];
const traceTex = (m: number, n: number): string => trace(m, n).map(([q, r]) => `(${q}, ${r})`).join(',\\ ');
const [NEG, NB] = [-17, 3];

export const divisionTheorem: TopicContent = {
  topicId: 'num.division-theorem',
  goal: t`State and use the division theorem: unique ${mq} and ${mr} with ${math`m = q n + r`} and ${math`${0} \le r < n`}, found by repeated subtraction, with uniqueness as the tool for proving facts about remainders.`,
  objective: t`State the division theorem, prove the remainder is unique, and use uniqueness to prove remainder rules.`,
  why: t`Every remainder in number theory rests on it; next come congruences, the gcd, and Euclid's algorithm.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Sharing out sweets` },
    { kind: 'hook', text: t`Share ${TM} sweets among ${TN} children: each gets ${Math.floor(TM / TN)}, and ${TM % TN} are left over. You learned that as a child. But why is there always exactly one answer? Could a cleverer sharing give a different leftover? Proving that it cannot is the first theorem of number theory.` },
    { kind: 'narrative', text: t`"Each gets ${Math.floor(TM / TN)}, ${TM % TN} left" is the equation ${math`${TM} = ${Math.floor(TM / TN)} \times ${TN} + ${TM % TN}`}. The leftover must be smaller than ${TN}; otherwise you could hand out another round. The CST notes state the general fact like this.` },
    {
      kind: 'theorem',
      name: t`Division Theorem`,
      statement: t`For every natural number ${mm} and positive integer ${mn}, there is a unique pair of integers ${mq} and ${mr} with ${math`q \ge ${0}`}, ${math`${0} \le r < n`}, and ${math`m = q \cdot n + r`}.`,
    },
    {
      kind: 'definition',
      name: t`Quotient and remainder`,
      formal: t`For ${mm} and ${mn} as in the Division Theorem, the unique ${mq} and ${mr} are the [[quotient-remainder|quotient and remainder]] of ${mm} on division by ${mn}, written ${math`\mathrm{quo}(m, n)`} and ${math`\mathrm{rem}(m, n)`}.`,
      plain: t`how many full rounds, and how many are left over. ${math`\mathrm{quo}(${TM}, ${TN}) = ${Math.floor(TM / TN)}`} and ${math`\mathrm{rem}(${TM}, ${TN}) = ${TM % TN}`}.`,
    },
    { kind: 'p', text: t`The theorem makes two claims. Existence: some such pair exists. Uniqueness: only one does. They need different proofs.` },
    { kind: 'section', title: t`Existence: the algorithm` },
    { kind: 'narrative', text: t`Existence is proved by doing it. Start with nobody served: quotient ${0}, remainder ${mm}. While at least ${mn} are left, serve one more round: add ${1} to ${mq} and take ${mn} from ${mr}. For ${math`m = ${TM}`} and ${math`n = ${TN}`} the pairs ${math`(q, r)`} are ${math`${computedTex(traceTex(TM, TN))}`}.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Start`, text: t`${math`(q, r) = (${0}, m)`}. Then ${math`m = q \cdot n + r`}, ${math`q \ge ${0}`}, and ${math`r \ge ${0}`}.`, plain: t`${math`m = ${0} \cdot n + m`}, and ${mm} is a natural number.` },
        { label: t`Each step keeps the equation`, text: t`If ${math`r \ge n`}, replace ${math`(q, r)`} by ${math`(q + ${1}, r - n)`}. Then ${math`(q + ${1}) n + (r - n) = q n + r = m`}, ${math`q + ${1} \ge ${0}`}, and ${math`r - n \ge ${0}`}.`, plain: t`One more round served, ${mn} fewer left: the total is unchanged, and nothing goes negative because we only serve when at least ${mn} remain.` },
        { label: t`It stops`, text: t`Each step lowers ${mr} by ${mn}, at least ${1}. A natural number cannot fall for ever, so after finitely many steps ${math`r < n`}.`, plain: t`At most ${mm} steps, since ${mr} starts at ${mm}.` },
        { label: t`Read off the answer`, text: t`At the stop, ${math`m = q \cdot n + r`} with ${math`q \ge ${0}`} and ${math`${0} \le r < n`}.`, plain: t`Exactly the pair the theorem asks for.` },
      ],
    },
    {
      kind: 'p',
      text: t`The equation ${math`m = q \cdot n + r`}, with ${math`q, r \ge ${0}`}, holds at the start and survives every step. A statement like that is a [[loop-invariant|loop invariant]]: the notes use it to prove the program correct.`,
      why: { q: t`Why is an invariant enough to prove the program right?`, a: t`If a statement is true at the start and each step keeps it true, it is true when the loop stops. At the stop we also know ${math`r < n`}, the loop's exit condition. Together those are the theorem.` },
    },
    { kind: 'section', title: t`Uniqueness` },
    { kind: 'narrative', text: t`Could two different pairs both work? Suppose they did, and compare them. The trick is that two remainders, each between ${0} and ${math`n - ${1}`}, are too close together to differ by a whole multiple of ${mn}, unless they are equal.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Two divisions`, text: t`Suppose ${math`m = q n + r = q' n + r'`} with ${math`${0} \le r < n`} and ${math`${0} \le r' < n`}.`, plain: t`Two pairs ${math`(q, r)`} and ${math`(q', r')`} that both satisfy the theorem.` },
        { label: t`Subtract`, text: t`Then ${math`(q - q') n = r' - r`}.`, plain: t`Take ${math`q'n + r'`} from ${math`qn + r`}: the left side is ${0}, so ${math`(q - q')n + (r - r') = ${0}`}; move ${math`r - r'`} across.` },
        {
          label: t`The right side is small`, text: t`${math`-n < r' - r < n`}.`,
          plain: t`The largest ${math`r' - r`} can be is ${math`(n - ${1}) - ${0}`}, and the smallest is ${math`${0} - (n - ${1})`}.`,
        },
        {
          label: t`So the multiple is zero`, text: t`${math`(q - q')n`} is a multiple of ${mn} strictly between ${math`-n`} and ${mn}, so ${math`q - q' = ${0}`}.`,
          why: { q: t`Why must the multiple be zero?`, a: t`If ${math`q - q'`} were ${1} or more, ${math`(q - q')n`} would be at least ${mn}; if it were ${math`${-1}`} or less, at most ${math`-n`}. Both are outside the range. With ${math`n = ${TN}`}: the multiples of ${TN} strictly between ${math`${-TN}`} and ${TN} are just ${0}.` },
        },
        { label: t`Conclude`, text: t`So ${math`q = q'`}, and then ${math`r' - r = ${0} \cdot n = ${0}`}, so ${math`r = r'`}.`, plain: t`The two pairs were the same pair all along.` },
      ],
    },
    { kind: 'section', title: t`Uniqueness as a tool` },
    { kind: 'narrative', text: t`Uniqueness is more than a curiosity: it is how you prove facts about remainders. To show ${math`\mathrm{rem}(x, n) = s`}, write ${math`x = (\text{something}) \cdot n + s`} with ${math`${0} \le s < n`}. Since there is only one such way, ${mr} must be ${math`s`}. The supervision exercise ${2}.${1}.${3} asks for three proofs of exactly this kind.` },
    quickCheck({
      prompt: t`Using ${math`\mathrm{rem}(k \cdot m + l, m) = \mathrm{rem}(l, m)`}, find ${math`\mathrm{rem}(${100} \times ${7} + ${10}, ${7})`} without multiplying out.`,
      answer: { kind: 'exact', expected: String((100 * 7 + 10) % 7) },
      reference: String((100 * 7 + 10) % 7),
      why: t`The multiple of ${7} drops out: ${math`\mathrm{rem}(${10}, ${7}) = ${10 % 7}`}, since ${math`${10} = ${1} \times ${7} + ${10 % 7}`}.`,
    }),
    { kind: 'section', title: t`Negative numbers` },
    {
      kind: 'p',
      text: t`The theorem extends to every integer ${mm}: there is still a unique ${mr} with ${math`${0} \le r < n`}. Round the quotient down, not toward zero: ${math`${NEG} = (${Math.floor(NEG / NB)}) \times ${NB} + ${mod(NEG, NB)}`}. The notes write this remainder ${math`[k]_{m}`}: ${math`[${NEG}]_{${NB}} = ${mod(NEG, NB)}`}.`,
      why: { q: t`Why round down?`, a: t`Rounding toward zero gives ${math`${NEG} = (${Math.trunc(NEG / NB)}) \times ${NB} + (${NEG - Math.trunc(NEG / NB) * NB})`}, and ${math`${NEG - Math.trunc(NEG / NB) * NB}`} is not between ${0} and ${NB - 1}. Rounding down is the only choice that keeps the remainder in range.` },
    },
    {
      kind: 'pitfall',
      claim: t`The remainder of ${NEG} on division by ${NB} is ${math`${NEG - Math.trunc(NEG / NB) * NB}`}, as many programming languages say.`,
      counterexample: t`A remainder must satisfy ${math`${0} \le r < ${NB}`}. Languages such as C and Java round the quotient toward zero and return ${math`${NEG - Math.trunc(NEG / NB) * NB}`}, but the mathematical remainder is ${mod(NEG, NB)}: ${math`${NEG} = (${Math.floor(NEG / NB)}) \times ${NB} + ${mod(NEG, NB)}`}.`,
    },
    { kind: 'takeaway', text: t`For ${math`n > ${0}`} there is exactly one way to write ${math`m = qn + r`} with ${math`${0} \le r < n`}; repeated subtraction finds it, and its uniqueness is the tool for proving facts about remainders.` },
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
  // The three identities of 2.1.3 need uniqueness used three times; Theorem 57 asks for the invariant
  // argument. The numeric versions (2.1.3(a) at numbers, Corollary 59) are one-line computations.
  gate: ['sheet-2-1-3', 'notes-181-theorem-57'],
  recall: [
    { front: t`State the Division Theorem.`, back: t`For natural ${mm} and positive ${mn}, there are unique integers ${math`q \ge ${0}`} and ${math`${0} \le r < n`} with ${math`m = qn + r`}.` },
    { front: t`What is the loop invariant of the division algorithm?`, back: t`${math`m = q \cdot n + r`} with ${math`q \ge ${0}`} and ${math`r \ge ${0}`}.` },
    { front: t`Why is the remainder unique?`, back: t`Two divisions give ${math`(q - q')n = r' - r`}, a multiple of ${mn} strictly between ${math`-n`} and ${mn}, so zero.` },
    { front: t`How do you prove ${math`\mathrm{rem}(x, n) = s`}?`, back: t`Write ${math`x = (\text{integer}) \cdot n + s`} with ${math`${0} \le s < n`}, and use uniqueness.` },
  ],
  proofOrder: [
    {
      title: t`The remainder is unique`,
      steps: [
        t`Suppose ${math`qn + r = q'n + r'`} with ${math`${0} \le r, r' < n`}.`,
        t`Subtract: ${math`(q - q')n = r' - r`}.`,
        t`${math`r' - r`} lies strictly between ${math`-n`} and ${mn}.`,
        t`The only multiple of ${mn} in that range is ${0}, so ${math`q = q'`} and ${math`r = r'`}.`,
      ],
    },
  ],
};
