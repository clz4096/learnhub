/**
 * proof.quantifier-patterns: Proving and using quantified statements: a "for all" goal by
 * an arbitrary element, a "there exists" goal by a witness, and each kind as an
 * assumption; and unique existence. The lesson follows the CST notes on universal and
 * existential quantification and unique existence (printed pages 63 to 103) and the
 * commentary in the 2023-24 official solutions to Exercises 1. The problems are
 * supervision exercises 1.1.4 and 1.1.7 with those solutions, and Book of Proof Chapter 4,
 * exercise 26 and Chapter 7, exercises 12, 17, and 20.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick, upTo } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { math, t, type Rich } from '../rich';
import { worked, workedCambridge, type TopicContent } from '../topic';

const [mx, my, mn] = [math`x`, math`y`, math`n`];
const isPrime = (n: number): boolean => { if (n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };
const big = (v: { num: bigint; den: bigint } | undefined): number | null => (v === undefined || v.den !== 1n ? null : Number(v.num));

// ---------------------------------------------------------------- the first move

type Move = 'arbitrary' | 'witness' | 'instantiate' | 'name';
const MOVES: readonly ChoiceOption[] = [
  { id: 'arbitrary', label: t`Let ${mx} be an arbitrary element, and prove the property for it.` },
  { id: 'witness', label: t`Give one particular value, and prove the property holds for it.` },
  { id: 'instantiate', label: t`Apply it to whatever value the proof needs.` },
  { id: 'name', label: t`Give a name to a value it provides, and use that value's property.` },
];
/** Goals and assumptions with quantifiers: whether it is a goal, and which quantifier. */
const SITUATIONS: readonly { text: Rich; goal: boolean; q: 'all' | 'exists' }[] = [
  { text: t`The goal is "for every integer ${mn}, ${math`n^{${2}} + n`} is even".`, goal: true, q: 'all' },
  { text: t`The goal is "for all real ${mx} and ${my}, ${math`x^{${2}} + y^{${2}} \ge ${2}xy`}".`, goal: true, q: 'all' },
  { text: t`The goal is "there is a positive real ${mx} with ${math`x^{${2}} < x`}".`, goal: true, q: 'exists' },
  { text: t`The goal is "there is a prime number between ${90} and ${100}".`, goal: true, q: 'exists' },
  { text: t`The goal is "there is an integer ${mn} for which ${11} divides ${math`${2}^{n} - ${1}`}".`, goal: true, q: 'exists' },
  { text: t`An assumption says "every element of ${math`A`} is in ${math`B`}", and you know ${math`a \in A`}.`, goal: false, q: 'all' },
  { text: t`An assumption says "${math`d \mid n`} for every ${math`d`} from ${1} to ${10}", and you need ${math`${7} \mid n`}.`, goal: false, q: 'all' },
  { text: t`An assumption says "${math`a \mid b`}", that is, there is an integer ${math`k`} with ${math`b = ka`}.`, goal: false, q: 'exists' },
  { text: t`An assumption says "${mx} is rational", that is, there are integers ${math`p, q`} with ${math`q \ne ${0}`} and ${math`x = p/q`}.`, goal: false, q: 'exists' },
  { text: t`An assumption says "some element of ${math`A`} is negative".`, goal: false, q: 'exists' },
];

const MOVE: Readonly<Record<'goal-all' | 'goal-exists' | 'use-all' | 'use-exists', Move>> = { 'goal-all': 'arbitrary', 'goal-exists': 'witness', 'use-all': 'instantiate', 'use-exists': 'name' };
const moveOf = (sit: (typeof SITUATIONS)[number]): Move => MOVE[`${sit.goal ? 'goal' : 'use'}-${sit.q}`];

interface MoveP { i: number }

const firstMove = generator<MoveP>({
  id: 'first-move',
  skill: 'Choose the first move for a quantified goal or assumption: an arbitrary element, a witness, instantiation, or naming a witness.',
  params: (rng) => ({ i: int(rng, 0, SITUATIONS.length - 1) }),
  sane: ({ i }) => (i >= 0 && i < SITUATIONS.length ? null : 'out of range'),
  problem: ({ i }) => {
    const sit = SITUATIONS[i] as (typeof SITUATIONS)[number];
    const why: Record<Move, Rich> = {
      arbitrary: t`A "for all" goal: take an [[arbitrary-element|arbitrary element]], about which nothing is assumed but its type, and prove the property for it. Since it could have been any element, the property holds for all.`,
      witness: t`A "there exists" goal: exhibit a [[witness|witness]], one particular value, and check that it has the property.`,
      instantiate: t`A "for all" assumption can be used at any value: apply it to the one the proof needs.`,
      name: t`A "there exists" assumption provides some value with the property, but you do not choose it: give it a name and use only its property.`,
    };
    return {
      prompt: t`${sit.text} What is the first move?`,
      answer: { kind: 'choice', options: MOVES, correct: moveOf(sit) },
      solution: [why[moveOf(sit)]],
    };
  },
  solve: ({ i }) => {
    // The CST notes' four strategies, as a decision: a goal or an assumption, then which quantifier.
    const sit = SITUATIONS[i] as (typeof SITUATIONS)[number];
    if (sit.goal) return [sit.q === 'all' ? 'arbitrary' : 'witness'];
    return [sit.q === 'all' ? 'instantiate' : 'name'];
  },
  misconceptions: ({ i }): Misconception[] => {
    const sit = SITUATIONS[i] as (typeof SITUATIONS)[number];
    const all: Record<Move, Rich> = {
      arbitrary: t`An arbitrary element is how to prove a "for all" goal. Here that is not the situation.`,
      witness: t`A single example proves a "there exists" goal, but never a "for all" goal, and an assumption needs no example.`,
      instantiate: t`Applying it to a value you choose is how to use a "for all" assumption, not how to handle this.`,
      name: t`Naming a value the statement provides is how to use a "there exists" assumption; you cannot choose that value.`,
    };
    return (['arbitrary', 'witness', 'instantiate', 'name'] as const).filter((m) => m !== moveOf(sit)).map((m) => ({ response: [m], why: all[m] }));
  },
});

// ---------------------------------------------------------------- a witness for "there exists"

interface DivP { m: number }
const ORDER = (m: number): number => { let k = 1; let p = 2 % m; while (p !== 1) { p = (p * 2) % m; k++; } return k; };

const existsPower = generator<DivP>({
  id: 'exists-power',
  skill: 'Prove "there exists n with m dividing 2^n - 1" by finding a witness, as in Book of Proof Chapter 7, exercise 20.',
  params: (rng) => ({ m: pick(rng, [7, 9, 13, 15, 17, 21, 23, 25, 27]) }),
  sane: ({ m }) => (m % 2 === 1 && m > 5 ? null : 'out of range'),
  problem: ({ m }) => {
    const k = ORDER(m);
    return {
      prompt: t`Prove that there is a positive integer ${mn} for which ${m} divides ${math`${2}^{n} - ${1}`}: give one such ${mn} (at most ${60}).`,
      answer: {
        kind: 'witness', count: 1, names: ['n'], example: String(k),
        check: ([v]) => {
          const n = big(v);
          if (n === null || n < 1 || n > 60) return 'Give a positive integer n, at most 60.';
          let r = 1;
          for (let i = 0; i < n; i++) r = (r * 2) % m;
          return r === 1 ? null : `2 to the ${n}, minus 1, leaves remainder ${(r - 1 + m) % m} on division by ${m}.`;
        },
      },
      solution: [
        t`A "there exists" goal needs one witness. Work out the remainders of ${math`${2}^{n}`} on division by ${m}, doubling each time, until ${1} comes back: it does at ${math`n = ${k}`}.`,
        t`So ${m} divides ${math`${2}^{${k}} - ${1}`}, and ${math`n = ${k}`} is a witness. (Any multiple of ${k} works too.)`,
      ],
    };
  },
  solve: ({ m }) => `n = ${upTo(60).find((n) => (2n ** BigInt(n) - 1n) % BigInt(m) === 0n) as number}`,
  misconceptions: ({ m }): Misconception[] => [
    { response: 'n = 1', why: t`${math`${2}^{${1}} - ${1} = ${1}`}, which ${m} does not divide.` },
    { response: 'n = 2', why: t`${math`${2}^{${2}} - ${1} = ${3}`}, which ${m} does not divide.` },
    { response: `n = ${m}`, why: t`Check it: the remainder of ${math`${2}^{${m}}`} on division by ${m} is not ${1}. Double step by step until the remainder is ${1}.` },
  ],
});

// ---------------------------------------------------------------- unique existence

interface UniqP { p: number; d: number }

const unique = generator<UniqP>({
  id: 'unique-y',
  skill: 'Find the unique y with py/(y + d) = x, for x other than p, as in supervision exercise 1.1.7: solve for y, which gives existence and uniqueness at once.',
  params: (rng) => ({ p: pick(rng, [1, 2, 3, 4]), d: pick(rng, [1, 2, 3, 5]) }),
  sane: ({ p, d }) => (p >= 1 && d >= 1 ? null : 'out of range'),
  problem: ({ p, d }) => {
    const lhs = math`\frac{${p === 1 ? '' : p}y}{y + ${d}}`;
    return {
      prompt: t`For every real number ${math`x \ne ${p}`} there is a unique real number ${my} with ${lhs} ${math`= x`}. Give ${my} in terms of ${mx}.`,
      answer: { kind: 'expression', expected: `${d}x/(${p} - x)`, variables: ['x'] },
      solution: [
        t`${lhs} ${math`= x`} means ${math`${p === 1 ? '' : p}y = x(y + ${d})`}, so ${math`(${p} - x)y = ${d === 1 ? '' : d}x`}.`,
        t`Since ${math`x \ne ${p}`}, divide: ${math`y = \frac{${d === 1 ? '' : d}x}{${p} - x}`}. Every step was an equivalence (and ${math`y \ne -${d}`}, since that would need ${math`-${p * d} = ${0}`}), so this ${my} works and it is the only one: existence and uniqueness together.`,
      ],
    };
  },
  solve: ({ p, d }) => {
    // Fit y = a x/(b - x) from two values of x, solving the equation numerically for y.
    const yAt = (x: number): number => (d * x) / (p - x);
    const ok = [-3, -1, 0.5, 7].every((x) => Math.abs((p * yAt(x)) / (yAt(x) + d) - x) < 1e-9);
    return ok ? `${d} * x / (${p} - x)` : '?';
  },
  misconceptions: ({ p, d }): Misconception[] => [
    { response: `${d}x/(x - ${p})`, why: t`Check the sign: ${math`py = xy + ${d}x`} gives ${math`(${p} - x)y = ${d}x`}.` },
    { response: `${d}x/${p}`, why: t`The ${my} on the right, inside ${math`x(y + ${d})`}, must be collected with the ${my} on the left.` },
    ...(d === 1 ? [] : [{ response: `x/(${p} - x)`, why: t`Multiplying out ${math`x(y + ${d})`} gives ${math`xy + ${d}x`}: keep the ${d}.` }]),
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const sw114 = auto({
  id: 'sw-1-1-4',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.1.4'),
  title: t`A real ${math`z`} between ${mx} and ${my}`,
  prompt: t`Prove: for all real numbers ${mx} and ${my} there is a real number ${math`z`} such that ${math`x + z = y - z`}. Give the witness ${math`z`} in terms of ${mx} and ${my}.`,
  answer: { kind: 'expression', expected: '(y - x)/2', variables: ['x', 'y'] },
  solution: [
    t`Consider arbitrary reals ${mx} and ${my}. Find ${math`z`} from the condition: ${math`x + z = y - z`} means ${math`${2}z = y - x`}, so ${math`z = \frac{y - x}{${2}}`}, a real number.`,
    t`Check: ${math`x + \frac{y - x}{${2}} = \frac{y + x}{${2}} = y - \frac{y - x}{${2}}`}. As the official solution remarks, the written proof gives the witness first and then checks it, though it was found by solving.`,
  ],
  reference: '(y - x)/2',
  verify: () => {
    const r = upTo(9).map((k) => (k - 5) / 2);
    return same('x + z = y - z on a grid', r.every((x) => r.every((y) => Math.abs(x + (y - x) / 2 - (y - (y - x) / 2)) < 1e-12)), true);
  },
  misconceptions: [{ response: 'y - x', why: t`With ${math`z = y - x`}, ${math`x + z = y`} but ${math`y - z = x`}. Both sides move: ${math`${2}z = y - x`}.` }],
  official: { source: cite('cst-dm-sols-2324-1', '1.1.4'), answer: '(y - x)/2', agrees: true },
});

const sw117 = auto({
  id: 'sw-1-1-7',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.1.7'),
  title: t`The unique ${my}`,
  prompt: t`For every real number ${mx}, if ${math`x \ne ${2}`} then there is a unique real number ${my} such that ${math`\frac{${2}y}{y + ${1}} = x`}. Give that ${my} in terms of ${mx}.`,
  answer: { kind: 'expression', expected: 'x/(2 - x)', variables: ['x'] },
  solution: [
    t`${math`\frac{${2}y}{y + ${1}} = x`} gives ${math`${2}y = xy + x`}, so ${math`(${2} - x)y = x`}, and with ${math`x \ne ${2}`}, ${math`y = \frac{x}{${2} - x}`}.`,
    t`Uniqueness, as in the official solution: if ${math`z`} also has ${math`\frac{${2}z}{z + ${1}} = x`}, the same steps give ${math`(${2} - x)z = x`}, so ${math`z = \frac{x}{${2} - x} = y`}.`,
  ],
  reference: 'x/(2 - x)',
  verify: () => same('the equation holds', [-3, -1, 0, 0.5, 1, 3, 7].every((x) => Math.abs((2 * (x / (2 - x))) / (x / (2 - x) + 1) - x) < 1e-9), true),
  misconceptions: [{ response: 'x/(x - 2)', why: t`Check the sign: ${math`${2}y - xy = x`}, so ${math`(${2} - x)y = x`}.` }],
  official: { source: cite('cst-dm-sols-2324-1', '1.1.7'), answer: 'x/(2 - x)', agrees: true },
});

const bop717 = auto({
  id: 'bop-7-17',
  source: cite('bop', 'Chapter 7, exercise 17'),
  title: t`A prime between ${90} and ${100}`,
  prompt: t`Prove: there is a prime number between ${90} and ${100}. Give it.`,
  answer: {
    kind: 'witness', count: 1, names: ['p'], example: '97',
    check: ([v]) => {
      const p = big(v);
      if (p === null || p <= 90 || p >= 100) return 'Give a whole number between 90 and 100.';
      return isPrime(p) ? null : `${p} is not prime.`;
    },
  },
  solution: [t`Check ${91} to ${99}: ${91} is ${math`${7} \times ${13}`}, ${93} is ${math`${3} \times ${31}`}, ${95} and ${99} have factors ${5} and ${9}, and the even ones are out. ${97} has no factor up to ${9}, so it is prime: "simply observe that ${97} is prime", as the solution says.`],
  reference: 'p = 97',
  verify: () => same('the primes between 90 and 100', upTo(99).filter((n) => n > 90 && isPrime(n)).join(), '97'),
  misconceptions: [{ response: 'p = 91', why: t`${math`${91} = ${7} \times ${13}`}.` }],
  official: { source: cite('bop', 'Solutions, Chapter 7, exercise 17'), answer: 'p = 97', agrees: true },
});

const bop712 = auto({
  id: 'bop-7-12',
  source: cite('bop', 'Chapter 7, exercise 12'),
  title: t`A positive ${mx} with ${math`x^{${2}} < x`}`,
  prompt: t`Prove: there exists a positive real number ${mx} for which ${math`x^{${2}} < x`}. Give one.`,
  answer: {
    kind: 'witness', count: 1, names: ['x'], example: '1/2',
    check: ([v]) => {
      if (v === undefined) return 'Give a number.';
      const pos = v.num > 0n;
      // x^2 < x for x = a/b > 0 exactly when a < b.
      return !pos ? 'x must be positive.' : v.num * v.num * v.den < v.num * v.den * v.den ? null : 'Here x squared is not less than x.';
    },
  },
  solution: [t`Any ${mx} strictly between ${0} and ${1} works: ${math`x = \frac{${1}}{${2}}`} gives ${math`x^{${2}} = \frac{${1}}{${4}} < \frac{${1}}{${2}}`}. For ${math`x \ge ${1}`}, ${math`x^{${2}} \ge x`}.`],
  reference: 'x = 1/2',
  verify: () => same('x = 1/2', (1 / 2) ** 2 < 1 / 2, true),
  misconceptions: [{ response: 'x = 2', why: t`${math`${2}^{${2}} = ${4} > ${2}`}. Try a number between ${0} and ${1}.` }],
});

const bop720 = auto({
  id: 'bop-7-20',
  source: cite('bop', 'Chapter 7, exercise 20'),
  title: t`${11} divides ${math`${2}^{n} - ${1}`}`,
  prompt: t`Prove: there exists ${math`n \in \mathbb{N}`} for which ${11} divides ${math`${2}^{n} - ${1}`}. Give one (Book of Proof's ${math`\mathbb{N}`} starts at ${1}).`,
  answer: existsPower.at({ m: 11 }).problem.answer,
  solution: [t`The remainders of ${math`${2}, ${4}, ${8}, ${16}, \ldots`} on division by ${11} are ${math`${2}, ${4}, ${8}, ${5}, ${10}, ${9}, ${7}, ${3}, ${6}, ${1}`}: ${1} at ${math`n = ${ORDER(11)}`}. So ${math`${2}^{${10}} - ${1} = ${1023} = ${11} \times ${93}`}.`],
  reference: `n = ${ORDER(11)}`,
  verify: () => same('2^10 - 1 = 11 × 93', [ORDER(11), (2 ** 10 - 1) / 11].join(), '10,93'),
  misconceptions: [{ response: 'n = 11', why: t`${math`${2}^{${11}} - ${1} = ${2047} = ${23} \times ${89}`}: not a multiple of ${11}.` }],
});

const ODD_N = 37;
const bop426 = auto({
  id: 'bop-4-26',
  source: cite('bop', 'Chapter 4, exercise 26', true),
  title: t`An odd number as a difference of squares`,
  prompt: t`Book of Proof asks to prove that every odd integer is the difference of two squares. For ${ODD_N}, give integers ${math`a`} and ${math`b`} with ${math`a^{${2}} - b^{${2}} = ${ODD_N}`}.`,
  answer: {
    kind: 'witness', count: 2, names: ['a', 'b'], example: `${(ODD_N + 1) / 2}, ${(ODD_N - 1) / 2}`,
    check: ([x, y]) => {
      const a = big(x);
      const b = big(y);
      if (a === null || b === null) return 'Give two integers.';
      return a * a - b * b === ODD_N ? null : `${a} squared minus ${b} squared is ${a * a - b * b}.`;
    },
  },
  solution: [
    t`For an odd ${math`n = ${2}k + ${1}`}, consecutive squares work: ${math`(k + ${1})^{${2}} - k^{${2}} = ${2}k + ${1}`}.`,
    t`${math`${ODD_N} = ${2} \times ${(ODD_N - 1) / 2} + ${1}`}, so ${math`a = ${(ODD_N + 1) / 2}`}, ${math`b = ${(ODD_N - 1) / 2}`}: ${math`${((ODD_N + 1) / 2) ** 2} - ${((ODD_N - 1) / 2) ** 2} = ${ODD_N}`}. That is the witness the general proof uses, for any arbitrary odd ${mn}.`,
  ],
  reference: `a = ${(ODD_N + 1) / 2}, b = ${(ODD_N - 1) / 2}`,
  verify: () => {
    // Every odd n from -99 to 99 is (k + 1)^2 - k^2 with n = 2k + 1.
    const bad = upTo(199).map((i) => i - 100).filter((n) => n % 2 !== 0).find((n) => { const k = (n - 1) / 2; return (k + 1) ** 2 - k ** 2 !== n; });
    return bad === undefined ? null : `n = ${bad}`;
  },
  misconceptions: [{ response: `a = ${ODD_N}, b = 1`, why: t`${math`${ODD_N}^{${2}} - ${1}`} is far more than ${ODD_N}. Try consecutive numbers.` }],
});

const sw117proof = supervision({
  id: 'sw-1-1-7-proof',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.1.7'),
  title: t`Existence and uniqueness`,
  prompt: t`Prove: for every real number ${mx}, if ${math`x \ne ${2}`} then there is a unique real number ${my} such that ${math`\frac{${2}y}{y + ${1}} = x`}. Write the two parts separately: existence (give ${my} and check it) and uniqueness (assume ${math`z`} also works, and show ${math`z = y`}).`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-1', '1.1.7'),
});
const sw114proof = supervision({
  id: 'sw-1-1-4-proof',
  source: cite('cst-dm-sw1', 'Exercises 1, 1.1.4'),
  title: t`Writing an existence proof`,
  prompt: t`Write a full proof that for all real ${mx} and ${my} there is a real ${math`z`} with ${math`x + z = y - z`}. Then explain, as the official solution does, why an existence proof "looks backwards" when written: the witness is stated first, though it was found last.`,
  writeUp: 'explanation',
  official: cite('cst-dm-sols-2324-1', '1.1.4'),
});
const bop426proof = supervision({
  id: 'bop-4-26-proof',
  source: cite('bop', 'Chapter 4, exercise 26'),
  title: t`Every odd integer`,
  prompt: t`Prove that every odd integer is the difference of two squares. Say which variable is arbitrary and which values are witnesses, and why the witnesses may depend on it.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

export const quantifierPatterns: TopicContent = {
  topicId: 'proof.quantifier-patterns',
  goal: t`Prove a "for all" statement with an arbitrary element and a "there exists" statement with a witness, and use each kind of statement as an assumption.`,
  lesson: [
    { kind: 'p', text: t`Quantified statements have their own proof strategies in the CST notes, two for goals and two for assumptions.` },
    { kind: 'rule', text: t`To prove ${math`\forall x \in S.\ P(x)`}: write "let ${mx} be an arbitrary element of ${math`S`}" and prove ${math`P(x)`} using nothing about ${mx} except that it is in ${math`S`}. Because ${mx} was an [[arbitrary-element|arbitrary element]], the proof works for every one.` },
    { kind: 'rule', text: t`To prove ${math`\exists x \in S.\ P(x)`}: give a [[witness|witness]], a particular element ${math`w \in S`}, and prove ${math`P(w)`}. Find it in scratch work; in the written proof, state it first and then check it.` },
    { kind: 'p', text: t`Example (supervision exercise ${1}.${1}.${4}): for all reals ${mx} and ${my} there is a real ${math`z`} with ${math`x + z = y - z`}. Let ${mx} and ${my} be arbitrary. The witness may depend on them: solving gives ${math`z = \frac{y - x}{${2}}`}, and checking it finishes the proof. The official solution notes that the finished proof looks backwards, since the witness found last is written first.` },
    { kind: 'p', text: t`Using them: a "for all" assumption can be applied to any value you like (if every element of ${math`A`} is in ${math`B`}, and ${math`a \in A`}, then ${math`a \in B`}). A "there exists" assumption hands you a value you do not get to choose: name it, "let ${math`k`} be an integer with ${math`b = ka`}", and use only its property.` },
    { kind: 'p', text: t`[[unique-existence|Unique existence]], ${math`\exists!\, x.\ P(x)`}, needs two arguments: existence (a witness) and uniqueness (if ${math`P(y)`} and ${math`P(z)`} then ${math`y = z`}). Solving an equation by steps that can all be reversed often gives both at once.` },
    { kind: 'p', text: t`A single example never proves a "for all" statement, and a counterexample is what disproves one: it is a witness for the negation, ${math`\exists x.\ \lnot P(x)`}.` },
  ],
  examples: [
    workedCambridge(sw114),
    worked(firstMove, { i: 7 }, t`Using "${math`a \mid b`}"`),
    worked(existsPower, { m: 7 }, t`A witness`),
  ],
  generators: [firstMove, existsPower, unique],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['arbitrary-element', 'unique-existence'],
  cambridge: [sw117, bop717, bop712, bop720, bop426, sw117proof, sw114proof, bop426proof],
  gate: ['sw-1-1-7', 'sw-1-1-7-proof', 'sw-1-1-4-proof'],
};
