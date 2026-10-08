/**
 * Blind mixed review (model/mixedReview.ts), in focus mode: generated problems from several
 * mastered topics, interleaved, one at a time, with the topic's name hidden until the
 * problem is answered. No hints, as in an exam. Each answer is recorded as it is shown
 * (`recordMixedAnswer`: the topic's review when it is due, a drill otherwise); the plan and
 * the place in it are kept for the day (mixedStore.ts), so a reload resumes the review and
 * Today knows it was done.
 *
 * Reached from Today, where the planner shows it as "Review: mixed", and from the palette.
 */
import { useEffect, useState } from 'preact/hooks';
import type { TopicContent } from '@learnhub/content';
import { MIXED_MIN_TOPICS, type MixedItem } from '@learnhub/mastery';
import { contentStore } from '@/model/content';
import { localDay } from '@/model/learner';
import {
  answerMixed, masteredWithContent, mixedHeading, mixedInstance, planMixedReview, recordMixedAnswer, type MixedSitting,
} from '@/model/mixedReview';
import { loadMixed, saveMixed } from '@/model/mixedStore';
import { seedFor } from '@/model/practice';
import { go } from '@/model/route';
import { commit, now, progress } from '@/model/store';
import { ProblemCard } from '@/ui/ProblemCard';
import { buzz } from '@/ui/shell/state';

/** The day's sitting to show: today's stored one, else a fresh plan (keeping whether today's was done). */
function sittingFor(contents: readonly TopicContent[], fresh: boolean): MixedSitting | null {
  const p = progress.peek();
  if (p === null) return null;
  const t = now();
  const day = localDay(t);
  const stored = loadMixed();
  const today = stored !== null && stored.day === day ? stored : null;
  if (today !== null && !fresh) return today;
  const items = planMixedReview(p, contents, t, seedFor('mixed', day, t)).filter((x) => mixedInstance(contents, x) !== undefined);
  if (items.length === 0) return null;
  const s: MixedSitting = { day, items, results: [], done: today?.done ?? false };
  saveMixed(s);
  return s;
}

export function MixedReviewView() {
  const p = progress.value;
  const topics = p === null ? [] : masteredWithContent(p);
  const key = topics.join();
  const [contents, setContents] = useState<TopicContent[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    Promise.all(topics.map((id) => contentStore.load(id).catch(() => undefined))).then((cs) => {
      if (!live) return;
      const got = cs.filter((c): c is TopicContent => c !== undefined);
      setFailed(got.length < topics.length);
      setContents(got);
    }, () => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [key]);
  if (p === null) return null;

  return (
    <section class="ds-page ds-mixed" aria-labelledby="mixed-title">
      {topics.length < MIXED_MIN_TOPICS
        ? (
          <>
            <div class="ds-eyebrow">Blind mixed review</div>
            <h1 id="mixed-title" class="ds-h1">Not enough to mix yet</h1>
            <p class="ds-note">
              A mixed review needs at least {MIXED_MIN_TOPICS} mastered topics, so that the problem does not give its topic away. Mastered so
              far: {topics.length}. Master more topics (learn each, then meet its Cambridge gate), and the review appears in Today.
            </p>
          </>
        )
        : contents === null
          ? (
            <>
              <div class="ds-eyebrow">Blind mixed review</div>
              <h1 id="mixed-title" class="ds-h1">Mixed review</h1>
              <p class="ds-note">Getting the topics ready.</p>
            </>
          )
          : <MixedRun contents={contents} />}
      {failed && <p class="ds-note" role="status">Some topics could not be downloaded; the review uses the rest.</p>}
    </section>
  );
}

function MixedRun({ contents }: { contents: readonly TopicContent[] }) {
  const [s, setS] = useState<MixedSitting | null>(() => sittingFor(contents, false));
  const [cur, setCur] = useState(() => s?.results.length ?? 0);
  // A broken problem is replaced with a fresh seed; this counts the replacements of the current item.
  const [bump, setBump] = useState(0);
  if (s === null) {
    return (
      <>
        <div class="ds-eyebrow">Blind mixed review</div>
        <h1 id="mixed-title" class="ds-h1">Nothing to mix</h1>
        <p class="ds-note">The mastered topics have no generated problems that could be loaded. Try again later.</p>
      </>
    );
  }
  const total = s.items.length;
  if (cur >= total) {
    const again = (): void => {
      const next = sittingFor(contents, true);
      setS(next);
      setCur(0);
      setBump(0);
    };
    return <MixedSummary s={s} onAgain={again} />;
  }
  const planned = s.items[cur] as MixedItem;
  const item: MixedItem = bump === 0 ? planned : { ...planned, seed: (planned.seed + bump) >>> 0 };
  const inst = mixedInstance(contents, item);
  const answered = s.results.length > cur;
  const last = cur + 1 === total;
  if (inst === undefined) {
    return (
      <>
        <div class="ds-eyebrow">Blind mixed review</div>
        <h1 id="mixed-title" class="ds-h1">{mixedHeading(item, cur, total, false)}</h1>
        <p class="ds-note">This problem could not be loaded.</p>
        <button
          type="button" class="ds-btn"
          onClick={() => {
            const items = s.items.filter((_, i) => i !== cur);
            const next: MixedSitting = { ...s, items, done: s.done || (items.length > 0 && s.results.length >= items.length) };
            saveMixed(next);
            setS(next);
          }}
        >
          Skip it
        </button>
      </>
    );
  }
  return (
    <>
      <div class="ds-eyebrow">Blind mixed review · no hints</div>
      <h1 id="mixed-title" class="ds-h1" aria-live="polite">{mixedHeading(item, cur, total, answered)}</h1>
      <p class="ds-meta">{answered ? 'Now you know the topic: did you recognise the method?' : 'The topic is hidden until you answer: spotting the method is part of the work.'}</p>
      <div class="ds-card">
        <ProblemCard
          key={`${cur}-${bump}`}
          topicId={item.topicId} instance={inst} mode="review" index={cur}
          consequence={(o) => ({
            effect: o === 'correct' ? 'Right. It counts as this topic\'s review if one was due, else as a drill.' : 'Missed: the topic comes back for review sooner.',
            next: last ? 'See how it went' : 'Next problem',
          })}
          onAnswer={(r) => {
            if (r.outcome === 'problem-error' || s.results.length > cur) return;
            const p = progress.peek();
            if (p === null) return;
            buzz(15);
            const next = answerMixed(s, r.correct);
            // Saved before the progress commit, so Today, redrawn by it, sees the review as done.
            saveMixed(next);
            setS(next);
            void commit(recordMixedAnswer(p, item, r.correct, r.ms, now()));
          }}
          onDone={(r) => {
            if (r.outcome === 'problem-error') { setBump(bump + 1); return; }
            setBump(0);
            setCur(cur + 1);
          }}
        />
      </div>
      <p class="ds-meta ds-center">{s.results.filter(Boolean).length} right of {s.results.length} answered · {total - s.results.length} left</p>
    </>
  );
}

function MixedSummary({ s, onAgain }: { s: MixedSitting; onAgain: () => void }) {
  const right = s.results.filter(Boolean).length;
  return (
    <>
      <div class="ds-eyebrow">Blind mixed review · done</div>
      <h1 id="mixed-title" class="ds-h1">{right} of {s.items.length} right</h1>
      <p class="ds-meta">Each answer was recorded: a topic that was due had its review; the others counted as drills.</p>
      <ul class="ds-list plain" aria-label="The problems and their topics">
        {s.items.map((x, i) => (
          <li key={`${x.id}-${i}`}>
            <div class="ds-li">
              <span class="ds-x">{mixedHeading(x, i, s.items.length, true)}</span>
              <span class={`ds-r${s.results[i] === true ? ' cam' : ''}`}>{s.results[i] === true ? 'right' : 'missed'}</span>
            </div>
          </li>
        ))}
      </ul>
      <div class="ds-row">
        <button type="button" class="ds-btn" onClick={() => go({ view: 'today' })}>Back to Today</button>
        <button type="button" class="ds-btn ghost" onClick={onAgain}>Another mixed review</button>
      </div>
    </>
  );
}
