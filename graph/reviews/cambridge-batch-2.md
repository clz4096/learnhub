# Cambridge content, batch 2: random variables and statistics

Dated 2026-10-05. Status: for review. Sources and source-to-topic map for Part V of the book, "Random variables and statistics" (`mastery/DESIGN-BOOK.md`). Same method as `cambridge-batch-1.md`. No lessons, generators, or app code; nothing in `graph/src` changed.

## Summary

- **Fetched:** 17 sources, 17 OK, 0 failed (4.1 MB). The Faculty schedules were already in the cache from batch 1 and were not fetched again.
- **Mapped:** 62 numbered questions: 13 from Mixed STEP 1 Statistics, 6 from the STEP 2 Statistics module, 4 from the STEP 3 Statistics module, 39 from IA Probability Example Sheets 2, 3, and 4 (13 each). Also the taught material: both STEP topic notes, the preparation text in the Mixed assignment, and the three remaining IA Probability schedule sections ("Discrete random variables", "Continuous random variables", "Inequalities and limits").
- **Verified:** 151 computational checks (brute force, exact rational arithmetic, numerical integration, Monte Carlo), 0 failures. Every STEP answer with an official answer agrees with it. One slip found in the official Mixed solutions; see "Source notes".
- **Proposed graph changes:** 38 new topics for Part V (37 mapped, 1 bridge), 8 new analysis-toolkit topics, and a new Part IV chapter for 4 existing graph topics that now have sources. Proposals only.
- **Questions for Albert:** 12, at the end.

## What was fetched

`scripts/sources/batch-2.json` lists the sources in batch 1's format. URLs come from the Meridian handoff: the STEP links from `handoff/meridian-cambridge/links/step-links.md` (Mixed STEP 1 Statistics, `extra-statistics`; STEP 2 Statistics, `s2-statistics`; STEP 3 Statistics, `s3-statistics`), and IA sheets 2 to 4 from `handoff/meridian-cambridge/courses.md`, next to sheet 1's URL. The DPMMS course page was fetched only to confirm the sheet links: it lists Example sheets 1 to 4, all four under `2025-2026/` (the page heading says "2026-2027"). Each sheet reads "Lent 2026, Perla Sousi, Example Sheet n (of 4)", the same year as sheet 1.

**One script change.** `fetch.mjs` wrote the manifest from the current batch only, so fetching batch 2 would have dropped batch 1's 53 entries (and `extract.mjs` reads the manifest). It now keeps every other batch's entries, unions the host lists, and stamps new entries with their `batch`. Nothing else changed; there are no tests for `scripts/sources/`, and the repository's `scripts/*.test.mjs` do not touch it. `sources/manifest.json` now has 70 entries. The DPMMS server still sends an incomplete certificate chain; its 4 entries are marked `via: curl` as in batch 1. No redirects.

Run `node scripts/sources/fetch.mjs scripts/sources/batch-2.json`, then `node scripts/sources/extract.mjs`.

| course folder | id | source | role | pages |
|---|---|---|---|---|
| probability | `step-mixed-stats1`, `-hints`, `-page` | STEP Support: Mixed STEP 1 Statistics questions (2010 S1 Q12, 2009 S1 Q13, 1995 S1 Q12, 1999 S2 Q12, 2006 S2 Q13, 2008 S2 Q13, 2015 S2 Q12, each after a preparation question) | problems, hints, page | 12, 17 |
| probability | `step-s2-stats`, `-notes`, `-hints`, `-solutions`, `-page` | STEP 2 Statistics module (2003 S2 Q13, 2007 S2 Q14, 2011 S2 Q12, 2012 S2 Q13, 2010 S1 Q13, 2010 S2 Q13) | problems, notes, hints, solutions, page | 3, 4, 3, 9 |
| probability | `step-s3-stats`, `-notes`, `-hints`, `-solutions`, `-page` | STEP 3 Statistics module (2007 S3 Q13, 2010 S3 Q12, 2013 S3 Q12, 2005 S3 Q14) | problems, notes, hints, solutions, page | 4, 2, 2, 10 |
| probability | `ia-prob-sheet-2`, `-3`, `-4` | IA Probability Example Sheets 2, 3, 4, Lent 2026 (DPMMS 2025-26, Perla Sousi) | problems | 2, 4, 2 |
| probability | `ia-prob-page` | DPMMS IA Probability course page | index | HTML |
| probability | `tripos-schedules` (batch 1) | Mathematical Tripos schedules 2026-27, page 12 | syllabus | 46 |

**Official answers.** The Mixed assignment's "hints file" is a full solutions document ("Statistics STEP Questions: Solutions"). The STEP 2 and STEP 3 modules each have a hints file and a solutions booklet ("some steps will be missing"). There are no public solutions for IA Sheets 2 to 4.

**What the STEP pages say about level.** The Mixed page: "All of these questions contain content from the 2019 STEP 1 specification", and its Q1 says expectation of a discrete random variable "used to be on most A-level specifications". The STEP 3 page: the geometric distribution "is not required for STEP in the current specification", and "Generating Functions and Covariance are no longer on the STEP specifications". The STEP 2 page: one question (2003 S2 Q13) needs a normal table value, and one (2010 S1 Q13) dates from when the Poisson distribution was on STEP I. The STEP specification itself is not in the cache, so the levels below are provisional (question 3).

### Math that did not survive extraction

Every question page was rendered to PNG with `pdf2png.swift` and read (33 pages: all question pages, both topic notes, and IA Sheets 2 to 4), plus 7 pages of the Mixed solutions where answers were lost. The text files are good enough to search, not to copy from.

| source | what is lost |
|---|---|
| Mixed questions | Every ≥ and ≤ ("P(X 3)" for P(X ≥ 3); "0 p 1/3"; "n r 2" for n ≥ r ≥ 2), the sum in Q2, fractions split over lines. |
| Mixed solutions | Displayed fractions fragmented (Q1(ii), Q3, Q4(iii), Q5(iii), Q11, Q13); final answers such as 20/9, 1/42, 1/105, and 2/3 are unreadable in text. 12 of 17 pages flagged. |
| STEP 2, STEP 3 questions | Clean apart from sums and exponents; the piecewise densities (STEP 2 Q2, Q6) and STEP 3 Q3's nested sum need the PDF. |
| STEP 2, STEP 3 solutions | Integrals and fractions fragmented (6 of 9 and 9 of 10 pages flagged). The STEP 3 Q4 solution's text reads "(s+ Ky)" and "Kay"; the PDF must be read for that density. |
| IA Sheets 2 to 4 | Sums, means, and exponents lost: Sheet 2 Q8 (X̄, S²), Q11 (n Σ 1/i), Q13 (n^(−s), the product); Sheet 3 Q1, Q2 (x^(−p), e^(−βx)), Q3, Q11, Q12 (the exponent 1 + β + ... + β^(n−1)), Q13; Sheet 4 Q9 (r e^(−r²/2), √(π/2)), Q10 (a/(π(a² + x²))), Q12 (subscripts and σ²). |
| Schedules | As batch 1: page 12 is two columns; the Probability text is intact when read by heading. |

## Map: STEP

Answer kinds as batch 1: **value**, **expression**, **set**, **proof**, **explanation**, **sketch**, plus **verdict**. "Solutions" means the official solutions file has the answer or method. New topics proposed below are marked (new). "Verified" means the answer was computed; see "Verification".

### Mixed STEP 1 Statistics (`step-mixed-stats1`)

Each STEP question follows a preparation question. Q5 is an extra STEP question.

| location | description | teaches or asks | answer kind | official help | topic ids |
|---|---|---|---|---|---|
| Q1(i) | P(X = x) = kx for x = 1 to 4: k, P(X ≥ 3), E(X) | definition of expectation (given) | value (1/10, 7/10, 3) | Solutions: answers | `prob.discrete-distributions`, `rv.expectation` (new) |
| Q1(ii) | Roll until a 6: six on the third roll; more than five rolls | independent trials | value (25/216, (5/6)^5) | Solutions: answers | `prob.independent-events` |
| Q1(iii) | 2 + 0.2 + 0.02 + ... | geometric sum | value (20/9) | Solutions: answer | `alg.geometric-sum-to-infinity` |
| Q1(iv) | Maximum of x(4 − x) | completing the square | value (4) | Solutions: answer | `pre.algebraic-manipulation` |
| Q2 | 2010 S1 Q12: show E(X) = Σ P(X ≥ n); penguins: P(X ≥ 4) = p³ + q³, E(X) = 1/(pq) − 1 ≥ 3 | tail-sum formula; geometric sums; a minimum | proof, expression | Solutions: method | `rv.tail-sum` (new), `rv.expectation` (new), `alg.geometric-sum-to-infinity` |
| Q3(i) to (iii) | 6 women and 4 men in a line; the men in a "rope" | n!, blocks | value (720, 10!, 4!, 7!, 7! 4!, 1/30) | Solutions: answers | `comb.factorial`, `comb.restricted-arrangements` (new) |
| Q3(iv), (v) | All women together; men together and women together | blocks; events not independent | value (1/42, 1/105) | Solutions: answers | `comb.restricted-arrangements` (new), `prob.counting-probability` |
| Q3(vi), (vii) | No two men together (gaps); a woman at each end | gap method; ends first | value (1/6, 1/3) | Solutions: answers | `comb.restricted-arrangements` (new) |
| Q4 | 2009 S1 Q13: n boys, 3 girls; K = longest run of girls: P(K = 3), show P(K = 1), E(K) | blocks and gaps; E from a distribution | expression (6/((n + 2)(n + 3)); (n + 9)/(n + 3)), proof | Solutions: answers | `comb.restricted-arrangements` (new), `rv.expectation` (new) |
| Q5 | 1995 S1 Q12: n pupils, r play hockey: one at each end; all together; none adjacent (zero when r > (n + 1)/2) | ends, blocks, gaps | expression (r(r − 1)/(n(n − 1)); r!(n − r + 1)!/n!; (n − r + 1)!(n − r)!/((n − 2r + 1)! n!)) | Solutions: answers | `comb.restricted-arrangements` (new), `proof.cases` |
| Q6(i), (ii) | Sketch y = 3x/(5 − 2x) and y = (1 − x)/(5 − 2x); extremes on [−1, 2] | curve sketching | sketch, value (6, −3/7; 2/7, −1) | Solutions: answers | none (curve sketching is out of course) |
| Q6(iii) | Venn diagrams; addition rule; P(A given B); Bayes' theorem (taught); then (a), (b), and tentacle rot | addition rule, conditional probability, Bayes | value (0.65, 0.3, 0.5; 0.48, 0.86; 8/107) | Solutions: answers | `prob.addition-rule`, `prob.conditional-formula`, `prob.bayes-two-events` |
| Q7 | 1999 S2 Q12: chips from A, B, C; P(A given S), P(C given S); each inspector's estimate of p | Bayes over a partition; maximise on an interval | expression (14p/(9 − 5p), (9 − 27p)/(9 − 5p)), value (1/3, 0), explanation | Solutions: answers | `prob.bayes-formula`, `calc.derivatives` |
| Q8(i) | Five children queue at random; conditional on the youngest first | equally likely orders | value (1/5, 1/4) | Solutions: answers | `prob.counting-probability`, `prob.conditional-formula` |
| Q8(ii) | Digits 1 to 4 in random order: count, divisible by 4, above 2413, divisible by 4 given first digit 1 | listing | value (24, 6, 13/24, 1/3) | Solutions: answers | `prob.counting-probability` |
| Q9 | 2006 S2 Q13: ice creams; reject the first, take the next bigger: P4(k); Pn(1) | list 24 orders; condition on the position of the biggest | value (11/24, 7/24, 4/24, 2/24), expression ((1/n) Σ_{j=1}^{n−1} 1/j) | Solutions: answers | `prob.counting-probability`, `alg.sigma-notation` |
| Q10(i) to (v) | Cherry buns, swimmers, chilli chocolates | choose the chosen; nCr | value (2/5, 2/9), expression (r/n), proof | Solutions: answers | `comb.combinations`, `prob.counting-probability` |
| Q10(vi) | nCr = (n−1)Cr + (n−1)C(r−1), by factorials and by choosing | Pascal's rule | proof | Solutions: both | `comb.binomial-identities` |
| Q10(vii) | Ratio of consecutive terms above then below 1: the largest term | monotone pieces | expression (a_k) | Solutions: answer | `pre.sequences` |
| Q11 | 2008 S2 Q13: k counters from bag P to Q and back; one black: P(stays in P); one black in each: P(same bag); maximising k | conditioning; ratio of consecutive terms | expression (n/(n + k), max at k = 0; 2k(n − 1)/((n + k)(n + k − 1)), max at k = n − 1 and k = n) | Solutions: answers | `prob.counting-probability`, `comb.combinations`, `pre.sequences` |
| Q12(i) | Choose among three options with a coin: HH, HT, TH, repeat on TT | geometric sum of a repeated experiment | value (1/4, 1/16, 1/3 each) | Solutions: answers | `prob.first-step` (new), `alg.geometric-sum-to-infinity` |
| Q12(ii) | Toss until HH, HT, or TH appears | condition on the first toss | value (1/4, 1/4, 1/2) | Solutions: answers | `prob.first-step` (new) |
| Q13 | 2015 S2 Q12: HHT, THH, TTH, HTT: A against B; all four; B against C with p, q, r equations | first-step equations | value (1/4; 1/4 each; P(C given TT) = 1, p = 2/3, q = 1/3, r = 2/3, P(C wins) = 2/3), proof | Solutions: answers | `prob.first-step` (new) |

Taught material in the assignment:

| location | what it teaches | topic ids |
|---|---|---|
| Q1 heading and Q1(i) | Definition of expectation; it "used to be on most A-level specifications" | `rv.expectation` (new) |
| Q3 heading | Arrangements are on STEP 1, not A level; look back to Foundation Assignment 6 | `comb.factorial`, `comb.restricted-arrangements` (new) |
| Q6(iii) | Venn diagram as areas; addition rule; P(A given B) as a fraction of B's area; Bayes' theorem; P(B) = P(B given A)P(A) + P(B given A′)P(A′); three methods for tentacle rot | `prob.addition-rule`, `prob.conditional-formula`, `prob.bayes-two-events`, `prob.total-probability` |
| Q10(iii) | nCr as a binomial coefficient | `comb.combinations` |

### STEP 2 Statistics module (`step-s2-stats`)

| location | description | teaches or asks | answer kind | official help | topic ids |
|---|---|---|---|---|---|
| Q1 | 2003 S2 Q13: zero-truncated Poisson: A = (1 − e^(−λ))^(−1), μ, Var(X) = μ(1 − μ + λ), λ < μ < 1 + λ; normal approximation to P(X = 100) when λ = 100 | the exponential series; variance; continuity correction | proof, expression (μ = λ/(1 − e^(−λ))), value (0.04) | Hints, Solutions | `prob.poisson-distribution`, `rv.variance` (new), `prob.normal-approximation` (new) |
| Q2(i) | 2007 S2 Q14: sketch a piecewise density (ln x, ln k, a − bx) | continuity of the pieces | sketch | Solutions | `rv.pdf` (new) |
| Q2(ii) | a, b in terms of k; numerical k, a, b | total area 1; ∫ ln x by parts | expression (a = 2 ln k, b = (ln k)/(2k)), value (k = e^(1/3), a = 2/3, b = e^(−1/3)/6) | Hints, Solutions | `rv.pdf` (new), `calc.integration-by-parts` |
| Q2(iii) | The median | which piece holds it | value (3e^(1/3) − 3/2) | Solutions | `rv.continuous-summaries` (new) |
| Q3(i) | 2011 S2 Q12: Xavier and Younis: w = (1 − p²)/(2 − p); w > 1/2 iff p < 1/2; does w always rise as p falls | game-by-game geometric sum; a derivative | proof, verdict (no: w increases with p on 0 < p < 2 − √3) | Hints, Solutions | `prob.first-step` (new), `alg.geometric-sum-to-infinity`, `calc.differentiation-rules` (new, toolkit) |
| Q3(ii), (iii) | Fair stake k when p = 2/3; what happens when p = 0 | zero expected gain | value (7/5), explanation (every game is drawn) | Solutions | `rv.expectation` (new) |
| Q4 | 2012 S2 Q13: supermarkets as a Poisson process in the plane: P(none within y); density of the nearest distance; E(Y), Var(Y) = (4 − π)/(4πk) | Poisson in an area; density by the distribution function; parts and the Gaussian integral (given) | expression (e^(−kπy²); 1/(2√k)), proof | Hints, Solutions | `prob.poisson-rates` (new), `rv.cdf-method` (new), `rv.continuous-summaries` (new), `calc.integration-by-parts`, `calc.substitution` (new, toolkit), `calc.improper-integrals` (new, toolkit) |
| Q5 | 2010 S1 Q13: first text between 1 and 2 hours: pe^(2λ) − e^λ + 1 = 0; two positive roots when 4p < 1; two phones: λ1 + λ2; P(first text between 1 and 2 hours) | Poisson counts on intervals; sum of independent Poissons; a quadratic in e^λ | proof, expression (−ln p; p(1 − p)) | Hints, Solutions | `prob.poisson-rates` (new), `pre.quadratic-equations` (new, bridge), `alg.exp-and-ln` |
| Q6 | 2010 S2 Q13: step density a then b: a > 1, b < 1; E(X) = (1 − 2b + ab)/(2(a − b)); median 1/(2a) if a + b ≥ 2ab, else 1 − 1/(2b); M < E(X) | areas; two cases | proof, expression | Hints, Solutions | `rv.pdf` (new), `rv.continuous-summaries` (new), `proof.cases` |

Taught material, topic notes (4 pages):

| page | what it teaches | topic ids |
|---|---|---|
| 1 | Probability: ∩, mutually exclusive, independent ("mutually exclusive events cannot be independent", an overstatement: true only when both have positive probability), complement, addition rule, conditional probability, Bayes; nCr, nPr, arrangements with repeats | `pre.mutually-exclusive`, `prob.addition-rule`, `prob.independent-events`, `prob.conditional-formula`, `prob.bayes-two-events`, `comb.combinations`, `comb.permutations`, `comb.repeated-arrangements` |
| 2 | Discrete distributions: expectation, variance (E(X²) − E(X)², and as E((X − E(X))²)), mode; binomial (mean np, variance np(1 − p)); Poisson (mean = variance = λ; scaling with the interval; sums of independent Poissons; approximating the binomial) | `rv.expectation` (new), `rv.variance` (new), `prob.binomial-distribution`, `prob.poisson-distribution`, `prob.poisson-rates` (new), `prob.poisson-binomial-limit` |
| 3 | Continuous distributions: P(a ≤ X ≤ b) = ∫ f, total area 1, mean, variance, distribution function, median, mode; normal approximations to the binomial and the Poisson | `rv.pdf` (new), `rv.continuous-summaries` (new), `prob.normal-distribution` (new), `prob.normal-approximation` (new) |
| 4 | More on the Poisson distribution: conditions (independent occurrences, mean proportional to length); pmf; sums to 1 by the exponential series; "you may like to show that E(X) = λ" | `prob.poisson-distribution`, `an.exp-series`, `rv.expectation` (new) |

### STEP 3 Statistics module (`step-s3-stats`)

| location | description | teaches or asks | answer kind | official help | topic ids |
|---|---|---|---|---|---|
| Q1(i), (ii) | 2007 S3 Q13: frog jumps 1 m (p) or 2 m (q) towards a pond: p2(2) = p; u1, u2, u3 = 3 − 2q + q² | expected jumps by cases | proof, value (u1 = 1), expression (u2 = 2 − q) | Hints, Solutions | `prob.first-step` (new), `rv.expectation` (new) |
| Q1(iii) | u_n = A(−q)^(n−1) + B + Cn: C = 1/(1 + q), A, B; u_n ≈ n/(p + 2q) and why | solve for constants; mean jump length | expression (A = q²/(1 + q)², B = q/(1 + q)²), explanation | Solutions | `alg.linear-recurrences` (new), `rv.expectation` (new) |
| Q2 | 2010 S3 Q12: S = Σ (1 + nd)r^n = 1/(1 − r) + rd/(1 − r)²; Arthur's expected shots 1/a; α = a/(1 − a′b′), β; expected shots in the contest α/a + β/b | arithmetico-geometric series; alternate turns | proof, expression (β = a′b/(1 − a′b′)) | Hints, Solutions | `alg.arithmetico-geometric` (new), `prob.first-step` (new), `rv.expectation` (new), `prob.geometric-distribution` |
| Q3 | 2013 S3 Q12: a As and b Bs in random order; X1 = first is A, X_k = "BA" at k − 1, k; E(X_i), E(S) = a(b + 1)/n; E(X1Xj); a double sum; Var(S) = a(a − 1)b(b + 1)/(n²(n − 1)) | indicators, linearity, E(S²) by pairs | expression (a/n, ab/(n(n − 1))), proof | Hints, Solutions | `rv.indicators` (new), `rv.expectation-algebra` (new), `comb.repeated-arrangements`, `alg.arithmetic-series` |
| Q4 | 2005 S3 Q14: density C k^(a+1) x^a/(x + k)^(2a+2): C = (2a + 1)!/(a! a!); median k; E(V) = k(a + 1)/a; T = s/V: density of T; median time × median speed = s, E(T)E(V) > s | normalise with a given integral; substitution u = k²/x; transform by the distribution function | proof, expression | Hints, Solutions | `rv.continuous-summaries` (new), `rv.cdf-method` (new), `calc.substitution` (new, toolkit), `calc.improper-integrals` (new, toolkit) |

Taught material, topic notes (2 pages):

| page | what it teaches | topic ids |
|---|---|---|
| 1 | Algebra of expectations: E(aX + bY + c), Var(aX + b); for independent X, Y: E(XY) = E(X)E(Y), Var(aX + bY + c) | `rv.expectation-algebra` (new) |
| 1 | Distribution functions: the density of Y = X² from F_Y, then differentiate | `rv.cdf-method` (new) |
| 1, 2 | Geometric distribution, "intended for interest" (not on the 2019 STEP specification): pmf, sum 1, E(X) = 1/p by differentiating the geometric series, Var(X) = (1 − p)/p² | `prob.geometric-distribution`, `alg.arithmetico-geometric` (new) |

## Map: IA Probability

No official solutions.

### Example Sheet 2 (2025-26)

| location | description | teaches or asks | answer kind | topic ids |
|---|---|---|---|---|
| Q1 | n tosses; E = first is a head, F_k = exactly k heads: for which (n, k) independent | compare P(E ∩ F_k) with P(E)P(F_k) | set (for 0 < p < 1: k = np, or k > n; for p in {0, 1}: every pair) | `prob.independence`, `prob.binomial-distribution` |
| Q2 | A, B independent implies Aᶜ, B and Aᶜ, Bᶜ independent | from the definition | proof | `prob.independence` |
| Q3 | P(even number of successes in n trials) = (1 + (1 − 2p)^n)/2 | a recurrence, or the binomial theorem at ±1 | proof | `prob.binomial-distribution`, `comb.binomial-theorem`, `prob.first-step` (new) |
| Q4 | Darts: A throws first; P(A wins) | geometric sum over rounds | expression (p_A/(1 − (1 − p_A)(1 − p_B))) | `prob.first-step` (new), `prob.independence` |
| Q5 | Ω = {0, 1}³, uniform: number of Bernoulli(1/2) and Bernoulli(1/3) variables; longest independent Bernoulli(1/2) sequence | random variables as functions on Ω | value (70, 0, 3) | `rv.random-variables` (new), `rv.independence` (new) |
| Q6 | X ~ Po(λ), Y ~ Po(μ) independent: X + Y; X given X + Y = n is binomial | convolution; conditional distribution | expression (Po(λ + μ); B(n, λ/(λ + μ))), proof | `prob.poisson-rates` (new), `rv.conditional-expectation` (new) |
| Q7(a) | Poisson misprints per page: second misprint on page r | Poisson sums over pages | expression (e^(−(r−1)λ)(1 − e^(−λ) − λe^(−λ)) + (r − 1)λe^(−(r−1)λ)(1 − e^(−λ))) | `prob.poisson-rates` (new) |
| Q7(b) | Proof-reader catches each with probability p: X caught, Y missed are independent Po(λp), Po(λ(1 − p)) | thinning | expression, proof | `rv.independence` (new), `rv.conditional-expectation` (new), `prob.poisson-rates` (new) |
| Q8 | i.i.d. X_i: E(X̄), E(S²) for S² = Σ (X_i − X̄)² | linearity | expression (μ, (n − 1)σ²) | `rv.expectation-general` (new), `rv.covariance` (new) |
| Q9 | Independent trials with p_i: mean and variance of N | sums of independent indicators | expression (Σ p_i, Σ p_i(1 − p_i)) | `rv.indicators` (new), `rv.covariance` (new) |
| Q10 | Liam's spaghetti: expected number of hoops | indicators by stage | expression (Σ_{k=1}^n 1/(2k − 1)) | `rv.indicators` (new), `rv.expectation-general` (new) |
| Q11 | Coupon collector: expected packets n Σ 1/i | sum of geometric waits | proof | `prob.geometric-distribution`, `rv.expectation-general` (new) |
| Q12 | Record years: Y_i ~ Bernoulli(1/i), independent; mean and variance of N | symmetry of a random permutation | expression (Σ 1/i, Σ (1/i − 1/i²)), proof | `rv.indicators` (new), `rv.independence` (new), `rv.covariance` (new) |
| Q13 | Zeta distribution: P(A_p) = p^(−s); the A_p independent; Euler product Π (1 − p^(−s)) = 1/ζ(s) | a distribution on a countable set; unique factorisation; continuity | expression, proof | `prob.point-mass-spaces`, `prob.independence`, `num.fundamental-theorem`, `prob.continuity` |

### Example Sheet 3 (2025-26)

| location | description | teaches or asks | answer kind | topic ids |
|---|---|---|---|---|
| Q1 | Harmonic mean ≤ arithmetic mean; (1/n) Σ y_i/x_i ≥ 1 for a reordering | convexity, AM-GM | proof | `ineq.jensen` (new) |
| Q2 | Markov in the forms P(\|X\| ≥ x) ≤ E(\|X\|^p)x^(−p) and P(X ≥ x) ≤ E(e^(βX))e^(−βx) | Markov's inequality | proof | `ineq.markov-chebyshev` (new), `gf.mgf` (new) |
| Q3(a) | Poisson tail bound exp(−x log(x/λ) − λ + x) by optimising β | Chernoff bound | proof | `gf.mgf` (new), `ineq.markov-chebyshev` (new) |
| Q3(b) | P(X = x) ~ (2πx)^(−1/2) exp(...) as x → ∞ | Stirling | proof | `prob.stirling-formula` |
| Q4 | Chebyshev: sample size for P(\|X̄ − μ\| < 2σ) ≥ 0.99 | Chebyshev for a mean | value (25) | `ineq.markov-chebyshev` (new), `rv.covariance` (new) |
| Q5 | Negative binomial: pmf; pgf (pt)^a/(1 − qt)^a; E = a/p, var = aq/p²; as a sum of a geometrics | pgf moments; sums of independent variables | proof, expression | `gf.pgf` (new), `prob.geometric-distribution`, `comb.combinations` |
| Q6 | V(x) = E((X − x)²): V(X) = σ² + (X − μ)², E(V(X)) = 2σ² | functions of a random variable | expression, proof | `rv.expectation-general` (new) |
| Q7 | Chebyshev order inequality E(f(X))E(g(X)) ≤ E(f(X)g(X)) | independent copies | proof | `rv.independence` (new), `rv.expectation-general` (new) |
| Q8(a), (b) | Random sum S_N: E(S_N) = μE(N); E(S_N² given N = n); var(S_N) | conditional expectation, tower law | proof, expression (σ²E(N) + μ² var(N)) | `gf.random-sums` (new), `rv.conditional-expectation` (new) |
| Q8(c) | ±1 walk stopped at \|S_n\| = a: E(S_T) = μE(T); var(S_T) | optional stopping without the name; S_T = ±a | expression (a² − μ²E(T)²), proof | `rw.absorption-time` (new), `rw.gamblers-ruin` (new) |
| Q9 | Blood culture: P(no white cell by time n + 1/2); P(extinction) | branching process | expression ((1/4)^(2^n − 1)), value (1/3) | `bp.extinction` (new) |
| Q10 | Immature and mature generations: two pgfs; same mean, different variances | compositions of pgfs | expression ((1 − p + pF(t))^k; F(1 − p + pt)^k), proof | `gf.random-sums` (new) |
| Q11 | Slot machine: u_n + (1/2 − p)u_(n−1) = 1/2; solve | first-order linear difference equation | proof, expression ((1 + (−1)^(n−1)(1/2 − p)^n)/(3 − 2p)) | `alg.linear-recurrences` (new), `prob.total-probability` |
| Q12 | F(t) = 1 − p(1 − t)^β: a pgf; iterates; mean; extinction probability | iterated pgfs | expression (F_n given; m = ∞; 1 − p^(1/(1−β))), proof | `bp.extinction` (new) |
| Q13 | Weak law for μ̂_n, and for σ̂²_n when E(X⁴) < ∞ | Chebyshev | proof | `lim.weak-law` (new) |

### Example Sheet 4 (2025-26)

| location | description | teaches or asks | answer kind | topic ids |
|---|---|---|---|---|
| Q1 | Alice and Bob meet if arrivals differ by ≤ 10 minutes | area in the unit square | value (11/36) | `rv.joint-densities` (new), `prob.geometric-probability` (new) |
| Q2 | Stick broken at two uniform points: triangle | area | value (1/4) | `rv.joint-densities` (new), `prob.geometric-probability` (new) |
| Q3 | Radius ~ Exp(λ): density of the area | one-variable transformation | expression (λ/(2√(πa)) e^(−λ√(a/π)), a > 0) | `rv.cdf-method` (new), `prob.exponential-distribution` (new) |
| Q4 | X ~ Exp(λ), Y ~ Exp(μ) independent: min{X, Y}; P(X > Y) | joint density | expression (Exp(λ + μ); μ/(λ + μ)) | `prob.exponential-distribution` (new), `rv.joint-densities` (new) |
| Q5 | Normal sample size: P(\|X̄ − μ\| < σ) ≥ 0.99, given Φ(2.58) = 0.995 | X̄ is normal | value (7) | `prob.normal-distribution` (new), `rv.covariance` (new) |
| Q6(a) | Log-normal: mean and variance | normal mgf | expression (e^(μ + σ²/2); e^(2μ + σ²)(e^(σ²) − 1)) | `gf.mgf` (new), `prob.normal-distribution` (new) |
| Q6(b) | Why products of many factors are log-normal | CLT on log X | explanation | `lim.clt` (new) |
| Q7 | Rotating two independent N(0, 1) | Jacobian | proof (U, V independent N(0, 1)) | `rv.transformations` (new), `rv.bivariate-normal` (new) |
| Q8 | X, Y i.i.d. Exp(λ): X + Y and X/(X + Y) independent | Jacobian | expression (density λ²xe^(−λx); U(0, 1)), proof | `rv.transformations` (new) |
| Q9 | Distance from the centre: density re^(−r²/2); mean √(π/2), median √(log 4), mode 1 | polar transformation | proof, value | `rv.transformations` (new), `rv.continuous-summaries` (new) |
| Q10 | Uniform direction onto a plane: Cauchy density a/(π(a² + x²)); its mean | transformation; no mean | proof, explanation (the mean does not exist) | `rv.cdf-method` (new), `prob.geometric-probability` (new) |
| Q11 | Sample size for sampling error < 0.04 with probability ≥ 0.99 | CLT with p(1 − p) ≤ 1/4 | value (1041 with z = 2.58) | `lim.clt` (new) |
| Q12 | cov(Σ a_iX_i, Σ b_iX_i) = σ² Σ a_ib_i; for normals, independent iff covariance 0 | bilinearity; bivariate normal | proof | `rv.covariance` (new), `rv.bivariate-normal` (new) |
| Q13 | e^(−n) Σ_{k ≤ n} n^k/k! → 1/2 | CLT for Po(n) | proof | `lim.clt` (new), `prob.poisson-rates` (new) |

### Taught sections: the Faculty schedules

Read from the fetched PDF (page 12), the three sections after "Axiomatic approach", with item-level mapping.

| section | item as printed | topic ids |
|---|---|---|
| Discrete random variables [7] | Expectation. | `rv.random-variables` (new), `rv.expectation-general` (new) |
| | Functions of a random variable, indicator function, variance, standard deviation. | `rv.expectation-general` (new), `rv.indicators` (new), `rv.variance` (new) |
| | Covariance, independence of random variables. | `rv.covariance` (new), `rv.independence` (new) |
| | Generating functions: sums of independent random variables, random sum formula, moments. | `gf.pgf` (new), `gf.random-sums` (new) |
| | Conditional expectation. | `rv.conditional-expectation` (new) |
| | Random walks: gambler's ruin, recurrence relations. Difference equations and their solution. Mean time to absorption. | `rw.gamblers-ruin` (new), `alg.linear-recurrences` (new), `rw.absorption-time` (new) |
| | Branching processes: generating functions and extinction probability. | `bp.extinction` (new) |
| | Combinatorial applications of generating functions. | `gf.combinatorial` (new; no sheet problem) |
| Continuous random variables [6] | Distributions and density functions. Expectations; expectation of a function of a random variable. | `rv.pdf` (new), `rv.continuous-summaries` (new) |
| | Uniform, normal and exponential random variables. Memoryless property of exponential distribution. | `rv.pdf` (new), `prob.normal-distribution` (new), `prob.exponential-distribution` (new) |
| | Joint distributions: transformation of random variables (including Jacobians), examples. | `rv.joint-densities` (new), `rv.transformations` (new) |
| | Simulation: generating continuous random variables, Box-Muller transform, rejection sampling. | `rv.simulation` (new; no sheet problem) |
| | Geometrical probability: Bertrand's paradox, Buffon's needle. | `prob.geometric-probability` (new) |
| | Correlation coefficient, bivariate normal random variables. | `rv.covariance` (new), `rv.bivariate-normal` (new) |
| Inequalities and limits [3] | Markov's inequality, Chebyshev's inequality. Weak law of large numbers. | `ineq.markov-chebyshev` (new), `lim.weak-law` (new) |
| | Convexity: Jensen's inequality for general random variables, AM/GM inequality. | `ineq.jensen` (new) |
| | Moment generating functions and statement (no proof) of continuity theorem. | `gf.mgf` (new) |
| | Statement of central limit theorem and sketch of proof. Examples, including sampling. | `lim.clt` (new) |

The "Axiomatic approach" items "Binomial, Poisson and geometric distributions" and "Relation between Poisson and binomial distributions" already have graph topics; batch 2 gives them their first Cambridge sources (STEP 2 notes; STEP 3 notes and Q2; Sheet 2 Q6, Q7, Q11, Q13; Sheet 3 Q5). "Examples, including Simpson's paradox" still has no source.

**Batch 1 items that now have a home.** STEP Foundation A19 Q4(ii) (the bet, expected gain 17/216) goes to `rv.expectation`. A8 Q1 (AM-GM for two and four numbers), left out in batch 1, fits `ineq.jensen` (question 11).

## Verification

151 checks, 0 failures (a script in the session scratchpad, pure Python 3.9, no dependencies; not committed). No answer was copied.

- **Brute force over every case:** Mixed Q3 (all 210 patterns), Q4 (n ≤ 7), Q5 (every 2 ≤ r ≤ n ≤ 9), Q8, Q9 (every order, n ≤ 7), Q11 (every pair of draws, n ≤ 6, all k, including where the maximum falls); STEP 3 Q3 (every arrangement, 2 ≤ a, b ≤ 5, including the double sum and Var(S)); Sheet 2 Q1 (n ≤ 6, five values of p, all k), Q3, Q5 (all 70 events, every family for independence), Q8, Q9, Q10 (every pairing of ends, n ≤ 5), Q12 (every permutation, n ≤ 7; independence for n ≤ 5).
- **Exact rational arithmetic:** Mixed Q1, Q2, Q6(iii), Q7 (and its maximisers on a grid), Q10, Q13 (a Markov chain on the last two tosses); STEP 2 Q3(ii); STEP 3 Q1 (the recurrence u_n = 1 + pu_(n−1) + qu_(n−2) against the closed form, n < 30), Q2; Sheet 3 Q4, Q6, Q8(a), (b), Q9(b) (the root), Q11 (n < 12).
- **Numerical integration or summation:** STEP 2 Q1 (four λ, and P(X = 100): normal 0.0399, exact 0.0399), Q2, Q4, Q5, Q6; STEP 3 Q4 (C, median, mean for a = 1 to 3; median and mean of T); Sheet 2 Q6, Q7(a), Q13 (s = 2); Sheet 3 Q3, Q5, Q12; Sheet 4 Q3, Q6(a), Q9, Q13 (0.527, 0.508, 0.503 at n = 100, 1000, 10000).
- **Monte Carlo as a second check:** STEP 2 Q4 (a simulated Poisson process); Sheet 2 Q11; Sheet 3 Q9(b).
- **Monte Carlo only:** Mixed Q12(ii); STEP 2 Q3(i) (two p); Sheet 2 Q7(b); Sheet 3 Q8(c), Q10; Sheet 4 Q1, Q2, Q4, Q7, Q8, Q10, Q12(a). Each agrees within its sampling error; question 7 asks whether the build needs exact checks for these.

**Compared with official answers:** every STEP answer above agrees with the Mixed solutions or the STEP 2 and STEP 3 solutions. **No computed answer disagrees with an official one.**

### Source notes

- **Mixed solutions, Q13(iii):** the list reads "P(C given TT) = r", but the question defines r for HH, and the solution's own equation r = (1/2)r + (1/2)p is the HH equation. The answers (p = 2/3, q = 1/3, r = 2/3, P(C wins) = 2/3) are right.
- **STEP 2 topic notes, page 1:** "Mutually exclusive events cannot be independent" holds only when both events have positive probability. A lesson should say so.
- **Sheet 2 Q1:** the answer depends on p. For 0 < p < 1, E and F_k are independent exactly when k = np or k > n (F_k empty); for p = 0 or 1, for every pair.
- **Sheet 3 Q8(c):** part (a) assumes N bounded; T is not bounded, so (c) needs a truncation argument (T ∧ m, then a limit). A supervision point.
- **Sheet 4 Q11:** the answer depends on the normal quantile: 1041 with the sheet's own value 2.58 (from Q5's hint), 1037 with 2.5758.
- **Sheet 4 Q10:** read in three dimensions (directions uniform on the sphere, plate a plane), the horizontal coordinate is Cauchy, as stated; checked by simulation.
- **STEP 2 Q1:** the normal approximation and the exact truncated-Poisson value both round to 0.04.

## Proposed graph changes

Proposals only; nothing in `graph/` was changed. Levels follow the slice review's rules; STEP levels are provisional until the STEP specification is read (question 3). New areas: `random-variables`, `continuous`, `generating-functions`, `random-processes`, `limit-theorems` (question 12).

### Part V topics (38)

| id | title | level | area | prereqs | first sources |
|---|---|---|---|---|---|
| `rv.expectation` | Expectation of a discrete random variable | step | random-variables | `prob.discrete-distributions`, `alg.sigma-notation` | Mixed Q1(i), Q4(iii); STEP 2 notes p. 2 |
| `rv.tail-sum` | Expectation as a sum of tail probabilities | step | random-variables | `rv.expectation` | Mixed Q2 |
| `comb.restricted-arrangements` | Arrangements with objects together or apart | step | counting | `comb.permutations`, `prob.counting-probability` | Mixed Q3, Q4, Q5 |
| `prob.first-step` | Conditioning on the first step | step | elementary-probability | `prob.conditional-formula`, `prob.independent-events`, `alg.geometric-sum-to-infinity` | Mixed Q12, Q13; STEP 2 Q3; STEP 3 Q1, Q2 |
| `pre.quadratic-equations` | Solving quadratic equations (bridge) | pre-a-level | number-and-algebra | `pre.algebraic-manipulation` | none (assumed by STEP 2 Q5, Sheet 3 Q9, difference equations) |
| `rv.variance` | Variance and standard deviation | step | random-variables | `rv.expectation` | STEP 2 Q1, notes p. 2 |
| `prob.poisson-rates` | Poisson counts over intervals and areas, and sums of Poissons | step | distributions | `prob.poisson-distribution`, `prob.independent-events`, `comb.binomial-theorem` | STEP 2 Q4, Q5, notes p. 2; Sheet 2 Q6, Q7 |
| `rv.pdf` | Continuous random variables and density functions | step | continuous | `prob.discrete-distributions`, `calc.definite-integrals`, `calc.improper-integrals` | STEP 2 Q2, Q6, notes p. 3 |
| `rv.continuous-summaries` | Mean, variance, median, and mode of a continuous variable | step | continuous | `rv.pdf`, `rv.variance` | STEP 2 Q2(iii), Q4, Q6; STEP 3 Q4 |
| `rv.cdf-method` | Finding a density through the distribution function | step | continuous | `rv.pdf`, `calc.differentiation-rules` | STEP 2 Q4; STEP 3 Q4, notes p. 1; Sheet 4 Q3, Q10 |
| `prob.normal-distribution` | The normal distribution and standardising | step | continuous | `rv.continuous-summaries`, `alg.exp-and-ln` | STEP 2 notes p. 3; Sheet 4 Q5 |
| `prob.normal-approximation` | Normal approximations to the binomial and Poisson | step | continuous | `prob.normal-distribution`, `prob.binomial-distribution`, `prob.poisson-distribution` | STEP 2 Q1, notes p. 3 |
| `rv.expectation-algebra` | The algebra of expectation and variance | step | random-variables | `rv.variance`, `prob.independent-events` | STEP 3 notes p. 1 |
| `rv.indicators` | Indicator variables and linearity of expectation | step | random-variables | `rv.expectation-algebra` | STEP 3 Q3; Sheet 2 Q9, Q10, Q12 |
| `alg.arithmetico-geometric` | Sums of n r^n | step | sequences-and-series | `alg.geometric-sum-to-infinity` | STEP 3 Q2, notes p. 2 |
| `rv.random-variables` | Random variables on a probability space | tripos-ia | random-variables | `prob.point-mass-spaces`, `prob.discrete-distributions` | Sheet 2 Q5 |
| `rv.expectation-general` | Expectation on a countable space; functions of a random variable | tripos-ia | random-variables | `rv.random-variables`, `rv.expectation-algebra`, `an.absolute-convergence` | Sheet 2 Q8, Q10, Q11; Sheet 3 Q6 |
| `rv.independence` | Independent random variables | tripos-ia | random-variables | `rv.expectation-general`, `prob.independence` | Sheet 2 Q5(c), Q7(b), Q12; Sheet 3 Q7 |
| `rv.covariance` | Covariance, correlation, and the variance of a sum | tripos-ia | random-variables | `rv.independence` | Sheet 2 Q8, Q9, Q12; Sheet 4 Q12(a) |
| `rv.conditional-expectation` | Conditional distributions and conditional expectation | tripos-ia | random-variables | `rv.expectation-general`, `prob.total-probability` | Sheet 2 Q6, Q7(b); Sheet 3 Q8(b) |
| `gf.pgf` | Probability generating functions | tripos-ia | generating-functions | `rv.independence`, `an.power-series`, `calc.derivatives` | Sheet 3 Q5 |
| `gf.random-sums` | Random sums | tripos-ia | generating-functions | `gf.pgf`, `rv.conditional-expectation` | Sheet 3 Q8(a), (b), Q10 |
| `gf.combinatorial` | Counting with generating functions | tripos-ia | generating-functions | `gf.pgf`, `comb.binomial-theorem` | schedule only |
| `alg.linear-recurrences` | Linear difference equations | tripos-ia | sequences-and-series | `pre.quadratic-equations`, `alg.geometric-series` | Sheet 3 Q11; STEP 3 Q1(iii) |
| `rw.gamblers-ruin` | Random walks and gambler's ruin | tripos-ia | random-processes | `alg.linear-recurrences`, `prob.first-step`, `prob.total-probability` | Sheet 3 Q8(c) |
| `rw.absorption-time` | Mean time to absorption | tripos-ia | random-processes | `rw.gamblers-ruin`, `rv.conditional-expectation` | Sheet 3 Q8(c); STEP 3 Q1 |
| `bp.extinction` | Branching processes and extinction | tripos-ia | random-processes | `gf.random-sums`, `prob.continuity` | Sheet 3 Q9, Q12 |
| `prob.exponential-distribution` | The exponential distribution and memorylessness | tripos-ia | continuous | `rv.continuous-summaries`, `prob.conditional-formula`, `alg.exp-and-ln` | Sheet 4 Q3, Q4, Q8 |
| `rv.joint-densities` | Joint densities, marginals, and independence | tripos-ia | continuous | `rv.pdf`, `rv.independence`, `calc.double-integrals` | Sheet 4 Q1, Q2, Q4 |
| `rv.transformations` | Transforming random variables with Jacobians | tripos-ia | continuous | `rv.joint-densities`, `rv.cdf-method`, `calc.jacobians` | Sheet 4 Q7, Q8, Q9 |
| `prob.geometric-probability` | Geometrical probability | tripos-ia | continuous | `rv.joint-densities` | Sheet 4 Q1, Q2, Q10 |
| `rv.simulation` | Simulating continuous random variables | tripos-ia | continuous | `rv.cdf-method`, `rv.transformations` | schedule only |
| `rv.bivariate-normal` | Correlation and the bivariate normal | tripos-ia | continuous | `rv.transformations`, `rv.covariance`, `prob.normal-distribution` | Sheet 4 Q7, Q12(b) |
| `ineq.markov-chebyshev` | Markov's and Chebyshev's inequalities | tripos-ia | limit-theorems | `rv.expectation-general`, `rv.variance` | Sheet 3 Q2, Q4 |
| `ineq.jensen` | Convexity, Jensen's inequality, and AM-GM | tripos-ia | limit-theorems | `rv.expectation-general`, `calc.convexity` | Sheet 3 Q1 |
| `lim.weak-law` | The weak law of large numbers | tripos-ia | limit-theorems | `ineq.markov-chebyshev`, `rv.covariance`, `an.epsilon-limit` | Sheet 3 Q13 |
| `gf.mgf` | Moment generating functions | tripos-ia | generating-functions | `gf.pgf`, `rv.continuous-summaries`, `an.exp-series` | Sheet 3 Q2(b), Q3(a); Sheet 4 Q6(a) |
| `lim.clt` | The central limit theorem | tripos-ia | limit-theorems | `gf.mgf`, `lim.weak-law`, `prob.normal-approximation` | Sheet 4 Q5, Q6(b), Q11, Q13 |

Prerequisite checks: every prereq is an existing graph topic or a row above or a toolkit topic below; no topic requires a higher level (step topics depend only on pre-a-level, a-level, and step topics, including the toolkit ones marked so); the order of the table of contents below respects every edge.

### Analysis toolkit additions (8 new, 2 existing)

| id | title | level | source | needed by |
|---|---|---|---|---|
| `an.exp-series` (exists) | The exponential series | step | slice review | `prob.poisson-distribution`, `gf.mgf` |
| `an.exp-limit` (exists) | The limit of (1 + x/n)^n | step | slice review | `prob.poisson-binomial-limit` |
| `calc.differentiation-rules` (new) | The chain, product, and quotient rules | a-level | STEP spec (to confirm) | `rv.cdf-method`; STEP 2 Q3(i) |
| `calc.substitution` (new) | Integration by substitution | a-level | STEP spec (to confirm) | STEP 2 Q4; STEP 3 Q4; `rv.transformations` |
| `calc.improper-integrals` (new) | Integrals over infinite ranges | step | IA Analysis I, "Integration" ("Improper integrals"); STEP level to confirm | `rv.pdf` |
| `an.absolute-convergence` (new) | Absolute convergence | tripos-ia | IA Analysis I, "Limits and convergence" | `rv.expectation-general` |
| `an.power-series` (new) | Power series and radius of convergence | tripos-ia | IA Analysis I, "Power series" | `gf.pgf` |
| `calc.double-integrals` (new) | Double integrals | tripos-ia | IA Vector Calculus, "Integration in R2 and R3" | `rv.joint-densities` |
| `calc.jacobians` (new) | Change of variables and the Jacobian | tripos-ia | IA Vector Calculus, "Integration in R2 and R3" ("change of variables") | `rv.transformations` |
| `calc.convexity` (new) | Convex functions | a-level | STEP spec (to confirm) | `ineq.jensen` |

### Existing topics placed by this batch

`prob.point-mass-spaces`, `prob.poisson-distribution`, `prob.geometric-distribution`, and `prob.poisson-binomial-limit` are in the graph but were not in the book, because batch 1 gave them no source. They are "Axiomatic approach" items, and Part V needs all four, so they become a new Part IV chapter, 4.5 (question 1). `prob.simpsons-paradox` stays out of the book: no source yet.

### Left out, with reasons

- **Curve sketching** (Mixed Q6(i), (ii); the sketches in STEP 2 Q2(i) and Q6's stem): outside the course, as in batch 1. The sketch in STEP 2 Q2(i) and Q6 is a sketch of a density, so it can go to supervision on `rv.pdf` (question 4).
- **Inference** (estimation, hypothesis testing, confidence intervals): Part IB Statistics, not in this round. Mixed Q7 asks for an "estimate" that maximises P(A given S); it is mapped as Bayes plus calculus, with a note that it is a likelihood idea in disguise.
- **Normal tables:** not a topic. STEP 2 Q1 and Sheet 4 Q5 and Q11 need Φ values; the app supplies them (question 6).
- **The Gaussian integral:** STEP 2 Q4 gives it; IA uses it. Stated in `prob.normal-distribution`, proved only if `calc.double-integrals` is built.
- **Optional stopping, Wald's identity, and Euler products by name:** taught inside `rw.absorption-time`, `gf.random-sums`, and Sheet 2 Q13's supervision, not as topics.
- **Simpson's paradox:** in the schedule, no source in either batch.

## Part V contents (draft)

Same format as the book's table of contents. Chapters follow the sources: the three STEP units first (A level and STEP), then the three remaining IA schedule sections. Every section's prerequisites come earlier in the book.

**Part IV addition**
- 4.5 Discrete distributions (schedule "Axiomatic approach"; Sheet 2; STEP notes): ○ Probability spaces on a countable set · ○ The Poisson distribution (needs △) · ○ The geometric distribution · ○ The Poisson limit of the binomial (needs △)

**Part V · Random variables and statistics** (STEP Support statistics modules; schedules; DPMMS example sheets 2 to 4)
- 5.1 Mixed STEP 1 Statistics: ○ Expectation of a discrete random variable · ○ Expectation as a sum of tail probabilities · ○ Arrangements with objects together or apart · ○ Conditioning on the first step (needs △)
- 5.2 STEP 2 Statistics: ◇ Solving quadratic equations · ○ Variance and standard deviation · ○ Poisson counts over intervals and areas, and sums of Poissons · ○ Continuous random variables and density functions (needs △) · ○ Mean, variance, median, and mode of a continuous variable · ○ Finding a density through the distribution function (needs △) · ○ The normal distribution and standardising (needs △) · ○ Normal approximations to the binomial and Poisson
- 5.3 STEP 3 Statistics: ○ The algebra of expectation and variance · ○ Indicator variables and linearity of expectation · ○ Sums of n r^n (needs △)
- 5.4 Discrete random variables (Sheet 2; Sheet 3 Q5 to Q12): ○ Random variables on a probability space · ○ Expectation on a countable space; functions of a random variable (needs △) · ○ Independent random variables · ○ Covariance, correlation, and the variance of a sum · ○ Conditional distributions and conditional expectation · ○ Probability generating functions (needs △) · ○ Random sums · ○ Counting with generating functions · ○ Linear difference equations · ○ Random walks and gambler's ruin · ○ Mean time to absorption · ○ Branching processes and extinction
- 5.5 Continuous random variables (Sheet 4 Q1 to Q4, Q7 to Q10, Q12): ○ The exponential distribution and memorylessness (needs △) · ○ Joint densities, marginals, and independence (needs △) · ○ Transforming random variables with Jacobians (needs △) · ○ Geometrical probability · ○ Simulating continuous random variables · ○ Correlation and the bivariate normal
- 5.6 Inequalities and limits (Sheet 3 Q1 to Q4, Q13; Sheet 4 Q5, Q6, Q11, Q13): ○ Markov's and Chebyshev's inequalities · ○ Convexity, Jensen's inequality, and AM-GM (needs △) · ○ The weak law of large numbers (needs △) · ○ Moment generating functions (needs △) · ○ The central limit theorem

Counts: Part V 38 sections in 6 chapters (37 ○, 1 ◇); Part IV gains 4 ○ in one chapter; the toolkit grows from 12 to 22 △. Sheet 4 Q6 (log-normal) sits in chapter 5.5's sheet but needs moment generating functions, so it is practice in 5.6 (rule 1). Sheet 3 Q3(b) recalls Stirling's formula (4.1).

**Toolkit prerequisites** (question 2 in the book design). Already in the toolkit: the geometric sum to infinity (5.1, 5.3), definite integrals and integration by parts (5.2), derivatives (5.2, 5.4), exp and ln (5.2, 5.5), the epsilon definition (5.6), series of nonnegative terms (5.1's tail sums, for rigour). New: the exponential series and (1 + x/n)^n (4.5), the chain, product, and quotient rules, substitution, and improper integrals (5.2, 5.3), absolute convergence (5.4), power series (5.4), double integrals and Jacobians (5.5), convexity (5.6). Option (b) or (c) of that question would cost Part V more than Part IV: 13 of its 38 sections need a toolkit topic directly, against 2 of Part IV's 15.

## Questions

1. **Chapter 4.5.** The four distribution topics are "Axiomatic approach" items that Part V needs. Add them to Part IV as chapter 4.5, as drafted, or place them in Part V where first used (5.2 for Poisson, 5.3 for geometric)?
2. **Toolkit growth.** Part V adds 10 toolkit topics (12 to 22), two of them (double integrals, Jacobians) from IA Vector Calculus, a third course. Approve the list, or teach those sections with the calculus stated and not proved?
3. **STEP levels.** The STEP specification is not in the cache, and the STEP pages say expectation, the geometric distribution, generating functions, and covariance are off the current specification. Add `step-spec-2026` (URL already in `graph/src/sources.ts`) to a batch to confirm the levels and headings of the 14 step-level proposals?
4. **Density sketches** (STEP 2 Q2(i), Q6): supervision on `rv.pdf`, or left out with curve sketching?
5. **Schedule-only topics.** `gf.combinatorial` and `rv.simulation` have no sheet problem. Write them with no Cambridge problems, make them bridges, or leave them out of this round?
6. **Normal values.** Which Φ values does the grader accept? Sheet 4 Q11 is 1041 with z = 2.58 (the sheet's own value) and 1037 with 2.5758. Proposal: fix z = 2.58 in the prompt.
7. **Monte Carlo checks.** 12 answers are verified only by simulation (listed under "Verification"). Accept that for the map, and require an exact or numerical check when each is built?
8. **Sheet 3 Q8(c).** T is unbounded, but part (a) assumes N bounded. Set (c) for supervision with the truncation step as the point, or adapt it?
9. **`rv.tail-sum`.** Its own section, or folded into `rv.expectation`?
10. **Inference.** Confirm IB Statistics is out of this round, and Mixed Q7's estimate stays as calculus with a note.
11. **AM-GM from batch 1** (Foundation A8 Q1): set it in `ineq.jensen` (a Tripos topic) as an elementary warm-up, or keep it out?
12. **Areas.** Five new areas (`random-variables`, `continuous`, `generating-functions`, `random-processes`, `limit-theorems`), or fold them into two (`random-variables`, `limit-theorems`)?
