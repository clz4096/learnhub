/**
 * logic.connectives: And, or, and not. The lesson follows the TMUA notes on statements and
 * making new statements (pages 8 to 24), Book of Proof Sections 2.1, 2.2, and 2.5, and the
 * CST notes on conjunction, disjunction, and negation (printed pages 77 to 84, 104 to 115,
 * 133). The problems are Book of Proof's exercises for Sections 2.1, 2.2, 2.5, and 2.6,
 * and TMUA Exercises A to C.
 */
import { assignments, evalFormula, parseFormula, type Formula } from '@learnhub/mastery';
import { auto, cite, same, supervision, type AutoProblem } from '../cambridge';
import { int, pick, upTo } from '../math';
import { generator, type AnswerSpec, type ChoiceOption, type Misconception } from '../problem';
import { math, t, type Rich, type Span } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';

type F =
  | { op: 'var'; v: 'P' | 'Q' | 'R' }
  | { op: 'not'; a: F }
  | { op: 'and' | 'or'; a: F; b: F };

const V = (v: 'P' | 'Q' | 'R'): F => ({ op: 'var', v });
const not = (a: F): F => ({ op: 'not', a });
const and = (a: F, b: F): F => ({ op: 'and', a, b });
const or = (a: F, b: F): F => ({ op: 'or', a, b });
const [P, Q, R] = [V('P'), V('Q'), V('R')];

/** Every formula has an "or" and a "not", so each misreading below changes something. */
const FORMULAS: readonly F[] = [
  or(not(P), Q),
  or(P, not(Q)),
  not(or(P, Q)),
  and(or(P, Q), not(R)),
  and(or(not(P), Q), R),
  or(not(and(P, Q)), R),
  or(P, and(Q, not(R))),
  and(not(P), or(Q, R)),
];

type Row = Readonly<Record<'P' | 'Q' | 'R', boolean>>;
type Reading = 'right' | 'exclusive-or' | 'no-not';

/** The truth value of f in a row. The misreadings model the two common slips. */
function evalF(f: F, row: Row, reading: Reading = 'right'): boolean {
  switch (f.op) {
    case 'var': return row[f.v];
    case 'not': return reading === 'no-not' ? evalF(f.a, row, reading) : !evalF(f.a, row, reading);
    case 'and': return evalF(f.a, row, reading) && evalF(f.b, row, reading);
    case 'or': {
      const x = evalF(f.a, row, reading);
      const y = evalF(f.b, row, reading);
      return reading === 'exclusive-or' ? x !== y : x || y;
    }
  }
}

const varsOf = (f: F): ('P' | 'Q' | 'R')[] => {
  const out = new Set<'P' | 'Q' | 'R'>();
  const go = (g: F): void => { if (g.op === 'var') out.add(g.v); else if (g.op === 'not') go(g.a); else { go(g.a); go(g.b); } };
  go(f);
  return (['P', 'Q', 'R'] as const).filter((v) => out.has(v));
};

/** In the usual order: all true first, then counting down, as truth tables are written. */
function rows(vars: readonly ('P' | 'Q' | 'R')[]): Row[] {
  const n = vars.length;
  return Array.from({ length: 2 ** n }, (_, i) => {
    const row = { P: false, Q: false, R: false };
    vars.forEach((v, j) => { row[v] = ((i >> (n - 1 - j)) & 1) === 0; });
    return row;
  });
}

/** \lnot P \lor Q in LaTeX, with brackets where an operand is a compound of a different kind. */
function show(f: F): string {
  switch (f.op) {
    case 'var': return f.v;
    case 'not': return f.a.op === 'var' || f.a.op === 'not' ? `\\lnot ${show(f.a)}` : `\\lnot (${show(f.a)})`;
    default: {
      const side = (g: F): string => (g.op === 'and' || g.op === 'or' ? `(${show(g)})` : show(g));
      return `${side(f.a)} ${f.op === 'and' ? '\\land' : '\\lor'} ${side(f.b)}`;
    }
  }
}

const formula = (f: F): Span => math`${show(f)}`;
const TF = (b: boolean): string => (b ? 'T' : 'F');
const yn = (b: boolean): Rich => t`${TF(b)}`;
const rowId = (r: Row, vars: readonly string[]): string => `r${vars.map((v) => TF(r[v as 'P'])).join('')}`;
const rowLabel = (r: Row, vars: readonly ('P' | 'Q' | 'R')[]) => [math`${vars.map((v) => `${v} = \\mathrm{${TF(r[v])}}`).join(',\\ ')}`];
const [mP, mQ, mR] = [math`P`, math`Q`, math`R`];
const NOT = math`\lnot`;
const trueRows = (f: F, reading: Reading = 'right'): string[] => {
  const vs = varsOf(f);
  return rows(vs).filter((r) => evalF(f, r, reading)).map((r) => rowId(r, vs));
};

// ---------------------------------------------------------------- generators

interface FP { i: number }

const whichRows = generator<FP>({
  id: 'which-rows',
  skill: 'Find the rows of a truth table where a compound statement is true.',
  params: (rng) => ({ i: int(rng, 0, FORMULAS.length - 1) }),
  sane: ({ i }) => (i >= 0 && i < FORMULAS.length ? null : 'out of range'),
  problem({ i }) {
    const f = FORMULAS[i] as F;
    const vs = varsOf(f);
    const options: ChoiceOption[] = rows(vs).map((r) => ({ id: rowId(r, vs), label: rowLabel(r, vs) }));
    return {
      prompt: t`${mP}, ${mQ}${vs.includes('R') ? t`, and ${mR}` : t``} are statements. Choose every row where ${formula(f)} is true. (T means true, F means false.)`,
      answer: { kind: 'choice', options, correct: trueRows(f) },
      solution: [
        t`Work out the brackets first, then ${NOT} (not), then ${math`\land`} (and) and ${math`\lor`} (or) as written.`,
        ...rows(vs).map((r) => t`${rowLabel(r, vs)}: ${formula(f)} is ${evalF(f, r) ? 'true' : 'false'}.`),
      ],
    };
  },
  solve: ({ i }) => {
    const f = FORMULAS[i] as F;
    const vs = varsOf(f);
    // Brute force: evaluate in all eight rows, then keep the distinct rows of the variables used.
    const seen = new Set<string>();
    for (const P of [true, false]) for (const Q of [true, false]) for (const R of [true, false]) {
      const row = { P, Q, R };
      if (evalF(f, row)) seen.add(rowId(row, vs));
    }
    return [...seen];
  },
  misconceptions: ({ i }): Misconception[] => {
    const f = FORMULAS[i] as F;
    const vs = varsOf(f);
    const all = rows(vs).map((r) => rowId(r, vs));
    const yes = trueRows(f);
    return [
      { response: trueRows(f, 'exclusive-or'), why: t`It looks like you read "or" as "one or the other but not both". In logic, ${math`P \lor Q`} is true when at least one is true, including when both are.` },
      { response: trueRows(f, 'no-not'), why: t`It looks like a ${NOT} (not) was skipped. ${NOT} flips the truth value of what follows it: of the single letter, or of the whole bracket after it.` },
      { response: all.filter((x) => !yes.includes(x)), why: t`Those are exactly the rows where it is false. Check the rows again and keep the ones that make it true.` },
    ];
  },
});

const countTrue = generator<FP>({
  id: 'count-true',
  skill: 'Count the rows of a truth table where a compound statement is true.',
  params: (rng) => ({ i: int(rng, 0, FORMULAS.length - 1) }),
  sane: ({ i }) => (i >= 0 && i < FORMULAS.length ? null : 'out of range'),
  problem({ i }) {
    const f = FORMULAS[i] as F;
    const vs = varsOf(f);
    const rs = rows(vs);
    const yes = rs.filter((r) => evalF(f, r));
    return {
      prompt: t`${mP}, ${mQ}${vs.includes('R') ? t`, and ${mR}` : t``} are statements. In how many rows of the [[truth-table|truth table]] is ${formula(f)} true?`,
      answer: { kind: 'exact', expected: String(yes.length) },
      solution: [
        t`With ${vs.length} statements the table has ${rs.length} rows.`,
        ...rs.map((r) => t`${rowLabel(r, vs)}: ${evalF(f, r) ? 'true' : 'false'}.`),
        t`It is true in ${yes.length} rows.`,
      ],
    };
  },
  solve: ({ i }) => {
    const f = FORMULAS[i] as F;
    const vs = varsOf(f);
    let n = 0;
    for (const P of [true, false]) for (const Q of [true, false]) for (const R of [true, false]) if (evalF(f, { P, Q, R })) n++;
    // R ranges over both values even when f ignores it; halve once for each unused letter.
    return String(n / 2 ** (3 - vs.length));
  },
  misconceptions: ({ i }): Misconception[] => {
    const f = FORMULAS[i] as F;
    const n = rows(varsOf(f)).length;
    const yes = trueRows(f).length;
    return [
      { response: String(trueRows(f, 'exclusive-or').length), why: t`It looks like you read "or" as exclusive. In logic, ${math`\lor`} (or) is also true when both sides are true.` },
      { response: String(trueRows(f, 'no-not').length), why: t`It looks like a ${NOT} (not) was skipped. ${NOT} flips the truth value of what follows it.` },
      { response: String(n - yes), why: t`That is the number of rows where it is false. Count the true rows.` },
    ];
  },
});

interface SizeP { n: number; built: boolean }

const tableSize = generator<SizeP>({
  id: 'table-size',
  skill: 'Count the rows of a truth table for n statements.',
  // Not 2 or 4, where 2n or n^2 equals 2^n and a slip would be marked right.
  params: (rng) => ({ n: pick(rng, [3, 5, 6, 7, 8]), built: rng() < 0.5 }),
  sane: ({ n }) => (n >= 3 && n <= 8 && n !== 4 ? null : 'out of range'),
  problem: ({ n, built }) => ({
    prompt: built
      ? t`A compound statement is built from ${n} different simple statements. How many rows does its [[truth-table|truth table]] have?`
      : t`A [[truth-table|truth table]] lists every combination of truth values for ${n} statements. How many rows does it have?`,
    answer: { kind: 'exact', expected: String(2 ** n) },
    solution: [
      t`Each row gives every simple statement a [[truth-value|truth value]]: true or false, ${2} choices each.`,
      t`By the product rule there are ${math`${2}^{${n}} = ${2 ** n}`} rows.`,
    ],
  }),
  solve: ({ n }) => {
    // List every assignment by doubling the list once per statement.
    let assignments: boolean[][] = [[]];
    for (let i = 0; i < n; i++) assignments = assignments.flatMap((a) => [[...a, true], [...a, false]]);
    return String(assignments.length);
  },
  misconceptions: ({ n }): Misconception[] => [
    { response: String(2 * n), why: t`That adds ${2} rows per statement. Each new statement doubles the table, because every old row splits into a true row and a false row.` },
    { response: String(n ** 2), why: t`The base and the power are swapped: ${2} choices for each of ${n} statements is ${math`${2}^{${n}}`}.` },
  ],
});

/** The formula in the formula grader's syntax. */
function ascii(f: F): string {
  switch (f.op) {
    case 'var': return f.v;
    case 'not': return f.a.op === 'var' || f.a.op === 'not' ? `~${ascii(f.a)}` : `~(${ascii(f.a)})`;
    default: {
      const side = (g: F): string => (g.op === 'and' || g.op === 'or' ? `(${ascii(g)})` : ascii(g));
      return `${side(f.a)} ${f.op === 'and' ? '&' : '|'} ${side(f.b)}`;
    }
  }
}

/** A truth table answer: the letters' columns given, the listed formulas' columns to fill. */
function fillTable(vars: readonly string[], heads: readonly Rich[], values: (env: Record<string, boolean>) => readonly boolean[], givenCells: (row: number, col: number) => boolean = () => false): Extract<AnswerSpec, { kind: 'table' }> {
  const envs = assignments(vars);
  const rowsOut: (Rich | null)[][] = [];
  const expected: string[] = [];
  envs.forEach((env, r) => {
    const vals = values(env);
    rowsOut.push([
      ...vars.map((v) => yn(env[v] === true)),
      ...vals.map((b, c) => {
        if (givenCells(r, c)) return yn(b);
        expected.push(TF(b));
        return null;
      }),
    ]);
  });
  return { kind: 'table', columns: [...vars.map((v) => [math`${v}`]), ...heads], rows: rowsOut, expected, cell: 'truth' };
}

/** Reads a formula in the grader's syntax, for problems and checks; throws on a content bug. */
function formulaOf(text: string, vars: readonly string[]): Formula {
  const r = parseFormula(text, vars);
  if (!r.ok) throw new Error(`content formula "${text}": ${r.error}`);
  return r.value;
}

interface TableP { i: number }

const fillColumn = generator<TableP>({
  id: 'fill-table',
  skill: 'Fill in the truth table of a compound statement, row by row.',
  params: (rng) => ({ i: int(rng, 0, FORMULAS.length - 1) }),
  sane: ({ i }) => (i >= 0 && i < FORMULAS.length ? null : 'out of range'),
  problem({ i }) {
    const f = FORMULAS[i] as F;
    const vs = varsOf(f);
    return {
      prompt: t`Fill in the [[truth-table|truth table]] of ${formula(f)}: write T or F in each empty cell.`,
      answer: fillTable(vs, [[formula(f)]], (env) => [evalF(f, env as unknown as Row)]),
      solution: [
        t`Work out the brackets first, then ${NOT}, then ${math`\land`} and ${math`\lor`}.`,
        ...rows(vs).map((r) => t`${rowLabel(r, vs)}: ${formula(f)} is ${evalF(f, r) ? 'true' : 'false'}.`),
      ],
    };
  },
  solve: ({ i }) => {
    const f = FORMULAS[i] as F;
    // A second evaluation, through the formula grader's parser and evaluator.
    const g = formulaOf(ascii(f), ['P', 'Q', 'R']);
    return assignments(varsOf(f)).map((env) => TF(evalFormula(g, env)));
  },
  misconceptions: ({ i }): Misconception[] => {
    const f = FORMULAS[i] as F;
    const vs = varsOf(f);
    const col = (reading: Reading): string[] => rows(vs).map((r) => TF(evalF(f, r, reading)));
    return [
      { response: col('exclusive-or'), why: t`Some rows read "or" as "one but not both". In logic, ${math`P \lor Q`} is true when at least one is true, including both.` },
      { response: col('no-not'), why: t`A ${NOT} was skipped. It flips the truth value of what follows it.` },
      { response: rows(vs).map((r) => TF(!evalF(f, r))), why: t`Every row is flipped: those are the values of its negation.` },
    ];
  },
});

/** Two properties of a number n, and sentences that combine them, each with its formula and two misreadings. */
const PROPS: readonly (readonly [string, string, (n: number) => boolean, (n: number) => boolean])[] = [
  ['even', 'prime', (n) => n % 2 === 0, (n) => isPrime(n)],
  ['even', 'a multiple of three', (n) => n % 2 === 0, (n) => n % 3 === 0],
  ['odd', 'a square', (n) => n % 2 === 1, (n) => Number.isInteger(Math.sqrt(n))],
  ['prime', 'greater than ten', (n) => isPrime(n), (n) => n > 10],
];
function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

type Shape = 'and' | 'but-not' | 'neither' | 'not-both' | 'or' | 'one-false';
const mn = math`n`;
const SHAPES: Readonly<Record<Shape, { text: (a: string, b: string) => Rich; formula: string; holds: (x: boolean, y: boolean) => boolean; wrong: readonly [string, string] }>> = {
  and: { text: (a, b) => t`${mn} is ${a} and ${b}`, formula: 'P & Q', holds: (x, y) => x && y, wrong: ['P | Q', '~P & ~Q'] },
  'but-not': { text: (a, b) => t`${mn} is ${a} but not ${b}`, formula: 'P & ~Q', holds: (x, y) => x && !y, wrong: ['P & Q', '~(P & Q)'] },
  neither: { text: (a, b) => t`${mn} is neither ${a} nor ${b}`, formula: '~P & ~Q', holds: (x, y) => !x && !y, wrong: ['~P | ~Q', '~P & Q'] },
  'not-both': { text: (a, b) => t`${mn} is not both ${a} and ${b}`, formula: '~(P & Q)', holds: (x, y) => !(x && y), wrong: ['~P & ~Q', '~P & Q'] },
  or: { text: (a, b) => t`${mn} is ${a} or ${b}, or both`, formula: 'P | Q', holds: (x, y) => x || y, wrong: ['P & Q', '(P | Q) & ~(P & Q)'] },
  'one-false': { text: (a, b) => t`at least one of "${mn} is ${a}" and "${mn} is ${b}" is false`, formula: '~P | ~Q', holds: (x, y) => !x || !y, wrong: ['~P & ~Q', '~(P | Q)'] },
};

interface SymP { k: number; shape: Shape }

const symbolize = generator<SymP>({
  id: 'symbolize',
  skill: 'Write an English sentence in symbols with and, or, and not, as in Book of Proof Section 2.2.',
  params: (rng) => ({ k: int(rng, 0, PROPS.length - 1), shape: pick(rng, ['and', 'but-not', 'neither', 'not-both', 'or', 'one-false'] as const) }),
  sane: ({ k }) => (k >= 0 && k < PROPS.length ? null : 'out of range'),
  problem({ k, shape }) {
    const [a, b] = PROPS[k] as (typeof PROPS)[number];
    const sh = SHAPES[shape];
    return {
      prompt: t`Let ${mP} be "${mn} is ${a}" and ${mQ} be "${mn} is ${b}". Write "${sh.text(a, b)}" in symbols, using ${mP}, ${mQ}, ${math`\land`}, ${math`\lor`}, and ${NOT}.`,
      answer: { kind: 'formula', expected: sh.formula, variables: ['P', 'Q'] },
      solution: [
        shape === 'but-not' ? t`"But" means "and" in logic; it only adds a contrast.` : shape === 'neither' ? t`"Neither ... nor" says both are false.` : shape === 'not-both' ? t`"Not both" denies the "and": at least one is false.` : shape === 'one-false' ? t`"At least one is false" is an "or" of the negations.` : t`Read the connective as written.`,
        t`So the statement is ${formula(toF(sh.formula))}.`,
      ],
    };
  },
  solve: ({ k, shape }) => {
    // Check the expected formula against the English meaning on the numbers 1 to 30, then return it.
    const [, , pa, pb] = PROPS[k] as (typeof PROPS)[number];
    const sh = SHAPES[shape];
    const f = formulaOf(sh.formula, ['P', 'Q']);
    const ok = upTo(30).every((n) => evalFormula(f, { P: pa(n), Q: pb(n) }) === sh.holds(pa(n), pb(n)));
    return ok ? sh.formula : 'P & ~P';
  },
  misconceptions: ({ shape }): Misconception[] => {
    const [w1, w2] = SHAPES[shape].wrong;
    const why: Record<string, Rich> = {
      'P | Q': t`"And" needs both to be true; ${math`\lor`} would allow just one.`,
      '~P & ~Q': shape === 'not-both' ? t`"Not both" allows one of them to be true; ${math`\lnot P \land \lnot Q`} says both are false. By De Morgan's law, ${math`\lnot (P \land Q)`} is ${math`\lnot P \lor \lnot Q`}.` : shape === 'one-false' ? t`"At least one is false" allows one to be true; ${math`\lnot P \land \lnot Q`} says both are false.` : t`That says both are false.`,
      'P & Q': shape === 'or' ? t`"Or, or both" needs only one to be true; ${math`\land`} needs both.` : t`The "not" is missing: "but not" says the second is false.`,
      '~(P & Q)': t`That says "not both", which allows ${mP} false. "But not" says ${mP} is true and ${mQ} is false.`,
      '~P | ~Q': t`"Neither ... nor" needs both false; ${math`\lor`} allows one of them to be true. By De Morgan's law, ${math`\lnot (P \lor Q)`} is ${math`\lnot P \land \lnot Q`}.`,
      '~P & Q': t`The ${NOT} must apply to both statements.`,
      '(P | Q) & ~(P & Q)': t`That is "one but not both". In logic "or" includes both.`,
      '~(P | Q)': t`That says both are false. "At least one is false" allows one of them to be true.`,
    };
    return [w1, w2].map((r) => ({ response: r, why: why[r] ?? t`Check each row of the truth table against the sentence.` }));
  },
});

function toF(text: string): F {
  const conv = (g: Formula): F => {
    if (g.kind === 'var') return V(g.name as 'P' | 'Q' | 'R');
    if (g.kind === 'not') return not(conv(g.arg));
    if (g.kind === 'bin' && (g.op === 'and' || g.op === 'or')) return g.op === 'and' ? and(conv(g.left), conv(g.right)) : or(conv(g.left), conv(g.right));
    throw new Error(`connectives: only and, or, not in ${text}`);
  };
  return conv(formulaOf(text, ['P', 'Q', 'R']));
}

// ---------------------------------------------------------------- Cambridge problems

const STATEMENT = [
  { id: 'true', label: t`A statement, and true` },
  { id: 'false', label: t`A statement, and false` },
  { id: 'open', label: t`Not a statement: an open sentence` },
] as const satisfies readonly ChoiceOption[];

function statementVerdict(o: { n: number; text: Rich; verdict: 'true' | 'false' | 'open'; steps: Rich[]; check: () => 'true' | 'false' | 'open' }): AutoProblem {
  const at = `Section 2.1, exercise ${o.n}`;
  return auto({
    id: `bop-2-1-${o.n}`,
    source: cite('bop', at),
    title: t`Statement or not`,
    prompt: t`Is this a statement? If it is, is it true or false? ${o.text}`,
    answer: { kind: 'choice', options: STATEMENT, correct: o.verdict },
    solution: o.steps,
    reference: o.check(),
    verify: () => same(`Book of Proof ${at}`, o.check(), o.verdict),
    official: { source: cite('bop', `Solutions, ${at}`), answer: o.verdict, agrees: true },
  });
}

const reals = [-2.5, -1, -0.5, 0, 0.5, 1, Math.PI, 7];
/** Both truth values occur as the variable changes: an open sentence. */
const openOr = (vals: readonly boolean[]): 'true' | 'false' | 'open' => (vals.every((v) => v) ? 'true' : vals.every((v) => !v) ? 'false' : 'open');

const bop21_1 = statementVerdict({
  n: 1, text: t`"Every real number is an even integer."`, verdict: 'false',
  steps: [t`It is a statement: it is definitely true or definitely false. It is false: ${math`\frac{${1}}{${2}}`} is a real number and not an integer at all.`],
  check: () => (reals.every((x) => Number.isInteger(x) && x % 2 === 0) ? 'true' : 'false'),
});
const bop21_3 = statementVerdict({
  n: 3, text: t`"If ${math`x`} and ${math`y`} are real numbers and ${math`${5}x = ${5}y`}, then ${math`x = y`}."`, verdict: 'true',
  steps: [t`It is a statement about every pair of reals, so it has one truth value. It is true: divide both sides of ${math`${5}x = ${5}y`} by ${5}.`],
  check: () => openOr(reals.flatMap((x) => reals.map((y) => !(5 * x === 5 * y) || x === y))),
});
const bop21_9 = statementVerdict({
  n: 9, text: t`"${math`\cos(x) = -${1}`}."`, verdict: 'open',
  steps: [t`It is not a statement: whether it is true depends on ${math`x`}. It is true at ${math`x = \pi`} and false at ${math`x = ${0}`}. A sentence like this is an [[open-sentence|open sentence]].`],
  check: () => openOr(reals.map((x) => Math.abs(Math.cos(x) + 1) < 1e-12)),
});
const bop21_11 = statementVerdict({
  n: 11, text: t`"The integer ${math`x`} is a multiple of ${7}."`, verdict: 'open',
  steps: [t`It is an open sentence, not a statement: it is true for ${math`x = ${14}`} and false for ${math`x = ${15}`}.`],
  check: () => openOr(upTo(30).map((x) => x % 7 === 0)),
});
const bop21_13 = statementVerdict({
  n: 13, text: t`"Either ${math`x`} is a multiple of ${7}, or it is not."`, verdict: 'true',
  steps: [t`This one is a statement, although it mentions ${math`x`}: it is true whatever ${math`x`} is, because every integer either is a multiple of ${7} or is not.`],
  check: () => openOr(upTo(60).map((x) => x % 7 === 0 || x % 7 !== 0)),
});

/** A sentence about numbers or sets, with given meanings for P and Q, and its formula, checked on sample values. */
function bop22(o: { n: number; title: Rich; prompt: Rich; formula: string; vars: readonly string[]; samples: () => readonly (readonly [Record<string, boolean>, boolean])[]; steps: Rich[]; official?: string; wrong?: Misconception[] }): AutoProblem {
  const at = `Section 2.2, exercise ${o.n}`;
  const spec: Parameters<typeof auto>[0] = {
    id: `bop-2-2-${o.n}`,
    source: cite('bop', at, true),
    title: o.title,
    prompt: o.prompt,
    answer: { kind: 'formula', expected: o.formula, variables: o.vars },
    solution: o.steps,
    reference: o.formula,
    verify: () => {
      const f = formulaOf(o.formula, o.vars);
      const bad = o.samples().find(([env, want]) => evalFormula(f, env) !== want);
      return bad === undefined ? null : `Book of Proof ${at}: ${o.formula} disagrees with the sentence at ${JSON.stringify(bad[0])}`;
    },
    misconceptions: o.wrong ?? [],
  };
  if (o.official !== undefined) spec.official = { source: cite('bop', `Solutions, ${at}`), answer: o.official, agrees: true };
  return auto(spec);
}

const pairs = (f: (x: number, y: number) => readonly [Record<string, boolean>, boolean]) => [0, 1, 2].flatMap((x) => [0, 1, 2].map((y) => f(x, y)));

const bop22_7 = bop22({
  n: 7, title: t`"But" in symbols`,
  prompt: t`Let ${mP} be "${math`x = ${0}`}" and ${mQ} be "${math`y = ${0}`}". Write in symbols: "The number ${math`x`} equals zero, but the number ${math`y`} does not."`,
  formula: 'P & ~Q', vars: ['P', 'Q'],
  samples: () => pairs((x, y) => [{ P: x === 0, Q: y === 0 }, x === 0 && y !== 0]),
  steps: [t`"But" joins two claims that both hold, so it is "and": ${math`P \land \lnot Q`}.`],
  official: 'P ∧ ∼Q',
  wrong: [{ response: 'P & Q', why: t`"Does not" negates the second statement: ${math`\lnot Q`}.` }],
});
const bop22_8 = bop22({
  n: 8, title: t`At least one is zero`,
  prompt: t`Let ${mP} be "${math`x = ${0}`}" and ${mQ} be "${math`y = ${0}`}". Write in symbols: "At least one of the numbers ${math`x`} and ${math`y`} equals ${0}."`,
  formula: 'P | Q', vars: ['P', 'Q'],
  samples: () => pairs((x, y) => [{ P: x === 0, Q: y === 0 }, x === 0 || y === 0]),
  steps: [t`"At least one" is the inclusive "or": ${math`P \lor Q`}, true also when both are zero.`],
  wrong: [{ response: 'P & Q', why: t`That says both are zero. "At least one" needs only one.` }],
});
const setSamples = (want: (a: boolean, b: boolean) => boolean) => () => [[true, true], [true, false], [false, true], [false, false]].map(([a, b]) => [{ P: a as boolean, Q: b as boolean }, want(a as boolean, b as boolean)] as const);
const bop22_9 = bop22({
  n: 9, title: t`Membership of a difference`,
  prompt: t`Let ${mP} be "${math`x \in A`}" and ${mQ} be "${math`x \in B`}". Write "${math`x \in A - B`}" in symbols.`,
  formula: 'P & ~Q', vars: ['P', 'Q'],
  samples: setSamples((a, b) => a && !b),
  steps: [t`${math`A - B`} holds the elements of ${math`A`} that are not in ${math`B`}, so ${math`x \in A - B`} is ${math`P \land \lnot Q`}.`],
  // Printed as (x ∈ A) ∧ ∼(x ∈ B), which is P ∧ ∼Q with these letters.
  official: 'P ∧ ∼Q',
  wrong: [{ response: 'P | ~Q', why: t`${math`x`} must be in ${math`A`}, and also not in ${math`B`}: both at once, so "and".` }],
});
const bop22_10 = bop22({
  n: 10, title: t`Membership of a union`,
  prompt: t`Let ${mP} be "${math`x \in A`}" and ${mQ} be "${math`x \in B`}". Write "${math`x \in A \cup B`}" in symbols.`,
  formula: 'P | Q', vars: ['P', 'Q'],
  samples: setSamples((a, b) => a || b),
  steps: [t`${math`A \cup B`} holds what is in ${math`A`} or in ${math`B`}, so ${math`x \in A \cup B`} is ${math`P \lor Q`}.`],
  wrong: [{ response: 'P & Q', why: t`That is membership of ${math`A \cap B`}. The union needs only one.` }],
});

function tableProblem(o: { id: string; at: string; doc?: 'bop' | 'tmua-logic-proof'; title: Rich; prompt: Rich; vars: readonly string[]; texts: readonly string[]; given?: (row: number, col: number) => boolean; steps: Rich[]; official?: readonly string[]; adapted?: boolean }): AutoProblem {
  const fs = o.texts.map((x) => formulaOf(x, o.vars));
  const answer = fillTable(o.vars, o.texts.map((x) => [formula(toF(x))]), (env) => fs.map((f) => evalFormula(f, env)), o.given);
  // A second evaluation, through the connectives' own evaluator.
  const second = (): string[] => {
    const out: string[] = [];
    rows(o.vars as ('P' | 'Q' | 'R')[]).forEach((r, i) => o.texts.forEach((x, c) => { if (!(o.given?.(i, c) ?? false)) out.push(TF(evalF(toF(x), r))); }));
    return out;
  };
  const spec: Parameters<typeof auto>[0] = {
    id: o.id,
    source: cite(o.doc ?? 'bop', o.at, o.adapted === true),
    title: o.title,
    prompt: o.prompt,
    answer,
    solution: o.steps,
    reference: second(),
    verify: () => same(`${o.at}: the table two ways`, answer.expected.join(''), second().join('')),
  };
  if (o.official !== undefined) spec.official = { source: cite(o.doc ?? 'bop', `Solutions, ${o.at}`), answer: o.official, agrees: true };
  return auto(spec);
}

// TMUA writes A, B, C for statements; the tables use P, Q, R as the rest of the course does.
const tmuaC1 = tableProblem({
  id: 'tmua-c-1', at: 'Exercise C, question 1', doc: 'tmua-logic-proof', adapted: true,
  title: t`A truth table for three statements`,
  prompt: t`Complete the [[truth-table|truth table]] for ${math`P \land (Q \land R)`}. The first rows are filled in as in the source.`,
  vars: ['P', 'Q', 'R'], texts: ['Q & R', 'P & (Q & R)'],
  given: (row, col) => (col === 0 ? row < 4 : row < 2),
  steps: [
    t`${math`Q \land R`} is true only when ${mQ} and ${mR} are both true: rows ${1} and ${5}.`,
    t`${math`P \land (Q \land R)`} also needs ${mP} true, so it is true only in row ${1}, where all three are true.`,
  ],
});
const tmuaC4 = tableProblem({
  id: 'tmua-c-4', at: 'Exercise C, question 4', doc: 'tmua-logic-proof', adapted: true,
  title: t`Bracketing "or" two ways`,
  prompt: t`Draw up the truth tables for ${math`P \lor (Q \lor R)`} and ${math`(P \lor Q) \lor R`}. What do you notice?`,
  vars: ['P', 'Q', 'R'], texts: ['P | (Q | R)', '(P | Q) | R'],
  steps: [
    t`Each is false only when all three are false, in the last row, and true in every other row.`,
    t`The columns agree, so the brackets do not matter: ${math`P \lor Q \lor R`} has one meaning, "at least one is true".`,
  ],
});
const bop25_9 = tableProblem({
  id: 'bop-2-5-9', at: 'Section 2.5, exercise 9',
  title: t`Not, or, not`,
  prompt: t`Write a truth table for ${math`\lnot (\lnot P \lor \lnot Q)`}, column by column.`,
  vars: ['P', 'Q'], texts: ['~P', '~Q', '~P | ~Q', '~(~P | ~Q)'],
  steps: [
    t`Negate each letter, then take the "or" of the negations, then negate that.`,
    t`The last column is true only in the first row, where ${mP} and ${mQ} are both true: it is the same as ${math`P \land Q`}.`,
  ],
  official: ['F', 'F', 'F', 'T', 'F', 'T', 'T', 'F', 'T', 'F', 'T', 'F', 'T', 'T', 'T', 'F'],
});
const bop25_5 = tableProblem({
  id: 'bop-2-5-5', at: 'Section 2.5, exercise 5',
  title: t`A contradiction or ${mQ}`,
  prompt: t`Write a truth table for ${math`(P \land \lnot P) \lor Q`}.`,
  vars: ['P', 'Q'], texts: ['P & ~P', '(P & ~P) | Q'],
  steps: [t`${math`P \land \lnot P`} is false in every row. So the "or" is true exactly when ${mQ} is: the statement has the same truth value as ${mQ}.`],
  official: ['F', 'T', 'F', 'F', 'F', 'T', 'F', 'F'],
});
const bop25_8 = tableProblem({
  id: 'bop-2-5-8', at: 'Section 2.5, exercise 8',
  title: t`Three letters`,
  prompt: t`Write a truth table for ${math`P \lor (Q \land \lnot R)`}.`,
  vars: ['P', 'Q', 'R'], texts: ['Q & ~R', 'P | (Q & ~R)'],
  steps: [t`${math`Q \land \lnot R`} is true only when ${mQ} is true and ${mR} is false. Then the "or" with ${mP} is true in every row where ${mP} is true, and in the row where ${mP} is false, ${mQ} true, and ${mR} false.`],
});
const bop26_4 = tableProblem({
  id: 'bop-2-6-4', at: 'Section 2.6, exercise 4',
  title: t`De Morgan by truth table`,
  prompt: t`Use a truth table to show that ${math`\lnot (P \lor Q)`} and ${math`(\lnot P) \land (\lnot Q)`} are logically equivalent: fill in both columns.`,
  vars: ['P', 'Q'], texts: ['~(P | Q)', '~P & ~Q'],
  steps: [t`Both columns are true only in the last row, where ${mP} and ${mQ} are both false, so the two statements are equivalent.`],
});

function equivalent(a: string, b: string, vars: readonly string[]): boolean {
  const fa = formulaOf(a, vars);
  const fb = formulaOf(b, vars);
  return assignments(vars).every((env) => evalFormula(fa, env) === evalFormula(fb, env));
}
function equivVerdict(o: { n: number; a: string; b: string; vars: readonly string[]; claim: boolean; steps: Rich[]; official?: boolean }): AutoProblem {
  const at = `Section 2.6, exercise ${o.n}`;
  const spec: Parameters<typeof auto>[0] = {
    id: `bop-2-6-${o.n}`,
    source: cite('bop', at),
    title: t`Equivalent or not`,
    prompt: t`Decide whether or not ${formula(toF(o.a))} and ${formula(toF(o.b))} are logically equivalent.`,
    answer: { kind: 'choice', options: [{ id: 'yes', label: t`Equivalent` }, { id: 'no', label: t`Not equivalent` }], correct: o.claim ? 'yes' : 'no' },
    solution: o.steps,
    reference: equivalent(o.a, o.b, o.vars) ? 'yes' : 'no',
    verify: () => same(`Book of Proof ${at} by truth table`, equivalent(o.a, o.b, o.vars), o.claim),
  };
  if (o.official !== undefined) spec.official = { source: cite('bop', `Solutions, ${at}`), answer: o.official ? 'yes' : 'no', agrees: true };
  return auto(spec);
}
const bop26_9 = equivVerdict({
  n: 9, a: 'P & Q', b: '~(~P | ~Q)', vars: ['P', 'Q'], claim: true, official: true,
  steps: [t`By De Morgan's law ${math`\lnot (\lnot P \lor \lnot Q)`} is ${math`\lnot\lnot P \land \lnot\lnot Q`}, which is ${math`P \land Q`}. Equivalent.`],
});
const bop26_13 = equivVerdict({
  n: 13, a: 'P | (Q & R)', b: '(P | Q) & R', vars: ['P', 'Q', 'R'], claim: false, official: false,
  steps: [t`Not equivalent: with ${mP} true and ${mQ}, ${mR} false, the first is true and the second is false. One row where they differ settles it.`],
});

const tmuaA1 = auto({
  id: 'tmua-a-1', source: cite('tmua-logic-proof', 'Exercise A, question 1', true),
  title: t`Statements about ${21}`,
  prompt: t`Which of these must be true and which must be false? Write T or F for each.`,
  answer: {
    kind: 'table', columns: [t`statement`, t`true or false`], cell: 'truth',
    rows: [
      [t`${21} is divisible by ${3} and ${21} is divisible by ${6}`, null],
      [t`${21} is divisible by ${3} or ${21} is divisible by ${6}`, null],
      [t`${21} is not divisible by ${6}`, null],
    ],
    expected: [TF(21 % 3 === 0 && 21 % 6 === 0), TF(21 % 3 === 0 || 21 % 6 === 0), TF(21 % 6 !== 0)],
  },
  solution: [
    t`${21} is divisible by ${3} (it is ${math`${3} \times ${7}`}) and not by ${6} (it is odd). So the "and" is false, the "or" is true, and the "not" is true.`,
  ],
  reference: ['F', 'T', 'T'],
  verify: () => same('TMUA A1', [21 % 3 === 0 && 21 % 6 === 0, 21 % 3 === 0 || 21 % 6 === 0, 21 % 6 !== 0].map(TF).join(''), 'FTT'),
});
const tmuaB1 = auto({
  id: 'tmua-b-1', source: cite('tmua-logic-proof', 'Exercise B, question 1'),
  title: t`Not not`,
  prompt: t`If ${math`A`} is true, what can you say about "not not ${math`A`}"? What about "not not not ${math`A`}"?`,
  answer: { kind: 'table', columns: [t`statement`, t`truth value when A is true`], cell: 'truth', rows: [[t`not not A`, null], [t`not not not A`, null]], expected: ['T', 'F'] },
  solution: [t`Each "not" flips the truth value. Two flips return to true; three flips give false.`],
  reference: ['true', 'false'],
  verify: () => {
    const nots = (m: number, a: boolean): boolean => (m === 0 ? a : !nots(m - 1, a));
    return same('TMUA B1', [nots(2, true), nots(3, true)].map(TF).join(''), 'TF');
  },
});

const tmuaB2 = supervision({
  id: 'tmua-b-2', source: cite('tmua-logic-proof', 'Exercise B, question 2'),
  title: t`Many nots`,
  prompt: t`Work out a general rule for the truth value of "not not not ... not ${math`A`}", with ${math`m`} lots of "not", when ${math`A`} is true and when ${math`A`} is false. Explain why the rule holds.`,
  writeUp: 'explanation',
});
const tmuaA2 = supervision({
  id: 'tmua-a-2', source: cite('tmua-logic-proof', 'Exercise A, questions 2 and 3', true),
  title: t`Replacing ${21} by ${math`x`}`,
  prompt: t`Replace ${21} by a real number ${math`x`} in "${math`x`} is divisible by ${3} and ${math`x`} is divisible by ${6}", and in the "or" and "not" versions. Are they still statements? What happens to your answers, and what changes if ${math`x`} may only be a whole number?`,
  writeUp: 'explanation',
});
const bop22_12 = supervision({
  id: 'bop-2-2-12', source: cite('bop', 'Section 2.2, exercise 12'),
  title: t`Tolstoy in symbols`,
  prompt: t`Express "Happy families are all alike, but each unhappy family is unhappy in its own way" in a symbolic form such as ${math`P \land Q`}, ${math`P \lor Q`}, or ${math`\lnot P`}. Say exactly what statements ${mP} and ${mQ} stand for.`,
  writeUp: 'explanation',
});

// ---------------------------------------------------------------- lesson

const two = rows(['P', 'Q']);
const ex = or(not(P), Q);

export const connectives: TopicContent = {
  topicId: 'logic.connectives',
  goal: t`Combine statements with and, or, and not, write sentences in symbols, and work out the truth of the result with a truth table.`,
  lesson: [
    { kind: 'p', text: t`A [[statement|statement]] is a sentence that is either true or false, such as "${21} is divisible by ${3}". Whether it is true or false is its [[truth-value|truth value]]. Letters such as ${mP} and ${mQ} stand for statements.` },
    { kind: 'p', text: t`A sentence with a variable, such as "${math`x`} is divisible by ${3}", is not yet a statement: it is true for some ${math`x`} and false for others. Book of Proof calls it an [[open-sentence|open sentence]]. It becomes a statement when ${math`x`} is given a value, or when it is true or false whatever ${math`x`} is: "${math`x`} is a multiple of ${7} or it is not" is a true statement.` },
    {
      kind: 'list',
      items: [
        t`"${mP} and ${mQ}", the [[conjunction|conjunction]], is true when both are true. It is written ${math`P \land Q`}.`,
        t`"${mP} or ${mQ}", the [[disjunction|disjunction]], is true when at least one is true, including when both are. It is written ${math`P \lor Q`}.`,
        t`"not ${mP}", the [[negation|negation]], is true exactly when ${mP} is false. It is written ${math`\lnot P`}.`,
      ],
    },
    {
      kind: 'table', caption: t`A [[truth-table|truth table]] lists every combination of truth values, one per row.`,
      head: [[mP], [mQ], [math`P \land Q`], [math`P \lor Q`], [math`\lnot P`]],
      rows: two.map((r) => [yn(r.P), yn(r.Q), yn(r.P && r.Q), yn(r.P || r.Q), yn(!r.P)]),
    },
    { kind: 'p', text: t`With ${2} statements there are ${two.length} rows; each extra statement doubles the count, so ${3} statements give ${math`${2}^{${3}} = ${2 ** 3}`} rows.` },
    { kind: 'p', text: t`In everyday speech "or" often means one but not both ("tea or coffee?"). In mathematics "or" always allows both. Saying "one but not both" needs more words: ${math`(P \lor Q) \land \lnot (P \land Q)`}, "${mP} or ${mQ}, and not both".` },
    { kind: 'p', text: t`Book of Proof writes ${math`\sim P`} for ${math`\lnot P`}; the TMUA notes write the words "and", "or", "not" in bold. They mean the same.` },
    { kind: 'p', text: t`The CST notes put these to work in proofs. To prove "${mP} and ${mQ}", prove each. To use it, you may use either. To prove "${mP} or ${mQ}", prove one of them (or assume ${math`\lnot P`} and prove ${mQ}). To use "${mP} or ${mQ}", split into two cases, one for each.` },
    { kind: 'p', text: t`${NOT} applies to what comes right after it. In ${formula(ex)}, ${NOT} flips ${mP} only, so read it as ${math`(\lnot P) \lor Q`}. To flip a whole compound, put it in brackets: ${formula(not(or(P, Q)))}.` },
    {
      kind: 'table', caption: t`Working out ${formula(ex)} one column at a time.`,
      head: [[mP], [mQ], [math`\lnot P`], [formula(ex)]],
      rows: two.map((r) => [yn(r.P), yn(r.Q), yn(!r.P), yn(evalF(ex, r))]),
    },
  ],
  examples: [
    worked(whichRows, { i: 2 }, t`When is ${math`\lnot (P \lor Q)`} true?`),
    workedCambridge(tmuaC1),
    workedCambridge(bop25_9),
    workedCambridge(bop22_7),
  ],
  generators: [whichRows, countTrue, tableSize, fillColumn, symbolize],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['statement', 'open-sentence', 'truth-value', 'conjunction', 'disjunction', 'negation', 'truth-table'],
  cambridge: [
    tmuaA1, tmuaB1, bop21_1, bop21_3, bop21_9, bop21_11, bop21_13, bop22_8, bop22_9, bop22_10,
    bop25_5, bop25_8, bop26_4, bop26_9, bop26_13, tmuaC4, tmuaA2, tmuaB2, bop22_12,
  ],
  gate: [],
};
