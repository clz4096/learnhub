/** The outcome panel: predictions with ranges on real boundaries, the evidence, and the empty state. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/preact';
import * as adm from '@learnhub/content/admissions';
import { finishSitting, newCampaign, recordMarks, startSitting, type Campaign, type Sitting } from '@/model/campaign';
import { reloadCampaign, saveCampaign } from '@/model/campaignStore';
import { finishAttempt, recordAttemptMarks, startAttempt } from '@/model/ladder';
import { LADDER_KEY, ladder } from '@/model/ladderStore';
import { admissions } from '@/ui/campaignShared';
import { OutcomePanel } from '@/ui/OutcomePanel';

const T0 = Date.UTC(2026, 9, 5, 14);
const MIN = 60_000;
const DASH = /[–—]/;

function sit(c: Campaign, paperId: string, marks: Pick<Sitting, 'answers' | 'questionMarks' | 'total'>, took: number, at: number): Campaign {
  const started = startSitting(c, paperId, 1, at);
  const s = started.sittings.at(-1)!;
  return recordMarks(finishSitting(started, s.id, at + took * MIN), s.id, marks);
}
const six = (...m: number[]): (number | null)[] => [...m, ...Array<null>(12 - m.length).fill(null)];

beforeEach(() => {
  localStorage.clear();
  reloadCampaign();
  ladder.value = [];
  admissions.value = adm;
});
afterEach(cleanup);

describe('OutcomePanel', () => {
  it('says what to do when there are no timed papers', () => {
    render(<OutcomePanel />);
    expect(screen.getByRole('heading', { name: 'Predicted results' })).toBeTruthy();
    expect(screen.getByText(/No timed papers yet/)).toBeTruthy();
  });

  it('one STEP paper: the mark and grade on the latest boundaries, the candidates below it, and no range yet', () => {
    saveCampaign(sit(newCampaign('maths', T0), 'step-2024-2', { questionMarks: six(15, 15, 12, 10, 10, 10) }, 175, T0));
    render(<OutcomePanel />);
    const card = within(screen.getByRole('article', { name: 'STEP 2 prediction' }));
    expect(card.getByText('72 of 120, grade 1', { selector: 'b' })).toBeTruthy();
    expect(card.getByText('Sit one more timed paper to see a range.')).toBeTruthy();
    expect(card.getByText('About 84 percent of STEP 2 2026 candidates scored this mark or less.')).toBeTruthy();
    expect(card.getByText('Boundaries, STEP 2 2026: grade S from 84, grade 1 from 62, grade 2 from 52, grade 3 from 34.')).toBeTruthy();
    expect(card.getByText('Timed: counted.')).toBeTruthy();
  });

  it('a range from two papers, with a ladder half and an over-time paper in the evidence', () => {
    let c = sit(newCampaign('maths', T0), 'step-2024-2', { questionMarks: six(15, 15, 12, 10, 10, 10) }, 175, T0);
    c = sit(c, 'step-2023-2', { questionMarks: six(20, 20, 20, 20, 20, 20) }, 240, T0 + MIN * 300);
    saveCampaign(c);
    const all = Array.from({ length: 12 }, (_, i) => i + 1);
    let list = startAttempt(adm, [], 'step-2025-2', 'half', all, T0 + MIN * 600);
    list = recordAttemptMarks(adm, finishAttempt(list, list[0]!.id, T0 + MIN * 680), list[0]!.id, { marks: six(20, 10, 0) });
    localStorage.setItem(LADDER_KEY, JSON.stringify(list));
    render(<OutcomePanel />);
    const card = within(screen.getByRole('article', { name: 'STEP 2 prediction' }));
    // Shares 0.6 and 0.5: mean 0.55, 66 of 120.
    expect(card.getByText('66 of 120, grade 1', { selector: 'b' })).toBeTruthy();
    expect(card.getByText(/^Likely \d+ to \d+ of 120: grade 3 to grade S\.$/)).toBeTruthy();
    expect(card.getByText('Over time: listed, not counted.')).toBeTruthy();
    expect(card.getByText('30 of 60, grade 3 scaled to the paper')).toBeTruthy();
    expect(card.getByText('Evidence (3)')).toBeTruthy();
  });

  it('TMUA: a raw mark only, and why', () => {
    saveCampaign(sit(newCampaign('maths', T0), 'tmua-2016-p1', { answers: [...adm.tmuaKey(2016, 1)!].map((x, i) => (i < 12 ? x : null)) }, 70, T0));
    render(<OutcomePanel />);
    const card = within(screen.getByRole('article', { name: 'TMUA Paper 1 prediction' }));
    expect(card.getByText('12 of 20', { selector: 'b' })).toBeTruthy();
    expect(card.getByText(/No official grade boundaries or score conversion exist for past TMUA papers/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(DASH);
  });

  it('rule 8: each timed sitting\'s prediction beside its real result, the mean gap, and the bar it learned', () => {
    const forecast = { predicted: 0.6, from: 'mastery' as const, mastered: 0.5 };
    let list = startAttempt(adm, [], 'step-2025-2', 'question', [1], T0, forecast);
    list = recordAttemptMarks(adm, finishAttempt(list, list[0]!.id, T0 + 25 * MIN), list[0]!.id, { marks: [16] });
    localStorage.setItem(LADDER_KEY, JSON.stringify(list));
    render(<OutcomePanel />);
    expect(screen.getByRole('heading', { name: 'Predicted and real' })).toBeTruthy();
    const card = within(screen.getByRole('article', { name: 'STEP predictions and results' }));
    // 16 of 20 is 80 percent, 20 points over a 60 percent prediction; passed with half the syllabus mastered, so the bar moves to 55.
    expect(card.getByText('predicted 60%, real 80%')).toBeTruthy();
    expect(card.getByText(/Real results average 20 points over the prediction\./)).toBeTruthy();
    expect(card.getByText('55%', { selector: 'b' })).toBeTruthy();
    expect(card.getByText(/Passed: 14 of 20 or better\./)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(DASH);
  });

  it('rule 8: no sitting with a prediction yet', () => {
    render(<OutcomePanel />);
    expect(screen.getByText('No timed sitting with a prediction yet.')).toBeTruthy();
  });
});
