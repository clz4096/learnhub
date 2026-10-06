/**
 * Glossary entries for Preparation group B (geometry, trigonometry, and complex numbers;
 * graph/reviews/cambridge-prep.md). Kept in their own file so the shared glossary changes by
 * one import and one spread; checked like every other entry.
 */
import type { GlossaryEntry } from './glossary';
import { math, t, type Rich } from './rich';

const g = (topic: string, id: string, term: string, definition: Rich, example: Rich, aliases?: readonly string[]): GlossaryEntry =>
  (aliases === undefined ? { id, term, definition, example, topic } : { id, term, definition, example, topic, aliases });

const EP = 'geom.euclidean-proof';
const RT = 'trig.right-triangle';
const SC = 'trig.sine-cosine-rules';
const TD = 'geom.3d-coordinates';
const CI = 'geom.circles';
const IX = 'geom.intersections';
const CA = 'trig.compound-angles';
const DA = 'trig.double-angle';
const RG = 'trig.radians-and-graphs';
const TE = 'trig.equations';
const SA = 'trig.small-angles';
const LO = 'geom.loci';
const RF = 'trig.reciprocal-functions';
const VE = 'geom.vectors';
const VL = 'geom.vector-lines';
const CX = 'cx.complex-numbers';

export const GLOSSARY_PREP_B: readonly GlossaryEntry[] = [
  g(EP, 'congruent-triangles', 'Congruent triangles', t`Two triangles whose corresponding sides and angles are all equal: one is an exact copy of the other, possibly turned over. SSS and SAS are tests for it.`, t`Triangles with sides ${3}, ${4}, ${5} and ${5}, ${3}, ${4} are congruent by SSS.`, ['congruence', 'SSS', 'SAS']),
  g(EP, 'isosceles-triangle', 'Isosceles triangle', t`A triangle with two equal sides. The angles opposite the equal sides, the base angles, are equal.`, t`Two radii ${math`OA`} and ${math`OB`} of a circle make triangle ${math`OAB`} isosceles.`, ['base angles']),
  g(EP, 'circle-chord', 'Chord', t`A straight line segment joining two points of a circle. A chord through the centre is a diameter.`, t`In a circle of radius ${5}, a chord at distance ${3} from the centre has length ${math`${2}\sqrt{${5}^{${2}} - ${3}^{${2}}} = ${8}`}.`, ['chord of a circle']),
  g(RT, 'hypotenuse', 'Hypotenuse', t`The side of a right triangle opposite the right angle: the longest side.`, t`In the triangle with sides ${3}, ${4}, ${5}, the hypotenuse is ${5}, since ${math`${3}^{${2}} + ${4}^{${2}} = ${5}^{${2}}`}.`),
  g(SC, 'cosine-rule', 'Cosine rule', t`In a triangle with sides ${math`a`}, ${math`b`}, ${math`c`} opposite the angles ${math`A`}, ${math`B`}, ${math`C`}: ${math`c^{${2}} = a^{${2}} + b^{${2}} - ${2}ab\cos C`}. Pythagoras is the case ${math`C = ${90}^\circ`}.`, t`Sides ${3} and ${8} with ${math`${60}^\circ`} between them: ${math`c^{${2}} = ${9} + ${64} - ${24} = ${49}`}, so ${math`c = ${7}`}.`, ['law of cosines']),
  g(SC, 'sine-rule', 'Sine rule', t`In any triangle, ${math`\frac{a}{\sin A} = \frac{b}{\sin B} = \frac{c}{\sin C}`}: each side divided by the sine of the opposite angle gives the same number.`, t`With ${math`A = ${30}^\circ`}, ${math`B = ${90}^\circ`}, and ${math`a = ${4}`}: ${math`b = \frac{${4} \times ${1}}{${1}/${2}} = ${8}`}.`, ['law of sines']),
  g(TD, 'space-coordinates', 'Coordinates in space', t`Three numbers ${math`(x, y, z)`} locating a point by its distances along three mutually perpendicular axes from an origin.`, t`The distance from ${math`(${0}, ${0}, ${0})`} to ${math`(${3}, ${4}, ${12})`} is ${math`\sqrt{${9} + ${16} + ${144}} = ${13}`}.`, ['3D coordinates', 'three-dimensional coordinates']),
  g(TD, 'tetrahedron', 'Tetrahedron', t`A solid with four triangular faces: a pyramid on a triangular base. Its volume is a third of base area times height.`, t`The tetrahedron with corners at the origin and ${math`(${3}, ${0}, ${0})`}, ${math`(${0}, ${4}, ${0})`}, ${math`(${0}, ${0}, ${5})`} has volume ${math`\frac{${3} \times ${4} \times ${5}}{${6}} = ${10}`}.`, ['triangular pyramid']),
  g(CI, 'circle-equation', 'Equation of a circle', t`The circle with centre ${math`(a, b)`} and radius ${math`r`} is ${math`(x - a)^{${2}} + (y - b)^{${2}} = r^{${2}}`}: the points at distance ${math`r`} from the centre.`, t`${math`x^{${2}} + y^{${2}} - ${6}x + ${2}y - ${6} = ${0}`} is ${math`(x - ${3})^{${2}} + (y + ${1})^{${2}} = ${16}`}: centre ${math`(${3}, -${1})`}, radius ${4}.`, ['circle', 'centre and radius']),
  g(IX, 'intersection-point', 'Point of intersection', t`A point lying on two curves at once: its coordinates satisfy both equations. Found by substituting one equation into the other.`, t`${math`x^{${2}} + y^{${2}} = ${25}`} and ${math`y = ${4}`} meet at ${math`(${3}, ${4})`} and ${math`(-${3}, ${4})`}.`, ['intersection', 'meeting point', 'simultaneous equations']),
  g(IX, 'tangent-line', 'Tangent', t`A line that touches a curve at a point without crossing it there. For a line and a circle, the quadratic from substitution has a repeated root.`, t`${math`y = ${2}x - ${1}`} touches ${math`y = x^{${2}}`} at ${math`(${1}, ${1})`}: ${math`x^{${2}} - ${2}x + ${1} = (x - ${1})^{${2}}`}.`, ['tangent line', 'touches']),
  g(CA, 'compound-angle-formula', 'Compound angle formulae', t`${math`\sin(A \pm B) = \sin A\cos B \pm \cos A\sin B`} and ${math`\cos(A \pm B) = \cos A\cos B \mp \sin A\sin B`}: sine and cosine of a sum or difference of angles.`, t`${math`\sin ${75}^\circ = \sin ${45}^\circ\cos ${30}^\circ + \cos ${45}^\circ\sin ${30}^\circ = \frac{\sqrt{${6}} + \sqrt{${2}}}{${4}}`}.`, ['addition formulae', 'sum formulae']),
  g(DA, 'double-angle-formula', 'Double angle formulae', t`${math`\sin ${2}A = ${2}\sin A\cos A`} and ${math`\cos ${2}A = \cos^{${2}} A - \sin^{${2}} A = ${2}\cos^{${2}} A - ${1} = ${1} - ${2}\sin^{${2}} A`}: the compound angle formulae with both angles equal.`, t`With ${math`\cos A = \frac{${3}}{${5}}`}: ${math`\cos ${2}A = ${2} \cdot \frac{${9}}{${25}} - ${1} = -\frac{${7}}{${25}}`}.`, ['double angle', 'triple angle formulae']),
  g(RG, 'radian', 'Radian', t`The angle at the centre of a circle that cuts off an arc equal in length to the radius. A full turn is ${math`${2}\pi`} radians, so ${math`\pi`} radians is ${math`${180}^\circ`}.`, t`${math`${90}^\circ = \frac{\pi}{${2}}`}, and an angle of ${2} radians in a circle of radius ${5} cuts off an arc of length ${10}.`, ['radians', 'radian measure']),
  g(RG, 'unit-circle', 'Unit circle', t`The circle of radius ${1} about the origin, ${math`x^{${2}} + y^{${2}} = ${1}`}. Turning through ${math`\theta`} from ${math`(${1}, ${0})`} reaches ${math`(\cos\theta, \sin\theta)`}, which defines sine and cosine for every angle.`, t`At ${math`\theta = \frac{\pi}{${2}}`} the point is ${math`(${0}, ${1})`}, so ${math`\cos\frac{\pi}{${2}} = ${0}`} and ${math`\sin\frac{\pi}{${2}} = ${1}`}.`),
  g(RG, 'period', 'Period', t`A function has period ${math`p > ${0}`} when ${math`f(x + p) = f(x)`} for every ${math`x`}; usually the smallest such ${math`p`} is meant.`, t`${math`\sin`} and ${math`\cos`} have period ${math`${2}\pi`}; ${math`\tan`} has period ${math`\pi`}.`, ['periodic']),
  g(TE, 'solution-set', 'Solutions on an interval', t`Every value in a given interval that satisfies an equation. Solving on the interval means listing them all and showing there are no others.`, t`On ${math`${0} \le x < ${2}\pi`}, ${math`\tan x = ${1}`} has exactly two solutions, ${math`\frac{\pi}{${4}}`} and ${math`\frac{${5}\pi}{${4}}`}.`, ['general solution', 'all solutions']),
  g(SA, 'small-angle-approximation', 'Small angle approximations', t`For small ${math`\theta`} in radians: ${math`\sin\theta \approx \theta`}, ${math`\tan\theta \approx \theta`}, and ${math`\cos\theta \approx ${1} - \frac{\theta^{${2}}}{${2}}`}. They come from ${math`\frac{\sin\theta}{\theta} \to ${1}`}.`, t`${math`\sin ${0.05} \approx ${0.05}`}; the true value is ${Number(Math.sin(0.05).toFixed(6))}.`, ['small angles', 'sin x ~ x']),
  g(LO, 'locus', 'Locus', t`The set of all points satisfying a condition, often a condition on distances. Its equation holds exactly for the points of the set.`, t`The points equidistant from ${math`(${0}, ${0})`} and ${math`(${4}, ${0})`} form the locus ${math`x = ${2}`}.`, ['loci', 'path of a point']),
  g(RF, 'reciprocal-trig', 'Secant, cosecant, cotangent', t`${math`\sec\theta = \frac{${1}}{\cos\theta}`}, ${math`\csc\theta = \frac{${1}}{\sin\theta}`} (also written cosec), and ${math`\cot\theta = \frac{\cos\theta}{\sin\theta}`}. They satisfy ${math`\sec^{${2}}\theta = ${1} + \tan^{${2}}\theta`} and ${math`\csc^{${2}}\theta = ${1} + \cot^{${2}}\theta`}.`, t`${math`\sec\frac{\pi}{${3}} = ${2}`}, since ${math`\cos\frac{\pi}{${3}} = \frac{${1}}{${2}}`}.`, ['sec', 'cosec', 'cot', 'secant', 'cosecant', 'cotangent']),
  g(VE, 'vector', 'Vector', t`A quantity with size and direction, written by its components, such as ${math`\begin{pmatrix} ${1} \\ ${2} \\ ${2} \end{pmatrix}`}. Vectors add and scale component by component; the magnitude is the square root of the sum of the squared components.`, t`${math`\begin{pmatrix} ${1} \\ ${2} \\ ${2} \end{pmatrix}`} has magnitude ${math`\sqrt{${1} + ${4} + ${4}} = ${3}`}.`, ['position vector', 'magnitude', 'column vector']),
  g(VE, 'scalar-product', 'Scalar product', t`${math`\mathbf{a} \cdot \mathbf{b} = a_{${1}}b_{${1}} + a_{${2}}b_{${2}} + a_{${3}}b_{${3}} = |\mathbf{a}||\mathbf{b}|\cos\theta`}, where ${math`\theta`} is the angle between them. It is ${0} exactly when nonzero vectors are perpendicular.`, t`${math`\begin{pmatrix} ${1} \\ ${2} \end{pmatrix} \cdot \begin{pmatrix} -${2} \\ ${1} \end{pmatrix} = -${2} + ${2} = ${0}`}: the vectors are perpendicular.`, ['dot product', 'inner product']),
  g(VL, 'vector-line', 'Vector equation of a line', t`${math`\mathbf{r} = \mathbf{a} + t\mathbf{d}`}: the points reached from the point ${math`\mathbf{a}`} by any multiple ${math`t`} of the direction ${math`\mathbf{d} \neq \mathbf{${0}}`}.`, t`The line through ${math`(${1}, ${0}, ${1})`} and ${math`(${2}, ${1}, ${0})`} is ${math`\mathbf{r} = \begin{pmatrix} ${1} \\ ${0} \\ ${1} \end{pmatrix} + t\begin{pmatrix} ${1} \\ ${1} \\ -${1} \end{pmatrix}`}.`, ['line in space', 'r = a + td', 'parametric line']),
  g(VL, 'skew-lines', 'Skew lines', t`Two lines in space that are not parallel and do not meet. They cannot lie in one plane.`, t`The ${math`x`}-axis and the line ${math`\mathbf{r} = \begin{pmatrix} ${0} \\ ${0} \\ ${1} \end{pmatrix} + t\begin{pmatrix} ${0} \\ ${1} \\ ${0} \end{pmatrix}`} are skew.`, ['skew']),
  g(CX, 'complex-number', 'Complex number', t`A number ${math`x + iy`} with ${math`x`} and ${math`y`} real and ${math`i^{${2}} = -${1}`}; ${math`x`} is the real part and ${math`y`} the imaginary part.`, t`${math`(${1} + ${2}i)(${3} - i) = ${3} - i + ${6}i - ${2}i^{${2}} = ${5} + ${5}i`}.`, ['imaginary number', 'i', 'x + iy']),
  g(CX, 'complex-conjugate', 'Complex conjugate', t`The conjugate of ${math`z = x + iy`} is ${math`\bar{z} = x - iy`}. Then ${math`z\bar{z} = x^{${2}} + y^{${2}}`} is real, which is how to divide by ${math`z`}.`, t`${math`(${3} + ${4}i)(${3} - ${4}i) = ${25}`}.`, ['conjugate', 'z bar']),
  g(CX, 'modulus-complex', 'Modulus of a complex number', t`${math`|x + iy| = \sqrt{x^{${2}} + y^{${2}}}`}: the distance of the point ${math`(x, y)`} from ${0} on the Argand diagram.`, t`${math`|${3} - ${4}i| = ${5}`}.`, ['absolute value', '|z|']),
  g(CX, 'argument-complex', 'Argument', t`The angle ${math`\theta`} with ${math`z = |z|(\cos\theta + i\sin\theta)`}, measured anticlockwise from the positive real axis; the principal argument lies in ${math`(-\pi, \pi]`}.`, t`${math`\arg(${1} + i) = \frac{\pi}{${4}}`} and ${math`\arg(-${1} - i) = -\frac{${3}\pi}{${4}}`}.`, ['arg', 'arg z', 'Argand diagram']),
];
