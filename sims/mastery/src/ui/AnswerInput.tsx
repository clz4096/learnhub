/**
 * The one answer box used for every typed answer (design decision 19c): a text field
 * that accepts natural forms, a live LaTeX preview under it of exactly how the answer was
 * read, a small symbol keypad that inserts at the cursor and keeps focus in the field,
 * and a one-line hint. Enter submits through the surrounding form.
 *
 * On a touch screen, while the field has focus, the keypad docks to the top of the system
 * keyboard (measured with the visual viewport), and the page scrolls so the field and its
 * preview stay visible above the keypad.
 *
 * The card that owns the field puts its messages about the typed text (it cannot be read,
 * or it is read in a form the question does not ask for) under the preview, through
 * `notice`. After Check the field is disabled, coloured by the result, and the hint goes.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState, type MutableRef } from 'preact/hooks';
import { readAnswer } from '@learnhub/content';
import { hintFor, inputModeFor, insertKey, keypadFor, type Key, type TextSpec } from '@/model/keypad';
import { Tex } from '@/ui/Tex';

function coarsePointer(): boolean {
  try {
    return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

/** Docks the keypad above the on-screen keyboard while the field has focus on a touch screen. */
function useDock(focused: boolean, box: MutableRef<HTMLDivElement | null>, pad: MutableRef<HTMLDivElement | null>): boolean {
  const [docked, setDocked] = useState(false);
  useEffect(() => {
    const vv = typeof window === 'undefined' ? undefined : window.visualViewport;
    if (!focused || vv === undefined || vv === null || !coarsePointer()) {
      setDocked(false);
      return;
    }
    const place = (): void => {
      // The keyboard covers the bottom of the layout viewport; the keypad sits on top of it.
      const keyboard = Math.max(0, window.innerHeight - (vv.offsetTop + vv.height));
      pad.current?.style.setProperty('--keyboard', `${keyboard}px`);
      setDocked(true);
      const r = box.current?.getBoundingClientRect();
      const padHeight = pad.current?.offsetHeight ?? 0;
      if (r === undefined) return;
      const bottom = vv.offsetTop + vv.height - padHeight - 8;
      if (r.bottom > bottom) window.scrollBy({ top: r.bottom - bottom });
      else if (r.top < vv.offsetTop + 8) window.scrollBy({ top: r.top - vv.offsetTop - 8 });
    };
    place();
    vv.addEventListener('resize', place);
    vv.addEventListener('scroll', place);
    return () => {
      vv.removeEventListener('resize', place);
      vv.removeEventListener('scroll', place);
    };
  }, [focused]);
  return docked;
}

export function AnswerInput({ id, spec, topicId, value, disabled, onChange, inputRef, notice, invalid = false, result }: {
  /** Prefix for element ids, unique on the page. */
  id: string;
  spec: TextSpec;
  /** Chooses topic-specific keys (sets, logic). */
  topicId: string;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
  inputRef?: MutableRef<HTMLInputElement | null>;
  /** Shown under the preview and read with the field. */
  notice?: ComponentChildren;
  /** The text cannot be graded as it is. */
  invalid?: boolean;
  /** After Check: colours the disabled field. */
  result?: 'right' | 'wrong';
}) {
  const own = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? own;
  const box = useRef<HTMLDivElement>(null);
  const pad = useRef<HTMLDivElement>(null);
  const caret = useRef<number | null>(null);
  const [focused, setFocused] = useState(false);
  const docked = useDock(focused && !disabled, box, pad);
  const keys = keypadFor(spec, topicId);

  // After a key press re-renders the field, put the cursor where the key left it.
  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null || caret.current === null) return;
    el.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  }, [value]);

  const press = (key: Key): void => {
    const el = ref.current;
    if (el === null || disabled) return;
    const r = insertKey(value, el.selectionStart ?? value.length, el.selectionEnd ?? value.length, key);
    caret.current = r.caret;
    // A keyboard user pressed the key with focus on it: hand focus back to the field.
    el.focus({ preventScroll: true });
    onChange(r.value);
  };

  const reading = disabled || value.trim() === '' ? undefined : readAnswer(spec, value);
  const inputId = `${id}-input`;
  const hasNotice = notice !== undefined && notice !== null && notice !== false;
  // After Check the result block shows how the answer was read, so the preview and hint go.
  // A notice says more than the preview about the same text, so it takes the preview's place.
  const preview = !disabled && !hasNotice;
  const described = [preview ? `${id}-preview` : null, hasNotice ? `${id}-notice` : null, disabled ? null : `${id}-hint`].filter((x) => x !== null).join(' ');
  return (
    <div class="field answer-field">
      <label for={inputId}>Your answer</label>
      <div class={`answer-box${result === undefined ? '' : ` result-${result}`}`} ref={box}>
        <input
          ref={ref}
          id={inputId}
          type="text"
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          spellcheck={false}
          enterKeyHint="done"
          inputMode={inputModeFor(spec)}
          value={value}
          disabled={disabled}
          aria-describedby={described === '' ? undefined : described}
          aria-invalid={invalid ? 'true' : undefined}
          onInput={(e) => onChange((e.currentTarget as HTMLInputElement).value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {preview && <p id={`${id}-preview`} class="small preview" data-state={reading === undefined ? 'empty' : reading === null ? 'unread' : reading.note === undefined ? 'read' : 'note'}>
          {reading === null && 'Could not read this yet.'}
          {reading !== null && reading !== undefined && (
            <>
              Read as <Tex tex={reading.tex} />
              {reading.note !== undefined && <span class="preview-note"> {reading.note}</span>}
            </>
          )}
        </p>}
        {hasNotice && <div id={`${id}-notice`} class="answer-notice">{notice}</div>}
      </div>
      {!disabled && (
        <div ref={pad} class={`keypad${docked ? ' docked' : ''}`} role="group" aria-label="Math symbols">
          {keys.map((key) => (
            <button
              key={key.name}
              type="button"
              class="key"
              aria-label={key.name}
              title={key.name}
              aria-controls={inputId}
              // Keep focus (and the phone keyboard) in the field while a key is pressed.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => press(key)}
            >
              {key.label}
            </button>
          ))}
        </div>
      )}
      {!disabled && <span id={`${id}-hint`} class="small muted">{hintFor(spec)}</span>}
    </div>
  );
}
