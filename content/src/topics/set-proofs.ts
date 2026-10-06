/**
 * proof.set-proofs: proving a in A, A subset of B, and A = B by chasing an arbitrary
 * element through the definitions. The lesson follows Book of Proof, Chapter 8, Sections 8.1
 * to 8.3; the problems are Chapter 8's exercises (1, 2, 8, 10, 13, 19, 26, 28) and CST
 * Discrete Mathematics supervision exercises 5.1.6 (complements and De Morgan) and 5.2.3
 * (four equivalent statements). Identity claims in the generators are decided by brute force
 * over every choice of subsets of a three-element set.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { gcd, int, pick, sample } from '../math';
import { generator, type ChoiceOption, type Misconception } from '../problem';
import { dmath, join, math, t, type Span } from '../rich';
import { workedProof, worked, type TopicContent } from '../topic';

const [mA, mB, mC, mx] = [math`A`, math`B`, math`C`, math`x`];
const lcm = (a: number, b: number): number => (a * b) / gcd(a, b);

// ---------------------------------------------------------------- set identities, checked by brute force

type SetFn = (A: Set<number>, B: Set<number>, C: Set<number>) => Set<number>;
const U = [1, 2, 3];
const S = (xs: Iterable<number>): Set<number> => new Set(xs);
const uni = (X: Set<number>, Y: Set<number>): Set<number> => S([...X, ...Y]);
const cap = (X: Set<number>, Y: Set<number>): Set<number> => S([...X].filter((x) => Y.has(x)));
const minus = (X: Set<number>, Y: Set<number>): Set<number> => S([...X].filter((x) => !Y.has(x)));
const comp = (X: Set<number>): Set<number> => minus(S(U), X);
const subsU: Set<number>[] = U.reduce<number[][]>((acc, x) => [...acc, ...acc.map((s) => [...s, x])], [[]]).map(S);
const eqSet = (X: Set<number>, Y: Set<number>): boolean => X.size === Y.size && [...X].every((x) => Y.has(x));

/** Whether lhs = rhs for every A, B, C among the subsets of {1, 2, 3}, complements taken in {1, 2, 3}. */
function always(lhs: SetFn, rhs: SetFn): boolean {
  for (const A of subsU) for (const B of subsU) for (const C of subsU) if (!eqSet(lhs(A, B, C), rhs(A, B, C))) return false;
  return true;
}

interface Ident { tex: Span; lhs: SetFn; rhs: SetFn }
/** Identities, true and false, with sides as functions so a brute-force check decides each. */
const IDENTS: readonly Ident[] = [
  { tex: math`A \cup (B \cap C) = (A \cup B) \cap (A \cup C)`, lhs: (A, B, C) => uni(A, cap(B, C)), rhs: (A, B, C) => cap(uni(A, B), uni(A, C)) },
  { tex: math`A \cap (B \cup C) = (A \cap B) \cup (A \cap C)`, lhs: (A, B, C) => cap(A, uni(B, C)), rhs: (A, B, C) => uni(cap(A, B), cap(A, C)) },
  { tex: math`A - (B \cup C) = (A - B) \cap (A - C)`, lhs: (A, B, C) => minus(A, uni(B, C)), rhs: (A, B, C) => cap(minus(A, B), minus(A, C)) },
  { tex: math`A - (B \cap C) = (A - B) \cup (A - C)`, lhs: (A, B, C) => minus(A, cap(B, C)), rhs: (A, B, C) => uni(minus(A, B), minus(A, C)) },
  { tex: math`\overline{A \cup B} = \overline{A} \cap \overline{B}`, lhs: (A, B) => comp(uni(A, B)), rhs: (A, B) => cap(comp(A), comp(B)) },
  { tex: math`\overline{A \cap B} = \overline{A} \cup \overline{B}`, lhs: (A, B) => comp(cap(A, B)), rhs: (A, B) => uni(comp(A), comp(B)) },
  { tex: math`(A \cup B) - C = (A - C) \cup (B - C)`, lhs: (A, B, C) => minus(uni(A, B), C), rhs: (A, B, C) => uni(minus(A, C), minus(B, C)) },
  { tex: math`A - (B \cap C) = (A - B) \cap (A - C)`, lhs: (A, B, C) => minus(A, cap(B, C)), rhs: (A, B, C) => cap(minus(A, B), minus(A, C)) },
  { tex: math`A - (B \cup C) = (A - B) \cup (A - C)`, lhs: (A, B, C) => minus(A, uni(B, C)), rhs: (A, B, C) => uni(minus(A, B), minus(A, C)) },
  { tex: math`\overline{A \cup B} = \overline{A} \cup \overline{B}`, lhs: (A, B) => comp(uni(A, B)), rhs: (A, B) => uni(comp(A), comp(B)) },
  { tex: math`A \cup (B \cap C) = (A \cup B) \cap C`, lhs: (A, B, C) => uni(A, cap(B, C)), rhs: (A, B, C) => cap(uni(A, B), C) },
  { tex: math`(A - B) \cup B = A`, lhs: (A, B) => uni(minus(A, B), B), rhs: (A) => A },
  { tex: math`(A \cup B) - B = A - B`, lhs: (A, B) => minus(uni(A, B), B), rhs: (A, B) => minus(A, B) },
  { tex: math`A - (A - B) = A \cap B`, lhs: (A, B) => minus(A, minus(A, B)), rhs: (A, B) => cap(A, B) },
];
const TRUTH: readonly boolean[] = IDENTS.map((i) => always(i.lhs, i.rhs));

// ---------------------------------------------------------------- generators

interface LcmP { b: number; c: number }

const lcmGen = generator<LcmP>({
  id: 'common-multiples',
  skill: 'Describe {bn : n in Z} intersect {cn : n in Z} as the multiples of lcm(b, c), as in Book of Proof 8, exercises 1 and 2.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const b = int(rng, 2, 12);
      const c = int(rng, 2, 12);
      // A shared factor, so the product is not the answer, and neither divides the other.
      if (gcd(b, c) > 1 && b % c !== 0 && c % b !== 0) return { b, c };
    }
  },
  sane: ({ b, c }) => (gcd(b, c) > 1 && b % c !== 0 && c % b !== 0 ? null : 'need a common factor and neither dividing the other'),
  problem: ({ b, c }) => {
    const l = lcm(b, c);
    return {
      prompt: t`Let ${math`X = \{${b}n : n \in \mathbb{Z}\} \cap \{${c}n : n \in \mathbb{Z}\}`}. What is the smallest positive element of ${math`X`}?`,
      answer: { kind: 'exact', expected: String(l) },
      solution: [
        t`${math`x \in X`} means ${math`x`} is a multiple of ${b} and a multiple of ${c}. So we want the smallest positive common multiple.`,
        t`${math`${b} \times ${c} = ${b * c}`} is a common multiple, but not the smallest, as ${b} and ${c} share the factor ${gcd(b, c)}. The least common multiple is ${math`\frac{${b} \times ${c}}{${gcd(b, c)}} = ${l}`}: ${math`${l} = ${b} \times ${l / b} = ${c} \times ${l / c}`}.`,
        t`In fact ${math`X = \{${l}n : n \in \mathbb{Z}\}`}, which is proved by two inclusions.`,
      ],
    };
  },
  solve: ({ b, c }) => {
    let x = 1;
    while (x % b !== 0 || x % c !== 0) x++;
    return String(x);
  },
  misconceptions: ({ b, c }): Misconception[] => [
    { response: String(b * c), why: t`${b * c} is a common multiple, but ${b} and ${c} share the factor ${gcd(b, c)}, so a smaller one exists: ${lcm(b, c)}.` },
    { response: String(gcd(b, c)), why: t`${gcd(b, c)} divides both numbers; it is not a multiple of both. An element of ${math`X`} is a multiple of ${b} and of ${c}.` },
    { response: String(Math.max(b, c)), why: t`${Math.max(b, c)} is a multiple of ${Math.max(b, c)}, but not of ${Math.min(b, c)}.` },
  ],
});

interface IdP { picks: number[] }

const identGen = generator<IdP>({
  id: 'which-identities',
  skill: 'Decide which set identities hold for all sets, by element chasing or a small counterexample.',
  params: (rng) => {
    for (;;) {
      const picks = sample(rng, IDENTS.map((_, i) => i), 4);
      const nTrue = picks.filter((i) => TRUTH[i]).length;
      if (nTrue >= 1 && nTrue <= 3) return { picks };
    }
  },
  sane: ({ picks }) => (picks.length === 4 ? null : 'four identities'),
  problem: ({ picks }) => {
    const labels = picks.map((i) => t`${(IDENTS[i] as Ident).tex}`);
    const options: ChoiceOption[] = labels.map((label, k) => ({ id: `i${picks[k] as number}`, label }));
    return {
      prompt: t`Which of these hold for all sets ${mA}, ${mB}, ${mC} in a universal set? Choose all that do. ${join(labels, '; ')}.`,
      answer: { kind: 'choice', options, correct: picks.filter((i) => TRUTH[i]).map((i) => `i${i}`) },
      solution: [
        t`For each, chase an element: what must be true of ${mx} to be in the left side, and is it the same as for the right side? Where they differ, a small example breaks the identity.`,
        t`The ones that hold: ${picks.filter((i) => TRUTH[i]).length === 0 ? t`none` : join(picks.filter((i) => TRUTH[i]).map((i) => t`${(IDENTS[i] as Ident).tex}`), '; ')}.`,
        t`For a false one, try ${math`A = \{${1}, ${2}, ${3}\}`} with ${mB} and ${mC} small and overlapping: one side then contains an element the other side lacks.`,
      ],
    };
  },
  solve: ({ picks }) => picks.filter((i) => always((IDENTS[i] as Ident).lhs, (IDENTS[i] as Ident).rhs)).map((i) => `i${i}`),
  misconceptions: ({ picks }): Misconception[] => [
    { response: picks.map((i) => `i${i}`), why: t`Not all of them hold. A Venn diagram or a single small example with ${math`A = \{${1}, ${2}, ${3}\}`} breaks each false one.` },
    { response: picks.filter((i) => !TRUTH[i]).map((i) => `i${i}`), why: t`That is the wrong way round: those are exactly the ones that fail. Chase an element through each side.` },
  ],
});

interface StartP { goal: number }
const GOALS: readonly { X: Span; Y: Span }[] = [
  { X: math`A \cap B`, Y: math`A \cup B` },
  { X: math`A - (B \cup C)`, Y: math`(A - B) \cap (A - C)` },
  { X: math`\{${12}n : n \in \mathbb{Z}\}`, Y: math`\{${2}n : n \in \mathbb{Z}\} \cap \{${3}n : n \in \mathbb{Z}\}` },
  { X: math`A \times B`, Y: math`A \times C` },
  { X: math`\overline{A \cup B}`, Y: math`\overline{A} \cap \overline{B}` },
  { X: math`\mathcal{P}(A)`, Y: math`\mathcal{P}(B)` },
  { X: math`(A \cup B) - C`, Y: math`(A - C) \cup (B - C)` },
  { X: math`\{${6}n + ${3} : n \in \mathbb{Z}\}`, Y: math`\{${3}n : n \in \mathbb{Z}\}` },
];

const startGen = generator<StartP>({
  id: 'first-line',
  skill: 'Open a proof that X is a subset of Y correctly: take an arbitrary element of X.',
  quick: true,
  params: (rng) => ({ goal: int(rng, 0, GOALS.length - 1) }),
  sane: ({ goal }) => (goal >= 0 && goal < GOALS.length ? null : 'out of range'),
  problem: ({ goal }) => {
    const { X, Y } = GOALS[goal] as { X: Span; Y: Span };
    const elem = goal === 5 ? math`S` : mx;
    return {
      prompt: t`You want to prove ${math`${X} \subseteq ${Y}`}. Which is the right first line?`,
      answer: {
        kind: 'choice',
        options: [
          { id: 'r', label: t`Suppose ${math`${elem} \in ${X}`}, an arbitrary element.` },
          { id: 'y', label: t`Suppose ${math`${elem} \in ${Y}`}, an arbitrary element.` },
          { id: 'e', label: t`Take a particular element of ${X} and check it is in ${Y}.` },
          { id: 'q', label: t`Suppose ${math`${X} \subseteq ${Y}`}.` },
        ],
        correct: 'r',
      },
      solution: [
        t`${math`${X} \subseteq ${Y}`} means: every element of ${X} is an element of ${Y}. So start with an element of ${X} about which you assume nothing else, and end by showing it is in ${Y}.`,
        t`Because the element was arbitrary, the argument covers every element of ${X}.`,
      ],
    };
  },
  solve: () => ['r'],
  misconceptions: (): Misconception[] => [
    { response: ['y'], why: t`That would prove the reverse inclusion. Start in the set that is claimed to be inside the other.` },
    { response: ['e'], why: t`One element is an example, not a proof. The element must be arbitrary, so the same argument works for every element.` },
    { response: ['q'], why: t`That assumes what you are trying to prove.` },
  ],
});

interface MemP { m: number; b: number; c: number }

const memberGen = generator<MemP>({
  id: 'membership',
  skill: 'Prove or refute a in A for a set given by a property: check the defining condition.',
  params: (rng) => {
    const b = pick(rng, [2, 3, 4, 5, 6]);
    let c = pick(rng, [3, 4, 5, 7, 9]);
    while (c === b) c = pick(rng, [3, 4, 5, 7, 9]);
    const base = lcm(b, c);
    const kind = int(rng, 0, 2);
    const m = kind === 0 ? base * int(rng, 1, 6) : kind === 1 ? c * int(rng, 1, 12) : b * int(rng, 1, 12);
    return { m, b, c };
  },
  sane: ({ m, b, c }) => (m > 0 && b !== c ? null : 'out of range'),
  problem: ({ m, b, c }) => {
    const inB = m % b === 0;
    const inC = m % c === 0;
    const correct = inB && inC ? 'yes' : !inB ? 'nob' : 'noc';
    return {
      prompt: t`Is ${math`${m} \in \{${b}n : n \in \mathbb{Z}\} \cap \{${c}n : n \in \mathbb{Z}\}`}? Choose the right answer with its reason.`,
      answer: {
        kind: 'choice',
        options: [
          { id: 'yes', label: t`Yes: ${m} is a multiple of ${b} and of ${c}.` },
          { id: 'nob', label: t`No: ${m} is not a multiple of ${b}.` },
          { id: 'noc', label: t`No: ${m} is a multiple of ${b} but not of ${c}.` },
        ],
        correct,
      },
      solution: [
        t`To prove ${math`a \in A`}, show ${math`a`} satisfies the condition that defines ${mA}. Here: is ${m} of the form ${math`${b}n`}, and of the form ${math`${c}n`}, for integers ${math`n`}?`,
        inB ? t`${math`${m} = ${b} \times ${m / b}`}, so it is a multiple of ${b}.` : t`${math`${m} \div ${b}`} is not a whole number, so ${m} is not a multiple of ${b}, and it is not in the intersection.`,
        inB ? (inC ? t`${math`${m} = ${c} \times ${m / c}`}, so it is a multiple of ${c} too, and it is in the intersection.` : t`${math`${m} \div ${c}`} is not a whole number, so ${m} is not in ${math`\{${c}n : n \in \mathbb{Z}\}`}, and not in the intersection.`) : t`One failed condition is enough.`,
      ],
    };
  },
  solve: ({ m, b, c }) => {
    const multiples = (k: number) => Array.from({ length: 200 }, (_, i) => k * i);
    const inB = multiples(b).includes(m);
    const inC = multiples(c).includes(m);
    return [inB && inC ? 'yes' : !inB ? 'nob' : 'noc'];
  },
  misconceptions: ({ m, b, c }): Misconception[] => {
    const all = ['yes', 'nob', 'noc'];
    const right = m % b === 0 && m % c === 0 ? 'yes' : m % b !== 0 ? 'nob' : 'noc';
    return all.filter((x) => x !== right).map((x) => ({
      response: [x],
      why: x === 'yes' ? t`Check both conditions: an element of an intersection must be in each set. Divide ${m} by ${b} and by ${c}.` : x === 'nob' ? t`Divide ${m} by ${b}: ${m % b === 0 ? t`it goes exactly, ${math`${m} = ${b} \times ${m / b}`}` : t`it does not go exactly`}.` : t`Divide ${m} by ${c}: ${m % c === 0 ? t`it goes exactly, ${math`${m} = ${c} \times ${m / c}`}` : t`it does not go exactly, so the reason is the other one`}.`,
    }));
  },
});

// ---------------------------------------------------------------- Cambridge problems

const b81 = workedProof({
  title: t`Multiples of ${12}`,
  prompt: t`Book of Proof, Chapter ${8}, exercise ${1}: prove that ${math`\{${12}n : n \in \mathbb{Z}\} \subseteq \{${2}n : n \in \mathbb{Z}\} \cap \{${3}n : n \in \mathbb{Z}\}`}.`,
  steps: [
    t`Suppose ${math`a \in \{${12}n : n \in \mathbb{Z}\}`}. This means ${math`a = ${12}n`} for some ${math`n \in \mathbb{Z}`}.`,
    t`Then ${math`a = ${2}(${6}n)`}, and ${math`${6}n \in \mathbb{Z}`}, so ${math`a \in \{${2}n : n \in \mathbb{Z}\}`}.`,
    t`Also ${math`a = ${3}(${4}n)`}, and ${math`${4}n \in \mathbb{Z}`}, so ${math`a \in \{${3}n : n \in \mathbb{Z}\}`}.`,
    t`Being in both sets, ${math`a`} is in their intersection. As ${math`a`} was an arbitrary element of ${math`\{${12}n : n \in \mathbb{Z}\}`}, the inclusion holds.`,
  ],
  answer: t`The inclusion holds, by chasing an arbitrary multiple of ${12}.`,
  source: cite('bop', 'Chapter 8, exercise 1'),
});

const b819 = auto({
  id: 'b8-19',
  source: cite('bop', 'Chapter 8, exercise 19', true),
  title: t`Powers of ${9} and powers of ${3}`,
  prompt: t`Book of Proof asks you to prove ${math`\{${9}^{n} : n \in \mathbb{Z}\} \subseteq \{${3}^{n} : n \in \mathbb{Z}\}`}, but ${math`\{${9}^{n} : n \in \mathbb{Z}\} \neq \{${3}^{n} : n \in \mathbb{Z}\}`}. The inequality needs a witness: give a number ${mx} in ${math`\{${3}^{n} : n \in \mathbb{Z}\}`} that is not in ${math`\{${9}^{n} : n \in \mathbb{Z}\}`}.`,
  answer: {
    kind: 'witness', count: 1, names: ['x'], example: 'x = 3',
    check: ([v]) => {
      if (v === undefined || v.num <= 0n) return 'Powers of 3 are positive.';
      // x = 3^k exactly when num and den are powers of 3 with one of them 1.
      const pow3 = (z: bigint): number | null => { let k = 0; let w = z; while (w % 3n === 0n) { w /= 3n; k++; } return w === 1n ? k : null; };
      const a = pow3(v.num);
      const b = pow3(v.den);
      if (a === null || b === null || (a > 0 && b > 0)) return 'That is not a power of 3.';
      const k = a - b;
      return k % 2 !== 0 ? null : 'That is a power of 9, since its exponent of 3 is even.';
    },
  },
  solution: [
    t`The inclusion: if ${math`a = ${9}^{n}`}, then ${math`a = (${3}^{${2}})^{n} = ${3}^{${2}n}`}, a power of ${3}.`,
    t`For the inequality take ${math`x = ${3} = ${3}^{${1}}`}. If ${math`${3} = ${9}^{n}`} for an integer ${math`n`}, then ${math`${3}^{${1}} = ${3}^{${2}n}`}, so ${math`${2}n = ${1}`}, impossible for an integer. So ${3} is in the second set and not the first.`,
  ],
  reference: 'x = 3',
  verify: () => same('3 is not a power of 9', [-3, -2, -1, 0, 1, 2, 3].some((n) => 9 ** n === 3), false),
  misconceptions: [
    { response: 'x = 9', why: t`${math`${9} = ${9}^{${1}}`} is in both sets. Look for a power of ${3} with an odd exponent.` },
    { response: 'x = 1', why: t`${math`${1} = ${9}^{${0}}`} is in both sets.` },
  ],
});

const b828 = auto({
  id: 'b8-28',
  source: cite('bop', 'Chapter 8, exercise 28', true),
  title: t`Every integer is ${math`${12}a + ${25}b`}`,
  prompt: t`Book of Proof asks you to prove ${math`\{${12}a + ${25}b : a, b \in \mathbb{Z}\} = \mathbb{Z}`}. The key step: find integers ${math`a`} and ${math`b`} with ${math`${12}a + ${25}b = ${1}`}.`,
  answer: {
    kind: 'witness', count: 2, names: ['a', 'b'], example: 'a = -2, b = 1',
    check: ([a, b]) => (a === undefined || b === undefined || a.den !== 1n || b.den !== 1n ? 'Give two integers.' : 12n * a.num + 25n * b.num === 1n ? null : `12a + 25b is ${12n * a.num + 25n * b.num}, not 1.`),
  },
  solution: [
    t`${math`${25} = ${2} \times ${12} + ${1}`}, so ${math`${1} = ${25} - ${2} \times ${12}`}: take ${math`a = -${2}`}, ${math`b = ${1}`}.`,
    t`Then for any integer ${math`k`}, ${math`k = ${12}(-${2}k) + ${25}(k)`}, so ${math`\mathbb{Z} \subseteq \{${12}a + ${25}b\}`}. The other inclusion holds because ${math`${12}a + ${25}b`} is always an integer.`,
  ],
  reference: 'a = -2, b = 1',
  verify: () => same('12(-2) + 25(1)', 12 * -2 + 25 * 1, 1),
  misconceptions: [{ response: 'a = 2, b = -1', why: t`${math`${12} \times ${2} - ${25} = -${1}`}. Flip both signs to get ${1}.` }],
});

const sup = (id: string, at: string, title: ReturnType<typeof t>, prompt: ReturnType<typeof t>, doc: 'bop' | 'cst-dm-sw1' = 'bop') => supervision({ id, source: cite(doc, at), title, prompt, writeUp: 'proof' });

const b82 = sup('b8-2', 'Chapter 8, exercise 2', t`Multiples of ${6}`, t`Prove that ${math`\{${6}n : n \in \mathbb{Z}\} = \{${2}n : n \in \mathbb{Z}\} \cap \{${3}n : n \in \mathbb{Z}\}`}.`);
const b88 = sup('b8-8', 'Chapter 8, exercise 8', t`Union over intersection`, t`If ${mA}, ${mB} and ${mC} are sets, prove that ${math`A \cup (B \cap C) = (A \cup B) \cap (A \cup C)`}.`);
const b810 = sup('b8-10', 'Chapter 8, exercise 10', t`De Morgan for intersections`, t`If ${mA} and ${mB} are sets in a universal set ${math`U`}, prove that ${math`\overline{A \cap B} = \overline{A} \cup \overline{B}`}.`);
const b826 = sup('b8-26', 'Chapter 8, exercise 26', t`Two descriptions of one set`, t`Prove that ${math`\{${4}k + ${5} : k \in \mathbb{Z}\} = \{${4}k + ${1} : k \in \mathbb{Z}\}`}.`);
const sw516 = sup('sw-5-1-6', 'Exercises 5, 5.1.6', t`Complements and De Morgan`, t`Let ${math`U`} be a set. For all ${math`A, B \in \mathcal{P}(U)`}, prove that: (a) ${math`A^{c} = B \iff (A \cup B = U \wedge A \cap B = \varnothing)`}; (b) ${math`(A^{c})^{c} = A`}; (c) ${math`(A \cup B)^{c} = A^{c} \cap B^{c}`} and ${math`(A \cap B)^{c} = A^{c} \cup B^{c}`}.`, 'cst-dm-sw1');
const sw523 = sup('sw-5-2-3', 'Exercises 5, 5.2.3', t`Four ways to say A is inside B`, t`Let ${math`U`} be a set. For all ${math`A, B \in \mathcal{P}(U)`}, prove that the following are equivalent: (a) ${math`A \cup B = B`}; (b) ${math`A \subseteq B`}; (c) ${math`A \cap B = A`}; (d) ${math`B^{c} \subseteq A^{c}`}.`, 'cst-dm-sw1');

// ---------------------------------------------------------------- lesson

export const setProofs: TopicContent = {
  topicId: 'proof.set-proofs',
  goal: t`Prove ${math`a \in A`}, ${math`A \subseteq B`}, and ${math`A = B`} by chasing an arbitrary element through the definitions.`,
  objective: t`Prove that an element is in a set, that one set is inside another, and that two sets are equal.`,
  why: t`Every set identity in probability and computer science is proved this way, one element at a time.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`Three things to prove` },
    { kind: 'hook', text: t`Is every multiple of ${12} both even and a multiple of ${3}? Of course. But the multiples of ${12} form an infinite set, so you cannot check them one by one. How do you prove a statement about every element of an infinite set in a few lines?` },
    { kind: 'narrative', text: t`The trick is to reason about one element that you know nothing about except that it is in the set. Call it ${math`a`}. Whatever you can prove about ${math`a`} using only that fact is true of every element, because ${math`a`} could have been any of them. This is called [[element-chasing|chasing an element]], and it turns each set statement into a statement about numbers, which you already know how to prove.` },
    {
      kind: 'definition',
      name: t`The three outlines`,
      formal: t`(i) To prove ${math`a \in \{x : P(x)\}`}, show that ${math`P(a)`} holds. (ii) To prove ${math`A \subseteq B`}, suppose ${math`a \in A`} is arbitrary and deduce ${math`a \in B`}. (iii) To prove ${math`A = B`}, prove ${math`A \subseteq B`} and ${math`B \subseteq A`}: a proof by [[double-inclusion|double inclusion]].`,
      plain: t`Membership: check the defining condition. Inclusion: an arbitrary element of the first set lands in the second. Equality: both inclusions. For example ${math`${36} \in \{${12}n : n \in \mathbb{Z}\}`} because ${math`${36} = ${12} \times ${3}`} with ${math`${3} \in \mathbb{Z}`}.`,
    },
    { kind: 'p', text: t`Outline (iii) is the theorem "equality by two inclusions" from the lesson on subsets: two sets are equal exactly when each is a subset of the other.` },
    { kind: 'section', title: t`An inclusion, chased` },
    { kind: 'theorem', statement: t`${math`\{${12}n : n \in \mathbb{Z}\} \subseteq \{${2}n : n \in \mathbb{Z}\} \cap \{${3}n : n \in \mathbb{Z}\}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Take an arbitrary element`, text: t`Suppose ${math`a \in \{${12}n : n \in \mathbb{Z}\}`}. Then ${math`a = ${12}n`} for some integer ${math`n`}.`, plain: t`If ${math`a`} were ${60}, then ${math`n`} would be ${5}.` },
        { label: t`It is even`, text: t`${math`a = ${2}(${6}n)`}, and ${math`${6}n`} is an integer, so ${math`a \in \{${2}n : n \in \mathbb{Z}\}`}.`, why: { q: t`Why is it enough that ${math`${6}n`} is an integer?`, a: t`The set ${math`\{${2}n : n \in \mathbb{Z}\}`} is all numbers of the form two times an integer. ${math`a`} has that form, with the integer ${math`${6}n`}.` } },
        { label: t`It is a multiple of three`, text: t`${math`a = ${3}(${4}n)`}, and ${math`${4}n`} is an integer, so ${math`a \in \{${3}n : n \in \mathbb{Z}\}`}.` },
        { label: t`So it is in the intersection`, text: t`Being in both sets, ${math`a`} is in their intersection. Since ${math`a`} was arbitrary, every element of the left side is in the right side.` },
      ],
    },
    { kind: 'p', text: t`The reverse inclusion is false: ${6} is even and a multiple of ${3} but not a multiple of ${12}. In fact the intersection is exactly ${math`\{${6}n : n \in \mathbb{Z}\}`}, which is Chapter ${8}, exercise ${2}.` },
    { kind: 'section', title: t`An equality, both ways` },
    { kind: 'theorem', name: t`De Morgan for differences`, statement: t`For all sets ${mA}, ${mB}, ${mC}: ${math`A - (B \cup C) = (A - B) \cap (A - C)`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Left inside right`, text: t`Let ${math`x \in A - (B \cup C)`}. Then ${math`x \in A`} and ${math`x \notin B \cup C`}.` },
        { label: t`Unpack "not in the union"`, text: t`${math`x \notin B \cup C`} means ${mx} is in neither ${mB} nor ${mC}: ${math`x \notin B`} and ${math`x \notin C`}.`, why: { q: t`Why does "not in the union" give two facts?`, a: t`${math`x \in B \cup C`} means ${math`x \in B`} or ${math`x \in C`}. Its negation is ${math`x \notin B`} and ${math`x \notin C`}, by De Morgan's law for "or".` } },
        { label: t`Repack`, text: t`So ${math`x \in A - B`} and ${math`x \in A - C`}, that is ${math`x \in (A - B) \cap (A - C)`}.` },
        { label: t`Right inside left`, text: t`Conversely let ${math`x \in (A - B) \cap (A - C)`}. Then ${math`x \in A`}, ${math`x \notin B`}, ${math`x \notin C`}, so ${math`x \notin B \cup C`} and ${math`x \in A - (B \cup C)`}.` },
        { label: t`Conclude`, text: t`Each side is a subset of the other, so they are equal.` },
      ],
    },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`To prove ${math`A \subseteq B`}, check that a typical element, say ${math`${24}`}, of ${mA} is in ${mB}.`, counterexample: t`An example proves nothing about the other elements. ${math`\{${2}n\} \subseteq \{${4}n\}`} is false, yet the example ${24} is in both. The element must be arbitrary.` },
    { kind: 'pitfall', claim: t`Having shown ${math`A \subseteq B`}, you have shown ${math`A = B`}.`, counterexample: t`${math`\{${12}n\} \subseteq \{${6}n\}`}, but ${6} is in the second set and not the first. Equality needs the second inclusion too.` },
    { kind: 'pitfall', claim: t`${math`A - (B \cap C) = (A - B) \cap (A - C)`}, by the same argument as above.`, counterexample: t`Take ${math`A = \{${1}, ${2}, ${3}\}`}, ${math`B = \{${1}, ${2}\}`}, ${math`C = \{${2}, ${3}\}`}. The left side is ${math`\{${1}, ${3}\}`}; the right is ${math`\{${3}\} \cap \{${1}\} = \varnothing`}. Not being in ${math`B \cap C`} means missing ${mB} or missing ${mC}, so the right side should be a union.` },
    { kind: 'takeaway', text: t`To prove a set statement, take an arbitrary element, unpack the definitions into a statement about it, prove that, and repack; for equality, do it both ways.` },
  ],
  examples: [
    b81,
    worked(lcmGen, { b: 6, c: 8 }, t`Common multiples of ${6} and ${8}`),
    worked(memberGen, { m: 30, b: 4, c: 5 }, t`Checking a membership`),
  ],
  generators: [lcmGen, identGen, startGen, memberGen],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['element-chasing', 'double-inclusion'],
  cambridge: [sw516, sw523, b819, b828, b82, b88, b810, b826],
  gate: ['sw-5-1-6', 'sw-5-2-3'],
  recall: [
    { front: t`How do you prove ${math`A \subseteq B`}?`, back: t`Let ${math`a \in A`} be arbitrary; using the definitions, deduce ${math`a \in B`}.` },
    { front: t`How do you prove ${math`A = B`}?`, back: t`Prove ${math`A \subseteq B`} and ${math`B \subseteq A`}.` },
    { front: t`State De Morgan's laws for complements.`, back: t`${math`\overline{A \cup B} = \overline{A} \cap \overline{B}`} and ${math`\overline{A \cap B} = \overline{A} \cup \overline{B}`}.` },
  ],
  proofOrder: [
    {
      title: t`${math`A - (B \cup C) \subseteq (A - B) \cap (A - C)`}`,
      steps: [
        t`Let ${math`x \in A - (B \cup C)`} be arbitrary.`,
        t`Then ${math`x \in A`} and ${math`x \notin B \cup C`}.`,
        t`So ${math`x \notin B`} and ${math`x \notin C`}.`,
        t`Hence ${math`x \in A - B`} and ${math`x \in A - C`}, so ${mx} is in the intersection.`,
      ],
    },
  ],
};

