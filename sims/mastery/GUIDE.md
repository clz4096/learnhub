# Mastery courses: guide

Dated 2026-10-04. Status: beta. Not listed in the catalog until the owner marks it ready.

## What it is

A course app for Cambridge IA Probability and CST IA Discrete Mathematics, taught from scratch over one shared knowledge graph of 98 topics (`graph/`). The design is `mastery/DESIGN.md`.

## How a day works

1. **Start.** Choose courses (both by default) and daily minutes (60 by default), then take the placement test. A right answer counts the topic and everything beneath it; a wrong answer rules out everything above it. It asks only about topics with written problems, one real problem each; topics without them are never asked about and count as not known (design decision 18: no self-report anywhere). Back returns to the courses step and keeps the answers so far; the courses step then offers Resume placement or Start placement over.
2. **Today.** The engine's planner (`planSession`) fills the daily time with reviews that are due, new lessons split between the courses by weight, and a quiz every few topics. It schedules only topics whose lesson is written; the others show as "Lesson not written yet" and cannot be learned until they are. Each task shows the planner's reason. The plan is stored for the day, so a reload shows the same tasks.
3. **Lessons.** Learn, worked examples, then practice until the topic's mastery rule is met (three right in a row for the first ten topics). Leaving a lesson keeps its place while the tab is open; closing the tab starts its practice again. Wrong answers that match a known misconception get a specific explanation.
4. **Reviews and quizzes.** A review is two problems on a learned topic; a quiz is one problem on each recent topic. Both use the same problem runtime as practice.

## Moving around

Every view has its own URL, so the browser's Back (or Cmd+[ and the swipe on a Mac) returns to the previous view, and a reload shows the same one. Views reached by a button (a task, a lesson from the map, the placement test, the glossary before placement) also have a Back link. The map draws only the chosen topic's connections, to what it builds on and what builds on it; "Show all connections" draws every edge and is remembered in this browser.

## Content

Lessons exist for the first ten topics the engine schedules for a new learner taking both courses: fractions, sets and Venn diagrams, the product rule, and, or, and not, algebraic manipulation, set-builder notation, factorials, indices, sequences, and equally likely outcomes. The content lives in `content/` (package `@learnhub/content`), one file per topic, and is checked in CI: every number comes from code, every generator is run over 1,000 seeds, and every probability is checked exactly and by simulation.

## Your data

Progress is one document in this browser's IndexedDB. Export it from Progress to keep a copy or to move to another device; Import replaces the progress here after showing what the file holds. Start over needs the phrase "start over" typed in full.
