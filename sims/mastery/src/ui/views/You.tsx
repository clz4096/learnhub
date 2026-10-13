/**
 * The You tab (mastery/design-v4.html): progress and outcomes only. The ways on (Settings,
 * Lessons to revisit, the glossary, the map) as plain rows, then each part as a section
 * that folds to its heading: predicted results and how they compare with real ones (the
 * OutcomePanel slot), and each course. Every setting lives on Settings (#/settings).
 */
import { GLOSSARY } from '@learnhub/content';
import { hrefOf, go, type Route } from '@/model/route';
import { progress } from '@/model/store';
import { Fold } from '@/ui/Fold';
import { OutcomeSlot } from '@/ui/OutcomeSlot';
import { Courses } from '@/ui/views/ProgressView';
import '@/styles/screens/you.css';

function RowLink({ to, label, right }: { to: Route; label: string; right: string }) {
  return (
    <li>
      <a
        class="ds-li" href={hrefOf(to)}
        onClick={(e) => {
          if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          go(to);
        }}
      >
        <span class="ds-x">{label}</span><span class="ds-r">{right}</span>
      </a>
    </li>
  );
}

export function YouView() {
  const p = progress.value;
  if (p === null) return null;
  return (
    <section class="ds-page you" aria-labelledby="you-title">
      <div class="ds-eyebrow">You</div>
      <h1 id="you-title" class="ds-h1">Progress and outcomes</h1>
      <ul class="ds-list plain you-links">
        <RowLink to={{ view: 'settings' }} label="Settings" right="theme, plan, standup, sync" />
        <RowLink to={{ view: 'revisit' }} label="Lessons to revisit" right="weak skills" />
        <RowLink to={{ view: 'glossary', termId: null }} label="Glossary" right={`${GLOSSARY.length} terms`} />
        <RowLink to={{ view: 'map', topicId: null }} label="Prerequisite map" right="every topic" />
      </ul>
      <details class="ds-how">
        <summary>How predictions work</summary>
        <p>
          Each prediction uses only papers you sat under time. Your marks are set against that year's real grade boundaries, and the
          range narrows as you sit more papers.
        </p>
      </details>
      <OutcomeSlot p={p} />
      <Fold id="pc-title" title="Your courses" aside={`${p.courses.length} ${p.courses.length === 1 ? 'course' : 'courses'}`}>
        <Courses p={p} />
      </Fold>
    </section>
  );
}
