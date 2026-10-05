/**
 * A lesson: the explanation, worked examples revealed a step at a time, then practice
 * until the topic's mastery rule is met. Every number on the page comes from the content
 * package's code. A topic without content yet says so and offers nothing to pass: it
 * cannot be learned until its lesson is written (design decisions 11 and 18).
 *
 * The stage and the practice run are kept for the tab (`lessonState`), so leaving a
 * lesson and coming back resumes it where it was.
 */
import type { ComponentChildren } from 'preact';
import { useRef, useState } from 'preact/hooks';
import {
  citationText, hasContent, type Block, type CambridgeProblem, type MasteryRule, type SupervisionProblem, type TopicContent, type WorkedExample,
} from '@learnhub/content';
import { LEVEL_NAMES, sourceLinks, titleOf, topicOf } from '@/model/courses';
import { completeRedoByCheck, waitingCopies } from '@/model/learner';
import { commit, now, progress } from '@/model/store';
import { problemKey } from '@/model/supervision';
import { CopyForSupervision, PasteResult } from '@/ui/Supervision';
import { clearPlace, loadPlace, loadWriteUp, savePlace, saveWriteUp, type LessonStage } from '@/model/lessonState';
import { answer, freshPractice, instanceAt, outcomeOf, type PracticeState } from '@/model/practice';
import { ProblemCard, type CardOutcome, type Consequence } from '@/ui/ProblemCard';
import type { Route } from '@/model/route';
import { BackLink } from '@/ui/BackLink';
import { Rich } from '@/ui/Rich';
import { TexText } from '@/ui/Tex';
import { ContentGate, ContentStatus, useTopicContent } from '@/ui/ContentGate';

export interface LessonEnd {
  passed: boolean;
}

function BlockView({ b }: { b: Block }) {
  switch (b.kind) {
    case 'p': return <Rich as="p" text={b.text} />;
    case 'rule': return <Rich as="div" class="rule" text={b.text} />;
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

function Example({ e, n }: { e: WorkedExample; n: number }) {
  const [shown, setShown] = useState(0);
  const all = shown >= e.steps.length;
  return (
    <article class="example">
      <h3>Example {n}: <Rich text={e.title} /></h3>
      {e.source !== undefined && <p class="citation small">{e.source.adapted === true ? citationText(e.source) : `From ${citationText(e.source)}`}</p>}
      <Rich as="p" class="prompt" text={e.prompt} />
      <ol>{e.steps.slice(0, shown).map((s, i) => <Rich key={i} as="li" text={s} />)}</ol>
      {all
        ? <p class="small"><strong>Answer:</strong> <Rich text={e.answer} /></p>
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
  if (ended !== null) {
    return ended
      ? (
        <div class="feedback good end">
          <h3>Topic learned</h3>
          <p>{c.mastery.correctInARow} right in a row. It is now part of what you know, and it will come back as a short review to make it stick.</p>
          <button type="button" class="btn btn-primary" onClick={() => onEnd(true)}>Continue</button>
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
        instance={n === 0 ? instanceAt(c, salt, k) : instanceAt(c, `${salt}.fresh${n}`, k)}
        consequence={(o) => practiceConsequence(s, c.mastery, o)}
        onDone={(r) => {
          if (r.outcome === 'problem-error') {
            setFresh({ k, n: n + 1 });
            return;
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
      <p class="citation small">{citationText(p.source)}{p.mode === 'supervision' ? ' · for supervision' : ' · checked here'}{last !== null && <span class={`badge badge-${last === 'correct' ? 'good' : 'muted'}`}>{last === 'correct' ? 'Solved' : 'Tried'}</span>}</p>
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
            onDone={(r) => {
              if (r.outcome !== 'problem-error') setLast(r.correct ? 'correct' : 'tried');
              // A right answer here is measured, so it closes a redo a supervisor set on this problem.
              const cur = progress.value;
              if (r.correct && cur !== null) {
                const next = completeRedoByCheck(cur, k, now());
                if (next !== cur) void commit(next);
              }
              setRound(round + 1);
            }}
          />
        )}
      {waiting && <PasteResult expected={k} id={`sup-${p.id}`} />}
    </article>
  );
}

/** The original Cambridge problems of a topic. They do not count towards learning the topic; practice does. */
function CambridgeProblems({ c, onNext }: { c: TopicContent; onNext: () => void }) {
  const auto = c.cambridge.filter((p) => p.mode === 'auto').length;
  return (
    <div class="lesson-body">
      <p>
        The original problems from the Cambridge sources this lesson is built on, each with its source. {auto} of {c.cambridge.length} are
        checked here; the others ask for a proof or an explanation and go to supervision. They do not count towards learning the topic.
      </p>
      {c.cambridge.map((p, i) => <CambridgeItem key={p.id} c={c} p={p} n={i + 1} />)}
      <button type="button" class="btn btn-primary" onClick={onNext}>Next: practice</button>
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

/**
 * The lesson for a topic. `salt` makes practice problems differ between sessions. The
 * lesson's content downloads on first use; its title and the way back show meanwhile.
 */
export function LessonRunner(props: LessonProps) {
  const { topicId, onSkip, back } = props;
  const t = topicOf(topicId);
  const { state, retry } = useTopicContent(topicId);
  if (t === undefined) return <p class="page">Unknown topic {topicId}.</p>;
  const head = (c: TopicContent | null) => (
    <header class="lesson-head">
      {back !== undefined && <BackLink to={back.to} label={back.label} />}
      <p class="small muted">{LEVEL_NAMES[t.level]} lesson, about {t.estMinutes} minutes</p>
      <h1>{t.title}</h1>
      {c !== null && <Rich as="p" class="goal" text={c.goal} />}
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
  return <LessonBody {...props} c={state.content} head={head(state.content)} title={t.title} />;
}

function LessonBody({ salt, onEnd, c, head, title }: LessonProps & { c: TopicContent; head: ComponentChildren; title: string }) {
  const placeKey = `${salt}.${c.topicId}`;
  const [saved] = useState(() => loadPlace(placeKey));
  const [stage, setStageState] = useState<LessonStage>(saved?.stage ?? 'learn');
  const [practice, setPractice] = useState<PracticeState>(saved?.practice ?? freshPractice());
  const setStage = (st: LessonStage): void => {
    setStageState(st);
    savePlace(placeKey, { stage: st, practice });
  };
  const end = (e: LessonEnd): void => {
    clearPlace(placeKey);
    onEnd(e);
  };

  const stages = [['learn', 'Learn'], ['examples', 'Examples'], ['cambridge', 'Cambridge problems'], ['practice', 'Practice']] as const;
  return (
    <section class="page lesson" aria-label={title}>
      {head}
      <nav class="stages" aria-label="Lesson parts">
        {stages.map(([id, label], i) => (
          <button key={id} type="button" class={`stage${stage === id ? ' on' : ''}`} aria-current={stage === id ? 'step' : undefined}
            onClick={() => setStage(id)}>
            {i + 1}. {label}
          </button>
        ))}
      </nav>
      {stage === 'learn' && (
        <div class="lesson-body">
          {c.lesson.map((b, i) => <BlockView key={i} b={b} />)}
          <button type="button" class="btn btn-primary" onClick={() => setStage('examples')}>Next: worked examples</button>
        </div>
      )}
      {stage === 'examples' && (
        <div class="lesson-body">
          {c.examples.map((e, i) => <Example key={i} e={e} n={i + 1} />)}
          <div class="actions">
            <button type="button" class="btn btn-primary" onClick={() => setStage('practice')}>Next: practice</button>
            {c.cambridge.length > 0 && <button type="button" class="btn" onClick={() => setStage('cambridge')}>Cambridge problems</button>}
          </div>
        </div>
      )}
      {stage === 'cambridge' && <CambridgeProblems c={c} onNext={() => setStage('practice')} />}
      {stage === 'practice' && (
        <Practice
          c={c}
          salt={salt}
          initial={practice}
          onChange={(ps) => { setPractice(ps); savePlace(placeKey, { stage: 'practice', practice: ps }); }}
          onEnd={(passed) => end({ passed })}
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
