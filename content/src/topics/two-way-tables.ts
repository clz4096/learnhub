/**
 * pre.two-way-tables: Conditional probability from tables and Venn diagrams: "given that"
 * restricts the table or diagram to the part where the condition holds. From STEP Support
 * Assignment 6, Q4(i): the population of 100 people the question suggests, and its
 * diagram "similar to a Venn diagram", a square cut into regions A, B, C, D whose areas
 * are probabilities.
 */
import type { Rng } from '@learnhub/mastery';
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { add, int, mul, pick, q, str, sub, type Rational } from '../math';
import { generator, type Misconception } from '../problem';
import { dmath, math, t, type Rich } from '../rich';
import { checkFrom, worked, workedCambridge, type ProbabilityClaim, type TopicContent } from '../topic';

/** A uniform draw from a population of `total`, sampled until it lands in the condition; true when it is also in the event. */
function restrictedTrial(rng: Rng, total: number, inCondition: (i: number) => boolean, inEvent: (i: number) => boolean): boolean {
  for (;;) {
    const i = Math.floor(rng() * total);
    if (inCondition(i)) return inEvent(i);
  }
}

// ---------------------------------------------------------------- generators

/** A two-way table of counts: rows are the groups, columns the answers. */
interface TableP { g: number; cells: readonly [number, number, number, number]; r: 0 | 1; c: 0 | 1 }

const GROUPS: readonly { rows: readonly [string, string]; cols: readonly [string, string]; what: string }[] = [
  { rows: ['juniors', 'seniors'], cols: ['walks to school', 'does not walk'], what: 'students' },
  { rows: ['adults', 'children'], cols: ['chose the film', 'chose the play'], what: 'people in a survey' },
  { rows: ['bus A', 'bus B'], cols: ['was late', 'was on time'], what: 'bus journeys' },
  { rows: ['left-handed', 'right-handed'], cols: ['plays an instrument', 'does not play one'], what: 'members of a club' },
];
const groupOf = (p: TableP): (typeof GROUPS)[number] => GROUPS[p.g] as (typeof GROUPS)[number];

const rowTotal = (p: TableP, r: number): number => (p.cells[2 * r] as number) + (p.cells[2 * r + 1] as number);
const colTotal = (p: TableP, c: number): number => (p.cells[c] as number) + (p.cells[2 + c] as number);
const cell = (p: TableP, r: number, c: number): number => p.cells[2 * r + c] as number;

const tableGiven = generator<TableP>({
  id: 'table-given-column',
  skill: 'Given that a person gave one answer, restrict the table to that column: the cell over the column total.',
  params: (rng) => {
    for (;;) {
      const cells = [int(rng, 3, 30), int(rng, 3, 30), int(rng, 3, 30), int(rng, 3, 30)] as const;
      const p: TableP = { g: int(rng, 0, GROUPS.length - 1), cells, r: int(rng, 0, 1) as 0 | 1, c: int(rng, 0, 1) as 0 | 1 };
      // The three slips must give three different wrong answers.
      const a = cell(p, p.r, p.c);
      if (rowTotal(p, p.r) !== colTotal(p, p.c) && 2 * a !== colTotal(p, p.c)) return p;
    }
  },
  sane: (p) => (p.g >= 0 && p.g < GROUPS.length && p.cells.every((x) => x >= 3 && x <= 30) && rowTotal(p, p.r) !== colTotal(p, p.c) ? null : 'out of range'),
  problem: (p) => {
    const g = groupOf(p);
    const total = rowTotal(p, 0) + rowTotal(p, 1);
    const a = cell(p, p.r, p.c);
    const col = colTotal(p, p.c);
    return {
      prompt: [
        ...t`The [[two-way-table|two-way table]] counts ${total} ${g.what}. One is picked at random. Given that the one picked ${g.cols[p.c]}, what is the probability that it is in the group "${g.rows[p.r]}"?`,
        ...t` (${g.rows[0]}: ${cell(p, 0, 0)} ${g.cols[0]}, ${cell(p, 0, 1)} ${g.cols[1]}; ${g.rows[1]}: ${cell(p, 1, 0)} ${g.cols[0]}, ${cell(p, 1, 1)} ${g.cols[1]}.)`,
      ],
      answer: { kind: 'exact', expected: str(q(a, col)) },
      solution: [
        t`"Given that" the one picked ${g.cols[p.c]}: keep only that column. It holds ${math`${cell(p, 0, p.c)} + ${cell(p, 1, p.c)} = ${col}`}.`,
        t`Of those ${col}, ${a} are "${g.rows[p.r]}", so the probability is ${math`\frac{${a}}{${col}} = ${q(a, col)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // Count every member of the population directly.
    let inCol = 0;
    let both = 0;
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) for (let k = 0; k < cell(p, r, c); k++) {
      if (c === p.c) { inCol++; if (r === p.r) both++; }
    }
    return str(q(both, inCol));
  },
  misconceptions: (p): Misconception[] => {
    const a = cell(p, p.r, p.c);
    const total = rowTotal(p, 0) + rowTotal(p, 1);
    const g = groupOf(p);
    return [
      { response: str(q(a, total)), why: t`That is out of everyone, ${total}. "Given that" restricts to the column of those who ${g.cols[p.c]}: divide by its total.` },
      { response: str(q(a, rowTotal(p, p.r))), why: t`That divides by the row total, which reverses the condition: it is the probability of "${g.cols[p.c]}" given "${g.rows[p.r]}".` },
      { response: str(q(colTotal(p, p.c), total)), why: t`That is the probability of the condition itself. Restrict to that column, then count the group inside it.` },
    ];
  },
  trial: (p, rng) => {
    const total = rowTotal(p, 0) + rowTotal(p, 1);
    // Index the population row by row, cell by cell.
    const where = (i: number): [number, number] => {
      let k = i;
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) { if (k < cell(p, r, c)) return [r, c]; k -= cell(p, r, c); }
      return [1, 1];
    };
    return restrictedTrial(rng, total, (i) => where(i)[1] === p.c, (i) => where(i)[0] === p.r);
  },
});

/** A Venn diagram of counts: only A, both, only B, neither. */
interface VennP { a: number; ab: number; b: number; n: number; ask: 'a-given-b' | 'b-given-a' | 'a-given-not-b' }
const SUBJECTS = ['French', 'art'] as const;

const vennGiven = generator<VennP>({
  id: 'venn-given',
  skill: 'Read a conditional probability from a Venn diagram of counts: restrict to the circle (or the outside) you are given.',
  params: (rng) => {
    for (;;) {
      const p: VennP = { a: int(rng, 2, 20), ab: int(rng, 1, 12), b: int(rng, 2, 20), n: int(rng, 1, 15), ask: pick(rng, ['a-given-b', 'b-given-a', 'a-given-not-b'] as const) };
      // Keep the reversed condition a different answer.
      if (p.a !== p.b && p.a + p.ab !== p.n + p.a) return p;
    }
  },
  sane: ({ a, ab, b, n }) => (a >= 2 && ab >= 1 && b >= 2 && n >= 1 && a !== b ? null : 'out of range'),
  problem: (p) => {
    const [X, Y] = SUBJECTS;
    const total = p.a + p.ab + p.b + p.n;
    const { num, den, cond, ev } = vennAnswer(p);
    return {
      prompt: t`In a class of ${total} students, ${p.a} study ${X} only, ${p.b} study ${Y} only, ${p.ab} study both, and ${p.n} study neither. A student is picked at random. Given that the student ${cond}, what is the probability that they ${ev}?`,
      answer: { kind: 'exact', expected: str(q(num, den)) },
      solution: [
        t`Draw the [[venn-diagram|Venn diagram]]: ${p.a} in ${X} only, ${p.ab} in the overlap, ${p.b} in ${Y} only, ${p.n} outside both circles.`,
        t`Given that the student ${cond}: keep only that part of the diagram, ${den} students.`,
        t`Of those, ${num} ${ev}, so the probability is ${math`\frac{${num}}{${den}} = ${q(num, den)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // List the students as (in French, in art) and count.
    const students: [boolean, boolean][] = [
      ...Array.from({ length: p.a }, (): [boolean, boolean] => [true, false]),
      ...Array.from({ length: p.ab }, (): [boolean, boolean] => [true, true]),
      ...Array.from({ length: p.b }, (): [boolean, boolean] => [false, true]),
      ...Array.from({ length: p.n }, (): [boolean, boolean] => [false, false]),
    ];
    const cond = (s: [boolean, boolean]): boolean => (p.ask === 'a-given-b' ? s[1] : p.ask === 'b-given-a' ? s[0] : !s[1]);
    const ev = (s: [boolean, boolean]): boolean => (p.ask === 'b-given-a' ? s[1] : s[0]);
    const kept = students.filter(cond);
    return str(q(kept.filter(ev).length, kept.length));
  },
  misconceptions: (p): Misconception[] => {
    const total = p.a + p.ab + p.b + p.n;
    const { num, den } = vennAnswer(p);
    const out: Misconception[] = [
      { response: str(q(num, total)), why: t`That divides by the whole class. "Given that" means only the students in the condition count: divide by how many of them there are.` },
    ];
    if (p.ask === 'a-given-b') out.push({ response: str(q(p.ab, p.a + p.ab)), why: t`That restricts to the ${SUBJECTS[0]} circle, which is the reverse condition. Restrict to the ${SUBJECTS[1]} circle.` });
    if (p.ask === 'b-given-a') out.push({ response: str(q(p.ab, p.b + p.ab)), why: t`That restricts to the ${SUBJECTS[1]} circle, which is the reverse condition. Restrict to the ${SUBJECTS[0]} circle.` });
    if (p.ask === 'a-given-not-b') out.push({ response: str(q(p.a, p.a + p.ab)), why: t`That restricts to the ${SUBJECTS[0]} circle. The condition is "not ${SUBJECTS[1]}": everyone outside the ${SUBJECTS[1]} circle, ${p.a + p.n} students.` });
    out.push({ response: str(q(num, den - num)), why: t`That compares the two parts of the condition with each other. A probability is the part over the whole of the condition.` });
    return out;
  },
  trial: (p, rng) => {
    const total = p.a + p.ab + p.b + p.n;
    const kind = (i: number): [boolean, boolean] => (i < p.a ? [true, false] : i < p.a + p.ab ? [true, true] : i < p.a + p.ab + p.b ? [false, true] : [false, false]);
    const cond = (i: number): boolean => (p.ask === 'a-given-b' ? kind(i)[1] : p.ask === 'b-given-a' ? kind(i)[0] : !kind(i)[1]);
    const ev = (i: number): boolean => (p.ask === 'b-given-a' ? kind(i)[1] : kind(i)[0]);
    return restrictedTrial(rng, total, cond, ev);
  },
});

function vennAnswer(p: VennP): { num: number; den: number; cond: Rich; ev: Rich } {
  const [X, Y] = SUBJECTS;
  if (p.ask === 'a-given-b') return { num: p.ab, den: p.ab + p.b, cond: t`studies ${Y}`, ev: t`study ${X}` };
  if (p.ask === 'b-given-a') return { num: p.ab, den: p.ab + p.a, cond: t`studies ${X}`, ev: t`study ${Y}` };
  return { num: p.a, den: p.a + p.n, cond: t`does not study ${Y}`, ev: t`study ${X}` };
}

/** Percentages turned into a table of a population, then a conditional probability read from it. */
interface PctP { n: number; pa: number; pbA: number; pbNotA: number; given: 'b' | 'not-b' }

const pctTable = generator<PctP>({
  id: 'percent-table',
  skill: 'Turn percentages into a table of counts for a round population, as STEP Support Assignment 6 Q4 suggests, then restrict it to a column.',
  params: (rng) => {
    for (;;) {
      const p: PctP = { n: pick(rng, [100, 200, 500, 1000]), pa: pick(rng, [20, 30, 40, 60, 70]), pbA: pick(rng, [10, 20, 30, 40, 50, 60]), pbNotA: pick(rng, [10, 20, 30, 40, 50, 60]), given: pick(rng, ['b', 'not-b'] as const) };
      if (p.pbA !== p.pbNotA) return p;
    }
  },
  sane: ({ pa, pbA, pbNotA }) => (pa > 0 && pa < 100 && pbA !== pbNotA ? null : 'out of range'),
  problem: (p) => {
    const c = pctCounts(p);
    const den = p.given === 'b' ? c.ab + c.nb : c.anb + c.nnb;
    const num = p.given === 'b' ? c.ab : c.anb;
    const cond = p.given === 'b' ? t`owns a dog` : t`does not own a dog`;
    return {
      prompt: t`In a town, ${p.pa}% of people live in a flat and the rest in a house. Of the people in flats, ${p.pbA}% own a dog; of the people in houses, ${p.pbNotA}%. A person is picked at random. Given that the person ${cond}, what is the probability that they live in a flat? Model the town by ${p.n} people.`,
      answer: { kind: 'exact', expected: str(q(num, den)) },
      solution: [
        t`Of ${p.n} people, ${c.a} live in flats and ${c.n} in houses. Flats: ${c.ab} own a dog, ${c.anb} do not. Houses: ${c.nb} own a dog, ${c.nnb} do not.`,
        t`Given that the person ${cond}: restrict to that column, ${math`${num} + ${den - num} = ${den}`} people.`,
        t`Of those, ${num} live in flats: ${math`\frac{${num}}{${den}} = ${q(num, den)}`}.`,
      ],
    };
  },
  solve: (p) => {
    // The same by multiplying the shares: P(flat and B) over P(B).
    const a = q(p.pa, 100);
    const bA = q(p.given === 'b' ? p.pbA : 100 - p.pbA, 100);
    const bN = q(p.given === 'b' ? p.pbNotA : 100 - p.pbNotA, 100);
    const both = mul(a, bA);
    const all = add(both, mul(sub(q(1), a), bN));
    return str(q(both.num * all.den, both.den * all.num));
  },
  misconceptions: (p): Misconception[] => {
    const c = pctCounts(p);
    const num = p.given === 'b' ? c.ab : c.anb;
    const share = p.given === 'b' ? p.pbA : 100 - p.pbA;
    return [
      { response: str(q(share, 100)), why: t`That is the share of flat dwellers who ${p.given === 'b' ? 'own' : 'do not own'} a dog: the reverse condition. Restrict to the people who ${p.given === 'b' ? 'own' : 'do not own'} a dog.` },
      { response: str(q(num, p.n)), why: t`That is out of all ${p.n} people. "Given that" restricts to one column of the table.` },
      { response: str(q(p.pa, 100)), why: t`That is the share living in flats before anything is known. The condition changes it.` },
    ];
  },
  trial: (p, rng) => {
    for (;;) {
      const flat = rng() < p.pa / 100;
      const dog = rng() < (flat ? p.pbA : p.pbNotA) / 100;
      if (dog === (p.given === 'b')) return flat;
    }
  },
});

function pctCounts({ n, pa, pbA, pbNotA }: PctP): { a: number; n: number; ab: number; anb: number; nb: number; nnb: number } {
  const a = (n * pa) / 100;
  const ab = (a * pbA) / 100;
  const nn = n - a;
  const nb = (nn * pbNotA) / 100;
  return { a, n: nn, ab, anb: a - ab, nb, nnb: nn - nb };
}

// ---------------------------------------------------------------- Cambridge problems

const MEN = q(40, 100);
const SMOKE_MEN = q(50, 100);
const SMOKE_WOMEN = q(30, 100);
const WOMEN = sub(q(1), MEN);
/** The areas of the assignment's diagram: A men non-smokers, B women non-smokers, C men smokers, D women smokers. */
const AREA = {
  A: mul(MEN, sub(q(1), SMOKE_MEN)),
  B: mul(WOMEN, sub(q(1), SMOKE_WOMEN)),
  C: mul(MEN, SMOKE_MEN),
  D: mul(WOMEN, SMOKE_WOMEN),
};
/** The assignment's population of 100: men, women, and the four cells. */
const POP = pctCounts({ n: 100, pa: 40, pbA: 50, pbNotA: 30, given: 'b' });
const smokingIntro = t`A study of a large population found that ${40}% were men and ${60}% were women. Of the men ${50}% were smokers, and of the women ${30}% were smokers. A person is picked at random: any person is as likely to be picked as any other.`;
const diagramText = t`The assignment's diagram is a square of area ${1}: a strip of width ${MEN} for the men and one of width ${WOMEN} for the women. The men's strip is cut into non-smokers (region A, height ${sub(q(1), SMOKE_MEN)}) and smokers (region C, height ${SMOKE_MEN}); the women's strip into non-smokers (region B, height ${sub(q(1), SMOKE_WOMEN)}) and smokers (region D, height ${SMOKE_WOMEN}).`;

const a6c = auto({
  id: 'a6-q4-i-c',
  source: cite('step-f06', 'Q4(i)(c)'),
  title: t`A smoker, given a woman`,
  prompt: t`${smokingIntro} Given that the person picked is a woman, what is the probability that she is a smoker? Use a population of ${100} people.`,
  answer: { kind: 'exact', expected: str(SMOKE_WOMEN) },
  solution: [
    t`Of ${100} people, ${POP.n} are women, and ${30}% of them smoke: ${POP.nb} women smokers.`,
    t`Given a woman, restrict to the ${POP.n} women: ${math`\frac{${POP.nb}}{${POP.n}} = ${q(POP.nb, POP.n)}`}.`,
    t`In the diagram it is region D's share of the women's strip: ${math`\frac{${AREA.D}}{${AREA.B} + ${AREA.D}} = ${SMOKE_WOMEN}`}. The question's ${30}% was already this conditional probability: it is a share of the women, not of everyone.`,
  ],
  reference: str(q(POP.nb, POP.n)),
  verify: () => same('D over the women', str(q(AREA.D.num * WOMEN.den, AREA.D.den * WOMEN.num)), str(SMOKE_WOMEN)),
  misconceptions: [{ response: str(AREA.D), why: t`That is a female smoker out of everyone, part (a). Given a woman, divide by the women only.` }],
  official: { source: cite('step-f06-hints', 'Q4(i)(c)'), answer: '3/10', agrees: true },
});

const regionAreas = [AREA.A, AREA.B, AREA.C, AREA.D];
const a6regions = auto({
  id: 'a6-q4-i-regions',
  source: cite('step-f06', 'Q4(i), the diagram similar to a Venn diagram', true),
  title: t`The four regions of the diagram`,
  prompt: t`${smokingIntro} ${diagramText} Find the area of each region: it is the probability that a person picked at random is in it.`,
  nudge: t`Not quite. Each region is a rectangle; its area is width times height.`,
  hints: [
    t`What are the width of the men's strip and the width of the women's strip?`,
    t`Within each strip, what are the heights of the smokers' and non-smokers' parts?`,
    t`Do the four areas add up to the whole square?`,
  ],
  answer: {
    kind: 'table', cell: 'exact', columns: [t`region`, t`area`],
    rows: [[t`A, men who do not smoke`, null], [t`B, women who do not smoke`, null], [t`C, men who smoke`, null], [t`D, women who smoke`, null]],
    expected: regionAreas.map(str),
  },
  solution: [
    t`Each region is a rectangle: width times height.`,
    t`A: ${math`${MEN} \times ${sub(q(1), SMOKE_MEN)} = ${AREA.A}`}. B: ${math`${WOMEN} \times ${sub(q(1), SMOKE_WOMEN)} = ${AREA.B}`}.`,
    t`C: ${math`${MEN} \times ${SMOKE_MEN} = ${AREA.C}`}. D: ${math`${WOMEN} \times ${SMOKE_WOMEN} = ${AREA.D}`}.`,
    t`They add up to ${math`${add(add(AREA.A, AREA.B), add(AREA.C, AREA.D))}`}, the whole square. Region D answers part (a), and A and B together answer part (b): ${math`${AREA.A} + ${AREA.B} = ${add(AREA.A, AREA.B)}`}.`,
    t`In an area diagram, a joint probability is width times height.`,
  ],
  reference: regionAreas.map(str),
  verify: () => {
    // Against the hints: (a) female smoker 18/100 is region D; (b) non-smoker 62/100 is A and B together.
    const d = same('region D against the hints (a)', str(AREA.D), str(q(18, 100)));
    if (d !== null) return d;
    const ab = same('regions A and B against the hints (b)', str(add(AREA.A, AREA.B)), str(q(62, 100)));
    if (ab !== null) return ab;
    return same('the regions fill the square', str(regionAreas.reduce(add)), '1');
  },
  misconceptions: [{ response: [MEN, WOMEN, SMOKE_MEN, SMOKE_WOMEN].map(str), why: t`Those are the side lengths of the strips, not the areas. A region's area is its width times its height.` }],
});

const notSmokerWoman = q(POP.nnb, POP.anb + POP.nnb);
const a6eWoman = auto({
  id: 'a6-q4-i-e-woman',
  source: cite('step-f06', 'Q4(i)(e)', true),
  title: t`A woman, given a non-smoker`,
  prompt: t`${smokingIntro} Given that the person picked is a non-smoker, find the probability that she is a woman.`,
  nudge: t`Not quite. Restrict to the non-smokers first, then find the share of them who are women.`,
  hints: [
    t`In a population of ${100}, how many men and how many women do not smoke?`,
    t`How many non-smokers are there in all?`,
    t`What fraction of the non-smokers are women?`,
  ],
  answer: { kind: 'exact', expected: str(notSmokerWoman) },
  solution: [
    t`In a population of ${100}: ${POP.anb} men and ${POP.nnb} women do not smoke, so ${POP.anb + POP.nnb} non-smokers.`,
    t`Given a non-smoker, restrict to those ${POP.anb + POP.nnb}: ${math`\frac{${POP.nnb}}{${POP.anb + POP.nnb}} = ${notSmokerWoman}`}.`,
    t`Part (e) asks for a man instead; the two answers add up to ${1}, since a non-smoker is a man or a woman.`,
    t`Given a condition, divide by the people who meet it.`,
  ],
  reference: str(notSmokerWoman),
  verify: () => {
    // Against the areas, and against the hints' answer to (e), 10/31 for a man: the two must add up to 1.
    const byArea = same('B over A and B', str(q(AREA.B.num * add(AREA.A, AREA.B).den, AREA.B.den * add(AREA.A, AREA.B).num)), str(notSmokerWoman));
    return byArea ?? same('one minus the hints (e)', str(sub(q(1), q(10, 31))), str(notSmokerWoman));
  },
  misconceptions: [
    { response: str(sub(q(1), SMOKE_WOMEN)), why: t`That is the share of women who do not smoke: the reverse condition. Restrict to the non-smokers and find the share who are women.` },
    { response: str(q(POP.nnb, 100)), why: t`That is a female non-smoker out of everyone. Given a non-smoker, divide by the ${POP.anb + POP.nnb} non-smokers.` },
  ],
});

const a6diagram = supervision({
  id: 'a6-q4-i-diagram',
  source: cite('step-f06', 'Q4(i), the two diagrams', true),
  title: t`Reading a condition from the diagram`,
  prompt: t`${smokingIntro} ${diagramText} Explain, using the regions A to D, how to read off ${math`P(\text{smoker} \mid \text{woman})`} and ${math`P(\text{woman} \mid \text{smoker})`}. Why does one of them appear directly as a length in the diagram, while the other has to be worked out from areas?`,
  hints: [
    t`Which regions make up the women, and which the smokers?`,
    t`Given a woman, which part of the women's strip is region D, and how is that read as a length?`,
    t`Given a smoker, which two regions must be compared, and why are their widths different?`,
  ],
  writeUp: 'explanation',
  official: cite('step-f06-hints', 'Q4(i)(c), (d)'),
});

// ---------------------------------------------------------------- lesson

const EX: TableP = { g: 0, cells: [18, 12, 10, 20], r: 0, c: 0 };
const exTotal = rowTotal(EX, 0) + rowTotal(EX, 1);
const DOG: PctP = { n: 100, pa: 20, pbA: 50, pbNotA: 10, given: 'b' };
const dog = pctCounts(DOG);

const claims: ProbabilityClaim[] = [
  {
    what: 'P(junior | walks) from the table in the lesson',
    exact: q(cell(EX, 0, 0), colTotal(EX, 0)),
    trial: (rng) => restrictedTrial(rng, exTotal, (i) => i < cell(EX, 0, 0) || (i >= rowTotal(EX, 0) && i < rowTotal(EX, 0) + cell(EX, 1, 0)), (i) => i < rowTotal(EX, 0)),
  },
];
const [mA, mB] = [math`A`, math`B`];

export const twoWayTables: TopicContent = {
  topicId: 'pre.two-way-tables',
  goal: t`Find a probability "given that" something happened, by restricting a two-way table or a Venn diagram to the part where it happened.`,
  objective: t`Find a probability given that something happened, by restricting a table or Venn diagram.`,
  why: t`Conditional probability starts here; it is the basis of trees, Bayes's formula and independence.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`New information changes the odds` },
    { kind: 'hook', text: t`A school has ${exTotal} students. One is picked at random: the chance of a junior is ${q(rowTotal(EX, 0), exTotal)}. Now you are told the student walks to school, and most walkers are juniors. Surely the chance of a junior has gone up. To what?` },
    { kind: 'narrative', text: t`Being told something rules things out. Once you know the student walks, every non-walker is off the table. The question becomes: among the walkers only, what share are juniors? A two-way table makes that share easy to read.` },
    { kind: 'section', title: t`Restricting a table` },
    {
      kind: 'table', caption: t`How ${exTotal} students get to school: a [[two-way-table|two-way table]].`,
      head: [t``, t`walks`, t`does not walk`, t`total`],
      rows: [
        [t`juniors`, t`${cell(EX, 0, 0)}`, t`${cell(EX, 0, 1)}`, t`${rowTotal(EX, 0)}`],
        [t`seniors`, t`${cell(EX, 1, 0)}`, t`${cell(EX, 1, 1)}`, t`${rowTotal(EX, 1)}`],
        [t`total`, t`${colTotal(EX, 0)}`, t`${colTotal(EX, 1)}`, t`${exTotal}`],
      ],
    },
    {
      kind: 'definition',
      name: t`Conditional probability, by counting`,
      formal: t`When all outcomes are equally likely and event ${mB} contains at least one outcome, the [[conditional-probability|conditional probability]] of ${mA} given ${mB} is ${dmath`P(A \mid B) = \frac{\text{number of outcomes in both } A \text{ and } B}{\text{number of outcomes in } B}.`}`,
      plain: t`In plain words: keep only the part where ${mB} happened, and find the share of it where ${mA} also happened. Read the bar as "given".`,
    },
    {
      kind: 'steps',
      steps: [
        { label: t`Keep the condition`, text: t`"Given that the student walks": keep the walkers column, ${colTotal(EX, 0)} students.` },
        { label: t`Count the event inside it`, text: t`${cell(EX, 0, 0)} of them are juniors.` },
        { label: t`Divide`, text: t`${math`P(\text{junior} \mid \text{walks}) = \frac{${cell(EX, 0, 0)}}{${colTotal(EX, 0)}} = ${q(cell(EX, 0, 0), colTotal(EX, 0))}`}, up from ${q(rowTotal(EX, 0), exTotal)}.` },
      ],
    },
    { kind: 'narrative', text: t`The same rule can be written with probabilities instead of counts, which is the form you will use once the numbers are not counts.` },
    { kind: 'theorem', statement: t`With equally likely outcomes and ${math`P(B) > ${0}`}, ${math`P(A \mid B) = \frac{P(A \cap B)}{P(B)}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Name the counts`, text: t`Let ${math`N`} be the number of outcomes, ${math`n_{B}`} the number in ${mB}, and ${math`n_{AB}`} the number in both.` },
        { label: t`Divide top and bottom`, text: t`${math`P(A \mid B) = \frac{n_{AB}}{n_{B}} = \frac{n_{AB}/N}{n_{B}/N}`}, dividing both by ${math`N`}.`, why: { q: t`Why may we divide both by ${math`N`}?`, a: t`Dividing the top and bottom of a fraction by the same non-zero number leaves its value unchanged: ${math`\frac{${6}}{${8}} = \frac{${6}/${2}}{${8}/${2}}`}.` } },
        { label: t`Recognise probabilities`, text: t`${math`\frac{n_{AB}}{N} = P(A \cap B)`} and ${math`\frac{n_{B}}{N} = P(B)`}, by the definition of probability for equally likely outcomes.` },
      ],
    },
    { kind: 'pitfall', claim: t`${math`P(\text{walks} \mid \text{junior})`} is the same as ${math`P(\text{junior} \mid \text{walks})`}.`, counterexample: t`Order matters. ${math`P(\text{walks} \mid \text{junior}) = \frac{${cell(EX, 0, 0)}}{${rowTotal(EX, 0)}} = ${q(cell(EX, 0, 0), rowTotal(EX, 0))}`} keeps the juniors row instead of the walkers column, and is a different number from ${q(cell(EX, 0, 0), colTotal(EX, 0))}.` },
    checkFrom(tableGiven, { g: 1, cells: [12, 8, 20, 10], r: 1, c: 0 }, t`Keep the film column: ${math`${12} + ${20} = ${32}`} people, ${20} of them children: ${q(20, 32)}.`),
    { kind: 'section', title: t`Venn diagrams and percentages` },
    { kind: 'p', text: t`A Venn diagram of counts works the same way. "Given ${mB}" keeps only circle ${mB}, and the answer is the overlap over everything in ${mB}. "Given not ${mB}" keeps everything outside circle ${mB}.` },
    checkFrom(vennGiven, { a: 6, ab: 4, b: 8, n: 2, ask: 'a-given-b' }, t`Keep the art circle: ${math`${4} + ${8} = ${12}`} students, ${4} of them also study French: ${q(4, 12)}.`),
    { kind: 'narrative', text: t`When the data come as percentages, STEP Support Assignment ${6} suggests imagining a population of ${100} people (or another round number), turning each percentage into a count, and filling in the table. Then restrict, as before.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Make counts`, text: t`${DOG.pa}% live in flats, and ${DOG.pbA}% of those own a dog; ${DOG.pbNotA}% of house dwellers do. In ${DOG.n} people: ${dog.a} in flats, ${dog.ab} of them with dogs; ${dog.n} in houses, ${dog.nb} of them with dogs.` },
        { label: t`Restrict to dog owners`, text: t`${math`${dog.ab} + ${dog.nb} = ${dog.ab + dog.nb}`} people own a dog, and ${dog.ab} of them live in flats.` },
        { label: t`Divide`, text: t`${math`P(\text{flat} \mid \text{dog}) = \frac{${dog.ab}}{${dog.ab + dog.nb}} = ${q(dog.ab, dog.ab + dog.nb)}`}.`, plain: t`More than half, although only ${DOG.pa}% of people live in flats: flat dwellers are far likelier to own a dog.` },
      ],
    },
    { kind: 'p', text: t`The assignment's other picture is a square of area ${1}, cut into rectangles, one for each cell of the table. A probability is an area, and a conditional probability is an area divided by the area of the condition.` },
    { kind: 'pitfall', claim: t`Only ${DOG.pa}% of people live in flats, so a dog owner lives in a flat with probability ${q(DOG.pa, 100)}.`, counterexample: t`That ignores the information. Restricting to dog owners gives ${q(dog.ab, dog.ab + dog.nb)}.` },
    { kind: 'takeaway', text: t`"Given ${mB}" means keep only the part where ${mB} happened, and find the share of it where ${mA} happened too.` },
  ],
  examples: [
    workedCambridge(a6c),
    worked(tableGiven, EX, t`Restrict to a column`),
    worked(vennGiven, { a: 7, ab: 5, b: 9, n: 4, ask: 'a-given-not-b' }, t`Given outside a circle`),
  ],
  generators: [tableGiven, vennGiven, pctTable],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['two-way-table', 'conditional-probability'],
  claims,
  cambridge: withUses([a6regions, a6eWoman, a6diagram], {
    'a6-q4-i-diagram': { sections: ['Restricting a table', 'Venn diagrams and percentages'], note: t`Reading a conditional probability from an area diagram` },
    'a6-q4-i-e-woman': { sections: ['Restricting a table'], note: t`Restricting to the non-smokers and reading off a share` },
    'a6-q4-i-regions': { sections: ['Venn diagrams and percentages'], note: t`The four regions of an area diagram as probabilities` },
  }),
  // Best first: the reversed condition (a non-smoker is a woman), then the four areas. The
  // explanation from the diagram stays practice: the worked example a6-q4-i-c reads
  // P(smoker | woman) off the diagram.
  gate: ['a6-q4-i-e-woman', 'a6-q4-i-regions'],
  recall: [
    { front: t`Conditional probability from counts?`, back: t`${math`P(A \mid B)`} is the number in both over the number in ${mB}.` },
    { front: t`Conditional probability from probabilities?`, back: t`${math`P(A \mid B) = \frac{P(A \cap B)}{P(B)}`}, for ${math`P(B) > ${0}`}.` },
    { front: t`Is ${math`P(A \mid B)`} the same as ${math`P(B \mid A)`}?`, back: t`No: one restricts to ${mB}, the other to ${mA}.` },
  ],
  proofOrder: [
    {
      title: t`From counts to probabilities`,
      steps: [
        t`${math`P(A \mid B) = \frac{n_{AB}}{n_{B}}`}, by counting.`,
        t`Divide top and bottom by the total ${math`N`}.`,
        t`The top becomes ${math`P(A \cap B)`} and the bottom ${math`P(B)`}.`,
      ],
    },
  ],
};
