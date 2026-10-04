/** The workload's C++ source with line numbers; the current access's line is highlighted. */
import { useEffect, useRef } from 'preact/hooks';
import { current, params, source, workload } from '@/ui/state';

export function CodePanel() {
  const src = source.value ?? workload.value.source(params.value);
  const line = current.value?.src ?? 0;
  const preRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Keep the highlighted line visible by scrolling the code box only, never the page.
    const box = preRef.current;
    const el = box?.querySelector<HTMLElement>('.code-line.current');
    if (!box || !el) return;
    const top = el.offsetTop - box.offsetTop;
    if (top < box.scrollTop || top + el.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTop = Math.max(0, top - box.clientHeight / 3);
    }
  }, [line, src]);
  const lines = src.code.split('\n');
  return (
    <section class="panel code-panel" aria-labelledby="code-title">
      <h2 id="code-title">C++ source</h2>
      <div class="code" ref={preRef} role="region" aria-label="C++ source code" tabIndex={0}>
        {lines.map((t, i) => (
          <div key={i} class={`code-line${i + 1 === line ? ' current' : ''}`} aria-current={i + 1 === line ? 'true' : undefined}>
            <span class="code-num" aria-hidden="true">{i + 1}</span>
            <code>{t || ' '}</code>
          </div>
        ))}
      </div>
      {line > 0 && <p class="small muted">The highlighted line {line} made access #{current.value!.index}.</p>}
      {src.notes && <p class="small notes">{src.notes}</p>}
    </section>
  );
}
