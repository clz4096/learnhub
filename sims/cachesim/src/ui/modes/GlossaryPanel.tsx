/**
 * Glossary: searchable definitions for every Term. A Term click anywhere selects the
 * entry; this panel clears the search, scrolls to the entry, and moves focus to it.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { mode, selection } from '@/ui/state';
import { GLOSSARY, glossaryEntry, searchGlossary, type GlossaryEntry } from '@/ui/modes/glossary';
import { lessonById } from '@/ui/modes/lessons';
import { updateProgress } from '@/ui/modes/progress';
import { busy, runActions } from '@/ui/modes/lessonRunner';
import '@/ui/modes/modes.css';

export function GlossaryPanel() {
  const sel = selection.value;
  const term = sel?.type === 'term' ? sel.term : undefined;
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const pendingFocus = useRef<string | null>(null);

  // A newly opened term: clear the search so it is listed, then focus it once rendered.
  useEffect(() => {
    if (!term || !glossaryEntry(term)) return;
    pendingFocus.current = term;
    setQ('');
  }, [term]);
  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-entry="${id}"] h3`);
    if (!el) return;
    pendingFocus.current = null;
    el.scrollIntoView?.({ block: 'nearest' });
    el.focus({ preventScroll: true });
  });

  const results = searchGlossary(q);
  const see = async (e: GlossaryEntry) => {
    setError(null);
    if ('lesson' in e.see) {
      const id = e.see.lesson;
      updateProgress((p) => { p.lesson = id; });
      mode.value = 'guided';
      return;
    }
    try {
      await runActions([{ kind: 'setup', setup: e.see.setup }], 'view');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <section class="panel mode-panel glossary" aria-labelledby="glossary-title">
      <h2 id="glossary-title">Glossary</h2>
      <p class="small muted">
        Each core idea comes with one everyday picture: memory is a warehouse, a cache is a bookcase by your desk,
        and a cache line is a box of neighboring bytes that always travels whole.
      </p>
      <label class="field gloss-search">
        <span>Search {GLOSSARY.length} terms</span>
        <input type="search" value={q} placeholder="for example: conflict, MESI, TLB"
          onInput={(e) => setQ((e.currentTarget as HTMLInputElement).value)} />
      </label>
      <p class="visually-hidden" role="status" aria-live="polite">{results.length} {results.length === 1 ? 'term' : 'terms'} found</p>
      {error && <p class="error small" role="alert">{error}</p>}
      {results.length === 0 && <p class="small muted">No terms match "{q}".</p>}
      <ul ref={listRef} class="gloss-list">
        {results.map((e) => {
          const on = e.id === term;
          const lesson = 'lesson' in e.see ? lessonById(e.see.lesson) : undefined;
          return (
            <li key={e.id} data-entry={e.id} class={`gloss-entry${on ? ' selected' : ''}`}>
              <h3 tabIndex={-1} id={`gloss-${e.id}`}>{e.term}</h3>
              <p class="small">{e.definition}</p>
              {e.analogy && <p class="small"><span class="muted">Think of it as: </span>{e.analogy}</p>}
              <p class="small"><span class="muted">Example: </span>{e.example}</p>
              <button type="button" class="linklike small" disabled={busy.value} onClick={() => { void see(e); }}
                aria-describedby={`gloss-${e.id}`}>
                See it in the simulator: {lesson ? `lesson "${lesson.title}"` : 'label' in e.see ? e.see.label : ''}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
