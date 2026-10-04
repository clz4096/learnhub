import type { Access, AccessKind } from '@/engine/types';
import type { Params, TraceContext, Workload, WorkloadSource } from './types';
import { coreOf } from './util';

/** Highest core id the format accepts (the engine supports 1 to 8 cores). */
export const MAX_CORE = 7;
const MAX_ERRORS = 100;
const HEX = /^(0x)?[0-9a-f]+$/i;

export interface ParsedTrace {
  accesses: Access[];
  errors: string[];
  /** Lines dropped as invalid (errors may be capped; this is not). */
  skipped: number;
}

/**
 * Parses `<hex address> <R|W|I> <core id>` per line. `#` starts a comment; blank lines
 * are skipped. Errors carry 1-based line numbers; bad lines are dropped, good ones kept.
 */
export function parseTraceText(text: string): ParsedTrace {
  const accesses: Access[] = [];
  const errors: string[] = [];
  let skipped = 0;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; ++i) {
    const err = (msg: string) => {
      ++skipped;
      if (errors.length < MAX_ERRORS) errors.push(`line ${i + 1}: ${msg}`);
    };
    const hashAt = lines[i]!.indexOf('#');
    const body = (hashAt >= 0 ? lines[i]!.slice(0, hashAt) : lines[i]!).trim();
    if (body === '') continue;
    const f = body.split(/\s+/);
    if (f.length !== 3) {
      err(`expected "<hex address> <R|W> <core>", got ${f.length} field(s)`);
      continue;
    }
    const [a, k, c] = f as [string, string, string];
    if (!HEX.test(a)) {
      err(`bad hex address "${a}"`);
      continue;
    }
    const addr = parseInt(a.replace(/^0x/i, ''), 16);
    if (!Number.isSafeInteger(addr)) {
      err(`address "${a}" is not below 2^53`);
      continue;
    }
    const kind = k.toUpperCase();
    if (kind !== 'R' && kind !== 'W' && kind !== 'I') {
      err(`bad kind "${k}" (expected R, W, or I)`);
      continue;
    }
    if (!/^\d+$/.test(c) || Number(c) > MAX_CORE) {
      err(`bad core "${c}" (expected an integer 0 to ${MAX_CORE})`);
      continue;
    }
    accesses.push({ addr, kind: kind as AccessKind, core: Number(c), src: 0 });
  }
  if (skipped > MAX_ERRORS) errors.push(`${skipped - MAX_ERRORS} more error(s) not listed`);
  return { accesses, errors, skipped };
}

const FORMAT = [
  '# Custom trace: one memory access per line.',
  '#',
  '#   <hex address> <R|W> <core id>',
  '#',
  '#   0x7ffd1000 R 0     load from 0x7ffd1000 on core 0',
  '#   0x7ffd1040 W 1     store to 0x7ffd1040 on core 1',
  '#',
  '# The 0x prefix is optional. I (instruction fetch) is also accepted.',
  '# Core ids run 0 to 7; ids at or above the simulated core count wrap around.',
  '# Text after # is a comment; blank lines are ignored.',
].join('\n');

export const DEFAULT_CUSTOM_TEXT = [
  '# Two cores writing neighboring words of one line (false sharing).',
  '0x10000000 R 0',
  '0x10000000 W 0',
  '0x10000008 R 1',
  '0x10000008 W 1',
  '0x10000000 R 0',
  '0x10000000 W 0',
  '0x10000008 R 1',
  '0x10000008 W 1',
].join('\n');

/** A workload that replays user-supplied text. Bad lines are skipped; see parseTraceText for errors. */
export function customWorkload(text: string): Workload {
  return customWorkloadFromParsed(parseTraceText(text));
}

/** Same as customWorkload, for callers that already parsed the text (parse large traces once). */
export function customWorkloadFromParsed(parsed: ParsedTrace): Workload {
  return {
    id: 'custom',
    number: 10,
    title: 'Custom trace',
    summary: 'Replays a list of memory accesses you type or paste, one per line. Use it to test your own guess about an access pattern.',
    params: [],
    source(_p: Params): WorkloadSource {
      return {
        code: FORMAT,
        notes:
          parsed.skipped > 0
            ? `${parsed.accesses.length} valid accesses; ${parsed.skipped} line(s) skipped.`
            : `${parsed.accesses.length} accesses.`,
      };
    },
    *trace(_p: Params, ctx: TraceContext): Generator<Access> {
      for (const a of parsed.accesses) yield { ...a, core: coreOf(a.core, ctx.cores) };
    },
    estimateLength: () => parsed.accesses.length,
  };
}

export const custom: Workload = customWorkload(DEFAULT_CUSTOM_TEXT);
