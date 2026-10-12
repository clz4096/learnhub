/**
 * "This skill needs another look" (mastery/HOW-A-TOPIC-WORKS.md, Rule 9): each weak skill of
 * a topic, how often its first answer was right, and a link back to the lesson section that
 * teaches it (or to the lesson, when no section can be told). Nothing shows while no skill
 * is weak.
 */
import { lessonSections, plain, type TopicContent } from '@learnhub/content';
import type { HistoryEntry } from '@learnhub/mastery';
import { progress } from '@/model/store';
import { percentOf, weakSkills } from '@/model/struggle';
import { AppLink } from '@/ui/campaignShared';

export function WeakSkills({ c, history }: { c: TopicContent; history?: readonly HistoryEntry[] }) {
  const h = history ?? progress.value?.history ?? [];
  const weak = weakSkills(c, h);
  if (weak.length === 0) return null;
  const sections = lessonSections(c.lesson);
  return (
    <div class="weak-skills" role="note">
      {weak.map((s) => {
        const sec = s.section === null ? undefined : sections[s.section];
        const name = sec?.title === null || sec === undefined ? null : plain(sec.title);
        return (
          <div key={s.skill} class="weak-skill">
            <p class="small"><strong>This skill needs another look:</strong> {s.skill}</p>
            <p class="small muted">
              {percentOf(s)}% right on the first try ({s.right} of {s.attempts}).{' '}
              {name === null
                ? <AppLink to={{ view: 'learn', topicId: c.topicId }}>Read the lesson again</AppLink>
                : <AppLink to={{ view: 'learn', topicId: c.topicId, section: s.section as number }}>Read “{name}” again</AppLink>}
            </p>
          </div>
        );
      })}
    </div>
  );
}
