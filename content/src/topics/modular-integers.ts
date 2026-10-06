/**
 * num.modular-integers: Z_m, the integers 0 to m - 1 with k +_m l = rem(k + l, m) and
 * k ·_m l = rem(k l, m), a commutative ring, and its operation tables. The lesson follows the
 * CST notes (printed pages 188 to 197: the definition, Example 60 (Z_2 is XOR and AND),
 * Examples 61 and 62 (the tables of Z_4 and Z_5 and their inverse tables), Proposition 63)
 * and Book of Proof Section 11.5 (Z_n as classes [a], and why the operations are well
 * defined). The problems are Book of Proof's exercises for Section 11.5 and supervision
 * exercises 2.1.4 and 2.2.6 with their 2023-24 official solutions.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick, upTo } from '../math';
import { mod } from '../numbers';
import { generator, type Misconception } from '../problem';
import { computedTex, dmath, listOf, math, t, type Span } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const [mm, mk] = [math`m`, math`k`];
const Z = (m: number | Span): Span => math`\mathbb{Z}_{${m}}`;
const distinctFrom = (right: string, xs: readonly string[]): number => new Set(xs.filter((x) => x !== right)).size;

// ---------------------------------------------------------------- a calculation in Z_m

interface CalcP { m: number; a: number; b: number; op: '+' | '*' }
const calcMis = ({ m, a, b, op }: CalcP): string[] => (op === '+'
  ? [String(mod(a, m) + mod(b, m)), String(a + b), String(mod(a - b, m))]
  : [String(mod(a, m) * mod(b, m)), String(a * b), String(mod(a + b, m))]);
const calcRight = ({ m, a, b, op }: CalcP): number => mod(op === '+' ? a + b : a * b, m);

const zmCalc = generator<CalcP>({
  id: 'zm-calc',
  skill: 'Calculate in Z_m with classes [a]: add or multiply representatives, then reduce to the one from 0 to m - 1.',
  params: (rng) => {
    for (;;) {
      const p: CalcP = { m: int(rng, 5, 13), a: int(rng, 3, 40), b: int(rng, 3, 40), op: pick(rng, ['+', '*'] as const) };
      if (distinctFrom(String(calcRight(p)), calcMis(p)) >= 2) return p;
    }
  },
  sane: ({ m }) => (m >= 5 ? null : 'out of range'),
  problem: (p) => {
    const { m, a, b, op } = p;
    const raw = op === '+' ? a + b : a * b;
    return {
      prompt: t`In ${Z(m)}, compute ${math`[${a}] ${op === '+' ? '+' : '\\cdot'} [${b}]`}, as ${math`[c]`} with ${math`${0} \le c \le ${m - 1}`}. Give ${math`c`}.`,
      answer: { kind: 'exact', expected: String(calcRight(p)) },
      solution: [
        t`${math`[${a}] ${op === '+' ? '+' : '\\cdot'} [${b}] = [${raw}]`}: operate on representatives.`,
        t`Reduce: ${math`${raw} = ${Math.floor(raw / m)} \times ${m} + ${mod(raw, m)}`}, so the answer is ${math`[${mod(raw, m)}]`}. You may also reduce first: ${math`[${a}] = [${mod(a, m)}]`} and ${math`[${b}] = [${mod(b, m)}]`}.`,
      ],
    };
  },
  solve: ({ m, a, b, op }) => {
    // Find the c in 0..m-1 whose class contains the result: m divides the difference.
    const raw = op === '+' ? a + b : a * b;
    return String(upTo(m).map((x) => x - 1).find((c) => (raw - c) % m === 0));
  },
  misconceptions: ({ m, a, b, op }): Misconception[] => (op === '+'
    ? [
      { response: String(mod(a, m) + mod(b, m)), why: t`Reducing each number is right, but the sum ${math`${mod(a, m)} + ${mod(b, m)}`} needs reducing again to lie between ${0} and ${m - 1}.` },
      { response: String(a + b), why: t`${a + b} is a representative, but the question asks for the one from ${0} to ${m - 1}.` },
      { response: String(mod(a - b, m)), why: t`That is ${math`[${a}] - [${b}]`}. Add the representatives.` },
    ]
    : [
      { response: String(mod(a, m) * mod(b, m)), why: t`Reduce the product ${math`${mod(a, m)} \times ${mod(b, m)}`} once more: the answer must be from ${0} to ${m - 1}.` },
      { response: String(a * b), why: t`${a * b} is a representative, but the question asks for the one from ${0} to ${m - 1}.` },
      { response: String(mod(a + b, m)), why: t`That is the sum. Multiply the representatives.` },
    ]),
});

// ---------------------------------------------------------------- a row of the multiplication table

interface RowP { m: number; k: number }

const tableRow = generator<RowP>({
  id: 'table-row',
  skill: 'Fill in a row of the multiplication table of Z_m, and read from it which products are 0 or 1.',
  params: (rng) => { const m = int(rng, 4, 9); return { m, k: int(rng, 2, m - 1) }; },
  sane: ({ m, k }) => (k >= 2 && k < m ? null : 'out of range'),
  problem: ({ m, k }) => {
    const row = upTo(m).map((j) => mod(k * (j - 1), m));
    return {
      prompt: t`Fill in the row of ${mk} ${math`= ${k}`} in the multiplication table of ${Z(m)}: ${math`${k} \cdot_{${m}} j`} for each ${math`j`}.`,
      answer: { kind: 'table', cell: 'exact', columns: [t`${math`j`}`, t`${math`${k} \cdot_{${m}} j`}`], rows: upTo(m).map((j) => [t`${j - 1}`, null]), expected: row.map(String) },
      solution: [
        t`Multiply ${k} by each ${math`j`} and take the remainder mod ${m}: ${math`${k} \times ${m - 1} = ${k * (m - 1)} \equiv ${mod(k * (m - 1), m)}`}, and so on.`,
        t`The row is ${math`${computedTex(row.join(',\\ '))}`}. ${row.includes(1) ? t`The ${1} is at ${math`j = ${row.indexOf(1)}`}, so ${k} has the multiplicative inverse ${row.indexOf(1)}.` : t`There is no ${1} in it, so ${k} has no multiplicative inverse in ${Z(m)}.`}`,
      ],
    };
  },
  solve: ({ m, k }) => upTo(m).map((j) => { let x = 0; for (let i = 0; i < j - 1; i++) x = (x + k) % m; return String(x); }),
  misconceptions: ({ m, k }): Misconception[] => [
    { response: upTo(m).map((j) => String(k * (j - 1))), why: t`Every entry of the table is in ${Z(m)}: reduce each product mod ${m}.` },
    { response: upTo(m).map((j) => String(mod(k + j - 1, m))), why: t`That is the addition table's row. Multiply.` },
  ],
});

// ---------------------------------------------------------------- additive inverses

interface InvP { m: number; k: number }

const additiveInverse = generator<InvP>({
  id: 'additive-inverse',
  skill: 'Find the additive inverse of k in Z_m, which is [-k]_m (exercise 2.1.4(b)).',
  params: (rng) => {
    for (;;) {
      const m = int(rng, 5, 30);
      const k = int(rng, 1, m - 1);
      if (2 * k !== m) return { m, k };
    }
  },
  sane: ({ m, k }) => (k >= 1 && k < m && 2 * k !== m ? null : 'out of range'),
  problem: ({ m, k }) => ({
    prompt: t`What is the additive inverse of ${k} in ${Z(m)}: the ${math`l`} in ${Z(m)} with ${math`${k} +_{${m}} l = ${0}`}?`,
    answer: { kind: 'exact', expected: String(m - k) },
    solution: [
      t`It is ${math`[-${k}]_{${m}}`}: ${math`${k} + (-${k}) = ${0}`}. As an element of ${Z(m)}, ${math`[-${k}]_{${m}} = ${m} - ${k} = ${m - k}`}.`,
      t`Check: ${math`${k} + ${m - k} = ${m} \equiv ${0} \pmod{${m}}`}.`,
    ],
  }),
  solve: ({ m, k }) => String(upTo(m).map((x) => x - 1).find((l) => (k + l) % m === 0)),
  misconceptions: ({ m, k }): Misconception[] => [
    { response: String(-k), why: t`${math`-${k}`} is not one of ${math`${0}, \ldots, ${m - 1}`}: the inverse in ${Z(m)} is its class's representative, ${m - k}.` },
    { response: String(k), why: t`${math`${k} + ${k} = ${2 * k}`}, which is not ${0} mod ${m}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const Z9: readonly (readonly [number, '+' | '*', number])[] = [[8, '+', 8], [24, '+', 11], [21, '*', 15], [8, '*', 8]];
const z9 = (a: number, op: '+' | '*', b: number): number => mod(op === '+' ? a + b : a * b, 9);
const bop1157 = auto({
  id: 'bop-11-5-7',
  source: cite('bop', 'Exercises for Section 11.5, exercise 7'),
  title: t`Calculations in ${Z(9)}`,
  prompt: t`Do the following calculations in ${Z(9)}, in each case expressing your answer as ${math`[a]`} with ${math`${0} \le a \le ${8}`}: (a) ${math`[${8}] + [${8}]`}, (b) ${math`[${24}] + [${11}]`}, (c) ${math`[${21}] \cdot [${15}]`}, (d) ${math`[${8}] \cdot [${8}]`}. Give each ${math`a`}.`,
  answer: { kind: 'table', cell: 'exact', columns: [t`calculation`, t`${math`a`}`], rows: Z9.map(([a, op, b]) => [[math`[${a}] ${op === '+' ? '+' : '\\cdot'} [${b}]`], null]), expected: Z9.map(([a, op, b]) => String(z9(a, op, b))) },
  solution: [
    t`(a) ${math`[${16}] = [${7}]`}. (b) ${math`[${35}] = [${8}]`}. (c) ${math`[${315}] = [${0}]`}, since ${math`${315} = ${35} \times ${9}`}; or reduce first: ${math`[${21}] = [${3}]`}, ${math`[${15}] = [${6}]`}, and ${math`${3} \times ${6} = ${18}`}. (d) ${math`[${64}] = [${1}]`}.`,
  ],
  reference: Z9.map(([a, op, b]) => String(z9(a, op, b))),
  verify: () => same('by subtracting nines', Z9.map(([a, op, b]) => { let x = op === '+' ? a + b : a * b; while (x >= 9) x -= 9; return x; }).join(), '7,8,0,1'),
  misconceptions: [{ response: ['16', '35', '315', '64'], why: t`Those are representatives. Each answer must be the one from ${0} to ${8}: reduce mod ${9}.` }],
  official: { source: cite('bop', 'Solutions, Section 11.5, exercise 7'), answer: ['7', '8', '0', '1'], agrees: true },
});

const notes62 = auto({
  id: 'notes-193-example-62-row',
  source: cite('cst-dm-notes', 'printed page 193, Example 62', true),
  title: t`A row of the table of ${Z(5)}`,
  prompt: t`Example ${62} of the notes gives the multiplication table of ${Z(5)}. Fill in its row for ${2}: ${math`${2} \cdot_{${5}} j`} for ${math`j = ${0}, \ldots, ${4}`}.`,
  answer: { kind: 'table', cell: 'exact', columns: [t`${math`j`}`, t`${math`${2} \cdot_{${5}} j`}`], rows: upTo(5).map((j) => [t`${j - 1}`, null]), expected: upTo(5).map((j) => String(mod(2 * (j - 1), 5))) },
  solution: [t`${math`${2} \times ${0}, \ldots, ${2} \times ${4}`} are ${math`${0}, ${2}, ${4}, ${6}, ${8}`}, which reduce to ${math`${0}, ${2}, ${4}, ${1}, ${3}`}. The non-zero entries are ${1} to ${4} in a new order: the "permutation pattern" the notes point out, and the ${1} in column ${3} says ${math`${2}^{-${1}} = ${3}`}.`],
  reference: upTo(5).map((j) => String(mod(2 * (j - 1), 5))),
  verify: () => same('the row by repeated addition', upTo(5).map((j) => { let x = 0; for (let i = 0; i < j - 1; i++) x = (x + 2) % 5; return x; }).join(), '0,2,4,1,3'),
  misconceptions: [{ response: ['0', '2', '4', '6', '8'], why: t`${6} and ${8} are not in ${Z(5)}: reduce them to ${1} and ${3}.` }],
  official: { source: cite('cst-dm-notes', 'printed page 193, Example 62'), answer: ['0', '2', '4', '1', '3'], agrees: true },
});

const sheet226 = auto({
  id: 'sheet-2-2-6-z6-additive',
  source: cite('cst-dm-sw1', 'Exercises 2, 2.2.6', true),
  title: t`Additive inverses in ${Z(6)}`,
  prompt: t`Exercise ${2}.${2}.${6} asks for the inverse tables of ${Z(3)}, ${Z(6)}, and ${Z(7)}. Give the additive inverse ${math`-k`} of each ${math`k`} in ${Z(6)}.`,
  answer: { kind: 'table', cell: 'exact', columns: [t`${mk}`, t`${math`-k`} in ${Z(6)}`], rows: upTo(6).map((k) => [t`${k - 1}`, null]), expected: upTo(6).map((k) => String(mod(-(k - 1), 6))) },
  solution: [t`${math`-k = [-k]_{${6}} = ${6} - k`} for ${math`k \ne ${0}`}, and ${math`-${0} = ${0}`}: ${math`${0}, ${5}, ${4}, ${3}, ${2}, ${1}`}. Every element has an additive inverse, whatever ${mm} is; multiplicative inverses are another matter.`],
  reference: upTo(6).map((k) => String(mod(-(k - 1), 6))),
  verify: () => same('the l with k + l = 0 found by search', upTo(6).map((k) => upTo(6).map((l) => l - 1).find((l) => (k - 1 + l) % 6 === 0)).join(), '0,5,4,3,2,1'),
  misconceptions: [{ response: ['0', '-1', '-2', '-3', '-4', '-5'], why: t`Negative numbers are not elements of ${Z(6)}: ${math`-${1}`} is represented by ${5}, and so on.` }],
  official: { source: cite('cst-dm-sols-2324-2', '2.2.6'), answer: ['0', '5', '4', '3', '2', '1'], agrees: true },
});

const sheet214 = supervision({
  id: 'sheet-2-1-4',
  source: cite('cst-dm-sw1', 'Exercises 2, 2.1.4'),
  title: t`Associativity and additive inverses`,
  prompt: t`Let ${mm} be a positive integer. (a) Prove that addition and multiplication in ${Z(mm)} are associative: ${math`(i +_{m} j) +_{m} k = i +_{m} (j +_{m} k)`} and the same for ${math`\cdot_{m}`}. (b) Prove that the additive inverse of ${mk} in ${Z(mm)} is ${math`[-k]_{m}`}. Use the remainder identities of exercise ${2}.${1}.${3}.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-2', '2.1.4'),
});
const bop1158 = supervision({
  id: 'bop-11-5-8',
  source: cite('bop', 'Exercises for Section 11.5, exercise 8'),
  title: t`Addition is well defined`,
  prompt: t`Suppose ${math`[a], [b] \in \mathbb{Z}_{n}`}, and ${math`[a] = [a']`} and ${math`[b] = [b']`}. Alice adds them as ${math`[a + b]`}; Bob as ${math`[a' + b']`}. Show that their answers are the same. Why is this needed before ${math`\mathbb{Z}_{n}`} can be said to have an addition at all?`,
  writeUp: 'proof',
});
const notes60 = supervision({
  id: 'notes-190-example-60',
  source: cite('cst-dm-notes', 'printed page 190, Example 60'),
  title: t`${Z(2)} is the booleans`,
  prompt: t`Example ${60} of the notes: ${math`(\mathbb{Z}_{${2}}, ${0}, +_{${2}}, ${1}, \cdot_{${2}})`} is the booleans with XOR as addition and AND as multiplication. Write out both tables of ${Z(2)} and the truth tables of XOR and AND, and explain the correspondence. Which boolean operation would ${math`+`} be if ${0} stood for true?`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

const Z4 = upTo(4).map((i) => i - 1);
const mulRow = (m: number, k: number): number[] => upTo(m).map((j) => mod(k * (j - 1), m));

export const modularIntegers: TopicContent = {
  topicId: 'num.modular-integers',
  goal: t`Work in ${Z(mm)}, the remainders ${math`${0}, \ldots, m - ${1}`} with addition and multiplication modulo ${mm}, and read its operation tables.`,
  objective: t`Calculate in the integers modulo m, read their tables, and see which laws of arithmetic survive.`,
  why: t`It is a number system of its own, used throughout cryptography; next, which elements have reciprocals.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`Clock arithmetic` },
    { kind: 'hook', text: t`On a clock, ${9} o'clock plus ${5} hours is ${2} o'clock. Clocks already do arithmetic in which only ${12} numbers exist. Can you multiply in such a world? You can, but strange things happen: with only the numbers ${0}, ${1}, ${2}, ${3}, two times two is zero.` },
    { kind: 'narrative', text: t`To make this precise we need a set of numbers and two operations on it, defined so that every answer lands back in the set. The remainder does exactly that. Write ${math`\mathrm{rem}(a, m)`} for the remainder when ${math`a`} is divided by ${mm}: a number from ${0} to ${math`m - ${1}`}.` },

    { kind: 'section', title: t`The integers modulo m` },
    { kind: 'definition', name: t`Integers modulo m`, formal: t`For a positive integer ${mm}, the [[integers-mod-m|integers modulo]] ${mm} are the set ${math`\mathbb{Z}_{m} = \{${0}, ${1}, \ldots, m - ${1}\}`} with the operations ${dmath`k +_{m} l = \mathrm{rem}(k + l, m), \qquad k \cdot_{m} l = \mathrm{rem}(k l, m).`}`, plain: t`Add or multiply as usual, then keep only the remainder. In ${Z(7)}: ${math`${5} +_{${7}} ${4} = \mathrm{rem}(${9}, ${7}) = ${2}`}, and ${math`${5} \cdot_{${7}} ${4} = \mathrm{rem}(${20}, ${7}) = ${6}`}.` },
    {
      kind: 'table',
      caption: t`The multiplication table of ${Z(4)}: row ${mk}, column ${math`l`} holds ${math`k \cdot_{${4}} l`}.`,
      head: [t`${math`\cdot_{${4}}`}`, ...Z4.map((l) => t`${l}`)],
      rows: Z4.map((k) => [t`${k}`, ...mulRow(4, k).map((x) => t`${x}`)]),
    },
    { kind: 'p', text: t`Read the row for ${2}: ${listOf(mulRow(4, 2))}. So ${math`${2} \cdot_{${4}} ${2} = ${0}`}, two non-zero elements with product ${0}. The row for ${3} is ${listOf(mulRow(4, 3))}, and its ${1} says ${math`${3} \cdot_{${4}} ${3} = ${1}`}: ${3} is its own reciprocal. This is the notes' Example ${61}.` },
    checkFrom(zmCalc, { m: 11, a: 30, b: 17, op: '*' }, t`Reduce first: ${math`${30} \equiv ${8}`} and ${math`${17} \equiv ${6}`}, then ${math`${8} \times ${6} = ${48} = ${4} \times ${11} + ${4}`}.`),

    { kind: 'section', title: t`Any representative will do` },
    { kind: 'narrative', text: t`Book of Proof writes the elements as classes: ${math`[a]`} is the set of all integers congruent to ${math`a`} modulo ${mm}, so in ${Z(9)}, ${math`[${24}] = [${6}]`}. Then it adds by ${math`[a] + [b] = [a + b]`}. But ${math`[${24}]`} could also be written ${math`[${6}]`} or ${math`[-${3}]`}. Does the answer depend on which name you use? If it did, "addition" would not be a single operation at all.` },
    { kind: 'theorem', name: t`Well defined`, statement: t`If ${math`a \equiv a'`} and ${math`b \equiv b' \pmod{m}`}, then ${math`\mathrm{rem}(a + b, m) = \mathrm{rem}(a' + b', m)`} and ${math`\mathrm{rem}(ab, m) = \mathrm{rem}(a'b', m)`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Congruence respects arithmetic`, text: t`From ${math`a \equiv a'`} and ${math`b \equiv b'`}: ${math`a + b \equiv a' + b'`} and ${math`ab \equiv a'b' \pmod{m}`}.`, why: { q: t`Why?`, a: t`${math`(a + b) - (a' + b') = (a - a') + (b - b')`}, and ${math`ab - a'b' = a(b - b') + b'(a - a')`}: multiples of ${mm} in both cases.` } },
        { label: t`Congruent numbers share a remainder`, text: t`If ${math`x \equiv y \pmod{m}`}, then ${math`\mathrm{rem}(x, m) = \mathrm{rem}(y, m)`}.`, why: { q: t`Why?`, a: t`Write ${math`x = qm + r`} and ${math`y = q'm + r'`} with ${math`${0} \le r, r' < m`}. Then ${math`r - r' = (x - y) - (q - q')m`} is a multiple of ${mm} strictly between ${math`-m`} and ${mm}, so it is ${0}.` } },
        { label: t`Combine`, text: t`Apply the second step to the congruences of the first.` },
      ],
    },
    { kind: 'p', text: t`So you may reduce before or after operating, whichever is easier: ${math`[${24}] + [${11}] = [${35}] = [${8}]`} in ${Z(9)}, or ${math`[${6}] + [${2}] = [${8}]`}.` },

    { kind: 'section', title: t`Which laws survive?` },
    { kind: 'theorem', name: t`Laws of ${Z(mm)}`, statement: t`${math`+_{m}`} and ${math`\cdot_{m}`} are commutative and associative, ${math`\cdot_{m}`} distributes over ${math`+_{m}`}, ${0} and ${1} are identities, and every ${mk} has an additive inverse, ${math`${0}`} for ${math`k = ${0}`} and ${math`m - k`} otherwise.` },
    { kind: 'p', text: t`In plain words: ${Z(mm)} is a commutative ring (the notes' Proposition ${63}). Each law is inherited from the integers, because ${math`\mathrm{rem}`} can be taken at any stage. Proving associativity carefully is exercise ${2}.${1}.${4}, the Cambridge problem for this lesson.`, why: { q: t`Why is ${math`m - k`} the additive inverse of ${mk}?`, a: t`${math`k + (m - k) = m`}, whose remainder is ${0}. For example, in ${Z(7)} the inverse of ${5} is ${2}.` } },
    { kind: 'p', text: t`What can fail is division. In ${Z(4)}, ${2} has no reciprocal: its row ${listOf(mulRow(4, 2))} has no ${1}. In ${Z(5)} (Example ${62}) every non-zero row is a rearrangement of ${listOf([1, 2, 3, 4])}, so every non-zero element has one. Which ${mm} behave like ${5} is the subject of the lesson on inverses.` },
    checkFrom(additiveInverse, { m: 13, k: 5 }, t`${math`${5} + ${8} = ${13}`}, which is ${0} in ${Z(13)}.`),

    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`If ${math`k \cdot_{m} l = ${0}`}, then ${math`k = ${0}`} or ${math`l = ${0}`}.`, counterexample: t`${math`${2} \cdot_{${4}} ${2} = ${0}`}. In ${Z(mm)} with ${mm} composite, non-zero elements can multiply to ${0}, so you cannot cancel.` },
    { kind: 'pitfall', claim: t`The additive inverse of ${3} in ${Z(7)} is ${math`-${3}`}.`, counterexample: t`${math`-${3}`} is not an element of ${Z(7)}, which is ${listOf([0, 1, 2, 3, 4, 5, 6])}. The inverse is its representative ${4}: ${math`${3} +_{${7}} ${4} = ${0}`}.` },
    { kind: 'pitfall', claim: t`${math`${5} \cdot_{${7}} ${4} = ${20}`}.`, counterexample: t`${20} is not in ${Z(7)}. Every answer must be reduced: ${math`${20} = ${2} \times ${7} + ${6}`}, so the product is ${6}.` },
    { kind: 'takeaway', text: t`${Z(mm)} is the remainders with arithmetic followed by reduction: every ring law survives, and division may not.` },
  ],
  examples: [
    { ...workedCambridge(bop1157), examiner: t`The examiner looks for each answer reduced into the range ${0} to ${8}, with the representative used shown.` },
    worked(zmCalc, { m: 7, a: 23, b: 19, op: '*' }, t`A product in ${Z(7)}`),
    worked(tableRow, { m: 6, k: 4 }, t`The row of ${4} in ${Z(6)}`),
  ],
  generators: [zmCalc, tableRow, additiveInverse],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['integers-mod-m'],
  cambridge: [notes62, sheet226, sheet214, bop1158, notes60],
  // The CST proof first, then the notes' Example 60. The table row and the inverse list are drill.
  gate: ['sheet-2-1-4', 'notes-190-example-60'],
  recall: [
    { front: t`Define ${Z(mm)}.`, back: t`${math`\{${0}, \ldots, m - ${1}\}`} with ${math`k +_{m} l = \mathrm{rem}(k + l, m)`} and ${math`k \cdot_{m} l = \mathrm{rem}(kl, m)`}.` },
    { front: t`Why is addition on classes ${math`[a]`} well defined?`, back: t`If ${math`a \equiv a'`} and ${math`b \equiv b'`} then ${math`a + b \equiv a' + b'`}, and congruent numbers have the same remainder.` },
    { front: t`The additive inverse of ${mk} in ${Z(mm)}.`, back: t`${math`m - k`} for ${math`k \ne ${0}`}, and ${0} for ${0}.` },
  ],
  proofOrder: [{
    title: t`Multiplication on ${Z(mm)} is well defined`,
    steps: [
      t`Suppose ${math`a \equiv a'`} and ${math`b \equiv b' \pmod{m}`}.`,
      t`Write ${math`ab - a'b' = a(b - b') + b'(a - a')`}, a multiple of ${mm}.`,
      t`So ${math`ab \equiv a'b' \pmod{m}`}.`,
      t`Congruent numbers leave the same remainder, so ${math`\mathrm{rem}(ab, m) = \mathrm{rem}(a'b', m)`}.`,
    ],
  }],
};
