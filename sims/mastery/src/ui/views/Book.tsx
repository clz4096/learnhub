/**
 * The Course tab: the whole degree as a book (mastery/DESIGN-BOOK.md, revision of
 * 2026-10-05), in the minimalist look. The contents page shows the years as collapsible
 * sections, each term's two tracks, core chapters with lecture counts and progress,
 * optional courses folded, and left-out courses listed quietly. "Here" marks the chapter
 * of the next step in book order. A chapter opens to its sections, and a section to its
 * steps, each linked to its lesson. Part IA and later carry a label: they open after the
 * Preparation campaign; nothing is blocked. The prerequisite map stays one link away.
 */
import type { ComponentChildren } from 'preact';
import { BOOK, PREREQ_FLAGS, TRACK_NAMES, chapterById, type BookChapter, type BookSection, type BookTerm, type BookYear, type Track } from '@learnhub/content/book';
import type { Progress } from '@learnhub/mastery';
import { STEP_TEXT, chapterProgress, hereChapter, neighbours, nextInBook, stepStates, type StepState } from '@/model/book';
import { titleOf } from '@/model/courses';
import { hasContent } from '@/model/learner';
import { go, hrefOf, type Route } from '@/model/route';
import { now, progress } from '@/model/store';
import { BackLink } from '@/ui/BackLink';

const AFTER_PREP = 'Opens after the Preparation campaign';

/** An in-app link with a real href (open in a new tab works), handled by `go` on a plain click. */
export function BookLink({ to, cls, children }: { to: Route; cls?: string; children: ComponentChildren }) {
  return (
    <a
      class={cls}
      href={hrefOf(to)}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        go(to);
      }}
    >
      {children}
    </a>
  );
}

const lectures = (n: number | null): string => (n === null ? '' : `${n} lecture${n === 1 ? '' : 's'}`);
const join = (xs: readonly string[]): string => xs.filter((x) => x !== '').join(' · ');

function chapterStatus(p: Progress, ch: BookChapter, here: boolean): string {
  const c = chapterProgress(p, ch);
  const count = c.steps === 0 ? '' : c.learned === c.steps ? 'done' : c.written === 0 ? 'to write' : `${c.learned} of ${c.steps}`;
  return here ? join(['here', count]) : count;
}

function StepList({ sec, states, next }: { sec: BookSection; states: ReadonlyMap<string, StepState>; next: string | undefined }) {
  return (
    <ol class="book-steps">
      {sec.steps.map((s) => {
        const st = states.get(s.topicId) ?? 'towrite';
        const isNext = s.topicId === next;
        return (
          <li key={s.topicId} class={`st-${st}${isNext ? ' here' : ''}`}>
            <span class="book-dot" aria-hidden="true" />
            <span class="book-step-t">
              {hasContent(s.topicId)
                ? <BookLink to={{ view: 'learn', topicId: s.topicId, from: 'book' }}>{titleOf(s.topicId)}</BookLink>
                : <span>{titleOf(s.topicId)}</span>}
              {s.bridge && <span class="book-tag">bridge</span>}
              {PREREQ_FLAGS[s.topicId] !== undefined && (
                <span class="book-flag">Builds on {titleOf(PREREQ_FLAGS[s.topicId]?.prereq ?? '')}, later in the book.</span>
              )}
            </span>
            <span class="r">{isNext ? 'next' : STEP_TEXT[st]}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Sections({ ch, p, states, next, open }: { ch: BookChapter; p: Progress; states: ReadonlyMap<string, StepState>; next: string | undefined; open: boolean }) {
  return (
    <ol class="book-secs">
      {ch.sections.map((sec) => {
        const learned = sec.steps.filter((s) => p.memory[s.topicId] !== undefined).length;
        const meta = join([lectures(sec.lectures), sec.steps.length > 0 ? `${learned} of ${sec.steps.length}` : '']);
        if (sec.steps.length === 0) {
          return <li key={sec.id} class="book-sec quiet"><span class="t">{sec.title}</span><span class="r">{meta}</span></li>;
        }
        const hasNext = sec.steps.some((s) => s.topicId === next);
        return (
          <li key={sec.id} class={`book-sec${hasNext ? ' here' : ''}`}>
            <details open={open || hasNext}>
              <summary><span class="t">{sec.title}</span><span class="r">{meta}</span></summary>
              <StepList sec={sec} states={states} next={next} />
            </details>
          </li>
        );
      })}
    </ol>
  );
}

function ChapterRow({ ch, p, here, states, next }: { ch: BookChapter; p: Progress; here: boolean; states: ReadonlyMap<string, StepState>; next: string | undefined }) {
  const status = chapterStatus(p, ch, here);
  const sub = join([lectures(ch.lectures), ch.sections.length > 0 ? `${ch.sections.length} section${ch.sections.length === 1 ? '' : 's'}` : '', ch.runs]);
  const cls = `book-ch${here ? ' here' : ''}`;
  if (ch.sections.length === 0) {
    return (
      <li class={cls}>
        <div class="book-row">
          <BookLink to={{ view: 'chapter', chapterId: ch.id }} cls="t">{ch.title}</BookLink>
          <span class="r">{status}</span>
          {sub !== '' && <span class="s">{sub}</span>}
        </div>
      </li>
    );
  }
  return (
    <li class={cls}>
      <details open={here}>
        <summary class="book-row">
          <span class="t">{ch.title}</span>
          <span class={`r${here ? ' cam' : ''}`}>{status}</span>
          {sub !== '' && <span class="s">{sub}</span>}
        </summary>
        <Sections ch={ch} p={p} states={states} next={next} open={false} />
        <p class="book-open"><BookLink to={{ view: 'chapter', chapterId: ch.id }}>Open the chapter</BookLink></p>
      </details>
    </li>
  );
}

function Term({ term, p, here, states, next }: { term: BookTerm; p: Progress; here: BookChapter | undefined; states: ReadonlyMap<string, StepState>; next: string | undefined }) {
  const tracks = (['Maths', 'CS'] as const).filter((tr) => term.chapters.some((c) => c.track === tr));
  const row = (c: BookChapter) => <ChapterRow key={c.id} ch={c} p={p} here={c === here} states={states} next={next} />;
  return (
    <div class="book-term">
      <h3>{term.name}</h3>
      {tracks.map((tr: Track) => {
        const cs = term.chapters.filter((c) => c.track === tr);
        const main = cs.filter((c) => c.status === 'core' || c.status === 'overlap');
        const opt = cs.filter((c) => c.status === 'opt');
        const out = cs.filter((c) => c.status === 'out');
        return (
          <div key={tr} class="book-track">
            <p class="book-track-h">{TRACK_NAMES[tr]}</p>
            {main.length > 0 && <ul class="book-list">{main.map(row)}</ul>}
            {opt.length > 0 && (
              <details class="book-opt" open={opt.includes(here as BookChapter)}>
                <summary>{opt.length} optional</summary>
                <ul class="book-list">{opt.map(row)}</ul>
              </details>
            )}
            {out.length > 0 && <p class="book-out">Left out: {out.map((c) => c.title).join(', ')}.</p>}
          </div>
        );
      })}
    </div>
  );
}

function yearMeta(p: Progress, y: BookYear, here: BookChapter | undefined): string {
  const chs = y.terms.flatMap((t) => t.chapters);
  const ps = chs.map((c) => chapterProgress(p, c));
  const steps = ps.reduce((a, c) => a + c.steps, 0);
  const learned = ps.reduce((a, c) => a + c.learned, 0);
  const pct = steps === 0 ? '' : `${Math.round((100 * learned) / steps)}%`;
  const at = here !== undefined && chs.includes(here) ? here.termName : '';
  return join([pct, at, y.afterPreparation ? AFTER_PREP : '']);
}

/** Today's "continue" line: the next step in book order, linked to its lesson. */
export function ContinueReading({ p }: { p: Progress }) {
  const next = nextInBook(p);
  if (next === undefined) return null;
  return (
    <p class="book-continue">
      <span class="book-k">Continue reading</span>{' '}
      <BookLink to={{ view: 'learn', topicId: next.step.topicId, from: 'book' }} cls="book-next">{titleOf(next.step.topicId)}</BookLink>
      <span class="book-where">
        <BookLink to={{ view: 'chapter', chapterId: next.chapter.id }}>{next.chapter.title}</BookLink>, {next.section.title}
      </span>
    </p>
  );
}

export function BookView() {
  const p = progress.value;
  if (p === null) return null;
  const here = hereChapter(p);
  const next = nextInBook(p)?.step.topicId;
  const states = stepStates(p, now());
  const hereYear = BOOK.find((y) => y.id === here?.yearId);
  return (
    <section class="page book" aria-labelledby="book-title">
      <h1 id="book-title">The course</h1>
      <p class="lead">
        Preparation, then Parts IA, IB, and II in Cambridge's term order, the Mathematical and Computer Science Triposes side by side.
        {here !== undefined && hereYear !== undefined && <> You are in {hereYear.label.split(',')[0]}, {here.termName}.</>}
      </p>
      <ContinueReading p={p} />
      <p class="book-links"><BookLink to={{ view: 'map', topicId: null }}>Prerequisite map</BookLink></p>
      {BOOK.map((y) => (
        <details key={y.id} class="book-yr" open={y === hereYear}>
          <summary><span class="t">{y.label}</span><span class="r">{yearMeta(p, y, here)}</span></summary>
          {y.afterPreparation && <p class="book-note">{AFTER_PREP}. You can read ahead; nothing is locked.</p>}
          {y.terms.map((t) => <Term key={t.name} term={t} p={p} here={here} states={states} next={next} />)}
        </details>
      ))}
    </section>
  );
}

export function ChapterView({ chapterId }: { chapterId: string }) {
  const p = progress.value;
  const ch = chapterById(chapterId);
  if (p === null) return null;
  if (ch === undefined) {
    return (
      <section class="page book">
        <BackLink to={{ view: 'book' }} label="Back to the contents" />
        <p>There is no such chapter.</p>
      </section>
    );
  }
  const year = BOOK.find((y) => y.id === ch.yearId);
  const c = chapterProgress(p, ch);
  const next = nextInBook(p)?.step.topicId;
  const states = stepStates(p, now());
  const { prev, next: after } = neighbours(ch);
  const pct = c.steps === 0 ? 0 : Math.round((100 * c.learned) / c.steps);
  return (
    <section class="page book chapter" aria-labelledby="chapter-title">
      <BackLink to={{ view: 'book' }} label="Back to the contents" />
      <p class="book-kicker">{join([year?.label.split(',')[0] ?? '', ch.termName, TRACK_NAMES[ch.track]])}</p>
      <h1 id="chapter-title">{ch.title}</h1>
      <p class="lead">
        {join([lectures(ch.lectures), `${ch.sections.length} section${ch.sections.length === 1 ? '' : 's'}`, ch.runs,
          ch.status === 'opt' ? 'optional' : ch.status === 'out' ? 'left out' : ''])}
      </p>
      {ch.overlap !== '' && <p class="book-note">{ch.overlap}.</p>}
      {ch.why !== '' && <p class="book-note">{ch.why}.</p>}
      {year?.afterPreparation === true && <p class="book-note">{AFTER_PREP}. You can read ahead; nothing is locked.</p>}
      {c.steps > 0 && (
        <div class="d-progress">
          <div class="d-bar"><i style={{ width: `${pct}%` }} /></div>
          <div class="d-lbl"><span>{c.learned} of {c.steps} steps learned</span><span>{c.written} written</span></div>
        </div>
      )}
      {ch.sections.length === 0
        ? <p class="book-note">The syllabus lists no sections for this course.</p>
        : <Sections ch={ch} p={p} states={states} next={next} open />}
      <nav class="book-pn" aria-label="Chapters">
        {prev !== undefined ? <BookLink to={{ view: 'chapter', chapterId: prev.id }} cls="prev">Previous: {prev.title}</BookLink> : <span />}
        {after !== undefined && <BookLink to={{ view: 'chapter', chapterId: after.id }} cls="next">Next: {after.title}</BookLink>}
      </nav>
    </section>
  );
}
