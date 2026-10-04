import { describe, it, expect } from 'vitest';
import macos from '@/ui/tryit/fixtures/macos-x86_64.results.csv?raw';
import {
  STORAGE_KEY, clearStoredResults, loadStoredResults, parseResultsCsv, saveStoredResults, type StorageLike,
} from '@/ui/tryit/results';

describe('parseResultsCsv', () => {
  it('reads a real results.csv from scripts/verify', () => {
    const p = parseResultsCsv(macos);
    expect(p.errors).toEqual([]);
    expect(p.rows.length).toBe(37);
    expect(p.rows).toContainEqual({ bench: 'matrix_traverse', variant: 'col_major', param: 'N=2048', medianNs: 59683990, nsPerAccess: 14.2298 });
    expect(p.rows.find((r) => r.bench === 'strided_i32' && r.param === '16(64B)')?.nsPerAccess).toBe(6.5757);
  });

  it('reads raw benchmark stdout: RESULT lines count, the human table does not', () => {
    const text = [
      '# bench: aos_soa',
      'RESULT,aos_soa,aos,N=65536,101702,1.5519',
      'variant   param   median_ms',
      'aos       N=65536 0.10',
      'RESULT,aos_soa,soa,N=65536,11622,0.1773',
    ].join('\n');
    const p = parseResultsCsv(text);
    expect(p.errors).toEqual([]);
    expect(p.rows.map((r) => r.variant)).toEqual(['aos', 'soa']);
  });

  it('accepts CRLF line endings and blank lines (a file saved on Windows)', () => {
    const p = parseResultsCsv('bench,variant,param,median_ns,ns_per_access\r\n\r\nseq_sum,sum_L1,16K,237,0.0578\r\n');
    expect(p.rows).toHaveLength(1);
    expect(p.rows[0]!.param).toBe('16K');
  });

  it('keeps commas inside the param field', () => {
    const p = parseResultsCsv('RESULT,x,v,a=1,b=2,10,0.5');
    expect(p.rows[0]!.param).toBe('a=1,b=2');
  });

  it('reports malformed data lines with their line numbers', () => {
    const p = parseResultsCsv([
      'bench,variant,param,median_ns,ns_per_access',
      'seq_sum,sum_L1,16K,237',
      'seq_sum,sum_L1,16K,abc,0.05',
      'seq_sum,sum_L1,16K,237,0',
      ',sum_L1,16K,237,0.05',
      'seq_sum,sum_L1,16K,237,0.0578',
    ].join('\n'));
    expect(p.rows).toHaveLength(1);
    expect(p.errors).toEqual([
      'line 2: expected 5 fields, found 4',
      'line 3: the last two fields must be positive numbers',
      'line 4: the last two fields must be positive numbers',
      'line 5: missing benchmark or variant name',
    ]);
  });

  it('finds nothing in an unrelated file', () => {
    expect(parseResultsCsv('hello\nworld').rows).toEqual([]);
    expect(parseResultsCsv('').rows).toEqual([]);
  });
});

describe('stored results', () => {
  const memory = (): StorageLike & { data: Map<string, string> } => {
    const data = new Map<string, string>();
    return {
      data,
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => { data.set(k, v); },
      removeItem: (k) => { data.delete(k); },
    };
  };
  const throwing: StorageLike = {
    getItem: () => { throw new Error('denied'); },
    setItem: () => { throw new Error('quota'); },
    removeItem: () => { throw new Error('denied'); },
  };

  it('round-trips through storage and clears', () => {
    const s = memory();
    const v = { name: 'results.csv', text: macos, savedAt: '2026-10-03T00:00:00Z' };
    expect(saveStoredResults(v, s)).toBe(true);
    expect(loadStoredResults(s)).toEqual(v);
    clearStoredResults(s);
    expect(s.data.has(STORAGE_KEY)).toBe(false);
    expect(loadStoredResults(s)).toBeNull();
  });

  it('never throws when storage is blocked, full, missing, or corrupt', () => {
    const v = { name: 'a', text: 'b', savedAt: '' };
    expect(saveStoredResults(v, throwing)).toBe(false);
    expect(loadStoredResults(throwing)).toBeNull();
    expect(() => clearStoredResults(throwing)).not.toThrow();
    expect(saveStoredResults(v, null)).toBe(false);
    expect(loadStoredResults(null)).toBeNull();
    const bad = memory();
    bad.data.set(STORAGE_KEY, '{not json');
    expect(loadStoredResults(bad)).toBeNull();
    bad.data.set(STORAGE_KEY, JSON.stringify({ name: 1 }));
    expect(loadStoredResults(bad)).toBeNull();
  });
});
