/**
 * Gym mode (mastery/design-v4.html, "Gym mode"), on the gym model (model/gym.ts and the
 * engine's gym.ts): short work on learned topics for between sets, one large card at a
 * time, built for one thumb. Four tabs: Recall (recall cards, marked Again, Good, or Easy),
 * Order (tap a proof's steps back into order), Drill (due reviews and quick drills), and
 * Listen (a lesson read aloud). The rest timer is in the bar above.
 *
 * Every item is recorded with `completeGymItem`; gym work earns gym REP and never meets
 * the Cambridge gate. Each answer gives a light buzz where the device can.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { hasContent, lessonSections, plain, proofOrderSpec, proofOrderAnswer, type Rich as RichText, type TopicContent } from '@learnhub/content';
import { GYM, planDate } from '@/model/day';
import { gradeProof, type GymCandidate } from '@learnhub/mastery';
import { contentStore } from '@/model/content';
import { titleOf } from '@/model/courses';
import { planGym } from '@/model/gym';
import { completeGymItem } from '@/model/learner';
import { REVIEW_PROBLEMS, instanceAt, seedFor } from '@/model/practice';
import { commit, now, progress } from '@/model/store';
import { ProblemCard } from '@/ui/ProblemCard';
import { Rich } from '@/ui/Rich';
import { buzz } from '@/ui/shell/state';

type GymTab = 'recall' | 'order' | 'drill' | 'listen';
const GYM_TABS: readonly { id: GymTab; label: string }[] = [
  { id: 'recall', label: 'Recall' }, { id: 'order', label: 'Order' }, { id: 'drill', label: 'Drill' }, { id: 'listen', label: 'Listen' },
];
const tabOfItem = (c: GymCandidate): GymTab => (c.kind === 'review' || c.kind === 'drill' ? 'drill' : c.kind);
/** Learned topics whose content the gym downloads, soonest due first. */
const MAX_TOPICS = 16;

/** Midnight before `t` on this device: the gym's day for "done today". */
function dayStartOf(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function record(item: GymCandidate, correct: boolean, data: { hints: number; ms?: number; seed?: number } = { hints: 0 }): void {
  const p = progress.peek();
  if (p === null) return;
  buzz(15);
  void commit(completeGymItem(p, item, correct, data, now()));
}

/** The index of a part in an item id: "recall:topic#2" is 2. */
const partOf = (id: string): number => Number(id.slice(id.lastIndexOf('#') + 1));

function RecallItem({ c, item }: { c: TopicContent; item: GymCandidate }) {
  const card = c.recall?.[partOf(item.id)];
  const [shown, setShown] = useState(false);
  if (card === undefined) return null;
  return (
    <>
      <button type="button" class="ds-flash" aria-pressed={shown} onClick={() => setShown(!shown)} aria-describedby="flash-hint">
        <span class="ds-flash-l">{titleOf(c.topicId)} · {shown ? 'answer' : 'tap to turn'}</span>
        <span class="ds-flash-q">{shown ? <Rich text={card.back} /> : <Rich text={card.front} />}</span>
      </button>
      <p id="flash-hint" class="visually-hidden">Recall the answer, then turn the card and mark how it went.</p>
      <div class="ds-grade3" role="group" aria-label="How did it go?">
        <button type="button" disabled={!shown} onClick={() => record(item, false)}>Again</button>
        <button type="button" disabled={!shown} onClick={() => record(item, true)}>Good</button>
        <button type="button" disabled={!shown} onClick={() => record(item, true)}>Easy</button>
      </div>
    </>
  );
}

/** A fixed shuffle of 0..n-1 for a seed, never the identity when n > 1. */
function shuffled(n: number, seed: number): number[] {
  const xs = Array.from({ length: n }, (_, i) => i);
  let s = seed || 1;
  for (let i = n - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const j = s % (i + 1);
    [xs[i], xs[j]] = [xs[j] as number, xs[i] as number];
  }
  if (n > 1 && xs.every((x, i) => x === i)) xs.push(xs.shift() as number);
  return xs;
}

function OrderItem({ c, item }: { c: TopicContent; item: GymCandidate }) {
  const o = c.proofOrder?.[partOf(item.id)];
  const [order] = useState(() => shuffled(o?.steps.length ?? 0, seedFor(item.id, planDate(now()))));
  const [picked, setPicked] = useState<number[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);
  if (o === undefined) return null;
  const full = picked.length === o.steps.length;
  return (
    <>
      <div class="ds-card">
        <div class="ds-flash-l">{titleOf(c.topicId)} · put the steps in order</div>
        <Rich as="p" class="ds-order-t" text={o.title} />
        <ol class="ds-order-done" aria-label="Your order">
          {picked.map((i) => <li key={i}><Rich text={o.steps[i] as RichText} /></li>)}
        </ol>
        <div class="ds-order-pool" role="group" aria-label="Steps left">
          {order.filter((i) => !picked.includes(i)).map((i) => (
            <button key={i} type="button" class="ds-step" disabled={checked !== null} onClick={() => setPicked([...picked, i])}>
              <Rich text={o.steps[i] as RichText} />
            </button>
          ))}
        </div>
        {checked !== null && (
          <div class={`ds-verdict ${checked ? 'good' : 'bad'}`} role="status">
            {checked ? 'Right: that is the order the proof needs.' : 'Not this order. The proof goes:'}
            {!checked && <ol>{o.steps.map((s, i) => <li key={i}><Rich text={s} /></li>)}</ol>}
          </div>
        )}
      </div>
      <div class="ds-grade2">
        {checked === null
          ? (
            <>
              <button type="button" disabled={picked.length === 0} onClick={() => setPicked(picked.slice(0, -1))}>Undo</button>
              <button type="button" class="ds-btn" disabled={!full} onClick={() => setChecked(gradeProof(proofOrderAnswer(picked), proofOrderSpec(o)).correct)}>Check</button>
            </>
          )
          : <button type="button" class="ds-btn wide" onClick={() => record(item, checked)}>Next</button>}
      </div>
    </>
  );
}

function DrillItem({ c, item }: { c: TopicContent; item: GymCandidate }) {
  const [results, setResults] = useState<boolean[]>([]);
  const [fresh, setFresh] = useState(0);
  const salt = `gym-${planDate(now())}-${item.id}-${fresh}`;
  let inst;
  if (item.kind === 'drill') {
    const gid = item.id.slice(item.id.indexOf('/') + 1);
    const g = c.generators.find((x) => x.id === gid);
    if (g === undefined) return null;
    inst = g.instance(seedFor(c.topicId, salt));
  } else inst = instanceAt(c, salt, results.length);
  const need = item.kind === 'review' ? REVIEW_PROBLEMS : 1;
  return (
    <div class="ds-card">
      <div class="ds-flash-l">{titleOf(c.topicId)} · {item.kind === 'review' ? 'review, two problems' : 'quick drill'}</div>
      <ProblemCard
        key={`${item.id}-${results.length}-${fresh}`}
        topicId={c.topicId} instance={inst} mode={item.kind === 'review' ? 'review' : 'practice'} index={results.length}
        consequence={(o) => ({
          effect: o === 'correct' ? 'Right. Gym work keeps the topic fresh; it never counts toward the Cambridge gate.' : 'Missed: the topic comes back for a real review soon.',
          next: results.length + 1 >= need ? 'Next card' : 'Next problem',
        })}
        onDone={(r) => {
          if (r.outcome === 'problem-error') { setFresh(fresh + 1); return; }
          const rs = [...results, r.correct];
          if (rs.length >= need) record(item, rs.every(Boolean), { hints: 0, ms: r.ms, seed: inst.seed });
          else setResults(rs);
        }}
      />
    </div>
  );
}

/** The lesson's words in reading order, for the speech synthesiser. */
function lessonWords(c: TopicContent): string {
  const out: string[] = [];
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) {
      if (v.length > 0 && v.every((x) => typeof x === 'object' && x !== null && typeof (x as { text?: unknown }).text === 'string' && 'kind' in x)) {
        out.push(plain(v as RichText));
        return;
      }
      v.forEach(walk);
    } else if (typeof v === 'object' && v !== null) Object.values(v).forEach(walk);
  };
  for (const s of lessonSections(c.lesson)) walk(s.blocks);
  return out.join(' ');
}

function ListenItem({ c, item }: { c: TopicContent; item: GymCandidate }) {
  const synth = typeof speechSynthesis === 'undefined' ? null : speechSynthesis;
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => () => synth?.cancel(), [item.id]);
  const play = (): void => {
    if (synth === null) return;
    if (speaking) { synth.cancel(); setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(lessonWords(c));
    u.lang = 'en-GB';
    u.onend = () => setSpeaking(false);
    synth.speak(u);
    setSpeaking(true);
  };
  return (
    <>
      <div class="ds-card ds-listen">
        <div class="ds-flash-l">Listen · about {item.minutes} min</div>
        <p class="ds-flash-q">{titleOf(c.topicId)}</p>
        {synth === null && <p class="ds-note">This browser cannot read aloud. Open the lesson to read it instead.</p>}
      </div>
      <div class="ds-grade2">
        <button type="button" disabled={synth === null} aria-pressed={speaking} onClick={play}>{speaking ? 'Stop' : 'Play'}</button>
        <button type="button" class="ds-btn" onClick={() => { synth?.cancel(); record(item, true); }}>Done</button>
      </div>
    </>
  );
}

export function GymView() {
  const p = progress.value;
  const [contents, setContents] = useState<TopicContent[] | null>(null);
  const [failed, setFailed] = useState(false);
  const learned = p === null ? [] : Object.entries(p.memory).filter(([id]) => hasContent(id)).sort((a, b) => a[1].due - b[1].due).slice(0, MAX_TOPICS).map(([id]) => id);
  const key = learned.join();
  useEffect(() => {
    let live = true;
    Promise.all(learned.map((id) => contentStore.load(id).catch(() => undefined))).then((cs) => {
      if (!live) return;
      const got = cs.filter((c): c is TopicContent => c !== undefined);
      setFailed(got.length < learned.length);
      setContents(got);
    }, () => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [key]);
  const t = now();
  const plan = useMemo(() => (p === null || contents === null ? [] : planGym(p, contents, t, GYM, dayStartOf(t))), [p, contents]);
  const counts = Object.fromEntries(GYM_TABS.map((x) => [x.id, plan.filter((c) => tabOfItem(c) === x.id).length])) as Record<GymTab, number>;
  const [tab, setTab] = useState<GymTab | null>(null);
  const cur: GymTab = tab ?? GYM_TABS.find((x) => counts[x.id] > 0)?.id ?? 'recall';
  const item = plan.find((c) => tabOfItem(c) === cur);
  const content = item === undefined ? undefined : contents?.find((c) => c.topicId === item.topicId);
  if (p === null) return null;

  return (
    <section class="ds-page ds-gym" aria-labelledby="gym-title">
      <h1 id="gym-title" class="visually-hidden">Gym</h1>
      <div class="ds-subtabs" role="tablist" aria-label="Gym work">
        {GYM_TABS.map((x) => (
          <button
            key={x.id} type="button" role="tab" id={`gt-${x.id}`} aria-selected={cur === x.id} aria-controls="gym-panel"
            onClick={() => setTab(x.id)}
          >
            {x.label}{contents !== null && <span class="visually-hidden">, {counts[x.id]} left</span>}
          </button>
        ))}
      </div>
      <div id="gym-panel" role="tabpanel" aria-labelledby={`gt-${cur}`}>
        {contents === null
          ? <p class="ds-note">Getting the topics ready.</p>
          : learned.length === 0
            ? <p class="ds-note">The gym works on learned topics. Learn a lesson first, and its cards come here.</p>
            : item === undefined || content === undefined
              ? <p class="ds-note">{plan.length === 0 ? 'Nothing is left for the gym today. Well done.' : `Nothing left in ${GYM_TABS.find((x) => x.id === cur)?.label}. Try another tab.`}</p>
              : (
                <div key={item.id}>
                  {item.kind === 'recall' && <RecallItem c={content} item={item} />}
                  {item.kind === 'order' && <OrderItem c={content} item={item} />}
                  {(item.kind === 'drill' || item.kind === 'review') && <DrillItem c={content} item={item} />}
                  {item.kind === 'listen' && <ListenItem c={content} item={item} />}
                </div>
              )}
        {failed && <p class="ds-note" role="status">Some topics could not be downloaded; the gym uses the rest.</p>}
      </div>
      <p class="ds-meta ds-center">{contents === null || learned.length === 0 ? '' : `${counts[cur]} left here · a light buzz on each answer · never counts toward the Cambridge gate`}</p>
    </section>
  );
}
