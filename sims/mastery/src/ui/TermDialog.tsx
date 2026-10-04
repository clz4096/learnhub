/** A glossary entry opened in place from a marked term, so a lesson or problem never loses its place. */
import { useEffect, useRef } from 'preact/hooks';
import { glossaryEntry } from '@learnhub/content';
import { go } from '@/model/route';
import { closeTerm, termOpen } from '@/ui/termState';
import { trapTab } from '@/ui/help/focus';
import { Rich } from '@/ui/Rich';

export function TermDialog() {
  const id = termOpen.value;
  if (id === null) return null;
  return <TermCard id={id} />;
}

function TermCard({ id }: { id: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const e = glossaryEntry(id);
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.querySelector<HTMLElement>('h2')?.focus();
    return () => { if (opener?.isConnected) opener.focus(); };
  }, [id]);
  return (
    <div class="modal-layer" onClick={(ev) => { if (ev.target === ev.currentTarget) closeTerm(); }}>
      <div
        ref={ref}
        class="modal term-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="term-title"
        onKeyDown={(ev) => {
          if (ev.key === 'Escape') { ev.preventDefault(); closeTerm(); }
          else if (ev.key === 'Tab' && ref.current) trapTab(ev, ref.current);
        }}
      >
        <h2 id="term-title" tabIndex={-1}>{e?.term ?? id}</h2>
        {e === undefined ? <p>No glossary entry yet.</p> : (
          <>
            <Rich as="p" text={e.definition} />
            <p class="small"><strong>Example:</strong> <Rich text={e.example} /></p>
          </>
        )}
        <div class="actions">
          <button type="button" class="btn btn-primary" onClick={closeTerm}>Close</button>
          <button type="button" class="btn" onClick={() => { closeTerm(); go({ view: 'glossary', termId: id }); }}>Open the glossary</button>
        </div>
      </div>
    </div>
  );
}
