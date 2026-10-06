/**
 * The Story tab (mastery/DESIGN-STORY.md): the learner's REP and level with what it is
 * made of, the four relationships, and the chapters. Seen scenes can be replayed, a
 * queued scene can be played now, and the rest are listed locked with their real triggers.
 */
import type { Progress } from '@learnhub/mastery';
import { campaign } from '@/model/campaignStore';
import { loadDays } from '@/model/dayLog';
import { now } from '@/model/store';
import {
  CHARACTERS, REL_IDS, REP_TABLE, isShabbat, metOf, relationWord, repLevel, repOf, titleOf, triggerText, type Scene, type StoryState,
} from '@/model/story';
import { BOOKS, LATER_BOOKS, SCENES } from '@/model/storyScenes';
import { storyFacts } from '@/model/storyFacts';
import { playing, story } from '@/model/storyStore';
import { shortStamp } from '@/ui/campaignShared';

const sentence = (s: string): string => `${s.charAt(0).toUpperCase()}${s.slice(1)}.`;

function SceneRow({ s, st, shabbat }: { s: Scene; st: StoryState; shabbat: boolean }) {
  const seen = st.seen[s.id];
  const queued = st.queued.some((q) => q.id === s.id);
  // A seen scene goes by the title it played under ("The Long Winter" or "Momentum").
  const title = seen === undefined ? s.title : titleOf(s, { n: seen.n, rel: st.relationships });
  const name = s.book === 0 ? title : `${s.chapter}. ${title}`;
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

export function StoryView({ p }: { p: Progress }) {
  const st = story.value;
  const f = storyFacts(p, campaign.value, loadDays(), now());
  const rep = repOf(f);
  const level = repLevel(rep);
  const met = metOf(SCENES, st.seen);
  const shabbat = isShabbat(now());
  return (
    <section class="camp" aria-labelledby="story-title">
      <h1 id="story-title">Story</h1>
      <p class="lead">A story you play through by studying. Your real progress triggers every scene, and REP comes only from real work.</p>

      <section class="sec" aria-labelledby="story-rep">
        <div class="sec-h"><h2 id="story-rep">Reputation</h2><span>{rep} REP</span></div>
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

      <section class="sec story-rel" aria-labelledby="story-rel">
        <div class="sec-h"><h2 id="story-rel">Relationships</h2></div>
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

      {BOOKS.map((b) => (
        <section key={b.n} class="sec story-scenes" aria-labelledby={`story-book-${b.n}`}>
          <div class="sec-h"><h2 id={`story-book-${b.n}`}>{b.title}</h2></div>
          <ul class="ruled">
            {SCENES.filter((s) => s.book === b.n).map((s) => <SceneRow key={s.id} s={s} st={st} shabbat={shabbat} />)}
          </ul>
        </section>
      ))}

      <section class="sec story-scenes" aria-labelledby="story-later">
        <div class="sec-h"><h2 id="story-later">Later books</h2></div>
        <ul class="ruled">
          {LATER_BOOKS.map((t) => <li key={t} class="story-locked"><span>{t}</span><span class="r">not yet written</span></li>)}
        </ul>
      </section>
      <p class="note">Scenes never play by themselves from Friday sundown to Saturday sundown; they wait and play after.</p>
    </section>
  );
}
