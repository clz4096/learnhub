# The admissions campaign and the day planner: design

Dated 2026-10-05. Status: draft; questions answered 2026-10-05, for review. No code yet.

Builds on `mastery/DESIGN-BOOK.md` (the book in Cambridge order: Preparation, then Part IA, IB, and II by term). This design covers the Preparation year only, plus a day planner used throughout.

## Goal

Turn the Preparation year into a role-playing campaign: Albert, a working engineer whose only school qualification is a GED, works his way to a Cambridge place in Mathematics or Computer Science. The campaign follows the real admissions route, step by step. Progress comes from completing the book; the real tests are still sat, timed, and scored against published data, and an honest report says where those scores would have landed.

A day planner turns each morning's wake time into the day's schedule, filled from the book's real queue.

## Non-goals

- No admission decided by a score. Completing the acts admits you; scores are reported, not gating.
- No invented numbers. Every figure the game shows cites a source; anything without one is labelled as an estimate or left out.
- No Cambridge branding (crest, arms, logos).
- The degree years (Part IA to II) and the GPA transcript are a later design.

## The character and the route

- **Character:** Albert as he is: 21 or over, so a mature applicant; a GED and no A levels; six years as a software engineer.
- **Route, chosen at the start:** Mathematics or Computer Science. Both share Act 1; the tests and the offer differ. The route can be switched before Act 3.

## The real route (verified 2026-10-05)

| Fact | Source |
|---|---|
| The GED is not listed among accepted qualifications. US applicants need five AP 5s in related subjects plus SAT 1500 (Maths 750+) or ACT 33; a US diploma alone "is not considered suitable preparation" | undergraduate.study.cam.ac.uk, international entry requirements, 2027 entry |
| Mature (21+) applicants must meet "the same standards as school leavers" with "recent academic achievement at a high level", usually within 2 years of starting. For Computer Science, an Access to HE course is not enough: further study such as A levels is needed | undergraduate.study.cam.ac.uk, mature student applications and accepted qualifications |
| Mature colleges: Hughes Hall and St Edmund's take Mathematics; Wolfson takes Mathematics from 2027 entry; St Edmund's and Wolfson take Computer Science (Hughes Hall unconfirmed) | maths.cam.ac.uk admissions FAQ; wolfson.cam.ac.uk application FAQs |
| Mature colleges have a January round: UCAS 13 January, My Cambridge Application 20 January, interviews March to April; January applicants may sit the January TMUA | application dates and deadlines; esat-tmua.ac.uk deadlines |
| TMUA is required for Computer Science and for Mathematics (2027 entry); 2 papers of 20 multiple-choice questions, 75 minutes each | course pages; UAT-UK TMUA technical report 2024-25 |
| Typical offers: Mathematics A\*A\*A plus grade 1 in STEP 2 and STEP 3; Computer Science A\*A\*A, often A\* in Mathematics or Further Mathematics | course pages; Maths Faculty FAQ |
| Interviews: 1 or 2, 35 to 60 minutes in total; Mathematics is problem solving; sample questions published by Downing and Trinity; the Department of Computer Science describes formats by college | cambridge-interviews page; dow.cam.ac.uk; cst.cam.ac.uk admissions interviews |

The realistic route for Albert is recent A level Mathematics and Further Mathematics (or AP Calculus BC and four more AP 5s with SAT). The campaign uses A levels, which match the offers above.

## Supporting resources

| Resource | Used for | Note |
|---|---|---|
| Cambridge CS Application Guide, Dylan Moss (https://dylanmoss1.github.io/Cambridge-CS-Application-Guide/): Choosing a College, Personal Statement, TMUA, Interview Advice, Application FAQs | Acts II to IV, both routes | Unofficial, written by a student; no date on the page. Its two mock interviews set the interview packet's shape: one computer science question in 4 parts with pre-reading, about 40 minutes; and three mathematics questions needing induction, about 35 minutes. Its method (think aloud, simplify, try small cases, expect to get stuck) becomes the interviewer's rubric. Its further practice: CSAT section B, Oxford's sample interview questions, the colleges' recorded mock interviews |

## The acts

Each act opens when the previous one is complete. "Complete" means the act's book chapters are finished and its papers have been sat (scores recorded, not judged).

| Act | Real step | Book content | Sat and scored | Complete when |
|---|---|---|---|---|
| 1. Recent qualifications | A level Mathematics and Further Mathematics as an adult | Preparation Stage A: STEP Foundation blocks 1 to 6, CS-0 proof, maths, and OCaml; the A level content not covered by them | Timed A level papers, marked by supervision against the mark schemes; grade from that paper's grade boundaries | Stage A chapters done; two full Mathematics and two Further Mathematics papers sat |
| 2. The admissions test | TMUA, January sitting | TMUA notes and the chapters it needs | Timed TMUA past papers, 2 × 75 minutes, checked by the app (multiple choice) | Three full papers sat |
| 3. The application | January round at a mature college | Choose the course and college; write the optional 1,200-character statement | The statement goes to supervision for feedback | Application filed in the app |
| 4. The interview | One or two problem-solving interviews | Preparation Stage B (STEP 2 modules) under way | A supervision session runs an interview on unseen problems, shaped like the guide's two mock interviews and drawn from the published sample questions (Downing, Trinity, CSAT section B), and returns a mark with notes on thinking aloud | Two interviews held, one of each shape |
| 5. The offer and results | Conditional offer; STEP in June (Mathematics route) | Preparation Stage C (STEP 3 modules) | Full STEP 2 and STEP 3 papers, 3 hours, timed, marked by supervision; grade from that year's boundaries | Stage C done and the papers sat. The admission letter follows, with the honest report |

Completing Act 5 opens Part IA Michaelmas.

## The honest report

A standing page, updated after every paper. It compares Albert's real results with published figures and cites each one.

| Measure | Compared with | Source |
|---|---|---|
| STEP 2 and 3 marks (out of 120, best 6 answers) | That year's grade boundaries (S, 1, 2, 3) and the share of candidates at each grade, 2019 to 2026 | OCR, "Explanation of results for STEP", per year |
| TMUA raw marks (out of 40) | The official answer keys. No official raw-to-scale table exists for past papers, so no 1.0 to 9.0 score is claimed | esat-tmua.ac.uk preparation materials |
| A level papers | That paper's published grade boundaries | The exam board's grade boundaries (to fetch) |
| Interview marks | The supervision mark scale (14/20 is a pass, as now) | learnhub supervision |
| The odds, for context only | 2025 cycle success rates: Computer Science 7.4% (1,739 applications), Mathematics 12.7% (2,032); USA applicants 5.5%; applicants aged 21 and over 19.4% | Cambridge undergraduate admissions statistics, 2025 cycle |

The report ends with one line per offer condition, for example "STEP 3: grade 2 on the 2019 paper (boundary for grade 1: 57). Offers ask for grade 1."

## The day planner ("Begin the day")

**Input:** the wake time (or "Now"). **Fixed anchors** (Albert, 2026-10-05): bed at 1:00 am; the gym starts between 2:00 and 2:30 pm ET and takes 90 minutes with travel; dinner at 8:00 pm. Also (decided 2026-10-05): 45 minutes to get going after waking, dinner at least an hour; assumed: lunch for 30 minutes before the gym, 30 minutes to wind down before bed.

**Study:** 6 core hours in 90-minute blocks with 15-minute breaks, plus up to 2 optional light hours when the core is done and time remains before bed. A timed STEP paper takes one 3-hour block, and a TMUA sitting a 2.5-hour block; the planner puts them in the morning.

**Filling the blocks**, in order: a timed paper if one is due; new material from the book (the earliest blocks); practice and worked examples; supervision redos and write-ups; reviews due (the lightest slots, and the optional hours).

**Rules:**
- The gym slides within 2:00 to 2:30 to avoid cutting a block.
- The latest wake for a full 6-hour day is about 1:00 pm. Later, the day shrinks and the shortfall rolls into tomorrow and shows in the week's total.
- Friday plans end before sundown in Brooklyn; Saturday plans start after sundown. Sunset is computed on the device (NOAA solar algorithm, no network), as Meridian does.
- Checking blocks off as the day goes reflows the rest: running late shortens the last block, finishing early offers the next item.

**Example: wake at 9:00.** Getting going to 9:45; block 1 9:45 to 11:15 (new material); block 2 11:30 to 1:00; reviews 1:15 to 2:00; lunch; gym 2:30 to 4:00; block 3 4:00 to 5:30; reviews 5:45 to 6:30 (core done); optional 6:45 to 8:00; dinner 8:00 to 9:00; optional 9:00 to 9:45; bed 1:00.

## Game systems (approved 2026-10-05: "do all five")

1. **The application calendar (stakes).** The campaign runs against the real admissions cycle. From your study pace (hours logged per week) and the hours left in each act (from the book's estimates), the app projects the date each act will finish and compares it with that cycle's real deadlines: the January TMUA sitting, UCAS and My Cambridge Application in January, interviews in March and April, STEP in June, results in August. If a projection misses a deadline, your target entry slips a year ("On course for October 2028 entry" becomes "Slipped to October 2029"). Nothing is locked; the slip is shown on the Campaign screen, in the letters, and in the report. The earliest real cycle is 2028 entry (the October 2026 TMUA booking has closed and Act 1 needs recent A levels).
2. **Choices that matter.** (a) The college, from the mature colleges that take your route; each college's real interview format (number, length, written test, online or in person) becomes the format of your Act IV interviews. (b) The order of the three A levels in Act 1. (c) Which TMUA sitting you aim for (October or January), which moves the calendar. Each choice is recorded, can be changed until its deadline passes in the simulated calendar, and is shown in the report.
3. **Letters.** At each milestone the app writes a short letter from your real numbers: application received (route, college, sitting), interview invitation (the college's real format), the offer (the real typical conditions for your route), and results day (your grades against each condition, from your actual papers and that year's boundaries). Letters are marked "simulated"; no crest, letterhead, or signature imitating the University.
4. **Stats with effects.** Each stat is still computed from real data, and now changes the plan: Under time below 40 adds a daily timed drill (one past-paper question to the clock); Proof at 60 or above brings STEP 3 questions into the queue early; Interview below 50 after the first interview schedules a second mock before Act V; Programming at 70 or above shortens the CS-0 OCaml block to its exercises. Thresholds are tunable in one table.
5. **Comparison with real candidates.** Each STEP mark is placed on that year's published score distribution (OCR "Explanation of results", per-mark histogram) and reported as a percentile among real candidates. A level marks are placed against that paper's grade boundaries. TMUA stays raw marks (no official conversion), with the unverified offer-holder average shown as context.

## College interview formats (verified 2026-10-05, 2027 entry unless noted)

All three mature colleges take Mathematics and Computer Science, interview online by Zoom, and require the TMUA in both rounds (January round: register by 21 December).

| College | Route | Interview | Test at interview | Offer | Source |
|---|---|---|---|---|---|
| St Edmund's | Mathematics | Usually 1, about 60 minutes, Director of Studies and a Faculty academic; maths problems | None stated | A\*A\*A with STEP | st-edmunds.cam.ac.uk/course/maths |
| St Edmund's | Computer Science | 1, about 50 minutes, Director of Studies and a specialist | A short task on the day, discussed in the interview | A\*A\*A | st-edmunds.cam.ac.uk/course/computer-science |
| Wolfson | Both (Mathematics from 2027 entry) | 1 or 2, 40 to 50 minutes in total; a subject interview, sometimes a general academic one; 2 or 3 interviewers | None published | University typical offer (STEP for Mathematics inferred) | wolfson.cam.ac.uk/undergraduate-study/applying |
| Hughes Hall | Both | Usually 2 of 20 to 30 minutes | None stated | Mathematics: STEP 2 and 3 grade 1, A\*A\*A with A\* in Mathematics and Further Mathematics. Computer Science: A\*A\*A | hughes.cam.ac.uk (2026 entry, search snippets only: unverified) |

January round 2027 entry: UCAS 13 January, My Cambridge Application 20 January, St Edmund's interviews 30 March to 13 April. 2028 entry dates are not yet published; the calendar uses the 2027 dates shifted a year until they are, and says so.

## How it changes the app

- **Progress document:** gains `campaign` (route, current act, the papers sat with marks and dates, the interview results, the application) and `days` (each day's plan and what was done). Both merge like the rest of the document: papers and days are unioned by id; the route is last-writer-wins.
- **New pages:** Campaign (the acts and the character sheet), Report (the honest report), and Begin the day (replaces the top of Today).
- **New content:** the paper registry: each STEP, TMUA, and A level paper with its source, timing, answer key or mark scheme, and grade boundaries, all fetched into `sources/` like the other batches.
- **Unchanged:** the engine, graders, supervision format (an interview and a paper are new packet kinds), and sync.

## Build order (each a review pause)

1. Fetch the paper registry: STEP 2 and 3 papers 2019 to 2026 with solutions and boundaries; TMUA 2016 to 2023 with answer keys; A level Mathematics and Further Mathematics papers with mark schemes and boundaries (board to choose, question 3).
2. The day planner, on its own: it works with today's book queue and is useful before the campaign exists.
3. The campaign shell: route choice, acts, the character sheet, completion rules.
4. Timed papers: the exam mode (a timer, no feedback until the end), TMUA auto-checking, STEP and A level marking through supervision.
5. The honest report.
6. The interview packet and the application step.

## Decisions (Albert, 2026-10-05)

1. TMUA: show raw marks, and also the unverified figure that Computer Science offer holders averaged 6.6 (applicants 4.55 to 4.6, lowest offer 3.8; FOI-2026-413 as quoted by third-party sites), labelled unverified.
2. The Computer Science route has no STEP in Act 5.
3. A level papers: Edexcel for Mathematics and Further Mathematics. Edexcel offers no Computer Science A level, so that one is OCR (H446). Its programming project (non-exam assessment) becomes a book project marked by supervision.
4. Optional light study is capped at 2 hours a day.
5. Act 1 is three A levels: Mathematics, Further Mathematics, and Computer Science, matching the A\*A\*A offers.
6. Planner: 45 minutes to get going after waking; dinner at 8:00 pm for at least an hour.
7. Naming: the campaign is called "Cambridge Entry", with a line saying it is a personal study plan, not affiliated with the University of Cambridge. The status line shows the route, the act, days studied in the campaign, and hours studied this week against the 36-hour target.
