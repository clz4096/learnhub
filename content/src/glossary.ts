/**
 * Glossary: one entry per term the lessons mark as [[id|text]]. Definitions are one or two
 * plain sentences; examples use computed numbers like the lessons do.
 */
import { factorial, q, sub } from './math';
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
  g(EV, 'partition', 'Partition', t`A split of a set into nonempty blocks that do not overlap and together make up the whole set.`, t`${setOf([1, 2])}, ${setOf([3])}, ${setOf([4, 5])} is a partition of ${setOf([1, 2, 3, 4, 5])}.`, ['blocks']),
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
