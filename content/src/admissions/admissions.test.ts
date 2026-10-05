import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  aLevelGrade, registry, registryPaper, stepGrade, stepPaperResults, stepPercentile, stepPlacement, stepResults,
  tmuaKey, tmuaKeys, tmuaMark, type StepGrade, type StepPaper,
} from './index';

const GRADES: StepGrade[] = ['S', '1', '2', '3'];
const PAPERS: StepPaper[] = ['STEP 2', 'STEP 3'];
const batch = JSON.parse(readFileSync(new URL('../../../scripts/sources/batch-3.json', import.meta.url), 'utf8')) as { sources: { id: string; url: string }[] };
const batchUrl = new Map(batch.sources.map((s) => [s.id, s.url]));

describe('STEP results', () => {
  it('covers STEP 2 and STEP 3 for every year 2019 to 2026', () => {
    expect(stepResults.years.map((y) => y.year)).toEqual([2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]);
    for (const y of stepResults.years) expect(y.papers.map((p) => p.paper)).toEqual(PAPERS);
  });

  it('has one whole-number count per mark 0 to 120, summing to the candidate total', () => {
    for (const y of stepResults.years) for (const p of y.papers) {
      const { count, candidates, percent_read } = p.distribution;
      expect(count).toHaveLength(121);
      expect(percent_read).toHaveLength(121);
      expect(count.every((c) => Number.isInteger(c) && c >= 0)).toBe(true);
      expect(count.reduce((s, c) => s + c, 0)).toBe(candidates);
      // The reconstructed counts reproduce the bars as read, to drawing precision.
      count.forEach((c, m) => {
        if (p.distribution.clipped_marks.includes(m)) return;
        expect(Math.abs((100 * c) / candidates - percent_read[m]!), `${y.year} ${p.paper} mark ${m}`).toBeLessThan(0.02);
      });
    }
  });

  it('reproduces every printed cumulative percentage within its rounding', () => {
    for (const y of stepResults.years) for (const p of y.papers) {
      const half = 0.5 * 10 ** -p.check.printed_decimals + 1e-9;
      for (const g of GRADES) {
        // Achieving grade g means scoring at least its boundary, so it is 1 minus the share at or below boundary - 1.
        const achieved = 100 * (1 - stepPercentile(y.year, p.paper, p.boundaries[g] - 1));
        expect(Math.abs(achieved - p.cumulative_percent[g]), `${y.year} ${p.paper} grade ${g}`).toBeLessThanOrEqual(half);
      }
      expect(p.check.within_rounding).toBe(true);
    }
  });

  it('keeps the printed tables for spot checks', () => {
    expect(stepPaperResults(2019, 'STEP 3')?.boundaries).toEqual({ S: 77, 1: 57, 2: 48, 3: 27 });
    expect(stepPaperResults(2024, 'STEP 2')?.cumulative_percent).toEqual({ S: 6.12, 1: 19.85, 2: 37.56, 3: 74.95, U: 100 });
    expect(stepPaperResults(2026, 'STEP 3')?.boundaries).toEqual({ S: 80, 1: 56, 2: 48, 3: 30 });
  });

  it('places marks: ends, boundaries, and monotonicity', () => {
    for (const y of stepResults.years) for (const paper of PAPERS) {
      expect(stepPercentile(y.year, paper, 120)).toBe(1);
      const first = stepPlacement(y.year, paper, 0);
      expect(first.atOrBelow).toBe(stepPaperResults(y.year, paper)!.distribution.count[0]);
      let prev = 0;
      for (let m = 0; m <= 120; m++) { const s = stepPercentile(y.year, paper, m); expect(s).toBeGreaterThanOrEqual(prev); prev = s; }
    }
    // 2019 STEP 3: grade 1 from 57; 36.3 percent achieved it, so 63.7 percent scored 56 or less.
    expect(stepPercentile(2019, 'STEP 3', 56)).toBeCloseTo(0.637, 3);
    expect(stepGrade(2019, 'STEP 3', 57)).toBe('1');
    expect(stepGrade(2019, 'STEP 3', 56)).toBe('2');
    expect(stepGrade(2019, 'STEP 3', 26)).toBe('U');
  });

  it('rejects marks outside the paper and years without data', () => {
    expect(() => stepPercentile(2019, 'STEP 2', -1)).toThrow();
    expect(() => stepPercentile(2019, 'STEP 2', 121)).toThrow();
    expect(() => stepPercentile(2019, 'STEP 2', 50.5)).toThrow();
    expect(() => stepPercentile(2018, 'STEP 2', 50)).toThrow();
  });

  it('cites batch-3 sources', () => {
    for (const y of stepResults.years) expect(batchUrl.get(y.source.id)).toBe(y.source.url);
  });
});

describe('TMUA keys', () => {
  it('has 20 letters per paper, two papers a year, 2016 to 2023', () => {
    expect(tmuaKeys.years.map((y) => y.year)).toEqual([2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023]);
    for (const y of tmuaKeys.years) {
      expect(y.papers.map((p) => p.paper)).toEqual([1, 2]);
      for (const p of y.papers) {
        expect(p.key).toMatch(/^[A-H]{20}$/);
        expect(p.questions).toBe(20);
        // Questions the worked answers do not state an option for are listed, never silently counted.
        expect(p.worked_answers_check.confirmed + p.worked_answers_check.not_stated_in_worked_answers.length).toBe(20);
      }
    }
  });

  it('marks answers against the key', () => {
    const key = tmuaKey(2016, 1)!;
    expect(key).toBe('HECBCCBFDEEECDCCDABD');
    expect(tmuaMark(2016, 1, [...key])).toBe(20);
    expect(tmuaMark(2016, 1, [...key.toLowerCase()])).toBe(20);
    expect(tmuaMark(2016, 1, Array<string | null>(20).fill(null))).toBe(0);
    expect(tmuaMark(2016, 1, ['H', ...Array<string | null>(19).fill('Z')])).toBe(1);
    expect(() => tmuaMark(2016, 1, ['H'])).toThrow();
    expect(() => tmuaMark(2015, 1, [...key])).toThrow();
  });
});

describe('paper registry', () => {
  it('has unique ids and sources from batch 3', () => {
    const ids = registry.papers.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of registry.papers) for (const [role, s] of Object.entries(p.sources)) {
      if (s === null) { expect(p.gap, `${p.id} ${role}`).toBeTruthy(); continue; }
      for (const one of Array.isArray(s) ? s : [s]) expect(batchUrl.get(one.id), `${p.id} ${role} ${one.id}`).toBe(one.url);
    }
  });

  it('records the rules of each exam', () => {
    for (const p of registry.papers.filter((x) => x.exam === 'STEP')) expect([p.duration_minutes, p.questions, p.total_marks]).toEqual([180, 12, 120]);
    for (const p of registry.papers.filter((x) => x.exam === 'TMUA')) expect([p.duration_minutes, p.questions, p.total_marks]).toEqual([75, 20, 20]);
    expect(registry.papers.filter((p) => p.exam === 'STEP')).toHaveLength(16);
    expect(registry.papers.filter((p) => p.exam === 'TMUA')).toHaveLength(16);
  });

  it('gives every A level paper ordered grade boundaries out of its total marks', () => {
    const alevels = registry.papers.filter((p) => p.exam === 'A level');
    expect(alevels.length).toBe(30);
    for (const p of alevels) {
      const b = p.boundaries;
      if (b === undefined || !('max_mark' in b)) throw new Error(`${p.id} has no boundaries`);
      expect(b.max_mark).toBe(p.total_marks);
      const seq = [b.max_mark, b['A*'], b.A, b.B, b.C, b.D, b.E];
      for (let i = 1; i < seq.length; i++) expect(seq[i]!, `${p.id}`).toBeLessThanOrEqual(seq[i - 1]!);
    }
    // Pearson notional component boundaries, June 2025, 9MA0 Paper 1: A* 88, E 24.
    expect(aLevelGrade('edx-9ma0-1-2025', 88)).toBe('A*');
    expect(aLevelGrade('edx-9ma0-1-2025', 87)).toBe('A');
    expect(aLevelGrade('edx-9ma0-1-2025', 23)).toBe('U');
    // OCR June 2025, H446/01: a* 112 of 140.
    expect(registryPaper('ocr-h446-01-2025')?.boundaries).toMatchObject({ max_mark: 140, 'A*': 112, A: 99 });
  });

  it('points to fetched files when the sources cache is present', () => {
    const manifest = new URL('../../../sources/manifest.json', import.meta.url);
    if (!existsSync(manifest)) return;
    const m = JSON.parse(readFileSync(manifest, 'utf8')) as { sources: { id: string; status: string }[] };
    const ok = new Set(m.sources.filter((s) => s.status === 'ok').map((s) => s.id));
    for (const p of registry.papers) for (const s of Object.values(p.sources)) if (s) for (const one of Array.isArray(s) ? s : [s]) expect(ok.has(one.id), one.id).toBe(true);
  });
});
