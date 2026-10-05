# learnhub as a book: design

Dated 2026-10-05. Status: draft, for review. No code yet.

Builds on `mastery/DESIGN-CAMBRIDGE-CONTENT.md` (lessons from Cambridge sources, auto-checked practice, supervision, sync). This design changes how the material is organized and read, not how it is checked or reviewed.

## Goal

Teach Probability and Discrete Mathematics as one book that works through the Cambridge material in order, from first principles:

- **Read like algorithmica.org/hpc:** a table of contents in a sidebar, parts and chapters, continuous prose, previous and next links.
- **Learn like Math Academy and PhysicsGraph:** each chapter is cut into small sections. Each section is one node in the prerequisite graph, and you master it with checked practice and keep it with spaced review.
- **See like 3Blue1Brown, later:** a video slot on each step, empty for now.

Mockup of a section page (approved 2026-10-05): https://claude.ai/artifact/12S8aY8w4DqdPTgRdxY7iB

## Non-goals

- No new checking, grading or review rules. The engine, graders, supervision and sync are unchanged.
- No placement test. You start at the beginning, or jump anywhere from the contents.
- No videos in this round; only the slot.
- No interactive diagrams.
- No statistical inference (estimation, hypothesis testing). That is Part IB Statistics, not in this round; Part V stops at the central limit theorem.

## Structure

| Level | What it is | Example |
|---|---|---|
| Book | One per course pairing | Probability and Discrete Mathematics |
| Part | One Cambridge source, or Foundations | Part III · CST Discrete Mathematics, Numbers |
| Chapter | One unit of that source: a STEP assignment, a CST lecture group, an IA schedule section | 3.6 Primes (notes, printed pages 291 to 308) |
| Section | One graph topic: a 5 to 15 minute lesson, mastered and reviewed as a unit | There are infinitely many primes |
| Step | One idea inside a section, with its own check and video slot | Remainders of a product plus one |

Rules:

1. **Each section appears once in the book**, in the first chapter that needs it. A later chapter that uses it links back ("Recall 2.2") and carries that source's problems in its own practice set.
2. **The book order is a valid prerequisite order.** Every section's prerequisites come earlier in the book. A test enforces this.
3. **Bridge sections:** when a source assumes something it never teaches, the chapter gets a bridge section, marked as such and written from first principles. Its citations are to Book of Proof or the TMUA notes, or it has no source.
4. **Problems-only chapters:** when every topic of a source unit is already taught (STEP Assignments 7 and 8), the chapter is a short introduction plus that unit's problems.
5. **Out-of-course problems are left out** (trigonometry, coordinate geometry, curve sketching), as in the batch 1 map.

## Part order

The sources are not independent. STEP Assignments 5, 6 and 12 assume proof by cases and divisibility, which the CST notes teach. So the recommended order is:

| Part | Source | Why here |
|---|---|---|
| 0 Foundations | none (first principles) | What every source assumes: arithmetic, sets, counting, chance |
| I Proof | CST Discrete Mathematics notes, lectures 1 to 6; Book of Proof; TMUA notes | Logic and proof come before everything that uses them |
| II STEP Foundation | STEP Support assignments 5, 6, 7, 8, 12, 19 | Counting and probability, with proofs now possible |
| III Numbers | CST notes, lectures 7 to 11; supervision exercises | Needs Part I's proof methods and Part II's counting |
| IV IA Probability | Faculty schedules; DPMMS example sheet 1 | The most demanding part; needs everything above |
| V Random variables and statistics | STEP Support Mixed STEP 1, STEP 2 and STEP 3 Statistics; Faculty schedules; DPMMS example sheets 2 to 4 | STEP's expectation and densities first, then the rest of IA Probability; needs Part IV's axioms and conditioning. Map: `graph/reviews/cambridge-batch-2.md` |

The alternative is STEP first (it is called the Foundation). Then Part II would need bridge sections for proof by cases and divisibility, taught twice over. Not recommended.

## Table of contents (draft)

Status: ● built (45), ○ mapped but unbuilt (71), ◇ bridge, new (8), △ analysis toolkit, new (22; see question 2).

**Part 0 · Foundations**
- 0.1 Arithmetic and algebra: ● Fractions and ratios · ● Laws of indices · ● Expanding, factorising, and simplifying
- 0.2 Whole numbers: ◇ Primes, factors, and multiples · ◇ Quotient and remainder · ● Algebraic arguments about integers
- 0.3 Sets: ● Sets and Venn diagrams
- 0.4 Counting and chance: ● The product rule for counting · ● Probability of equally likely outcomes · ◇ Mutually exclusive events · ◇ The addition rule for two events
- 0.5 Sequences and sums: ● Sequences and nth term rules · ● Sigma notation · ● Arithmetic series · ● Finite geometric series

**Part I · Proof** (CST notes, lectures 1 to 6)
- 1.1 Implication and direct proof (pages 18 to 56): ● And, or, and not · ● Implication · ● Direct proof
- 1.2 If and only if (pages 57 to 62): ● Necessary, sufficient, and if and only if
- 1.3 Quantifiers (pages 63 to 103, 198 to 206): ● Membership and set-builder notation · ● For all and there exists · ● Nested quantifiers · ● Disproof by counterexample · ● Proving and using quantified statements · ○ Divisibility
- 1.4 Disjunction and cases (pages 104 to 115): ● Proof by cases
- 1.5 Negation, contradiction, contrapositive (pages 133 to 153): ● Logical equivalences · ● Negating quantified statements · ● Proof by contradiction · ● Proof by contrapositive

**Part II · STEP Foundation**
- 2.1 Assignment 5, socks: ● The pigeonhole principle
- 2.2 Assignment 6, arrangements and the prosecutor's fallacy: ● Factorials · ◇ Permutations of r from n · ● Combinations · ● Arrangements with repeated objects · ● Sample spaces for combined experiments · ● Tree diagrams · ● Conditional probability from tables · ○ The conditional probability formula · ● Reversing a conditional probability
- 2.3 Assignment 7, Bachet's weights: problems only
- 2.4 Assignment 8, socks in three colours: problems only
- 2.5 Assignment 12, sweets, goggles and a raffle: ● Prime factorisation · ● Probability by counting · ● Independent events
- 2.6 Assignment 19, coins and dice: ◇ Discrete probability distributions · ○ The binomial distribution

**Part III · Numbers** (CST notes, lectures 7 to 11)
- 3.1 Number systems (pages 158 to 175): ● Natural numbers, integers, and rationals
- 3.2 Induction (pages 265 to 290): ● Proof by induction · ○ Strong induction
- 3.3 The binomial theorem (pages 116 to 124, 271 to 282): ● The binomial theorem · ● Symmetry and Pascal's rule · ○ Proving the binomial theorem by induction
- 3.4 Division and congruence (pages 57 to 62, 176 to 197): ○ The division theorem · ○ Congruence modulo m · ○ Arithmetic with congruences · ○ The integers modulo m
- 3.5 Greatest common divisor (pages 207 to 243): ◇ HCF and LCM · ○ The greatest common divisor · ○ Euclid's algorithm · ○ Euclid's theorem on divisors of a product
- 3.6 Primes (pages 291 to 308): ○ The fundamental theorem of arithmetic · ● There are infinitely many primes
- 3.7 Fermat (pages 116 to 131, 238 to 244): ○ A prime divides its inner binomial coefficients · ○ Fermat's little theorem
- 3.8 Inverses (pages 245 to 258): ○ The extended Euclidean algorithm · ○ Inverses modulo m
- 3.9 Key exchange (pages 259 to 264): ○ Powers modulo m by repeated squaring · ○ The Diffie-Hellman key exchange

**Part IV · IA Probability** (schedules; example sheet 1)
- 4.1 Basic concepts: ● Classical probability on a finite sample space · ○ Ordered and unordered samples · ○ Stirling's formula (needs △)
- 4.2 The axiomatic approach: ● Countable sets and countable unions · ● Events and sigma-algebras · ○ The axioms, countable case (needs △) · ○ First consequences of the axioms · ● Inclusion-exclusion for three events · ○ The inclusion-exclusion formula · ○ Continuity of probability measures · ○ Countable subadditivity
- 4.3 Independence: ○ Independence of several events
- 4.4 Conditional probability: ○ Conditional probability as a probability measure · ○ The law of total probability · ○ Bayes's formula
- 4.5 Discrete distributions (added with Part V): ○ Probability spaces on a countable set · ○ The Poisson distribution (needs △) · ○ The geometric distribution · ○ The Poisson limit of the binomial (needs △)

**Part V · Random variables and statistics** (STEP Support statistics modules; schedules; example sheets 2 to 4)
- 5.1 Mixed STEP 1 Statistics: ○ Expectation of a discrete random variable · ○ Expectation as a sum of tail probabilities · ○ Arrangements with objects together or apart · ○ Conditioning on the first step (needs △)
- 5.2 STEP 2 Statistics: ◇ Solving quadratic equations · ○ Variance and standard deviation · ○ Poisson counts over intervals and areas, and sums of Poissons · ○ Continuous random variables and density functions (needs △) · ○ Mean, variance, median, and mode of a continuous variable · ○ Finding a density through the distribution function (needs △) · ○ The normal distribution and standardising (needs △) · ○ Normal approximations to the binomial and Poisson
- 5.3 STEP 3 Statistics: ○ The algebra of expectation and variance · ○ Indicator variables and linearity of expectation · ○ Sums of n r^n (needs △)
- 5.4 Discrete random variables: ○ Random variables on a probability space · ○ Expectation on a countable space; functions of a random variable (needs △) · ○ Independent random variables · ○ Covariance, correlation, and the variance of a sum · ○ Conditional distributions and conditional expectation · ○ Probability generating functions (needs △) · ○ Random sums · ○ Counting with generating functions · ○ Linear difference equations · ○ Random walks and gambler's ruin · ○ Mean time to absorption · ○ Branching processes and extinction
- 5.5 Continuous random variables: ○ The exponential distribution and memorylessness (needs △) · ○ Joint densities, marginals, and independence (needs △) · ○ Transforming random variables with Jacobians (needs △) · ○ Geometrical probability · ○ Simulating continuous random variables · ○ Correlation and the bivariate normal
- 5.6 Inequalities and limits: ○ Markov's and Chebyshev's inequalities · ○ Convexity, Jensen's inequality, and AM-GM (needs △) · ○ The weak law of large numbers (needs △) · ○ Moment generating functions (needs △) · ○ The central limit theorem

Part V stops at the central limit theorem. Inference (estimation, hypothesis testing) is Part IB Statistics and is not in this round.

Totals: 146 sections in 31 chapters. Built 45, to write 101. Part V adds 38 sections in 6 chapters, chapter 4.5 adds 4, and the toolkit grows by 10.

The analysis toolkit (△) started as the 12 sections Stirling's formula and the countable axioms need: limits of sequences, the epsilon definition, limit laws, monotone convergence, the geometric sum to infinity, convergence of series, series of nonnegative terms, exp and ln, derivatives, definite integrals, integration by parts, and the asymptotics of log n!. Part V and chapter 4.5 add 10 more (22 in all): the exponential series, the limit of (1 + x/n)^n, the chain, product, and quotient rules, substitution, improper integrals, absolute convergence, power series, double integrals, change of variables (Jacobians, from IA Vector Calculus), and convexity. 13 of Part V's 38 sections need a toolkit section directly.

## Pages

| Page | Contents |
|---|---|
| Contents (home) | The whole book: parts, chapters, sections, each with a status dot. "Continue reading" at the top |
| Chapter | Its source, a short introduction, its sections with status, and the chapter's problem set (source problems that span its sections) |
| Section | The approved mockup: steps with prose, worked examples, checks and video slots; "Builds on" chips; practice; previous and next |
| Today | Continue reading (the next section in book order), reviews due, supervision redos due. Same daily budget as now |
| Map | The full prerequisite graph, as now, with sections labeled by book number |

The sidebar shows the contents on every page. On a phone it folds into a "Contents" button.

## How it changes the engine and content

- **New file `content/src/book.ts`:** parts, chapters (title, source citation, introduction), and the ordered section ids. A test checks rule 1 (each topic once), rule 2 (prerequisites earlier), and that every built topic is placed.
- **Scheduler:** the next new section is the first one in book order that is not mastered. Reviews and implicit credit work as now. Jumping ahead is allowed; unmet "Builds on" chips show in amber.
- **Course choice:** replaced by the book. The course untick toggle in Progress settings goes away (this answers the open question).
- **Steps:** each section's lesson is re-cut into steps. Today a lesson is one body plus examples, and its three generators already match three ideas, so each step pairs prose with one generator. `TopicContent` gains `steps: { title, body, worked?, check, video? }[]`.
- **Unchanged:** graders, generators, misconceptions, supervision formats, sync, progress document v4.

## Build order (each a review pause)

1. **Book shell:** `book.ts` and its tests, the contents sidebar, chapter pages, section pages with the existing lessons in the new layout, and Today's "Continue reading". No lesson rewriting.
2. **Steps:** re-cut the 45 built lessons into steps, part by part, in book order.
3. **Write the 8 bridge sections**, then the 71 unbuilt ones, in book order.
4. **The analysis toolkit**, if approved (question 2).
5. **Videos**, later.

## Questions

1. **Part order:** Proof before STEP, as recommended? Or STEP first, with bridge sections for proof by cases and divisibility?
2. **The analysis toolkit:** two IA sections (Stirling's formula, the countable axioms) need 12 sections of limits, series and calculus; Part V needs 10 more (see above). Options:
   - (a) Add a toolkit part before Part IV, sourced from the STEP calculus modules and later IA Analysis I. Recommended for first principles; it is a full extra part.
   - (b) Teach the two sections with the analysis stated and not proved.
   - (c) Leave the two sections out of this round.
3. **Problems-only chapters** (Assignments 7 and 8): keep them as chapters, as recommended (one by one through the sources), or fold their problems into the chapters that teach the topics?
4. **Chapter introductions:** short (one paragraph: what the source covers and why it comes here), as recommended?
