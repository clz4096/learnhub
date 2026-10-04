/**
 * A lesson: the explanation, worked examples revealed a step at a time, then practice
 * until the topic's mastery rule is met. Every number on the page comes from the content
 * package's code. A topic without content yet gets a labelled self-report instead.
 */
import { useState } from 'preact/hooks';
import { contentFor, type Block, type TopicContent, type WorkedExample } from '@learnhub/content';
import { LEVEL_NAMES, sourceLinks, topicOf } from '@/model/courses';
import { answer, freshPractice, instanceAt, type PracticeState } from '@/model/practice';
import { ProblemCard } from '@/ui/ProblemCard';
import { Rich } from '@/ui/Rich';

export interface LessonEnd {
  passed: boolean;
  /** True when the learner said they know it, with no lesson to check. */
  selfReport: boolean;
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

function Practice({ c, salt, onEnd }: { c: TopicContent; salt: string; onEnd: (passed: boolean) => void }) {
  const [s, setS] = useState<PracticeState>(freshPractice());
  const [ended, setEnded] = useState<boolean | null>(null);
  const k = s.attempts;
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
      <ProblemCard
        key={k}
        index={k}
        mode="practice"
        topicId={c.topicId}
        instance={instanceAt(c, salt, k)}
        onDone={(r) => {
          const next = answer(s, r.correct, c.mastery);
          setS(next.state);
          if (next.outcome !== 'continue') setEnded(next.outcome === 'mastered');
        }}
      />
    </div>
  );
}

/** The lesson for a topic. `salt` makes practice problems differ between sessions. */
export function LessonRunner({ topicId, salt, onEnd, onSkip }: {
  topicId: string;
  salt: string;
  onEnd: (e: LessonEnd) => void;
  onSkip: () => void;
}) {
  const t = topicOf(topicId);
  const c = contentFor(topicId);
  const [stage, setStage] = useState<'learn' | 'examples' | 'practice'>('learn');
  if (t === undefined) return <p class="page">Unknown topic {topicId}.</p>;

  const head = (
    <header class="lesson-head">
      <p class="small muted">{LEVEL_NAMES[t.level]} lesson, about {t.estMinutes} minutes</p>
      <h1>{t.title}</h1>
      {c !== undefined && <Rich as="p" class="goal" text={c.goal} />}
    </header>
  );

  if (c === undefined) {
    return (
      <section class="page lesson">
        {head}
        <p>{t.summary}</p>
        <div class="self-report">
          <p class="badge badge-self">Self-report</p>
          <p>The lesson for this topic is not written yet. If you already know it, say so and it counts as known, with reviews to check. Otherwise leave it for another day.</p>
          <Sources topicId={topicId} />
          <div class="actions">
            <button type="button" class="btn" onClick={() => onEnd({ passed: true, selfReport: true })}>I know this already</button>
            <button type="button" class="btn btn-primary" onClick={onSkip}>Leave it for now</button>
          </div>
        </div>
      </section>
    );
  }

  const stages = [['learn', 'Learn'], ['examples', 'Examples'], ['practice', 'Practice']] as const;
  return (
    <section class="page lesson" aria-label={t.title}>
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
          <button type="button" class="btn btn-primary" onClick={() => setStage('practice')}>Next: practice</button>
        </div>
      )}
      {stage === 'practice' && <Practice c={c} salt={salt} onEnd={(passed) => onEnd({ passed, selfReport: false })} />}
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
