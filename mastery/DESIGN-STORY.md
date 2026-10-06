# Story mode: the mature student: design

Dated 2026-10-05. Status: approved direction ("almost like playing NBA 2K but for school"); first build in progress.

## Goal

Turn the campaign and the book into a story the learner plays through, like MyCareer in NBA 2K: a protagonist, a cast, a storyline with chapters, and a cut scene at every milestone. The story never replaces study. Every scene is triggered by real progress, and what happens in it reflects real results.

## The protagonist and the world

- **Albert**, a software engineer from Brooklyn in his thirties, with a GED and six years of shipping production C++. Sabbath-observant: the story keeps Shabbat (no scenes set on it; Friday evening scenes end at candle-lighting).
- **The University of New Cambridge** and **Euclid College**, its college for mature students (modelled on St Edmund's and Hughes Hall: older students, a smaller community, a strong sense of second chances). All institutions and people are fictional.
- **Places:** a Brooklyn kitchen table at 5 am; the A train; an exam hall in Manhattan; the College's courts, library, and Hall; the Senate Court; the boathouse; the Fens.

## The cast

| Character | Role | Arc |
|---|---|---|
| Dr Ada Lambda | Director of Studies in Mathematics | Tough, fair, sees potential before he does |
| Dr E. Noether-Gauss | Admissions Tutor | The voice of the offer; reappears at matriculation |
| Q. E. Demonstrandum | Master of the College | Ceremonial; graduation |
| Priya Raman | Fellow mature applicant, former nurse, applying for Natural Sciences | Friend and rival; study partner through Preparation, matriculates the same year |
| Tomasz | Supervision partner in Part IA, 19, brilliant and careless | The foil: talent against discipline |
| Dr Hal Okafor | CS supervisor | Respects Albert's engineering; pushes him on proof |
| Family | Calls and messages from home | The stakes |

## Mechanics

- **Real data drives every scene.** Scene text has variants keyed to real results: the interview scene plays differently for a 16/20 than for a 10/20; results day reads your actual STEP grades; the term-end scene reads your Tripos paper marks.
- **Reputation (REP)**, as in 2K: earned only from real work (sections mastered, papers sat, supervisions passed, days studied, streaks). Levels: Applicant, Offer Holder, Fresher, Scholar, Senior Scholar, Fellow-in-Waiting. REP unlocks cosmetic things only (College scarf, gown, room upgrades, scenes in the gallery), never content.
- **Relationships:** small dialogue choices in scenes (2 or 3 options) shift relationships with Lambda, Priya, Tomasz, Okafor. Relationships change dialogue and a few optional scenes (a study session with Priya, an invitation to formal Hall); never study.
- **Ratings** (added 2026-10-06), as in 2K: Analysis, Algebra, Probability, Proof, Programming, and Exam Temperament, each 40 to 99, and an overall (the mean). Read from evidence only (sims/mastery/src/model/ratings.ts): drills and gym lift a subject rating at most to 55; past that only gated mastery and passed supervisions count, and Exam Temperament reads timed papers only. Never stored, so sync needs no rule for them. A rating passing a threshold plays a short beat (Proof 70, Exam Temperament 70, overall 60).
- **Side scenes** (added 2026-10-06): a choice or a relationship level can unlock one after a main scene. Book One has two: *Thursday Night* (after First Light, if he asked Priya to study together) and *A Reply* (after The Offer, if Dr Lambda's regard is 2 or more).
- **Setbacks are story, not walls:** a missed grade plays a "narrow miss" scene (results statement sent to the College, an anxious wait, a reprieve), and the honest report records the real number.
- **Skippable and replayable:** every scene can be skipped; a Story tab holds the gallery of seen scenes and the chapter list.

## Presentation (the cut scene engine)

- Cinematic: letterbox bars, a full-bleed scene illustration (layered vector art with slow parallax and light), a title card per chapter, typewriter dialogue with speaker names, a choice panel, and an end card that shows what changed (REP, relationship, the real result that triggered the scene).
- In the approved style: STIX text, Cambridge blue and scarlet accents, the University arms and the Euclid College seal on documents in scenes. Light and dark; 12-hour times.
- Mobile first; tap to advance; respects reduced motion (no parallax, instant text).
- Sound: optional, off by default.

## The storyline

**Prologue: The Kitchen Table.** Brooklyn, 5 am. The GED certificate in a drawer, a STEP paper on the screen. *Trigger:* first launch.

**Book One: Preparation** (the campaign acts)
1. *First Light*: the first STEP Foundation block finished. Priya's first message.
2. *Proof*: CS-0 Proof complete; a late night proving something for the first time.
3. *The Long Winter*: halfway through Stage A; a slump, a call home. (Plays only if the week's hours fell below target twice; otherwise *Momentum*.)
4. *Act I: Recent Qualifications*: the A-level papers sat; results read from real marks.
5. *Act II: The Admissions Test*: TMUA morning, the exam hall in Manhattan; real raw score on the end card.
6. *Act III: The Application*: choosing Euclid College; writing the statement; the UCAS confirmation on the phone.
7. *Act IV: The Interview*: a video call with Dr Lambda; the scene's variant follows the real interview mark.
8. *The Offer*: the offer letter arrives (the real document, rendered from the campaign).
9. *Results Day*: STEP results; variants for met, narrow miss, and missed; the confirmation.
10. *Matriculation*: arrival at the College, the gown, the photograph, Dr Noether-Gauss at the gate.

**Book Two: Part IA** (the book's terms)
- *Michaelmas*: first supervision with Okafor; meeting Tomasz; Discrete Mathematics; the first Formal Hall (if REP and Priya allow).
- *Lent*: Analysis I breaks everyone; a study group in the library; Probability.
- *Easter*: exam term; the papers; results posted at the Senate Court, read from real marks.

**Books Three and Four: Part IB and Part II**: one scene per term and per Tripos result, the dissertation, and *Graduation* (the Latin certificate, the Master, family on the lawn).

## Build order

1. The cut scene engine and the Story tab, with the Prologue and Book One scene 1 (triggered by real data), REP and relationships stored like the campaign.
2. The rest of Book One, wired to the campaign acts.
3. Book Two, wired to the book's terms and Tripos papers.
4. Books Three and Four.
