/**
 * Glossary entries for the Preparation group A topics (algebra, functions, and
 * inequalities: STEP Support Foundation Blocks 1 to 5). Kept in their own file so the
 * shared glossary changes by one import and one spread; checked like every other entry.
 */
import type { GlossaryEntry } from './glossary';
import { math, t, type Rich } from './rich';

const g = (topic: string, id: string, term: string, definition: Rich, example: Rich, aliases?: readonly string[]): GlossaryEntry =>
  (aliases === undefined ? { id, term, definition, example, topic } : { id, term, definition, example, topic, aliases });

const SU = 'alg.surds';
const LQ = 'ineq.linear-quadratic';
const SL = 'geom.straight-lines';
const QG = 'fn.quadratic-graphs';
const PF = 'pre.primes-and-factors';
const RM = 'pre.remainders';
const FL = 'fn.floor-function';
const LD = 'num.linear-diophantine';
const PO = 'alg.polynomials';
const PR = 'ineq.polynomial-regions';
const SE = 'alg.simultaneous-equations';
const EL = 'alg.exp-and-ln';
const RI = 'ineq.rational';
const RC = 'alg.roots-coefficients';
const HL = 'pre.hcf-lcm';
const FN = 'fn.functions';
const EE = 'alg.exponential-equations';
const SQ = 'alg.surd-equations';
const FA = 'alg.factorisations';
const PA = 'alg.partial-fractions';
const MO = 'fn.modulus';
const MR = 'fn.modulus-regions';

export const GLOSSARY_PREP_A: readonly GlossaryEntry[] = [
  g(SU, 'surd', 'Surd', t`A square root ${math`\sqrt{n}`} of a positive integer ${math`n`} that is not a perfect square, so it is irrational and is kept as a root. An expression ${math`a + b\sqrt{n}`} with rational ${math`a, b`} is in surd form.`, t`${math`\sqrt{${50}} = \sqrt{${25}}\sqrt{${2}} = ${5}\sqrt{${2}}`}.`, ['square root', 'radical', 'surd form']),
  g(SU, 'conjugate', 'Conjugate', t`The conjugate of ${math`p + q\sqrt{n}`} is ${math`p - q\sqrt{n}`}; their product ${math`p^{${2}} - q^{${2}}n`} has no surd.`, t`${math`(${3} + \sqrt{${5}})(${3} - \sqrt{${5}}) = ${9} - ${5} = ${4}`}.`, ['surd conjugate']),
  g(SU, 'rationalise-denominator', 'Rationalising the denominator', t`Rewriting a fraction so that no surd is left in its denominator, by multiplying the top and bottom by the conjugate of the denominator.`, t`${math`\frac{${1}}{${3} + \sqrt{${5}}} = \frac{${3} - \sqrt{${5}}}{${4}}`}.`, ['rationalise', 'rationalize']),
  g(LQ, 'inequality', 'Inequality', t`A statement comparing two expressions with ${math`<`}, ${math`>`}, ${math`\le`}, or ${math`\ge`}. Its solution set is every real number that makes it true; multiplying both sides by a negative number reverses it.`, t`${math`-${3}x < -${6}`} becomes ${math`x > ${2}`} on dividing by ${math`-${3}`}.`, ['solution set', 'inequation']),
  g(LQ, 'critical-value', 'Critical value', t`A value of ${math`x`} where an expression is ${0} or undefined: the only places its sign can change, so an inequality is solved by testing the stretches between them.`, t`${math`(x + ${1})(x - ${4}) > ${0}`} has critical values ${math`-${1}`} and ${4}, and holds for ${math`x < -${1}`} or ${math`x > ${4}`}.`, ['critical point', 'boundary value']),
  g(SL, 'gradient', 'Gradient', t`The steepness of a line: the rise divided by the run between two of its points, ${math`m = \frac{y_{${2}} - y_{${1}}}{x_{${2}} - x_{${1}}}`}.`, t`From ${math`(${1}, ${2})`} to ${math`(${3}, ${8})`} the gradient is ${math`\frac{${6}}{${2}} = ${3}`}.`, ['slope', 'steepness']),
  g(SL, 'perpendicular-gradients', 'Perpendicular gradients', t`Two lines with gradients ${math`m_{${1}}`} and ${math`m_{${2}}`} meet at right angles exactly when ${math`m_{${1}}m_{${2}} = -${1}`}: each gradient is the negative reciprocal of the other.`, t`${math`y = ${2}x`} and ${math`y = -\frac{${1}}{${2}}x`} are perpendicular.`, ['perpendicular', 'negative reciprocal']),
  g(SL, 'distance-formula', 'Distance formula', t`The distance between ${math`(x_{${1}}, y_{${1}})`} and ${math`(x_{${2}}, y_{${2}})`} is ${math`\sqrt{(x_{${2}} - x_{${1}})^{${2}} + (y_{${2}} - y_{${1}})^{${2}}}`}, by Pythagoras.`, t`From ${math`(${1}, ${1})`} to ${math`(${4}, ${5})`}: ${math`\sqrt{${9} + ${16}} = ${5}`}.`, ['distance between two points']),
  g(QG, 'completing-the-square', 'Completing the square', t`Rewriting ${math`ax^{${2}} + bx + c`} as ${math`a(x - h)^{${2}} + k`}. Since a square is never negative, it shows the least (or greatest) value ${math`k`}, at ${math`x = h`}.`, t`${math`x^{${2}} - ${8}x + ${21} = (x - ${4})^{${2}} + ${5}`}, so its least value is ${5}.`, ['completed square form', 'complete the square']),
  g(QG, 'vertex', 'Vertex of a parabola', t`The turning point ${math`(h, k)`} of ${math`y = a(x - h)^{${2}} + k`}: its lowest point if ${math`a > ${0}`}, its highest if ${math`a < ${0}`}.`, t`${math`y = x^{${2}} - ${8}x + ${21}`} has vertex ${math`(${4}, ${5})`}.`, ['turning point of a parabola']),
  g(PF, 'factor', 'Factor', t`${math`d`} is a factor (or divisor) of ${math`n`} if ${math`n = dk`} for some integer ${math`k`}: ${math`d`} goes into ${math`n`} exactly.`, t`The positive factors of ${12} are ${1}, ${2}, ${3}, ${4}, ${6}, and ${12}.`, ['divisor']),
  g(PF, 'multiple', 'Multiple', t`${math`n`} is a multiple of ${math`d`} if ${math`n = dk`} for some integer ${math`k`}.`, t`The positive multiples of ${4} are ${4}, ${8}, ${12}, and so on.`),
  g(PF, 'composite-number', 'Composite number', t`An integer ${math`n \ge ${2}`} that is not prime: it is a product ${math`ab`} of two integers with ${math`${1} < a, b < n`}.`, t`${math`${91} = ${7} \times ${13}`} is composite.`, ['composite']),
  g(RM, 'quotient', 'Quotient', t`In ${math`n = dq + r`} with ${math`${0} \le r < d`}, the quotient is ${math`q`}: how many whole ${math`d`}'s fit into ${math`n`}.`, t`${math`${23} = ${4} \times ${5} + ${3}`}: the quotient of ${23} by ${4} is ${5}.`),
  g(RM, 'remainder', 'Remainder', t`In ${math`n = dq + r`} with ${math`${0} \le r < d`}, the remainder is ${math`r`}: what is left after taking out as many ${math`d`}'s as possible. It is never negative.`, t`${math`-${7} = ${3} \times (-${3}) + ${2}`}, so ${math`-${7}`} leaves remainder ${2} on division by ${3}.`),
  g(FL, 'floor-function', 'Floor function', t`${math`[x]`} or ${math`\lfloor x \rfloor`}: the greatest integer at most ${math`x`}, the integer ${math`n`} with ${math`n \le x < n + ${1}`}.`, t`${math`[\pi] = ${3}`}, ${math`[${5}] = ${5}`}, ${math`[-${2.5}] = -${3}`}.`, ['integer part', 'floor', 'greatest integer function']),
  g(FL, 'step-function', 'Step function', t`A function that is constant on each of a sequence of intervals and jumps between them, so its graph is a staircase of separate flat pieces.`, t`${math`y = [x]`} is ${2} on ${math`${2} \le x < ${3}`} and jumps to ${3} at ${math`x = ${3}`}.`, ['staircase function']),
  g(LD, 'diophantine-equation', 'Linear Diophantine equation', t`An equation ${math`ax + by = c`} with integer coefficients, to be solved in integers. If ${math`a`} and ${math`b`} share no factor and ${math`(x_{${0}}, y_{${0}})`} is one solution, all are ${math`(x_{${0}} + bk, y_{${0}} - ak)`}.`, t`${math`${4}p + ${5}q = ${54}`}: from ${math`(${6}, ${6})`} come ${math`(${1}, ${10})`} and ${math`(${11}, ${2})`}.`, ['Diophantine equation', 'integer solutions']),
  g(LD, 'particular-solution', 'Particular solution', t`One specific solution of an equation, from which the general solution is built.`, t`${math`N = -${2}`}, ${math`m = -${1}`} is a particular solution of ${math`${8}N = ${81}m + ${65}`}.`),
  g(PO, 'polynomial', 'Polynomial', t`A sum ${math`a_{n}x^{n} + \cdots + a_{${1}}x + a_{${0}}`} of whole-number powers of ${math`x`} times constants; its degree is the highest power with a non-zero coefficient.`, t`${math`x^{${3}} - ${2}x^{${2}} - ${5}x + ${6}`} is a polynomial of degree ${3}.`, ['cubic', 'quartic', 'degree']),
  g(PO, 'factor-theorem', 'Factor theorem', t`${math`x - a`} is a factor of a polynomial ${math`p(x)`} exactly when ${math`p(a) = ${0}`}.`, t`${math`f(${3}) = ${0}`} for ${math`f(x) = x^{${3}} - ${2}x^{${2}} - ${5}x + ${6}`}, so ${math`x - ${3}`} divides it.`),
  g(PO, 'remainder-theorem', 'Remainder theorem', t`The remainder on dividing a polynomial ${math`p(x)`} by ${math`x - a`} is ${math`p(a)`}.`, t`${math`x^{${2}} + ${1}`} divided by ${math`x - ${2}`} leaves remainder ${math`${2}^{${2}} + ${1} = ${5}`}.`),
  g(PR, 'sign-diagram', 'Sign diagram', t`A number line marked with the roots of an expression and its sign (plus or minus) on each interval between them. The sign flips across a root of odd multiplicity and not across one of even multiplicity.`, t`${math`(x + ${2})(x - ${1})(x - ${3})`}: minus, plus, minus, plus from left to right.`, ['sign chart', 'sign table']),
  g(PR, 'region-test-point', 'Test point', t`A point inside a region bounded by the curves where an expression is ${0}, used to find the sign of the expression throughout that region.`, t`For ${math`(x - ${2}y)(x - y) \le ${0}`}, the point ${math`(${3}, ${2})`} gives ${math`-${1}`}, so its region is shaded.`, ['test a point', 'region test']),
  g(SE, 'simultaneous-equations', 'Simultaneous equations', t`Several equations in several unknowns, to be satisfied all at once; a solution gives every unknown a value that makes every equation true.`, t`${math`x + y = ${3}`} and ${math`x - y = -${1}`} have the solution ${math`x = ${1}`}, ${math`y = ${2}`}.`, ['system of equations']),
  g(SE, 'elimination', 'Elimination', t`Solving simultaneous linear equations by adding or subtracting multiples of them to remove one unknown at a time. Each such step keeps exactly the same solutions.`, t`Adding ${math`a + b - c = ${2}`} and ${math`a - b + c = ${0}`} eliminates ${math`b`} and ${math`c`}: ${math`${2}a = ${2}`}.`, ['eliminate']),
  g(EL, 'exponential-function', 'Exponential function', t`${math`e^{x}`}, where ${math`e`} is about ${Number(Math.E.toFixed(4))}: defined for every real ${math`x`}, always positive, and with gradient equal to its value at every point.`, t`${math`e^{${0}} = ${1}`} and ${math`e^{${1}} = e`}.`, ['e^x', 'exp']),
  g(EL, 'natural-logarithm', 'Natural logarithm', t`For ${math`x > ${0}`}, ${math`\ln x`} is the number ${math`y`} with ${math`e^{y} = x`}: the inverse of the exponential function.`, t`${math`\ln ${1} = ${0}`} and ${math`\ln e = ${1}`}.`, ['ln', 'log base e']),
  g(EL, 'laws-of-logarithms', 'Laws of logarithms', t`${math`\ln(ab) = \ln a + \ln b`}, ${math`\ln\frac{a}{b} = \ln a - \ln b`}, and ${math`\ln(a^{k}) = k\ln a`}, for positive ${math`a`} and ${math`b`}; the same hold in any base.`, t`${math`\ln ${6} + \ln ${4} - \ln ${3} = \ln ${8}`}.`, ['log laws', 'change of base']),
  g(RI, 'rational-inequality', 'Rational inequality', t`An inequality with the unknown in a denominator. Solve it by multiplying by the square of the denominator, or by a sign diagram whose critical values include the zeros of the denominator, which are never solutions.`, t`${math`x + \frac{${1}}{x} > ${2}`} holds exactly for ${math`x > ${0}`}, ${math`x \ne ${1}`}.`, ['inequality with fractions']),
  g(RC, 'vieta-formulas', 'Roots and coefficients', t`For ${math`ax^{${2}} + bx + c`} with roots ${math`\alpha, \beta`}: ${math`\alpha + \beta = -\frac{b}{a}`} and ${math`\alpha\beta = \frac{c}{a}`}. For a monic cubic ${math`x^{${3}} + bx^{${2}} + cx + d`}: the roots sum to ${math`-b`}, their pairwise products to ${math`c`}, and their product is ${math`-d`}.`, t`${math`x^{${2}} - ${7}x + ${10}`} has roots with sum ${7} and product ${10}: ${2} and ${5}.`, ["Vieta's formulas", 'sum and product of roots']),
  g(HL, 'hcf', 'Highest common factor', t`The largest positive integer dividing both of two numbers. From prime factorisations, take the lower power of each prime.`, t`${math`\text{HCF}(${12}, ${18}) = ${6}`}.`, ['HCF', 'greatest common divisor']),
  g(HL, 'lcm', 'Lowest common multiple', t`The smallest positive integer that both of two numbers divide. From prime factorisations, take the higher power of each prime; and ${math`\text{HCF} \times \text{LCM} = ab`}.`, t`${math`\text{LCM}(${12}, ${18}) = ${36}`}.`, ['LCM', 'least common multiple']),
  g(FN, 'function-domain-range', 'Function, domain, and range', t`A function assigns to each input in its domain exactly one output; the range is the set of all outputs.`, t`${math`f(y) = ${1} + y^{${2}}`} on all reals has range ${math`f \ge ${1}`}.`, ['function', 'domain', 'range', 'codomain']),
  g(FN, 'composite-function', 'Composite function', t`${math`fg(x) = f(g(x))`}: apply ${math`g`} first, then ${math`f`}. Usually ${math`fg \ne gf`}.`, t`With ${math`f(x) = ${2}x`} and ${math`g(x) = x + ${1}`}: ${math`fg(${3}) = ${8}`} but ${math`gf(${3}) = ${7}`}.`, ['composition', 'fg']),
  g(FN, 'inverse-function', 'Inverse function', t`For a one-to-one function ${math`f`}, the inverse ${math`f^{-${1}}`} sends each output back to its input: ${math`f^{-${1}}(y) = x`} exactly when ${math`f(x) = y`}. It is not the reciprocal.`, t`${math`f(x) = ${2}x + ${1}`} has ${math`f^{-${1}}(x) = \frac{x - ${1}}{${2}}`}.`, ['inverse', 'f inverse']),
  g(FN, 'periodic-function', 'Periodic function', t`A function with ${math`f(x + T) = f(x)`} for all ${math`x`}, for some period ${math`T > ${0}`}: its graph repeats every ${math`T`}.`, t`If ${math`f`} has period ${2}, then ${math`f(${3.5}) = f(${1.5})`}.`, ['period']),
  g(EE, 'exponential-equation', 'Exponential equation', t`An equation with the unknown in an exponent. Substitute ${math`y = a^{x}`} to reach a polynomial, keeping only ${math`y > ${0}`}, or take logarithms: ${math`a^{x} = b`} gives ${math`x = \frac{\ln b}{\ln a}`}.`, t`${math`${4}^{x} - ${7} \times ${2}^{x} - ${8} = ${0}`} gives ${math`${2}^{x} = ${8}`}, so ${math`x = ${3}`}.`, ['equation in a^x']),
  g(SQ, 'extraneous-solution', 'Extraneous solution', t`A false solution introduced by a step that cannot be reversed, such as squaring both sides. It satisfies the new equation but not the original, so every answer must be checked.`, t`Squaring ${math`\sqrt{x + ${2}} = x`} gives ${math`x = ${2}`} or ${math`x = -${1}`}; ${math`-${1}`} is extraneous.`, ['false root', 'spurious solution']),
  g(FA, 'difference-of-two-squares', 'Difference of two squares', t`${math`a^{${2}} - b^{${2}} = (a - b)(a + b)`}, for any expressions ${math`a`} and ${math`b`}.`, t`${math`x^{${4}} + ${4} = (x^{${2}} + ${2})^{${2}} - (${2}x)^{${2}}`} factorises this way.`, ['a^2 - b^2']),
  g(FA, 'sum-of-cubes', 'Sum and difference of two cubes', t`${math`a^{${3}} + b^{${3}} = (a + b)(a^{${2}} - ab + b^{${2}})`} and ${math`a^{${3}} - b^{${3}} = (a - b)(a^{${2}} + ab + b^{${2}})`}.`, t`${math`x^{${3}} + ${125} = (x + ${5})(x^{${2}} - ${5}x + ${25})`}.`, ['difference of two cubes', 'a^3 + b^3']),
  g(PA, 'partial-fractions', 'Partial fractions', t`Writing a fraction with a factorised denominator as a sum of fractions over its factors; a repeated factor ${math`(x - a)^{${2}}`} needs terms over ${math`x - a`} and ${math`(x - a)^{${2}}`}.`, t`${math`\frac{${1}}{(x + ${1})(x + ${2})} = \frac{${1}}{x + ${1}} - \frac{${1}}{x + ${2}}`}.`, ['partial fraction decomposition']),
  g(PA, 'cover-up-rule', 'Cover-up rule', t`For distinct linear factors, the coefficient over ${math`x - a`} is the rest of the fraction evaluated at ${math`x = a`}: cover the factor up and substitute.`, t`For ${math`\frac{${1}}{(x + ${1})(x + ${2})}`}, cover ${math`x + ${1}`} and put ${math`x = -${1}`}: the coefficient is ${1}.`),
  g(MO, 'modulus', 'Modulus', t`${math`|x| = x`} for ${math`x \ge ${0}`} and ${math`-x`} for ${math`x < ${0}`}; ${math`|x - a|`} is the distance from ${math`x`} to ${math`a`}. Equations with several moduli are solved by splitting at the critical values.`, t`${math`|${2}x - ${3}| = ${7}`} gives ${math`x = ${5}`} or ${math`x = -${2}`}.`, ['absolute value', '|x|']),
  g(MR, 'boundary-curve', 'Boundary of a region', t`The curve where an inequality ${math`F(x, y) \le c`} becomes an equality. Each part of the plane it cuts off is either wholly in the region or wholly out, so one test point decides it.`, t`${math`|x| + |y| \le ${1}`} has as boundary the tilted square with corners ${math`(\pm ${1}, ${0})`}, ${math`(${0}, \pm ${1})`}.`, ['boundary', 'region']),
];
