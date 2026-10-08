/**
 * geom.euclidean-proof: proof in Euclidean geometry, from congruent and isosceles triangles
 * to the angle at the centre of a circle. Follows STEP Support Foundation Assignment 4 Q1
 * (the angle at the centre, O inside and outside the triangle), Assignment 9 Q1(i) and Q4
 * (isosceles triangles by congruence; the pons asinorum), Assignment 1 Q4 (Holditch's
 * theorem, set as a STEP question in 2010), Assignment 16 Q4 (a false proof that every
 * triangle is isosceles), and Assignment 21 Q4 (the incircle of a right triangle). The STEP
 * specification lists "the angle subtended by an arc at the centre is twice the angle it
 * subtends at the circumference" first among the circle theorems.
 */
import { cite, supervision, withUses } from '../cambridge';
import { int, pick } from '../math';
import { generator, type Misconception } from '../problem';
import { dmath, math, t } from '../rich';
import { checkFrom, worked, workedProof, type TopicContent } from '../topic';
import { far } from '../partv-a';

const deg = (x: number) => math`${x}^\circ`;

// ---------------------------------------------------------------- the angle at the centre

interface CentreP { known: number; findCentre: boolean }

const centreAngle = generator<CentreP>({
  id: 'centre-angle',
  skill: 'Use the angle at the centre theorem: the angle an arc subtends at the centre is twice the angle it subtends at the circumference.',
  quick: true,
  params: (rng) => (rng() < 0.5 ? { known: 5 * int(rng, 3, 17), findCentre: true } : { known: 10 * int(rng, 3, 17), findCentre: false }),
  sane: ({ known, findCentre }) => (findCentre ? (known > 0 && known < 90 ? null : 'not acute') : known > 0 && known < 180 && known % 2 === 0 ? null : 'out of range'),
  problem: ({ known, findCentre }) => {
    const ans = findCentre ? 2 * known : known / 2;
    return {
      prompt: findCentre
        ? t`The points ${math`A`}, ${math`B`}, and ${math`P`} lie on a circle with centre ${math`O`}, and ${math`P`} is on the major arc, so ${math`\angle APB`} is acute. Given ${math`\angle APB = ${known}^\circ`}, find ${math`\angle AOB`} in degrees.`
        : t`The points ${math`A`}, ${math`B`}, and ${math`P`} lie on a circle with centre ${math`O`}, and ${math`P`} is on the major arc. Given ${math`\angle AOB = ${known}^\circ`}, find ${math`\angle APB`} in degrees.`,
      answer: { kind: 'exact', expected: String(ans) },
      solution: findCentre
        ? [t`The arc ${math`AB`} subtends ${math`\angle AOB`} at the centre and ${math`\angle APB`} at the circumference, and the angle at the centre is twice the angle at the circumference.`, t`So ${math`\angle AOB = ${2} \times ${known}^\circ = ${ans}^\circ`}.`]
        : [t`The angle at the centre is twice the angle at the circumference, so the angle at the circumference is half the angle at the centre.`, t`So ${math`\angle APB = \frac{${known}^\circ}{${2}} = ${ans}^\circ`}.`],
    };
  },
  solve: ({ known, findCentre }) => {
    // Coordinates: put A and B on the unit circle with angle AOB = c, P on the major arc, and measure angle APB.
    const c = findCentre ? 2 * known : known;
    const r = (d: number): number => (d * Math.PI) / 180;
    const A = [Math.cos(r(-c / 2)), Math.sin(r(-c / 2))];
    const B = [Math.cos(r(c / 2)), Math.sin(r(c / 2))];
    const P = [-1, 0];
    const u = [(A[0] as number) - (P[0] as number), (A[1] as number) - (P[1] as number)];
    const v = [(B[0] as number) - (P[0] as number), (B[1] as number) - (P[1] as number)];
    const apb = (Math.acos(((u[0] as number) * (v[0] as number) + (u[1] as number) * (v[1] as number)) / (Math.hypot(u[0] as number, u[1] as number) * Math.hypot(v[0] as number, v[1] as number))) * 180) / Math.PI;
    return String(Math.round(findCentre ? c : apb));
  },
  misconceptions: ({ known, findCentre }): Misconception[] => findCentre
    ? [
      { response: String(known), why: t`The two angles are not equal: the angle at the centre is twice the angle at the circumference.` },
      { response: String(known / 2), why: t`That halves the angle. The centre is closer to the chord's ends than ${math`P`} is, so it sees the arc under the bigger angle: double it.` },
      { response: String(180 - known), why: t`That is the rule for opposite angles of a cyclic quadrilateral, which add to ${deg(180)}. Here the centre angle is double the circumference angle.` },
    ]
    : [
      { response: String(known), why: t`The two angles are not equal: the angle at the circumference is half the angle at the centre.` },
      { response: String(2 * known), why: t`That doubles the angle at the centre. It goes the other way: the angle at the circumference is the smaller one, half of it.` },
      { response: String(180 - known), why: t`That treats the angles as supplementary. The theorem says the centre angle is exactly twice the circumference angle.` },
    ],
});

// ---------------------------------------------------------------- isosceles triangles from radii

interface ChordP { x: number }

const radiiTriangle = generator<ChordP>({
  id: 'radii-triangle',
  skill: 'Spot the isosceles triangle made by two radii, find the angle at the centre from its base angles, then halve it for the angle at the circumference.',
  params: (rng) => ({ x: 5 * int(rng, 2, 16) }),
  sane: ({ x }) => (x > 0 && x < 90 ? null : 'out of range'),
  problem: ({ x }) => ({
    prompt: t`The chord ${math`AB`} of a circle with centre ${math`O`} has ${math`\angle OAB = ${x}^\circ`}. The point ${math`P`} lies on the major arc ${math`AB`}. Find ${math`\angle APB`} in degrees.`,
    answer: { kind: 'exact', expected: String(90 - x) },
    solution: [
      t`${math`OA = OB`}, since both are radii, so triangle ${math`OAB`} is isosceles and its base angles are equal: ${math`\angle OBA = \angle OAB = ${x}^\circ`}.`,
      t`The angles of a triangle add to ${deg(180)}, so ${math`\angle AOB = ${180}^\circ - ${2} \times ${x}^\circ = ${180 - 2 * x}^\circ`}.`,
      t`The angle at the circumference is half the angle at the centre: ${math`\angle APB = \frac{${180 - 2 * x}^\circ}{${2}} = ${90 - x}^\circ`}.`,
    ],
  }),
  solve: ({ x }) => {
    // Coordinates: O at the origin, A and B on the unit circle with base angle x, P at the far side.
    const half = ((90 - x) * Math.PI) / 180; // half of angle AOB, from the right triangle O, midpoint, A
    const A = [Math.sin(half), -Math.cos(half)];
    const B = [-Math.sin(half), -Math.cos(half)];
    const P = [0, 1];
    const u = [(A[0] as number) - (P[0] as number), (A[1] as number) - (P[1] as number)];
    const v = [(B[0] as number) - (P[0] as number), (B[1] as number) - (P[1] as number)];
    const c = ((u[0] as number) * (v[0] as number) + (u[1] as number) * (v[1] as number)) / (Math.hypot(u[0] as number, u[1] as number) * Math.hypot(v[0] as number, v[1] as number));
    return String(Math.round((Math.acos(c) * 180) / Math.PI));
  },
  misconceptions: ({ x }): Misconception[] => [
    { response: String(180 - 2 * x), why: t`That is ${math`\angle AOB`}, the angle at the centre. The question asks for the angle at ${math`P`} on the circumference: halve it.` },
    { response: String(x), why: t`${math`\angle APB`} is not the base angle. Find the angle at the centre first, from the isosceles triangle ${math`OAB`}, then halve it.` },
    { response: String(2 * (180 - 2 * x)), why: t`That doubles the angle at the centre. The angle at the circumference is the smaller one: half the centre angle.` },
  ],
});

// ---------------------------------------------------------------- Holditch's ring

interface RingP { R: number; a: number; b: number }

const holditchRing = generator<RingP>({
  id: 'holditch-ring',
  skill: "Holditch's ring: use the perpendicular from the centre to the midpoint of a chord, and Pythagoras twice, to find the area between two circles.",
  params: (rng) => {
    const a = int(rng, 3, 9);
    const b = int(rng, 1, a - 1);
    return { R: int(rng, a + 1, a + 8), a, b };
  },
  sane: ({ R, a, b }) => (R > a && a > b && b > 0 ? null : 'out of range'),
  problem: ({ R, a, b }) => ({
    prompt: t`A rod ${math`AB`} of length ${2 * a} slides with both ends on a circle of radius ${R}. The point ${math`P`} of the rod is at distance ${b} from the rod's midpoint, and traces out a circle with the same centre. Find the area between the two circles, in terms of ${math`\pi`}.`,
    answer: { kind: 'expression', expected: `${a * a - b * b}*pi`, variables: [] },
    solution: [
      t`Let ${math`O`} be the centre and ${math`M`} the midpoint of the rod. Triangle ${math`OAB`} is isosceles (${math`OA = OB = ${R}`}), so ${math`OM`} is perpendicular to ${math`AB`}, and ${math`MA = ${a}`}.`,
      t`Pythagoras in triangle ${math`OMA`}: ${math`OM^{${2}} = ${R}^{${2}} - ${a}^{${2}} = ${R * R - a * a}`}. Pythagoras in triangle ${math`OMP`}, with ${math`MP = ${b}`}: ${math`OP^{${2}} = OM^{${2}} + ${b}^{${2}} = ${R * R - a * a + b * b}`}.`,
      t`The ring has area ${math`\pi \cdot OA^{${2}} - \pi \cdot OP^{${2}} = \pi(${R * R} - ${R * R - a * a + b * b}) = ${a * a - b * b}\pi`}. The radius ${R} cancels: only ${math`a^{${2}} - b^{${2}}`} is left.`,
    ],
  }),
  solve: ({ R, a, b }) => {
    // Place the rod: O at the origin, the midpoint on the y-axis, and measure P's distance.
    const om = Math.sqrt(R * R - a * a);
    const op2 = om * om + b * b;
    return `${Math.round(R * R - op2)}*pi`;
  },
  misconceptions: ({ R, a, b }): Misconception[] => [
    { response: `${R * R - a * a + b * b}*pi`, why: t`That is the area of the inner circle, traced by ${math`P`}. The question asks for the ring between the two circles: subtract it from the big circle's area.` },
    { response: `${(a - b) ** 2}*pi`, why: t`${math`(a - b)^{${2}}`} is not ${math`a^{${2}} - b^{${2}}`}. Pythagoras adds and subtracts squares, not the lengths before squaring.` },
    { response: `${a * a + b * b}*pi`, why: t`Check the signs. ${math`OP^{${2}} = OM^{${2}} + b^{${2}}`} and ${math`OM^{${2}} = R^{${2}} - a^{${2}}`}, so the difference ${math`R^{${2}} - OP^{${2}}`} is ${math`a^{${2}} - b^{${2}}`}.` },
  ],
});

// ---------------------------------------------------------------- Cambridge problems

const a4q1ii = workedProof({
  title: t`The angle at the centre, with the centre outside the triangle`,
  prompt: t`Let ${math`A`}, ${math`B`}, and ${math`P`} be points on a circle with centre ${math`O`}, where ${math`O`} does not lie inside triangle ${math`ABP`}, ${math`\angle APB`} is acute, and ${math`\angle AOB < ${180}^\circ`}. Prove that ${math`\angle AOB = ${2}\angle APB`}.`,
  steps: [
    t`Draw the diameter through ${math`P`}. Label the angles so that ${math`B`} lies between the rays ${math`PA`} and ${math`PO`}: let ${math`\angle OPA = x`} and ${math`\angle OPB = y`}. Since ${math`O`} is outside the triangle, ${math`\angle APB = x - y`}, a difference this time, not a sum.`,
    t`${math`OA = OP`} (radii), so triangle ${math`OAP`} is isosceles and ${math`\angle OAP = x`}. Its angles add to ${deg(180)}, so ${math`\angle AOP = ${180}^\circ - ${2}x`}. In the same way ${math`\angle BOP = ${180}^\circ - ${2}y`}.`,
    t`Now ${math`\angle AOB = \angle BOP - \angle AOP`}, since ${math`OA`} lies between ${math`OB`} and ${math`OP`} on this side. So ${math`\angle AOB = (${180}^\circ - ${2}y) - (${180}^\circ - ${2}x) = ${2}x - ${2}y = ${2}(x - y)`}.`,
    t`Therefore ${math`\angle AOB = ${2}\angle APB`}, as in the case with ${math`O`} inside. ${math`\blacksquare`}`,
  ],
  answer: t`${math`\angle AOB = ${2}\angle APB`} whether or not ${math`O`} lies inside triangle ${math`ABP`}.`,
  source: cite('step-f04', 'Q1(ii)'),
});

const a9q4 = supervision({
  id: 'a9-q4',
  source: cite('step-f09', 'Q4'),
  title: t`The bridge of donkeys: base angles from SAS alone`,
  prompt: t`Triangle ${math`ABC`} has ${math`AB = BC`}. The lines ${math`BA`} and ${math`BC`} are extended by equal lengths to ${math`D`} and ${math`E`}. Using only congruence by SAS and the angle sum of a triangle: (i) show that ${math`\angle BCD = \angle BAE`}; (ii) show that ${math`\angle DCA = \angle EAC`}; (iii) deduce that ${math`\angle BAC = \angle BCA`}. This is Euclid's Proposition ${5}, the pons asinorum.`,
  writeUp: 'proof',
  hints: [
    t`In (i), which two triangles share the angle at ${math`B`}, and which pairs of sides about it are equal?`,
    t`In (ii), which two triangles contain ${math`\angle DCA`} and ${math`\angle EAC`}, and which sides and angle from (i) make them congruent?`,
    t`In (iii), how do the angles at ${math`A`} and ${math`C`} split into the angles already shown equal?`,
  ],
  official: cite('step-f09-hints', 'Q4'),
});

const a16q4 = supervision({
  id: 'a16-q4',
  source: cite('step-f16', 'Q4'),
  title: t`Every triangle is isosceles (or is it?)`,
  prompt: t`In triangle ${math`ABC`}, the bisector of angle ${math`A`} meets the perpendicular bisector of ${math`BC`} at ${math`G`}; ${math`D`} is the midpoint of ${math`BC`}, and ${math`GE`} and ${math`GF`} are the perpendiculars from ${math`G`} to ${math`AC`} and ${math`AB`}. (i) By considering triangles ${math`AGE`} and ${math`AGF`}, show that ${math`AE = AF`}. (ii) Show that ${math`GC = GB`}. (iii) Show that ${math`EC = FB`}, and deduce that triangle ${math`ABC`} is isosceles. (iv) How do you account for this? Draw an accurate diagram and explain exactly which step fails.`,
  writeUp: 'explanation',
  hints: [
    t`In (i) and (ii), which congruence tests apply to triangles ${math`AGE`} and ${math`AGF`}, and to the triangles through ${math`D`}?`,
    t`In an accurate diagram of a triangle that is not isosceles, where does ${math`G`} lie relative to the triangle?`,
    t`With that diagram, do both ${math`E`} and ${math`F`} lie between the vertices, or does one lie on a side extended?`,
  ],
  official: cite('step-f16-hints', 'Q4'),
});

const a1q4 = supervision({
  id: 'a1-q4',
  source: cite('step-f01', 'Q4'),
  title: t`Holditch's theorem for a circle`,
  prompt: t`A rod ${math`AB`} of length ${math`${2}a`} slides with its ends on a circle ${math`C`} with centre ${math`O`} and radius ${math`R`}, so ${math`AB`} is always a chord. The point ${math`P`}, at a fixed distance ${math`b`} from the centre of the rod, traces out a circle with centre ${math`O`} and radius ${math`r`}. Show that the area between the two circles is ${math`\pi(a^{${2}} - b^{${2}})`}. If you had known the answer was independent of ${math`R`}, how could you have found it quickly by choosing ${math`R`}?`,
  writeUp: 'proof',
  hints: [
    t`With ${math`M`} the midpoint of the rod, why is ${math`OM`} perpendicular to ${math`AB`}, and what is ${math`OM^{${2}}`}?`,
    t`Since ${math`P`} lies on the line ${math`AB`} at distance ${math`b`} from ${math`M`}, what is ${math`r^{${2}} = OP^{${2}}`}?`,
    t`What is ${math`\pi(R^{${2}} - r^{${2}})`}, and which value of ${math`R`} makes the computation immediate?`,
  ],
  official: cite('step-f01-hints', 'Q4'),
});

// ---------------------------------------------------------------- lesson

const EX_X = 25;
/** The two third sides when sides 6 and 4 have a 30 degree angle opposite the 4: the roots of c^2 - 6 sqrt(3) c + 20 = 0. */
const SSA = [3 * Math.sqrt(3) + Math.sqrt(7), 3 * Math.sqrt(3) - Math.sqrt(7)].map((c) => Number(c.toFixed(1)));
const MINOR = { centre: 90, onMinor: 135 };

export const euclideanProof: TopicContent = {
  topicId: 'geom.euclidean-proof',
  goal: t`Prove facts about triangles and circles from congruent and isosceles triangles, such as the angle at the centre being twice the angle at the circumference.`,
  objective: t`Prove circle facts from congruent and isosceles triangles, starting with the angle at the centre.`,
  why: t`Geometry is the oldest training in proof, and STEP sets it; circles return in coordinates and in calculus.`,
  minutes: 30,
  lesson: [
    { kind: 'section', title: t`A puzzle about a circle` },
    { kind: 'hook', text: t`Mark two points ${math`A`} and ${math`B`} on a circle, and walk a third point ${math`P`} around the far side. The triangle ${math`ABP`} changes shape all the time, yet the angle at ${math`P`} never changes. Stranger still, it is always exactly half the angle at the centre. Why should a moving point keep a fixed angle?` },
    { kind: 'narrative', text: t`A picture can suggest this, but a picture cannot prove it: you can only ever draw one ${math`P`}, and the claim is about all of them. To prove it you need facts that hold for every triangle, and a chain of steps from those facts to the claim. That chain is a proof in Euclidean geometry, and it is the same kind of argument the Greeks wrote down ${2300} years ago.` },
    { kind: 'section', title: t`The tools: congruent and isosceles triangles` },
    { kind: 'definition', name: t`Congruent triangles`, formal: t`Triangles ${math`ABC`} and ${math`DEF`} are [[congruent-triangles|congruent]], written ${math`\triangle ABC \cong \triangle DEF`}, if ${math`AB = DE`}, ${math`BC = EF`}, ${math`CA = FD`}, and ${math`\angle A = \angle D`}, ${math`\angle B = \angle E`}, ${math`\angle C = \angle F`}.`, plain: t`One triangle is an exact copy of the other, possibly turned over: every side and every angle matches its partner. The order of the letters says which vertex matches which.` },
    { kind: 'theorem', name: t`Congruence tests, taken as known`, statement: t`(SSS) If ${math`AB = DE`}, ${math`BC = EF`}, and ${math`CA = FD`}, then ${math`\triangle ABC \cong \triangle DEF`}. (SAS) If ${math`AB = DE`}, ${math`AC = DF`}, and the included angles ${math`\angle A = \angle D`}, then ${math`\triangle ABC \cong \triangle DEF`}.` },
    { kind: 'p', text: t`In plain words: three matching sides force a copy, and so do two matching sides with the angle between them. We take these as the starting facts, along with two more: the angles of a triangle add to ${deg(180)}, and the angles round a point add to ${deg(360)}.`, why: { q: t`Why is "the angle between them" important in SAS?`, a: t`Two sides and an angle that is not between them can fail. Take sides ${6} and ${4} with a ${deg(30)} angle opposite the side of length ${4}: the third side can be ${math`${3}\sqrt{${3}} + \sqrt{${7}}`}, about ${SSA[0] as number}, or ${math`${3}\sqrt{${3}} - \sqrt{${7}}`}, about ${SSA[1] as number}, so two different triangles share the same three facts.` } },
    { kind: 'definition', name: t`Isosceles triangle`, formal: t`A triangle ${math`ABC`} is [[isosceles-triangle|isosceles]] with apex ${math`B`} if ${math`AB = BC`}. The angles ${math`\angle BAC`} and ${math`\angle BCA`} are its base angles.`, plain: t`Two sides are equal. A triangle with sides ${5}, ${5}, and ${8} is isosceles; the two angles next to the side of length ${8} are the base angles.` },
    { kind: 'theorem', name: t`Base angles`, statement: t`If ${math`AB = BC`} in triangle ${math`ABC`}, then ${math`\angle BAC = \angle BCA`}.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Add a line`, text: t`Let ${math`M`} be the midpoint of ${math`AC`}, and join ${math`B`} to ${math`M`}.`, plain: t`Splitting the triangle down the middle gives two triangles to compare.` },
        { label: t`Match three sides`, text: t`In triangles ${math`ABM`} and ${math`CBM`}: ${math`AB = CB`} (given), ${math`AM = CM`} (${math`M`} is the midpoint), and ${math`BM = BM`} (the same side).` },
        { label: t`Congruent`, text: t`By SSS, ${math`\triangle ABM \cong \triangle CBM`}.`, plain: t`The two halves are mirror copies.` },
        { label: t`Read off the angles`, text: t`Matching angles of congruent triangles are equal, so ${math`\angle BAM = \angle BCM`}, that is ${math`\angle BAC = \angle BCA`}.`, plain: t`The same congruence also gives ${math`\angle AMB = \angle CMB`}; they add to ${deg(180)}, so each is ${deg(90)}: the line ${math`BM`} is perpendicular to ${math`AC`}.` },
      ],
    },
    checkFrom(radiiTriangle, { x: EX_X }, t`${math`OA = OB`} makes triangle ${math`OAB`} isosceles, so ${math`\angle AOB = ${180 - 2 * EX_X}^\circ`}, and the angle at the circumference is half of that.`),
    { kind: 'section', title: t`The angle at the centre` },
    { kind: 'narrative', text: t`Here is the trick that unlocks the puzzle. Every radius of a circle has the same length. So draw the radius ${math`OP`}, and suddenly the picture is full of isosceles triangles: ${math`OAP`} has ${math`OA = OP`}, and ${math`OBP`} has ${math`OB = OP`}. Their base angles are equal, and everything follows from that.` },
    { kind: 'theorem', name: t`Angle at the centre`, statement: t`Let ${math`A`}, ${math`B`}, ${math`P`} be distinct points on a circle with centre ${math`O`}, with ${math`P`} on the major arc ${math`AB`} and ${math`\angle AOB < ${180}^\circ`}. Then ${math`\angle AOB = ${2}\angle APB`}.` },
    { kind: 'p', text: t`In plain words: the [[circle-chord|chord]] ${math`AB`} is seen from the centre under twice the angle it is seen from any point on the far side of the circle. If ${math`\angle APB = ${EX_X}^\circ`}, then ${math`\angle AOB = ${2 * EX_X}^\circ`}. We prove the case where ${math`O`} lies inside triangle ${math`ABP`}; the worked example below does the other case.` },
    {
      kind: 'steps',
      proof: true,
      steps: [
        { label: t`Name the angles`, text: t`Join ${math`O`} to ${math`P`}. Let ${math`x = \angle OPA`} and ${math`y = \angle OPB`}. As ${math`O`} is inside the triangle, the ray ${math`PO`} lies between ${math`PA`} and ${math`PB`}, so ${math`\angle APB = x + y`}.`, plain: t`Two letters for two unknown angles: if ${math`x = ${20}^\circ`} and ${math`y = ${15}^\circ`}, the angle at ${math`P`} is ${deg(35)}.` },
        { label: t`Use the radii`, text: t`${math`OA = OP`}, so triangle ${math`OAP`} is isosceles and ${math`\angle OAP = \angle OPA = x`}. The angles of triangle ${math`OAP`} add to ${deg(180)}:`, eq: [dmath`\angle AOP = ${180}^\circ - ${2}x.`], why: { q: t`Why are those two angles the equal ones?`, a: t`The base angles sit opposite the equal sides. ${math`OA`} is opposite the angle at ${math`P`}, and ${math`OP`} is opposite the angle at ${math`A`}.` } },
        { label: t`The same on the other side`, text: t`${math`OB = OP`}, so in the same way`, eq: [dmath`\angle BOP = ${180}^\circ - ${2}y.`] },
        { label: t`Go round the centre`, text: t`The three angles ${math`\angle AOP`}, ${math`\angle BOP`}, ${math`\angle AOB`} fill the full turn at ${math`O`}, so they add to ${deg(360)}:`, eq: [dmath`\angle AOB = ${360}^\circ - (${180}^\circ - ${2}x) - (${180}^\circ - ${2}y) = ${2}x + ${2}y.`], plain: t`Subtract the two known angles from a full turn; the two ${deg(180)} terms cancel the ${deg(360)}.` },
        { label: t`Conclude`, text: t`So ${math`\angle AOB = ${2}(x + y) = ${2}\angle APB`}.`, plain: t`The answer does not depend on where ${math`P`} is, which is why the angle at ${math`P`} never changes.` },
      ],
    },
    checkFrom(centreAngle, { known: 35, findCentre: true }, t`The arc ${math`AB`} subtends twice the angle at the centre that it subtends at ${math`P`}.`),
    { kind: 'section', title: t`Where it breaks` },
    { kind: 'narrative', text: t`Every hypothesis in the theorem is doing work. Move ${math`P`} onto the short arc between ${math`A`} and ${math`B`}, and the angle at ${math`P`} turns obtuse; the proof's picture no longer applies. And a proof that leans on one diagram can quietly miss a case the diagram does not show.` },
    { kind: 'pitfall', claim: t`The angle at the centre is twice the angle at the circumference wherever ${math`P`} is on the circle.`, counterexample: t`Take ${math`\angle AOB = ${MINOR.centre}^\circ`}. A point ${math`P`} on the minor arc sees ${math`AB`} under ${math`${MINOR.onMinor}^\circ`}, not ${math`${MINOR.centre / 2}^\circ`}: it is half the reflex angle ${math`${360 - MINOR.centre}^\circ`}, because from that side the arc ${math`AB`} is the long way round.` },
    { kind: 'pitfall', claim: t`If every step follows from the diagram, the proof is correct.`, counterexample: t`The proof above drew ${math`O`} inside triangle ${math`ABP`} and used ${math`\angle APB = x + y`}. Slide ${math`P`} along the major arc until ${math`O`} falls outside the triangle: now the ray ${math`PO`} does not lie between ${math`PA`} and ${math`PB`}, the angle at ${math`P`} is a difference of ${math`x`} and ${math`y`}, and that step fails. The theorem is still true, but this case needs its own argument, which the worked example gives.` },
    { kind: 'takeaway', text: t`Draw the radii: equal radii make isosceles triangles, and their equal base angles prove the circle theorems.` },
  ],
  examples: [
    a4q1ii,
    worked(radiiTriangle, { x: 35 }, t`An angle at the circumference from a base angle`),
    worked(holditchRing, { R: 7, a: 5, b: 3 }, t`Holditch's ring with numbers`),
  ],
  generators: [centreAngle, radiiTriangle, holditchRing],
  mastery: { correctInARow: 3, maxProblems: 10 },
  terms: ['congruent-triangles', 'isosceles-triangle', 'circle-chord'],
  cambridge: withUses([a1q4, a16q4, a9q4], {
    'a9-q4': { sections: ['The tools: congruent and isosceles triangles'], note: t`Chaining congruent triangles to prove the base angles equal` },
    'a16-q4': { sections: ['The tools: congruent and isosceles triangles', 'Where it breaks'], note: t`Finding the false step in a convincing congruence argument` },
  }),
  // The two congruence proofs. Assignment 21 Q4 needs tangents to a circle, so it is set in geom.circles.
  gate: ['a9-q4', 'a16-q4'],
  recall: [
    { front: t`State the SSS and SAS congruence tests.`, back: t`Three pairs of equal sides, or two pairs of equal sides with the angles between them equal, make two triangles congruent.` },
    { front: t`What can you say about the base angles of an isosceles triangle?`, back: t`They are equal: if ${math`AB = BC`} then ${math`\angle BAC = \angle BCA`}, by congruence with the midpoint of ${math`AC`}.` },
    { front: t`State the angle at the centre theorem.`, back: t`For ${math`P`} on the major arc ${math`AB`}, the angle at the centre is twice the angle at the circumference: ${math`\angle AOB = ${2}\angle APB`}.` },
  ],
  proofOrder: [
    {
      title: t`The angle at the centre, with the centre inside the triangle`,
      steps: [
        t`Join the centre to the point on the circumference and name the two angles at that point.`,
        t`The radii are equal, so each of the two small triangles is isosceles.`,
        t`Each small triangle's angle at the centre is ${deg(180)} minus twice its base angle.`,
        t`The three angles at the centre add to ${deg(360)}, so the angle at the centre is twice the sum.`,
        t`That sum is the angle at the circumference, so the centre angle is double it.`,
      ],
    },
  ],
};
