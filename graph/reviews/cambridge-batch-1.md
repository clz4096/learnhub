# Cambridge content, batch 1: sources and source-to-topic map

Dated 2026-10-05. Status: for review. Build step 1 of `mastery/DESIGN-CAMBRIDGE-CONTENT.md` (fetch and extract the first batch, map it to the graph). No lessons, generators, or app code.

## Summary

- **Fetched:** 47 sources, 47 OK, 0 failed (21.2 MB). One source needed a fallback; see "What was fetched".
- **Mapped:** Probability, 38 numbered questions (24 from six STEP Support Foundation assignments, 14 from IA Probability Example Sheet 1) plus the taught sections. Discrete Mathematics, 359 numbered exercises (63 from supervision work 1, Exercises 1 to 4; 278 from Book of Proof; 18 exercise sets from the TMUA notes) plus every section of the CST notes' Proof and Numbers parts.
- **Proposed graph changes:** 4 new topics (`comb.pigeonhole`, `prob.bayes-two-events`, `prob.event-spaces`, `num.algebraic-structures`), 2 edge changes (`num.euclid-theorem`, `num.fermat-little`), and 1 note fix (`num.number-systems`: the notes start N at 0). Several things the sources teach are deliberately left out; each is listed with its reason.
- **Questions for Albert:** 14, at the end.

## What was fetched

The tools are in `scripts/sources/`:

| file | what it does |
|---|---|
| `batch-1.json` | The source list: id, course folder, kind, role, title, URL, plus the allowed hosts. Every URL comes from the Meridian handoff (`handoff/meridian-cambridge/links/`). |
| `fetch.mjs` | Downloads each listed URL into `sources/<course>/<id>.<ext>` and writes `sources/manifest.json` (id, URL, fetched_at, sha256, bytes, content type, status). It never crawls. A redirect is followed only to a listed host; any other redirect is recorded as a failure with its target. Re-running fetches only what is missing (`--refresh` refetches all). |
| `extract.mjs`, `pdf2txt.swift` | Writes `sources/<course>/<id>.txt`: PDFs through macOS PDFKit with a `=== page N ===` marker per page, HTML through a tag stripper. Writes `sources/extraction-report.json` with pages to check for lost math and the files each HTML page links to. |

Run `node scripts/sources/fetch.mjs`, then `node scripts/sources/extract.mjs`. No new dependencies. `sources/` is in `.gitignore`.

**Hosts** (all six listed in the batch): step.maths.org, www.dpmms.cam.ac.uk, www.maths.cam.ac.uk, www.cl.cam.ac.uk, richardhammack.github.io, uat-wp.s3.eu-west-2.amazonaws.com (the TMUA notes' official storage, as linked from esat-tmua.ac.uk). No redirects occurred.

**One fallback.** The DPMMS server sends an incomplete certificate chain, so Node's `fetch` refused it ("unable to verify the first certificate"). For that error only, `fetch.mjs` retries through the system `curl`, which completes the chain from the certificate's issuer URL. Verification stays on. The manifest marks the entry `via: curl`.

| course folder | id | source | role | pages |
|---|---|---|---|---|
| probability | `step-f05`, `-hints`, `-page` | STEP Support Foundation Assignment 5 (Block 2) | problems, hints, page | 3, 6 |
| probability | `step-f06`, `-hints`, `-page` | Assignment 6 (Block 2: arrangements, probability, the prosecutor's fallacy) | problems, hints, page | 5, 4 |
| probability | `step-f07`, `-hints`, `-page` | Assignment 7 (Block 2) | problems, hints, page | 4, 5 |
| probability | `step-f08`, `-hints`, `-page` | Assignment 8 (Block 2) | problems, hints, page | 3, 7 |
| probability | `step-f12`, `-hints`, `-page` | Assignment 12 (topics include probability) | problems, hints, page | 3, 6 |
| probability | `step-f19`, `-hints`, `-page` | Assignment 19 (warm-down is probability; found by the scan) | problems, hints, page | 4, 6 |
| probability | `step-f01` to `step-f25` (the other 19) | the remaining Foundation assignment PDFs | scan only | 2 to 5 each |
| probability | `step-foundation-list` | Foundation assignments list page | index | HTML |
| probability | `ia-prob-sheet-1` | IA Probability Example Sheet 1, Lent 2026 (DPMMS 2025-26, Perla Sousi) | problems | 3 |
| probability | `tripos-schedules` | Mathematical Tripos schedules 2026-27 (the graph's `tripos-schedules-2026-27`) | syllabus | 46 |
| discrete-maths | `cst-dm-notes` | Discrete Mathematics notes, Part IA CST 2025/26 (Fiore, Sterling): Proofs, Numbers, and Sets | notes | 487 |
| discrete-maths | `cst-dm-sw1` | Supervision exercises: Proofs, Numbers, and Sets (2025-26), Exercises 1 to 6 | problems | 19 |
| discrete-maths | `cst-dm-syllabus-2627`, `cst-dm-materials-2526` | 2026-27 syllabus page; 2025-26 materials page | syllabus, index | HTML |
| discrete-maths | `bop`, `bop-home` | Book of Proof, edition 3.4 (`Main.pdf`, one file for every chapter); the author's page | notes | 380 |
| discrete-maths | `tmua-logic-proof` | Notes on Logic and Proof, for TMUA Paper 2 (June 2025) | notes | 74 |

**How "any other foundation assignment with probability" was decided.** The handoff's topic lines name probability only in Assignments 6 and 12. All 25 assignment PDFs were fetched and searched (probability, at random, dice, coin, socks). Assignment 19's warm-down is probability (three coins in a bag, three dice), so its page and hints were added. Assignment 5's and 8's warm-downs (socks) are counting, already in Block 2. Assignments 13 and 22 matched only on "coins" and "rules of indices"; not probability.

**Official answers.** The STEP hints files ("Hints and Partial Solutions") give answers or methods for every question. Book of Proof has solutions for odd-numbered exercises (PDF pages 304 to 376). There are no public solutions for IA Probability Example Sheet 1, for the 2025-26 supervision exercises, or for the TMUA exercises (the notes say so: "we have not given any answers to our exercises"). The materials page links no solution files.

**2026-27 syllabus.** The fetched CST page matches the Proof and Numbers text in `graph/src/schedules.ts` word for word. The 2026-27 materials page is still empty, so the notes and sheet are 2025-26, as the handoff says.

### Math that did not survive extraction

The text files are good enough to map from, not to copy from. Every problem must be retyped from the PDF in step 2.

| source | what is lost |
|---|---|
| STEP assignments | Fractions split over lines, square roots dropped, powers flattened (`x2` for x squared), and some relation signs lost (A5 Q2(iii) reads "x 0" for x ≥ 0; A8 Q1 loses ≥ throughout; A7 Q1(ii) loses the second inequality sign). |
| STEP hints | Displayed algebra is fragmented (A5 pages 2 to 6; A12 pages 2 and 3). Answers survive mostly, but A12 Q2(iv) prints "64." for 3/64. |
| IA sheet 1 | Mostly clean. Lost: powers (Q2 reads "2n players" for 2^n), big union, intersection, and sum limits (Q4(a), Q6, the identity in Q7), and the exponent in e^(−x²/2) (Q14). |
| Tripos schedules | Page 12 is two columns; Analysis I and Probability lines interleave. The Probability text is intact when read by heading. |
| CST notes | Binomial coefficients split over lines, sum limits lost, blackboard-bold N and Z often dropped. Slide numbers: printed page = PDF page minus 1. |
| CST sheet | Blackboard bold lost ("∀k ∈ ." for k in N; "in m" for Z_m). 3.2.10(c) loses its two-line system layout. **3.2.12 is garbled** ("2212001 175"); the base and exponent cannot be recovered from text. 3.3's three items are interleaved. |
| Book of Proof | Set braces lost, √ and ∛ lost (6.3 to 6.5, 6.21, 6.23), ∤ lost (5.9, 5.10, 5.28, 6.15, 6.17, 7.24, 7.25), binomial coefficients flattened (4.21 to 4.25, 10.24, 10.31, 10.35 to 10.41), fractions in Chapter 10 sums fragmented. |
| TMUA notes | **Equation-font letters come out doubled and sometimes as the wrong letter** (for example "𝑎𝑎𝑎𝑎" for ab, "𝑒𝑒" for n, "𝑖𝑖" for f). Never trust TMUA math from the text. `extraction-report.json` now flags these pages (38 of 74). |
| HTML pages | Fine. |

## Map: Probability

Answer kinds: **value** (a number, exact grader), **expression** (a formula in the problem's letters), **set** (an unordered list of values), **proof**, **explanation**, **sketch** (the last three go to supervision). "Hints" means the STEP hints file has the answer or method. New topics proposed below are marked (new).

### STEP Support Foundation assignments

| location | description | teaches or asks | answer kind | official help | topic ids |
|---|---|---|---|---|---|
| A5 Q1(i) | Right triangle: cos θ and sin θ from the sides; prove cos²θ + sin²θ = 1 | trigonometry | proof | Hints: method | none (trigonometry is outside both courses) |
| A5 Q1(ii) | Derive the cosine rule from coordinates | trigonometry | proof | Hints: method | none |
| A5 Q2(i) | Triangle with sides 10, 9, 17: cos C, sin C, area 36, the three altitudes | trigonometry, area | value | Hints: answers | none |
| A5 Q2(ii) | Rectangle-based pyramid: fourth vertex, height from volume 40, apex | 3D coordinates | value | Hints: answers | none |
| A5 Q2(iii) | Simplify a nested square root; the answer is \|x\| | surds, modulus | expression | Hints: method | none (surds and \|x\| are not graph topics) |
| A5 Q3 | 2006 STEP I Q8: tetrahedron OABC, angle ACB, distance from O to the face | 3D geometry | proof | Hints: method | none |
| A5 Q4(i), (ii) | Socks in two colours: how many to be sure of one pair, two pairs | pigeonhole by listing | value (3, 5) | Hints: answers | `comb.pigeonhole` (new) |
| A5 Q4(iii) | Same for n pairs, justified in general | pigeonhole, parity cases | proof (2n + 1) | Hints: method | `comb.pigeonhole` (new), `proof.cases` |
| A6 Q1(i) | Product of (1 + 1/(2k)) over (1 − 1/(2k)), for k up to 4, then up to n | cancel fractions; find the general term | value (9), expression (2n + 1) | Hints: answers | `pre.fractions`, `pre.sequences` |
| A6 Q1(ii) | Three linear equations in a, b, c; then with a parameter k | linear systems; no solution when k = −1 | value | Hints: answers | none (linear systems are not in the graph) |
| A6 Q2(i) | Arrangements of the letters of Ben, Elsa, Charlie | n! | value (6, 24, 5040) | Hints: answers | `comb.factorial` |
| A6 Q2(ii), (iii), (v) | Names with repeated letters; Reggie, Hannah, Marshmallow; MISSISSIPPI | n! over the repeats | value | Hints: answers | `comb.repeated-arrangements` |
| A6 Q2(iv) | Show Lillian has 7!/(3! 2!) arrangements | explain each division | explanation | Hints: model answer | `comb.repeated-arrangements` |
| A6 Q3(i) | 2005 STEP I Q1: show exactly 15 five-digit numbers have digit sum 43 | cases by the number of nines; show there are no more | proof | Hints: method | `comb.repeated-arrangements`, `proof.cases` |
| A6 Q3(ii) | How many five-digit numbers have digit sum 39 | the same, ten cases | value (210) | Hints: answer | `comb.repeated-arrangements`, `proof.cases` |
| A6 Q4(i)(a), (b), (c), (e) | 40% men, 60% women; smoking rates: joint, total, and conditional probabilities | tree or table of 100 people | value (18/100, 62/100, 3/10, 10/31) | Hints: answers | `pre.tree-diagrams`, `pre.two-way-tables`, `prob.conditional-formula` |
| A6 Q4(i)(d) | Show P(woman given smoker) = 9/19 | reverse a conditional | explanation | Hints: method | `prob.bayes-two-events` (new) |
| A6 Q4(ii) | "Mathmotitus": 0.1% prevalence, 99% and 98% accuracy; P(disease given positive) | Bayes; P(+ given D) is not P(D given +); the prosecutor's fallacy | value (99/2097, about 0.047) | Hints: answer | `prob.bayes-two-events` (new) |
| A7 Q1(i) | Sketch y = x + 1/x and y = x − 1/x | curve sketching | sketch | Hints | none |
| A7 Q1(ii) | Solve x + 1/x > 2 and a second inequality | inequalities | set | Hints | none |
| A7 Q2(i) to (iii) | Relate roots and coefficients of a quadratic without the formula; identity versus equation | expanding; ≡ | proof, value (roots 2 and 5) | Hints | `pre.algebraic-manipulation` |
| A7 Q2(iv), (v) | Same for a cubic; find integer roots | substitution | proof, value | Hints | `pre.algebraic-manipulation` |
| A7 Q3 | 2002 STEP I Q5: products of roots; roots of a quartic | polynomials | proof, value (−2, −6, −6, −8) | Hints | `pre.algebraic-manipulation` |
| A7 Q4(i)(a), (c) | Bachet's weights, one pan: the unique choice for 1 to 7; at most 2^n weighings | each weight in or out | proof | Hints: method | `pre.product-rule` |
| A7 Q4(i)(b), (ii)(a), (ii)(c) | Weights for 1 to 31; two pans for 1 to 4; for 1 to 40 | powers of 2 and 3 | set | Hints: answers | `pre.product-rule` |
| A7 Q4(ii)(b) | Two pans: at most 3^n weighings | three choices per weight | proof | Hints: method | `pre.product-rule` |
| A8 Q1 | AM-GM for two, four, then three numbers | inequality proofs | proof | Hints | none now (IA Probability "Inequalities and limits" names the AM/GM inequality; a later batch) |
| A8 Q2 | Circle on a diameter; intersections of circles; circle and ellipse | coordinate geometry | value | Hints | none |
| A8 Q3 | 2002 STEP I Q1: circles through the intersections of two ellipses | coordinate geometry | proof | Hints | none |
| A8 Q4(i), (ii) | Socks in three colours: one pair, two pairs | pigeonhole | value (4, 6) | Hints: answers | `comb.pigeonhole` (new) |
| A8 Q4(iii) | Three colours, n pairs | pigeonhole, parity cases | proof (2n + 2) | Hints: method | `comb.pigeonhole` (new), `proof.cases` |
| A12 Q1(i) to (v) | Divisibility of n(n + 1), n³ − n, n⁵ − n³, 2^(2n) − 1, and n³ − 1 when 3 divides n − 1 | factorise and argue | proof | Hints | `num.divisibility`, `pre.algebraic-argument`, `proof.cases` |
| A12 Q2(i) | Write sums of algebraic fractions as one fraction | common denominators | expression | Hints: answers | `pre.fractions`, `pre.algebraic-manipulation` |
| A12 Q2(ii) | 9 mints, 6 lemons; eat two: same flavour | without replacement, two methods | value (17/35) | Hints: answer | `pre.tree-diagrams`, `prob.counting-probability` |
| A12 Q2(iii) | a apple sours, b blackcurrant chews: one apple; three blackcurrants | dependent draws | expression | Hints: answers | `pre.probability-scale`, `pre.tree-diagrams` |
| A12 Q2(iv) | Three children, each brings goggles with probability 1/4 | complement, independence | value (37/64, 1/4, 3/64) | Hints: answers | `prob.independent-events` |
| A12 Q3(i) | 2011 STEP I Q12: raffle queue, n = 1 | equally likely orders | expression (m/(m + 1)) | Hints: answer | `prob.counting-probability` |
| A12 Q3(ii), (iii) | n = 2 and 3: show (m − 1)/(m + 1) and (m − 2)/(m + 1) | sequential cases | proof | Hints: method | `prob.counting-probability`, `prob.conditional-formula`, `proof.cases` |
| A12 Q4 | Rabbi, Imam, Bishop: ages with product 2450 | factorise, list systematically | value with reasons (50) | Hints: method and table | `pre.prime-factorisation` |
| A19 Q1 to Q3 | Small-angle limits; coordinate geometry; 2005 STEP I Q6 | not probability | proof, value | Hints | none |
| A19 Q4(i) | Three coins (HT, HH, TT); see a head: P(other side is a head) | list equally likely outcomes | value (2/3) | Hints: answer | `pre.sample-spaces`, `prob.conditional-formula` |
| A19 Q4(ii) | Three dice: P(three sixes), P(one six) | sample spaces | value (1/216, 25/72) | Hints: answers | `pre.sample-spaces`, `prob.binomial-distribution` |
| A19 Q4(ii), bet | Should I accept a £1, £2, £3 bet on sixes? | expected gain (17/216 per game) | explanation | Hints: method | none now (expectation is IA "Discrete random variables", a later batch) |

Taught material in the assignments:

| location | what it teaches | topic ids |
|---|---|---|
| A6 Q5 "Arrangements Examples" | Claire: 6 × 5 × ... × 1 = 6!; Stuart: one repeated letter, 6!/2!; Anna: label the repeats, then divide, 4!/(2! 2!) | `pre.product-rule`, `comb.factorial`, `comb.repeated-arrangements` |
| A6 Q4 footnote and Discussion | "Random" means equally likely; false positives and negatives; sensitivity and specificity; P(+ given D) versus P(D given +) | `pre.probability-scale`, `prob.bayes-two-events` (new) |
| A12 Q4 discussion | Change ringing: an extent on 5 bells is 5! = 120 changes | `comb.factorial` |
| A12 Q3 Discussion | The general raffle answer (m + 1 − n)/(m + 1), stated without proof | `prob.counting-probability` |

### IA Probability Example Sheet 1 (2025-26)

No official solutions.

| location | description | teaches or asks | answer kind | topic ids |
|---|---|---|---|---|
| Q1 | Four mice from a litter with two white; P(both white) = 2 P(neither) | combinations; solve for n | value (7) | `prob.classical-probability`, `comb.combinations` |
| Q2 | Knock-out tournament of 2^n players; P(two chosen players meet) in round 1, the final, any round | one probability space for three questions | expression (1/(2^n − 1), 1/(2^(n−1)(2^n − 1)), 1/2^(n−1)) | `prob.classical-probability`, `prob.sampling-models` |
| Q3 | Halve a deck: P(each half has 13 red); decimal; Stirling's approximation | combinations, Stirling | expression and value (C(26,13)²/C(52,26) ≈ 0.2181; Stirling gives 2/√(26π) ≈ 0.2213) | `prob.classical-probability`, `prob.stirling-formula` |
| Q4 | Define a σ-algebra and a probability measure; prove six properties from the definitions | event spaces, axioms, consequences, continuity | proof | `prob.event-spaces` (new), `prob.axioms`, `prob.axiom-consequences`, `prob.continuity` |
| Q5(a) | Inclusion-exclusion form of P(Aᶜ ∩ (B ∪ C)) | three-event identity | proof | `prob.inclusion-exclusion-three`, `prob.axiom-consequences` |
| Q5(b) | How many of 1 to 500 are not divisible by 7 but are divisible by 3 or 5 | counting by inclusion-exclusion | value (200) | `prob.inclusion-exclusion-three` |
| Q6 | Events "A_n infinitely often" and "eventually"; the first Borel-Cantelli lemma | set limits, subadditivity | proof | `prob.subadditivity`, `prob.continuity`, `sets.countable-unions` |
| Q7 | Committee of r from n: P(m given people all on it), directly and by inclusion-exclusion; deduce an identity | two counts of one event | expression (C(n − m, r − m)/C(n, r)), proof | `prob.inclusion-exclusion`, `comb.combinations` |
| Q8 | Exam classes, misreading the rubric with probability 2/3 | total probability, Bayes | value (7/20, 7/15) | `prob.total-probability`, `prob.bayes-formula` |
| Q9 | Labour and Conservative voters; voted the same way twice; P(same again) | conditioning on an observation | expression ((p + (1 − p)(1 − r)²)/(p + (1 − p)(1 − r))) | `prob.total-probability`, `prob.bayes-formula` |
| Q10 | Pólya urn: P(i white among n balls); does the proportion converge? | multiplication rule, induction | expression (1/(n − 1) for each i from 1 to n − 1), proof | `prob.conditional-probability`, `alg.proof-by-induction` |
| Q11 | Mary tosses n + 1 coins, John n: P(Mary gets more heads) | symmetry | value (1/2, 1/2), proof of the conjecture | `prob.classical-probability`, `prob.independence` |
| Q12 | n balls into n boxes: P(exactly one box empty); check n = 2, 3 | counting functions | expression (C(n, 2) n!/n^n), value (1/2, 2/3) | `prob.sampling-models`, `comb.combinations` |
| Q13 | A random non-decreasing function from {1..k} to {1..n} is strictly increasing | samples with repetition | expression (C(n, k)/C(n + k − 1, k)) | `prob.sampling-models` |
| Q14 | Simple symmetric random walk: local limit of P(X_n = 0) and of P(X_n/√n in [x, x + h)) | Stirling asymptotics | proof | `prob.stirling-formula` (the walk is defined in the question; random walks proper are IA "Discrete random variables") |

Every answer above was computed by brute force or exact arithmetic, not copied: the mice (n = 7), the tournament for n = 1 to 4, the deck, the 500 count, the rubric, the urn up to 5 balls, the coins up to 5 against 4, the boxes up to n = 5, and the functions for three (k, n) pairs.

### Taught sections: the Faculty schedules

The two sections already in the graph, read from the fetched PDF (page 12): "Basic concepts" (classical probability, combinatorial analysis, Stirling's formula, [3]) and "Axiomatic approach" (axioms, countable case; probability spaces; inclusion-exclusion; continuity and subadditivity; independence; binomial, Poisson, geometric; Poisson and binomial; conditional probability, Bayes's formula; Simpson's paradox, [5]). Their mapping in the graph stands. Sheet 1 goes past "countable case" in Q4 (σ-algebras); see proposed change 3.

## Map: Discrete Mathematics

Extra answer kinds: **verdict** (true or false, multiple choice), **witness** (a counterexample or example that the app checks by code), **table** (a truth table or operation table, checked cell by cell), **formula** (a logic formula in P, Q, R; checkable by comparing truth tables). Witness, table, and formula graders do not exist yet; see question 8.

### CST notes, Part I "Proofs" and Part II "Numbers" (printed pages 11 to 308)

The notes' own lecture plan (printed pages 7 and 8) splits Proofs into lectures 1 to 6 and Numbers into 7 to 11. Pages are printed slide numbers.

| pages | section | what it teaches | topic ids |
|---|---|---|---|
| 11 to 17 | Preliminaries; objectives; the five-pirates puzzle | study skills; the puzzle is answered by Fermat on page 131 | `proof.direct`, `num.fermat-little` |
| 18 to 41 | Proofs in practice; jargon (statement, predicate, theorem, proposition, lemma, corollary, conjecture, proof, axiom, definition); scratch work; writing proofs | what a proof is; "my proof" versus "your proof" | `proof.direct` |
| 42 to 56 | Implication: proving and using it; modus ponens; Proposition 10 (√x rational) | implication goals and assumptions | `logic.implication`, `proof.direct` |
| 57 to 62 | Bi-implication; Definition 14, divisibility and congruence; odd numbers | iff in both directions | `logic.iff`, `num.divisibility`, `num.congruence` |
| 63 to 76 | Universal quantification; Proposition 18; equality axioms | proving and using ∀ | `logic.quantifiers`, `proof.quantifier-patterns` |
| 77 to 84 | Conjunction; Theorem 19 (6 divides n iff 2 and 3 do) | proving and using ∧ | `logic.connectives`, `num.divisibility` |
| 85 to 103 | Existential quantification; the pigeonhole principle and the intermediate value theorem as examples; Theorem 23 (divisibility is transitive); unique existence | proving and using ∃; ∃! | `logic.quantifiers`, `proof.quantifier-patterns`, `num.divisibility`, `comb.pigeonhole` (new) |
| 104 to 115 | Disjunction; Proposition 25 (n² ≡ 0 or 1 mod 4) | proof by cases | `logic.connectives`, `proof.cases`, `num.modular-arithmetic` |
| 116 to 121 | A little arithmetic: Lemmas 27, 28 (p divides C(p, m)), Proposition 29 | binomial coefficients mod p | `num.prime-binomial` |
| 122 to 124 | Binomial Theorem, Corollaries 31, 32 (stated; proved on page 271) | (z + 1)^n; 2^n = Σ C(n, k) | `comb.binomial-theorem` |
| 125 to 131 | Freshman's Dream; Dropout Lemma; Fermat's Little Theorem, part 1; pirates answer; applications | FLT from the binomial theorem | `num.fermat-little` |
| 133 to 153 | Negation; Theorems 37 and 39; √2 irrational; proof by contradiction; proof by contrapositive; Proposition 42 (n even iff n² even); Lemma 43 (lowest terms) | negation and the two indirect methods | `logic.connectives`, `logic.equivalences`, `proof.contradiction`, `proof.contrapositive` |
| 154 to 157 | Numbers: topics, objectives, on induction | overview | none |
| 158 to 175 | Natural numbers (N starts at 0, page 158); monoids, semirings, cancellation, inverses, groups, rings, fields | number systems as algebraic structures | `num.number-systems`, `num.algebraic-structures` (new) |
| 176 to 187 | Division theorem and algorithm (with ML code); Theorems 54, 57; Proposition 58; Corollary 59 | existence, uniqueness, the algorithm's invariant | `num.division-theorem` |
| 188 to 197 | Modular arithmetic; Z_m; tables for Z_4 and Z_5; Propositions 63, 64; integer linear combinations, Proposition 66 | Z_m and when an element has a reciprocal | `num.modular-integers`, `num.modular-arithmetic` |
| 198 to 206 | Sets: membership, defining sets, comprehension, set equality | set-builder notation | `sets.comprehension` |
| 207 to 214 | Greatest common divisor; CD(m, n); Key Lemma 72; Corollary 73 | gcd from common divisors | `num.gcd` |
| 215 to 237 | Euclid's algorithm; termination (Theorem 79) and a step bound; lowest terms; Corollary 80; Lemma 81 (commutativity, associativity, linearity of gcd) | the algorithm and gcd laws | `num.euclid-algorithm`, `num.gcd` |
| 238 to 243 | Coprimality; Euclid's Theorem 83 (k divides mn, gcd(k, m) = 1, so k divides n), proved by gcd linearity; Corollary 84 (prime form); FLT part 2; Corollary 85 | Euclid's Theorem before the extended algorithm | `num.euclid-theorem`, `num.fermat-little`, `num.prime-binomial` |
| 244 | Fields of modular arithmetic: Z_p is a field, inverse i^(p−2) | a consequence of FLT | `num.modular-inverse`, `num.algebraic-structures` (new) |
| 245 to 258 | Extended Euclid's algorithm; Theorem 88; egcd (ML); Theorem 92 (least positive linear combination); Corollary 93 (inverses) | Bézout and inverses | `num.extended-euclid`, `num.modular-inverse` |
| 259 to 264 | Diffie-Hellman key exchange; Lemma 94; RSA (Lemma 95) | modular powers in cryptography | `num.diffie-hellman` (RSA: none, see "Not proposed") |
| 265 to 282 | Principle of induction; template; Binomial Theorem proof; Pascal's triangle; FLT by induction | induction | `alg.proof-by-induction`, `comb.binomial-theorem-proof`, `comb.binomial-identities`, `num.fermat-little` |
| 283 to 290 | Induction from a basis; strong induction from a basis | two derived principles | `alg.proof-by-induction`, `proof.strong-induction` |
| 291 to 305 | Fundamental Theorem of Arithmetic (existence by strong induction, uniqueness); gcd as min of exponents | FTA | `num.fundamental-theorem`, `proof.strong-induction` |
| 306 to 308 | Euclid's infinitude of primes | contradiction | `proof.infinitely-many-primes` |

### Supervision work 1 (Exercises 1 to 4; 63 exercises)

The sheet "Proofs, Numbers, and Sets" has six exercise sets. Exercises 1 to 4 are this batch; 5 (sets) and 6 (relations) belong to the Sets part. No public solutions for 2025-26.

| location | description | answer kind | topic ids |
|---|---|---|---|
| 1.1.1 | n > 2 not prime implies 2n + 13 not prime | verdict, witness (false: n = 8 gives 29) | `proof.counterexample` |
| 1.1.2 | x² + y = 13 and y ≠ 4 imply x ≠ 3 | verdict, proof | `proof.contrapositive` |
| 1.1.3 | n² even iff n even | verdict, proof | `logic.iff`, `proof.contrapositive` |
| 1.1.4 | Reals: for all x, y there is z with x + z = y − z | verdict, witness (z = (y − x)/2) | `proof.quantifier-patterns` |
| 1.1.5 | Integers: the same | verdict, witness (false: x = 0, y = 1) | `proof.counterexample`, `logic.negating-quantifiers` |
| 1.1.6 | Sum of two rationals is rational | proof | `num.number-systems`, `proof.direct` |
| 1.1.7 | x ≠ 2: a unique y with 2y/(y + 1) = x | witness (y = x/(2 − x)), proof of uniqueness | `proof.quantifier-patterns` |
| 1.1.8 | mn even implies m or n even | verdict, proof | `proof.contrapositive`, `proof.cases` |
| 1.2.1 | Which d, n satisfy 0 \| n; d \| 0 | explanation | `num.divisibility` |
| 1.2.2 | km \| kn iff m \| n (k > 0) | proof | `num.divisibility` |
| 1.2.3 | For all n in N, 2 \| 2^n | verdict, witness (false at n = 0, because N starts at 0) | `proof.counterexample`, `num.number-systems` |
| 1.2.4 | Divisibility is transitive | proof | `num.divisibility` |
| 1.2.5 | Counterexample to m \| k and n \| k imply mn \| k | witness (m = n = k = 2) | `proof.counterexample`, `num.divisibility` |
| 1.2.6 | d divides sums, multiples, and combinations | proof | `num.divisibility` |
| 1.2.7 | 30 \| n iff 2, 3, and 5 divide n | proof | `num.divisibility`, `logic.iff` |
| 1.2.8 | m \| n and n \| m imply m = ±n | proof | `num.divisibility`, `proof.cases` |
| 1.2.9 | k \| mn implies k \| m or k \| n | verdict, witness (false: k = 4, m = n = 2) | `proof.counterexample`, `num.euclid-theorem` |
| 1.2.10 | P#(n) = "P(k) for all k ≤ n": properties and a failing example | proof, witness | `proof.strong-induction`, `logic.quantifiers` |
| 1.3.1 | Triangular numbers: t3 to t5, formula, 8n + 1 square, Euler's maps, Jordan's generalisation | value (6, 10, 15), expression (k(k + 1)/2), proof | `alg.arithmetic-series`, `logic.iff`, `proof.quantifier-patterns` |
| 1.3.2 | (∃x P(x)) ⇒ Q iff ∀x (P(x) ⇒ Q) | proof | `logic.equivalences`, `logic.quantifiers` |
| 2.1.1 | Congruence is reflexive, symmetric, transitive | proof | `num.congruence` |
| 2.1.2 | Congruence respects +, ×, and powers | proof | `num.modular-arithmetic` |
| 2.1.3 | Three rem identities | proof | `num.division-theorem`, `num.modular-arithmetic` |
| 2.1.4 | Associativity in Z_m; additive inverse [−k] | proof | `num.modular-integers`, `num.algebraic-structures` (new) |
| 2.2.1 | k ≡ l but i^k ≢ i^l (mod m) | witness | `num.modular-arithmetic`, `proof.counterexample` |
| 2.2.2 | Digit-sum tests for 3, 9, and 11 | proof | `num.modular-arithmetic` |
| 2.2.3 | n² mod 4 is 0 or 1 | proof | `proof.cases`, `num.modular-arithmetic` |
| 2.2.4 | rem(55², 79), rem(23², 79), rem(23 · 55, 79), rem(55^78, 79) | value (23, 55, 1, 1) | `num.modular-arithmetic`, `num.fermat-little` |
| 2.2.5 | 2^153 ≡ 53 (mod 153); why this does not contradict FLT | value, explanation (153 is not prime) | `num.modular-exponentiation`, `num.fermat-little` |
| 2.2.6 | Addition, multiplication, and inverse tables for Z_3, Z_6, Z_7 | table | `num.modular-integers`, `num.modular-inverse` |
| 2.2.7 | n ≡ 1 (mod p − 1) implies i^n ≡ i (mod p) | proof | `num.fermat-little` |
| 2.2.8, 2.2.9 | n³ ≡ n (mod 6); n⁷ ≡ n (mod 42) | proof | `num.fermat-little`, `num.euclid-theorem` |
| 2.3.1 | n = i² − j² iff n ≢ 2 (mod 4) | proof | `proof.cases`, `num.modular-arithmetic` |
| 2.3.2 | Repunits: the first three in base 10 and 2; none above 1 is a square | value, proof | `num.modular-arithmetic`, `proof.contradiction` |
| 3.1.1 | CD(666, 330) | set ({1, 2, 3, 6}) | `num.gcd`, `sets.comprehension` |
| 3.1.2 | gcd(21212121, 12121212) | value (3030303) | `num.euclid-algorithm` |
| 3.1.3 | gcd(m, n) divides km + ln | proof | `num.gcd` |
| 3.1.4 | x, y with 30x + 22y = gcd; then with 0 ≤ y' < 30 | witness (any pair the app verifies, for example (−8, 11)) | `num.extended-euclid` |
| 3.1.5 | km + ln = 1 for some k, l iff gcd = 1 | proof | `num.extended-euclid` |
| 3.1.6 | n² ≡ 1 (mod p) implies n ≡ ±1 | proof | `num.euclid-theorem` |
| 3.2.1 | gcd(m, n) = m iff m \| n | proof | `num.gcd` |
| 3.2.2 | Coprime m, n: m \| k and n \| k iff mn \| k | proof | `num.euclid-theorem` |
| 3.2.3 | gcd(a, c) = 1 implies gcd(ab, c) = gcd(b, c) | proof | `num.euclid-theorem`, `num.gcd` |
| 3.2.4 | Cancelling n in a congruence mod m divides the modulus by gcd(m, n) | proof | `num.euclid-theorem`, `num.congruence` |
| 3.2.5 | Fractions in lowest terms are unique | proof | `num.euclid-theorem`, `num.number-systems` |
| 3.2.6 | gcd(13a + 8b, 5a + 3b) = gcd(a, b) | proof | `num.gcd` |
| 3.2.7 | n² ≡ 1 (mod 3) and (mod 8); 24 \| p² − 1 | proof | `proof.cases`, `num.modular-arithmetic`, `num.euclid-theorem` |
| 3.2.8 | n^13 ≡ n (mod 10) | proof | `num.fermat-little` |
| 3.2.9 | gcd(l, mn) = 1 implies gcd(l, m) = gcd(l, n) = 1 | proof | `num.gcd` |
| 3.2.10 | Solve 77x ≡ 11 (mod 40); 12y ≡ 30 (mod 54); a system in z | set (x ≡ 23 mod 40; y in {7, 16, 25, 34, 43, 52} mod 54; z = 97 mod 357, if (c) is the system it appears to be) | `num.modular-inverse`, `num.extended-euclid` |
| 3.2.11 | Inverses of 2 in Z_7, 7 in Z_40, 13 in Z_23 | value (4, 23, 16) | `num.modular-inverse` |
| 3.2.12 | An element of Z_175 has an inverse (statement garbled in the text) | proof | `num.modular-inverse` |
| 3.3.1 | a² \| b(b + a) implies a \| b | proof | `num.euclid-theorem` |
| 3.3.2 | Converse of 1.3.1(f) (49th Putnam) | proof | `num.euclid-theorem`, `num.divisibility` |
| 3.3.3 | Justify the subtractive gcd algorithm gcd0 | explanation | `num.euclid-algorithm` |
| 4.1.1 | Polygon angle sum, n ≥ 3 | proof | `alg.proof-by-induction` |
| 4.1.2 | Trominoes tile a 2^n grid with one square removed | proof | `alg.proof-by-induction` |
| 4.2.1 | A geometric-sum identity; 2^k − 1 not prime for composite k | proof | `alg.geometric-series`, `proof.contrapositive` |
| 4.2.2 | Bernoulli's inequality | proof | `alg.proof-by-induction` |
| 4.2.3 | Fibonacci: Cassini; addition formula; F_n \| F_ln; gcd steps; gcd(F_m, F_n) = F_gcd(m,n); three sums | proof, expression for (g) (F_(2n+1) − 1, F_(2n+2), F_(n+2) − 1) | `alg.proof-by-induction`, `proof.strong-induction`, `num.euclid-algorithm` |
| 4.3.1 | gcd0 terminates, by induction from basis 2 | proof | `proof.strong-induction`, `num.euclid-algorithm` |
| 4.3.2 | Polynomials; Σ i² and Σ i^k are polynomials in n | proof, expression (n(n + 1)(2n + 1)/6) | `alg.proof-by-induction`, `alg.sigma-notation` |

The values in this table were computed (Python `pow`, `gcd`, and search), not copied.

### Book of Proof (edition 3.4)

The owner's list names chapters on logic, direct proof, contrapositive, contradiction, induction, and number theory. Book of Proof has no number theory chapter; its number theory is Section 1.9 (division algorithm), Chapter 4 (divisibility, gcd, lcm), Section 5.2 (congruence), Chapter 7 (gcd as a linear combination, Euclid's lemma, the division algorithm's uniqueness), Section 10.4 (FTA), and Section 11.5 (Z_n). Chapter 7 and Section 11.5 are included on that basis (question 5). "odd" means odd-numbered exercises have solutions at the back.

Taught sections:

| section | teaches | topic ids |
|---|---|---|
| 1.9 Sets That Are Number Systems | N, Z, Q, R; the division algorithm (Fact 1.5) | `num.number-systems`, `num.division-theorem` |
| 2.1 to 2.6 | Statements; and, or, not; conditionals; biconditionals; truth tables; logical equivalence | `logic.connectives`, `logic.implication`, `logic.iff`, `logic.equivalences` |
| 2.7 to 2.10 | Quantifiers; more on conditionals; translating English; negating statements | `logic.quantifiers`, `logic.nested-quantifiers`, `logic.negating-quantifiers` |
| 2.11, 2.12 | Logical inference; a note on proofs | `logic.implication`, `proof.direct` |
| 4.1 to 4.5 | Theorems; definitions (even, odd, parity, divides, prime, gcd, lcm); direct proof; cases | `proof.direct`, `pre.algebraic-argument`, `num.divisibility`, `proof.cases` |
| 5.1 to 5.3 | Contrapositive proof; congruence of integers; mathematical writing | `proof.contrapositive`, `num.congruence` |
| 6.1 to 6.4 | Contradiction (√2, infinitely many primes); conditionals by contradiction; combining methods | `proof.contradiction`, `proof.infinitely-many-primes` |
| 7.1 to 7.4 | Iff proofs; equivalent statements; existence and uniqueness; gcd as the least positive linear combination (page 164); constructive proofs | `logic.iff`, `proof.quantifier-patterns`, `num.extended-euclid` |
| 10.1 to 10.5 | Induction; strong induction; smallest counterexample; FTA; Fibonacci numbers | `alg.proof-by-induction`, `proof.strong-induction`, `num.fundamental-theorem` |
| 11.5 The Integers Modulo n | Z_n, its operations, well-definedness | `num.modular-integers` |

Exercises (278):

| location | description | answer kind | help | topic ids |
|---|---|---|---|---|
| 2.1, 1 to 15 | Is it a statement; if so, true or false | verdict | odd | `logic.connectives` |
| 2.2, 1 to 14 | Write in symbols with P, Q, ∧, ∨, ∼ | formula | odd | `logic.connectives` |
| 2.3, 1 to 13 | Rewrite as "If P, then Q" (necessary, sufficient, only if, whenever) | explanation | odd | `logic.implication`, `logic.iff` |
| 2.4, 1 to 5 | Rewrite as "P if and only if Q" | explanation | odd | `logic.iff` |
| 2.5, 1 to 9 | Truth tables | table | odd | `logic.connectives`, `logic.implication` |
| 2.5, 10, 11 | Find truth values from a false or true compound | value | odd | `logic.implication` |
| 2.6, 1 to 8 | Show equivalence by truth table (distributive, De Morgan, implication) | table | odd | `logic.equivalences` |
| 2.6, 9 to 14 | Equivalent or not | verdict | odd | `logic.equivalences` |
| 2.7, 1 to 10 | Read quantified statements in English; true or false | verdict, explanation | odd | `logic.quantifiers`, `logic.nested-quantifiers` |
| 2.9, 1 to 13 | Translate English into symbols (includes the ε-δ definitions) | formula | odd | `logic.quantifiers`, `logic.nested-quantifiers`, `logic.implication` |
| 2.10, 1 to 12 | Negate | formula, explanation | odd | `logic.negating-quantifiers`, `logic.connectives` |
| 4, 1 to 5 | Parity of x², x³, a² + 3a + 5, xy | proof | odd | `pre.algebraic-argument`, `proof.direct` |
| 4, 6 to 11, 19, 20 | Divisibility facts | proof | odd | `num.divisibility`, `proof.direct` |
| 4, 12, 13, 18 | Real inequalities and algebra | proof | odd | `proof.direct` |
| 4, 14 to 17 | Parity by cases | proof | odd | `proof.cases` |
| 4, 21 | p divides C(p, k) for 0 < k < p | proof | odd | `num.prime-binomial` |
| 4, 22, 23, 25 | Binomial coefficient identities | proof | odd | `comb.combinations`, `comb.binomial-identities` |
| 4, 24 | n! + 2 to n! + n are composite | proof | none (even) | `proof.direct` |
| 4, 26 | Every odd integer is a difference of squares | proof | none (even) | `proof.quantifier-patterns` |
| 4, 27, 28 | gcd facts | proof | odd | `num.gcd` |
| 5, 1 to 13 | Contrapositive proofs (parity, divisibility, polynomial signs) | proof | odd | `proof.contrapositive`, `num.divisibility` |
| 5, 14 to 16 | Direct or contrapositive, parity | proof | odd | `proof.contrapositive`, `proof.direct` |
| 5, 17, 28 | 8 \| n² − 1 for odd n; 4 ∤ n² − 3 | proof | odd | `proof.cases`, `num.modular-arithmetic` |
| 5, 18 to 24, 32 | Congruence facts | proof | odd | `num.congruence`, `num.modular-arithmetic` |
| 5, 25 | 2^n − 1 prime implies n prime | proof | odd | `proof.contrapositive` |
| 5, 26, 27 | Rows of Pascal's triangle; parity of C(a, 2) | proof | odd | `comb.binomial-identities` |
| 5, 29 to 31 | gcd(a, b) = gcd(a − b, b); gcd of congruent numbers; gcd(a, b) = gcd(r, b) | proof | odd | `num.gcd` |
| 6, 1, 2, 6 to 8, 18 | Parity by contradiction | proof | odd | `proof.contradiction` |
| 6, 3 to 5, 21, 23, 24 | Irrationality (∛2, √6, √3, √(3^k), log₂ 3) | proof | odd | `proof.contradiction` |
| 6, 9, 12, 13, 16 | Reals and rationals by contradiction | proof | odd | `proof.contradiction` |
| 6, 10, 11 | No integers with 21a + 30b = 1, 18a + 6b = 1 | proof | odd | `proof.contradiction`, `num.divisibility` |
| 6, 14 | A ∩ (B − A) = ∅ | proof | none (even) | `proof.contradiction`, `pre.set-notation` |
| 6, 15, 17 | b divides every k means b = 0; 4 ∤ n² + 2 | proof | odd | `num.divisibility`, `num.modular-arithmetic` |
| 6, 19 | Five consecutive integers: product divisible by 120 | proof | odd | `num.divisibility`, `proof.cases` |
| 6, 20, 22 | No rational points on x² + y² = 3 and variants | proof | odd | `proof.contradiction` |
| 7, 1 to 5, 11, 13, 15, 16 | Parity iff statements | proof | odd | `logic.iff`, `proof.cases` |
| 7, 6, 7 | Real algebra iff | proof | odd | `logic.iff` |
| 7, 8 to 10 | Congruence mod 10, 14 \| a, a³ ≡ a (mod 3) | proof | odd | `num.congruence`, `num.divisibility`, `proof.cases` |
| 7, 12, 17, 18, 20 | Existence: x² < x; a prime between 90 and 100; a set; 11 \| 2^n − 1 | witness (for example 1/2, 97, n = 10) | odd | `proof.quantifier-patterns` |
| 7, 14 | a² \| a iff a in {−1, 0, 1} | proof | none (even) | `num.divisibility` |
| 7, 19 | Sum of powers of 2 | proof | odd | `alg.geometric-series` |
| 7, 21, 27 | Irrational roots; a² + b² square means not both odd | proof | odd | `proof.contradiction` |
| 7, 22 to 25 | Mod 4 facts; divisibility; trial division | proof | odd | `proof.cases`, `num.divisibility`, `proof.contrapositive` |
| 7, 26 | n! divides a product of n consecutive integers | proof | none (even) | `comb.combinations` |
| 7, 28 | Division algorithm, uniqueness | proof | none (even) | `num.division-theorem` |
| 7, 29, 30, 34 | Euclid's lemma and coprimality via the gcd proposition (page 164) | proof | odd | `num.euclid-theorem` |
| 7, 31 to 33, 35, 36 | gcd(n, n + 1) = 1 and similar; gcd and lcm iff | proof | odd | `num.gcd` |
| 10, 1 to 8, 15, 20, 34 | Sum formulas | proof | odd | `alg.proof-by-induction`, `alg.sigma-notation` |
| 10, 9 to 14, 43 | Divisibility by induction | proof | odd | `alg.proof-by-induction`, `num.divisibility` |
| 10, 16, 19, 21, 22 | Inequalities by induction | proof | odd | `alg.proof-by-induction` |
| 10, 17, 18 | De Morgan for n sets | proof | odd | `alg.proof-by-induction`, `pre.set-notation` |
| 10, 23 | The binomial theorem by induction | proof | odd | `comb.binomial-theorem-proof` |
| 10, 24, 31, 35 to 41 | Binomial coefficient identities | proof | odd | `comb.binomial-identities` |
| 10, 25 to 30, 32, 42 | Fibonacci identities and Binet's formula | proof | odd | `alg.proof-by-induction`, `proof.strong-induction` |
| 10, 33 | n lines cut the plane into (n² + n + 2)/2 regions | proof | odd | `alg.proof-by-induction` |
| 11.5, 1 to 4 | Addition and multiplication tables for Z_2, Z_3, Z_4, Z_6 | table | odd | `num.modular-integers` |
| 11.5, 5, 6 | Zero divisors in Z_5, Z_6, Z_7 | verdict, explanation | odd | `num.modular-integers`, `num.euclid-theorem` |
| 11.5, 7 | Calculations in Z_9 | value | odd | `num.modular-integers` |
| 11.5, 8 | Addition in Z_n is well defined | proof | none (even) | `num.modular-integers` |

### TMUA Notes on Logic and Proof (June 2025)

No answers are given. Page numbers are the PDF's.

| pages | section | teaches | topic ids |
|---|---|---|---|
| 8 to 11 | Statements; truth values; logical equivalence | what a statement is | `logic.connectives` |
| 12 to 20 | Making new statements: not, and, or, with truth tables and diagrams | connectives | `logic.connectives` |
| 21 to 24 | Revisiting equivalence; negating compound statements | De Morgan | `logic.equivalences`, `logic.connectives` |
| 25 to 37 | Language and implication; if, only if, if and only if (the church bells) | conditionals | `logic.implication`, `logic.iff` |
| 38 to 49 | Swapping A and B; converse; contrapositive | which forms are equivalent | `logic.equivalences`, `proof.contrapositive` |
| 50 | Symbols (off specification) | notation | `logic.implication` |
| 51 to 55 | Necessary and sufficient | the terms | `logic.iff` |
| 56 to 63 | Quantifiers; combining them; negating ∀ and ∃ | quantifiers | `logic.quantifiers`, `logic.nested-quantifiers`, `logic.negating-quantifiers` |
| 64 to 71 | Proof: direct, contradiction (√2), contrapositive, counterexample | methods | `proof.direct`, `proof.contradiction`, `proof.contrapositive`, `proof.counterexample` |
| 72 to 74 | Identifying errors in proofs: squaring, inequalities, dividing by zero | error spotting | none (see "Not proposed") |

| exercise | description | answer kind | topic ids |
|---|---|---|---|
| A (4 parts) | Which combinations about 21 are true; replace 21 by x | verdict, explanation | `logic.connectives` |
| B (2) | not not A; m nots | value (truth value), explanation | `logic.connectives` |
| C (4) | Truth tables for A and (B and C), (A and B) and C, and the or versions | table | `logic.connectives` |
| D (2) | Find statements and their negations in texts | explanation | `logic.connectives` |
| E (4) | Write if A then B with and, or, not; if A then (A or B) | formula, table | `logic.implication`, `logic.equivalences` |
| F (3) | Show not (A and not B) ≡ not A or B; equivalent forms | table, explanation | `logic.equivalences` |
| G | Diagram for A iff B | sketch | `logic.iff` |
| H | Is if A then B the same as if B then A | verdict | `logic.implication` |
| I (3) | Symmetry of diagrams; A iff B versus B iff A | explanation | `logic.iff` |
| J (4) | Converses; are they true | explanation, verdict | `logic.implication` |
| K (5) | Contrapositives; the contrapositive of the converse | explanation | `logic.equivalences`, `proof.contrapositive` |
| L (2) | Rewrite with symbols; xor and nand | explanation | `logic.connectives` |
| M (8 statements) | ∀ or ∃, true or false | verdict | `logic.quantifiers` |
| N (8 statements) | Two quantifiers in each order, true or false | verdict | `logic.nested-quantifiers` |
| O (2) | Where the √2 proof fails for 9; √p for prime p | explanation, proof | `proof.contradiction` |
| P (2, with 4 and 6 parts) | What is a counterexample to "A and B", "A or B", ...; find counterexamples | explanation, witness | `proof.counterexample` |
| Q | Solve √(2x + 3) + √(x + 1) = √(7x + 4) (reading of the extraction; check the PDF) | value (x = 3, after rejecting −1/2) | `pre.algebraic-manipulation` |
| R (3) | When does x < y give xⁿ < yⁿ, f(x) < f(y); a bad cross-multiplication | explanation | none |

## Proposed graph changes

Each is a proposal for review; nothing in `graph/` was changed.

1. **New `comb.pigeonhole`** (area `counting`): "If more than kn objects go into n boxes, some box holds more than k; use it to guarantee a match." Sources: A5 Q4 and A8 Q4 (socks; the general case needs parity cases), CST notes page 87 (the pigeonhole principle as the example of an existential statement), Book of Proof 3.9 (not in this batch). Prereqs `pre.product-rule`, `proof.cases`. Reason: four problems in this batch need it, and no topic teaches it. Level: no fetched syllabus names it (question 3).
2. **Split Bayes: new `prob.bayes-two-events`** (area `elementary-probability`, level `step`): "Reverse a conditional probability with a tree or a table of counts; P(A given B) is not P(B given A); the prosecutor's fallacy." Prereq `prob.conditional-formula`. `prob.bayes-formula` (Tripos, a partition) adds it as a prereq and encompasses it at about 0.5. Reason: STEP Assignment 6 teaches Bayes at A level, with no axioms, and labels it explicitly ("assuming that you didn't know it"). Today the graph only has Bayes after the axioms, so A6 Q4 has no home below the Tripos, and decision 11 asks for the foundation.
3. **New `prob.event-spaces`** (area `ia-axiomatic`): "Events form a σ-algebra: closed under complement and countable unions; deduce ∅, finite unions, and countable intersections." Prereq `sets.countable-unions`; `prob.axioms` takes it as a prereq. Reason: Sheet 1 Q4 asks for the definition of a σ-algebra and proofs from it, although the schedule says "Axioms (countable case)". The alternative is to fold it into `prob.axioms` (question 4).
4. **New `num.algebraic-structures`** (area `number-theory`): "Monoids, groups, (commutative) rings, and fields; cancellation; inverses are unique; N, Z, Q, Z_m, and Z_p as examples." Prereq `num.number-systems`; `num.modular-inverse` lists it so "Z_p is a field" has a home. Cites CST "Numbers", syllabus item "Number systems: natural numbers, integers, rationals" (add it to that item in `schedules.ts`). Reason: the notes spend printed pages 158 to 175 on these structures and sheet 2.1.4 asks for them; `num.number-systems` only covers closure.
5. **Edge: `num.euclid-theorem`** prereq `num.extended-euclid` becomes `num.euclid-algorithm`. Reason: the 2025-26 notes prove Euclid's Theorem (Theorem 83) from the linearity of gcd (Lemma 81.3), on printed pages 238 to 239, before the extended algorithm on page 245. Book of Proof uses the Bézout route instead (page 164); the lesson can show both. Effect: `num.extended-euclid` stops being an ancestor of `num.fundamental-theorem`, so FTA comes earlier.
6. **Edge: `num.fermat-little`** drops prereq `num.modular-inverse`. Reason: the notes prove FLT part 1 from the binomial theorem and p dividing C(p, m), and part 2 from part 1 and Euclid's Theorem (printed pages 129, 240, 241); the inverse i^(p−2) is a consequence (Corollary 86, page 244). The edge to `num.prime-binomial` already brings in Euclid's Theorem. This also settles call 5 of the CST review (which proof of FLT): the binomial route, as the notes do it.
7. **Note fix: `num.number-systems`.** The notes define N from 0 (printed page 158), which resolves caveat 3 of the CST review. It matters: sheet 1.2.3 is false only because 0 is in N.

Not proposed, with reasons:

- **Unique existence and the equality axioms** (notes pages 74 to 76 and 100 to 102; Book of Proof 7.3; sheet 1.1.7): taught inside `proof.quantifier-patterns`, not a new topic.
- **Fibonacci numbers** (sheet 4.2.3; Book of Proof 10.5 and ten exercises): a context for induction, defined in each problem.
- **RSA** (notes page 264): not in the syllabus. A lesson aside for `num.diffie-hellman`.
- **Systems of congruences** (sheet 3.2.10(c), if it is a system): solvable with inverses alone; no Chinese remainder topic.
- **Expected value** (A19 Q4(ii) bet): arrives with IA "Discrete random variables" in a later batch; the bet goes to supervision until then.
- **Limsup events and Borel-Cantelli** (Sheet 1 Q6): supervision on `prob.subadditivity` and `prob.continuity` (question 6).
- **Block 2's trigonometry, geometry, curve sketching, linear systems, and AM-GM** (A5 Q1 to Q3, A6 Q1(ii), A7 Q1 and Q3, A8 Q1 to Q3): outside both courses (question 1).
- **TMUA "Identifying errors in proofs"**: lesson material and misconceptions for `proof.direct` and `pre.algebraic-manipulation`, not a topic.

After these changes the shared graph would have 102 topics. The validator has not been run on them, because nothing is changed yet.

## How the 10 current topics would be rewritten

The current topics are the graph's roots. The Cambridge sources mostly start above them, so several rewrites are thin: the explanation stays from scratch (decision 11), and the sources supply the examples and problems.

| topic (content file) | lesson from | worked examples from | Cambridge problems | gap |
|---|---|---|---|---|
| `pre.fractions` (`fractions.ts`) | A5 and A6's "leave answers as fractions in lowest terms" | A6 Q1(i): cancel the product to 9 | A6 Q1(i) general case (2n + 1); A12 Q2(i) | No source teaches fractions from the start. |
| `pre.algebraic-manipulation` (`algebraic-manipulation.ts`) | A7 Q2 note on ≡ versus = | A12 Q1(ii) (n³ − n = (n − 1)n(n + 1)); A7 Q2(i) | A7 Q2, Q3; A12 Q2(i); TMUA Q | None. |
| `pre.indices` (`indices.ts`) | none directly | A12 Q1(iv) (2^(2n) = 4^n) | A12 Q1(iv) | Thin; keep the current lesson. |
| `pre.sequences` (`sequences.ts`) | none directly | A6 Q1(i) general term | sheet 1.3.1(a), (b) (triangular numbers) | Thin. |
| `pre.product-rule` (`product-rule.ts`) | A6 Q5(i) (Claire's 6 × 5 × ... × 1) | A7 Q4(i)(c) (2^n: each weight in or out) | A7 Q4(ii)(b) (3^n), A7 Q4(i)(b) | None. |
| `comb.factorial` (`factorial.ts`) | A6 Q5(i) | A6 Q2(i); A12 Q4 discussion (5! = 120 changes) | A6 Q2(i) | None. |
| `pre.probability-scale` (`probability-scale.ts`) | A6 Q4 footnote ("random" means equally likely) | A12 Q2(iii)(a) (a/(a + b)) | A12 Q2(iii)(a) | Thin; A19 Q4(ii) needs `pre.sample-spaces` too. |
| `pre.set-notation` (`set-notation.ts`) | TMUA diagrams for and, or, not (pages 12 to 20) | A6 Q4 Venn-style diagram | none in this batch | Book of Proof Chapter 1 is not in the batch (question 9). |
| `sets.comprehension` (`set-builder.ts`) | CST notes printed pages 198 to 206 | notes Example 67; set equality page 205 | sheet 3.1.1 (CD(666, 330) as a comprehension) | None. |
| `logic.connectives` (`connectives.ts`) | TMUA pages 8 to 24; Book of Proof 2.1, 2.2, 2.5; CST notes conjunction (77 to 84), disjunction (104 to 115), negation (133) | TMUA truth tables; Book of Proof 2.5 examples | Book of Proof 2.1, 2.2, 2.5, 2.6; TMUA C, B | None. |

Existing generator checks (1,000 seeds, reference solver, misconceptions) stay. Variants come from the cited problems; for example A6 Q2 gives a repeated-letters generator, and A12 Q2(iv) an "at least one" generator.

## Auto-checked practice and supervision

**Auto-checked** (the answer is a value, expression, set, verdict, table, or witness):

- STEP: A5 Q4(i), (ii); A6 Q1(i), Q2(i) to (iii) and (v), Q3(ii), Q4(i)(a) to (c) and (e), Q4(ii); A7 Q4(i)(b), (ii)(a), (ii)(c); A8 Q4(i), (ii); A12 Q2(i) to (iv), Q3(i), Q4 (the age); A19 Q4(i), Q4(ii) probabilities. Each is checked against the hints file's answer as well as by code.
- IA Sheet 1: answer parts of Q1, Q2, Q3, Q5(b), Q7, Q8, Q9, Q10, Q11, Q12, Q13 (11 of 14 questions).
- CST sheet: 1.1.1, 1.1.4, 1.1.5, 1.1.7 (the y), 1.2.3, 1.2.5, 1.2.9, 1.3.1(a), (b), 2.2.1, 2.2.4, 2.2.5 (the value), 2.2.6, 2.3.2(a), 3.1.1, 3.1.2, 3.1.4, 3.2.10, 3.2.11, 4.2.3(g), 4.3.2(c) (20 exercises with an auto part); the true or false verdict of every "prove or disprove".
- Book of Proof: 2.1 (15), 2.5 (11), 2.6 (14), 2.7 verdicts (10), 7.12, 7.17, 7.18, 7.20, 11.5.1 to 11.5.7. The 39 symbolic-form exercises (2.2, 2.9, 2.10) become auto-checked only with a formula grader (question 8).
- TMUA: B, C, E, F (tables), H, M, N (16 verdicts), P(2) (witnesses), Q.

**Supervision** (proof, explanation, sketch): everything else. In particular: the STEP "show that" parts (A5 Q4(iii), A6 Q2(iv), Q3(i), Q4(i)(d), A7 Q4 proofs, A8 Q4(iii), A12 Q1, Q3(ii), (iii)); Sheet 1 Q4, Q5(a), Q6, Q7's identity, Q10's proof, Q11's proof, Q14; 43 of the 63 CST exercises; Book of Proof Chapters 4 to 7 and 10 (except the witnesses above); TMUA A, D, G, I to L, O, R.

**Neither, for now:** the non-probability Block 2 items (A5 Q1 to Q3, A6 Q1(ii), A7 Q1 to Q3, A8 Q1 to Q3, A19 Q1 to Q3), pending question 1.

## Questions

1. **Block 2's non-probability half.** A5, A7, and A8 are mostly trigonometry, geometry, and algebra; only their warm-downs (socks, Bachet's weights) and A7 Q2 and Q3 (polynomial algebra, into `pre.algebraic-manipulation`) fit the graph. Leave the rest unmapped, or add a small algebra-and-trigonometry area as foundations?
2. **Assignment 19.** Included because its warm-down is probability (found by scanning all 25 PDFs). Keep it, or keep the batch to the assignments whose topic line names probability (6 and 12)?
3. **`comb.pigeonhole` level.** No fetched syllabus names it. `step` (it is in STEP Support), `a-level`, or `tripos-ia` (cited from the CST notes)?
4. **σ-algebras.** New topic `prob.event-spaces`, or fold into `prob.axioms`, given the schedule says "countable case" but the sheet asks for σ-algebras?
5. **Book of Proof "number theory".** There is no such chapter. Included: 1.9, Chapter 4's definitions, 5.2, Chapter 7, 10.4, and 11.5. Chapter 7 is "Proving Non-Conditional Statements"; keep it whole (36 exercises), or only its gcd exercises (28 to 36)?
6. **Sheet 1 Q6 (Borel-Cantelli).** Supervision on existing topics, or a new topic `prob.limsup-events`? It is not named in the schedule.
7. **Bayes split** (proposal 2). Agree that Bayes appears twice, once at STEP level by tables and once at Tripos level by partitions?
8. **New graders.** The map assumes witness, table, and formula answers. Witness and table are small; a formula grader (compare truth tables) would make 39 Book of Proof exercises and TMUA E auto-checked. Build all three in step 2, or send formula answers to supervision?
9. **Thin roots.** `pre.indices`, `pre.sequences`, `pre.probability-scale`, and `pre.set-notation` have little Cambridge material. Keep their current lessons with Cambridge examples where they exist, or add Book of Proof Chapter 1 (sets) to this batch for `pre.set-notation`?
10. **Older official solutions.** The CST 2023-24 solutions (already cited by `num.euclid-theorem`, `teaching/2324/DiscMath/solutions/`) cover sheets close to this one. Fetch them as a check for the supervision answers, after confirming the sheets match?
11. **Sheet 3.2.12 and 3.2.10(c).** The text extraction cannot recover 3.2.12's number or confirm that 3.2.10(c) is a system. Albert to read them from the PDF, or render the page to an image for the build?
12. **Sheet 2.3.2's hint** cites "Lemma 27 of the notes", but Lemma 27 in the 2025-26 notes is about C(p, 0) and C(p, p), not squares mod 4 (Proposition 25 fits). Treat the hint as pointing to Proposition 25?
13. **Edge changes 5 and 6** move FTA earlier and remove the inverse edge from FLT. They change the placement and simulation outputs (`SIMULATION.md` is unaffected; `SIMULATION-two-courses.md` will regenerate). Approve?
14. **Book of Proof even-numbered exercises** have no official solution. Use them only as supervision items, or also as auto items where the answer is computable (for example 11.5.4)?


## Decisions (2026-10-05, overnight)

Albert approved building through to deployment without stopping (2026-10-05) and was asleep, so these calls were made on his behalf, choosing the conservative option each time. Each can be revised.

1. Block 2's trigonometry, geometry, and algebra stay unmapped this round; only their probability and counting warm-downs and A7 Q2 and Q3 are used.
2. Assignment 19 stays (its warm-down is probability).
3. `comb.pigeonhole` is level `step`.
4. σ-algebras get their own topic, `prob.event-spaces` (tripos-ia), since sheet 1 asks for them.
5. Book of Proof Chapter 7: only its gcd exercises (28 to 36), plus the other listed number-theory sections.
6. Sheet 1 Q6 (Borel-Cantelli) is a supervision problem on existing topics; no new topic.
7. Bayes appears twice: by tables at STEP level, by partitions at Tripos level.
8. Build all three new graders (witness, table, formula by truth-table comparison), with tests.
9. Keep the thin root lessons, rewritten with Cambridge examples where they exist, and add Book of Proof Chapter 1 (sets) for `pre.set-notation`.
10. Fetch the CST 2023-24 official solutions and use them only to check supervision answers, after confirming the sheets match.
11. Render sheet 3.2.12 and 3.2.10(c) to images and read them; do not guess.
12. Treat sheet 2.3.2's hint as pointing to Proposition 25.
13. Edge changes 5 and 6 approved; regenerate the simulation files.
14. Book of Proof even-numbered exercises: auto-checked where the answer is computable and verified by code, otherwise supervision.
