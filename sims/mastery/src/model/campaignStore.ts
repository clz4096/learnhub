/**
 * The campaign's state in a signal, kept in localStorage. Not part of the progress
 * document; sync carries it in the learner envelope (sync/learner), and each save is
 * reported to it (`learnerChanged`).
 */
import { signal } from '@preact/signals';
import { parseCampaign, removeInterview, removeSitting, type Campaign } from './campaign';
import { learnerChanged } from './learnerChange';

export const CAMPAIGN_KEY = 'mastery.campaign.v1';

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadCampaign(): Campaign | null {
  try {
    return parseCampaign(store()?.getItem(CAMPAIGN_KEY) ?? null);
  } catch {
    return null;
  }
}

export const campaign = signal<Campaign | null>(loadCampaign());

/** Re-reads storage (tests, and another tab's changes). */
export function reloadCampaign(): void {
  campaign.value = loadCampaign();
}

/** Replaces the campaign and saves it; false when the browser would not keep it. */
export function saveCampaign(next: Campaign | null): boolean {
  campaign.value = next;
  try {
    const s = store();
    if (s === null) return false;
    if (next === null) s.removeItem(CAMPAIGN_KEY);
    else s.setItem(CAMPAIGN_KEY, JSON.stringify(next));
    learnerChanged('campaign');
    return true;
  } catch {
    return false;
  }
}

/**
 * Removes a sitting or an interview on purpose, so the removal reaches every device. Only
 * this removes an item for sync: one merely missing from a copy comes back on merge.
 */
export function discardFromCampaign(kind: 'sitting' | 'interview', id: string): boolean {
  const c = campaign.peek();
  if (c === null) return false;
  learnerChanged('campaign', { kind, id });
  return saveCampaign(kind === 'sitting' ? removeSitting(c, id) : removeInterview(c, id));
}
