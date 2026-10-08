/**
 * fp.equational-reasoning: Proving recursive functions correct. The lesson follows CS3110
 * Section 8.7 (Section 10.7 of the PDF edition, "Proving Correctness": equational reasoning,
 * induction on natural numbers, the failed and the strengthened proof that fact_tr agrees
 * with fact, recursion against iteration) and FoCS Lectures 1 and 2 (exponentiation,
 * iterative summing). The problems are the CS3110 Chapter 8 exercises "exp", "fibi",
 * "expsq", "expsq simplified", and "mult".
 *
 * Values run in the OCaml 4.11.1 toplevel (scratch file ocamlE/t13.ml): expsq makes 1, 2, 4,
 * 10 calls for n = 1, 2, 13, 1000; expsq 3 13 = 1594323; facti 3 5 = 3 * fact 5 = 360;
 * exp 2 10 = expsq 2 10 = 1024.
 */
import { cite, supervision, withUses } from '../cambridge';
import { code, codeBlock } from '../ocaml-code';
import { int, pick } from '../math';
import { generator, type Misconception } from '../problem';
import { dmath, math, t } from '../rich';
import { checkFrom, workedProof, worked, type TopicContent } from '../topic';

const fact = (n: number): number => (n === 0 ? 1 : n * fact(n - 1));

const FACT_DEFS = codeBlock(
  code`let rec fact n = if n = ${0} then ${1} else n * fact (n - ${1})`,
  code`let rec facti acc n = if n = ${0} then acc else facti (acc * n) (n - ${1})`,
  code`let fact_tr n = facti ${1} n`,
);

// ---------------------------------------------------------------- facti

interface FactiP { p: number; n: number }

const factiGen = generator<FactiP>({
  id: 'facti-value',
  quick: true,
  skill: 'Evaluate an accumulator function by the generalised equation p * fact n = facti p n, or by unfolding it.',
  params: (rng) => ({ p: int(rng, 2, 6), n: int(rng, 3, 7) }),
  sane: ({ p, n }) => (p >= 2 && n >= 3 ? null : 'out of range'),
  problem: ({ p, n }) => ({
    prompt: t`With ${FACT_DEFS} what is ${code`facti ${p} ${n}`}?`,
    answer: { kind: 'exact', expected: String(p * fact(n)) },
    solution: [
      t`Each call multiplies the accumulator by ${code`n`} and counts down: the accumulator goes ${p}, ${p * n}, ${p * n * (n - 1)}, and so on, until ${code`n`} is ${0}.`,
      t`So ${code`facti ${p} ${n}`} is ${math`${p} \times ${n}! = ${p} \times ${fact(n)} = ${p * fact(n)}`}: exactly the lemma ${math`p \times \mathrm{fact}\ n = \mathrm{facti}\ p\ n`} proved in the lesson.`,
    ],
  }),
  solve: ({ p, n }) => {
    let [acc, m] = [p, n];
    while (m !== 0) [acc, m] = [acc * m, m - 1];
    return String(acc);
  },
  misconceptions: ({ p, n }): Misconception[] => [
    { response: String(fact(n)), why: t`The accumulator starts at ${p}, not ${1}: the result is ${p} times ${math`${n}!`}.` },
    { response: String(p * fact(n - 1)), why: t`The first call already multiplies by ${n}: the factors run from ${n} down to ${1}.` },
  ],
});

// ---------------------------------------------------------------- expsq calls

interface CallsP { n: number }
const expsqCalls = (n: number): number => (n <= 1 ? 1 : 1 + expsqCalls(Math.floor(n / 2)));

const callsGen = generator<CallsP>({
  id: 'expsq-calls',
  skill: 'Count the calls of exponentiation by repeated squaring: the exponent halves at each call, so about log2 n calls against n for the naive exp.',
  params: (rng) => ({ n: int(rng, 5, 2000) }),
  sane: ({ n }) => (n >= 5 ? null : 'out of range'),
  problem: ({ n }) => {
    const ans = Math.floor(Math.log2(n)) + 1;
    return {
      prompt: t`CS${3110}'s ${codeBlock(code`let rec expsq x n =`, code`  if n = ${0} then ${1}`, code`  else if n = ${1} then x`, code`  else (if n mod ${2} = ${0} then ${1} else x) * expsq (x * x) (n / ${2})`)} How many calls of ${code`expsq`}, counting the first, does ${code`expsq x ${n}`} make?`,
      answer: { kind: 'exact', expected: String(ans) },
      solution: [
        t`Each call with ${math`n \ge ${2}`} makes one call with ${code`n / ${2}`}, rounded down, and the calls stop at ${math`n = ${1}`}.`,
        t`Halving ${n} repeatedly reaches ${1} after ${ans - 1} halvings, since ${math`${2}^{${ans - 1}} \le ${n} < ${2}^{${ans}}`}. With the first call that is ${ans} calls, against ${n + 1} for the naive ${code`exp`}.`,
      ],
    };
  },
  solve: ({ n }) => {
    let [calls, m] = [1, n];
    while (m > 1) { m = Math.floor(m / 2); calls++; }
    return String(calls);
  },
  misconceptions: ({ n }) => [
    { response: String(n + 1), why: t`That is the naive ${code`exp`}, which lowers ${code`n`} by ${1} each call. ${code`expsq`} halves it.` },
    { response: String(Math.floor(Math.log2(n))), why: t`That counts the halvings; add the first call.` },
  ],
});

// ---------------------------------------------------------------- the generalised claim

interface InvP { form: number; c: number }

const invariant = generator<InvP>({
  id: 'generalised-claim',
  skill: 'Find the generalised equation an accumulator function satisfies for every accumulator, the claim that makes the induction go through.',
  params: (rng) => ({ form: int(rng, 0, 2), c: pick(rng, [2, 3, 4, 5, 7]) }),
  sane: ({ form, c }) => (form >= 0 && form <= 2 && c >= 2 ? null : 'out of range'),
  problem: ({ form, c }) => {
    const step = [code`(a + ${c})`, code`(a * ${c})`, code`(a + n)`][form] as ReturnType<typeof code>;
    const ans = [`a + ${c}n`, `a * ${c}^n`, 'a + n(n + 1)/2'][form] as string;
    return {
      prompt: t`For ${codeBlock(code`let rec g n a = if n = ${0} then a else g (n - ${1}) ${step}`)} find an expression for ${code`g n a`}, in terms of ${math`n`} and ${math`a`}, valid for all ${math`n \ge ${0}`} and every ${math`a`}. (This is the claim to prove by induction on ${math`n`}.)`,
      answer: { kind: 'expression', expected: ans, variables: ['n', 'a'], domains: { n: { kind: 'integer', min: 0, max: 8 }, a: { kind: 'integer', min: -5, max: 5 } } },
      solution: [
        [t`Each call adds ${c} to the accumulator, ${math`n`} times.`, t`Each call multiplies the accumulator by ${c}, ${math`n`} times.`, t`The calls add ${math`n`}, then ${math`n - ${1}`}, down to ${1}.`][form] as ReturnType<typeof t>,
        t`So the claim is that ${code`g n a`} equals ${[math`a + ${c}n`, math`a \cdot ${c}^{n}`, math`a + \frac{n(n + ${1})}{${2}}`][form] as ReturnType<typeof math>}. The induction step uses the hypothesis with ${math`a`} replaced by the new accumulator, which is why the claim must hold for every ${math`a`}.`,
      ],
    };
  },
  solve: ({ form, c }) => {
    // Run g, and confirm a candidate closed form on a grid before returning it.
    const g = (n: number, a: number): number => { let [m, acc] = [n, a]; while (m !== 0) [m, acc] = [m - 1, form === 0 ? acc + c : form === 1 ? acc * c : acc + m]; return acc; };
    const close = (n: number, a: number): number => (form === 0 ? a + c * n : form === 1 ? a * c ** n : a + (n * (n + 1)) / 2);
    for (let n = 0; n <= 8; n++) for (let a = -5; a <= 5; a++) if (g(n, a) !== close(n, a)) return 'none';
    return [`${c}n + a`, `${c}^n a`, '(n^2 + n)/2 + a'][form] as string;
  },
  misconceptions: ({ form, c }) => [
    [
      { response: `${c}n`, why: t`The accumulator is not ${0} in general: the result keeps the starting ${math`a`}.` },
      { response: `a + ${c}(n - 1)`, why: t`There are ${math`n`} calls that add ${c}: from ${math`n`} down to ${1}.` },
    ],
    [
      { response: `${c}^n`, why: t`The starting accumulator ${math`a`} is multiplied too: the result is ${math`a \cdot ${c}^{n}`}.` },
      { response: `a * ${c}^(n - 1)`, why: t`There are ${math`n`} multiplications by ${c}, one per call with ${math`n > ${0}`}.` },
    ],
    [
      { response: 'n(n + 1)/2', why: t`The result keeps the starting accumulator ${math`a`}.` },
      { response: 'a + n(n - 1)/2', why: t`The first call adds ${math`n`} itself, so the numbers added are ${math`n`} down to ${1}.` },
    ],
  ][form] as Misconception[],
});

// ---------------------------------------------------------------- Cambridge problems

const expProof = workedProof({
  title: t`Exponents add`,
  prompt: t`Prove that ${code`exp x (m + n) = exp x m * exp x n`} for all ${math`m, n \ge ${0}`}, where ${codeBlock(code`let rec exp x n = if n = ${0} then ${1} else x * exp x (n - ${1})`)} Proceed by induction on ${math`m`}.`,
  steps: [
    t`Claim: for all ${math`m \ge ${0}`}, ${math`P(m)`}: for all ${math`n \ge ${0}`}, ${code`exp x (m + n) = exp x m * exp x n`}. Proof by induction on ${math`m`}.`,
    t`Base case ${math`m = ${0}`}: ${code`exp x (${0} + n)`} ${math`=`} ${code`exp x n`} by arithmetic. And ${code`exp x ${0} * exp x n`} ${math`=`} ${code`${1} * exp x n`} by evaluation, ${math`=`} ${code`exp x n`} by arithmetic. The two sides are equal.`,
    t`Inductive case ${math`m = k + ${1}`}, with the hypothesis ${math`P(k)`}: ${code`exp x ((k + ${1}) + n)`} ${math`=`} ${code`exp x ((k + n) + ${1})`} by arithmetic, ${math`=`} ${code`x * exp x (k + n)`} by evaluation, since ${math`(k + n) + ${1} \neq ${0}`}.`,
    t`${math`=`} ${code`x * (exp x k * exp x n)`} by the hypothesis ${math`P(k)`}, ${math`=`} ${code`(x * exp x k) * exp x n`} by associativity of ${code`*`}, ${math`=`} ${code`exp x (k + ${1}) * exp x n`} by evaluation, read backwards.`,
    t`So ${math`P(k + ${1})`} holds, and by induction ${math`P(m)`} holds for every ${math`m \ge ${0}`}. ${math`\blacksquare`}`,
  ],
  answer: t`${code`exp x (m + n) = exp x m * exp x n`} for all ${math`m, n \ge ${0}`}, by induction on ${math`m`}.`,
  source: cite('cs3110-ex8', 'Exercise "exp"'),
});

const fibi = supervision({
  id: 'cs3110-ex8-fibi',
  source: cite('cs3110-ex8', 'Exercise "fibi"'),
  title: t`The iterative Fibonacci is correct`,
  prompt: t`Prove that ${code`fib n = fibi n (${0}, ${1})`} for all ${math`n \ge ${1}`}, where ${codeBlock(code`let rec fib n = if n = ${1} then ${1} else if n = ${2} then ${1} else fib (n - ${2}) + fib (n - ${1})`, code`let rec fibi n (prev, curr) = if n = ${1} then curr else fibi (n - ${1}) (curr, prev + curr)`)} Proceed by induction on ${math`n`}. Hint: first state and prove a claim about ${code`fibi n (fib k, fib (k + ${1}))`} for every ${math`k`}, as the lesson strengthened the claim about ${code`facti`}.`,
  writeUp: 'proof',
  hints: [
    t`Unfolding ${code`fibi`} once from ${code`(fib k, fib (k + ${1}))`}, which pair does the next call receive?`,
    t`Which claim about ${code`fibi n (fib k, fib (k + ${1}))`}, for every ${math`k`}, can be proved by induction on ${math`n`}?`,
    t`Which choice of ${math`k`} turns that claim into ${code`fib n = fibi n (${0}, ${1})`}, given that ${code`fib`} is only defined from ${1}?`,
  ],
});
const expsq = supervision({
  id: 'cs3110-ex8-expsq',
  source: cite('cs3110-ex8', 'Exercise "expsq"'),
  title: t`Repeated squaring is correct`,
  prompt: t`Prove that ${code`expsq x n = exp x n`} for all ${math`n \ge ${0}`}, where ${code`expsq`} is ${codeBlock(code`let rec expsq x n =`, code`  if n = ${0} then ${1} else if n = ${1} then x`, code`  else (if n mod ${2} = ${0} then ${1} else x) * expsq (x * x) (n / ${2})`)} Proceed by strong induction on ${math`n`}, using the exercise "exp" and the fact ${code`exp (x * x) k = exp x (${2} * k)`}, which also needs a proof.`,
  writeUp: 'proof',
  hints: [
    t`How does ${code`exp (x * x) k = exp x (${2} * k)`} follow by induction on ${math`k`}, using "exp"?`,
    t`For even ${math`n \ge ${2}`}, what does one evaluation step give, and why may the hypothesis be used at ${math`n / ${2}`}?`,
    t`For odd ${math`n \ge ${3}`}, how does ${math`n = ${2}(n / ${2}) + ${1}`} combine with "exp" to finish the case?`,
  ],
});
const expsqSimple = supervision({
  id: 'cs3110-ex8-expsq-simplified',
  source: cite('cs3110-ex8', 'Exercise "expsq simplified"'),
  title: t`Repeated squaring, simplified`,
  prompt: t`Redo the proof that ${code`expsq' x n = exp x n`} for the simplified ${codeBlock(code`let rec expsq' x n =`, code`  if n = ${0} then ${1}`, code`  else (if n mod ${2} = ${0} then ${1} else x) * expsq' (x * x) (n / ${2})`)} It needs less code but one extra recursive call. Which case of the previous proof disappears, and which step must now cover it?`,
  writeUp: 'proof',
  hints: [
    t`What does ${code`expsq' x ${1}`} evaluate to, step by step?`,
    t`Which case of the previous proof handled ${math`n = ${1}`} directly?`,
    t`Does the odd case of the strong induction now cover ${math`n = ${1}`}, and which fact about ${math`n / ${2}`} does it need?`,
  ],
});
const mult = supervision({
  id: 'cs3110-ex8-mult',
  source: cite('cs3110-ex8', 'Exercise "mult"'),
  title: t`Multiplying by zero`,
  prompt: t`With natural numbers as ${code`type nat = Z | S of nat`}, and ${codeBlock(code`let rec plus a b = match a with Z -> b | S k -> S (plus k b)`, code`let rec mult a b = match a with Z -> Z | S k -> plus b (mult k b)`)} prove that ${code`mult n Z = Z`} for all ${code`n`}, by induction on ${code`n`}. A fact about ${code`plus Z`} is needed: state it and why it holds.`,
  writeUp: 'proof',
  hints: [
    t`What does ${code`mult Z Z`} evaluate to?`,
    t`For ${code`n = S k`}, what does ${code`mult (S k) Z`} evaluate to in one step?`,
    t`What is ${code`plus Z b`} for any ${code`b`}, and how does it combine with the hypothesis?`,
  ],
});

// ---------------------------------------------------------------- lesson

const P = 3;
const N = 5;

export const fpEquationalReasoning: TopicContent = {
  topicId: 'fp.equational-reasoning',
  goal: t`Prove facts about recursive functions, such as that a fast exponentiation agrees with the slow one, by equational reasoning and induction on ${math`n`}.`,
  objective: t`Prove that two recursive functions agree, by evaluation steps and induction on n.`,
  why: t`Tests check some inputs; a proof checks them all, and is how Cambridge expects you to justify an optimisation.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`Code you can do algebra with` },
    { kind: 'hook', text: t`You have replaced a simple recursive factorial with a fast, tail recursive one. Every test passes. But there are infinitely many inputs, and the previous lesson showed that passing tests prove nothing. Can you be sure, the way you are sure that ${math`(a + b)^{${2}} = a^{${2}} + ${2}ab + b^{${2}}`}?` },
    { kind: 'narrative', text: t`You can, because OCaml code without side effects behaves like algebra. ${code`fact ${N}`} means the same as its unfolding ${code`${N} * fact ${N - 1}`}, everywhere and always, just as ${math`${2} + ${3}`} means ${5}. So you can rewrite code step by step, each step justified, exactly as you rewrite an equation.` },
    {
      kind: 'definition',
      name: t`Equational reasoning`,
      formal: t`[[equational-reasoning|Equational reasoning]] proves that two expressions are equal by a chain ${math`e_{${0}} = e_{${1}} = \cdots = e_{k}`}, each step justified by one of: evaluation (replacing an application by the function's body with the arguments substituted, or an ${code`if`} or ${code`match`} by the branch it selects), the laws of arithmetic, or an already proved equation, such as an induction hypothesis. It is valid for code that has no side effects and whose expressions terminate.`,
      plain: t`CS${3110} writes each step with its reason in braces: ${code`fact ${0} = { evaluation } ${1}`}. A proof is just a sequence of such steps.`,
    },
    { kind: 'rule', text: [FACT_DEFS] },
    { kind: 'section', title: t`A proof that gets stuck` },
    { kind: 'narrative', text: t`Try to prove ${code`fact n = facti ${1} n`} by induction on ${math`n`}. The base case is fine: both sides evaluate to ${1}. Now the inductive case, with hypothesis ${code`fact k = facti ${1} k`}.` },
    {
      kind: 'steps',
      steps: [
        { label: t`Unfold the left side`, text: t`${code`fact (k + ${1})`} ${math`=`} ${code`(k + ${1}) * fact k`} by evaluation, ${math`=`} ${code`(k + ${1}) * facti ${1} k`} by the hypothesis.` },
        { label: t`Unfold the right side`, text: t`${code`facti ${1} (k + ${1})`} ${math`=`} ${code`facti (${1} * (k + ${1})) k`} ${math`=`} ${code`facti (k + ${1}) k`}.` },
        { label: t`Stuck`, text: t`We need ${code`(k + ${1}) * facti ${1} k`} to equal ${code`facti (k + ${1}) k`}, but the hypothesis only speaks of ${code`facti`} with accumulator ${1}.`, plain: t`CS${3110}: "our proof went astray the moment we used the IH. We need a stronger inductive hypothesis."` },
      ],
    },
    { kind: 'narrative', text: t`The cure feels backwards: prove more. Instead of a claim about accumulator ${1}, prove one about every accumulator ${math`p`}. Then the hypothesis is strong enough to use with the accumulator ${math`p(k + ${1})`} that the unfolding produces. Check it on numbers first: ${code`facti ${P} ${N}`} is ${P * fact(N)}, and ${math`${P} \times ${N}! = ${P} \times ${fact(N)}`} is the same.` },
    {
      kind: 'theorem',
      name: t`The accumulator lemma`,
      statement: t`For all ${math`n \ge ${0}`} and all integers ${math`p`}, ${code`p * fact n = facti p n`}. In particular ${code`fact n = fact_tr n`}.`,
    },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`The claim`, text: t`Let ${math`P(n)`} be: for all ${math`p`}, ${code`p * fact n = facti p n`}. We prove ${math`P(n)`} for all ${math`n \ge ${0}`} by [[induction|induction]] on ${math`n`}.`, plain: t`The "for all ${math`p`}" is inside ${math`P(n)`}: the hypothesis will hold for every accumulator.` },
        { label: t`Base case`, text: t`${code`p * fact ${0}`} ${math`=`} ${code`p * ${1}`} by evaluation, ${math`= p`} by arithmetic. And ${code`facti p ${0}`} ${math`= p`} by evaluation. So ${math`P(${0})`} holds.` },
        { label: t`Unfold the left side`, text: t`Assume ${math`P(k)`}. Then ${code`p * fact (k + ${1})`} ${math`=`} ${code`p * ((k + ${1}) * fact k)`} by evaluation, ${math`=`} ${code`(p * (k + ${1})) * fact k`} by associativity.` },
        { label: t`Use the hypothesis`, text: t`${math`P(k)`} holds for every accumulator, in particular for ${code`p * (k + ${1})`}:`, eq: [code`(p * (k + ${1})) * fact k = facti (p * (k + ${1})) k`], why: { q: t`Is it legitimate to choose the accumulator?`, a: t`Yes: ${math`P(k)`} says "for all ${math`p`}", so it may be applied with any value in place of ${math`p`}. This is exactly what the weaker claim could not do.` } },
        { label: t`Fold the right side`, text: t`And ${code`facti p (k + ${1})`} ${math`=`} ${code`facti (p * (k + ${1})) k`} by evaluation. Both sides equal the same expression, so ${math`P(k + ${1})`} holds.` },
        { label: t`Conclude`, text: t`By induction ${math`P(n)`} holds for all ${math`n`}. With ${math`p = ${1}`}: ${code`fact n = ${1} * fact n = facti ${1} n = fact_tr n`}.` },
      ],
    },
    {
      kind: 'p',
      text: t`The same pattern proves every accumulator function correct: CS${3110} turns ${code`if n = ${0} then i else op n (f (n - ${1}))`} into a tail recursion, and the proof needs exactly that ${code`op`} is associative with identity ${code`i`}. For ${code`fact`} that was multiplication with ${1}.`,
      why: { q: t`OCaml ints overflow. Does the proof still hold?`, a: t`Yes. It used only evaluation and the associativity of ${code`*`}, and OCaml's ints, which wrap around, still multiply associatively and commutatively. The theorem is about the functions as written, overflow included.` },
    },
    checkFrom(factiGen, { p: 3, n: 5 }, t`By the lemma, ${code`facti ${3} ${5}`} is ${math`${3} \times ${5}! = ${360}`}.`),
    { kind: 'section', title: t`Stronger induction for faster code` },
    { kind: 'narrative', text: t`Exponentiation by repeated squaring, ${code`expsq`}, calls itself on ${code`n / ${2}`}, not on ${code`n - ${1}`}. An induction from ${math`n`} to ${math`n + ${1}`} cannot follow that step; [[strong-induction|strong induction]], which assumes the claim for every smaller number, can. That is the exercise ${code`expsq`} below, and the reason the FoCS ${code`power`} takes about ${math`\log_{${2}} n`} steps instead of ${math`n`}.` },
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'pitfall', claim: t`To prove ${code`fact n = facti ${1} n`}, induct on exactly that statement.`, counterexample: t`The hypothesis ${code`fact k = facti ${1} k`} is too weak: the unfolding produces ${code`facti (k + ${1}) k`}, with accumulator ${math`k + ${1}`}. Generalise to every accumulator first.` },
    { kind: 'pitfall', claim: t`Equational reasoning works for any OCaml code.`, counterexample: t`Not with side effects. If ${code`f ()`} prints a line, ${code`f () + f ()`} prints two and ${code`${2} * f ()`} prints one, though algebra calls them equal. The method is for pure code.` },
    { kind: 'pitfall', claim: t`The lemma holds for all integers ${math`n`}.`, counterexample: t`For ${math`n = -${1}`} neither side terminates, and the induction only covered ${math`n \ge ${0}`}. State the domain in the claim.` },
    { kind: 'takeaway', text: t`Pure OCaml can be rewritten like algebra, each step justified by evaluation, arithmetic, or a hypothesis; to prove an accumulator function correct, generalise the claim to every accumulator so the induction hypothesis is strong enough.` },
  ],
  examples: [
    expProof,
    worked(invariant, { form: 2, c: 2 }, t`The claim for summing`),
    worked(callsGen, { n: 1000 }, t`How few calls repeated squaring makes`),
  ],
  generators: [factiGen, callsGen, invariant],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['equational-reasoning'],
  cambridge: withUses([fibi, expsq, expsqSimple, mult], {
    'cs3110-ex8-fibi': { sections: ['A proof that gets stuck', 'Stronger induction for faster code'], note: t`Proving an iterative function correct by a stronger claim` },
    'cs3110-ex8-expsq': { sections: ['Stronger induction for faster code'], note: t`Proving repeated squaring correct by strong induction` },
    'cs3110-ex8-mult': { sections: ['Code you can do algebra with'], note: t`Proving a fact about a recursive function by induction` },
  }),
  gate: ['cs3110-ex8-fibi', 'cs3110-ex8-expsq', 'cs3110-ex8-mult'],
  recall: [
    { front: t`What may justify a step of equational reasoning?`, back: t`Evaluation (unfolding a definition or choosing a branch), the laws of arithmetic, or an equation already proved, such as the induction hypothesis.` },
    { front: t`State the accumulator lemma for ${code`facti`}.`, back: t`For all ${math`n \ge ${0}`} and all ${math`p`}, ${code`p * fact n = facti p n`}.` },
    { front: t`Why generalise the claim to every accumulator?`, back: t`The unfolding of ${code`facti p (k + ${1})`} gives ${code`facti (p * (k + ${1})) k`}; the hypothesis must apply to that new accumulator.` },
  ],
  proofOrder: [
    {
      title: t`${code`p * fact n = facti p n`} for every ${math`p`}`,
      steps: [
        t`State ${math`P(n)`}: for all ${math`p`}, ${code`p * fact n = facti p n`}.`,
        t`Base case: both sides evaluate to ${math`p`} at ${math`n = ${0}`}.`,
        t`Unfold ${code`p * fact (k + ${1})`} to ${code`(p * (k + ${1})) * fact k`}.`,
        t`Apply the hypothesis with accumulator ${code`p * (k + ${1})`}.`,
        t`Fold ${code`facti (p * (k + ${1})) k`} back into ${code`facti p (k + ${1})`}.`,
      ],
    },
  ],
};
