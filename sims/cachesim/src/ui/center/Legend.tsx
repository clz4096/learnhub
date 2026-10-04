/** Legend for cell states and event highlights, rendered from the canvas palette. */
import { Flash } from '@/ui/mirror';
import { FLASH_STYLE, STATE_FILL } from '@/ui/palette';
import { Term } from '@/ui/Term';

const EVENTS = [Flash.Hit, Flash.Miss, Flash.Evict, Flash.Invalidate, Flash.Prefetch, Flash.State, Flash.Writeback];

export function Legend() {
  return (
    <div class="legend small" aria-label="Legend">
      <span class="legend-group">
        <span class="legend-title">Cell color, <Term id="mesi">MESI</Term> state (who may write the line):</span>
        <Swatch color={STATE_FILL.empty} text="invalid (empty)" />
        <Swatch color={STATE_FILL.S} text="S shared" letter="S" />
        <Swatch color={STATE_FILL.E} text="E exclusive" letter="E" />
        <Swatch color={STATE_FILL.M} text="M modified / D dirty" letter="M" />
      </span>
      <span class="legend-group">
        <span class="legend-title">Event:</span>
        {EVENTS.map((k) => {
          const s = FLASH_STYLE[k]!;
          return <Swatch key={k} color={s.color} text={s.label} letter={s.glyph} dark />;
        })}
      </span>
      <span class="legend-group muted">In shared caches, D means dirty: newer than the copy in DRAM. Large caches draw several sets per row: darker = fuller, amber = dirty.</span>
    </div>
  );
}

function Swatch({ color, text, letter, dark }: { color: string; text: string; letter?: string; dark?: boolean }) {
  return (
    <span class="swatch">
      <span class="swatch-box" style={{ background: color, color: dark ? '#fff' : '#3d444d' }} aria-hidden="true">{letter}</span>
      {text}
    </span>
  );
}
