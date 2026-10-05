/**
 * logic.equivalences: Logical equivalence: two statements with the same truth table. De
 * Morgan's laws, double negation, the contrapositive law, an implication as an "or", and
 * the distributive laws. The lesson follows Book of Proof Section 2.6, the TMUA notes on
 * revisiting equivalence and negating compound statements (pages 21 to 24), on "if A then
 * B" as "(not A) or B" (pages 31 and 32), and on the contrapositive (pages 41 to 48), and
 * the CST notes' table of equivalences for negation (printed page 134). The problems are
 * Book of Proof's exercises for Section 2.6 (exercises 4, 9, and 13 are set in
 * logic.connectives), TMUA Exercises F and K, and the CST notes' question on Lemma 43.
 */
import { auto, cite, same, supervision, type AutoProblem } from '../cambridge';
import { column, differingRows, equivalent, fm, rowText, TF, truthTable } from '../logic';
import { int, pick } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { math, t, type Rich } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';

const PQ = ['P', 'Q'] as const;
const PQR = ['P', 'Q', 'R'] as const;
const [mP, mQ] = [math`P`, math`Q`];
const varsOf = (a: string, b: string): readonly string[] => (/R/.test(a + b) ? PQR : PQ);

// ---------------------------------------------------------------- which implies which

type Relation = 'equivalent' | 'first' | 'second' | 'neither';
/** Whether a implies b: in every row where a is true, b is true. */
const implies = (a: string, b: string, vars: readonly string[]): number | null => {
  const x = column(a, vars);
  const y = column(b, vars);
  const bad = x.findIndex((v, i) => v && !y[i]);
  return bad < 0 ? null : bad;
};
function relation(a: string, b: string): { rel: Relation; aNotB: number | null; bNotA: number | null } {
  const vars = varsOf(a, b);
  const aNotB = implies(a, b, vars);
  const bNotA = implies(b, a, vars);
  const rel: Relation = aNotB === null ? (bNotA === null ? 'equivalent' : 'first') : bNotA === null ? 'second' : 'neither';
  return { rel, aNotB, bNotA };
}

const PAIRS: readonly [string, string][] = [
  ['P => Q', '~Q => ~P'],
  ['P => Q', 'Q => P'],
  ['P => Q', '~P => ~Q'],
  ['P => Q', '~P | Q'],
  ['~(P & Q)', '~P | ~Q'],
  ['~(P & Q)', '~P & ~Q'],
  ['~(P | Q)', '~P | ~Q'],
  ['~(P | Q)', '~P & ~Q'],
  ['P & Q', 'P | Q'],
  ['P & (Q | R)', '(P & Q) | R'],
  ['P | (Q & R)', '(P | Q) & (P | R)'],
  ['P => (Q => R)', '(P & Q) => R'],
  ['~(P => Q)', 'P & ~Q'],
  ['~(P => Q)', '~P => ~Q'],
];

const REL_OPTIONS: readonly ChoiceOption[] = [
  { id: 'equivalent', label: t`They are logically equivalent` },
  { id: 'first', label: t`The first implies the second, but not the other way round` },
  { id: 'second', label: t`The second implies the first, but not the other way round` },
  { id: 'neither', label: t`Neither implies the other` },
];

interface RelP { i: number }

const whichImplies = generator<RelP>({
  id: 'which-implies',
  skill: 'Compare two statements by truth table: equivalent, one implying the other, or neither.',
  params: (rng) => ({ i: int(rng, 0, PAIRS.length - 1) }),
  sane: ({ i }) => (i >= 0 && i < PAIRS.length ? null : 'out of range'),
  problem: ({ i }) => {
    const [a, b] = PAIRS[i] as [string, string];
    const vars = varsOf(a, b);
    const { rel, aNotB, bNotA } = relation(a, b);
    return {
      prompt: t`Compare ${fm(a)} (the first) with ${fm(b)} (the second). Which is true?`,
      answer: { kind: 'choice', options: REL_OPTIONS, correct: rel },
      solution: [
        t`Write both columns of the [[truth-table|truth table]] and compare them row by row. The first implies the second when every row with the first true has the second true too.`,
        aNotB === null ? t`Every row with the first true has the second true: the first implies the second.` : t`At ${rowText(aNotB, vars)} the first is true and the second false, so the first does not imply the second.`,
        bNotA === null ? t`Every row with the second true has the first true: the second implies the first.` : t`At ${rowText(bNotA, vars)} the second is true and the first false, so the second does not imply the first.`,
        rel === 'equivalent' ? t`Both directions hold, so the columns match in every row: they are [[logically-equivalent|logically equivalent]].` : t`The columns differ in some row, so they are not equivalent.`,
      ],
    };
  },
  solve: ({ i }) => {
    const [a, b] = PAIRS[i] as [string, string];
    const vars = varsOf(a, b);
    if (equivalent(a, b, vars)) return ['equivalent'];
    const x = column(a, vars);
    const y = column(b, vars);
    const ab = x.every((v, k) => !v || y[k]);
    const ba = y.every((v, k) => !v || x[k]);
    return [ab ? 'first' : ba ? 'second' : 'neither'];
  },
  misconceptions: ({ i }): Misconception[] => {
    const [a, b] = PAIRS[i] as [string, string];
    const vars = varsOf(a, b);
    const { rel, aNotB, bNotA } = relation(a, b);
    const fails = (row: number | null, which: 'first' | 'second'): Rich => (row === null
      ? t`That direction does hold, though: check every row.`
      : t`At ${rowText(row, vars)} the ${which} is true and the ${which === 'first' ? 'second' : 'first'} is false.`);
    const out: Misconception[] = [];
    if (rel !== 'equivalent') out.push({ response: ['equivalent'], why: t`Equivalent means the same truth value in every row. ${aNotB !== null ? fails(aNotB, 'first') : fails(bNotA, 'second')}` });
    if (rel !== 'first') out.push({ response: ['first'], why: rel === 'equivalent' ? t`The first does imply the second, but the second implies the first as well, so they are equivalent.` : fails(aNotB, 'first') });
    if (rel !== 'second') out.push({ response: ['second'], why: rel === 'equivalent' ? t`The second does imply the first, but the first implies the second as well, so they are equivalent.` : fails(bNotA, 'second') });
    if (rel !== 'neither') out.push({ response: ['neither'], why: t`Check each direction row by row: ${rel === 'equivalent' ? 'both hold' : 'one of them holds'}.` });
    return out;
  },
});

// ---------------------------------------------------------------- De Morgan in words

interface Prop { is: string; isNot: string }
const PROPS: readonly Prop[] = [
  { is: 'even', isNot: 'odd' },
  { is: 'prime', isNot: 'not prime' },
  { is: 'positive', isNot: 'not positive' },
  { is: 'a multiple of three', isNot: 'not a multiple of three' },
  { is: 'a perfect square', isNot: 'not a perfect square' },
];

interface DmP { a: number; b: number; and: boolean; order: number }
/** Four orders of the four options, so the right one is not always first. */
const ORDERS: readonly (readonly number[])[] = [[0, 1, 2, 3], [1, 0, 3, 2], [2, 3, 0, 1], [3, 2, 1, 0]];

function dmOptions(p: DmP): { options: ChoiceOption[]; right: string; same: string; half: string; flip: string } {
  const A = PROPS[p.a] as Prop;
  const B = PROPS[p.b] as Prop;
  const [c, d] = p.and ? ['or', 'and'] : ['and', 'or'];
  const texts: Rich[] = [
    t`${math`x`} is ${A.isNot} ${c} ${math`x`} is ${B.isNot}`,
    t`${math`x`} is ${A.isNot} ${d} ${math`x`} is ${B.isNot}`,
    t`${math`x`} is ${A.isNot} ${c} ${math`x`} is ${B.is}`,
    t`${math`x`} is ${A.is} ${c} ${math`x`} is ${B.is}`,
  ];
  const ids = ['right', 'same', 'half', 'flip'];
  const order = ORDERS[p.order] as readonly number[];
  return { options: order.map((k) => ({ id: ids[k] as string, label: texts[k] as Rich })), right: 'right', same: 'same', half: 'half', flip: 'flip' };
}

const deMorganWords = generator<DmP>({
  id: 'de-morgan-words',
  skill: 'Negate "A and B" or "A or B" in words with De Morgan\'s laws, as in the TMUA notes\' example "x is even and x is prime".',
  params: (rng) => {
    const a = int(rng, 0, PROPS.length - 1);
    let b = int(rng, 0, PROPS.length - 2);
    if (b >= a) b++;
    return { a, b, and: pick(rng, [true, false]), order: int(rng, 0, ORDERS.length - 1) };
  },
  sane: ({ a, b, order }) => (a !== b && a >= 0 && b >= 0 && a < PROPS.length && b < PROPS.length && order >= 0 && order < ORDERS.length ? null : 'out of range'),
  problem: (p) => {
    const A = PROPS[p.a] as Prop;
    const B = PROPS[p.b] as Prop;
    const o = dmOptions(p);
    const conn = p.and ? 'and' : 'or';
    return {
      prompt: t`${math`x`} is a whole number. Which sentence is the negation of "${math`x`} is ${A.is} ${conn} ${math`x`} is ${B.is}"?`,
      answer: { kind: 'choice', options: o.options, correct: 'right' },
      solution: [
        p.and
          ? t`By [[de-morgans-laws|De Morgan's laws]], ${math`\lnot (A \land B)`} is ${math`(\lnot A) \lor (\lnot B)`}: if it is not the case that both hold, at least one fails.`
          : t`By [[de-morgans-laws|De Morgan's laws]], ${math`\lnot (A \lor B)`} is ${math`(\lnot A) \land (\lnot B)`}: if neither holds, both fail.`,
        t`So the negation is "${math`x`} is ${A.isNot} ${p.and ? 'or' : 'and'} ${math`x`} is ${B.isNot}".`,
      ],
    };
  },
  solve: (p) => {
    // Check each option against the negation on every x from 1 to 200.
    const A = PROPS[p.a] as Prop;
    const B = PROPS[p.b] as Prop;
    const holds = (prop: Prop, x: number): boolean => ({ even: x % 2 === 0, prime: x > 1 && [...Array(x).keys()].slice(2).every((d) => x % d !== 0), positive: x > 0, 'a multiple of three': x % 3 === 0, 'a perfect square': Number.isInteger(Math.sqrt(x)) } as Record<string, boolean>)[prop.is] === true;
    const negation = (x: number): boolean => !(p.and ? holds(A, x) && holds(B, x) : holds(A, x) || holds(B, x));
    const optionValue: Record<string, (x: number) => boolean> = {
      right: (x) => (p.and ? !holds(A, x) || !holds(B, x) : !holds(A, x) && !holds(B, x)),
      same: (x) => (p.and ? !holds(A, x) && !holds(B, x) : !holds(A, x) || !holds(B, x)),
      half: (x) => (p.and ? !holds(A, x) || holds(B, x) : !holds(A, x) && holds(B, x)),
      flip: (x) => (p.and ? holds(A, x) || holds(B, x) : holds(A, x) && holds(B, x)),
    };
    const xs = Array.from({ length: 200 }, (_, k) => k - 20);
    return Object.keys(optionValue).filter((id) => xs.every((x) => optionValue[id]?.(x) === negation(x)));
  },
  misconceptions: (p): Misconception[] => [
    { response: ['same'], why: p.and ? t`Negating each part keeps "and" only if you also turn it into "or": not both means at least one fails.` : t`Negating each part keeps "or" only if you also turn it into "and": not either means both fail.` },
    { response: ['half'], why: t`Both parts must be negated, not only the first.` },
    { response: ['flip'], why: t`Swapping "and" and "or" is half of De Morgan's law: each part must be negated too.` },
  ],
});

// ---------------------------------------------------------------- where two statements differ

const DIFFER: readonly [string, string][] = [
  ['P => Q', 'Q => P'],
  ['~(P & Q)', '~P & ~Q'],
  ['~(P | Q)', '~P | ~Q'],
  ['P => Q', '~P => ~Q'],
  ['P | (Q & R)', '(P | Q) & R'],
  ['~P & (P => Q)', '~(Q => P)'],
  ['P => (Q | R)', '(P => Q) | ~R'],
];

interface DiffP { i: number }

const whereDiffer = generator<DiffP>({
  id: 'where-differ',
  skill: 'Show two statements are not equivalent: find every row of the truth table where they differ.',
  params: (rng) => ({ i: int(rng, 0, DIFFER.length - 1) }),
  sane: ({ i }) => (i >= 0 && i < DIFFER.length && differingRows(...(DIFFER[i] as [string, string]), varsOf(...(DIFFER[i] as [string, string]))).length > 0 ? null : 'out of range'),
  problem: ({ i }) => {
    const [a, b] = DIFFER[i] as [string, string];
    const vars = varsOf(a, b);
    const rows = differingRows(a, b, vars);
    const x = column(a, vars);
    const y = column(b, vars);
    return {
      prompt: t`The statements ${fm(a)} and ${fm(b)} are not logically equivalent. Choose every row of the truth table where their truth values differ.`,
      answer: { kind: 'choice', options: x.map((_, k) => ({ id: `r${k}`, label: rowText(k, vars) })), correct: rows.map((k) => `r${k}`) },
      solution: [
        t`Work out both columns: ${fm(a)} is ${x.map(TF).join(', ')} and ${fm(b)} is ${y.map(TF).join(', ')}, row by row from all true.`,
        t`They differ in ${rows.length === 1 ? t`one row` : t`${rows.length} rows`}: ${rows.map((k) => rowText(k, vars)).flatMap((r, j) => (j === 0 ? [...r] : [...t`; `, ...r]))}. One such row is enough to show they are not equivalent.`,
      ],
    };
  },
  solve: ({ i }) => {
    const [a, b] = DIFFER[i] as [string, string];
    return differingRows(a, b, varsOf(a, b)).map((k) => `r${k}`);
  },
  misconceptions: ({ i }): Misconception[] => {
    const [a, b] = DIFFER[i] as [string, string];
    const vars = varsOf(a, b);
    const x = column(a, vars);
    const agree = x.flatMap((v, k) => (v === column(b, vars)[k] ? [{ k, v }] : []));
    return agree.slice(0, 3).map(({ k, v }) => ({ response: [`r${k}`], why: t`At ${rowText(k, vars)} both statements are ${v ? 'true' : 'false'}: they agree there. Look for rows where one is true and the other false.` }));
  },
});

// ---------------------------------------------------------------- Cambridge problems

/** Official tables from Book of Proof's solutions, row by row in its order (all true first), the blank columns only. */
function bopTable(o: { n: number; title: Rich; a: string; b: string; helpers: readonly string[]; official?: readonly string[]; steps: Rich[] }): AutoProblem {
  const vars = varsOf(o.a, o.b);
  const texts = [...o.helpers, o.a, o.b];
  const answer = truthTable(texts, vars);
  const at = `Section 2.6, exercise ${o.n}`;
  const spec: Parameters<typeof auto>[0] = {
    id: `bop-2-6-${o.n}`,
    source: cite('bop', at),
    title: o.title,
    prompt: t`Use a truth table to show that ${fm(o.a)} and ${fm(o.b)} are logically equivalent: fill in every column, the helper columns first.`,
    answer,
    solution: o.steps,
    reference: answer.expected,
    verify: () => same(`${at}: the last two columns agree`, equivalent(o.a, o.b, vars), true),
    misconceptions: [{ response: answer.expected.map((c) => (c === 'T' ? 'F' : 'T')), why: t`Every cell is flipped: that is the table of the negations.` }],
  };
  if (o.official !== undefined) spec.official = { source: cite('bop', `Solutions, ${at}`), answer: o.official, agrees: true };
  return auto(spec);
}

const rowsOf = (...rows: string[]): string[] => rows.flatMap((r) => r.split(' '));

const bop1 = bopTable({
  n: 1, title: t`A distributive law`, a: 'P & (Q | R)', b: '(P & Q) | (P & R)', helpers: ['Q | R', 'P & Q', 'P & R'],
  official: rowsOf('T T T T T', 'T T F T T', 'T F T T T', 'F F F F F', 'T F F F F', 'T F F F F', 'T F F F F', 'F F F F F'),
  steps: [
    t`Eight rows, for the eight ways to give ${mP}, ${mQ}, ${math`R`} truth values. Fill the helper columns first, then the two statements.`,
    t`${fm('P & (Q | R)')} is true exactly when ${mP} is true and at least one of ${mQ}, ${math`R`} is: the first three rows. ${fm('(P & Q) | (P & R)')} is true in the same three rows.`,
    t`The columns agree in every row, so the statements are equivalent: "and" distributes over "or", as multiplication distributes over addition.`,
  ],
});
const bop3 = bopTable({
  n: 3, title: t`An implication as an "or"`, a: 'P => Q', b: '~P | Q', helpers: ['~P'],
  official: rowsOf('F T T', 'F F F', 'T T T', 'T T T'),
  steps: [
    t`${fm('P => Q')} is false only when ${mP} is true and ${mQ} false, the second row.`,
    t`${fm('~P | Q')} is false only when ${math`\lnot P`} and ${mQ} are both false: again only the second row. The columns agree.`,
  ],
});
const bop5 = bopTable({
  n: 5, title: t`De Morgan for three`, a: '~(P | Q | R)', b: '~P & ~Q & ~R', helpers: ['P | Q | R', '~P', '~Q', '~R'],
  official: rowsOf('T F F F F F', 'T F F T F F', 'T F T F F F', 'T F T T F F', 'T T F F F F', 'T T F T F F', 'T T T F F F', 'F T T T T T'),
  steps: [
    t`${fm('P | Q | R')} is false only in the last row, where all three are false, so its negation is true only there.`,
    t`${fm('~P & ~Q & ~R')} needs all three negations true, which is also only the last row. The columns agree.`,
  ],
});
const bop7 = bopTable({
  n: 7, title: t`An implication with a contradiction`, a: 'P => Q', b: '(P & ~Q) => (Q & ~Q)', helpers: ['~Q', 'P & ~Q', 'Q & ~Q'],
  official: rowsOf('F F F T T', 'T T F F F', 'F F F T T', 'T F F T T'),
  steps: [
    t`${fm('Q & ~Q')} is false in every row. An implication with a false conclusion is true exactly when its hypothesis is false.`,
    t`So ${fm('(P & ~Q) => (Q & ~Q)')} is true exactly when ${fm('P & ~Q')} is false, which is when ${fm('P => Q')} is true. This equivalence is the logic behind proof by contradiction: assume ${mP} and not ${mQ}, and reach something impossible.`,
  ],
});

function bopVerdict(o: { n: number; a: string; b: string; official?: boolean; steps: Rich[] }): AutoProblem {
  const vars = varsOf(o.a, o.b);
  const eq = equivalent(o.a, o.b, vars);
  const at = `Section 2.6, exercise ${o.n}`;
  const spec: Parameters<typeof auto>[0] = {
    id: `bop-2-6-${o.n}`,
    source: cite('bop', at),
    title: t`Equivalent or not`,
    prompt: t`Decide whether or not ${fm(o.a)} and ${fm(o.b)} are logically equivalent.`,
    answer: { kind: 'choice', options: [{ id: 'yes', label: t`Equivalent` }, { id: 'no', label: t`Not equivalent` }], correct: eq ? 'yes' : 'no' },
    solution: o.steps,
    reference: eq ? 'yes' : 'no',
    verify: () => {
      // Row by row, and against the rows where they differ.
      const rows = differingRows(o.a, o.b, vars);
      return same(`${at}: equivalent exactly when no row differs`, eq, rows.length === 0);
    },
    misconceptions: [{ response: eq ? 'no' : 'yes', why: eq ? t`Fill in the table: the two columns agree in every row.` : t`Look for a row where one is true and the other false: there is one.` }],
  };
  if (o.official !== undefined) spec.official = { source: cite('bop', `Solutions, ${at}`), answer: o.official ? 'yes' : 'no', agrees: true };
  return auto(spec);
}

const bop10 = bopVerdict({
  n: 10, a: '(P => Q) | R', b: '~((P & ~Q) & ~R)',
  steps: [
    t`By De Morgan's law, ${fm('~((P & ~Q) & ~R)')} is ${fm('~(P & ~Q) | R')}, and ${fm('~(P & ~Q)')} is ${fm('~P | Q')}, which is ${fm('P => Q')}.`,
    t`So the second statement is ${fm('(P => Q) | R')}: equivalent. A truth table confirms it, row by row.`,
  ],
});
const bop11 = bopVerdict({
  n: 11, a: '~P & (P => Q)', b: '~(Q => P)', official: false,
  steps: [
    t`${fm('~(Q => P)')} is true only when ${mQ} is true and ${mP} false. ${fm('~P & (P => Q)')} is true whenever ${mP} is false, whatever ${mQ} is.`,
    t`In the last row, ${mP} and ${mQ} both false, the first is true and the second false. Not equivalent.`,
  ],
});
const bop12 = bopVerdict({
  n: 12, a: '~(P => Q)', b: 'P & ~Q',
  steps: [
    t`${fm('P => Q')} is false exactly when ${mP} is true and ${mQ} is false, so its negation is true exactly then.`,
    t`That is ${fm('P & ~Q')}: equivalent. The CST notes list it first among the equivalences for negation (printed page ${134}).`,
  ],
});

const tmuaF1 = auto({
  id: 'tmua-f-1',
  source: cite('tmua-logic-proof', 'Exercise F, question 1', true),
  title: t`not (${math`A`} and not ${math`B`})`,
  prompt: t`Show, using a truth table, that ${fm('~(P & ~Q)')} is equivalent to ${fm('~P | Q')}: fill in every column. (The notes write ${math`A`} and ${math`B`}; here they are ${mP} and ${mQ}.)`,
  answer: truthTable(['~Q', 'P & ~Q', '~(P & ~Q)', '~P', '~P | Q'], PQ),
  solution: [
    t`${fm('P & ~Q')} is true only in the second row, so ${fm('~(P & ~Q)')} is false only there.`,
    t`${fm('~P | Q')} is also false only in the second row. The two columns agree, and both are the column of ${fm('P => Q')}: the notes' point that "if A then B" is "not (A and not B)".`,
  ],
  reference: truthTable(['~Q', 'P & ~Q', '~(P & ~Q)', '~P', '~P | Q'], PQ).expected,
  verify: () => {
    const e = same('the two statements', equivalent('~(P & ~Q)', '~P | Q', PQ), true);
    return e ?? same('both are P => Q', equivalent('~(P & ~Q)', 'P => Q', PQ), true);
  },
});

const K_OPTIONS: readonly ChoiceOption[] = [
  { id: 'right', label: t`If ${math`ab`} is even, then ${math`a`} and ${math`b`} are not both odd.` },
  { id: 'careless', label: t`If ${math`ab`} is not odd, then ${math`a`} and ${math`b`} are not odd.` },
  { id: 'converse', label: t`If ${math`ab`} is odd, then ${math`a`} and ${math`b`} are odd.` },
  { id: 'inverse', label: t`If ${math`a`} and ${math`b`} are not both odd, then ${math`ab`} is even.` },
];
const tmuaK4 = auto({
  id: 'tmua-k-4',
  source: cite('tmua-logic-proof', 'Exercise K, question 4'),
  title: t`The contrapositive of "${math`a`} and ${math`b`} odd"`,
  prompt: t`For integers ${math`a`} and ${math`b`}: what is the contrapositive of "if ${math`a`} and ${math`b`} are odd, then ${math`ab`} is odd"?`,
  answer: { kind: 'choice', options: K_OPTIONS, correct: 'right' },
  solution: [
    t`The [[contrapositive|contrapositive]] of "if ${math`A`} then ${math`B`}" is "if not ${math`B`} then not ${math`A`}". Here ${math`A`} is "${math`a`} and ${math`b`} are odd", and not ${math`A`} is "${math`a`} and ${math`b`} are not both odd", by De Morgan.`,
    t`So: if ${math`ab`} is even, then ${math`a`} and ${math`b`} are not both odd; that is, at least one of them is even.`,
  ],
  reference: 'right',
  verify: () => {
    // The statement and each option, on every pair of integers from -12 to 12.
    const odd = (n: number): boolean => Math.abs(n) % 2 === 1;
    const r = Array.from({ length: 25 }, (_, k) => k - 12);
    const orig = r.every((a) => r.every((b) => !(odd(a) && odd(b)) || odd(a * b)));
    const right = r.every((a) => r.every((b) => odd(a * b) || !(odd(a) && odd(b))));
    const careless = r.every((a) => r.every((b) => odd(a * b) || (!odd(a) && !odd(b))));
    // The original and its contrapositive are both true; the careless form fails (a = 1, b = 2).
    return same('original, contrapositive, careless form', [orig, right, careless].join(), 'true,true,false');
  },
  misconceptions: [
    { response: 'careless', why: t`"Not (${math`a`} and ${math`b`} are odd)" is "not both odd", not "neither odd": that careless "not" is the slip of question ${5}. With ${math`a = ${1}`}, ${math`b = ${2}`}, ${math`ab`} is not odd, yet ${math`a`} is odd.` },
    { response: 'converse', why: t`That is the converse: it swaps the two parts without negating them. The contrapositive negates both and swaps them.` },
    { response: 'inverse', why: t`That negates both parts but keeps the order. The contrapositive also swaps them.` },
  ],
  // The notes print the correct form on page 48: "if ab is even then a and b are not both odd".
  official: { source: cite('tmua-logic-proof', 'page 48'), answer: 'right', agrees: true },
});

const tmuaK2 = auto({
  id: 'tmua-k-2',
  source: cite('tmua-logic-proof', 'Exercise K, questions 2 and 3', true),
  title: t`The contrapositive of the converse`,
  prompt: t`Is ${fm('P => Q')} logically equivalent to the contrapositive of its converse?`,
  answer: { kind: 'choice', options: [{ id: 'yes', label: t`Yes` }, { id: 'no', label: t`No` }], correct: 'no' },
  solution: [
    t`The converse of ${fm('P => Q')} is ${fm('Q => P')}, and its contrapositive is ${fm('~P => ~Q')}.`,
    t`${fm('~P => ~Q')} is equivalent to the converse ${fm('Q => P')}, not to ${fm('P => Q')}: at ${rowText(1, PQ)} the original is false and it is true. So no.`,
  ],
  reference: 'no',
  verify: () => {
    const e = same('contrapositive of the converse against the converse', equivalent('~P => ~Q', 'Q => P', PQ), true);
    return e ?? same('against the original', equivalent('~P => ~Q', 'P => Q', PQ), false);
  },
  misconceptions: [{ response: 'yes', why: t`A contrapositive is equivalent to the statement it is taken from, here the converse. The converse is not equivalent to the original.` }],
});

const tmuaF3 = supervision({
  id: 'tmua-f-3',
  source: cite('tmua-logic-proof', 'Exercise F, question 3'),
  title: t`Equivalent statements in words`,
  prompt: t`Find logically equivalent statements for each of the following, at least one in the form "not (... and not ...)" and one as a contrapositive: (a) if ${math`x > ${1}`} then ${math`x^{${2}} > ${1}`}; (b) if two triangles are similar then they have the same interior angles; (c) if a triangle obeys Pythagoras' theorem then it has a right angle. Explain why each is equivalent.`,
  writeUp: 'explanation',
});
const tmuaK5 = supervision({
  id: 'tmua-k-5',
  source: cite('tmua-logic-proof', 'Exercise K, question 5'),
  title: t`A careless "not"`,
  prompt: t`Why is it a mistake to write the contrapositive of "if ${math`a`} and ${math`b`} are odd, then ${math`ab`} is odd" as "if ${math`ab`} is not odd then ${math`a`} and ${math`b`} are not odd"? Give a pair of integers that shows the careless version is false, and say which law of logic was broken.`,
  writeUp: 'explanation',
});
const lemma43 = supervision({
  id: 'cst-lemma-43-equivalences',
  source: cite('cst-dm-notes', 'printed page 151, the footnote to the proof of Lemma 43'),
  title: t`Which equivalences?`,
  prompt: t`In the proof of Lemma ${43} (a positive rational is a fraction in lowest terms), the CST notes negate ${math`\exists m, n.\ x = m/n \land \lnot \exists p.\ (p \mid m \land p \mid n)`} to get ${math`\forall m, n.\ x = m/n \Rightarrow \exists p.\ (p \mid m \land p \mid n)`}, and say this uses three of the equivalences on printed page ${134} together with ${math`(P \Rightarrow Q) \Leftrightarrow (\lnot P \lor Q)`}. Which three? Show the negation step by step, naming the equivalence used at each step.`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

const DM_A = ['T', 'F'];

export const equivalences: TopicContent = {
  topicId: 'logic.equivalences',
  goal: t`Check that two statements are logically equivalent by truth table, and rewrite statements with De Morgan's laws, double negation, the contrapositive, and "if ${math`P`} then ${math`Q`}" as "not ${math`P`}, or ${math`Q`}".`,
  lesson: [
    { kind: 'p', text: t`Two statements are [[logically-equivalent|logically equivalent]] when they have the same truth value in every row of the truth table: whatever truth values the letters take, they are both true or both false. Book of Proof writes ${math`P \Rightarrow Q = (\lnot Q) \Rightarrow (\lnot P)`}; the CST notes write ${math`\Leftrightarrow`} between them. Either way it means one can replace the other anywhere, in a proof or in a sentence.` },
    {
      kind: 'table', caption: t`The TMUA notes' table for "not (${math`A`} and ${math`B`})", page ${22}: the last two columns agree.`,
      head: [[math`A`], [math`B`], [fm('~(A & B)', ['A', 'B'])], [fm('~A | ~B', ['A', 'B'])]],
      rows: [0, 1, 2, 3].map((k) => [t`${DM_A[k >> 1] as string}`, t`${DM_A[k & 1] as string}`, t`${TF(column('~(A & B)', ['A', 'B'])[k] === true)}`, t`${TF(column('~A | ~B', ['A', 'B'])[k] === true)}`]),
    },
    { kind: 'rule', text: t`[[de-morgans-laws|De Morgan's laws]]: ${math`\lnot (P \land Q)`} is equivalent to ${math`(\lnot P) \lor (\lnot Q)`}, and ${math`\lnot (P \lor Q)`} to ${math`(\lnot P) \land (\lnot Q)`}. To negate an "and" or an "or": negate each part, and swap "and" with "or".` },
    { kind: 'p', text: t`The TMUA notes' example: the negation of "${math`x`} is even and ${math`x`} is prime" is "${math`x`} is not even or ${math`x`} is not prime", that is, "${math`x`} is odd or ${math`x`} is not prime". Not "${math`x`} is odd and not prime": that is false for ${math`x = ${4}`}, yet ${4} makes the original false, so the negation must be true there.` },
    { kind: 'p', text: t`More equivalences from the CST notes' list (printed page ${134}) and Book of Proof: double negation, ${math`\lnot\lnot P`} is ${mP}; ${math`P \Rightarrow Q`} is ${math`(\lnot P) \lor Q`}, since both are false only when ${mP} is true and ${mQ} false; so ${math`\lnot (P \Rightarrow Q)`} is ${math`P \land \lnot Q`}; and ${math`\lnot (P \Leftrightarrow Q)`} is ${math`P \Leftrightarrow \lnot Q`}. The commutative, associative, and distributive laws work like those of arithmetic: ${math`P \land (Q \lor R)`} is ${math`(P \land Q) \lor (P \land R)`}.` },
    { kind: 'rule', text: t`The [[contrapositive|contrapositive]] of ${math`P \Rightarrow Q`} is ${math`\lnot Q \Rightarrow \lnot P`}, and it is equivalent to it. The converse ${math`Q \Rightarrow P`} is not, and neither is ${math`\lnot P \Rightarrow \lnot Q`}.` },
    { kind: 'p', text: t`To show two statements are not equivalent, one row is enough: a row where one is true and the other false. Brackets matter when "and" and "or" mix: ${math`P \lor (Q \land R)`} and ${math`(P \lor Q) \land R`} differ when ${mP} is true and ${math`R`} false.` },
  ],
  examples: [
    workedCambridge(bop1),
    worked(whichImplies, { i: 5 }, t`Which implies which`),
    worked(deMorganWords, { a: 0, b: 1, and: true, order: 1 }, t`Negating an "and" in words`),
  ],
  generators: [whichImplies, deMorganWords, whereDiffer],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['logically-equivalent', 'de-morgans-laws', 'contrapositive'],
  cambridge: [bop3, bop5, bop7, bop10, bop11, bop12, tmuaF1, tmuaK2, tmuaK4, tmuaF3, tmuaK5, lemma43],
};
