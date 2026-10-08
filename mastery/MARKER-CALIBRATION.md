# Marker calibration

Dated 2026-10-08. How the proof marker is checked before it is trusted, as rule 7 of [HOW-A-TOPIC-WORKS.md](HOW-A-TOPIC-WORKS.md) asks. The marker is an AI supervision outside the app (a Claude Code session running `/supervise`), so the checks are a harness around it: a packet generator, one results format, and a scorer.

## What is checked

1. **Known quality.** Each calibration case is a write-up of known quality for a real supervision problem in the app: a model answer, which must be marked 14 or more out of 20, and a copy of it with one deliberate flaw, which must be marked below 14.
2. **Official mark schemes.** Where a problem cites an official STEP mark scheme (`official` on the problem, one of `MARK_SCHEME_DOCS` in `content/src/cambridge.ts`), the supervision block names it under `FOR THE MARKER ONLY` and tells the supervisor to mark against it. The app never shows that section: "Show the copied text" replaces it with one line.
3. **People agree with it.** Later, a person marks about 15 of the real written proofs, and the two sets of marks are compared.

The marker's instructions (`SUPERVISOR_RULES` and the rubric in `sims/mastery/src/model`, and `.claude/commands/supervise.md`) are adjusted until both checks pass.

## Files

| File | What it is |
| --- | --- |
| `scripts/calibration/cases.json` | The cases: id, problem key, `expect` (`high` or `low`), `origin`, `pair`, `flaw` (low cases only), and the write-up. |
| `scripts/calibration/frame.json` | Generated. The app's supervisor instructions, rubric, result format, and each case problem's statement and marker-only lines. |
| `scripts/lib/calibration.mjs` | The harness: packets, result reading, the results format, and scoring. |
| `scripts/marker-calibration.mjs` | The command line. |
| `scripts/calibration/packets/` | Generated blocks, one per case. Not committed. |

`frame.json` is written by the app's own tests, so a calibration block is the block the app copies, apart from the calibration rule, the case line, and an empty history. A test fails when the frame is stale. To write it again after changing the instructions, the rubric, or a case's problem, run this in `sims/mastery` and review the diff:

```sh
LEARNHUB_WRITE_FRAME=1 npx vitest run src/model/calibration.test.ts
```

## Run a calibration

1. Write the blocks. Each case's nonce is a hash of its id, so the same cases always give the same blocks.

   ```sh
   node scripts/marker-calibration.mjs packets
   ```

2. For each file in `scripts/calibration/packets/`, start a fresh Claude Code session, run `/supervise`, and paste the block. The block's first instruction tells the marker the write-up is final, so it marks at once. Save each printed result block to a text file, for example `scripts/calibration/results/2026-10-08-ai/<case id>.txt`.

3. Collect the marks into one results file.

   ```sh
   node scripts/marker-calibration.mjs collect --kind ai --name "supervise.md of 2026-10-08" \
     scripts/calibration/results/2026-10-08-ai/*.txt > scripts/calibration/results/2026-10-08-ai.json
   ```

4. Score it. The command exits 0 only when the marker is calibrated.

   ```sh
   node scripts/marker-calibration.mjs score scripts/calibration/results/2026-10-08-ai.json
   ```

## Compare with a person

1. Export progress from the app (You, Back up and move, Export progress file), and turn its imported supervision results into a results file:

   ```sh
   node scripts/marker-calibration.mjs from-progress --name "supervise.md of 2026-10-08" progress.json > ai.json
   ```

2. A person marks the same write-ups out of 20 with the rubric in the block, without seeing the AI's mark, and records them in the same format with `"kind": "human"`, one entry per write-up by its nonce:

   ```json
   {
     "format": "learnhub-marker-results/1",
     "marker": { "kind": "human", "name": "A. Supervisor", "date": "2026-11-02" },
     "marks": [{ "nonce": "K7Q2XMPA", "problem": "proof.direct/step00-q1-unit", "mark": 13 }]
   }
   ```

3. Compare. The command exits 0 only when the markers agree.

   ```sh
   node scripts/marker-calibration.mjs compare ai.json human.json
   ```

## The results format

A results file is JSON with `format` `learnhub-marker-results/1`, a `marker` (`kind` `ai` or `human`, a `name` saying who or which instructions, a `date` as `YYYY-MM-DD`), and `marks`. Each mark is a whole number from 0 to 20 with exactly one of `case` (a calibration case id) or `nonce` (a real supervision attempt; `problem` may be added for reading). The same format holds AI and human marks, on cases and on real write-ups.

## Thresholds

These are starting values, set in `scripts/lib/calibration.mjs`, and Albert's to change.

- **Calibrated:** every case marked, and every case in its band: each model answer at 14 or more, each flawed copy below 14. Rule 7 says the model answers "must score high" and the flawed copies "must score low", so one case out of band fails. The scorer also reports the mean mark of each band and the mean gap between a model answer and its flawed copy.
- **Agree with a person:** the same pass or fail on at least 80 percent of the write-ups both marked, and a mean difference (AI less human) within 2 marks. Pass or fail is what the app acts on, so it carries most of the weight; the mean difference catches a marker that is consistently harsh or generous.

## The cases so far

Eight cases on four problems, two of them with an official STEP mark scheme (STEP I 2012 Q1 and STEP I 2014 Q5, both in AM-GM). Every write-up has `origin` `reference`: written for this harness and checked by hand (the algebra verified by computation), not typed from an official solution. The flaw in each low case is one that a careful examiner treats as fatal: an argument from examples, a false divisibility claim, an assumed minimum, and a false inequality. Cases typed from the official solutions take `origin` `official` and a `citation`, and belong beside these.
