/**
 * The You tab (mastery/design-v4.html): predicted outcomes (the OutcomePanel slot, with how
 * predictions work), then settings as plain rows (the glossary, the map, help, the theme),
 * then Progress: each course, daily time and course split, sync, backups, and Start over.
 */
import { GLOSSARY } from '@learnhub/content';
import { hrefOf, go, type Route } from '@/model/route';
import { progress } from '@/model/store';
import { setTheme, theme, type Theme } from '@/model/theme';
import { helpOpen, startTour } from '@/ui/help/state';
import { OutcomeSlot } from '@/ui/OutcomeSlot';
import { ProgressView } from '@/ui/views/ProgressView';

const THEMES: readonly Theme[] = ['system', 'light', 'dark'];
const THEME_NAMES: Readonly<Record<Theme, string>> = { system: 'System', light: 'Light', dark: 'Dark' };

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
  const t = theme.value;
  return (
    <section class="ds-page you" aria-labelledby="you-title">
      <div class="ds-eyebrow">You</div>
      <h1 id="you-title" class="ds-h1">Predicted outcomes</h1>
      <p class="ds-meta">from timed work only · ranges show uncertainty</p>
      <details class="ds-how">
        <summary>How predictions work</summary>
        <p>
          Each prediction uses only papers you sat under time. Your marks are set against that year's real grade boundaries, and the
          range narrows as you sit more papers.
        </p>
      </details>
      <OutcomeSlot p={p} />

      <section class="ds-sect" aria-labelledby="you-settings">
        <div class="ds-eyebrow ds-sect-h"><h2 id="you-settings">Settings and help</h2></div>
        <ul class="ds-list plain">
          <RowLink to={{ view: 'glossary', termId: null }} label="Glossary" right={`${GLOSSARY.length} terms`} />
          <RowLink to={{ view: 'map', topicId: null }} label="Prerequisite map" right="every topic" />
          <li>
            <button type="button" class="ds-li help-button" onClick={() => { helpOpen.value = true; }}>
              <span class="ds-x">Help</span><span class="ds-r">how each part works</span>
            </button>
          </li>
          <li>
            <button type="button" class="ds-li" onClick={startTour}>
              <span class="ds-x">Take the tour again</span><span class="ds-r">five steps</span>
            </button>
          </li>
          <li class="ds-li">
            <span class="ds-x" id="theme-label">Theme</span>
            <span class="ds-seg" role="group" aria-labelledby="theme-label">
              {THEMES.map((x) => (
                <button key={x} type="button" aria-pressed={t === x} onClick={() => setTheme(x)}>{THEME_NAMES[x]}</button>
              ))}
            </span>
          </li>
        </ul>
      </section>

      <ProgressView embedded />
    </section>
  );
}
