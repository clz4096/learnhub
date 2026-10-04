/** Glossary: every term the lessons mark, with a definition, an example, and the topic that teaches it. */
import { useEffect, useState } from 'preact/hooks';
import { glossaryEntry, searchGlossary, type GlossaryEntry } from '@learnhub/content';
import { titleOf } from '@/model/courses';
import { go } from '@/model/route';
import { Rich } from '@/ui/Rich';

export function Entry({ e, selected }: { e: GlossaryEntry; selected?: boolean }) {
  return (
    <article id={`term-${e.id}`} class={`entry${selected ? ' selected' : ''}`} tabIndex={-1}>
      <h2>{e.term}</h2>
      {e.aliases !== undefined && e.aliases.length > 0 && <p class="small muted">Also: {e.aliases.join(', ')}</p>}
      <Rich as="p" text={e.definition} />
      <p class="small"><strong>Example:</strong> <Rich text={e.example} /></p>
      <p class="small">
        Taught in <button type="button" class="linklike" onClick={() => go({ view: 'map', topicId: e.topic })}>{titleOf(e.topic)}</button>
      </p>
    </article>
  );
}

export function GlossaryView({ termId }: { termId: string | null }) {
  const [q, setQ] = useState('');
  const list = searchGlossary(q);
  useEffect(() => {
    if (termId === null) return;
    const el = document.getElementById(`term-${termId}`);
    el?.scrollIntoView?.({ block: 'start' });
    el?.focus({ preventScroll: true });
  }, [termId]);
  return (
    <section class="page glossary" aria-labelledby="gl-title">
      <h1 id="gl-title">Glossary</h1>
      <div class="field narrow">
        <label for="gl-search">Search</label>
        <input id="gl-search" type="search" value={q} placeholder="for example: union, exponent" onInput={(e) => setQ((e.currentTarget as HTMLInputElement).value)} />
      </div>
      <p class="small muted" role="status">{list.length} of {searchGlossary('').length} terms</p>
      {list.map((e) => <Entry key={e.id} e={e} selected={e.id === termId} />)}
      {termId !== null && glossaryEntry(termId) === undefined && <p class="small">No entry for “{termId}”.</p>}
    </section>
  );
}
