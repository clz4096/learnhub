import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { addDays } from './day';
import { AUDIO_KEEP_DAYS, loadStandupAudio, saveStandupAudio } from './standupAudio';

describe('standup audio on the device', () => {
  it('keeps a recording per date and drops those older than the last 14 days', async () => {
    const today = '2026-10-07';
    const old = addDays(today, -AUDIO_KEEP_DAYS);
    const edge = addDays(today, 1 - AUDIO_KEEP_DAYS);
    for (const d of [old, edge]) expect(await saveStandupAudio(d, { blob: new Blob([d]), mime: 'audio/mp4', savedAt: 1 }, d)).toBe(true);
    expect(await saveStandupAudio(today, { blob: new Blob(['x']), mime: 'audio/mp4', savedAt: 2 }, today)).toBe(true);
    expect(await loadStandupAudio(old)).toBeNull();
    expect(await loadStandupAudio(edge)).not.toBeNull();
    const a = await loadStandupAudio(today);
    expect(a?.mime).toBe('audio/mp4');
    expect(await a?.blob.text()).toBe('x');
  });
});
