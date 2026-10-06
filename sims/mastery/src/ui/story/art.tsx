/**
 * Scene art, ported from the approved prototype (book-mockup/prologue.html): layered
 * vector art in a 1600 by 900 frame. Art is a pure function of the scene's progress: the
 * art hooks fired so far (`fx`), the hook on the line shown (`now`), and how far through
 * the scene the learner is (`t`, 0 to 1, for the slow parallax). Ids are namespaced
 * "st-" so they cannot clash with anything else on the page.
 *
 * One change from the prototype: the phone's buzz shakes an inner group, because a CSS
 * transform on the group that carries the SVG `transform` attribute replaces it, which
 * made the phone jump to the corner while it buzzed.
 */
import type { ComponentType } from 'preact';
import type { ArtId } from '@/model/story';

export interface ArtProps {
  fx: readonly string[];
  now: string | null;
  t: number;
  reduce: boolean;
}

/** The prototype's skyline: a seeded generator, so the city is the same every time. */
function skyline(): { city: { x: number; y: number; w: number; h: number }[]; lights: { x: number; y: number; o: number }[] } {
  let seed = 7;
  const r = (): number => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const city: { x: number; y: number; w: number; h: number }[] = [];
  const lights: { x: number; y: number; o: number }[] = [];
  let x = 200;
  while (x < 800) {
    const w = 30 + r() * 60;
    const h = 90 + r() * 220;
    const y = 580 - h;
    city.push({ x, y, w, h });
    for (let yy = y + 12; yy < 570; yy += 16) {
      for (let xx = x + 6; xx < x + w - 6; xx += 12) if (r() < 0.12) lights.push({ x: xx, y: yy, o: 0.5 + r() * 0.5 });
    }
    x += w + 4;
  }
  return { city, lights };
}

const SKY = skyline();
const f1 = (n: number): string => n.toFixed(1);

const PALETTE = {
  night: {
    sky: ['#0a1428', '#1b2a48', '#5a4a5e', '#c9805a'], room: ['#2a2622', '#0c0b0a'], lights: 1, lamp: true, glow: 0.55,
  },
  dawn: {
    sky: ['#3b5378', '#8ea2bf', '#d9b08f', '#f3cf9c'], room: ['#3a332b', '#14110e'], lights: 0.25, lamp: false, glow: 0.35,
  },
} as const;

function Kitchen({ time, fx, now, t, reduce }: ArtProps & { time: 'night' | 'dawn' }) {
  const pal = PALETTE[time];
  const has = (k: string): boolean => fx.includes(k);
  const move = (x: number, y: number): { transform: string } | undefined => (reduce ? undefined : { transform: `translate(${f1(x * t)}px, ${f1(y * t)}px)` });
  const steam = !has('cold');
  return (
    <svg class="sp-art" viewBox="0 0 1600 900" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="st-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color={pal.sky[0]} /><stop offset=".55" stop-color={pal.sky[1]} />
          <stop offset=".85" stop-color={pal.sky[2]} /><stop offset="1" stop-color={pal.sky[3]} />
        </linearGradient>
        <radialGradient id="st-glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#bfe3ff" stop-opacity=".55" /><stop offset="1" stop-color="#bfe3ff" stop-opacity="0" /></radialGradient>
        <radialGradient id="st-room" cx="62%" cy="70%" r="80%"><stop offset="0" stop-color={pal.room[0]} /><stop offset="1" stop-color={pal.room[1]} /></radialGradient>
        <linearGradient id="st-table" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a3626" /><stop offset="1" stop-color="#1e150e" /></linearGradient>
        <linearGradient id="st-screen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f6f8" /><stop offset="1" stop-color="#d9e2ea" /></linearGradient>
        <clipPath id="st-win"><rect x="220" y="110" width="560" height="460" /></clipPath>
      </defs>
      <g class="sp-layer"><rect width="1600" height="900" fill="url(#st-room)" /></g>
      <g class="sp-layer" clip-path="url(#st-win)" style={move(-14, 0)}>
        <rect x="200" y="100" width="600" height="480" fill="url(#st-sky)" />
        <g fill="#0b0f18">{SKY.city.map((b, i) => <rect key={i} x={f1(b.x)} y={f1(b.y)} width={f1(b.w)} height={f1(b.h)} />)}</g>
        <g fill="#f2c96b" opacity={pal.lights}>{SKY.lights.map((l, i) => <rect key={i} x={f1(l.x)} y={f1(l.y)} width="5" height="7" opacity={l.o.toFixed(2)} />)}</g>
      </g>
      <g class="sp-layer">
        <rect x="214" y="104" width="572" height="472" fill="none" stroke="#1a1714" stroke-width="16" />
        <path d="M500 104 V576 M214 340 H786" stroke="#1a1714" stroke-width="10" />
        <rect x="196" y="572" width="608" height="18" fill="#22201c" />
        <rect x="1040" y="140" width="120" height="160" fill="#16130f" opacity=".7" />
        <g class={pal.lamp ? 'sp-flick' : undefined}>
          {pal.lamp && <circle cx="1290" cy="150" r="70" fill="#f7d79a" opacity=".05" />}
          <path d="M1290 40 V118" stroke="#2a2520" stroke-width="3" />
          <path d="M1262 118 h56 l-10 22 h-36 z" fill="#2c2722" />
          <circle cx="1290" cy="146" r="9" fill={pal.lamp ? '#ffe6b0' : '#5a5246'} opacity=".85" />
        </g>
      </g>
      <g class="sp-layer" style={move(10, -6)}>
        <path d="M0 640 L1600 610 L1600 900 L0 900 Z" fill="url(#st-table)" />
        <path d="M0 640 L1600 610" stroke="#6a4c34" stroke-width="2" opacity=".6" />
        <ellipse cx="900" cy="640" rx="420" ry="90" fill="url(#st-glow)" opacity={pal.glow} />
        <g transform="translate(700 420)">
          <path d="M-210 210 L210 210 L240 238 L-240 238 Z" fill="#1c1f24" />
          <rect x="-200" y="-10" width="400" height="220" rx="8" fill="#15181d" />
          <rect x="-188" y="2" width="376" height="196" rx="3" fill="url(#st-screen)" />
          {time === 'night' ? (
            <g font-family="Spectral, serif" fill="#22262b">
              <text x="-170" y="32" font-size="15" font-weight="500">STEP 2005, Paper I, Question 1</text>
              <text x="-170" y="62" font-size="12.5">Find the number of positive five-digit integers</text>
              <text x="-170" y="80" font-size="12.5">whose digits sum to 43.</text>
              <text x="-170" y="116" font-size="12.5" fill="#3f7a63" font-style="italic" opacity={has('s1') ? 1 : 0}>Case 1: four nines and a 7 ...</text>
              <text x="-170" y="136" font-size="12.5" fill="#3f7a63" font-style="italic" opacity={has('s2') ? 1 : 0}>Case 2: three nines, two 8s ...</text>
            </g>
          ) : (
            <g font-family="Spectral, serif" fill="#22262b">
              <text x="-170" y="32" font-size="15" font-weight="500">Contents</text>
              <text x="-170" y="66" font-size="12.5">STEP Foundation, Block 1</text>
              <text x="150" y="66" font-size="12.5" text-anchor="end" fill="#3f7a63" font-style="italic" opacity={has('done') ? 1 : 0}>done</text>
              <path d="M-170 76 H150" stroke="#c9d1d8" stroke-width="1" />
              <text x="-170" y="96" font-size="12.5">STEP Foundation, Block 2</text>
              <path d="M-170 106 H150" stroke="#c9d1d8" stroke-width="1" />
              <text x="-170" y="126" font-size="12.5" fill="#6b7177">STEP Foundation, Block 3</text>
            </g>
          )}
        </g>
        <g transform="translate(1110 600)">
          {steam && (
            <g class="sp-steam" fill="none" stroke="#e9eef2" stroke-width="3" stroke-linecap="round">
              <path d="M-8 -48 c-10 -14 10 -20 0 -36" /><path d="M6 -46 c-10 -14 10 -20 0 -36" /><path d="M20 -48 c-10 -14 10 -20 0 -36" />
            </g>
          )}
          <path d="M-30 -40 h64 v52 a14 14 0 0 1 -14 14 h-36 a14 14 0 0 1 -14 -14 z" fill="#d7d2c8" />
          <path d="M34 -28 a16 16 0 0 1 0 30" fill="none" stroke="#d7d2c8" stroke-width="7" />
          <rect x="-30" y="-40" width="64" height="7" fill="#c8102e" />
        </g>
        <g transform="translate(360 680) rotate(-8)">
          <g class={now === 'buzz' ? 'sp-buzz' : undefined}>
            <rect x="-34" y="-62" width="68" height="124" rx="10" fill="#101215" stroke="#2c3036" stroke-width="2" />
            <rect x="-28" y="-54" width="56" height="108" rx="6" fill={has('buzz') ? '#1a2230' : '#0d0f12'} />
            <g opacity={has('buzz') ? 1 : 0}>
              <rect x="-26" y="-36" width="52" height="30" rx="5" fill="#e9c36a" />
              <rect x="-21" y="-29" width="34" height="3" fill="#2a2416" />
              <rect x="-21" y="-22" width="42" height="3" fill="#2a2416" />
              <rect x="-21" y="-15" width="24" height="3" fill="#2a2416" />
            </g>
          </g>
        </g>
        <g transform="translate(1380 760) rotate(4)" opacity=".9">
          <rect x="-110" y="-26" width="220" height="70" fill="#2b2119" />
          <rect x="-104" y="-20" width="208" height="58" fill="#3a2c20" />
          <rect x="-18" y="2" width="36" height="6" rx="3" fill="#8a7155" />
          <g opacity={has('cert') ? 1 : 0}>
            <rect x="-90" y="-64" width="150" height="104" fill="#ede6d6" transform="rotate(-6)" />
            <text x="-70" y="-30" font-family="Spectral SC, serif" font-size="12" fill="#3a3328" transform="rotate(-6)">General Educational</text>
            <text x="-70" y="-14" font-family="Spectral SC, serif" font-size="12" fill="#3a3328" transform="rotate(-6)">Development · 2007</text>
          </g>
        </g>
      </g>
    </svg>
  );
}

export const ART: Readonly<Record<ArtId, ComponentType<ArtProps>>> = {
  'kitchen-night': (p) => <Kitchen {...p} time="night" />,
  'kitchen-dawn': (p) => <Kitchen {...p} time="dawn" />,
};
