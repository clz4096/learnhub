/**
 * proof.cases: Proof by cases: split a claim into cases that cover every possibility and
 * prove each. The lesson follows the CST notes on disjunction (printed pages 104 to 115:
 * proving and using "or", Proposition 25 and Lemma 26 on squares modulo 4), Book of Proof
 * Sections 4.4 and 4.5 (1 + (-1)^n (2n - 1) is a multiple of 4; "without loss of
 * generality"), and the STEP Support hints to Assignment 6 Q3 (2005 STEP I Q1: be
 * systematic, cases by the number of nines, and show there are no more). The problems are
 * Assignment 6 Q3, Book of Proof Chapter 4 exercises 14 to 16, and supervision exercises
 * 1.2.8, 2.2.3, 2.3.1, and 3.2.7, with the 2023-24 official solutions. IA Numbers and Sets Example
 * Sheet 1, Q1 (squares that are multiples of three) moved here from Algebraic argument (Rule 1,
 * 2026-10-08): its proof is by cases on the remainder.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { factorial, int, pick, upTo } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { computed, computedTex, dmath, listOf, math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const [mn, mk] = [math`n`, math`k`];
const mod = (a: number, m: number): number => ((a % m) + m) % m;

// ---------------------------------------------------------------- remainders by cases

interface ResP { m: number; k: number }

const residues = generator<ResP>({
  id: 'residue-cases',
  skill: 'Find the remainder of n^k on division by m in every case: one case for each possible remainder of n, as the CST notes do for squares modulo 4.',
  params: (rng) => ({ m: pick(rng, [3, 4, 5, 6, 8]), k: pick(rng, [2, 3]) }),
  sane: ({ m, k }) => ([3, 4, 5, 6, 8].includes(m) && (k === 2 || k === 3) ? null : 'out of range'),
  problem: ({ m, k }) => {
    const rs = upTo(m).map((i) => i - 1);
    return {
      prompt: t`Every integer ${mn} leaves one of the remainders ${listOf(rs)} on division by ${m}. Fill in, for each case, the remainder when ${math`n^{${k}}`} is divided by ${m}.`,
      answer: {
        kind: 'table', cell: 'exact',
        columns: [t`remainder of ${mn}`, t`remainder of ${math`n^{${k}}`}`],
        rows: rs.map((r) => [t`${r}`, null]),
        expected: rs.map((r) => String(mod(r ** k, m))),
      },
      solution: [
        t`The cases ${math`n = ${m}q + r`} for ${math`r = ${0}, \ldots, ${m - 1}`} cover every integer. In each case ${math`n^{${k}}`} leaves the same remainder as ${math`r^{${k}}`}, because every other term of the expansion of ${math`(${m}q + r)^{${k}}`} has a factor ${m}.`,
        ...rs.map((r) => t`${math`r = ${r}`}: ${math`${r}^{${k}} = ${r ** k} = ${m} \times ${Math.floor(r ** k / m)} + ${mod(r ** k, m)}`}, remainder ${mod(r ** k, m)}.`),
      ],
    };
  },
  solve: ({ m, k }) => upTo(m).map((i) => {
    // Every integer with remainder r gives the same answer: check n = r, r + m, ..., r - 5m all agree, and return it.
    const got = new Set([-5, -1, 0, 1, 4].map((q) => mod((i - 1 + q * m) ** k, m)));
    return got.size === 1 ? String([...got][0]) : '?';
  }),
  misconceptions: ({ m, k }): Misconception[] => {
    const rs = upTo(m).map((i) => i - 1);
    return [
      { response: rs.map((r) => String(r ** k)), why: t`Those are the powers themselves. A remainder on division by ${m} is less than ${m}: take ${math`r^{${k}}`} and subtract multiples of ${m}.` },
      { response: rs.map((r) => String(mod(k * r, m))), why: t`That multiplies by ${k}. The question asks for the power ${math`n^{${k}}`}: multiply ${mn} by itself.` },
      { response: rs.map(String), why: t`The remainder of ${mn} is not the remainder of ${math`n^{${k}}`}: work out ${math`r^{${k}}`} for each case.` },
    ];
  },
});

// ---------------------------------------------------------------- parity by cases

type Parity = 'even' | 'odd' | 'even-when-even' | 'even-when-odd';
const PARITY_OPTIONS: readonly ChoiceOption[] = [
  { id: 'even', label: t`It is even for every integer` },
  { id: 'odd', label: t`It is odd for every integer` },
  { id: 'even-when-even', label: t`It is even exactly when ${mn} is even` },
  { id: 'even-when-odd', label: t`It is even exactly when ${mn} is odd` },
];

interface ParP { a: number; b: number; c: number }
const polyText = ({ a, b, c }: ParP): Rich => [math`${a === 1 ? '' : a}n^{${2}} + ${b === 1 ? '' : b}n + ${c}`];
function parityOf({ a, b, c }: ParP): { atEven: number; atOdd: number; verdict: Parity } {
  const atEven = mod(c, 2);
  const atOdd = mod(a + b + c, 2);
  const verdict: Parity = atEven === 0 ? (atOdd === 0 ? 'even' : 'even-when-even') : atOdd === 0 ? 'even-when-odd' : 'odd';
  return { atEven, atOdd, verdict };
}

const parityCases = generator<ParP>({
  id: 'parity-cases',
  skill: 'Decide the parity of a quadratic in n by the two cases n even and n odd, as in Book of Proof Chapter 4, exercises 14 and 15.',
  params: (rng) => ({ a: int(rng, 1, 9), b: int(rng, 1, 9), c: int(rng, 1, 9) }),
  sane: ({ a, b, c }) => (a >= 1 && a <= 9 && b >= 1 && b <= 9 && c >= 1 && c <= 9 ? null : 'out of range'),
  problem: (p) => {
    const { atEven, atOdd, verdict } = parityOf(p);
    const word = (x: number): string => (x === 0 ? 'even' : 'odd');
    return {
      prompt: t`${mn} is an integer. Which is true of ${polyText(p)}?`,
      answer: { kind: 'choice', options: PARITY_OPTIONS, correct: verdict },
      solution: [
        t`Case ${1}: ${mn} is even, ${math`n = ${2}j`}. Then ${math`${p.a}n^{${2}}`} and ${math`${p.b}n`} are even, so the parity is that of ${p.c}: ${word(atEven)}.`,
        t`Case ${2}: ${mn} is odd, ${math`n = ${2}j + ${1}`}. Then ${math`n^{${2}}`} and ${mn} are odd, so ${math`${p.a}n^{${2}}`} has the parity of ${p.a} and ${math`${p.b}n`} that of ${p.b}; the sum has the parity of ${math`${p.a} + ${p.b} + ${p.c} = ${p.a + p.b + p.c}`}: ${word(atOdd)}.`,
        t`The two cases cover every integer, so: ${PARITY_OPTIONS.find((o) => o.id === verdict)?.label ?? t``}.`,
      ],
    };
  },
  solve: (p) => {
    // Evaluate at every n from -40 to 40 and read the pattern.
    const ns = upTo(81).map((i) => i - 41);
    const even = (n: number): boolean => mod(p.a * n * n + p.b * n + p.c, 2) === 0;
    if (ns.every(even)) return ['even'];
    if (ns.every((n) => !even(n))) return ['odd'];
    return [ns.every((n) => even(n) === (mod(n, 2) === 0)) ? 'even-when-even' : 'even-when-odd'];
  },
  misconceptions: (p): Misconception[] => {
    const { atEven, atOdd, verdict } = parityOf(p);
    const out: Misconception[] = [];
    const onlyEven: Parity = atEven === 0 ? 'even' : 'odd';
    if (onlyEven !== verdict) out.push({ response: [onlyEven], why: t`That checks only the case ${mn} even. A proof by cases must cover ${mn} odd as well: there the value has the parity of ${p.a + p.b + p.c}.` });
    const onlyOdd: Parity = atOdd === 0 ? 'even' : 'odd';
    if (onlyOdd !== verdict && onlyOdd !== onlyEven) out.push({ response: [onlyOdd], why: t`That checks only the case ${mn} odd. With ${mn} even the value has the parity of ${p.c}.` });
    const swapped: Parity = verdict === 'even-when-even' ? 'even-when-odd' : verdict === 'even-when-odd' ? 'even-when-even' : verdict === 'even' ? 'odd' : 'even';
    out.push({ response: [swapped], why: t`Check the cases again: with ${mn} even the value has the parity of ${p.c}, and with ${mn} odd that of ${p.a + p.b + p.c}.` });
    for (const o of ['even', 'odd', 'even-when-even', 'even-when-odd'] as const) {
      if (out.length >= 3) break;
      if (o !== verdict && !out.some((m) => (m.response as string[])[0] === o)) out.push({ response: [o], why: t`Work out each case: ${mn} even gives the parity of ${p.c}; ${mn} odd gives the parity of ${p.a + p.b + p.c}.` });
    }
    return out;
  },
});

// ---------------------------------------------------------------- counting by cases (2005 STEP I Q1)

/** The digit multisets of k digits from 1 to 9 summing to 9k - d, each as the digits, largest first. */
function digitCases(k: number, d: number): number[][] {
  const out: number[][] = [];
  const go = (left: number, slots: number, max: number, acc: number[]): void => {
    if (slots === 0) { if (left === 0) out.push(acc.map((x) => 9 - x)); return; }
    for (let x = Math.min(max, left); x >= 0; x--) go(left - x, slots - 1, x, [...acc, x]);
  };
  go(d, k, 8, []);
  // Most nines first, as the hints count them.
  return out.map((ds) => [...ds].sort((a, b) => b - a)).sort((x, y) => y.filter((v) => v === 9).length - x.filter((v) => v === 9).length || y.join('').localeCompare(x.join('')));
}
/** Arrangements of a multiset of digits: k! over the factorials of the repeats. */
function arrangements(ds: readonly number[]): number {
  const counts = new Map<number, number>();
  for (const x of ds) counts.set(x, (counts.get(x) ?? 0) + 1);
  return [...counts.values()].reduce((a, c) => a / factorial(c), factorial(ds.length));
}

interface SumP { k: number; d: number }

const digitSums = generator<SumP>({
  id: 'digit-sums',
  skill: 'Count numbers with a given digit sum by cases on the number of nines, as in STEP Support Assignment 6 Q3 (2005 STEP I Q1).',
  params: (rng) => ({ k: int(rng, 3, 5), d: int(rng, 2, 6) }),
  sane: ({ k, d }) => (k >= 3 && k <= 5 && d >= 2 && d <= 6 ? null : 'out of range'),
  problem: ({ k, d }) => {
    const cases = digitCases(k, d);
    const total = cases.reduce((s, ds) => s + arrangements(ds), 0);
    return {
      prompt: t`How many ${k}-digit numbers have digits that add up to ${9 * k - d}?`,
      answer: { kind: 'exact', expected: String(total) },
      solution: [
        t`The largest possible digit sum is ${math`${9} \times ${k} = ${9 * k}`}, so the digits fall short of all nines by ${d} in total. Be systematic: take the cases by the digits used, most nines first, so no case is missed.`,
        ...cases.map((ds) => t`Digits ${listOf(ds)}: ${arrangements(ds)} arrangement${arrangements(ds) === 1 ? '' : 's'} (choose the places of the digits that are not nine).`),
        t`These cases are every way to share out the shortfall of ${d}, so there are no more. Total: ${math`${computedTex(cases.map((ds) => arrangements(ds)).join(' + '))} = ${total}`}.`,
      ],
    };
  },
  solve: ({ k, d }) => {
    // Brute force over every k-digit number.
    let n = 0;
    for (let x = 10 ** (k - 1); x < 10 ** k; x++) {
      let s = 0;
      for (let y = x; y > 0; y = Math.floor(y / 10)) s += y % 10;
      if (s === 9 * k - d) n++;
    }
    return String(n);
  },
  misconceptions: ({ k, d }): Misconception[] => {
    const cases = digitCases(k, d);
    return [
      { response: String(cases.length), why: t`That counts the digit patterns, the cases. Each case gives several numbers: count the arrangements of its digits and add.` },
      { response: String(arrangements(cases[0] as number[])), why: t`That is only the first case, with the most nines. The other cases count too: list them all until the shortfall of ${d} is shared out every possible way.` },
    ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const a6i = auto({
  id: 'a6-q3-i',
  source: cite('step-f06', 'Q3(i) (2005 STEP I Q1)'),
  title: t`Digit sum ${43}`,
  prompt: t`${computed(String(47231))} is a five-digit number whose digits sum to ${math`${4} + ${7} + ${2} + ${3} + ${1} = ${17}`}. How many five-digit numbers have digits that sum to ${43}? Explain your reasoning clearly: show that you have them all.`,
  answer: { kind: 'exact', expected: String(digitCases(5, 2).reduce((s, ds) => s + arrangements(ds), 0)) },
  solution: [
    t`Count by the number of nines, as the hints do. Five nines sum to ${45}, too many.`,
    t`Four nines: the other digit is ${math`${43} - ${36} = ${7}`}, and it can go in any of ${5} places: ${arrangements([9, 9, 9, 9, 7])} numbers.`,
    t`Three nines: the other two digits sum to ${math`${43} - ${27} = ${16}`}, so both are ${8}. Choosing the places of the two eights: ${math`\binom{${5}}{${2}} = ${arrangements([9, 9, 9, 8, 8])}`} numbers.`,
    t`Two nines or fewer: the largest sum is ${math`${9} + ${9} + ${8} + ${8} + ${8} = ${9 + 9 + 8 + 8 + 8}`}, short of ${43}. So there are no more, and the total is ${math`${arrangements([9, 9, 9, 9, 7])} + ${arrangements([9, 9, 9, 8, 8])} = ${arrangements([9, 9, 9, 9, 7]) + arrangements([9, 9, 9, 8, 8])}`}.`,
  ],
  reference: String(arrangements([9, 9, 9, 9, 7]) + arrangements([9, 9, 9, 8, 8])),
  verify: () => same('A6 Q3(i) by brute force', digitSums.at({ k: 5, d: 2 }).reference, arrangements([9, 9, 9, 9, 7]) + arrangements([9, 9, 9, 8, 8])),
  misconceptions: [{ response: String(arrangements([9, 9, 9, 9, 7])), why: t`That is only the case with four nines. Three nines and two eights also sum to ${43}.` }],
  official: { source: cite('step-f06-hints', 'Q3(i)'), answer: '15', agrees: true },
});

const a6ii = auto({
  id: 'a6-q3-ii',
  source: cite('step-f06', 'Q3(ii) (2005 STEP I Q1)'),
  title: t`Digit sum ${39}`,
  prompt: t`How many five-digit numbers are there whose digits sum to ${39}?`,
  answer: { kind: 'exact', expected: String(digitCases(5, 6).reduce((s, ds) => s + arrangements(ds), 0)) },
  solution: [
    t`The shortfall from ${45} is ${6}. Take the cases by the number of nines, from four down to none.`,
    ...digitCases(5, 6).map((ds) => t`Digits ${listOf(ds)}: ${arrangements(ds)} numbers.`),
    t`Total: ${math`${computedTex(digitCases(5, 6).map((ds) => arrangements(ds)).join(' + '))} = ${digitCases(5, 6).reduce((s, ds) => s + arrangements(ds), 0)}`}.`,
    t`Count the complement when it is smaller: here, the shortfall from all nines.`,
  ],
  reference: String(digitCases(5, 6).reduce((s, ds) => s + arrangements(ds), 0)),
  verify: () => same('A6 Q3(ii) by brute force', digitSums.at({ k: 5, d: 6 }).reference, digitCases(5, 6).reduce((s, ds) => s + arrangements(ds), 0)),
  misconceptions: [{ response: String(digitCases(5, 6).length), why: t`That is the number of cases. Each case is several numbers: count the arrangements in each.` }],
  official: { source: cite('step-f06-hints', 'Q3(ii)'), answer: '210', agrees: true },
  nudge: t`Not quite. Count by the shortfall from ${45}, the largest possible digit sum, rather than by the digits themselves.`,
  hints: [
    t`What is the largest digit sum of a five-digit number, and how far short of it is ${39}?`,
    t`In how many ways can that shortfall be shared among the five digits, listed by the number of nines?`,
    t`For each set of digits, how many different orders are there, with repeated digits counted once?`,
  ],
});

const lemma26 = auto({
  id: 'sw-2-2-3-cases',
  source: cite('cst-dm-sw1', 'Exercises 2, 2.2.3', true),
  title: t`Squares modulo ${4}, case by case`,
  prompt: t`The supervision exercise asks to show that for every integer ${mn}, the remainder when ${math`n^{${2}}`} is divided by ${4} is ${0} or ${1}. Split into two cases and give the remainder in each.`,
  answer: {
    kind: 'table', cell: 'exact', columns: [t`case`, t`remainder of ${math`n^{${2}}`} on division by ${4}`],
    rows: [[t`${mn} even, ${math`n = ${2}m`}`, null], [t`${mn} odd, ${math`n = ${2}m + ${1}`}`, null]],
    expected: ['0', '1'],
  },
  solution: [
    t`Even: ${math`n^{${2}} = ${4}m^{${2}}`}, remainder ${0}.`,
    t`Odd: ${math`n^{${2}} = ${4}m^{${2}} + ${4}m + ${1} = ${4}m(m + ${1}) + ${1}`}, remainder ${1}. Every integer is even or odd, so the remainder is always ${0} or ${1}.`,
    t`Split by parity, then expand: the remainder can be read off.`,
  ],
  reference: ['0', '1'],
  verify: () => {
    const ns = upTo(201).map((i) => i - 101);
    return same('even and odd n from -100 to 100', [...new Set(ns.filter((n) => mod(n, 2) === 0).map((n) => mod(n * n, 4)))].join() + '|' + [...new Set(ns.filter((n) => mod(n, 2) === 1).map((n) => mod(n * n, 4)))].join(), '0|1');
  },
  misconceptions: [{ response: ['0', '0'], why: t`An odd square is not a multiple of ${4}: ${math`(${2}m + ${1})^{${2}}`} is ${math`${4}m(m + ${1}) + ${1}`}.` }],
  // The official solution: "This is Lemma 26 of the notes", which gives 0 for even n and 1 for odd n.
  official: { source: cite('cst-dm-notes', 'printed page 110, Lemma 26'), answer: ['0', '1'], agrees: true },
  nudge: t`Not quite. Expand the square in each case and look for a multiple of ${4}.`,
  hints: [
    t`What is ${math`n^{${2}}`} when ${math`n = ${2}m`}?`,
    t`What is ${math`n^{${2}}`} when ${math`n = ${2}m + ${1}`}, expanded?`,
    t`Which part of each expansion is a multiple of ${4}, and what is left over?`,
  ],
});

const odd8 = auto({
  id: 'sw-3-2-7-b',
  source: cite('cst-dm-sw1', 'Exercises 3, 3.2.7(b)', true),
  title: t`Odd squares modulo ${8}`,
  prompt: t`Let ${mn} be an odd integer. What is the remainder when ${math`n^{${2}}`} is divided by ${8}?`,
  answer: { kind: 'exact', expected: '1' },
  solution: [
    t`Write ${math`n = ${2}k + ${1}`}. Then ${math`n^{${2}} = ${4}k(k + ${1}) + ${1}`}.`,
    t`Two cases, as the official solution takes: ${mk} even or ${mk} odd. Either way one of ${mk} and ${math`k + ${1}`} is even, so ${math`${4}k(k + ${1})`} is a multiple of ${8}, and the remainder is ${1}.`,
    t`A product of consecutive integers is even, and that extra factor ${2} often decides a remainder.`,
  ],
  reference: '1',
  verify: () => same('every odd n from -99 to 99', [...new Set(upTo(199).map((i) => i - 100).filter((n) => mod(n, 2) === 1).map((n) => mod(n * n, 8)))].join(), '1'),
  misconceptions: [{ response: '4', why: t`${math`${4}k(k + ${1})`} is a multiple of ${8}, not only of ${4}: one of ${mk} and ${math`k + ${1}`} is even. Try ${math`n = ${3}`}: ${9} leaves ${1}.` }],
  official: { source: cite('cst-dm-sols-2324-3', '3.2.7(b)'), answer: '1', agrees: true },
  nudge: t`Not quite. Write ${math`n = ${2}k + ${1}`} and look closely at ${math`k(k + ${1})`}.`,
  hints: [
    t`With ${math`n = ${2}k + ${1}`}, what is ${math`n^{${2}}`} expanded?`,
    t`Why is ${math`k(k + ${1})`} always even?`,
    t`So what can be said of ${math`${4}k(k + ${1})`} modulo ${8}?`,
  ],
});

function bopParity(o: { n: number; p: ParP; official?: Parity }) {
  const { verdict } = parityOf(o.p);
  const at = `Chapter 4, exercise ${o.n}`;
  const spec: Parameters<typeof auto>[0] = {
    id: `bop-4-${o.n}`,
    source: cite('bop', at, true),
    title: t`The parity of ${polyText(o.p)}`,
    prompt: t`${mn} is an integer. Which is true of ${polyText(o.p)}? (Try cases.)`,
    answer: { kind: 'choice', options: PARITY_OPTIONS, correct: verdict },
    solution: [...parityCases.at(o.p).problem.solution, t`Split by parity; in each case only the parity of each term matters.`],
    reference: verdict,
    verify: () => same(`Book of Proof ${at} by evaluation`, (parityCases.at(o.p).reference as string[])[0], verdict),
    misconceptions: parityCases.at(o.p).misconceptions,
    nudge: t`Not quite. Two cases, ${mn} even and ${mn} odd, settle it; check the parity of each term in both.`,
    hints: [
      t`When ${mn} is even, what is the parity of each term?`,
      t`When ${mn} is odd, what is the parity of each term?`,
      t`In each case, what is the parity of the sum?`,
    ],
  };
  if (o.official !== undefined) spec.official = { source: cite('bop', `Solutions, ${at}`), answer: o.official, agrees: true };
  return auto(spec);
}
const bop14 = bopParity({ n: 14, p: { a: 5, b: 3, c: 7 } });
const bop15 = bopParity({ n: 15, p: { a: 1, b: 3, c: 4 }, official: 'even' });

const K44 = -20;
const bop44 = auto({
  id: 'bop-4-4-k',
  source: cite('bop', 'Section 4.4, the second proposition', true),
  title: t`Every multiple of ${4}`,
  prompt: t`Book of Proof proves that every multiple of ${4} equals ${math`${1} + (-${1})^{n}(${2}n - ${1})`} for some natural number ${mn}, by cases on the sign of the multiple. Find ${math`n \in \mathbb{N}`} with ${math`${1} + (-${1})^{n}(${2}n - ${1}) = ${K44}`}.`,
  answer: {
    kind: 'witness', count: 1, names: ['n'], example: String(1 - K44 / 2),
    check: ([v]) => {
      if (v === undefined || v.den !== 1n || v.num < 1n) return 'Give a natural number n, at least 1.';
      const n = Number(v.num);
      const val = 1 + (n % 2 === 0 ? 1 : -1) * (2 * n - 1);
      return val === K44 ? null : `At n = ${n} the expression is ${val}, not ${K44}.`;
    },
  },
  solution: [
    t`${K44} is ${math`${4}a`} with ${math`a = ${K44 / 4}`}, which is negative: Case ${3} of the proof. It takes ${math`n = ${1} - ${2}a = ${1 - K44 / 2}`}, an odd number, so ${math`(-${1})^{n} = -${1}`}.`,
    t`Check: ${math`${1} - (${2} \times ${1 - K44 / 2} - ${1}) = ${1 - (2 * (1 - K44 / 2) - 1)}`}. For a positive multiple the proof takes an even ${mn} (Case ${2}), and for ${0} it takes ${math`n = ${1}`} (Case ${1}).`,
    t`Choose the case first; inside it, the formula is a simple equation.`,
  ],
  reference: `n = ${1 - K44 / 2}`,
  verify: () => {
    // Search, and confirm the case formula for every negative multiple of 4 down to -400.
    const found = upTo(500).filter((n) => 1 + (n % 2 === 0 ? 1 : -1) * (2 * n - 1) === K44);
    const e = same('the only n', found.join(), String(1 - K44 / 2));
    if (e !== null) return e;
    for (let a = -1; a >= -100; a--) if (1 - (2 * (1 - 2 * a) - 1) !== 4 * a) return `case 3 at a = ${a}`;
    return null;
  },
  misconceptions: [{ response: `n = ${-K44 / 2}`, why: t`That is the even case's choice, ${math`n = ${2}a`}, which works for a positive multiple. For a negative one ${mn} must be odd, so that ${math`(-${1})^{n} = -${1}`}.` }],
  nudge: t`Not quite. The multiple here is negative, so the case with ${mn} odd applies.`,
  hints: [
    t`Writing the multiple as ${math`${4}a`}, is ${math`a`} positive, zero, or negative?`,
    t`When ${mn} is odd, what does ${math`${1} + (-${1})^{n}(${2}n - ${1})`} simplify to?`,
    t`Setting that equal to ${K44}, what is ${mn}?`,
  ],
});

const sw223 = supervision({
  id: 'sw-2-2-3',
  source: cite('cst-dm-sw1', 'Exercises 2, 2.2.3'),
  title: t`Squares leave ${0} or ${1} modulo ${4}`,
  prompt: t`Show that for every integer ${mn}, the remainder when ${math`n^{${2}}`} is divided by ${4} is either ${0} or ${1}. State the cases and why they cover every integer.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-2', '2.2.3'),
  hints: [
    t`Which two cases cover every integer?`,
    t`What is ${math`n^{${2}}`} when ${math`n = ${2}m`}, and when ${math`n = ${2}m + ${1}`}?`,
    t`Which multiple of ${4} can be taken out in each case?`,
  ],
});
const sw128 = supervision({
  id: 'sw-1-2-8',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.2.8'),
  title: t`Dividing each other`,
  prompt: t`Show that for all integers ${math`m`} and ${mn}, ${math`(m \mid n \land n \mid m) \Rightarrow (m = n \lor m = -n)`}. Hint: the case ${math`m = ${0}`} needs its own argument.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-1', '1.2.8'),
  hints: [
    t`If ${math`m = ${0}`} and ${math`m`} divides ${mn}, what must ${mn} be?`,
    t`If ${math`m \ne ${0}`}, writing ${math`n = am`} and ${math`m = bn`}, what does substituting one into the other give?`,
    t`Which integers ${math`a`} and ${math`b`} satisfy ${math`ab = ${1}`}?`,
  ],
});
const bop16 = supervision({
  id: 'bop-4-16',
  source: cite('bop', 'Chapter 4, exercise 16'),
  title: t`Same parity, even sum`,
  prompt: t`Prove: if two integers have the same parity, then their sum is even. (Try cases.) Then say whether "without loss of generality" could shorten the proof, as in Book of Proof Section ${4.5}, and why or why not.`,
  writeUp: 'proof',
  hints: [
    t`Which two cases does "the same parity" allow?`,
    t`In each case, writing the integers as ${math`${2}a`} and ${math`${2}b`}, or ${math`${2}a + ${1}`} and ${math`${2}b + ${1}`}, what is the sum?`,
    t`Could one case be obtained from the other just by renaming, which is what "without loss of generality" needs?`,
  ],
});

// ---------------------------------------------------------------- Cambridge problems moved here (Rule 1, 2026-10-08)

// From Algebraic argument, which set it before proof by cases was taught.
/*
 * Outline for marking ns1-q1 (20 marks):
 * 1. Answer: yes (2).
 * 2. Contrapositive or cases: if n is not a multiple of 3, then n = 3q + 1 or n = 3q + 2 (4).
 * 3. (3q + 1)^2 = 3(3q^2 + 2q) + 1 and (3q + 2)^2 = 3(3q^2 + 4q + 1) + 1, each with the bracket an
 *    integer (8).
 * 4. So n^2 leaves remainder 1, not a multiple of 3; hence if n^2 is a multiple of 3 so is n (6).
 */
const ns1q1 = supervision({
  id: 'ns1-q1',
  source: cite('ia-ns-sheet-1', 'Q1'),
  title: t`Squares that are multiples of three`,
  prompt: t`If ${math`n^{${2}}`} is a multiple of ${3}, must ${math`n`} be a multiple of ${3}? Prove your answer.`,
  writeUp: 'proof',
  hints: [
    t`Which remainders can ${mn} leave on division by ${3}?`,
    t`What is ${math`n^{${2}}`} modulo ${3} in each case?`,
    t`Which of those cases give a multiple of ${3}?`,
  ],
});

const SW = 'cst-dm-sw1';
// Rule 1 (2026-10-08): set here from pre.indices, the earliest topic that teaches everything it needs.
const a12Q1iii = supervision({
  id: 'a12-q1-iii',
  source: cite('step-f12', 'Q1(iii)'),
  title: t`${math`n^{${5}} - n^{${3}}`} and ${24}`,
  prompt: t`Show that ${math`n^{${5}} - n^{${3}}`} is divisible by ${24} for every positive integer ${math`n`}. Start by taking out the largest possible power of ${math`n`}.`,
  writeUp: 'proof',
  official: cite('step-f12-hints', 'Q1(iii)'),
  hints: [
    t`After taking out ${math`n^{${3}}`}, what is the remaining factor, and how does it factorise further?`,
    t`Since ${math`${24} = ${3} \times ${8}`}, why is a product of three consecutive integers divisible by ${3}?`,
    t`For the factor ${8}: when ${math`n`} is even, what divides ${math`n^{${3}}`}, and when ${math`n`} is odd, what can be said of ${math`n - ${1}`} and ${math`n + ${1}`}?`,
  ],
});

// Rule 1 (2026-10-08): set here from pre.sequences, the earliest topic that teaches everything it needs.
const sw131c = supervision({
  id: 'sw-1-3-1-c',
  source: cite(SW, 'Exercises 1, 1.3.1(c)'),
  title: t`Triangular and square`,
  prompt: t`A natural number is square if it is ${math`k^{${2}}`} for some natural number ${math`k`}. Show that ${math`n`} is triangular if and only if ${math`${8}n + ${1}`} is a square. (Plutarch, about ${100} BC.)`,
  hints: [
    t`If ${math`n = \frac{k(k + ${1})}{${2}}`}, what is ${math`${8}n + ${1}`} in terms of ${math`k`}?`,
    t`Which perfect square equals ${math`${4}k^{${2}} + ${4}k + ${1}`}?`,
    t`For the converse, if ${math`${8}n + ${1} = m^{${2}}`}, why must ${math`m`} be odd, and what does writing ${math`m = ${2}k + ${1}`} give for ${math`n`}?`,
  ],
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-1', '1.3.1(c)'),
});

// ---------------------------------------------------------------- lesson

const bopTable = upTo(7).map((n) => [n, 1 + (n % 2 === 0 ? 1 : -1) * (2 * n - 1)] as const);
const NOT_SQUARE = 4003;
const [mQ, mBop] = [math`Q`, math`${1} + (-${1})^{n}(${2}n - ${1})`];

export const proofCases: TopicContent = {
  topicId: 'proof.cases',
  goal: t`Prove a statement by splitting it into cases that cover every possibility, such as ${mn} even or ${mn} odd, and proving each case.`,
  objective: t`Prove a statement by splitting into cases that cover every possibility and proving each one.`,
  why: t`Parity and remainder arguments run on cases, and STEP counting questions reward cases shown to be complete.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`A formula that changes its mind` },
    { kind: 'hook', text: t`Book of Proof asks about ${mBop}. For ${math`n = ${1}, \ldots, ${7}`} it gives ${listOf(bopTable.map(([, v]) => v))}. Every one is a multiple of ${4}, but the signs keep flipping. How could one argument cover numbers that behave so differently?` },
    { kind: 'narrative', text: t`The flipping comes from ${math`(-${1})^{n}`}: it is ${1} when ${mn} is even and ${math`-${1}`} when ${mn} is odd. So the expression is really two different formulas wearing one coat. The natural move is to stop fighting that, and deal with the two kinds of ${mn} separately.` },
    { kind: 'narrative', text: t`That is safe only because every natural number is even or odd: no number slips between the two. Prove the claim for the even ones, prove it for the odd ones, and you have proved it for all of them.` },
    { kind: 'section', title: t`Proof by cases` },
    {
      kind: 'definition',
      name: t`Exhaustive cases`,
      formal: t`Statements ${math`P_{${1}}, \ldots, P_{k}`} are [[exhaustive-cases|exhaustive]] if at least one of them is true, that is, if ${math`P_{${1}} \lor P_{${2}} \lor \cdots \lor P_{k}`} holds.`,
      plain: t`In plain words: the cases cover every possibility. "${mn} is even" and "${mn} is odd" are exhaustive for integers. "${mn} is positive" and "${mn} is negative" are not: they miss ${0}.`,
    },
    {
      kind: 'theorem',
      name: t`Proof by cases`,
      statement: t`If ${math`P_{${1}}, \ldots, P_{k}`} are exhaustive and ${math`P_{i} \Rightarrow Q`} for each ${math`i`}, then ${mQ} holds.`,
    },
    {
      kind: 'p',
      text: t`This is [[proof-by-cases|proof by cases]]. Each case is a separate small proof: you assume ${math`P_{i}`} and use it freely.`,
      why: { q: t`Why does that prove ${mQ}?`, a: t`At least one case, say ${math`P_{j}`}, is true, because they are exhaustive. You proved ${math`P_{j} \Rightarrow Q`}, and its hypothesis holds, so ${mQ} holds.` },
    },
    { kind: 'theorem', statement: t`For every ${math`n \in \mathbb{N}`}, ${mBop} is a multiple of ${4}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Choose the cases`, text: t`Every natural number ${mn} is even or odd, so the cases ${math`n = ${2}k`} and ${math`n = ${2}k + ${1}`}, with ${math`k \in \mathbb{N}`}, are exhaustive.`, why: { q: t`Why is every number even or odd?`, a: t`Dividing ${mn} by ${2} leaves remainder ${0} or ${1}. Remainder ${0} means ${math`n = ${2}k`}; remainder ${1} means ${math`n = ${2}k + ${1}`}. For example ${math`${7} = ${2} \times ${3} + ${1}`}.` } },
        { label: t`Case one, n even`, text: t`If ${math`n = ${2}k`}, then ${math`(-${1})^{n} = ${1}`}, so`, eq: [dmath`${1} + (-${1})^{n}(${2}n - ${1}) = ${1} + (${4}k - ${1}) = ${4}k.`], plain: t`An even power of ${math`-${1}`} is ${1}, and ${math`${2}n = ${4}k`}.` },
        { label: t`Case two, n odd`, text: t`If ${math`n = ${2}k + ${1}`}, then ${math`(-${1})^{n} = -${1}`} and ${math`${2}n - ${1} = ${4}k + ${1}`}, so`, eq: [dmath`${1} - (${4}k + ${1}) = -${4}k.`], plain: t`An odd power of ${math`-${1}`} is ${math`-${1}`}, which flips the sign of the bracket.` },
        { label: t`Conclude`, text: t`In each case the value is ${4} times an integer. The cases are exhaustive, so the value is a multiple of ${4} for every ${math`n \in \mathbb{N}`}.` },
      ],
    },
    checkFrom(parityCases, { a: 1, b: 1, c: 1 }, t`If ${mn} is even, ${math`n^{${2}} + n`} is even, so adding ${1} makes it odd. If ${mn} is odd, ${math`n^{${2}}`} and ${mn} are both odd, their sum is even, and adding ${1} makes it odd. Odd in both cases.`),
    { kind: 'section', title: t`Squares and remainders` },
    { kind: 'narrative', text: t`The Cambridge Discrete Mathematics notes use cases to prove a goal of the form "this or that", when neither part is true every time. Their example is about squares. Look at the remainders when squares are divided by ${4}: ${math`${0}, ${1}, ${4}, ${9}, ${16}, ${25}`} leave ${listOf([0, 1, 4, 9, 16, 25].map((x) => x % 4))}. Only ${0} and ${1} ever appear.` },
    { kind: 'theorem', statement: t`For every integer ${mn}, the remainder when ${math`n^{${2}}`} is divided by ${4} is ${0} or ${1}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`The cases`, text: t`Every integer is even or odd: ${math`n = ${2}m`} or ${math`n = ${2}m + ${1}`} for some integer ${math`m`}.` },
        { label: t`n even`, text: t`${math`n^{${2}} = (${2}m)^{${2}} = ${4}m^{${2}}`}, a multiple of ${4}: remainder ${0}.` },
        { label: t`n odd`, text: t`Expand and group the multiple of ${4}:`, eq: [dmath`n^{${2}} = ${4}m^{${2}} + ${4}m + ${1} = ${4}(m^{${2}} + m) + ${1},`], plain: t`so the remainder is ${1}.` },
        { label: t`Conclude`, text: t`The cases are exhaustive, so the remainder is always ${0} or ${1}.` },
      ],
    },
    { kind: 'p', text: t`Notice that neither half of "remainder ${0} or remainder ${1}" is true for every ${mn}: ${math`${1}^{${2}}`} leaves ${1}, ${math`${2}^{${2}}`} leaves ${0}. The cases decide which half to prove. As a payoff, ${NOT_SQUARE} is not a square: it is ${math`${4} \times ${(NOT_SQUARE - NOT_SQUARE % 4) / 4} + ${NOT_SQUARE % 4}`}, and no square leaves remainder ${NOT_SQUARE % 4}.` },
    { kind: 'section', title: t`Show there are no more` },
    { kind: 'narrative', text: t`Cases are also how you count without missing anything. The STEP Support hints to Assignment ${6}, question ${3}, about five-digit numbers with digit sum ${43}, put it bluntly: "you cannot just stop after getting ${15} possibilities, you do need to explain why there are no more." Taking cases by the number of nines does that, because every number falls in exactly one case.` },
    { kind: 'narrative', text: t`Try a smaller one. A ${4}-digit number has digit sum at most ${36}. For digit sum ${34}, the digits fall short of all nines by ${2} in total. The shortfall is either all on one digit (a ${7} and three nines) or split over two digits (two eights and two nines). Those are the only ways to share out ${2}, so those are all the cases.` },
    checkFrom(digitSums, { k: 4, d: 2 }, t`One ${7} and three nines: ${4} places for the ${7}. Two eights and two nines: ${6} ways to place the eights. ${math`${4} + ${6} = ${10}`}.`),
    { kind: 'narrative', text: t`One last tool. When two cases are the same up to swapping names, say ${math`m`} even with ${mn} odd, or ${math`m`} odd with ${mn} even, a proof may do one and say [[without-loss-of-generality|without loss of generality]] for the other. Book of Proof advises writing every case out until you are sure the others really are the same.` },
    { kind: 'pitfall', claim: t`For every integer ${mn}, ${math`n^{${2}} > ${0}`}. Case ${mn} positive: a positive times a positive is positive. Case ${mn} negative: a negative times a negative is positive.`, counterexample: t`The cases are not exhaustive: they miss ${math`n = ${0}`}, where ${math`n^{${2}} = ${0}`}. The claim is false there. Always check that your cases cover everything.` },
    { kind: 'takeaway', text: t`Split into cases that between them cover every possibility, prove the claim in each, and say why nothing is left out.` },
  ],
  examples: [
    workedCambridge(a6i),
    worked(residues, { m: 3, k: 2 }, t`Squares modulo ${3}`),
    worked(parityCases, { a: 3, b: 1, c: 2 }, t`Parity by two cases`),
  ],
  generators: [residues, parityCases, digitSums],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['exhaustive-cases', 'without-loss-of-generality'],
  cambridge: withUses([a6ii, lemma26, odd8, bop14, bop15, bop44, sw223, sw128, bop16, ns1q1, a12Q1iii, sw131c], {
    'sw-1-3-1-c': { sections: ['Proof by cases'], note: t`An if and only if proof about triangular numbers and odd squares`, needs: ['pre.sequences', 'logic.iff'] },
    'a12-q1-iii': { sections: ['Proof by cases'], note: t`Factorising, then cases on parity for the factor eight`, needs: ['pre.indices'] },
    'ns1-q1': { sections: ['Proof by cases', 'Squares and remainders'], note: t`Writing a number by its remainder on division by three and squaring each case` },
    'a6-q3-ii': { sections: ['Show there are no more'], note: t`Counting by the shortfall from all nines, case by case` },
    'sw-1-2-8': { sections: ['Proof by cases'], note: t`Splitting off the zero case in a divisibility proof` },
    'sw-2-2-3': { sections: ['Proof by cases', 'Squares and remainders'], note: t`Odd and even cases for the remainder of a square` },
  }),
  // The STEP count, then the proofs by cases. Exercises 2.3.1 and 3.2.7 are written with congruences, so they
  // are set in num.congruence (Rule 1, 2026-10-08). The auto-checked remainders (0 or 1; 1 for odd squares mod 8) can be guessed, so they do
  // not gate. IA Numbers and Sets Q1 (moved here from Algebraic argument, 2026-10-08) is the same move as
  // Squares and remainders, on division by three.
  gate: ['a6-q3-ii', 'sw-1-2-8', 'sw-2-2-3', 'ns1-q1'],
  recall: [
    { front: t`State proof by cases.`, back: t`If ${math`P_{${1}}, \ldots, P_{k}`} are exhaustive and each ${math`P_{i}`} implies ${mQ}, then ${mQ} holds.` },
    { front: t`What does it mean for cases to be exhaustive?`, back: t`At least one of them always holds: ${math`P_{${1}} \lor \cdots \lor P_{k}`}.` },
    { front: t`What remainders can a square leave on division by ${4}?`, back: t`Only ${0} (n even) or ${1} (n odd).` },
    { front: t`When may you say "without loss of generality"?`, back: t`When the cases you skip are the same as one you prove, up to renaming.` },
  ],
  proofOrder: [
    {
      title: t`Every square leaves remainder ${0} or ${1} on division by ${4}`,
      steps: [
        t`Every integer is ${math`${2}m`} or ${math`${2}m + ${1}`}.`,
        t`If ${math`n = ${2}m`}, then ${math`n^{${2}} = ${4}m^{${2}}`}: remainder ${0}.`,
        t`If ${math`n = ${2}m + ${1}`}, then ${math`n^{${2}} = ${4}(m^{${2}} + m) + ${1}`}: remainder ${1}.`,
        t`The cases cover every integer, so the remainder is ${0} or ${1}.`,
      ],
    },
  ],
};
