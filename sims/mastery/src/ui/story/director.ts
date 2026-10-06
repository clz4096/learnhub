/**
 * Watches the learner's real data for scenes that have just triggered, queues them, and
 * starts the first queued scene by itself when that is allowed: the app has loaded, no
 * scene is playing, the learner is not in the middle of a lesson, problem, or paper, and
 * it is not Shabbat (see `autoPlay`). A scene queued on Shabbat plays after it.
 */
import { useEffect } from 'preact/hooks';
import { campaign } from '@/model/campaignStore';
import { loadDays } from '@/model/dayLog';
import type { Route } from '@/model/route';
import { now, progress } from '@/model/store';
import { autoPlay, enqueue, newlyDue } from '@/model/story';
import { SCENES } from '@/model/storyScenes';
import { storyFacts } from '@/model/storyFacts';
import { playing, saveStory, story } from '@/model/storyStore';

/** Queues what has triggered and starts what may play. Returns the scene started, or null. */
export function directStory(r: Route): string | null {
  const f = storyFacts(progress.peek(), campaign.peek(), loadDays(), now());
  const st = story.peek();
  const next = enqueue(st, newlyDue(SCENES, st, f), f, now());
  if (next !== st) saveStory(next);
  if (playing.peek() !== null) return null;
  const id = autoPlay(next, now(), r);
  if (id !== null) playing.value = { id, auto: true };
  return id;
}

/** Runs `directStory` once the app is ready, and again on every change of data, route, or player. */
export function useStoryDirector(ready: boolean, r: Route, href: string): void {
  const p = progress.value;
  const c = campaign.value;
  const open = playing.value !== null;
  useEffect(() => {
    if (ready) directStory(r);
  }, [ready, p, c, href, open]);
}
