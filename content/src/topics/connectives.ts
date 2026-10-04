/** logic.connectives: And, or, and not. */
import { int, pick } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { math, t, type Span } from '../rich';
import { worked, type TopicContent } from '../topic';

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

/** "not P or Q", with brackets where an operand is a compound of a different kind. */
function show(f: F): string {
  switch (f.op) {
    case 'var': return f.v;
    case 'not': return f.a.op === 'var' || f.a.op === 'not' ? `not ${show(f.a)}` : `not (${show(f.a)})`;
    default: {
      const side = (g: F): string => (g.op === 'and' || g.op === 'or' ? `(${show(g)})` : show(g));
      return `${side(f.a)} ${f.op} ${side(f.b)}`;
    }
  }
}

const formula = (f: F): Span => math`${show(f)}`;
const TF = (b: boolean): string => (b ? 'T' : 'F');
const rowId = (r: Row, vars: readonly string[]): string => `r${vars.map((v) => TF(r[v as 'P'])).join('')}`;
const rowLabel = (r: Row, vars: readonly ('P' | 'Q' | 'R')[]) => t`${vars.map((v) => `${v} = ${TF(r[v])}`).join(', ')}`;
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
      prompt: t`P, Q${vs.includes('R') ? ', and R' : ''} are statements. Choose every row where ${formula(f)} is true. (T means true, F means false.)`,
      answer: { kind: 'choice', options, correct: trueRows(f) },
      solution: [
        t`Work out the brackets first, then "not", then "and" and "or" as written.`,
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
      { response: trueRows(f, 'exclusive-or'), why: t`It looks like you read "or" as "one or the other but not both". In logic, "P or Q" is true when at least one is true, including when both are.` },
      { response: trueRows(f, 'no-not'), why: t`It looks like a "not" was skipped. "not" flips the truth value of what follows it: of the single letter, or of the whole bracket after it.` },
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
      prompt: t`P, Q${vs.includes('R') ? ', and R' : ''} are statements. In how many rows of the [[truth-table|truth table]] is ${formula(f)} true?`,
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
      { response: String(trueRows(f, 'exclusive-or').length), why: t`It looks like you read "or" as exclusive. In logic, "or" is also true when both sides are true.` },
      { response: String(trueRows(f, 'no-not').length), why: t`It looks like a "not" was skipped. "not" flips the truth value of what follows it.` },
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
      t`By the product rule there are ${math`${2}^${n} = ${2 ** n}`} rows.`,
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
    { response: String(n ** 2), why: t`The base and the power are swapped: ${2} choices for each of ${n} statements is ${math`${2}^${n}`}.` },
  ],
});

// ---------------------------------------------------------------- lesson

const two = rows(['P', 'Q']);
const yn = (b: boolean) => t`${TF(b)}`;
const ex = or(not(P), Q);

export const connectives: TopicContent = {
  topicId: 'logic.connectives',
  goal: t`Combine statements with and, or, and not, and work out the truth of the result with a truth table.`,
  lesson: [
    { kind: 'p', text: t`A [[statement|statement]] is a sentence that is either true or false, such as "${7} is prime". Whether it is true or false is its [[truth-value|truth value]]. Letters such as P and Q stand for statements.` },
    {
      kind: 'list',
      items: [
        t`"P and Q", the [[conjunction|conjunction]], is true when both are true. It is also written ${math`P ∧ Q`}.`,
        t`"P or Q", the [[disjunction|disjunction]], is true when at least one is true, including when both are. It is also written ${math`P ∨ Q`}.`,
        t`"not P", the [[negation|negation]], is true exactly when P is false. It is also written ${math`¬P`}.`,
      ],
    },
    {
      kind: 'table', caption: t`A [[truth-table|truth table]] lists every combination of truth values, one per row.`,
      head: [t`P`, t`Q`, t`P and Q`, t`P or Q`, t`not P`],
      rows: two.map((r) => [yn(r.P), yn(r.Q), yn(r.P && r.Q), yn(r.P || r.Q), yn(!r.P)]),
    },
    { kind: 'p', text: t`With ${2} statements there are ${two.length} rows; each extra statement doubles the count, so ${3} statements give ${2 ** 3} rows.` },
    { kind: 'p', text: t`In everyday speech "or" often means one but not both ("tea or coffee?"). In mathematics "or" always allows both. Saying "one but not both" needs more words: "P or Q, and not both".` },
    { kind: 'p', text: t`"not" applies to what comes right after it. In ${formula(ex)}, "not" flips P only, so read it as "(not P) or Q". To flip a whole compound, put it in brackets: ${formula(not(or(P, Q)))}.` },
    {
      kind: 'table', caption: t`Working out ${formula(ex)} one column at a time.`,
      head: [t`P`, t`Q`, t`not P`, t`${formula(ex)}`],
      rows: two.map((r) => [yn(r.P), yn(r.Q), yn(!r.P), yn(evalF(ex, r))]),
    },
  ],
  examples: [
    worked(whichRows, { i: 2 }, t`When is "not (P or Q)" true?`),
    worked(countTrue, { i: 3 }, t`Counting true rows with three statements`),
  ],
  generators: [whichRows, countTrue, tableSize],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['statement', 'truth-value', 'conjunction', 'disjunction', 'negation', 'truth-table'],
};
