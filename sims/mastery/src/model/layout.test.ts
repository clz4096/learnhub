import { describe, expect, it } from 'vitest';
import { AREAS } from '@learnhub/graph';
import { LEVELS } from '@learnhub/mastery';
import { closureTopics } from '@/model/courses';
import { NODE_W, layout } from '@/model/layout';

describe('map layout', () => {
  for (const courses of [['ia-probability', 'cst-discrete-maths'], ['ia-probability'], ['cst-discrete-maths']]) {
    const ts = closureTopics(courses);
    const lay = layout(ts, Object.keys(AREAS));
    it(`${courses.join(' and ')}: places every topic once, inside the drawing`, () => {
      expect(lay.nodes.size).toBe(ts.length);
      for (const n of lay.nodes.values()) {
        expect(n.x).toBeGreaterThanOrEqual(0);
        expect(n.x + NODE_W).toBeLessThanOrEqual(lay.width);
        expect(n.y).toBeLessThan(lay.height);
      }
    });
    it(`${courses.join(' and ')}: no two topics overlap in a row`, () => {
      const rows = new Map<number, number[]>();
      for (const n of lay.nodes.values()) rows.set(n.y, [...(rows.get(n.y) ?? []), n.x]);
      for (const xs of rows.values()) {
        const s = xs.sort((a, b) => a - b);
        for (let i = 1; i < s.length; i++) expect((s[i] as number) - (s[i - 1] as number)).toBeGreaterThanOrEqual(NODE_W);
      }
    });
    it(`${courses.join(' and ')}: every prerequisite sits above the topic, and levels come in order`, () => {
      for (const e of lay.edges) expect(lay.nodes.get(e.from)?.y as number).toBeLessThan(lay.nodes.get(e.to)?.y as number);
      const order = lay.bands.map((b) => LEVELS.indexOf(b.level as never));
      expect(order).toEqual([...order].sort((a, b) => a - b));
    });
  }
});
