/**
 * Every number a lesson states is checked here against the engine, so lessons cannot
 * drift from the model. If the model changes, these fail and the lesson text (built
 * from the same claim objects) must be re-derived.
 */
import { describe, expect, it } from 'vitest';
import { validateConfig, presetById } from '@/engine';
import { workloadById } from '@/workloads';
import { TERM_IDS, markedTerms } from '@/ui/Term';
import { LESSONS, actionLabel } from '@/ui/modes/lessons';
import { configFor, evaluateClaim, metricValue, paramsFor, round, runSetup, type Setup } from '@/ui/modes/setup';
import type { Stats } from '@/engine';

const statsCache = new Map<string, Stats>();
function statsFor(s: Setup): Stats {
  const k = JSON.stringify(s);
  let st = statsCache.get(k);
  if (!st) statsCache.set(k, (st = runSetup(s).stats));
  return st;
}

const DASHES = /[\u2013\u2014]/;

describe('lessons', () => {
  it('has 8 to 10 lessons with unique ids', () => {
    expect(LESSONS.length).toBeGreaterThanOrEqual(8);
    expect(LESSONS.length).toBeLessThanOrEqual(10);
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
  });

  for (const lesson of LESSONS) {
    describe(lesson.id, () => {
      it('is well formed: goal, steps, notice, one correct answer, an explanation per choice', () => {
        expect(lesson.goal.length).toBeGreaterThan(10);
        expect(lesson.why.length).toBeGreaterThan(10);
        expect(lesson.steps.length).toBeGreaterThan(0);
        expect(lesson.notice.length).toBeGreaterThan(0);
        expect(lesson.claims.length).toBeGreaterThan(0);
        expect(lesson.question.choices.filter((c) => c.correct).length).toBe(1);
        for (const c of lesson.question.choices) expect(c.why.length).toBeGreaterThan(10);
        for (const t of lesson.terms) expect(TERM_IDS).toContain(t);
        // The first actionable step loads a setup, so a lesson never depends on prior state.
        const first = lesson.steps.find((s) => s.actions?.length);
        expect(first?.actions?.[0]?.kind).toBe('setup');
        for (const s of lesson.steps) if (s.actions?.length) expect(actionLabel(s)).not.toBe('');
      });

      it('uses only valid presets, workloads, and configs', () => {
        for (const s of lesson.steps) {
          for (const a of s.actions ?? []) {
            if (a.kind !== 'setup') continue;
            expect(presetById(a.setup.preset)).toBeTruthy();
            expect(workloadById(a.setup.workload)).toBeTruthy();
            expect(() => validateConfig(configFor(a.setup))).not.toThrow();
            paramsFor(a.setup);
          }
        }
      });

      it('has no em or en dashes in its text', () => {
        const text = [lesson.title, lesson.why, lesson.goal, ...lesson.steps.map((s) => s.text), ...lesson.notice,
          lesson.question.prompt, ...lesson.question.choices.flatMap((c) => [c.text, c.why])].join('\n');
        expect(DASHES.test(text)).toBe(false);
      });

      it('links only to glossary terms that exist', () => {
        const text = [lesson.why, lesson.goal, ...lesson.steps.map((s) => s.text), ...lesson.notice].join('\n');
        for (const id of markedTerms(text)) expect(TERM_IDS, id).toContain(id);
      });

      it('states numbers the engine reproduces', () => {
        for (const c of lesson.claims) {
          if (c.kind === 'stat') {
            const got = round(metricValue(statsFor(c.setup), c.metric), c.digits ?? 0);
            expect({ metric: c.metric, setup: c.setup.params, value: got }).toEqual({ metric: c.metric, setup: c.setup.params, value: c.value });
          } else {
            const got = evaluateClaim(c) as Record<string, unknown>;
            const picked = Object.fromEntries(Object.keys(c.expect).map((k) => [k, got[k]]));
            expect({ index: c.index, ...picked }).toEqual({ index: c.index, ...c.expect });
          }
        }
      });

      it('every claimed setup is one the lesson actually loads', () => {
        const loaded = new Set(lesson.steps.flatMap((s) => (s.actions ?? []).flatMap((a) => (a.kind === 'setup' ? [JSON.stringify(a.setup)] : []))));
        // Claims about setups the user never loads would be unverifiable in the UI;
        // allow only the one deliberate exception (a question about a 4-way L1d).
        const unloaded = lesson.claims.filter((c) => !loaded.has(JSON.stringify(c.setup)));
        expect(unloaded.length).toBeLessThanOrEqual(lesson.id === 'conflict' ? 1 : 0);
      });
    });
  }
});
