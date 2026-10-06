/**
 * A lesson: the explanation, worked examples revealed a step at a time, practice until
 * the topic's practice rule is met, then the Cambridge stage: the topic's gate problems,
 * one of which, done to standard, makes the topic mastered (decisions of 2026-10-05).
 * Every number on the page comes from the content package's code. A topic without content
 * yet says so and offers nothing to pass: it cannot be learned until its lesson is written
 * (design decisions 11 and 18).
 *
 * Every practice answer and every answer to a Cambridge problem is logged with its item
 * data (the engine's `ItemData`): practice when the learner moves on, a Cambridge answer
 * as soon as its result shows, since the worked solution is then seen.
 *
 * The stage and the practice run are kept for the tab (`lessonState`), so leaving a
 * lesson and coming back resumes it where it was.
 */
import type { ComponentChildren } from 'preact';
import { useRef, useState } from 'preact/hooks';
import {
  answerText, citationText, formalNumbers, grade, hasContent, lessonSections, plain, readAnswer, type Block, type CambridgeProblem, type MasteryRule, type QuickCheck,
  type SupervisionProblem, type TopicContent, type WorkedExample, type Why,
} from '@learnhub/content';
import { GATE_PASS_MARK } from '@learnhub/mastery';
import { journeyOf } from '@/model/book';
import { lessonOutline, outlineIndex, type OutlineEntry } from '@/model/lessonOutline';
import { LEVEL_NAMES, sourceLinks, titleOf, topicOf } from '@/model/courses';
import { drillItemId, masteryOf, recordCambridgeAnswer, recordDrill, waitingCopies } from '@/model/learner';
import { commit, now, progress } from '@/model/store';
import { problemKey } from '@/model/supervision';
import { CopyForSupervision, PasteResult } from '@/ui/Supervision';
import { clearPlace, loadPlace, loadWriteUp, savePlace, saveWriteUp, type LessonStage } from '@/model/lessonState';
import { answer, freshPractice, instanceAt, outcomeOf, type PracticeState } from '@/model/practice';
import { ProblemCard, type CardOutcome, type Consequence } from '@/ui/ProblemCard';
import type { Route } from '@/model/route';
import { BackLink } from '@/ui/BackLink';
import { Rich } from '@/ui/Rich';
import { AnswerInput } from '@/ui/AnswerInput';
import { TexText } from '@/ui/Tex';
import { ContentGate, ContentStatus, useTopicContent } from '@/ui/ContentGate';

export interface LessonEnd {
  passed: boolean;
}

/** A "why?" expander: the question as the summary, the answer inside, closed until opened. */
function WhyView({ w }: { w: Why }) {
  return (
    <details class="why">
      <summary><Rich text={w.q} /></summary>
      <Rich as="p" text={w.a} />
    </details>
  );
}

/**
 * An in-lesson quick check: one answer, marked by the practice graders, then the answer
 * and one line on why. It does not count towards anything. A typed answer that cannot be
 * read is not marked, as in practice.
 */
export function QuickCheckView({ b, id, topicId }: { b: QuickCheck; id: string; topicId: string }) {
  const a = b.problem.answer;
  const [text, setText] = useState('');
  const [picks, setPicks] = useState<string[]>([]);
  const [result, setResult] = useState<'right' | 'wrong' | null>(null);
  const [unread, setUnread] = useState(false);
  const check = (): void => {
    if (result !== null) return;
    if (a.kind === 'choice') {
      if (picks.length === 0) return;
      setResult(grade(b.problem, picks).correct ? 'right' : 'wrong');
      return;
    }
    if (text.trim() === '') return;
    if (a.kind !== 'table' && readAnswer(a, text) === null) {
      setUnread(true);
      return;
    }
    setResult(grade(b.problem, text).correct ? 'right' : 'wrong');
  };
  return (
    <form class="quick-check" aria-label="Check yourself" onSubmit={(e) => { e.preventDefault(); check(); }}>
      <p class="small muted qc-label">Check yourself</p>
      <Rich as="p" class="qc-prompt" text={b.problem.prompt} />
      {a.kind === 'choice'
        ? (
          <fieldset class={`choices${typeof a.correct === 'string' ? '' : ' chips'}`} disabled={result !== null}>
            <legend class="small muted">{typeof a.correct === 'string' ? 'Choose one.' : 'Choose every one that applies.'}</legend>
            {a.options.map((o) => {
              const many = typeof a.correct !== 'string';
              const on = picks.includes(o.id);
              return (
                <label key={o.id} class={`choice${on ? ' on' : ''}`}>
                  <input
                    type={many ? 'checkbox' : 'radio'}
                    name={`${id}-choice`}
                    checked={on}
                    onChange={() => setPicks(many ? (on ? picks.filter((x) => x !== o.id) : [...picks, o.id]) : [o.id])}
                  />
                  <Rich text={o.label} />
                </label>
              );
            })}
          </fieldset>
        )
        : a.kind === 'table'
          ? null
          : (
            <AnswerInput
              id={id}
              spec={a}
              topicId={topicId}
              value={text}
              disabled={result !== null}
              onChange={(v) => { setText(v); setUnread(false); }}
              invalid={unread}
              notice={unread ? 'That cannot be read yet. Finish it or use the keypad.' : undefined}
              result={result ?? undefined}
            />
          )}
      {result === null
        ? <div class="actions"><button type="submit" class="btn">Check</button></div>
        : (
          <div class={`qc-result ${result === 'right' ? 'good' : 'bad'}`} role="status">
            <p><strong>{result === 'right' ? 'Right.' : 'Not quite.'}</strong>{result === 'wrong' && <> The answer is <Rich text={answerText(a)} />.</>}</p>
            <Rich as="p" class="small" text={b.why} />
          </div>
        )}
    </form>
  );
}

/**
 * One lesson block. `num`: its number among the formal objects (`formalNumbers`), for a
 * definition or theorem. A section's heading is shown by the lesson, one section at a time.
 */
export function BlockView({ b, id, topicId, num = null }: { b: Block; id: string; topicId: string; num?: string | null }) {
  switch (b.kind) {
    case 'hook': return <Rich as="p" class="hook narr" text={b.text} />;
    case 'section': return <Rich as="h2" class="section-title" text={b.title} />;
    case 'narrative': return <Rich as="p" class="narr" text={b.text} />;
    case 'p': return b.why === undefined ? <Rich as="p" text={b.text} /> : <div class="with-why"><Rich as="p" text={b.text} /><WhyView w={b.why} /></div>;
    case 'rule': return b.why === undefined ? <Rich as="div" class="rule" text={b.text} /> : <div class="with-why"><Rich as="div" class="rule" text={b.text} /><WhyView w={b.why} /></div>;
    case 'steps':
      return (
        <div class={`steps-block${b.proof === true ? ' proof' : ''}`}>
          {b.proof === true && <p class="amspf"><em>Proof.</em></p>}
          <ol class="steps">
            {b.steps.map((st, i) => (
              <li key={i}>
                <p><strong><Rich text={st.label} /></strong>{'. '}<Rich text={st.text} /></p>
                {st.eq !== undefined && <Rich as="div" class="step-eq" text={st.eq} />}
                {st.plain !== undefined && <Rich as="p" class="step-plain small muted" text={st.plain} />}
                {st.why !== undefined && <WhyView w={st.why} />}
              </li>
            ))}
          </ol>
          {b.proof === true && <p class="qed" aria-label="End of proof">∎</p>}
        </div>
      );
    case 'definition':
      return (
        <section class="amsdef" aria-label={num === null ? 'Definition' : `Definition ${num}`}>
          <p class="ams-body">
            <span class="lab">Definition{num === null ? '' : ` ${num}`}</span> <span class="nm">(<Rich text={b.name} />)</span>. <Rich text={b.formal} />
          </p>
          <p class="plain">In plain words: <Rich text={b.plain} /></p>
        </section>
      );
    case 'theorem':
      return (
        <section class="amsthm" aria-label={num === null ? 'Theorem' : `Theorem ${num}`}>
          <p class="ams-body">
            <span class="lab">Theorem{num === null ? '' : ` ${num}`}</span>
            {b.name !== undefined && <> <span class="nm">(<Rich text={b.name} />)</span></>}
            <span class="lab">.</span> <em class="stmt"><Rich text={b.statement} /></em>
          </p>
        </section>
      );
    case 'check': return <QuickCheckView b={b} id={id} topicId={topicId} />;
    case 'pitfall':
      return (
        <aside class="pitfall" aria-label="Where it breaks">
          <p class="small muted pitfall-label">Where it breaks</p>
          <Rich as="p" text={b.claim} />
          <Rich as="p" class="pitfall-counter" text={b.counterexample} />
        </aside>
      );
    case 'takeaway': return <Rich as="p" class="takeaway" text={b.text} />;
    case 'list': return <ul>{b.items.map((x, i) => <Rich key={i} as="li" text={x} />)}</ul>;
    case 'table':
      return (
        <div class="table-wrap">
          <table>
            <Rich as="caption" text={b.caption} />
            <thead><tr>{b.head.map((h, i) => <th key={i} scope="col"><Rich text={h} /></th>)}</tr></thead>
            <tbody>{b.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}><Rich text={c} /></td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    case 'venn':
      return (
        <figure class="venn">
          <svg viewBox="0 0 320 190" role="img" aria-label={`Venn diagram of ${b.a} and ${b.b}`}>
            <rect x="4" y="4" width="312" height="182" rx="8" class="venn-box" />
            <circle cx="125" cy="98" r="72" class="venn-a" />
            <circle cx="195" cy="98" r="72" class="venn-b" />
            <text x="70" y="40" class="venn-label">{b.a}</text>
            <text x="244" y="40" class="venn-label">{b.b}</text>
            <foreignObject x="58" y="76" width="78" height="44"><div class="venn-text"><Rich text={b.onlyA} /></div></foreignObject>
            <foreignObject x="132" y="76" width="56" height="44"><div class="venn-text"><Rich text={b.both} /></div></foreignObject>
            <foreignObject x="184" y="76" width="78" height="44"><div class="venn-text"><Rich text={b.onlyB} /></div></foreignObject>
            <foreignObject x="10" y="150" width="120" height="34"><div class="venn-text left"><Rich text={b.neither} /></div></foreignObject>
          </svg>
          <Rich as="figcaption" class="small muted" text={b.caption} />
        </figure>
      );
  }
}

export function Example({ e, n }: { e: WorkedExample; n: number }) {
  const [shown, setShown] = useState(0);
  const all = shown >= e.steps.length;
  return (
    <article class="example">
      <h3>Example {n}: <Rich text={e.title} /></h3>
      {e.source !== undefined && <p class="citation small">{e.source.adapted === true ? citationText(e.source) : `From ${citationText(e.source)}`}</p>}
      <Rich as="p" class="prompt" text={e.prompt} />
      <ol>{e.steps.slice(0, shown).map((s, i) => <Rich key={i} as="li" text={s} />)}</ol>
      {all
        ? (
          <>
            <p class="small"><strong>Answer:</strong> <Rich text={e.answer} /></p>
            {e.examiner !== undefined && <p class="examiner small"><strong>What the examiner looks for:</strong> <Rich text={e.examiner} /></p>}
          </>
        )
        : (
          <div class="actions">
            <button type="button" class="btn" onClick={() => setShown(shown + 1)}>{shown === 0 ? 'Show the first step' : 'Show the next step'}</button>
            <button type="button" class="btn btn-small linklike" onClick={() => setShown(e.steps.length)}>Show all</button>
          </div>
        )}
    </article>
  );
}

function Dots({ s, need }: { s: PracticeState; need: number }) {
  return (
    <p class="streak" aria-label={`${s.streak} of ${need} right in a row`}>
      {Array.from({ length: need }, (_, i) => <span key={i} class={`dot${i < s.streak ? ' on' : ''}`} aria-hidden="true" />)}
      <span class="small muted"> {s.streak} of {need} right in a row</span>
    </p>
  );
}

/** What one practice answer does to the run, in the words the result block shows. */
export function practiceConsequence(s: PracticeState, rule: MasteryRule, o: CardOutcome): Consequence {
  const next = answer(s, o === 'correct', rule);
  const need = rule.correctInARow;
  if (o === 'correct') {
    return next.outcome === 'mastered'
      ? { effect: `That makes ${need} right in a row: the topic is learned.`, next: 'Finish the lesson' }
      : { effect: `Right in a row: ${next.state.streak} of ${need}.` };
  }
  const miss = o === 'gave-up' ? 'Showing the solution counts as a miss' : 'This counts as a miss';
  if (next.outcome === 'not-yet') {
    return { effect: `${miss}, and ${need} right in a row can no longer be reached in this run, so practice ends here.`, next: 'See the result' };
  }
  const left = rule.maxProblems - next.state.attempts;
  return { effect: `${miss}: right in a row goes back to 0. ${left} problem${left === 1 ? '' : 's'} left in this run.` };
}

function Practice({ c, salt, initial, onChange, onEnd }: {
  c: TopicContent;
  salt: string;
  initial: PracticeState;
  onChange: (s: PracticeState) => void;
  onEnd: (passed: boolean) => void;
}) {
  const [s, setS] = useState<PracticeState>(initial);
  // A run restored after it ended shows its result again, so the result is never lost.
  const [ended, setEnded] = useState<boolean | null>(() => {
    const o = outcomeOf(initial, c.mastery);
    return o === 'continue' ? null : o === 'mastered';
  });
  // A broken problem is replaced by a fresh one in the same slot; nothing is counted.
  const [fresh, setFresh] = useState({ k: -1, n: 0 });
  const k = s.attempts;
  const n = fresh.k === k ? fresh.n : 0;
  const inst = n === 0 ? instanceAt(c, salt, k) : instanceAt(c, `${salt}.fresh${n}`, k);
  if (ended !== null) {
    return ended
      ? (
        <div class="feedback good end">
          <h3>Topic learned</h3>
          <p>
            {c.mastery.correctInARow} right in a row. It is now part of what you know, and it will come back as a short review to make
            it stick. One step is left to master it: a Cambridge problem.
          </p>
          <button type="button" class="btn btn-primary" onClick={() => onEnd(true)}>Next: the Cambridge problem</button>
        </div>
      )
      : (
        <div class="feedback bad end">
          <h3>Not yet, and that is normal</h3>
          <p>
            Some topics take more than one go. It stays ready to learn and comes back in another session. Before then, a short
            check of the topics it builds on may appear, in case one of them needs a refresh.
          </p>
          <button type="button" class="btn btn-primary" onClick={() => onEnd(false)}>Continue</button>
        </div>
      );
  }
  return (
    <div class="practice">
      <Dots s={s} need={c.mastery.correctInARow} />
      <p class="small muted">Problem {k + 1}. Get {c.mastery.correctInARow} right in a row to learn the topic.</p>
      {/* Said once, before the first problem, so it does not push every later problem down. */}
      {k === 0 && (
        <p class="small muted">
          You can leave and come back: your place is kept while this tab is open. If the tab is closed, practice starts again
          and the right-in-a-row count resets.
        </p>
      )}
      <ProblemCard
        key={`${k}-${n}`}
        index={k}
        mode="practice"
        topicId={c.topicId}
        instance={inst}
        consequence={(o) => practiceConsequence(s, c.mastery, o)}
        onDone={(r) => {
          if (r.outcome === 'problem-error') {
            setFresh({ k, n: n + 1 });
            return;
          }
          const cur = progress.value;
          if (cur !== null) {
            void commit(recordDrill(cur, c.topicId, r.correct, { id: drillItemId(c.topicId, inst.generatorId), seed: inst.seed, ms: r.ms, hints: 0 }, now()));
          }
          const next = answer(s, r.correct, c.mastery);
          setS(next.state);
          onChange(next.state);
          if (next.outcome !== 'continue') setEnded(next.outcome === 'mastered');
        }}
      />
    </div>
  );
}

const WRITE_UP_KIND: Readonly<Record<SupervisionProblem['writeUp'], string>> = {
  proof: 'a proof',
  explanation: 'an explanation',
  sketch: 'a sketch, described in words or drawn on paper',
};

/** The latest imported supervision result for a problem, in one line. */
function LastResult({ k }: { k: string }) {
  const a = [...(progress.value?.supervision ?? [])].reverse().find((x) => x.problem === k && x.result !== null);
  if (a === undefined || a.result === null || a.importedAt === null) return null;
  return (
    <p class="small sup-last">
      <strong>Last supervision:</strong> {a.result.mark}/20 on {new Date(a.importedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}. {a.result.summary}
    </p>
  );
}

/**
 * A problem whose answer is a write-up. The box keeps it for the tab; Copy for supervision
 * copies it with the problem for a Claude Code session, and Paste result brings the mark back.
 */
function SupervisionCard({ topicId, p }: { topicId: string; p: SupervisionProblem }) {
  const [text, setText] = useState(() => loadWriteUp(topicId, p.id));
  const box = `sup-${p.id}`;
  const k = problemKey(topicId, p.id);
  return (
    <div class="supervision">
      <Rich as="p" class="prompt" text={p.prompt} />
      <p class="small muted">This one asks for {WRITE_UP_KIND[p.writeUp]}, so it is not marked here: it goes to a supervision session.</p>
      <label for={box}>Your write-up</label>
      <textarea
        id={box}
        rows={6}
        value={text}
        onInput={(e) => {
          const v = (e.currentTarget as HTMLTextAreaElement).value;
          setText(v);
          saveWriteUp(topicId, p.id, v);
        }}
      />
      <p id={`${box}-how`} class="small muted">
        Copy for supervision copies the problem, its source, your write-up, and your recent attempts. Paste it into a supervision
        session in Claude Code, then paste the result block it prints back here with Paste result.
      </p>
      <CopyForSupervision problemKey={k} writeUp={text} describedBy={`${box}-how`} />
      <PasteResult expected={k} id={box} />
      <LastResult k={k} />
    </div>
  );
}

/** Supervision for an auto-checked problem the app marked wrong: optional working, then the same copy. */
function WrongAnswerSupervision({ k, given }: { k: string; given: string }) {
  const [working, setWorking] = useState('');
  const id = `sup-wrong-${k.replace(/[^a-z0-9]/g, '-')}`;
  return (
    <div class="sup-wrong">
      <p class="small">Not sure why? A supervision session can go through it with you.</p>
      <label for={id} class="small">Your working (optional)</label>
      <textarea id={id} rows={3} value={working} onInput={(e) => setWorking((e.currentTarget as HTMLTextAreaElement).value)} />
      <CopyForSupervision problemKey={k} writeUp={working} checked={{ given }} />
    </div>
  );
}

/**
 * One Cambridge problem. An auto-checked answer is logged as soon as its result shows
 * (`recordCambridgeAnswer`): it is the gate's evidence, and a right one closes the
 * problem's open redos. A gate problem says so.
 */
export function CambridgeItem({ c, p, n }: { c: TopicContent; p: CambridgeProblem; n: number }) {
  // A new key remounts the card, so "Try it again" starts with an empty answer.
  const [round, setRound] = useState(0);
  const [last, setLast] = useState<string | null>(null);
  const k = problemKey(c.topicId, p.id);
  const doc = progress.value;
  // Once offered, Paste result stays, so its message survives the import that ends the wait.
  const offered = useRef(false);
  if (p.mode === 'auto' && doc !== null && waitingCopies(doc).some((a) => a.problem === k)) offered.current = true;
  const waiting = offered.current;
  return (
    <article class="cambridge-problem" data-problem={p.id} aria-labelledby={`cam-${p.id}`}>
      <h3 id={`cam-${p.id}`}>Problem {n}: <Rich text={p.title} /></h3>
      <p class="citation small">{citationText(p.source)}{p.mode === 'supervision' ? ' · for supervision' : ' · checked here'}{c.gate.includes(p.id) && ' · gate problem'}{last !== null && <span class={`badge badge-${last === 'correct' ? 'good' : 'muted'}`}>{last === 'correct' ? 'Solved' : 'Tried'}</span>}</p>
      {p.mode === 'supervision'
        ? <SupervisionCard topicId={c.topicId} p={p} />
        : (
          <ProblemCard
            key={round}
            index={round}
            idBase={`cam-${p.id}-answer`}
            mode="cambridge"
            topicId={c.topicId}
            instance={p.instance}
            afterWrong={(given) => <WrongAnswerSupervision k={k} given={given} />}
            onAnswer={(r) => {
              if (r.outcome === 'problem-error') return;
              // Logged now, not on moving on: the worked solution is on screen from here.
              const cur = progress.value;
              if (cur !== null) void commit(recordCambridgeAnswer(cur, k, r.correct, { hints: 0, ms: r.ms }, now()));
            }}
            onDone={(r) => {
              if (r.outcome !== 'problem-error') setLast(r.correct ? 'correct' : 'tried');
              setRound(round + 1);
            }}
          />
        )}
      {waiting && <PasteResult expected={k} id={`sup-${p.id}`} />}
    </article>
  );
}

/** What the gate asks, in one paragraph, for the Cambridge stage and the map. */
export function gateRule(): string {
  return `Solve one gate problem without help: the first answer you give to a problem is the one that counts, and the worked solution is shown after it. Or write one up for supervision: a mark of ${GATE_PASS_MARK} or more out of 20 counts too.`;
}

/**
 * The Cambridge stage, after practice on the main path: the topic's gate problems first,
 * then its other Cambridge problems as further practice. `passed`: the practice run was
 * passed, so this stage finishes the lesson; otherwise it leads back to practice.
 */
function CambridgeStage({ c, passed, onFinish, onPractice }: { c: TopicContent; passed: boolean; onFinish: () => void; onPractice: () => void }) {
  const doc = progress.value;
  const evidence = doc === null ? null : masteryOf(doc, c.topicId).evidence;
  const gate = c.cambridge.filter((p) => c.gate.includes(p.id));
  const others = c.cambridge.filter((p) => !c.gate.includes(p.id));
  const n = (p: CambridgeProblem): number => c.cambridge.indexOf(p) + 1;
  return (
    <div class="lesson-body">
      {evidence !== null
        ? (
          <p class="gate-met" role="status">
            {evidence.kind === 'auto' ? 'Gate met: solved unaided.' : `Gate met: a supervision mark of ${evidence.mark} out of 20.`}
            {passed ? ' With the practice passed, the topic is mastered.' : ' Pass the practice as well to master the topic.'}
          </p>
        )
        : gate.length === 0
          ? <p>No Cambridge-standard problem is written for this topic yet, so it cannot be mastered until one is. Its practice still counts, and it will be reviewed.</p>
          : <p>To master this topic, {passed ? 'one more step' : 'after its practice'}: {gateRule()}</p>}
      {gate.map((p) => <CambridgeItem key={p.id} c={c} p={p} n={n(p)} />)}
      {others.length > 0 && (
        <>
          <h3>More from the Cambridge sources</h3>
          <p class="small muted">Further practice from the same sources. They do not count towards the gate.</p>
          {others.map((p) => <CambridgeItem key={p.id} c={c} p={p} n={n(p)} />)}
        </>
      )}
      <div class="actions">
        {passed
          ? <button type="button" class="btn btn-primary" onClick={onFinish}>Finish the lesson</button>
          : <button type="button" class="btn btn-primary" onClick={onPractice}>Back to practice</button>}
      </div>
    </div>
  );
}

interface LessonProps {
  topicId: string;
  salt: string;
  onEnd: (e: LessonEnd) => void;
  onSkip: () => void;
  /** Where Back goes, shown above the lesson. Leaving keeps the lesson's place. */
  back?: { to: Route; label: string };
}

/** Where the learner is in the outline, for the header and the top bar. */
interface Position {
  outline: readonly OutlineEntry[];
  cur: number;
  done: (i: number) => boolean;
  go: (i: number) => void;
}

/** The top bar's progress: one segment per section, done, current, or ahead. No numbers. */
function Segments({ pos }: { pos: Position }) {
  const names = pos.outline.map((e) => plain(e.title));
  return (
    <div class="segs" role="img" aria-label={`Sections: ${names.map((n, i) => `${n}${i === pos.cur ? ' (you are here)' : pos.done(i) ? ' (done)' : ''}`).join(', ')}`}
      style={{ gridTemplateColumns: `repeat(${pos.outline.length}, 1fr)` }}>
      {pos.outline.map((_, i) => <i key={i} class={i === pos.cur ? 'cur' : pos.done(i) ? 'done' : undefined} />)}
    </div>
  );
}

/** The header's outline: the section names, done ones struck through, "you are here" on the current one. Each opens its section. */
function Outline({ pos }: { pos: Position }) {
  return (
    <ol class="outline" aria-label="This lesson's sections">
      {pos.outline.map((e, i) => (
        <li key={i} class={i === pos.cur ? 'cur' : pos.done(i) ? 'done' : undefined}>
          <button type="button" class="linklike" aria-current={i === pos.cur ? 'step' : undefined} onClick={() => pos.go(i)}>
            <Rich text={e.title} />
          </button>
          {i === pos.cur && <span class="here">you are here</span>}
          {i !== pos.cur && pos.done(i) && <span class="visually-hidden"> (done)</span>}
        </li>
      ))}
    </ol>
  );
}

/**
 * The lesson for a topic. `salt` makes practice problems differ between sessions. The
 * lesson's content downloads on first use; its title and the way back show meanwhile.
 */
export function LessonRunner(props: LessonProps) {
  const { topicId, onSkip, back } = props;
  const t = topicOf(topicId);
  const { state, retry } = useTopicContent(topicId);
  if (t === undefined) return <p class="page">Unknown topic {topicId}.</p>;
  // The header (TEACHING-STYLE.md, "How it looks"): the journey line, the title, the goal and
  // why, the time, and the outline of sections. No counts anywhere.
  const journey = journeyOf(topicId);
  const head = (c: TopicContent | null, pos?: Position) => (
    <header class="lesson-head">
      {back !== undefined && <BackLink to={back.to} label={back.label} />}
      <p class="journey">
        {journey === null ? `${LEVEL_NAMES[t.level]} lesson` : <>{journey.stage}<span aria-hidden="true"> › </span>{journey.chapter}</>}
      </p>
      <h1>{t.title}</h1>
      {c !== null && (
        <dl class="objective">
          <dt>Goal</dt>
          <Rich as="dd" text={c.objective ?? c.goal} />
          {c.why !== undefined && <><dt>Why</dt><Rich as="dd" text={c.why} /></>}
        </dl>
      )}
      <p class="lesson-meta">about {c?.minutes ?? t.estMinutes} min</p>
      {pos !== undefined && <Outline pos={pos} />}
    </header>
  );

  if (!hasContent(topicId)) {
    return (
      <section class="page lesson">
        {head(null)}
        <p><TexText text={t.summary} /></p>
        <div class="not-written">
          <p class="badge badge-unwritten">Lesson not written yet</p>
          <p>This topic has no lesson or problems yet, so it cannot be learned here. It stays unlearned until they are written.</p>
          <Sources topicId={topicId} />
          <div class="actions">
            <button type="button" class="btn btn-primary" onClick={onSkip}>Leave it for now</button>
          </div>
        </div>
      </section>
    );
  }

  if (state.kind !== 'ready') {
    return (
      <section class="page lesson" aria-label={t.title}>
        {head(null)}
        <ContentStatus state={state} retry={retry} what="lesson" />
      </section>
    );
  }
  return <LessonBody {...props} c={state.content} head={(pos) => head(state.content, pos)} title={t.title} />;
}

function LessonBody({ salt, onEnd, c, head, title }: LessonProps & { c: TopicContent; head: (pos: Position) => ComponentChildren; title: string }) {
  const placeKey = `${salt}.${c.topicId}`;
  const topRef = useRef<HTMLDivElement>(null);
  const [saved] = useState(() => loadPlace(placeKey));
  const outline = lessonOutline(c);
  const sections = lessonSections(c.lesson);
  const [at, setAt] = useState(() => outlineIndex(outline, saved?.stage ?? 'learn', saved?.section ?? 0));
  const [furthest, setFurthest] = useState(() => Math.max(saved?.furthest ?? 0, at));
  const [practice, setPractice] = useState<PracticeState>(saved?.practice ?? freshPractice());
  const entry = outline[at] ?? (outline[0] as OutlineEntry);
  const stage = entry.stage;
  const save = (i: number, ps: PracticeState, far: number): void => {
    const e = outline[i] ?? entry;
    savePlace(placeKey, { stage: e.stage, practice: ps, section: e.section, furthest: far });
  };
  const goTo = (i: number): void => {
    const far = Math.max(furthest, i);
    setAt(i);
    setFurthest(far);
    save(i, practice, far);
  };
  const goStage = (st: LessonStage): void => goTo(outlineIndex(outline, st));
  const end = (e: LessonEnd): void => {
    clearPlace(placeKey);
    onEnd(e);
  };

  // The practice run passed: the lesson waits at its Cambridge stage until finished.
  const passed = outcomeOf(practice, c.mastery) === 'mastered';
  const doc = progress.value;
  const gateMet = doc !== null && masteryOf(doc, c.topicId).evidence !== null;
  // Practice is done when passed and the Cambridge problem when its gate is met; a section, once moved past.
  const done = (i: number): boolean => {
    const e = outline[i];
    if (e === undefined) return false;
    if (e.stage === 'practice') return passed;
    if (e.stage === 'cambridge') return gateMet;
    return i < furthest && i !== at;
  };
  const pos: Position = { outline, cur: at, done, go: goTo };
  const nums = formalNumbers(c.lesson);
  const next = outline[at + 1];
  const nextLabel = next === undefined ? '' : next.stage === 'examples' ? 'Next: worked examples' : next.stage === 'practice' ? 'Next: practice' : `Next: ${plain(next.title)}`;
  const section = sections[entry.section];
  // Back to this section's title, for a long section read on a phone.
  const toTop = (): void => {
    const el = topRef.current;
    if (el === null) return;
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    el.focus({ preventScroll: true });
  };
  const topLink = <button type="button" class="ds-link" onClick={toTop}><span aria-hidden="true">↑ </span>Top of section</button>;
  return (
    <section class="page lesson" aria-label={title}>
      <Segments pos={pos} />
      {head(pos)}
      <div ref={topRef} tabIndex={-1} class="sec-anchor"><Rich as="h2" class="section-title" text={entry.title} /></div>
      {stage === 'learn' && section !== undefined && (
        <div class="lesson-body">
          {section.blocks.map((b, j) => {
            const i = section.start + j;
            return <BlockView key={i} b={b} id={`blk${i}`} topicId={c.topicId} num={nums[i]} />;
          })}
          <div class="ds-lessfoot">
            {topLink}
            {next !== undefined && <button type="button" class="btn btn-primary" onClick={() => goTo(at + 1)}>{nextLabel}</button>}
          </div>
        </div>
      )}
      {stage === 'examples' && (
        <div class="lesson-body">
          {c.examples.map((e, i) => <Example key={i} e={e} n={i + 1} />)}
          <div class="ds-lessfoot">
            {topLink}
            <button type="button" class="btn btn-primary" onClick={() => goStage('practice')}>Next: practice</button>
          </div>
        </div>
      )}
      {stage === 'cambridge' && <CambridgeStage c={c} passed={passed} onFinish={() => end({ passed: true })} onPractice={() => goStage('practice')} />}
      {stage === 'practice' && (
        <Practice
          c={c}
          salt={salt}
          initial={practice}
          onChange={(ps) => { setPractice(ps); save(at, ps, furthest); }}
          onEnd={(ok) => {
            // A passed run goes on to the Cambridge stage, the main path; with no Cambridge problem written, the lesson ends here.
            if (ok && c.cambridge.length > 0) goStage('cambridge');
            else end({ passed: ok });
          }}
        />
      )}
    </section>
  );
}

/** One Cambridge problem on its own page: where a redo on Today opens. */
export function ProblemView({ topicId, problemId }: { topicId: string; problemId: string }) {
  const gone = <p>That problem is not in this app any more.</p>;
  return (
    <section class="page problem-page" aria-label="Cambridge problem">
      <BackLink to={{ view: 'today' }} label="Back to today" />
      {!hasContent(topicId)
        ? gone
        : (
          <ContentGate topicId={topicId} what="problem">
            {(c) => {
              const p = c.cambridge.find((x) => x.id === problemId);
              return p === undefined
                ? gone
                : (
                  <>
                    <p class="small muted">{titleOf(topicId)}</p>
                    <CambridgeItem c={c} p={p} n={c.cambridge.indexOf(p) + 1} />
                  </>
                );
            }}
          </ContentGate>
        )}
    </section>
  );
}

export function Sources({ topicId }: { topicId: string }) {
  const t = topicOf(topicId);
  if (t === undefined) return null;
  return (
    <div class="sources">
      <h3 class="small">Where this is taught</h3>
      <ul class="small">
        {sourceLinks(t).map((s, i) => (
          <li key={i}>
            {s.url === null ? s.label : <a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>}: {s.section}
          </li>
        ))}
      </ul>
    </div>
  );
}
