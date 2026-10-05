/**
 * The answer box (design decision 19c): natural forms are read and previewed in LaTeX,
 * the keypad inserts at the cursor and keeps focus, Enter checks, and on a touch screen
 * the keypad docks above the system keyboard.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { useState } from 'preact/hooks';
import katex from 'katex';
import { readAnswer, type AnswerSpec } from '@learnhub/content';
import { contentFor } from '@learnhub/content/all';
import type { TextSpec } from '@/model/keypad';
import { AnswerInput } from '@/ui/AnswerInput';
import { ProblemCard } from '@/ui/ProblemCard';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function Harness({ spec, initial = '', topicId = 'pre.fractions' }: { spec: TextSpec; initial?: string; topicId?: string }) {
  const [v, setV] = useState(initial);
  return <AnswerInput id="t" spec={spec} topicId={topicId} value={v} disabled={false} onChange={setV} />;
}

const input = (): HTMLInputElement => screen.getByLabelText('Your answer') as HTMLInputElement;
const type = (s: string): void => { fireEvent.input(input(), { target: { value: s } }); };
const preview = (): HTMLElement => document.getElementById('t-preview') as HTMLElement;

const EXACT: TextSpec = { kind: 'exact', expected: '3/8' };
const EXPR: TextSpec = { kind: 'expression', expected: '(x + 2)(x + 3)', variables: ['x'] };

describe('the live preview', () => {
  it('shows how a number was read, in KaTeX, for each natural form', () => {
    render(<Harness spec={EXACT} />);
    for (const s of ['3/8', '3 / 8', '3÷8', '0.375', '-3/8']) {
      type(s);
      expect(preview().dataset.state, s).toBe('read');
      expect(preview().querySelector('.katex'), s).not.toBeNull();
      expect(preview().querySelector('.katex-error'), s).toBeNull();
      // MathML for screen readers.
      expect(preview().querySelector('math'), s).not.toBeNull();
    }
    type('3/8');
    expect(preview().querySelector('annotation')?.textContent).toBe('\\frac{3}{8}');
  });

  it('reads a calculation but says to work it out; a ratio where none is asked says to use a fraction', () => {
    render(<Harness spec={EXACT} />);
    type('2^5');
    expect(preview().dataset.state).toBe('note');
    expect(preview().textContent).toMatch(/Work it out to a single number/);
    type('3:8');
    expect(preview().textContent).toMatch(/as a fraction/);
  });

  it('says "could not read this yet" gently for text it cannot read, and nothing when empty', () => {
    render(<Harness spec={EXACT} />);
    expect(preview().dataset.state).toBe('empty');
    expect(preview().textContent).toBe('');
    type('3/');
    expect(preview().textContent).toBe('Could not read this yet.');
  });

  it('shows an expression as it was read, with implicit multiplication made visible', () => {
    render(<Harness spec={EXPR} />);
    type('(x+2)(x+3)');
    expect(preview().querySelector('annotation')?.textContent).toBe('(x + 2) (x + 3)');
    // The root takes the x only; the preview makes that visible before Check.
    type('√x²');
    expect(preview().querySelector('annotation')?.textContent).toBe('(\\sqrt{x})^{2}');
  });

  it('every reading of these natural forms renders with KaTeX without error', () => {
    const specs: [AnswerSpec, string[]][] = [
      [EXACT, ['3/8', '3 / 8', '0.375', '3÷8', '−3/8', '2^5', '2×3', '2*3', 'sqrt(2)', '√2', 'pi', 'π', '6/16', '007']],
      [{ kind: 'exact', expected: '3/8', ratio: true }, ['3:8', '3 : 8']],
      [{ kind: 'numeric', expected: 0.5 }, ['0.5', '1/2', '5e-1', '1.5E3', '−0.5']],
      [{ kind: 'expression', expected: 'n(n-1)/2', variables: ['n', 'k'], binomial: true }, ['n(n-1)/2', 'nC2', 'C(n, k)', 'n!/(k!(n-k)!)', '2^n', '√n', 'n²', 'πn', 'e^(-n)', 'ln(n)', '|n - 1|', 'n^-2', '(1/2)^n']],
    ];
    for (const [spec, inputs] of specs) {
      for (const s of inputs) {
        const r = readAnswer(spec, s);
        expect(r, `${spec.kind} ${s}`).not.toBeNull();
        expect(() => katex.renderToString(r?.tex ?? '', { throwOnError: true, strict: 'error' }), s).not.toThrow();
      }
    }
  });
});

describe('the keypad', () => {
  it('inserts at the cursor and keeps focus in the field', () => {
    render(<Harness spec={EXACT} initial="38" />);
    const el = input();
    el.focus();
    el.setSelectionRange(1, 1);
    const bar = screen.getByRole('button', { name: 'fraction bar' });
    // A mouse press on a key must not take focus from the field.
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    bar.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    fireEvent.click(bar);
    expect(el.value).toBe('3/8');
    expect(document.activeElement).toBe(el);
    expect(el.selectionStart).toBe(2);
  });

  it('a root key puts the cursor inside the brackets, so typing goes in the root', () => {
    render(<Harness spec={EXPR} topicId="pre.algebraic-manipulation" />);
    const el = input();
    el.focus();
    fireEvent.click(screen.getByRole('button', { name: 'square root' }));
    expect(el.value).toBe('√()');
    expect(el.selectionStart).toBe(2);
  });

  it('is keyboard accessible: keys are buttons in a labelled group, each with a name', () => {
    render(<Harness spec={EXPR} />);
    const group = screen.getByRole('group', { name: 'Math symbols' });
    const keys = group.querySelectorAll('button');
    expect(keys.length).toBeGreaterThan(5);
    for (const k of keys) {
      expect(k.getAttribute('type')).toBe('button');
      expect(k.getAttribute('aria-label')).toBeTruthy();
    }
  });

  it('asks a phone for the right keyboard', () => {
    render(<Harness spec={EXACT} />);
    expect(input().getAttribute('inputmode')).toBe('decimal');
    cleanup();
    render(<Harness spec={EXPR} />);
    expect(input().getAttribute('inputmode')).toBe('text');
  });

  it('on a touch screen, docks above the system keyboard while the field has focus', () => {
    const listeners: Record<string, () => void> = {};
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(pointer: coarse)', addEventListener() {}, removeEventListener() {} }));
    vi.stubGlobal('visualViewport', {
      height: 400, offsetTop: 0, width: 390,
      addEventListener: (t: string, f: () => void) => { listeners[t] = f; },
      removeEventListener: (t: string) => { delete listeners[t]; },
    });
    vi.stubGlobal('innerHeight', 700);
    vi.stubGlobal('scrollBy', () => {});
    render(<Harness spec={EXACT} />);
    const pad = screen.getByRole('group', { name: 'Math symbols' });
    expect(pad.classList.contains('docked')).toBe(false);
    fireEvent.focus(input());
    expect(pad.classList.contains('docked')).toBe(true);
    expect(pad.style.getPropertyValue('--keyboard')).toBe('300px');
    expect(listeners.resize).toBeDefined();
    fireEvent.blur(input());
    expect(pad.classList.contains('docked')).toBe(false);
    expect(listeners.resize).toBeUndefined();
  });
});

describe('in a problem', () => {
  const add = contentFor('pre.fractions')?.generators.find((g) => g.id === 'add');

  it('Enter checks the answer, typed in a natural form', async () => {
    if (add === undefined) throw new Error('no generator');
    const inst = add.instance(11);
    const done = vi.fn();
    render(<ProblemCard topicId="pre.fractions" instance={inst} mode="practice" index={0} onDone={done} />);
    const [n, d] = (inst.reference as string).split('/');
    fireEvent.input(input(), { target: { value: `${n} ÷ ${d}` } });
    fireEvent.submit(input().form as HTMLFormElement);
    expect(await screen.findByText('Correct')).toBeTruthy();
    // After checking, the keypad and preview are gone.
    expect(screen.queryByRole('group', { name: 'Math symbols' })).toBeNull();
  });

  it('the prompt renders its mathematics with KaTeX, with no raw LaTeX or errors', () => {
    if (add === undefined) throw new Error('no generator');
    render(<ProblemCard topicId="pre.fractions" instance={add.instance(3)} mode="quiz" index={0} onDone={() => undefined} />);
    const prompt = document.querySelector('.prompt') as HTMLElement;
    expect(prompt.querySelector('.katex')).not.toBeNull();
    expect(prompt.querySelector('.katex-error')).toBeNull();
    const visible = [...prompt.querySelectorAll('.katex-html')].map((e) => e.textContent).join('');
    expect(visible).not.toMatch(/\\frac/);
  });
});
