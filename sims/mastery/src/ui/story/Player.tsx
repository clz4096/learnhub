/**
 * The cut scene player (mastery/DESIGN-STORY.md, "Presentation"), ported from the approved
 * prototype (book-mockup/prologue.html): full screen over the app, the 16:9 art
 * letterboxed into any viewport, letterbox bars that open after the title card,
 * typewriter lines with speaker names, a choice panel, a skip button, and an end card
 * with what changed and what plays next.
 *
 * Tap or click the frame, or press Space or Enter, to finish the line being typed, then to
 * go on. Escape skips to the end card, and closes it. With reduced motion there is no
 * parallax or animation and lines appear whole. On a narrow or portrait screen the lines
 * sit below the art, in the letterbox, so they never cover it or run off the frame.
 *
 * The state from line to line is the pure player in model/story.ts; this file is timing,
 * focus, and markup. A play that reaches the end card is recorded once.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { campaign } from '@/model/campaignStore';
import { loadDays } from '@/model/dayLog';
import { now, progress } from '@/model/store';
import {
  advance, choose, completeScene, expand, firedFx, nextScene, numbersOf, repOf, skip, startPlayer, triggerText,
  type PlayerState, type Scene, type Script, type StoryNumbers,
} from '@/model/story';
import { SCENES, sceneById } from '@/model/storyScenes';
import { storyFacts } from '@/model/storyFacts';
import { playing, saveStory, story } from '@/model/storyStore';
import { ART } from '@/ui/story/art';

const TITLE_MS = 2600;
const TITLE_MS_REDUCED = 300;
const TYPE_MS = 22;
const TYPE_STEP = 2;

function prefersReducedMotion(): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function closePlayer(): void {
  playing.value = null;
}

/** The scene on screen, if any. */
export function StoryPlayer() {
  const p = playing.value;
  const scene = p === null ? undefined : sceneById(p.id);
  useEffect(() => {
    if (p !== null && (scene === undefined || scene.script === null)) closePlayer();
  }, [p, scene]);
  if (p === null || scene === undefined || scene.script === null) return null;
  return <Play key={p.id} scene={scene} script={scene.script} />;
}

/** The numbers a play reads: as queued for a triggered play, as first played for a replay, else now. */
function numbersFor(id: string, live: StoryNumbers): StoryNumbers {
  const st = story.peek();
  return st.queued.find((q) => q.id === id)?.n ?? st.seen[id]?.n ?? live;
}

function Play({ scene, script }: { scene: Scene; script: Script }) {
  const reduce = useMemo(prefersReducedMotion, []);
  const live = useMemo(() => storyFacts(progress.peek(), campaign.peek(), loadDays(), now()), []);
  const n = useMemo(() => numbersFor(scene.id, numbersOf(live)), [scene.id, live]);
  const ctx = useMemo(() => ({ n }), [n]);
  const seq = useMemo(() => expand(script, ctx), [script, ctx]);
  const [play, setPlay] = useState(0);
  const [st, setSt] = useState<PlayerState>(() => startPlayer(seq));
  const [shown, setShown] = useState('');
  const [record, setRecord] = useState<{ before: typeof story.value; after: typeof story.value } | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const firstChoice = useRef<HTMLButtonElement>(null);
  const endBtn = useRef<HTMLButtonElement>(null);
  const rep = repOf(live);

  // Focus moves into the player and back to where it was; the page behind does not scroll.
  useEffect(() => {
    const was = document.activeElement as HTMLElement | null;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = 'hidden';
    stage.current?.focus();
    return () => {
      root.style.overflow = overflow;
      if (was !== null && was.isConnected) was.focus();
    };
  }, []);

  // The title card, then the first line.
  useEffect(() => {
    if (st.phase !== 'title') return;
    const id = setTimeout(() => setSt((s) => (s.phase === 'title' ? advance(s) : s)), reduce ? TITLE_MS_REDUCED : TITLE_MS);
    return () => clearTimeout(id);
  }, [st.phase, play, reduce]);

  const cur = st.phase === 'lines' ? st.seq[st.i] : undefined;
  const text = cur !== undefined && cur.kind !== 'choice' ? cur.text : '';

  // The typewriter: two characters every 22 ms; whole at once with reduced motion.
  useEffect(() => {
    if (reduce || text === '') {
      setShown(text);
      return;
    }
    let k = 0;
    setShown('');
    const id = setInterval(() => {
      k += TYPE_STEP;
      setShown(text.slice(0, k));
      if (k >= text.length) clearInterval(id);
    }, TYPE_MS);
    return () => clearInterval(id);
  }, [text, st.i, play, reduce]);

  const typing = shown.length < text.length;
  const choosing = cur?.kind === 'choice';

  useEffect(() => {
    if (choosing) firstChoice.current?.focus();
  }, [choosing, st.i]);

  // Reaching the end card records the play, once.
  useEffect(() => {
    if (st.phase !== 'end' || record !== null) return;
    const before = story.peek();
    const after = completeScene(SCENES, before, scene.id, st.chosen, n, rep, now());
    saveStory(after);
    setRecord({ before, after });
    endBtn.current?.focus();
  }, [st.phase, record]);

  const next = (): void => {
    if (st.phase !== 'lines') return;
    if (typing) {
      setShown(text);
      return;
    }
    setSt(advance);
  };

  const replay = (): void => {
    setSt(startPlayer(seq));
    setRecord(null);
    setShown('');
    setPlay((x) => x + 1);
    stage.current?.focus();
  };

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (st.phase === 'end') closePlayer();
      else setSt(skip);
      return;
    }
    if (e.target instanceof HTMLButtonElement) return;
    if ((e.key === ' ' || e.key === 'Enter') && !choosing) {
      e.preventDefault();
      next();
    }
  };

  const onFrameClick = (e: MouseEvent): void => {
    const t = e.target as Element | null;
    if (t?.closest('.sp-choices, .sp-end, .sp-skip') != null) return;
    if (!choosing) next();
  };

  const Art = scene.art === null ? null : ART[scene.art];
  const fx = firedFx(st);
  const nowFx = cur !== undefined && cur.kind !== 'choice' ? cur.fx : null;
  const t = st.seq.length === 0 ? 0 : Math.max(0, st.i) / st.seq.length;
  const label = `${scene.kicker}: ${scene.title}`;
  const after = scene.script === null ? undefined : nextScene(SCENES, scene.id);

  return (
    <div
      ref={stage} class={`sp-stage${reduce ? ' sp-reduce' : ''}`} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}
      onKeyDown={onKey} onClick={onFrameClick}
    >
      <div class="sp-box">
        <div class={`sp-frame${st.phase !== 'title' ? ' sp-open' : ''}`}>
          {Art !== null && <Art fx={fx} now={nowFx} t={t} reduce={reduce} />}
          <div class="sp-bar sp-bar-top" /><div class="sp-bar sp-bar-bot" />
        </div>
        {st.phase === 'lines' && cur !== undefined && (
          <div class="sp-dlg">
            {cur.kind === 'choice' ? (
              <>
                <div class="sp-who">Your reply</div>
                <div class="sp-choices" role="group" aria-label="Your reply">
                  {cur.options.map((o, i) => (
                    <button
                      key={o.id} type="button" ref={i === 0 ? firstChoice : undefined}
                      onClick={(e) => { e.stopPropagation(); setSt((s) => choose(s, o.id, ctx)); }}
                    >
                      {o.text} <small>{o.note}</small>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div class={`sp-who${cur.kind === 'narration' ? ' sp-narr' : cur.kind === 'message' ? ' sp-msg' : ''}`}>{cur.speaker ?? 'Narration'}</div>
                <div class={`sp-txt${cur.kind === 'inner' ? ' sp-inner' : ''}`} aria-hidden="true">{shown}</div>
                <p class="visually-hidden" aria-live="polite">{cur.speaker === null ? '' : `${cur.speaker}: `}{cur.text}</p>
                <div class="sp-hint" aria-hidden="true">tap to continue</div>
              </>
            )}
          </div>
        )}
      </div>
      {st.phase !== 'end' && (
        <button type="button" class="sp-skip" onClick={(e) => { e.stopPropagation(); setSt(skip); }}>Skip</button>
      )}
      <div class={`sp-title${st.phase === 'title' ? '' : ' sp-hide'}`} aria-hidden={st.phase === 'title' ? undefined : 'true'}>
        <div>
          <div class="sp-k">{scene.kicker}</div>
          <h1>{scene.title}</h1>
          <div class="sp-p">{scene.place}</div>
        </div>
      </div>
      {st.phase === 'end' && record !== null && (
        <div class="sp-end">
          <div>
            <div class="sp-k">{scene.kicker} complete</div>
            <h2>{scene.title}</h2>
            <ul>
              {script.endCard.map((item) => (
                <li key={item.label}>
                  <span>{item.label}</span>
                  <span>
                    {item.value({
                      n, rep, repBefore: record.before.rep, chosen: record.after.choices[scene.id] ?? {},
                      before: record.before.relationships, after: record.after.relationships,
                    })}
                  </span>
                </li>
              ))}
            </ul>
            {after !== undefined && (
              <div class="sp-next">
                Next: <b>{after.title}</b>{after.script === null ? ', not yet written' : ''}. It {triggerText(after.trigger)}.
              </div>
            )}
            <div class="sp-end-actions">
              <button type="button" ref={endBtn} onClick={closePlayer}>Continue</button>
              <button type="button" onClick={replay}>Replay scene</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
