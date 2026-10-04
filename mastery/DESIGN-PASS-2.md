# Mastery courses: design pass 2, answer feedback and mistakes

Dated 2026-10-04. Status: **approved by the owner on 2026-10-04**, with all four recommendations (see [Decisions](#decisions-owner-2026-10-04)). Building phase 0. Decisions 1 to 19 in [DESIGN.md](DESIGN.md) are binding; this pass leans on 5 (content is checked and reviewed), 11 (fast progress only from measured answers), 18 (no self-report anywhere), and 19 (one way home, LaTeX everywhere, easier answer entry).

## The owner's feedback

> "I think the learning hub needs another design pass. There is no option for 'hey I made a mistake in putting in the answer'. There seems to be no way to know whether an answer is wrong and what the right answer is."

## Summary

The engine already computes almost everything the learner needs: whether the answer is right, which misconception it matches, the correct answer, and a full worked solution. The problem is how the UI presents it, plus four rules that count non-answers as wrong answers.

- In **practice, reviews, and quizzes**, the correct answer and the solution are shown. But the answer appears as 13 px grey text ("The answer: 5"), below the Continue button. On a phone it lands below the fold: at 390 px, the answer starts at y = 862 in an 844 px viewport, and focus is already on Continue. Pressing Enter twice quickly skips the feedback entirely.
- In **placement**, the app says "Not quite. Compare with the solution below." and then shows no solution and no correct answer. That is a bug, and it is the clearest case of the owner's complaint.
- **Unreadable input** (for example `3/`) is graded as wrong. It resets the streak, fails a review, and rules out a topic in placement, even though the preview had already said "Could not read this yet."
- **No slip path exists.** A typo is permanent. It resets the right-in-a-row count, fails a review (halving the interval and flagging prerequisites for checks), or rules out a placement topic and every topic above it.
- **Nothing is kept for later.** Practice attempts are never written to the progress document. Reviews and quizzes store only pass or fail per topic. So no mistakes list can exist today.

Headline changes:
1. A result block directly under the answer, above the buttons, scrolled into view and focused. It shows "Incorrect" with an icon, your answer and the correct answer side by side at full size, the misconception, the full worked solution, and what the miss does to progress.
2. Unreadable input is never graded. A known wrong-form entry (a calculation where a value is asked, or a ratio where a fraction is asked) asks for confirmation before it is graded.
3. **"I mistyped" sets an attempt aside.** The attempt counts neither way and a **fresh problem on the same skill** replaces it; only that problem's answer is measured. It is limited per run and per day, is never offered when the answer matches a known misconception, and is kept in history.
4. "My answer should be accepted" files a grader report. It changes nothing in progress.
5. Placement shows right or wrong plus the correct answer after each question, allows up to 2 set-asides per test, and ends with a review of every answer with solutions.
6. A **Mistakes** view lists every wrong answer, newest first, with the problem regenerated exactly, and offers unscored "Try a similar problem".
7. Accessibility: a short live announcement ("Incorrect. Your answer 10. Correct answer 5."), focus on the result heading, and choice options labelled in text, not only by border colour.

Mockups are in `mastery/design-pass-2/` (gitignored). See [Mockups](#mockups).

## Method

- Built the app from `sims/mastery` with Vite into a scratch folder. Served it on 127.0.0.1 and drove it in headless Chrome over the DevTools protocol. Each run used a fresh profile.
- A test-only oracle bundle, built from `@learnhub/content`, read each problem's topic, generator, and seed from the card's data attributes. It returned the reference answer and the misconception answers, so every case could be produced deliberately.
- Reviews and quizzes were reached by editing the stored progress document after placement: every placed topic due yesterday, and 4 topics in `learnedSinceQuiz`.
- Cases: right; wrong matching a misconception; wrong generic; typo (the right answer with an extra digit); unreadable (`3/`, `x+`); right value in the wrong form (`21*1`); "Show me how"; a double Enter. Viewports: 1280 x 900 and 390 x 844 (mobile emulation, DPR 2), light and dark.
- Screenshots of the current app are in `mastery/design-pass-2/reproduction/`.

Not verified: real screen reader output (VoiceOver was not run, to avoid a macOS permission prompt), and the docked keypad with a real phone keyboard.

## What the learner sees today

### Per flow

| | Placement | Lesson practice | Review (2 problems) | Quiz (1 per topic) |
|---|---|---|---|---|
| Right | "Right." / "Correct." / "Yes, that is it." in a green box under Continue | Same, and a streak dot fills | Same | Same |
| Wrong | "**Not quite.** Compare with the solution below." **No solution and no answer are shown** (bug). | "Not quite." plus the misconception or "Compare with the solution below.", then "The answer: 5" in 13 px muted text, then the steps | Same as practice | Same as practice |
| Is "wrong" clear? | Weakly: "Not quite" in a yellow warning box. The same yellow is used for "That is fine" after giving up. | Same | Same | Same |
| Right answer shown? | **No** | Yes, small and grey; below the fold on a phone | Yes, same | Yes, same |
| Worked solution shown? | **No** | Yes, full steps | Yes | Yes |
| Typo recovery | None. The topic is ruled out, along with every topic above it. | None. Streak goes to 0. | None. The review fails. | None. That topic's review fails. |
| Unreadable entry (`3/`) | Graded wrong: "Not quite. Enter a whole number, a fraction like 3/8..." | Graded wrong, streak 0 | Graded wrong, review fails | Graded wrong |
| Right value, wrong form (`21*1`) | Preview warns "Work it out to a single number" before Check, but Check grades it wrong anyway | Same | Same | Same |
| End screen | "You are placed": counts only. No per-question list. | "Topic learned" or "Not yet, and that is normal" | "Missed this time. It comes back sooner." It does not say which problem was missed. | "Missed this time." Today then labels the whole quiz "Missed", even when 3 of 4 items were right. |
| Kept for later | Placement answers: topic and correct flag only | **Nothing.** The streak lives in tab state; history gets one lesson pass or fail. | One pass or fail per review | One correct flag per topic |

### What a miss does to progress (from `learner.ts` and `memory.ts`)

| Flow | Effect of one wrong answer, including a typo |
|---|---|
| Placement | `answerPlacement(..., false)`: the topic and every topic that builds on it are ruled out. Each one then needs a lesson of about 15 minutes. |
| Practice | Streak back to 0 (`answer` in `practice.ts`). Each miss uses up 1 of the 10 problems. After that, the lesson ends "not yet" and `recordLessonFailure` flags strong prerequisites for checks. |
| Review | `afterFailure`: the interval is halved, reps go down by 1, lapses go up by 1, banked implicit credit is dropped, and prerequisites are flagged for checks. |
| Quiz | Each wrong item is a failed review of that topic, with the same effect as above. |
| "Show me how" | Counts as a miss (streak to 0). The button does not say so. |
| A broken problem | `problemError` returns `correct: false` ("Problem error, not your answer"), and the UI counts it as the learner's miss. |

### Measured layout facts

- Phone, practice, after a wrong answer: the result box starts at y = 771, and the correct answer at y = 862, in an 844 px viewport. No scroll happens, focus is on Continue, and the learner sees "Not quite" and the start of one sentence. See `reproduction/35-practice-wrong-390-light.png`.
- Desktop: the answer line is 13 px muted grey, inside a warning-yellow box, under the Continue button.
- Double Enter: with a right answer typed, two Enter presses 30 ms apart went to the next problem. The feedback was never visible. A wrong answer takes the same path.
- Live region: `.feedback-area` is `role=status aria-live=polite` and holds the whole solution. Focus moves to Continue at the same moment, so a screen reader may announce "Continue, button" and cut off or delay the result. This is inferred from the code and was not tested with VoiceOver.
- Choice problems mark right and wrong options by border colour only.

## Ranked problems

1. **Placement promises a solution and shows nothing** (bug). "Compare with the solution below" with no solution and no answer.
2. **The correct answer is easy to miss in every other flow**: small grey text, below the buttons, below the fold on a phone.
3. **No slip recovery.** A typo has the full cost of a conceptual miss: a streak reset, a failed review with a halved interval and prerequisite checks, or a ruled-out placement topic and everything above it.
4. **Unreadable and known wrong-form entries are graded as misses**, although the preview already knows they cannot be accepted.
5. **Double Enter skips the feedback.**
6. **Review and quiz end screens hide which item was wrong**, and Today labels a 3-of-4 quiz "Missed".
7. **No record of mistakes.** Practice attempts are not saved at all, so a Mistakes list is impossible without a data change.
8. **"Not quite" in warning yellow** is a soft, ambiguous signal, styled like "That is fine" after giving up. Wrong and gave-up should look different.
9. **"Show me how" silently counts as a miss.**
10. **A broken problem counts against the learner.**
11. **Accessibility**: a verbose live region that competes with a focus move; choice results shown by colour only.
12. **Phone layout**: the header takes two rows (about 112 px), and the "You can leave and come back..." paragraph repeats above every practice problem. Together they push the problem down. The input hint "Enter checks it" stays after checking.
13. **Placement end screen** gives counts only, with no per-question review.

## How other mastery systems handle this

Sources were gathered with web search; labels: D = documented by the vendor, 3P = reported by a third party, U = unknown.

| | Math Academy | Khan Academy | Brilliant | Duolingo | Anki |
|---|---|---|---|---|---|
| Answer or solution after a miss | D: worked solutions [1] | 3P: shown after submit [7] | 3P: answer plus explanation [13] | D: correct form shown; Explain My Answer [10] | D: Show Answer [15] |
| Retry or slip path | 3P: none in tasks; the diagnostic has an "I made a silly mistake" retry [3] | 3P: retry allowed, but the item already counts as wrong | U | D: missed items come back at the end of the lesson [11] | D: self-graded; Again sends the card to relearning [16] |
| Dispute an answer | U | D: "Report a problem" [8] | D: a flag next to Continue [12] | D: "My answer should have been accepted" report; about 10 percent of reports are valid; reports are triaged before human review [9] | not applicable (self-graded) |
| Penalty | D: negative XP for rushing or guessing [2] | D: mastery levels go down [14]; 3P: any hint marks the item wrong [6] | U | D: energy [11] | D: lapse and leech counters [16] |
| Mistakes later | D: missed quiz topics get immediate review [2] | 3P: no review after a test is done [7] | U | 3P: a Mistakes mode in the Practice Hub [18] | D: leeches tagged and suspended at 8 lapses [16] |
| Placement feedback | D: an "I don't know" button so students do not grind [20]; per-question correctness U | 3P: feedback and the answer shown after each submit on course challenges [7] | U | U | not applicable |
| Screen reader result announcement | U | U | U | 3P: distinct sound cues [23] | U |

What this changes:
- No product documents automatic forgiveness of a graded answer in regular practice. Math Academy says plainly that typos cost a review [5]. Khan and Duolingo route disputes to a content report that does not change the score at the time. So the slip path below is deliberately conservative: it never adds credit.
- Math Academy keeps its "silly mistake" retry for the diagnostic [3], where a false negative is most expensive. That matches this app: a placement miss rules out a topic and everything above it.
- Duolingo's report data (most reports are invalid) argues for keeping "my answer should be accepted" separate from "I mistyped", and making it change nothing on its own.

Sources: [1] https://www.mathacademy.com/how-it-works [2] https://www.mathacademy.com/faq [3] https://frankhecker.com/2025/02/17/math-academy-part-10/ [5] https://newsletter.ozwrites.com/p/a-balanced-review-of-math-academy [6] https://support.khanacademy.org/hc/en-us/community/posts/115003344211-Use-of-hints [7] https://support.khanacademy.org/hc/en-us/community/posts/22820449421453-Reviewing-questions-after-completed-an-exercise-quiz-course-challenge [8] https://support.khanacademy.org/hc/en-us/articles/202445304-How-do-I-report-a-mistake-or-issue-with-an-exercise [9] https://blog.duolingo.com/how-user-reports-improve-course-content [10] https://blog.duolingo.com/explain-my-answer-now-free [11] https://blog.duolingo.com/duolingo-energy/ [12] https://brilliant.org/help/help-and-support/how-can-i-report-bugs-issues-i-m-encountering-on-brilliant/ [13] https://www.trustpilot.com/review/brilliant.org?page=5 [14] https://support.khanacademy.org/hc/en-us/articles/360037494231-What-are-Mastery-Challenges [15] https://docs.ankiweb.net/studying.html [16] https://docs.ankiweb.net/leeches.html [18] https://duoplanet.com/duolingo-practice-hub/ [20] https://www.justinmath.com/golden-nuggets-podcast-39/ [23] https://www.applevis.com/forum/ios-ipados/duo-lingo-accessible-voiceover

Open: Khan's "your answer is read as" preview could not be confirmed (its help article returned 403). Math Academy's per-miss XP and its diagnostic's per-question feedback are undocumented.

## Proposal

### 1. Answer submission

| Input state (from `readAnswer`) | Enter or Check does | Recorded |
|---|---|---|
| Empty | Nothing (as today) | Nothing |
| Unreadable (preview "Could not read this yet") | Not graded. The input gets an error state with the message "Could not read 3/. Finish it or use the keypad." Focus stays in the field. | Nothing |
| Read with a note (a calculation where a value is asked, or a ratio where a fraction is asked) | First press: an inline confirmation under the preview, "This is read as 21 × 1, a calculation. The question asks for a single number." with **Edit** (default, focused) and **Check anyway**. A second Enter edits. | Only if checked anyway: graded normally |
| Read cleanly | Graded | The attempt |

- **No confirmation for ordinary answers.** The live "Read as" preview is the confirmation; adding a dialog to every answer adds friction for a 60-minute daily habit.
- **The note never leaks correctness.** It comes from `readAnswer`, which already avoids form notes on expressions so as not to hint at the value. The required-form problems (`requireLowestTerms`, expression `form`) stay graded as they are, because the form is the skill they test. Their feedback already says "Right value, but...".
- **Enter guard.** For 500 ms after a result appears, Enter is ignored. After a **wrong** answer, focus goes to the result heading, not to Continue, so Enter does nothing until the learner tabs or clicks. After a **right** answer, focus goes to Continue, so the fast path stays one key.
- **A broken problem** (`problemError`) is never a miss: the attempt is recorded as `problem-error`, a fresh problem replaces it, and the message says so.

### 2. Feedback after every answer

One result block, the same in every flow (`ProblemCard`), placed **directly under the answer field and above the buttons**, scrolled into view (respecting reduced motion) and focused on a wrong answer. Mockup: `m1-practice-wrong`.

- **Right:** a green check and "Correct", plus any grader note ("In lowest terms that is 3/8"). Continue gets focus.
- **Wrong:** a red cross and "**Incorrect**" (not "Not quite"). Then:
  1. **Your answer and the correct answer side by side**, at body size or larger, rendered as LaTeX (decision 19b). "Your answer" shows the preview's reading, so the learner sees what the grader saw.
  2. **The likely slip:** the misconception's `why`, when the answer matches one. Otherwise the grader's own note (for example "At n = 3, your expression is 12, which does not match.").
  3. **The full worked solution**, every step, in a bordered panel.
  4. **What it does to progress**, one line, from the same rule code: "This counts as a miss: right in a row goes back to 0. 8 problems left in this run." Or "A review passes only when both problems are right, so this review is missed."
  5. Actions: **Next problem** (primary), **I mistyped** (when allowed, see 3), and a small link, **My answer should be accepted** (see 4).
- **Gave up** ("Show me how", "I do not know this"): a neutral grey block, "Solution", with no red cross. The button label says what it costs: "Show me how (counts as a miss)".
- **Choice problems:** every option gets a text label after Check: "Correct, you chose it", "Not in the set, you chose it", "Correct, you missed it". Colour is no longer the only signal. Mockup: `m3-review-quiz`, bottom right.
- **Run history row** in practice and reviews: small numbered chips, green, red, or dashed grey for set aside, so the learner sees each problem's result after moving on.
- **Retry options.** Re-entering the same problem after the answer has been shown measures nothing, so no flow offers a plain retry. Retry means "a fresh problem on the same skill". In practice, after any miss, the next problem uses the **same generator** (the missed skill) with a new seed, instead of the next generator in turn. (This is a small `instanceAt` change, optional; see phase 5.)

### 3. "I mistyped": set an attempt aside

**Rule.** After a graded wrong answer, the learner may set the attempt aside. A set-aside attempt:
- counts as **neither right nor wrong**: the streak keeps its value, a review or quiz item is not failed, and a placement topic is not ruled out;
- is replaced by a **fresh problem on the same skill** (same generator, new seed). That problem is graded normally and is the only measurement. In a review it takes the same slot; in a quiz, the same item; in placement, the same topic;
- is **kept in history** with outcome `set-aside`, the response, the generator, and the seed. It shows as a dashed chip in the run, under a "Set aside" filter in Mistakes, and as a weekly count in Progress.

**When it is offered** (all must hold):
1. The answer was graded wrong. Not after "Show me how", "I do not know this", or a right answer.
2. The answer does **not** match a known misconception. A match is evidence of a conceptual slip, so it counts. The block says so and points to the report link instead.
3. Budget left: **2 per lesson practice run, 1 per review, 1 per quiz, 2 per placement test, and at most 5 per day** across everything. The confirmation sheet shows what is left.
4. One per problem. The replacement problem can itself be set aside only if budget remains.

**Confirmation sheet** (mockup `m2-mistyped`, step 2): "Set this attempt aside? It counts as neither right nor wrong. You get a fresh problem on the same skill, and that one counts. It stays in your history. You can set aside 1 more attempt in this lesson." Buttons: **Set aside, give me a fresh problem** and **Cancel**.

**Why a fresh problem, not a re-entry on the same one.** The result block shows the correct answer at once (that is the owner's other request). After that, re-entering the same problem measures nothing, which would break decision 11. The alternative, hiding the answer until the learner chooses between "show me" and "I mistyped, let me re-enter", was rejected on two counts. It delays the answer after every wrong answer, which is the complaint being fixed. And it turns every wrong answer into a free second guess.

**Anti-gaming, and why it holds:**
- A set-aside never adds credit. Every topic still passes only on measured answers: the streak still needs 3 consecutive right answers, and a review still needs 2 right. Decision 11 holds.
- Set-asides count toward `maxProblems`, so they cannot extend a practice run.
- The misconception exclusion stops the most common conceptual misses from being waved away.
- Budgets bound the damage: at most 5 misses a day can be avoided, and each costs a fresh problem.
- Everything is visible later. With one learner who is also the author, visibility is the main control, and the weekly count makes overuse obvious.
- Rejected alternative: offering it only when the answer is within edit distance 2 of the correct one. This is fiddly across forms (fractions, decimals, expressions, choice sets), and it would hide the button for a real slip like typing the numerator of the wrong fraction. It can be added later if the weekly count shows abuse.

### 4. "My answer should be accepted"

A small link in the wrong-answer block. It saves a report with the topic, generator, seed, response, the grader's verdict, and the time. **It changes nothing in progress** (decision 11, and Duolingo's data that most such reports are wrong [9]). Progress gets a "Grader reports" list with **Copy as bug report** (the data needed to reproduce the problem in a test). If a later build's grader accepts the stored response for the same generator and seed, the list marks the report "now accepted". Re-grading old progress is left out; see open questions.

### 5. Placement feedback policy

**Recommendation: show right or wrong and the correct answer after each question, but no worked solution; allow 2 set-asides per test; end with a full review.** Mockup: `m4-placement`.

Why reveal at all: a placement miss is the most expensive miss in the app. It rules out the topic and everything above it, and each ruled-out topic costs a lesson. A slip is only catchable if the learner knows the answer was marked wrong; Math Academy offers its "silly mistake" retry in the diagnostic for the same reason [3]. The intro already says "A wrong answer is fine", so showing correctness is consistent with it.

Why no solution during the test: the test should stay short (at most `budgetFor(g)` questions), the lesson the miss schedules teaches the method, and the end review shows the solution for anyone who wants it now.

Wording: "Not right: the answer is 256. Saved. This topic starts with a lesson, and topics that build on it wait for it." The bug text "Compare with the solution below" goes away.

End screen: a "Your placement answers" table with every question's result (right, wrong, set aside, did not know), your answer, the answer, and an expandable solution. It feeds the Mistakes list.

### 6. Mistakes

A new view, `#/mistakes`, in the navigation after placement. Mockup: `m5-mistakes`.
- Every attempt with outcome `wrong` (and set-asides under their own filter), newest first. Filters: All, Practice, Reviews and quizzes, Placement, Set aside.
- Each entry regenerates the problem from its generator and seed, so it is exactly what the learner saw. It shows your answer, the correct answer, the misconception, and **Show solution**.
- **Try a similar problem**: a fresh seed of the same generator, graded with full feedback, **unscored**. It never changes memory, the streak, or the plan (decisions 11 and 18). It is practice for understanding, not evidence.
- **Mark as understood** hides an entry (kept in data, with a "Show understood" toggle).
- If a generator has changed since the attempt (its stored reference answer differs from the regenerated one), the entry says "This problem has changed since you answered it" and shows the stored response and answer only.
- Review and quiz end screens link to it.

### 7. Review and quiz results

Mockup: `m3-review-quiz`.
- **Review end:** "Review missed: 1 of 2 right", a two-row table (result, problem, you, answer, solution link), and the effect: "The next review is in 2 days instead of 8." The day counts come from the memory state before and after.
- **Quiz end:** "Quiz: 3 of 4 right", one row per item, and the effect per topic.
- **Today:** a quiz shows "3 of 4 right", not "Missed". A review shows "Passed" or "Missed (1 of 2)".

### 8. Accessibility

- On Check, one short **assertive** announcement from a dedicated live region: "Correct." or "Incorrect. Your answer 10. Correct answer 5." The explanation and solution are not in the live region; they follow the focused heading in reading order.
- On a wrong answer, focus moves to the result heading (`tabindex=-1`). On a right answer, focus moves to Continue, after the announcement.
- Choice options carry text labels for results (see 2). Icons are `aria-hidden`; the word carries the meaning.
- Set-aside and report sheets are real dialogs with focus trapped, Escape to cancel, and focus returned to the trigger.
- The red, green, and grey result colours use the existing tokens (`--error`, `--good`, `--border-strong`), which already meet 4.5:1 on their backgrounds in both themes. The result text itself uses `--text`, not muted.
- Scroll into view uses `behavior: 'auto'` under `prefers-reduced-motion`.

### 9. Other usability fixes, ranked

1. Move the result above the buttons and scroll it into view (covered above). This is the single largest fix on the phone.
2. Show the "You can leave and come back..." note once per lesson, collapsed after the first problem, or move it into Help. Today it repeats above every problem.
3. Phone header: put the navigation on one scrollable row under the title, and keep Home first (decision 19a). Today it is two rows, about 112 px.
4. Hide the input hint ("Enter checks it") after checking; mark the disabled input red or green to match the result.
5. "Show me how (counts as a miss)" in practice; "I do not know this (starts this topic with a lesson)" in placement.
6. The placement page's "Answers so far: 4 known, 2 to learn" stays, and it should count set-asides separately.

## Data model changes (progress document version 3)

Version 3 adds two arrays. No existing field changes meaning.

```ts
export type AttemptOccasion = 'placement' | 'practice' | 'review' | 'quiz' | 'mistakes';
export type AttemptOutcome = 'correct' | 'wrong' | 'set-aside' | 'gave-up' | 'problem-error';

export interface Attempt {
  at: number;
  occasion: AttemptOccasion;
  topicId: string;
  generatorId: string;
  seed: number;
  /** As typed (string, at most MAX_ANSWER_LENGTH) or the chosen option ids. */
  response: string | string[] | null;
  outcome: AttemptOutcome;
  /** The reference answer at the time, to detect a changed generator later. */
  reference: string | string[];
  /** Index into the instance's misconceptions, when the answer matched one. */
  misconception?: number;
  /** Set when the learner marks it understood in Mistakes. */
  understoodAt?: number;
}

export interface GraderReport { at: number; topicId: string; generatorId: string; seed: number; response: string | string[]; }

// Progress gains:
attempts: Attempt[];
reports: GraderReport[];
```

- **Migration 2 to 3:** add `attempts: []` and `reports: []`. Old documents have no attempt detail, and none is invented.
- **Import validation:** check every field the way `progress.ts` checks history. Topic ids use `TOPIC_ID_RE`; responses are bounded by `MAX_ANSWER_LENGTH`; an unknown outcome is an error.
- **Size:** at 60 minutes a day, roughly 60 attempts at about 200 bytes each is about 4 MB a year. Cap at the newest 20,000 attempts, dropping `correct` ones first. That keeps the file well under `MAX_IMPORT_BYTES` (20 MB).
- **`mistakes` occasion** attempts never touch memory, history, or the plan. They exist so "Try a similar problem" can show a run history.
- **History stays as is.** `HistoryEntry` remains the planner's record; `attempts` is the learner's record. A set-aside writes an attempt and no history entry.
- **`withoutSelfReport`** is unaffected. Set-asides are not self-reports of knowledge, because they never credit anything; this needs a test.

Engine and model changes:
- `packages/mastery/src/grade`: add `status: 'correct' | 'wrong' | 'unreadable' | 'problem-error'` to `GradeResult`. Parse failures in `gradeExact`, `gradeNumeric`, and `gradeExpression` return `unreadable`; `problemError` returns `problem-error`. `correct` stays, for compatibility.
- `content/src/problem.ts`: `grade` passes `status` through and returns the misconception's index.
- `sims/mastery/src/model/practice.ts`: `PracticeState.results` becomes `('correct' | 'wrong' | 'set-aside')[]`, with an `asides` count. `answer` takes an outcome; `set-aside` adds 1 to `attempts` and leaves `streak` unchanged. `outcomeOf` is unchanged, so set-asides count toward `maxProblems`. A `setAsideAllowed(state, budget)` helper holds the budgets.
- `learner.ts`: `recordAttempt(p, attempt)`, `setAsideToday(p, now)` for the daily cap, and review and quiz completion that takes per-problem outcomes.

## Phased build plan

Each phase is one reviewable change with its own tests and a headless browser check, re-run from the scripts used for this pass.

### Phase 0: fixes with no data change
- Remove the placement "Compare with the solution below" text; show "Not right: the answer is X" in placement.
- Move the result block above the buttons, scroll it into view, use full-size answer text, use "Incorrect" with an icon, and style gave-up as neutral.
- Do not grade unreadable input; add the confirmation for preview notes.
- Add the Enter guard (500 ms) and focus on the result heading after a wrong answer.
- Rename "Show me how (counts as a miss)".
- Treat `problemError` as not the learner's miss (replace the problem).
- Add text labels on choice results; add the short assertive announcement.
- **Tests:** `ProblemCard.test.tsx`: unreadable Enter records nothing and keeps focus in the field; note input shows the confirmation and Check anyway grades; a double Enter within 500 ms does not call `onDone`; after a wrong answer the heading has focus and the correct answer is in the DOM above Continue; placement mode shows the correct answer and no "solution below" text; the live region text is exactly "Incorrect. Your answer 10. Correct answer 5." The headless script asserts that at 390 x 844 the correct answer's box is inside the viewport after Check.

### Phase 1: engine and progress version 3
- `GradeResult.status`; misconception index from `grade`.
- `Attempt` and `GraderReport` types, migration 2 to 3, import validation, and the size cap.
- `practice.ts` outcomes with set-aside, plus budgets.
- **Tests:** grader tests that every parse failure is `unreadable` and every `problemError` is `problem-error` (the existing graders' test files); migration tests (a v2 file imports to v3 with empty arrays; a v3 round trip; bad attempts give exact error paths; the cap drops correct attempts first); `practice.test.ts`: a set-aside keeps the streak, counts toward `maxProblems`, and is refused once the budget is spent; a property test that no sequence of set-asides and wrong answers ever reaches `mastered` without `correctInARow` consecutive correct outcomes; `withoutSelfReport` is unchanged by attempts.

### Phase 2: the slip path, reports, and result screens
- Record every attempt from `ProblemCard` through the runners.
- "I mistyped" with the confirmation sheet, budgets, the misconception exclusion, and the fresh-problem replacement in practice, review, quiz, and placement.
- "My answer should be accepted" and the Grader reports list in Progress.
- Review and quiz end screens; Today labels "3 of 4 right" and "Missed (1 of 2)".
- Placement end review table.
- **Tests:** `views.test.tsx`: a set-aside in a review replaces problem 2 and the review passes on two right answers; a set-aside in placement re-asks the same topic and does not rule it out; a misconception match shows no "I mistyped"; the daily cap of 5 holds across flows; a report adds a report and leaves memory and history unchanged; the quiz end screen lists every item. `learner.test.ts`: review and quiz completion with set-asides matches the memory effect of the measured answers only.

### Phase 3: Mistakes
- The `#/mistakes` route and view, filters, regenerate from generator and seed, changed-generator detection, unscored "Try a similar problem", and "Mark as understood".
- **Tests:** a route test; a view test that a regenerated problem matches the stored reference; a changed reference shows the notice; "Try a similar problem" never changes memory, history, session, or `learnedSinceQuiz` (a deep equality check before and after).

### Phase 4: content
- Audit every generator (11 topic files today): the last solution step states the final answer in the asked form; every misconception has a `why`; misconception text does not just restate the answer.
- **Tests:** `content.test.ts`: for every generator over many seeds, the last solution step contains `answerText`; every misconception's `why` is non-empty and differs from the solution; a generated misconception response is graded `wrong`, never `unreadable` (so the exclusion rule always sees it).

### Phase 5 (optional): repeat the missed skill
- After a miss in practice, the next problem comes from the same generator with a new seed.
- **Tests:** `practice.test.ts`: the generator sequence after a miss; coverage still reaches every generator in a run without misses.

Pause for the owner's review after phase 0 (visible fixes), after phase 1 (the data format), and after phase 2 (the slip rule in use).

## Open questions for the owner

1. Budgets: 2 per practice run, 1 per review, 1 per quiz, 2 per placement, 5 per day. Keep them?
2. Placement: reveal the answer during the test (recommended), or show correctness only and the answers at the end?
3. If a grader report turns out to be right and the grader is fixed, should the old attempt be re-graded? Re-grading changes past memory; the proposal leaves it out.
4. Should "Try a similar problem" in Mistakes ever count, for example as an early review of a due topic? The proposal says no, per decisions 11 and 18.

## Mockups

Static HTML using the app's tokens, rendered in headless Chrome. All files are in `mastery/design-pass-2/` (gitignored):

| Mockup | HTML | PNG (light and dark) |
|---|---|---|
| Wrong answer in practice | `m1-practice-wrong.html` | `png/m1-practice-wrong-{1280,390}-{light,dark}.png` |
| The mistyped flow, and when it is not offered | `m2-mistyped.html` | `png/m2-mistyped-{1280,390}-{light,dark}.png` |
| Review and quiz feedback and results; choice labels | `m3-review-quiz.html` | `png/m3-review-quiz-1280-{light,dark}.png` |
| Placement feedback and the end review | `m4-placement.html` | `png/m4-placement-{1280,390}-{light,dark}.png` |
| Mistakes list | `m5-mistakes.html` | `png/m5-mistakes-1280-{light,dark}.png` |

Screenshots of the current app: `mastery/design-pass-2/reproduction/`.

## Decisions (owner, 2026-10-04)

The owner approved this pass and the four recommendations in [Open questions for the owner](#open-questions-for-the-owner):

1. **Set-aside budgets as proposed:** 2 per lesson practice run, 1 per review, 1 per quiz, 2 per placement test, and at most 5 per day across everything.
2. **Placement shows right or wrong and the correct answer during the test**, after each question, with no worked solution until the end review.
3. **No automatic re-grading of old attempts** when a grader report proves right. If a grader bug is fixed, a one-off migration may correct the affected attempts later, as its own reviewed change.
4. **"Try a similar problem" never counts.** It never changes memory, history, the streak, or the plan (decisions 11 and 18).
