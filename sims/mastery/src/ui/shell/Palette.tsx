/**
 * The command palette (mastery/design-v4.html, "⌘K search"): Cmd+K or Ctrl+K anywhere, or
 * the search button. Empty, it lists recent items and the common actions with their keys;
 * typed into, it searches lessons, glossary terms, and past papers. Arrow keys move, Enter
 * opens, Escape closes and puts focus back where it was.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { GLOSSARY, glossaryEntry, hasContent } from '@learnhub/content';
import { placeOf } from '@learnhub/content/book';
import { acts, paperName } from '@/model/campaign';
import { nextTimed } from '@/model/campaignCalendar';
import { campaign } from '@/model/campaignStore';
import { courseInputs } from '@/model/campaignSummary';
import { ALL_TOPICS, titleOf } from '@/model/courses';
import { go, type Route } from '@/model/route';
import { search, type Hit, type Recent, type Searchable } from '@/model/shell';
import { progress } from '@/model/store';
import { setTheme, theme, type Theme } from '@/model/theme';
import { admissions, loadAdmissions } from '@/ui/campaignShared';
import { trapTab } from '@/ui/help/focus';
import { ladderRoute } from '@/ui/ladderShared';
import { helpOpen } from '@/ui/help/state';
import { loadRecent, paletteOpen } from '@/ui/shell/state';

const THEMES: readonly Theme[] = ['system', 'light', 'dark'];

/** Where "Start a timed paper" goes: the open act's next paper, else the list of papers. */
export function timedPaperRoute(): Route {
  const c = campaign.value;
  const adm = admissions.value;
  const p = progress.value;
  if (c === null) return { view: 'campaign' };
  if (adm === null || p === null) return { view: 'papers' };
  const next = nextTimed(adm, c, acts(adm, c, courseInputs(p)));
  const id = next?.paperIds[0];
  return id === undefined ? { view: 'papers' } : { view: 'paper', paperId: id };
}

export function cycleTheme(): void {
  setTheme(THEMES[(THEMES.indexOf(theme.value) + 1) % THEMES.length] as Theme);
}

interface Action extends Hit {
  run: () => void;
}

function actions(): Action[] {
  const a = (id: string, label: string, hint: string, run: () => void): Action => ({ kind: 'action', id, label, hint, to: null, run });
  return [
    a('today', 'Begin the day', '1', () => go({ view: 'today' })),
    a('gym', 'Start the gym', 'G', () => go({ view: 'gym' })),
    a('timed', 'Start a timed paper', 'T', () => go(timedPaperRoute())),
    a('ladder', 'Climb the timed ladder', '', () => go(ladderRoute())),
    a('mixed', 'Start a mixed review', '', () => go({ view: 'mixed' })),
    a('glossary', 'Open the glossary', '', () => go({ view: 'glossary', termId: null })),
    a('help', 'Help', '', () => { helpOpen.value = true; }),
    a('theme', 'Switch the theme', '', cycleTheme),
  ];
}

function lessonRoute(id: string): Route {
  return placeOf(id) !== undefined ? { view: 'learn', topicId: id, from: 'book' } : { view: 'learn', topicId: id };
}

function searchables(): Searchable[] {
  const lessons: Searchable[] = ALL_TOPICS.filter((t) => hasContent(t.id)).map((t) => ({ kind: 'lesson', id: t.id, label: t.title, to: lessonRoute(t.id) }));
  const terms: Searchable[] = GLOSSARY.map((e) => ({ kind: 'term', id: e.id, label: e.term, also: e.aliases, to: { view: 'glossary', termId: e.id } }));
  const adm = admissions.value;
  const papers: Searchable[] = adm === null ? [] : adm.registry.papers.map((x) => ({
    kind: 'paper', id: x.id, label: paperName(x), also: [`${x.exam} ${x.year}`, x.board], to: { view: 'paper', paperId: x.id },
  }));
  return [...lessons, ...terms, ...papers];
}

function recentHit(r: Recent): Hit | null {
  if (r.kind === 'lesson') return { kind: 'lesson', id: r.id, label: titleOf(r.id), hint: 'lesson', to: lessonRoute(r.id) };
  if (r.kind === 'term') {
    const e = glossaryEntry(r.id);
    return e === undefined ? null : { kind: 'term', id: r.id, label: e.term, hint: 'term', to: { view: 'glossary', termId: r.id } };
  }
  const paper = admissions.value?.registryPaper(r.id);
  return { kind: 'paper', id: r.id, label: paper === undefined ? r.id : paperName(paper), hint: 'paper', to: { view: 'paper', paperId: r.id } };
}

export function Palette() {
  if (!paletteOpen.value) return null;
  return <PaletteBox />;
}

type Row = { head: string } | { hit: Hit | Action };

function PaletteBox() {
  const [q, setQ] = useState('');
  const [at, setAt] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const adm = admissions.value;
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    input.current?.focus();
    if (admissions.peek() === null) void loadAdmissions();
    return () => { if (opener?.isConnected) opener.focus(); };
  }, []);
  const all = useMemo(searchables, [adm]);
  const rows: Row[] = useMemo(() => {
    if (q.trim() === '') {
      const recent = loadRecent().map(recentHit).filter((x): x is Hit => x !== null);
      return [
        ...(recent.length > 0 ? [{ head: 'Recent' }, ...recent.map((hit) => ({ hit }))] : []),
        { head: 'Actions' }, ...actions().map((hit) => ({ hit })),
      ];
    }
    const hits = search(q, all);
    const acts = actions().filter((x) => x.label.toLowerCase().includes(q.trim().toLowerCase()));
    return [...hits.map((hit) => ({ hit })), ...acts.map((hit) => ({ hit }))];
  }, [q, all]);
  const hits = rows.flatMap((r) => ('hit' in r ? [r.hit] : []));
  const cur = Math.min(at, Math.max(0, hits.length - 1));
  const close = (): void => { paletteOpen.value = false; };
  const open = (h: Hit | Action): void => {
    close();
    if ('run' in h) h.run();
    else if (h.to !== null) go(h.to);
  };
  let n = -1;
  return (
    <div class="ds-cmd" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div
        ref={box} class="ds-cmd-box" role="dialog" aria-modal="true" aria-label="Search and jump"
        onKeyDown={(e) => {
          if (e.key === 'Escape') { e.preventDefault(); close(); }
          else if (e.key === 'ArrowDown') { e.preventDefault(); setAt(Math.min(hits.length - 1, cur + 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setAt(Math.max(0, cur - 1)); }
          else if (e.key === 'Enter') { const h = hits[cur]; if (h !== undefined) { e.preventDefault(); open(h); } }
          else if (e.key === 'Tab' && box.current !== null) trapTab(e, box.current);
        }}
      >
        <input
          ref={input} type="text" class="ds-cmd-in" value={q} role="combobox" aria-expanded="true"
          aria-controls="cmd-list" aria-activedescendant={hits.length > 0 ? `cmd-${cur}` : undefined} aria-autocomplete="list"
          placeholder="Search lessons, terms, papers, or type a command" aria-label="Search lessons, terms, and papers, or type a command"
          autocomplete="off" spellcheck={false}
          onInput={(e) => { setQ((e.currentTarget as HTMLInputElement).value); setAt(0); }}
        />
        <ul id="cmd-list" class="ds-cmd-res" role="listbox" aria-label="Results">
          {rows.map((r, i) => {
            if ('head' in r) return <li key={`h${i}`} class="ds-cmd-h" role="presentation">{r.head}</li>;
            n++;
            const k = n;
            const h = r.hit;
            return (
              <li
                key={`${h.kind}-${h.id}`} id={`cmd-${k}`} role="option" aria-selected={k === cur} class={k === cur ? 'on' : undefined}
                onMouseMove={() => { if (k !== cur) setAt(k); }} onClick={() => open(h)}
              >
                <span>{h.label}</span>
                {h.hint !== '' && (h.kind === 'action' ? <kbd>{h.hint}</kbd> : <span class="ds-cmd-k">{h.hint}</span>)}
              </li>
            );
          })}
          {hits.length === 0 && <li class="ds-cmd-none" role="presentation">Nothing matches “{q.trim()}”.</li>}
        </ul>
      </div>
    </div>
  );
}
