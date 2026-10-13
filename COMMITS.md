# Proposed commit messages

Messages for Albert to review; nothing here has been committed.

## Design pass, stage 1

Files: DESIGN-AUDIT.md, design/gallery.html, design/shots/before/*.png, design/flows/before-*.webm

```
Design pass stage 1: before screenshots, flow videos, gallery, and the audit
```

## Design pass, stage 2 (directions)

Files: design/directions/** (three static prototypes, shared base CSS and script, self-hosted CMU, STIX Two, and Libertinus fonts with their OFL texts, KaTeX CSS and fonts, contrast.txt), design/gallery.html (Directions section). Screenshots in design/shots/directions/ are local only (ignored).

```
Design pass stage 2: three typographic directions for the map and a lesson, with the gallery section
```

## Design pass, stage 3 (direction C: shell, lesson, map, problems, supervision, standup, shared styles)

Files: sims/mastery/src/styles/{tokens,fonts,app,v4,standup,cohort,story}.css, sims/mastery/src/assets/fonts/* (Libertinus, OFL), sims/mastery/src/main.tsx, sims/mastery/src/model/theme.ts, sims/mastery/src/ui/{App,ProblemCard,Supervision}.tsx, sims/mastery/src/ui/shell/Icons.tsx, sims/mastery/src/ui/views/{Lesson,MapView,Standup}.tsx, sims/mastery/src/ui/{lessonStyle,shell}.test.tsx, sims/mastery/index.html, sims/mastery/public/manifest.webmanifest, design/DESIGN.md, DESIGN.md, DESIGN-AUDIT.md

```
Design pass stage 3: direction C tokens and Libertinus type, plates, lesson stepper, split result block, map dock and sheet, mastered moment
```

## Design pass, logic changes (Albert's decisions)

Files: sims/mastery/src/ui/views/{Today,DayPlanner,dayView,Standup,Book,Lesson}.tsx/.ts, sims/mastery/src/ui/{Supervision,MathPreview}.tsx, sims/mastery/src/ui/ladderShared.ts, sims/mastery/src/model/{dayQueue,supervision,book,ladderNext}.ts, sims/mastery/src/styles/{app,cohort}.css, sims/mastery/src/styles/screens/{today,dayplanner}.css, and the tests that pin them

```
Today lists each item once in the timeline; standup update first; supervisor-only lines hidden; write-up maths preview; chapters count lessons
```

## Design pass, Course headings and map edges

Files: sims/mastery/src/ui/views/{Book,MapView}.tsx, sims/mastery/src/styles/{app,v4}.css, DESIGN-AUDIT.md

```
Course term names are h2 so headings descend; map node boxes mask the edges so no edge crosses a label; audit marks 6 and 13 fixed
```

## Design pass, mobile folds (Admission, Letters, Story, Standup)

Files: sims/mastery/src/ui/Fold.tsx, sims/mastery/src/styles/screens/{fold,standup,story}.css, sims/mastery/src/ui/views/{Campaign,Letters,Story,Standup}.tsx, sims/mastery/src/ui/views/standup.test.tsx

```
Fold secondary sections on phone: Admission, Letters, Story, and Standup open on their primary item
```

## Design pass, lesson plates, You, and Settings

Files: sims/mastery/src/ui/views/{Lesson,You,Settings,ProgressView}.tsx, sims/mastery/src/ui/{App,Disclosure,OutcomePanel,Sync}.tsx, sims/mastery/src/ui/shell/Palette.tsx, sims/mastery/src/ui/help/content.ts, sims/mastery/src/model/{route,shell}.ts, sims/mastery/src/sync/app.ts, sims/mastery/src/styles/screens/{lesson,you}.css, design/DESIGN.md, and the tests that pin them

```
One size for every lesson plate; You keeps progress and outcomes in folded sections; settings move to their own screen
```

## Design pass, Today and the day planner (Albert's phone review)

Files: sims/mastery/src/ui/views/{Today,DayPlanner}.tsx, sims/mastery/src/styles/screens/{today,dayplanner}.css, sims/mastery/src/ui/{dayPlanner,screens}.test.tsx, design/shots/after/{today,dayplanner}-*

```
Today: one Plan from now control at the top; leftovers and the ladder rung in the timeline; blocks fold on phones; side column folds to one row
```

## Design pass, one fold component and a shorter Results page

Files: sims/mastery/src/ui/Fold.tsx, sims/mastery/src/ui/Disclosure.tsx (deleted), sims/mastery/src/ui/OutcomePanel.tsx, sims/mastery/src/ui/views/{Report,Settings,You,ProgressView}.tsx, sims/mastery/src/styles/screens/you.css, DESIGN-AUDIT.md, COMMITS.md

```
One fold component: Disclosure folds into Fold; Results folds its sections under the summary on a phone; audit marks 4, 10, and 14 fixed
```

## Day planner anchors editable in Settings

Files: packages/mastery/src/{progress,merge}.ts and their tests, sims/mastery/src/model/{day,dayLog,campaignCalendar}.ts, sims/mastery/src/sync/learner/day.ts, sims/mastery/src/ui/views/{Settings,DayPlanner,dayView}.tsx, sims/mastery/src/styles/screens/you.css, and the tests that pin them

```
Settings: choose the gym start, dinner, and bed; a planned day keeps its times until Plan from now; anchors sync with the settings and each day
```
