import { describe, expect, it } from 'vitest';
import { customWorkload, customWorkloadFromParsed, parseTraceText } from './custom';

describe('parseTraceText', () => {
  it('parses valid lines, comments, and blank lines', () => {
    const r = parseTraceText('# header\n\n0x7ffd1000 R 0\n  7ffd1040 w 1  # trailing\r\n0X10 I 7\n');
    expect(r.errors).toEqual([]);
    expect(r.accesses).toEqual([
      { addr: 0x7ffd1000, kind: 'R', core: 0, src: 0 },
      { addr: 0x7ffd1040, kind: 'W', core: 1, src: 0 },
      { addr: 0x10, kind: 'I', core: 7, src: 0 },
    ]);
  });

  it('reports bad hex, kind, core, and field count with line numbers', () => {
    const r = parseTraceText(['0x10 R 0', '0xZZ R 0', '0x20 X 0', '0x30 W -1', '0x40 W 8', '0x50 R', '0x60 R 0 9', '0x70 W 1.5'].join('\n'));
    expect(r.accesses.length).toBe(1);
    expect(r.errors.length).toBe(7);
    expect(r.errors[0]).toMatch(/^line 2: bad hex/);
    expect(r.errors[1]).toMatch(/^line 3: bad kind/);
    expect(r.errors[2]).toMatch(/^line 4: bad core/);
    expect(r.errors[3]).toMatch(/^line 5: bad core/);
    expect(r.errors[4]).toMatch(/^line 6: expected/);
    expect(r.errors[5]).toMatch(/^line 7: expected/);
    expect(r.errors[6]).toMatch(/^line 8: bad core/);
  });

  it('rejects addresses at or above 2^53', () => {
    expect(parseTraceText('0x20000000000000 R 0').errors[0]).toMatch(/^line 1: address/);
  });
});

describe('customWorkload', () => {
  it('replays parsed accesses, wrapping cores to the simulated count', () => {
    const w = customWorkload('0x0 R 0\n0x40 W 3\nbad\n');
    expect(w.params).toEqual([]);
    expect(w.estimateLength({}, { lineBytes: 64, cores: 2, seed: 1 })).toBe(2);
    expect(Array.from(w.trace({}, { lineBytes: 64, cores: 2, seed: 1 }))).toEqual([
      { addr: 0, kind: 'R', core: 0, src: 0 },
      { addr: 0x40, kind: 'W', core: 1, src: 0 },
    ]);
    expect(w.source({}).notes).toMatch(/1 line\(s\) skipped/);
  });
});

describe('skipped count', () => {
  it('counts every bad line even when the error list is capped', () => {
    const p = parseTraceText(Array.from({ length: 150 }, () => 'nope').join('\n'));
    expect(p.skipped).toBe(150);
    expect(p.errors.length).toBe(101);
    expect(p.errors[100]).toBe('50 more error(s) not listed');
    const exact = parseTraceText(Array.from({ length: 100 }, () => 'nope').join('\n'));
    expect(exact.errors.length).toBe(100);
    expect(customWorkloadFromParsed(p).source({}).notes).toContain('150 line(s) skipped');
  });
});
