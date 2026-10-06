/**
 * Glossary: one entry per term the lessons mark as [[id|text]]. Definitions are one or two
 * plain sentences; examples use computed numbers like the lessons do.
 */
import { PARTV_A_GLOSSARY } from './glossary-partv-a';
import { PARTV_B_GLOSSARY } from './glossary-partv-b';
import { GLOSSARY_PARTV_C } from './glossary-partv-c';
import { factorial, q, sub } from './math';
import { Phi } from './partv-d';
import { factor, poly, times } from './poly';
import { computedMath as cm, frac, ident, listOf, math, setOf, t, type Rich } from './rich';

export interface GlossaryEntry {
  id: string;
  term: string;
  aliases?: readonly string[];
  definition: Rich;
  example: Rich;
  /** The topic that teaches it. */
  topic: string;
}

const g = (topic: string, id: string, term: string, definition: Rich, example: Rich, aliases?: readonly string[]): GlossaryEntry =>
  (aliases === undefined ? { id, term, definition, example, topic } : { id, term, definition, example, topic, aliases });

/** The first `count` terms of the arithmetic sequence from `first` in steps of `step`, then an ellipsis. */
const seq = (first: number, step: number, count: number) => math`${listOf(Array.from({ length: count }, (_, i) => first + i * step))}, \ldots`;
const [mA, mB, mx, mn, mP, mQ] = [math`A`, math`B`, math`x`, math`n`, math`P`, math`Q`];

const F = 'pre.fractions';
const S = 'pre.set-notation';
const C = 'pre.product-rule';
const L = 'logic.connectives';
const A = 'pre.algebraic-manipulation';
const B = 'sets.comprehension';
const K = 'comb.factorial';
const I = 'pre.indices';
const Q = 'pre.sequences';
const P = 'pre.probability-scale';
const PH = 'comb.pigeonhole';
const BY = 'prob.bayes-two-events';
const EV = 'prob.event-spaces';
const SS = 'pre.sample-spaces';
const IM = 'logic.implication';
const PF = 'pre.prime-factorisation';
const TD = 'pre.tree-diagrams';
const AR = 'pre.algebraic-argument';
const NS = 'num.number-systems';
const SG = 'alg.sigma-notation';
const CB = 'comb.combinations';
const CU = 'sets.countable-unions';
const IF = 'logic.iff';
const QU = 'logic.quantifiers';
const DP = 'proof.direct';
const AS = 'alg.arithmetic-series';
const NQ = 'logic.nested-quantifiers';
const GS = 'alg.geometric-series';
const BI = 'comb.binomial-identities';
// Batch 3
const TW = 'pre.two-way-tables';
const BT = 'comb.binomial-theorem';
const EQ = 'logic.equivalences';
const PC = 'proof.cases';
const NG = 'logic.negating-quantifiers';
const CE = 'proof.counterexample';
const CD = 'proof.contradiction';
const RA = 'comb.repeated-arrangements';
const IN = 'alg.proof-by-induction';
const CP = 'prob.counting-probability';
const CN = 'proof.contrapositive';
const IE = 'prob.independent-events';
const IX = 'prob.inclusion-exclusion-three';
const QP = 'proof.quantifier-patterns';
const CL = 'prob.classical-probability';
const EU = 'proof.infinitely-many-primes';
// Batch 4
const BP = 'comb.binomial-theorem-proof';
const SI = 'proof.strong-induction';
const DV = 'num.divisibility';
const CF = 'prob.conditional-formula';
const DT = 'num.division-theorem';
const BD = 'prob.binomial-distribution';
const CG = 'num.congruence';
const GC = 'num.gcd';
const MA = 'num.modular-arithmetic';
const EA = 'num.euclid-algorithm';
const SM = 'prob.sampling-models';
const MI = 'num.modular-integers';
const ME = 'num.modular-exponentiation';
const XE = 'num.extended-euclid';
const ET = 'num.euclid-theorem';
const DH = 'num.diffie-hellman';
const ST = 'prob.stirling-formula';
const MV = 'num.modular-inverse';
const AX = 'prob.axioms';
const FT = 'num.fundamental-theorem';
const AC = 'prob.axiom-consequences';
const PB = 'num.prime-binomial';
const FL = 'num.fermat-little';
const IEN = 'prob.inclusion-exclusion';
const CT = 'prob.continuity';
const CPM = 'prob.conditional-probability';
const SB = 'prob.subadditivity';
const TP = 'prob.total-probability';
const IND = 'prob.independence';
const BF = 'prob.bayes-formula';
// Part V, group D
const PD = 'prob.poisson-distribution';
const PBL = 'prob.poisson-binomial-limit';
const PR = 'prob.poisson-rates';
const PGF = 'gf.pgf';
const RS = 'gf.random-sums';
const GCB = 'gf.combinatorial';
const BPX = 'bp.extinction';
const MGF = 'gf.mgf';
const WL = 'lim.weak-law';
const CLT = 'lim.clt';
const s4 = (x: number): number => Number(x.toPrecision(4));

export const GLOSSARY: readonly GlossaryEntry[] = [
  g(F, 'fraction', 'Fraction', t`A number of equal parts of a whole, written top over bottom.`, t`${frac(3, 4)} is three of four equal parts.`),
  g(F, 'numerator', 'Numerator', t`The top number of a fraction: how many parts you have.`, t`In ${frac(3, 4)} the numerator is ${3}.`, ['top']),
  g(F, 'denominator', 'Denominator', t`The bottom number of a fraction: how many equal parts make the whole.`, t`In ${frac(3, 4)} the denominator is ${4}.`, ['bottom']),
  g(F, 'lowest-terms', 'Lowest terms', t`A fraction is in lowest terms when no whole number except one divides both its top and its bottom.`, t`${frac(6, 8)} in lowest terms is ${q(6, 8)}.`, ['simplest form', 'simplify']),
  g(F, 'common-denominator', 'Common denominator', t`A denominator shared by two fractions after rewriting them, so they can be added or subtracted.`, t`${frac(1, 4)} and ${frac(1, 6)} share the common denominator ${12}: ${frac(3, 12)} and ${frac(2, 12)}.`),
  g(F, 'reciprocal', 'Reciprocal', t`A fraction turned upside down. A number times its reciprocal is one.`, t`The reciprocal of ${frac(2, 3)} is ${frac(3, 2)}.`),
  g(F, 'ratio', 'Ratio', t`A comparison of amounts by parts, written ${math`a : b`}.`, t`Sharing in the ratio ${math`${2} : ${3}`} gives the first person ${q(2, 5)} of the total.`),

  g(S, 'set', 'Set', t`A collection of things, written between curly brackets. Order and repeats do not matter.`, t`${setOf([1, 2, 3])} and ${setOf([3, 2, 1])} are the same set.`),
  g(S, 'element', 'Element', t`One of the things in a set. ${math`x \in A`} says ${mx} is an element of ${mA}; ${math`x \notin A`} says it is not.`, t`${math`${2} \in ${setOf([1, 2, 3])}`}.`, ['member', '∈']),
  g(S, 'universal-set', 'Universal set', t`The set of everything under discussion, written ${math`U`} or ${math`\xi`}. Complements are taken inside it.`, t`If ${math`\xi = ${setOf([1, 2, 3, 4])}`} and ${math`A = ${setOf([1, 2])}`}, then ${math`A' = ${setOf([3, 4])}`}.`, ['ξ']),
  g(S, 'union', 'Union', t`${math`A \cup B`}: everything in ${mA} or in ${mB} or in both.`, t`${math`${setOf([1, 2])} \cup ${setOf([2, 3])} = ${setOf([1, 2, 3])}`}.`, ['∪', 'or']),
  g(S, 'intersection', 'Intersection', t`${math`A \cap B`}: everything in both ${mA} and ${mB}.`, t`${math`${setOf([1, 2])} \cap ${setOf([2, 3])} = ${setOf([2])}`}.`, ['∩', 'and']),
  g(S, 'set-difference', 'Set difference', t`${math`A - B`}: everything in ${mA} that is not in ${mB}.`, t`${math`${setOf([1, 2, 3])} - ${setOf([2, 3, 4])} = ${setOf([1])}`}.`, ['difference', 'minus']),
  g(S, 'complement', 'Complement of a set', t`${math`\overline{A}`} or ${math`A'`}: everything in the universal set that is not in ${mA}, so ${math`U - A`}.`, t`If ${math`\xi = ${setOf([1, 2, 3, 4])}`} and ${math`A = ${setOf([1])}`}, then ${math`A' = ${setOf([2, 3, 4])}`}.`, ["A'", 'A bar']),
  g(S, 'empty-set', 'Empty set', t`The set with no elements, written ${math`\varnothing`}.`, t`${math`${setOf([1, 2])} \cap ${setOf([3, 4])} = \varnothing`}.`, ['∅']),
  g(S, 'venn-diagram', 'Venn diagram', t`A picture of sets as overlapping circles inside a box. The box is the universal set.`, t`The overlap of two circles shows their intersection.`, ['Venn']),

  g(C, 'product-rule', 'Product rule for counting', t`If one step can be done in ${math`m`} ways and then a second in ${mn} ways, both together can be done in ${math`m \times n`} ways.`, t`${3} shirts and ${2} pairs of trousers make ${math`${3} \times ${2} = ${3 * 2}`} outfits.`, ['multiplication principle']),
  g(C, 'outcome', 'Outcome', t`One possible result of a choice or an experiment.`, t`Rolling a die has ${6} outcomes.`),

  g(L, 'statement', 'Statement', t`A sentence that is either true or false.`, t`"${7} is prime" is a true statement.`, ['proposition']),
  g(L, 'open-sentence', 'Open sentence', t`A sentence with a variable whose truth depends on the variable's value, so it is not yet a statement.`, t`"${mx} is a multiple of ${7}" is true for ${mx} equal to ${14} and false for ${15}.`, ['predicate']),
  g(L, 'truth-value', 'Truth value', t`Whether a statement is true or false, written T or F.`, t`The truth value of "${math`${2} + ${2} = ${5}`}" is F, since ${math`${2} + ${2} = ${2 + 2}`}.`),
  g(L, 'conjunction', 'Conjunction (and)', t`"${mP} and ${mQ}", written ${math`P \land Q`}: true when both ${mP} and ${mQ} are true.`, t`"${4} is even and ${math`${4} > ${3}`}" is true.`, ['and', '∧']),
  g(L, 'disjunction', 'Disjunction (or)', t`"${mP} or ${mQ}", written ${math`P \lor Q`}: true when at least one is true, including when both are.`, t`"${4} is even or ${math`${4} > ${3}`}" is true, even though both parts are.`, ['or', '∨', 'inclusive or']),
  g(L, 'negation', 'Negation (not)', t`"not ${mP}", written ${math`\lnot P`}: true exactly when ${mP} is false.`, t`${math`\lnot (${3} > ${5})`} is true.`, ['not', '¬']),
  g(L, 'truth-table', 'Truth table', t`A table with one row for each combination of truth values, showing when a compound statement is true.`, t`With ${3} statements a truth table has ${math`${2}^{${3}} = ${2 ** 3}`} rows.`),

  g(A, 'expression', 'Expression', t`A combination of numbers, letters, and operations, with no equals sign.`, t`${cm(`${poly([3, 0])} + ${2}y`)} is an expression.`),
  g(A, 'coefficient', 'Coefficient', t`The number multiplying a letter in a term.`, t`In ${cm(poly([5, 0, 0]))} the coefficient of ${math`x^{${2}}`} is ${5}.`),
  g(A, 'like-terms', 'Like terms', t`Terms with exactly the same letters and powers. Only like terms can be added into one term.`, t`${cm(`${poly([5, 0])} + ${poly([2, 0])}`)} is ${cm(poly([5 + 2, 0]))}.`),
  g(A, 'identity', 'Identity', t`An equality that holds for every value of its letters, written with ${math`\equiv`}. An equation holds only for some values.`, t`${math`(x + ${1})^{${2}} \equiv x^{${2}} + ${2}x + ${1}`}, but ${math`x + ${1} = ${3}`} only when ${math`x = ${2}`}.`, ['≡', 'equivalent']),
  g(A, 'expand', 'Expand', t`Multiply out brackets and collect like terms.`, t`${cm(`(${factor(1)})(${factor(2)})`)} expands to ${cm(poly(times([1, 1], [1, 2])))}.`),
  g(A, 'factorise', 'Factorise', t`Write an expression as a product of factors; the reverse of expanding.`, t`${cm(poly(times([1, 2], [1, 3])))} factorises as ${cm(`(${factor(2)})(${factor(3)})`)}.`, ['factorize', 'factor']),

  g(B, 'set-builder', 'Set-builder notation', t`Describing a set by a property: ${math`\{x \in A \mid P(x)\}`} is the set of ${mx} in ${mA} for which ${math`P(x)`} is true.`, t`${math`\{x \in ${setOf([1, 2, 3, 4])} \mid x > ${2}\} = ${setOf([3, 4])}`}.`, ['comprehension', 'set comprehension']),
  g(B, 'membership', 'Membership', t`Whether something is an element of a set: a yes or no question.`, t`${math`${3} \in \{x \mid x \text{ is odd}\}`}, but ${math`${4} \notin \{x \mid x \text{ is odd}\}`}.`),

  g(K, 'arrangement', 'Arrangement', t`An ordering of objects in a row. Different orders count as different arrangements.`, t`ABC and BAC are two of the ${factorial(3)} arrangements of three letters.`, ['ordering', 'permutation']),
  g(K, 'factorial', 'Factorial', t`${math`n!`}, the product of the whole numbers from ${mn} down to one. It counts the arrangements of ${mn} different objects.`, t`${math`${5}! = ${factorial(5)}`}, and ${ident('0!', '1')} by definition.`, ['n!', '!']),

  g(I, 'power', 'Power', t`Repeated multiplication of a number by itself, written with an index.`, t`${math`${2}^{${5}} = ${2 ** 5}`}.`),
  g(I, 'base', 'Base', t`The number being multiplied in a power.`, t`In ${math`${2}^{${5}}`} the base is ${2}.`),
  g(I, 'index', 'Index', t`The small raised number in a power: how many copies of the base are multiplied. Also called the exponent.`, t`In ${math`${2}^{${5}}`} the index is ${5}.`, ['exponent', 'indices', 'power']),
  g(I, 'zero-index', 'Zero index', t`Any nonzero number to the power zero is one.`, t`${ident('7^0', '1')}.`),
  g(I, 'negative-index', 'Negative index', t`A negative index means one over the positive power. It never makes the number negative.`, t`${math`${2}^{${-3}} = ${q(1, 2 ** 3)}`}.`),
  g(I, 'fractional-index', 'Fractional index', t`An index of one over ${mn} means the ${mn}th root.`, t`${math`${9}^{${1}/${2}} = \sqrt{${9}} = ${Math.sqrt(9)}`}.`, ['root']),

  g(Q, 'sequence', 'Sequence', t`A list of numbers in a definite order.`, t`${seq(2, 2, 4)} is a sequence.`),
  g(Q, 'term', 'Term', t`One number in a sequence, named by its position.`, t`In ${seq(5, 3, 3)} the second term is ${5 + 3}.`),
  g(Q, 'term-to-term', 'Term-to-term rule', t`A rule for getting each term from the one before it.`, t`"Add ${3}" turns ${5} into ${5 + 3}.`),
  g(Q, 'position-to-term', 'Position-to-term rule', t`A formula for the term in position ${mn}; also called the ${mn}th term.`, t`With ${mn}th term ${cm(poly([3, 2], 'n'))}, term ${10} is ${3 * 10 + 2}.`, ['nth term']),
  g(Q, 'arithmetic-sequence', 'Arithmetic sequence', t`A sequence that adds the same number every time.`, t`${seq(5, 3, 4)} adds ${3} each time.`, ['linear sequence']),
  g(Q, 'common-difference', 'Common difference', t`The fixed amount added each time in an arithmetic sequence.`, t`In ${seq(5, 3, 3)} the common difference is ${3}.`),

  g(Q, 'triangular-number', 'Triangular number', t`A number ${math`t_k = ${0} + ${1} + \cdots + k`}, the count of dots in a triangle with ${math`k`} rows.`, t`${math`t_{${4}} = ${0} + ${1} + ${2} + ${3} + ${4} = ${10}`}.`, ['t_k']),
  g(P, 'probability', 'Probability', t`A number from zero to one that measures how likely an event is: zero is impossible, one is certain.`, t`A fair coin lands heads with probability ${q(1, 2)}.`),
  g(P, 'event', 'Event', t`A set of outcomes you are interested in, such as "the score is even".`, t`On a die, "even" is the event ${setOf([2, 4, 6])}.`),
  g(P, 'equally-likely', 'Equally likely', t`Outcomes with the same chance. Then a probability is favourable outcomes over all outcomes.`, t`The ${6} faces of a fair die are equally likely, so each has probability ${q(1, 6)}.`, ['fair']),
  g(P, 'complement-event', 'Complement of an event', t`The event "not ${mA}", which happens exactly when ${mA} does not. Its probability is one minus ${math`P(A)`}.`, t`${math`P(\text{not a six}) = ${sub(q(1), q(1, 6))}`} on a fair die.`, ['not A']),
  g(PH, 'pigeonhole-principle', 'Pigeonhole principle', t`If more than ${math`kn`} objects go into ${mn} boxes, some box holds more than ${math`k`}. With ${math`k = ${1}`}: ${math`n + ${1}`} letters in ${mn} pigeonholes put two letters in one pigeonhole.`, t`Among ${13} people, two were born in the same month.`, ['pigeonhole']),
  g(PH, 'worst-case', 'Worst case', t`The largest choice that still fails. One more than the worst case is the number that guarantees success.`, t`With red and blue socks, the worst case for a pair is one of each, so ${3} socks guarantee a pair.`),
  g(PH, 'proof-by-cases', 'Proof by cases', t`A proof that splits into cases covering every possibility, such as odd and even, and proves the claim in each.`, t`Every whole number is even or odd; check each case.`, ['cases', 'exhaustion']),
  g(BY, 'false-positive', 'False positive', t`A positive test result for someone who does not have the condition. A false negative is a negative result for someone who does.`, t`A test with ${98}% specificity gives ${2}% of healthy people a false positive.`, ['false negative']),
  g(BY, 'sensitivity', 'Sensitivity', t`The share of people with the condition whom a test correctly identifies: ${math`P(\text{positive} \mid \text{condition})`}.`, t`A sensitivity of ${99}% means ${99} in ${100} people with the disease test positive.`),
  g(BY, 'specificity', 'Specificity', t`The share of people without the condition whom a test correctly clears: ${math`P(\text{negative} \mid \text{no condition})`}.`, t`A specificity of ${98}% means ${98} in ${100} healthy people test negative.`),
  g(BY, 'prosecutors-fallacy', "Prosecutor's fallacy", t`Mistaking ${math`P(B \mid A)`} for ${math`P(A \mid B)`}, such as the chance of the evidence given innocence for the chance of innocence given the evidence.`, t`${math`P(\text{positive} \mid \text{disease}) = ${q(99, 100)}`}, yet ${math`P(\text{disease} \mid \text{positive}) = ${q(99, 2097)}`} for Mathmotitus.`, ['P(A|B) and P(B|A)']),
  g(EV, 'sigma-algebra', 'Sigma-algebra', t`A collection of subsets of ${math`\Omega`}, the events, that contains ${math`\Omega`} and is closed under complements and countable unions.`, t`On ${math`\Omega = ${setOf([1, 2, 3, 4, 5, 6])}`}, ${math`\{\varnothing, ${setOf([2, 4, 6])}, ${setOf([1, 3, 5])}, \Omega\}`} is a sigma-algebra.`, ['σ-algebra', 'event space', 'sigma field']),
  g(SS, 'sample-space', 'Sample space', t`The list of every possible outcome of an experiment, often a combined one such as rolling two dice.`, t`Two dice have ${math`${6} \times ${6} = ${36}`} ordered outcomes.`, ['possibility space', 'outcomes']),
  g(SS, 'sample-space-diagram', 'Sample space diagram', t`A table with one experiment's outcomes along the top and the other's down the side, one cell per combined outcome.`, t`For two dice, the cell in row ${2} and column ${5} is the outcome (${2}, ${5}), with total ${2 + 5}.`, ['possibility diagram', 'outcome grid']),
  g(IM, 'implication', 'Implication', t`"If ${mP} then ${mQ}", written ${math`P \Rightarrow Q`}: false only when ${mP} is true and ${mQ} is false.`, t`"If ${mx} is a multiple of ${6}, then ${mx} is even" is a true implication.`, ['conditional', 'if then', '⇒', 'implies']),
  g(IM, 'converse', 'Converse', t`The converse of ${math`P \Rightarrow Q`} is ${math`Q \Rightarrow P`}. It is a different statement, and can be false when the original is true.`, t`"If ${mx} is even, then ${mx} is a multiple of ${6}" is the converse of a true statement, and is false at ${math`x = ${4}`}.`),
  g(IM, 'modus-ponens', 'Modus ponens', t`The rule of deduction: from ${mP} and ${math`P \Rightarrow Q`}, conclude ${mQ}.`, t`From "${7} is odd" and "if ${mx} is odd then ${math`x^{${2}}`} is odd", conclude that ${math`${7}^{${2}} = ${49}`} is odd.`),
  g(PF, 'prime-number', 'Prime number', t`A whole number greater than one whose only positive divisors are one and itself. One is not prime.`, t`${listOf([2, 3, 5, 7, 11])} are the first five primes; ${9} is not prime, since ${math`${9} = ${3} \times ${3}`}.`, ['prime', 'primes']),
  g(PF, 'prime-factorisation', 'Prime factorisation', t`A whole number written as a product of primes. Every whole number greater than one has one, and only one apart from the order.`, t`${math`${60} = ${2} \times ${2} \times ${3} \times ${5}`}.`, ['prime factors', 'prime decomposition']),
  g(PF, 'index-form', 'Index form', t`A prime factorisation with repeated primes written as powers.`, t`${math`${60} = ${2}^{${2}} \times ${3} \times ${5}`}.`, ['prime power form']),
  g(TD, 'tree-diagram', 'Tree diagram', t`A diagram of an experiment in stages: each stage branches into its outcomes, labelled with their probabilities. Multiply along a path; add the paths you want.`, t`Two fair coins: the path head then head has probability ${math`${q(1, 2)} \times ${q(1, 2)} = ${q(1, 4)}`}.`, ['tree', 'branch', 'probability tree']),
  g(TD, 'without-replacement', 'Without replacement', t`Taking items one at a time without putting them back, so each draw changes what is left for the next.`, t`From ${3} red and ${2} blue, red then red without replacement has probability ${math`\frac{${3}}{${5}} \times \frac{${2}}{${4}} = ${q(3 * 2, 5 * 4)}`}.`, ['with replacement', 'dependent']),
  g(AR, 'parity', 'Parity', t`Whether an integer is even or odd. An integer is even if it is ${math`${2}k`} and odd if it is ${math`${2}k + ${1}`} for some integer ${math`k`}.`, t`${7} and ${-3} have the same parity: both are odd.`, ['even', 'odd']),
  g(AR, 'consecutive', 'Consecutive integers', t`Integers that follow one another, written ${math`n, n + ${1}, n + ${2}`}, and so on.`, t`Of any three consecutive integers, one is a multiple of ${3}: in ${listOf([7, 8, 9])} it is ${9}.`, ['consecutive']),
  g(NS, 'natural-number', 'Natural numbers', t`The numbers ${math`\mathbb{N} = \{${0}, ${1}, ${2}, \ldots\}`}, generated from zero by adding one. The CST notes include ${0}; Book of Proof starts at ${1}.`, t`${0} and ${7} are natural numbers; ${math`${-1}`} and ${q(1, 2)} are not.`, ['N', 'ℕ', 'naturals']),
  g(NS, 'integer', 'Integers', t`The whole numbers, positive, negative, and zero: ${math`\mathbb{Z} = \{\ldots, ${-1}, ${0}, ${1}, \ldots\}`}.`, t`${math`${-3}`} is an integer but not a natural number.`, ['Z', 'ℤ', 'whole numbers']),
  g(NS, 'rational-number', 'Rational numbers', t`Numbers ${math`\frac{m}{n}`} with ${math`m`} and ${math`n`} integers and ${math`n \ne ${0}`}, written ${math`\mathbb{Q}`}.`, t`${q(-2, 3)} and ${5} are rational; ${math`\sqrt{${2}}`} is not.`, ['Q', 'ℚ', 'rationals', 'fractions']),
  g(NS, 'closed', 'Closed under an operation', t`A set is closed under an operation if combining any two of its elements always gives an element of the set.`, t`${math`\mathbb{Z}`} is closed under subtraction, but ${math`\mathbb{N}`} is not: ${math`${2} - ${3} = ${-1}`}.`, ['closure']),
  g(NS, 'additive-inverse', 'Inverse (additive, multiplicative)', t`An additive inverse of ${mx} is a ${math`y`} with ${math`x + y = ${0}`}; a multiplicative inverse, or reciprocal, has ${math`x \cdot y = ${1}`}.`, t`In ${math`\mathbb{Q}`}, ${q(2, 3)} has additive inverse ${q(-2, 3)} and multiplicative inverse ${q(3, 2)}.`, ['negative', 'multiplicative inverse', 'inverse']),
  g(SG, 'sigma-notation', 'Sigma notation', t`${math`\sum_{i = m}^{n} a_i`} means ${math`a_m + a_{m + ${1}} + \cdots + a_n`}: the term for each value of the index from ${math`m`} to ${mn}, added.`, t`${math`\sum_{i = ${1}}^{${4}} i^{${2}} = ${1} + ${4} + ${9} + ${16} = ${1 + 4 + 9 + 16}`}.`, ['Σ', 'sum', 'summation']),
  g(SG, 'index-variable', 'Index of a sum', t`The variable that runs through the values in a sum. Its name does not matter: renaming it gives the same sum.`, t`In ${math`\sum_{i = ${1}}^{n} i`} the index is ${math`i`}, running from ${1} to ${mn}.`, ['dummy variable', 'index']),
  g(SG, 'telescoping', 'Telescoping sum', t`A sum of differences ${math`\sum \big(f(i + ${1}) - f(i)\big)`} in which everything cancels except the first and last pieces.`, t`${math`\sum_{i = ${1}}^{n} \left(\frac{${1}}{i} - \frac{${1}}{i + ${1}}\right) = ${1} - \frac{${1}}{n + ${1}}`}.`, ['telescope']),
  g(CB, 'combination', 'Combination', t`A selection of objects in which order does not matter, such as a committee or a hand of cards.`, t`From A, B, C there are ${3} combinations of two: AB, AC, BC.`, ['selection', 'unordered']),
  g(CB, 'binomial-coefficient', 'Binomial coefficient', t`${math`\binom{n}{r} = \frac{n!}{r!\,(n - r)!}`}, read "${mn} choose ${math`r`}": the number of ways to choose ${math`r`} objects from ${mn}, order not mattering.`, t`${math`\binom{${5}}{${2}} = \frac{${5} \times ${4}}{${2}} = ${10}`}.`, ['n choose r', 'nCr', 'choose', 'C(n, r)']),
  g(CU, 'countable', 'Countable set', t`A set whose elements can be listed as a sequence ${math`a_{${1}}, a_{${2}}, a_{${3}}, \ldots`} (finite or infinite).`, t`${math`\mathbb{Z}`} is countable: ${math`${0}, ${1}, ${-1}, ${2}, ${-2}, \ldots`} lists it.`, ['countably infinite', 'listable']),
  g(CU, 'infinitely-often', 'Infinitely often', t`A point lies in ${math`A_n`} infinitely often if, for every ${math`N`}, it lies in some ${math`A_n`} with ${math`n \ge N`}: it keeps coming back.`, t`If ${math`A_n`} is the even numbers for even ${math`n`} and the odd numbers for odd ${math`n`}, every number is in ${math`A_n`} infinitely often.`, ['i.o.', 'limsup']),
  g(IF, 'biconditional', 'If and only if', t`"${mP} if and only if ${mQ}", written ${math`P \Leftrightarrow Q`}: both ${math`P \Rightarrow Q`} and ${math`Q \Rightarrow P`}. True when ${mP} and ${mQ} have the same truth value.`, t`An integer ${mn} is even if and only if ${math`n^{${2}}`} is even.`, ['iff', '⇔', 'biconditional', 'equivalent']),
  g(IF, 'sufficient-condition', 'Sufficient condition', t`${mA} is sufficient for ${mB} if ${math`A \Rightarrow B`}: ${mA} on its own guarantees ${mB}.`, t`Being divisible by ${4} is sufficient for being even.`, ['sufficient']),
  g(IF, 'necessary-condition', 'Necessary condition', t`${mA} is necessary for ${mB} if ${math`B \Rightarrow A`}: ${mB} cannot hold without ${mA}.`, t`Being even is necessary for being divisible by ${4}, but not sufficient: ${2} is even.`, ['necessary']),
  g(QU, 'quantifier', 'Quantifier', t`A phrase that says which values a statement is about: ${math`\forall`} (for all) or ${math`\exists`} (there exists), over a stated set.`, t`${math`\forall x \in \mathbb{Z}.\ x^{${2}} \ge ${0}`} is true; ${math`\exists x \in \mathbb{Z}.\ x^{${2}} = ${2}`} is false.`, ['for all', 'there exists', '∀', '∃']),
  g(QU, 'witness', 'Witness', t`A value that makes a "there exists" statement true, given to prove it.`, t`${math`x = ${2}`} is a witness for ${math`\exists x \in \mathbb{N}.\ x^{${2}} = ${4}`}.`, ['example']),
  g(QU, 'counterexample', 'Counterexample', t`A value that makes a "for all" statement false. One is enough to disprove it.`, t`${math`x = ${0}`} is a counterexample to ${math`\forall x \in \mathbb{R}.\ x^{${2}} > ${0}`}.`),
  g(DP, 'direct-proof', 'Direct proof', t`A proof of "if ${mP} then ${mQ}" that assumes ${mP} and deduces ${mQ} step by step, using definitions and facts already proved.`, t`Assume ${math`a \mid b`} and ${math`a \mid c`}; then ${math`b + c = a(x + y)`}, so ${math`a \mid (b + c)`}.`, ['direct']),
  g(DP, 'scratch-work', 'Scratch work', t`The rough working that finds a proof: trying cases, algebra, working back from the goal. It is not itself the proof, which is written in sentences.`, t`Trying ${math`k = ${1}, ${2}, ${3}`} suggests the witness ${math`i = k + ${1}`}; the proof then shows it works for every ${math`k`}.`, ['rough work']),
  g(DP, 'lemma', 'Lemma', t`A true statement proved in order to help prove others. A theorem is an important one; a corollary follows simply from one.`, t`Euclid's lemma: if a prime divides ${math`ab`}, it divides ${math`a`} or ${math`b`}.`, ['theorem', 'corollary', 'proposition']),
  g(AS, 'arithmetic-series', 'Arithmetic series', t`The sum of the terms of an arithmetic sequence. With ${mn} terms, first ${math`a`} and last ${math`l`}, it is ${math`\frac{n(a + l)}{${2}}`}.`, t`${math`${1} + ${2} + \cdots + ${100} = \frac{${100} \times ${101}}{${2}} = ${5050}`}.`, ['series', 'sum of an arithmetic sequence']),
  g(NQ, 'dependent-witness', 'Witness that depends on a variable', t`In ${math`\forall x\ \exists y`}, the witness ${math`y`} is chosen after ${mx} and may depend on it; in ${math`\exists y\ \forall x`}, one ${math`y`} must work for every ${mx}.`, t`${math`\forall x \in \mathbb{Z}\ \exists y \in \mathbb{Z}.\ y > x`} is true with ${math`y = x + ${1}`}; ${math`\exists y\ \forall x.\ y > x`} is false.`, ['order of quantifiers', 'nested quantifiers']),
  g(GS, 'geometric-series', 'Geometric series', t`The sum of the terms of a geometric sequence. With first term ${math`a`}, ratio ${math`r \ne ${1}`}, and ${mn} terms, it is ${math`\frac{a(${1} - r^{n})}{${1} - r}`}.`, t`${math`${1} + ${2} + ${4} + ${8} = \frac{${2}^{${4}} - ${1}}{${2} - ${1}} = ${15}`}.`, ['GP', 'geometric progression']),
  g(GS, 'common-ratio', 'Common ratio', t`The fixed number each term of a geometric sequence is multiplied by to give the next.`, t`In ${listOf([3, 6, 12, 24])} the common ratio is ${2}.`, ['ratio']),
  g(BI, 'pascals-triangle', "Pascal's triangle", t`The binomial coefficients in rows: row ${mn} holds ${math`\binom{n}{${0}}, \ldots, \binom{n}{n}`}. Each entry is the sum of the two above it.`, t`Row ${4} is ${listOf([1, 4, 6, 4, 1])}.`, ['Pascal']),
  g(BI, 'pascals-rule', "Pascal's rule", t`${math`\binom{n + ${1}}{k} = \binom{n}{k} + \binom{n}{k - ${1}}`}: a subset of ${math`n + ${1}`} things either contains a fixed thing or not.`, t`${math`\binom{${5}}{${2}} = \binom{${4}}{${2}} + \binom{${4}}{${1}} = ${6} + ${4} = ${10}`}.`, ['Pascal identity']),
  g(EV, 'partition', 'Partition', t`A split of a set into nonempty blocks that do not overlap and together make up the whole set.`, t`${setOf([1, 2])}, ${setOf([3])}, ${setOf([4, 5])} is a partition of ${setOf([1, 2, 3, 4, 5])}.`, ['blocks']),
  g(TW, 'two-way-table', 'Two-way table', t`A table that counts a population split two ways at once: one way along the rows, the other along the columns, often with totals.`, t`Rows for juniors and seniors, columns for walks and does not walk.`, ['contingency table', 'table of counts']),
  g(TW, 'conditional-probability', 'Conditional probability', t`${math`P(A \mid B)`}, the probability of ${mA} given that ${mB} happened: restrict to the outcomes in ${mB}, and find the share of them in ${mA}.`, t`If ${12} of ${30} walkers are juniors, ${math`P(\text{junior} \mid \text{walks}) = ${q(12, 30)}`}.`, ['given that', 'P(A|B)']),
  g(BT, 'binomial-theorem', 'Binomial theorem', t`${math`(x + y)^{n} = \sum_{k=${0}}^{n} \binom{n}{k} x^{n - k} y^{k}`} for every natural number ${mn}: the term with ${math`y^{k}`} appears once for each way to choose which ${math`k`} brackets give ${math`y`}.`, t`${math`(x + y)^{${3}} = x^{${3}} + ${3}x^{${2}}y + ${3}xy^{${2}} + y^{${3}}`}.`, ['binomial expansion theorem']),
  g(BT, 'binomial-expansion', 'Binomial expansion', t`A power of a sum, such as ${math`(a + b)^{n}`}, multiplied out term by term with the binomial coefficients.`, t`${math`(x + ${2})^{${2}} = x^{${2}} + ${4}x + ${4}`}.`, ['expansion']),
  g(EQ, 'logically-equivalent', 'Logically equivalent', t`Two statements are logically equivalent when they have the same truth value in every row of the truth table, whatever the truth values of their letters.`, t`${math`P \Rightarrow Q`} and ${math`\lnot P \lor Q`} are logically equivalent.`, ['equivalent', 'logical equivalence', '≡']),
  g(EQ, 'de-morgans-laws', "De Morgan's laws", t`${math`\lnot (P \land Q)`} is equivalent to ${math`\lnot P \lor \lnot Q`}, and ${math`\lnot (P \lor Q)`} to ${math`\lnot P \land \lnot Q`}: to negate, negate each part and swap "and" with "or".`, t`The negation of "${mx} is even and ${mx} is prime" is "${mx} is odd or ${mx} is not prime".`, ['De Morgan']),
  g(EQ, 'contrapositive', 'Contrapositive', t`The contrapositive of ${math`P \Rightarrow Q`} is ${math`\lnot Q \Rightarrow \lnot P`}. It is logically equivalent to the original; the converse is not.`, t`The contrapositive of "if ${math`x = ${2}`} then ${math`x^{${2}} = ${4}`}" is "if ${math`x^{${2}} \ne ${4}`} then ${math`x \ne ${2}`}".`),
  g(PC, 'exhaustive-cases', 'Exhaustive cases', t`Cases are exhaustive when at least one of them holds in every situation, so proving the goal in each case proves it always.`, t`${mn} even and ${mn} odd are exhaustive cases for an integer ${mn}; so are the remainders ${listOf([0, 1, 2])} on division by ${3}.`, ['cover every case', 'exhaustion']),
  g(PC, 'without-loss-of-generality', 'Without loss of generality', t`A phrase that treats one of several cases that are the same up to renaming, and leaves the others to the reader.`, t`For "opposite parity means an odd sum": without loss of generality ${math`m`} is even and ${mn} is odd.`, ['WLOG']),
  g(NG, 'negation-of-quantifier', 'Negating a quantifier', t`${math`\lnot \forall x.\ P(x)`} is ${math`\exists x.\ \lnot P(x)`}, and ${math`\lnot \exists x.\ P(x)`} is ${math`\forall x.\ \lnot P(x)`}: each quantifier swaps as the "not" moves in.`, t`The negation of "every real number has a cube root" is "some real number has no cube root".`, ['negation', 'negate', 'not for all']),
  g(CE, 'disproof', 'Disproof', t`Showing that a statement is false. For a claim about every case, one counterexample is a disproof; for "if A then B" it must make A true and B false.`, t`${2} disproves "every prime is odd".`, ['disprove', 'prove or disprove']),
  g(CD, 'proof-by-contradiction', 'Proof by contradiction', t`A proof of ${mP} that assumes ${mP} is false and deduces something impossible, so ${mP} must be true.`, t`Assume ${math`\sqrt{${2}} = \frac{a}{b}`} in lowest terms; then ${math`a`} and ${math`b`} are both even, which is impossible.`, ['contradiction proof', 'reductio ad absurdum', 'indirect proof']),
  g(CD, 'contradiction', 'Contradiction', t`A statement that cannot be true, such as "${mQ} and not ${mQ}": reaching one shows an assumption was false.`, t`"${math`a`} and ${math`b`} are not both even, and both are even."`, ['absurd']),
  g(RA, 'repeated-letter', 'Arrangements with repeats', t`${mn} objects with ${math`r_{${1}}, r_{${2}}, \ldots`} identical copies of each kind have ${math`\frac{n!}{r_{${1}}! \, r_{${2}}! \cdots}`} distinct arrangements: each distinct one appears once per order of the copies.`, t`ANNA has ${math`\frac{${4}!}{${2}! \times ${2}!} = ${factorial(4) / 4}`} arrangements.`, ['repeated objects', 'permutations with repetition', 'multinomial']),
  g(IN, 'induction', 'Proof by induction', t`To prove ${math`P(m)`} for every natural number ${math`m`}: prove ${math`P(${0})`} (or ${math`P(\ell)`} for a later basis), and prove that ${math`P(n)`} implies ${math`P(n + ${1})`} for every ${mn}.`, t`${math`${1} + ${3} + \cdots + (${2}n - ${1}) = n^{${2}}`}: true for ${math`n = ${1}`}, and adding ${math`${2}k + ${1}`} to ${math`k^{${2}}`} gives ${math`(k + ${1})^{${2}}`}.`, ['mathematical induction', 'principle of induction']),
  g(IN, 'base-case', 'Base case', t`The first value an induction proves directly, ${math`P(${0})`} or ${math`P(\ell)`}. Without it a valid inductive step proves nothing.`, t`For ${math`${2}^{n} > n^{${2}}`} when ${math`n \ge ${5}`}, the base case is ${math`${2 ** 5} > ${5 ** 2}`}.`, ['basis']),
  g(IN, 'induction-hypothesis', 'Induction hypothesis', t`The assumption ${math`P(k)`} in the inductive step, used to prove ${math`P(k + ${1})`}.`, t`Assume ${math`${1} + \cdots + k = \frac{k(k + ${1})}{${2}}`}; add ${math`k + ${1}`} to get the formula for ${math`k + ${1}`}.`, ['inductive hypothesis', 'IH', 'inductive step']),
  g(CP, 'favourable-outcome', 'Favourable outcome', t`An outcome in the event you want. With equally likely outcomes, the probability is the number of favourable outcomes over the number of all outcomes.`, t`Picking ${2} of ${5} balls numbered ${1} to ${5}, the favourable outcomes for "the largest is ${4}" are the ${3} pairs that contain ${4} and a smaller ball, out of ${10}.`, ['favourable', 'counting outcomes']),
  g(CN, 'proof-by-contrapositive', 'Proof by contrapositive', t`A proof of "if ${mP} then ${mQ}" that assumes not ${mQ} and deduces not ${mP}: it proves the contrapositive, which is equivalent.`, t`To show "if ${math`n^{${2}}`} is even then ${mn} is even", show "if ${mn} is odd then ${math`n^{${2}}`} is odd".`, ['contrapositive proof', 'contraposition']),
  g(IE, 'independent-events', 'Independent events', t`${mA} and ${mB} are independent when ${math`P(A \cap B) = P(A)P(B)`}: knowing one happened does not change the chance of the other.`, t`For two fair dice, "the first is even" and "the total is seven" are independent: ${math`${q(1, 12)} = ${q(1, 2)} \times ${q(1, 6)}`}.`, ['independent', 'independence']),
  g(IX, 'inclusion-exclusion', 'Inclusion-exclusion', t`The size or probability of a union, found by adding the single events, subtracting the pairwise overlaps, adding the triple overlaps, and so on with alternating signs.`, t`${math`P(A \cup B \cup C) = \sum P(A) - \sum P(A \cap B) + P(A \cap B \cap C)`}.`, ['inclusion exclusion', 'principle of inclusion and exclusion', 'PIE']),
  g(QP, 'arbitrary-element', 'Arbitrary element', t`An element about which a proof assumes nothing except where it comes from, so whatever is proved for it holds for every element. How a "for all" statement is proved.`, t`"Let ${mn} be an arbitrary integer. Then ${math`n^{${2}} + n = n(n + ${1})`} is a product of consecutive integers, so it is even."`, ['arbitrary', 'let x be']),
  g(QP, 'unique-existence', 'Unique existence', t`${math`\exists!\, x.\ P(x)`}: exactly one ${mx} has the property. A proof shows existence (a witness) and uniqueness (any two that work are equal).`, t`For each real ${math`x \ne ${2}`} there is exactly one ${math`y`} with ${math`\frac{${2}y}{y + ${1}} = x`}, namely ${math`y = \frac{x}{${2} - x}`}.`, ['unique', 'exactly one', '∃!']),
  g(CL, 'sample-space-classical', 'Classical probability', t`A model with a finite sample space ${math`\Omega`} of equally likely outcomes, where an event is a subset ${math`A`} and ${math`P(A) = |A| / |\Omega|`}.`, t`For two fair dice, ${math`\Omega`} is the ${36} ordered pairs, and "a double" is a subset of ${6}, so its probability is ${q(6, 36)}.`, ['equally likely outcomes', 'finite sample space']),
  g(EU, 'euclids-theorem', "Euclid's theorem", t`There are infinitely many primes: for any finite list of primes, their product plus one has a prime factor that is not in the list.`, t`From ${listOf([2, 3, 5])}: ${math`${2} \times ${3} \times ${5} + ${1} = ${31}`}, a new prime.`, ['infinitely many primes', 'infinitude of primes']),
  g(BP, 'index-shift', 'Shifting an index', t`Renaming the index of a sum, such as ${math`j = k + ${1}`}, so that its terms line up with another sum's; the limits shift with it.`, t`${math`\sum_{k = ${0}}^{n} a_{k + ${1}} = \sum_{j = ${1}}^{n + ${1}} a_{j}`}.`, ['reindexing', 'change of index', 'substitution in a sum']),
  g(SI, 'strong-induction', 'Strong induction', t`To prove ${math`P(m)`} for every ${math`m \ge \ell`}: prove ${math`P(\ell)`}, and prove that ${math`P(k)`} for every ${math`k`} from ${math`\ell`} to ${mn} implies ${math`P(n + ${1})`}.`, t`Every ${math`n \ge ${2}`} is a product of primes: a composite ${math`n + ${1} = pq`} has both factors smaller, and the hypothesis covers them.`, ['complete induction', 'course-of-values induction', 'strong induction hypothesis']),
  g(DV, 'divides', 'Divides', t`${math`d \mid n`}, "${math`d`} divides ${mn}", when ${math`n = k d`} for some integer ${math`k`}. A statement about two integers, true or false, not an operation.`, t`${math`${3} \mid ${12}`} because ${math`${12} = ${4} \times ${3}`}; and ${math`${5} \mid ${0}`} because ${math`${0} = ${0} \times ${5}`}.`, ['divisible', 'divisor', 'factor', 'multiple', '|']),
  g(CF, 'multiplication-rule', 'Multiplication rule', t`${math`P(A \cap B) = P(A \mid B)\,P(B)`}: the chance of both is the chance of the first times the chance of the second given the first. Along a sequence, each factor is conditional on everything before it.`, t`Two red counters from ${4} red and ${3} blue, without replacement: ${math`\frac{${4}}{${7}} \times \frac{${3}}{${6}} = ${q(2, 7)}`}.`, ['product rule for probability', 'chain rule']),
  g(DT, 'quotient-remainder', 'Quotient and remainder', t`For a natural number ${math`m`} and positive ${mn}, the unique ${math`q \ge ${0}`} and ${math`${0} \le r < n`} with ${math`m = qn + r`}, written ${math`\mathrm{quo}(m, n)`} and ${math`\mathrm{rem}(m, n)`}.`, t`${math`${17} = ${5} \times ${3} + ${2}`}, so ${math`\mathrm{quo}(${17}, ${3}) = ${5}`} and ${math`\mathrm{rem}(${17}, ${3}) = ${2}`}.`, ['quo', 'rem', 'remainder', 'quotient', 'division algorithm']),
  g(DT, 'loop-invariant', 'Invariant', t`A property that holds at every step of an algorithm. If it holds at the start and each step keeps it, it holds at the end, where it says the answer is right.`, t`Dividing ${17} by ${3} by subtraction keeps ${math`${17} = q \times ${3} + r`}: ${math`(${0}, ${17}), (${1}, ${14}), \ldots, (${5}, ${2})`}.`, ['loop invariant', 'invariant property']),
  g(BD, 'bernoulli-trial', 'Trial', t`One run of an experiment with two results, success or failure. In a binomial model the trials are independent and each succeeds with the same probability ${math`p`}.`, t`Each of three dice is a trial; "a six" is a success, with ${math`p = ${q(1, 6)}`}.`, ['Bernoulli trial', 'success', 'failure']),
  g(BD, 'binomial-distribution', 'Binomial distribution', t`${math`B(n, p)`}, the number of successes in ${mn} independent trials each with success probability ${math`p`}: ${math`P(X = k) = \binom{n}{k} p^{k}(${1} - p)^{n - k}`}.`, t`The number of sixes in three dice is ${math`B(${3}, ${q(1, 6)})`}, and ${math`P(X = ${1}) = \frac{${75}}{${216}}`}.`, ['binomial', 'B(n, p)']),
  g(CG, 'congruent-mod', 'Congruent modulo m', t`${math`a \equiv b \pmod{m}`} when ${math`m \mid a - b`}: equivalently, ${math`a`} and ${math`b`} leave the same remainder on division by ${math`m`}.`, t`${math`${17} \equiv -${4} \pmod{${3}}`}, since ${math`${17} - (-${4}) = ${21} = ${7} \times ${3}`}.`, ['congruence', 'congruent', 'mod', 'modulo', '≡']),
  g(GC, 'common-divisor', 'Common divisor', t`A number that divides both of two given numbers. The set of them is ${math`\mathrm{CD}(m, n)`}.`, t`${math`\mathrm{CD}(${12}, ${18}) = ${setOf([1, 2, 3, 6])}`}.`, ['CD(m, n)', 'common factor']),
  g(GC, 'gcd', 'Greatest common divisor', t`${math`\gcd(m, n)`}: a common divisor of ${math`m`} and ${mn} that every common divisor divides. For positive numbers it is also the largest common divisor.`, t`${math`\gcd(${12}, ${18}) = ${6}`}, and ${1}, ${2}, ${3}, ${6} all divide ${6}.`, ['gcd', 'highest common factor', 'hcf']),
  g(MA, 'reduce-mod', 'Reducing modulo m', t`Replacing a number in a sum, product, or power base by anything congruent to it modulo ${math`m`}, usually its remainder. The result is congruent to the original.`, t`${math`${1234} \times ${5678} \equiv ${1} \times ${8} = ${8} \pmod{${9}}`}, since ${math`${1234} \equiv ${1}`} and ${math`${5678} \equiv ${8}`}.`, ['modular arithmetic', 'working mod m', 'reduce']),
  g(EA, 'euclids-algorithm', "Euclid's algorithm", t`Find ${math`\gcd(m, n)`} by replacing ${math`(m, n)`} with ${math`(n, \mathrm{rem}(m, n))`} until ${mn} divides ${math`m`}; that last ${mn} is the gcd. Each step keeps the common divisors.`, t`${math`\gcd(${34}, ${13}) = \gcd(${13}, ${8}) = \gcd(${8}, ${5}) = \gcd(${5}, ${3}) = \gcd(${3}, ${2}) = \gcd(${2}, ${1}) = ${1}`}.`, ['Euclidean algorithm', 'gcd algorithm']),
  g(SM, 'sampling-model', 'Sampling models', t`The four ways to choose ${math`k`} things from ${mn}: ordered or unordered, with or without replacement. They give ${math`n^{k}`}, ${math`n(n - ${1})\cdots(n - k + ${1})`}, ${math`\binom{n + k - ${1}}{k}`}, and ${math`\binom{n}{k}`} samples.`, t`Two letters from ${math`\{a, b, c\}`}: ${9} ordered with replacement, ${6} ordered without, ${6} unordered with, ${3} unordered without.`, ['ordered sample', 'unordered sample', 'with replacement', 'without replacement']),
  g(SM, 'stars-and-bars', 'Stars and bars', t`A multiset of ${math`k`} items from ${mn} kinds is a row of ${math`k`} stars and ${math`n - ${1}`} bars, so there are ${math`\binom{n + k - ${1}}{k}`} of them.`, t`Two scoops from three flavours: ${math`\binom{${4}}{${2}} = ${6}`} orders.`, ['multiset', 'combinations with repetition']),
  g(MI, 'integers-mod-m', 'Integers modulo m', t`${math`\mathbb{Z}_{m} = \{${0}, ${1}, \ldots, m - ${1}\}`}, with addition and multiplication followed by taking the remainder mod ${math`m`}. Book of Proof writes its elements as classes ${math`[a]`}.`, t`In ${math`\mathbb{Z}_{${5}}`}, ${math`${3} +_{${5}} ${4} = ${2}`} and ${math`${3} \cdot_{${5}} ${4} = ${2}`}.`, ['Z_m', 'Z_n', 'modular integers', 'residues']),
  g(ME, 'repeated-squaring', 'Repeated squaring', t`Computing ${math`a^{k} \bmod m`} from the squares ${math`a, a^{${2}}, a^{${4}}, \ldots`}, each reduced mod ${math`m`}, multiplying those that the binary digits of ${math`k`} pick out. About ${math`${2}\log_{${2}} k`} multiplications.`, t`${math`${3}^{${13}} = ${3}^{${8}} \cdot ${3}^{${4}} \cdot ${3}`}, since ${math`${13} = ${8} + ${4} + ${1}`}.`, ['square and multiply', 'fast exponentiation', 'binary exponentiation', 'modular exponentiation']),
  g(XE, 'linear-combination', 'Integer linear combination', t`A number of the form ${math`sm + tn`} with integers ${math`s`} and ${math`t`}, the coefficients. The combinations of ${math`m`} and ${mn} are exactly the multiples of ${math`\gcd(m, n)`}.`, t`${math`${2} = ${3} \cdot ${30} - ${4} \cdot ${22}`} is a combination of ${30} and ${22}.`, ['Bezout coefficients', 'Bezout identity', 'linear combination']),
  g(XE, 'extended-euclid', 'Extended Euclidean algorithm', t`Euclid's algorithm with each remainder kept as a combination ${math`sm + tn`} of the inputs, so that it ends with ${math`\gcd(m, n) = sm + tn`}.`, t`${math`\gcd(${34}, ${13}) = ${1} = ${5} \cdot ${34} - ${13} \cdot ${13}`}.`, ['egcd', 'extended Euclid', 'back-substitution']),
  g(ET, 'coprime', 'Coprime', t`Two integers are coprime when their greatest common divisor is ${1}: they share no prime factor.`, t`${8} and ${15} are coprime; ${8} and ${12} are not, since ${math`\gcd(${8}, ${12}) = ${4}`}.`, ['relatively prime', 'gcd 1']),
  g(ET, 'euclids-lemma', "Euclid's theorem on divisors", t`If ${math`k \mid mn`} and ${math`\gcd(k, m) = ${1}`}, then ${math`k \mid n`}. For a prime ${math`p`}: if ${math`p \mid mn`} then ${math`p \mid m`} or ${math`p \mid n`}.`, t`${math`${7} \mid ${3}n`} forces ${math`${7} \mid n`}; but ${math`${4} \mid ${2} \times ${2}`} while ${math`${4} \nmid ${2}`}.`, ["Euclid's lemma", 'prime divides a product']),
  g(DH, 'diffie-hellman', 'Diffie-Hellman key exchange', t`Agreeing a secret in public: with public ${math`p`} and ${math`c`}, one party sends ${math`[c^{a}]_{p}`} and the other ${math`[c^{b}]_{p}`}; each raises what it receives to its own secret, and both get ${math`[c^{ab}]_{p}`}.`, t`${math`p = ${23}`}, ${math`c = ${5}`}, ${math`a = ${6}`}, ${math`b = ${15}`}: they send ${8} and ${19}, and share ${2}.`, ['Diffie-Hellman', 'key exchange', 'shared secret']),
  g(DH, 'discrete-logarithm', 'Discrete logarithm', t`Given ${math`c`}, ${math`p`}, and ${math`\alpha`}, an exponent ${math`a`} with ${math`[c^{a}]_{p} = \alpha`}. No fast method is known for large primes, which keeps Diffie-Hellman safe.`, t`${math`[${5}^{a}]_{${23}} = ${8}`} for ${math`a = ${6}`}.`, ['discrete log']),
  g(ST, 'stirlings-formula', "Stirling's formula", t`${math`n! \sim \sqrt{${2}\pi n}\,(n/e)^{n}`}: the ratio of the two sides tends to ${1}. It gives ${math`\binom{${2}m}{m} \sim ${4}^{m}/\sqrt{\pi m}`}.`, t`${math`${10}! = ${3628800}`}, and ${math`\sqrt{${20}\pi}\,(${10}/e)^{${10}} \approx ${3598696}`}.`, ['Stirling', 'Stirling approximation']),
  g(ST, 'asymptotic', 'Asymptotically equal', t`${math`a_{n} \sim b_{n}`} means ${math`a_{n} / b_{n} \to ${1}`} as ${math`n \to \infty`}: the relative error tends to ${0}, even if the difference does not.`, t`${math`n^{${2}} + n \sim n^{${2}}`}, although their difference ${mn} grows.`, ['~', 'asymptotic to', 'asymptotically']),
  g(MV, 'modular-inverse', 'Inverse modulo m', t`An ${math`x`} with ${math`n x \equiv ${1} \pmod{m}`}. It exists exactly when ${math`\gcd(m, n) = ${1}`}, and the extended Euclidean algorithm finds it.`, t`${math`${7} \times ${23} = ${161} = ${4} \times ${40} + ${1}`}, so ${23} is the inverse of ${7} modulo ${40}.`, ['multiplicative inverse', 'reciprocal mod m', 'inverse']),
  g(MV, 'field', 'Field', t`A number system where you can add, subtract, multiply, and divide by anything except ${0}: every nonzero element has a multiplicative inverse. ${math`\mathbb{Z}_{p}`} is a field for every prime ${math`p`}.`, t`In ${math`\mathbb{Z}_{${7}}`}, ${math`${3}^{-${1}} = ${5}`}; in ${math`\mathbb{Z}_{${6}}`}, ${2} has no inverse, so ${math`\mathbb{Z}_{${6}}`} is not a field.`, ['Z_p is a field']),
  g(AX, 'probability-measure', 'Probability measure', t`A function ${math`\mathbb{P}`} on the events with ${math`\mathbb{P}(A) \ge ${0}`}, ${math`\mathbb{P}(\Omega) = ${1}`}, and countable additivity. On a countable ${math`\Omega`} it is given by point masses ${math`p_{\omega} \ge ${0}`} adding to ${1}.`, t`${math`\mathbb{P}(\{k\}) = ${2}^{-k}`} on ${math`\{${1}, ${2}, \ldots\}`} is a probability measure: the masses add to ${1}.`, ['axioms of probability', 'probability space']),
  g(AX, 'countable-additivity', 'Countable additivity', t`For pairwise disjoint events ${math`A_{${1}}, A_{${2}}, \ldots`}: ${math`\mathbb{P}\left(\bigcup_{n} A_{n}\right) = \sum_{n} \mathbb{P}(A_{n})`}. The axiom that lets probabilities of infinite unions be computed.`, t`If ${math`\mathbb{P}(A_{n}) = ${3}^{-n}`} for disjoint events, their union has probability ${q(1, 2)}.`, ['sigma-additivity', 'countably additive']),
  g(FT, 'fundamental-theorem-arithmetic', 'Fundamental theorem of arithmetic', t`Every integer ${math`n \ge ${2}`} is a product of primes, and the primes and their exponents are the same in every such product. Existence is by strong induction; uniqueness needs Euclid's theorem.`, t`${math`${360} = ${2}^{${3}} \cdot ${3}^{${2}} \cdot ${5}`}, and no other product of primes gives ${360}.`, ['FTA', 'unique factorisation', 'unique prime factorisation']),
  g(AC, 'monotonicity', 'Monotonicity', t`If ${math`A \subseteq B`} then ${math`\mathbb{P}(A) \le \mathbb{P}(B)`}: ${math`B`} is ${math`A`} together with the disjoint event ${math`B \setminus A`}, whose probability is at least ${0}.`, t`"Two sixes" lies inside "at least one six", so it is no more likely.`, ['monotone', 'monotonic']),
  g(PB, 'prime-divides-binomial', 'A prime divides its inner binomial coefficients', t`For a prime ${math`p`} and ${math`${0} < k < p`}, ${math`p \mid \binom{p}{k}`}: from ${math`k\binom{p}{k} = p\binom{p - ${1}}{k - ${1}}`} and ${math`\gcd(p, k) = ${1}`}.`, t`Row ${5} is ${listOf([1, 5, 10, 10, 5, 1])}: the inner entries are multiples of ${5}.`, ['p divides C(p, k)', 'Lemma 28']),
  g(FL, 'fermats-little-theorem', "Fermat's little theorem", t`For a prime ${math`p`}: ${math`i^{p} \equiv i \pmod{p}`} for every integer ${math`i`}, and ${math`i^{p - ${1}} \equiv ${1} \pmod{p}`} when ${math`p \nmid i`}.`, t`${math`${3}^{${6}} = ${729} = ${104} \times ${7} + ${1}`}, so ${math`${3}^{${6}} \equiv ${1} \pmod{${7}}`}.`, ['FLT', 'Fermat']),
  g(FL, 'freshmans-dream', "Freshman's Dream", t`For a prime ${math`p`}: ${math`(m + n)^{p} \equiv m^{p} + n^{p} \pmod{p}`}, because every inner coefficient ${math`\binom{p}{k}`} of the expansion is a multiple of ${math`p`}.`, t`${math`(m + n)^{${3}} = m^{${3}} + ${3}m^{${2}}n + ${3}mn^{${2}} + n^{${3}} \equiv m^{${3}} + n^{${3}} \pmod{${3}}`}.`, ['Dropout Lemma']),
  g(IEN, 'inclusion-exclusion-formula', 'Inclusion-exclusion formula', t`${math`\mathbb{P}\left(\bigcup_{i = ${1}}^{n} A_{i}\right) = \sum_{k = ${1}}^{n} (-${1})^{k + ${1}} S_{k}`}, where ${math`S_{k}`} is the sum of the probabilities of all intersections of ${math`k`} of the events.`, t`For three events, ${math`S_{${1}} - S_{${2}} + S_{${3}}`}.`, ['inclusion-exclusion for n events', 'general inclusion-exclusion']),
  g(IEN, 'derangement', 'Derangement', t`An arrangement that leaves nothing in its original place. A random arrangement of ${mn} things is one with probability ${math`\sum_{k = ${0}}^{n} (-${1})^{k}/k!`}, close to ${math`e^{-${1}}`}.`, t`Of the ${6} arrangements of ${listOf([1, 2, 3])}, two are derangements: ${math`${2}${3}${1}`} and ${math`${3}${1}${2}`}.`, ['no fixed point', 'matching problem', 'hat-check problem']),
  g(CT, 'continuity-of-probability', 'Continuity of probability', t`For increasing events, ${math`\mathbb{P}(A_{n}) \to \mathbb{P}\left(\bigcup_{n} A_{n}\right)`}; for decreasing events, ${math`\mathbb{P}(A_{n}) \to \mathbb{P}\left(\bigcap_{n} A_{n}\right)`}.`, t`${math`\mathbb{P}(\text{a head within } n \text{ tosses}) = ${1} - ${2}^{-n} \to ${1}`}: a head eventually appears with probability ${1}.`, ['continuity', 'continuity from below', 'continuity from above']),
  g(CPM, 'conditional-measure', 'Conditional probability measure', t`For ${math`\mathbb{P}(B) > ${0}`}, the map ${math`A \mapsto \mathbb{P}(A \mid B)`} is itself a probability measure, so every rule of probability holds for probabilities given ${math`B`}.`, t`${math`\mathbb{P}(A^{c} \mid B) = ${1} - \mathbb{P}(A \mid B)`}, and disjoint events add given ${math`B`}.`, ['P(. | B)', 'conditioning']),
  g(SB, 'union-bound', 'Union bound', t`Countable subadditivity: ${math`\mathbb{P}\left(\bigcup_{n} A_{n}\right) \le \sum_{n} \mathbb{P}(A_{n})`} for any events, disjoint or not.`, t`Among ${10} people, some two share a birthday with probability at most ${math`\binom{${10}}{${2}}/${365} = ${q(45, 365)}`}.`, ['subadditivity', 'Boole inequality', 'countable subadditivity']),
  g(TP, 'law-of-total-probability', 'Law of total probability', t`If ${math`B_{${1}}, B_{${2}}, \ldots`} partition ${math`\Omega`}, then ${math`\mathbb{P}(A) = \sum_{i} \mathbb{P}(A \mid B_{i})\mathbb{P}(B_{i})`}: the chance of ${math`A`} in each case, weighted by the chance of the case.`, t`Urn ${1} (chosen with probability ${q(1, 2)}) has ${q(3, 5)} red, urn ${2} has ${q(1, 4)} red: ${math`\mathbb{P}(\text{red}) = ${q(3, 5)} \cdot ${q(1, 2)} + ${q(1, 4)} \cdot ${q(1, 2)} = ${q(17, 40)}`}.`, ['total probability', 'partition theorem']),
  g(IND, 'mutual-independence', 'Mutual independence', t`Events are mutually independent when every subfamily's intersection has probability equal to the product of their probabilities: every pair, every triple, and so on.`, t`Three separate fair coins: each pair and all three multiply, ${math`\frac{${1}}{${8}} = \frac{${1}}{${2}} \cdot \frac{${1}}{${2}} \cdot \frac{${1}}{${2}}`}.`, ['independence of several events', 'mutually independent']),
  g(IND, 'pairwise-independence', 'Pairwise independence', t`Each pair of the events is independent. It does not imply mutual independence: the triple may fail.`, t`Two fair coins: "first a head", "second a head", "they agree" are pairwise independent, but all three happen with probability ${q(1, 4)}, not ${q(1, 8)}.`, ['pairwise independent']),
  g(BF, 'bayes-formula', "Bayes's formula", t`For a partition ${math`B_{${1}}, B_{${2}}, \ldots`}: ${math`\mathbb{P}(B_{i} \mid A) = \mathbb{P}(A \mid B_{i})\mathbb{P}(B_{i}) / \sum_{j} \mathbb{P}(A \mid B_{j})\mathbb{P}(B_{j})`}. It turns the chance of the evidence given each cause into the chance of each cause given the evidence.`, t`Urns chosen equally, urn ${1} with ${q(3, 4)} red, urn ${2} with ${q(1, 4)}: a red ball came from urn ${1} with probability ${math`\frac{${q(3, 8)}}{${q(3, 8)} + ${q(1, 8)}} = ${q(3, 4)}`}.`, ["Bayes' theorem", 'Bayes rule', 'inverse probability']),
  g(BF, 'prior-posterior', 'Prior and posterior', t`The prior probability of a cause is its probability before the evidence; the posterior is its conditional probability given the evidence, by Bayes's formula.`, t`A coin is biased with prior ${q(1, 2)}; after three heads, with heads probability ${q(3, 4)} if biased, the posterior is ${math`\frac{${27}}{${27} + ${8}} = ${q(27, 35)}`}.`, ['prior', 'posterior', 'updating']),
  // Part V, group A (glossary-partv-a.ts)
  ...PARTV_A_GLOSSARY,
  // Part V, group B: continuous random variables (glossary-partv-b.ts)
  ...PARTV_B_GLOSSARY,
  // Part V, group C (glossary-partv-c.ts)
  ...GLOSSARY_PARTV_C,
  // Part V, group D
  g(PD, 'poisson-distribution', 'Poisson distribution', t`${math`X \sim \text{Po}(\lambda)`} when ${math`P(X = k) = e^{-\lambda}\lambda^{k}/k!`} for ${math`k = ${0}, ${1}, ${2}, \ldots`}. It counts independent occurrences in an interval; its mean and its variance are both ${math`\lambda`}.`, t`With ${math`\lambda = ${2}`}, ${math`P(X = ${0}) = e^{-${2}} \approx ${s4(Math.exp(-2))}`}.`, ['Po(lambda)', 'Poisson']),
  g(PBL, 'poisson-approximation', 'Poisson approximation to the binomial', t`For large ${mn} and small ${math`p`}, ${math`B(n, p)`} probabilities are close to those of ${math`\text{Po}(np)`}. Exactly: for fixed ${math`\lambda`} and ${math`k`}, ${math`P(B(n, \lambda/n) = k) \to e^{-\lambda}\lambda^{k}/k!`} as ${math`n \to \infty`}.`, t`For ${math`B(${100}, ${0.02})`}, ${math`P(X = ${0}) = ${0.98}^{${100}} \approx ${s4(0.98 ** 100)}`}, against ${math`e^{-${2}} \approx ${s4(Math.exp(-2))}`}.`, ['Poisson limit', 'law of small numbers']),
  g(PR, 'poisson-rate', 'Poisson rate', t`Events occur at rate ${math`\lambda`} per unit of time, length, or area when the count in a region of size ${math`s`} is ${math`\text{Po}(\lambda s)`} and counts in disjoint regions are independent.`, t`Texts at ${3} an hour: in twenty minutes the count is ${math`\text{Po}(${1})`}, and none arrive with probability ${math`e^{-${1}} \approx ${s4(Math.exp(-1))}`}.`, ['rate', 'scaling a Poisson mean', 'Poisson process']),
  g(PR, 'thinning', 'Thinning', t`Keep each of a ${math`\text{Po}(\lambda)`} number of points independently with probability ${math`p`}: the kept points are ${math`\text{Po}(\lambda p)`}, the others ${math`\text{Po}(\lambda(${1} - p))`}, and the two counts are independent.`, t`Misprints ${math`\text{Po}(${4})`}, each caught with probability ${q(3, 4)}: caught ${math`\text{Po}(${3})`}, missed ${math`\text{Po}(${1})`}.`, ['colouring', 'splitting a Poisson count']),
  g(PGF, 'pgf', 'Probability generating function', t`For ${math`X`} with values ${math`${0}, ${1}, ${2}, \ldots`}: ${math`G_{X}(t) = E(t^{X}) = \sum_{k} P(X = k)t^{k}`}. It determines the distribution, ${math`G_{X}'(${1}) = E(X)`}, and ${math`G_{X + Y} = G_{X}G_{Y}`} for independent ${math`X`} and ${math`Y`}.`, t`A fair die has ${math`G(t) = \frac{t + t^{${2}} + \cdots + t^{${6}}}{${6}}`}, and ${math`G'(${1}) = \frac{${1} + ${2} + \cdots + ${6}}{${6}} = ${q(7, 2)}`}.`, ['pgf', 'generating function', 'G_X(t)']),
  g(RS, 'random-sum', 'Random sum', t`${math`S_{N} = X_{${1}} + \cdots + X_{N}`} with ${math`N`} independent of the independent, identically distributed ${math`X_{i}`}: ${math`G_{S_{N}}(t) = G_{N}(G_{X}(t))`}, ${math`E(S_{N}) = E(N)E(X)`}, and ${math`\operatorname{Var}(S_{N}) = E(N)\operatorname{Var}(X) + \operatorname{Var}(N)E(X)^{${2}}`}.`, t`${math`N \sim \text{Po}(${4})`} and each ${math`X_{i}`} is ${0} or ${1} with probability ${q(1, 2)}: ${math`G_{S}(t) = e^{${4}((${1} + t)/${2} - ${1})} = e^{${2}(t - ${1})}`}, so ${math`S_{N} \sim \text{Po}(${2})`}.`, ['random sum formula', 'compound distribution']),
  g(GCB, 'ordinary-generating-function', 'Generating function of a sequence', t`The power series ${math`\sum_{n} a_{n}x^{n}`}. When ${math`a_{n}`} counts selections of total ${mn}, independent choices multiply their generating functions, and the count is read off as a coefficient.`, t`Ways to pay ${4} pence with ${1}p and ${2}p coins: the coefficient of ${math`x^{${4}}`} in ${math`\frac{${1}}{(${1} - x)(${1} - x^{${2}})}`}, which is ${3}.`, ['coefficient extraction', 'counting generating function']),
  g(BPX, 'branching-process', 'Branching process', t`Each individual of a generation has a random number of offspring, independently, with pgf ${math`G`}. The size ${math`Z_{n}`} of generation ${mn}, from one ancestor, has pgf ${math`G \circ G \circ \cdots \circ G`}, with ${mn} copies.`, t`Offspring ${0} or ${2}, each with probability ${q(1, 2)}: ${math`G(t) = \frac{${1} + t^{${2}}}{${2}}`}, so ${math`P(Z_{${2}} = ${0}) = G(G(${0})) = ${q(5, 8)}`}.`, ['Galton-Watson process', 'generation sizes']),
  g(BPX, 'extinction-probability', 'Extinction probability', t`The probability that a branching process eventually dies out. It is the smallest root of ${math`t = G(t)`} in ${math`[${0}, ${1}]`}, and it is ${1} exactly when the mean number of offspring is at most ${1} (unless every individual has exactly one child).`, t`${math`G(t) = \frac{${1}}{${4}} + \frac{${1}}{${4}}t + \frac{${1}}{${2}}t^{${2}}`}: ${math`t = G(t)`} becomes ${math`(${2}t - ${1})(t - ${1}) = ${0}`}, so the extinction probability is ${q(1, 2)}.`, ['probability of extinction', 'dying out']),
  g(MGF, 'mgf', 'Moment generating function', t`${math`M_{X}(\theta) = E(e^{\theta X})`}. When it is finite on an interval around ${0}, its derivatives at ${0} are the moments, ${math`M_{X}^{(k)}(${0}) = E(X^{k})`}, it determines the distribution, and ${math`M_{X + Y} = M_{X}M_{Y}`} for independent ${math`X`} and ${math`Y`}.`, t`${math`N(\mu, \sigma^{${2}})`} has ${math`M(\theta) = e^{\mu\theta + \sigma^{${2}}\theta^{${2}}/${2}}`}; ${math`\text{Po}(\lambda)`} has ${math`M(\theta) = e^{\lambda(e^{\theta} - ${1})}`}.`, ['mgf', 'moment generating function']),
  g(MGF, 'chernoff-bound', 'Chernoff bound', t`${math`P(X \ge x) \le e^{-\theta x}M_{X}(\theta)`} for every ${math`\theta \ge ${0}`}, by Markov's inequality applied to ${math`e^{\theta X}`}; then choose the ${math`\theta`} that makes the bound smallest.`, t`For ${math`X \sim \text{Po}(${1})`}, the best bound on ${math`P(X \ge ${4})`} is ${math`e^{${3}}/${4}^{${4}} \approx ${s4(Math.exp(3) / 256)}`}; the true value is about ${s4(1 - Math.exp(-1) * (1 + 1 + 1 / 2 + 1 / 6))}.`, ['exponential Markov bound', 'Chernoff']),
  g(MGF, 'continuity-theorem', 'Continuity theorem', t`If ${math`M_{X_{n}}(\theta) \to M_{X}(\theta)`} for every ${math`\theta`} in an interval around ${0}, then ${math`P(X_{n} \le x) \to P(X \le x)`} at every ${math`x`} where ${math`P(X \le x)`} is continuous in ${math`x`}. Stated without proof in the IA course.`, t`${math`B(n, \lambda/n)`} has ${math`M(\theta) = \left(${1} + \frac{\lambda(e^{\theta} - ${1})}{n}\right)^{n} \to e^{\lambda(e^{\theta} - ${1})}`}, the Poisson mgf.`, ['Levy continuity', 'convergence of mgfs']),
  g(WL, 'weak-law', 'Weak law of large numbers', t`For independent, identically distributed ${math`X_{i}`} with mean ${math`\mu`} and finite variance, the sample mean ${math`\bar{X}_{n}`} satisfies ${math`P(|\bar{X}_{n} - \mu| > \varepsilon) \to ${0}`} for every ${math`\varepsilon > ${0}`}.`, t`For a fair die, Chebyshev gives ${math`P(|\bar{X}_{n} - ${q(7, 2)}| \ge ${q(1, 2)}) \le \frac{${q(35, 12)}}{n/${4}}`}, which is ${q(7, 60)} at ${math`n = ${100}`}.`, ['law of large numbers', 'WLLN']),
  g(WL, 'convergence-in-probability', 'Convergence in probability', t`${math`Y_{n} \to c`} in probability when ${math`P(|Y_{n} - c| > \varepsilon) \to ${0}`} for every ${math`\varepsilon > ${0}`}.`, t`The proportion of heads in ${mn} fair tosses tends to ${q(1, 2)} in probability.`, ['in probability']),
  g(CLT, 'central-limit-theorem', 'Central limit theorem', t`For independent, identically distributed ${math`X_{i}`} with mean ${math`\mu`} and variance ${math`\sigma^{${2}}`} in ${math`(${0}, \infty)`}: ${math`P\left(\frac{S_{n} - n\mu}{\sigma\sqrt{n}} \le x\right) \to \Phi(x)`} for every ${math`x`}.`, t`${100} fair tosses: ${math`P(S \le ${55}) \approx \Phi\left(\frac{${55} - ${50}}{${5}}\right) = \Phi(${1}) \approx ${s4(Phi(1))}`}.`, ['CLT', 'normal approximation for sums']),
];

export function glossaryEntry(id: string): GlossaryEntry | undefined {
  return GLOSSARY.find((e) => e.id === id);
}

/** Search by term, alias, and definition, best match first. */
export function searchGlossary(query: string): GlossaryEntry[] {
  const s = query.trim().toLowerCase();
  if (s === '') return [...GLOSSARY];
  const score = (e: GlossaryEntry): number => {
    const names = [e.term, ...(e.aliases ?? [])].map((x) => x.toLowerCase());
    if (names.some((n) => n === s)) return 3;
    if (names.some((n) => n.startsWith(s))) return 2;
    if (names.some((n) => n.includes(s))) return 1.5;
    const def = e.definition.map((x) => x.text).join('').toLowerCase();
    return def.includes(s) ? 1 : 0;
  };
  return GLOSSARY.map((e) => ({ e, s: score(e) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.e);
}
