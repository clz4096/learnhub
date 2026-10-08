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
 * into view. A right answer says "Right: <answer>." A wrong answer shows "Incorrect", the
 * learner's answer beside the correct one, the likely slip, the full worked solution, and
 * one line on what it does to progress (from the runner, which owns the rules).
 *
 * Two kinds of problem hold the solution back (mastery/HOW-A-TOPIC-WORKS.md and
 * APP-LANGUAGE.md, approved 2026-10-08):
 * - Lesson practice (`oneMoreTry`): a first miss shows the likely slip and the rule, then
 *   one more try at the same problem; only a second miss shows the answer and the worked
 *   solution. The first answer is the one the run counts.
 * - A single-answer Cambridge problem (`help`): a miss says "Not right yet" with the
 *   problem's nudge, then its hints one at a time on request, never the solution. "Show me
 *   the solution" is always there; while the problem can still count it asks first.
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
import type { Rich as RichText } from '@learnhub/content';
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
  /** ms from the problem being shown to the answer (Check, or Show the solution). */
  ms: number;
}

/** What a result does to progress, from the runner's own rules, and the label of the button that moves on. */
export interface Consequence {
  effect: string;
  next?: string;
}

/** Enter is ignored this long after a result appears. */
export const ENTER_GUARD_MS = 500;

/** "Not right yet" without a nudge of the problem's own: neutral, and no help with the answer. */
export const GENERIC_NUDGE = 'Not quite. Check each step against what the question asks.';
/** What "Show me the solution" costs while the problem can still count. */
export const REVEAL_WARNING = 'This problem will no longer count.';

/** A single-answer Cambridge problem's help on a miss (mastery/HOW-A-TOPIC-WORKS.md, rule 3). */
export interface CambridgeHelp {
  /** The line under "Not right yet"; `GENERIC_NUDGE` when absent. */
  nudge?: RichText;
  hints: readonly RichText[];
  /** Hints already opened, on an earlier visit; shown above the answer. */
  opened: number;
  /** The problem was missed before, so the next hint may be opened before answering again. */
  missed: boolean;
  /** A hint was opened: `n` are open now. */
  onHint: (n: number) => void;
  /** The solution was shown before, so the problem no longer counts: a miss shows it again, as plain practice. */
  revealed: boolean;
  /** "Show me the solution" asks first (`REVEAL_WARNING`): the problem could still count. */
  confirmReveal: boolean;
}

/** The hints opened so far, and the button for the next one while any are left. */
function Hints({ hints, open, onMore, id }: { hints: readonly RichText[]; open: number; onMore?: () => void; id: string }) {
  if (hints.length === 0) return null;
  return (
    <div class="hints">
      {open > 0 && (
        <ol class="hint-list" aria-label="Hints">
          {hints.slice(0, open).map((h, i) => <Rich key={i} as="li" text={h} />)}
        </ol>
      )}
      {onMore !== undefined && open < hints.length && (
        <button type="button" class="btn" id={`${id}-hint`} onClick={onMore}>{open === 0 ? 'Show a hint' : 'Show the next hint'}</button>
      )}
    </div>
  );
}

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

export function ProblemCard({ topicId, instance, mode, index, idBase, onDone, onAnswer, consequence, afterWrong, oneMoreTry = false, help }: {
  /** With the generator id and seed (data attributes), enough to reproduce the problem in a bug report. */
  topicId: string;
  instance: Instance;
  mode: CardMode;
  /** Changes for each new problem, so state resets. */
  index: number;
  /**
   * The prefix of the card's element ids. Defaults to p{index}, unique when one card is
   * shown at a time; a page with several cards at once (the Cambridge problems) gives each
   * its own, so labels and descriptions point at the right input.
   */
  idBase?: string;
  onDone: (r: CardResult) => void;
  /**
   * Called once when the result is shown, before the learner moves on: for a record that must
   * not depend on the learner pressing on (a Cambridge gate attempt, whose solution is now seen).
   */
  onAnswer?: (r: CardResult) => void;
  /** The effect of an outcome on progress, shown as one line in the result. */
  consequence?: (o: CardOutcome) => Consequence;
  /** Shown in the result of a wrong answer, given the answer as read: a Cambridge problem offers supervision here. */
  afterWrong?: (given: string) => ComponentChildren;
  /** Lesson practice: a first miss gets the slip and one more try before the solution. The first answer counts. */
  oneMoreTry?: boolean;
  /** A single-answer Cambridge problem: a miss gets a nudge and hints, never the solution. */
  help?: CambridgeHelp;
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
  /** Lesson practice: the first answer missed, and the one more try is under way or done. */
  const [missedFirst, setMissedFirst] = useState(false);
  /** Hints open on a Cambridge problem. */
  const [hintsOpen, setHintsOpen] = useState(help?.opened ?? 0);
  /** "Show me the solution" pressed, waiting for the learner to confirm it. */
  const [asking, setAsking] = useState(false);
  /** The live announcement; `n` changes so a repeated message is announced again. */
  const [said, setSaid] = useState({ n: 0, text: '' });
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const shownAt = useRef(0);
  /** When this problem appeared, and when it was answered, for the time taken. */
  const startedAt = useRef(Date.now());
  const answeredAt = useRef<number | null>(null);
  const id = idBase ?? `p${index}`;

  useEffect(() => {
    setText('');
    setPicks([]);
    setCells([]);
    setTableNote(null);
    setFb(null);
    setGaveUp(false);
    setUnread(null);
    setConfirm(null);
    setMissedFirst(false);
    setAsking(false);
    setSaid({ n: 0, text: '' });
    startedAt.current = Date.now();
    answeredAt.current = null;
    inputRef.current?.focus({ preventScroll: true });
  }, [index]);

  const checked = fb !== null || gaveUp;
  const shown: Shown | null = !checked ? null
    : gaveUp ? 'gave-up'
      : fb !== null && isProblemError(fb) ? 'broken'
        : fb?.correct === true ? 'right' : 'wrong';
  // A first practice miss waits for the one more try; its result is not the problem's yet.
  const retryNext = oneMoreTry && shown === 'wrong' && !missedFirst;
  // A Cambridge miss that can still count: the nudge and hints, and the solution held back.
  const holdBack = mode === 'cambridge' && help !== undefined && !help.revealed;

  useEffect(() => {
    if (shown === null) return;
    shownAt.current = Date.now();
    answeredAt.current ??= shownAt.current;
    if (!retryNext) onAnswer?.(resultOf(shown));
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

  // Read inside effects and handlers, after every value above is set. A right answer on the
  // one more try still counts as the miss the first answer was.
  const resultOf = (sh: Shown): CardResult => ({
    outcome: sh === 'right' ? (missedFirst ? 'wrong' : 'correct') : sh === 'broken' ? 'problem-error' : sh === 'gave-up' ? 'gave-up' : 'wrong',
    correct: sh === 'right' && !missedFirst,
    response: gaveUp ? null : response,
    ms: Math.max(0, (answeredAt.current ?? Date.now()) - startedAt.current),
  });

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
    if (isProblemError(f)) announce('This problem is broken, not the answer given. A fresh one replaces it.');
    else if (f.correct) announce(a.kind === 'table' ? 'Right.' : `Right: ${yoursPlain}.`);
    else if (holdBack) announce('Not right yet.');
    else if (oneMoreTry && !missedFirst) announce('Not right yet. One more try.');
    else announce(`Incorrect. Your answer ${yoursPlain}. Correct answer ${correctPlain}.`);
  };
  const giveUp = (): void => {
    if (holdBack && help?.confirmReveal === true && !asking) {
      setAsking(true);
      return;
    }
    setAsking(false);
    // The solution replaces a held-back miss, so it is shown as the problem's end.
    setFb(null);
    setGaveUp(true);
    setConfirm(null);
    setUnread(null);
    setTableNote(null);
    announce(`Correct answer ${correctPlain}.`);
  };
  /** The one more try in lesson practice: the same problem, an empty answer. */
  const tryAgain = (): void => {
    setMissedFirst(true);
    setFb(null);
    setText('');
    setPicks([]);
    setCells([]);
    setTableNote(null);
    answeredAt.current = null;
    inputRef.current?.focus({ preventScroll: true });
  };
  const moreHint = (): void => {
    if (help === undefined) return;
    const n = Math.min(help.hints.length, hintsOpen + 1);
    setHintsOpen(n);
    help.onHint(n);
  };
  const finish = (): void => {
    if (shown === null) return;
    if (retryNext) {
      tryAgain();
      return;
    }
    onDone(resultOf(shown));
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
  const outcome: CardOutcome | null = shown === null || shown === 'broken' || retryNext ? null : resultOf(shown).outcome as CardOutcome;
  const effect = outcome === null ? undefined : consequence?.(outcome);
  const nextLabel = shown === 'broken' ? 'Get a fresh problem' : retryNext ? 'Try once more' : effect?.next ?? (mode === 'cambridge' ? 'Try it again' : 'Next problem');
  // A held-back Cambridge miss rests until the problem comes back: there is nothing to move on to here.
  const resting = holdBack && shown === 'wrong';
  const marked = checked && !resting && !retryNext;

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

  // "Show me the solution": always there on a Cambridge problem; while it could still count, it asks first.
  const revealButton = mode !== 'cambridge' ? null : asking
    ? (
      <div class="confirm-form reveal-confirm">
        <p id={`${id}-reveal`} class="small">{REVEAL_WARNING}</p>
        <div class="actions">
          <button type="button" class="btn" aria-describedby={`${id}-reveal`} onClick={giveUp}>Show the solution</button>
          <button type="button" class="btn btn-primary" onClick={() => setAsking(false)}>Keep trying</button>
        </div>
      </div>
    )
    : <div class="actions"><button type="button" class="btn" onClick={giveUp}>Show me the solution</button></div>;

  const headId = `${id}-result`;
  let block = null;
  if (shown !== null) {
    const tone = shown === 'right' ? 'good' : shown === 'wrong' ? 'bad' : 'neutral';
    const icon = shown === 'right' ? '✓' : shown === 'wrong' ? '✕' : 'i';
    // A miss that leads to another go (practice's one more try, a Cambridge problem's return) is "not right yet".
    const notYet = shown === 'wrong' && (retryNext || holdBack);
    let head: ComponentChildren;
    if (shown === 'broken') head = 'This problem is broken, not the answer given';
    // "Right: 5/12." repeats the answer as given: for a witness or an equivalent form that is the learner's own.
    else if (shown === 'right') head = a.kind === 'table' ? 'Right.' : <>Right: {yours}.</>;
    else head = shown === 'wrong' ? (notYet ? 'Not right yet' : 'Incorrect') : 'Solution';
    const slip = fb?.misconception !== undefined
      ? <p class="result-why"><strong>The likely slip:</strong> <Rich text={fb.misconception} /></p>
      : fb?.feedback !== undefined && <p class="result-why">{fb.feedback}</p>;
    block = (
      <div ref={blockRef} class={`result-block ${tone}`} role="group" aria-labelledby={headId} data-result={shown}>
        {/* The answer in the heading is typeset; its name is plain text, as a screen reader should say it. */}
        <h3 ref={headRef} id={headId} class="result-head" tabIndex={-1} aria-label={shown === 'right' ? (a.kind === 'table' ? 'Right.' : `Right: ${yoursPlain}.`) : undefined}>
          <span class={`result-icon ${tone}`} aria-hidden="true">{icon}</span>
          <span>{head}</span>
        </h3>
        {shown === 'broken' && <p>It does not count. A fresh problem on the same topic replaces it. ({fb?.feedback})</p>}
        {shown === 'right' && fb?.feedback !== undefined && <p>{fb.feedback}</p>}
        {notYet && holdBack && (
          <>
            {help?.nudge !== undefined ? <Rich as="p" class="result-why" text={help.nudge} /> : <p class="result-why">{GENERIC_NUDGE}</p>}
            {a.kind !== 'table' && (
              <div class="result-pair one">
                <div><span>Your answer</span><strong>{yours}</strong></div>
              </div>
            )}
          </>
        )}
        {notYet && retryNext && (
          <>
            {slip}
            <p class="small">One more try at the same problem. The answer and the worked solution come after it if it is still not right.</p>
          </>
        )}
        {shown === 'wrong' && !notYet && a.kind === 'table' && (
          <div class="result-pair one">
            <div><span>Correct answer</span><strong>{correctShown}</strong></div>
          </div>
        )}
        {shown === 'wrong' && !notYet && a.kind !== 'table' && (
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
        {shown === 'wrong' && !notYet && slip}
        {(shown === 'wrong' && !notYet) || shown === 'gave-up' ? (
          <div class="result-solution">
            <h4>Worked solution</h4>
            <ol>{instance.problem.solution.map((s, i) => <Rich key={i} as="li" text={s} />)}</ol>
          </div>
        ) : null}
        {effect !== undefined && effect.effect !== '' && <p class="result-effect">{effect.effect}</p>}
        {resting && help !== undefined && <Hints hints={help.hints} open={hintsOpen} onMore={moreHint} id={id} />}
        {resting && revealButton}
        {shown === 'wrong' && afterWrong?.(yoursPlain)}
      </div>
    );
  }

  return (
    <div class={`problem problem-${mode}`} data-topic={topicId} data-generator={instance.generatorId} data-seed={instance.seed}>
      <Rich as="p" class="prompt" text={instance.problem.prompt} />
      {holdBack && !resting && help !== undefined && (hintsOpen > 0 || help.missed) && (
        <Hints hints={help.hints} open={hintsOpen} onMore={help.missed && !checked ? moreHint : undefined} id={id} />
      )}
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
              // Text, not only the border colour, says how each option came out. A miss that gets
              // another go does not mark the options: that would give the answer away.
              const mark = !marked ? null
                : right ? (on ? 'Correct, you chose it' : gaveUp ? 'Correct answer' : 'Correct, you missed it')
                  : on ? 'Not correct, you chose it' : null;
              return (
                <label key={o.id} class={`choice${on ? ' on' : ''}${marked && right ? ' right' : ''}${checked && on && !right ? ' wrong' : ''}`}>
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
            </>
          )}
          {checked && !resting && <button ref={nextRef} type="submit" class="btn btn-primary">{nextLabel}</button>}
        </div>
        {!checked && confirm === null && revealButton}
      </form>
      <div class="visually-hidden" aria-live="assertive" aria-atomic="true" data-testid="announce">
        {said.text !== '' && <span key={said.n}>{said.text}</span>}
      </div>
    </div>
  );
}
