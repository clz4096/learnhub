# Preparation, Stage A: sources and source-to-topic map

Dated 2026-10-05. Status: for review. Phase 1 of the Preparation-year lesson build: STEP Support Foundation Blocks 1 to 6 (Assignments 1 to 25) and CS-0 (Proof, Maths, Functional programming), mapped to the graph and placed in the book so parallel writers can start. Follows the form of `graph/reviews/cambridge-batch-1.md`. No lessons were written.

## Summary

- **Fetched:** batch 6 (`scripts/sources/batch-6.json`, id `prep-batch-6`): 51 sources, 51 OK, 0 failed, 26.4 MB, no redirects. The 25 Foundation assignment PDFs are batch 1's `step-f01` to `step-f25` and were not fetched again.
- **Mapped:** all 25 Foundation assignments, question by question (125 rows; the probability rows of Assignments 5, 6, 8, 12, and 19 stay in the batch 1 map), the Book of Proof sections batch 1 left out (Sections 1.2 to 1.4 and 1.8, Chapters 8 and 9, Section 10.3), the TMUA specification and Notes on Mathematics by item, the NST Maths Workbook by question code, CS3110 chapters 2 to 5, 8, and 9 by exercise, and the FoCS 2025-26 notes by lecture and exercise.
- **Graph:** 83 new topics (58 maths and proof, 25 functional programming) in 5 new areas and 6 existing ones, with citations in `graph/src/topics/cambridge-prep.ts`. Validator: 0 errors, 0 warnings. No new topic is a course target or an ancestor of one, so the probstats slice, SIMULATION.md, and the two-course runs are unchanged.
- **Book:** every new topic placed in a Preparation chapter; 39 existing topics moved where the sources teach or first need them (35 from Part IA into Preparation, 4 within Preparation); CS-0 Proof moved to follow Block 1. Prerequisite flags: 8 before, 3 now (5 closed, none added).
- **Verified answers:** every value, expression, and set answer below was computed (sympy 1.14 for algebra, calculus, and numerics; OCaml 4.11.1 for the OCaml and FoCS values; brute force for the puzzles), not copied from the hints. Spot checks against the hints (Assignments 1 to 4, 10, 13, 15, and 22) found no disagreement; each lesson still records the official answer and whether it agrees, as `content/src/cambridge.ts` requires.

## What was fetched

Run `node scripts/sources/fetch.mjs scripts/sources/batch-6.json`, then `node scripts/sources/extract.mjs`. The manifest keeps every batch's entries. Hosts: step.maths.org, esat-tmua.ac.uk, uat-wp.s3.eu-west-2.amazonaws.com, www.maths.cam.ac.uk, cs3110.github.io, www.cl.cam.ac.uk. Every URL comes from `handoff/meridian-cambridge/links/step-links.md` or `cst-prep-links.md`, except the CS3110 PDF edition, which the textbook's front page links.

| course folder | ids | source | role | pages |
|---|---|---|---|---|
| probability | `step-fNN-page`, `step-fNN-hints` for NN = 01 to 04, 09 to 11, 13 to 18, 20 to 25 | STEP Support Foundation assignment pages and "Hints and Partial Solutions" (the other six assignments' hints are batch 1) | page, hints | 4 to 8 each |
| tmua | `tmua-about-page`, `tmua-spec`, `tmua-maths-notes` | UAT-UK About the TMUA; TMUA content specification; Notes on Mathematics for TMUA and ESAT M2 (June 2026) | index, syllabus, notes | 17; 159 |
| nst | `nst-workbook` | Mathematics for the Natural Sciences Workbook (Faculty of Mathematics, 28 June 2019). It is public, so there is no gap: Section I (algebra to differential equations) and Section 2 (further maths) are both mapped. It prints no answers. | problems | 19 |
| ocaml | `cs3110-book`, `cs3110-ex2`, `-ex3`, `-ex4`, `-ex5`, `-ex8`, `-ex9` | OCaml Programming: Correct + Efficient + Beautiful, PDF edition (all chapters); the exercise pages of chapters 2 to 5, 8, and 9 | notes, problems | 550 |
| focs | `focs-syllabus-2627`, `focs-notes` | CST IA Foundations of Computer Science 2026-27 course page (the syllabus the functional programming topics cite); FoCS lecture notes v1.7, 2025-26 | syllabus, notes | 102 |

**Extraction.** As in batch 1, the text is good enough to map from, not to copy from. The hints files lose displayed algebra (flagged pages per file: 0 to 5). The TMUA Notes on Mathematics come out with doubled equation-font letters on 140 of 159 pages, like the logic notes; the FoCS notes use the same math alphabet (72 pages flagged) but read correctly. The assignment PDFs lose inequality signs throughout; every row below was checked against the rendered page (`sources/.tools/pdf2png`).

**Official help.** Each Foundation hints file covers every question: "Hints: answer" means it prints the answer, "Hints: method" a method, "Hints: outline" a solution outline for the STEP question. Book of Proof has solutions to odd exercises. The NST workbook, the CS3110 exercise pages (solutions go to instructors only), and the FoCS exercises print no answers.

## Curriculum order: what changed and why

The coordinator's order review asked for the school calculus, logic, and proof to be placed in Preparation where the sources teach them, CS-0 Proof before Block 2, and rule 5 of `mastery/DESIGN-BOOK.md` reversed. Done as follows (`content/src/book/book.ts`, `curriculum.json`):

| topic | was | now | why |
|---|---|---|---|
| pre.quadratic-equations | STEP 2 Statistics (bridge) | Block 1, A1 | A1 teaches quadratics; Batch 5 order check in content.test needs a one-line change (below). |
| alg.geometric-sum-to-infinity | IA Analysis I, Limits and convergence | Block 1, A3 | A3 Q1(ii) derives it. |
| the 15 steps of IA Discrete Mathematics, Proof (logic.*, proof.*, sets.comprehension, num.divisibility), and proof.infinitely-many-primes, num.number-systems, alg.proof-by-induction, proof.strong-induction | IA Discrete Mathematics, Proof and Numbers | CS-0 Proof | Book of Proof and the TMUA notes teach them; IA Proof is now recall. alg.proof-by-induction goes to Book of Proof 10, not A20 as suggested: CS-0 Proof now precedes Block 2, so Book of Proof 10 is the first section that teaches it (A20 practises it). |
| pre.set-notation, pre.product-rule | Block 2, A6 and A5 (bridges) | CS-0 Proof, Book of Proof 1 and 2 | First needed there now (sets, Cartesian products). |
| pre.prime-factorisation | Block 3, A12 | CS-0 Proof, Book of Proof 4 to 7 (bridge) | proof.infinitely-many-primes needs it. |
| alg.exp-and-ln, calc.derivatives | IA Analysis I, Differentiability | Block 2, A7 (bridges) | A7 Q1 asks for turning points, and A9 and A13 differentiate polynomials, all before A20. The suggested A20 would leave calc.convexity (A13) and every curve-sketching topic before their prerequisite. A20 gets the new calc.first-principles instead. |
| pre.hcf-lcm | IA Discrete Mathematics, Numbers (bridge) | Block 3, A10 (bridge) | A10 Q2(iii). |
| calc.convexity | IA Analysis I (bridge) | Block 4, A13 | A13 teaches it. |
| an.sequence-limits | IA Analysis I | Block 4, A15 | A15 teaches limits of sequences informally; the epsilon definition stays in Analysis I. |
| num.division-theorem, num.congruence, num.modular-arithmetic | IA Discrete Mathematics, Numbers | Block 4, A17 | A17 introduces modular arithmetic from N = am + n. |
| comb.binomial-theorem | IA Discrete Mathematics, Numbers | Block 5, A19 | A19 and A20 use the binomial expansion; its proof by induction stays in IA. |
| calc.differentiation-rules, an.exp-series | IA Analysis I | Block 6, A22 | A22 proves the product rule and defines e^x by its series. |
| calc.definite-integrals, calc.integration-by-parts | IA Analysis I, Integration | Block 6, A24 | A24 teaches both. Integration by parts goes here rather than to STEP 2 Calculus as suggested, because A24 Q1(ii) teaches it. |
| calc.substitution | IA Analysis I (bridge) | Block 6, A25 | A25 teaches it. |
| calc.improper-integrals | IA Analysis I, Integration | STEP 2 modules, Calculus | The STEP 2 specification ("Further calculus") and module teach it, before STEP 2 Statistics uses it. |

**Flags closed (5):** `comb.pigeonhole` < `proof.cases` (CS-0 Proof now precedes Block 2); `prob.first-step` < `alg.geometric-sum-to-infinity` and `alg.arithmetico-geometric` < `alg.geometric-sum-to-infinity` (now A3); `rv.pdf` < `calc.improper-integrals` (now STEP 2 Calculus); `rv.cdf-method` < `calc.differentiation-rules` (now A22). **Still open (3):** `prob.normal-approximation` < `prob.poisson-distribution`, `rv.joint-densities` < `calc.double-integrals`, `rv.transformations` < `calc.jacobians`. `PREREQ_FLAGS` is now a list per topic (`isFlagged` checks a pair); the book test checks every listed flag.

**Other changes the order review asked for.** Rule 5 of `mastery/DESIGN-BOOK.md` is reversed (trigonometry, coordinate geometry, and curve sketching are graph topics). The stale `lh` labels in `curriculum.json` are recomputed from the placement and today's written lessons ("N lessons built", "b built, w to write"); they are labels only and will drift as lessons land. The A level coverage is stated below rather than added as chapters, so `CHAPTERS.length` stays 140. Tests updated: `content/src/book/book.test.ts` (flags as lists, the new placement), `sims/mastery/src/model/book.test.ts` and `src/ui/book.test.tsx` (Block 1 has 21 steps, IA Discrete Mathematics 13, the flag example), and `sims/mastery/src/ui/views/Book.tsx` reads the flag list.

## Map: STEP Support Foundation, Assignments 1 to 25

Answer kinds as in batch 1: value, expression, set, interval (auto-checked) and proof, explanation, sketch (supervision). "(new)" marks a topic this map adds. Citations use `step-fNN` for the question and `step-fNN-hints` for the hints. A topic placed later than the assignment that first uses it is practised from that assignment after it is taught (for example A3 Q1(i) for radians).

### Block 1 (A1 to A4)

| location | description | answer kind | official help | verified answer | topic ids |
|---|---|---|---|---|---|
| A1 Q1(i), (ii), (iii) | Simplify sqrt(50) + sqrt(18); (3 + 2 sqrt 5)^3 as a + b sqrt 5; expand (1 - sqrt 2 + sqrt 6)^2 | expression | Hints: answer | 8 sqrt 2; 207 + 94 sqrt 5; 9 - 2 sqrt 2 + 2 sqrt 6 - 4 sqrt 3 | `alg.surds` (new) |
| A1 Q1(iv) | (1 + sqrt 2)^2; then real x with x^2 + 4/x^2 = 12, as surds | expression, set | Hints: answer | 3 + 2 sqrt 2; x = 2 + sqrt 2, 2 - sqrt 2, -2 + sqrt 2, -2 - sqrt 2 | `alg.surds` (new), `pre.quadratic-equations` |
| A1 Q2(i), (ii) | Solve 2/(x + 3) + 1/(x + 1) = 1; b for a repeated root of 9x^2 + bx + 4 = 0 | set | Hints: answer | x = 1, -2; b = 12, -12 | `pre.quadratic-equations`, `pre.fractions` |
| A1 Q2(iii) | c for which 3x^2 + 5cx + c = 0 has no real roots | interval | Hints: answer | 0 < c < 12/25 | `ineq.linear-quadratic` (new) |
| A1 Q3 | 2005 STEP I Q3: x/(x - a) + x/(x - b) = 1 (+ c); repeated-root condition c^2 = 1 - ((a + b)/(a - b))^2, so 0 < c^2 <= 1 | proof | Hints: outline | (i) x = +-sqrt(ab); (ii) as stated | `pre.quadratic-equations`, `ineq.linear-quadratic` (new) |
| A1 Q4 | Holditch: the ring between the two circles has area pi(a^2 - b^2) | proof | Hints: outline | pi(a^2 - b^2) by Pythagoras twice | `geom.euclidean-proof` (new) |
| A2 Q1(i), (ii) | Factorise (2x - 3)^2 - (x - 1)^2; simplify x/(x^2 - y^2) - y/(x - y)^2 - 1/(x + y) and find when it is 0 | expression | Hints: answer | (3x - 4)(x - 2); -2y^2/((x - y)^2 (x + y)), zero when y = 0, x != 0 | `alg.factorisations` (new), `pre.fractions` |
| A2 Q1(iii) | sqrt(1 + x^2) - x = 1/(sqrt(1 + x^2) + x); about 1/(2x) for large x | proof, expression | Hints: method | 1/(2x) | `alg.surds` (new) |
| A2 Q1(iv) | (x^2 - sqrt2 x + 1)(x^2 + sqrt2 x + 1); solve x^4 + 1 = 0 | expression, set | Hints: answer | x^4 + 1; x = (+-sqrt 2 +- i sqrt 2)/2 | `alg.factorisations` (new), `cx.complex-numbers` (new) |
| A2 Q2(i) to (vii) | Greatest and least values of lines and parabolas on intervals; x^2 - 8x + 21 = (x - 4)^2 + 5; x^2 + 2kx | value, expression | Hints: answer | 3; least -4 + c; 1 + 2\|m\| and 1 - 2\|m\|; 9 and 0; 25 and 1; on [0, 5]: 21 and 5; least -k^2, greatest 4 + 4\|k\| (k > 2: 4 + 4k, 4 - 4k) | `geom.straight-lines` (new), `fn.quadratic-graphs` (new) |
| A2 Q3 | 1999 STEP I Q6: greatest and least of bx + a and cx^2 + bx + a on [-10, 10], by cases | expression by cases | Hints: outline | (i) a + 10\|b\| and a - 10\|b\|; (ii) vertex at x = -b/(2c), value a - b^2/(4c), cases by where it falls | `fn.quadratic-graphs` (new) |
| A2 Q4 | Five children, two races: the finishing orders from seven clues | value (two orders) | Hints: answer | To the tree: Emily, Bachendri, Charlie, Ahmed, Daniel; back: Daniel, Charlie, Emily, Bachendri, Ahmed (unique, checked by brute force) | `logic.implication` |
| A3 Q1(i) | Sum of sin(n pi/6) for n = 0 to 6 | value | Hints: answer | 2 + sqrt 3 | `trig.radians-and-graphs` (new), `alg.sigma-notation` |
| A3 Q1(ii), (iii) | Geometric sum by rS_n - S_n; sum to infinity; sum of 3(1/2)^i for i = 0 to 9 | expression, value | Hints: answer | S_n = (r^n - 1)/(r - 1), n when r = 1; a/(1 - r); 3069/512 | `alg.geometric-series`, `alg.geometric-sum-to-infinity` |
| A3 Q2(i) | Integral of 2x + 1 from 2 to 5 as a trapezium | value | Hints: answer | 24 | `alg.arithmetic-series`, `calc.definite-integrals` |
| A3 Q2(ii) to (v) | Floor values; graph of [x]; integral of [x] on [0, 4]; integral of x[x] on [0, 3] | value | Hints: answer | [10.2] = 10, [sqrt 70] = 8, [6] = 6, [10 pi] = 31; [x] = 3 on [3, 4); 6; 13/2 | `fn.floor-function` (new) |
| A3 Q3 | 2004 STEP I Q2: integrals of [x] square-rooted and 2^[x] | proof, expression | Hints: outline | sum of sqrt r for r = 0 to a - 1; 2^a - 1; non-integer a: 2^[a] - 1 + (a - [a])2^[a] | `fn.floor-function` (new), `alg.geometric-series` |
| A3 Q4 | Bananas: 8N = 81m + 65; N + 81 also works; N = -2 works; a positive N | proof, value | Hints: outline | N = 79 (m = 7); in general N = 81k - 2 | `num.linear-diophantine` (new), `pre.remainders` |
| A4 Q1 | Angle at the centre is twice the angle at the circumference, O inside and outside the triangle | proof | Hints: outline | proof (no single answer) | `geom.euclidean-proof` (new) |
| A4 Q2(i), (ii) | x^2 - 3x - 4 > 0; roots of x^3 - 2x^2 - 5x + 6 and where it is <= 0 | interval, set | Hints: answer | x < -1 or x > 4; roots 3, 1, -2; x <= -2 or 1 <= x <= 3 | `ineq.linear-quadratic` (new), `alg.polynomials` (new), `ineq.polynomial-regions` (new) |
| A4 Q2(iii), (iv) | x^2 - 3xy + 2y^2 = (x - 2y)(x - y): the two lines; shade where it is <= 0 | expression, sketch | Hints: method | lines y = x/2 and y = x | `ineq.polynomial-regions` (new) |
| A4 Q3 | 1995 STEP I Q1: x^3 - 4x^2 - x + 4 >= 0; the three lines; shade the regions | interval, sketch | Hints: outline | -1 <= x <= 1 or x >= 4; lines y = x, y = x/4, y = -x | `alg.polynomials` (new), `ineq.polynomial-regions` (new) |
| A4 Q4(i) | Four cards 6, E, Q, 7: which to turn to test "even number implies vowel" | value with reason | Hints: method | 6 and Q | `logic.implication` |
| A4 Q4(ii) | Two ropes that each burn in an hour: time 45 minutes | explanation | Hints: method | Light rope 1 at both ends and rope 2 at one; when rope 1 is gone (30 min) light rope 2 at its other end (15 more) | none |

### Block 2 (A5 to A8): the rows batch 1 left without a topic

| location | description | answer kind | official help | verified answer | topic ids |
|---|---|---|---|---|---|
| A5 Q1(i) | cos and sin from the sides of a right triangle; cos^2 + sin^2 = 1 | proof | Hints: method | proof (no single answer) | `trig.right-triangle` (new) |
| A5 Q1(ii) | Cosine rule from coordinates | proof | Hints: method | proof (no single answer) | `trig.sine-cosine-rules` (new) |
| A5 Q2(i) | Triangle 10, 9, 17: cos C, sin C, area 36, the altitudes | value | Hints: answer | cos C = 15/17, sin C = 8/17; altitudes 36/5 (to AB), 8 (to BC), 72/17 (to CA) | `trig.sine-cosine-rules` (new) |
| A5 Q2(ii) | Rectangular pyramid on (0,0,0), (4,0,0), (0,6,0) with volume 40 | value | Hints: answer | (4, 6, 0); height 5; apex (2, 3, 5) | `geom.3d-coordinates` (new) |
| A5 Q2(iii) | (1 - 1/(1 + x^2))^(1/2) sqrt(1 + x^2) for x >= 0 and x < 0 | expression | Hints: method | x for x >= 0; -x for x < 0 (that is \|x\|) | `fn.modulus` (new), `alg.surds` (new) |
| A5 Q3 | 2006 STEP I Q8: tetrahedron OABC: volume, angle ACB, area ABC, distance d from O | proof, expression | Hints: method | volume abc/6; area (1/2) sqrt(a^2 b^2 + b^2 c^2 + c^2 a^2); 1/d^2 = 1/a^2 + 1/b^2 + 1/c^2 | `geom.3d-coordinates` (new), `trig.sine-cosine-rules` (new) |
| A6 Q1(ii) | Three linear equations in a, b, c; then with a parameter k | value | Hints: answer | (see batch 1); no solution when k = -1 | `alg.simultaneous-equations` (new) |
| A7 Q1(i) | Sketch y = x + 1/x and y = x - 1/x: turning points, asymptotes, intercepts | sketch | Hints: method | x + 1/x: turning points (1, 2) and (-1, -2); x - 1/x: none, crosses at x = +-1 | `calc.stationary-points` (new), `fn.rational-functions` (new) |
| A7 Q1(ii) | x + 1/x > 2; x - 1/x >= 3/2 | interval | Hints: answer | x > 0, x != 1; -1/2 <= x < 0 or x >= 2 | `ineq.rational` (new) |
| A7 Q2, Q3 | Roots and coefficients without the formula (batch 1 rows); 2002 STEP I Q5 | value, proof | Hints | x^3 - 4x^2 - 4x + 16: alpha, beta, gamma = -2, 2, 4; quartic roots -2, -6, -6, -8 | `alg.roots-coefficients` (new) |
| A8 Q1 | AM-GM for two numbers (equality iff a = b), x^2 + y^2 + z^2 >= xy + yz + zx (equality iff x = y = z), four then three numbers | proof | Hints | equality iff a = b; iff x = y = z | `ineq.am-gm` (new) |
| A8 Q2(i) | Circle on the diameter from (1, 5) to (-5, 13) | expression | Hints | (x + 2)^2 + (y - 9)^2 = 25 | `geom.circles` (new) |
| A8 Q2(ii), (iii) | x^2 + y^2 = 25 with x^2 + (y - 7)^2 = 18, 4, 1; circle through the two points with centre (0, 2) | set, expression | Hints | (3, 4), (-3, 4); (0, 5) only (tangent); none; x^2 + (y - 2)^2 = 13 | `geom.intersections` (new) |
| A8 Q2(iv) | x^2 + y^2 = 4 and 8x^2 + 4(y - 1)^2 = 36 | set | Hints | (2, 0), (-2, 0), (0, -2) | `geom.intersections` (new) |
| A8 Q3 | 2002 STEP I Q1: circles through the intersections of two ellipses are x^2 - 2ax + y^2 = 5 - 4a | proof | Hints | intersections (2, 1), (2, -1) | `geom.intersections` (new), `geom.circles` (new) |

### Block 3 (A9 to A12)

| location | description | answer kind | official help | verified answer | topic ids |
|---|---|---|---|---|---|
| A9 Q1(i), Q4 | Isosceles triangle by congruence; base angles equal from SAS only (pons asinorum) | proof | Hints: outline | proof (no single answer) | `geom.euclidean-proof` (new) |
| A9 Q1(ii), (iii) | Area (1/2)ab sin C, the sine rule, sin 2 alpha = 2 sin alpha cos alpha from a triangle | proof | Hints: outline | proof (no single answer) | `trig.sine-cosine-rules` (new), `trig.double-angle` (new) |
| A9 Q2(i), (ii) | 5x^2 + 3x = 0; y = x^3 - 12x + 1: turning points, nature, intercept, number of real roots | set, value | Hints: answer | x = 0, -3/5; max (-2, 17), min (2, -15), y-intercept 1, three real roots | `calc.derivatives`, `calc.stationary-points` (new), `calc.curve-sketching` (new) |
| A9 Q2(iii), (iv) | Sketch six cubics from turning points and intercept; which have three x-intercepts | sketch, set | Hints: answer | x^3+3x^2+1: (-2,5),(0,1), 1 root; 2x^3+6x^2-3: (-2,5),(0,-3), 3; 4x^3+6x^2-3: (-1,-1),(0,-3), 1; x^3-6x^2+2: (0,2),(4,-30), 3; 2x^3-3x^2+2: (0,2),(1,1), 1; x^3-12x^2-6: (0,-6),(8,-262), 1 | `calc.curve-sketching` (new) |
| A9 Q3 | 1993 STEP I Q7: x^3 + ax^2 + b = 0 has three distinct real roots iff 27b^2 + 4a^3 b < 0 | proof | Hints: outline | 27b^2 + 4a^3 b = b(27b + 4a^3) | `calc.curve-sketching` (new) |
| A10 Q1(i), (ii) | Compound angle formulae from a triangle with the sine rule; sin 75 and sin 15 | proof, value | Hints: answer | sin 75 = (sqrt 6 + sqrt 2)/4, sin 15 = (sqrt 6 - sqrt 2)/4 | `trig.compound-angles` (new) |
| A10 Q1(iii) | cos 3A in terms of cos A | expression | Hints: answer | 4cos^3 A - 3cos A | `trig.double-angle` (new) |
| A10 Q2(i), (iii) | Prime factors of 120 and 120(1 - 1/2)(1 - 1/3)(1 - 1/5); HCF of 39600 and 52920 | value | Hints: answer | 120 = 2^3 x 3 x 5, value 32; 39600 = 2^4 3^2 5^2 11, 52920 = 2^3 3^3 5 7^2, HCF 360 | `pre.primes-and-factors`, `pre.prime-factorisation`, `pre.hcf-lcm` |
| A10 Q2(ii) | x^a(1 - 1/x) is an integer | proof | Hints: method | proof (no single answer) | `pre.algebraic-argument` |
| A10 Q2(iv), (v) | If, only if, iff: true or false with arrows | verdict | Hints: answer | (a) T, (b) F, (c) F, (d) T, (e) T, (f) T; iff: (a) T, (b) F, (c) F, (d) F, (e) T | `logic.iff` |
| A10 Q3 | 2005 STEP II Q2: Euler totient f(N): f(12), f(180); f(N) is an integer; three claims; f(p^m) = 146410 | value, proof, counterexample | Hints: answer | f(12) = 4, f(180) = 48; (a) false: f(2)f(2) = 1, f(4) = 2; (b) true; (c) false: f(4)f(9) = 12 = f(36); p = 11, m = 5 | `pre.prime-factorisation`, `proof.counterexample`, `logic.iff` |
| A10 Q4 | 1858 Local Examinations: hours per day; two numbers from differences; index product; surd simplification | value | Hints: answer | 144/13 hours; 7 and 4, or -4 and -7; a x - a^(3/4) x^(2/3) b^(3/5) y^(5/6) - a^(1/4) x^(1/3) b^(2/5) y^(1/6) + b y; sqrt 3 | `pre.indices`, `alg.surds` (new), `alg.factorisations` (new) |
| A11 Q1(i) | T(k + 1) = T(k) + k + 1, T(1) = 1: least n with T(n) > 100 | value | Hints: answer | 14 | `alg.recurrence-sequences` (new), `alg.arithmetic-series` |
| A11 Q1(ii) | Piecewise f on [0, 2], periodic with period 2: f(2.5), f(3), f(3.5), f(4); sketch | value, sketch | Hints: answer | 0.5, 1, 0.25, 0 | `fn.functions` (new) |
| A11 Q2(i) | 4^x - 7 x 2^x - 8 = 0 | value | Hints: answer | x = 3 | `alg.exponential-equations` (new) |
| A11 Q2(ii) | sqrt(3x - 5) - sqrt(x + 6) = 1 | value | Hints: answer | x = 10 | `alg.surd-equations` (new) |
| A11 Q3 | 2013 STEP I Q1: x + 3 sqrt x - 1/2 = 0; x + 10 sqrt(x + 2) - 22 = 0; x^2 - 4x + sqrt(2x^2 - 8x - 3) - 9 = 0 | value, set | Hints: answer | x = (10 - 3 sqrt 11)/2; x = 2; x = 2 + sqrt 10, 2 - sqrt 10 | `alg.surd-equations` (new) |
| A11 Q4 | 2^(m+1) + 2^m = 3^(n+2) - 3^n in integers; 3^(2x) - 34 x 15^(x-1) + 5^(2x) = 0 | value, set | Hints: answer | m = 3, n = 1; x = 1, -1 | `alg.exponential-equations` (new) |
| A12 Q4 | Ages with product 2450 (batch 1 row) | value with reasons | Hints | 50 | `pre.prime-factorisation` |

### Block 4 (A13 to A17)

| location | description | answer kind | official help | verified answer | topic ids |
|---|---|---|---|---|---|
| A13 Q1 | Concave and convex; points of inflection: x^3 - 2x^2 - 3x, x^4 - 6x^2 + 9, x^4 - 2x^3, (x - 1)^4 | value, interval, sketch | Hints: answer | (2/3, -70/27); concave for -1 < x < 1; stationary (0, 0), (3/2, -27/16), f'' = 0 at (0, 0), (1, -1); x = 1, not an inflection | `calc.convexity`, `calc.inflection-points` (new) |
| A13 Q2(i), (ii) | x^3 - 3x + 2 = (x - 1)^2 (x + 2); translates by -2, +2, -6; k for 2 and 3 distinct roots | value, set, interval | Hints: answer | turning points (-1, 4), (1, 0), 2 distinct roots; x^3 - 3x: (-1, 2), (1, -2), 3 roots; +4: (-1, 6), (1, 2), 1 root; -4: (-1, -2), (1, -6), 1 root; k = +-2 for two; -2 < k < 2 for three | `calc.curve-sketching` (new), `fn.graph-transformations` (new) |
| A13 Q2(iii) | 3x^4 + 4x^3 - 6x^2 - 12x + 5: stationary points, f'' = 0, k for one root | value | Hints: answer | stationary (-1, 10) (inflection) and (1, -6) (minimum); f'' = 0 at x = -1 and (1/3, 14/27) (non-stationary); k = 11 | `calc.curve-sketching` (new), `calc.inflection-points` (new) |
| A13 Q3 | 2012 STEP I Q2: x^4 - 6x^2 + b = 0 by number of roots; a with a stationary inflection; x^4 - 6x^2 + ax for a > 8 | set, sketch | Hints: outline | n = 0: b > 9; n = 1: never; n = 2: b = 9 or b < 0; n = 3: b = 0; n = 4: 0 < b < 9. a = +-8; then 2 roots for b < 24, 1 for b = 24, 0 for b > 24 | `calc.curve-sketching` (new), `fn.graph-transformations` (new) |
| A13 warm down | n coins and p, q notes with swapped totals: n = 6 gives 4p + 5q = 54 | value, set | Hints: answer | (6, 6, 6) obvious; (6, 1, 10), (6, 6, 6), (6, 11, 2); with p = 6 infinitely many: (6 + 5k, 6, 6 + 9k), k >= 0 | `num.linear-diophantine` (new) |
| A14 Q1 | Sum and difference of cubes; x^3 + 125, x^6 - y^6; a^5 - b^5 and a^5 + b^5 from a geometric sum; x^4 = -1 | expression, set | Hints: answer | (x + 5)(x^2 - 5x + 25); (x - y)(x + y)(x^2 + xy + y^2)(x^2 - xy + y^2); a^5 + b^5 = (a + b)(a^4 - a^3 b + a^2 b^2 - a b^3 + b^4); x = (+-1 +- i)/sqrt 2 | `alg.factorisations` (new), `alg.geometric-series`, `cx.complex-numbers` (new) |
| A14 Q2(i), (ii) | 1/(3 + sqrt 5) + 1/(3 - sqrt 5); geometric series with ratio (1 + sqrt 3)/3 and (1 - sqrt 3)/3 | value | Hints: answer | 3/2; 6 + 3 sqrt 3; 6 - 3 sqrt 3 | `alg.surds` (new), `alg.geometric-sum-to-infinity` |
| A14 Q2(iii) | x^2 - y^2 = z, x - y = z, xy = -2 | set | Hints: answer | (x, y, z) = (2, -1, 3), (-1, 2, -3) | `alg.simultaneous-equations` (new), `alg.factorisations` (new) |
| A14 Q3 | 2010 STEP II Q3: F_n = a lambda^n + b mu^n; F_6; sum of F_n/2^(n+1) | value | Hints: answer | lambda, mu = (1 +- sqrt 5)/2, a = 1/sqrt 5, b = -1/sqrt 5; F_6 = 8; sum 1 | `alg.fibonacci` (new), `alg.geometric-sum-to-infinity` |
| A14 Q4 | Kirkman: 9 schoolgirls in rows of three for four days | table | Hints: method | Unique up to renaming (the affine plane of order 3): ABC DEF GHI / ADG BEH CFI / AEI BFG CDH / AFH BDI CEG | none |
| A15 Q1(i), (ii) | 1 - 1/(1 - 1/(1 - 1/x)); roots of x^4 - 18x^3 + 35x^2 + 180x - 450 | expression, set | Hints: answer | x; roots 15, 3, sqrt 10, -sqrt 10 | `pre.fractions`, `alg.polynomials` (new) |
| A15 Q1(iii) | Product notation: product of r to 4; of r/(r + 1); of g(r)/g(r - 1) | value, expression | Hints: answer | 24; 1/(n + 1); g(n)/g(0) | `alg.telescoping` (new) |
| A15 Q2 | First terms and behaviour of five recurrences; limits as fixed points; cube root of 7 | value, explanation | Hints: answer | (a) 1, -2, 1, -2 (period 2); (b) 1, 2, 4, 5, 26/5, 68/13, converges to 3 + sqrt 5; (c) 2, 3/2, 17/16, ..., converges to 2 - sqrt 2; (d) 5, 27/4, ... diverges; (ii) 4, 1, -3, -4, -1, 3 repeating (period 6); (iii) b = 2 (constant) or 7 (period 2: 2, -3); (iv) 1, 3/2, 17/12, 577/408, 665857/470832, limit sqrt 2; (v) limit cube root of a, a = 7 | `alg.recurrence-sequences` (new), `an.sequence-limits` |
| A15 Q3 | 2006 STEP II Q1: u_(n+1) = k - 36/u_n, u_1 = 2: constant, period 2, period 4; k = 37 limit | value, proof | Hints: answer | k = 20; k = 0; k = 6 sqrt 2, -6 sqrt 2; limit 36 | `alg.recurrence-sequences` (new) |
| A15 Q4 | Crossing the desert: 400 miles with one dump; 460 miles with dumps | explanation | Hints: method | proof (no single answer) | none |
| A16 Q1 | Functions from f(x^2), f(sqrt x); f(x + y) = f(x)f(y), f(xy) = f(x) + f(y), f(x + y) = f(x) + f(y) | expression | Hints: answer | range f >= 1, f(x^2) = 1 + x^4; f(y) = sqrt(1 + y^2) for y >= 0; f(y) = sqrt(1 + y^8) for y >= 0; 2^x; log_2 x; x/2 | `fn.functions` (new) |
| A16 Q2(i), (ii) | sin 105, cos 75; sin 3A; solve sin 3A - sin A = 2cos 2A on [0, 2 pi) | value, set | Hints: answer | sin 105 = (sqrt 6 + sqrt 2)/4, cos 75 = (sqrt 6 - sqrt 2)/4; 3sin A - 4sin^3 A; A = pi/4, pi/2, 3pi/4, 5pi/4, 7pi/4 | `trig.compound-angles` (new), `trig.double-angle` (new), `trig.equations` (new) |
| A16 Q2(iii), (iv) | 1 + sqrt 2 is a root of a cubic: the other roots; 2x^3 - 5x^2 - 6x + 9 and x = 3y | set | Hints: answer | 1 + sqrt 2/2, 1 - sqrt 2/2; x = 1, 3, -3/2; y = 1/3, 1, -1/2 | `alg.polynomials` (new), `alg.roots-coefficients` (new) |
| A16 Q3 | 2015 STEP I Q2: cos 15; roots of 4x^3 - 3x - cos 3 alpha; y^3 - 3y - sqrt 2 = 0 | value, set | Hints: answer | cos 15 = (sqrt 3 + 1)/(2 sqrt 2), sin 15 = (sqrt 3 - 1)/(2 sqrt 2); roots cos alpha, -cos alpha/2 +- (sqrt 3/2) sin alpha; y = (sqrt 6 + sqrt 2)/2, -sqrt 2, -(sqrt 6 - sqrt 2)/2 | `trig.equations` (new), `trig.compound-angles` (new) |
| A16 Q4 | A false proof that every triangle is isosceles | explanation | Hints: method | G lies outside the triangle, so one foot falls outside a side | `geom.euclidean-proof` (new) |
| A17 Q1 | N mod a; sums and products of residues; tests for division by 3 and 11 | proof | Hints: method | digit sum; alternating sum a - b + c - d | `num.division-theorem`, `num.congruence`, `num.modular-arithmetic` |
| A17 Q2(i) | Four linear equations in w, x, y, z | value | Hints: answer | w = 1/4, x = 1/3, y = 1/4, z = 1/6 | `alg.simultaneous-equations` (new) |
| A17 Q2(ii), (iii) | Sum of i/(i - 1) for i = 3 to 5; sum of r^2 for r = -2 to 2; sum of 1/(r(r + 1)) to n and from 100 to 200 | value, expression | Hints: answer | 49/12; 10; n/(n + 1); 101/20100 | `alg.sigma-notation`, `alg.telescoping` (new), `alg.partial-fractions` (new) |
| A17 Q2(iv) | 1/(x^2 + 3x + 2) = a/(x + 1) + b/(x + 2) | value | Hints: answer | a = 1, b = -1 | `alg.partial-fractions` (new) |
| A17 Q3 | 2003 STEP I Q1: sum of r^2 and r^3 by fitting polynomials | proof | Hints: outline | n(n + 1)(2n + 1)/6; n^2 (n + 1)^2/4 | `alg.sums-of-powers` (new) |
| A17 Q4 | 3 x 2^(2n) + 2 x 3^(2n) divisible by 5; 2^n + 5^n + 56 by 63 for odd n; 2^(3n+1) + 3 x 5^(2n+1) by 17 | proof | Hints: method | checked numerically for small n | `num.modular-arithmetic` |

### Block 5 (A18 to A21)

| location | description | answer kind | official help | verified answer | topic ids |
|---|---|---|---|---|---|
| A18 Q1 | Sketch 1/(x - 1), x/(x - 1), x^2/(x - 1), 1/(x - 1) + 1/(x + 1) | sketch | Hints: method | x/(x - 1) = 1 + 1/(x - 1); x^2/(x - 1) = x + 1 + 1/(x - 1) | `fn.rational-functions` (new), `fn.graph-transformations` (new) |
| A18 Q2(i), (ii) | (a + 2)x^2 - 2x - a = 0; -7x - 7 < 0 | set, interval | Hints: answer | x = 1, -a/(a + 2); x > -1 | `pre.quadratic-equations`, `alg.polynomials` (new) |
| A18 Q2(iii) | a/b > 0; y = x/(x - 1) with y > 0, x > 0 gives x > 1, and y > x gives x < 2 | proof | Hints: method | proof (no single answer) | `ineq.rational` (new) |
| A18 Q3 | 2014 STEP I Q3: integral of x^2 equals the square of the integral of x; b = 4/3; 3b^3 - b^2 - 7b - 7 = 0; 1 < b - a <= 4/3 | value, proof | Hints: outline | b = 4/3; one root, about 2.039, in (2, 3) | `calc.definite-integrals`, `alg.polynomials` (new), `ineq.rational` (new) |
| A18 Q4 | Koch snowflake: edges, edge length, perimeter, area | expression | Hints: answer | 3 x 4^n edges of length 3^(-n); perimeter 3(4/3)^n, unbounded; area A + (A/3)(1 + r + ... + r^(n-1)) with r = 4/9, tends to 8A/5 | `alg.geometric-series`, `alg.geometric-sum-to-infinity` |
| A19 Q1 | sin, tan small-angle limits by areas; cos theta about 1 - theta^2/2; why radians | proof, expression | Hints (batch 1) | limit 1; sin theta ~ theta, tan theta ~ theta | `trig.small-angles` (new), `alg.binomial-rational` (new) |
| A19 Q2(i), (ii) | Distance from (2, -2); points equidistant from P and Q = (4, 0) | expression | Hints (batch 1) | sqrt((x - 2)^2 + (y + 2)^2); x + y = 2 | `geom.straight-lines` (new), `geom.loci` (new) |
| A19 Q2(iii), (iv) | x + ay = 2 and ax + 4y = b the same line; p from 5 = (2px - y)/(1 - p) | value, expression | Hints (batch 1) | (a, b) = (2, 4), (-2, -4); p = (5 + y)/(2x + 5) | `geom.straight-lines` (new), `pre.algebraic-manipulation` |
| A19 Q2(v) | xy + 2y + 3x - 54 = 0 as (x + 2)(y + 3) = 60 in positive integers | set | Hints (batch 1) | (1, 17), (2, 12), (3, 9), (4, 7), (8, 3), (10, 2), (13, 1) | `num.linear-diophantine` (new), `alg.factorisations` (new) |
| A19 Q3 | 2005 STEP I Q6: AP = 2BP gives (x + 7)^2 + y^2 = 100; QC = k QD; (a + 7)(b + 7) = 100 | proof | Hints (batch 1) | proof (no single answer) | `geom.loci` (new) |
| A20 Q1 | Derivatives of sin, cos, ln x, sqrt x, x^(-1/2) from first principles | expression | Hints: answer | cos x; -sin x; 1/x; k = 1/2, 1/(2 sqrt x); -(1/2) x^(-3/2) | `calc.first-principles` (new), `alg.binomial-rational` (new) |
| A20 Q2 | Induction: 9 divides 4^n + 6n - 1; sum of i^3 = n^2 (n + 1)^2/4 | proof | Hints: method | proof (no single answer) | `alg.proof-by-induction`, `alg.sums-of-powers` (new) |
| A20 Q3 | 1996 STEP II Q3: Fibonacci F_5 to F_7; F_(n+1) F_(n-1) - F_n^2; F_(n+k) = F_k F_(n+1) + F_(k-1) F_n | value, proof | Hints: answer | 5, 8, 13; (-1)^n | `alg.fibonacci` (new), `proof.strong-induction` |
| A20 Q4 | 2006 STEP III Q8: an operator on polynomials with linearity and the product rule is d/dx | proof | Hints: outline | triangle x^2 = 2x, triangle x^3 = 3x^2 | `calc.first-principles` (new), `alg.proof-by-induction` |
| A20 Q5 | Triangle with angle 30 at A and height equal to MB: angle ABC = 45 | proof | Hints: outline | proof (no single answer) | `geom.euclidean-proof` (new), `trig.sine-cosine-rules` (new) |
| A21 Q1 | C(x) = (a^x + a^(-x))/2, S(x): identities, C(2x), derivatives from first principles, C'' = K^2 C | proof, expression | Hints: answer | C^2 - S^2 = 1; C(2x) = 2C(x)^2 - 1; C' = KS, S' = KC | `calc.hyperbolic` (new), `fn.functions` (new) |
| A21 Q2(i) to (iii) | \|2x - 3\| - 4 = 3; sketch \|2x - 3\|; \|2x\| + \|x - 1\| = 3 | set, sketch | Hints: answer | x = 5, -2; x = 4/3, -2/3 | `fn.modulus` (new) |
| A21 Q2(iv), (v), Q3 | \|x\| + \|y\| = 1 by quadrants; regions \|x\| + \|y\| <= 1, \|x - 1\| + \|y - 1\| <= 1, \|x - 1\| - \|y + 1\| <= 1, \|x\|\|y - 2\| <= 1 | sketch | Hints: outline | squares of diagonal 2 centred at (0, 0) and (1, 1); (iii) and (iv) as translates of the boundary pieces | `fn.modulus-regions` (new) |
| A21 Q4 | Area of a right triangle from the two tangent lengths x, y; CE is half the diagonal | value, proof | Hints: outline | area xy | `geom.euclidean-proof` (new) |

### Block 6 (A22 to A25)

| location | description | answer kind | official help | verified answer | topic ids |
|---|---|---|---|---|---|
| A22 Q1 | f(x + h) about f(x) + hf'(x); the product rule from the definition | proof | Hints: outline | proof (no single answer) | `calc.differentiation-rules` |
| A22 Q2 | e^x from its series: derivative, e^(kx), xe^x, e^(ax) e^(bx), e^x e^(-x) = 1, xe^x to 0 as x to minus infinity | proof, expression | Hints: outline | e^x; k e^(kx); (x + 1)e^x | `an.exp-series`, `calc.differentiation-rules` |
| A22 Q3(i) to (iii) | 3x^2 + x - 2 < 0; sketch e^x; y = (x - 3)e^x: stationary point, intercepts, k with two roots | interval, value | Hints: answer | -1 < x < 2/3; min (2, -e^2); (3, 0), (0, -3), negative for x < 3; two roots for -e^2 < k < 0, one for k = -e^2 or k >= 0 | `ineq.linear-quadratic` (new), `calc.stationary-points` (new), `calc.curve-sketching` (new) |
| A22 Q3(iv) | sin(x^2): zeros, symmetry, sketch | value, sketch | Hints: answer | x = 0, sqrt pi, sqrt(2 pi), sqrt(3 pi); f(-a) = f(a) | `fn.graph-transformations` (new), `trig.radians-and-graphs` (new) |
| A22 Q4 | 2015 STEP I Q1: e^x (2x^2 - 5x + 2) = k: number of roots; sketch with x^2 | set by cases, sketch | Hints: outline | stationary (-1, 9/e) max, (3/2, -e^(3/2)) min, roots 1/2 and 2; 1 root for k > 9/e, 2 for k = 9/e, 3 for 0 < k < 9/e, 2 for k = 0 and for -e^(3/2) < k < 0, 1 for k = -e^(3/2), 0 for k < -e^(3/2) | `calc.curve-sketching` (new) |
| A22 Q5 | Euler characteristic of polyhedra; a cube with a dug-in cube | value | Hints: answer | 2, 2, icosahedron E = 30, V = 12, F - E + V = 2; dug-in cube 3 | none |
| A23 Q1 | F = f(g(x)) by hand; sin 2a, cos 2a; the chain rule from linear approximation; derivatives | expression, proof | Hints: answer | F'(x) = 12x^2 (2x^3 + 1); 2cos 2x; d ln(2x) = 1/x; d ln(x^2) = 2/x | `calc.differentiation-rules`, `trig.double-angle` (new) |
| A23 Q2(i) | Expand (5 - 4y/3 - 2t)^2 | expression | Hints: answer | 25 - 40y/3 - 20t + 16y^2/9 + 16yt/3 + 4t^2 | `pre.algebraic-manipulation` |
| A23 Q2(ii), (iii) | Lines and circles: three intersections; y = ax - 1 meets y = x^2 | set, interval | Hints: answer | (a) no intersection; (b) touches at (3, 3); (c) (-2, 1), (7, 4); two points for a < -2 or a > 2, tangents y = 2x - 1, y = -2x - 1 | `geom.intersections` (new) |
| A23 Q2(iv) | tan 2a = 2tan a/(1 - tan^2 a) | proof | Hints: method | proof (no single answer) | `trig.double-angle` (new) |
| A23 Q3 | 2009 STEP I Q8: (x - 2t)^2 + (y - t)^2 = t^2 touches y = 0 and 3y = 4x; incircle of y = 0, 3y = 4x, 4y + 3x = 15 | proof, expression | Hints: outline | tan 2 alpha = 4/3; incircle (x - 2)^2 + (y - 1)^2 = 1 (the 3-4-5 triangle with r = 1) | `geom.intersections` (new), `geom.circles` (new), `trig.double-angle` (new) |
| A23 Q4 | Blue-eyed islanders | explanation | Hints: method | proof (no single answer) | none |
| A24 Q1(i) | Integration by inspection: integral of e^(4t) on [0, ln 2]; sin 2t on [0, pi/2]; x cos x + sin x on [0, pi]; x sin x - cos x | value, expression | Hints: answer | 15/4; 1; 0; -x cos x + C | `calc.definite-integrals`, `calc.standard-integrals` (new) |
| A24 Q1(ii) | Integration by parts: xe^x; x sin x on [0, pi/2]; ln x; e^x sin x | expression, value | Hints: answer | (x - 1)e^x + C; 1; x ln x - x + C; (1/2)e^x (sin x - cos x) + C | `calc.integration-by-parts` |
| A24 Q2 | sin(A + B) - sin(A - B); cosec pi/4, cosec 5pi/6; telescoping sum; cos n pi; integral of cos kx; integral of x cos x by I - J | expression, value | Hints: answer | 2cos A sin B; sqrt 2, 2; sqrt n; -1, 1, -1, (-1)^n; sin(kx)/k + C; x sin x + cos x + C | `trig.compound-angles` (new), `trig.reciprocal-functions` (new), `alg.telescoping` (new), `calc.standard-integrals` (new) |
| A24 Q3 | 1998 STEP II Q4: I_n - I_(n-1) and I_n for the integral of (pi/2 - x) sin((n + 1/2)x) cosec(x/2) | expression | Hints: outline | I_n - I_(n-1) = 2(1 - (-1)^n)/n^2; I_n = sum of 4/k^2 over odd k <= n (I_1 = 4, I_3 = 40/9; checked numerically) | `calc.integration-by-parts`, `trig.compound-angles` (new), `alg.telescoping` (new) |
| A24 Q4 | Basel: S from the odd squares; alternating sums; sum over 6n - 5 and 6n - 1 | value | Hints: answer | pi^2/6; -pi^2/12; -pi^2/48; pi^2/9 | `alg.geometric-sum-to-infinity` |
| A25 Q1 | Substitution: x/(x - 2); 6x/sqrt(2x + 1); integral of 1/sqrt(4 - x^2) on [0, 1] | expression, value | Hints: answer | x + 2 ln\|x - 2\| + C; 2(x - 1) sqrt(2x + 1) + C; pi/6 | `calc.substitution` |
| A25 Q2(i) to (v) | tan(A - B); ln(1 + (1/2 - x)/(1/2 + x)); tan and sec; d tan = sec^2; (1 + sin 2a)/(1 + cos 2a) | expression, proof | Hints: answer | (tan A - tan B)/(1 + tan A tan B); ln(2/(1 + 2x)); 1 + tan^2 = sec^2 | `trig.compound-angles` (new), `trig.reciprocal-functions` (new), `calc.differentiation-rules`, `trig.double-angle` (new) |
| A25 Q2(vi) | Integral of x^2/(x^2 + (84 - x)^2) on [0, 84] by x = 84 - u | value | Hints: answer | 42 | `calc.symmetry-integrals` (new) |
| A25 Q3 | 1994 STEP I Q8: integral of ln(1 + tan theta) on [0, pi/4]; two more by substitution | value | Hints: outline | pi ln 2/8; pi ln 2/8; 0 | `calc.symmetry-integrals` (new), `calc.substitution` |
| A25 Q4 | King property; integral of cos x/(cos x + sin x) on [0, pi/2]; f'/f integrals; S and T | value, expression | Hints: answer | pi/4; (1/2) ln 2; ln\|ln x\| + C; S = (x + ln\|cos x + sin x\|)/2 + C, T = (x - ln\|cos x + sin x\|)/2 + C | `calc.symmetry-integrals` (new), `calc.standard-integrals` (new) |

**Not given a topic, with reasons.** A4 Q4(ii) (burning ropes), A14 Q4 (Kirkman), A15 Q4 (crossing the desert), A22 Q5 (Euler characteristic), and A23 Q4 (blue-eyed islanders) are lateral puzzles with no graph topic; they go to supervision as warm-downs. A18 and A23 add no topic: every topic they use is placed earlier, so they are problems-only sections (rule 4).

## Map: CS-0 Proof

Batch 1 mapped the TMUA Notes on Logic and Proof and Book of Proof Chapters 2, 4 to 7, 10, and 11.5; those rows still stand, and their topics now sit in CS-0 Proof. This map adds the sections batch 1 left out.

| location | description | answer kind | official help | verified answer | topic ids |
|---|---|---|---|---|---|
| Book of Proof 1.2, 1 to 20 | List Cartesian products; sketch products of intervals in the plane | set, sketch | odd | e.g. {1,2,3,4} x {a,c} has 8 pairs; \|A x B\| = \|A\|\|B\| | `sets.cartesian-product` (new) |
| Book of Proof 1.3, 1 to 16 | List subsets; decide inclusions such as R^2 in R^3 | set, verdict | odd | R^2 is not a subset of R^3 (pairs are not triples) | `sets.subsets` (new) |
| Book of Proof 1.4, 1 to 12 | List power sets and sets built from them | set | odd |   | `sets.subsets` (new), `sets.cartesian-product` (new) |
| Book of Proof 1.4, 13 to 20 | Cardinalities from \|A\| = m, \|B\| = n | expression | odd | 13: 2^(2^(2^m)); 14: 2^(2^m); 15: 2^(mn); 16: 2^(m+n); 17: m + 1; 18: 2^(m 2^n); 19: 4; 20: 2^m + 1 | `sets.subsets` (new), `sets.cartesian-product` (new) |
| Book of Proof 1.8, 1 to 13 | Unions and intersections of indexed families | set | odd |   | `sets.indexed` (new) |
| Book of Proof Chapter 8, 1 to 31 | Prove a in A, A subset of B, A = B: divisibility sets, distributive and De Morgan laws, products | proof | odd |   | `proof.set-proofs` (new), `sets.cartesian-product` (new) |
| Book of Proof Chapter 9, 1 to 35 | Prove or disprove (cumulative to Chapter 9) | proof or counterexample | odd | 1: false, x = 1, y = -1; 2: false, n = 30 gives 1711 = 29 x 59; 4: false, n = 1 gives 35 | `proof.counterexample`, `proof.disproof` (new) |
| Book of Proof 10.3 and Chapter 10 exercises | Proof by smallest counterexample (taught section; batch 1 mapped the exercises) | proof | odd |   | `proof.smallest-counterexample` (new) |

TMUA Paper 2 items Arg1 to Arg4 (logic, necessary and sufficient, quantifiers, negation) are cited on `logic.iff`, `logic.quantifiers`, and `logic.negating-quantifiers`.

## Map: CS-0 Maths

**TMUA content specification and Notes on Mathematics.** Every Paper 1 item is taught in STEP Foundation, so CS-0 Maths adds no topic for it. Each item is cited where the book teaches it: MM1.2 `alg.surds`; MM1.3 `pre.quadratic-equations`, `fn.quadratic-graphs`; MM1.4 `alg.simultaneous-equations`; MM1.5 `ineq.linear-quadratic`; MM1.6 `alg.polynomials`; MM1.7 `fn.functions`; MM2.1 `alg.recurrence-sequences`; MM2.3 `alg.geometric-sum-to-infinity`; MM2.4 `comb.binomial-theorem`; MM3.1 `geom.straight-lines`; MM3.2 `geom.circles`; MM3.3 `geom.euclidean-proof`; MM4.1 `trig.sine-cosine-rules`; MM4.2 and MM4.4 `trig.radians-and-graphs`; MM4.3 and MM4.5 `trig.right-triangle`; MM4.6 `trig.equations`; MM5 `alg.exp-and-ln`, `alg.exponential-equations`; MM6 `calc.derivatives`, `calc.stationary-points` (TMUA excludes first principles); MM7 `calc.definite-integrals`, `calc.standard-integrals`, `calc.separable-odes`; MM8 `fn.graph-transformations`. The notes are cited by chapter and printed pages; they print no answers. The TMUA past papers 2016 to 2023 (batch 3) are timed practice for the CS-0 Maths gate, not mapped question by question here.

**NST Maths Workbook** (no answers printed; the algebra answers were computed):

| codes | description | answer kind | verified answer | topic ids |
|---|---|---|---|---|
| A1 to A7 | Powers, factorisation, quadratics, completing the square, inequalities, factor theorem, partial fractions | expression, set, interval | A1 x^(-1/10); A2 (x - 1)(x + 1), (a - 2b)^2, (x - 1)(x^2 + x + 1); A3 {2, 3}, {0, -2}, (1 +- sqrt 5)/2, {+-1, +-sqrt 2}; A4 5, 2, and 6 on [2, 3]; A5 -1 < x < 4; y < -1 or 0 < y < 3; A6 (x + 4)(x + 3)(x - 2), (t - 1)(t - 2)(t + 3), x/(x + 1); A7 1/(x - 1) - 1/(x + 1); 1/(x - 2) - 2/(x + 1) + 1/(x + 3); 1/(x - 2) - 1/(x + 1) + 1/(x + 1)^2 | `pre.indices`, `alg.factorisations` (new), `pre.quadratic-equations`, `fn.quadratic-graphs` (new), `ineq.polynomial-regions` (new), `alg.polynomials` (new), `alg.partial-fractions` (new) |
| FC1 to FC7 | Modulus, transformations, trig and inverse trig, logarithms, composition, curve sketching | sketch, expression |   | `fn.modulus` (new), `fn.graph-transformations` (new), `trig.radians-and-graphs` (new), `alg.exp-and-ln`, `fn.functions` (new), `fn.rational-functions` (new), `calc.curve-sketching` (new) |
| G1, G2 | Triangles; circles | value, proof |   | `geom.euclidean-proof` (new), `trig.sine-cosine-rules` (new) |
| SS1 to SS6 | Arithmetic and geometric progressions, binomial expansions, iterative sequences, rational powers, approximations | value, expression |   | `alg.arithmetic-series`, `alg.geometric-series`, `comb.binomial-theorem`, `alg.recurrence-sequences` (new), `alg.binomial-rational` (new) |
| T1 to T8 | Trigonometric identities and equations | proof, set |   | `trig.compound-angles` (new), `trig.double-angle` (new), `trig.equations` (new) |
| V1; Section 2 VE1 | Vectors in 3D; vector equations of lines | value, expression |   | `geom.vectors` (new), `geom.vector-lines` (new) |
| D1 to D5 | Stationary points, first principles, chain and product rule, implicit differentiation | expression |   | `calc.stationary-points` (new), `calc.first-principles` (new), `calc.differentiation-rules`, `calc.implicit-differentiation` (new) |
| I1, I2; DE1 | Integration techniques; separable first order ODEs | expression |   | `calc.standard-integrals` (new), `calc.substitution`, `calc.integration-by-parts`, `calc.separable-odes` (new) |
| Section 2: C1, C2; Matrices; SE1, SE2; IN1, IN2; H1, H2 | Complex numbers, matrices, series, induction, hyperbolic functions | expression, proof |   | `cx.complex-numbers` (new), `mat.matrices` (new), `alg.sums-of-powers` (new), `alg.telescoping` (new), `alg.proof-by-induction`, `calc.hyperbolic` (new) |

## Map: CS-0 Functional programming

Taught sections: CS3110 2.3 to 2.4 (`fp.expressions`, `fp.functions`, `fp.recursion`, `fp.polymorphism`), 3.1 to 3.11 (lists, records and tuples, variants, options, algebraic data types, exceptions, trees), 4.1 to 4.8 (higher-order functions, map, filter, fold, pipelining, currying), 5.1 to 5.9 (modules, encapsulation, functional data structures, functors), 8.1 to 8.9 (specification, testing, proving correctness, structural induction), 9.1 to 9.4 (hash tables, amortised analysis, red-black trees, sequences); chapter 6 (mutability) is optional but `fp.references` cites it because hash tables need arrays. FoCS lectures 1 to 11, each cited on the topic its syllabus heading names. Writing a function is a "code" answer: supervision until the app can run OCaml.

| location | description | answer kind | official help | verified answer | topic ids |
|---|---|---|---|---|---|
| CS3110 Ch 2: values, equality, if, assert, operators | Types and values of expressions; structural and physical equality | value | none (the book's solutions are for instructors) | 7 * (1 + 2 + 3): int 42; "CS " ^ string_of_int 3110: string "CS 3110"; "hi" = "hi" is true, "hi" == "hi" is false | `fp.expressions` (new) |
| CS3110 Ch 2: double fun to average | Define small functions; associativity of application | code, verdict | none | add 5 1 : int; add 5 : int -> int; (add 5) 1 : int; add (5 1) is a type error | `fp.functions` (new) |
| CS3110 Ch 2: fib, fib fast | Fibonacci by naive and by linear recursion; first overflow | code, value | none | fib 30 = 832040; fib_fast first negative at n = 91 (63-bit ints) | `fp.recursion` (new) |
| CS3110 Ch 2: poly types | Types of four functions with if | type | none | f : bool -> bool; g : 'a -> bool -> 'a; h : bool -> 'a -> 'a -> 'a; i : bool -> 'a -> 'b -> 'a | `fp.polymorphism` (new) |
| CS3110 Ch 3: list exercises | Lists, pattern matching, library functions, take and drop | code | none |   | `fp.lists` (new), `fp.recursion` (new) |
| CS3110 Ch 3: records, variants, options, trees, exceptions | student, pokerecord, safe hd and tl, cards, quadrant, depth, shape, list max exn, is_bst | code | none |   | `fp.records-tuples` (new), `fp.variants` (new), `fp.trees` (new), `fp.exceptions` (new), `fp.binary-search-trees` (new) |
| CS3110 Ch 4: twice, mystery operators, repeat | Higher-order functions and their types | type, explanation | none | quad, fourth : int -> int; ( $ ) : ('a -> 'b) -> 'a -> 'b, so square $ 2 + 2 = 16 while square 2 + 2 = 6; ( @@ ) composes: String.length @@ string_of_int gives 1, 2, 3 on 1, 10, 100 | `fp.higher-order` (new) |
| CS3110 Ch 4: fold, pipelines, matrices | product, sum_cube_odd, exists, account balance, matrix add and multiply | code, value | none | sum_cube_odd 10 = 1225, sum_cube_odd 5 = 153 | `fp.map-filter-fold` (new) |
| CS3110 Ch 5: modules exercises | Stacks, queues, fractions, char maps, functors (Print, ToString) | code | none |   | `fp.modules` (new), `fp.functional-queues` (new), `fp.functors` (new) |
| CS3110 Ch 8: correctness exercises | Specifications, black and glass box tests, QCheck; equational and inductive proofs | code, proof | none |   | `fp.specifications-testing` (new), `fp.equational-reasoning` (new), `fp.structural-induction` (new) |
| CS3110 Ch 9: data structure exercises | Hash tables, red-black trees, sequences, laziness | code, sketch | none |   | `fp.hash-tables` (new), `fp.red-black-trees` (new), `fp.lazy-sequences` (new), `fp.functors` (new) |
| FoCS Lecture 1, exercises 1.1 to 1.6 | Two-digit years; if then true else false; float repeated addition; golden-ratio iteration | explanation, value | none | 1.5: mul 0.1 10000 -. 1000.0 = 1.588e-10; 1.6: gamma_50 is about -0.618, not 1.618 (the error grows by a factor of about 2.6 per step) | `fp.expressions` (new), `fp.functions` (new) |
| FoCS Lecture 2, exercises 2.1 to 2.4 | Iterative power; the 60-hour column; O-notation; T(n) = 2T(n/2) + 1 | code, value, proof | none | 60 hours at the table's rate: n 216 000 000, n log n about 9.33 million, n^2 14 696, n^3 600, 2^n 27; T(n) = 2n - 1 for n a power of 2, so O(n) | `fp.recursion` (new), `fp.complexity` (new) |
| FoCS Lectures 3 and 4 exercises | List functions, tails, set union, zip, making change | code, explanation | none | tails [1; 2; 3] = [[1; 2; 3]; [2; 3]; [3]; []] | `fp.lists` (new), `fp.polymorphism` (new), `fp.records-tuples` (new) |
| FoCS Lecture 5 exercises | Selection and bubble sort: cost and code | code, explanation | none | both O(n^2) comparisons | `fp.sorting` (new) |
| FoCS Lectures 6 and 7 exercises | Datatypes, tree sums, expression evaluator, BST insertion order and deletion, traversal costs | code, sketch, proof | none |   | `fp.variants` (new), `fp.trees` (new), `fp.exceptions` (new), `fp.binary-search-trees` (new) |
| FoCS Lecture 8 exercises | sw, lexicographic orderings, map2, option map, change with map | code, explanation | none | sw : ('a -> 'b -> 'c) -> 'b -> 'a -> 'c swaps arguments | `fp.higher-order` (new), `fp.map-filter-fold` (new) |
| FoCS Lectures 9 to 11 exercises | Lazy lists; queues and search; procedural programming | code | none |   | `fp.lazy-sequences` (new), `fp.functional-queues` (new), `fp.search` (new), `fp.references` (new) |

## New topics

Levels: school topics are `pre-a-level` or `a-level`; STEP-only content is `step`; a topic that builds on a `tripos-ia` prerequisite (quantifier logic, FoCS complexity) is `tripos-ia` by the validator's no-inversion rule. Every topic's own source is a STEP specification heading (STEP 1, 2, or 3), a Book of Proof section, or a FoCS 2026-27 syllabus lecture (course "CST IA Foundations of Computer Science", which is not a course of `COURSES`); its Preparation citations follow.

| id | title | level | prerequisites | book place |
|---|---|---|---|---|
| `alg.surds` | Surds | pre-a-level | `pre.indices` | Block 1, Assignment 1 |
| `alg.simultaneous-equations` | Simultaneous equations | a-level | `pre.quadratic-equations` | Block 2, Assignment 6 |
| `alg.polynomials` | Polynomials and the factor theorem | a-level | `pre.quadratic-equations` | Block 1, Assignment 4 |
| `alg.roots-coefficients` | Roots and coefficients | step | `alg.polynomials` | Block 2, Assignment 7 |
| `alg.factorisations` | Useful factorisations | a-level | `alg.polynomials`, `alg.geometric-series` | Block 4, Assignment 14 |
| `alg.partial-fractions` | Partial fractions | a-level | `alg.polynomials`, `pre.fractions` | Block 4, Assignment 17 |
| `alg.exponential-equations` | Exponential equations | a-level | `alg.exp-and-ln`, `pre.quadratic-equations` | Block 3, Assignment 11 |
| `alg.surd-equations` | Equations with square roots | a-level | `alg.surds`, `pre.quadratic-equations` | Block 3, Assignment 11 |
| `alg.telescoping` | Telescoping sums and products | a-level | `alg.sigma-notation`, `pre.fractions` | Block 4, Assignment 15 |
| `alg.sums-of-powers` | Sums of squares and cubes | step | `alg.proof-by-induction`, `alg.simultaneous-equations` | Block 4, Assignment 17 |
| `alg.recurrence-sequences` | Sequences defined by recurrences | step | `an.sequence-limits`, `pre.quadratic-equations` | Block 4, Assignment 15 |
| `alg.fibonacci` | Fibonacci numbers | step | `alg.proof-by-induction`, `pre.quadratic-equations`, `alg.geometric-sum-to-infinity` | Block 4, Assignment 14 |
| `alg.binomial-rational` | The binomial series for any power | step | `comb.binomial-theorem`, `alg.geometric-sum-to-infinity` | Block 5, Assignment 19 |
| `num.linear-diophantine` | Integer solutions of linear equations | step | `pre.algebraic-argument`, `pre.remainders` | Block 1, Assignment 3 |
| `ineq.linear-quadratic` | Linear and quadratic inequalities | a-level | `pre.quadratic-equations` | Block 1, Assignment 1 |
| `fn.quadratic-graphs` | Graphs of quadratics | a-level | `pre.quadratic-equations`, `geom.straight-lines` | Block 1, Assignment 2 |
| `fn.floor-function` | The floor function | step | `pre.remainders` | Block 1, Assignment 3 |
| `ineq.polynomial-regions` | Polynomial inequalities and regions | step | `alg.polynomials`, `ineq.linear-quadratic` | Block 1, Assignment 4 |
| `fn.rational-functions` | Sketching rational functions | step | `calc.stationary-points` | Block 2, Assignment 7 |
| `ineq.rational` | Inequalities with fractions | step | `ineq.linear-quadratic`, `fn.rational-functions` | Block 2, Assignment 7 |
| `ineq.am-gm` | The AM-GM inequality | step | `proof.direct`, `pre.indices` | Block 2, Assignment 8 |
| `fn.functions` | Functions, domain, and range | a-level | `pre.algebraic-manipulation` | Block 3, Assignment 11 |
| `fn.graph-transformations` | Transforming graphs | a-level | `fn.functions`, `fn.quadratic-graphs` | Block 4, Assignment 13 |
| `fn.modulus` | The modulus function | a-level | `ineq.linear-quadratic`, `geom.straight-lines` | Block 5, Assignment 21 |
| `fn.modulus-regions` | Regions defined by modulus inequalities | step | `fn.modulus`, `ineq.polynomial-regions` | Block 5, Assignment 21 |
| `geom.straight-lines` | Straight lines | pre-a-level | `pre.algebraic-manipulation` | Block 1, Assignment 2 |
| `geom.euclidean-proof` | Proof in Euclidean geometry | pre-a-level | none (root) | Block 1, Assignment 4 |
| `geom.circles` | Equations of circles | a-level | `geom.straight-lines`, `pre.quadratic-equations` | Block 2, Assignment 8 |
| `geom.intersections` | Intersections of lines and curves | a-level | `geom.circles` | Block 2, Assignment 8 |
| `geom.loci` | Loci in coordinates | a-level | `geom.circles` | Block 5, Assignment 19 |
| `geom.3d-coordinates` | Coordinates in three dimensions | a-level | `trig.sine-cosine-rules` | Block 2, Assignment 5 |
| `geom.vectors` | Vectors and the scalar product | a-level | `geom.3d-coordinates` | CS-0 Maths, NST Maths Workbook |
| `geom.vector-lines` | Vector equations of lines | a-level | `geom.vectors`, `geom.straight-lines` | CS-0 Maths, NST Maths Workbook |
| `trig.right-triangle` | Sine, cosine, and tangent in a right triangle | pre-a-level | `pre.fractions` | Block 2, Assignment 5 |
| `trig.sine-cosine-rules` | The sine and cosine rules | a-level | `trig.right-triangle` | Block 2, Assignment 5 |
| `trig.radians-and-graphs` | Radians and the trigonometric graphs | a-level | `trig.right-triangle` | Block 4, Assignment 16 |
| `trig.compound-angles` | Compound angle formulae | a-level | `trig.sine-cosine-rules` | Block 3, Assignment 10 |
| `trig.double-angle` | Double and triple angle formulae | a-level | `trig.compound-angles` | Block 3, Assignment 10 |
| `trig.equations` | Solving trigonometric equations | a-level | `trig.double-angle`, `trig.radians-and-graphs` | Block 4, Assignment 16 |
| `trig.reciprocal-functions` | Secant, cosecant, and cotangent | a-level | `trig.radians-and-graphs` | Block 6, Assignment 24 |
| `trig.small-angles` | Small angle approximations | step | `trig.radians-and-graphs` | Block 5, Assignment 19 |
| `calc.stationary-points` | Stationary points | a-level | `calc.derivatives` | Block 2, Assignment 7 |
| `calc.curve-sketching` | Sketching polynomial curves | step | `calc.stationary-points` | Block 3, Assignment 9 |
| `calc.inflection-points` | Points of inflection | a-level | `calc.convexity` | Block 4, Assignment 13 |
| `calc.first-principles` | Differentiation from first principles | step | `calc.derivatives`, `trig.small-angles`, `trig.compound-angles` | Block 5, Assignment 20 |
| `calc.hyperbolic` | Hyperbolic functions | step | `calc.first-principles` | Block 5, Assignment 21 |
| `calc.standard-integrals` | Integrating standard functions | step | `calc.definite-integrals`, `calc.differentiation-rules`, `calc.first-principles` | Block 6, Assignment 24 |
| `calc.symmetry-integrals` | Definite integrals by symmetry | step | `calc.substitution`, `calc.standard-integrals` | Block 6, Assignment 25 |
| `calc.implicit-differentiation` | Implicit differentiation | a-level | `calc.differentiation-rules` | CS-0 Maths, NST Maths Workbook |
| `calc.separable-odes` | Separable differential equations | step | `calc.standard-integrals` | CS-0 Maths, NST Maths Workbook |
| `cx.complex-numbers` | Complex numbers | a-level | `pre.quadratic-equations`, `trig.compound-angles`, `trig.radians-and-graphs` | CS-0 Maths, NST Maths Workbook |
| `mat.matrices` | Matrices and determinants | a-level | `alg.simultaneous-equations` | CS-0 Maths, NST Maths Workbook |
| `sets.subsets` | Subsets and power sets | a-level | `sets.comprehension` | CS-0 Proof, Book of Proof 1 and 2 |
| `sets.cartesian-product` | Cartesian products | a-level | `sets.comprehension`, `pre.product-rule` | CS-0 Proof, Book of Proof 1 and 2 |
| `sets.indexed` | Indexed collections of sets | step | `sets.comprehension` | CS-0 Proof, Book of Proof 1 and 2 |
| `proof.set-proofs` | Proofs about sets | step | `proof.direct`, `sets.subsets` | CS-0 Proof, Book of Proof 8 and 9 |
| `proof.disproof` | Disproving existence statements | tripos-ia | `proof.counterexample`, `logic.negating-quantifiers` | CS-0 Proof, Book of Proof 8 and 9 |
| `proof.smallest-counterexample` | Proof by smallest counterexample | tripos-ia | `proof.strong-induction`, `proof.contradiction` | CS-0 Proof, Book of Proof 10 |
| `fp.expressions` | OCaml expressions, values, and types | a-level | none (root) | CS-0 Functional programming, OCaml Programming 2 and 3 |
| `fp.functions` | Defining and applying functions | a-level | `fp.expressions` | CS-0 Functional programming, OCaml Programming 2 and 3 |
| `fp.recursion` | Recursive functions | a-level | `fp.functions` | CS-0 Functional programming, OCaml Programming 2 and 3 |
| `fp.complexity` | The cost of a function | tripos-ia | `fp.recursion` | CS-0 Functional programming, OCaml Programming 4 and 5 |
| `fp.lists` | Lists and pattern matching | a-level | `fp.recursion` | CS-0 Functional programming, OCaml Programming 2 and 3 |
| `fp.polymorphism` | Polymorphic types | step | `fp.lists` | CS-0 Functional programming, OCaml Programming 2 and 3 |
| `fp.records-tuples` | Tuples and records | a-level | `fp.lists` | CS-0 Functional programming, OCaml Programming 2 and 3 |
| `fp.variants` | Variants and algebraic data types | step | `fp.records-tuples`, `fp.polymorphism` | CS-0 Functional programming, OCaml Programming 2 and 3 |
| `fp.exceptions` | Exceptions | step | `fp.variants` | CS-0 Functional programming, OCaml Programming 2 and 3 |
| `fp.trees` | Binary trees | step | `fp.variants` | CS-0 Functional programming, OCaml Programming 2 and 3 |
| `fp.higher-order` | Higher-order functions and currying | step | `fp.polymorphism` | CS-0 Functional programming, OCaml Programming 4 and 5 |
| `fp.map-filter-fold` | Map, filter, and fold | step | `fp.higher-order` | CS-0 Functional programming, OCaml Programming 4 and 5 |
| `fp.modules` | Modules and interfaces | step | `fp.variants` | CS-0 Functional programming, OCaml Programming 4 and 5 |
| `fp.functional-queues` | Functional queues | tripos-ia | `fp.modules`, `fp.complexity` | CS-0 Functional programming, OCaml Programming 4 and 5 |
| `fp.functors` | Functors | tripos-ia | `fp.modules`, `fp.higher-order` | CS-0 Functional programming, OCaml Programming 4 and 5 |
| `fp.specifications-testing` | Specifications and testing | step | `fp.lists` | CS-0 Functional programming, OCaml Programming 8 and 9 |
| `fp.equational-reasoning` | Proving recursive functions correct | tripos-ia | `fp.recursion`, `alg.proof-by-induction` | CS-0 Functional programming, OCaml Programming 8 and 9 |
| `fp.structural-induction` | Structural induction | tripos-ia | `fp.equational-reasoning`, `fp.trees` | CS-0 Functional programming, OCaml Programming 8 and 9 |
| `fp.binary-search-trees` | Binary search trees | tripos-ia | `fp.trees`, `fp.complexity` | CS-0 Functional programming, OCaml Programming 8 and 9 |
| `fp.red-black-trees` | Red-black trees | tripos-ia | `fp.binary-search-trees` | CS-0 Functional programming, OCaml Programming 8 and 9 |
| `fp.references` | References and arrays | step | `fp.records-tuples` | CS-0 Functional programming, OCaml Programming 8 and 9 |
| `fp.hash-tables` | Hash tables | tripos-ia | `fp.references`, `fp.modules`, `fp.complexity` | CS-0 Functional programming, OCaml Programming 8 and 9 |
| `fp.lazy-sequences` | Lazy sequences | tripos-ia | `fp.higher-order`, `fp.variants` | CS-0 Functional programming, OCaml Programming 8 and 9 |
| `fp.sorting` | Sorting algorithms | tripos-ia | `fp.complexity`, `fp.lists` | CS-0 Functional programming, FoCS 2025-26 lecture notes, read ahead |
| `fp.search` | Depth-first and breadth-first search | tripos-ia | `fp.functional-queues`, `fp.trees` | CS-0 Functional programming, FoCS 2025-26 lecture notes, read ahead |

## A level coverage

Stated by section rather than added as chapters. Edexcel 9MA0 (A level Mathematics, `sources/a-level/edx-9ma0-spec`): Proof: CS-0 Proof and A20; Algebra and functions: Blocks 1 to 3 (A1 to A4, A7, A11, A14, A17, A21); Coordinate geometry: A2, A8, A19, A23; Sequences and series: A3, A14, A15, A17, A19; Trigonometry: A5, A10, A16, A19, A24, A25; Exponentials and logarithms: A7 (bridge), A11; Differentiation: A7, A9, A13, A20, A22, A23; Integration: A24, A25; Numerical methods: not placed (STEP 1 lists it; no Foundation assignment sets it); Vectors: A5, CS-0 Maths; Statistics and Mechanics: STEP 2 and 3 modules (Statistics placed, Mechanics left out as in `curriculum.json`). Edexcel 9FM0 Core Pure (Further Mathematics): Proof by induction: CS-0 Proof; Complex numbers, Matrices: CS-0 Maths (`cx.complex-numbers`, `mat.matrices`) and the STEP 2 modules; Further algebra and functions: A7, A15, A17; Further calculus: STEP 2 Calculus; Further vectors: CS-0 Maths; Polar coordinates: not placed (STEP 3 Coordinate Geometry module); Hyperbolic functions: A21 (`calc.hyperbolic`); Differential equations: CS-0 Maths (`calc.separable-odes`), the rest in STEP 3. Further Statistics (Poisson and others): STEP 2 Statistics and IA Probability. OCR H446 (A level Computer Science): its Algorithms and programming component is CS-0 Functional programming (recursion, data structures, sorting, search, complexity); its Computer systems component (processors, networks, databases, Boolean algebra) is not in Preparation and is taught by the IA courses that `curriculum.json` lists.

## content.test.ts changes to apply after the merge

1. Citation check: `const citableIds = new Set([...readBatch(1), ...readBatch(2), ...readBatch(6)]);` (and the message to "batch-1.json, batch-2.json, or batch-6.json").
2. Batch 5 book-order check: `pre.quadratic-equations` now opens Block 1 (A1), so `BATCH_5` sorted by book order puts it first. Either move it to the front of `BATCH_5` (and of the batch 5 block in `content/src/topics/index.ts`, which the length-and-order check reads), or exclude it from the sort check: `const inPrep = (id: string) => id !== 'pre.quadratic-equations';` then compare `BATCH_5.filter(inPrep)` sorted with itself.

## Questions

1. **Bridges at A7.** `alg.exp-and-ln` and `calc.derivatives` are bridges in A7, the first assignment that differentiates. The alternative is the suggested A20 with five new flags (A7, A9, A13 topics before their prerequisite). Keep A7?
2. **Induction at Book of Proof 10, not A20.** Follows from CS-0 Proof preceding Block 2. Agree?
3. **Integration by parts at A24, not STEP 2 Calculus.** A24 Q1(ii) teaches the formula. Agree?
4. **CS-0 Proof position.** It now follows Block 1, which makes the Mathematics-before-Computer-Science order within Stage A one exception. Alternatively, move it first in Stage A (before Block 1); A4 Q4 (logic) would then follow its topic, at the cost of starting the book with Book of Proof.
5. **FoCS levels.** Functional programming topics that need complexity or quantifier logic are `tripos-ia`; the basics are `a-level` (OCR H446 teaches recursion). Fine for placement, which reads levels only for course closures?
6. **TMUA past papers.** Map 2016 to 2023 question by question (320 questions) in a later batch, or keep them as timed papers only?
