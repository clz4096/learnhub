/**
 * One problem: the prompt, an input that fits the answer type, Check, then feedback and
 * the worked solution. Used by lesson practice, reviews, quizzes, and placement, so every
 * answer in the app is graded by the same runtime (content/src/problem.ts).
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { answerText, grade, type Feedback, type Instance, type Response } from '@learnhub/content';
import { formatExpression, parseExpression } from '@learnhub/mastery';
import { Rich, mathNodes } from '@/ui/Rich';

export type CardMode = 'practice' | 'review' | 'quiz' | 'placement';

export interface CardResult {
  correct: boolean;
  response: Response | null;
}

const RIGHT = ['Right.', 'Correct.', 'Yes, that is it.'];

function inputHint(i: Instance): string {
  const a = i.problem.answer;
  switch (a.kind) {
    case 'exact': return 'A whole number, a fraction like 3/8, or an exact decimal.';
    case 'numeric': return 'A number, for example 0.125 or 3/8.';
    case 'expression': return `An expression in ${a.variables.join(' and ')}. Use ^ for powers, for example x^2 + 3x. Multiplication signs are optional.`;
    case 'choice': return typeof a.correct === 'string' ? 'Choose one.' : 'Choose every one that applies.';
  }
}

export function ProblemCard({ topicId, instance, mode, index, onDone }: {
  /** With the generator id and seed (data attributes), enough to reproduce the problem in a bug report. */
  topicId: string;
  instance: Instance;
  mode: CardMode;
  /** Changes for each new problem, so state resets. */
  index: number;
  onDone: (r: CardResult) => void;
}) {
  const a = instance.problem.answer;
  const [text, setText] = useState('');
  const [picks, setPicks] = useState<string[]>([]);
  const [fb, setFb] = useState<Feedback | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const id = `p${index}`;

  useEffect(() => {
    setText('');
    setPicks([]);
    setFb(null);
    setGaveUp(false);
    inputRef.current?.focus({ preventScroll: true });
  }, [index]);
  useEffect(() => {
    if (fb !== null || gaveUp) nextRef.current?.focus({ preventScroll: true });
  }, [fb, gaveUp]);

  const response: Response = a.kind === 'choice' ? picks : text;
  const empty = a.kind === 'choice' ? picks.length === 0 : text.trim() === '';
  const checked = fb !== null || gaveUp;

  const check = (): void => {
    if (checked || empty) return;
    setFb(grade(instance.problem, response, instance.misconceptions));
  };
  const finish = (): void => onDone({ correct: fb?.correct === true, response: gaveUp ? null : response });

  const preview = (() => {
    if (a.kind !== 'expression' || text.trim() === '') return null;
    const r = parseExpression(text, a.variables);
    return r.ok ? formatExpression(r.value) : null;
  })();

  const toggle = (opt: string): void => {
    if (checked) return;
    // Functional updates, so quick taps in a row each see the previous one.
    if (a.kind === 'choice' && typeof a.correct === 'string') setPicks([opt]);
    else setPicks((cur) => (cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt]));
  };
  const many = a.kind === 'choice' && a.options.length > 6;

  return (
    <div class={`problem problem-${mode}`} data-topic={topicId} data-generator={instance.generatorId} data-seed={instance.seed}>
      <Rich as="p" class="prompt" text={instance.problem.prompt} />
      <form
        class="answer"
        onSubmit={(e) => { e.preventDefault(); if (checked) finish(); else check(); }}
      >
        {a.kind === 'choice' ? (
          <fieldset class={`choices${many ? ' chips' : ''}`} disabled={checked}>
            <legend class="small muted">{inputHint(instance)}</legend>
            {a.options.map((o) => {
              const on = picks.includes(o.id);
              const right = checked && (typeof a.correct === 'string' ? a.correct === o.id : a.correct.includes(o.id));
              return (
                <label key={o.id} class={`choice${on ? ' on' : ''}${checked && right ? ' right' : ''}${checked && on && !right ? ' wrong' : ''}`}>
                  <input
                    type={typeof a.correct === 'string' ? 'radio' : 'checkbox'}
                    name={`${id}-choice`}
                    value={o.id}
                    checked={on}
                    onChange={() => toggle(o.id)}
                  />
                  <Rich text={o.label} />
                </label>
              );
            })}
          </fieldset>
        ) : (
          <div class="field">
            <label for={`${id}-input`}>Your answer</label>
            <input
              ref={inputRef}
              id={`${id}-input`}
              type="text"
              autocomplete="off"
              autocapitalize="off"
              spellcheck={false}
              inputMode={a.kind === 'expression' ? 'text' : 'decimal'}
              value={text}
              disabled={checked}
              aria-describedby={`${id}-hint`}
              onInput={(e) => setText((e.currentTarget as HTMLInputElement).value)}
            />
            <span id={`${id}-hint`} class="small muted">{inputHint(instance)}</span>
            {preview !== null && !checked && <span class="small preview">Read as: <span class="math">{mathNodes(preview)}</span></span>}
          </div>
        )}
        <div class="actions">
          {!checked && (
            <>
              <button type="submit" class="btn btn-primary" disabled={empty}>Check</button>
              {(mode === 'placement' || mode === 'practice') && (
                <button type="button" class="btn" onClick={() => setGaveUp(true)}>
                  {mode === 'placement' ? 'I do not know this' : 'Show me how'}
                </button>
              )}
            </>
          )}
          {checked && <button ref={nextRef} type="submit" class="btn btn-primary">Continue</button>}
        </div>
      </form>
      <div class="feedback-area" role="status" aria-live="polite">
        {fb !== null && fb.correct && (
          <div class="feedback good">
            <p><strong>{RIGHT[index % RIGHT.length]}</strong>{fb.feedback ? ` ${fb.feedback}` : ''}</p>
          </div>
        )}
        {((fb !== null && !fb.correct) || gaveUp) && (
          <div class="feedback bad">
            {gaveUp
              ? <p><strong>That is fine.</strong> {mode === 'placement' ? 'This topic will start with a lesson.' : 'Here is how it goes.'}</p>
              : <p><strong>Not quite.</strong> {fb?.misconception ? <Rich text={fb.misconception} /> : (fb?.feedback ?? 'Compare with the solution below.')}</p>}
            {mode !== 'placement' && (
              <div class="solution">
                <p class="small muted">The answer: <Rich text={answerText(a)} /></p>
                <ol>{instance.problem.solution.map((s, i) => <Rich key={i} as="li" text={s} />)}</ol>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
