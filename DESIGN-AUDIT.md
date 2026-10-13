# Design audit, stage 1 (before)

Dated 2026-10-13. Branch `design-pass`. Scope: visual and interaction design of the mastery app (`sims/mastery`). Content, lesson text, problem data, mastery rules, grading, and sync are out of scope and unchanged.

> DEGRADED: single-context (no sub-agent tool in this session; the impeccable engine and detector are not installed, so the written audit and critique checklists were applied by hand to screenshots and source).

## Method

- Built with `npm ci && npm run build`; served `site/` from `scripts/serve.mjs` on 127.0.0.1:4319.
- Headless Chrome 156 through Playwright (scratchpad install, fresh context per shot, no real sign-in, sync off). Clock fixed at Tue 13 Oct 2026, 11:05 am, America/New_York.
- Seeded learner, built with the app's own model functions (`startLearner`, `completeLesson`, `masterTopics` from `src/test/ready.ts`, `ensureSession`, `saveStory`, `saveDay`): both default courses, 8 topics learned (5 mastered, 3 with the gate open), "Independent events" learned and waiting on its gate, a day log (woke 8:30 am, first block ticked), standup settings and four earlier standup entries.
- Viewports: 390 x 844 (mobile emulation, DPR 2) and 1280 x 860 (DPR 1), light and dark. Long screens are captured with the viewport grown to the page height, so fixed bars sit at the bottom as on a tall screen.
- Flows recorded at 390 wide: topic to lesson to practice to Cambridge problem to hint to write-up to supervision import to mastered (a 17/20 result block built from the copied packet's nonce, imported through Paste result), and the standup (typed update, submitted).
- Not tested: VoiceOver, a real phone keyboard with the docked keypad, the microphone path of the standup.

Shots: `design/shots/before/<screen>-<width>-<theme>.png`. Flows: `design/flows/before-<flow>-<theme>.webm`. Gallery: `design/gallery.html`.

## Scores

### Audit health (impeccable audit)

| # | Dimension | Score | Key finding |
|---|---|---|---|
| 1 | Accessibility | 2 | Inputs grab focus on mount (several per page); 11px tracked caps labels; 30 to 32 px controls |
| 2 | Performance | 3 | One 1.49 MB main chunk (440 kB gzip); a one-second clock re-render on Today |
| 3 | Theming | 2 | Two token systems and two button systems layered (`app.css` roles under `v4.css`); two reds; theme-color ignores the manual theme |
| 4 | Responsive | 2 | Lesson outline fills the first phone screen; map sheet covers the graph; problem meta table wraps at 390 |
| 5 | Implementation integrity | 2 | Shell follows design v4; problem and result components still speak the older system (serif result blocks, green primary, nested cards) |
| **Total** | | **11/20** | **Acceptable: significant work needed** |

### Heuristics (impeccable critique, Operate mode)

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 2 | Mastering a topic is announced as "a passed review" |
| 2 | Match with the real world | 3 | Tripos vocabulary fits; "steps", "sections", "lessons", "assignments" drift on one page |
| 3 | User control and freedom | 3 | Back exists everywhere, in four different forms |
| 4 | Consistency and standards | 2 | Two button systems, two result-block faces, three back styles |
| 5 | Error prevention | 3 | Reveal asks first; Show me the solution still has the same weight as Show the next hint |
| 6 | Recognition over recall | 3 | Outline and status words visible; status chips need a legend to decode |
| 7 | Flexibility and efficiency | 3 | Number keys, G, T, Cmd K palette |
| 8 | Aesthetic and minimalist design | 2 | Today and the planner repeat each item three or four times |
| 9 | Error recovery | 3 | "Not right yet" plus nudge and hints is good; the panel is overloaded |
| 10 | Help and documentation | 3 | Rules explained in place, often at paragraph length |
| **Total** | | **27/40** | **Acceptable** |

Cognitive load checklist: 4 failures (single focus, chunking, minimal choices on the map, progressive disclosure on Today), so high.

### Design specificity verdict

The shell is authored for this product: the arms, STIX Two for maths and reading, Plex Mono for times, Cambridge green for now and progress, hairlines, one ink primary. Below the shell, the problem, result, and supervision components come from an earlier, more generic system (bordered card in bordered card, tinted alert boxes, equal-weight outline buttons). Those screens could belong to any quiz app, and they are where the learner spends most time.

## Top 15 problems, ranked by impact

### 1. On a phone, the lesson's first screen is its outline, not the lesson

- **Shots:** `lesson-math-390-light.png`, `lesson-math-390-dark.png`, `practice-miss-390-light.png`; flow `before-mastery-light.webm` (0:08 to 0:15).
- **What is wrong:** Each section repeats the breadcrumb, the title, a Goal and Why table, the time estimate, More practice, and the full 8-item outline before the section starts. At 390 the section heading "The definition" lands about 660 CSS px down, so the first screen of every section holds no teaching. The Goal and Why table spends a 150 px label column at 390.
- **Why it matters:** The lesson is the product. A learner moving section to section on a phone scrolls past the same chrome eight times per lesson.
- **Rule:** Operate mode, "the data the visitor reads first"; cognitive load, progressive disclosure and single focus; web-interface-guidelines, content handling at small widths.

### 2. Mastering a topic has no moment

- **Shots:** `supervision-imported-390-light.png`, `supervision-imported-1280-dark.png`; flow `before-mastery-*.webm` (end).
- **What is wrong:** A 17/20 import that meets the gate shows one green sentence under the buttons: "Imported: 17/20 for Where independence was used. That is 14 or more, so it counts as a passed review of Independent events." The word "mastered" does not appear. The packet textarea stays open above it. The topic flips to Mastered only on the map.
- **Why it matters:** This is the end of the topic loop, the peak the whole design is built toward. Peak-end rule: the learner remembers the experience by this moment, and it reads like a log line.
- **Rule:** Nielsen 1, visibility of system status; critique, emotional journey (peak-end); design v4, Cambridge green for progress.

### 3. The "Not right yet" panel floods error colour over five jobs

- **Shots:** `cambridge-miss-hint-390-light.png`, `cambridge-miss-hint-1280-dark.png`, `practice-miss-390-light.png`.
- **What is wrong:** One error-tinted block holds the verdict, the nudge, the echoed answer, when it comes back, the hints (an unlabelled "1." list running straight on from the return date), Show the next hint, Show me the solution, a divider, a supervision prompt, a textarea, and Copy for supervision. Three outline buttons stack with equal weight, so Show me the solution (which permanently stops the problem counting) looks the same as the next hint. In dark, the whole block is a maroon slab.
- **Why it matters:** Scarlet is meant for "only what needs the learner". Here it colours the help as well as the miss, and the costly action is not distinguished from the free one.
- **Rule:** Design v4 colour rule; cognitive load, chunking and minimal choices; Nielsen 5, error prevention; frontend-design, "visual structure is information".

### 4. Today and the day planner repeat the same items three or four times

- **Shots:** `day-planner-1280-dark.png`, `day-planner-390-light.png`, `today-390-light.png`.
- **What is wrong:** One lesson appears in Later today, in the whole-day timeline, in Up next, and in Today's session. With the whole day open, Today is about 5,100 px tall at 1280. In the timeline every item is an underlined link, and each quiz is a comma-joined list of six topic names, so a 45-minute block reads as a paragraph of links.
- **Why it matters:** The planner is meant to answer "what now, what next". Repetition makes the learner reconcile four lists, and the link wall removes any hierarchy within a block.
- **Rule:** Nielsen 8; cognitive load, the wall of options and the visual noise floor; web-interface-guidelines, content handling (long content).

### 5. KaTeX typesetting: wrong face, too large inline, tiny fractions, tight display spacing

- **Shots:** `lesson-math-390-light.png`, `lesson-math-1280-light.png`, `lesson-math-390-dark.png`, `practice-miss-390-light.png`, `map-topic-390-light.png`.
- **What is wrong:**
  - **Face pairing:** maths is set in KaTeX_Main and KaTeX_Math (Computer Modern) inside STIX Two Text. `--font-math` declares STIX Two Math in `tokens.css`, but nothing applies it to KaTeX. Computer Modern's thin hairlines and wider italic sit visibly lighter than STIX beside it.
  - **Size:** KaTeX sets `.katex { font-size: 1.21em }`; `app.css:86` multiplies by 1.1, so inline maths is 1.33x the text, and prompts (`app.css:88`, 1.3) reach 1.57x. P(A ∩ B) has a larger x-height than the words around it.
  - **Baseline and leading:** the oversized inline boxes push lines apart wherever maths appears ("In general, the share of B's outcomes..." in the definition section), so leading is uneven within a paragraph.
  - **Inline fractions:** text-style `\frac` renders numerals at roughly 8 CSS px at 390 ("1/12", "1/2 × 1/6" in the plain-words line), below legibility.
  - **Mixed faces in one line:** the "In plain words" line is IBM Plex Sans in muted grey with serif maths inside, three faces and two weights in a line.
  - **Display spacing:** `.math-display .katex-display { margin: 8px 0 }` (`app.css:90`) leaves the definition's display equation tight against the sentence above and the plain-words line below, with no more space than a line break.
- **Why it matters:** The design brief is "typeset like a Tripos paper". Maths is the content; mismatched faces and sizes are the most visible craft gap in the app.
- **Rule:** impeccable typeset (face pairing, scale); frontend-design, "a clear type scale following The Elements of Typographic Style"; design v4, STIX Two for maths.

### 6. The map is hard to read and its legend overloads the first decision

- **Shots:** `map-topic-1280-light.png`, `map-topic-390-light.png`, `map-topic-390-dark.png`.
- **What is wrong:** Seven status chips use four border treatments (solid, thick, dashed, dotted) and three fills to encode status, plus a course select, Graph and List, Show all connections, and zoom controls: about 13 controls before the graph. Unselected nodes fade to 35 % (`app.css:343`), labels clip at the node edge, and edges cross labels. On a phone the topic sheet covers the graph almost entirely.
- **Why it matters:** The map is the one place that shows how the course fits together. Faded, clipped nodes and a legend the learner must decode make it a puzzle.
- **Rule:** Cognitive load, ≤4 options per decision point; Nielsen 6; web-interface-guidelines, content handling (truncation).

### 7. Two design systems layered: buttons, tokens, focus, and reds disagree

- **Shots:** `cambridge-miss-hint-390-light.png` (serif result block) against `practice-miss-390-light.png` (sans result block); `supervision-writeup-1280-light.png`; `standup-1280-light.png` (grey Play button).
- **What is wrong:**
  - `app.css` keeps role tokens and a green `.btn-primary`; `v4.css:16` to `18` overrides it with an ink primary. Both rule sets ship.
  - Two `:focus-visible` rules: `app.css:26` (1 px, offset 3) and `v4.css:13` (2 px, offset 2).
  - Two reds: `--scarlet #a8201c` and `--error #a8321f`.
  - `.btn:disabled { opacity: 0.5 }` turns the ink primary into a mid-grey that reads as a third button style (Check before typing; Play the standup while muted).
  - The Cambridge result block is set in STIX Two (serif UI text and buttons); the practice result block is in Plex Sans.
- **Why it matters:** The learner sees the same action drawn two ways. Drift like this multiplies with every new screen.
- **Rule:** Audit, theming (inconsistent tokens) and implementation integrity; Nielsen 4.

### 8. Answer inputs take focus on mount, several per page

- **Shots:** flow `before-mastery-light.webm` (Cambridge stage); source `src/ui/ProblemCard.tsx:208`.
- **What is wrong:** Each ProblemCard focuses its input when it mounts. The Cambridge stage mounts three auto-checked cards, so the last one wins focus (Problem 2's ring shows while Problem 1 is at the top). On a phone this opens the keyboard and the docked keypad on arrival.
- **Why it matters:** Focus jumps to an arbitrary problem, the keyboard covers half the screen, and screen readers start mid-page.
- **Rule:** Web-interface-guidelines, "autoFocus sparingly, desktop only, single primary input; avoid on mobile".

### 9. Back and close come in four styles; the phone search button floats over headers

- **Shots:** `lesson-math-390-light.png` ("← Map", mono, grey), `course-chapter-390-light.png` ("← Back to the contents", sans, green, underlined), `map-topic-390-light.png` ("Close" outline button), `today-390-light.png` (search icon on the clock row).
- **What is wrong:** The same action has four looks and three vocabularies. On phone the search button is absolutely placed at the top right and shares a row with the clock on Today and with the title on Map and the chapter page.
- **Why it matters:** Back is the most used control after Next; it should be found without reading.
- **Rule:** Nielsen 3 and 4; cognitive load, inconsistent pattern.

### 10. The primary action on the standup is last and lowest

- **Shots:** `standup-1280-light.png`, `standup-390-light.png`; flow `before-standup-light.webm`.
- **What is wrong:** The calendar disclosures sit above the content, then six classmates' updates, then Albert's slot at about y = 1,350 at 1280 and much further on a phone. Play the standup is disabled while read aloud is muted (`Standup.tsx:120`) and renders as a 50 % grey primary; the only explanation is the green Unmute link beside it. Classmate bios are 12 px muted sans between serif names and serif updates.
- **Why it matters:** The screen exists for one action, giving the update. It is reached by scrolling past everything else, every weekday.
- **Rule:** Operate mode, task first; cognitive load, single focus; Casey (mobile) persona, primary action in the thumb zone.

### 11. Supervision controls are scattered and the packet shows marker-only headings

- **Shots:** `supervision-writeup-1280-light.png`, `supervision-writeup-390-dark.png`, `supervision-imported-390-light.png`.
- **What is wrong:** Copy for supervision (button), Show the copied text (link), Paste result (button on its own row), Select all (button) sit in different rows and weights, each preceded by a sentence of instructions. The write-up textarea has no maths preview, so a learner writing (5/6)^3 sees raw ASCII while the problem above is typeset. Opening Show the copied text displays the packet, including the line "OFFICIAL SOLUTION (for the supervisor only): ..." to the learner. Per `officialLines` in `src/model/supervision.ts`, only a citation follows, so nothing leaks, but the learner reads a line addressed to someone else in a monospace wall with no structure.
- **Why it matters:** This is a three-step round trip (write, copy, paste back). Its steps should read as a sequence, and the learner should not see text addressed to the marker.
- **Rule:** Cognitive load, one thing at a time; frontend-design, "visual structure is information" (a real sequence earns sequence styling); Nielsen 5.

### 12. Labels are 11 px tracked capitals, everywhere

- **Shots:** `today-390-light.png` (TUESDAY, OCTOBER 13; LATER TODAY; NOW · 10:15 AM to 11:45 AM), `supervision-imported-390-light.png` (THIS TESTS, FROM THIS LESSON, BUILDS ON), `standup-1280-light.png` (STANDUP · TUESDAY, YOUR STANDUP), `course-chapter-390-light.png`.
- **What is wrong:** `.ds-eyebrow`, `.ds-tag`, `.ds-num`, `.ds-su-label`, and the problem meta table use `500 11px` Plex Mono, uppercase, 0.1 to 0.12 em tracking, in `--mute`. Most headings carry one. The problem meta table's 150 px label column forces two-line values at 390.
- **Why it matters:** Design v4 pins Plex Mono for labels, so the face is right; the caps, tracking, and 11 px size make them harder to read and give every block the same template chrome, so labels stop carrying information.
- **Rule:** Frontend-design, "tracked-out ALL-CAPS eyebrow above every heading" is a template tell; audit, accessibility (text size); typography floor of 12 px.

### 13. Today's clock ticks every second, and time formats drift

- **Shots:** `today-1280-light.png`, `today-390-light.png`, `standup-1280-light.png`.
- **What is wrong:** The header clock shows seconds ("11:05:00 am") and re-renders every second (`src/ui/views/Today.tsx:73`). The Now card writes "10:15 AM to 11:45 AM" in capitals while every other time is "10:00 am". The streak, week hours, and Shabbat times sit in a right column at 1280 that has no counterpart at 390.
- **Why it matters:** A seconds counter is constant peripheral motion on a study screen; mixed time formats break the approved 12-hour style.
- **Rule:** Web-interface-guidelines, animation (non-essential motion); Nielsen 4; the 12-hour clock rule (lowercase am and pm).

### 14. The chapter list gives every row the same weight

- **Shots:** `course-chapter-390-light.png`, `course-chapter-1280-dark.png`, `course-book-390-light.png`.
- **What is wrong:** "needs earlier steps" repeats on 8 of 9 rows at the same size and colour as the one actionable "review due". Status is a 6 px ring that differs only by colour. The page counts "4 sections", "1 of 9 steps learned", "9 written", and calls the groups Assignments. Previous and Next are muted text, Next right-aligned and wrapping to two ragged lines.
- **Why it matters:** The learner opens a chapter to find what to do next. The actionable row should stand out, and one noun should count the units.
- **Rule:** Cognitive load, visual noise floor; Nielsen 2 and 4; Sam (accessibility) persona, meaning by colour alone.

### 15. Small targets and a theme-color that ignores the chosen theme

- **Shots:** `map-topic-390-light.png` (Close), `standup-390-light.png` (Type it instead, record disclosure); source `index.html`.
- **What is wrong:** `.btn-small` is 30 px tall (`app.css:41`); `.ds-su-record > summary`, `.ds-chs .book-opt summary`, and `.ds-flag-form input` are 32 px; `.ds-codetag` is 11 px text used as a control. `index.html` sets theme-color by `prefers-color-scheme` only, so choosing Dark on a light system leaves a light browser bar, and the light value `#f7f6f2` does not match `--bg #fafaf8`.
- **Why it matters:** These are touch screens first ("Mac first, phone too"). A mismatched theme bar frames every dark screen in light chrome.
- **Rule:** Audit, responsive (targets under 44 x 44); web-interface-guidelines, dark mode and theming (theme-color matches the page background).

## Positive findings

- The shell matches design v4: left rail with number keys, bottom tabs on a phone, focus mode for lessons, Cmd K palette, skip link.
- `AnswerInput` sets `autocomplete="off"`, `spellcheck={false}`, and an `inputMode` per answer kind; the keypad keys are 44 px with `touch-action: manipulation`.
- Text colours were tuned to meet AA on paper (`--mute #686f6b`); reduced motion is honoured on the standup and story.
- "Not right yet" with a nudge, hints one at a time, and a confirmed reveal is the right model; the problem lies in presentation, not behaviour.

## Recommended next steps (impeccable commands)

1. **[P1] `/impeccable layout`:** lesson header and outline collapse on phone (1); one result block structure (3); planner deduplication (4); standup slot first (10).
2. **[P1] `/impeccable typeset`:** KaTeX face, size, fraction style, and display spacing (5); label scale (12).
3. **[P1] `/impeccable delight`:** the mastered moment (2).
4. **[P1] `/impeccable extract`:** collapse the two token and button systems (7).
5. **[P1] `/impeccable harden`:** focus on mount (8); targets and theme-color (15).
6. **[P2] `/impeccable clarify`:** back styles (9); chapter row weight and units (14); supervision sequence (11); time formats (13). Wording changes need Albert's approval under APP-LANGUAGE.md.
7. **[P2] `/impeccable distill`:** map legend and controls (6).
8. **`/impeccable polish`** last.

# Stage 3 (after): direction C, "Plate"

Dated 2026-10-13. Albert chose direction C. The system is documented in [design/DESIGN.md](design/DESIGN.md); its tokens are in `sims/mastery/src/styles/tokens.css` (colour in both themes, the type scale, the 4 px grid, radii, motion) and its fonts in `src/styles/fonts.css` (Libertinus Serif, Sans, and Math, self-hosted and subset, SIL OFL in `src/assets/fonts/OFL.txt`).

Ownership for the finish: this section covers the shell, the lesson, the map, practice and Cambridge problems, supervision, the standup, and the shared stylesheets (tokens, fonts, app.css, v4.css). Today and the planner, the course overview, Admission, You, Story, the gym, and the timed paper were restyled by separate agents in `src/styles/screens/`; their audit rows below say so.

**Final status (2026-10-13, merged build):** fixed all 15. Nothing deferred: map edges no longer cross labels, Course's headings descend in order, and the Today restructure closed its target sizes.

After shots: `design/shots/after/<screen>-<width>-<theme>.png` for the 11 stage-1 screens plus Admission, You, Story, the gym, the timed paper, and the palette (390 and 1280, light and dark, seeded learner, fixed clock). Flows: `design/flows/after-<flow>-<theme>.webm`. Both are in `design/gallery.html`.

## The 15 problems

| # | Problem | Status | What changed, or why not |
|---|---|---|---|
| 1 | Lesson's first phone screen is its outline | Fixed | The header (journey, title, goal and why, time, More practice) shows once, on the first section; later sections carry the title as a running head. The outline is a stepper in the focus bar (current section's name; opened, all sections with ticks and "you are here"), with the segments along the bar's edge. "Recommended next" still shows on every section when a supervisor named a gap. |
| 2 | Mastering a topic has no moment | Fixed | When an imported supervision result makes a topic mastered (read with the existing `isMastered`, before and after), a green plate with a mastered mark, "Mastered", and the topic's name sits above the import summary; the mark settles in once (260 ms, none with reduced motion). The Cambridge stage's "Gate met" line is a green plate. Wording of the label needs Albert's approval (below). |
| 3 | "Not right yet" floods error colour over five jobs | Fixed | The result block is a neutral plate in labelled parts: the verdict (red mark and heading only, the nudge, the answer as read, when it comes back), Hints, the actions, then supervision. "Show the next hint" is a secondary button; "Show me the solution" is a costly action (red outline and an icon), set apart on the right (full width on a phone). The resting view uses the same parts. |
| 4 | Today and the planner repeat each item | Fixed | Today restructure (approved 2026-10-13): one "Plan from now" control at the top; the bottom section is gone; leftovers and the ladder rung are timeline rows; under 900 px a block folds to its first item plus "N more"; the week row folds. Today at 390: 3851 to 1962 px. |
| 5 | KaTeX face, size, fractions, display spacing | Fixed | KaTeX remapped to Libertinus (letters in Serif italic, operators in Math) at 1em; inline text-style fractions at 0.8em script size; display maths 24 px above and 16 px below, 1.2em (1.32em in a definition); the plain-words gloss is serif, one face with its maths. Residual: a full stop or colon after inline maths can still wrap to the next line (content). |
| 6 | Map hard to read, legend overloads the first decision | Fixed | The map is a plate; course, view, connections, and zoom are docked under it with the key (swatches drawn like the nodes, only for statuses on the map); the key's explanation is the caption, which also names statuses with no topics. Faded nodes keep AA labels. On a phone the topic is a sheet in the page flow over the map's lower edge, leaving clear room under the caption; "To master it" folds to one line with "more". Edges no longer cross labels: the node boxes are masked out of the edge layer (`views/MapView.tsx`, rendering only), so an edge runs from one box border to the next and never shows through a faded box. |
| 7 | Two design systems layered | Fixed | One token file; one button system (ink pill, outlined, plain, costly); one focus ring (2 px, `--set-b`); one red; disabled buttons are a plate-2 pill, not a half-transparent primary; result blocks share one face. |
| 8 | Answer inputs take focus on mount | Fixed | On arrival, focus goes to the answer only for a single card with a fine pointer; moving to the next problem still focuses it. Several cards on a page, or a phone, never get focus on mount. |
| 9 | Back and close in four styles | Fixed for the shell, lesson, and map | One back: an arrow icon and the place name (focus bar) or a chevron and the label (`BackLink`); close is a round icon button; the phone's search sits in a reserved top strip, never over a heading. |
| 10 | Standup's primary action last and lowest | Fixed | Albert's slot, a plate, is now first, by his approval (2026-10-13). A "Your update" button in the controls row still jumps to and focuses it. |
| 11 | Supervision controls scattered | Fixed | The round trip is a numbered sequence: write-up, copy, paste the result back. The write-up has a typeset maths preview under the box (approved 2026-10-13). "Show the copied text" drops the head lines addressed to the supervisor (`withoutMarkerOnly`); the copied text keeps them. |
| 12 | 11 px tracked capitals everywhere | Fixed | All tracked-capital labels are now sentence case, 13.5 to 15.5 px Libertinus Sans; monospace is used only for raw text to copy. |
| 13 | Clock ticks every second; time formats drift | Fixed | The Today rewrite that removed the repeated lists (item 4) closes this item's Today work. "NOW · 10:15 AM to 11:45 AM" renders "Now · 10:15 am to 11:45 am" (CSS case, tested text unchanged). The header clock shows hours, minutes, and seconds by Albert's decision (2026-10-13), as `clockText` and its tests pin. |
| 14 | Chapter rows all the same weight | Fixed | The due row's status is bold amber with a larger ring; rows that wait on earlier lessons recede (title in ink-2, no underline, smaller note); Previous and Next are two plates; counts are tabular. One noun, "lesson", counts a chapter's units ("1 of 9 lessons learned"), approved 2026-10-13. |
| 15 | Small targets; theme-color ignores the chosen theme | Fixed | Every control is at least 44 px tall on a touch screen (checked by script; inline links in sentences are exempt), segmented controls included. `theme-color` follows a chosen theme (`model/theme.ts` sets both tags to the page's `--paper`), and the light value matches the page. |

## Accessibility checks (after, 2026-10-13)

- **Contrast** (`design-tools/contrast.mjs` extended to the real app: 11 stage-1 screens plus the first lesson section, the open stepper, the list map, Admission, Story, You, the gym, the glossary, and the palette; 390 and 1280; light and dark; every rendered text run, disclosures opened): 50 distinct text and background pairs, **0 failures**. Lowest light: 5.18:1 (`#2a6a55` on `#dcebe3`, a chip); lowest dark: 5.55:1 (`#9aa3ad` on `#322a17`, a faded map node). Not measured: the story player's scenes and the two documents (their own palettes) and disabled buttons (exempt).
- **Touch targets**: after fixes, the remaining flagged items were list links in the planner at 1280 (fine pointer, 24 px floor applies) and links stretched over their 44 px row by `::after` (the row is the target). The checker now applies 44 px on coarse pointers and 24 px on fine ones.
- **Lighthouse accessibility, before** (stage-1 build, seeded learner, headless Chrome with a temp profile, Lighthouse 12, no throttling): Today 100 / 100 (mobile / desktop), Course 98 / 98 (`heading-order`), Chapter 100 / 100, Map 96 / 96 (`target-size`), Lesson 100 / 100, Standup 100 / 100, You 100 / 100, Admission 100 / 100. Desktop runs also flag `label-content-name-mismatch` (the rail's links). A separate run without the seeded learner scored 100 everywhere. Practice (`#/more/...`) scored 100 / 100 before (commit bd8b454).
- **Lighthouse accessibility, after** (merged build, same method): Today **96 / 96** (`target-size`, a regression from 100), Course 98 / 98 (`heading-order`, unchanged), Chapter 100 / 100, Map **100 / 100** (up from 96), Lesson 100 / 100, Practice 100 / 100, Standup 100 / 100, You 100 / 100, Admission 100 / 100. Desktop runs still flag `label-content-name-mismatch` (the rail's links). Map, Practice, You, and Admission were run on the build just before the last Today, standup, and supervision rebuild (that rebuild touched shared CSS); the rest on the final build.
- **Today's regression, cause:** the target checker on the final build flags the planner's "Woke at" selects (16 x 44 and 22 x 44 px wide), the timeline's Standup and Gym links at 390 (52 x 43, 31 x 43), and every timeline list link at 1280 (22 px tall, under the 24 px floor). Handed to the Today restructure pass, which replaces this part of the screen.
- **Course and Map, fix pass (2026-10-13):** Course's term names were `h3` under the page's `h1` with no `h2`; they are now `h2` (same text and style). Lighthouse: Course **100 / 100**, Map **100 / 100**. Contrast on Course and Map, both themes, 390 and 1280: 0 failures (Course 18 pairs, lowest 5.18:1 light, 6.48:1 dark; Map 22 pairs, lowest 5.42:1 light, 5.55:1 dark); 0 small targets.
- **Today, after the restructure (2026-10-13):** Lighthouse **100 / 100**; the target checker finds **0 small targets**. This closes the regression above.
- **Results, You, and Settings, fold merge (2026-10-13):** one fold component (`ui/Fold.tsx`) for every folded section; Results folds its sections under the summary (390: 2283 to 948 px on first view). Lighthouse mobile: Results 100, You 100, Settings 100.
- **Contrast, final build** (same script, all screens above, both themes, 390 and 1280): 52 pairs, **0 failures**; lowest light 5.18:1, lowest dark 5.55:1. Small targets: 28, all on Today (listed above); none elsewhere.

## Needs a logic change (ask Albert)

All eight items are settled (2026-10-13).

1. **Standup order**: put Albert's slot first, before the classmates. The meeting order (slot last) is a tested decision (`standup.test.tsx`). **Done (approved 2026-10-13).**
2. **Today's clock**: show minutes, tick each minute. `clockText` and its tests pin seconds. **Settled: Albert keeps hours, minutes, and seconds (2026-10-13).**
3. **Planner de-duplication**: which of Later today, the timeline, Up next, and Today's session to drop or merge. **Done (approved 2026-10-13).**
4. **Supervision packet view**: hide the "OFFICIAL SOLUTION (for the supervisor only)" line in "Show the copied text" (`withoutMarkerOnly` in `model/supervision.ts`). **Done (approved 2026-10-13).**
5. **Write-up maths preview**: typeset the learner's write-up under the box (new behaviour). **Done (approved 2026-10-13).**
6. **Map edges crossing labels**: route edges around nodes (`model/layout.ts`). **Done in rendering, no layout change (2026-10-13):** node boxes are masked out of the edge layer.
7. **Wording to approve** (APP-LANGUAGE.md): the new labels "Mastered" (the mastered moment), "Your update" (the standup jump button), "Hints" (the result block's part label), "None now: ..." (the map caption), and one noun for a chapter's units (sections, steps, assignments). **Approved 2026-10-13:** "Mastered", "Your update", "Hints", "None now: ...", and the noun "lesson".
8. **A and B linking on keyboard focus**: the named sets light up on hover; doing it on focus would need the maths to be focusable, which adds tab stops in every sentence. **Settled: hover only stays (Albert, 2026-10-13).**
