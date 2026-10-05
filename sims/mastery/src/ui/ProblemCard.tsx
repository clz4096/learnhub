/**
 * One problem: the prompt, an input that fits the answer type, Check, then the result and
 * the worked solution. Used by lesson practice, reviews, and quizzes, so every answer in
 * the app is graded by the same runtime (content/src/problem.ts).
 *
 * The answer rules (design pass 2, phase 0):
 * - Text that cannot be read is never graded: the field says so and keeps focus.
 * - Text read in a form the question does not ask for (a calculation where a value is
 *   asked, a ratio where a fraction is asked) asks first: Edit, or Check anyway.
 * - A broken problem is never the learner's miss: the runner replaces it.
 *
 * The result block sits directly under the answer and above the buttons, and is scrolled
 * into view. A wrong answer shows "Incorrect", the learner's answer beside the correct
 * one, the likely slip, the full worked solution, and one line on what it does to
 * progress (from the runner, which owns the rules).
 *
 * A screen reader hears one short assertive line ("Incorrect. Your answer 10. Correct
 * answer 5."). After a right answer focus goes to the button that moves on, so the fast
 * path stays one key; after any other result it goes to the result heading, so Enter does
 * nothing until the learner moves on deliberately. Enter is also ignored for a moment
 * after a result appears, so a double press cannot skip it.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  answerText, grade, plain, readAnswer, tableNotice, texToPlain, type AnswerReading, type Feedback, type Instance, type Response,
} from '@learnhub/content';
import { isProblemError } from '@learnhub/mastery';
import { AnswerInput } from '@/ui/AnswerInput';
import { Rich } from '@/ui/Rich';
import { FilledTable, TableAnswer } from '@/ui/TableAnswer';
import { Tex } from '@/ui/Tex';

/** `cambridge`: an original Cambridge problem in a lesson; it does not count towards mastery and can be tried again. */
export type CardMode = 'practice' | 'review' | 'quiz' | 'cambridge';

/** How an answered problem ended, as the learner's measured result. */
export type CardOutcome = 'correct' | 'wrong' | 'gave-up';

export interface CardResult {
  /** `problem-error`: the problem is broken. The runner replaces it and counts nothing. */
  outcome: CardOutcome | 'problem-error';
  correct: boolean;
  response: Response | null;
}

/** What a result does to progress, from the runner's own rules, and the label of the button that moves on. */
export interface Consequence {
  effect: string;
  next?: string;
}

/** Enter is ignored this long after a result appears. */
export const ENTER_GUARD_MS = 500;

function choiceHint(correct: string | readonly string[]): string {
  return typeof correct === 'string' ? 'Choose one.' : 'Choose every one that applies.';
}

function reducedMotion(): boolean {
  try {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Scrolls the result into view when its heading or the correct answer is hidden: under the
 * sticky header, or below the bottom of the screen (on a phone it usually is).
 */
function reveal(block: HTMLElement): void {
  const header = document.querySelector('.top')?.getBoundingClientRect().bottom ?? 0;
  const top = block.getBoundingClientRect().top;
  const key = block.querySelector('.result-pair, .result-head')?.getBoundingClientRect().bottom ?? top;
  const gap = 8;
  if (top >= header + gap && key <= window.innerHeight - gap) return;
  window.scrollBy({ top: top - header - gap, behavior: reducedMotion() ? 'auto' : 'smooth' });
}

type Shown = 'right' | 'wrong' | 'gave-up' | 'broken';

export function ProblemCard({ topicId, instance, mode, index, onDone, consequence, afterWrong }: {
  /** With the generator id and seed (data attributes), enough to reproduce the problem in a bug report. */
  topicId: string;
  instance: Instance;
  mode: CardMode;
  /** Changes for each new problem, so state resets. */
  index: number;
  onDone: (r: CardResult) => void;
  /** The effect of an outcome on progress, shown as one line in the result. */
  consequence?: (o: CardOutcome) => Consequence;
  /** Shown in the result of a wrong answer, given the answer as read: a Cambridge problem offers supervision here. */
  afterWrong?: (given: string) => ComponentChildren;
}) {
  const a = instance.problem.answer;
  const [text, setText] = useState('');
  const [picks, setPicks] = useState<string[]>([]);
  /** A table answer's cells, in reading order. */
  const [cells, setCells] = useState<string[]>([]);
  /** Why the table cannot be marked yet, after Check was pressed on it. */
  const [tableNote, setTableNote] = useState<string | null>(null);
  const [fb, setFb] = useState<Feedback | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  /** The text that could not be read, after Check was pressed on it. */
  const [unread, setUnread] = useState<string | null>(null);
  /** A reading with a form note, waiting for Edit or Check anyway. */
  const [confirm, setConfirm] = useState<AnswerReading | null>(null);
  /** The live announcement; `n` changes so a repeated message is announced again. */
  const [said, setSaid] = useState({ n: 0, text: '' });
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const shownAt = useRef(0);
  const id = `p${index}`;

  useEffect(() => {
    setText('');
    setPicks([]);
    setCells([]);
    setTableNote(null);
    setFb(null);
    setGaveUp(false);
    setUnread(null);
    setConfirm(null);
    setSaid({ n: 0, text: '' });
    inputRef.current?.focus({ preventScroll: true });
  }, [index]);

  const checked = fb !== null || gaveUp;
  const shown: Shown | null = !checked ? null
    : gaveUp ? 'gave-up'
      : fb !== null && isProblemError(fb) ? 'broken'
        : fb?.correct === true ? 'right' : 'wrong';

  useEffect(() => {
    if (shown === null) return;
    shownAt.current = Date.now();
    if (blockRef.current !== null) reveal(blockRef.current);
    if (shown === 'right') nextRef.current?.focus({ preventScroll: true });
    else headRef.current?.focus({ preventScroll: true });
  }, [shown]);
  useEffect(() => {
    if (confirm !== null) editRef.current?.focus({ preventScroll: true });
  }, [confirm]);

  const blanks = a.kind === 'table' ? a.expected.length : 0;
  const filled = a.kind === 'table' ? Array.from({ length: blanks }, (_, i) => cells[i] ?? '') : [];
  const response: Response = a.kind === 'choice' ? picks : a.kind === 'table' ? filled : text;
  const empty = a.kind === 'choice' ? picks.length === 0 : a.kind === 'table' ? filled.every((c) => c.trim() === '') : text.trim() === '';
  const announce = (msg: string): void => setSaid((s) => ({ n: s.n + 1, text: msg }));
  const correctPlain = plain(answerText(a));
  const optionOf = (oid: string) => (a.kind === 'choice' ? a.options.find((x) => x.id === oid) : undefined);
  // The answer as the grader read it: the preview's reading for typed answers, the chosen labels for choices.
  const reading = a.kind === 'choice' || a.kind === 'table' || text.trim() === '' ? null : readAnswer(a, text);
  const yoursPlain = a.kind === 'choice'
    ? picks.map((p) => { const o = optionOf(p); return o === undefined ? p : plain(o.label); }).join(', ')
    : a.kind === 'table' ? filled.map((c) => c.trim()).join(', ')
      : reading === null ? text.trim() : texToPlain(reading.tex);

  const check = (anyway = false): void => {
    if (checked || empty) return;
    if (a.kind === 'table') {
      const note = tableNotice(a, filled);
      if (note !== null) {
        setTableNote(note);
        announce(note);
        return;
      }
    } else if (a.kind !== 'choice') {
      if (reading === null) {
        setUnread(text.trim());
        setConfirm(null);
        announce(`Could not read ${text.trim()}. Finish it or use the keypad.`);
        inputRef.current?.focus({ preventScroll: true });
        return;
      }
      if (reading.note !== undefined && !anyway) {
        setConfirm(reading);
        return;
      }
    }
    setConfirm(null);
    const f = grade(instance.problem, response, instance.misconceptions);
    setFb(f);
    if (isProblemError(f)) announce('This problem is broken, not your answer. You get a fresh one.');
    else announce(f.correct ? 'Correct.' : `Incorrect. Your answer ${yoursPlain}. Correct answer ${correctPlain}.`);
  };
  const giveUp = (): void => {
    setGaveUp(true);
    setConfirm(null);
    setUnread(null);
    setTableNote(null);
    announce(`Correct answer ${correctPlain}.`);
  };
  const finish = (): void => {
    if (shown === null) return;
    const outcome = shown === 'right' ? 'correct' : shown === 'broken' ? 'problem-error' : shown === 'gave-up' ? 'gave-up' : 'wrong';
    onDone({ outcome, correct: shown === 'right', response: gaveUp ? null : response });
  };
  const edit = (): void => {
    setConfirm(null);
    inputRef.current?.focus();
  };
  const type = (v: string): void => {
    setText(v);
    setUnread(null);
    setConfirm(null);
  };

  const toggle = (opt: string): void => {
    if (checked) return;
    // Functional updates, so quick taps in a row each see the previous one.
    if (a.kind === 'choice' && typeof a.correct === 'string') setPicks([opt]);
    else setPicks((cur) => (cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt]));
  };
  const many = a.kind === 'choice' && a.options.length > 6;
  const outcome: CardOutcome | null = shown === 'right' ? 'correct' : shown === 'wrong' ? 'wrong' : shown === 'gave-up' ? 'gave-up' : null;
  const effect = outcome === null ? undefined : consequence?.(outcome);
  const nextLabel = shown === 'broken' ? 'Get a fresh problem' : effect?.next ?? (mode === 'cambridge' ? 'Try it again' : 'Next problem');

  const notice = unread !== null
    ? <p class="small error-text">Could not read <code>{unread}</code>. Finish it or use the keypad.</p>
    : confirm !== null
      ? (
        <div class="confirm-form">
          <p id={`${id}-confirm`} class="small">This is read as <Tex tex={confirm.tex} />. {confirm.note}</p>
          <div class="actions">
            <button ref={editRef} type="button" class="btn btn-primary" aria-describedby={`${id}-confirm`} onClick={edit}>Edit</button>
            <button type="button" class="btn" onClick={() => check(true)}>Check anyway</button>
          </div>
        </div>
      )
      : undefined;

  // Choice answers list one option per line, so several options stay readable side by side.
  const options = (ids: readonly string[]) => ids.map((p) => {
    const o = optionOf(p);
    return <span key={p} class="pair-option">{o === undefined ? p : <Rich text={o.label} />}</span>;
  });
  const yours = a.kind === 'choice' ? options(picks)
    : a.kind === 'table' ? <span>the marked cells above</span>
      : reading === null ? <code>{text.trim()}</code> : <Tex tex={reading.tex} />;
  const correctRich = <Rich text={answerText(a)} />;
  const correctShown = a.kind === 'choice' ? options(typeof a.correct === 'string' ? [a.correct] : a.correct)
    : a.kind === 'table' ? <FilledTable spec={a} values={a.expected} />
      : a.kind === 'witness' ? <span>for example <Rich text={answerText(a)} /></span>
        : correctRich;

  const headId = `${id}-result`;
  let block = null;
  if (shown !== null) {
    const tone = shown === 'right' ? 'good' : shown === 'wrong' ? 'bad' : 'neutral';
    const icon = shown === 'right' ? '✓' : shown === 'wrong' ? '✕' : 'i';
    let head;
    if (shown === 'broken') head = 'This problem is broken, not your answer';
    else if (shown === 'right') head = 'Correct';
    else head = shown === 'wrong' ? 'Incorrect' : 'Solution';
    block = (
      <div ref={blockRef} class={`result-block ${tone}`} role="group" aria-labelledby={headId} data-result={shown}>
        <h3 ref={headRef} id={headId} class="result-head" tabIndex={-1}>
          <span class={`result-icon ${tone}`} aria-hidden="true">{icon}</span>
          <span>{head}</span>
        </h3>
        {shown === 'broken' && <p>It does not count. A fresh problem on the same topic replaces it. ({fb?.feedback})</p>}
        {shown === 'right' && fb?.feedback !== undefined && <p>{fb.feedback}</p>}
        {shown === 'wrong' && a.kind === 'table' && (
          <div class="result-pair one">
            <div><span>Correct answer</span><strong>{correctShown}</strong></div>
          </div>
        )}
        {shown === 'wrong' && a.kind !== 'table' && (
          <div class="result-pair">
            <div><span>Your answer</span><strong>{yours}</strong></div>
            <div><span>Correct answer</span><strong>{correctShown}</strong></div>
          </div>
        )}
        {shown === 'gave-up' && (
          <div class="result-pair one">
            <div><span>Correct answer</span><strong>{correctShown}</strong></div>
          </div>
        )}
        {shown === 'wrong' && (fb?.misconception !== undefined
          ? <p class="result-why"><strong>The likely slip:</strong> <Rich text={fb.misconception} /></p>
          : fb?.feedback !== undefined && <p class="result-why">{fb.feedback}</p>)}
        {(shown === 'wrong' || shown === 'gave-up') && (
          <div class="result-solution">
            <h4>Worked solution</h4>
            <ol>{instance.problem.solution.map((s, i) => <Rich key={i} as="li" text={s} />)}</ol>
          </div>
        )}
        {effect !== undefined && <p class="result-effect">{effect.effect}</p>}
        {shown === 'wrong' && afterWrong?.(yoursPlain)}
      </div>
    );
  }

  return (
    <div class={`problem problem-${mode}`} data-topic={topicId} data-generator={instance.generatorId} data-seed={instance.seed}>
      <Rich as="p" class="prompt" text={instance.problem.prompt} />
      <form
        class="answer"
        onSubmit={(e) => {
          e.preventDefault();
          if (checked) finish();
          else check();
        }}
        onKeyDown={(e) => {
          // A second Enter just after the result (a double press, or key repeat) must not skip it.
          // Cancelling the keydown stops both the button's activation and the form's implicit submit.
          if (e.key === 'Enter' && checked && Date.now() - shownAt.current < ENTER_GUARD_MS) e.preventDefault();
        }}
      >
        {a.kind === 'table' ? (
          <>
            <TableAnswer
              id={id}
              spec={a}
              cells={filled}
              onCell={(i, v) => {
                setCells((cur) => {
                  const next = [...cur];
                  while (next.length <= i) next.push('');
                  next[i] = v;
                  return next;
                });
                setTableNote(null);
              }}
              disabled={checked}
              wrong={shown === 'wrong' ? fb?.wrongCells ?? [] : shown === 'right' ? [] : undefined}
            />
            {tableNote !== null && <p class="small error-text">{tableNote}</p>}
          </>
        ) : a.kind === 'choice' ? (
          <fieldset class={`choices${many ? ' chips' : ''}`} disabled={checked}>
            <legend class="small muted">{choiceHint(a.correct)}</legend>
            {a.options.map((o) => {
              const on = picks.includes(o.id);
              const right = typeof a.correct === 'string' ? a.correct === o.id : a.correct.includes(o.id);
              // Text, not only the border colour, says how each option came out.
              const mark = !checked ? null
                : right ? (on ? 'Correct, you chose it' : gaveUp ? 'Correct answer' : 'Correct, you missed it')
                  : on ? 'Not correct, you chose it' : null;
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
                  {mark !== null && (
                    <span class={`choice-mark ${right ? 'good' : 'bad'}`}>
                      <span aria-hidden="true">{right ? '✓ ' : '✕ '}</span>{mark}
                    </span>
                  )}
                </label>
              );
            })}
          </fieldset>
        ) : (
          <AnswerInput
            id={id}
            spec={a}
            topicId={topicId}
            value={text}
            disabled={checked}
            onChange={type}
            inputRef={inputRef}
            notice={notice}
            invalid={unread !== null}
            result={shown === 'right' ? 'right' : shown === 'wrong' ? 'wrong' : undefined}
          />
        )}
        {block}
        <div class="actions">
          {!checked && confirm === null && (
            <>
              <button type="submit" class="btn btn-primary" disabled={empty}>Check</button>
              {mode === 'practice' && <button type="button" class="btn" onClick={giveUp}>Show me how (counts as a miss)</button>}
              {mode === 'cambridge' && <button type="button" class="btn" onClick={giveUp}>Show the solution</button>}
            </>
          )}
          {checked && <button ref={nextRef} type="submit" class="btn btn-primary">{nextLabel}</button>}
        </div>
      </form>
      <div class="visually-hidden" aria-live="assertive" aria-atomic="true" data-testid="announce">
        {said.text !== '' && <span key={said.n}>{said.text}</span>}
      </div>
    </div>
  );
}
