/**
 * The Course tab: the whole degree as a book (mastery/DESIGN-BOOK.md), in design v4
 * (mastery/design-v4.html): the four stages in plain words, what each covers and its main
 * courses, and "6 of 11 lessons" counts on each chapter, with a Continue card for the next
 * step in book order. The stage you are in is open; each stage opens to its chapters by
 * term, optional courses folded and left-out ones listed quietly. A chapter opens to its
 * sections, and a section to its steps, each linked to its lesson. Later stages open after
 * the first; nothing is locked. The prerequisite map stays one link away.
 */
import type { ComponentChildren } from 'preact';
import { BOOK, PREREQ_FLAGS, TRACK_NAMES, chapterById, type BookChapter, type BookSection, type BookYear } from '@learnhub/content/book';
import type { Progress } from '@learnhub/mastery';
import { STEP_TEXT, chapterProgress, hereChapter, neighbours, nextInBook, stepStates, type StepState } from '@/model/book';
import { titleOf } from '@/model/courses';
import { hasContent } from '@/model/learner';
import { go, hrefOf, type Route } from '@/model/route';
import { now, progress } from '@/model/store';
import { BackLink } from '@/ui/BackLink';
import { plainChapter, stageOf } from '@/ui/views/stages';

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
                <span class="book-flag">Builds on {(PREREQ_FLAGS[s.topicId] ?? []).map((f) => titleOf(f.prereq)).join(' and ')}, later in the book.</span>
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

/** A chapter on the Course tab: its plain name, the exam it belongs to as a small tag, and its lesson count. */
function StageChapter({ ch, p, here }: { ch: BookChapter; p: Progress; here: boolean }) {
  const c = chapterProgress(p, ch);
  const name = plainChapter(ch.title);
  const count = c.steps === 0 ? '' : `${c.learned} of ${c.steps}${here ? ' lessons' : ''}`;
  return (
    <li class={`book-ch${here ? ' here' : ''}`}>
      <BookLink to={{ view: 'chapter', chapterId: ch.id }} cls="ds-ch">
        <span class="t">
          {name.name}
          {name.tag !== null && <> <abbr class="ds-codetag" title={name.help ?? undefined}>{name.tag}</abbr></>}
          {here && <span class="visually-hidden"> (you are here)</span>}
        </span>
        <span class="r">{count}</span>
      </BookLink>
    </li>
  );
}

/** One stage's chapters, by term: the main courses, optional ones folded, left-out ones quietly. */
function StageChapters({ y, p, here }: { y: BookYear; p: Progress; here: BookChapter | undefined }) {
  return (
    <div class="ds-chs">
      {y.terms.map((term) => {
        const main = term.chapters.filter((c) => c.status === 'core' || c.status === 'overlap');
        const opt = term.chapters.filter((c) => c.status === 'opt');
        const out = term.chapters.filter((c) => c.status === 'out');
        return (
          <div key={term.name} class="book-term">
            {y.terms.length > 1 && <h3 class="ds-eyebrow">{term.name}</h3>}
            {main.length > 0 && <ul class="ds-chlist">{main.map((c) => <StageChapter key={c.id} ch={c} p={p} here={c === here} />)}</ul>}
            {opt.length > 0 && (
              <details class="book-opt" open={opt.includes(here as BookChapter)}>
                <summary>{opt.length} optional</summary>
                <ul class="ds-chlist">{opt.map((c) => <StageChapter key={c.id} ch={c} p={p} here={c === here} />)}</ul>
              </details>
            )}
            {out.length > 0 && <p class="book-out">Left out: {out.map((c) => c.title).join(', ')}.</p>}
          </div>
        );
      })}
    </div>
  );
}

export function BookView() {
  const p = progress.value;
  if (p === null) return null;
  const here = hereChapter(p);
  const next = nextInBook(p);
  const hereYear = BOOK.find((y) => y.id === here?.yearId);
  const first = BOOK[0];
  return (
    <section class="ds-page book" aria-labelledby="book-title">
      <div class="ds-eyebrow">Course</div>
      <h1 id="book-title" class="ds-h1">{BOOK.length === 4 ? 'Four stages' : 'The course'}</h1>
      <p class="ds-meta">the order Cambridge students take them</p>
      {next !== undefined && (
        <BookLink to={{ view: 'learn', topicId: next.step.topicId, from: 'book' }} cls="ds-now ds-cont">
          <span class="ds-tag">CONTINUE</span>
          <span class="ds-now-t">{titleOf(next.step.topicId)}</span>
          <span class="ds-meta">{plainChapter(next.chapter.title).name} · {next.section.title}</span>
        </BookLink>
      )}
      <ol class="ds-stages" aria-label="Stages">
        {BOOK.map((y) => {
          const st = stageOf(y);
          const isHere = y === hereYear;
          const chs = y.terms.flatMap((t) => t.chapters);
          const ps = chs.map((c) => chapterProgress(p, c));
          const steps = ps.reduce((a, c) => a + c.steps, 0);
          const learned = ps.reduce((a, c) => a + c.learned, 0);
          return (
            <li key={y.id} class={`ds-stage${isHere ? ' here' : ''}`}>
              <details class="book-yr" open={isHere}>
                <summary>
                  <span class="ds-stage-top">
                    <span><span class="ds-num">{st.n}</span><span class="t ds-stage-n">{st.name}</span></span>
                    {isHere
                      ? <span class="ds-chip">{steps === 0 ? '' : `${Math.round((100 * learned) / steps)}%`}</span>
                      : <span class="ds-meta">{y.afterPreparation && first !== undefined ? `after ${stageOf(first).name}` : steps === 0 ? '' : `${learned} of ${steps}`}</span>}
                  </span>
                  <span class="ds-what">{st.what}</span>
                  {!isHere && st.peek.length > 0 && <span class="ds-peek">{st.peek.join(' · ')}</span>}
                  <span class="visually-hidden">{y.label}</span>
                </summary>
                {y.afterPreparation && <p class="book-note">Reading ahead is fine; nothing is locked.</p>}
                <StageChapters y={y} p={p} here={here} />
              </details>
            </li>
          );
        })}
      </ol>
      <p class="book-links"><BookLink to={{ view: 'map', topicId: null }}>Prerequisite map</BookLink></p>
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
      {year?.afterPreparation === true && <p class="book-note">{AFTER_PREP}. Reading ahead is fine; nothing is locked.</p>}
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
