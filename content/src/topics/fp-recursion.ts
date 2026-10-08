/**
 * fp.recursion: Recursive functions. The lesson follows FoCS Lectures 1 and 2 (npower,
 * power, nsum and the iterative summing with an accumulator, recursion against iteration)
 * and CS3110 Section 2.4 (recursive functions with let rec). The problems are the CS3110
 * Chapter 2 exercises "fib" and "fib fast", and FoCS Exercise 2.1.
 *
 * Every OCaml answer was run in the OCaml 4.11.1 toplevel (scratch files ocamlE/t1.ml, t5.ml):
 *   fib 30 = 832040; fib 10 makes 109 calls (= 2 fib 10 - 1)
 *   fib_fast 90 = 2880067194370816120; fib_fast 91 = -4563325426479245499, the first negative
 *   (OCaml ints are 63 bits, max_int = 4611686018427387903)
 *   npower 2. 3 = 8.; summing 3 0 = 6
 */
import { auto, cite, same, supervision, withUses } from '../cambridge';
import { code, codeBlock } from '../ocaml-code';
import { int, pick } from '../math';
import { generator, type Misconception } from '../problem';
import { dmath, math, t, type Rich } from '../rich';
import { checkFrom, workedCambridge, worked, type TopicContent } from '../topic';

const fibOf = (n: number): number => { let [a, b] = [0, 1]; for (let i = 0; i < n; i++) [a, b] = [b, a + b]; return a; };

// ---------------------------------------------------------------- evaluating a recursion

interface LinP { a: number; b: number; c: number; k: number }

const linearRec = generator<LinP>({
  id: 'linear-rec',
  quick: true,
  skill: 'Evaluate a recursive function by unfolding it down to its base case and back up.',
  params: (rng) => ({ a: int(rng, 2, 3), b: int(rng, 0, 4), c: int(rng, 1, 5), k: int(rng, 2, 5) }),
  sane: ({ a, b, c, k }) => (a >= 2 && b >= 0 && c >= 1 && k >= 2 && k <= 5 ? null : 'out of range'),
  problem: ({ a, b, c, k }) => {
    const vals = [c];
    for (let i = 1; i <= k; i++) vals.push(a * (vals[i - 1] as number) + b);
    return {
      prompt: t`What is ${code`f ${k}`}, where ${codeBlock(code`let rec f n =`, code`  if n = ${0} then ${c} else ${a} * f (n - ${1}) + ${b}`)}`,
      answer: { kind: 'exact', expected: String(vals[k]) },
      solution: [
        t`Unfold down to the base case: ${code`f ${k}`} needs ${code`f ${k - 1}`}, which needs ${code`f ${k - 2}`}, and so on to ${code`f ${0}`}, which is ${c}.`,
        t`Now come back up, each time multiplying by ${a} and adding ${b}: ${vals.map((v, i) => t`${code`f ${i}`} is ${v}`).reduce<Rich>((acc, r, i) => (i === 0 ? r : [...acc, ...t`; `, ...r]), [])}.`,
      ],
    };
  },
  solve: ({ a, b, c, k }) => {
    const f = (n: number): number => (n === 0 ? c : a * f(n - 1) + b);
    return String(f(k));
  },
  misconceptions: ({ a, b, c, k }): Misconception[] => {
    const f = (n: number): number => (n === 0 ? c : a * f(n - 1) + b);
    return [
      { response: String(f(k - 1)), why: t`That is ${code`f ${k - 1}`}: one step short. Count the steps from ${code`f ${0}`} up to ${code`f ${k}`}: there are ${k}.` },
      { response: String(f(k + 1)), why: t`That is ${code`f ${k + 1}`}: one step too many. The base case ${code`f ${0}`} is already the value ${c}.` },
    ];
  },
});

// ---------------------------------------------------------------- the cost of naive fib

interface FibP { n: number }

/** Calls made by the naive fib, counted by running it. */
function fibCalls(n: number): number {
  let calls = 0;
  const fib = (m: number): number => { calls++; return m <= 2 ? 1 : fib(m - 1) + fib(m - 2); };
  fib(n);
  return calls;
}

const fibCost = generator<FibP>({
  id: 'fib-calls',
  skill: 'Count the calls the naive Fibonacci function makes: C(n) = 1 + C(n - 1) + C(n - 2), which is 2 fib n - 1.',
  params: (rng) => ({ n: int(rng, 6, 22) }),
  sane: ({ n }) => (n >= 6 && n <= 22 ? null : 'out of range'),
  problem: ({ n }) => ({
    prompt: t`The naive ${code`let rec fib n = if n <= ${2} then ${1} else fib (n - ${1}) + fib (n - ${2})`} recomputes the same values again and again. Counting the first call, how many calls of ${code`fib`} does evaluating ${code`fib ${n}`} make?`,
    answer: { kind: 'exact', expected: String(2 * fibOf(n) - 1) },
    solution: [
      t`Let ${math`C(n)`} be the number of calls. For ${math`n \le ${2}`} there is just the one call: ${math`C(${1}) = C(${2}) = ${1}`}. For ${math`n > ${2}`}, one call plus the calls of the two recursive calls: ${math`C(n) = ${1} + C(n - ${1}) + C(n - ${2})`}.`,
      t`This recurrence gives ${math`C(n) = ${2}\,\mathrm{fib}(n) - ${1}`} (the lesson proves it by induction). Here ${code`fib ${n}`} is ${fibOf(n)}, so ${math`C(${n}) = ${2} \times ${fibOf(n)} - ${1} = ${2 * fibOf(n) - 1}`}.`,
    ],
  }),
  solve: ({ n }) => String(fibCalls(n)),
  misconceptions: ({ n }) => [
    { response: String(n), why: t`One call per value of ${code`n`} is what a linear function would make. The naive ${code`fib`} calls itself twice at each level and recomputes the same values.` },
    { response: String(fibOf(n)), why: t`That is the value ${code`fib ${n}`}. The number of calls is ${math`${2}\,\mathrm{fib}(n) - ${1}`}: every leaf of the call tree returns ${1}, and there are one fewer inner calls than leaves.` },
  ],
});

// ---------------------------------------------------------------- accumulators

interface AccP { form: number; n: number; s: number }

const accumulator = generator<AccP>({
  id: 'accumulator',
  quick: true,
  skill: 'Evaluate a tail recursive function with an accumulator: the work is done on the way down, and the base case returns the accumulator.',
  params: (rng) => {
    const form = int(rng, 0, 1);
    return form === 0 ? { form, n: int(rng, 3, 12), s: int(rng, 1, 30) } : { form, n: int(rng, 3, 6), s: pick(rng, [2, 3, 5, 7]) };
  },
  sane: ({ form, n, s }) => ((form === 0 && n >= 3 && s >= 1) || (form === 1 && n >= 3 && n <= 6 && s >= 2) ? null : 'out of range'),
  problem: ({ form, n, s }) => {
    if (form === 0) {
      const ans = (n * (n + 1)) / 2 + s;
      return {
        prompt: t`What is ${code`summing ${n} ${s}`}, where ${codeBlock(code`let rec summing n total =`, code`  if n = ${0} then total else summing (n - ${1}) (n + total)`)}`,
        answer: { kind: 'exact', expected: String(ans) },
        solution: [
          t`Each call adds ${code`n`} to the running total and counts down: the totals are ${s}, then ${s + n}, then ${s + n + n - 1}, and so on, until ${code`n`} reaches ${0}.`,
          t`So the result is the starting total plus ${math`${n} + ${n - 1} + \cdots + ${1} = \frac{${n} \times ${n + 1}}{${2}} = ${(n * (n + 1)) / 2}`}: ${math`${s} + ${(n * (n + 1)) / 2} = ${ans}`}.`,
        ],
      };
    }
    const fact = Array.from({ length: n }, (_, i) => i + 1).reduce((x, y) => x * y, 1);
    return {
      prompt: t`What is ${code`prod ${n} ${s}`}, where ${codeBlock(code`let rec prod n acc =`, code`  if n = ${0} then acc else prod (n - ${1}) (n * acc)`)}`,
      answer: { kind: 'exact', expected: String(fact * s) },
      solution: [
        t`Each call multiplies the accumulator by ${code`n`} and counts down, from ${code`acc`} equal to ${s}.`,
        t`So the result is ${math`${s} \times ${n} \times ${n - 1} \times \cdots \times ${1} = ${s} \times ${fact} = ${fact * s}`}.`,
      ],
    };
  },
  solve: ({ form, n, s }) => {
    // Run the tail recursion as the loop it is.
    let [m, acc] = [n, s];
    while (m !== 0) [m, acc] = [m - 1, form === 0 ? m + acc : m * acc];
    return String(acc);
  },
  misconceptions: ({ form, n, s }): Misconception[] => {
    const fact = Array.from({ length: n }, (_, i) => i + 1).reduce((x, y) => x * y, 1);
    return form === 0
      ? [
        { response: String((n * (n + 1)) / 2), why: t`The total starts at ${s}, not ${0}: the base case returns the accumulator, which still contains it.` },
        { response: String((n * (n - 1)) / 2 + s), why: t`The first call already adds ${n}: the numbers added are ${n} down to ${1}.` },
      ]
      : [
        { response: String(fact), why: t`The accumulator starts at ${s}, not ${1}, and the base case returns it, so the factor ${s} stays in.` },
        { response: String((fact / n) * s), why: t`The first call already multiplies by ${n}: the factors are ${n} down to ${1}.` },
      ];
  },
});

// ---------------------------------------------------------------- Cambridge problems

const FIB_N = 30;
const fib30 = auto({
  id: 'cs3110-ex2-fib',
  source: cite('cs3110-ex2', 'Exercise "fib"'),
  title: t`The Fibonacci function`,
  prompt: t`Define a recursive function ${code`fib : int -> int`} with ${code`fib ${1}`} and ${code`fib ${2}`} equal to ${1}, and ${code`fib n = fib (n - ${1}) + fib (n - ${2})`} for ${math`n > ${2}`}. Evaluate ${code`fib ${FIB_N}`}.`,
  answer: { kind: 'exact', expected: String(fibOf(FIB_N)) },
  solution: [
    t`${codeBlock(code`let rec fib n =`, code`  if n <= ${2} then ${1} else fib (n - ${1}) + fib (n - ${2})`)}`,
    t`The values run ${fibOf(1)}, ${fibOf(2)}, ${fibOf(3)}, ${fibOf(4)}, ${fibOf(5)}, ${fibOf(6)}, and so on; ${code`fib ${FIB_N}`} is ${fibOf(FIB_N)}. This naive version makes ${math`${2} \times ${fibOf(FIB_N)} - ${1}`} calls to get there, which is why the next exercise asks for a faster one.`,
    t`Check the indexing against the first values before trusting a count.`,
  ],
  nudge: t`Not quite. Check the indexing: ${code`fib ${1}`} and ${code`fib ${2}`} are both ${1}.`,
  hints: [
    t`What are ${code`fib ${1}`} through ${code`fib ${6}`}?`,
    t`Rather than call the slow recursion, how can the values be built up one at a time?`,
    t`Counting carefully from ${code`fib ${1}`}, which value is the ${FIB_N}th?`,
  ],
  reference: String(fibOf(FIB_N)),
  // OCaml 4.11.1: fib 30 = 832040.
  verify: () => same('fib 30', fibOf(FIB_N), 832040),
  misconceptions: [{ response: String(fibOf(FIB_N - 1)), why: t`That is ${code`fib ${FIB_N - 1}`}: with ${code`fib ${1}`} and ${code`fib ${2}`} both ${1}, count again from the start.` }],
});

/** fib_fast in OCaml's 63-bit two's complement ints: the first n with a negative result. */
function firstNegativeFibFast(): number {
  const wrap = (x: bigint): bigint => BigInt.asIntN(63, x);
  const h = (n: number, pp: bigint, p: bigint): bigint => {
    let [m, a, b] = [n, pp, p];
    while (m !== 1) [m, a, b] = [m - 1, b, wrap(a + b)];
    return b;
  };
  for (let n = 1; ; n++) if (h(n, 0n, 1n) < 0n) return n;
}
const FIRST_NEG = firstNegativeFibFast();
const fibFast = auto({
  id: 'cs3110-ex2-fib-fast',
  source: cite('cs3110-ex2', 'Exercise "fib fast"'),
  title: t`Fibonacci in linear time, and overflow`,
  prompt: t`Write ${code`fib_fast`} with a helper ${code`h n pp p`}, where ${code`h ${1} pp p`} is ${code`p`} and ${code`h n pp p`} is ${code`h (n - ${1}) p (pp + p)`} for ${math`n > ${1}`}, so that ${code`fib_fast n`} is ${code`h n ${0} ${1}`}. OCaml's ints are ${63} bits wide, so they overflow. What is the first value of ${code`n`} for which ${code`fib_fast n`} is negative?`,
  answer: { kind: 'exact', expected: String(FIRST_NEG) },
  solution: [
    t`${codeBlock(code`let fib_fast n =`, code`  let rec h n pp p = if n = ${1} then p else h (n - ${1}) p (pp + p) in`, code`  h n ${0} ${1}`)}`,
    t`The helper keeps the last two Fibonacci numbers, ${code`pp`} and ${code`p`}, and steps forward ${code`n - ${1}`} times: one call per step, so linear work, and each call is a tail call.`,
    t`The largest OCaml int is ${code`max_int`}, which is ${math`${2}^{${62}} - ${1}`}, about ${math`${4.61} \times ${10}^{${18}}`}. The Fibonacci numbers grow by a factor of about ${1.618} each step; ${code`fib ${FIRST_NEG - 1}`} is about ${math`${2.88} \times ${10}^{${18}}`} and still fits, but the next sum is too big.`,
    t`Adding past ${code`max_int`} wraps around to negative numbers, so ${code`fib_fast ${FIRST_NEG}`} is the first negative value.`,
  ],
  reference: String(FIRST_NEG),
  // OCaml 4.11.1: fib_fast 90 = 2880067194370816120, fib_fast 91 = -4563325426479245499.
  verify: () => same('first negative', FIRST_NEG, 91),
  misconceptions: [
    { response: '93', why: t`${93} is where a ${64} bit signed integer would first overflow. OCaml keeps one bit of each int as a tag, so its ints have ${63} bits and overflow two steps earlier.` },
    { response: '90', why: t`${code`fib ${90}`} is about ${math`${2.88} \times ${10}^{${18}}`}, less than ${code`max_int`}, so it is still positive.` },
  ],
});

const focs21 = supervision({
  id: 'focs-2-1',
  source: cite('focs-notes', 'Lecture 2, Exercise 2.1'),
  title: t`An iterative power`,
  prompt: t`Code an iterative (tail recursive) version of the FoCS function ${code`power`}, which computes ${math`x^{n}`} by ${math`x^{${2}n} = (x^{${2}})^{n}`} and ${math`x^{${2}n + ${1}} = x \times (x^{${2}})^{n}`}. Add an accumulator argument and state what it holds at each call: the invariant relating ${code`x`}, ${code`n`}, the accumulator, and the original ${math`x^{n}`}. Is the gain worth it, as FoCS asks?`,
  writeUp: 'explanation',
  hints: [
    t`If the accumulator is ${math`a`}, which product of ${math`a`} and a power of ${code`x`} should stay equal to the original ${math`x^{n}`}?`,
    t`When ${code`n`} is odd, what must happen to the accumulator to keep that product unchanged as ${code`x`} is squared and ${code`n`} halved?`,
    t`How deep does the recursion of the original ${code`power`} go, and does a tail call save much at that depth?`,
  ],
});

// Computer Science Tripos Part IA 2024, Paper 1, Question 2(a): trial division by recursion.
const cst24 = supervision({
  id: 'cst-2024-p1-q2-a',
  source: cite('cst-y2024p1q2', '(a)'),
  title: t`A primality test by trial division`,
  prompt: t`A prime number is a natural number greater than ${1} that has no positive divisors other than ${1} and itself. We wish to implement a primality test in OCaml that checks if a positive input integer is prime. A simple primality test is via trial division: given a positive input number ${math`n`}, check if it is divisible by any prime number between ${2} and ${math`\sqrt{n}`}. For any divisor ${math`p \ge \sqrt{n}`}, there must be another divisor ${math`\frac{n}{p} \le \sqrt{n}`}, and a prime divisor ${math`q`} of ${math`\frac{n}{p}`}, and therefore looking for prime divisors where ${math`p \le \sqrt{n}`} is sufficient. Define a function ${code`is_prime`} which accepts a positive input integer and returns a boolean to indicate if it is prime or not. To simplify your code, you can avoid calculating square roots by checking for prime divisors where ${math`p^{${2}} \le n`}. You can assume the existence of a ${code`(mod)`} operator which returns the integer remainder of two integers. For example, ${code`${3} mod ${2}`} will return ${1}. The type definitions are: ${codeBlock(code`val (mod) : int -> int -> int`, code`val is_prime : int -> bool`)}`,
  writeUp: 'explanation',
  hints: [
    t`Which inputs must be handled before any trial division, such as ${1}?`,
    t`Which recursive helper, taking a candidate divisor ${code`d`}, can test divisors in turn, and when should it stop?`,
    t`Is it enough to try every ${code`d`} with ${math`d^{${2}} \le n`}, prime or not, and why?`,
  ],
});

const PHI = (1 + Math.sqrt(5)) / 2;
const gammaAt = (n: number): number => { let g = PHI; for (let i = 0; i < n; i++) g = 1 / (g - 1); return g; };
const G50 = gammaAt(50);
// Rule 1 (2026-10-08): set here from fp.expressions, the earliest topic that teaches everything it needs.
const focs16 = auto({
  id: 'focs-1-6',
  source: cite('focs-notes', 'Lecture 1, Exercise 1.6'),
  title: t`The golden ratio, iterated`,
  prompt: t`Let ${math`\gamma_{${0}} = \frac{${1} + \sqrt{${5}}}{${2}}`} and ${math`\gamma_{n + ${1}} = \frac{${1}}{\gamma_{n} - ${1}}`}. In exact arithmetic ${math`\gamma_{n} = \gamma_{${0}}`} for every ${math`n`}. Code the computation in OCaml with floats (in OCaml, ${math`\sqrt{${5}}`} is ${code`sqrt ${5}.${0}`}) and give the computed ${math`\gamma_{${50}}`} to ${2} decimal places.`,
  answer: { kind: 'numeric', expected: G50, relTol: 0, absTol: 0.006 },
  solution: [
    t`Exactly, ${math`\gamma_{${0}} = \varphi`} satisfies ${math`\varphi^{${2}} = \varphi + ${1}`}, so ${math`\varphi - ${1} = \frac{${1}}{\varphi}`} and ${math`\frac{${1}}{\varphi - ${1}} = \varphi`}: every term is ${math`\varphi`}.`,
    t`But the float for ${math`\varphi`} is off by a tiny ${math`\varepsilon`}. The map ${math`g \mapsto \frac{${1}}{g - ${1}}`} has slope ${math`-\frac{${1}}{(g - ${1})^{${2}}} = -\varphi^{${2}}`} at ${math`\varphi`}, about ${math`-${2.618}`}: each step multiplies the error by about ${2.618}.`,
    t`After about ${40} steps the error is of order ${1}, and the iteration settles on the map's other fixed point, ${math`\frac{${1} - \sqrt{${5}}}{${2}} \approx ${-0.618}`}, where errors shrink instead. The program gives ${math`\gamma_{${50}} \approx ${Number(G50.toFixed(4))}`}.`,
    t`An iteration that magnifies errors drifts to a fixed point where errors shrink.`,
  ],
  nudge: t`Not quite. The question asks for what the float program computes, not the exact value.`,
  hints: [
    t`In exact arithmetic, why is every ${math`\gamma_{n}`} equal to ${math`\gamma_{${0}}`}?`,
    t`Near ${math`\gamma_{${0}}`}, by what factor does one step of ${math`g \mapsto \frac{${1}}{g - ${1}}`} multiply a small error?`,
    t`Which other fixed point does the map have, and is it stable?`,
  ],
  reference: G50.toFixed(2),
  // OCaml 4.11.1: gamma 50 = -0.61812184348574739; gamma 10 still prints 1.618...; JavaScript doubles agree.
  verify: () => same('gamma 50', G50.toFixed(4), '-0.6181'),
  misconceptions: [{ response: PHI.toFixed(2), why: t`That is the exact answer, but the question asks what the float program gives. The rounding error is multiplied by about ${2.6} at each step.` }],
});

// ---------------------------------------------------------------- lesson

const X = 2;
const N = 3;

export const fpRecursion: TopicContent = {
  topicId: 'fp.recursion',
  goal: t`Write recursive functions with ${code`let rec`}, and turn a recursion into an iterative, tail recursive one with an accumulator.`,
  objective: t`Write recursive functions, trace them, and make them tail recursive with an accumulator.`,
  why: t`Recursion replaces loops in OCaml; every list and tree function, and every correctness proof, builds on it.`,
  minutes: 25,
  lesson: [
    { kind: 'section', title: t`A function that calls itself` },
    { kind: 'hook', text: t`OCaml has no loops in the functional core, yet it computes ${math`${X}^{${10}}`} without trouble. How do you repeat something with no loop? You let a function call itself on a smaller problem, and trust it to finish.` },
    { kind: 'narrative', text: t`Mathematics already does this. Powers are defined by ${math`x^{${0}} = ${1}`} and ${math`x^{n + ${1}} = x \times x^{n}`}: the power ${math`x^{n + ${1}}`} is defined using the smaller power ${math`x^{n}`}. FoCS turns those two equations straight into code.` },
    { kind: 'rule', text: [codeBlock(code`let rec npower x n =`, code`  if n = ${0} then ${1}.${0}`, code`  else x *. npower x (n - ${1})`)] },
    {
      kind: 'definition',
      name: t`Recursive function`,
      formal: t`A [[recursive-function|recursive function]] is declared with ${code`let rec f x = e`}, where the body ${code`e`} may call ${code`f`}. A case of the body that returns without calling ${code`f`} is a [[base-case|base case]]; a case that calls ${code`f`} is a recursive case.`,
      plain: t`The keyword ${code`rec`} lets the body refer to the function being defined. In ${code`npower`}, ${code`n = ${0}`} is the base case, returning ${code`${1}.${0}`}; otherwise it calls itself with ${code`n - ${1}`}.`,
    },
    {
      kind: 'steps',
      steps: [
        { label: t`Unfold`, text: t`${code`npower ${X}. ${N}`} is not ${0}, so it becomes ${code`${X}. *. npower ${X}. ${N - 1}`}.`, plain: t`The multiplication must wait: its right side is not known yet.` },
        { label: t`Unfold again`, text: t`The calls nest, each leaving a multiplication pending.`, eq: [code`${X}. *. (${X}. *. (${X}. *. npower ${X}. ${0}))`] },
        { label: t`Reach the base case`, text: t`${code`npower ${X}. ${0}`} is ${code`${1}.${0}`}, with no further call.` },
        { label: t`Multiply back out`, text: t`The pending multiplications are done innermost first.`, eq: [dmath`${X} \times (${X} \times (${X} \times ${1})) = ${X ** N}`] },
      ],
    },
    {
      kind: 'theorem',
      name: t`Termination`,
      statement: t`Let ${code`f`} be a recursive function on ints whose call ${code`f ${0}`} makes no recursive call, and whose call ${code`f n`} for ${math`n > ${0}`} makes only the call ${code`f (n - ${1})`}, besides steps that terminate. Then ${code`f n`} terminates for every ${math`n \ge ${0}`}.`,
    },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`State the claim`, text: t`Let ${math`P(n)`} be "${code`f n`} terminates". We prove ${math`P(n)`} for all ${math`n \ge ${0}`} by [[induction|induction]] on ${math`n`}.` },
        { label: t`Base case`, text: t`${code`f ${0}`} makes no recursive call, and its other steps terminate, so ${math`P(${0})`} holds.` },
        { label: t`Inductive step`, text: t`Assume ${math`P(k)`} for some ${math`k \ge ${0}`}. The call ${code`f (k + ${1})`} makes one recursive call, ${code`f k`}, which terminates by ${math`P(k)`}, and otherwise only terminating steps. So ${math`P(k + ${1})`} holds.` },
        { label: t`Conclude`, text: t`By induction, ${code`f n`} terminates for every ${math`n \ge ${0}`}.` },
      ],
    },
    {
      kind: 'p',
      text: t`Notice what the theorem does not cover: a negative argument. ${code`npower ${X}. (-${1})`} calls ${code`npower ${X}. (-${2})`}, then ${code`-${3}`}, and never reaches ${0}.`,
      why: { q: t`But ${math`x^{-${1}} = x \times x^{-${2}}`} is a true equation, so why does it not work?`, a: t`A true equation is not enough: the computation must move towards a base case. Going down from ${math`-${1}`} moves away from ${0}, so the unfolding never stops. FoCS makes exactly this point.` },
    },
    checkFrom(linearRec, { a: 2, b: 1, c: 1, k: 3 }, t`Unfold to ${code`f ${0}`}, which is ${1}, then come back up: ${3}, ${7}, ${15}.`),
    { kind: 'section', title: t`Iteration: carry the answer with you` },
    { kind: 'narrative', text: t`${code`npower`} leaves a pending multiplication at every level, and the computer must remember all of them, on its stack, until the base case is reached. FoCS's ${code`nsum`}, which adds ${math`${1} + ${2} + \cdots + n`}, has the same shape, with an addition pending at every level.` },
    { kind: 'rule', text: [codeBlock(code`let rec nsum n =`, code`  if n = ${0} then ${0}`, code`  else n + nsum (n - ${1})`)] },
    { kind: 'narrative', text: t`For ${code`nsum ${10000}`} that is ten thousand pending additions, and the stack can overflow. FoCS asks: we all know the additions could be done as we go. How do we make the computer do that?` },
    { kind: 'rule', text: [codeBlock(code`let rec summing n total =`, code`  if n = ${0} then total`, code`  else summing (n - ${1}) (n + total)`)] },
    {
      kind: 'definition',
      name: t`Tail call, accumulator`,
      formal: t`A call is a tail call when its result is the result of the whole body, with nothing left to do after it. A function whose recursive calls are all tail calls is [[tail-recursion|tail recursive]], or iterative. An extra argument that carries the result built so far, such as ${code`total`}, is an [[accumulator|accumulator]].`,
      plain: t`In ${code`summing`}, the recursive call is the last thing that happens; the addition ${code`n + total`} is done before the call, not after. So nothing is pending, and the computer can reuse the same stack space: the recursion runs like a loop.`,
    },
    {
      kind: 'steps',
      steps: [
        { label: t`Start`, text: t`${code`summing ${N} ${0}`}: ${code`n`} is ${N}, so call ${code`summing ${N - 1} (${N} + ${0})`}.` },
        { label: t`Add as you go`, text: t`The addition happens now: the next call is ${code`summing ${N - 1} ${N}`}, then ${code`summing ${N - 2} ${N + N - 1}`}, then ${code`summing ${0} ${N + N - 1 + N - 2}`}.`, plain: t`No call waits for another: each simply hands over to the next.` },
        { label: t`Return the accumulator`, text: t`At ${code`n = ${0}`} the base case returns ${code`total`}, which is ${(N * (N + 1)) / 2}: the answer was carried down, not built on the way back.` },
      ],
    },
    {
      kind: 'p',
      text: t`FoCS gives a warning with the trick: "Never add an accumulator merely out of habit." It saves space, but it can make code harder to read, and when the recursion is shallow there is little space to save: ${code`npower x ${10}`} is only ${11} calls deep.`,
    },
    { kind: 'section', title: t`Fibonacci, slow and fast` },
    { kind: 'narrative', text: t`The Fibonacci numbers ${fibOf(1)}, ${fibOf(2)}, ${fibOf(3)}, ${fibOf(4)}, ${fibOf(5)}, ${fibOf(6)}, and so on, each the sum of the two before, give the most famous slow recursion. ${code`fib n = fib (n - ${1}) + fib (n - ${2})`} is correct, but ${code`fib ${10}`} makes ${2 * fibOf(10) - 1} calls, and ${code`fib ${50}`} seems to hang.` },
    {
      kind: 'theorem',
      name: t`Calls of the naive fib`,
      statement: t`For ${code`let rec fib n = if n <= ${2} then ${1} else fib (n - ${1}) + fib (n - ${2})`} and every ${math`n \ge ${1}`}, evaluating ${code`fib n`} makes ${math`C(n) = ${2}\,\mathrm{fib}(n) - ${1}`} calls, counting the first.`,
    },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`The recurrence`, text: t`For ${math`n \le ${2}`} there is one call, and for ${math`n > ${2}`} there is the call itself plus those of the two recursive calls.`, eq: [dmath`C(${1}) = C(${2}) = ${1}, \qquad C(n) = ${1} + C(n - ${1}) + C(n - ${2})`] },
        { label: t`Base cases`, text: t`${math`${2}\,\mathrm{fib}(${1}) - ${1} = ${1} = C(${1})`}, and the same for ${math`n = ${2}`}.` },
        { label: t`Inductive step`, text: t`Let ${math`n > ${2}`} and assume the formula for ${math`n - ${1}`} and ${math`n - ${2}`} ([[strong-induction|strong induction]]). Then`, eq: [dmath`C(n) = ${1} + (${2}\,\mathrm{fib}(n - ${1}) - ${1}) + (${2}\,\mathrm{fib}(n - ${2}) - ${1}) = ${2}\,\mathrm{fib}(n) - ${1}`], why: { q: t`Where did the last step come from?`, a: t`The ones cancel to ${math`-${1}`}, and ${math`\mathrm{fib}(n - ${1}) + \mathrm{fib}(n - ${2}) = \mathrm{fib}(n)`} is the definition of ${code`fib`} for ${math`n > ${2}`}.` } },
        { label: t`Conclude`, text: t`By strong induction the formula holds for every ${math`n \ge ${1}`}. Since ${code`fib n`} grows like ${math`${1.618}^{n}`}, so does the number of calls.` },
      ],
    },
    { kind: 'narrative', text: t`The cure is the accumulator idea again: carry the last two numbers forward instead of recomputing them. That is the CS${3110} exercise worked below, ${code`fib_fast`}, which makes one call per step.` },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`A recursive function defined by a true equation always terminates.`, counterexample: t`${code`npower x n`} with ${math`n = -${1}`}: ${math`x^{-${1}} = x \times x^{-${2}}`} is true, but the calls go ${math`-${1}, -${2}, -${3}, \ldots`} and never reach the base case ${math`n = ${0}`}.` },
    { kind: 'pitfall', claim: t`Making a function tail recursive makes it asymptotically faster.`, counterexample: t`${code`summing`} does the same ${N} additions as ${code`nsum`} for ${math`n = ${N}`}; it saves stack space, not time. The speed up of ${code`fib_fast`} comes from not recomputing, not from the tail call.` },
    { kind: 'pitfall', claim: t`OCaml ints are unbounded, like the integers of mathematics.`, counterexample: t`They have ${63} bits: ${code`max_int + ${1}`} is ${code`min_int`}, a negative number. ${code`fib_fast`} first goes negative at ${math`n = ${FIRST_NEG}`}.` },
    { kind: 'takeaway', text: t`A recursion needs a base case and calls that move towards it; an accumulator turns pending work into an argument, making the function tail recursive, which saves space, while removing recomputation is what saves time.` },
  ],
  examples: [
    workedCambridge(fibFast),
    worked(accumulator, { form: 0, n: 5, s: 10 }, t`An accumulator that starts above zero`),
    worked(fibCost, { n: 10 }, t`How slow the naive fib is`),
  ],
  generators: [linearRec, fibCost, accumulator],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['recursive-function', 'tail-recursion', 'accumulator'],
  cambridge: withUses([cst24, fib30, focs21, focs16], {
    'focs-1-6': { sections: ['Iteration: carry the answer with you'], note: t`Iterating a float computation and watching rounding grow` },
    'cst-2024-p1-q2-a': { sections: ['A function that calls itself'], note: t`A primality test by recursion over trial divisors` },
    'focs-2-1': { sections: ['Iteration: carry the answer with you'], note: t`An iterative power with an accumulator and its invariant` },
  }),
  // Best first: the 2024 Tripos question (trial division), then FoCS Exercise 2.1.
  gate: ['cst-2024-p1-q2-a', 'focs-2-1'],
  recall: [
    { front: t`What makes a recursive function terminate?`, back: t`A base case with no recursive call, and recursive calls on arguments that move towards it, such as ${code`n - ${1}`} from ${code`n > ${0}`}.` },
    { front: t`What is a tail recursive function?`, back: t`One whose recursive calls are all tail calls: nothing is left to do after the call returns, so no work is pending on the stack.` },
    { front: t`How many calls does the naive ${code`fib n`} make?`, back: t`${math`${2}\,\mathrm{fib}(n) - ${1}`}, from ${math`C(n) = ${1} + C(n - ${1}) + C(n - ${2})`}.` },
  ],
  proofOrder: [
    {
      title: t`The naive fib makes ${math`${2}\,\mathrm{fib}(n) - ${1}`} calls`,
      steps: [
        t`Write the count as a recurrence: one call for ${math`n \le ${2}`}, else ${math`${1} + C(n - ${1}) + C(n - ${2})`}.`,
        t`Check the base cases ${math`n = ${1}`} and ${math`n = ${2}`}: one call each, and ${math`${2} \times ${1} - ${1} = ${1}`}.`,
        t`Assume the formula for ${math`n - ${1}`} and ${math`n - ${2}`}, and substitute into the recurrence.`,
        t`Simplify with ${math`\mathrm{fib}(n - ${1}) + \mathrm{fib}(n - ${2}) = \mathrm{fib}(n)`} to get ${math`${2}\,\mathrm{fib}(n) - ${1}`}.`,
      ],
    },
  ],
};
