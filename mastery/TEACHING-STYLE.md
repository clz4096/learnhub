# How lessons teach: style guide

Dated 2026-10-05. Status: approved direction (Albert: "the cadence and verbiage of 3Blue1Brown: clarity, rigor, correctness, accessibility, thoroughness; keep the rigor of Cambridge, but make sure students actually learn the material well enough to pass these exams"). Applies to every new lesson and to the rewrite pass of existing ones.

Two companion pages, approved by Albert 2026-10-08: [HOW-A-TOPIC-WORKS.md](HOW-A-TOPIC-WORKS.md) (lesson, practice, Cambridge problem, mastery, and what a miss does) and [APP-LANGUAGE.md](APP-LANGUAGE.md) (the voice of problem statements, hints, nudges, solutions, and app messages: neutral, no "you" or "we", except practice feedback). Where this guide's voice section says "second person", it means lesson prose; problems and app messages follow APP-LANGUAGE.md.

## The voice

- **Talk to one person.** Second person, present tense, plain words. "You might guess the answer is 2. Let's see why it isn't."
- **Curiosity first.** Open with a question or a small puzzle the reader can feel, before any definition. The definition arrives as the answer to a need, never as a decree.
- **Invent it, then name it.** Lead the reader to discover the idea ("what if we assumed the opposite and followed it until something broke?"), and only then give it its name ("this is proof by contradiction").
- **Concrete before abstract.** A specific case with real numbers, then the pattern, then the general statement, then the proof.
- **Honest about difficulty.** Say when something is subtle, where people go wrong, and why the obvious approach fails. Never "clearly" or "obviously" for a step a learner could miss.
- **Calm cadence.** Short paragraphs, one idea each. Sentences that build. Pause points ("Take a moment to check this with n = 4.").
- **Delight is allowed; fluff is not.** A good image or an elegant turn earns its place only if it makes the idea easier to hold.

## Formal first, then plain words (2026-10-05)

Albert: keep the rigor. Every lesson states its definitions and results formally, in LaTeX, the way the Cambridge notes would, and then explains each in plain words.

- **Definitions** in formal language, e.g. "x is rational if x = a/b for some a, b in Z with b not 0"; "n is even if n = 2k for some k in Z, odd if n = 2k + 1". Each followed by "In plain words:" and a small example.
- **Theorems** stated precisely with every hypothesis.
- **Proofs** written formally, step by step (each step a correct mathematical line), with a plain-words line under each step and a "why?" expander for any fact used.
- Notation is introduced before use (Z, gcd, divides).

## How it looks: Cambridge lecture notes, told by 3Blue1Brown (2026-10-05)

Albert: "the lecture should look like a maths professor at Cambridge wrote it, but in the style of 3Blue1Brown."

- **Formal objects look like Cambridge notes (LaTeX amsthm conventions):** "**Definition 2.1** (Rational number). A real number x is *rational* if ..." with the defined term in italics; "**Theorem 2.3.** *statement in italics*"; "*Proof.*" then the argument, ending with ∎. Numbered within the lesson (part.number).
- **Definitions are visibly different** from everything else: a tinted panel with a gold rule. Theorems have a green rule and an italic statement. Each formal object is followed by its plain-words line.
- **Between the formal objects, the voice is 3Blue1Brown:** conversational narrative paragraphs that pose the question, build the intuition, and say why the next definition or step is needed.
- **Lesson header:** where it sits in the journey (stage › chapter › N of M), the topic name as the title, then two short lines: **You'll learn** (the learning objective, one sentence) and **Why** (why it matters and what it leads to next, one sentence), and the time estimate ("about 20 min · 4 parts"). Then each part with its own heading.

## No skipped steps (hard rule, 2026-10-05)

Albert's test: a lesson must make sense to a capable adult reading it for the first time, without a teacher. Experts skip steps they no longer notice; learners cannot.

- **Every algebraic move is shown and said in words.** Not "squaring gives a² = 2b²" but "square both sides: √2 squared is 2, a/b squared is a²/b², so 2 = a²/b²; multiply both sides by b²: a² = 2b²".
- **Every letter is introduced before it is used, with an example value.** "Call that number k, so a = 2k. (If a were 10, k would be 5.)"
- **Every term is defined at first use in plain words** (fraction, even, factor, lowest terms), with the glossary link.
- **Every "so" is justified.** If a step needs a fact (odd times odd is odd), the fact is stated, with a small example, or behind a "why?" expander.
- **Numbered steps for any argument longer than three moves**, each step with a short bold label saying what it does.
- **Less on screen.** Short paragraphs; one idea at a time; detail behind "why?" expanders instead of in the main flow.
- **Learner review before shipping.** Every lesson is read by an independent reviewer playing a capable novice, who flags any step, symbol, or word that is not explained. A lesson ships only with zero flags.

## The rigor

- **Every claim is true as stated.** Hypotheses are stated, edge cases named, and proofs complete. Intuition is labelled as intuition and then made precise.
- **Cambridge standard.** Definitions and theorem statements match the Cambridge course notes in substance; proofs are at the level the Tripos expects; notation follows the course.
- **Computed, not typed.** As always, every number in a lesson is computed by code, and every claim about probability is checked by simulation or exact computation.

## The shape of a lesson

1. **The hook** (2 to 4 sentences): a question, puzzle, or surprising fact, ideally from the Cambridge source itself.
2. **Build the intuition**: a concrete example worked slowly, with the key move made visible; where a picture helps, describe it precisely (a video or diagram slot can hold it later).
3. **Name it and state it precisely**: the definition or theorem in rigorous form, with every hypothesis, in a rule box.
4. **Why it is true**: the proof or derivation, step by step, each step justified, with the idea of the proof said in one line first.
5. **Where it breaks**: the edge cases and the most common mistakes, each with a short counterexample.
6. **The Cambridge problem, worked**: a real problem from the source, solved the way a strong candidate would write it, with a line on what the examiner is looking for.
7. **Check yourself**: one or two quick checks in the lesson, then the practice set.
8. **The one-line takeaway**: what to remember, in one sentence.

## Exam readiness (so learners actually pass)

- **Every topic ends exam-ready**: mastery requires solving at least one Cambridge-standard problem unaided, not only the generated drills.
- **Write-ups are taught**: worked solutions show the structure examiners reward (state what is being proved, define notation, justify each step, conclude).
- **Spaced and mixed**: review brings topics back mixed with others, as exam papers do.
- **Timed practice**: by the end of each block or course, a timed past-paper question; by the end of a term, a full timed paper.
- **Errors become lessons**: each misconception in a generator has a short explanation in this voice, not just "incorrect".

## Before and after (Proof by contradiction, the opening)

**Before (current):**

> Some statements are hard to prove head on: "√2 is irrational" says what √2 is not. Proof by contradiction turns this round: assume the statement is false, and show that this leads to something impossible.

**After (this style):**

> Here is a strange kind of claim: √2 is not a fraction. Notice what that sentence does. It doesn't tell you what √2 is; it tells you what it can never be. So how would you prove it? You can't check every fraction one by one, because there are infinitely many.
>
> Here's a sneaky idea. Suppose, just for a moment, that √2 *is* a fraction, say a/b, written in lowest terms. You're not claiming this is true; you're taking it for a walk to see where it goes. Square both sides and you get a² = 2b². So a² is even. That forces a to be even, because the square of an odd number is odd: (2m + 1)² = 4m² + 4m + 1. Write a = 2k. Then 4k² = 2b², so b² = 2k², and b is even too.
>
> But we said a/b was in lowest terms, and now both a and b are even. Something has gone wrong, and the only thing we assumed was that √2 is a fraction. So that assumption must be false.
>
> This move has a name: **proof by contradiction**. To prove a statement P, assume P is false, follow the consequences carefully, and arrive at something that cannot be true.

## Content fields

The fields in `content/src/topic.ts` that carry this style. The content checks validate each one: every text is checked like lesson text (computed numbers only, no dashes, LaTeX that renders, glossary terms that exist).

Lesson blocks (`Block`), in the order a lesson uses them:

| Block | Fields | Use it for |
| --- | --- | --- |
| `section` | `title` | Starts a named section ("The idea", "Is √2 a fraction?"). The lesson is read one section at a time under its name; the header lists the names as the outline. A lesson with sections starts with one, and no section is empty. A lesson without sections is one section, "The idea". |
| `hook` | `text` | The opening question or puzzle, in the reading serif. The first block, or the first in the opening section. |
| `narrative` | `text` | The 3Blue1Brown voice between formal objects: a conversational paragraph in the reading serif. |
| `p`, `rule` | `text`, optional `why` | Prose and displayed rules, as before. `why` adds a "why?" expander (`{ q, a }`) for a fact the step uses. |
| `definition` | `name`, `formal`, `plain` | A definition stated formally in LaTeX, shown as "**Definition 2.1** (name). formal text" in a tinted panel with a gold rule, the defined terms (glossary marks) in italics; then "In plain words:" with a small example, muted. |
| `theorem` | optional `name`, `statement` | A result stated precisely, with every hypothesis, shown as "**Theorem 2.3.** *statement*" with a green rule. |
| `steps` | `steps`, optional `proof` | Any argument longer than three moves. Each step has a short bold `label`, the formal line `text`, an optional centred display equation `eq`, an optional muted `plain` line, and an optional `why`. Set `proof: true` for a proof: it opens with "*Proof.*" and ends with ∎. At least two steps. |
| `check` | `problem`, `reference`, `why` | A quick check in the lesson, marked by the practice graders, with one line on why. Build it with `quickCheck` or, for computed numbers, `checkFrom(generator, params, why)`. Any answer kind but a table. It never counts towards mastery. |
| `pitfall` | `claim`, `counterexample` | Where it breaks: a tempting false claim and the counterexample. |
| `takeaway` | `text` | The one-line takeaway. Last block only. |

Definitions and theorems share one counter (`formalNumbers`): section.n in a lesson with sections, restarting at each section ("Definition 2.1" is the first in the second section), or n without sections. `lessonSections` gives the lesson as its sections. After the lesson's own sections the app adds "Worked examples", "Try one yourself" (the practice), and "The Cambridge problem".

Topic and example fields:

- **`TopicContent.objective`** and **`TopicContent.why`**: the lesson header's "Goal" (what the learner will be able to do) and "Why" (why it matters and what it leads to next), each one short sentence, at most about 110 characters. Missing ones and long ones are a warning in the content checks for now; without an objective the header shows `goal`. The header also shows the journey line from the book (stage › chapter), "about N min", and the outline of sections, done ones struck through and "you are here" on the current one. No counts: the top bar shows one segment per section, without numbers.
- **`TopicContent.minutes`**: the lesson's minutes, for the header; the graph topic's estimate when absent.
- **`WorkedExample.examiner`**: one line on what the examiner looks for, shown under the worked Cambridge problem once its answer is shown.
- **`CambridgeProblem.hints`** and **`nudge`** (optional, 2026-10-08): up to three hints, each a question that goes one step further than the last and never gives the answer; and, on a single-answer problem, the one line under "Not right yet" that points toward a faster or better route. Both in a neutral voice (APP-LANGUAGE.md). The content checks enforce the count, the question form, and the voice.
- **`TopicContent.gate`** (required): ids of the topic's Cambridge problems that complete mastery. A topic is mastered when its practice is passed and one gate problem is done to standard: an auto-checked one solved unaided (a right answer before its solution was ever shown; misses get a nudge and hints, and the problem comes back in a few days, per HOW-A-TOPIC-WORKS.md rule 3), or a supervised write-up marked 14 or more of 20. Choose Cambridge-standard problems (`GATE_DOCS`: STEP, the IA Probability sheets, the CST exercises), multi-part where possible; `gateCandidates(cambridge)` gives the default. An empty gate is a warning in the content checks for now, and such a topic cannot be mastered.
- **`CambridgeProblem.uses`** (required on every gate problem; 2026-10-06): what the problem draws on, shown above it as "This tests" (`note`, one plain line naming the skill), "From this lesson" (`sections`, the titles of this lesson's sections it uses, each a link to the section), and "Builds on" (the topic's prerequisites, from the graph). Set it with `withUses(problems, { id: { sections, note } })`. A gate asks only for its lesson and what the lesson builds on: if a problem also needs another topic, list it in `needs` (shown as "Also needs"), and make the problem practice, not a gate, unless that topic comes earlier in the book. The content checks enforce both rules.
- **`TopicContent.recall`**: recall cards for gym mode (`{ front, back }`), one per definition or theorem statement worth knowing by heart. The learner marks them, so they move no review schedule.
- **`TopicContent.proofOrder`**: tap-to-order proof puzzles for gym mode (`{ title, steps }`), the steps of a short proof in their right order; at least three steps, no two alike. Graded by the proof grader (`proofOrderSpec`).
- **`GeneratorSpec.quick`**: the generator's problems take about a minute on a phone, so gym mode may use them as quick drills.

Gym work feeds spaced review and earns REP at a lower rate, but never meets the gate.
