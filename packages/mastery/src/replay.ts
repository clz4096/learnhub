/**
 * Spaced review rebuilt from the history: every change the app makes to memory is logged as
 * a history entry at the moment it is made, so replaying the entries in order through the
 * same rules (memory.ts, gym.ts) gives the memory the app built. It is used to take one
 * entry's effect back out of a schedule (a supervision result that no longer counts against
 * its topic) without guessing how later reviews would have gone.
 *
 * The replay is exact only for a document whose memory came from these entries alone. Placed
 * topics (placement, which logs no memory entry), a change to the graph's encompass weights
 * since an entry was made, and two devices' entries at the same millisecond merged in another
 * order can all make the stored memory differ; callers compare before they trust it.
 *
 * Pure: the clock is each entry's own time.
 */
import type { Topic } from './graph';
import { GYM_KINDS, recordGym, type GymKind } from './gym';
import { recordLesson, recordLessonFailure, recordReview, type MemoryMap, type MemoryState } from './memory';
import type { HistoryEntry } from './progress';

/** The kind of a gym item from its logged id ("drill:topic/generator"), or undefined for an id no gym item has. */
export function gymKindOf(itemId: string): GymKind | undefined {
  const k = itemId.slice(0, itemId.indexOf(':'));
  return (GYM_KINDS as readonly string[]).includes(k) ? (k as GymKind) : undefined;
}

/**
 * The memory the entries of `history` build, in their order. `skip` leaves an entry out (by
 * its index in `history`), as if it never happened. Entries that never move memory (drills,
 * Cambridge answers, placement answers) are passed over, and so is a review of a topic with
 * no memory at that point, as the app does.
 */
export function replayMemory(
  history: readonly HistoryEntry[],
  topics: readonly Topic[],
  skip: (h: HistoryEntry, index: number) => boolean = () => false,
): MemoryMap {
  let memory: MemoryMap = {};
  history.forEach((h, i) => {
    if (skip(h, i)) return;
    const known = memory[h.topicId] !== undefined;
    switch (h.kind) {
      case 'lesson':
        memory = (h.correct ? recordLesson(memory, topics, h.topicId, h.at) : recordLessonFailure(memory, topics, h.topicId, h.at)).memory;
        return;
      case 'review':
      case 'quiz':
      case 'supervision':
        if (known) memory = recordReview(memory, topics, h.topicId, h.correct, h.at).memory;
        return;
      case 'gym': {
        const kind = h.item === undefined ? undefined : gymKindOf(h.item.id);
        if (known && kind !== undefined) memory = recordGym(memory, topics, { kind, topicId: h.topicId }, h.correct, h.at).memory;
        return;
      }
      case 'placement':
      case 'drill':
      case 'cambridge':
        return;
    }
  });
  return memory;
}

/** Whether two memory states are the same, to within floating-point noise in the banked credit. */
export function sameMemoryState(a: Readonly<MemoryState>, b: Readonly<MemoryState>): boolean {
  return a.reps === b.reps && a.lapses === b.lapses && a.due === b.due && a.lastReviewed === b.lastReviewed
    && Math.abs(a.intervalDays - b.intervalDays) < 1e-9 && Math.abs(a.implicitCredit - b.implicitCredit) < 1e-9;
}
