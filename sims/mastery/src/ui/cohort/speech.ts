/**
 * Reading the standup aloud with the browser's speech synthesis: a voice per classmate
 * where the browser has enough voices, each with its own pitch and rate, one update after
 * another. Never starts by itself; Stop cancels at once.
 */
import type { Classmate } from '@/model/cohort';

/** The parts of a voice the choice reads. */
export interface VoiceLike {
  name: string;
  lang: string;
}

/**
 * A voice for each classmate: the first preferred name or language they list that is not
 * taken yet, then any English voice not taken, then any English voice at all; null (the
 * browser's default) when there is none. English voices only.
 */
export function pickVoices<V extends VoiceLike>(voices: readonly V[], people: readonly Classmate[]): Map<string, V | null> {
  const english = voices.filter((v) => /^en([-_]|$)/i.test(v.lang));
  const taken = new Set<V>();
  const out = new Map<string, V | null>();
  for (const c of people) {
    const free = english.filter((v) => !taken.has(v));
    let v: V | undefined;
    for (const want of c.voice.prefer) {
      const w = want.toLowerCase();
      v = free.find((x) => x.name.toLowerCase().includes(w)) ?? free.find((x) => x.lang.toLowerCase().replace('_', '-') === w.toLowerCase());
      if (v !== undefined) break;
    }
    v ??= free[0] ?? english[0];
    if (v !== undefined) taken.add(v);
    out.set(c.id, v ?? null);
  }
  return out;
}

export const synth = (): SpeechSynthesis | null => (typeof speechSynthesis === 'undefined' ? null : speechSynthesis);

/**
 * Speaks the passages in order. `onSpeaker` gets each passage's id as it starts and null
 * at the end (or on stop). Returns a stop function.
 */
export function speakAll(
  passages: readonly { id: string; text: string; who: Classmate | null }[], onSpeaker: (id: string | null) => void,
): () => void {
  const s = synth();
  if (s === null || passages.length === 0) {
    onSpeaker(null);
    return () => undefined;
  }
  s.cancel();
  const voices = pickVoices(s.getVoices(), passages.flatMap((p) => (p.who === null ? [] : [p.who])));
  let stopped = false;
  passages.forEach((p, i) => {
    const u = new SpeechSynthesisUtterance(p.text);
    u.lang = 'en-US';
    const v = p.who === null ? null : voices.get(p.who.id) ?? null;
    if (v !== null) {
      u.voice = v;
      u.lang = v.lang;
    }
    u.pitch = p.who?.voice.pitch ?? 1;
    u.rate = p.who?.voice.rate ?? 1;
    u.onstart = () => { if (!stopped) onSpeaker(p.id); };
    if (i === passages.length - 1) u.onend = () => { if (!stopped) onSpeaker(null); };
    s.speak(u);
  });
  return () => {
    stopped = true;
    s.cancel();
    onSpeaker(null);
  };
}
