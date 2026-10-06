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
import type { ComponentChildren, ComponentType } from 'preact';
import { offerOutcome, type ArtId, type StoryNumbers } from '@/model/story';

export interface ArtProps {
  fx: readonly string[];
  now: string | null;
  t: number;
  reduce: boolean;
  /** The real numbers the scene plays with, for art that shows them (a screen of marks, a results page). */
  n: StoryNumbers;
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
  dusk: {
    sky: ['#2a3150', '#6a5a7a', '#d0876a', '#f0b27a'], room: ['#332c27', '#100e0c'], lights: 0.7, lamp: true, glow: 0.45,
  },
} as const;

type KitchenScreen = 'step' | 'contents' | 'results' | 'apply' | 'offer';

/** What the laptop shows, in the screen's own coordinates (376 by 196, text from x = -170). */
function screenContent(screen: KitchenScreen, has: (k: string) => boolean, n: StoryNumbers): ComponentChildren {
  switch (screen) {
    case 'step':
      return (
        <g font-family="Spectral, serif" fill="#22262b">
          <text x="-170" y="32" font-size="15" font-weight="500">STEP 2005, Paper I, Question 1</text>
          <text x="-170" y="62" font-size="12.5">Find the number of positive five-digit integers</text>
          <text x="-170" y="80" font-size="12.5">whose digits sum to 43.</text>
          <text x="-170" y="116" font-size="12.5" fill="#3f7a63" font-style="italic" opacity={has('s1') ? 1 : 0}>Case 1: four nines and a 7 ...</text>
          <text x="-170" y="136" font-size="12.5" fill="#3f7a63" font-style="italic" opacity={has('s2') ? 1 : 0}>Case 2: three nines, two 8s ...</text>
        </g>
      );
    case 'contents':
      return (
        <g font-family="Spectral, serif" fill="#22262b">
          <text x="-170" y="32" font-size="15" font-weight="500">Contents</text>
          <text x="-170" y="66" font-size="12.5">STEP Foundation, Block 1</text>
          <text x="150" y="66" font-size="12.5" text-anchor="end" fill="#3f7a63" font-style="italic" opacity={has('done') ? 1 : 0}>done</text>
          <path d="M-170 76 H150" stroke="#c9d1d8" stroke-width="1" />
          <text x="-170" y="96" font-size="12.5">STEP Foundation, Block 2</text>
          <path d="M-170 106 H150" stroke="#c9d1d8" stroke-width="1" />
          <text x="-170" y="126" font-size="12.5" fill="#6b7177">STEP Foundation, Block 3</text>
        </g>
      );
    case 'results': {
      const rows = (n.campaign?.aLevels ?? []).slice(0, 7);
      return (
        <g font-family="Spectral, serif" fill="#22262b">
          <text x="-170" y="30" font-size="15" font-weight="500">A level papers: marks and grades</text>
          <g opacity={has('marks') ? 1 : 0}>
            {rows.length === 0 && <text x="-170" y="62" font-size="12.5" fill="#6b7177">No papers marked.</text>}
            {rows.map((p, i) => (
              <g key={p.name} font-size="12">
                <text x="-170" y={58 + i * 19}>{p.name}</text>
                <text x="80" y={58 + i * 19} text-anchor="end" fill="#6b7177">{p.mark}/{p.max}</text>
                <text x="150" y={58 + i * 19} text-anchor="end" font-weight="500" fill={p.grade === 'A*' || p.grade === 'A' ? '#3f7a63' : '#a23a2a'}>{p.grade ?? 'U'}</text>
              </g>
            ))}
          </g>
        </g>
      );
    }
    case 'apply':
      return (
        <g font-family="Spectral, serif" fill="#22262b">
          <text x="-170" y="30" font-size="15" font-weight="500">{has('statement') ? 'Personal statement' : 'Choose a college'}</text>
          {!has('statement') ? (
            <g font-size="12.5" opacity={has('college') ? 1 : 0.35}>
              <text x="-170" y="62">Colleges for mature students</text>
              <rect x="-176" y="72" width="336" height="22" fill="#e3efe8" opacity={has('college') ? 1 : 0} />
              <text x="-170" y="88" font-weight="500">Euclid College</text>
              <text x="-170" y="112" fill="#6b7177">Two others</text>
            </g>
          ) : (
            <g font-size="12">
              {[0, 1, 2, 3, 4].map((i) => <rect key={i} x="-170" y={50 + i * 16} width={i === 4 ? 180 : 320} height="5" fill="#c9d1d8" />)}
              <text x="-170" y="150" fill="#6b7177">Euclid College · {n.campaign?.route === 'cs' ? 'Computer Science' : 'Mathematics'}</text>
              <text x="-170" y="176" fill="#3f7a63" font-style="italic" opacity={has('sent') ? 1 : 0}>Application submitted, 11:58 pm</text>
            </g>
          )}
        </g>
      );
    case 'offer':
      return (
        <g font-family="Spectral, serif" fill="#22262b" font-size="12.5">
          <text x="-170" y="30" font-size="15" font-weight="500">Inbox</text>
          <g opacity={has('mail') ? 1 : 0}>
            <rect x="-176" y="44" width="352" height="26" fill="#e3efe8" />
            <text x="-170" y="62" font-weight="500">Euclid College Admissions</text>
            <text x="150" y="62" text-anchor="end" fill="#3f7a63">6:02 am</text>
          </g>
          <text x="-170" y="92" fill="#6b7177">Day planner: tomorrow</text>
          <path d="M-170 102 H150" stroke="#c9d1d8" stroke-width="1" />
          <text x="-170" y="122" fill="#6b7177">Priya: Sunday?</text>
        </g>
      );
  }
}

function Kitchen({ time, screen, fx, now, t, reduce, n }: ArtProps & { time: 'night' | 'dawn' | 'dusk'; screen: KitchenScreen }) {
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
          {screenContent(screen, has, n)}
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

// ---------------------------------------------------------------- Book One, chapters 2 to 10

/** The slow parallax of a layer, as in the Kitchen: none with reduced motion. */
const mover = (t: number, reduce: boolean) => (x: number, y: number): { transform: string } | undefined =>
  (reduce ? undefined : { transform: `translate(${f1(x * t)}px, ${f1(y * t)}px)` });

/** A seeded generator, so scattered things (snow, leaves, books) fall the same way every time. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const BOOKS = (() => {
  const r = seeded(11);
  const out: { x: number; y: number; w: number; h: number; c: string }[] = [];
  const colours = ['#5b3a2e', '#2f4a5a', '#6b5a32', '#3e3a4a', '#7a3a32', '#2e4a3a'];
  for (const y of [150, 290]) {
    let x = 70;
    while (x < 380) {
      const w = 12 + r() * 18;
      const h = 90 + r() * 30;
      out.push({ x, y: y + 120 - h, w, h, c: colours[Math.floor(r() * colours.length)] as string });
      x += w + 2;
    }
  }
  return out;
})();

/** Chapter 2: a bedroom desk at night, a legal pad, and the first proof written line by line. */
function Desk({ fx, t, reduce }: ArtProps) {
  const has = (k: string): boolean => fx.includes(k);
  const move = mover(t, reduce);
  const line = (k: string, y: number, text: string) => (
    <text x="-230" y={y} opacity={has(k) ? 1 : 0}>{text}</text>
  );
  return (
    <svg class="sp-art" viewBox="0 0 1600 900" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="st-d-wall" cx="35%" cy="45%" r="80%"><stop offset="0" stop-color="#3a3128" /><stop offset="1" stop-color="#0b0a09" /></radialGradient>
        <radialGradient id="st-d-cone" cx="50%" cy="0%" r="100%"><stop offset="0" stop-color="#ffdf9e" stop-opacity=".42" /><stop offset="1" stop-color="#ffdf9e" stop-opacity="0" /></radialGradient>
        <linearGradient id="st-d-desk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a4130" /><stop offset="1" stop-color="#1a120c" /></linearGradient>
        <linearGradient id="st-d-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070b16" /><stop offset="1" stop-color="#1c2540" /></linearGradient>
        <clipPath id="st-d-win"><rect x="1160" y="110" width="320" height="330" /></clipPath>
      </defs>
      <g class="sp-layer"><rect width="1600" height="900" fill="url(#st-d-wall)" /></g>
      <g class="sp-layer" style={move(-10, 0)}>
        <g clip-path="url(#st-d-win)">
          <rect x="1160" y="110" width="320" height="330" fill="url(#st-d-sky)" />
          <g transform="translate(1000 -40) scale(.75)" fill="#06080d">{SKY.city.map((b, i) => <rect key={i} x={f1(b.x)} y={f1(b.y)} width={f1(b.w)} height={f1(b.h)} />)}</g>
          <g transform="translate(1000 -40) scale(.75)" fill="#f2c96b" opacity=".8">{SKY.lights.map((l, i) => <rect key={i} x={f1(l.x)} y={f1(l.y)} width="5" height="7" opacity={l.o.toFixed(2)} />)}</g>
        </g>
        <rect x="1154" y="104" width="332" height="342" fill="none" stroke="#141110" stroke-width="12" />
        <path d="M1320 104 V446" stroke="#141110" stroke-width="8" />
        <g>
          <rect x="60" y="140" width="330" height="300" fill="#16120e" />
          <path d="M60 270 H390 M60 410 H390" stroke="#2a221a" stroke-width="10" />
          {BOOKS.map((b, i) => <rect key={i} x={f1(b.x)} y={f1(b.y)} width={f1(b.w)} height={f1(b.h)} fill={b.c} opacity=".8" />)}
        </g>
      </g>
      <g class="sp-layer" style={move(8, -4)}>
        <path d="M0 620 L1600 600 L1600 900 L0 900 Z" fill="url(#st-d-desk)" />
        <path d="M0 620 L1600 600" stroke="#7a5a40" stroke-width="2" opacity=".5" />
        <path d="M430 330 L190 900 L1150 900 Z" fill="url(#st-d-cone)" class="sp-flick" />
        <g stroke="#1d1a17" stroke-width="10" stroke-linecap="round" fill="none">
          <path d="M300 640 L250 470 L410 330" />
        </g>
        <ellipse cx="300" cy="642" rx="70" ry="14" fill="#1d1a17" />
        <path d="M380 300 l80 30 l-30 50 l-80 -30 z" fill="#2b2622" />
        <circle cx="430" cy="352" r="8" fill="#ffe6b0" />
        <g transform="translate(820 700) rotate(-4)" font-family="Spectral, serif" font-style="italic" fill="#1f2a4a" font-size="22">
          <rect x="-260" y="-190" width="520" height="400" fill="#f2e38c" />
          <rect x="-260" y="-190" width="520" height="34" fill="#c9b85e" />
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => <path key={i} d={`M-260 ${-120 + i * 38} H260`} stroke="#8fb3cf" stroke-width="1.2" opacity=".7" />)}
          <path d="M-240 -190 V210" stroke="#d26a6a" stroke-width="1.5" />
          <g opacity={has('q') ? 1 : 0}>
            <text x="-230" y="-128" font-style="normal" font-weight="500">Prove: √2 is irrational.</text>
            <path d="M-230 -120 H40 M-230 -114 H40" stroke="#1f2a4a" stroke-width="1.5" />
          </g>
          {line('l1', -84, 'Suppose √2 = p/q, in lowest terms.')}
          {line('l2', -46, 'Then p² = 2q², so p² is even, so p is even.')}
          <g opacity={has('why') ? 1 : 0} fill="#b23a3a" font-size="18">
            <text x="150" y="-24">why?</text>
            <path d="M146 -30 H200" stroke="#b23a3a" stroke-width="2" />
          </g>
          {line('l3', 0, 'p = 2k, so 4k² = 2q², so q² = 2k²: q is even.')}
          {line('l4', 38, 'Both even. They were in lowest terms.')}
          <g opacity={has('qed') ? 1 : 0}>
            <text x="-230" y="80" font-weight="500">Contradiction.</text>
            <rect x="-60" y="62" width="18" height="18" fill="#1f2a4a" />
          </g>
        </g>
        <g transform="translate(1250 760) rotate(28)">
          <rect x="-110" y="-6" width="220" height="12" fill="#e2b33c" />
          <path d="M110 -6 L136 0 L110 6 Z" fill="#e8d2a8" />
          <rect x="-122" y="-6" width="12" height="12" fill="#d47b7b" />
        </g>
        <g transform="translate(1380 640)">
          <path d="M-30 -40 h64 v52 a14 14 0 0 1 -14 14 h-36 a14 14 0 0 1 -14 -14 z" fill="#3a5a72" />
          <path d="M34 -28 a16 16 0 0 1 0 30" fill="none" stroke="#3a5a72" stroke-width="7" />
        </g>
      </g>
    </svg>
  );
}

const FLAKES = (() => {
  const r = seeded(23);
  return Array.from({ length: 70 }, () => ({ x: 400 + r() * 800, y: 80 + r() * 520, r: 1.5 + r() * 3, d: (r() * 6).toFixed(2) }));
})();

const STARS = (() => {
  const r = seeded(5);
  return Array.from({ length: 40 }, () => ({ x: 410 + r() * 780, y: 90 + r() * 220, o: 0.3 + r() * 0.7 }));
})();

/** Chapter 3: a Brooklyn window in February: slush and snow for the Long Winter, a clear cold night for Momentum. */
function WinterWindow({ fx, now, t, reduce }: ArtProps) {
  const has = (k: string): boolean => fx.includes(k);
  const move = mover(t, reduce);
  const grey = has('grey');
  const sky = grey ? ['#262a33', '#4a4d55', '#7a6a5a'] : ['#050915', '#14203d', '#2a3a5e'];
  return (
    <svg class="sp-art" viewBox="0 0 1600 900" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="st-w-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color={sky[0]} /><stop offset=".6" stop-color={sky[1]} /><stop offset="1" stop-color={sky[2]} />
        </linearGradient>
        <radialGradient id="st-w-room" cx="50%" cy="60%" r="80%"><stop offset="0" stop-color="#2c2a28" /><stop offset="1" stop-color="#0a0a0a" /></radialGradient>
        <radialGradient id="st-w-lamp" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffb35c" stop-opacity=".55" /><stop offset="1" stop-color="#ffb35c" stop-opacity="0" /></radialGradient>
        <clipPath id="st-w-win"><rect x="400" y="80" width="800" height="520" /></clipPath>
      </defs>
      <g class="sp-layer"><rect width="1600" height="900" fill="url(#st-w-room)" /></g>
      <g class="sp-layer" clip-path="url(#st-w-win)" style={move(-12, 0)}>
        <rect x="400" y="80" width="800" height="520" fill="url(#st-w-sky)" />
        {!grey && <g fill="#e8eefc">{STARS.map((s, i) => <circle key={i} cx={f1(s.x)} cy={f1(s.y)} r="1.4" opacity={s.o.toFixed(2)} />)}</g>}
        <g fill="#3b2a24">
          {[0, 1, 2, 3].map((i) => <rect key={i} x={380 + i * 220} y={300 - (i % 2) * 30} width="210" height="320" />)}
        </g>
        <g fill="#f2c96b">
          {[0, 1, 2, 3].flatMap((i) => [0, 1, 2].flatMap((row) => [0, 1, 2].map((col) => (
            <rect key={`${i}-${row}-${col}`} x={404 + i * 220 + col * 64} y={330 - (i % 2) * 30 + row * 80} width="34" height="48" opacity={(i + row + col) % 3 === 0 ? 0.85 : 0.12} />
          ))))}
        </g>
        <circle cx="1060" cy="470" r="90" fill="url(#st-w-lamp)" />
        <path d="M1060 470 V600" stroke="#1a1a1a" stroke-width="6" />
        <circle cx="1060" cy="468" r="7" fill="#ffd38a" />
        <path d={grey ? 'M400 600 Q800 560 1200 600 Z' : 'M400 600 Q600 548 800 572 T1200 560 L1200 600 Z'} fill={grey ? '#6e6a62' : '#dfe7f2'} />
        {grey && (
          <g class="sp-snow" fill="#e9edf2">
            {FLAKES.map((s, i) => <circle key={i} cx={f1(s.x)} cy={f1(s.y)} r={f1(s.r)} opacity=".8" style={{ animationDelay: `-${s.d}s` }} />)}
          </g>
        )}
      </g>
      <g class="sp-layer">
        <rect x="392" y="72" width="816" height="536" fill="none" stroke="#e6e1d8" stroke-width="18" />
        <path d="M800 72 V608 M392 340 H1208" stroke="#e6e1d8" stroke-width="12" />
        <rect x="370" y="604" width="860" height="26" fill="#d8d2c6" />
        <path d="M370 604 h860" stroke="#fff" stroke-width="2" opacity=".5" />
        <g fill="#9a958c">{Array.from({ length: 18 }, (_, i) => <rect key={i} x={480 + i * 36} y="660" width="22" height="170" rx="6" />)}</g>
        <rect x="470" y="650" width="660" height="14" fill="#8a857c" />
      </g>
      <g class="sp-layer" style={move(6, -4)}>
        <g transform="translate(1000 588)">
          <g class={now === 'call' ? 'sp-buzz' : undefined}>
            <rect x="-30" y="-56" width="60" height="110" rx="9" fill="#101215" stroke="#2c3036" stroke-width="2" />
            <rect x="-25" y="-49" width="50" height="96" rx="5" fill={has('call') ? '#1d2a24' : '#0d0f12'} />
            <g opacity={has('call') ? 1 : 0} font-family="Spectral, serif" text-anchor="middle">
              <text x="0" y="-22" font-size="12" fill="#eef0ec">Mom</text>
              <circle cx="-11" cy="28" r="7" fill="#c8102e" /><circle cx="11" cy="28" r="7" fill="#3f9a63" />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

/** Chapter 5: the A train at dawn, then an exam hall in Lower Manhattan (from the `hall` hook on). */
function TrainHall(p: ArtProps) {
  return p.fx.includes('hall') ? <ExamHall {...p} /> : <Train {...p} />;
}

function Train({ t, reduce }: ArtProps) {
  const move = mover(t, reduce);
  return (
    <svg class="sp-art" viewBox="0 0 1600 900" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="st-t-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9e0e2" /><stop offset="1" stop-color="#9aa6aa" /></linearGradient>
        <linearGradient id="st-t-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4d50" /><stop offset="1" stop-color="#1c1d1f" /></linearGradient>
      </defs>
      <g class="sp-layer"><rect width="1600" height="900" fill="url(#st-t-wall)" /></g>
      <g class="sp-layer">
        <rect x="0" y="0" width="1600" height="70" fill="#eef2f3" />
        {[200, 600, 1000, 1400].map((x) => <rect key={x} x={x - 120} y="22" width="240" height="18" rx="4" fill="#fdfdf6" />)}
        <rect x="0" y="96" width="1600" height="56" fill="#f4f4ef" />
        <circle cx="120" cy="124" r="20" fill="#0039a6" />
        <text x="120" y="132" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="24" fill="#fff">A</text>
        <text x="156" y="132" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#222">8 Av Express · to Inwood 207 St</text>
        {[180, 620, 1060].map((x) => (
          <g key={x}>
            <rect x={x} y="190" width="360" height="250" rx="22" fill="#0b0d10" />
            <g class="sp-streak" stroke="#f5d48a" stroke-width="3" opacity=".6">
              <path d={`M${x + 30} 300 h60`} /><path d={`M${x + 200} 340 h40`} />
            </g>
          </g>
        ))}
      </g>
      <g class="sp-layer" style={move(10, 0)}>
        <path d="M0 620 L1600 620 L1600 900 L0 900 Z" fill="url(#st-t-floor)" />
        <rect x="0" y="520" width="1600" height="110" fill="#e9a43a" />
        {Array.from({ length: 16 }, (_, i) => <path key={i} d={`M${i * 100} 520 V630`} stroke="#c9851f" stroke-width="3" />)}
        <rect x="0" y="508" width="1600" height="14" fill="#b0b8bb" />
        {[400, 1200].map((x) => <rect key={x} x={x} y="60" width="14" height="840" fill="#c4ccd0" />)}
        <g transform="translate(560 520)">
          <circle cx="0" cy="-150" r="34" fill="#6a4a3a" />
          <path d="M-60 0 Q-60 -110 0 -110 Q60 -110 60 0 Z" fill="#3f8f8a" />
          <rect x="-40" y="-60" width="80" height="10" fill="#2f6f6a" />
        </g>
        <g transform="translate(1320 520)">
          <g transform="rotate(14 0 -150)"><circle cx="0" cy="-150" r="34" fill="#3a2c26" /></g>
          <path d="M-62 0 Q-62 -112 0 -112 Q62 -112 62 0 Z" fill="#2b2f3a" />
        </g>
      </g>
    </svg>
  );
}

function ExamHall({ fx, t, reduce }: ArtProps) {
  const move = mover(t, reduce);
  const late = fx.includes('out');
  // The clock: 8:40, then 11:50 as he leaves.
  const [h, m] = late ? [11, 50] : [8, 40];
  const hand = (deg: number, len: number) => `M0 0 L${f1(Math.sin((deg * Math.PI) / 180) * len)} ${f1(-Math.cos((deg * Math.PI) / 180) * len)}`;
  const rows = [
    { y: 470, n: 6, w: 130, gap: 40, h: 74 },
    { y: 570, n: 5, w: 170, gap: 50, h: 96 },
    { y: 700, n: 4, w: 230, gap: 60, h: 130 },
  ];
  return (
    <svg class="sp-art" viewBox="0 0 1600 900" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="st-h-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e7e1d4" /><stop offset="1" stop-color="#b9b2a2" /></linearGradient>
        <linearGradient id="st-h-light" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2c8" stop-opacity=".45" /><stop offset="1" stop-color="#fff2c8" stop-opacity="0" /></linearGradient>
        <linearGradient id="st-h-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d6458" /><stop offset="1" stop-color="#2c2822" /></linearGradient>
      </defs>
      <g class="sp-layer"><rect width="1600" height="900" fill="url(#st-h-wall)" /></g>
      <g class="sp-layer" style={move(-8, 0)}>
        {[120, 420, 1080, 1380].map((x) => (
          <g key={x}>
            <rect x={x} y="70" width="140" height="300" fill="#bcd2e4" />
            <rect x={x + 20} y="180" width="40" height="190" fill="#8ea6bb" /><rect x={x + 70} y="130" width="50" height="240" fill="#9fb5c8" />
            <path d={`M${x + 70} 70 V370`} stroke="#ece6da" stroke-width="8" />
          </g>
        ))}
        <path d="M120 70 L560 900 L120 900 Z" fill="url(#st-h-light)" />
        <path d="M1380 70 L1100 900 L1520 900 Z" fill="url(#st-h-light)" />
        <g transform="translate(800 150)">
          <circle r="48" fill="#fbfaf6" stroke="#2a2a2a" stroke-width="5" />
          <path d={hand((h % 12) * 30 + m / 2, 26)} stroke="#2a2a2a" stroke-width="6" stroke-linecap="round" />
          <path d={hand(m * 6, 38)} stroke="#2a2a2a" stroke-width="3.5" stroke-linecap="round" />
        </g>
        <g transform="translate(800 420)">
          <circle cx="0" cy="-96" r="22" fill="#7a5a48" />
          <path d="M-36 0 Q-36 -72 0 -72 Q36 -72 36 0 Z" fill="#2c3440" />
        </g>
      </g>
      <g class="sp-layer" style={move(10, -4)}>
        <path d="M0 440 L1600 440 L1600 900 L0 900 Z" fill="url(#st-h-floor)" />
        {rows.map((r) => {
          const total = r.n * r.w + (r.n - 1) * r.gap;
          const x0 = 800 - total / 2;
          return (
            <g key={r.y}>
              <rect x={f1(x0 - 20)} y={r.y} width={f1(total + 40)} height={f1(r.h * 0.18)} fill="#8a6a4a" />
              {Array.from({ length: r.n }, (_, i) => {
                const x = x0 + i * (r.w + r.gap);
                return (
                  <g key={i}>
                    <rect x={f1(x + r.w * 0.15)} y={f1(r.y - r.h * 0.7)} width={f1(r.w * 0.7)} height={f1(r.h * 0.55)} rx="3" fill="#1d2126" />
                    <rect x={f1(x + r.w * 0.19)} y={f1(r.y - r.h * 0.66)} width={f1(r.w * 0.62)} height={f1(r.h * 0.46)} fill="#d8e4ee" />
                    <rect x={f1(x + r.w * 0.46)} y={f1(r.y - r.h * 0.15)} width={f1(r.w * 0.08)} height={f1(r.h * 0.15)} fill="#1d2126" />
                  </g>
                );
              })}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/** Chapter 7: the interview, as the laptop shows it: Dr Lambda's room, the self view, and the shared whiteboard. */
function VideoCall({ fx, t, reduce }: ArtProps) {
  const has = (k: string): boolean => fx.includes(k);
  const move = mover(t, reduce);
  const sup = (s: string) => <tspan baseline-shift="super" font-size="70%">{s}</tspan>;
  const live = has('join') && !has('end');
  return (
    <svg class="sp-art" viewBox="0 0 1600 900" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="st-v-room" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b5a48" /><stop offset="1" stop-color="#2e261e" /></linearGradient>
        <linearGradient id="st-v-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9bfd3" /><stop offset="1" stop-color="#e9dcc2" /></linearGradient>
        <clipPath id="st-v-main"><rect x="70" y="80" width="1110" height="650" rx="10" /></clipPath>
        <clipPath id="st-v-self"><rect x="1220" y="550" width="320" height="180" rx="8" /></clipPath>
      </defs>
      <g class="sp-layer"><rect width="1600" height="900" fill="#17191c" /></g>
      <g class="sp-layer">
        <rect x="70" y="80" width="1110" height="650" rx="10" fill="#24272b" />
        <g clip-path="url(#st-v-main)" opacity={has('join') ? 1 : 0} style={move(-6, 0)}>
          <rect x="70" y="80" width="1110" height="650" fill="url(#st-v-room)" />
          <g>
            <rect x="110" y="120" width="420" height="600" fill="#3a2c20" />
            {BOOKS.map((b, i) => <rect key={i} x={f1(b.x + 60)} y={f1(b.y + 20)} width={f1(b.w)} height={f1(b.h)} fill={b.c} />)}
            {BOOKS.map((b, i) => <rect key={`b${i}`} x={f1(b.x + 60)} y={f1(b.y + 300)} width={f1(b.w)} height={f1(b.h)} fill={b.c} opacity=".85" />)}
            <path d="M110 290 H530 M110 430 H530 M110 570 H530" stroke="#22190f" stroke-width="10" />
          </g>
          <rect x="820" y="150" width="280" height="300" fill="url(#st-v-sky)" />
          <path d="M930 450 V300 L960 230 L990 300 V450 Z" fill="#c9b99a" />
          <path d="M820 150 h280 v300 h-280 z M960 150 V450" fill="none" stroke="#e6dccb" stroke-width="10" />
          <g transform="translate(700 730)">
            <path d="M-230 0 Q-220 -210 0 -220 Q220 -210 230 0 Z" fill="#5d4656" />
            <path d="M-40 -220 L0 -150 L40 -220 Z" fill="#e8e2d6" />
            <rect x="-34" y="-270" width="68" height="60" fill="#b98a6c" />
            <ellipse cx="0" cy="-330" rx="80" ry="96" fill="#c99b7b" />
            <path d="M-84 -340 Q-90 -440 0 -440 Q90 -440 84 -340 Q70 -400 0 -404 Q-70 -400 -84 -340 Z" fill="#9c9a96" />
            <circle cx="0" cy="-444" r="30" fill="#9c9a96" />
            <g fill="none" stroke="#2a2a2a" stroke-width="4"><circle cx="-32" cy="-330" r="20" /><circle cx="32" cy="-330" r="20" /><path d="M-12 -330 H12" /></g>
          </g>
        </g>
        <text x="625" y="425" text-anchor="middle" font-family="Spectral, serif" font-size="26" fill="#9aa3a0" opacity={has('join') ? 0 : 1}>Waiting for the host to start this meeting.</text>
        <g opacity={has('join') ? 1 : 0}>
          <rect x="86" y="682" width="200" height="34" rx="4" fill="#000" opacity=".55" />
          <text x="100" y="706" font-family="Spectral, serif" font-size="20" fill="#eef0ec">Dr Ada Lambda</text>
        </g>
        <g opacity={has('end') ? 1 : 0}>
          <rect x="70" y="80" width="1110" height="650" rx="10" fill="#24272b" />
          <text x="625" y="425" text-anchor="middle" font-family="Spectral, serif" font-size="28" fill="#9aa3a0">The meeting has ended.</text>
        </g>
      </g>
      <g class="sp-layer">
        <rect x="1220" y="80" width="320" height="450" rx="8" fill="#fbfaf6" opacity={live && has('q') ? 1 : 0.08} />
        <g font-family="Spectral, serif" fill="#22262b" font-size="26" opacity={has('q') ? 1 : 0}>
          <text x="1240" y="118" font-size="16" fill="#6b7177">Whiteboard</text>
          <text x="1240" y="170">e{sup('π')} or π{sup('e')} ?</text>
          <text x="1240" y="220" opacity={has('logs') ? 1 : 0}>π  vs  e ln π</text>
          <text x="1240" y="275" opacity={has('f') ? 1 : 0}>f(x) = ln x / x</text>
          <text x="1240" y="325" font-size="22" opacity={has('deriv') ? 1 : 0}>f'(x) = (1 - ln x) / x²</text>
          <text x="1240" y="360" font-size="20" fill="#6b7177" opacity={has('deriv') ? 1 : 0}>max at x = e</text>
          <g opacity={has('done') ? 1 : 0}>
            <text x="1240" y="410" font-size="22">π &gt; e, so f(π) &lt; f(e)</text>
            <rect x="1234" y="430" width="200" height="50" fill="#e3efe8" />
            <text x="1244" y="466" fill="#3f7a63">e{sup('π')} &gt; π{sup('e')}</text>
          </g>
        </g>
        <g clip-path="url(#st-v-self)">
          <rect x="1220" y="550" width="320" height="180" fill="#3a2f26" />
          <rect x="1250" y="570" width="90" height="70" fill="#5a6a80" opacity=".6" />
          <g transform="translate(1400 730)">
            <path d="M-80 0 Q-76 -70 0 -74 Q76 -70 80 0 Z" fill="#e8e8ea" />
            <ellipse cx="0" cy="-108" rx="32" ry="38" fill="#c49274" />
            <path d="M-32 -118 Q-30 -150 0 -150 Q30 -150 32 -118 Q20 -134 0 -134 Q-20 -134 -32 -118 Z" fill="#2a1f18" />
          </g>
          <rect x="1230" y="698" width="120" height="24" rx="3" fill="#000" opacity=".55" />
          <text x="1240" y="716" font-family="Spectral, serif" font-size="15" fill="#eef0ec">Albert Burt</text>
        </g>
        <g transform="translate(625 778)" font-family="Spectral, serif" font-size="16" fill="#9aa3a0" text-anchor="middle">
          <circle cx="-90" cy="0" r="20" fill="#2d3136" /><circle cx="-30" cy="0" r="20" fill="#2d3136" />
          <rect x="20" y="-18" width="110" height="36" rx="18" fill="#c8102e" />
          <text x="75" y="6" fill="#fff">Leave</text>
        </g>
      </g>
    </svg>
  );
}

/** Chapter 9: Senate Court in the morning, the lists going up on the board, and the phone in Brooklyn at 3:00 am. */
function SenateBoard({ fx, now, t, reduce, n }: ArtProps) {
  const has = (k: string): boolean => fx.includes(k);
  const move = mover(t, reduce);
  const c = n.campaign;
  const outcome = c === null ? 'missed' : offerOutcome(c);
  const rows = c === null ? [] : c.route === 'maths' && c.step.length > 0
    ? c.step.map((p) => ({ k: p.name, v: `grade ${p.grade ?? 'U'}`, ok: p.grade === '1' || p.grade === 'S' }))
    : c.conditions.map((x) => ({ k: x.label.replace('A level ', ''), v: x.status === 'met' ? 'met' : x.status === 'short' ? 'short' : 'not sat', ok: x.status === 'met' }));
  const status = has('confirm') ? 'Confirmed' : outcome === 'missed' && has('ring') && now !== 'ring' ? 'Deferred place' : 'Conditional';
  return (
    <svg class="sp-art" viewBox="0 0 1600 900" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="st-s-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fb0cf" /><stop offset="1" stop-color="#f1dcb4" /></linearGradient>
        <linearGradient id="st-s-stone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efe5cf" /><stop offset="1" stop-color="#c9b994" /></linearGradient>
        <linearGradient id="st-s-dark" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#05070a" stop-opacity="0" /><stop offset=".5" stop-color="#05070a" stop-opacity=".75" /></linearGradient>
      </defs>
      <g class="sp-layer"><rect width="1600" height="900" fill="url(#st-s-sky)" /></g>
      <g class="sp-layer" style={move(-10, 0)}>
        <path d="M260 230 L800 120 L1340 230 Z" fill="url(#st-s-stone)" stroke="#b9a87e" stroke-width="4" />
        <rect x="260" y="230" width="1080" height="420" fill="url(#st-s-stone)" />
        <rect x="250" y="226" width="1100" height="20" fill="#d9caa4" />
        {Array.from({ length: 8 }, (_, i) => (
          <g key={i}>
            <rect x={310 + i * 140} y="260" width="40" height="370" fill="#f6eedb" />
            <rect x={302 + i * 140} y="252" width="56" height="16" fill="#e2d4b0" />
            <rect x={302 + i * 140} y="624" width="56" height="14" fill="#e2d4b0" />
          </g>
        ))}
        {Array.from({ length: 7 }, (_, i) => <rect key={i} x={372 + i * 140} y="380" width="56" height="120" fill="#5a5444" opacity=".55" />)}
        <path d="M0 650 H1600 V900 H0 Z" fill="#5f8a4c" />
        <path d="M0 650 H1600" stroke="#3c5a30" stroke-width="3" />
        <g stroke="#1b1b1b" stroke-width="5">{Array.from({ length: 40 }, (_, i) => <path key={i} d={`M${i * 40} 700 V780`} />)}<path d="M0 712 H1600 M0 770 H1600" /></g>
      </g>
      <g class="sp-layer" style={move(8, -4)}>
        <g transform="translate(470 520)">
          <rect x="-12" y="40" width="16" height="300" fill="#2a2420" /><rect x="296" y="40" width="16" height="300" fill="#2a2420" />
          <rect x="-30" y="-140" width="360" height="200" fill="#2e2a24" />
          <rect x="-18" y="-128" width="336" height="176" fill="#e9eef0" opacity=".9" />
          {[0, 1, 2].map((col) => (
            <g key={col}>
              <rect x={-8 + col * 110} y="-118" width="98" height="156" fill="#fbfbf7" />
              {Array.from({ length: 11 }, (_, i) => <rect key={i} x={2 + col * 110} y={-104 + i * 13} width={i % 4 === 0 ? 50 : 76} height="4" fill="#4a4a4a" opacity=".55" />)}
            </g>
          ))}
        </g>
        <g transform="translate(900 840)">
          <path d="M-46 0 L-40 -160 Q0 -180 40 -160 L46 0 Z" fill="#15161a" />
          <circle cx="0" cy="-196" r="28" fill="#c09277" />
          <ellipse cx="0" cy="-218" rx="40" ry="8" fill="#111" /><rect x="-24" y="-246" width="48" height="30" rx="14" fill="#111" />
          <path d="M-40 -150 L-120 -230" stroke="#15161a" stroke-width="22" stroke-linecap="round" />
        </g>
      </g>
      <g class="sp-layer" opacity={has('phone') ? 1 : 0}>
        <rect x="0" y="0" width="1600" height="900" fill="url(#st-s-dark)" />
        <g transform="translate(1250 470)">
          <g class={now === 'ring' ? 'sp-buzz' : undefined}>
            <rect x="-170" y="-340" width="340" height="680" rx="40" fill="#0d0f12" stroke="#2c3036" stroke-width="4" />
            <rect x="-152" y="-318" width="304" height="636" rx="28" fill="#f4f5f2" />
            <g font-family="Spectral, serif" fill="#22262b">
              <text x="-130" y="-286" font-size="18">3:00 am</text>
              <text x="-130" y="-230" font-size="26" font-weight="500">Applicant portal</text>
              <text x="-130" y="-200" font-size="18" fill="#6b7177">Euclid College, New Cambridge</text>
              <g opacity={has('grades') ? 1 : 0} font-size="20">
                {rows.slice(0, 5).map((r, i) => (
                  <g key={r.k}>
                    <text x="-130" y={-140 + i * 40}>{r.k}</text>
                    <text x="130" y={-140 + i * 40} text-anchor="end" fill={r.ok ? '#3f7a63' : '#a23a2a'}>{r.v}</text>
                  </g>
                ))}
              </g>
              <rect x="-134" y="80" width="268" height="60" rx="6" fill={status === 'Confirmed' ? '#3f7a63' : status === 'Deferred place' ? '#8a6a2a' : '#c9d1d8'} opacity={has('grades') ? 1 : 0} />
              <text x="0" y="119" text-anchor="middle" font-size="24" fill={status === 'Conditional' ? '#22262b' : '#fff'} opacity={has('grades') ? 1 : 0}>{status}</text>
              <g opacity={now === 'ring' ? 1 : 0}>
                <rect x="-152" y="-318" width="304" height="636" rx="28" fill="#1d2a24" />
                <text x="0" y="-120" text-anchor="middle" font-size="26" fill="#eef0ec">New Cambridge</text>
                <text x="0" y="-86" text-anchor="middle" font-size="18" fill="#9aa3a0">incoming call</text>
                <circle cx="-70" cy="220" r="34" fill="#c8102e" /><circle cx="70" cy="220" r="34" fill="#3f9a63" />
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

const LEAVES = (() => {
  const r = seeded(41);
  return Array.from({ length: 60 }, () => ({ x: r() * 260 - 130, y: r() * 200 - 100, r: 14 + r() * 26, c: ['#a33b22', '#c25a28', '#8a2c1c', '#d0802e'][Math.floor(r() * 4)] as string }));
})();

/** Chapter 10: the College gate, the court in autumn through the arch, and the photograph. */
function CollegeGate({ fx, t, reduce }: ArtProps) {
  const has = (k: string): boolean => fx.includes(k);
  const move = mover(t, reduce);
  const inCourt = has('court');
  const zoom = inCourt ? { transform: 'scale(1.55)', transformOrigin: '800px 520px' } : { transform: 'scale(1)', transformOrigin: '800px 520px' };
  const gowned = (x: number, y: number, s: number, scarf: string | null, wave = false) => (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-34 0 L-28 -120 Q0 -136 28 -120 L34 0 Z" fill="#111317" />
      {scarf !== null && <path d="M-14 -118 L-8 -60 M14 -118 L8 -60" stroke={scarf} stroke-width="8" />}
      <path d="M-6 -120 L0 -96 L6 -120 Z" fill="#f4f1ea" />
      <circle cx="0" cy="-146" r="20" fill="#b78a6c" />
      {wave && <path d="M26 -110 L54 -170" stroke="#111317" stroke-width="12" stroke-linecap="round" />}
    </g>
  );
  return (
    <svg class="sp-art" viewBox="0 0 1600 900" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="st-g-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9db6cc" /><stop offset="1" stop-color="#ecd7b0" /></linearGradient>
        <linearGradient id="st-g-brick" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a5642" /><stop offset="1" stop-color="#6e3a2c" /></linearGradient>
        <clipPath id="st-g-arch"><path d="M690 760 V480 Q690 380 800 360 Q910 380 910 480 V760 Z" /></clipPath>
      </defs>
      <g class="sp-layer"><rect width="1600" height="900" fill="url(#st-g-sky)" /></g>
      <g class="sp-layer" style={reduce ? undefined : zoom}>
        <g clip-path={inCourt ? undefined : 'url(#st-g-arch)'}>
          <rect x="0" y="300" width="1600" height="300" fill="#d9c9a6" />
          {Array.from({ length: 12 }, (_, i) => <rect key={i} x={40 + i * 130} y="380" width="50" height="90" fill="#4c4a42" opacity=".5" />)}
          <path d="M0 300 L0 250 L1600 250 L1600 300 Z" fill="#7a6a58" />
          <path d="M0 560 H1600 V900 H0 Z" fill="#6f9a52" />
          <path d="M0 560 H1600" stroke="#c9b994" stroke-width="18" />
          <g transform="translate(1040 470)">
            <rect x="-14" y="0" width="28" height="110" fill="#3a2a20" />
            {LEAVES.map((l, i) => <circle key={i} cx={f1(l.x)} cy={f1(l.y - 40)} r={f1(l.r)} fill={l.c} opacity=".9" />)}
          </g>
          {[[300, 700], [420, 760], [1300, 740]].map(([x, y]) => <circle key={`${x}`} cx={x} cy={y} r="6" fill="#c25a28" />)}
          {has('priya') && gowned(560, 640, 0.9, '#c8102e', true)}
        </g>
        {!inCourt && (
          <g>
            <rect x="420" y="200" width="760" height="600" fill="url(#st-g-brick)" />
            <path d="M690 800 V480 Q690 380 800 360 Q910 380 910 480 V800" fill="none" stroke="#d8c8a0" stroke-width="22" />
            <rect x="340" y="120" width="160" height="680" fill="url(#st-g-brick)" />
            <rect x="1100" y="120" width="160" height="680" fill="url(#st-g-brick)" />
            {[340, 1100].map((x) => (
              <g key={x}>
                {[0, 1, 2, 3].map((i) => <rect key={i} x={x + i * 44} y="96" width="28" height="28" fill="#8a4a38" />)}
                <rect x={x + 50} y="260" width="60" height="110" fill="#2a2a2e" stroke="#d8c8a0" stroke-width="8" />
              </g>
            ))}
            <rect x="560" y="250" width="480" height="70" fill="#d8c8a0" />
            <text x="800" y="296" text-anchor="middle" font-family="Cormorant Garamond, serif" font-weight="700" font-size="34" fill="#4a3a2a" letter-spacing="6">COLLEGIVM EVCLIDIS</text>
            <path d="M610 800 L690 480 L690 800 Z M990 800 L910 480 L910 800 Z" fill="#4a2e1e" opacity=".9" />
            <rect x="0" y="800" width="1600" height="100" fill="#8c8478" />
          </g>
        )}
      </g>
      <g class="sp-layer" style={move(6, -3)}>
        {has('tutor') && !inCourt && gowned(620, 830, 1.3, null)}
        {has('photo') && (
          <g>
            {[0, 1, 2].flatMap((row) => Array.from({ length: 11 - row }, (_, i) => (
              <g key={`${row}-${i}`}>{gowned(260 + row * 50 + i * 110, 900 - row * 70, 0.7, null)}</g>
            )))}
            <rect class="sp-flash" width="1600" height="900" fill="#fff" />
          </g>
        )}
      </g>
    </svg>
  );
}

export const ART: Readonly<Record<ArtId, ComponentType<ArtProps>>> = {
  'kitchen-night': (p) => <Kitchen {...p} time="night" screen="step" />,
  'kitchen-dawn': (p) => <Kitchen {...p} time="dawn" screen="contents" />,
  'kitchen-results': (p) => <Kitchen {...p} time="dusk" screen="results" />,
  'kitchen-apply': (p) => <Kitchen {...p} time="night" screen="apply" />,
  'kitchen-offer': (p) => <Kitchen {...p} time="dawn" screen="offer" />,
  'desk-night': Desk,
  'window-winter': WinterWindow,
  'train-hall': TrainHall,
  'video-call': VideoCall,
  'senate-board': SenateBoard,
  'college-gate': CollegeGate,
};
