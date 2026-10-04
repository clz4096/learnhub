import { describe, expect, it } from 'vitest';
import { breakdown, validateConfig } from '@/engine';
import { EventKind } from '@/engine/types';
import { TERM_IDS } from '@/ui/Term';
import { GLOSSARY, glossaryEntry, searchGlossary } from '@/ui/modes/glossary';
import { lessonById } from '@/ui/modes/lessons';
import { configFor, metricValue, paramsFor, runSetup } from '@/ui/modes/setup';

describe('glossary', () => {
  it('defines every TermId exactly once', () => {
    expect(GLOSSARY.map((e) => e.id).sort()).toEqual([...TERM_IDS].sort());
  });

  it('has one-line definitions, examples, and working "see it" links', () => {
    for (const e of GLOSSARY) {
      expect(e.definition).not.toContain('\n');
      expect(e.definition.length).toBeLessThan(200);
      expect(e.example.length).toBeGreaterThan(10);
      const see = e.see;
      if ('lesson' in see) expect(lessonById(see.lesson), e.id).toBeTruthy();
      else {
        expect(() => validateConfig(configFor(see.setup))).not.toThrow();
        expect(() => paramsFor(see.setup)).not.toThrow();
      }
    }
  });

  it('has no em or en dashes', () => {
    const text = GLOSSARY.map((e) => [e.term, e.definition, e.example, ...(e.aliases ?? [])].join(' ')).join(' ');
    expect(/[\u2013\u2014]/.test(text)).toBe(false);
  });

  it('searches by name, alias, and definition, best match first', () => {
    expect(searchGlossary('')).toHaveLength(GLOSSARY.length);
    expect(searchGlossary('lru')[0]?.id).toBe('lru');
    expect(searchGlossary('plru')[0]?.id).toBe('pseudo-lru');
    expect(searchGlossary('cold').map((e) => e.id)).toContain('compulsory-miss');
    expect(searchGlossary('page walk')[0]?.id).toBe('tlb');
    expect(searchGlossary('zzzz')).toEqual([]);
    expect(glossaryEntry('mesi')?.term).toBe('MESI');
  });

  // Numeric examples not already checked as lesson claims.
  it('tag example: 0x10000000 and 0x10000200 share Textbook L1d set 0 with consecutive tags', () => {
    expect(breakdown(0x10000000, 64, 8)).toMatchObject({ set: 0, tag: 524288 });
    expect(breakdown(0x10000200, 64, 8)).toMatchObject({ set: 0, tag: 524289 });
  });

  it('write-back example: core 1 reading core 0\'s M line writes it back to L3', () => {
    const s = { preset: 'textbook', workload: 'false-sharing', params: { threads: 2, iterations: 4, layout: 'packed' } };
    const o = runSetup(s, { limit: 3, keep: [2] }).outcomes.get(2)!;
    expect(o.events.some((e) => e.kind === EventKind.Writeback && e.cache === 4)).toBe(true);
  });

  it('random replacement example: random keeps some L3 lines on a too-big loop, LRU keeps none', () => {
    const see = glossaryEntry('random-replacement')!.see as { setup: Parameters<typeof runSetup>[0] };
    const random = runSetup(see.setup).stats;
    const lru = runSetup({ ...see.setup, policy: 'lru' }).stats;
    expect(metricValue(lru, 'L3.hits')).toBe(0);
    expect(metricValue(random, 'L3.hits')).toBeGreaterThan(0);
  });
});
