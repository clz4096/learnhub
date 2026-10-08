/**
 * Supervision in the app (build step 3): Copy for supervision with the clipboard and with
 * the Select all fallback, Paste result accepting a valid block and refusing bad ones, the
 * redo on Today, supervision for a wrong auto-checked answer, and no self-marking.
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/preact';
import { IDBFactory } from 'fake-indexeddb';
import type { IdbFactoryLike } from '@learnhub/mastery';
import { DAY_MS } from '@learnhub/mastery';
import { DEFAULT_COURSES, startLearner } from '@/model/learner';
import { route } from '@/model/route';
import { commit, flush, init, progress, setClock } from '@/model/store';
import { PACKET_HEADER, formatResult } from '@/model/supervision';
import { LessonRunner, ProblemView } from '@/ui/views/Lesson';
import { Today } from '@/ui/views/Today';
import { CONTENT_IDS } from '@learnhub/content';
import { contentStore } from '@/model/content';

const T0 = new Date(2026, 9, 5, 9, 0).getTime();
const PROOF = 'prob.event-spaces/q4-a-finite';
const OTHER = 'prob.event-spaces/q6-b-event';

let writeText: ReturnType<typeof vi.fn>;
function setClipboard(on: boolean): void {
  writeText = vi.fn(() => Promise.resolve());
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: on ? { writeText } : undefined });
}

beforeEach(async () => {
  Element.prototype.scrollTo ??= () => {};
  localStorage.clear();
  sessionStorage.clear();
  setClock(() => T0);
  setClipboard(true);
  await init(new IDBFactory() as unknown as IdbFactoryLike);
  await commit(startLearner(T0, DEFAULT_COURSES, 60));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Downloaded up front, so a lesson renders at once; the download itself is tested in ContentGate.test.tsx.
await Promise.all(CONTENT_IDS.map((id) => contentStore.load(id)));

function openCambridge(topicId: string): void {
  render(<LessonRunner topicId={topicId} salt="test" onEnd={() => undefined} onSkip={() => undefined} />);
  fireEvent.click(screen.getByRole('button', { name: /Cambridge problem/ }));
}
const item = (id: string): HTMLElement => document.querySelector(`[data-problem="${id}"]`) as HTMLElement;

async function copyProof(writeUp = 'Pad the finite list with empty sets.', copiedText = /^Copied\. Paste it into your supervision session/): Promise<string> {
  openCambridge('prob.event-spaces');
  const card = within(item('q4-a-finite'));
  fireEvent.input(card.getByLabelText('Your write-up'), { target: { value: writeUp } });
  fireEvent.click(card.getByRole('button', { name: 'Copy for supervision' }));
  await card.findByText(copiedText);
  await flush();
  return progress.value?.supervision.at(-1)?.nonce as string;
}

function paste(scope: HTMLElement, text: string): void {
  const s = within(scope);
  fireEvent.click(s.getByRole('button', { name: 'Paste result' }));
  fireEvent.input(s.getByLabelText('The result block from Claude'), { target: { value: text } });
  fireEvent.click(s.getByRole('button', { name: 'Import result' }));
}

const block = (nonce: string, mark = 12, problem = PROOF): string => formatResult({
  problem, nonce,
  result: { mark, weakPoints: ['Empty set not shown to be an event.', 'De Morgan used without a reason.', 'Set difference skipped.'], redo: [OTHER], summary: 'Right ideas, steps asserted.' },
});

describe('Copy for supervision', () => {
  it('copies one block with the problem, the write-up, and a nonce, and records the copy', async () => {
    const nonce = await copyProof();
    expect(writeText).toHaveBeenCalledTimes(1);
    const text = writeText.mock.calls[0]?.[0] as string;
    expect(text.startsWith(`${PACKET_HEADER}\nPROBLEM: ${PROOF}\nNONCE: ${nonce}\n`)).toBe(true);
    expect(text).toContain('Pad the finite list with empty sets.');
    expect(progress.value?.supervision).toEqual([{ problem: PROOF, nonce, writeUp: 'Pad the finite list with empty sets.', copiedAt: T0, result: null, importedAt: null }]);
    // The copied text can be shown to check it.
    fireEvent.click(within(item('q4-a-finite')).getByRole('button', { name: 'Show the copied text' }));
    expect((within(item('q4-a-finite')).getByLabelText('The supervision block') as HTMLTextAreaElement).value).toBe(text);
  });

  it('without the clipboard, shows a read-only box with Select all', async () => {
    setClipboard(false);
    openCambridge('prob.event-spaces');
    const card = within(item('q4-a-finite'));
    fireEvent.input(card.getByLabelText('Your write-up'), { target: { value: 'My proof.' } });
    fireEvent.click(card.getByRole('button', { name: 'Copy for supervision' }));
    await card.findByText(/did not let the app copy/);
    const box = card.getByLabelText('The supervision block') as HTMLTextAreaElement;
    expect(box.readOnly).toBe(true);
    expect(box.value).toMatch(new RegExp(`^${PACKET_HEADER}`));
    expect(box.value).toContain('My proof.');
    fireEvent.click(card.getByRole('button', { name: 'Select all' }));
    expect(box.selectionStart).toBe(0);
    expect(box.selectionEnd).toBe(box.value.length);
    expect(document.activeElement).toBe(box);
  });
});

describe('Paste result', () => {
  it('imports a valid result, says what it did, and the redo appears on Today', async () => {
    const nonce = await copyProof();
    paste(item('q4-a-finite'), block(nonce));
    const status = await within(item('q4-a-finite')).findByText(/^Imported: 12\/20/);
    expect(status.textContent).toMatch(/not learned yet, so its reviews are unchanged/);
    expect(status.textContent).toMatch(/To redo, from tomorrow on Today: "Infinitely often" is an event/);
    await flush();
    const a = progress.value?.supervision[0];
    expect(a?.result?.mark).toBe(12);
    expect(a?.importedAt).toBe(T0);
    expect(progress.value?.redos).toEqual([{ problem: OTHER, from: nonce, setAt: T0, due: T0 + DAY_MS, doneAt: null }]);
    expect(within(item('q4-a-finite')).getByText(/Last supervision:/).closest('p')?.textContent).toMatch(/12\/20/);

    cleanup();
    render(<Today />);
    const redo = await waitFor(() => {
      const el = document.querySelector(`[data-redo="${OTHER}"]`);
      if (el === null) throw new Error('no redo yet');
      return el as HTMLElement;
    });
    expect(redo.textContent).toMatch(/Due tomorrow/);
    expect(redo.textContent).toMatch(/Empty set not shown to be an event\./);
    fireEvent.click(within(redo).getByRole('button', { name: 'Open' }));
    expect(route.value).toEqual({ view: 'problem', topicId: 'prob.event-spaces', problemId: 'q6-b-event' });
  });

  it('a GAP result: not a lapse, the redo waits, and Recommended next shows on the topic page and on Today', async () => {
    const p = progress.value;
    if (p === null) throw new Error('no progress');
    const memory = { 'prob.event-spaces': { reps: 2, intervalDays: 9, due: T0 + 5 * DAY_MS, lastReviewed: T0 - 4 * DAY_MS, lapses: 0, implicitCredit: 0 } };
    await commit({ ...p, memory });
    const nonce = await copyProof();
    paste(item('q4-a-finite'), block(nonce, 12).replace('GAP: none', 'GAP: proof.direct').replace(`REDO: ${OTHER}`, `REDO: ${PROOF}`));
    const status = await within(item('q4-a-finite')).findByText(/^Imported: 12\/20/);
    expect(status.textContent).toMatch(/earlier skill, Direct proof, so it does not count against Events and sigma-algebras/);
    expect(status.textContent).toMatch(/Its redo waits until Direct proof is mastered\./);
    await flush();
    expect(progress.value?.memory).toEqual(memory);
    expect(progress.value?.supervision[0]?.result?.gap).toBe('proof.direct');
    cleanup();
    render(<LessonRunner topicId="prob.event-spaces" salt="test" onEnd={() => undefined} onSkip={() => undefined} />);
    const rec = await screen.findByRole('note');
    expect(rec.textContent).toBe('Recommended next: Direct proof');
    expect(within(rec).getByRole('link', { name: 'Direct proof' }).getAttribute('href')).toMatch(/^#\/learn\/proof\.direct/);
    cleanup();
    render(<Today />);
    const line = await screen.findByRole('link', { name: /Recommended next: Direct proof/ });
    expect(line.getAttribute('href')).toMatch(/^#\/learn\/proof\.direct/);
    expect((await screen.findByText(/waits until you master Direct proof/)).textContent).toMatch(/Redo of Finite unions and intersections/);
    expect(document.querySelector('[data-redo]')).toBeNull();
  });

  it('a missed review: a mark below 14 on a learned topic brings it back sooner', async () => {
    const p = progress.value;
    if (p === null) throw new Error('no progress');
    await commit({ ...p, memory: { 'prob.event-spaces': { reps: 2, intervalDays: 9, due: T0 + 5 * DAY_MS, lastReviewed: T0 - 4 * DAY_MS, lapses: 0, implicitCredit: 0 } } });
    const nonce = await copyProof();
    paste(item('q4-a-finite'), block(nonce, 13));
    expect((await within(item('q4-a-finite')).findByText(/^Imported: 13\/20/)).textContent).toMatch(/below 14, so it counts as a missed review/);
    await flush();
    expect(progress.value?.memory['prob.event-spaces']?.lapses).toBe(1);
    expect(progress.value?.memory['prob.event-spaces']?.due).toBeLessThan(T0 + 5 * DAY_MS);
  });

  it('refuses a cut-off paste, a result for another problem, and a second import, with plain messages, and changes nothing', async () => {
    const nonce = await copyProof();
    const before = progress.value;
    const card = item('q4-a-finite');
    paste(card, block(nonce).split('\n').slice(0, -1).join('\n'));
    expect(within(card).getByRole('alert').textContent).toMatch(/end line .* is missing, so the paste was cut off/);
    expect(progress.value).toBe(before);

    fireEvent.input(within(card).getByLabelText('The result block from Claude'), { target: { value: block(nonce, 12, OTHER) } });
    fireEvent.click(within(card).getByRole('button', { name: 'Import result' }));
    expect(within(card).getByRole('alert').textContent).toMatch(/This result is for prob\.event-spaces\/q6-b-event, not for this problem/);

    fireEvent.input(within(card).getByLabelText('The result block from Claude'), { target: { value: block(nonce).replace('MARK: 12/20', 'MARK: 25/20') } });
    fireEvent.click(within(card).getByRole('button', { name: 'Import result' }));
    expect(within(card).getByRole('alert').textContent).toMatch(/more than the most possible/);
    expect(progress.value).toBe(before);

    fireEvent.input(within(card).getByLabelText('The result block from Claude'), { target: { value: block(nonce) } });
    fireEvent.click(within(card).getByRole('button', { name: 'Import result' }));
    await within(card).findByText(/^Imported: 12\/20/);
    paste(card, block(nonce));
    expect(within(card).getByRole('alert').textContent).toMatch(/already imported/);
  });

  it('Today offers Paste result while a copy waits for its result', async () => {
    const nonce = await copyProof();
    cleanup();
    render(<Today />);
    const part = await screen.findByRole('region', { name: 'Supervision' });
    expect(part.textContent).toMatch(/Waiting for a supervision result: Finite unions and intersections/);
    paste(part, block(nonce));
    expect((await within(part).findByText(/^Imported: 12\/20/)).textContent).toBeTruthy();
    await flush();
    expect(await within(part).findByText('"Infinitely often" is an event')).toBeTruthy();
  });
});

describe('a wrong auto-checked Cambridge problem', () => {
  it('offers Copy for supervision with the answer given and optional working', async () => {
    openCambridge('logic.connectives');
    const card = within(item('bop-2-2-9'));
    // Every card in the stage numbers its input the same (a pre-existing id clash), so it is found inside the card.
    fireEvent.input(item('bop-2-2-9').querySelector('form.answer input') as HTMLInputElement, { target: { value: 'P & Q' } });
    fireEvent.submit(item('bop-2-2-9').querySelector('form.answer') as HTMLFormElement);
    expect(card.getByRole('heading', { name: 'Incorrect' })).toBeTruthy();
    fireEvent.input(card.getByLabelText('Your working (optional)'), { target: { value: 'I read minus as and.' } });
    fireEvent.click(card.getByRole('button', { name: 'Copy for supervision' }));
    await card.findByText(/^Copied\./);
    const text = writeText.mock.calls[0]?.[0] as string;
    expect(text).toContain('PROBLEM: logic.connectives/bop-2-2-9');
    expect(text).toMatch(/My answer, marked wrong by the app: P ∧ Q/);
    expect(text).toContain('My working:\nI read minus as and.');
    // Moving on keeps Paste result on the problem while the copy waits.
    fireEvent.click(card.getByRole('button', { name: 'Try it again' }));
    expect(card.getByRole('button', { name: 'Paste result' })).toBeTruthy();
  });

  it('the problem page opens one problem with a way back', () => {
    render(<ProblemView topicId="prob.event-spaces" problemId="q6-b-event" />);
    expect(screen.getByText(/"Infinitely often" is an event/)).toBeTruthy();
    expect(screen.getByText('Back to today')).toBeTruthy();
  });
});

describe('no self-marking', () => {
  // Every control the supervision parts offer. None of them sets a mark or a pass.
  const ALLOWED = new Set([
    'Copy for supervision', 'Show the copied text', 'Hide the copied text', 'Select all', 'Paste result', 'Import result', 'Cancel', 'Open',
  ]);
  const SELF_MARK = /\b(mark|grade|score|pass|fail|correct|right|got it|done|complete)\b/i;

  function controlsIn(root: ParentNode): { buttons: string[]; fields: Element[] } {
    const buttons = [...root.querySelectorAll('button')].map((b) => b.textContent?.trim() ?? '');
    const fields = [...root.querySelectorAll('input, select, [contenteditable="true"], [role="slider"], [role="spinbutton"]')];
    return { buttons, fields };
  }

  it('no control in supervision, on a problem or on Today, lets the learner mark their own work', async () => {
    setClipboard(false);
    const nonce = await copyProof(undefined, /did not let the app copy/);
    const card = item('q4-a-finite');
    fireEvent.click(within(card).getByRole('button', { name: 'Paste result' }));
    const regions = [...document.querySelectorAll('.supervision')];
    expect(regions.length).toBeGreaterThan(0);
    for (const r of regions) {
      const { buttons, fields } = controlsIn(r);
      expect(fields).toEqual([]);
      for (const b of buttons) {
        expect(ALLOWED.has(b), b).toBe(true);
        expect(b).not.toMatch(SELF_MARK);
      }
    }
    // Only textareas take input: the write-up, the copied block (read only), and the pasted result.
    expect([...card.querySelectorAll('textarea')].map((t) => t.labels?.[0]?.textContent)).toEqual(['Your write-up', 'The supervision block', 'The result block from Claude']);

    fireEvent.input(within(card).getByLabelText('The result block from Claude'), { target: { value: block(nonce) } });
    fireEvent.click(within(card).getByRole('button', { name: 'Import result' }));
    await within(card).findByText(/^Imported: 12\/20/);
    await flush();
    cleanup();
    render(<Today />);
    const part = await screen.findByRole('region', { name: 'Supervision' });
    const { buttons, fields } = controlsIn(part);
    expect(fields).toEqual([]);
    for (const b of buttons) expect(ALLOWED.has(b), b).toBe(true);
  });

  it('typing in the write-up never changes progress; only a pasted result can set a mark', async () => {
    openCambridge('prob.event-spaces');
    const before = progress.value;
    fireEvent.input(within(item('q4-a-finite')).getByLabelText('Your write-up'), { target: { value: 'MARK: 20/20' } });
    await flush();
    expect(progress.value).toBe(before);
    expect(progress.value?.supervision).toEqual([]);
  });
});
