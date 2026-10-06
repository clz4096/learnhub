/**
 * Watches the learner's real data for scenes that have just triggered, queues them, and
 * starts the first queued scene by itself when that is allowed: the app has loaded, no
 * scene is playing, no timed paper is running, and it is not Shabbat (see `autoPlay`).
 * A scene that waits shows as "A scene is ready" on Today; one queued on Shabbat plays
 * after it.
 *
 * The campaign's scenes read the acts and results, which need the paper registry. It loads
 * on demand, as the Report and Paper screens load it: only with a campaign and a campaign
 * scene not yet seen. Letters due are filed here too, as every campaign screen files them,
 * so a letter's scene never waits for a visit to the Letters tab.
 *
 * Exam Temperament reads timed papers, which also need the registry to mark: it loads too
 * while a temperament beat is unseen and this browser holds timed work.
 */
import { useEffect } from 'preact/hooks';
import { activeSitting, acts, deliverLetters, lettersDue } from '@/model/campaign';
import { campaign, saveCampaign } from '@/model/campaignStore';
import { hasStoredLadder, peekLadder } from '@/model/ladderStore';
import { courseInputs } from '@/model/campaignSummary';
import { loadDays } from '@/model/dayLog';
import type { Route } from '@/model/route';
import { now, progress } from '@/model/store';
import { autoPlay, enqueue, newlyDue, type StoryState } from '@/model/story';
import { SCENES } from '@/model/storyScenes';
import { storyFacts } from '@/model/storyFacts';
import { playing, saveStory, story } from '@/model/storyStore';
import { admissions, loadAdmissions } from '@/ui/campaignShared';

const CAMPAIGN_TRIGGERS: ReadonlySet<string> = new Set(['act', 'letter', 'confirmed']);

/** A written scene triggered by the campaign that has not played yet. */
export function campaignScenesLeft(st: StoryState): boolean {
  return SCENES.some((s) => s.script !== null && CAMPAIGN_TRIGGERS.has(s.trigger.kind) && st.seen[s.id] === undefined);
}

/** A beat on Exam Temperament that has not played yet: until it has, timed work is worth marking. */
export function temperamentBeatsLeft(st: StoryState): boolean {
  return SCENES.some((s) => s.script !== null && s.trigger.kind === 'rating' && s.trigger.rating === 'temperament' && st.seen[s.id] === undefined);
}

/** Queues what has triggered and starts what may play. Returns the scene started, or null. */
export function directStory(r: Route): string | null {
  const st = story.peek();
  const p = progress.peek();
  let c = campaign.peek();
  const adm = admissions.peek();
  if (adm === null && ((c !== null && campaignScenesLeft(st)) || (temperamentBeatsLeft(st) && ((c?.sittings.length ?? 0) > 0 || hasStoredLadder())))) {
    void loadAdmissions();
  }
  if (c !== null && adm !== null && p !== null) {
    const due = lettersDue(c, acts(adm, c, courseInputs(p)));
    if (due.length > 0) {
      c = deliverLetters(c, due, now());
      saveCampaign(c);
    }
  }
  const f = storyFacts(p, c, loadDays(), now(), adm, adm === null ? [] : peekLadder(adm));
  const next = enqueue(st, newlyDue(SCENES, st, f), f, now());
  if (next !== st) saveStory(next);
  if (playing.peek() !== null) return null;
  const id = autoPlay(next, now(), r, c !== null && activeSitting(c) !== undefined);
  if (id !== null) playing.value = { id, auto: true };
  return id;
}

/** Runs `directStory` once the app is ready, and again on every change of data, route, player, or registry. */
export function useStoryDirector(ready: boolean, r: Route, href: string): void {
  const p = progress.value;
  const c = campaign.value;
  const adm = admissions.value;
  const open = playing.value !== null;
  useEffect(() => {
    if (ready) directStory(r);
  }, [ready, p, c, adm, href, open]);
}
