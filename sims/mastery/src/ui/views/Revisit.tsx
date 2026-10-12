/**
 * Lessons to revisit (mastery/HOW-A-TOPIC-WORKS.md, Rule 9), under You: every topic with a
 * weak skill, its first-try accuracy and number of first answers, and each weak skill with a
 * link to the lesson section that teaches it. Sortable by accuracy, by attempts, or in book
 * order. The list reads the content of the topics that have enough answers to judge, which
 * downloads them if needed.
 */
import { useEffect, useState } from 'preact/hooks';
import { lessonSections, plain, type TopicContent } from '@learnhub/content';
import { BOOK_ORDER } from '@learnhub/content/book';
import type { Progress } from '@learnhub/mastery';
import { titleOf } from '@/model/courses';
import { contentStore } from '@/model/content';
import { WEAK_BELOW, WEAK_MIN_ATTEMPTS, percentOf, revisitCandidates, revisitRows, sortRevisit, type RevisitSort } from '@/model/struggle';
import { BackLink } from '@/ui/BackLink';
import { AppLink } from '@/ui/campaignShared';

const SORTS: readonly { id: RevisitSort; label: string }[] = [
  { id: 'accuracy', label: 'Lowest accuracy' },
  { id: 'attempts', label: 'Most attempts' },
  { id: 'order', label: 'Book order' },
];

/** Position in the book, for "Book order"; a topic outside the book goes last. */
const bookRank = (topicId: string): number => {
  const i = BOOK_ORDER.indexOf(topicId);
  return i < 0 ? BOOK_ORDER.length : i;
};

type Loaded = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; contents: TopicContent[] };

export function RevisitView({ p }: { p: Progress }) {
  const [by, setBy] = useState<RevisitSort>('accuracy');
  const [loaded, setLoaded] = useState<Loaded>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const ids = revisitCandidates(p.history);
  const key = ids.join(',');
  useEffect(() => {
    let live = true;
    Promise.all(ids.map((id) => contentStore.load(id))).then(
      (cs) => { if (live) setLoaded({ kind: 'ready', contents: cs.filter((c): c is TopicContent => c !== undefined) }); },
      () => { if (live) setLoaded({ kind: 'error' }); },
    );
    return () => { live = false; };
  }, [key, attempt]);
  const rows = loaded.kind === 'ready' ? sortRevisit(revisitRows(p.history, loaded.contents), by, bookRank) : [];
  const byId = new Map(loaded.kind === 'ready' ? loaded.contents.map((c) => [c.topicId, c]) : []);
  return (
    <section class="ds-page revisit" aria-labelledby="revisit-title">
      <BackLink to={{ view: 'progress' }} label="Back to You" />
      <div class="ds-eyebrow">You</div>
      <h1 id="revisit-title" class="ds-h1">Lessons to revisit</h1>
      <p class="ds-meta">
        Topics with a skill under {Math.round(WEAK_BELOW * 100)}% right on the first try, over at least {WEAK_MIN_ATTEMPTS} recent answers in
        practice, more practice, and reviews.
      </p>
      {loaded.kind === 'loading' && <p class="small muted" role="status">Loading the lessons…</p>}
      {loaded.kind === 'error' && (
        <div class="content-error" role="alert">
          <p>The lessons could not be loaded. Check the connection, then try again.</p>
          <button type="button" class="btn btn-primary" onClick={() => { setLoaded({ kind: 'loading' }); setAttempt(attempt + 1); }}>Try again</button>
        </div>
      )}
      {loaded.kind === 'ready' && rows.length === 0 && <p>No lesson to revisit. Every skill with enough answers is at {Math.round(WEAK_BELOW * 100)}% or more on the first try.</p>}
      {rows.length > 0 && (
        <>
          <p class="ds-li revisit-sort">
            <span class="ds-x" id="revisit-sort">Sort</span>
            <span class="ds-seg" role="group" aria-labelledby="revisit-sort">
              {SORTS.map((s) => <button key={s.id} type="button" aria-pressed={by === s.id} onClick={() => setBy(s.id)}>{s.label}</button>)}
            </span>
          </p>
          <ul class="ds-list plain revisit-list">
            {rows.map((r) => {
              const c = byId.get(r.topicId);
              const sections = c === undefined ? [] : lessonSections(c.lesson);
              return (
                <li key={r.topicId} class="revisit-row">
                  <h2 class="revisit-topic"><AppLink to={{ view: 'learn', topicId: r.topicId }}>{titleOf(r.topicId)}</AppLink></h2>
                  <p class="small muted">{percentOf(r.accuracy)}% right on the first try, {r.accuracy.attempts} attempts.</p>
                  <ul class="small">
                    {r.weak.map((s) => {
                      const sec = s.section === null ? undefined : sections[s.section];
                      const name = sec === undefined || sec.title === null ? null : plain(sec.title);
                      return (
                        <li key={s.skill}>
                          {s.skill} {percentOf(s)}% ({s.right} of {s.attempts}).{' '}
                          {name === null
                            ? <AppLink to={{ view: 'learn', topicId: r.topicId }}>Read the lesson again</AppLink>
                            : <AppLink to={{ view: 'learn', topicId: r.topicId, section: s.section as number }}>Read “{name}” again</AppLink>}
                        </li>
                      );
                    })}
                  </ul>
                  <p class="small"><AppLink to={{ view: 'more', topicId: r.topicId }}>More practice</AppLink></p>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
