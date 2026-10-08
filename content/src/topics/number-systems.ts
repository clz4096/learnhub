/**
 * num.number-systems: The natural numbers (from 0, as the CST notes define them on printed
 * page 158), the integers, and the rationals; which operations each is closed under, and
 * which elements have inverses. From the CST notes, printed pages 158 to 175 (addition and
 * multiplication, cancellation on page 167, the remark on inverses on page 173, and the
 * extension to Z and Q on page 174), Book of Proof Section 1.9, and supervision exercises
 * 3.2.5, whose 2023-24 official solution is cited for the supervisor. The proof of exercise 1.1.6
 * is in proof.direct, and 2008 STEP I Q1 (closure of the rationals, read backwards: an irrational
 * product or sum needs an irrational ingredient; at most one of four numbers is rational) in
 * proof.contradiction (Rule 1, 2026-10-08).
 */
import type { Rational } from '@learnhub/mastery';
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { div, int, pick, q, str, sub, upTo } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { computedTex, math, paren, t, type Rich, type Span } from '../rich';
import { checkFrom, worked, workedCambridge, type TopicContent } from '../topic';

const [N, Z, Q, R] = [math`\mathbb{N}`, math`\mathbb{Z}`, math`\mathbb{Q}`, math`\mathbb{R}`];

// ---------------------------------------------------------------- closure

type Op = 'add' | 'sub' | 'mul' | 'div';
const OPS: readonly Op[] = ['add', 'sub', 'mul', 'div'];
const OP_LABEL: Readonly<Record<Op, Rich>> = {
  add: t`addition`, sub: t`subtraction`, mul: t`multiplication`, div: t`division by a nonzero element`,
};
const OP_TEX: Readonly<Record<Op, string>> = { add: '+', sub: '-', mul: '\\times', div: '\\div' };

function apply(op: Op, a: Rational, b: Rational): Rational | null {
  switch (op) {
    case 'add': return q(a.num * b.den + b.num * a.den, a.den * b.den);
    case 'sub': return sub(a, b);
    case 'mul': return q(a.num * b.num, a.den * b.den);
    case 'div': return b.num === 0n ? null : div(a, b);
  }
}

/** A set of numbers: its name, a membership test, and sample elements for checking closure. */
interface NumSet { name: Rich; member: (x: Rational) => boolean; samples: Rational[] }
const isInt = (x: Rational): boolean => x.den === 1n;
const ints = (lo: number, hi: number): Rational[] => upTo(hi - lo + 1).map((i) => q(lo + i - 1));
const fracs = (): Rational[] => [-3, -2, -1, 0, 1, 2, 3].flatMap((n) => [1, 2, 3].map((d) => q(n, d)));

const SETS: readonly NumSet[] = [
  { name: t`the natural numbers ${N}`, member: (x) => isInt(x) && x.num >= 0n, samples: ints(0, 8) },
  { name: t`the integers ${Z}`, member: isInt, samples: ints(-6, 6) },
  { name: t`the rationals ${Q}`, member: () => true, samples: fracs() },
  { name: t`the positive integers`, member: (x) => isInt(x) && x.num > 0n, samples: ints(1, 8) },
  { name: t`the even integers`, member: (x) => isInt(x) && x.num % 2n === 0n, samples: ints(-6, 6).filter((x) => x.num % 2n === 0n) },
  { name: t`the odd integers`, member: (x) => isInt(x) && x.num % 2n !== 0n, samples: ints(-7, 7).filter((x) => x.num % 2n !== 0n) },
  { name: t`the multiples of ${3}`, member: (x) => isInt(x) && x.num % 3n === 0n, samples: ints(-9, 9).filter((x) => x.num % 3n === 0n) },
  { name: t`the positive rationals`, member: (x) => x.num > 0n, samples: fracs().filter((x) => x.num > 0n) },
];

/** A pair of elements whose result leaves the set, or null when none of the samples does. */
function escape(s: NumSet, op: Op): [Rational, Rational, Rational] | null {
  for (const a of s.samples) for (const b of s.samples) {
    const c = apply(op, a, b);
    if (c !== null && !s.member(c)) return [a, b, c];
  }
  return null;
}
const closedUnder = (s: NumSet): Op[] => OPS.filter((op) => escape(s, op) === null);

const OPTIONS: readonly ChoiceOption[] = OPS.map((op) => ({ id: op, label: OP_LABEL[op] }));
const tex = (x: Rational): string => (x.den === 1n ? `${x.num < 0n ? `(${x.num})` : x.num}` : `${x.num < 0n ? '-' : ''}\\frac{${x.num < 0n ? -x.num : x.num}}{${x.den}}`);
const escapeText = (op: Op, e: [Rational, Rational, Rational]): Span => math`${computedTex(tex(e[0]))} ${OP_TEX[op]} ${computedTex(tex(e[1]))} = ${e[2]}`;

interface ClosureP { i: number }

const closure = generator<ClosureP>({
  id: 'closure',
  skill: 'Say which of addition, subtraction, multiplication, and division a set of numbers is closed under.',
  params: (rng) => ({ i: int(rng, 0, SETS.length - 1) }),
  sane: ({ i }) => (i >= 0 && i < SETS.length ? null : 'out of range'),
  problem: ({ i }) => {
    const s = SETS[i] as NumSet;
    const yes = closedUnder(s);
    return {
      prompt: t`Choose every operation that ${s.name} are [[closed|closed]] under: combining two of them always gives another one.`,
      answer: { kind: 'choice', options: OPTIONS, correct: yes },
      solution: OPS.map((op) => {
        const e = escape(s, op);
        return e === null
          ? t`${OP_LABEL[op]}: closed, the result is always in the set.`
          : t`${OP_LABEL[op]}: not closed, since ${escapeText(op, e)}, which is not in the set.`;
      }),
    };
  },
  solve: ({ i }) => {
    // A wider search than the problem's: every pair of elements in a larger range.
    const s = SETS[i] as NumSet;
    const wide = [...ints(-12, 12), ...[-5, -3, -1, 1, 3, 5].flatMap((n) => [2, 4, 5].map((d) => q(n, d)))].filter(s.member);
    return OPS.filter((op) => wide.every((a) => wide.every((b) => { const c = apply(op, a, b); return c === null || s.member(c); })));
  },
  misconceptions: ({ i }): Misconception[] => {
    const s = SETS[i] as NumSet;
    const yes = closedUnder(s);
    const toggle = (op: Op): Misconception => {
      const e = escape(s, op);
      const response = yes.includes(op) ? yes.filter((x) => x !== op) : [...yes, op];
      return {
        response,
        why: e === null
          ? t`${s.name} are closed under ${OP_LABEL[op]}: try a few, the result stays in the set.`
          : t`${s.name} are not closed under ${OP_LABEL[op]}: ${escapeText(op, e)}, which is not in the set.`,
      };
    };
    return [toggle('sub'), toggle('div')];
  },
});

// ---------------------------------------------------------------- which systems

type Kind = 'zero' | 'pos-int' | 'neg-int' | 'frac-int' | 'frac' | 'neg-frac' | 'surd';
interface WhichP { kind: Kind; a: number; b: number }

const SYSTEMS: readonly ChoiceOption[] = [
  { id: 'N', label: [N] }, { id: 'Z', label: [Z] }, { id: 'Q', label: [Q] }, { id: 'R', label: [R] },
];
const valueTex = ({ kind, a, b }: WhichP): Span => {
  switch (kind) {
    case 'zero': return math`${0}`;
    case 'pos-int': return math`${a}`;
    case 'neg-int': return math`${-a}`;
    case 'frac-int': return math`\frac{${a * b}}{${b}}`;
    case 'frac': return math`\frac{${a}}{${b}}`;
    case 'neg-frac': return math`-\frac{${a}}{${b}}`;
    case 'surd': return math`\sqrt{${a}}`;
  }
};
const isSquare = (n: number): boolean => Number.isInteger(Math.sqrt(n));

const which = generator<WhichP>({
  id: 'which-systems',
  skill: 'Say which of N, Z, Q, and R a number belongs to, with N starting at 0 as in the CST notes.',
  params: (rng) => {
    const kind = pick(rng, ['zero', 'pos-int', 'neg-int', 'frac-int', 'frac', 'neg-frac', 'surd'] as const);
    for (;;) {
      const a = int(rng, 1, 12);
      const b = int(rng, 2, 9);
      if ((kind === 'frac' || kind === 'neg-frac') && a % b === 0) continue;
      if (kind === 'surd' && isSquare(a)) continue;
      return { kind, a, b };
    }
  },
  sane: ({ kind, a, b }) => ((kind === 'frac' || kind === 'neg-frac') && a % b === 0 ? 'a whole number' : kind === 'surd' && isSquare(a) ? 'a square' : null),
  problem: (p) => {
    const ans = memberships(p);
    return {
      prompt: t`Which of these number systems contain ${valueTex(p)}? Choose all that apply.`,
      answer: { kind: 'choice', options: SYSTEMS, correct: ans },
      solution: [
        p.kind === 'zero' ? t`In the CST notes the [[natural-number|natural numbers]] start at ${0}: ${math`\mathbb{N} = \{${0}, ${1}, ${2}, \ldots\}`}. So ${0} is natural.`
          : p.kind === 'pos-int' ? t`${p.a} is a natural number.`
            : p.kind === 'neg-int' ? t`${math`${-p.a}`} is an [[integer|integer]], but not natural: natural numbers are not negative.`
              : p.kind === 'frac-int' ? t`${valueTex(p)} is ${p.a}, written as a fraction: a natural number.`
                : p.kind === 'surd' ? t`${p.a} is not a perfect square, so ${valueTex(p)} is irrational: a real number, but not rational.`
                  : t`${valueTex(p)} is a [[rational-number|rational number]], a ratio of integers, but not an integer.`,
        t`Each system contains the one before: ${math`\mathbb{N} \subseteq \mathbb{Z} \subseteq \mathbb{Q} \subseteq \mathbb{R}`}. So the answer is ${ans.map((x) => (SYSTEMS.find((o) => o.id === x) as ChoiceOption).label).reduce<Rich>((acc, l, i) => (i === 0 ? l : [...acc, ...t`, `, ...l]), [])}.`,
      ],
    };
  },
  solve: ({ kind, a, b }) => {
    // From the value itself: is it a square root of a non-square, an integer, nonnegative?
    if (kind === 'surd') return upTo(a).some((x) => x * x === a) ? ['N', 'Z', 'Q', 'R'] : ['R'];
    const v = kind === 'zero' ? q(0) : kind === 'pos-int' ? q(a) : kind === 'neg-int' ? q(-a) : kind === 'frac-int' ? q(a * b, b) : kind === 'frac' ? q(a, b) : q(-a, b);
    return [...(v.den === 1n && v.num >= 0n ? ['N'] : []), ...(v.den === 1n ? ['Z'] : []), 'Q', 'R'];
  },
  misconceptions: (p): Misconception[] => {
    switch (p.kind) {
      case 'zero': return [
        { response: ['Z', 'Q', 'R'], why: t`In this course ${math`\mathbb{N}`} starts at ${0}, as the CST notes define it. (Book of Proof starts it at ${1}; say which you use.)` },
        { response: ['N'], why: t`A natural number is also an integer, a rational, and a real: ${math`\mathbb{N} \subseteq \mathbb{Z} \subseteq \mathbb{Q} \subseteq \mathbb{R}`}.` },
      ];
      case 'pos-int':
      case 'frac-int': return [
        { response: p.kind === 'frac-int' ? ['Q', 'R'] : ['N'], why: p.kind === 'frac-int' ? t`${valueTex(p)} is ${p.a}: a fraction can be a whole number.` : t`A natural number is also an integer, a rational, and a real.` },
        { response: ['N', 'Z'], why: t`Every integer ${math`n`} is rational, as ${math`\frac{n}{${1}}`}, and real.` },
      ];
      case 'neg-int': return [
        { response: ['N', 'Z', 'Q', 'R'], why: t`Natural numbers are never negative.` },
        { response: ['Z'], why: t`Every integer is also rational and real.` },
      ];
      case 'frac':
      case 'neg-frac': return [
        { response: ['Q'], why: t`Every rational number is also real.` },
        { response: ['Z', 'Q', 'R'], why: t`${valueTex(p)} is not a whole number, so it is not an integer.` },
      ];
      case 'surd': return [
        { response: ['Q', 'R'], why: t`${p.a} is not a perfect square, so ${valueTex(p)} is irrational: not a ratio of integers.` },
        { response: ['N', 'Z', 'Q', 'R'], why: t`${valueTex(p)} is not a whole number, nor a ratio of integers.` },
      ];
    }
  },
});

function memberships(p: WhichP): string[] {
  switch (p.kind) {
    case 'zero': case 'pos-int': case 'frac-int': return ['N', 'Z', 'Q', 'R'];
    case 'neg-int': return ['Z', 'Q', 'R'];
    case 'frac': case 'neg-frac': return ['Q', 'R'];
    case 'surd': return ['R'];
  }
}

// ---------------------------------------------------------------- smallest system with a solution

interface SolveP { a: number; b: number; c: number }
const NZQ: readonly ChoiceOption[] = [{ id: 'N', label: [N] }, { id: 'Z', label: [Z] }, { id: 'Q', label: [Q] }];

const smallest = generator<SolveP>({
  id: 'smallest-system',
  skill: 'Find the smallest of N, Z, and Q that contains the solution of a linear equation: why the integers and rationals were invented.',
  params: (rng) => ({ a: int(rng, 1, 6), b: int(rng, -9, 9), c: int(rng, -9, 9) }),
  sane: ({ a }) => (a >= 1 && a <= 6 ? null : 'out of range'),
  problem: ({ a, b, c }) => {
    const x = q(c - b, a);
    const ans = isInt(x) ? (x.num >= 0n ? 'N' : 'Z') : 'Q';
    const eq = a === 1 ? (b === 0 ? math`x = ${c}` : math`x ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${c}`) : b === 0 ? math`${a}x = ${c}` : math`${a}x ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${c}`;
    return {
      prompt: t`Which is the smallest of ${N}, ${Z}, and ${Q} that contains a solution of ${eq}?`,
      answer: { kind: 'choice', options: NZQ, correct: ans },
      solution: [
        t`Solve: ${math`x = \frac{${c} - ${paren(b)}}{${a}} = ${x}`}.`,
        ans === 'N' ? t`That is a natural number, so ${N} already has it.` : ans === 'Z' ? t`That is a negative integer: not in ${N}, but in ${Z}.` : t`That is not an integer, so only ${Q} has it.`,
      ],
    };
  },
  solve: ({ a, b, c }) => {
    // Search for a solution among natural numbers, then integers; otherwise it is a fraction.
    if (upTo(41).some((n) => a * (n - 1) + b === c)) return ['N'];
    if (upTo(81).some((n) => a * (n - 41) + b === c)) return ['Z'];
    return ['Q'];
  },
  misconceptions: ({ a, b, c }): Misconception[] => {
    const x = q(c - b, a);
    const ans = isInt(x) ? (x.num >= 0n ? 'N' : 'Z') : 'Q';
    return NZQ.filter((o) => o.id !== ans).map((o) => ({
      response: [o.id],
      why: o.id === 'N' ? t`The solution is ${x}, which is ${isInt(x) ? 'negative' : 'not a whole number'}: not natural.`
        : o.id === 'Z' ? (ans === 'N' ? t`${Z} contains it, but ${N} is smaller and already does.` : t`The solution ${x} is not a whole number, so ${Z} does not contain it.`)
          : t`${Q} contains it, but a smaller system already does: the solution is ${x}.`,
    }));
  },
});

// ---------------------------------------------------------------- inverses

interface InvP { kind: 'additive' | 'multiplicative'; n: number; d: number }

const inverse = generator<InvP>({
  id: 'inverse',
  skill: 'Find the additive inverse (in Z or Q) or the multiplicative inverse (in Q) of a number.',
  params: (rng) => {
    for (;;) {
      const p: InvP = { kind: pick(rng, ['additive', 'multiplicative'] as const), n: int(rng, -9, 9), d: pick(rng, [1, 1, 2, 3, 4, 5]) };
      // Zero has no reciprocal; and ±1 are their own reciprocals, so the "itself" slip would be right.
      if (p.n !== 0 && !(p.kind === 'multiplicative' && Math.abs(p.n) === p.d)) return p;
    }
  },
  sane: ({ n, d, kind }) => (n !== 0 && d >= 1 && !(kind === 'multiplicative' && Math.abs(n) === d) ? null : 'out of range'),
  problem: ({ kind, n, d }) => {
    const v = q(n, d);
    const ans = kind === 'additive' ? q(-n, d) : q(d, n);
    return {
      prompt: kind === 'additive'
        ? t`What is the additive inverse of ${v}: the number ${math`y`} with ${math`${v} + y = ${0}`}?`
        : t`What is the multiplicative inverse of ${v}: the number ${math`y`} with ${math`${v} \times y = ${1}`}?`,
      answer: { kind: 'exact', expected: str(ans) },
      solution: kind === 'additive'
        ? [t`The [[additive-inverse|additive inverse]] is the negative: ${math`${v} + (${ans}) = ${0}`}. So ${math`y = ${ans}`}.`]
        : [t`The multiplicative inverse is the reciprocal: ${math`${v} \times ${ans} = ${1}`}. So ${math`y = ${ans}`}.`],
    };
  },
  solve: ({ kind, n, d }) => {
    // Search fractions with small numerator and denominator for the y that works.
    const v = q(n, d);
    for (let den = 1; den <= 12; den++) for (let num = -12; num <= 12; num++) {
      const y = q(num, den);
      const r = kind === 'additive' ? apply('add', v, y) : apply('mul', v, y);
      if (r !== null && r.num === (kind === 'additive' ? 0n : 1n) && r.den === 1n) return str(y);
    }
    return 'none';
  },
  misconceptions: ({ kind, n, d }): Misconception[] => kind === 'additive'
    ? [
      { response: str(q(d, n)), why: t`That is the reciprocal, the multiplicative inverse. The additive inverse adds to ${0}.` },
      { response: str(q(n, d)), why: t`A number plus itself is ${0} only for ${0}. Change the sign.` },
    ]
    : [
      { response: str(q(-n, d)), why: t`That is the additive inverse. The multiplicative inverse multiplies to ${1}: turn the fraction upside down.` },
      { response: str(q(-d, n)), why: t`The reciprocal keeps the sign: a negative times a negative is positive, so the inverse of a negative number is negative.` },
    ],
});

// ---------------------------------------------------------------- Cambridge problems

const NOTES = 'cst-dm-notes';
/** Natural numbers with an additive inverse in N, and with a multiplicative inverse, by search. */
const naturalInverses = (): [number[], number[]] => {
  const ns = upTo(101).map((x) => x - 1);
  return [ns.filter((x) => ns.some((y) => x + y === 0)), ns.filter((x) => ns.some((y) => x * y === 1))];
};

const notes173 = auto({
  id: 'notes-173-inverses',
  source: cite(NOTES, 'printed page 173, Definition 51 and the Remark', true),
  title: t`Inverses in the natural numbers`,
  prompt: t`In the system of natural numbers ${math`\mathbb{N} = \{${0}, ${1}, ${2}, \ldots\}`}, which number has an additive inverse in ${N} (a natural ${math`y`} with ${math`x + y = ${0}`}), and which has a multiplicative inverse in ${N} (a natural ${math`y`} with ${math`x \cdot y = ${1}`})?`,
  answer: {
    kind: 'table', cell: 'exact', columns: [t`kind of inverse`, t`the only natural number that has one`],
    rows: [[t`additive`, null], [t`multiplicative`, null]],
    expected: ['0', '1'],
  },
  solution: [
    t`If ${math`x + y = ${0}`} with ${math`x, y \ge ${0}`}, both must be ${0}: so only ${0} has an additive inverse, itself.`,
    t`If ${math`x \cdot y = ${1}`} with natural ${math`x`} and ${math`y`}, both must be ${1}: so only ${1} has a multiplicative inverse, itself.`,
    t`The notes' remark: inverses give cancellation, but not the other way round. ${N} allows cancellation without having inverses.`,
  ],
  reference: ['0', '1'],
  verify: () => {
    const [add, mul] = naturalInverses();
    return same('search of 0 to 100', `${add.join(',')}|${mul.join(',')}`, '0|1');
  },
  misconceptions: [{ response: ['1', '1'], why: t`${1} has no additive inverse in ${N}: ${math`${1} + y = ${0}`} needs ${math`y = ${-1}`}. But ${0} is natural here, and ${math`${0} + ${0} = ${0}`}.` }],
  official: { source: cite(NOTES, 'printed page 173, Remark'), answer: ['0', '1'], agrees: true },
});

const extend = (o: { id: string; what: Rich; ans: 'Z' | 'Q'; steps: Rich[]; check: () => boolean; hints?: readonly Rich[]; nudge?: Rich }) => auto({
  id: o.id,
  source: cite(NOTES, 'printed page 174', true),
  title: o.ans === 'Z' ? t`Admitting additive inverses` : t`Admitting multiplicative inverses`,
  prompt: t`The notes extend ${N} in two steps. Which is the smallest of ${N}, ${Z}, and ${Q} in which ${o.what} always has a solution?`,
  answer: { kind: 'choice', options: NZQ, correct: o.ans },
  solution: o.steps,
  reference: o.ans,
  verify: () => (o.check() ? null : `${o.id}: the search disagrees`),
  misconceptions: [{ response: 'N', why: t`Try a case: ${o.ans === 'Z' ? t`${math`x + ${3} = ${1}`} has the solution ${math`${-2}`}, which is not natural` : t`${math`${2}x = ${1}`} has no solution in ${N}`}.` }],
  ...(o.hints === undefined ? {} : { hints: o.hints }),
  ...(o.nudge === undefined ? {} : { nudge: o.nudge }),
});

const notes174z = extend({
  id: 'notes-174-z', ans: 'Z',
  what: t`every equation ${math`x + a = b`}, with ${math`a`} and ${math`b`} natural,`,
  steps: [
    t`The solution is ${math`x = b - a`}. In ${N} that fails when ${math`a > b`}: ${math`x + ${3} = ${1}`} needs ${math`x = ${-2}`}.`,
    t`Admitting every additive inverse gives the integers ${Z}, where ${math`b - a`} always exists. The notes call ${Z} a commutative ring.`,
    t`Each extension of ${N} adds just the inverses that some equation needs.`,
  ],
  check: () => {
    const ns = upTo(10).map((x) => x - 1);
    const failsInN = ns.some((a) => ns.some((b) => !ns.some((x) => x + a === b)));
    const zs = upTo(21).map((x) => x - 11);
    return failsInN && ns.every((a) => ns.every((b) => zs.some((x) => x + a === b)));
  },
  nudge: t`Not quite. Try an equation ${math`x + a = b`} with ${math`a`} larger than ${math`b`}, and ask where its solution lives.`,
  hints: [
    t`What is the solution of ${math`x + a = b`}?`,
    t`Is that solution natural when ${math`a > b`}?`,
    t`Which of the three sets first contains ${math`b - a`} for all natural ${math`a`} and ${math`b`}?`,
  ],
});
const notes174q = extend({
  id: 'notes-174-q', ans: 'Q',
  what: t`every equation ${math`a \cdot x = b`}, with ${math`a`} and ${math`b`} integers and ${math`a \ne ${0}`},`,
  steps: [
    t`The solution is ${math`x = \frac{b}{a}`}. In ${Z} that fails unless ${math`a`} divides ${math`b`}: ${math`${2}x = ${1}`} has no integer solution.`,
    t`Admitting a multiplicative inverse for every nonzero number gives the rationals ${Q}. The notes call ${Q} a field.`,
    t`Solving ${math`a \cdot x = b`} in general needs multiplicative inverses, and so the rationals.`,
  ],
  check: () => {
    const zs = upTo(13).map((x) => x - 7);
    const failsInZ = zs.some((a) => a !== 0 && zs.some((b) => !zs.some((x) => a * x === b)));
    return failsInZ && zs.every((a) => a === 0 || zs.every((b) => { const x = q(b, a); return x.num * BigInt(a) === BigInt(b) * x.den; }));
  },
  nudge: t`Not quite. Try an equation ${math`a \cdot x = b`} in which ${math`a`} does not divide ${math`b`}.`,
  hints: [
    t`What is the solution of ${math`a \cdot x = b`} when ${math`a \ne ${0}`}?`,
    t`Is that solution an integer when ${math`a`} does not divide ${math`b`}?`,
    t`Which of the three sets first contains ${math`\frac{b}{a}`} for all integers ${math`b`} and ${math`a \ne ${0}`}?`,
  ],
});

const notes167 = auto({
  id: 'notes-167-cancel',
  source: cite(NOTES, 'printed page 167, Multiplicative cancellation', true),
  title: t`Why cancellation needs ${math`k \ne ${0}`}`,
  prompt: t`The notes state: for all natural numbers ${math`k, m, n`}, if ${math`k \ne ${0}`} then ${math`k \cdot m = k \cdot n \implies m = n`}. Show the condition ${math`k \ne ${0}`} is needed: give natural numbers ${math`k`}, ${math`m`}, ${math`n`} with ${math`k \cdot m = k \cdot n`} but ${math`m \ne n`}.`,
  answer: {
    kind: 'witness', count: 3, names: ['k', 'm', 'n'], example: 'k = 0, m = 1, n = 2',
    check: (vals) => {
      const [k, m, n] = vals.map((v) => (v.den === 1n && v.num >= 0n ? Number(v.num) : NaN)) as [number, number, number];
      if ([k, m, n].some((x) => Number.isNaN(x))) return 'Each is a natural number: a whole number, zero or more.';
      if (m === n) return 'm and n must differ.';
      return k * m === k * n ? null : `${k} × ${m} = ${k * m} but ${k} × ${n} = ${k * n}.`;
    },
  },
  solution: [
    t`If ${math`k \ne ${0}`}, ${math`k \cdot m = k \cdot n`} forces ${math`m = n`}, so the example must have ${math`k = ${0}`}.`,
    t`Then ${math`${0} \cdot m = ${0} = ${0} \cdot n`} for every ${math`m`} and ${math`n`}: for example ${math`k = ${0}`}, ${math`m = ${1}`}, ${math`n = ${2}`}.`,
    t`To show a hypothesis is needed, drop it and watch the conclusion fail.`,
  ],
  reference: 'k = 0, m = 1, n = 2',
  verify: () => {
    // Search small naturals: every counterexample has k = 0.
    const found: number[] = [];
    for (let k = 0; k < 6; k++) for (let m = 0; m < 6; m++) for (let n = 0; n < 6; n++) if (k * m === k * n && m !== n) found.push(k);
    return same('every counterexample has k = 0', [...new Set(found)].join(','), '0');
  },
  misconceptions: [{ response: 'k = 2, m = 1, n = 2', why: t`${math`${2} \cdot ${1} = ${2}`} but ${math`${2} \cdot ${2} = ${4}`}: with ${math`k \ne ${0}`} cancellation works. Use ${math`k = ${0}`}.` }],
  nudge: t`Not quite. Ask which value of ${math`k`} the statement excludes, and why.`,
  hints: [
    t`If ${math`k \ne ${0}`}, does ${math`k \cdot m = k \cdot n`} force ${math`m = n`}?`,
    t`So which value must ${math`k`} take in a counterexample?`,
    t`With that ${math`k`}, what is ${math`k \cdot m`} for every ${math`m`}?`,
  ],
});

// ---------------------------------------------------------------- lesson

export const numberSystems: TopicContent = {
  topicId: 'num.number-systems',
  goal: t`Name the number systems ${N}, ${Z}, and ${Q}, say which operations each is closed under, and say which numbers have inverses in each.`,
  objective: t`Name the natural numbers, integers and rationals, and say what each is closed under and what has inverses.`,
  why: t`Every proof about numbers starts by saying which numbers are allowed; next, divisibility in the integers.`,
  minutes: 20,
  lesson: [
    { kind: 'section', title: t`Equations with no answer` },
    { kind: 'hook', text: t`If the only numbers you have are ${math`${0}, ${1}, ${2}, \ldots`}, the equation ${math`x + ${3} = ${1}`} has no solution. If you also have the negatives, ${math`${2}x = ${1}`} still has none. Each time an equation has no answer, mathematicians build a bigger number system in which it does. This lesson follows that story, as the Cambridge CST notes tell it.` },

    { kind: 'section', title: t`Three number systems` },
    { kind: 'definition', name: t`Natural numbers`, formal: t`The [[natural-number|natural numbers]] are ${math`\mathbb{N} = \{${0}, ${1}, ${2}, \ldots\}`}: zero, and everything reached from zero by adding one again and again.`, plain: t`The counting numbers, starting at ${0}. Book of Proof starts ${N} at ${1}; in this course ${0} is natural. It matters: "${2} divides ${math`${2}^{n}`} for every natural ${math`n`}" is false only because ${math`${2}^{${0}} = ${1}`}.` },
    { kind: 'definition', name: t`Integers`, formal: t`The [[integer|integers]] are ${math`\mathbb{Z} = \{\ldots, -${2}, -${1}, ${0}, ${1}, ${2}, \ldots\}`}: the natural numbers together with their negatives.`, plain: t`Whole numbers, positive, negative, or zero.` },
    { kind: 'definition', name: t`Rational numbers`, formal: t`A real number is a [[rational-number|rational number]] if it equals ${math`\frac{m}{n}`} for some ${math`m, n \in \mathbb{Z}`} with ${math`n \ne ${0}`}. The set of rationals is ${Q}.`, plain: t`Fractions of whole numbers: ${math`\frac{${3}}{${4}}`}, ${math`-\frac{${7}}{${2}}`}, and ${5}, which is ${math`\frac{${5}}{${1}}`}.` },
    { kind: 'p', text: t`Each contains the one before: ${math`\mathbb{N} \subseteq \mathbb{Z} \subseteq \mathbb{Q} \subseteq \mathbb{R}`}, where ${R} is the real numbers. ${math`x + ${3} = ${1}`} needs ${Z} (the answer is ${math`-${2}`}), and ${math`${2}x = ${1}`} needs ${Q} (the answer is ${q(1, 2)}).` },
    checkFrom(smallest, { a: 3, b: 1, c: -5 }, t`${math`${3}x + ${1} = -${5}`} gives ${math`x = -${2}`}: a negative integer.`),

    { kind: 'section', title: t`Closure` },
    { kind: 'definition', name: t`Closed`, formal: t`A set ${math`S`} of numbers is [[closed|closed]] under an operation ${math`\ast`} if ${math`a \ast b \in S`} for all ${math`a, b \in S`}.`, plain: t`Combining any two members always gives a member. ${N} is closed under addition, but not under subtraction: ${math`${2} - ${3} = -${1}`} is not natural.` },
    { kind: 'narrative', text: t`Closure is a claim about every pair, so one bad pair disproves it: the odd integers are not closed under addition, since ${math`${1} + ${3} = ${4}`}. Proving closure needs an argument for a general pair. Here is one.` },
    { kind: 'theorem', statement: t`${Q} is closed under multiplication, and under division by a non-zero rational.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Name the two rationals`, text: t`Let ${math`x = \frac{a}{b}`} and ${math`y = \frac{c}{d}`} with ${math`a, b, c, d \in \mathbb{Z}`} and ${math`b, d \ne ${0}`}.`, plain: t`Use different letters for the two fractions: they need not share a denominator.` },
        { label: t`Multiply`, text: t`${math`xy = \frac{ac}{bd}`}. Here ${math`ac`} and ${math`bd`} are integers, since ${Z} is closed under multiplication, and ${math`bd \ne ${0}`} because neither factor is ${0}. So ${math`xy \in \mathbb{Q}`}.` },
        { label: t`Divide`, text: t`If ${math`y \ne ${0}`} then ${math`c \ne ${0}`}, and ${math`\frac{x}{y} = \frac{a}{b} \cdot \frac{d}{c} = \frac{ad}{bc}`}, with ${math`bc \ne ${0}`}. So ${math`x/y \in \mathbb{Q}`}.` },
      ],
    },
    { kind: 'p', text: t`Addition works the same way, with a common denominator; proving it is supervision exercise ${math`${1}.${1}.${6}`}, a Cambridge problem for this lesson.` },
    checkFrom(closure, { i: 4 }, t`Sums, differences, and products of even integers are even; but ${math`${2} \div ${4} = ${q(1, 2)}`} is not an integer.`),

    { kind: 'section', title: t`Inverses` },
    { kind: 'definition', name: t`Inverses`, formal: t`In a number system, ${math`y`} is an [[additive-inverse|additive inverse]] of ${math`x`} if ${math`x + y = ${0}`}, and a multiplicative inverse of ${math`x`} if ${math`x \cdot y = ${1}`}.`, plain: t`In ${Z}, the additive inverse of ${5} is ${math`-${5}`}. In ${Q}, the multiplicative inverse of ${math`\frac{${2}}{${3}}`} is ${math`\frac{${3}}{${2}}`}.` },
    { kind: 'theorem', name: t`Inverses in ${N}`, statement: t`In ${N}, only ${0} has an additive inverse and only ${1} has a multiplicative inverse.` },
    { kind: 'p', text: t`Proof: if ${math`x + y = ${0}`} with ${math`x, y \ge ${0}`}, then ${math`x \le x + y = ${0}`}, so ${math`x = ${0}`}. If ${math`xy = ${1}`} with ${math`x, y \in \mathbb{N}`}, neither is ${0}, so both are at least ${1}; if ${math`x \ge ${2}`} then ${math`xy \ge ${2}`}, so ${math`x = ${1}`}. ∎ The notes read the story of ${Z} and ${Q} this way: ${Z} adds every additive inverse, and ${Q} adds a multiplicative inverse for every non-zero number.` },
    checkFrom(inverse, { kind: 'multiplicative', n: -3, d: 4 }, t`${math`-\frac{${3}}{${4}} \times \left(-\frac{${4}}{${3}}\right) = ${1}`}.`),
    { kind: 'p', text: t`The notes also record the cancellation laws: ${math`k + m = k + n`} implies ${math`m = n`}, and, if ${math`k \ne ${0}`}, ${math`k \cdot m = k \cdot n`} implies ${math`m = n`}. The condition matters: ${math`${0} \cdot ${2} = ${0} \cdot ${3}`}, yet ${math`${2} \ne ${3}`}.` },

    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`${0} is not a natural number.`, counterexample: t`In the CST notes, and in this course, ${math`\mathbb{N} = \{${0}, ${1}, ${2}, \ldots\}`}. Book of Proof differs, so always say which convention you use.` },
    { kind: 'pitfall', claim: t`${Q} is closed under division.`, counterexample: t`${math`${1} \div ${0}`} is not defined. ${Q} is closed under division by non-zero rationals only.` },
    { kind: 'pitfall', claim: t`Checking a few pairs proves closure.`, counterexample: t`Under division, ${math`${6} \div ${3}`}, ${math`${8} \div ${2}`}, and ${math`${10} \div ${5}`} are all integers, yet ${math`${1} \div ${2}`} is not. A few pairs can only disprove closure; proving it needs an argument for a general pair.` },
    { kind: 'takeaway', text: t`${math`\mathbb{N} \subseteq \mathbb{Z} \subseteq \mathbb{Q}`}: each adds the inverses the one before lacks, so more equations have solutions and more operations stay inside the system.` },
  ],
  examples: [
    { ...workedCambridge(notes173), examiner: t`The examiner looks for the inverse equations written down and solved in ${N}, with the reason no other number works.` },
    worked(closure, { i: 0 }, t`What ${N} is closed under`),
    worked(which, { kind: 'zero', a: 1, b: 2 }, t`Is ${0} a natural number?`),
  ],
  generators: [closure, which, smallest, inverse],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['natural-number', 'integer', 'rational-number', 'closed', 'additive-inverse'],
  cambridge: withUses([notes174z, notes174q, notes167], {
    'notes-167-cancel': { sections: ['Three number systems', 'Inverses'], note: t`Finding the case a cancellation law must exclude` },
  }),
  // The CST proof of 1.1.6 is set in proof.direct and 2008 STEP I Q1 in proof.contradiction, where the proof
  // writing they need has been taught (Rule 1, 2026-10-08). That leaves the cancellation witness, a single step but not a guess; the
  // three-way choices from the notes are guessable. Exercise 3.2.5 needs the gcd, so it is set in num.euclid-theorem.
  gate: ['notes-167-cancel'],
  recall: [
    { front: t`Define a rational number.`, back: t`A real number equal to ${math`\frac{m}{n}`} for some integers ${math`m, n`} with ${math`n \ne ${0}`}.` },
    { front: t`What does "closed under an operation" mean?`, back: t`Combining any two members of the set always gives a member.` },
    { front: t`Which elements of ${N} have inverses?`, back: t`Only ${0} has an additive inverse, and only ${1} a multiplicative one.` },
  ],
  proofOrder: [{
    title: t`${Q} is closed under multiplication`,
    steps: [
      t`Write ${math`x = \frac{a}{b}`} and ${math`y = \frac{c}{d}`} with integers and ${math`b, d \ne ${0}`}.`,
      t`Then ${math`xy = \frac{ac}{bd}`}.`,
      t`${math`ac`} and ${math`bd`} are integers, and ${math`bd \ne ${0}`}.`,
      t`So ${math`xy`} is rational.`,
    ],
  }],
};
