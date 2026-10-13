# The mastery app's design system

Dated 2026-10-13. Status: direction C ("Plate") chosen by Albert in the design pass, stage 2; built into the app in stage 3 (branch `design-pass`). This document is how future screens match. The tokens live in one file, [`sims/mastery/src/styles/tokens.css`](../sims/mastery/src/styles/tokens.css); every other value in the stylesheets reads from it.

## The idea

An interactive essay in the manner of Bartosz Ciechanowski, typeset like a Tripos paper. Ink on paper. Figures, definitions, and the map sit on tinted **plates** that break out of the reading column. The two named sets of a lesson (A and B) keep one colour each everywhere they appear, and pointing at one lights up every copy. The interface stays quiet so the maths is the loudest thing on the page.

## Colour

| Token | Light | Dark | Use |
|---|---|---|---|
| `--paper` | `#fcfcfb` | `#121417` | Page ground; the browser bar (`theme-color`) matches it |
| `--plate` | `#eff1f2` | `#1b1f24` | Plates: definitions, the map, the Now card, result blocks |
| `--plate-2` | `#e4e8ea` | `#252a30` | The map's dock, alternate bands, disabled buttons |
| `--ink` | `#1b1f23` | `#e5e8eb` | Text; the primary button |
| `--ink-2` | `#353c43` | `#c4cad1` | Secondary text that must stay strong |
| `--mute` | `#555d66` | `#9aa3ad` | Notes, times, labels (AA on paper, plate, and plate-2) |
| `--rule` | `#d9dde0` | `#2d3339` | Hairlines |
| `--rule-strong` | `#80888f` | `#69727c` | Field and outline-button edges (3:1) |
| `--green` | `#2a6a55` | `#7fc0a3` | Now, progress, links, mastered |
| `--green-soft` | `#dcebe3` | `#1d2e27` | Mastered fills, a right answer, the mastered moment |
| `--due` / `--due-soft` | `#855800` / `#f7ebcf` | `#e2b45c` / `#322a17` | Review due; confirmations |
| `--red` / `--red-soft` | `#b3261e` / `#f9e4e1` | `#f2857b` / `#3a1d1b` | Only what needs the learner: a miss's mark, an error, a costly action |
| `--set-a` / `--set-b` | `#b23c12` / `#1f5c9e` | `#f0915f` / `#82b3ee` | Named sets A and B in maths; `--set-b` is also the focus ring |

Rules:

- One accent (green) for state, never for decoration. Red marks the verdict of a miss, not the help around it: a result block is a neutral plate with a red mark in its heading.
- Every text and background pair meets WCAG AA in both themes. `design-tools/contrast.mjs` (scratchpad) measures every rendered text run on the real screens; see DESIGN-AUDIT.md for the latest run.
- The older role names (`--surface`, `--text`, `--accent`, `--cam`, `--scarlet`, ...) are aliases in tokens.css. New code uses the palette names above.

## Type

| Role | Face | Size (desktop / phone) | Notes |
|---|---|---|---|
| Display: a lesson's title | Libertinus Serif 400 | 52 / 42 px | Once per lesson, on its first section |
| h1 | Libertinus Serif 400 | 40 / 33 px | `--fs-h1`, tracking -0.01em |
| h2, a section's title | Libertinus Serif 400 | 27 / 24 px | `--fs-h2` |
| Reading | Libertinus Serif 400 | 19 / 18 px, leading 1.55 | `--fs-body`, measure 34rem |
| Lead | Libertinus Serif 400 | 21.5 / 20 px | A lesson's goal, a topic's summary |
| Interface | Libertinus Sans 400 and 700 | 16 px (15 to 15.5 for controls) | Buttons, labels, notes, times |
| Small labels | Libertinus Sans 700 | 14.5 px | Sentence case; never tracked capitals |
| Maths | Libertinus Math and Serif italic | the text's size | Display maths at 1.2em, definitions at 1.32em |
| Raw text to copy | `ui-monospace` | 13.5 px | Only the supervision block and calendar URL |

Rules:

- Two families, clearly distinct: serif for reading and headings, sans for everything the learner operates. No monospace costume: times and counts use the sans with `tabular-nums`.
- No eyebrows in tracked capitals. A small line above a title says where or when, in sentence case (`.ds-eyebrow`).
- KaTeX is remapped to Libertinus in `app.css`: letters in Libertinus Serif italic, operators and relations in Libertinus Math, at 1em (KaTeX's own 1.21em compensates for Computer Modern and is removed). Inline text-style fractions use a larger script size (0.8em) so their numerals stay readable. Display maths gets 24 px above and 16 px below.
- Fonts are self-hosted from `src/assets/fonts` (SIL OFL 1.1, `OFL.txt` beside them), split by `unicode-range` into Latin (about 24 kB each) and the rest, which downloads only when a page uses it.

## Space, radius, layout

- A 4 px grid: `--g1` to `--g8` = 4, 8, 12, 16, 24, 32, 48, 72. Tight inside a group, generous between groups, more space above a heading than below it.
- Radius: 6 px small controls, 8 px fields and segmented controls, 10 px plates (`--r`), 18 px sheets and dialogs, pills for action buttons.
- The reading column is 34rem. On a wide screen every lesson plate breaks out of it by `--bleed` (3.5rem) and pads by the same amount, so its text lines up with the column; on a phone every plate is the column's width with a 16 px inset. No kind of plate is wider than another.
- Phone first: a bar of tabs at the bottom (56 px targets, the home indicator inset below); from 900 px a left rail. Every fixed or sticky bar respects `env(safe-area-inset-*)`.

## Components

- **Buttons** (`.btn`, `.ds-btn`): one system. Primary: an ink pill, one per screen. Secondary: an outlined pill. Quiet: a text button (`.linklike`, `.ds-link`). **Costly** (`.btn-cost`): red text and a red-tinted outline with an icon, for an action that gives something up ("Show me the solution" stops a problem counting). Disabled buttons are a plate-2 pill with mute text, never a half-transparent primary.
- **Focus mode bar** (`.ds-fbar`): sticky; back on the left, search on the right; in a lesson the middle holds the **stepper** (the current section's name; opened, every section with ticks and "you are here") and one segment per section along the bottom edge. No counts.
- **Lesson header**: journey line, title, goal and why, time and More practice. Shown once, on the first section; later sections carry the title as a running head.
- **Plates** (`.lp`, `styles/screens/lesson.css`): definitions and theorems (`.amsdef`, `.amsthm`) with the plain-words gloss as a caption under a hairline, Check yourself, Where it breaks, worked examples, and Venn figures. One size system: the same width, padding, and a 15 px sans heading (`.lp-h`). A "why" opens into a tinted well.
- **Folded sections** (`.ds-disc`, `ui/Disclosure.tsx`): You and Settings fold each section to its heading; on a phone only the first starts open.
- **Result block**: a plate under the answer, in labelled parts: the verdict (mark, nudge, the answer as read, what it does to progress), then Hints, then the actions (the next hint as a secondary button; the solution as a costly one, set apart), then supervision.
- **Supervision**: the round trip is a numbered sequence: write, copy, paste the result back.
- **Mastered moment** (`.mastered`): when an imported result makes a topic mastered, a green plate with the mastered mark, "Mastered", and the topic's name, above the import summary.
- **Map**: a plate with the graph, the controls and key docked under it, and the key's explanation as its caption (statuses with no topics are named there, not drawn). On a phone a chosen topic opens as a sheet over the map's lower edge, in the page's flow, with clear room left under the caption. "To master it" folds to one line with "more".
- **Rows** (`.ds-li`, `.ruled`, `.book-steps`): hairline-separated; the row is the target; the actionable row is weighted, waiting rows recede.

## Motion

- Durations: 120 ms press, 160 ms small popovers (the stepper), 200 ms dialogs, 260 ms sheets. Easing: `--ease-out` `cubic-bezier(0.23, 1, 0.32, 1)`; `--ease-drawer` for sheets. Nothing over 300 ms.
- Transform and opacity only. Entrances use `@starting-style` from an already-visible state (scale 0.97 to 0.98, 4 to 16 px), never from zero.
- No motion on frequent or keyboard actions: the palette, tab switches, Check, Next, and hints appear instantly. Buttons get a 0.97 press scale as feedback.
- One authored moment: the mastered mark settles in once.
- `prefers-reduced-motion`: movement is removed; colour and opacity changes stay.

## Accessibility floor

- WCAG AA contrast for every text pair in both themes, measured on the real screens.
- Touch targets at least 44 px on a touch screen (inline links in running text are exempt); 24 px minimum with a fine pointer. `design-tools/contrast.mjs` reports both.
- A single 2 px focus ring in `--set-b`, offset 2 px. Focus never moves to an answer field on arrival on a phone or on a page with several problems.
- `theme-color` follows the chosen theme, not only the device's.
