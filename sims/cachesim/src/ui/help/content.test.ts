import { describe, expect, it } from 'vitest';
import { EventKind, type AccessOutcome } from '@/engine/types';
import { Simulator, validateConfig } from '@/engine';
import { customWorkload, parseTraceText, workloadById } from '@/workloads';
import { configFor, paramsFor } from '@/ui/modes/setup';
import { lessonById, LESSONS } from '@/ui/modes/lessons';
import { glossaryEntry } from '@/ui/modes/glossary';
import { isTermId, markedTerms } from '@/ui/Term';
import { BENCH_NAMES } from '@/ui/bench';
import { EXAMPLE_TRACE, HELP_SECTIONS, LEARN_STEPS, SHORTCUTS } from '@/ui/help/content';
import { TOUR_STEPS } from '@/ui/help/walkthrough';

describe('every "try this" action configures a valid setup', () => {
  for (const s of HELP_SECTIONS) {
    if (!s.action) continue;
    const a = s.action;
    it(`${s.id}: ${a.label}`, () => {
      const w = workloadById(a.setup.workload);
      expect(w, `workload ${a.setup.workload}`).toBeDefined();
      const cfg = configFor(a.setup);
      expect(() => validateConfig(cfg)).not.toThrow();
      const params = paramsFor(a.setup);
      // Overrides must name real params of that workload.
      const names = new Set(w!.params.map((p) => p.key));
      for (const k of Object.keys(a.setup.params ?? {})) expect(names.has(k), `param ${k}`).toBe(true);
      expect(w!.estimateLength(params, { lineBytes: cfg.l1d.lineBytes, cores: cfg.cores, seed: cfg.seed })).toBeGreaterThan(0);
      if (a.trace !== undefined) {
        expect(a.setup.workload).toBe('custom');
        expect(parseTraceText(a.trace).errors).toEqual([]);
      }
      if (a.lesson) expect(lessonById(a.lesson)).toBeDefined();
      if (a.term) expect(glossaryEntry(a.term)).toBeDefined();
      for (const step of a.then ?? []) expect(['step', 'play', 'runToEnd']).toContain(step.kind);
    });
  }

  it('every way to use the tool has an action', () => {
    expect(HELP_SECTIONS.filter((s) => !s.action).map((s) => s.id)).toEqual([]);
  });

  it('the Guided action opens lesson 1', () => {
    expect(HELP_SECTIONS.find((s) => s.id === 'guided')?.action?.lesson).toBe(LESSONS[0]!.id);
  });

  it('the Try it for real action picks a workload that has a benchmark', () => {
    expect(BENCH_NAMES[HELP_SECTIONS.find((s) => s.id === 'tryit')!.action!.setup.workload]).toBeDefined();
  });
});

describe('the example custom trace does what its comments say (Textbook preset)', () => {
  const a = HELP_SECTIONS.find((s) => s.id === 'custom')!.action!;
  const cfg = configFor(a.setup);
  const sim = new Simulator(cfg);
  const out: AccessOutcome[] = [];
  const w = customWorkload(EXAMPLE_TRACE);
  sim.run(w.trace({}, { lineBytes: cfg.l1d.lineBytes, cores: cfg.cores, seed: cfg.seed }), Infinity, (o) => { out.push(o); });
  const l1d0 = sim.infos.find((c) => c.core === 0 && c.level === 'L1d')!.id;
  const firstLine = 0x10000000 / cfg.l1d.lineBytes;
  const l1Events = (i: number) => out[i]!.events.filter((e) => e.cache === l1d0);

  it('has 6 accesses', () => expect(out.length).toBe(6));
  it('reads one line twice: a miss, then a hit', () => {
    expect(out[0]!.servedBy).toBe('DRAM');
    expect(out[1]!.servedBy).toBe('L1');
  });
  it('the next two lines land in the same L1d set, and the third line evicts the first', () => {
    const sets = [0, 2, 3].map((i) => l1Events(i).find((e) => e.kind === EventKind.Fill)!.set);
    expect(new Set(sets).size).toBe(1);
    expect(l1Events(2).some((e) => e.kind === EventKind.Evict)).toBe(false);
    expect(l1Events(3).some((e) => e.kind === EventKind.Evict && e.line === firstLine)).toBe(true);
  });
  it('the first line then misses in L1d', () => {
    expect(out[4]!.servedBy).not.toBe('L1');
  });
  it('core 1 writing the line invalidates core 0\'s copy', () => {
    expect(l1Events(5).some((e) => e.kind === EventKind.Invalidate && e.line === firstLine)).toBe(true);
  });
});

describe('help and tour text', () => {
  const texts: string[] = [
    ...TOUR_STEPS.flatMap((s) => [s.title, s.text]),
    ...HELP_SECTIONS.flatMap((s) => [s.title, s.howTo, s.action?.label ?? '', ...(s.blocks ?? []).flatMap((b) => [b.heading ?? '', b.text, b.code ?? ''])]),
    ...SHORTCUTS.flatMap((k) => [k.keys, k.where, k.does]),
    ...LEARN_STEPS.flatMap((l) => [l.name, l.text]),
  ];

  it('marks only real glossary terms', () => {
    for (const t of texts) for (const id of markedTerms(t)) expect(isTermId(id), id).toBe(true);
  });

  it('uses no em or en dashes', () => {
    for (const t of texts) expect(t, t).not.toMatch(/[\u2013\u2014]/);
  });

  it('the first tour step explains the tool with the bookcase and box analogy', () => {
    const first = TOUR_STEPS[0]!.text;
    expect(first).toMatch(/bookcase near your desk/);
    expect(first).toMatch(/box/);
    expect(first).toMatch(/warehouse/);
  });

  it('the modes step recommends Guided lesson 1', () => {
    expect(TOUR_STEPS.find((s) => s.id === 'modes')!.text).toMatch(/Guided, lesson 1/);
  });
});

describe('GUIDE.md carries the same content', async () => {
  const { readFileSync } = await import('node:fs');
  const guide = readFileSync(new URL('../../../GUIDE.md', import.meta.url), 'utf8');

  it('has every Help section and the example trace', () => {
    for (const s of HELP_SECTIONS) expect(guide, s.title).toContain(`### ${s.title}`);
    expect(guide).toContain(EXAMPLE_TRACE);
    for (const l of LEARN_STEPS) expect(guide.replaceAll('`', '')).toContain(`**${l.name}.** ${l.text}`);
  });

  it('lists the 10 lessons in order in the learning path', () => {
    const path = guide.slice(guide.indexOf('## Learning path'));
    LESSONS.forEach((l, i) => expect(path, l.title).toContain(`${i + 1}. **${l.title}.**`));
  });

  it('lists every shortcut', () => {
    for (const k of SHORTCUTS) expect(guide, k.keys).toContain(`| ${k.keys} | ${k.where.replace('this Help page', 'the Help page')} | ${k.does} |`);
  });

  it('uses no em or en dashes', () => {
    expect(guide).not.toMatch(/[–—]/);
  });
});
