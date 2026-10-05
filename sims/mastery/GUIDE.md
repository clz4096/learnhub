# Mastery courses: guide

Dated 2026-10-05. Status: beta. Not listed in the catalog until the owner marks it ready.

## What it is

A course app for Cambridge IA Probability and CST IA Discrete Mathematics, taught from scratch over one shared knowledge graph of 101 topics (`graph/`). The design is `mastery/DESIGN.md`; the Cambridge-sourced content is `mastery/DESIGN-CAMBRIDGE-CONTENT.md`.

## How a day works

1. **Start.** Choose the course, for now only Probability and Discrete Mathematics (IA Probability and CST IA Discrete Mathematics together, split evenly), and daily minutes (60 by default), then go straight to Today. There is no placement test (design decision 20): every learner starts from the foundations, and a topic counts as known only once its problems are solved. Progress saved mid-placement by an earlier build keeps the answers given and goes on to Today.
2. **Today.** The engine's planner (`planSession`) fills the daily time with reviews that are due, new lessons split between the courses by weight, and a quiz every few topics. It schedules only topics whose lesson is written; the others show as "Lesson not written yet" and cannot be learned until they are. Each task shows the planner's reason. The plan is stored for the day, so a reload shows the same tasks.
3. **Lessons.** Learn, worked examples, then practice until the topic's mastery rule is met (three right in a row). A fourth part, Cambridge problems, sets the original problems the lesson is built from, each with its source: those with a value, expression, example, table, or formula answer are checked here (and can be tried again); those that ask for a proof or an explanation have a write-up box, kept while the tab is open, for a supervision session. They do not count towards learning the topic; supervision (below) can count as a review. Leaving a lesson keeps its place while the tab is open; closing the tab starts its practice again. Wrong answers that match a known misconception get a specific explanation.
4. **Answers.** One answer box everywhere (design decision 19c). It reads natural forms (3/8, 3 / 8, 3÷8, 0.375, 2^5, 2×3, √2, π; a ratio such as 3:8 only where a ratio is asked; C(n, k) or nCk only where a binomial coefficient is asked) and shows under the box, in LaTeX, exactly how the answer was read, or "Could not read this yet." An exact answer is a value, so a calculation such as 2^5 is read but must be worked out. A keypad of symbols for the question type inserts at the cursor; on a phone it sits on top of the system keyboard. Three more kinds: an example or counterexample ("find weights that..."), typed as numbers separated by commas and accepted whenever it works; a formula in P, Q, R, accepted when it has the same truth table as the expected one (∧ or &, ∨ or |, ¬ or ~, ⇒ or =>, ⇔ or <=>); and a table, filled in cell by cell (T or F, or numbers), with each wrong cell marked. A table with an empty or unreadable cell is not marked.
5. **Reviews and quizzes.** A review is two problems on a learned topic; a quiz is one problem on each recent topic. Both use the same problem runtime as practice.

## Supervision

Supervision happens in a Claude Code session, by copy and paste, the same way on the Mac and on a phone. No API keys or model calls are in the site.

1. **Copy.** On a supervision problem, write your answer in the box and press **Copy for supervision**. A wrong answer to an auto-checked Cambridge problem offers the same button, with your answer and optional working. The block starts with `LEARNHUB SUPERVISION v1` and holds the problem id, a random nonce, the Cambridge source, the problem with its LaTeX, your write-up, your recent attempts on the topic, the problems the supervisor may set to redo, the supervision instructions, and the exact result format. If the browser does not allow copying (some iPhone Safari cases), a read-only box with **Select all** appears instead.
2. **Supervise.** On the Mac, open Claude Code in the learnhub folder and type `/supervise`, then paste the block (the project command is `.claude/commands/supervise.md`). The block carries its own instructions, so pasting it into any Claude Code session works too. Attach photos of handwritten work if you have any. Claude questions you one step at a time, gives the smallest hint that unblocks you, never gives a full solution, and ends by printing the result block.
3. **From a phone.** Either continue the Mac's session from the Claude app on the phone with Remote Control (start it on the Mac with `/remote-control`, or `claude remote-control`, then open the session from the phone), or open a Claude Code session at claude.ai/code on this repository, where `/supervise` is available too. Copy and paste work the same in the phone's browser.
4. **Paste result.** Copy the whole result block and press **Paste result** on the problem, or on Today while a copy is waiting for its result.

The result block:

```text
LEARNHUB RESULT v1
PROBLEM: prob.event-spaces/q4-a-finite
NONCE: K7Q2XMPA
MARK: 12/20
WEAK 1: ...
WEAK 2: ...
WEAK 3: ...
REDO: prob.event-spaces/q4-a-finite, prob.event-spaces/q6-b-event
SUMMARY: ...
END LEARNHUB RESULT K7Q2XMPA
```

Paste result rejects, with a plain message, a paste without the header or the end line (cut off), a missing or repeated field, an end line whose nonce differs, a mark that is not a whole number from 0 to 20, fewer than three weak points, a redo id that is not a problem in the app, a result for another problem than the one it is pasted on, a nonce that no copy in this browser has, and a result already imported. There is no checksum: a supervisor computing one in its head would get it wrong and reject good results, so the block is tied to its copy by the echoed problem id and nonce instead, and checked field by field. A long field wrapped onto a second line by the terminal is joined back.

What an imported result does:

- **Review.** The mark is a review of the problem's topic: 14 or more out of 20 passes (the next review moves further away), below 14 is missed (it comes back sooner, and the topics it leans on hardest are checked). A topic not learned yet has no reviews, so nothing changes for it; the result is still kept.
- **Redo.** Each problem in REDO appears on Today the next day, with the weak points of that supervision, and opens on its own page. It stays until a later measured attempt: a new supervision of that problem copied after the redo was set, or, for an auto-checked problem, a right answer in the app.
- **History.** The attempt (problem, write-up, time copied, result, time imported) is kept in the progress document (version 3; documents from earlier versions are migrated) and appears under recent attempts in the next block for the topic.

You never mark your own work: there is no mark field or pass button anywhere. A mark enters only through a result block that echoes a nonce this browser made. Results must be pasted in the browser that made the copy until progress sync (build step 4).

## Moving around

Every screen has the same header (design decision 19a): the course title and the Home item go home, which is the Start step until a course is chosen and Today after. Leaving a lesson by Home keeps its place. Every view has its own URL, so the browser's Back (or Cmd+[ and the swipe on a Mac) returns to the previous view, and a reload shows the same one. Views reached by a button (a task, a lesson from the map, the glossary before a course is chosen) also have a Back link, and Escape closes every dialog and the map's topic panel. The map draws only the chosen topic's connections, to what it builds on and what builds on it; "Show all connections" draws every edge and is remembered in this browser.

## Content

Lessons exist for the first ten topics the engine schedules for a new learner taking both courses (fractions, sets and Venn diagrams, the product rule, and, or, and not, algebraic manipulation, set-builder notation, factorials, indices, sequences, and equally likely outcomes) and for three topics of the first Cambridge batch (the pigeonhole principle, reversing a conditional probability, and events and sigma-algebras), which the planner schedules once the topics they build on have lessons. Each is written from the Cambridge sources of `graph/reviews/cambridge-batch-1.md`: STEP Support assignments, IA Probability Example Sheet 1, the CST Discrete Mathematics notes and supervision exercises, Book of Proof, and the TMUA notes. Worked examples include real Cambridge problems worked in full; variants are generators built from their structure. Every Cambridge problem cites its source, every checked answer is verified by code, and each is compared with the official hints or solutions where they exist. The content lives in `content/` (package `@learnhub/content`), one file per topic, and is checked in CI: every number comes from code, every generator is run over 1,000 seeds, and every probability is checked exactly and by simulation. All mathematics is LaTeX, rendered by KaTeX bundled with the app (design decision 19b); the checks render every fragment of every seed strictly and reject mathematics left in plain text.

## Your data

Progress is one document in this browser's IndexedDB. Export it from Progress to keep a copy or to move to another device; Import replaces the progress here after showing what the file holds. Start over needs the phrase "start over" typed in full.
