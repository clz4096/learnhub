/**
 * Story mode's state (scenes seen, choices, relationships, REP at the last scene, the
 * queue) in a signal, kept in localStorage in this browser only, like the campaign. Not
 * part of the progress document, so its schema and sync are unchanged.
 */
import { signal } from '@preact/signals';
import { emptyStory, parseStory, type StoryState } from './story';
import { SCENES } from './storyScenes';

export const STORY_KEY = 'mastery.story.v1';

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadStory(): StoryState {
  try {
    return parseStory(store()?.getItem(STORY_KEY) ?? null, SCENES);
  } catch {
    return emptyStory();
  }
}

export const story = signal<StoryState>(loadStory());

/** Re-reads storage (tests, and another tab's changes). */
export function reloadStory(): void {
  story.value = loadStory();
}

/** Replaces the story and saves it; false when the browser would not keep it. */
export function saveStory(next: StoryState): boolean {
  story.value = next;
  try {
    const s = store();
    if (s === null) return false;
    s.setItem(STORY_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

/** The scene on screen, and whether it started by itself (a trigger) or from the Story tab. */
export const playing = signal<{ id: string; auto: boolean } | null>(null);
