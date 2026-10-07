/**
 * A classmate's portrait as a monogram, in the design-v4 manner: a hairline ring, a second
 * ring in the classmate's own colour, and serif initials. No faces: the cohort is known by
 * their words.
 */
import { initialsOf } from '@/model/cohort';

/** A colour per person, from the design's palette; Albert is Cambridge green. */
const RING: Readonly<Record<string, string>> = {
  albert: 'var(--cam)', marcus: 'var(--gold)', rosa: 'var(--scarlet)', wen: 'var(--cam-l)', grace: 'var(--ink2)', dev: 'var(--faint)', jonah: 'var(--mute)',
};

export function Monogram({ id, name, size = 44, on = false }: { id: string; name: string; size?: number; on?: boolean }) {
  const ring = RING[id] ?? 'var(--mute)';
  return (
    <svg class={`mono-art${on ? ' on' : ''}`} width={size} height={size} viewBox="0 0 44 44" aria-hidden="true" focusable="false">
      <circle cx="22" cy="22" r="21" fill="var(--wash)" stroke="var(--line)" stroke-width="1" />
      <circle cx="22" cy="22" r="17.5" fill="none" stroke={ring} stroke-width="1.2" />
      <text x="22" y="22" dy="0.36em" text-anchor="middle" font-family="var(--serif)" font-size="15" letter-spacing="0.5" fill="var(--fg)">
        {initialsOf(name)}
      </text>
    </svg>
  );
}
