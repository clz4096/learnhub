# Cambridge-sourced lessons: design

Dated 2026-10-05. Status: approved by the owner on 2026-10-05. Steps 1 and 2 done; step 3 (supervision) built (2026-10-05), for review. Step 5, batch 2 (sixteen more topics from the batch 1 map, in schedule order), built 2026-10-05, for review; see `graph/reviews/cambridge-batch-1.md`, Build step 5. Batch 3 (the next sixteen, with lessons loaded on demand), built 2026-10-05, for review; see Build step 5, batch 3, in the same file. The formats, validation, and scheduling rules are in `sims/mastery/GUIDE.md`, Supervision.

## Goal

Teach the courses Math Academy style (the existing course app: short lessons, worked examples, practice whose typed answers the app checks automatically, mastery, spaced review), with the lessons and problems built from the Cambridge resources themselves: the STEP Support Programme, the Faculty and DPMMS course materials and example sheets, the Computer Laboratory course materials and supervision work, and past papers. Problems can be reworded or turned into variants; the resources are the source. Supervision happens in a Claude Code session.

Not a second Meridian: no cold-attempt timers, phase gates, or study-loop screens, and no self-marking (the learner never grades their own work). The app stays a teaching tool.

## Sources for this round (Probability and Discrete Mathematics)

Taken from the Meridian handoff (`~/Brainstorm/handoff/meridian-cambridge/links/`).

| Course | Sources |
|---|---|
| Probability | STEP Support Foundation Block 2 (assignments 5 to 8, including assignment 6: arrangements, probability, the prosecutor's fallacy) and the other foundation assignments with probability; Mixed STEP 1 Statistics; STEP 2 and STEP 3 Statistics modules (topic notes, questions, hints, solutions); IA Probability example sheets 1 to 4 (DPMMS, 2025-26); the Faculty schedules; Part IA past paper probability questions |
| Discrete Mathematics | CST Discrete Mathematics course notes and supervision work (2025-26 materials); CST past exam questions by topic; Book of Proof chapters on logic, proof methods, induction, and number theory; the TMUA Logic and Proof notes |

## How a topic is built

1. **Fetch and extract.** A script downloads each source PDF or page from its official URL into a local cache (`sources/`, gitignored), extracts the text, and records a manifest (URL, date fetched, file hash).
2. **Map to the graph.** Each source section and problem is mapped to topics in the shared graph. The graph is re-cut where a source teaches a topic differently. Every topic cites its sources precisely, for example "STEP Support Assignment 6, Preparation" or "IA Probability Example Sheet 1, Q3".
3. **Lesson.** The explanation is written from the source's notes (STEP topic notes, course notes), reworded for teaching, in the app's existing style (LaTeX, terms defined at first use).
4. **Worked examples.** Real Cambridge problems from the sources, worked in full. Every number is computed by code, as today.
5. **Practice, two kinds:**
   - **Variants:** auto-graded problem generators built from the structure of the Cambridge problems (same idea, new numbers), for the computational skills. Same checks as now (1,000 seeds, reference solver, misconceptions, Monte Carlo for probability).
   - **Cambridge problems:** the original problems themselves, reworded where needed. If the answer is a value or expression, it is auto-graded. If it is a proof or an explanation, the learner writes an answer and sends it to supervision.
6. **Answer checks.** Each Cambridge problem's answer is checked against the official hints and solutions where they exist.

## Supervision in Claude Code (copy and paste)

The same flow on the Mac and on a phone, in any browser:

1. **In learnhub:** "Copy for supervision" copies one text block: the problem, its Cambridge source, the learner's answer or write-up, and recent attempts on that topic.
2. **In Claude:** the learner opens their supervision session (Claude Code on the Mac; from a phone, the same session through Remote Control, or a Claude Code session on claude.ai/code) and pastes the block, attaching photos of handwritten work if any. A `/supervise` command (or the session's standing instructions) supervises Cambridge style: questions one step at a time, gives the smallest hint that unblocks, never a full solution.
3. **The result:** the session ends by printing a short, structured result block (mark out of 20, three weak points, redo problems, the problem id), with a checksum so a partial paste is detected.
4. **Back in learnhub:** "Paste result" imports it. Weak points and redo problems join the review schedule.

No folders, file permissions, API keys, or model calls in the public site.

## Progress sync between devices

Today progress lives in each browser (IndexedDB), so the Mac and the phone each keep their own. Proposal:

- **Store:** one small table in Albert's existing Supabase project, `learnhub_progress (user_id, doc jsonb, updated_at)`, with row-level security so only the signed-in user reads or writes their row. **This is a schema change in Supabase and needs Albert's explicit approval before it is made.**
- **Sign-in:** email magic link (Supabase Auth), once per device. The public site holds only the Supabase URL and anon key, which row-level security makes safe to publish.
- **Merge:** the progress document already has per-topic memory states and an attempt history. Sync merges per topic (the newer review wins; attempts are unioned by id; settings last-writer-wins), so studying on both devices offline never loses work. Tested with property tests.
- **When:** after each lesson, review, or imported supervision result, and on app open; offline changes queue and sync later. Export and import stay as a backup.
- **Alternative without Supabase:** sync through a private GitHub gist with a personal token pasted once per device. Simpler to set up, weaker security (the token sits in browser storage). Not recommended.

## What changes in the existing app and content

- The 10 written topics are rewritten from the Cambridge sources (their checks stay).
- The topic graph keeps its engine and validator; topics gain Cambridge source citations and may be re-cut.
- New: the source fetch and manifest script, the Cambridge-problem item type (auto-checked or supervised), the supervision copy and result-paste formats, the `/supervise` command, progress sync.
- Unchanged: the course choice, Today, lessons, practice feedback, spaced review, map, glossary, progress.

## Build order (each a review pause)

1. Fetch and extract the sources for this round; produce a source-to-topic map for review.
2. Rebuild the first 10 topics from the sources, with variants and Cambridge problems.
3. Supervision: copy and paste formats, the `/supervise` command, import.
4. Progress sync (after Albert approves the Supabase table).
5. The next batches, in course order.

## Decisions (owner, 2026-10-05)

- Practice answers are checked automatically by the app (B). No self-marking.
- Supervision is copy and paste through a Claude Code session, on the Mac and on mobile.
- Progress sync is part of this design.

- First batch: the STEP Foundation probability assignments plus IA Probability example sheet 1, and Discrete Mathematics Proof and Numbers from the CST notes, supervision work 1, and Book of Proof.
- The current 10 lessons are rewritten from the Cambridge sources.
- The `learnhub_progress` table in the existing Supabase project, with magic-link sign-in, is approved (2026-10-05). It is created in build step 4.
