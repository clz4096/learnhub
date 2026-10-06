/** The outcome model: the t factors, the interval, the evidence, and the predictions on real boundaries. */
import { describe, expect, it } from 'vitest';
import * as adm from '@learnhub/content/admissions';
import { finishSitting, newCampaign, recordMarks, startSitting, type Campaign, type Sitting } from './campaign';
import { finishAttempt, recordAttemptMarks, rungSets, startAttempt, type LadderAttempt } from './ladder';
import { T90, Z90, gradeOn, outcomeEvidence, predictionKey, predictions, shareInterval, tFactor } from './outcome';

const T0 = Date.UTC(2026, 9, 5, 14);
const MIN = 60_000;
const DAY = 86_400_000;

function sit(c: Campaign, paperId: string, marks: Pick<Sitting, 'answers' | 'questionMarks' | 'total'>, took: number, at: number): Campaign {
  const started = startSitting(c, paperId, 1, at);
  const s = started.sittings.at(-1)!;
  return recordMarks(finishSitting(started, s.id, at + took * MIN), s.id, marks);
}
const stepMarks = (...six: number[]): (number | null)[] => [...six, ...Array<null>(12 - six.length).fill(null)];

/** The t density, integrated by Simpson's rule from 0 to x, plus a half. */
function tCdf(x: number, d: number): number {
  const lg = (z: number): number => {
    // Lanczos approximation of log Gamma.
    const g = 7;
    const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lg(1 - z);
    z -= 1;
    let a = c[0]!;
    const t = z + g + 0.5;
    for (let i = 1; i < g + 2; i++) a += c[i]! / (z + i);
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
  };
  const k = Math.exp(lg((d + 1) / 2) - lg(d / 2)) / Math.sqrt(d * Math.PI);
  const f = (u: number): number => k * (1 + (u * u) / d) ** (-(d + 1) / 2);
  const n = 2000;
  const h = x / n;
  let s = f(0) + f(x);
  for (let i = 1; i < n; i++) s += (i % 2 === 1 ? 4 : 2) * f(i * h);
  return 0.5 + (s * h) / 3;
}

describe('the t factors', () => {
  it('are the 0.90 quantiles of Student\'s t: the density integrates to 0.90 at each', () => {
    expect(T90).toHaveLength(30);
    T90.forEach((q, i) => expect(tCdf(q, i + 1), `df ${i + 1}`).toBeCloseTo(0.9, 4));
  });

  it('shrink with n, need two results, and become the normal quantile', () => {
    expect(tFactor(1)).toBeNull();
    expect(tFactor(0)).toBeNull();
    expect(tFactor(2)).toBe(T90[0]);
    expect(tFactor(31)).toBe(T90[29]);
    expect(tFactor(32)).toBe(Z90);
    for (let n = 3; n < 40; n++) expect(tFactor(n)!).toBeLessThanOrEqual(tFactor(n - 1)!);
  });
});

describe('shareInterval', () => {
  it('none for no results; a mean and no range for one', () => {
    expect(shareInterval([])).toBeNull();
    expect(shareInterval([0.6])).toEqual({ mean: 0.6, range: null });
  });

  it('mean plus or minus t s over root n', () => {
    const r = shareInterval([0.5, 0.7])!;
    // s = sqrt(0.02) = 0.1414; half = 3.0777 x 0.1414 / 1.4142 = 0.30777.
    expect(r.mean).toBeCloseTo(0.6, 12);
    expect(r.range!.lo).toBeCloseTo(0.6 - 0.30777, 4);
    expect(r.range!.hi).toBeCloseTo(0.6 + 0.30777, 4);
  });

  it('clamps to 0 and 1', () => {
    const r = shareInterval([0.05, 0.95])!.range!;
    expect([r.lo, r.hi]).toEqual([0, 1]);
  });

  it('narrows as more papers agree', () => {
    const base = [0.55, 0.65];
    let width = Infinity;
    for (let k = 0; k < 6; k++) {
      const r = shareInterval([...base, ...Array.from({ length: k }, (_, i) => (i % 2 === 0 ? 0.55 : 0.65))])!.range!;
      expect(r.hi - r.lo).toBeLessThan(width);
      width = r.hi - r.lo;
    }
  });
});

describe('evidence', () => {
  it('full sittings and ladder halves, timed or not, oldest first; questions and unmarked work are not evidence', () => {
    let c = newCampaign('maths', T0);
    c = sit(c, 'step-2024-2', { questionMarks: stepMarks(15, 15, 10, 10, 10, 8) }, 170, T0 + DAY);
    c = sit(c, 'step-2023-2', { questionMarks: stepMarks(20, 20, 20, 20, 20, 20) }, 200, T0 + 2 * DAY);
    c = startSitting(c, 'step-2022-2', 1, T0 + 3 * DAY);
    let list: LadderAttempt[] = startAttempt(adm, [], 'step-2025-2', 'half', rungSets(adm.registryPaper('step-2025-2')!, 'half')[0]!, T0);
    const id = list[0]!.id;
    list = recordAttemptMarks(adm, finishAttempt(list, id, T0 + 80 * MIN), id, { marks: stepMarks(20, 10, 5) });
    list = [...list, { id: 'q', paperId: 'step-2025-2', rung: 'question', questions: [1], startedAt: T0, finishedAt: T0 + MIN, marks: [20] }];
    const ev = outcomeEvidence(adm, c, list);
    expect(ev.map((e) => [e.kind, e.paper.id, e.mark, e.max, e.timed])).toEqual([
      ['half', 'step-2025-2', 35, 60, true],
      ['full', 'step-2024-2', 68, 120, true],
      ['full', 'step-2023-2', 120, 120, false],
    ]);
    // A half is graded scaled to the paper: 35 of 60 is 70 of 120, grade 2 on 2025 STEP 2 (grade 1 from 75).
    expect(ev[0]!.grade).toBe('2');
    // 68 on 2024 STEP 2: grade 2 (grade 1 from 69).
    expect(ev[1]!.grade).toBe('2');
  });

  it('grades on the paper\'s own boundaries; TMUA has none', () => {
    expect(gradeOn(adm, adm.registryPaper('step-2019-2')!, 68)).toBe('1');
    expect(gradeOn(adm, adm.registryPaper('edx-9ma0-1-2024')!, 81)).toBe('A*');
    expect(gradeOn(adm, adm.registryPaper('tmua-2016-p1')!, 20)).toBeNull();
    expect(predictionKey(adm.registryPaper('tmua-2016-p1')!)).toBe('TMUA Paper 1');
    expect(predictionKey(adm.registryPaper('edx-9ma0-1-2024')!)).toBe('9MA0/01');
  });
});

describe('predictions', () => {
  it('none without evidence', () => {
    expect(predictions(adm, null, [])).toEqual([]);
    expect(predictions(adm, newCampaign('maths', T0), [])).toEqual([]);
  });

  it('STEP: one timed paper gives a mark and grade on the latest year, with no range yet', () => {
    const c = sit(newCampaign('maths', T0), 'step-2024-2', { questionMarks: stepMarks(15, 15, 12, 10, 10, 10) }, 175, T0);
    const [p] = predictions(adm, c, []);
    expect(p).toMatchObject({ key: 'STEP 2', exam: 'STEP', reference: 'STEP 2 2026', max: 120, n: 1, low: null, high: null });
    expect(p!.predicted).toEqual({ mark: 72, grade: '1' });
    expect(p!.boundaries).toEqual([{ grade: 'S', mark: 84 }, { grade: '1', mark: 62 }, { grade: '2', mark: 52 }, { grade: '3', mark: 34 }]);
    // 1,208 of the 1,439 reconstructed 2026 STEP 2 candidates scored 72 or less.
    expect(p!.atOrBelow).toBeCloseTo(1208 / 1439, 12);
  });

  it('STEP: two or more timed papers give a range on the boundaries, which narrows as they agree', () => {
    let c = newCampaign('maths', T0);
    c = sit(c, 'step-2024-2', { questionMarks: stepMarks(15, 15, 12, 10, 10, 10) }, 175, T0);
    c = sit(c, 'step-2023-2', { questionMarks: stepMarks(10, 10, 10, 10, 10, 10) }, 175, T0 + DAY);
    const two = predictions(adm, c, [])[0]!;
    expect(two.n).toBe(2);
    expect(two.predicted!.mark).toBeCloseTo(66, 9);
    expect(two.low!.mark).toBeLessThan(two.predicted!.mark);
    expect(two.high!.mark).toBeGreaterThan(two.predicted!.mark);
    expect(two.low!.grade).toBe('3');
    c = sit(c, 'step-2022-2', { questionMarks: stepMarks(12, 12, 11, 11, 10, 10) }, 175, T0 + 2 * DAY);
    c = sit(c, 'step-2021-2', { questionMarks: stepMarks(12, 12, 11, 11, 10, 10) }, 175, T0 + 3 * DAY);
    const four = predictions(adm, c, [])[0]!;
    expect(four.n).toBe(4);
    expect(four.high!.mark - four.low!.mark).toBeLessThan(two.high!.mark - two.low!.mark);
    expect(four.low!.grade).toBe('2');
  });

  it('untimed papers are evidence on the list but not in the prediction', () => {
    let c = sit(newCampaign('maths', T0), 'step-2024-3', { questionMarks: stepMarks(20, 20, 20, 20, 20, 20) }, 240, T0);
    let p = predictions(adm, c, [])[0]!;
    expect(p).toMatchObject({ key: 'STEP 3', n: 0, predicted: null, atOrBelow: null });
    expect(p.evidence).toHaveLength(1);
    c = sit(c, 'step-2024-3', { questionMarks: stepMarks(10, 10, 10) }, 170, T0 + DAY);
    p = predictions(adm, c, [])[0]!;
    expect(p.predicted).toEqual({ mark: 30, grade: '3' });
  });

  it('A level: by component, on the latest series\' boundaries', () => {
    let c = newCampaign('maths', T0);
    c = sit(c, 'edx-9ma0-1-2024', { total: 80 }, 118, T0);
    c = sit(c, 'edx-9ma0-1-2025', { total: 90 }, 118, T0 + DAY);
    c = sit(c, 'ocr-h446-01-2024', { total: 112 }, 150, T0 + 2 * DAY);
    const ps = predictions(adm, c, []);
    expect(ps.map((p) => p.key)).toEqual(['9MA0/01', 'H446/01']);
    const m = ps[0]!;
    expect(m).toMatchObject({ subject: 'maths', reference: '9MA0/01 June 2025', max: 100, n: 2 });
    // 85 of 100 on 9MA0/01 June 2025: A (A* from 88).
    expect(m.predicted!.mark).toBeCloseTo(85, 9);
    expect(m.predicted!.grade).toBe('A');
    expect(m.boundaries[0]).toEqual({ grade: 'A*', mark: 88 });
    const cs = ps[1]!;
    expect(cs).toMatchObject({ subject: 'cs', reference: 'H446/01 June 2025', max: 140, n: 1 });
    // 112 of 140 on H446/01 June 2025: A* (from 112).
    expect(cs.predicted).toEqual({ mark: 112, grade: 'A*' });
  });

  it('TMUA: a raw mark out of 20 and no grade', () => {
    let c = newCampaign('maths', T0);
    const key = [...adm.tmuaKey(2016, 1)!];
    c = sit(c, 'tmua-2016-p1', { answers: key.map((x, i) => (i < 15 ? x : null)) }, 75, T0);
    const half = startAttempt(adm, [], 'tmua-2017-p1', 'half', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], T0 + DAY);
    const k17 = adm.tmuaKey(2017, 1)!;
    const list = recordAttemptMarks(adm, finishAttempt(half, half[0]!.id, T0 + DAY + 30 * MIN), half[0]!.id, { answers: [...k17.slice(0, 10)].map((x, i) => (i < 6 ? x : null)) });
    const [p] = predictions(adm, c, list);
    expect(p).toMatchObject({ key: 'TMUA Paper 1', exam: 'TMUA', reference: null, max: 20, boundaries: [], n: 2, atOrBelow: null });
    // 15 of 20 and 6 of 10: mean share 0.675, so 13.5 of 20.
    expect(p!.predicted).toEqual({ mark: 13.5, grade: null });
    expect(p!.low!.grade).toBeNull();
  });

  it('orders STEP, then A level, then TMUA', () => {
    let c = newCampaign('maths', T0);
    c = sit(c, 'tmua-2016-p2', { answers: Array<null>(20).fill(null) }, 70, T0);
    c = sit(c, 'edx-9fm0-1-2024', { total: 40 }, 80, T0);
    c = sit(c, 'step-2019-3', { questionMarks: stepMarks(1) }, 100, T0);
    c = sit(c, 'step-2019-2', { questionMarks: stepMarks(1) }, 100, T0);
    expect(predictions(adm, c, []).map((p) => p.key)).toEqual(['STEP 2', 'STEP 3', '9FM0/01', 'TMUA Paper 2']);
  });
});
