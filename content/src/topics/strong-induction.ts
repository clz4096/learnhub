/**
 * proof.strong-induction: Strong induction: to prove P(n) for every n from a basis, assume
 * P(k) for every k from the basis up to n, and prove P(n + 1). The lesson follows the CST
 * notes (printed pages 283 to 294: induction from a basis, the derived statement
 * P#(m), the Principle of Strong Induction, and Proposition 96, that every n >= 2 is a
 * prime or a product of primes) and Book of Proof Section 10.2 (the postage example and
 * the tree proposition). The problems are Book of Proof Chapter 10, exercises 25, 32, and
 * 42, the postage example, and supervision exercise 4.3.1 with its 2023-24 solution.
 */
import { auto, cite, same, supervision } from '../cambridge';
import { int, pick, upTo } from '../math';
import { bigOmega, factorise } from '../numbers';
import { generator, type Misconception } from '../problem';
import { computedTex, listOf, math, t, type Span } from '../rich';
import { checkFrom, worked, workedProof, type TopicContent } from '../topic';

const [mn, mk] = [math`n`, math`k`];
const fib = (n: number): number => { let [a, b] = [0, 1]; for (let i = 0; i < n; i++) [a, b] = [b, a + b]; return a; };
/** n written as a product of prime powers, 2^{3} \times 5. */
const factTex = (n: number): Span => computedTex(factorise(n).map(([p, e]) => (e === 1 ? String(p) : `${p}^{${e}}`)).join(' \\times '));

// ---------------------------------------------------------------- postage

const PAIRS: readonly (readonly [number, number])[] = [[3, 5], [3, 7], [4, 5], [3, 8], [5, 6], [4, 7], [5, 7], [3, 10], [4, 9], [5, 8], [3, 11], [2, 5], [2, 7], [2, 9], [5, 9], [4, 11]];
/** The amounts up to `top` that a and b cent stamps cannot make, by trying every number of a-stamps. */
const unmakeable = (a: number, b: number, top: number): number[] => upTo(top).filter((n) => !upTo(Math.floor(n / a) + 1).some((x) => (n - (x - 1) * a) % b === 0));

interface PostP { a: number; b: number }

const postageThreshold = generator<PostP>({
  id: 'postage-threshold',
  skill: 'Find where a strong induction on postage can start: the first amount from which every amount can be made, which needs as many base cases as the smaller stamp\'s value.',
  params: (rng) => { const [a, b] = pick(rng, PAIRS); return { a, b }; },
  sane: ({ a, b }) => (a < b && unmakeable(a, b, a * b).length > 0 ? null : 'out of range'),
  problem: ({ a, b }) => {
    const bad = unmakeable(a, b, a * b);
    const g = bad[bad.length - 1] as number;
    return {
      prompt: t`Postage can be paid exactly with ${a}-cent and ${b}-cent stamps for some amounts but not others. Every amount of ${mn} cents or more can be made. What is the smallest such ${mn}?`,
      answer: { kind: 'exact', expected: String(g + 1) },
      solution: [
        t`The amounts that cannot be made are ${listOf(bad)}; the largest is ${g}.`,
        t`From ${g + 1} on every amount can be made, and strong induction proves it: check the ${a} base cases ${listOf(upTo(a).map((i) => g + i))}, then for ${math`k \ge ${g + a}`} make ${math`k + ${1}`} from ${math`k + ${1} - ${a}`}, which the hypothesis covers, and one more ${a}-cent stamp. So the answer is ${g + 1}.`,
      ],
    };
  },
  solve: ({ a, b }) => {
    // Walk down from a * b until an amount fails.
    let n = a * b;
    while (n > 0 && unmakeable(a, b, n).includes(n) === false) n--;
    return String(n + 1);
  },
  misconceptions: ({ a, b }): Misconception[] => {
    const bad = unmakeable(a, b, a * b);
    const g = bad[bad.length - 1] as number;
    return [
      { response: String(g), why: t`${g} is the largest amount that cannot be made. The question asks for the first amount from which every amount can.` },
      { response: String(a * b), why: t`From ${a * b} on every amount can be made, but it is not the smallest: check the amounts just below it.` },
      { response: String(a + b), why: t`One stamp of each makes ${a + b}, but that does not make every larger amount. List the amounts that fail.` },
    ];
  },
});

// ---------------------------------------------------------------- Proposition 96: a product of primes

interface PrimesP { n: number }
const SMALL = [2, 3, 5, 7, 11, 13];

const primeCount = generator<PrimesP>({
  id: 'prime-count',
  skill: 'Follow the strong induction in Proposition 96: split a composite number into smaller factors until every piece is prime, and count the primes.',
  params: (rng) => {
    for (;;) {
      const k = int(rng, 3, 5);
      const ps = Array.from({ length: k }, () => pick(rng, SMALL));
      const n = ps.reduce((x, y) => x * y, 1);
      // At least two repeats, so the count of different primes is not one less than the count with repetition (the two slips below would agree).
      if (n <= 3000 && ps.length - new Set(ps).size >= 2 && new Set(ps).size >= 2) return { n };
    }
  },
  sane: ({ n }) => (bigOmega(n) - factorise(n).length >= 2 && factorise(n).length >= 2 ? null : 'out of range'),
  problem: ({ n }) => {
    const f = factorise(n);
    const [p] = f[0] as [number, number];
    return {
      prompt: t`The CST notes prove by strong induction that every ${math`n \ge ${2}`} is a prime or a product of primes: a composite ${math`n + ${1}`} is ${math`p \cdot q`} with ${mn} and ${math`q`} smaller, and each factor is a product of primes by the hypothesis. Applied to ${n}, the proof writes it as a product of primes. How many primes are in the product, counted with repetition?`,
      answer: { kind: 'exact', expected: String(bigOmega(n)) },
      solution: [
        t`Split ${n} as ${math`${p} \times ${n / p}`}, and keep splitting each composite piece; the hypothesis applies to every piece because it is smaller. The pieces end as ${math`${n} = ${factTex(n)}`}.`,
        t`Counting each prime as often as it appears: ${math`${computedTex(f.map(([, e]) => e).join(' + '))} = ${bigOmega(n)}`}.`,
      ],
    };
  },
  solve: ({ n }) => {
    // Divide out the smallest factor until 1 is left, counting divisions.
    let m = n;
    let c = 0;
    while (m > 1) { let d = 2; while (m % d !== 0) d++; m /= d; c++; }
    return String(c);
  },
  misconceptions: ({ n }): Misconception[] => [
    { response: String(factorise(n).length), why: t`That counts the different primes. A prime that appears twice is two factors of the product: count it twice.` },
    { response: String(bigOmega(n) - 1), why: t`That is the number of splits. Each split turns one piece into two, so a product of ${math`r`} primes needs ${math`r - ${1}`} splits; the question asks for the primes.` },
  ],
});

// ---------------------------------------------------------------- recurrences from two or three earlier cases

type TileKind = 'binary' | 'tiles12' | 'tiles13';
interface TileP { kind: TileKind; n: number }

/** Counted by listing every string or tiling. */
function countByListing(kind: TileKind, n: number): number {
  if (kind === 'binary') {
    let c = 0;
    for (let s = 0; s < 2 ** n; s++) if ((s & (s >> 1)) === 0) c++;
    return c;
  }
  const sizes = kind === 'tiles12' ? [1, 2] : [1, 3];
  const go = (left: number): number => (left === 0 ? 1 : sizes.filter((s) => s <= left).reduce((a, s) => a + go(left - s), 0));
  return go(n);
}
/** The same by the recurrence the strong induction proves. */
function byRecurrence(kind: TileKind, n: number): number[] {
  const a: number[] = kind === 'binary' ? [1, 2, 3] : kind === 'tiles12' ? [1, 1, 2] : [1, 1, 1];
  for (let i = 3; i <= n; i++) a.push(kind === 'tiles13' ? (a[i - 1] as number) + (a[i - 3] as number) : (a[i - 1] as number) + (a[i - 2] as number));
  return a;
}

const tilings = generator<TileP>({
  id: 'tilings',
  skill: 'Count by a recurrence whose step reaches back two or three cases, the shape of argument strong induction proves, with as many base cases as the step reaches back.',
  params: (rng) => ({ kind: pick(rng, ['binary', 'tiles12', 'tiles13'] as const), n: int(rng, 5, 12) }),
  sane: ({ n }) => (n >= 5 && n <= 12 ? null : 'out of range'),
  problem: ({ kind, n }) => {
    const a = byRecurrence(kind, n);
    const v = a[n] as number;
    const what = kind === 'binary'
      ? t`How many strings of ${n} binary digits (leading zeros allowed) have no two consecutive ${1}s?`
      : t`A strip ${1} by ${n} is tiled with ${1} by ${1} tiles and ${1} by ${kind === 'tiles12' ? 2 : 3} tiles. How many tilings are there?`;
    return {
      prompt: what,
      answer: { kind: 'exact', expected: String(v) },
      solution: [
        kind === 'binary'
          ? t`A good string of length ${mk} ends in ${0} (after any good string of length ${math`k - ${1}`}) or in ${math`${0}${1}`} (after any good string of length ${math`k - ${2}`}). So ${math`a_{k} = a_{k - ${1}} + a_{k - ${2}}`}, with ${math`a_{${1}} = ${2}`}, ${math`a_{${2}} = ${3}`}.`
          : kind === 'tiles12'
            ? t`The last tile is a ${1} by ${1}, after a tiling of length ${math`k - ${1}`}, or a ${1} by ${2}, after one of length ${math`k - ${2}`}. So ${math`a_{k} = a_{k - ${1}} + a_{k - ${2}}`}, with ${math`a_{${1}} = ${1}`}, ${math`a_{${2}} = ${2}`}.`
            : t`The last tile is a ${1} by ${1}, after a tiling of length ${math`k - ${1}`}, or a ${1} by ${3}, after one of length ${math`k - ${3}`}. So ${math`a_{k} = a_{k - ${1}} + a_{k - ${3}}`}, with ${math`a_{${1}} = a_{${2}} = ${1}`}, ${math`a_{${3}} = ${2}`}.`,
        t`The step uses cases further back than ${math`k - ${1}`}, which is why a proof of the count is a strong induction with ${kind === 'tiles13' ? 3 : 2} base cases. The values up to ${mn} are ${listOf(a.slice(1, n + 1))}, so the answer is ${v}.`,
      ],
    };
  },
  solve: ({ kind, n }) => String(countByListing(kind, n)),
  misconceptions: ({ kind, n }): Misconception[] => {
    const a = byRecurrence(kind, n + 1);
    const out: Misconception[] = [
      { response: String(a[n - 1]), why: t`That is the count for length ${n - 1}. Run the recurrence one step further.` },
      { response: String(a[n + 1]), why: t`That is the count for length ${n + 1}. Check the base cases: the first values are ${listOf(a.slice(1, 4))}.` },
    ];
    if (kind === 'binary') out.push({ response: String(2 ** n), why: t`That counts every binary string of length ${n}. Leave out those with two consecutive ${1}s.` });
    return out;
  },
});

// ---------------------------------------------------------------- Cambridge problems

const prop96 = workedProof({
  title: t`Every number from ${2} on is a prime or a product of primes`,
  prompt: t`Proposition ${96} of the CST notes: every positive integer greater than or equal to ${2} is a prime or a product of primes.`,
  steps: [
    t`Let ${math`P(m)`} be: ${math`m`} is a prime or a product of primes. We prove ${math`\forall m \ge ${2} \text{ in } \mathbb{N}.\ P(m)`} by the Principle of Strong Induction from basis ${2}.`,
    t`Base case: ${math`P(${2})`} holds because ${2} is a prime.`,
    t`Inductive step: let ${math`n \ge ${2}`}, and assume the Strong Induction Hypothesis: for all natural numbers ${math`${2} \le k \le n`}, ${mk} is a prime or a product of primes. We prove ${math`P(n + ${1})`} by cases.`,
    t`If ${math`n + ${1}`} is prime, ${math`P(n + ${1})`} holds. Otherwise ${math`n + ${1} = p \cdot q`} with ${math`p`} and ${math`q`} in ${math`[${2}..n]`}. By the hypothesis each of them is a prime or a product of primes, so their product ${math`n + ${1}`} is a product of primes.`,
    t`By the Principle of Strong Induction from basis ${2}, every natural number from ${2} on is a prime or a product of primes. Ordinary induction would not do: ${math`p`} and ${math`q`} are smaller than ${mn}, not equal to it.`,
  ],
  answer: t`Every ${math`m \ge ${2}`} is a prime or a product of primes.`,
  source: cite('cst-dm-notes', 'printed pages 291 to 294, Proposition 96'),
});

const stamps47 = auto({
  id: 'bop-10-2-postage-47',
  source: cite('bop', 'Section 10.2, the postage example'),
  title: t`Forty-seven cents in stamps`,
  prompt: t`Book of Proof proves by strong induction that any postage of ${8} cents or more can be made exactly with ${3}-cent and ${5}-cent stamps. Make ${47} cents: how many ${3}-cent stamps ${math`x`} and ${5}-cent stamps ${math`y`}?`,
  answer: {
    kind: 'witness', count: 2, names: ['x', 'y'], example: 'x = 9, y = 4',
    check: ([x, y]) => {
      if (x === undefined || y === undefined || x.den !== 1n || y.den !== 1n || x.num < 0n || y.num < 0n) return 'Give two whole numbers of stamps, zero or more.';
      const total = 3n * x.num + 5n * y.num;
      return total === 47n ? null : `${x.num} three-cent and ${y.num} five-cent stamps make ${total} cents, not 47.`;
    },
  },
  solution: [
    t`The proof's step adds one ${3}-cent stamp to an amount ${3} cents smaller, so ${47} comes from ${44}, which comes from ${41}, and so on down to a base case: ${math`${47} - ${3} \times ${13} = ${8} = ${3} + ${5}`}. That gives ${14} three-cent stamps and one five-cent stamp.`,
    t`Book of Proof's own example uses nine ${3}-cent and four ${5}-cent stamps: ${math`${9} \times ${3} + ${4} \times ${5} = ${47}`}. Any whole-number answer is right.`,
  ],
  reference: 'x = 14, y = 1',
  verify: () => {
    const sols = upTo(16).map((x) => x - 1).filter((x) => (47 - 3 * x) >= 0 && (47 - 3 * x) % 5 === 0).map((x) => `${x}:${(47 - 3 * x) / 5}`);
    return same('every way to make 47 cents', sols.join(' '), '4:7 9:4 14:1');
  },
  misconceptions: [{ response: 'x = 4, y = 9', why: t`That is ${math`${4} \times ${3} + ${9} \times ${5} = ${57}`}: the numbers are swapped. ${math`x`} counts the ${3}-cent stamps.` }],
  official: { source: cite('bop', 'Section 10.2, the postage example'), answer: 'x = 9, y = 4', agrees: true },
});

const N32 = 6;
const bop1032 = auto({
  id: 'bop-10-32',
  source: cite('bop', 'Chapter 10, exercise 32', true),
  title: t`Binary numbers with no consecutive ${1}s`,
  prompt: t`Book of Proof Chapter ${10}, exercise ${32}: the number of ${mn}-digit binary numbers that have no consecutive ${1}s is the Fibonacci number ${math`F_{n + ${2}}`} (for ${math`n = ${2}`} there are three: ${math`${0}${0}`}, ${math`${0}${1}`}, ${math`${1}${0}`}). How many are there for ${math`n = ${N32}`}?`,
  answer: { kind: 'exact', expected: String(fib(N32 + 2)) },
  solution: [
    t`A good string ends in ${0}, after a good string one shorter, or in ${math`${0}${1}`}, after one two shorter: ${math`a_{n} = a_{n - ${1}} + a_{n - ${2}}`}. The step reaches back two cases, so the proof is a strong induction with two base cases, ${math`a_{${1}} = ${2}`} and ${math`a_{${2}} = ${3}`}.`,
    t`Then ${listOf(byRecurrence('binary', N32).slice(1))}: for ${math`n = ${N32}`} there are ${fib(N32 + 2)}, which is ${math`F_{${N32 + 2}}`}.`,
  ],
  reference: String(fib(N32 + 2)),
  verify: () => same('strings listed by bitmask', countByListing('binary', N32), fib(N32 + 2)),
  misconceptions: [{ response: String(2 ** N32), why: t`That counts every string of ${N32} binary digits, including those with consecutive ${1}s.` }],
  // Exercise 32 is even, so it has no printed solution; the exercise's own statement, F_(n + 2), is the comparison.
  official: { source: cite('bop', 'Chapter 10, exercise 32, the statement'), answer: String(fib(N32 + 2)), agrees: true },
});

const N25 = 10;
const bop1025 = auto({
  id: 'bop-10-25',
  source: cite('bop', 'Chapter 10, exercise 25', true),
  title: t`A Fibonacci sum`,
  prompt: t`With ${math`F_{${1}} = F_{${2}} = ${1}`} and ${math`F_{n} = F_{n - ${1}} + F_{n - ${2}}`}, find ${math`F_{${1}} + F_{${2}} + \cdots + F_{${N25}}`}.`,
  answer: { kind: 'exact', expected: String(fib(N25 + 2) - 1) },
  solution: [
    t`Book of Proof's exercise: ${math`F_{${1}} + \cdots + F_{n} = F_{n + ${2}} - ${1}`}. Its inductive step: ${math`(F_{k + ${2}} - ${1}) + F_{k + ${1}} = F_{k + ${3}} - ${1}`}, by the recurrence.`,
    t`So the sum is ${math`F_{${N25 + 2}} - ${1} = ${fib(N25 + 2)} - ${1} = ${fib(N25 + 2) - 1}`}. Adding the terms ${listOf(upTo(N25).map(fib))} gives the same.`,
  ],
  reference: String(fib(N25 + 2) - 1),
  verify: () => same('the terms added one by one', upTo(N25).map(fib).reduce((a, b) => a + b, 0), fib(N25 + 2) - 1),
  misconceptions: [{ response: String(fib(N25 + 2)), why: t`The sum is one less than ${math`F_{${N25 + 2}}`}: check ${math`n = ${1}`}, where ${math`F_{${1}} = ${1} = F_{${3}} - ${1}`}.` }],
  official: { source: cite('bop', 'Solutions, Chapter 10, exercise 25'), answer: String(fib(N25 + 2) - 1), agrees: true },
});

const N42 = 30;
const bop1042 = auto({
  id: 'bop-10-42-count',
  source: cite('bop', 'Chapter 10, exercise 42', true),
  title: t`Even Fibonacci numbers`,
  prompt: t`Book of Proof Chapter ${10}, exercise ${42}, says that ${math`F_{n}`} is even if and only if ${math`${3} \mid n`}. Using it, how many of ${math`F_{${1}}, F_{${2}}, \ldots, F_{${N42}}`} are even?`,
  answer: { kind: 'exact', expected: String(N42 / 3) },
  solution: [
    t`The parities repeat odd, odd, even: two odds add to an even, then odd plus even is odd, and even plus odd is odd. A strong induction makes this a proof, assuming the pattern for the two previous terms.`,
    t`So ${math`F_{n}`} is even exactly when ${math`n`} is a multiple of ${3}: ${math`n = ${3}, ${6}, \ldots, ${N42}`}, which is ${N42 / 3} numbers.`,
  ],
  reference: String(N42 / 3),
  verify: () => same('even terms among the first thirty', upTo(N42).filter((n) => fib(n) % 2 === 0).length, N42 / 3),
  misconceptions: [{ response: String(N42 / 2), why: t`Half the integers are even, but the Fibonacci numbers follow the pattern odd, odd, even: one in three.` }],
});

const sheet431 = supervision({
  id: 'sheet-4-3-1',
  source: cite('cst-dm-sw1', 'Exercises 4, 4.3.1'),
  title: t`The subtractive algorithm terminates`,
  prompt: t`Recall ${math`\mathrm{gcd}_{${0}}`} from exercise ${math`${3}.${3}.${3}`}: if ${math`m = n`} return ${math`m`}, else recurse on ${math`(\min(m, n), \max(m, n) - \min(m, n))`}. Use the Principle of Induction from basis ${2} to prove: for all natural numbers ${math`\ell \ge ${2}`}, for all positive integers ${math`m, n`}, if ${math`m + n \le \ell`} then ${math`\mathrm{gcd}_{${0}}(m, n)`} terminates. Why does the statement quantify over all ${math`m + n \le \ell`}, not only ${math`m + n = \ell`}?`,
  writeUp: 'proof',
  official: cite('cst-dm-sols-2324-4', '4.3.1'),
});
const treeProof = supervision({
  id: 'bop-10-2-trees',
  source: cite('bop', 'Section 10.2, the proposition that a tree with n vertices has n - 1 edges'),
  title: t`Why the tree proof needs strong induction`,
  prompt: t`Book of Proof proves that a tree with ${mn} vertices has ${math`n - ${1}`} edges by removing an edge, which leaves two smaller trees with ${math`x`} and ${math`y`} vertices, ${math`x + y = k + ${1}`}. Write the proof out, and explain why the hypothesis "every tree with ${mk} vertices has ${math`k - ${1}`} edges" alone would not be enough.`,
  writeUp: 'proof',
});
const bop1042proof = supervision({
  id: 'bop-10-42',
  source: cite('bop', 'Chapter 10, exercise 42'),
  title: t`When a Fibonacci number is even`,
  prompt: t`Prove: the ${mn}th Fibonacci number ${math`F_{n}`} is even if and only if ${math`${3} \mid n`}. Say which earlier cases your inductive step uses, and how many base cases that needs.`,
  writeUp: 'proof',
});

// ---------------------------------------------------------------- lesson

const STAMP = { a: 3, b: 5, from: 8 };
const make = (n: number): [number, number] | null => {
  for (let x = 0; 3 * x <= n; x++) if ((n - 3 * x) % 5 === 0) return [x, (n - 3 * x) / 5];
  return null;
};
const showMake = (n: number): Span => { const [x, y] = make(n) as [number, number]; return math`${n} = ${STAMP.a} \times ${x} + ${STAMP.b} \times ${y}`; };
const POST_CHECK = { a: 3, b: 7 };
const postBad = unmakeable(POST_CHECK.a, POST_CHECK.b, POST_CHECK.a * POST_CHECK.b);
const [mPn1, mell] = [math`P(n + ${1})`, math`\ell`];

export const strongInduction: TopicContent = {
  topicId: 'proof.strong-induction',
  goal: t`Prove a statement for every ${mn} from a basis by strong induction, assuming every earlier case in the inductive step, with as many base cases as the step reaches back.`,
  objective: t`Prove a statement by strong induction, assuming all earlier cases, with enough base cases.`,
  why: t`Factorisation into primes, recursive algorithms and recurrences all lean on earlier cases, not just the last.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`Leaning on an earlier case` },
    { kind: 'hook', text: t`With ${STAMP.a}-cent and ${STAMP.b}-cent stamps, which postages can you pay exactly? ${showMake(8)}, ${showMake(9)}, ${showMake(10)}, ${showMake(11)}. It looks as though every amount from ${STAMP.from} cents on works. How would you prove it?` },
    { kind: 'narrative', text: t`Try ordinary induction: assume ${mn} cents can be made, and make ${math`n + ${1}`}. That is awkward: there is no stamp worth ${1} cent. But one extra ${STAMP.a}-cent stamp turns ${math`n - ${2}`} cents into ${math`n + ${1}`}. So the natural step leans on the case three back, not the case just before.` },
    { kind: 'narrative', text: t`The fix is to let the inductive step assume every earlier case, not only the last one. That sounds like cheating. It is not, and the proof that it is not is short.` },
    { kind: 'section', title: t`The principle` },
    {
      kind: 'theorem',
      name: t`Strong induction`,
      statement: t`Let ${math`\ell \in \mathbb{N}`}. Suppose ${math`P(\ell)`} holds, and for every ${math`n \ge \ell`}, if ${math`P(k)`} holds for all ${mk} with ${math`\ell \le k \le n`}, then ${mPn1} holds. Then ${math`P(m)`} holds for every ${math`m \ge \ell`}.`,
    },
    { kind: 'p', text: t`This is [[strong-induction|strong induction]]. The hypothesis in the step, "${math`P(k)`} for every ${mk} from ${mell} to ${mn}", is the strong induction hypothesis. Some arguments need more than one base case; we come back to that below.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Bundle the earlier cases`, text: t`Let ${math`Q(m)`} be the statement "${math`P(k)`} holds for every ${mk} with ${math`\ell \le k \le m`}". The Cambridge notes call it ${math`P^{\#}(m)`}.`, plain: t`${math`Q(m)`} says all the cases up to ${math`m`} are true at once.` },
        { label: t`Base case`, text: t`${math`Q(\ell)`} is just ${math`P(\ell)`}, which holds.` },
        { label: t`Ordinary step`, text: t`Let ${math`n \ge \ell`} and assume ${math`Q(n)`}. By the hypothesis of the theorem, ${mPn1} holds. Together with ${math`Q(n)`}, that is ${math`Q(n + ${1})`}.` },
        { label: t`Conclude`, text: t`By ordinary induction from basis ${mell}, ${math`Q(m)`} holds for every ${math`m \ge \ell`}, and ${math`Q(m)`} includes ${math`P(m)`}.` },
      ],
    },
    { kind: 'p', text: t`So strong induction is ordinary induction applied to a bigger statement. It proves nothing new; it only makes some proofs easier to write. The model proof in the Cambridge notes is Proposition ${96}, worked below: every number from ${2} on is a prime or a product of primes. A composite ${math`n + ${1}`} splits as ${math`p \cdot q`} with both factors between ${2} and ${mn}, anywhere below, and the hypothesis factorises each. For ${360} the splitting ends at ${factTex(360)}.` },
    { kind: 'section', title: t`Postage, with three base cases` },
    { kind: 'theorem', statement: t`Every whole number ${math`n \ge ${STAMP.from}`} is ${math`${STAMP.a}x + ${STAMP.b}y`} for some ${math`x, y \in \mathbb{N}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Base cases`, text: t`${showMake(8)}, ${showMake(9)}, ${showMake(10)}.`, plain: t`Three base cases, because the step reaches back three.` },
        { label: t`Hypothesis`, text: t`Let ${math`n \ge ${10}`}, and assume every amount from ${STAMP.from} to ${mn} can be made.` },
        { label: t`Reach back`, text: t`Since ${math`n \ge ${10}`}, ${math`n - ${2} \ge ${STAMP.from}`}, so by the hypothesis ${math`n - ${2} = ${STAMP.a}x + ${STAMP.b}y`} for some natural ${math`x, y`}.`, why: { q: t`Why does the step start at ${10}, not ${STAMP.from}?`, a: t`The step uses the case ${math`n - ${2}`}, which must be ${STAMP.from} or more to be covered. That needs ${math`n \ge ${10}`}. The amounts ${9} and ${10} are not reached by the step, which is why they are base cases.` } },
        { label: t`Add a stamp`, text: t`Then ${math`n + ${1} = ${STAMP.a}(x + ${1}) + ${STAMP.b}y`}.` },
        { label: t`Conclude`, text: t`By strong induction from basis ${STAMP.from}, with base cases ${8}, ${9} and ${10}, every amount from ${STAMP.from} cents on can be made.` },
      ],
    },
    { kind: 'p', text: t`The rule: if the step reaches back ${math`r`} places, check ${math`r`} base cases in a row. A Fibonacci-style recurrence ${math`a_{n} = a_{n - ${1}} + a_{n - ${2}}`} reaches back two, so it needs two.` },
    checkFrom(postageThreshold, POST_CHECK, t`With ${POST_CHECK.a} and ${POST_CHECK.b} cents, the amounts that cannot be made are ${listOf(postBad)}. From ${(postBad[postBad.length - 1] as number) + 1} on, three in a row can be made, and adding ${POST_CHECK.a}-cent stamps reaches everything after.`),
    { kind: 'pitfall', claim: t`Every amount from ${STAMP.b} cents on can be made with ${STAMP.a}-cent and ${STAMP.b}-cent stamps: the base case ${showMake(5)} holds, and ${math`n - ${2}`} gives ${math`n + ${1}`} by adding a ${STAMP.a}-cent stamp.`, counterexample: t`${7} cents cannot be made. The step for ${math`n + ${1} = ${7}`} needs the case ${4}, which no base case covers. One base case is not enough when the step reaches back three.` },
    checkFrom(tilings, { kind: 'tiles13', n: 6 }, t`The last tile is a ${1} (leaving length ${5}: ${4} tilings) or a ${3} (leaving length ${3}: ${2} tilings), so ${math`${4} + ${2} = ${6}`}. The step reaches back three, so three base cases start it.`),
    { kind: 'takeaway', text: t`Strong induction assumes every earlier case in the step; it is ordinary induction in disguise, and it needs as many base cases as the step reaches back.` },
  ],
  examples: [
    prop96,
    worked(postageThreshold, { a: 3, b: 5 }, t`Stamps of ${3} and ${5} cents`),
    worked(tilings, { kind: 'tiles12', n: 6 }, t`Tiling a strip of length ${6}`),
  ],
  generators: [postageThreshold, primeCount, tilings],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['strong-induction'],
  cambridge: [stamps47, bop1032, bop1025, bop1042, sheet431, treeProof, bop1042proof],
  // The gcd correctness proof by induction from basis 2 is the one Cambridge-standard problem;
  // the rest are Book of Proof.
  gate: ['sheet-4-3-1'],
  recall: [
    { front: t`State strong induction from basis ${mell}.`, back: t`If ${math`P(\ell)`} holds and, for every ${math`n \ge \ell`}, ${math`P(\ell), \ldots, P(n)`} together imply ${mPn1}, then ${math`P(m)`} holds for every ${math`m \ge \ell`}.` },
    { front: t`Why is strong induction valid?`, back: t`It is ordinary induction on ${math`Q(m)`}: "${math`P(k)`} for every ${mk} from ${mell} to ${math`m`}".` },
    { front: t`How many base cases does a step need?`, back: t`As many as it reaches back: a step from ${math`n - ${2}`} to ${math`n + ${1}`} needs three in a row.` },
  ],
  proofOrder: [
    {
      title: t`Postage from ${STAMP.from} cents`,
      steps: [
        t`Base cases: ${8}, ${9} and ${10} cents can be made.`,
        t`Assume every amount from ${STAMP.from} to ${mn} can be made, with ${math`n \ge ${10}`}.`,
        t`Then ${math`n - ${2}`} can be made.`,
        t`Add one ${STAMP.a}-cent stamp to make ${math`n + ${1}`}.`,
      ],
    },
  ],
};
