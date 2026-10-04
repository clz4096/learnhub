/**
 * A glossary term in running text. Clicking it selects the term and opens Glossary
 * mode at that entry (definitions live in src/ui/modes/glossary.ts, keyed by these ids).
 *
 * Plain strings (lessons, explanations) mark a term as [[id|shown text]]. TermText
 * renders those marks as Term links, so text kept outside JSX can still link.
 */
import type { ComponentChildren } from 'preact';
import { mode, selection } from '@/ui/state';

export const TERM_IDS = [
  'cache', 'cache-level', 'dram', 'latency', 'address', 'core',
  'cache-line', 'set', 'way', 'associativity', 'tag', 'offset', 'set-index',
  'hit', 'miss', 'eviction', 'amat', 'hit-rate', 'replacement-policy',
  'spatial-locality', 'temporal-locality', 'stride', 'row-major', 'pointer-chasing', 'aos-soa',
  'mesi', 'mesi-modified', 'mesi-exclusive', 'mesi-shared', 'mesi-invalid', 'peer-transfer',
  'write-back', 'write-allocate', 'inclusive', 'non-inclusive', 'victim-cache', 'llc',
  'compulsory-miss', 'capacity-miss', 'conflict-miss', 'coherence-miss',
  'prefetcher', 'false-sharing', 'true-sharing', 'spsc-ring', 'tlb', 'hardware-destructive-interference-size',
  'lru', 'pseudo-lru', 'random-replacement',
] as const;
export type TermId = (typeof TERM_IDS)[number];

const IDS: ReadonlySet<string> = new Set(TERM_IDS);
export function isTermId(id: string): id is TermId {
  return IDS.has(id);
}

/** Open the glossary at `id`. */
export function openTerm(id: TermId): void {
  selection.value = { type: 'term', term: id };
  mode.value = 'glossary';
}

export function Term({ id, children }: { id: TermId; children: ComponentChildren }) {
  return (
    <button
      type="button"
      class="term"
      data-term={id}
      title="Open in the glossary"
      onClick={() => openTerm(id)}
    >
      {children}
    </button>
  );
}

/** One [[id|shown text]] mark. */
const MARK = /\[\[([a-z0-9-]+)\|([^\]]+)\]\]/g;

/** Every id marked in `text`, in order. Unknown ids are kept so tests can catch typos. */
export function markedTerms(text: string): string[] {
  return [...text.matchAll(MARK)].map((m) => m[1]!);
}

/** `text` with each mark replaced by its shown text. */
export function plainText(text: string): string {
  return text.replace(MARK, (_m, _id: string, shown: string) => shown);
}

/** Render `text`, turning each [[id|shown text]] mark into a Term link. */
export function TermText({ text }: { text: string }) {
  const out: ComponentChildren[] = [];
  let last = 0;
  for (const m of text.matchAll(MARK)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const id = m[1]!;
    const shown = m[2]!;
    out.push(isTermId(id) ? <Term key={at} id={id}>{shown}</Term> : shown);
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
