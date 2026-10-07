/// <reference types="node" />
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  DEFAULT_PLACEMENT_OPTIONS, DEFAULT_SCHEDULER_OPTIONS, measurePlacement, renderReport, simulate,
  type PlacementMeasure, type SimResult,
} from '@learnhub/mastery';
import { courseById, coursesTopics } from './courses';
import { topics } from './topics';

// The probstats slice: IA Probability's closure in the shared graph, the reviewed 60 topics plus
// prob.bayes-two-events and prob.event-spaces from Cambridge batch 1, and the 28 ancestors the
// gatefit prerequisites brought in (2026-10-06).
const probstats = coursesTopics(topics, [courseById('ia-probability')]);

const SEEDS = [1, 2, 3, 4, 5];
// 120 days since the slice grew to 90 topics: at 60 days some seeds had not finished it.
const DAYS = 120;
const withCredit = SEEDS.map((seed) => simulate({ topics: probstats, seed, days: DAYS }));
const withoutCredit = SEEDS.map((seed) => simulate({ topics: probstats, seed, days: DAYS, implicitCredit: false }));
const loadOf = (r: SimResult): number[] => r.days.map((d) => d.reviewMinutes + d.quizMinutes);
const mean = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

describe('simulated learner on the probstats graph, 120 days at 60 minutes', () => {
  it('masters all 90 topics within 72 days, with or without credit', () => {
    // 1,590 lesson minutes is 27 days with no reviews and no failed lessons, the floor.
    // Measured: at most 69 days.
    expect(probstats.reduce((a, t) => a + t.estMinutes, 0)).toBe(1590);
    for (const r of [...withCredit, ...withoutCredit]) {
      expect(r.dayAllMastered).not.toBeNull();
      expect(r.dayAllMastered as number).toBeGreaterThanOrEqual(27);
      expect(r.dayAllMastered as number).toBeLessThanOrEqual(72);
    }
  });

  it('never exceeds the daily budget', () => {
    for (const r of [...withCredit, ...withoutCredit]) {
      for (const d of r.days) expect(d.lessonMinutes + d.reviewMinutes + d.quizMinutes).toBeLessThanOrEqual(DEFAULT_SCHEDULER_OPTIONS.budgetMinutes);
    }
  });

  it('review minutes per day stay bounded as mastered topics accumulate', () => {
    for (const r of [...withCredit, ...withoutCredit]) {
      const load = loadOf(r);
      // Never more than about nine tenths of the session (measured 48 minutes with 62 topics,
      // 54 with 90).
      expect(Math.max(...load)).toBeLessThanOrEqual(55);
      // From days 41 to 80 to days 81 to 120 the mastered topics rise to all 90 (every seed
      // finishes by day 69); the load does not follow.
      expect(mean(load.slice(80, 120))).toBeLessThanOrEqual(mean(load.slice(40, 80)));
    }
  });

  it('review load levels off over a longer run with everything mastered', { timeout: 30_000 }, () => {
    const r = simulate({ topics: probstats, seed: 1, days: 150 });
    const load = loadOf(r);
    expect(r.days[149]?.mastered).toBe(probstats.length);
    expect(mean(load.slice(120, 150))).toBeLessThanOrEqual(mean(load.slice(60, 90)) + 1);
    // Measured 12.4 minutes a day with 90 topics (under 10 with 62).
    expect(mean(load.slice(120, 150))).toBeLessThanOrEqual(13);
  });

  // Every seed until the slice grew to 90 topics (2026-10-06). Now seed 5 is the exception at
  // any run of 80 days or more (648 explicit reviews with credit, 629 without, at 120 days): its
  // learner without credit happens to finish a day sooner. The mean cut is 29%.
  it('implicit credit cuts explicit reviews on four of the five seeds, by at least 10% on average', () => {
    const cut = SEEDS.filter((_, i) => (withCredit[i] as SimResult).totalReviews < (withoutCredit[i] as SimResult).totalReviews);
    expect(cut).toEqual([1, 2, 3, 4]);
    const on = mean(withCredit.map((r) => r.totalReviews));
    const off = mean(withoutCredit.map((r) => r.totalReviews));
    expect(1 - on / off).toBeGreaterThanOrEqual(0.1);
    for (const r of withCredit) expect(r.totalImplicitReps).toBeGreaterThan(0);
    for (const r of withoutCredit) expect(r.totalImplicitReps).toBe(0);
  });

  it('without costing recall: day-120 recall with credit is within 5 points of without', () => {
    SEEDS.forEach((_, i) => {
      expect((withCredit[i] as SimResult).finalRetention).toBeGreaterThanOrEqual((withoutCredit[i] as SimResult).finalRetention - 0.05);
    });
  });

  it('is deterministic for a seed', () => {
    expect(simulate({ topics: probstats, seed: 1, days: DAYS })).toEqual(withCredit[0]);
  });
});

describe('purity', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('the engine never reads the wall clock or Math.random', () => {
    vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Math.random called'); });
    vi.spyOn(Date, 'now').mockImplementation(() => { throw new Error('Date.now called'); });
    expect(() => simulate({ topics: probstats, seed: 9, days: 30 })).not.toThrow();
    expect(() => measurePlacement(probstats, { learners: 20, errorRate: 0.05, budget: 30, strategy: 'split', seed: 1 })).not.toThrow();
  });
});

describe('SIMULATION.md', () => {
  it('is regenerated from these runs (checked, not written, under CI)', () => {
    const placement: PlacementMeasure[] = [];
    for (const strategy of ['split', 'entry-points'] as const) {
      for (const budget of [25, DEFAULT_PLACEMENT_OPTIONS.budget]) {
        for (const errorRate of [0, 0.05, 0.1]) {
          placement.push(measurePlacement(probstats, { learners: 1000, errorRate, budget, strategy, seed: 1 }));
        }
      }
    }
    const md = renderReport({
      seeds: SEEDS, withCredit, withoutCredit, placement, topicCount: probstats.length,
      graphName: 'the probstats slice (the IA Probability closure of the shared graph)', graphPath: 'graph/src/topics/',
      generator: { file: 'src/simulate.test.ts', pkg: 'graph' },
    });
    expect(md).not.toMatch(/[\u2013\u2014]/);
    const path = new URL('../SIMULATION.md', import.meta.url);
    let current = '';
    try { current = readFileSync(path, 'utf8'); } catch { /* first run */ }
    if (process.env.CI) expect(current, 'SIMULATION.md is stale; run npm test locally and commit it').toBe(md);
    else if (current !== md) writeFileSync(path, md);
  }, 120_000); // twelve measurements of 1,000 learners take several seconds under a parallel run
});
