// Rule 7 (mastery/HOW-A-TOPIC-WORKS.md): the mark schemes a supervision is marked against, and
// the marker-only outline of a supervision problem.
import { describe, expect, it } from 'vitest';
import { CITED_DOCS, MARK_SCHEME_DOCS, isMarkScheme, personalWords } from './cambridge';
import { TOPIC_CONTENT } from './topics';

describe('official STEP mark schemes', () => {
  it('are exactly the cited STEP documents whose title says they hold a mark scheme', () => {
    const titled = (Object.keys(CITED_DOCS) as (keyof typeof CITED_DOCS)[])
      .filter((d) => d.startsWith('stepdb-') && /mark scheme/i.test(CITED_DOCS[d]));
    expect([...MARK_SCHEME_DOCS].sort()).toEqual(titled.sort());
    expect(isMarkScheme({ doc: 'stepdb-12-s1-ms', at: 'Question 1' })).toBe(true);
    expect(isMarkScheme({ doc: 'stepdb-04-ha', at: 'STEP I, Q6' })).toBe(false);
  });
});

describe('supervision outlines', () => {
  it('when written, are non-empty lines in the neutral voice', () => {
    for (const c of TOPIC_CONTENT) {
      for (const p of c.cambridge) {
        if (p.mode !== 'supervision' || p.outline === undefined) continue;
        expect(p.outline.length, `${c.topicId}/${p.id}`).toBeGreaterThan(0);
        p.outline.forEach((line, i) => {
          expect(line.length, `${c.topicId}/${p.id} outline ${i + 1}`).toBeGreaterThan(0);
          expect(personalWords(line), `${c.topicId}/${p.id} outline ${i + 1}: neutral voice`).toEqual([]);
        });
      }
    }
  });
});
