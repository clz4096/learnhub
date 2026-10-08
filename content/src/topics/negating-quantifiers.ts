/**
 * logic.negating-quantifiers: Negating a quantified statement: "not for all" is "there
 * exists ... not", and "not there exists" is "for all ... not", applied quantifier by
 * quantifier. The lesson follows the TMUA notes on negating "for all" and "there exists"
 * (pages 61 to 63: S1, N1, S2, N2), Book of Proof Section 2.10 (Examples 2.12 to 2.15), and
 * the CST notes' equivalences for negation (printed page 134). The problems are Book of
 * Proof's exercises for Section 2.10, checked against the solutions to odd exercises, and
 * supervision exercise 1.1.5 with its 2023-24 official solution. Batch 7 adds IA Numbers and
 * Sets Example Sheet 1, Q5. Exercise 16 of the CST Logic and Proof notes (the part by
 * equivalences) is a written proof, so it is in proof.direct (Rule 1, 2026-10-08). The notes'
 * Exercise 14, first line, is the lesson's theorem, so it is not set.
 */
import { auto, type AutoProblem, cite, same, supervision, withUses } from '../cambridge';
import { int, upTo } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { computedTex, dmath, math, t, type Rich, type Span } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const [mx, my] = [math`x`, math`y`];
const [mS1, mN1] = [math`S_{${1}}`, math`N_{${1}}`];
const TF = (b: boolean): string => (b ? 'T' : 'F');

/** Four orders of four options, so the right one moves. */
const ORDERS: readonly (readonly number[])[] = [[0, 1, 2, 3], [1, 0, 3, 2], [2, 3, 0, 1], [3, 2, 1, 0]];
function ordered(texts: readonly Rich[], order: number): ChoiceOption[] {
  const ids = ['right', 'keep-inside', 'keep-quantifiers', 'slip'];
  return (ORDERS[order] as readonly number[]).map((k) => ({ id: ids[k] as string, label: texts[k] as Rich }));
}

// ---------------------------------------------------------------- negating in symbols

type Q = 'A' | 'E';
/** A statement: its quantifiers (each with its variable and set, as LaTeX), its inside, the negated inside, and a wrong negation of the inside. */
interface QStmt { qs: readonly (readonly [Q, string])[]; body: string; neg: string; slip: string }
const Z = '\\mathbb{Z}';
const R = '\\mathbb{R}';
const N = '\\mathbb{N}';
const STMTS: readonly QStmt[] = [
  { qs: [['A', `x \\in ${Z}`], ['E', `y \\in ${Z}`]], body: 'y > x', neg: 'y \\le x', slip: 'y < x' },
  { qs: [['E', `x \\in ${Z}`], ['A', `y \\in ${Z}`]], body: 'x \\le y', neg: 'x > y', slip: 'x \\ge y' },
  { qs: [['A', `x \\in ${R}`], ['E', `y \\in ${R}`]], body: 'y^{3} = x', neg: 'y^{3} \\ne x', slip: 'y^{3} = -x' },
  { qs: [['A', `x \\in ${Z}`], ['E', `y \\in ${Z}`]], body: 'x + y = 0', neg: 'x + y \\ne 0', slip: 'x - y = 0' },
  { qs: [['E', `y \\in ${N}`], ['A', `x \\in ${N}`]], body: 'x \\mid y', neg: 'x \\nmid y', slip: 'y \\mid x' },
  { qs: [['A', `x \\in ${R}`], ['E', `y \\in ${R}`]], body: 'xy = 1', neg: 'xy \\ne 1', slip: 'xy = -1' },
  { qs: [['A', `x \\in ${Z}`]], body: 'x \\text{ odd} \\Rightarrow x^{2} \\text{ odd}', neg: 'x \\text{ odd} \\land x^{2} \\text{ even}', slip: 'x \\text{ odd} \\Rightarrow x^{2} \\text{ even}' },
  { qs: [['A', `x \\in ${R}`]], body: 'x > 2 \\Rightarrow x^{2} > 4', neg: 'x > 2 \\land x^{2} \\le 4', slip: 'x \\le 2 \\land x^{2} \\le 4' },
  { qs: [['E', `x \\in ${R}`]], body: 'x^{2} < 0', neg: 'x^{2} \\ge 0', slip: 'x^{2} > 0' },
  { qs: [['A', `x \\in ${R}`]], body: 'x^{2} > 6', neg: 'x^{2} \\le 6', slip: 'x^{2} < 6' },
  { qs: [['A', `x \\in ${Z}`], ['A', `y \\in ${Z}`]], body: 'x + y = y + x', neg: 'x + y \\ne y + x', slip: 'x + y = y - x' },
];
const flip = (q: Q): Q => (q === 'A' ? 'E' : 'A');
const qTex = (q: Q): string => (q === 'A' ? '\\forall' : '\\exists');
const stmtTex = (qs: readonly (readonly [Q, string])[], body: string): Span => computedTex(`${qs.map(([q, v]) => `${qTex(q)} ${v}`).join('\\ ')}.\\ ${body}`);
const flipped = (s: QStmt) => s.qs.map(([q, v]) => [flip(q), v] as const);

interface NegP { i: number; order: number }

const negateSymbols = generator<NegP>({
  id: 'negate-symbols',
  skill: 'Negate a quantified statement in symbols: swap every quantifier and negate what is inside.',
  params: (rng) => ({ i: int(rng, 0, STMTS.length - 1), order: int(rng, 0, ORDERS.length - 1) }),
  sane: ({ i, order }) => (i >= 0 && i < STMTS.length && order >= 0 && order < ORDERS.length ? null : 'out of range'),
  problem: ({ i, order }) => {
    const s = STMTS[i] as QStmt;
    const texts: Rich[] = [[stmtTex(flipped(s), s.neg)], [stmtTex(flipped(s), s.body)], [stmtTex(s.qs, s.neg)], [stmtTex(flipped(s), s.slip)]];
    return {
      prompt: t`Which statement is the negation of ${stmtTex(s.qs, s.body)}?`,
      answer: { kind: 'choice', options: ordered(texts, order), correct: 'right' },
      solution: [
        t`Move the "not" in from the front, one quantifier at a time: ${math`\lnot \forall`} becomes ${math`\exists \lnot`}, and ${math`\lnot \exists`} becomes ${math`\forall \lnot`}.`,
        t`So every quantifier swaps, and the "not" lands on the inside: ${math`\lnot (${computedTex(s.body)})`} is ${computedTex(s.neg)}.`,
        t`The negation is ${stmtTex(flipped(s), s.neg)}.`,
      ],
    };
  },
  solve: ({ i }) => {
    // Rebuild the negation by pushing the "not" through each quantifier in turn, and find it among the options.
    const s = STMTS[i] as QStmt;
    let qs: (readonly [Q, string])[] = [];
    for (const [q, v] of s.qs) qs = [...qs, [flip(q), v]];
    const want = stmtTex(qs, s.neg).text;
    const texts = [stmtTex(flipped(s), s.neg), stmtTex(flipped(s), s.body), stmtTex(s.qs, s.neg), stmtTex(flipped(s), s.slip)].map((x) => x.text);
    return [['right', 'keep-inside', 'keep-quantifiers', 'slip'][texts.indexOf(want)] ?? '?'];
  },
  misconceptions: ({ i }): Misconception[] => {
    const s = STMTS[i] as QStmt;
    return [
      { response: ['keep-inside'], why: t`The quantifiers are swapped, but the inside is not negated. "Not for all" is "there exists one for which it fails".` },
      { response: ['keep-quantifiers'], why: t`The inside is negated, but the quantifiers must swap too: the negation of ${math`\forall x.\ P(x)`} is ${math`\exists x.\ \lnot P(x)`}, not ${math`\forall x.\ \lnot P(x)`}.` },
      { response: ['slip'], why: t`The quantifiers are right, but ${computedTex(s.slip)} is not the negation of ${computedTex(s.body)}: the negation must be true exactly when it is false. Here that is ${computedTex(s.neg)}.` },
    ];
  },
});

// ---------------------------------------------------------------- a statement or its negation

const RELS: readonly { tex: string; neg: string; holds: (x: number, y: number) => boolean }[] = [
  { tex: 'x \\le y', neg: 'x > y', holds: (x, y) => x <= y },
  { tex: 'x < y', neg: 'x \\ge y', holds: (x, y) => x < y },
  { tex: 'x \\mid y', neg: 'x \\nmid y', holds: (x, y) => y % x === 0 },
  { tex: 'y \\mid x', neg: 'y \\nmid x', holds: (x, y) => x % y === 0 },
  { tex: 'x + y \\text{ is even}', neg: 'x + y \\text{ is odd}', holds: (x, y) => (x + y) % 2 === 0 },
  { tex: 'x \\ne y', neg: 'x = y', holds: (x, y) => x !== y },
  { tex: 'xy \\text{ is even}', neg: 'xy \\text{ is odd}', holds: (x, y) => (x * y) % 2 === 0 },
];

interface WhichP { m: number; r: number; ae: boolean }

const whichTrue = generator<WhichP>({
  id: 'statement-or-negation',
  skill: 'On a small set, decide whether a statement or its negation is true: exactly one of them is.',
  params: (rng) => ({ m: int(rng, 3, 6), r: int(rng, 0, RELS.length - 1), ae: rng() < 0.5 }),
  sane: ({ m, r }) => (m >= 3 && m <= 6 && r >= 0 && r < RELS.length ? null : 'out of range'),
  problem: ({ m, r, ae }) => {
    const rel = RELS[r] as (typeof RELS)[number];
    const S = upTo(m);
    const set = `S`;
    const qs: [Q, string][] = ae ? [['A', `x \\in ${set}`], ['E', `y \\in ${set}`]] : [['E', `y \\in ${set}`], ['A', `x \\in ${set}`]];
    const truth = ae ? S.every((x) => S.some((y) => rel.holds(x, y))) : S.some((y) => S.every((x) => rel.holds(x, y)));
    const stmt = stmtTex(qs, rel.tex);
    const neg = stmtTex(qs.map(([q, v]) => [flip(q), v] as const), rel.neg);
    const failX = S.find((x) => !S.some((y) => rel.holds(x, y)));
    const goodY = S.find((y) => S.every((x) => rel.holds(x, y)));
    return {
      prompt: t`Let ${math`S = \{${1}, \ldots, ${m}\}`}. Write T or F for the statement ${stmt} and for its negation ${neg}.`,
      answer: { kind: 'table', cell: 'truth', columns: [t`statement`, t`T or F`], rows: [[t`the statement`, null], [t`its negation`, null]], expected: [TF(truth), TF(!truth)] },
      solution: [
        ae
          ? (truth ? t`For each ${mx} in ${math`S`} some ${my} works, so the statement is true.` : t`At ${math`x = ${failX as number}`} no ${my} in ${math`S`} works, so the statement is false: that ${mx} is the witness for the negation.`)
          : (truth ? t`${math`y = ${goodY as number}`} works for every ${mx} in ${math`S`}, so the statement is true.` : t`No single ${my} works for every ${mx}, so the statement is false, and the negation is true: each ${my} fails for some ${mx}.`),
        t`A statement and its negation always have opposite truth values: exactly one of them is true.`,
      ],
    };
  },
  solve: ({ m, r, ae }) => {
    // Through a table of the relation.
    const rel = RELS[r] as (typeof RELS)[number];
    const tab = upTo(m).map((x) => upTo(m).map((y) => rel.holds(x, y)));
    const truth = ae ? tab.every((row) => row.some(Boolean)) : upTo(m).some((_, yi) => tab.every((row) => row[yi] === true));
    return [TF(truth), TF(!truth)];
  },
  misconceptions: ({ m, r, ae }): Misconception[] => {
    const rel = RELS[r] as (typeof RELS)[number];
    const S = upTo(m);
    const truth = ae ? S.every((x) => S.some((y) => rel.holds(x, y))) : S.some((y) => S.every((x) => rel.holds(x, y)));
    return [
      { response: ['T', 'T'], why: t`A statement and its negation cannot both be true: the negation is true exactly when the statement is false.` },
      { response: ['F', 'F'], why: t`A statement and its negation cannot both be false: one of them is true.` },
      { response: [TF(!truth), TF(truth)], why: truth ? t`Check the statement again: it holds for these values.` : t`Check the statement again: it fails here, so its negation is the true one.` },
    ];
  },
});

// ---------------------------------------------------------------- negating "every ... is ..." in words

interface WordsItem { stmt: string; right: string; all: string; some: string; hyp: string }
const WORDS: readonly WordsItem[] = [
  { stmt: 'Every prime number bigger than two is odd.', right: 'There is a prime number bigger than two that is even.', all: 'Every prime number bigger than two is even.', some: 'There is a prime number bigger than two that is odd.', hyp: 'There is a number that is not a prime bigger than two and is even.' },
  { stmt: 'Every square of an odd integer is odd.', right: 'There is an odd integer whose square is even.', all: 'The square of every odd integer is even.', some: 'There is an odd integer whose square is odd.', hyp: 'There is an even integer whose square is even.' },
  { stmt: 'Every student who revised passed the test.', right: 'Some student who revised did not pass the test.', all: 'No student who revised passed the test.', some: 'Some student who revised passed the test.', hyp: 'Some student who did not revise did not pass the test.' },
  { stmt: 'Every multiple of four is even.', right: 'Some multiple of four is odd.', all: 'Every multiple of four is odd.', some: 'Some multiple of four is even.', hyp: 'Some number that is not a multiple of four is odd.' },
  { stmt: 'Every train that left on time arrived on time.', right: 'Some train that left on time arrived late.', all: 'Every train that left on time arrived late.', some: 'Some train that left on time arrived on time.', hyp: 'Some train that left late arrived late.' },
  { stmt: 'Every triangle with three equal sides has three equal angles.', right: 'Some triangle with three equal sides does not have three equal angles.', all: 'No triangle with three equal sides has three equal angles.', some: 'Some triangle with three equal sides has three equal angles.', hyp: 'Some triangle without three equal sides does not have three equal angles.' },
  { stmt: 'Every function that is differentiable is continuous.', right: 'Some differentiable function is not continuous.', all: 'No differentiable function is continuous.', some: 'Some differentiable function is continuous.', hyp: 'Some function that is not differentiable is not continuous.' },
];

interface WordsP { i: number; order: number }

const negateWords = generator<WordsP>({
  id: 'negate-in-words',
  skill: 'Negate "every A is B" in words: "some A is not B", as Book of Proof Example 2.15 negates "if x is odd, then x squared is odd".',
  params: (rng) => ({ i: int(rng, 0, WORDS.length - 1), order: int(rng, 0, ORDERS.length - 1) }),
  sane: ({ i, order }) => (i >= 0 && i < WORDS.length && order >= 0 && order < ORDERS.length ? null : 'out of range'),
  problem: ({ i, order }) => {
    const w = WORDS[i] as WordsItem;
    return {
      prompt: t`Which sentence is the negation of "${w.stmt}"?`,
      answer: { kind: 'choice', options: ordered([t`${w.right}`, t`${w.all}`, t`${w.some}`, t`${w.hyp}`], order), correct: 'right' },
      solution: [
        t`"Every A is B" is ${math`\forall x.\ A(x) \Rightarrow B(x)`}. Its negation is ${math`\exists x.\ \lnot (A(x) \Rightarrow B(x))`}, and ${math`\lnot (P \Rightarrow Q)`} is ${math`P \land \lnot Q`}.`,
        t`So the negation is "some A is not B": ${w.right}`,
      ],
    };
  },
  solve: ({ i }) => {
    // Check each option on every model with three objects, each with A and B true or false: the right one is the negation in all 64.
    const models = upTo(64).map((k) => [0, 1, 2].map((j) => ({ a: ((k - 1) >> (2 * j)) % 2 === 1, b: ((k - 1) >> (2 * j + 1)) % 2 === 1 })));
    type M = (typeof models)[number];
    const stmt = (m: M): boolean => m.every((o) => !o.a || o.b);
    const opts: Record<string, (m: M) => boolean> = {
      right: (m) => m.some((o) => o.a && !o.b),
      'keep-inside': (m) => m.every((o) => !o.a || !o.b),
      'keep-quantifiers': (m) => m.some((o) => o.a && o.b),
      slip: (m) => m.some((o) => !o.a && !o.b),
    };
    void i;
    return Object.keys(opts).filter((id) => models.every((m) => opts[id]?.(m) === !stmt(m)));
  },
  misconceptions: (): Misconception[] => [
    { response: ['keep-inside'], why: t`That is far stronger than the negation: it says every one fails. To deny "every A is B", one A that is not B is enough.` },
    { response: ['keep-quantifiers'], why: t`That one is compatible with the original; it does not deny it. The negation needs an A that is not B.` },
    { response: ['slip'], why: t`The negation keeps the condition A: it is about an A that is not B. Things that are not A say nothing about "every A is B".` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

/** Every finite model of a statement and its options: the right option is the negation in each; each wrong one differs in some model. */
function modelCheck<M>(models: readonly M[], stmt: (m: M) => boolean, options: Readonly<Record<string, (m: M) => boolean>>): string | null {
  for (const [id, f] of Object.entries(options)) {
    const negation = models.every((m) => f(m) === !stmt(m));
    if (negation !== (id === 'right')) return `option ${id} ${negation ? 'is also' : 'is not'} the negation`;
  }
  return null;
}

function negChoice(o: { id: string; at: string; doc?: 'bop' | 'tmua-logic-proof' | 'cst-dm-sw1'; title: Rich; prompt: Rich; options: readonly [Rich, Rich, Rich, Rich]; steps: Rich[]; verify: () => string | null; official?: { doc: 'bop' | 'tmua-logic-proof' | 'cst-dm-sols-2324-1'; at: string }; why: readonly [Rich, Rich, Rich]; hints?: readonly Rich[]; nudge?: Rich }): AutoProblem {
  const spec: Parameters<typeof auto>[0] = {
    id: o.id,
    source: cite(o.doc ?? 'bop', o.at, true),
    title: o.title,
    prompt: o.prompt,
    answer: { kind: 'choice', options: ordered(o.options, 0), correct: 'right' },
    solution: o.steps,
    reference: 'right',
    verify: o.verify,
    misconceptions: [
      { response: 'keep-inside', why: o.why[0] },
      { response: 'keep-quantifiers', why: o.why[1] },
      { response: 'slip', why: o.why[2] },
    ],
  };
  if (o.official !== undefined) spec.official = { source: cite(o.official.doc, o.official.at), answer: 'right', agrees: true };
  if (o.hints !== undefined) spec.hints = o.hints;
  if (o.nudge !== undefined) spec.nudge = o.nudge;
  return auto(spec);
}

/** The primes up to n. */
const primesTo = (n: number): number[] => upTo(n).filter((p) => p > 1 && upTo(p - 1).every((d) => d === 1 || p % d !== 0));

const bop3 = negChoice({
  id: 'bop-2-10-3', at: 'Section 2.10, exercise 3',
  title: t`Another prime`,
  prompt: t`Negate: "For every prime number ${math`p`}, there is another prime number ${math`q`} with ${math`q > p`}."`,
  options: [
    t`There is a prime number ${math`p`} such that for every other prime number ${math`q`}, ${math`q \le p`}.`,
    t`There is a prime number ${math`p`} such that for every other prime number ${math`q`}, ${math`q > p`}.`,
    t`For every prime number ${math`p`}, there is another prime number ${math`q`} with ${math`q \le p`}.`,
    t`There is a prime number ${math`p`} such that for every other prime number ${math`q`}, ${math`q < p`}.`,
  ],
  steps: [
    t`${math`\lnot \forall p\ \exists q.\ q > p`} is ${math`\exists p\ \forall q.\ q \le p`}: there is a largest prime. The original is true (Euclid), so this negation is false.`,
  ],
  verify: () => {
    // Finite sets of primes make the statement false, so also use every "greater than" relation on three
    // objects (64 of them): the right option is the negation in every model, and each wrong one differs in one.
    const objs = [0, 1, 2];
    const pairs = objs.flatMap((a) => objs.filter((b) => b !== a).map((b) => [a, b] as const));
    const models = upTo(64).map((k) => (q: number, p: number): boolean => ((k - 1) >> pairs.findIndex(([a, b]) => a === q && b === p)) % 2 === 1);
    const others = (p: number): number[] => objs.filter((q) => q !== p);
    return modelCheck(models, (gt) => objs.every((p) => others(p).some((q) => gt(q, p))), {
      right: (gt) => objs.some((p) => others(p).every((q) => !gt(q, p))),
      'keep-inside': (gt) => objs.some((p) => others(p).every((q) => gt(q, p))),
      'keep-quantifiers': (gt) => objs.every((p) => others(p).some((q) => !gt(q, p))),
      slip: (gt) => objs.some((p) => others(p).every((q) => gt(p, q))),
    }) ?? same('the primes up to 100, a finite model, have a largest', Math.max(...primesTo(100)), 97);
  },
  why: [
    t`The quantifiers are swapped but ${math`q > p`} is not negated.`,
    t`"For every ${math`p`}" must become "there is a ${math`p`}", and "there is a ${math`q`}" must become "for every ${math`q`}".`,
    t`The negation of ${math`q > p`} is ${math`q \le p`}, not ${math`q < p`}.`,
  ],
  official: { doc: 'bop', at: 'Solutions, Section 2.10, exercise 3' },
});

const bop7 = negChoice({
  id: 'bop-2-10-7', at: 'Section 2.10, exercise 7',
  title: t`Anything with a face`,
  prompt: t`Negate: "I don't eat anything that has a face."`,
  options: [t`I will eat some things that have a face.`, t`I will eat anything that has a face.`, t`I don't eat some things that have a face.`, t`I will eat some things that do not have a face.`],
  steps: [
    t`The sentence is "for every thing ${mx}, if ${mx} has a face, then I don't eat ${mx}". Its negation: there is a thing with a face that I eat.`,
    t`Book of Proof's solution adds that "I will eat anything that has a face" is wrong, "both morally and mathematically": it is far stronger than the negation.`,
    t`The negation of "every P is Q" is "some P is not Q": one counterexample, no more.`,
  ],
  verify: () => {
    // Every model with three things, each with or without a face and eaten or not.
    const models = upTo(64).map((k) => [0, 1, 2].map((j) => ({ face: ((k - 1) >> (2 * j)) % 2 === 1, eat: ((k - 1) >> (2 * j + 1)) % 2 === 1 })));
    return modelCheck(models, (m) => m.every((o) => !o.face || !o.eat), {
      right: (m) => m.some((o) => o.face && o.eat),
      'keep-inside': (m) => m.every((o) => !o.face || o.eat),
      'keep-quantifiers': (m) => m.some((o) => o.face && !o.eat),
      slip: (m) => m.some((o) => !o.face && o.eat),
    });
  },
  why: [t`That says I eat every thing with a face; denying the original needs only one.`, t`That does not deny the original: the original already says I eat none of them.`, t`Things without a face say nothing about the original.`],
  official: { doc: 'bop', at: 'Solutions, Section 2.10, exercise 7' },
  nudge: t`Not quite. Write the sentence with its hidden "for every thing, if it has a face" first, then negate.`,
  hints: [
    t`Which hidden quantifier and which "if ... then" does the sentence contain?`,
    t`What is the negation of "for every ${mx}, if ${math`P(x)`} then ${math`Q(x)`}"?`,
    t`Does denying the original need every thing with a face, or just one?`,
  ],
});

const bop11 = negChoice({
  id: 'bop-2-10-11', at: 'Section 2.10, exercise 11',
  title: t`Fooling people`,
  prompt: t`Negate: "You can fool all of the people all of the time."`,
  options: [t`There is a person that you can't fool all the time.`, t`You can't fool any of the people at any time.`, t`There is a person that you can fool all the time.`, t`You can fool all of the people some of the time.`],
  steps: [
    t`It is ${math`\forall x\ \forall y.\ \text{you can fool } x \text{ at time } y`}. Negating swaps both quantifiers: ${math`\exists x\ \exists y.\ \text{you cannot fool } x \text{ at time } y`}.`,
    t`In words: there is a person you can't fool all the time. (Lincoln said it better.)`,
    t`Negation swaps every quantifier: "for all, for all" becomes "there is, there is".`,
  ],
  verify: () => {
    // Every model with two people and two times.
    const models = upTo(16).map((k) => [[(k - 1) & 1, ((k - 1) >> 1) & 1], [((k - 1) >> 2) & 1, ((k - 1) >> 3) & 1]].map((r) => r.map((v) => v === 1)));
    return modelCheck(models, (m) => m.every((r) => r.every(Boolean)), {
      right: (m) => m.some((r) => r.some((v) => !v)),
      'keep-inside': (m) => m.every((r) => r.every((v) => !v)),
      'keep-quantifiers': (m) => m.some((r) => r.every(Boolean)),
      slip: (m) => m.every((r) => r.some(Boolean)),
    });
  },
  why: [t`That says every person is never fooled, much stronger than the negation.`, t`That is consistent with the original. The negation needs a person who escapes being fooled at some time.`, t`That is another true-or-false statement about the same people, but it can hold together with the original.`],
  official: { doc: 'bop', at: 'Solutions, Section 2.10, exercise 11' },
  nudge: t`Not quite. Two "for all" quantifiers are hidden here, one over people and one over times; both must change.`,
  hints: [
    t`Which two quantifiers are hidden in "all of the people all of the time"?`,
    t`What does negating "for all ${mx}, for all ${my}" give?`,
    t`Does the negation need a person who is never fooled, or only one who escapes at some time?`,
  ],
});

const S1 = 6;
const tmuaN1 = negChoice({
  id: 'tmua-n1', at: 'Negating "for all" and "there exists", page 61, S1 and N1', doc: 'tmua-logic-proof',
  title: t`Not every square is more than ${S1}`,
  prompt: t`${mS1} is "for all real ${mx}, ${math`x^{${2}} > ${S1}`}". Which is the simplest form of its negation, ${mN1}?`,
  options: [
    t`There exists a real ${mx} such that ${math`x^{${2}} \le ${S1}`}.`,
    t`There exists a real ${mx} such that ${math`x^{${2}} > ${S1}`}.`,
    t`For all real ${mx}, ${math`x^{${2}} \le ${S1}`}.`,
    t`There exists a real ${mx} such that ${math`x^{${2}} < ${S1}`}.`,
  ],
  steps: [
    t`${mN1} says it is not the case that ${math`x^{${2}} > ${S1}`} for all real ${mx}: so there is some ${mx} for which ${math`x^{${2}} > ${S1}`} is not the case, that is, ${math`x^{${2}} \le ${S1}`}.`,
    t`${mS1} is false (try ${math`x = ${2}`}), so ${mN1} is true.`,
    t`The negation of ${math`>`} is ${math`\le`}, not ${math`<`}.`,
  ],
  verify: () => {
    // On grids of reals, as finite models, including x^2 = 6 exactly (x = √6 is irrational, so use sets with and without that value).
    const grid = (lo: number, hi: number, step: number): number[] => upTo(Math.round((hi - lo) / step) + 1).map((k) => lo + (k - 1) * step);
    const models = [grid(-5, 5, 0.25), grid(3, 5, 0.5), [Math.sqrt(S1), 3], [Math.sqrt(S1)], [-4, 4], [0]];
    const sq = (x: number): number => Math.round(x * x * 1e9) / 1e9;
    return modelCheck(models, (m) => m.every((x) => sq(x) > S1), {
      right: (m) => m.some((x) => sq(x) <= S1),
      'keep-inside': (m) => m.some((x) => sq(x) > S1),
      'keep-quantifiers': (m) => m.every((x) => sq(x) <= S1),
      slip: (m) => m.some((x) => sq(x) < S1),
    });
  },
  why: [t`"There exists" is right, but the inequality must be negated too.`, t`"Not for all" is "there exists ... not", not "for all ... not".`, t`The negation of ${math`x^{${2}} > ${S1}`} is ${math`x^{${2}} \le ${S1}`}: it includes equality.`],
  official: { doc: 'tmua-logic-proof', at: 'page 62, N1newest' },
  nudge: t`Not quite. Both the quantifier and the inequality must change, and the opposite of ${math`>`} includes equality.`,
  hints: [
    t`What does "not for all ${mx}" become?`,
    t`What is the negation of ${math`x^{${2}} > ${S1}`}?`,
    t`Is equality included in that negation?`,
  ],
});

const sw115neg = negChoice({
  id: 'sw-1-1-5-negation', at: 'Exercises 1, 1.1.5', doc: 'cst-dm-sw1',
  title: t`The negation of a supervision exercise`,
  prompt: t`The supervision exercise says: for all integers ${mx} and ${my} there is an integer ${math`z`} such that ${math`x + z = y - z`}. Which statement is its negation?`,
  options: [
    [math`\exists x \in \mathbb{Z}\ \exists y \in \mathbb{Z}\ \forall z \in \mathbb{Z}.\ x + z \ne y - z`],
    [math`\exists x \in \mathbb{Z}\ \exists y \in \mathbb{Z}\ \forall z \in \mathbb{Z}.\ x + z = y - z`],
    [math`\forall x \in \mathbb{Z}\ \forall y \in \mathbb{Z}\ \exists z \in \mathbb{Z}.\ x + z \ne y - z`],
    [math`\exists x \in \mathbb{Z}\ \exists y \in \mathbb{Z}\ \exists z \in \mathbb{Z}.\ x + z \ne y - z`],
  ],
  steps: [
    t`Push the "not" through the three quantifiers: ${math`\forall x\ \forall y\ \exists z`} becomes ${math`\exists x\ \exists y\ \forall z`}, and the equation becomes ${math`x + z \ne y - z`}.`,
    t`In words: there are integers ${mx} and ${my} for which there is no integer ${math`z`} with ${math`x + z = y - z`}. The official solution proves exactly this, with ${math`x = ${0}`} and ${math`y = ${1}`}.`,
    t`Push the negation through one quantifier at a time, then negate what is left.`,
  ],
  verify: () => {
    // Models: x and y from small ranges, z over a range wide enough to contain every solution.
    const zs = upTo(81).map((k) => k - 41);
    const models = [[0, 1], [-3, -2, -1, 0, 1, 2, 3], [0, 2, 4], [1, 3], [5], [-4, 6]];
    return modelCheck(models, (m) => m.every((x) => m.every((y) => zs.some((z) => x + z === y - z))), {
      right: (m) => m.some((x) => m.some((y) => zs.every((z) => x + z !== y - z))),
      'keep-inside': (m) => m.some((x) => m.some((y) => zs.every((z) => x + z === y - z))),
      'keep-quantifiers': (m) => m.every((x) => m.every((y) => zs.some((z) => x + z !== y - z))),
      slip: (m) => m.some((x) => m.some((y) => zs.some((z) => x + z !== y - z))),
    });
  },
  why: [t`The quantifiers are swapped, but the equation is not negated.`, t`"For all ${mx} and ${my}" must become "there are ${mx} and ${my}", and "there is ${math`z`}" must become "for every ${math`z`}".`, t`"There is an integer ${math`z`}" must become "for every integer ${math`z`}" too: every quantifier swaps.`],
  official: { doc: 'cst-dm-sols-2324-1', at: '1.1.5' },
  nudge: t`Not quite. Every quantifier swaps, and the equation itself is negated.`,
  hints: [
    t`How many quantifiers does the statement have, and in what order?`,
    t`What does each quantifier become when the negation is pushed past it?`,
    t`What happens to the equation ${math`x + z = y - z`} at the end?`,
  ],
});

const sw115 = auto({
  id: 'sw-1-1-5-witness',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.1.5'),
  title: t`No integer between them`,
  prompt: t`Prove or disprove: for all integers ${mx} and ${my} there is an integer ${math`z`} such that ${math`x + z = y - z`}. It is false: give integers ${mx} and ${my} for which no integer ${math`z`} works.`,
  answer: {
    kind: 'witness', count: 2, names: ['x', 'y'], example: '0, 1',
    check: ([x, y]) => {
      if (x === undefined || y === undefined || x.den !== 1n || y.den !== 1n) return 'Give two integers x and y.';
      // x + z = y - z exactly when 2z = y - x: an integer z exists exactly when y - x is even.
      return (y.num - x.num) % 2n === 0n ? `With x = ${x.num} and y = ${y.num}, z = ${(y.num - x.num) / 2n} works: x + z = y - z.` : null;
    },
  },
  solution: [
    t`The negation is ${math`\exists x\ \exists y\ \forall z.\ x + z \ne y - z`}: find ${mx} and ${my} that no ${math`z`} fits.`,
    t`${math`x + z = y - z`} means ${math`${2}z = y - x`}, which has an integer solution exactly when ${math`y - x`} is even. So take ${math`y - x`} odd: ${math`x = ${0}`}, ${math`y = ${1}`}, where ${math`z = \frac{${1}}{${2}}`} is not an integer.`,
    t`Rearrange to see exactly when a solution exists; any case outside that is a counterexample.`,
  ],
  reference: 'x = 0, y = 1',
  verify: () => {
    // For x, y from -6 to 6: an integer z exists exactly when y - x is even.
    const r = upTo(13).map((k) => k - 7);
    for (const x of r) for (const y of r) {
      const exists = upTo(41).some((k) => x + (k - 21) === y - (k - 21));
      if (exists !== ((y - x) % 2 === 0)) return `at x = ${x}, y = ${y}`;
    }
    return null;
  },
  misconceptions: [{ response: 'x = 0, y = 2', why: t`With ${math`y - x`} even there is an integer ${math`z`}: here ${math`z = ${1}`}. Choose ${mx} and ${my} so that ${math`y - x`} is odd.` }],
  official: { source: cite('cst-dm-sols-2324-1', '1.1.5'), answer: 'x = 0, y = 1', agrees: true },
  nudge: t`Not quite. Rearranging ${math`x + z = y - z`} shows exactly which pairs ${mx}, ${my} allow an integer ${math`z`}.`,
  hints: [
    t`What does ${math`x + z = y - z`} become when solved for ${math`${2}z`}?`,
    t`For which ${mx} and ${my} is there an integer ${math`z`} with ${math`${2}z = y - x`}?`,
    t`Which pair of small integers makes ${math`y - x`} fail that condition?`,
  ],
});

const sw115proof = supervision({
  id: 'sw-1-1-5',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.1.5'),
  title: t`No integer ${math`z`}`,
  prompt: t`Prove that it is not the case that for all integers ${mx} and ${my} there is an integer ${math`z`} with ${math`x + z = y - z`}. Write the negation first, then prove it. Explain why "let ${math`x = ${0}`}, ${math`y = ${1}`}; then ${math`z = \frac{${1}}{${2}}`}, which is not an integer" is not yet a proof.`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-1', '1.1.5'),
  hints: [
    t`What is the negation, with all three quantifiers moved past the "not"?`,
    t`What does ${math`x + z = y - z`} say about the parity of ${math`y - x`}?`,
    t`Why does finding ${math`z = \frac{${1}}{${2}}`} not yet show that no integer ${math`z`} works, and which argument covers every integer ${math`z`} at once?`,
  ],
});
const bop5 = supervision({
  id: 'bop-2-10-5',
  source: cite('bop', 'Section 2.10, exercise 5'),
  title: t`A limit, negated`,
  prompt: t`Negate: "For every positive number ${math`\varepsilon`} there is a positive number ${math`M`} for which ${math`|f(x) - b| < \varepsilon`} whenever ${math`x > M`}." First write it in symbols, then push the negation through each quantifier and the "whenever", and finally write the negation in words.`,
  writeUp: 'explanation',
  official: cite('bop', 'Solutions, Section 2.10, exercise 5'),
  hints: [
    t`In symbols, which quantifiers appear, and how is "whenever ${math`x > M`}" a hidden "for every ${mx}, if ${math`x > M`} then"?`,
    t`What does each quantifier become under negation, and what is the negation of "if P then Q"?`,
    t`What is the negation of ${math`|f(x) - b| < \varepsilon`}?`,
  ],
});
const bop12 = supervision({
  id: 'bop-2-10-12',
  source: cite('bop', 'Section 2.10, exercise 12'),
  title: t`Two evils`,
  prompt: t`Negate: "Whenever I have to choose between two evils, I choose the one I haven't tried yet." (Mae West.) Say what the hidden quantifier is, and explain each step of the negation.`,
  writeUp: 'explanation',
  hints: [
    t`Over what does "whenever" range, and which quantifier is it?`,
    t`What is the negation of "for every choice between two evils, the untried one is chosen"?`,
    t`What is the negation of "I choose the one I haven't tried yet"?`,
  ],
});

// ---------------------------------------------------------------- Cambridge problems: gates (batch 7)

/*
 * Outline for marking ns1-q5 (20 marks):
 * (i) 12 marks. Each quantifier swapped in order, order kept: exists m, for all n, exists a, exists b
 *     (6). The inside negated by De Morgan: (n < m) or [(a != 1) and (b != 1) and (ab = n)] (6).
 *     Optional remark: (i) says there are arbitrarily large n with no factorisation ab = n with
 *     a, b != 1, so the negation says every n beyond some m factorises.
 * (ii) 8 marks. The negation of "if P then Q" is "P and not Q" (4): "Bumrah is not a faster bowler
 *     than Tait, and Australia is not worse than England in cricket" (4). A converse or "if P then
 *     not Q" scores 0 for this part.
 */
const ns1q5 = supervision({
  id: 'ns1-q5',
  source: cite('ia-ns-sheet-1', 'Q5'),
  title: t`Two negations from the first IA sheet`,
  prompt: t`Write down the negation of the following assertions (where ${math`m, n, a, b \in \mathbb{N}`}): (i) ${math`\forall m\, \exists n\, \forall a\, \forall b\ (n \ge m) \land [(a = ${1}) \lor (b = ${1}) \lor (ab \ne n)]`}; (ii) if Bumrah is not a faster bowler than Tait, then Australia is worse than England in cricket.`,
  writeUp: 'explanation',
  hints: [
    t`In (i), what does each of the quantifiers ${math`\forall m\, \exists n\, \forall a\, \forall b`} become under negation?`,
    t`What is the negation of a conjunction, and of a disjunction of three statements?`,
    t`In (ii), what is the negation of "if P then Q"?`,
  ],
});

// Rule 1 (2026-10-08): set here from logic.equivalences, the earliest topic that teaches everything it needs.
const lemma43 = supervision({
  id: 'cst-lemma-43-equivalences',
  source: cite('cst-dm-notes', 'printed page 151, the footnote to the proof of Lemma 43'),
  title: t`Which equivalences?`,
  prompt: t`In the proof of Lemma ${43} (a positive rational is a fraction in lowest terms), the CST notes negate ${math`\exists m, n.\ x = m/n \land \lnot \exists p.\ (p \mid m \land p \mid n)`} to get ${math`\forall m, n.\ x = m/n \Rightarrow \exists p.\ (p \mid m \land p \mid n)`}, and say this uses three of the equivalences on printed page ${134} together with ${math`(P \Rightarrow Q) \Leftrightarrow (\lnot P \lor Q)`}. Which three? Show the negation step by step, naming the equivalence used at each step.`,
  writeUp: 'explanation',
  hints: [
    t`How does a negation pass through ${math`\exists`}, and through ${math`\forall`}?`,
    t`What is the negation of an "and" of two statements?`,
    t`Which "or" becomes an implication by ${math`(P \Rightarrow Q) \Leftrightarrow (\lnot P \lor Q)`}?`,
  ],
});

// ---------------------------------------------------------------- lesson

const mP = math`P(x)`;

export const negatingQuantifiers: TopicContent = {
  topicId: 'logic.negating-quantifiers',
  goal: t`Negate a statement with quantifiers by swapping each "for all" and "there exists" and negating what is inside, and write the negation in plain words.`,
  objective: t`Negate a statement with quantifiers: swap each "for all" and "there exists", then negate the inside.`,
  why: t`To disprove a claim you prove its negation, so you must write the negation exactly right.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`One black swan` },
    { kind: 'hook', text: t`"Every swan is white." What would it take to show that this is false? Not that every swan is black, and not that no swan is white. One black swan is enough. The opposite of "every" is not "none"; it is "at least one is not".` },
    { kind: 'narrative', text: t`The TMUA notes make the same point with ${mS1}: "for all real ${mx}, ${math`x^{${2}} > ${S1}`}". Its negation ${mN1} is "it is not the case that for all real ${mx}, ${math`x^{${2}} > ${S1}`}", which says some real ${mx} has ${math`x^{${2}} \le ${S1}`}. And ${math`x = ${2}`} is one: ${math`${2}^{${2}} = ${4} \le ${S1}`}. So ${mS1} is false and ${mN1} is true.` },
    { kind: 'narrative', text: t`Notation: ${math`\forall x`} means "for all ${mx}", ${math`\exists x`} means "there exists an ${mx}", and ${math`\lnot`} means "not". ${mP} is a statement about ${mx}, true for some values and false for others, such as ${math`x^{${2}} > ${S1}`}.` },

    { kind: 'section', title: t`The two laws` },
    { kind: 'theorem', name: t`Negating a quantifier`, statement: t`For any statement ${mP} about the elements ${mx} of a set, ${dmath`\lnot\, \forall x.\ P(x) \iff \exists x.\ \lnot P(x), \qquad \lnot\, \exists x.\ P(x) \iff \forall x.\ \lnot P(x).`}` },
    { kind: 'p', text: t`In plain words: "not all" means "at least one fails", and "there is none" means "every one fails". This is the [[negation-of-quantifier|negation of a quantifier]]: the "not" moves inside and the quantifier swaps.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Unpack the left side`, text: t`${math`\lnot\, \forall x.\ P(x)`} is true exactly when ${math`\forall x.\ P(x)`} is false.` },
        { label: t`What "false for all" means`, text: t`${math`\forall x.\ P(x)`} is false exactly when it is not the case that every ${mx} makes ${mP} true, that is, when at least one ${mx} makes ${mP} false.` },
        { label: t`That is an existence statement`, text: t`"At least one ${mx} makes ${mP} false" is ${math`\exists x.\ \lnot P(x)`}. This proves the first law.` },
        { label: t`The second law from the first`, text: t`Apply the first law to the statement ${math`\lnot P(x)`}: ${math`\lnot\, \forall x.\ \lnot P(x) \iff \exists x.\ \lnot\lnot P(x) \iff \exists x.\ P(x)`}. Negate both sides.`, plain: t`Two "not"s cancel, and negating both sides of an equivalence keeps it an equivalence.` },
      ],
    },
    { kind: 'p', text: t`A statement and its negation always have opposite truth values. So to disprove ${math`\forall x.\ P(x)`}, prove ${math`\exists x.\ \lnot P(x)`}: exhibit one ${mx} where ${mP} fails, a counterexample.` },

    { kind: 'section', title: t`Several quantifiers` },
    { kind: 'narrative', text: t`With several quantifiers, move the "not" inwards one quantifier at a time. Each quantifier it passes swaps; their order stays the same. Book of Proof's Example ${2.13}: every real number has a cube root.` },
    {
      kind: 'steps',
      steps: [
        { label: t`The statement`, text: t`${math`\forall x \in \mathbb{R}\ \exists y \in \mathbb{R}.\ y^{${3}} = x`}.` },
        { label: t`Negate it`, text: t`${math`\lnot\, \forall x \in \mathbb{R}\ \exists y \in \mathbb{R}.\ y^{${3}} = x`}.` },
        { label: t`Pass the first quantifier`, text: t`${math`\exists x \in \mathbb{R}\ \lnot\, \exists y \in \mathbb{R}.\ y^{${3}} = x`}.`, plain: t`"Not for all ${mx}" becomes "there is an ${mx} for which not".` },
        { label: t`Pass the second`, text: t`${math`\exists x \in \mathbb{R}\ \forall y \in \mathbb{R}.\ \lnot(y^{${3}} = x)`}, that is ${math`\exists x \in \mathbb{R}\ \forall y \in \mathbb{R}.\ y^{${3}} \ne x`}.`, plain: t`In words: some real number has no cube root. (The original is true, so this negation is false.)` },
      ],
    },
    checkFrom(negateSymbols, { i: 0, order: 2 }, t`Both quantifiers swap, in the same order, and ${math`\lnot (y > x)`} is ${math`y \le x`}.`),

    { kind: 'section', title: t`Negating the inside` },
    { kind: 'p', text: t`Once the quantifiers are done, negate what is left with the rules you already know.` },
    {
      kind: 'table',
      caption: t`Negations of common insides.`,
      head: [t`statement`, t`negation`],
      rows: [
        [t`${math`a > b`}`, t`${math`a \le b`} (the equal case moves across)`],
        [t`${math`a = b`}`, t`${math`a \ne b`}`],
        [t`${math`P \land Q`}`, t`${math`\lnot P \lor \lnot Q`}`],
        [t`${math`P \lor Q`}`, t`${math`\lnot P \land \lnot Q`}`],
        [t`${math`P \Rightarrow Q`}`, t`${math`P \land \lnot Q`}`],
      ],
    },
    { kind: 'p', text: t`So "if ${mx} is odd then ${math`x^{${2}}`} is odd", read as ${math`\forall x \in \mathbb{Z}.\ x \text{ odd} \Rightarrow x^{${2}} \text{ odd}`}, has negation ${math`\exists x \in \mathbb{Z}.\ x \text{ odd} \land x^{${2}} \text{ even}`}: there is an odd integer whose square is even (Book of Proof's Example ${2.15}).`, why: { q: t`Why is the negation of ${math`P \Rightarrow Q`} not another implication?`, a: t`${math`P \Rightarrow Q`} is false in exactly one case: ${math`P`} true and ${math`Q`} false. So its negation is "${math`P`} and not ${math`Q`}".` } },
    { kind: 'p', text: t`In words, hidden quantifiers need care. "I don't eat anything that has a face" says: for every thing with a face, I do not eat it. Its negation: there is something with a face that I eat.` },
    checkFrom(negateWords, { i: 3, order: 1 }, t`"Every multiple of four is even" negates to "some multiple of four is not even", that is, odd.`),

    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`The negation of "every A is B" is "no A is B".`, counterexample: t`"Every prime is odd" is false, because of ${2}. But "no prime is odd" is false too (${3} is prime and odd). A statement and its negation cannot both be false, so "no A is B" is not the negation: it is "some A is not B".` },
    { kind: 'pitfall', claim: t`The negation of ${math`x > ${S1}`} is ${math`x < ${S1}`}.`, counterexample: t`At ${math`x = ${S1}`}, both ${math`x > ${S1}`} and ${math`x < ${S1}`} are false. The negation is ${math`x \le ${S1}`}.` },
    { kind: 'pitfall', claim: t`When negating, you may also swap the order of the quantifiers.`, counterexample: t`${math`\forall x \in \mathbb{Z}\ \exists y \in \mathbb{Z}.\ y > x`} is true. Its negation is ${math`\exists x\ \forall y.\ y \le x`} (false, as it must be). Swapping the order instead gives ${math`\forall y\ \exists x.\ y \le x`}, which is true: not a negation.` },
    { kind: 'takeaway', text: t`To negate, move the "not" inwards: each "for all" becomes "there exists" and vice versa, the order stays, and the inside is negated at the end.` },
  ],
  examples: [
    { ...workedCambridge(bop3), examiner: t`The examiner looks for both quantifiers swapped in order, and ${math`q > p`} negated to ${math`q \le p`}, not ${math`q < p`}.` },
    worked(negateSymbols, { i: 2, order: 1 }, t`A cube root for every real number`),
    worked(whichTrue, { m: 4, r: 2, ae: false }, t`A statement or its negation`),
  ],
  generators: [negateSymbols, whichTrue, negateWords],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['negation-of-quantifier'],
  cambridge: withUses([bop7, bop11, tmuaN1, sw115neg, sw115, sw115proof, bop5, bop12, ns1q5, lemma43], {
    'cst-lemma-43-equivalences': { sections: ['The two laws', 'Negating the inside'], note: t`Negating a quantified statement step by step` },
    'ns1-q5': { sections: ['The two laws', 'Several quantifiers', 'Negating the inside'], note: t`Negating a statement with four quantifiers and an implication` },
  }),
  // The IA sheet's two negations (four quantifiers, and an implication in words). The Logic and Proof
  // equivalences are a written proof, so they are set in proof.direct, the first topic that teaches writing one
  // (Rule 1, 2026-10-08). The CST proof 1.1.5 does not gate: the practice problems on the
  // same exercise give its negation and its witness. The Book of Proof items are not Cambridge
  // standard. The CST notes' Lemma 43 negation, set here from logic.equivalences by Rule 1 (2026-10-08), gates:
  // it names each law used.
  gate: ['ns1-q5', 'cst-lemma-43-equivalences'],
  recall: [
    { front: t`Negate ${math`\forall x.\ P(x)`}.`, back: t`${math`\exists x.\ \lnot P(x)`}: at least one ${mx} fails.` },
    { front: t`Negate ${math`\exists x.\ P(x)`}.`, back: t`${math`\forall x.\ \lnot P(x)`}: every ${mx} fails.` },
    { front: t`Negate ${math`P \Rightarrow Q`}.`, back: t`${math`P \land \lnot Q`}.` },
    { front: t`Negate "every A is B" in words.`, back: t`"Some A is not B."` },
  ],
  proofOrder: [{
    title: t`Not for all is there exists not`,
    steps: [
      t`${math`\lnot\, \forall x.\ P(x)`} holds exactly when ${math`\forall x.\ P(x)`} is false.`,
      t`That means not every ${mx} makes ${mP} true.`,
      t`So at least one ${mx} makes ${mP} false.`,
      t`That is ${math`\exists x.\ \lnot P(x)`}.`,
    ],
  }],
};
