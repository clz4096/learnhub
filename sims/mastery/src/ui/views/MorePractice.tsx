/**
 * More practice (mastery/HOW-A-TOPIC-WORKS.md, Rule 2): an unlimited stream of a topic's
 * problems, its generators in turn with fresh seeds each time the screen opens. Always
 * open, before and after the practice is passed. It counts toward nothing: no practice run,
 * no lesson result, no mastery, no change to the schedule. Each answer is still logged as a
 * `drill` entry with its item data, so its first answer feeds the struggle signal (Rule 9).
 */
import { useState } from 'preact/hooks';
import { hasContent } from '@learnhub/content';
import { drillItemId, recordDrill } from '@/model/learner';
import { titleOf } from '@/model/courses';
import { moreInstance } from '@/model/practice';
import { commit, now, progress } from '@/model/store';
import { BackLink } from '@/ui/BackLink';
import { ContentGate } from '@/ui/ContentGate';
import { ProblemCard, type CardOutcome, type Consequence } from '@/ui/ProblemCard';
import { WeakSkills } from '@/ui/WeakSkills';

/** What one answer in more practice does: nothing but the record of its first answer. */
export function moreConsequence(o: CardOutcome): Consequence {
  return {
    effect: o === 'correct' ? 'Right. More practice counts toward nothing.' : 'More practice counts toward nothing, so a miss changes nothing.',
    next: 'Next problem',
  };
}

export function MorePracticeView({ topicId }: { topicId: string }) {
  // Fixed while the screen is open, new on each visit: a fresh stream of problems.
  const [salt] = useState(() => now());
  const [k, setK] = useState(0);
  // A broken problem is replaced by a fresh one in the same place; nothing is recorded.
  const [fresh, setFresh] = useState(0);
  const [right, setRight] = useState(0);
  return (
    <section class="page more-practice" aria-labelledby="more-title">
      <BackLink to={{ view: 'learn', topicId }} label="Back to the lesson" />
      <p class="small muted">More practice</p>
      <h1 id="more-title">{titleOf(topicId)}</h1>
      <p class="small muted">
        Problems without end, one skill after another. They count toward nothing: not the practice result, not mastery, not
        reviews. First answers are recorded, to show which skills need another look.
      </p>
      {!hasContent(topicId)
        ? <p>This topic has no problems written yet.</p>
        : (
          <ContentGate topicId={topicId} what="practice">{(c) => {
            const inst = moreInstance(c, fresh === 0 ? salt : `${salt}.fresh${fresh}`, k);
            return (
              <>
                <WeakSkills c={c} />
                {k > 0 && <p class="small muted" role="status">{right} of {k} right on the first try here.</p>}
                <ProblemCard
                  key={`${k}-${fresh}`}
                  index={k}
                  mode="practice"
                  oneMoreTry
                  topicId={topicId}
                  instance={inst}
                  consequence={moreConsequence}
                  onDone={(r) => {
                    if (r.outcome === 'problem-error') {
                      setFresh(fresh + 1);
                      return;
                    }
                    const cur = progress.value;
                    if (cur !== null) {
                      void commit(recordDrill(cur, topicId, r.correct, { id: drillItemId(topicId, inst.generatorId), seed: inst.seed, ms: r.ms, hints: 0 }, now()));
                    }
                    if (r.correct) setRight(right + 1);
                    setFresh(0);
                    setK(k + 1);
                  }}
                />
              </>
            );
          }}</ContentGate>
        )}
    </section>
  );
}
