/**
 * comb.binomial-theorem-proof: Prove the binomial theorem by induction on n, with
 * Pascal's rule in the inductive step. The lesson follows the CST notes' proof (printed
 * pages 271 to 278: the induction hypothesis P(m), the base case, unfolding (x + y)^(n+1),
 * reconstructing Pascal's rule by counting, and the remark that the proof works in any
 * commutative semiring) and Book of Proof Chapter 10, exercise 23, whose solution is
 * compared in a supervision problem.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick } from '../math';
import { choose } from '../numbers';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, listOf, math, paren, t, type Span } from '../rich';
import { worked, workedProof, type TopicContent } from '../topic';

const [mn, mk] = [math`n`, math`k`];

/** x^a y^b as LaTeX, with exponents 0 and 1 written the usual way. */
function mono(a: number, b: number): Span {
  const part = (v: string, e: number): string => (e === 0 ? '' : e === 1 ? v : `${v}^{${e}}`);
  const s = `${part('x', a)}${part('y', b)}`;
  return computedTex(s === '' ? String(1) : s);
}

/** The coefficients of (x + y)^n, by multiplying out (x + y) n times: the reference, independent of the binomial formula. */
function expand(n: number): number[] {
  let row = [1];
  for (let i = 0; i < n; i++) row = Array.from({ length: row.length + 1 }, (_, k) => (row[k] ?? 0) + (row[k - 1] ?? 0));
  return row;
}

const hyp = (n: Span | number) => math`(x + y)^{${n}} = \sum_{k = ${0}}^{${n}} \binom{${n}}{k} x^{${n} - k} y^{k}`;

// ---------------------------------------------------------------- the coefficient in the inductive step

interface StepP { n: number; k: number }

const stepCoefficient = generator<StepP>({
  id: 'step-coefficient',
  skill: 'In the inductive step, find a coefficient of (x + y)^(n+1) as the sum of its two contributions from (x + y)^n (x + y), which is Pascal\'s rule.',
  params: (rng) => { const n = int(rng, 3, 9); return { n, k: int(rng, 1, n) }; },
  sane: ({ n, k }) => (n >= 3 && n <= 9 && k >= 1 && k <= n ? null : 'out of range'),
  problem: ({ n, k }) => {
    const [a, b, c] = [choose(n, k), choose(n, k - 1), choose(n + 1, k)];
    return {
      prompt: t`Assume the induction hypothesis for ${math`n = ${n}`}: ${hyp(n)}. In ${math`(x + y)^{${n + 1}} = (x + y)^{${n}}(x + y)`}, what is the coefficient of ${mono(n + 1 - k, k)}?`,
      answer: { kind: 'exact', expected: String(c) },
      solution: [
        t`Two products give ${mono(n + 1 - k, k)}: ${math`x`} times the term ${math`\binom{${n}}{${k}}`}${mono(n - k, k)}, and ${math`y`} times the term ${math`\binom{${n}}{${k - 1}}`}${mono(n - k + 1, k - 1)}.`,
        t`So the coefficient is ${math`\binom{${n}}{${k}} + \binom{${n}}{${k - 1}} = ${a} + ${b} = ${c}`}, which is ${math`\binom{${n + 1}}{${k}}`}: Pascal's rule is exactly what the inductive step needs.`,
      ],
    };
  },
  solve: ({ n, k }) => String(expand(n + 1)[k]),
  misconceptions: ({ n, k }): Misconception[] => [
    { response: String(choose(n, k)), why: t`That is only the contribution of ${math`x`} times the term with ${math`y^{${k}}`}. The term with ${math`y^{${k - 1}}`}, times ${math`y`}, gives ${mono(n + 1 - k, k)} too.` },
    { response: String(choose(n, k - 1)), why: t`That is only the contribution of ${math`y`} times the term with ${math`y^{${k - 1}}`}. Add the contribution of ${math`x`} times the term with ${math`y^{${k}}`}.` },
    { response: String(choose(n, k) * choose(n, k - 1)), why: t`The two contributions are separate terms of the product, so their coefficients add; they do not multiply.` },
  ],
});

// ---------------------------------------------------------------- a coefficient as a formula in n

interface GenP { k: 2 | 3; c: number; sign: 1 | -1 }

const POLY: Readonly<Record<2 | 3, { up: string; down: string; tex: Span }>> = {
  2: { up: '(n + 1)*n/2', down: 'n*(n - 1)/2', tex: math`\frac{(n + ${1})n}{${2}}` },
  3: { up: '(n + 1)*n*(n - 1)/6', down: 'n*(n - 1)*(n - 2)/6', tex: math`\frac{(n + ${1})n(n - ${1})}{${6}}` },
};
const N_DOMAIN = { n: { kind: 'integer' as const, min: 3, max: 12 } };

const generalCoefficient = generator<GenP>({
  id: 'general-coefficient',
  skill: 'Use the binomial theorem, proved for x and y in any commutative ring, with y replaced by a multiple of y: find a coefficient of (x + cy)^(n+1) as a formula in n.',
  params: (rng) => ({ k: pick(rng, [2, 3] as const), c: int(rng, 2, 5), sign: pick(rng, [1, -1] as const) }),
  sane: ({ c }) => (c >= 2 && c <= 5 ? null : 'out of range'),
  problem: ({ k, c, sign }) => {
    const v = (sign * c) ** k;
    return {
      prompt: t`Find, as an expression in ${mn}, the coefficient of ${math`x^{n + ${1} - ${k}} y^{${k}}`} in ${math`(x ${sign < 0 ? '-' : '+'} ${c}y)^{n + ${1}}`}, for ${math`n \ge ${3}`}.`,
      answer: { kind: 'expression', expected: `${v}*${POLY[k].up}`, variables: ['n'], domains: N_DOMAIN, binomial: true },
      solution: [
        t`The theorem holds for any ${math`x`} and ${math`y`} that commute, so apply it to ${math`x`} and ${math`${sign < 0 ? '-' : ''}${c}y`}: the term with ${math`k = ${k}`} is ${math`\binom{n + ${1}}{${k}} x^{n + ${1} - ${k}} (${sign < 0 ? '-' : ''}${c}y)^{${k}}`}.`,
        t`${math`\binom{n + ${1}}{${k}} = ${POLY[k].tex}`} and ${math`(${sign * c})^{${k}} = ${v}`}, so the coefficient is ${math`${v} \times ${POLY[k].tex}`}.`,
      ],
    };
  },
  solve: ({ k, c, sign }) => `${(sign * c) ** k}*choose(n + 1, ${k})`,
  misconceptions: ({ k, c, sign }): Misconception[] => [
    { response: `${(sign * c) ** k}*${POLY[k].down}`, why: t`That is the coefficient in ${math`(x + ${c}y)^{n}`}, with ${math`\binom{n}{${k}}`}. The power here is ${math`n + ${1}`}.` },
    { response: POLY[k].up, why: t`The ${math`y`} in the theorem is ${math`${sign < 0 ? '-' : ''}${c}y`} here, so its ${k === 2 ? 'square' : 'cube'} brings a factor ${math`(${sign * c})^{${k}}`}.` },
    { response: `${sign * c}*${POLY[k].up}`, why: t`The whole of ${math`${sign < 0 ? '-' : ''}${c}y`} is raised to the power ${k}, so the factor is ${math`(${sign * c})^{${k}} = ${(sign * c) ** k}`}, not ${sign * c}.` },
  ],
});

// ---------------------------------------------------------------- a binomial sum

interface SumP { n: number; a: number; b: number }

const evaluateSum = generator<SumP>({
  id: 'evaluate-sum',
  skill: 'Recognise a binomial sum and evaluate it as a single power, by the theorem read from right to left.',
  params: (rng) => {
    for (;;) {
      const p: SumP = { n: int(rng, 3, 6), a: int(rng, 1, 4), b: pick(rng, [-3, -2, -1, 1, 2, 3]) };
      if (Math.abs(p.a + p.b) >= 2) return p;
    }
  },
  sane: ({ a, b }) => (Math.abs(a + b) >= 2 && b !== 0 ? null : 'out of range'),
  problem: ({ n, a, b }) => {
    const bTex = b < 0 ? `(${b})` : String(b);
    return {
      prompt: t`Evaluate ${dmath`\sum_{k = ${0}}^{${n}} \binom{${n}}{k} ${a}^{${n} - k} ${computedTex(bTex)}^{k}.`}`,
      answer: { kind: 'exact', expected: String((a + b) ** n) },
      solution: [
        t`This is the right-hand side of the binomial theorem with ${math`x = ${a}`}, ${math`y = ${b}`}, and ${math`n = ${n}`}.`,
        t`So the sum is ${math`(${a} ${b < 0 ? '-' : '+'} ${Math.abs(b)})^{${n}} = ${paren(a + b)}^{${n}} = ${(a + b) ** n}`}.`,
      ],
    };
  },
  solve: ({ n, a, b }) => {
    // Add the terms one by one.
    let s = 0;
    for (let k = 0; k <= n; k++) s += choose(n, k) * a ** (n - k) * b ** k;
    return String(s);
  },
  misconceptions: ({ n, a, b }): Misconception[] => [
    { response: String((a - b) ** n), why: t`The ${math`y^{k}`} in the theorem is ${math`(${b})^{k}`} here, so the sum is ${math`(${a} + (${b}))^{${n}}`}: keep the sign of ${math`y`}.` },
    { response: String((a + b) ** (n - 1)), why: t`The power is the top of the binomial coefficients, ${n}, not ${n - 1}.` },
    { response: String(a ** n + b ** n), why: t`That keeps only the terms ${math`k = ${0}`} and ${math`k = n`}. Every term of the sum counts; together they make one power.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const notesProof = workedProof({
  title: t`The notes' proof of the Binomial Theorem`,
  prompt: t`The CST notes' Binomial Theorem: for all ${math`n \in \mathbb{N}`}, ${hyp(mn)}. Prove it by induction.`,
  steps: [
    t`Let ${math`P(m)`} be the statement ${hyp(math`m`)}. We prove ${math`\forall m \in \mathbb{N}.\ P(m)`} by the Principle of Induction.`,
    t`Base case: ${math`(x + y)^{${0}} = ${1} = \binom{${0}}{${0}} x^{${0}} y^{${0}}`}, which is the sum for ${math`m = ${0}`}.`,
    t`Inductive step: let ${mn} be a natural number and assume ${math`P(n)`}. Then ${math`(x + y)^{n + ${1}} = (x + y)^{n}(x + y) = \sum_{k = ${0}}^{n} \binom{n}{k} x^{n - k + ${1}} y^{k} + \sum_{k = ${0}}^{n} \binom{n}{k} x^{n - k} y^{k + ${1}}`}, by the induction hypothesis.`,
    t`In the second sum put ${math`j = k + ${1}`}: it is ${math`\sum_{j = ${1}}^{n + ${1}} \binom{n}{j - ${1}} x^{n + ${1} - j} y^{j}`}. Now both sums are in powers ${math`x^{n + ${1} - k} y^{k}`}. Split off ${math`x^{n + ${1}}`} from the first and ${math`y^{n + ${1}}`} from the second; for ${math`${1} \le k \le n`} the coefficients add to ${math`\binom{n}{k} + \binom{n}{k - ${1}} = \binom{n + ${1}}{k}`} by Pascal's rule, which the notes reconstruct by counting.`,
    t`So ${math`(x + y)^{n + ${1}} = \sum_{k = ${0}}^{n + ${1}} \binom{n + ${1}}{k} x^{n + ${1} - k} y^{k}`}, which is ${math`P(n + ${1})`}. By the Principle of Induction, ${math`P(m)`} holds for every natural number ${math`m`}.`,
  ],
  answer: t`The Binomial Theorem holds for every natural number ${mn}.`,
  source: cite('cst-dm-notes', 'printed pages 271 to 278, the Binomial Theorem'),
});

const [PN, PK] = [6, 3];
/** The k-subsets of n + 1 objects, split by whether the last object is chosen: counted by listing bitmasks. */
function splitCount(n: number, k: number): [number, number] {
  let without = 0;
  let withLast = 0;
  for (let s = 0; s < 2 ** (n + 1); s++) {
    let bits = 0;
    for (let i = 0; i <= n; i++) if ((s >> i) & 1) bits++;
    if (bits !== k) continue;
    if ((s >> n) & 1) withLast++; else without++;
  }
  return [without, withLast];
}

const pascalCount = auto({
  id: 'notes-275-pascal-by-counting',
  source: cite('cst-dm-notes', 'printed page 275, Pascal\'s rule by counting', true),
  title: t`Pascal's rule by counting`,
  prompt: t`The notes get unstuck in the inductive step by counting: choose ${mk} objects from ${math`o_{${1}}, \ldots, o_{n + ${1}}`}, in two cases, (i) ${math`o_{n + ${1}}`} is not chosen, (ii) it is chosen. For ${math`n = ${PN}`} and ${math`k = ${PK}`}, how many choices are there in each case, and in all?`,
  answer: {
    kind: 'table', cell: 'exact',
    columns: [t`case`, t`number of choices`],
    rows: [[t`(i) not chosen`, null], [t`(ii) chosen`, null], [t`in all`, null]],
    expected: [String(choose(PN, PK)), String(choose(PN, PK - 1)), String(choose(PN + 1, PK))],
  },
  solution: [
    t`(i) All ${PK} objects come from ${math`o_{${1}}, \ldots, o_{${PN}}`}: ${math`\binom{${PN}}{${PK}} = ${choose(PN, PK)}`} ways.`,
    t`(ii) ${math`o_{${PN + 1}}`} is one of them, and the other ${PK - 1} come from the first ${PN}: ${math`\binom{${PN}}{${PK - 1}} = ${choose(PN, PK - 1)}`} ways.`,
    t`In all ${math`${choose(PN, PK)} + ${choose(PN, PK - 1)} = ${choose(PN + 1, PK)} = \binom{${PN + 1}}{${PK}}`}: the conjecture (Pascal's rule) for these numbers.`,
  ],
  reference: [String(choose(PN, PK)), String(choose(PN, PK - 1)), String(choose(PN + 1, PK))],
  verify: () => {
    const [a, b] = splitCount(PN, PK);
    return same('subsets listed by bitmask', [a, b, a + b].join(), [choose(PN, PK), choose(PN, PK - 1), choose(PN + 1, PK)].join());
  },
  misconceptions: [{ response: [String(choose(PN, PK)), String(choose(PN, PK)), String(2 * choose(PN, PK))], why: t`In case (ii) one of the ${PK} objects is already chosen, so only ${PK - 1} more are chosen from the other ${PN}.` }],
});

const UN = 3;
const unfoldRows = Array.from({ length: UN + 2 }, (_, k) => k);
const unfold = auto({
  id: 'notes-274-unfold',
  source: cite('cst-dm-notes', 'printed page 274, unfolding the left-hand side', true),
  title: t`Unfolding the left-hand side`,
  prompt: t`The notes unfold ${math`(x + y)^{n + ${1}} = \sum_{k} \binom{n}{k} x^{n - k + ${1}} y^{k} + \sum_{k} \binom{n}{k} x^{n - k} y^{k + ${1}}`}. For ${math`n = ${UN}`}, give the coefficient of each power in the first sum, in the second sum, and in their total.`,
  answer: {
    kind: 'table', cell: 'exact',
    columns: [t`power`, t`first sum`, t`second sum`, t`total`],
    rows: unfoldRows.map((k) => [[mono(UN + 1 - k, k)], null, null, null]),
    expected: unfoldRows.flatMap((k) => [String(choose(UN, k)), String(choose(UN, k - 1)), String(choose(UN + 1, k))]),
  },
  solution: [
    t`The first sum is ${math`x`} times ${math`(x + y)^{${UN}}`}: its coefficients are row ${UN} of Pascal's triangle, ${listOf(expand(UN))}, on the powers from ${mono(UN + 1, 0)} down to ${mono(1, UN)}, and nothing on ${mono(0, UN + 1)}.`,
    t`The second sum is ${math`y`} times it: the same row moved one place along, nothing on ${mono(UN + 1, 0)}. Adding gives row ${UN + 1}, ${listOf(expand(UN + 1))}, which is ${math`(x + y)^{${UN + 1}}`}.`,
  ],
  reference: unfoldRows.flatMap((k) => [String(choose(UN, k)), String(choose(UN, k - 1)), String(choose(UN + 1, k))]),
  verify: () => {
    // Multiply the polynomial (x + y)^3 by x and by y separately, as coefficient lists.
    const row = expand(UN);
    const first = [...row, 0];
    const second = [0, ...row];
    const total = first.map((v, i) => v + (second[i] as number));
    return same('x and y times the expansion of (x + y)^3', unfoldRows.flatMap((k) => [first[k], second[k], total[k]]).join(), unfoldRows.flatMap((k) => [choose(UN, k), choose(UN, k - 1), expand(UN + 1)[k]]).join());
  },
  misconceptions: [{ response: unfoldRows.flatMap((k) => [String(choose(UN, k)), String(choose(UN, k)), String(2 * choose(UN, k))]), why: t`Multiplying by ${math`y`} raises the power of ${math`y`} by one, so the second sum's coefficients move one place along.` }],
});

const bop1023 = supervision({
  id: 'bop-10-23',
  source: cite('bop', 'Chapter 10, exercise 23'),
  title: t`Book of Proof's version`,
  prompt: t`Use induction to prove the binomial theorem ${math`(x + y)^{n} = \sum_{i = ${0}}^{n} \binom{n}{i} x^{n - i} y^{i}`}. Then compare with the solution at the back of Book of Proof, which checks ${math`n = ${1}`} and then assumes the theorem "for some ${math`n > ${1}`}": which case does that wording leave out, which base case do the CST notes use instead, and which convention about ${math`\binom{n}{-${1}}`} does the solution use when it merges the two sums?`,
  writeUp: 'proof',
  official: cite('bop', 'Solutions, Chapter 10, exercise 23'),
});

const semiring = supervision({
  id: 'notes-278-semiring',
  source: cite('cst-dm-notes', 'printed page 278, the remark that the proof works in any commutative semiring'),
  title: t`Where commutativity is used`,
  prompt: t`The notes remark that the proof works in any commutative semiring. Point to the step of the inductive proof that uses ${math`xy = yx`}. Then show that the theorem fails without it: for ${math`${2} \times ${2}`} matrices ${math`A`} and ${math`B`} with ${math`AB \ne BA`}, expand ${math`(A + B)^{${2}}`} and compare it with ${math`A^{${2}} + ${2}AB + B^{${2}}`}.`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

const R = 3;

export const binomialTheoremProof: TopicContent = {
  topicId: 'comb.binomial-theorem-proof',
  goal: t`Prove the binomial theorem by induction on ${mn}, shifting an index and using Pascal's rule in the inductive step.`,
  lesson: [
    { kind: 'p', text: t`The binomial theorem, ${hyp(mn)}, is stated early in the CST notes and proved later, as an example of the Principle of Induction. The proof is a model of an inductive step that does not go through by itself: it needs an extra fact, Pascal's rule.` },
    { kind: 'rule', text: t`Let ${math`P(m)`} be ${hyp(math`m`)}. Base case: ${math`(x + y)^{${0}} = ${1} = \binom{${0}}{${0}}`}. Inductive step: assume ${math`P(n)`}, multiply both sides by ${math`(x + y)`}, and show the result is ${math`P(n + ${1})`}.` },
    { kind: 'p', text: t`Multiplying by ${math`x + y`} gives two sums, ${math`\sum \binom{n}{k} x^{n - k + ${1}} y^{k}`} and ${math`\sum \binom{n}{k} x^{n - k} y^{k + ${1}}`}. To add them term by term, [[index-shift|shift the index]] of the second: with ${math`j = k + ${1}`} its terms are ${math`\binom{n}{j - ${1}} x^{n + ${1} - j} y^{j}`}, for ${math`j`} from ${1} to ${math`n + ${1}`}. Now the coefficient of ${math`x^{n + ${1} - k} y^{k}`} is ${math`\binom{n}{k} + \binom{n}{k - ${1}}`}, and [[pascals-rule|Pascal's rule]] makes it ${math`\binom{n + ${1}}{k}`}.` },
    { kind: 'p', text: t`The end terms need care: ${math`x^{n + ${1}}`} comes only from the first sum and ${math`y^{n + ${1}}`} only from the second. The notes split them off; Book of Proof instead reads ${math`\binom{n}{-${1}}`} and ${math`\binom{n}{n + ${1}}`} as ${0}, which says the same thing.` },
    { kind: 'p', text: t`With numbers: row ${R} of Pascal's triangle is ${listOf(expand(R))}. Multiplying by ${math`x`} keeps the row; multiplying by ${math`y`} moves it one place along; adding the two gives ${listOf(expand(R + 1))}, row ${R + 1}. Each entry is the sum of the two above it.` },
    { kind: 'p', text: t`The proof uses only the laws of addition and multiplication, including ${math`xy = yx`} when collecting ${math`x^{n - k} y^{k} \cdot x`} into ${math`x^{n - k + ${1}} y^{k}`}. So, as the notes remark, the theorem holds in any commutative semiring: for integers mod ${math`m`}, or with ${math`y`} replaced by ${math`${2}y`} or ${math`-y`}.` },
  ],
  examples: [
    notesProof,
    worked(stepCoefficient, { n: 4, k: 2 }, t`A coefficient in the step from ${4} to ${5}`),
    worked(evaluateSum, { n: 5, a: 3, b: -1 }, t`A binomial sum as one power`),
  ],
  generators: [stepCoefficient, generalCoefficient, evaluateSum],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['index-shift'],
  cambridge: [pascalCount, unfold, bop1023, semiring],
};
