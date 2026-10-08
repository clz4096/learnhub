/**
 * num.linear-diophantine: integer solutions of ax + by = c. Find one solution by trial or
 * by reduction, then all of them by adding multiples (x0 + bk, y0 - ak); and solve
 * xy + py + qx = r by factorising. Sources: STEP Support Foundation Assignment 3 Q4 (the
 * bananas, 8N = 81m + 65), Assignment 13 warm down (coins and notes, 4p + 5q = 54), and
 * Assignment 19 Q2(v). Every solution set is found by brute-force search.
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { gcd, int, pick, q } from '../math';
import { generator, type Misconception } from '../problem';
import { listOf, math, t } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';
import { named, namedAnswer, setAnswer, withExaminer } from '../prep-a';

const mod = (n: number, d: number): number => ((n % d) + d) % d;

// ---------------------------------------------------------------- one solution

interface OneP { a: number; b: number; c: number }
/** The smallest positive N with aN - c a multiple of b, by trial. */
const smallestN = ({ a, b, c }: OneP): number => { for (let N = 1; ; N++) if (mod(a * N - c, b) === 0) return N; };

const oneSolution = generator<OneP>({
  id: 'one-solution',
  skill: 'Find the smallest positive solution of aN = bm + c in integers, by testing N = 1, 2, 3, and so on.',
  params: (rng) => {
    for (;;) {
      const p: OneP = { a: pick(rng, [3, 4, 5, 7, 8, 9]), b: pick(rng, [5, 7, 9, 11, 13]), c: int(rng, 1, 30) };
      if (gcd(p.a, p.b) !== 1 || p.c % p.b === 0) continue;
      const n = smallestN(p);
      const neg = smallestN({ ...p, c: -p.c });
      if (n >= 2 && neg !== n) return p;
    }
  },
  sane: ({ a, b }) => (gcd(a, b) === 1 ? null : 'not coprime'),
  problem: (p) => {
    const N = smallestN(p);
    const m = (p.a * N - p.c) / p.b;
    return {
      prompt: t`Find the smallest positive integer ${math`N`} for which ${math`${p.a}N = ${p.b}m + ${p.c}`} for some integer ${math`m`}.`,
      answer: { kind: 'exact', expected: String(N) },
      solution: [
        t`We need ${math`${p.a}N - ${p.c}`} to be a multiple of ${p.b}. Try ${math`N = ${1}, ${2}, \ldots`}: the values of ${math`${p.a}N - ${p.c}`} are ${listOf(Array.from({ length: N }, (_, i) => p.a * (i + 1) - p.c))}.`,
        t`The first multiple of ${p.b} is at ${math`N = ${N}`}: ${math`${p.a} \times ${N} = ${p.b} \times ${m} + ${p.c}`}. You need at most ${p.b} tries, since the remainders of ${math`${p.a}N`} repeat every ${p.b} steps.`,
      ],
    };
  },
  solve: (p) => {
    // Search m instead: the smallest positive N = (bm + c)/a that is a whole number.
    let best = Infinity;
    for (let m = -50; m <= 200; m++) { const top = p.b * m + p.c; if (top > 0 && top % p.a === 0) best = Math.min(best, top / p.a); }
    return String(best);
  },
  misconceptions: (p): Misconception[] => {
    const N = smallestN(p);
    return [
      { response: String(N + p.b), why: t`That works, but it is not the smallest: subtracting ${p.b} from ${math`N`} changes ${math`${p.a}N`} by a multiple of ${p.b}, so ${N} works too.` },
      { response: String(smallestN({ ...p, c: -p.c })), why: t`Check the sign: ${math`${p.a}N - ${p.c}`} must be a multiple of ${p.b}, not ${math`${p.a}N + ${p.c}`}.` },
    ];
  },
});

// ---------------------------------------------------------------- the next solution

interface NextP { a: number; b: number; x0: number; y0: number }
const nextSol = ({ a, b, x0, y0 }: NextP): [number, number] => [x0 + b, y0 - a];

const nextSolution = generator<NextP>({
  id: 'next-solution',
  skill: 'From one solution of ax + by = c, get the next by adding b to x and subtracting a from y.',
  quick: true,
  params: (rng) => {
    for (;;) {
      const p: NextP = { a: int(rng, 2, 9), b: int(rng, 2, 9), x0: int(rng, -5, 8), y0: int(rng, -5, 12) };
      if (gcd(p.a, p.b) === 1 && p.a !== p.b) return p;
    }
  },
  sane: ({ a, b }) => (gcd(a, b) === 1 ? null : 'not coprime'),
  problem: (p) => {
    const c = p.a * p.x0 + p.b * p.y0;
    const [x1, y1] = nextSol(p);
    return {
      prompt: t`${math`x = ${p.x0}`}, ${math`y = ${p.y0}`} is a solution of ${math`${p.a}x + ${p.b}y = ${c}`}. Find the integer solution with the smallest ${math`x`} greater than ${p.x0}.`,
      answer: namedAnswer(['x', 'y'], [q(x1), q(y1)], 'Increase x by the coefficient of y, and decrease y by the coefficient of x.'),
      solution: [
        t`For any integer solution, subtract: ${math`${p.a}(x - ${p.x0}) = ${p.b}(${p.y0} - y)`}. So ${p.b} divides ${math`${p.a}(x - ${p.x0})`}, and since ${p.a} and ${p.b} have no common factor, ${p.b} divides ${math`x - ${p.x0}`}.`,
        t`So the next ${math`x`} is ${math`${p.x0} + ${p.b} = ${x1}`}, and then ${math`y = ${p.y0} - ${p.a} = ${y1}`}. Check: ${math`${p.a} \times ${x1} + ${p.b} \times (${y1}) = ${c}`}.`,
      ],
    };
  },
  solve: (p) => {
    const c = p.a * p.x0 + p.b * p.y0;
    for (let x = p.x0 + 1; ; x++) if ((c - p.a * x) % p.b === 0) return named(['x', 'y'], [q(x), q((c - p.a * x) / p.b)]);
  },
  misconceptions: (p): Misconception[] => [
    { response: named(['x', 'y'], [q(p.x0 + p.a), q(p.y0 - p.b)]), why: t`Swapped: ${math`x`} moves by the coefficient of ${math`y`}, ${p.b}, and ${math`y`} by the coefficient of ${math`x`}, ${p.a}, so the two changes cancel: ${math`${p.a} \times ${p.b} - ${p.b} \times ${p.a} = ${0}`}.` },
    { response: named(['x', 'y'], [q(p.x0 + p.b), q(p.y0 + p.a)]), why: t`When ${math`x`} goes up, ${math`y`} must go down to keep the total the same: subtract ${p.a} from ${math`y`}.` },
  ],
});

// ---------------------------------------------------------------- factorising

interface FacP { s: number; u: number; n: number }
/** (x + s)(y + u) = n in positive integers: count them by brute force. */
const facSolutions = ({ s, u, n }: FacP): [number, number][] => {
  const out: [number, number][] = [];
  for (let x = 1; x <= n; x++) for (let y = 1; y <= n; y++) if ((x + s) * (y + u) === n) out.push([x, y]);
  return out;
};
const divisorCount = (n: number): number => Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0).length;

const factorPairs = generator<FacP>({
  id: 'factor-pairs',
  skill: 'Solve xy + uy + sx = r in positive integers by factorising as (x + s)(y + u) = n and listing factor pairs.',
  params: (rng) => {
    for (;;) {
      const p: FacP = { s: int(rng, 1, 4), u: int(rng, 1, 5), n: pick(rng, [24, 30, 36, 40, 42, 48, 60, 72, 84, 90]) };
      if (p.s === p.u) continue;
      const k = facSolutions(p).length;
      if (k >= 1 && k !== divisorCount(p.n) && k !== divisorCount(p.n) - 2) return p;
    }
  },
  sane: (p) => (facSolutions(p).length >= 1 ? null : 'no solutions'),
  problem: (p) => {
    const r = p.n - p.s * p.u;
    const sols = facSolutions(p);
    return {
      prompt: t`How many pairs of positive integers ${math`(x, y)`} satisfy ${math`xy + ${p.s === 1 ? '' : p.s}y + ${p.u === 1 ? '' : p.u}x = ${r}`}?`,
      answer: { kind: 'exact', expected: String(sols.length) },
      solution: [
        t`${math`(x + ${p.s})(y + ${p.u}) = xy + ${p.s}y + ${p.u}x + ${p.s * p.u}`}, so the equation is ${math`(x + ${p.s})(y + ${p.u}) = ${r} + ${p.s * p.u} = ${p.n}`}.`,
        t`${math`x + ${p.s}`} must be a factor of ${p.n} that is at least ${p.s + 1}, with the other factor ${math`y + ${p.u}`} at least ${p.u + 1}, since ${math`x, y \ge ${1}`}.`,
        t`The pairs that fit give ${math`(x, y) = `}${sols.map(([x, y], i) => t`${i === 0 ? '' : ', '}${math`(${x}, ${y})`}`).flat()}: ${sols.length} solutions.`,
      ],
    };
  },
  solve: (p) => String(facSolutions(p).length),
  misconceptions: (p): Misconception[] => [
    { response: String(divisorCount(p.n)), why: t`Not every factor pair works: ${math`x`} and ${math`y`} must be positive, so ${math`x + ${p.s} \ge ${p.s + 1}`} and ${math`y + ${p.u} \ge ${p.u + 1}`}.` },
    { response: String(divisorCount(p.n) - 2), why: t`Leaving out only ${math`${1} \times ${p.n}`} and ${math`${p.n} \times ${1}`} is not enough: check each factor pair against ${math`x + ${p.s} \ge ${p.s + 1}`} and ${math`y + ${p.u} \ge ${p.u + 1}`}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const bananasN = auto({
  id: 'a3-q4-iii',
  source: cite('step-f03', 'Q4(iii)'),
  title: t`A positive number of bananas`,
  prompt: t`The bananas satisfy ${math`${8}N = ${81}m + ${65}`}, where ${math`N`} and ${math`m`} are integers. Show that ${math`N = -${2}`} is a solution, and find the smallest positive ${math`N`}.`,
  answer: { kind: 'exact', expected: '79' },
  solution: [
    t`${math`N = -${2}`}: ${math`${8} \times (-${2}) = -${16} = ${81} \times (-${1}) + ${65}`}, so ${math`m = -${1}`} works.`,
    t`If ${math`N`} is a solution, so is ${math`N + ${81}`}: ${math`${8}(N + ${81}) = ${81}m + ${65} + ${8} \times ${81} = ${81}(m + ${8}) + ${65}`}.`,
    t`So ${math`N = -${2} + ${81} = ${79}`} works, with ${math`m = ${7}`}. Every solution is ${math`N = ${81}k - ${2}`}: if ${math`N`} and ${math`-${2}`} both work, ${math`${8}(N + ${2})`} is a multiple of ${81}, and ${8} and ${81} share no factor, so ${81} divides ${math`N + ${2}`}. The smallest positive one is ${79}.`,
  ],
  reference: '79',
  verify: () => {
    const sols: number[] = [];
    for (let N = -100; N <= 200; N++) if (mod(8 * N - 65, 81) === 0) sols.push(N);
    return same('solutions from -100 to 200', sols.join(','), '-83,-2,79,160');
  },
  misconceptions: [{ response: '160', why: t`${160} works, but ${math`${160} - ${81} = ${79}`} works too, and it is smaller.` }],
});

const coins = auto({
  id: 'a13-wd',
  source: cite('step-f13', 'Warm down (d)', true),
  title: t`Coins and notes`,
  prompt: t`I have ${math`n`} one-pound coins, ${math`p`} five-pound notes, and ${math`q`} ten-pound notes (at least one of each). The total would be unchanged if instead I had ${math`p`} coins, ${math`q`} five-pound notes, and ${math`n`} ten-pound notes. With ${math`n = ${6}`}, find every possible value of ${math`p`}.`,
  answer: setAnswer([q(1), q(6), q(11)], 'Write the condition as 4p + 5q = 54 and step along the solutions.'),
  solution: [
    t`${math`n + ${5}p + ${10}q = p + ${5}q + ${10}n`}, so ${math`${4}p + ${5}q = ${9}n = ${54}`}.`,
    t`${math`p = q = ${6}`} is a solution. If ${math`(p, q)`} is one, so is ${math`(p + ${5}k, q - ${4}k)`}: the changes ${math`${20}k - ${20}k`} cancel. Every solution has this form, since ${5} must divide ${math`${4}(p - ${6})`} and so ${math`p - ${6}`}.`,
    t`Keeping ${math`p`} and ${math`q`} positive: ${math`k = -${1}, ${0}, ${1}`}, giving ${math`(p, q) = (${1}, ${10}), (${6}, ${6}), (${11}, ${2})`}. So ${math`p = ${1}, ${6}, ${11}`}.`,
    t`Find one solution, then step along the family while every variable stays in range.`,
  ],
  reference: '1, 6, 11',
  verify: () => {
    const ps: number[] = [];
    for (let p = 1; p <= 54; p++) for (let qq = 1; qq <= 54; qq++) if (6 + 5 * p + 10 * qq === p + 5 * qq + 60) ps.push(p);
    return same('values of p', ps.join(','), '1,6,11');
  },
  misconceptions: [{ response: '6, 11, 16', why: t`${math`p = ${16}`} needs ${math`q = -${2}`}, but there must be at least one of each note. Go the other way too: ${math`(${6} - ${5}, ${6} + ${4}) = (${1}, ${10})`}.` }],
  official: { source: cite('step-f13-hints', 'Warm down (d)'), answer: '1, 6, 11', agrees: true },
  nudge: t`Not quite. Equating the two totals gives one linear equation in ${math`p`} and ${math`q`}; then step along its solutions.`,
  hints: [
    t`What equation says that the two totals are equal?`,
    t`With ${math`n = ${6}`}, what does it become, and what is one solution in positive integers?`,
    t`From one solution ${math`(p, q)`}, what change to ${math`p`} and ${math`q`} keeps the equation true, and for how many steps do both stay positive?`,
  ],
});

const a19q2v = auto({
  id: 'a19-q2-v',
  source: cite('step-f19', 'Q2(v)'),
  title: t`A product equal to ${60}`,
  prompt: t`Show that ${math`xy + ${2}y + ${3}x - ${54} = ${0}`} can be written as ${math`(x + ${2})(y + ${3}) = ${60}`}. Given that ${math`x`} and ${math`y`} are both positive integers, find every possible value of ${math`x`}.`,
  answer: setAnswer([1, 2, 3, 4, 8, 10, 13].map((x) => q(x)), 'List the factor pairs of 60 with the first factor at least 3 and the second at least 4.'),
  solution: [
    t`${math`(x + ${2})(y + ${3}) = xy + ${3}x + ${2}y + ${6}`}, and ${math`xy + ${2}y + ${3}x = ${54}`}, so the product is ${math`${54} + ${6} = ${60}`}.`,
    t`${math`x \ge ${1}`} and ${math`y \ge ${1}`}, so ${math`x + ${2} \ge ${3}`} and ${math`y + ${3} \ge ${4}`}. The factor pairs of ${60} that fit: ${math`${3} \times ${20}`}, ${math`${4} \times ${15}`}, ${math`${5} \times ${12}`}, ${math`${6} \times ${10}`}, ${math`${10} \times ${6}`}, ${math`${12} \times ${5}`}, ${math`${15} \times ${4}`}.`,
    t`So ${math`(x, y) = (${1}, ${17}), (${2}, ${12}), (${3}, ${9}), (${4}, ${7}), (${8}, ${3}), (${10}, ${2}), (${13}, ${1})`}.`,
    t`Factorise, then let the bounds on each factor prune the factor pairs.`,
  ],
  reference: '1, 2, 3, 4, 8, 10, 13',
  verify: () => same('x values', facSolutions({ s: 2, u: 3, n: 60 }).map(([x]) => x).join(','), '1,2,3,4,8,10,13'),
  misconceptions: [{ response: '1, 2, 3, 4, 8, 10, 18', why: t`${13} is missing, from ${math`${15} \times ${4}`}, and ${math`x = ${18}`} needs ${math`y + ${3} = ${3}`}, so ${math`y = ${0}`}, which is not positive.` }],
  official: { source: cite('step-f19-hints', 'Q2(v)'), answer: '1, 2, 3, 4, 8, 10, 13', agrees: true },
  nudge: t`Not quite. Once the product is fixed, the positivity of ${math`x`} and ${math`y`} bounds each factor; list the factor pairs that fit.`,
  hints: [
    t`What does ${math`(x + ${2})(y + ${3})`} expand to?`,
    t`Since ${math`x`} and ${math`y`} are positive integers, how small can ${math`x + ${2}`} and ${math`y + ${3}`} be?`,
    t`Which factor pairs of ${60} respect both bounds?`,
  ],
});

const bananasProof = supervision({
  id: 'a3-q4',
  source: cite('step-f03', 'Q4(ii), (iii)'),
  title: t`Every solution of the banana equation`,
  prompt: t`The integers ${math`N`} and ${math`m`} satisfy ${math`${8}N = ${81}m + ${65}`}. (ii) Show that if ${math`N`} satisfies this for some integer ${math`m`}, then ${math`N + ${81}`} also satisfies it (for a different value of ${math`m`}). (iii) Show that ${math`N = -${2}`} is a solution, and find a solution for a positive number of bananas. Then find a general formula for the integers ${math`N`} and ${math`m`} that satisfy the equation, and show that there are no others.`,
  writeUp: 'proof',
  official: cite('step-f03-hints', 'Q4'),
  hints: [
    t`What does replacing ${math`N`} by ${math`N + ${81}`} do to ${math`${8}N`}, and which ${math`m`} then works?`,
    t`What is ${math`m`} when ${math`N = -${2}`}, and how many steps of ${81} reach a positive ${math`N`}?`,
    t`If ${math`(N, m)`} and ${math`(N', m')`} are both solutions, why must ${81} divide ${math`${8}(N - N')`}, and what does that force on ${math`N - N'`}?`,
  ],
});

// ---------------------------------------------------------------- lesson

export const linearDiophantine: TopicContent = {
  topicId: 'num.linear-diophantine',
  goal: t`Find one integer solution of ${math`ax + by = c`} by trial or reduction, then every solution by adding multiples, as in ${math`${8}N = ${81}m + ${65}`}.`,
  objective: t`Find all integer solutions of ${math`ax + by = c`} from one solution.`,
  why: t`STEP puzzles about coins, bananas, and weights all end in an equation like this.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`The idea` },
    { kind: 'hook', text: t`Counting puzzles, like STEP's castaways sharing bananas, end in equations such as ${math`${7}N = ${60}m + ${4}`}, where ${math`N`} and ${math`m`} must be whole numbers. Strangely, ${math`N = -${8}`} works: minus eight bananas. From that one silly answer you can find every sensible one.` },
    { kind: 'narrative', text: t`An equation like ${math`${3}x + ${5}y = ${46}`} has infinitely many real solutions: a whole line of them. Asking for whole-number solutions picks out the points of that line where both coordinates are integers, evenly spaced along it. Find one, and the spacing gives the rest.` },
    { kind: 'section', title: t`One solution, then all of them` },
    {
      kind: 'definition',
      name: t`Linear Diophantine equation`,
      formal: t`A [[diophantine-equation|linear Diophantine equation]] is an equation ${math`ax + by = c`} with ${math`a, b, c \in \mathbb{Z}`}, to be solved with ${math`x, y \in \mathbb{Z}`}. A [[particular-solution|particular solution]] is any one pair ${math`(x_{${0}}, y_{${0}})`} of integers that satisfies it.`,
      plain: t`Whole-number solutions only. For ${math`${3}x + ${5}y = ${46}`}, the pair ${math`(${2}, ${8})`} is a particular solution, since ${math`${6} + ${40} = ${46}`}, and ${math`(${7}, ${5})`} is another.`,
    },
    { kind: 'theorem', name: t`All solutions from one`, statement: t`Let ${math`a`} and ${math`b`} be non-zero integers with no common factor greater than ${1}, and let ${math`(x_{${0}}, y_{${0}})`} be an integer solution of ${math`ax + by = c`}. Then the integer solutions are exactly ${math`x = x_{${0}} + bk`}, ${math`y = y_{${0}} - ak`} for ${math`k \in \mathbb{Z}`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`These are solutions`, text: t`${math`a(x_{${0}} + bk) + b(y_{${0}} - ak) = ax_{${0}} + by_{${0}} + abk - abk = c`}.`, plain: t`The two changes cancel.` },
        { label: t`Take any solution`, text: t`If ${math`ax + by = c`}, subtract ${math`ax_{${0}} + by_{${0}} = c`}: ${math`a(x - x_{${0}}) = b(y_{${0}} - y)`}.` },
        { label: t`${math`b`} divides ${math`x - x_{${0}}`}`, text: t`So ${math`b`} divides ${math`a(x - x_{${0}})`}. As ${math`a`} and ${math`b`} share no prime factor, every prime power in ${math`b`} must divide ${math`x - x_{${0}}`}, so ${math`b \mid x - x_{${0}}`}: ${math`x = x_{${0}} + bk`}.`, why: { q: t`Why can't the factors of ${math`b`} hide in ${math`a`}?`, a: t`By unique prime factorisation, the primes of ${math`a(x - x_{${0}})`} are those of ${math`a`} together with those of ${math`x - x_{${0}}`}. None of ${math`b`}'s primes is in ${math`a`}, so all of them, with their powers, are in ${math`x - x_{${0}}`}.` } },
        { label: t`Then y`, text: t`Put it back: ${math`abk = b(y_{${0}} - y)`}, and dividing by ${math`b \ne ${0}`} gives ${math`y = y_{${0}} - ak`}.` },
      ],
    },
    checkFrom(nextSolution, { a: 3, b: 5, x0: 2, y0: 8 }, t`Add ${5} to ${math`x`} and take ${3} from ${math`y`}: ${math`${3} \times ${7} + ${5} \times ${5} = ${46}`}.`),
    { kind: 'pitfall', claim: t`From one solution of ${math`${3}x + ${5}y = ${46}`}, the next is ${math`(x + ${3}, y - ${5})`}.`, counterexample: t`From ${math`(${2}, ${8})`} that gives ${math`(${5}, ${3})`}, and ${math`${15} + ${15} = ${30}`}, not ${46}. Each variable moves by the other's coefficient: ${math`(x + ${5}, y - ${3})`}, here ${math`(${7}, ${5})`}.` },
    { kind: 'section', title: t`Finding the first solution` },
    { kind: 'narrative', text: t`For a small coefficient, just try values. To solve ${math`${7}N = ${60}m + ${4}`}, you need ${math`${7}N - ${4}`} to be a multiple of ${60}. Rather than test ${math`N = ${1}, ${2}, \ldots`}, notice that ${math`${7} \times ${8} = ${56} = ${60} - ${4}`}, so ${math`N = -${8}`} gives ${math`-${56} - ${4} = -${60}`}, a multiple of ${60}, with ${math`m = -${1}`}. Rewrite the equation as ${math`${7}N + (-${60})m = ${4}`}: the coefficients ${7} and ${math`-${60}`} share no factor bigger than ${1}, so the theorem gives every solution: ${math`N = -${8} + (-${60})k`}, which as ${math`k`} runs through all integers is the same list as ${math`N = -${8} + ${60}k`}. The first positive one is ${52}, and indeed ${math`${7} \times ${52} = ${364} = ${60} \times ${6} + ${4}`}.` },
    checkFrom(oneSolution, { a: 3, b: 7, c: 5 }, t`${math`${3}N - ${5}`} for ${math`N = ${1}, ${2}, ${3}, ${4}`} is ${math`-${2}, ${1}, ${4}, ${7}`}: the first multiple of ${7} is at ${math`N = ${4}`}.`),
    { kind: 'section', title: t`Factorising instead` },
    { kind: 'narrative', text: t`Some integer equations are not linear but factorise. ${math`xy + ${3}y + ${2}x = ${30}`} becomes ${math`(x + ${3})(y + ${2}) = ${36}`} after adding ${6} to both sides, because ${math`(x + ${3})(y + ${2}) = xy + ${3}y + ${2}x + ${6}`}. Now ${math`x + ${3}`} must be a factor of ${36}, and there are only finitely many: list the factor pairs, keeping those that make ${math`x`} and ${math`y`} positive.` },
    { kind: 'pitfall', claim: t`Each factor pair of ${36} gives a positive solution of ${math`(x + ${3})(y + ${2}) = ${36}`}.`, counterexample: t`The pair ${math`${3} \times ${12}`} gives ${math`x = ${0}`}, and ${math`${18} \times ${2}`} gives ${math`y = ${0}`}; neither is positive.` },
    { kind: 'takeaway', text: t`Find one solution of ${math`ax + by = c`}, by trial or a lucky guess; then, when ${math`a`} and ${math`b`} share no factor, all solutions are ${math`(x_{${0}} + bk, y_{${0}} - ak)`}.` },
  ],
  examples: [
    withExaminer(workedCambridge(bananasN), t`The negative solution checked, the step ${math`N \to N + ${81}`} justified, and the claim that there are no other solutions proved, not assumed.`),
    worked(factorPairs, { s: 1, u: 2, n: 24 }, t`Factorise, then list the pairs`),
    worked(oneSolution, { a: 5, b: 9, c: 4 }, t`The first solution by trial`),
  ],
  generators: [oneSolution, nextSolution, factorPairs],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['diophantine-equation', 'particular-solution'],
  cambridge: withUses([coins, a19q2v, bananasProof], {
    'a13-wd': { sections: ['One solution, then all of them', 'Finding the first solution'], note: t`Turning a word problem into a linear equation and listing its positive solutions` },
    'a19-q2-v': { sections: ['Factorising instead'], note: t`Factorising, then listing factor pairs` },
  }),
  gate: ['a13-wd', 'a19-q2-v'],
  recall: [
    { front: t`All integer solutions of ${math`ax + by = c`}, given one ${math`(x_{${0}}, y_{${0}})`} and no common factor of ${math`a, b`}?`, back: t`${math`x = x_{${0}} + bk`}, ${math`y = y_{${0}} - ak`}, for every integer ${math`k`}.` },
    { front: t`How do you solve ${math`xy + py + qx = r`} in integers?`, back: t`Add ${math`pq`}: ${math`(x + p)(y + q) = r + pq`}, then list the factor pairs.` },
  ],
  proofOrder: [{
    title: t`Every solution is a shift of one solution`,
    steps: [
      t`Subtract ${math`ax_{${0}} + by_{${0}} = c`} from ${math`ax + by = c`}: ${math`a(x - x_{${0}}) = b(y_{${0}} - y)`}.`,
      t`${math`b`} divides ${math`a(x - x_{${0}})`} and shares no factor with ${math`a`}, so ${math`b`} divides ${math`x - x_{${0}}`}.`,
      t`Write ${math`x = x_{${0}} + bk`}.`,
      t`Then ${math`abk = b(y_{${0}} - y)`}, so ${math`y = y_{${0}} - ak`}.`,
    ],
  }],
};
