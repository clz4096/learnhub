/**
 * The Story tab (mastery/DESIGN-STORY.md): the learner's REP and level with what it is
 * made of, the player ratings, the four relationships, and the chapters, side scenes, and
 * beats. Seen scenes can be replayed, a queued scene can be played now, and the rest are
 * listed locked with their real triggers.
 */
import { useEffect } from 'preact/hooks';
import type { Progress } from '@learnhub/mastery';
import { campaign } from '@/model/campaignStore';
import { loadDays } from '@/model/dayLog';
import { hasStoredLadder, peekLadder } from '@/model/ladderStore';
import { DRILL_CAP, RATING_MAX, RATING_MIN, overall, type Rating } from '@/model/ratings';
import { now } from '@/model/store';
import {
  CHARACTERS, REL_IDS, REP_TABLE, isShabbat, metOf, relationWord, repLevel, repOf, strandOf, titleOf, triggerText,
  type Scene, type StoryNumbers, type StoryState,
} from '@/model/story';
import { BOOKS, LATER_BOOKS, SCENES } from '@/model/storyScenes';
import { storyFacts, storyRatings } from '@/model/storyFacts';
import { playing, story } from '@/model/storyStore';
import { admissions, loadAdmissions, shortStamp } from '@/ui/campaignShared';
import { ART } from '@/ui/story/art';

const sentence = (s: string): string => `${s.charAt(0).toUpperCase()}${s.slice(1)}.`;

function SceneRow({ s, st, shabbat }: { s: Scene; st: StoryState; shabbat: boolean }) {
  const seen = st.seen[s.id];
  const queued = st.queued.some((q) => q.id === s.id);
  // A seen scene goes by the title it played under ("The Long Winter" or "Momentum").
  const title = seen === undefined ? s.title : titleOf(s, { n: seen.n, rel: st.relationships });
  const name = s.book === 0 || strandOf(s) !== 'main' ? title : `${s.chapter}. ${title}`;
  const open = (): void => { playing.value = { id: s.id, auto: false }; };
  if (s.script !== null && seen !== undefined) {
    return (
      <li>
        <span>{name}</span>
        <span class="r"><button type="button" class="story-play" onClick={open} aria-label={`Replay ${title}`}>Replay</button></span>
        <span class="s">Seen {shortStamp(seen.first)}{seen.plays > 1 ? `, played ${seen.plays} times` : ''}.</span>
      </li>
    );
  }
  if (s.script !== null && queued) {
    return (
      <li>
        <span>{name}</span>
        <span class="r"><button type="button" class="story-play" onClick={open} aria-label={`Play ${s.title}`}>Play</button></span>
        <span class="s">{shabbat ? 'Ready. It waits until Saturday sundown to play by itself.' : 'Ready to play.'}</span>
      </li>
    );
  }
  return (
    <li class="story-locked">
      <span>{name}</span>
      <span class="r">{s.script === null ? 'not yet written' : 'locked'}</span>
      <span class="s">{sentence(triggerText(s.trigger))}</span>
    </li>
  );
}

/** The scene for the card: the first ready to play, else the next still locked, else the last one seen. */
function featured(st: StoryState): { s: Scene; state: 'ready' | 'locked' | 'seen' } | null {
  const written = SCENES.filter((x) => x.script !== null);
  const q = st.queued.map((x) => written.find((y) => y.id === x.id)).find((x) => x !== undefined);
  if (q !== undefined) return { s: q, state: 'ready' };
  const next = written.find((x) => strandOf(x) === 'main' && st.seen[x.id] === undefined);
  if (next !== undefined) return { s: next, state: 'locked' };
  const last = [...written].reverse().find((x) => st.seen[x.id] !== undefined);
  return last === undefined ? null : { s: last, state: 'seen' };
}

function SceneCard({ st, numbers }: { st: StoryState; numbers: StoryNumbers }) {
  const f = featured(st);
  if (f === null) return null;
  const { s, state } = f;
  const Art = s.art === null ? null : ART[s.art];
  const title = state === 'seen' ? titleOf(s, { n: st.seen[s.id]?.n ?? numbers, rel: st.relationships }) : s.title;
  const play = (): void => { playing.value = { id: s.id, auto: false }; };
  return (
    <div class="ds-scenecard">
      <div class="ds-art" aria-hidden="true">{Art !== null && <Art fx={[]} now={null} t={0} reduce n={numbers} />}</div>
      <div class="ds-cap">
        <span>
          <b>{title}</b>
          <span class="ds-meta">{state === 'ready' ? `ready · ${s.kicker}` : state === 'seen' ? `seen · ${s.kicker}` : sentence(triggerText(s.trigger))}</span>
        </span>
        {state !== 'locked' && (
          <button type="button" class="ds-btn" onClick={play} aria-label={`${state === 'ready' ? 'Play' : 'Replay'} ${title}`}>{state === 'ready' ? 'Play' : 'Replay'}</button>
        )}
      </div>
    </div>
  );
}

/** The six ratings and the overall, 2K style: mono numbers on hairline bars. */
function RatingsCard({ rs }: { rs: readonly Rating[] }) {
  const ovr = overall(rs);
  const share = (v: number): number => Math.round((100 * (v - RATING_MIN)) / (RATING_MAX - RATING_MIN));
  return (
    <section class="ds-sect story-ratings" aria-labelledby="story-ratings">
      <div class="ds-eyebrow ds-sect-h"><h2 id="story-ratings">Ratings</h2><span>Overall</span></div>
      <div class="rt-card">
        <div class="rt-ovr" aria-label={`Overall rating ${ovr}`}>{ovr}</div>
        <ul class="rt-list">
          {rs.map((r) => (
            <li key={r.id}>
              <span class="rt-l">{r.label}</span>
              <span class="rt-v">{r.value}</span>
              <span class="rt-bar" aria-hidden="true"><i style={{ width: `${share(r.value)}%` }} /></span>
            </li>
          ))}
        </ul>
      </div>
      <p class="ds-meta rt-note">
        From 40 to 99. Only gated mastery, passed supervisions, and timed papers raise a rating; drills and gym alone stop at {DRILL_CAP}.
      </p>
    </section>
  );
}

export function StoryView({ p }: { p: Progress }) {
  const st = story.value;
  const adm = admissions.value;
  const c = campaign.value;
  // Exam Temperament marks timed papers, which needs the registry; it loads only when there are some.
  useEffect(() => {
    if (adm === null && ((c?.sittings.length ?? 0) > 0 || hasStoredLadder())) void loadAdmissions();
  }, [adm, c]);
  const rs = storyRatings(p, c, adm, adm === null ? [] : peekLadder(adm));
  const f = storyFacts(p, campaign.value, loadDays(), now());
  const rep = repOf(f);
  const level = repLevel(rep);
  const met = metOf(SCENES, st.seen);
  const shabbat = isShabbat(now());
  const span = level.next === null ? 1 : level.next.at - level.at;
  const pct = level.next === null ? 100 : Math.min(100, Math.round((100 * (rep - level.at)) / span));
  const written = SCENES.filter((x) => x.script !== null && strandOf(x) === 'main');
  const seen = written.filter((x) => st.seen[x.id] !== undefined).length;
  const extras = SCENES.filter((x) => x.script !== null && strandOf(x) !== 'main');
  return (
    <section class="camp ds-story" aria-labelledby="story-title">
      <div class="ds-eyebrow">Story · Book One</div>
      <h1 id="story-title" class="ds-h1">Story</h1>
      <p class="ds-meta">
        REP {rep.toLocaleString('en-US')} · {level.next === null ? `${level.name}, the top level` : `${level.name} → ${level.next.name} · ${level.next.at - rep} to go`}
        <span class="visually-hidden">{level.next === null ? '' : `. ${level.next.at - rep} to ${level.next.name}`}</span>
      </p>
      <div class="ds-track" role="progressbar" aria-label={`REP toward ${level.next?.name ?? 'the top'}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <i style={{ width: `${pct}%` }} />
      </div>
      <p class="lead">A story you play through by studying. Your real progress triggers every scene, and REP comes only from real work.</p>
      <SceneCard st={st} numbers={f} />
      <RatingsCard rs={rs} />

      <section class="ds-sect story-scenes" aria-labelledby="story-chapters">
        <div class="ds-eyebrow ds-sect-h"><h2 id="story-chapters">Chapters</h2><span>{seen} / {written.length}</span></div>
        {BOOKS.map((b) => (
          <section key={b.n} class="sec story-book" aria-labelledby={`story-book-${b.n}`}>
            <div class="sec-h"><h3 id={`story-book-${b.n}`}>{b.title}</h3></div>
            <ul class="ruled">
              {SCENES.filter((x) => x.book === b.n && strandOf(x) === 'main').map((x) => <SceneRow key={x.id} s={x} st={st} shabbat={shabbat} />)}
            </ul>
          </section>
        ))}
        <section class="sec story-book" aria-labelledby="story-side">
          <div class="sec-h"><h3 id="story-side">Side scenes and beats</h3></div>
          <ul class="ruled">
            {extras.map((x) => <SceneRow key={x.id} s={x} st={st} shabbat={shabbat} />)}
          </ul>
        </section>
        <section class="sec story-book" aria-labelledby="story-later">
          <div class="sec-h"><h3 id="story-later">Later books</h3></div>
          <ul class="ruled">
            {LATER_BOOKS.map((t) => <li key={t} class="story-locked"><span>{t}</span><span class="r">not yet written</span></li>)}
          </ul>
        </section>
      </section>

      <section class="ds-sect story-rel" aria-labelledby="story-rel">
        <div class="ds-eyebrow ds-sect-h"><h2 id="story-rel">Relationships</h2></div>
        <ul class="ruled">
          {REL_IDS.map((id) => (
            <li key={id}>
              <span>{CHARACTERS[id].name}</span>
              <span class="r">{met.has(id) ? relationWord(st.relationships[id]) : 'not met yet'}</span>
              <span class="s">{CHARACTERS[id].role}</span>
            </li>
          ))}
        </ul>
      </section>

      <section class="ds-sect" aria-labelledby="story-rep">
        <div class="ds-eyebrow ds-sect-h"><h2 id="story-rep">Reputation</h2><span>{rep} REP</span></div>
        <ul class="ruled">
          <li>
            <span>{level.name}</span>
            <span class="r">{level.next === null ? 'the top level' : `${level.next.at - rep} to ${level.next.name}`}</span>
          </li>
          {REP_TABLE.map((r) => (
            <li key={r.source}>
              <span>{r.label}</span>
              <span class="r">{Math.floor(f[r.source])} × {r.points}</span>
            </li>
          ))}
        </ul>
      </section>
      <p class="note">Scenes play as soon as your work triggers them, except during a timed paper and from Friday sundown to Saturday sundown; then they wait, and Today shows that one is ready.</p>
    </section>
  );
}
