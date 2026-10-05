/**
 * Supervision by copy and paste: "Copy for supervision", "Paste result", and the
 * supervision part of Today. The formats and their validation are in model/supervision;
 * what an imported result does to progress is in model/learner.
 *
 * Nothing here lets the learner mark their own work: there is no mark field, no pass or
 * fail button. A mark enters only through a pasted result block that answers a copy made
 * here.
 */
import { useRef, useState } from 'preact/hooks';
import { plain } from '@learnhub/content';
import { DAY_MS, SUPERVISION_MARK_MAX, SUPERVISION_PASS_MARK, type Progress } from '@learnhub/mastery';
import { titleOf } from '@/model/courses';
import {
  importSupervisionResult, localDay, openRedos, recordSupervisionCopy, redoSource, topicOfKey, waitingCopies,
} from '@/model/learner';
import { go } from '@/model/route';
import { commit, now, progress } from '@/model/store';
import { buildPacket, checkResultFor, findProblem, newNonce, parseResult, type CheckedAnswer } from '@/model/supervision';

/** A problem's title as plain text, or its key when it is no longer in the app. */
export function problemTitle(key: string): string {
  const f = findProblem(key);
  return f === undefined ? key : plain(f.problem.title);
}

/**
 * Starts the clipboard write. It must be called in the click handler before anything is
 * awaited: Safari on iPhone allows clipboard writes only inside the user's gesture.
 */
function startCopy(text: string): Promise<boolean> {
  try {
    const c = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
    if (c === undefined || typeof c.writeText !== 'function') return Promise.resolve(false);
    return c.writeText(text).then(() => true, () => false);
  } catch {
    return Promise.resolve(false);
  }
}

/** Selects all of a read-only box (setSelectionRange is what iPhone Safari honours) and tries the old copy command. */
function selectAll(el: HTMLTextAreaElement): boolean {
  el.focus();
  el.select();
  el.setSelectionRange(0, el.value.length);
  try {
    return typeof document.execCommand === 'function' && document.execCommand('copy');
  } catch {
    return false;
  }
}

type CopyState = { kind: 'idle' } | { kind: 'copied'; text: string } | { kind: 'manual'; text: string; copied: boolean };

/** "Copy for supervision" for one problem, with the read-only box when the clipboard is not available. */
export function CopyForSupervision({ problemKey, writeUp, checked, describedBy }: {
  problemKey: string;
  writeUp: string;
  /** For an auto-checked problem the app marked wrong: the answer given. */
  checked?: CheckedAnswer;
  describedBy?: string;
}) {
  const [state, setState] = useState<CopyState>({ kind: 'idle' });
  const [showText, setShowText] = useState(false);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const copy = (): void => {
    const p = progress.value;
    if (p === null) return;
    const t = now();
    const { progress: next, attempt } = recordSupervisionCopy(p, problemKey, writeUp, t, () => newNonce());
    const text = buildPacket({ key: problemKey, nonce: attempt.nonce, writeUp, copiedAt: attempt.copiedAt, progress: next, checked });
    const writing = startCopy(text);
    if (next !== p) void commit(next);
    void writing.then((ok) => {
      setShowText(false);
      setState(ok ? { kind: 'copied', text } : { kind: 'manual', text, copied: false });
    });
  };
  const text = state.kind === 'idle' ? '' : state.text;
  const boxShown = state.kind === 'manual' || (state.kind === 'copied' && showText);
  return (
    <div class="sup-copy">
      <div class="actions">
        <button type="button" class="btn" onClick={copy} aria-describedby={describedBy}>Copy for supervision</button>
        {state.kind === 'copied' && (
          <button type="button" class="btn btn-small linklike" onClick={() => setShowText(!showText)} aria-expanded={showText}>
            {showText ? 'Hide the copied text' : 'Show the copied text'}
          </button>
        )}
      </div>
      <p class="small muted" role="status">
        {state.kind === 'copied' && 'Copied. Paste it into your supervision session in Claude Code (type /supervise first if the session has the command), then paste the result block back here.'}
        {state.kind === 'manual' && (state.copied
          ? 'Copied. Paste it into your supervision session in Claude Code.'
          : 'This browser did not let the app copy. Press Select all, then copy the selected text, and paste it into your supervision session.')}
      </p>
      {boxShown && (
        <div class="sup-box">
          <label for={`${problemKey}-packet`} class="small">The supervision block</label>
          <textarea id={`${problemKey}-packet`} ref={boxRef} class="sup-text" readOnly rows={10} value={text} />
          <button
            type="button"
            class="btn btn-small"
            onClick={() => {
              const el = boxRef.current;
              if (el === null) return;
              const ok = selectAll(el);
              if (state.kind === 'manual' && ok) setState({ ...state, copied: true });
            }}
          >
            Select all
          </button>
        </div>
      )}
    </div>
  );
}

/** What an imported result did, in plain words. */
export function importSummary(before: Readonly<Progress>, key: string, mark: number, redo: readonly string[]): string {
  const topicId = topicOfKey(key);
  const learned = before.memory[topicId] !== undefined;
  const passed = mark >= SUPERVISION_PASS_MARK;
  const parts = [`Imported: ${mark}/${SUPERVISION_MARK_MAX} for ${problemTitle(key)}.`];
  if (!learned) parts.push(`${titleOf(topicId)} is not learned yet, so its reviews are unchanged.`);
  else if (passed) parts.push(`That is ${SUPERVISION_PASS_MARK} or more, so it counts as a passed review of ${titleOf(topicId)}.`);
  else parts.push(`That is below ${SUPERVISION_PASS_MARK}, so it counts as a missed review of ${titleOf(topicId)}, and it comes back sooner.`);
  if (redo.length > 0) parts.push(`To redo, from tomorrow on Today: ${redo.map(problemTitle).join(', ')}.`);
  return parts.join(' ');
}

/** "Paste result": reads a result block and imports it. `expected` limits it to one problem. */
export function PasteResult({ expected, id }: { expected?: string; id: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const boxId = `${id}-paste`;
  const submit = (): void => {
    const p = progress.value;
    if (p === null) return;
    const parsed = parseResult(text);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const why = checkResultFor(p, parsed.value, expected);
    if (why !== null) {
      setError(why);
      return;
    }
    const r = parsed.value;
    setError(null);
    setText('');
    setOpen(false);
    setDone(importSummary(p, r.problem, r.result.mark, r.result.redo));
    void commit(importSupervisionResult(p, r, now()));
  };
  return (
    <div class="sup-paste">
      {!open && (
        <button type="button" class="btn" onClick={() => { setOpen(true); setDone(null); }}>Paste result</button>
      )}
      {open && (
        <form class="sup-paste-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <label for={boxId}>The result block from Claude</label>
          <p class="small muted" id={`${boxId}-hint`}>It starts with LEARNHUB RESULT v1 and ends with END LEARNHUB RESULT. Paste all of it.</p>
          <textarea
            id={boxId}
            rows={8}
            value={text}
            aria-describedby={`${boxId}-hint`}
            aria-invalid={error !== null}
            onInput={(e) => { setText((e.currentTarget as HTMLTextAreaElement).value); setError(null); }}
          />
          {error !== null && <p class="small error-text" role="alert">{error}</p>}
          <div class="actions">
            <button type="submit" class="btn btn-primary" disabled={text.trim() === ''}>Import result</button>
            <button type="button" class="btn" onClick={() => { setOpen(false); setError(null); }}>Cancel</button>
          </div>
        </form>
      )}
      {done !== null && <p class="small sup-done" role="status">{done}</p>}
    </div>
  );
}

/** "Due tomorrow", "Due in 3 days", "Due now", by the learner's calendar. */
export function dueLabel(t: number, due: number): string {
  if (due <= t) return 'Due now';
  const days = Math.round((new Date(`${localDay(due)}T00:00`).getTime() - new Date(`${localDay(t)}T00:00`).getTime()) / DAY_MS);
  if (days <= 0) return 'Due later today';
  return days === 1 ? 'Due tomorrow' : `Due in ${days} days`;
}

/** The route of a Cambridge problem on its own page. */
export const problemRoute = (key: string): { view: 'problem'; topicId: string; problemId: string } => ({
  view: 'problem', topicId: topicOfKey(key), problemId: key.slice(key.indexOf('/') + 1),
});

/** Today's supervision part: redos set by supervisors, copies waiting for a result, and Paste result. */
export function SupervisionToday({ p }: { p: Progress }) {
  const redos = openRedos(p);
  const waiting = waitingCopies(p);
  // Once Paste result has been offered it stays, so its message survives the import that empties the waiting list.
  const offered = useRef(false);
  if (waiting.length > 0) offered.current = true;
  if (redos.length === 0 && !offered.current) return null;
  const t = now();
  return (
    <section class="supervision-today" aria-labelledby="sup-today-title">
      <h2 id="sup-today-title">Supervision</h2>
      {redos.length > 0 && (
        <ol class="tasks">
          {redos.map((d) => {
            const due = d.due <= t;
            const weak = redoSource(p, d)?.result?.weakPoints ?? [];
            return (
              <li key={`${d.problem}-${d.from}`} class={`task task-redo${due ? ' next' : ''}`} data-redo={d.problem}>
                <div class="task-head">
                  <span class="badge badge-redo">Redo</span>
                  <span class="small muted">{dueLabel(t, d.due)}</span>
                </div>
                <h3 class="task-title">{problemTitle(d.problem)}</h3>
                <p class="small reason">Set by a supervisor, in {titleOf(topicOfKey(d.problem))}. Redo it cold, without notes.</p>
                {weak.length > 0 && (
                  <div class="small">
                    <p class="muted">Weak points from that supervision:</p>
                    <ul>{weak.map((w, i) => <li key={i}>{w}</li>)}</ul>
                  </div>
                )}
                <div class="task-foot">
                  <button type="button" class={`btn${due ? ' btn-primary' : ''}`} onClick={() => go(problemRoute(d.problem))}>Open</button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {offered.current && (
        <div class="sup-waiting">
          {waiting.length > 0 && <p class="small">Waiting for a supervision result: {waiting.map((a) => problemTitle(a.problem)).join(', ')}.</p>}
          <PasteResult id="today" />
        </div>
      )}
    </section>
  );
}
