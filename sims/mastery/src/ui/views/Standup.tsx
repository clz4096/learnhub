/**
 * The cohort's daily standup (#/standup): the day's updates in speaking order, each with a
 * monogram portrait, then Albert's own (the StandupSlot). Play reads the updates aloud, a
 * voice per classmate where the browser has them; Stop ends it. Read aloud never starts by
 * itself, is off while muted (You, Settings), and under reduced motion the page does not
 * scroll to follow the speaker.
 *
 * On a day without a standup (a weekend, Shabbat, yom tov, before the programme) the screen
 * shows the last standup held and says when the next one is. Albert's attendance is the
 * standup log's: a date counts once his update is submitted in the slot.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { PROGRAMME, classmateById, type Classmate } from '@/model/cohort';
import { fmtLong, planDate, planMinute } from '@/model/day';
import {
  STANDUP_LENGTH, isStandupDay, nextStandup, previousStandup, spokenText, standupUpdates, type StandupUpdate,
} from '@/model/standup';
import { yomTovOf } from '@/model/holidays';
import { reloadStandup, saveStandup, standup } from '@/model/standupStore';
import { LEARNER_NAME } from '@/model/shell';
import { now } from '@/model/store';
import { reducedMotion } from '@/ui/shell/state';
import { StandupSlot } from '@/ui/StandupSlot';
import { CalendarLink } from '@/ui/cohort/CalendarLink';
import { Monogram } from '@/ui/cohort/Monogram';
import { speakAll, synth } from '@/ui/cohort/speech';

const longDate = (date: string): string =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });

function UpdateRow({ c, u, on }: { c: Classmate; u: StandupUpdate; on: boolean }) {
  return (
    <li class={`su-row${on ? ' on' : ''}`} id={`su-${c.id}`} aria-current={on ? 'true' : undefined}>
      <Monogram id={c.id} name={c.name} on={on} />
      <div class="su-body">
        <div class="su-who"><b>{c.name}</b><span class="su-bg">{c.background}</span></div>
        <p class="su-line">{u.yesterday}</p>
        <p class="su-line">{u.today}</p>
        <p class="su-line">{u.blocked}</p>
      </div>
    </li>
  );
}

export function StandupView() {
  const t = now();
  const today = planDate(t);
  const nowMin = planMinute(t);
  const saved = standup.value;
  // With standups off the cohort still meets: the screen shows their updates, and Albert's slot says so.
  const st = { ...saved, enabled: true };
  const held = isStandupDay(today, st);
  // The standup shown: today's, or the last one held.
  const date = held ? today : previousStandup(today, st);
  const next = nextStandup(today, st);
  const updates = date === null ? [] : standupUpdates(date, st);
  const [speaker, setSpeaker] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const stop = useRef<(() => void) | null>(null);
  useEffect(() => () => stop.current?.(), []);
  useEffect(() => {
    if (speaker === null || reducedMotion()) return;
    document.getElementById(`su-${speaker}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [speaker]);

  const canSpeak = synth() !== null && !st.muted && updates.length > 0;
  const playing = active;
  const play = (): void => {
    if (playing) {
      stop.current?.();
      stop.current = null;
      setActive(false);
      return;
    }
    if (!canSpeak) return;
    const passages = updates.flatMap((u) => {
      const c = classmateById(u.who);
      return c === undefined ? [] : [{ id: c.id, text: spokenText(c, u), who: c }];
    });
    setActive(true);
    stop.current = speakAll(passages, (id) => {
      setSpeaker(id);
      if (id === null) {
        stop.current = null;
        setActive(false);
      }
    });
  };
  const toggleMute = (): void => {
    if (!st.muted) {
      stop.current?.();
      stop.current = null;
      setActive(false);
    }
    saveStandup({ ...st, muted: !st.muted });
  };

  const attended = date !== null && st.attended.includes(date);
  const end = st.minutes + STANDUP_LENGTH;
  const holiday = yomTovOf(today);
  const status = !held ? `No standup today${holiday === null ? '' : `, ${holiday}`}. The next is ${longDate(next)}, ${fmtLong(st.minutes)}.`
    : attended ? 'You gave your update today.'
      : nowMin < st.minutes ? `Starts at ${fmtLong(st.minutes)}.`
        : nowMin < end ? `On now, until ${fmtLong(end)}.`
          : 'Over for today. Your update was not given.';

  return (
    <section class="ds-page su" aria-labelledby="su-page-title">
      <div class="ds-eyebrow">Standup · {date === null ? 'the cohort' : longDate(date)}</div>
      <h1 id="su-page-title" class="ds-h1">Standup</h1>
      <p class="ds-meta">{fmtLong(st.minutes)} · {STANDUP_LENGTH} minutes · the {PROGRAMME.name}</p>
      <CalendarLink />
      <p class="ds-note su-status" role="status">{saved.enabled ? status : 'Standups are off in You, so none is planned or missed. The cohort still meets.'}</p>

      {date === null
        ? <p class="ds-note">The programme's first standup is on {longDate(next)}.</p>
        : (
          <>
            <div class="su-ctl">
              <button type="button" class="ds-btn" disabled={!canSpeak && !playing} aria-pressed={playing} onClick={play}>
                {playing ? 'Stop' : 'Play the standup'}
              </button>
              <button type="button" class="d-text" aria-pressed={st.muted} onClick={toggleMute}>{st.muted ? 'Unmute read aloud' : 'Mute read aloud'}</button>
              {synth() === null && <span class="ds-meta">This browser cannot read aloud.</span>}
            </div>
            <ol class="su-list" aria-label={`Updates, ${longDate(date)}`}>
              {updates.map((u) => {
                const c = classmateById(u.who);
                return c === undefined ? null : <UpdateRow key={c.id} c={c} u={u} on={speaker === c.id} />;
              })}
              <li class="su-row su-self">
                <Monogram id="albert" name={LEARNER_NAME} />
                <div class="su-body">
                  <div class="su-who"><b>{LEARNER_NAME}</b><span class="su-bg">Your update</span></div>
                  {held && saved.enabled
                    ? <StandupSlot date={date} onDone={reloadStandup} />
                    : <p class="su-line quiet">{attended ? 'Given.' : 'Not given.'} Your next update is on {longDate(next)}.</p>}
                </div>
              </li>
            </ol>
          </>
        )}
    </section>
  );
}
