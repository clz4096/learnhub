# Mastery courses: guide

Dated 2026-10-04. Status: beta. Not listed in the catalog until the owner marks it ready.

## What it is

A course app for Cambridge IA Probability and CST IA Discrete Mathematics, taught from scratch over one shared knowledge graph of 98 topics (`graph/`). The design is `mastery/DESIGN.md`.

## How a day works

1. **Start.** Choose courses (both by default) and daily minutes (60 by default), then take the placement test. A right answer counts the topic and everything beneath it; a wrong answer rules out everything above it. Topics with written lessons ask a real problem; the others ask for a self-report, labelled as such.
2. **Today.** The engine's planner (`planSession`) fills the daily time with reviews that are due, new lessons split between the courses by weight, and a quiz every few topics. Each task shows the planner's reason. The plan is stored for the day, so a reload shows the same tasks.
3. **Lessons.** Learn, worked examples, then practice until the topic's mastery rule is met (three right in a row for the first ten topics). Wrong answers that match a known misconception get a specific explanation.
4. **Reviews and quizzes.** A review is two problems on a learned topic; a quiz is one problem on each recent topic. Both use the same problem runtime as practice.

## Content

Lessons exist for the first ten topics the engine schedules for a new learner taking both courses: fractions, sets and Venn diagrams, the product rule, and, or, and not, algebraic manipulation, set-builder notation, factorials, indices, sequences, and equally likely outcomes. The content lives in `content/` (package `@learnhub/content`), one file per topic, and is checked in CI: every number comes from code, every generator is run over 1,000 seeds, and every probability is checked exactly and by simulation.

## Your data

Progress is one document in this browser's IndexedDB. Export it from Progress to keep a copy or to move to another device; Import replaces the progress here after showing what the file holds. Start over needs the phrase "start over" typed in full.
